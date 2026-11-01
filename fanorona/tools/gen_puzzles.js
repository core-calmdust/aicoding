// Builds puzzles.json (PZBook v2 data): "win in N" from sparse endgame positions and "win g pieces in N" from
// positions of engine games. Every puzzle: the first correct move is unique (by resulting position), checked with the
// engine's exhaustive puzzle search (engine.c puzzle()). node tools/gen_puzzles.js [perTheme]
'use strict';
const fs = require('fs'), path = require('path');
const { init, rng, capN, selfPlay, X: _x } = require('./lib.js');
const PER = +(process.argv[2] || 30);
(async () => {
  const E = await init();
  const lib = require('./lib.js'), X = lib.X;
  const rand = rng(77001);
  const io = () => new Int32Array(X.memory.buffer, X.io_ptr(), 8192);
  function setup(spec) {
    const p = E.Pos.from(spec); let w0 = 0, w1 = 0, b0 = 0, b1 = 0;
    for (let i = 0; i < 45; i++) { const v = p.b[i]; if (!v) continue; if (i < 32) { if (v === 1) w0 |= 1 << i; else b0 |= 1 << i; } else { if (v === 1) w1 |= 1 << (i - 32); else b1 |= 1 << (i - 32); } }
    io().set([w0, w1, b0, b1, p.side, 0]); return X.setup();
  }
  function solve(spec, n, goal) {   // [{m, need}] for the attacker to move
    if (!setup(spec)) return null;
    X.puzzle(n, 0, goal, 0, 1500);
    const r = io(), out = [];
    for (let i = 0; i < r[0]; i++) out.push({ m: E.fromWire(r[1 + 3 * i], r[2 + 3 * i]), need: r[3 + 3 * i] });
    return out;
  }
  // the unique solution and its length, or null
  function unique(spec, maxN, goal, minN) {
    const L = solve(spec, maxN, goal); if (!L || L.length < 3) return null;
    if (L.some(e => e.need < 0)) return null;
    const ok = L.filter(e => e.need > 0); if (!ok.length) return null;
    const N = Math.min(...ok.map(e => e.need)); if (N < (minN || 1)) return null;
    const best = ok.filter(e => e.need === N); if (best.length !== 1) return null;
    return { n: N, answer: best[0].m, L };
  }
  function randomPos(nw, nb, side) {
    const pts = [...Array(45).keys()];
    for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
    const a = Array(45).fill('.');
    const [na, nd] = side === 1 ? [nw, nb] : [nb, nw];
    pts.slice(0, na).forEach(i => (a[i] = 'w')); pts.slice(na, na + nd).forEach(i => (a[i] = 'b'));
    return { b: a.join(''), side };
  }
  const seen = new Set();
  const themes = [];
  const t0 = Date.now();
  // ---- win in N from sparse positions
  function winTheme(id, grp, N, att, def, extra) {
    const out = [];
    for (let k = 0; k < 400000 && out.length < PER; k++) {
      const side = rand() < 0.75 ? 1 : 2;
      const spec = randomPos(att[0] + Math.floor(rand() * (att[1] - att[0] + 1)), def[0] + Math.floor(rand() * (def[1] - def[0] + 1)), side);
      if (seen.has(spec.b)) continue;
      const pos = E.Pos.from(spec); if (pos.status() !== 0) continue;
      if (N >= 2 && pos.moves().some(m => pos.clone().play(m).status() === -1)) continue;   // a quicker win (in 1)
      const r = unique(spec, N, 0, N); if (!r || r.n !== N) continue;
      if (extra && !extra(pos, r)) continue;
      seen.add(spec.b); out.push({ s: spec, n: N, answer: r.answer });
    }
    console.error(id, out.length, ((Date.now() - t0) / 1000 | 0) + 's');
    return { id, grp, goal: 'win', g: 0, puzzles: out };
  }
  themes.push(winTheme('step1', 'Step', 1, [2, 5], [2, 4], (pos, r) => capN(pos, r.answer) >= 2));
  themes.push(winTheme('step2', 'Step', 2, [2, 4], [1, 3]));
  themes.push(winTheme('step3', 'Step', 3, [2, 4], [1, 2]));
  // ---- material from game positions
  const pool = [];
  for (let g = 0; g < 50; g++) {
    const a = 8 + Math.floor(rand() * 10), b = 8 + Math.floor(rand() * 10);
    const { out } = selfPlay(rand, a, b, 120);
    for (const x of out) if (x.n >= 2) pool.push(x.spec);
  }
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  console.error('pool', pool.length, ((Date.now() - t0) / 1000 | 0) + 's');
  function gainTheme(id, grp, N, G, test) {
    const out = [];
    for (const spec of pool) {
      if (out.length >= PER) break;
      if (seen.has(spec.b)) continue;
      const pos = E.Pos.from(spec); if (pos.moves().length < 3) continue;
      if (test && !test(pos, null)) continue;
      const r = unique(spec, N, G, N); if (!r || r.n !== N) continue;
      if (test && !test(pos, r)) continue;
      seen.add(spec.b); out.push({ s: spec, n: N, g: G, answer: r.answer });
    }
    console.error(id, out.length, ((Date.now() - t0) / 1000 | 0) + 's');
    return { id, grp, goal: 'gain', g: G, puzzles: out };
  }
  // the right capture is not simply the biggest one (count the recapture)
  themes.push(gainTheme('count', 'Tac', 1, 2, (pos, r) => pos.hasCaps() && (!r || pos.moves().some(m => m !== r.answer && capN(pos, m) >= capN(pos, r.answer)))));
  // a capture chain of 3 steps or more
  themes.push(gainTheme('chain', 'Tac', 1, 3, (pos, r) => pos.hasCaps() && pos.moves().some(m => m.split('-').length >= 4) && (!r || r.answer.split('-').length >= 4)));
  // two moves deep
  themes.push(gainTheme('gain2', 'Tac', 2, 3));
  // ---- endgames: longer wins with few pieces
  themes.push(winTheme('end4', 'End', 4, [2, 3], [1, 2]));
  themes.push(winTheme('end5', 'End', 5, [2, 3], [1, 1]));
  const T = themes.filter(t => t.puzzles.length >= 6);
  // easier first inside each theme: by the number of legal moves (fewer = easier)
  for (const t of T) t.puzzles.sort((a, b) => E.Pos.from(a.s).moves().length - E.Pos.from(b.s).moves().length);
  fs.writeFileSync(path.join(__dirname, '..', 'puzzles.json'), JSON.stringify({ version: 1, daily: T.map(t => t.id), themes: T }));
  console.error('written', T.map(t => t.id + ':' + t.puzzles.length).join(' '));
})();
