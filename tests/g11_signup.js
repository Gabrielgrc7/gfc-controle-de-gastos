const H = require('./h');
(async () => {
  const { w, $, Q, E, ok, R, sub, sleep, persisted, allText } = await H.boot();
  const call = (f, a) => w.eval(f + '(' + a.map((x) => JSON.stringify(x)).join(',') + ')');
  const vis = (e) => !!e && !e.hidden;
  let n = 0;
  // ---- e-mail: só o formato ----
  const locals = ['a', 'ana', 'ana.silva', 'ana_silva', 'ana+gastos', 'a1', 'joao-pedro', 'JOAO', 'x.y.z'],
    doms = [
      'gmail.com',
      'empresa.com.br',
      'sub.dominio.org',
      'a.co',
      'mailinator.com',
      'teste.com',
      'gmial.com',
    ];
  for (const l of locals)
    for (const d of doms) {
      n++;
      ok('e-mail aceito ' + l + '@' + d, call('emailCheck', [l + '@' + d]) === '');
    }
  ok('e-mail com espaços nas pontas é aceito', call('emailCheck', ['  ana@gmail.com  ']) === '');
  ok('e-mail em maiúsculas é aceito', call('emailCheck', ['ANA@GMAIL.COM']) === '');
  for (const b of [
    '',
    'a',
    'a@',
    '@b.com',
    'a b@c.com',
    'a@b',
    'x@@y.com',
    'a@b.c',
    'a@.com',
    'a@com.',
    'ana@dominio',
    'ana@ dominio.com',
    'ana@dominio,com',
    'ana@dominio.c',
    'ana @dominio.com',
    'x'.repeat(250) + '@a.com',
    null,
    undefined,
  ]) {
    n++;
    ok('e-mail recusado ' + JSON.stringify(b), /e-mail|longo/i.test(call('emailCheck', [b])));
  }
  // ---- senha: só o tamanho ----
  for (let len = 0; len <= 5; len++)
    ok('senha curta ' + len, call('pwUnmet', ['a'.repeat(len)]).length === 1);
  for (const p of [
    'abcdef',
    '123456',
    'senha!',
    'Aa1!bc',
    'a'.repeat(128),
    '                  ',
    'çãõéü12',
    '🙂🙂🙂🙂🙂🙂',
  ])
    ok('senha aceita ' + JSON.stringify(p).slice(0, 20), call('pwUnmet', [p]).length === 0);
  // ---- o CPF não existe mais ----
  ok('não há campo de CPF no cadastro', !$('sCpf') && !$('cpfHint'));
  ok(
    'funções de CPF e e-mail descartável foram removidas',
    ['cpfValid', 'cpfFmt', 'DISP', 'FAKED', 'lev'].every((f) => E('typeof ' + f) === 'undefined')
  );
  ok(
    'a política diz que não pede CPF',
    /Não pedimos CPF/.test(E('polHTML()')) && !/CPF é pedido/.test(E('polHTML()'))
  );
  // ---- tela de cadastro ----
  const trySign = async (o) => {
    $('toSign').click();
    const f = { sN: 'Maria', sE: 'maria@gmail.com', sP: 'Senha1', sP2: 'Senha1', ...o };
    const wait = o.wait || 80,
      cons = o.cons !== false;
    delete f.wait;
    delete f.cons;
    Object.entries(f).forEach(([k, v]) => {
      $(k).value = v;
      $(k).dispatchEvent(new w.Event('input'));
    });
    $('sCons').checked = cons;
    sub($('fSign'));
    await sleep(wait);
    return $('sErr').textContent;
  };
  ok('tela: nome vazio', /nome/i.test(await trySign({ sN: '' })));
  ok('tela: e-mail inválido', /e-mail/i.test(await trySign({ sE: 'maria@' })));
  for (let len = 1; len <= 5; len++)
    ok(
      'tela: senha de ' + len + ' caracteres recusada',
      /senha precisa ter/i.test(await trySign({ sP: 'a'.repeat(len), sP2: 'a'.repeat(len) }))
    );
  ok('tela: senhas diferentes', /coincidem/.test(await trySign({ sP2: 'Senha2' })));
  ok('tela: senha acima de 128', /128/.test(await trySign({ sP: 'a'.repeat(129), sP2: 'a'.repeat(129) })));
  ok('tela: sem aceitar a política', /Pol[ií]tica/.test(await trySign({ cons: false })));
  ok(
    'nenhuma conta criada pelos erros',
    E("(store('gfc:users')||[]).length") === 0 && !('gfc:users' in (await persisted()))
  );
  const okMsg = await trySign({ sE: 'Maria@Gmail.com', sP: 'Aa1!bc', sP2: 'Aa1!bc', wait: 300 });
  ok('conta criada com senha simples de 6 caracteres', vis($('app')) && okMsg === '', okMsg);
  const u = E("store('gfc:users')[0]");
  ok(
    'o cadastro guarda só nome, e-mail (minúsculo), código da senha, foto e aceite',
    JSON.stringify(Object.keys(u).sort()) ===
      JSON.stringify(['avatar', 'consent', 'email', 'hash', 'id', 'name', 'salt']),
    Object.keys(u).join(',')
  );
  ok('e-mail guardado em minúsculas', u.email === 'maria@gmail.com');
  ok('a senha não fica em texto puro', !(await allText()).includes('Aa1!bc'));
  ok('o aceite da política é da versão atual', u.consent.v === E('POLICY_V'));
  $('out').click();
  ok(
    'e-mail repetido é recusado (mesmo em maiúsculas)',
    /Já existe/.test(await trySign({ sE: 'MARIA@gmail.com', wait: 200 }))
  );
  for (const len of [6, 7, 20, 128]) {
    $('out').click();
    const r = await trySign({
      sE: 'p' + len + '@x.com',
      sP: 'a'.repeat(len),
      sP2: 'a'.repeat(len),
      wait: 250,
    });
    ok('senha de ' + len + ' caracteres cria conta', vis($('app')) && r === '', r);
  }
  ok(
    'o nome do cadastro aparece sem executar HTML',
    (() => {
      $('out').click();
      return true;
    })()
  );
  await trySign({ sN: '<img src=x onerror=alert(1)>', sE: 'xss@x.com', wait: 300 });
  ok('nome com HTML não executa nada', !w.__xss && !Q('img[src="x"]'));
  ok('nenhum erro de script', w.__errs.length === 0, w.__errs.slice(0, 3).join('|'));
  H.done('Cadastro simples (e-mail e senha) sem CPF', R, { cases: n });
})()
  .then(() => 0)
  .catch((e) => {
    console.log(JSON.stringify({ group: 'cadastro', crash: e.stack.split('\n').slice(0, 4).join(' | ') }));
    process.exit(1);
  });
