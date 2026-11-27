// (2026-11-27 担当C) node latrunculi/tools/ls_gen_c.js [ids…] — rebuilds the lessons of lessons.json (Seneca rules) so that every
// problem meets claude/lesson-quality.md ①〜⑨ as tools/lesson-verify-latrunculi-ls.js counts them:
//  the goal's moves (latrunculi/ls-facts.js goal) = ok, 1 move (s_safe 2 at most, ≤ 1/3 of the legal moves); 8+ legal, 5+ wrong;
//  the hint's marks (ls-facts.js marks: the chances — enemy counters beside one of yours, the holders, the threatened counter) are
//  2 squares or more (s_safe 1) and 3+ moves go next to them, 2+ of them wrong (the marks never single the answer out, 追17・追52);
//  every wrong move's words are true on the board (ls-facts.js wrong); s_two ok = the engine's goalGood (2 moves, take) too; no two
//  positions within 4 squares under the 8 symmetries × the colours (the other lessons and the 250 puzzles); easy → hard by
//  d = wrong + 2 × the wrong moves next to the marks.
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const E = require(path.join(ROOT, 'engine.js')); E.setRule('seneca');
const F = require(path.join(ROOT, 'ls-facts.js')).make(E);
const LP = path.join(ROOT, 'lessons.json'), L = JSON.parse(fs.readFileSync(LP, 'utf8')), PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'puzzles.json'), 'utf8'));
let seed = +(process.env.SEED || 20261127); const rand = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
const ri = n => Math.floor(rand() * n);
function sandwiched(sq, i) {
  const p = sq[i], o = 3 - p, N = E.NB[i];
  if ((N[0] >= 0 && N[1] >= 0 && sq[N[0]] === o && sq[N[1]] === o) || (N[2] >= 0 && N[3] >= 0 && sq[N[2]] === o && sq[N[3]] === o)) return true;
  if (E.CORNER[i] >= 0) { const [a, b] = E.CADJ[E.CORNER[i]]; if (sq[a] === o && sq[b] === o) return true; }
  return false;
}
function randomPos(k1, k2, side, lo, hi, fix, skip) {
  for (let t = 0; t < 200; t++) {
    const sq = new Int8Array(64); if (fix) for (const [i, p] of fix) sq[i] = p;
    for (const [k, p] of [[k1, 1], [k2, 2]]) { let n = sq.filter(x => x === p).length; for (let g = 0; n < k && g < 500; g++) { const i = (lo + ri(hi - lo + 1)) * 8 + lo + ri(hi - lo + 1); if (!sq[i]) { sq[i] = p; n++; } } }
    let ok = true; for (let i = 0; i < 64 && ok; i++) if (sq[i] && i !== skip && sandwiched(sq, i)) ok = false;
    if (!ok) continue;
    let b = ''; for (let i = 0; i < 64; i++) b += '.bw'[sq[i]];
    return { b, side, hand: [0, 0], cap: [0, 0], n: 40, rule: 'seneca' };
  }
  return null;
}
// ---- the symmetry distance (⑤)
const SYM = []; for (let k = 0; k < 8; k++) SYM.push(i => { let r = i >> 3, c = i & 7; if (k & 1) c = 7 - c; if (k & 2) r = 7 - r; if (k & 4) [r, c] = [c, r]; return r * 8 + c; });
const norm = b => b.replace(/[hvc]/g, 'b').replace(/[HVC]/g, 'w');
function variants(b) { const out = []; b = norm(b); for (const f of SYM) { const a = Array(64); for (let i = 0; i < 64; i++) a[f(i)] = b[i]; const s = a.join(''); out.push(s, s.replace(/[bw]/g, x => x === 'b' ? 'w' : 'b')); } return out; }
const dist = (a, b) => { let n = 0; for (let i = 0; i < 64; i++) if (a[i] !== b[i]) n++; return n; };
const far = (b, pool) => { const V = variants(b); return pool.every(o => V.every(v => dist(v, o) > 4)); };
// ---- one problem's numbers
function measure(id, s) {
  const pos = E.Pos.from(s), ms = pos.moves(), G = F.goal(id, pos), M = F.marks(id, pos), T = F.touch(id, pos), tw = T.filter(m => !G.includes(m)).length;
  return { pos, ms, G, M, T, tw, d: ms.length - G.length + 2 * tw };
}
const sideOf = k => 1 + (k % 2);
const corners = [0, 7, 56, 63];
function base(id, m, k) {
  const { pos, ms, G, M, T, tw } = m, me = pos.turn;
  if (ms.length < 8 || ms.length - G.length < 5) return false;
  if (id === 's_safe' ? (G.length < 1 || G.length > 2) : G.length !== 1) return false;
  if (G.length * 3 > ms.length) return false;
  if (M.length < (id === 's_safe' ? 1 : 2) || T.length < 3 || tw < 2) return false;
  // every wrong move's words hold on the board
  for (const x of ms) {
    if (G.includes(x)) continue;
    const w = F.wrong(id, pos, x);
    if (w.k === 'ls.ng.other') return false;
    if (id === 's_safe' && !w.hr) return false;
    if (id === 'b_rescue' && !w.still.length) return false;
    if (id === 's_two' && w.k === 'ls.s_two.ng' && !w.v.r) return false;
  }
  return true;
}
const MAKE = {
  b_block: k => randomPos(4 + ri(2), 4 + ri(2), sideOf(k), 1, 6),
  b_edge: k => randomPos(5, 5, sideOf(k), 0, 7),
  b_corner: k => { const me = sideOf(k), a = ri(4), b = (a + 1 + ri(3)) % 4; return randomPos(5, 5, me, 0, 7, [[corners[a], 3 - me], [corners[b], 3 - me], [E.CADJ[a][ri(2)], me], [E.CADJ[b][ri(2)], me]]); },
  b_rescue: k => {
    const me = sideOf(k), r = 1 + ri(6), c = 1 + ri(6), hz = ri(2), x = r * 8 + c, h1 = hz ? x - 1 : x - 8, h2 = hz ? x + 1 : x + 8;
    const s = randomPos(5 + ri(2), 5, me, 0, 7, [[x, me], [h1, 3 - me], [h2, 3 - me]], x); if (!s) return null;
    const a = s.b.split(''); a[x] = (me === 1 ? 'hv' : 'HV')[hz ? 0 : 1]; s.b = a.join(''); return s;
  },
  s_safe: k => randomPos(5 + ri(2), 5 + ri(2), sideOf(k), 1, 6),
  s_double: k => randomPos(6 + ri(2), 6 + ri(2), sideOf(k), 1, 6),
  s_two: k => randomPos(6 + ri(2), 6 + ri(2), sideOf(k), 1, 6),
};
function extra(id, m, s) {
  const { pos, ms, G } = m;
  if (id === 'b_block') return ms.every(x => G.includes(x) || !E.effect(pos, x).blocks.length);
  if (id === 'b_edge' || id === 'b_corner') return ms.every(x => G.includes(x) || !E.effect(pos, x).blocks.length);
  if (id === 'b_rescue') { let n = 0; for (let i = 0; i < 64; i++) if (pos.inc[i]) n++; return n === 1 && pos.blocked(s.b.search(/[hvHV]/)); }
  if (id === 's_safe') return F.threatened(pos).length === 1 && ms.every(x => !E.effect(pos, x).blocks.length);
  if (id === 's_double') return ms.some(x => E.effect(pos, x).blocks.length === 1);
  if (id === 's_two') {
    if (!ms.some(x => !G.includes(x) && E.effect(pos, x).blocks.length)) return false;
    const g = E.goalGood(s, [], 2, { goal: 'take' }, 'seneca', 400000);
    return !!g && g.length === G.length && g.every(x => G.includes(x));
  }
  return true;
}
const ids = process.argv.slice(2).filter(x => !x.startsWith('-'));
const pool = []; PZ.themes.forEach(T => T.puzzles.forEach(P => pool.push(norm(P.s.b))));
for (const st of L.steps) if (!ids.includes(st.id)) st.problems.forEach(P => pool.push(norm(P.s.b)));
for (const st of L.steps) {
  if (!ids.includes(st.id)) continue;
  const C = [], seen = new Set(), t0 = Date.now();
  for (let g = 0, k = 0; C.length < 40 && g < 400000 && Date.now() - t0 < 180000; g++) {
    const s = MAKE[st.id](k); if (!s || seen.has(s.b)) continue; seen.add(s.b);
    const m = measure(st.id, s); if (!base(st.id, m, k) || !extra(st.id, m, s)) continue;
    if (!far(s.b, pool) || !far(s.b, C.map(c => norm(c.s.b)))) continue;
    C.push({ s, ok: m.G.slice(), d: m.d }); k++;
  }
  if (C.length < 5) throw new Error(st.id + ': only ' + C.length);
  C.sort((a, b) => a.d - b.d);
  // five spread from easy to hard, Black and White both to move
  const pick = []; for (let j = 0; j < 5; j++) pick.push(C[Math.round(j * (C.length - 1) / 4)]);
  st.problems = pick.map(c => ({ s: c.s, ok: c.ok, best: c.ok[0] }));
  pick.forEach(c => pool.push(norm(c.s.b)));
  console.log(st.id, C.length, 'cands', pick.map(c => c.d).join(' '), ((Date.now() - t0) / 1000).toFixed(0) + 's');
}
fs.writeFileSync(LP, JSON.stringify(L));
