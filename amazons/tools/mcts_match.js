// Self-play of the MCTS (core.c) against the alpha-beta search (engine.js bestMove), in one Node process with the WebAssembly
// core. The clock both searches read (Date.now, and now() of the core) is this process's CPU time, so a time budget is the
// same CPU time on a crowded machine. claude/amazons-spec.md「MCTS」.
//   node tools/mcts_match.js A B pairs [seed] [part/n]
//   a player: ab:ms=1500 | ab:nk=36 | ab:lv=15 | mc:ms=1500 | mc:nk=36,k=16,c=0.2 (MC parameters after the budget)
//   each opening (two random plies from the best 10 candidates) is played twice, colours swapped. A separated board with a
//   territory lead of 3 or more is adjudicated. Prints one JSON line per game and a summary.
'use strict';
const path = require('path');
const cpu = () => { const u = process.cpuUsage(); return (u.user + u.system) / 1000; };
Date.now = cpu;   // (before engine.js: its clock and the core's now() import read it)
const E = require(path.join(__dirname, '..', 'engine.js'));
if (!E.wasm) { console.error('no wasm core'); process.exit(1); }
const [, , SA, SB, PAIRS = '10', SEED = '1', PART = '0/1'] = process.argv;
function parseP(s) {
  const [kind, rest = ''] = s.split(':'), o = {};
  for (const kv of rest.split(',').filter(Boolean)) { const [k, v] = kv.split('='); o[k] = +v; }
  return { kind, o, name: s };
}
const A = parseP(SA), B = parseP(SB);
function cfgOf(P, seed) {
  const o = P.o;
  if (P.kind === 'ab') { if (o.lv) return { level: o.lv }; return { cfg: Object.assign({ s: 1 }, o.ms ? { ms: o.ms } : {}, o.nk ? { nk: o.nk } : {}) }; }
  const prm = {}; for (const k in o) if (k !== 'ms' && k !== 'nk' && k !== 'sims') prm[k] = o[k];
  return { cfg: { s: 1, mc: 1, ms: o.ms || 0, nk: o.nk || 0, sims: o.sims || 0, seed, prm } };
}
let rs = (+SEED * 7919 + 13) | 0;
const rnd = () => { rs = (Math.imul(rs, 1103515245) + 12345) & 0x7fffffff; return rs / 0x7fffffff; };
function opening() {
  const moves = [];
  for (let i = 0; i < 2; i++) { const { pos } = E.replay(null, moves); const C = E.candList(pos, 10, 0, 14); moves.push(C[Math.floor(rnd() * C.length)].m); }
  return moves;
}
function play(W, Bk, op, gseed) {   // returns 1 = White won, 2 = Black
  const moves = op.slice(), use = { 1: 0, 2: 0 }, cnt = { 1: 0, 2: 0 };
  for (let ply = 0; ply < 100; ply++) {
    const { pos } = E.replay(null, moves);
    if (!pos.canMove(pos.turn)) return { win: 3 - pos.turn, plies: moves.length, use, cnt, adj: 0 };
    const t = pos.terr();
    if (t.sep && Math.abs(t.a - t.b) >= 3) return { win: t.a > t.b ? 1 : 2, plies: moves.length, use, cnt, adj: 1 };
    const P = pos.turn === 1 ? W : Bk, c = cfgOf(P, gseed + ply);
    const t0 = cpu();
    const r = E.think(null, moves, c.level || 0, rnd, null, c.cfg);
    use[pos.turn] += cpu() - t0; cnt[pos.turn]++;
    if (r.move == null || r.move < 0) return { win: 3 - pos.turn, plies: moves.length, use, cnt, adj: 0 };
    moves.push(r.move);
  }
  return { win: 0, plies: moves.length, use, cnt, adj: 0 };
}
const [pi, pn] = PART.split('/').map(Number);
let aw = 0, n = 0, cpuA = 0, cpuB = 0, mvA = 0, mvB = 0;
for (let i = 0; i < +PAIRS; i++) {
  const op = opening();
  if (i % pn !== pi) continue;
  for (let sw = 0; sw < 2; sw++) {
    E.think(null, [], 0, rnd, null, { s: 1, nk: 1 });   // (warm)
    const W = sw ? B : A, Bk = sw ? A : B, r = play(W, Bk, op, i * 1000 + sw * 500 + +SEED);
    const aSide = sw ? 2 : 1, ok = r.win === aSide;
    aw += ok ? 1 : r.win === 0 ? 0.5 : 0; n++;
    cpuA += r.use[aSide]; cpuB += r.use[3 - aSide]; mvA += r.cnt[aSide]; mvB += r.cnt[3 - aSide];
    console.log(JSON.stringify({ pair: i, aWhite: !sw, aWin: ok ? 1 : 0, plies: r.plies, adj: r.adj, msA: Math.round(r.use[aSide] / Math.max(1, r.cnt[aSide])), msB: Math.round(r.use[3 - aSide] / Math.max(1, r.cnt[3 - aSide])) }));
  }
}
const p = aw / Math.max(1, n), elo = p > 0 && p < 1 ? -400 * Math.log10(1 / p - 1) : p >= 1 ? 999 : -999;
console.log(`# ${SA} vs ${SB}: ${aw}/${n} (${(p * 100).toFixed(1)}%, ${elo.toFixed(0)} Elo) | CPU ms/move A ${(cpuA / Math.max(1, mvA)).toFixed(0)} B ${(cpuB / Math.max(1, mvB)).toFixed(0)}`);
