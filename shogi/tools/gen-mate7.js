// (2026-11-27 第2期 担当A) candidates for d1「7手詰」 (and any odd N): as shogi/tools/gen-mate5.js, for a mate in N. Positions from
// the engine's self-play (depth 2, one of the top three moves at random) where the side to move mates in N with one first move only
// (no mate within N - 2). From the rules, afresh. The stored line: at each defender's turn a longest defence (after it nothing mates
// within the moves left - 2; a king move or a capture before a drop), at each attacker's turn the only move that mates within the
// moves left. ref: for every other first check, a defence after which nothing mates within N - 2.
// Prints JSON lines { sfen, sol, ref, checks, defs, legal, drop, piece, kingRuns, sac, d }.
// usage: node shogi/tools/gen-mate7.js <games> <seed> [N=7] > out.jsonl
'use strict';
const E = require('../engine.js'), zlib = require('zlib'), fs = require('fs'), path = require('path');
{ const b = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, '../weights.bin.gz'))); E.setWeights(new Int16Array(b.buffer, b.byteOffset, b.length / 2)); }
const [NG = 50, SEED = 1, N = 7] = process.argv.slice(2).map(Number);
let s = SEED >>> 0 || 1; const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
const chk = (p, m) => { p.doMove(m); const c = p.inCheck(); p.undoMove(); return c; };
const mates1 = p => { const o = []; for (const m of p.legalMoves(true)) { p.doMove(m); if (p.inCheck() && !p.legalMoves(true).length) o.push(m); p.undoMove(); } return o; };
// every move that mates within n (n odd): a check after which every defence is mated within n - 2 (or there is none)
const within = (p, n) => { const o = []; for (const m of p.legalMoves(true)) { p.doMove(m); if (p.inCheck()) { const rs = p.legalMoves(true);
  if (!rs.length || (n > 1 && rs.every(r => { p.doMove(r); const v = within(p, n - 2).length > 0; p.undoMove(); return v; }))) o.push(m); } p.undoMove(); } return o; };
const pref = (p, r) => (!E.isDrop(r) && E.mFrom(r) === p.king[p.side] ? 0 : !E.isDrop(r) && p.board[E.mTo(r)] ? 1 : E.isDrop(r) ? 3 : 2);
function study(p) {
  if (p.inCheck()) return null;
  let q; try { q = E.solveMate(p, N, 400000); } catch (e) { q = null; } if (!q || q.mate !== N) return null;
  const ms = p.legalMoves(true), checks = ms.filter(m => chk(p, m)); if (checks.length < 3 || checks.length > 15) return null;
  if (within(p, N - 2).length) return null;
  const goal = within(p, N); if (goal.length !== 1) return null;
  const a = goal[0], sfen0 = p.sfen();
  const at = us => { const x = new E.Position(); x.setSfen(sfen0); for (const u of us) x.doMove(x.fromUsi(u)); return x; };
  // the line: depth-first, at every defender's turn the longest defences in order of preference
  const line = sol => { const rem = N - sol.length; if (rem === 0) return sol;
    const x = at(sol);
    if (sol.length % 2 === 0) { const w = within(x, rem); if (w.length !== 1 || (rem > 2 && within(x, rem - 2).length)) return null; return line([...sol, x.toUsi(w[0])]); }
    const rs = x.legalMoves(true).filter(r => { x.doMove(r); const v = rem - 1 < 3 || !within(x, rem - 3).length; x.undoMove(); return v; }).sort((y, z) => pref(x, y) - pref(x, z)).map(r => x.toUsi(r));
    for (const r of rs) { const o = line([...sol, r]); if (o) return o; } return null; };
  const sol = line([p.toUsi(a)]); if (!sol) return null;
  let kingRuns = 0, sac = 0;
  for (let i = 1; i < N; i += 2) { const x = at(sol.slice(0, i)), m = x.fromUsi(sol[i]); if (pref(x, m) === 0) kingRuns++; if (sol[i].slice(2, 4) === sol[i - 1].slice(2, 4)) sac++; }
  const ref = {};
  for (const c of checks) { if (c === a) continue; const cu = p.toUsi(c); p.doMove(c); const ds = p.legalMoves(true).sort((x, y) => pref(p, x) - pref(p, y));
    const r = ds.find(d => { p.doMove(d); const v = !within(p, N - 2).length; p.undoMove(); return v; });
    if (!r) { p.undoMove(); return null; } ref[cu] = p.toUsi(r); p.undoMove(); }
  const p1 = at([sol[0]]), defs = p1.legalMoves(true).length;
  const drop = E.isDrop(a), piece = drop ? E.dropType(a) : E.typeOf(p.board[E.mFrom(a)]);
  return { sfen: p.sfen(), sol, ref, checks: checks.length, defs, legal: ms.length, drop, piece, kingRuns, sac, d: +(checks.length + defs / 2 + ms.length / 100).toFixed(2) };
}
const START = 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1';
const seen = new Set();
for (let gme = 0; gme < NG; gme++) {
  const p = new E.Position(); p.setSfen(START); const se = new E.Searcher(p);
  for (let ply = 0; ply < 220; ply++) {
    if (!p.legalMoves(true).length) break;
    if (ply >= 30) { const k = p.sfen().split(' ').slice(0, 3).join(' '); if (!seen.has(k)) { seen.add(k); const r = study(p); if (r) console.log(JSON.stringify(r)); } }
    const res = se.analyze({ depth: 2, nodes: 20000 }); if (!res.length) break;
    const top = res.slice(0, Math.min(3, res.length)).filter(x => x.s > res[0].s - 300);
    p.doMove(top[Math.floor(rnd() * top.length)].m);
  }
}
