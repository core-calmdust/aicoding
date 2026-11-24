#!/usr/bin/env node
// (2026-11-24 担当C) Kōnane on the 3D table: the puzzles (konane/puzzles.json; 2D konane/app.js puzzleMove, 3D atlas/puzzles.js
// BOOK.konane) checked with an exact solver of this file (its own recursion over the engine's move generator: the goal = after the
// attacker's move the opponent has no jump) against the engine's duelGood (what the 2D and the 3D accept).
// Every puzzle, ①〜⑨ and 追1〜 (claude/lesson-quality.md):
//  ① n is exact: the side to move wins within n of its moves whatever the reply, and not within n−1; the engine's duelGood = the
//    strict set of first moves.
//  ② the set of winning first moves has 2 moves at most (both are accepted).
//  ③ 4 legal moves or more, 3 wrong first moves or more; 追72 the winning first moves ≤ 1/3 of the legal moves.
//  ④ the theme: w1…w5 = n; stop = every winning move stops a jump line that could go on, and every longer jump of that line loses;
//    chain = every winning move is a multiple jump and every shorter jump of that line loses. The collection's promise (pz.desc: "the
//    move that leaves the fewest jumps is not enough", n ≥ 2): some move that leaves the opponent the fewest jumps right now loses.
//  ⑤ no two positions (all the puzzles, the lesson problems and ramps on 8×8) within 4 squares of each other under the 8 symmetries
//    of the square, with the colours as they are or swapped.
//  ⑥ easy → hard: d = the near misses (wrong first moves refuted by 1 or 2 replies only) × 2 + the wrong first moves; each theme in
//    10-puzzle stages: each stage's mean d at least the one before's, the last stage's mean above the first's.
//  ⑦⑧ every stage of the line (追13: the answer's first winning move, the defender's E.duelReply): every wrong move — the last move:
//    the opponent can still jump (the words 'last' with that count); before it: the reply the 2D and the 3D play (E.duelReply) leaves
//    no win within the moves left, and the 3D words (atlas/games/konane-pz.js why()) name the board: the attacker left without a jump
//    (stuck) or the opponent's jumps still left (far, {j}), the stones the reply took ({k}). No evaluation words (追16).
//  ⑨ the 2D says the same facts after a move off the solution (konane/app.js pzWhy, pz.why.* in 14 languages), never takes the move
//    back nor shows the right move by itself (the 詰め rule of the addendum).
// Usage: node tools/lesson-verify-konane.js [--json out.json] [--file puzzles.json] [--selftest]   (also: node tools/lesson-verify.js konane)
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const E = require(path.join(ROOT, 'konane/engine.js'));
const LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
let memo = new Map();
const K = (p, k, t) => p.h1 + ':' + p.h2 + ':' + p.side + ':' + k + t;
// me to move: wins within k own moves (after one of them the opponent has no jump)?
function att(p, k, me) {
  const key = K(p, k, 'a'); if (memo.has(key)) return memo.get(key);
  let r = false;
  for (const m of p.moves()) { const q = p.clone().play(m); if (!q.mobility(3 - me) || (k > 1 && def(q, k - 1, me))) { r = true; break; } }
  memo.set(key, r); return r;
}
// the opponent to move (it has a jump): every reply still loses within k?
function def(p, k, me) {
  const key = K(p, k, 'd'); if (memo.has(key)) return memo.get(key);
  let r = true;
  for (const m of p.moves()) { const q = p.clone().play(m); if (!q.mobility(me) || !att(q, k, me)) { r = false; break; } }
  memo.set(key, r); return r;
}
const goodSet = (p, k, me) => p.moves().filter(m => { const q = p.clone().play(m); return !q.mobility(3 - me) || (k > 1 && def(q, k - 1, me)); });
const refutes = (p, m, k, me) => { const q = p.clone().play(m); let n = 0; for (const r of q.moves()) { const z = q.clone().play(r); if (!z.mobility(me) || k <= 1 || !att(z, k - 1, me)) n++; } return n; };
const THEME = { w1: 1, w2: 2, w3: 3, w4: 4, w5: 5 };
// the 8 symmetries of the N×N square
const SYM = N => { const f = []; for (let t = 0; t < 8; t++) f.push((r, c) => { let a = r, b = c; if (t & 4) [a, b] = [b, a]; if (t & 1) a = N - 1 - a; if (t & 2) b = N - 1 - b; return a * N + b; }); return f; };
const symB = (b, f, N, sw) => { const o = Array(N * N).fill('.'); for (let i = 0; i < N * N; i++) { const ch = b[i]; o[f(Math.floor(i / N), i % N)] = ch === 'b' ? (sw ? 'w' : 'b') : ch === 'w' ? (sw ? 'b' : 'w') : '.'; } return o.join(''); };
const diff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if ((a[i] === '.' ? '.' : a[i]) !== (b[i] === '.' ? '.' : b[i])) n++; return n; };
function verify(opt) {
  opt = opt || {};
  const PZ = opt.data || JSON.parse(fs.readFileSync(opt.file || path.join(ROOT, 'konane/puzzles.json'), 'utf8'));
  const LS = JSON.parse(fs.readFileSync(path.join(ROOT, 'konane/lessons.json'), 'utf8'));
  const KPZ = require(path.join(ROOT, 'atlas/games/konane-pz.js')), WHY = opt.why || KPZ.why, REPLY = opt.reply || ((mid, left) => E.duelReply(mid.spec(), [], left).move);
  const out = [], rows = [];
  const add = (id, j, m) => out.push({ theme: id, q: j + 1, msg: m });
  const rule = PZ.rule || 's8'; E.setRule(rule); const N = rule === 's6' ? 6 : rule === 's10' ? 10 : 8, S = SYM(N);
  // ⑤ the pool: every puzzle + every lesson problem / ramp of the same size
  const pool = [];
  PZ.themes.forEach(T => T.puzzles.forEach((P, j) => pool.push({ tag: T.id + '#' + (j + 1), b: P.s.b })));
  (LS.steps || []).forEach(st => [...(st.problems || []), ...(Array.isArray(st.ramp) ? st.ramp : [])].forEach((P, j) => { const b = P && (P.s ? P.s.b : P.b); if (typeof b === 'string' && b.length === N * N) pool.push({ tag: 'lesson ' + st.id + '#' + (j + 1), b }); }));
  const vars = pool.map(A => { const v = []; for (const f of S) for (const sw of [false, true]) v.push(symB(A.b, f, N, sw)); return v; });
  for (let a = 0; a < pool.length; a++) for (let b = a + 1; b < pool.length; b++) {
    const A = pool[a], B = pool[b]; if (/^lesson/.test(A.tag) && /^lesson/.test(B.tag)) continue;
    if (vars[b].some(x => diff(A.b, x) <= 4)) { const P = /^lesson/.test(A.tag) ? B : A, O = P === A ? B : A, [id, q] = P.tag.split('#'); add(id, +q - 1, `⑤ within 4 squares of ${O.tag}`); }
  }
  for (const T of PZ.themes) {
    const tn = THEME[T.id], tac = T.id === 'stop' || T.id === 'chain';
    if (!tn && !tac) { add(T.id, -1, '④ unknown theme'); continue; }
    const ds = [];
    T.puzzles.forEach((P, j) => {
      const pos = E.Pos.from(P.s), me = pos.turn; memo = new Map();
      const r = { theme: T.id, j, ok: true };
      if (tn && P.n !== tn) add(T.id, j, `④ n ${P.n} ≠ the theme's ${tn}`);
      if (tac && !(P.n >= 2 && P.n <= 5)) add(T.id, j, `④ n ${P.n}: the themes stop / chain are 2–5`);
      const L = pos.moves(), good = goodSet(pos, P.n, me), less = P.n > 1 ? goodSet(pos, P.n - 1, me) : [];
      if (!good.length) add(T.id, j, `① no win within ${P.n}`);
      if (less.length) add(T.id, j, `① already a win within ${P.n - 1}`);
      const eng = E.duelGood(P.s, [], P.n, rule) || [];
      if (!(eng.length === good.length && eng.every(m => good.includes(m)))) add(T.id, j, `①⑨ the engine accepts ${eng.length} first moves, the strict solver ${good.length}`);
      if (good.length > 2) add(T.id, j, `② ${good.length} first moves win`);
      const wrong = L.filter(m => !good.includes(m));
      if (L.length < 4) add(T.id, j, `③ ${L.length} legal moves`);
      if (wrong.length < 3) add(T.id, j, `③ ${wrong.length} wrong first moves`);
      if (good.length * 3 > L.length) add(T.id, j, `追72 ${good.length} right first moves of ${L.length} legal moves (more than 1/3)`);
      // ④ the theme's means, the collection's promise
      for (const w of good) {
        const p1 = E.path(pos, w)[1], same = L.filter(x => x !== w && E.mFrom(x) === E.mFrom(w) && E.path(pos, x)[1] === p1);
        if (T.id === 'stop') { const lo = same.filter(x => E.hops(x) > E.hops(w)); if (!lo.length || lo.some(x => good.includes(x))) add(T.id, j, `④ stop: ${E.name(pos, w)} is not a stop that wins where going on loses`); }
        if (T.id === 'chain') { const sh = same.filter(x => E.hops(x) < E.hops(w)); if (E.hops(w) < 2 || !sh.length || sh.some(x => good.includes(x))) add(T.id, j, `④ chain: ${E.name(pos, w)} is not a multiple jump that wins where stopping loses`); }
      }
      if (P.n > 1) { const mob = L.map(m => pos.clone().play(m).mobility(3 - me)), mn = Math.min(...mob); if (L.filter((m, i) => mob[i] === mn).every(m => good.includes(m))) add(T.id, j, '④ the move that leaves the fewest jumps wins (pz.desc says it is not enough)'); }
      let near = 0; for (const m of wrong) if (refutes(pos, m, P.n, me) <= 2) near++;
      const d = near * 2 + wrong.length; ds.push(d); Object.assign(r, { d, near, legal: L.length, good: good.length });
      // ⑦⑧ every stage of the line
      let cur = pos;
      for (let used = 0; used < P.n; used++) {
        const left = P.n - used, g2 = used ? goodSet(cur, left, me) : good;
        if (!g2.length) { add(T.id, j, `① the line breaks at stage ${used + 1}`); break; }
        for (const m of cur.moves().filter(x => !g2.includes(x))) {
          const q = cur.clone().play(m);
          if (left <= 1) {
            if (!q.mobility(3 - me)) { add(T.id, j, `⑧ stage ${used + 1}: ${E.name(cur, m)} wins but is not accepted`); continue; }
            const w = WHY({ last: true, mid: q, me, E, j: 0 });
            if (!w || w.k !== 'last' || w.v.j !== q.mobility(3 - me)) add(T.id, j, `⑧ stage ${used + 1}: the last-move words for ${E.name(cur, m)} say ${w && w.v && w.v.j} jumps, the board ${q.mobility(3 - me)}`);
            continue;
          }
          const rep = REPLY(q, left - 1);
          if (rep == null || rep < 0) { add(T.id, j, `⑦ stage ${used + 1}: no reply after ${E.name(cur, m)}`); continue; }
          const z = q.clone().play(rep);
          if (z.mobility(me) && att(z, left - 1, me)) add(T.id, j, `⑦ stage ${used + 1}: after ${E.name(cur, m)} and the reply ${E.name(q, rep)} the win is still within ${left - 1}`);
          const w = WHY({ mid: q, after: z, reply: rep, left: left - 1, me, E, j: 0 });
          const fact = z.mobility(me) ? 'far' : 'stuck', k = E.captured(q, rep).length, jn = z.mobility(3 - me);
          if (!w || w.k !== fact || w.v.k !== k || (fact === 'far' && (w.v.j !== jn || w.v.n !== left - 1))) add(T.id, j, `⑧ stage ${used + 1}: the words for ${E.name(cur, m)} say ${w && w.k}/${w && w.v.k}/${w && w.v.j}, the board ${fact}/${k}/${jn}`);
          if (w && /勝率|評価|見込み/.test(w.ja)) add(T.id, j, '追16 the words give an evaluation');
        }
        if (left <= 1) break;
        const a1 = cur.clone().play(g2[0]); if (!a1.mobility(3 - me)) break;
        const rp = E.duelReply(a1.spec(), [], left - 1).move; if (rp == null || rp < 0) break;
        cur = a1.clone().play(rp);
      }
      rows.push(r);
    });
    // ⑥ stages of 10
    const st = []; for (let i = 0; i < ds.length; i += 10) { const s = ds.slice(i, i + 10); st.push(s.reduce((a, b) => a + b, 0) / s.length); }
    for (let i = 1; i < st.length; i++) if (st[i] < st[i - 1]) add(T.id, i * 10, `⑥ stage ${i + 1} mean d ${st[i].toFixed(1)} < stage ${i} ${st[i - 1].toFixed(1)}`);
    if (st.length > 1 && !(st[st.length - 1] > st[0])) add(T.id, ds.length - 1, `⑥ the last stage is not harder than the first (${st[0].toFixed(1)} → ${st[st.length - 1].toFixed(1)})`);
  }
  // ⑨ the 2D: the words after a move off the solution in every language, the move never taken back
  if (!opt.no2d) {
    const w = { I18N: {} }; LANGS.forEach(l => { w.I18N[l] = {}; });
    const src = opt.i18n || ['i18n-kn.js', 'i18n-kn-more.js'].map(f => fs.readFileSync(path.join(ROOT, 'konane', f), 'utf8'));
    const I = {}; LANGS.forEach(l => { I[l] = {}; });
    for (const tx of src) { try { const ww = { I18N: I }; new Function('window', 'I18N', tx)(ww, I); } catch (e) { add('2D', -1, '⑨ i18n: ' + e.message); } }
    const all = Object.assign({}, ...[I, (typeof window !== 'undefined' ? {} : {})]);
    const pull = l => Object.assign({}, I[l] || {}, (all.I18N || {})[l] || {});
    for (const l of LANGS) for (const k of ['stuck', 'far', 'last', 'answer']) { const x = pull(l)['pz.why.' + k]; if (!x) add('2D', -1, `⑨ ${l}: no pz.why.${k}`); else if (/勝率|評価/.test(x)) add('2D', -1, `追16 ${l}: pz.why.${k}`); }
    const app = opt.app != null ? opt.app : fs.readFileSync(path.join(ROOT, 'konane/app.js'), 'utf8');
    if (!/function pzWhy\(/.test(app)) add('2D', -1, '⑦⑨ konane/app.js does not say why after a move off the solution (pzWhy)');
    if (/moves = moves\.slice\(0, cur - 1\); cur = moves\.length; Pz\.used--/.test(app)) add('2D', -1, '⑨ konane/app.js takes a move off the solution back (the 詰め rule: play on, no right move shown)');
  }
  return { out, rows, total: PZ.themes.reduce((a, T) => a + T.puzzles.length, 0) };
}
// --selftest: broken data must be caught
function selftest() {
  const base = JSON.parse(fs.readFileSync(path.join(ROOT, 'konane/puzzles.json'), 'utf8'));
  const cut = d => { d.themes = d.themes.filter(T => T.id === 'w2' || T.id === 'chain').map(T => Object.assign(T, { puzzles: T.puzzles.slice(0, 20) })); return d; };
  const clone = () => cut(JSON.parse(JSON.stringify(base)));
  const F = require(path.join(ROOT, 'atlas/games/konane-pz.js'));
  const cases = [
    ['n changed (①④)', d => { d.themes[0].puzzles[0].n = 3; }, /^[①④]/],
    ['order reversed (⑥)', d => { d.themes[0].puzzles.reverse(); }, /^⑥/],
    ['a duplicate (⑤)', d => { d.themes[0].puzzles[5] = JSON.parse(JSON.stringify(d.themes[0].puzzles[2])); }, /^⑤/],
    ['a colour-swapped mirror (⑤)', d => { const P = d.themes[0].puzzles[3]; const b = P.s.b; let o = ''; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const ch = b[r * 8 + 7 - c]; o += ch === 'b' ? 'w' : ch === 'w' ? 'b' : '.'; } d.themes[0].puzzles[8] = { s: { b: o, side: 3 - P.s.side }, n: P.n }; }, /^⑤/],
    ['a chain puzzle in w2 (④)', d => { d.themes[1].puzzles[0].n = 7; }, /^[①④]/],
    ['the words wrong (⑧)', null, /^⑧/, { why: o => { const w = F.why(o); return Object.assign({}, w, { v: Object.assign({}, w.v, { j: (w.v.j | 0) + 1 }) }); } }],
    ['a reply that does not refute (⑦)', null, /^⑦/, { reply: mid => mid.moves()[mid.moves().length - 1] }],
    ['the 2D takes the move back (⑨)', null, /^⑦?⑨/, { app: 'moves = moves.slice(0, cur - 1); cur = moves.length; Pz.used--;' }],
    ['2 right of 5 legal moves (追72: the old w2 #8)', d => { d.themes[0].puzzles[0] = { s: { b: 'w..b.b..b.......wbw.w..b...w..b...w...w.....b.b.w.....wbb.b...b.', side: 1 }, n: 2 }; }, /^追72/],
    ['an evaluation in the words (追16)', null, /^追16/, { why: o => Object.assign({}, F.why(o), { ja: '勝率が下がる' }) }],
  ];
  let ok = 0;
  const key = x => x.theme + '#' + x.q + ' ' + x.msg, base0 = new Set(verify({ data: clone() }).out.map(key));   // (only findings the break adds count)
  for (const [name, f, re, o] of cases) {
    const d = clone(); if (f) f(d);
    const r = verify(Object.assign({ data: d }, o || {}));
    const hit = r.out.some(x => re.test(x.msg) && !base0.has(key(x)));
    console.log((hit ? 'caught ' : 'MISSED ') + name); if (hit) ok++;
  }
  console.log(`selftest ${ok}/${cases.length}`); return ok === cases.length;
}
module.exports = { verify, selftest, goodSet, att, def, refutes, SYM, symB, diff, setMemo: () => { memo = new Map(); } };
if (require.main === module && process.argv.includes('--selftest')) process.exit(selftest() ? 0 : 1);
else if (require.main === module) {
  const a = process.argv.slice(2), jx = a.indexOf('--json'), fx = a.indexOf('--file');
  const r = verify({ file: fx >= 0 ? a[fx + 1] : null, no2d: a.includes('--no2d') });
  const bad = new Set(r.out.filter(o => o.q > 0).map(o => o.theme + '#' + o.q));
  for (const o of r.out.slice(0, 400)) console.log(`${o.theme} #${o.q}: ${o.msg}`);
  console.log(`${r.out.length ? 'NG' : 'OK'} konane puzzles: ${r.total - bad.size}/${r.total} pass (${r.out.length} findings)`);
  if (jx >= 0) fs.writeFileSync(a[jx + 1], JSON.stringify(r, null, 1));
  process.exit(r.out.length ? 1 : 0);
}
