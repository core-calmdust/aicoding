// Verify puzzles with the engine (same rules as the originals):
//   turn — the best first move is unique, goal = its haul, second = best other first move, line = an optimal line
//   pick — sc = exact solve values per pit, best = the unique maximum
//   end  — exact solve: best unique, v / second, goal = final stores, n = your moves in the perfect line
// usage: node tools/verify.js [--all]   (default: only the slots replaced on 2026-10-21 and their old versions)
'use strict';
const E = require('../engine.js');
const PZ = require('../puzzles.json');
function playoutN(b, rules) {
  let bb = Int8Array.from(b), side = 0, n = 0;
  for (let guard = 0; guard < 200; guard++) {
    if (E.sideSum(bb, 0) === 0 || E.sideSum(bb, 1) === 0) break;
    const s = E.solve(bb, side, rules); let best = s.list[0]; for (const x of s.list) if (x.v > best.v) best = x;
    const t = E.trace(bb, side, best.m, rules); if (side === 0) n++;
    bb = t.board; if (t.over) break; side = t.next;
  }
  return n;
}
function check(P) {
  const b = Int8Array.from(P.b), R = P.rules;
  if (b.some(x => x < 0) || b.reduce((a, x) => a + x, 0) % 12) return 'bad board';
  if (E.sideSum(b, 0) === 0 || E.sideSum(b, 1) === 0) return 'game over';
  if (P.kind === 'turn') {
    const g = E.turnMaxFirst(b, 0, R), lg = E.legal(b, 0), m = Math.max(...lg.map(k => g[k]));
    if (lg.filter(k => g[k] === m).length !== 1 || g[P.best] !== m || P.goal !== m) return 'turn best';
    if (P.second !== Math.max(...lg.filter(k => k !== P.best).map(k => g[k]))) return 'second';
    const tm = E.turnMax(b, 0, R); if (!tm.lines.some(l => JSON.stringify(l) === JSON.stringify(P.line)) || P.n !== P.line.length) return 'line';
    return '';
  }
  const s = E.solve(b, 0, R), sc = [0, 1, 2, 3, 4, 5].map(k => { const x = s.list.find(y => y.m === k); return x ? x.v : null; });
  const v = sc.filter(x => x !== null), m = Math.max(...v);
  if (v.filter(x => x === m).length !== 1 || sc[P.best] !== m) return 'best not unique';
  if (P.kind === 'pick') return JSON.stringify(sc) === JSON.stringify(P.sc) ? '' : 'sc';
  const second = Math.max(...sc.filter((x, i) => x !== null && i !== P.best)), T = P.b.reduce((a, x) => a + x, 0);
  if (P.v !== m || P.second !== second || P.goal[0] !== (T + m) / 2 || P.goal[1] !== (T - m) / 2) return 'values';
  return playoutN(b, R) === P.n ? '' : 'n';
}
const all = process.argv.includes('--all');
let ok = 0, bad = 0;
for (const C of PZ.cats) for (const T of C.themes) T.puzzles.forEach((P, j) => {
  const k = T.id + '-' + j, o = PZ.old && PZ.old[k];
  if (!all && !o) return;
  for (const [name, Q] of [[k, P]].concat(o ? [[k + ' (old)', o]] : [])) {
    const r = check(Q);
    if (!r) ok++;
    else if (Q === o) console.log('note', name, r, '(pre-refresh data, kept as it was)');
    else { bad++; console.log('NG', name, r); }
  }
});
console.log('verified', ok, 'ok,', bad, 'NG');
process.exit(bad ? 1 : 0);
