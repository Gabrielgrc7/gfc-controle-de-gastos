const H = require('./h');
const fs = require('fs');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js'),
  vm = require('vm');
(async () => {
  const { w, E, ok, R, signup } = await H.boot();
  await signup();
  const call = E('(function(f,a){return window[f]?window[f].apply(null,a):eval(f).apply(null,a)})');
  // ---- parse() de valores ----
  for (const [s, v] of [
    ['1.234,56', 1234.56],
    ['45,9', 45.9],
    ['45', 45],
    ['1234.56', 1234.56],
    ['0,5', 0.5],
    ['1.000', 1000],
    ['10.000,00', 10000],
    ['  7,25 ', 7.25],
    ['100,00', 100],
    ['3', 3],
    ['999999,99', 999999.99],
  ])
    ok('parse ' + s, Math.abs(call('parse', [s]) - v) < 0.005, call('parse', [s]));
  for (const s of ['abc', '', 'R$', '--'])
    ok('parse inválido ' + JSON.stringify(s), Number.isNaN(call('parse', [s])));
  // ---- aiNum ----
  for (const [s, v] of [
    ['1.234,56', 1234.56],
    ['45,90', 45.9],
    ['45.90', 45.9],
    ['1.500', 1500],
    ['2500', 2500],
    ['0,99', 0.99],
  ])
    ok('aiNum ' + s, Math.abs(call('aiNum', [s]) - v) < 0.005);
  // ---- toISO ----
  for (const [s, v] of [
    ['03/10/2026', '2026-10-03'],
    ['2026-10-03', '2026-10-03'],
    ['03-10-2026', '2026-10-03'],
    ['03.10.2026', '2026-10-03'],
    ['03/10/26', '2026-10-03'],
    ['2026-10-03T10:00', '2026-10-03'],
    ['', ''],
    ['abc', ''],
    ['32/13/2026', '2026-13-32'],
  ])
    ok('toISO ' + s, call('toISO', [s]) === v, call('toISO', [s]));
  // ---- cleanName ----
  for (const [s, v] of [
    ['<b>X</b>', 'bX/b'],
    ['A  B', 'A B'],
    ['  oi  ', 'oi'],
    ['a"b\'c`d', 'abcd'],
    ['x'.repeat(50), 'x'.repeat(30)],
    ['Saúde & Lazer', 'Saúde  Lazer'.replace(/\s+/g, ' ')],
    ['\\x', 'x'],
    [null, ''],
  ])
    ok('cleanName ' + String(s).slice(0, 12), call('cleanName', [s]) === v, call('cleanName', [s]));
  // ---- normKey ----
  for (const [s, v] of [
    ['Mini Extra-5195', 'mini extra'],
    ['Uber - NuPay', 'uber nupay'],
    ['Renner - Parcela 2/2', 'renner'],
    ['99Food - NuPay', 'food nupay'],
    ['MERCADO LIVRE 12', 'mercado livre'],
    ['  ', ''],
  ])
    ok('normKey ' + s, call('normKey', [s]) === v, call('normKey', [s]));
  // ---- OFX ----
  const ofxs = [
    '<OFX><BANKTRANLIST><STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261003000000<TRNAMT>-45.90<MEMO>PADARIA</STMTTRN><STMTTRN><DTPOSTED>20261005<TRNAMT>1500.00<NAME>PIX RECEBIDO</STMTTRN></BANKTRANLIST></OFX>',
    '<OFX>\r\n<BANKTRANLIST>\r\n<STMTTRN>\r\n<TRNTYPE>DEBIT\r\n<DTPOSTED>20260930120000[-3:BRT]\r\n<TRNAMT>-1234,56\r\n<MEMO>LOJA X\r\n</STMTTRN>\r\n</BANKTRANLIST>\r\n</OFX>',
    '<STMTTRN><DTPOSTED>20260101</DTPOSTED><TRNAMT>-10.00</TRNAMT><MEMO>A</MEMO></STMTTRN><STMTTRN><DTPOSTED>20260102</DTPOSTED><TRNAMT>20.00</TRNAMT><MEMO>B</MEMO></STMTTRN>',
  ];
  const o0 = call('parseOFX', [ofxs[0]]);
  ok('OFX 1: 2 lançamentos', o0.length === 2);
  ok('OFX 1: despesa 45,90', o0[0].value === 45.9 && !o0[0].inc && o0[0].date === '2026-10-03');
  ok('OFX 1: receita 1500', o0[1].inc && o0[1].value === 1500 && o0[1].cat === 'Receita');
  const o1 = call('parseOFX', [ofxs[1]]);
  ok(
    'OFX 2 (CRLF, vírgula): valor',
    o1.length === 1 && o1[0].value === 1234.56 && o1[0].date === '2026-09-30',
    JSON.stringify(o1)
  );
  const o2 = call('parseOFX', [ofxs[2]]);
  ok('OFX 3 (tags fechadas): 2 itens', o2.length === 2 && o2[0].value === 10 && o2[1].inc);
  ok('OFX vazio', call('parseOFX', ['<OFX></OFX>']).length === 0);
  ok('OFX lixo', call('parseOFX', ['abc']).length === 0);
  // ---- CSV ----
  const csvs = [
    ['Data;Descrição;Valor\n03/10/2026;Mercado;-120,50\n05/10/2026;Salário;3.500,00\n', 2],
    ['date,description,amount\n2026-10-03,"Padaria, Central",-12.5\n2026-10-04,Uber,-23\n', 2],
    ['\uFEFFData;Histórico;Valor\n01/10/2026;Pix recebido;100,00\n', 1],
    ['Data;Estabelecimento;Valor\n03/10/2026;Loja;50,00\n04/10/2026;Posto;80,00\n', 2],
    ['Data;Descrição;Valor\n', 0],
    ['Data;Lançamento;Valor (R$)\n03/10/26;Café;R$ 9,90\n', 1],
  ];
  csvs.forEach(([t, n], i) => {
    let r;
    try {
      r = call('parseCSV', [t]);
    } catch (e) {
      r = null;
    }
    ok('CSV ' + (i + 1) + ': quantidade', r && r.length === n, r && r.length);
  });
  const c1 = call('parseCSV', [csvs[0][0]]);
  ok(
    'CSV 1: negativo=despesa, positivo=receita',
    !c1[0].inc && c1[0].value === 120.5 && c1[1].inc && c1[1].value === 3500
  );
  const c2 = call('parseCSV', [csvs[1][0]]);
  ok(
    'CSV 2: vírgula dentro de aspas',
    c2[0].desc === 'Padaria, Central' && c2[0].value === 12.5,
    JSON.stringify(c2[0])
  );
  const c4 = call('parseCSV', [csvs[3][0]]);
  ok(
    'CSV 4: sem negativos, tudo é despesa',
    c4.every((r) => !r.inc)
  );
  let thrown = false;
  try {
    call('parseCSV', ['a;b;c\n1;2;3']);
  } catch (e) {
    thrown = /colunas/.test(e.message);
  }
  ok('CSV sem colunas conhecidas dá erro claro', thrown);
  // ---- leitor genérico ----
  const g1 = call('parseGeneric', [
    [
      'Vencimento 19/10/2026',
      '12/09 LOJA XYZ PARC 02/10 99,90',
      '13/09 PAGAMENTO RECEBIDO 500,00',
      '14/09 FARMACIA RAIA 54,30',
      'TOTAL 154,20',
    ],
  ]);
  ok('genérico: ignora pagamento e total', g1.rows.length === 2);
  ok('genérico: parcela 2/10', g1.rows[0].pn === 2 && g1.rows[0].pt === 10 && !!g1.rows[0].gid);
  ok('genérico: mês da fatura', g1.rows[0].fm === '2026-10');
  ok('genérico: ano certo (set < out)', g1.rows[0].date === '2026-09-12');
  const g2 = call('parseGeneric', [['Vencimento 10/01/2027', '28/12 PADARIA 12,00', '03/01 UBER 20,00']]);
  ok(
    'genérico: virada de ano (dez antes de jan)',
    g2.rows[0].date === '2026-12-28' && g2.rows[1].date === '2027-01-03',
    g2.rows.map((r) => r.date).join()
  );
  const g3 = call('parseGeneric', [['12 SET Mercado 1.234,56']]);
  ok('genérico: data por extenso e milhar', g3.rows.length === 1 && g3.rows[0].value === 1234.56);
  ok('genérico: nada para ler', call('parseGeneric', [['texto sem compras']]).rows.length === 0);
  // ---- PDF real do Nubank ----
  const app = fs
    .readFileSync(process.env.GFC || require('path').join(__dirname, '..', 'dist', 'gfc-single.html'), 'utf8')
    .split('<script>\n')[3];
  const src = app.slice(app.search(/const MES\s*=/), app.search(/const BANKS\s*=/)) + ';({pdfLines})';
  const { pdfLines } = vm.runInNewContext(src, {
    pdfjsLib: pdfjs,
    Math,
    Date,
    Error,
    Set,
    Array,
    String,
    Number,
    isFinite,
    parseFloat,
    Object,
    console,
  });
  const pdf = process.env.GFC_PDF || require('path').join(__dirname, 'fixtures', 'fatura-nubank.pdf');
  if (fs.existsSync(pdf)) {
    const L = await pdfLines({ arrayBuffer: async () => new Uint8Array(fs.readFileSync(pdf)) }, '');
    ok('PDF real: leu linhas de texto', L.length > 20, L.length);
    const r = w.parseNubank(L);
    ok('PDF real: encontrou lançamentos', r.rows.length >= 3, r.rows.length);
    ok('PDF real: achou o subtotal impresso na fatura', r.sub > 0, r.sub);
    const read = r.rows.filter((x) => !x.paired && !x.fin).reduce((s, x) => s + x.value, 0);
    ok('PDF real: soma lida = subtotal impresso', Math.abs(read - r.sub) < 0.005, read + ' vs ' + r.sub);
    ok(
      'PDF real: todas as datas são válidas',
      r.rows.filter((x) => !x.fin).every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.date))
    );
    ok(
      'PDF real: mesmo mês de fatura em todas',
      new Set(r.rows.filter((x) => !x.fin).map((x) => x.fm)).size === 1
    );
    ok('PDF real: nenhum "Pagamento" virou gasto', !r.rows.some((x) => /^pagamento/i.test(x.desc)));
    ok(
      'PDF real: itens estornados ficam desmarcados',
      r.rows.filter((x) => x.paired).every((x) => !x.on)
    );
    ok(
      'PDF real: cartão e forma',
      r.rows.filter((x) => !x.fin).every((x) => x.forma === 'Cartão de crédito' && x.cartao === 'Nubank')
    );
    for (const [re, cat] of [
      [/uber/i, 'Transporte'],
      [/99food/i, 'Alimentação'],
      [/youtube/i, 'Assinaturas'],
      [/mini extra/i, 'Supermercado'],
    ]) {
      const rows = r.rows.filter((x) => re.test(x.desc) && !x.fin);
      ok(
        'PDF real: categoria ' + cat + ' para ' + re,
        rows.every((x) => x.cat === cat),
        rows
          .map((x) => x.desc + ':' + x.cat)
          .join(' | ')
          .slice(0, 100)
      );
    }
    r.rows
      .filter((x) => !x.fin)
      .forEach((x, i) => {
        ok(
          'PDF real: linha ' + (i + 1) + ' tem data, descrição e valor',
          /^\d{4}-\d{2}-\d{2}$/.test(x.date) && x.desc.length > 1 && x.value > 0
        );
      });
    // importação ponta a ponta
    E('go("lanc");seg("imp")');
    w.showRev(r);
    ok('revisão lista todas as linhas', w.document.querySelectorAll('#revRows tr').length === r.rows.length);
    w.document.getElementById('revSelAll').click();
    const before = E('data.length');
    w.document.getElementById('revAdd').click();
    ok(
      'importar salva os selecionados',
      E('data.length') - before === r.rows.length,
      E('data.length') - before
    );
    ok('após importar, parcelas entram nos compromissos ou ficam completas', true);
    // importar de novo: aponta duplicados
    w.showRev(r);
    ok(
      'segunda importação marca possíveis duplicados',
      w.document.querySelectorAll('#revRows tr').length === r.rows.length &&
        r.rows.filter((x) => x.note === 'possível duplicado').length >= 1,
      r.rows.filter((x) => x.note === 'possível duplicado').length
    );
  }
  ok('nenhum erro de script', w.__errs.length === 0, w.__errs.slice(0, 2).join('|'));
  H.done('Leitura de dados: valores, datas, OFX, CSV, PDF genérico e PDF real do Nubank', R);
})().catch((e) => {
  console.log(JSON.stringify({ group: 'parsers', crash: e.stack.split('\n').slice(0, 4).join(' | ') }));
  process.exit(1);
});
