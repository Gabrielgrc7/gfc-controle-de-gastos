/* features/pwa.js
   Registra o service worker (app instalável e que abre sem internet) quando o site é servido por HTTPS (ou em localhost, para testar o modo offline no computador). */
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(function () {});
}
