/* core/state.js
   Estado do app em memória (lançamentos, metas, cartões, conta logada) e carga e gravação dos dados do usuário. */

let data = [],
  budgets = {},
  catlim = {},
  plans = [],
  prefs = {},
  cats = [];

const catIdx = {};

let editing = null,
  sort = { k: 'date', d: -1 };

let cur = null,
  sAv = '',
  V = 'inicio',
  S = 'novo',
  C = '';

const saveCats = () => store('gastos:cats', cats);

const saveAll = () => {
  store('gastos:trash', trash);
  store('gastos:items', data);
  store('gastos:plans', plans);
  store('gastos:catlim', catlim);
  saveCats();
};

let cards = [],
  goals = [],
  rules = [],
  trash = [],
  lastDel = [],
  ty = 'd',
  catTouched = false;

function loadUser() {
  data = store('gastos:items') || [];
  budgets = store('gastos:budgets') || {};
  catlim = store('gastos:catlim') || {};
  plans = store('gastos:plans') || [];
  prefs = store('gastos:prefs') || {};
  cards = store('gastos:cards') || [];
  goals = store('gastos:goals') || [];
  rules = store('gastos:rules') || [];
  trash = (store('gastos:trash') || []).filter((x) => x && Date.now() - x._del < 30 * 864e5);
  cats = store('gastos:cats');
  if (!Array.isArray(cats) || !cats.length) cats = defCats();
  const have = new Set(cats.map((c) => c.n));
  data.forEach((x) => {
    if (x.inc) return;
    if (!have.has(x.cat)) {
      x.cat = cleanName(x.cat) || 'Outros';
      if (!have.has(x.cat)) {
        cats.push({ n: x.cat, c: cats.length % PAL });
        have.add(x.cat);
      }
    }
  });
  [
    ['Outros', 8],
    ['A revisar', 12],
  ].forEach(([n, c]) => {
    if (!have.has(n)) cats.push({ n, c, k: n, sys: true });
  });
  saveCats();
  applyCats();
}

let accts = [],
  prevView = null,
  restoring = false,
  locked = false,
  pinTry = 0,
  lockT;

const lu0 = loadUser;

loadUser = function () {
  lu0();
  accts = store('gastos:accts') || [];
};

/* outra aba do app gravou dados novos: recarrega e redesenha */
function reloadFromStore() {
  if (!cur || $('app').hidden) return;
  loadUser();
  materialize();
  render();
}
