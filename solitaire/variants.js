/* =====================================================================
   ソリティア — rules engine + variant registry  (solitaire/variants.js)
   No DOM: also loaded by the solver worker (importScripts).

   HOW TO ADD A GAME TYPE (variant)
     SOL.register({ id, ... }) with the hooks below. The UI (app.js), the
     solver (solver.js), the new-game dialog, statistics and the daily deal
     pick it up automatically; add its names / option labels to i18n.js
     (v.<id>, vd.<id>, o.<key>, ov.<key>.<value>) and its tutorial pages
     to rules.js (RULES[<id>]).

   Model
     card  : integer c → suit SUIT(c) = ⌊c/13⌋ mod 4 (0♠ 1♥ 2♦ 3♣), rank RANK(c) = c mod 13 + 1.
             c = deck·52 + suit·13 + rank−1, so multi-deck games keep every id unique.
     state : { v, o (options), L (layout, shared / read-only), p: [{ c:[cards bottom→top], d: face-down count }],
               pass, runs, sc (score), mv (moves), x (variant extra) }
     L[i]  : { k: 'stock'|'waste'|'found'|'tab'|'cell'|<custom>, x, y (card units: width 1, height CH), fan: 'v'|'h'|'hl'|'n', n (index within its kind) }
     move  : { f, i, t } (cards f[i..] → pile t)  ·  { s:1 } (stock)  ·  { x:<custom> } (variant-defined, e.g. pair removal)

   Variant hooks (✱ required)
     ✱ layout(o) → L ;  ✱ deal(rng, o, no) → p ;  ✱ won(st)
     ✱ canPick(st, pi, ci) ;  ✱ canDrop(st, pi, ci, ti)
       canStock(st) / stock(st, ev)        the stock pile action
       after(st, ev)                       after every move (flips are done by the engine; spider removes runs here)
       score0(o), score(st, ev)            scoring
       safe(st, c)                         card may go to a foundation automatically (auto-move "safe")
       rank(st, mv)                        heuristic value of a move (hints, solver ordering)
       useful(st, mv)                      solver-only pruning
       custom(st) → moves, applyCustom(st, mv, ev)   extra move kinds
       opts: [{ k, vals, def }]            rule options (difficulty)  ·  presets: { easy, normal, hard, expert }
       solvable(o)                         the solver may be used (winnable deals, solver hints)
   ===================================================================== */
(function (G) {
'use strict';
const CH = 1.4, GAP = 0.2, ROW2 = CH + 0.36;
const SUIT = c => Math.floor(c / 13) % 4, RANK = c => c % 13 + 1, RED = c => { const s = SUIT(c); return s === 1 || s === 2; };
const top = p => p.c[p.c.length - 1];
const VARIANTS = {}, ORDER = [];

/* ---------- random ---------- */
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function shuffle(a, rng) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
// Microsoft FreeCell deal numbers (1 … 1,000,000): the same layouts as Windows FreeCell (8 columns, 52 cards)
function msDeal(no) {
  let seed = BigInt(no);
  const rnd = () => { seed = (seed * 214013n + 2531011n) % 2147483648n; return Number(seed >> 16n); };
  const deck = []; for (let i = 0; i < 52; i++) deck.push(i);   // i: rank ⌊i/4⌋, suit i%4 in ♣ ♦ ♥ ♠ order
  const out = []; let left = 52;
  while (left > 0) { const j = rnd() % left; out.push(deck[j]); deck[j] = deck[left - 1]; left--; }
  const MS2 = [3, 2, 1, 0];   // ♣♦♥♠ → our 3 2 1 0
  return out.map(i => MS2[i % 4] * 13 + Math.floor(i / 4));
}

/* ---------- engine ---------- */
function clone(st) { return { v: st.v, o: st.o, L: st.L, p: st.p.map(q => ({ c: q.c.slice(), d: q.d })), pass: st.pass, runs: st.runs, sc: st.sc, mv: st.mv, x: st.x ? JSON.parse(JSON.stringify(st.x)) : undefined }; }
function newGame(vid, o, no) {
  const V = VARIANTS[vid]; o = Object.assign(defaults(vid), o || {});
  const L = V.layout(o), p = V.deal(mulberry(no >>> 0), o, no);
  const st = { v: vid, o, L, p, pass: 0, runs: 0, sc: V.score0 ? V.score0(o) : 0, mv: 0, no };
  if (V.init) V.init(st);
  return st;
}
function defaults(vid) { const V = VARIANTS[vid], o = {}; (V.opts || []).forEach(x => { o[x.k] = x.def; }); return o; }
function pilesOf(st, k) { const r = []; st.L.forEach((l, i) => { if (l.k === k) r.push(i); }); return r; }
function moves(st, all) {
  const V = VARIANTS[st.v], out = [];
  for (let f = 0; f < st.p.length; f++) {
    const P = st.p[f]; if (!P.c.length) continue;
    for (let i = P.c.length - 1; i >= P.d; i--) {
      if (!V.canPick(st, f, i)) { if (st.L[f].k === 'tab') break; continue; }
      for (let t = 0; t < st.p.length; t++) if (t !== f && V.canDrop(st, f, i, t)) out.push({ f, i, t });
      if (st.L[f].k !== 'tab') break;   // only the top card of other piles
    }
  }
  if (V.custom) out.push(...V.custom(st));
  if (V.canStock && V.canStock(st)) out.push({ s: 1 });
  return all ? out : out;
}
function legal(st, mv) {
  const V = VARIANTS[st.v];
  if (mv.s) return !!(V.canStock && V.canStock(st));
  if (mv.x) return (V.custom ? V.custom(st) : []).some(m => JSON.stringify(m) === JSON.stringify(mv));
  const P = st.p[mv.f]; if (!P || mv.i < P.d || mv.i >= P.c.length || mv.f === mv.t) return false;
  return V.canPick(st, mv.f, mv.i) && V.canDrop(st, mv.f, mv.i, mv.t);
}
// apply a move (mutates st). Returns the event: { fk, tk, n, cards, flips:[pile], recycle, deal, runs:[{from, to}], auto }
function apply(st, mv) {
  const V = VARIANTS[st.v], ev = { flips: [], runs: [], mv };
  if (mv.s) { ev.stock = true; V.stock(st, ev); }
  else if (mv.x) { V.applyCustom(st, mv, ev); }
  else {
    const F = st.p[mv.f], T = st.p[mv.t], cards = F.c.splice(mv.i);
    T.c.push(...cards); ev.fk = st.L[mv.f].k; ev.tk = st.L[mv.t].k; ev.n = cards.length; ev.cards = cards;
  }
  flipAll(st, ev);
  if (V.after) V.after(st, ev);
  flipAll(st, ev);
  st.mv++;
  if (V.score) V.score(st, ev);
  return ev;
}
function flipAll(st, ev) {   // a tableau pile whose top card is face down turns it up
  st.p.forEach((P, i) => { if (st.L[i].k === 'tab' && P.c.length && P.d >= P.c.length) { P.d = P.c.length - 1; if (!ev.flips.includes(i)) ev.flips.push(i); } });
}
function won(st) { return VARIANTS[st.v].won(st); }
// the next automatic move to a foundation (mode 'safe' | 'all'), or null
function autoMove(st, mode) {
  if (!mode || mode === 'off') return null;
  const V = VARIANTS[st.v], F = pilesOf(st, 'found'); if (!F.length) return null;
  for (let f = 0; f < st.p.length; f++) {
    const k = st.L[f].k; if (k === 'found' || k === 'stock') continue;
    const P = st.p[f]; if (!P.c.length || P.d >= P.c.length) continue;
    const i = P.c.length - 1; if (!V.canPick(st, f, i)) continue;
    for (const t of F) if (V.canDrop(st, f, i, t)) { if (mode === 'all' || (V.safe ? V.safe(st, P.c[i]) : RANK(P.c[i]) <= 2)) return { f, i, t }; break; }
  }
  return null;
}
// cards that can no longer move anywhere: the deal is stuck when nothing is possible
function stuck(st) { return !moves(st).length; }
// the found piles' ranks per suit (for "safe" checks)
function foundTop(st) { const r = [0, 0, 0, 0]; pilesOf(st, 'found').forEach(i => { const c = top(st.p[i]); if (c != null) r[SUIT(c)] = Math.max(r[SUIT(c)], RANK(c)); }); return r; }
function safeAlt(st, c) {   // alternate-colour building: safe once both opposite-colour foundations have reached rank−1 (and its own colour−2)
  const r = RANK(c); if (r <= 2) return true;
  const ft = foundTop(st), red = RED(c);
  const opp = red ? [0, 3] : [1, 2], same = red ? [1, 2] : [0, 3];
  return opp.every(s => ft[s] >= r - 1) && same.every(s => ft[s] >= r - 2);
}
function toFound(st, f, i, t) {   // one card onto a foundation: same suit, next rank (ace on an empty one)
  const P = st.p[f]; if (i !== P.c.length - 1) return false;
  const c = P.c[i], T = st.p[t];
  if (!T.c.length) return RANK(c) === 1 && (st.L[t].suit == null || st.L[t].suit === SUIT(c));
  const u = top(T); return SUIT(u) === SUIT(c) && RANK(c) === RANK(u) + 1;
}
const altRun = (cards, i) => { for (let j = i; j < cards.length - 1; j++) if (RED(cards[j]) === RED(cards[j + 1]) || RANK(cards[j]) !== RANK(cards[j + 1]) + 1) return false; return true; };
const suitRun = (cards, i) => { for (let j = i; j < cards.length - 1; j++) if (SUIT(cards[j]) !== SUIT(cards[j + 1]) || RANK(cards[j]) !== RANK(cards[j + 1]) + 1) return false; return true; };
const rankRun = (cards, i) => { for (let j = i; j < cards.length - 1; j++) if (RANK(cards[j]) !== RANK(cards[j + 1]) + 1) return false; return true; };
function register(def) { if (!VARIANTS[def.id]) ORDER.push(def.id); VARIANTS[def.id] = def; }

/* =====================================================================
   クロンダイク (Klondike)
   ===================================================================== */
register({
  id: 'klondike', decks: 1, solver: true,
  opts: [
    { k: 'draw', vals: [1, 3], def: 1 },
    { k: 'passes', vals: [0, 3, 2, 1], def: 0 },          // stock passes: 0 = unlimited; 1 = no redeal
    { k: 'empty', vals: ['king', 'any'], def: 'king' },   // what may fill an empty column
    { k: 'fromFound', vals: [1, 0], def: 1 },             // cards may come back from a foundation
    { k: 'scoring', vals: ['std', 'vegas', 'vegasCum', 'none'], def: 'std' },
  ],
  presets: {
    easy:   { draw: 1, passes: 0, empty: 'any', fromFound: 1, deal: 'winnable', undo: 'on' },
    normal: { draw: 1, passes: 0, empty: 'king', fromFound: 1, deal: 'winnable', undo: 'on' },
    hard:   { draw: 3, passes: 0, empty: 'king', fromFound: 1, deal: 'random', undo: 'on' },
    expert: { draw: 3, passes: 3, empty: 'king', fromFound: 0, deal: 'random', undo: 'off' },
  },
  layout(o) {
    const L = [], X = c => (o.left ? 6 - c : c) * (1 + GAP);
    L.push({ k: 'stock', x: X(0), y: 0, fan: 'n' });
    L.push({ k: 'waste', x: X(1), y: 0, fan: o.draw === 3 ? (o.left ? 'hl' : 'h') : 'n' });
    for (let i = 0; i < 4; i++) L.push({ k: 'found', x: X(3 + i), y: 0, fan: 'n', n: i });
    for (let i = 0; i < 7; i++) L.push({ k: 'tab', x: X(i), y: ROW2, fan: 'v', n: i });
    return L;
  },
  deal(rng) {
    const deck = shuffle([...Array(52).keys()], rng), p = [];
    p.push({ c: [], d: 0 }, { c: [], d: 0 }); for (let i = 0; i < 4; i++) p.push({ c: [], d: 0 });
    for (let i = 0; i < 7; i++) p.push({ c: [], d: 0 });
    for (let r = 0; r < 7; r++) for (let i = r; i < 7; i++) p[6 + i].c.push(deck.pop());
    for (let i = 0; i < 7; i++) p[6 + i].d = i;
    p[0].c = deck; p[0].d = deck.length;
    return p;
  },
  canPick(st, f, i) {
    const k = st.L[f].k, P = st.p[f];
    if (k === 'stock') return false;
    if (k === 'waste') return i === P.c.length - 1;
    if (k === 'found') return !!st.o.fromFound && i === P.c.length - 1;
    return i >= P.d && altRun(P.c, i);
  },
  canDrop(st, f, i, t) {
    const k = st.L[t].k, T = st.p[t], c = st.p[f].c[i];
    if (k === 'found') return st.L[f].k !== 'found' && toFound(st, f, i, t);
    if (k !== 'tab') return false;
    if (!T.c.length) return st.o.empty === 'any' || RANK(c) === 13;
    const u = top(T); return RED(u) !== RED(c) && RANK(u) === RANK(c) + 1;
  },
  canStock(st) { const S = st.p[pilesOf(st, 'stock')[0]], W = st.p[pilesOf(st, 'waste')[0]]; if (!S || !W) return false; return S.c.length > 0 || (W.c.length > 0 && (!st.o.passes || st.pass < st.o.passes - 1)); },
  stock(st, ev) {
    const S = st.p[pilesOf(st, 'stock')[0]], W = st.p[pilesOf(st, 'waste')[0]];
    if (S.c.length) { const n = Math.min(st.o.draw, S.c.length); for (let k = 0; k < n; k++) W.c.push(S.c.pop()); S.d = S.c.length; ev.draw = n; }
    else { S.c = W.c.reverse(); W.c = []; S.d = S.c.length; st.pass++; ev.recycle = true; }
  },
  won(st) { return pilesOf(st, 'found').every(i => st.p[i].c.length === 13); },
  safe: safeAlt,
  score0(o) { return o.scoring === 'vegas' || o.scoring === 'vegasCum' ? -52 : 0; },
  score(st, ev) {
    const sc = st.o.scoring; if (sc === 'none') return;
    if (sc === 'std') {
      let d = 0;
      if (ev.tk === 'found' && ev.fk !== 'found') d += 10;
      if (ev.fk === 'waste' && ev.tk === 'tab') d += 5;
      if (ev.fk === 'found' && ev.tk === 'tab') d -= 15;
      d += 5 * ev.flips.length;
      if (ev.recycle && !st.o.passes) d -= st.o.draw === 1 ? 100 : 20;
      st.sc = Math.max(0, st.sc + d);
    } else {
      if (ev.tk === 'found' && ev.fk !== 'found') st.sc += 5;
      if (ev.fk === 'found' && ev.tk !== 'found') st.sc -= 5;
    }
  },
  rank(st, mv) {
    if (mv.s) return st.p[pilesOf(st, 'stock')[0]].c.length ? -4 : -30;
    const fk = st.L[mv.f].k, tk = st.L[mv.t].k, P = st.p[mv.f];
    let v = 0;
    if (tk === 'found') v += 60 + (fk === 'tab' && mv.i === P.d && P.d > 0 ? 30 : 0) - RANK(P.c[mv.i]);
    if (fk === 'tab' && tk === 'tab') {
      if (mv.i === P.d && P.d > 0) v += 40 + P.d;             // reveals a face-down card
      else if (mv.i === 0) v += st.p[mv.t].c.length ? 10 : -50; // empties a column (a king to an empty column: pointless)
      else v -= 20;                                           // splits a run
    }
    if (fk === 'waste') v += tk === 'tab' ? 22 : 0;
    if (fk === 'found') v -= 35;
    return v;
  },
  useful(st, mv) {
    if (mv.s) return true;
    const fk = st.L[mv.f].k, tk = st.L[mv.t].k, P = st.p[mv.f];
    if (fk === 'tab' && tk === 'tab') {
      if (mv.i === 0 && !st.p[mv.t].c.length) return false;   // whole column into an empty one
      if (mv.i > P.d) {   // part of a run: only when the card freed can go up to a foundation
        const c = P.c[mv.i - 1]; return pilesOf(st, 'found').some(t => { const T = st.p[t]; return T.c.length ? SUIT(top(T)) === SUIT(c) && RANK(c) === RANK(top(T)) + 1 : RANK(c) === 1; });
      }
    }
    if (fk === 'found' && tk === 'tab') return RANK(P.c[mv.i]) > 2;
    return true;
  },
  solvable() { return true; },
});

/* =====================================================================
   スパイダー (Spider)
   ===================================================================== */
register({
  id: 'spider', decks: 2, solver: false,
  opts: [
    { k: 'suits', vals: [1, 2, 4], def: 2 },
    { k: 'move', vals: ['suit', 'any'], def: 'suit' },    // which runs move as a group: same suit only (standard) / any descending run
    { k: 'dealEmpty', vals: [0, 1], def: 0 },             // may deal from the stock while a column is empty
  ],
  presets: {
    easy:   { suits: 1, move: 'suit', dealEmpty: 1, undo: 'on' },
    normal: { suits: 2, move: 'suit', dealEmpty: 0, undo: 'on' },
    hard:   { suits: 4, move: 'suit', dealEmpty: 0, undo: 'on' },
    expert: { suits: 4, move: 'suit', dealEmpty: 0, undo: 'off' },
  },
  layout() {
    const L = [], X = c => c * (1 + GAP);
    L.push({ k: 'stock', x: X(9), y: 0, fan: 'n', deal: 1 });
    for (let i = 0; i < 8; i++) L.push({ k: 'found', x: i * 0.42, y: 0, fan: 'n', n: i, stack: 1 });
    for (let i = 0; i < 10; i++) L.push({ k: 'tab', x: X(i), y: ROW2, fan: 'v', n: i });
    return L;
  },
  deal(rng, o) {
    const S = o.suits === 1 ? [0] : o.suits === 2 ? [0, 1] : [0, 1, 2, 3], cards = [], used = {};
    for (let k = 0; k < 8; k++) { const s = S[k % S.length]; for (let r = 0; r < 13; r++) { let dd = 0; while (used[dd * 52 + s * 13 + r]) dd++; used[dd * 52 + s * 13 + r] = 1; cards.push(dd * 52 + s * 13 + r); } }
    shuffle(cards, rng);
    const p = [{ c: [], d: 0 }]; for (let i = 0; i < 8; i++) p.push({ c: [], d: 0 });
    for (let i = 0; i < 10; i++) p.push({ c: [], d: 0 });
    for (let k = 0; k < 54; k++) p[9 + (k % 10)].c.push(cards.pop());
    for (let i = 0; i < 10; i++) p[9 + i].d = p[9 + i].c.length - 1;
    p[0].c = cards; p[0].d = cards.length;
    return p;
  },
  canPick(st, f, i) { const P = st.p[f]; return st.L[f].k === 'tab' && i >= P.d && (st.o.move === 'any' ? rankRun(P.c, i) : suitRun(P.c, i)); },
  canDrop(st, f, i, t) {
    if (st.L[t].k !== 'tab') return false;
    const T = st.p[t]; if (!T.c.length) return true;
    return RANK(top(T)) === RANK(st.p[f].c[i]) + 1;
  },
  canStock(st) { const S = st.p[pilesOf(st, 'stock')[0]]; return !!S && S.c.length > 0 && (st.o.dealEmpty || pilesOf(st, 'tab').every(i => st.p[i].c.length)); },
  stock(st, ev) { const S = st.p[pilesOf(st, 'stock')[0]]; ev.deal = []; pilesOf(st, 'tab').forEach(i => { if (S.c.length) { st.p[i].c.push(S.c.pop()); ev.deal.push(i); } }); S.d = S.c.length; },
  after(st, ev) {   // a complete K→A run of one suit leaves the table for a foundation
    for (const i of pilesOf(st, 'tab')) {
      const P = st.p[i], n = P.c.length; if (n - P.d < 13) continue;
      const s = n - 13; if (RANK(P.c[s]) !== 13 || !suitRun(P.c, s)) continue;
      const to = pilesOf(st, 'found').find(t => !st.p[t].c.length); if (to == null) continue;
      st.p[to].c.push(...P.c.splice(s)); st.runs++; ev.runs.push({ from: i, to });
      if (P.c.length && P.d >= P.c.length) { P.d = P.c.length - 1; ev.flips.push(i); }
    }
  },
  won(st) { return st.runs >= 8; },
  score0() { return 500; },
  score(st, ev) { st.sc += -1 + 100 * ev.runs.length; },
  rank(st, mv) {
    if (mv.s) return -20;
    const P = st.p[mv.f], T = st.p[mv.t], c = P.c[mv.i]; let v = 0;
    if (mv.i === P.d && P.d > 0) v += 40;
    if (mv.i === 0) v += T.c.length ? 15 : -60;
    if (T.c.length && SUIT(top(T)) === SUIT(c)) v += 25;                      // builds in suit
    if (mv.i > P.d && SUIT(P.c[mv.i - 1]) === SUIT(c) && RANK(P.c[mv.i - 1]) === RANK(c) + 1) v -= 45;   // breaks a suited run
    if (!T.c.length) v -= 15;
    return v + (P.c.length - mv.i);
  },
});

/* =====================================================================
   フリーセル (FreeCell)
   ===================================================================== */
register({
  id: 'freecell', decks: 1, solver: true,
  opts: [
    { k: 'cells', vals: [4, 3, 2, 1, 5, 6], def: 4 },
    { k: 'cols', vals: [8, 7, 6, 9, 10], def: 8 },
    { k: 'build', vals: ['alt', 'suit', 'rank'], def: 'alt' },   // alternate colours / same suit (Baker's Game) / any suit
    { k: 'empty', vals: ['any', 'king'], def: 'any' },
    { k: 'supermove', vals: [1, 0], def: 1 },
    { k: 'fromFound', vals: [0, 1], def: 0 },
  ],
  presets: {
    easy:   { cells: 4, cols: 8, build: 'rank', empty: 'any', supermove: 1, fromFound: 1, deal: 'winnable', undo: 'on' },
    normal: { cells: 4, cols: 8, build: 'alt', empty: 'any', supermove: 1, fromFound: 0, deal: 'random', undo: 'on' },
    hard:   { cells: 3, cols: 8, build: 'alt', empty: 'any', supermove: 1, fromFound: 0, deal: 'winnable', undo: 'on' },
    expert: { cells: 2, cols: 8, build: 'alt', empty: 'any', supermove: 1, fromFound: 0, deal: 'winnable', undo: 'off' },
  },
  layout(o) {
    const L = [], cols = o.cols, w = Math.max(cols, o.cells + 4), X = c => c * (1 + GAP), off = (w - cols) / 2 * (1 + GAP);
    for (let i = 0; i < o.cells; i++) L.push({ k: 'cell', x: X(i), y: 0, fan: 'n', n: i });
    for (let i = 0; i < 4; i++) L.push({ k: 'found', x: X(w - 4 + i), y: 0, fan: 'n', n: i });
    for (let i = 0; i < cols; i++) L.push({ k: 'tab', x: off + X(i), y: ROW2, fan: 'v', n: i });
    return L;
  },
  deal(rng, o, no) {
    const cards = o.cols === 8 && no >= 1 && no <= 1000000 && o.ms !== 0 ? msDeal(no) : shuffle([...Array(52).keys()], rng);
    const p = []; for (let i = 0; i < o.cells + 4 + o.cols; i++) p.push({ c: [], d: 0 });
    cards.forEach((c, k) => p[o.cells + 4 + (k % o.cols)].c.push(c));
    return p;
  },
  maxMove(st, t) {
    const cells = pilesOf(st, 'cell').filter(i => !st.p[i].c.length).length;
    let empt = pilesOf(st, 'tab').filter(i => !st.p[i].c.length && i !== t).length;
    if (!st.o.supermove) return 1;
    return (cells + 1) * Math.pow(2, empt);
  },
  run(st, cards, i) { return st.o.build === 'alt' ? altRun(cards, i) : st.o.build === 'suit' ? suitRun(cards, i) : rankRun(cards, i); },
  canPick(st, f, i) {
    const k = st.L[f].k, P = st.p[f];
    if (k === 'cell') return i === P.c.length - 1;
    if (k === 'found') return !!st.o.fromFound && i === P.c.length - 1;
    return this.run(st, P.c, i);
  },
  canDrop(st, f, i, t) {
    const k = st.L[t].k, T = st.p[t], F = st.p[f], c = F.c[i], n = F.c.length - i;
    if (k === 'found') return st.L[f].k !== 'found' && toFound(st, f, i, t);
    if (k === 'cell') return n === 1 && !T.c.length && st.L[f].k !== 'cell';
    if (k !== 'tab') return false;
    if (n > this.maxMove(st, t)) return false;
    if (!T.c.length) return st.o.empty === 'any' || RANK(c) === 13;
    const u = top(T); if (RANK(u) !== RANK(c) + 1) return false;
    return st.o.build === 'alt' ? RED(u) !== RED(c) : st.o.build === 'suit' ? SUIT(u) === SUIT(c) : true;
  },
  won(st) { return pilesOf(st, 'found').every(i => st.p[i].c.length === 13); },
  safe(st, c) { return st.o.build === 'alt' ? safeAlt(st, c) : (() => { const ft = foundTop(st), r = RANK(c); return r <= 2 || ft.every(x => x >= r - 1); })(); },
  rank(st, mv) {
    const fk = st.L[mv.f].k, tk = st.L[mv.t].k, P = st.p[mv.f], T = st.p[mv.t]; let v = 0;
    if (tk === 'found') v += 70 - RANK(P.c[mv.i]);
    if (tk === 'cell') v -= 25;
    if (fk === 'cell' && tk === 'tab') v += T.c.length ? 30 : 5;
    if (fk === 'tab' && tk === 'tab') { if (mv.i === 0) v += T.c.length ? 20 : -60; else if (!T.c.length) v -= 10; v += (P.c.length - mv.i); }
    if (fk === 'found') v -= 40;
    return v;
  },
  useful(st, mv) {
    const fk = st.L[mv.f].k, tk = st.L[mv.t].k;
    if (fk === 'tab' && tk === 'tab' && mv.i === 0 && !st.p[mv.t].c.length) return false;
    if (fk === 'found') return false;
    return true;
  },
  solvable() { return true; },
});

/* ---------- canonical key (solver transpositions) ---------- */
function key(st) {
  const V = VARIANTS[st.v], tabs = [], cells = [], rest = [];
  st.p.forEach((P, i) => {
    const k = st.L[i].k, s = P.d + ':' + P.c.join(',');
    if (k === 'tab') tabs.push(s); else if (k === 'cell') cells.push(s); else if (k === 'found') rest.push(P.c.length ? top(P) : -1); else rest.push(k[0] + s);
  });
  tabs.sort(); cells.sort();
  const pass = V.id === 'klondike' && st.o.passes ? '|' + st.pass : '';
  return rest.join(';') + '|' + cells.join(';') + '|' + tabs.join('/') + pass;
}

G.SOL = { CH, GAP, ROW2, SUIT, RANK, RED, VARIANTS, ORDER, register, newGame, defaults, clone, moves, legal, apply, won, autoMove, stuck, key, pilesOf, top, mulberry, hashStr, shuffle, msDeal, altRun, suitRun, rankRun, safeAlt, toFound, foundTop };
})(typeof self !== 'undefined' ? self : this);
