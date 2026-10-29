/* ポーカー — equity, CPU players and the coach (poker/equity.js)
   No DOM. equity(): win / tie shares by Monte Carlo (or full enumeration when it is small);
   decide(): what a CPU does; coach(): what a good player would do here and why (shown to the player). */
(function (G) {
'use strict';
const P = G.PK;

/* ---------- 169 starting hands (hold'em) ---------- */
const VS = '23456789TJQKA';
function handKey(a, b) {   // 'AKs', 'T9o', '77'
  let x = P.V(a), y = P.V(b); if (y > x) { const t = x; x = y; y = t; }
  const k = VS[x - 2] + VS[y - 2];
  return x === y ? k : k + (P.SUIT(a) === P.SUIT(b) ? 's' : 'o');
}
const ALLKEYS = (() => { const o = []; for (let i = 12; i >= 0; i--) for (let j = 12; j >= 0; j--) { const a = VS[i], b = VS[j]; o.push(i === j ? a + b : i > j ? a + b + 's' : b + a + 'o'); } return o; })();   // 13×13 grid order (row = first card)
// preflop strength 0..1 (Chen-like, tuned): used to give opponents believable ranges and for the CPU before the flop
function chen(key) {
  const vv = c => VS.indexOf(c) + 2, x = vv(key[0]), y = vv(key[1]), suited = key[2] === 's', pair = x === y;
  const base = x === 14 ? 10 : x === 13 ? 8 : x === 12 ? 7 : x === 11 ? 6 : x / 2;
  let s = pair ? Math.max(5, base * 2) : base;
  if (suited) s += 2;
  const gap = x - y - 1;
  if (!pair) { s -= gap === 0 ? 0 : gap === 1 ? 1 : gap === 2 ? 2 : gap === 3 ? 4 : 5; if (gap <= 1 && x < 12) s += 1; }
  return Math.max(0, Math.min(1, (s + 1) / 21));
}
const CHEN = {}; ALLKEYS.forEach(k => { CHEN[k] = chen(k); });
// the share of hands at least this strong (range %, used for "top 20%" style ranges)
const RANK169 = ALLKEYS.slice().sort((a, b) => CHEN[b] - CHEN[a]);
const COMBOS = k => k.length === 2 ? 6 : k[2] === 's' ? 4 : 12;
const PCT = {}; { let acc = 0; RANK169.forEach(k => { acc += COMBOS(k); PCT[k] = acc / 1326; }); }

/* ---------- equity ---------- */
// spec: { v, hands: [[cards] | null …], board: [cards], dead: [cards], iters, ranges: [pct | null …] (top x% for unknown hold'em hands), drawn: bool }
function equity(spec) {
  const Vr = P.VARIANTS[spec.v], n = spec.hands.length, known = new Set([].concat(...spec.hands.filter(Boolean), spec.board || [], spec.dead || []));
  const deck0 = P.deckOf(Vr.short).filter(c => !known.has(c));
  const holeN = Vr.stud ? 7 : Vr.hole, boardN = Vr.board ? 5 : 0, board0 = spec.board || [];
  const win = new Array(n).fill(0), tie = new Array(n).fill(0);
  const iters = spec.iters || 2000, rng = spec.rng || Math.random;
  const needBoard = boardN - board0.length;
  // full enumeration: every hand known and at most 2 board cards to come
  const allKnown = spec.hands.every(h => h && h.length === holeN) && !Vr.stud && !Vr.draw;
  const score = (hands, board) => hands.map(h => Vr.omaha ? P.bestOmaha(h, board, Vr.short) : P.evalCards(h.concat(board), Vr.short));
  const tally = sc => { const best = Math.max(...sc); const w = []; sc.forEach((s, i) => { if (s === best) w.push(i); }); if (w.length === 1) win[w[0]]++; else w.forEach(i => { tie[i] += 1 / w.length; }); };
  let total = 0;
  if (allKnown && needBoard <= 2) {
    const d = deck0;
    if (needBoard === 0) { tally(score(spec.hands, board0)); total = 1; }
    else if (needBoard === 1) { for (const c of d) { tally(score(spec.hands, board0.concat([c]))); total++; } }
    else for (let a = 0; a < d.length; a++) for (let b = a + 1; b < d.length; b++) { tally(score(spec.hands, board0.concat([d[a], d[b]]))); total++; }
  } else {
    const deck = deck0.slice();
    for (let it = 0; it < iters; it++) {
      // shuffle just enough cards
      let top = deck.length;
      const take = () => { const j = Math.floor(rng() * top); top--; const t = deck[j]; deck[j] = deck[top]; deck[top] = t; return t; };
      const hands = spec.hands.map((h, i) => {
        const have = h ? h.slice() : [];
        if (!h && spec.ranges && spec.ranges[i] != null && !Vr.stud && !Vr.draw && Vr.hole === 2) {   // a hand from a top-x% range
          let a, b, tries = 0; const lim = spec.ranges[i];
          do { if (tries) { top += 2; } a = take(); b = take(); tries++; } while (tries < 30 && PCT[handKey(a, b)] > lim);
          return [a, b];
        }
        while (have.length < holeN) have.push(take());
        if (Vr.draw && spec.drawn === false) { const dis = drawPlan(have, Vr); dis.forEach(k => { have[k] = take(); }); }
        return have;
      });
      const board = board0.slice(); while (board.length < boardN) board.push(take());
      tally(score(hands, board)); total++;
    }
  }
  return { win: win.map(x => x / total), tie: tie.map(x => x / total), eq: win.map((x, i) => (x + tie[i]) / total), n: total };
}

/* ---------- 5-card draw: which cards to change ---------- */
function drawPlan(cards, Vr) {
  const cnt = {}; cards.forEach(c => { const v = P.V(c); cnt[v] = (cnt[v] || 0) + 1; });
  const multi = Object.keys(cnt).filter(v => cnt[v] >= 2).map(Number);
  const s = P.evalCards(cards, false), cat = P.catOf(s, false);
  if (['straight', 'flush', 'full', 'quads', 'sf'].includes(cat)) return [];
  if (multi.length) { const keepVals = new Set(multi); const out = []; cards.forEach((c, k) => { if (!keepVals.has(P.V(c))) out.push(k); }); if (cat === 'two') return out; if (cat === 'trips') return out; return out.filter((k, j) => true); }
  // four to a flush
  const bySuit = [0, 1, 2, 3].map(su => cards.map((c, k) => P.SUIT(c) === su ? k : -1).filter(k => k >= 0));
  const f = bySuit.find(x => x.length === 4); if (f) return [0, 1, 2, 3, 4].filter(k => !f.includes(k));
  // open-ended four to a straight
  const vals = cards.map(P.V);
  for (let t = 14; t >= 5; t--) { const need = [t, t - 1, t - 2, t - 3]; const ks = need.map(v => vals.indexOf(v)); if (ks.every(k => k >= 0) && t < 14 && t - 3 > 2) return [0, 1, 2, 3, 4].filter(k => !ks.includes(k)); }
  // keep an ace (and a high kicker) otherwise change all but the two highest
  const ord = [0, 1, 2, 3, 4].sort((a, b) => vals[b] - vals[a]);
  return vals[ord[0]] === 14 ? ord.slice(2) : ord.slice(2);
}

/* ---------- what the table looks like to one seat ---------- */
// opponents' cards are unknown (stud: up cards are known). Returns an equity spec from seat s's point of view.
function viewSpec(T, s, iters) {
  const Vr = P.VARIANTS[T.v], hands = [], ranges = [], dead = [];
  const opp = [];
  T.seats.forEach((Q, i) => {
    if (Q.folded) return;
    if (i === s) { hands.unshift(Q.cards.slice()); ranges.unshift(null); return; }
    opp.push(i);
    if (Vr.stud) hands.push(P.upCards(Q)); else hands.push(null);
    ranges.push(rangeOf(T, i));
  });
  return { v: T.v, hands: hands.map(h => h && h.length ? h : null), board: T.board.slice(), dead, iters, ranges, drawn: !(Vr.draw && T.street === 0), opp };
}
// a guess of a player's range from what they did this hand (hold'em-like games): top x%
function rangeOf(T, i) {
  const pre = T.log.filter(e => e.s === i && e.st === 0);
  const raised = pre.some(e => e.a === 'raise' || e.a === 'bet'), called = pre.some(e => e.a === 'call');
  const later = T.log.filter(e => e.s === i && e.st > 0 && (e.a === 'raise' || e.a === 'bet')).length;
  let r = raised ? 0.22 : called ? 0.42 : 0.7;
  r *= Math.pow(0.75, later);
  return Math.max(0.06, r);
}

/* ---------- CPU ---------- */
// styles: tag (tight-aggressive), lag (loose-aggressive), rock (tight-passive), station (loose-passive, calls a lot)
const STYLES = {
  tag: { loose: 0.0, aggr: 0.7, bluff: 0.10 },
  lag: { loose: 0.12, aggr: 0.85, bluff: 0.18 },
  rock: { loose: -0.08, aggr: 0.35, bluff: 0.03 },
  station: { loose: 0.18, aggr: 0.2, bluff: 0.04 },
};
// level: 1 easy … 4 expert — more simulations, less noise, better sizing
function decide(T, s, bot, rng) {
  rng = rng || Math.random;
  const L = P.legal(T); if (!L) return null;
  const Vr = P.VARIANTS[T.v], st = STYLES[bot.style] || STYLES.tag, lvl = bot.level || 2;
  const pot = P.potTotal(T), toCall = L.toCall, nOpp = P.live(T).length - 1;
  const noise = (lvl >= 4 ? 0.03 : lvl === 3 ? 0.06 : lvl === 2 ? 0.1 : 0.16) * (rng() * 2 - 1);
  let eq;
  const heads = Vr.hole === 2 && !Vr.stud && !Vr.draw;
  if (T.street === 0 && heads) {
    const k = handKey(T.seats[s].cards[0], T.seats[s].cards[1]);
    eq = preEq(k, nOpp);
  } else {
    const iters = Vr.omaha ? (lvl >= 3 ? 260 : 140) : (lvl >= 3 ? 700 : 350);
    eq = equity(Object.assign(viewSpec(T, s, iters), { rng })).eq[0];
  }
  eq = Math.max(0, Math.min(1, eq + noise + st.loose * 0.5));
  const need = toCall / (pot + toCall || 1);
  const fair = 1 / (nOpp + 1);   // break-even share against everyone
  const strong = eq > Math.max(0.5, fair * 1.9), good = eq > fair * 1.25;
  const sizeTo = frac => { const bet = Math.max(L.minTo, Math.min(L.maxTo, Math.round(T.curBet + (pot + toCall) * frac))); return bet; };
  const r = rng();
  // raise / bet for value
  if (L.canRaise && strong && r < st.aggr + (lvl >= 3 ? 0.1 : 0)) {
    const frac = eq > 0.8 ? 0.9 : eq > 0.65 ? 0.7 : 0.55;
    return { a: 'raise', to: sizeTo(frac * (0.85 + rng() * 0.3)) };
  }
  if (L.canRaise && good && toCall === 0 && r < st.aggr * 0.6) return { a: 'raise', to: sizeTo(0.5) };
  // bluff when checked to (more in position, fewer opponents)
  if (L.canRaise && toCall === 0 && nOpp <= 2 && r < st.bluff * (lvl >= 3 ? 1.2 : 1)) return { a: 'raise', to: sizeTo(0.6) };
  if (toCall === 0) return { a: 'check' };
  // call when the price is right
  const margin = lvl >= 3 ? 0.02 : 0.0;
  if (eq + st.loose * 0.3 >= need + margin) {
    if (L.call >= T.seats[s].stack && eq < 0.5 && eq < need + 0.08) return { a: 'fold' };
    return { a: 'call' };
  }
  return { a: 'fold' };
}
// 5-card draw: the CPU's discards
const botDraw = (T, s) => drawPlan(T.seats[s].cards, P.VARIANTS[T.v]);

/* ---------- preflop equity table (hold'em vs n random hands), computed once and cached ---------- */
let PRE = null;
function preEq(key, nOpp) {
  const T = G.PK_PRE; if (T && T[key]) return T[key][Math.max(1, Math.min(5, nOpp)) - 1] / 1000;
  if (!PRE) PRE = {};
  const id = key + nOpp;
  if (PRE[id] != null) return PRE[id];
  // estimate quickly from the Chen score (calibrated to Monte Carlo)
  const c = CHEN[key], base = 1 / (nOpp + 1);
  const v = Math.max(0.03, Math.min(0.92, base + (c - 0.42) * (nOpp === 1 ? 0.62 : 0.9 / Math.sqrt(nOpp))));
  PRE[id] = v; return v;
}

/* ---------- coach ---------- */
// what to do and why, for the seat to act: { eq, need, ev, rec: 'fold'|'check'|'call'|'raise', why:[keys], outs }
function coach(T, s, iters) {
  const L = P.legal(T); if (!L) return null;
  const Vr = P.VARIANTS[T.v];
  const spec = viewSpec(T, s, iters || (Vr.omaha ? 500 : 1500));
  const e = equity(spec), eq = e.eq[0];
  const pot = P.potTotal(T), toCall = L.toCall, need = toCall / (pot + toCall || 1), nOpp = spec.opp.length;
  const fair = 1 / (nOpp + 1);
  const evCall = eq * (pot + toCall) - toCall;
  let rec, why = [];
  if (toCall === 0) {
    if (eq > Math.max(0.55, fair * 1.7) && L.canRaise) { rec = 'raise'; why.push('valueBet'); }
    else { rec = 'check'; why.push(eq > fair ? 'checkPot' : 'checkWeak'); }
  } else if (eq > Math.max(0.6, fair * 2) && L.canRaise) { rec = 'raise'; why.push('valueRaise'); }
  else if (eq >= need) { rec = 'call'; why.push('odds'); }
  else { rec = 'fold'; why.push('noOdds'); }
  const outs = (!Vr.stud && !Vr.draw && T.board.length >= 3 && T.board.length < 5) ? countOuts(T, s) : null;
  return { eq, win: e.win[0], tie: e.tie[0], need, ev: evCall, pot, toCall, rec, why, outs, nOpp, fair };
}
// outs: cards that turn a hand that is behind a random hand's typical holding into a strong one (simplified: improve the category to two pair or better and beat the board)
function countOuts(T, s) {
  const Vr = P.VARIANTS[T.v], me = T.seats[s].cards, board = T.board;
  const used = new Set(me.concat(board)), cur = Vr.omaha ? P.bestOmaha(me, board, Vr.short) : P.evalCards(me.concat(board), Vr.short);
  const curCat = Math.floor(cur / 1048576), boardCat = board.length >= 5 ? 0 : Math.floor(P.evalCards(board, Vr.short) / 1048576);
  const list = [];
  for (const c of P.deckOf(Vr.short)) {
    if (used.has(c)) continue;
    const nb = board.concat([c]), sc = Vr.omaha ? P.bestOmaha(me, nb, Vr.short) : P.evalCards(me.concat(nb), Vr.short);
    const cat = Math.floor(sc / 1048576), bcat = Math.floor(P.evalCards(nb, Vr.short) / 1048576);
    if (cat > curCat && cat >= 2 && cat > bcat) list.push(c);
  }
  return list;
}

G.PKE = { equity, decide, coach, viewSpec, rangeOf, handKey, ALLKEYS, CHEN, PCT, RANK169, COMBOS, drawPlan, botDraw, STYLES, preEq, countOuts };
})(typeof self !== 'undefined' ? self : this);
