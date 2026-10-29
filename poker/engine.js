/* =====================================================================
   ポーカー — rules engine (poker/engine.js)
   No DOM: also used by the equity worker and the tests.

   Cards   c = suit·13 + rank−1  (suit 0♠ 1♥ 2♦ 3♣, rank 1 = A … 13 = K) — the same ids as the solitaire.
   Value   v(c) = 2 … 14 (A = 14).
   Scores  higher is better: cat·2^20 + five 4-bit kickers. Categories (normal): 0 high card, 1 pair, 2 two pair,
           3 trips, 4 straight, 5 flush, 6 full house, 7 quads, 8 straight flush. Short deck (6+) swaps the order:
           3 straight, 4 trips, 5 full house, 6 flush (flush beats a full house, trips beat a straight) and A-6-7-8-9
           is the lowest straight. CAT[] maps a score to the hand name in either order.

   HOW TO ADD A POKER GAME
     PK.register({ id, deck (36|52), hole, board:[3,1,1] | null, stud, draw, limit, streets, best(T, seat) … })
     The UI, the CPU, the coach, the statistics and the equity calculator read everything from the variant.
   ===================================================================== */
(function (G) {
'use strict';
const SUIT = c => Math.floor(c / 13) % 4, RANK = c => c % 13 + 1, V = c => { const r = c % 13 + 1; return r === 1 ? 14 : r; };
const RCH = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const vch = v => RCH[v === 14 ? 14 : v];
const cardStr = c => vch(V(c)) + '♠♥♦♣'[SUIT(c)];
const parse = s => { const v = '23456789TJQKA'.indexOf(s[0].toUpperCase()) + 2, su = 'SHDC♠♥♦♣'.indexOf(s[1]) % 4; return su * 13 + (v === 14 ? 0 : v - 1); };

/* ---------- random ---------- */
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(a, rng) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function deckOf(short) { const d = []; for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) { if (short && r >= 2 && r <= 5) continue; d.push(s * 13 + r - 1); } return d; }

/* ---------- hand evaluation (any 1–7 cards; straights / flushes need 5) ---------- */
const NORMAL = [0, 1, 2, 3, 4, 5, 6, 7, 8], SHORT = [0, 1, 2, 4, 3, 6, 5, 7, 8];   // natural category → score category
const KEY = ['high', 'pair', 'two', 'trips', 'straight', 'flush', 'full', 'quads', 'sf'];
const CAT_N = KEY, CAT_S = ['high', 'pair', 'two', 'straight', 'trips', 'full', 'flush', 'quads', 'sf'];
function straightTop(mask, short) {   // mask bit v (2..14); returns the top card of the best straight or 0
  for (let t = 14; t >= 6; t--) { const m = 31 << (t - 4); if ((mask & m) === m) return t; }
  if (short) { if ((mask & ((1 << 14) | (1 << 6) | (1 << 7) | (1 << 8) | (1 << 9))) === ((1 << 14) | (1 << 6) | (1 << 7) | (1 << 8) | (1 << 9))) return 9; }
  else if ((mask & ((1 << 14) | 0b111100)) === ((1 << 14) | 0b111100)) return 5;
  return 0;
}
const enc = (cat, ks) => { let s = cat; for (let i = 0; i < 5; i++) s = s * 16 + (ks[i] || 0); return s; };
function evalCards(cs, short) {
  const cnt = new Array(15).fill(0), sc = [0, 0, 0, 0], sm = [0, 0, 0, 0];
  let mask = 0;
  for (const c of cs) { const v = V(c), s = SUIT(c); cnt[v]++; sc[s]++; sm[s] |= 1 << v; mask |= 1 << v; }
  const ORD = short ? SHORT : NORMAL;
  if (cs.length >= 5) {
    let fs = -1; for (let s = 0; s < 4; s++) if (sc[s] >= 5) fs = s;
    if (fs >= 0) {
      const sf = straightTop(sm[fs], short); if (sf) return enc(ORD[8], [sf]);
    }
    // quads / full house before the flush (normal); in short deck the flush beats a full house
    const q = [], t = [], p = [], si = [];
    for (let v = 14; v >= 2; v--) { if (cnt[v] === 4) q.push(v); else if (cnt[v] === 3) t.push(v); else if (cnt[v] === 2) p.push(v); else if (cnt[v] === 1) si.push(v); }
    if (q.length) { const k = Math.max(t[0] || 0, p[0] || 0, si[0] || 0, q[1] || 0); return enc(ORD[7], [q[0], k]); }
    const full = t.length >= 2 ? [t[0], t[1]] : t.length && p.length ? [t[0], p[0]] : null;
    const flush = fs >= 0 ? (() => { const ks = []; for (let v = 14; v >= 2 && ks.length < 5; v--) if (sm[fs] & (1 << v)) ks.push(v); return ks; })() : null;
    if (full && flush) return short ? enc(ORD[5], flush) : enc(ORD[6], full);
    if (full) return enc(ORD[6], full);
    if (flush) return enc(ORD[5], flush);
    const st = straightTop(mask, short);
    if (t.length) { const tr = enc(ORD[3], [t[0], ...si.concat(p).sort((a, b) => b - a).slice(0, 2)]); return st ? Math.max(tr, enc(ORD[4], [st])) : tr; }
    if (st) return enc(ORD[4], [st]);
    if (p.length >= 2) { const k = Math.max(p[2] || 0, si[0] || 0); return enc(ORD[2], [p[0], p[1], k]); }
    if (p.length) return enc(ORD[1], [p[0], ...si.slice(0, 3)]);
    return enc(ORD[0], si.slice(0, 5));
  }
  // fewer than 5 cards (stud up cards, early streets): pairs / trips / quads only
  const q = [], t = [], p = [], si = [];
  for (let v = 14; v >= 2; v--) { if (cnt[v] === 4) q.push(v); else if (cnt[v] === 3) t.push(v); else if (cnt[v] === 2) p.push(v); else if (cnt[v] === 1) si.push(v); }
  if (q.length) return enc(ORD[7], [q[0]]);
  if (t.length) return enc(ORD[3], [t[0], ...si]);
  if (p.length >= 2) return enc(ORD[2], [p[0], p[1], si[0] || 0]);
  if (p.length) return enc(ORD[1], [p[0], ...si]);
  return enc(ORD[0], si);
}
const catOf = (score, short) => (short ? CAT_S : CAT_N)[Math.floor(score / 1048576)];
const kick = score => { const k = []; let s = score; for (let i = 0; i < 5; i++) { k.unshift(s % 16); s = Math.floor(s / 16); } return k; };
// best 5 of hole + board under the variant's rules (Omaha: exactly 2 hole + 3 board)
function C(n, k) { const out = [], cur = []; (function rec(i) { if (cur.length === k) { out.push(cur.slice()); return; } for (let j = i; j < n; j++) { cur.push(j); rec(j + 1); cur.pop(); } })(0); return out; }
const C42 = C(4, 2), C53 = C(5, 3), C43 = C(4, 3), C33 = C(3, 3), C52 = C(5, 2), C62 = C(6, 2);
function bestOmaha(hole, board, short) {
  if (board.length < 3) return evalCards(hole.concat(board), short);
  const BC = board.length === 5 ? C53 : board.length === 4 ? C43 : C33, HC = hole.length === 4 ? C42 : hole.length === 5 ? C52 : C62;
  let best = -1;
  for (const h of HC) for (const b of BC) { const s = evalCards([hole[h[0]], hole[h[1]], board[b[0]], board[b[1]], board[b[2]]], short); if (s > best) best = s; }
  return best;
}
// the 5 cards that make the score (for highlighting)
function bestFive(cards, short, omaha, hole, board) {
  let best = -1, bc = null;
  const consider = five => { const s = evalCards(five, short); if (s > best) { best = s; bc = five; } };
  if (omaha) { for (const h of C(hole.length, 2)) for (const b of C(board.length, 3)) consider([hole[h[0]], hole[h[1]], board[b[0]], board[b[1]], board[b[2]]]); }
  else if (cards.length <= 5) { best = evalCards(cards, short); bc = cards.slice(); }
  else for (const ix of C(cards.length, 5)) consider(ix.map(i => cards[i]));
  return { score: best, cards: bc || [] };
}

/* ---------- variants ---------- */
const VARIANTS = {}, ORDER = [];
function register(def) { if (!VARIANTS[def.id]) ORDER.push(def.id); VARIANTS[def.id] = def; }
register({ id: 'holdem', deck: 52, hole: 2, board: [3, 1, 1], limits: ['nl', 'pl', 'fl'], limit: 'nl', streets: ['pre', 'flop', 'turn', 'river'] });
register({ id: 'plo', deck: 52, hole: 4, board: [3, 1, 1], omaha: true, limits: ['pl', 'nl', 'fl'], limit: 'pl', streets: ['pre', 'flop', 'turn', 'river'] });
register({ id: 'shortdeck', deck: 36, short: true, hole: 2, board: [3, 1, 1], limits: ['nl', 'pl', 'fl'], limit: 'nl', ante: true, streets: ['pre', 'flop', 'turn', 'river'] });
register({ id: 'stud', deck: 52, hole: 0, stud: true, board: null, limits: ['fl'], limit: 'fl', ante: true, streets: ['3rd', '4th', '5th', '6th', '7th'] });
register({ id: 'draw', deck: 52, hole: 5, draw: true, board: null, limits: ['nl', 'pl', 'fl'], limit: 'nl', streets: ['pre', 'post'] });
// 2-7 triple draw: lowball (the worst high hand wins; aces are high, straights and flushes count), three draws
register({ id: 'triple', deck: 52, hole: 5, draw: true, draws: 3, low27: true, board: null, limits: ['fl', 'nl', 'pl'], limit: 'fl', streets: ['pre', 'd1', 'd2', 'd3'] });
// 2-7 low: the lower the high-hand value, the better → a score where higher still wins
const LOWMAX = 10 * 1048576;
function lowScore(cards) { return LOWMAX - evalCards(cards, false); }
const lowName = cards => cards.map(V).sort((a, b) => b - a).map(vch).join('-');

// the score of a seat's hand (all cards known)
function scoreOf(T, s) {
  const Vr = VARIANTS[T.v], P = T.seats[s];
  if (Vr.omaha) return bestOmaha(P.cards, T.board, Vr.short);
  if (Vr.low27) return lowScore(P.cards);
  return evalCards(P.cards.concat(T.board), Vr.short);
}
function handInfo(T, s) {   // { score, cat, five }
  const Vr = VARIANTS[T.v], P = T.seats[s];
  if (Vr.low27) { const hi = evalCards(P.cards, false), cat = catOf(hi, false); return { score: LOWMAX - hi, cat: cat === 'high' ? 'low' : cat, five: P.cards.slice(), low: true, name: lowName(P.cards) }; }
  const b = bestFive(P.cards.concat(T.board), Vr.short, Vr.omaha, P.cards, T.board);
  return { score: b.score, cat: catOf(b.score, Vr.short), five: b.cards };
}

/* ---------- table / hand state ---------- */
// table options: { v, limit, sb, bb, ante, bringIn, seats:[{ name, stack, human, bot }], btn }
function newTable(o) {
  const Vr = VARIANTS[o.v];
  const T = { v: o.v, limit: o.limit || Vr.limit, sb: o.sb || 1, bb: o.bb || 2, ante: o.ante != null ? o.ante : (Vr.ante ? Math.max(1, Math.round((o.bb || 2) / 4)) : 0),
    seats: o.seats.map((s, i) => ({ i, name: s.name, stack: s.stack, human: !!s.human, bot: s.bot || null, cards: [], up: [], folded: true, allin: false, bet: 0, total: 0, acted: false, sitout: false, drawn: null })),
    btn: o.btn != null ? o.btn : 0, hand: 0, phase: 'idle', board: [], deck: [], street: 0, log: [], pots: [], result: null };
  // fixed limit sizes (small bet = bb, big bet = 2 bb); stud: small bet = bb, bring-in = sb
  T.small = T.bb; T.big = T.bb * 2;
  return T;
}
const live = T => T.seats.filter(s => !s.folded);
const inHand = (T, i) => !T.seats[i].folded;
const canAct = (T, i) => !T.seats[i].folded && !T.seats[i].allin;
const nextSeat = (T, i, pred) => { const n = T.seats.length; for (let k = 1; k <= n; k++) { const j = (i + k) % n; if (pred(j)) return j; } return -1; };
const potTotal = T => T.seats.reduce((a, s) => a + s.total, 0);
const stBets = T => T.seats.reduce((a, s) => a + s.bet, 0);
function post(T, i, amt, kind) {
  const P = T.seats[i], a = Math.min(amt, P.stack);
  P.stack -= a; P.bet += a; P.total += a; if (!P.stack) P.allin = true;
  T.log.push({ st: T.street, s: i, a: kind, amt: a, to: P.bet });
  return a;
}
function startHand(T, rng) {
  const Vr = VARIANTS[T.v];
  T.hand++; T.board = []; T.street = 0; T.log = []; T.result = null; T.pots = []; T.phase = 'bet';
  T.seats.forEach(s => { s.cards = []; s.up = []; s.folded = s.stack <= 0 || s.sitout; s.allin = false; s.bet = 0; s.total = 0; s.acted = false; s.drawn = null; s.shown = false; });
  const active = T.seats.filter(s => !s.folded).map(s => s.i);
  if (active.length < 2) { T.phase = 'over'; return T; }
  if (!Vr.stud) { T.btn = nextSeat(T, T.btn, j => !T.seats[j].folded); }
  T.deck = shuffle(deckOf(Vr.short), rng);
  T.startStacks = T.seats.map(s => s.stack);
  // antes
  if (T.ante) active.forEach(i => post(T, i, T.ante, 'ante'));
  if (T.ante) { T.seats.forEach(s => { s.bet = 0; }); }   // antes go straight to the pot (they are not a bet to call)
  const n = active.length;
  if (Vr.stud) {
    // 2 down + 1 up; the lowest up card brings it in
    for (let r = 0; r < 3; r++) active.forEach(i => { T.seats[i].cards.push(T.deck.pop()); T.seats[i].up.push(r === 2); });
    const low = active.slice().sort((a, b) => studLow(T.seats[a].cards[2]) - studLow(T.seats[b].cards[2]))[0];
    T.bringer = low;
    post(T, low, Math.max(1, Math.round(T.small / 2)), 'bring');
    T.curBet = T.seats[low].bet; T.minRaise = T.small; T.raises = 0; T.lastAgg = low;
    T.toAct = nextSeat(T, low, j => canAct(T, j));
  } else {
    for (let r = 0; r < Vr.hole; r++) active.forEach(i => T.seats[i].cards.push(T.deck.pop()));
    // blinds: heads-up the button is the small blind
    const sbS = n === 2 ? T.btn : nextSeat(T, T.btn, j => !T.seats[j].folded);
    const bbS = nextSeat(T, sbS, j => !T.seats[j].folded);
    T.sbSeat = sbS; T.bbSeat = bbS;
    post(T, sbS, T.sb, 'sb'); post(T, bbS, T.bb, 'bb');
    T.curBet = T.bb; T.minRaise = T.bb; T.raises = 1; T.lastAgg = bbS;
    T.toAct = nextSeat(T, bbS, j => canAct(T, j));
  }
  T.seats.forEach(s => { s.acted = false; });
  settleIfDone(T);
  return T;
}
// stud: the order of up cards for the bring-in (lowest rank, then ♣ < ♦ < ♥ < ♠)
const studLow = c => V(c) * 4 + [3, 2, 1, 0][SUIT(c)];
const isFL = T => T.limit === 'fl';
const betUnit = T => { const Vr = VARIANTS[T.v]; if (Vr.stud) return T.street >= 2 ? T.big : T.small; if (Vr.draw) return T.street >= (Vr.draws > 1 ? 2 : 1) ? T.big : T.small; return T.street >= 2 ? T.big : T.small; };
// what the player to act may do: { fold, check, call (amount to add), minTo, maxTo (raise / bet totals), cap }
function legal(T) {
  if (T.phase !== 'bet' || T.toAct < 0) return null;
  const P = T.seats[T.toAct], toCall = Math.max(0, T.curBet - P.bet), stackTo = P.bet + P.stack;
  const r = { seat: T.toAct, fold: toCall > 0, check: toCall === 0, call: Math.min(toCall, P.stack), toCall, minTo: 0, maxTo: 0, canRaise: false };
  const othersCanAct = T.seats.some((s, i) => i !== T.toAct && canAct(T, i));
  if (P.stack > toCall && (othersCanAct || toCall === 0 && false)) {
    if (isFL(T)) {
      const unit = betUnit(T), cap = 4;
      if (T.raises < cap) { const to = (T.curBet === 0 || (VARIANTS[T.v].stud && T.raises === 0)) ? (T.curBet < unit ? unit : T.curBet + unit) : T.curBet + unit; r.minTo = r.maxTo = Math.min(to, stackTo); r.canRaise = true; }
    } else {
      const minTo = T.curBet === 0 ? T.bb : T.curBet + Math.max(T.minRaise, T.bb);
      let maxTo = stackTo;
      if (T.limit === 'pl') { const pot = potTotal(T) + toCall; maxTo = Math.min(stackTo, T.curBet + pot); }
      r.minTo = Math.min(minTo, stackTo); r.maxTo = Math.max(r.minTo, maxTo); r.canRaise = true;
    }
  }
  return r;
}
// act: { a: 'fold' | 'check' | 'call' | 'raise', to } — 'raise' also means bet / complete; to = the total bet for this street
function act(T, m) {
  const L = legal(T); if (!L) return false;
  const i = T.toAct, P = T.seats[i], ev = { s: i, st: T.street, pot: potTotal(T), toCall: L.toCall, a: m.a };
  if (m.a === 'fold') { if (!L.fold) m = { a: 'check' }; else { P.folded = true; T.log.push({ st: T.street, s: i, a: 'fold', pot: ev.pot, toCall: L.toCall }); } }
  if (m.a === 'check') { if (!L.check) return false; T.log.push({ st: T.street, s: i, a: 'check', pot: ev.pot, toCall: 0 }); }
  if (m.a === 'call') { if (L.check) { T.log.push({ st: T.street, s: i, a: 'check', pot: ev.pot, toCall: 0 }); } else { const a = Math.min(L.toCall, P.stack); P.stack -= a; P.bet += a; P.total += a; if (!P.stack) P.allin = true; T.log.push({ st: T.street, s: i, a: 'call', amt: a, to: P.bet, pot: ev.pot, toCall: L.toCall, allin: P.allin }); } }
  if (m.a === 'raise') {
    if (!L.canRaise) return false;
    let to = Math.max(L.minTo, Math.min(L.maxTo, Math.round(m.to || L.minTo)));
    if (to >= P.bet + P.stack) to = P.bet + P.stack;
    const add = to - P.bet, raiseBy = to - T.curBet;
    P.stack -= add; P.bet = to; P.total += add; if (!P.stack) P.allin = true;
    const kind = T.curBet === 0 ? 'bet' : 'raise';
    if (raiseBy >= T.minRaise || isFL(T)) { T.minRaise = Math.max(raiseBy, T.bb); T.seats.forEach((s, j) => { if (j !== i) s.acted = false; }); }   // a full raise re-opens the action
    else T.seats.forEach((s, j) => { if (j !== i && s.bet < to) s.acted = false; });
    T.curBet = Math.max(T.curBet, to); T.raises++; T.lastAgg = i;
    T.log.push({ st: T.street, s: i, a: kind, amt: add, to, pot: ev.pot, toCall: L.toCall, allin: P.allin });
  }
  P.acted = true;
  advance(T);
  return true;
}
function bettingDone(T) {
  const act = T.seats.filter((s, i) => canAct(T, i));
  if (live(T).length <= 1) return true;
  return act.every(s => s.acted && s.bet === T.curBet) || (act.length === 0) || (act.length === 1 && act[0].bet >= T.curBet && (act[0].acted || T.seats.filter(s => !s.folded && s.allin).every(s => s.bet <= act[0].bet)));
}
function advance(T) {
  if (live(T).length <= 1) return finish(T);
  if (!bettingDone(T)) { T.toAct = nextSeat(T, T.toAct, j => canAct(T, j)); if (T.toAct < 0) return nextStreet(T); return; }
  nextStreet(T);
}
function settleIfDone(T) { if (T.phase === 'bet' && (T.toAct < 0 || bettingDone(T) && T.seats.filter((s, i) => canAct(T, i)).every(s => s.acted))) advance(T); }
function returnUncalled(T) {   // a bet nobody could call goes back
  const bets = T.seats.map(s => s.bet).sort((a, b) => b - a);
  if (bets[0] > bets[1]) { const P = T.seats.find(s => s.bet === bets[0]); const d = bets[0] - bets[1]; P.bet -= d; P.total -= d; P.stack += d; if (P.stack > 0) P.allin = false; T.log.push({ st: T.street, s: P.i, a: 'return', amt: d }); }
}
function nextStreet(T) {
  const Vr = VARIANTS[T.v];
  returnUncalled(T);
  T.seats.forEach(s => { s.bet = 0; s.acted = false; });
  T.curBet = 0; T.minRaise = T.bb; T.raises = 0;
  const last = Vr.streets.length - 1;
  if (T.street >= last) return finish(T);
  T.street++;
  if (Vr.draw && T.street >= 1 && T.street <= (Vr.draws || 1) && T.phase !== 'drawn') {   // a draw: every player in the hand changes cards before the next betting round
    T.phase = 'draw'; T.drawOrder = []; let j = T.btn; for (let k = 0; k < T.seats.length; k++) { j = nextSeat(T, j, x => inHand(T, x)); if (!T.drawOrder.includes(j)) T.drawOrder.push(j); }
    T.toAct = T.drawOrder[0]; return;
  }
  dealStreet(T);
  const acting = T.seats.filter((s, i) => canAct(T, i)).length;
  if (acting < 2) { T.toAct = -1; return runOut(T); }
  T.phase = 'bet';
  if (Vr.stud) { T.toAct = bestShowing(T); }
  else T.toAct = nextSeat(T, T.btn, j => canAct(T, j));
}
function dealStreet(T) {
  const Vr = VARIANTS[T.v];
  if (Vr.board) { const n = Vr.board[T.street - 1] || 0; if (n) { T.deck.pop(); for (let k = 0; k < n; k++) T.board.push(T.deck.pop()); } }   // burn one
  if (Vr.stud) {
    const lastDown = T.street === 4, act = T.seats.filter(s => !s.folded);
    if (T.deck.length < act.length) { const c = T.deck.pop(); T.board.push(c); act.forEach(s => { s.community = true; }); return; }   // not enough cards: one community card
    act.forEach(s => { s.cards.push(T.deck.pop()); s.up.push(!lastDown); });
  }
}
function upCards(P) { return P.cards.filter((c, k) => P.up[k]); }
function bestShowing(T) {
  let best = -1, bs = -1;
  T.seats.forEach((P, i) => { if (!canAct(T, i)) return; const sc = evalCards(upCards(P), false) * 64 + Math.max(...upCards(P).map(studLow)); if (sc > best) { best = sc; bs = i; } });
  if (bs < 0) bs = nextSeat(T, T.btn, j => canAct(T, j));
  return bs;
}
function runOut(T) {   // everyone is all in: deal the remaining streets
  const Vr = VARIANTS[T.v];
  while (T.street < Vr.streets.length - 1) { T.street++; if (Vr.draw && T.street >= 1) { T.seats.forEach(s => { if (!s.folded && !s.bot && !s.drawn) s.drawn = []; }); } dealStreet(T); }
  finish(T);
}
// draw (5-card draw): the seat to act discards the cards at these indexes and gets new ones
function draw(T, idxs) {
  if (T.phase !== 'draw') return false;
  const i = T.toAct, P = T.seats[i];
  const keep = P.cards.filter((c, k) => !idxs.includes(k)), n = P.cards.length - keep.length;
  for (let k = 0; k < n; k++) keep.push(T.deck.pop());
  P.cards = keep; P.drawn = idxs.slice();
  T.log.push({ st: T.street, s: i, a: 'draw', n });
  const k = T.drawOrder.indexOf(i);
  if (k < T.drawOrder.length - 1) { T.toAct = T.drawOrder[k + 1]; return true; }
  T.phase = 'drawn';
  const acting = T.seats.filter((s, j) => canAct(T, j)).length;
  if (acting < 2) {   // nobody left to bet: go straight on to the next draw (triple draw) or the showdown
    const Vr = VARIANTS[T.v];
    if (Vr.draw && T.street < (Vr.draws || 1)) { T.phase = 'bet'; nextStreet(T); return true; }
    T.toAct = -1; finish(T); return true;
  }
  T.phase = 'bet'; T.toAct = nextSeat(T, T.btn, j => canAct(T, j));
  return true;
}
// showdown / award: side pots from what each player put in
function finish(T) {
  const Vr = VARIANTS[T.v];
  returnUncalled(T);
  T.seats.forEach(s => { s.bet = 0; });
  const contenders = live(T);
  const levels = [...new Set(T.seats.map(s => s.total).filter(x => x > 0))].sort((a, b) => a - b);
  const pots = []; let prev = 0;
  for (const lv of levels) {
    let amt = 0; const elig = [];
    T.seats.forEach(s => { amt += Math.max(0, Math.min(s.total, lv) - prev); if (!s.folded && s.total >= lv) elig.push(s.i); });
    if (amt > 0) { if (pots.length && pots[pots.length - 1].elig.join() === elig.join()) pots[pots.length - 1].amt += amt; else pots.push({ amt, elig }); }
    prev = lv;
  }
  const showdown = contenders.length > 1;
  const scores = {};
  if (showdown) contenders.forEach(s => { scores[s.i] = scoreOf(T, s.i); s.shown = true; });
  const won = T.seats.map(() => 0);
  pots.forEach(p => {
    if (!p.elig.length) { p.elig = contenders.map(s => s.i); }
    let ws = p.elig;
    if (showdown) { const best = Math.max(...p.elig.map(i => scores[i])); ws = p.elig.filter(i => scores[i] === best); }
    const share = Math.floor(p.amt / ws.length); let rem = p.amt - share * ws.length;
    // odd chips: first winners left of the button
    const order = ws.slice().sort((a, b) => ((a - T.btn + T.seats.length - 1) % T.seats.length) - ((b - T.btn + T.seats.length - 1) % T.seats.length));
    order.forEach(i => { won[i] += share + (rem > 0 ? 1 : 0); rem--; });
    p.winners = ws;
  });
  won.forEach((w, i) => { T.seats[i].stack += w; });
  T.pots = pots; T.phase = 'done'; T.toAct = -1;
  T.result = { showdown, pots, won, scores, net: T.seats.map((s, i) => s.stack - T.startStacks[i]) };
  if (!Vr.stud) {} // the button moves at the next startHand
  else T.btn = (T.btn + 1) % T.seats.length;
  return T;
}
function clone(T) { return JSON.parse(JSON.stringify(T)); }

G.PK = { SUIT, RANK, V, vch, cardStr, parse, mulberry, shuffle, deckOf, evalCards, bestOmaha, bestFive, catOf, kick, KEY, CAT_N, CAT_S, VARIANTS, ORDER, register,
  lowScore, lowName, LOWMAX, newTable, startHand, legal, act, draw, finish, scoreOf, handInfo, potTotal, stBets, upCards, studLow, live, canAct, nextSeat, clone, betUnit, C };
})(typeof self !== 'undefined' ? self : this);
