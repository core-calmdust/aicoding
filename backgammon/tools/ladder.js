// The levels' strength for the rated games against the AI (2026-11-15): single games without the cube between two levels,
// both sides playing each dice stream once (the same rolls with the seats swapped, which halves the luck).
//   node tools/ladder.js A B [pairs]      → A's share of the points (single game = 1, gammon 2, backgammon 3) and of the games
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const dir = path.join(__dirname, '..');
const BG = require(path.join(dir, 'bg.js'));
const j = JSON.parse(fs.readFileSync(path.join(dir, 'weights.json'), 'utf8'));
const man = JSON.parse(fs.readFileSync(path.join(dir, 'wildbg.json'), 'utf8'));
const binB = fs.readFileSync(path.join(dir, 'wildbg.bin')), wb = binB.buffer.slice(binB.byteOffset, binB.byteOffset + binB.length);
const boB = zlib.gunzipSync(fs.readFileSync(path.join(dir, 'bearoff.bin.gz'))), bo = boB.buffer.slice(boB.byteOffset, boB.byteOffset + boB.length);
BG.setNets(j); BG.loadWildbg(man, wb); BG.loadBearoff(bo);
const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(path.join(dir, 'engine_simd.wasm'))), { env: {} }).exports;
BG.setWasm(x, j, man, wb, bo);
const [A, B, N = 100] = process.argv.slice(2).map(Number);
const rng = s => { let a = s >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
function game(lv, seed) {   // lv[side]; returns { w, pts }
  const r = rng(seed), die = () => 1 + Math.floor(r() * 6), pos = BG.initial();
  let d = [die(), die()]; while (d[0] === d[1]) d = [die(), die()];
  let s = d[0] > d[1] ? 0 : 1, k = 0;
  for (;;) {
    const pl = BG.genPlays(pos, s, d[0], d[1]);
    if (pl.length) { const c = BG.aiChoosePlay(pos, s, d, lv[s], 'L' + seed + ':' + k, null, null); pos.set(c.pos); }
    const w = BG.winner(pos); if (w >= 0) return { w, pts: BG.winKind(pos, w) };
    s = 1 - s; d = [die(), die()]; k++;
  }
}
let pa = 0, pb = 0, ga = 0, n = 0;
for (let i = 0; i < N; i++) for (const sw of [0, 1]) {
  const lv = sw ? [B, A] : [A, B], g = game(lv, 1000 + i), aSide = sw ? 1 : 0;
  if (g.w === aSide) { pa += g.pts; ga++; } else pb += g.pts; n++;
}
console.log(JSON.stringify({ A, B, games: n, aGames: +(ga / n).toFixed(3), aPoints: +(pa / (pa + pb)).toFixed(3) }));
