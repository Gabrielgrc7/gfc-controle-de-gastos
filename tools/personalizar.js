#!/usr/bin/env node
/* Preenche de uma vez só tudo que depende de você: nome, e-mail, usuário do GitHub e nome do repositório.
   node tools/personalizar.js --usuario=fulano --repo=gfc --nome="Fulano de Tal" --email=fulano@exemplo.com
   Opcional: --site=https://meusite.com (se o site não for o do GitHub Pages) */
const fs = require('fs'),
  path = require('path');
const ROOT = path.join(__dirname, '..');
const arg = (k) => {
  const a = process.argv.find((x) => x.startsWith('--' + k + '='));
  return a ? a.slice(k.length + 3).trim() : '';
};
const usuario = arg('usuario'),
  repo = arg('repo') || 'gfc',
  nome = arg('nome'),
  email = arg('email');
const site = (arg('site') || (usuario ? 'https://' + usuario + '.github.io/' + repo : '')).replace(
  /\/+$/,
  ''
);
const miss = [!usuario && '--usuario', !nome && '--nome', !email && '--email'].filter(Boolean);
if (miss.length) {
  console.log(
    'Faltam: ' +
      miss.join(', ') +
      '\nExemplo: node tools/personalizar.js --usuario=fulano --repo=gfc --nome="Fulano de Tal" --email=fulano@exemplo.com'
  );
  process.exit(1);
}
if (!/^[A-Za-z0-9-]+$/.test(usuario) || !/^[A-Za-z0-9._-]+$/.test(repo)) {
  console.log('Usuário e repositório só podem ter letras, números, ponto, hífen e sublinhado.');
  process.exit(1);
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
  console.log('E-mail inválido.');
  process.exit(1);
}
const targets = [
  'README.md',
  'README.en.md',
  'LICENSE',
  'CONTRIBUTING.md',
  'CHANGELOG.md',
  'SECURITY.md',
  'package.json',
  'src/js/core/config.js',
  '.github/ISSUE_TEMPLATE/bug.md',
  '.github/ISSUE_TEMPLATE/novo-banco.md',
  '.github/ISSUE_TEMPLATE/config.yml',
  'docs/01-antes-de-hospedar.md',
  'docs/06-testar-com-outras-pessoas.md',
];
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
let changed = 0;
for (const f of targets) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  let t = fs.readFileSync(p, 'utf8'),
    o = t;
  t = t
    .replace(/SEU-USUARIO/g, usuario)
    .replace(/SEU-REPO/g, repo)
    .replace(/SEU-SITE/g, site)
    .replace(/\[SEU NOME\]/g, nome);
  if (f === 'src/js/core/config.js')
    t = t
      .replace(/\[defina: nome do responsável pelo aplicativo\]/, esc(nome))
      .replace(/\[defina: e-mail do encarregado de dados\]/, esc(email));
  if (f === 'package.json') {
    const j = JSON.parse(t);
    j.author = nome + ' <' + email + '>';
    j.repository = { type: 'git', url: 'git+https://github.com/' + usuario + '/' + repo + '.git' };
    j.homepage = site;
    j.bugs = { url: 'https://github.com/' + usuario + '/' + repo + '/issues' };
    j.license = 'MIT';
    t = JSON.stringify(j, null, 2) + '\n';
  }
  if (t !== o) {
    fs.writeFileSync(p, t);
    changed++;
    console.log('  atualizado: ' + f);
  }
}
console.log(
  '\nPronto: ' +
    changed +
    ' arquivo(s) atualizado(s).\nSite: ' +
    site +
    '/\nAgora rode: npm run format && npm run check:release:strict'
);
