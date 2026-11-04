/* ブラックジャック — rules engine (blackjack/engine.js). No DOM.
   Cards: 0…51 = suit*13 + rank-1 (rank 1=A … 13=K), the solitaire / poker card ids. A shoe holds `decks` × 52 cards
   (Spanish 21: the four 10s of each deck are taken out — J/Q/K stay).
   Values: A = 1 or 11, 2–9 face value, 10/J/Q/K = 10. Blackjack = an ace and a ten-value card as the first two cards.
   Variants (BJ.VARIANTS) and their rules (BJ.rulesOf):
     classic  = Vegas Strip (6 decks, dealer stands on soft 17, double any two, double after split, late surrender, peek, 3:2)
     european = European, no hole card (the dealer takes the second card after the players; a dealer blackjack takes doubled and split bets too),
                double on 9–11 only, no surrender
     spanish  = Spanish 21 (no 10s; player 21 always wins; bonus 21s; double any number of cards; resplit and hit split aces; late surrender)
     free     = Free Bet (free doubles on hard 9–11, free splits of every pair but 10s; a dealer 22 pushes)
   Strategy: exact expected values of every move against the dealer's up card for a card composition (infinite-deck
   approximation with the probabilities of the remaining shoe) → the basic strategy chart (full shoe) and the count-adjusted best move.
   Side bets: Perfect Pairs (6 / 12 / 25 : 1) and 21+3 (5 / 10 / 30 / 40 / 100 : 1). */
(function (G) {
'use strict';
const RANK = c => c % 13 + 1, SUIT = c => Math.floor(c / 13) % 4;
const VAL = c => { const r = c % 13 + 1; return r >= 10 ? 10 : r; };   // ace = 1
const RCH = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const cardStr = c => RCH[RANK(c)] + '♠♥♦♣'[SUIT(c)];
function parse(s) {   // 'AS', 'TD', '10H', 'KC'
  s = String(s).toUpperCase(); const su = 'SHDC'.indexOf(s.slice(-1)); let r = s.slice(0, -1); r = r === 'T' ? '10' : r;
  return su * 13 + RCH.indexOf(r) - 1;
}
function hv(cs) { let h = 0, a = false; for (const c of cs) { const v = VAL(c); h += v; if (v === 1) a = true; } const soft = a && h + 10 <= 21; return { t: soft ? h + 10 : h, soft, h, a }; }
const isBJ = cs => cs.length === 2 && hv(cs).t === 21;
const isPair = cs => cs.length === 2 && VAL(cs[0]) === VAL(cs[1]);
const HILO = c => { const v = VAL(c); return v >= 2 && v <= 6 ? 1 : v === 1 || v === 10 ? -1 : 0; };
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shuffle(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ---------- rules ---------- */
const BASE = { decks: 6, h17: false, das: true, surr: true, bj: 1.5, peek: true, dbl: 'any', maxHands: 4, rsa: false, hsa: false, spanish: false, free: false, enhc: false, side: true };
const VARIANTS = {
  classic: { rules: {}, opts: ['h17', 'surr', 'bj', 'das', 'side'] },
  european: { rules: { peek: false, enhc: true, surr: false, dbl: '911', maxHands: 2 }, opts: ['h17', 'bj', 'das', 'side'] },
  spanish: { rules: { h17: true, spanish: true, rsa: true, hsa: true, dbl: 'many' }, opts: ['h17', 'surr', 'side'] },
  free: { rules: { h17: true, free: true, surr: false }, opts: ['h17', 'bj', 'side'] },
};
// the side bets each variant offers (Spanish 21: no Perfect Pairs — with 12 ranks the usual pay table would favour the player)
const SIDEBETS = { classic: ['pp', 't3'], european: ['pp', 't3'], spanish: ['t3'], free: ['pp', 't3'] 
};
const ORDER = ['classic', 'european', 'spanish', 'free'];
const DECKS = [1, 2, 6, 8];
function rulesOf(v, p) {
  const V = VARIANTS[v] || VARIANTS.classic, R = Object.assign({}, BASE, V.rules);
  p = p || {};
  if (DECKS.includes(p.decks)) R.decks = p.decks;
  V.opts.forEach(k => { if (p[k] !== undefined && p[k] !== null) R[k] = k === 'bj' ? (p.bj === 1.2 ? 1.2 : 1.5) : !!p[k]; });
  return R;
}
const rkey = R => [R.decks, R.h17, R.das, R.surr, R.bj, R.peek, R.dbl, R.maxHands, R.rsa, R.hsa, R.spanish, R.free, R.enhc].join('|');

/* ---------- the shoe ---------- */
function newShoe(R, rnd) {
  const cards = [];
  for (let d = 0; d < R.decks; d++) for (let c = 0; c < 52; c++) { if (R.spanish && RANK(c) === 10) continue; cards.push(c); }
  shuffle(cards, rnd || Math.random);
  // the cut card: about 75% in (single / double deck: about 65%)
  const pen = R.decks <= 2 ? .62 + (rnd || Math.random)() * .08 : .72 + (rnd || Math.random)() * .08;
  return { cards, pos: 0, cut: Math.floor(cards.length * pen), n: 0 };
}
// value counts of a list of cards (index 1 = ace … 10 = ten-value)
function vcounts(cards, from) { const n = Array(11).fill(0); for (let i = from || 0; i < cards.length; i++) n[VAL(cards[i])]++; return n; }
function fullCounts(R) { const n = Array(11).fill(0); for (let v = 1; v <= 9; v++) n[v] = 4 * R.decks; n[10] = (R.spanish ? 12 : 16) * R.decks; return n; }
function probs(n) { const s = n.reduce((a, x) => a + x, 0) || 1; return n.map(x => x / s); }

/* ---------- the dealer ---------- */
// outcome vector: [17, 18, 19, 20, 21, 22 (bust by exactly 22), bust > 22]
function dealerFn(p, R) {
  const memo = new Map();
  function g(h, a) {
    const k = h * 2 + (a ? 1 : 0); if (memo.has(k)) return memo.get(k);
    const soft = a && h + 10 <= 21, t = soft ? h + 10 : h;
    let out;
    if (t > 21) { out = [0, 0, 0, 0, 0, 0, 0]; out[t === 22 ? 5 : 6] = 1; }
    else if (t >= 17 && !(R.h17 && soft && t === 17)) { out = [0, 0, 0, 0, 0, 0, 0]; out[t - 17] = 1; }
    else { out = [0, 0, 0, 0, 0, 0, 0]; for (let v = 1; v <= 10; v++) { if (!p[v]) continue; const o = g(h + v, a || v === 1); for (let i = 0; i < 7; i++) out[i] += p[v] * o[i]; } }
    memo.set(k, out); return out;
  }
  // from the up card: the chance of a blackjack and the outcome given no blackjack
  return function (up) {
    let bj = 0; const acc = [0, 0, 0, 0, 0, 0, 0];
    for (let v = 1; v <= 10; v++) {
      if (!p[v]) continue;
      if ((up === 1 && v === 10) || (up === 10 && v === 1)) { bj += p[v]; continue; }
      const o = g(up + v, up === 1 || v === 1); for (let i = 0; i < 7; i++) acc[i] += p[v] * o[i];
    }
    const s = 1 - bj; return { bj, d: acc.map(x => s > 0 ? x / s : 0) };
  };
}

/* ---------- expected values of the player's moves ---------- */
// one solver per (composition, rules); per up card it caches stand / hit / double for every hand state
const SOLV = new Map();
function solver(p, R) {
  const key = rkey(R) + ':' + p.map(x => x.toFixed(5)).join(',');
  if (SOLV.has(key)) return SOLV.get(key);
  if (SOLV.size > 60) SOLV.clear();
  const dealer = dealerFn(p, R), ups = {};
  function forUp(up) {
    if (ups[up]) return ups[up];
    const D = dealer(up), d = D.d;
    // stand: [ev, win, lose] for a total (and whether it is a 21 the Spanish rule always pays)
    const stand = t => {
      if (t > 21) return [-1, 0, 1];
      let w = 0, l = 0;
      if (R.spanish && t === 21) w = 1 - 0;   // player 21 always wins (a dealer blackjack was ruled out / handled outside)
      else {
        for (let i = 0; i < 5; i++) { const dt = 17 + i; if (t > dt) w += d[i]; else if (t < dt) l += d[i]; }
        w += R.free ? d[6] : d[5] + d[6];   // Free Bet: a dealer 22 pushes
      }
      return [w - l, w, l];
    };
    const memo = new Map();
    const tot = (h, a) => a && h + 10 <= 21 ? h + 10 : h;
    // best of stand / hit from a state (no double): [ev, win, lose, 'S'|'H']
    function best(h, a) {
      const k = h * 2 + (a ? 1 : 0); if (memo.has(k)) return memo.get(k);
      const t = tot(h, a); let r;
      if (t > 21) r = [-1, 0, 1, 'S'];
      else {
        const s = stand(t); const hi = t >= 21 ? null : hit(h, a);
        r = hi && hi[0] > s[0] ? [hi[0], hi[1], hi[2], 'H'] : [s[0], s[1], s[2], 'S'];
      }
      memo.set(k, r); return r;
    }
    function hit(h, a) {
      let e = 0, w = 0, l = 0;
      for (let v = 1; v <= 10; v++) { if (!p[v]) continue; const b = best(h + v, a || v === 1); e += p[v] * b[0]; w += p[v] * b[1]; l += p[v] * b[2]; }
      return [e, w, l];
    }
    function dbl(h, a) {   // one card, then stand; two units
      let w = 0, l = 0;
      for (let v = 1; v <= 10; v++) { if (!p[v]) continue; const s = stand(tot(h + v, a || v === 1)); w += p[v] * s[1]; l += p[v] * s[2]; }
      return [2 * (w - l), w, l];
    }
    ups[up] = { D, stand, best, hit, dbl, tot };
    return ups[up];
  }
  // the value of one split hand that starts with card r (no resplit in the estimate)
  function splitHand(r, up) {
    const U = forUp(up); let e = 0, w = 0, l = 0;
    for (let v = 1; v <= 10; v++) {
      if (!p[v]) continue; const h = r + v, a = r === 1 || v === 1;
      let o;
      if (r === 1 && !R.hsa) { o = U.stand(U.tot(h, a)); }
      else { o = U.best(h, a); if (R.das && canDoubleT(R, h, a, 2)) { const dd = U.dbl(h, a); if (dd[0] > o[0]) o = dd; } }
      e += p[v] * o[0]; w += p[v] * o[1]; l += p[v] * o[2];
    }
    return [e, w, l];
  }
  const S = { forUp, splitHand, dealer };
  SOLV.set(key, S); return S;
}
// may this hand double? (by its hard sum / ace and the number of cards)
function canDoubleT(R, h, a, n) {
  if (R.dbl === 'many') return true;
  if (n !== 2) return false;
  if (R.dbl === '911') { const t = a && h + 10 <= 21 ? h + 10 : h; return !(a && h + 10 <= 21) && t >= 9 && t <= 11; }
  return true;
}
// the moves allowed now: ctx = { nHands, split (this hand came from a split), splitAces, n (cards) }
function allowed(cards, R, ctx) {
  ctx = ctx || {}; const n = cards.length, V = hv(cards), out = { S: true, H: true };
  if (ctx.splitAces && !R.hsa) { out.H = false; }
  if (V.t >= 21) { out.H = false; return out; }
  if ((R.dbl === 'many' || n === 2) && canDoubleT(R, V.h, V.a, n) && (!ctx.split || R.das) && !(ctx.splitAces && !R.hsa)) out.D = true;
  if (n === 2 && isPair(cards) && (ctx.nHands || 1) < R.maxHands && !(ctx.splitAces && !R.rsa && VAL(cards[0]) === 1)) out.P = true;
  if (ctx.splitAces && !R.rsa && VAL(cards[0]) === 1) delete out.P;
  if (R.surr && n === 2 && !ctx.split) out.R = true;
  // Free Bet: the double on a hard 9–11 and the split of a pair (not 10s) are free
  if (R.free && n === 2 && !(V.a && V.h + 10 <= 21) && V.t >= 9 && V.t <= 11 && out.D) out.FD = true;
  if (R.free && out.P && VAL(cards[0]) !== 10) out.FP = true;
  return out;
}
// expected value of every allowed move (per unit of the original bet), at decision time:
// peek games: given that the dealer has no blackjack; no-hole-card games: including the dealer blackjack that may still come
function moveEVs(cards, up, p, R, ctx) {
  ctx = ctx || {};
  const S = solver(p, R), U = S.forUp(up), V = hv(cards), A = allowed(cards, R, ctx), r = {};
  const pbj = R.enhc ? U.D.bj : 0, adj = (ev, stake) => (1 - pbj) * ev - pbj * stake;
  if (A.S) r.S = adj(U.stand(V.t)[0], 1);
  if (A.H) r.H = adj(U.hit(V.h, V.a)[0], 1);
  if (A.D) {
    const d = U.dbl(V.h, V.a);
    r.D = A.FD ? adj(d[1] - d[2] + d[1], 1) : adj(d[0], 2);   // Free Bet: the free chip only wins
  }
  if (A.P) {
    const sh = S.splitHand(VAL(cards[0]), up);
    r.P = A.FP ? adj(sh[0] + sh[1], 1) : adj(2 * sh[0], 2);
  }
  if (A.R) r.R = -.5;
  return r;
}
const bestOf = ev => Object.keys(ev).reduce((b, k) => b == null || ev[k] > ev[b] + 1e-12 ? k : b, null);

/* ---------- basic strategy chart (full shoe) ---------- */
const CHART = new Map();
// cell code for a hand kind: 'h' hard total, 's' soft total (A + x), 'p' pair of value x; up 2…11 (11 = ace)
function chartCell(R, kind, x, upI) {
  const up = upI === 11 ? 1 : upI, key = rkey(R) + kind + x + ':' + up;
  if (CHART.has(key)) return CHART.get(key);
  const p = probs(fullCounts(R));
  let cards;
  if (kind === 'p') cards = [x === 1 ? 0 : x - 1, x === 1 ? 13 : x + 12];
  else if (kind === 's') cards = [0, x - 1];
  else cards = hardCards(x);
  const ev = moveEVs(cards, up, p, R, { nHands: 1 });
  if (kind !== 'p') delete ev.P;
  let b = bestOf(ev), code = b;
  const fall = () => { const e2 = Object.assign({}, ev); delete e2.D; delete e2.R; delete e2.P; return bestOf(e2); };
  if (b === 'D') code = fall() === 'S' ? 'Ds' : 'D';
  else if (b === 'R') { const e2 = Object.assign({}, ev); delete e2.R; const f = bestOf(e2); code = f === 'S' ? 'Rs' : f === 'P' ? 'Rp' : 'R'; }
  CHART.set(key, code); return code;
}
// the values behind one chart cell (the research tab's inspector)
function cellEVs(R, kind, x, upI) {
  const up = upI === 11 ? 1 : upI, p = probs(fullCounts(R));
  const cards = kind === 'p' ? [x === 1 ? 0 : x - 1, x === 1 ? 13 : x + 12] : kind === 's' ? [0, x - 1] : hardCards(x);
  const ev = moveEVs(cards, up, p, R, { nHands: 1 }); if (kind !== 'p') delete ev.P;
  return { cards, up, ev, code: chartCell(R, kind, x, upI) };
}
// the hard-total cards used for a chart row: two different cards that are not a pair and contain no ace
function hardCards(x) { for (let a = 2; a <= 10; a++) { const b = x - a; if (b >= 2 && b <= 10 && b !== a) return [a - 1, b - 1 + 13]; } return [x - 1 - 1, 13 + 1 - 1]; }

/* ---------- the whole round: expected value / house edge ---------- */
const EDGE = new Map(), DECK_ADJ = { 1: .0046, 2: .0017, 6: 0, 8: -.0003 };
function roundEV(p, R) {
  const key = rkey(R) + ':' + p.map(x => x.toFixed(5)).join(',');
  if (EDGE.has(key)) return EDGE.get(key);
  const S = solver(p, R); let ev = 0;
  for (let up = 1; up <= 10; up++) {
    if (!p[up]) continue; const U = S.forUp(up), pbj = U.D.bj;
    let eu = 0;
    for (let a = 1; a <= 10; a++) for (let b = 1; b <= 10; b++) {
      const w = p[a] * p[b]; if (!w) continue;
      if ((a === 1 && b === 10) || (a === 10 && b === 1)) { eu += w * (1 - pbj) * R.bj; continue; }
      const cards = [a - 1, b - 1 + 13];   // value cards (any suit)
      const E = moveEVs(cards, up, p, R, { nHands: 1 }), m = Math.max(...Object.values(E));
      eu += w * (R.enhc ? m : (1 - pbj) * m - pbj);
    }
    ev += p[up] * eu;
  }
  ev += DECK_ADJ[R.decks] || 0;   // finite decks (the solver is an infinite-deck approximation): fewer decks help the player
  if (R.spanish) ev += .0045;   // the bonus 21s (5+ cards, 6-7-8, 7-7-7) — a fixed estimate, not in the solver
  EDGE.set(key, ev); return ev;
}
const houseEdge = R => -roundEV(probs(fullCounts(R)), R);
// Hi-Lo: a composition with a given true count (the low cards 2–6 out, the tens and aces in, by count units per deck)
function countComp(R, tc) {
  const n = fullCounts(R).map(x => x / R.decks);   // per deck
  const lo = [2, 3, 4, 5, 6], hi = [1, 10], loN = lo.reduce((a, v) => a + n[v], 0), hiN = hi.reduce((a, v) => a + n[v], 0);
  const m = n.slice(); lo.forEach(v => { m[v] -= tc / 2 * n[v] / loN; }); hi.forEach(v => { m[v] += tc / 2 * n[v] / hiN; });
  return probs(m.map(x => Math.max(0, x)));
}

/* ---------- side bets ---------- */
const COLOR = c => SUIT(c) === 1 || SUIT(c) === 2 ? 'r' : 'b';
function perfectPairs(c1, c2) {
  if (RANK(c1) !== RANK(c2)) return null;
  if (SUIT(c1) === SUIT(c2)) return { k: 'perfect', pay: 25 };
  if (COLOR(c1) === COLOR(c2)) return { k: 'colored', pay: 12 };
  return { k: 'mixed', pay: 6 };
}
function twentyOne3(c1, c2, up) {
  const cs = [c1, c2, up], rs = cs.map(RANK).sort((a, b) => a - b), su = cs.map(SUIT);
  const flush = su[0] === su[1] && su[1] === su[2], trips = rs[0] === rs[1] && rs[1] === rs[2];
  const str = (rs[1] === rs[0] + 1 && rs[2] === rs[1] + 1) || (rs[0] === 1 && rs[1] === 12 && rs[2] === 13);
  if (trips && flush) return { k: 'strips', pay: 100 };
  if (str && flush) return { k: 'sflush', pay: 40 };
  if (trips) return { k: 'trips', pay: 30 };
  if (str) return { k: 'straight', pay: 10 };
  if (flush) return { k: 'flush', pay: 5 };
  return null;
}
// exact house edges of the side bets for a shoe (52 card kinds × decks; Spanish shoes without the 10s)
const SIDE = new Map();
function sideEdges(R) {
  const key = R.decks + (R.spanish ? 's' : '');
  if (SIDE.has(key)) return SIDE.get(key);
  const cnt = []; for (let c = 0; c < 52; c++) cnt.push(R.spanish && RANK(c) === 10 ? 0 : R.decks);
  const N = cnt.reduce((a, x) => a + x, 0);
  let pp = 0;
  for (let a = 0; a < 52; a++) for (let b = 0; b < 52; b++) { const w = cnt[a] * (cnt[b] - (a === b ? 1 : 0)); if (w <= 0) continue; const r = perfectPairs(a, b); pp += w * (r ? r.pay : -1); }
  pp /= N * (N - 1);
  let t3 = 0, tw = 0;
  for (let a = 0; a < 52; a++) { if (!cnt[a]) continue; const ca = cnt[a];
    for (let b = 0; b < 52; b++) { const cb = cnt[b] - (a === b ? 1 : 0); if (cb <= 0) continue;
      for (let c = 0; c < 52; c++) { const cc = cnt[c] - (a === c ? 1 : 0) - (b === c ? 1 : 0); if (cc <= 0) continue; const w = ca * cb * cc; const r = twentyOne3(a, b, c); t3 += w * (r ? r.pay : -1); tw += w; } } }
  const out = { pp: -pp, t3: -t3 / tw };
  SIDE.set(key, out); return out;
}

/* ---------- settling a hand ---------- */
// Spanish 21 bonus 21s (not on a doubled hand): 5 cards 3:2, 6 cards 2:1, 7+ cards 3:1; 6-7-8 / 7-7-7 mixed 3:2, suited 2:1, spades 3:1
function spanishBonus(cards) {
  const n = cards.length; let m = 1, k = null;
  if (n >= 7) { m = 3; k = 'c7'; } else if (n === 6) { m = 2; k = 'c6'; } else if (n === 5) { m = 1.5; k = 'c5'; }
  if (n === 3) {
    const vs = cards.map(VAL).sort((a, b) => a - b);
    if ((vs[0] === 6 && vs[1] === 7 && vs[2] === 8) || (vs[0] === 7 && vs[1] === 7 && vs[2] === 7)) {
      const su = cards.map(SUIT), same = su[0] === su[1] && su[1] === su[2];
      const mm = same && su[0] === 0 ? 3 : same ? 2 : 1.5; if (mm > m) { m = mm; k = vs[0] === 7 ? 'c777' : 'c678'; }
    }
  }
  return { m, k };
}
// → { net, kind: 'bj'|'win'|'lose'|'push'|'bust'|'surr'|'dbj', bonus }
// hand: { cards, bet (staked from the bank, doubles included), free (free chips riding on it), split, dbl, surr }
function settleHand(hand, dealer, R) {
  const P = hv(hand.cards), D = hv(dealer), pbj = isBJ(hand.cards) && !hand.split, dbj = isBJ(dealer);
  if (hand.surr) return { net: -hand.bet / 2, kind: 'surr' };
  if (P.t > 21) return { net: -hand.bet, kind: 'bust' };
  if (pbj) return dbj && !R.spanish ? { net: 0, kind: 'push' } : { net: hand.bet * R.bj, kind: 'bj' };   // Spanish 21: a player blackjack beats the dealer's
  if (dbj) return { net: -hand.bet, kind: 'dbj' };
  const win = mult => ({ net: hand.bet * (mult || 1) + (hand.free || 0), kind: 'win' });
  if (R.spanish && P.t === 21) { const b = hand.dbl ? { m: 1 } : spanishBonus(hand.cards); const r = win(b.m); if (b.m > 1) r.bonus = b.k; return r; }
  if (D.t > 21) return R.free && D.t === 22 ? { net: 0, kind: 'push22' } : win();
  if (P.t > D.t) return win();
  if (P.t < D.t) return { net: -hand.bet, kind: 'lose' };
  return { net: 0, kind: 'push' };
}
const dealerHits = (cards, R) => { const V = hv(cards); return V.t < 17 || (R.h17 && V.soft && V.t === 17); };

/* ---------- strategies (the bots, the simulator) ---------- */
// the best move by the expected values (p: a composition; the basic strategy uses the full shoe)
function bestMove(cards, up, p, R, ctx) { const ev = moveEVs(cards, up, p, R, ctx); return { m: bestOf(ev), ev }; }
const BASICP = new Map();
function basicMove(cards, up, R, ctx) {
  const k = rkey(R); if (!BASICP.has(k)) BASICP.set(k, probs(fullCounts(R)));
  return bestMove(cards, up, BASICP.get(k), R, ctx).m;
}
const STRATS = {
  basic: (cards, up, R, ctx) => basicMove(cards, up, R, ctx),
  // never bust: stand on any hard 12+, hit soft hands to 18; no doubles or splits except aces and eights
  nobust: (cards, up, R, ctx) => { const V = hv(cards), A = allowed(cards, R, ctx); if (A.P && (VAL(cards[0]) === 1 || VAL(cards[0]) === 8)) return 'P'; if (!A.H) return 'S'; return V.soft ? (V.t <= 17 ? 'H' : 'S') : V.t <= 11 ? 'H' : 'S'; },
  // play like the dealer: hit to 17, nothing else
  mimic: (cards, up, R, ctx) => { const A = allowed(cards, R, ctx); return A.H && dealerHits(cards, R) ? 'H' : 'S'; },
  // by feel: basic strategy, but stands on 12–16 against a 7 or more about half of the time, never splits or surrenders
  gut: (cards, up, R, ctx) => { const m = basicMove(cards, up, R, ctx), V = hv(cards); if (m === 'P' || m === 'R') return V.t >= 17 ? 'S' : 'H'; if (!V.soft && V.t >= 12 && V.t <= 16 && Math.random() < .5) return 'S'; return m; },
};
// one heads-up round from a draw function: → net per unit (insurance never taken)
function simRound(draw, R, strat) {
  const p = [draw(), draw()], d = [draw()]; if (!R.enhc) d.push(draw());
  const up = VAL(d[0]);
  const dealerBJ = () => d.length === 2 && isBJ(d);
  if (!R.enhc && (up === 1 || up === 10) && isBJ(d)) return isBJ(p) ? (R.spanish ? R.bj : 0) : -1;
  if (isBJ(p)) { if (R.enhc) { d.push(draw()); if (dealerBJ()) return 0; } return R.bj; }
  const hands = [{ cards: p, bet: 1, free: 0 }]; let i = 0;
  while (i < hands.length) {
    const h = hands[i], ctx = { nHands: hands.length, split: !!h.split, splitAces: !!h.sa };
    if (h.cards.length === 1) h.cards.push(draw());
    for (let g = 0; g < 12; g++) {
      if (hv(h.cards).t >= 21) break;
      const A = allowed(h.cards, R, ctx); let m = strat(h.cards, up, R, ctx);
      if (!A[m]) m = A.H ? (hv(h.cards).t < 17 ? 'H' : 'S') : 'S';
      if (m === 'S') break;
      if (m === 'R') { h.surr = true; break; }
      if (m === 'D') { if (A.FD) h.free += h.bet || h.free; else h.bet *= 2; h.dbl = true; h.cards.push(draw()); break; }
      if (m === 'P') { const nh = { cards: [h.cards.pop()], bet: A.FP ? 0 : h.bet, free: A.FP ? h.bet : 0, split: true, sa: VAL(h.cards[0]) === 1 }; h.split = true; h.sa = nh.sa; hands.splice(i + 1, 0, nh); h.cards.push(draw()); ctx.nHands = hands.length; ctx.split = true; ctx.splitAces = h.sa; if (h.sa && !R.hsa) break; continue; }
      h.cards.push(draw()); if (h.sa && !R.hsa) break;
    }
    i++;
  }
  // free split hands: their stake is the free chip (it wins, never loses)
  hands.forEach(h => { if (!h.bet && h.free) { h.bet = 0; } });
  const live = hands.some(h => !h.surr && hv(h.cards).t <= 21);
  if (R.enhc) d.push(draw());
  if (live || R.enhc) while (dealerHits(d, R)) d.push(draw());
  let net = 0; hands.forEach(h => { const r = settleHand(h, d, R); net += r.net; });
  return net;
}
// Monte Carlo: n rounds from shuffled shoes → { mean, sd, n }
function simulate(R, stratKey, n, seed) {
  const rnd = mulberry(seed || 12345), strat = STRATS[stratKey] || STRATS.basic;
  let shoe = newShoe(R, rnd), s = 0, s2 = 0;
  const draw = () => shoe.cards[shoe.pos++];
  for (let i = 0; i < n; i++) { if (shoe.pos >= shoe.cut || shoe.pos + 20 > shoe.cards.length) shoe = newShoe(R, rnd); const x = simRound(draw, R, strat); s += x; s2 += x * x; }
  const mean = s / n; return { mean, sd: Math.sqrt(Math.max(0, s2 / n - mean * mean)), n };
}

G.BJ = { SIDEBETS, RANK, SUIT, VAL, RCH, cardStr, parse, hv, isBJ, isPair, HILO, mulberry, shuffle, BASE, VARIANTS, ORDER, DECKS, rulesOf, rkey,
  newShoe, vcounts, fullCounts, probs, dealerFn, solver, allowed, moveEVs, bestOf, bestMove, basicMove, chartCell, hardCards, roundEV, houseEdge, countComp,
  cellEVs, perfectPairs, twentyOne3, sideEdges, spanishBonus, settleHand, dealerHits, STRATS, simRound, simulate };
})(typeof self !== 'undefined' ? self : this);
