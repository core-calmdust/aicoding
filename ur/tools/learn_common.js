// ur/tools/learn_common.js — レッスン・パズル生成の共通部品（自己対局の局面プール、手の分類、理由文）
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js');

// 手番＝明（side 0）に正規化（finkel / blitz は盤が上下対称なので駒の配列を入れ替えるだけ）
function norm(s) { const t = E.clone(s); if (t.turn === 1) { t.pos = [t.pos[1], t.pos[0]]; t.turn = 0; } t.pos = t.pos.map(a => a.slice().sort((x, y) => y - x)); t.winner = -1; return t; }
const mv = m => [m.from, m.to];
const pct = x => Math.round(x * 100);

// 自己対局で「2手以上ある」局面を集める
function selfPlay(rule, games, seed) {
  const rng = E.mulberry32(seed), out = [], seen = new Set();
  for (let g = 0; g < games; g++) {
    let s = E.newGame(rule, g & 1);
    const lv = [6 + Math.floor(rng() * 15), 6 + Math.floor(rng() * 15)];
    for (let ply = 0; ply < 400 && s.winner < 0; ply++) {
      const { n } = E.rollDice(rng, rule);
      const ms = E.legalMoves(s, n);
      if (ms.length >= 2) {
        const t = norm(s), k = E.key(t) + '/' + n;
        if (!seen.has(k)) { seen.add(k); out.push({ s: t, n, ply }); }
      }
      const m = ms.length ? E.think(s, n, lv[s.turn], { rng }) : null;
      s = E.apply(s, m).state;
    }
  }
  return out;
}
// 評価付きのプール（キャッシュ）
function pool(rule, games, seed, file) {
  if (file && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const P = selfPlay(rule, games, seed);
  const t0 = Date.now();
  P.forEach((p, i) => {
    p.ev = E.evaluate(p.s, p.n).map(x => [x.move.from, x.move.to, +x.wp.toFixed(4)]);
    if (i % 500 === 0) process.stderr.write(`  ${rule} ${i}/${P.length} ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
  });
  if (file) fs.writeFileSync(file, JSON.stringify(P));
  return P;
}
// 深さ3で再検証：最善手が同じで差が十分か
function verify(p, minGap) {
  const ev = E.evaluate(p.s, p.n, { depth: 3 });
  if (ev.length < 2) return null;
  const gap = ev[0].wp - ev[1].wp;
  if (ev[0].move.from !== p.ev[0][0] || gap < minGap) return null;
  return ev.map(x => [x.move.from, x.move.to, +x.wp.toFixed(3)]);
}

// ---- 局面と手の性質
function moveOf(s, n, from) { return E.legalMoves(s, n).find(m => m.from === from); }
function after(s, m) { return E.apply(s, m).state; }
function riskSum(s, side) { return E.hitRisk(s, side).reduce((a, b) => a + b, 0); }
function riskAfter(s, m) {   // 指した後の自分の駒が次に取られる確率の合計（もう一度振れる場合も相手番で計る）
  const t = after(s, m); t.turn = 1; return riskSum(t, 0);
}
function maxRiskAfter(s, m) { const t = after(s, m); t.turn = 1; return Math.max(0, ...E.hitRisk(t, 0)); }
function contact(s) {   // まだ取り合いが起こりうるか：両者に共有の列の終わり（12）までの駒が残っていれば起こりうる
  const rl = E.RULES[s.rule];
  if (s.rule !== 'finkel') return true;
  const back = side => s.pos[side].some(p => p <= 12);
  return back(0) && back(1);
}
function phase(s) { const g = E.RULES[s.rule].goal; return s.pos[0].filter(p => p === g).length + s.pos[1].filter(p => p === g).length; }

// 手の分類（最善手 b と全候補 ev から、テーマと理由）
function classify(p) {
  const s = p.s, n = p.n, rl = E.RULES[s.rule];
  const ms = E.legalMoves(s, n), best = moveOf(s, n, p.ev[0][0]);
  const alt = ms.filter(m => m.from !== best.from);
  const on8 = s.pos[0].includes(8) && s.rule === 'finkel';
  const T = new Set();
  if (best.capture && alt.some(m => !m.capture)) T.add('capture');
  if (!best.capture && alt.some(m => m.capture)) T.add('nocap');
  if (best.rosette && best.to !== 8 && !best.capture && alt.every(m => !m.rosette)) T.add('rosette');
  if (s.rule === 'finkel' && best.to === 8 && !best.capture) T.add('center');
  if (on8 && best.from !== 8 && alt.some(m => m.from === 8)) T.add('hold');
  if (best.enter && !best.rosette && !best.capture && alt.length) T.add('enter');
  if (!best.enter && !best.capture && !best.rosette && alt.some(m => m.enter)) T.add('advance');
  if (best.finish && alt.length) T.add('goal');
  const r0 = E.hitRisk(Object.assign(E.clone(s), { turn: 1 }), 0)[best.piece] || 0;
  if (!best.capture && !best.rosette && !best.finish && r0 > 0.2 && maxRiskAfter(s, best) + 0.05 < r0 && riskAfter(s, best) + 0.15 < Math.min(...alt.map(m => riskAfter(s, m)))) T.add('escape');
  if (!best.capture && !best.rosette && riskAfter(s, best) + 0.2 <= Math.min(...alt.map(m => riskAfter(s, m)))) T.add('safe');
  if (s.rule === 'finkel' && !contact(s)) T.add('race');
  if (s.rule === 'blitz' && best.capture) T.add('blitz');
  return [...T];
}
// 理由（why）と誤答の説明（ng）
function reasons(p, theme) {
  const s = p.s, n = p.n, best = moveOf(s, n, p.ev[0][0]);
  const a = pct(p.ev[0][2]), b = pct(p.ev[1][2]);
  const key = { capture: 'w.cap', blitz: 'w.blitz', rosette: 'w.ros', center: 'w.center', hold: 'w.hold', enter: 'w.enter', advance: 'w.adv', goal: 'w.goal', escape: 'w.escape', safe: 'w.safe', nocap: 'w.nocap', race: 'w.race' }[theme] || 'w.gen';
  const why = [key, { a, b, r: pct(riskAfter(s, best)), d: best.to - 0 }];
  if (theme === 'capture' || theme === 'blitz') why[1].d = best.to;   // 相手が失う歩数の目安（取ったマスの自分の path ≒ 相手の path）
  const ng = {};
  for (const [f, t, wp] of p.ev.slice(1)) {
    const m = moveOf(s, n, f), x = pct(wp);
    let k = 'n.gen';
    if (best.capture && !m.capture) k = 'n.noCap';
    else if (theme === 'hold' && f === 8) k = 'n.leave8';
    else if (best.rosette && !m.rosette) k = 'n.noRos';
    else if (riskAfter(s, m) > riskAfter(s, best) + 0.15) k = 'n.risk';
    else if (m.capture && !best.capture) k = 'n.capBad';
    ng[f] = [k, { x, a, r: pct(riskAfter(s, m)) }];
  }
  return { why, ng };
}
// 盤の印（ヒント2段目）
function lookMarks(p, theme) {
  const s = p.s, n = p.n, best = moveOf(s, n, p.ev[0][0]), out = [];
  const rc = (side, i) => { const q = E.coords(s.rule, side, i); return q ? { r: q[0], c: q[1] } : null; };
  const t = E.clone(s); t.turn = 1; const risk = E.hitRisk(t, 0);
  s.pos[0].forEach((q, k) => { if (risk[k] > 0.2) { const c = rc(0, q); if (c) out.push(Object.assign(c, { type: 'danger', text: pct(risk[k]) + '%' })); } });
  if (theme === 'rosette' || theme === 'center' || theme === 'hold') for (const i of E.RULES[s.rule].rosettes) { const c = rc(0, i); if (c) out.push(Object.assign(c, { type: 'glow' })); }
  if (best.capture) { const c = rc(0, best.to); out.push(Object.assign(c, { type: 'ring', color: '#ff9b90' })); }
  return out;
}
module.exports = { E, norm, mv, pct, selfPlay, pool, verify, moveOf, after, riskAfter, maxRiskAfter, contact, phase, classify, reasons, lookMarks };

// ---- 合成局面：レース（取り合いなし）・終盤
function synthRace(count, seed) {
  const rng = E.mulberry32(seed), out = [], seen = new Set();
  const pick = a => a[Math.floor(rng() * a.length)];
  for (let tries = 0; out.length < count && tries < count * 400; tries++) {
    // 取り合いのない局面：片方の駒がすべて自陣の最後の2マスかゴール（13・14・15）
    const done = [13, 14, 15, 15, 15], spread = [0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 15];
    const fin = Array.from({ length: 7 }, () => pick(done)), run = Array.from({ length: 7 }, () => pick(spread));
    if (fin.every(x => x === 15)) fin[0] = pick([13, 14]);
    if (run.every(x => x === 15)) run[0] = pick([5, 9, 11]);
    const [a, b] = rng() < 0.6 ? [run, fin] : [fin, run];
    const s = { rule: 'finkel', pos: [a, b], turn: 0, winner: -1 };
    // 同じマスに自分の駒が2つ以上は不可
    const ok = sd => { const on = s.pos[sd].filter(p => p >= 1 && p <= 14); return new Set(on).size === on.length; };
    if (!ok(0) || !ok(1)) continue;
    // 中央の列で両者が同じマスにいないこと
    const c0 = new Set(a.filter(p => p >= 5 && p <= 12)); if (b.some(p => p >= 5 && p <= 12 && c0.has(p))) continue;
    if (contact(s)) continue;
    const n = 1 + Math.floor(rng() * 4), ms = E.legalMoves(s, n); if (ms.length < 2) continue;
    const t = norm(s), k = E.key(t) + '/' + n; if (seen.has(k)) continue; seen.add(k);
    const ev = E.evaluate(t, n).map(x => [x.move.from, x.move.to, +x.wp.toFixed(4)]);
    out.push({ s: t, n, ev, synth: 1 });
  }
  return out;
}
module.exports.synthRace = synthRace;
// 局面のおおまかな署名（ほぼ同じ局面の重複除け）：盤上の駒の位置と出目・最善手
module.exports.sig = p => p.s.pos.map(a => a.filter(x => x >= 1 && x <= 16).sort((x, y) => x - y).join('.')).join('|') + '/' + p.n + '/' + p.ev[0][0];
