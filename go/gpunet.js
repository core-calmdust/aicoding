// The Go net on the GPU (WebGPU, 2026-11-18): PRO's 計算「GPU」. The same net as engine.c net_forward (vibego's nested-bottleneck
// ResNet: stem 3x3 + global inputs + 3x3 pattern embeddings, blocks of 1x1 / 3x3 convolutions with batch norm + ReLU, global
// pooling blocks, policy / value / ownership heads), in float32 on a batch of positions at once. engine.c's GPU batches
// (gpu_collect / gpu_apply) give the inputs (FEAT, GLOB, PAT of each leaf) and take the outputs (NNOut: pol[362], val[3],
// score, own[361] — in the symmetry's frame, as net_forward's). The weights are read from the same net file (GONN v2).
//   const g = await GoGPU.create(netBytes, maxBatch);   // null without WebGPU (or an error): the CPU as before
//   const out = await g.run(feat, glob, pat, nb);       // Float32Array(nb * 727)
(function () {
  'use strict';
  const NP = 361, NSP = 14, OUTN = 727;
  // ---------------------------------------------------------------- the net file (engine.c net_load, rdf, canon_init)
  function h2f(h) {
    const s = (h >> 15) & 1, e = (h >> 10) & 31, m = h & 1023;
    const v = e === 0 ? m * 2 ** -24 : e === 31 ? (m ? NaN : Infinity) : (1 + m / 1024) * 2 ** (e - 15);
    return s ? -v : v;
  }
  function canonK() {   // the number of 3x3 patterns up to the board's 8 symmetries (engine.c canon_init)
    const perms = [];
    for (let t = 0; t < 8; t++) { const pr = []; for (let i = 0; i < 9; i++) { const r = Math.floor(i / 3), c = i % 3; let rr, cc;
      switch (t) { case 0: rr = r; cc = c; break; case 1: rr = c; cc = 2 - r; break; case 2: rr = 2 - r; cc = 2 - c; break; case 3: rr = 2 - c; cc = r; break;
        case 4: rr = r; cc = 2 - c; break; case 5: rr = 2 - r; cc = c; break; case 6: rr = c; cc = r; break; default: rr = 2 - c; cc = 2 - r; }
      pr[rr * 3 + cc] = i; } perms.push(pr); }
    const used = new Uint8Array(19683);
    for (let id = 0; id < 19683; id++) {
      const d = []; let v = id; for (let i = 0; i < 9; i++) { d.push(v % 3); v = Math.floor(v / 3); }
      let best = id;
      for (let t = 0; t < 8; t++) { let s = 0, p3 = 1; for (let j = 0; j < 9; j++) { s += d[perms[t][j]] * p3; p3 *= 3; } if (s < best) best = s; }
      used[best] = 1;
    }
    let k = 0; for (let i = 0; i < 19683; i++) if (used[i]) k++;
    return k;
  }
  function parse(buf) {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    if (buf[0] !== 71 || buf[1] !== 79 || buf[2] !== 78 || buf[3] !== 78 || dv.getUint32(4, true) !== 2) throw new Error('net format');
    const C = dv.getUint32(8, true), B = dv.getUint32(12, true), hc = dv.getUint32(16, true), gc = dv.getUint32(20, true), quant = dv.getUint32(24, true);
    let off = 28;
    const kinds = Array.from(buf.subarray(off, off + B)); off += B; off = (off + 3) & ~3;
    const rdf = (n, big, rows) => {
      const o = new Float32Array(n);
      if (quant && big) {
        const sc = []; for (let r = 0; r < rows; r++) sc.push(dv.getFloat32(off + r * 4, true)); off += rows * 4;
        const per = n / rows; for (let r = 0; r < rows; r++) for (let i = 0; i < per; i++) o[r * per + i] = sc[r] * dv.getInt8(off + r * per + i);
        off += n;
      } else { for (let i = 0; i < n; i++) o[i] = h2f(dv.getUint16(off + i * 2, true)); off += n * 2; }
      off = (off + 3) & ~3;
      return o;
    };
    const one = () => rdf(1, 0, 0)[0];
    const bn = c => ({ s: rdf(c, 0, 0), b: rdf(c, 0, 0) });
    const conv = (cout, cin, k) => ({ cout, cin, k, w: rdf(cout * cin * k * k, 1, cout) });
    const bc = C / 2, K = canonK(), net = { C, B, hc, gc, bc, blk: [] };
    net.stem = conv(C, NSP, 3); net.gfw = rdf(C * 2, 0, 0); net.gfb = rdf(C, 0, 0); net.emb = rdf(K * C, 1, K);
    for (let i = 0; i < B; i++) {
      const k = { kind: kinds[i] };
      if (k.kind === 0) {
        k.bn_in = bn(C); k.cin = conv(bc, C, 1);
        k.n1b1 = bn(bc); k.n1c1 = conv(bc, bc, 3); k.n1b2 = bn(bc); k.n1c2 = conv(bc, bc, 3);
        k.n2b1 = bn(bc); k.n2c1 = conv(bc, bc, 3); k.n2b2 = bn(bc); k.n2c2 = conv(bc, bc, 3);
        k.bn_out = bn(bc); k.cout = conv(C, bc, 1);
      } else {
        k.bn1 = bn(C); k.creg = conv(C, C, 3); k.cpool = conv(gc, C, 3); k.bnp = bn(gc);
        k.fcw = rdf(C * 2 * gc, 0, 0); k.fcb = rdf(C, 0, 0); k.bn2 = bn(C); k.c2 = conv(C, C, 3);
      }
      net.blk.push(k);
    }
    net.trunk = bn(C);
    net.pcw = rdf(hc * C, 0, 0); net.pbn = bn(hc); net.pow = rdf(hc, 0, 0); net.pob = one(); net.ppw = rdf(2 * hc, 0, 0); net.ppb = one();
    net.vcw = rdf(hc * C, 0, 0); net.vbn = bn(hc); net.v1w = rdf(hc * 2 * hc, 0, 0); net.v1b = rdf(hc, 0, 0);
    net.vvw = rdf(3 * hc, 0, 0); net.vvb = rdf(3, 0, 0); net.vsw = rdf(hc, 0, 0); net.vsb = one();
    net.ocw = rdf(hc * C, 0, 0); net.obn = bn(hc); net.oow = rdf(hc, 0, 0); net.oob = one();
    net.size = off;
    return net;
  }
  // ---------------------------------------------------------------- the kernels (WGSL). Planes: [batch][channel][361], 19x19 row major,
  // zero outside the board (as the padded planes of engine.c)
  const WG = 64;
  // (2026-11-19) the convolutions as a tiled matrix product: out[co][n] = sum_k W[co][k] * im2col[k][n] over k = (ci, tap) and
  // n = (batch, position) — a workgroup computes a 64 x 64 tile through shared memory, each thread 4 x 4 (the first version, one
  // output a thread, ran at ~0.3 TFLOPS on an M4 Pro)
  const CONV = `
struct P { cin: u32, cout: u32, k: u32, accum: u32, inC: u32, outC: u32, outOff: u32, pad: u32 };
struct NB { n: u32, pad0: u32, pad1: u32, pad2: u32 };
@group(0) @binding(0) var<uniform> P_: P;
@group(0) @binding(1) var<storage, read> inp: array<f32>;
@group(0) @binding(2) var<storage, read> w: array<f32>;
@group(0) @binding(3) var<storage, read_write> outp: array<f32>;
@group(0) @binding(4) var<uniform> NB_: NB;
var<workgroup> As: array<vec4<f32>, 256>;   // [16 k][64 m] (four m a vector: one shared read for four)
var<workgroup> Bs: array<vec4<f32>, 256>;   // [16 k][64 n]
@compute @workgroup_size(16, 16)
fn main(@builtin(local_invocation_id) l: vec3<u32>, @builtin(workgroup_id) wg: vec3<u32>) {
  let tid = l.y * 16u + l.x;
  let m0 = wg.y * 64u; let n0 = wg.x * 64u;
  let kk = P_.k * P_.k; let K = P_.cin * kk; let N = NB_.n * 361u;
  var acc: array<vec4<f32>, 4>;
  for (var i = 0u; i < 4u; i++) { acc[i] = vec4<f32>(0.0); }
  // (2026-11-19) each thread fills whole vectors: row kr = tid / 16 of the 16-row step, the four columns 4 (tid % 16) … +3 — a thread
  // writing one component of a shared vector raced with its neighbours on Apple's GPUs (read, change, write back the whole vector)
  let kr = tid / 16u; let c4 = (tid % 16u) * 4u;
  var wB: array<u32, 4>; var mOK: array<bool, 4>; var nOK: array<bool, 4>; var iB: array<u32, 4>; var ny: array<i32, 4>; var nx: array<i32, 4>;
  for (var j = 0u; j < 4u; j++) {
    let gm = m0 + c4 + j; mOK[j] = gm < P_.cout; wB[j] = gm * K;
    let gn = n0 + c4 + j; nOK[j] = gn < N;
    let b = gn / 361u; let p = gn % 361u; ny[j] = i32(p / 19u); nx[j] = i32(p % 19u); iB[j] = b * P_.inC * 361u;
  }
  for (var k0 = 0u; k0 < K; k0 += 16u) {
    let gk = k0 + kr; let kOK = gk < K;
    let ci = gk / kk; let t = gk - ci * kk;
    var dy = 0; var dx = 0;
    if (kk == 9u) { let ty = t / 3u; dy = i32(ty) - 1; dx = i32(t - ty * 3u) - 1; }
    var av = vec4<f32>(0.0); var bv = vec4<f32>(0.0);
    for (var j = 0u; j < 4u; j++) {
      if (kOK && mOK[j]) { av[j] = w[wB[j] + gk]; }
      let yy = ny[j] + dy; let xx = nx[j] + dx;
      if (kOK && nOK[j] && yy >= 0 && yy < 19 && xx >= 0 && xx < 19) { bv[j] = inp[iB[j] + ci * 361u + u32(yy * 19 + xx)]; }
    }
    As[kr * 16u + tid % 16u] = av;
    Bs[kr * 16u + tid % 16u] = bv;
    workgroupBarrier();
    for (var k = 0u; k < 16u; k++) {
      let a = As[k * 16u + l.y]; let bb = Bs[k * 16u + l.x];
      acc[0] += a.x * bb; acc[1] += a.y * bb; acc[2] += a.z * bb; acc[3] += a.w * bb;
    }
    workgroupBarrier();
  }
  for (var i = 0u; i < 4u; i++) {
    let m = m0 + l.y * 4u + i; if (m >= P_.cout) { break; }
    for (var j = 0u; j < 4u; j++) {
      let n = n0 + l.x * 4u + j; if (n >= N) { break; }
      let b = n / 361u; let p = n % 361u;
      let o = (b * P_.outC + P_.outOff + m) * 361u + p;
      if (P_.accum == 1u) { outp[o] = outp[o] + acc[i][j]; } else { outp[o] = acc[i][j]; }
    }
  }
}`;
  const BNRELU = `
struct P { c: u32, n: u32, pad0: u32, pad1: u32 };
@group(0) @binding(0) var<uniform> P_: P;
@group(0) @binding(1) var<storage, read> inp: array<f32>;
@group(0) @binding(2) var<storage, read> sb: array<f32>;   // s[c], b[c]
@group(0) @binding(3) var<storage, read_write> outp: array<f32>;
@compute @workgroup_size(${WG})
fn main(@builtin(global_invocation_id) g: vec3<u32>) {
  let p = g.x; if (p >= 361u) { return; }
  let c = g.y; let b = g.z;
  let i = (b * P_.c + c) * 361u + p;
  outp[i] = max(inp[i] * sb[c] + sb[P_.c + c], 0.0);
}`;
  // stem extras: X[b][c][p] += gfb[c] + gfw[2c] glob0 + gfw[2c+1] glob1 + emb[pat[p]][c]
  const STEMADD = `
struct P { C: u32, pad0: u32, pad1: u32, pad2: u32 };
@group(0) @binding(0) var<uniform> P_: P;
@group(0) @binding(1) var<storage, read> glob: array<f32>;
@group(0) @binding(2) var<storage, read> pat: array<u32>;
@group(0) @binding(3) var<storage, read> gw: array<f32>;   // gfw[2C], gfb[C]
@group(0) @binding(4) var<storage, read> emb: array<f32>;
@group(0) @binding(5) var<storage, read_write> X: array<f32>;
@compute @workgroup_size(${WG})
fn main(@builtin(global_invocation_id) g: vec3<u32>) {
  let p = g.x; if (p >= 361u) { return; }
  let c = g.y; let b = g.z;
  let gg = gw[2u * P_.C + c] + gw[2u * c] * glob[2u * b] + gw[2u * c + 1u] * glob[2u * b + 1u];
  let i = (b * P_.C + c) * 361u + p;
  X[i] = X[i] + gg + emb[pat[b * 361u + p] * P_.C + c];
}`;
  // gpool + fc + add: a workgroup per (c, b): pooled (mean, max of H3's gc planes) → add[c] → H1[b][c][*] += add
  const POOLADD = `
struct P { C: u32, gc: u32, pad0: u32, pad1: u32 };
@group(0) @binding(0) var<uniform> P_: P;
@group(0) @binding(1) var<storage, read> h3: array<f32>;
@group(0) @binding(2) var<storage, read> fc: array<f32>;   // fcw[C][2gc], fcb[C]
@group(0) @binding(3) var<storage, read_write> h1: array<f32>;
var<workgroup> pooled: array<f32, 256>;
@compute @workgroup_size(${WG})
fn main(@builtin(local_invocation_id) l: vec3<u32>, @builtin(workgroup_id) wg: vec3<u32>) {
  let c = wg.y; let b = wg.z; let t = l.x;
  for (var j = t; j < P_.gc; j += ${WG}u) {
    var s = 0.0; var m = -1e30;
    let base = (b * P_.gc + j) * 361u;
    for (var p = 0u; p < 361u; p++) { let v = h3[base + p]; s += v; m = max(m, v); }
    pooled[j] = s / 361.0; pooled[P_.gc + j] = m;
  }
  workgroupBarrier();
  var a = fc[P_.C * 2u * P_.gc + c];
  for (var j = 0u; j < 2u * P_.gc; j++) { a += fc[c * 2u * P_.gc + j] * pooled[j]; }
  let ob = (b * P_.C + c) * 361u;
  for (var p = t; p < 361u; p += ${WG}u) { h1[ob + p] = h1[ob + p] + a; }
}`;
  // the heads' tail: a workgroup per position b (HP: 3 hc planes after their bn + relu) → out[b][727]
  const TAIL = `
struct P { hc: u32, pad0: u32, pad1: u32, pad2: u32 };
@group(0) @binding(0) var<uniform> P_: P;
@group(0) @binding(1) var<storage, read> hp: array<f32>;
@group(0) @binding(2) var<storage, read> tw: array<f32>;   // pow[hc] pob ppw[2hc] ppb v1w[hc*2hc] v1b[hc] vvw[3hc] vvb[3] vsw[hc] vsb oow[hc] oob
@group(0) @binding(3) var<storage, read_write> outp: array<f32>;
var<workgroup> pool: array<f32, 256>;
var<workgroup> v1: array<f32, 128>;
@compute @workgroup_size(${WG})
fn main(@builtin(local_invocation_id) l: vec3<u32>, @builtin(workgroup_id) wg: vec3<u32>) {
  let b = wg.x; let t = l.x; let hc = P_.hc;
  let base = b * 3u * hc * 361u; let ob = b * 727u;
  let oPow = 0u; let oPob = hc; let oPpw = hc + 1u; let oPpb = 3u * hc + 1u; let oV1w = 3u * hc + 2u; let oV1b = oV1w + 2u * hc * hc;
  let oVvw = oV1b + hc; let oVvb = oVvw + 3u * hc; let oVsw = oVvb + 3u; let oVsb = oVsw + hc; let oOow = oVsb + 1u; let oOob = oOow + hc;
  // policy and ownership per position
  for (var p = t; p < 361u; p += ${WG}u) {
    var s = tw[oPob]; var so = tw[oOob];
    for (var j = 0u; j < hc; j++) { s += tw[oPow + j] * hp[base + j * 361u + p]; so += tw[oOow + j] * hp[base + (2u * hc + j) * 361u + p]; }
    outp[ob + p] = s; outp[ob + 366u + p] = tanh(so);
  }
  // pools of the policy head (planes 0..hc) and the value head (hc..2hc): mean, max
  for (var j = t; j < 2u * hc; j += ${WG}u) {
    var s = 0.0; var m = -1e30;
    for (var p = 0u; p < 361u; p++) { let v = hp[base + j * 361u + p]; s += v; m = max(m, v); }
    let h = j / hc; let jj = j % hc;
    pool[h * 2u * hc + jj] = s / 361.0; pool[h * 2u * hc + hc + jj] = m;
  }
  workgroupBarrier();
  for (var i = t; i < hc; i += ${WG}u) {
    var s = tw[oV1b + i];
    for (var j = 0u; j < 2u * hc; j++) { s += tw[oV1w + i * 2u * hc + j] * pool[2u * hc + j]; }
    v1[i] = max(s, 0.0);
  }
  workgroupBarrier();
  if (t == 0u) {
    var s = tw[oPpb];
    for (var j = 0u; j < 2u * hc; j++) { s += tw[oPpw + j] * pool[j]; }
    outp[ob + 361u] = s;
    var vl: array<f32, 3>; var mx = -1e30;
    for (var i = 0u; i < 3u; i++) { var x = tw[oVvb + i]; for (var j = 0u; j < hc; j++) { x += tw[oVvw + i * hc + j] * v1[j]; } vl[i] = x; mx = max(mx, x); }
    var den = 0.0;
    for (var i = 0u; i < 3u; i++) { vl[i] = exp(vl[i] - mx); den += vl[i]; }
    for (var i = 0u; i < 3u; i++) { outp[ob + 362u + i] = vl[i] / den; }
    var sc = tw[oVsb]; for (var j = 0u; j < hc; j++) { sc += tw[oVsw + j] * v1[j]; }
    outp[ob + 365u] = sc * 20.0;
  }
}`;
  // ---------------------------------------------------------------- the runner
  async function create(netBytes, maxB) {
    try {
      if (typeof navigator === 'undefined' || !navigator.gpu) return null;
      const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' }); if (!adapter) return null;
      const dev = await adapter.requestDevice({ requiredLimits: { maxStorageBufferBindingSize: Math.min(adapter.limits.maxStorageBufferBindingSize, 1 << 30), maxBufferSize: Math.min(adapter.limits.maxBufferSize, 1 << 30) } });
      const net = parse(netBytes), C = net.C, hc = net.hc, gc = net.gc, bc = net.bc;
      const SU = GPUBufferUsage.STORAGE, CD = GPUBufferUsage.COPY_DST, CS = GPUBufferUsage.COPY_SRC;
      const buf = (n, u) => dev.createBuffer({ size: Math.max(16, ((n * 4) + 15) & ~15), usage: u });
      const data = arr => { const b = buf(arr.length, SU | CD); dev.queue.writeBuffer(b, 0, arr); return b; };
      const cat = (...a) => { let n = 0; for (const x of a) n += x.length; const o = new Float32Array(n); let k = 0; for (const x of a) { o.set(x, k); k += x.length; } return o; };
      const mod = code => dev.createShaderModule({ code });
      const pipe = code => dev.createComputePipeline({ layout: 'auto', compute: { module: mod(code), entryPoint: 'main' } });
      const P = { conv: pipe(CONV), bn: pipe(BNRELU), stem: pipe(STEMADD), pool: pipe(POOLADD), tail: pipe(TAIL) };
      const uni = arr => { const b = dev.createBuffer({ size: 16 * Math.ceil(arr.length * 4 / 16), usage: GPUBufferUsage.UNIFORM | CD }); dev.queue.writeBuffer(b, 0, new Uint32Array(arr)); return b; };
      const bind = (p, list) => dev.createBindGroup({ layout: p.getBindGroupLayout(0), entries: list.map((b, i) => ({ binding: i, resource: { buffer: b } })) });
      // activations
      const planes = c => buf(maxB * c * NP, SU | CD);
      const FEAT = planes(NSP), GLOB = buf(maxB * 2, SU | CD), PAT = buf(maxB * NP, SU | CD);
      const X = planes(C), A1 = planes(C), H1 = planes(C), H2 = planes(C), H3 = planes(C), HP = planes(3 * hc), HPB = planes(3 * hc);
      const NBU = dev.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | CD });
      const OUT = buf(maxB * OUTN, SU | CS), READ = dev.createBuffer({ size: maxB * OUTN * 4, usage: GPUBufferUsage.MAP_READ | CD });
      const ops = [];   // { p, bg, gx, gy, perB } — dispatched in order, z = the batch
      const conv = (cv, inp, inC, out, outC, accum, outOff = 0) => ops.push({ p: P.conv, bg: bind(P.conv, [uni([cv.cin, cv.cout, cv.k, accum ? 1 : 0, inC, outC, outOff, 0]), inp, data(cv.w), out, NBU]), mm: Math.ceil(cv.cout / 64) });
      const bnr = (b, inp, out, c) => ops.push({ p: P.bn, bg: bind(P.bn, [uni([c, 0, 0, 0]), inp, data(cat(b.s, b.b)), out]), gx: Math.ceil(NP / WG), gy: c });
      conv(net.stem, FEAT, NSP, X, C, 0);
      ops.push({ p: P.stem, bg: bind(P.stem, [uni([C, 0, 0, 0]), GLOB, PAT, data(cat(net.gfw, net.gfb)), data(net.emb), X]), gx: Math.ceil(NP / WG), gy: C });
      for (const k of net.blk) {
        if (k.kind === 0) {
          bnr(k.bn_in, X, A1, C); conv(k.cin, A1, C, H1, bc, 0);
          bnr(k.n1b1, H1, H2, bc); conv(k.n1c1, H2, bc, H3, bc, 0);
          bnr(k.n1b2, H3, H2, bc); conv(k.n1c2, H2, bc, H1, bc, 1);
          bnr(k.n2b1, H1, H2, bc); conv(k.n2c1, H2, bc, H3, bc, 0);
          bnr(k.n2b2, H3, H2, bc); conv(k.n2c2, H2, bc, H1, bc, 1);
          bnr(k.bn_out, H1, H2, bc); conv(k.cout, H2, bc, X, C, 1);
        } else {
          bnr(k.bn1, X, A1, C); conv(k.creg, A1, C, H1, C, 0); conv(k.cpool, A1, C, H2, gc, 0);
          bnr(k.bnp, H2, H3, gc);
          ops.push({ p: P.pool, bg: bind(P.pool, [uni([C, gc, 0, 0]), H3, data(cat(k.fcw, k.fcb)), H1]), gx: 1, gy: C, wg: true });
          bnr(k.bn2, H1, H2, C); conv(k.c2, H2, C, X, C, 1);
        }
      }
      bnr(net.trunk, X, A1, C);
      // the three heads as one 1x1 convolution (3 hc outputs), then their bn + relu
      conv({ cin: C, cout: 3 * hc, k: 1, w: cat(net.pcw, net.vcw, net.ocw) }, A1, C, HP, 3 * hc, 0);
      bnr({ s: cat(net.pbn.s, net.vbn.s, net.obn.s), b: cat(net.pbn.b, net.vbn.b, net.obn.b) }, HP, HPB, 3 * hc);
      const tw = cat(net.pow, [net.pob], net.ppw, [net.ppb], net.v1w, net.v1b, net.vvw, net.vvb, net.vsw, [net.vsb], net.oow, [net.oob]);
      const tailOp = { p: P.tail, bg: bind(P.tail, [uni([hc, 0, 0, 0]), HPB, data(tw), OUT]) };
      let busy = Promise.resolve();
      async function run(feat, glob, pat, nb) {
        const go = async () => {
          dev.queue.writeBuffer(FEAT, 0, feat, 0, nb * NSP * NP);
          dev.queue.writeBuffer(GLOB, 0, glob, 0, nb * 2);
          const p32 = new Uint32Array(nb * NP); for (let i = 0; i < nb * NP; i++) p32[i] = pat[i];
          dev.queue.writeBuffer(PAT, 0, p32); dev.queue.writeBuffer(NBU, 0, new Uint32Array([nb, 0, 0, 0]));
          const enc = dev.createCommandEncoder(), pass = enc.beginComputePass();
          for (const o of ops) { pass.setPipeline(o.p); pass.setBindGroup(0, o.bg); if (o.mm) pass.dispatchWorkgroups(Math.ceil(nb * NP / 64), o.mm, 1); else if (o.wg) pass.dispatchWorkgroups(1, o.gy, nb); else pass.dispatchWorkgroups(o.gx, o.gy, nb); }
          pass.setPipeline(tailOp.p); pass.setBindGroup(0, tailOp.bg); pass.dispatchWorkgroups(nb, 1, 1);
          pass.end();
          enc.copyBufferToBuffer(OUT, 0, READ, 0, nb * OUTN * 4);
          dev.queue.submit([enc.finish()]);
          await READ.mapAsync(GPUMapMode.READ, 0, nb * OUTN * 4);
          const r = new Float32Array(READ.getMappedRange(0, nb * OUTN * 4)).slice();
          READ.unmap();
          return r;
        };
        const r = busy.then(go); busy = r.catch(() => {}); return r;
      }
      let lost = false; dev.lost.then(() => { lost = true; });
      return { run, maxB, get lost() { return lost; }, info: adapter.info ? (adapter.info.description || adapter.info.vendor + ' ' + adapter.info.architecture) : '' };
    } catch (e) { console.warn('[gpunet]', e); return null; }
  }
  self.GoGPU = { create, parse };
})();
