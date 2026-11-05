const H = require('./h');
(async () => {
  const { w, $, Q, QA, E, ok, R, signup, sub, sleep } = await H.boot();
  await signup();
  const nat = Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value');
  const rnd = H.rng(4242);
  // simula o usuário: o navegador acrescenta o caractere ao valor e dispara "input"
  const typeCh = (el, ch) => {
    const ev = new w.KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
    if (ev.defaultPrevented) return false;
    nat.set.call(el, nat.get.call(el) + ch);
    el.dispatchEvent(new w.Event('input', { bubbles: true }));
    return true;
  };
  const back = (el) => {
    const v = nat.get.call(el);
    nat.set.call(el, v.slice(0, -1));
    el.dispatchEvent(new w.Event('input', { bubbles: true }));
  };
  const typeStr = (el, s) => {
    for (const c of s) typeCh(el, c);
  };
  const fmt = (c) =>
    (c / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const reset = (el) => {
    el.value = '';
  };
  let n = 0;
  w.eval('go("lanc");resetForm();go("lancar")');
  const f = $('fVal');
  ok('começa em 0,00', f.value === '0,00', f.value);
  // exemplos do pedido
  reset(f);
  typeStr(f, '857');
  ok('857 → 8,57', f.value === '8,57', f.value);
  typeStr(f, '0');
  ok('8570 → 85,70', f.value === '85,70', f.value);
  reset(f);
  typeStr(f, '860');
  ok('860 → 8,60', f.value === '8,60', f.value);
  reset(f);
  typeStr(f, '1');
  ok('1 → 0,01', f.value === '0,01');
  typeStr(f, '2');
  ok('12 → 0,12', f.value === '0,12');
  typeStr(f, '3');
  ok('123 → 1,23', f.value === '1,23');
  typeStr(f, '45');
  ok('12345 → 123,45', f.value === '123,45');
  typeStr(f, '678');
  ok('12345678 → 123.456,78', f.value === '123.456,78', f.value);
  // 1.000 sequências aleatórias
  for (let i = 0; i < 1000; i++) {
    const len = 1 + Math.floor(rnd() * 11);
    let s = '';
    for (let k = 0; k < len; k++) s += Math.floor(rnd() * 10);
    reset(f);
    typeStr(f, s);
    const c = parseInt(s.replace(/^0+/, '') || '0', 10);
    n++;
    ok('digitar ' + s, f.value === fmt(c), f.value + ' vs ' + fmt(c));
    ok('valor lido ' + s, Math.abs(E('parse($("fVal").value)') - c / 100) < 0.0001);
  }
  // letras, símbolos e espaços são ignorados
  for (const ch of [
    'a',
    'Z',
    '!',
    '@',
    '#',
    '$',
    '%',
    '.',
    ',',
    '-',
    '+',
    ' ',
    'ç',
    'é',
    'R',
    'x',
    '/',
    '\\',
    '*',
    '(',
    ')',
  ]) {
    reset(f);
    typeStr(f, '12');
    const before = f.value;
    const accepted = typeCh(f, ch);
    ok('ignora "' + ch + '"', f.value === before && accepted === false, f.value);
  }
  reset(f);
  typeStr(f, '1a2b3c');
  ok('misturado "1a2b3c" → 1,23', f.value === '1,23', f.value);
  // teclas de controle não são bloqueadas
  for (const k of [
    'Backspace',
    'Delete',
    'Tab',
    'ArrowLeft',
    'ArrowRight',
    'Enter',
    'Escape',
    'Home',
    'End',
  ]) {
    const ev = new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
    f.dispatchEvent(ev);
    ok('tecla ' + k + ' liberada', !ev.defaultPrevented);
  }
  for (const k of ['v', 'c', 'a', 'x'])
    ok(
      'Ctrl+' + k + ' liberado',
      (() => {
        const ev = new w.KeyboardEvent('keydown', { key: k, ctrlKey: true, bubbles: true, cancelable: true });
        f.dispatchEvent(ev);
        return !ev.defaultPrevented;
      })()
    );
  // apagar o último dígito
  reset(f);
  typeStr(f, '857');
  back(f);
  ok('apagar: 8,57 → 0,85', f.value === '0,85', f.value);
  back(f);
  ok('apagar: 0,85 → 0,08', f.value === '0,08');
  back(f);
  ok('apagar: 0,08 → 0,00', f.value === '0,00');
  back(f);
  ok('apagar no zero continua 0,00', f.value === '0,00');
  for (let i = 0; i < 200; i++) {
    const len = 2 + Math.floor(rnd() * 9);
    let s = '';
    for (let k = 0; k < len; k++) s += 1 + Math.floor(rnd() * 9);
    reset(f);
    typeStr(f, s);
    const k = 1 + Math.floor(rnd() * (len - 1));
    for (let j = 0; j < k; j++) back(f);
    const c = parseInt(s.slice(0, len - k), 10);
    n++;
    ok('apagar ' + k + ' de ' + s, f.value === fmt(c), f.value + ' vs ' + fmt(c));
  }
  // colar textos
  for (const [t, c] of [
    ['R$ 1.234,56', 123456],
    ['1234,56', 123456],
    ['12.345,67', 1234567],
    ['0,5', 5],
    ['  99  ', 99],
    ['abc', 0],
    ['', 0],
    ['1e5', 15],
    ['R$ 0,00', 0],
    ['9999999999999', 99999999999],
  ]) {
    reset(f);
    nat.set.call(f, t);
    f.dispatchEvent(new w.Event('input', { bubbles: true }));
    ok('colar "' + t + '"', f.value === fmt(c), f.value + ' vs ' + fmt(c));
  }
  // limite de dígitos
  reset(f);
  typeStr(f, '123456789012345');
  ok('máximo de 11 dígitos (ignora o excesso)', f.value === fmt(12345678901), f.value);
  // atribuição por código (ex.: editar lançamento) também formata
  for (const [v, exp] of [
    ['45', '45,00'],
    ['47,5', '47,50'],
    ['1234.56', '1.234,56'],
    ['', '0,00'],
    [null, '0,00'],
    [undefined, '0,00'],
    ['abc', '0,00'],
    [0, '0,00'],
    [12.3, '12,30'],
    [1000, '1.000,00'],
    ['-5', '5,00'],
    ['1.234,56', '1.234,56'],
    ['0,00', '0,00'],
    [99.999, '100,00'],
  ]) {
    f.value = v;
    n++;
    ok('f.value = ' + JSON.stringify(v), f.value === exp, f.value);
  }
  // todos os campos de valor do app
  const fields = [
    ['#fVal', () => $('fVal')],
    ['#budget', () => $('budget')],
    ['#cdLim', () => $('cdLim')],
    ['#gA', () => $('gA')],
    ['#acI', () => $('acI')],
  ];
  for (const [name, get] of fields) {
    const el = get();
    if (name === '#fVal') reset(el);
    ok(
      'campo ' + name + ' é de valor estilo banco',
      !!el.__money && el.getAttribute('inputmode') === 'numeric' && el.value === '0,00',
      name + ':' + el.value
    );
    reset(el);
    typeStr(el, '857');
    ok(name + ': 857 → 8,57', el.value === '8,57', el.value);
    typeStr(el, 'abc');
    ok(name + ': letras ignoradas', el.value === '8,57');
  }
  // campos que nascem dinamicamente
  E('go("config");cfgGo("metas");render()');
  await sleep(5);
  const cl = QA('[data-cl]');
  ok(
    'limites por categoria viram campos de valor',
    cl.length > 0 && cl.every((x) => x.__money && x.value === '0,00'),
    cl.length
  );
  reset(cl[0]);
  typeStr(cl[0], '15000');
  ok('limite da categoria: 150,00', cl[0].value === '150,00');
  cl[0].dispatchEvent(new w.Event('change', { bubbles: true }));
  await sleep(10);
  ok(
    'limite da categoria é salvo como 150',
    E('Object.values(catlim)[0]') === 150,
    E('JSON.stringify(catlim)')
  );
  E('render()');
  await sleep(5);
  const cl2 = QA('[data-cl]').find((x) => x.value !== '0,00');
  ok('limite salvo volta formatado ao redesenhar', !!cl2 && cl2.value === '150,00', cl2 && cl2.value);
  E('budgets={}');
  reset($('budget'));
  typeStr($('budget'), '100000');
  $('budget').dispatchEvent(new w.Event('change'));
  ok('limite do mês: 1.000,00 salvo', E('budgets[mkey()]') === 1000, $('budget').value);
  E('go("config");cfgGo("cards")');
  reset($('cdLim'));
  typeStr($('cdLim'), '300000');
  $('cdN').value = 'Teste';
  $('cdF').value = '5';
  $('cdV').value = '10';
  $('cdAdd').click();
  ok('limite do cartão: 3.000,00', E('cards[0].lim') === 3000, E('cards[0].lim'));
  E('go("config");cfgGo("goals")');
  $('gN').value = 'Viagem';
  reset($('gA'));
  typeStr($('gA'), '250050');
  $('gAdd').click();
  ok('meta do sonho: 2.500,50', E('goals[0].a') === 2500.5, E('goals[0].a'));
  await sleep(5);
  const gi = $('gBox').querySelector('[data-gi]');
  ok('campo "guardar" do sonho é de valor', !!gi.__money && gi.value === '0,00');
  typeStr(gi, '10000');
  $('gBox').querySelector('[data-gs]').click();
  ok('guardar 100,00 no sonho', E('goals[0].g') === 100, E('goals[0].g'));
  E('go("config");cfgGo("accts")');
  $('acN').value = 'Conta';
  reset($('acI'));
  typeStr($('acI'), '123456');
  $('acAdd').click();
  ok('saldo inicial: 1.234,56', E('accts[0].ini') === 1234.56, E('accts[0].ini'));
  // plano: novo valor
  E(
    'plans=[{gid:"p1",kind:"r",desc:"Aluguel",value:900,cat:"Moradia",day:5,start:"' +
      E('cmNow()') +
      '-05",active:true,skip:[]}];materialize();go("lanc");seg("comp");render()'
  );
  await sleep(5);
  const pv = $('compBox').querySelector('[data-pvi]');
  ok('"novo valor" do compromisso é de valor', !!pv.__money && pv.value === '0,00');
  typeStr(pv, '95000');
  $('compBox').querySelector('[data-pvs]').click();
  ok('novo valor 950,00 salvo', E('plans[0].value') === 950, E('plans[0].value'));
  // lançamento completo: digitar 857 e salvar
  w.eval('resetForm();go("lancar")');
  reset($('fVal'));
  typeStr($('fVal'), '857');
  $('fDesc').value = 'Teste';
  $('save').click();
  ok(
    'lançamento salvo com 8,57',
    E('data.some(x=>x.desc==="Teste"&&x.value===8.57)'),
    E('JSON.stringify(data.filter(x=>x.desc==="Teste"))')
  );
  ok('depois de salvar o campo volta a 0,00', (w.eval('resetForm()'), $('fVal').value === '0,00'));
  // salvar com zero é recusado
  w.eval('go("lancar")');
  $('fDesc').value = 'Zero';
  $('save').click();
  ok('0,00 não salva', /valor/i.test($('err').textContent) && !E('data.some(x=>x.desc==="Zero")'));
  // editar: o valor aparece formatado
  E('go("lanc");seg("hist");render()');
  w.eval('mode="edit"');
  E('render()');
  const row = QA('#rows .hr').find((r) => /Teste/.test(r.textContent));
  row.click();
  ok('editar mostra 8,57', $('fVal').value === '8,57', $('fVal').value);
  // assistente: valor do rascunho editável no mesmo estilo
  $('sheetClose').click();
  $('aiBtn').click();
  $('aiIn').value = 'gastei 45,5 no mercado';
  sub($('aiForm'));
  await sleep(20);
  const dv = Q('#aiMsgs .draft [data-f="value"]');
  ok('rascunho do assistente: valor formatado', !!dv && dv.__money && dv.value === '45,50', dv && dv.value);
  reset(dv);
  typeStr(dv, '6789');
  ok('rascunho: digitar 6789 → 67,89', dv.value === '67,89');
  Q('#aiMsgs .draft [data-a="ok"]').click();
  ok('assistente grava 67,89', E('data.some(x=>x.value===67.89)'));
  // saldos e valores grandes
  reset(f);
  typeStr(f, '99999999999');
  ok('maior valor: 999.999.999,99', f.value === '999.999.999,99', f.value);
  ok('nenhum erro de script', w.__errs.length === 0, w.__errs.slice(0, 3).join('|'));
  H.done('Campos de valor estilo banco', R, { cases: n });
})().catch((e) => {
  console.log(JSON.stringify({ group: 'valores', crash: e.stack.split('\n').slice(0, 4).join(' | ') }));
  process.exit(1);
});
