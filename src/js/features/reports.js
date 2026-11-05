/* features/reports.js
   Relatórios: resumo, comparativo mês a mês e maiores gastos. */

$('relG').onchange = $('relN').onchange = () => renderRel();

function renderRel() {
  const ex = data.filter((x) => !x.inc),
    inc = data.filter((x) => x.inc),
    ms = [...new Set(ex.map(mOf))].sort(),
    last = ms.length ? ms[ms.length - 1] : cmNow(),
    rv = $('relN').value;
  let cols;
  if (rv === 'ano') cols = Array.from({ length: 12 }, (_, i) => last.slice(0, 4) + '-' + pad2(i + 1));
  else if (rv === 'tudo') {
    const n = Math.min(36, ms.length ? mdiff(ms[0], last) + 1 : 1);
    cols = Array.from({ length: n }, (_, i) => addM(last, i - n + 1));
  } else {
    const n = +rv || 6;
    cols = Array.from({ length: n }, (_, i) => addM(last, i - n + 1));
  }
  const n = cols.length,
    total = sumV(ex),
    bm = {},
    im = {};
  ex.forEach((x) => {
    const m = mOf(x);
    bm[m] = (bm[m] || 0) + x.value;
  });
  inc.forEach((x) => {
    const m = x.date.slice(0, 7);
    im[m] = (im[m] || 0) + x.value;
  });
  const top = Object.entries(bm).sort((a, b) => b[1] - a[1])[0],
    k = (l, v) => '<div class="rw"><span class="mut">' + l + '</span><b>' + v + '</b></div>';
  $('relK').innerHTML =
    '<h2>Resumo</h2>' +
    k('Período', ms.length ? mfmt(ms[0]) + ' a ' + mfmt(last) : '–') +
    k('Meses com lançamentos', ms.length) +
    k('Lançamentos', ex.length) +
    k('Despesas', brl(total)) +
    k('Receitas', brl(sumV(inc))) +
    k('Saldo', brl(sumV(inc) - total)) +
    k('Média mensal de despesas', ms.length ? brl(total / ms.length) : '–') +
    k('Maior mês', top ? mfmt(top[0]) + ' · ' + brl(top[1]) : '–') +
    k('Itens a revisar', ex.filter((x) => x.cat === 'A revisar').length);
  const g = $('relG').value,
    NI = 'Não informado',
    key = (x) =>
      g === 'forma'
        ? x.forma || NI
        : g === 'cartao'
          ? x.cartao || NI
          : g === 'quem'
            ? x.quem || NI
            : g === 'tag'
              ? x.tag || NI
              : x.cat,
    rows = {};
  ex.forEach((x) => {
    const m = mOf(x);
    if (!cols.includes(m)) return;
    const r = rows[key(x)] || (rows[key(x)] = {});
    r[m] = (r[m] || 0) + x.value;
  });
  const ct = cols.reduce((a, m) => a + (bm[m] || 0), 0),
    ci = cols.reduce((a, m) => a + (im[m] || 0), 0),
    ks = Object.keys(rows).sort((a, b) => sm(rows[b]) - sm(rows[a])),
    f = (v) => (v ? brl(v) : '–');
  const lab = { cat: 'Categoria', forma: 'Pagamento', cartao: 'Cartão', quem: 'Pessoa', tag: 'Etiqueta' }[g];
  $('relT').innerHTML = ks.length
    ? '<table class="mx"><thead><tr><th>' +
      lab +
      '</th>' +
      cols.map((m) => '<th class="r">' + mfmt(m) + '</th>').join('') +
      '<th class="r">Total</th><th class="r">Média</th><th class="r">%</th></tr></thead><tbody>' +
      ks
        .map((c) => {
          const t = sm(rows[c]);
          return (
            '<tr><td>' +
            esc(c) +
            '</td>' +
            cols.map((m) => '<td class="r">' + f(rows[c][m]) + '</td>').join('') +
            '<td class="r"><b>' +
            brl(t) +
            '</b></td><td class="r">' +
            brl(t / n) +
            '</td><td class="r">' +
            (ct ? ((t / ct) * 100).toFixed(1).replace('.', ',') + '%' : '–') +
            '</td></tr>'
          );
        })
        .join('') +
      '<tr><td><b>Despesas</b></td>' +
      cols.map((m) => '<td class="r"><b>' + f(bm[m]) + '</b></td>').join('') +
      '<td class="r"><b>' +
      brl(ct) +
      '</b></td><td class="r">' +
      brl(ct / n) +
      '</td><td class="r">100%</td></tr>' +
      '<tr><td>Receitas</td>' +
      cols.map((m) => '<td class="r">' + f(im[m]) + '</td>').join('') +
      '<td class="r">' +
      brl(ci) +
      '</td><td class="r">' +
      brl(ci / n) +
      '</td><td></td></tr>' +
      '<tr><td><b>Saldo</b></td>' +
      cols
        .map((m) => {
          const v = (im[m] || 0) - (bm[m] || 0);
          return (
            '<td class="r"' + (v < 0 ? ' style="color:var(--bad)"' : '') + '>' + (v ? brl(v) : '–') + '</td>'
          );
        })
        .join('') +
      '<td class="r"><b>' +
      brl(ci - ct) +
      '</b></td><td class="r">' +
      brl((ci - ct) / n) +
      '</td><td></td></tr></tbody></table>'
    : '<div class="empty">Sem dados no período.</div>';
  const tp = {};
  ex.forEach((x) => {
    const d = normKey(x.desc) || x.desc.toLowerCase(),
      t = tp[d] || (tp[d] = { d: x.desc, n: 0, v: 0 });
    t.n++;
    t.v += x.value;
  });
  $('relTop').innerHTML =
    Object.values(tp)
      .sort((a, b) => b.v - a.v)
      .slice(0, 10)
      .map(
        (t) =>
          '<div class="rw"><div style="min-width:0"><div class="hx">' +
          esc(t.d) +
          '</div><div class="mut">' +
          t.n +
          (t.n === 1 ? ' lançamento' : ' lançamentos') +
          ' · média ' +
          brl(t.v / t.n) +
          '</div></div><div class="hp">' +
          brl(t.v) +
          '</div></div>'
      )
      .join('') || '<div class="empty">Sem dados.</div>';
}

$('relPrint').onclick = () => window.print();
