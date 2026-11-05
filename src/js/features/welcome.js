/* features/welcome.js
   Animação de boas-vindas depois do login. */

let welcomeBusy = false;
function welcome() {
  const ov = $('welcome'),
    lg = $('wLogo'),
    tx = $('wText'),
    bg = $('wBg'),
    tg = document.querySelector('.top .lg');
  if (!ov.animate || !tg || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches))
    return;
  $('wName').textContent = cur.name.split(' ')[0];
  ov.hidden = false;
  tg.style.visibility = 'hidden';
  welcomeBusy = true;
  let done = false,
    t1;
  const fin = () => {
    if (done) return;
    done = true;
    welcomeBusy = false;
    clearTimeout(t1);
    ov.hidden = true;
    tg.style.visibility = '';
    ov.onclick = null;
  };
  ov.onclick = fin;
  lg.animate(
    [
      { opacity: 0, transform: 'scale(.7)' },
      { opacity: 1, transform: 'scale(1)' },
    ],
    { duration: 700, easing: 'ease-out', fill: 'both' }
  );
  tx.animate(
    [
      { opacity: 0, transform: 'translateY(10px)' },
      { opacity: 1, transform: 'none' },
    ],
    { duration: 600, delay: 500, easing: 'ease-out', fill: 'both' }
  );
  t1 = setTimeout(() => {
    if (done) return;
    const a = lg.getBoundingClientRect(),
      b = tg.getBoundingClientRect();
    const dx = b.left + b.width / 2 - (a.left + a.width / 2),
      dy = b.top + b.height / 2 - (a.top + a.height / 2),
      s = a.width ? b.width / a.width : 0.3;
    tx.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' });
    bg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 750, easing: 'ease-in-out', fill: 'forwards' });
    lg.animate(
      [
        { transform: 'translate(0,0) scale(1)' },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')' },
      ],
      { duration: 800, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' }
    ).onfinish = fin;
  }, 2200);
}
