/* features/import-files.js
   Importar extrato OFX ou CSV, leitor genérico de PDF e lista em texto. */

$('imp').onclick = () => {
  const date = $('iDate').value;
  if (!date) {
    $('iMsg').textContent = 'Escolha uma data.';
    return;
  }
  let n = 0,
    bad = 0;
  $('iText')
    .value.split(/\n/)
    .forEach((l) => {
      l = l.trim();
      if (!l) return;
      const m = l.match(/^(.*?)[\s\-–:]*R\$\s*([\d.,]+)\s*$/i);
      if (!m) {
        if (/\d/.test(l)) bad++;
        return;
      }
      const v = parse(m[2]);
      if (!(v > 0)) {
        bad++;
        return;
      }
      const desc = m[1].trim() || 'Sem descrição';
      data.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        desc,
        value: Math.round(v * 100) / 100,
        date,
        cat: ruleCat(desc) || catByKey(guess(desc)),
      });
      n++;
    });
  if (n) {
    store('gastos:items', data);
    $('month').value = date.slice(0, 7);
    $('iText').value = '';
    render();
  }
  $('iMsg').textContent = n + ' lançamentos importados' + (bad ? '; ' + bad + ' linha(s) ignorada(s).' : '.');
};

const toISO = (s) => {
  s = String(s || '').trim();
  let m;
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return m[0];
  if ((m = s.match(/^(\d{2})[\/.-](\d{2})[\/.-](\d{4})/))) return m[3] + '-' + m[2] + '-' + m[1];
  if ((m = s.match(/^(\d{2})[\/.-](\d{2})[\/.-](\d{2})$/))) return '20' + m[3] + '-' + m[2] + '-' + m[1];
  return '';
};

function parseOFX(t) {
  const rows = [],
    re = /<STMTTRN>([\s\S]*?)(?=<\/STMTTRN>|<STMTTRN>|<\/BANKTRANLIST>|$)/gi;
  let m;
  while ((m = re.exec(t))) {
    const b = m[1],
      g = (k) => {
        const r = new RegExp('<' + k + '>([^<\\r\\n]*)', 'i').exec(b);
        return r ? r[1].trim() : '';
      };
    const dt = g('DTPOSTED').slice(0, 8),
      amt = parseFloat(g('TRNAMT').replace(',', '.'));
    if (!/^\d{8}$/.test(dt) || !isFinite(amt) || !amt) continue;
    rows.push(
      mkRow(
        dt.slice(0, 4) + '-' + dt.slice(4, 6) + '-' + dt.slice(6, 8),
        g('MEMO') || g('NAME') || 'Sem descrição',
        Math.abs(amt),
        amt > 0
      )
    );
  }
  return rows;
}

function parseCSV(t) {
  const lines = t
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim());
  if (lines.length < 2) return [];
  const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
  const split = (l) => {
    const o = [];
    let c = '',
      q = false;
    for (const ch of l) {
      if (ch === '"') q = !q;
      else if (ch === sep && !q) {
        o.push(c);
        c = '';
      } else c += ch;
    }
    o.push(c);
    return o.map((s) => s.trim());
  };
  const hd = split(lines[0]).map((h) =>
      h
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
    ),
    ix = (re) => hd.findIndex((h) => re.test(h));
  const di = ix(/^(data|date)/),
    vi = ix(/valor|amount|value/),
    ni = ix(/descri|historico|memo|estabelecimento|lancamento|title|name/);
  if (di < 0 || vi < 0 || ni < 0)
    throw new Error('Não encontrei as colunas de data, descrição e valor na primeira linha do CSV.');
  const rec = lines
      .slice(1)
      .map(split)
      .map((c) => ({
        d: c[di],
        n: c[ni],
        v: parse(
          String(c[vi] || '')
            .replace(/[R$\s]/g, '')
            .replace('−', '-')
        ),
      }))
      .filter((r) => isFinite(r.v) && r.v !== 0),
    neg = rec.some((r) => r.v < 0);
  return rec
    .map((r) => {
      const d = toISO(r.d);
      return d ? mkRow(d, r.n || 'Sem descrição', Math.abs(r.v), neg && r.v > 0) : null;
    })
    .filter(Boolean);
}

function parseGeneric(L) {
  const vl = L.find((l) => /venc/i.test(l) && /\d{2}\/\d{2}\/\d{4}/.test(l)),
    vm = vl && vl.match(/(\d{2})\/(\d{2})\/(\d{4})/),
    dm = vm ? +vm[2] : 12,
    dy = vm ? +vm[3] : today.getFullYear(),
    fmKey = vm ? vm[3] + '-' + vm[2] : undefined;
  const re =
    /^(\d{2})[\/\s](\d{2}|[A-Za-zç]{3})(?:\/(\d{2,4}))?\s+(.+?)\s+(-|−)?\s*(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})(?:\s*[CD])?$/;
  const rows = [];
  L.forEach((l) => {
    const m = l.trim().match(re);
    if (!m || m[5]) return;
    const mo = /^\d+$/.test(m[2]) ? +m[2] : MES[m[2].toUpperCase()];
    if (!mo || mo > 12 || +m[1] > 31) return;
    const desc = m[4].trim();
    if (/pagamento|estorno|saldo|total|encargos|juros/i.test(desc)) return;
    const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : mo > dm ? dy - 1 : dy,
      pm = desc.match(/parc(?:ela)?\.?\s*(\d{1,2})\s*\/\s*(\d{1,2})/i),
      base = desc.replace(/parc(?:ela)?\.?\s*\d{1,2}\s*\/\s*\d{1,2}/i, '').trim();
    const r = mkRow(y + '-' + pad2(mo) + '-' + m[1], desc, num(m[6]), false);
    r.fm = fmKey;
    r.forma = 'Cartão de crédito';
    if (pm && +pm[2] >= 2 && +pm[1] <= +pm[2]) {
      r.kind = 'p';
      r.pn = +pm[1];
      r.pt = +pm[2];
      r.gid = 'g' + hash32(base.toLowerCase() + '|' + r.value + '|' + pm[2]);
    }
    rows.push(r);
  });
  return { rows, sub: null };
}

BANKS.generic = { parse: parseGeneric };

async function readText(f) {
  const b = await f.arrayBuffer();
  let t = new TextDecoder('utf-8').decode(b);
  if (t.includes('\uFFFD')) t = new TextDecoder('windows-1252').decode(b);
  return t;
}

$('xread').onclick = async () => {
  const f = $('xfile').files[0],
    m = $('xMsg');
  if (!f) {
    say(m, 'Escolha o arquivo do extrato (.ofx ou .csv).', 1);
    return;
  }
  if (f.size > 10e6) {
    say(m, 'Arquivo grande demais (máximo 10 MB).', 1);
    return;
  }
  try {
    const t = await readText(f),
      rows = /\.ofx$/i.test(f.name) || /<OFX>|<STMTTRN>/i.test(t) ? parseOFX(t) : parseCSV(t);
    if (!rows.length) throw new Error('Nenhum lançamento encontrado neste arquivo.');
    showRev({ rows, sub: null });
    say(m, rows.length + ' lançamentos lidos. Revise abaixo antes de salvar.');
  } catch (err) {
    say(m, err.message || 'Não foi possível ler este arquivo.', 1);
  }
};
