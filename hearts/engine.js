/* ハーツ — rules engine (hearts/engine.js). No DOM: used by the page, the worker, the AI (ai.js), the lessons and the tests.
   Cards: ids 0..51 = suit * 13 + (rank - 2). Suits 0 ♣, 1 ♦, 2 ♠, 3 ♥; ranks 2..14 (A = 14, high).
   Seats 0..3 clockwise round the table: 0 you (bottom), 1 left, 2 across (top), 3 right. Play goes clockwise: 0 → 1 → 2 → 3.
   Rules (claude/hearts-spec.md): American "Black Lady" Hearts as the standard, with the common variants as options:
     pass      'lrah' (left, right, across, hold), 'lra' (no hold), 'left', 'right', 'none'
     jd        the jack of diamonds is −10 (Omnibus Hearts)
     bm        Black Maria: the ace of spades 7, the king of spades 10 (and the queen 13)
     spot      Spot Hearts: hearts score their pips (2..10, J 11, Q 12, K 13, A 14), the queen of spades 25
     qBreaks   the queen of spades breaks hearts
     firstPts  points may be played on the first trick (off: no hearts / no Q♠ on the first trick unless the hand has nothing else)
     anyLead   hearts may be led at any time (no "breaking")
     moon      'add' (everyone else +all points), 'sub' (the shooter −all points), 'best' (the one that is better for the shooter)
     target    the game ends when someone reaches this (50 / 100 / 150 / 500 …); lowest wins; a tie for lowest plays on */
(function (root) {
'use strict';
const C = 0, D = 1, SP = 2, H = 3;
const suit = c => (c / 13) | 0, rank = c => c % 13 + 2, card = (s, r) => s * 13 + r - 2;
const QS = card(SP, 12), KS = card(SP, 13), AS = card(SP, 14), JD = card(D, 11), C2 = card(C, 2);
const SUITS = ['C', 'D', 'S', 'H'], SYM = ['♣', '♦', '♠', '♥'];
const RKN = r => r === 14 ? 'A' : r === 13 ? 'K' : r === 12 ? 'Q' : r === 11 ? 'J' : String(r);
const name = c => RKN(rank(c)) + SYM[suit(c)];
const VARIANTS = {
  std:   { pass: 'lrah', jd: 0, bm: 0, spot: 0, qBreaks: 0, firstPts: 0, anyLead: 0, moon: 'add', target: 100 },
  omni:  { pass: 'lrah', jd: 1, bm: 0, spot: 0, qBreaks: 0, firstPts: 0, anyLead: 0, moon: 'add', target: 100 },
  maria: { pass: 'right', jd: 0, bm: 1, spot: 0, qBreaks: 0, firstPts: 0, anyLead: 1, moon: 'add', target: 100 },
  spot:  { pass: 'lrah', jd: 0, bm: 0, spot: 1, qBreaks: 0, firstPts: 0, anyLead: 0, moon: 'add', target: 500 },
};
function rules(o) { o = o || {}; const base = VARIANTS[o.v] || VARIANTS.std; const r = Object.assign({}, base, o); r.v = VARIANTS[o.v] ? o.v : 'std'; return r; }
// penalty points of one card (negative = a bonus)
function pts(c, R) {
  const s = suit(c), r = rank(c);
  if (s === H) return R.spot ? r : 1;
  if (c === QS) return R.spot ? 25 : 13;
  if (R.bm && c === KS) return 10;
  if (R.bm && c === AS) return 7;
  if (R.jd && c === JD) return -10;
  return 0;
}
const isPen = (c, R) => pts(c, R) > 0;               // a card that costs points ("penalty card")
function totalPen(R) { let n = 0; for (let c = 0; c < 52; c++) { const p = pts(c, R); if (p > 0) n += p; } return n; }
// the pass direction of hand n (1-based): +1 left, +3 right, +2 across, 0 hold
function passDir(R, n) {
  const k = (n - 1);
  if (R.pass === 'none') return 0;
  if (R.pass === 'left') return 1;
  if (R.pass === 'right') return 3;
  if (R.pass === 'lra') return [1, 3, 2][k % 3];
  return [1, 3, 2, 0][k % 4];
}
const sortHand = h => h.slice().sort((a, b) => { const sa = [2, 3, 0, 1], x = sa.indexOf(suit(a)) , y = sa.indexOf(suit(b)); return x - y || rank(a) - rank(b); });
// display order: ♣ ♦ ♠ ♥ (alternating colours), low → high
const sortDisp = h => h.slice().sort((a, b) => suit(a) - suit(b) || rank(a) - rank(b));

/* ---------------- a game (several hands) ---------------- */
function newGame(o) { const R = rules(o); return { R, scores: [0, 0, 0, 0], hand: 0, hist: [], over: false, winner: -1 }; }
function shuffled(rng) { const d = []; for (let i = 0; i < 52; i++) d.push(i); for (let i = 51; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const x = d[i]; d[i] = d[j]; d[j] = x; } return d; }
function deal(G, rng, deck) {
  G.hand++;
  const d = deck || shuffled(rng || Math.random), hands = [[], [], [], []];
  for (let i = 0; i < 52; i++) hands[i % 4].push(d[i]);
  return newHand(G.R, hands.map(sortDisp), passDir(G.R, G.hand), G.hand);
}
function newHand(R, hands, dir, no) {
  const S = { R, no: no || 1, hands: hands.map(h => h.slice()), dir: dir || 0, phase: dir ? 'pass' : 'play', pass: [null, null, null, null], got: [null, null, null, null],
    turn: -1, leader: -1, trick: [], tn: 0, broken: false, taken: [[], [], [], []], tricks: [], log: [], void: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], start: hands.map(h => h.slice()) };
  if (!dir) startPlay(S);
  return S;
}
function startPlay(S) {
  S.phase = 'play';
  for (let s = 0; s < 4; s++) S.hands[s] = sortDisp(S.hands[s]);
  S.dealt = S.hands.map(h => h.slice());
  // Black Maria (books): the player left of the dealer leads anything. Here every variant starts with the 2♣ (simpler, and the usual online rule).
  const s2 = S.hands.findIndex(h => h.includes(C2));
  S.leader = S.turn = s2;
}
// everyone's three cards are chosen: exchange them
function doPass(S) {
  for (let s = 0; s < 4; s++) if (!S.pass[s] || S.pass[s].length !== 3) throw new Error('pass not ready');
  for (let s = 0; s < 4; s++) S.hands[s] = S.hands[s].filter(c => !S.pass[s].includes(c));
  for (let s = 0; s < 4; s++) { const to = (s + S.dir) % 4; S.hands[to] = S.hands[to].concat(S.pass[s]); S.got[to] = S.pass[s].slice(); }
  startPlay(S);
}
/* ---------------- legal cards ---------------- */
function onlyPen(hand, R) { return hand.every(c => isPen(c, R)); }
function legal(S, seat) {
  const h = S.hands[seat], R = S.R;
  if (S.phase !== 'play' || seat !== S.turn) return [];
  if (S.tn === 0 && !S.trick.length) return h.includes(C2) ? [C2] : h.slice();
  if (!S.trick.length) {   // leading
    if (R.anyLead || S.broken) return h.slice();
    const nh = h.filter(c => suit(c) !== H);
    return nh.length ? nh : h.slice();
  }
  const ls = suit(S.trick[0].c), fol = h.filter(c => suit(c) === ls);
  if (fol.length) return fol;
  if (S.tn === 0 && !R.firstPts) {   // no points on the first trick, unless there is nothing else
    const np = h.filter(c => !isPen(c, R));
    if (np.length) return np;
    const nh = h.filter(c => suit(c) !== H);   // only penalty cards: the queen (etc.) before hearts
    return nh.length ? nh : h.slice();
  }
  return h.slice();
}
// who wins the trick so far
function winner(trick) { const ls = suit(trick[0].c); let w = trick[0]; for (const p of trick) if (suit(p.c) === ls && rank(p.c) > rank(w.c)) w = p; return w.s; }
// play a card. Returns { trick: { win, cards, pts } | null, end: bool }
function play(S, seat, c) {
  if (S.phase !== 'play' || seat !== S.turn) throw new Error('not your turn');
  const L = legal(S, seat); if (!L.includes(c)) throw new Error('illegal ' + name(c));
  S.hands[seat] = S.hands[seat].filter(x => x !== c);
  if (S.trick.length && suit(c) !== suit(S.trick[0].c)) S.void[seat][suit(S.trick[0].c)] = 1;
  S.trick.push({ s: seat, c });
  S.log.push({ tr: S.tn, s: seat, c });
  if (suit(c) === H || (S.R.qBreaks && c === QS)) S.broken = true;
  const ev = { trick: null, end: false };
  if (S.trick.length < 4) { S.turn = (seat + 1) % 4; return ev; }
  const w = winner(S.trick), cards = S.trick.map(p => p.c);
  S.taken[w].push(...cards);
  S.tricks.push({ lead: S.trick[0].s, cards: S.trick.slice(), win: w });
  ev.trick = { win: w, cards, pts: cards.reduce((a, x) => a + pts(x, S.R), 0) };
  S.trick = []; S.tn++; S.leader = S.turn = w;
  if (S.tn === 13) { S.phase = 'end'; ev.end = true; }
  return ev;
}
/* ---------------- scoring ---------------- */
function rawPts(S, s) { return S.taken[s].reduce((a, c) => a + pts(c, S.R), 0); }
function moonOf(S) {   // the seat that took every penalty card, or −1
  const R = S.R;
  for (let s = 0; s < 4; s++) { let all = true; for (let c = 0; c < 52; c++) if (isPen(c, R) && !S.taken[s].includes(c)) { all = false; break; } if (all) return s; }
  return -1;
}
// hand scores (the change to each player's total). scores = the totals before this hand (for moon: 'best')
function handScore(S, scores) {
  const R = S.R, raw = [0, 1, 2, 3].map(s => rawPts(S, s)), m = moonOf(S), tot = totalPen(R);
  const delta = raw.slice(); let how = '';
  if (m >= 0) {
    let mode = R.moon;
    if (mode === 'best') {   // add to the others, unless subtracting is better for the shooter's place (or adding would end the game with the shooter not alone at the bottom)
      const sc = scores || [0, 0, 0, 0];
      const addSc = sc.map((x, i) => x + raw[i] + (i === m ? -tot : tot)), subSc = sc.map((x, i) => x + raw[i] - (i === m ? 2 * tot : 0));
      const below = arr => arr.filter((x, i) => i !== m && x <= arr[m]).length;
      const endA = Math.max(...addSc) >= R.target;
      mode = (endA && below(addSc) > 0) || below(subSc) < below(addSc) ? 'sub' : 'add';
    }
    for (let s = 0; s < 4; s++) delta[s] = raw[s] + (s === m ? (mode === 'sub' ? -2 * tot : -tot) : (mode === 'add' ? tot : 0));
    how = mode;
  }
  return { raw, delta, moon: m, how };
}
// apply a finished hand to the game; returns the hand result
function finishHand(G, S) {
  const r = handScore(S, G.scores);
  for (let s = 0; s < 4; s++) G.scores[s] += r.delta[s];
  G.hist.push({ no: S.no, dir: S.dir, raw: r.raw, delta: r.delta, moon: r.moon, how: r.how, scores: G.scores.slice() });
  if (Math.max(...G.scores) >= G.R.target) {
    const lo = Math.min(...G.scores), w = G.scores.filter(x => x === lo);
    if (w.length === 1) { G.over = true; G.winner = G.scores.indexOf(lo); }
  }
  return r;
}
// final places (1st = lowest). Ties share the better place.
function places(scores) { return scores.map(x => scores.filter(y => y < x).length); }

/* ---------------- helpers for the AI and the coach ---------------- */
function clone(S) {
  return { R: S.R, no: S.no, hands: S.hands.map(h => h.slice()), dir: S.dir, phase: S.phase, pass: S.pass.map(p => p && p.slice()), got: S.got.map(p => p && p.slice()), turn: S.turn, leader: S.leader,
    trick: S.trick.map(p => ({ s: p.s, c: p.c })), tn: S.tn, broken: S.broken, taken: S.taken.map(h => h.slice()), tricks: S.tricks, log: S.log, void: S.void.map(v => v.slice()), start: S.start, dealt: S.dealt };
}
// a light copy for search: no log / history arrays kept growing
function fastClone(S) {
  return { R: S.R, hands: S.hands.map(h => h.slice()), phase: S.phase, turn: S.turn, leader: S.leader, trick: S.trick.slice(), tn: S.tn, broken: S.broken,
    pts: S.pts ? S.pts.slice() : [0, 1, 2, 3].map(s => rawPts(S, s)), npen: S.npen ? S.npen.slice() : [0, 1, 2, 3].map(s => S.taken[s].filter(c => isPen(c, S.R)).length), fast: 1, void: S.void.map(v => v.slice()), tricksWon: S.tricksWon ? S.tricksWon.slice() : [0, 1, 2, 3].map(s => S.tricks ? S.tricks.filter(t => t.win === s).length : 0) };
}
// play on a fast state (no logs). Keeps pts / npen per seat.
function fplay(F, seat, c) {
  const h = F.hands[seat], i = h.indexOf(c); h.splice(i, 1);
  if (F.trick.length && suit(c) !== suit(F.trick[0].c)) F.void[seat][suit(F.trick[0].c)] = 1;
  F.trick.push({ s: seat, c });
  if (suit(c) === H || (F.R.qBreaks && c === QS)) F.broken = true;
  if (F.trick.length < 4) { F.turn = (seat + 1) % 4; return -1; }
  const w = winner(F.trick);
  for (const p of F.trick) { const q = pts(p.c, F.R); if (q) { F.pts[w] += q; if (q > 0) F.npen[w]++; } }
  F.tricksWon[w]++;
  F.trick = []; F.tn++; F.leader = F.turn = w;
  if (F.tn === 13) F.phase = 'end';
  return w;
}
// the hand score from a fast state at the end
function fscore(F) {
  const R = F.R, tot = totalPen(R), nPen = npenTotal(R), m = F.npen.findIndex(n => n === nPen);
  if (m < 0) return F.pts.slice();
  const bonus = F.pts[m] - tot, out = F.pts.slice();
  if (R.moon === 'sub') { out[m] = bonus - tot; } else { out[m] = bonus; for (let s = 0; s < 4; s++) if (s !== m) out[s] += tot; }
  return out;
}
const NPEN = {};
function npenTotal(R) { const k = (R.bm ? 'b' : '') + (R.spot ? 's' : ''); if (NPEN[k] == null) { let n = 0; for (let c = 0; c < 52; c++) if (isPen(c, R)) n++; NPEN[k] = n; } return NPEN[k]; }

const HT = { C, D, SP, H, QS, KS, AS, JD, C2, SUITS, SYM, VARIANTS, suit, rank, card, name, RKN, rules, pts, isPen, totalPen, npenTotal, passDir, sortHand, sortDisp,
  newGame, deal, newHand, startPlay, doPass, legal, winner, play, rawPts, moonOf, handScore, finishHand, places, clone, fastClone, fplay, fscore, shuffled };
if (typeof module !== 'undefined' && module.exports) module.exports = HT; else root.HT = HT;
})(typeof self !== 'undefined' ? self : this);
