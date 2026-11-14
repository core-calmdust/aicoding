// Two builds of engine.wasm against each other (MODEL_CARD.md「探索 v2」), from anywhere:
//   node morris/tools/duel.js <A.wasm> <B.wasm> n <nodesK[:nodesK of B]> <games> <seed> [variant = nine] [random plies = 4] [maxDepth = 40[:B]]
//   node morris/tools/duel.js <A.wasm> <B.wasm> t <ms[:ms of B]> <games> <seed> …
// The rules (and the page's end of game: status, threefold repetition) are engine.js's. Every opening (random plies) is played
// twice with the colours swapped; each engine's table is cleared at the start of a game. A's wins / losses / draws, Elo, depths.
// EG=A | B | AB (environment): that engine searches with the endgame database (nine-eg.mdb.gz / twelve-eg.mdb.gz, perfect.js),
// as the page's time-based levels (2026-11-14, MODEL_CARD.md「終盤データベース」).
'use strict';
const fs = require('fs'), path = require('path');
const W = path.resolve(__dirname, '..'), E = require(W + '/engine.js');
const [fA, fB, kind, xs, Ns, seedS, varA, preS, dS] = process.argv.slice(2);
const two = s => (s.split(':').concat(s.split(':'))).slice(0, 2).map(Number);
const X = two(xs), N = +Ns, variant = varA || 'nine', pre = preS === undefined ? 4 : +preS, DM = two(dS || '40');
let s = (+seedS || 1) * 2654435761 >>> 0; const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
const nb = fs.readFileSync(W + '/evalnet.bin'), dv = new DataView(nb.buffer, nb.byteOffset);
const H = dv.getUint32(4, true), net = new Float32Array(nb.buffer.slice(nb.byteOffset + 8, nb.byteOffset + 8 + 4 * (71 * H + 2 * H + 1)));
const EG = process.env.EG || '';
let PF = null;
function egLoad(x, variant) {   // as engine.js egSync: the classes into memory grown for them, then eg_use(1)
  if (!PF) { PF = require(W + '/perfect.js'); PF.setDB(require('zlib').gunzipSync(fs.readFileSync(W + '/' + variant + '-eg.mdb.gz'))); }
  const c = PF.classes(variant); let need = 0; for (const k of c.list) need += k.n;
  let at = x.memory.buffer.byteLength; x.memory.grow(Math.ceil(need / 65536));
  const S = new Uint8Array(x.memory.buffer, x.eg_sym_ptr(), 16 * 24); c.sym.slice(0, 16).forEach((g, i) => S.set(g, i * 24));
  x.eg_init(Math.min(16, c.sym.length), E.geom(variant).mills.length);
  for (const k of c.list) { new Uint8Array(x.memory.buffer, at, k.n).set(c.u8.subarray(k.off, k.off + k.n)); x.eg_add(k.m, k.o, at); at += k.n; }
  x.eg_use(1);
}
function load(f, who) {
  const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(f)), { env: { now: () => Date.now(), progress: () => {} } }).exports;
  const io = () => new Int32Array(x.memory.buffer, x.io_ptr(), 8192);
  const G = E.geom(variant), a = [G.n, G.pieces, G.fly ? 1 : 0, G.mills.length];
  for (const m of G.mills) a.push(...m);
  const inMills = (i, j) => G.mills.some(m => (m[0] === i && m[1] === j) || (m[1] === i && m[2] === j) || (m[0] === j && m[1] === i) || (m[1] === j && m[2] === i));
  const extra = []; for (let i = 0; i < G.n; i++) for (const j of G.adj[i]) if (j > i && !inMills(i, j)) extra.push(i, j);
  a.push(extra.length / 2, ...extra);
  io().set(a); x.set_geometry();
  if (variant === 'nine') { new Float32Array(x.memory.buffer, x.net_ptr(), net.length).set(net); x.net_on(H); }
  if (EG.includes(who)) egLoad(x, variant);
  return { x, io };
}
const P = [load(path.resolve(fA), 'A'), load(path.resolve(fB), 'B')];
let w = 0, l = 0, dr = 0, op = []; const ds = [0, 0], dn = [0, 0];
for (let g = 0; g < N; g++) {
  if (g % 2 === 0) op = Array.from({ length: pre }, () => rnd());
  const first = g % 2, mv = []; let res = null;
  P[0].x.new_game(); P[1].x.new_game();
  for (let ply = 0; res === null; ply++) {
    const { pos, hashes } = E.replay(variant, null, mv), st = pos.status();
    if (st === -1) { res = 3 - pos.side; break; }
    let c = 0; for (const h of hashes) if (h === pos.h1) c++;
    if (st === 2 || c >= 3 || mv.length >= 990) { res = 0; break; }
    const who = ply % 2 === 0 ? first : 1 - first; let m;
    if (ply < pre) { const L = pos.moves(); m = L[Math.floor(op[ply] * L.length)]; }
    else {
      const e = P[who]; e.io().set(E.setupIO(variant, null, mv)); e.x.setup();
      if (kind === 't') e.x.best(DM[who], X[who], 0); else e.x.best(DM[who], 0, X[who] * 1000);
      const r = e.io(); m = r[0]; if (r[2]) { ds[who] += r[2]; dn[who]++; }
    }
    mv.push(m);
  }
  const aP = first === 0 ? 1 : 2;   // A's player number (player 1 moves first)
  if (res === 0) dr++; else if (res === aP) w++; else l++;
  if ((g + 1) % 20 === 0 || g + 1 === N) {
    const n = w + l + dr, sc = (w + dr / 2) / n, el = x => x <= 0 ? -Infinity : x >= 1 ? Infinity : -400 * Math.log10(1 / x - 1);
    const se = Math.sqrt(Math.max((w * (1 - sc) ** 2 + l * sc ** 2 + dr * (0.5 - sc) ** 2) / n, 1e-9) / n);
    console.log(`${n} games  +${w} -${l} =${dr}  ${sc.toFixed(3)}  Elo ${el(sc).toFixed(0)} (${el(sc - 1.96 * se).toFixed(0)} .. ${el(sc + 1.96 * se).toFixed(0)})  depth ${(ds[0] / Math.max(dn[0], 1)).toFixed(2)} / ${(ds[1] / Math.max(dn[1], 1)).toFixed(2)}`);
  }
}
