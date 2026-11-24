#!/usr/bin/env node
// (2026-11-24 担当D) Ugolki on the 3D table: the "win within N" puzzles (ugolki/puzzles.json; 2D ugolki/app.js puzzleMove, 3D
// atlas/puzzles.js BOOK.ugolki) checked with an exact solver of this file (its own recursion over the engine's move generator and
// judge: the corner rule, Black's last move, the 40-move rule and the 80-move count all decide as in the game) against the engine's
// duelGood (what the 2D and the 3D accept; it cuts "more pieces outside than moves left", which is wrong when the 40 / 80-move rule
// can end the game inside the line — those puzzles must not be shipped).
// Every puzzle, ①〜⑨ and 追1〜 (claude/lesson-quality.md):
//  ① n is exact: the side to move wins within n of its moves whatever the reply, and not within n−1; the engine's duelGood = the
//    strict set of first moves; the line never reaches move 40 / 80 (追65).
//  ② 1 or 2 winning first moves (both accepted); the best wrong move needs n+1 moves or more (the gap is printed: --rows).
//  ③ 4 legal moves or more, 3 wrong first moves or more.
//  ④ the theme: x2 n = 2 (both sides), w3…b5 = the side and n; the collection's promise (pz.desc: "simply racing forward never
//    works"): the natural move (enter the corner, else the biggest step towards it — ugolki/tools/gen_duel.js greedy) loses.
//  ⑤ no two positions (all the puzzles, the lesson problems and ramps) within 4 squares of each other under the board's symmetries
//    (the diagonal through both corners, the half turn with the colours swapped).
//  ⑥ easy → hard: d = the near misses (wrong first moves refuted by 1 or 2 replies only) × 2 + the wrong first moves; each theme in
//    10-puzzle stages: each stage's mean d at least the one before's, the last stage's mean above the first's.
//  ⑦⑧ every stage of the line (the answer's first winning move, the defender's E.duelReply): every wrong move — the last move: the
//    words say the pieces still outside (last) or the opponent's own last move (lastDraw); before it: the reply the 2D and the 3D
//    play (E.duelReply) leaves no win within the moves left, and the words (atlas/games/ugolki-pz.js why()) name the board: far (k
//    outside > n left), block (the opponent's b pieces on the corner), slow (alone it takes s > n), catch (alone s ≤ n), over.
//  ⑨ the 2D says the same facts after a move off the solution (ugolki/app.js pzWhy, pz.why.* in 14 languages), never takes the move
//    back nor shows the right move by itself (the 詰め rule of the addendum).
// Usage: node tools/lesson-verify-ugolki.js [--json out.json] [--file puzzles.json] [--rows] [--selftest]   (also: node tools/lesson-verify.js ugolki)
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const E = require(path.join(ROOT, 'ugolki/engine.js'));
const LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
E.setRule('c33');
const R = E.R, HOMEL = E.HOMEL(), DIST = E.DIST();
const outside = (p, me) => HOMEL[me].length - p.inTarget(me);
// the cut "outside > moves left" is exact only when neither the 40-move rule nor the 80-move count can end the game on the way
const cutOk = (p, k) => p.ply + 2 * k + 1 < 2 * R.cap && (p.ply > 2 * R.limit || p.ply + 2 * k + 1 < 2 * R.limit);
let memo = new Map();
// me to move: forces a win (E.judge's winner = me) within k own moves?
function att(p, k, me) {
  if (k <= 0) return false;
  if (cutOk(p, k) && outside(p, me) > k) return false;
  const key = p.h1 + ':' + p.h2 + ':' + p.ply + ':' + k + 'a'; if (memo.has(key)) return memo.get(key);
  let r = false;
  for (const m of p.moves()) { if (m === E.PASS) continue; if (wins(p, m, k, me)) { r = true; break; } }
  memo.set(key, r); return r;
}
// the move m of me (k own moves left, this one included) wins whatever the replies
function wins(p, m, k, me) {
  const q = p.clone().play(m), j = E.judge(q);
  if (j.over) return j.winner === me;
  if (cutOk(q, k - 1) && outside(q, me) > k - 1) return false;   // (White's finishing move is judged after Black's reply: still 0 outside)
  return def(q, k - 1, me);
}
// the opponent to move: every reply still loses within k more own moves of me
function def(q, k, me) {
  const key = q.h1 + ':' + q.h2 + ':' + q.ply + ':' + k + 'd'; if (memo.has(key)) return memo.get(key);
  let r = true;
  for (const m of q.moves()) {
    const z = q.clone().play(m), j = E.judge(z);
    if (j.over) { if (j.winner !== me) { r = false; break; } continue; }
    if (!att(z, k, me)) { r = false; break; }
  }
  memo.set(key, r); return r;
}
const goodSet = (p, k, me) => p.moves().filter(m => m !== E.PASS && wins(p, m, k, me));
// the fewest own moves (≤ max) after which m still wins, or Infinity
const needOf = (p, m, me, from, max) => { for (let k = from; k <= max; k++) if (wins(p, m, k, me)) return k; return Infinity; };
const refutes = (p, m, k, me) => { const q = p.clone().play(m), j = E.judge(q); if (j.over) return j.winner === me ? 0 : 99; let n = 0; for (const r of q.moves()) { const z = q.clone().play(r), jz = E.judge(z); if (jz.over ? jz.winner !== me : !att(z, k - 1, me)) n++; } return n; };
function greedy(pos) {   // ugolki/tools/gen_duel.js: enter the corner if possible, else the biggest step towards it
  const me = pos.turn, T = E.target(me), D = DIST[me];
  let best = null, bg = -1e9;
  for (const m of pos.moves()) { const f = E.mFrom(m), t = E.mTo(m), g = (T[t] && !T[f] ? 100 : 0) + (D[f] - D[t]) * 3 - (T[f] ? 50 : 0); if (g > bg) { bg = g; best = m; } }
  return best;
}
const THEME = { x2: [0, 2], w3: [1, 3], b3: [2, 3], w4: [1, 4], b4: [2, 4], w5: [1, 5], b5: [2, 5] };
// the symmetries of the board: identity, the diagonal through both corners (r, c) → (7 − c, 7 − r), the half turn with the colours
// swapped, and both
const SYM = [[(r, c) => [r, c], false], [(r, c) => [7 - c, 7 - r], false], [(r, c) => [7 - r, 7 - c], true], [(r, c) => [c, r], true]];
const symB = (b, f, sw) => { const o = Array(64).fill('.'); for (let i = 0; i < 64; i++) { const ch = b[i]; const [r, c] = f(i >> 3, i & 7); o[r * 8 + c] = ch === 'w' ? (sw ? 'b' : 'w') : ch === 'b' ? (sw ? 'w' : 'b') : '.'; } return o.join(''); };
const diff = (a, b) => { let n = 0; for (let i = 0; i < 64; i++) if (a[i] !== b[i]) n++; return n; };
function verify(opt) {
  opt = opt || {};
  const PZ = opt.data || JSON.parse(fs.readFileSync(opt.file || path.join(ROOT, 'ugolki/puzzles.json'), 'utf8'));
  const LS = JSON.parse(fs.readFileSync(path.join(ROOT, 'ugolki/lessons.json'), 'utf8'));
  const UPZ = require(path.join(ROOT, 'atlas/games/ugolki-pz.js')), WHY = opt.why || UPZ.why, REPLY = opt.reply || ((q, left) => E.duelReply(q.spec(), [], left, 'c33').move);
  const out = [], rows = [];
  const add = (id, j, m) => out.push({ theme: id, q: j + 1, msg: m });
  if (PZ.rule !== 'c33') add('all', -1, '① the rule is not c33');
  // ⑤ the pool: every puzzle + every lesson problem / ramp
  const pool = [];
  PZ.themes.forEach(T => T.puzzles.forEach((P, j) => pool.push({ tag: T.id + '#' + (j + 1), b: P.s.b })));
  (LS.steps || []).forEach(st => [...(st.problems || []), ...(st.ramp || [])].forEach((P, j) => { const b = P && P.s && P.s.b; if (typeof b === 'string' && b.length === 64) pool.push({ tag: 'lesson ' + st.id + '#' + (j + 1), b }); }));
  const vars = pool.map(A => SYM.map(([f, sw]) => symB(A.b, f, sw)));
  for (let a = 0; a < pool.length; a++) for (let b = a + 1; b < pool.length; b++) {
    const A = pool[a], B = pool[b]; if (/^lesson/.test(A.tag) && /^lesson/.test(B.tag)) continue;
    if (vars[b].some(x => diff(A.b, x) <= 4)) { const P = /^lesson/.test(A.tag) ? B : A, O = P === A ? B : A, [id, q] = P.tag.split('#'); add(id, +q - 1, `⑤ within 4 squares of ${O.tag}`); }
  }
  for (const T of PZ.themes) {
    const th = THEME[T.id];
    if (!th) { add(T.id, -1, '④ unknown theme'); continue; }
    const ds = [];
    T.puzzles.forEach((P, j) => {
      const pos = E.Pos.from(P.s), me = pos.turn; memo = new Map();
      const r = { theme: T.id, j, ok: true };
      if (P.n !== th[1]) add(T.id, j, `④ n ${P.n} ≠ the theme's ${th[1]}`);
      if (th[0] && P.s.side !== th[0]) add(T.id, j, `④ side ${P.s.side} ≠ the theme's ${th[0]}`);
      if (P.s.n + 2 * P.n + 1 >= 2 * R.cap || (P.s.n < 2 * R.limit && P.s.n + 2 * P.n + 1 >= 2 * R.limit)) add(T.id, j, `①追65 the line reaches the ${P.s.n < 2 * R.limit ? '40' : '80'}-move rule (ply ${P.s.n}, n ${P.n})`);
      const L = pos.moves(), good = goodSet(pos, P.n, me), less = P.n > 1 ? goodSet(pos, P.n - 1, me) : [];
      if (!good.length) add(T.id, j, `① no win within ${P.n}`);
      if (less.length) add(T.id, j, `① already a win within ${P.n - 1}`);
      if (P.a != null && !good.includes(P.a)) add(T.id, j, `① the stored answer ${E.name(pos, P.a)} does not win`);
      const eng = E.duelGood(P.s, [], P.n, 'c33', 2e7) || [];
      if (!(eng.length === good.length && eng.every(m => good.includes(m)))) add(T.id, j, `①⑨ the engine accepts ${eng.length} first moves, the strict solver ${good.length}`);
      if (good.length > 2) add(T.id, j, `② ${good.length} first moves win`);
      const wrong = L.filter(m => !good.includes(m));
      // ② the gap: every wrong move needs n+1 own moves or more (--gap: how many exactly, up to n+1)
      let gap = '>' + P.n; if (opt.gap) { gap = Infinity; for (const m of wrong) { const k = needOf(pos, m, me, P.n, P.n + 1); if (k < gap) gap = k; } if (gap <= P.n) add(T.id, j, `② a wrong move wins within ${gap}`); }
      if (L.length < 4) add(T.id, j, `③ ${L.length} legal moves`);
      if (wrong.length < 3) add(T.id, j, `③ ${wrong.length} wrong first moves`);
      const gm = greedy(pos); if (good.includes(gm)) add(T.id, j, `④ the natural move ${E.name(pos, gm)} wins (pz.desc says racing forward never works)`);
      let near = 0; if (!opt.fast) for (const m of wrong) if (refutes(pos, m, P.n, me) <= 2) near++;
      const d = near * 2 + wrong.length; ds.push(d); Object.assign(r, { d, near, legal: L.length, good: good.length, gap: gap === Infinity ? '>' + (P.n + 1) : gap, ply: P.s.n });
      // ⑦⑧ every stage of the line
      let cur = pos; const kinds = {};
      for (let used = 0; used < P.n && !opt.fast; used++) {
        const left = P.n - used, g2 = used ? goodSet(cur, left, me) : good;
        if (!g2.length) { add(T.id, j, `① the line breaks at stage ${used + 1}`); break; }
        for (const m of cur.moves().filter(x => !g2.includes(x))) {
          const q = cur.clone().play(m), jq = E.judge(q);
          if (jq.over) { if (jq.winner === me) add(T.id, j, `⑧ stage ${used + 1}: ${E.name(cur, m)} wins but is not accepted`); else add(T.id, j, `⑦ stage ${used + 1}: ${E.name(cur, m)} ends the game (${jq.why}) — no words for it`); continue; }
          if (left <= 1) {
            const w = WHY({ last: true, mid: q, me, E, j: 0 }), k = outside(q, me);
            const fact = k > 0 ? 'last' : 'lastDraw';
            if (fact === 'lastDraw') { const rp = REPLY(q, 0), z = rp == null ? null : q.clone().play(rp), jz = z && E.judge(z); if (!jz || !jz.over || jz.winner === me) add(T.id, j, `⑦ stage ${used + 1}: after ${E.name(cur, m)} (complete) the reply ${rp == null ? '—' : E.name(q, rp)} does not end it ${jz && jz.why}`); else if (!jz.draw) add(T.id, j, `⑧ stage ${used + 1}: after ${E.name(cur, m)} the game ends ${jz.why}, not a draw (lastDraw says a draw)`); }
            if (!w || w.k !== fact || (fact === 'last' && w.v.k !== k)) add(T.id, j, `⑧ stage ${used + 1}: the last-move words for ${E.name(cur, m)} say ${w && w.k}/${w && w.v.k}, the board ${fact}/${k}`);
            kinds[w && w.k] = (kinds[w && w.k] || 0) + 1;
            continue;
          }
          const rep = REPLY(q, left - 1);
          if (rep == null || rep < 0) { add(T.id, j, `⑦ stage ${used + 1}: no reply after ${E.name(cur, m)}`); continue; }
          const z = q.clone().play(rep), jz = E.judge(z);
          if (jz.over ? jz.winner === me : att(z, left - 1, me)) add(T.id, j, `⑦ stage ${used + 1}: after ${E.name(cur, m)} and the reply ${E.name(q, rep)} the win is still within ${left - 1}`);
          const w = WHY({ mid: q, after: z, reply: rep, left: left - 1, me, E, j: 0 });
          const k = outside(z, me), b = UPZ.inMine(E, z, me);
          let fact = jz.over ? 'over' : k > left - 1 ? 'far' : b > 0 ? 'block' : null;
          if (!fact) { const s = UPZ.solo(E, z, me, left + 2); fact = s < 0 || s > left - 1 ? 'slow' : 'catch'; if (w && w.k === fact && fact === 'catch' && w.v.s !== s) add(T.id, j, `⑧ stage ${used + 1}: catch words say ${w.v.s} moves alone, the board ${s}`); if (fact === 'slow' && s > 0 && w && w.v.s !== s) add(T.id, j, `⑧ stage ${used + 1}: slow words say ${w.v.s}, the board ${s}`); }
          if (!w || w.k !== fact || (fact !== 'over' && (w.v.k !== k || w.v.n !== left - 1)) || (fact === 'block' && w.v.b !== b)) add(T.id, j, `⑧ stage ${used + 1}: the words for ${E.name(cur, m)} say ${w && w.k}/${w && w.v.k}/${w && w.v.b}, the board ${fact}/${k}/${b}`);
          if (w && /勝率|評価|見込み/.test(w.ja)) add(T.id, j, '追16 the words give an evaluation');
          kinds[fact] = (kinds[fact] || 0) + 1;
        }
        if (left <= 1) break;
        const a1 = cur.clone().play(g2[0]); if (E.judge(a1).over) break;
        const rp = E.duelReply(a1.spec(), [], left - 1, 'c33').move; if (rp == null || rp < 0) break;
        cur = a1.clone().play(rp); if (E.judge(cur).over) break;
      }
      r.kinds = kinds;
      rows.push(r); if (opt.log) process.stderr.write(T.id + '#' + (j + 1) + ' ' + JSON.stringify(r) + '\n');
    });
    // ⑥ stages of 10
    const st = []; for (let i = 0; i < ds.length; i += 10) { const s = ds.slice(i, i + 10); st.push(s.reduce((a, b) => a + b, 0) / s.length); }
    for (let i = 1; i < st.length; i++) if (st[i] < st[i - 1]) add(T.id, i * 10, `⑥ stage ${i + 1} mean d ${st[i].toFixed(1)} < stage ${i} ${st[i - 1].toFixed(1)}`);
    if (st.length > 1 && !(st[st.length - 1] > st[0])) add(T.id, ds.length - 1, `⑥ the last stage is not harder than the first (${st[0].toFixed(1)} → ${st[st.length - 1].toFixed(1)})`);
  }
  // ⑨ the 2D: the words after a move off the solution in every language, the move never taken back
  if (!opt.no2d) {
    const I = {}; LANGS.forEach(l => { I[l] = {}; });
    const src = opt.i18n || ['i18n-ug.js', 'i18n-ug-more.js', 'i18n-ug-eu.js', 'i18n-ug-hiar.js', 'i18n-ug-pzwhy.js'].map(f => fs.readFileSync(path.join(ROOT, 'ugolki', f), 'utf8'));
    const app = opt.app != null ? opt.app : fs.readFileSync(path.join(ROOT, 'ugolki/app.js'), 'utf8');
    if (!/function pzWhy\(/.test(app)) add('2D', -1, '⑦⑨ ugolki/app.js does not say why after a move off the solution (pzWhy)');
    if (/moves = moves\.slice\(0, cur - 1\); cur = moves\.length; Pz\.used--/.test(app)) add('2D', -1, '⑨ ugolki/app.js takes a move off the solution back (the 詰め rule: play on, no right move shown)');
    const all = src.join('\n');
    for (const k of ['far', 'block', 'slow', 'catch', 'over', 'last', 'lastDraw']) { const n = (all.match(new RegExp(`'pz\\.why\\.${k}'\\s*:`, 'g')) || []).length; if (n < LANGS.length) add('2D', -1, `⑨ pz.why.${k} in ${n} of ${LANGS.length} languages`); }
  }
  return { out, rows, total: PZ.themes.reduce((a, T) => a + T.puzzles.length, 0) };
}
// --selftest: broken data must be caught
function selftest() {
  const base = JSON.parse(fs.readFileSync(path.join(ROOT, 'ugolki/puzzles.json'), 'utf8'));
  const cut = d => { d.themes = d.themes.filter(T => T.id === 'x2' || T.id === 'w3').map(T => Object.assign(T, { puzzles: T.puzzles.slice(0, 12) })); return d; };
  const clone = () => cut(JSON.parse(JSON.stringify(base)));
  const F = require(path.join(ROOT, 'atlas/games/ugolki-pz.js'));
  const cases = [
    ['n changed (①④)', d => { d.themes[0].puzzles[0].n = 3; }, /^[①④]/],
    ['the answer changed (①)', d => { const P = d.themes[1].puzzles[1], pos = E.Pos.from(P.s); P.a = pos.moves().find(m => m !== P.a); }, /^①/],
    ['order reversed (⑥)', d => { d.themes[1].puzzles.reverse(); }, /^⑥/],
    ['a duplicate (⑤)', d => { d.themes[1].puzzles[5] = JSON.parse(JSON.stringify(d.themes[1].puzzles[2])); }, /^⑤/],
    ['a mirrored copy (⑤)', d => { const P = d.themes[1].puzzles[3]; d.themes[1].puzzles[8] = { s: { b: symB(P.s.b, SYM[1][0], false), side: P.s.side, n: P.s.n }, n: P.n, a: P.a }; }, /^⑤/],
    ['near the 80-move count (追65)', d => { d.themes[1].puzzles[2].s.n = 156; }, /^①/],
    ['the words wrong (⑧)', null, /^⑧/, { why: o => { const w = F.why(o); return Object.assign({}, w, { v: Object.assign({}, w.v, { k: (w.v.k | 0) + 1 }) }); } }],
    ['a reply that does not refute (⑦)', null, /^⑦/, { reply: (q, left) => { const me = 3 - q.turn, L = q.moves(); for (const r of L) { const z = q.clone().play(r), j = E.judge(z); if (j.over ? j.winner === me : att(z, left, me)) return r; } return -1; } }],
    ['the 2D takes the move back (⑨)', null, /^⑦?⑨/, { app: 'moves = moves.slice(0, cur - 1); cur = moves.length; Pz.used--;' }],
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
module.exports = { verify, selftest, goodSet, att, wins, def, refutes, greedy, SYM, symB, diff, outside, setMemo: () => { memo = new Map(); } };
if (require.main === module && process.argv.includes('--selftest')) process.exit(selftest() ? 0 : 1);
else if (require.main === module) {
  const a = process.argv.slice(2), jx = a.indexOf('--json'), fx = a.indexOf('--file');
  const r = verify({ file: fx >= 0 ? a[fx + 1] : null, no2d: a.includes('--no2d'), fast: a.includes('--fast'), log: a.includes('--log') });
  const bad = new Set(r.out.filter(o => o.q > 0).map(o => o.theme + '#' + o.q));
  if (a.includes('--rows')) for (const x of r.rows) console.log(JSON.stringify(x));
  for (const o of r.out.slice(0, 400)) console.log(`${o.theme} #${o.q}: ${o.msg}`);
  console.log(`${r.out.length ? 'NG' : 'OK'} ugolki puzzles: ${r.total - bad.size}/${r.total} pass (${r.out.length} findings)`);
  if (jx >= 0) fs.writeFileSync(a[jx + 1], JSON.stringify(r, null, 1));
  process.exit(r.out.length ? 1 : 0);
}
