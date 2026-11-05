/* features/month-picker.js
   Seletor de mês e ano (quadro com os 12 meses). */

let mpY = 2026,
  selDay = '';

const mpNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function drawPick() {
  $('mpYear').textContent = mpY;
  const cur = mkey(),
    nm = cmNow(),
    has = new Set(data.map((x) => x.date.slice(0, 7)).concat(data.map(mOf)));
  $('mpGrid').innerHTML = mpNames
    .map((n, i) => {
      const k = mpY + '-' + pad2(i + 1);
      return (
        '<button data-mp="' +
        k +
        '" class="' +
        (k === cur ? 'on ' : '') +
        (k === nm ? 'cur' : '') +
        '">' +
        n +
        (has.has(k) ? '<i class="dt"></i>' : '') +
        '</button>'
      );
    })
    .join('');
}

$('mLabel').onclick = () => {
  mpY = +mkey().slice(0, 4);
  drawPick();
  $('mpick').hidden = false;
};

$('mpPrev').onclick = () => {
  mpY = Math.max(2000, mpY - 1);
  drawPick();
};

$('mpNext').onclick = () => {
  mpY = Math.min(2100, mpY + 1);
  drawPick();
};

$('mpGrid').onclick = (e) => {
  const b = e.target.closest('[data-mp]');
  if (b) {
    $('month').value = b.dataset.mp;
    $('mpick').hidden = true;
    render();
  }
};

$('mpToday').onclick = () => {
  $('month').value = cmNow();
  $('mpick').hidden = true;
  render();
};

$('mpClose').onclick = () => {
  $('mpick').hidden = true;
};

$('mpick').addEventListener('click', (e) => {
  if (e.target === $('mpick')) $('mpick').hidden = true;
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') $('mpick').hidden = true;
});
