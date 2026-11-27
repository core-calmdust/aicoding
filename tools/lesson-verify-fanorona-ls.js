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
    const CH = id === 'b_chain', SF = id === 'b_safe';
    if (!BASICS.includes(id) && !CH && !SF) { add(id, 0, 'no check for this lesson yet'); continue; }
    let prevD = -1, firstD = null; const kindsSeen = new Set();
    st.problems.forEach((P, j) => {
      n++; const before = out.length;
      const o = { pool: PL.filter(A => A.tag !== id + '#' + (j + 1)) }, r = CH ? chainProblem(P, o) : SF ? safeProblem(P, o) : basicProblem(id, P, o);
      if (SF && r.kinds) r.kinds.forEach(k => kindsSeen.add(k));
      r.msgs.forEach(m => add(id, j + 1, m));
      if (r.ok) {
        if (r.d <= prevD) add(id, j + 1, `⑥ d ${r.d} not above ${prevD}`);
        prevD = r.d; if (firstD == null) firstD = r.d;
        if (CH) chainWords(P, LS3, i18n, m => add(id, j + 1, m)); else if (SF) safeWords(P, LS3, i18n, m => add(id, j + 1, m)); else words(id, P, LS3, i18n, m => add(id, j + 1, m));
      }
      if (out.length === before) okN++;
    });
    if (SF && !(kindsSeen.has('self') && kindsSeen.has('open'))) add(id, 0, '④ b_safe: not both kinds of wrong move (the piece moved taken / through the point it left)');
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
    ['追75', '追75 a ramp move off its board', d => { st(d, 'b_choose').ramp.find(x => x.k === 'try').ok = ['a1-a2A']; }],
  ];
  let fails = 0;
  for (const [tag, name, f] of cases) { const d = clone(); f(d); const r = verify({ data: d, ls3: LS3 }), o = r.out.find(x => x.msg.startsWith(tag)); if (!o) fails++; console.log((o ? 'ok   ' : 'MISS ') + name + (o ? '  → ' + o.id + ' ' + o.q + ' ' + o.msg : '')); }
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
module.exports = { engine, values, basicProblem, chainProblem, safeProblem, verify, selftest, pool, near, lineOf, BASICS };
if (require.main === module) {
  if (process.argv.includes('--selftest')) { const f = selftest(); console.log(f ? `selftest: ${f} missed` : 'selftest: all caught'); process.exit(f ? 1 : 0); }
  const r = verify();
  r.out.forEach(o => console.log(`NG fanorona ${o.id} ${o.q ? 'q' + o.q : ''} ${o.msg}`));
  console.log(`fanorona lessons (3D READY): ${r.okN}/${r.n} problems pass${r.out.length ? `, ${r.out.length} NG` : ''}`);
  process.exit(r.out.length ? 1 : 0);
}
