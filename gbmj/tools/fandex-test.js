// 番種図鑑の例の検査：例の手でその番が付き、8点以上で和了できること。node gbmj/tools/fandex-test.js
'use strict';
const G = require('../fan.js'); const D = require('../fandex.js');
const P = s => { const out = []; let buf = []; for (const ch of s.replace(/\s+/g, '')) { if (/\d/.test(ch)) buf.push(+ch); else if ('mps'.includes(ch)) { const b = { m: 0, p: 9, s: 18 }[ch]; for (const n of buf) out.push(b + n - 1); buf = []; } else out.push({ E: 27, S: 28, W: 29, N: 30, P: 31, F: 32, C: 33 }[ch]); } return out; };
let bad = 0;
for (let id = 1; id <= 81; id++) {
  const e = D[id];
  const o = { melds: (e.melds || []).map(([k, t]) => ({ k, t: P(t)[0] })), hand: P(e.hand), win: P(e.win)[0], tsumo: !!e.tsumo, flowers: e.flowers || 0,
    seat: e.seat || 0, round: e.round || 0, kong: !!e.kong, wallLast: !!e.wallLast, last: !!e.last };
  const r = G.calc(o);
  const has = r.ok && r.fans.some(f => f.id === id);
  if (!has || r.pts < 8) { bad++; console.log('NG', id, G.FANS[id][2], r.ok ? r.pts + ' ' + r.fans.map(f => G.FANS[f.id][2] + (f.n > 1 ? 'x' + f.n : '')).join(' ') : r.err); }
}
console.log(`${81 - bad} / 81`);
process.exit(bad ? 1 : 0);
