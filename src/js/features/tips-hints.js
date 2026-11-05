/* features/tips-hints.js
   Ícones, descrições ao passar o mouse e dicas no alto de cada tela. */

const IC = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  down: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  repeat: '<path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/>',
  pie: '<circle cx="12" cy="12" r="9"/><path d="M12 3v9h9"/>',
  bars: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
  line: '<path d="M3 17l6-6 4 4 8-9"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="8.5" r="1"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M8 15v4"/>',
  db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  out: '<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>',
};

const ico = (n) => '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">' + IC[n] + '</svg>';

const DEC = [
  ['#seg [data-s="novo"]', 'plus', 'Registrar um gasto'],
  ['#seg [data-s="imp"]', 'down', 'Trazer vários gastos de uma vez'],
  ['#seg [data-s="hist"]', 'clock', 'Ver, editar e apagar lançamentos'],
  ['#seg [data-s="comp"]', 'repeat', 'Parcelas e contas fixas'],
  ['#chSeg [data-ch="rosca"]', 'pie', 'Gastos por categoria em rosca'],
  ['#chSeg [data-ch="barras"]', 'bars', 'Comparar categorias em barras'],
  ['#chSeg [data-ch="linha"]', 'line', 'Evolução do gasto dia a dia'],
  ['#chSeg [data-ch="semana"]', 'cal', 'Gasto por dia da semana'],
  ['.lr[data-pg="perfil"]', 'user', 'Nome e foto'],
  ['.lr[data-pg="tema"]', 'sun', 'Tema claro ou escuro'],
  ['.lr[data-pg="metas"]', 'target', 'Limites do mês e por categoria'],
  ['.lr[data-pg="cats"]', 'tag', 'Crie e organize suas categorias'],
  ['.lr[data-pg="prefs"]', 'sliders', 'Como contar o mês e dicas'],
  ['.lr[data-pg="dados"]', 'db', 'Backup, exportar e limpar'],
  ['.lr[data-pg="priv"]', 'shield', 'Seus direitos pela LGPD'],
  ['.lr[data-pg="seg"]', 'lock', 'Senha e exclusão da conta'],
  ['.lr[data-pg="sobre"]', 'info', 'Versão, privacidade e dicas'],
  ['#cfgOut', 'out', 'Encerrar a sessão'],
  ['#mCfg', 'sliders', 'Abrir as configurações'],
  ['#mView', 'layout', 'Escolher como o Início aparece'],
  ['#mTheme', 'sun', 'Alternar entre claro e escuro'],
  ['#out', 'out', 'Encerrar a sessão'],
  ['.nv[data-go="inicio"]', null, 'Resumo do mês'],
  ['.nv[data-go="lanc"]', null, 'Registrar e gerenciar gastos'],
  ['.nv[data-go="config"]', null, 'Perfil, metas e preferências'],
  ['#brandBtn', null, 'Ir para o início'],
  ['#avBtn', null, 'Sua conta'],
  ['#prev', null, 'Mês anterior'],
  ['#next', null, 'Próximo mês'],
  ['#mEdit', null, 'Escolher um lançamento para editar'],
  ['#mDel', null, 'Escolher lançamentos para apagar'],
  ['#mCat', null, 'Mudar a categoria de vários lançamentos'],
];

DEC.forEach(([sel, ic, h]) => {
  const el = document.querySelector(sel);
  if (!el) return;
  el.dataset.hint = h;
  if (!ic) return;
  if (el.classList.contains('lr'))
    el.insertAdjacentHTML('afterbegin', '<span class="lic">' + ico(ic) + '</span>');
  else if (el.classList.contains('mi')) el.firstElementChild.insertAdjacentHTML('afterbegin', ico(ic));
  else el.insertAdjacentHTML('afterbegin', ico(ic));
});

const hintEl = $('hint');

function hintShow(t) {
  hintEl.textContent = t.dataset.hint;
  hintEl.hidden = false;
  const r = t.getBoundingClientRect(),
    w = hintEl.offsetWidth,
    h = hintEl.offsetHeight;
  let x = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 8)),
    y = r.bottom + 8;
  if (y + h > innerHeight - 8) y = r.top - h - 8;
  hintEl.style.left = x + 'px';
  hintEl.style.top = y + 'px';
}

document.addEventListener('pointerover', (e) => {
  if (e.pointerType === 'touch') return;
  const t = e.target.closest('[data-hint]');
  if (t) hintShow(t);
});

document.addEventListener('pointerout', (e) => {
  if (e.target.closest('[data-hint]')) hintEl.hidden = true;
});

document.addEventListener('pointerdown', () => {
  hintEl.hidden = true;
});

document.addEventListener('focusin', (e) => {
  const t = e.target.closest('[data-hint]');
  if (t) hintShow(t);
});

document.addEventListener('focusout', () => {
  hintEl.hidden = true;
});

const TIPS = {
  inicio:
    'Aqui está o resumo do mês: total gasto, gráficos e seus últimos lançamentos. Toque em uma categoria para ver o que há nela.',
  'lanc:novo':
    'Registre um gasto com valor, data e categoria. Você também pode criar uma categoria, parcelar uma compra ou repetir todo mês.',
  'lanc:imp':
    'Traga vários gastos de uma vez: leia a fatura do cartão em PDF ou cole uma lista de texto. Você confere tudo antes de salvar.',
  'lanc:hist':
    'Veja os lançamentos do mês. Busque, filtre, edite, apague ou mude a categoria de vários de uma vez. Dica: segure um lançamento para começar a selecionar.',
  'lanc:comp':
    'Acompanhe parcelas e contas fixas: quanto falta pagar, quando termina e a previsão dos próximos meses.',
  config: 'Ajuste o app do seu jeito. Escolha uma seção para ver as opções.',
  perfil: 'Troque sua foto e seu nome.',
  tema: 'Escolha o tema claro ou escuro.',
  metas: 'Defina um limite para o mês e para cada categoria. A barra do Início avisa quando você passar.',
  cats: 'Crie categorias do seu jeito, renomeie, troque a cor ou exclua.',
  prefs: 'Escolha como contar o mês dos gastos de cartão e se quer ver as dicas nas telas.',
  dados: 'Faça backup, restaure, exporte em planilha ou apague seus lançamentos.',
  priv: 'Veja seus direitos pela LGPD: baixar seus dados, corrigir ou excluir sua conta.',
  seg: 'Altere sua senha ou exclua sua conta.',
  sobre: 'Versão do app, privacidade e dicas rápidas.',
  rel: 'Compare os meses por categoria, forma de pagamento ou cartão e veja seus maiores gastos.',
};

const info = document.createElement('div');

info.className = 'info';

function showInfo() {
  const k = V === 'lanc' ? 'lanc:' + S : V === 'config' ? C || 'config' : V,
    t = TIPS[k];
  if (!t || !cur || prefs.tips === false || (prefs.seen || []).includes(k)) {
    info.remove();
    return;
  }
  if (info.isConnected && info.dataset.k === k && info.dataset.u === cur.id) return;
  info.remove();
  info.dataset.k = k;
  info.dataset.u = cur.id;
  info.innerHTML =
    '<span class="ii">' +
    ico('info') +
    '</span><span class="it">' +
    t +
    '</span><button class="lk x" aria-label="Fechar dica" data-hint="Fechar esta dica">×</button>';
  if (V === 'lanc') $('seg').insertAdjacentElement('afterend', info);
  else if (V === 'config') {
    const pg = document.querySelector('[data-p="' + C + '"]'),
      h = pg && pg.querySelector('.pt');
    if (h) h.insertAdjacentElement('afterend', info);
    else if (pg) pg.prepend(info);
  } else if (V === 'rel')
    document.querySelector('[data-v="rel"] .pt').insertAdjacentElement('afterend', info);
  else document.querySelector('[data-v="' + V + '"]').prepend(info);
}

info.addEventListener('click', (e) => {
  if (e.target.closest('.x')) {
    prefs.seen = [...(prefs.seen || []), info.dataset.k];
    store('gastos:prefs', prefs);
    info.remove();
  }
});

IC.eye = '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>';

IC.eyeoff =
  '<path d="M3 3l18 18M10.6 5.2A9.6 9.6 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6C3.7 8.4 2 12 2 12s4 7 10 7c1.6 0 3-.4 4.2-1M9.9 9.9a3 3 0 0 0 4.2 4.2"/>';

IC.card = '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/>';

IC.flag = '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>';

IC.wand = '<path d="M5 19l9-9M14 4v3M12.5 5.5h3M19 11v3M17.5 12.5h3"/>';

IC.trash = '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>';

[
  ['.lr[data-pg="cards"]', 'card', 'Cartões, limites e faturas'],
  ['.lr[data-pg="goals"]', 'flag', 'Metas de economia'],
  ['.lr[data-pg="rules"]', 'wand', 'Categorias automáticas'],
].forEach(([sel, ic, h]) => {
  const el = document.querySelector(sel);
  if (el) {
    el.dataset.hint = h;
    el.insertAdjacentHTML('afterbegin', '<span class="lic">' + ico(ic) + '</span>');
  }
});

Object.assign(TIPS, {
  cards:
    'Cadastre seus cartões com limite, dia de fechamento e vencimento. O app calcula a fatura de cada um e avisa quando ela vence.',
  goals: 'Crie sonhos como viagem ou reserva de emergência, guarde valores aos poucos e veja quanto falta.',
  rules:
    'Quando você corrige uma categoria, o app aprende e aplica nas próximas vezes. Aqui você vê e apaga essas regras.',
  dados: 'Faça backup, restaure, exporte em planilha, recupere itens da lixeira ou apague seus lançamentos.',
});

$('mLabel').dataset.hint = 'Escolher mês e ano';

document.querySelector('.nv[data-go="agenda"]').dataset.hint = 'Calendário com compras e contas';

TIPS.agenda =
  'Veja o mês em calendário. Os pontos mostram compras, receitas, contas a pagar e faturas. Toque em um dia para ver os detalhes.';

IC.bank = '<path d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18"/>';

IC.chat = '<path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12z"/><path d="M8 11h8M8 14.5h5"/>';

IC.plus = '<path d="M12 5v14M5 12h14"/>';
IC.layout =
  '<rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="8" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>';

delete TIPS['lanc:novo'];

TIPS['lanc:hist'] =
  'Veja os lançamentos do mês. Busque, filtre, edite, apague ou mude a categoria de vários de uma vez. Para lançar algo novo, toque no botão + no centro do menu.';

$('mLock').firstElementChild.insertAdjacentHTML('afterbegin', ico('lock'));
