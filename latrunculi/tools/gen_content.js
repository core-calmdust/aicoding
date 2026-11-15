// node tools/gen_content.js [lessons] [puzzles] — builds lessons.json and puzzles.json (default rules: seneca).
// Positions are random sparse boards; every answer set is computed by the engine (E.effect: what a move encloses / frees,
// E.goalGood: a counter is won within n moves against every defence) and checked again before writing.
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
E.setRule('seneca');
let seed = 20261116; const rand = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
const ri = n => Math.floor(rand() * n);
const sqI = nm => (8 - +nm[1]) * 8 + 'abcdefgh'.indexOf(nm[0]);
// would the counter on i be enclosed if an enemy had just completed it? (two enemies opposite / the corner pair)
function sandwiched(sq, i) {
  const p = sq[i], o = 3 - p, N = E.NB[i];
  if ((N[0] >= 0 && N[1] >= 0 && sq[N[0]] === o && sq[N[1]] === o) || (N[2] >= 0 && N[3] >= 0 && sq[N[2]] === o && sq[N[3]] === o)) return true;
  if (E.CORNER[i] >= 0) { const [a, b] = E.CADJ[E.CORNER[i]]; if (sq[a] === o && sq[b] === o) return true; }
  return false;
}
// a random position: k1 Black / k2 White counters inside the box [lo, hi]², no counter standing enclosed
function randomPos(k1, k2, side, lo = 0, hi = 7, fix, skip = -1) {
  for (let tries = 0; tries < 200; tries++) {
    const sq = new Int8Array(64); let ok = true;
    if (fix) for (const [nm, p] of fix) sq[sqI(nm)] = p;
    for (const [k, p] of [[k1, 1], [k2, 2]]) { let n = 0; for (let i = 0; i < 64; i++) if (sq[i] === p) n++; for (let g = 0; n < k && g < 500; g++) { const i = (lo + ri(hi - lo + 1)) * 8 + lo + ri(hi - lo + 1); if (!sq[i]) { sq[i] = p; n++; } } }
    for (let i = 0; i < 64 && ok; i++) if (sq[i] && i !== skip && sandwiched(sq, i)) ok = false;
    if (!ok) continue;
    let b = ''; for (let i = 0; i < 64; i++) b += '.bw'[sq[i]];
    return { b, side, hand: [0, 0], cap: [0, 0], n: 40, rule: 'seneca' };
  }
  return null;
}
const hits = (pos, m) => { const fx = E.effect(pos, m); return fx.blocks.length + fx.takes.length; };
function targets(pos, p) {
  const q = pos.clone(); q.side = 2 - p; q.last = [-1, -1]; const out = new Set();
  for (const m of q.movesAfter(-1, [])) { const fx = E.effect(q, m); for (const x of fx.blocks) out.add(x); }
  return [...out].filter(x => !pos.blocked(x));
}
const isLeap = (pos, m) => E.effect(pos, m).leap;
const sideOf = k => (k % 2 ? 2 : 1);

// ---------------------------------------------------------------- lessons
const LESSON_DEFS = [
  { id: 'b_block', course: 'basics', make(k) { const s = randomPos(4 + ri(2), 4 + ri(2), sideOf(k), 1, 6); if (!s) return null; const pos = E.Pos.from(s), L = pos.moves();
      const ok = L.filter(m => hits(pos, m) === 1 && !isLeap(pos, m)); if (ok.length < 1 || ok.length > 2 || L.some(m => hits(pos, m) && !ok.includes(m))) return null; return { s, ok }; } },
  // (a leap never encloses alone: the counter leapt over could step to the same square — so there is no "leap and enclose" lesson)
  { id: 'b_edge', course: 'basics', make(k) { const me = sideOf(k), s = randomPos(5, 5, me, 0, 7); if (!s) return null; const pos = E.Pos.from(s), L = pos.moves();
      const edge = x => E.CORNER[x] < 0 && ((x >> 3) % 7 === 0 || (x & 7) % 7 === 0);
      const ok = L.filter(m => E.effect(pos, m).blocks.some(edge)); if (ok.length < 1 || ok.length > 2 || L.some(m => hits(pos, m) && !ok.includes(m))) return null; return { s, ok }; } },
  { id: 'b_corner', course: 'basics', make(k) { const me = sideOf(k), c = ['a8', 'h8', 'a1', 'h1'][ri(4)]; const s = randomPos(5, 4, me, 0, 7, [[c, 3 - me]]); if (!s) return null; const pos = E.Pos.from(s), L = pos.moves(), ci = sqI(c);
      const ok = L.filter(m => E.effect(pos, m).blocks.includes(ci)); if (ok.length < 1 || ok.length > 2 || L.some(m => hits(pos, m) && !ok.includes(m))) return null; return { s, ok }; } },
  { id: 'b_rescue', course: 'basics', make(k) {
      const me = sideOf(k), r = 1 + ri(6), c = 1 + ri(6), hz = ri(2), x = r * 8 + c, h1 = hz ? x - 1 : x - 8, h2 = hz ? x + 1 : x + 8;
      const s = randomPos(5 + ri(2), 5, me, 0, 7, [[E.sqName(x), me], [E.sqName(h1), 3 - me], [E.sqName(h2), 3 - me]], x); if (!s) return null;
      // the counter on x is face down (held along its axis); nothing else is
      const a = s.b.split(''); if (a[x] !== 'bw'[me - 1]) return null; a[x] = (me === 1 ? 'hv' : 'HV')[hz ? 0 : 1]; s.b = a.join('');
      const pos = E.Pos.from(s), L = pos.moves(); if (!pos.blocked(x)) return null;
      const ok = L.filter(m => E.effect(pos, m).frees.includes(x)); if (ok.length < 1 || ok.length > 2) return null; return { s, ok }; } },
  { id: 's_safe', course: 'strategy', make(k) { const s = randomPos(5 + ri(2), 5 + ri(2), sideOf(k), 1, 6); if (!s) return null; const pos = E.Pos.from(s), L = pos.moves(), me = pos.turn;
      if (targets(pos, me).length !== 1 || L.some(m => hits(pos, m))) return null;
      const ok = L.filter(m => !targets(pos.clone().play(m), me).length); if (ok.length < 1 || ok.length > 4 || L.length < 10) return null; return { s, ok }; } },
  { id: 's_double', course: 'strategy', make(k) { const s = randomPos(6 + ri(2), 6 + ri(2), sideOf(k), 1, 6); if (!s) return null; const pos = E.Pos.from(s), L = pos.moves();
      const ok = L.filter(m => hits(pos, m) >= 2); if (ok.length !== 1) return null; return { s, ok }; } },
  { id: 's_two', course: 'strategy', make(k) { const s = randomPos(6 + ri(2), 6 + ri(2), sideOf(k), 1, 6); if (!s) return null; const pos = E.Pos.from(s), L = pos.moves();
      const hit = L.filter(m => hits(pos, m)); if (hit.length < 2) return null;
      const ok = E.goalGood(s, [], 2, { goal: 'take' }, 'seneca', 200000); if (!ok || ok.length !== 1 || !hit.some(m => !ok.includes(m))) return null; return { s, ok }; } },
];
function genLessons() {
  const steps = [];
  for (const D of LESSON_DEFS) {
    const problems = [], seen = new Set();
    for (let k = 0, g = 0; problems.length < 5 && g < 60000; g++) {
      const P = D.make(k); if (!P || seen.has(P.s.b)) continue;
      seen.add(P.s.b); problems.push({ s: P.s, ok: P.ok, best: P.ok[0] }); k++;
    }
    if (problems.length < 5) throw new Error('lesson ' + D.id + ': only ' + problems.length);
    steps.push({ id: D.id, course: D.course, problems });
    console.log('lesson', D.id, problems.length);
  }
  fs.writeFileSync(path.join(__dirname, '..', 'lessons.json'), JSON.stringify({ version: 1, steps, rampUi: {} }));
}

// ---------------------------------------------------------------- puzzles ("win a counter within n moves")
// a puzzle: the shortest win of a counter takes exactly n moves, the first move is unique (two at most), and for n ≥ 2 a
// tempting enclosure exists that does not work
function tryPuzzle(k1, k2, n, extra) {
  const s = randomPos(k1, k2, 1 + ri(2), 0, 7); if (!s) return null;
  const pos = E.Pos.from(s);
  if (pos.moves().length < 8) return null;
  const G = { goal: 'take' };
  for (let j = 1; j < n; j++) { const g = E.goalGood(s, [], j, G, 'seneca', 150000); if (g) return null; }
  const good = E.goalGood(s, [], n, G, 'seneca', n >= 4 ? 1500000 : 500000);
  if (!good || good.length > 2) return null;
  if (extra && !extra(pos, good)) return null;
  return { s, n, g: 'take' };
}
const THEMES = [
  { id: 't2', grp: 'Win', n: 2, k: [7, 9], extra: (pos, good) => pos.moves().some(m => hits(pos, m) && !good.includes(m)) },
  { id: 't3', grp: 'Win', n: 3, k: [6, 8] },
  { id: 't4', grp: 'Win', n: 4, k: [5, 6] },
  { id: 'corner', grp: 'Tac', n: 2, k: [7, 9], corner: true, extra: (pos, good) => good.every(m => E.effect(pos, m).blocks.some(x => E.CORNER[x] >= 0 || (x >> 3) % 7 === 0 || (x & 7) % 7 === 0)) },
  { id: 'double', grp: 'Tac', n: 2, k: [8, 10], extra: (pos, good) => good.every(m => hits(pos, m) >= 2) },
];
function genPuzzles(count) {
  const themes = [];
  for (const T of THEMES) {
    const puzzles = [], seen = new Set(), t0 = Date.now();
    for (let g = 0; puzzles.length < count && g < 400000 && Date.now() - t0 < 240000; g++) {
      const k1 = T.k[0] + ri(T.k[1] - T.k[0] + 1), k2 = T.k[0] + ri(T.k[1] - T.k[0] + 1);
      const P = tryPuzzle(k1, k2, T.n, T.extra); if (!P || seen.has(P.s.b)) continue;
      seen.add(P.s.b); P.d = E.Pos.from(P.s).moves().length; puzzles.push(P);
    }
    puzzles.sort((a, b) => a.d - b.d); puzzles.forEach(P => delete P.d);   // fewer legal moves first (easier)
    console.log('theme', T.id, puzzles.length, ((Date.now() - t0) / 1000).toFixed(0) + 's');
    themes.push({ id: T.id, grp: T.grp, puzzles });
  }
  fs.writeFileSync(path.join(__dirname, '..', 'puzzles.json'), JSON.stringify({ version: 1, rule: 'seneca', kind: 'goal', daily: ['t2', 'corner', 't3', 'double', 't2', 't3', 't4'], themes }));
}
const what = process.argv.slice(2);
if (!what.length || what.includes('lessons')) genLessons();
if (!what.length || what.includes('puzzles')) genPuzzles(+process.env.PZ_N || 20);
