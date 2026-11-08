// Perfect-play database (made by tools/solve.c): pack the class files into one file, read it, and check it
// against the site's own rules (engine.js). Study tool: the site does not load these files yet (see SOLVE.md).
//
//   node tools/solvedb.js pack  <dir from solve, e.g. out/six-q50> <out.mdb>
//   node tools/solvedb.js check <file.mdb> [games=300] [random=20000]
//   node tools/solvedb.js play  <file.mdb>          (the database plays itself from the start, prints the game)
//   node tools/solvedb.js stats <dir> [blockKB=64] [sample=1]   (counts and the size as deflated blocks for HTTP Range reads)
//   check / play also take the directory of class files instead of a packed file.
//
// Packed file (little endian):
//   "MRDP", u8 version=1, u8 variant (6/9/12), u8 quiet limit (50, or 0 = none), u8 nsym, u8 points, u8 pieces, u16 nclasses
//   nsym * points bytes: the board symmetries (image of each point)
//   nclasses * 16 bytes: u8 hm, ho, m, o (pieces in hand / on the board, side to move first), u8 width (1|2), 3 pad, u64 data offset
//   data: per class, one value per index (see solve.c): moving 0 draw, 1..127 win need z, 128+z loss need z
//   (width 2: 1..32767 win, 32768+z loss); placing 0 draw, 1 win, 129 loss.
'use strict';
const fs = require('fs'), path = require('path');

const C = []; for (let n = 0; n <= 32; n++) { C[n] = []; for (let k = 0; k <= 32; k++) C[n][k] = k === 0 ? 1 : n === 0 ? 0 : C[n - 1][k - 1] + (k <= n - 1 ? C[n - 1][k] : 0); }
const pc = x => { let c = 0; while (x) { x &= x - 1; c++; } return c; };
const ctz = x => 31 - Math.clz32(x & -x);
function rank(S) { let r = 0, i = 0; while (S) { const p = ctz(S); S &= S - 1; i++; if (p >= i) r += C[p][i]; } return r; }
function unrank(r, k) { let mask = 0; for (let i = k; i >= 1; i--) { let p = i - 1; while (C[p + 1][i] <= r) p++; r -= C[p][i]; mask |= 1 << p; } return mask >>> 0; }
function compress(B, A, n) { let out = 0, j = 0; for (let p = 0; p < n; p++) { if (A >> p & 1) continue; if (B >> p & 1) out |= 1 << j; j++; } return out >>> 0; }

class SolveDB {
  constructor(buf) {   // a packed file (Buffer / ArrayBuffer), or null for SolveDB.fromDir
    this.orb = []; this.cls = new Map();
    if (!buf) return;
    const u8 = new Uint8Array(buf.buffer || buf, buf.byteOffset || 0, buf.byteLength), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    if (String.fromCharCode(u8[0], u8[1], u8[2], u8[3]) !== 'MRDP') throw new Error('not a packed morris database');
    this.variant = u8[5]; this.QL = u8[6]; this.NS = u8[7]; this.N = u8[8]; this.P = u8[9]; const nc = dv.getUint16(10, true);
    let o = 12; this.sym = []; for (let g = 0; g < this.NS; g++) { this.sym.push(u8.subarray(o, o + this.N)); o += this.N; }
    const dataStart = o + 16 * nc;
    for (let i = 0; i < nc; i++, o += 16) {
      const [hm, ho, m, oo, w] = u8.subarray(o, o + 5), off = Number(dv.getBigUint64(o + 8, true));
      this.cls.set(hm + ',' + ho + ',' + m + ',' + oo, { w, u8, dv, off: dataStart + off });
    }
  }
  // the class files written by solve.c (loaded on demand, a few at a time)
  static fromDir(dir) {
    const db = new SolveDB(null), files = fs.readdirSync(dir).filter(f => /^(mv|pl)_[\d_]+\.bin$/.test(f));
    for (const f of files) {
      const fd = fs.openSync(path.join(dir, f), 'r'), h = Buffer.alloc(32); fs.readSync(fd, h, 0, 32, 0); fs.closeSync(fd);
      db.variant = h[5]; db.QL = h[6];
      db.cls.set(h[7] + ',' + h[8] + ',' + h[9] + ',' + h[10], { w: h[11], file: path.join(dir, f), off: 32 });
    }
    const G = require('../engine.js').geom({ 6: 'six', 9: 'nine', 12: 'twelve' }[db.variant]);
    db.sym = symmetries(G); db.NS = db.sym.length; db.N = G.n; db.P = G.pieces;
    return db;
  }
  // one value of a class: from memory (packed file), or read from the class file (no need to load gigabytes)
  at(c, i) {
    if (c.u8) return c.w === 1 ? c.u8[c.off + i] : c.dv.getUint16(c.off + 2 * i, true);
    if (c.fd === undefined) c.fd = fs.openSync(c.file, 'r');
    const b = this._b || (this._b = Buffer.alloc(2)); fs.readSync(c.fd, b, 0, c.w, c.off + c.w * i);
    return c.w === 1 ? b[0] : b.readUInt16LE(0);
  }
  applySym(g, S) { const s = this.sym[g]; let x = 0; while (S) { const p = ctz(S); S &= S - 1; x |= 1 << s[p]; } return x >>> 0; }
  orbits(m) {   // sorted ranks of the orbit representatives for m pieces (same as buildOrb in solve.c)
    if (this.orb[m]) return this.orb[m];
    const reps = [], n = C[this.N][m];
    for (let r = 0; r < n; r++) { const A = unrank(r, m); let min = r; for (let g = 0; g < this.NS && min === r; g++) { const x = rank(this.applySym(g, A)); if (x < min) min = x; } if (min === r) reps.push(r); }
    return (this.orb[m] = Int32Array.from(reps));
  }
  index(A, B, m, o) {
    let min = Infinity, gs = [];
    for (let g = 0; g < this.NS; g++) { const x = rank(this.applySym(g, A)); if (x < min) { min = x; gs = [g]; } else if (x === min) gs.push(g); }
    const reps = this.orbits(m); let lo = 0, hi = reps.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (reps[mid] < min) lo = mid + 1; else hi = mid; }
    const R = unrank(min, m); let best = Infinity;
    for (const g of gs) { const x = rank(compress(this.applySym(g, B), R, this.N)); if (x < best) best = x; }
    return lo * C[this.N - m][o] + best;
  }
  // raw value for side to move: { phase: 'mv'|'pl', r: 1 win / 0 draw / -1 loss, z } (z: plies the winner needs, moving phase)
  raw(A, B, m, o, hm, ho) {
    if (m + hm < 3) return { phase: hm ? 'pl' : 'mv', r: -1, z: 0 };
    const c = this.cls.get(hm + ',' + ho + ',' + m + ',' + o); if (!c) throw new Error('no class ' + [hm, ho, m, o]);
    const v = this.at(c, this.index(A, B, m, o)), half = c.w === 1 ? 128 : 32768;
    if (hm || ho) return { phase: 'pl', r: v === 0 ? 0 : v < half ? 1 : -1, z: 0 };
    return { phase: 'mv', r: v === 0 ? 0 : v < half ? 1 : -1, z: v === 0 ? 0 : v < half ? v : v - half };
  }
  // value of an engine.js position under the site's rules (quiet counter included): 1 win / 0 draw / -1 loss for the side to move
  probe(pos) {
    const s = pos.side, t = 3 - s; let A = 0, B = 0;
    for (let i = 0; i < this.N; i++) { if (pos.b[i] === s) A |= 1 << i; else if (pos.b[i] === t) B |= 1 << i; }
    const v = this.raw(A >>> 0, B >>> 0, pos.cnt[s], pos.cnt[t], pos.hand[s], pos.hand[t]);
    if (v.phase === 'mv' && v.r && this.QL && v.z > this.QL - pos.quiet) return { ...v, r: 0 };
    return v;
  }
}

const open = f => fs.statSync(f).isDirectory() ? SolveDB.fromDir(f) : new SolveDB(fs.readFileSync(f));
function pack(dir, out) {   // streams the files, so it also works for large databases
  const db = SolveDB.fromDir(dir), list = [...db.cls.entries()].sort((x, y) => x[1].file < y[1].file ? -1 : 1);
  const dir16 = Buffer.alloc(16 * list.length); let off = 0;
  list.forEach(([k, c], i) => { const [hm, ho, m, o] = k.split(',').map(Number); dir16.set([hm, ho, m, o, c.w], 16 * i); dir16.writeBigUint64LE(BigInt(off), 16 * i + 8); off += fs.statSync(c.file).size - 32; });
  const hd = Buffer.alloc(12); hd.write('MRDP', 0); hd[4] = 1; hd[5] = db.variant; hd[6] = db.QL; hd[7] = db.NS; hd[8] = db.N; hd[9] = db.P; hd.writeUInt16LE(list.length, 10);
  const fd = fs.openSync(out, 'w'); fs.writeSync(fd, Buffer.concat([hd, Buffer.from(db.sym.map(s => Array.from(s)).flat()), dir16]));
  const buf = Buffer.alloc(1 << 24);
  for (const [, c] of list) { const r = fs.openSync(c.file, 'r'); let pos = 32, k; while ((k = fs.readSync(r, buf, 0, buf.length, pos)) > 0) { fs.writeSync(fd, buf, 0, k); pos += k; } fs.closeSync(r); }
  fs.closeSync(fd);
  console.log(`${out}: ${list.length} classes, ${(off / 1e6).toFixed(2)} MB of values, ${db.NS} symmetries`);
}
// sizes: win / draw / loss counts and the size when stored as independently deflated blocks (for HTTP Range reads)
function stats(dir, blockKB = 64, sample = 1) {
  const zlib = require('zlib'), db = SolveDB.fromDir(dir), B = blockKB * 1024;
  const t = { mv: [0, 0, 0, 0, 0], pl: [0, 0, 0, 0, 0] };   // slots, win, draw/unused, loss, deflated bytes
  for (const [k, c] of db.cls) {
    const ph = k.startsWith('0,0,') ? 'mv' : 'pl', fdz = fs.openSync(c.file, 'r'), size = fs.statSync(c.file).size - 32, buf = Buffer.alloc(B), half = c.w === 1 ? 128 : 32768;
    const nb = Math.ceil(size / B), step = Math.max(1, Math.round(1 / sample)); let z = 0, seen = 0;
    for (let i = 0; i < nb; i++) {
      const n = fs.readSync(fdz, buf, 0, Math.min(B, size - i * B), 32 + i * B), v = buf.subarray(0, n);
      for (let j = 0; j < n; j += c.w) { const x = c.w === 1 ? v[j] : v.readUInt16LE(j); t[ph][x === 0 ? 2 : x < half ? 1 : 3]++; }
      if (i % step === 0) { z += zlib.deflateRawSync(v, { level: 9 }).length; seen += n; }
    }
    fs.closeSync(fdz); t[ph][0] += size / c.w; t[ph][4] += seen ? z * size / seen : 0;
  }
  for (const ph of ['mv', 'pl']) { const [n, w, d, l, z] = t[ph]; if (n) console.log(`${ph === 'mv' ? 'moving ' : 'placing'}: ${n} slots (${(n / 1e6).toFixed(1)} MB raw), win ${w} draw/unused ${d} loss ${l}, ${blockKB} KB deflate blocks ~ ${(z / 1e6).toFixed(1)} MB`); }
}
// the same automorphism search as solve.c (same order), from engine.js geometry
function symmetries(G) {
  const n = G.n, adjM = G.adj.map(a => a.reduce((s, q) => s | 1 << q, 0)), mill = new Set(G.mills.map(m => m.reduce((s, q) => s | 1 << q, 0)));
  const perm = [], used = [], out = [];
  const rec = i => {
    if (i === n) { if (G.mills.every(m => mill.has(m.reduce((s, q) => s | 1 << perm[q], 0)))) out.push(perm.slice()); return; }
    for (let v = 0; v < n; v++) {
      if (used[v] || G.adj[v].length !== G.adj[i].length) continue;
      let ok = true; for (let j = 0; j < i && ok; j++) if (((adjM[i] >> j) & 1) !== ((adjM[v] >> perm[j]) & 1)) ok = false;
      if (!ok) continue; used[v] = true; perm[i] = v; rec(i + 1); used[v] = false;
    }
  };
  rec(0); return out;
}

// local check with the site's move generator and rules: value(pos) = best over engine.js children
function check(file, games = 300, rnd = 20000) {
  const db = open(file), E = require('../engine.js'), VAR = { 6: 'six', 9: 'nine', 12: 'twelve' }[db.variant], G = E.geom(VAR);
  let seed = 12345; const rand = k => { seed = (seed * 1103515245 + 12345) >>> 0; return (seed >>> 8) % k; };
  const childVal = (pos, m) => { pos.play(m); const st = pos.status(); const v = st === -1 ? { r: -1, z: 1 } : st === 2 ? { r: 0, z: 0 } : db.probe(pos); pos.undo(m); return v; };
  let n = 0, bad = 0, badZ = 0;
  const test = pos => {
    if (pos.status() !== 0) return;
    const v = db.probe(pos), ms = pos.moves(); let best = -1, cands = [];
    for (const m of ms) { const c = childVal(pos, m); if (-c.r > best) best = -c.r; cands.push({ m, c }); }
    n++;
    if (best !== v.r) { if (bad < 5) console.log('  WDL mismatch', JSON.stringify(pos.spec()), 'db', v.r, 'children', best); bad++; return; }
    if (v.phase === 'mv' && v.r !== 0) {   // distance: win z = min over winning moves, loss z = max over moves (capture or block = 1)
      const zs = cands.filter(e => -e.c.r === v.r).map(e => E.mRm(e.m) !== E.NONE ? 1 : e.c.z + 1);
      const want = v.r > 0 ? Math.min(...zs) : Math.max(...zs, 1);
      if (want !== v.z) { if (badZ < 5) console.log('  z mismatch', JSON.stringify(pos.spec()), 'db', v.z, 'children', want); badZ++; }
    }
  };
  for (let g = 0; g < games; g++) {   // random games from the start (sometimes picking the database's best move)
    const pos = new E.Pos(G);
    for (let ply = 0; ply < 300 && pos.status() === 0; ply++) {
      test(pos);
      const ms = pos.moves(); pos.play(ms[rand(ms.length)]);
    }
  }
  for (let k = 0; k < rnd; k++) {     // random moving-phase positions with a random quiet counter
    const pos = new E.Pos(G); pos.hand[1] = pos.hand[2] = 0;
    const m = 3 + rand(G.pieces - 2), o = 3 + rand(G.pieces - 2); if (m + o > G.n) continue;
    const free = [...Array(G.n).keys()]; for (const [who, c] of [[1, m], [2, o]]) for (let i = 0; i < c; i++) { const j = rand(free.length); pos.b[free[j]] = who; free.splice(j, 1); }
    pos.cnt[1] = m; pos.cnt[2] = o; pos.side = 1 + rand(2); pos.quiet = rand(3) ? 0 : rand(50); pos.rehash();
    test(pos);
  }
  console.log(`${file}: checked ${n} positions with engine.js — WDL mismatches ${bad}, distance mismatches ${badZ}`);
  return bad + badZ;
}

function play(file) {
  const db = open(file), E = require('../engine.js'), G = E.geom({ 6: 'six', 9: 'nine', 12: 'twelve' }[db.variant]);
  const pos = new E.Pos(G), line = [];
  for (let ply = 0; ply < 400 && pos.status() === 0; ply++) {
    let best = null;
    for (const m of pos.moves()) { pos.play(m); const st = pos.status(), c = st === -1 ? { r: -1, z: 0 } : st === 2 ? { r: 0, z: 0 } : db.probe(pos); pos.undo(m);
      const sc = -c.r * 1000 + (c.r < 0 ? -c.z : c.r > 0 ? c.z : 0); if (!best || sc > best.sc) best = { m, sc }; }
    line.push(pos.name(best.m)); pos.play(best.m);
  }
  console.log(line.join(' ')); console.log('result:', pos.status() === -1 ? 'player ' + (3 - pos.side) + ' wins' : 'draw', 'after', line.length, 'plies');
}

if (require.main === module) {
  const [cmd, a, b, c] = process.argv.slice(2);
  if (cmd === 'pack') pack(a, b);
  else if (cmd === 'check') process.exit(check(a, +b || 300, +c || 20000) ? 1 : 0);
  else if (cmd === 'play') play(a);
  else if (cmd === 'stats') stats(a, +b || 64, +c || 1);
  else console.log('usage: node tools/solvedb.js pack <dir> <out.mdb> | check <file.mdb|dir> [games] [random] | play <file.mdb|dir> | stats <dir> [blockKB] [sample]');
}
module.exports = { SolveDB, symmetries };
