/* features/home-layout.js
   Modo de visualização do Início: Completa (todos os blocos), Simples (só o essencial) ou Personalizar
   (a pessoa escolhe quais blocos aparecem e em que ordem, e pode acrescentar blocos novos).
   Fica no menu da foto, entre Configurações e Tema. A escolha é gravada no perfil (prefs.homeMode e prefs.homeCustom). */

const HOME_MODES = Object.assign(Object.create(null), {
  completa: 'Completa',
  simples: 'Simples',
  custom: 'Personalizada',
});

/* só aceita ids que existem, sem repetir (protege contra dado velho, apagado ou de backup) */
const homeClean = (list) =>
  Array.isArray(list)
    ? [...new Set(list.filter((id) => typeof id === 'string' && HOME_BY[id]))].slice(0, HOME_W.length)
    : [];
const homeMode = () => (HOME_MODES[prefs.homeMode] ? prefs.homeMode : 'completa');
const homeCustomIds = () => homeClean(prefs.homeCustom && prefs.homeCustom.order);

/* a lista de blocos visíveis, na ordem, para o modo atual */
function homeIds() {
  const m = homeMode();
  return m === 'simples' ? HOME_SIMPLE.slice() : m === 'custom' ? homeCustomIds() : HOME_STD.slice();
}
const homeOn = (id) => homeIds().includes(id);
const homeSave = () => store('gastos:prefs', prefs);

/* mostra, esconde e reordena os blocos no HTML (os mesmos elementos são movidos, nada é recriado) */
function applyHome() {
  const root = $('home');
  if (!root) return;
  const ids = homeIds(),
    mode = homeMode(),
    sig = mode + ':' + ids.join(',');
  document.body.dataset.home = mode;
  root.dataset.mode = mode;
  if (root.dataset.sig !== sig) {
    root.dataset.sig = sig;
    const by = (id) => [...root.children].find((el) => el.dataset.w === id);
    [...root.children].forEach((el) => {
      if (!ids.includes(el.dataset.w)) el.hidden = true;
    });
    ids.forEach((id) => {
      const el = by(id);
      if (el) {
        el.hidden = false;
        root.appendChild(el);
      }
    });
  }
  $('homeEmpty').hidden = ids.length > 0;
  $('mViewV').textContent = HOME_MODES[mode];
}

/* troca o modo e já mostra o Início com o resultado */
function setHomeMode(m) {
  if (!HOME_MODES[m]) return;
  /* a primeira vez em "Personalizar" parte do que a pessoa estava vendo; depois, volta o layout que ela montou */
  if (m === 'custom' && !(prefs.homeCustom && Array.isArray(prefs.homeCustom.order)))
    prefs.homeCustom = { order: homeIds() };
  prefs.homeMode = m;
  homeSave();
  render();
}

/* ---------------- janelas: foco e Esc ---------------- */
let homeOpener = null;
const homeFocusable = (el) =>
  [
    ...el.querySelectorAll(
      'button:not([disabled]),[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
    ),
  ].filter((x) => !x.closest('[hidden]'));
function homeShow(el, first) {
  homeOpener = document.activeElement;
  el.hidden = false;
  document.body.classList.add('noscroll');
  const f = (first && el.querySelector(first)) || homeFocusable(el)[0];
  if (f) f.focus();
}
function homeHide(el) {
  el.hidden = true;
  if (!$('vmode').hidden || !$('hedit').hidden) return;
  document.body.classList.remove('noscroll');
  if (homeOpener && homeOpener.isConnected && !homeOpener.closest('[hidden]') && homeOpener.focus)
    homeOpener.focus();
  homeOpener = null;
}
document.addEventListener(
  'keydown',
  (e) => {
    const el = !$('hedit').hidden ? $('hedit') : !$('vmode').hidden ? $('vmode') : null;
    if (!el) return;
    if (e.key === 'Escape' && $('qcat').hidden) {
      e.stopPropagation();
      el === $('hedit') ? heClose() : homeHide($('vmode'));
    } else if (e.key === 'Tab' && $('qcat').hidden) {
      const f = homeFocusable(el);
      if (!f.length) return;
      const a = f[0],
        z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    }
  },
  true
);

/* ---------------- a janela "Modo de visualização" ---------------- */
function vmDraw() {
  const m = homeMode();
  document.querySelectorAll('#vmode .vmo').forEach((b) => {
    const on = b.dataset.m === m;
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', String(on));
    b.tabIndex = on ? 0 : -1;
  });
  $('vmEdit').hidden = m !== 'custom';
}
function vmOpen() {
  menuOpen(false);
  vmDraw();
  homeShow($('vmode'), '.vmo.on');
}
function vmPick(m) {
  homeHide($('vmode'));
  if (m === 'custom') {
    heOpen();
    return;
  }
  setHomeMode(m);
  if (V !== 'inicio') go('inicio');
  toast('Modo ' + HOME_MODES[m].toLowerCase() + ' ativado');
}
$('mView').onclick = vmOpen;
$('vmode').addEventListener('click', (e) => {
  if (e.target === $('vmode')) homeHide($('vmode'));
  const b = e.target.closest('.vmo');
  if (b) vmPick(b.dataset.m);
});
$('vmNo').onclick = () => homeHide($('vmode'));
$('vmEdit').onclick = () => {
  homeHide($('vmode'));
  heOpen();
};
/* setas escolhem entre as três opções, como em qualquer grupo de botões de rádio */
$('vmode').addEventListener('keydown', (e) => {
  const k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
  const b = e.target.closest('.vmo');
  if (!k || !b) return;
  e.preventDefault();
  const all = [...document.querySelectorAll('#vmode .vmo')],
    n = all[(all.indexOf(b) + k + all.length) % all.length];
  n.focus();
});

/* ---------------- o editor "Personalizar o Início" ---------------- */
const heSay = (t) => {
  $('heLive').textContent = '';
  setTimeout(() => ($('heLive').textContent = t), 30);
};
const heIcon = {
  grip: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>',
  up: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};
const heTag = (w) => (w.extra ? '<span class="hed-new">Novo</span>' : '');

function heItem(w, i, n) {
  const t = esc(w.t);
  return (
    '<li class="hed-item" data-w="' +
    w.id +
    '"><button type="button" class="hed-grip" aria-label="Reordenar ' +
    t +
    '. Posição ' +
    (i + 1) +
    ' de ' +
    n +
    '. Use as setas do teclado ou arraste.">' +
    heIcon.grip +
    '</button><div class="hed-txt"><b>' +
    t +
    heTag(w) +
    '</b><span>' +
    esc(w.d) +
    '</span></div><div class="hed-act"><button type="button" data-a="up" aria-label="Mover ' +
    t +
    ' para cima"' +
    (i === 0 ? ' disabled' : '') +
    '>' +
    heIcon.up +
    '</button><button type="button" data-a="down" aria-label="Mover ' +
    t +
    ' para baixo"' +
    (i === n - 1 ? ' disabled' : '') +
    '>' +
    heIcon.down +
    '</button><button type="button" data-a="off" aria-label="Ocultar ' +
    t +
    '">' +
    heIcon.x +
    '</button></div></li>'
  );
}
const heOff = (w) =>
  '<li class="hed-add" data-w="' +
  w.id +
  '"><div class="hed-txt"><b>' +
  esc(w.t) +
  heTag(w) +
  '</b><span>' +
  esc(w.d) +
  '</span></div><button type="button" class="btn ghost sm" data-a="add" aria-label="Adicionar ' +
  esc(w.t) +
  ' ao Início">+ Adicionar</button></li>';

function heDraw() {
  const on = homeCustomIds(),
    off = HOME_W.filter((w) => !on.includes(w.id)),
    offStd = off.filter((w) => !w.extra),
    offNew = off.filter((w) => w.extra);
  $('heOn').innerHTML = on.map((id, i) => heItem(HOME_BY[id], i, on.length)).join('');
  $('heN').textContent = on.length ? '(' + on.length + ')' : '';
  $('heEmpty').hidden = on.length > 0;
  $('heOff').innerHTML =
    (offStd.length ? '<li class="hed-grp">Blocos padrão</li>' + offStd.map(heOff).join('') : '') +
    (offNew.length ? '<li class="hed-grp">Novos blocos</li>' + offNew.map(heOff).join('') : '');
  $('heOffEmpty').hidden = off.length > 0;
}

/* grava a nova lista de blocos visíveis e atualiza o Início por baixo */
function heSet(list, say) {
  prefs.homeMode = 'custom';
  prefs.homeCustom = { order: homeClean(list) };
  homeSave();
  render();
  heDraw();
  if (say) heSay(say);
}
function heMove(id, delta) {
  const L = homeCustomIds(),
    i = L.indexOf(id),
    j = i + delta;
  if (i < 0 || j < 0 || j >= L.length) return false;
  L.splice(j, 0, L.splice(i, 1)[0]);
  heSet(L, HOME_BY[id].t + ' movido para a posição ' + (j + 1) + ' de ' + L.length);
  return true;
}
function heFocus(id, sel) {
  const el = $('heOn').querySelector('[data-w="' + id + '"] ' + sel);
  if (el) el.focus();
  return !!el;
}

function heOpen() {
  if (!(prefs.homeCustom && Array.isArray(prefs.homeCustom.order))) prefs.homeCustom = { order: homeIds() };
  prefs.homeMode = 'custom';
  homeSave();
  render();
  if (V !== 'inicio') go('inicio');
  heDraw();
  $('hedit').querySelector('.hed-body').scrollTop = 0;
  homeShow($('hedit'), '#heDone');
}
function heClose() {
  homeHide($('hedit'));
  window.scrollTo(0, 0);
}
$('heClose').onclick = $('heDone').onclick = heClose;
$('homeEmptyBtn').onclick = heOpen;

$('heOn').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-a]'),
    li = e.target.closest('.hed-item');
  if (!b || !li) return;
  const id = li.dataset.w,
    a = b.dataset.a;
  if (a === 'up' || a === 'down') {
    if (heMove(id, a === 'up' ? -1 : 1))
      heFocus(id, '[data-a="' + a + '"]:not([disabled])') ||
        heFocus(id, '[data-a="' + (a === 'up' ? 'down' : 'up') + '"]');
  } else if (a === 'off') {
    const L = homeCustomIds(),
      i = L.indexOf(id);
    heSet(
      L.filter((x) => x !== id),
      HOME_BY[id].t + ' ocultado'
    );
    const next = $('heOn').children[Math.min(i, $('heOn').children.length - 1)];
    (next && next.querySelector('.hed-grip')) || $('heDone');
    const f = next ? next.querySelector('.hed-grip') : $('heDone');
    if (f) f.focus();
  }
});
$('heOff').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-a="add"]'),
    li = e.target.closest('.hed-add');
  if (!b || !li) return;
  const id = li.dataset.w;
  heSet(homeCustomIds().concat(id), HOME_BY[id].t + ' adicionado ao final do Início');
  const row = $('heOn').querySelector('[data-w="' + id + '"]');
  if (row) {
    row.classList.add('flash');
    if (row.scrollIntoView) row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    row.querySelector('.hed-grip').focus({ preventScroll: true });
  }
});

/* teclado: com o foco na alça, as setas movem o bloco */
$('heOn').addEventListener('keydown', (e) => {
  const h = e.target.closest('.hed-grip');
  if (!h || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
  e.preventDefault();
  const id = h.closest('.hed-item').dataset.w;
  if (heMove(id, e.key === 'ArrowUp' ? -1 : 1)) heFocus(id, '.hed-grip');
});

/* arrastar pela alça (mouse, dedo ou caneta). Perto da borda da lista, ela rola sozinha enquanto o dedo fica parado */
let heDrag = null,
  heY = 0,
  heRaf = 0;
function heTrack(y) {
  const box = $('heOn'),
    others = [...box.children].filter((x) => x !== heDrag.li),
    before = others.find((x) => {
      const r = x.getBoundingClientRect();
      return y < r.top + r.height / 2;
    });
  if (before) {
    if (heDrag.li.nextElementSibling !== before) box.insertBefore(heDrag.li, before);
  } else if (box.lastElementChild !== heDrag.li) box.appendChild(heDrag.li);
}
function heAuto() {
  if (!heDrag) return;
  const hb = $('hedit').querySelector('.hed-body'),
    r = hb.getBoundingClientRect(),
    zone = 90;
  let v = 0;
  if (heY < r.top + zone) v = -Math.ceil((r.top + zone - heY) / 5);
  else if (heY > r.bottom - zone) v = Math.ceil((heY - (r.bottom - zone)) / 5);
  if (v) {
    hb.scrollTop += v;
    heTrack(heY);
  }
  heRaf = requestAnimationFrame(heAuto);
}
/* os ouvintes de mover e soltar ficam no documento inteiro: o dedo pode sair da lista (por exemplo ao rolar) e ainda assim soltar */
const heOnMove = (e) => {
  if (!heDrag) return;
  heY = e.clientY;
  heTrack(heY);
};
const heOnUp = () => heDrop(false);
const heOnCancel = () => heDrop(true);
function heDrop(cancel) {
  if (!heDrag) return;
  const d = heDrag;
  heDrag = null;
  cancelAnimationFrame(heRaf);
  document.removeEventListener('pointermove', heOnMove);
  document.removeEventListener('pointerup', heOnUp);
  document.removeEventListener('pointercancel', heOnCancel);
  d.li.classList.remove('drag');
  const L = [...$('heOn').children].map((x) => x.dataset.w);
  if (cancel || L.join() === homeCustomIds().join()) return heDraw();
  heSet(L, HOME_BY[d.id].t + ' movido para a posição ' + (L.indexOf(d.id) + 1) + ' de ' + L.length);
  heFocus(d.id, '.hed-grip');
}
$('heOn').addEventListener('pointerdown', (e) => {
  const h = e.target.closest('.hed-grip');
  if (!h || (e.pointerType === 'mouse' && e.button !== 0) || heDrag) return;
  e.preventDefault();
  const li = h.closest('.hed-item');
  heDrag = { li, id: li.dataset.w };
  heY = e.clientY;
  li.classList.add('drag');
  document.addEventListener('pointermove', heOnMove);
  document.addEventListener('pointerup', heOnUp);
  document.addEventListener('pointercancel', heOnCancel);
  heRaf = requestAnimationFrame(heAuto);
});

/* restaurar e recomeçar (com Desfazer) */
function heBase(ids, nome) {
  const prev = homeCustomIds();
  heSet(ids, 'Layout ' + nome + ' aplicado');
  toast('Layout ' + nome + ' aplicado', 'Desfazer', () => heSet(prev, 'Layout anterior de volta'));
}
$('heStd').onclick = () => heBase(HOME_STD, 'da Completa');
$('heSimple').onclick = () => heBase(HOME_SIMPLE, 'do Simples');

/* ---------------- ações dos blocos novos ---------------- */
$('home').addEventListener('click', (e) => {
  const p = e.target.closest('[data-pgo]');
  if (p) {
    go('config');
    cfgGo(p.dataset.pgo);
    return;
  }
  const a = e.target.closest('[data-act]');
  if (!a) return;
  if (a.dataset.act === 'exp') $('fabNew').click();
  else if (a.dataset.act === 'imp') {
    go('lanc');
    seg('imp');
  }
});
