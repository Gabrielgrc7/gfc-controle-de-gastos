/* features/cards.js
   Cartões: limite, fechamento, vencimento, cálculo da fatura de cada compra. */

const cardOf = (n) => (n ? cards.find((c) => c.n.toLowerCase() === String(n).toLowerCase()) : null);

const invMonth = (date, c) => {
  const cm = addM(date.slice(0, 7), +date.slice(8, 10) > c.f ? 1 : 0);
  return addM(cm, dayIn(cm, c.v) <= dayIn(cm, c.f) ? 1 : 0);
};

const dueOf = (m, c) => m + '-' + pad2(dayIn(m, c.v));

function invoices(c) {
  const g = {};
  data.forEach((x) => {
    if (x.inc || x.forma !== 'Cartão de crédito' || !x.cartao || x.cartao.toLowerCase() !== c.n.toLowerCase())
      return;
    const m = x.fm || invMonth(x.date, c);
    if ((c.paid || []).includes(m)) return;
    g[m] = (g[m] || 0) + x.value;
  });
  return Object.entries(g).sort();
}

function renderCards() {
  $('cdBox').innerHTML = cards.length
    ? cards
        .map((c) => {
          const iv = invoices(c),
            used = iv.reduce((a, x) => a + x[1], 0),
            pct = c.lim > 0 ? Math.min(100, (used / c.lim) * 100) : 0;
          return (
            '<div class="cp"><div class="rw" style="border:0;padding:0"><div><div class="hx">' +
            esc(c.n) +
            '</div><div class="mut">Fecha dia ' +
            c.f +
            ' · vence dia ' +
            c.v +
            '</div></div><button class="lk" data-cdel="' +
            c.id +
            '" style="color:var(--bad);font-size:12px">Excluir</button></div>' +
            (c.lim > 0
              ? '<div class="bar' +
                (pct >= 90 ? ' over' : '') +
                '"><i style="width:' +
                pct +
                '%"></i></div><div class="mut">Usado ' +
                brl(used) +
                ' de ' +
                brl(c.lim) +
                ' · disponível ' +
                brl(Math.max(0, c.lim - used)) +
                '</div>'
              : '<div class="mut" style="margin-top:6px">Em aberto: ' + brl(used) + '</div>') +
            iv
              .map(([m, v]) => {
                const n = daysTo(dueOf(m, c));
                return (
                  '<div class="rw" style="border:0;padding:8px 0 0"><span class="mut">Fatura ' +
                  mfmt(m) +
                  ' · ' +
                  dueTxt(n) +
                  '</span><span style="display:flex;gap:8px;align-items:center"><b style="font-size:13px">' +
                  brl(v) +
                  '</b><button class="btn ghost sm" data-cpay="' +
                  c.id +
                  '|' +
                  m +
                  '">Paga</button></span></div>'
                );
              })
              .join('') +
            '</div>'
          );
        })
        .join('')
    : '<div class="empty" style="padding:14px 0">Nenhum cartão cadastrado.</div>';
}

$('cdAdd').onclick = () => {
  const n = cleanName($('cdN').value),
    lim = parse($('cdLim').value || '0'),
    f = +$('cdF').value,
    v = +$('cdV').value,
    m = $('cdMsg');
  if (!n) return say(m, 'Dê um nome ao cartão.', 1);
  if (cardOf(n)) return say(m, 'Já existe um cartão com esse nome.', 1);
  if (!(f >= 1 && f <= 31 && v >= 1 && v <= 31))
    return say(m, 'Informe os dias de fechamento e vencimento (1 a 31).', 1);
  cards.push({ id: uid(), n, lim: lim > 0 ? lim : 0, f, v, paid: [] });
  store('gastos:cards', cards);
  ['cdN', 'cdLim', 'cdF', 'cdV'].forEach((i) => {
    $(i).value = '';
  });
  say(m, 'Cartão cadastrado. Lançamentos de crédito com esse nome já entram na fatura certa.');
  render();
};

$('cdBox').addEventListener('click', (e) => {
  const p = e.target.closest('[data-cpay]'),
    d = e.target.closest('[data-cdel]');
  if (p) {
    const [cid, mm] = p.dataset.cpay.split('|'),
      c = cards.find((k) => k.id === cid);
    if (c) {
      (c.paid = c.paid || []).push(mm);
      store('gastos:cards', cards);
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
      cards = cards.filter((k) => k.id !== d.dataset.cdel);
      store('gastos:cards', cards);
      render();
    }
  }
});
