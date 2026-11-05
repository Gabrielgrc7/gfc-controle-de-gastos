/* core/utils.js
   Ferramentas pequenas usadas em todo o app: atalho $, formatação de reais, escape de HTML, datas e somas. */

const $ = (id) => document.getElementById(id);

const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const esc = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

let today = new Date();

const iso = (d) =>
  d.getFullYear() +
  '-' +
  String(d.getMonth() + 1).padStart(2, '0') +
  '-' +
  String(d.getDate()).padStart(2, '0');

const parse = (s) => {
  s = String(s).trim();
  const n = parseFloat(
    s.includes(',')
      ? s.replace(/\./g, '').replace(',', '.')
      : /^\d{1,3}(\.\d{3})+$/.test(s)
        ? s.replace(/\./g, '')
        : s
  );
  return isFinite(n) ? n : NaN;
};

const short = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR');

const pc = (v) => v.toFixed(1).replace('.', ',') + '%';

const num = (s) => parseFloat(s.replace(/\./g, '').replace(',', '.'));

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const hash32 = (s) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

const addM = (m, n) => {
  const d = new Date(+m.slice(0, 4), +m.slice(5, 7) - 1 + n, 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
};

const mdiff = (a, b) => (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5, 7) - +a.slice(5, 7));

const dayIn = (m, d) => Math.min(d, new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate());

const mfmt = (m) =>
  new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    .replace('.', '');

const cleanName = (s) =>
  String(s || '')
    .replace(/[<>&"'`\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 30);

const sm = (o) => Object.values(o).reduce((a, b) => a + b, 0);

const say = (el, t, bad) => {
  el.style.color = bad ? 'var(--bad)' : 'var(--mute)';
  el.textContent = t;
};

const pad2 = (n) => String(n).padStart(2, '0'),
  cmNow = () => iso(today).slice(0, 7);

const sumV = (a) => a.reduce((s, x) => s + x.value, 0);

const daysTo = (d) => Math.round((new Date(d + 'T12:00:00') - new Date(iso(today) + 'T12:00:00')) / 864e5);

const dueTxt = (n) =>
  n < 0
    ? 'Atrasada há ' + -n + (n === -1 ? ' dia' : ' dias')
    : n === 0
      ? 'Vence hoje'
      : n === 1
        ? 'Vence amanhã'
        : 'Vence em ' + n + ' dias';

const hay = (x) => (x.desc + ' ' + (x.tag || '') + ' ' + (x.quem || '')).toLowerCase();

const cpt = (v) =>
  v >= 1000 ? (v / 1000).toFixed(1).replace('.', ',').replace(',0', '') + 'k' : String(Math.round(v));

const nz = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
