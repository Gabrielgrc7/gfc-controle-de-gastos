/* features/demo.js
   Modo de exemplo: abre o app com dados fictícios, sem cadastro, para qualquer pessoa conhecer o GFC em segundos.
   Os dados ficam numa área separada (u:demo:), são sempre refeitos ao entrar e apagados ao sair. Nada disso é uma conta. */

/* gerador de números repetível: o exemplo sempre tem o mesmo "jeitão" */
function demoRng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* monta seis meses de dados fictícios, sempre terminando em "hoje" */
function seedDemo() {
  const put = (k, v) => store('u:demo:' + k, v),
    r = demoRng(20261028),
    cm = cmNow(),
    td = iso(today);
  const pick = (a) => a[Math.floor(r() * a.length)],
    val = (a, b) => Math.round((a + r() * (b - a)) * 100) / 100;
  const card = { id: uid(), n: 'Cartão Exemplo', lim: 6000, f: 25, v: 5, paid: [] };
  /* faturas antigas já pagas; só a que fechou há pouco fica em aberto */
  const im = invMonth(td, card);
  for (let k = -8; k <= -2; k++) card.paid.push(addM(im, k));
  const items = [];
  const add = (date, desc, value, cat, extra) => {
    if (date > td) return;
    items.push(Object.assign({ id: uid(), desc, value, date, cat, forma: 'Pix' }, extra || {}));
  };
  const credit = (date, desc, value, cat) =>
    add(date, desc, value, cat, { forma: 'Cartão de crédito', cartao: card.n, fm: invMonth(date, card) });
  for (let k = -5; k <= 0; k++) {
    const m = addM(cm, k),
      d = (n) => m + '-' + pad2(dayIn(m, n)),
      day = () => 1 + Math.floor(r() * 28);
    for (let i = 0; i < 5; i++)
      add(
        d(day()),
        pick(['Mercado Bom Preço', 'Supermercado Central', 'Hortifruti da Esquina']),
        val(38, 260),
        'Supermercado',
        { forma: pick(['Pix', 'Cartão de débito']) }
      );
    for (let i = 0; i < 4; i++)
      credit(
        d(day()),
        pick(['Restaurante Sabor Caseiro', 'Pizzaria Napoli', 'Hamburgueria do Zé', 'Café da Praça']),
        val(32, 120),
        'Alimentação'
      );
    for (let i = 0; i < 5; i++) add(d(day()), 'Uber', val(14, 42), 'Transporte');
    add(d(day()), 'Farmácia Vida', val(28, 130), 'Saúde');
    add(d(day()), pick(['Cinema', 'Show', 'Parque', 'Bar com amigos']), val(45, 190), 'Lazer');
    if (r() > 0.45)
      credit(
        d(day()),
        pick(['Loja de Roupas Moda', 'Tênis Sport', 'Livraria Central']),
        val(80, 320),
        'Compras'
      );
    if (r() > 0.5) add(d(day()), 'Barbearia', val(40, 70), 'Cuidados pessoais');
    add(d(1 + Math.floor(r() * 8)), 'Curso de inglês', 189, 'Educação', {
      forma: 'Boleto / débito automático',
    });
  }
  /* para o assistente de alertas ter o que mostrar: uma cobrança duplicada e um gasto fora do normal */
  const back = (n) => iso(new Date(today.getTime() - n * 864e5));
  credit(back(1), 'Streaming Plus', 29.9, 'Assinaturas');
  credit(back(0), 'Streaming Plus', 29.9, 'Assinaturas');
  add(back(2), 'Uber', 148.7, 'Transporte');
  const bill = Math.min(today.getDate() + 3, dayIn(cm, 31)),
    plan = (o) => Object.assign({ gid: uid(), active: true, skip: [] }, o);
  const plans = [
    plan({
      kind: 'r',
      desc: 'Salário',
      value: 5200,
      cat: 'Receita',
      day: 5,
      start: addM(cm, -5) + '-05',
      inc: true,
      forma: 'Pix',
    }),
    plan({
      kind: 'r',
      desc: 'Aluguel',
      value: 1450,
      cat: 'Moradia',
      day: 8,
      start: addM(cm, -5) + '-08',
      forma: 'Boleto / débito automático',
    }),
    plan({
      kind: 'r',
      desc: 'Internet',
      value: 99.9,
      cat: 'Contas',
      day: bill,
      start: addM(cm, -5) + '-' + pad2(Math.min(bill, 28)),
      forma: 'Boleto / débito automático',
      pend: true,
    }),
    plan({
      kind: 'r',
      desc: 'Netflix',
      value: 55.9,
      cat: 'Assinaturas',
      day: 15,
      start: addM(cm, -5) + '-15',
      forma: 'Cartão de crédito',
      cartao: card.n,
    }),
    plan({
      kind: 'r',
      desc: 'Spotify',
      value: 21.9,
      cat: 'Assinaturas',
      day: 10,
      start: addM(cm, -5) + '-10',
      forma: 'Cartão de crédito',
      cartao: card.n,
    }),
    plan({
      kind: 'r',
      desc: 'Academia',
      value: 119,
      cat: 'Saúde',
      day: 3,
      start: addM(cm, -5) + '-03',
      forma: 'Pix',
    }),
    plan({
      kind: 'p',
      desc: 'Notebook',
      value: 458.33,
      cat: 'Compras',
      day: 12,
      start: addM(cm, -2) + '-12',
      pn: 1,
      pt: 6,
      forma: 'Cartão de crédito',
      cartao: card.n,
    }),
    plan({
      kind: 'p',
      desc: 'Geladeira',
      value: 289.9,
      cat: 'Moradia',
      day: 20,
      start: addM(cm, -1) + '-20',
      pn: 4,
      pt: 10,
      forma: 'Cartão de crédito',
      cartao: card.n,
    }),
  ];
  put('gastos:items', items);
  put('gastos:plans', plans);
  put('gastos:cards', [card]);
  put('gastos:accts', [
    { id: uid(), n: 'Conta Corrente', ini: 1800 },
    { id: uid(), n: 'Poupança', ini: 6000 },
  ]);
  put('gastos:goals', [
    { id: uid(), n: 'Viagem para o Nordeste', a: 6000, g: 2400, p: addM(cm, 8) },
    { id: uid(), n: 'Reserva de emergência', a: 15000, g: 4500, p: '' },
  ]);
  put('gastos:budgets', { [cm]: 4300 });
  put('gastos:catlim', { Supermercado: 1100, Alimentação: 600, Lazer: 300 });
  put('gastos:prefs', { tourDone: true });
}

function startDemo() {
  storeKeys('u:demo:').forEach(storeRemove);
  seedDemo();
  setSess('demo', false);
  enter({
    id: 'demo',
    name: 'Visitante',
    email: '',
    demo: true,
    consent: { v: POLICY_V, at: new Date().toISOString() },
  });
}

$('demoBtn').onclick = startDemo;
$('demoMake').onclick = () => {
  $('out').click();
  showAuth(true);
};
$('demoOut').onclick = () => $('out').click();
/* ao sair, o exemplo é apagado e a barra some */
$('out').addEventListener('click', () => {
  if (cur && cur.demo) storeKeys('u:demo:').forEach(storeRemove);
  $('demoBar').hidden = true;
});
const aeDemo = afterEnter;
afterEnter = function () {
  aeDemo();
  $('demoBar').hidden = !(cur && cur.demo);
  if (!cur.demo) storagePersist();
};
