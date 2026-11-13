/*
 * Shogi engine search core in C for WebAssembly — a faithful port of the
 * Position / Searcher parts of engine.js (same move encoding, same evaluation,
 * same search), so results match the JavaScript engine move for move.
 *
 * Copyright 2026 core-calmdust — license not set yet (to be decided)
 */
typedef signed char i8;
typedef unsigned char u8;
typedef short i16;
typedef int i32;
typedef unsigned int u32;

#ifdef NATIVE   /* native build for the tools (tools/match/usimatch.c): libc + a wall clock */
#include <string.h>
#include <time.h>
#define EXPORT(name)
#ifdef MT   /* (tools/match/usimatch.c --threads: the multi-thread search of engine_mt.wasm on pthreads) */
#define TLS _Thread_local
#else
#define TLS
#endif
static double js_now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec * 1000.0 + t.tv_nsec / 1e6; }
static void js_progress(i32 depth, double score, i32 nodes, i32 *pv, i32 pvlen) { (void)depth; (void)score; (void)nodes; (void)pv; (void)pvlen; }
static void js_aprogress(i32 depth, i32 n, i32 *moves, double *scores) { (void)depth; (void)n; (void)moves; (void)scores; }
#else
#define EXPORT(name) __attribute__((export_name(#name)))
/* MT (engine_mt.wasm): several threads search together on one shared memory ("Lazy SMP"); per-thread state is TLS,
   the tables, the evaluation weights and the transposition table are shared. Without MT TLS is nothing (same build as before). */
#ifdef MT
#define TLS _Thread_local
#else
#define TLS
#endif
#define IMPORT(name) __attribute__((import_module("env"), import_name(#name)))

IMPORT(now) double js_now(void);
IMPORT(progress) void js_progress(i32 depth, double score, i32 nodes, i32 *pv, i32 pvlen);
IMPORT(aprogress) void js_aprogress(i32 depth, i32 n, i32 *moves, double *scores);

void *memset(void *d, int c, unsigned long n) { u8 *p = d; while (n--) *p++ = (u8)c; return d; }
void *memcpy(void *d, const void *s, unsigned long n) { u8 *p = d; const u8 *q = s; while (n--) *p++ = *q++; return d; }
void *memmove(void *d, const void *s, unsigned long n) { u8 *p = d; const u8 *q = s; if (p < q) while (n--) *p++ = *q++; else { p += n; q += n; while (n--) *--p = *--q; } return d; }
#endif

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
static i8 LDIR[81 * 81]; static u8 LDIST[81 * 81];   /* [a * 81 + b]: the direction (NB index) from a along a line to b, -1 if none; the number of steps */
static u32 LINEM[81][3];   /* the squares on the lines (8 directions) through a square, and the knight squares of both colours */
/* per piece code: directions in increasing order, high bit = slide */
static u8 DIRS[32][8], NDIRS[32];
#define inZone(col, s) ((col) == 0 ? (s) < 27 : (s) >= 54)
static inline int deadEnd0(int col, int t, int s) {
  int r = s / 9, rr = col == 0 ? r : 8 - r;
  if (t == FU || t == KY) return rr == 0;
  if (t == KE) return rr <= 1;
  return 0;
}
static u8 DEADT[2][16][81];   /* deadEnd as a table */
static u32 DROPM[2][8][3];    /* [colour][type]: the squares a piece of that type may be dropped on (not dead ends) */
static u32 FILEM[9][3];       /* the squares of a file */
#define deadEnd(col, t, s) DEADT[col][t][s]

/* zobrist: 64 independent bits per key (splitmix64), the low half in *_L and the high half in *_H.
   (Until 2026-11-14 both halves came from one xorshift32 stream, L then H. Xorshift is linear over GF(2), so every H was
   the same linear function of its L, and so was the XOR of any set of them: hh was a function of hl and the "64-bit" key
   held 32 bits. With the table indexed by 20 bits of hl and verified by hh, a probe that met another position's entry
   took it for its own once in 4096.) */
static unsigned long long zseed = 0x2545F4914F6CDD1DULL;
static unsigned long long rnd64(void) { unsigned long long z = (zseed += 0x9E3779B97F4A7C15ULL); z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9ULL; z = (z ^ (z >> 27)) * 0x94D049BB133111EBULL; return z ^ (z >> 31); }
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
static TLS i8 board[81], hand[16], king[2];
static TLS int side = 0;
static TLS i32 hl, hh;
static TLS i32 acc[2];
static TLS i16 kidx[2]; static TLS u8 mir[2];
static TLS i8 stCap[NST]; static TLS i32 stHL[NST], stHH[NST], stA0[NST], stA1[NST];
static TLS int sp = 0;
static TLS i32 histL[NST], histH[NST]; static TLS u8 histChk[NST];
static TLS int hn = 0;
static TLS float nnA[2 * NN_MAXH];
static TLS float nnSt[NST * 2 * 32];
/* NNUE (chess-style): (2534 -> 256) x 2 perspectives -> 1, SCReLU; int16 weights (x QA), int32 accumulators */
#ifdef __wasm_simd128__
#include <wasm_simd128.h>
#endif
#ifndef NUE_H
#define NUE_H 256          /* hidden size; engine_simd512.wasm is built with -DNUE_H=512 */
#endif
#ifdef NUE_KB
/* HalfKP-style test build (not shipped; tools/nnue/TRAIN.md): the first layer is chosen by the bucket of the perspective's own
   king square (NUE_KB buckets, the map comes with the net, nueKMap), so the input is NUE_KB copies of the 2534 features.
   Moving the king into another bucket refreshes that perspective's accumulator. The normal builds do not define NUE_KB. */
#define NUE_IN (NUE_KB * 2534)
#define NUEF i32
#else
#define NUE_IN 2534
#define NUEF i16
#endif
#define NUE_QA 127
#define NUE_QB 64
static int nueOn = 0, nueSum32 = 0;
#define NUE_NB 8
static int nueNB = 1;
static i16 nueW1[NUE_IN * NUE_H], nueW2[NUE_NB * 2 * NUE_H];
static i32 nueB1[NUE_H], nueB2[NUE_NB];
/* output bucket: number of pieces in hand (both sides) */
static inline int nueBucket(void) { if (nueNB == 1) return 0; int t = 0; for (int i = 1; i < 8; i++) t += hand[i] + hand[8 + i]; return t < 1 ? 0 : t < 3 ? 1 : t < 5 ? 2 : t < 7 ? 3 : t < 9 ? 4 : t < 12 ? 5 : t < 16 ? 6 : 7; }
/* accumulators, one per search-stack level (nueAc[sp]), updated lazily: doMove only records which features change
   (nueD*), and evaluate() brings the nearest computed ancestor up to the current level, child = parent - removed + added
   in one pass. Undo costs nothing (sp--), and moves whose position is never evaluated cost no accumulator work. */
static TLS i16 nueAc[NST + 1][2][NUE_H];
static TLS u8 nueOk[NST + 1];
static TLS NUEF nueDA[NST][2][2], nueDR[NST][2][2];   /* [level][persp][k]: features added / removed by the move at that level (-1: none) */
static TLS u8 nueDN[NST];                           /* number of (add, remove) pairs: 0 (null move), 1, 2 (capture) */
static i16 nueZero[NUE_H];
#define nueA (nueAc[sp])
#ifdef NUE_KB
static u8 nueKMap[84];          /* own king square (the perspective's frame, 0..80) -> bucket */
static i32 nueKOff[2][81];      /* [persp][king square] -> bucket * 2534 */
static TLS u8 nueRF[NST];       /* [level]: bit c = the move at that level moved king c into another bucket */
static inline int nueKO(int persp) { int k = king[persp]; return k < 0 ? 0 : nueKOff[persp][k]; }
static inline int nueB(int persp, int p, int s) { return nueKO(persp) + ((colorOf(p) != persp) * 14 + typeOf(p) - 1) * 81 + (persp ? 80 - s : s); }
static inline int nueHd(int persp, int hc, int t, int n) { return n > 19 ? -1 : nueKO(persp) + 2268 + ((hc != persp) * 7 + t - 1) * 19 + n - 1; }
#else
static inline int nueB(int persp, int p, int s) { return ((colorOf(p) != persp) * 14 + typeOf(p) - 1) * 81 + (persp ? 80 - s : s); }
static inline int nueHd(int persp, int hc, int t, int n) { return n > 19 ? -1 : 2268 + ((hc != persp) * 7 + t - 1) * 19 + n - 1; }
#endif
static inline void nueAdd(int persp, int f) { if (f < 0) return; i16 *a = nueA[persp]; const i16 *w = nueW1 + f * NUE_H; for (int j = 0; j < NUE_H; j++) a[j] += w[j]; }
static inline const i16 *nueRow(int f) { return f < 0 ? nueZero : nueW1 + f * NUE_H; }
/* level i -> i + 1 */
static void nueStep(int i) {
  const int n = nueDN[i];
  for (int c = 0; c < 2; c++) {
    const i16 *src = nueAc[i][c]; i16 *dst = nueAc[i + 1][c];
    if (n == 0) { memcpy(dst, src, sizeof(i16) * NUE_H); continue; }
    const i16 *a1 = nueRow(nueDA[i][c][0]), *r1 = nueRow(nueDR[i][c][0]);
    if (n == 1) { for (int j = 0; j < NUE_H; j++) dst[j] = (i16)(src[j] + a1[j] - r1[j]); continue; }
    const i16 *a2 = nueRow(nueDA[i][c][1]), *r2 = nueRow(nueDR[i][c][1]);
    for (int j = 0; j < NUE_H; j++) dst[j] = (i16)(src[j] + a1[j] - r1[j] + a2[j] - r2[j]);
  }
  nueOk[i + 1] = 1;
}
#ifdef NUE_KB
static void nueRefreshC(int c, i16 *a);
/* level i -> i + 1, one perspective */
static void nueStepC(int i, int c) {
  const int n = nueDN[i];
  const i16 *src = nueAc[i][c]; i16 *dst = nueAc[i + 1][c];
  if (n == 0) { memcpy(dst, src, sizeof(i16) * NUE_H); return; }
  const i16 *a1 = nueRow(nueDA[i][c][0]), *r1 = nueRow(nueDR[i][c][0]);
  if (n == 1) { for (int j = 0; j < NUE_H; j++) dst[j] = (i16)(src[j] + a1[j] - r1[j]); return; }
  const i16 *a2 = nueRow(nueDA[i][c][1]), *r2 = nueRow(nueDR[i][c][1]);
  for (int j = 0; j < NUE_H; j++) dst[j] = (i16)(src[j] + a1[j] - r1[j] + a2[j] - r2[j]);
}
/* a perspective whose king changed bucket on the way from the computed ancestor is refreshed from the current board
   (the deltas recorded before the king move are in the old bucket's rows); the other one is rolled forward */
static inline void nueSync(void) {
  if (nueOk[sp]) return;
  int k = sp - 1; while (k > 0 && !nueOk[k]) k--;
  int rf = 0; for (int i = k; i < sp; i++) rf |= nueRF[i];
  if (!rf) { for (int i = k; i < sp; i++) nueStep(i); return; }
  for (int c = 0; c < 2; c++) {
    if ((rf >> c) & 1) nueRefreshC(c, nueAc[sp][c]);
    else for (int i = k; i < sp; i++) nueStepC(i, c);
  }
  nueOk[sp] = 1;
}
#else
static inline void nueSync(void) {
  if (nueOk[sp]) return;
  int k = sp - 1; while (k > 0 && !nueOk[k]) k--;
  for (int i = k; i < sp; i++) nueStep(i);
}
#endif

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
#ifdef NUE_KB
static void nueRefreshC(int c, i16 *a) {
  for (int j = 0; j < NUE_H; j++) a[j] = (i16)nueB1[j];
  for (int s = 0; s < 81; s++) if (board[s]) { const i16 *w = nueW1 + nueB(c, board[s], s) * NUE_H; for (int j = 0; j < NUE_H; j++) a[j] += w[j]; }
  for (int hc = 0; hc < 2; hc++) for (int t = 1; t <= 7; t++) for (int n = 1; n <= hand[hc * 8 + t]; n++) { int f = nueHd(c, hc, t, n); if (f < 0) continue; const i16 *w = nueW1 + f * NUE_H; for (int j = 0; j < NUE_H; j++) a[j] += w[j]; }
}
#endif
static void nueRefresh(void) {
  nueOk[sp] = 1;
  for (int c = 0; c < 2; c++) {
    for (int j = 0; j < NUE_H; j++) nueA[c][j] = (i16)nueB1[j];
    for (int s = 0; s < 81; s++) if (board[s]) nueAdd(c, nueB(c, board[s], s));
    for (int hc = 0; hc < 2; hc++) for (int t = 1; t <= 7; t++) for (int n = 1; n <= hand[hc * 8 + t]; n++) nueAdd(c, nueHd(c, hc, t, n));
  }
}
static double nueEval(void) {
  nueSync();
  const i16 *a = nueA[side], *b = nueA[side ^ 1];
  const int bk = nueBucket(); const i16 *w2 = nueW2 + bk * 2 * NUE_H;
  long long sum = 0;
#ifdef __wasm_simd128__
  /* the same sums as below (blocks of 16 per side in int32, then int64), 8 lanes at a time: x = clamp(acc, 0, QA),
     x*x fits int16 (QA^2 = 16129), and i32x4_dot_i16x8 multiplies by the weights and adds neighbouring pairs */
  if (nueSum32) {
    /* small output weights (checked when the net is enabled): no int32 lane can overflow over the whole sum, so it stays in
       int32 and gives the same total as the blockwise int64 sum below */
    const v128_t lo = wasm_i16x8_splat(0), hi = wasm_i16x8_splat(NUE_QA);
    v128_t s0 = wasm_i32x4_splat(0), s1 = wasm_i32x4_splat(0);
    for (int i0 = 0; i0 < NUE_H; i0 += 16) {
      v128_t xa0 = wasm_i16x8_min(wasm_i16x8_max(wasm_v128_load(a + i0), lo), hi), xa1 = wasm_i16x8_min(wasm_i16x8_max(wasm_v128_load(a + i0 + 8), lo), hi);
      v128_t xb0 = wasm_i16x8_min(wasm_i16x8_max(wasm_v128_load(b + i0), lo), hi), xb1 = wasm_i16x8_min(wasm_i16x8_max(wasm_v128_load(b + i0 + 8), lo), hi);
      s0 = wasm_i32x4_add(s0, wasm_i32x4_add(wasm_i32x4_dot_i16x8(wasm_i16x8_mul(xa0, xa0), wasm_v128_load(w2 + i0)), wasm_i32x4_dot_i16x8(wasm_i16x8_mul(xa1, xa1), wasm_v128_load(w2 + i0 + 8))));
      s1 = wasm_i32x4_add(s1, wasm_i32x4_add(wasm_i32x4_dot_i16x8(wasm_i16x8_mul(xb0, xb0), wasm_v128_load(w2 + NUE_H + i0)), wasm_i32x4_dot_i16x8(wasm_i16x8_mul(xb1, xb1), wasm_v128_load(w2 + NUE_H + i0 + 8))));
    }
    v128_t t = wasm_i32x4_add(s0, s1);
    sum = (long long)wasm_i32x4_extract_lane(t, 0) + wasm_i32x4_extract_lane(t, 1) + wasm_i32x4_extract_lane(t, 2) + wasm_i32x4_extract_lane(t, 3);
  } else {
    const v128_t lo = wasm_i16x8_splat(0), hi = wasm_i16x8_splat(NUE_QA);
    v128_t s64 = wasm_i64x2_splat(0);
    for (int i0 = 0; i0 < NUE_H; i0 += 16) {
      v128_t xa0 = wasm_i16x8_min(wasm_i16x8_max(wasm_v128_load(a + i0), lo), hi), xa1 = wasm_i16x8_min(wasm_i16x8_max(wasm_v128_load(a + i0 + 8), lo), hi);
      v128_t xb0 = wasm_i16x8_min(wasm_i16x8_max(wasm_v128_load(b + i0), lo), hi), xb1 = wasm_i16x8_min(wasm_i16x8_max(wasm_v128_load(b + i0 + 8), lo), hi);
      v128_t pa = wasm_i32x4_add(wasm_i32x4_dot_i16x8(wasm_i16x8_mul(xa0, xa0), wasm_v128_load(w2 + i0)), wasm_i32x4_dot_i16x8(wasm_i16x8_mul(xa1, xa1), wasm_v128_load(w2 + i0 + 8)));
      v128_t pb = wasm_i32x4_add(wasm_i32x4_dot_i16x8(wasm_i16x8_mul(xb0, xb0), wasm_v128_load(w2 + NUE_H + i0)), wasm_i32x4_dot_i16x8(wasm_i16x8_mul(xb1, xb1), wasm_v128_load(w2 + NUE_H + i0 + 8)));
      s64 = wasm_i64x2_add(s64, wasm_i64x2_add(wasm_i64x2_extend_low_i32x4(pa), wasm_i64x2_extend_high_i32x4(pa)));
      s64 = wasm_i64x2_add(s64, wasm_i64x2_add(wasm_i64x2_extend_low_i32x4(pb), wasm_i64x2_extend_high_i32x4(pb)));
    }
    sum = wasm_i64x2_extract_lane(s64, 0) + wasm_i64x2_extract_lane(s64, 1);
  }
  if (0)
#endif
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
/* the attack tests scan the 8 rays from sq (RAYT: the squares outward, -1 ends) for the first piece; A1[by][p * 8 + dd]:
   piece p is of colour by and reaches one step in direction dd, AS[by][...]: it slides that way */
static i8 RAYT[81 * 8][9];
static u8 A1[2][32 * 8], AS[2][32 * 8];
static int attacked(int sq, int by) {
  const u8 *a1 = A1[by], *as = AS[by];
  for (int d = 0; d < 8; d++) {
    const i8 *r = RAYT[sq * 8 + d]; int s = r[0]; if (s < 0) continue;
    int p = board[s], dd = OPPD[d];
    if (p) { if (a1[p * 8 + dd]) return 1; continue; }
    while ((s = *++r) >= 0) { p = board[s]; if (p) { if (as[p * 8 + dd]) return 1; break; } }
  }
  int kn = KE + (by ? WF : 0);
  for (int i = 0; i < KN_FROM_N[by][sq]; i++) if (board[KN_FROM[by][sq][i]] == kn) return 1;
  return 0;
}
static int attackers(int sq, int by, int *res) {
  const u8 *a1 = A1[by], *as = AS[by];
  int n = 0;
  for (int d = 0; d < 8; d++) {
    const i8 *r = RAYT[sq * 8 + d]; int s = r[0]; if (s < 0) continue;
    int p = board[s], dd = OPPD[d];
    if (p) { if (a1[p * 8 + dd]) res[n++] = s; continue; }
    while ((s = *++r) >= 0) { p = board[s]; if (p) { if (as[p * 8 + dd]) res[n++] = s; break; } }
  }
  int kn = KE + (by ? WF : 0);
  for (int i = 0; i < KN_FROM_N[by][sq]; i++) if (board[KN_FROM[by][sq][i]] == kn) res[n++] = KN_FROM[by][sq][i];
  return n;
}
static int lva(int sq, int by) {
  const u8 *a1 = A1[by], *as = AS[by];
  int best = -1, bv = 1000000000;
  for (int d = 0; d < 8; d++) {
    const i8 *r = RAYT[sq * 8 + d]; int s = r[0]; if (s < 0) continue;
    int p = board[s], dd = OPPD[d];
    if (p) { if (a1[p * 8 + dd]) { int v = VALUE[typeOf(p)]; if (v < bv) { bv = v; best = s; } } continue; }
    while ((s = *++r) >= 0) { p = board[s]; if (p) { if (as[p * 8 + dd]) { int v = VALUE[typeOf(p)]; if (v < bv) { bv = v; best = s; } } break; } }
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
/* an attack on the king on k by colour by, opened by moving a piece from `from` to `to` (a discovered attack): the first
   piece from k in the direction of `from`, if `to` is not on that ray. Exact when k was not attacked before the move. */
static inline int discAtk(int k, int from, int to, int by) {
  int d = LDIR[k * 81 + from]; if (d < 0 || LDIR[k * 81 + to] == d) return 0;
  const i8 *r = RAYT[k * 8 + d]; int x; while ((x = *r++) >= 0 && !board[x]) {}
  if (x < 0) return 0;
  int p = board[x]; return colorOf(p) == by && SLIDE[p * 8 + OPPD[d]];
}
static TLS i32 stMove[NST];
static TLS i16 ckS[NST];   /* continuation-history key of the move made at that level: (type after the move - 1) * 81 + to; -1 for a null move */
/* the move m just made (by side ^ 1) checks the side to move: the moved piece attacks the king, or it opened a line. Exact
   when that king was not attacked before m (true in any position reached by legal moves; chkFast is off otherwise). */
static TLS int chkFast;
static int givesChk(int m) {
  int us = side ^ 1, ek = king[side]; if (ek < 0) return 0;
  int f = m & 127, to = (m >> 7) & 127, np = board[to], d = LDIR[to * 81 + ek];
  if (d >= 0) {
    if (LDIST[to * 81 + ek] == 1) { if (STEP[np * 8 + d] || SLIDE[np * 8 + d]) return 1; }
    else if (SLIDE[np * 8 + d]) { const i8 *r = RAYT[to * 8 + d]; int x; while ((x = *r++) != ek && !board[x]) {} if (x == ek) return 1; }
  } else if (typeOf(np) == KE) { for (int i = 0; i < KN_FROM_N[us][ek]; i++) if (KN_FROM[us][ek][i] == to) return 1; }
  return f <= 80 && discAtk(ek, f, to, us);
}
/* "the side to move is in check", cached per search-stack level (doMove / doNull / setup reset it; undo keeps the parent's) */
static TLS i8 chkC[NST + 1];
static inline int inCheck(void) {
  int c = chkC[sp];
  if (c < 0) { int m = sp > 0 ? stMove[sp - 1] : 0; c = chkFast && m ? givesChk(m) : inCheckC(side); chkC[sp] = (i8)c; }
  return c;
}
/* in check: the squares where a move other than a king move can end and be legal (capture of the single checker or a
   square between it and the king; none in a double check). evOK(m) false means m surely leaves the king in check. */
typedef struct { u32 m[3]; int k; } EvMask;
static void evMask(EvMask *e) {
  int us = side, k = king[us], chk[24], nc = attackers(k, us ^ 1, chk);
  e->m[0] = e->m[1] = e->m[2] = 0; e->k = k;
  if (nc != 1) return;
  int cs = chk[0]; e->m[cs / 27] |= 1u << (cs % 27);
  int d = LDIR[k * 81 + cs];
  if (d >= 0 && typeOf(board[cs]) != KE) for (int x = NB[k * 8 + d]; x != cs; x = NB[x * 8 + d]) e->m[x / 27] |= 1u << (x % 27);
}
static inline int evOK(const EvMask *e, int m) {
  int f = m & 127, t = (m >> 7) & 127;
  if (f == e->k) return 1;
  return (e->m[t / 27] >> (t % 27)) & 1;
}
/* for a move that passed evOK, before making it: 0 = illegal, 1 = legal, 2 = to be tested after making it (king moves and
   pawn drops: legalAfter). A capture of the single checker or an interposition leaves the king attacked only through a
   line the moved piece opened (the first piece from the king past `from` is an enemy slider). */
static inline int evLegal(const EvMask *e, int m) {
  int f = m & 127, t = (m >> 7) & 127;
  if (f == e->k || f == 80 + FU) return 2;
  if (f > 80) return 1;
  int k = e->k, d = LDIR[k * 81 + f];
  if (d < 0 || LDIR[k * 81 + t] == d) return 1;
  const i8 *r = RAYT[k * 8 + d]; int x; while ((x = *r++) >= 0 && (x == f || !board[x])) {}
  if (x < 0) return 1;
  int p = board[x]; return colorOf(p) == (side ^ 1) && SLIDE[p * 8 + OPPD[d]] ? 0 : 1;
}
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
static TLS u32 pmask[2][3];
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
        const i8 *r = RAYT[s * 8 + d]; int to;
        while ((to = *r++) >= 0) {
          int q = board[to];
          if (q) { if (colorOf(q) != us) n = addMove(list, n, s, to, t, cp, us, q, capOnly, full); break; }
          n = addMove(list, n, s, to, t, cp, us, 0, capOnly, full);
        }
      }
    }
    if (t == KE) {
      for (int i = 0; i < KN_TO_N[us][s]; i++) { int to = KN_TO[us][s][i], q = board[to]; if (!q || colorOf(q) != us) n = addMove(list, n, s, to, t, 1, us, q, capOnly, full); }
    }
  }
  if (capOnly) return n;
  int hb = us * 8;
  int any = 0; for (int t = 1; t <= 7; t++) any |= hand[hb + t];
  if (!any) return n;
  /* drops: by type, then square (ascending), on the empty squares that are no dead end, pawns not on a file with one */
  u32 emp[3]; for (int w = 0; w < 3; w++) emp[w] = ~(pmask[0][w] | pmask[1][w]) & 0x7ffffffu;
  for (int t = 1; t <= 7; t++) {
    if (!hand[hb + t]) continue;
    int from = 80 + t;
    u32 ok[3]; for (int w = 0; w < 3; w++) ok[w] = emp[w] & DROPM[us][t][w];
    if (t == FU) {
      int fp = FU + (us ? WF : 0);
      for (int w = 0; w < 3; w++) for (u32 bits = pmask[us][w]; bits; bits &= bits - 1) {
        int s = w * 27 + __builtin_ctz(bits);
        if (board[s] == fp) { const u32 *f = FILEM[s % 9]; ok[0] &= ~f[0]; ok[1] &= ~f[1]; ok[2] &= ~f[2]; }
      }
    }
    for (int w = 0; w < 3; w++) for (u32 bits = ok[w]; bits; bits &= bits - 1) list[n++] = from | ((w * 27 + __builtin_ctz(bits)) << 7);
  }
  return n;
}
/* in check (e from evMask): the moves of gen(list, mode) that pass evOK — king moves, then captures of the checker and
   interpositions found from the target squares (their attackers), then drops between */
static int genEv(i32 *list, int mode, const EvMask *e) {
#ifdef FULL_EVASIONS   /* test build: the full move list as before 2026-11 (the search then matches the old engine node for node) */
  (void)e; return gen(list, mode);
#endif
  int us = side, n = 0, full = mode == 2, capOnly = mode == 1, k = e->k, at[24];
  for (int d = 0; d < 8; d++) {
    int to = NB[k * 8 + d]; if (to < 0) continue;
    int q = board[to]; if (!q || colorOf(q) != us) n = addMove(list, n, k, to, OU, 0, us, q, capOnly, full);
  }
  for (int w = 0; w < 3; w++) for (u32 bits = e->m[w]; bits; bits &= bits - 1) {
    int to = w * 27 + __builtin_ctz(bits), q = board[to], na = attackers(to, us, at);
    for (int i = 0; i < na; i++) { int f = at[i], t = typeOf(board[f]); if (t != OU) n = addMove(list, n, f, to, t, CAN_PROMOTE[t], us, q, capOnly, full); }
  }
  if (capOnly) return n;
  int hb = us * 8, any = 0; for (int t = 1; t <= 7; t++) any |= hand[hb + t];
  if (!any) return n;
  u32 emp[3]; for (int w = 0; w < 3; w++) emp[w] = ~(pmask[0][w] | pmask[1][w]) & 0x7ffffffu & e->m[w];
  if (!(emp[0] | emp[1] | emp[2])) return n;
  for (int t = 1; t <= 7; t++) {
    if (!hand[hb + t]) continue;
    int from = 80 + t;
    u32 ok[3]; for (int w = 0; w < 3; w++) ok[w] = emp[w] & DROPM[us][t][w];
    if (t == FU) {
      int fp = FU + (us ? WF : 0);
      for (int w = 0; w < 3; w++) for (u32 bits = pmask[us][w]; bits; bits &= bits - 1) {
        int s = w * 27 + __builtin_ctz(bits);
        if (board[s] == fp) { const u32 *f = FILEM[s % 9]; ok[0] &= ~f[0]; ok[1] &= ~f[1]; ok[2] &= ~f[2]; }
      }
    }
    for (int w = 0; w < 3; w++) for (u32 bits = ok[w]; bits; bits &= bits - 1) list[n++] = from | ((w * 27 + __builtin_ctz(bits)) << 7);
  }
  return n;
}

/* the moves of gen(list, 0) that capture nothing and pass mayCheck (below), in the same order (quiet checks of qsearch) */
static inline int directChk(int np, int to, int ek, int us) {
  int d = LDIR[to * 81 + ek];
  if (d >= 0 && (SLIDE[np * 8 + d] || (LDIST[to * 81 + ek] == 1 && STEP[np * 8 + d]))) return 1;
  if (typeOf(np) == KE) for (int i = 0; i < KN_FROM_N[us][ek]; i++) if (KN_FROM[us][ek][i] == to) return 1;
  return 0;
}
static inline int addChk(i32 *list, int n, int s, int to, int p, int t, int cp, int us, int disc, int ek) {
  if (cp && (inZone(us, s) || inZone(us, to))) {
    if (disc || directChk(p + 8, to, ek, us)) list[n++] = s | (to << 7) | (1 << 14);
    if (!deadEnd(us, t, to) && (t == KY || t == KE || t == GI) && (disc || directChk(p, to, ek, us))) list[n++] = s | (to << 7);
  } else if (disc || directChk(p, to, ek, us)) list[n++] = s | (to << 7);
  return n;
}
static int genChecks(i32 *list) {
  int us = side, n = 0, ek = king[us ^ 1];
  if (ek < 0) { int all = gen(list, 0); for (int i = 0; i < all; i++) if (!board[(list[i] >> 7) & 127]) list[n++] = list[i]; return n; }
  for (int w = 0; w < 3; w++) for (u32 bits = pmask[us][w]; bits; bits &= bits - 1) {
    int s = w * 27 + __builtin_ctz(bits);
    int p = board[s];
    int t = typeOf(p), cp = CAN_PROMOTE[t], nd = NDIRS[p], disc = LDIR[s * 81 + ek] >= 0;
    for (int k = 0; k < nd; k++) {
      int dd = DIRS[p][k], d = dd & 7;
      if (!(dd & 8)) {
        int to = NB[s * 8 + d];
        if (to >= 0 && !board[to]) n = addChk(list, n, s, to, p, t, cp, us, disc, ek);
      } else {
        const i8 *r = RAYT[s * 8 + d]; int to;
        while ((to = *r++) >= 0 && !board[to]) n = addChk(list, n, s, to, p, t, cp, us, disc, ek);
      }
    }
    if (t == KE) {
      for (int i = 0; i < KN_TO_N[us][s]; i++) { int to = KN_TO[us][s][i]; if (!board[to]) n = addChk(list, n, s, to, p, t, 1, us, disc, ek); }
    }
  }
  int hb = us * 8, any = 0; for (int t = 1; t <= 7; t++) any |= hand[hb + t];
  if (!any) return n;
  u32 cand[3]; for (int w = 0; w < 3; w++) cand[w] = ~(pmask[0][w] | pmask[1][w]) & LINEM[ek][w] & 0x7ffffffu;
  for (int t = 1; t <= 7; t++) {
    if (!hand[hb + t]) continue;
    int from = 80 + t, np = t + (us ? WF : 0);
    u32 ok[3]; for (int w = 0; w < 3; w++) ok[w] = cand[w] & DROPM[us][t][w];
    if (t == FU) for (int w = 0; w < 3; w++) for (u32 bits = pmask[us][w]; bits; bits &= bits - 1) {
      int s = w * 27 + __builtin_ctz(bits);
      if (board[s] == np) { const u32 *f = FILEM[s % 9]; ok[0] &= ~f[0]; ok[1] &= ~f[1]; ok[2] &= ~f[2]; }
    }
    for (int w = 0; w < 3; w++) for (u32 bits = ok[w]; bits; bits &= bits - 1) {
      int s = w * 27 + __builtin_ctz(bits);
      if (directChk(np, s, ek, us)) list[n++] = from | (s << 7);
    }
  }
  return n;
}

/* make / unmake */
static void doMove(int m) {
  int us = side, them = us ^ 1, s0 = sp;
  stMove[s0] = m; stHL[s0] = hl; stHH[s0] = hh; stA0[s0] = acc[0]; stA1[s0] = acc[1];
  int from = m & 127, to = (m >> 7) & 127;
  ckS[s0] = (i16)(((from > 80 ? from - 80 : typeOf(board[from]) + (((m >> 14) & 1) << 3)) - 1) * 81 + to);
  i32 l = hl ^ ZSIDE_L, h = hh ^ ZSIDE_H;
  i32 a0 = acc[0], a1 = acc[1];
  int nn = nnOn;
  if (nn) memcpy(nnSt + s0 * 2 * nnH, nnA, sizeof(float) * 2 * nnH);
  int nue = nueOn, nk = 0, lin = !nn && !nue;   /* lin: the linear evaluation is in use (its accumulators are skipped otherwise) */
  if (nue) nueOk[s0 + 1] = 0;
#ifdef NUE_KB
  nueRF[s0] = 0;
#endif
  chkC[s0 + 1] = -1;
  if (from > 80) {
    int t = from - 80, p = t + (us ? WF : 0), hi = us * 8 + t, n = hand[hi];
    l ^= ZHD_L[hi * 20 + n]; h ^= ZHD_H[hi * 20 + n];
    if (nn) { nnHand(0, us, t, n, -1); nnHand(1, us, t, n, -1); nnPiece(0, p, to, 1); nnPiece(1, p, to, 1); }
    else if (lin) { a0 -= hv_(0, us, t, n); a1 -= hv_(1, us, t, n); a0 += pv_(0, p, to); a1 += pv_(1, p, to); }
    if (nue) { for (int c = 0; c < 2; c++) { nueDR[s0][c][0] = (NUEF)nueHd(c, us, t, n); nueDA[s0][c][0] = (NUEF)nueB(c, p, to); } nk = 1; }
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
      if (nue) { for (int c = 0; c < 2; c++) { nueDR[s0][c][1] = (NUEF)nueB(c, cap, to); nueDA[s0][c][1] = (NUEF)nueHd(c, us, ct, n); } nk = 2; }
      if (typeOf(cap) != OU) {
        if (nn) {
          if (!(isKing && us == 0)) { nnPiece(0, cap, to, -1); nnHand(0, us, ct, n, 1); }
          if (!(isKing && us == 1)) { nnPiece(1, cap, to, -1); nnHand(1, us, ct, n, 1); }
        } else if (lin) {
          if (!(isKing && us == 0)) { a0 -= pv_(0, cap, to); a0 += hv_(0, us, ct, n); }
          if (!(isKing && us == 1)) { a1 -= pv_(1, cap, to); a1 += hv_(1, us, ct, n); }
        }
      }
    }
    l ^= ZB_L[from * 32 + p] ^ ZB_L[to * 32 + np]; h ^= ZB_H[from * 32 + p] ^ ZB_H[to * 32 + np];
    board[from] = 0; board[to] = np; CLRB(us, from); SETB(us, to); if (cap) CLRB(them, to);
    if (nue) { for (int c = 0; c < 2; c++) { nueDR[s0][c][0] = (NUEF)nueB(c, p, from); nueDA[s0][c][0] = (NUEF)nueB(c, np, to); } if (!nk) nk = 1; }
#ifdef NUE_KB
    if (nue && isKing && nueKOff[us][from] != nueKOff[us][to]) nueRF[s0] = (u8)(1 << us);
#endif
    if (nn) {
      if (isKing) { king[us] = to; nnRefresh(us); nnPiece(them, p, from, -1); nnPiece(them, np, to, 1); }
      else { nnPiece(0, p, from, -1); nnPiece(0, np, to, 1); nnPiece(1, p, from, -1); nnPiece(1, np, to, 1); }
    } else if (isKing) {
      king[us] = to;
      if (!lin) {}
      else if (us == 0) { a0 = fullAcc(0); a1 += pv_(1, np, to) - pv_(1, p, from); }
      else { a1 = fullAcc(1); a0 += pv_(0, np, to) - pv_(0, p, from); }
    } else if (lin) {
      a0 += pv_(0, np, to) - pv_(0, p, from);
      a1 += pv_(1, np, to) - pv_(1, p, from);
    }
  }
  acc[0] = a0; acc[1] = a1; hl = l; hh = h;
  nueDN[s0] = (u8)nk;
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
}
static void doNull(void) {
  int s0 = sp;
  stMove[s0] = 0; ckS[s0] = -1; stHL[s0] = hl; stHH[s0] = hh; stA0[s0] = acc[0]; stA1[s0] = acc[1];
  nueDN[s0] = 0; nueOk[s0 + 1] = 0; chkC[s0 + 1] = -1;
#ifdef NUE_KB
  nueRF[s0] = 0;
#endif
  hl ^= ZSIDE_L; hh ^= ZSIDE_H; side ^= 1; sp++;
  histL[hn] = 0x7fffffff; histH[hn] = 0; histChk[hn] = 0; hn++;
}
static void undoNull(void) { int s0 = --sp; hn--; side ^= 1; hl = stHL[s0]; hh = stHH[s0]; }

static TLS i32 hlBuf[1000];
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
  return !discAtk(k, f, to, side);
}
static TLS i32 lmBuf[1000];
static int legalMoves(i32 *out, int full) {
  int n = gen(lmBuf, full ? 2 : 0), k = 0;
  for (int i = 0; i < n; i++) { int m = lmBuf[i]; doMove(m); int ok = lastMoveLegal(m); undoMove(); if (ok) out[k++] = m; }
  return k;
}
/* a quick superset test of "move m (side to move) gives check": the moved / dropped piece attacks the enemy king from its new
   square (sliders: any line, blockers ignored), or the piece leaves a line through the enemy king (a discovered check);
   false means it surely does not give check, so the quiet-check scan of qsearch skips making the move */
static int mayCheck(int m) {
  int us = side, ek = king[us ^ 1]; if (ek < 0) return 1;
  int from = m & 127, to = (m >> 7) & 127, np;
  if (from > 80) np = from - 80 + (us ? WF : 0);
  else { int p = board[from]; np = (m >> 14) & 1 ? p + 8 : p; if (LDIR[from * 81 + ek] >= 0) return 1; }
  int d = LDIR[to * 81 + ek];
  if (d >= 0) { if (SLIDE[np * 8 + d] || (LDIST[to * 81 + ek] == 1 && STEP[np * 8 + d])) return 1; }
  if (typeOf(np) == KE) for (int i = 0; i < KN_FROM_N[us][ek]; i++) if (KN_FROM[us][ek][i] == to) return 1;
  return 0;
}
/* "move m (side to move) gives check", decided before making it: the moved / dropped piece attacks the enemy king from its
   new square (lines through the vacated square count as open), or it leaves a line between the king and a slider of ours.
   Exact when the enemy king is not attacked now (chkFast); otherwise it falls back to the superset mayCheck. */
static int givesCheckPre(int m) {
  if (!chkFast) return mayCheck(m);
  int us = side, ek = king[us ^ 1]; if (ek < 0) return 1;
  int from = m & 127, to = (m >> 7) & 127, np;
  if (from > 80) np = from - 80 + (us ? WF : 0);
  else { int p = board[from]; np = (m >> 14) & 1 ? p + 8 : p; }
  int d = LDIR[to * 81 + ek];
  if (d >= 0) {
    if (LDIST[to * 81 + ek] == 1) { if (STEP[np * 8 + d] || SLIDE[np * 8 + d]) return 1; }
    else if (SLIDE[np * 8 + d]) { const i8 *r = RAYT[to * 8 + d]; int x; while ((x = *r++) != ek && (x == from || !board[x])) {} if (x == ek) return 1; }
  } else if (typeOf(np) == KE) { for (int i = 0; i < KN_FROM_N[us][ek]; i++) if (KN_FROM[us][ek][i] == to) return 1; }
  if (from > 80) return 0;
  int d2 = LDIR[ek * 81 + from]; if (d2 < 0 || LDIR[ek * 81 + to] == d2) return 0;
  const i8 *r = RAYT[ek * 8 + d2]; int x; while ((x = *r++) >= 0 && (x == from || !board[x])) {}
  if (x < 0) return 0;
  int p = board[x]; return colorOf(p) == us && SLIDE[p * 8 + OPPD[d2]];
}
static int mate1(i32 *buf) {
  int us = side, ek = king[us ^ 1]; if (ek < 0) return 0;
  int n = 0, targets[12], nt = 0, at[24], nadj;
  for (int d = 0; d < 8; d++) { int t = NB[ek * 8 + d]; if (t >= 0) targets[nt++] = t; }
  nadj = nt;
  for (int i = 0; i < KN_FROM_N[us][ek]; i++) targets[nt++] = KN_FROM[us][ek][i];
  /* a piece placed next to the king that no other piece of ours defends (the king lifted off: lines through its square
     count) can be taken by the king, so it does not mate: such candidates are left out (the first mate found is the same) */
  int ekp = board[ek];
  /* without a piece of ours that could uncover a line to the king, only knights check from a knight square: there the
     other attackers (who would be skipped as non-checks) are not looked for */
  int anyDisc = 0;
  for (int d = 0; d < 8 && !anyDisc; d++) {
    const i8 *r = RAYT[ek * 8 + d]; int x;
    while ((x = *r++) >= 0 && !board[x]) {}
    if (x < 0 || colorOf(board[x]) != us) continue;
    while ((x = *r++) >= 0 && !board[x]) {}
    if (x >= 0 && colorOf(board[x]) == us && SLIDE[board[x] * 8 + OPPD[d]]) anyDisc = 1;
  }
  for (int i = 0; i < nt; i++) {
    int t = targets[i], q = board[t];
    if (q && colorOf(q) == us) continue;
    int adj = i < nadj, na = 0;
    if (adj || anyDisc) na = attackers(t, us, at);
    else { int kn = KE + (us ? WF : 0); for (int k = 0; k < KN_FROM_N[us][t]; k++) if (board[KN_FROM[us][t][k]] == kn) at[na++] = KN_FROM[us][t][k]; }
    if (!q) {
      int def = 1;
      if (adj && !na) { board[ek] = 0; def = attacked(t, us); board[ek] = (i8)ekp; }
      if (def) for (int tp = 2; tp <= 7; tp++) {
        if (!hand[us * 8 + tp] || (tp <= KE && deadEnd(us, tp, t))) continue;
        buf[n++] = (80 + tp) | (t << 7);
      }
    }
    for (int ai = 0; ai < na; ai++) {
      int f = at[ai], p = board[f], tp = typeOf(p); if (tp == OU) continue;
      if (adj && na == 1) { board[ek] = 0; board[f] = 0; int def = attacked(t, us); board[f] = (i8)p; board[ek] = (i8)ekp; if (!def) continue; }
      if (CAN_PROMOTE[tp] && (inZone(us, f) || inZone(us, t))) { buf[n++] = f | (t << 7) | (1 << 14); if (!deadEnd(us, tp, t)) buf[n++] = f | (t << 7); }
      else buf[n++] = f | (t << 7);
    }
  }
  /* a candidate that surely gives no check is skipped without making it; when not in check, the own king is looked at
     only when it moved or the moved piece may have been pinned (as legalAfter) */
  int mk0 = king[us], chk0 = n ? inCheck() : 0;
  for (int i = 0; i < n; i++) {
    int m = buf[i];
    if (!givesCheckPre(m)) continue;
    int f = m & 127, own = chk0;
    if (mk0 >= 0 && f <= 80 && (f == mk0 || LDIR[mk0 * 81 + f] >= 0)) own = 1;
    doMove(m);
    int mk = king[us];
    int ok = (!own || mk < 0 || !attacked(mk, side)) && inCheck() && !hasLegalMove();
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
static TLS i32 m3a[1000], m3b[1000], m3c[600];
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
typedef struct { i32 key, move, data; } TTEntry;   /* one entry in one place: a probe touches one cache line */
#ifndef MT
static TTEntry tt[TT_SIZE];
#endif
static int ttAge = 0;
#define F_EXACT 1
#define F_LOWER 2
#define F_UPPER 3
#ifdef MT
/* (2026-11-09, addendum "wasm の Lazy SMP の置換表", the audit after checkers / morris / tafl) the threads' shared table. The
   plain one (one 12-byte entry per key, its key / move / data written one after another) is not used: two threads writing one
   slot at once could leave one position's key with another's move or value / depth / bound, and the one slot per key let the
   threads' many shallow entries push out the deep ones. Here: buckets of four entries { key ^ w, w } (key = the whole 64-bit
   hash hl | hh; w = value, move, depth, bound, age, in use), so a torn entry fails the key check ("lockless"); store = the same
   key's entry, else the shallowest / oldest of the bucket (depth − 16 if from an earlier search). 2^TTM_BITS buckets x 64 bytes
   (64 MB: 4M entries, the plain one 1M). A probe copies the entry into a TTEntry (key = hh on a hit), so the search reads it
   as before. */
typedef unsigned long long u64;
#ifndef TTM_BITS
#define TTM_BITS 20
#endif
static u64 ttm[(1u << TTM_BITS) * 8];
static inline u64 ttKey(void) { return (u64)(u32)hl | (u64)(u32)hh << 32; }
static inline void ttGet(TTEntry *e) {
  u64 key = ttKey(); const u64 *bk = &ttm[((u32)hl & ((1u << TTM_BITS) - 1)) * 8];
  for (int j = 0; j < 4; j++) {
    u64 w = bk[2 * j + 1], kx = bk[2 * j];
    if ((kx ^ w) == key && (w >> 63)) { e->key = hh; e->move = (i32)((w >> 16) & 0x7FFF); e->data = (i32)((w & 0xFFFF) | ((w >> 32) & 255) << 16 | ((w >> 40) & 3) << 24 | ((w >> 42) & 31) << 26); return; }
  }
  e->key = ~hh; e->move = 0; e->data = 0;
}
/* (2026-11-11) gStop, threadId, the busy marks and the split points of Young Brothers Wait are Praline's, the site's common
   thinking engine (claude/praline-spec.md, shared/praline/); the game's part of it ("glue") here and after search().
   A split point carries the position (board, hands, kings, keys, the pieces' masks, the last moves for the repetition
   test, the continuation history's moves, the static evaluations for "improving"), the line of its best move (PL_ON_RAISE),
   and per move its place among the legal moves (the reductions); the values are doubles (PL_VAL); the root's values are
   kept in spRootV (PL_NO_VALS: one root at a time, the lead's; a fail-low is no value: PL_WANT_A). */
#ifndef BUSY_D
#define BUSY_D 2   /* (remaining depth: 2 was faster than 3 in tools/mtsim) */
#endif
#ifndef SPLIT_D
#define SPLIT_D 4
#endif
typedef i32 Move;   /* (a move is an int here) */
#define PL_VAL double
#define PL_NO_VALS 1
#define PL_WANT_A 1
#define SP_MV 600
#define SP_HN 40   /* the history entries copied (the repetition test looks back 32 + 4) */
#define PL_SP_FIELDS \
  volatile int pvn; int improving, rootDepth; \
  i8 board[81], hand[16], king[2]; int side, hn, chkFast, chkC; i32 hl, hh, acc[2]; u32 pmask[2][3];   /* the position */ \
  i32 histL[SP_HN], histH[SP_HN]; u8 histChk[SP_HN]; i32 stMove[2]; i16 ckS[2]; double evSt[2]; \
  i32 pvm[MAXPLY];   /* the line of the best move (its child's) */ \
  i16 lg[SP_MV];     /* the moves' place */
#include "../shared/praline/praline.h"
EXPORT(tt_clear) void tt_clear(void) { memset(ttm, 0, sizeof ttm); memset(busyT, 0, sizeof busyT); }
#else
EXPORT(tt_clear) void tt_clear(void) { memset(tt, 0, sizeof tt); }
#endif

#define NBUF (MAXPLY + 32)
static TLS i32 moveBuf[NBUF][1000], scoreBuf[NBUF][1000], quietBuf[NBUF][1000], quietScore[NBUF][1000], triedQ[NBUF][1000], mateBuf[NBUF][1000];
static TLS i32 killers[NBUF * 2];
static TLS i32 history[2 * 88 * 81 * 2];
static TLS i32 nodes; static TLS int stopFlag; static TLS double deadline; static TLS i32 nodeLimit;
static TLS i32 pvTable[MAXPLY * MAXPLY], pvLen[MAXPLY];
static TLS int rootDepth = 1;
/* tunables (same defaults as engine.js) */
static int useMate1 = 1, rfpDepth = 6, rfpMargin = 90, nullAdapt = 1, histMalus = 0;   /* (2026-11: margin 120 -> 90, adaptive null move on, LMP count P[12] 6 -> 4: +190 Elo at 200k nodes) */
static int P[32] = {[5] = 1, [7] = 1, [12] = 4, [14] = 1, [16] = 100, [22] = 1, [23] = 200};   /* (2026-11-08 search v3: [22] history v2, [23] ProbCut, rfpDepth 3 -> 6) */
static void lmrInit(double div);
EXPORT(set_param) void set_param(int k, int v) { if (k == 0) useMate1 = v; else if (k == 1) rfpDepth = v; else if (k == 2) rfpMargin = v; else if (k == 3) nullAdapt = v; else if (k == 4) histMalus = v; if (k >= 0 && k < 32) P[k] = v; if (k == 17 && v > 0) lmrInit(v / 100.0); }
/* experimental features (all off by default):
   P5 log-LMR, P6 counter-move ordering, P7 quiet checks in first qsearch ply, P10 razoring, P11 extend all checks, P12 LMP base;
   search v3 (2026-11-08, MODEL_CARD.md): P22 history v2 (gravity, malus, continuation history; on), P23 ProbCut margin (200, on),
   P9 its LMR history divisor; tried and left off: P19/P20/P21 singular extension (min depth / margin / multi-cut, negative ext),
   P24 "improving", P25 table score as static eval, P26 LMP max depth, P27 aspiration window */
static double ln_(double x) { int k = 0; while (x > 1.5) { x *= 0.5; k++; } double z = (x - 1) / (x + 1), z2 = z * z, t = z, r = 0; for (int i = 1; i < 40; i += 2) { r += t / i; t *= z2; } return 2 * r + k * 0.6931471805599453; }
static i8 LMRT[64][64];
static void lmrInit(double div) { for (int d = 1; d < 64; d++) for (int n = 1; n < 64; n++) LMRT[d][n] = (i8)(0.6 + ln_(d) * ln_(n) / div); }
static TLS i32 counterMv[32 * 81];
/* continuation history (the previous move and the one before, by type after the move and destination, times this move):
   shared by the threads (a lost update does no harm) */
#define CK 1134
static i16 contH[2][CK * CK];
static TLS i32 exclM[NBUF];       /* the move left out at that ply (singular extension test), 0: none */
static TLS double evSt[NBUF];     /* static evaluation at that ply (-INF: in check) */
static inline int hIdx(int us, int m) { return ((us * 88 + (m & 127)) * 81 + ((m >> 7) & 127)) * 2 + ((m >> 14) & 1); }
static inline int mKey(int m) { int f = m & 127; return ((f > 80 ? f - 80 : typeOf(board[f]) + (((m >> 14) & 1) << 3)) - 1) * 81 + ((m >> 7) & 127); }
static inline void gravI(i32 *h, int b) { *h += b - *h * (b < 0 ? -b : b) / 16384; }
static inline void gravS(i16 *h, int b) { int v = *h; v += b - v * (b < 0 ? -b : b) / 16384; *h = (i16)v; }
static inline int quietHist(int us, int m) {
  int v = history[hIdx(us, m)];
  if (P[22]) { int k = mKey(m); if (sp >= 1 && ckS[sp - 1] >= 0) v += contH[0][ckS[sp - 1] * CK + k]; if (sp >= 2 && ckS[sp - 2] >= 0) v += contH[1][ckS[sp - 2] * CK + k]; }
  return v;
}
static inline void histUpd(int us, int m, int b) {
  gravI(&history[hIdx(us, m)], b);
  int k = mKey(m);
  if (sp >= 1 && ckS[sp - 1] >= 0) gravS(&contH[0][ckS[sp - 1] * CK + k], b);
  if (sp >= 2 && ckS[sp - 2] >= 0) gravS(&contH[1][ckS[sp - 2] * CK + k], b);
}

#ifdef MT
/* every thread's last finished iteration on the current root: { key ^ x, x }, x = depth | value | move | in use — the main
   thread answers with the deepest one, and a helper that finishes the main thread's depth limit ends the search (gHit) */
#define MT_SLOTS 64
static u64 gRes[MT_SLOTS][2];
static volatile u64 gGoalKey, gHit; static volatile int gGoal;
static TLS u64 rootK;
/* (2026-11-10, Young Brothers Wait: see "split points" after search(); MODEL_CARD.md「マルチスレッド その3：YBW」) stopFlag 2 / 3:
   praline.h. (2026-11-11, MODEL_CARD.md「マルチスレッド その4」) the threads past the first ybwMax (threadId >= ybwMax) do not
   take moves at the split points: they search the lead's root on their own (Lazy SMP, lazyRun), no split points of their own */
#ifndef YBW_MAX
#define YBW_MAX 10
#endif
static int ybwMax = YBW_MAX;
static TLS int lazyT, lazySeen;   /* a Lazy SMP helper now; the root it is on (gRootSeq) */
static volatile int gRootSeq;     /* the lead's root (gRootP), a new one at every root_search: odd while written */
static inline void mtCheck(void) {
  if (curSP && chainStopped(curSP, curIdx)) stopFlag = 2;
  else if (dupMode && gOpenN > 0 && dupLeave()) stopFlag = 3;
  else if (lazyT && __atomic_load_n(&gRootSeq, __ATOMIC_ACQUIRE) != lazySeen) stopFlag = 1;   /* (a Lazy SMP helper: the lead is on a new root) */
}
#endif
static inline int timeUp(void) {
  if ((nodes & 1023) == 0) {
#ifdef MT
    if (gStop || (rootK && gHit == rootK)) stopFlag = 1;
#endif
    if (deadline > 0 && js_now() > deadline) stopFlag = 1;
    if (nodeLimit && nodes > nodeLimit) stopFlag = 1;
#ifdef MT
    if (!stopFlag) mtCheck();
#endif
  }
  return stopFlag;
}
#ifdef MT
static void store(int depth, double score, int flag, int move, int ply) {
  u64 key = ttKey(), *bk = &ttm[((u32)hl & ((1u << TTM_BITS) - 1)) * 8];
  int j = 0, q = 1 << 30; u64 old = 0;
  for (int i = 0; i < 4; i++) {
    u64 w = bk[2 * i + 1], kx = bk[2 * i];
    if ((kx ^ w) == key && (w >> 63)) { j = i; old = w; break; }
    int sc = !(w >> 63) ? -1000 : (int)((w >> 32) & 255) - (((w >> 42) & 31) != (u64)(ttAge & 31) ? 16 : 0);
    if (sc < q) { q = sc; j = i; }
  }
  if (score > MATE - MAXPLY) score += ply; else if (score < -MATE + MAXPLY) score -= ply;
  if (!move && old) move = (int)((old >> 16) & 0x7FFF);
  u64 w = (u64)((i32)score & 0xffff) | (u64)(move & 0x7FFF) << 16 | (u64)(depth & 255) << 32 | (u64)(flag & 3) << 40 | (u64)(ttAge & 31) << 42 | 1ull << 63;
  bk[2 * j + 1] = w; bk[2 * j] = key ^ w;
}
/* (2026-11-10, after the Mac bench-all-2: the time to the same depth only x2.3 with 14 threads; morris/MODEL_CARD.md
   「マルチスレッドの見直し その2」) busy marks (praline.h's busyOther / busySet / busyClear on ttKey()), from remaining depth
   BUSY_D. (2026-11-10) the split points of Young Brothers Wait (praline.h, praline_ybw.h; the method of reversi/engine.c v4 /
   v4.1, MODEL_CARD.md「マルチスレッド その3：YBW」): a node (remaining depth >= splitD, not a singular-extension test) whose
   first move is done opens one when a helper is idle: its other moves (the staged generation run to its end, the moves pruned
   and the illegal ones left out as the one-thread loop would, each with its place for the reductions). A helper copies the
   position (the NNUE accumulator is computed afresh). */
static double spRootV[1000];   /* the root split point's values (one root at a time: the lead's) */
static void spFillPos(SPt *s, int ply) {   /* the owner: this node's position (sp == ply in the search) */
  memcpy(s->board, board, 81); memcpy(s->hand, hand, 16); s->king[0] = king[0]; s->king[1] = king[1];
  s->side = side; s->hn = hn; s->chkFast = chkFast; s->chkC = chkC[sp]; s->hl = hl; s->hh = hh; s->acc[0] = acc[0]; s->acc[1] = acc[1];
  memcpy(s->pmask, pmask, sizeof pmask);
  for (int k = 0; k < SP_HN; k++) { int i = hn - SP_HN + k; s->histL[k] = i >= 0 ? histL[i] : 0x7fffffff; s->histH[k] = i >= 0 ? histH[i] : 0; s->histChk[k] = i >= 0 ? histChk[i] : 0; }
  for (int k = 0; k < 2; k++) { int i = sp - 2 + k; s->stMove[k] = i >= 0 ? stMove[i] : 0; s->ckS[k] = i >= 0 ? ckS[i] : -1; }
  for (int k = 0; k < 2; k++) { int i = ply - 2 + k; s->evSt[k] = i >= 0 ? evSt[i] : -INF; }
  s->ply = ply; s->rootDepth = rootDepth;
}
/* a thread joining s (fresh: the evaluation's accumulators anew; an owner back at its own split point keeps its NNUE slot) */
static void spLoadPos(const SPt *s, int top, int fresh) {
  (void)top;
  memcpy(board, s->board, 81); memcpy(hand, s->hand, 16); king[0] = s->king[0]; king[1] = s->king[1]; setKingCache(0); setKingCache(1);
  side = s->side; hn = s->hn; chkFast = s->chkFast; hl = s->hl; hh = s->hh; acc[0] = s->acc[0]; acc[1] = s->acc[1];
  memcpy(pmask, s->pmask, sizeof pmask);
  sp = s->ply; chkC[sp] = (i8)s->chkC;
  for (int k = 0; k < SP_HN; k++) { int i = hn - SP_HN + k; if (i >= 0) { histL[i] = s->histL[k]; histH[i] = s->histH[k]; histChk[i] = s->histChk[k]; } }
  for (int k = 0; k < 2; k++) { int i = sp - 2 + k; if (i >= 0) { stMove[i] = s->stMove[k]; ckS[i] = s->ckS[k]; } }
  for (int k = 0; k < 2; k++) { int i = s->ply - 2 + k; if (i >= 0) evSt[i] = s->evSt[k]; }
  rootDepth = s->rootDepth;
  if (fresh) { if (nueOn) nueRefresh(); }
  if (nnOn) { nnRefresh(0); nnRefresh(1); }
}
#else
static void store(int depth, double score, int flag, int move, int ply) {
  int i = hl & TT_MASK;
  if (tt[i].key == hh || ((tt[i].data >> 16) & 255) <= depth + 2 || (((u32)tt[i].data >> 26) != (u32)ttAge)) {
    if (score > MATE - MAXPLY) score += ply; else if (score < -MATE + MAXPLY) score -= ply;
    if (!move && tt[i].key == hh) move = tt[i].move;
    tt[i].key = hh; tt[i].move = move;
    tt[i].data = ((i32)score & 0xffff) | ((depth & 255) << 16) | (flag << 24) | (ttAge << 26);
  }
}
#endif
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
    else sc = quietHist(us, m);
    scores[i] = sc;
  }
}
static inline int pick(i32 *moves, i32 *scores, int n, int i) {
  int bi = i; i32 bs = scores[i];
  for (int j = i + 1; j < n; j++) if (scores[j] > bs) { bs = scores[j]; bi = j; }
  if (bi != i) { i32 tm = moves[i]; moves[i] = moves[bi]; moves[bi] = tm; i32 ts = scores[i]; scores[i] = scores[bi]; scores[bi] = ts; }
  return moves[i];
}
/* the same selection as pick (the first best of moves[i..n), swapped to i), for long lists: the first pick also notes the
   first best of each block of 16 moves, so a later pick compares the blocks and rescans at most the two blocks the swap
   touched. pk->nb = 0: not set up (the caller resets it whenever the list changes). */
#define PKB 16
typedef struct { int nb; i16 best[1000 / PKB + 2]; } PickBlocks;
static TLS PickBlocks pkT[NBUF];
static inline void pkScan(const i32 *scores, int n, int lo, PickBlocks *pk, int k) {
  int a = k * PKB, e = a + PKB; if (a < lo) a = lo; if (e > n) e = n;
  if (a >= e) { pk->best[k] = -1; return; }
  int bi = a; i32 bs = scores[a];
  for (int j = a + 1; j < e; j++) if (scores[j] > bs) { bs = scores[j]; bi = j; }
  pk->best[k] = (i16)bi;
}
static int pickFast(i32 *moves, i32 *scores, int n, int i, PickBlocks *pk) {
  int bi;
  if (!pk->nb) {
    if (i || n < 40) return pick(moves, scores, n, i);
    int nb = pk->nb = (n + PKB - 1) / PKB;
    bi = -1; i32 bs = 0;
    for (int k = 0; k < nb; k++) { pkScan(scores, n, 0, pk, k); int j = pk->best[k]; if (bi < 0 || scores[j] > bs) { bs = scores[j]; bi = j; } }
  } else {
    bi = -1; i32 bs = 0;
    for (int k = i / PKB; k < pk->nb; k++) { int j = pk->best[k]; if (j >= 0 && (bi < 0 || scores[j] > bs)) { bs = scores[j]; bi = j; } }
  }
  if (bi != i) { i32 tm = moves[i]; moves[i] = moves[bi]; moves[bi] = tm; i32 ts = scores[i]; scores[i] = scores[bi]; scores[bi] = ts; }
  int k0 = i / PKB, kb = bi / PKB;
  pkScan(scores, n, i + 1, pk, k0);
  if (kb != k0) pkScan(scores, n, i + 1, pk, kb);
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
  EvMask ev; if (inChk) evMask(&ev);
  int n = inChk ? genEv(moves, 0, &ev) : gen(moves, 1);   /* in check: only the moves that can be evasions */
  orderMoves(moves, scores, n, 0, ply);
  int legal = 0;
  PickBlocks *pk = &pkT[ply]; pk->nb = 0;
  for (int i = 0; i < n; i++) {
    int m = pickFast(moves, scores, n, i, pk);
    if (!inChk) {
      int cap = board[(m >> 7) & 127];
      if (cap && best + VALUE[typeOf(cap)] * 2 + 200 < alpha && !((m >> 14) & 1)) continue;
      if (cap ? scores[i] < 0 : see(m) < 0) continue;   /* a capture's order score is negative exactly when its SEE is */
      doMove(m);
      if (!legalAfter(m, 0)) { undoMove(); continue; }
    } else {
      int lg = evOK(&ev, m) ? evLegal(&ev, m) : 0; if (!lg) continue;
      doMove(m);
      if (lg == 2 && !legalAfter(m, 1)) { undoMove(); continue; }
    }
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
    int nn = genChecks(qm);
    for (int i = 0; i < nn; i++) {
      int m = qm[i];
      if (!givesCheckPre(m)) continue;
      doMove(m);
      if (!inCheck() || !legalAfter(m, 0)) { undoMove(); continue; }
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
  int ti = hl & TT_MASK, ttm = 0, ex = exclM[ply], ttD = -1, ttF = 0, ttS = 0;
#ifdef MT
  TTEntry tx; ttGet(&tx);
#define TTI tx
#else
#define TTI tt[ti]
#endif
  if (!ex && TTI.key == hh) {
    ttm = TTI.move;
    int d = TTI.data, td = (d >> 16) & 255, fl = (d >> 24) & 3;
    int ts = (i32)((u32)d << 16) >> 16;
    if (ts > MATE - MAXPLY) ts -= ply; else if (ts < -MATE + MAXPLY) ts += ply;
    if (!pvNode && td >= depth && ply > 0) {
      if (fl == F_EXACT || (fl == F_LOWER && ts >= beta) || (fl == F_UPPER && ts <= alpha)) return ts;
    }
    ttD = td; ttF = fl; ttS = ts;
  }
  if (!inChk && useMate1 && !ex) {
    int mm = mate1(mateBuf[ply]);
    if (mm) { double v = MATE - ply - 1; store(depth, v, F_EXACT, mm, ply); pvTable[ply * MAXPLY + ply] = mm; pvLen[ply] = ply + 1; return v; }
  }
  if (P[13] && !inChk && !ex && depth >= P[13]) {
    int mm = mate3();
    if (mm) { double v = MATE - ply - 3; store(depth, v, F_EXACT, mm, ply); pvTable[ply * MAXPLY + ply] = mm; pvLen[ply] = ply + 1; return v; }
  }
  double rawEval = inChk ? -INF : evaluate(), staticEval = rawEval;
  evSt[ply] = rawEval;
  int improving = P[24] && !inChk && ply >= 2 && (evSt[ply - 2] == -INF || rawEval > evSt[ply - 2]);
  if (P[25] && !inChk && ttD >= 0 && ((ttF == F_LOWER && ttS > staticEval) || (ttF == F_UPPER && ttS < staticEval) || ttF == F_EXACT) && (ttS < 0 ? -ttS : ttS) < MATE - MAXPLY) staticEval = ttS;
  if (!pvNode && !inChk && !ex && depth <= rfpDepth && staticEval - rfpMargin * (depth - improving) >= beta && (beta < 0 ? -beta : beta) < MATE - MAXPLY) return staticEval;
  if (P[10] && !pvNode && !inChk && !ex && depth <= 2 && staticEval + P[10] * depth < alpha) {
    double v = qsearch(alpha, beta, ply, 0);
    if (v < alpha) return v;
  }
  if (!pvNode && !inChk && !ex && allowNull && depth >= 3 && staticEval >= beta) {
    int R;
    if (nullAdapt) { int x = (int)((staticEval - beta) / 250); R = 3 + depth / 5 + (x < 2 ? x : 2); }
    else R = 2 + (depth >= 7 ? 1 : 0);
    doNull();
    double v = -search(depth - 1 - R, -beta, -beta + 1, ply + 1, 0, 0);
    undoNull();
    if (stopFlag) return 0;
    if (v >= beta && v < MATE - MAXPLY) return v;
  }
  if (P[23] && !pvNode && !inChk && !ex && depth >= 5 && (beta < 0 ? -beta : beta) < MATE - MAXPLY) {   /* ProbCut */
    double rb = beta + P[23];
    i32 *pm = moveBuf[ply], *ps = scoreBuf[ply];
    int n = gen(pm, 1); orderMoves(pm, ps, n, ttm, ply);
    for (int i = 0; i < n; i++) {
      int m = pick(pm, ps, n, i), cap = board[(m >> 7) & 127];
      if (!cap || see(m) < rb - staticEval) continue;
      doMove(m);
      if (!legalAfter(m, 0)) { undoMove(); continue; }
      double v = -qsearch(-rb, -rb + 1, ply + 1, 0);
      if (v >= rb) v = -search(depth - 4, -rb, -rb + 1, ply + 1, 0, 1);
      undoMove();
      if (stopFlag) return 0;
      if (v >= rb) { store(depth - 3, v, F_LOWER, m, ply); return v; }
    }
  }
  if (!ttm && pvNode && depth >= 4) {
    search(depth - 2, alpha, beta, ply, 1, 0);
#ifdef MT
    ttGet(&tx);
#endif
    if (TTI.key == hh) ttm = TTI.move;
#undef TTI
  }
  i32 *moves = moveBuf[ply], *scores = scoreBuf[ply], *qmoves = quietBuf[ply], *qscores = quietScore[ply], *tq = triedQ[ply];
  double best = -INF; int bestMove = 0, legal = 0, nq = 0;
  double origAlpha = alpha;
  int us = side;
  int stage = 0, i1 = 0, n1 = 0, i2 = 0, n2 = 0;
  PickBlocks *pk = &pkT[ply]; pk->nb = 0;
  EvMask ev; if (inChk) evMask(&ev);
  if (!(ttm && isPseudo(ttm))) { ttm = 0; stage = 1; }
#ifdef MT
  /* (2026-11-10) busy marks (see busyT): a move whose position another thread is searching right now is put off until the
     other moves are done (after the last stage); it keeps its place in the order (lgb: the legal moves before it) */
  int defM[BUSY_DEF], defL[BUSY_DEF], nDef = 0, kDef = 0, noSplit = 0;
#endif
  for (;;) {
    int m;
#ifdef MT
    int redo = 0, lgb = legal;
    /* YBW: the first move is done and a helper is idle (or an owner above waits for its helpers): the remaining moves go to a
       split point — the staged generation run to its end as the loop below would (the same pruning of quiet moves by their
       place, the illegal ones left out), then the moves put off */
    if (legal && !noSplit && !lazyT && !ex && depth >= splitD && (gIdle > 0 || (gWaitN > 0 && spWanted()))) {
      SPt *s = spAlloc();
      if (s) {
        int ns = 0, lg2 = legal;
        for (;;) {
          int m2, lb;
          if (stage == 1) {
            if (i1 == 0 && n1 == 0) { n1 = inChk ? genEv(moves, 1, &ev) : gen(moves, 1); orderMoves(moves, scores, n1, 0, ply); if (!n1) { stage = 2; continue; } }
            if (i1 >= n1) { stage = 2; continue; }
            m2 = pickFast(moves, scores, n1, i1++, pk);
            if (m2 == ttm) continue;
            lb = lg2;
          } else {
            if (stage == 2) {
              int all = inChk ? genEv(qmoves, 0, &ev) : gen(qmoves, 0); n2 = 0;
              for (int k = 0; k < all; k++) {
                int x = qmoves[k], tx = (x >> 7) & 127;
                if (board[tx] || x == ttm) continue;
                if ((x >> 14) & 1) { int tt = typeOf(board[x & 127]); if (tt == FU || tt == KA || tt == HI) continue; }
                qmoves[n2++] = x;
              }
              orderMoves(qmoves, qscores, n2, 0, ply);
              pk->nb = 0; stage = 3;
            }
            if (i2 >= n2) { if (kDef >= nDef) break; m2 = defM[kDef]; lb = defL[kDef++]; }
            else { m2 = pickFast(qmoves, qscores, n2, i2++, pk); lb = lg2; }
          }
          const int quiet2 = !board[(m2 >> 7) & 127] && !((m2 >> 14) & 1);
          if (!pvNode && !inChk && quiet2 && lb > 0 && depth <= (P[18] ? P[18] : 2) && staticEval + (P[16] ? P[16] : 150) * depth + 100 <= alpha) {
            if (!givesCheckPre(m2)) continue;
            doMove(m2); int ok = legalAfter(m2, inChk), chk = ok && inCheck(); undoMove();
            if (!chk) continue;
          }
          if (!pvNode && !inChk && quiet2 && depth <= (P[26] ? P[26] : 3) && lb > ((P[12] ? P[12] : 6) + depth * depth * 3) * (P[24] && !improving ? 2 : 3) / 3) {
            if (!givesCheckPre(m2)) continue;
            if (!chkFast) { doMove(m2); int chk = inCheck(); undoMove(); if (!chk) continue; }
          }
          if (inChk) {
            int lv = evOK(&ev, m2) ? evLegal(&ev, m2) : 0; if (!lv) continue;
            if (lv == 2) { doMove(m2); int ok = legalAfter(m2, 1); undoMove(); if (!ok) continue; }
          } else { doMove(m2); int ok = legalAfter(m2, 0); undoMove(); if (!ok) continue; }
          if (ns < SP_MV) { s->mv[ns] = m2; s->lg[ns] = (i16)(lb + 1); ns++; }
          lg2++;
        }
        if (!ns) { spRelease(s); break; }   /* (no move left: the loop's end) */
        spFillPos(s, ply);
        s->n = ns; s->depth = depth; s->root = 0; s->pv = pvNode; s->improving = improving; s->beta = beta; s->alpha = alpha;
        legal += ns;
        spRun(s, &best, &bestMove, 0);
        if (stopFlag) return 0;
        if (best >= beta && bestMove && !board[(bestMove >> 7) & 127] && !((bestMove >> 14) & 1)) {   /* (the cut-off's killer / history, as below) */
          const int bm = bestMove;
          if (killers[ply * 2] != bm) { killers[ply * 2 + 1] = killers[ply * 2]; killers[ply * 2] = bm; }
          if (P[6] && sp > 0 && stMove[sp - 1]) { int pt = (stMove[sp - 1] >> 7) & 127; counterMv[board[pt] * 81 + pt] = bm; }
          if (P[22]) {
            int b = depth * depth * 16; if (b > 1600) b = 1600;
            histUpd(us, bm, b);
            for (int k = 0; k < nq; k++) if (tq[k] != bm) histUpd(us, tq[k], -b);
          } else {
            int hi = ((us * 88 + (bm & 127)) * 81 + ((bm >> 7) & 127)) * 2 + ((bm >> 14) & 1);
            history[hi] += depth * depth;
            if (history[hi] > 1000000) for (int k = 0; k < (int)(sizeof history / 4); k++) history[k] >>= 1;
          }
        }
        break;
      }
      noSplit = 1;   /* (no free slot: on alone) */
    }
#define LGB lgb
#else
#define LGB legal
#endif
    if (stage == 0) { m = ttm; stage = 1; }
    else if (stage == 1) {
      if (i1 == 0 && n1 == 0) { n1 = inChk ? genEv(moves, 1, &ev) : gen(moves, 1); orderMoves(moves, scores, n1, 0, ply); if (!n1) { stage = 2; continue; } }
      if (i1 >= n1) { stage = 2; continue; }
      m = pickFast(moves, scores, n1, i1++, pk);
      if (m == ttm) continue;
    } else {
      if (stage == 2) {
        int all = inChk ? genEv(qmoves, 0, &ev) : gen(qmoves, 0); n2 = 0;
        for (int k = 0; k < all; k++) {
          int x = qmoves[k], tx = (x >> 7) & 127;
          if (board[tx] || x == ttm) continue;
          if ((x >> 14) & 1) { int tt = typeOf(board[x & 127]); if (tt == FU || tt == KA || tt == HI) continue; }
          qmoves[n2++] = x;
        }
        orderMoves(qmoves, qscores, n2, 0, ply);
        pk->nb = 0; stage = 3;
      }
#ifdef MT
      if (i2 >= n2) { if (kDef >= nDef) break; m = defM[kDef]; lgb = defL[kDef++]; redo = 1; }
      else
#else
      if (i2 >= n2) break;
#endif
      m = pickFast(qmoves, qscores, n2, i2++, pk);
    }
    int to = (m >> 7) & 127, cap = board[to], quiet = !cap && !((m >> 14) & 1);
    if (!pvNode && !inChk && quiet && LGB > 0 && depth <= (P[18] ? P[18] : 2) && staticEval + (P[16] ? P[16] : 150) * depth + 100 <= alpha) {
      if (!givesCheckPre(m)) continue;   /* (a move that gives no check is skipped here either way) */
      doMove(m);
      int ok = legalAfter(m, inChk), chk = ok && inCheck();
      undoMove();
      if (!chk) continue;
    }
    if (m == ex) continue;
    if (!pvNode && !inChk && quiet && depth <= (P[26] ? P[26] : 3) && LGB > ((P[12] ? P[12] : 6) + depth * depth * 3) * (P[24] && !improving ? 2 : 3) / 3) {
      if (!givesCheckPre(m)) continue;
      if (!chkFast) { doMove(m); int chk = inCheck(); undoMove(); if (!chk) continue; }   /* (else givesCheckPre was exact) */
    }
    int sext = 0;
    if (P[19] && m == ttm && ply > 0 && !ex && depth >= P[19] && ttD >= depth - 3 && (ttF == F_LOWER || ttF == F_EXACT) && (ttS < 0 ? -ttS : ttS) < MATE - MAXPLY && ply < rootDepth * 2) {
      double sb = ttS - (P[20] ? P[20] : 2) * depth;   /* singular extension: is the table move the only good one? */
      exclM[ply] = m;
      double sv = search((depth - 1) / 2, sb - 1, sb, ply, 0, 0);
      exclM[ply] = 0; pk->nb = 0;   /* (the test used this ply's buffers) */
      if (stopFlag) return 0;
      if (sv < sb) sext = 1;
      else if ((P[21] & 1) && sb >= beta) return sb;   /* multi-cut */
      else if ((P[21] & 2) && ttS >= beta) sext = -1;
    }
    if (inChk) {
      int lg = evOK(&ev, m) ? evLegal(&ev, m) : 0; if (!lg) continue;
      doMove(m);
      if (lg == 2 && !legalAfter(m, 1)) { undoMove(); continue; }
    } else {
      doMove(m);
      if (!legalAfter(m, 0)) { undoMove(); continue; }
    }
#ifdef MT
    if (!redo && legal && depth >= BUSY_D && nDef < BUSY_DEF && busyOther(ttKey())) { undoMove(); defM[nDef] = m; defL[nDef++] = lgb; continue; }
    const u64 mkKey = ttKey(); const int mk = depth >= BUSY_D ? busySet(mkKey) : -1;
#define LGA (lgb + 1)
#else
#define LGA legal
#endif
    legal++;
    int givesChk = inCheck();
    int ext = givesChk && ply < rootDepth * 2 && (P[11] || seeAfterCheck(m) >= 0) ? 1 : 0;
    if (sext > 0) ext = 1; else if (sext < 0 && !ext) ext = -1;
    double v;
    int nd = depth - 1 + ext;
    if (LGA == 1) v = -search(nd, -beta, -alpha, ply + 1, pvNode, 1);
    else {
      int r = 0;
      if (depth >= 3 && quiet && !inChk && !givesChk && LGA > 3) {
        if (P[5]) {
          r = LMRT[depth < 63 ? depth : 63][LGA < 63 ? LGA : 63];
          if (m == killers[ply * 2] || m == killers[ply * 2 + 1]) r--;
          if (P[22]) { undoMove(); int hv = quietHist(us, m); doMove(m); r -= hv / (P[9] ? P[9] : 6000); }
          else { i32 hv = history[((us * 88 + (m & 127)) * 81 + to) * 2 + ((m >> 14) & 1)]; if (hv > 2000) r--; else if (hv == 0) r++; }
          if (P[24] && !improving) r++;
        } else r = 1 + (LGA > 8 ? 1 : 0) + (depth >= 8 ? 1 : 0);
        if (pvNode) r--;
        if (r < 0) r = 0;
        if (r > depth - 2) r = depth - 2;
      }
      v = -search(nd - r, -alpha - 1, -alpha, ply + 1, 0, 1);
      if (v > alpha && r) v = -search(nd, -alpha - 1, -alpha, ply + 1, 0, 1);
      if (v > alpha && v < beta) v = -search(nd, -beta, -alpha, ply + 1, 1, 1);
    }
#undef LGA
#undef LGB
#ifdef MT
    if (mk >= 0) busyClear(mkKey, mk);
#endif
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
            if (P[22]) {
              int b = depth * depth * 16; if (b > 1600) b = 1600;
              histUpd(us, m, b);
              for (int k = 0; k < nq; k++) if (tq[k] != m) histUpd(us, tq[k], -b);
            } else {
            int hi = ((us * 88 + (m & 127)) * 81 + to) * 2 + ((m >> 14) & 1);
            history[hi] += depth * depth;
            if (history[hi] > 1000000) for (int k = 0; k < (int)(sizeof history / 4); k++) history[k] >>= 1;
            if (histMalus) for (int k = 0; k < nq; k++) { int x = tq[k]; if (x == m) continue; int hx = ((us * 88 + (x & 127)) * 81 + ((x >> 7) & 127)) * 2 + ((x >> 14) & 1); history[hx] -= depth * depth; if (history[hx] < -1000000) history[hx] = -1000000; }
            }
          }
          break;
        }
      }
    }
  }
  if (!legal) return ex ? alpha : -MATE + ply;
  if (!ex) store(depth, best, best >= beta ? F_LOWER : best > origAlpha ? F_EXACT : F_UPPER, bestMove, ply);
  return best;
}

#ifdef MT
/* ------------------------------------------------------------------ split points: the game's glue for Praline (praline_ybw.h) */
/* the move i of s (the thread is at s's position) with the null window against a and the re-searches, as the one-thread loop */
static double spSearch(SPt *s, int i, double a) {
  const double b = s->beta; const int m = s->mv[i], LGA = s->lg[i], ply = s->ply, depth = s->depth, us = side, inChk = inCheck();
  const int quiet = !board[(m >> 7) & 127] && !((m >> 14) & 1);
  const int hv = !s->root && P[5] && P[22] && quiet ? quietHist(us, m) : 0;   /* (the loop takes it with the move undone) */
  doMove(m);
  const u64 mkKey = ttKey(); const int mk = depth >= BUSY_D ? busySet(mkKey) : -1;
  double v;
  if (s->root) {
    const int nd = depth - 1 + (inCheck() ? 1 : 0);
    v = -search(nd, -a - 1, -a, 1, 0, 1);
    if (v > a && v < b) v = -search(nd, -b, -a, 1, 1, 1);
  } else {
    const int givesChk = inCheck();
    const int ext = givesChk && ply < rootDepth * 2 && (P[11] || seeAfterCheck(m) >= 0) ? 1 : 0;
    const int nd = depth - 1 + ext; int r = 0;
    if (depth >= 3 && quiet && !inChk && !givesChk && LGA > 3) {
      if (P[5]) {
        r = LMRT[depth < 63 ? depth : 63][LGA < 63 ? LGA : 63];
        if (m == killers[ply * 2] || m == killers[ply * 2 + 1]) r--;
        if (P[22]) r -= hv / (P[9] ? P[9] : 6000);
        else { i32 h = history[((us * 88 + (m & 127)) * 81 + ((m >> 7) & 127)) * 2 + ((m >> 14) & 1)]; if (h > 2000) r--; else if (h == 0) r++; }
        if (P[24] && !s->improving) r++;
      } else r = 1 + (LGA > 8 ? 1 : 0) + (depth >= 8 ? 1 : 0);
      if (s->pv) r--;
      if (r < 0) r = 0;
      if (r > depth - 2) r = depth - 2;
    }
    v = -search(nd - r, -a - 1, -a, ply + 1, 0, 1);
    if (v > a && r) v = -search(nd, -a - 1, -a, ply + 1, 0, 1);
    if (v > a && v < b) v = -search(nd, -b, -a, ply + 1, 1, 1);
  }
  if (mk >= 0) busyClear(mkKey, mk);
  undoMove();
  return v;
}
/* a cut-off by the move i of s (not the root): this thread's killers / counter move / history, as the one-thread cut-off */
static void spCutoff(const SPt *s, int i) {
  const int m = s->mv[i];
  if (board[(m >> 7) & 127] || ((m >> 14) & 1)) return;
  const int ply = s->ply, us = side;
  if (killers[ply * 2] != m) { killers[ply * 2 + 1] = killers[ply * 2]; killers[ply * 2] = m; }
  if (P[6] && sp > 0 && stMove[sp - 1]) { int pt = (stMove[sp - 1] >> 7) & 127; counterMv[board[pt] * 81 + pt] = m; }
  if (P[22]) { int b = s->depth * s->depth * 16; if (b > 1600) b = 1600; histUpd(us, m, b); }
  else {
    int hi = ((us * 88 + (m & 127)) * 81 + ((m >> 7) & 127)) * 2 + ((m >> 14) & 1);
    history[hi] += s->depth * s->depth;
    if (history[hi] > 1000000) for (int k = 0; k < (int)(sizeof history / 4); k++) history[k] >>= 1;
  }
}
static inline int spTop(void) { return 0; }   /* (the NNUE accumulator: fresh / kept by spLoadPos) */
static void waitCheck(void) {
  SIM_IDLE();
  if (gStop || (deadline > 0 && js_now() > deadline) || (nodeLimit && nodes > nodeLimit)) stopFlag = 1; else mtCheck();
}
/* the line below a move that raised alpha (this thread's, under the split point's lock), and the node's line when the owner
   is done with the split point */
static void spPvSave(SPt *s) {
  const int c = s->ply + 1, n = pvLen[c] - c;
  s->pvn = n > 0 && n < MAXPLY ? n : 0; for (int j = 0; j < s->pvn; j++) s->pvm[j] = pvTable[c * MAXPLY + c + j];
}
static void spPvLoad(const SPt *s) {
  if (s->pvn < 0) return;   /* (no move raised alpha) */
  const int ply = s->ply; int n = s->pvn; if (ply + 1 + n > MAXPLY) n = MAXPLY - ply - 1;
  pvTable[ply * MAXPLY + ply] = s->bestMove;
  for (int j = 0; j < n; j++) pvTable[ply * MAXPLY + ply + 1 + j] = s->pvm[j];
  pvLen[ply] = ply + 1 + n;
}
#define PL_ON_RAISE(s, i) spPvSave(s)
#define PL_ON_OPEN(s) ((s)->pvn = -1)
#define PL_ON_CLOSE(s) spPvLoad(s)
#define PL_ROOT_VAL(s, i, v) (spRootV[i] = (v) > plA ? (v) : -INF + 1)   /* (as searchRoot: a fail-low is no value) */
#define PL_ROOT_GET(s, j) (spRootV[j])
#define PL_NODES() ((double)(u32)nodes)
#define now() js_now()   /* (Praline's clock) */
/* a helper (mt-helper.js): take moves at the split points until the search is over (mt_stop) — or, with ms > 0, until it
   has nothing to do after ms milliseconds (the page then counts its nodes and calls again); returns its nodes. fresh: a new
   job (the history decays and the killers are cleared, as root_search) */
static SPt gRootP __attribute__((aligned(64)));   /* the lead's root position (root_search: spFillPos at ply 0) */
EXPORT(mt_ybw) void mt_ybw(int n) { ybwMax = n > 0 ? n : 1 << 20; }   /* the threads that take moves at the split points (the lead counted) */
int root_search(double timeMs, int maxDepth, int nodeLim);
/* a Lazy SMP helper (threadId >= ybwMax): the lead's root searched on its own, again whenever the lead starts a new one, until
   the search is over (or, with ms > 0, nothing to do after ms milliseconds); returns its nodes */
static double lazyRun(double ms) {
  const double t0 = ms > 0 ? js_now() : 0; double tot = 0;
  while (!__atomic_load_n(&gStop, __ATOMIC_ACQUIRE)) {
    const int q = __atomic_load_n(&gRootSeq, __ATOMIC_ACQUIRE);
    if (q && !(q & 1) && q != lazySeen) {
      spLoadPos(&gRootP, 0, 1);
      if (__atomic_load_n(&gRootSeq, __ATOMIC_ACQUIRE) != q) continue;   /* (written meanwhile) */
      lazySeen = q; lazyT = 1;
      root_search(0, 0, 0); tot += (double)(u32)nodes;
      lazyT = 0; stopFlag = 0;
      continue;
    }
    if (ms > 0 && js_now() - t0 > ms) break;
    SIM_IDLE();
  }
  nodes = 0;
  return tot;
}
static void spIdleReset(int fresh) {   /* mt_idle: a helper's search state (fresh: a new job, as root_search — not a Lazy SMP helper) */
  nodes = 0; deadline = 0; nodeLimit = 0; rootK = 0;
  if (fresh && threadId < ybwMax) { memset(killers, 0, sizeof killers); for (int k = 0; k < (int)(sizeof history / 4); k++) history[k] >>= 2; }
}
#define PL_IDLE_HOOK(ms) if (threadId >= ybwMax) return lazyRun(ms);   /* (past ybwMax: a Lazy SMP helper) */
#include "../shared/praline/praline_ybw.h"
#endif

/* root */
static TLS i32 rootM[1000]; static TLS double rootS[1000]; static TLS int nRoot;
static void rootMoveToFront(int idx) {
  if (idx <= 0) return;
  i32 m = rootM[idx]; double s = rootS[idx];
  for (int k = idx; k > 0; k--) { rootM[k] = rootM[k - 1]; rootS[k] = rootS[k - 1]; }
  rootM[0] = m; rootS[0] = s;
}
static double searchRoot(int depth, double alpha, double beta) {
  double best = -INF; int first = 1;
  pvLen[0] = 0;
#ifdef MT
  int rdM[BUSY_DEF], nrd = 0;   /* (the busy marks at the root too: a root move another thread is on is put off) */
  for (int k = 0; k < nRoot + nrd; k++) {
    /* YBW at the root: the first move is done, the others go to a split point (their values for sortRoot) */
    if (k == 1 && !first && nRoot - 1 >= 2 && nRoot - 1 <= SP_MV && depth >= splitD && gIdle > 0 && !lazyT) {
      SPt *s = spAlloc();
      if (s) {
        spFillPos(s, 0);
        for (int j = 1; j < nRoot; j++) { s->mv[j - 1] = rootM[j]; s->lg[j - 1] = (i16)(j + 1); }
        s->n = nRoot - 1; s->depth = depth; s->root = 1; s->pv = 1; s->improving = 0; s->beta = beta; s->alpha = alpha;
        int bm = rootM[0];
        spRun(s, &best, &bm, rootS + 1);
        if (bm != rootM[0]) { int bi = 1; while (bi < nRoot && rootM[bi] != bm) bi++; if (bi < nRoot) rootMoveToFront(bi); }
        return best;
      }
    }
    int i = k, m;
    if (k < nRoot) m = rootM[i];
    else { m = rdM[k - nRoot]; for (i = 0; i < nRoot - 1 && rootM[i] != m; i++); }   /* (its place now: rootMoveToFront moves them) */
    doMove(m);
    if (k < nRoot && !first && depth >= BUSY_D && nrd < BUSY_DEF && busyOther(ttKey())) { undoMove(); rdM[nrd++] = m; continue; }
    const u64 mkKey = ttKey(); const int mk = depth >= BUSY_D ? busySet(mkKey) : -1;
#else
  for (int i = 0; i < nRoot; i++) {
    int m = rootM[i];
    doMove(m);
#endif
    int chk = inCheck();
    int nd = depth - 1 + (chk ? 1 : 0);
    double v;
    if (first) v = -search(nd, -beta, -alpha, 1, 1, 1);
    else {
      v = -search(nd, -alpha - 1, -alpha, 1, 0, 1);
      if (v > alpha && v < beta) v = -search(nd, -beta, -alpha, 1, 1, 1);
    }
#ifdef MT
    if (mk >= 0) busyClear(mkKey, mk);
#endif
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
static TLS i32 res[8 + MAXPLY]; static TLS double resScore;
EXPORT(res_ptr) i32 *res_ptr(void) { return res; }
EXPORT(res_score) double res_score(void) { return resScore; }
static TLS i32 exclude[1000]; static TLS int nExclude = 0;
EXPORT(exclude_ptr) i32 *exclude_ptr(void) { return exclude; }
EXPORT(set_exclude) void set_exclude(int n) { nExclude = n; }

EXPORT(root_search) int root_search(double timeMs, int maxDepth, int nodeLim) {
  double t0 = js_now();
  stopFlag = 0; nodes = 0;
  deadline = timeMs > 0 ? t0 + timeMs : 0;
  nodeLimit = nodeLim;
#ifdef MT
  if (!threadId)
#endif
  ttAge = (ttAge + 1) & 31;
  memset(killers, 0, sizeof killers);
  for (int k = 0; k < (int)(sizeof history / 4); k++) history[k] >>= 2;
  if (!maxDepth) maxDepth = 40;
  static TLS i32 legal[1000];
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
  int d0 = 1;
#ifdef MT
  /* (2026-11-09) every thread iterates 1, 2, 3, … like the main one: the helpers' start a ply ahead (every other one) was slower
     to the main thread's depth in the measurement (MODEL_CARD.md). The root key: the position, its history length and the root
     moves (a helper reads every legal move: not the main thread's root when moves are excluded). */
  u64 rk = ttKey() ^ (u64)hn << 40 ^ (u64)nRoot << 52;
  for (int i = 0; i < nRoot; i++) rk += (u64)(u32)rootM[i] * 0x9E3779B97F4A7C15ull;
  rk |= 1;
  rootK = 0;
  if (!threadId) {   /* a new search: forget the threads' results of the last one, set the depth goal */
    { const int q = gRootSeq | 1; __atomic_store_n(&gRootSeq, q, __ATOMIC_RELEASE); spFillPos(&gRootP, 0); __atomic_store_n(&gRootSeq, q + 1, __ATOMIC_RELEASE); }   /* (the Lazy SMP helpers' root) */
    for (int i = 0; i < MT_SLOTS; i++) { __atomic_store_n(&gRes[i][0], 0, __ATOMIC_SEQ_CST); __atomic_store_n(&gRes[i][1], 0, __ATOMIC_SEQ_CST); }
    gHit = 0; gGoal = maxDepth; gGoalKey = rk; rootK = rk;
  }
#endif
  for (int depth = d0; depth <= maxDepth; depth++) {
    rootDepth = depth;
    double alpha = -INF, beta = INF, delta = P[27] ? P[27] : 60, score;
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
#ifdef MT
    if (threadId < MT_SLOTS) {   /* publish the finished iteration */
      u64 x = (u64)(depth & 255) | (u64)((i32)score & 0xFFFF) << 8 | (u64)(rootM[0] & 0x7FFF) << 24 | 1ull << 40;
      __atomic_store_n(&gRes[threadId][1], x, __ATOMIC_SEQ_CST); __atomic_store_n(&gRes[threadId][0], rk ^ x, __ATOMIC_SEQ_CST);
      if (threadId && depth >= gGoal && gGoalKey == rk) gHit = rk;
    }
#endif
    js_progress(depth, score, nodes, res + 4, pl);
    if ((score < 0 ? -score : score) > MATE - MAXPLY && depth > 3) break;
    if (deadline > 0 && js_now() - t0 > (deadline - t0) * (P[15] ? P[15] / 100.0 : 0.55)) break;
    if (nRoot == 1 && depth >= 2) break;
#ifdef MT
    if (gStop) break;
#endif
  }
#ifdef MT
  if (!threadId) {   /* the deepest finished iteration of all the threads (the main thread's on a tie) */
    int bt = -1, bdep = res[1];
    for (int i = 1; i < MT_SLOTS; i++) {
      u64 x = __atomic_load_n(&gRes[i][1], __ATOMIC_SEQ_CST), kx = __atomic_load_n(&gRes[i][0], __ATOMIC_SEQ_CST);
      if (!(x >> 40) || (kx ^ x) != rk) continue;
      int dd = (int)(x & 255); if (dd > bdep) { bdep = dd; bt = i; }
    }
    if (bt > 0) {
      u64 x = __atomic_load_n(&gRes[bt][1], __ATOMIC_SEQ_CST), kx = __atomic_load_n(&gRes[bt][0], __ATOMIC_SEQ_CST);
      int m = (int)((x >> 24) & 0x7FFF), ok = 0;
      for (int i = 0; i < nRoot; i++) if (rootM[i] == m) ok = 1;
      if ((kx ^ x) == rk && ok) {
        if (m != res[0]) { res[3] = 1; res[4] = m; }   /* (the helper's line is not known: its first move) */
        res[0] = m; res[1] = (int)(x & 255); resScore = (i16)(x >> 8);
      }
    }
    gGoalKey = 0; gHit = 0; rootK = 0;
  }
#endif
  res[2] = nodes;
  return res[0];
}
/* analyze: every root move with a full window; results in rootM/rootS (sorted) */
static TLS i32 anaD[1000];
EXPORT(ana_moves) i32 *ana_moves(void) { return rootM; }
EXPORT(ana_scores) double *ana_scores(void) { return rootS; }
EXPORT(ana_depths) i32 *ana_depths(void) { return anaD; }
EXPORT(analyze) int analyze(double timeMs, int maxDepth, int nodeLim) {
  double t0 = js_now();
  static TLS i32 legal[1000]; static TLS double tmp[1000];
  nRoot = legalMoves(legal, 0);
  for (int i = 0; i < nRoot; i++) { rootM[i] = legal[i]; rootS[i] = 0; anaD[i] = 0; }
  if (!maxDepth) maxDepth = 30;
  stopFlag = 0; nodes = 0; deadline = timeMs > 0 ? t0 + timeMs : 0; nodeLimit = nodeLim;
#ifdef MT
  rootK = 0;
  if (!threadId)
#endif
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
static TLS i8 setupBuf[81 + 16 + 1];
EXPORT(setup_ptr) i8 *setup_ptr(void) { return setupBuf; }
/* setupBuf: board[81], hand[16], side */
EXPORT(set_position) void set_position(void) {
  for (int s = 0; s < 81; s++) board[s] = setupBuf[s];
  for (int i = 0; i < 16; i++) hand[i] = setupBuf[81 + i];
  side = setupBuf[97];
  king[0] = king[1] = -1;
  for (int s = 0; s < 81; s++) { int p = board[s]; if (typeOf(p) == OU) king[colorOf(p)] = s; }
  memset(pmask, 0, sizeof pmask); for (int s = 0; s < 81; s++) if (board[s]) SETB(colorOf(board[s]), s);
  sp = 0; hn = 0; chkC[0] = -1;
  chkFast = !inCheckC(side ^ 1);
  computeHash(); refreshEval();
  histL[hn] = hl; histH[hn] = hh; histChk[hn] = inCheck() ? 1 : 0; hn++;
}
EXPORT(play_move) void play_move(int m) {
  doMove(m); histChk[hn - 1] = inCheck() ? 1 : 0;
  if (nueOn) { nueSync(); memcpy(nueAc[0], nueAc[sp], sizeof nueAc[0]); nueOk[0] = 1; }
  sp = 0; chkC[0] = -1;
  chkFast = !inCheckC(side ^ 1);
}
EXPORT(get_hash) i32 get_hash(int hi) { return hi ? hh : hl; }
EXPORT(get_eval) double get_eval(void) { return evaluate(); }

/* network: JS writes the float buffers via these pointers, then calls nn_enable(H) */
EXPORT(nue_w1_ptr) i16 *nue_w1_ptr(void) { return nueW1; }
EXPORT(nue_w2_ptr) i16 *nue_w2_ptr(void) { return nueW2; }
EXPORT(nue_b1_ptr) i32 *nue_b1_ptr(void) { return nueB1; }
EXPORT(nue_set_b2) void nue_set_b2(i32 b) { nueB2[0] = b; }
EXPORT(nue_b2_ptr) i32 *nue_b2_ptr(void) { return nueB2; }
EXPORT(nue_set_nb) void nue_set_nb(int n) { nueNB = n == NUE_NB ? NUE_NB : 1; }
EXPORT(nue_h) int nue_h(void) { return NUE_H; }
#ifdef NUE_KB
/* the bucket map (81 bytes, the perspective's own king square -> bucket) is written here, then nue_kinit() */
EXPORT(nue_kmap_ptr) u8 *nue_kmap_ptr(void) { return nueKMap; }
EXPORT(nue_kb) int nue_kb(void) { return NUE_KB; }
EXPORT(nue_kinit) int nue_kinit(void) {
  for (int s = 0; s < 81; s++) if (nueKMap[s] >= NUE_KB) return 0;
  for (int c = 0; c < 2; c++) for (int s = 0; s < 81; s++) nueKOff[c][s] = nueKMap[c ? 80 - s : s] * 2534;
  return 1;
}
#endif
EXPORT(nue_enable) void nue_enable(int on) {
  nueOn = on;
  /* nueEval may sum in int32 when every lane total stays below 2^31: (NUE_H * 2 / 4) products of at most QA^2 * max|w2| */
  int mw = 0; for (int i = 0; i < NUE_NB * 2 * NUE_H; i++) { int w = nueW2[i] < 0 ? -nueW2[i] : nueW2[i]; if (w > mw) mw = w; }
  nueSum32 = (double)NUE_QA * NUE_QA * mw * (NUE_H / 2) < 2147483647.0;
  refreshEval();
}
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
    for (int t = 0; t < 81; t++) LDIR[s * 81 + t] = -1;
    for (int d = 0; d < 8; d++) { int rr = r + DR[d], cc = c + DC[d], k = 1; while (rr >= 0 && rr < 9 && cc >= 0 && cc < 9) { LDIR[s * 81 + rr * 9 + cc] = (i8)d; LDIST[s * 81 + rr * 9 + cc] = (u8)k; rr += DR[d]; cc += DC[d]; k++; } }
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
  for (int c = 0; c < 2; c++) for (int t = 0; t < 16; t++) for (int s = 0; s < 81; s++) DEADT[c][t][s] = (u8)deadEnd0(c, t, s);
  for (int s = 0; s < 81; s++) {
    FILEM[s % 9][s / 27] |= 1u << (s % 27);
    for (int c = 0; c < 2; c++) for (int t = 1; t <= 7; t++) if (!deadEnd0(c, t, s)) DROPM[c][t][s / 27] |= 1u << (s % 27);
  }
  for (int s = 0; s < 81; s++) {
    LINEM[s][0] = LINEM[s][1] = LINEM[s][2] = 0;
    for (int t = 0; t < 81; t++) if (LDIR[s * 81 + t] >= 0) LINEM[s][t / 27] |= 1u << (t % 27);
    for (int col = 0; col < 2; col++) for (int i = 0; i < KN_FROM_N[col][s]; i++) { int t = KN_FROM[col][s][i]; LINEM[s][t / 27] |= 1u << (t % 27); }
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
  for (int s = 0; s < 81; s++) for (int d = 0; d < 8; d++) { int k = 0; for (int x = NB[s * 8 + d]; x >= 0; x = NB[x * 8 + d]) RAYT[s * 8 + d][k++] = (i8)x; RAYT[s * 8 + d][k] = -1; }
  for (int c = 0; c < 2; c++) for (int p = 1; p < 32; p++) for (int d = 0; d < 8; d++) if (typeOf(p) && typeOf(p) <= RY && colorOf(p) == c) {
    A1[c][p * 8 + d] = STEP[p * 8 + d] || SLIDE[p * 8 + d]; AS[c][p * 8 + d] = SLIDE[p * 8 + d];
  }
  for (int p = 0; p < 32; p++) { NDIRS[p] = 0; for (int d = 0; d < 8; d++) { if (STEP[p * 8 + d]) DIRS[p][NDIRS[p]++] = d; if (SLIDE[p * 8 + d]) DIRS[p][NDIRS[p]++] = d | 8; } }
  lmrInit(2.0);
  zseed = 0x2545F4914F6CDD1DULL;
  for (int i = 0; i < 81 * 32; i++) { const unsigned long long r = rnd64(); ZB_L[i] = (i32)r; ZB_H[i] = (i32)(r >> 32); }
  for (int i = 0; i < 2 * 8 * 20; i++) { const unsigned long long r = rnd64(); ZHD_L[i] = (i32)r; ZHD_H[i] = (i32)(r >> 32); }
  { const unsigned long long r = rnd64(); ZSIDE_L = (i32)r; ZSIDE_H = (i32)(r >> 32); }
}
EXPORT(reset_search) void reset_search(void) { memset(history, 0, sizeof history); memset(killers, 0, sizeof killers); memset(contH, 0, sizeof contH); }

#ifdef MT
/* ------------------------------------------------------------------ threads (engine_mt.wasm, see pro/) */
#ifdef NATIVE
static void mt_thread_native(int id) { threadId = id; }   /* (a pthread: its thread-local state is already there) */
#else
extern unsigned char __heap_base;
extern void __wasm_init_tls(void *);
EXPORT(mt_heap_base) u32 mt_heap_base(void) { return (u32)&__heap_base; }
EXPORT(mt_tls_size) u32 mt_tls_size(void) { return __builtin_wasm_tls_size(); }
/* every instance first: mt_stack (its own stack top; a function without a frame of its own), then mt_thread */
EXPORT(mt_stack) void mt_stack(u32 stackTop) { __asm__ volatile(".globaltype __stack_pointer, i32\n local.get %0\n global.set __stack_pointer" :: "r"(stackTop)); }
EXPORT(mt_thread) void mt_thread(u32 tls, int id) { __wasm_init_tls((void *)tls); threadId = id; }
#endif
EXPORT(mt_stop) void mt_stop(int v) { __atomic_store_n(&gStop, v, __ATOMIC_SEQ_CST); }
#endif
