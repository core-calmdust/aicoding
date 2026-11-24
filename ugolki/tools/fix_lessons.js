// (2026-11-24 担当D, 3D対応) Rebuilds the problems of the basic lessons of ugolki/lessons.json (b_step, b_jump, b_enter, b_finish)
// under the strict rules of claude/lesson-quality.md (①〜⑨, 追1〜) — what tools/lesson-verify-ugolki-ls.js checks:
//   every problem: White to move, 12 legal moves or more, 3 wrong moves or more, the right moves (ok = the whole set that does
//   what the goal asks) at most a third of the legal moves; no two positions (this lesson, the other lessons and ramps, the
//   puzzles) within 4 squares of each other under the board's symmetries; no answer twice in a lesson; easy → hard.
//   b_step   no jump gets closer; 2–4 steps get closer (the rest: sideways / back / no gain)
//   b_jump   the farthest move is a jump (1–2 of them); problems 1–2 a single hop with another jump to compare, 3–5 a chain of
//            3 hops or more with a shorter jump to compare (a jump that stops on the way, or goes elsewhere)
//   b_enter  1–2 moves bring a piece from outside into the corner, 3 forward moves or more that do not; a step and a jump among
//            the answers
//   b_finish 8 pieces home, the move that completes it (one), 3 forward moves or more that do not; Black cannot complete next
//            (completing wins); the answers both steps and jumps, 3 holes or more
// The ramps (the 2D warm-ups) and the other steps are kept. Usage: node ugolki/tools/fix_lessons.js [--dry]
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const E = require('../engine.js'); E.setRule('c33');
const V = require(path.join(ROOT, 'tools/lesson-verify-ugolki-ls.js'));
let seed = 91124; const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const POS = [];
for (let g = 0; g < 420; g++) {
  const mv = [], lv = [3 + Math.floor(rand() * 14), 3 + Math.floor(rand() * 14)], noise = 0.12 + rand() * 0.2;
  for (let i = 0; i < 200; i++) {
    const { pos, hashes } = E.replay(null, mv);
    if (E.judge(pos, hashes).over) break;
    if (pos.side === 0) POS.push(pos.clone());
    let m; const L = pos.moves().filter(x => x !== E.PASS);
    if (rand() < noise) m = L[Math.floor(rand() * L.length)]; else { const r = E.think(null, mv, lv[pos.side], rand); m = r.move; }
    if (m == null || m < 0) break; mv.push(m);
  }
}
for (let i = POS.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [POS[i], POS[j]] = [POS[j], POS[i]]; }
console.error('positions', POS.length);
const file = path.join(ROOT, 'ugolki/lessons.json'), LS = JSON.parse(fs.readFileSync(file, 'utf8'));
const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'ugolki/puzzles.json'), 'utf8'));
const IDS = ['b_step', 'b_jump', 'b_enter', 'b_finish'];
// the pool the new problems must stay away from: the puzzles, the other lessons, every ramp
const pool = [];
PZ.themes.forEach(T => T.puzzles.forEach(P => pool.push(P.s.b)));
LS.steps.forEach(st => { (st.ramp || []).forEach(r => r.s && pool.push(r.s.b)); if (!IDS.includes(st.id)) st.problems.forEach(P => pool.push(P.s.b)); });
const far = b => !pool.some(x => V.near(x, b));
const out = {};
for (const id of IDS) {
  const want = V.RULES[id], got = [];
  for (const p of POS) {
    if (got.length >= want.count) break;
    const s = p.spec(); if (!far(s.b)) continue;
    const c = V.classify(id, p, got.length); if (!c || !c.pass) continue;
    if (got.some(g => g.c.key === c.key || V.near(g.s.b, s.b))) continue;
    if (!want.slotOk(got.map(g => g.c), c)) continue;
    got.push({ s, c }); pool.push(s.b);
  }
  if (got.length < want.count) { console.error('only', got.length, 'for', id); process.exit(1); }
  got.sort((a, b) => a.c.d - b.c.d || a.c.order - b.c.order);
  out[id] = got.map(g => ({ s: g.s, ok: g.c.ok, best: g.c.best }));
  console.error(id, got.map(g => `${E.name(E.Pos.from(g.s), g.c.best)} d${g.c.d} legal${g.c.legal} ok${g.c.ok.length}`).join(' | '));
}
for (const st of LS.steps) if (out[st.id]) st.problems = out[st.id];
if (!process.argv.includes('--dry')) fs.writeFileSync(file, JSON.stringify(LS));
