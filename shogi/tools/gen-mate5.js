// (2026-11-27 第2期 担当A) candidates for k2「5手詰」: positions from the engine's self-play (depth 2, one of the top three moves at
// random) where the side to move mates in five with one first move only (no mate in one or three). From the rules, afresh: every
// first move, every defence, every later move. The stored line: sol[1] a longest defence (after it no mate in one; a king move or a
// capture before a drop), the third move the only one that mates within three after it, sol[3] a defence after which one move
// mates, sol[4] that move (the only one). ref: for every other first check, a defence after which nothing mates within three.
// Prints JSON lines { sfen, sol, ref, checks, defs, legal, drop, piece, kingRuns, d }.
// usage: node shogi/tools/gen-mate5.js <games> <seed> > out.jsonl
'use strict';
const E = require('../engine.js'), zlib = require('zlib'), fs = require('fs'), path = require('path');
{ const b = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, '../weights.bin.gz'))); E.setWeights(new Int16Array(b.buffer, b.byteOffset, b.length / 2)); }
const [N = 50, SEED = 1] = process.argv.slice(2).map(Number);
let s = SEED >>> 0 || 1; const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
const chk = (p, m) => { p.doMove(m); const c = p.inCheck(); p.undoMove(); return c; };
const mates1 = p => { const o = []; for (const m of p.legalMoves(true)) { p.doMove(m); if (p.inCheck() && !p.legalMoves(true).length) o.push(m); p.undoMove(); } return o; };
// every move that mates within n (n odd): a check after which every defence is mated within n - 2 (or there is none)
const within = (p, n) => { const o = []; for (const m of p.legalMoves(true)) { p.doMove(m); if (p.inCheck()) { const rs = p.legalMoves(true);
  if (!rs.length || (n > 1 && rs.every(r => { p.doMove(r); const v = within(p, n - 2).length > 0; p.undoMove(); return v; }))) o.push(m); } p.undoMove(); } return o; };
const pref = (p, r) => (!E.isDrop(r) && E.mFrom(r) === p.king[p.side] ? 0 : !E.isDrop(r) && p.board[E.mTo(r)] ? 1 : E.isDrop(r) ? 3 : 2);
function study(p) {
  if (p.inCheck()) return null;
  let q; try { q = E.solveMate(p, 5, 300000); } catch (e) { q = null; } if (!q || q.mate !== 5) return null;
  if (within(p, 3).length) return null;
  const ms = p.legalMoves(true), checks = ms.filter(m => chk(p, m)), goal = within(p, 5).filter(m => !mates1(p).includes(m));
  if (goal.length !== 1 || checks.length < 3 || checks.length > 15) return null;
  const a = goal[0], sfen0 = p.sfen(), sol = [p.toUsi(a)];
  const at = us => { const x = new E.Position(); x.setSfen(sfen0); for (const u of us) x.doMove(x.fromUsi(u)); return x; };
  let p1 = at(sol); const rs = p1.legalMoves(true);
  const longest = rs.filter(r => { p1.doMove(r); const v = !mates1(p1).length; p1.undoMove(); return v; }).sort((x, y) => pref(p1, x) - pref(p1, y)).map(r => p1.toUsi(r));
  let kingRuns = 0;
  for (const u1 of longest) { const p2 = at([...sol, u1]), w3 = within(p2, 3); if (w3.length !== 1) continue; const u2 = p2.toUsi(w3[0]);
    const p3 = at([...sol, u1, u2]), rs2 = p3.legalMoves(true).sort((x, y) => pref(p3, x) - pref(p3, y)).map(r => p3.toUsi(r)); let ok = null;
    for (const u3 of rs2) { const p4 = at([...sol, u1, u2, u3]), f = mates1(p4); if (f.length === 1) { ok = [u3, p4.toUsi(f[0])]; break; } }
    if (ok) { kingRuns = (pref(p1, p1.fromUsi(u1)) === 0 ? 1 : 0) + (pref(p3, p3.fromUsi(ok[0])) === 0 ? 1 : 0); sol.push(u1, u2, ...ok); break; } }
  if (sol.length !== 5) return null;
  // ref: for every other first check, a defence after which nothing mates within three
  const ref = {};
  for (const c of checks) { if (c === a) continue; p.doMove(c); const ds = p.legalMoves(true).sort((x, y) => pref(p, x) - pref(p, y));
    const r = ds.find(d => { p.doMove(d); const v = !within(p, 3).length; p.undoMove(); return v; }); const cu = (() => { p.undoMove(); const x = p.toUsi(c); p.doMove(c); return x; })();
    if (!r) { p.undoMove(); return null; } ref[cu] = p.toUsi(r); p.undoMove(); }
  const drop = E.isDrop(a), piece = drop ? E.dropType(a) : E.typeOf(p.board[E.mFrom(a)]);
  return { sfen: p.sfen(), sol, ref, checks: checks.length, defs: rs.length, legal: ms.length, drop, piece, kingRuns, d: +(checks.length + rs.length / 2 + ms.length / 100).toFixed(2) };
}
const START = 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1';
const seen = new Set();
for (let gme = 0; gme < N; gme++) {
  const p = new E.Position(); p.setSfen(START); const se = new E.Searcher(p);
  for (let ply = 0; ply < 220; ply++) {
    if (!p.legalMoves(true).length) break;
    if (ply >= 30) { const k = p.sfen().split(' ').slice(0, 3).join(' '); if (!seen.has(k)) { seen.add(k); const r = study(p); if (r) console.log(JSON.stringify(r)); } }
    const res = se.analyze({ depth: 2, nodes: 20000 }); if (!res.length) break;
    const top = res.slice(0, Math.min(3, res.length)).filter(x => x.s > res[0].s - 300);
    p.doMove(top[Math.floor(rnd() * top.length)].m);
  }
}
