// Six Men's Morris: perfect play from the solved database (tools/solve.c, packed by tools/solvedb.js, gzip: six.mdb.gz).
// Used by engine.js (worker) for the 完全解析 level (LEVELS[11]) and for the exact verdicts in analysis / hints / review / coach.
// (2026-11-14) Also the endgame databases of nine / twelve men's morris (nine-eg.mdb.gz / twelve-eg.mdb.gz: the moving phase
// with at most 8 pieces on the board, solve.c -s 8): the same values; covers(pos) tells whether a position is in one.
// Works as a worker script (importScripts), a page script (window.MorrisPerfect) and a Node module.
//
// Values (side to move): moving phase win / loss + z (DTZ: plies until the winner's next capture or block, decisive only while
// z <= 50 - quiet, as in solve.c), placing phase win / draw / loss.
// Repetition (the site's rule: the 3rd occurrence of a position in the game is a draw, index.html statusAt) is applied on top:
// a move into a position that already occurred twice counts as a draw. The database itself needs no repetition rule: a winner
// who always plays a move that lowers z never repeats a position before the next capture, and a draw stays a draw.
'use strict';
(function () {
const DB_FILES = { six: 'six.mdb.gz?v=1', nine: 'nine-eg.mdb.gz?v=1', twelve: 'twelve-eg.mdb.gz?v=1' }, DB_FILE = DB_FILES.six;
const VID = { 6: 'six', 9: 'nine', 12: 'twelve' };
const C = []; for (let n = 0; n <= 32; n++) { C[n] = []; for (let k = 0; k <= 32; k++) C[n][k] = k === 0 ? 1 : n === 0 ? 0 : C[n - 1][k - 1] + (k <= n - 1 ? C[n - 1][k] : 0); }
const NONE = 31, QUIET = 50;
let DB = null;   // the database in use (sel: the one of the position's variant)
const DBS = {}, loadPs = {}, loadMss = {};
const sel = name => (DB = DBS[name] || null);

// ---------------------------------------------------------------- the packed file ("MRDP", see tools/solvedb.js)
function setDB(buf) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf.buffer || buf, buf.byteOffset || 0, buf.byteLength);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (String.fromCharCode(u8[0], u8[1], u8[2], u8[3]) !== 'MRDP' || !VID[u8[5]]) return false;
  const D = { name: VID[u8[5]], QL: u8[6], NS: u8[7], N: u8[8], P: u8[9], cls: new Map(), orb: [], sym: null };
  const nc = dv.getUint16(10, true); let o = 12;
  const sym = []; for (let g = 0; g < D.NS; g++) { sym.push(u8.slice(o, o + D.N)); o += D.N; }
  // byte tables: image of a point set under each symmetry (16 points = 2 bytes, 24 = 3)
  D.sym = sym; D.symT = []; const nb = Math.ceil(D.N / 8);
  for (let g = 0; g < D.NS; g++) { const T = []; for (let k = 0; k < nb; k++) { T.push(new Uint32Array(256)); for (let b = 0; b < 256; b++) { let x = 0; for (let j = 0; j < 8; j++) if (b >> j & 1 && 8 * k + j < D.N) x |= 1 << sym[g][8 * k + j]; T[k][b] = x >>> 0; } } D.symT.push(T); }
  const start = o + 16 * nc;
  for (let i = 0; i < nc; i++, o += 16) {
    const hm = u8[o], ho = u8[o + 1], m = u8[o + 2], oo = u8[o + 3], w = u8[o + 4], off = start + Number(dv.getBigUint64(o + 8, true));
    D.cls.set(((hm * 16 + ho) * 16 + m) * 16 + oo, { w, off });
  }
  D.u8 = u8; D.dv = dv; D.start = start; DBS[D.name] = D; DB = D; return true;
}
const rank = S => { let r = 0, i = 0; while (S) { const p = 31 - Math.clz32(S & -S); S &= S - 1; i++; if (p >= i) r += C[p][i]; } return r; };
function unrank(r, k) { let mask = 0; for (let i = k; i >= 1; i--) { let p = i - 1; while (C[p + 1][i] <= r) p++; r -= C[p][i]; mask |= 1 << p; } return mask >>> 0; }
const applySym = (g, S) => { const T = DB.symT[g]; return (T[0][S & 255] | T[1][(S >> 8) & 255] | (T.length > 2 ? T[2][(S >> 16) & 255] : 0)) >>> 0; };
function compress(B, A) { let out = 0, j = 0; for (let p = 0; p < DB.N; p++) { if (A >> p & 1) continue; if (B >> p & 1) out |= 1 << j; j++; } return out; }
// per piece count m: for every rank of an m-point set, its orbit number (orbits in increasing order of their smallest rank,
// as buildOrb in solve.c), the symmetries that map it to that smallest member, and the member itself
function orbits(m) {
  if (DB.orb[m]) return DB.orb[m];
  const n = C[DB.N][m], orb = new Int32Array(n), gm = new Int32Array(n), rep = new Int32Array(n);
  for (let r = 0; r < n; r++) {
    const A = unrank(r, m); let best = Infinity, g0 = 0;
    for (let g = 0; g < DB.NS; g++) { const x = rank(applySym(g, A)); if (x < best) { best = x; g0 = 1 << g; } else if (x === best) g0 |= 1 << g; }
    rep[r] = best; gm[r] = g0;
  }
  const id = new Int32Array(n); let k = 0; for (let r = 0; r < n; r++) if (rep[r] === r) id[r] = k++;
  for (let r = 0; r < n; r++) orb[r] = id[rep[r]];
  return (DB.orb[m] = { orb, gm, rep, nOrb: k });
}
// canonical index of (A side to move with m pieces, B opponent with o pieces) — exactly idxOf in solve.c
function index(A, B, m, o) {
  const T = orbits(m), rA = rank(A), R = unrank(T.rep[rA], m);
  let best = Infinity;
  for (let gs = T.gm[rA]; gs; gs &= gs - 1) { const g = 31 - Math.clz32(gs & -gs), x = rank(compress(applySym(g, B), R)); if (x < best) best = x; }
  return T.orb[rA] * C[DB.N - m][o] + best;
}
// raw value: { r: 1 win / 0 draw / -1 loss, z, pl: placing phase } for the side to move, quiet counter not applied
function raw(A, B, m, o, hm, ho) {
  if (m + hm < 3) return { r: -1, z: 0, pl: hm > 0 };
  const c = DB.cls.get(((hm * 16 + ho) * 16 + m) * 16 + o); if (!c) throw new Error('no class ' + [hm, ho, m, o]);
  const i = index(A, B, m, o), v = c.w === 1 ? DB.u8[c.off + i] : DB.dv.getUint16(c.off + 2 * i, true), half = c.w === 1 ? 128 : 32768;
  const r = v === 0 ? 0 : v < half ? 1 : -1;
  if (hm || ho) return { r, z: 0, pl: true };
  return { r, z: v === 0 ? 0 : v < half ? v : v - half, pl: false };
}
function sides(pos) { const s = pos.side, t = 3 - s; let A = 0, B = 0; for (let i = 0; i < DB.N; i++) { if (pos.b[i] === s) A |= 1 << i; else if (pos.b[i] === t) B |= 1 << i; } return [A >>> 0, B >>> 0, s, t]; }
// is the position in its variant's database (six: always; nine / twelve: the moving phase with a solved piece count)?
// Every move from a covered position leads to a covered or finished one (the classes kept are closed under moves and captures).
function covers(pos) {
  if (!sel(pos.G.name)) return false;
  if (DB.name === 'six') return true;
  const s = pos.side;
  return !pos.hand[1] && !pos.hand[2] && DB.cls.has(pos.cnt[s] * 16 + pos.cnt[3 - s]);
}
// value of an engine.js position under the site's rules (50-move rule included, repetition not: see moveVals)
function probe(pos) {
  sel(pos.G.name);
  const [A, B, s, t] = sides(pos), v = raw(A, B, pos.cnt[s], pos.cnt[t], pos.hand[s], pos.hand[t]);
  if (!v.pl && v.r && v.z > (DB.QL || 1e9) - pos.quiet) return { r: 0, z: 0, pl: false };
  return v;
}
const count = (hs, h) => { let c = 0; if (hs) for (let i = 0; i < hs.length; i++) if (hs[i] === h) c++; return c; };
// value of every legal move for the side to move: { m, r, z, cap } — r from the mover's view; z = plies from now until the
// winner's next capture (or block): win by a capture = 1, otherwise 1 + the child's z. hashes = the game so far (incl. pos).
function moveVals(pos, hashes, list) {
  sel(pos.G.name);
  const out = [];
  for (const m of list || pos.moves()) {
    const cap = ((m >> 10) & 31) !== NONE;
    pos.play(m); const st = pos.status(); let r = 0, z = 0;
    if (st === -1) { r = 1; z = 1; }
    else if (st === 0 && count(hashes, pos.h1) < 2) { const v = probe(pos); r = -v.r; z = r > 0 ? (cap ? 1 : v.z + 1) : r < 0 ? v.z + 1 : 0; }
    pos.undo(m);
    out.push({ m, r, z, cap });
  }
  return out;
}
// the position's verdict from its moves: win = the smallest z, loss = the largest
function verdict(vals) {
  let r = -1; for (const e of vals) if (e.r > r) r = e.r;
  const zs = vals.filter(e => e.r === r).map(e => e.z);
  return { r, z: r > 0 ? Math.min(...zs) : r < 0 ? Math.max(...zs) : 0 };
}

// ---------------------------------------------------------------- placing phase: the shortest win / the longest loss
// plies until the winner's next capture (or the end), with both sides playing for it; the moving phase continues with its z.
// A node budget keeps it instant; over budget, the callers fall back to simpler rules.
let budget = 0, memo = new Map();
function key(pos) { const [A, B, s, t] = sides(pos); return pos.hand[s] + ',' + pos.hand[t] + ',' + pos.cnt[s] + ',' + pos.cnt[t] + ',' + index(A, B, pos.cnt[s], pos.cnt[t]); }
function plW(pos) {   // the winner to move
  if (!pos.placing()) return probe(pos).z;
  const k = 'w' + key(pos); if (memo.has(k)) return memo.get(k);
  if (--budget < 0) throw new Error('budget');
  let best = Infinity;
  for (const m of pos.moves()) {
    pos.play(m); let v = Infinity; const st = pos.status();
    if (st === -1) v = 1; else if (st === 0 && probe(pos).r < 0) v = ((m >> 10) & 31) !== NONE ? 1 : 1 + plL(pos);
    pos.undo(m); if (v < best) best = v;
  }
  memo.set(k, best); return best;
}
function plL(pos) {   // the loser to move
  if (!pos.placing()) return probe(pos).z;
  const k = 'l' + key(pos); if (memo.has(k)) return memo.get(k);
  if (--budget < 0) throw new Error('budget');
  let worst = 0;
  for (const m of pos.moves()) { pos.play(m); const v = pos.status() === 0 ? 1 + plW(pos) : 1; pos.undo(m); if (v > worst) worst = v; }
  memo.set(k, worst); return worst;
}
function plLen(pos, list, winning) {   // per move (already known to win / lose): its length, or null over budget
  sel(pos.G.name); budget = 30000; memo = new Map();
  try {
    return list.map(e => {
      if (winning && (e.cap || e.z === 1)) return 1;
      pos.play(e.m); try { return pos.status() !== 0 ? 1 : 1 + (winning ? plL(pos) : plW(pos)); } finally { pos.undo(e.m); }
    });
  } catch (err) { return null; } finally { memo = new Map(); }
}

// ---------------------------------------------------------------- move choice
// engine: an engine.js Engine (JS search, for the tie-breaks); rand: () => [0, 1)
function gauss(rand) { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function searchVals(engine, pos, hashes, list, ms) {
  const out = new Map(); if (!engine || list.length < 2) return out;
  engine.setHistory(hashes); engine.limit(ms);
  const t0 = Date.now();
  for (let d = 1; d <= 8; d++) { const v = engine.rootValues(pos, d, list); if (!v) break; for (const e of v) out.set(e.m, e.v); if (Date.now() - t0 > ms * 0.35) break; }
  return out;
}
// share of the opponent's replies that lose (the traps a drawn move sets)
function trapShare(pos, m, hashes) {
  pos.play(m); const hs = hashes.concat(pos.h1); let n = 0, bad = 0;
  for (const x of pos.moves()) { pos.play(x); const st = pos.status(); n++; if (st === 0 && count(hs, pos.h1) < 2 && probe(pos).r > 0) bad++; pos.undo(x); }
  pos.undo(m); return n ? bad / n : 0;
}
// share of the opponent's replies that keep its win (fewer = harder to find: the resistance of a lost move)
function winShare(pos, m, hashes) {
  pos.play(m); const hs = hashes.concat(pos.h1); let n = 0, good = 0;
  for (const x of pos.moves()) { pos.play(x); const st = pos.status(); n++; if (st === -1 || (st === 0 && count(hs, pos.h1) < 2 && probe(pos).r < 0)) good++; pos.undo(x); }
  pos.undo(m); return n ? good / n : 0;
}
function choose(pos, hashes, engine, rand) {
  rand = rand || Math.random; sel(pos.G.name);
  const vals = moveVals(pos, hashes); if (!vals.length) return { move: -1 };
  const V = verdict(vals), placing = pos.placing();
  let cand = vals.filter(e => e.r === V.r), score = new Map(cand.map(e => [e.m, 0]));
  if (V.r > 0) {
    // the shortest win: smallest z (moving), smallest length to the next capture (placing)
    const len = placing ? plLen(pos, cand, true) : cand.map(e => e.z);
    if (len) { const b = Math.min(...len); cand = cand.filter((e, i) => len[i] === b); }
    else { const c = cand.filter(e => e.cap); if (c.length) cand = c; }
  } else if (V.r < 0) {
    // the longest loss, then the fewest winning replies
    const len = placing ? plLen(pos, cand, false) : cand.map(e => e.z);
    if (len) { const b = Math.max(...len); cand = cand.filter((e, i) => len[i] === b); }
    if (cand.length > 1) { const ws = cand.map(e => winShare(pos, e.m, hashes)), b = Math.min(...ws); cand = cand.filter((e, i) => ws[i] <= b + 1e-9); }
  } else if (cand.length > 1) {
    // a draw: set traps (replies that lose for the opponent) and play the engine's natural move
    for (const e of cand) score.set(e.m, 300 * trapShare(pos, e.m, hashes) + gauss(rand) * 6);
  }
  if (cand.length === 1) return { move: cand[0].m, r: V.r, z: V.z };
  const sv = searchVals(engine, pos, hashes, cand.map(e => e.m), 160);
  let best = cand[0], bs = -Infinity;
  for (const e of cand) { const v = sv.has(e.m) ? Math.max(-800, Math.min(800, sv.get(e.m))) : 0, s = v + score.get(e.m); if (s > bs) { bs = s; best = e; } }
  return { move: best.m, r: V.r, z: V.z };
}

// ---------------------------------------------------------------- loading (browser: fetch + gunzip on demand)
function load(base, variant) {
  const v = variant || 'six';
  if (DBS[v]) return Promise.resolve(true);
  if (loadPs[v]) return loadPs[v];
  if (!DB_FILES[v] || typeof fetch !== 'function' || typeof DecompressionStream !== 'function') return Promise.resolve(false);
  const t0 = Date.now(), url = base ? new URL(DB_FILES[v], base).href : DB_FILES[v];
  // (a server that already sends it decoded gives the plain file: check the gzip magic number)
  loadPs[v] = fetch(url).then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); })
    .then(b => { const h = new Uint8Array(b, 0, 2); return h[0] === 0x1f && h[1] === 0x8b ? new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer() : b; })
    .then(b => { const ok = setDB(b) && DB.name === v; if (ok) { for (let m = Math.min(6, DB.P); m >= 3; m--) if (v === 'six' || m <= 5) orbits(m); } loadMss[v] = Date.now() - t0; if (!ok) loadPs[v] = null; return ok; })
    .catch(() => { loadPs[v] = null; return false; });
  return loadPs[v];
}
// the raw classes of a moving-phase database (for engine.c: eg_add): [{ m, o, off, n }] over db.u8, and the symmetries
function classes(variant) {
  const D = DBS[variant]; if (!D) return null;
  const out = [];
  sel(variant);
  for (const [k, c] of D.cls) { const m = (k >> 4) & 15, o = k & 15; if (k >> 8 || c.w !== 1) continue; out.push({ m, o, off: c.off, n: orbits(m).nOrb * C[D.N - m][o] }); }
  return { u8: D.u8, sym: D.sym, N: D.N, list: out };
}

const API = { DB_FILE, DB_FILES, setDB, load, ready: v => !!DBS[v || 'six'], loadMs: v => loadMss[v || 'six'] || 0, covers, classes, probe, raw, index, moveVals, verdict, choose, plLen };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else if (typeof self !== 'undefined') self.MorrisPerfect = API;
})();
