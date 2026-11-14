/* ludo/worker.js — the threads (../shared/mtworkers.js, ludo/mt.js): rollouts with the Lv.20 policy, one task per message.
   { id, type:'wp', state, team, seed, count, plies } → { id, sum }  (E.wpTask: `count` playouts to the end → the wins of team)
     (each: true → { id, vals }: the result of every playout, for the page to add up in order — the same sum as one task)
   { id, type:'ping' } → { id } */
importScripts('engine.js?v=4');
const E = self.LudoEngine;
self.onmessage = e => {
  const d = e.data || {};
  try {
    if (d.type === 'wp' && d.each) { const vals = []; for (let i = 0; i < d.count; i++) vals.push(E.wpTask(d.state, d.team, d.seed + i, 1, d.plies)); postMessage({ id: d.id, vals }); }
    else if (d.type === 'wp') postMessage({ id: d.id, sum: E.wpTask(d.state, d.team, d.seed, d.count, d.plies) });
    else postMessage({ id: d.id });
  } catch (err) { postMessage({ id: d.id, error: String(err) }); }
};
