// Chess engine — full rules (castling, en passant, promotion, 50-move rule, repetition, insufficient material),
// 0x88 board, PVS alpha-beta with transposition table, null move, LMR, quiescence, tapered evaluation.
// Works as a Web Worker (postMessage API), as a plain <script> (window.ChessEngine) and as a Node module.
//
// Squares are 0x88 indices (a1 = 0, h1 = 7, a8 = 112). Pieces: type 1..6 (P N B R Q K), +8 for black.
// A move is one int: from | to << 7 | promotion type << 14 | flags << 17 (1 double push, 2 en passant, 4 castling)
'use strict';
(function () {
const P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;
const MATE = 30000, MATET = 29000, INF = 32000;
const KN = [33, 31, 18, 14, -14, -18, -31, -33], KG = [1, -1, 16, -16, 17, 15, -15, -17];
const DB = [17, 15, -15, -17], DR = [16, -16, 1, -1];
const mFrom = m => m & 127, mTo = m => (m >> 7) & 127, mPromo = m => (m >> 14) & 7, mFlag = m => m >> 17;
const sqName = s => 'abcdefgh'[s & 7] + ((s >> 4) + 1);
const sqOf = n => (n.charCodeAt(0) - 97) + ((n.charCodeAt(1) - 49) << 4);
function xorshift(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s | 0; }; }
const rnd = xorshift(0x2545f491);
const Z1 = new Int32Array(16 * 128), Z2 = new Int32Array(16 * 128), ZC1 = new Int32Array(16), ZC2 = new Int32Array(16), ZE1 = new Int32Array(8), ZE2 = new Int32Array(8);
for (let i = 0; i < Z1.length; i++) { Z1[i] = rnd(); Z2[i] = rnd(); }
for (let i = 0; i < 16; i++) { ZC1[i] = rnd(); ZC2[i] = rnd(); }
for (let i = 0; i < 8; i++) { ZE1[i] = rnd(); ZE2[i] = rnd(); }
const ZS1 = rnd(), ZS2 = rnd();
// castling rights kept after a move touches a square
const CR = new Int8Array(128).fill(15);
CR[4] = 15 & ~3; CR[0] = 15 & ~2; CR[7] = 15 & ~1; CR[116] = 15 & ~12; CR[112] = 15 & ~8; CR[119] = 15 & ~4;
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// ---------------------------------------------------------------- position
class Pos {
  constructor() {
    this.b = new Int8Array(128); this.side = 0; this.castle = 0; this.ep = -1; this.half = 0; this.full = 1;
    this.ksq = new Int32Array(2); this.h1 = 0; this.h2 = 0;
    this.sp = 0; this.uCap = new Int8Array(1024); this.uCastle = new Int8Array(1024); this.uEp = new Int16Array(1024);
    this.uHalf = new Int16Array(1024); this.uH1 = new Int32Array(1024); this.uH2 = new Int32Array(1024);
  }
  static fromFEN(fen) {
    const p = new Pos(), f = (fen || START).trim().split(/\s+/);
    let r = 7, c = 0;
    for (const ch of f[0]) {
      if (ch === '/') { r--; c = 0; continue; }
      if (/\d/.test(ch)) { c += +ch; continue; }
      const t = 'pnbrqk'.indexOf(ch.toLowerCase()) + 1; if (!t) throw new Error('bad fen');
      const s = r * 16 + c; p.b[s] = t | (ch === ch.toLowerCase() ? 8 : 0);
      if (t === K) p.ksq[ch === ch.toLowerCase() ? 1 : 0] = s;
      c++;
    }
    p.side = f[1] === 'b' ? 1 : 0;
    p.castle = 0; const cs = f[2] || '-';
    if (cs.includes('K')) p.castle |= 1; if (cs.includes('Q')) p.castle |= 2; if (cs.includes('k')) p.castle |= 4; if (cs.includes('q')) p.castle |= 8;
    p.ep = f[3] && f[3] !== '-' ? sqOf(f[3]) : -1;
    p.half = +(f[4] || 0); p.full = +(f[5] || 1);
    if (p.ep >= 0 && !p.epUseful(p.ep)) p.ep = -1;
    p.rehash();
    return p;
  }
  // an en-passant square only counts when a pawn of the side to move can really capture there
  epUseful(ep) { const us = this.side, pw = P | (us ? 8 : 0), from = us ? ep + 16 : ep - 16; return ((from - 1) & 0x88) === 0 && this.b[from - 1] === pw || ((from + 1) & 0x88) === 0 && this.b[from + 1] === pw; }
  rehash() {
    let a = 0, c = 0;
    for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } const p = this.b[s]; if (p) { a ^= Z1[p * 128 + s]; c ^= Z2[p * 128 + s]; } }
    a ^= ZC1[this.castle]; c ^= ZC2[this.castle];
    if (this.ep >= 0) { a ^= ZE1[this.ep & 7]; c ^= ZE2[this.ep & 7]; }
    if (this.side) { a ^= ZS1; c ^= ZS2; }
    this.h1 = a; this.h2 = c;
  }
  clone() { return Pos.fromFEN(this.fen()); }
  fen() {
    let s = '';
    for (let r = 7; r >= 0; r--) {
      let e = 0;
      for (let c = 0; c < 8; c++) {
        const p = this.b[r * 16 + c];
        if (!p) { e++; continue; }
        if (e) { s += e; e = 0; }
        const ch = ' pnbrqk'[p & 7]; s += p & 8 ? ch : ch.toUpperCase();
      }
      if (e) s += e;
      if (r) s += '/';
    }
    let cs = (this.castle & 1 ? 'K' : '') + (this.castle & 2 ? 'Q' : '') + (this.castle & 4 ? 'k' : '') + (this.castle & 8 ? 'q' : '');
    return `${s} ${this.side ? 'b' : 'w'} ${cs || '-'} ${this.ep >= 0 ? sqName(this.ep) : '-'} ${this.half} ${this.full}`;
  }
  attacked(s, by) {   // is square s attacked by color `by`?
    const b = this.b, c8 = by ? 8 : 0;
    // pawns
    if (by === 0) { if ((((s - 15) & 0x88) === 0 && b[s - 15] === P) || (((s - 17) & 0x88) === 0 && b[s - 17] === P)) return true; }
    else { if ((((s + 15) & 0x88) === 0 && b[s + 15] === (P | 8)) || (((s + 17) & 0x88) === 0 && b[s + 17] === (P | 8))) return true; }
    for (let i = 0; i < 8; i++) { const t = s + KN[i]; if ((t & 0x88) === 0 && b[t] === (N | c8)) return true; }
    for (let i = 0; i < 8; i++) { const t = s + KG[i]; if ((t & 0x88) === 0 && b[t] === (K | c8)) return true; }
    for (let i = 0; i < 4; i++) {
      const d = DB[i]; let t = s + d;
      while ((t & 0x88) === 0) { const p = b[t]; if (p) { if (p === (B | c8) || p === (Q | c8)) return true; break; } t += d; }
    }
    for (let i = 0; i < 4; i++) {
      const d = DR[i]; let t = s + d;
      while ((t & 0x88) === 0) { const p = b[t]; if (p) { if (p === (R | c8) || p === (Q | c8)) return true; break; } t += d; }
    }
    return false;
  }
  inCheck() { return this.attacked(this.ksq[this.side], this.side ^ 1); }
  // pseudo-legal moves (caps = captures and promotions only)
  gen(out, caps) {
    const b = this.b, us = this.side, them = us ^ 1, c8 = us ? 8 : 0;
    let n = 0;
    const fwd = us ? -16 : 16, startR = us ? 6 : 1, promoR = us ? 1 : 6;
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      const p = b[s]; if (!p || (p & 8) !== c8) continue;
      const t = p & 7;
      if (t === P) {
        const r = s >> 4, o = s + fwd;
        if (!b[o]) {
          if (r === promoR) { for (const pr of [Q, N, R, B]) out[n++] = s | (o << 7) | (pr << 14); }
          else if (!caps) {
            out[n++] = s | (o << 7);
            if (r === startR && !b[o + fwd]) out[n++] = s | ((o + fwd) << 7) | (1 << 17);
          }
        }
        for (const dx of [-1, 1]) {
          const c = o + dx; if (c & 0x88) continue;
          const q = b[c];
          if (q && (q & 8) !== c8) { if (r === promoR) { for (const pr of [Q, N, R, B]) out[n++] = s | (c << 7) | (pr << 14); } else out[n++] = s | (c << 7); }
          else if (c === this.ep) out[n++] = s | (c << 7) | (2 << 17);
        }
        continue;
      }
      if (t === N || t === K) {
        const D = t === N ? KN : KG;
        for (let i = 0; i < 8; i++) {
          const o = s + D[i]; if (o & 0x88) continue;
          const q = b[o];
          if (q) { if ((q & 8) !== c8) out[n++] = s | (o << 7); }
          else if (!caps) out[n++] = s | (o << 7);
        }
        if (t === K && !caps) {
          const home = us ? 116 : 4;
          if (s === home) {
            if ((this.castle & (us ? 4 : 1)) && !b[s + 1] && !b[s + 2] && b[s + 3] === (R | c8) && !this.attacked(s, them) && !this.attacked(s + 1, them) && !this.attacked(s + 2, them)) out[n++] = s | ((s + 2) << 7) | (4 << 17);
            if ((this.castle & (us ? 8 : 2)) && !b[s - 1] && !b[s - 2] && !b[s - 3] && b[s - 4] === (R | c8) && !this.attacked(s, them) && !this.attacked(s - 1, them) && !this.attacked(s - 2, them)) out[n++] = s | ((s - 2) << 7) | (4 << 17);
          }
        }
        continue;
      }
      const dirs = t === B ? DB : t === R ? DR : KG;
      for (let i = 0; i < dirs.length; i++) {
        const d = dirs[i]; let o = s + d;
        while ((o & 0x88) === 0) {
          const q = b[o];
          if (q) { if ((q & 8) !== c8) out[n++] = s | (o << 7); break; }
          if (!caps) out[n++] = s | (o << 7);
          o += d;
        }
      }
    }
    return n;
  }
  // make a pseudo-legal move; returns false (and restores the position) if it leaves the own king in check
  make(m) {
    const b = this.b, f = m & 127, t = (m >> 7) & 127, pr = (m >> 14) & 7, fl = m >> 17;
    const us = this.side, them = us ^ 1, p = b[f], sp = this.sp++;
    let cap = b[t];
    this.uCastle[sp] = this.castle; this.uEp[sp] = this.ep; this.uHalf[sp] = this.half; this.uH1[sp] = this.h1; this.uH2[sp] = this.h2;
    let h1 = this.h1, h2 = this.h2;
    if (this.ep >= 0) { h1 ^= ZE1[this.ep & 7]; h2 ^= ZE2[this.ep & 7]; }
    h1 ^= ZC1[this.castle]; h2 ^= ZC2[this.castle];
    if (fl & 2) { const cs = us ? t + 16 : t - 16; cap = b[cs]; b[cs] = 0; h1 ^= Z1[cap * 128 + cs]; h2 ^= Z2[cap * 128 + cs]; }
    else if (cap) { h1 ^= Z1[cap * 128 + t]; h2 ^= Z2[cap * 128 + t]; }
    this.uCap[sp] = cap;
    const np = pr ? (pr | (us ? 8 : 0)) : p;
    b[f] = 0; b[t] = np;
    h1 ^= Z1[p * 128 + f] ^ Z1[np * 128 + t]; h2 ^= Z2[p * 128 + f] ^ Z2[np * 128 + t];
    if (fl & 4) {
      const rf = t > f ? f + 3 : f - 4, rt = t > f ? f + 1 : f - 1, rk = b[rf];
      b[rf] = 0; b[rt] = rk; h1 ^= Z1[rk * 128 + rf] ^ Z1[rk * 128 + rt]; h2 ^= Z2[rk * 128 + rf] ^ Z2[rk * 128 + rt];
    }
    if ((p & 7) === K) this.ksq[us] = t;
    this.castle &= CR[f] & CR[t];
    h1 ^= ZC1[this.castle]; h2 ^= ZC2[this.castle];
    this.half = ((p & 7) === P || cap) ? 0 : this.half + 1;
    if (us) this.full++;
    this.side = them; h1 ^= ZS1; h2 ^= ZS2;
    this.ep = -1;
    if (fl & 1) { const e = (f + t) >> 1; if (this.epUseful(e)) { this.ep = e; h1 ^= ZE1[e & 7]; h2 ^= ZE2[e & 7]; } }
    this.h1 = h1; this.h2 = h2;
    if (this.attacked(this.ksq[us], them)) { this.unmake(m); return false; }
    return true;
  }
  unmake(m) {
    const b = this.b, f = m & 127, t = (m >> 7) & 127, pr = (m >> 14) & 7, fl = m >> 17;
    const sp = --this.sp, them = this.side, us = them ^ 1;
    this.side = us; if (us) this.full--;
    const np = b[t], p = pr ? (P | (us ? 8 : 0)) : np, cap = this.uCap[sp];
    b[f] = p; b[t] = 0;
    if (fl & 2) b[us ? t + 16 : t - 16] = cap; else b[t] = cap;
    if (fl & 4) { const rf = t > f ? f + 3 : f - 4, rt = t > f ? f + 1 : f - 1; b[rf] = b[rt]; b[rt] = 0; }
    if ((p & 7) === K) this.ksq[us] = f;
    this.castle = this.uCastle[sp]; this.ep = this.uEp[sp]; this.half = this.uHalf[sp]; this.h1 = this.uH1[sp]; this.h2 = this.uH2[sp];
  }
  makeNull() {
    const sp = this.sp++;
    this.uCastle[sp] = this.castle; this.uEp[sp] = this.ep; this.uHalf[sp] = this.half; this.uH1[sp] = this.h1; this.uH2[sp] = this.h2;
    if (this.ep >= 0) { this.h1 ^= ZE1[this.ep & 7]; this.h2 ^= ZE2[this.ep & 7]; }
    this.ep = -1; this.side ^= 1; this.h1 ^= ZS1; this.h2 ^= ZS2; this.half++;
  }
  unmakeNull() { const sp = --this.sp; this.side ^= 1; this.castle = this.uCastle[sp]; this.ep = this.uEp[sp]; this.half = this.uHalf[sp]; this.h1 = this.uH1[sp]; this.h2 = this.uH2[sp]; }
  legal() {
    const buf = new Int32Array(256), n = this.gen(buf, false), out = [];
    for (let i = 0; i < n; i++) if (this.make(buf[i])) { this.unmake(buf[i]); out.push(buf[i]); }
    return out;
  }
  hasLegal() {
    const buf = this._lb || (this._lb = new Int32Array(256)), n = this.gen(buf, false);
    for (let i = 0; i < n; i++) if (this.make(buf[i])) { this.unmake(buf[i]); return true; }
    return false;
  }
  // neither side can mate: K vs K, K+minor vs K, K+B vs K+B with bishops on one colour
  insufficient() {
    let minors = 0, bishSq = [];
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      const t = this.b[s] & 7;
      if (!t || t === K) continue;
      if (t === P || t === R || t === Q) return false;
      minors++; if (t === B) bishSq.push(((s >> 4) + (s & 7)) & 1);
      if (minors > 2) return false;
    }
    if (minors <= 1) return true;
    return bishSq.length === 2 && bishSq[0] === bishSq[1];
  }
  // SAN of a legal move
  san(m, legalList) {
    const b = this.b, f = m & 127, t = (m >> 7) & 127, pr = (m >> 14) & 7, fl = m >> 17, p = b[f] & 7;
    let s;
    if (fl & 4) s = t > f ? 'O-O' : 'O-O-O';
    else {
      const cap = b[t] || (fl & 2);
      if (p === P) s = (cap ? 'abcdefgh'[f & 7] + 'x' : '') + sqName(t) + (pr ? '=' + ' PNBRQK'[pr] : '');
      else {
        s = ' PNBRQK'[p];
        const L = legalList || this.legal(), amb = L.filter(x => x !== m && (x >> 7 & 127) === t && (b[x & 127] & 7) === p && ((x >> 14) & 7) === 0);
        if (amb.length) {
          const sameFile = amb.some(x => ((x & 127) & 7) === (f & 7)), sameRank = amb.some(x => ((x & 127) >> 4) === (f >> 4));
          if (!sameFile) s += 'abcdefgh'[f & 7]; else if (!sameRank) s += (f >> 4) + 1; else s += sqName(f);
        }
        s += (cap ? 'x' : '') + sqName(t);
      }
    }
    this.make(m);
    if (this.inCheck()) s += this.hasLegal() ? '+' : '#';
    this.unmake(m);
    return s;
  }
  uci(m) { const pr = (m >> 14) & 7; return sqName(m & 127) + sqName((m >> 7) & 127) + (pr ? ' pnbrqk'[pr] : ''); }
  fromUci(u) { const L = this.legal(); return L.find(m => this.uci(m) === u); }
  fromSan(s) {
    s = s.replace(/[+#!?]/g, '').replace(/^0-0-0$/, 'O-O-O').replace(/^0-0$/, 'O-O').replace(/e\.p\./, '').trim();
    const L = this.legal();
    for (const m of L) if (this.san(m, L).replace(/[+#]/g, '') === s) return m;
    // tolerant: "Nbd2"-style already covered; try uci
    return L.find(m => this.uci(m) === s.toLowerCase());
  }
}

// ---------------------------------------------------------------- evaluation
// piece-square tables written from White's point of view, a8..h8 first
const T = s => s.trim().split(/[\s,]+/).map(Number);
const PST_TXT = {
  P: `0 0 0 0 0 0 0 0  50 50 50 50 50 50 50 50  10 10 20 30 30 20 10 10  5 5 10 25 25 10 5 5  0 0 0 20 20 0 0 0  5 -5 -10 0 0 -10 -5 5  5 10 10 -20 -20 10 10 5  0 0 0 0 0 0 0 0`,
  PE: `0 0 0 0 0 0 0 0  90 90 90 90 90 90 90 90  55 55 50 45 45 50 55 55  30 30 25 20 20 25 30 30  15 15 10 10 10 10 15 15  5 5 0 0 0 0 5 5  0 0 0 0 0 0 0 0  0 0 0 0 0 0 0 0`,
  N: `-50 -40 -30 -30 -30 -30 -40 -50  -40 -20 0 0 0 0 -20 -40  -30 0 10 15 15 10 0 -30  -30 5 15 20 20 15 5 -30  -30 0 15 20 20 15 0 -30  -30 5 10 15 15 10 5 -30  -40 -20 0 5 5 0 -20 -40  -50 -40 -30 -30 -30 -30 -40 -50`,
  B: `-20 -10 -10 -10 -10 -10 -10 -20  -10 0 0 0 0 0 0 -10  -10 0 5 10 10 5 0 -10  -10 5 5 10 10 5 5 -10  -10 0 10 10 10 10 0 -10  -10 10 10 10 10 10 10 -10  -10 5 0 0 0 0 5 -10  -20 -10 -10 -10 -10 -10 -10 -20`,
  R: `0 0 0 0 0 0 0 0  5 10 10 10 10 10 10 5  -5 0 0 0 0 0 0 -5  -5 0 0 0 0 0 0 -5  -5 0 0 0 0 0 0 -5  -5 0 0 0 0 0 0 -5  -5 0 0 0 0 0 0 -5  0 0 0 5 5 0 0 0`,
  Q: `-20 -10 -10 -5 -5 -10 -10 -20  -10 0 0 0 0 0 0 -10  -10 0 5 5 5 5 0 -10  -5 0 5 5 5 5 0 -5  0 0 5 5 5 5 0 -5  -10 5 5 5 5 5 0 -10  -10 0 5 0 0 0 0 -10  -20 -10 -10 -5 -5 -10 -10 -20`,
  K: `-30 -40 -40 -50 -50 -40 -40 -30  -30 -40 -40 -50 -50 -40 -40 -30  -30 -40 -40 -50 -50 -40 -40 -30  -30 -40 -40 -50 -50 -40 -40 -30  -20 -30 -30 -40 -40 -30 -30 -20  -10 -20 -20 -20 -20 -20 -20 -10  20 20 0 0 0 0 20 20  20 30 10 0 0 10 30 20`,
  KE: `-50 -40 -30 -20 -20 -30 -40 -50  -30 -20 -10 0 0 -10 -20 -30  -30 -10 20 30 30 20 -10 -30  -30 -10 30 40 40 30 -10 -30  -30 -10 30 40 40 30 -10 -30  -30 -10 20 30 30 20 -10 -30  -30 -30 0 0 0 0 -30 -30  -50 -30 -30 -30 -30 -30 -30 -50`,
};
const MGV = [0, 82, 337, 365, 477, 1025, 0], EGV = [0, 94, 281, 297, 512, 936, 0];
const VAL = [0, 100, 320, 330, 500, 900, 20000];
const PHASE = [0, 0, 1, 1, 2, 4, 0];
// MG[color][piece type][sq] including material
const MG = [[], []], EG = [[], []];
(function () {
  const t = { P: T(PST_TXT.P), PE: T(PST_TXT.PE), N: T(PST_TXT.N), B: T(PST_TXT.B), R: T(PST_TXT.R), Q: T(PST_TXT.Q), K: T(PST_TXT.K), KE: T(PST_TXT.KE) };
  const mg = [null, t.P, t.N, t.B, t.R, t.Q, t.K], eg = [null, t.PE, t.N, t.B, t.R, t.Q, t.KE];
  for (let c = 0; c < 2; c++) for (let p = 1; p <= 6; p++) {
    MG[c][p] = new Int16Array(128); EG[c][p] = new Int16Array(128);
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) continue;
      const r = s >> 4, f = s & 7, idx = c === 0 ? (7 - r) * 8 + f : r * 8 + f;
      MG[c][p][s] = MGV[p] + mg[p][idx]; EG[c][p][s] = EGV[p] + eg[p][idx] * (p === N || p === B ? 0.6 : 1);
    }
  }
})();
const PASS_MG = [0, 5, 10, 15, 25, 40, 60, 0], PASS_EG = [0, 10, 20, 35, 60, 95, 140, 0];
const pawnFiles = [new Int8Array(10), new Int8Array(10)], pawnMinR = [new Int8Array(10), new Int8Array(10)], pawnMaxR = [new Int8Array(10), new Int8Array(10)];
function evaluate(pos) {
  const b = pos.b;
  let mg0 = 0, mg1 = 0, eg0 = 0, eg1 = 0, phase = 0;
  const pf = pawnFiles, mnr = pawnMinR, mxr = pawnMaxR;
  pf[0].fill(0); pf[1].fill(0); mnr[0].fill(9); mnr[1].fill(9); mxr[0].fill(-1); mxr[1].fill(-1);
  let bish0 = 0, bish1 = 0, nonPawn0 = 0, nonPawn1 = 0, pawns0 = 0, pawns1 = 0;
  for (let s = 0; s < 128; s++) {
    if (s & 0x88) { s += 7; continue; }
    const p = b[s]; if (!p) continue;
    const t = p & 7, c = p >> 3;
    if (c) { mg1 += MG[1][t][s]; eg1 += EG[1][t][s]; } else { mg0 += MG[0][t][s]; eg0 += EG[0][t][s]; }
    phase += PHASE[t];
    if (t === P) {
      const f = (s & 7) + 1, r = s >> 4; pf[c][f]++;
      if (r < mnr[c][f]) mnr[c][f] = r; if (r > mxr[c][f]) mxr[c][f] = r;
      if (c) pawns1++; else pawns0++;
    } else if (t !== K) {
      if (c) nonPawn1 += VAL[t]; else nonPawn0 += VAL[t];
      if (t === B) { if (c) bish1++; else bish0++; }
      // mobility (pseudo) for minor and major pieces
      const dirs = t === N ? KN : t === B ? DB : t === R ? DR : KG, slide = t !== N;
      let mob = 0;
      for (let i = 0; i < dirs.length; i++) {
        let o = s + dirs[i];
        while ((o & 0x88) === 0) { const q = b[o]; if (!q) mob++; else { if ((q >> 3) !== c) mob++; break; } if (!slide) break; o += dirs[i]; }
      }
      const w = t === N ? 4 : t === B ? 4 : t === R ? 2 : 1, base = t === N ? 4 : t === B ? 6 : t === R ? 7 : 13;
      const mv = (mob - base) * w, ev = (mob - base) * (t === R ? 4 : t === Q ? 2 : w);
      if (c) { mg1 += mv; eg1 += ev; } else { mg0 += mv; eg0 += ev; }
    }
  }
  // pawn structure and rooks on files
  for (let c = 0; c < 2; c++) {
    const o = c ^ 1; let smg = 0, seg = 0;
    for (let f = 1; f <= 8; f++) {
      const n = pf[c][f]; if (!n) continue;
      if (n > 1) { smg -= 12 * (n - 1); seg -= 18 * (n - 1); }
      if (!pf[c][f - 1] && !pf[c][f + 1]) { smg -= 12 * n; seg -= 14 * n; }
      // passed pawn: the most advanced pawn on this file, no enemy pawn ahead on the file or next files
      const r = c ? mnr[c][f] : mxr[c][f];
      let passed = true;
      for (let g = f - 1; g <= f + 1 && passed; g++) {
        if (!pf[o][g]) continue;
        if (c === 0 ? mxr[o][g] > r : mnr[o][g] < r) passed = false;
      }
      if (passed) { const rr = c ? 7 - r : r; smg += PASS_MG[rr]; seg += PASS_EG[rr]; }
    }
    if (c) { mg1 += smg; eg1 += seg; } else { mg0 += smg; eg0 += seg; }
  }
  for (let s = 0; s < 128; s++) {
    if (s & 0x88) { s += 7; continue; }
    const p = b[s]; if ((p & 7) !== R) continue;
    const c = p >> 3, f = (s & 7) + 1;
    const v = !pf[c][f] ? (!pf[c ^ 1][f] ? 22 : 11) : 0;
    if (c) { mg1 += v; eg1 += v >> 1; } else { mg0 += v; eg0 += v >> 1; }
  }
  if (bish0 >= 2) { mg0 += 30; eg0 += 45; } if (bish1 >= 2) { mg1 += 30; eg1 += 45; }
  // king shelter (middlegame): own pawns in front of the king
  for (let c = 0; c < 2; c++) {
    const k = pos.ksq[c], fw = c ? -16 : 16; let sh = 0;
    for (const dx of [-1, 0, 1]) { const s1 = k + fw + dx, s2 = k + 2 * fw + dx; if (!(s1 & 0x88) && b[s1] === (P | (c ? 8 : 0))) sh += 12; else if (!(s2 & 0x88) && b[s2] === (P | (c ? 8 : 0))) sh += 6; }
    if (c) mg1 += sh; else mg0 += sh;
  }
  if (phase > 24) phase = 24;
  let mg = mg0 - mg1, eg = eg0 - eg1;
  // mop-up: drive the lone king to the edge and bring the own king closer
  const diff = (nonPawn0 + 100 * pawns0) - (nonPawn1 + 100 * pawns1);
  if (Math.abs(diff) >= 400 && phase <= 8) {
    const win = diff > 0 ? 0 : 1, lose = win ^ 1, lk = pos.ksq[lose], wk = pos.ksq[win];
    const cd = Math.max(3 - (lk & 7), (lk & 7) - 4) + Math.max(3 - (lk >> 4), (lk >> 4) - 4);
    const kd = Math.max(Math.abs((lk & 7) - (wk & 7)), Math.abs((lk >> 4) - (wk >> 4)));
    const bonus = cd * 12 + (7 - kd) * 6;
    eg += win === 0 ? bonus : -bonus;
  }
  let v = Math.round((mg * phase + eg * (24 - phase)) / 24);
  // drawish material: no pawns and at most a minor piece ahead
  if (!pawns0 && diff > 0 && nonPawn0 - nonPawn1 <= 330) v >>= 3;
  if (!pawns1 && diff < 0 && nonPawn1 - nonPawn0 <= 330) v >>= 3;
  v += pos.side === 0 ? 12 : -12;   // tempo
  return pos.side === 0 ? v : -v;
}

// ---------------------------------------------------------------- search
const TT_BITS = 20, TT_SIZE = 1 << TT_BITS, TT_MASK = TT_SIZE - 1, MAXPLY = 100;
class Engine {
  constructor(bits) {
    const size = 1 << (bits || TT_BITS); this.mask = size - 1;
    this.k1 = new Int32Array(size); this.k2 = new Int32Array(size); this.tv = new Int16Array(size); this.tm = new Int32Array(size); this.td = new Int8Array(size); this.tf = new Int8Array(size);
    this.buf = Array.from({ length: MAXPLY + 64 }, () => new Int32Array(256));
    this.sc = Array.from({ length: MAXPLY + 64 }, () => new Int32Array(256));
    this.killer = new Int32Array((MAXPLY + 64) * 2);
    this.hist = new Int32Array(16 * 128);
    this.rep = new Int32Array(2048); this.repLen = 0;
    this.nodes = 0; this.aborted = false; this.deadline = Infinity; this.maxNodes = Infinity; this.mate = false;
  }
  clear() { this.k1.fill(0); this.k2.fill(0); this.td.fill(0); this.hist.fill(0); this.killer.fill(0); }
  limit(ms, maxNodes) { this.nodes = 0; this.aborted = false; this.deadline = ms ? Date.now() + ms : Infinity; this.maxNodes = maxNodes || Infinity; }
  setHistory(h) { this.repLen = 0; for (const x of h || []) this.rep[this.repLen++] = x; }
  isRep(pos) { const lim = Math.max(0, this.repLen - 1 - pos.half); for (let i = this.repLen - 3; i >= lim; i -= 2) if (this.rep[i] === pos.h1) return true; return false; }
  order(pos, mv, n, ply, ttm, sc) {
    const b = pos.b, k0 = this.killer[ply * 2], k1 = this.killer[ply * 2 + 1];
    for (let i = 0; i < n; i++) {
      const m = mv[i];
      if (m === ttm) { sc[i] = 1 << 30; continue; }
      const t = (m >> 7) & 127, cap = b[t] & 7, pr = (m >> 14) & 7;
      if (cap || (m >> 17) & 2) sc[i] = (1 << 26) + (cap ? VAL[cap] : 100) * 16 - VAL[b[m & 127] & 7] / 16 + (pr === Q ? 1000 : 0);
      else if (pr) sc[i] = pr === Q ? (1 << 26) + 800 * 16 : -1000;
      else if (m === k0) sc[i] = 1 << 25; else if (m === k1) sc[i] = (1 << 25) - 1;
      else sc[i] = this.hist[b[m & 127] * 128 + t];
    }
  }
  pick(mv, sc, i, n) { let bi = i; for (let j = i + 1; j < n; j++) if (sc[j] > sc[bi]) bi = j; const m = mv[bi]; mv[bi] = mv[i]; mv[i] = m; const s = sc[bi]; sc[bi] = sc[i]; sc[i] = s; return m; }
  qsearch(pos, alpha, beta, ply) {
    this.nodes++;
    if ((this.nodes & 4095) === 0 && (Date.now() > this.deadline || this.nodes > this.maxNodes)) this.aborted = true;
    if (this.aborted) return 0;
    const inCheck = pos.inCheck();
    let best = -INF;
    if (!inCheck) {
      best = evaluate(pos);
      if (best >= beta || ply >= MAXPLY) return best;
      if (best > alpha) alpha = best;
    }
    const mv = this.buf[ply], sc = this.sc[ply], n = pos.gen(mv, !inCheck);
    this.order(pos, mv, n, ply, -1, sc);
    let legal = 0;
    for (let i = 0; i < n; i++) {
      const m = this.pick(mv, sc, i, n);
      if (!inCheck) {   // delta pruning
        const cap = pos.b[(m >> 7) & 127] & 7, pr = (m >> 14) & 7;
        if (!pr && best + (cap ? VAL[cap] : 100) + 200 < alpha) continue;
        if (pr && pr !== Q) continue;
      }
      if (!pos.make(m)) continue;
      legal++;
      const v = -this.qsearch(pos, -beta, -alpha, ply + 1);
      pos.unmake(m);
      if (v > best) { best = v; if (v > alpha) { alpha = v; if (v >= beta) break; } }
    }
    if (inCheck && !legal) return -(MATE - ply);
    return best;
  }
  search(pos, depth, alpha, beta, ply, nullOk) {
    if ((++this.nodes & 4095) === 0 && (Date.now() > this.deadline || this.nodes > this.maxNodes)) this.aborted = true;
    if (this.aborted) return 0;
    const pv = beta - alpha > 1;
    if (ply > 0) {
      if (pos.half >= 100 || (pos.half >= 4 && this.isRep(pos)) || pos.insufficient()) return 0;
      const ma = -(MATE - ply), mb = MATE - ply - 1;
      if (ma > alpha) { alpha = ma; if (alpha >= beta) return alpha; }
      if (mb < beta) { beta = mb; if (alpha >= beta) return beta; }
    }
    const inCheck = pos.inCheck();
    if (inCheck && ply < MAXPLY) depth++;
    if (depth <= 0 || ply >= MAXPLY) {
      if (!this.mate) return this.qsearch(pos, alpha, beta, ply);
      return pos.hasLegal() ? 0 : inCheck ? -(MATE - ply) : 0;
    }
    const idx = pos.h1 & this.mask; let ttm = 0;
    if (this.k1[idx] === pos.h1 && this.k2[idx] === pos.h2) {
      ttm = this.tm[idx];
      if (!pv && this.td[idx] >= depth) {
        let v = this.tv[idx]; if (v > MATET) v -= ply; else if (v < -MATET) v += ply;
        const f = this.tf[idx];
        if (f === 0 || (f === 1 && v >= beta) || (f === 2 && v <= alpha)) return v;
      }
    }
    const prune = !this.mate && !pv && !inCheck;
    let sev = 0;
    if (prune) {
      sev = evaluate(pos);
      if (depth <= 3 && sev - 110 * depth >= beta && Math.abs(beta) < MATET) return sev;   // reverse futility
      if (nullOk && depth >= 3 && sev >= beta && this.hasPieces(pos)) {
        const Rn = 2 + (depth >= 7 ? 1 : 0);
        pos.makeNull(); this.rep[this.repLen++] = pos.h1;
        const v = -this.search(pos, depth - 1 - Rn, -beta, -beta + 1, ply + 1, false);
        this.repLen--; pos.unmakeNull();
        if (this.aborted) return 0;
        if (v >= beta) return Math.abs(v) > MATET ? beta : v;
      }
    }
    const mv = this.buf[ply], sc = this.sc[ply], n = pos.gen(mv, false);
    this.order(pos, mv, n, ply, ttm, sc);
    const a0 = alpha; let best = -INF, bm = 0, legal = 0;
    for (let i = 0; i < n; i++) {
      const m = this.pick(mv, sc, i, n);
      const quiet = !pos.b[(m >> 7) & 127] && !((m >> 14) & 7) && !((m >> 17) & 2);
      if (!pos.make(m)) continue;
      legal++;
      const givesCheck = pos.inCheck();
      // futility pruning of quiet moves near the leaves
      if (prune && quiet && !givesCheck && legal > 1 && depth <= 2 && sev + 120 + 140 * depth <= alpha) { pos.unmake(m); continue; }
      this.rep[this.repLen++] = pos.h1;
      let v;
      if (legal === 1) v = -this.search(pos, depth - 1, -beta, -alpha, ply + 1, true);
      else {
        let rd = 0;
        if (!this.mate && quiet && !inCheck && !givesCheck && depth >= 3 && legal > 3) rd = 1 + (legal > 8 && depth >= 6 ? 1 : 0) + (pv ? 0 : 0);
        v = -this.search(pos, depth - 1 - rd, -alpha - 1, -alpha, ply + 1, true);
        if (v > alpha && rd) v = -this.search(pos, depth - 1, -alpha - 1, -alpha, ply + 1, true);
        if (v > alpha && v < beta) v = -this.search(pos, depth - 1, -beta, -alpha, ply + 1, true);
      }
      this.repLen--; pos.unmake(m);
      if (this.aborted) return 0;
      if (v > best) {
        best = v; bm = m;
        if (v > alpha) {
          alpha = v;
          if (v >= beta) {
            if (quiet) {
              if (this.killer[ply * 2] !== m) { this.killer[ply * 2 + 1] = this.killer[ply * 2]; this.killer[ply * 2] = m; }
              const hi = pos.b[m & 127] * 128 + ((m >> 7) & 127); this.hist[hi] += depth * depth; if (this.hist[hi] > 1e7) this.hist.forEach((x, k, a) => (a[k] = x >> 1));
            }
            break;
          }
        }
      }
    }
    if (!legal) return inCheck ? -(MATE - ply) : 0;
    let sv = best; if (sv > MATET) sv += ply; else if (sv < -MATET) sv -= ply;
    this.k1[idx] = pos.h1; this.k2[idx] = pos.h2; this.tv[idx] = sv; this.tm[idx] = bm; this.td[idx] = depth;
    this.tf[idx] = best >= beta ? 1 : best <= a0 ? 2 : 0;
    return best;
  }
  hasPieces(pos) { const c8 = pos.side ? 8 : 0; for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } const p = pos.b[s]; if (p && (p & 8) === c8) { const t = p & 7; if (t !== P && t !== K) return true; } } return false; }
  // after a root move: decided or drawn position?
  childStatus(pos) {
    if (!pos.hasLegal()) return pos.inCheck() ? -(MATE - 1) : 0;
    if (pos.half >= 100 || pos.insufficient()) return 0;
    let c = 0; const lim = Math.max(0, this.repLen - 1 - pos.half);
    for (let i = this.repLen - 3; i >= lim; i -= 2) if (this.rep[i] === pos.h1) c++;
    if (c >= 2) return 0;
    return null;
  }
  // value of each root move (window [lo, hi] for the rest; returns kind 'exact' | 'ub')
  rootValues(pos, depth, moves, margin) {
    const out = []; let best = -INF;
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      pos.make(m); this.rep[this.repLen++] = pos.h1;
      let v, kind = 'exact';
      const st = this.childStatus(pos);
      if (st !== null) v = -st;
      else if (i === 0 || margin === undefined) v = -this.search(pos, depth - 1, -INF, INF, 1, true);
      else {
        const lo = Math.max(-INF + 1, best - margin);
        v = -this.search(pos, depth - 1, -(best + 1), -lo, 1, true);
        if (v > best && !this.aborted) v = -this.search(pos, depth - 1, -INF, -best, 1, true);
        else if (v <= lo) kind = 'ub';
      }
      this.repLen--; pos.unmake(m);
      if (this.aborted) return null;
      if (v > best) best = v;
      out.push({ m, v, kind });
    }
    return out;
  }
  best(pos, maxDepth, ms, maxNodes) {
    this.limit(ms, maxNodes);
    const moves = pos.legal();
    if (!moves.length) return { m: 0, v: 0, depth: 0 };
    if (moves.length === 1) return { m: moves[0], v: 0, depth: 0 };
    let bestM = moves[0], bestV = 0, done = 0;
    for (let d = 1; d <= maxDepth; d++) {
      const order = [bestM, ...moves.filter(m => m !== bestM)];
      let alpha = -INF, bm = bestM, bv = -INF;
      for (let i = 0; i < order.length; i++) {
        const m = order[i];
        pos.make(m); this.rep[this.repLen++] = pos.h1;
        let v; const st = this.childStatus(pos);
        if (st !== null) v = -st;
        else if (i === 0) v = -this.search(pos, d - 1, -INF, INF, 1, true);
        else {
          v = -this.search(pos, d - 1, -alpha - 1, -alpha, 1, true);
          if (v > alpha && !this.aborted) v = -this.search(pos, d - 1, -INF, -alpha, 1, true);
        }
        this.repLen--; pos.unmake(m);
        if (this.aborted) break;
        if (v > bv) { bv = v; bm = m; if (v > alpha) alpha = v; }
      }
      if (this.aborted) { if (bv > bestV + 30 && bm !== bestM && bv > -INF) { bestM = bm; bestV = bv; } break; }
      bestM = bm; bestV = bv; done = d;
      if (Math.abs(bv) > MATET && d >= 2 && (MATE - Math.abs(bv)) <= d) break;
      if (ms && Date.now() > this.deadline - ms * 0.55) break;
    }
    return { m: bestM, v: bestV, depth: done };
  }
  analyze(pos, ms, onDepth, margin) {
    this.limit(ms);
    const moves = pos.legal(); let last = null, depth = 0;
    for (let d = 1; d <= 64; d++) {
      if (last) moves.sort((a, b) => (last.get(b).v - last.get(a).v) || ((last.get(a).kind === 'ub') - (last.get(b).kind === 'ub')));
      const vals = this.rootValues(pos, d, moves, margin === undefined ? 150 : margin);
      if (!vals) break;
      last = new Map(vals.map(e => [e.m, e])); depth = d;
      if (onDepth) onDepth(vals, d);
      const top = Math.max(...vals.map(e => e.v));
      if (Math.abs(top) > MATET && MATE - Math.abs(top) < d) break;
      if (Date.now() > this.deadline - ms * 0.5) break;
    }
    return { list: last ? [...last.values()] : [], depth };
  }
  // full-width proof search: value of each root move at `plies` (only mates count)
  mateValues(pos, plies, maxNodes) {
    this.mate = true; this.limit(0, maxNodes || 5e6);
    const moves = pos.legal(), out = [];
    for (const m of moves) {
      pos.make(m); this.rep[this.repLen++] = pos.h1;
      let v; const st = this.childStatus(pos);
      v = st !== null ? -st : -this.search(pos, plies - 1, -INF, INF, 1, false);
      this.repLen--; pos.unmake(m);
      if (this.aborted) break;
      out.push({ m, v });
    }
    this.mate = false;
    return this.aborted ? null : out;
  }
}

// ---------------------------------------------------------------- opening book (common main lines, UCI)
const BOOK_LINES = [
  'e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f8e7 f1e1 b7b5 a4b3 d7d6 c2c3 e8g8',
  'e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6 d2d3 d7d6 e1g1 e8g8',
  'e2e4 e7e5 g1f3 b8c6 d2d4 e5d4 f3d4 g8f6 d4c6 b7c6 e4e5 d8e7',
  'e2e4 e7e5 g1f3 g8f6 f3e5 d7d6 e5f3 f6e4 d2d4 d6d5 f1d3',
  'e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6 c1e3 e7e5 d4b3',
  'e2e4 c7c5 g1f3 b8c6 d2d4 c5d4 f3d4 g8f6 b1c3 e7e5 d4b5 d7d6',
  'e2e4 c7c5 g1f3 e7e6 d2d4 c5d4 f3d4 b8c6 b1c3 d8c7',
  'e2e4 c7c5 b1c3 b8c6 g2g3 g7g6 f1g2 f8g7 d2d3 d7d6',
  'e2e4 e7e6 d2d4 d7d5 b1c3 g8f6 c1g5 f8e7 e4e5 f6d7 g5e7 d8e7',
  'e2e4 e7e6 d2d4 d7d5 e4e5 c7c5 c2c3 b8c6 g1f3 d8b6',
  'e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4 c8f5 e4g3 f5g6 h2h4 h7h6',
  'e2e4 d7d5 e4d5 d8d5 b1c3 d5a5 d2d4 g8f6 g1f3 c8f5',
  'e2e4 g7g6 d2d4 f8g7 b1c3 d7d6 g1f3 g8f6',
  'd2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7 e2e3 e8g8 g1f3 b8d7',
  'd2d4 d7d5 c2c4 c7c6 g1f3 g8f6 b1c3 d5c4 a2a4 c8f5 e2e3 e7e6',
  'd2d4 d7d5 c2c4 d5c4 g1f3 g8f6 e2e3 e7e6 f1c4 c7c5 e1g1 a7a6',
  'd2d4 g8f6 c2c4 e7e6 b1c3 f8b4 e2e3 e8g8 f1d3 d7d5 g1f3 c7c5',
  'd2d4 g8f6 c2c4 e7e6 g1f3 b7b6 g2g3 c8b7 f1g2 f8e7 e1g1 e8g8',
  'd2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 g1f3 e8g8 f1e2 e7e5 e1g1 b8c6',
  'd2d4 g8f6 c2c4 g7g6 b1c3 d7d5 c4d5 f6d5 e2e4 d5c3 b2c3 f8g7',
  'd2d4 g8f6 c2c4 c7c5 d4d5 e7e6 b1c3 e6d5 c4d5 d7d6',
  'd2d4 d7d5 g1f3 g8f6 c1f4 e7e6 e2e3 c7c5 c2c3 b8c6',
  'c2c4 e7e5 b1c3 g8f6 g1f3 b8c6 g2g3 d7d5 c4d5 f6d5',
  'c2c4 g8f6 b1c3 e7e6 e2e4 d7d5 e4e5',
  'g1f3 d7d5 g2g3 g8f6 f1g2 e7e6 e1g1 f8e7 d2d3 e8g8',
  'g1f3 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 d2d4 e8g8',
];
let BOOK = null;
function buildBook() {
  BOOK = new Map();
  for (const line of BOOK_LINES) {
    const pos = Pos.fromFEN(START); const seq = [];
    for (const u of line.split(' ')) {
      const m = pos.fromUci(u); if (!m) break;
      const key = seq.join(' '); if (!BOOK.has(key)) BOOK.set(key, new Set()); BOOK.get(key).add(u);
      pos.make(m); seq.push(u);
    }
  }
  return BOOK;
}
function bookMoves(uciSeq) { if (!BOOK) buildBook(); const s = BOOK.get(uciSeq.join(' ')); return s ? [...s] : []; }

// ---------------------------------------------------------------- levels
const LEVELS = {
  1: { d: 1, noise: 220, blunder: 0.25 },
  2: { d: 1, noise: 110, blunder: 0.1 },
  3: { d: 2, noise: 65 },
  4: { d: 3, noise: 38 },
  5: { d: 4, noise: 22, book: true },
  // wnodes / ms: limits for the WebAssembly engine; d / ms are also used by the JS fallback
  6: { d: 4, ms: 150, wnodes: 1500, book: true },
  7: { d: 64, ms: 300, wnodes: 8000, book: true },
  8: { d: 64, ms: 500, book: true },
  9: { d: 64, ms: 1500, book: true },
  10: { d: 64, ms: 4000, book: true },
};
function gauss(rand) { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

// ---------------------------------------------------------------- helpers for the page / worker
function replay(fen, moves) {
  const pos = Pos.fromFEN(fen || START), hashes = [pos.h1];
  for (const m of moves || []) { if (!pos.make(m)) throw new Error('illegal move in record'); hashes.push(pos.h1); }
  pos.sp = 0;
  return { pos, hashes };
}
let ENG = null, MENG = null;
const eng = () => ENG || (ENG = new Engine());
const meng = () => MENG || (MENG = new Engine(18));
const kindOf = v => Math.abs(v) > MATET ? 'mate' : 'cp';
function think(fen, moves, level, rand) {
  rand = rand || Math.random;
  const { pos, hashes } = replay(fen, moves);
  const L = LEVELS[level] || LEVELS[5];
  const all = pos.legal(); if (!all.length) return { move: 0 };
  if (L.book && !fen) {
    const bk = bookMoves(uciSeq(moves));
    if (bk.length) { const u = bk[Math.floor(rand() * bk.length)], m = pos.fromUci(u); if (m) return { move: m, book: true }; }
  }
  const E = eng(); E.setHistory(hashes);
  if (L.noise !== undefined) {
    E.limit(4000);
    let vals = null;
    for (let d = 1; d <= L.d; d++) { const v = E.rootValues(pos, d, vals ? vals.sort((a, b) => b.v - a.v).map(e => e.m) : all); if (!v) break; vals = v; }
    if (!vals) vals = all.map(m => ({ m, v: 0 }));
    if (L.blunder && rand() < L.blunder) return { move: vals[Math.floor(rand() * vals.length)].m };
    let best = null, bv = -Infinity;
    for (const e of vals) { const x = e.v + (Math.abs(e.v) > MATET ? 0 : gauss(rand) * L.noise); if (x > bv) { bv = x; best = e.m; } }
    return { move: best };
  }
  const r = E.best(pos, L.d, L.ms);
  return { move: r.m, v: r.v, depth: r.depth };
}
function uciSeq(moves) { const pos = Pos.fromFEN(START), out = []; for (const m of moves) { out.push(pos.uci(m)); pos.make(m); } return out; }
function analyze(fen, moves, ms, onProgress) {
  const { pos, hashes } = replay(fen, moves);
  const E = eng(); E.setHistory(hashes);
  const res = E.analyze(pos, ms, (vals, d) => onProgress && onProgress(vals.map(e => ({ m: e.m, v: e.v, kind: e.kind })), d));
  return { list: res.list.map(e => ({ m: e.m, v: e.v, kind: e.kind })), depth: res.depth };
}
// mate within n moves. attacker to move: need per move (0 = no forced mate within n);
// defender to move (defend): attacker moves still needed after each reply (0 = escapes)
function mate(fen, moves, n, defend, maxNodes) {
  const { pos, hashes } = replay(fen, moves);
  const E = meng(); E.setHistory(hashes); E.clear();
  const vals = E.mateValues(pos, defend ? 2 * n : 2 * n - 1, maxNodes);
  if (!vals) return null;
  return vals.map(({ m, v }) => ({ m, need: !defend ? (v > MATET ? (MATE - v + 1) >> 1 : 0) : (v < -MATET ? (MATE + v) >> 1 : 0) }));
}
function perft(pos, d) {
  if (d === 0) return 1;
  const buf = new Int32Array(256), n = pos.gen(buf, false); let c = 0;
  for (let i = 0; i < n; i++) { if (!pos.make(buf[i])) continue; c += d === 1 ? 1 : perft(pos, d - 1); pos.unmake(buf[i]); }
  return c;
}

const API = { P, N, B, R, Q, K, MATE, MATET, START, Pos, Engine, evaluate, replay, think, analyze, mate, perft, LEVELS, sqName, sqOf, mFrom, mTo, mPromo, mFlag, kindOf, uciSeq, bookMoves };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else if (typeof window !== 'undefined') window.ChessEngine = API;
else if (typeof self !== 'undefined' && typeof importScripts === 'function') {
  // WebAssembly search (engine.c) with the NNUE evaluation (nnue.bin.gz). Falls back to the JS engine if unavailable.
  const VER = self.location.search || '';
  let X = null;
  const wasmReady = (async () => {
    try {
      const r = await WebAssembly.instantiateStreaming(fetch(new URL('engine.wasm' + VER, self.location.href)), { env: { now: () => performance.now(), progress: () => {} } });
      const x = r.instance.exports; x.init(); x.new_game();
      const res = await fetch(new URL('nnue.bin.gz' + VER, self.location.href));
      if (!res.ok) throw new Error('nnue ' + res.status);
      let buf;
      if (typeof DecompressionStream === 'function') buf = new Uint8Array(await new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
      else throw new Error('no DecompressionStream');
      if (buf.length !== x.nn_size()) throw new Error('nnue size');
      new Uint8Array(x.memory.buffer).set(buf, x.nn_ptr()); x.nn_enable(1);
      X = x;
    } catch (err) { X = null; }
  })();
  const CMATE = 31000, CMATE_MAX = CMATE - 256;
  const toJS = v => v >= CMATE_MAX ? MATE - (CMATE - v) : v <= -CMATE_MAX ? -MATE + (CMATE + v) : v;
  function wSet(fen, moves) {
    const pos = Pos.fromFEN(fen || START), u = [];
    for (const m of moves || []) { u.push(pos.uci(m)); pos.make(m); }
    const s = (fen || START) + (u.length ? ' moves ' + u.join(' ') : '') + '\0';
    new Uint8Array(X.memory.buffer).set(new TextEncoder().encode(s), X.setup_ptr());
    X.set_position();
    return pos;
  }
  const wUci = m => { const a = new Uint8Array(X.memory.buffer), p = X.move_uci(m); let s = ''; for (let i = p; a[i]; i++) s += String.fromCharCode(a[i]); return s; };
  // values of all root moves, depth by depth, until the time runs out
  function wRootLoop(pos, ms, maxDepth, margin, onDepth, nodeLim) {
    const legal = X.legal_moves(), L = Array.from(new Int32Array(X.memory.buffer, X.legal_ptr(), legal));
    let order = L, last = null, depth = 0; const t0 = performance.now();
    X.ana_begin(ms, nodeLim || 0);
    for (let d = 1; d <= maxDepth; d++) {
      new Int32Array(X.memory.buffer, X.ana_moves(), order.length).set(order);
      const n = X.analyze_depth(order.length, d, margin);
      if (n < 0) break;
      const vals = new Int32Array(X.memory.buffer, X.ana_vals(), n), kinds = new Int32Array(X.memory.buffer, X.ana_kind(), n);
      last = order.map((cm, i) => ({ cm, v: toJS(vals[i]), kind: kinds[i] ? 'ub' : 'exact' })); depth = d;
      if (onDepth) onDepth(last, d);
      order = last.slice().sort((a, b) => (b.v - a.v) || ((a.kind === 'ub') - (b.kind === 'ub'))).map(e => e.cm);
      const top = Math.max(...last.map(e => e.v));
      if (Math.abs(top) > MATET && MATE - Math.abs(top) < d) break;
      if (performance.now() - t0 > ms * 0.5) break;
    }
    return { list: (last || []).map(e => ({ m: pos.fromUci(wUci(e.cm)), v: e.v, kind: e.kind })), depth };
  }
  function wThink(fen, moves, level, rand) {
    rand = rand || Math.random;
    const L = LEVELS[level] || LEVELS[5];
    const jpos = replay(fen, moves).pos;
    if (!jpos.legal().length) return { move: 0 };
    if (L.book && !fen) {
      const bk = bookMoves(uciSeq(moves));
      if (bk.length) { const u = bk[Math.floor(rand() * bk.length)], m = jpos.fromUci(u); if (m) return { move: m, book: true }; }
    }
    const pos = wSet(fen, moves);
    if (L.noise !== undefined) {
      const r = wRootLoop(pos, 4000, L.d, 0, null, L.nodes);
      const vals = r.list.length ? r.list : jpos.legal().map(m => ({ m, v: 0 }));
      if (L.blunder && rand() < L.blunder) return { move: vals[Math.floor(rand() * vals.length)].m };
      let best = null, bv = -Infinity;
      for (const e of vals) { const x = e.v + (Math.abs(e.v) > MATET ? 0 : gauss(rand) * L.noise); if (x > bv) { bv = x; best = e.m; } }
      return { move: best };
    }
    const cm = L.wnodes ? X.think(0, 0, 64, L.wnodes) : X.think(L.ms * 0.55, L.ms, 64, 0);
    const r = new Int32Array(X.memory.buffer, X.res_ptr(), 8);
    return { move: pos.fromUci(wUci(cm)), v: toJS(r[1]), depth: r[2], wasm: true };
  }
  self.onmessage = async e => {
    const m = e.data;
    try {
      if (m.type !== 'mate') await wasmReady;
      if (m.type === 'think') self.postMessage({ id: m.id, type: 'result', ...(X ? wThink(m.fen, m.moves, m.level) : think(m.fen, m.moves, m.level)) });
      else if (m.type === 'analyze') {
        const prog = (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth });
        let r;
        if (X) { const pos = wSet(m.fen, m.moves); r = wRootLoop(pos, m.time || 1000, 64, 150, (l, d) => prog(l.map(x => ({ m: pos.fromUci(wUci(x.cm)), v: x.v, kind: x.kind })), d)); }
        else r = analyze(m.fen, m.moves, m.time || 1000, prog);
        self.postMessage({ id: m.id, type: 'result', ...r });
      } else if (m.type === 'mate') self.postMessage({ id: m.id, type: 'result', list: mate(m.fen, m.moves, m.n, m.defend, m.maxNodes) });
    } catch (err) { self.postMessage({ id: m.id, type: 'result', error: String(err && err.stack || err) }); }
  };
}
})();
