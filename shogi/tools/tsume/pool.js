// Re-verify and score generator output (tsgen.c JSON lines) with the game's engine (solve.js) and fun.js.
// usage: node tools/tsume/pool.js <out.json> <in.jsonl>...   -> [{ sfen, n, sol, fun, tags, diff }] (deduped,
//        positions already in tsume.json and left-right mirrors excluded), sorted by fun
'use strict';
const fs = require('fs');
const S = require('./solve.js');
const F = require('../fun.js');
const { canon } = require('./gen.js');
const D = require('../../tsume.json');

// difficulty estimate used to match a replacement to the slot it fills: search effort of a fresh solve,
// plus the number of wrong-but-forcing tries at the first move
function difficulty(sfen, n, f) {
  const r = S.verify(sfen, n, { nodeLimit: 2e7 });
  return r.ok ? +(Math.log2(1 + r.info.nodes) + 0.4 * (f.tries[0] || 0) + 0.5 * n).toFixed(2) : null;
}
module.exports = { difficulty };

if (require.main === module) {
  const [out, ...ins] = process.argv.slice(2);
  const seen = new Set();
  for (const g of D.sets) for (const p of g.problems) seen.add(canon(p.sfen));
  let prev = [];
  try { prev = JSON.parse(fs.readFileSync(out, 'utf8')); } catch (e) {}
  for (const p of prev) seen.add(canon(p.sfen));
  const res = prev.slice();
  let bad = 0, dup = 0;
  for (const f of ins) {
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      let c; try { c = JSON.parse(line); } catch (e) { continue; }
      const key = canon(c.sfen);
      if (seen.has(key)) { dup++; continue; }
      seen.add(key);
      const v = S.verify(c.sfen, c.n, { nodeLimit: 2e7 });
      if (!v.ok) { bad++; continue; }
      const sc = F.funScore(c.sfen, v.sol);
      res.push({ sfen: c.sfen, n: c.n, sol: v.sol, fun: sc.fun, tags: sc.tags, diff: +(Math.log2(1 + v.info.nodes) + 0.4 * (sc.feat.tries[0] || 0) + 0.5 * c.n).toFixed(2) });
    }
  }
  res.sort((a, b) => b.fun - a.fun);
  fs.writeFileSync(out, JSON.stringify(res));
  const by = {};
  for (const r of res) { const k = r.n; by[k] = by[k] || { all: 0, ge70: 0 }; by[k].all++; if (r.fun >= 70) by[k].ge70++; }
  console.log({ total: res.length, bad, dup, by });
}
