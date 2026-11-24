/* 掼蛋 — rules engine (guandan/engine.js). No DOM: used by the page, the tests (tools/test.js) and the AI (ai.js).
   Cards: 108 ids (two decks with jokers). id % 54 = b: b < 52 → suit = floor(b / 13) (0 ♠, 1 ♥, 2 ♦, 3 ♣), rank = b % 13 + 1 (1 = A);
   b = 52 small joker, 53 big joker. "nat" = natural rank 2..14 (A = 14), 16 small joker, 17 big joker.
   Seats 0..3, play order 0 → 1 → 2 → 3 (counter-clockwise on screen: you, right, top, left). Teams: seat % 2 (0 & 2, 1 & 3).
   Rules follow the common competition rules (掼蛋竞赛规则): see claude/guandan-spec.md. */
(function (root) {
'use strict';
const SJ = 16, BJ = 17;
const suitOf = id => { const b = id % 54; return b < 52 ? Math.floor(b / 13) : 4; };
const natOf = id => { const b = id % 54; if (b >= 52) return b === 52 ? SJ : BJ; const r = b % 13 + 1; return r === 1 ? 14 : r; };
const isWild = (id, L) => { const b = id % 54; return b < 52 && Math.floor(b / 13) === 1 && natOf(id) === L; };
const rv = (n, L) => n >= SJ ? n : n === L ? 15 : n;            // value of a natural rank for singles / pairs / sets / bombs
const val = (id, L) => rv(natOf(id), L);
const POS = p => p === 1 ? 14 : p;                                // sequence position → natural rank (1 = A low)
const team = s => s % 2, partner = s => (s + 2) % 4, nextSeat = s => (s + 1) % 4;
const TYPES = ['single', 'pair', 'triple', 'full', 'straight', 'tube', 'plate', 'bomb', 'sflush', 'kings'];

/* the power class of a combination: bombs beat everything below them */
function tier(c) {
  if (c.t === 'kings') return 100;
  if (c.t === 'sflush') return 5.5;     // 6+ bomb > straight flush > 5 bomb > 4 bomb
  if (c.t === 'bomb') return c.n;
  return 0;
}
const isBomb = c => tier(c) > 0;
function beats(a, b) {
  if (!b) return true;
  const ta = tier(a), tb = tier(b);
  if (ta !== tb) return ta > tb;
  if (ta === 0) return a.t === b.t && a.n === b.n && a.k > b.k;
  if (a.t === 'kings') return false;
  return a.k > b.k;
}

/* ---------- what can a set of cards be? (all readings; the wild hearts of the level can be any non-joker card) ---------- */
function identify(ids, L) {
  const n = ids.length, out = [], seen = new Set();
  if (!n) return out;
  let W = 0, sj = 0, bj = 0;
  const cnt = new Array(15).fill(0), suits = new Set();
  for (const id of ids) {
    if (isWild(id, L)) { W++; continue; }
    const r = natOf(id);
    if (r === SJ) sj++; else if (r === BJ) bj++; else { cnt[r]++; suits.add(suitOf(id)); }
  }
  const ranks = []; for (let r = 2; r <= 14; r++) if (cnt[r]) ranks.push(r);
  const add = (t, k) => { const key = t + ':' + k; if (seen.has(key)) return; seen.add(key); out.push({ t, n, k, ids: ids.slice() }); };
  const J = sj + bj;
  if (J) {
    if (n === 4 && sj === 2 && bj === 2) add('kings', 0);
    else if (n === 1) add('single', bj ? BJ : SJ);
    else if (n === 2 && (sj === 2 || bj === 2)) add('pair', bj ? BJ : SJ);
    else if (n === 5 && (sj === 2 || bj === 2) && J === 2) {   // a full house whose pair is two equal jokers
      if (ranks.length === 1 && cnt[ranks[0]] + W === 3) add('full', rv(ranks[0], L));
    }
    return out;
  }
  if (n === 1) add('single', W ? 15 : rv(ranks[0], L));
  if (ranks.length <= 1) {
    const r = ranks.length ? ranks[0] : L, k = rv(r, L);
    if (n === 2) add('pair', k); else if (n === 3) add('triple', k); else if (n >= 4 && n <= 10) add('bomb', k);
  }
  if (n === 5) {
    // full house: three of a and two of b (wilds fill)
    for (const a of ranks.length ? ranks.concat(W ? [L] : []) : [L]) for (let b = 2; b <= 14; b++) {
      if (a === b || cnt[a] > 3 || cnt[b] > 2) continue;
      if (ranks.some(r => r !== a && r !== b)) continue;
      if (Math.max(0, 3 - cnt[a]) + Math.max(0, 2 - cnt[b]) === W) add('full', rv(a, L));
    }
    for (let st = 1; st <= 10; st++) if (seqFits(cnt, st, 5, 1)) { add('straight', st + 4); if (suits.size <= 1) add('sflush', st + 4); }
  }
  if (n === 6) {
    for (let st = 1; st <= 12; st++) if (seqFits(cnt, st, 3, 2)) add('tube', st + 2);
    for (let st = 1; st <= 13; st++) if (seqFits(cnt, st, 2, 3)) add('plate', st + 1);
  }
  return out;
}
// every natural card fits inside positions st..st+len-1 with at most `per` of each (the wilds fill the rest)
function seqFits(cnt, st, len, per) {
  for (let r = 2; r <= 14; r++) {
    if (!cnt[r]) continue;
    const p = r === 14 && st === 1 ? 1 : r;
    if (p < st || p > st + len - 1 || cnt[r] > per) return false;
  }
  return true;
}

/* ---------- the cards of a hand by rank / suit ---------- */
function analyze(hand, L) {
  const by = [], bs = [[], [], [], []];
  for (let r = 0; r < 15; r++) { by.push([]); for (let s = 0; s < 4; s++) bs[s].push([]); }
  const A = { by, bs, wild: [], sj: [], bj: [] };
  for (const id of hand) {
    if (isWild(id, L)) { A.wild.push(id); continue; }
    const r = natOf(id);
    if (r === SJ) A.sj.push(id); else if (r === BJ) A.bj.push(id); else { by[r].push(id); bs[suitOf(id)][r].push(id); }
  }
  A.cnt = by.map(a => a.length);
  return A;
}

/* ---------- every distinct play a hand can make (one set of cards per type / size / key; fewest wilds) ---------- */
function gen(hand, L, o) {
  o = o || {};
  const A = analyze(hand, L), W = A.wild.length, out = [], seen = new Set(), c = A.cnt;
  const push = (t, k, ids) => { const n = ids.length, key = t + ':' + n + ':' + k; if (seen.has(key)) return; seen.add(key); out.push({ t, n, k, ids }); };
  const same = (r, m) => { const u = Math.min(c[r], m), w = m - u; if (w > W || w < 0) return null; return A.by[r].slice(0, u).concat(A.wild.slice(0, w)); };
  // singles (a lone wild is the level card)
  for (let r = 2; r <= 14; r++) if (c[r]) push('single', rv(r, L), [A.by[r][0]]);
  if (W && !c[L]) push('single', 15, [A.wild[0]]);
  if (A.sj.length) push('single', SJ, [A.sj[0]]);
  if (A.bj.length) push('single', BJ, [A.bj[0]]);
  // pairs, triples
  for (let r = 2; r <= 14; r++) {
    if (!c[r] && r !== L) continue;
    for (const [m, t] of [[2, 'pair'], [3, 'triple']]) { const ids = same(r, m); if (ids && (c[r] || r === L)) push(t, rv(r, L), ids); }
  }
  if (A.sj.length === 2) push('pair', SJ, A.sj.slice());
  if (A.bj.length === 2) push('pair', BJ, A.bj.slice());
  // full houses: each triple with the cheapest pair
  for (let a = 2; a <= 14; a++) {
    if (!c[a] && a !== L) continue;
    const ua = Math.min(3, c[a]), wa = 3 - ua; if (wa > W || (!c[a] && a !== L)) continue;
    let best = null;
    // the pair: an exact pair first, then one taken from a triple, then from a bomb (lowest rank each time)
    for (const want of [2, 3, 99]) for (let b = 2; b <= 14 && !best; b++) {
      if (b === a || c[b] < 2 || (want === 2 && c[b] !== 2) || (want === 3 && c[b] !== 3) || (want === 99 && c[b] < 4)) continue;
      if (wa > W) continue;
      best = A.by[a].slice(0, ua).concat(A.by[b].slice(0, 2), A.wild.slice(0, wa));
    }
    for (let b = 2; b <= 14 && !best; b++) {   // a pair made with a wild
      if (b === a) continue;
      const ub = Math.min(2, c[b]), wb = 2 - ub; if (ub === 0 || wa + wb > W) continue;
      best = A.by[a].slice(0, ua).concat(A.by[b].slice(0, ub), A.wild.slice(0, wa + wb));
    }
    if (!best && A.sj.length === 2 && wa <= W) best = A.by[a].slice(0, ua).concat(A.wild.slice(0, wa), A.sj);
    if (!best && A.bj.length === 2 && wa <= W) best = A.by[a].slice(0, ua).concat(A.wild.slice(0, wa), A.bj);
    if (best) push('full', rv(a, L), best);
  }
  // sequences
  const seq = (st, len, per) => {
    let ids = [], w = 0;
    for (let p = st; p < st + len; p++) { const r = POS(p), u = Math.min(per, c[r]); ids = ids.concat(A.by[r].slice(0, u)); w += per - u; }
    if (w > W) return null;
    return ids.concat(A.wild.slice(0, w));
  };
  for (let st = 1; st <= 10; st++) { const ids = seq(st, 5, 1); if (ids) push('straight', st + 4, ids); }
  for (let st = 1; st <= 12; st++) { const ids = seq(st, 3, 2); if (ids) push('tube', st + 2, ids); }
  for (let st = 1; st <= 13; st++) { const ids = seq(st, 2, 3); if (ids) push('plate', st + 1, ids); }
  // bombs (every size, natural cards first)
  for (let r = 2; r <= 14; r++) {
    if (c[r] + W < 4 || (!c[r] && r !== L)) continue;
    for (let m = 4; m <= Math.min(10, c[r] + W); m++) { const ids = same(r, m); if (ids) push('bomb', rv(r, L), ids); }
  }
  // straight flushes
  for (let s = 0; s < 4; s++) for (let st = 1; st <= 10; st++) {
    let ids = [], w = 0;
    for (let p = st; p < st + 5; p++) { const a = A.bs[s][POS(p)]; if (a.length) ids.push(a[0]); else w++; }
    if (w <= W) push('sflush', st + 4, ids.concat(A.wild.slice(0, w)));
  }
  if (A.sj.length === 2 && A.bj.length === 2) push('kings', 0, A.sj.concat(A.bj));
  if (o.beat) return out.filter(x => beats(x, o.beat));
  return out;
}

/* ---------- the deck ---------- */
function shuffled(rng) { const d = []; for (let i = 0; i < 108; i++) d.push(i); for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } return d; }
// display order of a hand: strongest first (jokers, wild, level, A … 2), then suit
function sortHand(h, L) { return h.slice().sort((a, b) => (val(b, L) - val(a, L)) || ((isWild(b, L) ? 1 : 0) - (isWild(a, L) ? 1 : 0)) || (suitOf(a) - suitOf(b)) || (a - b)); }

/* ---------- a match ---------- */
// o: { start: 2 (level to start from), single: false (every hand alone at level 2, no tribute) }
function newMatch(o) {
  o = o || {};
  const st = o.start || 2;
  return { lv: [st, st], af: [0, 0], lt: -1, hand: 0, prev: null, over: false, winner: -1, opts: { start: st, single: !!o.single }, hist: [] };
}
// deal the next hand: the level is the one of the team that won the last hand (both teams at the start)
function dealHand(M, rng) {
  const L = M.lt < 0 ? M.lv[0] : M.lv[M.lt];
  const d = shuffled(rng || Math.random), hands = [[], [], [], []];
  for (let i = 0; i < 108; i++) hands[i % 4].push(d[i]);
  const S = { L, lt: M.lt, hands, out: [], turn: -1, last: null, passN: 0, trick: 0, log: [], played: [], phase: 'play', trib: null, no: M.hand + 1, first: -1 };
  if (M.prev && !M.opts.single) setupTribute(S, M.prev);
  else { const f = Math.floor((rng || Math.random)() * 4); S.first = f; S.turn = f; S.lead0 = f; }
  return S;
}
// the tribute after a hand (prev = finishing order of the last hand, 4 seats)
function setupTribute(S, prev) {
  const f = prev, L = S.L, T = { mode: 'single', give: [], ret: [], lead: -1 };
  const bjs = s => S.hands[s].filter(id => natOf(id) === BJ).length;
  if (team(f[0]) === team(f[1])) {
    T.mode = 'double';
    const g = [f[2], f[3]];
    if (bjs(g[0]) + bjs(g[1]) >= 2) { T.mode = 'anti'; T.anti = g; T.lead = f[0]; }
    else T.give = g.map(s => ({ from: s, to: -1, id: null }));
  } else {
    if (bjs(f[3]) >= 2) { T.mode = 'anti'; T.anti = [f[3]]; T.lead = f[0]; }
    else T.give = [{ from: f[3], to: f[0], id: null }];
  }
  T.f = f.slice();
  S.trib = T;
  if (T.mode === 'anti') { S.phase = 'play'; S.turn = T.lead; S.lead0 = T.lead; }
  else S.phase = 'trib';
}
// the cards a player may give as tribute: the highest card except the wild hearts of the level
function tributeChoices(hand, L) {
  const c = hand.filter(id => !isWild(id, L)); if (!c.length) return [];
  const m = Math.max(...c.map(id => val(id, L)));
  return c.filter(id => val(id, L) === m);
}
// the cards a receiver may give back: any card of rank 10 or lower (2–10); if none, the smallest
function returnChoices(hand, L) {
  const lo = hand.filter(id => { const r = natOf(id); return r <= 10; });
  if (lo.length) return lo;
  const m = Math.min(...hand.map(id => val(id, L)));
  return hand.filter(id => val(id, L) === m);
}
// all tribute cards chosen (ids in T.give) → move them and work out who returns to whom
function doTribute(S) {
  const T = S.trib, L = S.L;
  for (const g of T.give) if (g.id == null || !tributeChoices(S.hands[g.from], L).includes(g.id)) throw new Error('bad tribute');
  if (T.mode === 'double') {
    const [a, b] = T.give, va = val(a.id, L), vb = val(b.id, L), f = T.f;
    if (va === vb) { a.to = (a.from + 3) % 4; b.to = (b.from + 3) % 4; T.lead = nextSeat(f[0]); }
    else { const hi = va > vb ? a : b, lo = hi === a ? b : a; hi.to = f[0]; lo.to = f[1]; T.lead = hi.from; }
  } else T.lead = T.give[0].from;
  for (const g of T.give) { S.hands[g.from].splice(S.hands[g.from].indexOf(g.id), 1); S.hands[g.to].push(g.id); }
  T.ret = T.give.map(g => ({ from: g.to, to: g.from, id: null }));
  S.phase = 'ret';
}
function doReturn(S) {
  const T = S.trib, L = S.L;
  for (const r of T.ret) if (r.id == null || !S.hands[r.from].includes(r.id)) throw new Error('bad return');
  for (const r of T.ret) if (!returnChoices(S.hands[r.from], L).includes(r.id)) throw new Error('return must be 10 or lower');
  for (const r of T.ret) { S.hands[r.from].splice(S.hands[r.from].indexOf(r.id), 1); S.hands[r.to].push(r.id); }
  S.phase = 'play'; S.turn = T.lead; S.lead0 = T.lead;
}

/* ---------- playing ---------- */
const active = (S, s) => S.hands[s].length > 0;
// is this combination (from the hand of seat s) a legal play now?
function legal(S, s, c) {
  if (S.phase !== 'play' || S.turn !== s || !c) return false;
  const h = S.hands[s], used = new Set();
  for (const id of c.ids) { if (used.has(id) || !h.includes(id)) return false; used.add(id); }
  if (!identify(c.ids, S.L).some(x => x.t === c.t && x.k === c.k && x.n === c.n)) return false;
  return !S.last || beats(c, S.last.c);
}
// play (c) or pass (null). Returns the events: { play | pass, out, trick (new trick, leader), end }
function act(S, s, c) {
  if (S.phase !== 'play' || S.turn !== s) throw new Error('not your turn');
  const ev = { s };
  if (c) {
    if (!legal(S, s, c)) throw new Error('illegal play');
    const h = S.hands[s];
    for (const id of c.ids) h.splice(h.indexOf(id), 1);
    S.played.push(...c.ids);
    S.last = { s, c: { t: c.t, n: c.n, k: c.k, ids: c.ids.slice() } }; S.passN = 0;
    S.log.push({ s, c: S.last.c, tr: S.trick });
    ev.play = S.last.c;
    if (!h.length) { S.out.push(s); ev.out = S.out.length; }
  } else {
    if (!S.last) throw new Error('the leader cannot pass');
    S.passN++; S.log.push({ s, c: null, tr: S.trick }); ev.pass = true;
  }
  // both of a team out → the hand is over
  const done = [0, 1].some(t => !active(S, t) && !active(S, t + 2));
  if (done) { finishOrder(S); S.phase = 'end'; ev.end = true; S.turn = -1; return ev; }
  const Ls = S.last.s, need = [0, 1, 2, 3].filter(x => active(S, x) && x !== Ls).length;
  if (S.passN >= need) {
    // everybody passed: the last player leads; if they are out, their partner leads (接风)
    const lead = active(S, Ls) ? Ls : partner(Ls);
    S.last = null; S.passN = 0; S.trick++; S.turn = lead;
    ev.trick = { lead, jf: lead !== Ls };
    return ev;
  }
  let t = S.turn; do t = nextSeat(t); while (!active(S, t)); S.turn = t;
  return ev;
}
function finishOrder(S) {
  const rest = [];
  for (let k = 1; k <= 4; k++) { const x = (S.out[S.out.length - 1] + k) % 4; if (!S.out.includes(x) && !rest.includes(x)) rest.push(x); }
  S.order = S.out.concat(rest);
}
// the result of a finished hand: who won, by how much, does it end the match?
function handResult(M, S) {
  const f = S.order, w = team(f[0]), place = f.indexOf(partner(f[0]));
  const up = place === 1 ? 3 : place === 2 ? 2 : 1;
  const R = { order: f.slice(), win: w, up, place, L: S.L, lt: S.lt, passA: false, failA: -1, reset: -1, before: M.lv.slice() };
  if (M.opts.single) return R;
  const lose = 1 - w;
  if (S.lt === w && S.L === 14 && M.lv[w] === 14) {
    if (place !== 3) R.passA = true; else R.failA = w;
  } else if (S.lt === lose && S.L === 14 && M.lv[lose] === 14) R.failA = lose;
  return R;
}
function applyResult(M, R) {
  M.hand++; M.prev = R.order.slice(); M.hist.push({ order: R.order, win: R.win, up: R.up, L: R.L });
  if (M.opts.single) { M.lt = -1; return M; }
  const w = R.win;
  if (R.passA) { M.over = true; M.winner = w; M.lt = w; return M; }
  if (R.failA === w) { M.af[w]++; }
  else M.lv[w] = Math.min(14, M.lv[w] + R.up);
  if (R.failA === 1 - w) M.af[1 - w]++;
  for (const t of [0, 1]) if (M.af[t] >= 3) { M.lv[t] = 2; M.af[t] = 0; R.reset = t; }
  M.lt = w;
  return M;
}

const api = { SJ, BJ, TYPES, suitOf, natOf, isWild, rv, val, POS, team, partner, nextSeat, tier, isBomb, beats, identify, analyze, gen, shuffled, sortHand,
  newMatch, dealHand, setupTribute, tributeChoices, returnChoices, doTribute, doReturn, legal, act, active, handResult, applyResult };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.GD = api;
})(typeof self !== 'undefined' ? self : this);
