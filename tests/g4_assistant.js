const H = require('./h');
(async () => {
  const { E, ok, R, signup, w } = await H.boot();
  await signup();
  const NOW = '2026-10-22';
  const draft = E('(function(t){return aiInterpret(t,new Date("' + NOW + 'T12:00:00"))})');
  const items = [
    ['mercado', 'Mercado', 'Supermercado'],
    ['farmácia', 'Farmácia', 'Saúde'],
    ['uber', 'Uber', 'Transporte'],
    ['padaria', 'Padaria', 'Alimentação'],
    ['netflix', 'Netflix', 'Assinaturas'],
    ['cinema', 'Cinema', 'Lazer'],
    ['renner', 'Renner', 'Compras'],
    ['internet', 'Internet', 'Contas'],
    ['aluguel', 'Aluguel', 'Moradia'],
    ['curso', 'Curso', 'Educação'],
    ['barbearia', 'Barbearia', 'Cuidados pessoais'],
    ['restaurante', 'Restaurante', 'Alimentação'],
    ['posto', 'Posto', 'Transporte'],
    ['ifood', 'Ifood', 'Alimentação'],
    ['shopee', 'Shopee', 'Compras'],
    ['dentista', 'Dentista', 'Saúde'],
    ['spotify', 'Spotify', 'Assinaturas'],
    ['papelaria', 'Papelaria', 'Educação'],
    ['vivo', 'Vivo', 'Contas'],
    ['pizza', 'Pizza', 'Alimentação'],
  ];
  const vals = [
    ['45', 45],
    ['45,90', 45.9],
    ['R$ 45', 45],
    ['R$45,50', 45.5],
    ['1.234,56', 1234.56],
    ['1500', 1500],
    ['2 mil', 2000],
    ['45.90', 45.9],
  ];
  const dts = [
    ['', NOW],
    ['hoje', NOW],
    ['ontem', '2026-10-21'],
    ['anteontem', '2026-10-20'],
    ['dia 5', '2026-10-05'],
    ['15/10', '2026-10-15'],
    ['semana passada', '2026-10-15'],
  ];
  const tpl = [(v, i, d) => `gastei ${v} com ${i} ${d}`.trim(), (v, i, d) => `${i} ${v} ${d}`.trim()];
  let n = 0;
  for (const [it, desc, cat] of items)
    for (const [vs, vn] of vals)
      for (const [ds, dn] of dts)
        for (const t of tpl) {
          const txt = t(vs, it, ds),
            r = draft(txt);
          n++;
          const d = r.drafts && r.drafts[0];
          ok('tipo drafts: ' + txt, r.type === 'drafts' && r.drafts.length === 1, r.type);
          if (!d) continue;
          ok('valor: ' + txt, Math.abs(d.value - vn) < 0.005, d.value);
          ok('data: ' + txt, d.date === dn, d.date);
          ok('categoria: ' + txt, d.cat === cat, d.cat);
          ok('descrição: ' + txt, d.desc === desc, d.desc);
          ok('é despesa à vista: ' + txt, d.kind === 'v' && !d.inc && !d.bill);
        }
  // casos nomeados
  const T = (txt, fn, name) => {
    const r = draft(txt);
    ok(name || txt, fn(r), JSON.stringify(r).slice(0, 160));
  };
  const D = (r) => r.drafts && r.drafts[0];
  T('recebi 3000 de salário', (r) => D(r).inc && D(r).value === 3000 && D(r).cat === 'Receita');
  T('salário 3500', (r) => D(r).inc && D(r).value === 3500);
  T('ganhei 200 de freela ontem', (r) => D(r).inc && D(r).date === '2026-10-21');
  T('notebook 3x de 500', (r) => D(r).kind === 'p' && D(r).pt === 3 && D(r).value === 500 && D(r).pn === 1);
  T('geladeira 1200 em 10x', (r) => D(r).kind === 'p' && D(r).pt === 10 && D(r).value === 120);
  T('parcelei o celular em 12x de 99,90', (r) => D(r).kind === 'p' && D(r).pt === 12 && D(r).value === 99.9);
  T(
    'tv parcela 3/10 de 250',
    (r) => D(r).kind === 'p' && D(r).pn === 3 && D(r).pt === 10 && D(r).value === 250
  );
  T('netflix 39,90 todo mês', (r) => D(r).kind === 'r' && D(r).value === 39.9);
  T('aluguel 1500 todo dia 5', (r) => D(r).kind === 'r' && D(r).value === 1500 && D(r).date === '2026-10-05');
  T('academia 99 mensal', (r) => D(r).kind === 'r');
  T('conta de luz 180 vence dia 28', (r) => D(r).bill && D(r).value === 180 && D(r).date === '2026-10-28');
  T('vou pagar 120 de internet amanhã', (r) => D(r).bill && D(r).date === '2026-10-23');
  T('boleto 300 dia 30', (r) => D(r).date === '2026-10-30' && D(r).bill);
  T('paguei 50 no pix de lanche', (r) => D(r).forma === 'Pix' && D(r).value === 50);
  T(
    'gastei 80 no débito com combustível',
    (r) => D(r).forma === 'Cartão de débito' && D(r).cat === 'Transporte'
  );
  T(
    'comprei um tênis por 250 no crédito',
    (r) => D(r).forma === 'Cartão de crédito' && D(r).value === 250 && /tênis/i.test(D(r).desc)
  );
  T(
    'gastei 45 no mercado e 30 na farmácia',
    (r) =>
      r.drafts.length === 2 &&
      r.drafts[0].value === 45 &&
      r.drafts[1].value === 30 &&
      r.drafts[1].cat === 'Saúde'
  );
  T('arroz e feijão 30', (r) => r.drafts.length === 1 && r.drafts[0].value === 30);
  T('mercado 45; padaria 12', (r) => r.drafts.length === 2);
  T(
    'gastei 20 com lanche e 15 com café ontem',
    (r) => r.drafts.length === 2 && r.drafts.every((d) => d.date === '2026-10-21')
  );
  T('comprei 2 camisetas por 80', (r) => D(r).value === 80);
  T('gastei 1 mil com reforma', (r) => D(r).value === 1000 || D(r).value === 1);
  T('uber 23,5', (r) => D(r).value === 23.5);
  T(
    'gastei 0 no mercado',
    (r) => r.type !== 'drafts' || D(r).value > 0,
    'valor zero não deve virar lançamento'
  );
  T('oi', (r) => r.type === 'unknown');
  T('bom dia, tudo bem?', (r) => r.type === 'unknown' || r.type === 'answer');
  T('ajuda', (r) => r.type === 'help');
  T('o que você faz', (r) => r.type === 'help');
  T('desfazer', (r) => r.type === 'undo');
  T('apagar o último', (r) => r.type === 'delete_last');
  T('paguei a internet', (r) => r.type === 'pay');
  // consultas com dados
  E(
    'data.push({id:"a1",desc:"Mercado",value:100,date:"2026-10-03",cat:"Supermercado"},{id:"a2",desc:"Mercado",value:50,date:"2026-10-10",cat:"Supermercado"},{id:"a3",desc:"Uber",value:30,date:"2026-10-21",cat:"Transporte"},{id:"a4",desc:"Salário",value:3000,date:"2026-10-05",cat:"Receita",inc:true},{id:"a5",desc:"Mercado",value:70,date:"2026-09-10",cat:"Supermercado"})'
  );
  const A = (txt, re, name) => {
    const r = draft(txt);
    ok(
      name || txt,
      r.type === 'answer' && re.test(r.text),
      r.text && r.text.replace(/\s+/g, ' ').slice(0, 140)
    );
  };
  A('quanto gastei este mês?', /R\$\s*180,00/, 'total do mês');
  A('quanto gastei com mercado este mês', /R\$\s*150,00/, 'por categoria');
  A('quanto gastei com mercado no mês passado', /R\$\s*70,00/, 'mês passado');
  A('quanto gastei ontem', /R\$\s*30,00/, 'ontem');
  A('quanto gastei em setembro', /R\$\s*70,00/, 'por nome do mês');
  A('qual meu saldo?', /R\$\s*2\.820,00/, 'saldo');
  A('quanto recebi este mês', /R\$\s*3\.000,00/, 'receitas');
  A('qual minha maior despesa', /Mercado/, 'maior despesa');
  A('resumo do mês', /Despesas R\$\s*180,00/, 'resumo');
  A('quantos lançamentos tenho este mês?', /Foram 3/, 'contagem');
  A('o que vence esta semana?', /Não encontrei|a pagar/, 'vencimentos');
  A('qual o limite do mês?', /não definiu|Limite/, 'limite');
  A('minha fatura', /não cadastrou|fatura/, 'faturas');
  A('como estão meus sonhos', /não criou|:/, 'sonhos');
  // plurais, acentos e maiúsculas
  for (const [t, v] of [
    ['GASTEI 45 NO MERCADO', 45],
    ['Gastei R$ 45 no Mercado', 45],
    ['gastei    45   no   mercado', 45],
    ['gastei 45 no mércado', 45],
    ['  mercado 45  ', 45],
  ]) {
    T(t, (r) => D(r) && D(r).value === v, 'robustez: ' + t);
  }
  H.done('Assistente: interpretação de frases e consultas', R, { cases: n });
})();
