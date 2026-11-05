/* features/tutorial.js
   Tutorial guiado: escurece a tela, destaca um item por vez, explica e (em alguns passos) exige que a pessoa
   toque no item destacado ou role a tela. Pode ser pulado a qualquer momento (botão "Pular" ou tecla Esc).
   Começa sozinho depois que a conta é criada e pode ser revisto em Mais, Sobre e ajuda. */
let tourI = -1,
  tourRaf = 0,
  tourClickEl = null,
  tourClickFn = null,
  tourOn = false;
const tourById = (id) => document.getElementById(id);
const toInicio = () => {
  menuOpen(false);
  if (V === 'lanc' && S === 'novo') closeSheet();
  if (V !== 'inicio') go('inicio');
};
/* Início com o menu da foto aberto (para mostrar o "Modo de visualização") */
const toMenu = () => {
  if (V === 'lanc' && S === 'novo') closeSheet();
  if (V !== 'inicio') go('inicio');
  if ($('menu').hidden) menuOpen(true);
};
const openSheet = () => {
  if (!(V === 'lanc' && S === 'novo')) {
    resetForm();
    go('lancar');
  }
};
/* cada passo: título, texto, alvo (seletor CSS), e opções:
   click = a pessoa precisa tocar no alvo · free = pode mexer no alvo · scroll = a pessoa precisa rolar até o alvo · ensure = prepara a tela */
const TOUR = [
  {
    title: 'Bem-vindo ao GFC',
    text: 'Vamos fazer um passeio rápido, de uns 2 minutos, pelo essencial. Você pode pular quando quiser.',
    ensure: toInicio,
  },
  {
    target: '#mbar',
    title: 'Escolha o mês e o ano',
    text: 'Toque no nome do mês para trocar de mês ou de ano de uma vez. As setas andam um mês por vez.',
    ensure: toInicio,
  },
  {
    target: '.card.hero',
    title: 'Quanto você gastou no mês',
    text: 'Aqui aparecem o total do mês e a barra do limite. Defina um limite em Mais, Metas, e o app avisa quando você estiver perto de estourar.',
    ensure: toInicio,
  },
  {
    target: '.flow3',
    title: 'Receitas, despesas e saldo',
    text: 'Veja o que entrou, o que saiu e quanto sobrou. Toque em Receitas para ver, editar ou apagar as entradas do mês.',
    ensure: toInicio,
  },
  {
    target: '.cmc',
    title: 'Renda comprometida',
    text: 'Veja quanto da sua renda já vai para despesas recorrentes e parcelas, e quanto sobra. Abra "Ver os próximos meses" para planejar com antecedência.',
    ensure: toInicio,
  },
  {
    target: '#fabNew',
    title: 'Seu primeiro lançamento',
    text: 'Este botão + é o jeito principal de registrar um gasto ou uma receita. Toque nele agora.',
    click: true,
    ensure: toInicio,
  },
  {
    target: '#fVal',
    title: 'Valor estilo banco',
    text: 'Digite só os números: os centavos entram primeiro. Digitar 857 vira 8,57. Experimente.',
    free: true,
    ensure: openSheet,
  },
  {
    target: '#tipoW',
    title: 'Despesa ou receita',
    text: 'Escolha se está registrando um gasto ou uma entrada de dinheiro.',
    ensure: openSheet,
  },
  {
    target: '#chips',
    title: 'Categorias do seu jeito',
    text: 'Escolha uma categoria ou toque em "+ Nova categoria" para criar a sua, com a cor que quiser, como "Saúde do meu filho".',
    free: true,
    ensure: openSheet,
  },
  {
    target: '#kindW',
    title: 'À vista, parcelado ou recorrente',
    text: 'Em parcelado, diga a parcela atual e o total. Em recorrente, o app lança sozinho todo mês.',
    ensure: openSheet,
  },
  {
    target: '#sheetClose',
    title: 'Pode fechar sem salvar',
    text: 'Toque no × para voltar. Nada é gravado sem você tocar em Adicionar.',
    click: true,
    ensure: openSheet,
  },
  {
    scroll: '#chSeg',
    title: 'Role para baixo',
    text: 'Deslize a tela para baixo até os gráficos.',
    ensure: toInicio,
  },
  {
    target: '#chSeg',
    title: 'Quatro jeitos de ver seus gastos',
    text: 'Alterne entre rosca, barras, linha e semana. Toque numa categoria para ver todos os lançamentos dela.',
    free: true,
    ensure: toInicio,
  },
  {
    target: '#recent',
    title: 'Últimos lançamentos',
    text: 'Os três lançamentos mais recentes ficam aqui. Para ver todos, use a aba Lançamentos.',
    ensure: toInicio,
  },
  {
    target: '.nv[data-go="lanc"]',
    title: 'Aba Lançamentos',
    text: 'Toque aqui para ver o histórico completo.',
    click: true,
    ensure: toInicio,
  },
  {
    target: '#seg',
    title: 'Histórico, Compromissos e Importar',
    text: 'Histórico: busque, edite e apague. Compromissos: parcelas, contas a pagar e assinaturas. Importar: traga a fatura em PDF ou um extrato.',
    ensure: () => {
      go('lanc');
      seg('hist');
    },
  },
  {
    target: '.nv[data-go="agenda"]',
    title: 'Aba Agenda',
    text: 'Toque aqui para ver o mês em calendário.',
    click: true,
    ensure: () => {
      go('lanc');
    },
  },
  {
    target: '#calGrid',
    title: 'O mês em calendário',
    text: 'Os pontos coloridos mostram compras, receitas, contas a pagar e faturas. Toque num dia para ver os detalhes.',
    ensure: () => go('agenda'),
  },
  {
    target: '.nv[data-go="config"]',
    title: 'Aba Mais',
    text: 'Toque aqui para abrir as configurações.',
    click: true,
    ensure: () => go('agenda'),
  },
  {
    target: '.ll',
    title: 'Tudo se ajusta aqui',
    text: 'Perfil, tema claro ou escuro, metas, cartões, sonhos, categorias, backup e privacidade. Cada item abre uma tela própria.',
    ensure: () => {
      go('config');
      cfgGo('');
    },
  },
  {
    target: '#aiBtn',
    title: 'Seu assistente',
    text: 'Toque neste balão e escreva "gastei 45 no mercado ontem". O assistente monta o lançamento e você só confirma.',
    ensure: toInicio,
  },
  {
    target: '#avBtn',
    title: 'Seu menu',
    text: 'Toque na sua foto para abrir o menu da conta. Vamos ver uma opção dele.',
    click: true,
    ensure: toInicio,
  },
  {
    target: '#mView',
    title: 'Modo de visualização',
    text: 'Aqui você escolhe como o Início aparece: Completa (tudo), Simples (só o essencial) ou Personalizar (você escolhe o que mostrar e em que ordem, e ainda ganha blocos novos).',
    ensure: toMenu,
  },
  {
    title: 'Tudo pronto!',
    text: 'Se quiser rever este passeio, vá em Mais, Sobre e ajuda, Rever tutorial. Bom controle!',
    ensure: toInicio,
  },
];
const tourShown = (el) => !!el && !el.closest('[hidden]');
const tourTarget = (s) => {
  const q = s && (s.target || s.scroll);
  return q ? document.querySelector(q) : null;
};
const tourCanScroll = () => document.documentElement.scrollHeight > innerHeight + 40;
function tourClear() {
  if (tourClickEl) {
    tourClickEl.removeEventListener('click', tourClickFn, true);
    tourClickEl = null;
  }
  window.removeEventListener('scroll', tourScrollCheck);
}
function tourScrollCheck() {
  const s = TOUR[tourI],
    el = s && tourTarget(s);
  if (!s || !s.scroll || !el) return;
  const r = el.getBoundingClientRect();
  if ((r.width > 0 || r.height > 0) && r.top < innerHeight * 0.78 && r.bottom > innerHeight * 0.12)
    tourStep(1);
}
function tourStep(d) {
  let n = tourI + d;
  while (n >= 0 && n < TOUR.length) {
    const s = TOUR[n];
    if (s.ensure) s.ensure();
    if (!(s.target || s.scroll) || tourShown(tourTarget(s))) break;
    n += d;
  }
  if (n >= TOUR.length) return tourEnd();
  tourShow(n < 0 ? 0 : n);
}
function tourShow(i) {
  tourClear();
  tourI = i;
  const s = TOUR[i],
    el = tourTarget(s),
    last = i === TOUR.length - 1;
  tourById('tour').hidden = false;
  document.body.classList.add('touring');
  tourOn = true;
  tourById('tourN').textContent = i + 1 + ' de ' + TOUR.length;
  tourById('tourTitle').textContent = s.title;
  tourById('tourText').textContent = s.text;
  tourById('tourBack').hidden = i === 0;
  const needClick = !!s.click && !!el,
    scrollMode = !!s.scroll,
    waiting = scrollMode && tourCanScroll();
  tourById('tourNext').hidden = needClick || waiting;
  tourById('tourNext').textContent = last ? 'Concluir' : scrollMode ? 'Já rolei' : 'Próximo';
  tourById('tourHint').textContent = needClick
    ? 'Toque no item destacado para continuar.'
    : waiting
      ? 'Deslize a tela para baixo para continuar.'
      : '';
  tourById('tour').classList.toggle('t-scroll', scrollMode);
  tourById('tour').classList.toggle('t-click', needClick || !!s.free);
  if (el && !scrollMode && el.scrollIntoView) el.scrollIntoView({ block: 'center' });
  if (needClick) {
    tourClickEl = el;
    tourClickFn = () =>
      setTimeout(() => {
        if (tourOn && tourI === i) tourStep(1);
      }, 200);
    el.addEventListener('click', tourClickFn, true);
  }
  if (scrollMode) {
    window.addEventListener('scroll', tourScrollCheck, { passive: true });
    tourScrollCheck();
  }
  tourPlace();
  if (!tourById('tourNext').hidden && tourById('tourNext').focus)
    tourById('tourNext').focus({ preventScroll: true });
}
function tourPlace() {
  if (!tourOn) return;
  const s = TOUR[tourI];
  if (!s) return;
  const el = tourTarget(s),
    W = innerWidth,
    H = innerHeight,
    card = tourById('tourCard'),
    set = (id, t, l, w, h) => {
      const e = tourById(id).style;
      e.top = t + 'px';
      e.left = l + 'px';
      e.width = Math.max(0, w) + 'px';
      e.height = Math.max(0, h) + 'px';
    };
  const ch = card.offsetHeight || 190,
    cw = card.offsetWidth || 320;
  let ct, cl;
  if (el && !s.scroll) {
    const r = el.getBoundingClientRect(),
      p = 8,
      top = Math.max(0, r.top - p),
      left = Math.max(0, r.left - p),
      bot = Math.min(H, r.bottom + p),
      right = Math.min(W, r.right + p);
    set('tourT', 0, 0, W, top);
    set('tourB', bot, 0, W, H - bot);
    set('tourL', top, 0, left, bot - top);
    set('tourR', top, right, W - right, bot - top);
    set('tourRing', top, left, right - left, bot - top);
    set('tourHole', top, left, right - left, bot - top);
    tourById('tourRing').hidden = false;
    tourById('tourHole').hidden = false;
    ct = H - bot > ch + 16 ? bot + 12 : Math.max(8, top - ch - 12);
    cl = Math.min(Math.max(8, left + (right - left) / 2 - cw / 2), W - cw - 8);
  } else {
    set('tourT', 0, 0, W, H);
    set('tourB', 0, 0, 0, 0);
    set('tourL', 0, 0, 0, 0);
    set('tourR', 0, 0, 0, 0);
    tourById('tourRing').hidden = true;
    tourById('tourHole').hidden = true;
    ct = s.scroll ? H - ch - 24 : Math.max(12, (H - ch) / 2);
    cl = Math.max(8, (W - cw) / 2);
  }
  card.style.top = ct + 'px';
  card.style.left = cl + 'px';
  tourRaf = requestAnimationFrame(tourPlace);
}
function tourEnd() {
  tourClear();
  cancelAnimationFrame(tourRaf);
  tourOn = false;
  tourI = -1;
  tourById('tour').hidden = true;
  document.body.classList.remove('touring');
  if (cur) {
    prefs.tourDone = true;
    store('gastos:prefs', prefs);
  }
  toInicio();
  window.scrollTo(0, 0);
}
function tourStart() {
  if (!cur || tourOn) return;
  if (typeof aiClose === 'function') aiClose();
  menuOpen(false);
  tourI = -1;
  tourStep(1);
}
/* depois do cadastro: espera a animação de boas-vindas acabar e começa o tutorial */
function tourSoon() {
  if (!cur || prefs.tourDone) return;
  let n = 0;
  const t = setInterval(() => {
    if (!welcomeBusy || ++n > 40) {
      clearInterval(t);
      if (cur && !prefs.tourDone) tourStart();
    }
  }, 150);
}
tourById('tourNext').onclick = () => tourStep(1);
tourById('tourBack').onclick = () => tourStep(-1);
tourById('tourSkip').onclick = tourEnd;
document.addEventListener(
  'keydown',
  (e) => {
    if (tourOn && e.key === 'Escape') {
      e.stopPropagation();
      tourEnd();
    }
  },
  true
);
tourById('tourRestart').onclick = () => tourStart();
