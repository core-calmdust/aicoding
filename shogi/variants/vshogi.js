'use strict';
// Generic small/odd-board shogi rules for the variants (平安将棋 8×8 / 9×8 / 9×9, 二玉将棋, ジャドケンス将棋 6×6,
// ゴロゴロ将棋 5×6, マイクロ将棋 4×5). Same conventions as mini.js: the W×H board sits in the top-right corner of the
// 9×9 square numbering of engine.js (files W–1, ranks 1–H: s = (rank − 1) * 9 + (9 − file)), piece codes / move
// encoding / USI are engine.js's, so the page's notation and board code work unchanged. Rules per variant: CFG below
// (sources: shogitter.com rule pages, cross-checked with the published rules of each game).
(function (G) {
const FU = 1, KY = 2, KE = 3, GI = 4, KA = 5, HI = 6, KI = 7, OU = 8, TO = 9, WF = 16;
const colorOf = p => p >> 4, typeOf = p => p & 15;
// variant → rules
//  zone: promotion zone depth (0: promotion only by capturing — micro); drops: captured pieces go to the hand;
//  nifu / uchifu: 二歩 / 打ち歩詰め forbidden; kk: a bare king against a bare king is a draw; flip: micro's
//  reversible promotion (a piece that captures turns over, both ways; hand pieces may be dropped either face up);
//  rep: what a 4-fold repetition is ('draw' or 'sente' = sente loses, as in 5五将棋)
const CFG = {
  heian8: { W: 8, H: 8, start: 'lnsgksnl/8/pppppppp/8/8/PPPPPPPP/8/LNSKGSNL b - 1', zone: 3, drops: false, kk: true, rep: 'draw', big: true },
  heian98: { W: 9, H: 8, start: 'lnsgkgsnl/9/ppppppppp/9/9/PPPPPPPPP/9/LNSGKGSNL b - 1', zone: 3, drops: false, kk: true, rep: 'draw', big: true },
  heian9: { W: 9, H: 9, start: 'lnsgkgsnl/9/ppppppppp/9/9/9/PPPPPPPPP/9/LNSGKGSNL b - 1', zone: 3, drops: false, kk: true, rep: 'draw', big: true },
  nigyoku: { W: 9, H: 9, start: 'lnskgksnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSKGKSNL b - 1', zone: 3, drops: true, nifu: true, uchifu: true, rep: 'draw', big: true },
  judkins: { W: 6, H: 6, start: 'rbnsgk/5p/6/6/P5/KGSNBR b - 1', zone: 2, drops: true, nifu: true, uchifu: true, rep: 'draw' },
  goro: { W: 5, H: 6, start: 'sgkgs/5/1ppp1/1PPP1/5/SGKGS b - 1', zone: 2, drops: true, nifu: true, uchifu: true, rep: 'draw' },
  micro: { W: 4, H: 5, start: 'kbgs/p3/4/3P/SGBK b - 1', zone: 0, drops: true, flip: true, nifu: false, uchifu: false, rep: 'draw' },
};
const DR = [-1, -1, -1, 0, 0, 1, 1, 1], DC = [-1, 0, 1, -1, 1, -1, 0, 1];
// step / slide directions per piece code (white pieces mirrored: direction d → 7 − d)
const STEP = new Uint8Array(32 * 8), SLIDE = new Uint8Array(32 * 8), KNIGHT = new Uint8Array(32);
{
  const GOLD = [0, 1, 2, 3, 4, 6];
  const steps = { 1: [1], 4: [0, 1, 2, 5, 7], 7: GOLD, 9: GOLD, 10: GOLD, 11: GOLD, 12: GOLD, 8: [0, 1, 2, 3, 4, 5, 6, 7], 13: [1, 3, 4, 6], 14: [0, 2, 5, 7] };
  const slides = { 2: [1], 5: [0, 2, 5, 7], 13: [0, 2, 5, 7], 6: [1, 3, 4, 6], 14: [1, 3, 4, 6] };
  for (const col of [0, 1]) for (let t = 1; t <= 14; t++) {
    const code = t + (col ? WF : 0);
    for (const d of steps[t] || []) STEP[code * 8 + (col ? 7 - d : d)] = 1;
    for (const d of slides[t] || []) SLIDE[code * 8 + (col ? 7 - d : d)] = 1;
    if (t === KE) KNIGHT[code] = 1;
  }
}
// promotion: the piece code after promoting (standard: +8); micro: the reverse face (歩⇄桂, 銀⇄香, 金⇄飛, 角⇄と)
const PROM_STD = new Int8Array(32), PROM_FLIP = new Int8Array(32), BASE_STD = new Int8Array(16), BASE_FLIP = new Int8Array(16);
{
  const F = { 1: 3, 3: 1, 4: 2, 2: 4, 7: 6, 6: 7, 5: 9, 9: 5 };
  for (const col of [0, 1]) for (let t = 1; t <= 14; t++) {
    const c = t + (col ? WF : 0);
    if (t <= 6 && t !== OU) PROM_STD[c] = c + 8;
    if (F[t]) PROM_FLIP[c] = F[t] + (col ? WF : 0);
  }
  for (let t = 1; t <= 14; t++) BASE_STD[t] = t > 8 ? t - 8 : t;
  const B = { 1: 1, 3: 1, 4: 4, 2: 4, 7: 7, 6: 7, 5: 5, 9: 5 };
  for (let t = 1; t <= 14; t++) BASE_FLIP[t] = B[t] || t;
}
const FACES_FLIP = { 1: [FU, KE], 4: [GI, KY], 7: [KI, HI], 5: [KA, TO] };
const SFEN_CH = 'PLNSBRGK';
// values for the evaluation and move ordering (per piece type; hand values per hand type)
const VAL_STD = [0, 100, 300, 350, 470, 640, 760, 520, 0, 540, 520, 520, 520, 880, 1000];
const VAL_HEIAN = [0, 100, 270, 300, 440, 0, 0, 500, 0, 500, 490, 490, 490, 0, 0];
const VAL_MICRO = [0, 100, 330, 260, 450, 600, 800, 520, 0, 520, 0, 0, 0, 0, 0];
const HVAL_STD = [0, 125, 330, 380, 520, 700, 840, 580];
const HVAL_MICRO = [0, 280, 0, 0, 500, 650, 0, 850];
let seed = 0x2c9e51b7;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; };
const ZL = new Int32Array(81 * 32), ZH = new Int32Array(81 * 32); for (let i = 0; i < ZL.length; i++) { ZL[i] = rnd(); ZH[i] = rnd(); }
const HN = 40, ZHL = new Int32Array(16 * HN), ZHH = new Int32Array(16 * HN); for (let i = 0; i < ZHL.length; i++) { ZHL[i] = rnd(); ZHH[i] = rnd(); }
const ZSL = rnd(), ZSH = rnd();
const N = 1400, BUF = 1200;
const GEO = {};
function geo(W, H) {
  const k = W + 'x' + H; if (GEO[k]) return GEO[k];
  const c0 = 9 - W, SQS = [], ON = new Uint8Array(81);
  for (let r = 0; r < H; r++) for (let c = c0; c < 9; c++) { SQS.push(r * 9 + c); ON[r * 9 + c] = 1; }
  const NB = new Int8Array(81 * 8).fill(-1);
  for (const s of SQS) { const r = (s / 9) | 0, c = s % 9; for (let d = 0; d < 8; d++) { const rr = r + DR[d], cc = c + DC[d]; if (rr >= 0 && rr < H && cc >= c0 && cc < 9) NB[s * 8 + d] = rr * 9 + cc; } }
  // knight targets per colour (KN) and the squares a knight of colour `by` attacks `sq` from (KNA)
  const KN = [], KNA = [];
  for (const col of [0, 1]) { KN.push([]); KNA.push([]); for (let s = 0; s < 81; s++) { KN[col].push([]); KNA[col].push([]); } }
  for (const col of [0, 1]) for (const s of SQS) {
    const r = (s / 9) | 0, c = s % 9, rr = r + (col ? 2 : -2);
    for (const cc of [c - 1, c + 1]) if (rr >= 0 && rr < H && cc >= c0 && cc < 9) { KN[col][s].push(rr * 9 + cc); KNA[col][rr * 9 + cc].push(s); }
  }
  return (GEO[k] = { W, H, c0, SQS, ON, NB, KN, KNA });
}

class VShogi {
  constructor(v) {
    const c = CFG[v]; if (!c) throw new Error('unknown variant ' + v);
    this.variant = v; this.cfg = c; this.g = geo(c.W, c.H); this.W = c.W; this.H = c.H;
    this.PROM = c.flip ? PROM_FLIP : PROM_STD; this.BASE = c.flip ? BASE_FLIP : BASE_STD;
    this.VAL = c.flip ? VAL_MICRO : c.kk ? VAL_HEIAN : VAL_STD; this.HVAL = c.flip ? HVAL_MICRO : HVAL_STD;
    this.board = new Int8Array(81); this.hand = new Int8Array(16); this.side = 0; this.king = new Int8Array(2); this.kings = new Int8Array(4); this.ply = 0; this.cnt = 0;
    this.hl = 0; this.hh = 0;
    this.stM = new Int32Array(N); this.stCap = new Int8Array(N); this.stP = new Int8Array(N); this.stHL = new Int32Array(N); this.stHH = new Int32Array(N); this.sp = 0;
    this.histL = new Int32Array(N); this.histH = new Int32Array(N); this.histChk = new Uint8Array(N); this.hn = 0;
  }
  setStart() { this.setSfen(this.cfg.start); }
  inZone(col, s) { const z = this.cfg.zone; if (!z) return false; const r = (s / 9) | 0; return col ? r >= this.H - z : r < z; }
  // a piece of type t on s (colour col) could never move again
  dead(col, t, s) {
    const r = (s / 9) | 0, rr = col ? this.H - 1 - r : r;
    return ((t === FU || t === KY) && rr === 0) || (t === KE && rr <= 1);
  }
  setSfen(sfen) {
    const parts = sfen.trim().split(/\s+/), c0 = this.g.c0;
    this.board.fill(0); this.hand.fill(0);
    let r = 0, c = 0, prom = false;
    for (const ch of parts[0]) {
      if (ch === '/') { r++; c = 0; continue; }
      if (ch === '+') { prom = true; continue; }
      if (ch >= '1' && ch <= '9') { c += +ch; continue; }
      const up = ch.toUpperCase(); let t = SFEN_CH.indexOf(up) + 1; if (prom) t += 8; prom = false;
      if (r < this.H && c < this.W && t > 0) this.board[r * 9 + c0 + c] = t + (ch === up ? 0 : WF);
      c++;
    }
    this.side = parts[1] === 'w' ? 1 : 0;
    if (parts[2] && parts[2] !== '-') { let n = 0; for (const ch of parts[2]) { if (ch >= '0' && ch <= '9') { n = n * 10 + +ch; continue; } const up = ch.toUpperCase(), t = 'PLNSBRG'.indexOf(up) + 1; if (t > 0) this.hand[(ch === up ? 0 : 8) + this.BASE[t]] += n || 1; n = 0; } }
    this.ply = parts[3] ? +parts[3] - 1 : 0;
    this.findKings();
    this.cnt = 0; for (const s of this.g.SQS) if (this.board[s]) this.cnt++;
    this.computeHash(); this.sp = 0; this.hn = 0; this.pushHist();
  }
  findKings() {
    this.kings.fill(-1);
    for (const s of this.g.SQS) { const p = this.board[s]; if (typeOf(p) === OU) { const c = colorOf(p); if (this.kings[c * 2] < 0) this.kings[c * 2] = s; else this.kings[c * 2 + 1] = s; } }
    this.king[0] = this.kings[0]; this.king[1] = this.kings[2];
  }
  sfen() {
    let s = '';
    for (let r = 0; r < this.H; r++) {
      let e = 0;
      for (let c = this.g.c0; c < 9; c++) {
        const p = this.board[r * 9 + c]; if (!p) { e++; continue; }
        if (e) { s += e; e = 0; }
        const t = typeOf(p), ch = SFEN_CH[(t > 8 ? t - 8 : t) - 1];
        s += (t > 8 ? '+' : '') + (colorOf(p) ? ch.toLowerCase() : ch);
      }
      if (e) s += e; if (r < this.H - 1) s += '/';
    }
    let h = '';
    for (const col of [0, 1]) for (const t of [HI, KA, KI, GI, KE, KY, FU]) { const n = this.hand[col * 8 + t]; if (n) { const ch = 'PLNSBRG'[t - 1]; h += (n > 1 ? n : '') + (col ? ch.toLowerCase() : ch); } }
    return s + (this.side ? ' w ' : ' b ') + (h || '-') + ' ' + (this.ply + 1);
  }
  clone() { const p = new VShogi(this.variant); p.setSfen(this.sfen()); return p; }
  computeHash() {
    let l = 0, h = 0;
    for (const s of this.g.SQS) { const p = this.board[s]; if (p) { l ^= ZL[s * 32 + p]; h ^= ZH[s * 32 + p]; } }
    for (let i = 0; i < 16; i++) { const n = Math.min(HN - 1, this.hand[i]); if (n) { l ^= ZHL[i * HN + n]; h ^= ZHH[i * HN + n]; } }
    if (this.side) { l ^= ZSL; h ^= ZSH; }
    this.hl = l; this.hh = h;
  }
  pushHist() { this.histL[this.hn] = this.hl; this.histH[this.hn] = this.hh; this.histChk[this.hn] = this.inCheck() ? 1 : 0; this.hn++; }
  attacked(sq, by) {
    const b = this.board, NB = this.g.NB;
    for (let d = 0; d < 8; d++) {
      let t = NB[sq * 8 + d]; if (t < 0) continue;
      const p = b[t], back = 7 - d;
      if (p) { if (colorOf(p) === by && (STEP[p * 8 + back] || SLIDE[p * 8 + back])) return true; continue; }
      t = NB[t * 8 + d];
      while (t >= 0) { const q = b[t]; if (q) { if (colorOf(q) === by && SLIDE[q * 8 + back]) return true; break; } t = NB[t * 8 + d]; }
    }
    const ka = this.g.KNA[by][sq], kc = KE + (by ? WF : 0);
    for (let i = 0; i < ka.length; i++) if (b[ka[i]] === kc) return true;
    return false;
  }
  // in check: any of the side's kings is attacked (二玉将棋: both kings are royal)
  inCheck(c = this.side) {
    const k = this.kings, a = k[c * 2], b2 = k[c * 2 + 1];
    return (a >= 0 && this.attacked(a, c ^ 1)) || (b2 >= 0 && this.attacked(b2, c ^ 1));
  }
  // the attacked king of the side to move (for the board's check highlight)
  checkSq() { const c = this.side, k = this.kings; for (const s of [k[c * 2], k[c * 2 + 1]]) if (s >= 0 && this.attacked(s, c ^ 1)) return s; return -1; }
  // pseudo-legal moves; qs: captures and promotions only
  gen(list, qs) {
    const b = this.board, us = this.side, NB = this.g.NB, SQS = this.g.SQS; let n = 0;
    for (let i = 0; i < SQS.length; i++) {
      const f = SQS[i], p = b[f]; if (!p || colorOf(p) !== us) continue;
      const p8 = p * 8;
      for (let d = 0; d < 8; d++) {
        if (STEP[p8 + d]) { const to = NB[f * 8 + d]; if (to >= 0) n = this.add(list, n, f, to, p, us, qs); }
        if (SLIDE[p8 + d]) { let to = NB[f * 8 + d]; while (to >= 0) { n = this.add(list, n, f, to, p, us, qs); if (b[to]) break; to = NB[to * 8 + d]; } }
      }
      if (KNIGHT[p]) { const kt = this.g.KN[us][f]; for (let j = 0; j < kt.length; j++) n = this.add(list, n, f, kt[j], p, us, qs); }
    }
    if (qs || !this.cfg.drops) return n;
    for (const bt of [HI, KA, KI, GI, KE, KY, FU]) {
      if (!this.hand[us * 8 + bt]) continue;
      const faces = this.cfg.flip ? FACES_FLIP[bt] : [bt];
      for (const t of faces) {
        let files = 0;
        if (t === FU && this.cfg.nifu) for (const s of SQS) if (b[s] === FU + (us ? WF : 0)) files |= 1 << (s % 9);
        for (const s of SQS) {
          if (b[s]) continue;
          if (this.dead(us, t, s)) continue;
          if (t === FU && files & (1 << (s % 9))) continue;
          list[n++] = (80 + t) | (s << 7);
        }
      }
    }
    return n;
  }
  add(list, n, f, to, p, us, qs) {
    const q = this.board[to]; if (q && colorOf(q) === us) return n;
    const t = typeOf(p);
    if (this.cfg.flip) {   // micro: a capture turns the piece over (compulsory); other moves never promote
      if (q && this.PROM[p]) list[n++] = f | (to << 7) | (1 << 14);
      else if (!qs || q) list[n++] = f | (to << 7);
      return n;
    }
    const canP = this.PROM[p] && (this.inZone(us, f) || this.inZone(us, to));
    if (canP) list[n++] = f | (to << 7) | (1 << 14);
    if (this.dead(us, t, to)) return n;   // a pawn / lance / knight that could not move again must promote
    if (!qs || q) list[n++] = f | (to << 7);
    return n;
  }
  handKey(l, h, hi, from, to) {   // zobrist update of a hand count change
    const a = Math.min(HN - 1, from), b = Math.min(HN - 1, to);
    if (a) { l ^= ZHL[hi * HN + a]; h ^= ZHH[hi * HN + a]; }
    if (b) { l ^= ZHL[hi * HN + b]; h ^= ZHH[hi * HN + b]; }
    this._l = l; this._h = h;
  }
  setKing(c, from, to) { const k = this.kings; if (k[c * 2] === from) k[c * 2] = to; else if (k[c * 2 + 1] === from) k[c * 2 + 1] = to; this.king[c] = k[c * 2] >= 0 ? k[c * 2] : k[c * 2 + 1]; }
  doMove(m) {
    const f = m & 127, to = (m >> 7) & 127, pr = (m >> 14) & 1, us = this.side, b = this.board, sp = this.sp++;
    this.stM[sp] = m; this.stHL[sp] = this.hl; this.stHH[sp] = this.hh;
    let l = this.hl ^ ZSL, h = this.hh ^ ZSH;
    if (f > 80) {
      const t = f - 80, hi = us * 8 + this.BASE[t], n = this.hand[hi];
      this.handKey(l, h, hi, n, n - 1); l = this._l; h = this._h;
      this.hand[hi] = n - 1;
      const p = t + (us ? WF : 0); b[to] = p; l ^= ZL[to * 32 + p]; h ^= ZH[to * 32 + p];
      this.stCap[sp] = 0; this.stP[sp] = p; this.cnt++;
    } else {
      const p = b[f], q = b[to];
      this.stCap[sp] = q; this.stP[sp] = p;
      if (q) {
        l ^= ZL[to * 32 + q]; h ^= ZH[to * 32 + q]; this.cnt--;
        const t = typeOf(q);
        if (t === OU) this.setKing(us ^ 1, to, -1);
        else if (this.cfg.drops) { const hi = us * 8 + this.BASE[t], n = this.hand[hi]; this.handKey(l, h, hi, n, n + 1); l = this._l; h = this._h; this.hand[hi] = n + 1; }
      }
      const np = pr ? this.PROM[p] : p;
      b[f] = 0; b[to] = np; l ^= ZL[f * 32 + p] ^ ZL[to * 32 + np]; h ^= ZH[f * 32 + p] ^ ZH[to * 32 + np];
      if (typeOf(p) === OU) this.setKing(us, f, to);
    }
    this.side = us ^ 1; this.ply++; this.hl = l; this.hh = h;
    this.histL[this.hn] = l; this.histH[this.hn] = h; this.histChk[this.hn] = 0; this.hn++;
  }
  undoMove() {
    const sp = --this.sp, m = this.stM[sp], f = m & 127, to = (m >> 7) & 127, b = this.board;
    this.side ^= 1; this.ply--; this.hn--;
    const us = this.side;
    if (f > 80) { const t = f - 80; b[to] = 0; this.hand[us * 8 + this.BASE[t]]++; this.cnt--; }
    else {
      const p = this.stP[sp], q = this.stCap[sp];
      b[f] = p; b[to] = q;
      if (typeOf(p) === OU) this.setKing(us, to, f);
      if (q) { this.cnt++; const t = typeOf(q); if (t === OU) { const k = this.kings; if (k[(us ^ 1) * 2] < 0) k[(us ^ 1) * 2] = to; else k[(us ^ 1) * 2 + 1] = to; this.king[us ^ 1] = k[(us ^ 1) * 2]; } else if (this.cfg.drops) this.hand[us * 8 + this.BASE[t]]--; }
    }
    this.hl = this.stHL[sp]; this.hh = this.stHH[sp];
  }
  // after doMove(m): was m illegal? (one of the mover's kings left in check, or a pawn drop that mates where forbidden)
  illegal(m) {
    if (this.inCheck(this.side ^ 1)) return true;
    if (this.cfg.uchifu && (m & 127) === 80 + FU && this.inCheck() && !this.hasLegal()) return true;
    return false;
  }
  hasLegal() {
    const buf = this.hbuf || (this.hbuf = new Int32Array(BUF)), n = this.gen(buf, false);
    for (let i = 0; i < n; i++) { const m = buf[i]; this.doMove(m); const ok = !this.inCheck(this.side ^ 1) && !(this.cfg.uchifu && (m & 127) === 80 + FU && this.inCheck() && !this.hasLegal()); this.undoMove(); if (ok) return true; }
    return false;
  }
  legalMoves() {
    const buf = new Int32Array(BUF), n = this.gen(buf, false), out = [];
    for (let i = 0; i < n; i++) { const m = buf[i]; this.doMove(m); const bad = this.illegal(m); this.undoMove(); if (!bad) out.push(m); }
    return out;
  }
  isLegal(m) { return this.legalMoves().includes(m); }
  canDeclare() { return false; }
  // after doMove: a terminal score for the side to move (平安将棋: bare king against bare king is a draw)
  result() { return this.cfg.kk && this.cnt <= 2 && this.kings[1] < 0 && this.kings[3] < 0 && this.kings[0] >= 0 && this.kings[2] >= 0 ? 0 : null; }
  // repetition inside the search: a perpetual check loses for the checking side; otherwise the variant's rule
  repScore() { if (this.inCheck()) return 600; if (this.cfg.rep === 'sente') return this.side === 0 ? -600 : 600; return 0; }
  order(m) {
    const to = (m >> 7) & 127, f = m & 127, q = this.board[to], V = this.VAL;
    let v = q ? (V[typeOf(q)] || 400) * 4 - (f > 80 ? 0 : (V[typeOf(this.board[f])] || 400) >> 3) + 50 : 0;
    if ((m >> 14) & 1) v += 120;
    return v > 0 ? (v >> 4) + 1 : 0;
  }
  evaluate() {
    const b = this.board, us = this.side, V = this.VAL, H = this.H, NB = this.g.NB, SQS = this.g.SQS; let s = 0;
    for (let i = 0; i < SQS.length; i++) {
      const sq = SQS[i], p = b[sq]; if (!p) continue;
      const c = colorOf(p), t = typeOf(p), r = (sq / 9) | 0, adv = c ? r : H - 1 - r;
      let v = V[t];
      if (t === FU || t === GI || t === KE || t === KY) v += adv * (H > 6 ? 6 : 8);
      else if (t === KI || t > 8) v += Math.min(adv, 4) * 3;
      s += c === us ? v : -v;
    }
    if (this.cfg.drops) for (const t of [HI, KA, KI, GI, KE, KY, FU]) { const d = this.hand[us * 8 + t] - this.hand[(us ^ 1) * 8 + t]; if (d) s += d * this.HVAL[t]; }
    // king safety: enemy control around each king, own guards next to it
    const kw = this.cfg.drops ? 22 : 14;
    for (let j = 0; j < 4; j++) {
      const k = this.kings[j]; if (k < 0) continue;
      const c = j >> 1; let v = 0;
      for (let d = 0; d < 8; d++) { const x = NB[k * 8 + d]; if (x < 0) { v += 5; continue; } const q = b[x]; if (q && colorOf(q) === c) v += 12; if (this.attacked(x, c ^ 1)) v -= kw; }
      s += c === us ? v : -v;
    }
    return s + 15;   // side to move
  }
  toUsi(m) {
    const f = m & 127, t = (m >> 7) & 127, sq = s => (9 - (s % 9)) + 'abcdefghi'[(s / 9) | 0];
    if (f > 80) { const d = f - 80; return (d > 8 ? '+' + 'PLNSBRG'[d - 9] : 'PLNSBRG'[d - 1]) + '*' + sq(t); }
    return sq(f) + sq(t) + ((m >> 14) & 1 ? '+' : '');
  }
  fromUsi(u) {
    const sq = (a, b) => ('abcdefghi'.indexOf(b)) * 9 + (9 - +a);
    if (u[0] === '+' && u[2] === '*') return (80 + 8 + 'PLNSBRG'.indexOf(u[1]) + 1) | (sq(u[3], u[4]) << 7);
    if (u[1] === '*') return (80 + 'PLNSBRG'.indexOf(u[0]) + 1) | (sq(u[2], u[3]) << 7);
    return sq(u[0], u[1]) | (sq(u[2], u[3]) << 7) | (u[4] === '+' ? 1 << 14 : 0);
  }
  // the hand as the page shows it: [{tp, n}] (micro: both faces of every captured piece)
  handList(col) {
    const out = [];
    for (const bt of [HI, KA, KI, GI, KE, KY, FU]) {
      const n = this.hand[col * 8 + bt]; if (!n) continue;
      if (this.cfg.flip) for (const t of FACES_FLIP[bt]) out.push({ tp: t, n }); else out.push({ tp: bt, n });
    }
    return out;
  }
}
VShogi.CFG = CFG; VShogi.geo = geo;
VShogi.make = v => (CFG[v] ? new VShogi(v) : null);
G.VShogi = VShogi;
})(typeof self !== 'undefined' ? self : this);
