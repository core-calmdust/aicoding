// Chess page: makes the page cross-origin isolated for the multi-threaded search (see shared/mt-sw.js). No offline cache.
// (pro/ has its own worker, pro/coi-sw.js, with the more specific scope.)
importScripts('../shared/mt-sw.js?v=2');
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => { MTSW.handle(e, null); });
