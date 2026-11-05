/* features/auth.js
   Cadastro, login, sessão, bloqueio por tentativas e encerramento por inatividade. */

function showAuth(sign) {
  $('app').hidden = true;
  $('auth').hidden = false;
  $('pLogin').hidden = !!sign;
  $('pSign').hidden = !sign;
  $('lErr').textContent = $('sErr').textContent = '';
}

$('toSign').onclick = () => showAuth(true);

$('toLogin').onclick = $('toLogin2').onclick = () => showAuth(false);

$('forgot').onclick = () => {
  $('rstBox').hidden = !$('rstBox').hidden;
  if (!$('rstBox').hidden) {
    $('rstEmail').value = $('lE').value.trim();
    $('rstMsg').textContent = '';
  }
};

$('rstGo').onclick = () => {
  const b = $('rstGo'),
    em = $('rstEmail').value.trim().toLowerCase(),
    us = store('gfc:users') || [],
    u = us.find((x) => x.email === em);
  if (!u) {
    $('rstMsg').textContent = 'Não encontramos conta com este e-mail neste dispositivo.';
    return;
  }
  if (!b.dataset.c) {
    b.dataset.c = 1;
    b.textContent = 'Clique de novo para confirmar';
    setTimeout(() => {
      if (b.dataset.c) {
        delete b.dataset.c;
        b.textContent = 'Apagar conta e recomeçar';
      }
    }, 4000);
    return;
  }
  delete b.dataset.c;
  b.textContent = 'Apagar conta e recomeçar';
  WIPE.forEach((k) => storeRemove('u:' + u.id + ':' + k));
  store(
    'gfc:users',
    us.filter((x) => x.id !== u.id)
  );
  store('gfc:lock', { n: 0, u: 0 });
  $('rstBox').hidden = true;
  showAuth(true);
  $('sE').value = em;
  $('sErr').textContent = 'Conta apagada. Crie-a de novo com uma nova senha.';
};

$('fLogin').onsubmit = async (e) => {
  e.preventDefault();
  const em = $('lE').value.trim().toLowerCase(),
    u = (store('gfc:users') || []).find((x) => x.email === em);
  const t = store('gfc:lock') || { n: 0, u: 0 };
  if (Date.now() < t.u) {
    $('lErr').textContent = 'Muitas tentativas. Aguarde 30 segundos.';
    return;
  }
  if (!u || (await hash($('lP').value, u.salt)) !== u.hash) {
    t.n++;
    if (t.n >= 5) {
      t.u = Date.now() + 30000;
      t.n = 0;
    }
    store('gfc:lock', t);
    $('lErr').textContent = 'E-mail ou senha incorretos.';
    return;
  }
  store('gfc:lock', { n: 0, u: 0 });
  setSess(u.id, $('keep').checked);
  enter(u);
  welcome();
};

$('out').onclick = () => {
  setSess(null);
  NS = '';
  data = [];
  budgets = {};
  catlim = {};
  mode = null;
  showAuth(false);
};

function enter(u) {
  cur = u;
  NS = 'u:' + u.id + ':';
  loadUser();
  $('auth').hidden = true;
  $('app').hidden = false;
  ['lP', 'sP', 'sP2'].forEach((i) => ($(i).value = ''));
  sAv = '';
  $('sAvBtn').style.backgroundImage = '';
  $('sAvBtn').textContent = '+';
  paintAll();
  mode = null;
  sel = new Set();
  resetForm();
  $('iDate').value = mkey() + '-01';
  go('inicio');
  seg('hist');
  materialize();
  render();
  afterEnter();
}

$('out').addEventListener('click', () => menuOpen(false));

$('cfgOut').onclick = () => $('out').click();

function setSess(id, keep) {
  try {
    sessionStorage.removeItem('gfc:s');
  } catch (e) {}
  try {
    localStorage.removeItem('gfc:session');
  } catch (e) {}
  if (!id) return;
  if (keep) {
    try {
      localStorage.setItem('gfc:session', JSON.stringify(id));
    } catch (e) {}
  } else {
    try {
      sessionStorage.setItem('gfc:s', id);
    } catch (e) {}
  }
}

function getSess() {
  try {
    const s = sessionStorage.getItem('gfc:s');
    if (s) return s;
  } catch (e) {}
  try {
    const r = localStorage.getItem('gfc:session');
    return r ? JSON.parse(r) : null;
  } catch (e) {
    return null;
  }
}

let idleT;

function idleReset() {
  clearTimeout(idleT);
  if ($('app').hidden) return;
  idleT = setTimeout(() => {
    $('out').click();
    $('lErr').textContent = 'Sessão encerrada por inatividade.';
  }, IDLE);
}

['pointerdown', 'keydown', 'scroll'].forEach((t) =>
  document.addEventListener(t, idleReset, { passive: true })
);

$('out').addEventListener('click', () => {
  clearTimeout(idleT);
  plans = [];
  prefs = {};
  cats = [];
  $('cons').hidden = true;
});

function afterEnter() {
  idleReset();
  if (!cur.consent || cur.consent.v !== POLICY_V) $('cons').hidden = false;
  applyHide();
  store('gastos:trash', trash);
}

$('out').addEventListener('click', () => {
  clearTimeout(lockT);
  locked = false;
  $('lock').hidden = true;
  accts = [];
  if (typeof aiReset === 'function') aiReset();
});

const ae6 = afterEnter;

afterEnter = function () {
  ae6();
  $('mLock').hidden = !pinOn();
  renderOnb();
  if (restoring && pinOn()) lock();
  else lockReset();
};
