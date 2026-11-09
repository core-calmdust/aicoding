/* Crokinole AI worker: { id, s (state), level, seed } → { id, shot } (the shot it means; the hand's error is added by the page) */
importScripts('engine.js?v=1');
self.onmessage = e => {
  const d = e.data || {};
  try { self.postMessage({ id: d.id, shot: CrokinoleEngine.think(d.s, d.level, d.seed) }); }
  catch (err) { self.postMessage({ id: d.id, err: String(err) }); }
};
