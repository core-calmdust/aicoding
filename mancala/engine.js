// Luxe Mancala engine — rules (Easy / Basic / Kalah / Sunka / Oware / Mangala / Bohnenspiel / Ayoayo) + alpha-beta search with iterative deepening,
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
  // Oware (Abapa): the stores only hold captured seeds (never sown into); 12+ seeds skip the emptied pit;
  // the last seed making an opponent pit 2 or 3 captures it and the run of 2s/3s just before it;
  // a grand slam (taking every opposing seed) is legal but captures nothing; you must feed an empty opponent;
  // more than half the seeds wins, a 50/50 split is a draw
  oware: { id: 'oware', cap: 0, relay: false, oware: true, feed: true, cyc: true },
  // Mangala (Turkey, tournament rules): a pit of 2+ seeds puts its first seed back in itself (a single seed moves on);
  // sows into your own store (exact: move again); the last seed making an opposing pit even takes it; the last seed
  // in your own empty pit takes it with the opposite seeds; when a row empties, its owner takes the other row's seeds
  mangala: { id: 'mangala', cap: 0, relay: false, gen: 'mangala' },
  // Bohnenspiel (Baltic / German bean game): the stores are not sown into; the last bean making a pit 2, 4 or 6 (either
  // row) takes it and the run of 2s / 4s / 6s before it; a player with no beans on their turn ends the game, the
  // other one takes the beans left on their side
  bohnen: { id: 'bohnen', cap: 0, relay: false, gen: 'bohnen', cyc: true },
  // Ayoayo (Yoruba, Nigeria): relay sowing that skips the pit each sowing started from (and the stores); stop in an
  // empty pit of your own row to take the opposite seeds (the last seed stays); an empty opponent must be fed; a
  // player who cannot move ends the game and the other one takes the seeds left
  ayo: { id: 'ayo', cap: 0, relay: true, gen: 'ayo', feed: true, cyc: true },
};
const RULE_IDS = ['easy', 'basic', 'kalah', 'sunka', 'oware', 'mangala', 'bohnen', 'ayo'];
const MAX_RELAY = 120;   // safety valve for endless relay sowing (never reached in practice)

function initial(seeds) { const b = new Int8Array(14); for (let i = 0; i < 6; i++) { b[i] = seeds; b[i + 7] = seeds; } return b; }
const storeOf = s => s ? 13 : 6;
const baseOf = s => s ? 7 : 0;
const opposite = i => 12 - i;
function sideSum(b, s) { const o = s ? 7 : 0; return b[o] + b[o + 1] + b[o + 2] + b[o + 3] + b[o + 4] + b[o + 5]; }
const ruleOf = r => typeof r === 'string' ? (RULES[r] || RULES.kalah) : (r || RULES.kalah);
// Oware: when the opponent's row is empty, only moves that reach it are allowed (6 - k seeds from pit k)
const feeds = (b, side, k) => b[baseOf(side) + k] >= 6 - k;
function canFeed(b, side) { for (let k = 0; k < 6; k++) if (feeds(b, side, k)) return true; return false; }
function legal(b, side, rules) {
  const R = rules ? ruleOf(rules) : null, o = baseOf(side), r = [], must = R && R.feed && sideSum(b, 1 - side) === 0;
  for (let k = 0; k < 6; k++) if (b[o + k] > 0 && (!must || (R.oware ? feeds(b, side, k) : ayoFeeds(b, side, k)))) r.push(k);
  return r;
}
const isLegal = (b, side, k, rules) => k >= 0 && k <= 5 && legal(b, side, rules).includes(k);

// Plays pit k for `side` on board b (in place). Optional `rec` collects animation events.
// Returns a result object (re-used; copy what you need): extra, over, land, cap (seeds captured), relays
const RES = { extra: false, over: false, land: -1, cap: 0, relays: 0, capFrom: -1, swept: false, caps: 0, slam: false, fed: false };
function play(b, side, k, R, rec) {
  if (R.oware) return playOware(b, side, k, rec);
  if (R.gen) return R.gen === 'mangala' ? playMangala(b, side, k, rec) : R.gen === 'bohnen' ? playBohnen(b, side, k, rec) : playAyo(b, side, k, rec);
  RES.caps = 0; RES.slam = false; RES.fed = false;
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
      RES.cap = b[o]; RES.capFrom = o; RES.caps = 1;
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
// Oware sowing / capture / end of the game (see RULES.oware). Events: pick, drop, cap (one per captured pit,
// own -1), slam (a grand slam: the seeds stay), sweep (the game ends because the empty side cannot be fed:
// the side that still has seeds keeps them)
function playOware(b, side, k, rec) {
  const ms = side ? 13 : 6, os = side ? 6 : 13, ob = side ? 0 : 7, org = (side ? 7 : 0) + k;
  let idx = org, n = b[idx];
  RES.extra = false; RES.over = false; RES.cap = 0; RES.relays = 0; RES.capFrom = -1; RES.swept = false; RES.caps = 0; RES.slam = false; RES.fed = false;
  b[idx] = 0;
  if (rec) rec.push({ t: 'pick', at: idx, n });
  while (n > 0) {
    idx = idx === 13 ? 0 : idx + 1;
    if (idx === 6 || idx === 13 || idx === org) continue;
    b[idx]++; n--;
    if (rec) rec.push({ t: 'drop', at: idx });
  }
  RES.land = idx;
  if (idx >= ob && idx <= ob + 5 && (b[idx] === 2 || b[idx] === 3)) {
    let j = idx, got = 0;
    while (j >= ob && (b[j] === 2 || b[j] === 3)) { got += b[j]; j--; }
    if (got === sideSum(b, 1 - side)) { RES.slam = true; if (rec) rec.push({ t: 'slam', at: idx, from: j + 1 }); }
    else {
      for (let i = idx; i > j; i--) {
        if (rec) rec.push({ t: 'cap', from: i, n: b[i], own: -1, to: ms, chain: idx - i });
        b[ms] += b[i]; b[i] = 0; RES.caps++;
      }
      RES.cap = got; RES.capFrom = idx;
    }
  }
  let tot = b[6] + b[13]; const s0 = sideSum(b, 0), s1 = sideSum(b, 1); tot += s0 + s1;
  if (b[ms] * 2 > tot || b[os] * 2 > tot || (b[ms] * 2 === tot && b[os] * 2 === tot)) RES.over = true;
  else if (sideSum(b, side) === 0 && !canFeed(b, 1 - side)) {
    // the opponent cannot feed this empty row: the game ends and they keep the seeds on their side
    RES.over = true; RES.swept = true; RES.fed = true;
    if (rec) rec.push({ t: 'sweep', n0: s0, n1: s1 });
    b[6] += s0; b[13] += s1;
    for (let i = 0; i < 6; i++) { b[i] = 0; b[i + 7] = 0; }
  }
  return RES;
}
function resetRes() { RES.extra = false; RES.over = false; RES.cap = 0; RES.relays = 0; RES.capFrom = -1; RES.swept = false; RES.caps = 0; RES.slam = false; RES.fed = false; }
// the game ends: every seed left on the board goes to store `to` (or, with to < 0, to the owner of its row)
function sweepTo(b, to, rec) {
  const s0 = sideSum(b, 0), s1 = sideSum(b, 1);
  RES.over = true; RES.extra = false;
  if (s0 + s1 === 0) return;
  RES.swept = true;
  if (rec) rec.push({ t: 'sweep', n0: s0, n1: s1, to });
  if (to >= 0) b[to] += s0 + s1; else { b[6] += s0; b[13] += s1; }
  for (let i = 0; i < 6; i++) { b[i] = 0; b[i + 7] = 0; }
}
const prevPit = i => i === 0 ? 12 : i === 7 ? 5 : i - 1;
function playMangala(b, side, k, rec) {
  const ms = side ? 13 : 6, os = side ? 6 : 13, ob = side ? 0 : 7, mb = side ? 7 : 0, org = mb + k;
  let n = b[org], idx = org;
  resetRes();
  b[org] = 0;
  if (rec) rec.push({ t: 'pick', at: org, n });
  if (n > 1) { b[org]++; n--; if (rec) rec.push({ t: 'drop', at: org }); }   // the first seed goes back into its own pit
  while (n > 0) {
    idx = idx === 13 ? 0 : idx + 1;
    if (idx === os) continue;
    b[idx]++; n--;
    if (rec) rec.push({ t: 'drop', at: idx });
  }
  RES.land = idx;
  if (idx === ms) RES.extra = true;
  else if (idx >= ob && idx <= ob + 5) {
    if (b[idx] % 2 === 0) { const v = b[idx]; if (rec) rec.push({ t: 'cap', from: idx, n: v, own: -1, to: ms }); b[ms] += v; b[idx] = 0; RES.cap = v; RES.capFrom = idx; RES.caps = 1; }
  } else if (b[idx] === 1 && b[12 - idx] > 0) {
    const o = 12 - idx, v = b[o];
    if (rec) rec.push({ t: 'cap', from: o, n: v, own: idx, to: ms });
    b[ms] += v + 1; b[o] = 0; b[idx] = 0; RES.cap = v + 1; RES.capFrom = o; RES.caps = 1;
  }
  const s0 = sideSum(b, 0), s1 = sideSum(b, 1);
  // a row is empty: its owner takes what is left on the other row
  if (s0 === 0 || s1 === 0) sweepTo(b, s0 === 0 ? 6 : 13, rec);
  return RES;
}
function playBohnen(b, side, k, rec) {
  const ms = side ? 13 : 6, org = (side ? 7 : 0) + k;
  let n = b[org], idx = org;
  resetRes();
  b[org] = 0;
  if (rec) rec.push({ t: 'pick', at: org, n });
  while (n > 0) {
    idx = idx === 13 ? 0 : idx + 1;
    if (idx === 6 || idx === 13) continue;
    b[idx]++; n--;
    if (rec) rec.push({ t: 'drop', at: idx });
  }
  RES.land = idx;
  let j = idx, got = 0, c = 0;
  while (c < 12 && (b[j] === 2 || b[j] === 4 || b[j] === 6)) {
    if (rec) rec.push({ t: 'cap', from: j, n: b[j], own: -1, to: ms, chain: c });
    got += b[j]; b[ms] += b[j]; b[j] = 0; c++; j = prevPit(j);
  }
  if (c) { RES.cap = got; RES.caps = c; RES.capFrom = idx; }
  // the opponent has no beans for their turn: the game ends and the mover keeps their own
  if (sideSum(b, 1 - side) === 0) sweepTo(b, ms, rec);
  return RES;
}
// Ayoayo sowing + capture on a board (no RES, no end of game): returns the landing pit, the seeds taken, relays
function ayoCore(b, side, k, rec) {
  const ms = side ? 13 : 6, mb = side ? 7 : 0;
  let start = mb + k, idx = start, n = b[idx], relays = 0, cap = 0, capFrom = -1;
  b[idx] = 0;
  if (rec) rec.push({ t: 'pick', at: idx, n });
  for (;;) {
    while (n > 0) {
      idx = idx === 13 ? 0 : idx + 1;
      if (idx === 6 || idx === 13 || idx === start) continue;
      b[idx]++; n--;
      if (rec) rec.push({ t: 'drop', at: idx });
    }
    if (b[idx] > 1 && relays < MAX_RELAY) { n = b[idx]; b[idx] = 0; start = idx; relays++; if (rec) rec.push({ t: 'pick', at: idx, n, relay: true }); continue; }
    break;
  }
  if (idx >= mb && idx <= mb + 5 && b[idx] === 1 && b[12 - idx] > 0) {
    const o = 12 - idx; cap = b[o]; capFrom = o;
    if (rec) rec.push({ t: 'cap', from: o, n: cap, own: -1, to: ms });
    b[ms] += cap; b[o] = 0;
  }
  return { land: idx, cap, capFrom, relays };
}
const AYO_TMP = new Int8Array(14);
function ayoFeeds(b, side, k) { AYO_TMP.set(b); ayoCore(AYO_TMP, side, k); return sideSum(AYO_TMP, 1 - side) > 0; }
function playAyo(b, side, k, rec) {
  resetRes();
  const r = ayoCore(b, side, k, rec), ms = side ? 13 : 6, os = side ? 6 : 13;
  RES.land = r.land; RES.relays = r.relays;
  if (r.cap) { RES.cap = r.cap; RES.capFrom = r.capFrom; RES.caps = 1; }
  if (sideSum(b, 1 - side) === 0) sweepTo(b, ms, rec);   // the opponent cannot move: the mover takes the rest
  else if (sideSum(b, side) === 0) {
    // the opponent must feed this empty row; if no move can, they keep the seeds on their side
    let ok = false; for (let q = 0; q < 6 && !ok; q++) if (b[(side ? 0 : 7) + q] && ayoFeeds(b, 1 - side, q)) ok = true;
    if (!ok) { sweepTo(b, os, rec); RES.fed = true; }
  }
  return RES;
}
// Oware: a position repeated for the third time ends an endless cycle; each side keeps the seeds on its row
function cycleEnd(b) { b[6] += sideSum(b, 0); b[13] += sideSum(b, 1); for (let i = 0; i < 6; i++) { b[i] = 0; b[i + 7] = 0; } }
// game over in the start position (set-up positions): nothing to play
function stuck(b, side, rules) {
  const R = ruleOf(rules);
  if (R.gen === 'bohnen') return sideSum(b, side) === 0;
  if (sideSum(b, 0) && sideSum(b, 1)) return false;
  return R.feed ? legal(b, side, R).length === 0 : true;
}
// convenience: play on a copy and describe the move for the UI
function trace(b, side, k, rules) {
  const R = RULES[rules] || RULES.kalah, nb = Int8Array.from(b), ev = [];
  const r = play(nb, side, k, R, ev);
  return { board: nb, events: ev, extra: r.extra, over: r.over, land: r.land, cap: r.cap, capFrom: r.capFrom, caps: r.caps, slam: r.slam, fed: r.fed, relays: r.relays, swept: r.swept, next: r.over ? -1 : r.extra ? side : 1 - side };
}
// replay a whole game: returns positions[] ({b, side, over, info of the move that led here})
function replay(start, side0, moves, rules) {
  const R = RULES[rules] || RULES.kalah;
  let b = Int8Array.from(start), side = side0, over = stuck(b, side, R);
  const out = [{ b: Int8Array.from(b), side, over, mv: null }];
  const seen = R.cyc ? new Map() : null, key = () => side + ':' + b.join(',');
  if (seen) seen.set(key(), 1);
  for (let i = 0; i < moves.length; i++) {
    const k = moves[i];
    if (over || !isLegal(b, side, k, R)) return { positions: out, bad: i };
    const r = play(b, side, k, R);
    const mv = { k, side, extra: r.extra, cap: r.cap, caps: r.caps, slam: r.slam, fed: r.fed, over: r.over, land: r.land, relays: r.relays };
    over = r.over; side = over ? side : r.extra ? side : 1 - side;
    if (seen && !over) { const kk = key(), c = (seen.get(kk) || 0) + 1; seen.set(kk, c); if (c >= 3) { cycleEnd(b); over = true; mv.over = true; mv.cycle = true; } }
    out.push({ b: Int8Array.from(b), side, over, mv });
  }
  return { positions: out, bad: -1 };
}
// best total store gain obtainable in the current turn (following extra turns), with the move sequences
function turnMax(b, side, rules) {
  const R = RULES[rules] || RULES.kalah, ms = storeOf(side), start = b[ms];
  let best = -1, lines = [];
  const rec = (bb, line) => {
    for (const k of legal(bb, side, R)) {
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
  const ok = legal(b, side, R);
  for (let k = 0; k < 6; k++) {
    if (!ok.includes(k)) { out.push(null); continue; }
    const nb = Int8Array.from(b), r = play(nb, side, k, R);
    if (r.extra && !r.over) { const t = turnMax(nb, side, rules); out.push(nb[ms] - b[ms] + t.gain); }
    else out.push(nb[ms] - b[ms]);
  }
  return out;
}

// ---------------------------------------------------------------------------- search
const INF = 1000000, SEED = 100;
const W = { side: 22, myExtra: 55, oppExtra: 30, myCap: 55, oppCap: 32 };
// Oware: captured seeds, plus a little for the seeds kept on your own row (mobility and the endgame), the
// opponent's pits of 1-2 seeds you could turn into 2-3 (targets) and the best capture available right now
const WO = { side: 6, target: 14, myCap: 45, oppCap: 25 };
function owareCap(b, side, k) {   // seeds captured by playing pit k (no side effects)
  const base = side ? 7 : 0, ob = side ? 0 : 7, org = base + k, n = b[org];
  if (!n) return 0;
  // where the last seed lands: 11 usable pits per lap once the origin is skipped
  const lap = n > 11 ? n - 11 * Math.floor((n - 1) / 11) : n, laps = n > 11 ? Math.floor((n - 1) / 11) : 0;
  let land = org, s = lap; while (s > 0) { land = land === 13 ? 0 : land + 1; if (land === 6 || land === 13 || land === org) continue; s--; }
  if (land < ob || land > ob + 5) return 0;
  // count on each opponent pit after the sow: +laps everywhere, +1 for those passed in the last lap
  let got = 0, j = land;
  const add = i => { const d = (i - org + 14) % 14, dl = (land - org + 14) % 14; return laps + (d <= dl ? 1 : 0); };
  while (j >= ob) { const v = b[j] + add(j); if (v !== 2 && v !== 3) break; got += v; j--; }
  return got;
}
function evalOware(b, side) {
  const ms = side ? 13 : 6, os = side ? 6 : 13, mb = side ? 7 : 0, ob = side ? 0 : 7;
  let my = 0, op = 0, myT = 0, opT = 0, myCap = 0, opCap = 0;
  for (let k = 0; k < 6; k++) {
    const m = b[mb + k], o = b[ob + k];
    my += m; op += o;
    if (o === 1 || o === 2) myT++;
    if (m === 1 || m === 2) opT++;
    const a = owareCap(b, side, k); if (a > myCap) myCap = a;
    const c = owareCap(b, 1 - side, k); if (c > opCap) opCap = c;
  }
  if (myCap >= op) myCap = 0;   // a grand slam takes nothing
  if (opCap >= my) opCap = 0;
  return (b[ms] - b[os]) * SEED + WO.side * (my - op) + WO.target * (myT - opT) + WO.myCap * myCap - WO.oppCap * opCap;
}
// Mangala / Bohnenspiel / Ayoayo: captured seeds, the best immediate gain for each side (one move, played out), and
// the seeds on your own row (they end up yours at the end in Bohnenspiel and Ayoayo; in Mangala the one who runs out
// first takes the other row, so no bonus there)
const WG = { my: 40, opp: 30, side: { mangala: 0, bohnen: 16, ayo: 0 } };
const EV_TMP = new Int8Array(14);
function evalGen(b, side, R) {
  const ms = side ? 13 : 6, os = side ? 6 : 13, mb = side ? 7 : 0, ob = side ? 0 : 7;
  let my = 0, op = 0, myG = 0, opG = 0;
  for (let k = 0; k < 6; k++) {
    my += b[mb + k]; op += b[ob + k];
    if (b[mb + k]) { EV_TMP.set(b); play(EV_TMP, side, k, R); const g = EV_TMP[ms] - b[ms]; if (g > myG) myG = g; }
    if (b[ob + k]) { EV_TMP.set(b); play(EV_TMP, 1 - side, k, R); const g = EV_TMP[os] - b[os]; if (g > opG) opG = g; }
  }
  return (b[ms] - b[os]) * SEED + WG.my * myG - WG.opp * opG + WG.side[R.gen] * (my - op);
}
function evaluate(b, side, R) {
  if (R.oware) return evalOware(b, side);
  if (R.gen) return evalGen(b, side, R);
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
const ZS1 = rnd(), ZS2 = rnd(), ZR1 = [rnd(), rnd(), rnd(), rnd(), rnd()], ZR2 = [rnd(), rnd(), rnd(), rnd(), rnd()];
for (let i = 5; i < 8; i++) { ZR1.push(rnd()); ZR2.push(rnd()); }

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
  const must = Rcur.feed && sideSum(b, 1 - side) === 0;
  for (let k = 0; k < 6; k++) {
    if (!b[base + k] || (must && Rcur.oware && b[base + k] < 6 - k)) continue;
    const c = kids[k]; c.set(b);
    const r = play(c, side, k, Rcur);
    if (must && !r.over && sideSum(c, 1 - side) === 0) continue;   // (Ayoayo: a move that does not feed)
    let s;
    if (r.over) { s = 1e6 + (c[ms] - c[os]) * 10; nside[k] = -1; }
    else { s = (r.extra ? 5000 : 0) + (c[ms] - b[ms]) * 100 - k; nside[k] = r.extra ? side : 1 - side; }
    if (k === ttMove) s += 1e7;
    order.push(k); key[k] = s;
  }
  if (!order.length) return (b[ms] - b[os]) * SEED;   // (never in real play: a stuck side ends the game)
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
  for (const k of legal(b, side, Rcur)) {
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
  let moves = legal(b, side, Rcur);
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
  const moves = legal(b, side, Rcur);
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
  if (!list) { list = legal(b, side, Rcur).map(m => ({ m, v: 0, exact: false })); }
  else list = list.map(x => ({ m: x.m, v: x.v / SEED, exact: x.exact }));
  return { list, depth, exact: list.every(x => x.exact), nodes };
}
// principal variation after root move k (review box 読み筋): follows the transposition table's best moves,
// with a short search where the table has nothing; [{side, k}] up to n moves (the root move first)
function ttMoveOf(b, side) {
  let h1 = side ? ZS1 : 0, h2 = side ? ZS2 : 0;
  for (let i = 0; i < 14; i++) { h1 ^= Z1[i * ZN + b[i]]; h2 ^= Z2[i * ZN + b[i]]; }
  h1 ^= ZR1[ridx]; h2 ^= ZR2[ridx];
  const ti = h1 & TT_MASK;
  return ttKey[ti] === h2 && ttInfo[ti] ? (ttInfo[ti] >> 10) - 1 : -1;
}
function pvLine(b, side, k, n) {
  const c = Int8Array.from(b), out = [];
  let s = side, m = k;
  deadline = Infinity; aborted = false;
  for (let i = 0; i < n; i++) {
    if (m < 0 || !c[baseOf(s) + m]) break;
    out.push({ side: s, k: m });
    const r = play(c, s, m, Rcur);
    if (r.over) break;
    s = r.extra ? s : 1 - s;
    m = ttMoveOf(c, s);
    if (m < 0 || !c[baseOf(s) + m]) m = rootBest(c, s, 6, -1).m;
  }
  return out;
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
function chooseMove(b, side, rules, level, cfg) {
  const L = cfg || LEVELS[Math.max(1, Math.min(10, level | 0))];   // (cfg: the page's PRO mode, { kind: 'depth', depth, noise } | { kind: 'time', ms })
  const moves = legal(b, side, rules);
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

// ---------------------------------------------------------------------------- several threads (shared/mtsplit.js)
// Plain workers share the root moves and the main line. mtPlan: what a 'move' / 'analyze' job searches on the threads (or its
// answer at once); mtV: the node after the root and m.line (pits, in turn: a move that sows into the own store moves again)
// searched to depth m.d in the window (m.a, m.b), from that node's mover's view; mtKids: that node's moves in this engine's own
// order (s +1: the same side moves again, t: a finished game's value); mtFin: the reply from the threads' raw result.
function mtNode(m) {
  let b = Int8Array.from(m.b), side = m.side; setup(b, m.rules);
  for (const k of m.line || []) { const c = Int8Array.from(b), r = play(c, side, k, Rcur); b = c; if (!r.extra) side = 1 - side; }
  return { b, side };
}
function mtPlan(m) {
  const b = Int8Array.from(m.b); setup(b, m.rules);
  const moves = legal(b, m.side, Rcur), inf = INF;
  if (m.job === 'move') {
    const L = m.cfg || LEVELS[Math.max(1, Math.min(10, m.level | 0))];
    if (moves.length < 2 || (L.kind !== 'time' && !(m.cfg && L.kind === 'depth'))) { const r = chooseMove(b, m.side, m.rules, m.level, m.cfg); return { result: { type: 'move', move: r.move, value: r.value, exact: r.exact, depth: r.depth } }; }
    if (L.kind === 'depth') return { plan: { kind: 'all', kids: mtKids({ b: m.b, side: m.side, rules: m.rules }).kids, inf, d0: L.depth, maxD: L.depth, solved: true } };   // (PRO: a depth on several threads, then the level's noise)
    return { plan: { kind: 'best', kids: mtKids({ b: m.b, side: m.side, rules: m.rules }).kids, inf, maxD: 60, ms: L.ms, solved: true, splitMin: 6 } };
  }
  if (!moves.length) return { result: { type: 'analyze', list: [], depth: 0, exact: true } };
  return { plan: { kind: 'all', kids: mtKids({ b: m.b, side: m.side, rules: m.rules }).kids, inf, maxD: m.maxDepth || 60, ms: m.ms || 1000, solved: true, pv: m.pv || 0 } };
}
function mtV(m) {
  const { b, side } = mtNode(m), ply = (m.line || []).length;
  nodes = 0; aborted = false; cut = false; deadline = m.until ? now() + (m.until - Date.now()) : Infinity;
  const nl = m.nl || 0; let v, ok = true;
  try { v = search(b, side, m.d, m.wa, m.wb, Math.max(1, ply)); } catch (e) { if (!(e instanceof Abort)) throw e; ok = false; v = 0; }
  return { v, ok: ok && (!nl || nodes <= nl), exact: !cut, nodes };
}
function mtKids(m) {
  const { b, side } = mtNode(m);
  const ms = side ? 13 : 6, os = side ? 6 : 13, base = side ? 7 : 0;
  let h1 = side ? ZS1 : 0, h2 = side ? ZS2 : 0;
  for (let i = 0; i < 14; i++) { h1 ^= Z1[i * ZN + b[i]]; h2 ^= Z2[i * ZN + b[i]]; }
  h1 ^= ZR1[ridx]; h2 ^= ZR2[ridx];
  const ti = h1 & TT_MASK, ttMove = ttKey[ti] === h2 && ttInfo[ti] ? (ttInfo[ti] >> 10) - 1 : -1;
  const must = Rcur.feed && sideSum(b, 1 - side) === 0, out = [];
  for (let k = 0; k < 6; k++) {   // (the same moves and order as search())
    if (!b[base + k] || (must && Rcur.oware && b[base + k] < 6 - k)) continue;
    const c = Int8Array.from(b), r = play(c, side, k, Rcur);
    if (must && !r.over && sideSum(c, 1 - side) === 0) continue;
    let sc; const e = { m: k };
    if (r.over) { sc = 1e6 + (c[ms] - c[os]) * 10; e.t = (c[ms] - c[os]) * SEED; }
    else { sc = (r.extra ? 5000 : 0) + (c[ms] - b[ms]) * 100 - k; e.s = r.extra ? 1 : -1; }
    if (k === ttMove) sc += 1e7;
    e.sc = sc; out.push(e);
  }
  out.sort((x, y) => y.sc - x.sc); out.forEach(e => { delete e.sc; });
  return { kids: out };
}
function mtFin(m) {
  const r = m.raw;
  if (m.job === 'move') {
    if (r.list) {   // (PRO depth: the level's noise over the values)
      const L = m.cfg || {};
      const noisy = r.list.map(x => ({ m: x.m, v: x.v + (L.noise ? (seedRand() * 2 - 1) * L.noise : 0), raw: x.v, exact: x.exact })).sort((a, c) => c.v - a.v);
      return { result: { type: 'move', move: noisy[0].m, value: noisy[0].raw / SEED, exact: noisy[0].exact, depth: r.depth } };
    }
    return { result: { type: 'move', move: r.m, value: r.v / SEED, exact: !!r.exact, depth: r.depth } };
  }
  const list = (r.list || []).map(x => Object.assign({ m: x.m, v: x.v / SEED, exact: !!x.exact }, x.pv ? { pv: x.pv } : {}));
  return { result: { type: 'analyze', list, depth: r.depth, exact: list.every(x => x.exact) } };
}
function mtPv(m) { const b = Int8Array.from(m.b); setup(b, m.rules); return { pv: pvLine(b, m.side, m.m, m.plies) }; }

const API = { RULES, RULE_IDS, initial, play, trace, replay, legal, isLegal, canFeed, stuck, sideSum, storeOf, baseOf, opposite, turnMax, turnMaxFirst,
  evaluate, think, analyze, solve, chooseMove, LEVELS, mtPlan, mtV, mtKids, mtFin, mtPv, W, WO, WG, ttClear, pvLine, setRandom: f => { seedRand = f; }, get nodes() { return nodes; } };

if (typeof module !== 'undefined' && module.exports) module.exports = API;
else root.MancalaEngine = API;

// ---------------------------------------------------------------------------- worker protocol
if (typeof WorkerGlobalScope !== 'undefined' && root instanceof WorkerGlobalScope) {
  root.onmessage = ev => {
    const m = ev.data;
    try {
      const b = Int8Array.from(m.b || []);
      if (m.type === 'move') {
        const r = chooseMove(b, m.side, m.rules, m.level, m.cfg);
        root.postMessage({ type: 'move', id: m.id, move: r.move, value: r.value, exact: r.exact, depth: r.depth });
      } else if (m.type === 'analyze') {
        const r = analyze(b, m.side, m.rules, m.ms || 1000, m.maxDepth);
        if (m.pv) for (const x of r.list) x.pv = pvLine(b, m.side, x.m, m.pv);
        root.postMessage({ type: 'analyze', id: m.id, list: r.list, depth: r.depth, exact: r.exact });
      } else if (m.type === 'mtplan') root.postMessage(Object.assign({ id: m.id, type: 'result' }, mtPlan(m)));
      else if (m.type === 'mtv') root.postMessage(Object.assign({ id: m.id, type: 'result' }, mtV(m)));
      else if (m.type === 'mtkids') root.postMessage(Object.assign({ id: m.id, type: 'result' }, mtKids(m)));
      else if (m.type === 'mtpv') root.postMessage(Object.assign({ id: m.id, type: 'result' }, mtPv(m)));
      else if (m.type === 'mtfin') root.postMessage(Object.assign({ id: m.id, type: 'result' }, mtFin(m)));
      else if (m.type === 'solve') {
        const r = solve(b, m.side, m.rules, m.ms || 8000) || analyze(b, m.side, m.rules, 1500);
        root.postMessage({ type: 'analyze', id: m.id, list: r.list, depth: r.depth, exact: r.exact });
      }
    } catch (e) { root.postMessage({ type: 'error', id: m.id, msg: String(e && e.stack || e) }); }
  };
}
})(typeof self !== 'undefined' ? self : this);
