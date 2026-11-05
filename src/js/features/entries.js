/* features/entries.js
   Lançamentos: formulário (despesa, receita, parcela, recorrência), gravação, geração mensal de parcelas, lixeira e desfazer. */

$('fDate').value = iso(today);

$('fVal').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('save').click();
});

$('cancel').addEventListener('click', () => {
  if (mode === 'edit') go('lista');
});

$('fDesc').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('save').click();
});

const badge = (x) =>
  (x.kind === 'p' && x.pt ? ' · Parcela ' + x.pn + '/' + x.pt : x.kind === 'r' ? ' · Recorrente' : '') +
  (x.date > iso(today) ? ' · Previsto' : '');

$('chips').addEventListener('click', (e) => {
  if (e.target.closest('#chipNew')) {
    catQuick((n) => {
      $('fCat').value = n;
      render();
    });
  }
});

let kind = 'v';

function setKind(k) {
  kind = k;
  document.querySelectorAll('#kindSeg button').forEach((b) => b.classList.toggle('on', b.dataset.k === k));
  $('pFields').hidden = k !== 'p';
  $('rFields').hidden = k !== 'r';
  $('fValL').textContent =
    k === 'p' ? 'Valor de cada parcela (R$)' : k === 'r' ? 'Valor mensal (R$)' : 'Valor (R$)';
  updPrev();
}

function updPrev() {
  const v = parse($('fVal').value),
    d = $('fDate').value;
  let t = '';
  if (kind === 'p' && v > 0 && d) {
    const pn = +$('fPn').value || 1,
      pt = +$('fPt').value;
    if (pt >= 2 && pn >= 1 && pn <= pt) {
      const r = pt - pn;
      t =
        'Parcela ' +
        pn +
        ' de ' +
        pt +
        ' · faltam ' +
        r +
        ' · restante ' +
        brl(r * v) +
        ' · termina em ' +
        mfmt(addM(d.slice(0, 7), r));
    }
  }
  if (kind === 'r' && v > 0 && d)
    t =
      'Será lançado todo mês, no dia ' +
      +d.slice(8, 10) +
      ', a partir de ' +
      mfmt(d.slice(0, 7)) +
      ($('fEnd').value ? ' até ' + mfmt($('fEnd').value) : ', sem data final');
  $('kPrev').textContent = t;
}

$('kindSeg').onclick = (e) => {
  const b = e.target.closest('button');
  if (b) setKind(b.dataset.k);
};

['fVal', 'fDate', 'fPn', 'fPt', 'fEnd'].forEach((i) => $(i).addEventListener('input', updPrev));

function dropEntries(s) {
  const gone = data.filter((x) => s.has(x.id));
  gone
    .filter((x) => x.auto && x.gid)
    .forEach((x) => {
      const p = plans.find((q) => q.gid === x.gid);
      if (p) (p.skip = p.skip || []).push(x.date.slice(0, 7));
    });
  trash.push(...gone.map((x) => ({ ...x, _del: Date.now() })));
  trash = trash.slice(-300);
  lastDel = gone.map((x) => x.id);
  data = data.filter((x) => !s.has(x.id));
  saveAll();
}

function restoreIds(ids) {
  const back = trash.filter((x) => ids.includes(x.id));
  trash = trash.filter((x) => !ids.includes(x.id));
  back.forEach((x) => {
    const o = { ...x };
    delete o._del;
    data.push(o);
    if (o.auto && o.gid) {
      const p = plans.find((q) => q.gid === o.gid);
      if (p) p.skip = (p.skip || []).filter((m) => m !== o.date.slice(0, 7));
    }
  });
  saveAll();
  return back.length;
}

function undoLast() {
  const n = restoreIds(lastDel);
  lastDel = [];
  render();
  toast(n + (n === 1 ? ' lançamento restaurado.' : ' lançamentos restaurados.'));
}

function toast(t, act, fn) {
  const el = $('toast');
  el.textContent = t;
  if (act) {
    const b = document.createElement('button');
    b.className = 'lk';
    b.textContent = act;
    b.style.cssText = 'color:var(--bg);margin-left:14px;font-weight:600;text-decoration:underline';
    b.onclick = () => {
      fn();
      el.hidden = true;
    };
    el.append(b);
  }
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(
    () => {
      el.hidden = true;
    },
    act ? 8000 : 3000
  );
}

function materialize() {
  const cm = cmNow();
  let ch = false;
  plans.forEach((p) => {
    if (!p.active) return;
    const s = p.start.slice(0, 7);
    for (let k = 0; k < 600; k++) {
      const m = addM(s, k);
      if (m > cm) break;
      if (p.kind === 'p' && p.pn + k > p.pt) break;
      if (p.kind === 'r' && p.end && m > p.end) break;
      if ((p.skip || []).includes(m) || data.some((x) => x.gid === p.gid && x.date.slice(0, 7) === m))
        continue;
      data.push({
        id: uid(),
        desc: p.desc,
        value: p.value,
        date: m + '-' + pad2(dayIn(m, p.day)),
        cat: p.inc ? 'Receita' : CATS.includes(p.cat) ? p.cat : 'Outros',
        kind: p.kind,
        pn: p.kind === 'p' ? p.pn + k : undefined,
        pt: p.pt,
        gid: p.gid,
        auto: 1,
        forma: p.forma,
        cartao: p.cartao,
        inc: p.inc || undefined,
        quem: p.quem,
        tag: p.tag,
        pend: p.pend && m >= cm ? true : undefined,
        bill: p.pend || undefined,
      });
      ch = true;
    }
  });
  if (ch) saveAll();
}

function setTy(t) {
  ty = t;
  document.querySelectorAll('#tipoSeg button').forEach((b) => b.classList.toggle('on', b.dataset.ty === t));
  $('chips').parentElement.hidden = t === 'i';
  const pb = document.querySelector('#kindSeg [data-k="p"]');
  pb.hidden = t === 'i';
  if (t === 'i' && kind === 'p') setKind('v');
  $('fValL').textContent =
    (t === 'i'
      ? 'Valor da receita'
      : kind === 'p'
        ? 'Valor de cada parcela'
        : kind === 'r'
          ? 'Valor mensal'
          : 'Valor') + ' (R$)';
}

$('tipoSeg').onclick = (e) => {
  const b = e.target.closest('button');
  if (b) setTy(b.dataset.ty);
};

const setKind0 = setKind;

setKind = function (k) {
  setKind0(k);
  if (ty === 'i') $('fValL').textContent = 'Valor da receita (R$)';
};

function fillForm(x) {
  $('fForma').value = x.forma || '';
  $('fCard').value = x.cartao || '';
  $('fFm').value = x.fm || '';
  $('fQuem').value = x.quem || '';
  $('fTag').value = x.tag || '';
  $('fPend').checked = !!x.pend;
  $('kindW').hidden = true;
  $('tipoW').hidden = true;
  $('pFields').hidden = $('rFields').hidden = true;
  $('kPrev').textContent = '';
  setTy(x.inc ? 'i' : 'd');
  $('moreW').open = !!(x.forma || x.cartao || x.fm || x.quem || x.tag || x.pend);
  $('fValL').textContent =
    (x.inc
      ? 'Valor da receita'
      : x.kind === 'p'
        ? 'Valor da parcela'
        : x.kind === 'r'
          ? 'Valor mensal'
          : 'Valor') + ' (R$)';
}

function resetForm() {
  editing = null;
  ['fDesc', 'fVal', 'fPt', 'fEnd', 'fCard', 'fFm', 'fQuem', 'fTag'].forEach((i) => {
    $(i).value = '';
  });
  $('fPn').value = 1;
  $('fForma').value = '';
  $('fPend').checked = false;
  $('fDate').value = iso(today);
  $('formTitle').textContent = 'Novo lançamento';
  $('save').textContent = 'Adicionar';
  $('cancel').hidden = true;
  $('err').textContent = '';
  $('catHint').textContent = '';
  catTouched = false;
  $('kindW').hidden = false;
  $('tipoW').hidden = false;
  $('moreW').open = false;
  setKind('v');
  setTy('d');
}

$('cancel').onclick = resetForm;

$('chips').addEventListener('click', (e) => {
  if (e.target.closest('[data-c]')) catTouched = true;
});

$('fDesc').addEventListener('input', () => {
  if (catTouched || editing || ty === 'i') return;
  const c = ruleCat($('fDesc').value);
  if (c) {
    $('fCat').value = c;
    $('catHint').textContent = 'Categoria sugerida pelo que você já usou.';
    extra();
  } else $('catHint').textContent = '';
});

const mkRow = (date, desc, v, inc) => {
  const value = Math.round(v * 100) / 100,
    r = { date, desc: desc.slice(0, 60), value, on: true };
  if (inc) {
    r.inc = true;
    r.cat = 'Receita';
  } else {
    r.cat = ruleCat(desc) || catByKey(catOf(desc));
    r.cat0 = r.cat;
  }
  return r;
};

const sv6 = $('save').onclick;

$('save').onclick = () => {
  const wasEd = !!editing;
  sv6();
  const e = $('err');
  if (e.style.color === 'var(--bad)' && e.textContent) return;
  if (!wasEd && V === 'lanc' && S === 'novo') {
    const t = e.textContent;
    e.textContent = '';
    closeSheet();
    if (t) toast(t);
  }
};

$('cancel').addEventListener('click', () => {
  if (V === 'lanc' && S === 'novo') closeSheet();
});
