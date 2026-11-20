// The speed of test builds of the engine (tools/variants/engine_<name>.wasm, tools/build-variants.sh) against today's
// engine.wasm on this machine: the same searches (a fixed-depth midgame search and an exact solve at 22 empties from the
// same positions), each build in a process of its own, several rounds in turn (the least time counts; the nodes must agree
// when a build only changes the speed).
//   node tools/variant-bench.js --variants g1,g2 [--positions tools/train/op10.bin] [--n 12] [--depth 16] [--empties 22] [--rounds 3]
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib'), cp = require('child_process'), os = require('os');
const RV = path.join(__dirname, '..'), args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const N = +opt('n', 12), DEPTH = +opt('depth', 16), EMP = +opt('empties', 22), ROUNDS = +opt('rounds', 3), POS = path.resolve(opt('positions', path.join(__dirname, 'train/op10.bin')));
if (args[0] === '--worker') {
  const v = args[1]; let dir = RV;
  if (v !== 'base') { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rv-variant-')); fs.copyFileSync(path.join(RV, 'engine.js'), path.join(dir, 'engine.js')); fs.copyFileSync(path.join(__dirname, 'variants', `engine_${v}.wasm`), path.join(dir, 'engine.wasm')); }
  const E = require(path.join(dir, 'engine.js'));
  let b = zlib.gunzipSync(fs.readFileSync(path.join(RV, 'weights.bin.gz'))); b = new Uint8Array(b); E.setWeights(new Int16Array(b.buffer, 0, b.length >> 1), 30);
  const d = fs.readFileSync(POS), cells = [];
  for (let i = 0; i < N && (i + 1) * 17 <= d.length; i++) { const P = d.readBigUInt64LE(i * 17), O = d.readBigUInt64LE(i * 17 + 8), c = []; for (let q = 0; q < 64; q++) c.push((P >> BigInt(q)) & 1n ? 1 : (O >> BigInt(q)) & 1n ? 2 : 0); cells.push(c); }
  const play = (c, side, m) => {   // the cells after side plays m
    const [pl, ph, ol, oh] = E.toBits(c, side), [nol, noh, npl, nph] = E.childOf(pl, ph, ol, oh, m), n = new Array(64).fill(0);
    for (let q = 0; q < 64; q++) { const me = q < 32 ? (npl >>> q) & 1 : (nph >>> (q - 32)) & 1, op = q < 32 ? (nol >>> q) & 1 : (noh >>> (q - 32)) & 1; n[q] = me ? side : op ? 3 - side : 0; }
    return n; };
  const run = (list, cfg) => { let nodes = 0, sum = ''; const t0 = process.cpuUsage(); for (const [c, side] of list) { E.clearTT(); const r = E.think(c, side, { cfg, noBook: true, variety: false, time: 0 }); nodes += r.nodes || 0; sum += r.move + ':' + r.score + ' '; } const u = process.cpuUsage(t0); return { sec: (u.user + u.system) / 1e6, nodes, sum }; };
  const mid = cells.map(c => [c, 1]), end = [];
  for (const c0 of cells) {   // the same shallow game from each opening down to EMP empties (the moves do not depend on the build's speed)
    let c = c0, side = 1, guard = 0;
    while (c.filter(x => !x).length > EMP && guard++ < 80) { E.clearTT(); const r = E.think(c, side, { cfg: { depth: 4, exact: 0, wld: 0, end: 0, mpc: 0 }, noBook: true, variety: false, time: 0 }); if (r.move == null || r.move < 0) { side = 3 - side; continue; } c = play(c, side, r.move); side = 3 - side; }
    if (c.filter(x => !x).length === EMP) end.push([c, side]);
  }
  const a = run(mid, { depth: DEPTH, exact: 0, wld: 0, end: 0, mpc: 1 }), e = run(end, { depth: 2, exact: EMP, wld: EMP, end: 0, mpc: 1 });
  process.stdout.write(JSON.stringify({ mid: a, end: e, nEnd: end.length }));
} else {
  const vs = ['base', ...opt('variants', 'g1,g2').split(',').filter(Boolean)], best = {};
  for (let r = 0; r < ROUNDS; r++) for (const v of vs) {
    const o = JSON.parse(cp.execFileSync(process.execPath, [__filename, '--worker', v, ...args], { stdio: ['ignore', 'pipe', 'inherit'] }).toString());
    const b = best[v] || (best[v] = { mid: Infinity, end: Infinity }); b.mid = Math.min(b.mid, o.mid.sec); b.end = Math.min(b.end, o.end.sec); b.midN = o.mid.nodes; b.endN = o.end.nodes; b.sum = o.mid.sum + '|' + o.end.sum; b.nEnd = o.nEnd;
    process.stderr.write(`\r${r + 1} / ${ROUNDS}: ${v}      `);
  }
  console.log(`\n中盤：深さ${DEPTH} × ${N} 局面　終盤：空き${EMP}マスの完全読み × ${best.base.nEnd} 局面（${ROUNDS} 回のうち最短）`);
  console.log('| ビルド | 中盤の時間 | 今の版との比 | 終盤の時間 | 今の版との比 | 手と値が同じか | 読んだ局面数が同じか |');
  console.log('|---|---|---|---|---|---|---|');
  for (const v of vs) { const b = best[v], a = best.base; console.log(`| ${v === 'base' ? '今の版' : v} | ${b.mid.toFixed(2)}秒 | ×${(b.mid / a.mid).toFixed(3)} | ${b.end.toFixed(2)}秒 | ×${(b.end / a.end).toFixed(3)} | ${b.sum === a.sum ? '同じ' : '違う'} | ${b.midN === a.midN && b.endN === a.endN ? '同じ' : '違う'} |`); }
}
