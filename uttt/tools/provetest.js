// The prover (core prove_moves) against a plain JS search on random positions (std and r111)
const E = require('../engine.js');
function winW(p, k, me) { for (const m of p.moves()) { const q = p.clone().play(m); if (q.res === me) return true; if (q.res < 0 && k > 1 && winB(q, k - 1, me)) return true; } return false; }
function winB(p, k, me) { const ms = p.moves(); if (!ms.length) return false; for (const m of ms) { const q = p.clone().play(m); if (q.res >= 0) { if (q.res !== me) return false; continue; } if (!winW(q, k, me)) return false; } return true; }
let checked = 0, pos = 0;
for (const rk of ['std', 'r111', 'r100']) {
  E.setRule(rk);
  for (let g = 0; g < 150; g++) {
    const p = E.Pos.from(null); const stop = 30 + Math.floor(Math.random() * 30);
    while (p.res < 0 && p.ply < stop) { const ms = p.moves(); p.play(ms[Math.floor(Math.random() * ms.length)]); }
    if (p.res >= 0) continue;
    const k = p.moves().length > 20 ? 1 : 2;
    const me = p.turn, js = p.moves().filter(m => { const q = p.clone().play(m); return q.res === me || (q.res < 0 && k > 1 && winB(q, k - 1, me)); });
    const c = E.duelGood(p.spec(), [], k);
    if (js.sort().join() !== c.sort().join()) throw new Error(rk + ' differs ' + js + ' / ' + c + ' ' + JSON.stringify(p.spec()));
    checked++; if (js.length) pos++;
  }
}
console.log('prover ok', checked, 'positions,', pos, 'with a win');
// speed
E.setRule('std');
const p = E.Pos.from(null); p.play(40); p.play(36);
let t = Date.now(); const r = E.bestMove(p, 60, 2000, 0); console.log('ab 2s depth', r.depth, 'nodes', E.nodes, 'kn/s', Math.round(E.nodes / (Date.now() - t)));
t = Date.now(); const mc = E.mcts(p, 2000, 0); console.log('mcts 2s iters', mc.iters, 'move', E.sqName(mc.move), 'wr', mc.wr);
