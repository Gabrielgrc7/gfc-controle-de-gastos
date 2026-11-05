/* features/render-hooks.js
   Ponto único que atualiza a tela atual depois de qualquer mudança. */

function viewHooks() {
  if (V === 'rel') renderRel();
  if (V === 'lanc' && S === 'comp') renderComp();
  if (V === 'config') {
    if (C === 'cats') renderCatMgr();
    if (C === 'prefs') renderPrefs();
    if (C === 'priv') renderPriv();
  }
  showInfo();
}

const vh0 = viewHooks;

viewHooks = function () {
  vh0();
  if (V === 'inicio') renderIn();
  if (V === 'config') {
    if (C === 'cards') renderCards();
    if (C === 'goals') renderGoals();
    if (C === 'rules') renderRules();
    if (C === 'dados') renderTrash();
  }
};

const vh1 = viewHooks;

viewHooks = function () {
  vh1();
  $('heroL').textContent = 'Total gasto em ' + $('mLabel').textContent;
  if (V === 'agenda') renderAgenda();
};

const vh6 = viewHooks;

viewHooks = function () {
  vh6();
  if (V === 'inicio') renderOnb();
  renderBackupNudge();
  if (V === 'config' && C === 'dados') renderStor();
  document.body.classList.toggle('selmode', !!mode && V === 'lanc' && S === 'hist');
  if (V === 'config' && C === 'accts') renderAccts();
  if (V === 'config' && C === 'seg') renderPin();
};
