#!/usr/bin/env node
// (2026-11-27 担当C) Ludus latrunculorum lessons (latrunculi/lessons.json, Seneca rules; the 2D latrunculi/app.js okAnswer and the
// hint, later the 3D) — every problem of the 7 lessons, claude/lesson-quality.md ①〜⑨ and the 追N that bear on them, counted again on
// the board here (the engine's moves and E.effect; the replies played out), not taken from latrunculi/ls-facts.js:
//  ① ok = exactly the moves reaching the lesson's goal (b_block encloses · b_edge encloses an edge counter · b_corner a corner
//    counter · b_rescue frees your face-down counter · s_safe leaves no reply enclosing one of yours · s_double encloses 2+ ·
//    s_two encloses and every reply leaves an enemy counter face down for your next turn, and = the engine's goalGood 2 'take');
//    best ∈ ok; ls-facts.js goal() gives the same set.
//  ② one right move (s_safe two at most, all accepted); 追72 right moves ≤ 1/3 of the legal moves.
//  ③ 8 legal moves or more, 5 wrong ones or more.
//  ④ the theme: b_block / b_edge / b_corner no wrong move encloses anything (the only enclosure is the theme's); b_rescue exactly one
//    face-down counter, yours; s_safe exactly one counter of yours under threat and no enclosure now; s_double a wrong move encloses
//    one (the single enclosure that tempts); s_two a wrong move encloses too (the enclosure that is rescued).
//    追17・追52 the hint's marks (ls-facts.js marks) are 2+ squares (s_safe 1: the threatened counter), none of them the answer's own
//    counter, and 3+ legal moves go next to them (b_corner: within two steps of the corner), 2+ of them wrong.
//  ⑤ no two positions (these problems, the 250 puzzles) within 4 squares under the 8 symmetries × the colours as they are / swapped.
//  ⑥ easy → hard in each lesson: d = wrong + 2 × the wrong moves next to the marks, never going down, the last above the first.
//  ⑦⑧ every wrong move: the words of ls-facts.js wrong() hold when the moves are played here — ls.ng.none / ls.s_two.ng0 enclose
//    nothing, ls.s_double.ng1 exactly one ({t}), ls.b_rescue.ng the counter {y} still face down and the opponent's turn starts
//    with taking it, ls.s_safe.ng and the tail ls.ng.reply: {r} is the opponent's legal move after it and leaves your {y} face
//    down, ls.s_two.ng: {t} enclosed, after {r} no enemy counter is face down and {r} encloses your {h}; s_safe every wrong move
//    has such a reply; no off-theme enclosure (ls.ng.other).
//  ⑨ the 2D: latrunculi/index.html loads ls-facts.js (after engine.js) and i18n-lt-ls.js (after i18n-lt-more.js); app.js reads
//    LatrLsFacts.wrong for the words and LatrLsFacts.marks for the hint; the 14 languages have every key with its placeholders;
//    追66・追68 no closeness word on these 0-point words; 追16 no rate / evaluation in the data or the words.
//  3D (atlas/ls-latrunculi.js, READY = the 7 lessons): ⑧ every legal move's words, every line of the lists (k 0〜5): ja praise on a
//    right move and the lesson's point (2個 / 辺 / 隅 / 助け …), on a wrong one no praise (追20), no closeness word (追66), the green
//    answer named, the words of its kind (何も挟めない / 1個だけ / 取られ / 挟み返 …), the gold move named exactly when there is a
//    reply to show (and that reply encloses one of yours on the board); no placeholder left; ⑨ the 13 other languages: your move
//    marked red, the reply gold when there is one, no square name (the 3D board has none); the ja questions, hints and intros name
//    no square.
// Usage: node tools/lesson-verify-latrunculi-ls.js [--selftest]   (also: node tools/lesson-verify.js latrunculiLs)
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const E = require(path.join(ROOT, 'latrunculi/engine.js')); E.setRule('seneca');
const F = require(path.join(ROOT, 'latrunculi/ls-facts.js')).make(E);
const LS3 = require(path.join(ROOT, 'atlas/ls-latrunculi.js'));
const LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
const IDS = ['b_block', 'b_edge', 'b_corner', 'b_rescue', 's_safe', 's_double', 's_two'];
const KEYS = { 'ls.ng.none': ['x'], 'ls.ng.reply': ['r', 'y'], 'ls.b_rescue.ng': ['x', 'y'], 'ls.s_safe.ng': ['x', 'r', 'y'], 'ls.s_double.ng1': ['x', 't'], 'ls.s_two.ng': ['x', 't', 'r', 'h'], 'ls.s_two.ng0': ['x'] };
const NEAR = /おしい|惜しい|いい線|あと少し|あと一歩|\bClose\b|\bAlmost\b|\bCasi\b|\bPresque\b|\bQuase\b|\bKnapp\b|Почти|Hampir|Az kaldı|아깝|差一点|差一點|लगभग|قريب/i;
const CORN = new Set([0, 7, 56, 63]);
const isEdge = x => !CORN.has(x) && ((x >> 3) % 7 === 0 || (x & 7) % 7 === 0);
const sqI = nm => (8 - +nm[1]) * 8 + 'abcdefgh'.indexOf(nm[0]);
const nbrs = x => { const r = x >> 3, c = x & 7, o = []; if (r) o.push(x - 8); if (r < 7) o.push(x + 8); if (c) o.push(x - 1); if (c < 7) o.push(x + 1); return o; };
// the board's own counts (here, not ls-facts.js): what a move turns face down / frees
const downNow = (pos, q, p) => { const o = []; for (let i = 0; i < 64; i++) if (q.sq[i] === p && q.inc[i] && !(pos.sq[i] === p && pos.inc[i])) o.push(i); return o; };
const enclosedBy = (pos, m) => downNow(pos, pos.clone().play(m), 3 - pos.turn);
const encMine = (q, r, me) => downNow(q, q.clone().play(r), me);
function goalHere(id, pos) {
  const me = pos.turn, o = 3 - me, out = [];
  for (const m of pos.moves()) {
    const q = pos.clone().play(m), enc = enclosedBy(pos, m); let g;
    if (id === 'b_block') g = enc.length > 0;
    else if (id === 'b_edge') g = enc.some(isEdge);
    else if (id === 'b_corner') g = enc.some(x => CORN.has(x));
    else if (id === 'b_rescue') g = [...Array(64).keys()].some(i => pos.sq[i] === me && pos.inc[i] && q.sq[i] === me && !q.inc[i]);
    else if (id === 's_double') g = enc.length >= 2;
    else if (id === 's_safe') g = q.moves().every(r => !encMine(q, r, me).length);
    else if (id === 's_two') g = enc.length > 0 && q.moves().every(r => { const q2 = q.clone().play(r); for (let i = 0; i < 64; i++) if (q2.sq[i] === o && q2.inc[i]) return true; return false; });
    if (g) out.push(m);
  }
  return out;
}
const SYM = []; for (let k = 0; k < 8; k++) SYM.push(i => { let r = i >> 3, c = i & 7; if (k & 1) c = 7 - c; if (k & 2) r = 7 - r; if (k & 4) [r, c] = [c, r]; return r * 8 + c; });
const norm = b => b.replace(/[hvc]/g, 'b').replace(/[HVC]/g, 'w');
function variants(b) { const out = []; b = norm(b); for (const f of SYM) { const a = Array(64); for (let i = 0; i < 64; i++) a[f(i)] = b[i]; const s = a.join(''); out.push(s, s.replace(/[bw]/g, x => x === 'b' ? 'w' : 'b')); } return out; }
const dist = (a, b) => { let n = 0; for (let i = 0; i < 64; i++) if (a[i] !== b[i]) n++; return n; };
function loadI18n(src) {
  const w = { I18N: {} }; for (const l of LANGS) w.I18N[l] = {};
  new Function('window', 'I18N', src)(w, w.I18N); return w.I18N;
}
function verify(opt) {
  opt = opt || {};
  const out = [], add = (id, q, msg) => out.push({ id, q, msg });
  const L = opt.lessons || JSON.parse(fs.readFileSync(path.join(ROOT, 'latrunculi/lessons.json'), 'utf8'));
  const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'latrunculi/puzzles.json'), 'utf8'));
  const pool = []; PZ.themes.forEach(T => T.puzzles.forEach((P, j) => pool.push({ tag: 'puzzle ' + T.id + '#' + (j + 1), b: norm(P.s.b) })));
  L.steps.forEach(st => st.problems.forEach((P, j) => pool.push({ tag: st.id + '#' + (j + 1), b: norm(P.s.b), st, j })));
  const ids = L.steps.map(s => s.id); for (const id of IDS) if (!ids.includes(id)) add(id, 0, 'the lesson is missing');
  for (const st of L.steps) {
    const id = st.id; if (!IDS.includes(id)) { add(id, 0, 'not a lesson this check knows'); continue; }
    if (st.problems.length !== 5) add(id, 0, `${st.problems.length} problems (5)`);
    const ds = [];
    st.problems.forEach((P, j) => {
      const q1 = j + 1, pos = E.Pos.from(P.s), me = pos.turn, ms = pos.moves(), ok = P.ok || [];
      if (Object.keys(P).some(k => ['sc', 'rate', 'eval', 'msg'].includes(k))) add(id, q1, '追16 a rate / evaluation in the data');
      // ①
      const G = goalHere(id, pos), same = (a, b) => a.length === b.length && a.every(x => b.includes(x));
      if (!same(G, ok)) add(id, q1, `① ok ${ok.map(m => ms.includes(m) ? E.name(pos, m) : m).join(' ')} ≠ the goal's moves ${G.map(m => E.name(pos, m)).join(' ')}`);
      if (!ok.includes(P.best)) add(id, q1, '① best is not in ok');
      if (!same(F.goal(id, pos), G)) add(id, q1, '① ls-facts.js goal() differs from the board');
      if (id === 's_two') { const g = E.goalGood(P.s, [], 2, { goal: 'take' }, 'seneca', 400000); if (!g || !same(g, G)) add(id, q1, `① the engine's goalGood (2, take) ${(g || []).map(m => E.name(pos, m)).join(' ')} ≠ ok`); }
      // ②③
      if (G.length > (id === 's_safe' ? 2 : 1) || !G.length) add(id, q1, `② ${G.length} right moves`);
      if (G.length * 3 > ms.length) add(id, q1, `追72 ${G.length} right of ${ms.length} legal`);
      if (ms.length < 8 || ms.length - G.length < 5) add(id, q1, `③ ${ms.length} legal, ${ms.length - G.length} wrong`);
      // ④
      const wrongs = ms.filter(m => !G.includes(m));
      if (['b_block', 'b_edge', 'b_corner'].includes(id) && wrongs.some(m => enclosedBy(pos, m).length)) add(id, q1, '④ a wrong move encloses too');
      if (id === 'b_rescue') { const d = [...Array(64).keys()].filter(i => pos.sq[i] && pos.inc[i]); if (d.length !== 1 || pos.sq[d[0]] !== me) add(id, q1, `④ face-down counters ${d.map(E.sqName).join(',')} (one of yours)`); }
      if (id === 's_safe') {
        const q = pos.clone(); q.side ^= 1; q.last = [-1, -1]; const th = new Set(); for (const r of q.movesAfter(-1, [])) for (const i of encMine(q, r, me)) th.add(i);
        if (th.size !== 1) add(id, q1, `④ ${th.size} counters under threat (1)`);
        if (ms.some(m => enclosedBy(pos, m).length)) add(id, q1, '④ an enclosure is on the board now');
      }
      if (id === 's_double' && !wrongs.some(m => enclosedBy(pos, m).length === 1)) add(id, q1, '④ no wrong move encloses one');
      if (id === 's_two' && !wrongs.some(m => enclosedBy(pos, m).length)) add(id, q1, '④ no wrong move encloses');
      const M = F.marks(id, pos), Ms = new Set(M), near = new Set();
      for (const i of M) for (const k of nbrs(i)) { near.add(k); if (id === 'b_corner') for (const z of nbrs(k)) near.add(z); }
      const T = ms.filter(m => near.has(E.mTo(m)) || Ms.has(E.mFrom(m))), tw = T.filter(m => !G.includes(m)).length;
      if (M.length < (id === 's_safe' ? 1 : 2)) add(id, q1, `追52 the hint lights ${M.length} squares`);
      if (id !== 's_safe' && G.some(m => Ms.has(E.mFrom(m)))) add(id, q1, '追52 the hint lights the answer\'s own counter');
      if (T.length < 3 || tw < 2) add(id, q1, `追17 ${T.length} moves next to the hint's marks, ${tw} wrong (3+, 2+)`);
      if (F.touch(id, pos).length !== T.length) add(id, q1, '追17 ls-facts.js touch() differs');
      ds.push(wrongs.length + 2 * tw);
      // ⑤
      const V = variants(P.s.b);
      for (const o of pool) { if (o.st === st && o.j === j) continue; if (o.st && (L.steps.indexOf(o.st) < L.steps.indexOf(st) || (o.st === st && o.j < j))) continue; let dm = 99; for (const v of V) dm = Math.min(dm, dist(v, o.b)); if (dm <= 4) add(id, q1, `⑤ ${dm} squares from ${o.tag}`); }
      // ⑦⑧ every wrong move
      for (const m of wrongs) {
        const w = F.wrong(id, pos, m), x = E.name(pos, m), q = pos.clone().play(m), enc = enclosedBy(pos, m), tag = `⑦ ${x}`;
        if (!KEYS[w.k]) { add(id, q1, `${tag}: words ${w.k}`); continue; }
        if (w.v.x !== x) add(id, q1, `${tag}: {x} ${w.v.x}`);
        const reply = (rn, yn) => { const r = q.moves().find(z => E.name(q, z) === rn); if (r === undefined) return false; return encMine(q, r, me).includes(sqI(yn)); };
        if (w.k === 'ls.ng.none' || w.k === 'ls.s_two.ng0') { if (enc.length) add(id, q1, `${tag}: says no enclosure, encloses ${enc.map(E.sqName)}`); }
        if (w.k === 'ls.s_double.ng1' && (enc.length !== 1 || E.sqName(enc[0]) !== w.v.t)) add(id, q1, `${tag}: says one ({t} ${w.v.t}), encloses ${enc.map(E.sqName)}`);
        if (w.k === 'ls.b_rescue.ng') { const y = sqI(w.v.y); if (!(q.sq[y] === me && q.inc[y]) || !q.removable().includes(y)) add(id, q1, `${tag}: {y} ${w.v.y} not face down / not taken first`); }
        if (w.k === 'ls.s_safe.ng' && !reply(w.v.r, w.v.y)) add(id, q1, `${tag}: {r} ${w.v.r} does not enclose {y} ${w.v.y}`);
        if (w.k === 'ls.s_two.ng') {
          const r = q.moves().find(z => E.name(q, z) === w.v.r);
          if (!enc.length || E.sqName(enc[0]) !== w.v.t) add(id, q1, `${tag}: {t} ${w.v.t} not enclosed`);
          if (r === undefined) add(id, q1, `${tag}: {r} ${w.v.r} is not a reply`);
          else { const q2 = q.clone().play(r); let dn = 0; for (let i = 0; i < 64; i++) if (q2.sq[i] === 3 - me && q2.inc[i]) dn++; if (dn) add(id, q1, `${tag}: after {r} ${w.v.r} an enemy counter is still face down`); if (!encMine(q, r, me).includes(sqI(w.v.h || 'a0'))) add(id, q1, `${tag}: {r} does not enclose {h} ${w.v.h}`); }
        }
        if (id === 's_safe' && w.k !== 'ls.s_safe.ng') add(id, q1, `${tag}: words ${w.k}`);
        if (w.tail) { if (w.tail.k !== 'ls.ng.reply' || !reply(w.tail.v.r, w.tail.v.y)) add(id, q1, `${tag}: the tail's {r} ${w.tail.v.r} does not enclose {y} ${w.tail.v.y}`); }
        else if (!['ls.b_rescue.ng', 'ls.s_safe.ng', 'ls.s_two.ng'].includes(w.k) && q.moves().some(r => encMine(q, r, me).length)) add(id, q1, `${tag}: the opponent can enclose after it, the words do not say so`);
      }
    });
    for (let k = 1; k < ds.length; k++) if (ds[k] < ds[k - 1]) add(id, k + 1, `⑥ d ${ds[k]} after ${ds[k - 1]}`);
    if (ds.length > 1 && ds[ds.length - 1] <= ds[0]) add(id, 0, `⑥ the last d ${ds[ds.length - 1]} is not above the first ${ds[0]}`);
  }
  // 3D (atlas/ls-latrunculi.js)
  const LS = opt.ls3 || LS3, JA = LS.JA;
  if (IDS.some(id => !LS.READY.includes(id))) add('3D', 0, `⑨ READY ${LS.READY.join(' ')} lacks a lesson`);
  const PRAISE = /正解|お見事|さすが|いいね|すごい|やったね/, SQ = /\b[a-h][1-8]\b/;
  const NEED = { none: /挟めない|駒がない|裏返らない|そろわない|埋まらない|できない|いない|表のまま/, rescue: /裏返ったまま|取られ|消えない|届かない|そのまま/, safe: /挟まれ|裏返/, double1: /1個|1つの方向/, two: /挟み返|表に戻|助け/, two0: /挟めない|挟む手じゃない|裏返らない|挟みができない|取れる駒(が|も)ない/ };
  const POINT = { b_block: /挟|裏返|両どなり|両側/, b_edge: /辺/, b_corner: /隅/, b_rescue: /味方|助け|挟み返|挟んでいる側/, s_safe: /挟め(ない|る駒はない)|挟まれ|挟む手は0|挟む手がなくなった/, s_double: /2個|2つの方向/, s_two: /助けられない|確実|必ず|挟み返す手がない|残る|きっちり取れる|助けに来られる駒がいない/ };
  for (const k of ['intro', 'ask', 'askLast', 'hint', 'w']) for (const id of IDS) if (!JA[k] || !JA[k][id]) add(id, 0, `⑧ 3D no ja ${k}`);
  for (const id of IDS) for (const k of ['intro', 'ask', 'askLast', 'hint']) for (const t of [].concat(JA[k][id] || [])) if (SQ.test(t.replace(/<[^>]+>/g, ''))) add(id, 0, `⑧ 3D ja ${k}: a square name on the 3D board — ${t}`);
  for (const st of L.steps) {
    const id = st.id; if (!IDS.includes(id)) continue;
    st.problems.forEach((P, j) => {
      const q1 = j + 1, pos = E.Pos.from(P.s), me = pos.turn;
      for (const m of pos.moves()) {
        const right = (P.ok || []).includes(m), x = E.name(pos, m), q = pos.clone().play(m);
        for (let k = 0; k < 6; k++) {
          const r = LS.sayText(id, P, m, 'ja', k), h = r.html, tx = h.replace(/<[^>]+>/g, '');
          if (/\{\w+\}/.test(h)) add(id, q1, `⑧ 3D ja ${x}: a placeholder left — ${tx}`);
          if (SQ.test(tx)) add(id, q1, `⑧ 3D ja ${x}: a square name — ${tx}`);
          if (right) { if (!PRAISE.test(tx)) add(id, q1, `⑧ 3D ja ${x}: no praise on the right move`); if (!POINT[id].test(tx)) add(id, q1, `⑧ 3D ja ${x}: the words do not say the lesson's point — ${tx}`); continue; }
          const kind = LS.kindOf(id, r.w).replace(/^none_.*/, 'none');
          if (PRAISE.test(tx)) add(id, q1, `追20 3D ja ${x}: praise after a wrong move — ${tx}`);
          if (NEAR.test(tx)) add(id, q1, `追66 3D ja ${x}: a closeness word — ${tx}`);
          if (!/緑/.test(tx)) add(id, q1, `⑧ 3D ja ${x}: the green answer is not named — ${tx}`);
          if (!NEED[kind].test(tx)) add(id, q1, `⑧ 3D ja ${x} (${kind}): the words do not say it — ${tx}`);
          if ((r.rp != null) !== /金の手/.test(tx)) add(id, q1, `⑧ 3D ja ${x}: the gold move ${r.rp != null ? 'not named' : 'named without a reply'} — ${tx}`);
          if (r.rp != null && (!q.moves().includes(r.rp) || !encMine(q, r.rp, me).length)) add(id, q1, `⑦ 3D ${x}: the gold reply does not enclose a counter of yours`);
        }
        for (const l of LANGS) {
          if (l === 'ja') continue;
          const r = LS.sayText(id, P, m, l, 0), h = r.html, tx = h.replace(/<[^>]+>/g, '');
          if (!h || /\{\w+\}/.test(h)) add(id, q1, `⑨ 3D ${l} ${x}: missing words or a placeholder left`);
          if (SQ.test(tx)) add(id, q1, `⑨ 3D ${l} ${x}: a square name — ${tx}`);
          if (right) { if (!/ls-spot ok/.test(h)) add(id, q1, `⑨ 3D ${l} ${x}: the right move is not marked`); continue; }
          if (!/ls-spot ng/.test(h)) add(id, q1, `⑨ 3D ${l} ${x}: your move is not marked`);
          if ((r.rp != null) !== /ls-spot hl/.test(h)) add(id, q1, `⑨ 3D ${l} ${x}: the reply ${r.rp != null ? 'is not marked' : 'marked without one'}`);
        }
      }
    });
  }
  // ⑨ the 2D
  const html = opt.index || fs.readFileSync(path.join(ROOT, 'latrunculi/index.html'), 'utf8'), app = opt.app || fs.readFileSync(path.join(ROOT, 'latrunculi/app.js'), 'utf8');
  const at = s => html.indexOf(s);
  if (at('ls-facts.js') < 0 || at('ls-facts.js') < at('engine.js')) add('2D', 0, '⑨ index.html does not load ls-facts.js after engine.js');
  if (at('i18n-lt-ls.js') < 0 || at('i18n-lt-ls.js') < at('i18n-lt-more.js')) add('2D', 0, '⑨ index.html does not load i18n-lt-ls.js after i18n-lt-more.js');
  if (!/LatrLsFacts\.wrong\(|F\.wrong\(s\.id/.test(app) || !/LatrLsFacts\.marks\(/.test(app)) add('2D', 0, '⑨ app.js does not read LatrLsFacts.wrong / marks');
  let I; try { I = loadI18n(opt.i18n || fs.readFileSync(path.join(ROOT, 'latrunculi/i18n-lt-ls.js'), 'utf8')); } catch (e) { add('2D', 0, '⑨ i18n-lt-ls.js does not load: ' + e.message); I = {}; }
  for (const l of LANGS) for (const k in KEYS) {
    const v = I[l] && I[l][k]; if (!v) { add('2D', 0, `⑨ ${l} has no ${k}`); continue; }
    for (const p of KEYS[k]) if (!v.includes('{' + p + '}')) add('2D', 0, `⑨ ${l} ${k} has no {${p}}`);
    if (NEAR.test(v)) add('2D', 0, `追66 ${l} ${k} 「${v}」 says the move was close`);
    if (/%|勝率/.test(v)) add('2D', 0, `追16 ${l} ${k} has a rate`);
  }
  return { out };
}
if (require.main === module) {
  if (process.argv.includes('--selftest')) {
    const base = JSON.parse(fs.readFileSync(path.join(ROOT, 'latrunculi/lessons.json'), 'utf8')), cp = () => JSON.parse(JSON.stringify(base));
    const i18 = fs.readFileSync(path.join(ROOT, 'latrunculi/i18n-lt-ls.js'), 'utf8'), html = fs.readFileSync(path.join(ROOT, 'latrunculi/index.html'), 'utf8'), app = fs.readFileSync(path.join(ROOT, 'latrunculi/app.js'), 'utf8');
    const T = [
      ['the answer changed to a wrong move', () => { const L = cp(), P = L.steps[0].problems[0], pos = E.Pos.from(P.s), m = pos.moves().find(x => !P.ok.includes(x)); P.ok = [m]; P.best = m; return { lessons: L }; }, /①/],
      ['a wrong move added to ok', () => { const L = cp(), P = L.steps[4].problems[0], pos = E.Pos.from(P.s), m = pos.moves().find(x => !P.ok.includes(x)); P.ok.push(m); return { lessons: L }; }, /①/],
      ['s_two ok made the literal set of the old problem', () => { const L = cp(), O = JSON.parse(fs.readFileSync(path.join(ROOT, 'latrunculi/tools/ls-old-s_two1.json'), 'utf8')); L.steps[6].problems[0] = O; return { lessons: L }; }, /①|②/],
      ['two problems swapped (easy → hard)', () => { const L = cp(), p = L.steps[1].problems; [p[0], p[4]] = [p[4], p[0]]; return { lessons: L }; }, /⑥/],
      ['a problem copied into another lesson slot', () => { const L = cp(); L.steps[0].problems[1] = JSON.parse(JSON.stringify(L.steps[0].problems[0])); return { lessons: L }; }, /⑤/],
      ['a language misses a key', () => ({ i18n: i18.replace("'ls.s_two.ng0': '<b>{x}</b> encloses", "'ls.s_two.xx': '<b>{x}</b> encloses") }), /⑨ en has no ls.s_two.ng0/],
      ['a placeholder lost', () => ({ i18n: i18.replace("で、あなたの {y} の駒を挟めます", "で、あなたの駒を挟めます") }), /has no \{y\}/],
      ['a closeness word on a wrong move', () => ({ i18n: i18.replace("'ls.ng.none': '<b>{x}</b> では", "'ls.ng.none': 'おしい！ <b>{x}</b> では") }), /追66/],
      ['index.html without ls-facts.js', () => ({ index: html.replace('ls-facts.js', 'ls-factz.js') }), /⑨ index.html/],
      ['app.js not reading the facts', () => ({ app: app.replace(/LatrLsFacts\.marks\(/g, 'LatrLsFacts.markz(') }), /⑨ app.js/],
      ['3D: a ja wrong line without the green answer', () => { const J = JSON.parse(JSON.stringify(LS3.JA)); J.n.rescue[0] = '赤の手では、挟まれた味方は裏返ったまま。'; return { ls3: Object.assign({}, LS3, { JA: J, sayText: (...a) => { const o = LS3.JA.n.rescue[0]; LS3.JA.n.rescue[0] = J.n.rescue[0]; try { return LS3.sayText(...a); } finally { LS3.JA.n.rescue[0] = o; } } }) }; }, /the green answer is not named/],
      ['3D: the gold reply dropped from the words', () => ({ ls3: Object.assign({}, LS3, { sayText: (...a) => { const r = LS3.sayText(...a); return Object.assign({}, r, { html: r.html.replace(/金の手/g, '次の手').replace(/ls-spot hl/g, 'ls-spot xx') }); } }) }), /the gold move not named|reply is not marked/],
      ['3D: a square name in another language', () => ({ ls3: Object.assign({}, LS3, { sayText: (id, P, u, l, k) => { const r = LS3.sayText(id, P, u, l, k); return l === 'en' ? Object.assign({}, r, { html: r.html + ' (c5)' }) : r; } }) }), /⑨ 3D en .*square name/],
      ['3D: a lesson left out of READY', () => ({ ls3: Object.assign({}, LS3, { READY: LS3.READY.slice(1) }) }), /READY/],
    ];
    let bad = 0;
    for (const [name, mk, re] of T) { const r = verify(mk()).out; const hit = r.some(o => re.test(o.msg)); console.log((hit ? 'detects ' : 'MISSES  ') + name + (hit ? '' : ' — ' + r.slice(0, 3).map(o => o.msg).join(' / '))); if (!hit) bad++; }
    const clean = verify().out; console.log(clean.length ? 'the data itself is NG' : 'the data itself is OK');
    process.exit(bad || clean.length ? 1 : 0);
  }
  const { out } = verify();
  let n = 0; const L = JSON.parse(fs.readFileSync(path.join(ROOT, 'latrunculi/lessons.json'), 'utf8')); L.steps.forEach(s => n += s.problems.length);
  for (const o of out) console.log(`NG ${o.id} q${o.q} ${o.msg}`);
  const badQ = new Set(out.filter(o => o.q).map(o => o.id + '#' + o.q));
  console.log(`${out.length ? 'NG' : 'OK'} latrunculi lessons: ${n - badQ.size} of ${n} problems pass` + (out.length ? `, ${out.length} findings` : ''));
  process.exit(out.length ? 1 : 0);
}
module.exports = { verify };
