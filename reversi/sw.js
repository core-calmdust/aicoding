// Offline support (bump CACHE when data files change): page and scripts are network-first (so updates arrive), large data files cache-first.
// Also makes the page cross-origin isolated for the multi-threaded search (shared/mt-sw.js: Document-Isolation-Policy, or
// COOP / COEP when the option "マルチスレッド" asks for it). (pro/ has its own worker, pro/coi-sw.js, with the more specific scope.)
importScripts('../shared/mt-sw.js?v=1');
const CACHE = 'reversi-v4-56';
const CORE = ['./', 'index.html', 'i18n.js', 'engine.js', 'engine-wasm.js', 'online.js', 'rbox.js', 'firebase-config.js', '../shared/onlinesec.js', 'manifest.webmanifest', 'icon-192.png', '../shared/pzbook.js', '../shared/rulesoffer.js', '../shared/headerbar.js', '../shared/tick.js', '../shared/ruletour.js', '../shared/resign.js', '../shared/mtengine.js', 'mt-worker.js'];
const DATA = ['weights.bin.gz', 'weights.json', 'book.json', 'lessons.json', 'puzzles.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.concat(DATA))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k.startsWith('reversi-')).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
function own(req) {   // same-origin GET: the offline cache
  const url = new URL(req.url);
  const isData = DATA.some(d => url.pathname.endsWith('/' + d));
  if (isData) return caches.open(CACHE).then(async c => (await c.match(req, { ignoreSearch: true })) || fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }));
  return fetch(req).then(r => { if (r.ok) { const cl = r.clone(); caches.open(CACHE).then(c => c.put(req, cl)); } return r; }).catch(() => caches.match(req, { ignoreSearch: true }));
}
self.addEventListener('fetch', e => { MTSW.handle(e, own); });
