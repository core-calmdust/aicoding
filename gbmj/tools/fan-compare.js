// 番種判定の照合：node gbmj/tools/fan-compare.js cases.jsonl lib.jsonl [件数表示]
// lib.jsonl は作業環境だけで PyMahjongGB（MIT）から作る照合データ（サイトには載せない）。
// 2006年版と PyMahjongGB（1998年版準拠）で点や扱いが違うと裁定した所は adapt() で照合データ側を2006年版に直してから比べる。
'use strict';
const fs = require('fs');
const G = require('../fan.js');
const [, , cf, lf, showN] = process.argv;
const cases = fs.readFileSync(cf, 'utf8').trim().split('\n').map(JSON.parse);
const libs = fs.readFileSync(lf, 'utf8').trim().split('\n').map(JSON.parse);
const ZH = {}; for (let i = 1; i <= 81; i++) ZH[G.FANS[i][2]] = i;
Object.assign(ZH, { '独听・单钓': 79, '独听・嵌张': 78, '独听・边张': 77, '明暗杠': 57, '花牌': 81 });
const RULES = require('./fan-rulings.js');
let ok = 0, bad = 0, notwin = 0, tie = 0, r5ok = 0; const rh = {}; const cat = {};
const name = id => G.FANS[id][2];
const fmt = m => Object.keys(m).sort((a, b) => a - b).map(k => name(+k) + (m[k] > 1 ? 'x' + m[k] : '')).join(' ');
const ex = [];
cases.forEach((o, i) => {
  const L = libs[i];
  const mine = G.calc(o);
  let lib = null;
  if (!L.err) { lib = {}; for (const [p, c, n] of L) { const id = ZH[n]; if (!id) throw new Error('unknown ' + n); lib[id] = (lib[id] || 0) + c; } }
  if (lib) for (const h of RULES.adapt(o, lib, mine)) rh[h] = (rh[h] || 0) + 1;
  if (lib && lib.__r5) {
    delete lib.__r5;
    let lp = 0; for (const k of Object.keys(lib)) { const id = +k; if (id === 81) continue; lp += lib[k] * (id === 57 && mine.mixedKong ? 6 : G.FANS[id][1]); }
    if (mine.ok && mine.pts === lp + 1) { ok++; r5ok++; return; }
  }
  const mm = {}; if (mine.ok) for (const f of mine.fans) mm[f.id] = f.n;
  if (!mine.ok && !lib) { notwin++; ok++; return; }
  const a = fmt(mm), b = lib ? fmt(lib) : 'ERR ' + L.err;
  if (a === b) { ok++; return; }
  // 同点で名乗りだけ違う（分け方の選び方）なら一致とみなす：自作の同点の候補のどれかが照合データと同じか
  if (lib && mine.ok && mine.alts.some(r => { const m = {}; for (const f of r.fans) m[f.id] = f.n; if (mine.flowers) m[81] = mine.flowers; const l2 = Object.assign({}, lib); return fmt(m) === fmt(l2); })) { ok++; tie++; return; }
  bad++;
  const ka = new Set(Object.keys(mm)), kb = new Set(Object.keys(lib || {}));
  const diff = [...ka].filter(k => !kb.has(k) || mm[k] !== lib[k]).map(k => '+' + name(+k)).concat([...kb].filter(k => !ka.has(k) || mm[k] !== lib[k]).map(k => '-' + name(+k))).join(' ');
  const key = lib ? diff : 'liberr ' + L.err + (mine.ok ? '' : ' mine:' + mine.err);
  (cat[key] = cat[key] || []).push(i);
  if (ex.length < 3) ex.push(i);
});
console.log(`一致 ${ok} / ${cases.length}（どちらも和了でない ${notwin}、同点で名乗りだけ違う ${tie}）、不一致 ${bad}`); console.log('裁定で照合データを直した件数', JSON.stringify(rh), '（R5 は点で一致 ' + r5ok + '）');
const show = +showN || 2;
for (const [k, v] of Object.entries(cat).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n[${v.length}] ${k}`);
  for (const i of v.slice(0, show)) {
    const o = cases[i]; const mine = G.calc(o);
    console.log('  ', JSON.stringify(o), '\n    mine:', mine.ok ? fmt(Object.fromEntries(mine.fans.map(f => [f.id, f.n]))) + ' form=' + mine.form : mine.err, '\n    lib :', JSON.stringify(libs[i]));
  }
}
