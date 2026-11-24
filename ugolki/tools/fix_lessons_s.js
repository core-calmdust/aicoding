// (2026-11-25 担当D, 3D対応) Rebuilds the problems of the strategy lessons s_far, s_ladder, s_road of ugolki/lessons.json under
// the strict rules of claude/lesson-quality.md (①〜⑨, 追1〜) — what tools/lesson-verify-ugolki-ls.js checks (classify):
//   every problem: White to move, 12 legal moves or more, 3 wrong or more, the right moves at most a third; no two positions
//   (every lesson, ramp and puzzle) within 4 squares of each other under the board's symmetries; no answer twice; easy → hard.
//   s_far    the farthest move (1–2 of them) is a chain of 2 hops or more over White pieces only, gaining 4 or more, 2 more than
//            any other move; the answer's piece is in the back half and a piece nearer the corner has a shorter forward jump
//   s_ladder the farthest move hops over Black (1–2 of them), 4 or more, 2 more than any other; hopping over White only gains
//            2 less or worse, and such a jump is there to compare
//   s_road   no jump goes forward now; the step (1–2) after which White's next move (Black standing still) goes farthest, a
//            chain gaining 4 or more, 2 more than after any other move, and the stepped piece is a rung of that chain
// Usage: node ugolki/tools/fix_lessons_s.js [--dry] [--games N]
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const E = require('../engine.js'); E.setRule('c33');
const V = require(path.join(ROOT, 'tools/lesson-verify-ugolki-ls.js'));
const IDS = (process.argv.find(a => a.startsWith('--ids=')) || '--ids=s_far,s_ladder,s_road').slice(6).split(',');
let seed = 112501; const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const ng = +(process.argv[process.argv.indexOf('--games') + 1]) || 500;
const POS = [];
for (let g = 0; g < ng; g++) {
  const mv = [], lv = [3 + Math.floor(rand() * 14), 3 + Math.floor(rand() * 14)], noise = 0.12 + rand() * 0.25;
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
const pool = [];
PZ.themes.forEach(T => T.puzzles.forEach(P => pool.push(P.s.b)));
LS.steps.forEach(st => { (st.ramp || []).forEach(r => r.s && pool.push(r.s.b)); if (!IDS.includes(st.id)) st.problems.forEach(P => pool.push(P.s.b)); });
const far = b => !pool.some(x => V.near(x, b));
const out = {}, stat = {};
for (const id of IDS) {
  const want = V.RULES[id], cand = []; stat[id] = {};
  for (const p of POS) {
    const c = V.classify(id, p); if (!c) continue;
    if (!c.pass) { for (const w of new Set(c.why)) stat[id][w.replace(/\d+/g, 'N')] = (stat[id][w.replace(/\d+/g, 'N')] || 0) + 1; continue; }
    cand.push({ s: p.spec(), c });
  }
  // spread over d (G·10 + lures): five levels from easy to hard, as far apart as the candidates allow
  cand.sort((a, b) => a.c.d - b.c.d);
  const lv = [...new Set(cand.map(x => x.c.d))], got = [];
  const goal = lv.length ? [0, 1, 2, 3, 4].map(k => lv[Math.round(k * (lv.length - 1) / 4)]) : [];
  for (const dv of goal) for (const x of cand.filter(x => x.c.d >= dv)) {
    if (got.length >= want.count) break;
    if (!far(x.s.b) || got.some(g => g.c.key === x.c.key || V.near(g.s.b, x.s.b))) continue;
    if (got.filter(g => g.c.d === x.c.d).length >= 2) continue;
    got.push(x); pool.push(x.s.b); break;
  }
  console.error(id, 'candidates', cand.length);
  if (got.length < want.count) { console.error('only', got.length, 'for', id, JSON.stringify(stat[id])); continue; }
  got.sort((a, b) => a.c.d - b.c.d || a.c.order - b.c.order);
  out[id] = got.map(g => ({ s: g.s, ok: g.c.ok, best: g.c.best }));
  console.error(id, got.map(g => `${E.name(E.Pos.from(g.s), g.c.best)} d${g.c.d} legal${g.c.legal} ok${g.c.ok.length}`).join(' | '));
}
for (const st of LS.steps) if (out[st.id]) st.problems = out[st.id];
if (!process.argv.includes('--dry')) fs.writeFileSync(file, JSON.stringify(LS));
