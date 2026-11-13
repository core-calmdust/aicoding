// Two builds of the engine against each other (MODEL_CARD.md「探索の枝刈りの検証」): two engine.wasm files, each its own
// instance (table) with the endgame tables and the learned evaluation, the rules from ../engine.js.
//   node fanorona/tools/duel.js <A.wasm> <B.wasm> n <nodesK[:nodesK of B]> <games> <seed> [random plies = 4]
//   node fanorona/tools/duel.js <A.wasm> <B.wasm> t <ms> <games> <seed>
// Every opening (random plies) is played twice with the colours swapped. A's wins / losses / draws, Elo, the mean depths.
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const E = require('../engine.js');
const [wA, wB, kind, xs, Ns, seedS, preS] = process.argv.slice(2);
const X = (xs.split(':').concat(xs.split(':'))).slice(0, 2).map(Number), N = +Ns, pre = preS === undefined ? 4 : +preS;
let s = (+seedS || 1) * 2654435761 >>> 0; const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
const gz = f => { const b = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, '..', f))); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length); };
(async () => {
  const W = [];
  for (const f of [wA, wB]) {
    const x = (await WebAssembly.instantiate(fs.readFileSync(f), { env: { now: () => Date.now(), progress: () => {} } })).instance.exports;
    if (!process.env.NO_EG) E.loadEG(x, gz('egdb.bin.gz'));
    if (!process.env.NO_NET) E.loadNet(x, gz('evalnet.bin.gz'));
    W.push(x);
  }
  let w = 0, l = 0, dr = 0, op = []; const ds = [0, 0], dn = [0, 0];
  for (let g = 0; g < N; g++) {
    if (g % 2 === 0) op = Array.from({ length: pre }, () => rnd());
    const first = g % 2, mv = []; let res = null;
    for (let ply = 0; res === null && ply < 600; ply++) {
      const { pos, hashes } = E.replay(null, mv), j = E.judge(pos, hashes);
      if (j.over) { res = j.winner || 0; break; }
      const who = ply % 2 === 0 ? first : 1 - first; let m;
      if (ply < pre) { const L = pos.moves(); m = L[Math.floor(op[ply] * L.length)]; }
      else {
        E.attachWasm(W[who]); E.LEVELS[40] = kind === 't' ? { s: 1, d: 99, ms: X[who] } : { s: 1, d: 99, nk: X[who] };
        const r = E.think(null, mv, 40, rnd); m = r.move; if (r.depth) { ds[who] += r.depth; dn[who]++; }
      }
      if (!m && m !== 0) { res = 0; break; }
      mv.push(m);
    }
    const aP = first === 0 ? E.P1 : E.P2;
    if (!res) dr++; else if (res === aP) w++; else l++;
    if ((g + 1) % 20 === 0 || g + 1 === N) {
      const n = w + l + dr, sc = (w + dr / 2) / n, el = x => x <= 0 ? -Infinity : x >= 1 ? Infinity : -400 * Math.log10(1 / x - 1);
      const se = Math.sqrt(Math.max((w * (1 - sc) ** 2 + l * sc ** 2 + dr * (0.5 - sc) ** 2) / n, 1e-9) / n);
      console.log(`${n} games  +${w} -${l} =${dr}  ${sc.toFixed(3)}  Elo ${el(sc).toFixed(0)} (${el(sc - 1.96 * se).toFixed(0)} .. ${el(sc + 1.96 * se).toFixed(0)})  depth ${(ds[0] / Math.max(dn[0], 1)).toFixed(2)} / ${(ds[1] / Math.max(dn[1], 1)).toFixed(2)}`);
    }
  }
})();
