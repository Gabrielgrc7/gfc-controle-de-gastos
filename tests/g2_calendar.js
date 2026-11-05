const H = require('./h');
(async () => {
  const { w, $, Q, QA, E, ok, R, signup } = await H.boot();
  await signup();
  const pad = (n) => String(n).padStart(2, '0');
  const dim = (y, m) =>
    [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
      m - 1
    ];
  const dow = (y, m, d) => {
    const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
    if (m < 3) y--;
    return (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[m - 1] + d) % 7;
  };
  Q('.nv[data-go="agenda"]').click();
  for (let y = 2000; y <= 2060; y++)
    for (let m = 1; m <= 12; m++) {
      $('month').value = y + '-' + pad(m);
      E('render()');
      const cells = QA('#calGrid [data-day]'),
        blanks = QA('#calGrid .cd.out').length;
      ok('dias ' + y + '-' + m, cells.length === dim(y, m), cells.length);
      ok('espaços antes ' + y + '-' + m, blanks === dow(y, m, 1), blanks);
      ok(
        'último dia ' + y + '-' + m,
        cells.length && cells[cells.length - 1].dataset.day === y + '-' + pad(m) + '-' + pad(dim(y, m))
      );
      ok('rótulo do mês ' + y + '-' + m, E('$("heroL").textContent').includes(String(y)));
    }
  H.done('Calendário (2000 a 2060, todos os meses)', R);
})();
