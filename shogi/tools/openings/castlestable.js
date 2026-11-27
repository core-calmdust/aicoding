// (2026-11-28 第2期・担当B) 追84 for the castle problems: the site's engine clears its table on every analyze, but its other
// search state (history) carries over, so depth 8 / 9 values move a little with what it read before. A candidate is kept only
// when, after each of W warm-up reads (other castle candidates), depth 8 and 9 give the same accept set, no castle move in the
// grey zone, the castle's best within 80 of the engine's best. Prints the dd range. node castlestable.js <id> [w=4]
'use strict';
const fs = require('fs'), path = require('path');
const W = require('./wasm-engine.js').loadSync();
const id = process.argv[2], NW = +(process.argv.find(a => a.startsWith('w=')) || 'w=4').slice(2);
const C = []; fs.readdirSync(__dirname).filter(f => f.startsWith(`castleprobs-${id}-`)).forEach(f => JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8')).forEach(p => { if (!C.some(x => x.sfen === p.sfen)) C.push(p); }));
const warm = [null, ...C.slice(0, NW - 1).map(p => p.sfen)], STF = path.join(__dirname, `castlestable-${id}.json`), res = fs.existsSync(STF) ? JSON.parse(fs.readFileSync(STF, 'utf8')) : {};
// only=<lineprobs.json>: read only the problems chosen there (the warm-ups stay the first candidates), 2026-11-28 担当B
const ONLY = process.argv.find(a => a.startsWith('only=')), C2 = ONLY ? JSON.parse(fs.readFileSync(ONLY.slice(5), 'utf8'))[id] : C;
for (const p of C2) { if (ONLY && res[p.sfen]) continue;   // (only=: the ones already read are kept)
  const sets = new Set(), dds = []; let bad = '';
  for (const w of warm) { if (w) { W.analyze(w, { depth: 9 }); W.analyze(w, { depth: 8 }); }
    for (const d of [8, 9]) { const r = W.analyze(p.sfen, { depth: d }), v = new Map(r.map(x => [x.usi, x.s])), ref = Math.max(...p.G.map(u => v.get(u)));
      if (r[0].s - ref > 80) bad = bad || `top ${r[0].s - ref}`;
      if (p.G.some(u => v.get(u) < ref - 40 && v.get(u) >= ref - 100)) bad = bad || 'grey';
      sets.add(p.G.filter(u => v.get(u) >= ref - 40).sort().join(','));
      if (d === 9) dds.push(r.filter(x => !p.G.includes(x.usi) && x.s >= ref - 100).length); } }
  if (sets.size > 1) bad = bad || 'sets ' + [...sets].join(' / ');
  res[p.sfen] = { ok: !bad, dd: [Math.min(...dds), Math.max(...dds)] };
  console.log(bad ? 'NG ' + bad : 'OK', 'dd', Math.min(...dds) + '-' + Math.max(...dds), p.accept.join('/'), p.sfen);
  fs.writeFileSync(path.join(__dirname, `castlestable-${id}.json`), JSON.stringify(res));
}
fs.writeFileSync(path.join(__dirname, `castlestable-${id}.json`), JSON.stringify(res));
