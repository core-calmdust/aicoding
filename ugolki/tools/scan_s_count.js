// (2026-11-25 担当D) Scan for the strategy lesson s_count (read the race) under claude/lesson-quality.md: self-play endgames of
// classic ugolki (c33), White to move, no piece at home, White's solo count (Black frozen; tools/lesson-verify-ugolki-ls.js
// deepDist) within 1 of Black's. For every legal move u: ws = 1 + White's fewest moves to fill its corner, bs = Black's fewest
// (White frozen, colours swapped). By count White wins iff bs > ws. A candidate: 1–3 moves win by count (at most a third of
// 12+ legal moves), a wrong move as fast for White as the answer (the trap: only Black's count tells), and the exact two-player
// solver (engine duelGood) agrees with the count set. 2026-11-25 06:02 run: 1061 positions (ws0 2–8) → 0 candidates
// (ok0 710, ok>3 201, no trap 146): in these endgames a move as fast for White never hands Black a shorter road.
// Usage: node ugolki/tools/scan_s_count.js gen <seed> <seconds> [wide]  → g<seed>.txt (one spec per line)
//        node ugolki/tools/scan_s_count.js scan <file> [k m]             → candidates on stdout, the counts of failures on stderr
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const E = require('../engine.js'); E.setRule('c33');
const V = require(path.join(ROOT, 'tools/lesson-verify-ugolki-ls.js'));
const real = p => p.moves().filter(m => m !== E.PASS);
const swapPos = q => E.Pos.from({ b: V.symB(q.spec().b, V.SYM[2][0], true), side: 1, n: q.ply });
const [cmd, a1, a2, a3] = process.argv.slice(2);
if (cmd === 'gen') {
  let seed = +a1; const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const wide = a3 === 'wide', out = fs.openSync('g' + a1 + '.txt', 'a'), T0 = Date.now();
  while (Date.now() - T0 < (+a2 || 600) * 1000) {
    const mv = [], lv = [2 + Math.floor(rand() * 6), 2 + Math.floor(rand() * 6)], noise = 0.05 + rand() * 0.2;
    for (let i = 0; i < 170; i++) {
      const { pos, hashes } = E.replay(null, mv); if (E.judge(pos, hashes).over) break;
      if (pos.side === 0 && !pos.inHome(1) && !pos.inHome(2) && pos.ply <= 130) {
        const o1 = pos.count(1) - pos.inTarget(1);
        if (wide ? o1 >= 3 && o1 <= 7 : o1 >= 2 && o1 <= 5) { const ws0 = V.deepDist(pos, wide ? 9 : 7); if (wide ? ws0 >= 6 && ws0 <= 8 : ws0 <= 6) { const bs0 = V.deepDist(swapPos(pos), wide ? 10 : 8); if (Math.abs(bs0 - ws0) <= 1) fs.writeSync(out, JSON.stringify(pos.spec()) + '\n'); } }
      }
      const L = real(pos); const m = rand() < noise ? L[Math.floor(rand() * L.length)] : E.think(null, mv, lv[pos.side], rand).move; if (m == null || m < 0) break; mv.push(m);
    }
  }
} else if (cmd === 'scan') {
  const ALL = fs.readFileSync(a1, 'utf8').trim().split('\n').map(JSON.parse), K = +(a2 || 0), M = +(a3 || 1), st = {};
  let c = 0;
  ALL.forEach((sp, i) => {
    if (i % M !== K) return;
    const p = E.Pos.from(sp), L = real(p); if (L.length < 12) { st.legal = (st.legal || 0) + 1; return; }
    if (V.deepDist(p, 9) > 8) { st.far = (st.far || 0) + 1; return; }
    const F = L.map(m => { const q = p.clone().play(m); return { m, ws: 1 + V.deepDist(q, 10), bs: V.deepDist(swapPos(q), 11) }; });
    const ok = F.filter(x => x.bs > x.ws);
    if (!ok.length || ok.length > 3 || ok.length * 3 > L.length) { const k = 'ok' + Math.min(ok.length, 4); st[k] = (st[k] || 0) + 1; return; }
    const Wn = Math.min(...ok.map(x => x.ws)), trap = F.filter(x => !(x.bs > x.ws) && x.ws <= Wn);
    if (!trap.length) { st.trap = (st.trap || 0) + 1; return; }
    const G = E.duelGood(sp, [], Math.max(...ok.map(x => x.ws)) + 1, 'c33', 6e6); if (!G) { st.budget = (st.budget || 0) + 1; return; }
    if (!(G.length === ok.length && ok.every(x => G.includes(x.m)))) { st.exact = (st.exact || 0) + 1; return; }
    c++; console.log(JSON.stringify({ s: sp, ok: ok.map(x => E.name(p, x.m)), F: F.map(x => [E.name(p, x.m), x.ws, x.bs]) }));
  });
  console.error('candidates', c, JSON.stringify(st));
}
