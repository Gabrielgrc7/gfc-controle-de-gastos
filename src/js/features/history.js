/* features/history.js
   Aba Histórico: lista, busca, filtros, ordenação, editar, apagar, mudar categoria em lote e barra de seleção. */

$('fc').add(new Option('Todas as categorias', ''));

CATS.forEach((c) => $('fc').add(new Option(c, c)));

$('q').oninput = () => render();

$('fc').onchange = () => render();

document.querySelectorAll('th[data-k]').forEach(
  (th) =>
    (th.onclick = () => {
      const k = th.dataset.k;
      sort = sort.k === k ? { k, d: -sort.d } : { k, d: k === 'date' || k === 'value' ? -1 : 1 };
      render();
    })
);

let mode = null,
  sel = new Set();

function modeUI() {
  $('mEdit').hidden = $('mDel').hidden = $('mCat').hidden = !!mode;
  $('mCancel').hidden = !mode;
  $('mGo').hidden = mode !== 'del';
  $('mGo').textContent = 'Apagar (' + sel.size + ')';
  $('mGo').disabled = !sel.size;
  $('mHint').textContent =
    mode === 'edit'
      ? 'Toque em um lançamento para editar.'
      : mode === 'del'
        ? 'Toque nos lançamentos para marcar. Use a barra abaixo para apagar.'
        : mode === 'cat'
          ? 'Selecione os lançamentos e escolha a nova categoria.'
          : '';
}

function setMode(m) {
  mode = m;
  sel = new Set();
  if (!m && editing) resetForm();
  render();
}

$('mEdit').onclick = () => setMode('edit');

$('mDel').onclick = () => setMode('del');

$('mCancel').onclick = () => setMode(null);

$('cancel').addEventListener('click', () => render());

$('rows').onclick = (e) => {
  const tr = e.target.closest('[data-r]');
  if (!tr || !mode) return;
  const id = tr.dataset.r;
  if (mode === 'del' || mode === 'cat') {
    sel.has(id) ? sel.delete(id) : sel.add(id);
    render();
    return;
  }
  const x = data.find((i) => i.id === id);
  if (!x) return;
  editing = x.id;
  $('fDesc').value = x.desc;
  $('fVal').value = String(x.value).replace('.', ',');
  $('fDate').value = x.date;
  $('fCat').value = x.cat;
  fillForm(x);
  $('formTitle').textContent = 'Editar lançamento';
  $('save').textContent = 'Salvar';
  $('cancel').hidden = false;
  render();
  go('lancar');
};

$('mGo').onclick = () => {
  const items = data
    .filter((x) => sel.has(x.id))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (!items.length) return;
  $('dlgN').textContent =
    items.length +
    (items.length === 1 ? ' lançamento será apagado.' : ' lançamentos serão apagados.') +
    ' Esta ação não pode ser desfeita.';
  $('dlgList').innerHTML = items
    .map(
      (x) =>
        `<div class="dr"><span>${x.date.split('-').reverse().slice(0, 2).join('/')} · ${esc(x.desc)} <span style="color:var(--mute)">· ${x.cat}</span></span><span>${brl(x.value)}</span></div>`
    )
    .join('');
  $('dlgTotal').textContent = brl(items.reduce((a, x) => a + x.value, 0));
  $('dlg').hidden = false;
};

$('dlgNo').onclick = () => {
  $('dlg').hidden = true;
};

$('dlgOk').onclick = () => {
  if (editing && sel.has(editing)) resetForm();
  const n = sel.size;
  dropEntries(sel);
  $('dlg').hidden = true;
  sel = new Set();
  render();
  toast(n + (n === 1 ? ' lançamento apagado.' : ' lançamentos apagados.'), 'Desfazer', undoLast);
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('dlg').hidden) $('dlg').hidden = true;
});

function visList() {
  const q = $('q').value.trim().toLowerCase(),
    fc = $('fc').value;
  return inMonth(mkey()).filter((x) => (!fc || x.cat === fc) && (!q || hay(x).includes(q)));
}

$('mAll').onclick = () => {
  const L = visList(),
    all = L.length && L.every((x) => sel.has(x.id));
  L.forEach((x) => (all ? sel.delete(x.id) : sel.add(x.id)));
  render();
};

const setAll = (v) => {
  imp.forEach((x) => (x.on = v));
  document.querySelectorAll('#revRows [data-rc]').forEach((c) => (c.checked = v));
  revSum();
};

$('fch').onclick = (e) => {
  const b = e.target.closest('[data-fc]');
  if (b) {
    $('fc').value = b.dataset.fc;
    render();
  }
};

const SRT = {
  r: { k: 'date', d: -1 },
  o: { k: 'date', d: 1 },
  v: { k: 'value', d: -1 },
  m: { k: 'value', d: 1 },
  a: { k: 'desc', d: 1 },
};

$('srt').onchange = () => {
  sort = SRT[$('srt').value];
  render();
};

$('mCat').onclick = () => setMode('cat');

$('mCatSel').onchange = () => {
  const s = $('mCatSel');
  if (s.value !== NEWCAT) {
    s.dataset.prev = s.value;
    return;
  }
  catQuick(
    (n) => {
      s.value = s.dataset.prev = n;
    },
    () => (s.value = s.dataset.prev || CATS[0])
  );
};

$('mCatGo').onclick = () => {
  const c = $('mCatSel').value;
  if (!sel.size || !CATS.includes(c)) return;
  data.forEach((x) => {
    if (sel.has(x.id)) {
      x.cat = c;
      learn(x.desc, c);
    }
  });
  saveAll();
  const n = sel.size;
  sel = new Set();
  render();
  toast(n + (n === 1 ? ' lançamento movido' : ' lançamentos movidos') + ' para ' + c + '.');
};

$('revBanGo').onclick = () => {
  $('q').value = '';
  $('fc').value = 'A revisar';
  go('lista');
  render();
};

let lp,
  lpDone = false;

$('rows').addEventListener('pointerdown', (e) => {
  const r = e.target.closest('[data-r]');
  if (!r || mode) return;
  lp = setTimeout(() => {
    setMode('del');
    sel.add(r.dataset.r);
    lpDone = true;
    render();
  }, 550);
});

['pointerup', 'pointerleave', 'pointercancel'].forEach((t) =>
  $('rows').addEventListener(t, () => clearTimeout(lp))
);

$('rows').addEventListener(
  'click',
  (e) => {
    if (lpDone) {
      lpDone = false;
      e.stopPropagation();
    }
  },
  true
);
