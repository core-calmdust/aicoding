// node foxgeese/tools/fix_puzzles.js [seconds per theme = 300] — (2026-11-24 担当C) rebuilds puzzles.json to the strict checks of
// tools/lesson-verify-foxgeese.js: the puzzles that pass are kept, the others are replaced by new random positions (gen_content.js's
// randomPos) that pass every check on their own (exact n by the strict theme, the engine's set = the strict set, 2 first moves at most,
// 4 legal moves / 3 wrong ones or more, no position within 4 points of another puzzle or lesson under the symmetries); then each theme
// is ordered by d (near misses × 2 + wrong first moves) so the 10-puzzle stages get no easier.
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const E = require('../engine.js'), V = require(path.join(ROOT, 'tools/lesson-verify-foxgeese.js'));
const FILE = path.join(ROOT, 'foxgeese/puzzles.json'), PZ = JSON.parse(fs.readFileSync(FILE, 'utf8')), LS = JSON.parse(fs.readFileSync(path.join(ROOT, 'foxgeese/lessons.json'), 'utf8'));
const RULE = PZ.rule; E.setRule(RULE);
const SECS = +process.argv[2] || 300;
let seed = +(process.env.SEED || 20261124); const rand = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
const ri = n => Math.floor(rand() * n);
const dist = (a, b) => Math.max(Math.abs(E.RC[a][0] - E.RC[b][0]), Math.abs(E.RC[a][1] - E.RC[b][1]));
function randomPos(k, side, near) {
  const fox = E.POINTS[ri(33)], b = Array(49).fill('.'); b[fox] = 'f';
  let n = 0;
  for (let g = 0; n < k && g < 2000; g++) { const i = E.POINTS[ri(33)]; if (b[i] !== '.') continue; if (rand() < near * Math.min(1, (dist(i, fox) - 1) / 3)) continue; b[i] = 'g'; n++; }
  if (n < k) return null;
  return { b: b.join(''), side, cap: E.RULES[RULE].geese - k, n: 20, rule: RULE };
}
const TH = { w2: { k: [8, 12], near: .9 }, w3: { k: [8, 12], near: .9 }, w4: { k: [8, 11], near: .9 }, t2: { k: [8, 12], near: .4 }, t3: { k: [8, 11], near: .4 } };
// the verifier on one theme of one puzzle: the findings that are about the puzzle itself (not ⑤ / ⑥)
function check(id, P) {
  const data = { version: 1, rule: RULE, kind: 'goal', daily: [], themes: [{ id, grp: '', puzzles: [P] }] };
  const r = V.verify({ data });
  return { bad: r.out.filter(o => !/^[⑤⑥]/.test(o.msg)), d: r.rows[0] && r.rows[0].d };
}
const near4 = (b, pool) => pool.some(x => x.sym.some(f => V.diff(b, V.symB(x.b, f)) <= 4));
// 1) what fails now
const all = V.verify({});
const badKeys = new Set(all.out.filter(o => o.q > 0).map(o => o.theme + '#' + o.q));
// ⑥ findings point at a stage, not a puzzle: they are fixed by the ordering
for (const o of all.out) if (/^⑥/.test(o.msg)) badKeys.delete(o.theme + '#' + o.q);
// ⑤: of a near pair, keep the earlier one (the first seen), replace the later
const pool = [];
(LS.steps || []).forEach(st => st.problems.forEach(P => pool.push({ b: P.s.b, sym: V.SYM8.filter((_, t) => t === 0 || t === 2) })));
const keep = {};
for (const T of PZ.themes) {
  keep[T.id] = [];
  T.puzzles.forEach((P, j) => {
    const own = all.out.filter(o => o.theme === T.id && o.q === j + 1 && !/^[⑤⑥]/.test(o.msg));
    if (own.length || near4(P.s.b, pool)) return;
    keep[T.id].push(P); pool.push({ b: P.s.b, sym: V.SYM8 });
  });
}
const rows = {};
for (const T of PZ.themes) {
  const th = V.THEME[T.id], [goal, n, side] = th, need = T.puzzles.length, L = keep[T.id], t0 = Date.now();
  let tries = 0, made = 0;
  while (L.length < need && Date.now() - t0 < SECS * 1000) {
    tries++;
    const k = TH[T.id].k[0] + ri(TH[T.id].k[1] - TH[T.id].k[0] + 1), s = randomPos(k, side, TH[T.id].near); if (!s) continue;
    const pos = E.Pos.from(s); if (E.judge(pos).over) continue;
    const Lm = pos.moves(); if (Lm.length < 4) continue;
    if (side === 1 && Lm.some(m => E.jumped(m).length)) continue;
    if (side === 2 && (() => { const q = pos.clone(); q.side = 0; return q.foxMoves([]).some(m => E.jumped(m).length); })()) continue;
    if (near4(s.b, pool)) continue;
    // quick pre-filter with the strict solver
    V.setMemo(); let good;
    try { good = V.goodSet(pos, n, goal); if (!good.length || good.length > 2 || Lm.length - good.length < 3) continue; if (n > 1 && V.goodSet(pos, n - 1, goal).length) continue; } catch (e) { continue; }
    const P = { s, n, g: goal }, c = check(T.id, P);
    if (c.bad.length) continue;
    L.push(P); pool.push({ b: s.b, sym: V.SYM8 }); made++;
  }
  console.log(T.id, 'kept', L.length - made, 'new', made, 'tries', tries, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  // 2) order by d
  const D = L.map(P => ({ P, d: check(T.id, P).d }));
  D.sort((a, b) => a.d - b.d);
  T.puzzles = D.map(x => x.P); rows[T.id] = D.map(x => x.d);
}
PZ.version = (PZ.version || 1) + 1;
fs.writeFileSync(FILE, JSON.stringify(PZ));
console.log(JSON.stringify(rows));
