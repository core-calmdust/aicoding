#!/usr/bin/env node
// (2026-11-27 担当E) Fanorona lessons on the 3D table (atlas/ls-fanorona.js READY; the same fanorona/lessons.json as the 2D):
// every problem of the READY lessons against claude/lesson-quality.md ①〜⑨ and the 追N that bear on it.
// The basics b_approach · b_withdraw · b_choose (accepted-move lists, 20 / 0 points = fanorona/app.js problemPoints, 3D points):
//  ① ok = [the move that takes the most] (the rules: every legal move's pieces taken, recounted here from the steps), best = ok[0];
//    the engine (engine.wasm, fixed depths 7 and 9 — 追4, no clock: 追84) puts the answer first at both.
//  ② no other move takes as many; the engine's second move 60 or more below at both depths (a move that throws a piece away is no
//    "most" lesson: the greedy move is also the good one).
//  ③ 4〜8 legal moves from 3 pieces or more (追52: the hint rings them all), 3 wrong moves or more, 追72 the answer ≤ a third.
//  ④ every move a single capture step (no chain to go on: the lesson is one line); b_approach every move an approach,
//    b_withdraw every move a withdrawal, b_choose the answer's step captures both ways and the answer is the bigger line (the other
//    line of the same step is a wrong move); 2 or more taken; 2 opponent pieces or more left after it.
//  ⑤ no two positions the same or one point apart (4 when crowded: 10 pieces or more on both) under the board's symmetries (the
//    mirrors, the half turn, each with the colours swapped) — against the puzzles, every lesson problem and ramp.
//  ⑥ d = wrong moves + 2 × near misses (moves taking one fewer than the answer): strictly rising through the five.
//  ⑦⑧ the words for every legal move (3D ja チェッカニ, the other languages' 2D words, and the 2D's keys) come from
//    fanorona/ls-facts.js; the facts are recounted here (pieces taken, what ends the line: the board's edge / your own piece / an
//    empty point; the same step's other line) and every number said is the board's; no {…} left; 追66・追68 no closeness word on a
//    0-point move; 追20 no praise after a wrong move.
//  ⑨ the 2D (fanorona/app.js) words a wrong move through FanoronaLsFacts for these lessons, the hint rings every piece that can
//    capture (not the answer's piece alone), the 14 languages have the keys.
//  追75 / 追14 the ramps (fanorona/lessons.json step.ramp, 2D): a try's right move names are legal moves of its board, its look
//    points on the board; an explain's arrows are legal in turn; the b_choose explain's counts are the board's.
// b_chain (keep capturing): chainProblem / chainWords below (the total of a chain, a move that stops while its piece could go on,
//    a road that ends; the 2D keys why / ng / ngStop).
// b_safe (a safe move, 2026-11-27 担当E): safeProblem / safeWords below (no capture for either side; the one paika move after which the
//    opponent has no capture; every other move gives one — the piece moved is taken, or other pieces through the point it left;
//    the 2D keys why / ng / ngSelf).
// b_win (finish the game, 2026-11-27 担当E): winProblem / winWords below (the one move that takes every piece the opponent has left;
//    no other move wins anyway — the engine's second below a won value and 60 below; the pieces a wrong move leaves; the 2D keys
//    why / ng / ngStop).
// t_big (big captures, 2026-11-27 担当E): bigProblem / bigWords below (the biggest total, where a move whose first capture takes more
//    than the answer's first takes less in all — the greedy trap; the 2D keys why / ng / ngStop / ngGreedy).
// t_count (count the recapture, 2026-11-27 担当E): countProblem / countWords below (the one capture whose taken − taken back — the
//    opponent's biggest reply, recounted here — is the biggest, where a move taking more is taken back more; the 2D keys
//    why / why0 / ng / ngGreedy / ngSmall).
// t_stop (stop partway, 2026-11-27 担当E): stopProblem / stopWords below (t_count's taken − taken back, where the answer is a stop and
//    going on along its road takes more and is taken back more; the 2D keys why / why0 / ng / ngOn / ngSmall).
// t_paika (choosing a paika, 2026-11-27 担当E): paikaProblem / paikaWords below (no capture for either side; the one paika move that
//    gives the opponent nothing and, whatever the reply, leaves you a capture; a wrong move gives a capture / sets up nothing / sets up
//    one a reply stops; the 2D keys why / ng / ngNone / ngBlock).
// e_trap (shut every way out, 2026-11-28 担当C): trapProblem / trapWords below (an endgame, the opponent with 1 or 2 pieces, no capture
//    for either side; the one paika move that gives nothing and, after each of the opponent's replies, leaves you a move taking all it
//    has left — the engine's won value, no other move winning anyway; a wrong move gives a capture / leaves {r} replies that escape;
//    the 2D keys why / ng / ngRun).
// Usage: node tools/lesson-verify-fanorona-ls.js [--selftest]   (also: node tools/lesson-verify.js fanorona)
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.resolve(__dirname, '..');
const E = require(path.join(ROOT, 'fanorona/engine.js'));
const F = require(path.join(ROOT, 'fanorona/ls-facts.js'));
const LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
const BASICS = ['b_approach', 'b_withdraw', 'b_choose'];
let X = null;
function engine() {
  if (X) return E;
  X = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(path.join(ROOT, 'fanorona/engine.wasm'))), { env: { now: () => Date.now(), progress: () => {} } }).exports;
  const b = zlib.gunzipSync(fs.readFileSync(path.join(ROOT, 'fanorona/egdb.bin.gz'))); E.loadEG(X, b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  const nb = zlib.gunzipSync(fs.readFileSync(path.join(ROOT, 'fanorona/evalnet.bin.gz'))); E.loadNet(X, nb.buffer.slice(nb.byteOffset, nb.byteOffset + nb.byteLength));
  E.attachWasm(X); E.setRule('sivy');
  return E;
}
// the engine's values of every move at a fixed depth (engine.c values(): no clock, the same every run)
function values(spec, d) {
  engine(); X.set_rule(9, 5); if (X.set_alq) X.set_alq(0); X.new_game();   // (an empty table every time: the same values whatever came before, 追84)
  const a = E.setupIO(spec, []); new Int32Array(X.memory.buffer, X.io_ptr(), 8192).set(a); X.setup(); X.values(d, 0);
  const r = new Int32Array(X.memory.buffer, X.io_ptr(), 8192), L = [];
  for (let i = 0; i < r[0]; i++) L.push({ m: E.fromWire(r[2 + 3 * i], r[3 + 3 * i]), v: r[4 + 3 * i] });
  return L.sort((x, y) => y.v - x.v);
}
// the board's symmetries on i = r * 9 + c (9 × 5)
const GEO = [(r, c) => [r, c], (r, c) => [r, 8 - c], (r, c) => [4 - r, c], (r, c) => [4 - r, 8 - c]];
const symB = (b, f, sw) => { const o = Array(45).fill('.'); for (let i = 0; i < 45; i++) { const ch = b[i]; const [r, c] = f((i / 9) | 0, i % 9); o[r * 9 + c] = ch === '.' ? '.' : sw ? (ch === 'w' ? 'b' : 'w') : ch; } return o.join(''); };
const SYMS = []; GEO.forEach(f => [false, true].forEach(sw => SYMS.push([f, sw])));
const diff = (a, b) => { let n = 0; for (let i = 0; i < 45; i++) if (a[i] !== b[i]) n++; return n; };
const pcs = b => b.replace(/\./g, '').length;
function near(A, B) {   // ⑤ A, B: { b, side }
  const lim = pcs(A.b) >= 10 && pcs(B.b) >= 10 ? 4 : 1;
  return SYMS.some(([f, sw]) => { const x = symB(B.b, f, sw), s = sw ? 3 - B.side : B.side, d = diff(A.b, x); return d <= lim && (d > 0 || s === A.side); });
}
// the pool for ⑤: the puzzles, every lesson problem and ramp (tag, b, side)
function pool(LS, PZ) {
  const out = [];
  PZ.themes.forEach(T => T.puzzles.forEach((P, j) => out.push({ tag: 'puzzle ' + T.id + '#' + (j + 1), b: P.s.b, side: P.s.side })));
  LS.steps.forEach(st => { (st.problems || []).forEach((P, j) => out.push({ tag: st.id + '#' + (j + 1), b: P.s.b, side: P.s.side })); (st.ramp || []).forEach((P, j) => out.push({ tag: st.id + ' ramp' + (j + 1), b: P.s.b, side: P.s.side })); });
  return out;
}
// the line a single step takes, recounted here (not ls-facts): the opponent's pieces in a row from the point ahead (approach) / behind
// (withdrawal), and what ends it
function lineOf(pos, s) {
  const me = pos.turn, opp = 3 - me, dd = s.kind === 'A' ? s.d : s.d ^ 4;
  let q = s.kind === 'A' ? E.NB[s.d][s.to] : E.NB[dd][s.from]; const got = [];
  while (q >= 0 && pos.at(q) === opp) { got.push(q); q = E.NB[dd][q]; }
  return { n: got.length, end: q < 0 ? 'edge' : pos.at(q) === me ? 'mine' : 'empty' };
}
// one basics problem: { ok, msgs, best, d }
function basicProblem(id, P, opt) {
  opt = opt || {}; engine();
  const msgs = [], pos = E.Pos.from(P.s), L = pos.moves(true), bad = m => msgs.push(m);
  if (pos.status() !== 0 || !L.length) return { ok: false, msgs: ['① no move'] };
  const S = L.map(m => pos.steps(m));
  if (S.some(x => !x || x.length !== 1 || !x[0].cap.length)) bad('④ a move that is no single capture step (a chain or a paika)');
  if (msgs.length) return { ok: false, msgs };
  const cnt = S.map(x => lineOf(pos, x[0]).n);
  S.forEach((x, i) => { if (cnt[i] !== x[0].cap.length) bad('⑧ the line recount ' + L[i]); });
  const mx = Math.max(...cnt), top = L.filter((m, i) => cnt[i] === mx);
  if (top.length !== 1) bad('② ' + top.length + ' moves take ' + mx);
  const best = top[0];
  if (mx < 2) bad('④ the most is ' + mx);
  if (L.length < 4 || L.length > 8) bad('③ ' + L.length + ' legal moves');
  if (new Set(S.map(x => x[0].from)).size < 3) bad('③ 追52 moves from fewer than 3 pieces');
  if (3 * 1 > L.length) bad('追72');
  const kinds = S.map(x => x[0].kind);
  if (id === 'b_approach' && kinds.some(k => k !== 'A')) bad('④ a move that is no approach');
  if (id === 'b_withdraw' && kinds.some(k => k !== 'W')) bad('④ a move that is no withdrawal');
  if (id === 'b_choose') {
    const B = pos.steps(best)[0], twin = L.filter((m, i) => m !== best && S[i][0].from === B.from && S[i][0].to === B.to);
    if (twin.length !== 1) bad('④ the answer\'s step does not capture both ways');
  }
  const after = pos.clone().play(best);
  if (after.count(after.turn) < 2) bad('④ fewer than 2 opponent pieces left');
  if (P.ok && (P.ok.length !== 1 || P.ok[0] !== best)) bad('① ok ' + JSON.stringify(P.ok) + ' ≠ ' + best);
  if (P.best !== undefined && P.best !== best) bad('① best ' + P.best + ' ≠ ' + best);
  if (F.best(E, P.s) !== best) bad('⑧ ls-facts best');
  if (opt.pool) for (const A of opt.pool) if (A.b !== P.s.b && near(P.s, A)) { bad('⑤ near ' + A.tag); break; }
  if (msgs.length) return { ok: false, msgs, best };
  if (!opt.skipEngine) for (const d of [7, 9]) {
    const V = values(P.s, d);
    if (!V.length || V[0].m !== best && !E.same(pos, V[0].m, best)) { bad(`① the engine (depth ${d}) puts ${V[0] && V[0].m} first`); break; }
    if (V.length > 1 && V[0].v - V[1].v < 60) { bad(`② the engine (depth ${d}) second ${V[1].m} only ${V[0].v - V[1].v} below`); break; }
  }
  const dd = (L.length - 1) + 2 * cnt.filter(c => c === mx - 1).length;
  return { ok: !msgs.length, msgs, best, d: dd, n: L.length, cnt };
}
// b_chain (keep capturing, 2026-11-27 担当E): one problem — { ok, msgs, best, d }
//  ① ok = [the move that takes the most in total] (every legal move's pieces recounted from its steps), the engine first at 7 and 9;
//  ② no other move takes as many; the engine's second 60 or more below; ③ 5〜16 legal moves from 3 capturing pieces or more (追52),
//  追72; ④ the answer a chain of 3 captures or more taking 4 or more, and its piece has another road that ends (a branch, not a part
//  of the answer: the lesson is "go on, and pick the road"); 2 opponent pieces or more left; ⑤ as basicProblem;
//  ⑥ d = wrong moves + 2 × near misses (one fewer).
function chainProblem(P, opt) {
  opt = opt || {}; engine();
  const msgs = [], pos = E.Pos.from(P.s), L = pos.moves(true), bad = m => msgs.push(m);
  if (pos.status() !== 0 || !L.length || !pos.hasCaps()) return { ok: false, msgs: ['① no capture'] };
  const S = L.map(m => pos.steps(m)), cnt = S.map(x => x.reduce((a, y) => a + y.cap.length, 0));
  const mx = Math.max(...cnt), top = L.filter((m, i) => cnt[i] === mx), best = top[0];
  if (top.length !== 1) bad('② ' + top.length + ' moves take ' + mx);
  const B = pos.steps(best);
  if (B.length < 3) bad('④ the answer is ' + B.length + ' captures');
  if (mx < 4) bad('④ the most is ' + mx);
  if (L.length < 5 || L.length > 16) bad('③ ' + L.length + ' legal moves');
  if (new Set(S.map(x => x[0].from)).size < 3) bad('③ 追52 captures from fewer than 3 pieces');
  const ends = m => !L.some(x => x.startsWith(m + '-'));
  if (!L.some((m, i) => m !== best && !best.startsWith(m + '-') && S[i][0].from === B[0].from && S[i].length >= 2 && ends(m))) bad('④ no other road for the answer\'s piece');
  const after = pos.clone().play(best);
  if (after.count(after.turn) < 2) bad('④ fewer than 2 opponent pieces left');
  if (P.ok && (P.ok.length !== 1 || P.ok[0] !== best)) bad('① ok ' + JSON.stringify(P.ok) + ' ≠ ' + best);
  if (P.best !== undefined && P.best !== best) bad('① best ' + P.best + ' ≠ ' + best);
  if (F.best(E, P.s) !== best) bad('⑧ ls-facts best');
  if (opt.pool) for (const A of opt.pool) if (A.b !== P.s.b && near(P.s, A)) { bad('⑤ near ' + A.tag); break; }
  if (msgs.length) return { ok: false, msgs, best };
  if (!opt.skipEngine) for (const d of [7, 9]) {
    const V = values(P.s, d);
    if (!V.length || V[0].m !== best && !E.same(pos, V[0].m, best)) { bad(`① the engine (depth ${d}) puts ${V[0] && V[0].m} first`); break; }
    if (V.length > 1 && V[0].v - V[1].v < 60) { bad(`② the engine (depth ${d}) second ${V[1].m} only ${V[0].v - V[1].v} below`); break; }
  }
  const dd = (L.length - 1) + 2 * cnt.filter(c => c === mx - 1).length;
  return { ok: !msgs.length, msgs, best, d: dd, n: L.length, cnt };
}
// b_safe (a safe move, 2026-11-27 担当E): one problem — { ok, msgs, best, d }
//  ① ok = [the one paika move after which the opponent can capture nothing] (every legal move's reply recounted here: the opponent's
//    full turns after it), the engine first at 7 and 9; ② no other safe move; the engine's second 60 or more below;
//  ③ 5〜14 legal moves from 3 pieces or more (追52: the hint rings every piece you can move), 追72; ④ neither side can capture now
//    (the lesson is the paika move, and no threat is already on the board), every wrong move gives the opponent a capture that takes
//    the piece moved or goes through the point it left (what the words say), both kinds in the lesson; 3 pieces or more each side;
//  ⑤ as basicProblem; ⑥ d = wrong moves + 2 × near misses (a wrong move that gives only 1).
const oppCaps = (pos, m) => { const q = pos.clone().play(m); if (!q.hasCaps()) return { c: 0, L: [] };
  const L = q.moves(true).map(x => ({ x, S: q.steps(x) })).map(o => Object.assign(o, { n: o.S.reduce((a, y) => a + y.cap.length, 0) })); const c = Math.max(...L.map(o => o.n)); return { c, L: L.filter(o => o.n === c) }; };
function safeProblem(P, opt) {
  opt = opt || {}; engine();
  const msgs = [], pos = E.Pos.from(P.s), L = pos.moves(true), bad = m => msgs.push(m);
  if (pos.status() !== 0 || !L.length) return { ok: false, msgs: ['① no move'] };
  if (pos.hasCaps()) return { ok: false, msgs: ['④ a capture on the board (the lesson is a paika move)'] };
  if (E.Pos.from({ b: P.s.b, side: 3 - P.s.side }).hasCaps()) bad('④ the opponent can already capture (a threat on the board)');
  if (pos.count(1) < 3 || pos.count(2) < 3) bad('④ fewer than 3 pieces a side');
  const R = L.map(m => oppCaps(pos, m)), safe = L.filter((m, i) => R[i].c === 0), best = safe[0];
  if (safe.length !== 1) bad('② ' + safe.length + ' safe moves');
  if (L.length < 5 || L.length > 14) bad('③ ' + L.length + ' legal moves');
  if (new Set(L.map(m => E.mFrom ? E.mFrom(m) : m.split('-')[0])).size < 3) bad('③ 追52 moves from fewer than 3 pieces');
  if (3 > L.length) bad('追72');
  const kinds = L.map((m, i) => { if (!R[i].c) return 'safe'; const S = pos.steps(m)[0]; return R[i].L.some(o => o.S.some(y => y.cap.includes(S.to))) ? 'self' : R[i].L.some(o => o.S.some(y => y.to === S.from)) ? 'open' : 'other'; });
  L.forEach((m, i) => { if (kinds[i] === 'other') bad('④ ' + m + ': the capture it gives is neither the piece moved nor through the point it left'); });
  if (P.ok && (P.ok.length !== 1 || P.ok[0] !== best)) bad('① ok ' + JSON.stringify(P.ok) + ' ≠ ' + best);
  if (P.best !== undefined && P.best !== best) bad('① best ' + P.best + ' ≠ ' + best);
  if (F.safeBest(E, P.s) !== (safe.length === 1 ? best : null)) bad('⑧ ls-facts safe move');
  if (opt.pool) for (const A of opt.pool) if (A.b !== P.s.b && near(P.s, A)) { bad('⑤ near ' + A.tag); break; }
  if (msgs.length) return { ok: false, msgs, best, kinds };
  if (!opt.skipEngine) for (const d of [7, 9, 9]) {   // (depth 9 twice: in a lost position the engine's values change from run to run)
    const V = values(P.s, d);
    if (!V.length || V[0].m !== best && !E.same(pos, V[0].m, best)) { bad(`① the engine (depth ${d}) puts ${V[0] && V[0].m} first`); break; }
    if (V.length > 1 && V[0].v - V[1].v < 60) { bad(`② the engine (depth ${d}) second ${V[1].m} only ${V[0].v - V[1].v} below`); break; }
    if (V[0].v < -E.WINT) { bad(`④ the engine (depth ${d}): lost even after the safe move (${V[0].v})`); break; }   // (a safe move that loses anyway teaches nothing; and the engine's values there are not stable)
  }
  const dd = (L.length - 1) + 2 * R.filter(r => r.c === 1).length;
  return { ok: !msgs.length, msgs, best, d: dd, n: L.length, kinds, cnt: R.map(r => r.c) };
}
// t_paika (the paika move, 2026-11-27 担当E): one problem — { ok, msgs, best, d, kinds }
//  ① ok = [the one paika move after which the opponent can capture nothing and, whatever the opponent's reply, you can capture]
//    (every legal move, every reply of the opponent recounted here), the engine first at 7 and 9 (9 twice); ② no other such move;
//    the engine's second 60 or more below; ③ 5〜16 legal moves from 3 pieces or more (追52: the hint rings every piece you can move),
//    追72; ④ neither side can capture now, 3 pieces or more a side, the game goes on after every safe move, at least one wrong move
//    that is safe but sets up nothing (none) or a capture the opponent can stop (block) — the lesson is more than b_safe — and the
//    lesson has give · none · block; ⑤ as basicProblem; ⑥ d = wrong moves + 2 × block moves.
function paikaLook(pos, m) {
  const r = oppCaps(pos, m); if (r.c) return { k: 'give', c: r.c };
  const q = pos.clone().play(m), me = pos.turn;
  if (q.status() !== 0) return { k: 'end', c: 0 };
  if (!E.Pos.from({ b: q.spec().b, side: me }).hasCaps()) return { k: 'none', c: 0 };
  let a = Infinity;
  for (const y of q.moves(true)) {
    const q2 = q.clone().play(y); if (q2.turn !== me || !q2.hasCaps()) return { k: 'block', c: 0 };
    a = Math.min(a, Math.max(...q2.moves(true).map(x => q2.steps(x).reduce((n, z) => n + z.cap.length, 0))));
  }
  return { k: 'sure', c: 0, a };
}
function paikaProblem(P, opt) {
  opt = opt || {}; engine();
  const msgs = [], pos = E.Pos.from(P.s), L = pos.moves(true), bad = m => msgs.push(m);
  if (pos.status() !== 0 || !L.length) return { ok: false, msgs: ['① no move'] };
  if (pos.hasCaps()) return { ok: false, msgs: ['④ a capture on the board (the lesson is a paika move)'] };
  if (E.Pos.from({ b: P.s.b, side: 3 - P.s.side }).hasCaps()) bad('④ the opponent can already capture (a threat on the board)');
  if (pos.count(1) < 3 || pos.count(2) < 3) bad('④ fewer than 3 pieces a side');
  if (L.length < 5 || L.length > 16) bad('③ ' + L.length + ' legal moves');
  if (new Set(L.map(m => m.split('-')[0])).size < 3) bad('③ 追52 moves from fewer than 3 pieces');
  if (msgs.length) return { ok: false, msgs };
  const R = L.map(m => paikaLook(pos, m)), sure = L.filter((m, i) => R[i].k === 'sure'), best = sure[0];
  if (R.some(r => r.k === 'end')) bad('④ a move ends the game');
  if (sure.length !== 1) bad('② ' + sure.length + ' moves set up a sure capture');
  if (!R.some(r => r.k === 'none' || r.k === 'block')) bad('④ no safe wrong move (the lesson would be b_safe)');
  const kinds = L.map((m, i) => m === best ? 'most' : R[i].k);
  if (P.ok && (P.ok.length !== 1 || P.ok[0] !== best)) bad('① ok ' + JSON.stringify(P.ok) + ' ≠ ' + best);
  if (P.best !== undefined && P.best !== best) bad('① best ' + P.best + ' ≠ ' + best);
  if (F.paikaBest(E, P.s) !== (sure.length === 1 ? best : null)) bad('⑧ ls-facts paikaBest');
  if (opt.pool) for (const A of opt.pool) if (A.b !== P.s.b && near(P.s, A)) { bad('⑤ near ' + A.tag); break; }
  if (msgs.length) return { ok: false, msgs, best, kinds };
  if (!opt.skipEngine) for (const d of [7, 9, 9]) {
    const V = values(P.s, d);
    if (!V.length || V[0].m !== best && !E.same(pos, V[0].m, best)) { bad(`① the engine (depth ${d}) puts ${V[0] && V[0].m} first`); break; }
    if (V.length > 1 && V[0].v - V[1].v < 60) { bad(`② the engine (depth ${d}) second ${V[1].m} only ${V[0].v - V[1].v} below`); break; }
    if (V[0].v < -E.WINT) { bad(`④ the engine (depth ${d}): lost even after the answer (${V[0].v})`); break; }
  }
  const dd = (L.length - 1) + 2 * R.filter(r => r.k === 'block').length;
  return { ok: !msgs.length, msgs, best, d: dd, n: L.length, kinds, a: R[L.indexOf(best)].a };
}
// t_paika: the words for every move against the facts recounted here (the opponent's most, set up nothing / stopped, the answer's {a})
function paikaWords(P, LS3, i18n, bad) {
  const id = 't_paika', pos = E.Pos.from(P.s), L = pos.moves(true), best = P.best, a = paikaLook(pos, best).a;
  for (const m of L) {
    const f = F.fact(E, id, P.s, m), r = paikaLook(pos, m), k = m === best ? 'most' : r.k;
    if (f.k !== k || f.c !== r.c || f.a !== a) bad(`⑧ ${m}: the facts ${JSON.stringify(f)} ≠ ${k} ${r.c} / ${a}`);
    for (const lang of LANGS) for (let j = 0; j < (lang === 'ja' ? 6 : 1); j++) {
      const h = LS3.sayText(id, P, m, lang, j);
      if (!h || /\{\w+\}/.test(h) || /undefined|NaN/.test(h)) { bad(`⑧ ${m} ${lang}: ${h}`); continue; }
      const nums = (h.replace(/<[^>]+>/g, '').match(/\d+/g) || []).map(Number);
      if (lang === 'ja' || lang === 'en') { const ok = new Set([r.c, a]); nums.forEach(x => { if (!ok.has(x)) bad(`⑧ ${m} ${lang}: the number ${x}`); }); }
      if (lang !== 'ja') continue;
      const oppNone = /何も取れ|どの玉も取れ|ひとつも取れ|取れる玉がな/.test(h), any = /どう動いても|どこへ(動|逃げ)ても|何をしても|どの手で(も|応じても)|どう応じられても/.test(h);
      if (m === best) {
        if (!oppNone || !any || !nums.includes(a)) bad(`⑧ ${m} ja: the praise does not say nothing to take, whatever the reply, ${a}`);
        continue;
      }
      if (NEAR.test(h)) bad(`追66 ${m} ja: ${h}`);
      if (PRAISE.test(h)) bad(`追20 ${m} ja: praise after a wrong move`);
      const sayGive = nums.includes(r.c) && /取られ/.test(h), sayNone = /取れる形(が|は)(でき|作れ)てい?ない|取れる形がない|ねらいがない|ねらいが(でき|作れ)/.test(h), sayBlock = /止められ|ふさが|防が/.test(h);
      if (k === 'give' ? !sayGive || sayNone || sayBlock : k === 'none' ? !sayNone || sayBlock || !oppNone : !sayBlock || sayNone || !oppNone) bad(`⑧ ${m} ja: said ${sayGive ? 'give' : sayNone ? 'none' : sayBlock ? 'block' : '(none)'}, the board ${k}`);
    }
    const key = 'ls.' + id + (m === best ? '.why' : k === 'give' ? '.ng' : k === 'none' ? '.ngNone' : '.ngBlock');
    for (const lang of LANGS) { const tx = (i18n[lang] || {})[key]; if (!tx) bad(`⑨ 2D ${key} ${lang} missing`); else if (!/\{m\}/.test(tx) || (m === best && !/\{a\}/.test(tx)) || (m !== best && !/\{x\}/.test(tx)) || (k === 'give' && !/\{c\}/.test(tx))) bad(`⑨ 2D ${key} ${lang}: {m}/{x}/{c}/{a}`); }
  }
}
// e_trap (shut every way out, 2026-11-28 担当C): one problem — { ok, msgs, best, d, kinds, n, no }
//  ① ok = [the one paika move after which the opponent can capture nothing and, after each of its replies, you have a move taking
//    every piece it has left] (every legal move, every reply recounted here: the pieces a move takes against the pieces left), the
//    engine first at 7 and 9 (9 twice) with a won value; ② no other such move, and no other move wins anyway: the engine's second
//    below a won value and 60 or more below ("the only way to win"); ③ 5〜16 legal moves from 3 pieces or more (追52: the hint rings
//    every piece you can move), 追72; ④ neither side can capture now, the opponent has 1 or 2 pieces (the endgame), no move ends the
//    game at once (a blockade), every problem has a safe wrong move that leaves a way out (run) — the lesson is more than b_safe —
//    and the lesson has give · run and both 1 and 2 opponent pieces; ⑤ as basicProblem; ⑥ d = wrong moves + 2 × run moves.
function trapLook(pos, m) {
  const r = oppCaps(pos, m); if (r.c) return { k: 'give', c: r.c, r: 0, n: 0 };
  const q = pos.clone().play(m), me = pos.turn, opp = 3 - me;
  if (q.status() !== 0) return { k: 'end', c: 0, r: 0, n: 0 };
  const Y = q.moves(true); let run = 0;
  for (const y of Y) {
    const q2 = q.clone().play(y), left = q2.count(opp);
    const all = q2.turn === me && q2.moves(true).some(x => q2.steps(x).reduce((n, z) => n + z.cap.length, 0) === left);
    if (!all) run++;
  }
  return { k: run ? 'run' : 'sure', c: 0, r: run, n: Y.length };
}
function trapProblem(P, opt) {
  opt = opt || {}; engine();
  const msgs = [], pos = E.Pos.from(P.s), L = pos.moves(true), bad = m => msgs.push(m), opp = 3 - pos.turn;
  if (pos.status() !== 0 || !L.length) return { ok: false, msgs: ['① no move'] };
  if (pos.hasCaps()) return { ok: false, msgs: ['④ a capture on the board (the lesson is a paika move)'] };
  if (E.Pos.from({ b: P.s.b, side: 3 - P.s.side }).hasCaps()) bad('④ the opponent can already capture (a threat on the board)');
  const no = pos.count(opp); if (no < 1 || no > 2) bad('④ the opponent has ' + no + ' pieces (the endgame: 1 or 2)');
  if (L.length < 5 || L.length > 16) bad('③ ' + L.length + ' legal moves');
  if (new Set(L.map(m => m.split('-')[0])).size < 3) bad('③ 追52 moves from fewer than 3 pieces');
  if (msgs.length) return { ok: false, msgs };
  const R = L.map(m => trapLook(pos, m)), sure = L.filter((m, i) => R[i].k === 'sure'), best = sure[0];
  if (R.some(r => r.k === 'end')) bad('④ a move ends the game at once (a blockade)');
  if (sure.length !== 1) bad('② ' + sure.length + ' moves shut every way out');
  if (!R.some(r => r.k === 'run')) bad('④ no safe wrong move leaving a way out (the lesson would be b_safe)');
  if (3 > L.length - 1) bad('追72');
  const kinds = L.map((m, i) => m === best ? 'most' : R[i].k);
  if (P.ok && (P.ok.length !== 1 || P.ok[0] !== best)) bad('① ok ' + JSON.stringify(P.ok) + ' ≠ ' + best);
  if (P.best !== undefined && P.best !== best) bad('① best ' + P.best + ' ≠ ' + best);
  if (F.trapBest(E, P.s) !== (sure.length === 1 ? best : null)) bad('⑧ ls-facts trapBest');
  if (opt.pool) for (const A of opt.pool) if (A.b !== P.s.b && near(P.s, A)) { bad('⑤ near ' + A.tag); break; }
  if (msgs.length) return { ok: false, msgs, best, kinds };
  if (!opt.skipEngine) for (const d of [7, 9, 9]) {
    const V = values(P.s, d);
    if (!V.length || V[0].m !== best && !E.same(pos, V[0].m, best)) { bad(`① the engine (depth ${d}) puts ${V[0] && V[0].m} first`); break; }
    if (V[0].v < E.WINT) { bad(`① the engine (depth ${d}): the answer not a won value (${V[0].v})`); break; }
    if (V.length > 1 && (V[1].v >= E.WINT || V[0].v - V[1].v < 60)) { bad(`② the engine (depth ${d}) second ${V[1].m} ${V[1].v} (wins anyway or within 60)`); break; }
  }
  const dd = (L.length - 1) + 2 * R.filter(r => r.k === 'run').length;
  return { ok: !msgs.length, msgs, best, d: dd, n: L.length, kinds, no, rn: R[L.indexOf(best)] && R[L.indexOf(best)].n };
}
// e_trap: the words for every move against the facts recounted here (the opponent's most, the ways out {r}, the answer's replies {n})
function trapWords(P, LS3, i18n, bad) {
  const id = 'e_trap', pos = E.Pos.from(P.s), L = pos.moves(true), best = P.best, B = trapLook(pos, best), a = pos.count(3 - pos.turn);
  for (const m of L) {
    const f = F.fact(E, id, P.s, m), r = trapLook(pos, m), k = m === best ? 'most' : r.k;
    if (f.k !== k || f.c !== r.c || f.r !== r.r || f.n !== B.n || f.a !== a) bad(`⑧ ${m}: the facts ${JSON.stringify(f)} ≠ ${k} ${r.c} / ${r.r} / ${B.n} / ${a}`);
    for (const lang of LANGS) for (let j = 0; j < (lang === 'ja' ? 6 : 1); j++) {
      const h = LS3.sayText(id, P, m, lang, j);
      if (!h || /\{\w+\}/.test(h) || /undefined|NaN/.test(h)) { bad(`⑧ ${m} ${lang}: ${h}`); continue; }
      const nums = (h.replace(/<[^>]+>/g, '').match(/\d+/g) || []).map(Number);
      if (lang === 'ja' || lang === 'en') { const ok = m === best ? new Set([B.n, a]) : k === 'give' ? new Set([r.c, B.n, a]) : new Set([r.r, B.n, a]); nums.forEach(x => { if (!ok.has(x)) bad(`⑧ ${m} ${lang}: the number ${x}`); }); }
      if (lang !== 'ja') continue;
      const oppNone = /何も取れ|どの玉も取れ|ひとつも取れ|取れる玉がな/.test(h), all = /全部|すべて|残らず/.test(h), way = /逃げ/.test(h);
      if (m === best) {
        if (!oppNone || !all || !nums.includes(B.n) || !/通り/.test(h)) bad(`⑧ ${m} ja: the praise does not say nothing to take, all ${B.n} replies, all taken`);
        continue;
      }
      if (NEAR.test(h)) bad(`追66 ${m} ja: ${h}`);
      if (PRAISE.test(h)) bad(`追20 ${m} ja: praise after a wrong move`);
      const sayGive = nums.includes(r.c) && /取られ/.test(h), sayRun = nums.includes(r.r) && way && oppNone && new RegExp(r.r + '通り').test(h);
      if (k === 'give' ? !sayGive || /逃げ道が\d|\d+通りは/.test(h) : !sayRun || /取られ/.test(h)) bad(`⑧ ${m} ja: said ${sayGive ? 'give' : sayRun ? 'run' : '(none)'}, the board ${k}`);
    }
    const key = 'ls.' + id + (m === best ? '.why' : k === 'give' ? '.ng' : '.ngRun');
    for (const lang of LANGS) { const tx = (i18n[lang] || {})[key]; if (!tx) bad(`⑨ 2D ${key} ${lang} missing`); else if (!/\{m\}/.test(tx) || (m === best && !/\{n\}/.test(tx)) || (m !== best && !/\{x\}/.test(tx)) || (k === 'give' && !/\{c\}/.test(tx)) || (k === 'run' && !/\{r\}/.test(tx))) bad(`⑨ 2D ${key} ${lang}: {m}/{x}/{c}/{r}/{n}`); }
  }
}
// b_win (finish the game, 2026-11-27 担当E): one problem — { ok, msgs, best, d, kinds }
//  ① ok = [the one move after which the opponent has no piece left] (every legal move played here and the opponent's pieces
//    counted), the engine first at 7 and 9 with a won value; ② no other move takes them all, and no other move wins anyway: the
//    engine's second below a won value (WINT) and 60 or more below (a move that stops early lets the opponent strike back — the
//    lesson is "finish it now"); every wrong move leaves the opponent a legal move (no win by a blockade: the words count the pieces
//    left); ③ 4〜16 legal moves from 3 capturing pieces or more (追52), 追72; ④ 2 opponent pieces or more taken by the answer;
//  ⑤ as basicProblem; ⑥ d = wrong moves + 2 × near misses (moves leaving 1).
function winProblem(P, opt) {
  opt = opt || {}; engine();
  const msgs = [], pos = E.Pos.from(P.s), L = pos.moves(true), bad = m => msgs.push(m), opp = 3 - pos.turn;
  if (pos.status() !== 0 || !L.length || !pos.hasCaps()) return { ok: false, msgs: ['① no capture'] };
  const a = pos.count(opp), Q = L.map(m => pos.clone().play(m)), left = Q.map(q => q.count(opp));
  const wins = L.filter((m, i) => left[i] === 0), best = wins[0];
  if (wins.length !== 1) bad('② ' + wins.length + ' moves take every piece');
  if (a < 2) bad('④ the opponent has ' + a);
  if (L.length < 4 || L.length > 16) bad('③ ' + L.length + ' legal moves');
  const S = L.map(m => pos.steps(m));
  if (new Set(S.map(x => x[0].from)).size < 3) bad('③ 追52 captures from fewer than 3 pieces');
  if (3 > L.length) bad('追72');
  Q.forEach((q, i) => { if (left[i] && q.status() !== 0) bad('② ' + L[i] + ': the opponent cannot move (a win by a blockade)'); });
  const kinds = L.map((m, i) => m === best ? 'most' : best && best.startsWith(m + '-') ? 'stop' : L.some(x => x.startsWith(m + '-')) ? 'stopx' : 'dead');
  if (P.ok && (P.ok.length !== 1 || P.ok[0] !== best)) bad('① ok ' + JSON.stringify(P.ok) + ' ≠ ' + best);
  if (P.best !== undefined && P.best !== best) bad('① best ' + P.best + ' ≠ ' + best);
  if (F.winBest(E, P.s) !== (wins.length === 1 ? best : null)) bad('⑧ ls-facts winning move');
  if (opt.pool) for (const A of opt.pool) if (A.b !== P.s.b && near(P.s, A)) { bad('⑤ near ' + A.tag); break; }
  if (msgs.length) return { ok: false, msgs, best, kinds };
  if (!opt.skipEngine) for (const d of [7, 9]) {
    const V = values(P.s, d);
    if (!V.length || V[0].m !== best && !E.same(pos, V[0].m, best)) { bad(`① the engine (depth ${d}) puts ${V[0] && V[0].m} first`); break; }
    if (V[0].v < E.WINT) { bad(`① the engine (depth ${d}): the answer not a won value (${V[0].v})`); break; }
    if (V.length > 1 && (V[1].v >= E.WINT || V[0].v - V[1].v < 60)) { bad(`② the engine (depth ${d}) second ${V[1].m} ${V[1].v} (wins anyway or within 60)`); break; }
  }
  const dd = (L.length - 1) + 2 * left.filter(x => x === 1).length;
  return { ok: !msgs.length, msgs, best, d: dd, n: L.length, kinds, cnt: left };
}
// t_big (big captures, 2026-11-27 担当E): one problem — { ok, msgs, best, d, kinds }
//  ① ok = [the move that takes the most in total] (every legal move's pieces recounted from its steps), the engine first at 7 and 9;
//  ② no other move takes as many; the engine's second 60 or more below; ③ 7〜20 legal moves from 3 capturing pieces or more (追52),
//  追72; ④ the lesson's point — the biggest first capture is not the answer's: some wrong move takes more with its first capture than
//  the answer's first (greedy) and less in all, the biggest such first capture 3 or more; the answer a chain (2 captures or more) taking 4 or more; 2 or more pieces of the
//  opponent left after it (not b_win's "take them all"); ⑤ as basicProblem; ⑥ d = wrong moves + 2 × near misses (one fewer)
//  + 2 × greedy moves.
function bigProblem(P, opt) {
  opt = opt || {}; engine();
  const msgs = [], pos = E.Pos.from(P.s), L = pos.moves(true), bad = m => msgs.push(m);
  if (pos.status() !== 0 || !L.length || !pos.hasCaps()) return { ok: false, msgs: ['① no capture'] };
  const S = L.map(m => pos.steps(m)), cnt = S.map(x => x.reduce((a, y) => a + y.cap.length, 0));
  const mx = Math.max(...cnt), top = L.filter((m, i) => cnt[i] === mx), best = top[0];
  if (top.length !== 1) bad('② ' + top.length + ' moves take ' + mx);
  const B = pos.steps(best), a1 = B[0].cap.length;
  if (B.length < 2) bad('④ the answer is ' + B.length + ' capture');
  if (mx < 4) bad('④ the most is ' + mx);
  if (L.length < 7 || L.length > 20) bad('③ ' + L.length + ' legal moves');
  if (new Set(S.map(x => x[0].from)).size < 3) bad('③ 追52 captures from fewer than 3 pieces');
  const greedy = L.filter((m, i) => m !== best && S[i][0].cap.length > a1);
  if (!greedy.length) bad('④ no move takes more than the answer with its first capture (no greedy trap)');
  else if (Math.max(...greedy.map(m => pos.steps(m)[0].cap.length)) < 3) bad('④ the greedy trap is small (no first capture of 3 or more)');
  const after = pos.clone().play(best);
  if (after.count(after.turn) < 2) bad('④ fewer than 2 opponent pieces left');
  const ends = m => !L.some(x => x.startsWith(m + '-'));
  const kinds = L.map((m, i) => m === best ? 'most' : S[i][0].cap.length > a1 ? 'greedy' : best.startsWith(m + '-') ? 'stop' : !ends(m) ? 'stopx' : 'dead');
  if (P.ok && (P.ok.length !== 1 || P.ok[0] !== best)) bad('① ok ' + JSON.stringify(P.ok) + ' ≠ ' + best);
  if (P.best !== undefined && P.best !== best) bad('① best ' + P.best + ' ≠ ' + best);
  if (F.best(E, P.s) !== best) bad('⑧ ls-facts best');
  if (opt.pool) for (const A of opt.pool) if (A.b !== P.s.b && near(P.s, A)) { bad('⑤ near ' + A.tag); break; }
  if (msgs.length) return { ok: false, msgs, best, kinds };
  if (!opt.skipEngine) for (const d of [7, 9]) {
    const V = values(P.s, d);
    if (!V.length || V[0].m !== best && !E.same(pos, V[0].m, best)) { bad(`① the engine (depth ${d}) puts ${V[0] && V[0].m} first`); break; }
    if (V.length > 1 && V[0].v - V[1].v < 60) { bad(`② the engine (depth ${d}) second ${V[1].m} only ${V[0].v - V[1].v} below`); break; }
  }
  const dd = (L.length - 1) + 2 * cnt.filter(c => c === mx - 1).length + 2 * greedy.length;
  return { ok: !msgs.length, msgs, best, d: dd, n: L.length, cnt, kinds };
}
// t_count (count the recapture, 2026-11-27 担当E): one problem — { ok, msgs, best, d, kinds, ar }
//  ① ok = [the one capture whose taken − taken back is the biggest] (every legal move's pieces and the opponent's biggest full turn
//    after it recounted here), the engine first at 7 and 9; ② no other move as good by that count; the engine's second 60 or more
//    below; ③ 5〜16 legal moves from 3 capturing pieces or more (追52), 追72; ④ the lesson's point — some wrong move takes more than the
//    answer (greedy) and is taken back more; the answer gains (taken − taken back 1 or more); no move wins or blocks the opponent
//    (the words count a reply); 2 or more of the opponent's pieces left after the answer; ⑤ as basicProblem;
//  ⑥ d = wrong moves + 2 × near misses (one below by the count) + 2 × greedy moves.
function countProblem(P, opt) {
  opt = opt || {}; engine();
  const msgs = [], pos = E.Pos.from(P.s), L = pos.moves(true), bad = m => msgs.push(m), opp = 3 - pos.turn;
  if (pos.status() !== 0 || !L.length || !pos.hasCaps()) return { ok: false, msgs: ['① no capture'] };
  const S = L.map(m => pos.steps(m)), cnt = S.map(x => x.reduce((a, y) => a + y.cap.length, 0));
  if (L.length < 5 || L.length > 16) bad('③ ' + L.length + ' legal moves');
  if (new Set(S.map(x => x[0].from)).size < 3) bad('③ 追52 captures from fewer than 3 pieces');
  if (msgs.length) return { ok: false, msgs };
  const Q = L.map(m => pos.clone().play(m));
  Q.forEach((q, i) => { if (!q.count(opp) || q.status() !== 0) bad('④ ' + L[i] + ': the game ends (no reply to count)'); });
  if (msgs.length) return { ok: false, msgs };
  const back = L.map(m => oppCaps(pos, m).c), net = cnt.map((c, i) => c - back[i]);
  const mx = Math.max(...net), top = L.filter((m, i) => net[i] === mx), best = top[0], bi = L.indexOf(best);
  if (top.length !== 1) bad('② ' + top.length + ' moves gain ' + mx);
  if (mx < 1) bad('④ the best gains ' + mx);
  const a = cnt[bi], greedy = L.filter((m, i) => cnt[i] > a);
  if (!greedy.length) bad('④ no move takes more than the answer (no greedy trap)');
  if (Q[bi].count(opp) < 2) bad('④ fewer than 2 opponent pieces left');
  const kinds = L.map((m, i) => m === best ? 'most' : cnt[i] > a ? 'greedy' : back[i] > 0 ? 'back' : 'small');
  if (P.ok && (P.ok.length !== 1 || P.ok[0] !== best)) bad('① ok ' + JSON.stringify(P.ok) + ' ≠ ' + best);
  if (P.best !== undefined && P.best !== best) bad('① best ' + P.best + ' ≠ ' + best);
  if (F.countBest(E, P.s) !== (top.length === 1 ? best : null)) bad('⑧ ls-facts countBest');
  if (opt.pool) for (const A of opt.pool) if (A.b !== P.s.b && near(P.s, A)) { bad('⑤ near ' + A.tag); break; }
  if (msgs.length) return { ok: false, msgs, best, kinds };
  if (!opt.skipEngine) for (const d of [7, 9]) {
    const V = values(P.s, d);
    if (!V.length || V[0].m !== best && !E.same(pos, V[0].m, best)) { bad(`① the engine (depth ${d}) puts ${V[0] && V[0].m} first`); break; }
    if (V.length > 1 && V[0].v - V[1].v < 60) { bad(`② the engine (depth ${d}) second ${V[1].m} only ${V[0].v - V[1].v} below`); break; }
  }
  const dd = (L.length - 1) + 2 * net.filter(x => x === mx - 1).length + 2 * greedy.length;
  return { ok: !msgs.length, msgs, best, d: dd, n: L.length, cnt, back, kinds, ar: back[bi] };
}
// t_stop (stop partway, 2026-11-27 担当E): one problem — { ok, msgs, best, d, kinds, ar }
//  ① ok = [the one capture whose taken − taken back is the biggest] (recounted here as t_count), the engine first at 7 and 9, and the
//    answer is a stop: a legal move goes on along its road (its piece could still capture where it stops); ② no other move as good by
//    that count, the engine's second 60 or more below; ③ 5〜16 legal moves from 3 capturing pieces or more (追52), 追72; ④ the lesson's
//    point — going on past the answer's stop takes more and is taken back more (every such move: 'on'); the answer gains 1 or more;
//    no move ends the game; 2 or more of the opponent's pieces left after the answer; ⑤ as basicProblem;
//  ⑥ d = wrong moves + 2 × near misses (one below by the count) + 2 × the moves going on.
const eqStep = (x, y) => x.from === y.from && x.to === y.to && x.kind === y.kind;
function stopProblem(P, opt) {
  opt = opt || {}; engine();
  const msgs = [], pos = E.Pos.from(P.s), L = pos.moves(true), bad = m => msgs.push(m), opp = 3 - pos.turn;
  if (pos.status() !== 0 || !L.length || !pos.hasCaps()) return { ok: false, msgs: ['① no capture'] };
  const S = L.map(m => pos.steps(m)), cnt = S.map(x => x.reduce((a, y) => a + y.cap.length, 0));
  if (L.length < 5 || L.length > 16) bad('③ ' + L.length + ' legal moves');
  if (new Set(S.map(x => x[0].from)).size < 3) bad('③ 追52 captures from fewer than 3 pieces');
  if (msgs.length) return { ok: false, msgs };
  const Q = L.map(m => pos.clone().play(m));
  Q.forEach((q, i) => { if (!q.count(opp) || q.status() !== 0) bad('④ ' + L[i] + ': the game ends (no reply to count)'); });
  if (msgs.length) return { ok: false, msgs };
  const back = L.map(m => oppCaps(pos, m).c), net = cnt.map((c, i) => c - back[i]);
  const mx = Math.max(...net), top = L.filter((m, i) => net[i] === mx), best = top[0], bi = L.indexOf(best);
  if (top.length !== 1) bad('② ' + top.length + ' moves gain ' + mx);
  if (mx < 1) bad('④ the best gains ' + mx);
  const B = S[bi], onI = L.map((m, i) => S[i].length > B.length && B.every((x, j) => eqStep(x, S[i][j])));
  if (!onI.some(Boolean)) bad('④ the answer is no stop (no move goes on along its road)');
  if (Q[bi].count(opp) < 2) bad('④ fewer than 2 opponent pieces left');
  const kinds = L.map((m, i) => m === best ? 'most' : onI[i] ? 'on' : back[i] > 0 ? 'back' : 'small');
  if (P.ok && (P.ok.length !== 1 || P.ok[0] !== best)) bad('① ok ' + JSON.stringify(P.ok) + ' ≠ ' + best);
  if (P.best !== undefined && P.best !== best) bad('① best ' + P.best + ' ≠ ' + best);
  if (F.stopBest(E, P.s) !== (top.length === 1 && onI.some(Boolean) ? best : null)) bad('⑧ ls-facts stopBest');
  if (opt.pool) for (const A of opt.pool) if (A.b !== P.s.b && near(P.s, A)) { bad('⑤ near ' + A.tag); break; }
  if (msgs.length) return { ok: false, msgs, best, kinds };
  if (!opt.skipEngine) for (const d of [7, 9]) {
    const V = values(P.s, d);
    if (!V.length || V[0].m !== best && !E.same(pos, V[0].m, best)) { bad(`① the engine (depth ${d}) puts ${V[0] && V[0].m} first`); break; }
    if (V.length > 1 && V[0].v - V[1].v < 60) { bad(`② the engine (depth ${d}) second ${V[1].m} only ${V[0].v - V[1].v} below`); break; }
  }
  const dd = (L.length - 1) + 2 * net.filter(x => x === mx - 1).length + 2 * onI.filter(Boolean).length;
  return { ok: !msgs.length, msgs, best, d: dd, n: L.length, cnt, back, kinds, ar: back[bi] };
}
// t_stop: the words for every move against the facts recounted here (taken, taken back, going on past the stop, the answer's gain)
function stopWords(P, LS3, i18n, bad) {
  const id = 't_stop', pos = E.Pos.from(P.s), L = pos.moves(true), best = P.best, B = pos.steps(best);
  const n = m => pos.steps(m).reduce((x, y) => x + y.cap.length, 0), a = n(best), ar = oppCaps(pos, best).c, an = a - ar;
  for (const m of L) {
    const f = F.fact(E, id, P.s, m), c = n(m), r = oppCaps(pos, m).c, S = pos.steps(m);
    const on = S.length > B.length && B.every((x, j) => eqStep(x, S[j]));
    const k = m === best ? 'most' : on ? 'on' : r > 0 ? 'back' : 'small';
    if (f.k !== k || f.c !== c || f.r !== r || f.a !== a || f.ar !== ar || f.an !== an) bad(`⑧ ${m}: the facts ${JSON.stringify(f)} ≠ ${k} ${c}−${r} / ${a}−${ar}`);
    for (const lang of LANGS) for (let j = 0; j < (lang === 'ja' ? 6 : 1); j++) {
      const h = LS3.sayText(id, P, m, lang, j);
      if (!h || /\{\w+\}/.test(h) || /undefined|NaN/.test(h)) { bad(`⑧ ${m} ${lang}: ${h}`); continue; }
      const nums = (h.replace(/<[^>]+>/g, '').match(/\d+/g) || []).map(Number);
      if (lang === 'ja' || lang === 'en') { const ok = new Set([c, r, a, ar, an]); nums.forEach(x => { if (!ok.has(x)) bad(`⑧ ${m} ${lang}: the number ${x}`); }); }
      if (lang !== 'ja') continue;
      const none = /何も取り返せ|取り返されない|取り返されずに|ひとつも取り返/.test(h);
      if (m === best) {
        if (!nums.includes(a) || !nums.includes(an)) bad(`⑧ ${m} ja: the praise does not say ${a} and ${an}`);
        if (ar ? !nums.includes(ar) || none : !none) bad(`⑧ ${m} ja: the praise's taken back (${ar})`);
        if (!/止め/.test(h)) bad(`⑧ ${m} ja: the praise does not say it stopped`);
        continue;
      }
      if (NEAR.test(h)) bad(`追66 ${m} ja: ${h}`);
      if (PRAISE.test(h)) bad(`追20 ${m} ja: praise after a wrong move`);
      if (!nums.includes(c) || !nums.includes(an)) bad(`⑧ ${m} ja: does not say ${c} and ${an}`);
      if (k === 'small' ? !none : !nums.includes(r) || none) bad(`⑧ ${m} ja: taken back said ${none ? 'none' : '?'}, the board ${r}`);
      if (k === 'on' !== /先まで|進みすぎ|続けすぎ|取りすぎ/.test(h)) bad(`⑧ ${m} ja: going on past the stop said / not said (the board: ${k})`);
    }
    const key = 'ls.' + id + (m === best ? (ar ? '.why' : '.why0') : k === 'on' ? '.ngOn' : k === 'small' ? '.ngSmall' : '.ng');
    for (const lang of LANGS) { const tx = (i18n[lang] || {})[key]; if (!tx) bad(`⑨ 2D ${key} ${lang} missing`); else if (!/\{m\}/.test(tx) || !/\{an\}/.test(tx) || (m !== best && !/\{x\}/.test(tx)) || (m !== best && k !== 'small' && !/\{r\}/.test(tx)) || (m !== best && !/\{c\}/.test(tx)) || (m === best && ar && !/\{ar\}/.test(tx))) bad(`⑨ 2D ${key} ${lang}: {m}/{x}/{c}/{r}/{an}`); }
  }
}
// t_count: the words for every move against the facts recounted here (taken, taken back, the answer's gain)
function countWords(P, LS3, i18n, bad) {
  const id = 't_count', pos = E.Pos.from(P.s), L = pos.moves(true), best = P.best;
  const n = m => pos.steps(m).reduce((x, y) => x + y.cap.length, 0), a = n(best), ar = oppCaps(pos, best).c, an = a - ar;
  for (const m of L) {
    const f = F.fact(E, id, P.s, m), c = n(m), r = oppCaps(pos, m).c;
    const k = m === best ? 'most' : c > a ? 'greedy' : r > 0 ? 'back' : 'small';
    if (f.k !== k || f.c !== c || f.r !== r || f.a !== a || f.ar !== ar || f.an !== an) bad(`⑧ ${m}: the facts ${JSON.stringify(f)} ≠ ${k} ${c}−${r} / ${a}−${ar}`);
    for (const lang of LANGS) for (let j = 0; j < (lang === 'ja' ? 6 : 1); j++) {
      const h = LS3.sayText(id, P, m, lang, j);
      if (!h || /\{\w+\}/.test(h) || /undefined|NaN/.test(h)) { bad(`⑧ ${m} ${lang}: ${h}`); continue; }
      const nums = (h.replace(/<[^>]+>/g, '').match(/\d+/g) || []).map(Number);
      if (lang === 'ja' || lang === 'en') { const ok = new Set([c, r, a, ar, an]); nums.forEach(x => { if (!ok.has(x)) bad(`⑧ ${m} ${lang}: the number ${x}`); }); }
      if (lang !== 'ja') continue;
      const none = /何も取り返せ|取り返されない|取り返されずに|ひとつも取り返/.test(h);
      if (m === best) {
        if (!nums.includes(a) || !nums.includes(an)) bad(`⑧ ${m} ja: the praise does not say ${a} and ${an}`);
        if (ar ? !nums.includes(ar) || none : !none) bad(`⑧ ${m} ja: the praise's taken back (${ar})`);
        continue;
      }
      if (NEAR.test(h)) bad(`追66 ${m} ja: ${h}`);
      if (PRAISE.test(h)) bad(`追20 ${m} ja: praise after a wrong move`);
      if (!nums.includes(c) || !nums.includes(an)) bad(`⑧ ${m} ja: does not say ${c} and ${an}`);
      if (k === 'small' ? !none : !nums.includes(r) || none) bad(`⑧ ${m} ja: taken back said ${none ? 'none' : '?'}, the board ${r}`);
      if (k === 'greedy' && !/多い|多く/.test(h)) bad(`⑧ ${m} ja: the greedy words do not say it takes more`);
    }
    const key = 'ls.' + id + (m === best ? (ar ? '.why' : '.why0') : k === 'greedy' ? '.ngGreedy' : k === 'small' ? '.ngSmall' : '.ng');
    for (const lang of LANGS) { const tx = (i18n[lang] || {})[key]; if (!tx) bad(`⑨ 2D ${key} ${lang} missing`); else if (!/\{m\}/.test(tx) || !/\{an\}|\{a\}/.test(tx) || (m !== best && !/\{x\}/.test(tx)) || (m !== best && k !== 'small' && !/\{r\}/.test(tx)) || (m !== best && !/\{c\}/.test(tx))) bad(`⑨ 2D ${key} ${lang}: {m}/{x}/{c}/{r}/{an}`); }
  }
}
// t_big: the words for every move against the facts recounted here (the totals, the first captures, a move that could go on)
function bigWords(P, LS3, i18n, bad) {
  const id = 't_big', pos = E.Pos.from(P.s), L = pos.moves(true), best = P.best;
  const n = m => pos.steps(m).reduce((a, y) => a + y.cap.length, 0), a = n(best), sa = pos.steps(best).length, a1 = pos.steps(best)[0].cap.length;
  for (const m of L) {
    const f = F.fact(E, id, P.s, m), S = pos.steps(m), c = n(m), sc = S.length, c1 = S[0].cap.length, more = L.some(x => x.startsWith(m + '-'));
    const k = m === best ? 'most' : c1 > a1 ? 'greedy' : best.startsWith(m + '-') ? 'stop' : more ? 'stopx' : 'dead';
    if (f.k !== k || f.c !== c || f.a !== a || f.sc !== sc || f.sa !== sa || f.c1 !== c1 || f.a1 !== a1 || (m !== best && f.more !== more)) bad(`⑧ ${m}: the facts ${JSON.stringify(f)} ≠ ${k} ${c}/${a} ${sc}/${sa} first ${c1}/${a1} more ${more}`);
    if (f.same !== (S[0].from === pos.steps(best)[0].from)) bad(`⑧ ${m}: the facts' same piece`);
    for (const lang of LANGS) for (let j = 0; j < (lang === 'ja' ? 6 : 1); j++) {
      const h = LS3.sayText(id, P, m, lang, j);
      if (!h || /\{\w+\}/.test(h) || /undefined|NaN/.test(h)) { bad(`⑧ ${m} ${lang}: ${h}`); continue; }
      const nums = (h.replace(/<[^>]+>/g, '').match(/\d+/g) || []).map(Number);
      if (lang === 'ja' || lang === 'en') { const ok = new Set([c, a, sc, sa, c1, a1]); nums.forEach(x => { if (!ok.has(x)) bad(`⑧ ${m} ${lang}: the number ${x}`); }); }
      if (lang !== 'ja') continue;
      if (m === best) { if (!nums.includes(a)) bad(`⑧ ${m} ja: the praise does not say ${a}`); continue; }
      if (NEAR.test(h)) bad(`追66 ${m} ja: ${h}`);
      if (PRAISE.test(h)) bad(`追20 ${m} ja: praise after a wrong move`);
      if (!(nums.includes(c) && nums.includes(a))) bad(`⑧ ${m} ja: does not say ${c} and ${a}`);
      const goOn = /続け(られ|て取れ)|まだ取れ|まだ続/.test(h), noMore = /取れる(列|玉)がな|もう取れない|行き止まり/.test(h);
      if (k === 'greedy') {
        if (!(nums.includes(c1) && nums.includes(a1)) || !/最初|[1一]回目/.test(h)) bad(`⑧ ${m} ja: the greedy words do not say the first captures ${c1} and ${a1}`);
        if ((goOn && !more) || (noMore && more)) bad(`⑧ ${m} ja: could it go on? said ${goOn ? 'yes' : 'no'}, the board ${more}`);
      } else if (more !== goOn || more === noMore) bad(`⑧ ${m} ja: could it go on? said ${goOn ? 'yes' : noMore ? 'no' : '(none)'}, the board ${more}`);
    }
    const key = 'ls.' + id + (m === best ? '.why' : k === 'greedy' ? '.ngGreedy' : k === 'stop' || k === 'stopx' ? '.ngStop' : '.ng');
    for (const lang of LANGS) { const tx = (i18n[lang] || {})[key]; if (!tx) bad(`⑨ 2D ${key} ${lang} missing`); else if (!/\{m\}/.test(tx) || !/\{a\}/.test(tx) || (m !== best && !/\{x\}/.test(tx)) || (k === 'greedy' && !(/\{c1\}/.test(tx) && /\{a1\}/.test(tx)))) bad(`⑨ 2D ${key} ${lang}: {m}/{a}/{x}/{c1}/{a1}`); }
  }
}
// b_win: the words for every move against the facts recounted here (the opponent's pieces left, a move that could go on)
function winWords(P, LS3, i18n, bad) {
  const id = 'b_win', pos = E.Pos.from(P.s), L = pos.moves(true), best = P.best, opp = 3 - pos.turn;
  const n = m => pos.steps(m).reduce((a, y) => a + y.cap.length, 0), a = pos.count(opp), sa = pos.steps(best).length;
  for (const m of L) {
    const f = F.fact(E, id, P.s, m), c = n(m), sc = pos.steps(m).length, r = pos.clone().play(m).count(opp), more = L.some(x => x.startsWith(m + '-'));
    const k = m === best ? 'most' : best.startsWith(m + '-') ? 'stop' : more ? 'stopx' : 'dead';
    if (f.k !== k || f.c !== c || f.a !== a || f.r !== r || f.sc !== sc || f.sa !== sa) bad(`⑧ ${m}: the facts ${JSON.stringify(f)} ≠ ${k} ${c}/${a} left ${r} ${sc}/${sa}`);
    if (c + r !== a) bad(`⑧ ${m}: taken ${c} + left ${r} ≠ ${a}`);
    if (f.same !== (pos.steps(m)[0].from === pos.steps(best)[0].from)) bad(`⑧ ${m}: the facts' same piece`);
    for (const lang of LANGS) for (let j = 0; j < (lang === 'ja' ? 6 : 1); j++) {
      const h = LS3.sayText(id, P, m, lang, j);
      if (!h || /\{\w+\}/.test(h) || /undefined|NaN/.test(h)) { bad(`⑧ ${m} ${lang}: ${h}`); continue; }
      const nums = (h.replace(/<[^>]+>/g, '').match(/\d+/g) || []).map(Number);
      if (lang === 'ja' || lang === 'en') { const ok = new Set([c, a, r, sc, sa]); nums.forEach(x => { if (!ok.has(x)) bad(`⑧ ${m} ${lang}: the number ${x}`); }); }
      if (lang !== 'ja') continue;
      if (m === best) { if (!nums.includes(a) || !/全部|すべて/.test(h)) bad(`⑧ ${m} ja: the praise does not say all ${a}`); continue; }
      if (NEAR.test(h)) bad(`追66 ${m} ja: ${h}`);
      if (PRAISE.test(h)) bad(`追20 ${m} ja: praise after a wrong move`);
      if (!(nums.includes(c) && nums.includes(r)) || !new RegExp(r + 'つ残').test(h)) bad(`⑧ ${m} ja: does not say ${c} taken and ${r} left`);
      const goOn = /続け(られ|て取れ)|まだ取れ|まだ続/.test(h), noMore = /取れる(列|玉)がな|もう取れない|行き止まり/.test(h);
      if (more !== goOn || more === noMore) bad(`⑧ ${m} ja: could it go on? said ${goOn ? 'yes' : noMore ? 'no' : '(none)'}, the board ${more}`);
      if (!more && /同じ玉/.test(h) !== f.same) bad(`⑧ ${m} ja: "the same piece" said ${/同じ玉/.test(h)}, the board ${f.same}`);
    }
    const key = 'ls.' + id + (m === best ? '.why' : k === 'stop' || k === 'stopx' ? '.ngStop' : '.ng');
    for (const lang of LANGS) { const tx = (i18n[lang] || {})[key]; if (!tx) bad(`⑨ 2D ${key} ${lang} missing`); else if (!/\{m\}/.test(tx) || !/\{a\}/.test(tx) || (m !== best && !/\{x\}/.test(tx)) || (m !== best && !/\{r\}/.test(tx))) bad(`⑨ 2D ${key} ${lang}: {m}/{a}/{x}/{r}`); }
  }
}
// b_safe: the words for every move against the facts recounted here (the opponent's most, the piece moved / the point it left)
function safeWords(P, LS3, i18n, bad) {
  const id = 'b_safe', pos = E.Pos.from(P.s), L = pos.moves(true), best = P.best;
  for (const m of L) {
    const f = F.fact(E, id, P.s, m), r = oppCaps(pos, m), S = pos.steps(m)[0];
    const k = m === best ? 'most' : r.L.some(o => o.S.some(y => y.cap.includes(S.to))) ? 'self' : 'open';
    if (f.k !== k || f.c !== r.c) bad(`⑧ ${m}: the facts ${JSON.stringify(f)} ≠ ${k} ${r.c}`);
    for (const lang of LANGS) for (let j = 0; j < (lang === 'ja' ? 6 : 1); j++) {
      const h = LS3.sayText(id, P, m, lang, j);
      if (!h || /\{\w+\}/.test(h) || /undefined|NaN/.test(h)) { bad(`⑧ ${m} ${lang}: ${h}`); continue; }
      const nums = (h.replace(/<[^>]+>/g, '').match(/\d+/g) || []).map(Number);
      if (lang === 'ja' || lang === 'en') nums.forEach(x => { if (x !== r.c) bad(`⑧ ${m} ${lang}: the number ${x} (${r.c})`); });
      if (lang !== 'ja') continue;
      if (m === best) { if (!/何も取れ|どの玉も取れ|ひとつも取れ|取れる玉がな/.test(h)) bad(`⑧ ${m} ja: the praise does not say the opponent takes nothing`); continue; }
      if (NEAR.test(h)) bad(`追66 ${m} ja: ${h}`);
      if (PRAISE.test(h)) bad(`追20 ${m} ja: praise after a wrong move`);
      if (!nums.includes(r.c)) bad(`⑧ ${m} ja: does not say ${r.c}`);
      const saySelf = /動かした玉(が|を|も|ごと|まで)/.test(h), sayOpen = /(いた|元の|もとの)点|空けた点|空いた点/.test(h);
      if (k === 'self' ? !saySelf || sayOpen : !sayOpen || saySelf) bad(`⑧ ${m} ja: said ${saySelf ? 'the piece moved' : sayOpen ? 'the point it left' : '(none)'}, the board ${k}`);
    }
    const key = 'ls.' + id + (m === best ? '.why' : k === 'self' ? '.ngSelf' : '.ng');
    for (const lang of LANGS) { const tx = (i18n[lang] || {})[key]; if (!tx) bad(`⑨ 2D ${key} ${lang} missing`); else if (!/\{m\}/.test(tx) || (m !== best && !/\{x\}/.test(tx)) || (m !== best && !/\{c\}/.test(tx))) bad(`⑨ 2D ${key} ${lang}: {m}/{x}/{c}`); }
  }
}
// b_chain: the words for every move against the facts recounted here (by the move names: a part of the answer, a move that could go on)
function chainWords(P, LS3, i18n, bad) {
  const id = 'b_chain', pos = E.Pos.from(P.s), L = pos.moves(true), best = P.best;
  const n = m => pos.steps(m).reduce((a, y) => a + y.cap.length, 0), a = n(best), sa = pos.steps(best).length;
  for (const m of L) {
    const f = F.fact(E, id, P.s, m), c = n(m), sc = pos.steps(m).length, more = L.some(x => x.startsWith(m + '-'));
    const k = m === best ? 'most' : best.startsWith(m + '-') ? 'stop' : more ? 'stopx' : 'dead';
    if (f.k !== k || f.c !== c || f.a !== a || f.sc !== sc || f.sa !== sa) bad(`⑧ ${m}: the facts ${JSON.stringify(f)} ≠ ${k} ${c}/${a} ${sc}/${sa}`);
    if (f.same !== (pos.steps(m)[0].from === pos.steps(best)[0].from)) bad(`⑧ ${m}: the facts' same piece`);
    for (const lang of LANGS) for (let j = 0; j < (lang === 'ja' ? 6 : 1); j++) {
      const h = LS3.sayText(id, P, m, lang, j);
      if (!h || /\{\w+\}/.test(h) || /undefined|NaN/.test(h)) { bad(`⑧ ${m} ${lang}: ${h}`); continue; }
      const nums = (h.replace(/<[^>]+>/g, '').match(/\d+/g) || []).map(Number);
      if (lang === 'ja' || lang === 'en') { const ok = new Set([c, a, sc, sa]); nums.forEach(x => { if (!ok.has(x)) bad(`⑧ ${m} ${lang}: the number ${x}`); }); }
      if (lang !== 'ja') continue;
      if (m === best) { if (!nums.includes(a)) bad(`⑧ ${m} ja: the praise does not say ${a}`); continue; }
      if (NEAR.test(h)) bad(`追66 ${m} ja: ${h}`);
      if (PRAISE.test(h)) bad(`追20 ${m} ja: praise after a wrong move`);
      if (!(nums.includes(c) && nums.includes(a))) bad(`⑧ ${m} ja: does not say ${c} and ${a}`);
      const goOn = /続け(られ|て取れ)|まだ取れ|まだ続/.test(h), noMore = /取れる(列|玉)がな|もう取れない|行き止まり/.test(h);
      if (more !== goOn || more === noMore) bad(`⑧ ${m} ja: could it go on? said ${goOn ? 'yes' : noMore ? 'no' : '(none)'}, the board ${more}`);
    }
    const key = 'ls.' + id + (m === best ? '.why' : k === 'stop' || k === 'stopx' ? '.ngStop' : '.ng');
    for (const lang of LANGS) { const tx = (i18n[lang] || {})[key]; if (!tx) bad(`⑨ 2D ${key} ${lang} missing`); else if (!/\{m\}/.test(tx) || (m !== best && !/\{x\}/.test(tx))) bad(`⑨ 2D ${key} ${lang}: {m}/{x}`); }
  }
}
// the words for every move (the 3D's say() in 14 languages) against the facts recounted here
const NEAR = /おしい|あと一歩|いい線|あと少し|惜しい|Close|So close|Almost/i, PRAISE = /正解|お見事|ばっちり|さすが|Correct|Well done/;
function words(id, P, LS3, i18n, bad) {
  const pos = E.Pos.from(P.s), L = pos.moves(true), best = P.best;
  for (const m of L) {
    const s = pos.steps(m)[0], ln = lineOf(pos, s), f = F.fact(E, id, P.s, m);
    if (f.c !== ln.n || f.a !== lineOf(pos, pos.steps(best)[0]).n) bad(`⑧ ${m}: the facts count ${f.c}/${f.a}`);
    if (m !== best && f.k !== 'most' && f.end !== ln.end) bad(`⑧ ${m}: the line's end ${f.end} ≠ ${ln.end}`);
    const B = pos.steps(best)[0], same = m !== best && s.from === B.from && s.to === B.to;
    if ((m === best) !== (f.k === 'most') || same !== (f.k === 'same')) bad(`⑧ ${m}: the kind ${f.k}`);
    for (const lang of LANGS) for (let k = 0; k < (lang === 'ja' ? 6 : 1); k++) {   // (ja: every line of every list)
      const h = LS3.sayText(id, P, m, lang, k);
      if (!h || /\{\w+\}/.test(h) || /undefined|NaN/.test(h)) { bad(`⑧ ${m} ${lang}: ${h}`); continue; }
      const nums = (h.replace(/<[^>]+>/g, '').match(/\d+/g) || []).map(Number);
      if (lang === 'ja' || lang === 'en') { const allowed = new Set([f.c, f.a]); nums.forEach(n => { if (!allowed.has(n)) bad(`⑧ ${m} ${lang}: the number ${n} (${f.c}/${f.a})`); }); }
      if (m === best) { if (lang === 'ja' && !nums.includes(f.a)) bad(`⑧ ${m} ja: the praise does not say ${f.a}`); }
      else {
        if (lang === 'ja' && NEAR.test(h)) bad(`追66 ${m} ja: ${h}`);
        if (lang === 'ja' && PRAISE.test(h)) bad(`追20 ${m} ja: praise after a wrong move`);
        if (lang === 'ja' && !(nums.includes(f.c) && nums.includes(f.a))) bad(`⑧ ${m} ja: does not say ${f.c} and ${f.a}`);
        if (lang === 'ja') {   // what ends the red line, said as the board has it
          const said = /盤のはし/.test(h) ? 'edge' : /きみの玉|自分の玉|味方/.test(h) ? 'mine' : /空(いた|き)/.test(h) ? 'empty' : '';
          if (f.k === 'fewer' && said !== ln.end) bad(`⑧ ${m} ja: the end said ${said || '(none)'} ≠ ${ln.end}`);
          if (f.k === 'same' && !/(接近|離脱)/.test(h)) bad(`⑧ ${m} ja: the same step's other line not named`);
        }
      }
    }
    // the 2D key the 2D uses for this move (fanorona/app.js lsKey) has all 14 languages
    const key = 'ls.' + id + (m === best ? '.why' : f.k === 'same' ? '.ngSame' : '.ng');
    for (const lang of LANGS) { const tx = (i18n[lang] || {})[key]; if (!tx) bad(`⑨ 2D ${key} ${lang} missing`); else if (!/\{m\}/.test(tx) || (m !== best && !/\{x\}/.test(tx))) bad(`⑨ 2D ${key} ${lang}: {m}/{x}`); }
  }
}
function loadI18n() {
  const w = { I18N: {} }; new Function('window', 'I18N', fs.readFileSync(path.join(ROOT, 'fanorona/i18n.js'), 'utf8'))(w, w.I18N); return w.I18N;
}
function verify(opt) {
  opt = opt || {}; engine();
  const LS = opt.data || JSON.parse(fs.readFileSync(path.join(ROOT, 'fanorona/lessons.json'), 'utf8'));
  const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'fanorona/puzzles.json'), 'utf8'));
  const LS3 = opt.ls3 || require(path.join(ROOT, 'atlas/ls-fanorona.js'));
  const i18n = opt.i18n || loadI18n(), app = opt.app || fs.readFileSync(path.join(ROOT, 'fanorona/app.js'), 'utf8');
  const out = [], add = (id, q, m) => out.push({ id, q, msg: m });
  const PL = pool(LS, PZ);
  let n = 0, okN = 0;
  for (const id of LS3.READY) {
    const st = LS.steps.find(s => s.id === id); if (!st) { add(id, 0, 'missing'); continue; }
    const CH = id === 'b_chain', SF = id === 'b_safe', WN = id === 'b_win', BG = id === 't_big', CT = id === 't_count', TS = id === 't_stop', TP = id === 't_paika', TR = id === 'e_trap';
    if (!BASICS.includes(id) && !CH && !SF && !WN && !BG && !CT && !TS && !TP && !TR) { add(id, 0, 'no check for this lesson yet'); continue; }
    let prevD = -1, firstD = null; const kindsSeen = new Set();
    st.problems.forEach((P, j) => {
      n++; const before = out.length;
      const o = { pool: PL.filter(A => A.tag !== id + '#' + (j + 1)) }, r = CH ? chainProblem(P, o) : TR ? trapProblem(P, o) : TP ? paikaProblem(P, o) : TS ? stopProblem(P, o) : CT ? countProblem(P, o) : BG ? bigProblem(P, o) : SF ? safeProblem(P, o) : WN ? winProblem(P, o) : basicProblem(id, P, o);
      if ((SF || WN || BG || CT || TS || TP || TR) && r.kinds) r.kinds.forEach(k => kindsSeen.add(k));
      if ((CT || TS) && r.ok) kindsSeen.add(r.ar ? 'ar' : 'ar0');
      if (TR && r.no) kindsSeen.add('no' + r.no);
      r.msgs.forEach(m => add(id, j + 1, m));
      if (r.ok) {
        if (r.d <= prevD) add(id, j + 1, `⑥ d ${r.d} not above ${prevD}`);
        prevD = r.d; if (firstD == null) firstD = r.d;
        if (CH) chainWords(P, LS3, i18n, m => add(id, j + 1, m)); else if (TR) trapWords(P, LS3, i18n, m => add(id, j + 1, m)); else if (TP) paikaWords(P, LS3, i18n, m => add(id, j + 1, m)); else if (TS) stopWords(P, LS3, i18n, m => add(id, j + 1, m)); else if (CT) countWords(P, LS3, i18n, m => add(id, j + 1, m)); else if (BG) bigWords(P, LS3, i18n, m => add(id, j + 1, m)); else if (WN) winWords(P, LS3, i18n, m => add(id, j + 1, m)); else if (SF) safeWords(P, LS3, i18n, m => add(id, j + 1, m)); else words(id, P, LS3, i18n, m => add(id, j + 1, m));
      }
      if (out.length === before) okN++;
    });
    if (SF && !(kindsSeen.has('self') && kindsSeen.has('open'))) add(id, 0, '④ b_safe: not both kinds of wrong move (the piece moved taken / through the point it left)');
    if (WN && !(kindsSeen.has('stop') && kindsSeen.has('dead'))) add(id, 0, '④ b_win: not both kinds of wrong move (stopped on the answer\'s road / a road to its end)');
    if (WN && st.problems.slice(1).some(P => P.best && P.best.split('-').length < 3)) add(id, 0, '④ b_win: an answer after problem 1 that is no chain');
    if (BG && !(kindsSeen.has('stop') || kindsSeen.has('stopx')) || BG && !kindsSeen.has('dead')) add(id, 0, '④ t_big: not every kind of wrong move (greedy in each, and stopped / a road to its end in the lesson)');
    if (CT && !(kindsSeen.has('back') && kindsSeen.has('ar') && kindsSeen.has('ar0'))) add(id, 0, '④ t_count: not every kind (a wrong move taken back, an answer taken back and one taken back nothing)');
    if (TS && !(kindsSeen.has('back') && kindsSeen.has('ar0'))) add(id, 0, '④ t_stop: not every kind (a wrong move of another road taken back, an answer taken back nothing)');
    if (TP && !(kindsSeen.has('give') && kindsSeen.has('none') && kindsSeen.has('block'))) add(id, 0, '④ t_paika: not every kind of wrong move (gives a capture / sets up nothing / a set-up the opponent stops)');
    if (TR && !(kindsSeen.has('give') && kindsSeen.has('run'))) add(id, 0, '④ e_trap: not both kinds of wrong move (gives a capture / leaves a way out)');
    if (TR && !(kindsSeen.has('no1') && kindsSeen.has('no2'))) add(id, 0, '④ e_trap: not both a last piece and two pieces to trap (the same aim five times)');
    if (TR && new Set(st.problems.map(P => P.best)).size !== st.problems.length) add(id, 0, '⑤ e_trap: two answers the same move');
    if (st.problems.length !== 5) add(id, 0, '5 problems');
    if (st.problems.length && st.problems[3] && st.problems[3].s.side !== 2) add(id, 4, '追5 problem 4 is not Black\'s');
  }
  // ⑨ the 2D reads the facts for these lessons and rings every capturing piece for the hint
  if (!/FanoronaLsFacts\.fact\(/.test(app) || !/FanoronaLsFacts\.hint\(/.test(app)) add('2D', 0, '⑨ fanorona/app.js does not use FanoronaLsFacts');
  if (!fs.readFileSync(path.join(ROOT, 'fanorona/index.html'), 'utf8').includes('ls-facts.js')) add('2D', 0, '⑨ fanorona/index.html does not load ls-facts.js');
  // 追75 / 追14 the ramps (2D)
  LS.steps.forEach(st => (st.ramp || []).forEach((it, j) => {
    const p0 = E.Pos.from(it.s);
    if (it.k === 'try') {
      const names = p0.moves(true).map(m => E.name(p0, m));
      (it.ok || []).forEach(nm => { if (!names.includes(nm)) add(st.id, 'ramp' + (j + 1), '追75 the right move ' + nm + ' is not a move of its board'); });
      if (!(it.ok || []).length) add(st.id, 'ramp' + (j + 1), '追75 no right move');
      (it.look || []).forEach(q => { if (!(q >= 0 && q < 45) || !p0.at(q)) add(st.id, 'ramp' + (j + 1), '追75 the look point ' + q + ' is no piece'); });
    } else {
      let p = p0.clone(); for (const [nm] of it.seq || []) { const m = p.moves(true).find(x => E.name(p, x) === nm); if (!m) { add(st.id, 'ramp' + (j + 1), '追14 the arrow ' + nm + ' is not legal'); break; } p = p.clone().play(m); }
    }
  }));
  const ch = LS.steps.find(s => s.id === 'b_choose'), ex = ch && (ch.ramp || []).find(x => x.k === 'explain');
  if (ex) {   // 「d4 から e4 への1歩は、接近（f4・g4・h4）と離脱（c4）… 接近を選ぶと3つ、離脱だと1つ」
    const p = E.Pos.from(ex.s), two = p.capSteps(null).filter(x => E.pname(x.from) === 'd4' && E.pname(x.to) === 'e4');
    const A = two.find(x => x.kind === 'A'), W = two.find(x => x.kind === 'W');
    if (!A || !W || A.cap.map(E.pname).join() !== 'f4,g4,h4' || W.cap.map(E.pname).join() !== 'c4') add('b_choose', 'ramp1', '追14 the explain\'s lines are not the board\'s');
  }
  return { out, n, okN };
}
function selftest() {
  engine();
  const LS = JSON.parse(fs.readFileSync(path.join(ROOT, 'fanorona/lessons.json'), 'utf8'));
  const LS3 = require(path.join(ROOT, 'atlas/ls-fanorona.js'));
  const clone = () => JSON.parse(JSON.stringify(LS));
  const st = (d, id) => d.steps.find(s => s.id === id), COLS = 'abcdefghi', mirM = m => m.replace(/([a-i])(\d)/g, (x, c, r) => COLS[8 - COLS.indexOf(c)] + r);
  const cases = [
    ['①', '① another answer', d => { const P = st(d, 'b_approach').problems[0], p = E.Pos.from(P.s), o = p.moves(true).find(m => m !== P.best); P.ok = [o]; P.best = o; }],
    ['①', '① a second right move stored', d => { st(d, 'b_withdraw').problems[1].ok = st(d, 'b_withdraw').problems[1].ok.concat(['x']); }],
    ['④', '④ a withdrawal problem in the approach lesson', d => { st(d, 'b_approach').problems[2] = JSON.parse(JSON.stringify(st(d, 'b_withdraw').problems[2])); }],
    ['⑤', '⑤ a mirrored copy of another problem', d => { const P = st(d, 'b_approach').problems[1]; st(d, 'b_approach').problems[4] = { s: { b: symB(P.s.b, GEO[1], false), side: P.s.side }, ok: [mirM(P.best)], best: mirM(P.best) }; }],
    ['⑥', '⑥ the order reversed', d => { st(d, 'b_withdraw').problems.reverse(); }],
    ['①', '① b_chain: the answer cut short (a part of the chain)', d => { const P = st(d, 'b_chain').problems[2], q = P.best.split('-').slice(0, -1).join('-'); P.ok = [q]; P.best = q; }],
    ['④', '④ b_chain: a problem of single steps', d => { st(d, 'b_chain').problems[0] = JSON.parse(JSON.stringify(st(d, 'b_approach').problems[0])); }],
    ['②', '② b_safe: a problem with two safe moves (the old q1)', d => { st(d, 'b_safe').problems[0] = { s: { b: '.b....w.w.w........b...........b............w', side: 1 }, ok: ['b2-c2'], best: 'b2-c2' }; }],
    ['④', '④ b_safe: a problem with a capture on the board', d => { st(d, 'b_safe').problems[1] = JSON.parse(JSON.stringify(st(d, 'b_approach').problems[1])); }],
    ['③', '③ b_win: the old q1 (captures from 2 pieces only, 追52)', d => { st(d, 'b_win').problems[0] = { s: { b: '...b......b...........wb......w...w...w...w..', side: 1 }, ok: ['e3-d3W-d2A-c2A'], best: 'e3-d3W-d2A-c2A' }; }],
    ['②', '② b_win: the old q3 (every other move wins anyway: the engine\'s second a won value)', d => { st(d, 'b_win').problems[2] = { s: { b: '............b.b.w...b....w.w.w...w..w.b.w....', side: 1 }, ok: ['e5-d4A-e3W-f4W-f3A'], best: 'e5-d4A-e3W-f4W-f3A' }; }],
    ['①', '① b_win: the answer cut short (a part of the chain)', d => { const P = st(d, 'b_win').problems[1], q = P.best.split('-').slice(0, -1).join('-'); P.ok = [q]; P.best = q; }],
    ['②', '② t_big: the old q4 (two moves take 5, no greedy trap)', d => { st(d, 't_big').problems[3] = { s: { b: 'ww.....wwwww....wwbw...b.bwbbb.....bbbb.b..b.', side: 1 }, ok: ['b3-c3W-d4A-e4W'], best: 'b3-c3W-d4A-e4W' }; }],
    ['④', '④ t_big: a b_chain problem (no greedy trap of 3)', d => { st(d, 't_big').problems[2] = JSON.parse(JSON.stringify(st(d, 'b_chain').problems[2])); }],
    ['④', '④ t_count: the old q1 (the answer loses 2: taken 1, taken back 3)', d => { st(d, 't_count').problems[0] = { s: { b: 'wwwww.w....w...wb..w.w......bb.w...b.b.b.bbb.', side: 1 }, ok: ['c2-c3A'], best: 'c2-c3A' }; }],
    ['②', '② t_count: the old q2 (two moves gain 1)', d => { st(d, 't_count').problems[1] = { s: { b: 'ww...w.w...b...ww......b.b.b....bbb...w.....b', side: 1 }, ok: ['g2-g3A-f2W'], best: 'g2-g3A-f2W' }; }],
    ['①', '① t_count: the greedy move stored as the answer', d => { const P = st(d, 't_count').problems[2], p = E.Pos.from(P.s), a = p.steps(P.best).reduce((x, y) => x + y.cap.length, 0), g = p.moves(true).find(m => p.steps(m).reduce((x, y) => x + y.cap.length, 0) > a); P.ok = [g]; P.best = g; }],
    ['④', '④ t_stop: the old q1 (the best gains −2, no stop)', d => { st(d, 't_stop').problems[0] = { s: { b: 'w.w..wwwww.w.w.wwwb..wwbwbwbbb.bbbbb....bbbbb', side: 1 }, ok: ['c1-b2A'], best: 'c1-b2A' }; }],
    ['①', '① t_stop: the move going on past the stop stored as the answer', d => { const P = st(d, 't_stop').problems[1], p = E.Pos.from(P.s), g = p.moves(true).find(m => m.startsWith(P.best + '-')); P.ok = [g]; P.best = g; }],
    ['④', '④ t_stop: a t_count problem whose answer goes to its end (no stop)', d => { st(d, 't_stop').problems[2] = JSON.parse(JSON.stringify(st(d, 't_count').problems[0])); }],
    ['②', '② t_paika: the old q3 (no move sets up a sure capture)', d => { st(d, 't_paika').problems[2] = { s: { b: '.....w.ww...........b.......b..w..b.........b', side: 1 }, ok: ['f1-g1'], best: 'f1-g1' }; }],
    ['④', '④ t_paika: a b_safe problem (no safe wrong move)', d => { st(d, 't_paika').problems[1] = JSON.parse(JSON.stringify(st(d, 'b_safe').problems[2])); }],
    ['①', '① t_paika: a safe move that sets up nothing stored as the answer', d => { const P = st(d, 't_paika').problems[0], p = E.Pos.from(P.s), g = p.moves(true).find(m => paikaLook(p, m).k === 'none'); P.ok = [g]; P.best = g; }],
    ['④', '④ e_trap: the old q1 (the opponent can already capture; the answer gives a capture)', d => { st(d, 'e_trap').problems[0] = { s: { b: '..w..........b.............w....b........w...', side: 1 }, ok: ['f5-g5'], best: 'f5-g5' }; }],
    ['①', '① e_trap: a move leaving a way out stored as the answer', d => { const P = st(d, 'e_trap').problems[1], p = E.Pos.from(P.s), g = p.moves(true).find(m => trapLook(p, m).k === 'run'); P.ok = [g]; P.best = g; }],
    ['④', '④ e_trap: a t_paika problem (3 opponent pieces or more)', d => { st(d, 'e_trap').problems[2] = JSON.parse(JSON.stringify(st(d, 't_paika').problems[2])); }],
    ['追75', '追75 a ramp move off its board', d => { st(d, 'b_choose').ramp.find(x => x.k === 'try').ok = ['a1-a2A']; }],
  ];
  let fails = 0;
  // (a case named for a lesson — "① t_paika: …" — is caught only by that lesson's NG)
  for (const [tag, name, f] of cases) { const d = clone(); f(d); const r = verify({ data: d, ls3: LS3 }), own = (/^\S+ ([bte]_\w+):/.exec(name) || [])[1], o = r.out.find(x => x.msg.startsWith(tag) && (!own || x.id === own)); if (!o) fails++; console.log((o ? 'ok   ' : 'MISS ') + name + (o ? '  → ' + o.id + ' ' + o.q + ' ' + o.msg : '')); }
  {   // the words: a wrong count in the 3D ja words
    const orig = LS3.sayText; LS3.sayText = (id, P, m, lang, k) => orig(id, P, m, lang, k).replace(/(\d+)/, (x) => String(+x + 1));
    const r = verify({ ls3: LS3 }); LS3.sayText = orig; const hit = r.out.some(o => /⑧/.test(o.msg)); if (!hit) fails++; console.log((hit ? 'ok   ' : 'MISS ') + '⑧ a wrong number in the words');
  }
  {   // b_chain: a move that could go on told it could not
    const orig = LS3.sayText; LS3.sayText = (id, P, m, lang, k) => { const h = orig(id, P, m, lang, k); return id === 'b_chain' ? h.replace(/まだ続けて取れ/g, 'もう取れな').replace(/続けられ/g, 'もう取れな') : h; };
    const r = verify({ ls3: LS3 }); LS3.sayText = orig; const hit = r.out.some(o => o.id === 'b_chain' && /⑧/.test(o.msg)); if (!hit) fails++; console.log((hit ? 'ok   ' : 'MISS ') + '⑧ b_chain: "could not go on" said of a move that could');
  }
  {   // b_safe: the point it left said of a move whose piece is taken
    const orig = LS3.sayText; LS3.sayText = (id, P, m, lang, k) => { const h = orig(id, P, m, lang, k); return id === 'b_safe' ? h.replace(/動かした玉(が|を|ごと)/g, '元いた点$1') : h; };
    const r = verify({ ls3: LS3 }); LS3.sayText = orig; const hit = r.out.some(o => o.id === 'b_safe' && /⑧/.test(o.msg)); if (!hit) fails++; console.log((hit ? 'ok   ' : 'MISS ') + '⑧ b_safe: "the point it left" said of a move whose piece is taken');
  }
  {   // b_win: the pieces left miscounted in the words
    const orig = LS3.sayText; LS3.sayText = (id, P, m, lang, k) => { const h = orig(id, P, m, lang, k); return id === 'b_win' ? h.replace(/(\d+)つ残/g, (x, n) => (+n + 1) + 'つ残') : h; };
    const r = verify({ ls3: LS3 }); LS3.sayText = orig; const hit = r.out.some(o => o.id === 'b_win' && /⑧/.test(o.msg)); if (!hit) fails++; console.log((hit ? 'ok   ' : 'MISS ') + '⑧ b_win: the pieces left miscounted');
  }
  {   // t_big: the greedy move's first capture miscounted in the words
    const orig = LS3.sayText; LS3.sayText = (id, P, m, lang, k) => { const h = orig(id, P, m, lang, k); return id === 't_big' ? h.replace(/最初の一取りは(\d+)つ|最初の一回で(\d+)つ|最初に(\d+)つ|最初の(\d+)つ|赤の(\d+)つは/g, x => x.replace(/\d+/, n => String(+n + 5))) : h; };
    const r = verify({ ls3: LS3 }); LS3.sayText = orig; const hit = r.out.some(o => o.id === 't_big' && /⑧/.test(o.msg)); if (!hit) fails++; console.log((hit ? 'ok   ' : 'MISS ') + '⑧ t_big: the greedy first capture miscounted');
  }
  {   // t_count: the taken back miscounted in the words
    const orig = LS3.sayText; LS3.sayText = (id, P, m, lang, k) => { const h = orig(id, P, m, lang, k); return id === 't_count' ? h.replace(/(\d+)つ取り返さ/g, (x, n) => (+n + 7) + 'つ取り返さ') : h; };
    const r = verify({ ls3: LS3 }); LS3.sayText = orig; const hit = r.out.some(o => o.id === 't_count' && /⑧/.test(o.msg)); if (!hit) fails++; console.log((hit ? 'ok   ' : 'MISS ') + '⑧ t_count: the taken back miscounted');
  }
  {   // t_stop: a move going on past the stop told as another road (the going-on words dropped)
    const orig = LS3.sayText; LS3.sayText = (id, P, m, lang, k) => { const h = orig(id, P, m, lang, k); return id === 't_stop' ? h.replace(/先まで|進みすぎ|続けすぎ|取りすぎ/g, 'そこで') : h; };
    const r = verify({ ls3: LS3 }); LS3.sayText = orig; const hit = r.out.some(o => o.id === 't_stop' && /⑧/.test(o.msg)); if (!hit) fails++; console.log((hit ? 'ok   ' : 'MISS ') + '⑧ t_stop: going on past the stop not said');
  }
  {   // t_paika: a set-up the opponent stops told as no set-up
    const orig = LS3.sayText; LS3.sayText = (id, P, m, lang, k) => { const h = orig(id, P, m, lang, k); return id === 't_paika' ? h.replace(/止められ|ふさが|防が/g, '取れる形ができていな') : h; };
    const r = verify({ ls3: LS3 }); LS3.sayText = orig; const hit = r.out.some(o => o.id === 't_paika' && /⑧/.test(o.msg)); if (!hit) fails++; console.log((hit ? 'ok   ' : 'MISS ') + '⑧ t_paika: a stopped set-up told as none');
  }
  {   // e_trap: the ways out miscounted in the words
    const orig = LS3.sayText; LS3.sayText = (id, P, m, lang, k) => { const h = orig(id, P, m, lang, k); return id === 'e_trap' ? h.replace(/(\d+)通り/g, (x, n) => (+n + 3) + '通り') : h; };
    const r = verify({ ls3: LS3 }); LS3.sayText = orig; const hit = r.out.some(o => o.id === 'e_trap' && /⑧/.test(o.msg)); if (!hit) fails++; console.log((hit ? 'ok   ' : 'MISS ') + '⑧ e_trap: the ways out / replies miscounted');
  }
  {   // e_trap: a way out told as a capture given
    const orig = LS3.sayText; LS3.sayText = (id, P, m, lang, k) => { const h = orig(id, P, m, lang, k); return id === 'e_trap' ? h.replace(/逃げ道|逃げられ/g, '取られる手') : h; };
    const r = verify({ ls3: LS3 }); LS3.sayText = orig; const hit = r.out.some(o => o.id === 'e_trap' && /⑧/.test(o.msg)); if (!hit) fails++; console.log((hit ? 'ok   ' : 'MISS ') + '⑧ e_trap: a way out told as a capture given');
  }
  {   // the 2D key missing in one language
    const I = loadI18n(); delete I.de['ls.b_choose.ngSame'];
    const r = verify({ i18n: I }); const hit = r.out.some(o => /⑨/.test(o.msg)); if (!hit) fails++; console.log((hit ? 'ok   ' : 'MISS ') + '⑨ a 2D key missing');
  }
  {   // the 2D without the facts
    const app = fs.readFileSync(path.join(ROOT, 'fanorona/app.js'), 'utf8').replace(/FanoronaLsFacts\.fact\(/g, 'Nope(');
    const r = verify({ app }); const hit = r.out.some(o => /⑨/.test(o.msg)); if (!hit) fails++; console.log((hit ? 'ok   ' : 'MISS ') + '⑨ the 2D without the facts');
  }
  return fails;
}
module.exports = { engine, values, basicProblem, chainProblem, bigProblem, countProblem, stopProblem, safeProblem, winProblem, paikaProblem, paikaLook, trapProblem, trapLook, verify, selftest, pool, near, lineOf, BASICS };
if (require.main === module) {
  if (process.argv.includes('--selftest')) { const f = selftest(); console.log(f ? `selftest: ${f} missed` : 'selftest: all caught'); process.exit(f ? 1 : 0); }
  const r = verify();
  r.out.forEach(o => console.log(`NG fanorona ${o.id} ${o.q ? 'q' + o.q : ''} ${o.msg}`));
  console.log(`fanorona lessons (3D READY): ${r.okN}/${r.n} problems pass${r.out.length ? `, ${r.out.length} NG` : ''}`);
  process.exit(r.out.length ? 1 : 0);
}
