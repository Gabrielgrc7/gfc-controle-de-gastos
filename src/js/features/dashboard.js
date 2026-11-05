/* features/dashboard.js
   Tela Início: totais, KPIs, avisos, insights, popups de categoria e receitas, primeiros passos e redesenho geral. */

function render0() {
  const m = mkey(),
    items = inMonth(m);
  const total = items.reduce((a, x) => a + x.value, 0);
  const [y, mo] = m.split('-').map(Number);
  const days = new Date(y, mo, 0).getDate();
  const isCur = m === iso(today).slice(0, 7);
  const elapsed = isCur ? today.getDate() : days;
  const by = Object.entries(items.reduce((a, x) => ((a[x.cat] = (a[x.cat] || 0) + x.value), a), {})).sort(
    (a, b) => b[1] - a[1]
  );
  $('kTotal').textContent = brl(total);
  /* mês em andamento: compara com o mesmo período do mês anterior (antes comparava com o mês inteiro) */
  const ptItems = inMonth(prevM(m)),
    pt = (isCur ? ptItems.filter((x) => +x.date.slice(8, 10) <= elapsed) : ptItems).reduce(
      (a, x) => a + x.value,
      0
    );
  /* nos primeiros dias do mês a comparação engana (poucas compras contra um mês inteiro de contas fixas): só aparece a partir do dia 10 */
  $('kDelta').textContent =
    pt && (!isCur || elapsed >= 10)
      ? (((total - pt) / pt) * 100 >= 0 ? '+' : '−') +
        Math.abs(((total - pt) / pt) * 100).toFixed(0) +
        (isCur ? '% vs mesmo período do mês anterior' : '% vs mês anterior')
      : '\u00a0';
  $('kCount').textContent = items.length;
  $('kAvgEntry').textContent = items.length ? 'Média ' + brl(total / items.length) : '\u00a0';
  $('kDay').textContent = items.length ? brl(total / elapsed) : '–';
  /* a projeção só faz sentido depois de alguns dias de dados */
  $('kProj').textContent =
    isCur && items.length
      ? elapsed >= 10
        ? 'Projeção ' + brl((total / elapsed) * days)
        : 'Projeção a partir do dia 10'
      : '\u00a0';
  $('kTop').textContent = by.length ? by[0][0] : '–';
  $('kTopV').textContent = by.length
    ? brl(by[0][1]) + ' (' + ((by[0][1] / total) * 100).toFixed(0) + '%)'
    : '\u00a0';
  $('pie').innerHTML = pie(by, total, items, m);

  const b = budgets[m];
  if (document.activeElement !== $('budget')) $('budget').value = b ? String(b).replace('.', ',') : '';
  const bar = $('bar');
  if (b) {
    const p = (total / b) * 100;
    bar.className = 'bar' + (p > 100 ? ' over' : '');
    bar.firstElementChild.style.width = Math.min(100, p) + '%';
    $('budNote').textContent =
      p > 100
        ? 'Limite excedido em ' + brl(total - b) + '.'
        : brl(total) + ' de ' + brl(b) + ' (' + p.toFixed(0) + '%). Restam ' + brl(b - total) + '.';
  } else {
    bar.className = 'bar';
    bar.firstElementChild.style.width = '0';
    $('budNote').textContent = 'Defina um limite para acompanhar quanto já foi usado.';
  }

  const dn = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
    dw = Array(7).fill(0);
  items.forEach((x) => {
    dw[new Date(x.date + 'T12:00:00').getDay()] += x.value;
  });
  const mx = Math.max(...dw, 1);
  $('dow').innerHTML = items.length
    ? dw
        .map(
          (v, i) =>
            `<div style="display:flex;align-items:center;gap:8px;font-size:12px;margin-bottom:5px"><span style="width:28px;color:var(--mute)">${dn[i]}</span><div style="flex:1;height:6px;background:var(--line);border-radius:3px;overflow:hidden"><i style="display:block;height:100%;width:${(v / mx) * 100}%;background:var(--ac)"></i></div><span style="min-width:80px;text-align:right;font-variant-numeric:tabular-nums">${brl(v)}</span></div>`
        )
        .join('')
    : '<div class="note">Sem dados.</div>';

  const q = $('q').value.trim().toLowerCase(),
    fc = $('fc').value;
  let list = items.filter((x) => (!fc || x.cat === fc) && (!q || hay(x).includes(q)));
  list.sort((a, b) => {
    const A = a[sort.k],
      B = b[sort.k];
    return (A > B ? 1 : A < B ? -1 : 0) * sort.d;
  });
  $('none').hidden = list.length > 0;
  $('rows').innerHTML = list
    .map((x) => {
      const on = mode === 'del' || mode === 'cat' ? sel.has(x.id) : mode === 'edit' && editing === x.id,
        d = x.date.split('-');
      return `<div class="hr${mode ? ' pk' : ''}${on ? ' sel' : ''}" data-r="${x.id}">${mode ? `<span class="bub${on ? ' on' : ''}"></span>` : ''}<div class="hd"><b>${d[2]}</b><span>${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][+d[1] - 1]}</span></div><div class="hm"><div class="hx">${esc(x.desc)}</div><div class="mut"><span class="dot" style="background:${col(x.cat)}"></span> ${x.cat}${badge(x)}</div></div><div class="hp">${brl(x.value)}</div></div>`;
    })
    .join('');
  $('thSel').hidden = !mode;
  modeUI();
}

function extra0() {
  const m = mkey(),
    items = inMonth(m),
    by = {};
  const ml = new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  $('mLabel').textContent = ml;
  $('bLabel').textContent = 'Limite de ' + ml;
  items.forEach((x) => (by[x.cat] = (by[x.cat] || 0) + x.value));
  const rc = items
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 3);
  $('recent').innerHTML = rc.length
    ? rc
        .map(
          (x) =>
            '<div class="rw"><div><div>' +
            esc(x.desc) +
            '</div><div class="mut">' +
            x.cat +
            ' · ' +
            x.date.split('-').reverse().slice(0, 2).join('/') +
            '</div></div><div>' +
            brl(x.value) +
            '</div></div>'
        )
        .join('')
    : '<div class="empty">Nenhum lançamento neste mês.<br><button class="btn" style="margin-top:12px" data-go="lancar">Adicionar lançamento</button></div>';
  $('catLim').innerHTML = CATS.map((c) => {
    const l = catlim[c] || 0,
      u = by[c] || 0;
    return (
      '<div class="cl"><div class="clh"><span>' +
      c +
      '</span><span class="mut">' +
      brl(u) +
      (l ? ' / ' + brl(l) : '') +
      '</span></div><input data-cl="' +
      c +
      '" inputmode="decimal" placeholder="Limite (opcional)" value="' +
      (l ? String(l).replace('.', ',') : '') +
      '"><div class="bar' +
      (l && u > l ? ' over' : '') +
      '"><i style="width:' +
      (l ? Math.min(100, (u / l) * 100) : 0) +
      '%"></i></div></div>'
    );
  }).join('');
  const L = visList();
  document
    .querySelectorAll('#chSeg button')
    .forEach((b) => b.classList.toggle('on', b.dataset.ch === chartT));
  {
    const cnt = {},
      fv = $('fc').value;
    items.forEach((x) => (cnt[x.cat] = (cnt[x.cat] || 0) + 1));
    $('fch').innerHTML =
      '<button class="chip' +
      (!fv ? ' on' : '') +
      '" data-fc="">Todas <span class="mut">' +
      items.length +
      '</span></button>' +
      CATS.filter((c) => cnt[c] || c === fv)
        .map(
          (c) =>
            '<button class="chip' +
            (fv === c ? ' on' : '') +
            '" data-fc="' +
            c +
            '"><span class="dot" style="background:' +
            col(c) +
            '"></span>' +
            c +
            ' <span class="mut">' +
            (cnt[c] || 0) +
            '</span></button>'
        )
        .join('');
  }
  $('mAll').hidden = mode !== 'del' && mode !== 'cat';
  $('mAll').textContent = L.length && L.every((x) => sel.has(x.id)) ? 'Limpar seleção' : 'Selecionar todos';
  $('listTot').hidden = !L.length;
  $('listN').textContent = L.length + (L.length === 1 ? ' lançamento' : ' lançamentos');
  $('listV').textContent = brl(L.reduce((a, x) => a + x.value, 0));
  $('chips').innerHTML = CATS.map(
    (c) =>
      '<button type="button" class="chip' +
      ($('fCat').value === c ? ' on' : '') +
      '" data-c="' +
      c +
      '">' +
      c +
      '</button>'
  ).join('');
}

function render() {
  render0();
  extra();
}

let cdCat = '';

function openCat(c) {
  cdCat = c;
  const L = inMonth(mkey())
    .filter((x) => x.cat === c)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  $('cdDot').style.background = col(c);
  $('cdT').textContent = c;
  $('cdSub').textContent =
    L.length +
    (L.length === 1 ? ' lançamento' : ' lançamentos') +
    ' · ' +
    brl(L.reduce((a, x) => a + x.value, 0)) +
    ' em ' +
    $('mLabel').textContent;
  $('cdList').innerHTML = L.length
    ? L.map(
        (x) =>
          '<div class="dr"><span><span class="mut">' +
          x.date.split('-').reverse().slice(0, 2).join('/') +
          '</span> · ' +
          esc(x.desc) +
          '</span><span>' +
          brl(x.value) +
          '</span></div>'
      ).join('')
    : '<div class="empty">Nenhum lançamento nesta categoria.</div>';
  $('cdlg').hidden = false;
  tipHide();
}

$('pie').addEventListener('click', (e) => {
  const t = e.target.closest('[data-cat]');
  if (t) openCat(t.dataset.cat);
});

$('cdClose').onclick = () => {
  $('cdlg').hidden = true;
};

$('cdlg').addEventListener('click', (e) => {
  if (e.target === $('cdlg')) $('cdlg').hidden = true;
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') $('cdlg').hidden = true;
});

function extra() {
  extra0();
  extra1();
}

function extra1() {
  $('chips').insertAdjacentHTML(
    'beforeend',
    '<button type="button" class="chip" id="chipNew">+ Nova categoria</button>'
  );
  const nr = inMonth(mkey()).filter((x) => x.cat === 'A revisar').length;
  $('revBan').hidden = !nr;
  $('revBanT').textContent =
    nr + (nr === 1 ? ' lançamento precisa' : ' lançamentos precisam') + ' de revisão de categoria neste mês';
  const cs = $('mCatSel'),
    v = cs.value;
  cs.innerHTML = CATS.map((c) => '<option>' + esc(c) + '</option>').join('') + newCatOpt;
  if (CATS.includes(v)) cs.value = v;
  $('catBar').hidden = mode !== 'cat';
  $('selBar').hidden = !mode;
  $('rows').classList.toggle('pk', !!mode);
  $('selN').textContent =
    mode === 'edit'
      ? 'Toque em um lançamento para editar'
      : sel.size + (sel.size === 1 ? ' selecionado' : ' selecionados');
  $('mCatGo').textContent = 'Aplicar a ' + sel.size;
  $('mCatGo').disabled = !sel.size;
  $('cardList').innerHTML = [
    ...new Set(
      data
        .map((x) => x.cartao)
        .concat(
          cards.map((c) => c.n),
          accts.map((a) => a.n)
        )
        .filter(Boolean)
    ),
  ]
    .map((c) => '<option value="' + esc(c) + '">')
    .join('');
  viewHooks();
}

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-openinc]')) openInc();
  if (e.target.closest('[data-newinc]')) {
    go('lancar');
    setTy('i');
  }
  if (e.target.closest('[data-gocomp]')) {
    go('lanc');
    seg('comp');
  }
  const o = e.target.closest('[data-open]');
  if (o) {
    go('config');
    cfgGo(o.dataset.open);
  }
});

let cdMode = 'cat';

function openInc() {
  cdMode = 'inc';
  const L = incMonth(mkey()).sort((a, b) => (a.date < b.date ? 1 : -1));
  $('cdDot').style.background = 'var(--logo)';
  $('cdT').textContent = 'Receitas';
  $('cdGo').textContent = 'Nova receita';
  $('cdSub').textContent =
    L.length +
    (L.length === 1 ? ' receita' : ' receitas') +
    ' · ' +
    brl(sumV(L)) +
    ' em ' +
    $('mLabel').textContent;
  $('cdList').innerHTML = L.length
    ? L.map(
        (x) =>
          '<div class="dr"><span><span class="mut">' +
          x.date.split('-').reverse().slice(0, 2).join('/') +
          '</span> · ' +
          esc(x.desc) +
          (x.kind === 'r' ? ' <span class="mut">· recorrente</span>' : '') +
          '</span><span>' +
          brl(x.value) +
          ' <button class="lk" data-ie="' +
          x.id +
          '" style="font-size:12px">Editar</button> <button class="lk" data-id="' +
          x.id +
          '" style="font-size:12px;color:var(--bad)">Apagar</button></span></div>'
      ).join('')
    : '<div class="empty">Nenhuma receita neste mês.</div>';
  $('cdlg').hidden = false;
  tipHide();
}

$('cdList').addEventListener('click', (e) => {
  const ed = e.target.closest('[data-ie]'),
    dl = e.target.closest('[data-id]');
  if (ed) {
    const x = data.find((i) => i.id === ed.dataset.ie);
    if (!x) return;
    $('cdlg').hidden = true;
    editing = x.id;
    $('fDesc').value = x.desc;
    $('fVal').value = String(x.value).replace('.', ',');
    $('fDate').value = x.date;
    fillForm(x);
    $('formTitle').textContent = 'Editar receita';
    $('save').textContent = 'Salvar';
    $('cancel').hidden = false;
    go('lancar');
  }
  if (dl) {
    dropEntries(new Set([dl.dataset.id]));
    $('cdlg').hidden = true;
    render();
    toast('Receita apagada.', 'Desfazer', undoLast);
  }
});

$('cdGo').onclick = () => {
  $('cdlg').hidden = true;
  if (cdMode === 'inc') {
    go('lancar');
    resetForm();
    setTy('i');
  } else {
    $('q').value = '';
    $('fc').value = cdCat;
    go('lista');
    render();
  }
};

const openCat0 = openCat;

openCat = function (c) {
  cdMode = 'cat';
  $('cdGo').textContent = 'Ver no histórico';
  openCat0(c);
};

function applyHide() {
  document.body.classList.toggle('hide', !!prefs.hide);
  $('eyeBtn').innerHTML = ico(prefs.hide ? 'eyeoff' : 'eye');
  $('eyeBtn').dataset.hint = prefs.hide ? 'Mostrar valores' : 'Ocultar valores';
}

/* ---- blocos do Início montados por código: cada função devolve o HTML de um bloco (vira o conteúdo de #w-<id>) ---- */

/* Receitas, despesas e saldo */
function wFluxo(m) {
  const ex = inMonth(m),
    inc = incMonth(m),
    r = sumV(inc),
    d = sumV(ex),
    sal = r - d;
  let h =
    '<div class="flow3"><div class="fl3" data-openinc="1" style="cursor:pointer"><span class="l">Receitas</span><b>' +
    brl(r) +
    '</b></div><div class="fl3"><span class="l">Despesas</span><b>' +
    brl(d) +
    '</b></div><div class="fl3"><span class="l">Saldo</span><b' +
    (sal < 0 ? ' class="neg"' : sal > 0 ? ' class="pos"' : '') +
    '>' +
    brl(sal) +
    '</b></div></div>' +
    '<div class="flowf mut"><span>' +
    (r > 0
      ? 'Você guardou ' + Math.round((sal / r) * 100) + '% do que entrou'
      : 'Nenhuma receita neste mês') +
    '</span><button class="lk" data-newinc="1">+ Receita</button></div>';
  return h;
}

/* Avisos: limite do mês, limite por categoria e contas que vencem */
function wAvisos(m) {
  const ex = inMonth(m),
    d = sumV(ex);
  let h = '';
  const al = [],
    lim = budgets[m];
  if (lim > 0) {
    const p = d / lim;
    if (p >= 1) al.push(['bad', 'Você passou do limite do mês em <b>' + brl(d - lim) + '</b>.']);
    else if (p >= 0.8)
      al.push(['warn', 'Você já usou <b>' + Math.round(p * 100) + '%</b> do limite do mês.']);
  }
  const by = {};
  ex.forEach((x) => (by[x.cat] = (by[x.cat] || 0) + x.value));
  Object.keys(catlim).forEach((c) => {
    const p = (by[c] || 0) / catlim[c];
    if (p >= 1)
      al.push(['bad', esc(c) + ' passou do limite (' + brl(by[c]) + ' de ' + brl(catlim[c]) + ').']);
    else if (p >= 0.8) al.push(['warn', esc(c) + ' chegou a <b>' + Math.round(p * 100) + '%</b> do limite.']);
  });
  const pl = payList().filter((x) => daysTo(x.date) <= 5);
  if (pl.length) {
    const late = pl.filter((x) => daysTo(x.date) < 0).length;
    al.push([
      late ? 'bad' : 'warn',
      '<b>' +
        pl.length +
        '</b>' +
        (pl.length === 1 ? ' conta ou fatura vence' : ' contas ou faturas vencem') +
        ' em até 5 dias' +
        (late ? ' (' + late + ' atrasada' + (late > 1 ? 's' : '') + ')' : '') +
        ' · ' +
        brl(sumV(pl)) +
        ' <button class="btn ghost sm" data-gocomp="1" style="margin-left:8px">Ver</button>',
    ]);
  }
  al.slice(0, 4).forEach((a) => (h += '<div class="ban ' + a[0] + '"><span>' + a[1] + '</span></div>'));
  return h;
}

/* Contas e saldos */
function wContas() {
  let h = '';
  if (accts.length)
    h +=
      '<div class="sec"><h3>Contas</h3><button class="lk" data-open="accts">Gerenciar</button></div><div class="card">' +
      accts
        .map(
          (a) =>
            '<div class="acrow"><span>' +
            esc(a.n) +
            '</span><b' +
            (acctBal(a) < 0 ? ' style="color:var(--bad)"' : '') +
            '>' +
            brl(acctBal(a)) +
            '</b></div>'
        )
        .join('') +
      '<div class="acrow"><span class="mut">Total</span><b>' +
      brl(accts.reduce((s, a) => s + acctBal(a), 0)) +
      '</b></div></div>';
  return h;
}

/* Para você ver: observações automáticas */
function wDicas(m) {
  const ex = inMonth(m),
    by = {};
  ex.forEach((x) => (by[x.cat] = (by[x.cat] || 0) + x.value));
  let h = '';
  const ins = [],
    pm = prevM(m),
    pe = inMonth(pm);
  if (pe.length) {
    const b = {};
    pe.forEach((x) => (b[x.cat] = (b[x.cat] || 0) + x.value));
    const up = Object.keys(by)
      .map((c) => [c, by[c] - (b[c] || 0), b[c] || 0])
      .filter((x) => x[1] >= 30 && x[2] > 0 && x[1] / x[2] >= 0.2)
      .sort((p, q) => q[1] - p[1])[0];
    if (up)
      ins.push(
        up[0] +
          ' subiu ' +
          Math.round((up[1] / up[2]) * 100) +
          '% (' +
          brl(up[1]) +
          ') em relação a ' +
          mfmt(pm) +
          '.'
      );
  }
  const sb = subsDetect();
  if (sb.length)
    ins.push(
      sb.length +
        (sb.length === 1 ? ' possível assinatura soma ' : ' possíveis assinaturas somam ') +
        brl(sumV(sb)) +
        ' por mês. Veja em Lançamentos, Compromissos.'
    );
  anomalies()
    .slice(0, 2)
    .forEach((t) => ins.push(t));
  if (ins.length)
    h +=
      '<div class="sec"><h3>Para você ver</h3></div><div class="card">' +
      ins
        .slice(0, 4)
        .map((t) => '<div class="rw" style="font-size:13.5px"><span>' + esc(t) + '</span></div>')
        .join('') +
      '</div>';
  return h;
}

/* Sonhos (metas de economia) */
function wSonhos() {
  let h = '';
  if (goals.length)
    h +=
      '<div class="sec"><h3>Sonhos</h3><button class="lk" data-open="goals">Ver todos</button></div><div class="card">' +
      goals
        .slice(0, 2)
        .map(
          (g) =>
            '<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:13.5px"><span>' +
            esc(g.n) +
            '</span><span class="mut">' +
            brl(g.g) +
            ' de ' +
            brl(g.a) +
            '</span></div><div class="bar" style="margin:8px 0 0"><i style="width:' +
            Math.min(100, (g.g / g.a) * 100) +
            '%"></i></div></div>'
        )
        .join('') +
      '</div>';
  return h;
}

/* Desenha os blocos que estão visíveis no Início (a escolha e a ordem vêm de home-layout.js) */
function renderIn() {
  const m = mkey();
  applyHome();
  Object.keys(HOME_BUILD).forEach((id) => {
    const el = $('w-' + id);
    if (el) el.innerHTML = homeOn(id) ? HOME_BUILD[id](m) : '';
  });
}

function renderOnb() {
  if (!cur || prefs.onbOff) {
    $('onb').innerHTML = '';
    return;
  }
  const st = [
    [data.length > 0, 'Faça seu primeiro lançamento', 'Registre um gasto ou uma receita.', 'new'],
    [
      Object.keys(budgets).length > 0,
      'Defina um limite para o mês',
      'Receba um aviso antes de estourar.',
      'metas',
    ],
    [
      cards.length > 0 || accts.length > 0,
      'Cadastre um cartão ou conta',
      'Para acompanhar faturas e saldos.',
      'cards',
    ],
  ];
  if (st.every((s) => s[0])) {
    prefs.onbOff = true;
    store('gastos:prefs', prefs);
    $('onb').innerHTML = '';
    return;
  }
  $('onb').innerHTML =
    '<div class="card onb"><div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0">Primeiros passos</h2><button class="lk" data-onboff="1" style="font-size:12px">Dispensar</button></div>' +
    st
      .map(
        (s) =>
          '<button class="onb-i' +
          (s[0] ? ' done' : '') +
          '" data-onb="' +
          s[3] +
          '"><span class="ck">' +
          (s[0] ? '✓' : '') +
          '</span><span><b>' +
          s[1] +
          '</b><span class="mut">' +
          s[2] +
          '</span></span></button>'
      )
      .join('') +
    '</div>';
}

document.addEventListener('click', (e) => {
  const o = e.target.closest('[data-onb]');
  if (o) {
    const k = o.dataset.onb;
    if (k === 'new') {
      resetForm();
      go('lancar');
    } else {
      go('config');
      cfgGo(k);
    }
  }
  if (e.target.closest('[data-onboff]')) {
    prefs.onbOff = true;
    store('gastos:prefs', prefs);
    renderOnb();
  }
});
