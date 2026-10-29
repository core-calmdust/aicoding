/* ポーカー — equity / coach worker (poker/worker.js): keeps the page smooth while thousands of deals are simulated */
importScripts('engine.js?v=2', 'pre.js?v=1', 'equity.js?v=3');
self.onmessage = e => {
  const d = e.data;
  try {
    if (d.cmd === 'coach') self.postMessage({ id: d.id, r: PKE.coach(d.T, d.s, d.iters) });
    else if (d.cmd === 'equity') self.postMessage({ id: d.id, r: PKE.equity(d.spec) });
  } catch (err) { self.postMessage({ id: d.id, err: String(err) }); }
};
