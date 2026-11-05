/* main.js
   Início do app: abre o banco de dados do aparelho, aplica o tema salvo e entra direto se houver sessão. */

storeInit().then(() => {
  storeKeys('u:demo:').forEach(storeRemove);
  setTheme(store('gfc:theme') || 'dark');
  chartT = store('gfc:chart') || 'rosca';
  const id = getSess(),
    u = (store('gfc:users') || []).find((x) => x.id === id);
  u ? ((restoring = true), enter(u), (restoring = false)) : showAuth(false);
});
