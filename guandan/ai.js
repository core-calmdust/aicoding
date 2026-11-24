/* 掼蛋 — the computer players and the coach (guandan/ai.js). No DOM.
   plan(hand, L): splits a hand into plays (bombs, straight flushes, sequences, full houses, sets, pairs, singles) with the fewest
   "turns" — the cost is the number of plays still needed, minus what the strong plays (bombs, top cards) can win back.
   decide(S, seat, level): what to play now. Levels: 1 easy · 2 normal · 3 strong · 4 expert (3 + Monte Carlo look-ahead late in a hand).
   explain: the coach reads the same decision with a reason code. */
(function (root) {
'use strict';
const GD = root.GD || (typeof require !== 'undefined' ? require('./engine.js') : null);
const { SJ, BJ, natOf, isWild, rv, val, POS, team, partner, nextSeat, tier, isBomb, beats, identify, gen, analyze } = GD;

/* ---------- value of one play (lower = fewer turns needed) ---------- */
const CTL = {
  single: k => k >= 17 ? .95 : k >= 16 ? .8 : k >= 15 ? .55 : k >= 14 ? .35 : k >= 13 ? .2 : k >= 12 ? .1 : 0,
  pair: k => k >= 17 ? .95 : k >= 16 ? .9 : k >= 15 ? .65 : k >= 14 ? .45 : k >= 13 ? .3 : k >= 12 ? .15 : 0,
  triple: k => k >= 15 ? .6 : k >= 14 ? .45 : k >= 13 ? .3 : k >= 11 ? .12 : 0,
  full: k => k >= 15 ? .65 : k >= 14 ? .5 : k >= 13 ? .35 : k >= 11 ? .15 : .05,
  straight: k => k >= 14 ? .55 : k >= 13 ? .4 : k >= 11 ? .2 : .1,
  tube: k => k >= 14 ? .6 : k >= 13 ? .45 : k >= 11 ? .25 : .12,
  plate: k => k >= 14 ? .65 : k >= 13 ? .5 : k >= 11 ? .3 : .15,
};
function gv(t, k, n) {
  if (t === 'kings') return -1.25;
  if (t === 'sflush') return -.8;
  if (t === 'bomb') return n >= 6 ? -.9 - .05 * (n - 6) : n === 5 ? -.7 : -.55;
  return 1 - CTL[t](k) + (t === 'single' ? .06 : 0) + (15 - Math.min(15, k)) * .004;
}

/* ---------- planning by counts (natural cards 2..14, wilds W, jokers) ---------- */
const SEQS = [];
for (let st = 1; st <= 10; st++) SEQS.push({ t: 'straight', st, len: 5, per: 1, k: st + 4 });
for (let st = 1; st <= 12; st++) SEQS.push({ t: 'tube', st, len: 3, per: 2, k: st + 2 });
for (let st = 1; st <= 13; st++) SEQS.push({ t: 'plate', st, len: 2, per: 3, k: st + 1 });
const MEMO = new Map();
function basic(c, W, sj, bj, L) {
  const g = [];   // {t,k,n,need:[[r,m]],w}
  const cc = c.slice();
  // leftover wilds: put each where it saves the most (a single → pair, pair → set, set → bomb, bomb bigger) or keep it alone
  const groupCost = m => m >= 4 ? gv('bomb', 0, m) : m === 3 ? gv('triple', 0, 0) : m === 2 ? gv('pair', 0, 0) : m === 1 ? gv('single', 0, 0) : 0;
  const rkCost = (r, m) => m <= 0 ? 0 : m >= 4 ? gv('bomb', rv(r, L), m) : gv(m === 3 ? 'triple' : m === 2 ? 'pair' : 'single', rv(r, L), m);
  const wAt = new Array(15).fill(0);
  let w = W, wAlone = 0;
  while (w > 0) {
    let best = -1, bd = gv('single', 15, 1) - .05;   // keeping it alone (a level card single)
    if (wAlone === 1) bd = gv('pair', 15, 2) - gv('single', 15, 1);
    for (let r = 2; r <= 14; r++) {
      const m = cc[r] + wAt[r]; if (!m || m >= 10) continue;
      const d = rkCost(r, m + 1) - rkCost(r, m);
      if (d < bd - 1e-9) { bd = d; best = r; }
    }
    if (best < 0) wAlone++; else wAt[best]++;
    w--;
  }
  for (let r = 2; r <= 14; r++) {
    const m = cc[r] + wAt[r]; if (!m) continue;
    const t = m >= 4 ? 'bomb' : m === 3 ? 'triple' : m === 2 ? 'pair' : 'single';
    g.push({ t, k: rv(r, L), n: m, need: [[r, cc[r]]], w: wAt[r] });
  }
  if (wAlone === 2) g.push({ t: 'pair', k: 15, n: 2, need: [], w: 2 });
  else if (wAlone === 1) g.push({ t: 'single', k: 15, n: 1, need: [], w: 1 });
  if (sj === 2 && bj === 2) g.push({ t: 'kings', k: 0, n: 4, need: [[SJ, 2], [BJ, 2]], w: 0 });
  else {
    if (sj === 2) g.push({ t: 'pair', k: SJ, n: 2, need: [[SJ, 2]], w: 0 }); else if (sj === 1) g.push({ t: 'single', k: SJ, n: 1, need: [[SJ, 1]], w: 0 });
    if (bj === 2) g.push({ t: 'pair', k: BJ, n: 2, need: [[BJ, 2]], w: 0 }); else if (bj === 1) g.push({ t: 'single', k: BJ, n: 1, need: [[BJ, 1]], w: 0 });
  }
  // full houses: the weakest pairs ride on the sets
  const tri = g.filter(x => x.t === 'triple').sort((a, b) => a.k - b.k);
  const prs = g.filter(x => x.t === 'pair' && x.k < SJ && gv('pair', x.k, 2) >= .5).sort((a, b) => a.k - b.k);
  const nf = Math.min(tri.length, prs.length);
  for (let i = 0; i < nf; i++) { const T = tri[i], P = prs[i]; T.t = 'full'; T.n = 5; T.need = T.need.concat(P.need); T.w += P.w; T.pair = P.k; P.dead = 1; }
  const out = g.filter(x => !x.dead);
  let cost = 0; for (const x of out) cost += gv(x.t, x.k, x.n);
  return { cost, groups: out };
}
function countPlan(c, W, sj, bj, L, budget) {
  const key = L + '|' + c.join(',') + '|' + W + '|' + sj + bj;
  const m = MEMO.get(key); if (m) return m;
  let best = basic(c, W, sj, bj, L);
  if (budget.n-- > 0) {
    for (const s of SEQS) {
      let miss = 0, ok = true;
      for (let p = s.st; p < s.st + s.len; p++) { const r = POS(p); if (c[r] < s.per) { miss += s.per - c[r]; if (miss > W) { ok = false; break; } } }
      if (!ok) continue;
      // a sequence that needs a wild only where it does not tear a set apart (pruning)
      const c2 = c.slice(), need = [];
      for (let p = s.st; p < s.st + s.len; p++) { const r = POS(p), u = Math.min(s.per, c[r]); c2[r] -= u; need.push([r, u]); }
      const sub = countPlan(c2, W - miss, sj, bj, L, budget);
      const cost = sub.cost + gv(s.t, s.k, s.len * s.per);
      if (cost < best.cost - 1e-9) best = { cost, groups: sub.groups.concat([{ t: s.t, k: s.k, n: s.len * s.per, need, w: miss }]) };
    }
  }
  if (MEMO.size > 60000) MEMO.clear();
  MEMO.set(key, best);
  return best;
}
const PLANS = new Map();
function plan(hand, L) {
  const pk = L + ':' + hand.slice().sort((a, b) => a - b).join(',');
  const hit = PLANS.get(pk); if (hit) return hit;
  const A = analyze(hand, L), W = A.wild.length;
  // straight flushes (natural cards + wilds); try none, one or two of them
  const sf = [];
  for (let s = 0; s < 4; s++) for (let st = 1; st <= 10; st++) {
    const ids = []; let w = 0;
    for (let p = st; p < st + 5; p++) { const a = A.bs[s][POS(p)]; if (a.length) ids.push(a[0]); else w++; }
    if (w <= W) sf.push({ ids, w, k: st + 4 });
  }
  const budget = { n: 2500 };
  const run = (used, w) => {
    const c = A.cnt.slice(); for (const id of used) c[natOf(id)]--;
    return countPlan(c, W - w, A.sj.length, A.bj.length, L, budget);
  };
  let best = run([], 0), bestSf = [];
  const tryCombo = list => {
    const ids = [].concat(...list.map(x => x.ids)), w = list.reduce((a, x) => a + x.w, 0);
    if (w > W || new Set(ids).size !== ids.length) return;
    const r = run(ids, w), cost = r.cost + list.length * gv('sflush', 0, 5);
    if (cost < best.cost - 1e-9) { best = { cost, groups: r.groups }; bestSf = list; }
  };
  for (let i = 0; i < sf.length; i++) { tryCombo([sf[i]]); for (let j = i + 1; j < sf.length; j++) tryCombo([sf[i], sf[j]]); }
  const groups = bestSf.map(x => ({ t: 'sflush', k: x.k, n: 5, ids: x.ids, w: x.w })).concat(best.groups);
  const P = { cost: best.cost, groups };
  if (PLANS.size > 20000) PLANS.clear();
  PLANS.set(pk, P);
  return P;
}
// the plan as real plays (card ids), every card used once
function realize(hand, L, P) {
  P = P || plan(hand, L);
  const A = analyze(hand, L), pool = A.by.map(a => a.slice()), wild = A.wild.slice(), sj = A.sj.slice(), bj = A.bj.slice(), used = new Set();
  const take = (r, m) => { const src = r === SJ ? sj : r === BJ ? bj : pool[r]; const out = []; while (out.length < m && src.length) { const id = src.shift(); if (!used.has(id)) { out.push(id); used.add(id); } } return out; };
  const out = [];
  const ord = { sflush: 0, straight: 1, tube: 1, plate: 1, kings: 2, bomb: 2, full: 3, triple: 4, pair: 5, single: 6 };
  for (const g of P.groups.slice().sort((a, b) => ord[a.t] - ord[b.t])) {
    let ids = [];
    if (g.ids) { for (const id of g.ids) { used.add(id); const r = natOf(id), a = pool[r], i = a.indexOf(id); if (i >= 0) a.splice(i, 1); } ids = g.ids.slice(); }
    else for (const [r, m] of g.need) ids = ids.concat(take(r, m));
    for (let i = 0; i < g.w; i++) { const id = wild.shift(); if (id != null) { ids.push(id); used.add(id); } }
    out.push({ t: g.t, n: ids.length, k: g.k, ids });
  }
  return out;
}

/* ---------- what is still unseen (for card counting) ---------- */
function unseen(S, s) {
  const seen = new Set(S.hands[s].concat(S.played)), U = { cnt: new Array(18).fill(0), W: 0, n: 0 };
  for (let id = 0; id < 108; id++) { if (seen.has(id)) continue; U.n++; if (isWild(id, S.L)) U.W++; else U.cnt[natOf(id)]++; }
  return U;
}
// could the unseen cards make a higher play of the same type (bombs aside)?
function isBoss(g, U, L) {
  if (isBomb(g)) return true;
  const can = (r, m) => r >= SJ ? U.cnt[r] >= m : U.cnt[r] + U.W >= m && (U.cnt[r] > 0 || r === L);
  if (g.t === 'single') { if (g.k < 15 && U.W) return false; for (let r = 2; r <= 17; r++) if (r !== 15 && U.cnt[r] && rv(r, L) > g.k) return false; return true; }
  if (g.t === 'pair' || g.t === 'triple' || g.t === 'full') {
    const m = g.t === 'pair' ? 2 : 3;
    for (let r = 2; r <= 17; r++) { if (r === 15) continue; if (rv(r, L) > g.k && can(r, m)) return false; }
    if (m === 2 && g.k < 15 && U.W >= 2) return false;
    return true;
  }
  const s = SEQS.filter(x => x.t === g.t && x.k > g.k);
  for (const x of s) { let miss = 0; for (let p = x.st; p < x.st + x.len; p++) miss += Math.max(0, x.per - U.cnt[POS(p)]); if (miss <= U.W) return false; }
  return true;
}

/* ---------- the decision ---------- */
const minus = (hand, ids) => { const s = new Set(ids); return hand.filter(x => !s.has(x)); };
const actives = S => [0, 1, 2, 3].filter(x => S.hands[x].length > 0);
function leadScore(g, ctx) {
  // lead the low plays first; plays with more cards first (they are harder to follow); keep the strong ones
  let sc = g.k - g.n * .45 + (g.t === 'single' ? .6 : 0);
  if (ctx.boss && ctx.boss(g)) sc += 7;
  if (g.t === 'full' && g.k >= 13) sc += 3;
  for (const d of ctx.danger) if (d <= 5 && g.n === d || (d <= 2 && g.n <= d)) sc += 30;   // an opponent about to go out with exactly this shape
  return sc;
}
function decide(S, s, level, rng) {
  rng = rng || Math.random;
  const r = decideX(S, s, level, rng);
  return r.c;
}
function decideX(S, s, level, rng) {
  rng = rng || Math.random;
  if (level >= 4) { const mc = mcDecide(S, s, rng); if (mc) return mc; }
  // easy: the normal player, but one decision in three is a careless one
  if (level <= 1 && rng() >= .38) level = 2;
  return S.last ? follow(S, s, level, rng) : lead(S, s, level, rng);
}
function oppDanger(S, s) { return actives(S).filter(x => team(x) !== team(s)).map(x => S.hands[x].length).sort((a, b) => a - b); }

function lead(S, s, level, rng) {
  const L = S.L, hand = S.hands[s];
  const all = identify(hand, L); if (all.length) return { c: all.sort((a, b) => tier(a) - tier(b))[0], why: 'finish' };   // the whole hand at once
  if (level <= 1) {
    const gs = gen(hand, L).filter(x => !isBomb(x));
    if (!gs.length) return { c: gen(hand, L)[0], why: 'lead' };
    gs.sort((a, b) => a.k - b.k); const pick = gs[Math.floor(rng() * Math.min(3, gs.length))];
    return { c: pick, why: 'lead-low' };
  }
  const P = plan(hand, L), groups = realize(hand, L, P);
  const nb = groups.filter(g => !isBomb(g)), bombs = groups.filter(isBomb);
  if (!nb.length) return { c: bombs.sort((a, b) => tier(a) - tier(b) || a.k - b.k)[0], why: 'bombs-only' };
  const danger = oppDanger(S, s), pa = partner(s), pn = S.hands[pa].length;
  const U = level >= 3 ? unseen(S, s) : null;
  const boss = U ? (g => isBoss(g, U, L)) : (g => g.k >= 16);
  // the way out: everything but one play is unbeatable → play the strong ones first, the last one at the end
  if (level >= 3) {
    const weak = nb.filter(g => !boss(g));
    if (weak.length <= 1 && nb.length > 1) {
      const strong = nb.filter(g => boss(g)).sort((a, b) => b.n - a.n || a.k - b.k);
      if (strong.length) return { c: strong[0], why: 'route' };
    }
    if (weak.length === 1 && nb.length === 1 && bombs.length) return { c: weak[0], why: 'route' };
  }
  // feed your partner when they are about to go out (and the opponents are not closer)
  if (level >= 3 && pn > 0 && pn <= 2 && (!danger.length || danger[0] > pn)) {
    if (pn === 1) { const lo = hand.slice().sort((a, b) => val(a, L) - val(b, L))[0]; return { c: identify([lo], L)[0], why: 'feed' }; }
    const prs = gen(hand, L).filter(x => x.t === 'pair').sort((a, b) => a.k - b.k);
    if (prs.length && prs[0].k <= 9) return { c: prs[0], why: 'feed' };
  }
  const ctx = { danger: level >= 3 ? danger : danger.filter(d => d <= 1), boss: level >= 3 ? boss : null };
  const sorted = nb.slice().sort((a, b) => leadScore(a, ctx) - leadScore(b, ctx));
  let pick = sorted[0];
  // an opponent with one card left: never lead a small single
  if (danger.length && danger[0] === 1 && pick.t === 'single') {
    const other = sorted.find(g => g.t !== 'single');
    if (other) pick = other; else pick = nb.filter(g => g.t === 'single').sort((a, b) => b.k - a.k)[0];
    return { c: pick, why: 'block' };
  }
  return { c: pick, why: danger.length && danger[0] <= 3 ? 'block' : 'lead-low' };
}

function follow(S, s, level, rng) {
  const L = S.L, hand = S.hands[s], tgt = S.last.c, from = S.last.s;
  const cands = gen(hand, L, { beat: tgt });
  if (!cands.length) return { c: null, why: 'cannot' };
  const fin = cands.find(c => c.n === hand.length); if (fin) return { c: fin, why: 'finish' };
  const mate = team(from) === team(s);
  if (level <= 1) {
    if (mate) return rng() < .8 ? { c: null, why: 'partner' } : { c: cands.sort((a, b) => tier(a) - tier(b) || a.k - b.k)[0], why: 'beat' };
    const nb = cands.filter(c => !isBomb(c)).sort((a, b) => a.k - b.k);
    if (nb.length && rng() < .8) return { c: nb[0], why: 'beat' };
    const bo = cands.filter(isBomb); const dg = oppDanger(S, s);
    if (bo.length && dg.length && dg[0] <= 3 && rng() < .5) return { c: bo.sort((a, b) => tier(a) - tier(b) || a.k - b.k)[0], why: 'bomb-stop' };
    return { c: null, why: 'pass' };
  }
  const base = plan(hand, L).cost;
  const ev = cands.map(c => { const rest = minus(hand, c.ids); const after = rest.length ? plan(rest, L).cost : -5; return { c, after, gain: base - after }; });
  const nb = ev.filter(e => !isBomb(e.c)).sort((a, b) => a.after - b.after || a.c.k - b.c.k);
  const bo = ev.filter(e => isBomb(e.c)).sort((a, b) => tier(a.c) - tier(b.c) || a.c.k - b.c.k);
  const danger = oppDanger(S, s), dl = danger.length ? danger[0] : 99, fromN = S.hands[from].length;
  const restGroups = e => { const rest = minus(hand, e.c.ids); return rest.length ? realize(rest, L).filter(g => !isBomb(g)).length : 0; };
  if (mate) {
    // your partner's play: let it go — unless you can unload a small play cheaply, or the partner is already out (you get the lead)
    if (!S.hands[from].length) return { c: null, why: 'partner-out' };
    if (level >= 3 && nb.length && nb[0].gain >= .8 && (tgt.t === 'single' || tgt.t === 'pair') && tgt.k <= 7 && nb[0].c.k <= 10 && hand.length > 6 && S.hands[from].length > 6)
      return { c: nb[0].c, why: 'unload' };
    // two plays left and one of them takes this trick: go
    if (level >= 3 && nb.length && restGroups(nb[0]) <= 1 && nb[0].gain > 0 && S.hands[from].length > 3) return { c: nb[0].c, why: 'finish-route' };
    return { c: null, why: 'partner' };
  }
  // an opponent's play
  const urgent = dl <= 4 || fromN <= 4;
  if (nb.length) {
    const e = nb[0];
    if (e.gain >= .45) return { c: e.c, why: 'beat' };
    if (urgent && e.gain > -1.2) return { c: e.c, why: 'stop' };
    if (level >= 3 && e.gain > -.35 && !(isBossCheap(e.c, S, s, level))) return { c: e.c, why: 'beat-break' };
    if (level <= 2 && e.gain > -.2) return { c: e.c, why: 'beat-break' };
  }
  if (bo.length) {
    const b = bo[0], left = restGroups(b);
    const useB = urgent || left <= 1 || (level >= 3 && left <= 2 && b.after < 1.2) || (level >= 3 && isBomb(tgt) && dl <= 8) ||
      (level >= 3 && tgt.n >= 5 && fromN <= 10) || (level >= 3 && hand.length <= 8 && left <= 2);
    if (useB) return { c: b.c, why: urgent ? 'bomb-stop' : 'bomb-route' };
  }
  return { c: null, why: nb.length ? 'save' : 'cannot-cheap' };
}
// a high control card (joker, level card) spent on a low play is wasteful early in the hand
function isBossCheap(c, S, s, level) { return c.t === 'single' && c.k >= 16 && S.last && S.last.c.k <= 10 && S.hands[s].length > 10; }

/* ---------- Monte Carlo (expert): sample the hidden hands, play out with the strong policy ---------- */
function mcDecide(S, s, rng) {
  const tot = S.hands.reduce((a, h) => a + h.length, 0);
  if (tot > 44 || S.phase !== 'play') return null;
  const L = S.L, hand = S.hands[s];
  // candidates: the strong policy's choice, pass, and the cheapest other plays
  const base = S.last ? follow(S, s, 3, rng) : lead(S, s, 3, rng);
  if (base.why === 'finish') return base;
  const pool = S.last ? gen(hand, L, { beat: S.last.c }) : realize(hand, L).concat(gen(hand, L).filter(x => x.t === 'single' || x.t === 'pair'));
  const key = c => c ? c.t + c.n + ':' + c.k : 'pass';
  const cand = new Map(); cand.set(key(base.c), base.c);
  if (S.last) cand.set('pass', null);
  for (const c of pool.sort((a, b) => tier(a) - tier(b) || a.k - b.k)) { if (cand.size >= 6) break; if (!cand.has(key(c))) cand.set(key(c), c); }
  if (cand.size <= 1) return base;
  const list = [...cand.values()], score = list.map(() => 0), n = list.map(() => 0);
  const t0 = Date.now(), lim = 260;
  let it = 0;
  while (Date.now() - t0 < lim && it < 400) {
    const D = determinize(S, s, rng);
    for (let i = 0; i < list.length; i++) { score[i] += rollout(D, s, list[i], rng); n[i]++; }
    it++;
  }
  if (it < 6) return base;
  let bi = 0; for (let i = 1; i < list.length; i++) if (score[i] / n[i] > score[bi] / n[bi] + 1e-9) bi = i;
  const bk = list.indexOf(base.c);
  // keep the strong policy's choice unless another is clearly better
  if (bk >= 0 && score[bi] / n[bi] - score[bk] / n[bk] < .12) return base;
  return { c: list[bi], why: list[bi] ? (S.last ? 'mc-beat' : 'mc-lead') : 'mc-pass' };
}
function determinize(S, s, rng) {
  const own = new Set(S.hands[s]), pl = new Set(S.played), rest = [];
  for (let id = 0; id < 108; id++) if (!own.has(id) && !pl.has(id)) rest.push(id);
  for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
  const hands = S.hands.map((h, x) => x === s ? h.slice() : null); let p = 0;
  for (let x = 0; x < 4; x++) if (x !== s) { hands[x] = rest.slice(p, p + S.hands[x].length); p += S.hands[x].length; }
  return { L: S.L, lt: S.lt, hands, out: S.out.slice(), turn: S.turn, last: S.last ? { s: S.last.s, c: S.last.c } : null, passN: S.passN, trick: S.trick, log: [], played: S.played.slice(), phase: 'play' };
}
function rollout(D0, s, first, rng) {
  const D = { L: D0.L, lt: D0.lt, hands: D0.hands.map(h => h.slice()), out: D0.out.slice(), turn: D0.turn, last: D0.last, passN: D0.passN, trick: D0.trick, log: [], played: D0.played.slice(), phase: 'play' };
  try {
    GD.act(D, s, first);
    let guard = 400;
    while (D.phase === 'play' && guard-- > 0) {
      const x = D.turn, r = D.last ? follow(D, x, 3, rng) : lead(D, x, 3, rng);
      GD.act(D, x, r.c);
    }
  } catch (e) { return 0; }
  if (D.phase !== 'end') return 0;
  const f = D.order, w = team(f[0]), pl = f.indexOf(partner(f[0])), up = pl === 1 ? 3 : pl === 2 ? 2 : 1;
  return (w === team(s) ? up : -up) / 3;
}

/* ---------- tribute / return ---------- */
function chooseTribute(hand, L, level) {
  const ch = GD.tributeChoices(hand, L); if (ch.length <= 1 || level <= 1) return ch[0];
  let best = ch[0], bc = 1e9; for (const id of ch) { const c = plan(minus(hand, [id]), L).cost; if (c < bc) { bc = c; best = id; } }
  return best;
}
function chooseReturn(hand, L, level) {
  const ch = GD.returnChoices(hand, L);
  if (level <= 1) return ch.slice().sort((a, b) => val(a, L) - val(b, L))[0];
  let best = ch[0], bc = 1e9;
  for (const id of ch) { if (isWild(id, L)) continue; const c = plan(minus(hand, [id]), L).cost + val(id, L) * .01; if (c < bc) { bc = c; best = id; } }
  return best;
}

/* ---------- the coach: the strong decision + the plan of your hand ---------- */
function coach(S, s) {
  const L = S.L, hand = S.hands[s];
  const r = S.last ? follow(S, s, 3, Math.random) : lead(S, s, 3, Math.random);
  const P = plan(hand, L), groups = realize(hand, L, P);
  const nb = groups.filter(g => !isBomb(g)).length, nbomb = groups.length - nb;
  return { c: r.c, why: r.why, groups, turns: nb, bombs: nbomb, cost: P.cost };
}

const api = { plan, realize, decide, decideX, coach, chooseTribute, chooseReturn, unseen, isBoss, gv, _memo: () => MEMO.size };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.GDAI = api;
})(typeof self !== 'undefined' ? self : this);
