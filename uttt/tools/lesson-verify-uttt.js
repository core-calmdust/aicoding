// Checks every lesson problem (and warm-up try) and every puzzle of uttt/ (claude/lesson-quality.md ①–⑨ as they apply here):
// ① the answer is legal and the engine's best (two depths) / the prover's win · ② one answer, the next move clearly worse ·
// ③ 3+ legal moves · ④ the lesson's theme holds on the board · ⑤ no position twice (symmetries included, lessons + puzzles) ·
// ⑥ easy → hard (legal moves do not go down) · ⑦⑧ every wrong move has a board fact and its text fills every value (ja / en) ·
// puzzles: the proven win within n, none within n − 1, unique first move (≤ 2), fun ≥ 70, lineOk.
// node tools/lesson-verify-uttt.js [--quick]
const E = require('../engine.js'); E.setRule('std');
const F = require('../ls-facts.js'), fun = require('./fun.js'), fs = require('fs');
global.window = { I18N: { ja: {}, en: {} } }; global.I18N = window.I18N; require('../i18n-ut.js');
const L = JSON.parse(fs.readFileSync(__dirname + '/../lessons.json', 'utf8')), PZ = JSON.parse(fs.readFileSync(__dirname + '/../puzzles.json', 'utf8'));
const quick = process.argv.includes('--quick');
const SYM = (() => { const out = []; for (let k = 0; k < 8; k++) { const map = []; for (let m = 0; m < 81; m++) { let r = E.grow(m), c = E.gcol(m); if (k & 4) [r, c] = [c, r]; if (k & 1) r = 8 - r; if (k & 2) c = 8 - c; map.push(E.mAt(r, c)); } out.push(map); } return out; })();
const symKey = s => { const pos = E.Pos.from(s); let best = null; for (const map of SYM) { const a = Array(81).fill('.'); for (let m = 0; m < 81; m++) a[map[m]] = '.xo'[pos.c[m]]; const f = pos.forced < 0 ? -1 : E.mB(map[pos.forced * 9 + 4]); const k = a.join('') + f + pos.side; if (best === null || k < best) best = k; } return best; };
let bad = 0, n = 0; const seen = new Map();
const fail = (where, msg) => { bad++; console.log('NG', where, msg); };
const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : '{' + y + '}');
function theme(id, pos, ans) {
  const me = pos.turn, m = ans[0], q = pos.clone().play(m), took = !pos.own[E.mB(m)] && q.own[E.mB(m)] === me;
  switch (id) {
    case 'b_take': return took && q.res < 0;
    case 'b_big': return q.res === me;
    case 'b_block': return F.winCells(pos, pos.forced, 3 - me).includes(m);
    case 'b_send': return F.after(E, pos, m).k === 'ok';
    case 's_look': return !took && pos.moves().some(x => { const z = pos.clone().play(x); return !pos.own[E.mB(x)] && z.own[E.mB(x)] === me; });
    case 's_free': return pos.forced < 0 && F.keyBoards(E, pos).includes(E.mB(m));
    case 's_force2': { const g1 = E.duelGood(pos.spec(), [], 1), g2 = E.duelGood(pos.spec(), [], 2); return g1 && !g1.length && g2 && g2.length === 1 && g2[0] === m; }
    case 's_force3': { const g2 = E.duelGood(pos.spec(), [], 2), g3 = E.duelGood(pos.spec(), [], 3); return g2 && !g2.length && g3 && g3.length === 1 && g3[0] === m; }
  }
  return false;
}
for (const st of L.steps) {
  let lastLegal = 0;
  const items = [...(st.ramp || []).filter(r => r.k === 'try').map(r => ['ramp', r]), ...st.problems.map((p, i) => ['#' + (i + 1), p])];
  for (const [tag, P] of items) {
    n++; const where = `${st.id} ${tag}`, pos = E.Pos.from(P.s), legal = pos.moves();
    if (!P.ok.every(m => legal.includes(m))) { fail(where, '① not legal'); continue; }
    if (P.ok.length !== 1) fail(where, '② answers ' + P.ok.length);
    if (legal.length < 3) fail(where, '③ legal ' + legal.length);
    if (!theme(st.id, pos, P.ok)) fail(where, '④ theme');
    if (!/^s_force|^b_big/.test(st.id) && !quick) {
      for (const d of [5, 7]) { E.core.x.ttclear(); const V = E.rootValues(pos, d, 8000); const a = V.find(e => e.m === P.ok[0]); const o = V.filter(e => e.m !== P.ok[0]); if (!a || o.some(e => e.v > a.v - 100)) { fail(where, `①② engine d${d}: answer ${a && a.v} vs ${Math.max(...o.map(e => e.v))}`); break; } }
    }
    if (tag !== 'ramp') { if (legal.length < lastLegal) fail(where, '⑥ easier after harder'); lastLegal = legal.length; }
    // ⑦⑧ every wrong move: a fact and a text with every value filled
    for (const m of legal) {
      const f = F.fact(E, st.id, P.s, m), right = P.ok.includes(m), bn = I18N.ja.bname;
      const v = { x: E.sqName(m), m: E.sqName(P.ok[0]), b: bn[E.mB(m)], t: f.t >= 0 ? bn[f.t] : I18N.ja['ls.anywhere'], r: f.r != null ? E.sqName(f.r) : 'R', tb: f.tb != null ? bn[f.tb] : '', n: 1 };
      if (right) { for (const l of ['ja', 'en']) { const s = fill(I18N[l]['ls.' + st.id + '.why'], v); if (/\{\w+\}/.test(s)) fail(where, '⑧ why ' + l + ' ' + s); } continue; }
      if (!/^s_force|^b_(big|take)$/.test(st.id) && !['lose', 'take'].includes(f.k)) fail(where, `⑦ wrong ${E.sqName(m)}: no refutation (${f.k})`);
      const k = f.k === 'take' && f.t < 0 ? 'takeFree' : f.k === 'miss' && st.id === 'b_big' ? 'missBig' : f.k;
      for (const l of ['ja', 'en']) { const s0 = I18N[l]['ls.ng.' + k]; if (!s0) { fail(where, '⑧ no text ls.ng.' + k); continue; } const s = fill(s0, v); if (/\{\w+\}/.test(s) || /\s{2}|^\s/.test(s)) fail(where, '⑧ ' + l + ' ' + s); }
      // the fact is true on the board: the reply is legal and does what the text says
      if (f.r != null) { const q = pos.clone().play(m), z = q.clone().play(f.r); if (f.k === 'lose' && z.res !== 3 - pos.turn) fail(where, '⑧ lose not true'); if (f.k === 'take' && !(z.own[f.tb] === 3 - pos.turn && !q.own[f.tb])) fail(where, '⑧ take not true'); }
    }
    const k = symKey(P.s); if (seen.has(k)) fail(where, '⑤ same as ' + seen.get(k)); seen.set(k, where);
  }
  for (const R of st.ramp || []) if (R.k === 'explain') { const k = symKey(R.s); if (seen.has(k)) fail(st.id + ' explain', '⑤ same as ' + seen.get(k)); seen.set(k, st.id + ' explain'); }
}
let np = 0;
for (const T of PZ.themes) T.puzzles.forEach((P, j) => {
  np++; const where = `pz ${T.id} #${j + 1}`;
  const g = E.duelGood(P.s, [], P.n); if (!g || g.slice().sort().join() !== P.sol.slice().sort().join()) fail(where, 'solution set differs');
  if (P.n > 1) { const g0 = E.duelGood(P.s, [], P.n - 1); if (!g0 || g0.length) fail(where, `wins in ${P.n - 1}`); }
  if (P.sol.length > 2) fail(where, 'too many first moves');
  if (!quick) { const r = fun.score(P); if (r.s < 70 || !r.ok) fail(where, 'fun ' + r.s); }
  const k = symKey(P.s); if (seen.has(k)) fail(where, '⑤ same as ' + seen.get(k)); seen.set(k, where);
});
console.log(`${n} lesson problems, ${np} puzzles — ${bad ? bad + ' NG' : 'all OK'}`);
process.exit(bad ? 1 : 0);
