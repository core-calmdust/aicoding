// Two builds of the engine against each other (claude/ugolki-spec.md「探索 v2」): each a folder with engine.js +
// core-wasm.js. The two folders must differ (one folder twice is one module: copy it for a build against itself).
//   node ugolki/tools/duel.js <dir A> <dir B> n <nodesK[:nodesK of B]> <games> <seed> [rule] [random plies = 4]
//   node ugolki/tools/duel.js <dir A> <dir B> t <ms> <games> <seed>
// Every opening (random plies) is played twice with the colours swapped. A's wins / losses / draws, Elo and the mean depths.
'use strict';
const path = require('path');
const [dA, dB, kind, xs, Ns, seedS, ruleA, preS] = process.argv.slice(2);
const E = [require(path.resolve(dA, 'engine.js')), require(path.resolve(dB, 'engine.js'))];
const X = (xs.split(':').concat(xs.split(':'))).slice(0, 2).map(Number), N = +Ns, rule = ruleA || 'c33', pre = preS === undefined ? 4 : +preS;
let s = (+seedS || 1) * 2654435761 >>> 0; const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
for (let i = 0; i < 2; i++) { E[i].setRule(rule); E[i].LEVELS[40] = kind === 't' ? { s: 1, ms: X[i] } : { s: 1, nk: X[i] }; }
let w = 0, l = 0, dr = 0, op = []; const ds = [0, 0], dn = [0, 0];
for (let g = 0; g < N; g++) {
  if (g % 2 === 0) op = Array.from({ length: pre }, () => rnd());
  const first = g % 2, mv = []; let res = null;
  for (let ply = 0; res === null; ply++) {
    const { pos, hashes } = E[0].replay(null, mv), j = E[0].judge(pos, hashes);
    if (j.over) { res = j.winner; break; }
    const who = ply % 2 === 0 ? first : 1 - first; let m;
    if (ply < pre) { const L = pos.moves(); m = L[Math.floor(op[ply] * L.length)]; }
    else { const r = E[who].think(null, mv, 40, rnd, rule); m = r.move; if (r.depth) { ds[who] += r.depth; dn[who]++; } }
    if (m < 0) { res = 0; break; }
    mv.push(m);
  }
  const aP = first === 0 ? 1 : 2;   // A's player number (P1 moves first)
  if (res === 0) dr++; else if (res === aP) w++; else l++;
  if ((g + 1) % 20 === 0 || g + 1 === N) {
    const n = w + l + dr, sc = (w + dr / 2) / n, el = x => x <= 0 ? -Infinity : x >= 1 ? Infinity : -400 * Math.log10(1 / x - 1);
    const se = Math.sqrt(Math.max((w * (1 - sc) ** 2 + l * sc ** 2 + dr * (0.5 - sc) ** 2) / n, 1e-9) / n);
    console.log(`${n} games  +${w} -${l} =${dr}  ${sc.toFixed(3)}  Elo ${el(sc).toFixed(0)} (${el(sc - 1.96 * se).toFixed(0)} .. ${el(sc + 1.96 * se).toFixed(0)})  depth ${(ds[0] / Math.max(dn[0], 1)).toFixed(2)} / ${(ds[1] / Math.max(dn[1], 1)).toFixed(2)}`);
  }
}
