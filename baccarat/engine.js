/* バカラ — rules engine (baccarat/engine.js). No DOM (also runs in a worker if needed).
   Cards: 0…51 = suit*13 + rank-1 (rank 1=A … 13=K), the solitaire / poker card ids. A shoe holds `decks` × 52 cards.
   Point value: A=1, 2–9 face value, 10/J/Q/K = 0; a hand's total is the last digit of the sum.
   Drawing (the tableau, Punto Banco): natural 8/9 → nobody draws. Player draws on 0–5, stands on 6–7.
   Banker: if the Player stood, draws on 0–5; if the Player drew a third card p: 0–2 draw · 3 draw unless p=8 · 4 draw if p 2–7 ·
   5 draw if p 4–7 · 6 draw if p 6–7 · 7 stand.
   Variants (BC.VARIANTS): classic = Punto Banco (Banker pays 0.95), nocomm = no-commission / Super 6 (Banker winning with 6 pays 1:2),
   ez = EZ Baccarat (Banker winning with a three-card 7 pushes; side bets Dragon 7 40:1, Panda 8 25:1).
   Exact odds for the remaining shoe: `odds(counts)` enumerates every deal by point value (≤ 10^6 weighted paths). */
(function (G) {
'use strict';
const RANK = c => c % 13 + 1, SUIT = c => Math.floor(c / 13) % 4;
const VAL = c => { const r = c % 13 + 1; return r >= 10 ? 0 : r; };
const RCH = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const cardStr = c => RCH[RANK(c)] + '♠♥♦♣'[SUIT(c)];
function parse(s) {   // 'AS', 'TD', '10H', 'KC'
  s = String(s).toUpperCase(); const su = 'SHDC'.indexOf(s.slice(-1)); let r = s.slice(0, -1); r = r === 'T' ? '10' : r;
  return su * 13 + RCH.indexOf(r) - 1;
}
const total = cs => cs.reduce((a, c) => a + VAL(c), 0) % 10;
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shuffle(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ---------- the tableau ---------- */
const playerDraws = pt => pt <= 5;
function bankerDraws(bt, p3) {   // p3 = the Player's third card value, or null if the Player stood
  if (p3 == null) return bt <= 5;
  if (bt <= 2) return true;
  if (bt === 3) return p3 !== 8;
  if (bt === 4) return p3 >= 2 && p3 <= 7;
  if (bt === 5) return p3 >= 4 && p3 <= 7;
  if (bt === 6) return p3 === 6 || p3 === 7;
  return false;
}
// play one coup from the top of the shoe → { p:[cards], b:[cards], pt, bt, win:'P'|'B'|'T', natural, steps:[{who, why}] }
function coup(draw) {
  const p = [draw(), 0], b = [draw(), 0]; p[1] = draw(); b[1] = draw();
  const steps = [];
  let pt = total(p), bt = total(b);
  const natural = pt >= 8 || bt >= 8;
  let p3 = null;
  if (natural) steps.push({ k: 'natural', pt, bt });
  else {
    if (playerDraws(pt)) { const c = draw(); p.push(c); p3 = VAL(c); steps.push({ k: 'pDraw', pt }); pt = total(p); }
    else steps.push({ k: 'pStand', pt });
    const bt0 = bt;
    if (bankerDraws(bt0, p3)) { b.push(draw()); steps.push({ k: p3 == null ? 'bDrawS' : 'bDraw', bt: bt0, p3 }); bt = total(b); }
    else steps.push({ k: p3 == null ? 'bStandS' : 'bStand', bt: bt0, p3 });
  }
  return { p, b, pt, bt, win: pt > bt ? 'P' : bt > pt ? 'B' : 'T', natural, steps };
}

/* ---------- variants and bets ---------- */
// net result per unit bet for one coup.  r = coup()
const PAIR = 11;
const BETS = {
  P: { pay: (r) => r.win === 'P' ? 1 : r.win === 'T' ? 0 : -1 },
  B: { pay: (r, V) => r.win === 'B' ? V.bankerPay(r) : r.win === 'T' ? 0 : -1 },
  T: { pay: (r, V, o) => r.win === 'T' ? (o.tie || 8) : -1 },
  PP: { pay: r => RANK(r.p[0]) === RANK(r.p[1]) ? PAIR : -1 },
  BP: { pay: r => RANK(r.b[0]) === RANK(r.b[1]) ? PAIR : -1 },
  D7: { pay: r => r.win === 'B' && r.b.length === 3 && r.bt === 7 ? 40 : -1 },
  P8: { pay: r => r.win === 'P' && r.p.length === 3 && r.pt === 8 ? 25 : -1 },
};
const VARIANTS = {
  classic: { id: 'classic', bets: ['P', 'B', 'T', 'PP', 'BP'], bankerPay: () => .95, comm: .05 },
  nocomm: { id: 'nocomm', bets: ['P', 'B', 'T', 'PP', 'BP'], bankerPay: r => r.bt === 6 ? .5 : 1 },
  ez: { id: 'ez', bets: ['P', 'B', 'T', 'PP', 'BP', 'D7', 'P8'], bankerPay: r => r.b.length === 3 && r.bt === 7 ? 0 : 1 },
};
const ORDER = ['classic', 'nocomm', 'ez'];
function settle(r, v, bets, o) {   // bets: {P:100, …} → { net, per: {P: +95, …}, back: amount returned incl. stake }
  const V = VARIANTS[v]; let net = 0, back = 0; const per = {};
  for (const k in bets) { const a = bets[k]; if (!a) continue; const m = BETS[k].pay(r, V, o || {}); const w = Math.round(a * m * 100) / 100; per[k] = w; net += w; back += a + w; }
  return { net: Math.round(net * 100) / 100, per, back: Math.round(back * 100) / 100 };
}

/* ---------- the shoe ---------- */
function newShoe(decks, rnd) {
  const s = []; for (let d = 0; d < decks; d++) for (let c = 0; c < 52; c++) s.push(c);
  shuffle(s, rnd);
  // cut card: about 14 cards from the end (a common rule for 6–8 decks); burn: the first card is turned up and that many more are burned
  const first = s[0], burnN = VAL(first) || 10;
  return { cards: s, pos: 1 + burnN, cut: s.length - 14, decks, burned: [first].concat(s.slice(1, 1 + burnN)), n: 0 };
}
function counts(shoe) {   // remaining cards by rank (index 1…13)
  const c = Array(14).fill(0); for (let i = shoe.pos; i < shoe.cards.length; i++) c[RANK(shoe.cards[i])]++; return c;
}
const fullCounts = decks => { const c = Array(14).fill(0); for (let r = 1; r <= 13; r++) c[r] = 4 * decks; return c; };

/* ---------- exact odds from a composition ----------
   by point value: v[0..9] (0 = 10/J/Q/K). Returns probabilities of every outcome the bets need. */
function odds(rc) {
  const v = Array(10).fill(0); for (let r = 1; r <= 13; r++) v[r >= 10 ? 0 : r] += rc[r];
  const N = v.reduce((a, b) => a + b, 0);
  const R = { P: 0, B: 0, T: 0, B6: 0, B7_3: 0, P8_3: 0, nat: 0, PP: 0, BP: 0, n: N };
  if (N < 6) return R;
  // pairs: first two cards of a hand share a rank (positions 1&3 / 2&4 of the deal — any two cards of an unknown shoe)
  let pr = 0; for (let r = 1; r <= 13; r++) pr += rc[r] * (rc[r] - 1); R.PP = R.BP = pr / (N * (N - 1));
  const w = v.slice();
  const take = i => { const p = w[i] / rem; w[i]--; rem--; return p; }, put = i => { w[i]++; rem++; };
  let rem = N;
  for (let a = 0; a < 10; a++) { if (!w[a]) continue; const pa = take(a);
  for (let b = 0; b < 10; b++) { if (!w[b]) continue; const pb = take(b);
  for (let c = 0; c < 10; c++) { if (!w[c]) continue; const pc = take(c);
  for (let d = 0; d < 10; d++) { if (!w[d]) continue; const pd = take(d);
    const p4 = pa * pb * pc * pd, pt = (a + c) % 10, bt = (b + d) % 10;
    if (pt >= 8 || bt >= 8) { R.nat += p4; add(R, p4, pt, bt, 2, 2); }
    else if (pt <= 5) {   // player draws
      for (let e = 0; e < 10; e++) { if (!w[e]) continue; const pe = take(e), pt3 = (pt + e) % 10;
        if (bankerDraws(bt, e)) { for (let f = 0; f < 10; f++) { if (!w[f]) continue; const pf = w[f] / rem; add(R, p4 * pe * pf, pt3, (bt + f) % 10, 3, 3); } }
        else add(R, p4 * pe, pt3, bt, 3, 2);
        put(e); }
    } else if (bt <= 5) { for (let f = 0; f < 10; f++) { if (!w[f]) continue; const pf = w[f] / rem; add(R, p4 * pf, pt, (bt + f) % 10, 2, 3); } }
    else add(R, p4, pt, bt, 2, 2);
    put(d); } put(c); } put(b); } put(a); }
  return R;
}
function add(R, p, pt, bt, pn, bn) {
  if (pt > bt) { R.P += p; if (pn === 3 && pt === 8) R.P8_3 += p; }
  else if (bt > pt) { R.B += p; if (bt === 6) R.B6 += p; if (bn === 3 && bt === 7) R.B7_3 += p; }
  else R.T += p;
}
// expected value per unit bet for every bet of a variant
function evs(R, v, o) {
  const tie = (o && o.tie) || 8, E = {};
  E.P = R.P - R.B;
  if (v === 'classic') E.B = R.B * .95 - R.P;
  else if (v === 'nocomm') E.B = (R.B - R.B6) + R.B6 * .5 - R.P;
  else E.B = (R.B - R.B7_3) - R.P;
  E.T = R.T * tie - (1 - R.T);
  E.PP = R.PP * PAIR - (1 - R.PP); E.BP = R.BP * PAIR - (1 - R.BP);
  E.D7 = R.B7_3 * 40 - (1 - R.B7_3); E.P8 = R.P8_3 * 25 - (1 - R.P8_3);
  return E;
}
// probability that a bet wins (for the tables)
function winP(R, k) { return { P: R.P, B: R.B, T: R.T, PP: R.PP, BP: R.BP, D7: R.B7_3, P8: R.P8_3 }[k]; }

G.BC = { RANK, SUIT, VAL, RCH, cardStr, parse, total, mulberry, shuffle, playerDraws, bankerDraws, coup, BETS, VARIANTS, ORDER, settle, newShoe, counts, fullCounts, odds, evs, winP, PAIR };
})(typeof self !== 'undefined' ? self : this);
