const H = require('./h');
(async () => {
  const { w, $, Q, QA, E, ok, R, sub, sleep } = await H.boot({ tour: true });
  const vis = (e) => !!e && !e.hidden;
  // ---- começa sozinho depois do cadastro ----
  $('toSign').click();
  $('sN').value = 'Maria';
  $('sE').value = 'maria@gmail.com';
  $('sP').value = 'Senha@123';
  $('sP2').value = 'Senha@123';
  $('sCons').checked = true;
  sub($('fSign'));
  await sleep(900);
  ok('o tutorial começa sozinho após criar a conta', vis($('tour')) && E('tourOn') === true);
  ok(
    'primeiro passo é a boas-vindas',
    /Bem-vindo/.test($('tourTitle').textContent) && $('tourN').textContent === '1 de ' + E('TOUR.length'),
    $('tourTitle').textContent
  );
  ok('mostra o botão Pular o tempo todo', vis($('tourSkip')));
  ok('sem botão Voltar no primeiro passo', !vis($('tourBack')));
  ok('o corpo da página recebe a marca "touring"', w.document.body.classList.contains('touring'));
  ok('passo informativo bloqueia a área destacada', !$('tour').classList.contains('t-click'));
  // ---- percorre o tutorial inteiro como uma pessoa faria ----
  const total = E('TOUR.length'),
    seen = [];
  let guard = 0,
    clicks = 0,
    scrolls = 0;
  while (E('tourOn') && guard++ < 80) {
    const i = E('tourI');
    seen.push(i);
    const s = E('TOUR[' + i + ']');
    if (vis($('tourNext'))) {
      if (s.scroll) scrolls++;
      $('tourNext').click();
      await sleep(30);
    } else if (s.click) {
      const el = Q(s.target);
      ok('passo de toque ' + i + ': alvo existe', !!el);
      ok('passo de toque ' + i + ': área destacada fica clicável', $('tour').classList.contains('t-click'));
      clicks++;
      el.click();
      await sleep(330);
    } else break;
  }
  ok('passou por todos os ' + total + ' passos', new Set(seen).size === total, [...new Set(seen)].join(','));
  ok('havia passos de toque', clicks >= 5, clicks);
  ok('havia passo de rolar a tela', scrolls >= 1, scrolls);
  ok(
    'terminou: tutorial fechado e marca removida',
    !vis($('tour')) && !w.document.body.classList.contains('touring') && E('tourOn') === false
  );
  ok('terminou: marcado como feito', E('prefs.tourDone') === true);
  ok(
    'terminou: voltou ao Início, sem folha aberta',
    E('V') === 'inicio' && !w.document.body.classList.contains('sheet')
  );
  ok(
    'o passo de lançar fez a folha abrir de verdade (passou pelo 1º lançamento)',
    seen.includes(6) && seen.includes(10)
  );
  // ---- pular ----
  E('tourStart()');
  await sleep(30);
  ok('rever o tutorial reinicia do começo', E('tourI') === 0 && vis($('tour')));
  for (let k = 0; k < 3; k++) {
    $('tourNext').click();
    await sleep(10);
  }
  ok('avançou 3 passos', E('tourI') === 3);
  $('tourBack').click();
  ok('Voltar volta um passo', E('tourI') === 2);
  $('tourSkip').click();
  ok('Pular fecha o tutorial a qualquer momento', !vis($('tour')) && E('tourOn') === false);
  E('tourStart()');
  await sleep(20);
  w.document.dispatchEvent(
    new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
  );
  ok('Esc também pula', !vis($('tour')));
  // ---- ligar à tela de Sobre e ajuda ----
  E('go("config");cfgGo("sobre")');
  ok('botão "Rever tutorial" existe em Sobre e ajuda', vis($('tourRestart')));
  $('tourRestart').click();
  await sleep(20);
  ok('o botão inicia o tutorial', E('tourOn') === true);
  $('tourSkip').click();
  // ---- não repete para quem já fez ----
  E('prefs.tourDone=true');
  E('tourSoon()');
  await sleep(500);
  ok('quem já fez o tutorial não o vê de novo sozinho', E('tourOn') === false);
  // ---- alvo escondido é pulado ----
  E('go("inicio")');
  $('aiBtn').hidden = true;
  E('tourI=17;tourOn=false;tourStart()');
  await sleep(10);
  let guard2 = 0;
  while (E('tourOn') && E('tourI') < E('TOUR.length') - 1 && guard2++ < 60) {
    if (vis($('tourNext'))) $('tourNext').click();
    else {
      const s = E('TOUR[' + E('tourI') + ']');
      const el = Q(s.target);
      el && el.click();
      await sleep(260);
    }
    await sleep(10);
  }
  ok(
    'passo com alvo escondido (assistente) é pulado sem travar',
    !/Seu assistente/.test($('tourTitle').textContent)
  );
  $('aiBtn').hidden = false;
  E('tourEnd()');
  // ---- login de quem já tem conta não dispara o tutorial ----
  $('out').click();
  $('lE').value = 'maria@gmail.com';
  $('lP').value = 'Senha@123';
  sub($('fLogin'));
  await sleep(500);
  ok('login de conta existente não abre o tutorial', E('tourOn') === false);
  ok('nenhum erro de script', w.__errs.length === 0, w.__errs.slice(0, 3).join('|'));
  H.done('Tutorial guiado', R);
})()
  .then(() => 0)
  .catch((e) => {
    console.log(JSON.stringify({ group: 'tutorial', crash: e.stack.split('\n').slice(0, 4).join(' | ') }));
    process.exit(1);
  });
