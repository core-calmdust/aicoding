// patolli/lessons.json・lux.json の点検（node tools/check_lessons.js）。
//  - カテゴリのレッスンがすべてあり、各レッスンに準備（実演＋練習）と採点5問、ヒント2つ、豆知識がある
//  - 手の問題：正解は合法で、2投げ先の勝率で1位（差 0.04 以上）、3投げ先でも1位。誤答の説明がすべての手にある。実演の手順が指せる
//  - 選ぶ問題：答えの番号が選択肢の中。確率の答えはエンジンの PROB と合う
//  - 文言はすべて ja / en
//  - 準備（ramp）も採点問題も、画面（app-learn.js）の進め方で最後まで進める：準備の種類が app-learn.js の RAMP_KINDS にあり、
//    手の問題は目（n）と正解の手があり、選ぶ問題は選択肢と答えがある（2026-11-16：準備の「選ぶ問題」を画面が出せず進めなくなっていた）
const C = require('./learn_common.js'), E = C.E, L = require('../lessons.json'), X = require('../lux.json'), assert = require('assert');
const two = (o, w) => { assert(o && typeof o.ja === 'string' && o.ja && typeof o.en === 'string' && o.en, 'text ja/en: ' + w); };
for (const k in L.ui) two(L.ui[k], 'ui.' + k); for (const k in L.msg) two(L.msg[k], 'msg.' + k);
assert.deepStrictEqual(L.score, { per: 20, pass: 75, hint: [16, 12], retry: 10, answer: 0 });
let nP = 0;
// 画面が進められる準備の種類（app-learn.js の RAMP_KINDS を読む。画面の実装と食い違ったらここで止まる）
const SRC = require('fs').readFileSync(require('path').join(__dirname, '..', 'app-learn.js'), 'utf8');
const RK = (SRC.match(/const RAMP_KINDS = \[([^\]]*)\]/) || [])[1]; assert(RK, 'app-learn.js: RAMP_KINDS が見つかりません');
const RAMP_KINDS = RK.split(',').map(x => x.trim().replace(/['"]/g, '')).filter(Boolean);
assert(!/!ramp && it\.kind === 'choice'/.test(SRC), 'app-learn.js: 選ぶ問題を準備（ramp）で出せない書き方が残っています');
// その問題を画面で解き終えられるか：手の問題＝目があり、正解の手がその目で指せる／選ぶ問題＝選択肢が2つ以上で答えがその中
const completable = (it, id) => {
  if (it.kind === 'choice') { assert(Array.isArray(it.opts) && it.opts.length >= 2 && Number.isInteger(it.ans) && it.ans >= 0 && it.ans < it.opts.length, 'choice cannot be answered: ' + id); return; }
  assert(it.n != null && it.s && Array.isArray(it.ok) && it.ok.length, 'move problem without a throw / answer: ' + id);
  const ms = E.legalMoves(C.unpack(it.s), it.n); assert(it.ok.some(a => ms.some(m => m.from === a[0] && m.to === a[1])), 'answer cannot be played: ' + id);
};
const moveItem = (it, id, scored) => {
  const st = C.unpack(it.s), ms = E.legalMoves(st, it.n); assert(ms.length >= 2, 'moves ' + id);
  for (const a of it.ok) assert(ms.some(m => m.from === a[0] && m.to === a[1]), 'legal ' + id);
  const e2 = E.evaluate(st, it.n, 2), e3 = E.evaluate(st, it.n, 3);
  assert(it.ok.some(a => a[0] === e2[0].move.from), 'best d2 ' + id); assert(it.ok.some(a => a[0] === e3[0].move.from), 'best d3 ' + id);
  const rest = e2.filter(e => !it.ok.some(a => a[0] === e.move.from)); assert(rest.length && e2[0].wp - rest[0].wp >= 0.04 - 1e-9, 'gap ' + id);
  if (scored) { assert(it.best && it.ok.some(a => a[0] === it.best[0] && a[1] === it.best[1]), 'best ' + id); assert(L.msg[it.why[0]], 'why ' + id); for (const e of rest) assert(it.ng[String(e.move.from)] && L.msg[it.ng[String(e.move.from)][0]], 'ng ' + id); }
};
for (const c of L.cats) { two(c.name, 'cat'); for (const id of c.steps) assert(L.steps.some(s => s.id === id), 'missing step ' + id); }
for (const s of L.steps) {
  two(s.title, s.id); two(s.tip, s.id); two(s.body, s.id); assert(s.hints.length === 2); s.hints.forEach(h => two(h, s.id + ' hint'));
  assert(L.cats.some(c => c.steps.includes(s.id)), 'not in a category: ' + s.id);
  assert(X.lessons[s.id] && X.lessons[s.id].trivia, 'lux trivia ' + s.id); two(X.lessons[s.id].trivia, 'trivia ' + s.id);
  assert(s.diagram && s.diagram.s, 'diagram ' + s.id); assert(s.ramp.length >= 2 && s.ramp[0].k === 'explain' && s.ramp[1].k === 'try', 'ramp ' + s.id);
  assert.strictEqual(s.problems.length, 5, 'five problems ' + s.id);
  s.ramp.forEach((r, ri) => {
    two(r.t, s.id + ' ramp');
    const rk = r.k === 'explain' ? 'explain' : r.k + ':' + (r.kind === 'choice' ? 'choice' : 'move');
    assert(RAMP_KINDS.includes(rk), `ramp step the page cannot run (${rk}): ${s.id} ramp ${ri + 1}`);
    if (r.k !== 'explain') completable(r, s.id + ' ramp ' + (ri + 1));
    if (r.k === 'explain') { two(r.body, s.id + ' explain'); let st = C.unpack(r.s); for (const [f, to] of r.seq || []) { const m = E.legalMoves(st, r.n != null ? r.n : to - f).find(x => x.from === f && x.to === to); assert(m, 'seq ' + s.id); st = E.apply(st, m, r.n != null ? r.n : to - f).state; st.turn = 0; } }
    else { two(r.h, 'h'); two(r.g, 'g'); two(r.y, 'y'); if (r.kind === 'choice') { assert(r.ans >= 0 && r.ans < r.opts.length); r.opts.forEach(o => two(o, 'opt')); } else moveItem(r, s.id + ' try', false); }
  });
  s.problems.forEach((p, i) => { nP++; completable(p, s.id + ' #' + (i + 1)); if (p.kind === 'choice') { two(p.q, 'q'); p.opts.forEach(o => two(o, 'opt')); assert(p.ans >= 0 && p.ans < p.opts.length); assert(L.msg[p.why[0]], 'why'); } else moveItem(p, s.id + ' #' + (i + 1), true); });
  console.log(s.id.padEnd(6), s.rule.padEnd(8), 'ok');
}
// 確率の文と合っているか（1＝5/32、2・3＝10/32、4＝5/32、5個＝1/32）
assert.deepStrictEqual(E.PROB.map(x => Math.round(x * 32)), [1, 5, 10, 10, 5, 1]); assert.strictEqual(E.STEPS[5], 10);
two(X.ui.ja && { ja: X.ui.ja.howProbs, en: X.ui.en.howProbs }, 'lux ui');
console.log('check OK:', L.steps.length, 'lessons,', nP, 'scored problems');
