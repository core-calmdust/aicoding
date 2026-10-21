// Offline support (bump CACHE when data files change): page and scripts are network-first (so updates arrive), large data files cache-first.
const CACHE = 'reversi-v4-37x';
const CORE = ['./', 'index.html', 'i18n.js', 'engine.js', 'online.js', 'firebase-config.js', 'manifest.webmanifest', 'icon-192.png', '../shared/pzbook.js', '../shared/rulesoffer.js', '../shared/headerbar.js', '../shared/tick.js', '../shared/ruletour.js'];
const DATA = ['weights.bin.gz', 'weights.json', 'book.json', 'lessons.json', 'puzzles.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.concat(DATA))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const isData = DATA.some(d => url.pathname.endsWith('/' + d));
  if (isData) {
    e.respondWith(caches.open(CACHE).then(async c => (await c.match(e.request, { ignoreSearch: true })) || fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; })));
  } else {
    e.respondWith(fetch(e.request).then(r => { if (r.ok) { const cl = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cl)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
  }
});
