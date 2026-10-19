// one engine in its own process: node agent.js <engine.js path> <level> <x5 0|1> <msScale>
const E = require(process.argv[2]); const lv = +process.argv[3], x5 = process.argv[4] === '1', sc = +process.argv[5] || 1;
if (E.setX5) E.setX5(x5);
for (const k of [8, 9, 10]) if (E.LEVELS[k]) { E.LEVELS[k].ms = Math.round(E.LEVELS[k].ms * sc); if (E.LEVELS[k].exactMs) E.LEVELS[k].exactMs = Math.round(E.LEVELS[k].exactMs * sc); if (E.LEVELS[k].hMs) E.LEVELS[k].hMs = Math.round(E.LEVELS[k].hMs * sc); }
let rs = (process.pid * 2654435761) >>> 0 || 1; const rand = () => { rs ^= rs << 13; rs >>>= 0; rs ^= rs >>> 17; rs ^= rs << 5; rs >>>= 0; return rs / 4294967296; };
let buf = '';
process.stdin.on('data', d => {
  buf += d; let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i); buf = buf.slice(i + 1);
    const m = JSON.parse(line);
    const G = E.geom(m.R, m.C), p = E.Pos.from(G, m.edges);
    const t0 = Date.now(); const r = E.chooseMove(p, lv, rand, m.lead, m.edges);
    process.stdout.write(JSON.stringify({ move: r.move, exact: !!r.exact, value: r.value, ms: Date.now() - t0 }) + '\n');
  }
});
