/* Service worker de Val des Sapins : cache pour rejouer vite, et hors ligne après une première visite.
   - pages : réseau d'abord, cache en secours (hors ligne) ;
   - code (static/, noms avec empreinte) : cache d'abord ;
   - données et textures (assets/, basis/) : cache d'abord puis mise à jour en arrière-plan.
   Les artefacts claude.ai n'autorisent pas les service workers : l'enregistrement y échoue sans conséquence. */
const CACHE = 'vds-v2';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { const c = r.clone(); caches.open(CACHE).then((k) => k.put(req, c)); return r; }).catch(() => caches.match(req)));
    return;
  }
  if (/\/static\//.test(url.pathname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then((k) => k.put(req, c)); } return r; })));
    return;
  }
  if (/\/(assets|basis)\//.test(url.pathname)) {
    e.respondWith(caches.open(CACHE).then(async (k) => {
      const hit = await k.match(req);
      const net = fetch(req).then((r) => { if (r.ok) k.put(req, r.clone()); return r; }).catch(() => hit);
      if (hit) { e.waitUntil(net); return hit; }
      return net;
    }));
  }
});
