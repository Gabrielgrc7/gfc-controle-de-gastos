/* features/charts.js
   Gráficos do Início (rosca, barras, linha e semana) e o texto que aparece ao passar o mouse. */

let chartT = 'rosca';
/* no modo Simples o gráfico é sempre a rosca (sem a escolha de tipo) */
const chartKind = () => (document.body.dataset.home === 'simples' ? 'rosca' : chartT);

const WD = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const tl = (n, l, i, k) =>
  ' data-n="' +
  esc(n) +
  '" data-l="' +
  esc(l) +
  '"' +
  (i != null ? ' data-i="' + i + '"' : '') +
  (k ? ' data-cat="' + esc(n) + '"' : '');

function pie(by, total, items, m) {
  if (!by.length)
    return '<div class="empty">Sem gastos neste mês.<div class="mut" style="margin-top:4px">Adicione um lançamento para ver os gráficos.</div></div>';
  return ({ barras: cBars, linha: cLine, semana: cWeek }[chartKind()] || cDonut)(by, total, items, m);
}

function cDonut(by, total) {
  let off = 0;
  const tot = brl(total).replace(/\s/g, '\u00a0');
  const arcs = by
    .map(([c, v], i) => {
      const p = (v / total) * 100,
        d = Math.max(0, p - (by.length > 1 ? 1 : 0));
      const r =
        '<circle class="sl" r="15.9155" cx="21" cy="21" fill="none" stroke="' +
        col(c) +
        '" stroke-width="5" stroke-dasharray="' +
        d +
        ' ' +
        (100 - d) +
        '" stroke-dashoffset="' +
        -off +
        '" transform="rotate(-90 21 21)"' +
        tl(c, brl(v) + ' · ' + pc(p), i, 1) +
        '/>';
      off += p;
      return r;
    })
    .join('');
  const tiles = by
    .map(
      ([c, v], i) =>
        '<div class="ct" style="--cc:' +
        col(c) +
        '"' +
        tl(c, brl(v) + ' · ' + pc((v / total) * 100), i, 1) +
        '><div class="ctn">' +
        c +
        '</div><div class="mut">' +
        brl(v) +
        ' · ' +
        ((v / total) * 100).toFixed(0) +
        '%</div></div>'
    )
    .join('');
  return (
    '<svg class="dn" viewBox="0 0 42 42" role="img" aria-label="Gastos por categoria"><circle r="15.9155" cx="21" cy="21" fill="none" stroke="var(--line)" stroke-width="5"/>' +
    arcs +
    '<text id="dnL" data-d="Total" x="21" y="19.4" text-anchor="middle" font-size="2.3" fill="var(--mute)">Total</text><text id="dnV" data-d="' +
    tot +
    '" x="21" y="24.4" text-anchor="middle" font-size="3.5" font-weight="600" fill="var(--tx)">' +
    tot +
    '</text></svg><div class="ct-g">' +
    tiles +
    '</div>'
  );
}

function cBars(by, total) {
  const mx = by[0][1];
  return (
    '<div class="hbs">' +
    by
      .map(
        ([c, v], i) =>
          '<div class="hb"' +
          tl(c, brl(v) + ' · ' + pc((v / total) * 100), i, 1) +
          '><div class="hn"><span class="dot" style="background:' +
          col(c) +
          '"></span>' +
          c +
          '</div><div class="ht"><i style="width:' +
          (v / mx) * 100 +
          '%;background:' +
          col(c) +
          '"></i></div><div class="hv">' +
          brl(v) +
          '</div></div>'
      )
      .join('') +
    '</div>'
  );
}

function cLine(by, total, items, m) {
  const y = +m.slice(0, 4),
    mo = +m.slice(5, 7),
    days = new Date(y, mo, 0).getDate(),
    n = m === iso(today).slice(0, 7) ? today.getDate() : days;
  const d = Array(days + 1).fill(0);
  items.forEach((x) => {
    d[+x.date.slice(8, 10)] += x.value;
  });
  let c = 0;
  const cum = [0];
  for (let i = 1; i <= n; i++) {
    c += d[i];
    cum[i] = c;
  }
  const b = budgets[m] || 0,
    mx = Math.max(c, b, 1) * 1.1,
    X = (i) => 40 + (days > 1 ? (i - 1) / (days - 1) : 0) * 268,
    Y = (v) => 10 + (1 - v / mx) * 150;
  let g = '';
  for (let k = 0; k <= 3; k++) {
    const v = (mx * k) / 3;
    g +=
      '<line x1="40" x2="308" y1="' +
      Y(v) +
      '" y2="' +
      Y(v) +
      '" stroke="var(--line)" stroke-width=".6"/><text x="36" y="' +
      (Y(v) + 3) +
      '" text-anchor="end" font-size="8" fill="var(--mute)">' +
      short(v) +
      '</text>';
  }
  [1, Math.ceil(days / 2), days].forEach((i) => {
    g +=
      '<text x="' + X(i) + '" y="180" text-anchor="middle" font-size="8" fill="var(--mute)">' + i + '</text>';
  });
  const bl = b
    ? '<line x1="40" x2="308" y1="' +
      Y(b) +
      '" y2="' +
      Y(b) +
      '" stroke="var(--bad)" stroke-width="1" stroke-dasharray="4 3"/><text x="308" y="' +
      (Y(b) - 3) +
      '" text-anchor="end" font-size="8" fill="var(--bad)">Limite</text>'
    : '';
  const pts = [];
  for (let i = 1; i <= n; i++) pts.push(X(i).toFixed(1) + ',' + Y(cum[i]).toFixed(1));
  const area =
    '<path d="M' +
    X(1) +
    ',' +
    Y(0) +
    ' L' +
    pts.join(' L') +
    ' L' +
    X(n) +
    ',' +
    Y(0) +
    'Z" fill="var(--c0)" opacity=".15"/><polyline points="' +
    pts.join(' ') +
    '" fill="none" stroke="var(--c0)" stroke-width="1.8" stroke-linejoin="round"/>';
  let h = '';
  for (let i = 1; i <= n; i++)
    h +=
      '<circle cx="' +
      X(i) +
      '" cy="' +
      Y(cum[i]) +
      '" r="' +
      (d[i] ? 3 : 1.6) +
      '" fill="' +
      (d[i] ? 'var(--c0)' : 'var(--line)') +
      '"/><circle class="hit" cx="' +
      X(i) +
      '" cy="' +
      Y(cum[i]) +
      '" r="8" fill="transparent"' +
      tl('Dia ' + i, 'No dia: ' + brl(d[i]) + ' · Acumulado: ' + brl(cum[i])) +
      '/>';
  return (
    '<svg class="ln" viewBox="0 0 320 188" role="img" aria-label="Gasto acumulado por dia">' +
    g +
    bl +
    area +
    h +
    '</svg><div class="note" style="text-align:center">Gasto acumulado ao longo do mês</div>'
  );
}

function cWeek(by, total, items) {
  const w = Array(7).fill(0),
    q = Array(7).fill(0);
  items.forEach((x) => {
    const k = new Date(x.date + 'T12:00:00').getDay();
    w[k] += x.value;
    q[k]++;
  });
  const mx = Math.max(...w, 1);
  return (
    '<div class="wk">' +
    w
      .map(
        (v, k) =>
          '<div class="wc"' +
          tl(WD[k], brl(v) + ' · ' + q[k] + (q[k] === 1 ? ' lançamento' : ' lançamentos'), k) +
          '><div class="wv">' +
          (v ? short(v) : '') +
          '</div><div class="wb" style="height:' +
          Math.max(v ? 4 : 0, (v / mx) * 120) +
          'px"></div><div class="wl">' +
          WD[k].slice(0, 3) +
          '</div></div>'
      )
      .join('') +
    '</div>'
  );
}

const tipEl = $('tip');

function hl(i) {
  $('pie')
    .querySelectorAll('[data-i]')
    .forEach((x) => x.classList.toggle('dim', i != null && x.dataset.i !== String(i)));
}

function tipHide() {
  tipEl.hidden = true;
  hl(null);
  const L = $('dnL');
  if (L) {
    L.textContent = L.dataset.d;
    $('dnV').textContent = $('dnV').dataset.d;
  }
}

function tipMove(e) {
  const t = e.target.closest('[data-n]');
  if (!t || !$('pie').contains(t)) {
    tipHide();
    return;
  }
  tipEl.innerHTML =
    '<b>' +
    esc(t.dataset.n) +
    '</b><br>' +
    esc(t.dataset.l) +
    (t.dataset.cat ? '<br><span style="color:var(--mute)">Clique para ver os lançamentos</span>' : '');
  tipEl.hidden = false;
  tipEl.style.left = Math.max(8, Math.min(e.clientX + 14, innerWidth - tipEl.offsetWidth - 8)) + 'px';
  tipEl.style.top = e.clientY + 18 + 'px';
  const i = t.dataset.i;
  hl(i === undefined ? null : i);
  const L = $('dnL');
  if (L && i !== undefined) {
    L.textContent = t.dataset.n;
    $('dnV').textContent = t.dataset.l.split(' · ')[0];
  }
}

$('pie').addEventListener('pointermove', tipMove);

$('pie').addEventListener('pointerdown', tipMove);

$('pie').addEventListener('pointerleave', tipHide);

document.addEventListener('pointerdown', (e) => {
  if (!e.target.closest('#pie')) tipHide();
});

$('chSeg').onclick = (e) => {
  const b = e.target.closest('button');
  if (b) {
    chartT = b.dataset.ch;
    store('gfc:chart', chartT);
    tipHide();
    render();
  }
};
