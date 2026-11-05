/* features/trash.js
   Lixeira com 30 dias de prazo. */

function renderTrash() {
  const L = trash.slice().reverse();
  $('trBox').innerHTML = L.length
    ? L.slice(0, 40)
        .map(
          (x) =>
            '<div class="rw"><div style="min-width:0"><div class="hx">' +
            esc(x.desc) +
            '</div><div class="mut">' +
            brl(x.value) +
            ' · apagado em ' +
            new Date(x._del).toLocaleDateString('pt-BR') +
            '</div></div><button class="btn ghost sm" data-tr="' +
            x.id +
            '">Restaurar</button></div>'
        )
        .join('')
    : '<div class="empty" style="padding:14px 0">A lixeira está vazia.</div>';
}

$('trBox').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tr]');
  if (b) {
    restoreIds([b.dataset.tr]);
    render();
    toast('Lançamento restaurado.');
  }
});

$('trEmpty').onclick = () => {
  const b = $('trEmpty');
  if (!b.dataset.c) {
    b.dataset.c = 1;
    b.textContent = 'Clique de novo para esvaziar';
    setTimeout(() => {
      if (b.dataset.c) {
        delete b.dataset.c;
        b.textContent = 'Esvaziar lixeira';
      }
    }, 4000);
    return;
  }
  delete b.dataset.c;
  b.textContent = 'Esvaziar lixeira';
  trash = [];
  store('gastos:trash', trash);
  render();
};
