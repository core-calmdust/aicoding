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
  return o;
}
// the black pieces a jump chain hops over
function overOpp(p, m) { if (!E.isJump(p, m)) return 0; const P = E.path(p, m); let n = 0; for (let i = 1; i < P.length; i++) if (p.sq[(P[i - 1] + P[i]) / 2] === 2) n++; return n; }
// s_road: White moves again (Black stands still): the farthest next move { g, h, m }
function nextBest(q) { const r = q.clone(); r.side = 0; let b = { g: -99, h: 0, m: -1 }; for (const m of real(r)) { const g = gainOf(r, m); if (g > b.g || (g === b.g && hops(r, m) > b.h)) b = { g, h: hops(r, m), m }; } b.pos = r; return b; }
// the numbers the words must say for a move (right: the answer's own; wrong: what the red move does and the green one's gain)
function expectNums(id, p, P, m) {
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
      if (keys.has(P.best)) add(id, j, '④追27 the same answer twice in the lesson'); keys.add(P.best);
      for (const A of pool) { if (A.id === id && A.j === j) continue; if (near(A.b, P.s.b)) add(id, j, `⑤ within 4 squares of ${A.tag}`); }
      C.push(c);
      // ⑦⑧ the words for every legal move (ja) and the hint
      const V = UL.voice(j * 7 + 3);
      if (real(p).includes(P.best)) for (const m of real(p)) {
        const want = factOf(id, p, m), got = UL.fact(E, id, P.s, m), right = ok.includes(m);
        if (!got || got.k !== want.k || ['g', 'h', 'home', 'holes', 'opp', 'nx', 'nh'].some(x => got[x] !== want[x])) { add(id, j, `⑧ the facts of ${E.name(p, m)}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); continue; }
        const html = UL.say(E, id, P, m, 'ja', V, false, x => x).html;
        if (!html || /\{[a-z]+\}|undefined|NaN/.test(html)) { add(id, j, `⑧ the words for ${E.name(p, m)}: ${html}`); continue; }
        if (right !== /^(<[^>]*>)?\S*(正解|お見事|ばっちり|そのとおり|さすが|いいね|すごい|やったね)/.test(html.replace(/^\s+/, ''))) add(id, j, `⑦ ${E.name(p, m)} ${right ? 'right' : 'wrong'} but the words ${right ? 'do not praise' : 'praise'}: ${html.slice(0, 40)}`);
        const nums = expectNums(id, p, P, m); if (!right && /途中/.test(html) && !(E.mFrom(m) === E.mFrom(P.best) && E.path(p, P.best).slice(1, -1).includes(E.mTo(m)))) add(id, j, `⑧ ${E.name(p, m)}: the words say it stopped on the way`); if (/陣地の外/.test(html) && want.inT) add(id, j, `⑧ ${E.name(p, m)} lands in the corner, the words say outside`); for (const [k, v] of Object.entries(nums)) if (!html.includes(String(v))) add(id, j, `⑧ the words for ${E.name(p, m)} miss ${k}=${v}: ${html}`);
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
          if (id === 's_road') { if (/ジャンプ/.test(html.split('緑')[0]) !== !!want.h) add(id, j, `⑧ ${E.name(p, m)}: a jump ${!!want.h}, the words disagree`); if (/前へ進める手がない|近づけない/.test(html) !== (want.nx <= 0)) add(id, j, `⑧ ${E.name(p, m)}: next gain ${want.nx}, the words disagree`); }
        } else {
          if (id === 's_ladder' && !/黒/.test(html)) add(id, j, '⑧ the praise does not say Black was used');
          if (id === 's_road' && /下が/.test(html) !== (want.g < 0)) add(id, j, `⑧ the praise on stepping back disagrees (gain ${want.g})`);
        }
      }
      const hp = real(p).includes(P.best) ? UL.hintPts(E, id, P) : [];
      if (!hp.length) add(id, j, '追52 the hint marks nothing');
      if (id === 'b_enter' || id === 'b_finish') { const T = E.target(1); if (hp.some(x => !T[x] || p.sq[x] !== 0)) add(id, j, '追52 the hint should mark the empty squares of the corner'); }
      if (id === 'b_finish' && hp.length !== 1) add(id, j, '⑧ the hint should mark the one hole');
      if (id === 's_far') { const D = DIST[1], fw = real(p).filter(x => hops(p, x) && gainOf(p, x) >= 2).map(E.mFrom); if (hp.length < 2 || !hp.every(x => p.sq[x] === 1 && fw.includes(x)) || !fw.every(x => hp.includes(x))) add(id, j, '追52 the hint should mark every piece with a forward jump (2 or more)'); }
      if (id === 's_ladder') { if (hp.length < 2 || !hp.every(x => p.sq[x] === 2)) add(id, j, '追52 the hint should mark the black springboards (2 or more)'); const Q = E.path(p, P.best); if (!Q.some((x, i) => i && hp.includes((Q[i - 1] + x) / 2))) add(id, j, '⑧ the answer hops over none of the marked black pieces'); }
      if (id === 's_road') { if (!hp.length || hp.some(x => P.ok.some(m => E.mFrom(m) === x)) || hp.some(x => p.sq[x] !== 1)) add(id, j, '追52 the hint should mark the jumper (not the stepped piece)'); }
      rows.push({ id, q: j + 1, legal: c.legal, ok: c.ok.length, d: c.d, best: real(p).includes(P.best) ? E.name(p, P.best) : "—" });
    });
    // ⑥ easy → hard
    for (let j = 1; j < C.length; j++) if (C[j].d < C[j - 1].d) add(id, j, `⑥ d ${C[j].d} after ${C[j - 1].d}`);
    if (id === 'b_jump' && !(C.slice(0, 2).every(c => c.hops === 1) && C.slice(2).every(c => c.hops >= 3))) add(id, -1, '④ the lesson promises single hops first, then chains');
    if (id === 'b_enter' && !(C.some(c => c.jump) && C.some(c => !c.jump))) add(id, -1, '④追27 the answers should be steps and jumps');
    if (id === 'b_finish') { if (!(C.some(c => c.jump) && C.some(c => !c.jump))) add(id, -1, '④追27 the answers should be steps and jumps'); if (new Set(C.map(c => c.hole)).size < 3) add(id, -1, '④追27 fewer than 3 holes'); }
    // ⑨ the 2D words
    for (const l of LANGS) for (const k of ['title', 'intro', 'goal', 'hint', 'why', 'ng']) if (!(I18N[l] && I18N[l]['ls.' + id + '.' + k])) add(id, -1, `⑨ ls.${id}.${k} missing in ${l}`);
    // the 3D intro / asks / hints in モリフク's words
    for (const k of ['intro']) if (!(UL.JA[k] && UL.JA[k][id])) add(id, -1, `⑧ no 3D ${k}`);
    if (!(UL.JA.ask[id] && UL.JA.ask[id].length >= 4) || !(UL.JA.hint[id] && UL.JA.hint[id].length >= 3)) add(id, -1, '追46 fewer than 4 asks / 3 hints');
  }
  // the 3D lists only the checked steps; 2D app: a move in ok scores 20
  const app = fs.readFileSync(path.join(ROOT, 'ugolki/app.js'), 'utf8');
  if (!/if \(P\.ok\) return okAnswer\(P, s, m, pts\)/.test(app)) add('2D', -1, '⑨ ugolki/app.js does not answer ok problems with okAnswer');
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
    ['s_road: a shorter road as the answer (①② 追69)', d => { const P = d.steps.find(x => x.id === 's_road').problems[2], p = E.Pos.from(P.s); const w = real(p).find(m => !P.ok.includes(m) && !hops(p, m)); P.ok = [w]; P.best = w; }, /^①②/],
    ['s_far: the answer hops over Black (④ 追36)', d => { const s = d.steps.find(x => x.id === 's_far'); s.problems[3] = JSON.parse(JSON.stringify(ORIG.steps.find(x => x.id === 's_far').problems[3])); }, /④ s_far: the answer hops over Black/],
    ['s_ladder: Black to move (追5)', d => { const P = d.steps.find(x => x.id === 's_ladder').problems[1]; P.s = Object.assign({}, P.s, { side: 2 }); }, /not White to move/],
  ];
  let bad = 0;
  for (const [name, f, re] of cases) { const d = JSON.parse(JSON.stringify(base)); f(d); const r = verify({ data: d }); const hit = r.out.some(o => re.test(o.msg)); console.log((hit ? 'detected  ' : 'MISSED    ') + name); if (!hit) bad++; }
  // the words: a fact that lies
  const UL = require(path.join(ROOT, 'atlas/ls-ugolki.js')), lie = Object.assign({}, UL, { fact: (E2, id, s, m) => { const f = UL.fact(E2, id, s, m); return f && Object.assign({}, f, { g: f.g + 1 }); } });
  { const r = verify({ ul: lie }); const hit = r.out.some(o => /^⑧ the facts/.test(o.msg)); console.log((hit ? 'detected  ' : 'MISSED    ') + 'the 3D facts lie (⑧)'); if (!hit) bad++; }
  const mute = Object.assign({}, UL, { say: (...a) => { const r = UL.say(...a); return { html: r.html.replace(/\d+/g, '') }; } });
  { const r = verify({ ul: mute }); const hit = r.out.some(o => /miss/.test(o.msg)); console.log((hit ? 'detected  ' : 'MISSED    ') + 'the words without the numbers (⑧)'); if (!hit) bad++; }
  return bad;
}
module.exports = { verify, selftest, classify, factOf, near, RULES, SYM, symB };
if (require.main === module) {
  if (process.argv.includes('--selftest')) process.exit(selftest() ? 1 : 0);
  const r = verify();
  if (process.argv.includes('--rows')) r.rows.forEach(x => console.log(JSON.stringify(x)));
  const probs = r.rows.length, badQ = new Set(r.out.filter(o => o.q > 0).map(o => o.id + '#' + o.q));
  r.out.slice(0, 60).forEach(o => console.log(`NG ${o.id}${o.q > 0 ? '#' + o.q : ''} ${o.msg}`));
  console.log(`${r.out.length ? 'NG' : 'OK'} ugolki lessons (3D: ${r.ready.join(', ')}): ${probs - badQ.size}/${probs} problems pass, ${r.out.length} findings`);
  process.exit(r.out.length ? 1 : 0);
}
