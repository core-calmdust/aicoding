// Equal-condition matches between two search settings on a CPU-time clock (fair on a shared machine), from the initial
// position with the opening book's own variety on both sides (as book-match.js).
//   node time-match.js <A> <B> <pairs> <out.jsonl> [book=../book.bin]
// A / B: a level number (engine.js LEVELS) or JSON, e.g. '{"depth":60,"exact":20,"wld":22,"time":1000,"mpc":1}'.
// The engine's clock (Date.now, also the wasm's now()) is replaced by this process's CPU time, so the time limits are
// in CPU milliseconds of this machine. Game 2k and 2k+1 use the same random seeds with the colours swapped (SEED0:
// another set of games, e.g. a second process). Results are appended per game (resumable).
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const RV = path.join(__dirname, '..');
const cpuMs = () => { const u = process.cpuUsage(); return (u.user + u.system) / 1000; };
const T0 = 1.7e12; Date.now = () => T0 + cpuMs();
const raw = zlib.gunzipSync(fs.readFileSync(path.join(RV, 'weights.bin.gz')));
const W = new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2);
const [A, B, pairs, out, bookF = path.join(RV, 'book.bin')] = process.argv.slice(2);
function loadEngine() {
  const f = require.resolve(path.join(RV, 'engine.js')); delete require.cache[f];
  const E = require(f); E.setWeights(W, 30); E.setBook(fs.readFileSync(bookF)); return E;
}
const EA = loadEngine(), EB = loadEngine();
const { legal, play, start } = require('./eng-lite.js');
const cfgOf = k => /^\d+$/.test(k) ? EA.LEVELS[+k] : JSON.parse(k);
const ca = cfgOf(A), cb = cfgOf(B);
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
let done = fs.existsSync(out) ? fs.readFileSync(out, 'utf8').split('\n').filter(Boolean).length : 0;
for (let g = done; g < pairs * 2; g++) {
  const aBlack = g % 2 === 0, seed = (Math.floor(g / 2) + (+process.env.SEED0 || 0)) * 7919 + 17;
  const rB = rng(seed), rW = rng(seed * 3 + 1);
  let c = start(), s = 1, ply = 0, moves = '';
  const st = { A: { ms: 0, n: 0, max: 0 }, B: { ms: 0, n: 0, max: 0 } };
  EA.clearTT(); EB.clearTT();
  for (;;) {
    let ms = legal(c, s);
    if (!ms.length) { s = 3 - s; ms = legal(c, s); if (!ms.length) break; }
    const isA = (s === 1) === aBlack, E = isA ? EA : EB;
    const t = cpuMs();
    const r = E.think(c, s, { cfg: isA ? ca : cb, random: s === 1 ? rB : rW });
    const dt = cpuMs() - t, x = st[isA ? 'A' : 'B'];
    if (!r.book && !r.forced) { x.ms += dt; x.n++; x.max = Math.max(x.max, dt); }
    moves += 'abcdefgh'[r.move & 7] + ((r.move >> 3) + 1);
    c = play(c, r.move, s); s = 3 - s; ply++;
  }
  const b = c.filter(x => x === 1).length, w = c.filter(x => x === 2).length, da = aBlack ? b - w : w - b;
  fs.appendFileSync(out, JSON.stringify({ g, aBlack, da, res: da > 0 ? 1 : da < 0 ? 0 : 0.5,
    msA: Math.round(st.A.ms / Math.max(1, st.A.n)), msB: Math.round(st.B.ms / Math.max(1, st.B.n)), maxA: Math.round(st.A.max), maxB: Math.round(st.B.max), moves }) + '\n');
}
const rs = fs.readFileSync(out, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const wins = rs.filter(r => r.res === 1).length, draws = rs.filter(r => r.res === 0.5).length, n = rs.length;
const sc = (wins + draws / 2) / n, se = Math.sqrt(rs.reduce((a, r) => a + (r.res - sc) ** 2, 0) / n / n);
const elo = p => -400 * Math.log10(1 / Math.min(0.999, Math.max(0.001, p)) - 1);
const avg = k => Math.round(rs.reduce((a, r) => a + r[k], 0) / n);
console.log(`${n}局: A ${wins}勝${draws}分${n - wins - draws}敗  勝率 ${(sc * 100).toFixed(1)}% (±${(se * 100).toFixed(1)}%)  Elo ${elo(sc).toFixed(0)} ± ${((elo(sc + se) - elo(sc - se)) / 2).toFixed(0)}  平均石差 ${(rs.reduce((a, r) => a + r.da, 0) / n).toFixed(2)}  CPU ms/手（定石・1手のみを除く）A ${avg('msA')} / B ${avg('msB')}`);
