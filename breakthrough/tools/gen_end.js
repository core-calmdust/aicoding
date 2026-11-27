// node tools/gen_end.js [count=40000] [out=/tmp/bt-end.jsonl]
// Sparse endgame positions for the tempo (zugzwang) and race lessons, which self-play rarely gives with one unique answer:
// 3–7 pieces a side, mostly on their own half (defensive shapes; a third spread out, for races), no piece within one row of its goal, side to move random.
// Output lines like tools/gen_pool.js ({ b, side }); tools/gen_content.js classifies them (MERGE=1 adds them to the pool's).
'use strict';
const fs = require('fs');
const E = require('../engine.js'); E.setRule('s8');
const CNT = +(process.argv[2] || 40000), OUT = process.argv[3] || '/tmp/bt-end.jsonl';
let seed = 98765; const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };   // mulberry32
const out = []; let tries = 0;
while (out.length < CNT && tries < CNT * 50) {
  tries++;
  const b = Array(64).fill('.');
  const nw = 3 + Math.floor(rnd() * 5), nb = Math.max(3, Math.min(7, nw + Math.floor(rnd() * 3) - 1));
  const put = (ch, n, rowOf) => { let k = 0, g = 0; while (k < n && g++ < 200) { const r = rowOf(), c = Math.floor(rnd() * 8), i = r * 8 + c; if (b[i] === '.') { b[i] = ch; k++; } } return k === n; };
  // White: rows 2..7 (goal row 0), weighted to the back; Black mirrored
  const wRow = () => { const x = rnd(); return x < 0.35 ? 7 : x < 0.6 ? 6 : x < 0.78 ? 5 : x < 0.9 ? 4 : x < 0.97 ? 3 : 2; };
  const open = rnd() < 0.35, row = open ? () => 2 + Math.floor(rnd() * 6) : wRow;   // a third spread over the board (races)
  if (!put('w', nw, row) || !put('b', nb, () => 7 - row())) continue;
  const sp = { b: b.join(''), side: rnd() < 0.5 ? 1 : 2 };
  const pos = E.Pos.from(sp);
  if (E.judge(pos).over || pos.moves().length < 6) continue;
  out.push(JSON.stringify(sp));
}
fs.writeFileSync(OUT, out.join('\n') + '\n'); console.log('wrote', out.length, 'tries', tries);
