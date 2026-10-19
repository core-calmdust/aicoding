// derive "opened loop, 4 boxes left" decision positions (loopdec) from loony-start candidates that contain loops.
'use strict';
const L = require('./lib.js'), { E } = L;
const fs = require('fs');
const n = +process.argv[2];
const OUT = `${L.CK}/cand_${n}.jsonl`;
const cands = L.readJsonl(OUT);
const seen = new Set(cands.map(c => c.edges.join(',')));
const native = new L.Native(n);
const G = E.geom(n, n);
(async () => {
  let added = 0;
  for (const c of cands) {
    if (!c.kinds.some(k => k === 'loopopen' || k === 'count' || k === 'count_easy' || k === 'chain' || k === 'hard')) continue;
    const p = E.Pos.from(G, c.edges), comps = E.components(p, true);
    for (const C of comps.filter(x => x.loop && x.n >= 4)) {
      // open the loop at one of its edges, then the opponent takes all but four
      const q = p.clone(), owners = c.owners.map(o => o < 0 ? -1 : 1 - o);   // after the opening move the other player is to move
      const b0 = C.boxes[0]; let e0 = -1;
      for (let i = b0 * 4; i < b0 * 4 + 4; i++) { const e = G.be[i]; if (!q.drawn[e] && q.other(e, b0) >= 0) { e0 = e; break; } }
      if (e0 < 0) continue;
      q.play(e0);
      let left = C.n, ok = true;
      while (left > 4) {
        let e = -1; for (let b = 0; b < G.B; b++) if (q.cnt[b] === 3 && C.boxes.includes(b)) { e = q.missing(b, -1); break; }
        if (e < 0) { ok = false; break; }
        const before = q.filled; q.play(e); const k = q.filled - before;
        for (const b of [G.eb0[e], G.eb1[e]]) if (b >= 0 && q.cnt[b] === 4 && owners[b] < 0) owners[b] = 0;
        left -= k;
      }
      if (!ok || left !== 4) continue;
      const edges = q.edges(), key = edges.join(','); if (seen.has(key)) continue;
      const sol = native ? await native.solve(edges) : L.jsSolve(n, edges, 8000); if (!sol) continue;
      const cm = E.captureMoves(q); if (cm.forced !== undefined) continue;
      const vOf = new Map(sol.vals), cand = cm.moves.concat(cm.declines), cv = cand.map(e => vOf.get(e)), top = Math.max(...cv);
      const best = L.bestSet(sol.vals);
      if (cv.filter(x => x === top).length !== 1 || !best.every(e => cand.includes(e))) continue;
      const decl = cm.declines.includes(best[0]);
      seen.add(key); added++;
      L.appendLine(OUT, { n, edges, owners, ply: edges.length, kinds: ['loopdec', decl ? 'ctl_decline' : 'ctl_take'], v: sol.v, vals: sol.vals, derived: 1 });
      break;
    }
  }
  console.log('n', n, 'added', added);
  if (native) native.close();
})();
