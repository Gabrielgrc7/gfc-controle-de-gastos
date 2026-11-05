const H = require('./h');
(async () => {
  const { E, ok, R, signup } = await H.boot();
  await signup();
  const pad = (n) => String(n).padStart(2, '0');
  const dim = (y, m) =>
    [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
      m - 1
    ];
  const inv = E('(function(d,f,v){return invMonth(d,{f:f,v:v})})');
  // referência independente: simula dia a dia
  const ref = (date, f, v) => {
    let [y, m, d] = date.split('-').map(Number);
    const nextDay = () => {
      d++;
      if (d > dim(y, m)) {
        d = 1;
        m++;
        if (m > 12) {
          m = 1;
          y++;
        }
      }
    };
    while (d !== Math.min(f, dim(y, m))) nextDay(); // dia de fechamento (>= data da compra)
    nextDay();
    while (d !== Math.min(v, dim(y, m))) nextDay(); // primeiro vencimento depois do fechamento
    return y + '-' + pad(m);
  };
  let n = 0;
  const days = [1, 5, 10, 12, 15, 19, 20, 25, 28, 29, 30, 31],
    FV = [1, 5, 10, 12, 15, 20, 28, 29, 30, 31];
  for (const f of FV)
    for (const v of FV)
      for (const mo of [1, 2, 3, 12])
        for (const d of days) {
          if (d > dim(2026, mo) && mo === 2) continue;
          const date = '2026-' + pad(mo) + '-' + pad(Math.min(d, dim(2026, mo)));
          const a = inv(date, f, v),
            b = ref(date, f, v);
          ok('fatura ' + date + ' fecha ' + f + ' vence ' + v, a === b, a + ' vs ' + b);
          n++;
        }
  H.done('Fatura do cartão (comparada com simulação dia a dia)', R, { cases: n });
})();
