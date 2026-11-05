const H = require('./h'),
  fs = require('fs'),
  vm = require('vm'),
  path = require('path');
/* Fatura fictícia no formato da Nomad (nomes, valores e números inventados). Total = 1.000,50. */
const SINT = [
  'Maria Exemplo,',
  'Esta é a sua fatura de',
  'Dezembro',
  'Total a pagar Pagamento mínimo',
  'R$ 1.000,50 R$ 1.000,50',
  'Período 21/12/2026 a 20/01/2027 (30 dias)',
  'Data de fechamento 20/01/2027',
  'Vencimento 26/01/2027',
  'MARIA EXEMPLO 0000 / 0000 / 0000 / 0000',
  'Alternativas de pagamento para a sua fatura no valor de R$ 1.000,50',
  'MARIA EXEMPLO Limite de crédito Limite de saque',
  '0000 / 0000 / R$ 5.000,00 R$ 0,00',
  '0000 / 0000',
  'Resumo de transações Valores em Reais',
  'Saldo do período anterior R$ 800,00',
  'Pagamento recebidos -R$ 800,00',
  'Compras R$ 1.000,00',
  'IOF R$ 0,50',
  'Saldo do período R$ 1.000,50',
  'Próximas faturas',
  'Fechamento da próxima fatura 20/02/2027',
  'MARIA EXEMPLO 0000 / 0000 / 0000 / 0000',
  'Transações do período de 21/12/2026 a 20/01/2027 Valores em Reais',
  '10/11/2026 PARC=101LOJA ALFA 3/3 R$ 100,00',
  '15/12/2026 PARC=106 VIAGEM BETA * AB12CD 2/6 R$ 150,00',
  '21/12/2026 Seguradora Gama R$ 200,00',
  '22/12/2026 DL*UberRides R$ 30,50',
  '25/12/2026 Pagamento efetuado - R$ 800,00',
  '26/12/2026 APP*ASSINATURA SUBSCR R$ 40,00',
  'Inclui Imposto sobre Operações Financeiras: R$ 0,50',
  '27/12/2026 MERCADO CENTRAL R$ 180,00',
  '28/12/2026 FEIRA 13/12 R$ 5,00',
  '29/12/2026 ESTORNO TESTE R$ 25,00',
  'MARIA EXEMPLO 0000 / 0000 / 0000 / 0000',
  'Transações do período de 21/12/2026 a 20/01/2027 Valores em Reais',
  '05/01/2027 Estorno de ESTORNO TESTE - R$ 25,00',
  '10/01/2027 FARMACIA DELTA R$ 120,00',
  '12/01/2027 PADARIA EPSILON R$ 75,00',
  '18/01/2027 PARC=103LOJA ZETA 1/3 R$ 100,00',
  'De acordo com os termos da Lei 12.007 de 2009, informamos que todos os débitos foram quitados.',
  'Encargos e Custo Efetivo Total (CET) válidos para o próximo período',
  'Juros Rotativo/Atraso 13.99% a.m. | CET: 419.5% a.a.',
  'NOMAD TECNOLOGIA E PARTICIPAÇÕES LTDA Se tiver alguma dúvida sobre o extrato da sua conta,',
  '• Por mail: support@nomadglobal.com',
  'Número de documento CPF/CNPJ Vencimento Valor Documento',
  '2500000000 000.000.000-00 26/01/2027 1000.50',
  'Vencimento',
  '26/01/2027',
];
(async () => {
  const { w, $, E, ok, R, signup, sleep } = await H.boot();
  const L = JSON.stringify(SINT),
    call = (js) => E('(()=>{const L=' + L + ';return ' + js + '})()');
  const r = call('parseNomad(L)');
  // ---- leitura da fatura fictícia ----
  ok(
    'o leitor da Nomad está registrado',
    E('typeof BANKS.nomad.parse') === 'function' && E('typeof BANKS.nomad.detect') === 'function'
  );
  ok(
    'a lista de bancos da tela inclui a Nomad',
    [...$('bank').options].some((o) => o.value === 'nomad')
  );
  ok('reconhece que é uma fatura da Nomad', call('isNomad(L)') === true);
  ok(
    'não confunde com outra fatura',
    E("isNomad(['Nu Pagamentos','TRANSAÇÕES DE 10 SET A 10 OUT','10 SET Mercado R$ 10,00'])") === false
  );
  ok('lê 11 lançamentos (10 compras e a compra estornada)', r.rows.length === 11, r.rows.length);
  ok('o pagamento da fatura anterior não vira gasto', !r.rows.some((x) => /^pagamento/i.test(x.desc)));
  ok('a linha do IOF não vira lançamento', !r.rows.some((x) => /imposto|inclui/i.test(x.desc)));
  ok('o IOF fica dentro do valor da compra', r.rows.find((x) => /ASSINATURA/.test(x.desc)).value === 40);
  ok('o total da fatura é o "Saldo do período"', r.sub === 1000.5, r.sub);
  const read = r.rows.filter((x) => !x.paired).reduce((a, x) => a + x.value, 0);
  ok('a soma lida bate com o total da fatura', Math.abs(read - r.sub) < 0.005, read);
  ok(
    'todas as compras entram na fatura do mês do vencimento',
    r.rows.every((x) => x.fm === '2027-01'),
    [...new Set(r.rows.map((x) => x.fm))].join()
  );
  ok(
    'é cartão de crédito Nomad',
    r.rows.every((x) => x.forma === 'Cartão de crédito' && x.cartao === 'Nomad')
  );
  ok(
    'datas no formato certo',
    r.rows.every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.date))
  );
  ok(
    'a data da compra é a que está na fatura',
    r.rows.find((x) => /LOJA ALFA/.test(x.desc)).date === '2026-11-10'
  );
  const alfa = r.rows.find((x) => /LOJA ALFA/.test(x.desc)),
    viagem = r.rows.find((x) => /VIAGEM BETA/.test(x.desc)),
    zeta = r.rows.find((x) => /LOJA ZETA/.test(x.desc));
  ok(
    'parcela 3/3: tira o código PARC= e guarda a parcela',
    alfa.desc === 'LOJA ALFA - Parcela 3/3' && alfa.kind === 'p' && alfa.pn === 3 && alfa.pt === 3,
    alfa.desc
  );
  ok(
    'parcela com espaço depois do código',
    viagem.desc === 'VIAGEM BETA * AB12CD - Parcela 2/6' && viagem.pn === 2 && viagem.pt === 6,
    viagem.desc
  );
  ok('parcela 1/3 de outra loja', zeta.pn === 1 && zeta.pt === 3 && zeta.value === 100);
  ok(
    'cada compra parcelada tem um identificador próprio',
    new Set([alfa.gid, viagem.gid, zeta.gid]).size === 3 && /^g/.test(alfa.gid)
  );
  ok(
    'o identificador é o mesmo se a fatura for lida de novo',
    call('parseNomad(L).rows.find(x=>/LOJA ALFA/.test(x.desc)).gid') === alfa.gid
  );
  ok('compra à vista não é parcela', !r.rows.find((x) => /Gama/.test(x.desc)).kind);
  const feira = r.rows.find((x) => /FEIRA/.test(x.desc));
  ok(
    '"13/12" no nome da loja não vira parcela (parcela 13 de 12 não existe)',
    feira.desc === 'FEIRA 13/12' && !feira.kind,
    feira.desc
  );
  const est = r.rows.find((x) => /ESTORNO TESTE/.test(x.desc));
  ok(
    'compra estornada fica desmarcada com aviso',
    est.paired === true && est.on === false && est.note === 'estornada'
  );
  ok('o estorno em si não vira lançamento', !r.rows.some((x) => x.neg || /^estorno de/i.test(x.desc)));
  ok(
    'sugere o cartão com limite, fechamento e vencimento',
    JSON.stringify(r.card) === JSON.stringify({ n: 'Nomad', lim: 5000, f: 20, v: 26 }),
    JSON.stringify(r.card)
  );
  ok(
    'nada pessoal da fatura vai para os lançamentos',
    !/MARIA|0000|000\.000|support@|nomadglobal/i.test(JSON.stringify(r))
  );
  // ---- erros ----
  const err = (js) => {
    try {
      call(js);
      return '';
    } catch (e) {
      return e.message;
    }
  };
  ok(
    'sem vencimento: erro claro',
    /vencimento/i.test(err('parseNomad(L.filter(l=>!/^Vencimento\\s+\\d/.test(l)))'))
  );
  ok(
    'sem transações: lista vazia (o app avisa "nenhuma compra")',
    call('parseNomad(L.slice(0,22)).rows.length') === 0
  );
  ok(
    'sem o saldo do período, ainda lê (sem conferência)',
    call('parseNomad(L.filter(l=>!/^Saldo do per/.test(l))).sub') === null
  );
  ok(
    'sem limite, não sugere cartão',
    call('parseNomad(L.filter(l=>!/Limite de cr/.test(l)&&!/R\\$ 5.000,00/.test(l))).card') === null
  );
  // ---- tela: conferência, cartão novo e mês aberto ----
  await signup('n@x.com', 'N');
  ok(
    'a fatura lida já traz a categoria do app (Uber é Transporte)',
    call('parseNomad(L)').rows.find((x) => /UberRides/.test(x.desc)).cat === 'Transporte'
  );
  // ---- categorias de lojas comuns (nomes públicos) ----
  for (const [d, c] of [
    ['MERCADO*MERCADOLIVRE', 'Compras'],
    ['Mercado Bom Preço', 'Supermercado'],
    ['APPLE.COM/BILL', 'Assinaturas'],
    ['OPENAI *CHATGPT SUBSCR', 'Assinaturas'],
    ['AIRBNB PAGAM*AIRBNB * HM8', 'Lazer'],
    ['SODIMAC 0003', 'Moradia'],
    ['MP *DESENTUPIDORA', 'Moradia'],
    ['Pier Seguradora', 'Contas'],
    ['DONNA CACAU CASA', 'Alimentação'],
    ['TROPICAL SETE SUCOS E', 'Alimentação'],
    ['VMT*LAVATERIA', 'Cuidados pessoais'],
    ['INDITEX BRASIL LT', 'Compras'],
    ['Clínica Odontológica Dente Feliz', 'Saúde'],
    ['DL*UberRides', 'Transporte'],
    ['AUTO POSTO THABOR', 'Transporte'],
    ['CONTA VIVO', 'Contas'],
    ['LOJA SEM NOME CONHECIDO', 'A revisar'],
  ])
    ok(
      'categoria de ' + d + ' é ' + c,
      E('catByKey(catOf(' + JSON.stringify(d) + '))') === c,
      E('catByKey(catOf(' + JSON.stringify(d) + '))')
    );

  E('go("lanc");seg("imp")');
  E('(()=>{const L=' + L + ';showRev(parseNomad(L))})()');
  ok(
    'a tela de conferência mostra a soma batendo',
    /✓/.test($('revChk').textContent) && /3|1\.000,50/.test($('revChk').textContent),
    $('revChk').textContent
  );
  ok(
    'a tela avisa que o cartão será cadastrado',
    /cartão Nomad será cadastrado/i.test($('revChk').textContent) &&
      /fecha dia 20/.test($('revChk').textContent) &&
      /vence dia 26/.test($('revChk').textContent),
    $('revChk').textContent
  );
  ok(
    'a tela lista as compras (e a estornada desmarcada)',
    document_rows() === 11 &&
      w.document.querySelectorAll('#revRows input[type=checkbox]:not(:checked)').length === 1,
    document_rows()
  );
  function document_rows() {
    return w.document.querySelectorAll('#revRows tr').length;
  }
  ok('mostra "Parcela n/m" nas parceladas', /Parcela 3\/3/.test($('revRows').textContent));
  $('revAdd').click();
  ok('adiciona as compras marcadas (10)', E('data.length') === 10, E('data.length'));
  ok(
    'o cartão Nomad foi cadastrado com os dados da fatura',
    JSON.stringify(E('cards.map(c=>({n:c.n,lim:c.lim,f:c.f,v:c.v}))')) ===
      JSON.stringify([{ n: 'Nomad', lim: 5000, f: 20, v: 26 }]),
    JSON.stringify(E('cards'))
  );
  ok(
    'a mensagem final avisa do cartão',
    /10 lançamentos adicionados\. Cartão Nomad cadastrado\./.test($('impMsg').textContent),
    $('impMsg').textContent
  );
  ok(
    'o mês aberto é o que tem mais compras importadas',
    E("$('month').value") === '2026-12',
    E("$('month').value")
  );
  ok(
    'as compras ficam na fatura de janeiro e somam o total da fatura',
    Math.abs(E('data.filter(x=>x.fm==="2027-01").reduce((a,x)=>a+x.value,0)') - 1000.5) < 0.005
  );
  ok(
    'as parcelas ficam gravadas como parcelas',
    E('data.filter(x=>x.kind==="p").length') === 3 && E('data.filter(x=>x.cartao==="Nomad").length') === 10
  );
  // importar de novo marca tudo como possível duplicado e não recria o cartão
  E('(()=>{const L=' + L + ';showRev(parseNomad(L))})()');
  ok(
    'segunda importação: tudo marcado como possível duplicado',
    E('imp.filter(x=>x.note==="possível duplicado").length') >= 9,
    E('imp.filter(x=>x.note==="possível duplicado").length')
  );
  ok(
    'segunda importação: não oferece cadastrar o cartão de novo',
    !/será cadastrado/.test($('revChk').textContent)
  );
  ok('segunda importação: nada marcado para adicionar', E('imp.filter(x=>x.on).length') === 0);
  // ---- PDF fictício de verdade (gerado com dados inventados) lido pelo pdf.js ----
  {
    const pdfjs = require('pdfjs-dist/legacy/build/pdf.js'),
      app = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'features', 'import-pdf.js'), 'utf8');
    const src = app.slice(app.search(/const MES\s*=/), app.search(/const BANKS\s*=/)) + ';({pdfLines})';
    const { pdfLines } = vm.runInNewContext(src, { pdfjsLib: pdfjs, Uint8Array, Error, Math });
    const f = path.join(__dirname, 'data', 'fatura-nomad-ficticia.pdf');
    const LR = await pdfLines({ arrayBuffer: async () => new Uint8Array(fs.readFileSync(f)) }, '');
    const rf = JSON.parse(w.eval('JSON.stringify(parseNomad(' + JSON.stringify(LR) + '))'));
    ok('PDF fictício: reconhecido como Nomad', w.eval('isNomad(' + JSON.stringify(LR) + ')') === true);
    ok('PDF fictício: 11 compras lidas de um PDF de verdade', rf.rows.length === 11, rf.rows.length);
    ok('PDF fictício: total da fatura', rf.sub === 1000.5, rf.sub);
    ok(
      'PDF fictício: a soma bate',
      Math.abs(rf.rows.filter((x) => !x.paired).reduce((a, x) => a + x.value, 0) - rf.sub) < 0.005
    );
    ok(
      'PDF fictício: parcelas e cartão sugerido',
      rf.rows.filter((x) => x.kind === 'p').length === 3 &&
        rf.card &&
        rf.card.lim === 5000 &&
        rf.card.f === 20 &&
        rf.card.v === 26
    );
    ok(
      'PDF fictício: resultado igual ao das linhas de texto',
      JSON.stringify(rf.rows.map((x) => [x.date, x.desc, x.value])) ===
        JSON.stringify(r.rows.map((x) => [x.date, x.desc, x.value]))
    );
  }
  // ---- fatura real (opcional: coloque o PDF em tests/fixtures/fatura-nomad.pdf, que o .gitignore não deixa subir) ----
  const pdf = process.env.GFC_PDF_NOMAD || path.join(__dirname, 'fixtures', 'fatura-nomad.pdf');
  let realRan = false;
  if (fs.existsSync(pdf)) {
    const pdfjs = require('pdfjs-dist/legacy/build/pdf.js'),
      app = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'features', 'import-pdf.js'), 'utf8');
    const src = app.slice(app.search(/const MES\s*=/), app.search(/const BANKS\s*=/)) + ';({pdfLines})';
    const { pdfLines } = vm.runInNewContext(src, { pdfjsLib: pdfjs, Uint8Array, Error, Math });
    const LR = await pdfLines({ arrayBuffer: async () => new Uint8Array(fs.readFileSync(pdf)) }, '');
    const rr = JSON.parse(w.eval('JSON.stringify(parseNomad(' + JSON.stringify(LR) + '))'));
    realRan = true;
    ok('PDF real da Nomad: reconhecido como Nomad', w.eval('isNomad(' + JSON.stringify(LR) + ')') === true);
    ok('PDF real da Nomad: leu várias compras', rr.rows.length >= 5, rr.rows.length);
    ok('PDF real da Nomad: achou o total da fatura', rr.sub > 0, rr.sub);
    const sum = rr.rows.filter((x) => !x.paired).reduce((a, x) => a + x.value, 0);
    ok(
      'PDF real da Nomad: a soma lida bate com o total da fatura',
      Math.abs(sum - rr.sub) < 0.005,
      sum + ' vs ' + rr.sub
    );
    ok(
      'PDF real da Nomad: mesmo mês de fatura em todas',
      new Set(rr.rows.map((x) => x.fm)).size === 1 && /^\d{4}-\d{2}$/.test(rr.rows[0].fm)
    );
    ok(
      'PDF real da Nomad: pagamento anterior não virou gasto',
      !rr.rows.some((x) => /^pagamento/i.test(x.desc))
    );
    ok('PDF real da Nomad: sem código PARC= nas descrições', !rr.rows.some((x) => /PARC=/i.test(x.desc)));
    ok(
      'PDF real da Nomad: parcelas têm n e total',
      rr.rows.filter((x) => x.kind === 'p').every((x) => x.pn >= 1 && x.pn <= x.pt && x.gid)
    );
    ok(
      'PDF real da Nomad: todas as linhas têm data, descrição e valor',
      rr.rows.every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.date) && x.desc.length > 1 && x.value > 0)
    );
    ok(
      'PDF real da Nomad: sugere o cartão',
      !!rr.card && rr.card.lim > 0 && rr.card.f >= 1 && rr.card.v >= 1
    );
    ok(
      'PDF real da Nomad: nada de dados pessoais nas linhas',
      !/\d{3}\.\d{3}\.\d{3}-\d{2}|\d{4} \/ \d{4}/.test(JSON.stringify(rr.rows))
    );
  }
  ok('nenhum erro de script', w.__errs.length === 0, w.__errs.slice(0, 3).join('|'));
  H.done('Fatura da Nomad (PDF)', R, { pdfReal: realRan });
})()
  .then(() => 0)
  .catch((e) => {
    console.log(JSON.stringify({ group: 'nomad', crash: e.stack.split('\n').slice(0, 5).join(' | ') }));
    process.exit(1);
  });
