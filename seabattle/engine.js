// 海戦ゲーム (seabattle/) — rules + AI.  window.SeaEngine / require('./engine.js')
// Board 10×10, cell = r*10+c. Fleet 5·4·3·3·2 (17 cells). Rules: classic (1 shot a turn), streak (a hit shoots again),
// salvo (as many shots as you have ships afloat). Option adj: ships may not touch (not even at a corner).
// The AI only ever sees the public view of the target board (shots, and the cells of ships already sunk).
(function (root) {
'use strict';
const N = 10, NN = 100, FLEET = [5, 4, 3, 3, 2], TOTAL = 17;
const RULES = ['classic', 'streak', 'salvo', 'tactics'];
// タクティクス: the fleet is drafted within a budget; every ship type but the destroyer carries a skill with a cooldown
// (counted in the owner's turns). A skill replaces the turn's shot, and is lost when its ship is sunk.
//   bomb (carrier): a + of 5 squares · volley (battleship): a 2×2 block · torpedo (cruiser): runs up a column from the near
//   edge, hits the first unhit ship square and shows the water it crossed · sonar (submarine): the number of unhit ship squares in a 3×3 box
const TYPES = [
  { k: 'carrier', len: 5, cost: 6, skill: 'bomb', cd: 5 },
  { k: 'battleship', len: 4, cost: 5, skill: 'volley', cd: 4 },
  { k: 'cruiser', len: 3, cost: 4, skill: 'torpedo', cd: 5 },
  { k: 'sub', len: 3, cost: 4, skill: 'sonar', cd: 3 },
  { k: 'destroyer', len: 2, cost: 2, skill: null, cd: 0 },
];
const BUDGET = 20, MINSHIPS = 3, MAXSHIPS = 6, MAXSAME = 2, CLASSIC = [0, 1, 2, 3, 4];
const PRESETS = [[0, 1, 2, 3], [0, 1, 3, 4, 4], [1, 2, 3, 3, 4], [1, 1, 2, 3, 4], [0, 2, 3, 3, 4], [1, 2, 2, 3, 4], [0, 1, 2, 4, 4]];
function draftCost(types) { let c = 0; for (const t of types) c += TYPES[t].cost; return c; }
function validDraft(types) { if (types.length < MINSHIPS || types.length > MAXSHIPS || draftCost(types) > BUDGET) return false; const n = [0, 0, 0, 0, 0]; for (const t of types) { if (!(t >= 0 && t < 5) || ++n[t] > MAXSAME) return false; } return true; }
// The draft: 2 of each type lie on the table (10 ships); the players pick in turn — A B B A A B B A … — within the budget.
// A player with MINSHIPS or more may stop; one who cannot afford anything left stops by itself. d.turn = -1 when it is over.
const POOL = [2, 2, 2, 2, 2];
function draftNew(first) { const d = { pool: POOL.slice(), picks: [[], []], done: [false, false], first: first ? 1 : 0, n: 0, turn: first ? 1 : 0, last: null }; return d; }
function draftLeft(d, p) { return BUDGET - draftCost(d.picks[p]); }
function draftCan(d, p, k) { return d.turn === p && !d.done[p] && d.pool[k] > 0 && d.picks[p].length < MAXSHIPS && TYPES[k].cost <= draftLeft(d, p); }
function draftCanStop(d, p) { return d.turn === p && d.picks[p].length >= MINSHIPS; }
function draftNext(d) {
  for (const p of [0, 1]) if (!d.done[p] && (d.picks[p].length >= MAXSHIPS || !TYPES.some((T, k) => d.pool[k] > 0 && T.cost <= draftLeft(d, p)))) d.done[p] = true;
  if (d.done[0] && d.done[1]) { d.turn = -1; return; }
  for (let g = 0; g < 4; g++) { d.n++; const p = (((d.n + 1) >> 1) & 1) ^ d.first; if (!d.done[p]) { d.turn = p; return; } }
}
function draftPick(d, k) {        // k = type, or -1 to stop
  const p = d.turn; if (p < 0) return false;
  if (k < 0) { if (!draftCanStop(d, p)) return false; d.done[p] = true; d.last = { p, k: -1 }; }
  else { if (!draftCan(d, p, k)) return false; d.pool[k]--; d.picks[p].push(k); d.last = { p, k }; }
  draftNext(d); return true;
}
// the AI's pick: skills first, never the same recipe twice — a little taste, a little chance; stops only when nothing fits
function draftAI(d, rnd) {
  rnd = rnd || Math.random; const p = d.turn, mine = d.picks[p], left = draftLeft(d, p); let best = -1, bv = -1;
  const W = [1, .95, .8, .92, .5];
  for (let k = 0; k < 5; k++) {
    if (!draftCan(d, p, k)) continue;
    let v = W[k] + rnd() * .5; if (mine.includes(k)) v -= .35;
    const after = left - TYPES[k].cost, slots = Math.max(0, 4 - mine.length - 1); if (after < slots * 2) v -= 2;     // keep room for a fleet of four
    if (v > bv) { bv = v; best = k; }
  }
  return best;
}
const typeOf = (s, i) => s.t != null ? s.t : i;

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
function validFleet(ships, adj, tactics) {
  if (!Array.isArray(ships)) return false;
  const types = ships.map((s, i) => s ? typeOf(s, i) : -1);
  if (tactics ? !validDraft(types) : (ships.length !== 5 || types.some((t, i) => t !== i))) return false;
  const g = new Int8Array(NN).fill(-1);
  for (let i = 0; i < ships.length; i++) { const s = ships[i]; if (!s || s.len !== TYPES[types[i]].len || !fits(g, s, adj, -2)) return false; for (const k of shipCells(s)) g[k] = i; }
  return true;
}
function randomFleet(rnd, adj, types) {
  rnd = rnd || Math.random; types = types || CLASSIC;
  for (;;) {
    const g = new Int8Array(NN).fill(-1), ships = []; let ok = true;
    for (let i = 0; i < types.length && ok; i++) {
      let done = false;
      for (let t = 0; t < 200 && !done; t++) {
        const s = { r: rnd() * N | 0, c: rnd() * N | 0, len: TYPES[types[i]].len, h: rnd() < .5 ? 1 : 0, t: types[i] };
        if (fits(g, s, adj, -2)) { for (const k of shipCells(s)) g[k] = i; ships.push(s); done = true; }
      }
      ok = done;
    }
    if (ok) return ships;
  }
}

function newSide(ships) { return { ships: ships.map((s, i) => ({ r: s.r, c: s.c, len: s.len, h: s.h ? 1 : 0, t: typeOf(s, i) })), grid: gridOf(ships), shots: new Uint8Array(NN), hitsOn: ships.map(() => 0), sunk: ships.map(() => false), afloat: ships.length, hits: 0, nshots: 0 }; }
function newGame(o) {
  const st = { rule: RULES.includes(o.rule) ? o.rule : 'classic', adj: !!o.adj, sides: [newSide(o.fleets[0]), newSide(o.fleets[1])], turn: o.first ? 1 : 0, winner: -1, log: [], acts: [], left: 1, cd: null, scans: [[], []] };
  if (st.rule === 'tactics') st.cd = st.sides.map(sd => sd.ships.map(s => TYPES[s.t].skill ? Math.ceil(TYPES[s.t].cd / 2) : -1));
  st.left = quota(st);
  return st;
}
function unknownCount(side) { let n = 0; for (let i = 0; i < NN; i++) if (!side.shots[i]) n++; return n; }
function quota(st) { return st.rule === 'salvo' ? Math.max(1, Math.min(st.sides[st.turn].afloat, unknownCount(st.sides[1 - st.turn]))) : 1; }
function strike(st, by, cell) {      // one shell on the other side's square (no turn logic)
  const T = st.sides[1 - by], si = T.grid[cell], res = { by, cell, hit: si >= 0, sunk: -1 };
  T.nshots++;
  if (si >= 0) { T.shots[cell] = 2; T.hits++; if (++T.hitsOn[si] === T.ships[si].len) { T.sunk[si] = true; T.afloat--; res.sunk = si; } }
  else T.shots[cell] = 1;
  if (T.afloat === 0) st.winner = by;
  return res;
}
function pass(st, by) { st.turn = 1 - by; if (st.cd) { const c = st.cd[st.turn]; for (let i = 0; i < c.length; i++) if (c[i] > 0) c[i]--; } }
// the player to move (st.turn) shoots at `cell` of the other side. → { by, cell, hit, sunk (ship index or -1), win, again } or null
function fire(st, cell) {
  if (st.winner >= 0) return null;
  const by = st.turn, T = st.sides[1 - by];
  if (!(cell >= 0 && cell < NN) || T.shots[cell]) return null;
  const res = strike(st, by, cell); res.win = st.winner === by; res.again = false;
  if (res.win) {}
  else if (st.rule === 'streak') { if (!res.hit) pass(st, by); else res.again = true; }
  else if (st.rule === 'salvo') { if (--st.left <= 0) { pass(st, by); st.left = quota(st); } else res.again = true; }
  else pass(st, by);
  if (st.rule !== 'salvo') st.left = 1;
  st.log.push({ by, cell, hit: res.hit, sunk: res.sunk }); st.acts.push({ cell });
  return res;
}
// ---- skills (タクティクス) ----
function footprint(skill, cell) {
  const r = cell / N | 0, c = cell % N, o = [];
  if (skill === 'sonar') { for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < N && cc >= 0 && cc < N) o.push(rr * N + cc); } }
  else if (skill === 'bomb') { o.push(cell); for (const n of neighbors4(cell)) o.push(n); }
  else if (skill === 'volley') { const r0 = Math.min(r, N - 2), c0 = Math.min(c, N - 2); o.push(r0 * N + c0, r0 * N + c0 + 1, (r0 + 1) * N + c0, (r0 + 1) * N + c0 + 1); }
  else if (skill === 'torpedo') { for (let rr = N - 1; rr >= 0; rr--) o.push(rr * N + c); }
  return o;
}
function skillReady(st, by, ship) { return !!st.cd && st.winner < 0 && st.cd[by][ship] === 0 && !st.sides[by].sunk[ship]; }
// what a skill would do (pure): the squares that get a shell, in order, with the result — used for the effects before act()
function preview(st, ship, cell) {
  const by = st.turn; if (!skillReady(st, by, ship) || !(cell >= 0 && cell < NN)) return null;
  const skill = TYPES[st.sides[by].ships[ship].t].skill, T = st.sides[1 - by], area = footprint(skill, cell), shots = [];
  if (skill === 'sonar') { const U = area.filter(k => !T.shots[k]); if (!U.length) return null; return { skill, area, U, k: U.filter(x => T.grid[x] >= 0).length, shots }; }
  for (const k of area) { if (T.shots[k]) continue; shots.push({ cell: k, hit: T.grid[k] >= 0 }); if (skill === 'torpedo' && T.grid[k] >= 0) break; }
  return shots.length ? { skill, area, shots } : null;
}
// use the skill of the mover's ship `ship` at `cell`. → { by, skill, ship, cell, shots: [{cell, hit, sunk}], k (sonar), win } or null
function useSkill(st, ship, cell) {
  const pv = preview(st, ship, cell); if (!pv) return null;
  const by = st.turn, res = { by, skill: pv.skill, ship, cell, area: pv.area, shots: [], k: pv.k, win: false };
  st.log.push({ by, cell, skill: pv.skill, k: pv.k });
  if (pv.skill === 'sonar') st.scans[by].push({ cells: pv.U, k: pv.k, at: cell });
  for (const x of pv.shots) { const r = strike(st, by, x.cell); res.shots.push(r); st.log.push({ by, cell: r.cell, hit: r.hit, sunk: r.sunk, via: pv.skill }); if (st.winner >= 0) break; }
  st.cd[by][ship] = TYPES[st.sides[by].ships[ship].t].cd;
  st.acts.push({ skill: pv.skill, ship, cell });
  res.win = st.winner === by;
  if (!res.win) pass(st, by);
  return res;
}
function act(st, a) { return a.skill ? useSkill(st, a.ship, a.cell) : fire(st, a.cell); }

// ---- what the shooter knows about a target side ----
function view(side, scans) {
  const sunkCell = new Uint8Array(NN), lens = [];
  side.ships.forEach((s, i) => { if (side.sunk[i]) for (const k of shipCells(s)) sunkCell[k] = 1; else lens.push(s.len); });
  return { shots: side.shots, sunkCell, lens, scans: scans && scans.length ? scans : null };
}
// a sonar reading: of the squares that were unknown then, k hold a ship. What is left of it now: r ships among the U still unknown
function scanLeft(v, sc) { let r = sc.k; const U = []; for (const c of sc.cells) { if (v.shots[c] === 2) r--; else if (!v.shots[c]) U.push(c); } return { r: Math.max(0, r), U }; }
function prep(v, adj) {
  const blocked = new Uint8Array(NN), open = new Uint8Array(NN); let nOpen = 0; const hitList = [];
  for (let i = 0; i < NN; i++) {
    if (v.shots[i] === 1 || v.sunkCell[i]) blocked[i] = 1;
    else if (v.shots[i] === 2) { open[i] = 1; nOpen++; hitList.push(i); }
  }
  if (adj) for (let i = 0; i < NN; i++) if (v.sunkCell[i]) for (const n of neighbors8(i)) if (!v.shots[n]) blocked[n] = 1;
  if (v.scans) for (const sc of v.scans) { const L = scanLeft(v, sc); if (L.r === 0) for (const c of L.U) blocked[c] = 1; }
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
  const R = P.nOpen && target > 0 ? Ht : H;
  if (v.scans) {      // lean the map toward what the sonar said: density r / |U| inside the box, against the average outside
    let un = 0, need = -P.nOpen; for (let i = 0; i < NN; i++) if (!v.shots[i] && !P.blocked[i]) un++; for (const l of v.lens) need += l;
    const base = Math.max(.02, need / Math.max(1, un));
    for (const sc of v.scans) { const L = scanLeft(v, sc); if (!L.r || !L.U.length) continue; const f = Math.min(8, Math.max(.15, (L.r / L.U.length) / base)); for (const c of L.U) R[c] *= f; }
  }
  return R;
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
function choose(side, level, adj, rnd, scans) {
  rnd = rnd || Math.random;
  const v = view(side, scans), L = levelSpec(level);
  if (rnd() < L.eps) {
    const P = prep(v, adj);
    if (P.nOpen && rnd() < L.follow) { const nb = []; for (const h of P.hitList) for (const n of neighbors4(h)) if (!v.shots[n] && !P.blocked[n]) nb.push(n); if (nb.length) return nb[rnd() * nb.length | 0]; }
    return randomUnknown(v, rnd);
  }
  const b = argmax(heat(v, adj, 6), v, rnd);
  return b >= 0 ? b : randomUnknown(v, rnd);
}
// the hint / coach map: probabilities 0..1 for every unknown cell + the best cell
// squares → rough probabilities from the density map (scaled so they add up to the ship squares still hidden)
function probs(v, adj) { const H = heat(v, adj, 6), P = prep(v, adj); let sum = 0, need = -P.nOpen; for (const l of v.lens) need += l; for (let i = 0; i < NN; i++) sum += H[i]; const o = new Float64Array(NN); if (sum > 0) for (let i = 0; i < NN; i++) o[i] = Math.min(1, H[i] / sum * need); return o; }
function advise(side, adj, rnd, K, scans) {
  rnd = rnd || Math.random;
  const v = view(side, scans); let H = v.scans ? null : jointHeat(v, adj, rnd, K || 600), joint = true;
  if (!H) { joint = false; H = probs(v, adj); }
  return { p: H, best: argmax(H, v, rnd), joint };
}
// タクティクス: a shot or a skill. Skills are valued by what they are expected to find; low levels often just shoot.
function chooseAction(st, level, rnd) {
  rnd = rnd || Math.random;
  const by = st.turn, T = st.sides[1 - by], scans = st.scans[by];
  const shot = () => ({ cell: choose(T, level, st.adj, rnd, scans) });
  if (!st.cd) return shot();
  const ready = []; st.cd[by].forEach((c, i) => { if (skillReady(st, by, i)) ready.push(i); });
  if (!ready.length || rnd() < levelSpec(level).eps * .9) return shot();
  const v = view(T, scans), p = probs(v, st.adj), P = prep(v, st.adj);
  let best = { cell: argmax(p, v, rnd) }, bv = best.cell >= 0 ? p[best.cell] : 0; if (best.cell < 0) return shot();
  for (const i of ready) {
    const skill = TYPES[st.sides[by].ships[i].t].skill; let sv = -1, sc = -1;
    for (let c = 0; c < NN; c++) {
      if (skill === 'torpedo' && c >= N) break;
      if (skill === 'volley' && (c % N === N - 1 || c >= NN - N)) continue;
      const fp = footprint(skill, c); let val = 0, un = 0, miss = 1;
      for (const k of fp) if (!v.shots[k]) { un++; val += p[k]; miss *= 1 - p[k]; }
      if (!un) continue;
      if (skill === 'torpedo') val = (1 - miss) + .03 * un;
      else if (skill === 'sonar') val = P.nOpen || un < 6 ? -1 : .5 - Math.abs(val - 1.3) * .08;
      val += 1e-4 * rnd();
      if (val > sv) { sv = val; sc = c; }
    }
    if (sv > bv) { bv = sv; best = { skill, ship: i, cell: sc }; }
  }
  return best;
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

const E = { N, NN, FLEET, TOTAL, RULES, TYPES, BUDGET, MINSHIPS, MAXSHIPS, MAXSAME, PRESETS, POOL, draftNew, draftLeft, draftCan, draftCanStop, draftPick, draftAI, draftCost, validDraft, footprint, skillReady, preview, useSkill, act, chooseAction, probs, scanLeft, rng, shipCells, inside, fits, gridOf, validFleet, randomFleet, newSide, newGame, fire, quota, view, heat, jointHeat, choose, advise, winProb, shotsToFinish, levelSpec, neighbors4, neighbors8, cellName };
if (typeof module !== 'undefined' && module.exports) module.exports = E; else root.SeaEngine = E;
})(typeof self !== 'undefined' ? self : this);
