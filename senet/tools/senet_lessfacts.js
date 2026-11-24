// senet/tools/senet_lessfacts.js — セネトのレッスンの盤の事実（2026-11-24、担当C）。gen_lessons_exact.js と tools/lesson-verify-senet.js が共用。
// 「入れ替えられる目」＝相手の番の1回の投げ（16通り：1が4・2が6・3が4・4が1・5が1）のうち、相手に入れ替える手がある目の通り数（数え上げ、追23）。
// 危険の理由（n.risk）は、出目が 2・3（もう一度投げない目）の問題だけで言う：1・4・5 だと次に投げるのはこちらなので「相手の次の投げ」にならない。
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
const MIN_GAP = 0.05, MIN_TOK = 4, RISK_D = 3;   // (2番目との差 5%、駒4つ以上ちがう、危険の差は16通り中3通り以上)
const W16 = [0, 4, 6, 4, 1, 1];
const st = s => ({ rule: s.rule || 'std', pos: [s.pos[0].slice(), s.pos[1].slice()], turn: 0, winner: -1 });
const sq = i => { const r = Math.floor((i - 1) / 10), k = (i - 1) % 10; return { r, c: r === 1 ? 9 - k : k }; };
const spot = i => i >= 31 ? { tray: 'goal', side: 0 } : sq(i);
// ⑤ 並べた駒の位置を1つずつくらべた違い＋出目の違い（31＝上がり。駒の数がちがえば上がりで埋める）
function tokDiff(a, b, na, nb) { let d = na !== nb ? 1 : 0; for (const sd of [0, 1]) { const f = x => { const y = x.slice(); while (y.length < 5) y.push(31); return y.sort((p, q) => q - p); }; const x = f(a.pos[sd]), y = f(b.pos[sd]); x.forEach((v, i) => { if (v !== y[i]) d++; }); } return d; }
// 手 m のあと、相手の次の1回の投げで（どれかの駒が）入れ替えられる目の通り数（16通り中）
function riskAfter(s, m) {
  const t = E.apply(st(s), m, m.n).state; if (t.winner >= 0) return 0;
  t.turn = 1; let r = 0;
  for (let n = 1; n <= 5; n++) if (E.legalMoves(t, n).some(x => x.capture)) r += W16[n];
  return r;
}
// 手 m で動いた駒そのものが入れ替えられる目の通り数
function pieceRiskAfter(s, m) {
  if (m.finish) return 0;
  const t = E.apply(st(s), m, m.n).state; if (t.winner >= 0) return 0;
  const to = m.water ? m.dest : m.to, k = t.pos[0].indexOf(to); if (k < 0) return 0;
  return Math.round(E.hitRisk(t, 0)[k] * 16);
}
const riskNow = s => E.hitRisk(st(s), 0).map(x => Math.round(x * 16));   // (手を指す前、各駒が相手の次の投げで入れ替えられる通り数)
function pairs(b, q, me) { return q <= 25 && ((q > 1 && b[q - 1] === me) || (q < 30 && b[q + 1] === me)); }
function wallMade(s, m) { const t = E.apply(st(s), m, m.n).state, b = E.board(t), q = m.to; if (q > 30 || m.water) return false; let a = q, z = q; while (a > 1 && b[a - 1] === 0) a--; while (z < 30 && b[z + 1] === 0) z++; return z - a + 1 >= 3; }
const AG = n => n === 1 || n === 4 || n === 5;
// ④ 主題（best が主題の手か）
function themeOk(s, n, best, ms, th) {
  const alt = ms.filter(m => m.from !== best.from), plain = !best.capture && !best.finish && !best.water && best.to !== 26;
  switch (th) {
    case 'swap': return best.capture && alt.some(m => !m.capture);
    case 'pair': { if (!plain || AG(n)) return false; const t = E.apply(st(s), best, n).state, b = E.board(t); return pairs(b, best.to, 0) && pieceRiskAfter(s, best) === 0; }
    case 'escape': { if (!plain || AG(n)) return false; const r0 = riskNow(s)[s.pos[0].indexOf(best.from)] || 0, rb = riskAfter(s, best);
      return r0 >= 4 && pieceRiskAfter(s, best) + 2 <= r0 && alt.every(m => riskAfter(s, m) >= rb + RISK_D); }
    case 'safe': return plain && !AG(n) && alt.every(m => riskAfter(s, m) >= rb3(s, best) + 4) && riskNow(s).some(r => r >= 4) && !themeOk(s, n, best, ms, 'escape');
    case 'beauty': return best.to === 26 && !best.capture;
    // 水の家：正解はふつうの手（入れ替え・上がりが正解だと、選ぶ理由がそちらになり主題からずれる：追34）
    case 'water': return s.pos[0].includes(26) && n === 1 && !best.water && !best.capture && !best.finish && ms.some(m => m.water);
    case 'exit': return best.finish;
  }
  return false;
}
const rb3 = (s, m) => riskAfter(s, m);
// ⑦⑧ 不正解の手の、盤の事実による理由（言えなければ null）
function ngKey(s, n, best, m) {
  const rb = riskAfter(s, best), rm = riskAfter(s, m), P = { r: rm, q: rb };
  if (m.water) return ['n.water', { d: m.dest }];
  if (best.capture && !m.capture) return ['n.noSwap', { f: best.from }];
  if (best.finish && !m.finish) return ['n.noHome', { f: best.from }];
  if (best.to === 26 && !best.capture && m.to !== 26 && !m.capture && !m.finish) return ['n.noBeauty', {}];
  if (m.capture || m.finish || m.to === 26) {   // (その手にしかない得：入れ替え・上がり・美の家)
    if (m.capture && !best.capture && !AG(n)) { const pr = pieceRiskAfter(s, m); if (pr >= rb + RISK_D && pr === rm) return ['n.capRisk', P]; }
    return null;
  }
  if (!AG(n) && rm >= rb + RISK_D) return [rb === 0 ? 'n.risk0' : 'n.risk', P];
  return null;
}
function whyOf(s, n, best, th) {
  if (best.capture) return ['w.swap', { f: best.from, d: best.to - best.from }];
  if (best.finish) return ['w.home', { f: best.from, n }];
  if (best.to === 26) return ['w.beauty', { n }];
  if (th === 'water') return ['w.water', { d: (s.pos[0].includes(26) && (E.legalMoves(st(s), 1).find(m => m.water) || {}).dest) || 15 }];
  if (th === 'pair') return [wallMade(s, best) ? 'w.wall' : 'w.pair', {}];
  if (th === 'escape') { const r0 = riskNow(s)[s.pos[0].indexOf(best.from)], r1 = pieceRiskAfter(s, best); return [r1 === 0 ? 'w.escape0' : 'w.escape', { r0, r1 }]; }
  const r = riskAfter(s, best); return [r === 0 ? 'w.safe0' : 'w.safe', { r }];
}
// 1局面の判定：厳密な勝率 ev（[from, to, 指した側の勝率] の良い順）で ①〜④⑦⑧
function judge(s0, n, ev, th, opt = {}) {
  const s = st(s0), ms = E.legalMoves(s, n), minMoves = opt.minMoves || 3, fail = [];
  if (ms.length < minMoves) fail.push(`③合法手${ms.length}`);
  if (!ev.length) return { ok: false, fail };
  const gap = ev.length > 1 ? ev[0][2] - ev[1][2] : 1;
  if (gap < MIN_GAP) fail.push(`②2番目との差${gap.toFixed(3)}`);
  if (ev[0][2] < 0.03 || ev[0][2] > 0.97) fail.push(`もう決着（${ev[0][2]}）`);
  const best = ms.find(m => m.from === ev[0][0]);
  if (!best || !themeOk(s, n, best, ms, th)) fail.push(`④主題 ${th} の手でない`);
  const ng = {};
  if (best) for (const [f] of ev.slice(1)) { const k = ngKey(s, n, best, ms.find(m => m.from === f)); if (!k) fail.push(`⑦不正解 ${f} の理由を盤の事実で言えない`); else ng[f] = k; }
  return { ok: !fail.length, fail, ev, gap, best, th, ng, why: best ? whyOf(s, n, best, th) : null };
}
function lookMarks(s0, n, best, th) {
  const s = st(s0), out = [], rn = riskNow(s);
  s.pos[0].forEach((q, k) => { if (q <= 30 && rn[k] > 0) out.push(Object.assign(sq(q), { type: 'danger', text: rn[k] + '/16' })); });
  if (th === 'beauty') out.push(Object.assign(sq(26), { type: 'glow' }));
  if (th === 'water') out.push(Object.assign(sq(27), { type: 'glow', color: '#4da3ff' }));
  if (th === 'exit') [26, 28, 29, 30].forEach(i => out.push(Object.assign(sq(i), { type: 'glow' })));
  if (best.capture) out.push(Object.assign(sq(best.to), { type: 'ring', color: '#ff9b7a' }));
  return out;
}
// ルール説明（senet/tour.js・atlas/rules/senet.js）の盤
function tourStates(root) {
  const out = [];
  for (const f of ['senet/tour.js', 'atlas/rules/senet.js']) {
    const src = fs.readFileSync(path.join(root, f), 'utf8'), re = /ST\((\[[\d,\s]*\]),\s*(\[[\d,\s]*\])\)/g; let m;
    while ((m = re.exec(src))) out.push({ rule: 'std', pos: [JSON.parse(m[1]), JSON.parse(m[2])], turn: 0, src: f });
  }
  return out;
}
const pipsOf = a => a.reduce((x, q) => x + (q >= 31 ? 0 : 31 - q), 0);   // 上がりまでのマス（31−位置）
module.exports = { MIN_GAP, MIN_TOK, RISK_D, W16, st, sq, spot, tokDiff, riskAfter, pieceRiskAfter, riskNow, themeOk, ngKey, whyOf, judge, lookMarks, tourStates, pipsOf, AG };
