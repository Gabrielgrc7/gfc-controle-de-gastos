/* features/calendar.js
   Aba Agenda: calendário do mês com os pontos de cada dia e os detalhes do dia. */

function invAll(c) {
  const g = {};
  data.forEach((x) => {
    if (x.inc || x.forma !== 'Cartão de crédito' || !x.cartao || x.cartao.toLowerCase() !== c.n.toLowerCase())
      return;
    const m = x.fm || invMonth(x.date, c);
    g[m] = (g[m] || 0) + x.value;
  });
  return Object.entries(g)
    .map(([m, t]) => [m, t, (c.paid || []).includes(m)])
    .sort();
}

function agendaData() {
  const m = mkey(),
    map = {},
    g = (d) => map[d] || (map[d] = { exp: [], inc: [], bill: [], paid: [], inv: [] });
  data.forEach((x) => {
    if (x.date.slice(0, 7) !== m) return;
    const d = g(x.date);
    if (x.inc) d.inc.push(x);
    else if (x.pend) d.bill.push(x);
    else if (x.bill) d.paid.push(x);
    else d.exp.push(x);
  });
  cards.forEach((c) => {
    if (!(c.f && c.v)) return;
    invAll(c).forEach(([mm, t, paid]) => {
      const due = dueOf(mm, c);
      if (due.slice(0, 7) === m) g(due).inv.push({ c, mm, t, paid, due });
    });
  });
  return map;
}

function renderAgenda() {
  const m = mkey(),
    y = +m.slice(0, 4),
    mo = +m.slice(5, 7),
    days = new Date(y, mo, 0).getDate(),
    first = new Date(y, mo - 1, 1).getDay(),
    map = agendaData(),
    td = iso(today),
    ml = $('mLabel').textContent,
    E0 = { exp: [], inc: [], bill: [], paid: [], inv: [] };
  if (!selDay || selDay.slice(0, 7) !== m) selDay = td.slice(0, 7) === m ? td : m + '-01';
  let h = '';
  for (let i = 0; i < first; i++) h += '<span class="cd out"></span>';
  let tg = 0,
    ti = 0,
    nb = 0;
  for (let d = 1; d <= days; d++) {
    const ds = m + '-' + pad2(d),
      o = map[ds] || E0,
      spent = sumV(o.exp) + sumV(o.bill) + sumV(o.paid),
      dots = [];
    tg += spent;
    ti += sumV(o.inc);
    nb += o.bill.length;
    if (o.exp.length) dots.push('var(--c3)');
    if (o.inc.length) dots.push('var(--logo)');
    if (o.bill.length) dots.push(o.bill.some((x) => x.date < td) ? 'var(--bad)' : 'var(--c2)');
    if (o.paid.length) dots.push('var(--mute)');
    if (o.inv.length) dots.push('var(--c5)');
    const n = o.exp.length + o.inc.length + o.bill.length + o.paid.length + o.inv.length;
    h +=
      '<button class="cd' +
      (ds === td ? ' today' : '') +
      (ds === selDay ? ' sel' : '') +
      '" data-day="' +
      ds +
      '" aria-label="' +
      d +
      ' de ' +
      esc(ml) +
      (n ? ', ' + n + (n === 1 ? ' item' : ' itens') : ', sem itens') +
      '"><b>' +
      d +
      '</b><span class="dots">' +
      dots.map((c) => '<i style="background:' + c + '"></i>').join('') +
      '</span><span class="amt">' +
      (spent ? cpt(spent) : '') +
      '</span></button>';
  }
  $('calGrid').innerHTML = h;
  $('calSum').textContent =
    'Neste mês: ' +
    brl(tg) +
    ' em despesas · ' +
    brl(ti) +
    ' em receitas' +
    (nb ? ' · ' + nb + (nb === 1 ? ' conta a pagar' : ' contas a pagar') : '');
  const o = map[selDay] || E0,
    dt = new Date(selDay + 'T12:00:00'),
    title = dt.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const dot = (c) => '<span class="dot" style="background:' + col(c) + '"></span> ',
    ed = (x) => '<button class="lk" data-edit="' + x.id + '" style="font-size:12px">Editar</button>';
  const row = (x, sub, act) =>
    '<div class="rw"><div style="min-width:0"><div class="hx">' +
    esc(x.desc) +
    '</div><div class="mut">' +
    sub +
    '</div></div><div style="display:flex;gap:10px;align-items:center"><span class="hp">' +
    brl(x.value) +
    '</span>' +
    act +
    '</div></div>';
  const sec = (t, a) =>
    a.length ? '<div class="mut" style="margin:14px 0 2px;font-weight:600">' + t + '</div>' + a.join('') : '';
  const body =
    sec(
      'Receitas',
      o.inc.map((x) =>
        row(x, esc(x.desc === x.cat ? '' : 'Receita') + (x.kind === 'r' ? ' · recorrente' : ''), ed(x))
      )
    ) +
    sec(
      'Compras e despesas',
      o.exp.map((x) => row(x, dot(x.cat) + esc(x.cat) + badge(x), ed(x)))
    ) +
    sec(
      'Contas a pagar',
      o.bill.map((x) =>
        row(
          x,
          dot(x.cat) + esc(x.cat) + ' · ' + dueTxt(daysTo(x.date)),
          '<button class="btn ghost sm" data-pay="e:' + x.id + '">Pagar</button>' + ed(x)
        )
      )
    ) +
    sec(
      'Contas pagas',
      o.paid.map((x) =>
        row(
          x,
          dot(x.cat) +
            esc(x.cat) +
            (x.paid ? ' · paga em ' + x.paid.split('-').reverse().slice(0, 2).join('/') : ' · paga'),
          ed(x)
        )
      )
    ) +
    sec(
      'Faturas de cartão',
      o.inv.map((v) =>
        row(
          { desc: 'Fatura ' + v.c.n, value: v.t },
          v.paid ? 'Paga' : dueTxt(daysTo(v.due)),
          v.paid ? '' : '<button class="btn ghost sm" data-pay="f:' + v.c.id + '|' + v.mm + '">Paga</button>'
        )
      )
    );
  const tot = sumV(o.exp) + sumV(o.bill) + sumV(o.paid);
  $('dayBox').innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px"><div><div style="font-size:17px;font-weight:600;text-transform:capitalize">' +
    esc(title) +
    '</div><div class="mut">' +
    (tot || sumV(o.inc)
      ? brl(tot) + ' em despesas' + (o.inc.length ? ' · ' + brl(sumV(o.inc)) + ' em receitas' : '')
      : 'Nada registrado neste dia') +
    '</div></div><button class="btn ghost sm" data-newday="1">+ Lançar</button></div>' +
    body;
}

$('calGrid').onclick = (e) => {
  const b = e.target.closest('[data-day]');
  if (b) {
    selDay = b.dataset.day;
    renderAgenda();
  }
};

function payItem(code) {
  const [t, id] = code.split(/:(.*)/s);
  if (t === 'e') {
    const x = data.find((i) => i.id === id);
    if (x) {
      x.pend = undefined;
      x.bill = true;
      x.paid = iso(today);
      saveAll();
      render();
      toast('Conta marcada como paga.');
    }
  } else {
    const [cid, mm] = id.split('|'),
      c = cards.find((k) => k.id === cid);
    if (c) {
      (c.paid = c.paid || []).push(mm);
      store('gastos:cards', cards);
      render();
      toast('Fatura marcada como paga.');
    }
  }
}

function editEntry(x) {
  editing = x.id;
  $('fDesc').value = x.desc;
  $('fVal').value = String(x.value).replace('.', ',');
  $('fDate').value = x.date;
  if (!x.inc) $('fCat').value = x.cat;
  fillForm(x);
  $('formTitle').textContent = x.inc ? 'Editar receita' : 'Editar lançamento';
  $('save').textContent = 'Salvar';
  $('cancel').hidden = false;
  go('lancar');
}

$('dayBox').addEventListener('click', (e) => {
  const p = e.target.closest('[data-pay]'),
    ed = e.target.closest('[data-edit]'),
    nw = e.target.closest('[data-newday]');
  if (p) payItem(p.dataset.pay);
  if (ed) {
    const x = data.find((i) => i.id === ed.dataset.edit);
    if (x) editEntry(x);
  }
  if (nw) {
    go('lancar');
    resetForm();
    $('fDate').value = selDay;
  }
});
