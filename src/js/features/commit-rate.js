/* features/commit-rate.js
   Renda comprometida: quanto da renda do mês já está tomado por despesas recorrentes e por parcelas (e quanto sobra),
   mais os próximos meses. Aparece na tela Início e responde no assistente ("quanto da minha renda está comprometida?"). */

const MABBR = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const pctOf = (x, base) => (base > 0 ? Math.round((x / base) * 100) : 0);

/* Renda de um mês: o que entrou ou está previsto no mês. Sem isso, o salário recorrente. Sem isso, a média dos últimos meses. */
function incomeBase(m) {
  const real = sumV(incMonth(m));
  if (real > 0) return { v: real, src: 'real' };
  const rec = plans
    .filter((p) => p.active && p.inc && p.kind === 'r' && p.start.slice(0, 7) <= m && (!p.end || m <= p.end))
    .reduce((a, p) => a + p.value, 0);
  if (rec > 0) return { v: rec, src: 'recorrente' };
  const vals = [1, 2, 3, 4, 5, 6]
    .map((i) => sumV(incMonth(addM(m, -i))))
    .filter((v) => v > 0)
    .slice(0, 3);
  if (vals.length) return { v: vals.reduce((a, b) => a + b, 0) / vals.length, src: 'média' };
  return { v: 0, src: null };
}

/* Os números de um mês: renda, recorrentes, parcelas e demais gastos.
   Mês atual e passados vêm dos lançamentos; meses futuros, dos planos (só recorrentes e parcelas são conhecidos). */
function commitMonth(m) {
  const cm = cmNow(),
    inc = incomeBase(m);
  let rec, inst, vari;
  if (m <= cm) {
    const ex = inMonth(m);
    rec = sumV(ex.filter((x) => x.kind === 'r'));
    inst = sumV(ex.filter((x) => x.kind === 'p'));
    vari = sumV(ex) - rec - inst;
  } else {
    const f = commitForecast(cm, Math.min(mdiff(cm, m), 60)).pop();
    rec = f.rec;
    inst = f.inst;
    vari = 0;
  }
  return {
    m,
    inc: inc.v,
    src: inc.src,
    rec,
    inst,
    vari: Math.max(0, vari),
    tot: rec + inst + Math.max(0, vari),
  };
}

const cmSrcTxt = (c) =>
  c.src === 'real'
    ? 'Renda do mês: '
    : c.src === 'recorrente'
      ? 'Renda prevista (salário recorrente): '
      : 'Renda estimada pela média dos últimos meses: ';

function commitCardHTML(m) {
  const c = commitMonth(m);
  let h = '<div class="sec"><h3>Renda comprometida</h3></div><div class="card cmc">';
  if (!(c.inc > 0))
    return (
      h +
      '<div class="mut">Cadastre sua renda (ou um salário recorrente) para ver quanto dela já está comprometida com despesas recorrentes e parcelas.</div><div class="row" style="margin-top:10px"><button class="btn ghost sm" data-newinc="1">+ Receita</button></div></div>'
    );
  const fixed = c.rec + c.inst,
    scale = Math.max(c.inc, c.tot),
    left = c.inc - c.tot,
    w = (x) => ((x / scale) * 100).toFixed(2) + '%',
    leg = (cls, nome, v, neg) =>
      '<div class="cml"><span class="dot ' +
      cls +
      '"></span><span class="cmn">' +
      nome +
      '</span><b>' +
      (neg ? '−' : '') +
      pctOf(v, c.inc) +
      '%</b><span class="cmv">' +
      brl(v) +
      '</span></div>';
  h += fixed
    ? '<div class="cmh"><b class="' +
      (pctOf(fixed, c.inc) >= 70 ? 'bd' : pctOf(fixed, c.inc) >= 50 ? 'wr' : '') +
      '">' +
      pctOf(c.rec, c.inc) +
      '%</b> da sua renda vai para despesas recorrentes</div><div class="mut cmv2">' +
      brl(c.rec) +
      ' de ' +
      brl(c.inc) +
      (c.inst
        ? ' · mais ' +
          pctOf(c.inst, c.inc) +
          '% em parcelas: juntos, <b>' +
          pctOf(fixed, c.inc) +
          '%</b> já estão comprometidos'
        : '') +
      '</div>'
    : '<div class="cmh">Nenhuma despesa recorrente ou parcela em ' + mfmt(m) + '.</div>';
  h +=
    '<div class="cmb" role="img" aria-label="Divisão da renda: ' +
    pctOf(c.rec, c.inc) +
    '% recorrentes, ' +
    pctOf(c.inst, c.inc) +
    '% parcelas, ' +
    pctOf(c.vari, c.inc) +
    '% outros gastos"><i class="cm-r" style="width:' +
    w(c.rec) +
    '"></i><i class="cm-p" style="width:' +
    w(c.inst) +
    '"></i><i class="cm-v" style="width:' +
    w(c.vari) +
    '"></i><i class="cm-s" style="width:' +
    w(Math.max(0, left)) +
    '"></i></div>' +
    leg('cm-r', 'Recorrentes', c.rec) +
    leg('cm-p', 'Parcelas', c.inst) +
    leg('cm-v', 'Outros gastos', c.vari) +
    (left >= 0 ? leg('cm-s', 'Sobra', left) : leg('cm-bad', 'Faltou', -left)) +
    '<div class="mut" style="margin-top:8px;font-size:12.5px">' +
    cmSrcTxt(c) +
    '<span class="cmv">' +
    brl(c.inc) +
    '</span>.</div>';
  const cm = cmNow(),
    nx = commitForecast(cm, 6).map((f) => ({ ...f, inc: incomeBase(f.m).v }));
  if (nx.some((f) => f.rec + f.inst > 0))
    h +=
      '<details class="pd cmd"><summary class="mut">Ver os próximos meses</summary><div class="cmx">' +
      nx
        .map((f) => {
          const p = f.inc > 0 ? (f.rec + f.inst) / f.inc : 0,
            cls = p >= 0.7 ? ' bd' : p >= 0.5 ? ' wr' : '';
          return (
            '<div class="cmcol"><b>' +
            (f.inc > 0 ? Math.round(p * 100) + '%' : '–') +
            '</b><div class="cmbar"><i class="' +
            cls.trim() +
            '" style="height:' +
            Math.min(100, Math.round(p * 100)) +
            '%"></i></div><span>' +
            MABBR[+f.m.slice(5) - 1] +
            '</span></div>'
          );
        })
        .join('') +
      '</div><div class="mut" style="font-size:12.5px">Recorrentes mais parcelas, sobre a renda de cada mês. Uma referência comum é manter os gastos fixos abaixo de 50% da renda.</div></details>';
  return h + '</div>';
}

/* resposta do assistente */
function commitAnswer() {
  const m = cmNow(),
    c = commitMonth(m),
    fixed = c.rec + c.inst;
  if (!(c.inc > 0))
    return 'Ainda não tenho a sua renda deste mês. Lance uma receita (ou um salário recorrente) e eu calculo quanto dela já está comprometida.';
  return (
    'Em ' +
    mfmt(m) +
    ', ' +
    pctOf(c.rec, c.inc) +
    '% da sua renda (' +
    brl(c.rec) +
    ' de ' +
    brl(c.inc) +
    ') vai para despesas recorrentes' +
    (c.inst
      ? ' e ' +
        pctOf(c.inst, c.inc) +
        '% (' +
        brl(c.inst) +
        ') para parcelas, juntos ' +
        pctOf(fixed, c.inc) +
        '%'
      : '') +
    '. Sobram ' +
    brl(Math.max(0, c.inc - c.tot)) +
    ' depois de todos os gastos lançados.'
  );
}
