#!/usr/bin/env node
// (2026-11-25 担当C) Kōnane lessons on the 3D table (atlas/ls-konane.js READY) and in the 2D (konane/app.js okAnswer), checked on the
// board with a jump generator of this file (its own, not the engine's) — every problem of every READY lesson, ①〜⑨ and 追1〜:
//  ① ok = exactly the moves that reach the goal (b_double: take 2 or more in one move · b_win: the opponent has no jump after it);
//    best ∈ ok; the engine's legal moves = this file's jumps (from, to, stones taken).
//  ② one right move (ok has 1 move).   ③ 5 legal moves or more, 4 wrong ones or more.
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
//    one jump (no {j}: 追58); the warm-up's right move is a legal move of its board and its marks are squares of it (追14).
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
    if (vars[a].some(x => diff(pool[b].b, x) <= 4)) add(pool[a].id, pool[a].q, `⑤ within 4 squares of ${pool[b].id} #${pool[b].q}`);
  }
  const soft = (JA.soft || []).join(' ');
  if (/おしい|惜しい|あと一歩|あと少し|いい線/.test(soft)) add('ja', 0, '追66・追68 a 0-point move is told it was close (JA.soft)');
  for (const id of READY) {
    const st = LS.steps.find(s => s.id === id); if (!st) { add(id, 0, 'not in lessons.json'); continue; }
    const ds = [];
    st.problems.forEach((P, j) => {
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
      (r.ok || []).forEach(o => { if (!nm.includes(o)) add(id, -(i + 1), `追14 warm-up ${i + 1}: the right move ${o} is not a move of its board`); });
      if (!(r.look || []).length) add(id, -(i + 1), `追14 warm-up ${i + 1}: the second hint lights nothing`);
      (r.look || []).forEach(x => { if (!(x >= 1 && x <= r.s.b.length) || r.s.b[x - 1] === '.') add(id, -(i + 1), `追14 warm-up ${i + 1}: the mark ${x} is not a stone`); });
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
    const need = { 'ls.b_double.why': ['{m}'], 'ls.b_double.ng.stop': ['{m}', '{x}'], 'ls.b_double.ng.other': ['{m}', '{x}'], 'ls.b_double.hint': [], 'ls.b_win.why': ['{m}'], 'ls.b_win.ng': ['{m}', '{x}', '{j}'], 'ls.b_win.ng1': ['{m}', '{x}'], 'ls.b_win.hint': [] };
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
    ['a warm-up answer that is no move (追14)', d => { st(d, 'b_win').ramp[0].ok = ['h6-f6-d6-b6']; }, /^追14/],
    ['「おしい」 for 0 points (追66)', null, /^追66/, { ja: Object.assign({}, LSK.JA, { soft: ['おしい！'] }) }],
    ['the 2D words without the facts (⑨)', null, /^⑨/, { app: 'function okAnswer() {}' }],
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
