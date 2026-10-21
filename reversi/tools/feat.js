// exact analysis + objective features of a puzzle position
const { flips, legal, play } = require('./eng-lite.js');
const CORNERS = [0, 7, 56, 63];
const XSQ = { 9: 0, 14: 7, 49: 56, 54: 63 }, CSQ = { 1: 0, 8: 0, 6: 7, 15: 7, 48: 56, 57: 56, 55: 63, 62: 63 };
const SYMS = []; for (let t = 0; t < 8; t++) { const m = []; for (let q = 0; q < 64; q++) { let r = q >> 3, c = q & 7; if (t & 1) c = 7 - c; if (t & 2) r = 7 - r; if (t & 4) { const x = r; r = c; c = x; } m.push(r * 8 + c); } SYMS.push(m); }
// canonical key: identical under the 8 symmetries and under swapping the colours (with the side to move)
function canon(cells, s) {
  let best = null;
  for (const sw of [0, 1]) for (const m of SYMS) {
    const d = new Array(64); for (let q = 0; q < 64; q++) { let v = cells[q]; if (sw && v) v = 3 - v; d[m[q]] = v; }
    const k = d.join('') + (sw ? 3 - s : s); if (best === null || k < best) best = k;
  }
  return best;
}
function regions(cells) {   // orthogonally connected empty regions -> array of arrays
  const seen = new Array(64).fill(false), out = [];
  for (let q = 0; q < 64; q++) if (!cells[q] && !seen[q]) {
    const reg = [], st = [q]; seen[q] = true;
    while (st.length) { const x = st.pop(); reg.push(x); const r = x >> 3, c = x & 7;
      for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) { const rr = r + dr, cc = c + dc; if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue; const y = rr * 8 + cc; if (!cells[y] && !seen[y]) { seen[y] = true; st.push(y); } } }
    out.push(reg);
  }
  return out;
}
function emptySym(cells) { const e = cells.map(v => v ? 0 : 1); for (let t = 1; t < 8; t++) { const m = SYMS[t]; let ok = true; for (let q = 0; q < 64 && ok; q++) if (e[q] !== e[m[q]]) ok = false; if (ok) return t; } return 0; }
function fullSym(cells) { for (let t = 1; t < 8; t++) { const m = SYMS[t]; let ok = true; for (let q = 0; q < 64 && ok; q++) if (cells[q] !== cells[m[q]]) ok = false; if (ok) return t; } return 0; }
const finalOf = (c, me) => { let b = 0, w = 0; for (const v of c) { if (v === 1) b++; else if (v === 2) w++; } const mine = me === 1 ? b - w : w - b, e = 64 - b - w; return mine > 0 ? mine + e : mine < 0 ? mine - e : 0; };
const meets = (g, v) => g.type === 'wipe' ? v >= 64 : g.type === 'margin' ? v >= g.value : g.type === 'draw' ? v >= 0 : v > 0;
function exact(E, cells, s) { E.MPC.on = true; return E.analyze(cells, s, { time: 1e9, exact: 64 }); }
// shallow (2-ply midgame) score of each move: what a quick look would choose
function shallow(E, cells, s, moves) {
  E.MPC.on = false; E.deadline = Infinity;
  const [pl, ph, ol, oh] = E.toBits(cells, s);
  return moves.map(m => { const [a, b, c, d] = E.childOf(pl, ph, ol, oh, m); return { move: m, score: -E.search(a, b, c, d, 1, -32000, 32000, 1, false) }; });
}
// principal variation: both sides play an exact best move until the end; returns [{s, m}] with m=-1 for a pass
function pv(E, cells, s) {
  const out = []; let c = cells.slice();
  for (;;) {
    let ms = legal(c, s);
    if (!ms.length) { const o = 3 - s; if (!legal(c, o).length) break; out.push({ s, m: -1 }); s = o; continue; }
    let bm = ms[0];
    if (ms.length > 1) { const sc = exact(E, c, s); let bv = -1e9; for (const x of sc) if (x.score > bv) { bv = x.score; bm = x.move; } }
    out.push({ s, m: bm }); c = play(c, bm, s); s = 3 - s;
  }
  return { line: out, final: c };
}
// returns null if not a puzzle, else {goal, sol, feats}
function analyse(E, cells, s) {
  const moves = legal(cells, s); if (moves.length < 2) return null;
  const e = cells.filter(v => !v).length;
  const t0 = Date.now();
  const sc = exact(E, cells, s); const ms = Date.now() - t0;
  const by = new Map(sc.map(x => [x.move, Math.round(x.score)]));
  const vals = moves.map(m => by.get(m)); const best = Math.max(...vals);
  const nBest = vals.filter(v => v === best).length, nWin = vals.filter(v => v > 0).length, nDraw = vals.filter(v => v >= 0).length;
  let goal = null;
  if (best === 64 && nBest === 1) goal = { type: 'wipe' };
  else if (best > 0 && nWin === 1) goal = { type: 'win' };
  else if (best === 0 && nDraw === 1) goal = { type: 'draw' };
  else if (best > 0 && nBest === 1) goal = { type: 'margin', value: best };
  if (!goal) return null;
  const sol = moves[vals.indexOf(best)];
  const second = Math.max(...vals.filter((v, i) => moves[i] !== sol));
  const fl = moves.map(m => flips(cells, m, s).length), fsol = fl[moves.indexOf(sol)];
  const maxF = Math.max(...fl), minF = Math.min(...fl);
  const sh = shallow(E, cells, s, moves).sort((a, b) => b.score - a.score);
  const shRank = sh.findIndex(x => x.move === sol);
  const after = moves.map(m => { const d = play(cells, m, s); return legal(d, 3 - s).length; });
  const oppMob = after[moves.indexOf(sol)];
  const P = pv(E, cells, s);
  const passes = P.line.filter(x => x.m < 0 && x.s !== s).length;   // opponent passes -> the player moves twice in a row
  const oppPasses = P.line.filter(x => x.m < 0 && x.s === s).length;
  const regs = regions(cells), regOf = q => regs.find(r => r.includes(q)).length;
  const mine = cells.filter(v => v === s).length, theirs = cells.filter(v => v === 3 - s).length;
  const cornerMoves = moves.filter(m => CORNERS.includes(m));
  const isX = m => XSQ[m] !== undefined && !cells[XSQ[m]], isC = m => CSQ[m] !== undefined && !cells[CSQ[m]];
  const edge = m => (m >> 3) === 0 || (m >> 3) === 7 || (m & 7) === 0 || (m & 7) === 7;
  const failing = moves.filter(m => !meets(goal, by.get(m)));
  const F = {
    e, nm: moves.length, best, second, ms, nWin, nDraw,
    sol, fsol, maxF, minF, nMaxF: fl.filter(x => x === maxF).length, nMinF: fl.filter(x => x === minF).length,
    shRank, shTop: sh[0].move, oppMob, minOppMob: Math.min(...after), nMinOpp: after.filter(x => x === Math.min(...after)).length, maxOppMob: Math.max(...after),
    passes, oppPasses, pvLen: P.line.filter(x => x.m >= 0).length,
    regSol: regOf(sol), oddRegMoves: moves.filter(m => regOf(m) % 2 === 1).length, evenRegMoves: moves.filter(m => regOf(m) % 2 === 0).length,
    nReg: regs.length, oddRegs: regs.filter(r => r.length % 2).length,
    failOdd: failing.filter(m => regOf(m) % 2 === 1).length, failEven: failing.filter(m => regOf(m) % 2 === 0).length,
    mine, theirs, cornerMoves: cornerMoves.length, cornerFail: cornerMoves.filter(m => !meets(goal, by.get(m))).length,
    solCorner: CORNERS.includes(sol), solX: isX(sol), solC: isC(sol), solEdge: edge(sol) && !CORNERS.includes(sol) && !isC(sol),
    nonEdgeMoves: moves.filter(m => !edge(m)).length, emptySym: emptySym(cells), fullSym: fullSym(cells),
    maxFFail: fl.some((x, i) => x === maxF && !meets(goal, vals[i])), nLose: vals.filter(v => v < 0).length,
  };
  return { goal, sol, F, pv: P.line.map(x => x.m), scores: Object.fromEntries(moves.map(m => [m, by.get(m)])) };
}
module.exports = { analyse, canon, regions, emptySym, finalOf, meets, SYMS, pv, exact };
