// ur/tools/gen_lessons_lut.js — ウルのレッスン（ur/lessons.json）を完全解析表で作り直す（2026-11-24、担当C、3D対応）。
// 旧 gen_lessons.js（評価ネットの深さ2〜3・理由文に勝率）を置きかえる。厳しい基準（claude/lesson-quality.md ①〜⑨・追1〜）：
//   ① 正解＝完全解析表（RoyalUr.net finkel.rgu / blitz.rgu、全出目・全応手の厳密な勝率）で最善の手
//   ② 2番目の手と 5% 以上の差（唯一の答え）  ③ 合法手3つ以上（準備の「やってみよう」は2つ以上）
//   ④ レッスンの主題の手（rosette＝中央以外のロゼット、center＝中央のロゼット、hold＝中央の駒を動かさない…）
//   ⑤ レッスン・準備・見本・ルール説明の局面と駒3つ以上ちがう（1手で変わるのは2つまで）
//   ⑥ 5問は2番目との差の大きい順（易→難）  ⑦⑧ 不正解の手すべてに、盤の事実の理由（取り逃し・ゴール・ロゼット・
//   取り返される確率・次に取られる確率（相手の出目の数え上げ））がある局面だけ。理由文に勝率の％を書かない（追16）。
// 選択問題（出目の確率・取られる確率・残り歩数）は合成局面。答えは数え上げで確かめ、誤答それぞれに説明（ngo）を付ける。
// 使い方: node --max-old-space-size=6000 ur/tools/gen_lessons_lut.js <finkel.rgu> <blitz.rgu>
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js'), X = require('./learn_text.js'), XL = require('./learn_text_lut.js'), F = require('./ur_facts.js');
const UF = require('./ur_lessfacts.js');
const [FINKEL, BLITZ] = process.argv.slice(2);
if (!FINKEL || !BLITZ) { console.error('usage: gen_lessons_lut.js <finkel.rgu> <blitz.rgu>'); process.exit(2); }
const LUT = { finkel: require('./lut.js').open('finkel', FINKEL), blitz: require('./lut.js').open('blitz', BLITZ) };
const rng = E.mulberry32(20261124);
const MSG = Object.assign({}, F.MSG, XL.MSG);
function fillMsg(key, params) { const t = MSG[key], o = {}; for (const l of X.LANGS) o[l] = t[l].replace(/\{(\w+)\}/g, (_, k) => params[k] != null ? params[k] : ''); return o; }
const fillQ = (T, v) => { const o = {}; for (const l of X.LANGS) o[l] = T[l].replace(/\{(\w+)\}/g, (_, x) => v[x]); return o; };

// ---- 局面のプール：完全解析表で（ほぼ）最善に指す対局。手番＝明に正規化
function poolOf(rule, games) {
  const T = LUT[rule], out = [], seen = new Set();
  for (let g = 0; g < games; g++) {
    let s = E.newGame(rule, g & 1); const eps = 0.1 + 0.5 * rng();
    for (let ply = 0; ply < 500 && s.winner < 0; ply++) {
      const n = E.rollDice(rng, rule).n, ms = E.legalMoves(s, n);
      if (ms.length >= 2) { const t = UF.norm(s), k = E.key(t) + '/' + n; if (!seen.has(k)) { seen.add(k); out.push({ s: t, n }); } }
      let m = null;
      if (ms.length) { if (rng() < eps) m = ms[Math.floor(rng() * ms.length)]; else { let b = -1; for (const x of ms) { const v = T.after(s, x); if (v > b) { b = v; m = x; } } } }
      s = E.apply(s, m).state;
    }
  }
  return out;
}
const pools = { finkel: poolOf('finkel', 2500), blitz: poolOf('blitz', 1200) };
console.error('pool', pools.finkel.length, pools.blitz.length);

// ⑤ すでに使った局面（ルール説明の盤も）
const used = UF.tourStates(path.join(__dirname, '..', '..'));
const far = s => used.every(u => F.dist(u, s) >= UF.MIN_DIST);
const S = s => ({ rule: s.rule, pos: s.pos.map(a => a.slice()), turn: 0 });

// 1局面を問題として調べる（不合格なら null）
function probe(p, th, minMoves) {
  if (minMoves === 2 && p.pre.nm !== 2) return null;
  const r = UF.judge(LUT[p.s.rule], p.s, p.n, th, { minMoves });
  return r.ok ? Object.assign({}, p, r) : null;
}
const CC = new Map();
function cands(rule, th, minMoves, f) {
  const r0 = cands0(rule, th, minMoves, f); if (!CNT[rule + th + minMoves]) { CNT[rule + th + minMoves] = 1; console.error('cands', rule, th, minMoves, r0.length, r0.length ? r0[0].gap.toFixed(3) : '-'); } return r0;
}
const CNT = {};
function cands0(rule, th, minMoves, f) {
  const key = rule + th + minMoves; let base = CC.get(key);
  if (!base) {
    base = [];
    for (const p of pools[rule]) {
      if (p.pre === undefined) { const s = Object.assign({ winner: -1 }, p.s), ms = E.legalMoves(s, p.n); let b = -1, b2 = -1; for (const m of ms) { const v = LUT[rule].after(s, m); if (v > b) { b2 = b; b = v; } else if (v > b2) b2 = v; } p.pre = { nm: ms.length, gap: b - b2, b }; }
      if (p.pre.nm < minMoves || p.pre.gap < UF.MIN_GAP || p.pre.b < 0.03 || p.pre.b > 0.97) continue;
      const q = probe(p, th, minMoves); if (q) base.push(q);
    }
    base.sort((a, b) => b.gap - a.gap); CC.set(key, base);
  }
  return f ? base.filter(f) : base;
}
// 5問を差の幅から散らして選ぶ（⑤：互いと既存の局面から3つ以上ちがう）
function pick(list, k, spread) {
  const out = [], take = q => { out.push(q); used.push(S(q.s)); };
  if (!spread) { for (const q of list) { if (out.length >= k) break; if (far(q.s)) take(q); } }
  else for (let i = 0; i < k; i++) {
    const top = Math.min(list.length, 40), at = Math.floor((i + 0.5) * top / k);   // (差の大きい上位40局面から散らす：答えがはっきりした問題)
    for (let d = 0; d < list.length; d++) { const q = list[(at + d) % list.length]; if (!out.includes(q) && far(q.s)) { take(q); break; } }
  }
  if (out.length < k) throw new Error('not enough ' + (list[0] && list[0].th) + ' ' + out.length + '/' + k + ' of ' + list.length);
  return out.sort((a, b) => b.gap - a.gap);
}
function moveProblem(q) {
  return { kind: 'move', s: S(q.s), n: q.n, ok: [[q.best.from, q.best.to]], best: [q.best.from, q.best.to], ev: q.ev, why: q.why, ng: q.ng, look: UF.lookMarks(q.s, q.n, q.best, q.th) };
}
const arrow = (rule, f, t) => ({ type: 'arrow', from: UF.spot(rule, f), to: UF.spot(rule, t), color: '#3df59a' });
function moveLesson(id, cat, rule, ths, opt = {}) {
  const LS = X.LESSON[id];
  const thOf = Array.isArray(ths) ? ths : [ths];
  const all = th => cands(rule, th, 3, opt.f);
  let probs = [];
  if (opt.mix) { for (const [th, k, f] of opt.mix) probs = probs.concat(pick(cands(rule, th, 3, f), k, true)); probs.sort((a, b) => b.gap - a.gap); }
  else { const L = [].concat(...thOf.map(all)).sort((a, b) => b.gap - a.gap); probs = pick(L, 5, true); }
  const ex = pick([].concat(...thOf.map(all)), 1, false)[0];   // 見本：差のいちばん大きい局面
  const tr = pick([].concat(...thOf.map(th => cands(rule, th, 2))), 1, false)[0];
  return {
    id, cat, rule, title: LS.title, tip: LS.tip, body: LS.body,
    diagram: { s: S(ex.s), marks: UF.lookMarks(ex.s, ex.n, ex.best, ex.th) },
    ramp: [
      { k: 'explain', s: S(ex.s), n: ex.n, seq: [[ex.best.from, ex.best.to]], marks: UF.lookMarks(ex.s, ex.n, ex.best, ex.th).concat([arrow(rule, ex.best.from, ex.best.to)]), t: LS.exT, body: LS.exB, ev: ex.ev },
      { k: 'try', s: S(tr.s), n: tr.n, ok: [[tr.best.from, tr.best.to]], marks: [], look: UF.lookMarks(tr.s, tr.n, tr.best, tr.th), t: LS.tryT, h: LS.h1, g: fillMsg(tr.why[0], tr.why[1]), y: X.UI.rampRetry, ev: tr.ev, why: tr.why, ng: tr.ng },
    ],
    problems: probs.map(moveProblem),
    hints: [LS.h1, LS.h2],
  };
}

// ---- 選択問題
const frac = m => m + '/16';
const ngoNum = (opts, ans, conv) => opts.map((o, i) => i === ans ? null : (conv(o) < conv(opts[ans]) ? ['c.lowNg', { x: o }] : ['c.highNg', { x: o }]));
function rollChoice(n) {
  const m = [1, 4, 6, 4, 1][n], opts = ['1/16', '4/16', '6/16', '8/16'], ans = opts.indexOf(frac(m));
  const ngo = opts.map((o, i) => { if (i === ans) return null; const v = [0, 1, 2, 3, 4].filter(k => frac([1, 4, 6, 4, 1][k]) === o); return v.length ? ['c.rollNg', { x: o, v: v.join(' / ') }] : ['c.roll8Ng', { x: o }]; });
  return { kind: 'choice', q: fillQ(X.Q.roll, { n }), opts, ans, why: ['c.roll', { n, m }], ngo };
}
function riskChoice(ds, p, deco = {}) {   // deco: 安全なマスの自分の駒（自陣 1〜4・13〜14）と、印の駒より前の相手の駒（取る目に関わらない）
  const a = [p].concat(deco.me || []), b = ds.map(d => p - d).concat(deco.op || []);
  while (a.length < 6) a.push(15); while (a.length < 7) a.push(0); while (b.length < 6) b.push(15); while (b.length < 7) b.push(0);
  if (!okSide(a) || !okSide(b) || !noClash(a, b)) throw new Error('riskChoice deco');
  const s = { rule: 'finkel', pos: [a, b.slice(0, 7)], turn: 1, winner: -1 };
  const m = Math.round(E.hitRisk(s, 0)[0] * 16), want = ds.reduce((x, d) => x + [0, 4, 6, 4, 1][d], 0);
  if (m !== want) throw new Error('risk mismatch ' + ds + ' ' + m + ' ' + want);
  const cand = [m, m + 2, Math.max(1, m - 2), m + 4, Math.max(1, m - 3), m + 1].filter((x, i, A) => A.indexOf(x) === i && x > 0 && x <= 16).slice(0, 4).sort((x, y) => x - y);
  const list = ds.map(d => `${d}→${frac([0, 4, 6, 4, 1][d])}`).join(' + ');
  const opts = cand.map(frac), ans = cand.indexOf(m);
  const st = { rule: 'finkel', pos: s.pos, turn: 0 };
  return { kind: 'choice', s: st, marks: [Object.assign(UF.rc('finkel', 0, p), { type: 'danger' })].concat(ds.map(d => Object.assign(UF.rc('finkel', 1, p - d), { type: 'text', text: String(d), size: 26, color: '#ffe27a' }))),
    q: fillQ(X.Q.risk, {}), opts, ans, why: ['c.risk', { list, m }], ngo: ngoNum(opts, ans, o => parseInt(o, 10)) };
}
const pipsOf = a => a.reduce((x, q) => x + (15 - q), 0);
const okSide = a => { const on = a.filter(x => x >= 1 && x <= 14); return new Set(on).size === on.length; };
function noClash(a, b) { const c0 = new Set(a.filter(p => p >= 5 && p <= 12)); return !b.some(p => p >= 5 && p <= 12 && c0.has(p)); }
function numOpts(m, r, spreads) { for (;;) { const c = [m]; while (c.length < 4) { const d = spreads[Math.floor(r() * spreads.length)] * (r() < .5 ? -1 : 1), v = m + d; if (v > 0 && !c.includes(v)) c.push(v); } return c.sort((x, y) => x - y); } }
function pipsChoice(seed, nOn, rival) {
  const r = E.mulberry32(seed);
  for (let t = 0; t < 10000; t++) {
    const mk = k => { const a = []; for (let i = 0; i < 7; i++) a.push(i < k ? 1 + Math.floor(r() * 14) : r() < .5 ? 15 : 0); return a; };
    const a = mk(nOn), b = mk(nOn);
    if (!okSide(a) || !okSide(b) || !noClash(a, b)) continue;
    const s = { rule: 'finkel', pos: [a, b], turn: 0 };
    if (!far(s)) continue;
    const side = rival ? 1 : 0, m = E.raceCount(Object.assign({ winner: -1 }, s)).pips[side];
    if (m !== pipsOf(s.pos[side])) throw new Error('pips');
    const opts = numOpts(m, r, [2, 3, 5, 7]).map(String), ans = opts.indexOf(String(m));
    used.push(s);
    const nums = s.pos[side].filter(x => x >= 1 && x <= 14).map(x => Object.assign(UF.rc('finkel', side, x), { type: 'text', text: String(15 - x), size: 24, color: '#ffe27a' }));
    return { kind: 'choice', s, marks: nums, q: fillQ(rival ? XL.Q.rpips : X.Q.pips, {}), opts, ans, why: [rival ? 'c.rpips' : 'c.pips', { m }], ngo: ngoNum(opts, ans, o => +o), _n: nOn };
  }
  throw new Error('pipsChoice');
}
function leadChoice(seed, nOn) {
  const r = E.mulberry32(seed);
  for (let t = 0; t < 10000; t++) {
    const mk = k => { const a = []; for (let i = 0; i < 7; i++) a.push(i < k ? 1 + Math.floor(r() * 14) : r() < .6 ? 15 : 0); return a; };
    const a = mk(nOn), b = mk(nOn);
    if (!okSide(a) || !okSide(b) || !noClash(a, b)) continue;
    const s = { rule: 'finkel', pos: [a, b], turn: 0 };
    const rc = E.raceCount(Object.assign({ winner: -1 }, s)), d = rc.pips[1] - rc.pips[0];
    if (!d || Math.abs(d) < 2 || Math.abs(d) > 12 || !far(s)) continue;
    const ad = Math.abs(d), d2 = ad + (r() < .5 ? 2 : -2) > 0 ? ad + (r() < .5 ? 2 : -2) : ad + 2, me = d > 0 ? 0 : 1;
    const raw = [[me, ad], [me, d2], [1 - me, ad], [1 - me, d2]].sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    const opts = raw.map(([w, v]) => { const o = {}; for (const l of X.LANGS) o[l] = (w === 0 ? X.Q.you : X.Q.rival)[l] + ' +' + v; return o; });
    const ans = raw.findIndex(([w, v]) => w === me && v === ad);
    const why = [me === 0 ? 'c.lead2y' : 'c.lead2r', { a: rc.pips[0], b: rc.pips[1], d: ad }];
    const ngo = raw.map(([w, v], i) => i === ans ? null : w !== me ? ['c.sideNg', { a: rc.pips[0], b: rc.pips[1] }] : ['c.' + (v < ad ? 'low' : 'high') + 'Ng', { x: '+' + v }]);
    used.push(s);
    return { kind: 'choice', s, q: fillQ(XL.Q.lead2, {}), opts, ans, why, ngo, _n: nOn };
  }
  throw new Error('leadChoice');
}

function main() {
  const steps = [];
  {   // 1. 出目の確率（選択）
    const LS = X.LESSON.prob, ex = riskChoice([2], 7, { me: [14], op: [13] }); used.push(ex.s);
    const P = [rollChoice(3), rollChoice(4), riskChoice([1], 9, { me: [2, 13], op: [14, 11] }), riskChoice([3, 1], 10, { me: [3], op: [13, 14, 12] }), riskChoice([2, 4], 11, { me: [1, 14, 13] })];
    P.forEach(q => q.s && used.push(q.s));
    steps.push({ id: 'prob', cat: 'basic', rule: 'finkel', title: LS.title, tip: LS.tip, body: LS.body, diagram: { s: ex.s, marks: ex.marks },
      ramp: [{ k: 'explain', s: ex.s, n: null, seq: [], marks: ex.marks, t: LS.exT, body: LS.exB },
        { k: 'try', kind: 'choice', opts: ['0', '1', '2', '3', '4'], ans: 2, t: LS.tryT, h: LS.h1, g: fillMsg('c.roll', { n: 2, m: 6 }), y: X.UI.rampRetry }],
      problems: P, hints: [LS.h1, LS.h2] });
  }
  steps.push(moveLesson('rosette', 'basic', 'finkel', 'rosette'));
  steps.push(moveLesson('center', 'basic', 'finkel', 'center'));
  steps.push(moveLesson('hold', 'basic', 'finkel', 'hold'));
  steps.push(moveLesson('enter', 'basic', 'finkel', ['enter', 'advance']));
  steps.push(moveLesson('danger', 'tactics', 'finkel', 'safe'));
  steps.push(moveLesson('escape', 'tactics', 'finkel', 'escape'));
  steps.push(moveLesson('capture', 'tactics', 'finkel', 'capture'));
  steps.push(moveLesson('choose', 'tactics', 'finkel', 'nocap', { mix: [['nocap', 3], ['capture', 2, p => UF.riskBest(LUT.finkel, p) > 0.2]] }));
  steps.push(moveLesson('goal', 'end', 'finkel', 'goal'));
  {   // 11. レースの数え方（選択5問：自分の歩数 → 相手の歩数 → どちらが何歩リード、数える駒が増える順）
    const LS = X.LESSON.race, pc = pipsChoice(3, 2, false), pt = pipsChoice(4, 2, false);
    const P = [pipsChoice(11, 3, false), pipsChoice(12, 3, true), leadChoice(13, 3), pipsChoice(14, 5, false), leadChoice(15, 5)];
    steps.push({ id: 'race', cat: 'end', rule: 'finkel', title: LS.title, tip: LS.tip, body: LS.body, diagram: { s: pc.s, marks: pc.marks },
      ramp: [{ k: 'explain', s: pc.s, n: null, seq: [], marks: pc.marks, t: LS.exT, body: LS.exB },
        Object.assign({ k: 'try', t: LS.tryT, h: LS.h1, g: fillMsg('c.pips', { m: pt.opts[pt.ans] }), y: X.UI.rampRetry }, { kind: 'choice', s: pt.s, marks: pt.marks, opts: pt.opts, ans: pt.ans })],
      problems: P.map(q => { const o = Object.assign({}, q); delete o._n; return o; }), hints: [LS.h1, LS.h2] });
  }
  steps.push(moveLesson('blitz', 'vari', 'blitz', 'blitz'));
  const cats = ['basic', 'tactics', 'end', 'vari'].map(id => ({ id, name: X.CATS[id], steps: steps.filter(s => s.cat === id).map(s => s.id) }));
  const msg = {}; for (const k in MSG) msg[k] = MSG[k];
  const ui = Object.assign({}, X.UI);
  const data = { version: 2, rule: 'finkel', lut: 'RoyalUr.net finkel.rgu / blitz.rgu', score: { per: 20, pass: 75, hint: [16, 12], retry: 10, answer: 0 }, ui, msg, cats, steps };
  const file = path.join(__dirname, '..', 'lessons.json');
  fs.writeFileSync(file, JSON.stringify(data));
  console.log('wrote', file, steps.map(s => s.id + '(' + s.problems.map(q => q.kind === 'move' ? (q.ev[0][2] - q.ev[1][2]).toFixed(2) : 'c').join(',') + ')').join(' '));
}
main();
