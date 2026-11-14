// The levels that must not change, against another copy of the engine (2026-11-14, claude/amazons-spec.md「レベルの測り直し」):
// every level's move along games and on random positions (a fixed seed for the weak levels' noise), the analysis's root values,
// a fixed-depth search, the candidate lists and the evaluation — the tables carried from search to search as in a worker.
//   node tools/check_levels.js <dir of the other engine.js + core-wasm.js> [levels=1-7,9-12]
'use strict';
const path = require('path'), { execFileSync } = require('child_process');
if (process.argv[2] === 'dump') {
  const E = require(path.join(process.argv[3], 'engine.js')), LV = [], out = [];
  for (const r of process.argv[4].split(',')) { const [a, b] = r.split('-').map(Number); for (let i = a; i <= (b || a); i++) LV.push(i); }
  let s = 5; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const P = [];
  for (let g = 0; g < 4; g++) {   // games: Lv.a vs Lv.b, every move of both
    const a = LV[(g * 3) % LV.length], b = LV[Math.min(LV.length - 1, (g * 3) % LV.length + 6 + g)], moves = [];
    for (let i = 0; i < 80; i++) {
      const { pos } = E.replay(null, moves); if (E.judge(pos).over) break;
      const lv = i % 2 ? b : a, r = E.think(null, moves, lv, rnd);
      out.push('g' + g + ' L' + lv + ' ' + r.move + ' ' + r.v + ' ' + (r.depth || 0));
      if (r.move == null || r.move < 0) break; moves.push(r.move);
      if (i % 9 === 4) P.push(moves.slice());
    }
  }
  for (const mv of P) {
    for (const lv of LV) { const r = E.think(null, mv, lv, rnd); out.push('p L' + lv + ' ' + r.move + ' ' + r.v + ' ' + (r.depth || 0)); }
    out.push('va3 ' + E.valuesAt(null, mv, 3).map(e => e.m + ':' + e.v).join(','));
    const t = E.think(null, mv, 0, null, null, { s: 1, dx: 4, nk: 1e7 }); out.push('d4 ' + t.move + ' ' + t.v);
    const { pos } = E.replay(null, mv); out.push('c ' + E.candList(pos, 12, 0, 14).map(c => c.m + ':' + c.s).join(','));
    out.push('ev ' + E.evaluate(pos));
  }
  console.log(JSON.stringify(out)); process.exit(0);
}
const other = path.resolve(process.argv[2]), lvs = process.argv[3] || '1-7,9-12';
const run = dir => JSON.parse(execFileSync(process.execPath, [__filename, 'dump', dir, lvs], { maxBuffer: 1 << 28 }).toString());
const a = run(path.join(__dirname, '..')), b = run(other);
let d = 0, first = -1;
for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) { d++; if (first < 0) first = i; }
console.log(`levels ${lvs}: ${a.length} results, ${d} differ` + (first >= 0 ? ` (first #${first}: this ${a[first]} | other ${b[first]})` : ''));
process.exit(d ? 1 : 0);
