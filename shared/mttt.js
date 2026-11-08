// A lockless transposition table in a SharedArrayBuffer, shared by the workers of one plain-JavaScript alpha-beta engine
// (shared/mtsplit.js "shared mode", common rule「本編のマルチスレッド」2026-11-09). Loaded by the engine worker with
// importScripts() when the page sends { type: 'mtshare', lib, tt, ctl, idx } (only on a cross-origin isolated page); the
// engine's own one-thread table (a Map) is not touched, so the levels decided by positions / depth play exactly as before.
//
// Entry = 4 Int32 [k1 ^ a, k2 ^ b, a, b] (XOR verification: an entry torn by two workers writing at once fails the check);
// buckets of 2 entries: [0] kept for the deeper result (replaced by an equal or deeper one, the same position, or one of an
// older search), [1] always replaced.
//   a = (m + 2) & 0xFFFF | x << 16          (m: the best move, −2 … 65533; x: 0 … 65535, the engine's own extra key part)
//   b = depth (8 bits) | age << 8 (6 bits) | flag << 14 (2 bits) | value << 16 (signed 16 bits)
// ctl (Int32Array, shared with the page): [0] the current job's epoch — a task whose epoch is no longer current stops at once;
// [16 + idx] the id of this worker's task to abandon (the page dropped it).
//   MTTT.attach(msg) → T: T.salt = a number for the rule (set by the engine), T.get(k1, k2) → the scratch entry { h2: k2, d, v, f, m, x, ply: x, rs: x } or undefined (read it at
//   once: the next get() overwrites it), T.put(k1, k2, d, v, f, m, x), T.begin(msg) (a task: its epoch / age / id),
//   T.stopped() (the page asked this task to stop).
(function (root) {
  'use strict';
  function Table(tt, ctl, idx) {
    this.t = new Int32Array(tt); this.mask = (this.t.length >> 3) - 1;   // (a power of two of buckets, 8 words each)
    this.ctl = ctl ? new Int32Array(ctl) : null; this.idx = idx | 0;
    this.ep = 0; this.tk = 0; this.age = 1; this.salt = 0;   // salt: the engine's rule / board (one table for every rule)
    this.E = { h2: 0, d: 0, v: 0, f: 0, m: 0, x: 0, ply: 0, rs: 0 };
  }
  Table.prototype.begin = function (m) { this.ep = m._ep | 0; this.tk = m.id | 0; this.age = m._age | 0 || 1; };
  Table.prototype.stopped = function () {
    const c = this.ctl; if (!c) return false;
    return Atomics.load(c, 0) !== this.ep || Atomics.load(c, 16 + this.idx) === this.tk;
  };
  Table.prototype.get = function (k1, k2) {
    const t = this.t, i = (k1 & this.mask) << 3, h2 = k2;
    k1 |= 0; k2 = (k2 ^ this.salt) | 0;
    for (let j = i; j < i + 8; j += 4) {
      const a = t[j + 2], b = t[j + 3];
      if (b !== 0 && (t[j] ^ a) === k1 && (t[j + 1] ^ b) === k2) {
        const E = this.E; E.h2 = h2;
        E.d = b & 255; E.f = (b >>> 14) & 3; E.v = b >> 16; E.m = (a & 0xFFFF) - 2; E.x = E.ply = E.rs = a >>> 16;
        return E;
      }
    }
    return undefined;
  };
  Table.prototype.put = function (k1, k2, d, v, f, m, x) {
    const t = this.t, i = (k1 & this.mask) << 3, age = this.age & 63;
    k1 |= 0; k2 = (k2 ^ this.salt) | 0;
    const a = (((m + 2) & 0xFFFF) | ((x & 0xFFFF) << 16)) | 0;
    const b = ((d < 0 ? 0 : d > 255 ? 255 : d) | (age << 8) | ((f & 3) << 14) | ((v < -32767 ? -32767 : v > 32767 ? 32767 : v) << 16)) | 0;
    let j = i;   // slot 0 unless it holds a deeper result of this search for another position
    const a0 = t[i + 2], b0 = t[i + 3];
    if (b0 !== 0 && !((t[i] ^ a0) === k1 && (t[i + 1] ^ b0) === k2) && ((b0 >>> 8) & 63) === age && (b0 & 255) > d) j = i + 4;
    t[j] = k1 ^ a; t[j + 1] = k2 ^ b; t[j + 2] = a; t[j + 3] = b;
  };
  // the table's size in bytes for this device: 16 MB (phones / tablets, ≤ 2 GB), 32 MB (≤ 4 GB or unknown), 64 MB (more)
  function bytes(touch) {
    const dm = (typeof navigator !== 'undefined' && navigator.deviceMemory) || 0;
    const mb = touch || (dm && dm <= 2) ? 16 : dm >= 8 ? 64 : 32;
    return mb << 20;
  }
  const API = { attach: m => new Table(m.tt, m.ctl, m.idx), Table, bytes };
  root.MTTT = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof self !== 'undefined' ? self : this);
