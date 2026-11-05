/* features/goals.js
   Sonhos (metas de economia). */

function renderGoals() {
  $('gBox').innerHTML = goals.length
    ? goals
        .map((g) => {
          const left = Math.max(0, g.a - g.g),
            mo = g.p ? Math.max(1, mdiff(cmNow(), g.p)) : 0;
          return (
            '<div class="cp"><div class="rw" style="border:0;padding:0"><div><div class="hx">' +
            esc(g.n) +
            '</div><div class="mut">' +
            brl(g.g) +
            ' de ' +
            brl(g.a) +
            (g.p ? ' · até ' + mfmt(g.p) : '') +
            '</div></div><button class="lk" data-gdel="' +
            g.id +
            '" style="color:var(--bad);font-size:12px">Excluir</button></div><div class="bar"><i style="width:' +
            Math.min(100, (g.g / g.a) * 100) +
            '%"></i></div>' +
            '<div class="mut">' +
            (left > 0
              ? 'Faltam ' +
                brl(left) +
                (mo ? ' · guardando ' + brl(left / mo) + ' por mês você chega lá' : '')
              : 'Meta alcançada!') +
            '</div>' +
            '<div class="row" style="margin-top:8px"><input data-gi="' +
            g.id +
            '" inputmode="decimal" placeholder="Valor" style="width:120px"><button class="btn ghost sm" data-gs="' +
            g.id +
            '">Guardar</button><button class="btn ghost sm" data-gr="' +
            g.id +
            '">Retirar</button></div></div>'
          );
        })
        .join('')
    : '<div class="empty" style="padding:14px 0">Nenhum sonho ainda.</div>';
}

$('gAdd').onclick = () => {
  const n = cleanName($('gN').value),
    a = parse($('gA').value),
    p = $('gP').value,
    m = $('gMsg');
  if (!n) return say(m, 'Dê um nome ao sonho.', 1);
  if (!(a > 0 && a < 1e10)) return say(m, 'Informe o valor da meta.', 1);
  goals.push({ id: uid(), n, a: Math.round(a * 100) / 100, g: 0, p: p || '' });
  store('gastos:goals', goals);
  ['gN', 'gA', 'gP'].forEach((i) => {
    $(i).value = '';
  });
  say(m, 'Sonho criado.');
  render();
};

$('gBox').addEventListener('click', (e) => {
  const s = e.target.closest('[data-gs]'),
    r = e.target.closest('[data-gr]'),
    d = e.target.closest('[data-gdel]'),
    id = (s || r) && (s || r).dataset[s ? 'gs' : 'gr'];
  if (id) {
    const g = goals.find((x) => x.id === id),
      v = parse(document.querySelector('[data-gi="' + id + '"]').value);
    if (g && v > 0 && v < 1e10) {
      g.g = Math.max(0, Math.round((g.g + (s ? v : -v)) * 100) / 100);
      store('gastos:goals', goals);
      render();
    }
  }
  if (d) {
    if (!d.dataset.c) {
      d.dataset.c = 1;
      d.textContent = 'Confirmar';
      setTimeout(() => {
        if (d.isConnected && d.dataset.c) {
          delete d.dataset.c;
          d.textContent = 'Excluir';
        }
      }, 3000);
    } else {
      goals = goals.filter((x) => x.id !== d.dataset.gdel);
      store('gastos:goals', goals);
      render();
    }
  }
});
