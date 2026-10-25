// Rule tests on hand-made positions: the JS rules (engine.js) and the WebAssembly engine must agree.
// node tools/ruletest.js
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
const X = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(path.join(__dirname, '..', 'engine.wasm'))), { env: { now: () => Date.now(), progress: () => {} } }).exports;
const io = () => new Int32Array(X.memory.buffer, X.io_ptr(), 8192);
function spec(v, a, d, k, side) {
  const n = E.RULES[v].n, b = Array(n * n).fill('.');
  for (const s of a) b[E.sqParse(s, n)] = 'a'; for (const s of d) b[E.sqParse(s, n)] = 'd'; if (k) b[E.sqParse(k, n)] = 'k';
  return { v, b: b.join(''), side };
}
function cRes(sp, moves) {
  const p = E.Pos.from(sp), a = [E.VID[p.v], p.turn === 2 ? 1 : 0]; for (const x of p.b) a.push(x);
  a.push(moves.length); for (const m of moves) a.push(E.mFrom(m) | (E.mTo(m) << 8));
  io().set(a); if (!X.setup()) return { bad: true };
  X.puzzle(1, 0, 1); return { res: X.root_res(), n: io()[0] };
}
let fail = 0;
function T(name, sp, mv, exp) {
  const p = E.Pos.from(sp), n = p.n, m = E.sqParse(mv[0], n) + 256 * E.sqParse(mv[1], n);
  if (!p.moves().includes(m)) { console.log('FAIL (illegal move)', name); fail++; return; }
  const q = p.clone().play(m), c = cRes(sp, [m]);
  const caps = q.lastCaps.map(i => E.sqName(i, n)).sort().join(',');
  const ok = (exp.caps === undefined || caps === exp.caps) && (exp.res === undefined || q.res === exp.res) && (exp.why === undefined || q.why === exp.why) && c.res === q.res && (q.res || c.n === q.moves().length);
  if (!ok) { fail++; console.log('FAIL', name, { caps, res: q.res, why: q.why, c, exp }); } else console.log('ok  ', name, caps || '-', q.why || '');
}
const C = 'copenhagen';
T('custodial', spec(C, ['e7', 'c3'], ['e8', 'h6'], 'f2', 2), ['h6', 'e6'], { caps: 'e7', res: 0 });
T('moving in between is safe', spec(C, ['e7', 'e5', 'c3'], ['h6', 'b9'], 'f2', 2), ['h6', 'e6'], { caps: '', res: 0 });
T('corner is hostile', spec(C, ['b11', 'e4'], ['d11', 'g5'], 'f2', 2), ['d11', 'c11'], { caps: 'b11' });
T('empty throne hostile to defenders', spec(C, ['g9', 'c3', 'd2'], ['f7', 'h5'], 'b2', 1), ['g9', 'f9'], { caps: '' });
T('empty throne hostile (defender next to it)', spec(C, ['h7', 'c3', 'd2'], ['g6', 'h5'], 'b2', 1), ['h7', 'h6'], { caps: 'g6' });
T('throne with the king is not hostile to defenders', spec(C, ['h7', 'c3', 'd2'], ['g6'], 'f6', 1), ['h7', 'h6'], { caps: '' });
T('throne always hostile to attackers', spec(C, ['g6', 'c3'], ['h9', 'c9'], 'f6', 2), ['h9', 'h6'], { caps: 'g6' });
T('the king captures (armed)', spec(C, ['e7', 'c3'], ['e6', 'b5'], 'h8', 2), ['h8', 'e8'], { caps: 'e7' });
T('king 4 sides', spec(C, ['d5', 'c4', 'e4', 'h3', 'j9'], ['b9'], 'd4', 1), ['h3', 'd3'], { res: 1, why: 'capture' });
T('king 3 sides is not enough', spec(C, ['d5', 'c4', 'h3', 'j9'], ['b9'], 'd4', 1), ['h3', 'd3'], { res: 0 });
T('king next to the throne: 3 + throne', spec(C, ['e7', 'd6', 'f5', 'j9'], ['c9'], 'e6', 1), ['f5', 'e5'], { res: 1, why: 'capture' });
T('king on the throne needs 4', spec(C, ['f7', 'e6', 'g6', 'j5'], ['c9'], 'f6', 1), ['j5', 'f5'], { res: 1 });
T('king on the edge is safe', spec(C, ['a6', 'b5', 'c3'], ['h9'], 'a5', 1), ['c3', 'a3'], { res: 0 });
T('escape to a corner', spec(C, ['c3', 'e9'], ['g6'], 'a7', 2), ['a7', 'a11'], { res: 2, why: 'escape' });
T('shieldwall', spec(C, ['a6', 'c9', 'b7', 'b8', 'j2'], ['a7', 'a8', 'e5'], 'f6', 1), ['c9', 'a9'], { caps: 'a7,a8' });
T('shieldwall with a corner', spec(C, ['b2', 'b3', 'd4', 'j9'], ['a2', 'a3', 'f9'], 'h5', 1), ['d4', 'a4'], { caps: 'a2,a3' });
T('shieldwall: the king is not captured', spec(C, ['a6', 'c9', 'b7', 'b8', 'j2'], ['a7', 'e5'], 'a8', 1), ['c9', 'a9'], { caps: 'a7' });
T('shieldwall needs every front', spec(C, ['a6', 'c9', 'b7', 'j2'], ['a7', 'a8', 'e5'], 'f6', 1), ['c9', 'a9'], { caps: '' });
T('edge fort', spec(C, ['c7', 'c3', 'd8', 'e2'], ['a5', 'b4', 'b3', 'c2'], 'a4', 2), ['c2', 'a2'], { res: 2, why: 'fort' });
T('not a fort (a breakable wall)', spec(C, ['c7', 'c3', 'd8', 'e2', 'c4'], ['a5', 'b4', 'b2', 'c1'], 'a4', 2), ['c1', 'a1'.replace('a1', 'b1')], { res: 0 });
T('encirclement', spec(C, ['d6', 'c5', 'e5', 'b4', 'f4', 'c3', 'e3', 'h2'], ['d5', 'c4', 'e4', 'd3'], 'd4', 1), ['h2', 'd2'], { res: 1, why: 'encircle' });
T('encirclement broken by an edge defender', spec(C, ['d6', 'c5', 'e5', 'b4', 'f4', 'c3', 'e3', 'h2'], ['d5', 'c4', 'e4', 'd3', 'k8'], 'd4', 1), ['h2', 'd2'], { res: 0 });
const B = 'brandubh';
T('brandubh: king captured by 2', spec(B, ['b3', 'e6', 'f1'], ['f6'], 'b2', 1), ['f1', 'b1'], { res: 1, why: 'capture' });
T('brandubh: king next to the throne needs 3', spec(B, ['c4', 'g3'], ['f6'], 'd5', 1), ['g3', 'e3'].map(x => x), { res: 0 });
T('brandubh: king captured against a corner', spec(B, ['e7', 'f2'], ['f5'], 'b7', 1), ['e7', 'c7'], { res: 1, why: 'capture' });
const TB = 'tablut';
T('tablut: escape to any edge', spec(TB, ['c3', 'h8'], ['g6'], 'e7', 2), ['e7', 'e9'], { res: 2, why: 'escape' });
T('tablut: king captured by 2 away from the throne', spec(TB, ['b7', 'd2', 'g4'], ['h8'], 'c7', 1), ['g4', 'g7'].map(x => x), { res: 0 });
T('tablut: king custodial', spec(TB, ['b7', 'h7', 'g4'], ['h2'], 'c7', 1), ['h7', 'd7'], { res: 1, why: 'capture' });
console.log(fail ? fail + ' FAILED' : 'all passed');
process.exit(fail ? 1 : 0);
