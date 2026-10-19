// 3x3 opening lines from the exact solver. Both sides always play an optimal move; the side to move picks,
// among its optimal moves, the one that leaves the opponent the fewest optimal replies (the sharpest line).
// usage: node op3.js  -> CK/op3.json
'use strict';
const L = require('./lib.js'), { E } = L;
const G = E.geom(3, 3);
const N = new L.Native(3);
const memo = new Map();
async function sol(edges) { const k = edges.slice().sort((a, b) => a - b).join(','); if (!memo.has(k)) memo.set(k, await N.solve(edges)); return memo.get(k); }
const K64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const encVals = vals => { const a = new Array(G.E).fill('.'); for (const [e, v] of vals) a[e] = K64[v + 30]; return a.join(''); };
// first-move classes: A outer edge at a corner box, B outer edge in the middle, C inner edge at the border, D edge of the centre box
const FIRST = { A: 0, B: 1, C: 3, D: 4 };
async function frac(edges, e) {   // fraction of optimal replies after e
  const p = E.Pos.from(G, edges.concat([e])); if (!p.undrawn) return 1;
  const s = await sol(edges.concat([e])); return L.bestSet(s.vals).length / s.vals.length;
}
async function extend(prefix) {
  const edges = prefix.slice(), p = E.Pos.from(G, edges);
  while (p.undrawn > 0) {
    const s = await sol(edges), best = L.bestSet(s.vals);
    let e;
    const caps = best.filter(x => p.completes(x) > 0);
    if (caps.length) e = caps[0];
    else {
      let bf = 2;
      for (const x of best) { const f = await frac(edges, x) + (p.gives(x) ? 0.5 : 0); if (f < bf - 1e-9) { bf = f; e = x; } }
    }
    edges.push(e); p.play(e);
  }
  return edges;
}
(async () => {
  const lines = [];
  for (const [cls, e0] of Object.entries(FIRST)) {
    const s1 = await sol([e0]);
    // distinct optimal replies up to the symmetries that fix e0
    const fix = G.perms.filter(pm => pm[e0] === e0);
    const reps = new Map();
    for (const [e, v] of s1.vals) { if (v !== Math.max(...s1.vals.map(x => x[1]))) continue; const k = Math.min(...fix.map(pm => pm[e])); if (!reps.has(k)) reps.set(k, e); }
    const bad = s1.vals.filter(x => x[1] < Math.max(...s1.vals.map(y => y[1]))).length;
    lines.push({ cls, e0, nOpt: reps.size, nBadReplies: bad, replies: [...reps.values()] });
  }
  console.log(JSON.stringify(lines.map(l => [l.cls, l.nOpt, l.nBadReplies, l.replies])));
  const out = [];
  for (const l of lines) {
    for (const r of l.replies) {
      const mv = await extend([l.e0, r]);
      const plies = [];
      const p = new E.Pos(G); let turn = 0; const sc = [0, 0];
      for (let i = 0; i < mv.length; i++) {
        const s = await sol(mv.slice(0, i)), best = L.bestSet(s.vals);
        plies.push({ v: encVals(s.vals), nb: best.length, nl: s.vals.length, safe: p.legal().filter(e => p.gives(e) === 0 && p.completes(e) === 0).length, turn });
        const k = p.play(mv[i]); sc[turn] += k; if (!k) turn ^= 1;
      }
      out.push({ cls: l.cls, moves: mv, plies, final: sc });
    }
  }
  L.atomicWrite(`${L.CK}/op3.json`, JSON.stringify(out));
  console.log('lines', out.length, out.map(o => o.cls + ':' + o.moves.slice(0, 4).join(',') + ' -> ' + o.final.join('-')).join(' | '));
  N.close();
})();
