// Label Gomocup positions with Rapfi's evaluation (teacher). Resumable, appends to labels_<part>.jsonl
// node label.js <part> <parts> <nodes>
'use strict';
const fs = require('fs');
const Rapfi = require('./rapfi.js');
const E = require('/home/claude/aicoding/gomoku/engine.js');
const [PART, PARTS, NODES] = [+process.argv[2] || 0, +process.argv[3] || 1, +process.argv[4] || 10000];
const games = fs.readFileSync('/home/claude/work/eval/games.jsonl', 'utf8').trim().split('\n').map(l => JSON.parse(l));
// deterministic list of positions: every 3rd ply from 6, non-trivial
let seed = 12345; const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
const todo = [];
const ONLY = process.env.ONLY || '';
games.forEach((g, gi) => { if (ONLY && g.rule !== ONLY) return; for (let k = 6 + (gi % 3); k < g.moves.length - 1; k += 3) todo.push([gi, k]); });
for (let i = todo.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [todo[i], todo[j]] = [todo[j], todo[i]]; }
const OUT = `/home/claude/work/eval/labels_${PART}.jsonl`;
const done = new Set(); try { for (const l of fs.readFileSync(OUT, 'utf8').split('\n')) if (l) { const o = JSON.parse(l); done.add(o.g + ':' + o.k); } } catch (e) {}
(async () => {
  let r = new Rapfi(); let rule = null;
  await r.start('renju', 100000); r.setNodes(NODES); r.resetEach = true;
  let n = 0; const t0 = Date.now();
  for (let q = PART; q < todo.length; q += PARTS) {
    const [gi, k] = todo[q]; if (done.has(gi + ':' + k)) continue;
    const g = games[gi], mv = g.moves.slice(0, k);
    const pos = E.setup(g.rule, { b: [], w: [] }); for (const m of mv) pos.make(m);
    const me = pos.side, op = 3 - me;
    if (pos.status().over || pos.cnt[me][E.C.FIVE] || pos.cnt[op][E.C.FIVE] >= 2) continue;
    if (g.rule !== rule) { r.send('INFO rule ' + ({ free: 0, standard: 1, renju: 4 }[g.rule])); rule = g.rule; }
    const res = await r.think(mv);
    if (!res) { r.quit(); r = new Rapfi(); await r.start('renju', 100000); r.setNodes(NODES); r.resetEach = true; rule = null; continue; }
    if (res.ev === null) continue;
    fs.appendFileSync(OUT, JSON.stringify({ g: gi, k, ev: res.ev, bm: res.move }) + '\n');
    if (++n % 500 === 0) console.log(n, ((Date.now() - t0) / n).toFixed(0) + 'ms/pos');
  }
  r.quit();
})();
