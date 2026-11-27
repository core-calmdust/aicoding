#!/usr/bin/env node
// (2026-11-25 担当C) Kōnane lessons on the 3D table (atlas/ls-konane.js READY) and in the 2D (konane/app.js okAnswer), checked on the
// board with a jump generator of this file (its own, not the engine's) — every problem of every READY lesson, ①〜⑨ and 追1〜:
//  ① ok = exactly the moves that reach the goal (b_double: take 2 or more in one move · b_win: the opponent has no jump after it);
//    best ∈ ok; the engine's legal moves = this file's jumps (from, to, stones taken).
//  ② one right move (ok has 1 move).   ③ 5 legal moves or more, 4 wrong ones or more; 追72 right moves ≤ 1/3 of the legal ones.
//  ④ the theme: b_double — the stone that takes 2 also has its own line stopped after 1 (a 'stop' wrong move); 3 stones or more can
//    jump (the hint's marks narrow nothing to the answer alone, 追52). b_win — the opponent has 2 jumps or more now; some wrong move
//    leaves it a single jump; the hint's stones = the opponent's stones that could jump now.
//  ⑤ no two positions (these problems, every other lesson problem on 8×8, every puzzle) within 4 squares of each other under the 8
//    symmetries of the square, the colours as they are or swapped.
//  ⑥ easy → hard in each lesson: d = wrong moves + 2 × near misses (b_double: the stopped line · b_win: a move leaving one jump) never
//    goes down.
//  ⑦⑧ every wrong move: konane/ls-facts.js (what the 2D and the 3D say) = this file's count: b_double 'stop' (the answer's line cut
//    short) or 'other' with what follows the landing square (edge / mine / empty / block); b_win 'left' with the opponent's jumps j
//    and the stones taken c, and the gold jump r is one of the opponent's jumps then, drawn on the problem's board (its stone there,
//    its landing square empty). The ja words (チェッカニ) are taken from the list of that fact and carry its numbers; no 「おしい」 on a
//    0-point move (追66・追68); no evaluation words (追16).
//  ⑨ the 2D: konane/app.js reads the same facts (KonaneLsFacts) for the words and the hint; konane/index.html loads ls-facts.js; every
//    language has the keys (ls.b_double.why / ng.stop / ng.other / hint, ls.b_win.why / ng / ng1 / hint) with {m} and {x}; ng1 names
//    one jump (no {j}: 追58); the warm-up's right move is a legal move of its board and its marks are squares of it (追75).
//  s_count / s_stop (2026-11-25 05:33 担当C, strat()): this file's own exact solve (winsB on the board string) — ① ok = the winning
//    jumps, the warm-ups' 'win' answers too; ② one; ③ 5+ legal, 4+ wrong, 追72; ④ the opponent still has a jump after the answer
//    (not b_win again), 3+ stones can jump = the hint's stones; s_count the answer is the only fewest-jumps move, s_stop the
//    answer's line goes on; ⑥ d = wrong + 2 × near (s_count one jump more than the answer · s_stop the longer jumps of its line);
//    ⑦⑧ every wrong move: the words' j / j0 / c / 'go' (a shorter jump of its line wins) = the board, the gold reply {r} is an
//    opponent's jump after it that wins (you lose then, solved), {e} = your jumps after it, drawn on the problem's board, s_stop
//    'go' says the landed stone is taken iff the reply takes it (and says it whenever some winning reply does); ⑨ the 2D keys
//    ls.s_count.ng.more0/N · ls.s_stop.ng.goS/go/lose 0/N with {r} (and {e} for N) in 14 languages, app.js reads the facts.
//  b_jump (2026-11-27 担当C, strat3()): the opponent has exactly one stone that can jump now (the target) and exactly one jump takes it
//    = the answer = the only winning jump; ⑥ near = wrong moves taking a stone next to the target; ⑦⑧ 'take' j = the opponent's jumps
//    after it, every wrong move 'miss' with the gold reply winning, tgt iff the reply is the target's own jump (used whenever one wins).
//  s_go / s_keep / s_read (2026-11-27 担当C, strat3()): the same exact solve — ① ok = the winning jumps; ② one; ③ 5+ legal, 4+ wrong,
//    追72; ④ the opponent still has a jump after the answer, 3+ stones can jump = the hint's stones; s_go the answer jumps 2+ to the
//    end of its line and the line stopped earlier is among the moves · s_keep some move leaves the opponent fewer jumps than the
//    answer, and every such move leaves you fewer of your own (o) · s_read the opponent has 2+ replies after the answer and some
//    wrong move leaves it as few or fewer; ⑥ d = wrong + 2 × near (s_go the stops of the answer's line · s_keep the moves cutting
//    more · s_read the moves leaving as few or fewer); ⑦⑧ every wrong move: the words' kind (short / cut / fewer / lose) and j, j0,
//    o, o0, c, n = the board, the gold reply {r} wins for the opponent, {e} = your jumps after it, drawn on the problem's board,
//    s_go shortS iff the reply jumps with a stone the full jump would have taken (said whenever some winning reply does); ⑨ the 2D
//    keys ls.s_go.ng.short(S) · ls.s_keep.ng.cut · ls.s_read.ng.fewer · ls.st.lose / tail0 / tailN in 14 languages, app.js reads them.
//  b_open (2026-11-27 担当C, open1()): the board right after the two removals (n = 2 or 3, n empty squares, a position the opening's
//    removals and jumps reach) — ① ok = the only jump leaving the opponent the fewest jumps (this file's count); ② one; ③ relaxed for
//    this lesson (the user 2026-11-27: 「問題が成立する範囲内で基準を緩めて良い」): 3+ legal, 2+ wrong, 追72; ④ 3+ stones can jump =
//    the hint's stones; ⑤ relaxed: the b_open problems are never the same position under the 8 symmetries (the opening has no others),
//    and stay 5+ squares from every other lesson and puzzle; ⑥ d = wrong + 2 × near (one jump more than the answer); ⑦⑧ the answer
//    'few' j / t and every wrong move 'many' j / j0 = the board, the ja words from w.few / n.many with only those numbers, no win
//    claim (the count is a fact, not a solve); ⑨ the 2D keys ls.b_open.why / ng / hint / goal in 14 languages, app.js reads them.
// Usage: node tools/lesson-verify-konane-ls.js [--selftest]   (also run by tools/lesson-verify-konane.js / lesson-verify.js konane)
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const E = require(path.join(ROOT, 'konane/engine.js')), FACTS = require(path.join(ROOT, 'konane/ls-facts.js'));
const LSK = require(path.join(ROOT, 'atlas/ls-konane.js'));
const LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
const D4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];
// this file's jumps on a board string (N×N, 'b' = 1, 'w' = 2): [{ from, to, k (stones taken), dir, path }]
function jumps(b, N, me) {
  const ch = me === 1 ? 'b' : 'w', op = me === 1 ? 'w' : 'b', out = [], at = (r, c) => r < 0 || c < 0 || r >= N || c >= N ? null : b[r * N + c];
  for (let i = 0; i < N * N; i++) if (b[i] === ch) for (const [dr, dc] of D4) {
    let r = (i / N) | 0, c = i % N, k = 0; const p = [i];
    while (at(r + dr, c + dc) === op && at(r + 2 * dr, c + 2 * dc) === '.') { r += 2 * dr; c += 2 * dc; k++; p.push(r * N + c); out.push({ from: i, to: r * N + c, k, dir: [dr, dc], path: p.slice() }); }
  }
  return out;
}
function after(b, N, j, me) { const a = b.split(''); a[j.from] = '.'; for (let x = 1; x < j.path.length; x++) { const m = (j.path[x - 1] + j.path[x]) / 2; a[m] = '.'; } a[j.to] = me === 1 ? 'b' : 'w'; return a.join(''); }
const SYM = N => { const f = []; for (let t = 0; t < 8; t++) f.push((r, c) => { let a = r, b = c; if (t & 4) [a, b] = [b, a]; if (t & 1) a = N - 1 - a; if (t & 2) b = N - 1 - b; return a * N + b; }); return f; };
const symB = (b, f, N, sw) => { const o = Array(N * N).fill('.'); for (let i = 0; i < N * N; i++) { const ch = b[i]; o[f(Math.floor(i / N), i % N)] = ch === 'b' ? (sw ? 'w' : 'b') : ch === 'w' ? (sw ? 'b' : 'w') : '.'; } return o.join(''); };
const diff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };
// (2026-11-25 05:33 担当C) the strategy lessons s_count / s_stop: this file's own exact solve on the board string
const MEMO = new Map();
function winsB(b, N, me) {   // the side to move (me) wins: some jump leaves the other side lost
  const key = b + me; let v = MEMO.get(key); if (v !== undefined) return v;
  v = jumps(b, N, me).some(x => !winsB(after(b, N, x, me), N, 3 - me)); MEMO.set(key, v); return v;
}
const capOf = jj => jj.path.slice(1).map((x, i) => (jj.path[i] + x) / 2);
function strat(id, P, q, add, fact, hintF, JA) {
  const N = 8, me = P.s.side, b = P.s.b, pos = E.Pos.from(P.s), L = pos.moves(), J = jumps(b, N, me), op = 3 - me;
  const mv = jj => L.find(m => E.mFrom(m) === jj.from && E.mTo(m) === jj.to), nm = m => E.name(pos, m);
  if (!(P.ok || []).every(m => L.includes(m)) || !L.includes(P.best)) { add(id, q, '① a right move is not a move of the board'); return 0; }
  const key = x => x.from + '>' + x.to, eng = new Set(L.map(m => E.mFrom(m) + '>' + E.mTo(m)));
  if (J.length !== eng.size || J.some(x => !eng.has(key(x)))) add(id, q, `① the engine's ${eng.size} moves ≠ this file's ${J.length} jumps`);
  const res = J.map(x => { const b2 = after(b, N, x, me); return { x, m: mv(x), b2, win: !winsB(b2, N, op), j: jumps(b2, N, op).length }; });
  const won = res.filter(r => r.win).map(r => r.m).sort((x, y) => x - y), ok = P.ok.slice().sort((x, y) => x - y);
  if (won.join() !== ok.join()) add(id, q, `① ok ${ok.length} move(s) ≠ the ${won.length} winning move(s)`);
  if (!P.ok.includes(P.best)) add(id, q, '① best is not in ok');
  if (P.ok.length !== 1) add(id, q, `② ${P.ok.length} right moves`);
  if (L.length < 5) add(id, q, `③ ${L.length} legal moves`);
  if (L.length - P.ok.length < 4) add(id, q, `③ ${L.length - P.ok.length} wrong moves`);
  if (P.ok.length * 3 > L.length) add(id, q, `追72 ${P.ok.length} right of ${L.length} legal moves (more than 1/3)`);
  const A = res.find(r => r.m === P.best); if (!A) return 0;
  const j0 = Math.min(...res.map(r => r.j)), movers = [...new Set(J.map(x => x.from))].sort((x, y) => x - y);
  if (!A.j) add(id, q, '④ the opponent has no jump after the answer (the b_win lesson again)');
  if (movers.length < 3) add(id, q, `④ ${movers.length} stones can jump (the hint narrows to the answer)`);
  if (hintF(E, id, P.s).slice().sort((x, y) => x - y).join() !== movers.join()) add(id, q, '⑦ the hint\'s stones are not your stones that can jump');
  const sameLine = (a, c) => a.from === c.from && a.dir.join() === c.dir.join();
  let nearN = 0;
  if (id === 's_count') { if (A.j !== j0 || res.filter(r => r.j === j0).length !== 1) add(id, q, `④ the answer leaves ${A.j} jumps, not the only fewest (${j0})`); nearN = res.filter(r => r.m !== P.best && r.j === j0 + 1).length; }
  else { const longer = res.filter(r => sameLine(r.x, A.x) && r.x.k > A.x.k); if (!longer.length) add(id, q, '④ the answer\'s line does not go on (nothing to stop)'); nearN = longer.length; }
  // the answer's words
  const fb = fact(E, id, P.s, P.best);
  if (id === 's_count' && (fb.k !== 'fewest' || fb.j !== A.j)) add(id, q, `⑧ the answer's words say ${fb.k} j=${fb.j}, the board ${A.j}`);
  if (id === 's_stop') { const n = Math.max(...res.filter(r => sameLine(r.x, A.x)).map(r => r.x.k)); if (fb.k !== 'stop' || fb.c !== A.x.k || fb.n !== n) add(id, q, `⑧ the answer's words say ${fb.k} c=${fb.c} n=${fb.n}, the board c=${A.x.k} n=${n}`); }
  const wl = (JA.w || {})[id === 's_count' ? 'fewest' : 'stop'];
  if (!wl || wl.length < 5) add(id, q, `⑧ ${wl ? wl.length : 0} ja right words for 5 problems (a line said twice in a lesson)`);
  if (id === 's_count' && JA.w && JA.w.win && /\{j\}/.test(JA.w.win.join(''))) add(id, q, '⑧ the b_win words (JA.w.win) were replaced');
  for (const t of [].concat(wl || [])) { const x = t.replace(/\{(j|c|n)\}/g, '0'); if (/\{\w+\}/.test(x)) add(id, q, '⑧ ja right words: a placeholder left'); }
  // every wrong move
  for (const r of res) {
    if (r.m === P.best) continue;
    const f = fact(E, id, P.s, r.m), w = nm(r.m);
    if (r.win) continue;
    if (id === 's_count' && (f.k !== 'more' || f.j !== r.j || f.j0 !== j0)) add(id, q, `⑧ ${w}: the words say ${f.k} j=${f.j} j0=${f.j0}, the board j=${r.j} j0=${j0}`);
    if (id === 's_stop') { const go = r.x.k > 1 && res.some(o => o.win && sameLine(o.x, r.x) && o.x.k < r.x.k); if (f.k !== (go ? 'go' : 'lose') || f.c !== r.x.k) add(id, q, `⑧ ${w}: the words say ${f.k} c=${f.c}, the board ${go ? 'go' : 'lose'} c=${r.x.k}`); }
    // the gold reply: one of the opponent's jumps then, it wins (you lose after it), your jumps after it = e, drawn on the problem's board
    const R = jumps(r.b2, N, op), rr = f.r != null && R.find(x => x.from === E.mFrom(f.r) && x.to === E.mTo(f.r));
    if (!rr) { add(id, q, `⑧ ${w}: the gold reply is not one of the opponent's jumps`); continue; }
    const b3 = after(r.b2, N, rr, op);
    if (winsB(b3, N, me)) add(id, q, `⑧ ${w}: after the gold reply you can still win (it is not a refutation)`);
    if (f.e !== jumps(b3, N, me).length) add(id, q, `⑧ ${w}: ${f.e} jumps of yours after the gold reply in the words, ${jumps(b3, N, me).length} on the board`);
    if (!f.draw || b[rr.from] !== (op === 1 ? 'b' : 'w') || b[rr.to] !== '.') add(id, q, `⑧ ${w}: the gold reply cannot be drawn on the problem's board`);
    if (id === 's_stop' && f.k === 'go') { const sp = capOf(rr).includes(r.x.to); if (!!f.spring !== sp) add(id, q, `⑧ ${w}: the words say the landed stone is ${f.spring ? '' : 'not '}taken, the gold reply ${sp ? 'takes' : 'does not take'} it`);
      if (f.k === 'go' && !sp && R.some(x => capOf(x).includes(r.x.to) && !winsB(after(r.b2, N, x, op), N, me))) add(id, q, `⑧ ${w}: a winning reply takes the landed stone, the words do not say so`); }
    const k = LSK.kindOf(f), [h, tl] = k.split('+');
    for (const part of [h, tl]) { const list = (JA.n || {})[part]; if (!list || !list.length) { add(id, q, `⑧ no ja words for ${part}`); continue; }
      for (const t of list) { const x = t.replace(/\{(j|j0|e|c|n)\}/g, '0'); if (/\{\w+\}/.test(x)) add(id, q, `⑧ ja ${part}: a placeholder left`); if (/勝率|評価|見込み/.test(x)) add(id, q, '追16 the words give an evaluation'); } }
    if (tl !== (f.e ? 'tailN' : 'tail0')) add(id, q, `⑧ ${w}: the tail ${tl} for ${f.e} jumps left`);
  }
  return (L.length - P.ok.length) + 2 * nearN;
}
// (2026-11-27 担当C) s_go / s_keep / s_read
function strat3(id, P, q, add, fact, hintF, JA) {
  const N = 8, me = P.s.side, b = P.s.b, pos = E.Pos.from(P.s), L = pos.moves(), J = jumps(b, N, me), op = 3 - me;
  const mv = jj => L.find(m => E.mFrom(m) === jj.from && E.mTo(m) === jj.to), nm = m => E.name(pos, m);
  if (!(P.ok || []).every(m => L.includes(m)) || !L.includes(P.best)) { add(id, q, '① a right move is not a move of the board'); return 0; }
  const key = x => x.from + '>' + x.to, eng = new Set(L.map(m => E.mFrom(m) + '>' + E.mTo(m)));
  if (J.length !== eng.size || J.some(x => !eng.has(key(x)))) add(id, q, `① the engine's ${eng.size} moves ≠ this file's ${J.length} jumps`);
  const res = J.map(x => { const b2 = after(b, N, x, me); return { x, m: mv(x), b2, win: !winsB(b2, N, op), j: jumps(b2, N, op).length, o: jumps(b2, N, me).length }; });
  const won = res.filter(r => r.win).map(r => r.m).sort((x, y) => x - y), ok = P.ok.slice().sort((x, y) => x - y);
  if (won.join() !== ok.join()) add(id, q, `① ok ${ok.length} move(s) ≠ the ${won.length} winning move(s)`);
  if (!P.ok.includes(P.best)) add(id, q, '① best is not in ok');
  if (P.ok.length !== 1) add(id, q, `② ${P.ok.length} right moves`);
  if (L.length < 5) add(id, q, `③ ${L.length} legal moves`);
  if (L.length - P.ok.length < 4) add(id, q, `③ ${L.length - P.ok.length} wrong moves`);
  if (P.ok.length * 3 > L.length) add(id, q, `追72 ${P.ok.length} right of ${L.length} legal moves (more than 1/3)`);
  const A = res.find(r => r.m === P.best); if (!A) return 0;
  const movers = [...new Set(J.map(x => x.from))].sort((x, y) => x - y);
  if (!A.j) add(id, q, '④ the opponent has no jump after the answer (the b_win lesson again)');
  if (movers.length < 3) add(id, q, `④ ${movers.length} stones can jump (the hint narrows to the answer)`);
  if (hintF(E, id, P.s).slice().sort((x, y) => x - y).join() !== movers.join()) add(id, q, '⑦ the hint\'s stones are not your stones that can jump');
  const sameLine = (a, c) => a.from === c.from && a.dir.join() === c.dir.join(), others = res.filter(r => r.m !== P.best);
  let nearN = 0, tgt = -1;
  if (id === 's_go') {
    const line = res.filter(r => sameLine(r.x, A.x));
    if (A.x.k < 2) add(id, q, `④ the answer takes ${A.x.k} (not a jump on to the end)`);
    if (line.some(r => r.x.k > A.x.k)) add(id, q, '④ the answer\'s line goes on further (it does not jump to the end)');
    nearN = line.filter(r => r.x.k < A.x.k).length; if (!nearN) add(id, q, '④ the answer\'s line stopped earlier is not among the moves');
  } else if (id === 's_keep') {
    const cut = others.filter(r => r.j < A.j); nearN = cut.length;
    if (!cut.length) add(id, q, '④ no move leaves the opponent fewer jumps than the answer (the s_count lesson again)');
    if (cut.some(r => r.o >= A.o)) add(id, q, '④ a move cutting the opponent more keeps as many jumps of yours as the answer');
  } else if (id === 'b_jump') {
    // (2026-11-27 担当C) the target: the opponent's only stone that can jump now; the answer is the only jump taking it
    const T = [...new Set(jumps(b, N, op).map(x => x.from))];
    if (T.length !== 1) add(id, q, `④ ${T.length} stones of the opponent can jump now (not one stone to find)`);
    tgt = T.length === 1 ? T[0] : -1;
    const takes = res.filter(r => capOf(r.x).includes(tgt));
    if (!capOf(A.x).includes(tgt)) add(id, q, '④ the answer does not take the opponent\'s stone that can jump');
    if (takes.length !== 1) add(id, q, `④ ${takes.length} jumps take the opponent's stone that can jump`);
    const [tr, tc] = [(tgt / N) | 0, tgt % N];
    nearN = others.filter(r => capOf(r.x).some(x => Math.abs(((x / N) | 0) - tr) + Math.abs(x % N - tc) === 1)).length;
  } else {
    if (A.j < 2) add(id, q, `④ the opponent has ${A.j} reply after the answer (nothing to read out)`);
    nearN = others.filter(r => r.j <= A.j).length; if (!nearN) add(id, q, '④ the answer leaves the opponent the fewest jumps (the s_count lesson again)');
  }
  const fb = fact(E, id, P.s, P.best), wk = { s_go: 'all', s_keep: 'keep', s_read: 'read', b_jump: 'take' }[id];
  if (fb.k !== wk || fb.j !== A.j || fb.c !== A.x.k || (id === 's_keep' && fb.o !== A.o)) add(id, q, `⑧ the answer's words say ${fb.k} j=${fb.j} c=${fb.c} o=${fb.o}, the board j=${A.j} c=${A.x.k} o=${A.o}`);
  const wl = (JA.w || {})[wk];
  if (!wl || wl.length < 5) add(id, q, `⑧ ${wl ? wl.length : 0} ja right words for 5 problems (a line said twice in a lesson)`);
  for (const t of [].concat(wl || [])) { const x = t.replace(/\{(j|c|n|o)\}/g, '0'); if (/\{\w+\}/.test(x)) add(id, q, '⑧ ja right words: a placeholder left'); if (/勝率|評価|見込み/.test(x)) add(id, q, '追16 the words give an evaluation'); }
  for (const r of others) {
    const f = fact(E, id, P.s, r.m), w = nm(r.m);
    const want = id === 's_go' ? (sameLine(r.x, A.x) && r.x.k < A.x.k ? 'short' : 'lose') : id === 's_keep' ? (r.j < A.j ? 'cut' : 'lose') : id === 'b_jump' ? 'miss' : (r.j <= A.j ? 'fewer' : 'lose');
    if (f.k !== want || f.j !== r.j || f.c !== r.x.k) add(id, q, `⑧ ${w}: the words say ${f.k} j=${f.j} c=${f.c}, the board ${want} j=${r.j} c=${r.x.k}`);
    if (want === 'short' && f.n !== A.x.k) add(id, q, `⑧ ${w}: the words say the line goes to ${f.n}, the board ${A.x.k}`);
    if (want === 'cut' && (f.j0 !== A.j || f.o !== r.o || f.o0 !== A.o)) add(id, q, `⑧ ${w}: the words say j0=${f.j0} o=${f.o} o0=${f.o0}, the board ${A.j} ${r.o} ${A.o}`);
    if (want === 'cut' && !(r.o < A.o)) add(id, q, `⑧ ${w}: the words say your jumps drop, the board ${r.o} ≥ ${A.o}`);
    if (want === 'fewer' && f.j0 !== A.j) add(id, q, `⑧ ${w}: the words say j0=${f.j0}, the board ${A.j}`);
    const R = jumps(r.b2, N, op), rr = f.r != null && R.find(x => x.from === E.mFrom(f.r) && x.to === E.mTo(f.r));
    if (!rr) { add(id, q, `⑧ ${w}: the gold reply is not one of the opponent's jumps`); continue; }
    const b3 = after(r.b2, N, rr, op);
    if (winsB(b3, N, me)) add(id, q, `⑧ ${w}: after the gold reply you can still win (it is not a refutation)`);
    if (f.e !== jumps(b3, N, me).length) add(id, q, `⑧ ${w}: ${f.e} jumps of yours after the gold reply in the words, ${jumps(b3, N, me).length} on the board`);
    if (!f.draw || b[rr.from] !== (op === 1 ? 'b' : 'w') || b[rr.to] !== '.') add(id, q, `⑧ ${w}: the gold reply cannot be drawn on the problem's board`);
    if (want === 'short') { const left = capOf(A.x).filter(x => !capOf(r.x).includes(x)), sp = left.includes(rr.from);
      if (!!f.spring !== sp) add(id, q, `⑧ ${w}: the words say the reply jumps ${f.spring ? 'with' : 'without'} a stone left standing, the gold reply ${sp ? 'does' : 'does not'}`);
      if (!sp && R.some(x => left.includes(x.from) && !winsB(after(r.b2, N, x, op), N, me))) add(id, q, `⑧ ${w}: a winning reply jumps with a stone left standing, the words do not say so`); }
    if (id === 'b_jump') { const tg = rr.from === tgt;   // (the words say the stone left standing jumps iff the gold reply is its jump; said whenever such a winning reply can be drawn)
      if (!!f.tgt !== tg) add(id, q, `⑧ ${w}: the words say the reply is ${f.tgt ? '' : 'not '}the target's own jump, the gold reply ${tg ? 'is' : 'is not'}`);
      if (!tg && R.some(x => x.from === tgt && b[x.to] === '.' && !winsB(after(r.b2, N, x, op), N, me))) add(id, q, `⑧ ${w}: the target stone has a winning jump drawn on the board, the words do not use it`); }
    const k = LSK.kindOf(f), [h, tl] = k.split('+');
    for (const part of [h, tl]) { const list = (JA.n || {})[part]; if (!list || !list.length) { add(id, q, `⑧ no ja words for ${part}`); continue; }
      for (const t of list) { const x = t.replace(/\{(j|j0|e|c|n|o|o0)\}/g, '0'); if (/\{\w+\}/.test(x)) add(id, q, `⑧ ja ${part}: a placeholder left`); if (/勝率|評価|見込み/.test(x)) add(id, q, '追16 the words give an evaluation'); } }
    if (tl !== (f.e ? 'tailN' : 'tail0')) add(id, q, `⑧ ${w}: the tail ${tl} for ${f.e} jumps left`);
  }
  return others.length + 2 * nearN;
}
// (2026-11-27 担当C) b_open: the first jumps after the opening removals
let OPEN = null;
function openSet() {   // every board the opening reaches at ply 2 and 3 (removals, then the first jump)
  if (OPEN) return OPEN; OPEN = new Set();
  const go = p => { if (p.ply >= 2) OPEN.add(p.spec().b + p.turn + p.ply); if (p.ply < 3) for (const m of p.moves()) go(p.clone().play(m)); };
  go(new E.Pos()); return OPEN;
}
function open1(id, P, q, add, fact, hintF, JA) {
  const N = 8, me = P.s.side, b = P.s.b, pos = E.Pos.from(P.s), L = pos.moves(), J = jumps(b, N, me), op = 3 - me;
  const mv = jj => L.find(m => E.mFrom(m) === jj.from && E.mTo(m) === jj.to), nm = m => E.name(pos, m);
  if (!(P.ok || []).every(m => L.includes(m)) || !L.includes(P.best)) { add(id, q, '① a right move is not a move of the board'); return 0; }
  const key = x => x.from + '>' + x.to, eng = new Set(L.map(m => E.mFrom(m) + '>' + E.mTo(m)));
  if (J.length !== eng.size || J.some(x => !eng.has(key(x)))) add(id, q, `① the engine's ${eng.size} moves ≠ this file's ${J.length} jumps`);
  const n = P.s.n, holes = b.split('').filter(x => x === '.').length;
  if (!(n === 2 || n === 3) || holes !== n || !openSet().has(b + me + n)) add(id, q, `④ not a position of the first jumps after the removals (n=${n}, ${holes} empty)`);
  const res = J.map(x => ({ x, m: mv(x), j: jumps(after(b, N, x, me), N, op).length })), j0 = Math.min(...res.map(r => r.j));
  const few = res.filter(r => r.j === j0).map(r => r.m).sort((x, y) => x - y), ok = P.ok.slice().sort((x, y) => x - y);
  if (few.join() !== ok.join()) add(id, q, `① ok ${ok.length} move(s) ≠ the ${few.length} leaving the fewest jumps (${j0})`);
  if (!P.ok.includes(P.best)) add(id, q, '① best is not in ok');
  if (P.ok.length !== 1) add(id, q, `② ${P.ok.length} right moves`);
  if (L.length < 3) add(id, q, `③ ${L.length} legal moves (3 needed, relaxed for the opening)`);
  if (L.length - P.ok.length < 2) add(id, q, `③ ${L.length - P.ok.length} wrong moves (2 needed, relaxed for the opening)`);
  if (P.ok.length * 3 > L.length) add(id, q, `追72 ${P.ok.length} right of ${L.length} legal moves (more than 1/3)`);
  const movers = [...new Set(J.map(x => x.from))].sort((x, y) => x - y);
  if (movers.length < 3) add(id, q, `④ ${movers.length} stones can jump (the hint narrows to the answer)`);
  if (hintF(E, id, P.s).slice().sort((x, y) => x - y).join() !== movers.join()) add(id, q, '⑦ the hint\'s stones are not your stones that can jump');
  const A = res.find(r => r.m === P.best); if (!A) return 0;
  const fb = fact(E, id, P.s, P.best);
  if (fb.k !== 'few' || fb.j !== A.j || fb.t !== L.length || fb.c !== A.x.k) add(id, q, `⑧ the answer's words say ${fb.k} j=${fb.j} t=${fb.t}, the board j=${A.j} t=${L.length}`);
  const chk = (list, part, ph) => { if (!list || list.length < 5) { add(id, q, `⑧ ${list ? list.length : 0} ja words for ${part} (5 problems)`); return; }
    for (const t of list) { const x = t.replace(ph, '0'); if (/\{\w+\}/.test(x)) add(id, q, `⑧ ja ${part}: a placeholder left`); if (/勝|負け|勝率|評価|見込み/.test(t)) add(id, q, `追16 ja ${part}: a win claim or an evaluation (the count is the only fact)`); } };
  chk((JA.w || {}).few, 'few', /\{(j|t)\}/g); chk((JA.n || {}).many, 'many', /\{(j|j0)\}/g);
  let nearN = 0;
  for (const r of res) {
    if (r.m === P.best) continue;
    const f = fact(E, id, P.s, r.m);
    if (f.k !== 'many' || f.j !== r.j || f.j0 !== j0 || f.c !== r.x.k) add(id, q, `⑧ ${nm(r.m)}: the words say ${f.k} j=${f.j} j0=${f.j0}, the board j=${r.j} j0=${j0}`);
    if (LSK.kindOf(f) !== 'many') add(id, q, `⑧ ${nm(r.m)}: the ja words are not from n.many`);
    if (r.j === j0 + 1) nearN++;
  }
  return (L.length - P.ok.length) + 2 * nearN;
}
function verify(opt) {
  opt = opt || {};
  const LS = opt.data || JSON.parse(fs.readFileSync(path.join(ROOT, 'konane/lessons.json'), 'utf8'));
  const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'konane/puzzles.json'), 'utf8'));
  const fact = opt.fact || FACTS.fact, hintF = opt.hint || FACTS.hint, JA = opt.ja || LSK.JA, READY = opt.ready || LSK.READY;
  const out = [], add = (id, q, msg) => out.push({ theme: 'lesson ' + id, q, msg });
  E.setRule('s8'); const N = 8, S = SYM(N);
  // ⑤ the pool: every 8×8 lesson problem and every puzzle
  const pool = [];
  LS.steps.forEach(st => (st.problems || []).forEach((P, j) => { if (P.s && P.s.b && P.s.b.length === 64) pool.push({ id: st.id, q: j + 1, b: P.s.b, mine: READY.includes(st.id) }); }));
  PZ.themes.forEach(T => T.puzzles.forEach((P, j) => pool.push({ id: 'puzzle ' + T.id, q: j + 1, b: P.s.b, mine: false })));
  const vars = pool.map(A => A.mine ? S.flatMap(f => [false, true].map(sw => symB(A.b, f, N, sw))) : null);
  for (let a = 0; a < pool.length; a++) if (pool[a].mine) for (let b = 0; b < pool.length; b++) if (b !== a && !(pool[b].mine && b < a)) {
    const op2 = pool[a].id === 'b_open' && pool[b].id === 'b_open', lim = op2 ? 0 : 4;   // (b_open: relaxed to "never the same", 2026-11-27)
    if (vars[a].some(x => diff(pool[b].b, x) <= lim)) add(pool[a].id, pool[a].q, op2 ? `⑤ the same position as b_open #${pool[b].q} under a symmetry` : `⑤ within 4 squares of ${pool[b].id} #${pool[b].q}`);
  }
  const soft = (JA.soft || []).join(' ');
  if (/おしい|惜しい|あと一歩|あと少し|いい線/.test(soft)) add('ja', 0, '追66・追68 a 0-point move is told it was close (JA.soft)');
  for (const id of READY) {
    const st = LS.steps.find(s => s.id === id); if (!st) { add(id, 0, 'not in lessons.json'); continue; }
    const ds = [];
    st.problems.forEach((P, j) => {
      if (id === 'b_open') { ds.push(open1(id, P, j + 1, add, fact, hintF, JA)); return; }
      if (/^(s_(go|keep|read)|b_jump)$/.test(id)) { ds.push(strat3(id, P, j + 1, add, fact, hintF, JA)); return; }
      if (/^s_/.test(id)) { ds.push(strat(id, P, j + 1, add, fact, hintF, JA)); return; }
      const q = j + 1, me = P.s.side, b = P.s.b, pos = E.Pos.from(P.s), L = pos.moves(), J = jumps(b, N, me);
      if (!(P.ok || []).every(m => L.includes(m)) || !L.includes(P.best)) { add(id, q, '① a right move is not a move of the board'); ds.push(0); return; }
      // the engine's moves = this file's jumps
      const key = x => x.from + '>' + x.to, mine = new Set(J.map(key)), eng = new Set(L.map(m => E.mFrom(m) + '>' + E.mTo(m)));
      if (mine.size !== eng.size || [...mine].some(x => !eng.has(x))) add(id, q, `① the engine's ${eng.size} moves ≠ this file's ${mine.size} jumps`);
      const mv = jj => L.find(m => E.mFrom(m) === jj.from && E.mTo(m) === jj.to);
      const goal = id === 'b_double' ? J.filter(x => x.k >= 2) : J.filter(x => !jumps(after(b, N, x, me), N, 3 - me).length);
      const gm = goal.map(mv).sort((x, y) => x - y), ok = (P.ok || []).slice().sort((x, y) => x - y);
      if (gm.join() !== ok.join()) add(id, q, `① ok ${ok.length} move(s) ≠ the ${gm.length} that reach the goal`);
      if (!P.ok.includes(P.best)) add(id, q, '① best is not in ok');
      if (P.ok.length !== 1) add(id, q, `② ${P.ok.length} right moves`);
      const wrong = L.filter(m => !P.ok.includes(m));
      if (L.length < 5) add(id, q, `③ ${L.length} legal moves`);
      if (wrong.length < 4) add(id, q, `③ ${wrong.length} wrong moves`);
      if (P.ok.length * 3 > L.length) add(id, q, `追72 ${P.ok.length} right of ${L.length} legal moves (more than 1/3)`);
      let nearN = 0;
      const ans = J.find(x => mv(x) === P.best);
      for (const m of wrong) {
        const jj = J.find(x => mv(x) === m); if (!jj) continue;
        const f = fact(E, id, P.s, m), k = LSK.kindOf(f);
        if (id === 'b_double') {
          const stop = ans && jj.from === ans.from && jj.dir.join() === ans.dir.join() && jj.k < ans.k;
          if (stop) nearN++;
          const [r, c] = [(jj.to / N) | 0, jj.to % N], [dr, dc] = jj.dir, at = (rr, cc) => rr < 0 || cc < 0 || rr >= N || cc >= N ? null : after(b, N, jj, me)[rr * N + cc];
          const n1 = at(r + dr, c + dc), op = me === 1 ? 'w' : 'b', end = n1 === null ? 'edge' : n1 === '.' ? 'empty' : n1 !== op ? 'mine' : 'block';
          const want = stop ? 'stop' : end;
          if (k !== want) add(id, q, `⑧ ${E.name(pos, m)}: the words say ${k}, the board ${want}`);
          if (f.c !== jj.k) add(id, q, `⑧ ${E.name(pos, m)}: ${f.c} taken in the words, ${jj.k} on the board`);
        } else {
          const b2 = after(b, N, jj, me), oj = jumps(b2, N, 3 - me);
          if (oj.length === 1) nearN++;
          if (f.k !== 'left' || f.j !== oj.length || f.c !== jj.k) add(id, q, `⑧ ${E.name(pos, m)}: the words say ${f.k} j=${f.j} c=${f.c}, the board j=${oj.length} c=${jj.k}`);
          if (f.r == null || !oj.some(x => x.from === E.mFrom(f.r) && x.to === E.mTo(f.r))) add(id, q, `⑧ ${E.name(pos, m)}: the gold mark is not one of the opponent's jumps`);
          else if (b[E.mFrom(f.r)] !== (me === 1 ? 'w' : 'b') || b[E.mTo(f.r)] !== '.') add(id, q, `⑧ ${E.name(pos, m)}: the gold jump cannot be drawn on the problem's board`);
        }
        // the ja words: from the list of that fact, with its numbers
        const list = (JA.n || {})[k];
        if (!list || !list.length) add(id, q, `⑧ no ja words for ${k}`);
        else for (const t of list) { const x = t.replace(/\{j\}/g, f.j).replace(/\{c\}/g, f.c); if (/\{\w+\}/.test(x)) add(id, q, `⑧ ja ${k}: a placeholder left`); if (/勝率|評価|見込み/.test(x)) add(id, q, '追16 the words give an evaluation'); if (k === 'left1' && /\{j\}/.test(t)) add(id, q, '追58 ja left1 counts {j}'); }
      }
      // the answer's words, ④ the theme, the hint
      const fb = fact(E, id, P.s, P.best), hp = hintF(E, id, P.s);
      if (id === 'b_double') {
        if (!ans || ans.k < 2) add(id, q, '④ the answer takes fewer than 2');
        if (fb.k !== 'most' || fb.n !== (ans && ans.k)) add(id, q, `⑧ the answer's words say ${fb.k} ${fb.n}`);
        if (!nearN) add(id, q, '④ the answer\'s line stopped after 1 is not among the moves');
        const fr = [...new Set(J.map(x => x.from))].sort((x, y) => x - y);
        if (fr.length < 3) add(id, q, `④ ${fr.length} stones can jump (the hint narrows to the answer)`);
        if (hp.slice().sort((x, y) => x - y).join() !== fr.join()) add(id, q, '⑦ the hint\'s stones are not the stones that can jump');
      } else {
        const now = jumps(b, N, 3 - me);
        if (fb.k !== 'win' || fb.t !== now.length) add(id, q, `⑧ the answer's words say ${fb.k} t=${fb.t}, the opponent had ${now.length}`);
        if (now.length < 2) add(id, q, `④ the opponent has ${now.length} jump(s) now`);
        if (!nearN) add(id, q, '④ no wrong move leaves a single jump');
        const fr = [...new Set(now.map(x => x.from))].sort((x, y) => x - y);
        if (hp.slice().sort((x, y) => x - y).join() !== fr.join()) add(id, q, '⑦ the hint\'s stones are not the opponent\'s stones that can jump');
      }
      ds.push(wrong.length + 2 * nearN);
    });
    for (let i = 1; i < ds.length; i++) if (ds[i] < ds[i - 1]) add(id, i + 1, `⑥ d ${ds[i]} < the one before ${ds[i - 1]}`);
    // the warm-ups (2D only): the right move is a move of the board, the marks are its squares
    (st.ramp || []).forEach((r, i) => { if (r.k !== 'try') return; const n = Math.round(Math.sqrt(r.s.b.length)); E.setRule(n === 6 ? 's6' : n === 10 ? 's10' : 's8'); const p = E.Pos.from(r.s), nm = p.moves().map(m => E.name(p, m));
      (r.ok || []).forEach(o => { if (!nm.includes(o)) add(id, -(i + 1), `追75 warm-up ${i + 1}: the right move ${o} is not a move of its board`); });
      if (r.rule === 'win') { const J6 = jumps(r.s.b, n, r.s.side), w6 = J6.filter(x => !winsB(after(r.s.b, n, x, r.s.side), n, 3 - r.s.side)).map(x => E.name(p, p.moves().find(m => E.mFrom(m) === x.from && E.mTo(m) === x.to))).sort();
        if (w6.join() !== (r.ok || []).slice().sort().join()) add(id, -(i + 1), `① warm-up ${i + 1}: right ${(r.ok || []).join(' ')} ≠ the winning ${w6.join(' ')}`); }
      if (!(r.look || []).length) add(id, -(i + 1), `追75 warm-up ${i + 1}: the second hint lights nothing`);
      (r.look || []).forEach(x => { if (!(x >= 1 && x <= r.s.b.length) || r.s.b[x - 1] === '.') add(id, -(i + 1), `追75 warm-up ${i + 1}: the mark ${x} is not a stone`); });
      E.setRule('s8'); });
  }
  // ⑨ the 2D
  if (!opt.no2d) {
    const app = opt.app != null ? opt.app : fs.readFileSync(path.join(ROOT, 'konane/app.js'), 'utf8'), html = fs.readFileSync(path.join(ROOT, 'konane/index.html'), 'utf8');
    if (!/KonaneLsFacts\.fact\(E, s\.id, P\.s, m\)/.test(app)) add('2D', 0, '⑨ konane/app.js does not read the facts for the words (okAnswer)');
    if (!/KonaneLsFacts\.hint\(E, s\.id, P\.s\)/.test(app)) add('2D', 0, '⑨ konane/app.js does not light the hint\'s stones (KonaneLsFacts.hint)');
    if (!/<script src="ls-facts\.js/.test(html)) add('2D', 0, '⑨ konane/index.html does not load ls-facts.js');
    const I = {}; LANGS.forEach(l => { I[l] = {}; });
    for (const f of ['i18n-kn.js', 'i18n-kn-more.js']) { try { new Function('window', 'I18N', fs.readFileSync(path.join(ROOT, 'konane', f), 'utf8'))({ I18N: I }, I); } catch (e) { add('2D', 0, '⑨ i18n: ' + e.message); } }
    if (!/s_count\|s_stop|s_\(count\|stop[|)]/.test(app)) add('2D', 0, '⑨ konane/app.js does not read the facts for s_count / s_stop');
    if (!/s_\(count\|stop\|go\|keep\|read\)/.test(app) || !/ls\.st\.tailN/.test(app)) add('2D', 0, '⑨ konane/app.js does not read the facts for s_go / s_keep / s_read');
    if (!/b_\(open\|double\|win\|jump\)/.test(app) || !/'missT'/.test(app)) add('2D', 0, '⑨ konane/app.js does not read the facts for b_jump');
    const need = { 'ls.s_count.why': ['{m}', '{j}'], 'ls.s_count.ng.more0': ['{m}', '{x}', '{j}', '{j0}', '{r}'], 'ls.s_count.ng.moreN': ['{m}', '{x}', '{j}', '{j0}', '{r}', '{e}'], 'ls.s_count.hint': [],
      'ls.s_stop.why': ['{m}'], 'ls.s_stop.hint': [], ...Object.fromEntries(['goS', 'go', 'lose'].flatMap(h => [['ls.s_stop.ng.' + h + '0', ['{m}', '{x}', '{r}']], ['ls.s_stop.ng.' + h + 'N', ['{m}', '{x}', '{r}', '{e}']]])),
      'ls.s_go.why': ['{m}'], 'ls.s_go.hint': [], 'ls.s_go.ng.short': ['{x}', '{c}', '{n}', '{m}', '{r}'], 'ls.s_go.ng.shortS': ['{x}', '{r}'],
      'ls.s_keep.why': ['{m}', '{j}', '{o}'], 'ls.s_keep.hint': [], 'ls.s_keep.ng.cut': ['{x}', '{j}', '{j0}', '{o}', '{o0}', '{m}', '{r}'],
      'ls.s_read.why': ['{m}', '{j}'], 'ls.s_read.hint': [], 'ls.s_read.ng.fewer': ['{x}', '{j}', '{j0}', '{m}', '{r}'],
      'ls.b_open.why': ['{m}', '{j}'], 'ls.b_open.ng': ['{x}', '{j}', '{m}', '{j0}'], 'ls.b_open.hint': [], 'ls.b_open.goal': [], 'ls.b_jump.why': ['{m}', '{j}'], 'ls.b_jump.hint': [], 'ls.b_jump.goal': [], 'ls.b_jump.ng.miss': ['{x}', '{r}'], 'ls.b_jump.ng.missT': ['{x}', '{r}'],
      'ls.st.lose': ['{x}', '{r}'], 'ls.st.tail0': ['{m}'], 'ls.st.tailN': ['{m}', '{e}'],
      'ls.b_double.why': ['{m}'], 'ls.b_double.ng.stop': ['{m}', '{x}'], 'ls.b_double.ng.other': ['{m}', '{x}'], 'ls.b_double.hint': [], 'ls.b_win.why': ['{m}'], 'ls.b_win.ng': ['{m}', '{x}', '{j}'], 'ls.b_win.ng1': ['{m}', '{x}'], 'ls.b_win.hint': [] };
    for (const l of LANGS) for (const [k, ph] of Object.entries(need)) { const x = (opt.i18n || I)[l][k]; if (!x) { add('2D', 0, `⑨ ${l}: no ${k}`); continue; } ph.forEach(p => { if (!x.includes(p)) add('2D', 0, `⑨ ${l}: ${k} has no ${p}`); }); if (k === 'ls.b_win.ng1' && /\{j\}/.test(x)) add('2D', 0, `追58 ${l}: ${k} counts {j}`); }
  }
  return { out, total: READY.reduce((a, id) => a + ((LS.steps.find(s => s.id === id) || {}).problems || []).length, 0) };
}
function selftest() {
  const base = JSON.parse(fs.readFileSync(path.join(ROOT, 'konane/lessons.json'), 'utf8')), clone = () => JSON.parse(JSON.stringify(base));
  const st = (d, id) => d.steps.find(s => s.id === id);
  const cases = [
    ['the answer changed (①)', d => { const P = st(d, 'b_win').problems[1]; const p = E.Pos.from(P.s); const w = p.moves().find(m => m !== P.best); P.best = w; P.ok = [w]; }, /^①/],
    ['a second right move (②)', d => { const P = st(d, 'b_double').problems[0]; const p = E.Pos.from(P.s); P.ok.push(p.moves().find(m => m !== P.best)); }, /^[①②]/],
    ['order reversed (⑥)', d => { st(d, 'b_double').problems.reverse(); }, /^⑥/],
    ['a duplicate, mirrored and colours swapped (⑤)', d => { const P = st(d, 'b_win').problems[0], b = P.s.b; let o = ''; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const ch = b[r * 8 + 7 - c]; o += ch === 'b' ? 'w' : ch === 'w' ? 'b' : '.'; } st(d, 'b_double').problems[4].s.b = o; }, /^⑤/],
    ['the words say a wrong kind (⑧)', null, /^⑧/, { fact: (E2, id, s, m) => { const f = FACTS.fact(E2, id, s, m); return f.k === 'other' ? Object.assign({}, f, { end: f.end === 'edge' ? 'empty' : 'edge' }) : f; } }],
    ['the jumps left counted wrong (⑧)', null, /^⑧/, { fact: (E2, id, s, m) => { const f = FACTS.fact(E2, id, s, m); return f.k === 'left' ? Object.assign({}, f, { j: f.j + 1 }) : f; } }],
    ['the hint lights the answer only (⑦)', null, /^⑦/, { hint: (E2, id, s) => [E2.mFrom(st(base, id).problems.find(P => P.s === s || P.s.b === s.b).best)] }],
    ['a warm-up answer that is no move (追75)', d => { st(d, 'b_win').ramp[0].ok = ['h6-f6-d6-b6']; }, /^追75/],
    ['s_count: the answer changed to a losing move (①)', d => { const P = st(d, 's_count').problems[2]; const p = E.Pos.from(P.s); const w = p.moves().find(m => m !== P.best); P.best = w; P.ok = [w]; }, /^①/],
    ['s_stop: order reversed (⑥)', d => { st(d, 's_stop').problems.reverse(); }, /^⑥/],
    ['s_stop: a duplicate of a b_win problem, rotated (⑤)', d => { const b = st(d, 'b_win').problems[2].s.b; let o = ''; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) o += b[c * 8 + r]; st(d, 's_stop').problems[1].s.b = o; }, /^⑤/],
    ['s_count: the opponent\'s jumps counted wrong (⑧)', null, /^⑧/, { fact: (E2, id, s, m) => { const f = FACTS.fact(E2, id, s, m); return f.k === 'more' ? Object.assign({}, f, { j: f.j - 1 }) : f; } }],
    ['s_count: your jumps after the gold reply wrong (⑧)', null, /^⑧/, { fact: (E2, id, s, m) => { const f = FACTS.fact(E2, id, s, m); return f.k === 'more' ? Object.assign({}, f, { e: f.e + 1 }) : f; } }],
    ['s_stop: the gold reply is not a refutation (⑧)', null, /^⑧/, { fact: (E2, id, s, m) => { const f = FACTS.fact(E2, id, s, m); if (f.k !== 'lose') return f; const q = E2.Pos.from(s).play(m), o = q.moves().find(r => FACTS.wins(q.clone().play(r))); return o != null ? Object.assign({}, f, { r: o }) : f; } }],
    ['s_stop: the landed stone said not taken (⑧)', null, /^⑧/, { fact: (E2, id, s, m) => { const f = FACTS.fact(E2, id, s, m); return f.k === 'go' ? Object.assign({}, f, { spring: !f.spring }) : f; } }],
    ['s_count: the hint lights the answer only (⑦)', null, /^[④⑦]/, { hint: (E2, id, s) => id === 's_count' ? [E2.mFrom(st(base, id).problems.find(P => P.s.b === s.b).best)] : FACTS.hint(E2, id, s) }],
    ['s_stop: a warm-up answer not the winning set (①)', d => { const r = st(d, 's_stop').ramp.find(x => x.k === 'try'); r.ok = r.ok.slice(0, 1); }, /^① warm-up/],
    ['a language without s_stop.ng.goSN (⑨)', null, /^⑨/, { i18n: (() => { const I = {}; LANGS.forEach(l => { I[l] = {}; }); for (const f of ['i18n-kn.js', 'i18n-kn-more.js']) new Function('window', 'I18N', fs.readFileSync(path.join(ROOT, 'konane', f), 'utf8'))({ I18N: I }, I); delete I.fr['ls.s_stop.ng.goSN']; return I; })() }],
    ['s_go: the answer changed to a stop of its line (①)', d => { const P = st(d, 's_go').problems[0]; const p = E.Pos.from(P.s); const w = p.moves().find(m => m !== P.best && E.mFrom(m) === E.mFrom(P.best)); P.best = w; P.ok = [w]; }, /^①/],
    ['s_keep: order reversed (⑥)', d => { st(d, 's_keep').problems.reverse(); }, /^⑥/],
    ['s_read: a duplicate of an s_go problem, mirrored (⑤)', d => { const b = st(d, 's_go').problems[2].s.b; let o = ''; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) o += b[(7 - r) * 8 + c]; st(d, 's_read').problems[1].s.b = o; }, /^⑤/],
    ['s_go: the stone left standing said wrong (⑧)', null, /^⑧/, { fact: (E2, id, s, m) => { const f = FACTS.fact(E2, id, s, m); return f.k === 'short' ? Object.assign({}, f, { spring: !f.spring }) : f; } }],
    ['s_keep: your jumps after a cut counted wrong (⑧)', null, /^⑧/, { fact: (E2, id, s, m) => { const f = FACTS.fact(E2, id, s, m); return f.k === 'cut' ? Object.assign({}, f, { o: f.o + 1 }) : f; } }],
    ['s_read: a fewer move told as lose (⑧)', null, /^⑧/, { fact: (E2, id, s, m) => { const f = FACTS.fact(E2, id, s, m); return f.k === 'fewer' ? Object.assign({}, f, { k: 'lose' }) : f; } }],
    ['s_read: the gold reply is not a refutation (⑧)', null, /^⑧/, { fact: (E2, id, s, m) => { const f = FACTS.fact(E2, id, s, m); if (id !== 's_read' || f.k === 'read') return f; const q = E2.Pos.from(s).play(m), o = q.moves().find(r => FACTS.wins(q.clone().play(r))); return o != null ? Object.assign({}, f, { r: o }) : f; } }],
    ['s_go: a warm-up answer that is no move (追75)', d => { st(d, 's_go').ramp.find(x => x.k === 'try').ok = ['g6-e6-c6', 'b5-b7']; }, /^(追75|① warm-up)/],
    ['a language without ls.st.tailN (⑨)', null, /^⑨/, { i18n: (() => { const I = {}; LANGS.forEach(l => { I[l] = {}; }); for (const f of ['i18n-kn.js', 'i18n-kn-more.js']) new Function('window', 'I18N', fs.readFileSync(path.join(ROOT, 'konane', f), 'utf8'))({ I18N: I }, I); delete I.ko['ls.st.tailN']; return I; })() }],
    ['「おしい」 for 0 points (追66)', null, /^追66/, { ja: Object.assign({}, LSK.JA, { soft: ['おしい！'] }) }],
    ['the 2D words without the facts (⑨)', null, /^⑨/, { app: 'function okAnswer() {}' }],
    // (2026-11-27 担当C) b_jump
    ['b_jump: the answer changed to a move not taking the target (①④)', d => { const P = st(d, 'b_jump').problems[2]; const p = E.Pos.from(P.s); const w = p.moves().find(m => m !== P.best); P.best = w; P.ok = [w]; }, /^[①④]/],
    ['b_jump: every jump right (the old lesson, ②追72)', d => { const P = st(d, 'b_jump').problems[0]; P.ok = E.Pos.from(P.s).moves(); }, /^(②|追72)/],
    ['b_jump: a problem where two enemy stones can jump (④)', d => { st(d, 'b_jump').problems[1] = JSON.parse(JSON.stringify(st(base, 'b_win').problems[0])); }, /^④/],
    ['b_jump: the target\'s own reply told as another (⑧)', null, /^⑧/, { fact: (E2, id, s, m) => { const f = FACTS.fact(E2, id, s, m); return id === 'b_jump' && f.k === 'miss' ? Object.assign({}, f, { tgt: !f.tgt }) : f; } }],
    ['b_jump: the jumps left after the answer counted wrong (⑧)', null, /^⑧/, { fact: (E2, id, s, m) => { const f = FACTS.fact(E2, id, s, m); return id === 'b_jump' && f.k === 'take' ? Object.assign({}, f, { j: f.j + 1 }) : f; } }],
    ['b_jump: the 2D without missT (⑨)', null, /^⑨/, { app: fs.readFileSync(path.join(ROOT, 'konane/app.js'), 'utf8').replace(/'missT'/g, "'miss'") }],
    ['b_jump: a language without ng.missT (⑨)', null, /^⑨/, { i18n: (() => { const I = {}; LANGS.forEach(l => { I[l] = {}; }); for (const f of ['i18n-kn.js', 'i18n-kn-more.js']) new Function('window', 'I18N', fs.readFileSync(path.join(ROOT, 'konane', f), 'utf8'))({ I18N: I }, I); delete I.tr['ls.b_jump.ng.missT']; return I; })() }],
    // (2026-11-27 担当C) b_open
    ['b_open: the answer changed (①)', d => { const P = st(d, 'b_open').problems[3]; const p = E.Pos.from(P.s); const w = p.moves().find(m => m !== P.best); P.best = w; P.ok = [w]; }, /^①/],
    ['b_open: every jump right (the old lesson, ②追72)', d => { const P = st(d, 'b_open').problems[1]; P.ok = E.Pos.from(P.s).moves(); }, /^(①|②|追72)/],
    ['b_open: order reversed (⑥)', d => { st(d, 'b_open').problems.reverse(); }, /^⑥/],
    ['b_open: the same class twice, mirrored (⑤)', d => { const pr = st(d, 'b_open').problems, b = pr[1].s.b; let o = ''; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) o += b[(7 - c) * 8 + (7 - r)]; pr[2] = JSON.parse(JSON.stringify(pr[1])); pr[2].s.b = o; }, /^⑤/],
    ['b_open: a position the opening never reaches (④)', d => { const P = st(d, 'b_open').problems[4]; P.s = Object.assign({}, P.s, { n: 4 }); }, /^④/],
    ['b_open: the opponent\'s jumps counted wrong (⑧)', null, /^⑧/, { fact: (E2, id, s, m) => { const f = FACTS.fact(E2, id, s, m); return id === 'b_open' && f.k === 'many' ? Object.assign({}, f, { j: f.j + 1 }) : f; } }],
    ['b_open: a win claimed in the words (追16)', null, /^追16/, { ja: Object.assign({}, LSK.JA, { w: Object.assign({}, LSK.JA.w, { few: LSK.JA.w.few.map(t => t + 'これで勝ちだ！') }) }) }],
    ['b_open: a language without ng (⑨)', null, /^⑨/, { i18n: (() => { const I = {}; LANGS.forEach(l => { I[l] = {}; }); for (const f of ['i18n-kn.js', 'i18n-kn-more.js']) new Function('window', 'I18N', fs.readFileSync(path.join(ROOT, 'konane', f), 'utf8'))({ I18N: I }, I); delete I.id['ls.b_open.ng']; return I; })() }],
    ['a language without ng1 (⑨)', null, /^⑨/, { i18n: (() => { const I = {}; LANGS.forEach(l => { I[l] = {}; }); for (const f of ['i18n-kn.js', 'i18n-kn-more.js']) new Function('window', 'I18N', fs.readFileSync(path.join(ROOT, 'konane', f), 'utf8'))({ I18N: I }, I); delete I.de['ls.b_win.ng1']; return I; })() }],
  ];
  let ok = 0; const key = x => x.theme + '#' + x.q + ' ' + x.msg, base0 = new Set(verify({ data: clone() }).out.map(key));
  for (const [name, f, re, o] of cases) { const d = clone(); if (f) f(d); const r = verify(Object.assign({ data: d }, o || {})); const hit = r.out.some(x => re.test(x.msg) && !base0.has(key(x))); console.log((hit ? 'caught ' : 'MISSED ') + name); if (hit) ok++; }
  console.log(`selftest (lessons) ${ok}/${cases.length}`); return ok === cases.length;
}
module.exports = { verify, selftest, jumps };
if (require.main === module) {
  if (process.argv.includes('--selftest')) process.exit(selftest() ? 0 : 1);
  const r = verify();
  for (const o of r.out) console.log(`${o.theme} #${o.q}: ${o.msg}`);
  console.log(`${r.out.length ? 'NG' : 'OK'} konane lessons (${LSK.READY.join(', ')}): ${r.total} problems, ${r.out.length} findings`);
  process.exit(r.out.length ? 1 : 0);
}
