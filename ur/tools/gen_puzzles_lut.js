// ur/tools/gen_puzzles_lut.js — 「次の一手」パズル（ur/puzzles.json）を完全解析表（RoyalUr.net finkel.rgu）で作り直す（2026-11-24、担当C）。
// 厳しい基準：①答え＝完全解析で最善 ②2番目との差 MIN_GAP 以上（唯一）③合法手3以上 ④テーマの手段（learn_common.classify）
// ⑤ほかのパズル・レッスン（問題・準備・図）と駒3つ以上違う ⑥テーマ内は差の大きい順（易→難）
// ⑦⑧理由は盤の事実だけ（勝率の％は書かない）。全部の不正解手に事実の理由（取り逃し・ロゼット・取られる確率・ゴール…）が付く局面だけ使う。
// 使い方: node --max-old-space-size=7000 ur/tools/gen_puzzles_lut.js <finkel.rgu> [games=6000]
'use strict';
const fs = require('fs'), path = require('path');
const L = require('./learn_common.js'), X = require('./learn_text.js'), F = require('./ur_facts.js');
const E = L.E;
const T = require('./lut.js').open('finkel', process.argv[2] || '/tmp/urlut/finkel.rgu');
const GAMES = +(process.argv[3] || 6000);
const PLAN = [
  { id: 'goal', from: ['goal'], want: 22, cat: 'end' },
  { id: 'escape', from: ['escape'], want: 22, cat: 'tactics' },
  { id: 'center', from: ['center', 'hold'], want: 30, cat: 'basic' },
  { id: 'enter', from: ['enter', 'advance'], want: 24, cat: 'basic' },
  { id: 'capture', from: ['capture'], want: 32, cat: 'tactics' },
  { id: 'rosette', from: ['rosette'], want: 28, cat: 'basic' },
  { id: 'safe', from: ['safe'], want: 24, cat: 'tactics' },
];
function pool() {
  const rng = E.mulberry32(20261124), out = [], seen = new Set();
  for (let g = 0; g < GAMES; g++) {
    let s = E.newGame('finkel', g & 1); const eps = 0.15 + 0.5 * rng();
    for (let ply = 0; ply < 500 && s.winner < 0; ply++) {
      const { n } = E.rollDice(rng, 'finkel'); const ms = E.legalMoves(s, n);
      let m = null;
      if (ms.length) {
        const v = ms.map(x => T.after(s, x));
        if (ms.length >= 3) { const t = L.norm(s), k = E.key(t) + '/' + n; if (!seen.has(k)) { seen.add(k); out.push({ s: t, n }); } }
        m = rng() < eps ? ms[Math.floor(rng() * ms.length)] : ms[v.indexOf(Math.max(...v))];
      }
      s = E.apply(s, m).state;
    }
  }
  // 取り合いのないレース局面（自己対局では少ない）：片方の駒がすべて自陣の最後（13・14）かゴール
  for (let k = 0; k < 400000; k++) {
    const pick = a => a[Math.floor(rng() * a.length)];
    const fin = Array.from({ length: 7 }, () => pick([13, 14, 15, 15, 15])), run = Array.from({ length: 7 }, () => pick([0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 15]));
    if (fin.every(x => x === 15) || run.every(x => x === 15)) continue;
    const s = { rule: 'finkel', pos: rng() < 0.6 ? [run, fin] : [fin, run], turn: 0, winner: -1 };
    const okp = sd => { const on = s.pos[sd].filter(p => p >= 1 && p <= 14); return new Set(on).size === on.length; };
    if (!okp(0) || !okp(1)) continue;
    const c0 = new Set(s.pos[0].filter(p => p >= 5 && p <= 12)); if (s.pos[1].some(p => p >= 5 && p <= 12 && c0.has(p))) continue;
    if (L.contact(s)) continue;
    const n = 1 + Math.floor(rng() * 4); if (E.legalMoves(s, n).length < 3) continue;
    const t = L.norm(s), key = E.key(t) + '/' + n; if (seen.has(key)) continue; seen.add(key); out.push({ s: t, n });
  }
  return out;
}
function build(lessonStates) {
  const P = pool(); process.stderr.write(`pool ${P.length}\n`);
  const cand = [];
  for (const p of P) {
    const r = F.exact(T, p.s, p.n); if (!r.ok) continue;
    p.ev = r.ev; p.gap = r.gap; p.th = L.classify(p); cand.push(p);
  }
  process.stderr.write(`cand ${cand.length}\n`);
  const chosen = lessonStates.map(s => ({ s, fixed: 1 })), out = {};
  for (const Tm of PLAN) {
    const list = cand.filter(p => !p.used && Tm.from.some(t => p.th.includes(t))).sort((a, b) => b.gap - a.gap);
    const got = [];
    // ⑥ 易→難：差の大きいものから小さいものまで満遍なく（上位だけだと全部やさしい）
    const step = Math.max(1, Math.floor(list.length / (Tm.want * 2)));
    const order = list.map((p, i) => i).sort((a, b) => a % step - b % step || a - b);   // (差の大きい順の列から等間隔に：やさしい〜むずかしいを満遍なく)
    for (const i of order) {
      if (got.length >= Tm.want) break;
      const p = list[i]; if (p.used) continue;
      const th = F.subTheme(Tm.id, p.th);
      const r = F.reasons(p, th); if (!r) continue;   // ⑦ 不正解手のどれかに事実の理由が付かない
      if (chosen.some(q => F.dist(q.s, p.s) < 3)) continue;   // ⑤
      p.used = 1; p.r = r; p.sub = th; chosen.push(p); got.push(p);
    }
    got.sort((a, b) => b.gap - a.gap || a.ev.length - b.ev.length);
    out[Tm.id] = got;
    process.stderr.write(`${Tm.id}: ${got.length} / ${list.length}\n`);
  }
  return out;
}
function main() {
  const LS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'lessons.json'), 'utf8'));
  const sel = build(F.lessonStates(LS));
  const SHOW = ['rosette', 'center', 'enter', 'capture', 'escape', 'safe', 'goal'];   // （レース判断は外した：取り合いのない局面で合法手3以上・2番目と5%以上の差のものが完全解析でほぼ無い）
  const themes = SHOW.map(id => PLAN.find(Tm => Tm.id === id)).map(Tm => ({
    id: Tm.id, cat: Tm.cat, name: X.THEME[Tm.id].name, desc: X.THEME[Tm.id].desc, hint: X.THEME[Tm.id].hint,
    puzzles: sel[Tm.id].map((p, i) => ({ id: `${Tm.id}-${i + 1}`, s: { rule: 'finkel', pos: p.s.pos, turn: 0 }, n: p.n, ok: [[p.ev[0][0], p.ev[0][1]]], best: [p.ev[0][0], p.ev[0][1]], ev: p.ev, gap: +p.gap.toFixed(3), lut: 1, why: p.r.why, ng: p.r.ng, look: L.lookMarks(p, p.sub) })),
  }));
  const cats = ['basic', 'tactics', 'end'].map(id => ({ id, name: X.CATS[id] }));
  const data = { version: 2, rule: 'finkel', ui: X.UI, msg: F.MSG, cats, daily: themes.map(t => t.id), themes };
  const file = path.join(__dirname, '..', 'puzzles.json');
  fs.writeFileSync(file, JSON.stringify(data));
  console.log('wrote', file, themes.map(t => t.id + ':' + t.puzzles.length).join(' '), 'total', themes.reduce((a, t) => a + t.puzzles.length, 0));
}
main();
