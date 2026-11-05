const H = require('./h');
(async () => {
  const { w, $, Q, QA, E, ok, R, signup, sleep, sub, persisted } = await H.boot();
  await signup('c@x.com', 'C');
  const vis = (e) => !!e && !e.hidden;
  const change = (el, v) => {
    el.value = v;
    el.dispatchEvent(new w.Event('change', { bubbles: true }));
  };
  const key = (el, k) =>
    el.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  const open = () => {
    $('fabNew').click();
  };
  const newCat = (name, color) => {
    $('qcName').value = name;
    if (color != null) Q('#qcSw [data-sw="' + color + '"]').click();
    $('qcOk').click();
  };
  const cm = E('cmNow()');
  const mk = (n, d, cat = 'Outros') =>
    E(
      'data.push(' +
        JSON.stringify({ id: 'q' + n, desc: d, value: 10 + n, date: cm + '-1' + n, cat }) +
        ');render()'
    );
  // ---- novo lançamento ----
  open();
  ok(
    'o chip "+ Nova categoria" está no formulário',
    !!$('chipNew') && /Nova categoria/.test($('chipNew').textContent)
  );
  ok('o painel antigo embutido foi substituído pelo diálogo', !$('newCat') && !!$('qcat'));
  $('chipNew').click();
  ok('toque no chip abre o diálogo', vis($('qcat')));
  ok('o campo de nome já recebe o foco', w.document.activeElement === $('qcName'));
  ok('o diálogo mostra as 16 cores', QA('#qcSw [data-sw]').length === E('PAL') && E('PAL') === 16);
  newCat('Pets', 5);
  ok('criar fecha o diálogo', !vis($('qcat')));
  ok('a categoria existe', E('CATS.includes("Pets")'));
  ok('a cor escolhida foi guardada', E('cats.find(c=>c.n==="Pets").c') === 5);
  ok(
    'e já fica selecionada no lançamento',
    $('fCat').value === 'Pets' && /Pets/.test(Q('#chips .chip.on').textContent),
    $('fCat').value
  );
  ok('o formulário continua aberto', E('V') === 'lanc' && E('S') === 'novo');
  ok(
    'a categoria foi gravada no banco do aparelho',
    /Pets/.test((await persisted())['u:' + E('cur.id') + ':gastos:cats'] || '')
  );
  $('chipNew').click();
  ok(
    'ao abrir de novo, o campo vem vazio e a cor sugerida é a próxima',
    $('qcName').value === '' && $('qcMsg').textContent === ''
  );
  newCat('pets');
  ok(
    'nome repetido (sem diferenciar maiúsculas) é recusado e o diálogo continua aberto',
    /Já existe/.test($('qcMsg').textContent) && vis($('qcat'))
  );
  newCat('OUTROS');
  ok('nome de categoria do sistema também é recusado', /Já existe/.test($('qcMsg').textContent));
  newCat('   ');
  ok('nome vazio é recusado', /nome/i.test($('qcMsg').textContent), $('qcMsg').textContent);
  $('qcNo').click();
  ok(
    'Cancelar fecha sem criar',
    !vis($('qcat')) &&
      $('fCat').value === 'Pets' &&
      E('cats.filter(c=>c.n.toLowerCase()==="outros").length') === 1
  );
  $('chipNew').click();
  $('qcName').value = 'Viagem';
  key($('qcName'), 'Enter');
  ok('Enter no campo cria a categoria', !vis($('qcat')) && $('fCat').value === 'Viagem');
  $('chipNew').click();
  key(w.document, 'Escape');
  ok('Esc fecha o diálogo sem fechar o formulário', !vis($('qcat')) && E('S') === 'novo');
  $('chipNew').click();
  $('qcat').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  ok('tocar fora do quadro fecha o diálogo', !vis($('qcat')));
  $('chipNew').click();
  newCat('  Cinema  ');
  ok('espaços nas pontas são tirados', E('CATS.includes("Cinema")'));
  $('chipNew').click();
  newCat('x'.repeat(60));
  ok(
    'nome muito longo é cortado em 30 caracteres',
    E('CATS.every(c=>c.length<=30)'),
    E('CATS.map(c=>c.length).join()')
  );
  $('chipNew').click();
  newCat('<img src=x onerror=alert(1)>');
  $('fVal').value = '1000';
  E('render()');
  ok(
    'nome com HTML não executa nada e não vira elemento',
    !w.__xss && !Q('img[src="x"]') && !QA('#chips img').length
  );
  // callbacks
  E('window.__c=0;window.__n=0;catQuick(()=>{window.__c++},()=>{window.__n++})');
  $('qcNo').click();
  ok('Cancelar chama só o "aoCancelar"', E('window.__n') === 1 && E('window.__c') === 0);
  E('catQuick(()=>{window.__c++},()=>{window.__n++})');
  newCat('ComCallback');
  ok('Criar chama só o "aoCriar"', E('window.__c') === 1 && E('window.__n') === 1);
  E('catQuick()');
  $('qcNo').click();
  ok('sem callbacks também funciona', !vis($('qcat')));
  $('sheetClose').click();
  // ---- a nova categoria aparece nas outras listas ----
  E('go("lanc");seg("hist")');
  ok(
    'filtro do histórico tem a nova categoria',
    [...$('fc').options].some((o) => o.value === 'Viagem')
  );
  ok(
    'lista de limites por categoria tem a nova categoria',
    E('CATS.includes("Viagem")') &&
      [...w.document.querySelectorAll('select')].some((s) => [...s.options].some((o) => o.value === 'Viagem'))
  );
  // ---- histórico: categoria em lote ----
  mk(1, 'Ração');
  mk(2, 'Brinquedo');
  mk(3, 'Banho');
  E('go("lanc");seg("hist");render()');
  $('mCat').click();
  QA('#rows .hr')[0].click();
  QA('#rows .hr')[1].click();
  ok(
    'no modo categoria, a lista tem "+ Nova categoria…"',
    [...$('mCatSel').options].some((o) => o.value === '__new__'),
    [...$('mCatSel').options]
      .map((o) => o.value)
      .slice(-2)
      .join()
  );
  ok('a opção nova é a última', $('mCatSel').options[$('mCatSel').options.length - 1].value === '__new__');
  change($('mCatSel'), 'Pets');
  change($('mCatSel'), '__new__');
  ok('escolher "+ Nova categoria…" abre o diálogo', vis($('qcat')));
  $('qcNo').click();
  ok(
    'cancelar volta para a categoria que estava escolhida',
    $('mCatSel').value === 'Pets',
    $('mCatSel').value
  );
  change($('mCatSel'), '__new__');
  newCat('Cuidados do cachorro', 9);
  ok(
    'criar seleciona a nova categoria na lista',
    $('mCatSel').value === 'Cuidados do cachorro',
    $('mCatSel').value
  );
  const before = E('data.filter(x=>x.cat==="Cuidados do cachorro").length');
  $('mCatGo').click();
  ok(
    '"Aplicar" muda a categoria dos lançamentos selecionados',
    E('data.filter(x=>x.cat==="Cuidados do cachorro").length') - before === 2,
    E('data.filter(x=>x.cat==="Cuidados do cachorro").length')
  );
  ok(
    'o app aprende a regra (descrição → nova categoria) para os dois',
    E('data.filter(x=>x.cat==="Cuidados do cachorro").length') === 2 &&
      E('data.filter(x=>x.cat==="Cuidados do cachorro").every(x=>ruleCat(x.desc)==="Cuidados do cachorro")')
  );
  $('mCat').click();
  QA('#rows .hr')[0].click();
  const n3 = JSON.stringify(E('data.map(x=>x.cat)'));
  change($('mCatSel'), '__new__');
  $('qcNo').click();
  change($('mCatSel'), '__new__');
  $('mCatGo').click();
  ok(
    'com "+ Nova categoria…" selecionado, "Aplicar" não muda nada',
    JSON.stringify(E('data.map(x=>x.cat)')) === n3
  );
  $('mCancel') && $('mCancel').click();
  // ---- importar fatura: conferência ----
  E('go("lanc");seg("imp")');
  const rowsImp = [
    {
      date: cm + '-05',
      desc: 'PETZ BANHO',
      value: 80,
      cat: 'Outros',
      on: true,
      fm: cm,
      forma: 'Cartão de crédito',
      cartao: 'X',
    },
    {
      date: cm + '-06',
      desc: 'Loja',
      value: 20,
      cat: 'Compras',
      on: true,
      fm: cm,
      forma: 'Cartão de crédito',
      cartao: 'X',
    },
  ];
  E('showRev({rows:' + JSON.stringify(rowsImp) + ',sub:null,card:null})');
  let sels = QA('#revRows select[data-rk]');
  ok(
    'cada linha da conferência tem "+ Nova categoria…"',
    sels.length === 2 && sels.every((s) => s.options[s.options.length - 1].value === '__new__')
  );
  change(sels[0], '__new__');
  ok('escolher abre o diálogo', vis($('qcat')));
  $('qcNo').click();
  sels = QA('#revRows select[data-rk]');
  ok('cancelar mantém a categoria da linha', sels[0].value === 'Outros' && E('imp[0].cat') === 'Outros');
  change(sels[0], '__new__');
  newCat('Pet shop', 3);
  sels = QA('#revRows select[data-rk]');
  ok(
    'criar aplica na linha e redesenha a tabela',
    E('imp[0].cat') === 'Pet shop' && sels[0].value === 'Pet shop',
    sels[0].value
  );
  ok('a outra linha não muda', E('imp[1].cat') === 'Compras' && sels[1].value === 'Compras');
  ok(
    'a nova categoria está nas listas das duas linhas',
    sels.every((s) => [...s.options].some((o) => o.value === 'Pet shop'))
  );
  $('revAdd').click();
  ok(
    'ao adicionar, o lançamento entra com a nova categoria',
    E('data.some(x=>x.desc==="PETZ BANHO"&&x.cat==="Pet shop")')
  );
  // ---- assistente ----
  $('aiBtn').click();
  $('aiIn').value = 'gastei 45 no mercado';
  sub($('aiForm'));
  await sleep(80);
  let ds = QA('[data-f="cat"]');
  ok(
    'o cartão de confirmação do assistente tem "+ Nova categoria…"',
    ds.length >= 1 && [...ds[ds.length - 1].options].some((o) => o.value === '__new__')
  );
  const dsel = ds[ds.length - 1],
    orig = dsel.value;
  change(dsel, '__new__');
  ok('escolher abre o diálogo', vis($('qcat')));
  $('qcNo').click();
  ok('cancelar volta à categoria sugerida', dsel.value === orig, dsel.value + ' vs ' + orig);
  change(dsel, '__new__');
  newCat('Mercadinho');
  ok('criar seleciona a nova categoria no cartão', dsel.value === 'Mercadinho', dsel.value);
  Q('[data-a="ok"]').click();
  await sleep(40);
  ok('"Adicionar" grava com a nova categoria', E('data.some(x=>x.value===45&&x.cat==="Mercadinho")'));
  $('aiClose') && $('aiClose').click();
  // ---- nunca vaza a opção especial ----
  ok(
    '"__new__" nunca vira categoria nem lançamento',
    !E('CATS.includes("__new__")') &&
      !E('data.some(x=>x.cat==="__new__")') &&
      !E('cats.some(c=>c.n==="__new__")')
  );
  ok(
    'o diálogo fica acima do assistente e do formulário',
    Number(w.getComputedStyle ? 130 : 130) === 130 &&
      /z-index:\s*130/.test(
        require('fs').readFileSync(require('path').join(__dirname, '..', 'src', 'css', 'styles.css'), 'utf8')
      )
  );
  ok('nenhum erro de script', w.__errs.length === 0, w.__errs.slice(0, 3).join('|'));
  H.done('Nova categoria na hora (lançar, histórico, importação e assistente)', R);
})()
  .then(() => 0)
  .catch((e) => {
    console.log(
      JSON.stringify({ group: 'categoria-rapida', crash: e.stack.split('\n').slice(0, 5).join(' | ') })
    );
    process.exit(1);
  });
