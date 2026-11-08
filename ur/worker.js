/* ur/worker.js — runs the engine off the main thread (AI moves, the post-game review).
   messages: { id, type:'think', state, n, level }          → { id, move }
             { id, type:'review', list:[{ state, n }] }      → { id, type:'progress', i, res } … { id, done:true }
               res = { ev:[{ from, to, wp }], wp0 }  (ev: every legal move, best first; wp0: the mover's win chance before rolling)
   the threads (../shared/mtworkers.js, one task per message):
             { id, type:'roll', state, n, d, k? }           → { id, v }   (E.rollTask: one move × one throw [× one move: k] of E.splitEval)
             { id, type:'review1', state, n }               → { id, res }  (one position of the review) */
importScripts('engine.js?v=4');
const E = self.UrEngine;
self.onmessage = e => {
  const d = e.data || {};
  try {
    if (d.type === 'roll') postMessage({ id: d.id, v: E.rollTask(d.state, d.n, d.d, d.k) });
    else if (d.type === 'review1') {
      const ev = d.n ? E.evaluate(d.state, d.n, { depth: 2 }).map(x => ({ from: x.move.from, to: x.move.to, wp: x.wp })) : [];
      postMessage({ id: d.id, res: { ev, wp0: E.winProb(d.state, { depth: 1 }) } });
    } else if (d.type === 'think') {
      const m = E.think(d.state, d.n, d.level, {});
      postMessage({ id: d.id, move: m ? { from: m.from, to: m.to } : null });
    } else if (d.type === 'review') {
      d.list.forEach((q, i) => {
        const ev = q.n ? E.evaluate(q.state, q.n, { depth: 2 }).map(x => ({ from: x.move.from, to: x.move.to, wp: x.wp })) : [];
        postMessage({ id: d.id, type: 'progress', i, res: { ev, wp0: E.winProb(q.state, { depth: 1 }) } });
      });
      postMessage({ id: d.id, done: true });
    }
  } catch (err) { postMessage({ id: d.id, error: String(err) }); }
};
