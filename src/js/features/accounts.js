/* features/accounts.js
   Contas e saldos. */

const acctBal = (a) => {
  const t = iso(today);
  return (
    a.ini +
    data.reduce(
      (s, x) =>
        x.cartao &&
        x.cartao.toLowerCase() === a.n.toLowerCase() &&
        x.forma !== 'Cartão de crédito' &&
        !x.pend &&
        x.date <= t
          ? s + (x.inc ? x.value : -x.value)
          : s,
      0
    )
  );
};

function renderAccts() {
  $('acBox').innerHTML = accts.length
    ? accts
        .map(
          (a) =>
            '<div class="cp"><div class="rw" style="border:0;padding:0"><div><div class="hx">' +
            esc(a.n) +
            '</div><div class="mut">Saldo inicial ' +
            brl(a.ini) +
            '</div></div><div style="display:flex;gap:12px;align-items:center"><b>' +
            brl(acctBal(a)) +
            '</b><button class="lk" data-acdel="' +
            a.id +
            '" style="color:var(--bad);font-size:12px">Excluir</button></div></div></div>'
        )
        .join('')
    : '<div class="empty" style="padding:14px 0">Nenhuma conta cadastrada.</div>';
}

$('acAdd').onclick = () => {
  const n = cleanName($('acN').value),
    ini = parse($('acI').value || '0'),
    m = $('acMsg');
  if (!n) return say(m, 'Dê um nome à conta.', 1);
  if (accts.some((a) => a.n.toLowerCase() === n.toLowerCase()) || cardOf(n))
    return say(m, 'Já existe uma conta ou cartão com esse nome.', 1);
  if (!isFinite(ini) || Math.abs(ini) > 1e10) return say(m, 'Saldo inicial inválido.', 1);
  accts.push({ id: uid(), n, ini: Math.round(ini * 100) / 100 });
  store('gastos:accts', accts);
  ['acN', 'acI'].forEach((i) => {
    $(i).value = '';
  });
  say(m, 'Conta cadastrada. Lance receitas e despesas com esse nome em "Cartão ou conta" para ver o saldo.');
  render();
};

$('acBox').addEventListener('click', (e) => {
  const d = e.target.closest('[data-acdel]');
  if (!d) return;
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
    accts = accts.filter((a) => a.id !== d.dataset.acdel);
    store('gastos:accts', accts);
    render();
  }
});
