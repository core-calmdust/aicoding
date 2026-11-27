/* ハーツ — computer players, coach analysis and research numbers (hearts/ai.js). No DOM (page, worker, node tools).
   - heur(): a fast rule-based player (ducking, dumping the queen, smoking her out, voiding, stopping a moon). Low levels and the rollouts.
   - Information-set sampling (PIMC): deal the unseen cards to the others again and again, consistent with what this seat knows
     (its own hand, the cards played, who showed out of a suit, the three cards it passed), play each candidate card in every
     sampled deal and finish the hand with the fast players; the last three tricks are solved exactly (double dummy, max-n).
   - The same numbers drive the coach: expected points of every legal card, the chance that someone shoots the moon.
   - Passing: a rule-based score of every card; strong levels compare the best few passes by sampling whole hands.
   Levels 1..20 (claude/hearts-spec.md: LEVELS). */
(function (root) {
'use strict';
const HT = root.HT || (typeof require !== 'undefined' ? require('./engine.js') : null);
const { suit, rank, card, pts, isPen, QS, KS, AS, JD, C2 } = HT;
const H = 3, SP = 2, D = 1;

/* ---------------- random ---------------- */
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------------- what a seat can see ---------------- */
// out[c] = 1 when c has been played (including the current trick)
function outOf(S) { const o = new Uint8Array(52); for (const e of S.log) o[e.c] = 1; return o; }
// the unseen cards of one suit, from the point of view of seat p (not in p's hand, not played)
function unseenSuit(F, p, s) { const a = []; for (let r = 2; r <= 14; r++) { const c = card(s, r); if (!F.out[c] && !F.hands[p].includes(c)) a.push(c); } return a; }

/* ---------------- the fast player ---------------- */
// moon danger: one player holds every penalty card taken so far, with enough of them
function moonThreat(F) {
  let m = -1;
  for (let s = 0; s < 4; s++) if (F.npen[s] > 0) { if (m >= 0) return -1; m = s; }
  if (m < 0) return -1;
  const lim = F.R.spot ? 40 : F.R.bm ? 14 : 8;
  return F.pts[m] >= lim || (F.tn >= 7 && F.npen[m] >= 4) ? m : -1;
}
const hiFirst = (a, b) => rank(b) - rank(a);
function heur(F, p, L) {
  if (L.length === 1) return L[0];
  if (F.mode && F.mode[p] === 'moon') return shootPlay(F, p, L);
  const R = F.R, tr = F.trick, pos = tr.length, hand = F.hands[p];
  const qsUnseen = !F.out[QS] && !hand.includes(QS);
  const mt = moonThreat(F);
  if (pos === 0) return lead(F, p, L, qsUnseen);
  const ls = suit(tr[0].c);
  let w = tr[0]; for (const x of tr) if (suit(x.c) === ls && rank(x.c) > rank(w.c)) w = x;
  let tpts = 0; for (const x of tr) tpts += pts(x.c, R);
  const follow = suit(L[0]) === ls && L.every(c => suit(c) === ls);
  if (follow) {
    const below = L.filter(c => rank(c) < rank(w.c)).sort(hiFirst), above = L.filter(c => rank(c) > rank(w.c)).sort(hiFirst);
    // stop a moon: take a trick with points away from the shooter
    if (mt >= 0 && mt !== p && w.s === mt && above.length && (tpts > 0 || ls === H)) return above.filter(c => c !== QS)[0] || above[0];
    if (R.jd && L.includes(JD) && rank(w.c) < 11 && tpts <= 0 && (pos === 3 || !unseenSuit(F, p, D).some(c => rank(c) > 11))) return JD;
    if (pos === 3) {
      if (tpts > 0) { if (below.length) return below[0]; const nq = above.filter(c => c !== QS && !(R.bm && (c === KS || c === AS))); return nq.length ? nq[nq.length - 1] : above[above.length - 1]; }
      // a clean trick: win it with the highest card we would rather not keep (not the queen)
      const safe = L.filter(c => c !== QS && !(R.jd && c === JD && false)).sort(hiFirst);
      if (above.length && safe.length && rank(safe[0]) > rank(w.c)) return safe[0];
      return below.length ? below[0] : L.slice().sort(hiFirst)[0];
    }
    if (ls === SP && hand.includes(QS) && rank(w.c) > 12) return QS;
    if (F.tn === 0) { const nq = L.filter(c => c !== QS).sort(hiFirst); if (nq.length) return nq[0]; }   // the first trick is clean
    if (below.length) { const b = below.filter(c => c !== QS); return b.length ? b[0] : below[0]; }
    const ab = above.slice().reverse();   // low → high
    const nq = ab.filter(c => c !== QS && !(qsUnseen && (c === KS || c === AS) && ls === SP));
    // the second-to-last can win cheaply with the top card when the trick is clean and nobody behind is out of the suit
    if (pos === 2 && tpts <= 0 && ls !== H && !(ls === SP && qsUnseen) && !F.void[(p + 1) % 4][ls]) { const hi = above.filter(c => c !== QS); if (hi.length) return hi[0]; }
    return nq[0] || ab[0];
  }
  // out of the suit: discard
  if (mt >= 0 && w.s === mt) {   // never feed the shooter: throw a card worth nothing
    const z = L.filter(c => pts(c, R) <= 0).sort(hiFirst); if (z.length) return z[0];
  }
  if (L.includes(QS)) return QS;
  if (R.bm) { if (L.includes(AS)) return AS; if (L.includes(KS)) return KS; }
  if (qsUnseen) { const big = L.filter(c => c === AS || c === KS); if (big.length) return big[0]; }
  const hearts = L.filter(c => suit(c) === H).sort(hiFirst);
  // the highest card of the shortest side suit (to make a void) or the highest heart
  const cnt = [0, 0, 0, 0]; for (const c of hand) cnt[suit(c)]++;
  let best = null, bs = -1e9;
  for (const c of L) {
    if (R.jd && c === JD) continue;
    let sc = rank(c) * 1.0 + (suit(c) === H ? 6 + pts(c, R) : 0) - cnt[suit(c)] * .6 + (suit(c) === SP && !qsUnseen ? -3 : 0);
    if (suit(c) === SP && hand.includes(QS) && rank(c) < 12) sc -= 8;   // keep the spades that guard the queen
    if (sc > bs) { bs = sc; best = c; }
  }
  return best != null ? best : (hearts[0] || L.slice().sort(hiFirst)[0]);
}
function lead(F, p, L, qsUnseen) {
  const R = F.R, hand = F.hands[p];
  let best = L[0], bs = 1e9;
  const others = [1, 2, 3].map(k => (p + k) % 4);
  for (const c of L) {
    const s = suit(c), r = rank(c), un = unseenSuit(F, p, s);
    const hi = un.filter(x => rank(x) > r).length, n = un.length;
    let voidN = 0; for (const o of others) if (F.void[o][s]) voidN++;
    const pWin = n === 0 ? 1 : hi === 0 ? 1 : Math.pow(1 - hi / n, Math.min(3, Math.max(1, 3 - voidN)));
    let cost = 0;
    if (s === H) cost += R.spot ? Math.min(3, n) * 7 : Math.min(3, n);
    if (s === SP && qsUnseen && r > 12) cost += (R.spot ? 25 : 13) * .8;
    if (c === QS) cost += (R.spot ? 25 : 13);
    if (R.bm && s === SP && (c === AS || c === KS)) cost += pts(c, R);
    cost += (n === 0 ? 3 : voidN) * (F.broken || R.anyLead ? 2.5 : 1.2) * (R.spot ? 4 : 1);
    if (R.jd && c === JD) cost += 6;   // a lead of the jack rarely holds
    let sc = pWin * (cost + .6) + r * .015;
    if (s === SP && qsUnseen && r < 12 && !hand.includes(KS) && !hand.includes(AS)) sc -= .7;   // smoke the queen out
    if (s === SP && hand.includes(QS) && c !== QS) sc += .4;                                     // keep the queen guarded
    const myN = hand.filter(x => suit(x) === s).length;
    if (myN <= 2 && s !== H && s !== SP) sc -= .25;                                               // run a short suit out
    if (sc < bs) { bs = sc; best = c; }
  }
  return best;
}
// the shooter: take every trick that matters
function shootPlay(F, p, L) {
  const tr = F.trick, hand = F.hands[p];
  if (!tr.length) {
    let best = null, bs = -1e9;
    for (const c of L) { const un = unseenSuit(F, p, suit(c)), hi = un.filter(x => rank(x) > rank(c)).length; const myN = hand.filter(x => suit(x) === suit(c)).length; const sc = (hi === 0 ? 50 : -hi * 5) + rank(c) + myN * 1.5 + (suit(c) === H && F.broken ? 3 : 0); if (sc > bs) { bs = sc; best = c; } }
    return best;
  }
  const ls = suit(tr[0].c);
  let w = tr[0]; for (const x of tr) if (suit(x.c) === ls && rank(x.c) > rank(w.c)) w = x;
  if (suit(L[0]) === ls) { const ab = L.filter(c => rank(c) > rank(w.c)).sort(hiFirst); return ab.length ? ab[0] : L.slice().sort((a, b) => rank(a) - rank(b))[0]; }
  const z = L.filter(c => !isPen(c, F.R)).sort((a, b) => rank(a) - rank(b)); return z[0] || L[0];
}

/* ---------------- fast states ---------------- */
function legalF(F, p) {
  const h = F.hands[p], R = F.R;
  if (F.tn === 0 && !F.trick.length) return h.includes(C2) ? [C2] : h.slice();
  if (!F.trick.length) { if (R.anyLead || F.broken) return h.slice(); const nh = h.filter(c => suit(c) !== H); return nh.length ? nh : h.slice(); }
  const ls = suit(F.trick[0].c), fol = h.filter(c => suit(c) === ls);
  if (fol.length) return fol;
  if (F.tn === 0 && !R.firstPts) { const np = h.filter(c => !isPen(c, R)); if (np.length) return np; const nh = h.filter(c => suit(c) !== H); return nh.length ? nh : h.slice(); }
  return h.slice();
}
function fplay(F, p, c) { F.out[c] = 1; return HT.fplay(F, p, c); }
function toFast(S, hands) {
  const F = HT.fastClone(S); if (hands) F.hands = hands.map(h => h.slice());
  F.out = outOf(S); F.mode = S.mode ? S.mode.slice() : null;
  return F;
}
function copyF(F) { return { R: F.R, hands: F.hands.map(h => h.slice()), phase: F.phase, turn: F.turn, leader: F.leader, trick: F.trick.slice(), tn: F.tn, broken: F.broken, pts: F.pts.slice(), npen: F.npen.slice(), void: F.void.map(v => v.slice()), tricksWon: F.tricksWon.slice(), out: F.out.slice(), mode: F.mode ? F.mode.slice() : null, fast: 1 }; }
function rollout(F, noise, rng) {
  while (F.phase === 'play') {
    const p = F.turn, L = legalF(F, p);
    const c = noise && rng() < noise ? L[Math.floor(rng() * L.length)] : heur(F, p, L);
    fplay(F, p, c);
  }
  return HT.fscore(F);
}
// the value a seat wants to make small: its own points minus the average of the others (so a moon counts right)
const objOf = (v, p) => v[p] - (v[0] + v[1] + v[2] + v[3] - v[p]) / 3;

/* exact search of the last tricks (double dummy, max-n: every player lowers its own value) */
function solve(F, nodes) {
  if (F.phase !== 'play') return HT.fscore(F);
  const p = F.turn, L = legalF(F, p);
  let best = null, bo = 1e9;
  for (const c of L) {
    const G = copyF(F); fplay(G, p, c); nodes.n++;
    const v = solve(G, nodes), o = objOf(v, p) + v[p] * 1e-3;
    if (o < bo) { bo = o; best = v; }
  }
  return best;
}

/* ---------------- sampling the unseen cards ---------------- */
// the view of seat p: the cards it knows the place of (passed ones), the hand sizes, the voids
function view(S, p) {
  const out = outOf(S), known = [[], [], [], []];
  if (S.dir && S.pass[p] && S.phase !== 'pass') { const to = (p + S.dir) % 4; for (const c of S.pass[p]) if (!out[c]) known[to].push(c); }
  const sizes = S.hands.map(h => h.length);
  return { out, known, sizes, void: S.void.map(v => v.slice()) };
}
function sample(S, p, V, rng) {
  const mine = new Set(S.hands[p]), kn = new Set([].concat(...V.known)), un = [];
  for (let c = 0; c < 52; c++) if (!V.out[c] && !mine.has(c) && !kn.has(c)) un.push(c);
  for (let tries = 0; tries < 30; tries++) {
    const hands = [0, 1, 2, 3].map(s => s === p ? S.hands[p].slice() : V.known[s].slice());
    const need = [0, 1, 2, 3].map(s => s === p ? 0 : V.sizes[s] - hands[s].length);
    const deck = un.slice(); for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const x = deck[i]; deck[i] = deck[j]; deck[j] = x; }
    const elig = c => [0, 1, 2, 3].filter(s => s !== p && need[s] > 0 && (tries > 24 || !V.void[s][suit(c)]));
    deck.sort((a, b) => elig(a).length - elig(b).length);
    let ok = true;
    for (const c of deck) {
      const e = elig(c); if (!e.length) { ok = false; break; }
      let tot = 0; for (const s of e) tot += need[s]; let x = rng() * tot, pick = e[e.length - 1];
      for (const s of e) { x -= need[s]; if (x < 0) { pick = s; break; } }
      hands[pick].push(c); need[pick]--;
    }
    if (ok) return hands;
  }
  return null;
}

/* ---------------- evaluating the legal cards ---------------- */
// o: { worlds, ms (time budget), noise, exact (solve the last tricks), moon (also try shooting), rng }
function evalCards(S, p, o) {
  o = o || {};
  const rng = o.rng || Math.random, L = HT.legal(S, p);
  const res = L.map(c => ({ c, n: 0, own: 0, obj: 0, moonMe: 0, moonOther: 0, sq: 0 }));
  if (!L.length) return res;
  const V = view(S, p), t0 = Date.now(), W = o.worlds || 40, budget = o.ms || 1e9;
  const tryMoon = o.moon && canShoot(S, p);
  const left = 13 - S.tn;
  let w = 0;
  for (; w < W; w++) {
    if (w >= 6 && Date.now() - t0 > budget) break;
    const hands = sample(S, p, V, rng); if (!hands) break;
    const base = toFast(S, hands);
    for (const r of res) {
      let best = null;
      const modes = tryMoon ? ['', 'moon'] : [''];
      for (const md of modes) {
        const F = copyF(base); if (md) { F.mode = F.mode || ['', '', '', '']; F.mode[p] = 'moon'; }
        fplay(F, p, r.c);
        let v;
        if (o.exact && left <= 3) { v = solve(F, { n: 0 }); }
        else v = rollout(F, o.noise || 0, rng);
        if (!best || objOf(v, p) < objOf(best, p)) best = v;
      }
      const v = best, ob = objOf(v, p);
      r.n++; r.own += v[p]; r.obj += ob; r.sq += ob * ob;
      const m = moonSeat(v, S.R);
      if (m === p) r.moonMe++; else if (m >= 0) r.moonOther++;
    }
  }
  for (const r of res) if (r.n) { r.own /= r.n; r.obj /= r.n; r.moonMe /= r.n; r.moonOther /= r.n; r.sd = Math.sqrt(Math.max(0, r.sq / r.n - r.obj * r.obj)); }
  res.worlds = w;
  return res;
}
// who shot the moon in a hand result (−1 none)
function moonSeat(v, R) {
  const tot = HT.totalPen(R);
  if (R.moon === 'sub') { const i = v.findIndex(x => x <= -tot + 10); return i; }
  const big = v.map((x, i) => x >= tot - 10 ? i : -1).filter(i => i >= 0);
  return big.length === 3 ? [0, 1, 2, 3].find(i => !big.includes(i)) : -1;
}
// could this seat still take every penalty card? (nobody else has taken one)
function canShoot(S, p) { for (let s = 0; s < 4; s++) if (s !== p && S.taken[s].some(c => isPen(c, S.R))) return false; return true; }

/* ---------------- levels ---------------- */
// rnd: chance of a random legal card; worlds: samples per card (0 = the fast player only); exact: solve the last 3 tricks; moon: consider shooting
const LEVELS = [null,
  { rnd: .55, prnd: 1 }, { rnd: .46, prnd: .8 }, { rnd: .38, prnd: .62 }, { rnd: .3, prnd: .46 }, { rnd: .23, prnd: .32 },
  { rnd: .16, prnd: .2 }, { rnd: .1, prnd: .1 }, { rnd: .05, prnd: .04 }, { rnd: 0, pass: 'heur' }, { worlds: 10, mix: .5, pass: 'heur', exact: 1 },
  { worlds: 16, mix: .3, pass: 'heur', exact: 1 }, { worlds: 24, mix: .15, pass: 'heur', exact: 1, moon: 1 }, { worlds: 32, mix: .1, pass: 'heur', exact: 1, moon: 1 }, { worlds: 44, mix: .06, pass: 'sim', pw: 12, exact: 1, moon: 1 }, { worlds: 60, mix: .03, pass: 'sim', pw: 20, exact: 1, moon: 1 },
  { worlds: 80, mix: .02, pass: 'sim', pw: 28, exact: 1, moon: 1 }, { worlds: 110, mix: 0, pass: 'sim', pw: 36, exact: 1, moon: 1 }, { worlds: 150, mix: 0, pass: 'sim', pw: 48, exact: 1, moon: 1 }, { worlds: 200, mix: 0, pass: 'sim', pw: 64, exact: 1, moon: 1, ms: 2200 }, { worlds: 260, mix: 0, pass: 'sim', pw: 80, exact: 1, moon: 1, ms: 2600 },
];
function fastPick(S, p, rng) { const F = toFast(S); return heur(F, p, legalF(F, p)); }
function decide(S, p, lv, rng) {
  rng = rng || Math.random;
  const P = LEVELS[Math.max(1, Math.min(20, lv | 0))], L = HT.legal(S, p);
  if (L.length === 1) return L[0];
  if (P.rnd && rng() < P.rnd) return L[Math.floor(rng() * L.length)];
  const hc = fastPick(S, p, rng);
  if (!P.worlds) return hc;
  const r = evalCards(S, p, { worlds: P.worlds, exact: P.exact, moon: P.moon, rng, ms: P.ms || 1800 });
  // a small pull toward the fast player's card at the middle levels (the few samples are noisy)
  const pull = (P.mix || 0) * 6;
  let best = r[0]; for (const x of r) { const a = x.obj - (x.c === hc ? pull : 0), b = best.obj - (best.c === hc ? pull : 0); if (a < b) best = x; }
  return best.c;
}

/* ---------------- passing ---------------- */
// how much a card wants to go (higher = pass it). hand: 13 cards
function passScores(hand, R, dir) {
  const n = [0, 0, 0, 0]; for (const c of hand) n[suit(c)]++;
  const has = c => hand.includes(c);
  const lowSp = hand.filter(c => suit(c) === SP && rank(c) < 12).length;
  const out = new Map();
  for (const c of hand) {
    const s = suit(c), r = rank(c);
    let v = (r - 2) * 1.0;
    if (c === QS) v = lowSp >= 4 ? 2 : lowSp >= 3 ? 9 : 30;
    else if (c === AS || c === KS) v = has(QS) ? (lowSp >= 4 ? 4 : 22) : lowSp >= 3 ? 7 : 20;
    else if (s === SP) v = r < 12 ? -6 + (r - 2) * .3 : v;                     // low spades guard the queen
    else if (s === H) v = r >= 11 ? 10 + (r - 11) * 2 : r >= 8 ? 4 : -3;       // high hearts go, low hearts stay
    else { // clubs / diamonds: high cards, and short suits (to make a void)
      v = (r - 2) * .9 + (n[s] <= 3 ? 7 - n[s] * 1.5 : 0) - (r <= 5 ? 3 : 0);
      if (c === C2) v -= 4;
    }
    if (R.jd && c === JD) v -= 14;                        // keep the −10 jack…
    if (R.jd && s === D && r > 11 && has(JD)) v -= 4;     // …and the diamonds above it that win it
    if (R.bm && (c === AS || c === KS)) v += 6;
    if (R.spot && s === H) v += r >= 10 ? 6 : 0;
    if (dir === 3 && s === SP && r > 12 && !has(QS)) v += 2;   // spades to the right (the right-hand player plays before you)
    out.set(c, v);
  }
  return out;
}
function heurPass(hand, R, dir) {
  const h = hand.slice(), picks = [];
  for (let k = 0; k < 3; k++) {
    const sc = passScores(h, R, dir);
    // a void bonus: passing the last cards of a short side suit
    let best = null, bv = -1e9;
    for (const c of h) { let v = sc.get(c); const s = suit(c); const left = h.filter(x => suit(x) === s).length; if (s !== H && s !== SP && left <= 3 - k && left > 0) v += 4; if (v > bv) { bv = v; best = c; } }
    picks.push(best); h.splice(h.indexOf(best), 1);
  }
  return picks;
}
// candidate passes for the search: the top-scored cards in combination
function passCands(hand, R, dir, k) {
  const sc = passScores(hand, R, dir), top = hand.slice().sort((a, b) => sc.get(b) - sc.get(a)).slice(0, 7), out = [], seen = new Set();
  const add = a => { const key = a.slice().sort((x, y) => x - y).join(','); if (!seen.has(key)) { seen.add(key); out.push(a); } };
  add(heurPass(hand, R, dir));
  for (let i = 0; i < top.length; i++) for (let j = i + 1; j < top.length; j++) for (let l = j + 1; l < top.length; l++) add([top[i], top[j], top[l]]);
  return out.slice(0, k || 12);
}
// simulate whole hands after a pass: the others' hands are random, they pass by rule, everyone plays the fast way
function evalPass(S, p, picks, worlds, rng) {
  rng = rng || Math.random;
  const R = S.R, mine = S.hands[p], dir = S.dir, rest = [];
  for (let c = 0; c < 52; c++) if (!mine.includes(c)) rest.push(c);
  let tot = 0, own = 0, n = 0, moon = 0;
  for (let w = 0; w < worlds; w++) {
    const d = rest.slice(); for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const x = d[i]; d[i] = d[j]; d[j] = x; }
    const hands = [[], [], [], []]; let k = 0; for (let s = 0; s < 4; s++) { if (s === p) { hands[s] = mine.slice(); continue; } hands[s] = d.slice(k, k + 13); k += 13; }
    const T = HT.newHand(R, hands, dir, S.no);
    for (let s = 0; s < 4; s++) T.pass[s] = s === p ? picks.slice() : heurPass(T.hands[s], R, dir);
    HT.doPass(T);
    const F = toFast(T); const v = rollout(F, 0, rng);
    tot += objOf(v, p); own += v[p]; n++; if (moonSeat(v, R) === p) moon++;
  }
  return { obj: tot / n, own: own / n, moon: moon / n, n };
}
function choosePass(S, p, lv, rng) {
  rng = rng || Math.random;
  const P = LEVELS[Math.max(1, Math.min(20, lv | 0))], hand = S.hands[p];
  if (P.prnd && rng() < P.prnd) { const h = hand.slice(); const o = []; for (let i = 0; i < 3; i++) o.push(h.splice(Math.floor(rng() * h.length), 1)[0]); return o; }
  if (P.pass !== 'sim') return heurPass(hand, S.R, S.dir);   // (also the levels with prnd when the coin says rule)
  const cands = passCands(hand, S.R, S.dir, 10);
  let best = cands[0], bv = 1e9;
  for (const c of cands) { const r = evalPass(S, p, c, P.pw || 16, rng); if (r.obj < bv) { bv = r.obj; best = c; } }
  return best;
}

/* ---------------- moon judge (for the coach and the research box) ---------------- */
// how often this hand would take every penalty card if it tried from now on (fast shooter vs fast defenders)
function moonChance(S, p, worlds, rng) {
  rng = rng || Math.random;
  if (!canShoot(S, p)) return 0;
  const V = view(S, p); let ok = 0, n = 0;
  for (let w = 0; w < worlds; w++) {
    const hands = sample(S, p, V, rng); if (!hands) break;
    const F = toFast(S, hands); F.mode = ['', '', '', '']; F.mode[p] = 'moon';
    rollout(F, 0, rng); n++;
    if (F.npen[p] === HT.npenTotal(S.R)) ok++;
  }
  return n ? ok / n : 0;
}
// a quick look at a 13-card hand before the pass: count of sure winners etc. (the reasons shown with the moon chance)
function moonSigns(hand) {
  const n = [0, 0, 0, 0], top = [0, 0, 0, 0];
  for (const c of hand) n[suit(c)]++;
  for (let s = 0; s < 4; s++) { for (let r = 14; r >= 2; r--) { if (hand.includes(card(s, r))) top[s]++; else break; } }
  const hiH = hand.filter(c => suit(c) === H && rank(c) >= 11).length, low = hand.filter(c => rank(c) <= 6 && suit(c) !== H).length;
  return { n, top, hiH, low, qs: hand.includes(QS), long: Math.max(...n) };
}

/* ---------------- the unseen cards (card counting) ---------------- */
function counting(S, p) {
  const V = view(S, p), mine = new Set(S.hands[p]), suits = [];
  for (let s = 0; s < 4; s++) {
    const un = []; for (let r = 2; r <= 14; r++) { const c = card(s, r); if (!V.out[c] && !mine.has(c)) un.push(c); }
    suits.push({ s, un, played: [...Array(13)].map((_, i) => card(s, i + 2)).filter(c => V.out[c]), mine: S.hands[p].filter(c => suit(c) === s) });
  }
  const ptsLeft = [];
  for (let c = 0; c < 52; c++) if (!V.out[c] && pts(c, S.R) !== 0) ptsLeft.push(c);
  return { suits, voids: V.void, known: V.known, ptsLeft };
}

const HAI = { fplayX: fplay, heur, lead, shootPlay, legalF, toFast, copyF, rollout, solve, view, sample, evalCards, decide, fastPick, canShoot, passScores, heurPass, passCands, evalPass, choosePass, moonChance, moonSigns, moonThreat, counting, objOf, moonSeat, outOf, LEVELS, mulberry };
if (typeof module !== 'undefined' && module.exports) module.exports = HAI; else root.HAI = HAI;
})(typeof self !== 'undefined' ? self : this);
