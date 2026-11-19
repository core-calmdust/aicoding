// 雀華：練習問題の整合性チェック（2026-11-20、ユーザー「ツモを選ぶのが最良なのにミスになる。問題の内容と整合性を精査して」）
// 和了している手（ツモが出る）・槓子・解説の抜け（正解の牌に「正解」の解説がない、正解でない牌に「正解」と出る）を探す。node mahjong/tools/audit-drills.js → bad 0 / notes problems 0
global.window = global; const MJ = require('../engine.js'); const D = require('../drills.js');
let bad = 0;
for (const th in D) D[th].forEach((d, i) => {
  const ts = MJ.parse(d.me + d.drawn); const c = new Array(34).fill(0); ts.forEach(t => c[t]++);
  const m = d.melds ? d.melds.length : 0;
  const sh = MJ.shanten(c, m);
  const quad = c.some(x => x >= 4);
  if (sh === -1 || quad) { bad++; console.log(th, i, d.lv, 'complete=' + (sh === -1), 'quad=' + quad, d.me, d.drawn); }
});
console.log('bad', bad);
let miss = 0;
const key = t => t >= 27 ? (t - 26) + 'z' : (t % 9 + 1) + 'mps'[(t / 9) | 0];
for (const th in D) D[th].forEach((d, i) => { if (!d.notes) return;
  const ts = new Set(MJ.parse(d.me + d.drawn));
  for (const a of MJ.parse(d.d)) if (!d.notes[key(a)] || !/正解|勝負/.test(d.notes[key(a)].ja)) { miss++; console.log('ans note', th, i, key(a)); }
  for (const t of ts) if (!d.notes[key(t)] && !d.notes['*']) { miss++; console.log('no note', th, i, key(t)); }
  for (const k in d.notes) if (k !== '*' && !MJ.parse(d.d).map(key).includes(k) && /^正解/.test(d.notes[k].ja)) { miss++; console.log('wrong says right', th, i, k); }
});
console.log('notes problems', miss);
