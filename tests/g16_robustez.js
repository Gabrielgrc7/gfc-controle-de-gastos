const H = require('./h'),
  fs = require('fs'),
  path = require('path');
(async () => {
  const { w, $, Q, E, ok, R, sleep, signup } = await H.boot();
  await signup('r@x.com', 'R');
  const rnd = H.rng(99),
    pad = (n) => String(n).padStart(2, '0');
  // ---- "hoje" acompanha o relógio ----
  ok('refreshToday não faz nada se o dia é o mesmo', E('refreshToday()') === false);
  E('today=new Date(2020,0,15,12)');
  E(
    "plans=[{gid:'g1',kind:'r',desc:'Aluguel',value:100,cat:'Moradia',day:10,start:'2020-01-10',active:true,skip:[]}]"
  );
  E('data=[]');
  E('materialize()');
  ok('antes: só janeiro de 2020 existe', E('data.length') === 1 && E('cmNow()') === '2020-01');
  ok(
    'quando o relógio avança, refreshToday detecta o novo dia',
    E('refreshToday()') === true && E('iso(today)') === E('iso(new Date())')
  );
  const months = E('data.length'),
    expect = E('mdiff("2020-01",cmNow())') + 1;
  ok('e gera as recorrências dos meses que passaram', months === expect, months + ' vs ' + expect);
  ok(
    'uma segunda chamada no mesmo dia não faz nada',
    E('refreshToday()') === false && E('data.length') === months
  );
  ok(
    'o mês de referência e a data atual voltam a ser os de hoje',
    E('cmNow()') === E('iso(new Date())').slice(0, 7)
  );
  const ev = new w.Event('visibilitychange');
  E('today=new Date(2021,5,1)');
  w.document.dispatchEvent(ev);
  await sleep(5);
  ok('voltar para a aba também atualiza o dia', E('iso(today)') === E('iso(new Date())'));
  // ---- anomalias: mesmo resultado que a versão lenta ----
  w.eval(`function anomaliesOld(){const cm=cmNow(),ex=data.filter(x=>!x.inc),out=[];
  inMonth(cm).forEach(x=>{const k=normKey(x.desc);if(!k)return;
    const prev=ex.filter(y=>y.id!==x.id&&normKey(y.desc)===k&&mOf(y)<cm).map(y=>y.value);
    if(prev.length>=3&&x.value>=50){const av=prev.reduce((a,b)=>a+b,0)/prev.length;if(x.value>=av*2.5)out.push('Valor acima do normal: '+x.desc+' ('+brl(x.value)+', média '+brl(av)+').')}
    if(ex.some(y=>y.id<x.id&&y.value===x.value&&normKey(y.desc)===k&&Math.abs(daysTo(y.date)-daysTo(x.date))<=3&&!x.kind))out.push('Possível cobrança duplicada: '+x.desc+' ('+brl(x.value)+').')});
  return out;}`);
  const vocab = [
    'Uber',
    'Mercado Bom Preço',
    'Netflix',
    'Farmácia Vida',
    'Padaria Central',
    'Cinema',
    'Posto Ipiranga',
    'iFood',
    'Academia',
    'Livraria',
    'Café',
    'Pizzaria Napoli',
    '',
    ' ',
    '123',
    'Parcela 2/3 Notebook',
  ];
  const cm = E('cmNow()');
  let eq = 0,
    withOut = 0;
  for (let t = 0; t < 60; t++) {
    const N = 20 + Math.floor(rnd() * 380),
      items = [];
    for (let i = 0; i < N; i++) {
      const back = Math.floor(rnd() * 5),
        mo = E('addM("' + cm + '",-' + back + ')'),
        d = 1 + Math.floor(rnd() * 28),
        v = rnd() < 0.3 ? [50, 80, 120, 200][Math.floor(rnd() * 4)] : Math.round(rnd() * 30000) / 100 + 1;
      items.push({
        id: 'z' + String(i).padStart(4, '0'),
        desc: vocab[Math.floor(rnd() * vocab.length)],
        value: v,
        date: mo + '-' + pad(d),
        cat: 'Outros',
        inc: rnd() < 0.1 || undefined,
        kind: rnd() < 0.1 ? 'p' : undefined,
      });
    }
    E('data=' + JSON.stringify(items));
    const a = E('anomalies()'),
      b = E('anomaliesOld()');
    eq += JSON.stringify(a) === JSON.stringify(b) ? 1 : 0;
    if (a.length) withOut++;
    ok(
      'anomalias iguais à versão antiga, conjunto ' +
        t +
        ' (' +
        N +
        ' lançamentos, ' +
        a.length +
        ' alertas)',
      JSON.stringify(a) === JSON.stringify(b),
      JSON.stringify(a).slice(0, 80) + ' | ' + JSON.stringify(b).slice(0, 80)
    );
  }
  ok('o teste exercitou alertas de verdade', withOut >= 20, withOut);
  // ---- velocidade ----
  const time = (f) => {
    const t = performance.now();
    E(f);
    return performance.now() - t;
  };
  const seed = (N) => {
    const items = [];
    for (let i = 0; i < N; i++) {
      const back = Math.floor(rnd() * 24),
        mo = E('addM("' + cm + '",-' + back + ')');
      items.push({
        id: 'p' + N + '_' + i,
        desc: 'Gasto ' + (i % 60),
        value: Math.round(rnd() * 50000) / 100 + 1,
        date: mo + '-' + pad(1 + Math.floor(rnd() * 28)),
        cat: 'Outros',
      });
    }
    E('data=' + JSON.stringify(items));
    E('go("inicio")');
  };
  const T = {};
  for (const N of [1000, 5000, 20000]) {
    seed(N);
    T[N] = {
      an: time('anomalies()'),
      ren: time('render()'),
      rel: time('go("rel");renderRel()'),
      ag: time('go("agenda");renderAgenda()'),
    };
  }
  console.log('  tempos (ms, navegador simulado):', JSON.stringify(T));
  ok('anomalias com 5.000 lançamentos: menos de 200 ms', T[5000].an < 200, T[5000].an);
  ok('anomalias com 20.000 lançamentos: menos de 800 ms', T[20000].an < 800, T[20000].an);
  ok(
    'anomalias crescem em linha reta (20 mil / 5 mil < 10)',
    T[20000].an / Math.max(T[5000].an, 1) < 10,
    T[20000].an / Math.max(T[5000].an, 1)
  );
  ok('desenhar o Início com 5.000 lançamentos: menos de 1,5 s', T[5000].ren < 1500, T[5000].ren);
  ok('relatório com 5.000 lançamentos: menos de 1,5 s', T[5000].rel < 1500, T[5000].rel);
  ok('agenda com 5.000 lançamentos: menos de 1,5 s', T[5000].ag < 1500, T[5000].ag);
  ok(
    'com 20.000 lançamentos nada passa de 8 s',
    ['ren', 'rel', 'ag'].every((k) => T[20000][k] < 8000),
    JSON.stringify(T[20000])
  );
  // ---- o Início só é redesenhado quando está na tela ----
  E('data=[]');
  E('go("inicio")');
  w.eval('var __c=0;const __ri=renderIn;renderIn=function(){__c++;return __ri()}');
  E('go("rel")');
  E('render()');
  const c1 = E('__c');
  E('go("inicio")');
  const c2 = E('__c');
  ok('fora do Início, renderIn não roda', c1 === 0, c1);
  ok('ao voltar ao Início, roda', c2 > c1, c2);
  // ---- leitor de PDF só carrega quando precisa ----
  const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf8');
  ok(
    'o index.html do site não carrega o leitor de PDF no começo',
    !/<script[^>]+pdf\.(min|worker)/.test(html)
  );
  w.eval(
    'var __loaded=[];loadScript=src=>{__loaded.push(src);if(/pdf\\.min/.test(src))window.pdfjsLib={};return Promise.resolve()};'
  );
  E('window.pdfjsLib=undefined;pdfLoading=null');
  await E('ensurePdf()');
  ok(
    'ensurePdf baixa o leitor e o worker, nessa ordem',
    E('__loaded.join()') === 'vendor/pdf.min.js,vendor/pdf.worker.min.js',
    E('__loaded.join()')
  );
  await E('ensurePdf()');
  ok('e não baixa de novo', E('__loaded.length') === 2);
  E(
    'window.pdfjsLib=undefined;pdfLoading=null;__loaded=[];loadScript=()=>Promise.reject(new Error("sem rede"))'
  );
  let failed = false;
  try {
    await E('ensurePdf()');
  } catch (e) {
    failed = true;
  }
  ok('sem internet na primeira vez, falha com erro claro', failed);
  w.eval('loadScript=src=>{window.pdfjsLib={};return Promise.resolve()}');
  await E('ensurePdf()');
  ok('e tenta de novo depois (não fica preso no erro)', !!E('window.pdfjsLib'));
  const sw = fs.readFileSync(path.join(__dirname, '..', 'src', 'sw.js'), 'utf8');
  ok(
    'o app instalado guarda o leitor para usar sem internet',
    /pdf\.min\.js/.test(sw) && /pdf\.worker\.min\.js/.test(sw)
  );
  ok('nenhum erro de script', w.__errs.length === 0, w.__errs.slice(0, 3).join('|'));
  H.done('Robustez: data que muda, desempenho e leitor de PDF sob demanda', R);
})()
  .then(() => 0)
  .catch((e) => {
    console.log(JSON.stringify({ group: 'robustez', crash: e.stack.split('\n').slice(0, 5).join(' | ') }));
    process.exit(1);
  });
