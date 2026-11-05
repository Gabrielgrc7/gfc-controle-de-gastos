/* features/navigation.js
   Navegação: abas, subabas, páginas de configurações, folha de lançamento e menu da conta. */

function seg(s) {
  S = s;
  document.querySelectorAll('[data-s]').forEach((x) => {
    if (x.tagName === 'DIV') x.hidden = x.dataset.s !== s;
  });
  document.querySelectorAll('#seg button').forEach((b) => b.classList.toggle('on', b.dataset.s === s));
  placeBar();
}

$('seg').onclick = (e) => {
  const b = e.target.closest('button');
  if (b) seg(b.dataset.s);
};

function cfgGo(p) {
  C = p;
  document.querySelectorAll('[data-p]').forEach((x) => (x.hidden = x.dataset.p !== p));
  placeBar();
  window.scrollTo(0, 0);
}

function go(v) {
  const map = { lancar: ['lanc', 'novo'], lista: ['lanc', 'hist'] };
  let s = '';
  if (map[v]) [v, s] = map[v];
  V = v;
  document.querySelectorAll('[data-v]').forEach((x) => (x.hidden = x.dataset.v !== v));
  document.querySelectorAll('.nv').forEach((b) => {
    const on = b.dataset.go === v;
    b.classList.toggle('on', on);
    on ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current');
  });
  if (s) seg(s);
  if (v === 'config') cfgGo('');
  $('bkExp').hidden = $('cfgExp').hidden = $('expM').hidden;
  placeBar();
  window.scrollTo(0, 0);
}

document.addEventListener('click', (e) => {
  const g = e.target.closest('[data-pg]');
  if (g) cfgGo(g.dataset.pg);
  else if (e.target.closest('[data-pb]')) cfgGo('');
});

document.addEventListener('click', (e) => {
  const g = e.target.closest('[data-go]');
  if (g) go(g.dataset.go);
});

const menuOpen = (o) => {
  $('menu').hidden = !o;
  $('avBtn').setAttribute('aria-expanded', String(o));
};

$('avBtn').onclick = (e) => {
  e.stopPropagation();
  menuOpen($('menu').hidden);
};

document.addEventListener('click', (e) => {
  if (!e.target.closest('.avw')) menuOpen(false);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') menuOpen(false);
});

$('mCfg').onclick = () => {
  menuOpen(false);
  go('config');
};

$('mTheme').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');

const go0 = go,
  seg0 = seg,
  cfgGo0 = cfgGo;

go = function (v) {
  go0(v);
  viewHooks();
};

seg = function (s) {
  seg0(s);
  viewHooks();
};

cfgGo = function (p) {
  cfgGo0(p);
  viewHooks();
};

$('brandBtn').onclick = () => {
  menuOpen(false);
  go('inicio');
};

function placeBar() {
  const show =
    V === 'inicio' ||
    V === 'agenda' ||
    V === 'rel' ||
    (V === 'lanc' && (S === 'hist' || S === 'comp')) ||
    (V === 'config' && C === 'metas');
  $('hdrMonth').hidden = !show;
}

const go6 = go;

go = function (v) {
  if (v === 'lancar' && !(V === 'lanc' && S === 'novo')) prevView = { v: V, s: S, c: C };
  if (v === 'lanc' && S === 'novo') seg('hist');
  go6(v);
  const sh = V === 'lanc' && S === 'novo';
  document.body.classList.toggle('sheet', sh);
  if (sh) $('sheetT').textContent = $('formTitle').textContent;
};

const seg6 = seg;

seg = function (s) {
  seg6(s);
  const sh = V === 'lanc' && S === 'novo';
  document.body.classList.toggle('sheet', sh);
  if (sh) $('sheetT').textContent = $('formTitle').textContent;
};

function closeSheet() {
  const p = prevView || { v: 'inicio' };
  prevView = null;
  resetForm();
  if (p.v === 'lanc') {
    seg(p.s === 'novo' ? 'hist' : p.s || 'hist');
    go('lanc');
  } else if (p.v === 'config') {
    go('config');
    cfgGo(p.c || '');
  } else go(p.v || 'inicio');
  document.body.classList.remove('sheet');
}

$('sheetClose').onclick = closeSheet;

$('fabNew').onclick = () => {
  resetForm();
  go('lancar');
};
