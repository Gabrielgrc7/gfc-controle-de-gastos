/* features/money-input.js
   Campo de valor estilo banco: só números, centavos entram primeiro. */

const MONEY_SEL = '#fVal,#budget,#cdLim,#gA,#acI,[data-cl],[data-pvi],[data-gi],[data-f="value"]';

const mnFmt = (n) =>
  (Math.round(Math.abs(n) * 100) / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const natVal = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

function moneyNorm(v) {
  const n = typeof v === 'number' ? v : parse(String(v == null ? '' : v));
  return isFinite(n) ? mnFmt(Math.min(Math.abs(n), 99999999999.99)) : '0,00';
}

function moneyify(el) {
  if (el.__money) return;
  el.__money = 1;
  Object.defineProperty(el, 'value', {
    configurable: true,
    get() {
      return natVal.get.call(this);
    },
    set(v) {
      natVal.set.call(this, moneyNorm(v));
    },
  });
  el.setAttribute('inputmode', 'numeric');
  el.setAttribute('autocomplete', 'off');
  el.setAttribute('enterkeyhint', 'done');
  natVal.set.call(el, moneyNorm(natVal.get.call(el)));
}

function moneyMask(el) {
  let dg = natVal.get.call(el).replace(/\D/g, '').replace(/^0+/, '');
  if (dg.length > 11) dg = dg.slice(0, 11);
  const out = mnFmt(parseInt(dg || '0', 10) / 100);
  natVal.set.call(el, out);
  try {
    el.setSelectionRange(out.length, out.length);
  } catch (e) {}
}

const moneyEnd = (el) =>
  setTimeout(() => {
    try {
      const n = natVal.get.call(el).length;
      el.setSelectionRange(n, n);
    } catch (e) {}
  }, 0);

document.addEventListener(
  'input',
  (e) => {
    if (e.target.__money) moneyMask(e.target);
  },
  true
);

document.addEventListener(
  'keydown',
  (e) => {
    const t = e.target;
    if (!t.__money || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key && e.key.length === 1 && !/\d/.test(e.key)) e.preventDefault();
  },
  true
);

['focusin', 'click', 'mouseup', 'touchend'].forEach((ev) =>
  document.addEventListener(
    ev,
    (e) => {
      if (e.target.__money) moneyEnd(e.target);
    },
    true
  )
);

const moneyScan = (r) => {
  if (r.nodeType !== 1) return;
  if (r.matches && r.matches(MONEY_SEL)) moneyify(r);
  if (r.querySelectorAll) r.querySelectorAll(MONEY_SEL).forEach(moneyify);
};

moneyScan(document.body);

new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach(moneyScan))).observe(document.body, {
  childList: true,
  subtree: true,
});
