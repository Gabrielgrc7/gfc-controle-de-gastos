/* features/privacy.js
   Política de Privacidade, consentimento, baixar meus dados e excluir conta (LGPD). */

function polHTML() {
  const e = esc;
  return (
    '<h3>1. Quem é o responsável</h3><p>' +
    e(CFG.controlador) +
    '. Contato do encarregado de dados (art. 41 da LGPD): ' +
    e(CFG.contato) +
    '.</p>' +
    '<h3>2. Quais dados tratamos</h3><p>Nome, e-mail, foto de perfil (opcional), senha e PIN (guardados apenas como códigos irreversíveis), e os dados financeiros que você lança: valores, datas, descrições, categorias, forma de pagamento, receitas, cartões (nome, limite e datas), metas de economia e regras de categoria. Não pedimos CPF nem outros documentos. Faturas e extratos que você importa são lidos no seu aparelho e não são guardados: só os lançamentos que você confirmar. O modo de exemplo usa dados fictícios, não pede cadastro e apaga tudo ao sair.</p>' +
    '<h3>3. Para que usamos e base legal</h3><p>Apenas para oferecer o controle de gastos (execução do serviço, art. 7º, V) e, no caso da foto, com o seu consentimento (art. 7º, I). Não usamos seus dados para publicidade, perfilamento ou venda.</p>' +
    '<h3>4. Onde os dados ficam</h3><p>Somente no armazenamento deste navegador, neste dispositivo (um banco de dados chamado IndexedDB ou, em navegadores que não têm, o localStorage). Nada que você lança é enviado a servidores, e não usamos cookies de rastreamento, estatísticas ou serviços de terceiros. Por isso não há compartilhamento nem transferência internacional. Como em qualquer site, o serviço que hospeda os arquivos do app pode registrar o endereço IP e o horário dos acessos a esses arquivos, sem ter acesso aos seus dados. O app guarda uma cópia dos próprios arquivos no aparelho (cache) para abrir sem internet; essa cópia não contém dados pessoais. O assistente interpreta suas mensagens no próprio aparelho, sem enviá-las a serviços externos, e o histórico da conversa não é guardado.</p>' +
    '<h3>5. Por quanto tempo</h3><p>Até você excluir. Itens apagados ficam na lixeira por até 30 dias, para você poder desfazer, e depois somem sozinhos. Em Configurações, Privacidade, "Excluir conta e dados" apaga tudo na hora. Limpar os dados do navegador também apaga.</p>' +
    '<h3>6. Seus direitos (art. 18)</h3><p>Confirmação e acesso, correção, anonimização ou eliminação, portabilidade, informação sobre compartilhamento (não há), e revogação do consentimento. Você exerce tudo direto no aplicativo: baixar seus dados, editar perfil e lançamentos, excluir a conta. Também pode falar com o encarregado no contato acima.</p>' +
    '<h3>7. Segurança</h3><p>Senha protegida com PBKDF2 e sal, bloqueio temporário após tentativas erradas, sessão encerrada ao fechar a aba (ou após 15 minutos sem uso) e opção de manter conectado só se você marcar. O backup que você baixa não é criptografado: guarde com cuidado.</p>' +
    '<h3>8. Menores de idade</h3><p>O uso é destinado a maiores de 18 anos. Menores só devem usar com consentimento específico de um responsável (art. 14).</p>' +
    '<h3>9. Mudanças</h3><p>Se esta política mudar, pediremos seu aceite novamente. Versão ' +
    POLICY_V +
    '.</p>'
  );
}

function openPol() {
  $('pdBody').innerHTML = polHTML();
  $('pdV').textContent = 'Versão ' + POLICY_V;
  $('pdlg').hidden = false;
}

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-pol]')) openPol();
});

$('pdClose').onclick = () => {
  $('pdlg').hidden = true;
};

$('pdlg').addEventListener('click', (e) => {
  if (e.target === $('pdlg')) $('pdlg').hidden = true;
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') $('pdlg').hidden = true;
});

function renderPriv() {
  $('privInfo').textContent =
    cur && cur.consent
      ? 'Consentimento registrado em ' +
        new Date(cur.consent.at).toLocaleDateString('pt-BR') +
        ' (política versão ' +
        cur.consent.v +
        ').'
      : 'Consentimento ainda não registrado.';
}

$('consYes').onclick = () => {
  cur.consent = { v: POLICY_V, at: new Date().toISOString() };
  upUser((x) => {
    x.consent = cur.consent;
  });
  $('cons').hidden = true;
};

$('consNo').onclick = () => {
  $('cons').hidden = true;
  $('out').click();
};

$('myData').onclick = async () => {
  const o = {
    geradoEm: new Date().toISOString(),
    titular: {
      nome: cur.name,
      email: cur.email,
      foto: cur.avatar || null,
      consentimento: cur.consent || null,
    },
    categorias: cats,
    lancamentos: data,
    compromissos: plans,
    metas: { mensais: budgets, porCategoria: catlim },
    preferencias: prefs,
  };
  if (await saveFile('gfc-meus-dados.json', JSON.stringify(o, null, 2), $('privMsg')))
    say($('privMsg'), 'Arquivo gerado. Ele contém seus dados pessoais: guarde em local seguro.');
};

function delAccount(b) {
  if (!b.dataset.c) {
    b.dataset.c = 1;
    b.dataset.t = b.textContent;
    b.textContent = 'Clique de novo para confirmar a exclusão';
    setTimeout(() => {
      if (b.dataset.c) {
        delete b.dataset.c;
        b.textContent = b.dataset.t;
      }
    }, 4000);
    return;
  }
  delete b.dataset.c;
  b.textContent = b.dataset.t;
  WIPE.forEach((k) => storeRemove(NS + k));
  store(
    'gfc:users',
    (store('gfc:users') || []).filter((x) => x.id !== cur.id)
  );
  setSess(null);
  NS = '';
  data = [];
  budgets = {};
  catlim = {};
  plans = [];
  prefs = {};
  cats = [];
  mode = null;
  clearTimeout(idleT);
  showAuth(false);
}

$('delAcc').onclick = () => delAccount($('delAcc'));

$('delAcc2').onclick = () => delAccount($('delAcc2'));

const da0 = delAccount;

delAccount = function (b) {
  da0(b);
  accts = [];
  if (typeof aiReset === 'function') aiReset();
};
