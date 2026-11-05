const H = require('./h');
(async () => {
  const R0 = H.boot;
  let all = { pass: 0, fail: 0, fails: [] };
  const A = await H.boot();
  const { w, $, Q, E, ok, R, sub, sleep, signup, persisted, allText, fdb } = A;
  const vis = (e) => !!e && !e.hidden,
    uids = () => E('cur.id');
  // ---- banco de dados no aparelho ----
  ok('usa o IndexedDB quando existe', E('Store.mode') === 'idb');
  await signup('a@x.com', 'Ana');
  const id = uids();
  const add = async (v, d) => {
    $('fabNew').click();
    $('fVal').value = v;
    $('fVal').dispatchEvent(new w.Event('input'));
    $('fDesc').value = d;
    $('save').click();
    await sleep(20);
  };
  for (let i = 1; i <= 3; i++) await add(String(i * 1000), 'Gasto ' + i);
  let p = await persisted();
  ok('os lançamentos foram gravados no banco', JSON.parse(p['u:' + id + ':gastos:items']).length === 3);
  ok('o cadastro foi gravado no banco', JSON.parse(p['gfc:users'])[0].email === 'a@x.com');
  ok('a versão dos dados é gravada', JSON.parse(p['gfc:schema']) === E('SCHEMA_VERSION'));
  ok(
    'nada de usuário no localStorage (só a sessão da aba no sessionStorage)',
    !Object.keys(w.localStorage).some((k) => k.startsWith('u:') || k === 'gfc:users')
  );
  ok('o banco guarda a senha só como código', !(await allText()).includes('Senha@123'));
  // ---- gravação em segundo plano (sem esperar ninguém chamar) ----
  await add('555', 'Gasto rápido');
  await sleep(120);
  p = await persisted(true);
  ok('grava sozinho em poucos milissegundos', JSON.parse(p['u:' + id + ':gastos:items']).length === 4);
  // ---- fechar a aba grava na hora ----
  E("store('gastos:prefs',{...prefs,marca:1})");
  w.document.dispatchEvent(new w.Event('visibilitychange'));
  E("Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true})");
  w.document.dispatchEvent(new w.Event('visibilitychange'));
  await sleep(20);
  p = await persisted(true);
  ok('esconder a aba grava na hora', JSON.parse(p['u:' + id + ':gastos:prefs']).marca === 1);
  E("Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true})");
  // ---- recarregar a página: os dados continuam ----
  const B = await H.boot({ db: fdb });
  ok('depois de recarregar, o app abre na entrada (sessão era só da aba)', vis(B.$('auth')));
  B.$('lE').value = 'a@x.com';
  B.$('lP').value = 'Senha@123';
  B.sub(B.$('fLogin'));
  await sleep(250);
  ok(
    'e ao entrar, os 4 lançamentos estão lá',
    B.E('data.length') === 4 && B.E('data.map(x=>x.desc).join()') === 'Gasto 1,Gasto 2,Gasto 3,Gasto rápido'
  );
  ok('as preferências também', B.E('prefs.marca') === 1);
  B.close();
  // ---- manter conectado: sessão sobrevive ao recarregar ----
  E('setSess(cur.id,true)');
  const sessKeys = ['gfc:session'].map((k) => w.localStorage.getItem(k));
  const C = await H.boot({ db: fdb, seed: { 'gfc:session': sessKeys[0] } });
  ok('manter conectado reabre direto no app com os dados', !C.$('app').hidden && C.E('data.length') === 4);
  C.close();
  // ---- apagar conta limpa o banco ----
  Q('[data-go="config"]').click();
  Q('[data-pg="priv"]').click();
  $('delAcc2').click();
  $('delAcc2').click();
  p = await persisted();
  ok(
    'excluir a conta apaga todas as chaves do usuário no banco',
    !Object.keys(p).some((k) => k.startsWith('u:' + id + ':')) && JSON.parse(p['gfc:users']).length === 0
  );
  // ---- migração do localStorage antigo para o banco ----
  const L = await H.boot({ idb: false });
  ok('sem IndexedDB, usa o localStorage', L.E('Store.mode') === 'local');
  await L.signup('velho@x.com', 'Velho');
  const lid = L.E('cur.id');
  L.$('fabNew').click();
  L.$('fVal').value = '7777';
  L.$('fVal').dispatchEvent(new L.w.Event('input'));
  L.$('fDesc').value = 'Gasto antigo';
  L.$('save').click();
  await sleep(20);
  const legacy = await L.persisted();
  ok(
    'no modo localStorage os dados ficam lá',
    !!legacy['u:' + lid + ':gastos:items'] && !!legacy['gfc:users']
  );
  ok(
    'sem IndexedDB o app avisa se o localStorage falhar',
    (() => {
      L.w.Storage.prototype.setItem = () => {
        throw new L.w.DOMException('cheio', 'QuotaExceededError');
      };
      L.E("store('gastos:prefs',{x:Date.now()})");
      return vis(L.$('saveWarn')) && /cheio/.test(L.$('saveWarnTx').textContent);
    })()
  );
  L.close();
  // dados antigos + CPF antigo
  const us = JSON.parse(legacy['gfc:users']);
  us[0].cpf = { s: 'sal', h: 'abc', m: '•••.•••.•••-25' };
  legacy['gfc:users'] = JSON.stringify(us);
  delete legacy['gfc:schema'];
  const M = await H.boot({ seed: legacy });
  ok('migração: abriu no IndexedDB', M.E('Store.mode') === 'idb');
  const mp = await M.persisted();
  ok(
    'migração: dados do usuário foram para o banco',
    !!mp['u:' + lid + ':gastos:items'] && !!mp['gfc:users']
  );
  ok(
    'migração: o CPF antigo foi apagado do cadastro',
    !JSON.parse(mp['gfc:users'])[0].cpf && !/•••/.test(mp['gfc:users'])
  );
  ok('migração: versão dos dados atualizada', JSON.parse(mp['gfc:schema']) === M.E('SCHEMA_VERSION'));
  ok(
    'migração: cópia antiga apagada do localStorage',
    !Object.keys(M.w.localStorage).some((k) => k.startsWith('u:') || k === 'gfc:users')
  );
  M.$('lE').value = 'velho@x.com';
  M.$('lP').value = 'Senha@123';
  M.sub(M.$('fLogin'));
  await sleep(250);
  ok('migração: o login antigo continua funcionando', !M.$('app').hidden);
  ok('migração: o lançamento antigo está lá', M.E('data.some(x=>x.desc==="Gasto antigo"&&x.value===7777)'));
  M.close();
  // ---- se a gravação falha, o app avisa ----
  const F = await H.boot();
  await F.signup('f@x.com', 'F');
  F.E('Store.db.transaction=()=>{throw new Error("falha qualquer")}');
  F.$('fabNew').click();
  F.$('fVal').value = '100';
  F.$('fVal').dispatchEvent(new F.w.Event('input'));
  F.$('fDesc').value = 'nao salvou';
  F.$('save').click();
  await sleep(80);
  ok(
    'falha ao gravar: aparece o aviso vermelho',
    vis(F.$('saveWarn')) &&
      /Baixar backup|backup/i.test(F.$('saveWarn').textContent) &&
      /Não foi possível salvar/.test(F.$('saveWarnTx').textContent),
    F.$('saveWarnTx').textContent
  );
  ok('falha ao gravar: a alteração continua pendente para nova tentativa', F.E('Store.dirty.size') > 0);
  ok(
    'o botão do aviso baixa o backup',
    (() => {
      let c = 0;
      F.$('bkExp').addEventListener('click', () => c++);
      F.$('saveWarnBtn').click();
      return c === 1;
    })()
  );
  F.E('delete Store.db.transaction');
  await F.E('storeFlush()');
  ok(
    'quando volta a funcionar, grava o que estava pendente e o aviso some',
    !vis(F.$('saveWarn')) &&
      JSON.parse((await F.persisted())['u:' + F.E('cur.id') + ':gastos:items']).some(
        (x) => x.desc === 'nao salvou'
      )
  );
  // cota cheia
  F.E('Store.db.transaction=()=>{throw new DOMException("cheio","QuotaExceededError")}');
  F.E("store('gastos:prefs',{q:1})");
  await sleep(80);
  ok(
    'armazenamento cheio: mensagem específica',
    vis(F.$('saveWarn')) && /cheio/.test(F.$('saveWarnTx').textContent),
    F.$('saveWarnTx').textContent
  );
  F.close();
  // ---- navegador que não guarda nada (modo privado) ----
  const P = await H.boot({ idb: false, noLocal: true });
  ok('sem nenhum armazenamento: modo temporário', P.E('Store.mode') === 'memory');
  ok(
    'e avisa claramente que os dados somem',
    vis(P.$('saveWarn')) && /some/.test(P.$('saveWarnTx').textContent),
    P.$('saveWarnTx').textContent
  );
  await P.signup('p@x.com', 'P');
  ok('mesmo assim o app funciona na memória', !P.$('app').hidden);
  P.close();
  // ---- dados de uma versão mais nova ----
  const N1 = await H.boot();
  E_ = N1.E;
  N1.E("store('gfc:schema',99)");
  await N1.persisted();
  const N2 = await H.boot({ db: N1.fdb });
  ok(
    'dados de versão mais nova: avisa e não grava por cima',
    vis(N2.$('saveWarn')) &&
      /versão mais nova/.test(N2.$('saveWarnTx').textContent) &&
      N2.E('Store.readOnly') === true
  );
  N2.E("store('gfc:theme','light')");
  await sleep(60);
  {
    const pp = await N2.persisted(true);
    ok(
      'e não altera o banco',
      JSON.parse(pp['gfc:schema']) === 99 && JSON.parse(pp['gfc:theme']) !== 'light',
      pp['gfc:theme']
    );
  }
  N1.close();
  N2.close();
  // ---- duas abas ao mesmo tempo ----
  const bus = [];
  const T1 = await H.boot({ bus });
  await T1.signup('dupla@x.com', 'Dupla');
  const T2 = await H.boot({ bus, db: T1.fdb });
  T2.$('lE').value = 'dupla@x.com';
  T2.$('lP').value = 'Senha@123';
  T2.sub(T2.$('fLogin'));
  await sleep(250);
  let msgs = 0;
  bus.forEach((c) => {
    const o = c.postMessage.bind(c);
    c.postMessage = (d) => {
      msgs++;
      o(d);
    };
  });
  T1.$('fabNew').click();
  T1.$('fVal').value = '4200';
  T1.$('fVal').dispatchEvent(new T1.w.Event('input'));
  T1.$('fDesc').value = 'Da aba 1';
  T1.$('save').click();
  await sleep(250);
  ok('duas abas: a outra aba recebe o lançamento sem recarregar', T2.E('data.some(x=>x.desc==="Da aba 1")'));
  ok('duas abas: sem ficar repetindo mensagens em loop', msgs <= 3, msgs);
  T2.$('fabNew').click();
  T2.$('fVal').value = '900';
  T2.$('fVal').dispatchEvent(new T2.w.Event('input'));
  T2.$('fDesc').value = 'Da aba 2';
  T2.$('save').click();
  await sleep(250);
  ok(
    'duas abas: e a primeira recebe o da segunda (nenhum apaga o outro)',
    T1.E('data.length') === 2 && T2.E('data.length') === 2,
    T1.E('data.length') + '/' + T2.E('data.length')
  );
  ok(
    'duas abas: o banco tem os dois',
    JSON.parse((await T1.persisted())['u:' + T1.E('cur.id') + ':gastos:items']).length === 2
  );
  T1.close();
  T2.close();
  // ---- store(): comportamento básico ----
  const S = await H.boot();
  S.E("store('gfc:x',{a:[1,2,{b:'ç'}]})");
  ok(
    'guarda e lê objetos',
    JSON.stringify(S.E("store('gfc:x')")) === JSON.stringify({ a: [1, 2, { b: 'ç' }] })
  );
  ok(
    'chave que não existe devolve null',
    S.E("store('gfc:nada')") === null && S.E("store('qualquer')") === null
  );
  S.E("store('gfc:x',null)");
  ok('gravar null apaga', S.E("store('gfc:x')") === null && !('gfc:x' in (await S.persisted())));
  S.E("store('gfc:y',[1])");
  await S.persisted();
  const d0 = S.E('Store.dirty.size');
  S.E("store('gfc:y',[1])");
  ok('gravar o mesmo valor não faz nada', S.E('Store.dirty.size') === d0);
  S.E("NS='u:z:'");
  S.E("store('gastos:k',1)");
  S.E("store('u:z:gastos:j',2)");
  ok(
    'chaves relativas ganham o prefixo do usuário; as completas não',
    S.E("storeKeys('u:z:').sort().join()") === 'u:z:gastos:j,u:z:gastos:k'
  );
  ok(
    'lê um valor copiado (mudar o resultado não muda o banco)',
    (() => {
      S.E("store('gfc:l',[1])");
      const v = S.E("store('gfc:l')");
      v.push(2);
      return S.E("store('gfc:l').length") === 1;
    })()
  );
  S.close();
  // ---- informação de armazenamento e proteção ----
  const I = await H.boot();
  await I.signup('i@x.com', 'I');
  let calls = 0;
  Object.defineProperty(I.w.navigator, 'storage', {
    configurable: true,
    value: {
      persisted: async () => false,
      estimate: async () => ({ usage: 3.5e6, quota: 5e8 }),
      persist: async () => {
        calls++;
        return true;
      },
    },
  });
  await I.E('storagePersist()');
  ok('pede armazenamento protegido ao navegador', calls === 1);
  await I.E('renderStor()');
  const t = I.$('storInfo').textContent;
  ok(
    'a tela Dados explica onde os dados ficam, o espaço e a proteção',
    /só neste aparelho/.test(t) &&
      /IndexedDB/.test(t) &&
      /3,34 MB/.test(t) &&
      /não ativa/.test(t) &&
      /nenhum ainda/.test(t),
    t
  );
  I.E('markBackup()');
  await I.E('renderStor()');
  ok(
    'depois do backup mostra a data',
    new RegExp(new Date().toLocaleDateString('pt-BR')).test(I.$('storInfo').textContent)
  );
  I.close();
  // ---- lembrete de backup ----
  const K = await H.boot();
  await K.signup('k@x.com', 'K');
  ok('sem lançamentos, sem lembrete', (K.E('renderBackupNudge()'), K.$('bkNudge').hidden));
  K.E(
    'data=Array.from({length:20},(_,i)=>({id:"k"+i,desc:"x"+i,value:10,date:cmNow()+"-01",cat:"Outros"}));render()'
  );
  K.E('go("inicio")');
  ok(
    'com lançamentos e sem backup, o lembrete aparece',
    !K.$('bkNudge').hidden && /ainda não fez backup/.test(K.$('bkNudgeTx').textContent)
  );
  K.$('bkNudgeLater').click();
  ok(
    '"Depois" esconde por 14 dias',
    K.$('bkNudge').hidden && K.E('prefs.bkSnooze') > Date.now() + 13 * 864e5
  );
  K.E('prefs.bkSnooze=0;prefs.lastBackup=Date.now()-40*864e5;renderBackupNudge()');
  ok(
    'backup velho (40 dias) volta a lembrar',
    !K.$('bkNudge').hidden && /mais de 30 dias/.test(K.$('bkNudgeTx').textContent)
  );
  K.E('markBackup()');
  ok('fazer backup esconde o lembrete', K.$('bkNudge').hidden && K.E('prefs.lastBackup') > Date.now() - 5000);
  ok('o backup baixado traz a versão dos dados', K.E('backupObj().schema') === K.E('SCHEMA_VERSION'));
  K.close();
  // ---- tema sem piscar e banco que trava ----
  const TH = await H.boot();
  TH.E("setTheme('light')");
  ok(
    'o tema fica copiado no localStorage para abrir certo desde o primeiro quadro',
    TH.w.localStorage.getItem('gfc:theme') === '"light"'
  );
  const TH2 = await H.boot({ idb: false, seed: { 'gfc:theme': '"light"' } });
  ok(
    'abrindo com tema claro salvo, já nasce claro',
    TH2.w.document.documentElement.dataset.theme === 'light'
  );
  TH.close();
  TH2.close();
  const HG = await H.boot({ hangDb: true });
  ok(
    'se o IndexedDB travar ao abrir (acontece em alguns Safari), cai para o localStorage depois de alguns segundos',
    HG.E('Store.mode') === 'local',
    HG.E('Store.mode')
  );
  HG.close();
  ok(
    'nenhum erro de script',
    [A, F].every((x) => x.w.__errs.length === 0),
    A.w.__errs.concat(F.w.__errs).slice(0, 3).join('|')
  );
  H.done('Banco de dados no aparelho (IndexedDB), migração, falhas e abas', R);
})()
  .then(() => 0)
  .catch((e) => {
    console.log(JSON.stringify({ group: 'storage', crash: e.stack.split('\n').slice(0, 5).join(' | ') }));
    process.exit(1);
  });
