#!/usr/bin/env node
/* Montador do GFC (sem dependências).
   node tools/build.js           -> dist/        (site pronto para hospedar: index.html + css + js/app.js + vendor + fontes)
   node tools/build.js --single  -> dist/gfc-single.html  (tudo em um arquivo; usado nos testes e no claude.ai)
   node tools/build.js --sync    -> reescreve em src/index.html a lista de <script> a partir de src/js/order.json */
const fs = require('fs'),
  path = require('path');
const ROOT = path.join(__dirname, '..'),
  SRC = path.join(ROOT, 'src'),
  DIST = path.join(ROOT, 'dist');
const rd = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');
const order = JSON.parse(rd('js/order.json'));
/* Endereço do site (para a imagem de compartilhamento do LinkedIn): SITE_URL=https://usuario.github.io/repo npm run build.
   Sem ele, as tags que precisam de endereço completo são removidas. */
const SITE = (process.env.SITE_URL || '').trim().replace(/\/+$/, '');
const withSite = (h) =>
  SITE ? h.replace(/__SITE_URL__/g, SITE + '/') : h.replace(/[ \t]*<meta [^>]*__SITE_URL__[^>]*>\n?/g, '');
const MARK = (name) => new RegExp('<!-- @' + name + ':start -->[\\s\\S]*?<!-- @' + name + ':end -->');
const bundle = () => order.map((f) => rd('js/' + f + '.js').replace(/\s+$/, '')).join('\n\n') + '\n';
function copy(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}
if (process.argv.includes('--sync')) {
  const tags = order.map((f) => '<script src="js/' + f + '.js"></script>').join('\n');
  const html = rd('index.html').replace(MARK('app'), '<!-- @app:start -->\n' + tags + '\n<!-- @app:end -->');
  fs.writeFileSync(path.join(SRC, 'index.html'), html);
  console.log('index.html sincronizado com', order.length, 'arquivos de script');
  process.exit(0);
}
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
const js = bundle();
if (process.argv.includes('--single')) {
  const font = fs.readFileSync(path.join(SRC, 'fonts/inter-latin-wght-normal.woff2')).toString('base64');
  const css = rd('css/styles.css').replace(
    'url("../fonts/inter-latin-wght-normal.woff2")',
    'url(data:font/woff2;base64,' + font + ')'
  );
  let h = rd('index.html')
    .replace(/[ \t]*<meta [^>]*__SITE_URL__[^>]*>\n?/g, '')
    .replace(/<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\n?/g, '')
    .replace('<link rel="stylesheet" href="css/styles.css">', '<style>' + css + '</style>')
    .replace(MARK('vendor'), '')
    .replace(MARK('app'), '');
  h = h.replace(
    '</body>',
    '<script>\n' +
      rd('vendor/pdf.min.js') +
      '\n</script>\n<script>\n' +
      rd('vendor/pdf.worker.min.js') +
      '\n</script>\n<script>\n' +
      js +
      '</script>\n</body>'
  );
  fs.writeFileSync(path.join(DIST, 'gfc-single.html'), h);
  console.log('dist/gfc-single.html', (h.length / 1024).toFixed(0), 'KB');
  process.exit(0);
}
copy(path.join(SRC, 'css/styles.css'), path.join(DIST, 'css/styles.css'));
for (const f of [
  'fonts/inter-latin-wght-normal.woff2',
  'vendor/pdf.min.js',
  'vendor/pdf.worker.min.js',
  'manifest.webmanifest',
  'sw.js',
  'icon.svg',
  'icon-192.png',
  'icon-512.png',
  'og-image.png',
  '_headers',
])
  copy(path.join(SRC, f), path.join(DIST, f));
fs.mkdirSync(path.join(DIST, 'js'), { recursive: true });
fs.writeFileSync(
  path.join(DIST, 'js/app.js'),
  '/* GFC: pacote gerado por tools/build.js a partir de src/js/*.js. Não edite aqui. */\n' + js
);
fs.writeFileSync(
  path.join(DIST, 'index.html'),
  withSite(rd('index.html').replace(MARK('app'), '<script src="js/app.js"></script>'))
);
console.log(
  'dist/ pronto:',
  order.length,
  'arquivos de script reunidos em js/app.js (' + (js.length / 1024).toFixed(0) + ' KB)'
);
