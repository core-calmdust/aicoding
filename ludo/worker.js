/* ludo/worker.js — the threads (../shared/mtworkers.js, ludo/mt.js): rollouts with the Lv.20 policy, one task per message.
   { id, type:'wp', state, team, seed, count, plies } → { id, sum }  (E.wpTask: `count` playouts to the end → the wins of team)
   { id, type:'ping' } → { id } */
importScripts('engine.js?v=3');
const E = self.LudoEngine;
self.onmessage = e => {
  const d = e.data || {};
  try {
    if (d.type === 'wp') postMessage({ id: d.id, sum: E.wpTask(d.state, d.team, d.seed, d.count, d.plies) });
    else postMessage({ id: d.id });
  } catch (err) { postMessage({ id: d.id, error: String(err) }); }
};
