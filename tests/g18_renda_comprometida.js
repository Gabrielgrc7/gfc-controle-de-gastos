const H = require('./h');
(async () => {
  const { w, $, Q, QA, E, ok, R, signup, sleep } = await H.boot();
  await signup('r@x.com', 'R');
  const cm = E('cmNow()'),
    nm = (k) => E('addM(cmNow(),' + k + ')'),
    id = (() => {
      let n = 0;
      return () => 'e' + ++n;
    })();
  const setData = (arr, pl) => {
    E('plans=' + JSON.stringify(pl || []));
    E('data=' + JSON.stringify(arr));
    E('go("inicio")');
    E('render()');
  };
  const e = (o) => ({ id: id(), cat: 'Outros', date: cm + '-10', desc: 'x', value: 1, ...o });
  // ---- o exemplo do pedido: renda 10 mil, recorrentes 4 mil = 40% ----
  setData(
    [
      e({ desc: 'Salário', value: 10000, inc: true, cat: 'Receita', kind: 'r', gid: 'sal' }),
      e({ desc: 'Aluguel', value: 2500, kind: 'r', gid: 'al' }),
      e({ desc: 'Plano de saúde', value: 1500, kind: 'r', gid: 'ps' }),
      e({ desc: 'Notebook', value: 500, kind: 'p', pn: 1, pt: 3, gid: 'nb' }),
      e({ desc: 'Mercado', value: 800 }),
    ],
    []
  );
  let c = E('commitMonth(cmNow())');
  ok('renda de 10 mil', c.inc === 10000 && c.src === 'real');
  ok('recorrentes somam 4 mil', c.rec === 4000, c.rec);
  ok('parcelas somam 500', c.inst === 500);
  ok('outros gastos somam 800', c.vari === 800);
  ok('total gasto 5.300', c.tot === 5300);
  const card = $('home').textContent;
  ok('a tela Início mostra o card "Renda comprometida"', /Renda comprometida/.test(card));
  ok(
    '40% da renda vai para recorrentes (o exemplo do pedido)',
    /40%\s*da sua renda vai para despesas recorrentes/.test(card),
    card.slice(0, 300)
  );
  ok('mostra R$ 4.000,00 de R$ 10.000,00', /R\$\s?4\.000,00 de R\$\s?10\.000,00/.test(card));
  ok(
    'mostra as parcelas e o total comprometido (45%)',
    /mais 5% em parcelas/.test(card) && /45%/.test(card),
    card
  );
  ok(
    'legenda: 40% recorrentes, 5% parcelas, 8% outros, 47% sobra',
    ['Recorrentes40%', 'Parcelas5%', 'Outrosgastos8%', 'Sobra47%'].every((t) =>
      card.replace(/\s/g, '').includes(t)
    )
  );
  ok('o card mostra a origem da renda', /Renda do mês/.test(card));
  const widths = [...w.document.querySelectorAll('.cmb i')].map((i) => parseFloat(i.style.width));
  ok(
    'a barra tem 4 trechos que somam 100%',
    widths.length === 4 && Math.abs(widths.reduce((a, b) => a + b, 0) - 100) < 0.05,
    widths.join(',')
  );
  ok(
    'os trechos seguem 40, 5, 8 e 47',
    Math.abs(widths[0] - 40) < 0.01 &&
      Math.abs(widths[1] - 5) < 0.01 &&
      Math.abs(widths[2] - 8) < 0.01 &&
      Math.abs(widths[3] - 47) < 0.01,
    widths.join(',')
  );
  ok(
    'a barra tem descrição para leitor de tela',
    /Divisão da renda: 40% recorrentes, 5% parcelas, 8% outros gastos/.test(
      Q('.cmb').getAttribute('aria-label')
    ),
    Q('.cmb').getAttribute('aria-label')
  );
  ok('valores do card ficam ocultáveis (classe cmv)', QA('.cmc .cmv').length >= 5);
  // ---- cores de alerta ----
  setData([
    e({ desc: 'Salário', value: 1000, inc: true, cat: 'Receita' }),
    e({ desc: 'Aluguel', value: 520, kind: 'r' }),
  ]);
  ok('52% fica amarelo (referência de 50%)', Q('.cmh b').className === 'wr', Q('.cmh b').className);
  setData([
    e({ desc: 'Salário', value: 1000, inc: true, cat: 'Receita' }),
    e({ desc: 'Aluguel', value: 720, kind: 'r' }),
  ]);
  ok('72% fica vermelho', Q('.cmh b').className === 'bd');
  setData([
    e({ desc: 'Salário', value: 1000, inc: true, cat: 'Receita' }),
    e({ desc: 'Aluguel', value: 400, kind: 'r' }),
  ]);
  ok('40% fica normal', Q('.cmh b').className === '');
  // ---- gastou mais do que ganhou ----
  setData([
    e({ desc: 'Salário', value: 1000, inc: true, cat: 'Receita' }),
    e({ desc: 'Aluguel', value: 800, kind: 'r' }),
    e({ desc: 'Compra', value: 700 }),
  ]);
  const t2 = $('home').textContent.replace(/\s/g, '');
  ok(
    'faltou dinheiro: legenda "Faltou" em vez de "Sobra"',
    t2.includes('Faltou50%') && !t2.includes('Sobra'),
    t2.slice(0, 400)
  );
  const w2 = [...w.document.querySelectorAll('.cmb i')].map((i) => parseFloat(i.style.width));
  ok(
    'com gasto acima da renda a barra continua somando no máximo 100%',
    w2.reduce((a, b) => a + b, 0) <= 100.05 && w2[3] === 0,
    w2.join(',')
  );
  // ---- sem renda ----
  setData([e({ desc: 'Aluguel', value: 800, kind: 'r' })]);
  c = E('commitMonth(cmNow())');
  ok('sem renda: inc 0 e sem origem', c.inc === 0 && c.src === null);
  ok(
    'sem renda: pede para cadastrar e oferece + Receita',
    /Cadastre sua renda/.test($('home').textContent) && !!Q('.cmc [data-newinc]')
  );
  ok('sem renda não aparece NaN nem Infinity', !/NaN|Infinity/.test($('home').textContent));
  // ---- sem recorrentes nem parcelas ----
  setData([
    e({ desc: 'Salário', value: 3000, inc: true, cat: 'Receita' }),
    e({ desc: 'Mercado', value: 300 }),
  ]);
  ok(
    'sem recorrentes: avisa em vez de mostrar 0%',
    /Nenhuma despesa recorrente ou parcela/.test($('home').textContent)
  );
  // ---- origem da renda ----
  setData(
    [e({ desc: 'Mercado', value: 100 })],
    [
      {
        gid: 'ps',
        kind: 'r',
        inc: true,
        active: true,
        desc: 'Salário',
        value: 4000,
        start: nm(-3) + '-05',
        day: 5,
        cat: 'Receita',
        skip: [],
      },
    ]
  );
  c = E('incomeBase(cmNow())');
  ok(
    'sem receita no mês, usa o salário recorrente',
    c.v === 4000 && c.src === 'recorrente',
    JSON.stringify(c)
  );
  ok(
    'o card diz que a renda é prevista',
    /Renda prevista \(salário recorrente\)/.test($('home').textContent)
  );
  setData([
    e({ desc: 'Salário', value: 3000, inc: true, cat: 'Receita', date: nm(-1) + '-05' }),
    e({ desc: 'Salário', value: 6000, inc: true, cat: 'Receita', date: nm(-2) + '-05' }),
    e({ desc: 'Mercado', value: 50 }),
  ]);
  c = E('incomeBase(cmNow())');
  ok('sem nada no mês, usa a média dos últimos meses', c.v === 4500 && c.src === 'média', JSON.stringify(c));
  ok(
    'renda inativa (plano encerrado) não conta',
    (setData(
      [],
      [
        {
          gid: 'pe',
          kind: 'r',
          inc: true,
          active: false,
          desc: 'Antigo',
          value: 9000,
          start: nm(-3) + '-05',
          day: 5,
          cat: 'Receita',
          skip: [],
        },
      ]
    ),
    E('incomeBase(cmNow())').v === 0)
  );
  ok(
    'plano de renda que ainda não começou não conta',
    (setData(
      [],
      [
        {
          gid: 'pf',
          kind: 'r',
          inc: true,
          active: true,
          desc: 'Futuro',
          value: 9000,
          start: nm(2) + '-05',
          day: 5,
          cat: 'Receita',
          skip: [],
        },
      ]
    ),
    E('incomeBase(cmNow())').v === 0)
  );
  // ---- próximos meses (planos) ----
  const plan = (o) => ({
    gid: 'g' + Math.random().toString(36).slice(2, 7),
    active: true,
    skip: [],
    day: 5,
    cat: 'Outros',
    ...o,
  });
  setData(
    [e({ desc: 'Salário', value: 10000, inc: true, cat: 'Receita' })],
    [
      plan({ kind: 'r', desc: 'Aluguel', value: 3000, start: nm(-2) + '-05' }),
      plan({ kind: 'p', desc: 'Geladeira', value: 1000, pn: 1, pt: 3, start: nm(0) + '-05' }),
      plan({ kind: 'r', inc: true, desc: 'Salário', value: 10000, start: nm(-2) + '-05' }),
    ]
  );
  const fc = E('commitForecast(cmNow(),6)');
  ok(
    'previsão: 6 meses, o primeiro é o seguinte ao atual',
    fc.length === 6 && fc[0].m === nm(1) && fc[5].m === nm(6)
  );
  ok(
    'previsão: recorrente de 3 mil em todos os meses',
    fc.every((f) => f.rec === 3000)
  );
  ok(
    'previsão: a parcela (2 e 3 de 3) aparece só nos 2 meses seguintes',
    fc.map((f) => f.inst).join() === '1000,1000,0,0,0,0',
    fc.map((f) => f.inst).join()
  );
  const pcs = [...w.document.querySelectorAll('.cmcol b')].map((b) => b.textContent);
  ok(
    'o card mostra os 6 próximos meses em %',
    pcs.length === 6 && pcs.join() === '40%,40%,30%,30%,30%,30%',
    pcs.join()
  );
  ok(
    'os próximos meses ficam dentro de um bloco que abre e fecha',
    !!Q('details.cmd') && /próximos meses/.test(Q('details.cmd summary').textContent)
  );
  ok(
    'as barrinhas têm altura proporcional',
    [...w.document.querySelectorAll('.cmbar i')].map((i) => i.style.height).join() ===
      '40%,40%,30%,30%,30%,30%'
  );
  ok('a nota cita a referência comum de 50%', /referência comum.*50%/.test(Q('details.cmd').textContent));
  setData([e({ desc: 'Salário', value: 10000, inc: true, cat: 'Receita' })], []);
  ok('sem planos, sem bloco de próximos meses', !Q('details.cmd'));
  // ---- mês selecionado diferente do atual ----
  setData(
    [
      e({ desc: 'Salário', value: 5000, inc: true, cat: 'Receita', date: nm(-1) + '-05' }),
      e({ desc: 'Aluguel', value: 1000, kind: 'r', date: nm(-1) + '-06' }),
    ],
    [
      plan({ kind: 'r', desc: 'Aluguel', value: 1200, start: nm(-1) + '-05' }),
      plan({ kind: 'r', inc: true, desc: 'Salário', value: 5000, start: nm(-1) + '-05' }),
    ]
  );
  c = E('commitMonth(addM(cmNow(),-1))');
  ok('mês passado usa os lançamentos reais', c.rec === 1000 && c.inc === 5000, JSON.stringify(c));
  c = E('commitMonth(addM(cmNow(),2))');
  ok(
    'mês futuro usa os planos',
    c.rec === 1200 && c.inc === 5000 && c.inst === 0 && c.vari === 0,
    JSON.stringify(c)
  );
  ok(
    'mês muito distante não quebra',
    (() => {
      try {
        return E('commitMonth(addM(cmNow(),300))').rec === 1200;
      } catch (er) {
        return false;
      }
    })()
  );
  ok(
    'o card do mês passado (via seletor de mês) calcula sem erro',
    (() => {
      E('$("month").value=addM(cmNow(),-1)');
      E('render()');
      return /Renda comprometida/.test($('home').textContent) && /20%/.test($('home').textContent);
    })()
  );
  E('$("month").value=cmNow()');
  // ---- propriedade: a divisão sempre fecha ----
  const rnd = H.rng(2026);
  let okAll = 0,
    n = 0;
  for (let t = 0; t < 120; t++) {
    const arr = [];
    for (let i = 0; i < 1 + Math.floor(rnd() * 40); i++) {
      const k = rnd();
      arr.push(
        e({
          desc: 'd' + i,
          value: Math.round(rnd() * 90000) / 100 + 1,
          kind: k < 0.2 ? 'r' : k < 0.35 ? 'p' : undefined,
          inc: rnd() < 0.15 || undefined,
          cat: 'Outros',
          date: (rnd() < 0.8 ? cm : nm(-1)) + '-' + String(1 + Math.floor(rnd() * 28)).padStart(2, '0'),
        })
      );
    }
    setData(arr);
    c = E('commitMonth(cmNow())');
    const tot = E('sumV(inMonth(cmNow()))');
    n++;
    if (
      Math.abs(c.rec + c.inst + c.vari - tot) < 0.005 &&
      c.vari >= 0 &&
      c.rec >= 0 &&
      c.inst >= 0 &&
      !/NaN|Infinity|undefined/.test($('home').textContent)
    )
      okAll++;
  }
  ok(
    'em 120 conjuntos aleatórios: recorrentes + parcelas + outros = total gasto do mês, sem NaN',
    okAll === n,
    okAll + '/' + n
  );
  // ---- previsão igual à do Compromissos (a lógica antiga) ----
  w.eval(`function __oldFc(){const cm=iso(today).slice(0,7),L=commitList(),P=L.filter(x=>x.t==='p'&&x.cur<x.pt),Rr=L.filter(x=>x.t==='r');
    return Array.from({length:6},(_,i)=>{const m=addM(cm,i+1);let v=0;P.forEach(x=>{const nn=x.bpn+mdiff(x.base,m);if(mdiff(x.base,m)>=0&&nn<=x.pt)v+=x.value});Rr.forEach(x=>{if(m>=x.since&&(!x.end||m<=x.end))v+=x.value});return [m,v]})}`);
  let same = 0;
  for (let t = 0; t < 40; t++) {
    const pl = [];
    for (let i = 0; i < 1 + Math.floor(rnd() * 6); i++) {
      const isP = rnd() < 0.5,
        pt = 2 + Math.floor(rnd() * 12);
      pl.push(
        plan({
          kind: isP ? 'p' : 'r',
          desc: 'p' + i,
          value: Math.round(rnd() * 80000) / 100 + 5,
          pn: isP ? 1 + Math.floor(rnd() * pt) : undefined,
          pt: isP ? pt : undefined,
          start: nm(-Math.floor(rnd() * 6)) + '-05',
          end: !isP && rnd() < 0.3 ? nm(Math.floor(rnd() * 5)) : undefined,
          inc: rnd() < 0.15 || undefined,
        })
      );
    }
    setData([], pl);
    const a = E('commitForecast(cmNow(),6).map(f=>f.inst+f.rec)'),
      b = E('__oldFc().map(x=>x[1])');
    if (a.every((v, i) => Math.abs(v - b[i]) < 0.005)) same++;
  }
  ok(
    'a previsão nova é igual à lógica antiga do Compromissos (40 conjuntos de planos)',
    same === 40,
    same + '/40'
  );
  setData([], [plan({ kind: 'r', desc: 'Aluguel', value: 1234.56, start: nm(-1) + '-05' })]);
  E('go("lanc");seg("comp")');
  ok(
    'a aba Compromissos continua mostrando a previsão de 6 meses',
    /Previsão dos próximos 6 meses/.test($('compBox').textContent) &&
      /1\.234,56/.test($('compBox').textContent)
  );
  // ---- assistente ----
  setData([
    e({ desc: 'Salário', value: 10000, inc: true, cat: 'Receita', kind: 'r' }),
    e({ desc: 'Aluguel', value: 4000, kind: 'r' }),
    e({ desc: 'Mercado', value: 500 }),
  ]);
  for (const q of [
    'quanto da minha renda está comprometida?',
    'qual a porcentagem da renda comprometida',
    'quanto do meu salário vai para despesas recorrentes',
    'minha renda comprometida com parcelas',
    'renda comprometida',
  ]) {
    const r = E('aiAnswer(' + JSON.stringify(q) + ')');
    ok(
      'assistente responde: ' + q,
      /40% da sua renda/.test(r) && /R\$\s?4\.000,00 de R\$\s?10\.000,00/.test(r),
      r
    );
  }
  setData([e({ desc: 'Mercado', value: 500 })]);
  ok(
    'assistente sem renda: pede a renda',
    /Ainda não tenho a sua renda/.test(E('aiAnswer("renda comprometida")'))
  );
  ok(
    'o assistente não confunde com outras perguntas',
    !/da sua renda/.test(E('aiAnswer("quanto gastei este mês")'))
  );
  // ---- ocultar valores ----
  setData([
    e({ desc: 'Salário', value: 1000, inc: true, cat: 'Receita' }),
    e({ desc: 'Aluguel', value: 300, kind: 'r' }),
  ]);
  w.document.body.classList.add('hide');
  ok('com valores ocultos, o card mantém a classe que o CSS borra', QA('.cmc .cmv').length >= 1);
  w.document.body.classList.remove('hide');
  // ---- desempenho ----
  const big = [];
  for (let i = 0; i < 5000; i++)
    big.push(
      e({
        desc: 'g' + (i % 80),
        value: 10 + (i % 90),
        kind: i % 9 === 0 ? 'r' : i % 11 === 0 ? 'p' : undefined,
        date: nm(-(i % 20)) + '-' + String(1 + (i % 28)).padStart(2, '0'),
      })
    );
  big.push(e({ desc: 'Salário', value: 9000, inc: true, cat: 'Receita' }));
  E('plans=[];data=' + JSON.stringify(big));
  const t0 = performance.now();
  E('commitCardHTML(cmNow())');
  const dt = performance.now() - t0;
  ok('o card com 5.000 lançamentos calcula em menos de 300 ms', dt < 300, dt);
  ok('nenhum erro de script', w.__errs.length === 0, w.__errs.slice(0, 3).join('|'));
  H.done('Renda comprometida (recorrentes e parcelas sobre a renda)', R);
})()
  .then(() => 0)
  .catch((e) => {
    console.log(JSON.stringify({ group: 'renda', crash: e.stack.split('\n').slice(0, 5).join(' | ') }));
    process.exit(1);
  });
