// Janggi (Korean chess) search engine in C, compiled to WebAssembly for the browser
// (also builds natively for the tools: -DNATIVE, see tools/native.c). Search core adapted from xiangqi/engine.c.
//
// Board: 9 files x 10 ranks = 90 points, sq = row * 9 + col. Row 0 is Han's back rank (top), row 9 Cho's back rank
// (bottom). Pieces: 1 General 2 Guard 3 Elephant 4 Horse 5 Chariot 6 Cannon 7 Soldier (+8 = Han). Cho (side 0) moves first.
// Rules (as in janggi/engine.js): the general and the guards stay in the palace and move one step along its lines
// (the diagonals included); chariots and cannons also run along the palace diagonals; cannons move and capture only by
// jumping exactly one piece that is not a cannon, and never capture a cannon; elephants go one step straight and two
// diagonally (blocked on the way); horses one straight and one diagonal (blocked); soldiers forward or sideways (and
// forward along the diagonals inside the enemy palace). No river, no "flying general" rule. A move may not leave the own
// general in check; checkmate wins; a side with no legal move that is not in check passes (the null move).
// In the search a repeated position counts as a draw (the host decides repetitions and long games by the points).
#include <stdint.h>
// MT (engine_mt.wasm, tools/build.sh): several threads search one root together on a shared memory ("Lazy SMP"); the state of
// one search is thread-local (TLS), the tables, the evaluation weights and the transposition table are shared. (MT is also the
// name of the move's to-point below: the build flag becomes JG_THREADS.) Without it TLS is nothing and the normal build stays
// byte for byte as before.
#ifdef MT
#undef MT
#define JG_THREADS 1
#define TLS _Thread_local
#else
#define TLS
#endif
typedef int32_t i32; typedef uint32_t u32; typedef int8_t i8; typedef uint8_t u8; typedef int16_t i16; typedef uint16_t u16; typedef uint64_t u64; typedef int64_t i64;
#ifdef __wasm_simd128__
#include <wasm_simd128.h>
#endif
#ifdef NATIVE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#define EXPORT(name)
static double now(void) { struct timespec ts; clock_gettime(CLOCK_MONOTONIC, &ts); return ts.tv_sec * 1000.0 + ts.tv_nsec / 1e6; }
static void progress(int depth, int count) { (void)depth; (void)count; }
#else
#define EXPORT(name) __attribute__((export_name(#name)))
#define IMPORT(name) __attribute__((import_module("env"), import_name(#name)))
IMPORT(now) double now(void);
IMPORT(progress) void progress(int depth, int count);
void *memset(void *d, int c, unsigned long n) { u8 *p = (u8 *)d; while (n--) *p++ = (u8)c; return d; }
void *memcpy(void *d, const void *s, unsigned long n) { u8 *p = (u8 *)d; const u8 *q = (const u8 *)s; while (n--) *p++ = *q++; return d; }
#endif

#define WIN 30000
#define WINT 29000
#define REPWIN (WINT - 100)
#define INF 32000
#define MAXPLY 100
#define MAXMV 160
#define DRAW_PLIES 120
#define HIST_MAX 1200

enum { EMPTY = 0, KING = 1, ADVISOR = 2, ELEPHANT = 3, HORSE = 4, ROOK = 5, CANNON = 6, PAWN = 7 };
#define COLOR(p) ((p) >> 3)
#define TYPE(p) ((p) & 7)

static TLS i32 IO[8192];
EXPORT(io_ptr) i32 *io_ptr(void) { return IO; }

// ---------------------------------------------------------------- geometry
// lines: 4 orthogonal rays + up to 4 palace-diagonal rays per point (dirs 4..7: up-left, up-right, down-left, down-right)
static i8 RAYS[90][8][10];
static i8 NMOV[90][8], NLEG[90][8]; static u8 NNUM[90];
static i8 NATT[90][8], NALEG[90][8]; static u8 NANUM[90];
static i8 EMOV[90][8], EB1[90][8], EB2[90][8]; static u8 ENUM_[90];
static i8 EATT[90][8], EAB1[90][8], EAB2[90][8]; static u8 EANUM[90];
static i8 KMOV[90][8]; static u8 KNUM[90];          // general / guards: one step along the palace lines
static i8 PMOV[2][90][5]; static u8 PNUM[2][90];
static i8 PATT[2][90][5]; static u8 PANUM[2][90];  // soldiers of colour c that attack a point
static u8 INPALACE[90];
static u8 ROWOF[90], COLOF[90];      // s / 9, s % 9
static u64 PALM[2][2];               // palace points of the top (rows 0-2) / bottom (rows 7-9) half, as a 90-bit set (lo 64, hi 26)
static u64 ZOB[16][90], ZSIDE;
static int geoReady = 0;
static u64 rs64 = 0x9E3779B97F4A7C15ull;
static u64 rnd64(void) { rs64 ^= rs64 << 13; rs64 ^= rs64 >> 7; rs64 ^= rs64 << 17; return rs64; }
static inline int onb(int r, int c) { return r >= 0 && r < 10 && c >= 0 && c < 9; }
static inline int palace(int r, int c) { return c >= 3 && c <= 5 && (r <= 2 || r >= 7); }
// a palace diagonal step from (r,c) by (dr,dc): both ends on the palace's diagonal lines (corner <-> centre)
static inline int pdiag(int r, int c, int dr, int dc) {
  int tr = r + dr, tc = c + dc; if (!onb(tr, tc) || !palace(r, c) || !palace(tr, tc) || ((r <= 2) != (tr <= 2))) return 0;
  int cr = r <= 2 ? 1 : 8;   // the centre's row
  return (r == cr && c == 4) || (tr == cr && tc == 4);
}
static void initGeo(void) {
  if (geoReady) return;
  geoReady = 1;
  const int DR[8] = { -1, 1, 0, 0, -1, -1, 1, 1 }, DC[8] = { 0, 0, -1, 1, -1, 1, -1, 1 };
  for (int s = 0; s < 90; s++) {
    int r = s / 9, c = s % 9;
    INPALACE[s] = (u8)palace(r, c); ROWOF[s] = (u8)r; COLOF[s] = (u8)c;
    if (palace(r, c)) PALM[r <= 2 ? 0 : 1][s >> 6] |= 1ull << (s & 63);
    for (int d = 0; d < 8; d++) {
      int k = 0, rr = r, cc = c;
      if (d < 4) { rr += DR[d]; cc += DC[d]; while (onb(rr, cc)) { RAYS[s][d][k++] = (i8)(rr * 9 + cc); rr += DR[d]; cc += DC[d]; } }
      else while (pdiag(rr, cc, DR[d], DC[d])) { rr += DR[d]; cc += DC[d]; RAYS[s][d][k++] = (i8)(rr * 9 + cc); }
      RAYS[s][d][k] = -1;
    }
    int n = 0;
    // horse: one straight (a,b), then one diagonal outwards
    for (int d = 0; d < 4; d++) for (int sg = -1; sg <= 1; sg += 2) {
      int a = DR[d], b = DC[d], p = b * sg, q = a * sg;
      int lr = r + a, lc = c + b, tr = r + 2 * a + p, tc = c + 2 * b + q;
      if (!onb(tr, tc)) continue;
      NMOV[s][n] = (i8)(tr * 9 + tc); NLEG[s][n] = (i8)(lr * 9 + lc); n++;
    }
    NNUM[s] = (u8)n;
    // elephant: one straight, then two diagonally outwards (both steps must be empty)
    n = 0;
    for (int d = 0; d < 4; d++) for (int sg = -1; sg <= 1; sg += 2) {
      int a = DR[d], b = DC[d], p = b * sg, q = a * sg;
      int r1 = r + a, c1 = c + b, r2 = r + 2 * a + p, c2 = c + 2 * b + q, tr = r + 3 * a + 2 * p, tc = c + 3 * b + 2 * q;
      if (!onb(tr, tc)) continue;
      EMOV[s][n] = (i8)(tr * 9 + tc); EB1[s][n] = (i8)(r1 * 9 + c1); EB2[s][n] = (i8)(r2 * 9 + c2); n++;
    }
    ENUM_[s] = (u8)n;
    n = 0;
    if (palace(r, c)) for (int d = 0; d < 8; d++) {
      int tr = r + DR[d], tc = c + DC[d];
      if (d < 4) { if (onb(tr, tc) && palace(tr, tc) && ((r <= 2) == (tr <= 2))) KMOV[s][n++] = (i8)(tr * 9 + tc); }
      else if (pdiag(r, c, DR[d], DC[d])) KMOV[s][n++] = (i8)(tr * 9 + tc);
    }
    KNUM[s] = (u8)n;
    for (int col = 0; col < 2; col++) {
      n = 0; int fw = col ? 1 : -1;
      if (onb(r + fw, c)) PMOV[col][s][n++] = (i8)((r + fw) * 9 + c);
      if (c > 0) PMOV[col][s][n++] = (i8)(s - 1);
      if (c < 8) PMOV[col][s][n++] = (i8)(s + 1);
      for (int dc = -1; dc <= 1; dc += 2) if (pdiag(r, c, fw, dc) && ((r + fw <= 2) == (col == 0))) PMOV[col][s][n++] = (i8)((r + fw) * 9 + c + dc);
      PNUM[col][s] = (u8)n;
    }
  }
  for (int s = 0; s < 90; s++) { NANUM[s] = 0; EANUM[s] = 0; PANUM[0][s] = PANUM[1][s] = 0; }
  for (int h = 0; h < 90; h++) for (int i = 0; i < NNUM[h]; i++) { int t = NMOV[h][i]; NATT[t][NANUM[t]] = (i8)h; NALEG[t][NANUM[t]] = NLEG[h][i]; NANUM[t]++; }
  for (int h = 0; h < 90; h++) for (int i = 0; i < ENUM_[h]; i++) { int t = EMOV[h][i]; EATT[t][EANUM[t]] = (i8)h; EAB1[t][EANUM[t]] = EB1[h][i]; EAB2[t][EANUM[t]] = EB2[h][i]; EANUM[t]++; }
  for (int col = 0; col < 2; col++) for (int h = 0; h < 90; h++) for (int i = 0; i < PNUM[col][h]; i++) { int t = PMOV[col][h][i]; PATT[col][t][PANUM[col][t]++] = (i8)h; }
  for (int p = 0; p < 16; p++) for (int s = 0; s < 90; s++) ZOB[p][s] = rnd64();
  ZSIDE = rnd64();
}

// ---------------------------------------------------------------- position (one global board, make / unmake)
static TLS u8 B[90];
static TLS int side;
#define XQ_ST 400
static TLS int xqOn = 0, xqTop = 0;         // NNUE (see below): on, accumulator stack top
static TLS u8 xqOk[XQ_ST];
static TLS int KSQ[2];
static TLS u64 KEY;
// the points of each colour's pieces as a 90-bit set (BB[c][0]: points 0..63, BB[c][1]: 64..89), kept with B; walked in
// increasing point order, so every loop below visits the pieces in the same order as a scan of B would.
static TLS u64 BB[2][2];
#define BBFLIP(c, s) (BB[c][(s) >> 6] ^= 1ull << ((s) & 63))
#define FOR_BITS(lo, hi, s) for (int _h = 0; _h < 2; _h++) for (u64 _b = _h ? (hi) : (lo); _b; _b &= _b - 1) { int s = (_h << 6) | __builtin_ctzll(_b);
#define END_BITS }
typedef u16 Move;                     // from | to << 7 (from == to: a pass)
#define MV(f, t) ((Move)((f) | ((t) << 7)))
#define MF(m) ((m) & 127)
#define MT(m) (((m) >> 7) & 127)
static inline u8 mkp(int col, int t) { return (u8)(t | (col << 3)); }
static u64 hashBoard(void) { u64 k = 0; for (int s = 0; s < 90; s++) if (B[s]) k ^= ZOB[B[s]][s]; if (side) k ^= ZSIDE; return k; }
static void findKings(void) {   // also rebuilds BB from B
  KSQ[0] = KSQ[1] = -1; BB[0][0] = BB[0][1] = BB[1][0] = BB[1][1] = 0;
  for (int s = 0; s < 90; s++) if (B[s]) { BBFLIP(COLOR(B[s]), s); if (TYPE(B[s]) == KING) KSQ[COLOR(B[s])] = s; }
  xqTop = 0; xqOk[0] = 0;
}

// is the general of colour c attacked?
static int attackedKing(int c) {
  int k = KSQ[c]; if (k < 0) return 1;
  int o = c ^ 1; u8 oR = mkp(o, ROOK), oC = mkp(o, CANNON), oN = mkp(o, HORSE), oE = mkp(o, ELEPHANT), oP = mkp(o, PAWN);
  for (int d = 0; d < 8; d++) {
    const i8 *ray = RAYS[k][d]; int i = 0, sq;
    while ((sq = ray[i]) >= 0 && !B[sq]) i++;
    if (sq < 0) continue;
    u8 p = B[sq];
    if (p == oR) return 1;
    if (TYPE(p) == CANNON) continue;   // a cannon is never a screen
    i++;
    while ((sq = ray[i]) >= 0 && !B[sq]) i++;
    if (sq >= 0 && B[sq] == oC) return 1;
  }
  for (int i = 0; i < NANUM[k]; i++) if (B[(int)NATT[k][i]] == oN && !B[(int)NALEG[k][i]]) return 1;
  for (int i = 0; i < EANUM[k]; i++) if (B[(int)EATT[k][i]] == oE && !B[(int)EAB1[k][i]] && !B[(int)EAB2[k][i]]) return 1;
  for (int i = 0; i < PANUM[o][k]; i++) if (B[(int)PATT[o][k][i]] == oP) return 1;
  return 0;
}
// ---------------------------------------------------------------- NNUE evaluation (optional; tools/nnue/, claude/janggi-spec.md「NNUE」)
// (2026-11-14: xiangqi/engine.c's, the same network shape and file; a pass keeps the accumulator.)
// (1260 -> 256) x 2 perspectives -> 1, SCReLU, int16 weights (x127), output x64. Inputs per perspective c: (own / opponent x 7
// types) x 90 points, the board turned 180 degrees for Han (colour 1). The output is the logit of the expected score (win 1).
// Accumulators are updated lazily: makeMove only records the move; evaluate() brings the newest accumulator up to date from the
// nearest computed one below it (or recomputes it from the board).
#define XQ_IN 1260
#ifndef XQ_H
#define XQ_H 256   /* hidden size; engine_simd512.wasm is built with -DXQ_H=512 */
#endif
#define XQ_QA 127
#define XQ_QB 64
#define XQ_K 220                       // engine points per logit unit (fitted to the linear evaluation's scale)
static i16 xqW1[XQ_IN * XQ_H], xqW2[2 * XQ_H];
static i32 xqB1[XQ_H], xqB2;
static TLS i16 xqAcc[XQ_ST + 1][2][XQ_H];   // (slot XQ_ST: scratch for positions deeper than the stack)
static TLS u8 xqMv[XQ_ST][4];              // from, to, piece, captured
static inline int xqF(int c, int p, int s) { return ((COLOR(p) != c) * 7 + TYPE(p) - 1) * 90 + (c ? 89 - s : s); }
static inline void xqAdd(i16 *a, int f) { const i16 *w = xqW1 + f * XQ_H; for (int j = 0; j < XQ_H; j++) a[j] += w[j]; }
static inline void xqSub(i16 *a, int f) { const i16 *w = xqW1 + f * XQ_H; for (int j = 0; j < XQ_H; j++) a[j] -= w[j]; }
static void xqRefresh(int k) {
  for (int c = 0; c < 2; c++) {
    i16 *a = xqAcc[k][c]; for (int j = 0; j < XQ_H; j++) a[j] = (i16)xqB1[j];
    FOR_BITS(BB[0][0] | BB[1][0], BB[0][1] | BB[1][1], s) xqAdd(a, xqF(c, B[s], s)); END_BITS
  }
  if (k < XQ_ST) xqOk[k] = 1;
}
static inline void xqPush(int f, int t, u8 p, u8 cap) {
  xqTop++;
  if (xqTop < XQ_ST) { xqOk[xqTop] = 0; xqMv[xqTop][0] = (u8)f; xqMv[xqTop][1] = (u8)t; xqMv[xqTop][2] = p; xqMv[xqTop][3] = cap; }
}
static int xqEval(void) {
  int k = xqTop;
  if (k >= XQ_ST) { k = XQ_ST; xqRefresh(k); }       // deeper than the stack: recompute in the scratch slot
  else if (!xqOk[k]) {
    int b = k; while (b > 0 && !xqOk[b]) b--;
    if (!xqOk[b] || k - b > 6) xqRefresh(k);
    else {
      for (int i = b + 1; i <= k; i++) {
        int f = xqMv[i][0], t = xqMv[i][1]; u8 p = xqMv[i][2], cap = xqMv[i][3];
        if (f == t) { memcpy(xqAcc[i], xqAcc[i - 1], sizeof xqAcc[i]); xqOk[i] = 1; continue; }   // a pass
        for (int c = 0; c < 2; c++) {
          /* child = parent - from + to (- captured), one pass */
          i16 *a = xqAcc[i][c]; const i16 *o = xqAcc[i - 1][c];
          const i16 *wf = xqW1 + xqF(c, p, f) * XQ_H, *wt = xqW1 + xqF(c, p, t) * XQ_H;
          if (cap) { const i16 *wc = xqW1 + xqF(c, cap, t) * XQ_H; for (int j = 0; j < XQ_H; j++) a[j] = (i16)(o[j] - wf[j] + wt[j] - wc[j]); }
          else for (int j = 0; j < XQ_H; j++) a[j] = (i16)(o[j] - wf[j] + wt[j]);
        }
        xqOk[i] = 1;
      }
    }
  }
  const i16 *a = xqAcc[k][side], *b = xqAcc[k][side ^ 1];
  i64 sum = 0;
#ifdef __wasm_simd128__
  /* the same sums (32 products per block in int32, wrapping alike), 8 lanes at a time */
  {
    const v128_t lo = wasm_i16x8_splat(0), hi = wasm_i16x8_splat(XQ_QA);
    for (int i0 = 0; i0 < XQ_H; i0 += 16) {
      v128_t xa0 = wasm_i16x8_min(wasm_i16x8_max(wasm_v128_load(a + i0), lo), hi), xa1 = wasm_i16x8_min(wasm_i16x8_max(wasm_v128_load(a + i0 + 8), lo), hi);
      v128_t xb0 = wasm_i16x8_min(wasm_i16x8_max(wasm_v128_load(b + i0), lo), hi), xb1 = wasm_i16x8_min(wasm_i16x8_max(wasm_v128_load(b + i0 + 8), lo), hi);
      v128_t v = wasm_i32x4_add(wasm_i32x4_add(wasm_i32x4_dot_i16x8(wasm_i16x8_mul(xa0, xa0), wasm_v128_load(xqW2 + i0)), wasm_i32x4_dot_i16x8(wasm_i16x8_mul(xa1, xa1), wasm_v128_load(xqW2 + i0 + 8))),
                                 wasm_i32x4_add(wasm_i32x4_dot_i16x8(wasm_i16x8_mul(xb0, xb0), wasm_v128_load(xqW2 + XQ_H + i0)), wasm_i32x4_dot_i16x8(wasm_i16x8_mul(xb1, xb1), wasm_v128_load(xqW2 + XQ_H + i0 + 8))));
      sum += (i32)((u32)wasm_i32x4_extract_lane(v, 0) + (u32)wasm_i32x4_extract_lane(v, 1) + (u32)wasm_i32x4_extract_lane(v, 2) + (u32)wasm_i32x4_extract_lane(v, 3));
    }
  }
  if (0)
#endif
  for (int i0 = 0; i0 < XQ_H; i0 += 16) {
    i32 part = 0;
    for (int i = i0; i < i0 + 16; i++) { i32 x = a[i] < 0 ? 0 : a[i] > XQ_QA ? XQ_QA : a[i]; part += x * x * xqW2[i]; }
    for (int i = i0; i < i0 + 16; i++) { i32 x = b[i] < 0 ? 0 : b[i] > XQ_QA ? XQ_QA : b[i]; part += x * x * xqW2[XQ_H + i]; }
    sum += part;
  }
  i64 v = sum / XQ_QA + xqB2;
  v = v * XQ_K / (XQ_QA * XQ_QB);
  return (int)(v > 20000 ? 20000 : v < -20000 ? -20000 : v);
}
EXPORT(xq_w1_ptr) i16 *xq_w1_ptr(void) { return xqW1; }
EXPORT(xq_h) int xq_h(void) { return XQ_H; }
EXPORT(xq_w2_ptr) i16 *xq_w2_ptr(void) { return xqW2; }
EXPORT(xq_b1_ptr) i32 *xq_b1_ptr(void) { return xqB1; }
EXPORT(xq_set_b2) void xq_set_b2(i32 b) { xqB2 = b; }
EXPORT(xq_nnue) void xq_nnue(int on) { xqOn = on; xqTop = 0; xqOk[0] = 0; }

static inline u8 makeMove(Move m) {
  int f = MF(m), t = MT(m);
  if (f == t) { KEY ^= ZSIDE; side ^= 1; if (xqOn) xqPush(f, t, 0, 0); return 0; }   // pass
  u8 p = B[f], cap = B[t];
  KEY ^= ZOB[p][f] ^ ZOB[p][t] ^ ZSIDE; if (cap) KEY ^= ZOB[cap][t];
  if (xqOn) xqPush(f, t, p, cap);
  B[t] = p; B[f] = 0;
  BBFLIP(COLOR(p), f); BBFLIP(COLOR(p), t); if (cap) BBFLIP(COLOR(cap), t);
  if (TYPE(p) == KING) KSQ[COLOR(p)] = t;
  if (cap && TYPE(cap) == KING) KSQ[COLOR(cap)] = -1;
  side ^= 1;
  return cap;
}
static inline void unmakeMove(Move m, u8 cap) {
  int f = MF(m), t = MT(m);
  if (xqOn) xqTop--;
  if (f == t) { side ^= 1; KEY ^= ZSIDE; return; }
  u8 p = B[t];
  side ^= 1;
  B[f] = p; B[t] = cap;
  BBFLIP(COLOR(p), f); BBFLIP(COLOR(p), t); if (cap) BBFLIP(COLOR(cap), t);
  if (TYPE(p) == KING) KSQ[COLOR(p)] = f;
  if (cap && TYPE(cap) == KING) KSQ[COLOR(cap)] = t;
  KEY ^= ZOB[p][f] ^ ZOB[p][t] ^ ZSIDE; if (cap) KEY ^= ZOB[cap][t];
}

// pseudo-legal moves of the side to move; capsOnly: captures only
static int gen(Move *L, int capsOnly) {
  int n = 0, me = side;
#define ADD(s, t) do { u8 _q = B[t]; if (_q ? COLOR(_q) != me : !capsOnly) L[n++] = MV(s, t); } while (0)
  FOR_BITS(BB[me][0], BB[me][1], s)
    u8 p = B[s];
    switch (TYPE(p)) {
      case KING: case ADVISOR: for (int i = 0; i < KNUM[s]; i++) { int t = KMOV[s][i]; ADD(s, t); } break;
      case ELEPHANT: for (int i = 0; i < ENUM_[s]; i++) { if (B[(int)EB1[s][i]] || B[(int)EB2[s][i]]) continue; int t = EMOV[s][i]; ADD(s, t); } break;
      case HORSE: for (int i = 0; i < NNUM[s]; i++) { if (B[(int)NLEG[s][i]]) continue; int t = NMOV[s][i]; ADD(s, t); } break;
      case PAWN: for (int i = 0; i < PNUM[me][s]; i++) { int t = PMOV[me][s][i]; ADD(s, t); } break;
      case ROOK:
        for (int d = 0; d < 8; d++) { const i8 *ray = RAYS[s][d]; int t; for (int i = 0; (t = ray[i]) >= 0; i++) { u8 q = B[t]; if (!q) { if (!capsOnly) L[n++] = MV(s, t); continue; } if (COLOR(q) != me) L[n++] = MV(s, t); break; } }
        break;
      case CANNON:
        for (int d = 0; d < 8; d++) {
          const i8 *ray = RAYS[s][d]; int t, i = 0;
          for (; (t = ray[i]) >= 0; i++) if (B[t]) break;
          if (t < 0 || TYPE(B[t]) == CANNON) continue;   // no screen, or a cannon as the screen
          for (i++; (t = ray[i]) >= 0; i++) { u8 q = B[t]; if (!q) { if (!capsOnly) L[n++] = MV(s, t); continue; } if (COLOR(q) != me && TYPE(q) != CANNON) L[n++] = MV(s, t); break; }
        }
        break;
    }
  END_BITS
#undef ADD
  return n;
}
static int genLegal(Move *L) {
  Move P[MAXMV]; int n = gen(P, 0), k = 0, me = side;
  for (int i = 0; i < n; i++) { u8 c = makeMove(P[i]); if (!attackedKing(me)) L[k++] = P[i]; unmakeMove(P[i], c); }
  return k;
}
static int hasLegal(void) {
  Move P[MAXMV]; int n = gen(P, 0), me = side;
  for (int i = 0; i < n; i++) { u8 c = makeMove(P[i]); int ok = !attackedKing(me); unmakeMove(P[i], c); if (ok) return 1; }
  return 0;
}

// ---------------------------------------------------------------- evaluation (hand-made: material, piece-square, mobility, palace)
static const int VAL[8] = { 0, 0, 300, 300, 500, 1300, 700, 200 };
static int evW[16] = { 10, 6, 4, 3, 2, 14, 30, 18, 25, 12, 0, 0, 0, 0, 0, 0 };   // tunable (tools): see evaluateCho
static void initEval(void) {}
static inline int relRow(int col, int s) { int r = ROWOF[s]; return col ? r : 9 - r; }   // 0 = own back rank .. 9 = enemy back rank
// from Cho's view
static int evaluateCho(void) {
  int sc[2] = { 0, 0 }, total = __builtin_popcountll(BB[0][0] | BB[1][0]) + __builtin_popcountll(BB[0][1] | BB[1][1]);
  FOR_BITS(BB[0][0] | BB[1][0], BB[0][1] | BB[1][1], s)
    u8 p = B[s];
    int c = COLOR(p), t = TYPE(p), rr = relRow(c, s), col = COLOF[s], cf = col > 4 ? 8 - col : col, v = VAL[t];
    switch (t) {
      case PAWN: v += (rr >= 4 ? (rr - 3) * evW[0] : 0) + (rr >= 7 && cf >= 3 ? evW[6] : 0) + (cf == 4 ? 6 : 0); break;
      case HORSE: { int mob = 0; for (int i = 0; i < NNUM[s]; i++) if (!B[(int)NLEG[s][i]]) { u8 q = B[(int)NMOV[s][i]]; if (!q || COLOR(q) != c) mob++; } v += mob * evW[1] + (rr >= 3 && rr <= 6 ? 12 : 0) - (cf == 0 ? 15 : 0); break; }
      case ELEPHANT: { int mob = 0; for (int i = 0; i < ENUM_[s]; i++) if (!B[(int)EB1[s][i]] && !B[(int)EB2[s][i]]) { u8 q = B[(int)EMOV[s][i]]; if (!q || COLOR(q) != c) mob++; } v += mob * evW[3]; break; }
      case ROOK: { int mob = 0; for (int d = 0; d < 8; d++) { const i8 *ray = RAYS[s][d]; int x; for (int i = 0; (x = ray[i]) >= 0; i++) { mob++; if (B[x]) break; } } v += mob * evW[2] + (rr >= 7 ? evW[5] : 0); break; }
      case CANNON: { v -= (32 - total) * evW[4]; if (rr >= 6 && cf >= 3) v += evW[9]; break; }
      case KING: v += (col == 4 ? evW[7] : 0) + (rr == 1 ? 6 : 0); break;
      case ADVISOR: { int k = KSQ[c]; if (k >= 0) { int dr = ROWOF[s] - ROWOF[k], dc = col - COLOF[k]; if (dr * dr + dc * dc <= 2) v += evW[8]; } break; }
    }
    sc[c] += v;
  END_BITS
  // a general whose own palace holds enemy chariots / soldiers is in danger (enemy pieces on the palace points of the general's half)
  for (int c = 0; c < 2; c++) {
    int k = KSQ[c]; if (k < 0) continue; int danger = 0; const u64 *pm = PALM[ROWOF[k] <= 2 ? 0 : 1];
    FOR_BITS(BB[c ^ 1][0] & pm[0], BB[c ^ 1][1] & pm[1], s) int t = TYPE(B[s]); danger += t == ROOK ? 3 : t == PAWN ? 1 : t == HORSE || t == CANNON ? 2 : 0; END_BITS
    sc[c] -= danger * 25;
  }
  return sc[0] - sc[1];
}
static int evaluate(void) { if (xqOn) return xqEval(); int v = evaluateCho(); return (side ? -v : v) + 12; }
static int noAttackers(void) { return 0; }

// ---------------------------------------------------------------- transposition table
#define TT_BITS 20
typedef struct { u64 key; i16 v; u16 m; i8 d; u8 flag, age, pad; } TTE;
#ifndef JG_THREADS
static TTE TT[1 << TT_BITS];
#endif
static u8 ttAge = 0;
#define TT_EXACT 3
#define TT_LOWER 1
#define TT_UPPER 2
static inline int vToTT(int v, int ply) { return v > WINT ? v + ply : v < -WINT ? v - ply : v; }
static inline int vFromTT(int v, int ply) { return v > WINT ? v - ply : v < -WINT ? v + ply : v; }
#ifdef JG_THREADS
// (2026-11-09, addendum "wasm の Lazy SMP の置換表", the audit after checkers / morris / tafl) the threads' shared table. The plain
// one (one 16-byte entry per key, written field by field) is not used: two threads writing one slot at once could leave one
// position's key with another's value / depth / bound, and the one slot per key let the threads' many shallow entries push out
// the deep ones. Here: buckets of four entries { key ^ w, w } (w = value, move, depth, bound, age, in use), so a torn entry
// fails the key check ("lockless"); store = the same key's entry, else the shallowest / oldest of the bucket (depth − 16 if from
// an earlier search). 2^TTM_BITS buckets x 64 bytes (64 MB: 4M entries, the plain one 1M). A probe copies the entry into a TTE
// (the same fields as the plain table), so the search reads it as before.
#ifndef TTM_BITS
#define TTM_BITS 20
#endif
// (2026-11-15) the bucket table is Praline's (shared/praline/praline_tt.h): w >> 58 = in use; replace the shallowest / oldest
#define PL_TT_BITS TTM_BITS
#define PL_TT_USED(w, c) ((w) >> 58)
#define PL_TT_SCORE(w, c) (!((w) >> 58) ? -1000 : (int)(i8)((w) >> 32) - ((((w) >> 48) & 255) != ttAge ? 16 : 0))
#include "../shared/praline/praline_tt.h"
static inline void ttGet(u64 key, TTE *e) {
  u64 w, c;
  if (plttFind(key, key, &w, &c)) { e->key = key; e->v = (i16)(w & 0xFFFF); e->m = (u16)(w >> 16); e->d = (i8)(w >> 32); e->flag = (u8)((w >> 40) & 3); e->age = (u8)(w >> 48); return; }
  e->key = ~key; e->v = 0; e->m = 0; e->d = -1; e->flag = 0; e->age = 0;
}
static void ttStore(u64 key, int d, int flag, int v, Move m, int ply) {
  int hit; u64 old, oc; u64 *x = plttSlot(key, key, &hit, &old, &oc);
  u64 mv = m ? (u64)m << 16 : old ? (old & 0xFFFF0000ull) : 0;   // (no move: keep the entry's own)
  u64 w = (u64)(u16)(i16)vToTT(v, ply) | mv | (u64)(u8)(i8)(d > 120 ? 120 : d < -1 ? -1 : d) << 32 | (u64)(flag & 3) << 40 | (u64)ttAge << 48 | 1ull << 58;
  plttWrite(x, key, w, 0);
}
// (2026-11-11) the threads' machinery — the busy marks, the split points of Young Brothers Wait (claude/janggi-spec.md「マルチ
// スレッド その3：YBW」), mt_idle — is Praline's, the site's common thinking engine (claude/praline-spec.md, shared/praline/):
// the same code as before, the game's part of it ("glue") here. A split point carries the node's position and per move its
// place lg (LMR / futility as the one-thread loop) and whether it gives check.
#ifndef BUSY_D
#define BUSY_D 2   // (remaining depth: 2 was faster than 3 and 1 in tools/mtsim)
#endif
#ifndef SPLIT_D
#define SPLIT_D 3   /* (tools/mtsim: 3 a little faster than 4, with and without slow cores) */
#endif
#define SP_MV 128
#define SP_HK 192
#define PL_SP_FIELDS \
  int inChk, nnue; u64 key, bb[2][2]; int side, hn, hirr, ksq[2]; \
  u8 lg[SP_MV], gc[SP_MV];   /* the moves' place (LMR, futility) and gives check */ \
  u8 B[90]; u8 hc[SP_HK]; u64 hk[SP_HK];   /* the board, the repetition history since the last capture */
#include "../shared/praline/praline.h"
EXPORT(new_game) void new_game(void) { memset(PL_TT, 0, sizeof(PL_TT)); memset(busyT, 0, sizeof(busyT)); ttAge = 0; }
#define TT_PROBE(k) TTE e_, *e = &e_; ttGet((k), e)
#else
#define TT_PROBE(k) TTE *e = &TT[(k) & ((1 << TT_BITS) - 1)]
static void ttStore(u64 key, int d, int flag, int v, Move m, int ply) {
  TTE *e = &TT[key & ((1 << TT_BITS) - 1)];
  if (e->key != key && e->age == ttAge && e->d > d + 2) return;
  if (!(e->key == key && !m)) e->m = m;
  e->key = key; e->d = (i8)(d > 120 ? 120 : d < -1 ? -1 : d); e->flag = (u8)flag; e->v = (i16)vToTT(v, ply); e->age = ttAge;
}
EXPORT(new_game) void new_game(void) { memset(TT, 0, sizeof(TT)); ttAge = 0; }
#endif

// ---------------------------------------------------------------- search
static TLS u64 nodes; static TLS double tEnd; static TLS int stopFlag, nodeLimitOn; static TLS u64 nodeLimit;
static TLS i32 hist[2][90][90];
static TLS Move killers[MAXPLY][2];
static TLS u64 HK[HIST_MAX + MAXPLY];     // hash of every position (game + search path)
static TLS u8 HC[HIST_MAX + MAXPLY];      // side to move was in check there
static TLS int hn, hirr;                  // stack size, index of the first position after the last capture
static TLS int seldepth;
static const int PV_[8] = { 0, 0, 300, 300, 500, 1300, 700, 200 };   // ordering values (MVV-LVA)
#ifdef JG_THREADS
// (gStop, threadId, the busy marks and the split points: shared/praline/praline.h, included above)
// every thread's last finished iteration on the current root: { key ^ x, x }, x = depth | value | move | in use — the main
// thread answers with the deepest one, and a helper that finishes the main thread's depth limit ends the search (gHit)
#define MT_SLOTS 64
static u64 gRes[MT_SLOTS][2];
static volatile u64 gGoalKey, gHit; static volatile int gGoal;
static TLS u64 rootK;
// (Young Brothers Wait: shared/praline/praline_ybw.h after search(); stopFlag 2 / 3 there)
static inline void mtCheck(void) {
  if ((tEnd > 0 && now() > tEnd) || (nodeLimitOn && nodes > nodeLimit) || gStop || (rootK && gHit == rootK)) stopFlag = 1;
  else if (curSP && chainStopped(curSP, curIdx)) stopFlag = 2;
  else if (dupMode && gOpenN > 0 && dupLeave()) stopFlag = 3;
}
static inline int timeUp(void) {
  if (stopFlag) return 1;
  if ((nodes & 1023) == 0) mtCheck();
  return stopFlag;
}
// (the busy marks and the split points (SPt, spAlloc, …): praline.h; the game's part of a split point:)
static int spFillPos(SPt *s) {   // the owner: this node's position
  if (hn - hirr > SP_HK || hirr < 0) return 0;
  memcpy(s->B, B, 90); s->side = side; s->key = KEY; memcpy(s->bb, BB, sizeof(BB)); s->ksq[0] = KSQ[0]; s->ksq[1] = KSQ[1];
  s->hn = hn; s->hirr = hirr; memcpy(s->hk, HK + hirr, 8 * (hn - hirr)); memcpy(s->hc, HC + hirr, hn - hirr);
  s->nnue = xqOn;
  return 1;
}
static void spLoadPos(const SPt *s, int top, int fresh) {   // a thread joining s (fresh: the NNUE accumulator at slot top anew)
  memcpy(B, s->B, 90); side = s->side; KEY = s->key; memcpy(BB, s->bb, sizeof(BB)); KSQ[0] = s->ksq[0]; KSQ[1] = s->ksq[1];
  hn = s->hn; hirr = s->hirr; memcpy(HK + hirr, s->hk, 8 * (hn - hirr)); memcpy(HC + hirr, s->hc, hn - hirr);
  xqOn = s->nnue; xqTop = top;
  if (fresh && xqOn && top < XQ_ST) xqRefresh(top);
}
#else
static inline int timeUp(void) {
  if (stopFlag) return 1;
  if ((nodes & 1023) == 0) { if ((tEnd > 0 && now() > tEnd) || (nodeLimitOn && nodes > nodeLimit)) stopFlag = 1; }
  return stopFlag;
}
#endif
// repetition of the current position (HK[hn-1]): 0 none, 1 draw, 2 the side to move wins (opponent checked perpetually), 3 it loses
static int repState(void) {
  int cur = hn - 1; u64 k = HK[cur];
  for (int i = cur - 4; i >= hirr; i -= 2) {
    if (HK[i] != k) continue;
    int oppAll = 1, meAll = 1;
    for (int j = i + 1; j <= cur; j++) { if (((cur - j) & 1) == 0) { if (!HC[j]) oppAll = 0; } else { if (!HC[j]) meAll = 0; } }
    if (oppAll && !meAll) return 2;
    if (meAll && !oppAll) return 3;
    return 1;
  }
  return 0;
}
static int bigPieces(int c) { FOR_BITS(BB[c][0], BB[c][1], s) int t = TYPE(B[s]); if (t == ROOK || t == HORSE || t == CANNON) return 1; END_BITS return 0; }
static inline int moveScore(Move m, Move ttm, int ply) {
  if (m == ttm) return 1 << 30;
  u8 v = B[MT(m)];
  if (v) return (1 << 28) + PV_[TYPE(v)] * 16 - PV_[TYPE(B[MF(m)])] / 8;
  if (m == killers[ply][0]) return 1 << 27;
  if (m == killers[ply][1]) return (1 << 27) - 1;
  return hist[side][MF(m)][MT(m)];
}
// ---- search v2 (2026-11-13): the pruning of the tafl / chess engines (each part can be switched off for a measurement: -DSV_x=0)
#ifndef SV_LMR
#define SV_LMR 1   // late move reductions by a log table (was 1..3 by the move's place)
#endif
#ifndef SV_LMP
#define SV_LMP 1   // late move pruning: at a shallow depth the late quiet moves are not searched
#endif
#ifndef SV_NMP
#define SV_NMP 1   // null move: a deeper reduction (3 + depth/4 + by the margin)
#endif
#ifndef SV_RFP
#define SV_RFP 1   // reverse futility up to depth 6
#endif
#ifndef SV_FUT
#define SV_FUT 1   // futility up to depth 4
#endif
#ifndef SV_IIR
#define SV_IIR 1   // no table move: one ply shallower
#endif
#ifndef SV_MALUS
#define SV_MALUS 1 // the quiet moves tried before a cut-off lose history
#endif
#ifndef SV_DELTA
#define SV_DELTA 1 // quiescence: a capture that cannot reach alpha is skipped
#endif
#ifndef SV_TTEV
#define SV_TTEV 1  // the table's value as a better static evaluation
#endif
#ifndef LMR_BASE
#define LMR_BASE 300
#endif
#ifndef LMR_DIV
#define LMR_DIV 22
#endif
#ifndef LMP_A
#define LMP_A 6
#endif
#ifndef LMP_B
#define LMP_B 3
#endif
static u8 lmrT[64][64]; static int lmrInit;
static int svOff;   // 1 during values(): the fixed-depth search of the weak levels (Lv.1-12) stays as it was (shared: only the main thread sets it)
static void initLmr(void) {   // floor(0.3 + ln(d) ln(n) / 2.2) without libm: the logs by a table of ln(1..63) x 1000
  static const short LN[64] = { 0, 0, 693, 1099, 1386, 1609, 1792, 1946, 2079, 2197, 2303, 2398, 2485, 2565, 2639, 2708, 2773, 2833, 2890, 2944, 2996,
    3045, 3091, 3135, 3178, 3219, 3258, 3296, 3332, 3367, 3401, 3434, 3466, 3497, 3526, 3555, 3584, 3611, 3638, 3664, 3689, 3714, 3738, 3761,
    3784, 3807, 3829, 3850, 3871, 3892, 3912, 3932, 3951, 3970, 3989, 4007, 4025, 4043, 4060, 4078, 4094, 4111, 4127, 4143 };
  for (int d = 1; d < 64; d++) for (int n = 1; n < 64; n++) lmrT[d][n] = (u8)((LMR_BASE * 1000 + (long)LN[d] * LN[n] * 10 / LMR_DIV) / 1000000);
  lmrInit = 1;
}
// the reduction of the move in place lg (1 = first) at this depth: a quiet move that gives no check, not in check, not a killer
static inline int lmrRed(int depth, int lg, int pv, int h) {
#if SV_LMR
  if (svOff) { int r0 = 1 + (lg > 10) + (depth >= 8 && lg > 20); if (pv && r0) r0--; return r0; }
  int red = lmrT[depth > 63 ? 63 : depth][lg > 63 ? 63 : lg];
  if (pv && red) red--;
  if (h > 4000 && red) red--;       // a move that has cut off often
  else if (h < -4000) red++;        // one that has failed often
  return red;
#else
  int red = 1 + (lg > 10) + (depth >= 8 && lg > 20);
  if (pv && red) red--;
  return red;
#endif
}
// late move pruning: the number of moves searched at this depth before the quiet ones are dropped
static inline int lmpCount(int depth) { return LMP_A + LMP_B * depth * depth; }
static int qsearch(int alpha, int beta, int ply, int qd) {
  nodes++;
  if (timeUp()) return 0;
  int me = side, inChk = attackedKing(me);
  if (ply >= MAXPLY - 2) return evaluate();
  int best = -INF;
  if (!inChk) {
    int e = evaluate();
    if (e >= beta) return e;
    if (e > alpha) alpha = e;
    best = e;
  }
  Move L[MAXMV]; int n = gen(L, !inChk);
  int sc[MAXMV]; for (int i = 0; i < n; i++) sc[i] = moveScore(L[i], 0, ply);
  int legal = 0;
  for (int i = 0; i < n; i++) {
    int bi = i; for (int j = i + 1; j < n; j++) if (sc[j] > sc[bi]) bi = j;
    { Move tm = L[bi]; L[bi] = L[i]; L[i] = tm; int ts = sc[bi]; sc[bi] = sc[i]; sc[i] = ts; }
    Move m = L[i];
    if (!inChk && qd > 6 && TYPE(B[MT(m)]) == PAWN) continue;
#if SV_DELTA
    if (!svOff && !inChk && best + PV_[TYPE(B[MT(m)])] + 250 <= alpha && alpha > -WINT) continue;   // (best = the static evaluation or better)
#endif
    u8 c = makeMove(m);
    if (attackedKing(me)) { unmakeMove(m, c); continue; }
    legal++;
    int v = -qsearch(-beta, -alpha, ply + 1, qd + 1);
    unmakeMove(m, c);
    if (stopFlag) return best > -INF ? best : 0;
    if (v > best) { best = v; if (v > alpha) { alpha = v; if (v >= beta) break; } }
  }
  if (inChk && !legal) return -(WIN - ply);
  return best;
}
static int search(int depth, int alpha, int beta, int ply, int pv, int nullOk) {
  if (ply > 0) {
    int r = repState();
    if (r == 1) return 0;
    if (r == 2) return REPWIN;
    if (r == 3) return -REPWIN;
    if (hn - 1 - hirr >= DRAW_PLIES) return 0;
    int ma = -(WIN - ply), mb = WIN - ply - 1;
    if (ma > alpha) { alpha = ma; if (alpha >= beta) return alpha; }
    if (mb < beta) { beta = mb; if (alpha >= beta) return beta; }
  }
  if (ply > 0 && timeUp()) return 0;
  int me = side, inChk = HC[hn - 1];
  if (inChk && ply < MAXPLY - 10) depth++;
  if (depth <= 0) return qsearch(alpha, beta, ply, 0);
  if (ply >= MAXPLY - 4) return evaluate();
  nodes++;
  if (ply > seldepth) seldepth = ply;
  TT_PROBE(KEY);
  Move ttm = 0;
  if (e->key == KEY) {
    ttm = e->m;
    if (!pv && e->d >= depth && ply > 0) {
      int v = vFromTT(e->v, ply);
      if (e->flag == TT_EXACT || (e->flag == TT_LOWER && v >= beta) || (e->flag == TT_UPPER && v <= alpha)) return v;
    }
  }
  int stat = -INF;
#if SV_IIR
  if (!svOff && !ttm && depth >= 4 && !inChk) depth--;   // (no move from the table: this node was not worth a full search yet)
#endif
  if (!inChk && !pv) {
    stat = evaluate();
#if SV_TTEV
    if (!svOff && e->key == KEY) { int tv = vFromTT(e->v, ply); if (tv > -WINT && tv < WINT && (e->flag == TT_EXACT || (e->flag == TT_LOWER && tv > stat) || (e->flag == TT_UPPER && tv < stat))) stat = tv; }
#endif
    // reverse futility
    if ((SV_RFP && !svOff ? depth <= 6 && stat - 90 * depth >= beta : depth <= 3 && stat - 110 * depth >= beta) && beta > -WINT && beta < WINT) return stat;
    // null move
    if (nullOk && depth >= 3 && stat >= beta && bigPieces(me) && beta > -WINT && beta < WINT) {
      int R = SV_NMP && !svOff ? 3 + depth / 4 + ((stat - beta) / 200 > 2 ? 2 : (stat - beta) / 200) : 2 + (depth >= 7);
      side ^= 1; KEY ^= ZSIDE; HK[hn] = KEY; HC[hn] = 0; hn++;
      int saveIrr = hirr; hirr = hn - 1;   // the null move cuts repetition chains
      int v = -search(depth - 1 - R, -beta, -beta + 1, ply + 1, 0, 0);
      hn--; hirr = saveIrr; side ^= 1; KEY ^= ZSIDE;
      if (stopFlag) return 0;
      if (v >= beta) return v >= WINT ? beta : v;
    }
  }
  Move L[MAXMV]; int n = gen(L, 0);
  int sc[MAXMV]; for (int i = 0; i < n; i++) sc[i] = moveScore(L[i], ttm, ply);
  int best = -INF, oldAlpha = alpha, legal = 0; Move bestM = 0;
  int futile = !inChk && !pv && stat > -INF && alpha > -WINT && (SV_FUT && !svOff ? depth <= 4 && stat + 120 * depth + 60 <= alpha : depth <= 2 && stat + 150 * depth <= alpha);
  const int lmpN = SV_LMP && !svOff && !inChk && !pv && depth <= 5 && alpha > -WINT ? lmpCount(depth) : 999;
  Move qm[48]; int nq = 0;   // the quiet moves searched (their history is lowered by a later move's cut-off)
#ifdef JG_THREADS
  // (2026-11-10) busy marks (see busyT): a move whose position another thread is searching right now is put off until the
  // other moves are done; it keeps its place in the order (lg) for the reductions
  Move defM[BUSY_DEF]; u8 defL[BUSY_DEF]; int nDef = 0, noSplit = 0;
  for (int k = 0; k < n + nDef; k++) {
    Move m; int lg;
    // YBW: the first move is done and a helper is idle (or an owner above waits for its helpers): the remaining moves go to
    // a split point, in the order of this loop (the selection sort's, then the moves put off), legal ones with their place
    if (k < n && legal && !noSplit && depth >= splitD && (gIdle > 0 || (gWaitN > 0 && spWanted()))) {
      SPt *s = spAlloc(); int ns = 0;
      if (s && spFillPos(s)) {
        int lg2 = legal;
        for (int i = k; i < n && ns >= 0; i++) {
          int bi = i; for (int j = i + 1; j < n; j++) if (sc[j] > sc[bi]) bi = j;
          { Move tm = L[bi]; L[bi] = L[i]; L[i] = tm; int ts = sc[bi]; sc[bi] = sc[i]; sc[i] = ts; }
          Move m2 = L[i]; int cap2 = B[MT(m2)] != 0; u8 c2 = makeMove(m2);
          if (attackedKing(me)) { unmakeMove(m2, c2); continue; }
          int g2 = attackedKing(side); unmakeMove(m2, c2); lg2++;
          if ((futile || lg2 > lmpN) && lg2 > 1 && !cap2 && !g2) continue;
          if (ns == SP_MV) { ns = -1; break; }
          s->mv[ns] = m2; s->lg[ns] = (u8)lg2; s->gc[ns] = (u8)g2; ns++;
        }
        for (int j = 0; j < nDef && ns >= 0; j++) {
          Move m2 = defM[j]; int cap2 = B[MT(m2)] != 0; u8 c2 = makeMove(m2); int g2 = attackedKing(side); unmakeMove(m2, c2);
          if ((futile || defL[j] > lmpN) && defL[j] > 1 && !cap2 && !g2) continue;
          if (ns == SP_MV) { ns = -1; break; }
          s->mv[ns] = m2; s->lg[ns] = defL[j]; s->gc[ns] = (u8)g2; ns++;
        }
      }
      if (ns >= 2) {
        s->n = ns; s->depth = depth; s->ply = ply; s->root = 0; s->all = 0; s->pv = pv; s->inChk = inChk; s->beta = beta;
        s->alpha = alpha;
        spRun(s, &best, &bestM, 0);
        if (stopFlag) return best > -INF ? best : 0;
        if (best >= beta && bestM && !B[MT(bestM)]) {
          if (killers[ply][0] != bestM) { killers[ply][1] = killers[ply][0]; killers[ply][0] = bestM; }
          i32 *h = &hist[me][MF(bestM)][MT(bestM)]; *h += depth * depth;
          if (*h > (1 << 24)) for (int a = 0; a < 2; a++) for (int b = 0; b < 90; b++) for (int q = 0; q < 90; q++) hist[a][b][q] >>= 1;
        }
        break;
      }
      if (s) spRelease(s);
      noSplit = 1;   // (fewer than 2 moves left, or no free slot: on alone)
    }
    if (k < n) {
      int i = k;
      int bi = i; for (int j = i + 1; j < n; j++) if (sc[j] > sc[bi]) bi = j;
      { Move tm = L[bi]; L[bi] = L[i]; L[i] = tm; int ts = sc[bi]; sc[bi] = sc[i]; sc[i] = ts; }
      m = L[i]; lg = legal + 1;
    } else { m = defM[k - n]; lg = defL[k - n]; }
#define LG lg
#else
  for (int i = 0; i < n; i++) {
    int bi = i; for (int j = i + 1; j < n; j++) if (sc[j] > sc[bi]) bi = j;
    { Move tm = L[bi]; L[bi] = L[i]; L[i] = tm; int ts = sc[bi]; sc[bi] = sc[i]; sc[i] = ts; }
    Move m = L[i];
#define LG legal
#endif
    int isCap = B[MT(m)] != 0;
    u8 c = makeMove(m);
    if (attackedKing(me)) { unmakeMove(m, c); continue; }
#ifdef JG_THREADS
    if (k < n && legal && depth >= BUSY_D && nDef < BUSY_DEF && busyOther(KEY)) { unmakeMove(m, c); defM[nDef] = m; defL[nDef++] = (u8)lg; continue; }
#endif
    legal++;
    int givesChk = attackedKing(side);
    if ((futile || LG > lmpN) && LG > 1 && !isCap && !givesChk) { unmakeMove(m, c); continue; }
    HK[hn] = KEY; HC[hn] = (u8)givesChk; hn++;
    int saveIrr = hirr; if (c) hirr = hn - 1;
#ifdef JG_THREADS
    const u64 mkKey = KEY; const int mk = depth >= BUSY_D ? busySet(mkKey) : -1;
#endif
    int v, d1 = depth - 1;
    if (LG == 1) v = -search(d1, -beta, -alpha, ply + 1, pv, 1);
    else {
      int red = 0;
      if (depth >= 3 && LG > 3 && !isCap && !inChk && !givesChk && m != killers[ply][0] && m != killers[ply][1]) {
        red = lmrRed(depth, LG, pv, hist[me][MF(m)][MT(m)]);
        if (red > d1 - 1) red = d1 - 1 > 0 ? d1 - 1 : 0;
      }
      v = -search(d1 - red, -alpha - 1, -alpha, ply + 1, 0, 1);
      if (v > alpha && red) v = -search(d1, -alpha - 1, -alpha, ply + 1, 0, 1);
      if (v > alpha && v < beta) v = -search(d1, -beta, -alpha, ply + 1, pv, 1);
    }
#undef LG
#ifdef JG_THREADS
    if (mk >= 0) busyClear(mkKey, mk);
#endif
    hn--; hirr = saveIrr;
    unmakeMove(m, c);
    if (stopFlag) return best > -INF ? best : 0;
    if (v < beta && !isCap && nq < 48) qm[nq++] = m;
    if (v > best) {
      best = v; bestM = m;
      if (v > alpha) {
        alpha = v;
        if (v >= beta) {
          if (!isCap) {
            if (killers[ply][0] != m) { killers[ply][1] = killers[ply][0]; killers[ply][0] = m; }
            i32 *h = &hist[me][MF(m)][MT(m)]; *h += depth * depth;
            if (*h > (1 << 24)) for (int a = 0; a < 2; a++) for (int b = 0; b < 90; b++) for (int q = 0; q < 90; q++) hist[a][b][q] >>= 1;
#if SV_MALUS
            if (!svOff) for (int j = 0; j < nq; j++) { i32 *g = &hist[me][MF(qm[j])][MT(qm[j])]; *g -= depth * depth; if (*g < -(1 << 24)) *g = -(1 << 24); }
#endif
          }
          break;
        }
      }
    }
  }
  if (!legal) {
    if (inChk) return -(WIN - ply);   // checkmate
    // no legal move but not in check: the side passes
    side ^= 1; KEY ^= ZSIDE; HK[hn] = KEY; HC[hn] = (u8)attackedKing(side); hn++;
    int v = -search(depth - 1, -beta, -alpha, ply + 1, pv, 0);
    hn--; side ^= 1; KEY ^= ZSIDE;
    return v;
  }
  ttStore(KEY, depth, best >= beta ? TT_LOWER : best > oldAlpha ? TT_EXACT : TT_UPPER, best, bestM, ply);
  return best;
}

#ifdef JG_THREADS
// ---------------------------------------------------------------- split points: the game's glue for Praline (praline_ybw.h)
// the move i of s (the thread is at s's position) with the null window against a and the re-searches, as the one-thread loop
static int spSearch(SPt *s, int i, int a) {
  const int b = s->beta, d1 = s->depth - 1, ply = s->ply; const Move m = s->mv[i]; const int isCap = B[MT(m)] != 0, gc = s->gc[i];
  u8 c = makeMove(m);
  HK[hn] = KEY; HC[hn] = (u8)gc; hn++;
  int saveIrr = hirr; if (c) hirr = hn - 1;
  const u64 mkKey = KEY; const int mk = !s->all && s->depth >= BUSY_D ? busySet(mkKey) : -1;
  int v;
  if (s->root) {
    if (s->all) v = -search(d1, -INF, INF, 1, 1, 1);
    else { v = -search(d1, -a - 1, -a, 1, 0, 1); if (v > a && v < b && !stopFlag) v = -search(d1, -b, -a, 1, 1, 1); }
  } else {
    const int LG = s->lg[i]; int red = 0;
    if (s->depth >= 3 && LG > 3 && !isCap && !s->inChk && !gc && m != killers[ply][0] && m != killers[ply][1]) {
      red = lmrRed(s->depth, LG, s->pv, hist[side ^ 1][MF(m)][MT(m)]);   // (after makeMove: the mover is side ^ 1)
      if (red > d1 - 1) red = d1 - 1 > 0 ? d1 - 1 : 0;
    }
    v = -search(d1 - red, -a - 1, -a, ply + 1, 0, 1);
    if (v > a && red) v = -search(d1, -a - 1, -a, ply + 1, 0, 1);
    if (v > a && v < b) v = -search(d1, -b, -a, ply + 1, s->pv, 1);
  }
  if (mk >= 0) busyClear(mkKey, mk);
  hn--; hirr = saveIrr;
  unmakeMove(m, c);
  return v;
}
// a cut-off by the move i of s (not the root): this thread's killers / history, as the one-thread cut-off (quiet moves)
static void spCutoff(const SPt *s, int i) {
  if (B[MT(s->mv[i])]) return;
  const Move m = s->mv[i]; const int ply = s->ply;
  if (killers[ply][0] != m) { killers[ply][1] = killers[ply][0]; killers[ply][0] = m; }
  i32 *h = &hist[side][MF(m)][MT(m)]; *h += s->depth * s->depth;
  if (*h > (1 << 24)) for (int x = 0; x < 2; x++) for (int y = 0; y < 90; y++) for (int q = 0; q < 90; q++) hist[x][y][q] >>= 1;
}
static inline int spTop(void) { return xqTop; }   // (the NNUE accumulator's slot: a thread helping below its own split point uses the next one)
static void waitCheck(void) { SIM_IDLE(); mtCheck(); }
static void spIdleReset(int fresh) {   // mt_idle: a helper's search state (fresh: a new job, as beginSearch)
  nodes = 0; tEnd = 0; nodeLimitOn = 0; rootK = 0;
  if (fresh) {
    for (int a = 0; a < 2; a++) for (int b = 0; b < 90; b++) for (int c = 0; c < 90; c++) hist[a][b][c] >>= 2;
    memset(killers, 0, sizeof(killers));
  }
}
#include "../shared/praline/praline_ybw.h"
#endif

// ---------------------------------------------------------------- root / host interface
static TLS u8 RB[90]; static TLS int rootSide; static TLS u64 rootKey;
static TLS Move rootL[MAXMV]; static TLS int rootN; static TLS int rootVal[MAXMV];
static TLS int rootHn, rootHirr;
static void loadRoot(void) { memcpy(B, RB, 90); side = rootSide; findKings(); KEY = rootKey; hn = rootHn; hirr = rootHirr; }
// setup: IO = [90 point codes, side, nmoves, moves..., nexcl, excluded root moves...]. Returns 1 if all moves were legal.
EXPORT(setup) int setup(void) {
  initGeo(); initEval(); if (!lmrInit) initLmr();
  for (int s = 0; s < 90; s++) { int v = IO[s]; B[s] = (u8)(v >= 0 && v < 16 && (v & 7) ? v : 0); }
  side = IO[90] ? 1 : 0; findKings();
  if (KSQ[0] < 0 || KSQ[1] < 0) return 0;
  int nm = IO[91]; if (nm < 0) nm = 0; if (nm > HIST_MAX - 2) nm = HIST_MAX - 2;
  KEY = hashBoard(); hn = 0; hirr = 0;
  HK[hn] = KEY; HC[hn] = (u8)attackedKing(side); hn++;
  for (int i = 0; i < nm; i++) {
    Move m = (Move)IO[92 + i], L[MAXMV]; int n = genLegal(L), ok = 0;
    for (int j = 0; j < n; j++) if (L[j] == m) ok = 1;
    if (MF(m) == MT(m) && !n && !attackedKing(side)) ok = 1;   // a pass
    if (!ok) return 0;
    u8 c = makeMove(m);
    HK[hn] = KEY; HC[hn] = (u8)attackedKing(side); hn++;
    if (c) hirr = hn - 1;
  }
  memcpy(RB, B, 90); rootSide = side; rootKey = KEY; rootHn = hn; rootHirr = hirr;
  Move L[MAXMV]; int n = genLegal(L);
  if (!n && !attackedKing(side)) { L[0] = MV(KSQ[side], KSQ[side]); n = 1; }   // only a pass
  int nx = IO[92 + nm]; if (nx < 0 || nx > 64) nx = 0;
  rootN = 0;
  for (int i = 0; i < n; i++) { int ex = 0; for (int j = 0; j < nx; j++) if (IO[93 + nm + j] == L[i]) ex = 1; if (!ex) rootL[rootN++] = L[i]; }
  if (!rootN) for (int i = 0; i < n; i++) rootL[rootN++] = L[i];   // every move excluded: play anyway
  return 1;
}
static int rootSearch(int depth, int all, int alpha0, int beta0) {
  int alpha = alpha0, best = -INF;
#ifdef JG_THREADS
  int rdI[BUSY_DEF], nrd = 0;   // (the busy marks at the root too: a root move another thread is on is put off)
  for (int k = 0; k < rootN + nrd; k++) {
    // YBW at the root: the first move is done, the others go to a split point (with the values of the moves for sortRoot)
    if (k == 1 && rootN - 1 >= 2 && rootN - 1 <= SP_MV && depth >= splitD && gIdle > 0) {
      SPt *s = spAlloc();
      if (s && spFillPos(s)) {
        for (int j = 1; j < rootN; j++) { Move m = rootL[j]; u8 c = makeMove(m); s->gc[j - 1] = (u8)attackedKing(side); unmakeMove(m, c); s->mv[j - 1] = m; s->lg[j - 1] = (u8)(j + 1); }
        s->n = rootN - 1; s->depth = depth; s->ply = 0; s->root = 1; s->all = all; s->pv = 1; s->inChk = HC[hn - 1]; s->beta = all ? INF : beta0;
        s->alpha = alpha;
        Move bm = rootL[0];
        spRun(s, &best, &bm, rootVal + 1);
        return best;
      }
      if (s) spRelease(s);
    }
    int i = k < rootN ? k : rdI[k - rootN];
    Move m = rootL[i]; u8 c = makeMove(m);
    if (k < rootN && i > 0 && !all && depth >= BUSY_D && nrd < BUSY_DEF && busyOther(KEY)) { unmakeMove(m, c); rdI[nrd++] = i; continue; }
    const u64 mkKey = KEY; const int mk = !all && depth >= BUSY_D ? busySet(mkKey) : -1;
#else
  for (int i = 0; i < rootN; i++) {
    Move m = rootL[i]; u8 c = makeMove(m);
#endif
    HK[hn] = KEY; HC[hn] = (u8)attackedKing(side); hn++;
    int saveIrr = hirr; if (c) hirr = hn - 1;
    int v;
    if (all) v = -search(depth - 1, -INF, INF, 1, 1, 1);
    else if (i == 0) v = -search(depth - 1, -beta0, -alpha, 1, 1, 1);
    else { v = -search(depth - 1, -alpha - 1, -alpha, 1, 0, 1); if (v > alpha && v < beta0 && !stopFlag) v = -search(depth - 1, -beta0, -alpha, 1, 1, 1); }
#ifdef JG_THREADS
    if (mk >= 0) busyClear(mkKey, mk);
#endif
    hn--; hirr = saveIrr; unmakeMove(m, c);
    if (stopFlag) return best;
    rootVal[i] = v;
    if (v > best) { best = v; if (v > alpha) alpha = v; }
    if (!all && v >= beta0) return v;
  }
  return best;
}
static void sortRoot(void) {
  for (int i = 1; i < rootN; i++) { Move m = rootL[i]; int v = rootVal[i], j = i - 1; while (j >= 0 && rootVal[j] < v) { rootL[j + 1] = rootL[j]; rootVal[j + 1] = rootVal[j]; j--; } rootL[j + 1] = m; rootVal[j + 1] = v; }
}
static void beginSearch(int ms) {
  if (!lmrInit) initLmr();
  loadRoot();
  stopFlag = 0; nodes = 0; tEnd = ms > 0 ? now() + ms : 0;
#ifdef JG_THREADS
  rootK = 0;   // (best sets it on the main thread: the depth goal a helper may reach first)
  if (threadId == 0)   // (only the main thread ages the shared table)
#endif
  ttAge++;
  for (int a = 0; a < 2; a++) for (int b = 0; b < 90; b++) for (int c = 0; c < 90; c++) hist[a][b][c] >>= 2;
  memset(killers, 0, sizeof(killers));
}
// best move: IO[0] = move, IO[1] = value, IO[2] = depth, IO[3] = nodes / 1000
EXPORT(best) void best(int maxDepth, int ms, int nodeK) {
  beginSearch(ms); nodeLimitOn = nodeK != 0; nodeLimit = nodeK > 0 ? (u64)nodeK * 1000 : (u64)(-nodeK) * 100;   // nodeK < 0: hundreds
  if (rootN == 0) { IO[0] = -1; IO[1] = -WIN; IO[2] = 0; IO[3] = 0; return; }
  Move bm = rootL[0]; int bv = 0, bd = 0;
  if (rootN == 1) { IO[0] = bm; IO[1] = 0; IO[2] = 0; IO[3] = 0; return; }
  // order: captures first by a quick static look
  for (int i = 0; i < rootN; i++) rootVal[i] = B[MT(rootL[i])] ? PV_[TYPE(B[MT(rootL[i])])] : 0;
  sortRoot();
  int prev = 0, d0 = 1;
#ifdef JG_THREADS
  // (2026-11-09) every thread iterates 1, 2, 3, … like the main one: the helpers' start a ply ahead (every other one) was slower
  // to the main thread's depth in the measurement (MODEL_CARD.md). The root key: the position, its history length and the root
  // moves (the excluded ones are left out of rootL: the count and the moves).
  u64 rk = rootKey ^ (u64)rootHn << 40 ^ (u64)rootN << 52;
  for (int i = 0; i < rootN; i++) rk += (u64)rootL[i] * 0x9E3779B97F4A7C15ull;
  rk |= 1;
  if (!threadId) {   // a new search: forget the threads' results of the last one, set the depth goal
    for (int i = 0; i < MT_SLOTS; i++) { __atomic_store_n(&gRes[i][0], 0, __ATOMIC_SEQ_CST); __atomic_store_n(&gRes[i][1], 0, __ATOMIC_SEQ_CST); }
    gHit = 0; gGoal = maxDepth; gGoalKey = rk; rootK = rk;
  }
#endif
  for (int d = d0; d <= maxDepth && d < MAXPLY - 10; d++) {
    seldepth = 0;
    int a = d >= 4 ? prev - 35 : -INF, b = d >= 4 ? prev + 35 : INF, v;
    for (;;) {
      v = rootSearch(d, 0, a, b);
      if (stopFlag) break;
      if (v <= a) { a -= 150; if (a < -1500) a = -INF; continue; }
      if (v >= b) { b += 150; if (b > 1500) b = INF; continue; }
      break;
    }
    if (stopFlag && d > 1) {
      // a move that already beat the previous best at this depth is kept
      int bi = 0; for (int i = 1; i < rootN; i++) if (rootVal[i] > rootVal[bi]) bi = i;
      if (bi && rootVal[0] > -INF && rootVal[bi] > rootVal[0]) { bm = rootL[bi]; bv = rootVal[bi]; }
      break;
    }
    int bi = 0; for (int i = 1; i < rootN; i++) if (rootVal[i] > rootVal[bi]) bi = i;
    if (bi) { Move t = rootL[bi]; int tv = rootVal[bi]; for (int i = bi; i > 0; i--) { rootL[i] = rootL[i - 1]; rootVal[i] = rootVal[i - 1]; } rootL[0] = t; rootVal[0] = tv; }
    for (int i = 1; i < rootN; i++) rootVal[i] = -INF;
    bm = rootL[0]; bv = v; bd = d; prev = v;
#ifdef JG_THREADS
    if (threadId < MT_SLOTS) {   // publish the finished iteration
      u64 x = (u64)(d & 255) | (u64)(u16)(i16)bv << 8 | (u64)bm << 24 | 1ull << 40;
      __atomic_store_n(&gRes[threadId][1], x, __ATOMIC_SEQ_CST); __atomic_store_n(&gRes[threadId][0], rk ^ x, __ATOMIC_SEQ_CST);
      if (threadId && d >= gGoal && gGoalKey == rk) gHit = rk;
    }
    IO[0] = bm; IO[1] = bv; IO[2] = bd; IO[3] = (i32)(nodes / 1000);   // (the result so far, for the progress readouts)
#endif
    progress(d, 1);
    if (v > WINT && WIN - v <= d) break;
    if (v < -WINT && WIN + v <= d) break;
    if (ms > 0 && d > 1 && now() > tEnd - ms * 0.5) break;
#ifdef JG_THREADS
    if (gStop) break;
#endif
  }
#ifdef JG_THREADS
  if (!threadId) {   // the deepest finished iteration of all the threads (the main thread's on a tie)
    int bt = -1, bdep = bd;
    for (int i = 1; i < MT_SLOTS; i++) {
      u64 x = __atomic_load_n(&gRes[i][1], __ATOMIC_SEQ_CST), kx = __atomic_load_n(&gRes[i][0], __ATOMIC_SEQ_CST);
      if (!(x >> 40) || (kx ^ x) != rk) continue;
      int dd = (int)(x & 255); if (dd > bdep) { bdep = dd; bt = i; }
    }
    if (bt > 0) {
      u64 x = __atomic_load_n(&gRes[bt][1], __ATOMIC_SEQ_CST), kx = __atomic_load_n(&gRes[bt][0], __ATOMIC_SEQ_CST);
      Move m = (Move)(x >> 24); int ok = 0;
      for (int i = 0; i < rootN; i++) if (rootL[i] == m) ok = 1;
      if ((kx ^ x) == rk && ok) { bm = m; bv = (i16)(u16)(x >> 8); bd = (int)(x & 255); }
    }
    gGoalKey = 0; gHit = 0; rootK = 0;
  }
#endif
  loadRoot();
  IO[0] = bm; IO[1] = bv; IO[2] = bd; IO[3] = (i32)(nodes / 1000);
}
static void writeList(int depth, const Move *ord, const int *vals, int n) {
  IO[0] = n; IO[1] = depth; for (int i = 0; i < n; i++) { IO[2 + 2 * i] = ord[i]; IO[3 + 2 * i] = vals[i]; }
}
// analysis: values of all root moves. IO[0] = n, IO[1] = depth, then (move, value) * n, best first
EXPORT(analyze) void analyze(int ms, int maxDepth) {
  beginSearch(ms); nodeLimitOn = 0;
  int depthDone = 0; int vals[MAXMV]; Move ord[MAXMV];
  for (int i = 0; i < rootN; i++) { ord[i] = rootL[i]; vals[i] = 0; }
  for (int d = 1; d <= maxDepth && d < MAXPLY - 10 && rootN; d++) {
    rootSearch(d, 1, -INF, INF);
    if (stopFlag && d > 1) break;
    sortRoot();
    for (int i = 0; i < rootN; i++) { ord[i] = rootL[i]; vals[i] = rootVal[i]; }
    depthDone = d;
    loadRoot();
    writeList(depthDone, ord, vals, rootN);
    progress(d, rootN);
    int solved = 1; for (int i = 0; i < rootN; i++) if (vals[i] < WINT && vals[i] > -WINT) solved = 0;
    if (solved && d > 2) break;
    if (rootN == 1 && d >= 6) break;
    if (stopFlag) break;
    if (d > 1 && now() > tEnd - ms * 0.55) break;
  }
  loadRoot();
  writeList(depthDone, ord, vals, rootN);
}
// principal variation from the transposition table after a search (review box): IO[0] = n, IO[1..n] = moves, starting
// with m0 (a root move); stops at a missing / illegal entry or a repeated position
EXPORT(pv_line) int pv_line(int m0, int maxLen) {
  loadRoot();
  int n = 0; Move m = (Move)m0;
  if (maxLen > 60) maxLen = 60;
  while (n < maxLen) {
    Move L[MAXMV]; int nl = genLegal(L), ok = 0;
    for (int j = 0; j < nl; j++) if (L[j] == m) ok = 1;
    if (!nl && MF(m) == MT(m) && !attackedKing(side)) ok = 1;
    if (!ok) break;
    u8 c = makeMove(m); (void)c;
    HK[hn] = KEY; HC[hn] = (u8)attackedKing(side); hn++;
    IO[1 + n++] = m;
    int rep = 0; for (int i = hn - 3; i >= 0; i--) if (HK[i] == KEY) { rep = 1; break; }
    if (rep) break;
    TT_PROBE(KEY);
    if (e->key != KEY || !e->m) break;
    m = e->m;
  }
  loadRoot();
  IO[0] = n;
  return n;
}
// fixed-depth values of all root moves (weak levels)
EXPORT(values) void values(int depth) {
  beginSearch(0); nodeLimitOn = 0;
  svOff = 1;   // (the weak levels' noise and depths were tuned on the search before v2)
  for (int d = 1; d <= depth; d++) { rootSearch(d, 1, -INF, INF); sortRoot(); }
  svOff = 0;
  loadRoot();
  writeList(depth, rootL, rootVal, rootN);
}

// ---------------------------------------------------------------- puzzles: exact mate solver
// mate within k own moves for the side to move (a side without a legal move loses). checksOnly: every attacking move gives check.
#define MT_BITS 18
typedef struct { u64 key; i8 yes, no; } MTE;   // proven: mate in <= yes; disproven: no mate in <= no
static MTE MTT[1 << MT_BITS];
static TLS u64 mBudget; static TLS int mBudgetOut, mChecks;   // (the mate table MTT is shared: puzzles never run on the threads)
static int mateDef(int k);
static int mateAtt(int k) {     // attacker to move: 1 = mates within k, 0 = not, -1 = budget exhausted
  if (k <= 0) return 0;
  u64 key = KEY ^ (mChecks ? 0x5555555555555555ull : 0); MTE *e = &MTT[key & ((1 << MT_BITS) - 1)];
  if (e->key == key) { if (e->yes && e->yes <= k) return 1; if (e->no >= k) return 0; }
  Move L[MAXMV]; int n = gen(L, 0), me = side, unk = 0;
  // checks first, then captures, then the rest
  Move O[MAXMV]; int sc[MAXMV], m2 = 0;
  for (int i = 0; i < n; i++) {
    u8 c = makeMove(L[i]);
    if (attackedKing(me)) { unmakeMove(L[i], c); continue; }
    int chk = attackedKing(side); unmakeMove(L[i], c);
    if (mChecks && !chk) continue;
    O[m2] = L[i]; sc[m2] = chk * 2 + (c != 0); m2++;
  }
  for (int pass = 3; pass >= 0; pass--) for (int i = 0; i < m2; i++) {
    if (sc[i] != pass) continue;
    if (!mBudget) { mBudgetOut = 1; return -1; } mBudget--;
    u8 c = makeMove(O[i]);
    int r = mateDef(k - 1);
    unmakeMove(O[i], c);
    if (r == 1) { if (e->key != key) { e->key = key; e->no = 0; e->yes = 0; } if (!e->yes || e->yes > k) e->yes = (i8)k; return 1; }
    if (r < 0) unk = 1;
  }
  if (unk) return -1;
  if (e->key != key) { e->key = key; e->yes = 0; e->no = 0; }
  if (e->no < k) e->no = (i8)k;
  return 0;
}
static int mateDef(int k) {     // defender to move after an attacking move; attacker has k moves left
  Move L[MAXMV]; int n = gen(L, 0), me = side, legal = 0;
  // replies that capture or move the king first (most likely to escape)
  int order[MAXMV]; int m2 = 0;
  for (int i = 0; i < n; i++) if (B[MT(L[i])] || TYPE(B[MF(L[i])]) == KING) order[m2++] = i;
  for (int i = 0; i < n; i++) if (!(B[MT(L[i])] || TYPE(B[MF(L[i])]) == KING)) order[m2++] = i;
  for (int j = 0; j < m2; j++) {
    Move m = L[order[j]];
    u8 c = makeMove(m);
    if (attackedKing(me)) { unmakeMove(m, c); continue; }
    legal++;
    if (k <= 0) { unmakeMove(m, c); return 0; }
    if (!mBudget) { unmakeMove(m, c); mBudgetOut = 1; return -1; } mBudget--;
    int r = mateAtt(k);
    unmakeMove(m, c);
    if (r != 1) return r;
  }
  if (!legal && !attackedKing(me)) return 0;   // no move but not in check: a pass, not a mate
  return 1;   // no legal reply left without being mated
}
// IO out: [n, (move, need) * n]. Attacker to move (defend = 0): need = own moves to mate counting this move (0 = not within n).
// Defender to move (defend = 1): need = attacker moves still needed after each reply (0 = escaped). need = -1: budget ran out.
EXPORT(puzzle) void puzzle(int n, int defend, int checksOnly, int budgetK) {
  loadRoot();
  mChecks = checksOnly;
  IO[0] = rootN;
  for (int i = 0; i < rootN; i++) {
    Move m = rootL[i]; int need = 0;
    mBudget = (u64)budgetK * 1000; mBudgetOut = 0;
    u8 c = makeMove(m);
    if (!defend && checksOnly && !attackedKing(side)) need = 0;
    else for (int k = defend ? 1 : 0; k <= n - (defend ? 0 : 1); k++) {
      int r = defend ? mateAtt(k) : mateDef(k);
      if (r == 1) { need = defend ? k : k + 1; break; }
      if (r < 0) { need = -1; break; }
    }
    unmakeMove(m, c);
    IO[1 + 2 * i] = m; IO[2 + 2 * i] = need;
  }
}
EXPORT(mate_clear) void mate_clear(void) { memset(MTT, 0, sizeof(MTT)); }
EXPORT(eval_root) int eval_root(void) { loadRoot(); return evaluate(); }
EXPORT(set_evw) void set_evw(int i, int v) { if (i >= 0 && i < 16) evW[i] = v; }
EXPORT(in_check_root) int in_check_root(void) { loadRoot(); return attackedKing(side); }

#ifdef JG_THREADS
// ---------------------------------------------------------------- threads (engine_mt.wasm; shared/mtengine.js, mt-helper.js)
extern unsigned char __heap_base;
extern void __wasm_init_tls(void *);
EXPORT(mt_heap_base) u32 mt_heap_base(void) { return (u32)&__heap_base; }
EXPORT(mt_tls_size) u32 mt_tls_size(void) { return __builtin_wasm_tls_size(); }
// every instance first: mt_stack (its own stack: the top address; a function without a frame of its own), then mt_thread
// (its TLS block and thread number; the first instance — the page's own — also fills the shared tables)
EXPORT(mt_stack) void mt_stack(u32 stackTop) { __asm__ volatile(".globaltype __stack_pointer, i32\n local.get %0\n global.set __stack_pointer" :: "r"(stackTop)); }
EXPORT(mt_thread) void mt_thread(u32 tls, int id) { __wasm_init_tls((void *)tls); threadId = id; initGeo(); initEval(); }
EXPORT(mt_stop) void mt_stop(int v) { __atomic_store_n(&gStop, v, __ATOMIC_SEQ_CST); }
EXPORT(last_nodes) double last_nodes(void) { return (double)nodes; }   // (this thread's last search: the page's nps readout)
#endif
