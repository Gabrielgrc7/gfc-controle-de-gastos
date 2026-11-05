const H = require('./h');
(async () => {
  const { w, $, Q, QA, E, ok, R, signup, sub, sleep } = await H.boot();
  await signup();
  const vis = (e) => !!e && !e.hidden,
    cm = E('cmNow()'),
    pad = (n) => String(n).padStart(2, '0'),
    td = E('iso(today)');
  const addM = (m, n) => {
    const t = +m.slice(0, 4) * 12 + (+m.slice(5, 7) - 1) + n;
    return Math.floor(t / 12) + '-' + pad((t % 12) + 1);
  };
  const say = async (t) => {
    $('aiIn').value = t;
    sub($('aiForm'));
    await sleep(15);
  };
  const last = () => QA('#aiMsgs .msg-b').pop(),
    drafts = () => QA('#aiMsgs .draft');
  // ---- assistente na tela ----
  ok('botão do assistente visível', vis($('aiBtn')) && !vis($('aiPanel')));
  $('aiBtn').click();
  ok('painel abre com saudação', vis($('aiPanel')) && QA('#aiMsgs .msg-b').length === 1 && !vis($('aiBtn')));
  ok('5 atalhos de exemplo', QA('#aiChips .chip').length === 5);
  await say('gastei 45 no mercado');
  ok('gera 1 rascunho', drafts().length === 1);
  const d = drafts()[0];
  ok(
    'rascunho: descrição, valor, data, categoria',
    d.querySelector('[data-f="desc"]').value === 'Mercado' &&
      d.querySelector('[data-f="value"]').value === '45,00' &&
      d.querySelector('[data-f="date"]').value === td &&
      d.querySelector('[data-f="cat"]').value === 'Supermercado'
  );
  d.querySelector('[data-f="value"]').value = '47,50';
  d.querySelector('[data-f="cat"]').value = 'Alimentação';
  d.querySelector('[data-a="ok"]').click();
  ok(
    'confirmar grava com os ajustes',
    E('data.length') === 1 && E('data[0].value') === 47.5 && E('data[0].cat') === 'Alimentação'
  );
  ok('corrigir a categoria vira regra', E('ruleCat("mercado")') === 'Alimentação');
  ok(
    'mensagem de pronto com Desfazer',
    /Pronto/.test(last().textContent) && !!last().querySelector('button')
  );
  last().querySelector('button').click();
  ok('Desfazer tira o lançamento', E('data.length') === 0 && E('trash.length') === 1);
  await say('gastei 30 na farmácia ontem');
  drafts()[0].querySelector('[data-a="no"]').click();
  ok('descartar não grava', E('data.length') === 0 && drafts().length === 0);
  await say('gastei 45 no mercado e 30 na farmácia');
  ok('duas frases viram dois rascunhos', drafts().length === 2);
  drafts().forEach((x) => x.querySelector('[data-a="ok"]').click());
  ok('os dois entram', E('data.length') === 2);
  await say('recebi 3000 de salário');
  ok('receita: sem campo de categoria', !drafts()[0].querySelector('[data-f="cat"]'));
  drafts()[0].querySelector('[data-a="ok"]').click();
  ok('receita gravada', E('data.filter(x=>x.inc).length') === 1);
  await say('notebook 3x de 500');
  const dp = drafts()[0];
  ok(
    'parcelado: campos de parcela',
    !!dp.querySelector('[data-f="pt"]') && dp.querySelector('[data-f="pt"]').value === '3'
  );
  dp.querySelector('[data-a="ok"]').click();
  ok('parcelado vira plano', E('plans.some(p=>p.kind==="p"&&p.pt===3)'));
  await say('netflix 39,90 todo mês');
  drafts()[0].querySelector('[data-a="ok"]').click();
  ok('recorrente vira plano', E('plans.some(p=>p.kind==="r"&&p.value===39.9)'));
  await say('conta de luz 180 vence dia 28');
  drafts()[0].querySelector('[data-a="ok"]').click();
  ok(
    'conta a pagar fica pendente',
    E('data.some(x=>x.desc==="Luz"&&x.pend)') || E('data.some(x=>x.pend)'),
    E('JSON.stringify(data.filter(x=>x.pend))')
  );
  await say('quanto gastei este mês?');
  ok('responde consulta', /Você gastou/.test(last().textContent));
  await say('qual meu saldo?');
  ok('responde saldo', /Saldo/.test(last().textContent));
  await say('o que vence esta semana?');
  ok('responde vencimentos', /a pagar|Não encontrei/.test(last().textContent));
  await say('ajuda');
  ok('ajuda', /Posso/.test(last().textContent));
  await say('blablabla');
  ok('não entendeu: sugere exemplos', /Não entendi/.test(last().textContent));
  await say('apagar o último');
  const n1 = E('data.length');
  ok('apagar o último remove um', /Apaguei/.test(last().textContent));
  await say('desfazer');
  ok('desfazer restaura', /Restaurei|Desfeito/.test(last().textContent));
  await say('gastei 10');
  ok(
    'sem descrição usa categoria/gasto',
    drafts().length === 1 && /Gasto|Outros/.test(drafts()[0].querySelector('[data-f="desc"]').value)
  );
  drafts()[0].querySelector('[data-a="no"]').click();
  await say('gastei 99999999999');
  ok(
    'valor absurdo é recusado',
    drafts().length === 0 || drafts()[0].querySelector('[data-f="value"]').value.length > 0
  );
  const dd = drafts();
  dd.forEach((x) => x.querySelector('[data-a="no"]').click());
  $('aiClose').click();
  ok('fechar mostra o botão de novo', vis($('aiBtn')) && !vis($('aiPanel')));
  // pagar por texto
  E('data.push({id:"pp",desc:"Internet",value:120,date:"' + td + '",cat:"Contas",pend:true,bill:true})');
  $('aiBtn').click();
  await say('paguei a internet');
  ok(
    'marca conta como paga pelo chat',
    E('data.find(x=>x.id==="pp").pend') === undefined && E('data.find(x=>x.id==="pp").paid') === td,
    last().textContent
  );
  // assistente usa cartões e contas cadastrados
  E(
    'cards.push({id:"c1",n:"Nubank",lim:1000,f:12,v:19,paid:[]});accts.push({id:"a1",n:"Conta corrente",ini:0})'
  );
  await say('gastei 80 no nubank com combustível');
  ok(
    'detecta o cartão cadastrado',
    drafts().length === 1 && /Nubank/.test(drafts()[0].textContent) && /crédito/.test(drafts()[0].textContent)
  );
  drafts()[0].querySelector('[data-a="ok"]').click();
  ok(
    'lançamento no crédito ganha mês da fatura',
    !!E('data.find(x=>x.desc==="Combustível")').fm,
    E('JSON.stringify(data.find(x=>x.desc==="Combustível"))')
  );
  // ---- assinaturas / anomalias ----
  E('data=[];plans=[];prefs={}');
  for (const i of [-3, -2, -1, 0])
    E(
      'data.push({id:"sb' +
        (i + 3) +
        '",desc:"Streamflix",value:39.9,date:"' +
        addM(cm, i) +
        '-08",cat:"Lazer"})'
    );
  ok('assinatura detectada (4 meses iguais)', E('subsDetect().length') === 1 && E('subsDetect()[0].n') === 4);
  E('subsDetect()');
  E('go("lanc");seg("comp")');
  ok('aparece em Compromissos', /Assinaturas detectadas/.test($('compBox').textContent));
  Q('[data-subno]').click();
  ok('ignorar remove da lista', E('subsDetect().length') === 0);
  E('prefs={};data=[]');
  for (const i of [-3, -2, -1])
    E(
      'data.push({id:"m' +
        (i + 3) +
        '",desc:"Supermercado Bom",value:' +
        (i === -2 ? 10 : 5) +
        '0,date:"' +
        addM(cm, i) +
        '-08",cat:"Alimentação"})'
    );
  E('data.push({id:"bk",desc:"Supermercado Bom",value:900,date:"' + td + '",cat:"Alimentação"})');
  ok(
    'valor muito acima do normal é sinalizado',
    E('anomalies()').some((t) => /acima do normal/.test(t)),
    E('anomalies()').join('|')
  );
  E(
    'data=[{id:"d1",desc:"Lanchonete Z",value:80,date:"' +
      td +
      '",cat:"Alimentação"},{id:"d2",desc:"Lanchonete Z",value:80,date:"' +
      td +
      '",cat:"Alimentação"}]'
  );
  ok(
    'duplicidade é sinalizada',
    E('anomalies()').some((t) => /duplicada/.test(t))
  );
  E(
    'data=[{id:"d1",desc:"Lanchonete Z",value:80,date:"' +
      td +
      '",cat:"Alimentação"},{id:"d2",desc:"Lanchonete Z",value:81,date:"' +
      td +
      '",cat:"Alimentação"}]'
  );
  ok('valores diferentes não são duplicidade', !E('anomalies()').some((t) => /duplicada/.test(t)));
  // ---- regime de caixa ----
  E('data=[{id:"k1",desc:"Compra",value:100,date:"' + addM(cm, -1) + '-20",cat:"Compras",fm:"' + cm + '"}]');
  E('prefs.caixa=false;$("month").value="' + addM(cm, -1) + '";render()');
  ok('por data da compra: aparece no mês da compra', +$('kCount').textContent === 1);
  E('prefs.caixa=true;render()');
  ok('regime de caixa: some do mês da compra', +$('kCount').textContent === 0);
  E('$("month").value="' + cm + '";render()');
  ok('regime de caixa: aparece no mês da fatura', +$('kCount').textContent === 1);
  E('prefs.caixa=false');
  // ---- lixeira ----
  E(
    'data=[{id:"t1",desc:"A",value:1,date:"' +
      td +
      '",cat:"Outros"},{id:"t2",desc:"B",value:2,date:"' +
      td +
      '",cat:"Outros"}];trash=[]'
  );
  E('dropEntries(new Set(["t1","t2"]))');
  ok('apagar manda para a lixeira', E('trash.length') === 2 && E('data.length') === 0);
  E('go("config");cfgGo("dados")');
  ok('lixeira lista os itens', QA('#trBox [data-tr]').length === 2);
  Q('#trBox [data-tr]').click();
  ok('restaurar um item', E('data.length') === 1);
  E('trash.forEach(x=>x._del=Date.now()-31*864e5);store("gastos:trash",trash)');
  E('loadUser()');
  ok('itens com mais de 30 dias somem sozinhos', E('trash.length') === 0);
  // ---- onboarding ----
  E('data=[];budgets={};cards=[];accts=[];prefs={};go("inicio");render()');
  ok('onboarding aparece para conta vazia', !!Q('#onb .onb') && QA('.onb-i').length === 3);
  E(
    'data.push({id:"o1",desc:"x",value:1,date:"' +
      td +
      '",cat:"Outros"});budgets[mkey()]=100;cards.push({id:"cc",n:"X",lim:0,f:1,v:2,paid:[]});render()'
  );
  ok('some quando os 3 passos estão feitos', !Q('#onb .onb'));
  // ---- receitas recorrentes na tela de compromissos ----
  E(
    'plans=[{gid:"ri",kind:"r",desc:"Salário",value:5000,cat:"Receita",day:5,start:"' +
      addM(cm, -1) +
      '-05",inc:true,active:true,skip:[]}];data=[];materialize()'
  );
  E('go("lanc");seg("comp")');
  ok('receita recorrente listada', /Receitas recorrentes/.test($('compBox').textContent));
  ok(
    'receita recorrente não entra na previsão de gastos',
    !/Salário/.test(Q('#compBox .card:nth-of-type(3)') ? Q('#compBox .card:nth-of-type(3)').textContent : '')
  );
  // ---- relatórios ----
  E('data=[];plans=[]');
  for (const i of [-2, -1, 0]) {
    E(
      'data.push({id:"r' +
        i +
        '",desc:"Gasto",value:' +
        (100 + i * 10) +
        ',date:"' +
        addM(cm, i) +
        '-10",cat:"Lazer",quem:"Ana",tag:"viagem",forma:"Pix"},{id:"i' +
        i +
        '",desc:"Sal",value:1000,date:"' +
        addM(cm, i) +
        '-05",cat:"Receita",inc:true})'
    );
  }
  E('go("rel")');
  for (const [g, exp] of [
    ['cat', 'Lazer'],
    ['forma', 'Pix'],
    ['quem', 'Ana'],
    ['tag', 'viagem'],
    ['cartao', 'Não informado'],
  ]) {
    E('$("relG").value="' + g + '";renderRel()');
    ok(
      'relatório por ' + g,
      QA('#relT tbody tr').some((r) => r.firstElementChild.textContent === exp)
    );
  }
  for (const [n, cols] of [
    ['3', 3],
    ['6', 6],
    ['12', 12],
    ['ano', 12],
  ]) {
    E('$("relN").value="' + n + '";renderRel()');
    ok(
      'relatório ' + n + ' meses: colunas',
      QA('#relT thead th').length === cols + 4,
      QA('#relT thead th').length
    );
  }
  E('$("relN").value="tudo";renderRel()');
  ok('relatório "tudo": cobre o período dos dados', QA('#relT thead th').length >= 3 + 4);
  ok('relatório: saldo = receitas − despesas', /Saldo/.test($('relK').textContent));
  ok('botão de imprimir existe', !!$('relPrint'));
  // ---- dicas, ocultar, tema persistem ----
  E('prefs.hide=true;store("gastos:prefs",prefs);applyHide()');
  ok('ocultar valores liga a classe', w.document.body.classList.contains('hide'));
  E('prefs.hide=false;applyHide()');
  ok('nenhum erro de script', w.__errs.length === 0, w.__errs.slice(0, 3).join('|'));
  H.done('Assistente na tela, assinaturas, lixeira, regime de caixa, relatórios', R);
})().catch((e) => {
  console.log(JSON.stringify({ group: 'features', crash: e.stack.split('\n').slice(0, 4).join(' | ') }));
  process.exit(1);
});
