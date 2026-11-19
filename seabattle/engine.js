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
  { k: 'cruiser', len: 3, cost: 5, skill: 'torpedo', cd: 6 },
  { k: 'sub', len: 3, cost: 4, skill: 'sonar', cd: 3 },
  { k: 'destroyer', len: 2, cost: 2, skill: null, cd: 0 },
  // 第1弾の新しい艦 (2026-11-20 user: デッキ構築を深めるため艦を増やす) — defence, information, tempo and support, not just more fire:
  //   armored: always — the first shell that hits it only dents the plate (the square shows as dented and must be hit again)
  //   smoke: for the opponent's next 2 turns every result of theirs is hidden ("?") until the smoke clears — no target needed
  //   scout (seaplane tender): the number of unhit ship squares in a whole row · twin (gunboat): this shot and one more
  //   command (flagship): the other ships' cooldowns −3 · jam (electronic warfare): the enemy's skill cooldowns +2
  { k: 'armored', len: 3, cost: 4, skill: null, cd: 0, armor: 1 },
  { k: 'smoke', len: 2, cost: 2, skill: 'smoke', cd: 5 },
  { k: 'tender', len: 3, cost: 4, skill: 'scout', cd: 4 },
  { k: 'gunboat', len: 3, cost: 5, skill: 'twin', cd: 5 },
  { k: 'flagship', len: 4, cost: 3, skill: 'command', cd: 6 },
  { k: 'jammer', len: 3, cost: 3, skill: 'jam', cd: 4 },
  // 第2弾 (2026-11-20): rocket — a row of 3 squares · repair (repair ship) — the latest hit on one of your afloat ships is mended (the square is unknown to the enemy again)
  { k: 'rocket', len: 3, cost: 4, skill: 'rocket', cd: 4 },
  { k: 'repair', len: 3, cost: 3, skill: 'repair', cd: 5 },
  // 第3弾 (2026-11-20): aa (anti-air cruiser) — always, while afloat: the enemy's bomb / volley / rocket loses its last shell (shot down)
  //   mine (minelayer) — lays a mine on the empty square of your sea the enemy is most likely to shoot next (at most 2 at a time);
  //   a shell on it is a miss, and the shooter loses their next turn
  { k: 'aa', len: 3, cost: 4, skill: null, cd: 0, aa: 1 },
  { k: 'mine', len: 2, cost: 2, skill: 'mine', cd: 4 },
  // 第4弾 (2026-11-20): dread (dreadnought) — barrage: a 3×3 block · radar — the number of unhit ship squares in a whole column
  //   decoy — a dummy hull: it can be hit and sunk, but it need not be sunk to win (the enemy does not know which 2-long ship it is)
  { k: 'dread', len: 5, cost: 7, skill: 'barrage', cd: 7 },
  { k: 'radar', len: 4, cost: 3, skill: 'radar', cd: 4 },
  { k: 'decoy', len: 2, cost: 1, skill: null, cd: 0, decoy: 1 },
  // 第5弾 (2026-11-20): monitor — always: each shell that hits it is answered at once by a free shell on the shooter's sea
  //   (on the square its side's map likes best; a return shell never triggers another) · patrol — probe: shoot one square and learn
  //   how many unhit ship squares lie on its 4 neighbours
  { k: 'monitor', len: 3, cost: 4, skill: null, cd: 0, counter: 1 },
  { k: 'patrol', len: 2, cost: 3, skill: 'probe', cd: 5 },
  // 第6弾 (2026-11-20): supply — always, while afloat: when another of your ships is sunk, your other skills' cooldowns −3
  //   hospital — always, while afloat: the skills of your sunk ships can still be used
  { k: 'supply', len: 3, cost: 3, skill: null, cd: 0, rally: 1 },
  { k: 'hospital', len: 4, cost: 4, skill: null, cd: 0, hospital: 1 },
  // 第7弾 (2026-11-20): light carrier — strafe: an X of 5 squares (the square and its 4 diagonals) · torpedo boat — a torpedo along a row,
  //   from the left edge, that hits the first unhit ship square (the water it passes shows as misses)
  { k: 'lcarrier', len: 4, cost: 5, skill: 'strafe', cd: 6 },
  { k: 'tboat', len: 2, cost: 5, skill: 'rtorpedo', cd: 6 },
  // 第8弾 (2026-11-20): suppressor — suppress: the enemy's always-on abilities (armor, anti-air, return fire, resupply, rescue) stop
  //   for your next 2 turns · sweeper — sweep: a 3×3 box like sonar (the unhit ship squares in it), and any enemy mines in it are cleared
  { k: 'suppressor', len: 3, cost: 2, skill: 'suppress', cd: 4 },
  { k: 'sweeper', len: 2, cost: 3, skill: 'sweep', cd: 4 },
  // 第9弾 (2026-11-20): flare (star-shell ship) — lights a 2×2 box: each unknown square is shown as ship or water, without shooting
  //   ecm (ECM ship) — ward: the enemy's next skill aimed at you fails (until your next turn; skills on their own fleet are not stopped)
  { k: 'flare', len: 3, cost: 3, skill: 'flare', cd: 5 },
  { k: 'ecm', len: 3, cost: 2, skill: 'ward', cd: 4 },
  // 第10弾 (2026-11-20): rapid (quick-firing ship) — this turn, keep shooting as long as your shells hit (then shoot as usual)
  //   intel (intelligence ship) — one unhit square of the enemy's largest afloat ship is revealed (marked, not shot)
  { k: 'rapidship', len: 3, cost: 4, skill: 'rapid', cd: 6 },
  { k: 'intel', len: 3, cost: 4, skill: 'intel', cd: 7 },
  // 第11弾 (2026-11-20): battlecruiser — lance: a vertical line of 4 squares · transport — no skill, costs nothing: a free but long target
  { k: 'bcruiser', len: 4, cost: 5, skill: 'lance', cd: 5 },
  { k: 'transport', len: 4, cost: 0, skill: null, cd: 0 },
  // 第12弾 (2026-11-20): echo (wide-sonar ship) — echo: the unhit ship squares in a 5×5 box · tracker (ESM ship) — always, while afloat:
  //   the first time each enemy ship uses a skill on you, a sonar reading (3×3) around one of its squares is given to you
  { k: 'echo', len: 4, cost: 3, skill: 'echo', cd: 6 },
  { k: 'tracker', len: 3, cost: 6, skill: null, cd: 0, trace: 1 },
  // 第13弾 (2026-11-20): heavy cruiser — armor 2: the first two shells that hit it only dent (on two different squares)
  //   spotter (spotter-plane ship) — diagonal: the unhit ship squares on the whole ↘ diagonal through the square
  { k: 'hcruiser', len: 4, cost: 4, skill: null, cd: 0, armor: 2 },
  { k: 'spotter', len: 3, cost: 3, skill: 'diag', cd: 4 },
  // 第14弾 (2026-11-20): subchaser — depth charge: shoot one square; on a hit its 4 neighbours are shot too
  //   plating (plating ship) — plate: the afloat ship of yours with the most hits (none yet armored) gets an armor plate (the next hit on it only dents)
  { k: 'subchaser', len: 2, cost: 4, skill: 'depth', cd: 4 },
  { k: 'plating', len: 3, cost: 2, skill: 'plate', cd: 6 },
];
const SELF = { smoke: 1, command: 1, repair: 1, mine: 1, ward: 1, rapid: 1, plate: 1 };   // skills that act on your own fleet (a ward does not stop them)
const PASSIVE = t => !!(t.armor || t.aa || t.counter || t.rally || t.hospital || t.trace);
const AREA = { bomb: 1, volley: 1, rocket: 1, barrage: 1, strafe: 1, lance: 1 }, SCAN = { sonar: 1, scout: 1, radar: 1, sweep: 1, echo: 1, diag: 1 }, MAXMINES = 2;
const NOAIM = { smoke: 1, command: 1, jam: 1, repair: 1, mine: 1, suppress: 1, ward: 1, rapid: 1, intel: 1, plate: 1 };   // skills that need no square
// the field (2026-11-20): the destroyer and 6 other types drawn at random, 2 of each — at least one attacker, one scout and one of
// defence / support — and a fleet takes each type at most once, so the drafts differ from game to game
const ROLE = { atk: [0, 1, 2, 8, 11, 15, 22, 23, 28, 30, 36], info: [3, 7, 16, 19, 25, 26, 29, 32, 33, 35], def: [5, 6, 9, 10, 12, 13, 14, 17, 18, 20, 21, 24, 27, 34, 37] };
const BUDGET = 20, MINSHIPS = 3, MAXSHIPS = 6, MAXSAME = 1, CLASSIC = [0, 1, 2, 3, 4], NT = TYPES.length;
const PRESETS = [[0, 1, 2, 3], [0, 1, 3, 4], [1, 2, 3, 4, 6], [1, 8, 7, 4, 6], [0, 5, 3, 4], [9, 1, 8, 3], [0, 10, 7, 4, 6]];
function draftCost(types) { let c = 0; for (const t of types) c += TYPES[t].cost; return c; }
function validDraft(types) { if (types.length < MINSHIPS || types.length > MAXSHIPS || draftCost(types) > BUDGET) return false; const n = new Array(NT).fill(0); for (const t of types) { if (!(t >= 0 && t < NT) || ++n[t] > MAXSAME) return false; } return true; }
// The draft: 2 of each type lie on the table (10 ships); the players pick in turn — A B B A A B B A … — within the budget.
// A player with MINSHIPS or more may stop; one who cannot afford anything left stops by itself. d.turn = -1 when it is over.
const POOL = [2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
function field(rnd) {
  rnd = rnd || Math.random;
  for (let t = 0; t < 200; t++) {
    const others = TYPES.map((_, k) => k).filter(k => k !== 4).sort(() => rnd() - .5).slice(0, 6), has = R => R.some(k => others.includes(k));
    if (has(ROLE.atk) && has(ROLE.info) && has(ROLE.def)) { const pool = new Array(NT).fill(0); pool[4] = 2; for (const k of others) pool[k] = 2; return pool; }
  }
  return POOL.slice();
}
function draftNew(first, rnd) { const pool = field(rnd), d = { pool, f: pool.slice(), picks: [[], []], done: [false, false], first: first ? 1 : 0, n: 0, turn: first ? 1 : 0, last: null }; return d; }
function draftLeft(d, p) { return BUDGET - draftCost(d.picks[p]); }
function draftCan(d, p, k) { return d.turn === p && !d.done[p] && d.pool[k] > 0 && d.picks[p].length < MAXSHIPS && TYPES[k].cost <= draftLeft(d, p) && d.picks[p].filter(x => x === k).length < MAXSAME; }
function draftCanStop(d, p) { return d.turn === p && d.picks[p].length >= MINSHIPS; }
function draftNext(d) {
  for (const p of [0, 1]) if (!d.done[p] && (d.picks[p].length >= MAXSHIPS || !TYPES.some((T, k) => d.pool[k] > 0 && T.cost <= draftLeft(d, p) && d.picks[p].filter(x => x === k).length < MAXSAME))) d.done[p] = true;
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
  rnd = rnd || Math.random; const p = d.turn, mine = d.picks[p], foe = d.picks[1 - p], left = draftLeft(d, p); let best = -1, bv = -1;
  const W = DRAFT_W;
  for (let k = 0; k < NT; k++) {
    if (!draftCan(d, p, k)) continue;
    let v = W[k] + rnd() * .5;
    if (k === 10) v += .08 * foe.filter(x => TYPES[x].skill).length;                      // jam: better the more skills the other side has
    if (k === 9) v += .1 * mine.filter(x => TYPES[x].skill).length - .15;               // command: wants other skills to recharge
    const after = left - TYPES[k].cost, slots = Math.max(0, 4 - mine.length - 1); if (after < slots * 2) v -= 2;     // keep room for a fleet of four
    if (v > bv) { bv = v; best = k; }
  }
  return best;
}
// the AI's taste per type (tuned with tools/test_tactics_balance.js)
let REPAIR_V = .65, MINE_V = .5, PROBE_V = .12, WARD_V = .3, FLARE_V = .5, RAPID_V = 2, INTEL_V = .7, ECHO_V = .55, DIAG_V = .5, PLATE_V = .5, DEPTH_V = 1;
let DRAFT_W = [1, .95, .8, .92, .5, .85, .75, .8, .9, .7, .7, .85, .75, .8, .75, .8, .75, .6, .75, .85, .8, .8, .85, .8, .75, .8, .8, .75, .8, .8, .85, .6, .75, .75, .8, .75, .8, .75];
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

function newSide(ships) { return { ships: ships.map((s, i) => ({ r: s.r, c: s.c, len: s.len, h: s.h ? 1 : 0, t: typeOf(s, i) })), grid: gridOf(ships), shots: new Uint8Array(NN), hitsOn: ships.map(() => 0), sunk: ships.map(() => false), afloat: ships.filter((sh, i) => !(TYPES[typeOf(sh, i)] && TYPES[typeOf(sh, i)].decoy)).length, armor: ships.map((sh, i) => TYPES[typeOf(sh, i)] && TYPES[typeOf(sh, i)].armor ? TYPES[typeOf(sh, i)].armor : 0), fog: 0, fogged: new Uint8Array(NN), mines: [], supp: 0, ward: 0, hits: 0, nshots: 0 }; }
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
  if (T.fog > 0) { T.fogged[cell] = 1; res.fog = true; }                                   // under the smoke: the shooter is not told
  if (si >= 0 && T.armor && T.armor[si] && !T.supp && T.shots[cell] !== 3) { T.armor[si]--; T.shots[cell] = 3; res.dent = true; }   // the plate takes it
  else if (si >= 0) { T.shots[cell] = 2; T.hits++; if (++T.hitsOn[si] === T.ships[si].len) { T.sunk[si] = true; if (!TYPES[T.ships[si].t] || !TYPES[T.ships[si].t].decoy) T.afloat--; res.sunk = si; if (st.cd && !T.supp && T.ships.some((s, j) => j !== si && TYPES[s.t].rally && !T.sunk[j])) st.cd[1 - by].forEach((c, j) => { if (c > 0) st.cd[1 - by][j] = Math.max(0, c - 3); }); } }
  else { T.shots[cell] = 1; const mi = st.noCounter ? -1 : T.mines.indexOf(cell); if (mi >= 0) { T.mines.splice(mi, 1); res.mine = true; if (!st.rest) st.rest = [0, 0]; st.rest[by] = 1; } }   // a mine: the shooter rests next turn
  if (T.afloat === 0) st.winner = by;
  if (si >= 0 && !res.dent && !st.noCounter && !T.supp && st.winner < 0 && TYPES[T.ships[si].t] && TYPES[T.ships[si].t].counter) {   // the monitor answers
    const S = st.sides[by], v = view(S, st.scans && st.scans[1 - by]), p = probs(v, st.adj); let tc = -1, tv = -1;
    for (let i = 0; i < NN; i++) if (!S.shots[i] && p[i] > tv + 1e-9) { tv = p[i]; tc = i; }
    if (tc >= 0) { st.noCounter = 1; const r2 = strike(st, 1 - by, tc); st.noCounter = 0; res.counter = r2;
      st.log.push({ by: 1 - by, cell: tc, hit: r2.hit, sunk: r2.sunk, via: 'counter', fog: r2.fog ? 1 : 0, dent: r2.dent ? 1 : 0, mine: 0 }); }
  }
  return res;
}
function pass(st, by) { const T = st.sides[1 - by]; if (T.fog > 0 && --T.fog === 0) T.fogged.fill(0); if (T.supp > 0) T.supp--; st.rapid = 0; if (st.bonus) st.bonus = 0;
  st.turn = 1 - by; st.sides[st.turn].ward = 0; if (st.cd) { const c = st.cd[st.turn]; for (let i = 0; i < c.length; i++) if (c[i] > 0) c[i]--; }
  if (st.rest && st.rest[st.turn] && st.winner < 0) { st.rest[st.turn] = 0; st.log.push({ by: st.turn, cell: -1, rest: 1 }); pass(st, st.turn); } }   // (a turn lost to a mine)
// the player to move (st.turn) shoots at `cell` of the other side. → { by, cell, hit, sunk (ship index or -1), win, again } or null
function fire(st, cell) {
  if (st.winner >= 0) return null;
  const by = st.turn, T = st.sides[1 - by];
  if (!(cell >= 0 && cell < NN) || (T.shots[cell] && T.shots[cell] !== 3)) return null;
  const nlog = st.log.length, res = strike(st, by, cell); res.win = st.winner === by; res.again = false;
  if (st.winner >= 0) {}
  else if (st.bonus > 0) { st.bonus--; res.again = true; }
  else if (st.rapid && res.hit && !res.fog) res.again = true;   // (quick-firing: on while the shells hit)
  else if (st.rule === 'streak') { if (!res.hit) pass(st, by); else res.again = true; }
  else if (st.rule === 'salvo') { if (--st.left <= 0) { pass(st, by); st.left = quota(st); } else res.again = true; }
  else pass(st, by);
  if (st.rule !== 'salvo') st.left = 1;
  st.log.splice(nlog, 0, { by, cell, hit: res.hit, sunk: res.sunk, fog: res.fog ? 1 : 0, dent: res.dent ? 1 : 0, mine: res.mine ? 1 : 0 }); st.acts.push({ cell });
  return res;
}
// ---- skills (タクティクス) ----
function footprint(skill, cell) {
  const r = cell / N | 0, c = cell % N, o = [];
  if (skill === 'sonar' || skill === 'sweep') { for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < N && cc >= 0 && cc < N) o.push(rr * N + cc); } }
  else if (skill === 'bomb') { o.push(cell); for (const n of neighbors4(cell)) o.push(n); }
  else if (skill === 'volley') { const r0 = Math.min(r, N - 2), c0 = Math.min(c, N - 2); o.push(r0 * N + c0, r0 * N + c0 + 1, (r0 + 1) * N + c0, (r0 + 1) * N + c0 + 1); }
  else if (skill === 'torpedo') { for (let rr = N - 1; rr >= 0; rr--) o.push(rr * N + c); }
  else if (skill === 'scout') { for (let cc = 0; cc < N; cc++) o.push(r * N + cc); }
  else if (skill === 'strafe') { o.push(cell); for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < N && cc >= 0 && cc < N) o.push(rr * N + cc); } }
  else if (skill === 'lance') { const r0 = Math.min(r, N - 4); for (let i = 0; i < 4; i++) o.push((r0 + i) * N + c); }
  else if (skill === 'rtorpedo') { for (let cc = 0; cc < N; cc++) o.push(r * N + cc); }
  else if (skill === 'diag') { const d = Math.min(r, c); for (let i = 0; r - d + i < N && c - d + i < N; i++) o.push((r - d + i) * N + c - d + i); }
  else if (skill === 'echo') { const r0 = Math.max(2, Math.min(N - 3, r)), c0 = Math.max(2, Math.min(N - 3, c)); for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) o.push((r0 + dr) * N + c0 + dc); }
  else if (skill === 'radar') { for (let rr = 0; rr < N; rr++) o.push(rr * N + c); }
  else if (skill === 'barrage') { const r0 = Math.max(1, Math.min(N - 2, r)), c0 = Math.max(1, Math.min(N - 2, c)); for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) o.push((r0 + dr) * N + c0 + dc); }
  else if (skill === 'twin' || skill === 'probe' || skill === 'depth') o.push(cell);
  else if (skill === 'flare') { const r0 = Math.min(r, N - 2), c0 = Math.min(c, N - 2); o.push(r0 * N + c0, r0 * N + c0 + 1, (r0 + 1) * N + c0, (r0 + 1) * N + c0 + 1); }
  else if (skill === 'rocket') { const c0 = Math.min(c, N - 3); o.push(r * N + c0, r * N + c0 + 1, r * N + c0 + 2); }
  return o;
}
// the square a repair would mend: the latest hit (seen as a hit, not a dent) on an afloat ship of `by`
function repairCell(st, by) { const M = st.sides[by]; for (let i = st.log.length - 1; i >= 0; i--) { const m = st.log[i]; if (m.by === by || m.skill || !(m.cell >= 0)) continue; if (M.shots[m.cell] === 2 && !M.sunk[M.grid[m.cell]]) return m.cell; } return -1; }
// where a minelayer of `by` would lay: the empty square of its own sea the enemy is most likely to shoot next (their public view)
function mineCell(st, by) { const M = st.sides[by]; if (M.mines.length >= MAXMINES) return -1; const v = view(M, st.scans[1 - by]), p = probs(v, st.adj); let best = -1, bv = -1;
  for (let i = 0; i < NN; i++) { if (v.shots[i] || M.grid[i] >= 0 || M.mines.includes(i)) continue; if (p[i] > bv + 1e-9) { bv = p[i]; best = i; } } return best; }
// a skill still works while its ship is afloat — or, with a hospital ship afloat, after it sank
function skillLive(st, by, ship) { const M = st.sides[by]; return !M.sunk[ship] || (!M.supp && M.ships.some((s, j) => TYPES[s.t].hospital && !M.sunk[j])); }
// mines `side` has laid and not yet lost — public (the log shows each laying and each mine hit; a sweep tells how many it cleared)
function minesLeft(st, side) { let n = 0; for (const m of st.log) { if (m.by === side && m.skill === 'mine') n++; else if (m.by !== side && m.mine) n--; else if (m.by !== side && m.sw) n -= m.sw; } return Math.max(0, n); }
// the square an intelligence ship of `by` would reveal: the first unhit, not yet revealed square of the enemy's largest afloat (real) ship
function intelCell(st, by) { const T = st.sides[1 - by], lit = new Set(st.scans[by].filter(s => s.one && s.k).map(s => s.at)); let best = -1, bl = 0;
  T.ships.forEach((s, i) => { if (T.sunk[i] || TYPES[s.t].decoy) return; const u = shipCells(s).filter(c => !T.shots[c] && !lit.has(c)); if (u.length > bl) { bl = u.length; best = u[0]; } }); return best; }
// the ship a plating ship of `by` would armor: afloat, no plate now, the most hits (ties: the longest)
function plateShip(st, by) { const M = st.sides[by]; let best = -1, bv = -1; M.ships.forEach((s, i) => { if (M.sunk[i] || M.armor[i]) return; const v = M.hitsOn[i] * 10 + s.len; if (v > bv) { bv = v; best = i; } }); return best; }
function skillReady(st, by, ship) { return !!st.cd && st.winner < 0 && st.cd[by][ship] === 0 && skillLive(st, by, ship); }
// what a skill would do (pure): the squares that get a shell, in order, with the result — used for the effects before act()
function preview(st, ship, cell) {
  const by = st.turn; if (!skillReady(st, by, ship)) return null;
  const skill = TYPES[st.sides[by].ships[ship].t].skill, T = st.sides[1 - by], M = st.sides[by];
  if (NOAIM[skill]) {
    if (skill === 'command' && !st.cd[by].some((c, i) => i !== ship && c > 0 && skillLive(st, by, i))) return null;
    if (skill === 'jam' && !st.cd[1 - by].some((c, i) => c >= 0 && skillLive(st, 1 - by, i))) return null;
    if (skill === 'suppress' && (T.supp > 0 || !T.ships.some((s, i) => PASSIVE(TYPES[s.t]) && !T.sunk[i]))) return null;
    if (skill === 'plate') { const pi = plateShip(st, by); return pi < 0 ? null : { skill, area: [], shots: [], pi }; }
    if (skill === 'intel') { const lit = intelCell(st, by); return lit < 0 ? null : { skill, area: [], shots: [], lit }; }
    if (skill === 'mine') { const mc = mineCell(st, by); return mc < 0 ? null : { skill, area: [], shots: [], mc }; }
    if (skill === 'repair') { const fix = repairCell(st, by); return fix < 0 ? null : { skill, area: [], shots: [], fix }; }
    return { skill, area: [], shots: [] };
  }
  if (!(cell >= 0 && cell < NN)) return null;
  const area = footprint(skill, cell), shots = [], seen = k => T.shots[k] && T.shots[k] !== 3;
  if (skill === 'flare') { const U = area.filter(k => !T.shots[k]); if (!U.length) return null; return { skill, area, U, k: U.filter(x => T.grid[x] >= 0).length, shots }; }
  if (SCAN[skill]) { const U = area.filter(k => !T.shots[k]); if (!U.length) return null; return { skill, area, U, k: U.filter(x => T.grid[x] >= 0).length, shots }; }
  for (const k of area) { if (seen(k)) continue; shots.push({ cell: k, hit: T.grid[k] >= 0 }); if ((skill === 'torpedo' || skill === 'rtorpedo') && T.grid[k] >= 0) break; }
  if (!shots.length) return null;
  let ic = -1; if (AREA[skill] && shots.length >= 2 && !T.supp && T.ships.some((s, i) => TYPES[s.t].aa && !T.sunk[i])) ic = shots.pop().cell;   // (the anti-air cruiser shoots one down)
  return { skill, area, shots, ic };
}
// use the skill of the mover's ship `ship` at `cell`. → { by, skill, ship, cell, shots: [{cell, hit, sunk}], k (sonar), win } or null
function useSkill(st, ship, cell) {
  const pv = preview(st, ship, cell); if (!pv) return null;
  const by = st.turn, res = { by, skill: pv.skill, ship, cell, area: pv.area, shots: [], k: pv.k, win: false };
  if (st.sides[1 - by].ward && !SELF[pv.skill]) {   // the enemy's ECM ward: the skill is spent for nothing
    st.sides[1 - by].ward = 0; st.log.push({ by, cell, skill: pv.skill, blk: 1 }); st.cd[by][ship] = TYPES[st.sides[by].ships[ship].t].cd; st.acts.push({ skill: pv.skill, ship, cell });
    res.blocked = true; pass(st, by); return res;
  }
  const at0 = st.log.length; st.log.push({ by, cell: pv.fix != null ? pv.fix : pv.lit != null ? pv.lit : cell, skill: pv.skill, k: pv.k, ic: pv.ic >= 0 ? pv.ic : undefined });
  if (pv.mc != null) st.sides[by].mines.push(pv.mc);
  res.ic = pv.ic;
  if (pv.fix != null) { const M0 = st.sides[by], si = M0.grid[pv.fix]; M0.shots[pv.fix] = 0; M0.hits--; M0.hitsOn[si]--; M0.fogged[pv.fix] = 0; res.fix = pv.fix; }
  if (SCAN[pv.skill]) st.scans[by].push({ cells: pv.U, k: pv.k, at: cell, row: pv.skill === 'scout' ? 1 : 0, col: pv.skill === 'radar' ? 1 : 0, big: pv.skill === 'echo' ? 1 : 0, list: pv.skill === 'diag' ? pv.area : undefined });
  const M = st.sides[by], O = st.sides[1 - by];
  if (pv.skill === 'smoke') M.fog = 2;
  if (pv.skill === 'ward') M.ward = 1;
  if (pv.pi != null) { M.armor[pv.pi] = 1; res.pi = pv.pi; st.log[at0].pi = pv.pi; }
  if (!SELF[pv.skill] && !O.supp && O.ships.some((s, j) => TYPES[s.t].trace && !O.sunk[j])) {   // the enemy's ESM ship traces the user
    const cs = shipCells(M.ships[ship]), tc = st.scans[1 - by].some(x => x.tr && cs.includes(x.at)) ? null : cs.find(c => !M.shots[c]);   // (once per ship: a 3×3 box around one of its squares)
    if (tc != null) { const U = footprint('sonar', tc).filter(c => !M.shots[c]); st.scans[1 - by].push({ cells: U, k: U.filter(c => M.grid[c] >= 0).length, at: tc, tr: 1 }); res.traced = tc; st.log[at0].tr = tc; }
  }
  if (pv.skill === 'intel') { st.scans[by].push({ cells: [pv.lit], k: 1, at: pv.lit, one: 1 }); res.lit = pv.lit; }
  if (pv.skill === 'flare') for (const c of pv.U) st.scans[by].push({ cells: [c], k: O.grid[c] >= 0 ? 1 : 0, at: c, one: 1 });
  if (pv.skill === 'suppress') O.supp = 3;   // (this turn's pass takes one: your next 2 turns)
  if (pv.skill === 'sweep') { const before = O.mines.length; O.mines = O.mines.filter(c => !pv.area.includes(c)); res.swept = before - O.mines.length; st.log[at0].sw = res.swept; }
  if (pv.skill === 'command') st.cd[by].forEach((c, i) => { if (i !== ship && c > 0) st.cd[by][i] = Math.max(0, c - 4); });
  if (pv.skill === 'jam') st.cd[1 - by].forEach((c, i) => { if (c >= 0 && skillLive(st, 1 - by, i)) st.cd[1 - by][i] = Math.min(TYPES[O.ships[i].t].cd + 3, c + 3); });
  for (const x of pv.shots) { const at = st.log.length, r = strike(st, by, x.cell); res.shots.push(r); st.log.splice(at, 0, { by, cell: r.cell, hit: r.hit, sunk: r.sunk, via: pv.skill, fog: r.fog ? 1 : 0, dent: r.dent ? 1 : 0, mine: r.mine ? 1 : 0 }); if (st.winner >= 0) break; }
  st.cd[by][ship] = TYPES[st.sides[by].ships[ship].t].cd;
  st.acts.push({ skill: pv.skill, ship, cell });
  res.win = st.winner === by;
  if (pv.skill === 'depth' && st.winner < 0 && res.shots[0] && res.shots[0].hit && !res.shots[0].dent && !res.shots[0].fog) for (const k of neighbors4(cell)) { if (st.winner >= 0) break; if (O.shots[k] && O.shots[k] !== 3) continue; const at = st.log.length, r = strike(st, by, k); res.shots.push(r); st.log.splice(at, 0, { by, cell: k, hit: r.hit, sunk: r.sunk, via: 'depth', fog: r.fog ? 1 : 0, dent: r.dent ? 1 : 0, mine: r.mine ? 1 : 0 }); }
  res.win = st.winner === by;
  if (pv.skill === 'probe' && st.winner < 0) { const U = neighbors4(cell).filter(k => !st.sides[1 - by].shots[k]); res.k = U.filter(x => st.sides[1 - by].grid[x] >= 0).length; st.scans[by].push({ cells: U, k: res.k, at: cell, plus: 1 }); st.log[at0].k = res.k; }
  if (st.winner < 0 && pv.skill === 'rapid') { st.rapid = 1; res.again = true; }
  else if (st.winner < 0) { if (pv.skill === 'twin') { st.bonus = 1; res.again = true; } else pass(st, by); }
  return res;
}
function act(st, a) { return a.skill ? useSkill(st, a.ship, a.cell) : fire(st, a.cell); }

// ---- what the shooter knows about a target side ----
function view(side, scans) {
  const sunkCell = new Uint8Array(NN), lens = [];
  side.ships.forEach((s, i) => { if (side.sunk[i]) for (const k of shipCells(s)) sunkCell[k] = 1; else lens.push(s.len); });
  let shots = side.shots; if (side.fogged && side.fog > 0) { shots = Uint8Array.from(side.shots); for (let i = 0; i < NN; i++) if (side.fogged[i] && !sunkCell[i]) shots[i] = 4; }
  return { shots, sunkCell, lens, scans: scans && scans.length ? scans : null };
}
// a sonar reading: of the squares that were unknown then, k hold a ship. What is left of it now: r ships among the U still unknown
function scanLeft(v, sc) { let r = sc.k; const U = []; for (const c of sc.cells) { if (v.shots[c] === 2 || v.shots[c] === 3) r--; else if (!v.shots[c]) U.push(c); } return { r: Math.max(0, r), U }; }
function prep(v, adj) {
  const blocked = new Uint8Array(NN), open = new Uint8Array(NN); let nOpen = 0; const hitList = [];
  for (let i = 0; i < NN; i++) {
    if (v.shots[i] === 1 || v.sunkCell[i]) blocked[i] = 1;
    else if (v.shots[i] === 2 || v.shots[i] === 3) { open[i] = 1; nOpen++; hitList.push(i); }
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
function dented(v) { for (let i = 0; i < NN; i++) if (v.shots[i] === 3) return i; return -1; }
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
  const dn = dented(v); if (dn >= 0 && rnd() > L.eps * .5) return dn;
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
  if (!st.cd || st.rapid) return shot();
  const ready = []; st.cd[by].forEach((c, i) => { if (skillReady(st, by, i)) ready.push(i); });
  if (!ready.length || rnd() < levelSpec(level).eps * .9) return shot();
  const v = view(T, scans), p = probs(v, st.adj), P = prep(v, st.adj), dn = dented(v);
  let best = { cell: dn >= 0 ? dn : argmax(p, v, rnd) }, bv = dn >= 0 ? 1 : best.cell >= 0 ? p[best.cell] : 0; if (best.cell < 0) return shot();
  const shotCell = best.cell;
  const top2 = () => { let a = 0, b = 0; for (let i = 0; i < NN; i++) { if (v.shots[i]) continue; const x = p[i]; if (x > a) { b = a; a = x; } else if (x > b) b = x; } return a + b; };
  const Me = st.sides[by], myV = view(Me), myP = prep(myV, st.adj), foeAA = !T.supp && T.ships.some((s, i) => TYPES[s.t].aa && !T.sunk[i]);
  for (const i of ready) {
    const skill = TYPES[st.sides[by].ships[i].t].skill; let sv = -1, sc = -1;
    if (NOAIM[skill]) {
      if (!preview(st, i, -1)) continue;
      if (T.ward && !SELF[skill]) continue;
      if (skill === 'smoke') sv = myP.nOpen ? .55 + .15 * myP.nOpen : .08;                                   // when they are on a hit of ours
      else if (skill === 'command') { let x = 0; st.cd[by].forEach((c, j) => { if (j !== i && c > 0 && skillLive(st, by, j)) x += Math.min(4, c) * .14; }); sv = x; }
      else if (skill === 'repair') sv = REPAIR_V + (myP.nOpen ? .15 : 0);
      else if (skill === 'mine') sv = myP.nOpen ? .15 : MINE_V;
      else if (skill === 'plate') sv = myP.nOpen ? PLATE_V + .2 : PLATE_V;
      else if (skill === 'rapid') sv = P.nOpen ? RAPID_V : -1;   // (free: the turn's shot still follows — keep it for when a hit is being chased)
      else if (skill === 'intel') sv = P.nOpen ? .1 : INTEL_V;
      else if (skill === 'ward') { let x = 0; st.cd[1 - by].forEach((c, j) => { if (c >= 0 && c <= 1 && skillLive(st, 1 - by, j)) x += WARD_V; }); sv = x; }
      else if (skill === 'suppress') { let x = 0; T.ships.forEach((s, j) => { const ty = TYPES[s.t]; if (T.sunk[j]) return; if (ty.armor && T.armor[j]) x += .3; if (ty.aa) x += .15; if (ty.counter) x += .3; if (ty.rally || ty.hospital || ty.trace) x += .15; }); sv = x; }
      else if (skill === 'jam') { let x = 0; st.cd[1 - by].forEach((c, j) => { if (c >= 0 && skillLive(st, 1 - by, j)) x += c <= 1 ? .28 : .12; }); sv = x; }
      sv += 1e-4 * rnd();
      if (sv > bv) { bv = sv; best = { skill, ship: i, cell: -1 }; }
      continue;
    }
    if (T.ward && !SELF[skill]) continue;   // (it would only be wasted on their ward)
    if (skill === 'depth') { const c0 = dn >= 0 ? dn : shotCell, ph = dn >= 0 ? 1 : p[c0]; let nb = 0; for (const k of neighbors4(c0)) if (!v.shots[k]) nb += p[k]; sv = ph + ph * nb * DEPTH_V; if (sv > bv) { bv = sv; best = { skill, ship: i, cell: c0 }; } continue; }
    if (skill === 'probe') { sv = (dn >= 0 ? 1 : p[shotCell]) + (P.nOpen ? .04 : PROBE_V); if (sv > bv) { bv = sv; best = { skill, ship: i, cell: dn >= 0 ? dn : shotCell }; } continue; }
    if (skill === 'twin') { if (dn < 0) { sv = top2(); sc = shotCell; } else { sv = 1.4; sc = dn; } if (sv > bv) { bv = sv; best = { skill, ship: i, cell: sc }; } continue; }
    for (let c = 0; c < NN; c++) {
      if (skill === 'torpedo' && c >= N) break;
      if (skill === 'scout' && c % N) continue;
      if (skill === 'radar' && c >= N) break;
      if (skill === 'rtorpedo' && c % N) continue;
      if (skill === 'barrage' && (c % N === 0 || c % N === N - 1 || c < N || c >= NN - N)) continue;
      if (skill === 'volley' && (c % N === N - 1 || c >= NN - N)) continue;
      if (skill === 'rocket' && c % N > N - 3) continue;
      if (skill === 'lance' && c >= NN - 3 * N) continue;
      const fp = footprint(skill, c); let val = 0, un = 0, miss = 1;
      for (const k of fp) if (!v.shots[k]) { un++; val += p[k]; miss *= 1 - p[k]; }
      if (!un) continue;
      if (foeAA && AREA[skill] && un >= 2) val *= (un - 1) / un;   // (one shell will be shot down)
      if (skill === 'torpedo' || skill === 'rtorpedo') val = (1 - miss) + .03 * un;
      else if (skill === 'flare') val = P.nOpen || un < 3 ? -1 : FLARE_V - Math.abs(val - 1) * .06;
      else if (skill === 'diag') val = P.nOpen || un < 6 ? -1 : DIAG_V - Math.abs(val - 1.6) * .06;
      else if (skill === 'echo') val = P.nOpen || un < 15 ? -1 : ECHO_V - Math.abs(val - 3) * .05;
      else if (skill === 'sweep') val = P.nOpen || un < 6 ? -1 : .5 - Math.abs(val - 1.3) * .08 + .1 * minesLeft(st, 1 - by);
      else if (skill === 'sonar') val = P.nOpen || un < 6 ? -1 : .5 - Math.abs(val - 1.3) * .08;
      else if (skill === 'scout' || skill === 'radar') val = P.nOpen || un < 7 ? -1 : .55 - Math.abs(val - 2) * .06;
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
  const shots = Uint8Array.from(v.shots), sunkCell = Uint8Array.from(v.sunkCell), grid = new Int8Array(NN).fill(-1), hitsOn = f.map(() => 0); let afloat = f.length, n = 0;
  f.forEach((cs, i) => { for (const c of cs) { grid[c] = i; if (shots[c] === 2 || shots[c] === 3) hitsOn[i]++; } });
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

const E = { NOAIM, SELF, field, skillLive, setDraftW: w => { DRAFT_W = w; }, setRepairV: x => { REPAIR_V = x; }, setMineV: x => { MINE_V = x; }, N, NN, FLEET, TOTAL, RULES, TYPES, BUDGET, MINSHIPS, MAXSHIPS, MAXSAME, PRESETS, POOL, draftNew, draftLeft, draftCan, draftCanStop, draftPick, draftAI, draftCost, validDraft, footprint, skillReady, preview, useSkill, act, chooseAction, probs, scanLeft, rng, shipCells, inside, fits, gridOf, validFleet, randomFleet, newSide, newGame, fire, quota, view, heat, jointHeat, choose, advise, winProb, shotsToFinish, levelSpec, neighbors4, neighbors8, cellName };
if (typeof module !== 'undefined' && module.exports) module.exports = E; else root.SeaEngine = E;
})(typeof self !== 'undefined' ? self : this);
