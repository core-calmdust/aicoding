// Service-worker part of the main pages' multi-threaded search (shared/mtengine.js is the page part).
// Loaded with importScripts() by a game folder's sw.js (chess/sw.js, shogi/sw.js, reversi/sw.js); the scope is that folder.
// SharedArrayBuffer needs a cross-origin isolated page, and GitHub Pages cannot send headers, so the worker adds them:
//  • normally: `Document-Isolation-Policy: isolate-and-credentialless` on the page itself (navigation responses only).
//    Chrome / Edge (desktop) then isolate the page WITHOUT COOP — popups (Google sign-in) and online play keep working;
//    other browsers ignore the header (one thread, unless the option below is on).
//  • the option "マルチスレッド" turned on in a browser without that header (Safari, Firefox, …): COOP / COEP on every
//    response of the pages in this scope (as pro/coi-sw.js does), cross-origin files fetched in CORS mode without cookies.
//    The page then has no Google sign-in / online play (the page hides them). The flag is an entry in the Cache API
//    (cache FLAG_CACHE, key <scope>?mt-coi), written and removed by the page.
// Use:  importScripts('../shared/mt-sw.js?v=1');
//       self.addEventListener('fetch', e => { if (MTSW.handle(e, ownHandler)) return; … });
//   ownHandler(request) → a Promise<Response> for the same-origin requests it serves itself (cache), or null (network).
(() => {
  const FLAG_CACHE = 'aicoding-mt-flag';
  const flagKey = () => self.registration.scope + '?mt-coi';
  const byClient = new Map();   // client id → COOP mode at its navigation (lost when the worker restarts: then the flag is read again)
  async function flag() { try { const c = await caches.open(FLAG_CACHE); return !!(await c.match(flagKey())); } catch (e) { return false; } }
  // the flag, read once when the worker starts (and again after the page changed it): requests of a normal page then pass
  // straight through without waiting for the Cache API — on iOS a slow pass-through delayed Firebase's sign-in setup so the
  // Google popup was blocked
  let FLAG = null;
  const readFlag = () => flag().then(v => (FLAG = v));
  readFlag();
  // Document-Isolation-Policy only matters in Chromium (Chrome / Edge); elsewhere a normal page is left alone entirely
  const DIP_UA = !!(self.navigator && (self.navigator.userAgentData || /\bChrome\/\d/.test(self.navigator.userAgent || '')));   // (Chrome / Edge; userAgentData alone is not there in every service worker — then no header was added at all)
  function withHeaders(res, set) {
    if (!res || res.status === 0 || res.type === 'opaqueredirect') return res;   // opaque: nothing can be added
    const h = new Headers(res.headers);
    for (const k in set) h.set(k, set[k]);
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
  }
  const COI = { 'Cross-Origin-Embedder-Policy': 'require-corp', 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Resource-Policy': 'cross-origin' };
  const DIP = { 'Document-Isolation-Policy': 'isolate-and-credentialless' };
  // COOP mode: every response gets the headers; a cross-origin file asked for without CORS (fonts' CSS, scripts, images)
  // is fetched in CORS mode without cookies, so it can be marked as allowed (servers without CORS: the plain answer, blocked)
  async function coiFetch(req, own) {
    const url = new URL(req.url);
    if (url.origin !== location.origin && req.mode === 'no-cors') {
      try { const r = await fetch(new Request(req.url, { mode: 'cors', credentials: 'omit', referrer: req.referrer || '' })); if (r.ok) return withHeaders(r, COI); } catch (e) {}
      return fetch(req);
    }
    const p = (url.origin === location.origin && own && own(req)) || fetch(req);
    return withHeaders(await p, COI);
  }
  function handle(e, own) {
    const req = e.request;
    if (req.cache === 'only-if-cached' && req.mode !== 'same-origin') return false;
    if (req.method !== 'GET') return false;
    if (req.mode === 'navigate') {
      e.respondWith((async () => {
        const coi = await readFlag();   // (fresh at every navigation: the page may have changed it through another worker instance)
        if (e.resultingClientId) byClient.set(e.resultingClientId, coi);
        if (coi) return coiFetch(req, own);
        const res = await ((own && own(req)) || fetch(req));
        return DIP_UA ? withHeaders(res, DIP) : res;
      })().catch(err => { console.error(err); return fetch(req); }));
      return true;
    }
    const known = byClient.has(e.clientId) ? byClient.get(e.clientId) : FLAG === false ? false : undefined;   // (the flag off: every page is normal)
    if (known === false) {   // a normal page: only the game's own cache handling (if any)
      const p = new URL(req.url).origin === location.origin && own && own(req);
      if (p) { e.respondWith(p); return true; }
      return false;
    }
    e.respondWith((async () => {
      const coi = known === true || (known === undefined && await flag());
      if (coi) return coiFetch(req, own);
      return (new URL(req.url).origin === location.origin && own && own(req)) || fetch(req);
    })().catch(err => { console.error(err); return Response.error(); }));
    return true;
  }
  self.addEventListener('message', e => {   // the page: "forget the clients' modes" after it changed the flag
    if (e.data && e.data.type === 'mt-flag') { byClient.clear(); FLAG = null; e.waitUntil(readFlag()); }
    if (e.data && e.data.type === 'mt-ping' && e.source) e.source.postMessage({ type: 'mt-pong', nav: byClient.has(e.source.id) });   // (the page: "did my page come through this worker?")
  });
  self.MTSW = { handle, flag, FLAG_CACHE };
})();
