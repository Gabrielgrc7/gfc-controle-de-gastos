/* features/theme.js
   Tema claro e escuro e ocultar valores. */

function setTheme(t) {
  document.documentElement.dataset.theme = t;
  store('gfc:theme', t);
  try {
    localStorage.setItem('gfc:theme', JSON.stringify(t));
  } catch (e) {}
  document.querySelectorAll('#thSeg button').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
  $('mThemeV').textContent = t === 'dark' ? 'Escuro' : 'Claro';
  document.querySelector('meta[name=theme-color]').content = t === 'dark' ? '#2B2B2B' : '#F3F3F1';
}

document.querySelectorAll('#thSeg button').forEach((b) => (b.onclick = () => setTheme(b.dataset.t)));

$('eyeBtn').onclick = () => {
  prefs.hide = !prefs.hide;
  store('gastos:prefs', prefs);
  applyHide();
};
