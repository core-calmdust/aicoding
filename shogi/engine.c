/*
 * Shogi engine search core in C for WebAssembly — a faithful port of the
 * Position / Searcher parts of engine.js (same move encoding, same evaluation,
 * same search), so results match the JavaScript engine move for move.
 *
 * Copyright 2026 core-calmdust — Apache License 2.0
 */
typedef signed char i8;
typedef unsigned char u8;
typedef short i16;
typedef int i32;
typedef unsigned int u32;

#define EXPORT(name) __attribute__((export_name(#name)))
#define IMPORT(name) __attribute__((import_module("env"), import_name(#name)))

IMPORT(now) double js_now(void);
IMPORT(progress) void js_progress(i32 depth, double score, i32 nodes, i32 *pv, i32 pvlen);
IMPORT(aprogress) void js_aprogress(i32 depth, i32 n, i32 *moves, double *scores);

void *memset(void *d, int c, unsigned long n) { u8 *p = d; while (n--) *p++ = (u8)c; return d; }
void *memcpy(void *d, const void *s, unsigned long n) { u8 *p = d; const u8 *q = s; while (n--) *p++ = *q++; return d; }
void *memmove(void *d, const void *s, unsigned long n) { u8 *p = d; const u8 *q = s; if (p < q) while (n--) *p++ = *q++; else { p += n; q += n; while (n--) *--p = *--q; } return d; }

/* ------------------------------------------------------------------ pieces */
enum { FU = 1, KY, KE, GI, KA, HI, KI, OU, TO, NY, NK, NG, UM, RY };
#define WF 16
#define colorOf(p) ((p) >> 4)
#define typeOf(p) ((p) & 15)
static const i8 CAN_PROMOTE[15] = {0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0};
static const i8 UNPROMOTE[15] = {0, FU, KY, KE, GI, KA, HI, KI, OU, FU, KY, KE, GI, KA, HI};
static const i32 VALUE[15] = {0, 90, 315, 405, 495, 855, 990, 540, 15000, 540, 540, 540, 540, 945, 1395};

static const i32 DR[8] = {-1, -1, -1, 0, 0, 1, 1, 1}, DC[8] = {-1, 0, 1, -1, 1, -1, 0, 1};
static const i32 OPPD[8] = {7, 6, 5, 4, 3, 2, 1, 0};
static i8 NB[81 * 8];
static i8 KN_TO[2][81][2], KN_TO_N[2][81], KN_FROM[2][81][2], KN_FROM_N[2][81];
static u8 STEP[32 * 8], SLIDE[32 * 8];
/* per piece code: directions in increasing order, high bit = slide */
static u8 DIRS[32][8], NDIRS[32];
#define inZone(col, s) ((col) == 0 ? (s) < 27 : (s) >= 54)
static inline int deadEnd(int col, int t, int s) {
  int r = s / 9, rr = col == 0 ? r : 8 - r;
  if (t == FU || t == KY) return rr == 0;
  if (t == KE) return rr <= 1;
  return 0;
}

/* zobrist (same xorshift sequence as engine.js) */
static u32 seed = 0x2545F491;
static i32 rnd32(void) { seed ^= seed << 13; seed ^= seed >> 17; seed ^= seed << 5; return (i32)seed; }
static i32 ZB_L[81 * 32], ZB_H[81 * 32], ZHD_L[2 * 8 * 20], ZHD_H[2 * 8 * 20], ZSIDE_L, ZSIDE_H;

/* ------------------------------------------------------------------ evaluation layout */
#define NK_IDX 45
#define NCLS 28
#define KP_SIZE (NK_IDX * NCLS * 81)
#define KH_BASE KP_SIZE
#define KH_SIZE (NK_IDX * 2 * 7 * 18)
#define PS_BASE (KH_BASE + KH_SIZE)
#define PS_SIZE (NCLS * 81)
#define GH_BASE (PS_BASE + PS_SIZE)
#define GH_SIZE (2 * 7 * 18)
#define TEMPO (GH_BASE + GH_SIZE)
#define NFEAT (TEMPO + 1)
#define EVAL_Q 8
static i16 W[NFEAT];
EXPORT(weights_ptr) i16 *weights_ptr(void) { return W; }

/* optional network (same layout as parseNN): float first layer */
#define NN_K 600
#define NN_MAXH 64
static int nnOn = 0, nnH = 0;
static float *nnW1 = 0;           /* NIN * H */
static float nnb1[NN_MAXH];
static double nnW2T[2 * NN_MAXH * 32], nnb2[32], nnW3T[32 * 32], nnb3[32], nnW4[32];
static float nnb4;
static float nnStore[(NFEAT - 1) * 32 + 64];   /* storage for W1 with H<=32 */

static inline int tsq(int c, int s, int mir) { if (c) s = 80 - s; if (mir) s = s - (s % 9) + (8 - (s % 9)); return s; }

/* ------------------------------------------------------------------ position */
#define NST 1200
static i8 board[81], hand[16], king[2];
static int side = 0;
static i32 hl, hh;
static i32 acc[2];
static i16 kidx[2]; static u8 mir[2];
static i8 stCap[NST]; static i32 stMove[NST], stHL[NST], stHH[NST], stA0[NST], stA1[NST];
static int sp = 0;
static i32 histL[NST], histH[NST]; static u8 histChk[NST];
static int hn = 0;
static float nnA[2 * NN_MAXH];
static float nnSt[NST * 2 * 32];
/* NNUE (chess-style): (2534 -> 256) x 2 perspectives -> 1, SCReLU; int16 weights (x QA), int32 accumulators */
#define NUE_H 256
#define NUE_IN 2534
#define NUE_QA 127
#define NUE_QB 64
static int nueOn = 0;
#define NUE_NB 8
static int nueNB = 1;
static i16 nueW1[NUE_IN * NUE_H], nueW2[NUE_NB * 2 * NUE_H];
static i32 nueB1[NUE_H], nueB2[NUE_NB];
/* output bucket: number of pieces in hand (both sides) */
static inline int nueBucket(void) { if (nueNB == 1) return 0; int t = 0; for (int i = 1; i < 8; i++) t += hand[i] + hand[8 + i]; return t < 1 ? 0 : t < 3 ? 1 : t < 5 ? 2 : t < 7 ? 3 : t < 9 ? 4 : t < 12 ? 5 : t < 16 ? 6 : 7; }
static i16 nueA[2][NUE_H];
static i16 nueSt[NST][2][NUE_H];
static inline int nueB(int persp, int p, int s) { return ((colorOf(p) != persp) * 14 + typeOf(p) - 1) * 81 + (persp ? 80 - s : s); }
static inline int nueHd(int persp, int hc, int t, int n) { return n > 19 ? -1 : 2268 + ((hc != persp) * 7 + t - 1) * 19 + n - 1; }
static inline void nueAdd(int persp, int f) { if (f < 0) return; i16 *a = nueA[persp]; const i16 *w = nueW1 + f * NUE_H; for (int j = 0; j < NUE_H; j++) a[j] += w[j]; }
static inline void nueSub(int persp, int f) { if (f < 0) return; i16 *a = nueA[persp]; const i16 *w = nueW1 + f * NUE_H; for (int j = 0; j < NUE_H; j++) a[j] -= w[j]; }

static void setKingCache(int c) {
  int k = king[c];
  if (k < 0) { kidx[c] = 0; mir[c] = 0; return; }
  if (c) k = 80 - k;
  int col = k % 9, m = col > 4 ? 1 : 0;
  mir[c] = m; kidx[c] = (k / 9) * 5 + (m ? 8 - col : col);
}
static inline i32 pv_(int c, int p, int s) {
  int own = colorOf(p) == c ? 0 : 14, cls = own + typeOf(p) - 1, ts = tsq(c, s, mir[c]);
  return (i32)W[(kidx[c] * NCLS + cls) * 81 + ts] + W[PS_BASE + cls * 81 + ts];
}
static inline i32 hv_(int c, int hc, int t, int n) {
  int own = hc == c ? 0 : 1, i = (own * 7 + t - 1) * 18 + n - 1;
  return (i32)W[KH_BASE + kidx[c] * 252 + i] + W[GH_BASE + i];
}
static i32 fullAcc(int c) {
  setKingCache(c);
  i32 a = 0;
  for (int s = 0; s < 81; s++) { int p = board[s]; if (p && !(typeOf(p) == OU && colorOf(p) == c)) a += pv_(c, p, s); }
  for (int hc = 0; hc < 2; hc++) for (int t = 1; t <= 7; t++) for (int n = 1; n <= hand[hc * 8 + t]; n++) a += hv_(c, hc, t, n);
  return a;
}
static void nnPiece(int c, int p, int s, int sg) {
  int H = nnH, o = c * H;
  int cls = (colorOf(p) == c ? 0 : 14) + typeOf(p) - 1, ts = tsq(c, s, mir[c]);
  int r1 = ((kidx[c] * NCLS + cls) * 81 + ts) * H, r2 = (PS_BASE + cls * 81 + ts) * H;
  if (sg > 0) for (int j = 0; j < H; j++) nnA[o + j] = (float)((double)nnA[o + j] + ((double)nnW1[r1 + j] + (double)nnW1[r2 + j]));
  else for (int j = 0; j < H; j++) nnA[o + j] = (float)((double)nnA[o + j] - ((double)nnW1[r1 + j] + (double)nnW1[r2 + j]));
}
static void nnHand(int c, int hc, int t, int n, int sg) {
  int H = nnH, o = c * H;
  int i = ((hc == c ? 0 : 1) * 7 + t - 1) * 18 + n - 1;
  int r1 = (KH_BASE + kidx[c] * 252 + i) * H, r2 = (GH_BASE + i) * H;
  if (sg > 0) for (int j = 0; j < H; j++) nnA[o + j] = (float)((double)nnA[o + j] + ((double)nnW1[r1 + j] + (double)nnW1[r2 + j]));
  else for (int j = 0; j < H; j++) nnA[o + j] = (float)((double)nnA[o + j] - ((double)nnW1[r1 + j] + (double)nnW1[r2 + j]));
}
static void nnRefresh(int c) {
  setKingCache(c);
  int H = nnH, o = c * H;
  for (int j = 0; j < H; j++) nnA[o + j] = nnb1[j];
  for (int s = 0; s < 81; s++) { int p = board[s]; if (p && !(typeOf(p) == OU && colorOf(p) == c)) nnPiece(c, p, s, 1); }
  for (int hc = 0; hc < 2; hc++) for (int t = 1; t <= 7; t++) for (int n = 1; n <= hand[hc * 8 + t]; n++) nnHand(c, hc, t, n, 1);
}
static double nnEval(void) {
  int H = nnH, so = side * H, no = (side ^ 1) * H;
  double h2[32], h3[32];
  for (int k = 0; k < 32; k++) h2[k] = nnb2[k];
  for (int j = 0; j < H; j++) {
    double v = nnA[so + j];
    if (v > 0) { if (v > 1) v = 1; int r = j * 32; for (int k = 0; k < 32; k++) h2[k] += nnW2T[r + k] * v; }
    v = nnA[no + j];
    if (v > 0) { if (v > 1) v = 1; int r = (H + j) * 32; for (int k = 0; k < 32; k++) h2[k] += nnW2T[r + k] * v; }
  }
  for (int k = 0; k < 32; k++) h3[k] = nnb3[k];
  for (int j = 0; j < 32; j++) { double v = h2[j]; if (v > 0) { if (v > 1) v = 1; int r = j * 32; for (int k = 0; k < 32; k++) h3[k] += nnW3T[r + k] * v; } }
  double o = nnb4;
  for (int k = 0; k < 32; k++) { double z = h3[k]; if (z > 0) o += nnW4[k] * (z > 1 ? 1 : z); }
  double v = o * NN_K;
  return v > 20000 ? 20000 : v < -20000 ? -20000 : (double)(i32)v;
}
static void nueRefresh(void) {
  for (int c = 0; c < 2; c++) {
    for (int j = 0; j < NUE_H; j++) nueA[c][j] = (i16)nueB1[j];
    for (int s = 0; s < 81; s++) if (board[s]) nueAdd(c, nueB(c, board[s], s));
    for (int hc = 0; hc < 2; hc++) for (int t = 1; t <= 7; t++) for (int n = 1; n <= hand[hc * 8 + t]; n++) nueAdd(c, nueHd(c, hc, t, n));
  }
}
static double nueEval(void) {
  const i16 *a = nueA[side], *b = nueA[side ^ 1];
  const int bk = nueBucket(); const i16 *w2 = nueW2 + bk * 2 * NUE_H;
  long long sum = 0;
  for (int i0 = 0; i0 < NUE_H; i0 += 16) {
    i32 part = 0;
    for (int i = i0; i < i0 + 16; i++) { i32 x = a[i] < 0 ? 0 : a[i] > NUE_QA ? NUE_QA : a[i]; part += x * x * w2[i]; }
    sum += part; part = 0;
    for (int i = i0; i < i0 + 16; i++) { i32 x = b[i] < 0 ? 0 : b[i] > NUE_QA ? NUE_QA : b[i]; part += x * x * w2[NUE_H + i]; }
    sum += part;
  }
  long long v = sum / NUE_QA + nueB2[bk];
  return (double)v * NN_K / (NUE_QA * NUE_QB);
}
static void refreshEval(void) {
  if (nueOn) nueRefresh();
  if (nnOn) { nnRefresh(0); nnRefresh(1); return; }
  acc[0] = fullAcc(0); acc[1] = fullAcc(1);
}
static inline double evaluate(void) {
  if (nueOn) return nueEval();
  if (nnOn) return nnEval();
  double v = (double)(acc[0] - acc[1]) / EVAL_Q;
  return (side ? -v : v) + (double)W[TEMPO] / EVAL_Q;
}

/* attacks */
static int attacked(int sq, int by) {
  for (int d = 0; d < 8; d++) {
    int s = NB[sq * 8 + d]; if (s < 0) continue;
    int p = board[s], dd = OPPD[d];
    if (p) { if (colorOf(p) == by && (STEP[p * 8 + dd] || SLIDE[p * 8 + dd])) return 1; continue; }
    s = NB[s * 8 + d];
    while (s >= 0) { p = board[s]; if (p) { if (colorOf(p) == by && SLIDE[p * 8 + dd]) return 1; break; } s = NB[s * 8 + d]; }
  }
  int kn = KE + (by ? WF : 0);
  for (int i = 0; i < KN_FROM_N[by][sq]; i++) if (board[KN_FROM[by][sq][i]] == kn) return 1;
  return 0;
}
static int attackers(int sq, int by, int *res) {
  int n = 0;
  for (int d = 0; d < 8; d++) {
    int s = NB[sq * 8 + d]; if (s < 0) continue;
    int p = board[s], dd = OPPD[d];
    if (p) { if (colorOf(p) == by && (STEP[p * 8 + dd] || SLIDE[p * 8 + dd])) res[n++] = s; continue; }
    s = NB[s * 8 + d];
    while (s >= 0) { p = board[s]; if (p) { if (colorOf(p) == by && SLIDE[p * 8 + dd]) res[n++] = s; break; } s = NB[s * 8 + d]; }
  }
  int kn = KE + (by ? WF : 0);
  for (int i = 0; i < KN_FROM_N[by][sq]; i++) if (board[KN_FROM[by][sq][i]] == kn) res[n++] = KN_FROM[by][sq][i];
  return n;
}
static int lva(int sq, int by) {
  int best = -1, bv = 1000000000;
  for (int d = 0; d < 8; d++) {
    int s = NB[sq * 8 + d]; if (s < 0) continue;
    int p = board[s], dd = OPPD[d];
    if (p) { if (colorOf(p) == by && (STEP[p * 8 + dd] || SLIDE[p * 8 + dd])) { int v = VALUE[typeOf(p)]; if (v < bv) { bv = v; best = s; } } continue; }
    s = NB[s * 8 + d];
    while (s >= 0) { p = board[s]; if (p) { if (colorOf(p) == by && SLIDE[p * 8 + dd]) { int v = VALUE[typeOf(p)]; if (v < bv) { bv = v; best = s; } } break; } s = NB[s * 8 + d]; }
  }
  if (bv > VALUE[KE]) { int kn = KE + (by ? WF : 0); for (int i = 0; i < KN_FROM_N[by][sq]; i++) if (board[KN_FROM[by][sq][i]] == kn) { bv = VALUE[KE]; best = KN_FROM[by][sq][i]; break; } }
  return best;
}
static inline int imax(int a, int b) { return a > b ? a : b; }
static int see(int m) {
  int us = side, from = m & 127, to = (m >> 7) & 127, drop = from > 80;
  int piece = drop ? (from - 80) + (us ? WF : 0) : board[from];
  int promo = !drop && ((m >> 14) & 1);
  if (promo) piece += 8;
  int cap = board[to];
  int gain[48], rem[96];
  gain[0] = (cap ? VALUE[typeOf(cap)] : 0) + (promo ? VALUE[typeOf(piece)] - VALUE[typeOf(piece) - 8] : 0);
  int oldFrom = drop ? 0 : board[from];
  if (!drop) board[from] = 0;
  board[to] = piece;
  int curV = VALUE[typeOf(piece)], s2 = us ^ 1, d = 0, nr = 0;
  for (;;) {
    int sq = lva(to, s2); if (sq < 0) break;
    d++; gain[d] = curV - gain[d - 1];
    if (imax(-gain[d - 1], gain[d]) < 0 || d >= 46) break;
    curV = VALUE[typeOf(board[sq])]; rem[nr++] = sq; rem[nr++] = board[sq]; board[sq] = 0; s2 ^= 1;
  }
  while (d > 0) { gain[d - 1] = -imax(-gain[d - 1], gain[d]); d--; }
  for (int i = 0; i < nr; i += 2) board[rem[i]] = rem[i + 1];
  board[to] = cap; if (!drop) board[from] = oldFrom;
  return gain[0];
}
static inline int inCheckC(int c) { int k = king[c]; return k >= 0 && attacked(k, c ^ 1); }
#define inCheck() inCheckC(side)
static int seeAfterCheck(int m) {
  int to = (m >> 7) & 127;
  if (!attacked(to, side)) return 0;
  int sq = lva(to, side); if (sq < 0) return 0;
  return -see(sq | (to << 7));
}

/* move generation */
static inline int addMove(i32 *list, int n, int s, int to, int t, int cp, int us, int q, int capOnly, int full) {
  if (cp && (inZone(us, s) || inZone(us, to))) {
    if (!capOnly || q || t == FU || t == KA || t == HI) list[n++] = s | (to << 7) | (1 << 14);
    if (!deadEnd(us, t, to) && (full || t == KY || t == KE || t == GI) && (!capOnly || q)) list[n++] = s | (to << 7);
  } else if (!capOnly || q) list[n++] = s | (to << 7);
  return n;
}
static u32 pmask[2][3];
#define SETB(c, s) (pmask[c][(s) / 27] |= 1u << ((s) % 27))
#define CLRB(c, s) (pmask[c][(s) / 27] &= ~(1u << ((s) % 27)))
static int gen(i32 *list, int mode) {
  int us = side, n = 0, full = mode == 2, capOnly = mode == 1;
  for (int w = 0; w < 3; w++) for (u32 bits = pmask[us][w]; bits; bits &= bits - 1) {
    int s = w * 27 + __builtin_ctz(bits);
    int p = board[s];
    int t = typeOf(p), cp = CAN_PROMOTE[t], nd = NDIRS[p];
    for (int k = 0; k < nd; k++) {
      int dd = DIRS[p][k], d = dd & 7;
      if (!(dd & 8)) {
        int to = NB[s * 8 + d];
        if (to >= 0) { int q = board[to]; if (!q || colorOf(q) != us) n = addMove(list, n, s, to, t, cp, us, q, capOnly, full); }
      } else {
        int to = NB[s * 8 + d];
        while (to >= 0) {
          int q = board[to];
          if (q) { if (colorOf(q) != us) n = addMove(list, n, s, to, t, cp, us, q, capOnly, full); break; }
          n = addMove(list, n, s, to, t, cp, us, 0, capOnly, full);
          to = NB[to * 8 + d];
        }
      }
    }
    if (t == KE) {
      for (int i = 0; i < KN_TO_N[us][s]; i++) { int to = KN_TO[us][s][i], q = board[to]; if (!q || colorOf(q) != us) n = addMove(list, n, s, to, t, 1, us, q, capOnly, full); }
    }
  }
  if (capOnly) return n;
  int hb = us * 8, pawnFiles = 0;
  if (hand[hb + FU]) for (int s = 0; s < 81; s++) if (board[s] == FU + (us ? WF : 0)) pawnFiles |= 1 << (s % 9);
  int any = 0; for (int t = 1; t <= 7; t++) any |= hand[hb + t];
  if (!any) return n;
  u8 empty[81]; int ne = 0;
  for (int s = 0; s < 81; s++) if (!board[s]) empty[ne++] = (u8)s;
  for (int t = 1; t <= 7; t++) {
    if (!hand[hb + t]) continue;
    int from = 80 + t;
    if (t > KE) { for (int i = 0; i < ne; i++) list[n++] = from | (empty[i] << 7); continue; }
    for (int i = 0; i < ne; i++) {
      int s = empty[i];
      if (deadEnd(us, t, s)) continue;
      if (t == FU && ((pawnFiles >> (s % 9)) & 1)) continue;
      list[n++] = from | (s << 7);
    }
  }
  return n;
}

/* make / unmake */
static void doMove(int m) {
  int us = side, them = us ^ 1, s0 = sp;
  stMove[s0] = m; stHL[s0] = hl; stHH[s0] = hh; stA0[s0] = acc[0]; stA1[s0] = acc[1];
  int from = m & 127, to = (m >> 7) & 127;
  i32 l = hl ^ ZSIDE_L, h = hh ^ ZSIDE_H;
  i32 a0 = acc[0], a1 = acc[1];
  int nn = nnOn;
  if (nn) memcpy(nnSt + s0 * 2 * nnH, nnA, sizeof(float) * 2 * nnH);
  int nue = nueOn;
  if (nue) memcpy(nueSt[s0], nueA, sizeof nueA);
  if (from > 80) {
    int t = from - 80, p = t + (us ? WF : 0), hi = us * 8 + t, n = hand[hi];
    l ^= ZHD_L[hi * 20 + n]; h ^= ZHD_H[hi * 20 + n];
    if (nn) { nnHand(0, us, t, n, -1); nnHand(1, us, t, n, -1); nnPiece(0, p, to, 1); nnPiece(1, p, to, 1); }
    else { a0 -= hv_(0, us, t, n); a1 -= hv_(1, us, t, n); a0 += pv_(0, p, to); a1 += pv_(1, p, to); }
    if (nue) for (int c = 0; c < 2; c++) { nueSub(c, nueHd(c, us, t, n)); nueAdd(c, nueB(c, p, to)); }
    hand[hi] = n - 1;
    board[to] = p; SETB(us, to); l ^= ZB_L[to * 32 + p]; h ^= ZB_H[to * 32 + p];
    stCap[s0] = 0;
  } else {
    int p = board[from], cap = board[to];
    int np = (m >> 14) & 1 ? p + 8 : p;
    stCap[s0] = cap;
    int isKing = typeOf(p) == OU;
    if (cap) {
      l ^= ZB_L[to * 32 + cap]; h ^= ZB_H[to * 32 + cap];
      int ct = UNPROMOTE[typeOf(cap)], hi = us * 8 + ct, n = hand[hi] + 1;
      hand[hi] = n;
      l ^= ZHD_L[hi * 20 + n]; h ^= ZHD_H[hi * 20 + n];
      if (nue) for (int c = 0; c < 2; c++) { nueSub(c, nueB(c, cap, to)); nueAdd(c, nueHd(c, us, ct, n)); }
      if (typeOf(cap) != OU) {
        if (nn) {
          if (!(isKing && us == 0)) { nnPiece(0, cap, to, -1); nnHand(0, us, ct, n, 1); }
          if (!(isKing && us == 1)) { nnPiece(1, cap, to, -1); nnHand(1, us, ct, n, 1); }
        } else {
          if (!(isKing && us == 0)) { a0 -= pv_(0, cap, to); a0 += hv_(0, us, ct, n); }
          if (!(isKing && us == 1)) { a1 -= pv_(1, cap, to); a1 += hv_(1, us, ct, n); }
        }
      }
    }
    l ^= ZB_L[from * 32 + p] ^ ZB_L[to * 32 + np]; h ^= ZB_H[from * 32 + p] ^ ZB_H[to * 32 + np];
    board[from] = 0; board[to] = np; CLRB(us, from); SETB(us, to); if (cap) CLRB(them, to);
    if (nue) for (int c = 0; c < 2; c++) { nueSub(c, nueB(c, p, from)); nueAdd(c, nueB(c, np, to)); }
    if (nn) {
      if (isKing) { king[us] = to; nnRefresh(us); nnPiece(them, p, from, -1); nnPiece(them, np, to, 1); }
      else { nnPiece(0, p, from, -1); nnPiece(0, np, to, 1); nnPiece(1, p, from, -1); nnPiece(1, np, to, 1); }
    } else if (isKing) {
      king[us] = to;
      if (us == 0) { a0 = fullAcc(0); a1 += pv_(1, np, to) - pv_(1, p, from); }
      else { a1 = fullAcc(1); a0 += pv_(0, np, to) - pv_(0, p, from); }
    } else {
      a0 += pv_(0, np, to) - pv_(0, p, from);
      a1 += pv_(1, np, to) - pv_(1, p, from);
    }
  }
  acc[0] = a0; acc[1] = a1; hl = l; hh = h;
  side = them; sp = s0 + 1;
  histL[hn] = l; histH[hn] = h; histChk[hn] = 0; hn++;
}
static void undoMove(void) {
  int s0 = --sp, m = stMove[s0];
  hn--;
  int us = side ^ 1;
  side = us;
  int from = m & 127, to = (m >> 7) & 127;
  if (from > 80) { board[to] = 0; hand[us * 8 + from - 80]++; CLRB(us, to); }
  else {
    int np = board[to], p = (m >> 14) & 1 ? np - 8 : np, cap = stCap[s0];
    board[from] = p; board[to] = cap; CLRB(us, to); SETB(us, from); if (cap) SETB(us ^ 1, to);
    if (cap) hand[us * 8 + UNPROMOTE[typeOf(cap)]]--;
    if (typeOf(p) == OU) { king[us] = from; setKingCache(us); }
  }
  hl = stHL[s0]; hh = stHH[s0]; acc[0] = stA0[s0]; acc[1] = stA1[s0];
  if (nnOn) memcpy(nnA, nnSt + s0 * 2 * nnH, sizeof(float) * 2 * nnH);
  if (nueOn) memcpy(nueA, nueSt[s0], sizeof nueA);
}
static void doNull(void) {
  int s0 = sp;
  stMove[s0] = 0; stHL[s0] = hl; stHH[s0] = hh; stA0[s0] = acc[0]; stA1[s0] = acc[1];
  hl ^= ZSIDE_L; hh ^= ZSIDE_H; side ^= 1; sp++;
  histL[hn] = 0x7fffffff; histH[hn] = 0; histChk[hn] = 0; hn++;
}
static void undoNull(void) { int s0 = --sp; hn--; side ^= 1; hl = stHL[s0]; hh = stHH[s0]; }

static i32 hlBuf[1000];
static int hasLegalMove(void) {
  int us = side, k = king[us];
  if (k >= 0) {
    int kp = OU + (us ? WF : 0);
    for (int d = 0; d < 8; d++) {
      int t = NB[k * 8 + d]; if (t < 0) continue;
      int q = board[t]; if (q && colorOf(q) == us) continue;
      board[k] = 0; board[t] = kp; int att = attacked(t, us ^ 1); board[t] = q; board[k] = kp;
      if (!att) return 1;
    }
  }
  /* in check (always the case for our callers): only captures of the checker and interpositions can help */
  if (k >= 0 && attacked(k, us ^ 1)) {
    int chk[24], nc = attackers(k, us ^ 1, chk);
    if (nc >= 2) return 0;                       /* double check: only king moves, already tried */
    if (nc == 1) {
      int cs = chk[0], tg[9], nt = 0, cr = cs / 9, cc = cs % 9, kr = k / 9, kc = k % 9;
      tg[nt++] = cs;
      int dr = (kr > cr) - (kr < cr), dc = (kc > cc) - (kc < cc);
      int adjacentOrKnight = (cr - kr) * (cr - kr) > 1 || (cc - kc) * (cc - kc) > 1;
      if (adjacentOrKnight && (cr == kr || cc == kc || (cr - kr == cc - kc) || (cr - kr == kc - cc)) && typeOf(board[cs]) != KE) {
        int r = cr + dr, c = cc + dc;
        while (r != kr || c != kc) { tg[nt++] = r * 9 + c; r += dr; c += dc; }
      }
      int at[24];
      for (int i = 0; i < nt; i++) {
        int t = tg[i], na = attackers(t, us, at);
        for (int j = 0; j < na; j++) {
          int f = at[j], tp = typeOf(board[f]); if (tp == OU) continue;
          int m = f | (t << 7);
          if (CAN_PROMOTE[tp] && (inZone(us, f) || inZone(us, t))) m |= 1 << 14;
          doMove(m);
          int ok = !attacked(king[side ^ 1], side);
          undoMove();
          if (ok) return 1;
        }
        if (i > 0) {                                  /* drops on the line between */
          int hb = us * 8;
          for (int tp = 1; tp <= 7; tp++) {
            if (!hand[hb + tp]) continue;
            if (tp <= KE && deadEnd(us, tp, t)) continue;
            if (tp == FU) { int c = t % 9, fp = FU + (us ? WF : 0), dup = 0; for (int r = 0; r < 9; r++) if (board[r * 9 + c] == fp) dup = 1; if (dup) continue; }
            int m = (80 + tp) | (t << 7);
            doMove(m);
            int ok = !attacked(king[side ^ 1], side);
            undoMove();
            if (ok) return 1;
          }
        }
      }
      return 0;
    }
  }
  int n = gen(hlBuf, 0);
  for (int i = 0; i < n; i++) {
    int m = hlBuf[i];
    doMove(m);
    int k2 = king[side ^ 1], ok = k2 < 0 || !attacked(k2, side);
    undoMove();
    if (ok) return 1;
  }
  return 0;
}
static int lastMoveLegal(int m) {
  int us = side ^ 1, k = king[us];
  if (k >= 0 && attacked(k, side)) return 0;
  if ((m & 127) == 80 + FU) {
    int to = (m >> 7) & 127, ek = king[side];
    if (ek == (us == 0 ? to - 9 : to + 9) && !hasLegalMove()) return 0;
  }
  return 1;
}
/* same result as lastMoveLegal, but skips the king-safety scan when the mover was not in check and could not be pinned */
static int legalAfter(int m, int wasInChk) {
  if (wasInChk) return lastMoveLegal(m);
  int f = m & 127, us = side ^ 1;
  if (f > 80) {
    if (f == 80 + FU) { int to = (m >> 7) & 127, ek = king[side]; if (ek == (us == 0 ? to - 9 : to + 9) && !hasLegalMove()) return 0; }
    return 1;
  }
  int to = (m >> 7) & 127;
  if (typeOf(board[to]) == OU) return lastMoveLegal(m);
  int k = king[us]; if (k < 0) return 1;
  int dr = f / 9 - k / 9, dc = f % 9 - k % 9;
  if (dr && dc && dr != dc && dr != -dc) return 1;
  return lastMoveLegal(m);
}
static i32 lmBuf[1000];
static int legalMoves(i32 *out, int full) {
  int n = gen(lmBuf, full ? 2 : 0), k = 0;
  for (int i = 0; i < n; i++) { int m = lmBuf[i]; doMove(m); int ok = lastMoveLegal(m); undoMove(); if (ok) out[k++] = m; }
  return k;
}
static int mate1(i32 *buf) {
  int us = side, ek = king[us ^ 1]; if (ek < 0) return 0;
  int n = 0, targets[12], nt = 0, at[24];
  for (int d = 0; d < 8; d++) { int t = NB[ek * 8 + d]; if (t >= 0) targets[nt++] = t; }
  for (int i = 0; i < KN_FROM_N[us][ek]; i++) targets[nt++] = KN_FROM[us][ek][i];
  for (int i = 0; i < nt; i++) {
    int t = targets[i], q = board[t];
    if (q && colorOf(q) == us) continue;
    if (!q) for (int tp = 2; tp <= 7; tp++) {
      if (!hand[us * 8 + tp] || (tp <= KE && deadEnd(us, tp, t))) continue;
      buf[n++] = (80 + tp) | (t << 7);
    }
    int na = attackers(t, us, at);
    for (int ai = 0; ai < na; ai++) {
      int f = at[ai], p = board[f], tp = typeOf(p); if (tp == OU) continue;
      if (CAN_PROMOTE[tp] && (inZone(us, f) || inZone(us, t))) { buf[n++] = f | (t << 7) | (1 << 14); if (!deadEnd(us, tp, t)) buf[n++] = f | (t << 7); }
      else buf[n++] = f | (t << 7);
    }
  }
  for (int i = 0; i < n; i++) {
    int m = buf[i];
    doMove(m);
    int mk = king[us];
    int ok = (mk < 0 || !attacked(mk, side)) && inCheck() && !hasLegalMove();
    undoMove();
    if (ok) return m;
  }
  return 0;
}
static int isPseudo(int m) {
  int us = side, f = m & 127, t = (m >> 7) & 127;
  if (t > 80 || f > 87) return 0;
  int q = board[t]; if (q && colorOf(q) == us) return 0;
  if (f > 80) {
    int tp = f - 80;
    if (q || !hand[us * 8 + tp] || ((m >> 14) & 1)) return 0;
    if (tp <= KE && deadEnd(us, tp, t)) return 0;
    if (tp == FU) { int c = t % 9, fp = FU + (us ? WF : 0); for (int r = 0; r < 9; r++) if (board[r * 9 + c] == fp) return 0; }
    return 1;
  }
  int p = board[f]; if (!p || colorOf(p) != us) return 0;
  int tp = typeOf(p), promo = (m >> 14) & 1;
  if (promo) { if (!CAN_PROMOTE[tp] || !(inZone(us, f) || inZone(us, t))) return 0; }
  else if (deadEnd(us, tp, t)) return 0;
  if (tp == KE) { for (int i = 0; i < KN_TO_N[us][f]; i++) if (KN_TO[us][f][i] == t) return 1; return 0; }
  int p8 = p * 8;
  for (int d = 0; d < 8; d++) {
    if (STEP[p8 + d] && NB[f * 8 + d] == t) return 1;
    if (SLIDE[p8 + d]) { int x = NB[f * 8 + d]; while (x >= 0) { if (x == t) return 1; if (board[x]) break; x = NB[x * 8 + d]; } }
  }
  return 0;
}

/* mate in 3 for the side to move (checks only); returns first move or 0 */
static i32 m3a[1000], m3b[1000], m3c[600];
static int mate3(void) {
  int us = side, n = gen(m3a, 0);
  for (int i = 0; i < n; i++) {
    int m = m3a[i];
    doMove(m);
    if (!inCheck() || !lastMoveLegal(m)) { undoMove(); continue; }
    int nr = gen(m3b, 0), legal = 0, ok = 1;
    for (int j = 0; j < nr && ok; j++) {
      int r = m3b[j];
      doMove(r);
      if (lastMoveLegal(r)) { legal++; if (!mate1(m3c)) ok = 0; }
      undoMove();
    }
    undoMove();
    if (ok && legal) return m;
    (void)us;
  }
  return 0;
}
/* ------------------------------------------------------------------ search */
#define MATE 30000
#define INF 32000
#define MAXPLY 64
#define TT_BITS 20
#define TT_SIZE (1 << TT_BITS)
#define TT_MASK (TT_SIZE - 1)
static i32 ttKey[TT_SIZE], ttMove[TT_SIZE], ttData[TT_SIZE];
static int ttAge = 0;
#define F_EXACT 1
#define F_LOWER 2
#define F_UPPER 3
EXPORT(tt_clear) void tt_clear(void) { memset(ttKey, 0, sizeof ttKey); memset(ttMove, 0, sizeof ttMove); memset(ttData, 0, sizeof ttData); }

#define NBUF (MAXPLY + 32)
static i32 moveBuf[NBUF][1000], scoreBuf[NBUF][1000], quietBuf[NBUF][1000], quietScore[NBUF][1000], triedQ[NBUF][1000], mateBuf[NBUF][1000];
static i32 killers[NBUF * 2];
static i32 history[2 * 88 * 81 * 2];
static i32 nodes; static int stopFlag; static double deadline; static i32 nodeLimit;
static i32 pvTable[MAXPLY * MAXPLY], pvLen[MAXPLY];
static int rootDepth = 1;
/* tunables (same defaults as engine.js) */
static int useMate1 = 1, rfpDepth = 3, rfpMargin = 120, nullAdapt = 0, histMalus = 0;
static int P[32] = {[5] = 1, [7] = 1, [14] = 1, [16] = 100};
static void lmrInit(double div);
EXPORT(set_param) void set_param(int k, int v) { if (k == 0) useMate1 = v; else if (k == 1) rfpDepth = v; else if (k == 2) rfpMargin = v; else if (k == 3) nullAdapt = v; else if (k == 4) histMalus = v; if (k >= 0 && k < 32) P[k] = v; if (k == 17 && v > 0) lmrInit(v / 100.0); }
/* experimental features (all off by default):
   P5 log-LMR, P6 counter-move ordering, P7 quiet checks in first qsearch ply, P10 razoring, P11 extend all checks, P12 LMP base */
static double ln_(double x) { int k = 0; while (x > 1.5) { x *= 0.5; k++; } double z = (x - 1) / (x + 1), z2 = z * z, t = z, r = 0; for (int i = 1; i < 40; i += 2) { r += t / i; t *= z2; } return 2 * r + k * 0.6931471805599453; }
static i8 LMRT[64][64];
static void lmrInit(double div) { for (int d = 1; d < 64; d++) for (int n = 1; n < 64; n++) LMRT[d][n] = (i8)(0.6 + ln_(d) * ln_(n) / div); }
static i32 counterMv[32 * 81];

static inline int timeUp(void) {
  if ((nodes & 1023) == 0) {
    if (deadline > 0 && js_now() > deadline) stopFlag = 1;
    if (nodeLimit && nodes > nodeLimit) stopFlag = 1;
  }
  return stopFlag;
}
static void store(int depth, double score, int flag, int move, int ply) {
  int i = hl & TT_MASK;
  if (ttKey[i] == hh || ((ttData[i] >> 16) & 255) <= depth + 2 || (((u32)ttData[i] >> 26) != (u32)ttAge)) {
    if (score > MATE - MAXPLY) score += ply; else if (score < -MATE + MAXPLY) score -= ply;
    if (!move && ttKey[i] == hh) move = ttMove[i];
    ttKey[i] = hh; ttMove[i] = move;
    ttData[i] = ((i32)score & 0xffff) | ((depth & 255) << 16) | (flag << 24) | (ttAge << 26);
  }
}
/* returns 1 and sets *out when repetition found */
static int repetition(int ply, double *out) {
  int lim = hn - 1 - 32; if (lim < 0) lim = 0;
  for (int i = hn - 5; i >= lim; i -= 2) {
    if (histL[i] == hl && histH[i] == hh) {
      int usChecked = 1, themChecked = 1;
      for (int j = i + 2; j < hn; j += 2) if (!histChk[j]) { usChecked = 0; break; }
      for (int j = i + 1; j < hn; j += 2) if (!histChk[j]) { themChecked = 0; break; }
      if (usChecked) { *out = MATE - ply - 1; return 1; }
      if (themChecked) { *out = -MATE + ply + 1; return 1; }
      *out = 0; return 1;
    }
  }
  return 0;
}
static void orderMoves(i32 *moves, i32 *scores, int n, int ttm, int ply) {
  int us = side, k0 = killers[ply * 2], k1 = killers[ply * 2 + 1];
  for (int i = 0; i < n; i++) {
    int m = moves[i];
    if (m == ttm) { scores[i] = 1 << 30; continue; }
    int f = m & 127, t = (m >> 7) & 127, cap = board[t];
    i32 sc;
    if (cap) { int sv = see(m); sc = sv < 0 ? -10000000 + sv : 100000000 + VALUE[typeOf(cap)] * 16 - (f > 80 ? 0 : VALUE[typeOf(board[f])] >> 4); }
    else if ((m >> 14) & 1) sc = 90000000 + VALUE[typeOf(board[f]) + 8] - VALUE[typeOf(board[f])];
    else if (m == k0) sc = 80000002;
    else if (m == k1) sc = 80000001;
    else if (P[6] && sp > 0 && stMove[sp - 1] && m == counterMv[board[(stMove[sp - 1] >> 7) & 127] * 81 + ((stMove[sp - 1] >> 7) & 127)]) sc = 79000000;
    else sc = history[((us * 88 + f) * 81 + t) * 2 + ((m >> 14) & 1)];
    scores[i] = sc;
  }
}
static inline int pick(i32 *moves, i32 *scores, int n, int i) {
  int bi = i; i32 bs = scores[i];
  for (int j = i + 1; j < n; j++) if (scores[j] > bs) { bs = scores[j]; bi = j; }
  if (bi != i) { i32 tm = moves[i]; moves[i] = moves[bi]; moves[bi] = tm; i32 ts = scores[i]; scores[i] = scores[bi]; scores[bi] = ts; }
  return moves[i];
}
static double qsearch(double alpha, double beta, int ply, int qd) {
  nodes++;
  if (timeUp()) return 0;
  int inChk = inCheck();
  histChk[hn - 1] = inChk ? 1 : 0;
  if (ply >= MAXPLY + 20) return evaluate();
  double best = -INF;
  if (!inChk) {
    double sp_ = evaluate();
    if (sp_ >= beta) return sp_;
    if (sp_ > alpha) alpha = sp_;
    best = sp_;
  }
  i32 *moves = moveBuf[ply], *scores = scoreBuf[ply];
  int n = gen(moves, inChk ? 0 : 1);
  orderMoves(moves, scores, n, 0, ply);
  int legal = 0;
  for (int i = 0; i < n; i++) {
    int m = pick(moves, scores, n, i);
    if (!inChk) {
      int cap = board[(m >> 7) & 127];
      if (cap && best + VALUE[typeOf(cap)] * 2 + 200 < alpha && !((m >> 14) & 1)) continue;
      if (see(m) < 0) continue;
    }
    doMove(m);
    if (!legalAfter(m, inChk)) { undoMove(); continue; }
    legal++;
    double v = -qsearch(-beta, -alpha, ply + 1, qd + 1);
    undoMove();
    if (stopFlag) return 0;
    if (v > best) { best = v; if (v > alpha) { alpha = v; if (v >= beta) return v; } }
  }
  if (inChk && !legal) return -MATE + ply;
  if (P[7] && !inChk && qd == 0) {
    /* quiet checking moves (incl. drops) at the first quiescence ply */
    i32 *qm = quietBuf[ply];
    int nn = gen(qm, 0);
    for (int i = 0; i < nn; i++) {
      int m = qm[i]; if (board[(m >> 7) & 127]) continue;
      doMove(m);
      if (!inCheck() || !lastMoveLegal(m)) { undoMove(); continue; }
      if (seeAfterCheck(m) < 0) { undoMove(); continue; }
      double v = -qsearch(-beta, -alpha, ply + 1, qd + 1);
      undoMove();
      if (stopFlag) return 0;
      if (v > best) { best = v; if (v > alpha) { alpha = v; if (v >= beta) return v; } }
    }
  }
  return best;
}
static double search(int depth, double alpha, double beta, int ply, int pvNode, int allowNull) {
  pvLen[ply] = ply;
  if (depth <= 0) return qsearch(alpha, beta, ply, 0);
  nodes++;
  if (timeUp()) return 0;
  int inChk = inCheck();
  histChk[hn - 1] = inChk ? 1 : 0;
  if (ply > 0) {
    double rep;
    if (repetition(ply, &rep)) return rep;
    if (alpha < -MATE + ply) alpha = -MATE + ply;
    if (beta > MATE - ply - 1) beta = MATE - ply - 1;
    if (alpha >= beta) return alpha;
  }
  if (ply >= MAXPLY - 1) return evaluate();
  int ti = hl & TT_MASK, ttm = 0;
  if (ttKey[ti] == hh) {
    ttm = ttMove[ti];
    int d = ttData[ti], td = (d >> 16) & 255, fl = (d >> 24) & 3;
    int ts = (i32)((u32)d << 16) >> 16;
    if (ts > MATE - MAXPLY) ts -= ply; else if (ts < -MATE + MAXPLY) ts += ply;
    if (!pvNode && td >= depth && ply > 0) {
      if (fl == F_EXACT || (fl == F_LOWER && ts >= beta) || (fl == F_UPPER && ts <= alpha)) return ts;
    }
  }
  if (!inChk && useMate1) {
    int mm = mate1(mateBuf[ply]);
    if (mm) { double v = MATE - ply - 1; store(depth, v, F_EXACT, mm, ply); pvTable[ply * MAXPLY + ply] = mm; pvLen[ply] = ply + 1; return v; }
  }
  if (P[13] && !inChk && depth >= P[13]) {
    int mm = mate3();
    if (mm) { double v = MATE - ply - 3; store(depth, v, F_EXACT, mm, ply); pvTable[ply * MAXPLY + ply] = mm; pvLen[ply] = ply + 1; return v; }
  }
  double staticEval = inChk ? -INF : evaluate();
  if (!pvNode && !inChk && depth <= rfpDepth && staticEval - rfpMargin * depth >= beta && (beta < 0 ? -beta : beta) < MATE - MAXPLY) return staticEval;
  if (P[10] && !pvNode && !inChk && depth <= 2 && staticEval + P[10] * depth < alpha) {
    double v = qsearch(alpha, beta, ply, 0);
    if (v < alpha) return v;
  }
  if (!pvNode && !inChk && allowNull && depth >= 3 && staticEval >= beta) {
    int R;
    if (nullAdapt) { int x = (int)((staticEval - beta) / 250); R = 3 + depth / 5 + (x < 2 ? x : 2); }
    else R = 2 + (depth >= 7 ? 1 : 0);
    doNull();
    double v = -search(depth - 1 - R, -beta, -beta + 1, ply + 1, 0, 0);
    undoNull();
    if (stopFlag) return 0;
    if (v >= beta && v < MATE - MAXPLY) return v;
  }
  if (!ttm && pvNode && depth >= 4) {
    search(depth - 2, alpha, beta, ply, 1, 0);
    if (ttKey[ti] == hh) ttm = ttMove[ti];
  }
  i32 *moves = moveBuf[ply], *scores = scoreBuf[ply], *qmoves = quietBuf[ply], *qscores = quietScore[ply], *tq = triedQ[ply];
  double best = -INF; int bestMove = 0, legal = 0, nq = 0;
  double origAlpha = alpha;
  int us = side;
  int stage = 0, i1 = 0, n1 = 0, i2 = 0, n2 = 0;
  if (!(ttm && isPseudo(ttm))) { ttm = 0; stage = 1; }
  for (;;) {
    int m;
    if (stage == 0) { m = ttm; stage = 1; }
    else if (stage == 1) {
      if (i1 == 0 && n1 == 0) { n1 = gen(moves, 1); orderMoves(moves, scores, n1, 0, ply); if (!n1) { stage = 2; continue; } }
      if (i1 >= n1) { stage = 2; continue; }
      m = pick(moves, scores, n1, i1++);
      if (m == ttm) continue;
    } else {
      if (stage == 2) {
        int all = gen(qmoves, 0); n2 = 0;
        for (int k = 0; k < all; k++) {
          int x = qmoves[k], tx = (x >> 7) & 127;
          if (board[tx] || x == ttm) continue;
          if ((x >> 14) & 1) { int tt = typeOf(board[x & 127]); if (tt == FU || tt == KA || tt == HI) continue; }
          qmoves[n2++] = x;
        }
        orderMoves(qmoves, qscores, n2, 0, ply);
        stage = 3;
      }
      if (i2 >= n2) break;
      m = pick(qmoves, qscores, n2, i2++);
    }
    int to = (m >> 7) & 127, cap = board[to], quiet = !cap && !((m >> 14) & 1);
    if (!pvNode && !inChk && quiet && legal > 0 && depth <= (P[18] ? P[18] : 2) && staticEval + (P[16] ? P[16] : 150) * depth + 100 <= alpha) {
      doMove(m);
      int ok = legalAfter(m, inChk), chk = ok && inCheck();
      undoMove();
      if (!chk) continue;
    }
    if (!pvNode && !inChk && quiet && depth <= 3 && legal > (P[12] ? P[12] : 6) + depth * depth * 3) {
      doMove(m); int chk = inCheck(); undoMove();
      if (!chk) continue;
    }
    doMove(m);
    if (!legalAfter(m, inChk)) { undoMove(); continue; }
    legal++;
    int givesChk = inCheck();
    int ext = givesChk && ply < rootDepth * 2 && (P[11] || seeAfterCheck(m) >= 0) ? 1 : 0;
    double v;
    int nd = depth - 1 + ext;
    if (legal == 1) v = -search(nd, -beta, -alpha, ply + 1, pvNode, 1);
    else {
      int r = 0;
      if (depth >= 3 && quiet && !inChk && !givesChk && legal > 3) {
        if (P[5]) {
          r = LMRT[depth < 63 ? depth : 63][legal < 63 ? legal : 63];
          if (m == killers[ply * 2] || m == killers[ply * 2 + 1]) r--;
          i32 hv = history[((us * 88 + (m & 127)) * 81 + to) * 2 + ((m >> 14) & 1)];
          if (hv > 2000) r--; else if (hv == 0) r++;
        } else r = 1 + (legal > 8 ? 1 : 0) + (depth >= 8 ? 1 : 0);
        if (pvNode) r--;
        if (r < 0) r = 0;
        if (r > depth - 2) r = depth - 2;
      }
      v = -search(nd - r, -alpha - 1, -alpha, ply + 1, 0, 1);
      if (v > alpha && r) v = -search(nd, -alpha - 1, -alpha, ply + 1, 0, 1);
      if (v > alpha && v < beta) v = -search(nd, -beta, -alpha, ply + 1, 1, 1);
    }
    undoMove();
    if (stopFlag) return 0;
    if (quiet && nq < 1000) tq[nq++] = m;
    if (v > best) {
      best = v; bestMove = m;
      if (v > alpha) {
        alpha = v;
        pvTable[ply * MAXPLY + ply] = m;
        for (int j = ply + 1; j < pvLen[ply + 1]; j++) pvTable[ply * MAXPLY + j] = pvTable[(ply + 1) * MAXPLY + j];
        pvLen[ply] = imax(ply + 1, pvLen[ply + 1]);
        if (v >= beta) {
          if (quiet) {
            if (killers[ply * 2] != m) { killers[ply * 2 + 1] = killers[ply * 2]; killers[ply * 2] = m; }
            if (P[6] && sp > 0 && stMove[sp - 1]) { int pt = (stMove[sp - 1] >> 7) & 127; counterMv[board[pt] * 81 + pt] = m; }
            int hi = ((us * 88 + (m & 127)) * 81 + to) * 2 + ((m >> 14) & 1);
            history[hi] += depth * depth;
            if (history[hi] > 1000000) for (int k = 0; k < (int)(sizeof history / 4); k++) history[k] >>= 1;
            if (histMalus) for (int k = 0; k < nq; k++) { int x = tq[k]; if (x == m) continue; int hx = ((us * 88 + (x & 127)) * 81 + ((x >> 7) & 127)) * 2 + ((x >> 14) & 1); history[hx] -= depth * depth; if (history[hx] < -1000000) history[hx] = -1000000; }
          }
          break;
        }
      }
    }
  }
  if (!legal) return -MATE + ply;
  store(depth, best, best >= beta ? F_LOWER : best > origAlpha ? F_EXACT : F_UPPER, bestMove, ply);
  return best;
}

/* root */
static i32 rootM[1000]; static double rootS[1000]; static int nRoot;
static void rootMoveToFront(int idx) {
  if (idx <= 0) return;
  i32 m = rootM[idx]; double s = rootS[idx];
  for (int k = idx; k > 0; k--) { rootM[k] = rootM[k - 1]; rootS[k] = rootS[k - 1]; }
  rootM[0] = m; rootS[0] = s;
}
static double searchRoot(int depth, double alpha, double beta) {
  double best = -INF; int first = 1;
  pvLen[0] = 0;
  for (int i = 0; i < nRoot; i++) {
    int m = rootM[i];
    doMove(m);
    int chk = inCheck();
    int nd = depth - 1 + (chk ? 1 : 0);
    double v;
    if (first) v = -search(nd, -beta, -alpha, 1, 1, 1);
    else {
      v = -search(nd, -alpha - 1, -alpha, 1, 0, 1);
      if (v > alpha && v < beta) v = -search(nd, -beta, -alpha, 1, 1, 1);
    }
    undoMove();
    if (stopFlag) return best;
    rootS[i] = first || v > alpha ? v : -INF + 1;
    if (v > best) {
      best = v;
      if (v > alpha) {
        alpha = v;
        pvTable[0] = m;
        for (int j = 1; j < pvLen[1]; j++) pvTable[j] = pvTable[MAXPLY + j];
        pvLen[0] = imax(1, pvLen[1]);
        rootMoveToFront(i);
        if (v >= beta) return v;
      }
    }
    first = 0;
  }
  return best;
}
/* stable sort of root moves by score desc (like Array.prototype.sort) */
static void sortRoot(void) {
  for (int i = 1; i < nRoot; i++) {
    i32 m = rootM[i]; double s = rootS[i]; int j = i - 1;
    while (j >= 0 && rootS[j] < s) { rootM[j + 1] = rootM[j]; rootS[j + 1] = rootS[j]; j--; }
    rootM[j + 1] = m; rootS[j + 1] = s;
  }
}
/* result buffer: [move, depth, nodes, pvlen, pv...]; score separately */
static i32 res[8 + MAXPLY]; static double resScore;
EXPORT(res_ptr) i32 *res_ptr(void) { return res; }
EXPORT(res_score) double res_score(void) { return resScore; }
static i32 exclude[1000]; static int nExclude = 0;
EXPORT(exclude_ptr) i32 *exclude_ptr(void) { return exclude; }
EXPORT(set_exclude) void set_exclude(int n) { nExclude = n; }

EXPORT(root_search) int root_search(double timeMs, int maxDepth, int nodeLim) {
  double t0 = js_now();
  stopFlag = 0; nodes = 0;
  deadline = timeMs > 0 ? t0 + timeMs : 0;
  nodeLimit = nodeLim;
  ttAge = (ttAge + 1) & 31;
  memset(killers, 0, sizeof killers);
  for (int k = 0; k < (int)(sizeof history / 4); k++) history[k] >>= 2;
  if (!maxDepth) maxDepth = 40;
  static i32 legal[1000];
  int nl = legalMoves(legal, 0);
  nRoot = 0;
  for (int i = 0; i < nl; i++) {
    int ex = 0; for (int k = 0; k < nExclude; k++) if (exclude[k] == legal[i]) ex = 1;
    if (!ex) { rootM[nRoot] = legal[i]; rootS[nRoot] = -INF; nRoot++; }
  }
  nExclude = 0;
  if (!nRoot) { res[0] = 0; res[1] = 0; res[2] = 0; res[3] = 0; resScore = -MATE; return 0; }
  res[0] = rootM[0]; res[1] = 0; res[3] = 1; res[4] = rootM[0]; resScore = 0;
  double prevScore = 0;
  for (int depth = 1; depth <= maxDepth; depth++) {
    rootDepth = depth;
    double alpha = -INF, beta = INF, delta = 60, score;
    if (depth >= 4) { alpha = prevScore - delta; beta = prevScore + delta; }
    for (;;) {
      score = searchRoot(depth, alpha, beta);
      if (stopFlag) break;
      if (score <= alpha) { alpha = alpha - delta; if (alpha < -INF) alpha = -INF; delta *= 2; continue; }
      if (score >= beta) { beta = beta + delta; if (beta > INF) beta = INF; delta *= 2; continue; }
      break;
    }
    if (stopFlag && depth > 1) {
      /* aborted iteration: a root move that already beat the previous best in this iteration is kept */
      if (P[14] && rootM[0] != res[0]) { res[0] = rootM[0]; res[3] = 1; res[4] = rootM[0]; }
      break;
    }
    sortRoot();
    prevScore = score;
    int pl = pvLen[0];
    if (!pl || pvTable[0] != rootM[0]) { pl = 1; res[4] = rootM[0]; }
    else for (int j = 0; j < pl; j++) res[4 + j] = pvTable[j];
    res[0] = rootM[0]; res[1] = depth; res[2] = nodes; res[3] = pl; resScore = score;
    js_progress(depth, score, nodes, res + 4, pl);
    if ((score < 0 ? -score : score) > MATE - MAXPLY && depth > 3) break;
    if (deadline > 0 && js_now() - t0 > (deadline - t0) * (P[15] ? P[15] / 100.0 : 0.55)) break;
    if (nRoot == 1 && depth >= 2) break;
  }
  res[2] = nodes;
  return res[0];
}
/* analyze: every root move with a full window; results in rootM/rootS (sorted) */
static i32 anaD[1000];
EXPORT(ana_moves) i32 *ana_moves(void) { return rootM; }
EXPORT(ana_scores) double *ana_scores(void) { return rootS; }
EXPORT(ana_depths) i32 *ana_depths(void) { return anaD; }
EXPORT(analyze) int analyze(double timeMs, int maxDepth, int nodeLim) {
  double t0 = js_now();
  static i32 legal[1000]; static double tmp[1000];
  nRoot = legalMoves(legal, 0);
  for (int i = 0; i < nRoot; i++) { rootM[i] = legal[i]; rootS[i] = 0; anaD[i] = 0; }
  if (!maxDepth) maxDepth = 30;
  stopFlag = 0; nodes = 0; deadline = timeMs > 0 ? t0 + timeMs : 0; nodeLimit = nodeLim;
  ttAge = (ttAge + 1) & 31;
  for (int depth = 1; depth <= maxDepth; depth++) {
    rootDepth = depth;
    int nt = 0;
    for (int i = 0; i < nRoot; i++) {
      doMove(rootM[i]);
      int chk = inCheck();
      double v = -search(depth - 1 + (chk ? 1 : 0), -INF, INF, 1, 1, 1);
      undoMove();
      if (stopFlag) break;
      tmp[nt++] = v;
    }
    if (stopFlag && depth > 1) break;
    for (int i = 0; i < nt; i++) { rootS[i] = tmp[i]; anaD[i] = depth; }
    /* stable sort, carrying depths */
    for (int i = 1; i < nRoot; i++) {
      i32 m = rootM[i], d = anaD[i]; double s = rootS[i]; int j = i - 1;
      while (j >= 0 && rootS[j] < s) { rootM[j + 1] = rootM[j]; rootS[j + 1] = rootS[j]; anaD[j + 1] = anaD[j]; j--; }
      rootM[j + 1] = m; rootS[j + 1] = s; anaD[j + 1] = d;
    }
    js_aprogress(depth, nRoot, rootM, rootS);
    if (stopFlag) break;
  }
  return nRoot;
}
EXPORT(get_nodes) int get_nodes(void) { return nodes; }

/* ------------------------------------------------------------------ position setup from JS */
static void computeHash(void) {
  i32 l = 0, h = 0;
  for (int s = 0; s < 81; s++) { int p = board[s]; if (p) { l ^= ZB_L[s * 32 + p]; h ^= ZB_H[s * 32 + p]; } }
  for (int c = 0; c < 2; c++) for (int t = 1; t <= 7; t++) for (int n = 1; n <= hand[c * 8 + t]; n++) { l ^= ZHD_L[(c * 8 + t) * 20 + n]; h ^= ZHD_H[(c * 8 + t) * 20 + n]; }
  if (side) { l ^= ZSIDE_L; h ^= ZSIDE_H; }
  hl = l; hh = h;
}
static i8 setupBuf[81 + 16 + 1];
EXPORT(setup_ptr) i8 *setup_ptr(void) { return setupBuf; }
/* setupBuf: board[81], hand[16], side */
EXPORT(set_position) void set_position(void) {
  for (int s = 0; s < 81; s++) board[s] = setupBuf[s];
  for (int i = 0; i < 16; i++) hand[i] = setupBuf[81 + i];
  side = setupBuf[97];
  king[0] = king[1] = -1;
  for (int s = 0; s < 81; s++) { int p = board[s]; if (typeOf(p) == OU) king[colorOf(p)] = s; }
  memset(pmask, 0, sizeof pmask); for (int s = 0; s < 81; s++) if (board[s]) SETB(colorOf(board[s]), s);
  computeHash(); refreshEval();
  sp = 0; hn = 0;
  histL[hn] = hl; histH[hn] = hh; histChk[hn] = inCheck() ? 1 : 0; hn++;
}
EXPORT(play_move) void play_move(int m) { doMove(m); histChk[hn - 1] = inCheck() ? 1 : 0; sp = 0; }
EXPORT(get_hash) i32 get_hash(int hi) { return hi ? hh : hl; }
EXPORT(get_eval) double get_eval(void) { return evaluate(); }

/* network: JS writes the float buffers via these pointers, then calls nn_enable(H) */
EXPORT(nue_w1_ptr) i16 *nue_w1_ptr(void) { return nueW1; }
EXPORT(nue_w2_ptr) i16 *nue_w2_ptr(void) { return nueW2; }
EXPORT(nue_b1_ptr) i32 *nue_b1_ptr(void) { return nueB1; }
EXPORT(nue_set_b2) void nue_set_b2(i32 b) { nueB2[0] = b; }
EXPORT(nue_b2_ptr) i32 *nue_b2_ptr(void) { return nueB2; }
EXPORT(nue_set_nb) void nue_set_nb(int n) { nueNB = n == NUE_NB ? NUE_NB : 1; }
EXPORT(nue_enable) void nue_enable(int on) { nueOn = on; refreshEval(); }
EXPORT(nn_w1_ptr) float *nn_w1_ptr(void) { return nnStore; }
EXPORT(nn_b1_ptr) float *nn_b1_ptr(void) { return nnb1; }
EXPORT(nn_w2t_ptr) double *nn_w2t_ptr(void) { return nnW2T; }
EXPORT(nn_b2_ptr) double *nn_b2_ptr(void) { return nnb2; }
EXPORT(nn_w3t_ptr) double *nn_w3t_ptr(void) { return nnW3T; }
EXPORT(nn_b3_ptr) double *nn_b3_ptr(void) { return nnb3; }
EXPORT(nn_w4_ptr) double *nn_w4_ptr(void) { return nnW4; }
EXPORT(nn_set_b4) void nn_set_b4(double b) { nnb4 = (float)b; }
EXPORT(nn_enable) void nn_enable(int H) { nnW1 = nnStore; nnH = H; nnOn = H > 0 && H <= 32; }

/* ------------------------------------------------------------------ init */
EXPORT(init) void init(void) {
  for (int i = 0; i < 81 * 8; i++) NB[i] = -1;
  for (int s = 0; s < 81; s++) {
    int r = s / 9, c = s % 9;
    for (int d = 0; d < 8; d++) { int rr = r + DR[d], cc = c + DC[d]; if (rr >= 0 && rr < 9 && cc >= 0 && cc < 9) NB[s * 8 + d] = rr * 9 + cc; }
    for (int col = 0; col < 2; col++) {
      int dr = col == 0 ? -2 : 2, nt = 0, nf = 0;
      for (int k = 0; k < 2; k++) {
        int dc = k ? 1 : -1;
        if (r + dr >= 0 && r + dr < 9 && c + dc >= 0 && c + dc < 9) KN_TO[col][s][nt++] = (r + dr) * 9 + c + dc;
        if (r - dr >= 0 && r - dr < 9 && c + dc >= 0 && c + dc < 9) KN_FROM[col][s][nf++] = (r - dr) * 9 + c + dc;
      }
      KN_TO_N[col][s] = nt; KN_FROM_N[col][s] = nf;
    }
  }
  static const u8 GOLD[6] = {0, 1, 2, 3, 4, 6};
  for (int t = 1; t <= 14; t++) {
    u8 st[8]; int ns = 0; u8 sl[8]; int nsl = 0;
    if (t == FU) st[ns++] = 1;
    else if (t == GI) { st[ns++] = 0; st[ns++] = 1; st[ns++] = 2; st[ns++] = 5; st[ns++] = 7; }
    else if (t == KI || t == TO || t == NY || t == NK || t == NG) for (int i = 0; i < 6; i++) st[ns++] = GOLD[i];
    else if (t == OU) for (int i = 0; i < 8; i++) st[ns++] = i;
    else if (t == UM) { st[ns++] = 1; st[ns++] = 3; st[ns++] = 4; st[ns++] = 6; }
    else if (t == RY) { st[ns++] = 0; st[ns++] = 2; st[ns++] = 5; st[ns++] = 7; }
    if (t == KY) sl[nsl++] = 1;
    else if (t == KA || t == UM) { sl[nsl++] = 0; sl[nsl++] = 2; sl[nsl++] = 5; sl[nsl++] = 7; }
    else if (t == HI || t == RY) { sl[nsl++] = 1; sl[nsl++] = 3; sl[nsl++] = 4; sl[nsl++] = 6; }
    for (int i = 0; i < ns; i++) { STEP[t * 8 + st[i]] = 1; STEP[(t + WF) * 8 + OPPD[st[i]]] = 1; }
    for (int i = 0; i < nsl; i++) { SLIDE[t * 8 + sl[i]] = 1; SLIDE[(t + WF) * 8 + OPPD[sl[i]]] = 1; }
  }
  for (int p = 0; p < 32; p++) { NDIRS[p] = 0; for (int d = 0; d < 8; d++) { if (STEP[p * 8 + d]) DIRS[p][NDIRS[p]++] = d; if (SLIDE[p * 8 + d]) DIRS[p][NDIRS[p]++] = d | 8; } }
  lmrInit(2.0);
  seed = 0x2545F491;
  for (int i = 0; i < 81 * 32; i++) { ZB_L[i] = rnd32(); ZB_H[i] = rnd32(); }
  for (int i = 0; i < 2 * 8 * 20; i++) { ZHD_L[i] = rnd32(); ZHD_H[i] = rnd32(); }
  ZSIDE_L = rnd32(); ZSIDE_H = rnd32();
}
EXPORT(reset_search) void reset_search(void) { memset(history, 0, sizeof history); memset(killers, 0, sizeof killers); }
