/* features/categories.js
   Categorias livres: criar, renomear, trocar cor, excluir, e sugestão de categoria por palavras-chave. */

const CATS = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Saúde',
  'Lazer',
  'Educação',
  'Compras',
  'Contas',
  'Outros',
];

CATS.forEach((c) => {
  $('fCat').add(new Option(c, c));
});

const col = (c) => 'var(--c' + ((c in catIdx ? catIdx[c] : Math.max(0, CATS.indexOf(c))) % 16) + ')';

const guess = (d) => {
  d = d.toLowerCase();
  if (/uber|99|nupay|estacion|taxi|combust/.test(d) && !/food/.test(d)) return 'Transporte';
  if (/food|pizza|lanche|mc ?donald|extra|milk|caf[eé]|crunc|quiosq|blend|mercado|praia/.test(d))
    return 'Alimentação';
  if (/renner|loja|roupa/.test(d)) return 'Compras';
  return 'Outros';
};

const catOf = (d) => {
  d = d.toLowerCase();
  /* lojas online antes de "mercado": Mercado Livre é compra, não supermercado */
  if (/mercado ?livre|shopee|amazon|aliexpress|magalu|americanas|shein/.test(d)) return 'Compras';
  /* seguros são contas fixas (antes de "dent", que seria dentista) */
  if (/seguradora|seguro|\bapol\d/.test(d)) return 'Contas';
  if (
    /99 ?food|ifood|lanchon|pizza|donald|milk ?shake|burger|restaur|padaria|caf[eé]|quiosq|sorvet|blend|doces|pastel|cacau|chocolate|suco|gr[aã]o |a[cç]a[ií]|churrasc|lanchonete|cafeteria|starbucks|outback|subway/.test(
      d
    )
  )
    return 'Alimentação';
  if (/assa[ií]|carrefour|atacad|supermerc|mini extra|extra-|mercado|hortifruti|a[cç]ougue|frigo/.test(d))
    return 'Supermercado';
  if (/uber|99 - |99pop|estacion|posto\b|combust|sem parar|veloe|ped[aá]gio/.test(d)) return 'Transporte';
  if (/drog|farm|raia|pacheco|hospital|cl[ií]nica|dent|laborat|rdsaude|sa[uú]de/.test(d)) return 'Saúde';
  if (
    /youtube|crunchyroll|netflix|spotify|disney|hbo|deezer|apple\.com|openai|chatgpt|icloud|google (one|play)|prime video|globoplay|paramount|adobe|canva|dropbox/.test(
      d
    )
  )
    return 'Assinaturas';
  if (/cinema|ingresso|steam|playstation|sorte|airbnb|booking|decolar|hotel|latam|passagem|pousada/.test(d))
    return 'Lazer';
  if (
    /renner|zara|inditex|riachuelo|shein|magalu|shopee|amazon|americanas|centauro|mercado ?livre|casas bahia|[oó]tica|hering|c ?& ?a\b/.test(
      d
    )
  )
    return 'Compras';
  if (
    /barbear|cabelo|sal[aã]o|est[eé]tica|cosm[eé]t|boticario|natura|academia|evo\*|lavateria|lavanderia/.test(
      d
    )
  )
    return 'Cuidados pessoais';
  if (
    /aluguel|condom|iptu|constru|leroy|tok ?&? ?stok|sodimac|telhanorte|desentup|encanador|eletricista/.test(
      d
    )
  )
    return 'Moradia';
  if (/vivo|claro|comg[aá]s|enel|sabesp|energia|[aá]gua|internet/.test(d)) return 'Contas';
  if (/curso|escola|faculdade|udemy|alura|livraria|papelaria/.test(d)) return 'Educação';
  return 'A revisar';
};

$('chips').onclick = (e) => {
  const b = e.target.closest('[data-c]');
  if (b) {
    $('fCat').value = b.dataset.c;
    extra();
  }
};

const catByKey = (k) => {
  const x = cats.find((c) => c.k === k);
  return x ? x.n : CATS.includes('A revisar') ? 'A revisar' : 'Outros';
};

const defCats = () => DEF.map(([n, c]) => ({ n, c, k: n, sys: n === 'Outros' || n === 'A revisar' }));

function applyCats() {
  CATS.splice(0, CATS.length, ...cats.map((x) => x.n));
  Object.keys(catIdx).forEach((k) => delete catIdx[k]);
  cats.forEach((x) => {
    catIdx[x.n] = x.c;
  });
  const o = $('fCat'),
    ov = o.value,
    f = $('fc'),
    fv = f.value;
  o.innerHTML = '';
  CATS.forEach((c) => o.add(new Option(c, c)));
  o.value = CATS.includes(ov) ? ov : CATS[0];
  f.innerHTML = '';
  f.add(new Option('Todas as categorias', ''));
  CATS.forEach((c) => f.add(new Option(c, c)));
  f.value = CATS.includes(fv) ? fv : '';
}

function addCat(name, c) {
  name = cleanName(name);
  if (!name) return 'Dê um nome à categoria.';
  if (cats.some((x) => x.n.toLowerCase() === name.toLowerCase()))
    return 'Já existe uma categoria com esse nome.';
  cats.push({ n: name, c: c == null ? cats.length % PAL : c });
  saveCats();
  applyCats();
  return '';
}

function renameCat(o, n) {
  n = cleanName(n);
  const x = cats.find((c) => c.n === o);
  if (!x || !n || n === o) return '';
  if (x.sys) return 'Esta categoria é padrão e não pode ser renomeada.';
  if (cats.some((c) => c !== x && c.n.toLowerCase() === n.toLowerCase()))
    return 'Já existe uma categoria com esse nome.';
  x.n = n;
  data.forEach((e) => {
    if (e.cat === o) e.cat = n;
  });
  plans.forEach((p) => {
    if (p.cat === o) p.cat = n;
  });
  if (catlim[o] != null) {
    catlim[n] = catlim[o];
    delete catlim[o];
  }
  saveAll();
  applyCats();
  return '';
}

function delCat(n) {
  const x = cats.find((c) => c.n === n);
  if (!x || x.sys) return;
  data.forEach((e) => {
    if (e.cat === n) e.cat = 'Outros';
  });
  plans.forEach((p) => {
    if (p.cat === n) p.cat = 'Outros';
  });
  delete catlim[n];
  cats = cats.filter((c) => c !== x);
  saveAll();
  applyCats();
}

let cgC = 0;

const drawSw = (id, s) => {
  $(id).innerHTML = Array.from(
    { length: PAL },
    (_, i) =>
      '<button type="button" class="swc' +
      (i === s ? ' on' : '') +
      '" data-sw="' +
      i +
      '" style="background:var(--c' +
      i +
      ')" aria-label="Cor ' +
      (i + 1) +
      '"></button>'
  ).join('');
};

$('cgSw').onclick = (e) => {
  const b = e.target.closest('[data-sw]');
  if (b) {
    cgC = +b.dataset.sw;
    drawSw('cgSw', cgC);
  }
};

$('cgAdd').onclick = () => {
  const r = addCat($('cgName').value, cgC);
  $('cgMsg').style.color = r ? 'var(--bad)' : 'var(--mute)';
  $('cgMsg').textContent = r || 'Categoria criada.';
  if (!r) {
    $('cgName').value = '';
    cgC = cats.length % PAL;
    drawSw('cgSw', cgC);
    render();
  }
};

function renderCatMgr() {
  if (!$('cgSw').children.length) {
    cgC = cats.length % PAL;
    drawSw('cgSw', cgC);
  }
  if ($('cgList').contains(document.activeElement)) return;
  $('cgList').innerHTML = cats
    .map(
      (x) =>
        '<div class="cr"><button class="swc on" data-cc="' +
        esc(x.n) +
        '" style="background:var(--c' +
        (x.c % PAL) +
        ')" aria-label="Mudar a cor de ' +
        esc(x.n) +
        '"></button><input data-cn="' +
        esc(x.n) +
        '" value="' +
        esc(x.n) +
        '" maxlength="30" aria-label="Nome"' +
        (x.sys ? ' disabled' : '') +
        '><span class="mut">' +
        data.filter((e) => e.cat === x.n).length +
        '</span>' +
        (x.sys
          ? '<span style="width:52px"></span>'
          : '<button class="lk" data-cd="' + esc(x.n) + '" style="color:var(--bad)">Excluir</button>') +
        '</div>'
    )
    .join('');
}

$('cgList').addEventListener('click', (e) => {
  const c = e.target.closest('[data-cc]'),
    d = e.target.closest('[data-cd]');
  if (c) {
    const x = cats.find((k) => k.n === c.dataset.cc);
    if (x) {
      x.c = (x.c + 1) % PAL;
      saveCats();
      render();
    }
  }
  if (d) {
    if (!d.dataset.c) {
      d.dataset.c = 1;
      d.textContent = 'Confirmar';
      setTimeout(() => {
        if (d.isConnected && d.dataset.c) {
          delete d.dataset.c;
          d.textContent = 'Excluir';
        }
      }, 3000);
    } else {
      delCat(d.dataset.cd);
      $('cgMsg').textContent = 'Categoria excluída. Os lançamentos foram para Outros.';
      render();
    }
  }
});

$('cgList').addEventListener('change', (e) => {
  const i = e.target.closest('[data-cn]');
  if (!i) return;
  const r = renameCat(i.dataset.cn, i.value);
  $('cgMsg').style.color = r ? 'var(--bad)' : 'var(--mute)';
  $('cgMsg').textContent = r;
  render();
});

/* ---- Nova categoria na hora: um diálogo só, usado em todo lugar em que se escolhe categoria ----
   Nas listas de escolha ela aparece como a opção "+ Nova categoria…" (valor NEWCAT). */
const NEWCAT = '__new__';
const newCatOpt = '<option value="' + NEWCAT + '">+ Nova categoria…</option>';
let qcC = 0,
  qcCb = null,
  qcNo = null;

function catQuick(onCreate, onCancel) {
  qcCb = onCreate || null;
  qcNo = onCancel || null;
  qcC = cats.length % PAL;
  $('qcName').value = '';
  $('qcMsg').textContent = '';
  drawSw('qcSw', qcC);
  $('qcat').hidden = false;
  $('qcName').focus();
}

function qcClose(created) {
  $('qcat').hidden = true;
  const no = qcNo;
  qcCb = qcNo = null;
  if (!created && no) no();
}

$('qcSw').onclick = (e) => {
  const b = e.target.closest('[data-sw]');
  if (b) {
    qcC = +b.dataset.sw;
    drawSw('qcSw', qcC);
  }
};

$('qcOk').onclick = () => {
  const n = cleanName($('qcName').value),
    r = addCat(n, qcC);
  if (r) {
    $('qcMsg').textContent = r;
    return;
  }
  const cb = qcCb;
  qcClose(true);
  render();
  if (cb) cb(n);
};

$('qcNo').onclick = () => qcClose(false);

$('qcName').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    $('qcOk').click();
  }
});

$('qcat').addEventListener('click', (e) => {
  if (e.target === $('qcat')) qcClose(false);
});

document.addEventListener(
  'keydown',
  (e) => {
    if (e.key === 'Escape' && !$('qcat').hidden) {
      e.stopPropagation();
      qcClose(false);
    }
  },
  true
);
