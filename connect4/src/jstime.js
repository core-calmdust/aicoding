// time the JS exact decision (weak-solve moves in heuristic order until a win) on positions past the book.
// node jstime.js frontier.txt N seed maxPly  -> per-ply time distribution; plays random opponent replies
const E = require('/home/claude/aicoding/connect4/engine.js');
const fs = require('fs');
const [file, N, seed, maxPly] = [process.argv[2], +process.argv[3], +process.argv[4] || 1, +process.argv[5] || 20];
let s = seed >>> 0 || 1; const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
const fr = fs.readFileSync(file, 'utf8').trim().split('\n');
function decide(str) {
  const t0 = Date.now();
  E.loadMoves(str);
  const wins = E.mateList(str, 1).filter(x => x.need === 1);
  if (wins.length) return { c: wins[0].c, ms: 0 };
  const hr = E.heurID(42, 60); E.loadMoves(str);
  const list = hr.list.slice().sort((a, b) => b.s - a.s);
  let best = null;
  for (const e of list) { E.loadMoves(str); const v = E.solveMove(e.c, true); e.v = v; if (!best || v > best.v) best = e; if (v > 0) break; }
  return { c: best.c, v: best.v, ms: Date.now() - t0 };
}
const stat = {};
for (let g = 0; g < N; g++) {
  let m = fr[Math.floor(rnd() * fr.length)];
  while (m.length <= maxPly) {
    const d = decide(m);
    (stat[m.length] = stat[m.length] || []).push(d.ms);
    if (d.v === undefined) break;    // immediate win
    m += d.c + 1;
    const leg = []; for (let c = 0; c < 7; c++) if (E.loadMoves(m + (c + 1))) leg.push(c);
    const w = E.mateList(m, 1).filter(x => x.need === 1);
    if (w.length) break;
    const r = leg[Math.floor(rnd() * leg.length)]; m += r + 1;
  }
}
for (const k of Object.keys(stat)) { const a = stat[k].sort((x, y) => x - y); const q = p => a[Math.min(a.length - 1, Math.floor(p * a.length))];
  console.log('ply', k, 'n', a.length, 'med', q(0.5), 'p95', q(0.95), 'p99', q(0.99), 'max', a[a.length - 1]); }
