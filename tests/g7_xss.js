const H = require('./h');
(async () => {
  const { w, $, Q, QA, E, ok, R, signup, sub, sleep } = await H.boot();
  await signup();
  const P = [
    '<img src=x onerror=alert(1)>',
    '<script>alert(1)</script>',
    '"><svg/onload=alert(1)>',
    "'><b onmouseover=alert(1)>x</b>",
    'javascript:alert(1)',
    '<iframe src="javascript:alert(1)"></iframe>',
    '<a href="javascript:alert(1)">x</a>',
    '</td><td onclick=alert(1)>',
    '&lt;script&gt;alert(1)&lt;/script&gt;',
    '<style>*{display:none}</style>',
    '`${alert(1)}`',
    '{{constructor.constructor("alert(1)")()}}',
    '<details open ontoggle=alert(1)>',
    '<input autofocus onfocus=alert(1)>',
    '"><img src=x onerror=alert(1)>',
    '<math><mi xlink:href="javascript:alert(1)">',
    '<svg><script>alert(1)</script></svg>',
    '\\"><script>alert(1)</script>',
    '<body onload=alert(1)>',
    '<marquee onstart=alert(1)>',
    '=cmd|"/c calc"!A1',
    '@SUM(1+1)*cmd|"/c calc"!A1',
    '-2+3+cmd|"/c calc"!A1',
    '+1+1',
    '<object data="javascript:alert(1)">',
    '<embed src="javascript:alert(1)">',
    '<link rel=stylesheet href=javascript:alert(1)>',
    '<img src="x" onerror="alert(1)" />',
    '<video><source onerror=alert(1)>',
    '%3Cscript%3Ealert(1)%3C/script%3E',
  ];
  const BASE = QA('script').length,
    BSTY = QA('style').length;
  const bad = () =>
    QA('*').some((el) => [...el.attributes].some((a) => /^on/i.test(a.name))) ||
    !!w.__xss ||
    QA('img[src="x"],iframe,object,embed,video,marquee,link[rel=stylesheet][href^=javascript]').length > 0 ||
    QA('script').length > BASE ||
    QA('style').length > BSTY;
  let n = 0;
  const cm = E('cmNow()');
  for (const p of P) {
    n++;
    // 1 descrição, tag, quem, cartão em lançamentos
    E(
      'data=[{id:"x1",desc:' +
        JSON.stringify(p) +
        ',value:10,date:"' +
        cm +
        '-05",cat:"Outros",tag:' +
        JSON.stringify(p) +
        ',quem:' +
        JSON.stringify(p) +
        ',cartao:' +
        JSON.stringify(p) +
        ',forma:"Pix"},{id:"x2",desc:' +
        JSON.stringify(p) +
        ',value:20,date:"' +
        cm +
        '-06",cat:"Receita",inc:true},{id:"x3",desc:' +
        JSON.stringify(p) +
        ',value:30,date:"' +
        cm +
        '-07",cat:"Outros",pend:true,bill:true}]'
    );
    E('render()');
    for (const v of ['inicio', 'agenda', 'rel']) {
      E('go("' + v + '")');
      E('render()');
      ok(`desc/tag/quem em ${v}: ${p.slice(0, 25)}`, !bad());
    }
    E('go("lanc");seg("hist");render()');
    ok('histórico: ' + p.slice(0, 25), !bad());
    E('seg("comp");render()');
    ok('compromissos: ' + p.slice(0, 25), !bad());
    E('seg("hist");mode="del";sel=new Set(["x1","x2","x3"]);render();$("mGo").click()');
    ok('confirmação de exclusão: ' + p.slice(0, 25), !bad());
    E('$("dlg").hidden=true;mode=null;render()');
    E('openCat("Outros")');
    ok('popup da categoria: ' + p.slice(0, 25), !bad());
    E('$("cdlg").hidden=true');
    E('openInc()');
    ok('popup de receitas: ' + p.slice(0, 25), !bad());
    E('$("cdlg").hidden=true');
    // 2 categoria, cartão, conta, sonho, regra (entram pelas funções reais)
    E('addCat(' + JSON.stringify(p) + ',3)');
    E(
      'cards.push({id:"c' +
        n +
        '",n:cleanName(' +
        JSON.stringify(p) +
        ')||"c",lim:100,f:5,v:10,paid:[]});accts.push({id:"a' +
        n +
        '",n:cleanName(' +
        JSON.stringify(p) +
        ')||"a",ini:5});goals.push({id:"g' +
        n +
        '",n:cleanName(' +
        JSON.stringify(p) +
        ')||"g",a:100,g:10,p:""});rules.push({k:' +
        JSON.stringify(p.slice(0, 20)) +
        ',c:"Outros"})'
    );
    E('render()');
    for (const [pg] of [['cats'], ['cards'], ['goals'], ['rules'], ['accts'], ['dados']]) {
      E('go("config");cfgGo("' + pg + '");render()');
      ok(`config/${pg}: ${p.slice(0, 20)}`, !bad());
    }
    ok('nome de categoria sem símbolos perigosos', E('CATS.every(c=>!/[<>&"\'`\\\\]/.test(c))'));
    // 3 assistente
    E('aiReset()');
    E('$("aiIn").value=' + JSON.stringify('gastei 10 com ' + p));
    sub($('aiForm'));
    await sleep(5);
    ok('assistente: ' + p.slice(0, 25), !bad());
    const d = Q('#aiMsgs .draft');
    if (d) {
      d.querySelector('[data-a="ok"]').click();
      ok('assistente confirma sem injetar: ' + p.slice(0, 20), !bad());
    }
    // 4 CSV: fórmulas são neutralizadas
    let out = '';
    E('dlApi={save:async o=>{window.__csv=o.data}}');
    await w.exportCsv(true);
    out = w.__csv || '';
    const lines = out.split('\r\n').slice(1);
    ok(
      'CSV: nenhuma célula começa com =,+,-,@ sem aspas simples',
      lines.every((l) => !/;"[=+\-@]/.test(l))
    );
    // 5 backup ida e volta
    const bk = E('JSON.stringify(backupObj())');
    ok('backup serializa sem erro', bk.length > 10);
  }
  ok('nenhum erro de script durante tudo', w.__errs.length === 0, w.__errs.slice(0, 2).join('|'));
  H.done('Segurança: injeção de código (XSS) e planilha (CSV)', R, { cases: n });
})();
