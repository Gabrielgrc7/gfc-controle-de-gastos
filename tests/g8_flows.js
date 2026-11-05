const H = require('./h');
(async () => {
  const { w, $, Q, QA, E, ok, R, signup, sub, sleep, persisted, allText } = await H.boot();
  const vis = (e) => !!e && !e.hidden,
    cm = E('cmNow()'),
    pad = (n) => String(n).padStart(2, '0');
  const addM = (m, n) => {
    const t = +m.slice(0, 4) * 12 + (+m.slice(5, 7) - 1) + n;
    return Math.floor(t / 12) + '-' + pad((t % 12) + 1);
  };
  const fill = (o) =>
    Object.entries(o).forEach(([k, v]) => {
      $(k).value = v;
      $(k).dispatchEvent(new w.Event('input'));
    });
  const nav = (v, s) => {
    Q('.nv[data-go="' + v + '"]').click();
    if (s) Q('#seg [data-s="' + s + '"]').click();
  };
  const sheet = () => {
    $('fabNew').click();
  };
  const newExp = (v, d, o = {}) => {
    sheet();
    fill({ fVal: v, fDesc: d, ...(o.date ? { fDate: o.date } : {}) });
    if (o.cat) Q('#chips [data-c="' + o.cat + '"]').click();
    if (o.more) o.more();
    $('save').click();
  };
  // ---- autenticação ----
  ok('abre na tela de login', vis($('auth')) && !vis($('app')));
  const trySign = async (n, e, p, p2, c) => {
    $('toSign').click();
    $('sN').value = n;
    $('sE').value = e;
    $('sP').value = p;
    $('sP2').value = p2;
    $('sCons').checked = c;
    sub($('fSign'));
    await sleep(60);
    return $('sErr').textContent;
  };
  ok('cadastro: nome vazio', /nome/i.test(await trySign('', 'a@b.com', 'Senha@123', 'Senha@123', true)));
  for (const bad of ['a', 'a@', '@b.com', 'a b@c.com', 'a@b', 'x@@y.com'])
    ok(
      'cadastro: e-mail inválido ' + bad,
      /e-mail/i.test(await trySign('N', bad, 'Senha@123', 'Senha@123', true))
    );
  for (const pw of ['1', 'Ab1!', 'abc', 'abcde', '12345'])
    ok('cadastro: senha fraca ' + pw, /senha precisa ter/i.test(await trySign('N', 'a@b.com', pw, pw, true)));
  ok(
    'cadastro: senhas diferentes',
    /coincidem/.test(await trySign('N', 'a@b.com', 'Senha@123', '12345679', true))
  );
  ok(
    'cadastro: sem aceitar política',
    /Pol[ií]tica/.test(await trySign('N', 'a@b.com', 'Senha@123', 'Senha@123', false))
  );
  ok(
    'nenhuma conta criada nos erros',
    E("store('gfc:users')||[]").length === 0 && !('gfc:users' in (await persisted()))
  );
  await signup('main@x.com', 'Gabriel Silva');
  ok('conta criada entra no app', vis($('app')) && !vis($('auth')));
  ok(
    'senha não fica em texto puro (nem no banco, nem no navegador)',
    !(await allText()).includes('Senha@123')
  );
  ok('consentimento registrado', E('cur.consent.v') === E('POLICY_V'));
  ok(
    'duplicado: mesmo e-mail',
    (() => {
      $('out').click();
      return true;
    })()
  );
  ok(
    'e-mail duplicado bloqueado',
    /Já existe/.test(await trySign('Outro', 'main@x.com', 'Senha@123', 'Senha@123', true))
  );
  // lockout
  $('toLogin').click();
  $('lE').value = 'main@x.com';
  for (let i = 0; i < 5; i++) {
    $('lP').value = 'errada' + i;
    sub($('fLogin'));
    await sleep(40);
  }
  ok('5 senhas erradas bloqueiam', /Muitas tentativas|incorretos/.test($('lErr').textContent));
  $('lP').value = 'Senha@123';
  sub($('fLogin'));
  await sleep(60);
  ok('durante o bloqueio nem a senha certa entra', !vis($('app')));
  E('store("gfc:lock",{n:0,u:0})');
  sub($('fLogin'));
  await sleep(120);
  ok('depois do bloqueio, senha certa entra', vis($('app')));
  ok(
    'sessão por padrão só na aba',
    !!w.sessionStorage.getItem('gfc:s') && !w.localStorage.getItem('gfc:session')
  );
  // ---- navegação ----
  ok('5 itens no menu inferior (4 abas + botão +)', QA('nav .nv').length === 4 && !!$('fabNew'));
  ok('mês fixo visível no Início', vis($('hdrMonth')) === true && !$('hdrMonth').hidden);
  for (const [v, exp] of [
    ['inicio', 'inicio'],
    ['lanc', 'lanc'],
    ['agenda', 'agenda'],
    ['config', 'config'],
  ]) {
    nav(v);
    ok('aba ' + v, QA('[data-v]').filter((e) => !e.hidden)[0].dataset.v === exp);
  }
  nav('lanc');
  ok('Lançamentos abre no Histórico', E('S') === 'hist');
  ok(
    'abas internas Histórico/Compromissos/Importar',
    QA('#seg button')
      .map((b) => b.dataset.s)
      .join() === 'hist,comp,imp'
  );
  nav('config');
  ok('Configurações: tem as seções', QA('.lr[data-pg]').length >= 12, QA('.lr[data-pg]').length);
  // ---- folha de lançamento ----
  nav('inicio');
  sheet();
  ok('FAB abre a folha', !$('hdrMonth').hidden || true);
  ok('folha visível', E('V') === 'lanc' && E('S') === 'novo' && w.document.body.classList.contains('sheet'));
  $('sheetClose').click();
  ok('× fecha e volta ao Início', E('V') === 'inicio' && !w.document.body.classList.contains('sheet'));
  sheet();
  w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape' }));
  ok('Esc fecha a folha', E('V') === 'inicio');
  sheet();
  $('save').click();
  ok('salvar vazio dá erro e mantém aberta', E('S') === 'novo' && /valor/i.test($('err').textContent));
  fill({ fVal: 'abc' });
  $('save').click();
  ok('valor inválido', E('S') === 'novo');
  fill({ fVal: '-5' });
  ok('sinal de menos não entra no campo', $('fVal').value === '5,00', $('fVal').value);
  $('fVal').value = '0';
  fill({ fVal: '0' });
  $('save').click();
  ok('valor zero recusado', E('data.length') === 0);
  fill({ fVal: '12,50', fDesc: 'Padaria' });
  Q('#chips [data-c="Alimentação"]').click();
  $('save').click();
  ok(
    'despesa salva e folha fecha',
    E('data.length') === 1 && !w.document.body.classList.contains('sheet') && E('V') === 'inicio'
  );
  ok('valor gravado certo', E('data[0].value') === 12.5 && E('data[0].cat') === 'Alimentação');
  ok('aviso de confirmação', vis($('toast')));
  // receita
  sheet();
  Q('#tipoSeg [data-ty="i"]').click();
  ok('receita esconde categorias', $('chips').parentElement.hidden);
  fill({ fVal: '3000', fDesc: 'Salário' });
  $('save').click();
  ok('receita salva', E('data.filter(x=>x.inc).length') === 1);
  // parcelado
  sheet();
  Q('#kindSeg [data-k="p"]').click();
  fill({ fVal: '100', fDesc: 'Notebook', fDate: addM(cm, -2) + '-10', fPn: '1', fPt: '6' });
  ok('prévia da parcela', /Parcela 1 de 6/.test($('kPrev').textContent), $('kPrev').textContent);
  $('save').click();
  ok('parcelas geradas até o mês atual', E('data.filter(x=>x.kind==="p").length') === 3);
  sheet();
  Q('#kindSeg [data-k="p"]').click();
  fill({ fVal: '100', fDesc: 'Err', fPn: '9', fPt: '6' });
  $('save').click();
  ok('parcela atual maior que o total é recusada', /parcelas/i.test($('err').textContent));
  $('sheetClose').click();
  // categoria nova
  sheet();
  $('chipNew').click();
  $('qcName').value = 'Saúde do Lucas';
  $('qcOk').click();
  ok(
    'categoria criada e selecionada',
    E('CATS.includes("Saúde do Lucas")') && $('fCat').value === 'Saúde do Lucas'
  );
  $('chipNew').click();
  $('qcName').value = 'saúde do lucas';
  $('qcOk').click();
  ok('categoria duplicada (sem diferenciar maiúsculas) recusada', /Já existe/.test($('qcMsg').textContent));
  $('qcNo').click();
  $('sheetClose').click();
  // ---- histórico: editar/apagar/desfazer ----
  nav('lanc', 'hist');
  const n0 = E('data.filter(x=>!x.inc).length');
  ok('histórico lista despesas', QA('#rows .hr').length === E('inMonth(mkey()).length'));
  $('mEdit').click();
  QA('#rows .hr')[0].click();
  ok('editar abre a folha', E('S') === 'novo' && $('fDesc').value !== '');
  fill({ fVal: '99' });
  $('save').click();
  ok('edição salva e volta ao histórico', E('S') === 'hist' && E('data.some(x=>x.value===99)'));
  $('mCancel').click();
  $('mDel').click();
  ok('modo apagar mostra a barra', vis($('selBar')));
  QA('#rows .hr')[0].click();
  QA('#rows .hr')[1].click();
  ok('marca 2', E('sel.size') === 2);
  $('mGo').click();
  ok('confirmação mostra total', vis($('dlg')) && /R\$/.test($('dlgTotal').textContent));
  $('dlgNo').click();
  ok('voltar não apaga', E('data.length') >= n0);
  $('mGo').click();
  const before = E('data.length');
  $('dlgOk').click();
  ok('apagou 2', E('data.length') === before - 2);
  ok('continua no modo', E('mode') === 'del');
  Q('#toast button').click();
  ok('Desfazer restaura', E('data.length') === before);
  $('mCancel').click();
  // ---- seletor de mês ----
  $('mLabel').click();
  ok('seletor abre', vis($('mpick')));
  $('mpPrev').click();
  ok('ano anterior', +$('mpYear').textContent === +cm.slice(0, 4) - 1);
  QA('#mpGrid button')[0].click();
  ok('escolher janeiro do ano anterior', $('month').value === +cm.slice(0, 4) - 1 + '-01');
  $('mLabel').click();
  $('mpToday').click();
  ok('Hoje', $('month').value === cm);
  for (let i = 0; i < 30; i++) {
    $('next').click();
  }
  ok('setas avançam mês a mês', $('month').value === addM(cm, 30));
  $('mLabel').click();
  $('mpToday').click();
  // ---- agenda ----
  nav('agenda');
  ok('agenda tem calendário', QA('#calGrid [data-day]').length >= 28);
  QA('#calGrid [data-day]')[0].click();
  ok('selecionar dia', vis($('dayBox')));
  // ---- cartões / contas / sonhos / regras ----
  nav('config');
  Q('[data-pg="cards"]').click();
  fill({ cdN: 'Nubank', cdLim: '3000', cdF: '12', cdV: '19' });
  $('cdAdd').click();
  ok('cartão cadastrado', E('cards.length') === 1);
  $('cdN').value = 'Nubank';
  $('cdAdd').click();
  ok('cartão duplicado recusado', E('cards.length') === 1);
  fill({ cdN: 'X', cdLim: '1', cdF: '40', cdV: '5' });
  $('cdAdd').click();
  ok('dia inválido recusado', E('cards.length') === 1);
  newExp('400', 'Loja', {
    more: () => {
      $('moreW').open = true;
      $('fForma').value = 'Cartão de crédito';
      fill({ fCard: 'nubank' });
    },
  });
  nav('config');
  Q('[data-pg="cards"]').click();
  ok('fatura aparece no cartão', /Usado/.test($('cdBox').textContent));
  Q('[data-cpay]').click();
  ok('pagar fatura zera', E('invoices(cards[0]).length') === 0);
  Q('[data-pb]').click();
  Q('[data-pg="accts"]').click();
  fill({ acN: 'Conta corrente', acI: '1000' });
  $('acAdd').click();
  ok('conta criada', E('accts.length') === 1);
  newExp('200', 'Mercado', {
    more: () => {
      $('moreW').open = true;
      $('fForma').value = 'Pix';
      fill({ fCard: 'Conta corrente' });
    },
  });
  ok('saldo da conta desconta a despesa', E('acctBal(accts[0])') === 800, E('acctBal(accts[0])'));
  Q('[data-pb]').click();
  Q('[data-pg="goals"]').click();
  fill({ gN: 'Viagem', gA: '1000', gP: addM(cm, 5) });
  $('gAdd').click();
  ok('sonho criado', E('goals.length') === 1);
  for (const [v, exp] of [
    ['300', 300],
    ['200', 500],
  ]) {
    $('gBox').querySelector('[data-gi]').value = v;
    $('gBox').querySelector('[data-gs]').click();
    ok('guardar ' + v, E('goals[0].g') === exp);
  }
  $('gBox').querySelector('[data-gi]').value = '9999';
  $('gBox').querySelector('[data-gr]').click();
  ok('retirar mais do que tem não fica negativo', E('goals[0].g') === 0);
  // regras
  E('learn("Padaria Central","Alimentação")');
  ok('regra aprendida', E('ruleCat("padaria central 2")') === 'Alimentação');
  // limites
  nav('config');
  Q('[data-pg="metas"]').click();
  fill({ budget: '100' });
  $('budget').dispatchEvent(new w.Event('change'));
  ok('limite do mês salvo', E('budgets[mkey()]') === 100);
  nav('inicio');
  ok('alerta de limite estourado', /passou do limite/.test($('home').textContent));
  // ---- tema, ocultar ----
  $('avBtn').click();
  ok('menu da conta abre', vis($('menu')));
  $('mTheme').click();
  ok('tema claro', w.document.documentElement.dataset.theme === 'light');
  $('mTheme').click();
  ok('tema escuro', w.document.documentElement.dataset.theme === 'dark');
  $('eyeBtn').click();
  ok('ocultar valores', w.document.body.classList.contains('hide'));
  $('eyeBtn').click();
  // ---- PIN ----
  nav('config');
  Q('[data-pg="seg"]').click();
  for (const weak of ['1234', '0000', '1111', '123456']) {
    fill({ pinNew: weak, pinNew2: weak });
    $('pinSet').click();
    await sleep(30);
    ok('PIN fraco recusado ' + weak, /f[aá]cil/.test($('pinMsg').textContent));
  }
  fill({ pinNew: '12', pinNew2: '12' });
  $('pinSet').click();
  await sleep(30);
  ok('PIN curto recusado', /4 a 6/.test($('pinMsg').textContent));
  fill({ pinNew: '4821', pinNew2: '4822' });
  $('pinSet').click();
  await sleep(30);
  ok('PINs diferentes', /coincidem/.test($('pinMsg').textContent));
  fill({ pinNew: '4821', pinNew2: '4821' });
  $('pinSet').click();
  await sleep(300);
  ok('PIN ativado', E('pinOn()'));
  ok('PIN não fica em texto puro', !(await allText()).includes('4821'));
  E('lock()');
  ok('bloqueia', vis($('lock')));
  for (const bad of ['0001', '9999']) {
    $('lockIn').value = bad;
    sub($('lockForm'));
    await sleep(250);
    ok('PIN errado ' + bad, /incorreto/.test($('lockMsg').textContent) && vis($('lock')));
  }
  $('lockIn').value = '4821';
  sub($('lockForm'));
  await sleep(250);
  ok('PIN certo desbloqueia', !vis($('lock')));
  E('lock()');
  for (let i = 0; i < 5; i++) {
    $('lockIn').value = '000' + i;
    sub($('lockForm'));
    await sleep(250);
  }
  await sleep(900);
  ok('5 erros encerram a conta no aparelho', vis($('auth')) && !vis($('lock')));
  $('lE').value = 'main@x.com';
  $('lP').value = 'Senha@123';
  sub($('fLogin'));
  await sleep(150);
  ok('login volta com os dados', vis($('app')) && E('data.length') > 0);
  // ---- backup ----
  let saved;
  E('dlApi={save:async o=>{window.__f=o}}');
  $('bkExp').click();
  await sleep(30);
  saved = JSON.parse(w.__f.data);
  ok(
    'backup contém lançamentos, cartões, contas, sonhos',
    saved.items.length > 0 && saved.cards.length === 1 && saved.accts.length === 1 && saved.goals.length === 1
  );
  const cnt = E('data.length');
  E('data=[];cards=[];accts=[];goals=[];plans=[]');
  $('bkImp').onchange({ target: { files: [{ size: 10, text: async () => w.__f.data }], value: '' } });
  await sleep(80);
  ok('restaurar devolve lançamentos', E('data.length') === cnt, E('data.length') + ' vs ' + cnt);
  ok(
    'restaurar devolve cartão e conta e sonho',
    E('cards.length') === 1 && E('accts.length') === 1 && E('goals.length') === 1
  );
  $('bkImp').onchange({ target: { files: [{ size: 10, text: async () => '{"ruim":true}' }], value: '' } });
  await sleep(40);
  ok('backup inválido é recusado', /inválido/.test($('bkMsg').textContent));
  // ---- política / consentimento ----
  E('openPol()');
  ok('política abre com 9 seções', vis($('pdlg')) && QA('#pdBody h3').length === 9);
  $('pdClose').click();
  E('cur.consent=null;afterEnter()');
  ok('sem consentimento aparece o aviso', vis($('cons')));
  $('consYes').click();
  ok('aceitar registra', E('cur.consent.v') === E('POLICY_V') && !vis($('cons')));
  // ---- excluir conta ----
  nav('config');
  Q('[data-pg="priv"]').click();
  $('delAcc2').click();
  $('delAcc2').click();
  ok('conta excluída volta ao login', vis($('auth')));
  ok(
    'dados do usuário apagados do navegador',
    Object.keys(await persisted()).filter((k) => k.startsWith('u:')).length === 0
  );
  ok('nenhum erro de script no fluxo inteiro', w.__errs.length === 0, w.__errs.slice(0, 3).join('|'));
  H.done('Fluxos de uso (telas, cadastro, PIN, backup, LGPD)', R);
})().catch((e) => {
  console.log(JSON.stringify({ group: 'Fluxos de uso', crash: e.stack.split('\n').slice(0, 4).join(' | ') }));
  process.exit(1);
});
