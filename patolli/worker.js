/* patolli/worker.js — エンジンを別スレッドで動かす（AIの手、ヒント、対局後の振り返り）。
   受け取る形：{ id, type:'think', state, n, level, cfg? }   → { id, move:{from,to}|null }   cfg＝PROモード { d, temp }（Lv.20 に重ねる）
               { id, type:'eval', state, n, d }              → { id, ev:[{ from, to, wp }] }  全部の手の勝率（良い順、d 投げ先）
               { id, type:'review', list:[{ state, n }] }    → { id, type:'progress', i, res } … { id, done:true }
                 res = { ev:[{ from, to, wp }], wp0 }（wp0＝投げる前の手番側の勝率） */
importScripts('engine.js?v=1');
const E = self.PatolliEngine;
const pack = l => l.map(x => ({ from: x.move.from, to: x.move.to, wp: x.wp }));
self.onmessage = e => {
  const d = e.data || {};
  try {
    if (d.type === 'think') {
      const m = d.cfg ? E.think(d.state, d.n, 20, { d: Math.max(0, Math.min(3, d.cfg.d | 0)), temp: d.cfg.temp }) : E.think(d.state, d.n, d.level);
      postMessage({ id: d.id, move: m ? { from: m.from, to: m.to } : null });
    } else if (d.type === 'eval') postMessage({ id: d.id, ev: d.n ? pack(E.evaluate(d.state, d.n, d.d == null ? 2 : d.d)) : [] });
    else if (d.type === 'review') {
      d.list.forEach((q, i) => postMessage({ id: d.id, type: 'progress', i, res: { ev: q.n ? pack(E.evaluate(q.state, q.n, 2)) : [], wp0: E.winProb(q.state, 1) } }));
      postMessage({ id: d.id, done: true });
    }
  } catch (err) { postMessage({ id: d.id, error: String(err) }); }
};
