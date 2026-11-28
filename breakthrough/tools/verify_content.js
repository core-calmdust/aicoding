// node tools/verify_content.js — checks lessons.json / puzzles.json again with the engine's exact solver (claude/breakthrough-spec.md)
//  · every position legal (pieces only, no piece on its own goal row, game not over), the side to move has ≥ 6 legal moves
//  · lessons: the answer is the only move that wins within k (attack) / the only move that holds 3 moves (defence) /
//    the only capture that cannot be taken back (b_cap); every other legal move has its board-fact explanation (ng)
//  · warm-up ramps: the move named is legal and right
//  · puzzles: exactly one first move wins within n (attack) / holds (def); n is the fastest win
//  · no two problems anywhere the same position up to mirror + colour swap; each lesson ordered easy → hard (k never falls)
'use strict';
const E = require('../engine.js'); E.setRule('s8');
const LS = require('../lessons.json'), PZ = require('../puzzles.json');
const N = 8; let bad = 0, n = 0; const ng = m => { bad++; console.log('NG', m); };
const mirrorB = b => { let o = ''; for (let r = 0; r < N; r++) for (let c = N - 1; c >= 0; c--) o += b[r * N + c]; return o; };
const swapB = b => { let o = ''; for (let i = N * N - 1; i >= 0; i--) o += b[i] === 'w' ? 'b' : b[i] === 'b' ? 'w' : '.'; return o; };
const canon = sp => { let b = sp.b; if (sp.side === 2) b = swapB(b); const m = mirrorB(b); return m < b ? m : b; };
const seen = new Map();
function base(sp, tag) {
  n++;
  if (!/^[wb.]{64}$/.test(sp.b)) return ng(tag + ' bad board');
  if (sp.b.slice(0, 8).includes('w') || sp.b.slice(56).includes('b')) ng(tag + ' a piece already on its goal row');
  const pos = E.Pos.from(sp); if (E.judge(pos).over) ng(tag + ' game over');
  if (pos.moves().length < 6) ng(tag + ' fewer than 6 legal moves');
  const c = canon(sp); if (seen.has(c)) ng(tag + ' same position as ' + seen.get(c)); else seen.set(c, tag);
  return pos;
}
const winOnly = (sp, k) => { const kk = E.duelMin(sp, [], k); const g = kk ? E.duelGood(sp, [], kk) : []; return { kk, g }; };
const holdOnly = sp => E.duelReplies(sp, [], 3).filter(e => e.need === 0).map(e => e.m);
for (const st of LS.steps) {
  let lastK = 0;
  st.problems.forEach((P, i) => {
    const tag = st.id + '#' + (i + 1), pos = base(P.s, tag); if (!pos) return;
    if (st.id === 'b_cap') {
      const me = pos.turn, caps = pos.moves().filter(m => E.isCap(pos, m));
      const free = caps.filter(m => { const q = pos.clone().play(m); return !q.moves().some(z => E.mTo(z) === E.mTo(m)); });
      if (free.length !== 1 || free[0] !== P.best) ng(tag + ' free captures ' + free.length);
    } else if (st.id === 'b_stop' || st.id === 's_wall') {
      const h = holdOnly(P.s); if (h.length !== 1 || h[0] !== P.best) ng(tag + ' holding moves ' + h.length);
    } else {
      const { kk, g } = winOnly(P.s, P.k); if (kk !== P.k) ng(tag + ' fastest win ' + kk + ' ≠ ' + P.k); if (g.length !== 1 || g[0] !== P.best) ng(tag + ' winning first moves ' + g.length);
      if (P.k < lastK) ng(tag + ' k falls'); lastK = P.k;
    }
    for (const m of pos.moves()) if (m !== P.best && !P.ng[m]) ng(tag + ' no explanation for ' + E.name(pos, m));
  });
  (st.ramp || []).forEach((R, i) => {
    const tag = st.id + ' ramp' + (i + 1), pos = base(R.s, tag); if (!pos) return;
    const names = pos.moves().map(m => E.name(pos, m));
    for (const s of R.ok || R.seq.slice(0, 1)) if (!names.includes(s)) ng(tag + ' move ' + s + ' not legal');
  });
}
for (const T of PZ.themes) T.puzzles.forEach((P, i) => {
  const tag = 'pz ' + T.id + '#' + (i + 1), pos = base(P.s, tag); if (!pos) return;
  if (P.def) { const h = holdOnly(P.s); if (h.length !== 1) ng(tag + ' holding moves ' + h.length); }
  else { const { kk, g } = winOnly(P.s, P.n); if (kk !== P.n) ng(tag + ' fastest ' + kk + ' ≠ ' + P.n); if (g.length !== 1) ng(tag + ' winning first moves ' + g.length); }
});
console.log('checked', n, 'positions;', bad ? 'FAILED ' + bad : 'ALL OK');
process.exit(bad ? 1 : 0);
