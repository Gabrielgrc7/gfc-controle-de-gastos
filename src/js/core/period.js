/* core/period.js
   O mês escolhido: leitura (mkey), filtro de lançamentos por mês (inMonth), setas de mês anterior e próximo. */

$('month').value = iso(today).slice(0, 7);

const mkey = () => $('month').value;

const mOf = (x) => (prefs.caixa && x.fm ? x.fm : x.date.slice(0, 7));

const inMonth = (m) => data.filter((x) => !x.inc && mOf(x) === m);

const prevM = (m) => {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo - 2, 1);
  return iso(d).slice(0, 7);
};

function shift(n) {
  const [y, m] = mkey().split('-').map(Number);
  $('month').value = iso(new Date(y, m - 1 + n, 1)).slice(0, 7);
  render();
}

$('prev').onclick = () => shift(-1);

$('next').onclick = () => shift(1);

$('month').onchange = () => render();

$('save').onclick = () => {
  const desc = $('fDesc').value.trim(),
    value = parse($('fVal').value),
    date = $('fDate').value,
    cat = $('fCat').value;
  if (!value || value <= 0) {
    $('err').textContent = 'Informe um valor válido.';
    return;
  }
  if (!date) {
    $('err').textContent = 'Informe a data.';
    return;
  }
  const item = {
    id: editing || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    desc: desc || cat,
    value: Math.round(value * 100) / 100,
    date,
    cat,
  };
  data = editing ? data.map((x) => (x.id === editing ? item : x)) : [...data, item];
  store('gastos:items', data);
  $('month').value = date.slice(0, 7);
  resetForm();
  render();
};

const incMonth = (m) => data.filter((x) => x.inc && x.date.slice(0, 7) === m);

$('save').onclick = () => {
  const e = $('err'),
    desc = $('fDesc').value.trim(),
    value = parse($('fVal').value),
    date = $('fDate').value,
    inc = ty === 'i',
    cat = inc ? 'Receita' : $('fCat').value || 'Outros';
  if (!(value > 0 && value < 1e9)) return say(e, 'Informe um valor válido.', 1);
  if (!date) return say(e, 'Informe a data.', 1);
  const ex = {
    forma: $('fForma').value || undefined,
    cartao: cleanName($('fCard').value) || undefined,
    fm: $('fFm').value || undefined,
    quem: cleanName($('fQuem').value) || undefined,
    tag: cleanName($('fTag').value) || undefined,
    pend: $('fPend').checked || undefined,
    bill: $('fPend').checked || (editing && (data.find((x) => x.id === editing) || {}).bill) || undefined,
  };
  if (!inc && ex.forma === 'Cartão de crédito' && !ex.fm) {
    const c = cardOf(ex.cartao);
    if (c && c.f && c.v) ex.fm = invMonth(date, c);
  }
  const base = {
    desc: (desc || (inc ? 'Receita' : cat)).slice(0, 60),
    value: Math.round(value * 100) / 100,
    date,
    cat,
  };
  if (inc) base.inc = true;
  if (editing) {
    const old = data.find((x) => x.id === editing);
    if (old && !inc && old.cat !== cat) learn(base.desc, cat);
    data = data.map((x) => (x.id === editing ? { ...x, ...base, ...ex } : x));
    saveAll();
    $('month').value = inc ? date.slice(0, 7) : mOf(data.find((x) => x.id === editing));
    resetForm();
    render();
    go(inc ? 'inicio' : 'lista');
    return;
  }
  let msg = inc ? 'Receita adicionada.' : 'Lançamento adicionado.';
  if (kind === 'v') {
    data.push({ id: uid(), ...base, ...ex });
    $('month').value = inc ? date.slice(0, 7) : mOf({ date, fm: ex.fm });
    if (!inc && desc) learn(desc, cat);
  } else {
    const pn = +$('fPn').value || 1,
      pt = +$('fPt').value,
      end = $('fEnd').value;
    if (
      kind === 'p' &&
      !(Number.isInteger(pt) && pt >= 2 && pt <= 120 && Number.isInteger(pn) && pn >= 1 && pn <= pt)
    )
      return say(e, 'Confira as parcelas: a atual não pode passar do total (de 2 a 120).', 1);
    if (kind === 'r' && end && end < date.slice(0, 7))
      return say(e, 'A data final precisa ser depois do início.', 1);
    plans.push({
      gid: uid(),
      kind,
      desc: base.desc,
      value: base.value,
      cat,
      day: +date.slice(8, 10),
      start: date,
      pn: kind === 'p' ? pn : undefined,
      pt: kind === 'p' ? pt : undefined,
      end: kind === 'r' && end ? end : undefined,
      forma: ex.forma,
      cartao: ex.cartao,
      quem: ex.quem,
      tag: ex.tag,
      pend: ex.pend,
      inc: inc || undefined,
      active: true,
      skip: [],
    });
    materialize();
    msg =
      kind === 'p'
        ? 'Parcelamento criado. As próximas parcelas entram sozinhas a cada mês.'
        : 'Recorrência criada. Ela entra sozinha todo mês.';
    $('month').value = cmNow();
  }
  saveAll();
  resetForm();
  render();
  say(e, msg);
  setTimeout(() => {
    if (!editing) e.textContent = '';
  }, 3500);
};

/* Se o app ficar aberto de um dia para o outro, "hoje" acompanha o relógio: gera as parcelas e recorrências do dia e redesenha. */
function refreshToday() {
  const n = new Date();
  if (iso(n) === iso(today)) return false;
  today = n;
  if (typeof cur !== 'undefined' && cur && !$('app').hidden) {
    materialize();
    render();
  }
  return true;
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') refreshToday();
});
setInterval(refreshToday, 60000);
