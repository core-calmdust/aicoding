// Luxe Mancala engine — rules (Easy / Basic / Kalah / Sunka) + alpha-beta search with iterative deepening,
// transposition table and exact endgame solving. Works as a Web Worker, a page script and a Node module.
(function (root) {
'use strict';

// board: 0-5 = pits of player 0 (sowing order), 6 = store of player 0, 7-12 = pits of player 1, 13 = store of player 1
// a move is a pit number 0-5 counted from the mover's first pit (the one farthest from the mover's store)
const RULES = {
  easy:  { id: 'easy',  cap: 0, relay: false },   // no captures
  basic: { id: 'basic', cap: 1, relay: false },   // capture the opposite seeds only (the last seed stays)
  kalah: { id: 'kalah', cap: 2, relay: false },   // capture the opposite seeds and the last seed
  sunka: { id: 'sunka', cap: 2, relay: true },    // Sungka: relay sowing + Kalah capture
};
const RULE_IDS = ['easy', 'basic', 'kalah', 'sunka'];
const MAX_RELAY = 120;   // safety valve for endless relay sowing (never reached in practice)

function initial(seeds) { const b = new Int8Array(14); for (let i = 0; i < 6; i++) { b[i] = seeds; b[i + 7] = seeds; } return b; }
const storeOf = s => s ? 13 : 6;
const baseOf = s => s ? 7 : 0;
const opposite = i => 12 - i;
function sideSum(b, s) { const o = s ? 7 : 0; return b[o] + b[o + 1] + b[o + 2] + b[o + 3] + b[o + 4] + b[o + 5]; }
function legal(b, side) { const o = baseOf(side), r = []; for (let k = 0; k < 6; k++) if (b[o + k] > 0) r.push(k); return r; }

// Plays pit k for `side` on board b (in place). Optional `rec` collects animation events.
// Returns a result object (re-used; copy what you need): extra, over, land, cap (seeds captured), relays
const RES = { extra: false, over: false, land: -1, cap: 0, relays: 0, capFrom: -1, swept: false };
function play(b, side, k, R, rec) {
  const ms = side ? 13 : 6, os = side ? 6 : 13;
  let idx = (side ? 7 : 0) + k, n = b[idx];
  RES.extra = false; RES.over = false; RES.cap = 0; RES.relays = 0; RES.capFrom = -1; RES.swept = false;
  b[idx] = 0;
  if (rec) rec.push({ t: 'pick', at: idx, n });
  for (;;) {
    while (n > 0) {
      idx = idx === 13 ? 0 : idx + 1;
      if (idx === os) continue;
      b[idx]++; n--;
      if (rec) rec.push({ t: 'drop', at: idx });
    }
    if (R.relay && idx !== ms && b[idx] > 1 && RES.relays < MAX_RELAY) {
      n = b[idx]; b[idx] = 0; RES.relays++;
      if (rec) rec.push({ t: 'pick', at: idx, n, relay: true });
      continue;
    }
    break;
  }
  RES.land = idx;
  if (idx === ms) RES.extra = true;
  else if (R.cap && b[idx] === 1 && (side ? idx >= 7 && idx <= 12 : idx <= 5)) {
    const o = 12 - idx;
    if (b[o] > 0) {
      const got = b[o] + (R.cap === 2 ? 1 : 0);
      if (rec) rec.push({ t: 'cap', from: o, n: b[o], own: R.cap === 2 ? idx : -1, to: ms });
      RES.cap = b[o]; RES.capFrom = o;
      b[ms] += got; b[o] = 0; if (R.cap === 2) b[idx] = 0;
    }
  }
  const s0 = b[0] + b[1] + b[2] + b[3] + b[4] + b[5], s1 = b[7] + b[8] + b[9] + b[10] + b[11] + b[12];
  if (s0 === 0 || s1 === 0) {
    RES.over = true; RES.swept = s0 + s1 > 0;
    if (rec && RES.swept) rec.push({ t: 'sweep', n0: s0, n1: s1 });
    b[6] += s0; b[13] += s1;
    for (let i = 0; i < 6; i++) { b[i] = 0; b[i + 7] = 0; }
  }
  return RES;
}
// convenience: play on a copy and describe the move for the UI
function trace(b, side, k, rules) {
  const R = RULES[rules] || RULES.kalah, nb = Int8Array.from(b), ev = [];
  const r = play(nb, side, k, R, ev);
  return { board: nb, events: ev, extra: r.extra, over: r.over, land: r.land, cap: r.cap, capFrom: r.capFrom, relays: r.relays, swept: r.swept, next: r.over ? -1 : r.extra ? side : 1 - side };
}
// replay a whole game: returns positions[] ({b, side, over, info of the move that led here})
function replay(start, side0, moves, rules) {
  const R = RULES[rules] || RULES.kalah;
  let b = Int8Array.from(start), side = side0, over = sideSum(b, 0) === 0 || sideSum(b, 1) === 0;
  const out = [{ b: Int8Array.from(b), side, over, mv: null }];
  for (let i = 0; i < moves.length; i++) {
    const k = moves[i];
    if (over || k < 0 || k > 5 || b[baseOf(side) + k] === 0) return { positions: out, bad: i };
    const r = play(b, side, k, R);
    const mv = { k, side, extra: r.extra, cap: r.cap, over: r.over, land: r.land, relays: r.relays };
    over = r.over; side = over ? side : r.extra ? side : 1 - side;
    out.push({ b: Int8Array.from(b), side, over, mv });
  }
  return { positions: out, bad: -1 };
}
// best total store gain obtainable in the current turn (following extra turns), with the move sequences
function turnMax(b, side, rules) {
  const R = RULES[rules] || RULES.kalah, ms = storeOf(side), start = b[ms];
  let best = -1, lines = [];
  const rec = (bb, line) => {
    for (const k of legal(bb, side)) {
      const nb = Int8Array.from(bb), r = play(nb, side, k, R);
      const ln = line.concat(k);
      if (r.extra && !r.over) rec(nb, ln);
      else {
        // seeds swept into your store at the end count as gained
        const g = nb[ms] - start;
        if (g > best) { best = g; lines = [ln]; } else if (g === best) lines.push(ln);
      }
    }
  };
  rec(Int8Array.from(b), []);
  return { gain: best, lines };
}
// gain obtainable this turn starting with pit k
function turnMaxFirst(b, side, rules) {
  const R = RULES[rules] || RULES.kalah, ms = storeOf(side), out = [];
  for (let k = 0; k < 6; k++) {
    if (!b[baseOf(side) + k]) { out.push(null); continue; }
    const nb = Int8Array.from(b), r = play(nb, side, k, R);
    if (r.extra && !r.over) { const t = turnMax(nb, side, rules); out.push(nb[ms] - b[ms] + t.gain); }
    else out.push(nb[ms] - b[ms]);
  }
  return out;
}

// ---------------------------------------------------------------------------- search
const INF = 1000000, SEED = 100;
const W = { side: 22, myExtra: 55, oppExtra: 30, myCap: 55, oppCap: 32 };
function evaluate(b, side, R) {
  const ms = side ? 13 : 6, os = side ? 6 : 13, mb = side ? 7 : 0, ob = side ? 0 : 7;
  let mySeeds = 0, oppSeeds = 0, myExtra = 0, oppExtra = 0, myCap = 0, oppCap = 0;
  for (let k = 0; k < 6; k++) {
    const m = b[mb + k], o = b[ob + k];
    mySeeds += m; oppSeeds += o;
    if (R.relay) continue;
    if (m === 6 - k) myExtra++;
    if (o === 6 - k) oppExtra++;
    if (R.cap) {
      if (m > 0 && m < 6 - k) { const l = mb + k + m; if (b[l] === 0) { const v = b[12 - l]; if (v) { const g = v + (R.cap === 2 ? 1 : 0); if (g > myCap) myCap = g; } } }
      else if (m === 13) { const v = b[12 - mb - k] + 1; const g = v + (R.cap === 2 ? 1 : 0); if (g > myCap) myCap = g; }
      if (o > 0 && o < 6 - k) { const l = ob + k + o; if (b[l] === 0) { const v = b[12 - l]; if (v) { const g = v + (R.cap === 2 ? 1 : 0); if (g > oppCap) oppCap = g; } } }
    }
  }
  return (b[ms] - b[os]) * SEED + W.side * (mySeeds - oppSeeds) + W.myExtra * myExtra - W.oppExtra * oppExtra + W.myCap * myCap - W.oppCap * oppCap;
}

// zobrist hashing
let rs = 0x9e3779b9;
function rnd() { rs ^= rs << 13; rs >>>= 0; rs ^= rs >>> 17; rs ^= rs << 5; rs >>>= 0; return rs; }
const ZN = 128, Z1 = new Uint32Array(14 * ZN), Z2 = new Uint32Array(14 * ZN);
for (let i = 0; i < Z1.length; i++) { Z1[i] = rnd(); Z2[i] = rnd(); }
const ZS1 = rnd(), ZS2 = rnd(), ZR1 = [rnd(), rnd(), rnd(), rnd()], ZR2 = [rnd(), rnd(), rnd(), rnd()];

const TT_BITS = 21, TT_SIZE = 1 << TT_BITS, TT_MASK = TT_SIZE - 1;
let ttKey = null, ttVal, ttInfo;   // info: depth (8 bits) | flag (2 bits) << 8 | move+1 (3 bits) << 10
function ttInit() { if (!ttKey) { ttKey = new Uint32Array(TT_SIZE); ttVal = new Int32Array(TT_SIZE); ttInfo = new Uint16Array(TT_SIZE); } }
function ttClear() { if (ttKey) { ttKey.fill(0); ttInfo.fill(0); } }
const EXACT = 1, LOWER = 2, UPPER = 3, SOLVED = 255;

let nodes = 0, deadline = Infinity, aborted = false, cut = false, Rcur = RULES.kalah, ridx = 2, TOTAL = 48;
const MAXPLY = 256;
const boards = []; for (let p = 0; p < MAXPLY; p++) { boards.push([]); for (let k = 0; k < 6; k++) boards[p].push(new Int8Array(14)); }
const now = (typeof performance !== 'undefined' && performance.now) ? () => performance.now() : () => Date.now();
class Abort extends Error {}

function search(b, side, depth, alpha, beta, ply) {
  if ((++nodes & 4095) === 0 && now() > deadline) { aborted = true; throw new Abort(); }
  const ms = side ? 13 : 6, os = side ? 6 : 13;
  // bounds from the stores: the final margin lies in [2*mine - total, total - 2*theirs]
  const hi = (TOTAL - 2 * b[os]) * SEED, lo = (2 * b[ms] - TOTAL) * SEED;
  if (lo >= beta) return lo;
  if (hi <= alpha) return hi;
  if (alpha < lo) alpha = lo;
  if (beta > hi) beta = hi;
  if (depth <= 0 || ply >= MAXPLY - 1) {
    cut = true;
    const v = evaluate(b, side, Rcur);
    return v < lo ? lo : v > hi ? hi : v;
  }
  // transposition table
  let h1 = side ? ZS1 : 0, h2 = side ? ZS2 : 0;
  for (let i = 0; i < 14; i++) { h1 ^= Z1[i * ZN + b[i]]; h2 ^= Z2[i * ZN + b[i]]; }
  h1 ^= ZR1[ridx]; h2 ^= ZR2[ridx];
  const ti = h1 & TT_MASK;
  let ttMove = -1;
  if (ttKey[ti] === h2 && ttInfo[ti]) {
    const inf = ttInfo[ti], d = inf & 255, f = (inf >> 8) & 3;
    ttMove = (inf >> 10) - 1;
    if (d >= depth) {
      const v = ttVal[ti];
      if (f === EXACT || (f === LOWER && v >= beta) || (f === UPPER && v <= alpha)) { if (d !== SOLVED) cut = true; return v; }
    }
  }
  // children
  const kids = boards[ply], base = side ? 7 : 0;
  const order = [], key = [], nside = [];
  for (let k = 0; k < 6; k++) {
    if (!b[base + k]) continue;
    const c = kids[k]; c.set(b);
    const r = play(c, side, k, Rcur);
    let s;
    if (r.over) { s = 1e6 + (c[ms] - c[os]) * 10; nside[k] = -1; }
    else { s = (r.extra ? 5000 : 0) + (c[ms] - b[ms]) * 100 - k; nside[k] = r.extra ? side : 1 - side; }
    if (k === ttMove) s += 1e7;
    order.push(k); key[k] = s;
  }
  order.sort((x, y) => key[y] - key[x]);
  const a0 = alpha;
  let best = -INF, bestK = order[0];
  const prevCut = cut; cut = false;
  for (let i = 0; i < order.length; i++) {
    const k = order[i], c = kids[k];
    let v;
    if (nside[k] === -1) v = (c[ms] - c[os]) * SEED;
    else if (nside[k] === side) v = search(c, side, depth - 1, alpha, beta, ply + 1);
    else v = -search(c, 1 - side, depth - 1, -beta, -alpha, ply + 1);
    if (v > best) { best = v; bestK = k; }
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  const subCut = cut; cut = prevCut || subCut;
  const f = best <= a0 ? UPPER : best >= beta ? LOWER : EXACT;
  const d = subCut ? Math.min(depth, 250) : SOLVED;
  if (!ttInfo[ti] || (ttInfo[ti] & 255) <= d || ttKey[ti] !== h2) { ttKey[ti] = h2; ttVal[ti] = best; ttInfo[ti] = d | (f << 8) | ((bestK + 1) << 10); }
  return best;
}
function setup(b, rules) {
  ttInit();
  Rcur = RULES[rules] || RULES.kalah; ridx = RULE_IDS.indexOf(Rcur.id);
  TOTAL = 0; for (let i = 0; i < 14; i++) TOTAL += b[i];
}
// value of each legal root move (full window), from the mover's view, in 1/100 seeds
function rootValues(b, side, depth) {
  const out = [];
  for (const k of legal(b, side)) {
    const c = new Int8Array(14); c.set(b);
    const r = play(c, side, k, Rcur);
    const ms = side ? 13 : 6, os = side ? 6 : 13;
    cut = false;
    let v;
    if (r.over) v = (c[ms] - c[os]) * SEED;
    else if (r.extra) v = search(c, side, depth - 1, -INF, INF, 1);
    else v = -search(c, 1 - side, depth - 1, -INF, INF, 1);
    out.push({ m: k, v, exact: !cut });
  }
  return out;
}
// principal-variation root search: best move only (faster than full root values)
function rootBest(b, side, depth, prevBest) {
  const ms = side ? 13 : 6, os = side ? 6 : 13;
  let moves = legal(b, side);
  if (prevBest >= 0 && moves.includes(prevBest)) moves = [prevBest].concat(moves.filter(x => x !== prevBest));
  let alpha = -INF, best = -INF, bestK = moves[0], anyCut = false;
  for (const k of moves) {
    const c = new Int8Array(14); c.set(b);
    const r = play(c, side, k, Rcur);
    cut = false;
    let v;
    if (r.over) v = (c[ms] - c[os]) * SEED;
    else if (r.extra) {
      v = search(c, side, depth - 1, alpha, alpha + 1, 1);
      if (v > alpha && best > -INF) v = search(c, side, depth - 1, alpha, INF, 1);
      else if (best === -INF) v = search(c, side, depth - 1, -INF, INF, 1);
    } else {
      if (best === -INF) v = -search(c, 1 - side, depth - 1, -INF, INF, 1);
      else { v = -search(c, 1 - side, depth - 1, -alpha - 1, -alpha, 1); if (v > alpha) v = -search(c, 1 - side, depth - 1, -INF, -alpha, 1); }
    }
    if (cut) anyCut = true;
    if (v > best) { best = v; bestK = k; }
    if (v > alpha) alpha = v;
  }
  return { m: bestK, v: best, exact: !anyCut };
}

// iterative deepening: {move, value (seeds), exact, depth, nodes}
function think(b, side, rules, opt) {
  b = Int8Array.from(b); setup(b, rules);
  const ms = opt.ms || 0, maxD = opt.depth || 60;
  nodes = 0; aborted = false; deadline = ms ? now() + ms : Infinity;
  const moves = legal(b, side);
  if (moves.length === 1 && !opt.full) { // still give a value for the evaluation display
    let res = { move: moves[0], value: 0, exact: false, depth: 0 };
    try { deadline = now() + Math.min(ms || 300, 300); const r = deepen(b, side, Math.min(maxD, 30)); if (r) res = { move: moves[0], value: r.v / SEED, exact: r.exact, depth: r.d }; } catch (e) { if (!(e instanceof Abort)) throw e; }
    res.nodes = nodes; return res;
  }
  let best = null, d = 1;
  try {
    for (d = 1; d <= maxD; d++) {
      const r = rootBest(b, side, d, best ? best.m : -1);
      best = { m: r.m, v: r.v, exact: r.exact, d };
      if (r.exact) break;
    }
  } catch (e) { if (!(e instanceof Abort)) throw e; }
  if (!best) { best = { m: moves[0], v: 0, exact: false, d: 0 }; }
  return { move: best.m, value: best.v / SEED, exact: best.exact, depth: best.d, nodes };
}
function deepen(b, side, maxD) {
  let r = null;
  for (let d = 1; d <= maxD; d++) { const x = rootBest(b, side, d, r ? r.m : -1); r = { m: x.m, v: x.v, exact: x.exact, d }; if (x.exact) break; }
  return r;
}
// per-move analysis: list [{m, v (seeds, mover's view), exact}], depth, exact (all moves solved)
function analyze(b, side, rules, ms, maxDepth) {
  b = Int8Array.from(b); setup(b, rules);
  nodes = 0; aborted = false; deadline = now() + (ms || 1000);
  let list = null, depth = 0;
  try {
    for (let d = 1; d <= (maxDepth || 60); d++) {
      const l = rootValues(b, side, d);
      list = l; depth = d;
      if (l.every(x => x.exact)) break;
    }
  } catch (e) { if (!(e instanceof Abort)) throw e; }
  if (!list) { list = legal(b, side).map(m => ({ m, v: 0, exact: false })); }
  else list = list.map(x => ({ m: x.m, v: x.v / SEED, exact: x.exact }));
  return { list, depth, exact: list.every(x => x.exact), nodes };
}
// exact solve without time limit (generators, puzzles); returns list like analyze
function solve(b, side, rules, maxMs) {
  b = Int8Array.from(b); setup(b, rules);
  nodes = 0; aborted = false; deadline = maxMs ? now() + maxMs : Infinity;
  try {
    let l = null;
    for (let d = 2; d <= 250; d += 2) {
      l = rootValues(b, side, d);
      if (l.every(x => x.exact)) return { list: l.map(x => ({ m: x.m, v: x.v / SEED, exact: true })), exact: true, depth: d, nodes };
    }
  } catch (e) { if (!(e instanceof Abort)) throw e; }
  return null;
}

// ---------------------------------------------------------------------------- levels
// 1-3 friendly heuristics, 4-7 fixed depth (with a little noise), 8-10 timed iterative deepening
const LEVELS = [null,
  { kind: 'random' },
  { kind: 'greedy', p: 0.55 },
  { kind: 'greedy', p: 0.9 },
  { kind: 'depth', depth: 2, noise: 140 },
  { kind: 'depth', depth: 4, noise: 70 },
  { kind: 'depth', depth: 6, noise: 30 },
  { kind: 'depth', depth: 8, noise: 0 },
  { kind: 'time', ms: 350 },
  { kind: 'time', ms: 900 },
  { kind: 'time', ms: 1800 },
];
let seedRand = Math.random;
function chooseMove(b, side, rules, level) {
  const L = LEVELS[Math.max(1, Math.min(10, level | 0))];
  const moves = legal(b, side);
  if (moves.length === 0) return { move: -1 };
  if (L.kind === 'random') return { move: moves[Math.floor(seedRand() * moves.length)] };
  if (L.kind === 'greedy') {
    if (seedRand() > L.p) return { move: moves[Math.floor(seedRand() * moves.length)] };
    const g = turnMaxFirst(b, side, rules);
    let best = -1; for (const k of moves) best = Math.max(best, g[k]);
    const c = moves.filter(k => g[k] === best);
    return { move: c[Math.floor(seedRand() * c.length)] };
  }
  if (L.kind === 'depth') {
    const bb = Int8Array.from(b); setup(bb, rules);
    nodes = 0; aborted = false; deadline = Infinity;
    const list = rootValues(bb, side, L.depth);
    const noisy = list.map(x => ({ m: x.m, v: x.v + (L.noise ? (seedRand() * 2 - 1) * L.noise : 0), raw: x.v, exact: x.exact }));
    noisy.sort((a, c) => c.v - a.v);
    return { move: noisy[0].m, value: noisy[0].raw / SEED, exact: noisy[0].exact, depth: L.depth };
  }
  return think(b, side, rules, { ms: L.ms });
}

const API = { RULES, RULE_IDS, initial, play, trace, replay, legal, sideSum, storeOf, baseOf, opposite, turnMax, turnMaxFirst,
  evaluate, think, analyze, solve, chooseMove, LEVELS, W, ttClear, setRandom: f => { seedRand = f; }, get nodes() { return nodes; } };

if (typeof module !== 'undefined' && module.exports) module.exports = API;
else root.MancalaEngine = API;

// ---------------------------------------------------------------------------- worker protocol
if (typeof WorkerGlobalScope !== 'undefined' && root instanceof WorkerGlobalScope) {
  root.onmessage = ev => {
    const m = ev.data;
    try {
      const b = Int8Array.from(m.b);
      if (m.type === 'move') {
        const r = chooseMove(b, m.side, m.rules, m.level);
        root.postMessage({ type: 'move', id: m.id, move: r.move, value: r.value, exact: r.exact, depth: r.depth });
      } else if (m.type === 'analyze') {
        const r = analyze(b, m.side, m.rules, m.ms || 1000, m.maxDepth);
        root.postMessage({ type: 'analyze', id: m.id, list: r.list, depth: r.depth, exact: r.exact });
      } else if (m.type === 'solve') {
        const r = solve(b, m.side, m.rules, m.ms || 8000) || analyze(b, m.side, m.rules, 1500);
        root.postMessage({ type: 'analyze', id: m.id, list: r.list, depth: r.depth, exact: r.exact });
      }
    } catch (e) { root.postMessage({ type: 'error', id: m.id, msg: String(e && e.stack || e) }); }
  };
}
})(typeof self !== 'undefined' ? self : this);
