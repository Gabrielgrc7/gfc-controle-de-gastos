/* Service worker do GFC: guarda o app no aparelho para abrir sem internet.
   Não guarda nem envia dados do usuário (eles ficam só no localStorage do navegador).
   Ao mudar qualquer arquivo do app, aumente o número de V para os aparelhos pegarem a versão nova. */
const V='gfc-v3',FILES=['./','./index.html','./css/styles.css','./js/app.js','./vendor/pdf.min.js','./vendor/pdf.worker.min.js','./fonts/inter-latin-wght-normal.woff2','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
  e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});
