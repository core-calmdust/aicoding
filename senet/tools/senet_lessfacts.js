// senet/tools/senet_lessfacts.js — セネトのレッスンの盤の事実（2026-11-24、担当C、3D対応）。gen_lessons_v2.js と tools/lesson-verify-senet.js が共用。
// 「次に入れ替えられる確率」＝自分の手のあと相手の番になったとき、相手の最初の1回の投げで、相手に入れ替えの手がある出目の確率の合計
// （出目の数え上げ：1:4/16・2:6/16・3:4/16・4:1/16・5:1/16。もう一度投げる分は含めない）。手のあと自分がもう一度投げる目（1・4・5）では
// 相手がすぐ投げないので、この確率は理由に使わない（言えない）。
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
const MIN_GAP = 0.05, MIN_TOK = 4, RISK_D = 0.15, DEPTHS = [2, 3, 4];
const pct = x => Math.round(x * 100);
const P16 = [0, 4, 6, 4, 1, 1];
// ⑤ 並べた駒の位置（降順）を1つずつくらべた違い＋出目の違い（tools/lesson-quality.js ⑨ と同じ見方：3つ以下は「同じ局面」）
function tokDiff(a, b, na, nb) { let d = na !== nb ? 1 : 0; for (const sd of [0, 1]) { const x = full(a.pos[sd]).sort((p, q) => q - p), y = full(b.pos[sd]).sort((p, q) => q - p); x.forEach((v, i) => { if (v !== y[i]) d++; }); } return d; }
const full = a => { const r = a.slice(); while (r.length < 5) r.push(31); return r; };
function norm(s) { const t = E.clone(s); if (t.turn === 1) { t.pos = [t.pos[1], t.pos[0]]; t.turn = 0; } t.pos = t.pos.map(a => a.slice().sort((x, y) => y - x)); t.winner = -1; t.rule = 'std'; return t; }
const st = s => Object.assign({ winner: -1, rule: 'std' }, E.clone(Object.assign({ winner: -1 }, s)), { turn: 0 });
const sq = i => { const r = Math.floor((i - 1) / 10), k = (i - 1) % 10; return { r, c: r === 1 ? 9 - k : k }; };
const again = n => n === 1 || n === 4 || n === 5;
const landOf = m => m.finish ? 31 : m.water ? m.dest : m.to;
// 手 m のあと、相手の最初の1回の投げで（どれかの駒が）入れ替えられる確率。m のあと自分がもう一度投げるなら null（言えない）
function riskAfter(s, m) {
  const r = E.apply(st(s), m, m.n), t = r.state; if (t.winner >= 0) return 0; if (r.again) return null;
  let v = 0; for (let n = 1; n <= 5; n++) if (E.legalMoves(t, n).some(x => x.capture)) v += P16[n];
  return v / 16;
}
// 相手の番だとして、いまの局面で自分の駒それぞれが入れ替えられうる確率（赤い印）
function riskNow(s) { const t = st(s); t.turn = 0; return E.hitRisk(t, 0); }
// 手 m で動いた駒そのものが、相手の最初の1回の投げで入れ替えられうる確率
function pieceRiskAfter(s, m) {
  const r = E.apply(st(s), m, m.n), t = r.state; if (t.winner >= 0 || m.finish) return 0; if (r.again) return null;
  const k = t.pos[0].indexOf(landOf(m)); return k < 0 ? 0 : E.hitRisk(t, 0)[k];
}
const b0 = s => E.board(st(s));
function pairAfter(s, m) {   // 動いた駒が味方と隣り合う（入れ替えられない形）。26〜30 はもともと安全なので数えない
  if (m.finish || m.water) return false; const t = E.apply(st(s), m, m.n).state, b = E.board(t), q = m.to;
  return q <= 25 && ((q > 1 && b[q - 1] === 0) || (q < 30 && b[q + 1] === 0));
}
function contact(s) { const a = s.pos[0].filter(p => p <= 25), b = s.pos[1].filter(p => p <= 25); return a.some(p => b.some(q => q > p)) || b.some(p => a.some(q => q > p)); }
const special = m => m.capture || m.finish || m.water || m.to === 26;
// ④ 主題（best が主題の手か）
function themeOk(s, n, best, ms, th) {
  const alt = ms.filter(m => m.from !== best.from), rb = riskAfter(s, best);
  switch (th) {
    case 'swap': return best.capture && alt.some(m => !m.capture);
    case 'pair': return !special(best) && pairAfter(s, best) && rb != null && alt.every(m => !pairAfter(s, m));
    case 'escape': { if (special(best) || rb == null) return false; const r0 = riskNow(s)[st(s).pos[0].indexOf(best.from)] || 0, pr = pieceRiskAfter(s, best);
      return r0 > 0.2 && pr != null && pr + 0.1 < r0 && alt.every(m => riskAfter(s, m) != null && riskAfter(s, m) >= rb + RISK_D); }
    case 'safe': return !special(best) && !pairAfter(s, best) && rb != null && riskNow(s).some(r => r > 0.2) && alt.every(m => riskAfter(s, m) != null && riskAfter(s, m) >= rb + 0.2);
    case 'beauty': return best.to === 26 && !best.capture && alt.every(m => m.to !== 26);
    case 'water': return n === 1 && s.pos[0].includes(26) && !best.water && alt.some(m => m.water);
    case 'exit': return best.finish && alt.some(m => !m.finish);
  }
  return false;
}
// ⑦⑧ 不正解の手の、盤の事実による理由（言えなければ null）
function ngKey(s, n, best, m, th) {
  const rb = riskAfter(s, best), rm = riskAfter(s, m);
  if (m.water) return ['n.water', { d: m.dest }];
  if (best.capture && !m.capture) return ['n.noSwap', { k: best.to - best.from }];
  if (best.finish && !m.finish) return ['n.noHome', { f: best.from }];
  if (best.to === 26 && m.to !== 26 && !m.capture && !m.finish) return ['n.noBeauty', {}];
  if (special(m)) return null;   // (その手にしかない得（入れ替え・上がり・美の家）があるのに、理由を言えない)
  if (rb != null && rm != null && rm >= rb + RISK_D) return ['n.risk', { r: pct(rm), q: pct(rb) }];
  return null;
}
const WHY = { swap: 'w.swap', pair: 'w.pair', escape: 'w.escape', safe: 'w.safe', beauty: 'w.beauty', water: 'w.water', exit: 'w.home' };
function whyOf(s, n, best, th) {
  const rb = riskAfter(s, best), v = { r: rb == null ? null : pct(rb), k: best.capture ? best.to - best.from : 0, f: best.from, t: best.to };
  if (th === 'escape') { v.r0 = pct(riskNow(s)[st(s).pos[0].indexOf(best.from)] || 0); v.r1 = pct(pieceRiskAfter(s, best) || 0); }
  return [WHY[th], v];
}
// 1局面の判定：深さ 2・3・4 の期待値探索（評価ネット）で全合法手を並べ、①〜④⑦⑧。深さで最善・順位が変わる局面は使わない（追4）
function rank(s, n, d) { return E.evaluate(st(s), n, { depth: d }).map(e => [e.move.from, landOf(e.move), +e.wp.toFixed(4)]); }
function judge(s0, n, th, opt = {}) {
  const s = st(s0), ms = E.legalMoves(s, n), minMoves = opt.minMoves || 3, why = [];
  if (ms.length < minMoves) why.push(`③合法手${ms.length}`);
  if (!ms.length) return { ok: false, fail: why };
  const evs = (opt.depths || DEPTHS).map(d => rank(s, n, d)), ev = evs[evs.length - 1];
  for (const e of evs) { const g = e.length > 1 ? e[0][2] - e[1][2] : 1; if (g < MIN_GAP) why.push(`②2番目との差${g.toFixed(3)}`); }
  for (const e of evs) if (e.map(x => x[0]).join() !== ev.map(x => x[0]).join()) { why.push('追4 深さで順位が変わる'); break; }
  const gap = ev.length > 1 ? ev[0][2] - ev[1][2] : 1;
  if (ev[0][2] < 0.03 || ev[0][2] > 0.97) why.push(`もう決着（${ev[0][2]}）`);
  const best = ms.find(m => m.from === ev[0][0]);
  if (!themeOk(s, n, best, ms, th)) why.push(`④主題 ${th} の手でない`);
  const ng = {};
  for (const [f] of ev.slice(1)) { const k = ngKey(s, n, best, ms.find(m => m.from === f), th); if (!k) why.push(`⑦不正解 ${f} の理由を盤の事実で言えない`); else ng[f] = k; }
  return { ok: !why.length, fail: why, ev, gap, best, th, ng, why: whyOf(s, n, best, th) };
}
// 盤の印：赤＝相手の番なら入れ替えられうる駒（20%超、確率つき）。主題のマス（美の家・水の家と戻り先・出口）を光らせる
function lookMarks(s0, n, best, theme) {
  const s = st(s0), out = [], risk = riskNow(s);
  s.pos[0].forEach((q, k) => { if (q <= 25 && risk[k] > 0.2) out.push(Object.assign(sq(q), { type: 'danger', text: pct(risk[k]) + '%' })); });
  if (theme === 'beauty') out.push(Object.assign(sq(26), { type: 'glow' }));
  if (theme === 'water') out.push(Object.assign(sq(27), { type: 'glow', color: '#4da3ff' }));
  if (theme === 'exit') for (const i of [26, 28, 29, 30]) if (s.pos[0].includes(i)) out.push(Object.assign(sq(i), { type: 'glow' }));
  if (theme === 'swap' && best.capture) out.push(Object.assign(sq(best.to), { type: 'ring', color: '#ff9b7a' }));
  return out;
}
// ルール説明（senet/tour.js・atlas/rules/senet.js）の盤
function tourStates(root) {
  const out = [];
  for (const f of ['senet/tour.js', 'atlas/rules/senet.js']) {
    const src = fs.readFileSync(path.join(root, f), 'utf8'), re = /ST\((\[[\d,\s]*\]),\s*(\[[\d,\s]*\])\)/g; let m;
    while ((m = re.exec(src))) out.push({ rule: 'std', pos: [full(JSON.parse(m[1])), full(JSON.parse(m[2]))], turn: 0, src: f });
  }
  return out;
}
module.exports = { MIN_GAP, MIN_TOK, RISK_D, DEPTHS, P16, pct, tokDiff, full, norm, st, sq, again, landOf, riskAfter, riskNow, pieceRiskAfter, pairAfter, contact, special, themeOk, ngKey, whyOf, judge, rank, lookMarks, tourStates, WHY, b0 };
