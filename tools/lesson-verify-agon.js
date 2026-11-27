#!/usr/bin/env node
// (2026-11-27 担当F) Agon puzzles (agon/puzzles.json — "win within N": the queen on the throne with the six guards round it; 2D
// agon/app.js puzzleMove) checked with the game's own exact solver (agon/engine.js duelGood / duelMin / duelReply — the page's worker
// runs the same functions, so the 2D accepts exactly the first moves found here and the defender plays the reply found here).
// Every puzzle, ①〜⑨ and 追1〜追88 (claude/lesson-quality.md):
//  ① the stored answer wins within n own moves whatever the defence, and there is no win in fewer (duelMin = n); no search ran
//    out of budget; the side to move is the theme's side (w = White, b = Black, x2 = either).
//  ② one winning first move only; the wrong ones that still win in n+1 are counted (near misses) for ⑥.
//  ③ 3 legal moves or more, 2 wrong first moves or more; 追72 the winning moves are at most a third of the legal moves.
//  ④ the theme: x2 = win in 2, w3 / b3 … w5 / b5 = win in 3 … 5 for White / Black (n of the puzzle = the theme's).
//  ⑤ no two positions (the puzzles, the lesson problems and their ramps) the same or two pieces apart (4 cells or fewer — every
//    position has all 14 pieces) under the board's 12 symmetries (6 turns × the mirror), each with the colours swapped too; a
//    puzzle's start is not a position on another puzzle's main line (after a move and the reply).
//  ⑥ easy → hard: d = wrong first moves + 2 × near misses; each theme in stages of 10 (shared/pzbook.js STAGE): each stage's
//    mean d at least the one before's and the last stage's above the first's.
//  ⑦⑧ the main line (the 2D's answer: the first winning move in the engine's order, the defender's duelReply) at every stage: every
//    wrong move — on the last move it does not win; before it, after the defender's reply the attacker no longer wins within the
//    moves left (duelGood with a big budget is empty) and agon/pzwhy.js facts() names what the reply did (captured the queen /
//    guards, placed a captured piece back, stepped into the ring round the throne …) — recounted here on the board.
//  ⑨ the 2D keeps the 詰め rule (no take-back, no right move shown, no praise on the way: lesson-verify.js pz88 lists agon as
//    DONE) and says the pzwhy words; the words exist in 14 languages with the same placeholders.
// Usage: node tools/lesson-verify-agon.js [--rows] [--selftest] [--file puzzles.json] [--only w3]  (also: node tools/lesson-verify.js agon)
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const E = require(path.join(ROOT, 'agon/engine.js'));
const W = require(path.join(ROOT, 'agon/pzwhy.js'));
E.setRule('std');
const LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
const BUD = 6e7, N = 91, STAGE = 10;
const THEME = { x2: [2, 0], w3: [3, 1], b3: [3, 2], w4: [4, 1], b4: [4, 2], w5: [5, 1], b5: [5, 2] };
// the 12 symmetries of the hexagon (axial q, r): six turns, each also mirrored
const MAPS = (() => { const out = []; for (let f = 0; f < 2; f++) for (let k = 0; k < 6; k++) { const mp = []; for (let i = 0; i < N; i++) { let q = E.Q[i], r = E.RR[i]; if (f) [q, r] = [r, q]; for (let j = 0; j < k; j++) [q, r] = [-r, q + r]; mp.push(E.at(q, r)); } out.push(mp); } return out; })();
const SW = { w: 'b', W: 'B', b: 'w', B: 'W', x: 'y', X: 'Y', y: 'x', Y: 'X', '.': '.' };
const sym = (b, mp, sw) => { const o = Array(N).fill('.'); for (let i = 0; i < N; i++) o[mp[i]] = sw ? SW[b[i]] : b[i]; return o.join(''); };
const diff = (a, b) => { let n = 0; for (let i = 0; i < N; i++) if (a[i] !== b[i]) n++; return n; };
const specOf = pos => pos.spec();
// the main line and the checks of one puzzle: { iss: [...], legal, good, near, d, line: [spec …] }
function analyze(P, tid, opt) {
  opt = opt || {};
  const iss = [], th = THEME[tid], p0 = E.Pos.from(P.s), me = p0.turn, Lm = p0.moves();
  const r = { iss, legal: Lm.length };
  if (!th) { iss.push('④ unknown theme ' + tid); return r; }
  if (P.n !== th[0]) iss.push(`④ n ${P.n} ≠ the theme's ${th[0]}`);
  if (th[1] && me !== th[1]) iss.push('④① the side to move is not the theme\'s');
  if (E.judge(p0).over) { iss.push('① the position is already over'); return r; }
  const good = E.duelGood(P.s, [], P.n, 'std', BUD);
  if (!good) { iss.push('① the search ran out of budget'); return r; }
  r.good = good.length;
  if (good.length !== 1) iss.push(`② ${good.length} winning first moves`);
  if (!good.includes(P.a)) iss.push(`① the stored answer ${P.a} does not win within ${P.n}`);
  else if (good[0] !== P.a) iss.push('① the stored answer is not the engine\'s first winning move (the 2D / 3D answer)');
  const mn = E.duelMin(P.s, [], P.n, 'std', BUD);
  if (mn !== P.n) iss.push(`① duelMin ${mn} (a win in fewer, or none)`);
  if (Lm.length < 3) iss.push(`③ ${Lm.length} legal moves`);
  if (Lm.length - good.length < 2) iss.push(`③ ${Lm.length - good.length} wrong first moves`);
  if (good.length * 3 > Lm.length) iss.push(`③追72 ${good.length} of ${Lm.length} moves win`);
  if (opt.quick) return r;
  const g1 = E.duelGood(P.s, [], P.n + 1, 'std', BUD);
  if (!g1) { iss.push('② the n+1 search ran out of budget'); return r; }
  r.near = g1.filter(m => !good.includes(m)).length; r.d = (Lm.length - good.length) + 2 * r.near;
  // ⑦⑧ the main line
  const line = [], specs = []; let used = 0; r.kinds = {};
  while (used < P.n) {
    const pos = E.replay(P.s, line).pos, left = P.n - used;
    const gs = used ? E.duelGood(P.s, line, left, 'std', BUD) : good;
    if (!gs || !gs.length) { iss.push(`① the line breaks at stage ${used + 1}`); break; }
    for (const m of pos.moves()) {
      if (gs.includes(m)) continue;
      const mid = pos.clone().play(m), jm = E.judge(mid);
      if (jm.over && jm.winner === me) { iss.push(`⑧ stage ${used + 1}: ${E.name(pos, m)} wins but is not accepted`); continue; }
      let after = null, rep = null;
      if (left > 1 && !jm.over) {
        const rr = E.duelReply(P.s, line.concat([m]), left - 1, 'std');
        rep = rr.move; if (rep == null) { iss.push(`⑦ stage ${used + 1}: no reply after ${E.name(pos, m)}`); continue; }
        after = mid.clone().play(rep);
        const ja = E.judge(after);
        if (!(ja.over && ja.winner !== me)) {
          const g2 = E.duelGood(P.s, line.concat([m, rep]), left - 1, 'std', BUD);
          if (g2 == null) iss.push(`⑦ stage ${used + 1}: budget after ${E.name(pos, m)}`);
          else if (g2.length) iss.push(`⑦ stage ${used + 1}: after ${E.name(pos, m)} and the reply ${E.name(mid, rep)} a win within ${left - 1} is left`);
        }
      }
      const f = (opt.facts || W.facts)({ E, me, mid, after, reply: rep, left: left - 1, last: left <= 1 || jm.over });
      const bad = checkFacts(f, { me, mid, after, rep, left: left - 1, last: left <= 1 || jm.over, jm });
      if (bad) iss.push(`⑧ stage ${used + 1}: ${E.name(pos, m)} → ${f.k}: ${bad}`);
      r.kinds[f.k] = (r.kinds[f.k] || 0) + 1;
    }
    const a = gs[0], q = pos.clone().play(a); line.push(a); used++;
    const jq = E.judge(q);
    if (jq.over) { if (jq.winner !== me) iss.push(`① the line's move ${E.name(pos, a)} loses`); break; }
    if (used >= P.n) { iss.push('① the line does not win within n'); break; }
    const rr = E.duelReply(P.s, line, P.n - used, 'std');
    if (rr.move == null) { iss.push(`① no reply at stage ${used}`); break; }
    line.push(rr.move); const q2 = q.clone().play(rr.move); specs.push(q2.spec().b + q2.turn);
    const j2 = E.judge(q2); if (j2.over) { iss.push(`① the defender's reply ends the game at stage ${used}`); break; }
  }
  r.line = specs;
  return r;
}
// the facts recounted on the board (independent of pzwhy.js)
function checkFacts(f, o) {
  if (!f || W.KEYS.indexOf(f.k) < 0) return 'unknown key';
  const me = o.me, opp = 3 - me;
  if (o.jm.over && o.jm.winner === opp) return f.k === 'wEmpty' ? '' : 'the move surrounds the empty throne (wEmpty expected)';
  if (o.last) {
    const k = o.mid.onThrone(me) ? 'wLastG' : 'wLastQ';
    if (f.k !== k) return k + ' expected';
    let g = 0; for (const i of E.INNER) if (o.mid.at(i) === (me === 1 ? 1 : 3) && !o.mid.captured(i)) g++;
    return f.v.g === g ? '' : `{g} ${f.v.g} ≠ ${g}`;
  }
  if (f.v.n !== o.left && f.k !== 'wLose') return `{n} ${f.v.n} ≠ ${o.left}`;
  if (o.rep === E.PASS) return f.k === 'wPass' ? '' : 'wPass expected';
  const ja = E.judge(o.after);
  if (ja.over && ja.winner === opp) return f.k === 'wLose' ? '' : 'wLose expected';
  const to = E.mTo(o.rep), fr = E.mFrom(o.rep);
  if (f.mark !== to) return 'the red mark is not the reply\'s cell';
  const placed = fr === 91 || o.mid.captured(fr);
  // the reply's captures: my pieces that were free before and captured after
  const took = []; for (let i = 0; i < N; i++) if (o.mid.owner(i) === me && !o.mid.captured(i) && o.after.captured(i)) took.push(i);
  if (!placed && took.some(i => o.mid.isQueen(i))) return f.k === 'wTookQ' ? '' : 'wTookQ expected';
  if (!placed && took.length) return f.k !== 'wTookG' ? 'wTookG expected' : f.v.r === took.length ? '' : `{r} ${f.v.r} ≠ ${took.length}`;
  if (placed) return f.k === 'wReloc' ? '' : 'wReloc expected';
  if (to === E.CENTER || E.RING[to] === 1) return f.k === 'wBlock' ? '' : 'wBlock expected';
  return f.k === 'wRun' ? '' : 'wRun expected';
}
function poolOf(PZ) {
  const pool = [];
  PZ.themes.forEach(T => T.puzzles.forEach((P, j) => pool.push({ tag: T.id + '#' + (j + 1), b: P.s.b, side: P.s.side })));
  const LS = JSON.parse(fs.readFileSync(path.join(ROOT, 'agon/lessons.json'), 'utf8'));
  (LS.steps || []).forEach(st => [...(st.problems || []), ...(st.ramp || [])].forEach((P, j) => { if (P && P.s && typeof P.s.b === 'string' && P.s.b.length === N) pool.push({ tag: 'lesson ' + st.id + '#' + (j + 1), b: P.s.b, side: P.s.side }); }));
  return pool;
}
// the smallest distance between two positions under the symmetries (0 with the same side to move = the same position)
function dist(A, B) { let md = 99; for (const mp of MAPS) for (const sw of [0, 1]) { const s = sw ? 3 - B.side : B.side, d = diff(A.b, sym(B.b, mp, sw)); if (d < md && (d > 0 || s === A.side)) md = d; } return md; }
function texts(add) {
  for (const L of LANGS) {
    const T = W.T[L]; if (!T) { add('pzwhy', -1, `⑨ agon/pzwhy.js has no ${L}`); continue; }
    for (const k of ['answer'].concat(W.KEYS)) {
      if (!T[k]) { add('pzwhy', -1, `⑨ ${L}.${k} missing`); continue; }
      const ph = s => (s.match(/\{\w+\}/g) || []).sort().join('');
      if (ph(T[k]) !== ph(W.T.ja[k])) add('pzwhy', -1, `⑨ ${L}.${k} placeholders differ from ja`);
    }
  }
  const app = fs.readFileSync(path.join(ROOT, 'agon/app.js'), 'utf8');
  if (!/AgonPzWhy/.test(app)) add('2D', -1, '⑨ agon/app.js does not use AgonPzWhy');
  const P88 = require('./lesson-verify-pz88.js');
  if (!P88.DONE.includes('agon')) add('2D', -1, '⑨ lesson-verify-pz88.js DONE does not list agon');
}
function verify(opt) {
  opt = opt || {};
  const PZ = opt.data || JSON.parse(fs.readFileSync(opt.file || path.join(ROOT, 'agon/puzzles.json'), 'utf8'));
  const out = [], rows = [];
  const add = (id, j, m) => out.push({ theme: id, q: j + 1, msg: m });
  // ⑤ the pool
  const pool = poolOf(PZ);
  for (let a = 0; a < pool.length; a++) for (let b = a + 1; b < pool.length; b++) {
    const A = pool[a], B = pool[b]; if (/^lesson/.test(A.tag) && /^lesson/.test(B.tag)) continue;
    const d = dist(A, B);
    if (d <= 4) { const P = /^lesson/.test(B.tag) ? A : B, O = P === A ? B : A, [id, q] = P.tag.split('#'); add(id, +q - 1, `⑤ ${d} cell(s) from ${O.tag}`); }
  }
  const lines = [];
  for (const T of PZ.themes) {
    if (opt.only && T.id !== opt.only) continue;
    const ds = [];
    T.puzzles.forEach((P, j) => {
      const r = analyze(P, T.id, opt);
      r.iss.forEach(x => add(T.id, j, x));
      ds.push(r.d || 0); (r.line || []).forEach(s => lines.push({ tag: T.id + '#' + (j + 1), s }));
      rows.push(Object.assign({ theme: T.id, q: j + 1 }, r, { line: undefined, iss: undefined }));
    });
    // ⑥ stages
    const st = []; for (let i = 0; i < ds.length; i += STAGE) { const s = ds.slice(i, i + STAGE); st.push(s.reduce((a, b) => a + b, 0) / s.length); }
    for (let i = 1; i < st.length; i++) if (st[i] < st[i - 1]) add(T.id, i * STAGE, `⑥ stage ${i + 1} mean d ${st[i].toFixed(2)} < stage ${i}'s ${st[i - 1].toFixed(2)}`);
    if (st.length > 1 && !(st[st.length - 1] > st[0])) add(T.id, -1, `⑥ the last stage (${st[st.length - 1].toFixed(2)}) is not harder than the first (${st[0].toFixed(2)})`);
  }
  // ⑤ a start on another puzzle's main line
  const starts = new Map();
  PZ.themes.forEach(T => T.puzzles.forEach((P, j) => { for (const mp of MAPS) for (const sw of [0, 1]) { const k = sym(P.s.b, mp, sw) + (sw ? 3 - P.s.side : P.s.side); if (!starts.has(k)) starts.set(k, T.id + '#' + (j + 1)); } }));
  for (const L of lines) { const o = starts.get(L.s); if (o && o !== L.tag) { const [id, q] = o.split('#'); add(id, +q - 1, `⑤ the start is on the main line of ${L.tag}`); } }
  if (!opt.noText) texts(add);
  return { out, rows };
}
module.exports = { verify, analyze, dist, poolOf, MAPS, sym, THEME };
if (require.main === module) {
  const a = process.argv.slice(2), gv = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  if (a.includes('--selftest')) {
    const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'agon/puzzles.json'), 'utf8'));
    const T0 = PZ.themes.find(T => T.id === 'w3'), P = T0.puzzles[0];
    const cases = [];
    { const p0 = E.Pos.from(P.s), w = p0.moves().find(m => m !== P.a); cases.push(['a wrong stored answer', 'w3', Object.assign({}, P, { a: w }), /①/]); }
    cases.push(['n changed', 'w3', Object.assign({}, P, { n: 4 }), /④|①/]);
    cases.push(['the side changed (theme)', 'b3', P, /④/]);
    let fails = 0;
    for (const [nm, tid, Q, re] of cases) { const r = analyze(Q, tid, { quick: !/n changed/.test(nm) }); const ok = r.iss.some(x => re.test(x)); console.log(ok ? 'detected' : 'MISSED', nm, '|', r.iss.join(' / ')); if (!ok) fails++; }
    // broken facts: every reply called wRun
    { const r = analyze(P, 'w3', { facts: o => ({ k: o.last ? 'wLastQ' : 'wRun', v: { g: 0, n: o.left }, mark: o.reply != null ? E.mTo(o.reply) : -1 }) }); const ok = r.iss.some(x => /⑧/.test(x)); console.log(ok ? 'detected' : 'MISSED', 'broken facts', '|', r.iss.slice(0, 2).join(' / ')); if (!ok) fails++; }
    // a duplicate: a puzzle copied under a symmetry with the colours swapped
    { const D = JSON.parse(JSON.stringify(PZ)); const Q = JSON.parse(JSON.stringify(P)); Q.s.b = sym(Q.s.b, MAPS[7], 1); Q.s.side = 3 - Q.s.side; D.themes.find(T => T.id === 'b3').puzzles.push(Q); const pool = poolOf(D); const A = pool.find(x => x.tag === 'w3#1'), B = pool[pool.findIndex(x => x.tag.startsWith('b3#')) + D.themes.find(T => T.id === 'b3').puzzles.length - 1]; const ok = dist(A, B) === 0; console.log(ok ? 'detected' : 'MISSED', 'a mirrored colour-swapped copy (⑤)'); if (!ok) fails++; }
    console.log(fails ? fails + ' MISSED' : 'selftest ok'); process.exit(fails ? 1 : 0);
  }
  const r = verify({ file: gv('--file'), only: gv('--only') });
  if (a.includes('--rows')) r.rows.forEach(x => console.log(JSON.stringify(x)));
  r.out.forEach(o => console.log('NG', o.theme, o.q, o.msg));
  const n = r.rows.length, badQ = new Set(r.out.filter(o => o.q > 0).map(o => o.theme + '#' + o.q)).size;
  console.log(`agon puzzles: ${n - badQ}/${n} ok, ${r.out.length} NG`);
  process.exit(r.out.length ? 1 : 0);
}
