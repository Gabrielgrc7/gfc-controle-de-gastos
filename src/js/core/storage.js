/* core/storage.js
   Banco de dados no aparelho. Os dados ficam no IndexedDB do navegador (o banco de dados que todo navegador já traz),
   guardados como pares chave → valor. O app lê e escreve numa memória rápida (cache) e grava no banco logo em seguida.
   Se o IndexedDB não existir, usa o localStorage; se nenhum dos dois funcionar, avisa que os dados são temporários.
   Também cuida de: aviso quando não consegue salvar, versão dos dados (migrações), pedido de armazenamento protegido
   e sincronização entre abas abertas ao mesmo tempo. */
/* o tema (claro ou escuro) tem uma cópia no localStorage só para aparecer certo desde o primeiro quadro, sem piscar */
try {
  const t = JSON.parse(localStorage.getItem('gfc:theme'));
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
} catch (e) {}
const SCHEMA_VERSION = 2;
const STORE_OPEN_MS = 4000;
let NS = '';
const Store = {
  mode: 'memory',
  cache: new Map(),
  dirty: new Map(),
  timer: null,
  db: null,
  error: null,
  readOnly: false,
  ready: null,
  bc: null,
};

/* chaves que começam com gfc: (globais) ou u: (já completas) não recebem o prefixo do usuário */
const storeKey = (k) => (k.startsWith('gfc:') || k.startsWith('u:') ? k : NS + k);

/* ---- uso no resto do app: store(chave) lê, store(chave, valor) grava, valor null apaga ---- */
function store(k, v) {
  k = storeKey(k);
  if (v === undefined) {
    const s = Store.cache.get(k);
    return s === undefined ? null : JSON.parse(s);
  }
  if (v === null) {
    if (Store.cache.has(k)) {
      Store.cache.delete(k);
      storeQueue(k, null);
    }
    return;
  }
  const s = JSON.stringify(v);
  if (Store.cache.get(k) === s) return;
  Store.cache.set(k, s);
  storeQueue(k, s);
}
const storeRemove = (k) => store(k, null);
const storeKeys = (prefix) => [...Store.cache.keys()].filter((k) => k.startsWith(prefix));

function storeQueue(k, s) {
  if (Store.readOnly) return;
  if (Store.mode === 'local') {
    try {
      if (s === null) localStorage.removeItem(k);
      else localStorage.setItem(k, s);
      storeOk();
    } catch (e) {
      storeFail(e);
    }
    return;
  }
  if (Store.mode === 'memory') return;
  Store.dirty.set(k, s);
  if (!Store.timer) Store.timer = setTimeout(storeFlush, 30);
}

/* grava no banco as mudanças pendentes (uma transação só) */
function storeFlush() {
  clearTimeout(Store.timer);
  Store.timer = null;
  if (Store.mode !== 'idb' || !Store.dirty.size) return Promise.resolve(true);
  const batch = new Map(Store.dirty);
  Store.dirty.clear();
  return new Promise((resolve) => {
    const back = (e) => {
      batch.forEach((s, k) => {
        if (!Store.dirty.has(k)) Store.dirty.set(k, s);
      });
      storeFail(e);
      if (!Store.timer) Store.timer = setTimeout(storeFlush, 5000);
      resolve(false);
    };
    try {
      const tx = Store.db.transaction('kv', 'readwrite');
      const os = tx.objectStore('kv');
      batch.forEach((s, k) => (s === null ? os.delete(k) : os.put(s, k)));
      tx.oncomplete = () => {
        storeOk();
        storeBroadcast(batch);
        resolve(true);
      };
      tx.onerror = tx.onabort = () => back(tx.error);
    } catch (e) {
      back(e);
    }
  });
}

/* ---- aviso quando não dá para salvar (nunca fingir que salvou) ---- */
function storeWarn(msg) {
  const b = typeof document !== 'undefined' && document.getElementById('saveWarn');
  if (!b) return;
  b.hidden = !msg;
  if (msg) document.getElementById('saveWarnTx').textContent = msg;
}
function storeFail(e) {
  Store.error = e || new Error('falha ao salvar');
  const quota = e && /quota/i.test(String(e.name) + String(e.message));
  storeWarn(
    quota
      ? 'O armazenamento deste aparelho está cheio e seus últimos dados não foram salvos. Baixe um backup agora.'
      : 'Não foi possível salvar seus dados neste aparelho. Baixe um backup agora e tente de novo.'
  );
}
function storeOk() {
  if (Store.error && !Store.readOnly) {
    Store.error = null;
    storeWarn('');
  }
}

/* ---- abertura do banco ---- */
function storeOpenDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('gfc', 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains('kv')) req.result.createObjectStore('kv');
    };
    req.onsuccess = () => {
      req.result.onversionchange = () => req.result.close();
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('banco bloqueado'));
  });
}
function storeLoadAll(db) {
  return new Promise((resolve, reject) => {
    const os = db.transaction('kv', 'readonly').objectStore('kv');
    const ks = os.getAllKeys(),
      vs = os.getAll();
    vs.onsuccess = () => {
      ks.result.forEach((k, i) => Store.cache.set(k, vs.result[i]));
      resolve();
    };
    vs.onerror = ks.onerror = () => reject(vs.error || ks.error);
  });
}
function storeLocalOk() {
  try {
    const t = '__gfc_t';
    localStorage.setItem(t, '1');
    localStorage.removeItem(t);
    return true;
  } catch (e) {
    return false;
  }
}
const STORE_LEGACY = (k) => /^u:/.test(k) || /^gfc:(users|lock|chart|theme)$/.test(k);

/* dados antigos que estavam no localStorage passam para o banco (só o que ainda não está lá) */
async function storeImportLegacy() {
  const moved = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (STORE_LEGACY(k) && !Store.cache.has(k)) {
        const s = localStorage.getItem(k);
        Store.cache.set(k, s);
        Store.dirty.set(k, s);
        moved.push(k);
      }
    }
  } catch (e) {
    return;
  }
  if (!moved.length) return;
  /* só apaga a cópia antiga depois de confirmar que o banco gravou */
  if (await storeFlush()) moved.filter((k) => k !== 'gfc:theme').forEach((k) => localStorage.removeItem(k));
}

/* ---- versão dos dados: cada migração leva os dados de uma versão para a próxima ----
   Para mudar o formato dos dados no futuro: aumente SCHEMA_VERSION e acrescente a função da nova versão aqui. */
const MIGRATIONS = {
  /* v1: dados vindos do localStorage (feito por storeImportLegacy) */
  1: () => {},
  /* v2: o CPF deixou de ser pedido; apaga o código do CPF dos cadastros antigos (minimização de dados) */
  2: () => {
    const us = store('gfc:users');
    if (Array.isArray(us) && us.some((u) => u && u.cpf))
      store(
        'gfc:users',
        us.map(({ cpf, ...r }) => r)
      );
  },
};
async function storeMigrate() {
  if (Store.mode === 'idb') await storeImportLegacy();
  let v = store('gfc:schema');
  const fresh = v === null && !storeKeys('u:').length && store('gfc:users') === null;
  v = v || 0;
  if (v > SCHEMA_VERSION) {
    Store.readOnly = true;
    storeWarn('Seus dados foram salvos por uma versão mais nova do app. Recarregue a página para atualizar.');
    return;
  }
  if (fresh) v = SCHEMA_VERSION;
  for (let n = v + 1; n <= SCHEMA_VERSION; n++) await MIGRATIONS[n]();
  if (store('gfc:schema') !== SCHEMA_VERSION) store('gfc:schema', SCHEMA_VERSION);
}

/* ---- abas abertas ao mesmo tempo: uma avisa a outra do que gravou ---- */
function storeBroadcast(batch) {
  if (Store.bc) {
    try {
      Store.bc.postMessage([...batch]);
    } catch (e) {}
  }
}
function storeWatchTabs() {
  if (typeof BroadcastChannel === 'undefined') return;
  try {
    Store.bc = new BroadcastChannel('gfc-store');
    Store.bc.onmessage = (ev) => {
      const list = Array.isArray(ev.data) ? ev.data : [];
      list.forEach(([k, s]) => (s === null ? Store.cache.delete(k) : Store.cache.set(k, s)));
      if (
        typeof reloadFromStore === 'function' &&
        list.some(([k]) => (NS && k.startsWith(NS)) || k === 'gfc:users')
      )
        reloadFromStore();
    };
  } catch (e) {
    Store.bc = null;
  }
}

/* ---- armazenamento protegido e espaço usado ---- */
function storagePersist() {
  try {
    return navigator.storage && navigator.storage.persist
      ? navigator.storage.persist()
      : Promise.resolve(false);
  } catch (e) {
    return Promise.resolve(false);
  }
}
async function storageInfo() {
  const o = { mode: Store.mode, persisted: null, usage: null, quota: null };
  try {
    if (navigator.storage) {
      if (navigator.storage.persisted) o.persisted = await navigator.storage.persisted();
      if (navigator.storage.estimate) {
        const e = await navigator.storage.estimate();
        o.usage = e.usage;
        o.quota = e.quota;
      }
    }
  } catch (e) {}
  return o;
}

/* ---- começo: escolhe onde guardar, carrega tudo para a memória e aplica as migrações ---- */
function storeInit() {
  Store.ready = (async () => {
    let db = null;
    if (typeof indexedDB !== 'undefined' && indexedDB) {
      try {
        db = await Promise.race([
          storeOpenDb(),
          new Promise((_, rej) =>
            setTimeout(() => rej(new Error('o banco demorou demais para abrir')), STORE_OPEN_MS)
          ),
        ]);
        await storeLoadAll(db);
      } catch (e) {
        db = null;
        Store.cache.clear();
      }
    }
    if (db) {
      Store.mode = 'idb';
      Store.db = db;
    } else if (storeLocalOk()) {
      Store.mode = 'local';
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (STORE_LEGACY(k) || k === 'gfc:schema') Store.cache.set(k, localStorage.getItem(k));
      }
    } else {
      Store.mode = 'memory';
      storeWarn(
        'Este navegador não deixa guardar dados (modo privado?). O que você lançar some quando fechar a página.'
      );
    }
    try {
      await storeMigrate();
    } catch (e) {
      storeFail(e);
    }
    storeWatchTabs();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') storeFlush();
    });
    addEventListener('pagehide', storeFlush);
    return Store.mode;
  })();
  return Store.ready;
}
