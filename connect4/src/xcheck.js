// cross-check C solver vs engine.js on random positions: node xcheck.js N minPly maxPly seed
const E = require('/home/claude/aicoding/connect4/engine.js');
const { execFileSync } = require('child_process');
const [N, a, b, seed] = process.argv.slice(2).map(Number);
let s = (seed || 1) >>> 0; const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
const pos = [];
while (pos.length < N) {
  const len = a + Math.floor(rnd() * (b - a + 1)); let m = '';
  let ok = true;
  for (let i = 0; i < len; i++) {
    E.loadMoves(m); const leg = []; for (let c = 0; c < 7; c++) { if (!E.loadMoves(m + (c + 1))) continue; leg.push(c); }
    // avoid moves that win immediately
    const wins = new Set(E.mateList(m, 1).filter(x => x.need === 1).map(x => x.c));
    const nw = leg.filter(c => !wins.has(c));
    if (!nw.length) { ok = false; break; }
    m += nw[Math.floor(rnd() * nw.length)] + 1;
  }
  if (ok && m.length === len) pos.push(m);
}
console.error('gen done', pos.length);
const out = execFileSync('/home/claude/work/c4solve', { input: pos.join('\n') + '\n' }).toString().trim().split('\n');
let bad = 0, t = Date.now();
for (let i = 0; i < pos.length; i++) {
  const f = out[i].split(' ');
  E.loadMoves(pos[i]);
  const js = [E.solve(false)]; for (let c = 0; c < 7; c++) { E.loadMoves(pos[i]); const v = E.solveMove(c, false); js.push(v === null ? -100 : v); }
  const cc = f.slice(1).map(Number); if (i < 3) console.error(pos[i], Date.now() - t);
  if (f[1] === 'bad' || js.join() !== cc.join()) { bad++; if (bad < 5) console.log('MISMATCH', pos[i], js.join(), cc.join()); }
}
console.log('checked', pos.length, 'mismatches', bad, 'jsTime', Date.now() - t);
