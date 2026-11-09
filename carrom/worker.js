/* Carrom AI worker: { id, s (state), level, seed, k (piece scale) } → { id, shot } (the shot it means; the hand's error is added by the page) */
importScripts('engine.js?v=5');
self.onmessage = e => {
  const d = e.data || {};
  try { if (d.k) CarromEngine.setScale(d.k); self.postMessage({ id: d.id, shot: CarromEngine.think(d.s, d.level, d.seed) }); }
  catch (err) { self.postMessage({ id: d.id, err: String(err) }); }
};
