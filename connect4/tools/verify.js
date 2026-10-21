// Verify every puzzle in puzzles.json (and the pre-refresh ones in PZ.old) with the engine:
//   mate  — exactly one first move connects four within n, n is the fastest, pv = the app's line
//   'b'   — stored sc = exact solver values (solveMove strong), exactly one move keeps the result
//   's'   — every step likewise; stored replies r are legal and best for the opponent
// usage: node tools/verify.js [--all]   (default: only the slots replaced on 2026-10-21 and their old versions)
'use strict';
const E = require('../engine.js');
const U = require('./c4util.js');
const PZ = require('../puzzles.json');
const PREF = [3, 2, 4, 1, 5, 0, 6];
function exact(mv) { const sc = []; for (let c = 0; c < 7; c++) { E.loadMoves(mv); if (U.grid(mv)[c].length >= 6) { sc.push(null); continue; } sc.push(E.solveMove(c, false)); } return sc; }
function only(sc, goal) {
  const ok = sc.map((v, c) => (v !== null && (goal === 'win' ? v > 0 : v >= 0)) ? c : -1).filter(c => c >= 0);
  if (goal === 'draw' && sc.some(v => v !== null && v > 0)) return -1;
  return ok.length === 1 ? ok[0] : -1;
}
function pvOf(mv, ans, n) {
  let m = mv + (ans + 1), pv = String(ans + 1), left = n - 1;
  while (left > 0) {
    const dl = E.defendList(m, left); let best = null;
    for (const c of PREF) { const e = dl.find(x => x.c === c); if (!e) continue; const v = e.need || 99; if (!best || v > best.v) best = { c, v }; }
    if (!best || best.v === 99) return null;
    m += best.c + 1; pv += best.c + 1;
    const al = E.mateList(m, left); let a = null;
    for (const c of PREF) { const e = al.find(x => x.c === c); if (e && e.need && e.need <= left && (!a || e.need < a.need)) a = e; }
    if (!a) return null; m += a.c + 1; pv += a.c + 1; left--;
  }
  return pv;
}
function check(P) {
  const g = U.grid(P.moves);
  if (g.some(c => c.length > 6)) return 'illegal';
  for (let i = 1; i <= P.moves.length; i++) { const h = U.grid(P.moves.slice(0, i - 1)), c = P.moves.charCodeAt(i - 1) - 49; if (U.isWinAfter(h, c, (i - 1) % 2 ? 2 : 1)) return 'game already over'; }
  if (!P.k) {
    const ml = E.mateList(P.moves, P.n).filter(e => e.need && e.need <= P.n);
    if (ml.length !== 1 || ml[0].c !== P.answer) return 'mate not unique';
    if (ml[0].need !== P.n) return 'faster win exists';
    if (pvOf(P.moves, P.answer, P.n) !== P.pv) return 'pv';
    return '';
  }
  if (P.k === 'b') {
    const sc = exact(P.moves);
    if (JSON.stringify(sc) !== JSON.stringify(P.sc)) return 'sc';
    return only(sc, P.goal) === P.answer ? '' : 'not unique';
  }
  let m = P.moves;
  for (const [i, st] of P.steps.entries()) {
    const sc = exact(m);
    if (JSON.stringify(sc) !== JSON.stringify(st.sc)) return 'sc step ' + i;
    if (only(sc, 'def') !== st.a) return 'step ' + i + ' not unique';
    m += st.a + 1;
    if (i < P.steps.length - 1) {
      const o = exact(m), bv = Math.max(...o.filter(v => v !== null));
      if (o[st.r] !== bv) return 'reply not best';
      m += st.r + 1;
    }
  }
  return '';
}
const all = process.argv.includes('--all');
let ok = 0, bad = 0;
PZ.levels.forEach(lv => lv.puzzles.forEach((P, j) => {
  const k = lv.id + ':' + j;
  const list = all || (PZ.old && PZ.old[k]) ? [[k, P]].concat(PZ.old && PZ.old[k] ? [[k + ' (old)', PZ.old[k]]] : []) : [];
  for (const [name, Q] of list) { const r = check(Q); if (r) { bad++; console.log('NG', name, r); } else ok++; }
}));
console.log('verified', ok, 'ok,', bad, 'NG');
process.exit(bad ? 1 : 0);
