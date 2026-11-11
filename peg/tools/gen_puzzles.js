// Dev tool: builds peg/puzzles.json (the puzzle collection) and peg/daily.json (366 daily puzzles).
// node peg/tools/gen_puzzles.js            (~ a few minutes; deterministic: fixed seeds)
// Every position is made by playing backwards from the finish (a peg "unjumps": it jumps back over an empty hole, putting a
// peg there, onto another empty hole), so each puzzle is solvable by construction; the solver then measures it:
//   m = legal first jumps, g = first jumps that still lead to the finish → fun = the share of wrong-but-tempting jumps.
// A puzzle: { b: board id, p: '0101…' (a peg per hole), t: the finish hole, s: one solution 'f.t f.t …', n: pegs, g, m, k?: shape name }
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
const OUT = path.join(__dirname, '..');
let seed = 20261111; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = a => a[Math.floor(rnd() * a.length)];
const enc = a => a.map(v => v ? 1 : 0).join('');
const sol = p => p.map(j => j[0] + '.' + j[2]).join(' ');

// play backwards from one peg on `t` until `n` pegs; prefer unjumps that stay compact (near the pegs already there)
function unplay(B, t, n, spread) {
  const a = new Array(B.n).fill(0); a[t] = 1; let k = 1, guard = 0;
  while (k < n && guard++ < 4000) {
    const c = [];
    for (const [f, o, to] of B.jumps) if (a[to] && !a[o] && !a[f]) c.push([f, o, to]);
    if (!c.length) return null;
    // weight: unjumps landing near other pegs keep the position in one piece (more interesting)
    const w = c.map(([f, o]) => { let s = 0; for (const [ff, oo, tt] of B.jumps) if (tt === f && a[oo]) s++; return 1 + s * (spread ? .4 : 1.2) + rnd(); });
    let r = rnd() * w.reduce((x, y) => x + y, 0), i = 0; while ((r -= w[i]) > 0) i++;
    const [f, o, to] = c[i]; a[to] = 0; a[o] = 1; a[f] = 1; k++;
  }
  return k === n ? a : null;
}
function measure(B, a, t) {
  const ms = E.moves(B, a); let g = 0;
  for (const j of ms) { const r = E.findPath(B, E.apply(a, j), { target: t, time: 4000 }); if (r.ok) g++; }
  return { m: ms.length, g };
}
function make(B, a, t, extra) {
  const r = E.findPath(B, a, { target: t, time: 20000 }); if (!r.ok) return null;
  const { m, g } = measure(B, a, t);
  return Object.assign({ b: B.id, p: enc(a), t, s: sol(r.path), n: a.reduce((x, y) => x + y, 0), g, m }, extra || {});
}
const keyOf = (B, a, t) => B.id + ':' + t + ':' + E.canon(B, a);
const seen = new Set();
function batch(boardIds, n0, n1, count, opt) {
  opt = opt || {};
  const out = [];
  for (let n = n0; out.length < count; n = n >= n1 ? n0 : n + 1) {
    let tries = 0, got = null;
    while (!got && tries++ < 40) {
      const id = pick(boardIds), B = E.BOARDS[id];
      const t = opt.center ? (rnd() < .65 ? B.center : pick(B.cells.map((_, i) => i).filter(i => B.dist[i] < 2.3))) : pick(B.cells.map((_, i) => i).filter(i => B.dist[i] < 3));
      const a = unplay(B, t, n, opt.spread); if (!a) continue;
      const k = keyOf(B, a, t); if (seen.has(k)) continue;
      const pz = make(B, a, t); if (!pz) continue;
      if (pz.m < 2 || pz.g >= pz.m) continue;   // a puzzle needs a choice and at least one tempting wrong jump
      seen.add(k); got = pz;
    }
    if (got) out.push(got);
  }
  return out;
}
const hard = p => p.n * 10 + (1 - p.g / p.m) * 40;

// 1) はじめの一歩: the English board, few pegs, the finish on or near the middle
const first = batch(['english'], 3, 9, 40, { center: true }).sort((x, y) => hard(x) - hard(y));
// 2) 形: classic shapes on the English board, finishing in the middle
const SH = {
  cross: [[1,3],[2,2],[2,3],[2,4],[3,3],[4,3]], plus: [[1,3],[2,3],[3,1],[3,2],[3,3],[3,4],[3,5],[4,3],[5,3]],
  fire: [[0,2],[0,3],[0,4],[1,2],[1,3],[1,4],[2,2],[2,3],[2,4],[3,2],[3,4]], dblarrow: [[0,3],[1,2],[1,3],[1,4],[2,3],[3,3],[4,3],[5,2],[5,3],[5,4],[6,3],[2,2],[2,4],[4,2],[4,4]],
  pyramid: [[1,3],[2,2],[2,3],[2,4],[3,1],[3,2],[3,3],[3,4],[3,5],[4,0],[4,1],[4,2],[4,3],[4,4],[4,5],[4,6]],
  arrow: [[0,3],[1,2],[1,3],[1,4],[2,1],[2,2],[2,3],[2,4],[2,5],[3,3],[4,3],[5,2],[5,3],[5,4],[6,2],[6,3],[6,4]],
  diamond: [[0,3],[1,2],[1,3],[1,4],[2,1],[2,2],[2,3],[2,4],[2,5],[3,0],[3,1],[3,2],[3,4],[3,5],[3,6],[4,1],[4,2],[4,3],[4,4],[4,5],[5,2],[5,3],[5,4],[6,3]],
};
const shapes = [];
{ const B = E.BOARDS.english;
  for (const [k, L] of Object.entries(SH)) { const a = new Array(B.n).fill(0); L.forEach(([r, c]) => { a[B.at[r + ',' + c]] = 1; }); const pz = make(B, a, B.center, { k }); if (pz) { shapes.push(pz); seen.add(keyOf(B, a, B.center)); } }
  // more shapes: positions symmetric left–right (a mirror on the board), finishing in the middle
  const mir = B.syms.find(s => B.cells.every(([r, c], i) => { const [r2, c2] = B.cells[s[i]]; return r2 === r && c2 === 6 - c; }));
  let tries = 0;
  while (shapes.length < 30 && tries++ < 6000) {
    const n = 6 + Math.floor(rnd() * 14), a = new Array(B.n).fill(0);
    const half = B.cells.map((_, i) => i).filter(i => B.cells[i][1] <= 3);
    while (a.reduce((x, y) => x + y, 0) < n) { const i = pick(half); a[i] = 1; a[mir[i]] = 1; }
    // one piece: every peg touches another
    if (!a.every((v, i) => !v || B.jumps.some(([f, o]) => f === i && a[o]))) continue;
    if (!E.canEnd(B, a, B.center)) continue;
    const k = keyOf(B, a, B.center); if (seen.has(k)) continue;
    const pz = make(B, a, B.center, { k: 'sym' }); if (!pz || pz.g >= pz.m) continue;
    seen.add(k); shapes.push(pz);
  }
  shapes.sort((x, y) => hard(x) - hard(y));
}
// 3) 世界の盤: midgame positions on the other four boards
const world = [];
for (const id of ['triangle', 'french', 'diamond', 'german']) world.push(...batch([id], id === 'triangle' ? 5 : 8, id === 'triangle' ? 11 : 16, 15, { spread: true }));
world.sort((x, y) => hard(x) - hard(y));
// 4) 全面: the full board with one hole empty — every distinct start (by symmetry), finishing on a hole the rule of three allows
const full = [];
for (const id of E.IDS) {
  const B = E.BOARDS[id], done = new Set();
  for (let h = 0; h < B.n; h++) {
    const a = E.startPos(B, h), ck = E.canon(B, a); if (done.has(ck)) continue; done.add(ck);
    // the finish: the start hole itself when the colours allow (the complement problem), else the allowed hole nearest the middle
    let t = E.canEnd(B, a, h) ? h : -1;
    if (t < 0) { const ok = B.cells.map((_, i) => i).filter(i => E.canEnd(B, a, i)).sort((x, y) => B.dist[x] - B.dist[y]); for (const c of ok) { const r = E.findPath(B, a, { target: c, time: 8000 }); if (r.ok) { t = c; break; } } if (t < 0) continue; }
    const r = E.findPath(B, a, { target: t, time: 15000 }); if (!r.ok) continue;
    full.push({ b: id, p: enc(a), t, s: sol(r.path), n: B.n - 1, g: 0, m: E.moves(B, a).length, h });
  }
}
const ORD = { triangle: 0, english: 1, french: 2, diamond: 3, german: 4 };
full.sort((x, y) => ORD[x.b] - ORD[y.b] || x.n - y.n);
const themes = [
  { id: 'first', list: first }, { id: 'shape', list: shapes }, { id: 'world', list: world }, { id: 'full', list: full },
];
fs.writeFileSync(path.join(OUT, 'puzzles.json'), JSON.stringify({ v: 1, themes }));
console.log(themes.map(t => t.id + ' ' + t.list.length).join(', '));
// the daily puzzles: midgame positions on every board (the English one most often), 8–16 pegs
seed = 7777;
const daily = [];
while (daily.length < 366) {
  const id = rnd() < .5 ? 'english' : pick(['french', 'triangle', 'diamond', 'german']);
  const got = batch([id], id === 'triangle' ? 7 : 9, id === 'triangle' ? 10 : 15, 1, { spread: rnd() < .5 })[0];
  if (got) daily.push(got);
  if (daily.length % 50 === 0) process.stdout.write(daily.length + ' ');
}
fs.writeFileSync(path.join(OUT, 'daily.json'), JSON.stringify({ v: 1, list: daily }));
console.log('daily', daily.length);
