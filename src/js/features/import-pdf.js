/* features/import-pdf.js
   Importar fatura em PDF (Nubank e Nomad; o app reconhece a Nomad sozinho) e a tela de conferência. */

/* o leitor de PDF (1 MB) só é baixado quando a pessoa importa a primeira fatura; depois fica guardado para uso sem internet */
let pdfLoading = null;
function loadScript(src) {
  return new Promise((res, rej) => {
    const t = document.createElement('script');
    t.src = src;
    t.onload = res;
    t.onerror = () => rej(new Error('falha ao carregar ' + src));
    document.head.appendChild(t);
  });
}
function ensurePdf() {
  if (window.pdfjsLib) return Promise.resolve();
  return (
    pdfLoading ||
    (pdfLoading = loadScript('vendor/pdf.min.js')
      .then(() => loadScript('vendor/pdf.worker.min.js'))
      .catch((e) => {
        pdfLoading = null;
        throw e;
      }))
  );
}

const MES = {
  JAN: 1,
  FEV: 2,
  MAR: 3,
  ABR: 4,
  MAI: 5,
  JUN: 6,
  JUL: 7,
  AGO: 8,
  SET: 9,
  OUT: 10,
  NOV: 11,
  DEZ: 12,
};

const RX =
  /^(\d{2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(.*?)\s*([−–-])?R\$\s*([\d.]+,\d{2})$/i;

async function pdfLines(file, pw) {
  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    password: pw || undefined,
    isEvalSupported: false,
  }).promise;
  const out = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent(),
      rows = [];
    tc.items.forEach((it) => {
      if (!it.str.trim()) return;
      const y = Math.round(it.transform[5] / 3);
      let r = rows.find((r) => Math.abs(r.y - y) <= 1);
      if (!r) {
        r = { y, it: [] };
        rows.push(r);
      }
      r.it.push([it.transform[4], it.str]);
    });
    rows
      .sort((a, b) => b.y - a.y)
      .forEach((r) =>
        out.push(
          r.it
            .sort((a, b) => a[0] - b[0])
            .map((i) => i[1])
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim()
        )
      );
  }
  return out;
}

function parseNubank(L) {
  let yr = null,
    dm = null;
  for (const l of L) {
    const m = l.match(/(\d{2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(\d{4})/i);
    if (m) {
      dm = MES[m[2].toUpperCase()];
      yr = +m[3];
      break;
    }
  }
  if (!yr) throw new Error('Não encontrei a data da fatura. Confira se o banco escolhido está certo.');
  const fmKey = yr + '-' + String(dm).padStart(2, '0');
  let rows = [],
    tx = false,
    seenT = false,
    sub = null,
    pay = false;
  L.forEach((l, i) => {
    if (/^TRANSA/i.test(l)) seenT = true;
    if (/Pagamentos e Financiamentos/i.test(l)) pay = true;
    const m = l.match(RX);
    if (!m) {
      if (seenT && !tx && sub === null) {
        const s = l.match(/^[^\d].*?\s+R\$\s*([\d.]+,\d{2})$/);
        if (s) sub = num(s[1]);
      }
      return;
    }
    tx = true;
    const mo = MES[m[2].toUpperCase()],
      y = mo > dm ? yr - 1 : yr,
      date = y + '-' + String(mo).padStart(2, '0') + '-' + m[1];
    const desc = m[3].replace(/^[•·]{2,}\s*\d{4}\s+/, '').trim(),
      neg = !!m[4],
      v = num(m[5]);
    if (/^pagamento/i.test(desc) || (neg && pay)) return;
    if (pay) {
      const t = L.slice(i + 1, i + 4).join(' '),
        io = t.match(/([\d.]+,\d{2}) de IOF/),
        ju = t.match(/([\d.]+,\d{2}) de juros/);
      const ex = (io ? num(io[1]) : 0) + (ju ? num(ju[1]) : 0);
      if (ex > 0)
        rows.push({
          date,
          desc: 'IOF e juros (financiamento)',
          value: Math.round(ex * 100) / 100,
          cat: catByKey('Contas'),
          on: true,
          fin: true,
        });
      return;
    }
    {
      const pm = desc.match(/\s*-?\s*parcela\s+(\d+)\/(\d+)/i),
        base = desc.replace(/\s*-?\s*parcela\s+\d+\/\d+/i, '').trim();
      rows.push({
        date,
        desc,
        value: v,
        cat: ruleCat(base) || catByKey(catOf(base)),
        neg,
        on: true,
        fm: fmKey,
        forma: 'Cartão de crédito',
        cartao: 'Nubank',
        ...(pm
          ? {
              kind: 'p',
              pn: +pm[1],
              pt: +pm[2],
              gid: 'g' + hash32(base.toLowerCase() + '|' + v + '|' + pm[2]),
            }
          : {}),
      });
    }
  });
  rows
    .filter((r) => r.neg)
    .forEach((e) => {
      const base = e.desc.replace(/^estorno de\s+/i, '').toLowerCase();
      const p = rows.find((r) => !r.neg && !r.paired && r.value === e.value && r.desc.toLowerCase() === base);
      if (p) {
        p.paired = true;
        p.on = false;
        p.note = 'estornada';
      }
    });
  return { rows: rows.filter((r) => !r.neg), sub };
}

/* Nomad: cada compra vem numa linha "DD/MM/AAAA descrição [n/m] R$ valor".
   - parcelas trazem "n/m" e a data da compra original; o código "PARC=103" no começo da descrição é tirado;
   - a fatura é a do mês do vencimento (mesma regra dos cartões do app);
   - o "Saldo do período" é o total para conferir a soma; o IOF já vem dentro do valor de cada compra;
   - limite, fechamento e vencimento viram uma sugestão de cartão. Nome, CPF e número do cartão nunca são lidos. */
const isNomad = (L) => L.some((l) => /nomad\s+tecnologia|nomadglobal/i.test(l));

function parseNomad(L) {
  const RXN = /^(\d{2})\/(\d{2})\/(\d{4})\s+(.*?)\s+(?:(\d{1,2})\/(\d{1,2})\s+)?(-\s*)?R\$\s*([\d.]+,\d{2})$/;
  const dt = (re) => {
    for (const l of L) {
      const m = l.match(re);
      if (m) return m;
    }
    return null;
  };
  const due = dt(/^Vencimento\s+(\d{2})\/(\d{2})\/(\d{4})/i);
  if (!due) throw new Error('Não encontrei o vencimento da fatura. Confira se o banco escolhido está certo.');
  const fmKey = due[3] + '-' + due[2];
  const sm = dt(/^Saldo do per[ií]odo\s+R\$\s*([\d.]+,\d{2})$/i),
    sub = sm ? num(sm[1]) : null;
  const close = dt(/^Data de fechamento\s+(\d{2})\/\d{2}\/\d{4}/i);
  const li = L.findIndex((l) => /^.*Limite de cr[eé]dito/i.test(l)),
    lm = li >= 0 ? (L[li] + ' ' + (L[li + 1] || '')).match(/R\$\s*([\d.]+,\d{2})/) : null;
  const card =
    close && lm && num(lm[1]) > 0 ? { n: 'Nomad', lim: num(lm[1]), f: +close[1], v: +due[1] } : null;
  let rows = [],
    seenT = false;
  L.forEach((l) => {
    if (/^Transa..es do per.odo/i.test(l)) seenT = true;
    const m = seenT && l.match(RXN);
    if (!m) return;
    const date = m[3] + '-' + m[2] + '-' + m[1],
      neg = !!m[7],
      v = num(m[8]);
    let base = m[4]
      .replace(/^PARC=\d+\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!base || /^pagamento/i.test(base)) return;
    const pn = m[5] ? +m[5] : 0,
      pt = m[6] ? +m[6] : 0,
      inst = pt > 1 && pn >= 1 && pn <= pt;
    /* um "n/m" que não é parcela de verdade (ex.: 10/12 no nome da loja) volta para a descrição */
    if (m[5] && !inst && !(pn === 1 && pt === 1)) base += ' ' + m[5] + '/' + m[6];
    rows.push({
      date,
      desc: inst ? base + ' - Parcela ' + pn + '/' + pt : base,
      value: v,
      cat: ruleCat(base) || catByKey(catOf(base)),
      neg,
      on: true,
      fm: fmKey,
      forma: 'Cartão de crédito',
      cartao: 'Nomad',
      ...(inst ? { kind: 'p', pn, pt, gid: 'g' + hash32(base.toLowerCase() + '|' + v + '|' + pt) } : {}),
    });
  });
  rows
    .filter((r) => r.neg)
    .forEach((e) => {
      const base = e.desc.replace(/^estorno de\s+/i, '').toLowerCase();
      const p = rows.find((r) => !r.neg && !r.paired && r.value === e.value && r.desc.toLowerCase() === base);
      if (p) {
        p.paired = true;
        p.on = false;
        p.note = 'estornada';
      }
    });
  return { rows: rows.filter((r) => !r.neg), sub, card };
}

const BANKS = { nubank: { parse: parseNubank }, nomad: { parse: parseNomad, detect: isNomad } };

let imp = [],
  subInf = null,
  impCard = null;

const msg = (t) => {
  $('impMsg').textContent = t;
};

function revSum() {
  const on = imp.filter((r) => r.on);
  $('revSum').textContent = on.length + ' selecionados · ' + brl(on.reduce((a, r) => a + r.value, 0));
}

function drawRevRows() {
  $('revRows').innerHTML = imp
    .map(
      (x, i) =>
        '<tr><td><input type="checkbox" data-rc="' +
        i +
        '"' +
        (x.on ? ' checked' : '') +
        ' style="width:auto" aria-label="Incluir"></td><td>' +
        x.date.split('-').reverse().slice(0, 2).join('/') +
        '</td><td class="d"><input data-rd="' +
        i +
        '" value="' +
        esc(x.desc) +
        '"></td><td>' +
        (x.inc ? 'Receita' : '') +
        '<select data-rk="' +
        i +
        '"' +
        (x.inc ? ' hidden' : '') +
        '>' +
        CATS.map((c) => '<option' + (c === x.cat ? ' selected' : '') + '>' + esc(c) + '</option>').join('') +
        newCatOpt +
        '</select></td><td class="r">' +
        brl(x.value) +
        '</td><td style="color:var(--mute);font-size:12px">' +
        (x.pt ? 'Parcela ' + x.pn + '/' + x.pt + (x.note ? ' · ' : '') : '') +
        (x.note || '') +
        '</td></tr>'
    )
    .join('');
}

function showRev(r) {
  subInf = r.sub;
  impCard = r.card || null;
  imp = r.rows.map((x) => {
    if (x.cat0 === undefined) x.cat0 = x.cat;
    const dup = data.some(
      (d) =>
        !!d.inc === !!x.inc &&
        d.date.slice(0, 7) === x.date.slice(0, 7) &&
        Math.abs(d.value - x.value) < 0.005
    );
    if (dup && x.on) {
      x.on = false;
      x.note = 'possível duplicado';
    }
    return x;
  });
  const read = imp.filter((x) => !x.paired && !x.fin).reduce((a, x) => a + x.value, 0);
  $('revChk').textContent =
    'Conferência: lido ' +
    brl(read) +
    (subInf != null
      ? ' · fatura informa ' +
        brl(subInf) +
        (Math.abs(read - subInf) < 0.01 ? ' ✓' : ' (diferença, confira a lista)')
      : '') +
    (impCard && !cardOf(impCard.n)
      ? ' · O cartão ' +
        impCard.n +
        ' será cadastrado (limite ' +
        brl(impCard.lim) +
        ', fecha dia ' +
        impCard.f +
        ', vence dia ' +
        impCard.v +
        ').'
      : '');
  drawRevRows();
  $('rev').hidden = false;
  revSum();
}

$('revRows').addEventListener('change', (e) => {
  const t = e.target,
    g = (a) => t.getAttribute(a);
  if (g('data-rc') !== null) imp[+g('data-rc')].on = t.checked;
  else if (g('data-rd') !== null) imp[+g('data-rd')].desc = t.value;
  else if (g('data-rk') !== null) {
    const i = +g('data-rk');
    if (t.value === NEWCAT) {
      catQuick(
        (n) => {
          imp[i].cat = n;
          drawRevRows();
          revSum();
        },
        () => drawRevRows()
      );
      return;
    }
    imp[i].cat = t.value;
  }
  revSum();
});

$('revCancel').onclick = () => {
  $('rev').hidden = true;
  imp = [];
  impCard = null;
};

$('revAdd').onclick = () => {
  const sel = imp.filter((r) => r.on);
  if (!sel.length) {
    msg('Nenhum lançamento selecionado.');
    return;
  }
  learnFrom(sel);
  sel.forEach((r) =>
    data.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      desc: r.desc.trim() || r.cat,
      value: r.value,
      date: r.date,
      cat: r.cat,
      fm: r.fm,
      forma: r.forma,
      cartao: r.cartao,
      kind: r.kind,
      pn: r.pn,
      pt: r.pt,
      gid: r.gid,
      inc: r.inc,
    })
  );
  store('gastos:items', data);
  let extra = '';
  if (impCard && !cardOf(impCard.n) && sel.some((r) => r.cartao === impCard.n)) {
    cards.push({ id: uid(), n: impCard.n, lim: impCard.lim, f: impCard.f, v: impCard.v, paid: [] });
    store('gastos:cards', cards);
    extra = ' Cartão ' + impCard.n + ' cadastrado.';
  }
  /* abre o mês em que está a maior parte do que foi importado (parcelas antigas não puxam para um mês isolado) */
  const cnt = {};
  sel.forEach((r) => {
    const k = r.date.slice(0, 7);
    cnt[k] = (cnt[k] || 0) + 1;
  });
  $('month').value = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a] || (a < b ? 1 : -1))[0];
  $('rev').hidden = true;
  imp = [];
  impCard = null;
  render();
  msg(sel.length + ' lançamentos adicionados.' + extra);
};

$('read').onclick = async () => {
  const f = $('pdf').files[0],
    m = $('impMsg');
  const say = (t, bad) => {
    m.textContent = t;
    m.style.color = bad ? 'var(--bad)' : 'var(--mute)';
  };
  if (!f) {
    say('Escolha o arquivo PDF da fatura.', 1);
    return;
  }
  try {
    await ensurePdf();
  } catch (e) {
    say('O leitor de PDF não foi carregado. Confira a internet na primeira vez e tente de novo.', 1);
    return;
  }
  $('read').disabled = true;
  say('Lendo a fatura…');
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsLib.GlobalWorkerOptions.workerSrc || 'pdf.worker.js';
    const L = await pdfLines(f, $('pw').value);
    if (!L.some((l) => l.trim()))
      throw new Error(
        'Este PDF não tem texto selecionável (parece uma imagem). Baixe a fatura em PDF direto do app do banco.'
      );
    let bank = $('bank').value;
    const auto = bank !== 'nomad' && BANKS.nomad.detect(L);
    if (auto) {
      bank = 'nomad';
      $('bank').value = 'nomad';
    }
    const r = BANKS[bank].parse(L);
    if (!r.rows.length)
      throw new Error('Nenhuma compra encontrada. Confira se o banco escolhido corresponde à fatura.');
    showRev(r);
    say((auto ? 'Fatura da Nomad reconhecida. ' : '') + 'Fatura lida. Revise os lançamentos abaixo.');
  } catch (e) {
    say(
      e && e.name === 'PasswordException'
        ? e.code === 2
          ? 'Senha incorreta. Tente de novo.'
          : 'Este PDF tem senha. Informe a senha e leia novamente.'
        : (e && e.message) || 'Não foi possível ler este PDF.',
      1
    );
  } finally {
    $('read').disabled = false;
  }
};

$('revSelAll').onclick = () => setAll(true);

$('revNone').onclick = () => setAll(false);
