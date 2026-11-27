#!/usr/bin/env node
// (2026-11-27 担当D) Ludus latrunculorum puzzles (latrunculi/puzzles.json — "take a counter within N moves", Seneca rules: a
// counter enclosed by two enemies is turned face down and removed at the start of the encloser's next turn; 2D latrunculi/app.js
// puzzleMove accepts the moves of engine.js goalGood and the defender plays goalReply). Every puzzle, ①〜⑥ and 追1〜追88 that bear on
// these puzzles (claude/lesson-quality.md):
//  ① the goal (engine.js goalMet: the mover's lead in captures grows by one and none of its own counters stands face down) is
//    reached within n of the mover's own moves whatever the defence, and not in fewer (an exact search here, with no budget, and
//    the engine's goalGood / goalMin give the same sets); the side to move may be either colour.
//  ② the winning first moves are all accepted (the 2D / 3D take the whole goalGood set) and are at most two; 追72 they are at most a
//    third of the legal moves.
//  ③ 8 legal moves or more (the generator's floor), 3 wrong first moves or more.
//  ④ the theme: t2 / t3 / t4 = n 2 / 3 / 4; corner = n 2 and every winning first move encloses a counter on the edge or in a
//    corner; double = n 2 and every winning first move encloses two counters or more (追56: every winning move, not the first);
//    t2 = a wrong first move also encloses a counter (the tempting enclosure that does not work).
//  ⑤ no two puzzles (and no lesson problem) the same or two counters apart (4 squares or fewer) under the board's 8 symmetries,
//    each with the colours swapped too; a puzzle's start is not a position on another puzzle's main line (after the first winning
//    move and the defender's goalReply).
//  ⑥ easy → hard: d = wrong first moves + 2 × near misses (wrong first moves that reach the goal in n+1); each theme in stages of
//    10 (shared/pzbook.js STAGE): each stage's mean d at least the one before's and the last stage's above the first's.
//  追16: no win rate / evaluation in the data.
// Usage: node tools/lesson-verify-latrunculi.js [--rows] [--selftest] [--file puzzles.json] [--only t3]
//        (also: node tools/lesson-verify.js latrunculi)
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const E = require(path.join(ROOT, 'latrunculi/engine.js'));
E.setRule('seneca');
const STAGE = 10, NN = 64;
const THEME = { t2: 2, t3: 3, t4: 4, corner: 2, double: 2 };
const edgeSq = x => E.CORNER[x] >= 0 || (x >> 3) % 7 === 0 || (x & 7) % 7 === 0;
// ---------------------------------------------------------------- an exact solver (no budget), the engine's goalW / goalB
// a transposition table (the whole position: counters, face-down axes, side, captures, the last moves — the no-going-back rule)
let TT = new Map();
const key = (pos, k, t) => t + k + Buffer.from(pos.sq.buffer, pos.sq.byteOffset, 64).toString('latin1') + Buffer.from(pos.inc.buffer, pos.inc.byteOffset, 64).toString('latin1') + pos.side + ',' + pos.cap + ',' + pos.last;
function W(pos, k, me, G) {
  const K = key(pos, k, 'W'); let v = TT.get(K); if (v === undefined) { v = W0(pos, k, me, G); if (TT.size > 4e6) TT = new Map(); TT.set(K, v); } return v;
}
function B(pos, k, me, G) {
  const K = key(pos, k, 'B'); let v = TT.get(K); if (v === undefined) { v = B0(pos, k, me, G); if (TT.size > 4e6) TT = new Map(); TT.set(K, v); } return v;
}
// (Seneca: the lead grows only by a removal at the start of the mover's turn, so with one move left the mover needs an enemy
// counter that already stands face down — the exact search skips the rest; the selftest and the engine's goalGood agree)
const oppDown = (pos, me) => { for (let i = 0; i < NN; i++) if (pos.sq[i] === 3 - me && pos.inc[i]) return true; return false; };
// the children in a good order for the side to move (an order only: every move is still searched): the mover first tries the
// moves that leave more enemy counters face down, the defender the ones that free its own and turn the mover's face down
const downs = (q, p) => { let n = 0; for (let i = 0; i < NN; i++) if (q.sq[i] === p && q.inc[i]) n++; return n; };
function kids(pos, who, me) {
  const out = pos.moves().map(m => { const q = pos.clone().play(m); return [m, q, who ? (who === me ? downs(q, 3 - me) * 2 - downs(q, me) : downs(q, me) * 2 - downs(q, 3 - me) * 3) : 0]; });
  if (who) out.sort((a, b) => b[2] - a[2]);
  return out;
}
function W0(pos, k, me, G) {
  if (E.judge(pos).over) return false;
  if (k === 1 && E.R.delay && !oppDown(pos, me)) return false;
  for (const [m, q] of kids(pos, k > 1 ? me : 0, me)) {
    if (E.goalMet(q, me, G)) return true;
    if (k > 1 && !E.judge(q).over && B(q, k - 1, me, G)) return true;
  }
  return false;
}
function B0(pos, k, me, G) {
  // (the defender cannot turn its own counter face down — one stepping between two enemies is not enclosed — so with one move
  // left for the mover after the reply, an enemy counter must stand face down already)
  if (k === 1 && E.R.delay && !oppDown(pos, me) && !E.goalMet(pos, me, G)) return false;
  const L = kids(pos, k > 1 ? 3 - me : 0, me);
  if (!L.length) return false;
  for (const [, q] of L) {
    if (E.goalMet(q, me, G)) continue;
    if (E.judge(q).over) return false;
    if (!W(q, k, me, G)) return false;
  }
  return true;
}
function good(pos, n, G) {
  const me = pos.turn, out = [];
  for (const m of pos.moves()) {
    const q = pos.clone().play(m);
    if (E.goalMet(q, me, G) || (n > 1 && !E.judge(q).over && B(q, n - 1, me, G))) out.push(m);
  }
  return out;
}
// ---------------------------------------------------------------- symmetry
const MAPS = (() => { const out = []; for (let k = 0; k < 8; k++) { const mp = []; for (let i = 0; i < NN; i++) { let r = i >> 3, c = i & 7; if (k & 4) c = 7 - c; if (k & 1) [r, c] = [c, r]; if (k & 2) { r = 7 - r; c = 7 - c; } mp.push(r * 8 + c); } out.push(mp); } return out; })();
const SW = { b: 'w', w: 'b', h: 'H', v: 'V', c: 'C', H: 'h', V: 'v', C: 'c', '.': '.' };
// the axis letters h / v swap under a transposition; compare the owner only (the axis follows the counters)
const own = ch => ch === '.' ? '.' : ('bhvc'.includes(ch) ? 'b' : 'w') + (ch === 'b' || ch === 'w' ? '' : '!');
const sym = (b, mp, sw) => { const o = Array(NN).fill('.'); for (let i = 0; i < NN; i++) o[mp[i]] = sw ? SW[b[i]] : b[i]; return o.map(own); };
const diff = (a, b) => { let n = 0; for (let i = 0; i < NN; i++) if (a[i] !== own(b[i])) n++; return n; };
function near(a, sa, b, sb) {   // a, b: board strings; sa, sb: side to move. 4 squares or fewer apart under a symmetry
  let best = 99;
  for (const mp of MAPS) for (const sw of [0, 1]) { if ((sa === sb) === !!sw) continue; best = Math.min(best, diff(sym(a, mp, sw), b)); }
  return best;
}
// ---------------------------------------------------------------- the words after a wrong move, recounted on the board
const WHY = require(path.join(ROOT, 'latrunculi/pzwhy.js'));
const LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
function whyCheck(f, o) {
  const { cur, m, mid, after, rep, left, over, me, G } = o, opp = 3 - me, lead = p => p.cap[me - 1] - p.cap[2 - me];
  const need = G.base + (G.gain || 1);
  switch (f.k) {
    case 'wEnd': return over ? '' : 'the game is not over';
    case 'wLastPen': return !(lead(mid) >= need && f.mark >= 0 && mid.sq[f.mark] === me && mid.inc[f.mark]) ? 'the lead did not grow / no face-down counter of the mover at the mark' : '';
    case 'wLastBlk': { const fx = E.effect(cur, m); return lead(mid) < need && fx.blocks.includes(f.mark) && mid.sq[f.mark] === opp && mid.inc[f.mark] ? '' : 'the mark is not a counter this move turned face down'; }
    case 'wLast': return lead(mid) < need && !E.effect(cur, m).blocks.length ? '' : 'the lead grew / the move enclosed a counter';
  }
  if (!after) return 'no reply';
  const fx = E.effect(mid, rep);
  if (f.v.n !== left - 1) return `n ${f.v.n} ≠ the moves left ${left - 1}`;
  switch (f.k) {
    case 'wFree': return fx.frees.some(i => mid.sq[i] === opp && mid.inc[i] && !after.inc[i]) && fx.blocks.some(i => after.sq[i] === me && after.inc[i]) ? '' : 'no counter of the defender freed by enclosing an encloser';
    case 'wTook': return fx.rm >= 0 && f.mark === fx.rm && mid.sq[fx.rm] === me && mid.inc[fx.rm] && after.sq[fx.rm] !== me && after.cap[2 - me] === mid.cap[2 - me] + 1 ? '' : 'the mark is not the mover\'s face-down counter removed';
    case 'wHit': return fx.blocks.includes(f.mark) && after.sq[f.mark] === me && after.inc[f.mark] ? '' : 'the mark is not a counter of the mover the reply turned face down';
    case 'wRun': return !fx.blocks.length && fx.rm < 0 && !fx.frees.length && f.mark === E.mTo(rep) ? '' : 'the reply enclosed / removed / freed (another kind)';
  }
  return 'unknown kind ' + f.k;
}
function whyWords() {   // ⑨ every kind in 14 languages, the same placeholders as ja
  const out = [];
  for (const k of WHY.KEYS) { const ph = s => (s.match(/\{\w+\}/g) || []).sort().join(); const ref = ph(WHY.T.ja[k] || '');
    for (const L of LANGS) { const s = WHY.T[L] && WHY.T[L][k]; if (!s) out.push({ step: 'pzwhy', q: 0, msg: `⑨ ${L}.${k} missing` }); else if (ph(s) !== ref) out.push({ step: 'pzwhy', q: 0, msg: `⑨ ${L}.${k} placeholders ${ph(s)} ≠ ja ${ref}` }); } }
  return out;
}
// ---------------------------------------------------------------- one puzzle
function analyze(P, tid) {
  TT = new Map();   // one table per puzzle (the goal's base and side are the puzzle's)
  const iss = [], th = THEME[tid], pos = E.Pos.from(P.s), L = pos.moves(), G = E.goalOf(pos, { goal: P.g || 'take' });
  const r = { iss, legal: L.length };
  if (!th) { iss.push('④ unknown theme ' + tid); return r; }
  if (P.n !== th) iss.push(`④ n ${P.n} ≠ the theme's ${th}`);
  if ((P.g || 'take') !== 'take') iss.push('④ the goal is not take');
  if (P.s.rule !== 'seneca') iss.push('④ not the Seneca rules');
  if (E.judge(pos).over) { iss.push('① the position is already over'); return r; }
  if ([...pos.inc].some(x => x)) iss.push('④ a counter already stands face down');
  for (let k = 1; k < P.n; k++) if (good(pos, k, G).length) { iss.push(`① the goal is reached in ${k} (fewer than ${P.n})`); break; }
  const g = good(pos, P.n, G); r.good = g.length;
  if (!g.length) { iss.push(`① no first move reaches the goal within ${P.n}`); return r; }
  const eg = E.goalGood(P.s, [], P.n, { goal: 'take' }, 'seneca', 1e8) || [];
  if (eg.length !== g.length || eg.some(m => !g.includes(m))) iss.push('① the engine\'s goalGood (the 2D / 3D answer set) differs from the exact search');
  if (g.length > 2) iss.push(`② ${g.length} winning first moves`);
  if (g.length * 3 > L.length) iss.push(`②追72 ${g.length} of ${L.length} moves win`);
  if (L.length < 8) iss.push(`③ ${L.length} legal moves`);
  if (L.length - g.length < 3) iss.push(`③ ${L.length - g.length} wrong first moves`);
  const fx = m => E.effect(pos, m);
  if (tid === 'corner' && !g.every(m => fx(m).blocks.some(edgeSq))) iss.push('④追56 a winning first move does not enclose a counter on the edge / in a corner');
  if (tid === 'double' && !g.every(m => fx(m).blocks.length + fx(m).takes.length >= 2)) iss.push('④追56 a winning first move encloses fewer than two');
  if (tid === 't2' && !L.some(m => !g.includes(m) && fx(m).blocks.length)) iss.push('④ no tempting enclosure that does not work');
  const g1 = good(pos, P.n + 1, G);
  r.near = g1.filter(m => !g.includes(m)).length; r.d = (L.length - g.length) + 2 * r.near;
  // ⑦⑧⑨ the main line (the 2D / 3D: the first of goalGood, the defender's goalReply) at every stage: the engine's goalGood with the
  // page's budget (the worker's default) gives the exact set; every wrong move → the defender's goalReply → after it the mover can
  // no longer reach the goal within the moves left (exact), and latrunculi/pzwhy.js names what happened, recounted on the board
  const me = pos.turn, line = []; r.line = []; r.kinds = {};
  for (let used = 0; used < P.n; used++) {
    const cur = E.replay(P.s, line).pos, left = P.n - used;
    const gx = used ? good(cur, left, G) : g, ge = E.goalGood(P.s, line, left, G, 'seneca');
    if (!ge) { iss.push(`⑨ stage ${used + 1}: the page's goalGood (budget 400000) gives none / runs out`); break; }
    if (ge.length !== gx.length || ge.some(m => !gx.includes(m))) { iss.push(`⑨ stage ${used + 1}: the page's goalGood differs from the exact search`); break; }
    for (const m of cur.moves()) {
      if (gx.includes(m)) continue;
      const mid = cur.clone().play(m), over = E.judge(mid).over;
      if (E.goalMet(mid, me, G)) { iss.push(`⑧ stage ${used + 1}: ${E.name(cur, m)} reaches the goal but is not accepted`); continue; }
      let after = null, rep = null;
      if (left > 1 && !over) {
        rep = E.goalReply(P.s, line.concat([m]), left - 1, G, 'seneca').move;
        if (rep == null || rep < 0) { iss.push(`⑦ stage ${used + 1}: no reply after ${E.name(cur, m)}`); continue; }
        after = mid.clone().play(rep);
        if (!E.judge(after).over && good(after, left - 1, G).length) { iss.push(`⑦ stage ${used + 1}: after ${E.name(cur, m)} and the reply ${E.name(mid, rep)} the goal is still reachable (the words say it is not)`); continue; }
      }
      const f = WHY.facts({ E, me, G, pre: cur, move: m, mid, after, reply: rep, left: left - 1, last: left <= 1 || over });
      r.kinds[f.k] = (r.kinds[f.k] || 0) + 1;
      const ck = whyCheck(f, { cur, m, mid, after, rep, left, over, me, G });
      if (ck) iss.push(`⑧ stage ${used + 1}: ${E.name(cur, m)} → ${f.k}: ${ck}`);
    }
    // the right move and the defender's reply
    const m0 = ge[0], q = cur.clone().play(m0); line.push(m0);
    if (E.goalMet(q, me, G)) break;
    if (used + 1 >= P.n) { iss.push('① the main line does not reach the goal'); break; }
    const rep = E.goalReply(P.s, line, left - 1, G, 'seneca').move;
    if (rep == null || rep < 0) { iss.push(`① stage ${used + 1}: no reply on the main line`); break; }
    line.push(rep); const a = q.clone().play(rep); r.line.push(a.spec());
    if (E.goalMet(a, me, G) === false && E.judge(a).over) { iss.push('① the game ends on the main line'); break; }
  }
  return r;
}
// (2026-11-27 担当D) the 3D table: ポンメェ's words (atlas/games/latrunculi-pz.js) — every line in 14 languages (the board facts of a
// language without its own: latrunculi/pzwhy.js), each variant with the placeholders of the 2D's words; the facts without a red
// mark (wEnd · wLast) never speak of one and the others name it (ja / en: ⑦ the words say what is on the board); the line after a
// right move (mid) has no praise (追91); atlas/puzzles.js plays the 2D's reply and says facts() (ltMoved), and the table loads both
// files (atlas/lazy.js)
function texts3d(A, pzSrc, lzSrc) {
  const out = [], add = msg => out.push({ step: '3D', q: 0, msg });
  A = A || require(path.join(ROOT, 'atlas/games/latrunculi-pz.js'));
  const ph = s => (String(s).match(/\{\w+\}/g) || []).filter(x => x !== '{c}').sort().join('');
  const OWN = ['p1', 'p2', 'hi', 'goal', 'mid', 'solved', 'ans', 'pz.hint1', 'pz.hintText', 'pz.showing', 'pz.answerDone'];
  const WK = WHY.KEYS.filter(k => k !== 'answer'), RED = { ja: /赤い印/, en: /red mark/ }, NOMARK = ['wEnd', 'wLast'];
  for (const L of LANGS) {
    for (const k of OWN.concat(WK)) {
      const own = A.T[L] && A.T[L][k], vs = own == null ? [] : [].concat(own);
      if (!vs.length && OWN.includes(k)) { add(`⑨ latrunculi-pz.js ${L}.${k} missing`); continue; }
      const want = WK.includes(k) ? ph(WHY.T.ja[k]) : ph([].concat(A.T.ja[k])[0]);
      const all = vs.length ? vs : [A.text(L, k, 0, null)];
      all.forEach((x, j) => {
        if (x == null || !String(x).trim()) { add(`⑨ latrunculi-pz.js ${L}.${k} empty`); return; }
        if (ph(x) !== want) add(`⑨ latrunculi-pz.js ${L}.${k}[${j}] placeholders ${ph(x) || '-'} ≠ ${want || '-'}`);
        if (RED[L] && WK.includes(k) && vs.length) { const red = RED[L].test(x); if (NOMARK.includes(k) ? red : !red) add(`⑦ latrunculi-pz.js ${L}.${k}[${j}] ${red ? 'speaks of a red mark that is not there' : 'does not name the red mark'}`); }
        if (k === 'mid' && /(いいね|お見事|正解|さすが|ナイス|good|great|well done)/i.test(x)) add(`追91 latrunculi-pz.js ${L}.mid[${j}] praises on the way`);
      });
    }
  }
  const pz = pzSrc != null ? pzSrc : fs.readFileSync(path.join(ROOT, 'atlas/puzzles.js'), 'utf8'), lz = lzSrc != null ? lzSrc : fs.readFileSync(path.join(ROOT, 'atlas/lazy.js'), 'utf8');
  if (!/async function ltMoved[\s\S]{0,1400}W\.facts\(/.test(pz)) add('⑨ atlas/puzzles.js ltMoved does not say LatrPzWhy facts');
  if (!/"latrunculi": \[[^\]]*latrunculi\/pzwhy\.js[^\]]*games\/latrunculi-pz\.js/.test(lz)) add('⑨ atlas/lazy.js does not load latrunculi/pzwhy.js and games/latrunculi-pz.js for latrunculi');
  return out;
}
const KINDS = {};
function verify(opt = {}) {
  const file = opt.file || path.join(ROOT, 'latrunculi/puzzles.json');
  const D = opt.data || JSON.parse(fs.readFileSync(file, 'utf8'));
  const out = whyWords().concat(texts3d(opt.pz3d, opt.pzSrc)), rows = {};
  // ⑨ the 2D says the pzwhy words, keeps the 詰め rule (lesson-verify-pz88.js lists latrunculi as DONE)
  const app = opt.app != null ? opt.app : fs.readFileSync(path.join(ROOT, 'latrunculi/app.js'), 'utf8');
  if (!/LatrPzWhy/.test(app) || !/W\.facts\(/.test(app)) out.push({ step: 'all', q: 0, msg: '⑨ latrunculi/app.js puzzleMove does not say the pzwhy words' });
  if (!/pzwhy\.js/.test(fs.readFileSync(path.join(ROOT, 'latrunculi/index.html'), 'utf8'))) out.push({ step: 'all', q: 0, msg: '⑨ latrunculi/index.html does not load pzwhy.js' });
  if (/勝率|win rate|evaluation|評価値/i.test(JSON.stringify(D))) out.push({ step: 'all', q: 0, msg: '追16 a win rate / evaluation in the data' });
  const all = [];
  for (const T of D.themes) {
    if (opt.only && T.id !== opt.only) continue;
    rows[T.id] = [];
    T.puzzles.forEach((P, j) => {
      const r = analyze(P, T.id); rows[T.id].push(r);
      r.iss.forEach(msg => out.push({ step: T.id, q: j + 1, msg }));
      all.push({ id: T.id + '-' + (j + 1), b: P.s.b, side: P.s.side, line: (r.line || []).map(s => [s.b, s.side]) }); for (const [k, v] of Object.entries(r.kinds || {})) KINDS[k] = (KINDS[k] || 0) + v;
    });
    // ⑥
    const ds = rows[T.id].map(r => r.d || 0), st = [];
    for (let i = 0; i < ds.length; i += STAGE) { const a = ds.slice(i, i + STAGE); st.push(a.reduce((x, y) => x + y, 0) / a.length); }
    for (let i = 1; i < st.length; i++) if (st[i] < st[i - 1]) out.push({ step: T.id, q: i * STAGE + 1, msg: `⑥ stage ${i + 1} mean d ${st[i].toFixed(1)} < stage ${i} ${st[i - 1].toFixed(1)}` });
    if (st.length > 1 && !(st[st.length - 1] > st[0])) out.push({ step: T.id, q: 0, msg: '⑥ the last stage is not harder than the first' });
    rows[T.id].stages = st;
  }
  // ⑤ the puzzles against each other (and their main lines) and the lesson problems
  let les = [];
  try { const LJ = JSON.parse(fs.readFileSync(path.join(ROOT, 'latrunculi/lessons.json'), 'utf8')); for (const c of LJ.steps || []) for (const q of (c.problems || [])) if (q.s && q.s.b) les.push({ id: 'lesson ' + c.id, b: q.s.b, side: q.s.side }); } catch (e) {}
  if (!opt.only) for (let i = 0; i < all.length; i++) {
    const A = all[i];
    for (let k = i + 1; k < all.length; k++) { const Bp = all[k], dd = near(A.b, A.side, Bp.b, Bp.side); if (dd <= 4) out.push({ step: A.id.split('-')[0], q: +A.id.split('-')[1], msg: `⑤ ${dd} squares from ${Bp.id}` }); }
    for (const Lq of les) { const dd = near(A.b, A.side, Lq.b, Lq.side); if (dd <= 4) out.push({ step: A.id.split('-')[0], q: +A.id.split('-')[1], msg: `⑤ ${dd} squares from ${Lq.id}` }); }
    for (const Bp of all) { if (Bp === A) continue; for (const [b, s] of Bp.line) if (near(A.b, A.side, b, s) === 0) out.push({ step: A.id.split('-')[0], q: +A.id.split('-')[1], msg: `⑤ a position on ${Bp.id}'s main line` }); }
  }
  return opt.rows ? { out, rows, kinds: KINDS } : out;
}
function selftest() {   // broken copies of a smaller book (t2 · corner · double: 20 each, t3: 10) — the full book takes ~15 min
  const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'latrunculi/puzzles.json'), 'utf8')), bad = [];
  const cp = () => { const d = JSON.parse(JSON.stringify(D)); d.themes = d.themes.filter(T => T.id !== 't4'); d.themes.forEach(T => { T.puzzles = T.puzzles.slice(0, T.id === 't3' ? 10 : 20); }); return d; };
  const th = (d, id) => d.themes.find(T => T.id === id).puzzles;
  const FACTS0 = WHY.facts, AR0 = WHY.T.ar.wRun;
  const t = (name, f, re, extra, after) => { const d = cp(); f(d); const o = verify(Object.assign({ data: d }, extra || {})); if (after) after(); if (!o.some(x => re.test(x.msg))) bad.push(name); else console.log('detected: ' + name); };
  t('n off by one', d => { th(d, 't3')[0].n = 2; }, /④ n|①/);
  t('a duplicate (mirrored)', d => { const P = th(d, 't2'); const b = P[0].s.b; P[5].s = Object.assign({}, P[0].s, { b: Array.from({ length: 64 }, (_, i) => b[(i >> 3) * 8 + 7 - (i & 7)]).join('') }); }, /⑤/);
  t('the order (hard first)', d => { th(d, 't2').reverse(); }, /⑥/);
  t('a win rate in the data', d => { th(d, 't2')[0].msg = '勝率 60%'; }, /追16/);
  t('an easy position (the counter already enclosed)', d => { const P = th(d, 'corner')[0]; const a = P.s.b.split(''); const i = a.findIndex(c => c === (P.s.side === 1 ? 'w' : 'b')); a[i] = P.s.side === 1 ? 'H' : 'h'; P.s.b = a.join(''); }, /①|④|③/);
  t('the 2D does not say the words', () => {}, /⑨/, { app: '', only: 't2' });
  t('a wrong kind of words', () => { const f0 = WHY.facts; WHY.facts = o => { const f = f0(o); return f.k === 'wRun' ? Object.assign({}, f, { k: 'wHit' }) : f; }; }, /⑧/, { only: 't2' }, () => { WHY.facts = FACTS0; });
  t('a missing language', () => { delete WHY.T.ar.wRun; }, /⑨ ar\.wRun/, { only: 't2' }, () => { WHY.T.ar.wRun = AR0; });
  t('the 3D words: a fact naming no red mark', () => {}, /⑦ latrunculi-pz\.js ja\.wRun/, { only: 't2', pz3d: { T: { ja: { wRun: '相手は動きました。残り{n}手では取れません。' } }, text: () => 'x' } });
  t('the 3D does not say the facts', () => {}, /⑨ atlas\/puzzles\.js ltMoved/, { only: 't2', pzSrc: '' });
  t('the theme of double', d => { th(d, 'double')[0] = th(d, 't2')[0]; }, /④|⑤/);
  console.log(bad.length ? 'selftest NG: ' + bad.join(', ') : 'selftest OK (11 broken copies detected)');
  return bad;
}
module.exports = { verify, analyze, near, good, selftest, texts3d };
if (require.main === module) {
  const a = process.argv.slice(2), fi = a.indexOf('--file'), oi = a.indexOf('--only');
  if (a.includes('--selftest')) { process.exitCode = selftest().length ? 1 : 0; }
  else {
    const t0 = Date.now(), r = verify({ rows: true, file: fi >= 0 ? a[fi + 1] : undefined, only: oi >= 0 ? a[oi + 1] : undefined });
    r.out.forEach(x => console.log(`NG ${x.step} q${x.q}: ${x.msg}`));
    console.log('wrong moves by kind', JSON.stringify(r.kinds));
    if (a.includes('--rows')) for (const [k, v] of Object.entries(r.rows)) console.log(k, 'stages', v.stages.map(x => x.toFixed(1)).join(' '), 'good', v.map(x => x.good).join(''));
    const nq = Object.values(r.rows).reduce((s, v) => s + v.length, 0), badq = new Set(r.out.map(x => x.step + x.q)).size;
    console.log(`${nq - badq} / ${nq} OK (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    process.exitCode = r.out.length ? 1 : 0;
  }
}
