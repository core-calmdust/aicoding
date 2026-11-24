// senet/tools/gen_lessons_v2.js — セネトのレッスン（senet/lessons.json）を厳しい基準で作り直す（2026-11-24、担当C、3D対応）。
// 旧 gen_learn.js（深さ3の評価・理由文に勝率）を置きかえる。claude/lesson-quality.md ①〜⑨・追1〜：
//   ① 正解＝期待値探索（評価ネット、深さ 2・3・4 の3つ）で最善。深さで最善・順位が変わる局面は使わない（追4）
//   ② どの深さでも2番目と 5% 以上の差  ③ 合法手3つ以上（準備の「やってみよう」は2つ以上）
//   ④ 主題の手（入れ替え・美の家・水の家を避ける・上がり）  ⑤ レッスン・準備・見本・ルール説明の局面と駒4つ以上ちがう
//   ⑥ 5問は2番目との差の大きい順  ⑦⑧ 不正解の手すべてに盤の事実の理由（入れ替えの取り逃し・上がりの取り逃し・美の家・水の家・
//   入れ替えられうる確率（相手の出目の数え上げ））。理由文に勝率の％を書かない（追16）。
// セネトでは「入れ替えられにくい手」が2番目と5%以上の差になる局面がない（入れ替えで失うのは数マスだけ：4000局・14万局面で0）。
// 旧「ペアと壁」「逃げる」「安全な手」「レース」の手の問題（勝率の差で選び、理由は勝率）は廃止し、確率と動ける駒を数える
// 選択問題（block・risk）にした。選択問題の答えはエンジンで数え直し、誤答それぞれに説明（ngo、追22）を付ける。
// 使い方: node senet/tools/gen_lessons_v2.js [games=4000]
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
E.setWasm(new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(path.join(__dirname, '..', 'engine_simd.wasm'))), { env: { now: () => performance.now() } }).exports);
const F = require('./senet_lessfacts.js'), X2 = require('./learn_text_v2.js');
const { UI } = require('./learn_text.js'), { CATS, TH, RAMP } = require('./learn_themes.js');
const LANGS = X2.LANGS, GAMES = +process.argv[2] || 4000;
const rng = E.mulberry32(20261124);
const fillQ = (T, v) => { const o = {}; for (const l of LANGS) o[l] = T[l].replace(/\{(\w+)\}/g, (_, x) => v[x]); return o; };
const MSG = X2.MSG;

// ---- 局面のプール（AI の深さ1＋でたらめ手の対局）、手番＝糸巻き（side 0）に正規化
const pool = [];
{
  const seen = new Set();
  for (let g = 0; g < GAMES; g++) {
    let s = E.newGame('std', g & 1), k = 0; const eps = 0.05 + 0.3 * rng();
    while (s.winner < 0 && k++ < 600) {
      const r = E.rollDice(rng), ms = E.legalMoves(s, r.n);
      if (ms.length >= 2) { const t = F.norm(s), kk = E.key(t) + '#' + r.n; if (!seen.has(kk)) { seen.add(kk); pool.push({ s: t, n: r.n, nm: ms.length }); } }
      let m = null; if (ms.length) { if (rng() < eps) m = ms[Math.floor(rng() * ms.length)]; else m = E.evaluate(s, r.n, { depth: 1 })[0].move; }
      s = E.apply(s, m, r.n).state;
    }
  }
}
console.error('pool', pool.length);
const used = F.tourStates(path.join(__dirname, '..', '..'));
const far = (s, n) => used.every(u => F.tokDiff(u, s, u.n, n) >= F.MIN_TOK);
const S = s => ({ rule: 'std', pos: s.pos.map(a => a.slice()), turn: 0 });
const CC = {};
function cands(th, minMoves) {
  const key = th + minMoves; if (CC[key]) return CC[key];
  const out = [];
  for (const p of pool) {
    if (p.nm < minMoves) continue;
    const s = F.st(p.s), ms = E.legalMoves(s, p.n); if (!ms.some(F.special)) continue;
    if (!p.e2) p.e2 = E.evaluate(s, p.n, { depth: 2 });
    if (p.e2[0].wp - p.e2[1].wp < F.MIN_GAP || !F.themeOk(s, p.n, p.e2[0].move, ms, th)) continue;
    if (th === 'water' && !ms.some(m => m.water && m.dest === 15)) continue;   // (ヒント「15へ戻る」と合う局面だけ)
    const r = F.judge(p.s, p.n, th, { depths: [2, 3], minMoves }); if (r.ok) out.push(Object.assign({ s: p.s, n: p.n }, r));
  }
  out.sort((a, b) => b.gap - a.gap); console.error('cands', th, minMoves, out.length);
  return (CC[key] = out);
}
function take(q) { used.push(Object.assign(S(q.s), { n: q.n })); }
// 深さ4まで含めて合格し、互いと既存の局面から4つ以上ちがう k 問（差の大きい上位から散らす）
// ⑤ 同じ手筋のくり返しを避ける：レッスンの5問で同じ手（from→to）は2回まで、同じ出目は3回まで（水の家は出目が1だけ）
let LMV = null;
const varied = q => { if (!LMV) return true; const k = q.best.from + '>' + q.best.to, nn = LMV.filter(x => x.n === q.n).length; return LMV.filter(x => x.k === k).length < 2 && (q.th === 'water' || nn < 3); };
function pick(list, k, spread, minMoves) {
  const out = [], ok = q => { if (out.includes(q) || !far(q.s, q.n) || !varied(q)) return false; const r = F.judge(q.s, q.n, q.th, { minMoves }); if (!r.ok) return false; Object.assign(q, r); if (LMV) LMV.push({ k: q.best.from + '>' + q.best.to, n: q.n }); return true; };
  if (!spread) { for (const q of list) { if (out.length >= k) break; if (ok(q)) { out.push(q); take(q); } } }
  else for (let i = 0; i < k; i++) {
    const top = Math.min(list.length, 30), at = Math.floor((i + 0.5) * top / k);
    for (let d = 0; d < list.length; d++) { const q = list[(at + d) % list.length]; if (ok(q)) { out.push(q); take(q); break; } }
  }
  if (out.length < k) throw new Error('not enough ' + (list[0] && list[0].th) + ' ' + out.length + '/' + k + ' of ' + list.length);
  return out.sort((a, b) => b.gap - a.gap);
}
const mv = q => [q.best.from, F.landOf(q.best)];
const arrow = (f, t) => ({ type: 'arrow', from: F.sq(f), to: t >= 31 ? { tray: 'goal', side: 0 } : F.sq(t), color: '#3df59a' });
function moveProblem(q) { return { kind: 'move', s: S(q.s), n: q.n, ok: [[q.best.from, q.best.to]], best: [q.best.from, q.best.to], ev: q.ev, gap: +q.gap.toFixed(3), why: q.why, ng: q.ng, look: F.lookMarks(q.s, q.n, q.best, q.th) }; }
function moveLesson(id, cat) {
  const T = TH[id], all = cands(id, 3); LMV = [];
  const probs = pick(all, 5, true, 3); LMV = null;
  const ex = pick(all, 1, false, 3)[0], tr = pick(cands(id, 2), 1, false, 2)[0];
  const em = ex.best, tm = tr.best;
  return {
    id, cat, rule: 'std', title: T.name, tip: T.desc, body: T.body, hints: [T.hint, T.desc],
    diagram: { s: S(ex.s), marks: F.lookMarks(ex.s, ex.n, em, id) },
    ramp: [
      { k: 'explain', s: S(ex.s), n: ex.n, seq: [[em.from, em.to]], marks: F.lookMarks(ex.s, ex.n, em, id).concat([arrow(em.from, F.landOf(em))]), t: RAMP.et, body: T.body, why: ex.why },
      { k: 'try', s: S(tr.s), n: tr.n, ok: [[tm.from, tm.to]], marks: [], look: F.lookMarks(tr.s, tr.n, tm, id), t: RAMP.tt, h: T.hint, g: RAMP.tg, y: UI.rampRetry, why: tr.why, ng: tr.ng },
    ],
    problems: probs.map(moveProblem),
  };
}

// ---- 選択問題
const frac = m => m + '/16';
const ngoNum = (opts, ans, conv) => opts.map((o, i) => i === ans ? null : (conv(o) < conv(opts[ans]) ? ['c.lowNg', { x: o }] : ['c.highNg', { x: o }]));
function rollChoice(n) {
  const m = F.P16[n], opts = ['1/16', '4/16', '6/16', '8/16'], ans = opts.indexOf(frac(m));
  const ngo = opts.map((o, i) => { if (i === ans) return null; const v = [1, 2, 3, 4, 5].filter(k => frac(F.P16[k]) === o); return v.length ? ['c.rollNg', { x: o, v: v.join(' / ') }] : ['c.roll8Ng', { x: o }]; });
  return { kind: 'choice', q: fillQ(X2.Q.roll, { n }), opts, ans, why: ['c.roll', { n, m }], ngo };
}
function againChoice() {
  const opts = ['4/16', '5/16', '6/16', '8/16'], ans = 2;
  return { kind: 'choice', q: X2.Q.again, opts, ans, why: ['c.again', {}], ngo: ngoNum(opts, ans, o => parseInt(o, 10)) };
}
// 赤い印の駒（p）が相手の次の投げで入れ替えられうる確率。ds：後ろにいる相手の駒の距離、me / op：ほかの駒
function riskChoice(p, ds, me, op, alts) {
  const a = [p].concat(me), b = ds.map(d => p - d).concat(op);
  const s = { rule: 'std', pos: [F.full(a), F.full(b)], turn: 0, winner: -1 };
  const all = [].concat(a, b).filter(x => x <= 30); if (new Set(all).size !== all.length) throw new Error('riskChoice overlap ' + p);
  const m = Math.round(F.riskNow(s)[0] * 16);
  // 届く距離（相手の番の legalMoves で p に入れ替えが起きる目）
  const t = E.clone(s); t.turn = 1; const hits = [1, 2, 3, 4, 5].filter(n => E.legalMoves(t, n).some(x => x.capture && x.to === p));
  if (hits.reduce((x, n) => x + F.P16[n], 0) !== m) throw new Error('risk mismatch');
  const cand = [m].concat(alts).filter((x, i, A) => A.indexOf(x) === i && x >= 0 && x <= 16).slice(0, 4).sort((x, y) => x - y);
  if (cand.length !== 4) throw new Error('riskChoice opts');
  const opts = cand.map(frac), ans = cand.indexOf(m), b0 = E.board(s);
  const paired = (p > 1 && b0[p - 1] === 0) || b0[p + 1] === 0;
  const why = m ? ['c.riskL', { list: hits.map(n => `${n}→${frac(F.P16[n])}`).join(' + '), m }] : [paired ? 'c.risk0p' : 'c.risk0w', {}];
  const marks = [Object.assign(F.sq(p), { type: 'danger' })].concat(ds.map(d => Object.assign(F.sq(p - d), { type: 'text', text: String(d), size: 26, color: '#ffe27a' })));
  used.push(S(s));
  return { kind: 'choice', s: S(s), marks, q: X2.Q.risk, opts, ans, why, ngo: ngoNum(opts, ans, o => parseInt(o, 10)), _hits: hits };
}
// 出目 n で動かせる駒は何枚（プールの局面から：止まれない・越えられない理由の種類が kinds 以上）
function blockReason(s, n, from) {
  const b = E.board(s), t = from + n;
  if (from >= 28) return t > 30 || b[t] >= 0 ? 'exit' : null;
  if (from === 26) return n === 1 || n === 5 ? null : b[t] === 0 ? 'own' : b[t] === 1 ? 'safe' : null;
  if (t > 26) return 'over';
  for (let q = from + 1; q < t; q++) if (b[q] === 1) { let a = q, z = q; while (a - 1 >= 1 && b[a - 1] === 1) a--; while (z + 1 <= 30 && b[z + 1] === 1) z++; if (z - a + 1 >= 3) return 'wall'; }
  if (b[t] === 0) return 'own';
  if (b[t] === 1) return t === 26 ? 'safe' : 'pair';   // (相手がいて止まれない：ペア、または安全な美の家)
  return null;
}
function blockInfo(s, n) {
  const ss = F.st(s), ms = E.legalMoves(ss, n), on = [...new Set(ss.pos[0].filter(p => p < 31))].sort((x, y) => x - y);
  const ok = ms.map(m => m.from).sort((x, y) => x - y), ng = on.filter(p => !ok.includes(p)).map(p => [p, blockReason(ss, n, p)]);
  return { ok, ng, on };
}
function blockChoice(spec) {
  for (const p of pool) {
    if (p.n !== spec.n) continue;
    const I = blockInfo(p.s, p.n); if (!I.ok.length || I.ng.length < spec.blocked || I.ng.some(x => !x[1])) continue;
    const kinds = [...new Set(I.ng.map(x => x[1]))]; if (!spec.kinds.every(k => kinds.includes(k)) || kinds.length !== spec.kinds.length) continue;
    if (!F.contact(p.s) || !far(p.s, p.n)) continue;
    const m = I.ok.length, c = [m, m + 1, m - 1, m + 2, m - 2].filter(x => x >= 0 && x <= I.on.length).slice(0, 4).sort((x, y) => x - y);
    if (c.length < 4) continue;
    const opts = c.map(String), ans = c.indexOf(m);
    const ngo = opts.map((o, i) => i === ans ? null : +o < m ? ['c.blockLow', { x: o, ok: I.ok.join('・') }] : ['c.blockHigh', { x: o }]);
    used.push(Object.assign(S(p.s), { n: p.n }));
    const marks = I.on.map(q => Object.assign(F.sq(q), { type: 'text', text: String(q), size: 22, color: '#ffe27a' }));
    return { kind: 'choice', s: S(p.s), n: p.n, marks, q: fillQ(X2.Q.block, { n: p.n }), opts, ans, why: ['c.block', { ok: I.ok.join('・'), m }], ngo, _ng: I.ng };
  }
  throw new Error('blockChoice ' + JSON.stringify(spec));
}
// 次の投げで（どれかの駒が）上がれる確率：上がりの手がある出目の数え上げ
function exitChoice(mine, op, alts) {
  const s = { rule: 'std', pos: [F.full(mine), F.full(op)], turn: 0, winner: -1 };
  const all = [].concat(mine, op).filter(x => x <= 30); if (new Set(all).size !== all.length) throw new Error('exitChoice overlap');
  const hits = [1, 2, 3, 4, 5].filter(n => E.legalMoves(s, n).some(m => m.finish)), m = hits.reduce((x, n) => x + F.P16[n], 0);
  const cand = [m].concat(alts).filter((x, i, A) => A.indexOf(x) === i && x > 0 && x <= 16).slice(0, 4).sort((x, y) => x - y);
  if (cand.length !== 4) throw new Error('exitChoice opts');
  const opts = cand.map(frac), ans = cand.indexOf(m);
  const marks = mine.filter(p => [26, 28, 29, 30].includes(p)).map(p => Object.assign(F.sq(p), { type: 'glow' }));
  used.push(S(s));
  return { kind: 'choice', s: S(s), marks, q: X2.Q.exit, opts, ans, why: ['c.exitL', { list: hits.map(n => `${n}→${frac(F.P16[n])}`).join(' + '), m }], ngo: ngoNum(opts, ans, o => parseInt(o, 10)), _hits: hits };
}
const strip = q => { const o = Object.assign({}, q); delete o._hits; delete o._ng; return o; };
const tryOf = (q, t, h, g) => Object.assign({ k: 'try', t, h, g, y: UI.rampRetry }, { kind: 'choice', s: q.s, n: q.n, marks: q.marks, q: q.q, opts: q.opts, ans: q.ans, why: q.why, ngo: q.ngo });

function main() {
  const steps = [];
  {   // 1. 投げ棒の確率（選択）
    const T = TH.prob, L2 = X2.LESSON.prob;
    const ex = riskChoice(9, [2], [13, 22], [17, 21, 24], [4, 8, 10]);
    const P = [rollChoice(3), rollChoice(5), riskChoice(12, [1], [5, 20], [3, 15, 24, 25], [1, 6, 8]), riskChoice(18, [4], [7, 24], [6, 10, 22, 23], [4, 6, 2]), againChoice()];
    steps.push({ id: 'prob', cat: 'basic', rule: 'std', title: T.name, tip: T.desc, body: T.body, hints: [T.hint, T.desc], diagram: { s: ex.s, marks: ex.marks },
      ramp: [{ k: 'explain', s: ex.s, n: null, seq: [], marks: ex.marks, t: L2.exT, body: T.body, why: ex.why },
        tryOf({ opts: ['1', '2', '3', '4', '5'], ans: 1, why: ['c.roll', { n: 2, m: 6 }], ngo: [1, 2, 3, 4, 5].map(v => v === 2 ? null : ['c.roll', { n: v, m: F.P16[v] }]) }, L2.tryT, T.hint, RAMP.tg)],
      problems: P.map(strip) });
  }
  {   // 2. ペアと壁：動かせる駒を数える（選択）
    const T = TH.pair, L2 = X2.LESSON.block;
    const ex = blockChoice({ n: 3, blocked: 2, kinds: ['own', 'pair'] }), tr = blockChoice({ n: 2, blocked: 1, kinds: ['own'] });
    const P = [blockChoice({ n: 2, blocked: 1, kinds: ['pair'] }), blockChoice({ n: 3, blocked: 2, kinds: ['own', 'pair'] }), blockChoice({ n: 4, blocked: 1, kinds: ['wall'] }), blockChoice({ n: 5, blocked: 2, kinds: ['over', 'own'] }), blockChoice({ n: 4, blocked: 3, kinds: ['own', 'pair', 'wall'] })];
    steps.push({ id: 'block', cat: 'basic', rule: 'std', title: T.name, tip: L2.tip, body: T.body, hints: [L2.h1, L2.h2], diagram: { s: ex.s, marks: ex.marks },
      ramp: [{ k: 'explain', s: ex.s, n: ex.n, seq: [], marks: ex.marks, t: L2.exT, body: T.body, why: ex.why, ng: ex._ng },
        tryOf(tr, L2.tryT, L2.h1, RAMP.tg)],
      problems: P.map(strip) });
  }
  steps.push(moveLesson('swap', 'tactics'));
  {   // 4. 入れ替えの確率（選択）
    const L2 = X2.LESSON.risk;
    const ex = riskChoice(14, [2, 3], [24, 28], [6, 19, 21], [6, 8, 12]), tr = riskChoice(20, [1], [9, 29], [4, 8, 26], [1, 6, 8]);
    const P = [riskChoice(11, [1, 2], [3, 23], [16, 18, 25], [6, 8, 12]), riskChoice(16, [3, 4], [5, 28], [2, 20, 22], [4, 6, 9]),
      riskChoice(10, [2, 4], [11, 24], [1, 3, 29], [6, 7, 10]), riskChoice(19, [1, 3, 5], [2, 7], [23, 25], [8, 13, 14]),
      riskChoice(17, [1, 5], [13, 14, 15], [3, 20, 30], [1, 5, 9])];
    steps.push({ id: 'risk', cat: 'tactics', rule: 'std', title: L2.title, tip: L2.tip, body: L2.body, hints: [L2.h1, L2.h2], diagram: { s: ex.s, marks: ex.marks },
      ramp: [{ k: 'explain', s: ex.s, n: null, seq: [], marks: ex.marks, t: L2.exT, body: L2.body, why: ex.why }, tryOf(tr, L2.tryT, L2.h1, RAMP.tg)],
      problems: P.map(strip) });
  }
  steps.push(moveLesson('beauty', 'end'));
  steps.push(moveLesson('water', 'end'));
  {   // 7. 出口と上がり（選択：次の投げで上がれる確率。上がりの手の問題は、2番目と5%以上の差がある局面が水の家の局面と同じ形の1つだけ）
    const T = TH.exit;
    const ex = exitChoice([29, 22, 17], [24, 20, 12], [4, 8, 10]), tr = exitChoice([28, 23, 15], [25, 19, 9], [1, 6, 8]);
    const P = [exitChoice([30, 24, 21], [25, 18, 13, 7], [1, 6, 8]), exitChoice([30, 28, 19], [23, 16, 10], [4, 6, 9]), exitChoice([29, 26, 20, 14], [24, 22, 11], [6, 8, 9]),
      exitChoice([30, 29, 25], [22, 21, 8], [6, 8, 12]), exitChoice([30, 29, 28, 26], [24, 23, 18], [11, 14, 16])];
    steps.push({ id: 'exit', cat: 'end', rule: 'std', title: T.name, tip: T.desc, body: T.body, hints: [T.hint, T.desc], diagram: { s: ex.s, marks: ex.marks },
      ramp: [{ k: 'explain', s: ex.s, n: null, seq: [], marks: ex.marks, t: RAMP.et, body: T.body, why: ex.why }, tryOf(tr, RAMP.tt, T.hint, RAMP.tg)],
      problems: P.map(strip) });
  }
  const cats = [{ id: 'basic', name: CATS[0].name, steps: ['prob', 'block'] }, { id: 'tactics', name: CATS[1].name, steps: ['swap', 'risk'] }, { id: 'end', name: CATS[2].name, steps: ['beauty', 'water', 'exit'] }];
  const msg = Object.assign({}, require('./learn_text.js').MSG, MSG);
  for (const k of Object.keys(msg)) if (/^w\.(pair|wall|escape|safe|exit|race|gen)$|^n\.gen$|^c\.risk$/.test(k)) delete msg[k];   // (勝率の文：使わない)
  const data = { version: 2, rule: 'std', eval: 'expectiminimax depth 2·3·4 (net)', score: { per: 20, pass: 75, hint: [16, 12], retry: 10, answer: 0 }, ui: UI, msg, cats, steps };
  fs.writeFileSync(path.join(__dirname, '..', 'lessons.json'), JSON.stringify(data));
  console.log('wrote lessons.json', steps.map(s => s.id + '(' + s.problems.map(q => q.kind === 'move' ? q.gap.toFixed(3) : 'c').join(',') + ')').join(' '));
}
if (process.env.DBG) { for (const th of process.env.DBG.split(",")) { const L = cands(th, 3), got = []; for (const q of L) { const r = F.judge(q.s, q.n, q.th); if (r.ok && far(q.s, q.n)) { got.push(q); take(q); } } console.log(th, got.length, got.map(q => q.n + ":" + JSON.stringify(q.s.pos)).join(" ")); } } else main();
