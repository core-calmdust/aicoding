// Connect Four page: makes the page cross-origin isolated for the shared transposition table of the multi-threaded search
// (shared/mtsplit.js shared mode, shared/mt-sw.js). No offline cache.
importScripts('../shared/mt-sw.js?v=3');
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => { MTSW.handle(e, null); });
