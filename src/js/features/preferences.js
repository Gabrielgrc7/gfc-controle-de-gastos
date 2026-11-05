/* features/preferences.js
   Preferências: regime de caixa e dicas. */

$('crSeg').onclick = (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  prefs.caixa = b.dataset.cr === '1';
  store('gastos:prefs', prefs);
  render();
};

function renderPrefs() {
  document
    .querySelectorAll('#crSeg button')
    .forEach((b) => b.classList.toggle('on', (b.dataset.cr === '1') === !!prefs.caixa));
  document
    .querySelectorAll('#tipSeg button')
    .forEach((b) => b.classList.toggle('on', (b.dataset.tp === '1') === (prefs.tips !== false)));
}

$('tipSeg').onclick = (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  prefs.tips = b.dataset.tp === '1';
  if (prefs.tips) prefs.seen = [];
  store('gastos:prefs', prefs);
  renderPrefs();
  showInfo();
};
