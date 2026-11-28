#!/usr/bin/env node
// The opponent's best answer to every move in the shogi lesson problems (2026-11-22 ユーザー：「AIの評価が下がるから」ではなく、
// その手でどういう理由で不利になるかを解説する). For each "best" problem of shogi/lessons.json,
// every legal move is played and the engine finds the opponent's reply; atlas/lessons3d.js (shNgJa) then says what that reply
// does on the board: takes the piece you moved / a piece that was left attacked, mates, checks, promotes …
//   node shogi/tools/lesson-replies.js [--ms 120] [--depth 5]  →  shogi/lesson-replies.json
// Format: { "<grade>/<problem index>": { "<usi>": ["<reply usi>", <score for the mover after the reply, centipawns; ±30000 = mate>] } }
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? +args[i + 1] : d; };
const MS = opt('--ms', 120), DEPTH = opt('--depth', 5);
const ROOT = path.resolve(__dirname, '..');
const out = {};
function replies(sfen, quick) {
  const p = new E.Position(); p.setSfen(sfen);
  const o = {};
  for (const m of p.legalMoves(true)) {
    const u = p.toUsi(m), q = new E.Position(); q.setSfen(sfen); q.doMove(q.fromUsi(u));
    if (!q.legalMoves(true).length) { o[u] = ['', 30000]; continue; }   // (mate: no reply)
    const s = new E.Searcher(q), r = s.rootSearch(quick ? { depth: 3, time: 40 } : { depth: DEPTH, time: MS });
    if (!r || !r.move) continue;
    const sc = Math.max(-30000, Math.min(30000, -r.score));
    o[u] = [q.toUsi(r.move), Math.abs(sc) >= E.MATE - 300 ? Math.sign(sc) * 30000 : Math.round(sc)];
  }
  return o;
}
const L = JSON.parse(fs.readFileSync(path.join(ROOT, 'lessons.json'), 'utf8'));
let n = 0; const t0 = Date.now();
for (const g of L.grades) g.problems.forEach((p, i) => {
  if (p.kind !== 'best' || p.src === 'fork' || p.src === 'deep') return;   // (k5 and k1 say the opponent's reply from P.rep: set-fork.js / set-deep.js)
  out[g.id + '/' + i] = replies(p.sfen); n++;
  process.stderr.write(`\r${n} positions, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
});
process.stderr.write('\n');
fs.writeFileSync(path.join(ROOT, 'lesson-replies.json'), JSON.stringify(out));
console.log(`${n} positions → shogi/lesson-replies.json (${(fs.statSync(path.join(ROOT, 'lesson-replies.json')).size / 1024).toFixed(0)} KB)`);
