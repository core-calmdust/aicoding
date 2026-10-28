// Rebuilds two basics steps of tafl/lessons.json as 3-move problems (the rest of the file is kept as it is):
//   b_escape  — the defenders get the king to a corner in 3 own moves against any defence
//   b_kingcap — the attackers capture the king in 3 own moves against any defence
// Every problem is checked with the WebAssembly engine's exact puzzle search (engine.c puzzle()):
// no move wins in 1 or 2, one or two first moves force the win in 3, and the forced line really ends with an
// escape / a king capture (not a fort or an encirclement). In the lesson (app.js) the player plays the whole line:
// each move must keep a forced win within the moves left, and the engine answers with its most stubborn defence.
// node tools/gen_lessons_seq.js
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
const X = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(path.join(__dirname, '..', 'engine.wasm'))), { env: { now: () => Date.now(), progress: () => {} } }).exports;
const io = () => new Int32Array(X.memory.buffer, X.io_ptr(), 8192);
const P1 = 1, P2 = 2, C = 'copenhagen', n = 11;
let seed = +(process.argv[2] || 20261028); const rnd = k => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return (seed >>> 8) % k; };
const F = E.geo(C).F;
const pos = sp => E.Pos.from(sp);
function setupPos(p) { const a = [E.VID[p.v], p.turn === 2 ? 1 : 0]; for (const x of p.b) a.push(x); a.push(0); io().set(a); return X.setup(); }
// engine.c puzzle(): Map move -> need (defend = 0: own moves to the win after this move, 0 = not within k)
function need(p, k, defend, budget) { setupPos(p); X.puzzle(k, defend ? 1 : 0, budget || 3000); const r = io(), out = new Map(); for (let i = 0; i < r[0]; i++) { const x = r[1 + 2 * i]; out.set((x & 255) + 256 * ((x >> 8) & 255), r[2 + 2 * i]); } return out; }
function randPos(na, nd, side, o) {
  const b = Array(n * n).fill('.');
  const free = () => { for (let t = 0; t < 400; t++) { const i = rnd(n * n); if (b[i] === '.' && !(F[i] & 16)) return i; } return -1; };
  b[o.king] = 'k';
  for (const [i, ch] of o.fixed || []) b[i] = ch;
  for (let i = 0; i < na; i++) { const q = free(); if (q >= 0) b[q] = 'a'; }
  for (let i = 0; i < nd; i++) { const q = free(); if (q >= 0) b[q] = 'd'; }
  return { v: C, b: b.join(''), side };
}
const okBasic = sp => { const p = pos(sp); if (p.res || !p.moves().length) return false; const q = p.clone(); q.turn = 3 - q.turn; return q.moves().length > 0 && !q.moves().some(m => q.clone().play(m).res); };
// plays the forced line: solver = fastest winning move, defender = the reply that holds out longest
function line(p0, k, why) {
  let p = p0.clone(); const out = [];
  for (let left = k; left > 0; left--) {
    const L = need(p, left, false); let best = null;
    for (const [m, v] of L) if (v > 0 && v <= left && (!best || v < best[1])) best = [m, v];
    if (!best) return null;
    p.play(best[0]); out.push(best[0]);
    if (p.res) return p.why === why ? out : null;
    const D = need(p, left - 1, true); if (!D.size) return null;
    let r = null; for (const [m, v] of D) { const s = v === 0 ? 99 : v < 0 ? 50 : v; if (!r || s > r[1]) r = [m, s]; }
    if (r[1] >= 50) return null;
    p.play(r[0]); out.push(r[0]);
    if (p.res) return null;
  }
  return null;
}
function search(id, gen, why, want) {
  const out = [], seen = new Set(); let tries = 0; const t0 = Date.now();
  while (out.length < want && tries < 400000) {
    tries++;
    const sp = gen(); if (!sp || seen.has(sp.b) || !okBasic(sp)) continue; seen.add(sp.b);
    const p = pos(sp);
    if (p.turn === P2 && p.kingLines().length) continue;
    const n2 = need(p, 2, false, 400); if ([...n2.values()].some(v => v !== 0)) continue;   // nothing in 1 or 2 (and no budget overrun)
    const n3 = need(p, 3, false, 3000), vals = [...n3.values()];
    if (vals.some(v => v < 0)) continue;
    const ok = [...n3].filter(([m, v]) => v === 3).map(x => x[0]);
    if (!ok.length || ok.length > 2) continue;
    const L = line(p, 3, why); if (!L || L.length !== 5) continue;
    out.push({ s: sp, ok, best: ok[0], line: L, n: 3 });
    console.error(id, out.length, 'after', tries, 'tries', Math.round((Date.now() - t0) / 1000) + 's', sp.b, (() => { const q = pos(sp); return L.map(m => { const s = E.name(q, m); q.play(m); return s; }).join(' '); })());
  }
  return out;
}
const ring = k => [k - n, k + n, k - 1, k + 1];
// escape in 3: the king two or three lines from an edge, a few attackers guarding, a defender or two
const escGen = () => {
  const r = 1 + rnd(9), c = 1 + rnd(9), k = r * n + c;
  if (F[k] & 20) return null;
  const d = Math.min(r, c, n - 1 - r, n - 1 - c); if (d > 3 || d < 1) return null;
  return randPos(8 + rnd(7), 1 + rnd(3), P2, { king: k });
};
// capture in 3: the king inside with one or two attackers already next to it and more attackers close by (they have
// to cut off its runs), a defender or two
const capGen = () => {
  const r = 2 + rnd(7), c = 2 + rnd(7), k = r * n + c;
  if (F[k] & 20) return null;
  const nb = ring(k).filter(q => !(F[q] & 4)), fixed = [];
  for (let j = 0, m = 1 + rnd(2); j < m; j++) { const q = nb[rnd(nb.length)]; if (!fixed.some(x => x[0] === q)) fixed.push([q, 'a']); }
  for (let j = 0, m = 5 + rnd(5); j < m; j++) {
    const rr = r - 3 + rnd(7), cc = c - 3 + rnd(7), q = rr * n + cc;
    if (rr < 0 || cc < 0 || rr >= n || cc >= n || q === k || (F[q] & 16) || fixed.some(x => x[0] === q)) continue;
    fixed.push([q, 'a']);
  }
  return randPos(2 + rnd(4), rnd(3), P1, { king: k, fixed });
};
const want = 6;
const file = path.join(__dirname, '..', 'lessons.json'), D = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const [id, gen, why] of [['b_escape', escGen, 'escape'], ['b_kingcap', capGen, 'capture']]) {
  const got = search(id, gen, why, want);
  if (got.length < want) { console.error('!!', id, 'only', got.length); process.exit(1); }
  const ex = got.shift(), st = D.steps.find(s => s.id === id);
  const m = ex.best;
  st.problems = got;
  st.diagram = { s: ex.s, arrows: [[E.sqName(m % 256, n), E.sqName(Math.floor(m / 256), n)]], marks: [] };
}
fs.writeFileSync(file, JSON.stringify(D));
console.error('lessons.json updated');
