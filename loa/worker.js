// ラインズ・オブ・アクション — the AI runs here so the page never freezes. One message in, one message out (LoaEngine.job).
'use strict';
importScripts('engine.js?v=1');
self.onmessage = e => { let r; try { r = self.LoaEngine.job(e.data); } catch (err) { r = { id: e.data.id, error: String(err) }; } self.postMessage(r); };
