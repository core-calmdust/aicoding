#!/usr/bin/env node
// (2026-11-24 担当D) Ugolki lessons on the 3D table (ugolki/lessons.json, the same file as the 2D lessons; 3D: atlas/ls-ugolki.js
// AtlasLsUgolki, モリフク's words). The lessons listed on the 3D table (AtlasLsUgolki.READY) are checked here, every problem
// against ①〜⑨ and 追1〜 of claude/lesson-quality.md, computed from the rules (ugolki/engine.js) independently of the 3D file:
//  ① ok = exactly the moves that do what the goal asks (b_step: the steps that get closer, no jump gets closer; b_jump: the
//    farthest moves, all jumps; b_enter: from outside into the corner; b_finish: the moves that complete the corner); best ∈ ok.
//  ② the set is the whole set (nothing as good left out); b_jump: the farthest wrong move 1 square shorter or more (the gap).
//  ③ 12 legal moves or more, 3 wrong or more, ok at most a third (追17); b_jump the answer's piece has 3 moves or more;
//    b_finish the piece outside has 2 wrong moves or more (the question is the route, 追34).
//  ④ the theme: b_jump 1–2 a single hop with another jump to compare, 3–5 a chain (3 hops or more) with a wrong jump of 2 squares
//    or more; b_enter a step and a jump among the answers, 3 forward moves or more that stay outside; b_finish the answers
//    steps and jumps, 3 holes or more, Black cannot complete next (completing wins: the praise says so); 追27 no answer twice.
//  ⑤ no position (lesson problems of every step, ramps, puzzles) within 4 squares of another under the board's symmetries.
//  ⑥ easy → hard: the step's d (RULES[id].d) never goes down.
//  ⑦⑧ every legal move of every problem: the 3D words (atlas/ls-ugolki.js fact / say, ja) name what the board says — the kind
//    (side / back / stop / step / leave / inside / …) and every number (squares gained, hops, pieces home, holes) — and the
//    answer's words; the hint's marks are what the words say to look at (追52), not the answer's move itself.
//  ⑨ the 2D: ok / best as above (ugolki/app.js okAnswer: a move in ok is right); the 2D words (ls.<id>.why/ng, 14 languages)
//    exist; the 2D ng (shown for every wrong move) is true for every wrong move (b_step: does not get closer; b_enter: no piece
//    goes in; b_finish: does not complete; b_jump: a farther jump exists).
// (2026-11-25 担当D) s_block: ok = the moves after which Black's farthest reply is shortest (blackBest on every legal move);
//  s_leave: ok = the moves after which White empties its starting corner by its 40th move whatever Black replies (leaveSafe);
//  the 3D ask names the move (追77), the 2D shows the moves left; the 2D warm-ups of both say what their board does (追14).
// (2026-11-25 担当D) s_deep (fill the corner fast, Black standing still: 追74): an exact solver (deepDist: the fewest White moves to
//  fill the corner, Black frozen; IDA* with a shared lower-bound table) is run after every legal move: ok = the moves with
//  1 + dist = the fewest; the stored dn (the 3D reads it) = the solver's count for every legal move; every wrong move finite and
//  slower; a move into the corner that is slower tempts (the intro says so: 追70); the words' counts and kinds on the board.
// (2026-11-27 担当D) s_count (read the race): each side's count (deepDist: the fewest moves to fill its corner, the other side
//  frozen; Black's by the board turned and the colours swapped) after every legal move: ws = 1 + White's, bs = Black's. By count
//  White wins iff bs > ws (equal: Black's last move draws). ok = the winning moves = the exact two-player solver's set (engine
//  duelGood; P.cn stores [m, ws, bs] for the 3D); every answer moves a white piece Black hops over now (the springboard) and makes
//  Black slower; a wrong move as fast for White as the answer (the lure: only Black's count tells); the words' counts and kinds.
// Usage: node tools/lesson-verify-ugolki-ls.js [--selftest]   (also: node tools/lesson-verify.js ugolki)
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const E = require(path.join(ROOT, 'ugolki/engine.js'));
E.setRule('c33');
const DIST = E.DIST();
const LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
const SYM = [[(r, c) => [r, c], false], [(r, c) => [7 - c, 7 - r], false], [(r, c) => [7 - r, 7 - c], true], [(r, c) => [c, r], true]];
const symB = (b, f, sw) => { const o = Array(64).fill('.'); for (let i = 0; i < 64; i++) { const ch = b[i]; const [r, c] = f(i >> 3, i & 7); o[r * 8 + c] = ch === 'w' ? (sw ? 'b' : 'w') : ch === 'b' ? (sw ? 'w' : 'b') : '.'; } return o.join(''); };
const diff = (a, b) => { let n = 0; for (let i = 0; i < 64; i++) if (a[i] !== b[i]) n++; return n; };
const near = (a, b) => SYM.some(([f, sw]) => diff(a, symB(b, f, sw)) <= 4);
const real = p => p.moves().filter(m => m !== E.PASS);
const gainOf = (p, m) => DIST[p.turn][E.mFrom(m)] - DIST[p.turn][E.mTo(m)];
const hops = (p, m) => E.isJump(p, m) ? E.path(p, m).length - 1 : 0;
// the facts of one move (independent of atlas/ls-ugolki.js)
function factOf(id, p, m) {
  const me = p.turn, T = E.target(me), f = E.mFrom(m), t = E.mTo(m), g = gainOf(p, m), h = hops(p, m), q = p.clone().play(m);
  const o = { g, h, inF: !!T[f], inT: !!T[t], home: q.inTarget(me), holes: 9 - q.inTarget(me) };
  if (id === 'b_step') o.k = g > 0 ? 'step' : g < 0 ? 'back' : h ? 'jump0' : 'side';
  else if (id === 'b_jump') o.k = !h ? 'step' : 'jump';
  else if (id === 'b_enter') o.k = !o.inF && o.inT ? 'in' : o.inF && o.inT ? 'inside' : o.inF ? 'leave' : g > 0 ? 'near' : 'none';
  else if (id === 'b_finish') o.k = q.done(me) ? 'done' : o.inF && o.inT ? 'inside' : o.inF ? 'leave' : g > 0 ? 'near' : 'none';
  else if (id === 's_far' || id === 's_ladder') { o.opp = overOpp(p, m); o.k = !h ? (g > 0 ? 'step' : g < 0 ? 'back' : 'side') : g > 0 ? 'jump' : g < 0 ? 'jback' : 'jside'; }
  else if (id === 's_road') { const n = nextBest(q); o.nx = n.g; o.nh = n.h; o.k = h ? 'jump' : 'step'; }
  else if (id === 's_block') { const b = blackBest(q), b0 = blackBest(p); o.b = b.g; o.b0 = b0.g; o.k = b.g >= b0.g ? (b.g > b0.g ? 'more' : 'still') : 'part'; o.land = b0.all.some(x => x.path.slice(1).includes(t)); o.spring = b0.all.some(x => x.mid.includes(f)); }
  else if (id === 's_deep') { o.n = 1 + deepDist(q); o.k = !o.inF && o.inT ? 'in' : o.inF && o.inT ? 'inside' : o.inF ? 'leave' : g > 0 ? 'fwd' : g < 0 ? 'back' : 'side'; }
  else if (id === 's_count') { o.ws = 1 + deepDist(q, 13); o.bs = blackDist(q); o.bs0 = blackDist(p); o.spring = springs(p).includes(f); o.r = o.bs > o.ws ? 'win' : o.bs === o.ws ? 'draw' : 'lose'; o.k = o.spring ? 'sMove' : o.bs < o.bs0 ? 'gift' : o.bs > o.bs0 ? 'more' : 'keep'; }
  else if (id === 's_leave') { o.c = q.inHome(me); o.left = E.R.limit - p.movesOf(me) - 1; o.safe = o.left <= 1 ? leaveSafe(q, o.left) : null; o.homeF = !!HOME1[f]; o.homeT = !!HOME1[t]; o.k = o.safe ? 'out' : o.homeF && o.homeT ? 'inside' : o.c > o.left ? 'few' : 'block'; }
  return o;
}
// s_deep: the fewest White moves to fill its corner with Black standing still (exact; one table per Black placement)
const TGT1 = E.target(1), SOLV = new Map();
const outside1 = sq => { let n = 0; for (let i = 0; i < 64; i++) if (sq[i] === 1 && !TGT1[i]) n++; return n; };
function deepDist(p0, cap) {
  let bk = ''; for (let i = 0; i < 64; i++) bk += p0.sq[i] === 2 ? 'b' : '.';
  let LB = SOLV.get(bk); if (!LB) { if (SOLV.size > 64) SOLV.clear(); LB = new Map(); SOLV.set(bk, LB); }
  const key = sq => { let a = 0, b = 0; for (let i = 0; i < 32; i++) if (sq[i] === 1) a |= 1 << i; for (let i = 32; i < 64; i++) if (sq[i] === 1) b |= 1 << (i - 32); return a + ',' + b; };
  const can = (p, r) => { const h = outside1(p.sq); if (!h) return true; if (h > r) return false; const k = key(p.sq); if ((LB.get(k) || 0) > r) return false;
    for (const m of p.moves()) { if (m === E.PASS) continue; const q = p.clone().play(m); q.side = 0; if (can(q, r - 1)) return true; } LB.set(k, r + 1); return false; };
  const p = p0.clone(); p.side = 0; for (let r = outside1(p.sq); r <= (cap || 12); r++) if (can(p, r)) return r; return Infinity;
}
// s_count: Black's fewest moves to fill its corner, White frozen (the board turned 180° and the colours swapped: the same solver)
const swapPos = q => E.Pos.from({ b: symB(q.spec().b, SYM[2][0], true), side: 1, n: q.ply });
const BD = new Map();
function blackDist(q) { const k = q.spec().b; if (!BD.has(k)) { if (BD.size > 5000) BD.clear(); BD.set(k, deepDist(swapPos(q), 14)); } return BD.get(k); }
// s_count: the white pieces Black can hop over now (as if White passed): Black's springboards
function springs(p) { const q = p.clone(); q.side = 1; const o = new Set(); for (const m of real(q)) if (E.isJump(q, m)) { const P = E.path(q, m); for (let i = 1; i < P.length; i++) { const x = (P[i - 1] + P[i]) / 2; if (q.sq[x] === 1) o.add(x); } } return [...o].sort((a, b) => a - b); }
// s_block: Black's farthest move in a position (Black to move; with White to move, as if White passed): { g, all: the moves that
// go that far with their landing squares (path) and the pieces they hop over (mid) }
function blackBest(q0) {
  const q = q0.clone(); q.side = 1; const D = DIST[2]; let g = -99; const L = real(q).map(m => ({ m, g: D[E.mFrom(m)] - D[E.mTo(m)] }));
  for (const x of L) g = Math.max(g, x.g);
  const all = L.filter(x => x.g === g).map(x => { const P = E.isJump(q, x.m) ? E.path(q, x.m) : [E.mFrom(x.m), E.mTo(x.m)], mid = []; if (E.isJump(q, x.m)) for (let i = 1; i < P.length; i++) mid.push((P[i - 1] + P[i]) / 2); return { m: x.m, path: P, mid, h: E.isJump(q, x.m) ? P.length - 1 : 0 }; });
  return { g, all, h: Math.max(0, ...all.map(x => x.h)) };
}
// s_leave: White (to move after Black's reply) can still have every piece out of its starting corner after its 40th move, whatever
// Black replies (left = White's moves still to come after this one: 0 → the corner must be empty now)
const HOME1 = E.HOME()[1];
function leaveSafe(q, left) {
  if (!q.inHome(1)) return true;
  if (left <= 0 || q.inHome(1) > left) return false;
  for (const b of q.moves()) { const r = q.clone().play(b), j = E.judge(r); if (j.over) { if (j.winner === 1) continue; return false; } if (!real(r).some(w => leaveSafe(r.clone().play(w), left - 1))) return false; }
  return true;
}
// the black pieces a jump chain hops over
function overOpp(p, m) { if (!E.isJump(p, m)) return 0; const P = E.path(p, m); let n = 0; for (let i = 1; i < P.length; i++) if (p.sq[(P[i - 1] + P[i]) / 2] === 2) n++; return n; }
// s_road: White moves again (Black stands still): the farthest next move { g, h, m }
function nextBest(q) { const r = q.clone(); r.side = 0; let b = { g: -99, h: 0, m: -1 }; for (const m of real(r)) { const g = gainOf(r, m); if (g > b.g || (g === b.g && hops(r, m) > b.h)) b = { g, h: hops(r, m), m }; } b.pos = r; return b; }
// the numbers the words must say for a move (right: the answer's own; wrong: what the red move does and the green one's gain)
function expectNums(id, p, P, m, c) {
  const f = factOf(id, p, m), fb = factOf(id, p, P.best), right = (P.ok || []).includes(m);
  if (right && id[0] === 'b') return id === 'b_step' ? { n: P.ok.length } : id === 'b_jump' ? Object.assign({ G: f.g }, f.h > 1 ? { h: f.h } : {}) : id === 'b_enter' ? { a: f.home } : { nine: 9 };
  if (id === 'b_step') return f.g < 0 ? { k: -f.g } : {};
  if (id === 'b_jump') return Object.assign({ G: fb.g }, f.h && f.g > 0 ? { g: f.g } : {}, f.g < 0 && f.h ? { k: -f.g } : {});
  if (id === 'b_enter') return f.k === 'near' ? { g: f.g } : f.k === 'inside' ? { a: p.inTarget(1) } : f.k === 'leave' ? { a: f.home } : {};
  if (id === 'b_finish') return f.k === 'near' ? { g: f.g } : f.k === 'leave' ? { holes: f.holes } : {};
  if (id === 's_far' || id === 's_ladder') {
    if (right) return Object.assign({ G: f.g, h: f.h }, id === 's_ladder' ? { o: f.opp } : {});
    return Object.assign({ G: fb.g }, f.g > 0 ? { g: f.g } : f.g < 0 ? { k: -f.g } : {});
  }
  if (id === 's_road') return right ? { N: f.nx, nh: f.nh } : Object.assign({ N: fb.nx }, f.nx > 0 ? { nx: f.nx } : {});
  if (id === 's_block') return right ? Object.assign({ b0: f.b0, B: f.b }, f.g < 0 ? { d: f.b0 - f.b } : {}) : Object.assign({ b: f.b, B: fb.b }, f.k === 'still' && f.g >= 2 ? { g: f.g } : {});
  if (id === 's_deep') return right ? { N: f.n, S: c.second } : Object.assign({ x: f.n, N: fb.n }, f.k === 'back' ? { k: -f.g } : f.k === 'fwd' ? { g: f.g } : {});
  if (id === 's_count') return right ? { w: f.ws, b: f.bs, b0: f.bs0 } : Object.assign({ x: f.ws, b: f.bs, W: fb.ws, B: fb.bs }, f.k === 'gift' || f.k === 'more' ? { b0: f.bs0 } : {});
  if (id === 's_leave') return right ? (f.left === 0 ? { t: E.R.limit } : f.c && !(f.homeF && f.homeT) ? { c: f.c } : {}) : (f.left === 1 && f.c <= 1 && f.k === 'inside' ? {} : { c: f.c });
  return {};
}
// the goal's set and the problem's numbers
function classify(id, p, slot) {
  if (p.turn !== 1) return null;
  const L = real(p); if (!L.length) return null;
  const me = p.turn, T = E.target(me), F = L.map(m => factOf(id, p, m));
  let ok = [];
  const r = { legal: L.length, why: [] };
  if (id === 'b_step') {
    if (L.some((m, i) => F[i].h && F[i].g > 0)) r.why.push('④ a jump gets closer');
    ok = L.filter((m, i) => !F[i].h && F[i].g > 0);
    if (ok.length < 2 || ok.length > 6) r.why.push(`④ ${ok.length} steps get closer (2–6)`);
    if (p.inTarget(1) > 6) r.why.push('④ the race is nearly over (7+ home)');
    r.d = Math.round(10 * (1 - ok.length / L.length)); r.order = -ok.length;
  } else if (id === 'b_jump') {
    const G = Math.max(...F.map(x => x.g)); ok = L.filter((m, i) => F[i].g === G);
    if (!ok.every(m => hops(p, m))) r.why.push('④ a step goes as far');
    if (ok.length > 2) r.why.push(`② ${ok.length} farthest moves`);
    const H = Math.max(...ok.map(m => hops(p, m))), wrongJ = L.filter((m, i) => !ok.includes(m) && F[i].h), second = Math.max(...L.filter(m => !ok.includes(m)).map(m => gainOf(p, m)));
    r.hops = H; r.gap = G - second; r.G = G;
    if (H === 1) { if (!wrongJ.length) r.why.push('③ no other jump to compare'); if (G !== 2) r.why.push('④ a single hop gains 2'); }
    else { if (H < 3) r.why.push(`④ a chain of ${H} hops (3 or more)`); if (!L.some((m, i) => !ok.includes(m) && F[i].h && F[i].g >= 2)) r.why.push('③ no shorter forward jump to compare'); if (r.gap < 2) r.why.push(`② the gap is ${r.gap}`); }
    const mine = L.filter(m => E.mFrom(m) === E.mFrom(ok[0])); if (mine.length < 3) r.why.push(`③ the answer's piece has ${mine.length} moves`);
    r.d = H === 1 ? 0 + (wrongJ.length > 2 ? 1 : 0) : 10 + G; r.order = G;
  } else if (id === 'b_enter') {
    ok = L.filter((m, i) => F[i].k === 'in');
    if (ok.length < 1 || ok.length > 2) r.why.push(`② ${ok.length} moves go in (1–2)`);
    if (p.inTarget(me) < 2 || p.inTarget(me) > 6) r.why.push('④ 2–6 pieces home');
    const lure = L.filter((m, i) => F[i].k === 'near').length; r.lure = lure;
    if (lure < 3) r.why.push(`③ ${lure} forward moves stay outside`);
    r.jump = ok.some(m => hops(p, m)); r.d = lure; r.order = lure;
  } else if (id === 'b_finish') {
    if (p.inTarget(me) !== 8) r.why.push('④ not 8 pieces home');
    ok = L.filter((m, i) => F[i].k === 'done');
    if (ok.length !== 1) r.why.push(`② ${ok.length} moves complete`);
    const o2 = p.clone(); o2.side ^= 1; if (p.inTarget(2) >= 8 || real(o2).some(m => o2.clone().play(m).done(2))) r.why.push('④ Black could complete next (not a win)');
    if (p.ply + 2 >= 2 * E.R.cap) r.why.push('④ the 80-move count');
    const outP = ok.length ? E.mFrom(ok[0]) : -1, mine = L.filter(m => E.mFrom(m) === outP && !ok.includes(m));
    if (mine.length < 2) r.why.push(`③ the piece outside has ${mine.length} wrong moves`);
    r.jump = ok.some(m => hops(p, m)); r.hole = ok.length ? E.mTo(ok[0]) : -1;
    r.d = ok.length ? hops(p, ok[0]) * 10 + mine.length : 0; r.order = r.d;
  }
  else if (id === 's_far' || id === 's_ladder') {
    const G = Math.max(...F.map(x => x.g)); ok = L.filter((m, i) => F[i].g === G);
    if (ok.length > 2) r.why.push(`② ${ok.length} farthest moves`);
    if (G < 4) r.why.push(`④ the farthest move gains ${G} (4 or more)`);
    if (!ok.every(m => hops(p, m) >= 2)) r.why.push('④ the farthest move is not a chain (2 hops or more)');
    const second = Math.max(...L.filter(m => !ok.includes(m)).map(m => gainOf(p, m))); r.gap = G - second; r.G = G;
    if (r.gap < 2) r.why.push(`② the gap is ${r.gap}`);
    const lure = L.filter((m, i) => !ok.includes(m) && F[i].h && F[i].g >= 2); r.lure = lure.length;
    if (!lure.length) r.why.push('③ no shorter forward jump to compare');
    const D = DIST[me], mineD = []; for (let i = 0; i < 64; i++) if (p.sq[i] === me && !T[i]) mineD.push(D[i]);
    const fa = ok.length ? D[E.mFrom(ok[0])] : 0;
    if (id === 's_far') {
      if (!ok.every(m => F[L.indexOf(m)].opp === 0)) r.why.push('④ s_far: the answer hops over Black (that is s_ladder)');
      // check every piece: the answer's piece is behind, a piece nearer the corner has a forward jump (the lure)
      if (!lure.some(m => D[E.mFrom(m)] < fa)) r.why.push('④ no piece in front with a jump (the lure)');
      if (mineD.filter(x => x > fa).length > mineD.filter(x => x < fa).length) r.why.push('④ the answer\'s piece is not in the back half');
      r.d = G * 10 + Math.min(r.lure, 9); r.order = r.d;
    } else {
      if (!ok.every(m => F[L.indexOf(m)].opp >= 1)) r.why.push('④ s_ladder: the answer does not hop over Black');
      const own = L.filter((m, i) => F[i].opp === 0).map(m => gainOf(p, m)); r.own = Math.max(...own);
      if (r.own > G - 2) r.why.push(`④ hopping over White only gains ${r.own} (the ladder gains ${G})`);
      if (!lure.some(m => F[L.indexOf(m)].opp === 0)) r.why.push('③ no own-pieces jump to compare');
      const spr = new Set(); for (const m of L) if (hops(p, m) && gainOf(p, m) >= 2) { const Q = E.path(p, m); for (let i = 1; i < Q.length; i++) if (p.sq[(Q[i - 1] + Q[i]) / 2] === 2) spr.add((Q[i - 1] + Q[i]) / 2); }
      if (spr.size < 2) r.why.push('追52 fewer than 2 black springboards to mark');
      r.d = G * 10 + Math.min(r.lure, 9); r.order = r.d;
    }
  } else if (id === 's_road') {
    if (L.some((m, i) => F[i].h && F[i].g > 0)) r.why.push('④ a jump already goes forward');
    const N = Math.max(...F.map(x => x.nx)); ok = L.filter((m, i) => F[i].nx === N);
    if (ok.length > 2) r.why.push(`② ${ok.length} moves build the longest road`);
    if (!ok.every(m => !hops(p, m))) r.why.push('④ the answer is not a step');
    if (N < 4) r.why.push(`④ the road gains ${N} (4 or more)`);
    if (!ok.every((m, i) => F[L.indexOf(m)].nh >= 2)) r.why.push('④ the next move is not a chain');
    // the road: the stepped piece is a rung of the next chain (not the jumper itself)
    for (const m of ok) { const q = p.clone().play(m), n = nextBest(q), P2 = E.path(n.pos, n.m); if (E.mFrom(n.m) === E.mTo(m) || !P2.some((x, i) => i && (P2[i - 1] + x) / 2 === E.mTo(m))) r.why.push('④ the stepped piece is not a rung of the next chain'); r.jumper = E.mFrom(n.m); if (ok.some(o => E.mFrom(o) === r.jumper)) r.why.push('追52 a jumper is a stepped piece'); }
    const second = Math.max(...L.filter(m => !ok.includes(m)).map(m => F[L.indexOf(m)].nx)); r.gap = N - second;
    if (r.gap < 2) r.why.push(`② the gap is ${r.gap}`);
    r.lure = L.filter((m, i) => !ok.includes(m) && F[i].nx >= 2).length; r.N = N;
    if (r.lure < 1) r.why.push('③ no shorter road to compare');
    r.d = N * 10 + Math.min(r.lure, 9); r.order = r.d;
  }
  else if (id === 's_deep') {
    // Black standing still (追74): the fewest White moves to fill the corner now (N, 3–6), after every legal move 1 + dist; the
    // answer = the moves that keep N (1–2); every other move finite and slower; a move into the corner is slower (the lure: the
    // intro says going in is not always fastest, 追70); no Black piece in White's corner; no starting-corner piece of White
    // (the 40-move rule); the count limit (80 moves each) far away
    const N = deepDist(p); r.N = N;
    if (!(N >= 3 && N <= 6)) r.why.push(`④ the corner needs ${N} moves (3–6)`);
    if ([...Array(64).keys()].some(i => TGT1[i] && p.sq[i] === 2)) r.why.push('④ a black piece sits in White\'s corner');
    if (p.inHome(1)) r.why.push('④ a white piece still in its starting corner (the 40-move rule)');
    if (p.ply + 2 * N + 2 > 2 * E.R.cap) r.why.push('④ the 80-move count is near');
    if (F.some(x => !isFinite(x.n))) r.why.push('⑧ a move after which the corner cannot be filled (Black frozen)');
    ok = L.filter((m, i) => F[i].n === N);
    if (!ok.length || F.some(x => x.n < N)) r.why.push('① the solver disagrees with itself');
    if (ok.length > 2) r.why.push(`② ${ok.length} fastest moves`);
    const lure = L.filter((m, i) => !ok.includes(m) && F[i].k === 'in'); r.lure = lure.length;
    if (!lure.length) r.why.push('③④追70 no slower move into the corner (the lure the intro speaks of)');
    r.jump = ok.some(m => hops(p, m)); r.inAns = ok.some(m => F[L.indexOf(m)].k === 'in');
    r.second = Math.min(...F.filter(x => x.n > N).map(x => x.n));
    r.d = N * 10 + Math.min(lure.length * 2 + L.filter((m, i) => !ok.includes(m) && F[i].n === N + 1).length / 4, 9); r.order = r.d;
  }
  else if (id === 's_count') {
    // read the race: both counts after every legal move (the other side frozen); ok = the moves with bs > ws (1–3), every one
    // moves a springboard of Black's and makes Black slower; the exact solver agrees; a wrong move as fast for White (the lure);
    // no piece at home (the 40-move rule), no piece in the other's corner, the 80-move count far away
    ok = L.filter((m, i) => F[i].r === 'win');
    if (F.some(x => !isFinite(x.ws) || !isFinite(x.bs))) r.why.push('⑧ a move after which a count is endless (a corner cannot be filled)');
    if (p.inHome(1) || p.inHome(2)) r.why.push('④ a piece still in its starting corner (the 40-move rule)');
    if ([...Array(64).keys()].some(i => (TGT1[i] && p.sq[i] === 2) || (E.target(2)[i] && p.sq[i] === 1))) r.why.push('④ a piece in the other side\'s corner');
    const mx = Math.max(...F.map(x => Math.max(x.ws, x.bs)).filter(isFinite));
    if (p.ply + 2 * mx + 2 > 2 * E.R.cap) r.why.push('④ the 80-move count is near');
    if (ok.length > 3) r.why.push(`② ${ok.length} winning moves`);
    const W = ok.length ? Math.min(...ok.map(m => F[L.indexOf(m)].ws)) : 0; r.W = W; r.B0 = F[0].bs0;
    if (ok.length && !(W >= 3 && W <= 7)) r.why.push(`④ White needs ${W} moves (3–7)`);
    if (!ok.every(m => F[L.indexOf(m)].spring && F[L.indexOf(m)].bs > F[L.indexOf(m)].bs0)) r.why.push('④ an answer does not move Black\'s springboard (Black not slower)');
    const lure = L.filter((m, i) => !ok.includes(m) && F[i].ws <= W); r.lure = lure.length;
    if (!lure.length) r.why.push('③ no wrong move as fast for White (the lure: only Black\'s count tells)');
    r.jump = ok.some(m => hops(p, m));
    r.d = W * 10 + Math.min(lure.length, 9); r.order = r.d;
  }
  else if (id === 's_block') {
    // Black's longest move now (as if White passed) is a chain of 2 hops or more gaining 4 or more; the answer = the moves after
    // which Black's farthest reply is shortest (1–2 of them), 2 shorter than after any other move and 2 shorter than now
    const b0 = blackBest(p); r.G0 = b0.g;
    if (b0.g < 4 || b0.h < 2) r.why.push(`④ Black's longest move now gains ${b0.g} with ${b0.h} hops (a chain of 4 or more)`);
    if (p.ply > 60 || (p.ply > 44 && (p.inHome(1) || p.inHome(2)))) r.why.push('④ the 40-move rule is near (pieces at home)');
    if (p.inTarget(2) > 5 || p.inTarget(1) > 5) r.why.push('④ the race is nearly over');
    const B = Math.min(...F.map(x => x.b)); ok = L.filter((m, i) => F[i].b === B); r.B = B;
    if (ok.length > 2) r.why.push(`② ${ok.length} moves stop Black as well`);
    if (b0.g - B < 2) r.why.push(`④ the block saves ${b0.g - B} (2 or more)`);
    const second = Math.min(...L.filter(m => !ok.includes(m)).map(m => F[L.indexOf(m)].b)); r.gap = second - B;
    if (r.gap < 2) r.why.push(`② the gap is ${r.gap}`);
    if (!ok.every(m => F[L.indexOf(m)].g >= -1)) r.why.push('④ the answer goes back 2 or more');
    if (!ok.every(m => F[L.indexOf(m)].land || F[L.indexOf(m)].spring)) r.why.push('④ the answer neither takes a landing square nor moves a springboard');
    const lure = L.filter((m, i) => !ok.includes(m) && F[i].g >= 2 && F[i].b >= b0.g); r.lure = lure.length;
    if (!lure.length) r.why.push('③ no forward move of 2 or more that leaves the long move (the lure)');
    r.kind = ok.length ? (F[L.indexOf(ok[0])].land ? 'land' : 'spring') : '';
    r.d = (b0.g - B) * 10 + Math.min(L.filter((m, i) => !ok.includes(m) && F[i].b < b0.g).length, 9); r.order = r.d;
  } else if (id === 's_leave') {
    // White's 39th or 40th move with pieces still in its starting corner: the answer = the moves after which White can empty the
    // corner by its 40th move whatever Black replies (else the 40-move rule loses: Black's corner is empty)
    const left = E.R.limit - p.movesOf(1) - 1; r.left = left; r.c0 = p.inHome(1);
    if (left < 0 || left > 1) r.why.push(`④ White's move ${p.movesOf(1) + 1} (the 39th or 40th)`);
    if (!r.c0) r.why.push('④ no piece in the starting corner');
    if (p.inHome(2)) r.why.push('④ Black has a piece at home too (a draw, not a loss)');
    if (p.inTarget(1) > 6 || p.inTarget(2) > 6) r.why.push('④ the race is nearly over (7+ home)');
    ok = L.filter((m, i) => F[i].safe);
    if (!ok.length) r.why.push('① no move saves the corner');
    const lure = L.filter((m, i) => !ok.includes(m) && F[i].g >= 2); r.lure = lure.length;
    if (!lure.length) r.why.push('③ no forward move of 2 or more to tempt (the lure)');
    r.kind = left === 0 ? 'last' : r.c0 >= 2 ? 'two' : 'deep';
    if (r.kind === 'deep' && ok.some(m => !HOME1[E.mFrom(m)])) r.why.push('④ deep: a move of another piece is safe too');
    if (left === 1 && !L.some((m, i) => F[i].k === 'block')) r.why.push('④ the 39th move: no wrong move that Black can punish by blocking');
    r.d = (left + 1) * 10 + r.c0 * 3 + Math.min(L.length - ok.length, 60) / 20; r.order = r.d;
  }
  const wrong = L.length - ok.length;
  if (L.length < 12) r.why.push(`③ ${L.length} legal moves`);
  if (wrong < 3) r.why.push(`③ ${wrong} wrong moves`);
  if (ok.length * 3 > L.length) r.why.push(`③追17 ${ok.length} of ${L.length} moves are right`);
  r.ok = ok; r.best = ok[0]; r.key = ok[0]; r.pass = !r.why.length && ok.length > 0;
  return r;
}
const RULES = {
  b_step: { count: 5, slotOk: () => true },
  b_jump: { count: 5, slotOk: (C, c) => c.hops === 1 ? C.filter(x => x.hops === 1).length < 2 : C.filter(x => x.hops > 1).length < 3 },
  b_enter: { count: 5, slotOk: (C, c) => C.filter(x => x.jump === c.jump).length < 3 },
  s_far: { count: 5, slotOk: () => true },
  s_ladder: { count: 5, slotOk: () => true },
  s_road: { count: 5, slotOk: () => true },
  s_block: { count: 5, slotOk: (C, c) => C.filter(x => x.kind === c.kind).length < 3 },
  s_count: { count: 5, slotOk: (C, c) => C.filter(x => x.W === c.W).length < 3 && C.filter(x => x.jump === c.jump).length < 3 },
  s_deep: { count: 5, slotOk: (C, c) => C.filter(x => x.N === c.N).length < 2 && C.filter(x => x.jump === c.jump).length < 3 },
  s_leave: { count: 5, slotOk: (C, c) => C.filter(x => x.kind === c.kind).length < 2 },
  b_finish: { count: 5, slotOk: (C, c) => C.filter(x => x.jump === c.jump).length < (c.jump ? 3 : 2) && C.filter(x => x.hole === c.hole).length < 2 },
};
function verify(opt) {
  opt = opt || {};
  const LS = opt.data || JSON.parse(fs.readFileSync(path.join(ROOT, 'ugolki/lessons.json'), 'utf8'));
  const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'ugolki/puzzles.json'), 'utf8'));
  const UL = opt.ul || require(path.join(ROOT, 'atlas/ls-ugolki.js'));
  const I18N = opt.i18n || load2D();
  const out = [], rows = [];
  const add = (id, j, m) => out.push({ id, q: j + 1, msg: m });
  const READY = UL.READY || [];
  // ⑤ the pool
  const pool = [];
  PZ.themes.forEach(T => T.puzzles.forEach((P, j) => pool.push({ tag: 'puzzle ' + T.id + '#' + (j + 1), b: P.s.b })));
  LS.steps.forEach(st => { (st.problems || []).forEach((P, j) => pool.push({ tag: st.id + '#' + (j + 1), b: P.s.b, id: st.id, j })); (st.ramp || []).forEach((P, j) => P.s && pool.push({ tag: st.id + ' ramp' + (j + 1), b: P.s.b })); });
  for (const id of READY) {
    const st = LS.steps.find(s => s.id === id); if (!st) { add(id, -1, '④ the step is missing'); continue; }
    const C = [], keys = new Set();
    st.problems.forEach((P, j) => {
      const p = E.Pos.from(P.s), c = classify(id, p, j);
      if (!c) { add(id, j, '④ not White to move'); return; }
      c.why.forEach(w => add(id, j, w));
      const ok = P.ok || [];
      if (!(ok.length === c.ok.length && ok.every(m => c.ok.includes(m)))) add(id, j, `①② the stored ok (${ok.map(m => E.name(p, m)).join(' ')}) ≠ the goal's set (${c.ok.map(m => E.name(p, m)).join(' ')})`);
      if (!ok.includes(P.best)) add(id, j, '① best is not in ok');
      if (id === 's_deep') { const dn = new Map(P.dn || []); for (const m of real(p)) { const w = factOf(id, p, m).n; if (dn.get(m) !== w) { add(id, j, `① the stored count of ${E.name(p, m)} (${dn.get(m)}) ≠ the solver's ${w}`); break; } } if (dn.size !== real(p).length) add(id, j, '① the stored counts are not every legal move'); }
      if (id === 's_count') {
        const cn = new Map((P.cn || []).map(x => [x[0], x])); for (const m of real(p)) { const w = factOf(id, p, m), x = cn.get(m); if (!x || x[1] !== w.ws || x[2] !== w.bs) { add(id, j, `① the stored counts of ${E.name(p, m)} (${x ? x.slice(1) : '—'}) ≠ the solver's ${w.ws},${w.bs}`); break; } }
        if (cn.size !== real(p).length) add(id, j, '① the stored counts are not every legal move');
        if (P.b0 !== factOf(id, p, real(p)[0]).bs0) add(id, j, `① the stored Black count now (${P.b0}) ≠ the solver's`);
        // ① the exact two-player game (both sides move, every rule): the winning first moves = the count's set
        if (c.ok.length && !opt.fast) { const G = E.duelGood(P.s, [], Math.max(...c.ok.map(m => factOf(id, p, m).ws)) + 1, 'c33', 8e7); if (!G) add(id, j, '① the exact solver ran out of budget'); else if (!(G.length === c.ok.length && G.every(m => c.ok.includes(m)))) add(id, j, `① the exact solver wins with ${G.map(m => E.name(p, m)).join(' ') || 'nothing'}, the count with ${c.ok.map(m => E.name(p, m)).join(' ')}`); }
      }
      if (keys.has(P.best)) add(id, j, '④追27 the same answer twice in the lesson'); keys.add(P.best);
      for (const A of pool) { if (A.id === id && A.j === j) continue; if (near(A.b, P.s.b)) add(id, j, `⑤ within 4 squares of ${A.tag}`); }
      C.push(c);
      // ⑦⑧ the words for every legal move (ja) and the hint
      const V = UL.voice(j * 7 + 3);
      if (real(p).includes(P.best)) for (const m of real(p)) {
        const want = factOf(id, p, m), got = UL.fact(E, id, P.s, m, P), right = ok.includes(m);
        if (!got || got.k !== want.k || ['g', 'h', 'home', 'holes', 'opp', 'nx', 'nh', 'n', 'ws', 'bs', 'bs0', 'spring'].some(x => got[x] !== want[x])) { add(id, j, `⑧ the facts of ${E.name(p, m)}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); continue; }
        const html = UL.say(E, id, P, m, 'ja', V, false, x => x).html;
        if (!html || /\{[a-z]+\}|undefined|NaN/.test(html)) { add(id, j, `⑧ the words for ${E.name(p, m)}: ${html}`); continue; }
        if (right !== /^(<[^>]*>)?\S*(正解|お見事|ばっちり|そのとおり|さすが|いいね|すごい|やったね)/.test(html.replace(/^\s+/, ''))) add(id, j, `⑦ ${E.name(p, m)} ${right ? 'right' : 'wrong'} but the words ${right ? 'do not praise' : 'praise'}: ${html.slice(0, 40)}`);
        const nums = expectNums(id, p, P, m, c); if (!right && /途中/.test(html) && !(E.mFrom(m) === E.mFrom(P.best) && E.path(p, P.best).slice(1, -1).includes(E.mTo(m)))) add(id, j, `⑧ ${E.name(p, m)}: the words say it stopped on the way`); if (/陣地の外/.test(html) && want.inT) add(id, j, `⑧ ${E.name(p, m)} lands in the corner, the words say outside`); for (const [k, v] of Object.entries(nums)) if (!html.includes(String(v))) add(id, j, `⑧ the words for ${E.name(p, m)} miss ${k}=${v}: ${html}`);
        const fb = factOf(id, p, P.best);
        if (!right) {
          if (id === 'b_step' && want.k === 'step') add(id, j, '⑧ a wrong move gets closer');
          if (id === 'b_jump' && want.g >= fb.g) add(id, j, '⑧ a wrong move goes as far');
          if (id === 'b_enter' && want.k === 'in') add(id, j, '⑧ a wrong move goes in');
          if (id === 'b_finish' && want.k === 'done') add(id, j, '⑧ a wrong move completes');
          if ((id === 's_far' || id === 's_ladder') && want.g >= fb.g) add(id, j, '⑧ a wrong move goes as far');
          if (id === 's_road' && want.nx >= fb.nx) add(id, j, '⑧ a wrong move builds as long a road');
          // the kind the words name: front / own pieces / stopped on the way / back / step
          if ((id === 's_far' || id === 's_ladder')) {
            const D = DIST[1], stop = E.mFrom(m) === E.mFrom(P.best) && E.path(p, P.best).slice(1, -1).includes(E.mTo(m));
            if (/前の駒|前にいる駒/.test(html) && !(want.h && D[E.mFrom(m)] < D[E.mFrom(P.best)])) add(id, j, `⑧ ${E.name(p, m)}: the words say a piece in front`);
            if (/自分の駒だけ/.test(html) && !(want.h && want.opp === 0)) add(id, j, `⑧ ${E.name(p, m)}: the words say it hops over White only`);
            if (/途中/.test(html) !== stop) add(id, j, `⑧ ${E.name(p, m)}: stopped on the way ${stop}, the words ${/途中/.test(html)}`);
            if (/遠ざか|下が/.test(html) !== (want.g < 0)) add(id, j, `⑧ ${E.name(p, m)}: gain ${want.g}, the words on going back disagree`);
            if (/1歩/.test(html) !== !want.h) add(id, j, `⑧ ${E.name(p, m)}: a step ${!want.h}, the words disagree`);
          }
          if (id === 's_block' && want.b <= fb.b) add(id, j, '⑧ a wrong move stops Black as well');
          if (id === 's_block' && want.b < 4) add(id, j, `⑨ the 2D ng says Black still jumps far, ${E.name(p, m)} leaves ${want.b}`);
          if (id === 's_leave' && want.safe) add(id, j, '⑧ a wrong move empties the corner in time');
          if (id === 's_block') { const red = html.split('緑')[0]; if (/そのまま|ふさがらず|変わらない|残って/.test(red) !== (want.k === 'still')) add(id, j, `⑧ ${E.name(p, m)}: Black's move unchanged ${want.k === 'still'}, the words disagree`); if (/伸び|新しい跳び台/.test(red) !== (want.k === 'more')) add(id, j, `⑧ ${E.name(p, m)}: longer ${want.k === 'more'}, the words disagree`); if (/縮む/.test(red) !== (want.k === 'part')) add(id, j, `⑧ ${E.name(p, m)}: shorter ${want.k === 'part'}, the words disagree`); }
          if (id === 's_deep') { if (want.n <= fb.n) add(id, j, '⑧ a wrong move fills the corner as fast'); const red = html.split('緑')[0]; if (/陣地に入る|陣地に入って|陣地に1こ入/.test(red) !== (want.k === 'in')) add(id, j, `⑧ ${E.name(p, m)}: into the corner ${want.k === 'in'}, the words disagree`); if (/中で動いた/.test(red) !== (want.k === 'inside')) add(id, j, `⑧ ${E.name(p, m)}: inside the corner ${want.k === 'inside'}, the words disagree`); if (/陣地から出/.test(red) !== (want.k === 'leave')) add(id, j, `⑧ ${E.name(p, m)}: out of the corner ${want.k === 'leave'}, the words disagree`); if (/遠ざか/.test(red) !== (want.k === 'back')) add(id, j, `⑧ ${E.name(p, m)}: going back ${want.k === 'back'}, the words disagree`); if (!html.includes(`${want.n - fb.n}手`)) add(id, j, `⑧ ${E.name(p, m)}: the words miss the moves lost (${want.n - fb.n})`); }
          if (id === 's_count') {
            if (want.r === 'win') add(id, j, '⑧ a wrong move wins by count');
            const red = html.split('緑')[0];
            if (/引き分け/.test(red) !== (want.r === 'draw')) add(id, j, `⑧ ${E.name(p, m)}: a draw ${want.r === 'draw'}, the words disagree`);
            if (/先に完成/.test(red) !== (want.r === 'lose')) add(id, j, `⑧ ${E.name(p, m)}: Black first ${want.r === 'lose'}, the words disagree`);
            if (/そのまま残/.test(red) !== (want.k === 'keep')) add(id, j, `⑧ ${E.name(p, m)}: the springboard stays and Black's count unchanged ${want.k === 'keep'}, the words disagree`);
            if (/減/.test(red) !== (want.k === 'gift')) add(id, j, `⑧ ${E.name(p, m)}: Black faster ${want.k === 'gift'}, the words disagree`);
            if (/増える/.test(red) !== (want.k === 'more')) add(id, j, `⑧ ${E.name(p, m)}: Black slower ${want.k === 'more'}, the words disagree`);
            if (/動くけど/.test(red) !== (want.k === 'sMove')) add(id, j, `⑧ ${E.name(p, m)}: a springboard moved ${want.k === 'sMove'}, the words disagree`);
            if (/遅くない/.test(red) !== (want.ws <= fb.ws)) add(id, j, `⑧ ${E.name(p, m)}: as fast for White ${want.ws <= fb.ws}, the words disagree`);
          }
          if (id === 's_leave') { const left = want.left; if (/ふさ/.test(html.split('緑')[0]) !== (left === 1 && want.c <= left)) add(id, j, `⑧ ${E.name(p, m)}: Black's block is the reason ${left === 1 && want.c <= left}, the words disagree`); if (/隅の中で動いた/.test(html) !== (left === 1 && want.c <= left && want.k === 'inside')) add(id, j, `⑧ ${E.name(p, m)}: moved inside the corner, the words disagree`); if (/40手目が終わる/.test(html.split('緑')[0]) !== (left === 0)) add(id, j, `⑧ ${E.name(p, m)}: the 40th move ${left === 0}, the words disagree`); }
          if (id === 's_road') { if (/ジャンプ/.test(html.split('緑')[0]) !== !!want.h) add(id, j, `⑧ ${E.name(p, m)}: a jump ${!!want.h}, the words disagree`); if (/前へ進める手がない|近づけない/.test(html) !== (want.nx <= 0)) add(id, j, `⑧ ${E.name(p, m)}: next gain ${want.nx}, the words disagree`); }
        } else {
          if (id === 's_ladder' && !/黒/.test(html)) add(id, j, '⑧ the praise does not say Black was used');
          if (id === 's_road' && /下が/.test(html) !== (want.g < 0)) add(id, j, `⑧ the praise on stepping back disagrees (gain ${want.g})`);
          if (id === 's_block') { if (/着地/.test(html) !== want.land || (!want.land && !/跳び台/.test(html))) add(id, j, `⑧ the praise: landing ${want.land}, springboard ${want.spring}`); if (/下が/.test(html) !== (want.g < 0)) add(id, j, `⑧ the praise on stepping back disagrees (gain ${want.g})`); }
          if (id === 's_deep') { if (/陣地に入/.test(html) !== (want.k === 'in')) add(id, j, `⑧ the praise: into the corner ${want.k === 'in'}, the words disagree`); if (/ジャンプ|跳/.test(html) !== !!want.h) add(id, j, `⑧ the praise: a jump ${!!want.h}, the words disagree`); }
          if (id === 's_count') { if (!/勝ち/.test(html) || !/跳び台/.test(html)) add(id, j, '⑧ the praise does not say the win and the springboard'); if (want.r !== 'win') add(id, j, '⑧ a right move does not win by count'); }
          if (id === 's_leave') { if (/隅の中/.test(html) !== (want.left === 1 && want.c > 0 && want.homeF && want.homeT)) add(id, j, '⑧ the praise: still inside the corner disagrees'); if (/空っぽ/.test(html) !== (want.c === 0)) add(id, j, `⑧ the praise: the corner empty ${want.c === 0}, the words disagree`); }
        }
      }
      const hp = real(p).includes(P.best) ? UL.hintPts(E, id, P) : [];
      if (!hp.length) add(id, j, '追52 the hint marks nothing');
      if (id === 'b_enter' || id === 'b_finish') { const T = E.target(1); if (hp.some(x => !T[x] || p.sq[x] !== 0)) add(id, j, '追52 the hint should mark the empty squares of the corner'); }
      if (id === 'b_finish' && hp.length !== 1) add(id, j, '⑧ the hint should mark the one hole');
      if (id === 's_far') { const D = DIST[1], fw = real(p).filter(x => hops(p, x) && gainOf(p, x) >= 2).map(E.mFrom); if (hp.length < 2 || !hp.every(x => p.sq[x] === 1 && fw.includes(x)) || !fw.every(x => hp.includes(x))) add(id, j, '追52 the hint should mark every piece with a forward jump (2 or more)'); }
      if (id === 's_ladder') { if (hp.length < 2 || !hp.every(x => p.sq[x] === 2)) add(id, j, '追52 the hint should mark the black springboards (2 or more)'); const Q = E.path(p, P.best); if (!Q.some((x, i) => i && hp.includes((Q[i - 1] + x) / 2))) add(id, j, '⑧ the answer hops over none of the marked black pieces'); }
      if (id === 's_road' && /下がる1歩/.test((UL.JA.intro.s_road || '') + UL.JA.hint.s_road.join('')) && !LS.steps.find(x => x.id === 's_road').problems.some(Q => { const q = E.Pos.from(Q.s); return Q.ok.some(m => gainOf(q, m) < 0); })) add(id, j, '追70 the intro / hints speak of a step back, no answer steps back');
      if (id === 's_block') { const b0 = blackBest(p); if (!hp.length || hp.some(x => p.sq[x] !== 2) || !b0.all.every(x => hp.includes(x.path[0]))) add(id, j, '追52 the hint should mark the black pieces with the longest move'); }
      if (id === 's_leave') { const o = []; for (let i = 0; i < 64; i++) if (HOME1[i] && p.sq[i] === 1) o.push(i); if (hp.length !== o.length || !o.every(x => hp.includes(x))) add(id, j, '追52 the hint should mark the pieces in the starting corner'); const ask = UL.askOf(E, id, P, UL.voice(j), j === st.problems.length - 1); if (!ask.includes(String(p.movesOf(1) + 1)) && !ask.includes(String(E.R.limit - p.movesOf(1)))) add(id, j, '⑧ the ask does not say which move it is: ' + ask); }
      if (id === 's_deep') { const T = E.target(1), holes = []; for (let i = 0; i < 64; i++) if (T[i] && !p.sq[i]) holes.push(i); if (hp.length !== holes.length || !holes.every(x => hp.includes(x))) add(id, j, '追52 the hint should mark the empty squares of the corner'); const ask = UL.askOf(E, id, P, UL.voice(j), j === st.problems.length - 1); if (!/黒/.test(ask) || !/動かない/.test(ask)) add(id, j, '追74 the ask does not say Black stands still: ' + ask); }
      if (id === 's_count') { const sp = springs(p); if (hp.length !== sp.length || !sp.every(x => hp.includes(x))) add(id, j, '追52 the hint should mark the white pieces Black can hop over'); if (!P.ok.every(m => hp.includes(E.mFrom(m)))) add(id, j, '⑧ an answer does not move a marked piece'); const ask = UL.askOf(E, id, P, UL.voice(j), j === st.problems.length - 1); if (!/動かない|止まって|止まった|動かさず/.test(ask)) add(id, j, '追74 the ask does not say the other side stands still when counting: ' + ask); const ht = UL.hintTxt ? UL.hintTxt(E, id, P, UL.voice(j)) : ''; if (!ht.includes(String(P.b0))) add(id, j, `⑧ the hint does not say Black's count now (${P.b0}): ${ht}`); }
      if (id === 's_road') { if (!hp.length || hp.some(x => P.ok.some(m => E.mFrom(m) === x)) || hp.some(x => p.sq[x] !== 1)) add(id, j, '追52 the hint should mark the jumper (not the stepped piece)'); }
      rows.push({ id, q: j + 1, legal: c.legal, ok: c.ok.length, d: c.d, best: real(p).includes(P.best) ? E.name(p, P.best) : "—" });
    });
    // ⑥ easy → hard
    for (let j = 1; j < C.length; j++) if (C[j].d < C[j - 1].d) add(id, j, `⑥ d ${C[j].d} after ${C[j - 1].d}`);
    if (id === 'b_jump' && !(C.slice(0, 2).every(c => c.hops === 1) && C.slice(2).every(c => c.hops >= 3))) add(id, -1, '④ the lesson promises single hops first, then chains');
    if (id === 'b_enter' && !(C.some(c => c.jump) && C.some(c => !c.jump))) add(id, -1, '④追27 the answers should be steps and jumps');
    if (id === 's_count') { if (!(C.some(c => c.jump) && C.some(c => !c.jump))) add(id, -1, '④追27 the answers should be steps and jumps');
      // every variant of the words (the voice picks one per problem): the praise says the springboard and the win; each red-part list says its kind
      for (const x of UL.JA.w.count || []) if (!/跳び台/.test(x) || !/勝ち/.test(x) || !/\{w\}/.test(x) || !/\{b\}/.test(x) || !/\{b0\}/.test(x)) add(id, -1, '⑧ a praise variant misses the springboard, the win or a count: ' + x);
      const KW = { cKeep: /そのまま残/, cGift: /減/, cMore: /増える/, cMove: /動くけど/, cDraw: /引き分け/, cLose: /先に完成/, c0: /遅くない/ };
      for (const [k, re] of Object.entries(KW)) for (const x of UL.JA.n[k] || []) if (!re.test(x) || /緑/.test(x)) add(id, -1, `⑧ a ${k} variant does not say its kind: ${x}`);
      for (const x of UL.JA.n.cGreen || []) if (!/^緑/.test(x) || !/\{W\}/.test(x) || !/\{B\}/.test(x)) add(id, -1, '⑧ a cGreen variant misses the counts: ' + x);
      // 追14 the 2D warm-up: its arrow is a winning move of its board, its words name both counts, Black's count now and the springboard
      for (const R of st.ramp || []) { if (!R.s || !R.seq || !R.seq.length) continue; const p = E.Pos.from(R.s), m = real(p).find(x => E.name(p, x) === R.seq[0]); if (m == null) { add(id, -1, `追14 the warm-up arrow ${R.seq[0]} is not a legal move`); continue; }
        const c = classify(id, p); if (!c || !c.ok.includes(m)) { add(id, -1, `追14 the warm-up arrow ${R.seq[0]} does not win (${c ? c.ok.map(x => E.name(p, x)).join(' ') : '—'})`); continue; }
        const f = factOf(id, p, m), ja = (R.body || {}).ja || '', lure = real(p).find(x => !c.ok.includes(x) && factOf(id, p, x).ws <= f.ws);
        for (const x of [String(f.ws), String(f.bs), String(f.bs0), E.sqName(E.mFrom(m)), R.seq[0]]) if (!ja.includes(x)) add(id, -1, `追14 the warm-up words miss ${x}`);
        const ng = (R.marks || []).filter(x => x[1] === 'ng').map(x => x[0] - 1); if (!ng.length || !ng.every(q => springs(p).includes(q))) add(id, -1, '追14 the warm-up marks (ng) are not Black\'s springboards');
        // the words: another piece at its fastest also needs W and leaves Black at B0 (a draw: W = B0)
        const other = real(p).filter(x => E.mFrom(x) !== E.mFrom(m)).map(x => factOf(id, p, x)), fo = Math.min(...other.map(x => x.ws));
        if (fo !== f.ws || !other.filter(x => x.ws === f.ws).every(x => x.bs === f.bs0) || f.ws !== f.bs0) add(id, -1, `追14 the warm-up says another piece at its fastest needs ${f.ws} and draws (fastest ${fo}, Black ${f.bs0})`);
        for (const l of LANGS) if (!((R.body || {})[l] && (R.t || {})[l])) add(id, -1, `⑨ the warm-up words missing in ${l}`); }
    }
    if (id === 's_deep') { if (!(C.some(c => c.jump) && C.some(c => !c.jump))) add(id, -1, '④追27 the answers should be steps and jumps'); if (!(C.some(c => c.inAns) && C.some(c => !c.inAns))) add(id, -1, '④追27 the answers should both go in and stay outside'); }
    if (id === 'b_finish') { if (!(C.some(c => c.jump) && C.some(c => !c.jump))) add(id, -1, '④追27 the answers should be steps and jumps'); if (new Set(C.map(c => c.hole)).size < 3) add(id, -1, '④追27 fewer than 3 holes'); }
    // 追14 the 2D warm-up (explain) of s_block / s_leave says what its board does: the arrow is a right move, the numbers are the board's
    if (id === 's_block' || id === 's_leave') for (const R of st.ramp || []) {
      if (!R.s || !R.seq || !R.seq.length) continue; const p = E.Pos.from(R.s), m = real(p).find(x => E.name(p, x) === R.seq[0]);
      if (m == null) { add(id, -1, `追14 the warm-up arrow ${R.seq[0]} is not a legal move`); continue; }
      const c = classify(id, p); if (!c || !c.ok.includes(m)) add(id, -1, `追14 the warm-up arrow ${R.seq[0]} is not a right move (${c ? c.ok.map(x => E.name(p, x)).join(' ') : '—'})`);
      if (id === 's_block' && c) { const b0 = blackBest(p), ja = (R.body || {}).ja || ''; for (const x of [E.sqName(b0.all[0].path[0]), String(b0.all[0].path.length - 1), String(c.G0), String(c.B), R.seq[0]]) if (!ja.includes(x)) add(id, -1, `追14 the warm-up words miss ${x}`); if (!factOf(id, p, m).land && /着地/.test(ja)) add(id, -1, '追14 the warm-up says landing square, the arrow does not land on it'); const ngB = (R.marks || []).filter(x => x[1] === 'ng').map(x => x[0] - 1); if (!ngB.length || !ngB.every(q => b0.all.some(x => x.path[0] === q))) add(id, -1, '追14 the warm-up mark (ng, 1-based) is not the black piece with the longest move'); }
      if (id === 's_leave') { const mk = (R.marks || []).map(x => x[0] - 1); if (!real(p).every(x => mk.includes(E.mFrom(x)) || !factOf(id, p, x).safe)) add(id, -1, '追14 the warm-up says the marked piece must move now, another move is safe'); const ja = (R.body || {}).ja || ''; if (!ja.includes(String(p.movesOf(1) + 1))) add(id, -1, '追14 the warm-up does not say which move it is'); }
    }
    // s_deep: the 2D warm-up's arrow is a fastest move of its board, its words name the counts (N, the slower move's count) and a
    // marked square is where a slower move goes in; the intros (3D and 2D) claim only what every problem shows (追70)
    if (id === 's_deep') {
      for (const R of st.ramp || []) { if (!R.s || !R.seq || !R.seq.length) continue; const p = E.Pos.from(R.s), m = real(p).find(x => E.name(p, x) === R.seq[0]); if (m == null) { add(id, -1, `追14 the warm-up arrow ${R.seq[0]} is not a legal move`); continue; }
        const N = deepDist(p), f = factOf(id, p, m); if (f.n !== N) add(id, -1, `追14 the warm-up arrow ${R.seq[0]} needs ${f.n} moves, the fewest is ${N}`);
        const ja = (R.body || {}).ja || '', ng = (R.marks || []).filter(x => x[1] === 'ng').map(x => x[0] - 1);
        const slow = real(p).filter(x => factOf(id, p, x).k === 'in' && factOf(id, p, x).n > N);
        if (!ng.length || !ng.every(q => slow.some(x => E.mTo(x) === q))) add(id, -1, '追14 the warm-up marks (ng) are not where a slower move goes in');
        for (const x of [String(N), R.seq[0]].concat(slow.filter(x => ng.includes(E.mTo(x))).slice(0, 1).map(x => String(factOf(id, p, x).n)))) if (!ja.includes(x)) add(id, -1, `追14 the warm-up words miss ${x}`); }
      for (const l of LANGS) if (/奥から|from the back|desde el fondo|par le fond|pelo fundo|von hinten|पीछे से|من العمق|с дальних|深處|从里|dari belakang|arkadan|안쪽부터/i.test(['intro', 'sub', 'hint'].map(k => (I18N[l] || {})['ls.s_deep.' + k] || '').join(' ') + ' ' + ((st.ramp || [])[0] && st.ramp[0].t ? st.ramp[0].t[l] || '' : '') + ' ' + ((st.ramp || [])[0] && st.ramp[0].body ? st.ramp[0].body[l] || '' : ''))) add(id, -1, `追70 the 2D intro / sub / hint / warm-up (${l}) says fill from the back (not what every answer does)`);
      if (/奥から/.test(UL.JA.intro.s_deep || '')) add(id, -1, '追70 the 3D intro says fill from the back');
    }
    // ⑨ the 2D words
    for (const l of LANGS) for (const k of ['title', 'intro', 'goal', 'hint', 'why', 'ng']) if (!(I18N[l] && I18N[l]['ls.' + id + '.' + k])) add(id, -1, `⑨ ls.${id}.${k} missing in ${l}`);
    // the 3D intro / asks / hints in モリフク's words
    for (const k of ['intro']) if (!(UL.JA[k] && UL.JA[k][id])) add(id, -1, `⑧ no 3D ${k}`);
    if (!(UL.JA.ask[id] && UL.JA.ask[id].length >= 4) || !(UL.JA.hint[id] && UL.JA.hint[id].length >= 3)) add(id, -1, '追46 fewer than 4 asks / 3 hints');
  }
  // 追75 (担当C, konane) every 2D warm-up of every step: the arrows / the right moves are moves of that board, a 'try' has its right
  // set as the lesson counts it (b_step / b_jump / s_far / s_ladder / s_road), the second hint marks pieces (look, 1-based), and a
  // square named by the hint is the start of a right move
  const NAMES = (p) => real(p).map(m => E.name(p, m));
  for (const st of LS.steps) (st.ramp || []).forEach((R, ri) => {
    if (!R.s) return; const p = E.Pos.from(R.s), N = NAMES(p), tag = `ramp${ri + 1}`;
    for (const n of (R.seq || []).slice(0, 1).concat(R.ok || [])) if (!N.includes(n)) add(st.id, -1, `追75 ${tag}: ${n} is not a move of its board`);
    if (R.k !== 'try') return;
    const ok = (R.ok || []).map(n => real(p).find(m => E.name(p, m) === n)).filter(m => m != null);
    if (['b_step', 'b_jump', 's_far', 's_ladder', 's_road'].includes(st.id)) {
      const F = real(p).map(m => [m, factOf(st.id, p, m)]), key = st.id === 's_road' ? 'nx' : 'g', cand = F.filter(([m, f]) => st.id !== 'b_step' || !f.h);
      const mx = Math.max(...cand.map(([m, f]) => f[key])), want = st.id === 'b_step' ? cand.filter(([m, f]) => f.g > 0).map(x => x[0]) : cand.filter(([m, f]) => f[key] === mx).map(x => x[0]);
      if (want.length !== ok.length || !want.every(m => ok.includes(m))) add(st.id, -1, `追75 ${tag}: the right moves ${R.ok.join(' ')} ≠ ${want.map(m => E.name(p, m)).join(' ')}`);
    }
    if (!(R.look || []).length || R.look.some(q => !p.sq[q - 1])) add(st.id, -1, `追75 ${tag}: the second hint marks ${JSON.stringify(R.look)} (no piece)`);
    for (const l of Object.keys(R.h || {})) for (const c of (R.h[l].match(/[a-h][1-8]/g) || [])) if (!ok.some(m => E.sqName(E.mFrom(m)) === c)) add(st.id, -1, `追75 ${tag}: the hint (${l}) names ${c}, no right move starts there`);
  });
  // the 3D lists only the checked steps; 2D app: a move in ok scores 20
  const app = fs.readFileSync(path.join(ROOT, 'ugolki/app.js'), 'utf8');
  if (!/if \(P\.ok\) return okAnswer\(P, s, m, pts\)/.test(app)) add('2D', -1, '⑨ ugolki/app.js does not answer ok problems with okAnswer');
  // 追77: the 40-move limit is not on the 3D board: the 3D ask names the move (checked above), the 2D shows 'at home · moves left' in a lesson too
  if (READY.includes('s_leave') && !/if \(home && \(!startSpec \|\| \(startSpec\.n && !startSpec\.free\)\)\)/.test(app)) add('2D', -1, '⑨追77 the 2D lesson does not show the moves left before the 40-move limit');
  return { out, rows, ready: READY };
}
function load2D() {
  const w = { I18N: {} }; LANGS.forEach(l => { w.I18N[l] = {}; });
  for (const f of ['i18n-ug.js', 'i18n-ug-more.js', 'i18n-ug-eu.js', 'i18n-ug-hiar.js']) {
    const tx = fs.readFileSync(path.join(ROOT, 'ugolki', f), 'utf8');
    try { new Function('window', 'I18N', 'document', 'navigator', 'localStorage', tx)(w, w.I18N, { documentElement: {}, querySelectorAll: () => [] }, { language: 'ja' }, { getItem: () => null, setItem() {} }); } catch (e) { console.error(f, e.message); }
  }
  return w.I18N || {};
}
// (the old s_far problem 4, before 2026-11-25: d4:h4 hops over Black)
const ORIG = { steps: [{ id: 's_far', problems: [0, 0, 0, { s: { b: '......ww.....ww..b......b.....b.b.www.b.bb...bw.w....b..........', side: 1, n: 44 }, ok: [2531], best: 2531 }] }] };
function selftest() {
  const base = JSON.parse(fs.readFileSync(path.join(ROOT, 'ugolki/lessons.json'), 'utf8'));
  const cases = [
    ['a wrong ok set (①)', d => { const P = d.steps.find(s => s.id === 'b_step').problems[1]; P.ok = P.ok.slice(1); }, /^①②/],
    ['best outside ok (①)', d => { const P = d.steps.find(s => s.id === 'b_jump').problems[2], p = E.Pos.from(P.s); P.best = real(p).find(m => !P.ok.includes(m)); }, /^① best/],
    ['swapped order (⑥)', d => { const s = d.steps.find(x => x.id === 'b_enter'); [s.problems[0], s.problems[4]] = [s.problems[4], s.problems[0]]; }, /^⑥/],
    ['a mirrored copy (⑤)', d => { const s = d.steps.find(x => x.id === 'b_finish'), P = s.problems[0]; s.problems[3] = { s: { b: symB(P.s.b, SYM[1][0], false), side: 1, n: P.s.n }, ok: [], best: -1 }; }, /^⑤/],
    ['the same answer twice (追27)', d => { const s = d.steps.find(x => x.id === 'b_step'); s.problems[2] = JSON.parse(JSON.stringify(s.problems[1])); }, /追27/],
    ['Black completes next: not a win (④)', d => { const P = d.steps.find(x => x.id === 'b_finish').problems[1], a = P.s.b.split('').map(c => c === 'b' ? '.' : c); const H = E.target(2); let k = 0; for (let i = 0; i < 64; i++) if (H[i] && a[i] === '.' && k < 8) { a[i] = 'b'; k++; } for (let i = 63; i >= 0; i--) if (H[i] && a[i] === '.') { const r = i >> 3, c = i & 7; const nb = [[r, c + 1], [r - 1, c]].map(([y, x]) => y * 8 + x).find(q => q >= 0 && !H[q] && a[q] === '.'); if (nb != null) { a[nb] = 'b'; break; } } P.s.b = a.join(''); }, /④ Black could complete/],
    ['s_road: a shorter road as the answer (①② 追74)', d => { const P = d.steps.find(x => x.id === 's_road').problems[2], p = E.Pos.from(P.s); const w = real(p).find(m => !P.ok.includes(m) && !hops(p, m)); P.ok = [w]; P.best = w; }, /^①②/],
    ['s_far: the answer hops over Black (④ 追36)', d => { const s = d.steps.find(x => x.id === 's_far'); s.problems[3] = JSON.parse(JSON.stringify(ORIG.steps.find(x => x.id === 's_far').problems[3])); }, /④ s_far: the answer hops over Black/],
    ['s_block: a move that does not block as the answer (①②)', d => { const P = d.steps.find(x => x.id === 's_block').problems[1], p = E.Pos.from(P.s); const w = real(p).find(m => !P.ok.includes(m)); P.ok = [w]; P.best = w; }, /^①②/],
    ['s_leave: the 41st move (④)', d => { const P = d.steps.find(x => x.id === 's_leave').problems[0]; P.s = Object.assign({}, P.s, { n: P.s.n - 6 }); }, /④ White's move/],
    ['s_leave: Black still at home too (④)', d => { const P = d.steps.find(x => x.id === 's_leave').problems[2], a = P.s.b.split(''); const H = E.HOME()[2]; for (let i = 0; i < 64; i++) if (H[i] && a[i] === '.') { a[i] = 'b'; break; } P.s.b = a.join(''); }, /Black has a piece at home/],
    ['s_block warm-up: an arrow that does not block (追14)', d => { const R = d.steps.find(x => x.id === 's_block').ramp[0], p = E.Pos.from(R.s); R.seq = [E.name(p, real(p).find(m => !classify('s_block', p).ok.includes(m)))]; }, /追14 the warm-up arrow/],
    ['a warm-up whose hint marks nothing (追75)', d => { d.steps.find(x => x.id === 'b_jump').ramp[2].look = []; }, /追75 ramp3: the second hint/],
    ['a warm-up hint naming the wrong piece (追75)', d => { const r = d.steps.find(x => x.id === 'b_jump').ramp[2]; r.h = Object.assign({}, r.h, { ja: 'a2の駒から' }); }, /追75 ramp3: the hint \(ja\) names a2/],
    ['s_deep: a slower move as the answer (①② 追74)', d => { const P = d.steps.find(x => x.id === 's_deep').problems[1], p = E.Pos.from(P.s); const w = real(p).find(m => !P.ok.includes(m)); P.ok = [w]; P.best = w; }, /^①②/],
    ['s_deep: a stored count off by one (①)', d => { const P = d.steps.find(x => x.id === 's_deep').problems[2]; P.dn = P.dn.map(([m, n], i) => [m, i ? n : n + 1]); }, /^① the stored count/],
    ['s_deep: swapped order (⑥)', d => { const s = d.steps.find(x => x.id === 's_deep'); [s.problems[0], s.problems[4]] = [s.problems[4], s.problems[0]]; }, /^⑥/],
    ['s_deep: the old warm-up title (from the back, 追70)', d => { d.steps.find(x => x.id === 's_deep').ramp[0].t.en = 'Fill the house from the back'; }, /追70/],
    ['s_deep: the warm-up arrow a slower move (追14)', d => { const R = d.steps.find(x => x.id === 's_deep').ramp[0], p = E.Pos.from(R.s), N = deepDist(p); R.seq = [E.name(p, real(p).find(m => factOf('s_deep', p, m).n > N))]; }, /追14 the warm-up arrow/],
    ['s_count: a drawing move as the answer (①②)', d => { const P = d.steps.find(x => x.id === 's_count').problems[1], p = E.Pos.from(P.s); const w = real(p).find(m => !P.ok.includes(m)); P.ok = [w]; P.best = w; }, /^①②/],
    ['s_count: a stored count off by one (①)', d => { const P = d.steps.find(x => x.id === 's_count').problems[2]; P.cn = P.cn.map((x, i) => i ? x : [x[0], x[1], x[2] + 1]); }, /^① the stored counts/],
    ['s_count: swapped order (⑥)', d => { const s = d.steps.find(x => x.id === 's_count'); [s.problems[0], s.problems[4]] = [s.problems[4], s.problems[0]]; }, /^⑥/],
    ['s_count: the count wins, the exact game does not (① exact)', d => { const s = d.steps.find(x => x.id === 's_count'), sp = { b: '.....w.w.....www.....w.w...wb..w.b......bbb.....b.......bb.b....', side: 1, n: 100 }, p = E.Pos.from(sp), F = real(p).map(m => [m, factOf('s_count', p, m)]), ok = F.filter(x => x[1].r === 'win').map(x => x[0]); s.problems[3] = { s: sp, ok, best: ok[0], b0: F[0][1].bs0, cn: F.map(([m, f]) => [m, f.ws, f.bs]) }; }, /^① the exact solver/],
    ['s_count warm-up: an arrow that does not win (追14)', d => { const R = d.steps.find(x => x.id === 's_count').ramp[0], p = E.Pos.from(R.s); R.seq = [E.name(p, real(p).find(m => !classify('s_count', p).ok.includes(m)))]; }, /追14 the warm-up arrow/],
    ['s_count warm-up: the mark one square off (0-based, 追14)', d => { const R = d.steps.find(x => x.id === 's_count').ramp[0]; R.marks = R.marks.map(([q, c]) => [q - 1, c]); }, /追14 the warm-up marks \(ng\)/],
    ['s_ladder: Black to move (追5)', d => { const P = d.steps.find(x => x.id === 's_ladder').problems[1]; P.s = Object.assign({}, P.s, { side: 2 }); }, /not White to move/],
  ];
  let bad = 0;
  for (const [name, f, re] of cases) { const d = JSON.parse(JSON.stringify(base)); f(d); const r = verify({ data: d, fast: !/exact/.test(name) }); const hit = r.out.some(o => re.test(o.msg)); console.log((hit ? 'detected  ' : 'MISSED    ') + name); if (!hit) bad++; }
  // the words: a fact that lies
  const UL = require(path.join(ROOT, 'atlas/ls-ugolki.js')), lie = Object.assign({}, UL, { fact: (E2, id, s, m, P) => { const f = UL.fact(E2, id, s, m, P); return f && Object.assign({}, f, { g: f.g + 1 }); } });
  { const r = verify({ ul: lie, fast: true }); const hit = r.out.some(o => /^⑧ the facts/.test(o.msg)); console.log((hit ? 'detected  ' : 'MISSED    ') + 'the 3D facts lie (⑧)'); if (!hit) bad++; }
  const mute = Object.assign({}, UL, { say: (...a) => { const r = UL.say(...a); return { html: r.html.replace(/\d+/g, '') }; } });
  { const r = verify({ ul: mute, fast: true }); const hit = r.out.some(o => /miss/.test(o.msg)); console.log((hit ? 'detected  ' : 'MISSED    ') + 'the words without the numbers (⑧)'); if (!hit) bad++; }
  return bad;
}
module.exports = { verify, selftest, classify, factOf, near, RULES, SYM, symB, deepDist, blackDist, springs };
if (require.main === module) {
  if (process.argv.includes('--selftest')) process.exit(selftest() ? 1 : 0);
  const r = verify();
  if (process.argv.includes('--rows')) r.rows.forEach(x => console.log(JSON.stringify(x)));
  const probs = r.rows.length, badQ = new Set(r.out.filter(o => o.q > 0).map(o => o.id + '#' + o.q));
  r.out.slice(0, 60).forEach(o => console.log(`NG ${o.id}${o.q > 0 ? '#' + o.q : ''} ${o.msg}`));
  console.log(`${r.out.length ? 'NG' : 'OK'} ugolki lessons (3D: ${r.ready.join(', ')}): ${probs - badQ.size}/${probs} problems pass, ${r.out.length} findings`);
  process.exit(r.out.length ? 1 : 0);
}
