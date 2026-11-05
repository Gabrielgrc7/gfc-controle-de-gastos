/* features/export-backup.js
   Exportar CSV, backup, restaurar e apagar tudo. */

let dlApi = null;

$('expM').onclick = () => exportCsv(false);

$('expA').onclick = () => exportCsv(true);

try {
  if (window.claude)
    window.claude
      .use('downloads')
      .then((d) => {
        if (d) {
          dlApi = d;
          $('expM').hidden = false;
          $('expA').hidden = false;
        }
      })
      .catch(() => {});
} catch (e) {}

if (!window.claude) {
  dlApi = {
    save: ({ filename, data: d }) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([d], { type: 'text/csv;charset=utf-8' }));
      a.download = filename;
      a.click();
    },
  };
  $('expM').hidden = $('expA').hidden = false;
}

$('cfgExp').onclick = () => exportCsv(true);

async function saveFile(name, text, el) {
  try {
    if (!dlApi) throw new Error();
    await dlApi.save({ filename: name, data: text });
    return true;
  } catch (e) {
    if (el && !(e && e.code === 'declined')) say(el, 'Não foi possível baixar o arquivo neste ambiente.', 1);
    return false;
  }
}

const backupObj = () => ({
  v: 3,
  schema: SCHEMA_VERSION,
  app: 'gfc',
  items: data,
  plans,
  cats,
  budgets,
  catlim,
  prefs,
  cards,
  goals,
  rules,
  accts,
});

$('bkExp').onclick = async () => {
  if (await saveFile('gfc-backup.json', JSON.stringify(backupObj()), $('bkMsg'))) {
    markBackup();
    say(
      $('bkMsg'),
      'Backup gerado. O arquivo não é criptografado e contém seus dados pessoais: guarde em local seguro.'
    );
  }
};

$('bkImp').onchange = async (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  const m = $('bkMsg');
  try {
    if (f.size > 20e6) throw 0;
    const b = JSON.parse(await f.text());
    if (!b || !Array.isArray(b.items)) throw 0;
    (b.cats || []).forEach((c) => {
      const n = cleanName(c && c.n);
      if (n && !cats.some((x) => x.n.toLowerCase() === n.toLowerCase()))
        cats.push({ n, c: Number.isInteger(c.c) ? c.c % PAL : cats.length % PAL });
    });
    const ids = new Set(data.map((x) => x.id));
    let n = 0;
    b.items.forEach((x) => {
      const o = cleanItem(x);
      if (!o || ids.has(o.id)) return;
      if (!o.inc && !cats.some((c) => c.n === o.cat)) cats.push({ n: o.cat, c: cats.length % PAL });
      data.push(o);
      ids.add(o.id);
      n++;
    });
    (b.plans || []).forEach((p) => {
      if (
        p &&
        p.gid &&
        (p.kind === 'r' ||
          (p.kind === 'p' &&
            Number.isInteger(p.pn) &&
            Number.isInteger(p.pt) &&
            p.pn >= 1 &&
            p.pn <= p.pt &&
            p.pt <= 120)) &&
        /^\d{4}-\d{2}-\d{2}$/.test(p.start || '') &&
        p.value > 0 &&
        !plans.some((q) => q.gid === p.gid)
      )
        plans.push({
          gid: String(p.gid).slice(0, 40),
          kind: p.kind,
          desc: String(p.desc || '').slice(0, 60),
          value: p.value,
          cat: cleanName(p.cat) || 'Outros',
          day: Math.min(31, Math.max(1, +p.day || 1)),
          start: p.start,
          pn: p.pn,
          pt: p.pt,
          end: /^\d{4}-\d{2}$/.test(p.end || '') ? p.end : undefined,
          forma: FORMAS.includes(p.forma) ? p.forma : undefined,
          cartao: p.cartao ? cleanName(p.cartao) : undefined,
          active: p.active !== false,
          skip: Array.isArray(p.skip) ? p.skip.filter((s) => /^\d{4}-\d{2}$/.test(s)) : [],
        });
    });
    Object.entries(b.budgets || {}).forEach(([k, v]) => {
      if (/^\d{4}-\d{2}$/.test(k) && v > 0) budgets[k] = v;
    });
    Object.entries(b.catlim || {}).forEach(([k, v]) => {
      if (v > 0 && cats.some((c) => c.n === k)) catlim[k] = v;
    });
    if (b.prefs && typeof b.prefs.caixa === 'boolean') prefs.caixa = b.prefs.caixa;
    if (b.prefs && HOME_MODES[b.prefs.homeMode]) prefs.homeMode = b.prefs.homeMode;
    if (b.prefs && b.prefs.homeCustom && Array.isArray(b.prefs.homeCustom.order))
      prefs.homeCustom = { order: homeClean(b.prefs.homeCustom.order) };
    restoreExtra(b);
    store('gastos:budgets', budgets);
    store('gastos:prefs', prefs);
    saveAll();
    applyCats();
    render();
    say(m, n + ' lançamentos restaurados.');
  } catch (err) {
    say(m, 'Arquivo de backup inválido.', 1);
  }
};

$('clrAll').onclick = () => {
  const b = $('clrAll');
  if (!b.dataset.c) {
    b.dataset.c = 1;
    b.dataset.t = b.textContent;
    b.textContent = 'Clique de novo para apagar tudo';
    setTimeout(() => {
      if (b.dataset.c) {
        delete b.dataset.c;
        b.textContent = b.dataset.t;
      }
    }, 4000);
    return;
  }
  delete b.dataset.c;
  b.textContent = b.dataset.t;
  data = [];
  plans = [];
  saveAll();
  if (editing) resetForm();
  render();
  say($('bkMsg'), 'Todos os lançamentos e compromissos foram apagados.');
};

async function exportCsv(all) {
  const src = (all ? data : inMonth(mkey()).concat(incMonth(mkey())))
      .slice()
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
    el = $('expMsg');
  if (!src.length) {
    say(el, 'Nada para exportar.');
    return;
  }
  const cs = (t) => {
    t = String(t == null ? '' : t);
    if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
    return '"' + t.replace(/"/g, '""') + '"';
  };
  const lines = [
    'Data;Descrição;Categoria;Valor;Natureza;Forma de pagamento;Cartão;Tipo;Parcela;Mês da fatura;Pessoa;Etiqueta;Situação',
  ].concat(
    src.map((x) =>
      [
        x.date.split('-').reverse().join('/'),
        cs(x.desc),
        cs(x.cat),
        x.value.toFixed(2).replace('.', ','),
        x.inc ? 'Receita' : 'Despesa',
        cs(x.forma),
        cs(x.cartao),
        x.kind === 'p' ? 'Parcelado' : x.kind === 'r' ? 'Recorrente' : 'À vista',
        x.kind === 'p' && x.pt ? x.pn + '/' + x.pt : '',
        x.fm || '',
        cs(x.quem),
        cs(x.tag),
        x.pend ? 'A pagar' : 'Pago',
      ].join(';')
    )
  );
  if (
    await saveFile(all ? 'gastos-todos.csv' : 'gastos-' + mkey() + '.csv', '\uFEFF' + lines.join('\r\n'), el)
  )
    say(el, '');
}

function cleanItem(x) {
  if (
    !x ||
    typeof x.value !== 'number' ||
    !(x.value > 0 && x.value < 1e9) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(x.date || '')
  )
    return null;
  const o = {
    id: String(x.id || uid()).slice(0, 40),
    desc: String(x.desc || '').slice(0, 60),
    value: Math.round(x.value * 100) / 100,
    date: x.date,
    cat: x.inc ? 'Receita' : cleanName(x.cat) || 'Outros',
  };
  if (x.inc) o.inc = true;
  if (x.pend) o.pend = true;
  if (x.bill) o.bill = true;
  if (/^\d{4}-\d{2}-\d{2}$/.test(x.paid || '')) o.paid = x.paid;
  if (x.kind === 'r') o.kind = 'r';
  if (
    x.kind === 'p' &&
    Number.isInteger(x.pn) &&
    Number.isInteger(x.pt) &&
    x.pn >= 1 &&
    x.pn <= x.pt &&
    x.pt <= 120
  ) {
    o.kind = 'p';
    o.pn = x.pn;
    o.pt = x.pt;
  }
  if (x.gid) o.gid = String(x.gid).slice(0, 40);
  if (x.auto) o.auto = 1;
  if (FORMAS.includes(x.forma)) o.forma = x.forma;
  if (x.cartao) o.cartao = cleanName(x.cartao);
  if (x.quem) o.quem = cleanName(x.quem);
  if (x.tag) o.tag = cleanName(x.tag);
  if (/^\d{4}-\d{2}$/.test(x.fm || '')) o.fm = x.fm;
  return o;
}

function restoreExtra(b) {
  const d = (v, a, z) => Math.min(z, Math.max(a, Math.round(+v) || a));
  (b.cards || []).forEach((c) => {
    const n = cleanName(c && c.n);
    if (n && !cardOf(n))
      cards.push({
        id: uid(),
        n,
        lim: +c.lim > 0 ? +c.lim : 0,
        f: d(c.f, 1, 31),
        v: d(c.v, 1, 31),
        paid: Array.isArray(c.paid) ? c.paid.filter((s) => /^\d{4}-\d{2}$/.test(s)) : [],
      });
  });
  (b.goals || []).forEach((g) => {
    const n = cleanName(g && g.n);
    if (n && +g.a > 0)
      goals.push({
        id: uid(),
        n,
        a: +g.a,
        g: Math.max(0, +g.g || 0),
        p: /^\d{4}-\d{2}$/.test(g.p || '') ? g.p : '',
      });
  });
  (b.rules || []).forEach((r) => {
    if (
      r &&
      typeof r.k === 'string' &&
      r.k.length < 40 &&
      CATS.includes(r.c) &&
      !rules.some((x) => x.k === r.k)
    )
      rules.push({ k: r.k, c: r.c });
  });
  store('gastos:cards', cards);
  store('gastos:goals', goals);
  store('gastos:rules', rules);
}

const rex0 = restoreExtra;

restoreExtra = function (b) {
  rex0(b);
  (b.accts || []).forEach((a) => {
    const n = cleanName(a && a.n);
    if (n && !accts.some((x) => x.n.toLowerCase() === n.toLowerCase()) && isFinite(+a.ini))
      accts.push({ id: uid(), n, ini: Math.round(+a.ini * 100) / 100 });
  });
  store('gastos:accts', accts);
};
