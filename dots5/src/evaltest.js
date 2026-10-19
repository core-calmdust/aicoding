// win-keeping test: node evaltest.js <engine.js> <level> <x5 0|1> <scale> <set.jsonl> <out.jsonl> [cls=1]
// for each position (oracle: mover wins), ask the engine for a move, then check with the oracle that the move keeps the win
const fs = require('fs'), { spawn } = require('child_process');
const [eng, lv, x5, sc, set, out] = process.argv.slice(2);
const E = require(eng); if (E.setX5) E.setX5(x5 === '1');
for (const k of [8, 9, 10]) if (E.LEVELS[k]) { E.LEVELS[k].ms = Math.round(E.LEVELS[k].ms * +sc); if (E.LEVELS[k].exactMs) E.LEVELS[k].exactMs = Math.round(E.LEVELS[k].exactMs * +sc); if (E.LEVELS[k].hMs) E.LEVELS[k].hMs = Math.round(E.LEVELS[k].hMs * +sc); }
const G = E.geom(5, 5);
const want = +(process.argv[8] || 1);
const P = fs.readFileSync(set, 'utf8').trim().split('\n').map(JSON.parse).filter(x => x.cls === want);
const done = new Set(); if (fs.existsSync(out)) for (const l of fs.readFileSync(out, 'utf8').split('\n')) if (l.trim()) done.add(JSON.parse(l).key);
const o = spawn(__dirname + '/outc', ['23']); let buf = '', q = [];
o.stdout.on('data', d => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); q.shift()(l); } });
const ask = s => new Promise(r => { q.push(r); o.stdin.write(s + '\n'); });
const hex = p => { let v = 0n; for (let e = 0; e < 60; e++) if (p.drawn[e]) v |= 1n << BigInt(e); return v.toString(16); };
let rs = 12345; const rand = () => { rs ^= rs << 13; rs >>>= 0; rs ^= rs >>> 17; rs ^= rs << 5; rs >>>= 0; return rs / 4294967296; };
(async () => {
  for (const x of P) {
    if (done.has(x.key)) continue;
    const p = E.Pos.from(G, x.edges);
    const t0 = Date.now(); const r = E.chooseMove(p, +lv, rand, x.lead, x.edges); const ms = Date.now() - t0;
    const k = p.play(r.move);
    let ok;
    if (k > 0) { const c = (await ask(`${hex(p)} ${-(x.lead + k)} 60000`)).split(' ').map(Number); ok = c[0] === 9 ? null : c[0] > 0; }
    else { const c = (await ask(`${hex(p)} ${x.lead} 60000`)).split(' ').map(Number); ok = c[0] === 9 ? null : c[0] < 0; }
    const rec = { key: x.key, safe: x.safe, move: r.move, ok, ms, exact: !!r.exact, outcome: r.outcome };
    fs.appendFileSync(out, JSON.stringify(rec) + '\n'); console.log(JSON.stringify(rec));
  }
  o.kill();
})();
