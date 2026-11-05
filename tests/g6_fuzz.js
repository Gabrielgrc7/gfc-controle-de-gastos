const H = require('./h');
(async () => {
  const { $, Q, QA, E, ok, R, signup, w } = await H.boot();
  await signup();
  const rnd = H.rng(20261022),
    pad = (n) => String(n).padStart(2, '0');
  const cats = E('CATS.filter(c=>c!=="A revisar")');
  const num = (t) =>
    parseFloat(
      String(t)
        .replace(/[^\d,-]/g, '')
        .replace(',', '.')
    );
  const cm = E('cmNow()'),
    add = (m, n) => {
      const t = +m.slice(0, 4) * 12 + (+m.slice(5, 7) - 1) + n;
      return Math.floor(t / 12) + '-' + pad((t % 12) + 1);
    };
  let n = 0;
  for (let sc = 0; sc < 40; sc++) {
    const items = [];
    const N = 20 + Math.floor(rnd() * 60);
    for (let i = 0; i < N; i++) {
      const m = add(cm, -Math.floor(rnd() * 6)),
        d = 1 + Math.floor(rnd() * 28),
        inc = rnd() < 0.18,
        v = Math.round((1 + rnd() * 900) * 100) / 100;
      items.push({
        id: 'f' + sc + '_' + i,
        desc: (inc ? 'Receita ' : 'Gasto ') + i,
        value: v,
        date: m + '-' + pad(d),
        cat: inc ? 'Receita' : cats[Math.floor(rnd() * cats.length)],
        ...(inc ? { inc: true } : {}),
      });
    }
    E('data=' + JSON.stringify(items) + ';budgets={};catlim={}');
    const month = add(cm, -Math.floor(rnd() * 6));
    $('month').value = month;
    E('render()');
    const ex = items.filter((x) => !x.inc && x.date.slice(0, 7) === month),
      inc = items.filter((x) => x.inc && x.date.slice(0, 7) === month);
    const sum = (a) => a.reduce((s, x) => s + x.value, 0),
      r2 = (x) => Math.round(x * 100) / 100;
    n++;
    ok(
      `#${sc} total gasto do mês`,
      Math.abs(num($('kTotal').textContent) - r2(sum(ex))) < 0.005,
      $('kTotal').textContent + ' vs ' + r2(sum(ex))
    );
    ok(
      `#${sc} quantidade de lançamentos`,
      +$('kCount').textContent === ex.length,
      $('kCount').textContent + ' vs ' + ex.length
    );
    const fl = QA('.fl3 b').map((b) => num(b.textContent));
    ok(`#${sc} receitas`, Math.abs(fl[0] - r2(sum(inc))) < 0.005, fl[0] + ' vs ' + r2(sum(inc)));
    ok(`#${sc} despesas`, Math.abs(fl[1] - r2(sum(ex))) < 0.005);
    ok(`#${sc} saldo`, Math.abs(fl[2] - r2(sum(inc) - sum(ex))) < 0.005, fl[2]);
    // categorias do gráfico somam o total
    E('chartT="rosca";render()');
    const tiles = QA('#pie .ct');
    const tsum = tiles.reduce((s, t) => s + num(t.querySelector('.mut').textContent.split('·')[0]), 0);
    ok(`#${sc} categorias somam o total`, Math.abs(tsum - r2(sum(ex))) < 0.02 || !ex.length, tsum);
    // cada categoria confere com a soma independente
    const by = {};
    ex.forEach((x) => (by[x.cat] = (by[x.cat] || 0) + x.value));
    ok(
      `#${sc} cada categoria confere`,
      tiles.every(
        (t) => Math.abs(num(t.querySelector('.mut').textContent.split('·')[0]) - r2(by[t.dataset.cat])) < 0.02
      )
    );
    // histórico: lista só despesas do mês
    Q('.nv[data-go="lanc"]').click();
    Q('#seg [data-s="hist"]').click();
    ok(
      `#${sc} histórico mostra só as despesas do mês`,
      QA('#rows .hr').length === ex.length,
      QA('#rows .hr').length + ' vs ' + ex.length
    );
    ok(`#${sc} soma do histórico`, !ex.length || Math.abs(num($('listV').textContent) - r2(sum(ex))) < 0.005);
    // agenda: soma dos dias = total de despesas do mês
    Q('.nv[data-go="agenda"]').click();
    const ag = num($('calSum').textContent.split('em despesas')[0].replace('Neste mês:', ''));
    ok(`#${sc} agenda: despesas do mês`, Math.abs(ag - r2(sum(ex))) < 0.005, ag);
    // relatório: total de despesas na coluna do mês
    Q('[data-go="rel"]') && E('go("rel")');
    E('$("relN").value="6";renderRel()');
    const rows = QA('#relT tbody tr'),
      dRow = rows.find((r) => r.firstElementChild.textContent === 'Despesas');
    ok(`#${sc} relatório: linha Despesas existe`, !!dRow || !items.some((x) => !x.inc));
    // reset para próximo
    Q('.nv[data-go="inicio"]').click();
  }
  H.done('Totais e consistência entre telas (dados aleatórios)', R, { cases: n });
})();
