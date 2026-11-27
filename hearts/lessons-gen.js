/* ハーツ — lesson problems (hearts/lessons-gen.js). No DOM: used by the page (lessons.js) and the checker (tools/lesson-verify.js).
   Every problem is made from a random deal and its answer is worked out from the board: the legal plays (engine.js), who wins
   the trick, the points, the cards still unseen, or an exact search of an open-hand ending (ai.js solve, everyone's cards visible).
   The pass lessons use a pool checked beforehand by simulation (lesson-pool.js, made by tools/lesson-pool.js).
   A problem: { q: [key, vars], vis: { trick, labels, hand, open, info:[[key,vars]], log }, kind: 'card'|'text', opts, ans (index),
                exp: [key, vars], why: [[key, vars] | null per option], d (difficulty) } */
(function (root) {
'use strict';
const HT = root.HT || (typeof require !== 'undefined' ? require('./engine.js') : null);
const AI = root.HAI || (typeof require !== 'undefined' ? require('./ai.js') : null);
const { suit, rank, card, QS, KS, AS, JD } = HT;
const H = 3, SP = 2;
let rnd = Math.random;
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = a => a[Math.floor(rnd() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const x = a[i]; a[i] = a[j]; a[j] = x; } return a; };
const nm = c => HT.RKN(rank(c)) + HT.SYM[suit(c)];
const SYM = s => HT.SYM[s];
const R0 = HT.rules({});
// n random cards of suit s (ranks lo..hi) not in used
function takeSuit(used, s, n, lo, hi) { const pool = []; for (let r = lo || 2; r <= (hi || 14); r++) { const c = card(s, r); if (!used.has(c)) pool.push(c); } shuffle(pool); const out = pool.slice(0, n); out.forEach(c => used.add(c)); return out.length === n ? out : null; }
function fillHand(used, hand, n, avoidSuits) { const pool = []; for (let c = 0; c < 52; c++) if (!used.has(c) && !(avoidSuits || []).includes(suit(c))) pool.push(c); shuffle(pool); while (hand.length < n && pool.length) { const c = pool.pop(); used.add(c); hand.push(c); } return hand; }
// a state for checking a play: you are seat 0; the trick so far was played by the seats before you
function playState(hand, trick, tn, broken, R) {
  const S = HT.newHand(R || R0, [hand.slice(), [], [], []], 0, 1);
  S.phase = 'play'; S.tn = tn; S.broken = !!broken; S.trick = trick.map((c, i) => ({ s: (4 - trick.length + i) % 4, c })); S.turn = 0; S.leader = S.trick.length ? S.trick[0].s : 0;
  return S;
}
const seatOf = (trick, i) => (4 - trick.length + i) % 4;
const trickVis = trick => trick.map((c, i) => ({ s: seatOf(trick, i), c }));

const G = {
  /* 1. which card may be played */
  legal() {
    const type = pick(['follow', 'follow', 'first', 'nobreak']);
    for (let tries = 0; tries < 200; tries++) {
      const used = new Set();
      if (type === 'follow') {
        const s = ri(0, 3), n = ri(1, 2), lead = takeSuit(used, s, 1);
        const mine = takeSuit(used, s, n); if (!mine) continue;
        const others = [0, 1, 2, 3].filter(x => x !== s);
        const hand = mine.concat(fillHand(used, [], 9, [s]));
        const trick = lead.concat(takeSuit(used, s, ri(0, 2)) || []);
        const S = playState(hand, trick, ri(2, 6), true), L = HT.legal(S, 0);
        const good = pick(mine), bad = shuffle(hand.filter(c => suit(c) !== s && others.includes(suit(c)))).slice(0, 3);
        if (bad.length < 3) continue;
        const opts = shuffle([good].concat(bad));
        if (opts.filter(c => L.includes(c)).length !== 1) continue;
        return { q: ['lq.legal'], kind: 'card', vis: { trick: trickVis(trick), hand: HT.sortDisp(hand) }, opts, ans: opts.indexOf(good),
          exp: ['le.follow', { s: SYM(s), c: nm(good) }], why: opts.map(c => c === good ? null : ['lw.follow', { c: nm(c), s: SYM(s) }]), d: 1 };
      }
      if (type === 'first') {
        const trick = [card(0, 2)].concat(takeSuit(used.add(card(0, 2)) && used, 0, ri(0, 2), 3) || []);
        const hand = [QS], h = takeSuit(used.add(QS) && used, H, 3); if (!h) continue; hand.push(...h);
        const safe = takeSuit(used, ri(1, 2) === 1 ? 1 : 2, 1, 2, 11); if (!safe) continue; hand.push(...safe);
        fillHand(used, hand, 13, [0]);
        const S = playState(hand, trick, 0, false), L = HT.legal(S, 0);
        const good = safe[0], bad = shuffle([QS].concat(h)).slice(0, 3), opts = shuffle([good].concat(bad));
        if (opts.filter(c => L.includes(c)).length !== 1) continue;
        return { q: ['lq.legal'], kind: 'card', vis: { trick: trickVis(trick), hand: HT.sortDisp(hand), info: [['li.first']] }, opts, ans: opts.indexOf(good),
          exp: ['le.first', { c: nm(good) }], why: opts.map(c => c === good ? null : ['lw.first', { c: nm(c) }]), d: 2 };
      }
      // lead before hearts are broken
      const h = takeSuit(used, H, ri(3, 5)); const hand = h.slice(); const other = takeSuit(used, ri(0, 2), 1); hand.push(...other);
      fillHand(used, hand, ri(6, 9));
      const S = playState(hand, [], ri(2, 5), false), L = HT.legal(S, 0);
      const good = pick(hand.filter(c => suit(c) !== H)), bad = shuffle(h.slice()).slice(0, 3), opts = shuffle([good].concat(bad));
      if (opts.filter(c => L.includes(c)).length !== 1) continue;
      return { q: ['lq.lead'], kind: 'card', vis: { trick: [], hand: HT.sortDisp(hand), info: [['li.nobreak']] }, opts, ans: opts.indexOf(good),
        exp: ['le.nobreak', { c: nm(good) }], why: opts.map(c => c === good ? null : ['lw.nobreak', { c: nm(c) }]), d: 2 };
    }
    return null;
  },
  /* 2. who takes the trick (an off-suit high card in it) */
  winner() {
    for (let tries = 0; tries < 100; tries++) {
      const used = new Set(), s = ri(0, 2), lead = takeSuit(used, s, 1, 2, 12);
      const tr = lead.concat(takeSuit(used, s, ri(1, 2)) || []);
      const off = takeSuit(used, pick([0, 1, 2, 3].filter(x => x !== s)), 1, 11, 14); if (!off) continue;
      const trick = tr.concat(off); while (trick.length < 4) { const x = takeSuit(used, ri(0, 3), 1); if (x) trick.push(x[0]); }
      shuffle(trick.slice(1)).forEach((c, i) => { trick[i + 1] = c; });
      const seq = trick.map((c, i) => ({ s: (1 + i) % 4, c })), w = HT.winner(seq);
      if (rank(off[0]) <= rank(seq.find(p => p.s === w).c) && rnd() < .7) continue;   // mostly with a higher off-suit card
      const opts = [1, 2, 3, 0], wc = seq.find(p => p.s === w).c;
      return { q: ['lq.winner'], kind: 'seat', vis: { trick: seq, leadFirst: true }, opts, ans: opts.indexOf(w),
        exp: ['le.winner', { s: SYM(s), c: nm(wc) }],
        why: opts.map(p => { if (p === w) return null; const c = seq.find(x => x.s === p).c; return suit(c) !== s ? ['lw.offsuit', { c: nm(c), s: SYM(s) }] : ['lw.lower', { c: nm(c), w: nm(wc) }]; }), d: 1 };
    }
    return null;
  },
  /* 3. scoring a hand (with the moon) */
  score() {
    const v = pick(['std', 'std', 'omni']), R = HT.rules({ v }), moon = rnd() < .4;
    const taken = [[], [], [], []];
    const hearts = shuffle([...Array(13)].map((_, i) => card(H, i + 2)));
    if (moon) { const m = ri(0, 3); taken[m].push(QS, ...hearts); if (R.jd) taken[ri(0, 3)].push(JD); }
    else { for (const c of hearts) taken[ri(0, 3)].push(c); taken[ri(0, 3)].push(QS); if (R.jd) taken[ri(0, 3)].push(JD); }
    const S = HT.newHand(R, [[], [], [], []], 0, 1); S.taken = taken; S.phase = 'end';
    const res = HT.handScore(S, [0, 0, 0, 0]);
    const who = moon ? (rnd() < .5 ? res.moon : pick([0, 1, 2, 3].filter(x => x !== res.moon))) : ri(0, 3);
    const val = res.delta[who];
    const cand = new Set([val]); const alts = [res.raw[who], val + 13, val - 1, val + 1, 26, 0, 13, val + 10, val - 10];
    for (const x of shuffle(alts)) { if (cand.size >= 4) break; if (x !== val && x >= -10) cand.add(x); }
    if (cand.size < 4) return null;
    const opts = shuffle([...cand]);
    const parts = [0, 1, 2, 3].map(s => ({ s, h: taken[s].filter(c => suit(c) === H).length, q: taken[s].includes(QS), j: taken[s].includes(JD) }));
    const ex = moon ? (who === res.moon ? ['le.moonMe', { t: HT.totalPen(R) }] : ['le.moonOther', { t: HT.totalPen(R) }]) : ['le.score', { h: parts[who].h, q: parts[who].q ? 13 : 0, j: parts[who].j ? -10 : 0, n: val }];
    return { q: ['lq.score', { who }], kind: 'num', vis: { taken: parts, v }, opts, ans: opts.indexOf(val), exp: ex, why: opts.map(x => x === val ? null : ['lw.score', { n: x }]), d: moon ? 2 : 1, who };
  },
  /* 4. duck: last to play, keep out of a trick with points, shed the highest card you can */
  duck() {
    for (let tries = 0; tries < 300; tries++) {
      const used = new Set(), s = pick([0, 1, 3, 3]);
      const lead = takeSuit(used, s, 1, 4, 12), trick = lead.slice();
      const more = takeSuit(used, s, 1, 2, 13); if (!more) continue; trick.push(more[0]);
      // the third card: a point card thrown on it, or another card of the suit
      if (s !== H && rnd() < .6) { const p = rnd() < .4 && !used.has(QS) ? [QS] : takeSuit(used, H, 1); if (!p) continue; used.add(p[0]); trick.push(p[0]); }
      else { const x = takeSuit(used, s, 1); if (!x) continue; trick.push(x[0]); }
      const S = playState([], trick, ri(3, 8), true);
      const wr = Math.max(...trick.filter(c => suit(c) === s).map(rank));
      const below = takeSuit(used, s, ri(2, 3), 2, wr - 1), above = takeSuit(used, s, ri(1, 2), wr + 1, 14);
      if (!below || !above) continue;
      const mine = below.concat(above), hand = mine.concat(fillHand(used, [], 9 - mine.length, [s]));
      S.hands[0] = hand;
      const tp = trick.reduce((a, c) => a + HT.pts(c, R0), 0) + (s === H ? 0 : 0);
      if (tp <= 0) continue;
      const opts = shuffle(mine.slice(0, 4)); if (opts.length < 3) continue;
      const loseOpts = opts.filter(c => rank(c) < wr); if (!loseOpts.length) continue;
      const good = loseOpts.sort((a, b) => rank(b) - rank(a))[0];
      const wc = trick.filter(c => suit(c) === s).sort((a, b) => rank(b) - rank(a))[0];
      return { q: ['lq.duck', { p: tp }], kind: 'card', vis: { trick: trickVis(trick), hand: HT.sortDisp(hand) }, opts, ans: opts.indexOf(good),
        exp: ['le.duck', { c: nm(good), w: nm(wc) }],
        why: opts.map(c => c === good ? null : rank(c) > wr ? ['lw.duckWin', { c: nm(c), w: nm(wc), p: tp + HT.pts(c, R0) }] : ['lw.duckLow', { c: nm(c), g: nm(good) }]), d: opts.length + (loseOpts.length > 1 ? 1 : 0) };
    }
    return null;
  },
  /* 5. discard: out of the suit, give away the most points */
  discard() {
    const v = rnd() < .25 ? 'omni' : 'std', R = HT.rules({ v });
    for (let tries = 0; tries < 200; tries++) {
      const used = new Set(), s = ri(0, 2);
      const trick = takeSuit(used, s, ri(1, 3));
      const hasQ = s !== SP && rnd() < .55;
      const hand = []; if (hasQ) { used.add(QS); hand.push(QS); }
      const h = takeSuit(used, H, ri(1, 3)); if (!h) continue; hand.push(...h);
      if (R.jd && s !== 1 && !used.has(JD) && rnd() < .7) { used.add(JD); hand.push(JD); }
      fillHand(used, hand, ri(6, 9), [s]);
      const S = playState(hand, trick, ri(3, 8), true, R);
      const L = HT.legal(S, 0); if (L.length !== hand.length) continue;
      const ranked = hand.slice().sort((a, b) => HT.pts(b, R) - HT.pts(a, R));
      const best = ranked[0], bp = HT.pts(best, R); if (ranked.filter(c => HT.pts(c, R) === bp).length > 1) continue;
      const rest = shuffle(hand.filter(c => c !== best)); const opts = shuffle([best].concat(rest.filter(c => R.jd && c === JD).concat(rest.filter(c => c !== JD)).slice(0, 3)));
      if (opts.length < 4) continue;
      const w = HT.winner(trickVis(trick)), N = w;
      return { q: ['lq.discard', { s: SYM(s) }], kind: 'card', vis: { trick: trickVis(trick), hand: HT.sortDisp(hand), info: R.jd ? [['li.omni']] : [], v, winSeat: N }, opts, ans: opts.indexOf(best),
        exp: ['le.discard', { c: nm(best), p: bp }],
        why: opts.map(c => c === best ? null : R.jd && c === JD ? ['lw.jd'] : ['lw.discard', { c: nm(c), p: HT.pts(c, R), b: nm(best), q: bp }]), d: R.jd ? 2 : 1 };
    }
    return null;
  },
  /* 6. the queen on a trick that someone's A♠ / K♠ is winning */
  queen() {
    for (let tries = 0; tries < 200; tries++) {
      const used = new Set([QS]);
      const big = rnd() < .5 ? AS : KS; used.add(big);
      const before = takeSuit(used, SP, ri(0, 1), 2, 11) || [];
      const trick = shuffle(before.concat([big]));
      if (trick[0] !== big && rnd() < .5) { trick.reverse(); }
      const mine = [QS].concat(takeSuit(used, SP, ri(2, 3), 2, 11) || []); if (mine.length < 3) continue;
      if (big === KS && !used.has(AS) && rnd() < .5) { used.add(AS); mine.push(AS); }
      const hand = mine.concat(fillHand(used, [], 10 - mine.length, [SP]));
      const S = playState(hand, trick, ri(2, 7), rnd() < .5), L = HT.legal(S, 0);
      if (!L.includes(QS)) continue;
      const wr = Math.max(...trick.map(rank));
      if (mine.some(c => rank(c) > wr)) continue;   // the A♠ held: playing it would win — keep the lesson to one idea
      const opts = shuffle(mine.slice(0, 4)); if (opts.length < 3 || !opts.includes(QS)) continue;
      return { q: ['lq.queen'], kind: 'card', vis: { trick: trickVis(trick), hand: HT.sortDisp(hand) }, opts, ans: opts.indexOf(QS),
        exp: ['le.queen', { w: nm(big) }], why: opts.map(c => c === QS ? null : ['lw.queen', { c: nm(c) }]), d: trick.length };
    }
    return null;
  },
  /* 10. counting the cards still unseen */
  count() {
    for (let tries = 0; tries < 100; tries++) {
      const deck = HT.shuffled(rnd), hands = [[], [], [], []]; deck.forEach((c, i) => hands[i % 4].push(c));
      const S = HT.newHand(R0, hands, 0, 1);
      const nT = ri(4, 7);
      while (S.tn < nT) { const p = S.turn; HT.play(S, p, AI.fastPick(S, p)); }
      const s = pick([H, SP, H, 0, 1]);
      const seen = new Set(S.log.map(e => e.c).concat(S.hands[0]));
      let n = 0; for (let r = 2; r <= 14; r++) if (!seen.has(card(s, r))) n++;
      const cand = new Set([n]); for (const x of shuffle([n - 1, n + 1, n + 2, n - 2, 13 - S.log.filter(e => suit(e.c) === s).length])) { if (cand.size >= 4) break; if (x >= 0 && x !== n) cand.add(x); }
      if (cand.size < 4) continue;
      const opts = shuffle([...cand]), played = S.log.filter(e => suit(e.c) === s).length, mineN = S.hands[0].filter(c => suit(c) === s).length;
      return { q: ['lq.count', { s: SYM(s) }], kind: 'num', vis: { log: S.tricks.map(t => t.cards.map(x => ({ s: x.s, c: x.c }))), hand: HT.sortDisp(S.hands[0]) }, opts, ans: opts.indexOf(n),
        exp: ['le.count', { s: SYM(s), p: played, m: mineN, n }], why: opts.map(x => x === n ? null : ['lw.count', { n: x, s: SYM(s) }]), d: S.tn };
    }
    return null;
  },
  /* 11. stop the moon: take this trick away from the shooter */
  stopMoon() {
    for (let tries = 0; tries < 400; tries++) {
      const used = new Set(), m = ri(1, 3);
      // the shooter has every point card so far (some hearts and maybe the queen)
      const gone = takeSuit(used, H, ri(5, 8)); const qGone = rnd() < .6; if (qGone) used.add(QS);
      // this trick: hearts led (or another suit) and the shooter winning it with a high card, a heart in it
      const s = rnd() < .6 ? H : ri(0, 1);
      const trick = [];
      const order = [1, 2, 3].map(k => k);   // seats 1,2,3 played before you
      const wc = takeSuit(used, s, 1, 10, 13); if (!wc) continue;
      const lows = takeSuit(used, s, 2, 2, rank(wc[0]) - 1); if (!lows) continue;
      for (const p of order) trick.push(p === m ? wc[0] : lows.pop());
      if (s !== H) { const i = trick.findIndex((c, k) => k + 1 !== m); const hh = takeSuit(used, H, 1); if (!hh) continue; trick[i] = hh[0]; }
      const tv = trick.map((c, i) => ({ s: i + 1, c })), w = HT.winner(tv); if (w !== m) continue;
      const winR = rank(wc[0]);
      const up = takeSuit(used, s, 1, winR + 1, 14), down = takeSuit(used, s, ri(2, 3), 2, winR - 1); if (!up || !down) continue;
      const hand = up.concat(down); fillHand(used, hand, 8, [s]);
      const opts = shuffle(up.concat(down).slice(0, 4)); if (opts.length < 3) continue;
      const tp = trick.reduce((a, c) => a + HT.pts(c, R0), 0);
      return { q: ['lq.stopMoon', { m }], kind: 'card', vis: { trick: tv, hand: HT.sortDisp(hand), info: [['li.moon', { m, h: gone.length, q: qGone ? 1 : 0 }]] , shooter: m }, opts, ans: opts.indexOf(up[0]),
        exp: ['le.stopMoon', { c: nm(up[0]), m, p: tp }], why: opts.map(c => c === up[0] ? null : ['lw.stopMoon', { c: nm(c), w: nm(wc[0]), m }]), d: 2, gone: gone.length, qGone };
    }
    return null;
  },
  /* 9 & 12. open-hand endings (everyone's cards visible), solved exactly */
  end3() { return openEnding('safe'); },
  shoot() { return openEnding('moon'); },
};
// an open-hand ending: 3 cards each, you lead. 'safe': the card that keeps your points lowest whatever the others do.
// 'moon': you hold every point card so far; the card that still takes every remaining point card whatever the others do.
function worst(F, mode) {   // the others play against you (paranoid): returns your worst result
  if (F.phase !== 'play') return mode === 'moon' ? (F.npen[0] === HT.npenTotal(F.R) ? 0 : 1) : F.pts[0];
  const p = F.turn, L = AI.legalF(F, p);
  let best = null;
  for (const c of L) { const G2 = AI.copyF(F); AI.fplayX(G2, p, c); const v = worst(G2, mode); if (best == null || (p === 0 ? v < best : v > best)) best = v; }
  return best;
}
function openEnding(mode) {
  for (let tries = 0; tries < 400; tries++) {
    const deck = HT.shuffled(rnd), hands = [[], [], [], []];
    // 12 cards: 3 each, with hearts among them
    const pool = deck.slice(0, 12);
    if (pool.filter(c => suit(c) === H).length < (mode === 'moon' ? 3 : 2)) continue;
    pool.forEach((c, i) => hands[i % 4].push(c));
    const F = { R: R0, hands: hands.map(h => HT.sortDisp(h)), phase: 'play', turn: 0, leader: 0, trick: [], tn: 10, broken: true, pts: [0, 0, 0, 0], npen: [0, 0, 0, 0], void: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], tricksWon: [0, 0, 0, 0], fast: 1, out: new Uint8Array(52) };
    // the earlier tricks: every card not in the 12 is gone
    const inPlay = new Set(pool); for (let c = 0; c < 52; c++) if (!inPlay.has(c)) F.out[c] = 1;
    if (mode === 'moon') {   // you took every point card played so far
      let pts = 0, np = 0; for (let c = 0; c < 52; c++) if (F.out[c] && HT.isPen(c, R0)) { pts += HT.pts(c, R0); np++; }
      F.pts[0] = pts; F.npen[0] = np;
    }
    const L = AI.legalF(F, 0); if (L.length < 3) continue;
    const vals = L.map(c => { const G2 = AI.copyF(F); AI.fplayX(G2, 0, c); return { c, v: worst(G2, mode) }; });
    const bestV = Math.min(...vals.map(x => x.v)), bests = vals.filter(x => x.v === bestV);
    if (bests.length !== 1) continue;
    if (mode === 'moon' && bestV !== 0) continue;
    if (mode === 'safe' && Math.min(...vals.filter(x => x.v !== bestV).map(x => x.v)) - bestV < 1) continue;
    const good = bests[0].c, opts = L.slice();
    const d = vals.filter(x => x.v - bestV <= (mode === 'moon' ? 0 : 1)).length;
    return { q: [mode === 'moon' ? 'lq.shoot' : 'lq.end3'], kind: 'card', vis: { open: F.hands, info: [[mode === 'moon' ? 'li.shoot' : 'li.end3', { p: F.pts[0] }]] }, opts, ans: opts.indexOf(good),
      exp: [mode === 'moon' ? 'le.shoot' : 'le.end3', { c: nm(good), v: bestV }],
      why: opts.map(c => c === good ? null : [mode === 'moon' ? 'lw.shoot' : 'lw.end3', { c: nm(c), v: vals.find(x => x.c === c).v }]), d: 3 + L.length, vals };
  }
  return null;
}
// pool lessons (pass) come from lesson-pool.js
function fromPool(id) { const P = (root.HT_LPOOL || {})[id]; if (!P || !P.length) return null; const x = P[Math.floor(rnd() * P.length)]; return JSON.parse(JSON.stringify(x)); }
G.passQ = () => fromPool('passQ');
G.passVoid = () => fromPool('passVoid');
G.passAK = () => fromPool('passAK');
// a lesson's set: n problems, different from each other, easy → hard
function makeSet(id, n, rng) {
  if (rng) rnd = rng;
  const out = [], seen = new Set();
  for (let k = 0; out.length < n && k < 120; k++) { let q; try { q = G[id](); } catch (e) { continue; } if (!q) continue; const key = JSON.stringify([q.vis, q.opts]); if (seen.has(key)) continue; seen.add(key); out.push(q); }
  out.sort((a, b) => (a.d || 0) - (b.d || 0));
  return out;
}
const HLG = { G, makeSet, openEnding, worst, setRng(f) { rnd = f; }, playState };
if (typeof module !== 'undefined' && module.exports) module.exports = HLG; else root.HLG = HLG;
})(typeof self !== 'undefined' ? self : this);
