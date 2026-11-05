/* features/assistant-ui.js
   Assistente: balão de chat, cartões de confirmação e gravação. */

document.addEventListener('keydown', (e) => {
  if (
    e.key === 'Escape' &&
    V === 'lanc' &&
    S === 'novo' &&
    $('cdlg').hidden &&
    $('dlg').hidden &&
    $('mpick').hidden &&
    $('aiPanel').hidden &&
    $('pdlg').hidden
  )
    closeSheet();
});

let aiLast = [],
  aiOpened = false;

const aiM = $('aiMsgs');

function aiSay(t, cls) {
  const d = document.createElement('div');
  d.className = 'msg-b ' + (cls || 'bot');
  if (typeof t === 'string') d.textContent = t;
  else d.append(t);
  aiM.append(d);
  aiM.scrollTop = aiM.scrollHeight;
  return d;
}

function aiReset() {
  aiM.innerHTML = '';
  aiLast = [];
  aiOpened = false;
  $('aiPanel').hidden = true;
  $('aiBtn').hidden = false;
}

function aiGreet() {
  aiSay(
    'Oi! Eu lanço gastos para você. Escreva do seu jeito, por exemplo:\n• gastei 45 no mercado\n• recebi 3000 de salário\n• notebook 3x de 500\n• netflix 39,90 todo mês\n• conta de luz 180 vence dia 20\n\nTambém respondo perguntas: "quanto gastei este mês?", "o que vence esta semana?" ou "qual meu saldo?".'
  );
  $('aiChips').innerHTML = [
    'Gastei 45 no mercado',
    'Recebi 3000 de salário',
    'Quanto gastei este mês?',
    'O que vence esta semana?',
    'Qual meu saldo?',
  ]
    .map((s) => '<button class="chip" type="button">' + s + '</button>')
    .join('');
}

function aiOpen() {
  $('aiPanel').hidden = false;
  $('aiBtn').hidden = true;
  if (!aiOpened) {
    aiOpened = true;
    aiGreet();
  }
  setTimeout(() => $('aiIn').focus(), 30);
}

function aiClose() {
  $('aiPanel').hidden = true;
  $('aiBtn').hidden = false;
}

$('aiBtn').onclick = aiOpen;

$('aiClose').onclick = aiClose;

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('aiPanel').hidden && $('cdlg').hidden && $('dlg').hidden) aiClose();
});

$('aiChips').onclick = (e) => {
  const b = e.target.closest('.chip');
  if (b) {
    $('aiIn').value = b.textContent;
    $('aiForm').requestSubmit
      ? $('aiForm').requestSubmit()
      : $('aiForm').dispatchEvent(new Event('submit', { cancelable: true }));
  }
};

function aiCommit(d) {
  const inc = !!d.inc,
    base = {
      desc: d.desc.slice(0, 60),
      value: Math.round(d.value * 100) / 100,
      date: d.date,
      cat: inc ? 'Receita' : d.cat,
    };
  if (inc) base.inc = true;
  const ex = {
    forma: d.forma || undefined,
    cartao: d.cartao || undefined,
    pend: d.bill || undefined,
    bill: d.bill || undefined,
  };
  if (!inc && ex.forma === 'Cartão de crédito') {
    const c = cardOf(ex.cartao);
    if (c && c.f && c.v) ex.fm = invMonth(d.date, c);
  }
  if (d.kind === 'v') {
    const id = uid();
    data.push({ id, ...base, ...ex });
    if (!inc && d.learn) learn(d.desc, d.cat);
    saveAll();
    return { id };
  }
  plans.push({
    gid: uid(),
    kind: d.kind,
    desc: base.desc,
    value: base.value,
    cat: base.cat,
    day: +d.date.slice(8, 10),
    start: d.date,
    pn: d.kind === 'p' ? d.pn : undefined,
    pt: d.kind === 'p' ? d.pt : undefined,
    forma: ex.forma,
    cartao: ex.cartao,
    pend: d.bill || undefined,
    inc: inc || undefined,
    active: true,
    skip: [],
  });
  materialize();
  saveAll();
  return { id: null };
}

const aiTyp = (d) =>
  d.inc
    ? 'Receita'
    : d.kind === 'p'
      ? 'Compra parcelada em ' + d.pt + 'x'
      : d.kind === 'r'
        ? 'Recorrente (todo mês)'
        : d.bill
          ? 'Conta a pagar'
          : 'Despesa';

function aiDraftEl(d) {
  const el = document.createElement('div');
  el.className = 'draft';
  el.innerHTML =
    '<div class="mut" style="font-size:12px;margin-bottom:8px">' +
    aiTyp(d) +
    (d.forma ? ' · ' + esc(d.forma) : '') +
    (d.cartao ? ' · ' + esc(d.cartao) : '') +
    '</div><div class="fl" style="gap:8px"><input data-f="desc" value="' +
    esc(d.desc) +
    '" maxlength="60" aria-label="Descrição"><div class="row" style="flex-wrap:nowrap"><input data-f="value" inputmode="decimal" value="' +
    String(d.value).replace('.', ',') +
    '" aria-label="Valor"><input data-f="date" type="date" value="' +
    d.date +
    '" aria-label="Data"></div>' +
    (d.kind === 'p'
      ? '<div class="row" style="flex-wrap:nowrap"><input data-f="pn" type="number" min="1" max="120" value="' +
        d.pn +
        '" aria-label="Parcela atual"><input data-f="pt" type="number" min="2" max="120" value="' +
        d.pt +
        '" aria-label="Total de parcelas"></div>'
      : '') +
    (d.inc
      ? ''
      : '<select data-f="cat" aria-label="Categoria" data-prev="' +
        esc(d.cat) +
        '">' +
        CATS.map((c) => '<option' + (c === d.cat ? ' selected' : '') + '>' + esc(c) + '</option>').join('') +
        newCatOpt +
        '</select>') +
    '<div class="row"><button class="btn sm" data-a="ok">Adicionar</button><button class="btn ghost sm" data-a="no">Descartar</button></div></div>';
  el.addEventListener('change', (e) => {
    const s = e.target;
    if (!s.matches('[data-f="cat"]')) return;
    if (s.value !== NEWCAT) {
      s.dataset.prev = s.value;
      return;
    }
    catQuick(
      (n) => {
        s.innerHTML =
          CATS.map((c) => '<option' + (c === n ? ' selected' : '') + '>' + esc(c) + '</option>').join('') +
          newCatOpt;
        s.value = s.dataset.prev = n;
      },
      () => (s.value = s.dataset.prev)
    );
  });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]');
    if (!b) return;
    if (b.dataset.a === 'no') {
      el.replaceWith(
        Object.assign(document.createElement('div'), { className: 'msg-b bot', textContent: 'Descartado.' })
      );
      return;
    }
    const g = (k) => {
        const i = el.querySelector('[data-f="' + k + '"]');
        return i ? i.value : '';
      },
      value = parse(g('value')),
      date = g('date');
    if (!(value > 0 && value < 1e9) || !date) {
      aiSay('Confira o valor e a data antes de adicionar.');
      return;
    }
    const nd = {
      ...d,
      desc: cleanName(g('desc')).slice(0, 60) || d.desc,
      value,
      date,
      cat: d.inc ? 'Receita' : g('cat') || d.cat,
      learn: !d.inc && g('cat') && g('cat') !== d.cat,
    };
    if (d.kind === 'p') {
      nd.pn = +g('pn') || 1;
      nd.pt = +g('pt') || d.pt;
      if (!(nd.pt >= 2 && nd.pt <= 120 && nd.pn >= 1 && nd.pn <= nd.pt)) {
        aiSay('Confira as parcelas: a atual não pode passar do total.');
        return;
      }
    }
    const r = aiCommit(nd);
    if (r.id) aiLast.push(r.id);
    const when = date === iso(today) ? 'hoje' : date.split('-').reverse().slice(0, 2).join('/');
    const msg = document.createElement('div');
    msg.className = 'msg-b bot';
    msg.textContent =
      'Pronto! ' +
      (nd.inc
        ? 'Receita'
        : nd.kind === 'p'
          ? 'Parcelamento'
          : nd.kind === 'r'
            ? 'Recorrência'
            : nd.bill
              ? 'Conta a pagar'
              : 'Despesa') +
      ' de ' +
      brl(nd.value) +
      (nd.inc ? '' : ' em ' + nd.cat) +
      ' (' +
      when +
      '). ';
    if (r.id) {
      const u = document.createElement('button');
      u.className = 'lk';
      u.textContent = 'Desfazer';
      u.style.cssText = 'color:var(--ac);text-decoration:underline';
      u.onclick = () => {
        dropEntries(new Set([r.id]));
        aiLast = aiLast.filter((x) => x !== r.id);
        render();
        msg.textContent = 'Desfeito. O item está na lixeira por 30 dias.';
      };
      msg.append(u);
    }
    el.replaceWith(msg);
    render();
    aiM.scrollTop = aiM.scrollHeight;
  });
  return el;
}

async function aiHandle(text) {
  const r = await AI.interpret(text);
  if (r.type === 'help') {
    aiSay(
      'Posso:\n• lançar despesas, receitas, parcelas e recorrências a partir de frases\n• marcar contas como pagas ("paguei a internet")\n• responder: gastos por categoria ou período, saldo, vencimentos, faturas, limite e sonhos\n• desfazer ("desfazer") e apagar o último lançamento\n\nTudo roda no seu aparelho; nada é enviado para fora.'
    );
    return;
  }
  if (r.type === 'undo') {
    if (aiLast.length) {
      const id = aiLast.pop();
      dropEntries(new Set([id]));
      render();
      aiSay('Desfeito. O item foi para a lixeira por 30 dias.');
    } else if (lastDel.length) {
      undoLast();
      aiSay('Restaurei o que você apagou por último.');
    } else aiSay('Não há nada para desfazer.');
    return;
  }
  if (r.type === 'delete_last') {
    const x =
      data
        .slice()
        .reverse()
        .find((i) => aiLast.includes(i.id)) || data[data.length - 1];
    if (!x) {
      aiSay('Você ainda não tem lançamentos.');
      return;
    }
    dropEntries(new Set([x.id]));
    render();
    aiSay('Apaguei "' + x.desc + '" (' + brl(x.value) + '). Se foi sem querer, escreva "desfazer".');
    return;
  }
  if (r.type === 'pay') {
    const term = nz(r.text)
      .replace(
        /^(paguei|pago|quitei)\s+(a\s+|o\s+|as\s+|os\s+)?(conta\s+(de\s+)?|fatura\s+(do\s+|da\s+)?)?/,
        ''
      )
      .trim();
    const pl = payList().filter((x) => term && nz(x.desc).includes(term));
    if (pl.length) {
      payItem(pl[0].t + ':' + pl[0].id);
      aiSay('Marquei "' + pl[0].desc + '" como paga.');
      return;
    }
    aiSay(
      'Não achei uma conta pendente com esse nome. Para registrar um pagamento, escreva o valor, por exemplo: "paguei 120 de internet".'
    );
    return;
  }
  if (r.type === 'drafts') {
    aiSay(
      r.drafts.length === 1
        ? 'Entendi assim. Confira e toque em Adicionar:'
        : 'Entendi ' + r.drafts.length + ' lançamentos. Confira cada um:'
    );
    r.drafts.forEach((d) => aiM.append(aiDraftEl(d)));
    if (r.skipped && r.skipped.length) aiSay('Não achei o valor em: "' + r.skipped.join('", "') + '".');
    aiM.scrollTop = aiM.scrollHeight;
    return;
  }
  if (r.type === 'answer') {
    aiSay(r.text);
    return;
  }
  aiSay(
    'Não entendi bem. Tente, por exemplo:\n• gastei 45 no mercado\n• uber 23,50 ontem\n• recebi 3000 de salário\n• quanto gastei este mês?'
  );
}

$('aiForm').onsubmit = async (e) => {
  e.preventDefault();
  const t = $('aiIn').value.trim();
  if (!t) return;
  $('aiIn').value = '';
  aiSay(t, 'me');
  try {
    await aiHandle(t);
  } catch (err) {
    aiSay('Algo deu errado ao interpretar essa mensagem. Tente de outro jeito.');
  }
};
