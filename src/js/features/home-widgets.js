/* features/home-widgets.js
   Catálogo de blocos (widgets) da tela Início: os 10 padrão, que formam o modo Completa, e 7 extras para o modo Personalizar.
   Cada bloco tem um id, um título, uma descrição e (quando é montado por código) uma função que devolve o HTML dele. */

const HOME_W = [
  {
    id: 'resumo',
    t: 'Total do mês',
    d: 'Quanto você gastou no mês e o andamento do limite',
    std: 1,
    simple: 1,
  },
  {
    id: 'fluxo',
    t: 'Receitas, despesas e saldo',
    d: 'O que entrou, o que saiu e quanto sobrou',
    std: 1,
    simple: 1,
  },
  {
    id: 'comprometida',
    t: 'Renda comprometida',
    d: 'Quanto da renda vai para despesas recorrentes e parcelas, e como fica nos próximos meses',
    std: 1,
  },
  { id: 'avisos', t: 'Avisos', d: 'Limite do mês e contas que estão para vencer', std: 1, simple: 1 },
  { id: 'contas', t: 'Contas', d: 'O saldo de cada conta', std: 1 },
  { id: 'dicas', t: 'Para você ver', d: 'Observações automáticas sobre os seus gastos', std: 1 },
  { id: 'sonhos', t: 'Sonhos', d: 'O progresso das suas metas de economia', std: 1 },
  {
    id: 'graficos',
    t: 'Para onde foi seu dinheiro',
    d: 'Gráfico por categoria (rosca, barras, linha ou semana)',
    std: 1,
    simple: 1,
  },
  {
    id: 'indicadores',
    t: 'Indicadores',
    d: 'Quantidade de lançamentos, média por dia e maior categoria',
    std: 1,
  },
  { id: 'recentes', t: 'Últimos lançamentos', d: 'Os três lançamentos mais recentes', std: 1, simple: 1 },
  {
    id: 'diario',
    t: 'Pode gastar por dia',
    d: 'Quanto você ainda pode gastar por dia até o fim do mês (usa o limite do mês)',
    extra: 1,
  },
  { id: 'maiores', t: 'Maiores gastos do mês', d: 'As cinco maiores despesas do mês', extra: 1 },
  {
    id: 'vencimentos',
    t: 'Próximos vencimentos',
    d: 'Contas e faturas dos próximos 14 dias, com os dias que faltam',
    extra: 1,
  },
  { id: 'assinaturas', t: 'Assinaturas', d: 'Cobranças que se repetem todo mês e quanto somam', extra: 1 },
  {
    id: 'cartoes',
    t: 'Cartões e faturas',
    d: 'Fatura em aberto, vencimento e limite usado de cada cartão',
    extra: 1,
  },
  { id: 'evolucao', t: 'Últimos 6 meses', d: 'Receitas e despesas mês a mês', extra: 1 },
  { id: 'atalhos', t: 'Atalhos', d: 'Lançar despesa ou receita, importar fatura e abrir a agenda', extra: 1 },
];
/* sem protótipo: ids como "__proto__" ou "constructor" nunca contam como blocos válidos */
const HOME_BY = Object.assign(Object.create(null), Object.fromEntries(HOME_W.map((w) => [w.id, w])));
/* modo Completa: todos os blocos padrão, na ordem de sempre */
const HOME_STD = HOME_W.filter((w) => w.std).map((w) => w.id);
/* modo Simples: só o essencial. Cinco perguntas que todo mundo faz ao abrir o app:
   quanto gastei, quanto sobrou, tem algo vencendo ou estourando, para onde foi o dinheiro, o que lancei por último */
const HOME_SIMPLE = HOME_W.filter((w) => w.simple).map((w) => w.id);

const wHead = (t, link) => '<div class="sec"><h3>' + t + '</h3>' + (link || '') + '</div>';
const wDate = (d) => d.split('-').reverse().slice(0, 2).join('/');
const wRow = (titulo, sub, valor, cls) =>
  '<div class="wli"><div class="wlm"><div class="wlt">' +
  titulo +
  '</div><div class="wls' +
  (cls ? ' ' + cls : '') +
  '">' +
  sub +
  '</div></div><div class="wlv">' +
  valor +
  '</div></div>';

/* Pode gastar por dia */
function wDiario(m) {
  const lim = budgets[m] || 0,
    tot = sumV(inMonth(m)),
    cm = cmNow(),
    [y, mo] = m.split('-').map(Number),
    days = new Date(y, mo, 0).getDate();
  const head = wHead('Pode gastar por dia') + '<div class="card">';
  if (!(lim > 0))
    return (
      head +
      '<div class="mut">Defina um limite para o mês e eu calculo quanto você pode gastar por dia.</div><div class="row" style="margin-top:10px"><button class="btn ghost sm" data-pgo="metas" type="button">Definir limite</button></div></div>'
    );
  if (m > cm) return head + '<div class="mut">O cálculo diário aparece quando o mês começar.</div></div>';
  if (m < cm)
    return (
      head +
      '<div class="mut">Neste mês você gastou em média <b>' +
      brl(tot / days) +
      '</b> por dia, para um limite de ' +
      brl(lim) +
      '.</div></div>'
    );
  const left = days - today.getDate() + 1,
    rest = lim - tot,
    past = days - left,
    done = sumV(inMonth(m).filter((x) => x.date <= iso(today)));
  if (rest <= 0)
    return (
      head +
      '<div class="wbig"><b class="bd">' +
      brl(0) +
      '</b> por dia</div><div class="mut">' +
      (rest === 0
        ? 'Você usou exatamente todo o limite do mês (' + brl(lim) + ').'
        : 'Você passou do limite do mês em ' + brl(-rest) + ' (' + brl(tot) + ' de ' + brl(lim) + ').') +
      '</div></div>'
    );
  return (
    head +
    '<div class="wbig"><b>' +
    brl(rest / left) +
    '</b> por dia</div><div class="mut">Restam ' +
    brl(rest) +
    ' do limite para ' +
    left +
    (left === 1 ? ' dia' : ' dias') +
    ', já contando o que está previsto.' +
    (past >= 10 ? ' Até agora a média foi de ' + brl(done / past) + ' por dia.' : '') +
    '</div></div>'
  );
}

/* Maiores gastos do mês */
function wMaiores(m) {
  const L = inMonth(m)
    .slice()
    .sort((a, b) => b.value - a.value || (a.date < b.date ? 1 : -1))
    .slice(0, 5);
  return (
    wHead('Maiores gastos do mês', '<button class="lk" data-go="lista" type="button">Ver todos</button>') +
    '<div class="card">' +
    (L.length
      ? L.map((x) =>
          wRow(
            esc(x.desc),
            '<span class="dot" style="background:' +
              col(x.cat) +
              '"></span> ' +
              esc(x.cat) +
              ' · ' +
              wDate(x.date) +
              badge(x),
            brl(x.value)
          )
        ).join('')
      : '<div class="mut">Nenhum gasto neste mês.</div>') +
    '</div>'
  );
}

/* Próximos vencimentos (contas a pagar e faturas, incluindo as atrasadas) */
function wVencimentos() {
  const all = payList().filter((x) => daysTo(x.date) <= 14),
    L = all.slice(0, 5);
  return (
    wHead(
      'Próximos vencimentos',
      all.length ? '<button class="lk" data-gocomp="1" type="button">Ver todos</button>' : ''
    ) +
    '<div class="card">' +
    (L.length
      ? L.map((x) => {
          const n = daysTo(x.date);
          return wRow(esc(x.desc), dueTxt(n) + ' · ' + wDate(x.date), brl(x.value), n < 0 ? 'late' : '');
        }).join('') +
        '<div class="wsum"><span class="mut">Total' +
        (all.length > L.length ? ' (inclui mais ' + (all.length - L.length) + ')' : '') +
        '</span><b>' +
        brl(sumV(all)) +
        '</b></div>'
      : '<div class="mut">Nada vencendo nos próximos 14 dias. 🎉</div>') +
    '</div>'
  );
}

/* Assinaturas detectadas */
function wAssinaturas() {
  const S = subsDetect()
    .slice()
    .sort((a, b) => b.value - a.value);
  return (
    wHead(
      'Assinaturas',
      S.length ? '<button class="lk" data-gocomp="1" type="button">Ver todas</button>' : ''
    ) +
    '<div class="card">' +
    (S.length
      ? S.slice(0, 5)
          .map((s) =>
            wRow(esc(s.desc), 'Todo mês, por volta do dia ' + s.day + ' · ' + s.n + ' meses', brl(s.value))
          )
          .join('') +
        '<div class="wsum"><span class="mut">Por mês' +
        (S.length > 5 ? ' (inclui mais ' + (S.length - 5) + ')' : '') +
        '</span><b>' +
        brl(sumV(S)) +
        '</b></div>'
      : '<div class="mut">Nenhuma assinatura detectada ainda. O app procura cobranças parecidas que se repetem todo mês.</div>') +
    '</div>'
  );
}

/* Cartões e faturas */
function wCartoes() {
  return (
    wHead(
      'Cartões e faturas',
      cards.length ? '<button class="lk" data-pgo="cards" type="button">Gerenciar</button>' : ''
    ) +
    '<div class="card">' +
    (cards.length
      ? cards
          .map((c) => {
            const iv = invoices(c),
              used = iv.reduce((a, x) => a + x[1], 0),
              pct = c.lim > 0 ? Math.min(100, (used / c.lim) * 100) : 0,
              nx = iv[0];
            return (
              '<div class="wcd">' +
              wRow(
                esc(c.n),
                nx
                  ? 'Fatura de ' + mfmt(nx[0]) + ' · vence ' + wDate(dueOf(nx[0], c))
                  : 'Nenhuma fatura em aberto',
                brl(nx ? nx[1] : 0)
              ) +
              (c.lim > 0
                ? '<div class="bar' +
                  (pct >= 90 ? ' over' : '') +
                  '" style="margin:2px 0 6px"><i style="width:' +
                  pct.toFixed(1) +
                  '%"></i></div><div class="mut wcl">Limite usado: ' +
                  Math.round(pct) +
                  '% (' +
                  brl(used) +
                  ' de ' +
                  brl(c.lim) +
                  ')</div>'
                : '') +
              '</div>'
            );
          })
          .join('')
      : '<div class="mut">Cadastre um cartão para acompanhar fatura, vencimento e limite.</div><div class="row" style="margin-top:10px"><button class="btn ghost sm" data-pgo="cards" type="button">Cadastrar cartão</button></div>') +
    '</div>'
  );
}

/* Últimos 6 meses: receitas e despesas */
function wEvolucao(m) {
  const R = [5, 4, 3, 2, 1, 0].map((i) => {
      const mm = addM(m, -i);
      return { m: mm, r: sumV(incMonth(mm)), d: sumV(inMonth(mm)) };
    }),
    mx = Math.max(1, ...R.flatMap((x) => [x.r, x.d])),
    med = R.reduce((a, x) => a + x.d, 0) / R.length;
  const alt = R.map(
    (x) => MABBR[+x.m.slice(5) - 1] + ': receitas ' + brl(x.r) + ', despesas ' + brl(x.d)
  ).join('; ');
  return (
    wHead('Últimos 6 meses') +
    '<div class="card"><div class="evg" role="img" aria-label="' +
    esc(alt) +
    '">' +
    R.map(
      (x) =>
        '<div class="evc"><div class="evb"><i class="ei" style="height:' +
        ((x.r / mx) * 100).toFixed(1) +
        '%"></i><i class="ed" style="height:' +
        ((x.d / mx) * 100).toFixed(1) +
        '%"></i></div><span>' +
        MABBR[+x.m.slice(5) - 1] +
        '</span></div>'
    ).join('') +
    '</div><div class="evl"><span><i class="ei"></i> Receitas</span><span><i class="ed"></i> Despesas</span></div><div class="mut" style="font-size:12.5px;margin-top:6px">Em média, você gastou <span class="wlv">' +
    brl(med) +
    '</span> por mês neste período.</div></div>'
  );
}

/* Atalhos */
function wAtalhos() {
  const b = (attr, ic, t) =>
    '<button class="wab" type="button" ' + attr + '>' + ico(ic) + '<span>' + t + '</span></button>';
  return (
    wHead('Atalhos') +
    '<div class="card"><div class="wat">' +
    b('data-act="exp"', 'plus', 'Nova despesa') +
    b('data-newinc="1"', 'plus', 'Nova receita') +
    b('data-act="imp"', 'down', 'Importar fatura') +
    b('data-go="agenda"', 'cal', 'Agenda') +
    '</div></div>'
  );
}

/* quem monta cada bloco dinâmico (os estáticos, como o resumo e os gráficos, já estão no HTML) */
const HOME_BUILD = {
  fluxo: (m) => wFluxo(m),
  comprometida: (m) => commitCardHTML(m),
  avisos: (m) => wAvisos(m),
  contas: () => wContas(),
  dicas: (m) => wDicas(m),
  sonhos: () => wSonhos(),
  diario: (m) => wDiario(m),
  maiores: (m) => wMaiores(m),
  vencimentos: () => wVencimentos(),
  assinaturas: () => wAssinaturas(),
  cartoes: () => wCartoes(),
  evolucao: (m) => wEvolucao(m),
  atalhos: () => wAtalhos(),
};
