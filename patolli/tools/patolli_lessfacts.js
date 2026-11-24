// patolli/tools/patolli_lessfacts.js — パトリ（ベルの復元）のレッスンの盤の事実（2026-11-24、担当C）。gen_lessons_v2.js と tools/lesson-verify-patolli.js が共用。
// ベルの復元の勝ち＝先に6個上げること。勝ち負けに効くのは もう一度（腕の先）・「1」での入場・ちょうどの目での上がり・止まれないマス。
// 印のマスの罰（宝2つ）は勝ち負けを変えないので、理由には使わない（正解の手が印のマスに止まる問題は作らない）。
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
const R = E.RULES.bell, GOAL = R.goal, LL = R.L;
const MIN_GAP = 0.05, MIN_TOK = 4;          // (2番目との差 5%、駒4つ以上ちがう)
const W32 = [1, 5, 10, 10, 5, 1];             // 印の数 0..5 の出方（32通り中）
const STEPS = E.STEPS;                        // 0,1,2,3,4,10
const ways = n => { const k = STEPS.indexOf(n); return k < 0 ? 0 : W32[k]; };   // 目 n の出方（32通り中）
const st = s => ({ rule: 'bell', pos: [s.pos[0].slice(), s.pos[1].slice()], turn: 0, winner: -1, gold: (s.gold || [16, 16]).slice(), pool: s.pool == null ? 8 : s.pool, dir: [1, 1], round: 1 });
const rc = (side, i) => { const q = E.coords('bell', side, i, 1); return q ? { r: q[0], c: q[1] } : null; };
const AGAIN = []; for (let i = 1; i <= LL; i++) if (E.kind('bell', 0, i, 1) === 'e') AGAIN.push(i);   // 腕の先（7・8・22・23・37・38・52・53）
const plain = m => !m.again && !m.finish && !m.enter && !m.pen;
const onBoard = s => s.pos[0].some(i => i >= 1 && i <= LL);
// ④ 主題（best が主題の手か。ほかの手はすべて「ふつうの手」＝もう一度・上がり・入場・印のマスのどれでもない：理由が1つに決まる）
function themeOf(s0, n, best) {
  const s = st(s0);
  if (best.pen) return null;
  if (best.again && !best.enter) return 'again';
  if (best.enter && n === 1 && onBoard(s) && !best.again) return 'enter';
  if (best.finish) return 'goal';
  return null;
}
function themeOk(s0, n, best, ms, th) {
  const t = themeOf(s0, n, best); if (!t) return false;
  if (th !== 'mix' && t !== th) return false;
  return ms.every(m => m.from === best.from || plain(m));
}
// ⑦⑧ 不正解の手の、盤の事実による理由（その手で起きること＋緑の手で起きたこと）
function ngKey(s0, n, best, m) {
  if (!plain(m)) return null;
  const t = themeOf(s0, n, best), v = { x: m.from, y: m.to };
  if (t === 'again') return ['n.arm', Object.assign(v, { f: best.from, t: best.to })];
  if (t === 'enter') return ['n.enter', v];
  if (t === 'goal') return ['n.home', Object.assign(v, { f: best.from, n, k: ways(n) })];
  return null;
}
function whyOf(s0, n, best) {
  const t = themeOf(s0, n, best);
  if (t === 'again') return ['w.arm', { f: best.from, t: best.to }];
  if (t === 'enter') return ['w.enter', {}];
  if (t === 'goal') return ['w.home', { f: best.from, n, k: ways(n) }];
  return null;
}
// 追7 ヒントの印：もう一度＝この目で届く腕の先、入場＝入るマス（1）、上がり＝ちょうどの目で上がれるマス（50・56〜59）
function lookMarks(s0, n, best, th) {
  const t = th === 'mix' ? themeOf(s0, n, best) : th, out = [];
  if (t === 'again') { const s = st(s0); for (const i of AGAIN) if (s.pos[0].some(p => p >= 1 && p + n === i)) out.push(Object.assign(rc(0, i), { type: 'glow' })); }
  if (t === 'enter') out.push(Object.assign(rc(0, 1), { type: 'glow' }));
  if (t === 'goal') for (const d of [10, 4, 3, 2, 1]) out.push(Object.assign(rc(0, GOAL - d), { type: 'glow' }));
  return out;
}
// ⑤ 駒の位置を1つずつくらべた違い＋出目の違い
function tokDiff(a, b, na, nb) { let d = na !== nb ? 1 : 0; for (const sd of [0, 1]) { const f = x => x.slice().sort((p, q) => q - p); const x = f(a.pos[sd]), y = f(b.pos[sd]); x.forEach((v, i) => { if (v !== y[i]) d++; }); } return d; }
// ルール説明（patolli/tour.js・atlas/rules/patolli.js）の盤
function tourStates(root) {
  const out = [];
  for (const f of ['patolli/tour.js', 'atlas/rules/patolli.js']) {
    const src = fs.readFileSync(path.join(root, f), 'utf8'), re = /rule: 'bell', p0: (\[[\d,\s]*\]), p1: (\[[\d,\s]*\])/g; let m;
    while ((m = re.exec(src))) { const full = a => { const r = a.slice(); while (r.length < 6) r.push(0); return r; }; out.push({ rule: 'bell', pos: [full(JSON.parse(m[1])), full(JSON.parse(m[2]))], turn: 0, src: f }); }
  }
  return out;
}
// 選ぶ問題の数え上げ（追23）：駒 i が腕の先に止まる目／次の投げで上がれる目（止まれないマスは除く）
function againRolls(s0, i) { const s = st(s0); return [1, 2, 3, 4, 10].filter(n => E.legalMoves(s, n).some(m => m.from === i && m.again)); }
function goalRolls(s0) { const s = st(s0); return [1, 2, 3, 4, 10].filter(n => E.legalMoves(s, n).some(m => m.finish)); }
module.exports = { R, GOAL, LL, MIN_GAP, MIN_TOK, W32, ways, st, rc, AGAIN, plain, themeOf, themeOk, ngKey, whyOf, lookMarks, tokDiff, tourStates, againRolls, goalRolls };
