'use strict';
// 5五将棋 (minishogi): rules + evaluation. The 5×5 board lives in the top-right corner of the 9×9 square numbering
// of engine.js (files 5–1, ranks 1–5: s = (rank − 1) * 9 + (9 − file)), so piece codes, move encoding, USI
// ("5e4d", "S*3c") and the page's notation helpers (sqFile / sqRank / mFrom / mTo …) work unchanged.
// Start: ▲ 玉5五 金4五 銀3五 角2五 飛1五 歩5四 / △ 飛5一 角4一 銀3一 金2一 玉1一 歩1二.
// Promotion zone: the farthest rank only. Drops, 二歩, 打ち歩詰め, 行き所のない駒, leaving the king in check: as in shogi.
(function (G) {
const FU = 1, GI = 4, KA = 5, HI = 6, KI = 7, OU = 8, WF = 16;
const colorOf = p => p >> 4, typeOf = p => p & 15;
const START = 'rbsgk/4p/5/P4/KGSBR b - 1';
const SQS = []; for (let r = 0; r < 5; r++) for (let c = 4; c < 9; c++) SQS.push(r * 9 + c);
const ON = new Uint8Array(81); SQS.forEach(s => { ON[s] = 1; });
const DR = [-1, -1, -1, 0, 0, 1, 1, 1], DC = [-1, 0, 1, -1, 1, -1, 0, 1];
const NB = new Int8Array(81 * 8).fill(-1);
for (const s of SQS) { const r = (s / 9) | 0, c = s % 9; for (let d = 0; d < 8; d++) { const rr = r + DR[d], cc = c + DC[d]; if (rr >= 0 && rr < 5 && cc >= 4 && cc < 9) NB[s * 8 + d] = rr * 9 + cc; } }
// step / slide directions per piece code (white pieces mirrored: direction d → 7 − d)
const STEP = new Uint8Array(32 * 8), SLIDE = new Uint8Array(32 * 8);
{
  const GOLD = [0, 1, 2, 3, 4, 6];
  const steps = { 1: [1], 4: [0, 1, 2, 5, 7], 7: GOLD, 9: GOLD, 12: GOLD, 8: [0, 1, 2, 3, 4, 5, 6, 7], 13: [1, 3, 4, 6], 14: [0, 2, 5, 7] };
  const slides = { 5: [0, 2, 5, 7], 13: [0, 2, 5, 7], 6: [1, 3, 4, 6], 14: [1, 3, 4, 6] };
  for (const col of [0, 1]) for (let t = 1; t <= 14; t++) {
    const code = t + (col ? WF : 0);
    for (const d of steps[t] || []) STEP[code * 8 + (col ? 7 - d : d)] = 1;
    for (const d of slides[t] || []) SLIDE[code * 8 + (col ? 7 - d : d)] = 1;
  }
}
const CANP = [0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0];
const inZone = (col, s) => ((s / 9) | 0) === (col ? 4 : 0);
const lastRank = inZone;
const HAND_TYPES = [HI, KA, KI, GI, FU];
// values (centipawn-like) for the evaluation and move ordering
const VAL = [0, 100, 0, 0, 470, 600, 700, 520, 0, 560, 0, 0, 540, 860, 960];
const HVAL = [0, 130, 0, 0, 520, 660, 780, 570];
// zobrist
let seed = 0x5a17c3d1;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; };
const ZL = new Int32Array(81 * 32), ZH = new Int32Array(81 * 32); for (let i = 0; i < ZL.length; i++) { ZL[i] = rnd(); ZH[i] = rnd(); }
const ZHL = new Int32Array(16 * 4), ZHH = new Int32Array(16 * 4); for (let i = 0; i < ZHL.length; i++) { ZHL[i] = rnd(); ZHH[i] = rnd(); }
const ZSL = rnd(), ZSH = rnd();
const N = 1400;

class MiniPos {
  constructor() {
    this.variant = 'mini';
    this.board = new Int8Array(81); this.hand = new Int8Array(16); this.side = 0; this.king = new Int8Array(2); this.ply = 0;
    this.hl = 0; this.hh = 0;
    this.stM = new Int32Array(N); this.stCap = new Int8Array(N); this.stHL = new Int32Array(N); this.stHH = new Int32Array(N); this.sp = 0;
    this.histL = new Int32Array(N); this.histH = new Int32Array(N); this.histChk = new Uint8Array(N); this.hn = 0;
  }
  setStart() { this.setSfen(START); }
  setSfen(sfen) {
    const parts = sfen.trim().split(/\s+/);
    this.board.fill(0); this.hand.fill(0);
    let r = 0, c = 0, prom = false;
    for (const ch of parts[0]) {
      if (ch === '/') { r++; c = 0; continue; }
      if (ch === '+') { prom = true; continue; }
      if (ch >= '1' && ch <= '9') { c += +ch; continue; }
      const up = ch.toUpperCase(); let t = 'PLNSBRGK'.indexOf(up) + 1; if (prom) t += 8; prom = false;
      if (r < 5 && c < 5) this.board[r * 9 + 4 + c] = t + (ch === up ? 0 : WF);
      c++;
    }
    this.side = parts[1] === 'w' ? 1 : 0;
    if (parts[2] && parts[2] !== '-') { let n = 0; for (const ch of parts[2]) { if (ch >= '0' && ch <= '9') { n = n * 10 + +ch; continue; } const up = ch.toUpperCase(), t = 'PLNSBRG'.indexOf(up) + 1; this.hand[(ch === up ? 0 : 8) + t] += n || 1; n = 0; } }
    this.ply = parts[3] ? +parts[3] - 1 : 0;
    this.king[0] = this.king[1] = -1;
    for (const s of SQS) { const p = this.board[s]; if (typeOf(p) === OU) this.king[colorOf(p)] = s; }
    this.computeHash(); this.sp = 0; this.hn = 0; this.pushHist();
  }
  sfen() {
    let s = '';
    for (let r = 0; r < 5; r++) {
      let e = 0;
      for (let c = 4; c < 9; c++) {
        const p = this.board[r * 9 + c]; if (!p) { e++; continue; }
        if (e) { s += e; e = 0; }
        const t = typeOf(p), ch = 'PLNSBRGK'[(t > 8 ? t - 8 : t) - 1];
        s += (t > 8 ? '+' : '') + (colorOf(p) ? ch.toLowerCase() : ch);
      }
      if (e) s += e; if (r < 4) s += '/';
    }
    let h = '';
    for (const col of [0, 1]) for (const t of HAND_TYPES) { const n = this.hand[col * 8 + t]; if (n) { const ch = 'PLNSBRG'[t - 1]; h += (n > 1 ? n : '') + (col ? ch.toLowerCase() : ch); } }
    return s + (this.side ? ' w ' : ' b ') + (h || '-') + ' ' + (this.ply + 1);
  }
  clone() { const p = new MiniPos(); p.setSfen(this.sfen()); return p; }
  computeHash() {
    let l = 0, h = 0;
    for (const s of SQS) { const p = this.board[s]; if (p) { l ^= ZL[s * 32 + p]; h ^= ZH[s * 32 + p]; } }
    for (let i = 0; i < 16; i++) { const n = this.hand[i]; if (n) { l ^= ZHL[i * 4 + n]; h ^= ZHH[i * 4 + n]; } }
    if (this.side) { l ^= ZSL; h ^= ZSH; }
    this.hl = l; this.hh = h;
  }
  pushHist() { this.histL[this.hn] = this.hl; this.histH[this.hn] = this.hh; this.histChk[this.hn] = this.inCheck() ? 1 : 0; this.hn++; }
  attacked(sq, by) {
    const b = this.board;
    for (let d = 0; d < 8; d++) {
      let t = NB[sq * 8 + d]; if (t < 0) continue;
      const p = b[t], back = 7 - d;
      if (p) { if (colorOf(p) === by && (STEP[p * 8 + back] || SLIDE[p * 8 + back])) return true; continue; }
      t = NB[t * 8 + d];
      while (t >= 0) { const q = b[t]; if (q) { if (colorOf(q) === by && SLIDE[q * 8 + back]) return true; break; } t = NB[t * 8 + d]; }
    }
    return false;
  }
  inCheck(c = this.side) { const k = this.king[c]; return k >= 0 && this.attacked(k, c ^ 1); }
  // pseudo-legal moves; qs: captures and promotions only
  gen(list, qs) {
    const b = this.board, us = this.side; let n = 0;
    for (const f of SQS) {
      const p = b[f]; if (!p || colorOf(p) !== us) continue;
      const t = typeOf(p), p8 = p * 8;
      for (let d = 0; d < 8; d++) {
        if (STEP[p8 + d]) { const to = NB[f * 8 + d]; if (to >= 0) n = this.add(list, n, f, to, t, us, qs); }
        if (SLIDE[p8 + d]) { let to = NB[f * 8 + d]; while (to >= 0) { n = this.add(list, n, f, to, t, us, qs); if (b[to]) break; to = NB[to * 8 + d]; } }
      }
    }
    if (qs) return n;
    for (const t of HAND_TYPES) {
      if (!this.hand[us * 8 + t]) continue;
      let files = 0;
      if (t === FU) for (const s of SQS) if (b[s] === FU + (us ? WF : 0)) files |= 1 << (s % 9);
      for (const s of SQS) {
        if (b[s]) continue;
        if (t === FU && (lastRank(us, s) || files & (1 << (s % 9)))) continue;
        list[n++] = (80 + t) | (s << 7);
      }
    }
    return n;
  }
  add(list, n, f, to, t, us, qs) {
    const q = this.board[to]; if (q && colorOf(q) === us) return n;
    const canP = CANP[t] && (inZone(us, f) || inZone(us, to));
    if (canP) list[n++] = f | (to << 7) | (1 << 14);
    if (t === FU && lastRank(us, to)) return n;       // a pawn on the last rank must promote
    if (!qs || q) list[n++] = f | (to << 7);
    return n;
  }
  doMove(m) {
    const f = m & 127, to = (m >> 7) & 127, pr = (m >> 14) & 1, us = this.side, b = this.board, sp = this.sp++;
    this.stM[sp] = m; this.stHL[sp] = this.hl; this.stHH[sp] = this.hh;
    let l = this.hl ^ ZSL, h = this.hh ^ ZSH;
    if (f > 80) {
      const t = f - 80, hi = us * 8 + t, n = this.hand[hi];
      l ^= ZHL[hi * 4 + n]; h ^= ZHH[hi * 4 + n]; if (n > 1) { l ^= ZHL[hi * 4 + n - 1]; h ^= ZHH[hi * 4 + n - 1]; }
      this.hand[hi] = n - 1;
      const p = t + (us ? WF : 0); b[to] = p; l ^= ZL[to * 32 + p]; h ^= ZH[to * 32 + p];
      this.stCap[sp] = 0;
    } else {
      const p = b[f], q = b[to];
      this.stCap[sp] = q;
      if (q) {
        l ^= ZL[to * 32 + q]; h ^= ZH[to * 32 + q];
        let t = typeOf(q); if (t > 8) t -= 8;
        if (t === OU) this.king[us ^ 1] = -1;
        else { const hi = us * 8 + t, n = this.hand[hi]; if (n) { l ^= ZHL[hi * 4 + n]; h ^= ZHH[hi * 4 + n]; } this.hand[hi] = n + 1; l ^= ZHL[hi * 4 + n + 1]; h ^= ZHH[hi * 4 + n + 1]; }
      }
      const np = pr ? p + 8 : p;
      b[f] = 0; b[to] = np; l ^= ZL[f * 32 + p] ^ ZL[to * 32 + np]; h ^= ZH[f * 32 + p] ^ ZH[to * 32 + np];
      if (typeOf(p) === OU) this.king[us] = to;
    }
    this.side = us ^ 1; this.ply++; this.hl = l; this.hh = h;
    this.histL[this.hn] = l; this.histH[this.hn] = h; this.histChk[this.hn] = 0; this.hn++;
  }
  undoMove() {
    const sp = --this.sp, m = this.stM[sp], f = m & 127, to = (m >> 7) & 127, pr = (m >> 14) & 1, b = this.board;
    this.side ^= 1; this.ply--; this.hn--;
    const us = this.side;
    if (f > 80) { const t = f - 80; b[to] = 0; this.hand[us * 8 + t]++; }
    else {
      const np = b[to], p = pr ? np - 8 : np, q = this.stCap[sp];
      b[f] = p; b[to] = q;
      if (typeOf(p) === OU) this.king[us] = f;
      if (q) { let t = typeOf(q); if (t > 8) t -= 8; if (t === OU) this.king[us ^ 1] = to; else this.hand[us * 8 + t]--; }
    }
    this.hl = this.stHL[sp]; this.hh = this.stHH[sp];
  }
  // after doMove(m): was m illegal? (own king left in check, or a pawn drop that mates)
  illegal(m) {
    const mover = this.side ^ 1, k = this.king[mover];
    if (k >= 0 && this.attacked(k, this.side)) return true;
    if ((m & 127) === 80 + FU && this.inCheck() && !this.hasLegal()) return true;
    return false;
  }
  hasLegal() {
    const buf = this.hbuf || (this.hbuf = new Int32Array(700)), n = this.gen(buf, false);
    for (let i = 0; i < n; i++) { const m = buf[i]; this.doMove(m); const k = this.king[this.side ^ 1]; const ok = !(k >= 0 && this.attacked(k, this.side)) && !((m & 127) === 80 + FU && this.inCheck() && !this.hasLegal()); this.undoMove(); if (ok) return true; }
    return false;
  }
  legalMoves() {
    const buf = new Int32Array(700), n = this.gen(buf, false), out = [];
    for (let i = 0; i < n; i++) { const m = buf[i]; this.doMove(m); const bad = this.illegal(m); this.undoMove(); if (!bad) out.push(m); }
    return out;
  }
  isLegal(m) { return this.legalMoves().includes(m); }
  canDeclare() { return false; }
  result() { return null; }
  // repetition inside the search: 千日手 is a loss for sente (a perpetual check: for the checking side)
  repScore() { if (this.inCheck()) return 600; return this.side === 0 ? -600 : 600; }
  order(m) {
    const to = (m >> 7) & 127, f = m & 127, q = this.board[to];
    let v = q ? VAL[typeOf(q)] * 4 - (f > 80 ? 0 : VAL[typeOf(this.board[f])] >> 3) + 50 : 0;
    if ((m >> 14) & 1) v += 120;
    return v > 0 ? (v >> 4) + 1 : 0;
  }
  evaluate() {
    const b = this.board, us = this.side; let s = 0;
    for (const sq of SQS) {
      const p = b[sq]; if (!p) continue;
      const c = colorOf(p), t = typeOf(p), r = (sq / 9) | 0, adv = c ? r : 4 - r;
      let v = VAL[t];
      if (t === FU || t === GI) v += adv * 8;
      s += c === us ? v : -v;
    }
    for (const t of HAND_TYPES) s += (this.hand[us * 8 + t] - this.hand[(us ^ 1) * 8 + t]) * HVAL[t];
    // king safety: enemy control around each king, own guards next to it
    for (const c of [0, 1]) {
      const k = this.king[c]; if (k < 0) continue;
      let v = 0;
      for (let d = 0; d < 8; d++) { const x = NB[k * 8 + d]; if (x < 0) { v += 6; continue; } const q = b[x]; if (q && colorOf(q) === c) v += 14; if (this.attacked(x, c ^ 1)) v -= 22; }
      s += c === us ? v : -v;
    }
    return s + 15;   // side to move
  }
  toUsi(m) {
    const f = m & 127, t = (m >> 7) & 127, sq = s => (9 - (s % 9)) + 'abcdefghi'[(s / 9) | 0];
    if (f > 80) return 'PLNSBRG'[f - 81] + '*' + sq(t);
    return sq(f) + sq(t) + ((m >> 14) & 1 ? '+' : '');
  }
  fromUsi(u) {
    const sq = (a, b) => ('abcdefghi'.indexOf(b)) * 9 + (9 - +a);
    if (u[1] === '*') return (80 + 'PLNSBRG'.indexOf(u[0]) + 1) | (sq(u[2], u[3]) << 7);
    return sq(u[0], u[1]) | (sq(u[2], u[3]) << 7) | (u[4] === '+' ? 1 << 14 : 0);
  }
}
MiniPos.START = START; MiniPos.inZone = inZone; MiniPos.SQS = SQS; MiniPos.ON = ON;
G.MiniShogi = MiniPos;
})(typeof self !== 'undefined' ? self : this);
