/* Futebol de botão AI worker: { id, s (state), level, seed, keeper: side | place: true } → { id, move } (the move it means; the hand's error is added by the page) */
importScripts('engine.js?v=16');
self.onmessage = e => {
  const d = e.data || {};
  try {
    if (d.place) self.postMessage({ id: d.id, move: BotaoEngine.placeFor(d.s, d.level, d.seed) });
    else if (d.keeper != null) self.postMessage({ id: d.id, move: BotaoEngine.keeperFor(d.s, d.keeper, d.level, d.seed) });
    else self.postMessage({ id: d.id, move: BotaoEngine.think(d.s, d.level, d.seed) });
  } catch (err) { self.postMessage({ id: d.id, err: String(err) }); }
};
