// 海戦ゲーム — 先読み AI (Lv.19–20) off the main thread, so the page stays smooth while it thinks.
// The page sends { engine: <engine.js URL with its ?v=>, st, level, id } and gets back { id, a } (the move).
let loaded = '';
self.onmessage = e => {
  const { engine, st, level, id } = e.data;
  try {
    if (loaded !== engine) { importScripts(engine); loaded = engine; }
    self.postMessage({ id, a: self.SeaEngine.planAction(st, level, Math.random, () => performance.now()) });
  } catch (err) { self.postMessage({ id, a: null, err: String(err) }); }
};
