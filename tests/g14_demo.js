const H = require('./h');
(async () => {
  const { w, $, Q, QA, E, ok, R, sub, sleep, persisted, signup, fdb } = await H.boot();
  const vis = (e) => !!e && !e.hidden,
    td = E('iso(today)'),
    cm = E('cmNow()');
  // ---- entrada ----
  ok(
    'a tela de entrada tem o botão de exemplo',
    vis($('demoBtn')) && /dados de exemplo/i.test($('demoBtn').textContent)
  );
  ok(
    'a tela de entrada avisa que os dados são fictícios e sem cadastro',
    /Sem cadastro/.test($('pLogin').textContent) && /fictícios/.test($('pLogin').textContent)
  );
  $('demoBtn').click();
  await sleep(60);
  ok('abre o app sem cadastro', vis($('app')) && !vis($('auth')));
  ok('é o usuário de exemplo', E('cur.demo') === true && E('cur.id') === 'demo' && E('NS') === 'u:demo:');
  ok('a barra de exemplo aparece', vis($('demoBar')) && /dados de exemplo/.test($('demoBar').textContent));
  ok('sem pedir consentimento nem abrir tutorial', $('cons').hidden && !E('tourOn'));
  ok(
    'não cria conta na lista de usuários',
    E("(store('gfc:users')||[]).length") === 0 && !('gfc:users' in (await persisted()))
  );
  // ---- conteúdo do exemplo ----
  const data = E('data'),
    exp = data.filter((x) => !x.inc),
    inc = data.filter((x) => x.inc);
  ok('muitos lançamentos', data.length >= 120, data.length);
  ok(
    'seis meses de histórico',
    new Set(data.map((x) => x.date.slice(0, 7))).size >= 6,
    [...new Set(data.map((x) => x.date.slice(0, 7)))].join(',')
  );
  ok(
    'nenhum lançamento à vista no futuro',
    data.filter((x) => !x.pend && x.date > td && !x.kind).length === 0
  );
  ok('há receitas (salário mensal)', inc.length >= 6 && inc.every((x) => x.value === 5200), inc.length);
  ok(
    'há despesas em várias categorias',
    new Set(exp.map((x) => x.cat)).size >= 8,
    [...new Set(exp.map((x) => x.cat))].join(',')
  );
  ok('há parcelas e recorrências', data.some((x) => x.kind === 'p') && data.some((x) => x.kind === 'r'));
  ok(
    'há conta a pagar pendente',
    data.some((x) => x.pend && x.bill)
  );
  ok(
    'um cartão, duas contas, dois sonhos',
    E('cards.length') === 1 && E('accts.length') === 2 && E('goals.length') === 2
  );
  ok('limite do mês e por categoria', E('budgets[cmNow()]') > 0 && Object.keys(E('catlim')).length >= 3);
  ok('categorias padrão carregadas', E('cats.length') >= 10);
  ok(
    'o mês atual tem gastos plausíveis',
    (() => {
      const t = E('sumV(inMonth(cmNow()))');
      return t > 1500 && t < 9000;
    })(),
    E('sumV(inMonth(cmNow()))')
  );
  ok(
    'os valores são todos positivos e com no máximo 2 casas',
    data.every((x) => x.value > 0 && Math.abs(x.value * 100 - Math.round(x.value * 100)) < 1e-6)
  );
  ok(
    'todas as datas são válidas',
    data.every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.date) && !isNaN(new Date(x.date)))
  );
  ok(
    'as categorias usadas existem',
    (() => {
      const c = new Set(E('cats').map((x) => x.n));
      return exp.every((x) => c.has(x.cat));
    })()
  );
  const an = E('anomalies()');
  ok(
    'o exemplo mostra uma cobrança duplicada e um gasto fora do normal',
    an.some((x) => /duplicada/.test(x)) && an.some((x) => /acima do normal/.test(x)),
    an.join(' | ')
  );
  ok(
    'o Início mostra o total do mês',
    /R\$/.test($('heroV') ? $('heroV').textContent : Q('.hero').textContent)
  );
  ok(
    'o exemplo mostra a renda comprometida (recorrentes e parcelas sobre a renda)',
    /Renda comprometida/.test($('home').textContent) &&
      /\d+%\s*da sua renda vai para despesas recorrentes/.test($('home').textContent),
    $('home').textContent.slice(0, 120)
  );
  ok(
    'no exemplo, a divisão da renda fecha em 100% (recorrentes + parcelas + outros + sobra)',
    (() => {
      const c = E('commitMonth(cmNow())');
      return (
        c.inc === 5200 &&
        c.rec > 0 &&
        c.inst > 0 &&
        Math.abs(c.rec + c.inst + c.vari + Math.max(0, c.inc - c.tot) - Math.max(c.inc, c.tot)) < 0.01
      );
    })()
  );
  ok('o lembrete de backup não aparece no exemplo', !vis($('bkNudge')));
  // ---- usar o exemplo ----
  const n0 = E('data.length');
  $('fabNew').click();
  $('fVal').value = '1234';
  $('fVal').dispatchEvent(new w.Event('input'));
  $('fDesc').value = 'Teste no exemplo';
  $('save').click();
  ok('dá para lançar no exemplo', E('data.length') === n0 + 1);
  const r = E("aiInterpret('gastei 45 no mercado ontem')");
  ok(
    'o assistente funciona no exemplo',
    r && r.type === 'drafts' && r.drafts[0].value === 45,
    JSON.stringify(r)
  );
  E('go("rel")');
  ok('relatórios abrem com os dados', vis(Q('[data-v="rel"]')));
  E('go("agenda")');
  ok('agenda abre com os dados', vis(Q('[data-v="agenda"]')));
  E('go("inicio")');
  // ---- sair apaga tudo ----
  $('demoOut').click();
  await sleep(30);
  ok('sair volta à entrada', vis($('auth')) && !vis($('app')));
  ok('a barra de exemplo some', !vis($('demoBar')));
  ok(
    'os dados do exemplo são apagados do banco',
    Object.keys(await persisted()).filter((k) => k.startsWith('u:demo:')).length === 0
  );
  // ---- reiniciar volta ao começo ----
  $('demoBtn').click();
  await sleep(40);
  ok(
    'abrir de novo refaz o exemplo sem o lançamento anterior',
    E('data.length') === n0 && !E('data').some((x) => x.desc === 'Teste no exemplo'),
    E('data.length')
  );
  ok('o exemplo é igual a cada vez (mesma quantidade)', E('data.length') === n0);
  // ---- criar conta a partir do exemplo ----
  $('demoMake').click();
  await sleep(30);
  ok('"Criar minha conta" leva ao cadastro', vis($('pSign')) && vis($('auth')));
  ok(
    'e o exemplo foi apagado',
    Object.keys(await persisted()).filter((k) => k.startsWith('u:demo:')).length === 0
  );
  await signup('real@x.com', 'Pessoa Real');
  ok(
    'cadastro real funciona depois do exemplo',
    vis($('app')) && E('cur.demo') !== true && E('data.length') === 0
  );
  ok('conta real sem barra de exemplo', !vis($('demoBar')));
  // ---- o exemplo não mexe em conta real ----
  $('fabNew').click();
  $('fVal').value = '5000';
  $('fVal').dispatchEvent(new w.Event('input'));
  $('fDesc').value = 'Meu gasto real';
  $('save').click();
  await sleep(60);
  const realId = E('cur.id');
  $('out').click();
  $('demoBtn').click();
  await sleep(40);
  $('demoOut').click();
  await sleep(30);
  const keys = Object.keys(await persisted());
  ok(
    'depois do exemplo, os dados da conta real continuam lá',
    keys.some((k) => k.startsWith('u:' + realId + ':gastos:items'))
  );
  $('lE').value = 'real@x.com';
  $('lP').value = 'Senha@123';
  sub($('fLogin'));
  await sleep(200);
  ok('e voltam ao entrar', E('data.some(x=>x.desc==="Meu gasto real")') === true);
  // ---- recarregar a página durante o exemplo ----
  $('out').click();
  $('demoBtn').click();
  await sleep(30);
  const b = await H.boot({ db: fdb });
  ok(
    'recarregar a página sai do exemplo e limpa os dados',
    b.E('Store.mode') === 'idb' &&
      !b.$('app').hidden === false &&
      Object.keys(await b.persisted()).filter((k) => k.startsWith('u:demo:')).length === 0
  );
  b.close();
  // ---- modo de exemplo sem IndexedDB (só localStorage) ----
  const c = await H.boot({ idb: false });
  c.$('demoBtn').click();
  await sleep(40);
  ok(
    'o exemplo também funciona só com localStorage',
    c.E('Store.mode') === 'local' && c.E('data.length') >= 120 && !c.$('app').hidden
  );
  c.close();
  // ---- tutorial continua disponível ----
  E('go("config");cfgGo("sobre")');
  ok('nenhum erro de script', w.__errs.length === 0, w.__errs.slice(0, 3).join('|'));
  H.done('Modo de exemplo (sem cadastro)', R);
})()
  .then(() => 0)
  .catch((e) => {
    console.log(JSON.stringify({ group: 'demo', crash: e.stack.split('\n').slice(0, 4).join(' | ') }));
    process.exit(1);
  });
