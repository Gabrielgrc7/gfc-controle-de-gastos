const { JSDOM } = require('jsdom');
const fs = require('fs');
const { IDBFactory, IDBKeyRange } = require('fake-indexeddb');
const path = require('path');
const FILE = process.env.GFC || path.join(__dirname, '..', 'dist', 'gfc-single.html');
/* boot({tour, idb:false, db:<banco já usado>, bus:<canal entre abas>, seed:<chaves antigas do localStorage>, noLocal:true}): abre o app num navegador simulado.
   Por padrão usa um IndexedDB simulado (como no navegador de verdade); idb:false usa só o localStorage. */
exports.boot = async function (opt) {
  opt = opt || {};
  const html = fs.readFileSync(FILE, 'utf8'),
    parts = html.split('<script>\n');
  const fdb = opt.idb === false || opt.hangDb ? null : opt.db || new IDBFactory();
  const dom = new JSDOM(process.env.GFC_MULTI ? html : parts[0] + '<script>\n' + parts[3], {
    runScripts: 'dangerously',
    url: 'https://x.test/',
    pretendToBeVisual: true,
    beforeParse(win) {
      if (opt.seed) Object.entries(opt.seed).forEach(([k, v]) => win.localStorage.setItem(k, v));
      if (opt.noLocal)
        Object.defineProperty(win, 'localStorage', {
          get() {
            throw new Error('bloqueado');
          },
        });
      if (opt.hangDb) win.indexedDB = { open: () => ({}) };
      else if (fdb) {
        win.indexedDB = fdb;
        win.IDBKeyRange = IDBKeyRange;
      }
      if (opt.bus) {
        win.BroadcastChannel = class {
          constructor(n) {
            this.name = n;
            opt.bus.push(this);
          }
          postMessage(d) {
            const s = JSON.stringify(d);
            opt.bus
              .filter((c) => c !== this && c.name === this.name)
              .forEach((c) => setTimeout(() => c.onmessage && c.onmessage({ data: JSON.parse(s) }), 0));
          }
          close() {}
        };
      }
    },
  });
  const w = dom.window;
  w.scrollTo = () => {};
  if (!opt.tour) w.eval('tourSoon=function(){}');
  w.alert = () => {
    w.__xss = 1;
  };
  w.__errs = [];
  w.addEventListener('error', (e) => w.__errs.push(e.message));
  await w.eval('Store.ready');
  await new Promise((r) => setTimeout(r, 5));
  const $ = (i) => w.document.getElementById(i),
    Q = (s) => w.document.querySelector(s),
    QA = (s) => [...w.document.querySelectorAll(s)],
    E = (s) => w.eval(s),
    sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const sub = (f) => f.dispatchEvent(new w.Event('submit', { cancelable: true }));
  const R = { pass: 0, fail: 0, fails: [], name: '' };
  const ok = (n, c, x) => {
    if (c) R.pass++;
    else {
      R.fail++;
      if (R.fails.length < 25) R.fails.push(n + (x !== undefined ? ' → ' + x : ''));
    }
  };
  const signup = async (email = 't@x.com', name = 'Teste') => {
    $('toSign').click();
    $('sN').value = name;
    $('sE').value = email;
    $('sP').value = 'Senha@123';
    $('sP2').value = 'Senha@123';
    $('sCons').checked = true;
    sub($('fSign'));
    await sleep(150);
  };
  const persisted = async (raw) => {
    if (!raw) await E('storeFlush()');
    if (!fdb) {
      const o = {};
      for (let i = 0; i < w.localStorage.length; i++) {
        const k = w.localStorage.key(i);
        o[k] = w.localStorage.getItem(k);
      }
      return o;
    }
    return new Promise((res, rej) => {
      const rq = fdb.open('gfc', 1);
      rq.onerror = () => rej(rq.error);
      rq.onsuccess = () => {
        const d = rq.result,
          os = d.transaction('kv').objectStore('kv'),
          k = os.getAllKeys(),
          v = os.getAll();
        v.onsuccess = () => {
          const o = {};
          k.result.forEach((x, i) => (o[x] = v.result[i]));
          d.close();
          res(o);
        };
      };
    });
  };
  const allText = async () => {
    const p = await persisted();
    let s = JSON.stringify(p);
    for (let i = 0; i < w.localStorage.length; i++) s += w.localStorage.getItem(w.localStorage.key(i));
    for (let i = 0; i < w.sessionStorage.length; i++) s += w.sessionStorage.getItem(w.sessionStorage.key(i));
    return s;
  };
  return { w, $, Q, QA, E, sleep, sub, R, ok, signup, persisted, allText, fdb, close: () => w.close() };
};
exports.done = (name, R, extra) => {
  console.log(JSON.stringify({ group: name, pass: R.pass, fail: R.fail, fails: R.fails, ...(extra || {}) }));
  process.exit(0);
};
exports.rng = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
