// patolli/tools/gen_lessons_v2.js — ベルの復元のレッスン（豆の確率・腕の先でもう一度・ちょうどの目で上がる）を作り直す（2026-11-24、担当C）。
// node patolli/tools/gen_lessons_v2.js pool1.json [pool2.json …]
// 候補（gen_pool_v2.js：自己対局の局面を patolli_exact.c で厳密に解いたもの）から、
//   ①最善が主題の手（腕の先／上がり）で唯一 ②2番目と5%以上 ③合法手3つ以上 ④ほかの手はふつうの手 ⑤駒4つ以上ちがう ⑥差の大きい順
// を満たす局面を選び、全不正解手に盤の事実の理由（patolli_lessfacts.js）をつけて lessons.json の prob・again・goal を v2 に書きかえる。
// 選ぶ問題（豆の確率）は 32 通りの数え上げで答え・誤答の説明（追22・追23）を作る。ほかのレッスン（入場・まとめ・広く知られたルール）は前の版のまま。
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js'), F = require('./patolli_lessfacts.js'), TX = require('./learn_text_v2.js');
const FILE = path.join(__dirname, '..', 'lessons.json');
const D = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const pool = process.argv.slice(2).flatMap(f => JSON.parse(fs.readFileSync(f, 'utf8')));
const r4 = x => Math.round(x * 1e4) / 1e4;
// 主題ごとの合格の候補
function ok(c, th) {
  const s = F.st(c.s), ms = E.legalMoves(s, c.n); if (ms.length < 3 || c.ev.length !== ms.length) return null;
  const best = ms.find(m => m.from === c.ev[0][0] && m.to === c.ev[0][1]); if (!best) return null;
  if (c.gap < F.MIN_GAP || c.ev[0][2] < 0.05 || c.ev[0][2] > 0.95) return null;
  if (!F.themeOk(c.s, c.n, best, ms, th)) return null;
  const ng = {}; for (const m of ms) if (m.from !== best.from) { const k = F.ngKey(c.s, c.n, best, m); if (!k) return null; ng[m.from] = k; }
  return { s: { rule: 'bell', pos: c.s.pos.map(a => a.slice()), turn: 0 }, n: c.n, ev: c.ev.map(e => [e[0], e[1], r4(e[2])]), gap: c.gap, best, ng, why: F.whyOf(c.s, c.n, best), look: F.lookMarks(c.s, c.n, best, th) };
}
const taken = F.tourStates(path.join(__dirname, '..', '..')).map(s => ({ s, n: 0 }));
const far = (s, n) => taken.every(t => F.tokDiff(t.s, s, t.n, n) >= F.MIN_TOK);
function pick(th, k) {
  const C = pool.map(c => ok(c, th)).filter(Boolean).sort((a, b) => b.gap - a.gap), out = [], seenN = {};
  // 出目がかたよらないよう、同じ出目は3つまで。差の大きいものから
  for (const c of C) { if (out.length >= k) break; if ((seenN[c.n] || 0) >= 3) continue; if (!far(c.s, c.n)) continue; out.push(c); taken.push(c); seenN[c.n] = (seenN[c.n] || 0) + 1; }
  if (out.length < k) throw new Error(`${th}: ${out.length} / ${k} の局面しかない（候補 ${C.length}）`);
  return out;
}
const mkMove = c => ({ kind: 'move', s: c.s, n: c.n, ok: [[c.best.from, c.best.to]], best: [c.best.from, c.best.to], ev: c.ev, why: c.why, ng: c.ng, look: c.look });
function moveLesson(id, th) {
  const L = D.steps.find(s => s.id === id), C = pick(th, 7);
  // 準備：見本（差がいちばん大きい局面で最善手を指す）と練習。採点の5問は差の大きい順（易→難）
  const [ex, tr, ...ps] = C;
  const oldEx = L.ramp.find(r => r.k === 'explain'), oldTr = L.ramp.find(r => r.k === 'try');
  L.ramp = [
    { k: 'explain', s: ex.s, n: ex.n, seq: [[ex.best.from, ex.best.to]], marks: ex.look.concat([{ type: 'arrow', from: F.rc(0, ex.best.from) || { start: true }, to: ex.best.finish ? { tray: true } : F.rc(0, ex.best.to), color: '#3df59a' }]), ev: ex.ev, why: ex.why, t: oldEx.t, body: oldEx.body },
    { k: 'try', s: tr.s, n: tr.n, ok: [[tr.best.from, tr.best.to]], ev: tr.ev, why: tr.why, ng: tr.ng, look: tr.look, t: oldTr.t, h: oldTr.h, g: TX.RAMPG[id], y: oldTr.y },
  ];
  L.problems = ps.sort((a, b) => b.gap - a.gap).map(mkMove);
  L.diagram = { s: ex.s, marks: ex.look };
  L.v2 = true;
}
moveLesson('again', 'again');
moveLesson('goal', 'goal');
// ---------- 豆の確率（選ぶ問題、32通りの数え上げ） ----------
{
  const L = D.steps.find(s => s.id === 'prob'), W = F.ways, O = m => m + '/32';
  const ST = (p0, p1) => ({ rule: 'bell', pos: [p0, p1], turn: 0 });
  const list = (ns, lang) => ns.map(n => `${n}（${W(n)}）`).join(' + ');
  const armS = ST([20, 33, 60, 60, 0, 0], [44, 12, 60, 60, 60, 0]), armI = 20;
  const homeS = ST([58, 57, 56, 31, 60, 60], [49, 26, 60, 60, 60, 0]);
  const ar = F.againRolls(armS, armI), hr = F.goalRolls(homeS), sum = a => a.reduce((x, n) => x + W(n), 0);
  const rc = F.rc(0, armI);
  // 答えの位置はかたよらせない（真ん中ばかりにしない）
  L.problems = [
    { kind: 'choice', q: TX.Q.roll1, opts: [O(5), O(1), O(10)], ans: 0, why: ['c.roll', { n: 1, b: 1, m: 5 }], ngo: [null, ['c.rollNg', { v: '10' }], ['c.rollNg', { v: '2' }]] },
    { kind: 'choice', q: TX.Q.roll10, opts: [O(3), O(5), O(1)], ans: 2, why: ['c.roll', { n: 10, b: 5, m: 1 }], ngo: [['c.noneNg', {}], ['c.rollNg', { v: '4' }], null] },
    { kind: 'choice', s: armS, marks: [Object.assign({ type: 'ring', color: '#ffd65a' }, rc)], q: TX.Q.arm, opts: [O(sum(ar) - 10), O(sum(ar)), O(sum(ar) + 5)], ans: 1, why: ['c.arm', { list: list(ar), m: sum(ar) }], ngo: [['c.lowNg', {}], null, ['c.highNg', {}]] },
    { kind: 'choice', q: TX.Q.ge3, opts: [O(16), O(11), O(26)], ans: 0, why: ['c.ge3', { m: 16 }], ngo: [null, ['c.lowNg', {}], ['c.highNg', {}]] },
    { kind: 'choice', s: homeS, q: TX.Q.home, opts: [O(sum(hr) - 5), O(sum(hr) + 5), O(sum(hr))], ans: 2, why: ['c.home', { list: list(hr), m: sum(hr) }], ngo: [['c.lowNg', {}], ['c.highNg', {}], null] },
  ];
  const most = L.ramp.find(r => r.kind === 'choice'); most.why = ['c.most', {}]; most.ngo = [['c.rollNg', { v: '1' }], null, ['c.rollNg', { v: '4' }]];
  L.v2 = true;
}
for (const k in TX.MSG) D.msg[k] = TX.MSG[k];
fs.writeFileSync(FILE, JSON.stringify(D));
console.log('ok', ['prob', 'again', 'goal'].map(id => { const L = D.steps.find(s => s.id === id); return id + ':' + L.problems.map(p => p.kind === 'move' ? p.n + '/' + (p.ev[0][2] - p.ev[1][2]).toFixed(3) : 'c').join(' '); }).join('  '));
