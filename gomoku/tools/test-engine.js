// Rule / solver tests for engine.js (node tools/test-engine.js)
'use strict';
const E = require('../engine.js');
let fails = 0;
const ok = (c, msg) => { if (!c) { fails++; console.log('FAIL', msg); } else console.log('ok  ', msg); };
// diagram helper: rows from the top, '●' black, '○' white, others empty; placed with offset (ox, oy) from the top-left corner
function fromDiagram(rule, rows, ox, oy, side) {
  const pos = new E.Pos(rule); pos.fresh = false;
  const pts = {};
  rows.forEach((row, r) => [...row].forEach((ch, c) => {
    const m = (14 - (r + oy)) * 15 + (c + ox);
    if (ch === '●' || ch === '○') { pos.side = ch === '●' ? 1 : 2; pos.make(m); }
    else if (/[A-Z]/.test(ch)) pts[ch] = m;
  }));
  pos.side = side || 1;
  return { pos, pts };
}
// 1) 4-3-3 and 4-4-3
{
  const rows = ['.......', '...●●A.', '....●●.', '...●.●.', '..●..B.', '.○.....', '.......'];
  const { pos, pts } = fromDiagram('renju', rows, 4, 4);
  ok(pos.forbidden(pts.A) === 1, '4-3-3 is forbidden (3-3): ' + pos.forbidden(pts.A));
  pos.side = 1; pos.make(pts.B); pos.side = 1;
  ok(pos.forbidden(pts.A) === 2, '4-4-3 is forbidden (4-4): ' + pos.forbidden(pts.A));
  pos.unmake(); pos.side = 2; pos.make(pts.B); pos.side = 1;
  ok(pos.forbidden(pts.A) === 0, 'with white on B, A is a plain 4-3: ' + pos.forbidden(pts.A));
}
// 2) false 3-3 (the vertical three of B needs the forbidden point A)
{
  const rows = ['.......', '.●.....', '.○●●○○.', '..●A●..', '.○○●...', '..●B●..', '.○...○.', '.......'];
  const { pos, pts } = fromDiagram('renju', rows, 4, 3);
  ok(pos.forbidden(pts.A) === 1, 'A is 3-3: ' + pos.forbidden(pts.A));
  ok(pos.forbidden(pts.B) === 0, 'B is not forbidden (false 3-3): ' + pos.forbidden(pts.B));
}
// 3) edge: a diagonal three toward the corner is not a three
{
  const rows = ['.....', '...●.', '..●..', '.●...', '.....'];
  const { pos } = fromDiagram('renju', rows, 0, 0);
  // add a horizontal pair so that X makes two threes only if the diagonal counted
  const X = (14 - 0) * 15 + 4;   // e15 extends the diagonal b12-c13-d14 to the edge
  ok(pos.forbidden(X) === 0, 'edge diagonal makes no three');
}
// 4) overline and five
{
  const pos = new E.Pos('renju'); pos.fresh = false;
  const put = (s, c) => { pos.side = c; pos.make(E.sqOf(s)); };
  ['d8', 'e8', 'f8', 'h8', 'i8'].forEach(s => put(s, 1));
  pos.side = 1;
  ok(pos.forbidden(E.sqOf('g8')) === 3, 'six in a row is an overline');
  const p2 = new E.Pos('renju'); p2.fresh = false;
  ['e8', 'f8', 'h8', 'i8'].forEach(s => { p2.side = 1; p2.make(E.sqOf(s)); });
  ['d8', 'j8'].forEach(s => { p2.side = 2; p2.make(E.sqOf(s)); });
  ['g9', 'g10', 'g11', 'g12'].forEach(s => { p2.side = 1; p2.make(E.sqOf(s)); });
  p2.side = 1;
  ok(p2.forbidden(E.sqOf('g8')) === 0, 'five with a four elsewhere is not forbidden (five wins)');
  // free rule: overline wins
  const p3 = new E.Pos('free'); ['d8', 'e8', 'f8', 'h8', 'i8'].forEach(s => { p3.side = 1; p3.make(E.sqOf(s)); }); p3.side = 1;
  ok(p3.cls[1][E.M2I[E.sqOf('g8')]] === E.C.FIVE, 'freestyle: overline counts as five');
}
// 5) double four in one line (B.BBB.B) is forbidden for black
{
  const pos = new E.Pos('renju'); pos.fresh = false;
  ['d8', 'f8', 'g8', 'j8'].forEach(s => { pos.side = 1; pos.make(E.sqOf(s)); }); pos.side = 1;
  ok(pos.forbidden(E.sqOf('h8')) === 2, 'four-four in one line: ' + pos.forbidden(E.sqOf('h8')));
}
// 6) simple 3-3
{
  const pos = new E.Pos('renju'); pos.fresh = false;
  ['g8', 'i8', 'h9', 'h10'].forEach(s => { pos.side = 1; pos.make(E.sqOf(s)); }); pos.side = 1;
  ok(pos.forbidden(E.sqOf('h8')) === 1, 'open 3-3 is forbidden');
  const p2 = new E.Pos('standard'); p2.fresh = false;
  ['g8', 'i8', 'h9', 'h10'].forEach(s => { p2.side = 1; p2.make(E.sqOf(s)); }); p2.side = 1;
  ok(p2.forbidden(E.sqOf('h8')) === 0, 'standard: no forbidden moves');
}
// 7) VCF
{
  const pos = new E.Pos('renju'); pos.fresh = false;
  // black: four-three available after one four
  ['f8', 'g8', 'h8', 'h6', 'h5'].forEach(s => { pos.side = 1; pos.make(E.sqOf(s)); });
  ['e8', 'h4'].forEach(s => { pos.side = 2; pos.make(E.sqOf(s)); });
  pos.side = 1;
  const S = new E.Solver();
  const pv = [];
  const r = S.vcf(pos, 10, pv);
  console.log('   vcf pv:', pv.map(i => E.sqName(E.I2M[i])).join(' '));
  ok(r < 0, 'no VCF here');
  const t = S.winIn(pos, 7);
  ok(t === 5, 'VCT win in ' + t);
}
// 8) opening restriction
{
  const pos = new E.Pos('renju');
  ok(pos.legal().length === 1 && pos.legal()[0] === E.CENTER, 'first move must be the centre');
  pos.make(E.CENTER);
  ok(pos.legal().length === 8, 'second move next to the centre');
  pos.make(E.sqOf('h9'));
  ok(pos.legal().length === 23, 'third move within 2: ' + pos.legal().length);
}
// 9) search smoke test
{
  const t0 = Date.now();
  const r = E.think('renju', [E.sqOf('h8'), E.sqOf('h9'), E.sqOf('i9')], 8);
  console.log('   think:', E.sqName(r.move), r.v, 'depth', r.depth, (Date.now() - t0) + 'ms');
  ok(r.move >= 0, 'search returns a move');
}
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(fails ? 1 : 0);
