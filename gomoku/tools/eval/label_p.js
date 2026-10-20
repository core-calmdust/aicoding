// Label "perturbed" positions: a Gomocup position plus 1-3 extra moves picked at random among the engine's candidate
// moves (good and bad), so the teacher also covers the odd positions a search visits. Appends to labels_p_<part>.jsonl
'use strict';
const fs = require('fs');
const Rapfi = require('./rapfi.js');
const E = require('/home/claude/aicoding/gomoku/engine.js');
const [PART, NODES] = [+process.argv[2] || 0, +process.argv[3] || 10000];
const games = fs.readFileSync('/home/claude/work/eval/games.jsonl', 'utf8').trim().split('\n').map(l => JSON.parse(l));
let seed = 777 + PART * 1000 + (Date.now() % 100000); const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
const OUT = `/home/claude/work/eval/labels_p_${PART}.jsonl`;
const eng = new E.Engine();
(async () => {
  let r = new Rapfi(); await r.start('renju', 100000); r.setNodes(NODES); let rule = null;
  let n = 0;
  while (true) {
    const g = games[Math.floor(rnd() * games.length)]; if (g.moves.length < 10) continue; if (process.env.ONLY && (process.env.ONLY === 'std' ? g.rule === 'renju' : g.rule !== process.env.ONLY)) continue;
    const k = 6 + Math.floor(rnd() * (g.moves.length - 8));
    const pos = E.setup(g.rule, { b: [], w: [] }); for (const m of g.moves.slice(0, k)) pos.make(m);
    const mv = g.moves.slice(0, k), extra = 1 + Math.floor(rnd() * 3);
    let ok = true;
    for (let j = 0; j < extra && ok; j++) {
      const { list } = eng.gen(pos, -1, 1); const c = list.slice(0, 12).map(i => E.I2M[i]).filter(m => pos.isLegal(m));
      if (!c.length) { ok = false; break; }
      const m = c[Math.floor(rnd() * c.length)]; pos.make(m); mv.push(m);
      if (pos.status().over) ok = false;
    }
    if (!ok) continue;
    const me = pos.side, op = 3 - me;
    if (pos.cnt[me][E.C.FIVE] || pos.cnt[op][E.C.FIVE] >= 2) continue;
    if (g.rule !== rule) { r.send('INFO rule ' + ({ free: 0, standard: 1, renju: 4 }[g.rule])); rule = g.rule; }
    const res = await r.think(mv);
    if (!res) { r.quit(); r = new Rapfi(); await r.start('renju', 100000); r.setNodes(NODES); rule = null; continue; }
    if (res.ev === null) continue;
    fs.appendFileSync(OUT, JSON.stringify({ rule: g.rule, moves: mv, ev: res.ev }) + '\n');
    if (++n % 500 === 0) console.log(n);
  }
})();
