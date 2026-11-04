// Constructed "win in N" puzzle candidates for Agon (complements tools/gen_duel.js, which takes them from self-play):
// endgame-like positions — the attacker's queen on or near the throne, its guards mostly on rings 1-3, the defender's pieces
// scattered inside — kept when the side to move forces a win in exactly N (2..5) of its moves with one or two winning first
// moves (engine.js duelMin / duelGood). node tools/gen_pz.js <seed> <tries> >> tools/duel_raw.jsonl
const E = require('../engine.js'); E.setRule('std');
const seed0 = +process.argv[2] || 1, T = +process.argv[3] || 2000;
let seed = seed0 * 104729 + 7; const rand = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };   // mulberry32
const ri = n => Math.floor(rand() * n);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = ri(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ringW = w => { let x = rand() * w.reduce((a, b) => a + b, 0); for (let k = 0; k < w.length; k++) { x -= w[k]; if (x < 0) return k; } return w.length - 1; };
let found = 0;
for (let t = 0; t < T; t++) {
  const side = 1 + ri(2), att = side, def = 3 - side;
  const b = Array(E.N).fill('.');
  const chA = att === 1 ? ['w', 'W'] : ['b', 'B'], chD = def === 1 ? ['w', 'W'] : ['b', 'B'];
  const put = (ch, ring) => { const f = shuffle(E.RINGL[ring].filter(i => b[i] === '.')); if (!f.length) return false; b[f[0]] = ch; return true; };
  // attacker queen: throne 50%, ring 1 35%, ring 2 15%
  const qr = ringW([5, 3.5, 1.5]); if (!put(chA[1], qr)) continue;
  let ok = true;
  for (let g = 0; g < 6; g++) ok = put(chA[0], 1 + ringW([3, 2.2, 1.2, 0.5, 0.2])) && ok;
  ok = put(chD[1], 1 + ringW([1, 2, 2, 1.5, 1])) && ok;
  for (let g = 0; g < 6; g++) ok = put(chD[0], 1 + ringW([1.2, 2, 2, 1.5, 1])) && ok;
  if (!ok) continue;
  const pos = E.Pos.from({ b: b.join(''), side, n: 80 });
  if (E.judge(pos).over || E.hanging(pos, def).n > 1) continue;
  const n = E.duelMin(pos.spec(), [], 5, 'std', 2.5e5);
  if (n < 2) continue;
  const good = E.duelGood(pos.spec(), [], n, 'std', 2.5e5);
  if (!good || !good.length || good.length > 2) continue;
  found++;
  console.log(JSON.stringify({ s: pos.spec(), n, ok: good, all: pos.moves().length, g: 'c' + seed0 + ':' + t, w: att }));
}
console.error('found', found, 'of', T);
