/* ライアーダイス — computer players, the coach's numbers and the review (liarsdice/ai.js)
   Our own design (no outside engine):
   1. Bayesian reading of the bids. Every other player's hand is one of the multisets of their dice (252 for five dice).
      Prior = the dice odds; every bid they made this round multiplies a hand by how likely that hand was to name that face:
      P(face f | hand) = exp(γ·s_f) / Σ_g exp(γ·s_g), s_f = dice of the hand that count for f. γ = how much we trust bids.
   2. The chance a bid is true = the matches in your own hand + the convolution of everyone's posterior counts.
   3. Each option is scored in dice (U): doubting loses a die with the chance the bid is true; a bid loses a die when the next
      player doubts it (chance d) and it is false. d is read from what the table can see: your hand as the others read it
      from your bids (same model) plus their hands. Another player losing a die is worth w = 1/(players − 1) of a die.
   4. Levels 1–20 change how much the AI reads (γ), whether it sees what the table sees (d), calza, bluffing (a bid on a face
      you don't hold that the table will still believe) and the noise of the choice (softmax temperature). */
(function (root) {
'use strict';
const LD = root.LD;
const H = LD.HANDS;

/* ---------------- level parameters ---------------- */
function lerp(a, b, x) { return a + (b - a) * Math.max(0, Math.min(1, x)); }
function params(L) {
  const ov = (typeof globalThis !== 'undefined' && globalThis.LD_PARAM_OV) || null;
  const P0 = params0(L > 20 ? (ov && ov[L] && ov[L].base) || L - 20 : L);
  return ov && ov[L] ? Object.assign(P0, ov[L]) : P0;
}
function params0(L) {
  L = Math.max(1, Math.min(20, L | 0));
  const x = (L - 1) / 19;
  return {
    L,
    tau: [0, 1.4, 1, .7, .5, .4, .34, .28, .24, .2, .17, .14, .12, .1, .08, .06, .045, .04, .02, .01, .004][L],   // softmax temperature (dice)
    own: L === 1 ? .2 : L === 2 ? .45 : L === 3 ? .75 : 1,                         // chance of looking at your own dice when judging
    gamma: L <= 4 ? 0 : lerp(.2, .85, (L - 5) / 11),                               // trust in the others' bids (Bayesian reading)
    pub: L >= 6,                                                                     // d from what the table can see
    calza: L >= 5,
    bluff: L < 9 ? 0 : lerp(.05, .14, (L - 9) / 11),                                // share of turns with a bluff bid
    k: lerp(6, 11, x),                                                               // how sharply the next player doubts
    lift: L >= 12,                                                                   // consider bigger raises (+2)
    roll: +(process_env('LDROLL') || [0, 30, 60, 100, 160][Math.max(0, L - 16)]), rtop: 6, rnoise: .06,
    // nx: the next-player model (measured: no gain over the table reading; off, kept for tests)
    nx: L >= +(process_env('LDNX') || 99), k2: +(process_env('LDK2') || 14), th: +(process_env('LDTH') || .5), press: +(process_env('LDPR') || .12),
  };
}
const GAMMA_COACH = .7, COACH_LV = 20;
function process_env(k) { try { return typeof process !== 'undefined' && process.env ? process.env[k] : null; } catch (e) { return null; } }

/* ---------------- posterior over a player's hand ---------------- */
// the faces that could be named at a given point (for the normalisation of the bid likelihood)
function facesAt(ctx) { const a = []; for (let f = 1; f <= 6; f++) if (LD.minQ(ctx, f) <= ctx.total) a.push(f); return a; }
function ctxAt(G, i, p) {
  const r = G.round, prev = i > 0 ? r.bids[i - 1] : null, pal = r.pal >= 0;
  return { wild: LD.wildOn(G), raise: G.R.raise, pal, lockFace: pal && prev && G.dice[p] > 1 ? prev.f : 0, prev, total: LD.total(G), opening: !prev };
}
function sup(c, f, wild) { return c[f] + (wild && f !== 1 ? c[1] : 0); }
// weights for player j's hands given their bids this round (and an optional extra bid `plus` = {q,f,i})
function posterior(G, j, gamma, plus) {
  const L = H[G.dice[j]], wild = LD.wildOn(G), w = L.map(h => h.p);
  if (gamma > 0) {
    const bids = G.round.bids.map((b, i) => ({ b, i })).filter(x => x.b.p === j);
    if (plus) bids.push({ b: plus, i: G.round.bids.length });
    for (const { b, i } of bids) {
      const faces = facesAt(ctxAt(G, i, j));
      if (faces.length < 2) continue;
      for (let h = 0; h < L.length; h++) {
        const c = L[h].c; let z = 0, mine = 0;
        for (const f of faces) { const e = Math.exp(gamma * sup(c, f, wild)); z += e; if (f === b.f) mine = e; }
        w[h] *= mine / z;
      }
    }
  }
  let s = 0; for (const x of w) s += x; for (let h = 0; h < w.length; h++) w[h] /= s || 1;
  return w;
}
function countDist(G, j, w, f) {
  const L = H[G.dice[j]], wild = LD.wildOn(G), d = new Array(G.dice[j] + 1).fill(0);
  for (let h = 0; h < L.length; h++) d[sup(L[h].c, f, wild)] += w[h];
  return d;
}
/* everything the player `me` can know: per face, the distribution of matches among the others' dice */
function view(G, me, gamma) {
  const others = [];
  for (let j = 0; j < G.n; j++) if (j !== me && G.dice[j] > 0) others.push({ j, w: posterior(G, j, gamma) });
  const per = [null];
  for (let f = 1; f <= 6; f++) { let d = [1]; for (const o of others) d = LD.conv(d, countDist(G, o.j, o.w, f)); per.push(d); }
  return { others, per, mine: G.hands[me], wild: LD.wildOn(G) };
}
function pTrue(V, q, f, own) { const m = own === false ? 0 : LD.supportOf(V.mine, f, V.wild); return LD.atLeast(V.per[f], q - m); }
function pEq(V, q, f) { const k = q - LD.supportOf(V.mine, f, V.wild), d = V.per[f]; return k < 0 || k >= d.length ? 0 : d[k]; }
// the chance a bid is true as the table sees it: my hand read from my bids (with this one) + the others as I read them
function pTable(G, me, V, b, gamma) {
  const ck = '_tb' + gamma;
  const cache = V[ck] || (V[ck] = []);
  let td = cache[b.f];
  if (!td) {
    const w = posterior(G, me, gamma, { p: me, q: b.q, f: b.f });
    td = cache[b.f] = LD.conv(V.per[b.f], countDist(G, me, w, b.f));
  }
  return LD.atLeast(td, b.q);
}
const sig = x => 1 / (1 + Math.exp(-x));

/* ---------------- options with their value ----------------
   returns [{ a, T, lose, gain, U, kind }] best first. kind: 'dudo' | 'calza' | 'bid' ; T = chance the bid is true */
// the next player's answer to bid b, hand by hand: they doubt when, with their own dice and the table's reading of the
// rest (my hand read from my bids), the bid looks less likely than θ. Losing is counted only where they doubt AND it is false.
function nextModel(G, me, P, V, b, gamma) {
  const nx = LD.nextAlive(G, me), wild = V.wild, f = b.f;
  const key = '_nx' + f;
  let M = V[key];
  if (!M) {
    const o = V.others.find(x => x.j === nx);
    let rest = [1]; for (const x of V.others) if (x.j !== nx) rest = LD.conv(rest, countDist(G, x.j, x.w, f));   // the others, as I read them
    const mw = posterior(G, me, gamma, { p: me, q: b.q, f });
    const restT = LD.conv(rest, countDist(G, me, mw, f));                                                   // what nx sees beyond their hand
    const L = H[G.dice[nx]], acc = {};
    for (let h = 0; h < L.length; h++) { const sv = sup(L[h].c, f, wild); acc[sv] = (acc[sv] || 0) + o.w[h]; }
    M = V[key] = { rest, restT, acc, mine: LD.supportOf(V.mine, f, wild) };
  }
  let lose = 0, gain = 0;
  for (const sv in acc0(M)) {
    const pw = M.acc[sv], sh = +sv;
    const pn = LD.atLeast(M.restT, b.q - sh);                         // the bid as nx sees it
    const dz = sig(P.k2 * (P.th - pn));
    const pt = LD.atLeast(M.rest, b.q - M.mine - sh);                 // the truth given their hand
    lose += pw * dz * (1 - pt); gain += pw * dz * pt;
  }
  return { lose, gain };
}
const acc0 = M => M.acc;
function scoreBid(G, me, P, V, b, w, own) {
  if (P.nx) {
    const T = pTrue(V, b.q, b.f, own), m = nextModel(G, me, P, V, b, P.gamma || GAMMA_COACH);
    return { a: { t: 'bid', q: b.q, f: b.f }, kind: 'bid', T, d: m.lose + m.gain, lose: m.lose, gain: m.gain, U: -m.lose + m.gain * w - P.press * b.q / LD.total(G) };
  }
  const T = pTrue(V, b.q, b.f, own);
  const Tt = P.pub ? pTable(G, me, V, b, P.gamma || GAMMA_COACH) : T;
  const d = sig(P.k * (.5 - Tt)) * .96 + .02;
  const U = -d * (1 - T) + d * T * w + P.press * b.q / LD.total(G) * T;
  return { a: { t: 'bid', q: b.q, f: b.f }, kind: 'bid', T, Tt, d, lose: d * (1 - T), gain: d * T, U };
}
function options(G, me, P, V, want) {
  P = P || params(COACH_LV);
  V = V || view(G, me, P.gamma);
  const ctx = LD.bidCtx(G, me), prev = ctx.prev, n = LD.nAlive(G), w = n > 1 ? 1 / (n - 1) : 1;
  const own = P.own >= 1 || Math.random() < P.own;
  const out = [];
  if (prev) {
    const T = pTrue(V, prev.q, prev.f, own);
    out.push({ a: { t: 'dudo' }, kind: 'dudo', T, lose: T, gain: (1 - T), U: -T + (1 - T) * w });
    if (LD.canCalza(G, me) && P.calza) {
      const E = pEq(V, prev.q, prev.f), g = G.dice[me] < G.R.dice ? .85 : .05;
      out.push({ a: { t: 'calza' }, kind: 'calza', T, E, lose: 1 - E, gain: E, U: E * g - (1 - E) });
    }
  }
  const extra = P.lift ? 2 : 1;
  // candidates: the smallest raises of every face, and on up to about the expected count of that face
  const bids = [];
  for (let f = 1; f <= 6; f++) {
    const m = LD.minQ(ctx, f); if (m > ctx.total) continue;
    const exp = LD.supportOf(V.mine, f, V.wild) + (ctx.total - V.mine.length) * LD.pMatch(f, V.wild);
    const hi = Math.min(ctx.total, Math.max(m + extra, Math.round(exp) + 1));
    for (let q = m; q <= hi; q++) if (LD.legalBid(ctx, q, f)) bids.push({ q, f });
  }
  if (want && want.t === 'bid' && !bids.some(b => b.q === want.q && b.f === want.f) && LD.legalBid(ctx, want.q, want.f)) bids.push({ q: want.q, f: want.f });
  const bs = bids.map(b => scoreBid(G, me, P, V, b, w, own)).sort((a, b) => b.U - a.U);
  if (P.roll > 0 && bs.length) {
    const top = bs.slice(0, P.rtop);
    if (want && want.t === 'bid') { const x = bs.find(o => o.a.q === want.q && o.a.f === want.f); if (x && !top.includes(x)) top.push(x); }
    rolloutValues(G, me, P, V, top, P.rng || Math.random);
    for (const o of bs) if (!o.rolled) o.U -= .5;   // not looked at closely: below the rolled ones
  }
  for (const o of bs) out.push(o);
  out.sort((a, b) => b.U - a.U);
  return out;
}

/* ---------------- rollouts (the strongest levels) ----------------
   Fill the others' hands from the Bayesian reading, make the bid, and play the rest of the round with a quick policy
   (each player: own dice + the odds for the rest; raise to the most likely bid, doubt when the last bid is less likely
   than the best raise). Count who loses a die. */
let QTH = +(process_env('LDQTH') || .45), QK = 8;
const TAIL = [1 / 6, 1 / 3].map(p => { const t = []; for (let n = 0; n <= 30; n++) { const d = LD.binDist(n, p), r = new Array(n + 2).fill(0); for (let k = n; k >= 0; k--) r[k] = r[k + 1] + d[k]; t.push(r); } return t; });
function tail(n, k, wildF) { if (k <= 0) return 1; if (k > n) return 0; return TAIL[wildF ? 1 : 0][n][k]; }
function sampleHand(G, j, w, rng) {
  let r = rng(), h = 0; const L = H[G.dice[j]];
  for (; h < L.length - 1; h++) { r -= w[h]; if (r <= 0) break; }
  const c = L[h].c, out = []; for (let f = 1; f <= 6; f++) for (let k = 0; k < c[f]; k++) out.push(f);
  for (let i = out.length - 1; i > 0; i--) { const k = Math.floor(rng() * (i + 1)); const x = out[i]; out[i] = out[k]; out[k] = x; }
  return out;
}
function quick(G, hands, bids, p, rng, tot, wild, pal, raise, noise) {
  // a quick version of the plain reading (levels 6–9): odds + own dice; the table judges a bid by the odds alone
  const prev = bids[bids.length - 1], n = LD.nAlive(G), w = n > 1 ? 1 / (n - 1) : 1;
  const ctx = { wild, raise, pal, lockFace: pal && G.dice[p] > 1 ? prev.f : 0, prev, total: tot, opening: false };
  const my = hands[p], unk = tot - my.length;
  const pr = (q, f) => tail(unk, q - LD.supportOf(my, f, wild), wild && f !== 1);
  const T0 = pr(prev.q, prev.f);
  let bu = -T0 + (1 - T0) * w + (noise ? (rng() - .5) * noise : 0), best = null;
  for (let f = 1; f <= 6; f++) {
    const m = LD.minQ(ctx, f); if (m > tot) continue;
    for (let q = m; q <= Math.min(tot, m + 1); q++) {
      const T = pr(q, f), Tp = tail(unk + my.length - 0, q - Math.round(my.length * (wild && f !== 1 ? 1 / 3 : 1 / 6)), wild && f !== 1);
      const d = 1 / (1 + Math.exp(-QK * (.5 - Tp))) * .96 + .02;
      const u = -d * (1 - T) + d * T * w + (noise ? (rng() - .5) * noise : 0);
      if (u > bu) { bu = u; best = { p, q, f }; }
    }
  }
  return best;   // null = doubt
}
function rollout(G, me, a, ws, rng, noise) {
  const hands = G.hands.map((h, j) => j === me || G.dice[j] === 0 ? h : sampleHand(G, j, ws[j], rng));
  const bids = G.round.bids.slice(); bids.push({ p: me, q: a.q, f: a.f });
  const tot = LD.total(G), wild = LD.wildOn(G), pal = G.round.pal >= 0, raise = G.R.raise;
  let p = me;
  for (let n = 0; n < 60; n++) {
    p = LD.nextAlive(G, p);
    const b = quick(G, hands, bids, p, rng, tot, wild, pal, raise, noise);
    if (!b) { const pv = bids[bids.length - 1]; const ok = LD.countFace(hands, pv.f, wild) >= pv.q; return ok ? p : pv.p; }
    bids.push(b);
  }
  return -1;
}
function rolloutValues(G, me, P, V, bids, rng) {
  const ws = []; for (const o of V.others) ws[o.j] = o.w;
  const n = LD.nAlive(G), w = n > 1 ? 1 / (n - 1) : 1;
  for (const o of bids) {
    let lose = 0, other = 0;
    for (let i = 0; i < P.roll; i++) { const l = rollout(G, me, o.a, ws, rng, P.rnoise); if (l === me) lose++; else if (l >= 0) other++; }
    o.lose = lose / P.roll; o.gain = other / P.roll; o.U = -o.lose + o.gain * w + P.press * o.a.q / LD.total(G) * o.T; o.rolled = true;
  }
}

/* ---------------- the computer's move ---------------- */
function decide(G, me, L, rng) {
  rng = rng || Math.random;
  const P = params(L); P.rng = rng; const V = view(G, me, P.gamma);
  const ctx = LD.bidCtx(G, me);
  // the weakest levels: often the smallest raise on a face of their own hand
  if (L <= 2 && rng() < (L === 1 ? .55 : .3)) {
    const prev = ctx.prev;
    if (prev && rng() < (L === 1 ? .3 : .25)) return pTrue(V, prev.q, prev.f, L === 2) < (L === 1 ? .7 : .55) || LD.minQ(ctx, prev.f) > ctx.total ? { t: 'dudo' } : { t: 'bid', q: LD.minQ(ctx, prev.f), f: prev.f };
    // Lv.1: the smallest raise on any face; Lv.2: on a face of its own hand
    const fs = (L === 1 ? [1, 2, 3, 4, 5, 6] : [...new Set(G.hands[me])]).filter(f => LD.minQ(ctx, f) <= ctx.total);
    const f = fs.length ? fs[Math.floor(rng() * fs.length)] : 0;
    if (f) return { t: 'bid', q: LD.minQ(ctx, f), f };
  }
  const opts = options(G, me, P, V);
  if (!opts.length) return { t: 'dudo' };
  // a bluff: a bid the table believes (Tt high) on a face you hold little of
  if (P.bluff && rng() < P.bluff) {
    const best = opts[0];
    const bl = opts.filter(o => o.kind === 'bid' && o.Tt > .6 && o.T > .3 && o.U > best.U - .12 && LD.supportOf(G.hands[me], o.a.f, V.wild) <= 1);
    if (bl.length) return bl[Math.floor(rng() * bl.length)].a;
  }
  if (P.tau <= .0001) return opts[0].a;
  const m = opts[0].U; let z = 0; const ws = opts.map(o => { const e = Math.exp((o.U - m) / P.tau); z += e; return e; });
  let r = rng() * z;
  for (let i = 0; i < opts.length; i++) { r -= ws[i]; if (r <= 0) return opts[i].a; }
  return opts[0].a;
}

/* ---------------- the coach ---------------- */
// the analysis for the human at seat `me` (the strongest reading)
function coach(G, me, want) {
  const P = params(COACH_LV), V = view(G, me, P.gamma), opts = options(G, me, P, V, want);
  // among bids worth about the same (within 0.03 dice), suggest the most natural one: the highest bid that still
  // holds 75%+ (a bare "one 4" opening is as safe in numbers but teaches nothing)
  if (opts.length && opts[0].kind === 'bid') {
    const near = opts.filter(o => o.kind === 'bid' && o.U >= opts[0].U - .03 && o.T >= .75);
    if (near.length > 1) { const pick = near.reduce((a, b) => b.a.q > a.a.q || (b.a.q === a.a.q && b.U > a.U) ? b : a); if (pick !== opts[0]) { opts.splice(opts.indexOf(pick), 1); opts.unshift(pick); } }
  }
  const prev = LD.last(G);
  // what each other player seems to hold (the face with the most expected matches beyond the odds)
  const reads = V.others.map(o => {
    let best = 0, bf = 0;
    for (let f = 1; f <= 6; f++) {
      if (V.wild && f === 1) continue;
      const d = countDist(G, o.j, o.w, f); let e = 0; d.forEach((p, k) => { e += p * k; });
      const base = G.dice[o.j] * LD.pMatch(f, V.wild), up = e - base;
      if (up > best) { best = up; bf = f; }
    }
    return { j: o.j, f: bf, up: best };
  });
  // expected matches among the unknown dice, per face
  const expect = [null]; for (let f = 1; f <= 6; f++) { let e = 0; V.per[f].forEach((p, k) => { e += p * k; }); expect.push(e); }
  return { opts, prev, T: prev ? pTrue(V, prev.q, prev.f) : null, E: prev ? pEq(V, prev.q, prev.f) : null, reads, expect, V };
}
// the verdict on a decision a = the action taken, from the options list (U in dice)
function verdict(opts, a) {
  const same = o => o.a.t === a.t && (a.t !== 'bid' || (o.a.q === a.q && o.a.f === a.f));
  let me = opts.find(same);
  if (!me && a.t === 'bid') me = { U: -1, missing: true };
  const best = opts[0], gap = best.U - me.U;
  const grade = gap < .03 ? 'best' : gap < .1 ? 'good' : gap < .22 ? 'dubious' : 'bad';
  return { grade, gap, best, me };
}

root.LDAI = { params, posterior, countDist, view, pTrue, pEq, pTable, options, decide, coach, verdict };
})(typeof window !== 'undefined' ? window : globalThis);
