/* AI worker: {id, s, lv, seed} -> {id, action, scores} */
importScripts('engine.js?v=3', 'ai.js?v=3');
self.onmessage = e => {
  const { id, s, lv, seed } = e.data;
  try {
    const r = self.HFAI.choose(s, lv, seed);
    self.postMessage({ id, action: r.action, scores: r.scores });
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
