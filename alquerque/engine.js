// Alquerque's engine worker (2026-11-20): Fanorona's engine (../fanorona/engine.js) started from this folder. A worker's script
// is matched to the service worker by its own URL, so a script in ../fanorona/ got no COOP / COEP headers from alquerque/sw.js
// (shared/mt-sw.js, the multithreading option's COOP mode) and the browser blocked it — no AI at all. The engine reads its files
// (wasm, endgame tables, net) from FANORONA_BASE. The query (?v=…&g=alq[&mt=1]) goes along: the same version, the same cache.
self.FANORONA_BASE = '../fanorona/';
importScripts('../fanorona/engine.js' + self.location.search);
