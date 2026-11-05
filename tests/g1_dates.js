const H = require('./h');
(async () => {
  const { E, ok, R, signup, close } = await H.boot();
  await signup();
  const pad = (n) => String(n).padStart(2, '0');
  const ref = (m, n) => {
    const [y, mo] = m.split('-').map(Number),
      t = y * 12 + (mo - 1) + n;
    return Math.floor(t / 12) + '-' + pad((t % 12) + 1);
  };
  const dim = (y, m) =>
    [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
      m - 1
    ];
  const f = E('(function(m,n){const a=addM(m,n);return [a,addM(a,-n),mdiff(m,a),mdiff(a,m)]})');
  const dayIn = E('(function(m,d){return dayIn(m,d)})');
  let c = 0;
  for (let y = 2000; y <= 2060; y += 1)
    for (let mo = 1; mo <= 12; mo += 5) {
      const m = y + '-' + pad(mo);
      for (const n of [-36, -25, -13, -12, -1, 0, 1, 2, 11, 12, 13, 25, 36]) {
        const r = f(m, n);
        ok('addM ' + m + ' ' + n, r[0] === ref(m, n), r[0]);
        ok('addM inverso ' + m + ' ' + n, r[1] === m);
        ok('mdiff ' + m + ' ' + n, r[2] === n);
        ok('mdiff antissimétrico', r[3] === -n);
        ok('formato AAAA-MM', /^\d{4}-\d{2}$/.test(r[0]));
        c++;
      }
    }
  for (let y = 2000; y <= 2040; y++)
    for (let mo = 1; mo <= 12; mo++)
      for (const d of [1, 15, 28, 29, 30, 31]) {
        const m = y + '-' + pad(mo);
        const e = Math.min(d, dim(y, mo));
        ok('dayIn ' + m + ' ' + d, dayIn(m, d) === e, dayIn(m, d));
      }
  H.done('Datas e meses (propriedades)', R, { cases: c });
})();
