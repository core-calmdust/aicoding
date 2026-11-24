// ur/tools/ur_lessfacts.js — ウルのレッスンの盤の事実（2026-11-24、担当C）。gen_lessons_lut.js と tools/lesson-verify.js ur が共用。
// 「次に取られる確率」＝相手の番の1回の振りで、相手に取る手がある出目の確率の合計（出目の数え上げ。ロゼットの追加の振りは含めない）。
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
const MIN_GAP = 0.05, MIN_DIST = 3, MIN_TOK = 4, RISK_D = 0.15;
// ⑤ 並べた駒の位置（降順）を1つずつくらべた違い＋出目の違い（3D の重なりの減点 tools/lesson-quality.js ⑨ と同じ見方：3つ以下は「同じ局面」）
function tokDiff(a, b, na, nb) { if (a.rule !== b.rule || a.pos[0].length !== b.pos[0].length) return 99; let d = na !== nb ? 1 : 0; for (const sd of [0, 1]) { const x = a.pos[sd].slice().sort((p, q) => q - p), y = b.pos[sd].slice().sort((p, q) => q - p); x.forEach((v, i) => { if (v !== y[i]) d++; }); } return d; }
const pct = x => Math.round(x * 100);
function norm(s) { const t = E.clone(s); if (t.turn === 1) { t.pos = [t.pos[1], t.pos[0]]; t.turn = 0; } t.pos = t.pos.map(a => a.slice().sort((x, y) => y - x)); t.winner = -1; return t; }
const st = s => Object.assign({ winner: -1 }, s, { turn: 0 });
const rc = (rule, side, i) => { const q = E.coords(rule, side, i); return q ? { r: q[0], c: q[1] } : null; };
const spot = (rule, i) => i <= 0 ? { tray: 'start', side: 0 } : i >= E.RULES[rule].goal ? { tray: 'goal', side: 0 } : rc(rule, 0, i);
// 手 m のあと、相手の1回の振りで（どれかの駒が）取られる確率
function riskAfter(s, m) {
  const t = E.apply(st(s), m).state; if (t.winner >= 0) return 0;
  t.turn = 1; const pr = E.RULES[s.rule].probs; let r = 0;
  for (let n = 1; n <= 4; n++) if (pr[n] && E.legalMoves(t, n).some(x => x.capture)) r += pr[n];
  return r;
}
// 手 m で動いた駒そのものが、相手の1回の振りで取られる確率
function pieceRiskAfter(s, m) {
  const t = E.apply(st(s), m).state; if (t.winner >= 0 || m.finish) return 0;
  t.turn = 1; const k = t.pos[0].indexOf(m.to); return k < 0 ? 0 : E.hitRisk(t, 0)[k];
}
// 中央のロゼット（8）に相手が次の1回で入れるか（相手の駒が 4〜7 にいて、その目で 8 に行ける）
function rivalReaches8(s) {
  const t = E.clone(st(s)); t.pos[0] = t.pos[0].map(p => p === 8 ? 0 : p); t.turn = 1;   // (8 を空けたとして)
  for (let n = 1; n <= 4; n++) if (E.legalMoves(t, n).some(x => x.to === 8)) return true;
  return false;
}
const WHY = { capture: 'w.cap', blitz: 'w.blitz', rosette: 'w.ros', center: 'w.center', hold: 'w.hold', enter: 'w.enter', advance: 'w.adv', goal: 'w.goal', escape: 'w.escape', safe: 'w.safe' };
// ④ 主題（best が主題の手か）
function themeOk(s, n, best, ms, th) {
  const alt = ms.filter(m => m.from !== best.from), rb = riskAfter(s, best), plain = !best.capture && !best.rosette && !best.finish;
  switch (th) {
    case 'rosette': return best.rosette && best.to !== 8 && !best.capture && alt.every(m => !m.rosette);
    case 'center': return s.rule === 'finkel' && best.to === 8 && !best.capture;
    case 'hold': return s.rule === 'finkel' && s.pos[0].includes(8) && best.from !== 8 && alt.some(m => m.from === 8) && rivalReaches8(s);
    case 'enter': return best.enter && !best.rosette && !best.capture;
    case 'advance': return !best.enter && plain && alt.some(m => m.enter);
    case 'goal': return best.finish;
    case 'escape': { if (!plain) return false; const t = E.clone(st(s)); t.turn = 1; const r0 = E.hitRisk(t, 0)[t.pos[0].indexOf(best.from)] || 0;
      return best.from > 0 && r0 > 0.2 && pieceRiskAfter(s, best) + 0.05 < r0 && alt.every(m => riskAfter(s, m) >= rb + RISK_D); }
    case 'safe': { const t = E.clone(st(s)); t.turn = 1; return plain && alt.every(m => riskAfter(s, m) >= rb + 0.2) && E.hitRisk(t, 0).some(r => r > 0.2); }   // (ヒントの「赤い印（危険な駒）」がある局面)
    case 'capture': return best.capture && alt.some(m => !m.capture);
    case 'nocap': return !best.capture && alt.some(m => m.capture);
    case 'blitz': return s.rule === 'blitz' && best.capture;
  }
  return false;
}
// ⑦⑧ 不正解の手の、盤の事実による理由（言えなければ null）
function ngKey(s, n, best, m, th) {
  const rb = riskAfter(s, best), rm = riskAfter(s, m), P = { r: pct(rm), q: pct(rb) };
  if (best.capture && !m.capture) return ['n.noCap', {}];
  if (th === 'hold' && m.from === 8) return rivalReaches8(s) ? ['n.leave8', {}] : null;
  if (best.finish && !m.finish) return ['n.noGoal', {}];
  if (s.rule === 'finkel' && best.to === 8 && m.to !== 8 && !m.rosette) return ['n.noCenter', {}];
  if (best.rosette && !m.rosette) return ['n.noRos', {}];
  if (m.capture && !best.capture) return pieceRiskAfter(s, m) >= rb + RISK_D && Math.abs(pieceRiskAfter(s, m) - rm) < 1e-9 ? ['n.capRisk', P] : null;
  if ((m.rosette && !best.rosette) || (m.finish && !best.finish)) return null;   // (その手にしかない得があるのに、理由を言えない)
  if (rm >= rb + RISK_D) return ['n.risk', P];
  return null;
}
function whyOf(s, n, best, th) {
  if (th === 'nocap') th = best.to === 8 && s.rule === 'finkel' ? 'center' : best.rosette ? 'rosette' : best.finish ? 'goal' : 'safe';
  if (th === 'advance' || th === 'enter') th = best.enter ? 'enter' : 'advance';
  return [WHY[th], { r: pct(riskAfter(s, best)) }];
}
// 1局面の判定：完全解析表で全合法手を並べ、①〜④⑦⑧
function judge(T, s0, n, th, opt = {}) {
  const s = st(s0), ms = E.legalMoves(s, n), minMoves = opt.minMoves || 3, why = [];
  const ev = ms.map(m => [m.from, m.to, +T.after(s, m).toFixed(4)]).sort((a, b) => b[2] - a[2]);
  if (ms.length < minMoves) why.push(`③合法手${ms.length}`);
  if (!ev.length) return { ok: false, why };
  const gap = ev.length > 1 ? ev[0][2] - ev[1][2] : 1;
  if (gap < MIN_GAP) why.push(`②2番目との差${gap.toFixed(3)}`);
  if (ev[0][2] < 0.03 || ev[0][2] > 0.97) why.push(`もう決着（${ev[0][2]}）`);
  const best = ms.find(m => m.from === ev[0][0]);
  if (!themeOk(s, n, best, ms, th)) why.push(`④主題 ${th} の手でない`);
  const ng = {};
  for (const [f] of ev.slice(1)) { const k = ngKey(s, n, best, ms.find(m => m.from === f), th); if (!k) why.push(`⑦不正解 ${f} の理由を盤の事実で言えない`); else ng[f] = k; }
  return { ok: !why.length, fail: why, ev, gap, best, th, ng, why: whyOf(s, n, best, th) };   // (fail: 不合格の理由、why: 正解の理由文)
}
function lookMarks(s0, n, best, theme) {
  const s = st(s0), out = [];
  const t = E.clone(s); t.turn = 1; const risk = E.hitRisk(t, 0);
  s.pos[0].forEach((q, k) => { if (risk[k] > 0.2) { const c = rc(s.rule, 0, q); if (c) out.push(Object.assign(c, { type: 'danger', text: pct(risk[k]) + '%' })); } });
  if (theme === 'rosette' || theme === 'center' || theme === 'hold') for (const i of (theme === 'center' ? [8] : E.RULES[s.rule].rosettes)) { const c = rc(s.rule, 0, i); if (c) out.push(Object.assign(c, { type: 'glow' })); }   // (中央：ヒントの「光る中央のマス」だけ光らせる)
  if (best.capture) out.push(Object.assign(rc(s.rule, 0, best.to), { type: 'ring', color: '#ff9b90' }));
  return out;
}
function riskBest(T, p) { const s = st(p.s), ms = E.legalMoves(s, p.n); let b = null, v = -1; for (const m of ms) { const x = T.after(s, m); if (x > v) { v = x; b = m; } } return b ? pieceRiskAfter(s, b) : 0; }
// ルール説明（ur/tour.js・atlas/rules/ur.js）の盤
function tourStates(root) {
  const out = [];
  for (const f of ['ur/tour.js', 'atlas/rules/ur.js']) {
    const src = fs.readFileSync(path.join(root, f), 'utf8'), re = /ST\((\[[\d,\s]*\]),\s*(\[[\d,\s]*\])\)/g; let m;
    const full = a => { const r = a.slice(); while (r.length < 7) r.push(0); return r; };
    while ((m = re.exec(src))) out.push({ rule: 'finkel', pos: [full(JSON.parse(m[1])), full(JSON.parse(m[2]))], turn: 0, src: f });
  }
  return out;
}
module.exports = { tokDiff, MIN_TOK, MIN_GAP, MIN_DIST, RISK_D, pct, norm, rc, spot, riskAfter, pieceRiskAfter, rivalReaches8, themeOk, ngKey, whyOf, judge, lookMarks, riskBest, tourStates, WHY };
