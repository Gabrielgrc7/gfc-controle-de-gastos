/* features/profile.js
   Foto, nome e troca de senha. */

function paintAv(el, u) {
  const a = u && u.avatar;
  el.style.backgroundImage = a ? 'url(' + a + ')' : '';
  el.textContent = a ? '' : ((u && u.name) || '?').trim().charAt(0).toUpperCase();
}

function paintAll() {
  ['avBtn', 'mAv', 'cfgAv'].forEach((i) => paintAv($(i), cur));
  $('cfgNameIn').value = cur.name;
  $('mName').textContent = $('cfgName').textContent = cur.name;
  $('mMail').textContent = $('cfgMail').textContent = cur.email;
}

function readAv(file) {
  return new Promise((ok, no) => {
    const r = new FileReader();
    r.onerror = () => no();
    r.onload = () => {
      const im = new Image();
      im.onerror = () => no();
      im.onload = () => {
        const c = document.createElement('canvas');
        c.width = c.height = 160;
        const m = Math.min(im.width, im.height);
        c.getContext('2d').drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, 160, 160);
        ok(c.toDataURL('image/jpeg', 0.85));
      };
      im.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

$('sAvBtn').onclick = () => $('sAvIn').click();

$('sAvIn').onchange = async (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    sAv = await readAv(f);
    $('sAvBtn').style.backgroundImage = 'url(' + sAv + ')';
    $('sAvBtn').textContent = '';
  } catch (x) {
    $('sErr').textContent = 'Não foi possível ler essa imagem.';
  }
};

$('cfgAvBtn').onclick = () => $('cfgAvIn').click();

$('cfgAvIn').onchange = async (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    cur.avatar = await readAv(f);
    const us = store('gfc:users') || [];
    us.forEach((x) => {
      if (x.id === cur.id) x.avatar = cur.avatar;
    });
    store('gfc:users', us);
    paintAll();
  } catch (x) {}
};

const upUser = (f) => {
  const us = store('gfc:users') || [];
  us.forEach((x) => {
    if (x.id === cur.id) f(x);
  });
  store('gfc:users', us);
};

$('cfgNameSave').onclick = () => {
  const n = $('cfgNameIn').value.trim(),
    m = $('cfgNameMsg');
  if (!n) {
    m.textContent = 'Informe um nome.';
    m.style.color = 'var(--bad)';
    return;
  }
  cur.name = n;
  upUser((x) => {
    x.name = n;
  });
  paintAll();
  m.textContent = 'Nome atualizado.';
  m.style.color = 'var(--mute)';
};

$('pwSave').onclick = async () => {
  const m = $('pwMsg'),
    n = $('pwNew').value;
  if ((await hash($('pwOld').value, cur.salt)) !== cur.hash) return say(m, 'Senha atual incorreta.', 1);
  const miss = pwUnmet(n);
  if (miss.length) return say(m, 'A nova senha precisa ter: ' + miss.join(', ').toLowerCase() + '.', 1);
  if (n.length > 128) return say(m, 'A senha pode ter no máximo 128 caracteres.', 1);
  if (n !== $('pwNew2').value) return say(m, 'As senhas não coincidem.', 1);
  const salt = Math.random().toString(36).slice(2) + Date.now().toString(36),
    h = await hash(n, salt);
  cur.salt = salt;
  cur.hash = h;
  upUser((x) => {
    x.salt = salt;
    x.hash = h;
  });
  ['pwOld', 'pwNew', 'pwNew2'].forEach((i) => {
    $(i).value = '';
  });
  say(m, 'Senha alterada.');
};
