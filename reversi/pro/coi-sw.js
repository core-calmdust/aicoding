// Makes this folder's page "cross-origin isolated" (SharedArrayBuffer, needed for the multi-thread engine): GitHub Pages
// cannot send the COOP / COEP headers, so this service worker adds them to every response the page gets.
// Scope: only reversi/pro/ (more specific than reversi/sw.js, so it takes over here) — the other pages (online play, sign-in) are not affected.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.cache === 'only-if-cached' && r.mode !== 'same-origin') return;
  e.respondWith(fetch(r).then(res => {
    if (res.status === 0) return res;   // opaque: nothing to change
    const h = new Headers(res.headers);
    h.set('Cross-Origin-Embedder-Policy', 'require-corp');
    h.set('Cross-Origin-Opener-Policy', 'same-origin');
    h.set('Cross-Origin-Resource-Policy', 'cross-origin');
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
  }).catch(err => { console.error(err); return Response.error(); }));
});
