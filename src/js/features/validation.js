/* features/validation.js
   Validação do cadastro: o mínimo para funcionar (e-mail com formato válido e senha com 6 ou mais caracteres). */

const PW = [[/.{6,}/, 'Pelo menos 6 caracteres']];

const pwUnmet = (p) => PW.filter((r) => !r[0].test(p)).map((r) => r[1]);

function emailCheck(e) {
  e = String(e || '')
    .trim()
    .toLowerCase();
  if (e.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e))
    return 'Informe um e-mail válido, como nome@dominio.com.';
  return '';
}

function drawPw() {
  const p = $('sP').value;
  $('pwRules').innerHTML = PW.map(
    (r) =>
      '<span class="' + (r[0].test(p) ? 'ok' : '') + '">' + (r[0].test(p) ? '✓ ' : '○ ') + r[1] + '</span>'
  ).join('');
}

$('sP').addEventListener('input', drawPw);

drawPw();

$('fSign').onsubmit = async (e) => {
  e.preventDefault();
  const n = $('sN').value.trim(),
    em = $('sE').value.trim().toLowerCase(),
    p = $('sP').value,
    us = store('gfc:users') || [],
    err = (t) => {
      $('sErr').textContent = t;
    };
  if (!n) return err('Informe seu nome.');
  const ee = emailCheck(em);
  if (ee) return err(ee);
  const miss = pwUnmet(p);
  if (miss.length) return err('A senha precisa ter: ' + miss.join(', ').toLowerCase() + '.');
  if (p.length > 128) return err('A senha pode ter no máximo 128 caracteres.');
  if (p !== $('sP2').value) return err('As senhas não coincidem.');
  if (us.some((x) => x.email === em)) return err('Já existe uma conta com este e-mail neste aparelho.');
  if (!$('sCons').checked) return err('Para criar a conta, aceite a Política de Privacidade.');
  const salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const u = {
    id: Date.now().toString(36),
    name: n,
    email: em,
    salt,
    hash: await hash(p, salt),
    avatar: sAv,
    consent: { v: POLICY_V, at: new Date().toISOString() },
  };
  store('gfc:users', [...us, u]);
  setSess(u.id, false);
  enter(u);
  welcome();
  tourSoon();
};
