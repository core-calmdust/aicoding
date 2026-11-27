/* ライアーダイス — rules and probability (liarsdice/engine.js)
   Perudo / Dudo family: every player rolls five dice under a cup, bids "at least q dice showing f" over ALL the dice
   on the table, the next player raises or calls dudo (doubt). Variants (claude/liarsdice-spec.md):
     wild     ones (aces, "paco") count as every face; bids switch to aces at ceil(q/2), back at 2q+1; no opening on aces
     palifico the round after a player drops to one die (once per player): ones are not wild, the face may not change
              (players who have one die themselves may still change it), calza is off
     calza    on your turn, claim the last bid is exactly right: right = +1 die (max 5), wrong = −1 die
     raise    'std'  = higher quantity of any face, or the same quantity of a higher face (Perudo)
              'strict' = higher quantity of the SAME face, or the same quantity of a higher face (Wikipedia's 3rd variant)
   Pure functions, no DOM. Also runs in node (tools/test.js, tools/arena.js). */
(function (root) {
'use strict';
const DEF = { wild: true, palifico: true, calza: true, raise: 'std', dice: 5 };
const PRESETS = {
  perudo: { wild: true, palifico: true, calza: true, raise: 'std' },
  dudo: { wild: true, palifico: false, calza: false, raise: 'std' },
  classic: { wild: false, palifico: false, calza: false, raise: 'std' },
};
function rulesOf(o) { return Object.assign({}, DEF, o || {}); }

/* ---------------- the game ---------------- */
function newGame(o) {
  o = o || {};
  const n = Math.max(2, Math.min(6, o.players || 4)), R = rulesOf(o.rules);
  const G = { R, n, dice: Array(n).fill(R.dice), hands: Array.from({ length: n }, () => []), palUsed: Array(n).fill(false),
    out: [], round: null, rounds: [], phase: 'roll', starter: o.starter != null ? o.starter : 0, no: 0, over: false, winner: -1 };
  return G;
}
const alive = (G, p) => G.dice[p] > 0;
const nAlive = G => G.dice.filter(d => d > 0).length;
const total = G => G.dice.reduce((a, b) => a + b, 0);
function nextAlive(G, p) { for (let i = 1; i <= G.n; i++) { const q = (p + i) % G.n; if (alive(G, q)) return q; } return p; }
function roll(rng) { return 1 + Math.floor((rng || Math.random)() * 6); }
// a new round: everyone rolls (hands sorted for display); pal = the palifico player or -1
function startRound(G, rng, fixed) {
  G.no++;
  for (let p = 0; p < G.n; p++) G.hands[p] = fixed && fixed[p] ? fixed[p].slice() : Array.from({ length: G.dice[p] }, () => roll(rng)).sort((a, b) => a - b);
  let st = G.starter; if (!alive(G, st)) st = nextAlive(G, st);
  const pal = G.R.palifico && G.palNext != null && G.palNext >= 0 && alive(G, G.palNext) ? G.palNext : -1;
  G.palNext = -1;
  G.round = { no: G.no, start: st, turn: st, bids: [], pal, res: null };
  G.phase = 'bid';
  return G.round;
}
const wildOn = G => G.R.wild && !(G.round && G.round.pal >= 0);
const last = G => G.round && G.round.bids.length ? G.round.bids[G.round.bids.length - 1] : null;
/* how many dice match face f (with wilds when they count) */
function countFace(hands, f, wild) { let c = 0; for (const h of hands) for (const d of h) if (d === f || (wild && d === 1 && f !== 1)) c++; return c; }
function supportOf(hand, f, wild) { let c = 0; for (const d of hand) if (d === f || (wild && d === 1 && f !== 1)) c++; return c; }

/* ---------------- legal bids ----------------
   ctx: { wild, raise, pal (palifico round), lockFace (face fixed in palifico for this bidder, or 0), opening, total } */
function bidCtx(G, p) {
  const r = G.round, pal = r.pal >= 0, prev = last(G);
  return { wild: wildOn(G), raise: G.R.raise, pal, lockFace: pal && prev && G.dice[p] > 1 ? prev.f : 0, prev, total: total(G), opening: !prev };
}
// the smallest quantity of face f that beats prev (Infinity when f can't be bid now)
function minQ(ctx, f) {
  const prev = ctx.prev;
  if (!prev) {   // opening
    if (ctx.wild && f === 1) return Infinity;   // no opening on aces while they are wild
    return 1;
  }
  if (ctx.lockFace && f !== ctx.lockFace) return Infinity;
  const P = prev.q, F = prev.f;
  if (ctx.wild) {
    if (F === 1 && f === 1) return P + 1;
    if (f === 1) return Math.ceil(P / 2);
    if (F === 1) return 2 * P + 1;
  }
  if (f === F) return P + 1;
  if (ctx.raise === 'strict') return f > F ? P : Infinity;
  return f > F ? P : P + 1;
}
function legalBid(ctx, q, f) {
  if (!(f >= 1 && f <= 6) || !(q >= 1) || q > ctx.total) return false;
  const m = minQ(ctx, f);
  if (m === Infinity) return false;
  if (ctx.raise === 'strict' && ctx.prev && !ctx.wild) { const P = ctx.prev.q, F = ctx.prev.f; return (f === F && q > P) || (q === P && f > F); }
  if (ctx.raise === 'strict' && ctx.prev && ctx.wild && f !== 1 && ctx.prev.f !== 1 && f !== ctx.prev.f) return q === ctx.prev.q && f > ctx.prev.f;
  return q >= m;
}
function legalBids(ctx, extra) {
  const out = [];
  for (let f = 1; f <= 6; f++) {
    const m = minQ(ctx, f); if (m === Infinity || m > ctx.total) continue;
    const hi = Math.min(ctx.total, m + (extra == null ? ctx.total : extra));
    for (let q = m; q <= hi; q++) if (legalBid(ctx, q, f)) out.push({ q, f });
  }
  return out;
}
function canCalza(G, p) { const r = G.round; return !!(G.R.calza && r && r.pal < 0 && last(G) && last(G).p !== p && nAlive(G) > 2); }
function canDudo(G, p) { const l = last(G); return !!(l && l.p !== p); }

/* ---------------- actions ----------------
   a = { t: 'bid', q, f } | { t: 'dudo' } | { t: 'calza' } — returns the round result when the round ends */
function act(G, p, a) {
  const r = G.round;
  if (G.phase !== 'bid' || r.turn !== p) throw new Error('not your turn');
  if (a.t === 'bid') {
    const ctx = bidCtx(G, p);
    if (!legalBid(ctx, a.q, a.f)) throw new Error('illegal bid ' + a.q + 'x' + a.f);
    r.bids.push({ p, q: a.q, f: a.f });
    r.turn = nextAlive(G, p);
    return null;
  }
  const prev = last(G);
  if (a.t === 'dudo') {
    if (!canDudo(G, p)) throw new Error('no bid to doubt');
    const n = countFace(G.hands, prev.f, wildOn(G)), ok = n >= prev.q;
    return settle(G, { t: 'dudo', by: p, bid: prev, n, ok, loser: ok ? p : prev.p, delta: -1 });
  }
  if (a.t === 'calza') {
    if (!canCalza(G, p)) throw new Error('calza not allowed');
    const n = countFace(G.hands, prev.f, wildOn(G)), ok = n === prev.q;
    return settle(G, { t: 'calza', by: p, bid: prev, n, ok, loser: ok ? -1 : p, gainer: ok && G.dice[p] < G.R.dice ? p : -1, delta: ok ? 1 : -1 });
  }
  throw new Error('bad action');
}
function settle(G, res) {
  const r = G.round;
  res.hands = G.hands.map(h => h.slice()); res.wild = wildOn(G); res.pal = r.pal;
  res.diceBefore = G.dice.slice();
  if (res.loser >= 0) {
    const L = res.loser; G.dice[L]--;
    if (G.dice[L] === 1 && G.R.palifico && !G.palUsed[L]) { G.palUsed[L] = true; G.palNext = L; }
    if (G.dice[L] === 0) { G.out.push(L); res.elim = L; }
    G.starter = G.dice[L] > 0 ? L : nextAlive(G, L);
  } else {
    if (res.gainer >= 0) G.dice[res.gainer]++;
    G.starter = res.by;
  }
  res.diceAfter = G.dice.slice();
  r.res = res; G.rounds.push({ no: r.no, start: r.start, pal: r.pal, bids: r.bids.slice(), res, hands: res.hands });
  G.phase = 'reveal';
  if (nAlive(G) <= 1) { G.over = true; G.winner = G.dice.findIndex(d => d > 0); G.phase = 'over'; }
  return res;
}
// finishing order: winner first, then the eliminated in reverse order
function places(G) { const o = G.out.slice().reverse(); if (G.winner >= 0) o.unshift(G.winner); return o; }

/* ---------------- probability ---------------- */
const BIN = (() => { const c = [[1]]; for (let n = 1; n <= 40; n++) { c[n] = [1]; for (let k = 1; k < n; k++) c[n][k] = c[n - 1][k - 1] + c[n - 1][k]; c[n][n] = 1; } return c; })();
function binom(n, k) { if (k < 0 || k > n) return 0; if (n <= 40) return BIN[n][k]; let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; }
// distribution of matches among n unknown dice, each matching with probability p
function binDist(n, p) { const d = []; for (let k = 0; k <= n; k++) d.push(binom(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k)); return d; }
const pMatch = (f, wild) => wild && f !== 1 ? 1 / 3 : 1 / 6;
function atLeast(dist, q) { let s = 0; for (let k = Math.max(0, q); k < dist.length; k++) s += dist[k]; return Math.min(1, s); }
function conv(a, b) { const o = new Array(a.length + b.length - 1).fill(0); for (let i = 0; i < a.length; i++) if (a[i]) for (let j = 0; j < b.length; j++) o[i + j] += a[i] * b[j]; return o; }
// P(at least q | you see `mine` of the bid face among your dice, n unknown dice)
function pAtLeast(q, mine, n, f, wild) { return atLeast(binDist(n, pMatch(f, wild)), q - mine); }
function pExact(q, mine, n, f, wild) { const k = q - mine; return k < 0 || k > n ? 0 : binDist(n, pMatch(f, wild))[k]; }

/* ---------------- hands as multisets (for the Bayesian reading of bids) ----------------
   every multiset of n dice: { c: [_, n1..n6], p: prior } — 252 hands of five dice */
const HANDS = [];
(function () {
  const fact = [1, 1, 2, 6, 24, 120, 720];
  for (let n = 0; n <= 5; n++) {
    const L = []; const c = [0, 0, 0, 0, 0, 0, 0];
    (function rec(face, left) {
      if (face === 6) { c[6] = left; let m = fact[n]; for (let f = 1; f <= 6; f++) m /= fact[c[f]]; L.push({ c: c.slice(), p: m / Math.pow(6, n) }); return; }
      for (let k = 0; k <= left; k++) { c[face] = k; rec(face + 1, left - k); }
    })(1, n);
    HANDS[n] = L;
  }
})();
function handKey(c) { return c.slice(1).join(''); }
function countsOf(hand) { const c = [0, 0, 0, 0, 0, 0, 0]; for (const d of hand) c[d]++; return c; }

root.LD = { DEF, PRESETS, rulesOf, newGame, startRound, nextAlive, alive, nAlive, total, wildOn, last, countFace, supportOf,
  bidCtx, minQ, legalBid, legalBids, canCalza, canDudo, act, places,
  binom, binDist, pMatch, atLeast, conv, pAtLeast, pExact, HANDS, handKey, countsOf };
})(typeof window !== 'undefined' ? window : globalThis);
