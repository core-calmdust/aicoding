// Dots and Boxes page: makes the page cross-origin isolated for the shared table of the exact solver (the analysis on several workers)
// (shared/mtworkers.js shared mode, shared/mt-sw.js). No offline cache.
importScripts('../shared/mt-sw.js?v=3');
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => { MTSW.handle(e, null); });
