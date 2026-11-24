// (2026-11-25 担当D, 3D対応) Rebuilds the problems of the strategy lesson s_deep (fill the corner fast, Black standing still) of
// ugolki/lessons.json under the strict rules of claude/lesson-quality.md (①〜⑨, 追1〜, 追74) — what
// tools/lesson-verify-ugolki-ls.js checks (classify 's_deep'): White to move, the fewest White moves to fill the corner with Black
// frozen 3–6 (an exact solver after every legal move), the answer 1–2 moves, every other move slower, a slower move into the
// corner (the lure), 12 legal moves or more, the right moves at most a third; no two positions within 4 squares under the board's
// symmetries; steps and jumps, going in and staying outside among the answers; easy → hard. Each problem keeps dn: the count of
// every legal move (the 3D words read it; the checker recomputes it). The 2D warm-up (explain) is rebuilt from a further position:
// the arrow the one fastest move, a mark where a slower move goes in, the words (ramp_s_deep.json, 14 languages) with its counts.
// Usage: node ugolki/tools/fix_lessons_s3.js [--dry] [--games N] [--seed=S]
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const E = require('../engine.js'); E.setRule('c33');
const V = require(path.join(ROOT, 'tools/lesson-verify-ugolki-ls.js'));
let seed = +(process.argv.find(a => a.startsWith('--seed=')) || '--seed=112503').slice(7);
const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const ng = +(process.argv[process.argv.indexOf('--games') + 1]) || 200;
const T1 = E.target(1);
const POS = [];
for (let g = 0; g < ng; g++) {
  const mv = [], lv = [3 + Math.floor(rand() * 14), 3 + Math.floor(rand() * 14)], noise = 0.1 + rand() * 0.25;
  for (let i = 0; i < 160; i++) {
    const { pos, hashes } = E.replay(null, mv);
    if (E.judge(pos, hashes).over) break;
    if (pos.side === 0) { const out = pos.count(1) - pos.inTarget(1); if (out >= 2 && out <= 6 && !pos.inHome(1) && pos.ply <= 140) POS.push(pos.clone()); }
    const L = pos.moves().filter(x => x !== E.PASS);
    const m = rand() < noise ? L[Math.floor(rand() * L.length)] : E.think(null, mv, lv[pos.side], rand).move;
    if (m == null || m < 0) break; mv.push(m);
  }
}
console.error('positions', POS.length);
const file = path.join(ROOT, 'ugolki/lessons.json'), LS = JSON.parse(fs.readFileSync(file, 'utf8'));
const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'ugolki/puzzles.json'), 'utf8'));
const pool = [];
PZ.themes.forEach(T => T.puzzles.forEach(P => pool.push(P.s.b)));
LS.steps.forEach(st => { (st.ramp || []).forEach(r => r.s && st.id !== 's_deep' && pool.push(r.s.b)); if (st.id !== 's_deep') st.problems.forEach(P => pool.push(P.s.b)); });
const far = b => !pool.some(x => V.near(x, b));
const cand = [], stat = {}, seen = new Set();
let done_ = 0;
for (const p of POS) {
  if (++done_ % 200 === 0) console.error('..', done_, cand.length);
  const sp = p.spec(); if (seen.has(sp.b)) continue; seen.add(sp.b);
  const N = V.deepDist(p, 6); if (!(N >= 3 && N <= 6)) { stat.N = (stat.N || 0) + 1; continue; }
  const c = V.classify('s_deep', p); if (!c) continue;
  if (!c.pass) { for (const w of new Set(c.why)) stat[w.replace(/\d+/g, 'N')] = (stat[w.replace(/\d+/g, 'N')] || 0) + 1; continue; }
  cand.push({ s: sp, c, p });
}
console.error('candidates', cand.length, JSON.stringify(stat).slice(0, 800));
cand.sort((a, b) => a.c.d - b.c.d);
const want = V.RULES.s_deep, got = [];
const goalN = [3, 4, 4, 5, 6];
for (let k = 0; k < 5; k++) {
  const fits = x => far(x.s.b) && !got.some(g => g.c.key === x.c.key || V.near(g.s.b, x.s.b)) && (!got.length || x.c.d >= got[got.length - 1].c.d)
    && (k < 4 || (got.some(g => g.c.jump) || x.c.jump) && (got.some(g => !g.c.jump) || !x.c.jump) && (got.some(g => g.c.inAns) || x.c.inAns) && (got.some(g => !g.c.inAns) || !x.c.inAns));
  const x = cand.find(y => y.c.N >= goalN[k] && fits(y) && want.slotOk(got.map(g => g.c), y.c)) || cand.find(y => fits(y) && want.slotOk(got.map(g => g.c), y.c));
  if (x) { got.push(x); pool.push(x.s.b); }
}
if (got.length < 5) { console.error('only', got.length); process.exit(1); }
got.sort((a, b) => a.c.d - b.c.d);
const dnOf = (p) => p.moves().filter(m => m !== E.PASS).map(m => [m, V.factOf('s_deep', p, m).n]);
const probs = got.map(g => ({ s: g.s, ok: g.c.ok, best: g.c.best, dn: dnOf(g.p) }));
console.error(got.map(g => `${E.name(g.p, g.c.best)} N${g.c.N} d${g.c.d} legal${g.c.legal} ok${g.c.ok.length} lure${g.c.lure} jump${+g.c.jump} in${+g.c.inAns}`).join(' | '));
// the 2D warm-up: one fastest move, a slower move into the corner (marked), far from every position
let ramp = null;
for (const x of cand) {
  if (x.c.ok.length !== 1 || got.includes(x) || !far(x.s.b)) continue;
  const p = x.p, N = x.c.N, slow = p.moves().filter(m => m !== E.PASS).map(m => [m, V.factOf('s_deep', p, m)]).filter(([m, f]) => f.k === 'in' && f.n > N);
  if (!slow.length) continue;
  slow.sort((a, b) => b[1].n - a[1].n);
  const [sm, sf] = slow[0], tpl = JSON.parse(fs.readFileSync(path.join(__dirname, 'ramp_s_deep.json'), 'utf8'));
  const v = { N, m: E.name(p, x.c.best), x: E.name(p, sm), q: E.sqName(E.mTo(sm)), X: sf.n, d: sf.n - N, o: p.count(1) - p.inTarget(1) };
  const body = {}; for (const l in tpl) body[l] = tpl[l].replace(/\{(\w)\}/g, (_, k) => v[k]);
  ramp = { k: 'explain', s: x.s, seq: [v.m], marks: [[E.mTo(sm), 'ng']], body };
  console.error('ramp', JSON.stringify(v)); break;
}
if (!ramp) { console.error('no ramp'); process.exit(1); }
const st = LS.steps.find(s => s.id === 's_deep');
const TT = { ja: '手数を数えて選ぶ', en: 'Count the moves', zh: '数步数再选', 'zh-TW': '數手數再選', ko: '수를 세어 고른다', es: 'Cuenta las jugadas', fr: 'Comptez les coups', pt: 'Conte os lances', de: 'Züge zählen', ru: 'Считайте ходы', tr: 'Hamleleri say', id: 'Hitung langkahnya', hi: 'चालें गिनो', ar: 'عُدّ النقلات' };
st.problems = probs; st.ramp = [{ k: 'explain', s: ramp.s, seq: ramp.seq, marks: ramp.marks, t: TT, body: ramp.body }];
if (!process.argv.includes('--dry')) fs.writeFileSync(file, JSON.stringify(LS));
