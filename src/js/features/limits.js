/* features/limits.js
   Limite do mês e limite por categoria. */

$('budget').onchange = () => {
  const v = parse($('budget').value);
  if (v > 0) budgets[mkey()] = v;
  else delete budgets[mkey()];
  store('gastos:budgets', budgets);
  render();
};

$('catLim').onchange = (e) => {
  const c = e.target.dataset.cl;
  if (!c) return;
  const v = parse(e.target.value);
  if (v > 0) catlim[c] = v;
  else delete catlim[c];
  store('gastos:catlim', catlim);
  render();
};
