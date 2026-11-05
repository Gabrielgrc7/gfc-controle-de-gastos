/* features/pin-lock.js
   Bloqueio por PIN. */

const pinOn = () => !!(cur && cur.pin);

const WEAK = new Set([
  '0000',
  '1111',
  '2222',
  '3333',
  '4444',
  '5555',
  '6666',
  '7777',
  '8888',
  '9999',
  '1234',
  '4321',
  '123456',
  '654321',
  '000000',
  '111111',
  '121212',
  '112233',
]);

function renderPin() {
  $('pinState').textContent = pinOn()
    ? 'O bloqueio por PIN está ativado.'
    : 'O bloqueio por PIN está desativado.';
  $('pinOffW').hidden = !pinOn();
  $('pinOnW').hidden = pinOn();
  $('mLock').hidden = !pinOn();
}

$('pinSet').onclick = async () => {
  const a = $('pinNew').value,
    b = $('pinNew2').value,
    m = $('pinMsg');
  if (!/^\d{4,6}$/.test(a)) return say(m, 'O PIN precisa ter de 4 a 6 números.', 1);
  if (WEAK.has(a)) return say(m, 'Esse PIN é muito fácil de adivinhar. Escolha outro.', 1);
  if (a !== b) return say(m, 'Os PINs não coincidem.', 1);
  const s = Math.random().toString(36).slice(2) + Date.now().toString(36),
    h = await hash(a, s);
  cur.pin = { s, h };
  upUser((x) => {
    x.pin = cur.pin;
  });
  $('pinNew').value = $('pinNew2').value = '';
  say(m, 'PIN ativado. O app bloqueia sozinho após 2 minutos sem uso.');
  renderPin();
  lockReset();
};

$('pinOff').onclick = async () => {
  const m = $('pinMsg');
  if (!pinOn()) return;
  if ((await hash($('pinCur').value, cur.pin.s)) !== cur.pin.h) return say(m, 'PIN atual incorreto.', 1);
  delete cur.pin;
  upUser((x) => {
    delete x.pin;
  });
  $('pinCur').value = '';
  say(m, 'PIN desativado.');
  renderPin();
};

function lock() {
  if (!pinOn() || locked || $('app').hidden) return;
  locked = true;
  $('lock').hidden = false;
  $('lockIn').value = '';
  $('lockMsg').textContent = '';
  setTimeout(() => $('lockIn').focus(), 50);
}

$('lockForm').onsubmit = async (e) => {
  e.preventDefault();
  const p = $('lockIn').value;
  $('lockIn').value = '';
  if ((await hash(p, cur.pin.s)) === cur.pin.h) {
    locked = false;
    pinTry = 0;
    $('lock').hidden = true;
    lockReset();
  } else {
    pinTry++;
    $('lockMsg').textContent = pinTry >= 5 ? 'Muitas tentativas. Saindo da conta…' : 'PIN incorreto.';
    if (pinTry >= 5)
      setTimeout(() => {
        locked = false;
        $('lock').hidden = true;
        $('out').click();
      }, 700);
  }
};

$('lockOut').onclick = () => {
  locked = false;
  $('lock').hidden = true;
  $('out').click();
};

$('mLock').onclick = () => {
  menuOpen(false);
  lock();
};

function lockReset() {
  clearTimeout(lockT);
  if (pinOn() && !locked && !$('app').hidden) lockT = setTimeout(lock, 120000);
}

['pointerdown', 'keydown', 'scroll'].forEach((t) =>
  document.addEventListener(t, lockReset, { passive: true })
);

let hiddenAt = 0;

document.addEventListener('visibilitychange', () => {
  if (document.hidden) hiddenAt = Date.now();
  else if (pinOn() && hiddenAt && Date.now() - hiddenAt > 30000) lock();
});
