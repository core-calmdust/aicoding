// (2026-11-25 担当D, 3D対応) Rebuilds the problems of the strategy lessons s_block (block their road) and s_leave (the 40-move
// rule) of ugolki/lessons.json under the strict rules of claude/lesson-quality.md (①〜⑨, 追1〜) — what
// tools/lesson-verify-ugolki-ls.js checks (classify): White to move, 12 legal moves or more, 3 wrong or more, the right moves at
// most a third; no two positions (every lesson, ramp and puzzle) within 4 squares under the board's symmetries; no answer twice;
// easy → hard.
//   s_block  Black's longest move now is a chain (2 hops or more, 4 squares or more); the answer (1–2 moves) leaves Black's
//            farthest reply shortest, 2 shorter than now and 2 shorter than after any other move; it takes a landing square or
//            moves a springboard away, and goes back 1 square at most; a forward move of 2 or more that does not block tempts.
//   s_leave  White's 39th or 40th move with pieces still in the starting corner; the answer = the moves after which White empties
//            the corner by its 40th move whatever Black replies. Positions from games where White leaves 1–2 pieces at home
//            (the straggler this lesson warns about).
// Usage: node ugolki/tools/fix_lessons_s2.js [--dry] [--games N] [--ids=s_block,s_leave]
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const E = require('../engine.js'); E.setRule('c33');
const V = require(path.join(ROOT, 'tools/lesson-verify-ugolki-ls.js'));
const IDS = (process.argv.find(a => a.startsWith('--ids=')) || '--ids=s_block,s_leave').slice(6).split(',');
let seed = +(process.argv.find(a => a.startsWith('--seed=')) || '--seed=112502').slice(7);
const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const ng = +(process.argv[process.argv.indexOf('--games') + 1]) || 300;
const HOME = E.HOME()[1], HL = E.HOMEL()[1];
const POS = { s_block: [], s_leave: [] };
for (let g = 0; g < ng; g++) {
  // lazy: White keeps 1–2 pieces of its starting corner at home until a late move (the straggler)
  const lazy = new Set(), nl = rand() < 0.5 ? 1 : 2; while (lazy.size < nl) lazy.add(HL[Math.floor(rand() * HL.length)]);
  const lazyTo = 2 * (34 + Math.floor(rand() * 6));
  const mv = [], lv = [3 + Math.floor(rand() * 14), 3 + Math.floor(rand() * 14)], noise = 0.1 + rand() * 0.2;
  for (let i = 0; i < 160; i++) {
    const { pos, hashes } = E.replay(null, mv);
    if (E.judge(pos, hashes).over) break;
    if (pos.side === 0) { if (pos.ply >= 10 && pos.ply <= 64) POS.s_block.push(pos.clone()); if (pos.ply === 76 || pos.ply === 78) POS.s_leave.push(pos.clone()); }
    const L = pos.moves().filter(x => x !== E.PASS);
    let m;
    if (rand() < noise) m = L[Math.floor(rand() * L.length)]; else m = E.think(null, mv, lv[pos.side], rand).move;
    if (pos.side === 0 && pos.ply < lazyTo && lazy.has(E.mFrom(m))) {   // the lazy piece stays: the best other move by gain
      const D = E.DIST()[1], o = L.filter(x => !lazy.has(E.mFrom(x)));
      if (o.length) { o.sort((a, b) => (D[E.mFrom(b)] - D[E.mTo(b)]) - (D[E.mFrom(a)] - D[E.mTo(a)]) || rand() - 0.5); m = o[0]; }
    }
    if (pos.side === 0 && pos.ply < lazyTo) for (const x of [...lazy]) if (pos.sq[x] !== 1) lazy.delete(x);
    if (m == null || m < 0) break; mv.push(m);
  }
}
console.error('positions', POS.s_block.length, POS.s_leave.length);
const file = path.join(ROOT, 'ugolki/lessons.json'), LS = JSON.parse(fs.readFileSync(file, 'utf8'));
const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'ugolki/puzzles.json'), 'utf8'));
const pool = [];
PZ.themes.forEach(T => T.puzzles.forEach(P => pool.push(P.s.b)));
LS.steps.forEach(st => { (st.ramp || []).forEach(r => r.s && pool.push(r.s.b)); if (!IDS.includes(st.id)) st.problems.forEach(P => pool.push(P.s.b)); });
const far = b => !pool.some(x => V.near(x, b));
const out = {};
for (const id of IDS) {
  const want = V.RULES[id], cand = [], stat = {}, seen = new Set();
  for (const p of POS[id]) {
    const sp = p.spec(); if (seen.has(sp.b)) continue; seen.add(sp.b);
    const c = V.classify(id, p); if (!c) continue;
    if (!c.pass) { for (const w of new Set(c.why)) stat[w.replace(/\d+/g, 'N')] = (stat[w.replace(/\d+/g, 'N')] || 0) + 1; continue; }
    cand.push({ s: sp, c });
  }
  console.error(id, 'candidates', cand.length, JSON.stringify(stat).slice(0, 600));
  const kinds = {}; cand.forEach(x => { kinds[x.c.kind] = (kinds[x.c.kind] || 0) + 1; }); console.error(' kinds', JSON.stringify(kinds));
  cand.sort((a, b) => a.c.d - b.c.d);
  // s_leave: 2 × the last move, then the 39th (2 pieces / a deep piece); s_block: spread over d, the kinds mixed
  const plan = id === 's_leave' ? ['last', 'last', 'deep', 'two', 'two'] : null;
  const got = [];
  const lv = [...new Set(cand.map(x => x.c.d))];
  const goal = id === 's_block' ? [0, 1, 2, 3, 4].map(k => lv[Math.round(k * (lv.length - 1) / 4)]) : plan;
  for (let k = 0; k < 5; k++) {
    const pick = cand.filter(x => id === 's_leave' ? x.c.kind === goal[k] || (goal[k] === 'deep' && x.c.kind === 'two' && !cand.some(y => y.c.kind === 'deep')) : x.c.d >= goal[k]);
    const fits = x => far(x.s.b) && !got.some(g => g.c.key === x.c.key || V.near(g.s.b, x.s.b)) && want.slotOk(got.map(g => g.c), x.c) && got.filter(g => g.c.d === x.c.d).length < 2 && (!got.length || x.c.d >= got[got.length - 1].c.d);
    const x = pick.find(fits) || (id === 's_block' ? cand.slice().reverse().find(fits) : null);
    if (x) { got.push(x); pool.push(x.s.b); }
  }
  if (got.length < want.count) { console.error('only', got.length, 'for', id); continue; }
  got.sort((a, b) => a.c.d - b.c.d || a.c.order - b.c.order);
  out[id] = got.map(g => ({ s: g.s, ok: g.c.ok, best: g.c.best }));
  console.error(id, got.map(g => `${E.name(E.Pos.from(g.s), g.c.best)} ${g.c.kind} d${g.c.d} legal${g.c.legal} ok${g.c.ok.length}`).join(' | '));
}
// the s_block warm-up (2D 'explain'): a landing-square block not used above, far from every position; the words from
// ugolki/tools/ramp_s_block.json (14 languages) with the board's numbers (the jumper, its hops and gain, the block, what is left)
let rampB = null;
if (out.s_block) {
  const UL = require(path.join(ROOT, 'atlas/ls-ugolki.js'));
  for (const p0 of POS.s_block) {
    const c = V.classify('s_block', p0); if (!c || !c.pass || c.ok.length !== 1 || c.kind !== 'land') continue;
    const sp = p0.spec(); if (!far(sp.b)) continue;
    const b0 = UL.blackBest(E, p0); if (b0.all.length !== 1 || b0.all[0].path.length < 3) continue;
    const tpl = JSON.parse(fs.readFileSync(path.join(__dirname, 'ramp_s_block.json'), 'utf8')), v = { a: E.sqName(b0.all[0].path[0]), h: b0.all[0].path.length - 1, G: c.G0, m: E.name(p0, c.best), B: c.B };
    const body = {}; for (const l in tpl) body[l] = tpl[l].replace(/\{(\w)\}/g, (_, k) => v[k]);
    rampB = { k: 'explain', s: sp, seq: [E.name(p0, c.best)], marks: [[b0.all[0].path[0], 'ng']], body };
    console.error('ramp s_block', JSON.stringify(v)); break;
  }
}
for (const st of LS.steps) if (out[st.id]) st.problems = out[st.id];
for (const st of LS.steps) if (st.id === 's_block' && rampB) st.ramp = [Object.assign({ k: 'explain', s: rampB.s, seq: rampB.seq, marks: rampB.marks, t: st.ramp[0].t, body: rampB.body })];
if (!process.argv.includes('--dry')) fs.writeFileSync(file, JSON.stringify(LS));
