/* Teste de ponta a ponta em Chromium de verdade.
   Serve a pasta dist/ com os mesmos cabeçalhos de segurança do site publicado (arquivo _headers) e confere,
   numa tela de celular e em outros tamanhos: erros, violações da política de segurança, largura da tela, cadastro,
   tutorial (com toques reais), importação de uma fatura em PDF fictícia, dados depois de recarregar e modo offline.
   Uso: npm run test:browser   (na raiz)  |  CHROME_PATH=/caminho/do/chrome para usar o Chrome instalado  |  SHOTS=1 salva capturas em out/ */
const http = require('http'),
  fs = require('fs'),
  path = require('path'),
  puppeteer = require('puppeteer-core');
const DIST = path.join(__dirname, '..', '..', 'dist'),
  PDF = path.join(__dirname, '..', 'data', 'fatura-nomad-ficticia.pdf'),
  OUT = path.join(__dirname, 'out');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

function serve() {
  const hdr = {};
  let cur = null;
  fs.readFileSync(path.join(DIST, '_headers'), 'utf8')
    .split('\n')
    .forEach((l) => {
      if (/^\S/.test(l)) cur = l.trim();
      else if (/^\s+\S/.test(l) && cur === '/*') {
        const i = l.indexOf(':');
        hdr[l.slice(0, i).trim()] = l.slice(i + 1).trim();
      }
    });
  return new Promise((res) => {
    const s = http.createServer((q, r) => {
      let u = decodeURIComponent(q.url.split('?')[0]);
      if (u.endsWith('/')) u += 'index.html';
      const f = path.join(DIST, u);
      if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
        r.writeHead(404, hdr);
        return r.end('404');
      }
      r.writeHead(200, {
        ...hdr,
        'Content-Type': MIME[path.extname(f)] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      fs.createReadStream(f).pipe(r);
    });
    s.listen(0, () => res({ s, url: 'http://localhost:' + s.address().port + '/' }));
  });
}

async function launch() {
  if (process.env.CHROME_PATH)
    return puppeteer.launch({
      executablePath: process.env.CHROME_PATH,
      headless: true,
      args: ['--no-sandbox'],
    });
  const chromium = require('@sparticuz/chromium');
  const c = chromium.default || chromium;
  return puppeteer.launch({
    executablePath: await c.executablePath(),
    args: [...c.args, '--no-sandbox'],
    headless: 'shell',
  });
}

(async () => {
  if (!fs.existsSync(path.join(DIST, 'index.html')))
    throw new Error('Rode "npm run build" antes (falta dist/).');
  const { s, url } = await serve(),
    b = await launch();
  let pass = 0,
    fail = 0;
  const problems = { errors: [], csp: [], failed: [] };
  const ok = (c, t, x) => {
    c ? pass++ : fail++;
    console.log((c ? '  ✓ ' : '  ✗ ') + t + (x !== undefined && !c ? ' → ' + x : ''));
  };
  if (process.env.SHOTS) fs.mkdirSync(OUT, { recursive: true });
  const shot = (p, n) => (process.env.SHOTS ? p.screenshot({ path: path.join(OUT, n + '.png') }) : null);
  const open = async (vp) => {
    const p = await b.newPage();
    await p.setViewport(vp);
    await p.evaluateOnNewDocument(() => {
      window.__csp = [];
      document.addEventListener('securitypolicyviolation', (e) =>
        window.__csp.push(e.violatedDirective + ' ' + e.blockedURI)
      );
    });
    p.on('pageerror', (e) => problems.errors.push(String(e.message).slice(0, 160)));
    p.on('console', (m) => {
      if (m.type() === 'error') problems.errors.push('console: ' + m.text().slice(0, 160));
    });
    p.on('requestfailed', (r) => problems.failed.push(r.url() + ' ' + ((r.failure() || {}).errorText || '')));
    return p;
  };
  const click = (p, sel) => p.evaluate((s) => document.querySelector(s).click(), sel);
  const wide = (p, W) => p.evaluate((w) => document.documentElement.scrollWidth > w + 1 || innerWidth > w, W);
  const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

  console.log('\n1. Telas em vários tamanhos (sem estourar a largura)');
  for (const W of [320, 360, 390, 414, 768, 1280]) {
    const p = await open({ ...PHONE, width: W, isMobile: W < 700 });
    await p.goto(url, { waitUntil: 'networkidle0' });
    const bad = [];
    if (await wide(p, W)) bad.push('entrada');
    await click(p, '#demoBtn');
    await sleep(700);
    if (await wide(p, W)) bad.push('início');
    for (const t of ['lanc', 'agenda', 'config']) {
      await click(p, '.nv[data-go="' + t + '"]');
      await sleep(350);
      if (await wide(p, W)) bad.push(t);
    }
    await click(p, '#fabNew');
    await sleep(350);
    if (await wide(p, W)) bad.push('novo lançamento');
    if (W === 390) await shot(p, 'novo-lancamento');
    ok(!bad.length, W + 'px: nenhuma tela estoura a largura', bad.join(', '));
    await p.close();
  }

  console.log('\n1b. Renda comprometida e nova categoria na hora');
  {
    const q = await open(PHONE);
    await q.goto(url, { waitUntil: 'networkidle0' });
    await click(q, '#demoBtn');
    await sleep(800);
    const cardTxt = await q.evaluate(() => (document.querySelector('.cmc') || {}).textContent || '');
    ok(
      /Renda comprometida|da sua renda vai para despesas recorrentes/.test(cardTxt) ||
        /da sua renda/.test(cardTxt),
      'o card de renda comprometida aparece no Início',
      cardTxt.slice(0, 80)
    );
    ok(
      /\d+%\s*da sua renda vai para despesas recorrentes/.test(cardTxt),
      'mostra a porcentagem da renda em despesas recorrentes',
      cardTxt.slice(0, 120)
    );
    await q.evaluate(() => document.querySelector('.cmc').scrollIntoView({ block: 'center' }));
    await sleep(300);
    await shot(q, 'renda-comprometida');
    await q.evaluate(() => document.querySelector('.cmd summary').click());
    await sleep(300);
    ok(
      await q.evaluate(
        () =>
          document.querySelectorAll('.cmcol').length === 6 &&
          document.querySelector('.cmx').getBoundingClientRect().height > 40
      ),
      'os 6 próximos meses abrem e aparecem na tela'
    );
    await shot(q, 'renda-proximos-meses');
    ok(!(await wide(q, 390)), 'o card não estoura a largura do celular');
    await click(q, '#fabNew');
    await sleep(500);
    await q.tap('#chipNew');
    await sleep(300);
    ok(
      await q.evaluate(
        () =>
          !document.getElementById('qcat').hidden &&
          document.activeElement === document.getElementById('qcName')
      ),
      'toque em "+ Nova categoria" abre o diálogo com o foco no nome'
    );
    await shot(q, 'nova-categoria');
    await q.type('#qcName', 'Saúde do Lucas');
    await q.tap('#qcSw [data-sw="6"]');
    await q.tap('#qcOk');
    await sleep(300);
    ok(
      await q.evaluate(
        () =>
          document.getElementById('qcat').hidden &&
          document.getElementById('fCat').value === 'Saúde do Lucas' &&
          CATS.includes('Saúde do Lucas')
      ),
      'a categoria é criada, escolhida e o formulário continua aberto'
    );
    await click(q, '#sheetClose');
    await sleep(300);
    await q.evaluate(() => {
      go('lanc');
      seg('hist');
    });
    await sleep(500);
    await q.tap('#mCat');
    await sleep(300);
    await q.evaluate(() => {
      const s = document.getElementById('mCatSel');
      s.value = '__new__';
      s.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(300);
    ok(
      await q.evaluate(() => !document.getElementById('qcat').hidden),
      'no histórico, a lista de categorias também abre o diálogo'
    );
    ok(!(await wide(q, 390)), 'o diálogo não estoura a largura do celular');
    await q.tap('#qcNo');
    await q.close();
    const small = await open({ ...PHONE, width: 320 });
    await small.goto(url, { waitUntil: 'networkidle0' });
    await click(small, '#demoBtn');
    await sleep(700);
    await click(small, '#fabNew');
    await sleep(400);
    await small.evaluate(() => document.getElementById('chipNew').click());
    await sleep(300);
    ok(
      !(await wide(small, 320)) &&
        (await small.evaluate(() => {
          const b = document.querySelector('#qcat .box').getBoundingClientRect();
          return b.left >= 0 && b.right <= innerWidth;
        })),
      'em 320px o diálogo cabe na tela'
    );
    await small.close();
  }

  console.log('\n1c. Modos do Início (Completa, Simples e Personalizar)');
  {
    const q = await open(PHONE);
    await q.goto(url, { waitUntil: 'networkidle0' });
    await click(q, '#demoBtn');
    await sleep(800);
    const vis = () =>
      q.evaluate(() =>
        [...document.querySelectorAll('#home > .hw')].filter((e) => !e.hidden).map((e) => e.dataset.w)
      );
    const STD = 'resumo,fluxo,comprometida,avisos,contas,dicas,sonhos,graficos,indicadores,recentes';
    ok((await vis()).join() === STD, 'Completa: os 10 blocos de sempre, na ordem', (await vis()).join());
    await q.tap('#avBtn');
    await sleep(250);
    const mi = await q.evaluate(() =>
      [...document.querySelectorAll('#menu .mi:not([hidden])')].map((e) => e.id)
    );
    ok(
      mi.join() === 'mCfg,mView,mTheme,out',
      'o menu tem "Modo de visualização" entre Configurações e Tema',
      mi.join()
    );
    await q.tap('#mView');
    await sleep(300);
    await shot(q, 'modo-janela');
    ok(
      await q.evaluate(
        () =>
          !document.getElementById('vmode').hidden &&
          document.querySelector('.vmo.on').dataset.m === 'completa'
      ),
      'a janela abre com a Completa marcada'
    );
    ok(!(await wide(q, 390)), 'a janela cabe na tela do celular');
    await q.tap('.vmo[data-m="simples"]');
    await sleep(600);
    ok(
      (await vis()).join() === 'resumo,fluxo,avisos,graficos,recentes',
      'Simples: só os 5 blocos essenciais',
      (await vis()).join()
    );
    ok(
      await q.evaluate(() => getComputedStyle(document.getElementById('chSeg')).display === 'none'),
      'Simples: o gráfico não mostra a escolha de tipo'
    );
    await shot(q, 'modo-simples');
    await q.tap('#avBtn');
    await sleep(200);
    await q.tap('#mView');
    await sleep(300);
    await q.tap('.vmo[data-m="custom"]');
    await sleep(500);
    ok(await q.evaluate(() => !document.getElementById('hedit').hidden), 'Personalizar abre o editor');
    await shot(q, 'modo-editor');
    ok(!(await wide(q, 390)), 'o editor cabe na tela do celular');
    for (let i = 0; i < 30; i++) {
      const more = await q.evaluate(() => {
        const b = document.querySelector('#heOff .hed-add button');
        if (b) b.click();
        return !!b;
      });
      if (!more) break;
      await sleep(100);
    }
    const n = await q.evaluate(() => document.querySelectorAll('#heOn .hed-item').length);
    ok(n === 17, 'dá para adicionar os 17 blocos', n);
    await q.evaluate(() => document.querySelector('#hedit .hed-body').scrollTo(0, 0));
    await sleep(200);
    const g = await q.evaluate(() => {
      const li = [...document.querySelectorAll('#heOn .hed-item')],
        h = li[0].querySelector('.hed-grip').getBoundingClientRect();
      return {
        x: h.x + h.width / 2,
        y: h.y + h.height / 2,
        first: li[0].dataset.w,
        end: document.querySelector('#hedit .hed-body').getBoundingClientRect().bottom - 30,
      };
    });
    await q.touchscreen.touchStart(g.x, g.y);
    for (let i = 1; i <= 12; i++) {
      await q.touchscreen.touchMove(g.x, g.y + ((g.end - g.y) * i) / 12);
      await sleep(25);
    }
    await sleep(2500);
    await q.touchscreen.touchEnd();
    await sleep(400);
    const ord = await q.evaluate(() =>
      [...document.querySelectorAll('#heOn .hed-item')].map((e) => e.dataset.w)
    );
    ok(
      ord[0] !== g.first && ord.indexOf(g.first) >= ord.length - 2,
      'arrastar com o dedo move o bloco, e a lista rola sozinha perto da borda (' +
        g.first +
        ' foi para ' +
        (ord.indexOf(g.first) + 1) +
        ' de ' +
        ord.length +
        ')'
    );
    await q.evaluate(() => {
      document.querySelector('#hedit .hed-body').scrollTo(0, 0);
      document.querySelector('#heOn .hed-grip').focus();
    });
    const b0 = await q.evaluate(() => document.querySelector('#heOn .hed-item').dataset.w);
    await q.keyboard.press('ArrowDown');
    await sleep(250);
    ok(
      await q.evaluate(
        (b) =>
          document.querySelectorAll('#heOn .hed-item')[1].dataset.w === b &&
          document.activeElement.closest('.hed-item').dataset.w === b,
        b0
      ),
      'teclado: seta para baixo move o bloco e mantém o foco'
    );
    await q.tap('#heDone');
    await sleep(700);
    const v = await vis();
    ok(
      v.length === 17 && v.includes('diario') && v.includes('atalhos'),
      'o Início mostra os 17 blocos na ordem escolhida',
      v.length
    );
    ok(!(await wide(q, 390)), 'o Início com todos os blocos cabe na tela');
    ok(
      !/NaN|Infinity|undefined|\[object/.test(
        await q.evaluate(() => document.getElementById('home').textContent)
      ),
      'nenhum bloco mostra NaN ou undefined'
    );
    await q.evaluate(() => document.querySelector('[data-w="diario"]').scrollIntoView({ block: 'center' }));
    await sleep(300);
    await shot(q, 'modo-blocos-novos');
    await q.close();
    const w320 = await open({ ...PHONE, width: 320 });
    await w320.goto(url, { waitUntil: 'networkidle0' });
    await click(w320, '#demoBtn');
    await sleep(700);
    await click(w320, '#avBtn');
    await click(w320, '#mView');
    await sleep(300);
    let bad320 = (await wide(w320, 320)) ? 'janela' : '';
    await click(w320, '.vmo[data-m="custom"]');
    await sleep(500);
    if (await wide(w320, 320)) bad320 += ' editor';
    for (let i = 0; i < 30; i++) {
      const more = await w320.evaluate(() => {
        const b = document.querySelector('#heOff .hed-add button');
        if (b) b.click();
        return !!b;
      });
      if (!more) break;
    }
    await click(w320, '#heDone');
    await sleep(600);
    if (await wide(w320, 320)) bad320 += ' início';
    ok(!bad320, 'em 320px a janela, o editor e o Início com 17 blocos cabem na tela', bad320);
    await w320.close();
  }

  console.log('\n2. Cadastro e tutorial (toques reais)');
  const p = await open(PHONE);
  await p.goto(url, { waitUntil: 'networkidle0' });
  ok(await p.evaluate(() => Store.mode === 'idb'), 'usa o IndexedDB de verdade');
  await p.tap('#toSign');
  await sleep(300);
  await p.type('#sN', 'Ana Teste');
  await p.type('#sE', 'ana@teste.com');
  await p.type('#sP', 'senha123');
  await p.type('#sP2', 'senha123');
  await p.tap('#sCons');
  await p.tap('#fSign button[type=submit]');
  await p.waitForFunction(() => !document.getElementById('app').hidden, { timeout: 8000 });
  ok(true, 'cadastro com e-mail e senha simples (sem CPF)');
  const started = await p
    .waitForFunction(() => !document.getElementById('tour').hidden, { timeout: 12000 })
    .then(
      () => true,
      () => false
    );
  ok(started, 'o tutorial começa sozinho');
  let steps = 0,
    taps = 0;
  for (let i = 0; i < 60; i++) {
    const st = await p.evaluate(() => {
      if (document.getElementById('tour').hidden) return { done: true };
      const s = TOUR[tourI];
      return { next: !document.getElementById('tourNext').hidden, click: !!s.click, sel: s.target };
    });
    if (st.done) break;
    steps++;
    if (st.next) {
      await p.tap('#tourNext');
      await sleep(450);
    } else if (st.click) {
      taps++;
      await p.tap(st.sel);
      await sleep(700);
    } else {
      await p.evaluate(() => window.scrollBy(0, 500));
      await sleep(500);
    }
  }
  ok(
    await p.evaluate(() => document.getElementById('tour').hidden && prefs.tourDone === true),
    'o tutorial termina (' + steps + ' passos, ' + taps + ' toques no item destacado)'
  );

  console.log('\n3. Importar fatura em PDF (com a política de segurança ligada)');
  await p.evaluate(() => {
    go('lanc');
    seg('imp');
  });
  await sleep(400);
  await (await p.$('#pdf')).uploadFile(PDF);
  await p.tap('#read');
  const read = await p
    .waitForFunction(() => !document.getElementById('rev').hidden, { timeout: 25000 })
    .then(
      () => true,
      () => false
    );
  ok(read, 'a fatura foi lida no navegador');
  const info = await p.evaluate(() => ({
    bank: document.getElementById('bank').value,
    rows: document.querySelectorAll('#revRows tr').length,
    chk: document.getElementById('revChk').textContent,
  }));
  ok(info.bank === 'nomad', 'a Nomad foi reconhecida sozinha', info.bank);
  ok(info.rows === 11, '11 linhas na conferência', info.rows);
  ok(/✓/.test(info.chk), 'a soma bate com o total da fatura', info.chk);
  await shot(p, 'importar');
  await p.tap('#revAdd');
  await sleep(500);
  ok(
    await p.evaluate(() => data.length === 10 && cards.some((c) => c.n === 'Nomad')),
    '10 lançamentos adicionados e cartão Nomad criado'
  );

  console.log('\n4. Dados depois de recarregar');
  await p.evaluate(() => storeFlush());
  await p.reload({ waitUntil: 'networkidle0' });
  if (await p.evaluate(() => document.getElementById('app').hidden)) {
    await p.type('#lE', 'ana@teste.com');
    await p.type('#lP', 'senha123');
    await p.tap('#fLogin button[type=submit]');
    await p.waitForFunction(() => !document.getElementById('app').hidden, { timeout: 8000 });
  }
  ok(await p.evaluate(() => data.length === 10), 'os 10 lançamentos continuam depois de recarregar');

  console.log('\n5. Sem internet');
  await p.evaluate(() => navigator.serviceWorker.ready);
  await sleep(1500);
  ok(
    await p.evaluate(async () => {
      const k = await caches.keys();
      return k.length && (await (await caches.open(k[0])).keys()).length >= 10;
    }),
    'o service worker guardou os arquivos do app'
  );
  await p.setOfflineMode(true);
  await p.reload({ waitUntil: 'load' });
  await sleep(800);
  ok(
    await p.evaluate(() => typeof Store === 'object' && !!document.getElementById('auth')),
    'sem internet o app abre normalmente'
  );
  await click(p, '#demoBtn');
  await sleep(700);
  ok(
    await p.evaluate(() => !document.getElementById('app').hidden && data.length > 100),
    'sem internet o modo de exemplo funciona'
  );
  await shot(p, 'offline');

  console.log('\n6. Erros e política de segurança');
  const csp = await p.evaluate(() => window.__csp);
  ok(!csp.length, 'nenhuma violação da política de segurança', JSON.stringify(csp));
  const err = problems.errors.filter((e) => !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(e));
  ok(!err.length, 'nenhum erro de página nem do console', JSON.stringify(err));
  const fl = problems.failed.filter((u) => !/ERR_INTERNET_DISCONNECTED/.test(u));
  ok(
    !fl.length,
    'nenhuma requisição falhou (fora a que foi cortada de propósito no modo offline)',
    JSON.stringify(fl)
  );

  await b.close();
  s.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' falha(s)' : '✓ tudo certo') + ' · ' + pass + ' verificações');
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.log('ERRO:', e.message);
  process.exit(1);
});
