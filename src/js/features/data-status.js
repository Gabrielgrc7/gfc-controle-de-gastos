/* features/data-status.js
   Mostra onde os dados ficam (e quanto espaço usam), avisa quando não foi possível salvar e lembra de fazer backup. */

$('saveWarnBtn').onclick = () => {
  if (cur && !$('app').hidden) $('bkExp').click();
  else $('saveWarnTx').textContent = 'Entre na sua conta para baixar o backup.';
};

const markBackup = () => {
  prefs.lastBackup = Date.now();
  store('gastos:prefs', prefs);
  renderBackupNudge();
};

async function renderStor() {
  const i = await storageInfo();
  const where = {
    idb: 'banco de dados do navegador (IndexedDB)',
    local: 'armazenamento simples do navegador (localStorage)',
    memory: 'memória, de forma temporária: os dados somem ao fechar a página',
  }[i.mode];
  const mb = (n) => (n / 1048576).toFixed(n < 10485760 ? 2 : 1).replace('.', ',') + ' MB';
  let h = 'Seus dados ficam <b>só neste aparelho</b>, no ' + where + '. Nada é enviado para a internet.';
  if (i.usage != null)
    h +=
      '<br>Espaço usado pelo app: ' +
      mb(i.usage) +
      (i.quota ? ' de cerca de ' + mb(i.quota) + ' disponíveis' : '') +
      '.';
  if (i.persisted !== null)
    h +=
      '<br>Proteção contra limpeza automática: ' +
      (i.persisted
        ? '<b>ativa</b>.'
        : '<b>não ativa</b>. Se o aparelho ficar sem espaço, o navegador pode apagar os dados. Faça backup.');
  h +=
    '<br>Último backup: ' +
    (prefs.lastBackup ? new Date(prefs.lastBackup).toLocaleDateString('pt-BR') : '<b>nenhum ainda</b>') +
    '.';
  $('storInfo').innerHTML = h;
}

/* lembrete no Início: só para quem já tem lançamentos, sem backup recente, e que pode ser adiado */
function renderBackupNudge() {
  const last = prefs.lastBackup || 0,
    now = Date.now();
  const show =
    !!cur &&
    !cur.demo &&
    V === 'inicio' &&
    data.length >= 15 &&
    now - last > 30 * 864e5 &&
    now > (prefs.bkSnooze || 0);
  $('bkNudge').hidden = !show;
  if (show)
    $('bkNudgeTx').textContent = last
      ? 'Seu último backup foi há mais de 30 dias.'
      : 'Você ainda não fez backup. Seus dados só existem neste aparelho.';
}
$('bkNudgeGo').onclick = () => $('bkExp').click();
$('bkNudgeLater').onclick = () => {
  prefs.bkSnooze = Date.now() + 14 * 864e5;
  store('gastos:prefs', prefs);
  renderBackupNudge();
};
