// node tools/gen_content.js [lessons] [puzzles] — builds lessons.json and puzzles.json (rule set g13).
// Positions are random: the fox on any point, the geese scattered with a bias towards the fox. Every answer set is
// computed by the engine (E.jumped: what a move takes; E.judge: the fox shut in; E.goalGood: forced within n moves
// against every defence) and checked again before writing.
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
E.setRule('g13');
let seed = 20261117; const rand = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
const ri = n => Math.floor(rand() * n);
const dist = (a, b) => Math.max(Math.abs(E.RC[a][0] - E.RC[b][0]), Math.abs(E.RC[a][1] - E.RC[b][1]));
// near: how strongly the geese crowd round the fox (0 = anywhere … 1 = close)
function randomPos(k, side, near) {
  const fox = E.POINTS[ri(33)], b = Array(49).fill('.'); b[fox] = 'f';
  let n = 0;
  for (let g = 0; n < k && g < 2000; g++) { const i = E.POINTS[ri(33)]; if (b[i] !== '.') continue; if (rand() < near * Math.min(1, (dist(i, fox) - 1) / 3)) continue; b[i] = 'g'; n++; }
  if (n < k) return null;
  return { b: b.join(''), side, cap: 13 - k, n: 20, rule: 'g13' };
}
const caps = m => E.jumped(m).length;
const foxCanTake = pos => { const q = pos.clone(); q.side = 0; return q.foxMoves([]).some(m => caps(m)); };
const sideOf = k => (k % 2 ? 2 : 1);

const LESSON_DEFS = [
  { id: 'f_jump', course: 'basics', make() { const s = randomPos(9 + ri(4), 1, .6); if (!s) return null; const pos = E.Pos.from(s), L = pos.moves();
      const ok = L.filter(m => caps(m) === 1); if (ok.length < 1 || ok.length > 2 || L.some(m => caps(m) > 1) || E.judge(pos).over) return null; return { s, ok }; } },
  { id: 'f_double', course: 'basics', make() { const s = randomPos(9 + ri(4), 1, .5); if (!s) return null; const pos = E.Pos.from(s), L = pos.moves();
      const mx = Math.max(...L.map(caps)); if (mx < 2 || E.judge(pos).over) return null; const ok = L.filter(m => caps(m) === mx); if (ok.length !== 1) return null; return { s, ok }; } },
  { id: 'f_fork', course: 'basics', make() { const s = randomPos(8 + ri(4), 1, .4); if (!s) return null; const pos = E.Pos.from(s), L = pos.moves();
      if (L.length < 4 || L.some(m => caps(m)) || E.judge(pos).over) return null;
      const ok = E.goalGood(s, [], 2, { goal: 'take' }, 'g13', 200000); if (!ok || ok.length > 2) return null; return { s, ok }; } },
  { id: 'g_safe', course: 'strategy', make() { const s = randomPos(9 + ri(4), 2, .5); if (!s) return null; const pos = E.Pos.from(s), L = pos.moves();
      if (L.length < 8 || !foxCanTake(pos) || E.judge(pos).over) return null;
      const ok = L.filter(m => { const q = pos.clone().play(m); return !E.judge(q).over && !q.foxMoves([]).some(x => caps(x)); }); if (ok.length < 1 || ok.length > 3) return null; return { s, ok }; } },
  { id: 'g_trap', course: 'strategy', make() { const s = randomPos(8 + ri(5), 2, .9); if (!s) return null; const pos = E.Pos.from(s), L = pos.moves();
      if (E.judge(pos).over || foxCanTake(pos)) return null;
      const ok = L.filter(m => E.judge(pos.clone().play(m)).winner === 2); if (ok.length !== 1) return null; return { s, ok }; } },
  { id: 'g_net', course: 'strategy', make() { const s = randomPos(8 + ri(5), 2, .9); if (!s) return null; const pos = E.Pos.from(s), L = pos.moves();
      if (E.judge(pos).over || L.some(m => E.judge(pos.clone().play(m)).winner === 2)) return null;
      const ok = E.goalGood(s, [], 2, { goal: 'win' }, 'g13', 300000); if (!ok || ok.length > 2) return null; return { s, ok }; } },
];
function genLessons() {
  const steps = [];
  for (const D of LESSON_DEFS) {
    const problems = [], seen = new Set();
    for (let g = 0; problems.length < 5 && g < 400000; g++) { const P = D.make(); if (!P || seen.has(P.s.b)) continue; seen.add(P.s.b); problems.push({ s: P.s, ok: P.ok, best: P.ok[0] }); }
    if (problems.length < 5) throw new Error('lesson ' + D.id + ': only ' + problems.length);
    steps.push({ id: D.id, course: D.course, problems }); console.log('lesson', D.id, problems.length);
  }
  fs.writeFileSync(path.join(__dirname, '..', 'lessons.json'), JSON.stringify({ version: 1, steps, rampUi: {} }));
}
// a puzzle: the goal takes exactly n moves, the first move is unique (two at most)
function tryPuzzle(side, goal, n, k, near) {
  const s = randomPos(k, side, near); if (!s) return null;
  const pos = E.Pos.from(s);
  if (E.judge(pos).over || pos.moves().length < 3) return null;
  if (side === 1 && pos.moves().some(m => caps(m))) return null;
  if (side === 2 && foxCanTake(pos)) return null;
  const G = { goal };
  for (let j = 1; j < n; j++) if (E.goalGood(s, [], j, G, 'g13', 150000)) return null;
  const good = E.goalGood(s, [], n, G, 'g13', n >= 4 ? 1500000 : 500000);
  if (!good || good.length > 2) return null;
  return { s, n, g: goal };
}
const THEMES = [
  { id: 'w2', grp: 'Win', side: 2, goal: 'win', n: 2, k: [8, 12], near: .9 },
  { id: 'w3', grp: 'Win', side: 2, goal: 'win', n: 3, k: [8, 12], near: .9 },
  { id: 'w4', grp: 'Win', side: 2, goal: 'win', n: 4, k: [8, 11], near: .9 },
  { id: 't2', grp: 'Tac', side: 1, goal: 'take', n: 2, k: [8, 12], near: .4 },
  { id: 't3', grp: 'Tac', side: 1, goal: 'take', n: 3, k: [8, 11], near: .4 },
];
function genPuzzles(count) {
  const themes = [];
  for (const T of THEMES) {
    const puzzles = [], seen = new Set(), t0 = Date.now();
    for (let g = 0; puzzles.length < count && Date.now() - t0 < (+process.env.PZ_T || 420000); g++) {
      const P = tryPuzzle(T.side, T.goal, T.n, T.k[0] + ri(T.k[1] - T.k[0] + 1), T.near); if (!P || seen.has(P.s.b)) continue;
      seen.add(P.s.b); P.d = E.Pos.from(P.s).moves().length; puzzles.push(P);
    }
    puzzles.sort((a, b) => a.d - b.d); puzzles.forEach(P => delete P.d);
    console.log('theme', T.id, puzzles.length, ((Date.now() - t0) / 1000).toFixed(0) + 's');
    themes.push({ id: T.id, grp: T.grp, puzzles });
  }
  fs.writeFileSync(path.join(__dirname, '..', 'puzzles.json'), JSON.stringify({ version: 1, rule: 'g13', kind: 'goal', daily: ['w2', 't2', 'w3', 't3', 'w2', 'w4', 't2'], themes }));
}
const what = process.argv.slice(2);
if (!what.length || what.includes('lessons')) genLessons();
if (!what.length || what.includes('puzzles')) genPuzzles(+process.env.PZ_N || 50);
