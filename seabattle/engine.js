// 海戦ゲーム (seabattle/) — rules + AI.  window.SeaEngine / require('./engine.js')
// Board 10×10, cell = r*10+c. Fleet 5·4·3·3·2 (17 cells). Rules: classic (1 shot a turn), streak (a hit shoots again),
// salvo (as many shots as you have ships afloat). Option adj: ships may not touch (not even at a corner).
// The AI only ever sees the public view of the target board (shots, and the cells of ships already sunk).
(function (root) {
'use strict';
const N = 10, NN = 100, FLEET = [5, 4, 3, 3, 2], TOTAL = 17;
const RULES = ['classic', 'streak', 'salvo'];

function rng(seed) { let a = (seed >>> 0) || 1; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function shipCells(s) { const o = []; for (let i = 0; i < s.len; i++) o.push(s.h ? s.r * N + s.c + i : (s.r + i) * N + s.c); return o; }
function inside(s) { return s.r >= 0 && s.c >= 0 && (s.h ? s.c + s.len <= N && s.r < N : s.r + s.len <= N && s.c < N); }
function neighbors8(cell) { const r = cell / N | 0, c = cell % N, o = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < N && cc >= 0 && cc < N) o.push(rr * N + cc); } return o; }
function neighbors4(cell) { const r = cell / N | 0, c = cell % N, o = []; if (r > 0) o.push(cell - N); if (r < N - 1) o.push(cell + N); if (c > 0) o.push(cell - 1); if (c < N - 1) o.push(cell + 1); return o; }

// can ship s go on a grid (Int8Array, -1 = empty) ignoring ship index `skip`?
function fits(grid, s, adj, skip) {
  if (!inside(s)) return false;
  const cs = shipCells(s);
  for (const k of cs) {
    if (grid[k] >= 0 && grid[k] !== skip) return false;
    if (adj) for (const n of neighbors8(k)) if (grid[n] >= 0 && grid[n] !== skip) return false;
  }
  return true;
}
function gridOf(ships) { const g = new Int8Array(NN).fill(-1); ships.forEach((s, i) => { if (s) for (const k of shipCells(s)) g[k] = i; }); return g; }
function validFleet(ships, adj) {
  if (!ships || ships.length !== FLEET.length) return false;
  const g = new Int8Array(NN).fill(-1);
  for (let i = 0; i < ships.length; i++) { const s = ships[i]; if (!s || s.len !== FLEET[i] || !fits(g, s, adj, -2)) return false; for (const k of shipCells(s)) g[k] = i; }
  return true;
}
function randomFleet(rnd, adj) {
  rnd = rnd || Math.random;
  for (;;) {
    const g = new Int8Array(NN).fill(-1), ships = []; let ok = true;
    for (let i = 0; i < FLEET.length && ok; i++) {
      let done = false;
      for (let t = 0; t < 200 && !done; t++) {
        const s = { r: rnd() * N | 0, c: rnd() * N | 0, len: FLEET[i], h: rnd() < .5 ? 1 : 0 };
        if (fits(g, s, adj, -2)) { for (const k of shipCells(s)) g[k] = i; ships.push(s); done = true; }
      }
      ok = done;
    }
    if (ok) return ships;
  }
}

function newSide(ships) { return { ships: ships.map(s => ({ r: s.r, c: s.c, len: s.len, h: s.h ? 1 : 0 })), grid: gridOf(ships), shots: new Uint8Array(NN), hitsOn: ships.map(() => 0), sunk: ships.map(() => false), afloat: ships.length, hits: 0, nshots: 0 }; }
function newGame(o) {
  const st = { rule: RULES.includes(o.rule) ? o.rule : 'classic', adj: !!o.adj, sides: [newSide(o.fleets[0]), newSide(o.fleets[1])], turn: o.first ? 1 : 0, winner: -1, log: [], left: 1 };
  st.left = quota(st);
  return st;
}
function unknownCount(side) { let n = 0; for (let i = 0; i < NN; i++) if (!side.shots[i]) n++; return n; }
function quota(st) { return st.rule === 'salvo' ? Math.max(1, Math.min(st.sides[st.turn].afloat, unknownCount(st.sides[1 - st.turn]))) : 1; }
// the player to move (st.turn) shoots at `cell` of the other side. → { by, cell, hit, sunk (ship index or -1), win, again } or null
function fire(st, cell) {
  if (st.winner >= 0) return null;
  const by = st.turn, T = st.sides[1 - by];
  if (cell < 0 || cell >= NN || T.shots[cell]) return null;
  const si = T.grid[cell], res = { by, cell, hit: si >= 0, sunk: -1, win: false, again: false };
  T.nshots++;
  if (si >= 0) { T.shots[cell] = 2; T.hits++; if (++T.hitsOn[si] === T.ships[si].len) { T.sunk[si] = true; T.afloat--; res.sunk = si; } }
  else T.shots[cell] = 1;
  if (T.afloat === 0) { st.winner = by; res.win = true; }
  else if (st.rule === 'streak') { if (!res.hit) { st.turn = 1 - by; } else res.again = true; }
  else if (st.rule === 'salvo') { if (--st.left <= 0) { st.turn = 1 - by; st.left = quota(st); } else res.again = true; }
  else st.turn = 1 - by;
  if (st.rule !== 'salvo') st.left = 1;
  st.log.push({ by, cell, hit: res.hit, sunk: res.sunk });
  return res;
}

// ---- what the shooter knows about a target side ----
function view(side) {
  const sunkCell = new Uint8Array(NN), lens = [];
  side.ships.forEach((s, i) => { if (side.sunk[i]) for (const k of shipCells(s)) sunkCell[k] = 1; else lens.push(s.len); });
  return { shots: side.shots, sunkCell, lens };
}
function prep(v, adj) {
  const blocked = new Uint8Array(NN), open = new Uint8Array(NN); let nOpen = 0; const hitList = [];
  for (let i = 0; i < NN; i++) {
    if (v.shots[i] === 1 || v.sunkCell[i]) blocked[i] = 1;
    else if (v.shots[i] === 2) { open[i] = 1; nOpen++; hitList.push(i); }
  }
  if (adj) for (let i = 0; i < NN; i++) if (v.sunkCell[i]) for (const n of neighbors8(i)) if (!v.shots[n]) blocked[n] = 1;
  return { blocked, open, nOpen, hitList };
}
// every placement of a ship of length len that the public view allows: [cells, hitsCovered]
function placements(len, P) {
  const out = [];
  for (let h = 0; h < 2; h++) for (let r = 0; r < (h ? N : N - len + 1); r++) for (let c = 0; c < (h ? N - len + 1 : N); c++) {
    let k = 0, ok = true; const cs = new Array(len);
    for (let i = 0; i < len; i++) { const cell = h ? r * N + c + i : (r + i) * N + c; if (P.blocked[cell]) { ok = false; break; } if (P.open[cell]) k++; cs[i] = cell; }
    if (ok && k < len) out.push([cs, k]);
  }
  return out;
}
// probability-density map: for each unknown cell, the (weighted) number of placements of the ships still afloat that cover it
function heat(v, adj, W) {
  W = W || 24;
  const P = prep(v, adj), H = new Float64Array(NN), Ht = new Float64Array(NN); let target = 0;
  for (const len of v.lens) for (const [cs, k] of placements(len, P)) {
    const w = k ? Math.pow(W, k) : 1;
    for (const cell of cs) if (!v.shots[cell]) { H[cell] += w; if (k) { Ht[cell] += w; target += w; } }
  }
  return P.nOpen && target > 0 ? Ht : H;
}
// Whole-fleet sampling (ships cannot overlap, every open hit is explained, no ship lies entirely on hits) — uniform over the
// fleets that fit the public view. With open hits: exactly one ship covers the first open hit, so every (ship, placement)
// that covers it is tried in turn and the other ships are drawn at random; trials are weighted by the size of the space
// they were drawn from. Returns [cellLists, weight] samples through cb.
function sampler(v, adj) { const P = prep(v, adj), PL = {}; for (const len of v.lens) if (!PL[len]) PL[len] = placements(len, P); return { P, PL }; }
function complete(v, adj, rnd, S, fixedIdx, fixedCells) {
  const P = S.P, occ = new Uint8Array(NN), near = adj ? new Uint8Array(NN) : null, out = []; let covered = 0;
  const put = cs => { for (const c of cs) { if (occ[c] || (near && near[c])) return false; } for (const c of cs) { occ[c] = 1; if (P.open[c]) covered++; } if (near) for (const c of cs) for (const n of neighbors8(c)) near[n] = 1; out.push(cs); return true; };
  if (fixedCells && !put(fixedCells)) return null;
  for (let i = 0; i < v.lens.length; i++) { if (i === fixedIdx) continue; const list = S.PL[v.lens[i]]; if (!put(list[rnd() * list.length | 0][0])) return null; }
  if (covered < P.nOpen) return null;
  for (const cs of out) { let k = 0; for (const c of cs) if (P.open[c]) k++; if (k === cs.length) return null; }
  return out;
}
function drawFleets(v, adj, rnd, K, cb) {
  const S = sampler(v, adj); let got = 0;
  for (const len of v.lens) if (!S.PL[len].length) return 0;
  if (!S.P.nOpen) { for (let t = 0; t < K * 6 && got < K; t++) { const f = complete(v, adj, rnd, S, -1, null); if (f) { got++; cb(f, 1); } } return got; }
  const h0 = S.P.hitList[0], cand = [];
  let tot = 1; for (const len of v.lens) tot *= S.PL[len].length;
  for (let i = 0; i < v.lens.length; i++) { const list = S.PL[v.lens[i]]; for (const p of list) if (p[1] && p[0].includes(h0)) cand.push([i, p[0], tot / list.length]); }
  if (!cand.length) return 0;
  let wmax = 0; for (const c of cand) if (c[2] > wmax) wmax = c[2];
  const M = Math.max(4, Math.ceil(K * 5 / cand.length));
  for (const [i, cs, w] of cand) for (let t = 0; t < M; t++) { const f = complete(v, adj, rnd, S, i, cs); if (f) { got++; cb(f, w / wmax); } }
  return got;
}
function sample(v, adj, rnd) { let pick = null, acc = 0; drawFleets(v, adj, rnd, 24, (f, w) => { acc += w; if (rnd() * acc < w) pick = f; }); return pick; }
// density from whole-fleet samples — sharper than heat()
function jointHeat(v, adj, rnd, K) {
  const H = new Float64Array(NN); let W = 0;
  const got = drawFleets(v, adj, rnd, K, (f, w) => { W += w; for (const cs of f) for (const c of cs) if (!v.shots[c]) H[c] += w; });
  if (got < Math.max(12, K / 8) || W <= 0) return null;
  for (let i = 0; i < NN; i++) H[i] /= W;
  return H;
}
function argmax(H, v, rnd) { let best = -1, bv = -1; for (let i = 0; i < NN; i++) { if (v.shots[i]) continue; const x = H[i] * (1 + 1e-6 * rnd()); if (x > bv) { bv = x; best = i; } } return best; }
function randomUnknown(v, rnd) { const u = []; for (let i = 0; i < NN; i++) if (!v.shots[i]) u.push(i); return u.length ? u[rnd() * u.length | 0] : -1; }

// ---- AI: Lv.1–20 ----
// Every level reads the same probability-density map; what changes is how often a shot is unplanned (random sea, or a random
// neighbour of a hit) — from most shots at Lv.1 to none at Lv.20. Measured with tools/test_engine.js (average shots to sink
// a whole fleet): see claude/seabattle-spec.md.
function levelSpec(lv) {
  lv = Math.max(1, Math.min(20, lv | 0));
  const x = (20 - lv) / 19;
  return { eps: EPS1 * Math.pow(x, EPSP), follow: Math.min(1, FOL1 + (1 - FOL1) * (lv - 1) / 12) };
}
let EPS1 = 1, EPSP = .7, FOL1 = .2;
function choose(side, level, adj, rnd) {
  rnd = rnd || Math.random;
  const v = view(side), L = levelSpec(level);
  if (rnd() < L.eps) {
    const P = prep(v, adj);
    if (P.nOpen && rnd() < L.follow) { const nb = []; for (const h of P.hitList) for (const n of neighbors4(h)) if (!v.shots[n] && !P.blocked[n]) nb.push(n); if (nb.length) return nb[rnd() * nb.length | 0]; }
    return randomUnknown(v, rnd);
  }
  const b = argmax(heat(v, adj, 6), v, rnd);
  return b >= 0 ? b : randomUnknown(v, rnd);
}
// the hint / coach map: probabilities 0..1 for every unknown cell + the best cell
function advise(side, adj, rnd, K) {
  rnd = rnd || Math.random;
  const v = view(side); let H = jointHeat(v, adj, rnd, K || 600), joint = true;
  if (!H) { joint = false; H = heat(v, adj); let s = 0; for (let i = 0; i < NN; i++) s += H[i]; const need = v.lens.reduce((a, b) => a + b, 0) - prep(v, adj).nOpen; if (s > 0) for (let i = 0; i < NN; i++) H[i] = Math.min(1, H[i] / s * need); }
  return { p: H, best: argmax(H, v, rnd), joint };
}

// ---- 形勢: public-information rollouts ----
// For each board: imagine a fleet that fits what the shooter knows, let the density-map shooter finish it, count the shots.
function shotsToFinish(side, adj, rnd) {
  const v = view(side); let f = null;
  for (let t = 0; t < 4 && !f; t++) f = sample(v, adj, rnd);
  if (!f) return null;
  const shots = Uint8Array.from(side.shots), sunkCell = Uint8Array.from(v.sunkCell), grid = new Int8Array(NN).fill(-1), hitsOn = f.map(() => 0); let afloat = f.length, n = 0;
  f.forEach((cs, i) => { for (const c of cs) { grid[c] = i; if (shots[c] === 2) hitsOn[i]++; } });
  const lens = f.map(cs => cs.length), alive = f.map(() => true);
  while (afloat > 0 && n < NN) {
    const vv = { shots, sunkCell, lens: lens.filter((_, i) => alive[i]) };
    const c = argmax(heat(vv, adj, 6), vv, rnd); if (c < 0) break;
    n++; const si = grid[c];
    if (si >= 0) { shots[c] = 2; if (++hitsOn[si] === lens[si]) { alive[si] = false; afloat--; for (const k of f[si]) sunkCell[k] = 1; } } else shots[c] = 1;
  }
  return n;
}
// chance that player `me` wins, from public information only (0..1)
function winProb(st, me, rnd, n) {
  if (st.winner >= 0) return st.winner === me ? 1 : 0;
  rnd = rnd || Math.random; n = n || 10;
  const a = [], b = [];
  for (let i = 0; i < n; i++) { const x = shotsToFinish(st.sides[1 - me], st.adj, rnd), y = shotsToFinish(st.sides[me], st.adj, rnd); if (x != null) a.push(x); if (y != null) b.push(y); }
  if (!a.length || !b.length) { const x = TOTAL - st.sides[1 - me].hits, y = TOTAL - st.sides[me].hits; return 1 / (1 + Math.exp((x - y) * .35)); }
  const myMove = st.turn === me; let w = 0;
  for (const x of a) for (const y of b) w += x < y ? 1 : x > y ? 0 : myMove ? 1 : 0;
  return w / (a.length * b.length);
}

const COLS = 'ABCDEFGHIJ';
function cellName(cell) { return COLS[cell % N] + ((cell / N | 0) + 1); }

const E = { _tune: (a, b, c) => { EPS1 = a; EPSP = b; FOL1 = c; }, N, NN, FLEET, TOTAL, RULES, rng, shipCells, inside, fits, gridOf, validFleet, randomFleet, newSide, newGame, fire, quota, view, heat, jointHeat, choose, advise, winProb, shotsToFinish, levelSpec, neighbors4, neighbors8, cellName };
if (typeof module !== 'undefined' && module.exports) module.exports = E; else root.SeaEngine = E;
})(typeof self !== 'undefined' ? self : this);
