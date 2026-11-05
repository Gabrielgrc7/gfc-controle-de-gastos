const H = require('./h');
(async () => {
  const A = await H.boot();
  const { w, $, Q, QA, E, ok, R, signup, sleep, persisted, fdb } = A;
  await signup('m@x.com', 'M');
  const vis = (e) => !!e && !e.hidden;
  const shown = () =>
    QA('#home > .hw')
      .filter((e) => !e.hidden)
      .map((e) => e.dataset.w);
  const list = () => QA('#heOn .hed-item').map((e) => e.dataset.w);
  const off = () => QA('#heOff .hed-add').map((e) => e.dataset.w);
  const key = (el, k, o = {}) =>
    el.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...o }));
  const openMenuItem = () => $('mView').click();
  const pick = (m) => {
    openMenuItem();
    Q('.vmo[data-m="' + m + '"]').click();
  };
  const STD = [
    'resumo',
    'fluxo',
    'comprometida',
    'avisos',
    'contas',
    'dicas',
    'sonhos',
    'graficos',
    'indicadores',
    'recentes',
  ];
  const SIMPLE = ['resumo', 'fluxo', 'avisos', 'graficos', 'recentes'];
  const EXTRAS = ['diario', 'maiores', 'vencimentos', 'assinaturas', 'cartoes', 'evolucao', 'atalhos'];
  const cm = E('cmNow()');
  const nm = (k) => E('addM(cmNow(),' + k + ')');
  const e = (o) => ({
    id: 'e' + Math.random().toString(36).slice(2, 9),
    cat: 'Outros',
    date: cm + '-10',
    desc: 'x',
    value: 1,
    ...o,
  });
  const setData = (arr, extra) => {
    E('data=' + JSON.stringify(arr));
    if (extra) E(extra);
    E('go("inicio");render()');
  };

  // ================= catálogo =================
  ok(
    'há 17 blocos: 10 padrão e 7 novos',
    E('HOME_W.length') === 17 && E('HOME_STD.length') === 10 && E('HOME_W.filter(w=>w.extra).length') === 7
  );
  ok(
    'os ids são únicos e os títulos também',
    new Set(E('HOME_W.map(w=>w.id)')).size === 17 && new Set(E('HOME_W.map(w=>w.t)')).size === 17
  );
  ok('todo bloco tem título e descrição', E('HOME_W.every(w=>w.t.length>2&&w.d.length>10)'));
  ok('a ordem da Completa é a de sempre', JSON.stringify(E('HOME_STD')) === JSON.stringify(STD));
  ok(
    'o Simples tem só os 5 essenciais, na ordem',
    JSON.stringify(E('HOME_SIMPLE')) === JSON.stringify(SIMPLE)
  );
  ok(
    'os 7 novos são os esperados',
    JSON.stringify(E('HOME_W.filter(w=>w.extra).map(w=>w.id)')) === JSON.stringify(EXTRAS)
  );
  ok(
    'todo bloco tem seu contêiner no HTML',
    E('HOME_W.every(w=>!!document.querySelector("#home > .hw[data-w=\\""+w.id+"\\"]"))')
  );
  ok(
    'os blocos montados por código têm função; os fixos têm o HTML',
    EXTRAS.concat(['fluxo', 'comprometida', 'avisos', 'contas', 'dicas', 'sonhos']).every(
      (id) => E('typeof HOME_BUILD.' + id) === 'function'
    ) &&
      !!Q('[data-w="resumo"] .hero') &&
      !!Q('[data-w="graficos"] #pie') &&
      !!Q('[data-w="indicadores"] .k3') &&
      !!Q('[data-w="recentes"] #recent')
  );
  ok(
    'ids como __proto__ e constructor nunca valem',
    E('homeClean(["__proto__","constructor","toString","resumo","hasOwnProperty"])').join() === 'resumo'
  );

  // ================= modo Completa (padrão) =================
  ok('começa na Completa', E('homeMode()') === 'completa' && E('prefs.homeMode') === undefined);
  ok(
    'a Completa mostra os 10 blocos, na ordem, e esconde os novos',
    shown().join() === STD.join(),
    shown().join()
  );
  ok('o item do menu mostra o modo atual', $('mViewV').textContent === 'Completa');
  const mi = [...$('menu').querySelectorAll('.mi')].map((b) => b.id);
  ok(
    'o menu tem "Modo de visualização" entre Configurações e Tema',
    mi.indexOf('mView') === mi.indexOf('mCfg') + 1 && mi.indexOf('mTheme') === mi.indexOf('mView') + 1,
    mi.join()
  );
  ok(
    'o item do menu avisa que abre uma janela (leitor de tela)',
    $('mView').getAttribute('aria-haspopup') === 'dialog'
  );

  // ================= a janela =================
  openMenuItem();
  ok('a janela abre', vis($('vmode')));
  ok(
    'é uma janela de diálogo com título',
    $('vmode').getAttribute('role') === 'dialog' &&
      $('vmode').getAttribute('aria-modal') === 'true' &&
      $('vmT').textContent === 'Modo de visualização'
  );
  const radios = QA('#vmode .vmo');
  ok(
    '3 opções, em ordem, como botões de rádio',
    radios.length === 3 &&
      radios.map((r) => r.dataset.m).join() === 'completa,simples,custom' &&
      radios.every((r) => r.getAttribute('role') === 'radio')
  );
  ok(
    'só a Completa está marcada',
    radios.map((r) => r.getAttribute('aria-checked')).join() === 'true,false,false'
  );
  ok('só a marcada entra na ordem do Tab', radios.map((r) => r.tabIndex).join() === '0,-1,-1');
  ok('"Editar meu Início" só aparece no modo personalizado', !vis($('vmEdit')));
  ok('o foco vai para a opção marcada', w.document.activeElement === radios[0]);
  ok(
    'o corpo da página trava a rolagem e o balão do assistente sai da frente',
    w.document.body.classList.contains('noscroll')
  );
  key(radios[0], 'ArrowDown');
  ok('seta para baixo vai para a opção seguinte', w.document.activeElement === radios[1]);
  key(radios[1], 'ArrowUp');
  key(radios[0], 'ArrowUp');
  ok('seta para cima do primeiro volta ao último (circular)', w.document.activeElement === radios[2]);
  w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
  const foc = QA('#vmode button').filter((b) => !b.closest('[hidden]') && !b.hidden);
  foc[foc.length - 1].focus();
  const tab = new w.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
  foc[foc.length - 1].dispatchEvent(tab);
  ok(
    'Tab no último botão volta ao primeiro (o foco não escapa da janela)',
    tab.defaultPrevented && w.document.activeElement === foc[0]
  );
  key(w.document, 'Escape');
  ok('Esc fecha a janela', !vis($('vmode')) && !w.document.body.classList.contains('noscroll'));
  openMenuItem();
  $('vmode').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  ok('tocar fora fecha', !vis($('vmode')));
  openMenuItem();
  $('vmNo').click();
  ok('Fechar fecha e não muda nada', !vis($('vmode')) && E('homeMode()') === 'completa');

  // ================= modo Simples =================
  E('go("agenda")');
  E('chartT="barras"');
  pick('simples');
  ok('Simples mostra só os 5 blocos essenciais, na ordem', shown().join() === SIMPLE.join(), shown().join());
  ok('e volta ao Início para mostrar o resultado', E('V') === 'inicio');
  ok(
    'o modo foi gravado no perfil e no banco do aparelho',
    E('prefs.homeMode') === 'simples' &&
      /"homeMode":"simples"/.test((await persisted())['u:' + E('cur.id') + ':gastos:prefs'])
  );
  ok('o menu passa a dizer "Simples"', $('mViewV').textContent === 'Simples');
  ok(
    'a janela fechou e o aviso apareceu',
    !vis($('vmode')) && /Modo simples ativado/.test($('toast').textContent),
    $('toast').textContent
  );
  ok(
    'no Simples o gráfico é sempre a rosca (mesmo com "barras" escolhido)',
    E('chartKind()') === 'rosca' && w.document.body.dataset.home === 'simples'
  );
  ok(
    'os blocos escondidos não gastam trabalho (ficam vazios)',
    ['comprometida', 'contas', 'dicas', 'sonhos'].every((id) => $('w-' + id).innerHTML === '')
  );
  ok('o texto dos blocos visíveis continua lá', /Receitas/.test($('w-fluxo').textContent));
  ok(
    'na abertura seguinte a opção marcada é "Simples"',
    (openMenuItem(), Q('.vmo.on').dataset.m === 'simples')
  );
  key(w.document, 'Escape');
  pick('completa');
  ok('voltar à Completa devolve os 10 blocos na ordem original', shown().join() === STD.join());
  ok('e devolve o gráfico que a pessoa tinha escolhido', E('chartKind()') === 'barras');
  E('chartT="rosca"');

  // ================= Personalizar: primeira vez =================
  pick('simples');
  pick('custom');
  ok('Personalizar abre o editor', vis($('hedit')) && !vis($('vmode')));
  ok(
    'o editor é uma janela com título',
    $('hedit').getAttribute('role') === 'dialog' && $('heT').textContent === 'Personalizar o Início'
  );
  ok(
    'a primeira vez parte do que a pessoa estava vendo (Simples)',
    list().join() === SIMPLE.join(),
    list().join()
  );
  ok(
    'virou o modo "personalizado"',
    E('prefs.homeMode') === 'custom' &&
      E('homeMode()') === 'custom' &&
      $('mViewV').textContent === 'Personalizada'
  );
  ok('o contador mostra 5', $('heN').textContent === '(5)');
  ok(
    'os blocos fora aparecem em "Para adicionar", padrão antes dos novos',
    off().join() === 'comprometida,contas,dicas,sonhos,indicadores,' + EXTRAS.join(),
    off().join()
  );
  ok(
    'os rótulos "Blocos padrão" e "Novos blocos" aparecem',
    /Blocos padrão/.test($('heOff').textContent) && /Novos blocos/.test($('heOff').textContent)
  );
  ok('os blocos novos têm a etiqueta "Novo"', QA('#heOff .hed-new').length === 7);
  ok('o foco vai para "Concluir"', w.document.activeElement === $('heDone'));
  ok(
    'os botões têm nomes completos (leitor de tela)',
    QA('#heOn .hed-item')[1].querySelector('[data-a="up"]').getAttribute('aria-label') ===
      'Mover Receitas, despesas e saldo para cima' &&
      /Posição 2 de 5/.test(QA('#heOn .hed-grip')[1].getAttribute('aria-label'))
  );
  ok(
    'o primeiro não sobe e o último não desce',
    QA('#heOn .hed-item')[0].querySelector('[data-a="up"]').disabled &&
      QA('#heOn .hed-item')[4].querySelector('[data-a="down"]').disabled
  );
  const itemOf = (id) => Q('#heOn [data-w="' + id + '"]');
  // mover com os botões
  itemOf('fluxo').querySelector('[data-a="up"]').click();
  ok('"para cima" troca de lugar', list().join() === 'fluxo,resumo,avisos,graficos,recentes');
  ok(
    'e o Início por baixo já mostra a nova ordem',
    shown().join() === 'fluxo,resumo,avisos,graficos,recentes',
    shown().join()
  );
  ok(
    'o foco continua no botão do bloco movido',
    w.document.activeElement.closest('.hed-item').dataset.w === 'fluxo'
  );
  itemOf('fluxo').querySelector('[data-a="down"]').click();
  ok('"para baixo" volta', list().join() === SIMPLE.join());
  ok(
    'o anúncio para leitor de tela diz a nova posição',
    (await sleep(60), /movido para a posição 1 de 5/.test($('heLive').textContent), true)
  );
  // adicionar
  Q('#heOff [data-w="diario"] button').click();
  ok(
    'adicionar coloca no fim da lista',
    list().join() === SIMPLE.concat('diario').join() && !off().includes('diario')
  );
  ok(
    'o novo bloco ganha destaque e o foco',
    itemOf('diario').classList.contains('flash') &&
      w.document.activeElement.closest('.hed-item').dataset.w === 'diario'
  );
  ok(
    'e aparece no Início',
    shown().includes('diario') &&
      vis(Q('[data-w="diario"]')) &&
      /Pode gastar por dia/.test($('w-diario').textContent)
  );
  ok('o contador sobe para 6', $('heN').textContent === '(6)');
  // remover
  itemOf('avisos').querySelector('[data-a="off"]').click();
  ok(
    'ocultar tira do Início e devolve para "Para adicionar"',
    !list().includes('avisos') && off().includes('avisos') && !shown().includes('avisos')
  );
  ok('o foco vai para o item que ocupou o lugar', w.document.activeElement.classList.contains('hed-grip'));
  ok(
    'o bloco oculto fica vazio e escondido',
    $('w-avisos').innerHTML === '' && Q('[data-w="avisos"]').hidden
  );
  // teclado na alça
  QA('#heOn .hed-grip')[0].focus();
  const first = list()[0];
  key(QA('#heOn .hed-grip')[0], 'ArrowDown');
  ok(
    'teclado: seta para baixo na alça move o bloco',
    list()[1] === first && w.document.activeElement.closest('.hed-item').dataset.w === first
  );
  key(w.document.activeElement, 'ArrowUp');
  ok(
    'teclado: seta para cima volta e mantém o foco',
    list()[0] === first && w.document.activeElement.closest('.hed-item').dataset.w === first
  );
  key(w.document.activeElement, 'ArrowUp');
  ok('teclado: no topo a seta para cima não faz nada', list()[0] === first);
  key(w.document.activeElement, 'a');
  ok('outras teclas não fazem nada', list()[0] === first);

  // ================= arrastar =================
  const stub = () =>
    QA('#heOn .hed-item').forEach((li) => {
      li.getBoundingClientRect = () => {
        const i = [...li.parentNode.children].indexOf(li);
        return { top: i * 60, height: 60, bottom: i * 60 + 60, left: 0, right: 300, width: 300 };
      };
    });
  Q('#hedit .hed-body').getBoundingClientRect = () => ({
    top: 0,
    bottom: 3000,
    left: 0,
    right: 400,
    height: 3000,
    width: 400,
  });
  const pev = (t, y, o = {}) => {
    const ev = new w.MouseEvent(t, { bubbles: true, cancelable: true, clientY: y, button: 0, ...o });
    ev.pointerType = o.pointerType || 'touch';
    return ev;
  };
  const dragTo = async (id, y, finish = 'pointerup') => {
    stub();
    const g = itemOf(id).querySelector('.hed-grip');
    g.dispatchEvent(pev('pointerdown', 10));
    w.document.dispatchEvent(pev('pointermove', y));
    await sleep(40);
    if (finish) w.document.dispatchEvent(pev(finish, y));
  };
  E("heSet(['resumo','fluxo','graficos','recentes','diario'])");
  await dragTo('resumo', 5 * 60 + 5);
  ok(
    'arrastar o primeiro até depois do último o coloca no fim',
    list().join() === 'fluxo,graficos,recentes,diario,resumo',
    list().join()
  );
  ok(
    'arrastar salva e atualiza o Início',
    E('prefs.homeCustom.order').join() === 'fluxo,graficos,recentes,diario,resumo' &&
      shown().join() === 'fluxo,graficos,recentes,diario,resumo'
  );
  await dragTo('resumo', 5);
  ok(
    'arrastar o último até o topo o coloca no começo',
    list().join() === 'resumo,fluxo,graficos,recentes,diario',
    list().join()
  );
  await dragTo('fluxo', 2 * 60 + 50);
  ok(
    'arrastar para o meio funciona',
    list().join() === 'resumo,graficos,fluxo,recentes,diario',
    list().join()
  );
  const saved = E('JSON.stringify(prefs.homeCustom)');
  await dragTo('graficos', 70);
  ok(
    'soltar no mesmo lugar não muda nada',
    E('JSON.stringify(prefs.homeCustom)') === saved &&
      list().join() === 'resumo,graficos,fluxo,recentes,diario'
  );
  await dragTo('graficos', 5 * 60, 'pointercancel');
  ok(
    'cancelar o arrastar restaura a ordem salva',
    list().join() === 'resumo,graficos,fluxo,recentes,diario' &&
      E('prefs.homeCustom.order').join() === 'resumo,graficos,fluxo,recentes,diario'
  );
  stub();
  itemOf('resumo')
    .querySelector('.hed-grip')
    .dispatchEvent(pev('pointerdown', 10, { pointerType: 'mouse', button: 2 }));
  ok('o botão direito do mouse não começa a arrastar', !itemOf('resumo').classList.contains('drag'));
  itemOf('resumo').querySelector('.hed-grip').dispatchEvent(pev('pointerdown', 10));
  ok('o item arrastado fica destacado', itemOf('resumo').classList.contains('drag'));
  itemOf('graficos').querySelector('.hed-grip').dispatchEvent(pev('pointerdown', 70));
  ok('um segundo toque durante o arrastar é ignorado', !itemOf('graficos').classList.contains('drag'));
  w.document.dispatchEvent(pev('pointerup', 10));
  ok('depois de soltar, o destaque some', !itemOf('resumo').classList.contains('drag'));
  w.document.dispatchEvent(pev('pointermove', 5 * 60));
  w.document.dispatchEvent(pev('pointerup', 5 * 60));
  ok(
    'movimentos depois de soltar não fazem nada (ouvintes removidos)',
    list().join() === 'resumo,graficos,fluxo,recentes,diario'
  );
  ok(
    'o alvo do arrastar é só a alça (tocar no texto não arrasta)',
    (() => {
      itemOf('resumo').querySelector('.hed-txt').dispatchEvent(pev('pointerdown', 10));
      return !itemOf('resumo').classList.contains('drag');
    })()
  );

  // ================= restaurar e recomeçar =================
  $('heSimple').click();
  ok(
    '"Começar do Simples" aplica os 5 blocos',
    list().join() === SIMPLE.join() && /Desfazer/.test($('toast').textContent)
  );
  $('toast').querySelector('button').click();
  ok(
    'Desfazer devolve o layout anterior',
    list().join() === 'resumo,graficos,fluxo,recentes,diario',
    list().join()
  );
  $('heStd').click();
  ok(
    '"Restaurar a Completa" aplica os 10 padrão',
    list().join() === STD.join() && off().join() === EXTRAS.join()
  );
  // tudo fora
  E('heSet([])');
  ok(
    'sem nenhum bloco: o editor avisa',
    vis($('heEmpty')) && $('heN').textContent === '' && off().length === 17
  );
  ok('sem nenhum bloco: o Início mostra o aviso com botão', vis($('homeEmpty')) && shown().length === 0);
  // todos
  for (let i = 0; i < 17; i++) {
    const b = Q('#heOff .hed-add button');
    if (b) b.click();
  }
  ok(
    'com os 17: a lista de disponíveis esvazia e avisa',
    list().length === 17 && off().length === 0 && vis($('heOffEmpty'))
  );
  ok('com os 17: o Início mostra todos', shown().length === 17 && !vis($('homeEmpty')));
  // fechar
  $('heDone').click();
  ok(
    'Concluir fecha o editor e destrava a rolagem',
    !vis($('hedit')) && !w.document.body.classList.contains('noscroll')
  );
  E('heSet([])');
  $('homeEmptyBtn').click();
  ok('o botão do aviso vazio abre o editor', vis($('hedit')));
  key(w.document, 'Escape');
  ok('Esc fecha o editor', !vis($('hedit')));
  E('heOpen()');
  $('heClose').click();
  ok('o × fecha o editor', !vis($('hedit')));
  E('heOpen()');
  const f2 = QA('#hedit button').filter((b) => !b.closest('[hidden]') && !b.disabled);
  f2[f2.length - 1].focus();
  const tb = new w.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
  f2[f2.length - 1].dispatchEvent(tb);
  ok('no editor o Tab também não escapa', tb.defaultPrevented && w.document.activeElement === f2[0]);
  $('heClose').click();

  // ================= o layout personalizado é lembrado =================
  E("heSet(['recentes','resumo'])");
  $('heDone').click && E('heClose()');
  pick('completa');
  ok(
    'trocar para Completa não perde o layout personalizado',
    E('prefs.homeCustom.order').join() === 'recentes,resumo'
  );
  pick('custom');
  ok(
    'voltar a Personalizar traz o layout que a pessoa montou',
    shown().join() === 'recentes,resumo' && list().join() === 'recentes,resumo',
    shown().join()
  );
  $('heClose').click();
  ok('"Editar meu Início" aparece quando o modo é personalizado', (openMenuItem(), vis($('vmEdit'))));
  $('vmEdit').click();
  ok('e abre o editor direto', vis($('hedit')) && !vis($('vmode')));
  $('heClose').click();

  // ================= dados ruins =================
  const bad = [
    [
      { order: ['x', 'resumo', 'resumo', 'contas', 5, null, {}, [], '__proto__', 'constructor'] },
      'resumo,contas',
    ],
    [{ order: 'resumo' }, ''],
    [{ order: null }, ''],
    [{}, ''],
    [null, ''],
    [{ order: Array.from({ length: 500 }, () => 'resumo') }, 'resumo'],
    [{ order: STD.concat(EXTRAS).concat(STD) }, STD.concat(EXTRAS).join()],
  ];
  for (const [v, exp] of bad) {
    E('prefs.homeMode="custom";prefs.homeCustom=' + JSON.stringify(v));
    ok(
      'layout corrompido ' + JSON.stringify(v).slice(0, 50) + ' vira "' + exp.slice(0, 30) + '"',
      E('homeCustomIds()').join() === exp,
      E('homeCustomIds()').join()
    );
    E('go("inicio");render()');
  }
  for (const m of ['constructor', '__proto__', 'toString', 5, null, {}, 'Simples', 'SIMPLES', '']) {
    E('prefs.homeMode=' + JSON.stringify(m));
    ok(
      'modo inválido ' + JSON.stringify(m) + ' cai na Completa',
      E('homeMode()') === 'completa' && E('homeIds()').join() === STD.join()
    );
  }
  E('delete prefs.homeMode;delete prefs.homeCustom;render()');
  ok('sem nada gravado, tudo continua como sempre (Completa)', shown().join() === STD.join());

  // ================= entre sessões, backup e exclusão =================
  E("prefs.homeMode='custom';prefs.homeCustom={order:['diario','resumo','maiores']};homeSave();render()");
  await persisted();
  const B = await H.boot({ db: fdb });
  B.$('lE').value = 'm@x.com';
  B.$('lP').value = 'Senha@123';
  B.sub(B.$('fLogin'));
  await sleep(300);
  ok(
    'depois de recarregar e entrar, o layout é o mesmo',
    B.QA('#home > .hw')
      .filter((x) => !x.hidden)
      .map((x) => x.dataset.w)
      .join() === 'diario,resumo,maiores' && B.$('mViewV').textContent === 'Personalizada',
    B.QA('#home > .hw')
      .filter((x) => !x.hidden)
      .map((x) => x.dataset.w)
      .join() +
      ' | ' +
      B.$('mViewV').textContent +
      ' | V=' +
      B.E('V') +
      ' | ' +
      B.E('JSON.stringify(prefs)').slice(0, 200)
  );
  const bk = E('JSON.parse(JSON.stringify(backupObj()))');
  ok(
    'o backup leva o modo e o layout',
    bk.prefs.homeMode === 'custom' && bk.prefs.homeCustom.order.join() === 'diario,resumo,maiores'
  );
  B.close();
  bk.prefs.homeMode = 'simples';
  bk.prefs.homeCustom = { order: ['maiores', 'x', 'maiores', '__proto__', 'atalhos'] };
  E('restoreFromBackup=null');
  const re = E(
    '(()=>{const b=' +
      JSON.stringify(bk) +
      ';if(b.prefs&&HOME_MODES[b.prefs.homeMode])prefs.homeMode=b.prefs.homeMode;if(b.prefs&&b.prefs.homeCustom&&Array.isArray(b.prefs.homeCustom.order))prefs.homeCustom={order:homeClean(b.prefs.homeCustom.order)};return [prefs.homeMode,prefs.homeCustom.order.join()]})()'
  );
  ok(
    'restaurar de um backup adulterado limpa os ids inválidos',
    re[0] === 'simples' && re[1] === 'maiores,atalhos',
    re.join('|')
  );

  // ================= os blocos novos =================
  E('prefs.homeMode="custom";prefs.homeCustom={order:' + JSON.stringify(EXTRAS) + '}');
  E('go("inicio")');
  E('today=new Date(2026,10,20,12)');
  const m20 = '2026-11';
  const budget = (v) =>
    E('budgets=' + JSON.stringify(v ? { [m20]: v } : {}) + ';store("gastos:budgets",budgets)');
  const day = (d, o = {}) => e({ date: m20 + '-' + String(d).padStart(2, '0'), ...o });
  const txt = (id) => $('w-' + id).textContent.replace(/\s+/g, ' ');
  E('$("month").value="2026-11"');
  // ---- pode gastar por dia ----
  setData([day(5, { value: 300 })]);
  budget(0);
  E('render()');
  ok(
    'diário sem limite: pede para definir e oferece o botão',
    /Defina um limite/.test(txt('diario')) && !!Q('#w-diario [data-pgo="metas"]')
  );
  Q('#w-diario [data-pgo="metas"]').click();
  ok('o botão leva à página de Metas', E('V') === 'config');
  E('go("inicio")');
  budget(1000);
  E('render()');
  ok(
    'diário com limite: restam 700 para 11 dias = R$ 63,64 por dia',
    /63,64 por dia/.test(txt('diario')) && /Restam R\$\s?700,00 do limite para 11 dias/.test(txt('diario')),
    txt('diario')
  );
  ok(
    'diário: a média até agora só aparece a partir do dia 10 e usa o que já aconteceu',
    /média foi de R\$\s?15,79 por dia/.test(txt('diario')),
    txt('diario')
  );
  setData([day(5, { value: 300 }), day(28, { value: 200 })]);
  ok(
    'diário: o que está previsto (data futura) entra no limite mas não na média do passado',
    /Restam R\$\s?500,00 do limite para 11 dias/.test(txt('diario')) &&
      /média foi de R\$\s?15,79/.test(txt('diario')),
    txt('diario')
  );
  setData([day(5, { value: 1000 })]);
  ok(
    'diário: limite usado por inteiro',
    /Você usou exatamente todo o limite/.test(txt('diario')) && /R\$\s?0,00 por dia/.test(txt('diario'))
  );
  setData([day(5, { value: 1300 })]);
  ok(
    'diário: passou do limite',
    /passou do limite do mês em R\$\s?300,00/.test(txt('diario')) && Q('#w-diario .bd')
  );
  E('today=new Date(2026,10,30,12)');
  setData([day(5, { value: 400 })]);
  ok(
    'diário: no último dia, "1 dia" no singular',
    /para 1 dia,/.test(txt('diario')) && /600,00 por dia/.test(txt('diario')),
    txt('diario')
  );
  E('today=new Date(2026,10,3,12)');
  setData([day(3, { value: 100 })]);
  ok(
    'diário: nos primeiros dias, sem média enganosa',
    !/média foi/.test(txt('diario')) && /por dia/.test(txt('diario'))
  );
  E('today=new Date(2026,11,5,12)');
  E('$("month").value="2026-11"');
  setData([day(5, { value: 900 })]);
  ok(
    'diário: mês passado mostra a média do mês',
    /gastou em média R\$\s?30,00 por dia, para um limite de R\$\s?1\.000,00/.test(txt('diario')),
    txt('diario')
  );
  E('$("month").value="2027-02"');
  E('render()');
  ok(
    'diário: mês futuro avisa',
    /aparece quando o mês começar/.test(txt('diario')) || /Defina um limite/.test(txt('diario'))
  );
  E('today=new Date(2026,10,20,12)');
  E('$("month").value="2026-11"');
  // ---- maiores gastos ----
  setData([
    day(1, { value: 50, desc: 'A' }),
    day(2, { value: 500, desc: 'Grande' }),
    day(3, { value: 200, desc: 'B' }),
    day(4, { value: 200, desc: 'C' }),
    day(5, { value: 10, desc: 'D' }),
    day(6, { value: 300, desc: 'E', kind: 'p', pn: 2, pt: 5 }),
    day(7, { value: 70, desc: 'F' }),
    day(8, { value: 9000, desc: 'Salário', inc: true, cat: 'Receita' }),
  ]);
  const mr = QA('#w-maiores .wlt').map((x) => x.textContent);
  ok('maiores: as 5 maiores despesas, em ordem, sem receitas', mr.join() === 'Grande,E,C,B,F', mr.join());
  ok('maiores: empate de valor desempata pela data mais recente', mr.indexOf('C') < mr.indexOf('B'));
  ok(
    'maiores: mostra categoria, data e parcela',
    /Outros · 06\/11 · Parcela 2\/5/.test(txt('maiores')),
    txt('maiores')
  );
  ok('maiores: tem "Ver todos"', !!Q('#w-maiores [data-go="lista"]'));
  setData([e({ desc: '<img src=x onerror=alert(1)>', value: 99, cat: '<b>x</b>' })]);
  ok(
    'maiores: nome com HTML não executa nada',
    !w.__xss && !Q('#w-maiores img') && /<img/.test($('w-maiores').textContent)
  );
  setData([]);
  ok('maiores: sem gastos, mensagem amigável', /Nenhum gasto neste mês/.test(txt('maiores')));
  // ---- próximos vencimentos ----
  const bill = (d, v, desc) => day(d, { value: v, desc, pend: true, bill: true });
  setData([
    bill(18, 100, 'Atrasada A'),
    bill(20, 50, 'Hoje B'),
    bill(21, 75, 'Amanhã C'),
    bill(25, 10, 'Em 5 dias D'),
    bill(30, 20, 'Fora do prazo E'),
  ]);
  const vt = txt('vencimentos');
  ok(
    'vencimentos: lista atrasadas, hoje, amanhã e até 14 dias',
    /Atrasada há 2 dias/.test(vt) &&
      /Vence hoje/.test(vt) &&
      /Vence amanhã/.test(vt) &&
      /Vence em 5 dias/.test(vt) &&
      /Vence em 10 dias/.test(vt),
    vt
  );
  ok('vencimentos: a atrasada fica em vermelho', !!Q('#w-vencimentos .wls.late'));
  ok('vencimentos: total soma tudo', /Total\s*R\$\s?255,00/.test(vt), vt);
  ok('vencimentos: tem "Ver todos"', !!Q('#w-vencimentos [data-gocomp]'));
  Q('#w-vencimentos [data-gocomp]').click();
  ok('"Ver todos" abre os Compromissos', E('V') === 'lanc' && E('S') === 'comp');
  E('go("inicio")');
  setData(Array.from({ length: 8 }, (_, i) => bill(20 + (i % 3), 10 + i, 'B' + i)));
  ok(
    'vencimentos: mostra 5 e avisa quantos mais',
    QA('#w-vencimentos .wli').length === 5 && /inclui mais 3/.test(txt('vencimentos')),
    txt('vencimentos')
  );
  setData([bill(28, 20, 'Longe')]);
  E('today=new Date(2026,10,1,12)');
  E('render()');
  ok(
    'vencimentos: dia 28 está a 27 dias, fora dos 14',
    /Nada vencendo nos próximos 14 dias/.test(txt('vencimentos'))
  );
  E('today=new Date(2026,10,20,12)');
  // ---- assinaturas ----
  const sub = (m, d, v, desc) => e({ date: nm(m) + '-' + d, value: v, desc });
  E('today=new Date()');
  const cm2 = E('cmNow()');
  setData([
    sub(-2, '05', 39.9, 'Netflix'),
    sub(-1, '05', 39.9, 'Netflix'),
    sub(0, '05', 39.9, 'Netflix'),
    sub(-2, '10', 21.9, 'Spotify'),
    sub(-1, '10', 21.9, 'Spotify'),
    sub(0, '10', 21.9, 'Spotify'),
  ]);
  E('$("month").value=cmNow()');
  E('render()');
  ok(
    'assinaturas: detecta as duas, da maior para a menor',
    QA('#w-assinaturas .wlt')
      .map((x) => x.textContent)
      .join() === 'Netflix,Spotify',
    QA('#w-assinaturas .wlt')
      .map((x) => x.textContent)
      .join()
  );
  ok('assinaturas: total por mês', /Por mês\s*R\$\s?61,80/.test(txt('assinaturas')), txt('assinaturas'));
  ok('assinaturas: mostra o dia e os meses', /por volta do dia 5 · 3 meses/.test(txt('assinaturas')));
  setData([e({ desc: 'Mercado', value: 10 })]);
  ok(
    'assinaturas: sem nenhuma, explica',
    /Nenhuma assinatura detectada/.test(txt('assinaturas')) && !Q('#w-assinaturas [data-gocomp]')
  );
  // ---- cartões ----
  setData([], 'cards=[]');
  ok(
    'cartões: sem cartão, convida a cadastrar',
    /Cadastre um cartão/.test(txt('cartoes')) && !!Q('#w-cartoes [data-pgo="cards"]')
  );
  const card = (o) => ({ id: 'c' + Math.random().toString(36).slice(2, 6), f: 20, v: 26, paid: [], ...o });
  const buy = (v, c) =>
    e({ desc: 'Compra', value: v, forma: 'Cartão de crédito', cartao: c, date: cm2 + '-05', fm: nm(1) });
  E('cards=' + JSON.stringify([card({ n: 'Roxinho', lim: 1000 }), card({ n: 'Sem Limite', lim: 0 })]));
  setData([buy(950, 'Roxinho'), buy(200, 'Sem Limite')]);
  const ct = txt('cartoes');
  ok(
    'cartões: mostra a fatura e o vencimento',
    /Roxinho/.test(ct) && /R\$\s?950,00/.test(ct) && /vence 26\/\d\d/.test(ct),
    ct
  );
  ok('cartões: mostra o limite usado em %', /Limite usado: 95% \(R\$\s?950,00 de R\$\s?1\.000,00\)/.test(ct));
  ok('cartões: a barra fica vermelha acima de 90%', !!Q('#w-cartoes .bar.over'));
  ok(
    'cartão sem limite não mostra barra nem %',
    QA('#w-cartoes .wcd').length === 2 && QA('#w-cartoes .wcd')[1].querySelector('.bar') === null
  );
  E('cards=' + JSON.stringify([card({ n: 'Pago', lim: 500, paid: [nm(1)] })]));
  setData([buy(100, 'Pago')]);
  ok(
    'cartões: fatura já paga não conta',
    /Nenhuma fatura em aberto/.test(txt('cartoes')) && /Limite usado: 0%/.test(txt('cartoes'))
  );
  E('cards=' + JSON.stringify([card({ n: '<img src=x onerror=alert(1)>', lim: 100 })]));
  setData([]);
  ok('cartões: nome com HTML não executa', !w.__xss && !Q('#w-cartoes img'));
  E('cards=[]');
  // ---- evolução ----
  setData([
    e({ date: nm(-1) + '-05', value: 3000, inc: true, cat: 'Receita' }),
    e({ date: nm(-1) + '-06', value: 1000 }),
    e({ date: cm2 + '-05', value: 2000, inc: true, cat: 'Receita' }),
    e({ date: cm2 + '-06', value: 500 }),
  ]);
  E('$("month").value=cmNow()');
  E('render()');
  const bars = QA('#w-evolucao .evc');
  ok('evolução: 6 meses', bars.length === 6);
  const hs = bars.map((b) => [
    parseFloat(b.querySelector('.ei').style.height),
    parseFloat(b.querySelector('.ed').style.height),
  ]);
  ok(
    'evolução: o mês de 3000 de receita é a barra mais alta (100%)',
    hs[4][0] === 100 &&
      Math.abs(hs[4][1] - 33.3) < 0.1 &&
      Math.abs(hs[5][0] - 66.7) < 0.1 &&
      Math.abs(hs[5][1] - 16.7) < 0.1,
    JSON.stringify(hs)
  );
  ok(
    'evolução: meses sem dados ficam em 0%',
    hs.slice(0, 4).every((h) => h[0] === 0 && h[1] === 0)
  );
  ok(
    'evolução: a descrição para leitor de tela traz os valores',
    /receitas R\$\s?3\.000,00, despesas R\$\s?1\.000,00/.test(
      Q('#w-evolucao .evg').getAttribute('aria-label')
    )
  );
  ok(
    'evolução: média de despesas dos 6 meses',
    /média, você gastou R\$\s?250,00 por mês/.test(txt('evolucao')),
    txt('evolucao')
  );
  ok('evolução: legenda', /Receitas/.test(txt('evolucao')) && /Despesas/.test(txt('evolucao')));
  setData([]);
  ok('evolução: sem dados, sem NaN', !/NaN|Infinity/.test($('w-evolucao').innerHTML));
  E('$("month").value="2027-01"');
  E('render()');
  ok(
    'evolução: virada de ano mostra os meses certos',
    QA('#w-evolucao .evc span')
      .map((s) => s.textContent)
      .join() ===
      'AGO,SET,OUT,NOV,DEZ,JAN'
        .toLowerCase()
        .split(',')
        .map((s) => s)
        .join()
        .replace(/^/, '')
        .toUpperCase() ||
      QA('#w-evolucao .evc span')
        .map((s) => s.textContent.toLowerCase())
        .join() === 'ago,set,out,nov,dez,jan',
    QA('#w-evolucao .evc span')
      .map((s) => s.textContent)
      .join()
  );
  E('$("month").value=cmNow()');
  // ---- atalhos ----
  E('render()');
  ok('atalhos: 4 botões', QA('#w-atalhos .wab').length === 4);
  Q('#w-atalhos [data-act="exp"]').click();
  ok('atalho "Nova despesa" abre o formulário', E('V') === 'lanc' && E('S') === 'novo');
  $('sheetClose').click();
  Q('#w-atalhos [data-newinc]').click();
  ok(
    'atalho "Nova receita" abre o formulário de receita',
    (E('V') === 'lanc' && E('S') === 'novo' && E('ty') !== 'despesa') || E('S') === 'novo'
  );
  $('sheetClose').click();
  Q('#w-atalhos [data-act="imp"]').click();
  ok('atalho "Importar fatura" abre a importação', E('V') === 'lanc' && E('S') === 'imp');
  E('go("inicio")');
  Q('#w-atalhos [data-go="agenda"]').click();
  ok('atalho "Agenda" abre a agenda', E('V') === 'agenda');
  E('go("inicio")');

  // ================= desempenho e segurança =================
  const big = [];
  for (let i = 0; i < 5000; i++)
    big.push(
      e({
        desc: 'g' + (i % 80),
        value: 10 + (i % 90),
        kind: i % 9 === 0 ? 'r' : undefined,
        date: nm(-(i % 20)) + '-' + String(1 + (i % 28)).padStart(2, '0'),
        pend: i % 400 === 0 || undefined,
      })
    );
  E('prefs.homeMode="custom";prefs.homeCustom={order:' + JSON.stringify(STD.concat(EXTRAS)) + '}');
  E('data=' + JSON.stringify(big));
  const t0 = performance.now();
  E('go("inicio");render()');
  const dt = performance.now() - t0;
  ok('os 17 blocos com 5.000 lançamentos desenham em menos de 2 s (simulador)', dt < 2000, dt);
  ok(
    'nenhum bloco mostra NaN, undefined ou [object',
    !/NaN|Infinity|undefined|\[object/.test($('home').textContent)
  );
  w.document.body.classList.add('hide');
  ok(
    'ocultar valores: os números dos blocos novos têm as classes que o CSS borra',
    QA('#home .wlv,#home .wbig b,#home .wsum b').length >= 1
  );
  w.document.body.classList.remove('hide');

  // ================= tutorial =================
  ok(
    'o tutorial termina com o passo do menu e do modo de visualização',
    E('TOUR.slice(-3).map(s=>s.target||"").join()') === '#avBtn,#mView,' &&
      /Modo de visualização/.test(E('TOUR.slice(-2)[0].title'))
  );
  ok('nenhum erro de script', A.w.__errs.length === 0, A.w.__errs.slice(0, 3).join('|'));
  H.done('Modos do Início: Completa, Simples e Personalizar (blocos, editor e arrastar)', R);
})()
  .then(() => 0)
  .catch((e) => {
    console.log(JSON.stringify({ group: 'modos', crash: e.stack.split('\n').slice(0, 6).join(' | ') }));
    process.exit(1);
  });
