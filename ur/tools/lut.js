// ur/tools/lut.js — RoyalUr.net の完全解析表（.rgu、MIT、https://huggingface.co/sothatsit/RoyalUrModels）を
// Node で読み、UrEngine の state の勝率（手番側・これから振る時点）を返す。オフライン検証・学習専用。
// 符号化は RoyalUr-Java の FinkelGameStateEncoding / SimpleGameStateEncoding を移植したもの。
'use strict';
const fs = require('fs');
const E = require('../engine.js');

function readLut(file) {
  const fd = fs.openSync(file, 'r');
  const head = Buffer.alloc(8); fs.readSync(fd, head, 0, 8, 0);
  if (head.toString('latin1', 0, 3) !== 'RGU') throw new Error('not rgu');
  const mlen = head.readInt32BE(4);
  const mb = Buffer.alloc(mlen + 4); fs.readSync(fd, mb, 0, mlen + 4, 8);
  const meta = JSON.parse(mb.toString('utf8', 0, mlen));
  const mapCount = mb.readInt32BE(mlen);
  let off = 8 + mlen + 4;
  const cb = Buffer.alloc(4 * mapCount); fs.readSync(fd, cb, 0, cb.length, off); off += cb.length;
  const counts = []; for (let i = 0; i < mapCount; i++) counts.push(cb.readInt32BE(4 * i));
  const vt = meta.value_type || 'percent16';
  const vsize = vt === 'f64' ? 8 : vt === 'f32' ? 4 : 2;
  const keys = [], vals = [];
  const readChunk = (bytes) => {
    const b = Buffer.allocUnsafe(bytes); let got = 0;
    while (got < bytes) { const n = fs.readSync(fd, b, got, Math.min(bytes - got, 1 << 30), off + got); if (!n) throw new Error('eof'); got += n; }
    off += bytes; return b;
  };
  for (let i = 0; i < mapCount; i++) {
    const b = readChunk(counts[i] * 4); b.swap32();
    keys.push(new Uint32Array(b.buffer, b.byteOffset, counts[i]));
  }
  for (let i = 0; i < mapCount; i++) {
    const b = readChunk(counts[i] * vsize);
    if (vsize === 2) { b.swap16(); vals.push(new Uint16Array(b.buffer, b.byteOffset, counts[i])); }
    else if (vsize === 8) { b.swap64(); vals.push(new Float64Array(b.buffer, b.byteOffset, counts[i])); }
    else { b.swap32(); vals.push(new Float32Array(b.buffer, b.byteOffset, counts[i])); }
  }
  fs.closeSync(fd);
  return { meta, keys, vals, vsize };
}

// 戦場マス圧縮表（RoyalUr-Java generateWarTileCompression と同じ列挙順）
function warCompression(N, tiles) {
  const comp = new Int32Array(1 << (tiles * 2)).fill(-1); let idx = 0;
  (function rec(l, d, st, i) {
    for (let o = 0; o < 3; o++) {
      let nl = l, nd = d;
      if (o === 1) { if (--nd < 0) continue; } else if (o === 2) { if (--nl < 0) continue; }
      const ns = (st << 2) | o;
      if (i - 1 < 0) comp[ns] = idx++; else rec(nl, nd, ns, i - 1);
    }
  })(N, N, 0, tiles - 1);
  let max = 0; for (const v of comp) if (v > max) max = v;
  let bits = 1; while (max > (1 << bits)) bits++;
  return { comp, bits };
}

function makeEncoder(rule) {
  const rl = E.RULES[rule] || E.EXTRA_RULES[rule];
  // RoyalUr の盤：ix=0..2（列＝行 r に対応：light=side0 の自陣 r=2 → ix=0、中央 r=1 → ix=1、dark r=0 → ix=2）, iy=0..7（= c）
  const ixOfR = r => (r === 2 ? 0 : r === 1 ? 1 : 2);
  const bidx = (r, c) => ixOfR(r) + 3 * c;
  // 盤面を配列に：+(pathIdx) light, −(pathIdx) dark（値は 0/±）
  // 盤のマス分類（RoyalUr FastSimpleFlags と同様）
  const lightCells = new Set(), darkCells = new Set();
  for (let i = 1; i <= rl.pathLen; i++) {
    const [r, c] = E.coords(rl, 0, i); lightCells.add(bidx(r, c));
    const [r2, c2] = E.coords(rl, 1, i); darkCells.add(bidx(r2, c2));
  }
  const war = [], lsafe = [], dsafe = [];
  for (let b = 0; b < 24; b++) {
    const L = lightCells.has(b), D = darkCells.has(b);
    if (L && D) war.push(b); else if (L) lsafe.push(b); else if (D) dsafe.push(b);
  }
  const N = rl.pieces;
  const isFinkel = rule === 'finkel';
  let tileCount = war.length;
  if (tileCount > 8) { let seg = 2, t; do { t = Math.ceil(war.length / seg); seg++; } while (t > 8); tileCount = t; }
  const wc = warCompression(N, tileCount);
  const segCount = Math.ceil(war.length / tileCount);
  const boardBits = 2 * lsafe.length + segCount * wc.bits;
  const board = new Int8Array(24);
  return function encode(s) { // 手番側を light として符号化
    board.fill(0);
    const me = s.turn;
    for (let t = 0; t < 2; t++) {
      const side = t === 0 ? me : 1 - me;
      for (const p of s.pos[side]) if (p >= 1 && p <= rl.pathLen) {
        let [r, c] = E.coords(rl, side, p);
        if (me === 1) r = 2 - r; // 盤の左右反転（手番側を light に）
        board[bidx(r, c)] = t === 0 ? 1 : -1;
      }
    }
    const un = [0, 0];
    for (let t = 0; t < 2; t++) { const side = t === 0 ? me : 1 - me; for (const p of s.pos[side]) if (p === 0) un[t]++; }
    if (isFinkel) {
      const lane = ix => { let st = 0; for (let k = 0; k < 6; k++) { const iy = k >= 4 ? k + 2 : k; if (board[ix + 3 * iy]) st |= 1 << k; } return st; };
      let st = 0; for (let iy = 0; iy < 8; iy++) { const v = board[1 + 3 * iy]; st = (st << 2) | (v === 0 ? 0 : v < 0 ? 1 : 2); }
      const mid = wc.comp[st]; if (mid < 0) throw new Error('bad mid');
      const k = (lane(2) | (mid << 6) | (lane(0) << 19) | (un[1] << 25) | (un[0] << 28)) >>> 0;
      return { upper: 0, lower: k };
    }
    let warZ = 0, ti = 0;
    do {
      let st = 0;
      for (let q = tileCount - 1; q >= 0; q--) { const v = board[war[ti]]; st = (st << 2) | (v === 0 ? 0 : v < 0 ? 1 : 2); ti++; if (ti >= war.length) break; }
      const cpd = wc.comp[st]; if (cpd < 0) throw new Error('bad war');
      warZ = warZ * (1 << wc.bits) + cpd;
    } while (ti < war.length);
    const safe = arr => { let st = 0; arr.forEach((b, k) => { if (board[b]) st |= 1 << k; }); return st; };
    const sb = lsafe.length;
    // 34bit を BigInt 無しで：key = dsafe | war<<sb | lsafe<<(sb+warBits) | un1<<boardBits | un0<<(boardBits+3)
    const key = safe(dsafe) + warZ * 2 ** sb + safe(lsafe) * 2 ** (sb + segCount * wc.bits) + un[1] * 2 ** boardBits + un[0] * 2 ** (boardBits + 3);
    return { upper: Math.floor(key / 2 ** 32), lower: key % 2 ** 32 };
  };
}

function open(rule, file) {
  const lut = readLut(file);
  const enc = makeEncoder(rule);
  const scale = lut.vsize === 2 ? 1 / 65535 : 1 / 100;
  function lookup(s) { // 手番側の勝率（これから振る時点）
    if (s.winner >= 0) return s.winner === s.turn ? 1 : 0;
    const { upper, lower } = enc(s);
    const K = lut.keys[upper], V = lut.vals[upper];
    let lo = 0, hi = K.length - 1;
    while (lo <= hi) { const mid = (lo + hi) >>> 1, k = K[mid]; if (k < lower) lo = mid + 1; else if (k > lower) hi = mid - 1; else return V[mid] * scale; }
    throw new Error('key not found ' + upper + ':' + lower.toString(16) + ' ' + E.key(s));
  }
  // 手 m の後の「指した側」の勝率
  function after(s, m) {
    const me = s.turn, r = E.apply(s, m), ns = r.state;
    if (ns.winner >= 0) return ns.winner === me ? 1 : 0;
    const v = lookup(ns); return ns.turn === me ? v : 1 - v;
  }
  function bellman(s) { // 表の値を1手展開して再計算（ルールの一致検証用）
    const pr = E.probs(s.rule); let v = 0;
    for (let n = 0; n <= 4; n++) {
      if (!pr[n]) continue;
      const ms = E.legalMoves(s, n);
      let b;
      if (!ms.length) b = 1 - lookup(E.apply(s, null).state);
      else { b = -1; for (const m of ms) b = Math.max(b, after(s, m)); }
      v += pr[n] * b;
    }
    return v;
  }
  return { meta: lut.meta, lookup, after, bellman };
}

module.exports = { open, readLut, makeEncoder };
