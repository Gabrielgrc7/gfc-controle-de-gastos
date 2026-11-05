/* features/commitments.js
   Compromissos: parcelamentos, recorrentes, contas a pagar, assinaturas detectadas e cobranças atípicas. */

function commitList() {
  const cm = iso(today).slice(0, 7),
    L = [];
  plans
    .filter((p) => p.active && !p.inc)
    .forEach((p) => {
      const s = p.start.slice(0, 7),
        kn = mdiff(s, cm);
      if (p.kind === 'p') {
        const cur = kn < 0 ? p.pn - 1 : Math.min(p.pn + kn, p.pt);
        L.push({
          t: 'p',
          plan: 1,
          gid: p.gid,
          desc: p.desc,
          cat: p.cat,
          value: p.value,
          cur,
          pt: p.pt,
          base: s,
          bpn: p.pn,
          end: addM(s, p.pt - p.pn),
        });
      } else
        L.push({
          t: 'r',
          plan: 1,
          gid: p.gid,
          desc: p.desc,
          cat: p.cat,
          value: p.value,
          since: s,
          end: p.end,
        });
    });
  const g = {};
  data
    .filter((x) => x.kind === 'p' && x.gid && x.pt && !plans.some((p) => p.gid === x.gid))
    .forEach((x) => {
      if (!g[x.gid] || x.date > g[x.gid].date) g[x.gid] = x;
    });
  Object.values(g).forEach((x) => {
    if (x.pn < x.pt) {
      const b = x.date.slice(0, 7);
      L.push({
        t: 'p',
        gid: x.gid,
        desc: x.desc,
        cat: x.cat,
        value: x.value,
        cur: x.pn,
        pt: x.pt,
        base: b,
        bpn: x.pn,
        end: addM(b, x.pt - x.pn),
      });
    }
  });
  return L;
}

/* Quanto de recorrentes e de parcelas já está comprometido em cada um dos próximos n meses depois de "from" */
function commitForecast(from, n) {
  const L = commitList(),
    P = L.filter((x) => x.t === 'p' && x.cur < x.pt),
    R = L.filter((x) => x.t === 'r');
  return Array.from({ length: n }, (_, i) => {
    const m = addM(from, i + 1);
    let rec = 0,
      inst = 0;
    P.forEach((x) => {
      const k = x.bpn + mdiff(x.base, m);
      if (mdiff(x.base, m) >= 0 && k <= x.pt) inst += x.value;
    });
    R.forEach((x) => {
      if (m >= x.since && (!x.end || m <= x.end)) rec += x.value;
    });
    return { m, rec, inst };
  });
}

function renderComp() {
  const cm = iso(today).slice(0, 7),
    L = commitList();
  const P = L.filter((x) => x.t === 'p' && x.cur < x.pt),
    R = L.filter((x) => x.t === 'r'),
    left = P.reduce((a, x) => a + (x.pt - x.cur) * x.value, 0);
  const fc = commitForecast(cm, 6).map((f) => [f.m, f.inst + f.rec]);
  const mx = Math.max(...fc.map((f) => f[1]), 1),
    dot = (c) => '<span class="dot" style="background:' + col(c) + '"></span> ';
  const act = (x) =>
    x.plan
      ? '<details class="pd"><summary class="mut">Gerenciar</summary><div class="row" style="margin-top:8px"><input data-pvi="' +
        x.gid +
        '" inputmode="decimal" placeholder="Novo valor" style="width:130px"><button class="btn ghost sm" data-pvs="' +
        x.gid +
        '">Salvar valor</button><button class="btn ghost sm" data-pe="' +
        x.gid +
        '" style="color:var(--bad)">Encerrar</button></div></details>'
      : '<div class="mut" style="margin-top:6px">Vem da fatura importada</div>';
  const pc = (x) =>
    '<div class="cp"><div class="rw" style="border:0;padding:0"><div style="min-width:0"><div class="hx">' +
    esc(x.desc) +
    '</div><div class="mut">' +
    dot(x.cat) +
    esc(x.cat) +
    ' · Parcela ' +
    Math.max(x.cur, 0) +
    ' de ' +
    x.pt +
    '</div></div><div class="hp">' +
    brl(x.value) +
    '</div></div><div class="bar"><i style="width:' +
    (Math.max(0, x.cur) / x.pt) * 100 +
    '%"></i></div><div class="mut">Faltam ' +
    (x.pt - x.cur) +
    ' · restante ' +
    brl((x.pt - x.cur) * x.value) +
    ' · termina em ' +
    mfmt(x.end) +
    '</div>' +
    act(x) +
    '</div>';
  const rc = (x) =>
    '<div class="cp"><div class="rw" style="border:0;padding:0"><div style="min-width:0"><div class="hx">' +
    esc(x.desc) +
    '</div><div class="mut">' +
    dot(x.cat) +
    esc(x.cat) +
    ' · todo mês desde ' +
    mfmt(x.since) +
    (x.end ? ' até ' + mfmt(x.end) : '') +
    '</div></div><div class="hp">' +
    brl(x.value) +
    '</div></div>' +
    act(x) +
    '</div>';
  $('compBox').innerHTML =
    '<div class="card hero" style="padding:20px"><div class="l">Ainda a pagar em parcelas</div><div class="big-v" style="font-size:32px">' +
    brl(left) +
    '</div><div class="mut">Previsto para ' +
    mfmt(fc[0][0]) +
    ': ' +
    brl(fc[0][1]) +
    ' (parcelas + recorrentes)</div></div>' +
    '<div class="card"><h2>Parcelamentos</h2>' +
    (P.length
      ? P.map(pc).join('')
      : '<div class="empty" style="padding:14px 0">Nenhum parcelamento em andamento.</div>') +
    '</div>' +
    '<div class="card"><h2>Recorrentes</h2>' +
    (R.length
      ? R.map(rc).join('')
      : '<div class="empty" style="padding:14px 0">Nenhuma recorrência ativa.</div>') +
    '</div>' +
    '<div class="card"><h2>Previsão dos próximos 6 meses</h2>' +
    fc
      .map(
        ([m, v]) =>
          '<div class="hb" style="grid-template-columns:70px 1fr auto;margin-bottom:10px"><div class="mut">' +
          mfmt(m) +
          '</div><div class="ht"><i style="width:' +
          (v / mx) * 100 +
          '%;background:var(--c0)"></i></div><div class="hv">' +
          brl(v) +
          '</div></div>'
      )
      .join('') +
    '<div class="note">Considera parcelas restantes e recorrências ativas.</div></div>';
}

$('compBox').addEventListener('click', (e) => {
  const s = e.target.closest('[data-pvs]'),
    d = e.target.closest('[data-pe]');
  if (s) {
    const p = plans.find((x) => x.gid === s.dataset.pvs),
      v = parse(document.querySelector('[data-pvi="' + s.dataset.pvs + '"]').value);
    if (p && v > 0 && v < 1e9) {
      p.value = Math.round(v * 100) / 100;
      saveAll();
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
          d.textContent = 'Encerrar';
        }
      }, 3000);
    } else {
      const p = plans.find((x) => x.gid === d.dataset.pe);
      if (p) {
        p.active = false;
        saveAll();
        render();
      }
    }
  }
});

function payList() {
  const L = data
    .filter((x) => !x.inc && x.pend)
    .map((x) => ({ t: 'e', id: x.id, desc: x.desc, date: x.date, value: x.value, cat: x.cat }));
  cards.forEach((c) => {
    if (!(c.f && c.v)) return;
    invoices(c).forEach(([m, v]) => {
      const d = dueOf(m, c);
      if (d <= addM(cmNow(), 1) + '-31')
        L.push({ t: 'f', id: c.id + '|' + m, desc: 'Fatura ' + c.n, date: d, value: v, cat: '' });
    });
  });
  return L.sort((a, b) => (a.date < b.date ? -1 : 1));
}

function subsDetect() {
  const g = {};
  data
    .filter((x) => !x.inc && !x.kind && !x.gid)
    .forEach((x) => {
      const k = normKey(x.desc);
      if (k) (g[k] = g[k] || []).push(x);
    });
  return Object.entries(g)
    .map(([k, a]) => {
      const ms = [...new Set(a.map(mOf))].sort(),
        v = a.map((x) => x.value),
        last = a[a.length - 1];
      if (
        ms.length < 3 ||
        a.length / ms.length > 1.3 ||
        Math.max(...v) / Math.min(...v) > 1.15 ||
        mdiff(ms[ms.length - 1], cmNow()) > 2
      )
        return null;
      const l = a
        .slice()
        .sort((p, q) => (p.date < q.date ? -1 : 1))
        .pop();
      return {
        k,
        desc: l.desc,
        value: l.value,
        n: ms.length,
        last: ms[ms.length - 1],
        cat: l.cat,
        day: +l.date.slice(8, 10),
        forma: l.forma,
        cartao: l.cartao,
      };
    })
    .filter(
      (s) =>
        s &&
        !(prefs.subIgnore || []).includes(s.k) &&
        !plans.some((p) => p.active && p.kind === 'r' && !p.inc && normKey(p.desc) === s.k)
    );
}

function anomalies() {
  const cm = cmNow(),
    out = [],
    by = new Map();
  /* uma passada só: para cada descrição, guarda a soma e a quantidade dos meses anteriores e os lançamentos por valor.
     (Antes, cada lançamento do mês era comparado com todos os outros: o tempo crescia com o quadrado da quantidade.) */
  data.forEach((y) => {
    if (y.inc) return;
    const k = normKey(y.desc);
    if (!k) return;
    let g = by.get(k);
    if (!g) by.set(k, (g = { n: 0, s: 0, v: new Map() }));
    if (mOf(y) < cm) {
      g.n++;
      g.s += y.value;
    }
    const l = g.v.get(y.value);
    l ? l.push(y) : g.v.set(y.value, [y]);
  });
  inMonth(cm).forEach((x) => {
    const k = normKey(x.desc);
    if (!k) return;
    const g = by.get(k);
    if (!g) return;
    if (g.n >= 3 && x.value >= 50) {
      const av = g.s / g.n;
      if (x.value >= av * 2.5)
        out.push('Valor acima do normal: ' + x.desc + ' (' + brl(x.value) + ', média ' + brl(av) + ').');
    }
    if (
      !x.kind &&
      (g.v.get(x.value) || []).some((y) => y.id < x.id && Math.abs(daysTo(y.date) - daysTo(x.date)) <= 3)
    )
      out.push('Possível cobrança duplicada: ' + x.desc + ' (' + brl(x.value) + ').');
  });
  return out;
}

function extraComp() {
  const pl = payList(),
    sb = subsDetect(),
    ri = plans.filter((p) => p.active && p.inc);
  const pr = (x) => {
    const n = daysTo(x.date),
      late = n < 0,
      att = late ? 'color:var(--bad)' : '';
    return (
      '<div class="rw"><div style="min-width:0"><div class="hx">' +
      esc(x.desc) +
      '</div><div class="mut" style="' +
      att +
      '">' +
      dueTxt(n) +
      ' · ' +
      x.date.split('-').reverse().slice(0, 2).join('/') +
      '</div></div><div style="display:flex;gap:10px;align-items:center"><span class="hp">' +
      brl(x.value) +
      '</span><button class="btn ghost sm" data-pay="' +
      x.t +
      ':' +
      x.id +
      '">Pagar</button></div></div>'
    );
  };
  let h =
    '<div class="card"><h2>Contas a pagar</h2>' +
    (pl.length
      ? pl.map(pr).join('') +
        '<div class="note">Total: ' +
        brl(sumV(pl)) +
        '. Inclui faturas dos cartões cadastrados.</div>'
      : '<div class="empty" style="padding:14px 0">Nada pendente. Marque "Conta a pagar" em Mais opções ao lançar, e cadastre seus cartões em Configurações.</div>') +
    '</div>';
  if (sb.length)
    h +=
      '<div class="card"><h2>Assinaturas detectadas</h2>' +
      sb
        .map(
          (s) =>
            '<div class="rw"><div style="min-width:0"><div class="hx">' +
            esc(s.desc) +
            '</div><div class="mut">em ' +
            s.n +
            ' meses · último ' +
            mfmt(s.last) +
            '</div></div><div style="display:flex;gap:8px;align-items:center"><span class="hp">' +
            brl(s.value) +
            '</span><button class="btn ghost sm" data-subok="' +
            esc(s.k) +
            '">Tornar recorrente</button><button class="lk" data-subno="' +
            esc(s.k) +
            '" style="font-size:12px">Ignorar</button></div></div>'
        )
        .join('') +
      '<div class="note">Total aproximado: ' +
      brl(sumV(sb)) +
      ' por mês.</div></div>';
  if (ri.length)
    h +=
      '<div class="card"><h2>Receitas recorrentes</h2>' +
      ri
        .map(
          (p) =>
            '<div class="cp"><div class="rw" style="border:0;padding:0"><div style="min-width:0"><div class="hx">' +
            esc(p.desc) +
            '</div><div class="mut">todo mês desde ' +
            mfmt(p.start.slice(0, 7)) +
            (p.end ? ' até ' + mfmt(p.end) : '') +
            '</div></div><div class="hp">' +
            brl(p.value) +
            '</div></div><details class="pd"><summary class="mut">Gerenciar</summary><div class="row" style="margin-top:8px"><input data-pvi="' +
            p.gid +
            '" inputmode="decimal" placeholder="Novo valor" style="width:130px"><button class="btn ghost sm" data-pvs="' +
            p.gid +
            '">Salvar valor</button><button class="btn ghost sm" data-pe="' +
            p.gid +
            '" style="color:var(--bad)">Encerrar</button></div></details></div>'
        )
        .join('') +
      '</div>';
  $('compBox').insertAdjacentHTML('afterbegin', h);
}

const rc0 = renderComp;

renderComp = function () {
  rc0();
  extraComp();
};

$('compBox').addEventListener('click', (e) => {
  const p = e.target.closest('[data-pay]'),
    ok = e.target.closest('[data-subok]'),
    no = e.target.closest('[data-subno]');
  if (p) {
    const [t, id] = p.dataset.pay.split(/:(.*)/s);
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
  if (ok) {
    const s = subsDetect().find((x) => x.k === ok.dataset.subok);
    if (s) {
      const m = addM(s.last, 1);
      plans.push({
        gid: uid(),
        kind: 'r',
        desc: s.desc,
        value: s.value,
        cat: s.cat,
        day: s.day,
        start: m + '-' + pad2(dayIn(m, s.day)),
        forma: s.forma,
        cartao: s.cartao,
        active: true,
        skip: [],
      });
      materialize();
      saveAll();
      render();
      toast('Agora "' + s.desc + '" entra sozinha todo mês.');
    }
  }
  if (no) {
    prefs.subIgnore = [...(prefs.subIgnore || []), no.dataset.subno];
    store('gastos:prefs', prefs);
    render();
  }
});
