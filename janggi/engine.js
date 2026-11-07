// Janggi (Korean chess) — rules (for the page) and the AI worker (WebAssembly search from engine.c).
// Works as a Web Worker (postMessage API), as a plain <script> (window.JanggiEngine) and as a Node module.
// Same API as xiangqi/engine.js (the page code is shared in spirit).
//
// Board: 90 points, sq = row * 9 + col. Row 0 = Han's back rank (top), row 9 = Cho's back rank (bottom); col 0 = the
// left file seen from Cho. Pieces: 1 K General (楚/漢) 2 A Guard (士) 3 E Elephant (象) 4 H Horse (馬) 5 R Chariot (車)
// 6 C Cannon (包) 7 P Soldier (卒/兵), +8 = Han. Cho (P1, blue) moves first. Moves are numbers: m = from + 90 * to;
// a pass is from == to (the general's point) and is only offered when the side to move has no move and is not in check.
// Rules: general and guards stay in the palace and step along its lines (diagonals included); chariots and cannons run
// along the palace diagonals too; a cannon moves and captures only by jumping exactly one piece that is not a cannon and
// never captures a cannon; elephants: one step straight + two diagonally (blocked on the way); horses: one straight + one
// diagonal (blocked); soldiers: forward or sideways (+ forward along the diagonals in the enemy palace). No river, no
// flying-general rule. Game end (judge): checkmate wins; a position repeated three times, or 200 plies, ends the game and
// the points decide (chariot 13, cannon 7, horse 5, elephant 3, guard 3, soldier 2; Han, the second player, gets +1.5).
(function () {
'use strict';
const P1 = 1, P2 = 2;                       // P1 = Cho (side 0), P2 = Han (side 1)
const WIN = 30000, WINT = 29000, DRAW_PLIES = 200;
const KING = 1, ADVISOR = 2, ELEPHANT = 3, HORSE = 4, ROOK = 5, CANNON = 6, PAWN = 7;
// horse / elephant set-ups, read left to right from each player's own side: 마상상마 (inner elephants), 상마마상 (outer),
// 마상마상 (left horse), 상마상마 (left elephant)
const SETUPS = ['NBBN', 'BNNB', 'NBNB', 'BNBN'];
function startFen(cho, han) {
  const a = SETUPS[cho | 0] || SETUPS[3], b = SETUPS[han | 0] || SETUPS[3];
  const top = 'r..a.a..r'.split(''), bot = 'R..A.A..R'.split('');
  top[7] = b[0].toLowerCase(); top[6] = b[1].toLowerCase(); top[2] = b[2].toLowerCase(); top[1] = b[3].toLowerCase();
  bot[1] = a[0]; bot[2] = a[1]; bot[6] = a[2]; bot[7] = a[3];
  const pack = arr => arr.join('').replace(/\.+/g, m => String(m.length));
  return pack(top) + '/4k4/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/4K4/' + pack(bot) + ' w';
}
const START = startFen(3, 3);
const RC = []; for (let s = 0; s < 90; s++) RC.push([Math.floor(s / 9), s % 9]);
const sqAt = (r, c) => r < 0 || r > 9 || c < 0 || c > 8 ? -1 : r * 9 + c;
const onb = (r, c) => r >= 0 && r < 10 && c >= 0 && c < 9;
const palace = (r, c) => c >= 3 && c <= 5 && (r <= 2 || r >= 7);
const colorOf = p => p >> 3, typeOf = p => p & 7;
const pdiag = (r, c, dr, dc) => { const tr = r + dr, tc = c + dc; if (!onb(tr, tc) || !palace(r, c) || !palace(tr, tc) || (r <= 2) !== (tr <= 2)) return false; const cr = r <= 2 ? 1 : 8; return (r === cr && c === 4) || (tr === cr && tc === 4); };
// ---------------------------------------------------------------- geometry tables (as in engine.c)
const DR = [-1, 1, 0, 0, -1, -1, 1, 1], DC = [0, 0, -1, 1, -1, 1, -1, 1];
const RAYS = [], NMOV = [], NATT = [], EMOV = [], EATT = [], KMOV = [], PMOV = [[], []], PATT = [[], []];
for (let s = 0; s < 90; s++) {
  const [r, c] = RC[s];
  RAYS.push(DR.map((dr, d) => { const o = []; let rr = r, cc = c; if (d < 4) { rr += dr; cc += DC[d]; while (onb(rr, cc)) { o.push(rr * 9 + cc); rr += dr; cc += DC[d]; } } else while (pdiag(rr, cc, dr, DC[d])) { rr += dr; cc += DC[d]; o.push(rr * 9 + cc); } return o; }));
  const nm = [], em = [];
  for (let d = 0; d < 4; d++) for (const sg of [-1, 1]) {
    const a = DR[d], b = DC[d], p = b * sg, q = a * sg;
    if (onb(r + 2 * a + p, c + 2 * b + q)) nm.push([(r + 2 * a + p) * 9 + c + 2 * b + q, (r + a) * 9 + c + b]);
    if (onb(r + 3 * a + 2 * p, c + 3 * b + 2 * q)) em.push([(r + 3 * a + 2 * p) * 9 + c + 3 * b + 2 * q, (r + a) * 9 + c + b, (r + 2 * a + p) * 9 + c + 2 * b + q]);
  }
  NMOV.push(nm); EMOV.push(em);
  const km = [];
  if (palace(r, c)) for (let d = 0; d < 8; d++) { const tr = r + DR[d], tc = c + DC[d]; if (d < 4 ? onb(tr, tc) && palace(tr, tc) && (r <= 2) === (tr <= 2) : pdiag(r, c, DR[d], DC[d])) km.push(tr * 9 + tc); }
  KMOV.push(km);
  for (const col of [0, 1]) {
    const o = [], fw = col ? 1 : -1;
    if (onb(r + fw, c)) o.push((r + fw) * 9 + c);
    if (c > 0) o.push(s - 1); if (c < 8) o.push(s + 1);
    for (const dc of [-1, 1]) if (pdiag(r, c, fw, dc) && (r + fw <= 2) === (col === 0)) o.push((r + fw) * 9 + c + dc);
    PMOV[col].push(o);
  }
}
for (let s = 0; s < 90; s++) { NATT.push([]); EATT.push([]); PATT[0].push([]); PATT[1].push([]); }
for (let h = 0; h < 90; h++) { for (const [t, leg] of NMOV[h]) NATT[t].push([h, leg]); for (const [t, b1, b2] of EMOV[h]) EATT[t].push([h, b1, b2]); for (const col of [0, 1]) for (const t of PMOV[col][h]) PATT[col][t].push(h); }
const mv = (f, t) => f + 90 * t;
const mFrom = m => m % 90, mTo = m => Math.floor(m / 90);
const isPass = m => m >= 0 && mFrom(m) === mTo(m);
let zs = 0x2545F491;
const zr = () => { zs ^= zs << 13; zs >>>= 0; zs ^= zs >>> 17; zs ^= zs << 5; zs >>>= 0; return zs; };
const Z1 = [], Z2 = []; for (let p = 0; p < 16; p++) { Z1.push([]); Z2.push([]); for (let s = 0; s < 90; s++) { Z1[p].push(zr()); Z2[p].push(zr()); } }
const ZS1 = zr(), ZS2 = zr();
const FEN_CH = '.kabnrcp';
function pieceOfChar(ch) { const col = ch >= 'a' && ch <= 'z' ? 1 : 0; let l = ch.toLowerCase(); if (l === 'e') l = 'b'; if (l === 'h') l = 'n'; const t = 'kabnrcp'.indexOf(l); return t < 0 ? -1 : (t + 1) | (col << 3); }
const PTS = [0, 0, 3, 3, 5, 13, 7, 2];      // the points (unfinished games)

class Pos {
  constructor() { this.b = new Int8Array(90); this.side = 0; this.quiet = 0; this.ply = 0; this.k = [-1, -1]; this.h1 = 0; this.h2 = 0; }
  static from(spec) {
    const p = new Pos(), fen = spec == null ? START : typeof spec === 'string' ? spec : spec.fen || START;
    const [board, sd] = String(fen).trim().split(/\s+/);
    let r = 0, c = 0;
    for (const ch of board) {
      if (ch === '/') { r++; c = 0; continue; }
      if (ch >= '1' && ch <= '9') { c += +ch; continue; }
      const pc = pieceOfChar(ch); if (pc < 0 || r > 9 || c > 8) throw new Error('bad fen');
      p.b[r * 9 + c] = pc; c++;
    }
    p.side = sd === 'b' ? 1 : 0;
    p.findKings(); p.rehash();
    return p;
  }
  clone() { const q = Object.create(Pos.prototype); q.b = this.b.slice(); q.side = this.side; q.quiet = this.quiet; q.ply = this.ply; q.k = this.k.slice(); q.h1 = this.h1; q.h2 = this.h2; return q; }
  findKings() { this.k = [-1, -1]; for (let s = 0; s < 90; s++) if (typeOf(this.b[s]) === KING) this.k[colorOf(this.b[s])] = s; }
  rehash() { let a = 0, c = 0; for (let s = 0; s < 90; s++) { const x = this.b[s]; if (x) { a ^= Z1[x][s]; c ^= Z2[x][s]; } } if (this.side) { a ^= ZS1; c ^= ZS2; } this.h1 = a >>> 0; this.h2 = c >>> 0; }
  get key() { return this.h1 + ':' + this.h2; }
  at(s) { return this.b[s]; }
  get turn() { return this.side ? P2 : P1; }
  count(p) { const c = p === P1 ? 0 : 1; let n = 0; for (let s = 0; s < 90; s++) if (this.b[s] && colorOf(this.b[s]) === c) n++; return n; }
  // is the general of colour c (0 Cho, 1 Han) attacked?
  attacked(c) {
    const k = this.k[c]; if (k < 0) return true;
    const o = c ^ 1, b = this.b, oR = ROOK | (o << 3), oC = CANNON | (o << 3), oN = HORSE | (o << 3), oE = ELEPHANT | (o << 3), oP = PAWN | (o << 3);
    for (let d = 0; d < 8; d++) {
      const ray = RAYS[k][d]; let i = 0;
      while (i < ray.length && !b[ray[i]]) i++;
      if (i >= ray.length) continue;
      const p = b[ray[i]];
      if (p === oR) return true;
      if (typeOf(p) === CANNON) continue;
      i++; while (i < ray.length && !b[ray[i]]) i++;
      if (i < ray.length && b[ray[i]] === oC) return true;
    }
    for (const [h, leg] of NATT[k]) if (b[h] === oN && !b[leg]) return true;
    for (const [h, b1, b2] of EATT[k]) if (b[h] === oE && !b[b1] && !b[b2]) return true;
    for (const h of PATT[o][k]) if (b[h] === oP) return true;
    return false;
  }
  inCheck() { return this.attacked(this.side); }
  pseudo(c, capsOnly, only) {
    const b = this.b, out = [];
    const add = (s, t) => { const q = b[t]; if (q ? colorOf(q) !== c : !capsOnly) out.push(mv(s, t)); };
    for (let s = only == null ? 0 : only; s < (only == null ? 90 : only + 1); s++) {
      const p = b[s]; if (!p || colorOf(p) !== c) continue;
      switch (typeOf(p)) {
        case KING: case ADVISOR: for (const t of KMOV[s]) add(s, t); break;
        case ELEPHANT: for (const [t, b1, b2] of EMOV[s]) if (!b[b1] && !b[b2]) add(s, t); break;
        case HORSE: for (const [t, leg] of NMOV[s]) if (!b[leg]) add(s, t); break;
        case PAWN: for (const t of PMOV[c][s]) add(s, t); break;
        case ROOK: for (const ray of RAYS[s]) for (const t of ray) { if (!b[t]) { if (!capsOnly) out.push(mv(s, t)); continue; } if (colorOf(b[t]) !== c) out.push(mv(s, t)); break; } break;
        case CANNON:
          for (const ray of RAYS[s]) {
            let i = 0; while (i < ray.length && !b[ray[i]]) i++;
            if (i >= ray.length || typeOf(b[ray[i]]) === CANNON) continue;
            for (i++; i < ray.length; i++) { const q = b[ray[i]]; if (!q) { if (!capsOnly) out.push(mv(s, ray[i])); continue; } if (colorOf(q) !== c && typeOf(q) !== CANNON) out.push(mv(s, ray[i])); break; }
          }
          break;
      }
    }
    return out;
  }
  safe(m, c) { if (isPass(m)) return !this.attacked(c); const f = mFrom(m), t = mTo(m), b = this.b, p = b[f], q = b[t]; b[t] = p; b[f] = 0; const ks = this.k[c]; if (typeOf(p) === KING) this.k[c] = t; const bad = this.attacked(c); b[f] = p; b[t] = q; this.k[c] = ks; return !bad; }
  // legal moves; a lone pass when the side has no move and is not in check
  moves() { const c = this.side, L = this.pseudo(c, false).filter(m => this.safe(m, c)); if (!L.length && !this.inCheck() && this.k[c] >= 0) L.push(mv(this.k[c], this.k[c])); return L; }
  movesFrom(s) { const c = this.side; return this.pseudo(c, false, s).filter(m => this.safe(m, c)); }
  hasCaps() { return this.moves().some(m => !isPass(m) && this.b[mTo(m)]); }
  status() { return this.moves().length ? 0 : -1; }
  isCapture(m) { return !isPass(m) && !!this.b[mTo(m)]; }
  play(m) {
    this.ply++;
    if (isPass(m)) { this.side ^= 1; this.h1 = (this.h1 ^ ZS1) >>> 0; this.h2 = (this.h2 ^ ZS2) >>> 0; this.quiet++; return this; }
    const f = mFrom(m), t = mTo(m), b = this.b, p = b[f], q = b[t];
    let h1 = this.h1 ^ Z1[p][f] ^ Z1[p][t] ^ ZS1, h2 = this.h2 ^ Z2[p][f] ^ Z2[p][t] ^ ZS2;
    if (q) { h1 ^= Z1[q][t]; h2 ^= Z2[q][t]; if (typeOf(q) === KING) this.k[colorOf(q)] = -1; }
    b[t] = p; b[f] = 0; if (typeOf(p) === KING) this.k[colorOf(p)] = t;
    this.side ^= 1; this.h1 = h1 >>> 0; this.h2 = h2 >>> 0; this.quiet = q ? 0 : this.quiet + 1;
    return this;
  }
  fen() {
    let s = '';
    for (let r = 0; r < 10; r++) {
      let e = 0;
      for (let c = 0; c < 9; c++) { const p = this.b[r * 9 + c]; if (!p) { e++; continue; } if (e) { s += e; e = 0; } const ch = FEN_CH[typeOf(p)]; s += colorOf(p) ? ch : ch.toUpperCase(); }
      if (e) s += e; if (r < 9) s += '/';
    }
    return s + ' ' + (this.side ? 'b' : 'w');
  }
  spec() { return this.fen(); }
  // the points of colour c (Han's +1.5 included)
  points(c) { let v = c ? 1.5 : 0; for (let s = 0; s < 90; s++) { const p = this.b[s]; if (p && colorOf(p) === c) v += PTS[typeOf(p)]; } return v; }
  material(c) { return this.points(c); }
  noAttackers() { return false; }
}

// ---------------------------------------------------------------- notation
// style 'kr' (Korean coordinates from Cho's view: row 1..9, 0 from the top + file 1..9 from the left, e.g. 卒 79-78),
// 'hj' (the same with the hanja piece), 'iccs' (a0..i9)
const HJ = { r: ' 楚士象馬車包卒', b: ' 漢士象馬車包兵' };
const KR = ' 궁사상마차포졸';
const rc2 = s => String((Math.floor(s / 9) + 1) % 10) + String(s % 9 + 1);
const sqName = s => 'abcdefghi'[s % 9] + (9 - Math.floor(s / 9));
function name(pos, m, style) {
  if (isPass(m)) return style === 'iccs' ? '0000' : (style === 'kr' ? '한수쉼' : 'pass');
  const f = mFrom(m), t = mTo(m), p = pos.b[f]; if (!p) return '?';
  if (style === 'iccs') return sqName(f) + sqName(t);
  const ch = style === 'kr' ? KR[typeOf(p)] : HJ[colorOf(p) ? 'b' : 'r'][typeOf(p)];
  return ch + rc2(f) + '-' + rc2(t);
}
function parse(pos, s) {
  s = String(s || '').trim(); if (!s) return null;
  const L = pos.moves();
  const icc = s.toLowerCase().replace(/[-\s]/g, '').match(/^([a-i])([0-9])([a-i])([0-9])$/);
  if (icc) { const f = (9 - +icc[2]) * 9 + 'abcdefghi'.indexOf(icc[1]), t = (9 - +icc[4]) * 9 + 'abcdefghi'.indexOf(icc[3]); return L.includes(mv(f, t)) ? mv(f, t) : null; }
  const d = s.replace(/[^0-9]/g, '');
  if (d.length === 4) for (const m of L) if (!isPass(m) && rc2(mFrom(m)) + rc2(mTo(m)) === d) return m;
  if (/pass|한수|쉼/i.test(s)) return L.find(isPass) ?? null;
  return null;
}
function replay(start, moves) {
  const pos = Pos.from(start), hashes = [pos.key], checks = [pos.inCheck()];
  for (const m of moves || []) { pos.play(m); hashes.push(pos.key); checks.push(pos.inCheck()); }
  return { pos, hashes, checks };
}
// enemy points that colour c attacks with a capture that wins material or takes an unprotected piece (the coach's "threats")
const VAL = [0, 0, 3, 3, 5, 13, 7, 2];
function pieceVal(pos, s) { return VAL[typeOf(pos.b[s])]; }
function threats(pos, c) {
  const out = new Set();
  for (const m of pos.pseudo(c, true)) {
    const f = mFrom(m), t = mTo(m), a = pos.b[f], v = pos.b[t];
    if (typeOf(v) === KING) continue;
    if (!pos.safe(m, c)) continue;
    const q = pos.clone(); q.b[t] = a; q.b[f] = 0;
    const prot = q.pseudo(c ^ 1, true).some(x => mTo(x) === t && q.safe(x, c ^ 1));
    if (!prot || pieceVal(pos, f) < pieceVal(pos, t)) out.add(t);
  }
  return out;
}
function isChase() { return false; }
// game status after the moves: { over, winner (1 / 2), why: mate | rep | long, points: [cho, han] }
function judge(pos, hashes) {
  if (pos.status() === -1) return { over: true, winner: pos.side ? P1 : P2, why: 'mate' };
  const n = hashes.length - 1, h = hashes[n];
  let cnt = 0; for (let i = n; i >= 0; i--) if (hashes[i] === h) cnt++;
  const byPoints = why => { const a = pos.points(0), b = pos.points(1); return { over: true, winner: a > b ? P1 : P2, why, points: [a, b] }; };
  if (cnt >= 3) return byPoints('rep');
  if (n >= DRAW_PLIES) return byPoints('long');
  return { over: false };
}
function losingRepMoves() { return []; }

// ---------------------------------------------------------------- AI levels (20 steps: 15급 … 1급, 1단 … 5단)
const LEVELS = [null,
  { d: 1, noise: 300, blunder: 0.38 },
  { d: 1, noise: 230, blunder: 0.28 },
  { d: 1.3, noise: 200, blunder: 0.22 },
  { d: 1.7, noise: 170, blunder: 0.16 },
  { d: 2.1, noise: 135, blunder: 0.11 },
  { d: 2.5, noise: 100, blunder: 0.075 },
  { d: 2.8, noise: 80, blunder: 0.055 },
  { d: 3, noise: 60, blunder: 0.04 },
  { d: 3, noise: 42, blunder: 0.022 },
  { d: 3.5, noise: 35, blunder: 0.015 },
  { d: 4, noise: 30, blunder: 0.012 },
  { d: 4, noise: 20 },
  { s: 1, nk: 3.4 },
  { s: 1, nk: 16.5 },
  { s: 1, nk: 60 },
  { s: 1, nk: 150 },
  { s: 1, nk: 350 },
  { s: 1, nk: 800 },
  { s: 1, nk: 2500, ms: 8000, book: 1 },
  { s: 1, nk: 7000, ms: 12000, book: 1 },
];
function gauss(rand) { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

// ---------------------------------------------------------------- tiny JS search (fallback when WebAssembly is not available)
const JV = [0, 0, 300, 300, 500, 1300, 700, 200];
function jsEval(p) { let v = 0; for (let s = 0; s < 90; s++) { const x = p.b[s]; if (!x) continue; const c = colorOf(x), t = typeOf(x); v += c === p.side ? JV[t] : -JV[t]; } return v; }
function jsSearch(p, d, a, b, ply, tEnd) {
  const L = p.moves();
  if (!L.length) return -(WIN - ply);
  if (d <= 0 || Date.now() > tEnd) return jsEval(p);
  L.sort((x, y) => (p.isCapture(y) ? JV[typeOf(p.b[mTo(y)])] : 0) - (p.isCapture(x) ? JV[typeOf(p.b[mTo(x)])] : 0));
  let best = -Infinity;
  for (const m of L) { const v = -jsSearch(p.clone().play(m), d - 1, -b, -a, ply + 1, tEnd); if (v > best) { best = v; if (v > a) { a = v; if (a >= b) break; } } }
  return best;
}
function jsValues(p, depth, ms) { const tEnd = Date.now() + (ms || 2000); return p.moves().map(m => ({ m, v: -jsSearch(p.clone().play(m), depth - 1, -Infinity, Infinity, 1, tEnd) })).sort((a, b) => b.v - a.v); }

// ---------------------------------------------------------------- WebAssembly side
let WX = null;
function wNN() {}
const wIO = () => new Int32Array(WX.memory.buffer, WX.io_ptr(), 8192);
const toC = m => mFrom(m) | (mTo(m) << 7), fromC = x => mv(x & 127, (x >> 7) & 127);   // (a pass: from == to on both sides)
function wSetup(start, moves, excl) {
  const p = Pos.from(start), a = Array.from(p.b); a.push(p.side, moves.length);
  for (const m of moves) a.push(toC(m));
  a.push((excl || []).length); for (const m of excl || []) a.push(toC(m));
  wIO().set(a); return WX.setup();
}
function wList() { const r = wIO(), L = []; for (let i = 0; i < r[0]; i++) L.push({ m: fromC(r[2 + 2 * i]), v: r[3 + 2 * i] }); return L; }
const kindOf = v => Math.abs(v) > WINT ? 'exact' : 'heur';

let PRO_CFG = null;   // a step of the page's PRO mode for the current 'think' message (same keys as LEVELS)
function think(start, moves, level, rand) {
  rand = rand || Math.random;
  const L = PRO_CFG || LEVELS[level] || LEVELS[10];   // (PRO_CFG: the page's PRO mode, shared/proset.js ladder())
  const { pos, hashes } = replay(start, moves);
  const all = pos.moves();
  if (!all.length) return { move: -1 };
  if (all.length === 1) return { move: all[0] };
  const excl = losingRepMoves(start, moves, pos, hashes);
  if (!WX) {
    const vals = jsValues(pos, Math.min(Math.round(L.d || 3), 3), 1500).filter(e => !excl.includes(e.m) || excl.length === all.length);
    if (L.blunder && rand() < L.blunder) return { move: vals[Math.floor(rand() * vals.length)].m };
    let best = vals[0].m, bv = -Infinity; for (const e of vals) { const x = e.v + gauss(rand) * (L.noise || 0); if (x > bv) { bv = x; best = e.m; } } return { move: best, v: vals[0].v };
  }
  wNN(!!L.s);
  if (!wSetup(start, moves, excl)) return { move: all[0] };
  if (!L.s) {
    WX.values(Math.floor(L.d) + (rand() < L.d % 1 ? 1 : 0));
    const vals = wList();
    if (L.blunder && rand() < L.blunder) {   // a slip: a random move among the not-hopeless ones
      const ok = vals.filter(e => e.v > vals[0].v - 400 && e.v > -WINT); const pool = ok.length > 1 ? ok : vals;
      return { move: pool[Math.floor(rand() * pool.length)].m, v: vals[0].v };
    }
    let best = vals[0].m, bv = -Infinity;
    for (const e of vals) { const x = e.v + (Math.abs(e.v) > WINT - 1000 ? 0 : gauss(rand) * L.noise); if (x > bv) { bv = x; best = e.m; } }
    return { move: best, v: vals[0].v };
  }
  // opening variety for the top levels: in the first plies pick among moves within a few points of the best
  if (L.book && moves.length < 10 && !start) {
    WX.analyze(Math.max(800, (L.ms || 1000) * 0.4), 40);
    const vals = wList(), good = vals.filter(e => e.v >= vals[0].v - 12);
    return { move: good[Math.floor(rand() * good.length)].m, v: vals[0].v };
  }
  WX.best(L.dx || 99, L.ms || 0, !L.nk ? 0 : L.nk < 10 ? -Math.round(L.nk * 10) : L.nk);   // (nk < 10: in hundreds of nodes, negative)
  const r = wIO();
  if (r[0] < 0) return { move: all[0] };
  return { move: fromC(r[0]), v: r[1], depth: r[2] };
}
function analyze(start, moves, ms, onProgress) {
  wNN(true);
  const { pos, hashes } = replay(start, moves);
  if (!WX) { const L = jsValues(pos, 3, ms).map(e => ({ ...e, kind: kindOf(e.v) })); return { list: L, depth: 3 }; }
  if (!wSetup(start, moves, [])) return { list: [], depth: 0 };
  void hashes;
  progressCb = onProgress ? (d => onProgress(wList().map(e => ({ ...e, kind: kindOf(e.v) })), d)) : null;
  WX.analyze(ms, 60); progressCb = null;
  return { list: wList().map(e => ({ ...e, kind: kindOf(e.v) })), depth: wIO()[1] };
}
// puzzles: mate within n own moves (checks: every attacking move must give check). See engine.c puzzle().
function puzzle(start, moves, n, defend, checks) {
  if (!WX) return null;
  if (!wSetup(start, moves, [])) return null;
  WX.mate_clear();
  WX.puzzle(n, defend ? 1 : 0, checks ? 1 : 0, 4000);
  const r = wIO(), out = [];
  for (let i = 0; i < r[0]; i++) out.push({ m: fromC(r[1 + 2 * i]), need: r[2 + 2 * i] });
  return out;
}
let progressCb = null;
// review box: the best few moves (values from the all-moves analysis) and a line for each (short searches move by move)
function multiPV(start, moves, n, ms, plies, onProgress) {
  wNN(true);
  const top = analyze(start, moves, ms).list.slice().sort((a, b) => b.v - a.v).slice(0, n || 4).map(e => ({ m: e.m, v: e.v, pv: [e.m] }));
  if (onProgress) onProgress(top);
  if (!WX) return top;
  for (const c of top) {
    const line = moves.concat([c.m]);
    for (let k = 1; k < (plies || 8); k++) {
      const { pos, hashes } = replay(start, line);
      if (!pos.moves().length || judge(pos, hashes, start, line).over) break;
      if (!wSetup(start, line, [])) break;
      WX.best(99, 70, 0);
      const r = wIO(); if (r[0] < 0) break;
      const m = fromC(r[0]); if (!pos.moves().includes(m)) break;
      line.push(m); c.pv.push(m);
    }
    if (onProgress) onProgress(top);
  }
  return top;
}

// review box, continuous analysis: the best n moves at depth 1, 2, 3, ... (each search excludes the moves already found
// at that depth; the line comes from the transposition table), reported after every depth (and after each line from
// depth 7 on, partial). Ends at maxD or two depths after a win / loss shows up; the page terminates the worker to stop.
function mpvLoop(start, moves, n, maxD, post) {
  wNN(true);
  const { pos } = replay(start, moves), legal = pos.moves();
  n = Math.min(n || 4, legal.length);
  if (!WX || !n) { const l = n ? multiPV(start, moves, n, 800, 8) : []; post('result', { list: l, depth: l.length ? 1 : 0 }); return; }
  let nodes = 0, prev = [], last = 0, mateAt = 0;
  for (let d = 1; d <= (maxD || 40); d++) {
    const ex = [], out = [];
    for (let k = 0; k < n; k++) {
      if (!wSetup(start, moves, ex)) break;
      let cm, v;
      if (legal.length - ex.length === 1) { WX.values(d); const L = wList(); if (!L.length) break; cm = toC(L[0].m); v = L[0].v; }   // best() does not search a lone move
      else { WX.best(d, 0, 0); const r = wIO(); if (r[0] < 0) break; cm = r[0]; v = r[1]; nodes += r[3] * 1000; }
      const m = fromC(cm); if (!legal.includes(m) || ex.includes(m)) break;
      const pl = WX.pv_line(cm, 12), io = wIO(), pv = [];
      for (let j = 0; j < pl; j++) pv.push(fromC(io[1 + j]));
      if (pv[0] !== m) pv.splice(0, pv.length, m);
      ex.push(m); out.push({ m, v, pv });
      if (d >= 7 && k < n - 1) post('progress', { depth: d, nodes, partial: true, list: out.concat(prev.filter(e => !out.some(x => x.m === e.m))).slice(0, n) });
    }
    if (!out.length) break;
    prev = out; last = d;
    post('progress', { depth: d, nodes, list: out.slice() });
    if (Math.abs(out[0].v) > WINT) { if (!mateAt) mateAt = d; if (d >= mateAt + 2) break; }
    if (legal.length === 1 && d >= 4) break;
  }
  post('result', { list: prev, depth: last, nodes });
}

const API = { P1, P2, WIN, WINT, DRAW_PLIES, KING, ADVISOR, ELEPHANT, HORSE, ROOK, CANNON, PAWN, START, SETUPS, startFen, PTS, RC, sqAt, colorOf, typeOf, mv, mFrom, mTo, isPass, Pos, name, parse, sqName, rc2, replay, judge, isChase, threats, losingRepMoves, LEVELS, think, analyze, puzzle, kindOf, NMOV, EMOV, RAYS, KMOV, palace, setWasm: x => { WX = x; }, toC, fromC };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else if (typeof window !== 'undefined') window.JanggiEngine = API;
else if (typeof self !== 'undefined' && typeof importScripts === 'function') {
  const V = 'v=1';
  let readyP = null;
  if (typeof WebAssembly === 'object' && typeof fetch === 'function') {
    const imp = { env: { now: () => Date.now(), progress: d => { if (progressCb) progressCb(d); } } };
    const url = new URL('engine.wasm?' + V, self.location.href);
    readyP = (WebAssembly.instantiateStreaming ? WebAssembly.instantiateStreaming(fetch(url), imp).catch(() => fetch(url).then(r => r.arrayBuffer()).then(b => WebAssembly.instantiate(b, imp))) : fetch(url).then(r => r.arrayBuffer()).then(b => WebAssembly.instantiate(b, imp)))
      .then(r => { WX = r.instance.exports; }).catch(() => { WX = null; });
  }
  let queue = Promise.resolve();
  self.onmessage = e => {
    const m = e.data;
    queue = queue.then(() => readyP).catch(() => {}).then(() => {
      try {
        if (m.type === 'think') self.postMessage({ id: m.id, type: 'result', ...(() => { PRO_CFG = m.cfg || null; try { return think(m.start, m.moves, m.level); } finally { PRO_CFG = null; } })() });
        else if (m.type === 'analyze') {
          const r = analyze(m.start, m.moves, m.time || 1000, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth }));
          self.postMessage({ id: m.id, type: 'result', ...r });
        } else if (m.type === 'multipv') {
          const list = multiPV(m.start, m.moves, m.n, m.time || 800, m.plies, l => self.postMessage({ id: m.id, type: 'progress', list: l.map(e => ({ m: e.m, v: e.v, pv: e.pv.slice() })) }));
          self.postMessage({ id: m.id, type: 'result', list });
        } else if (m.type === 'mpvLoop') mpvLoop(m.start, m.moves, m.n, m.depth, (type, o) => self.postMessage({ id: m.id, type, ...o, list: o.list.map(e => ({ m: e.m, v: e.v, pv: e.pv.slice() })) }));
        else if (m.type === 'puzzle') self.postMessage({ id: m.id, type: 'result', list: puzzle(m.start, m.moves, m.n, m.defend, m.checks) });
        else if (m.type === 'newgame') { if (WX) WX.new_game(); self.postMessage({ id: m.id, type: 'result' }); }
      } catch (err) { self.postMessage({ id: m.id, type: 'result', error: String(err && err.stack || err) }); }
    });
  };
}
})();
