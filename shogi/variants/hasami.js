'use strict';
// はさみ将棋 (hasami shogi): rules + evaluation, on the 9×9 square numbering of engine.js.
// ▲ nine 歩 on rank 9, △ nine と on rank 1; every piece moves like a rook (any number of empty squares
// up / down / left / right, no jumping). A move that closes an enemy piece — or an unbroken line of them — between
// the moved piece and another own piece (vertically or horizontally) captures it; an enemy piece in a corner is
// captured by occupying the two squares next to it. Moving in between two enemy pieces is safe.
// Win: be 5 captures ahead (取った枚数の差が5枚), or the opponent has no move. 千日手 (4×) is a draw; at 300 moves the
// player with more captures wins (equal: draw).
(function (G) {
const FU = 1, TO = 9, WF = 16, BP = FU, WP = TO + WF;
const colorOf = p => p >> 4;
const START = '+p+p+p+p+p+p+p+p+p/9/9/9/9/9/9/9/PPPPPPPPP b - 1';
const WIN_DIFF = 5, MAX_PLY = 300;
const D4 = [-9, 9, -1, 1];
const NB4 = new Int8Array(81 * 4).fill(-1);
for (let s = 0; s < 81; s++) { const r = (s / 9) | 0, c = s % 9; if (r > 0) NB4[s * 4] = s - 9; if (r < 8) NB4[s * 4 + 1] = s + 9; if (c > 0) NB4[s * 4 + 2] = s - 1; if (c < 8) NB4[s * 4 + 3] = s + 1; }
const CORNERS = [[0, 1, 9], [8, 7, 17], [72, 63, 73], [80, 71, 79]];   // corner, its two neighbours
let seed = 0x2c9b1e47;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; };
const ZL = new Int32Array(81 * 2), ZH = new Int32Array(81 * 2); for (let i = 0; i < ZL.length; i++) { ZL[i] = rnd(); ZH[i] = rnd(); }
const ZCL = new Int32Array(2 * 10), ZCH = new Int32Array(2 * 10); for (let i = 0; i < ZCL.length; i++) { ZCL[i] = rnd(); ZCH[i] = rnd(); }
const ZSL = rnd(), ZSH = rnd();
const N = 1400;
const ci = p => (p === BP ? 0 : 1);

class HasamiPos {
  constructor() {
    this.variant = 'hasami';
    this.board = new Int8Array(81); this.hand = new Int8Array(16); this.side = 0; this.king = new Int8Array([-1, -1]); this.ply = 0;
    this.hl = 0; this.hh = 0;
    this.stM = new Int32Array(N); this.stHL = new Int32Array(N); this.stHH = new Int32Array(N); this.stCapN = new Uint8Array(N); this.stCapSq = new Int8Array(N * 10); this.sp = 0;
    this.histL = new Int32Array(N); this.histH = new Int32Array(N); this.histChk = new Uint8Array(N); this.hn = 0;
    this.capBuf = new Int8Array(16);
  }
  get caps() { return [this.hand[FU], this.hand[8 + FU]]; }   // pieces captured by ▲ / △ (shown in their piece stands)
  setStart() { this.setSfen(START); }
  setSfen(sfen) {
    const parts = sfen.trim().split(/\s+/);
    this.board.fill(0); this.hand.fill(0);
    let r = 0, c = 0;
    for (const ch of parts[0]) {
      if (ch === '/') { r++; c = 0; continue; }
      if (ch === '+') continue;
      if (ch >= '1' && ch <= '9') { c += +ch; continue; }
      if (r < 9 && c < 9) this.board[r * 9 + c] = ch === ch.toUpperCase() ? BP : WP;
      c++;
    }
    this.side = parts[1] === 'w' ? 1 : 0;
    if (parts[2] && parts[2] !== '-') { let n = 0; for (const ch of parts[2]) { if (ch >= '0' && ch <= '9') { n = n * 10 + +ch; continue; } this.hand[(ch === ch.toUpperCase() ? 0 : 8) + FU] += n || 1; n = 0; } }
    this.ply = parts[3] ? +parts[3] - 1 : 0;
    this.computeHash(); this.sp = 0; this.hn = 0; this.pushHist();
  }
  sfen() {
    let s = '';
    for (let r = 0; r < 9; r++) {
      let e = 0;
      for (let c = 0; c < 9; c++) { const p = this.board[r * 9 + c]; if (!p) { e++; continue; } if (e) { s += e; e = 0; } s += p === BP ? 'P' : '+p'; }
      if (e) s += e; if (r < 8) s += '/';
    }
    const a = this.hand[FU], b = this.hand[8 + FU];
    const h = (a ? (a > 1 ? a : '') + 'P' : '') + (b ? (b > 1 ? b : '') + 'p' : '');
    return s + (this.side ? ' w ' : ' b ') + (h || '-') + ' ' + (this.ply + 1);
  }
  clone() { const p = new HasamiPos(); p.setSfen(this.sfen()); return p; }
  computeHash() {
    let l = 0, h = 0;
    for (let s = 0; s < 81; s++) { const p = this.board[s]; if (p) { l ^= ZL[s * 2 + ci(p)]; h ^= ZH[s * 2 + ci(p)]; } }
    for (let c = 0; c < 2; c++) { const n = this.hand[c * 8 + FU]; l ^= ZCL[c * 10 + n]; h ^= ZCH[c * 10 + n]; }
    if (this.side) { l ^= ZSL; h ^= ZSH; }
    this.hl = l; this.hh = h;
  }
  pushHist() { this.histL[this.hn] = this.hl; this.histH[this.hn] = this.hh; this.histChk[this.hn] = 0; this.hn++; }
  inCheck() { return false; }
  pieceCount(c) { let n = 0; const p = c ? WP : BP; for (let s = 0; s < 81; s++) if (this.board[s] === p) n++; return n; }
  gen(list, qs) {
    const b = this.board, me = this.side ? WP : BP; let n = 0;
    for (let f = 0; f < 81; f++) {
      if (b[f] !== me) continue;
      for (let d = 0; d < 4; d++) {
        let to = NB4[f * 4 + d];
        while (to >= 0 && !b[to]) { if (!qs || this.capCount(f, to) > 0) list[n++] = f | (to << 7); to = NB4[to * 4 + d]; }
      }
    }
    return n;
  }
  // pieces the move f → to would capture (without making it); fills capBuf
  capCount(f, to) {
    const b = this.board, me = this.side ? WP : BP, op = this.side ? BP : WP, buf = this.capBuf; let n = 0;
    for (let d = 0; d < 4; d++) {
      let x = NB4[to * 4 + d], k = 0;
      while (x >= 0 && b[x] === op) { k++; x = NB4[x * 4 + d]; }
      if (k && x >= 0 && x !== f && b[x] === me) { let y = NB4[to * 4 + d]; for (let i = 0; i < k; i++) { buf[n++] = y; y = NB4[y * 4 + d]; } }
    }
    for (const [cs, a, c] of CORNERS) {
      if (b[cs] !== op || (to !== a && to !== c)) continue;
      const other = to === a ? c : a;
      if (b[other] === me && other !== f && !buf.subarray(0, n).includes(cs)) buf[n++] = cs;
    }
    return n;
  }
  doMove(m) {
    const f = m & 127, to = (m >> 7) & 127, us = this.side, b = this.board, sp = this.sp++, me = b[f];
    this.stM[sp] = m; this.stHL[sp] = this.hl; this.stHH[sp] = this.hh;
    const n = this.capCount(f, to);
    let l = this.hl ^ ZSL, h = this.hh ^ ZSH;
    const cm = ci(me);
    b[f] = 0; b[to] = me; l ^= ZL[f * 2 + cm] ^ ZL[to * 2 + cm]; h ^= ZH[f * 2 + cm] ^ ZH[to * 2 + cm];
    for (let i = 0; i < n; i++) { const s = this.capBuf[i]; this.stCapSq[sp * 10 + i] = s; b[s] = 0; l ^= ZL[s * 2 + (cm ^ 1)]; h ^= ZH[s * 2 + (cm ^ 1)]; }
    this.stCapN[sp] = n;
    if (n) { const hi = us * 8 + FU, c0 = this.hand[hi]; l ^= ZCL[us * 10 + c0] ^ ZCL[us * 10 + c0 + n]; h ^= ZCH[us * 10 + c0] ^ ZCH[us * 10 + c0 + n]; this.hand[hi] = c0 + n; }
    this.side = us ^ 1; this.ply++; this.hl = l; this.hh = h;
    this.histL[this.hn] = l; this.histH[this.hn] = h; this.histChk[this.hn] = 0; this.hn++;
  }
  undoMove() {
    const sp = --this.sp, m = this.stM[sp], f = m & 127, to = (m >> 7) & 127, b = this.board;
    this.side ^= 1; this.ply--; this.hn--;
    const us = this.side, me = us ? WP : BP, op = us ? BP : WP, n = this.stCapN[sp];
    b[to] = 0; b[f] = me;
    for (let i = 0; i < n; i++) b[this.stCapSq[sp * 10 + i]] = op;
    this.hand[us * 8 + FU] -= n;
    this.hl = this.stHL[sp]; this.hh = this.stHH[sp];
  }
  illegal() { return false; }
  legalMoves() { const buf = new Int32Array(700), n = this.gen(buf, false); return Array.from(buf.subarray(0, n)); }
  isLegal(m) { return this.legalMoves().includes(m); }
  canDeclare() { return false; }
  // after a move: the mover is 5 captures ahead → the side to move has lost
  result(ply) {
    const us = this.side, d = this.hand[(us ^ 1) * 8 + FU] - this.hand[us * 8 + FU];
    if (d >= WIN_DIFF) return -30000 + ply;
    return null;
  }
  repScore() { return 0; }
  order(m) { const n = this.capCount(m & 127, (m >> 7) & 127); return n ? n * 10 : 0; }
  // evaluation: captures, pieces that could be captured next move, a little mobility / spread
  evaluate() {
    const b = this.board, us = this.side;
    const cap = this.hand[us * 8 + FU] - this.hand[(us ^ 1) * 8 + FU];
    let s = cap * 1000 / 10;
    let threatUs = 0, threatThem = 0;
    // a piece with an enemy on one side and an empty square on the other, where an enemy can arrive in one move
    for (let x = 0; x < 81; x++) {
      const p = b[x]; if (!p) continue;
      const c = colorOf(p), op = c ? BP : WP;
      for (let ax = 0; ax < 2; ax++) {
        const a = NB4[x * 4 + ax * 2], z = NB4[x * 4 + ax * 2 + 1];
        if (a < 0 || z < 0) continue;
        let e = -1;
        if (b[a] === op && !b[z]) e = z; else if (b[z] === op && !b[a]) e = a;
        if (e < 0) continue;
        if (this.reach(e, op, x)) { if (c === us) threatUs++; else threatThem++; }
      }
    }
    // the side to move takes the best threat at once; the other side's threats are less certain
    s += threatThem ? 60 + Math.min(3, threatThem - 1) * 10 : 0;
    s -= threatUs * 35;
    return s;
  }
  // can a piece `pc` reach the empty square e in one move (not counting the piece standing on `skip`)?
  reach(e, pc, skip) {
    const b = this.board;
    for (let d = 0; d < 4; d++) { let y = NB4[e * 4 + d]; while (y >= 0 && !b[y]) y = NB4[y * 4 + d]; if (y >= 0 && y !== skip && b[y] === pc) return true; }
    return false;
  }
  toUsi(m) { const f = m & 127, t = (m >> 7) & 127, sq = s => (9 - (s % 9)) + 'abcdefghi'[(s / 9) | 0]; return sq(f) + sq(t); }
  fromUsi(u) { const sq = (a, b) => 'abcdefghi'.indexOf(b) * 9 + (9 - +a); return sq(u[0], u[1]) | (sq(u[2], u[3]) << 7); }
}
HasamiPos.START = START; HasamiPos.WIN_DIFF = WIN_DIFF; HasamiPos.MAX_PLY = MAX_PLY;
G.HasamiShogi = HasamiPos;
})(typeof self !== 'undefined' ? self : this);
