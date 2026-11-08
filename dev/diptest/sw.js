// test: Document-Isolation-Policy added by a service worker to the page (navigation) — nothing else
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).then(r => { const h = new Headers(r.headers); h.set('Document-Isolation-Policy', 'isolate-and-credentialless'); return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h }); }));
});
self.addEventListener('message', e => { if (e.source) e.source.postMessage({ uad: !!self.navigator.userAgentData, ua: self.navigator.userAgent }); });
