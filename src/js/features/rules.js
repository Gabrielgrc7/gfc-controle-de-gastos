/* features/rules.js
   Regras que o app aprende quando você corrige uma categoria, e a tela que lista essas regras. */

const normKey = (d) =>
  String(d || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*-?\s*parcela\s+\d+\/\d+/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .join(' ');

const ruleCat = (d) => {
  const k = normKey(d),
    r = k && rules.find((x) => x.k === k);
  return r && CATS.includes(r.c) ? r.c : '';
};

function learn(desc, cat) {
  const k = normKey(desc);
  if (!k || !cat || cat === 'A revisar' || cat === 'Receita' || !CATS.includes(cat)) return;
  const r = rules.find((x) => x.k === k);
  if (r) r.c = cat;
  else rules.push({ k, c: cat });
  store('gastos:rules', rules);
}

function learnFrom(rows) {
  rows.forEach((r) => {
    if (!r.inc && r.cat !== r.cat0) learn(r.desc, r.cat);
  });
}

function renderRules() {
  $('rBox').innerHTML = rules.length
    ? rules
        .map(
          (r, i) =>
            '<div class="rw"><div style="min-width:0"><div class="hx">contém "' +
            esc(r.k) +
            '"</div><div class="mut">vai para ' +
            esc(r.c) +
            '</div></div><button class="lk" data-rdel="' +
            i +
            '" style="color:var(--bad);font-size:12px">Excluir</button></div>'
        )
        .join('')
    : '<div class="empty" style="padding:14px 0">Ainda não há regras. Elas nascem quando você corrige uma categoria.</div>';
}

$('rBox').addEventListener('click', (e) => {
  const d = e.target.closest('[data-rdel]');
  if (d) {
    rules.splice(+d.dataset.rdel, 1);
    store('gastos:rules', rules);
    render();
  }
});

$('rApply').onclick = () => {
  let n = 0;
  data.forEach((x) => {
    if (!x.inc && x.cat === 'A revisar') {
      const c = ruleCat(x.desc);
      if (c) {
        x.cat = c;
        n++;
      }
    }
  });
  saveAll();
  render();
  say(
    $('rMsg'),
    n ? n + ' lançamentos reclassificados.' : 'Nenhum lançamento em "A revisar" combina com as regras.'
  );
};
