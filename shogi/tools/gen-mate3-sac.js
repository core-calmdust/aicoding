// (2026-11-26 第2期 担当A) candidates for k4「3手詰（応用）」: positions from the engine's self-play (depth 2, one of the top three
// moves at random) where the side to move mates in three with one first move only, and that move is a sacrifice — a defence can
// take the piece just played. From the rules, afresh: every first move, every defence, every third move. Prints JSON lines
// { sfen, sol, checks, defs, legal, drop, piece, d } (sol[1] = the capture of the sacrificed piece; the third move unique after it).
// usage: node shogi/tools/gen-mate3-sac.js <games> <seed> > out.jsonl
'use strict';
const E = require('../engine.js'), zlib = require('zlib'), fs = require('fs'), path = require('path');
{ const b = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, '../weights.bin.gz'))); E.setWeights(new Int16Array(b.buffer, b.byteOffset, b.length / 2)); }
const [N = 50, SEED = 1] = process.argv.slice(2).map(Number);
let s = SEED >>> 0 || 1; const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
const mates1 = p => { const o = []; for (const m of p.legalMoves(true)) { p.doMove(m); if (p.inCheck() && !p.legalMoves(true).length) o.push(m); p.undoMove(); } return o; };
function study(p) {
  if (p.inCheck()) return null;
  let q; try { q = E.solveMate(p, 3, 200000); } catch (e) { q = null; } if (!q || q.mate !== 3) return null;   // (a quick filter: mate in three exactly — then everything afresh from the rules)
  if (mates1(p).length) return null;
  const ms = p.legalMoves(true), goal = [], checks = [];
  for (const m of ms) { p.doMove(m); if (p.inCheck()) { checks.push(m); const rs = p.legalMoves(true);
    if (rs.length && rs.every(r => { p.doMove(r); const v = mates1(p).length > 0; p.undoMove(); return v; })) goal.push(m); } p.undoMove(); }
  if (goal.length !== 1) return null;
  const a = goal[0], to = E.mTo(a); p.doMove(a); const rs = p.legalMoves(true), caps = rs.filter(r => !E.isDrop(r) && E.mTo(r) === to);
  let out = null;
  for (const r of caps) { p.doMove(r); const f = mates1(p); p.undoMove(); if (f.length === 1) { p.doMove(r); const fu = p.toUsi(f[0]); p.undoMove(); out = [p.toUsi(r), fu]; break; } }
  p.undoMove();
  if (!out || rs.length < 2) return null;
  const drop = E.isDrop(a), piece = drop ? E.dropType(a) : E.typeOf(p.board[E.mFrom(a)]);
  return { sfen: p.sfen(), sol: [p.toUsi(a), ...out], checks: checks.length, defs: rs.length, legal: ms.length, drop, piece, d: +(checks.length + rs.length / 2 + ms.length / 100).toFixed(2) };
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
