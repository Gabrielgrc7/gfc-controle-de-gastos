#!/usr/bin/env node
/* Verificação antes de publicar (sem dependências).
   node tools/check-release.js            confere o site montado em dist/ e o repositório (usado também no CI)
   node tools/check-release.js --strict   confere também o que só você pode preencher: nome, e-mail, usuário do GitHub, licença
   Para montar o dist antes: npm run check:release */
const fs = require('fs'),
  path = require('path');
const ROOT = path.join(__dirname, '..'),
  DIST = path.join(ROOT, 'dist'),
  strict = process.argv.includes('--strict');
let errs = 0,
  warns = 0;
const ok = (m) => console.log('  ✓ ' + m),
  bad = (m) => {
    errs++;
    console.log('  ✗ ' + m);
  },
  warn = (m) => {
    warns++;
    console.log('  ! ' + m);
  },
  head = (t) => console.log('\n' + t);
const read = (p) => fs.readFileSync(p, 'utf8'),
  exists = (p) => fs.existsSync(p);

function walk(dir, skip, out = []) {
  for (const n of fs.readdirSync(dir)) {
    const p = path.join(dir, n),
      rel = path.relative(ROOT, p);
    if (skip(rel, n)) continue;
    if (fs.statSync(p).isDirectory()) walk(p, skip, out);
    else out.push(rel);
  }
  return out;
}

/* ---------------- site montado ---------------- */
head('1. Site montado (dist/)');
if (!exists(path.join(DIST, 'index.html'))) {
  bad('dist/ não existe. Rode: npm run build');
} else {
  const need = [
    'index.html',
    'css/styles.css',
    'js/app.js',
    'sw.js',
    'manifest.webmanifest',
    'icon.svg',
    'icon-192.png',
    'icon-512.png',
    '_headers',
    'og-image.png',
    'fonts/inter-latin-wght-normal.woff2',
    'vendor/pdf.min.js',
    'vendor/pdf.worker.min.js',
  ];
  const miss = need.filter((f) => !exists(path.join(DIST, f)));
  miss.length
    ? bad('faltam arquivos no dist: ' + miss.join(', '))
    : ok('todos os arquivos esperados estão no dist');

  const html = read(path.join(DIST, 'index.html'));
  const inline = html.match(/<script(?![^>]*\ssrc=)[^>]*>/g);
  inline
    ? bad('há <script> dentro do HTML (a política de segurança bloqueia): ' + inline.length)
    : ok('nenhum script dentro do HTML (a política de segurança fica estrita)');
  const refs = [...html.matchAll(/\s(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  const external = refs.filter((r) => /^https?:\/\//.test(r) && !/og:|rel="canonical"/.test(r));
  const extRes = [...html.matchAll(/<(?:link|script|img)\b[^>]*\s(?:src|href)="(https?:\/\/[^"]+)"/g)].map(
    (m) => m[1]
  );
  extRes.length
    ? bad('recursos externos no HTML (privacidade e modo offline): ' + extRes.join(', '))
    : ok('nenhum recurso externo (tudo vem do próprio site)');
  const dead = refs.filter(
    (r) => !/^(https?:|#|data:|mailto:)/.test(r) && !exists(path.join(DIST, r.split('?')[0].split('#')[0]))
  );
  dead.length
    ? bad('links para arquivos que não existem no dist: ' + dead.join(', '))
    : ok('todos os arquivos referenciados no HTML existem');
  const css = read(path.join(DIST, 'css/styles.css'));
  /url\((?!["']?(data:|\.\.\/fonts\/))/.test(css) && /url\(["']?https?:/.test(css)
    ? bad('o CSS carrega algo de fora')
    : ok('o CSS não carrega nada de fora');

  head('2. Modo offline e app instalável');
  const sw = read(path.join(DIST, 'sw.js')),
    list = (sw.match(/FILES\s*=\s*\[([^\]]*)\]/) || [])[1] || '';
  const files = [...list.matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((f) => f !== './');
  const swMiss = files.filter((f) => !exists(path.join(DIST, f)));
  files.length && !swMiss.length
    ? ok('o service worker guarda ' + files.length + ' arquivos e todos existem')
    : bad('arquivos do service worker que não existem: ' + (swMiss.join(', ') || '(lista vazia)'));
  try {
    const mf = JSON.parse(read(path.join(DIST, 'manifest.webmanifest')));
    const rel = (u) => typeof u === 'string' && !u.startsWith('/') && !/^https?:/.test(u);
    rel(mf.start_url) && (mf.scope === undefined || rel(mf.scope))
      ? ok('manifest com endereços relativos (funciona em github.io/repositorio/)')
      : bad('manifest com start_url ou scope absoluto: quebra quando o site fica numa subpasta');
    mf.name && mf.short_name && mf.display
      ? ok('manifest tem nome e modo de exibição')
      : bad('manifest sem name, short_name ou display');
    const icons = (mf.icons || []).map((i) => i.src);
    icons.length && icons.every((i) => exists(path.join(DIST, i)))
      ? ok('ícones do manifest existem')
      : bad('ícones do manifest ausentes');
  } catch (e) {
    bad('manifest.webmanifest inválido: ' + e.message);
  }

  head('3. Segurança e privacidade do código');
  const hd = read(path.join(DIST, '_headers'));
  const sp = (hd.match(/script-src([^;]*)/) || [])[1] || '';
  /'self'/.test(sp) && !/unsafe-inline|unsafe-eval|https?:|\*/.test(sp)
    ? ok('política de segurança: script-src só aceita o próprio site (' + sp.trim() + ')')
    : bad('script-src da política de segurança está frouxa: ' + sp.trim());
  /default-src 'none'/.test(hd) && /frame-ancestors 'none'/.test(hd) && /form-action 'none'/.test(hd)
    ? ok('política: default-src, frame-ancestors e form-action fechados')
    : bad('política de segurança incompleta em _headers');
  const app = read(path.join(DIST, 'js/app.js'));
  const net = app.match(
    /\bfetch\s*\(|XMLHttpRequest|sendBeacon|new WebSocket|EventSource\s*\(|importScripts/g
  );
  net
    ? bad(
        'o código faz chamadas de rede (a promessa "nada sai do aparelho" deixaria de valer): ' +
          [...new Set(net)].join(', ')
      )
    : ok('nenhuma chamada de rede no código do app (nada sai do aparelho)');
  /\beval\s*\(|new Function\s*\(/.test(app)
    ? bad('uso de eval/new Function no app')
    : ok('sem eval nem new Function');
  /\bdebugger\b/.test(app) ? bad('há "debugger" esquecido') : ok('sem "debugger" esquecido');
  const cl = (app.match(/console\.log\(/g) || []).length;
  cl ? warn(cl + ' console.log no código (inofensivo, mas dá para tirar)') : ok('sem console.log esquecido');
}

/* ---------------- repositório ---------------- */
head('4. Dados pessoais no repositório');
const skipDir = (rel, n) =>
  ['node_modules', 'dist', '.git'].includes(n) ||
  rel.startsWith('src/vendor') ||
  rel.startsWith('src/fonts') ||
  rel.startsWith('licenses') ||
  /\.(png|gif|woff2|zip|ico)$/.test(n) ||
  n === 'package-lock.json';
const all = walk(ROOT, skipDir);
/* tests/data guarda só arquivos FICTÍCIOS criados para os testes */
const forbiddenExt = all.filter(
  (f) =>
    !f.startsWith('tests/data' + path.sep) &&
    !f.split(path.sep).join('/').startsWith('tests/data/') &&
    (/\.(pdf|ofx|csv|xlsx?|env)$/i.test(f) || /^\.env/.test(path.basename(f)))
);
forbiddenExt.length
  ? bad(
      'arquivos que não devem ir ao GitHub (faturas, extratos, planilhas, segredos): ' +
        forbiddenExt.join(', ')
    )
  : ok('nenhuma fatura, extrato, planilha ou arquivo .env');
const okMail =
  /@(x\.com|example\.(com|org)|exemplo\.(com|org)|gmail\.com|email\.com|teste\.com|nomadglobal\.com|dominio\.com|empresa\.com|users\.noreply\.github\.com|anthropic\.com|mailinator\.com|a\.co|b\.com|c\.com|y\.com)$/i;
/* o e-mail do encarregado de dados (que você escolheu) é público de propósito: pode aparecer */
const ownMails = new Set();
for (const f of ['src/js/core/config.js', 'package.json']) {
  if (exists(path.join(ROOT, f)))
    for (const m of read(path.join(ROOT, f)).matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g))
      ownMails.add(m[0].toLowerCase());
}
const hits = [];
const block = exists(path.join(ROOT, '.release-block.txt'))
  ? read(path.join(ROOT, '.release-block.txt'))
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('#'))
  : [];
for (const f of all) {
  let t;
  try {
    t = read(path.join(ROOT, f));
  } catch (e) {
    continue;
  }
  for (const m of t.matchAll(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g))
    if (!/^(\d)\1{2}\.\1{3}\.\1{3}-\1{2}$|^000\./.test(m[0]) && m[0] !== '000.000.000-00')
      hits.push(f + ': CPF ' + m[0]);
  for (const m of t.matchAll(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g)) hits.push(f + ': CNPJ ' + m[0]);
  for (const m of t.matchAll(/\b(?:\d{4}[ -]){3}\d{4}\b/g))
    if (!/^(0000[ -]){3}0000$/.test(m[0])) hits.push(f + ': número de cartão ' + m[0]);
  for (const m of t.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g))
    if (!okMail.test(m[0]) && !ownMails.has(m[0].toLowerCase()) && !/^(seu|voce|nome|usuario)/i.test(m[0]))
      hits.push(f + ': e-mail ' + m[0]);
  for (const w of block)
    if (t.toLowerCase().includes(w.toLowerCase())) hits.push(f + ': termo bloqueado "' + w + '"');
}
hits.length
  ? bad(
      'possíveis dados pessoais (confira cada um):\n      ' + [...new Set(hits)].slice(0, 15).join('\n      ')
    )
  : ok(
      'nenhum CPF, CNPJ, cartão ou e-mail pessoal encontrado' +
        (block.length ? ' (inclui os ' + block.length + ' termos de .release-block.txt)' : '')
    );
block.length ||
  warn(
    'crie .release-block.txt com termos que nunca podem aparecer (seu nome completo, CPF, endereço), um por linha: ele não vai para o GitHub'
  );

head('5. Documentação e imagens');
const readme = exists(path.join(ROOT, 'README.md')) ? read(path.join(ROOT, 'README.md')) : '';
readme ? ok('README.md existe') : bad('falta o README.md');
const imgs = [...readme.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)]
  .map((m) => m[1])
  .filter((u) => !/^https?:/.test(u));
const imgMiss = imgs.filter((u) => !exists(path.join(ROOT, u)));
imgMiss.length
  ? bad('imagens do README que não existem: ' + imgMiss.join(', '))
  : ok('as ' + imgs.length + ' imagens do README existem');
const docLinks = [...readme.matchAll(/\]\((docs\/[^)#]+)/g)]
  .map((m) => m[1])
  .filter((u) => !exists(path.join(ROOT, u)));
docLinks.length
  ? bad('links do README para documentos que não existem: ' + docLinks.join(', '))
  : ok('links do README para docs/ funcionam');
exists(path.join(ROOT, 'THIRD-PARTY-NOTICES.md')) && exists(path.join(ROOT, 'licenses'))
  ? ok('avisos de licença de terceiros presentes (pdf.js e Inter)')
  : bad('faltam THIRD-PARTY-NOTICES.md e licenses/');

if (strict) {
  head('6. Preenchimento obrigatório (modo --strict)');
  const files = [
    'README.md',
    'README.en.md',
    'LICENSE',
    'CONTRIBUTING.md',
    'CHANGELOG.md',
    'package.json',
    'src/js/core/config.js',
    'SECURITY.md',
  ].filter((f) => exists(path.join(ROOT, f)));
  const left = [];
  for (const f of files) {
    const t = read(path.join(ROOT, f));
    for (const m of t.matchAll(/\[defina[^\]]*\]|\[SEU NOME\]|SEU-USUARIO|SEU-REPO|SEU-SITE/g))
      left.push(f + ': ' + m[0]);
  }
  left.length
    ? bad(
        'ainda há campos para preencher (rode: node tools/personalizar.js --usuario=... --repo=... --nome="..." --email=...):\n      ' +
          [...new Set(left)].join('\n      ')
      )
    : ok('nome, e-mail, usuário e repositório preenchidos');
  exists(path.join(ROOT, 'LICENSE')) ? ok('LICENSE existe') : bad('falta a licença');
}

console.log(
  '\n' +
    (errs ? '✗ ' + errs + ' problema(s)' : '✓ tudo certo') +
    (warns ? ', ' + warns + ' aviso(s)' : '') +
    (strict ? '' : '. (Antes de tornar o repositório público rode também: npm run check:release:strict)')
);
process.exit(errs ? 1 : 0);
