/* features/assistant-parser.js
   Assistente: entende frases em português e responde perguntas (roda no aparelho; ponto de troca por outra IA: AI.interpret). */

const aiStop = new Set(
  'a o as os um uma uns umas no na nos nas em de do da dos das com para pra pro por ao aos que e foi fui deu dei era hoje ontem anteontem amanha dia mes meu minha meus minhas la ali'.split(
    ' '
  )
);

const aiVerb = new Set(
  'gastei gastou paguei pagou pago comprei compramos comprou recebi ganhei coloquei lancei adicione adicionar adiciona registre registrar anota anotar anote lanca lance fiz cobraram cobrou saiu entrou caiu depositaram vou preciso tenho pagar vence vencimento custou valor reais real'.split(
    ' '
  )
);

const aiPay = new Set(
  'credito debito pix dinheiro cartao boleto parcelado parcelei parcela parcelas vezes vez mensal mensalmente assinatura mensalidade todo'.split(
    ' '
  )
);

const aiWd = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

function aiNum(s) {
  s = String(s).trim();
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return parseFloat(s.replace(/\./g, '').replace(',', '.'));
  if (/^\d+,\d+$/.test(s)) return parseFloat(s.replace(',', '.'));
  if (/^\d+\.\d{1,2}$/.test(s)) return parseFloat(s);
  if (/^\d+\.\d{3}$/.test(s)) return parseFloat(s.replace('.', ''));
  return parseFloat(s);
}

const aiIso = (d) => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());

const aiShift = (now, n) => {
  const d = new Date(now.getTime());
  d.setDate(d.getDate() + n);
  return d;
};

function aiDate(w, now) {
  let m,
    date = null,
    rec = 0;
  if ((m = w.match(/\btodo\s+dia\s+(\d{1,2})\b/i))) {
    rec = +m[1];
    w = w.replace(m[0], ' ');
  }
  if ((m = w.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
    const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : now.getFullYear();
    if (+m[2] >= 1 && +m[2] <= 12 && +m[1] >= 1 && +m[1] <= 31) {
      date = y + '-' + pad2(+m[2]) + '-' + pad2(+m[1]);
    }
    w = w.replace(m[0], ' ');
  } else if ((m = w.match(/\bdia\s+(\d{1,2})\b/i))) {
    if (+m[1] >= 1 && +m[1] <= 31) {
      const mm = aiIso(now).slice(0, 7);
      date = mm + '-' + pad2(dayIn(mm, +m[1]));
    }
    w = w.replace(m[0], ' ');
  } else if ((m = w.match(/\banteontem\b/i))) {
    date = aiIso(aiShift(now, -2));
    w = w.replace(m[0], ' ');
  } else if ((m = w.match(/\bontem\b/i))) {
    date = aiIso(aiShift(now, -1));
    w = w.replace(m[0], ' ');
  } else if ((m = w.match(/\bamanh[aã](?![a-z])/i))) {
    date = aiIso(aiShift(now, 1));
    w = w.replace(m[0], ' ');
  } else if ((m = w.match(/\bhoje\b/i))) {
    date = aiIso(now);
    w = w.replace(m[0], ' ');
  } else if ((m = w.match(/\bsemana\s+passada\b/i))) {
    date = aiIso(aiShift(now, -7));
    w = w.replace(m[0], ' ');
  } else if ((m = w.match(/\b(domingo|segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado)(?:-feira)?\b/i))) {
    const k = aiWd.indexOf(nz(m[1]));
    let back = (now.getDay() - k + 7) % 7;
    if (back === 0) back = 7;
    date = aiIso(aiShift(now, -back));
    w = w.replace(m[0], ' ');
  }
  return { w, date, rec };
}

function aiDraft(raw, now, opt) {
  opt = opt || {};
  let w = ' ' + raw.trim() + ' ',
    pt = 0,
    pn = 1,
    per = false,
    m;
  if ((m = w.match(/\bparcela\s+(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})\b/i))) {
    pn = +m[1];
    pt = +m[2];
    per = true;
    w = w.replace(m[0], ' ');
  } else if ((m = w.match(/\b(\d{1,2})\s*x\s*(?:de\s+)?(?=(?:r\$\s*)?\d)/i))) {
    pt = +m[1];
    per = true;
    w = w.replace(m[0], ' ');
  } else if ((m = w.match(/\b(?:em\s+)?(\d{1,2})\s*(?:x|vezes|parcelas?)\b/i))) {
    pt = +m[1];
    w = w.replace(m[0], ' ');
  }
  let rec = false;
  if ((m = w.match(/\b(todo\s+m[eê]s|mensal(?:mente)?|assinatura|mensalidade)\b/i))) {
    rec = true;
    w = w.replace(m[0], ' ');
  }
  const dd = aiDate(w, now);
  w = dd.w;
  if (dd.rec) rec = true;
  let forma, cartao;
  const nw = nz(w);
  if (/\bcredito\b/.test(nw)) forma = 'Cartão de crédito';
  else if (/\bdebito\b/.test(nw)) forma = 'Cartão de débito';
  else if (/\bpix\b/.test(nw) && !/pix recebido/.test(nw)) forma = 'Pix';
  else if (/\bdinheiro\b/.test(nw)) forma = 'Dinheiro';
  else if (/\bboleto\b/.test(nw)) forma = 'Boleto / débito automático';
  const named = cards
    .map((c) => [c.n, 'card'])
    .concat(accts.map((a) => [a.n, 'acct']))
    .filter((x) =>
      new RegExp('(^|[^a-z0-9])' + nz(x[0]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z0-9])').test(nw)
    )[0];
  if (named) {
    cartao = named[0];
    if (named[1] === 'card' && !forma) forma = 'Cartão de crédito';
  }
  /* valor */
  const cands = [];
  const re = /(r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(\s*(?:mil|k)\b)?/gi;
  while ((m = re.exec(w))) {
    let v = aiNum(m[2]);
    if (m[3]) v *= 1000;
    if (!isFinite(v) || v <= 0) continue;
    const before = w.slice(Math.max(0, m.index - 14), m.index);
    let sc = 0;
    if (m[1]) sc += 3;
    if (/(por|de|custou|foi|gastei|paguei|recebi|valor)\s*$/i.test(before)) sc += 1;
    if (/[.,]\d{1,2}$/.test(m[2])) sc += 1;
    cands.push({ v, sc, i: m.index, len: m[0].length });
  }
  if (!cands.length) return { err: 'valor' };
  cands.sort((a, b) => b.sc - a.sc || b.v - a.v);
  const c = cands[0];
  let value = c.v;
  if (value >= 1e9) return { err: 'valor' };
  w = w.slice(0, c.i) + ' ' + w.slice(c.i + c.len);
  if (pt) {
    if (pt < 2 || pt > 120) pt = 0;
    else if (!per) value = Math.round((value / pt) * 100) / 100;
  }
  const nt = nz(raw);
  const inc =
    /\b(recebi|ganhei|entrou|entrada|depositaram|depositou|caiu|salario|freela|freelance|renda|reembolso|rendimento|dividendos|pix recebido|vendi)\b/.test(
      nt
    );
  let bill = /\b(vence|vencimento|vou pagar|preciso pagar|tenho que pagar|a pagar|pendente|pagar dia)\b/.test(
    nt
  );
  let date = dd.date || opt.date || aiIso(now);
  if (dd.date && dd.date > aiIso(now) && !inc) bill = true;
  if (inc) bill = false;
  if (dd.rec && !dd.date) {
    const mm = aiIso(now).slice(0, 7);
    date = mm + '-' + pad2(dayIn(mm, dd.rec));
  }
  /* descrição */
  const toks = w
    .replace(/r\$/gi, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => {
      const z = nz(t).replace(/[^a-z0-9]/g, '');
      if (!z) return false;
      if (/^\d+$/.test(z)) return false;
      return (
        !aiStop.has(z) && !aiVerb.has(z) && !aiPay.has(z) && !(cartao && nz(cartao).split(/\s+/).includes(z))
      );
    });
  let desc = toks
    .join(' ')
    .replace(/[.,;:!?]+$/g, '')
    .trim()
    .slice(0, 60);
  /* categoria */
  const nd = nz(raw);
  let cat = null,
    best = 0;
  CATS.forEach((k) => {
    const z = nz(k);
    if (
      z.length >= 4 &&
      z !== 'outros' &&
      z !== 'a revisar' &&
      new RegExp('(^|[^a-z])' + z.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z])').test(nd) &&
      z.length > best
    ) {
      cat = k;
      best = z.length;
    }
  });
  if (!cat && !inc) {
    cat = ruleCat(desc) || catByKey(catOf(desc));
    if (cat === 'A revisar') cat = 'Outros';
  }
  if (inc) cat = 'Receita';
  if (!desc) desc = inc ? 'Receita' : cat && cat !== 'Outros' ? cat : 'Gasto';
  desc = desc.charAt(0).toUpperCase() + desc.slice(1);
  let kind = 'v';
  if (pt) kind = 'p';
  else if (rec) kind = 'r';
  return {
    kind,
    inc,
    bill,
    desc,
    value: Math.round(value * 100) / 100,
    date,
    cat,
    forma,
    cartao,
    pn: kind === 'p' ? pn : undefined,
    pt: kind === 'p' ? pt : undefined,
  };
}

function aiSplit(t) {
  const parts = t
    .split(/\s*;\s*|\n+|\s+e\s+(?=[^0-9]*\d)/i)
    .map((s) => s.trim())
    .filter(Boolean);
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    let p = parts[i];
    while (!/\d/.test(p) && i + 1 < parts.length) {
      i++;
      p += ' e ' + parts[i];
    }
    out.push(p);
  }
  return out;
}

function aiPeriod(nt, now) {
  const td = aiIso(now),
    ym = td.slice(0, 7);
  let m;
  if ((m = nt.match(/\bdia\s+(\d{1,2})\b/)) && +m[1] >= 1 && +m[1] <= 31) {
    const d = ym + '-' + pad2(dayIn(ym, +m[1]));
    return { f: d, t: d, label: 'no dia ' + +m[1] + '/' + ym.slice(5, 7) };
  }
  if (/\bhoje\b/.test(nt)) return { f: td, t: td, label: 'hoje' };
  if (/\banteontem\b/.test(nt)) {
    const d = aiIso(aiShift(now, -2));
    return { f: d, t: d, label: 'anteontem' };
  }
  if (/\bontem\b/.test(nt)) {
    const d = aiIso(aiShift(now, -1));
    return { f: d, t: d, label: 'ontem' };
  }
  if (/\b(esta|essa|nesta|nessa|na)\s+semana\b|\bultimos 7 dias\b/.test(nt))
    return { f: aiIso(aiShift(now, -6)), t: td, label: 'nos últimos 7 dias' };
  if (/\bmes passado\b|\bmes anterior\b/.test(nt)) {
    const p = addM(ym, -1);
    return { f: p + '-01', t: p + '-' + pad2(dayIn(p, 31)), label: 'em ' + mfmt(p) };
  }
  if (/\b(este|esse|neste|nesse|no)\s+ano\b|\bem\s+\d{4}\b/.test(nt)) {
    const y = (nt.match(/\bem\s+(\d{4})\b/) || [])[1] || ym.slice(0, 4);
    return { f: y + '-01-01', t: y + '-12-31', label: 'em ' + y };
  }
  const mn = [
    'janeiro',
    'fevereiro',
    'marco',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];
  for (let i = 0; i < 12; i++) {
    if (
      new RegExp('\\bem\\s+' + mn[i] + '\\b').test(nt) ||
      new RegExp('\\bde\\s+' + mn[i] + '\\b').test(nt)
    ) {
      let y = +ym.slice(0, 4);
      if (i + 1 > +ym.slice(5, 7)) y--;
      const p = y + '-' + pad2(i + 1);
      return { f: p + '-01', t: p + '-' + pad2(dayIn(p, 31)), label: 'em ' + mfmt(p) };
    }
  }
  if (/\b(tudo|total geral|desde o inicio|sempre)\b/.test(nt))
    return { f: '0000-01-01', t: '9999-12-31', label: 'no total' };
  return { f: ym + '-01', t: ym + '-' + pad2(dayIn(ym, 31)), label: 'neste mês (' + mfmt(ym) + ')' };
}

function aiTerm(nt) {
  let found = null,
    best = 0;
  CATS.forEach((k) => {
    const z = nz(k);
    if (
      z.length >= 3 &&
      new RegExp('(^|[^a-z])' + z.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z])').test(nt) &&
      z.length > best
    ) {
      found = { cat: k };
      best = z.length;
    }
  });
  if (found) return found;
  const m = nt.match(/\b(?:com|em|no|na|de|do|da|pra|para)\s+([a-z0-9]{3,}(?:\s+[a-z0-9]{3,})?)/g);
  if (m) {
    for (const s of m) {
      const t = s
        .replace(/^\w+\s+/, '')
        .split(/\s+/)
        .filter(
          (x) =>
            !aiStop.has(x) &&
            !/^(este|esse|neste|nesse|mes|ano|semana|hoje|ontem|passado|passada|janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|total|geral|ultimos|dias|gastei|gasto|gastos|recebi|despesas|despesa|lancamentos|contas|conta)$/.test(
              x
            )
        )
        .join(' ');
      if (t && !/^\d+$/.test(t)) return { text: t };
    }
  }
  return null;
}

function aiAnswer(raw, now) {
  now = now || new Date(iso(today) + 'T12:00:00');
  const nt = nz(raw),
    per = aiPeriod(nt, now),
    term = aiTerm(nt);
  const inPer = (x) => x.date >= per.f && x.date <= per.t,
    hit = (x) =>
      !term ||
      (term.cat ? x.cat === term.cat : nz(x.desc + ' ' + x.cat + ' ' + (x.tag || '')).includes(term.text));
  const list = (a) =>
    a
      .slice(0, 5)
      .map(
        (x) =>
          '• ' +
          x.desc +
          ' — ' +
          brl(x.value) +
          ' (' +
          x.date.split('-').reverse().slice(0, 2).join('/') +
          ')'
      )
      .join('\n');
  const lbl = term ? term.cat || term.text : '';
  if (
    /comprometid|renda.*(recorrent|parcela|fixo)|(recorrent|parcela|fixo).*renda|quanto do (meu )?salario/.test(
      nt
    )
  )
    return commitAnswer();
  if (/\b(vence|vencem|vencimento|vencimentos|a pagar|pendente|pendentes|atrasad|contas a pagar)/.test(nt)) {
    let pl = payList(),
      lim = null;
    if (/\bhoje\b/.test(nt)) lim = 0;
    else if (/\bamanha\b/.test(nt)) lim = 1;
    else if (/\bsemana\b/.test(nt)) lim = 7;
    else if (/\b(este|esse|neste|nesse) mes\b/.test(nt)) lim = 31;
    if (/atrasad/.test(nt)) pl = pl.filter((x) => daysTo(x.date) < 0);
    else if (lim != null) pl = pl.filter((x) => daysTo(x.date) <= lim);
    if (!pl.length) return 'Não encontrei contas a pagar nesse período. 🎉';
    return (
      'Você tem ' +
      pl.length +
      (pl.length === 1 ? ' item' : ' itens') +
      ' a pagar (' +
      brl(sumV(pl)) +
      '):\n' +
      pl
        .slice(0, 6)
        .map((x) => '• ' + x.desc + ' — ' + brl(x.value) + ' · ' + dueTxt(daysTo(x.date)))
        .join('\n')
    );
  }
  if (/\bfatura\b/.test(nt)) {
    const cs = cards.filter((c) => !/\bnubank|itau|bradesco|inter|c6\b/.test(nt) || nt.includes(nz(c.n)));
    if (!cs.length)
      return 'Você ainda não cadastrou cartões. Em Mais, Cartões e faturas, informe limite, fechamento e vencimento.';
    return cs
      .map((c) => {
        const iv = invoices(c);
        return (
          c.n +
          ': ' +
          (iv.length
            ? iv
                .map(
                  ([m, v]) => 'fatura ' + mfmt(m) + ' ' + brl(v) + ' (' + dueTxt(daysTo(dueOf(m, c))) + ')'
                )
                .join('; ')
            : 'sem fatura em aberto.')
        );
      })
      .join('\n');
  }
  if (/\b(sonho|sonhos|meta de economia|objetivo)\b/.test(nt)) {
    if (!goals.length) return 'Você ainda não criou sonhos. Em Mais, Sonhos, defina uma meta de economia.';
    return goals
      .map(
        (g) =>
          g.n +
          ': ' +
          brl(g.g) +
          ' de ' +
          brl(g.a) +
          ' (' +
          Math.round((g.g / g.a) * 100) +
          '%) — faltam ' +
          brl(Math.max(0, g.a - g.g))
      )
      .join('\n');
  }
  if (/\blimite\b/.test(nt)) {
    const m = aiIso(now).slice(0, 7),
      lim = budgets[m],
      d = sumV(inMonth(m));
    if (!lim) return 'Você não definiu limite para ' + mfmt(m) + '. Defina em Mais, Metas.';
    return (
      'Limite de ' +
      mfmt(m) +
      ': ' +
      brl(lim) +
      '. Já gastou ' +
      brl(d) +
      ' (' +
      Math.round((d / lim) * 100) +
      '%). ' +
      (d > lim ? 'Passou ' + brl(d - lim) + '.' : 'Restam ' + brl(lim - d) + '.')
    );
  }
  if ((/\bsaldo\b/.test(nt) && !/\bconta\b/.test(nt)) || /\bsobrou\b|\bsobra\b/.test(nt)) {
    const ym = per.f.slice(0, 7),
      r = sumV(data.filter((x) => x.inc && inPer(x))),
      d = sumV(data.filter((x) => !x.inc && inPer(x)));
    return 'Saldo ' + per.label + ': ' + brl(r - d) + '\nReceitas ' + brl(r) + ' − despesas ' + brl(d) + '.';
  }
  if (/\b(recebi|recebeu|receita|receitas|entrou|entradas)\b/.test(nt)) {
    const a = data.filter((x) => x.inc && inPer(x) && hit(x));
    return (
      'Você recebeu ' +
      brl(sumV(a)) +
      ' ' +
      per.label +
      (lbl ? ' (' + lbl + ')' : '') +
      ' em ' +
      a.length +
      (a.length === 1 ? ' lançamento' : ' lançamentos') +
      '.' +
      (a.length ? '\n' + list(a.sort((p, q) => q.value - p.value)) : '')
    );
  }
  if (/\b(maior|maiores)\b/.test(nt)) {
    const a = data.filter((x) => !x.inc && inPer(x) && hit(x)).sort((p, q) => q.value - p.value);
    if (!a.length) return 'Não encontrei despesas ' + per.label + '.';
    return 'Maiores despesas ' + per.label + ':\n' + list(a);
  }
  if (/\bresumo\b|\bcomo estou\b|\bcomo ta\b/.test(nt)) {
    const a = data.filter((x) => !x.inc && inPer(x)),
      r = sumV(data.filter((x) => x.inc && inPer(x))),
      by = {};
    a.forEach((x) => (by[x.cat] = (by[x.cat] || 0) + x.value));
    const top = Object.entries(by)
      .sort((p, q) => q[1] - p[1])
      .slice(0, 3);
    return (
      'Resumo ' +
      per.label +
      ':\nDespesas ' +
      brl(sumV(a)) +
      ' em ' +
      a.length +
      ' lançamentos\nReceitas ' +
      brl(r) +
      '\nSaldo ' +
      brl(r - sumV(a)) +
      (top.length ? '\nMais gastou com: ' + top.map(([c, v]) => c + ' (' + brl(v) + ')').join(', ') : '')
    );
  }
  if (/\b(quanto|quantos|quantas|total|gastos?|gastei|despesas?|lancamentos)\b/.test(nt)) {
    const a = data.filter((x) => !x.inc && inPer(x) && hit(x));
    if (/\bquantos\b/.test(nt))
      return (
        'Foram ' +
        a.length +
        (a.length === 1 ? ' lançamento' : ' lançamentos') +
        (lbl ? ' de ' + lbl : '') +
        ' ' +
        per.label +
        '.'
      );
    return (
      'Você gastou ' +
      brl(sumV(a)) +
      ' ' +
      per.label +
      (lbl ? ' com ' + lbl : '') +
      ' em ' +
      a.length +
      (a.length === 1 ? ' lançamento' : ' lançamentos') +
      '.' +
      (a.length ? '\n' + list(a.sort((p, q) => q.value - p.value).slice(0, 3)) : '')
    );
  }
  return null;
}

function aiInterpret(raw, now) {
  now = now || new Date(iso(today) + 'T12:00:00');
  const t = String(raw || '').trim(),
    nt = nz(t);
  if (!t) return { type: 'empty' };
  if (/^(ajuda|help|o que (voce|vc) faz|como funciona|comandos|socorro)/.test(nt)) return { type: 'help' };
  if (/^(desfaz|desfazer|volta|voltar)\b/.test(nt)) return { type: 'undo' };
  if (/^(apaga|apagar|exclui|excluir|remove|remover)\s+(o\s+|a\s+)?(ultimo|ultima)/.test(nt))
    return { type: 'delete_last' };
  if (!/\d/.test(t)) {
    if (/^(paguei|pago|quitei)\b/.test(nt)) return { type: 'pay', text: t };
    const a0 = aiAnswer(t, now);
    return a0 ? { type: 'answer', text: a0 } : { type: 'unknown' };
  }
  const q =
    /^(quanto|qual|quais|quantos|quantas|o que|oque|me mostra|mostre|mostra|resumo|saldo|total|lista|listar)\b/.test(
      nt
    ) || /\?\s*$/.test(t);
  const hasVerb =
    /\b(gastei|paguei|comprei|recebi|ganhei|lancei|anota|anotar|registre|registrar|adicione|adicionar|coloca|coloque)\b/.test(
      nt
    );
  if (!q || (hasVerb && !/^(quanto|qual|quais|quantos)/.test(nt))) {
    if (/^(paguei|pago|quitei)\b/.test(nt) && !/\d/.test(nt)) {
      return { type: 'pay', text: t };
    }
    const parts = aiSplit(t),
      ds = [],
      errs = [],
      dates = parts.map((p) => aiDate(' ' + p + ' ', now).date).filter(Boolean),
      shared = dates.length === 1 && parts.length > 1 ? dates[0] : null;
    parts.forEach((p) => {
      const d = aiDraft(p, now, { date: shared || undefined });
      if (d.err) errs.push(p);
      else ds.push(d);
    });
    if (ds.length) return { type: 'drafts', drafts: ds, skipped: errs };
    if (!q) return { type: 'unknown', reason: 'valor' };
  }
  const a = aiAnswer(t, now);
  return a ? { type: 'answer', text: a } : { type: 'unknown' };
}

const AI = { interpret: async (t) => aiInterpret(t) };
