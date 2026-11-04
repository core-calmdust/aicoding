// Builds puzzles.json: "fill the house in N moves" (White to move, Black stands still).
// Positions come from AI self-play games (classic 3x3); the engine solves each one exactly (soloMin), the first move must be
// one of few (soloGood), and a straightforward greedy play (always the farthest move) must NOT solve it in N moves — so the
// puzzle needs a plan (a road, the right order, filling from the back).
// node tools/gen_puzzles.js > puzzles.json   (deterministic: seeded)
const E = require('../engine.js');
E.setRule('c33');
let seed = +(process.argv[2] || 12345) >>> 0; const rand = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };   // mulberry32
const THEMES = [
  { id: 'n2', grp: 'Step', n: [2] }, { id: 'n3', grp: 'Step', n: [3] }, { id: 'n4', grp: 'Step', n: [4] },
  { id: 'n5', grp: 'Tac', n: [5] }, { id: 'n6', grp: 'Tac', n: [6] }, { id: 'n7', grp: 'Tac', n: [7] },
  { id: 'n8', grp: 'End', n: [8] }, { id: 'n9', grp: 'End', n: [9] }, { id: 'n10', grp: 'End', n: [10] }, { id: 'n11', grp: 'End', n: [11, 12] },
];
const PER = 20;
const D = E.DIST()[1];
function greedy(spec, n) {   // always the move that gains most (ties: first) — fails on the interesting puzzles
  const p = E.Pos.from(spec);
  for (let k = 0; k < n; k++) {
    if (p.done(1)) return true;
    let best = null, bg = -99;
    for (const m of p.moves()) { if (m === E.PASS) continue; const q = p.clone().play(m); const g = (q.inTarget(1) - p.inTarget(1)) * 10 + (D[E.mFrom(m)] - D[E.mTo(m)]); if (g > bg) { bg = g; best = m; } }
    if (best === null) return false;
    p.play(best); p.play(E.PASS);
  }
  return p.done(1);
}
const out = {}; for (const T of THEMES) out[T.id] = [];
const seen = new Set();
// random endgame-like positions: some White pieces already in the corner (often with holes), the others spread over the
// board towards it; Black's 9 pieces partly home (bottom-left) and partly in the middle, where they serve as roads
const TGT = []; for (let i = 0; i < 64; i++) if (E.target(1)[i]) TGT.push(i);
const BH = []; for (let i = 0; i < 64; i++) if (E.target(2)[i]) BH.push(i);
function randPos(outW) {
  const a = Array(64).fill('.');
  const tg = TGT.slice().sort(() => rand() - 0.5);
  for (let k = 0; k < 9 - outW; k++) a[tg[k]] = 'w';
  let put = 0, guard = 0;
  while (put < outW && guard++ < 500) {
    const r = Math.floor(rand() * 8), c = Math.floor(rand() * 8), i = r * 8 + c, d = D[i];
    if (a[i] !== '.' || E.target(1)[i] || d > 3 + outW * 1.6 || d < 2) continue;
    a[i] = 'w'; put++;
  }
  const bh = BH.slice().sort(() => rand() - 0.5), inB = Math.floor(rand() * 6);
  for (let k = 0; k < inB; k++) a[bh[k]] = 'b';
  guard = 0; let nb = inB;
  while (nb < 9 && guard++ < 500) { const i = Math.floor(rand() * 64); if (a[i] !== '.' || E.target(1)[i]) continue; const d = D[i]; if (d < 2 || d > 11) continue; a[i] = 'b'; nb++; }
  return a.join('');
}
let tries = 0;
const want = () => THEMES.some(T => out[T.id].length < PER);
while (want() && tries < 6000000) {
  tries++;
  const T0 = THEMES.filter(T => out[T.id].length < PER); const T = T0[Math.floor(rand() * T0.length)];
  const nWant = T.n[Math.floor(rand() * T.n.length)];
  const outW = Math.max(2, Math.min(7, nWant - Math.floor(rand() * 4)));
  const b = randPos(outW); if (seen.has(b)) continue; seen.add(b);
  const spec = { b, side: 1, free: true };
  const p = E.Pos.from(spec); if (p.done(1) || p.count(1) !== 9) continue;
  const n = E.soloMin(spec, 12, null, 600000);
  if (n < 2) continue;
  const TT = THEMES.find(x => x.n.includes(n)); if (!TT || out[TT.id].length >= PER) continue;
  const good = E.soloGood(spec, [], n, null, 1500000);
  if (!good.length || good.length > (n <= 3 ? 2 : 4)) continue;
  if (n > 3 && greedy(spec, n)) continue;
  out[TT.id].push({ s: { b, side: 1 }, n, answer: good[0], k: good.length });
  if (process.env.JSONL) process.stderr.write('JSON ' + JSON.stringify({ t: TT.id, s: { b, side: 1 }, n, answer: good[0], k: good.length }) + '\n');
  process.stderr.write(`${TT.id} ${out[TT.id].length}  (try ${tries})\n`);
}
// order inside a theme: fewer first-move choices last (harder)
for (const T of THEMES) out[T.id].sort((a, b) => b.k - a.k || a.n - b.n);
const res = { version: 1, rule: 'c33', daily: THEMES.map(T => T.id), themes: THEMES.map(T => ({ id: T.id, grp: T.grp, puzzles: out[T.id].map(({ k, ...x }) => x) })) };
process.stdout.write(JSON.stringify(res));
