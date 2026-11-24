// patolli/tools/gen_pool_v2.js — レッスン（ベルの復元・v2）の候補の局面を自己対局から集めて厳密に解く（2026-11-24、担当C）。
// node patolli/tools/gen_pool_v2.js <games> <seed> <out.json> [limit]
// 候補：合法手3つ以上、主題の手（もう一度・「1」での入場・上がり）がちょうど1つで、ほかはふつうの手。→ patolli_exact.c で全合法手の勝率。
'use strict';
const fs = require('fs');
const E = require('../engine.js'), F = require('./patolli_lessfacts.js'), X = require('./patolli_exact.js');
const [games = 200, seed = 1, out = '/tmp/pt/pool.json', limit = 3000000, maxUnf = 3] = process.argv.slice(2);
let h = (+seed * 2654435761) >>> 0; const rng = () => { h = (h + 0x6D2B79F5) >>> 0; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };   // (mulberry32)
const cand = [];
for (let g = 0; g < +games; g++) {
  let s = E.newGame('bell'); s.turn = g % 2;
  for (let t = 0; t < 600 && s.winner < 0; t++) {
    const r = E.rollDice(rng), n = r.n, ms = E.legalMoves(s, n);
    const unf = a => a.filter(p => p !== F.GOAL).length;
    if (ms.length >= 3 && unf(s.pos[0]) <= +maxUnf && unf(s.pos[1]) <= +maxUnf) {   // (手番が side 1 なら両者を入れかえる：道は対称なので同じ局面)
      const me = s.turn, v = { rule: 'bell', pos: [s.pos[me].slice(), s.pos[1 - me].slice()], turn: 0, winner: -1, gold: [16, 16], pool: 8, dir: [1, 1], round: 1 }, vm = E.legalMoves(v, n);
      const sp = vm.filter(m => !F.plain(m));
      if (sp.length === 1 && F.themeOf(v, n, sp[0])) cand.push({ s: { rule: 'bell', pos: v.pos, turn: 0 }, n, th: F.themeOf(v, n, sp[0]), spec: sp[0].from + '-' + sp[0].to });
    }
    const m = ms.length ? E.think(s, n, 8, { rng }) : null;
    s = E.apply(s, m, n).state;
  }
}
// 片方の向きの局面（手番 side 1）は捨てた。重複を除く
const rem = c => c.s.pos.flat().reduce((a, p) => a + (60 - p), 0);   // (残りの合計が小さい＝解く局面が少ない順に、上限 maxC 個)
const seen = new Set(), C0 = cand.filter(c => { const k = JSON.stringify([c.s.pos.map(a => a.slice().sort((x, y) => x - y)), c.n]); if (seen.has(k)) return false; seen.add(k); return true; });
const C = C0.sort((a, b) => rem(a) - rem(b)).slice(0, +(process.env.MAXC || 2500));
console.error('candidates', C.length, C.reduce((o, c) => (o[c.th] = (o[c.th] || 0) + 1, o), {}));
X.run(C.map(c => (c.q = { s: c.s, n: c.n }, c.q)), +limit);
const res = [];
for (const c of C) { if (!c.q.r) continue; const ev = Object.entries(c.q.r.mv).map(([k, v]) => [+k.split('-')[0], +k.split('-')[1], +v.toFixed(4), v]).sort((a, b) => b[3] - a[3]);
  res.push({ s: c.s, n: c.n, th: c.th, spec: c.spec, size: c.q.r.size, ev: ev.map(e => e.slice(0, 3)), gap: ev.length > 1 ? ev[0][3] - ev[1][3] : 1, bestIs: ev[0][0] + '-' + ev[0][1] }); }
fs.writeFileSync(out, JSON.stringify(res));
const good = res.filter(r => r.bestIs === r.spec && r.gap >= F.MIN_GAP && r.ev[0][2] >= 0.05 && r.ev[0][2] <= 0.95);
console.error('solved', res.length, 'good', good.length, good.reduce((o, c) => (o[c.th] = (o[c.th] || 0) + 1, o), {}), 'themeBest', res.filter(r => r.bestIs === r.spec).length);
