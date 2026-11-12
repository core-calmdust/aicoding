// Gomoku / Renju — the search in WebAssembly (2026-11-12, tools/build-core.sh). A port of engine.js (Pos, Solver, Engine):
// the same rules (renju with forbidden moves, standard = exactly five, freestyle), the same incremental line patterns, the same
// threat solvers (VCF, VCT) and alpha-beta search with the same move order, table, counters and evaluation (the neural nets of
// nn.c for renju / standard, the learned linear evaluation for freestyle), so one thread gives the same moves, values, depths
// and node counts as the JavaScript search (tools/check-core.js).
// The pattern / zobrist tables are built by engine.js and copied in (tab_* exports), the weights too (nn_* / lw_*).
// -DMT (core_mt.wasm): the threads of the page's pool (shared/mtengine.js) on one shared memory — each thread's search state
// of its own (a block from memory.grow), the transposition table and the move ordering's history shared, Praline's Young
// Brothers Wait with busy marks (shared/praline/) at the nodes of the search and at the root of the analysis.
typedef signed char i8; typedef unsigned char u8; typedef short i16; typedef unsigned short u16; typedef int i32;
typedef unsigned int u32; typedef long long i64; typedef unsigned long long u64;
#ifdef MT
#define TLS _Thread_local
#else
#define TLS
#endif
#ifdef NATIVE   // (a native build for the lockstep simulator tools/mtsim: g_gomoku.h gives now() and the tables)
#define EXPORT(n)
double now(void);
static void js_progress(int depth, int n) { (void)depth; (void)n; }
#include <stdlib.h>
#else
#define EXPORT(n) __attribute__((export_name(#n)))
__attribute__((import_module("env"), import_name("now"))) double now(void);
__attribute__((import_module("env"), import_name("progress"))) void js_progress(int depth, int n);
#endif
#ifdef NATIVE
#elif defined(__wasm_bulk_memory__)
void *memcpy(void *d, const void *s, unsigned long n) { return __builtin_memcpy(d, s, n); }
void *memset(void *d, int c, unsigned long n) { return __builtin_memset(d, c, n); }
#else
void *memcpy(void *d, const void *s, unsigned long n) {
  char *a = d; const char *b = s;
  if (!(((unsigned long)a | (unsigned long)b | n) & 3)) { int *x = d; const int *y = s; n >>= 2; while (n--) *x++ = *y++; return d; }
  while (n--) *a++ = *b++; return d;
}
void *memset(void *d, int c, unsigned long n) { char *a = d; while (n--) *a++ = (char)c; return d; }
#endif
#ifdef __wasm_simd128__
#include <wasm_simd128.h>
#endif

#define N 15
#define S 20
#define SIZE 520
#define EMPTY 0
#define BLACK 1
#define WHITE 2
#define WALL 3
#define WIN 100000
#define WINT 90000
enum { C_NONE, C_2, C_F2, C_3, C_F3, C_B4, C_F33, C_F43, C_F4, C_FIVE };
#define NCOMB 716
#define PAIR (4 * NCOMB)
#define BIAS (PAIR + 200)
#define NLW (BIAS + 2)
static const int DIRS[4] = { 1, S, S + 1, S - 1 };
static const int POW3[11] = { 1, 3, 9, 27, 81, 243, 729, 2187, 6561, 19683, 59049 };

// ---------------------------------------------------------------- tables (filled by engine.js: tab_*)
u8 T_EXACT[59049], T_FREE[59049];
i32 COMB_N[65536], COMB_R[65536];
i16 COMBO[65536];
i32 ZA[SIZE * 3], ZB[SIZE * 3], ZS[2], TAG1[512], TAG2[512];
i32 LWS[NLW];            // the learned linear weights of the 'std' group (eval_std.bin): combos, pairs, bias
i32 LW2S[4][59049];      // its line part by raw window code: A[black], A[white] (colour to move), B[black], B[white]
static int lwOK = 0, nnR = 0, nnS = 0;
static i16 I2M[SIZE], M2I[225];

// ---------------------------------------------------------------- the neural evaluation (nn.c, both sizes)
#define NC 3321
#define Q 256
typedef struct { i16 emb[4 * NC][48] __attribute__((aligned(16))); i16 forb[48] __attribute__((aligned(16))); i16 b0[48] __attribute__((aligned(16))); float l1w[32][48], l1b[32], l2w[32], l2b; } W48;
typedef struct { i16 emb[4 * NC][32] __attribute__((aligned(16))); i16 forb[32] __attribute__((aligned(16))); i16 b0[32] __attribute__((aligned(16))); float l1w[32][32], l1b[32], l2w[32], l2b; } W32;
static W48 NNW48;   // renju (nn_renju.bin, H = 48)
static W32 NNW32;   // standard (nn_std.bin, H = 32)
static i16 canon[6561];
static i16 CAN10[59049];   // canon of a line code's inner 8 digits

// ---------------------------------------------------------------- a position
typedef struct {
  int rule, renju, nnK, lwOn;   // nnK: 1 the renju net, 2 the standard net, 0 none; lwOn: the linear learned sums are kept
  const u8 *TB, *TW; const i32 *CB;
  u8 b[SIZE];
  i16 fb[SIZE];
  i16 cls[2][SIZE];   // (not char: a char store would make the compiler reload everything after it)
  i16 cnt[2][10];
  u16 pat[2][SIZE];
  i16 cb[2][SIZE], pk[SIZE], near[SIZE];
  i32 sc[2][SIZE];
  i32 code[2][SIZE * 4];
  i32 tot[3], tA[3], tB[3], tP[3], LA[3], LB[3];
  int side, ply, fresh;
  u32 h1, h2;
  i16 stack[232];
} Pos;
#define CLS(p, c) ((p)->cls[(c) - 1])
#define CNT(p, c) ((p)->cnt[(c) - 1])
#define SC(p, c) ((p)->sc[(c) - 1])
#define PAT(p, c) ((p)->pat[(c) - 1])

static inline void pairUpd(Pos *p, int i) {
  const i32 *lw = LWS; const int a = p->cls[0][i], b = p->cls[1][i], nk = a >= 0 && b >= 0 ? a * 10 + b : -1, ok = p->pk[i];
  if (nk == ok) return;
  if (ok >= 0) { p->tP[1] -= lw[PAIR + ok]; p->tP[2] -= lw[PAIR + 100 + ok]; }
  if (nk >= 0) { p->tP[1] += lw[PAIR + nk]; p->tP[2] += lw[PAIR + 100 + nk]; }
  p->pk[i] = (i16)nk;
}
static void cellUpd(Pos *p, int i, int c) {
  i16 *cl = CLS(p, c); i16 *cn = CNT(p, c);
  const int ok = cl[i];
  if (ok >= 0) cn[ok]--;
  const i32 x = (c == 1 ? p->CB : COMB_N)[PAT(p, c)[i]]; const int k = x & 15, s = x >> 8;
  cl[i] = (i16)k; cn[k]++;
  p->tot[c] += s - SC(p, c)[i]; SC(p, c)[i] = s;
  if (c == 1) p->fb[i] = (i16)((x >> 4) & 3);
  if (p->lwOn) {
    const i32 *lw = LWS;
    const int nb = c == 1 && p->renju && ((x >> 4) & 3) == 1 ? 715 : COMBO[PAT(p, c)[i]], ob = p->cb[c - 1][i];
    if (nb != ob) {
      const int ta = (c - 1) * NCOMB, tb = (2 + c - 1) * NCOMB;
      if (ob >= 0) { p->tA[c] -= lw[ta + ob]; p->tB[c] -= lw[tb + ob]; }
      p->tA[c] += lw[ta + nb]; p->tB[c] += lw[tb + nb]; p->cb[c - 1][i] = (i16)nb;
    }
    pairUpd(p, i);
  }
}
static void cellOff(Pos *p, int i, int c) {
  i16 *cl = CLS(p, c);
  const int ok = cl[i];
  if (ok >= 0) CNT(p, c)[ok]--;
  cl[i] = -1; p->tot[c] -= SC(p, c)[i]; SC(p, c)[i] = 0;
  if (c == 1) p->fb[i] = 0;
  const int ob = p->cb[c - 1][i];
  if (ob >= 0 && p->lwOn) { p->tA[c] -= LWS[(c - 1) * NCOMB + ob]; p->tB[c] -= LWS[(2 + c - 1) * NCOMB + ob]; }
  p->cb[c - 1][i] = -1;
  if (p->lwOn) pairUpd(p, i);
}
static void refresh(Pos *p, int i) {
  for (int c = 1; c <= 2; c++) {
    const u8 *T = c == 1 ? p->TB : p->TW; const i32 *code = p->code[c - 1];
    int pk = 0;
    for (int d = 0; d < 4; d++) pk |= T[code[i * 4 + d]] << (4 * d);
    PAT(p, c)[i] = (u16)pk;
    if (p->b[i] == EMPTY) cellUpd(p, i, c); else cellOff(p, i, c);
  }
}
static inline void lineCell(Pos *p, int i, int s) {
  const i32 *cb = p->code[0], *cw = p->code[1];
  for (int d = 0; d < 4; d++) { const int x = i * 4 + d; p->LA[1] += s * LW2S[0][cb[x]]; p->LB[1] += s * LW2S[2][cb[x]]; p->LA[2] += s * LW2S[1][cw[x]]; p->LB[2] += s * LW2S[3][cw[x]]; }
}
static void posInit(Pos *p, int rule) {
  p->rule = rule; p->renju = rule == 0;
  p->TB = rule == 2 ? T_FREE : T_EXACT; p->TW = rule == 1 ? T_EXACT : T_FREE;
  p->CB = p->renju ? COMB_R : COMB_N;
  p->nnK = p->renju ? (nnR ? 1 : 0) : rule == 1 ? (nnS ? 2 : 0) : 0;   // (freestyle keeps the linear evaluation)
  p->lwOn = !p->nnK && !p->renju && lwOK;                              // (no linear weights for renju: the hand-made evaluation)
  for (int i = 0; i < SIZE; i++) { p->b[i] = WALL; p->fb[i] = 0; p->cls[0][i] = p->cls[1][i] = -1; p->pat[0][i] = p->pat[1][i] = 0; p->cb[0][i] = p->cb[1][i] = -1; p->pk[i] = -1; p->near[i] = 0; p->sc[0][i] = p->sc[1][i] = 0; }
  for (int i = 0; i < SIZE * 4; i++) p->code[0][i] = p->code[1][i] = 0;
  for (int m = 0; m < 225; m++) p->b[M2I[m]] = EMPTY;
  for (int c = 0; c < 2; c++) for (int k = 0; k < 10; k++) p->cnt[c][k] = 0;
  for (int c = 0; c < 3; c++) p->tot[c] = p->tA[c] = p->tB[c] = p->tP[c] = p->LA[c] = p->LB[c] = 0;
  p->side = BLACK; p->ply = 0; p->h1 = p->h2 = 0; p->fresh = 1;
  for (int i = 0; i < SIZE; i++) {
    if (I2M[i] < 0) continue;
    for (int d = 0; d < 4; d++) {
      int cb = 0, cw = 0;
      for (int o = -5; o <= 5; o++) {
        if (!o) continue;
        if (p->b[i + o * DIRS[d]] == WALL) { const int k = o < 0 ? o + 5 : o + 4; cb += 2 * POW3[k]; cw += 2 * POW3[k]; }
      }
      p->code[0][i * 4 + d] = cb; p->code[1][i * 4 + d] = cw;
    }
  }
  for (int i = 0; i < SIZE; i++) if (I2M[i] >= 0) refresh(p, i);
  if (p->lwOn) for (int i = 0; i < SIZE; i++) if (I2M[i] >= 0) lineCell(p, i, 1);
}
static i8 OLO[SIZE * 4], OHI[SIZE * 4];   // per cell and direction: the offsets o (-5..5) whose cell i - o * D is on the board
static inline void putCell(Pos *p, int q, int d, int sh, int mask, int db, int dw) {
  i32 *cb = p->code[0], *cw = p->code[1];
  const int x = q * 4 + d, ob0 = cb[x], ow0 = cw[x], nb0 = ob0 + db, nw0 = ow0 + dw;
  cb[x] = nb0; cw[x] = nw0;
  const int e = p->b[q] == EMPTY;
  if (p->lwOn && e) { p->LA[1] += LW2S[0][nb0] - LW2S[0][ob0]; p->LB[1] += LW2S[2][nb0] - LW2S[2][ob0]; p->LA[2] += LW2S[1][nw0] - LW2S[1][ow0]; p->LB[2] += LW2S[3][nw0] - LW2S[3][ow0]; }
  // a cell's class, score and learned sums depend only on its packed pattern: skip cellUpd when it did not change
  const int ob = p->pat[0][q], ow = p->pat[1][q], nb = (ob & mask) | (p->TB[nb0] << sh), nw = (ow & mask) | (p->TW[nw0] << sh);
  if (nb != ob) { p->pat[0][q] = (u16)nb; if (e) cellUpd(p, q, 1); }
  if (nw != ow) { p->pat[1][q] = (u16)nw; if (e) cellUpd(p, q, 2); }
}
static void put(Pos *p, int i, int color, int sign) {
  const int vb = color == 1 ? sign : 2 * sign, vw = color == 2 ? sign : 2 * sign;
  for (int d = 0; d < 4; d++) {
    const int D = DIRS[d], sh = 4 * d, mask = ~(15 << sh), lo = OLO[i * 4 + d], hi = OHI[i * 4 + d];
    for (int o = lo; o < 0; o++) putCell(p, i - o * D, d, sh, mask, vb * POW3[o + 5], vw * POW3[o + 5]);
    for (int o = 1; o <= hi; o++) putCell(p, i - o * D, d, sh, mask, vb * POW3[o + 4], vw * POW3[o + 4]);
  }
}
static inline void nearUpd(Pos *p, int i, int s) { for (int dy = -2; dy <= 2; dy++) for (int dx = -2; dx <= 2; dx++) p->near[i + dy * S + dx] += (i16)s; }
#ifdef SIM_NODE
static TLS long long simMk;   // (the simulator's clock: moves made)
#endif
static void pmake(Pos *p, int i) {   // (a board index)
#ifdef SIM_NODE
  simMk++; SIM_NODE();
#endif
  const int c = p->side;
  if (p->lwOn) lineCell(p, i, -1);
  p->b[i] = (u8)c; cellOff(p, i, 1); cellOff(p, i, 2);
  put(p, i, c, 1); nearUpd(p, i, 1);
  p->h1 ^= (u32)ZA[i * 3 + c] ^ (u32)ZS[0]; p->h2 ^= (u32)ZB[i * 3 + c] ^ (u32)ZS[1];
  p->stack[p->ply++] = (i16)i; p->side = 3 - c;
}
static void punmake(Pos *p) {
  const int i = p->stack[--p->ply], c = p->b[i];
  p->b[i] = EMPTY; put(p, i, c, -1); nearUpd(p, i, -1);
  if (p->lwOn) lineCell(p, i, 1);
  cellUpd(p, i, 1); cellUpd(p, i, 2);
  p->h1 ^= (u32)ZA[i * 3 + c] ^ (u32)ZS[0]; p->h2 ^= (u32)ZB[i * 3 + c] ^ (u32)ZS[1];
  p->side = c;
}
static inline void ppass(Pos *p) { p->side = 3 - p->side; p->h1 ^= (u32)ZS[0]; p->h2 ^= (u32)ZS[1]; }

// ---------------------------------------------------------------- the exact forbidden test (recursive, on the raw board)
static inline int runLen(const u8 *b, int i, int D, int c) { int n = 1, q = i - D; while (b[q] == c) { n++; q -= D; } q = i + D; while (b[q] == c) { n++; q += D; } return n; }
static int straightFourDir(u8 *b, int i, int D) {
  int c1 = -1, c2 = -1, n = 0;
  for (int k = -4; k <= 4; k++) {
    if (!k) continue;
    const int q = i + k * D; if (b[q] != EMPTY) continue;
    b[q] = BLACK; const int L = runLen(b, i, D, BLACK); b[q] = EMPTY;
    if (L == 5) { if (n == 0) c1 = q; else c2 = q; n++; }
  }
  if (n != 2 || (c2 - c1 != 5 * D && c1 - c2 != 5 * D)) return 0;
  const int lo = c1 < c2 ? c1 : c2, hi = c1 < c2 ? c2 : c1;
  for (int q = lo + D; q < hi; q += D) if (b[q] != BLACK) return 0;
  return 1;
}
static int fourDir(u8 *b, int i, int D) {
  int c1 = -1, c2 = -1, n = 0;
  for (int k = -4; k <= 4; k++) {
    if (!k) continue;
    const int q = i + k * D; if (b[q] != EMPTY) continue;
    b[q] = BLACK; const int L = runLen(b, i, D, BLACK); b[q] = EMPTY;
    if (L == 5) { if (n == 0) c1 = q; else c2 = q; n++; }
  }
  if (n <= 1) return n;
  if (n == 2 && (c2 - c1 == 5 * D || c1 - c2 == 5 * D)) {
    int ok = 1; const int lo = c1 < c2 ? c1 : c2, hi = c1 < c2 ? c2 : c1;
    for (int q = lo + D; q < hi; q += D) if (b[q] != BLACK) ok = 0;
    if (ok) return 1;
  }
  return 2;
}
static int exactForbid(u8 *b, int i);
static int threeDir(u8 *b, int i, int D) {
  for (int k = -4; k <= 4; k++) {
    if (!k) continue;
    const int q = i + k * D; if (b[q] != EMPTY) continue;
    b[q] = BLACK; const int sf = straightFourDir(b, i, D); b[q] = EMPTY;
    if (sf && !exactForbid(b, q)) return 1;
  }
  return 0;
}
static int exactForbid(u8 *b, int i) {
  if (b[i] != EMPTY) return 0;
  b[i] = BLACK;
  int five = 0, over = 0;
  for (int d = 0; d < 4; d++) { const int L = runLen(b, i, DIRS[d], BLACK); if (L == 5) five = 1; else if (L > 5) over = 1; }
  int res = 0;
  if (five) res = 0;
  else if (over) res = 3;
  else {
    int fours = 0, has4[4] = { 0, 0, 0, 0 };
    for (int d = 0; d < 4; d++) { const int f = fourDir(b, i, DIRS[d]); if (f) { fours += f; has4[d] = 1; } }
    if (fours >= 2) res = 2;
    else {
      int threes = 0;
      for (int d = 0; d < 4 && threes < 2; d++) if (!has4[d] && threeDir(b, i, DIRS[d])) threes++;
      if (threes >= 2) res = 1;
    }
  }
  b[i] = EMPTY;
  return res;
}
static inline int forbidIdx(Pos *p, int i) { if (!p->renju || !p->fb[i]) return 0; return exactForbid(p->b, i); }
static inline int openingOk(const Pos *p, int i) {
  if (!p->renju || !p->fresh || p->ply > 2) return 1;
  const int m = I2M[i]; int dx = m % N - 7, dy = m / N - 7; if (dx < 0) dx = -dx; if (dy < 0) dy = -dy;
  return (dx > dy ? dx : dy) <= p->ply;
}
static inline int legalIdx(Pos *p, int i) {
  if (i < 0 || i >= SIZE || I2M[i] < 0 || p->b[i] != EMPTY) return 0;
  if (!openingOk(p, i)) return 0;
  if (p->side == BLACK && p->renju && p->fb[i] && forbidIdx(p, i)) return 0;
  return 1;
}
static inline int legalFor(Pos *p, int i, int c) { return !(c == BLACK && p->renju && p->fb[i] && forbidIdx(p, i)); }
static int lastFive(const Pos *p) {   // did the last move make five?
  if (!p->ply) return 0;
  const int i = p->stack[p->ply - 1], c = p->b[i], exact = c == BLACK ? p->rule != 2 : p->rule == 1;
  for (int d = 0; d < 4; d++) {
    const int D = DIRS[d]; int a = i, z = i;
    while (p->b[a - D] == c) a -= D;
    while (p->b[z + D] == c) z += D;
    const int len = (z - a) / D + 1;
    if (exact ? len == 5 : len >= 5) return 1;
  }
  return 0;
}

// ---------------------------------------------------------------- helpers (board indices)
static int fiveCells(const Pos *p, int c, int *out) {
  if (!CNT(p, c)[C_FIVE]) return 0;
  const i16 *k = CLS(p, c); int n = 0;
  for (int m = 0; m < 225; m++) { const int i = M2I[m]; if (p->b[i] == EMPTY && k[i] == C_FIVE) out[n++] = i; }
  return n;
}
static inline int hasFive(const Pos *p, int c) { return CNT(p, c)[C_FIVE] > 0; }
static int winCell(Pos *p, int c) {
  if (!CNT(p, c)[C_F4]) return -1;
  const i16 *k = CLS(p, c);
  for (int m = 0; m < 225; m++) { const int i = M2I[m]; if (p->b[i] == EMPTY && k[i] == C_F4 && legalFor(p, i, c)) return i; }
  return -1;
}
// a stable sort of the cells by key descending (as Array.prototype.sort with (p, q) => key[q] - key[p])
static void sortDesc(int *a, int n, const i32 *key) {
  if (n < 2) return;
  if (n <= 24) {
    for (int j = 1; j < n; j++) { const int x = a[j]; const i32 kx = key[x]; int k = j; while (k > 0 && key[a[k - 1]] < kx) { a[k] = a[k - 1]; k--; } a[k] = x; }
    return;
  }
  int tmp[232], *src = a, *dst = tmp;
  for (int w = 1; w < n; w *= 2) {
    for (int lo = 0; lo < n; lo += 2 * w) {
      int mid = lo + w < n ? lo + w : n, hi = lo + 2 * w < n ? lo + 2 * w : n, x = lo, y = mid, o = lo;
      while (x < mid && y < hi) dst[o++] = key[src[y]] > key[src[x]] ? src[y++] : src[x++];
      while (x < mid) dst[o++] = src[x++];
      while (y < hi) dst[o++] = src[y++];
    }
    int *t = src; src = dst; dst = t;
  }
  if (src != a) for (int j = 0; j < n; j++) a[j] = src[j];
}
static TLS i32 SKEY[SIZE];
static void sortThreat(const Pos *p, int c, int *out, int n) {   // (k[q] - k[p] || sc[q] - sc[p]): one key
  const i16 *k = CLS(p, c); const i32 *s = SC(p, c);
  for (int j = 0; j < n; j++) { const int i = out[j]; SKEY[i] = k[i] * 4194304 + s[i]; }   // (|sc| < 2^21)
  sortDesc(out, n, SKEY);
}
static int fourCells(Pos *p, int c, int *out) {
  const i16 *n = CNT(p, c); int k = 0;
  if (!n[C_B4] && !n[C_F43] && !n[C_F4]) return 0;
  const i16 *cl = CLS(p, c);
  for (int m = 0; m < 225; m++) {
    const int i = M2I[m]; if (p->b[i] != EMPTY) continue;
    const int x = cl[i];
    if ((x == C_B4 || x == C_F43 || x == C_F4) && legalFor(p, i, c)) out[k++] = i;
  }
  sortThreat(p, c, out, k);
  return k;
}
static int threatCells(Pos *p, int c, int *out) {
  const i16 *cl = CLS(p, c); int k = 0;
  for (int m = 0; m < 225; m++) {
    const int i = M2I[m]; if (p->b[i] != EMPTY) continue;
    if (cl[i] >= C_F3 && legalFor(p, i, c)) out[k++] = i;
  }
  sortThreat(p, c, out, k);
  return k;
}
static inline int forcing(Pos *p, int c) { return hasFive(p, c) || winCell(p, c) >= 0; }
static int immediate(Pos *p) {
  const int a = p->side, d = 3 - a;
  if (hasFive(p, a)) return 1;
  if (hasFive(p, d)) return 0;
  return winCell(p, a) >= 0;
}
static int defenceCells(Pos *p, int a, int d, int *out) {
  const i16 *ka = CLS(p, a), *kd = CLS(p, d); int n = 0;
  for (int m = 0; m < 225; m++) {
    const int i = M2I[m]; if (p->b[i] != EMPTY) continue;
    const int x = ka[i], y = kd[i];
    if (((x >= C_B4 && x != C_F33) || x == C_F4 || (y >= C_B4 && y != C_F33)) && legalFor(p, i, d)) out[n++] = i;
  }
  return n;
}

// ---------------------------------------------------------------- the threat solver (its own table per thread)
#define STT_BITS 18
#define STT_SIZE (1 << STT_BITS)
#define STT_MASK (STT_SIZE - 1)
typedef struct { i32 k1[STT_SIZE], k2[STT_SIZE], val[STT_SIZE], gen[STT_SIZE]; i32 g; i64 nodes, limit; int foursOnly; } Solver;
static inline int sget(const Solver *X, const Pos *p, int tag, int *v) {
  const u32 x = p->h1 ^ (u32)TAG1[tag], h = x & STT_MASK;
  if (X->gen[h] == X->g && (u32)X->k1[h] == x && (u32)X->k2[h] == (p->h2 ^ (u32)TAG2[tag])) { *v = X->val[h]; return 1; }
  return 0;
}
static inline void sset(Solver *X, const Pos *p, int tag, int v) { const u32 x = p->h1 ^ (u32)TAG1[tag], h = x & STT_MASK; X->gen[h] = X->g; X->k1[h] = (i32)x; X->k2[h] = (i32)(p->h2 ^ (u32)TAG2[tag]); X->val[h] = v; }
static inline void sclear(Solver *X) { X->g++; }
// VCF (side to move = c): the winning first move or -1; pv: the length of the line (null: none — the table is used then)
static int vcf(Solver *X, Pos *p, int depth, int *pv) {
  const int c = p->side, o = 3 - c;
  X->nodes++;
  if (X->nodes > X->limit) return -1;
  int f[225], nf = fiveCells(p, c, f); if (nf) { if (pv) *pv += 1; return f[0]; }
  if (depth <= 0) return -1;
  const int k = (depth < 120 ? depth : 120) + 2;
  int hit; if (!pv && sget(X, p, k, &hit)) return hit;
  int of[225], nof = fiveCells(p, o, of);
  int cands[225], nc;
  if (nof >= 2) { sset(X, p, k, -1); return -1; }
  if (nof == 1) { const int q = of[0]; nc = 0; if (CLS(p, c)[q] >= C_B4 && CLS(p, c)[q] != C_F33 && legalFor(p, q, c)) cands[nc++] = q; }
  else nc = fourCells(p, c, cands);
  int res = -1;
  for (int j = 0; j < nc; j++) {
    const int i = cands[j];
    if (CLS(p, c)[i] == C_F4 && legalFor(p, i, c) && !nof) { res = i; if (pv) *pv += 1; break; }
    pmake(p, i);
    const int nmf = fiveCells(p, c, f);
    if (nmf != 1) {
      punmake(p);
      if (nmf >= 2) { res = i; if (pv) *pv += 1; break; }
      continue;
    }
    const int q = f[0];
    if (hasFive(p, o)) { punmake(p); continue; }
    if (!legalFor(p, q, o)) { punmake(p); res = i; if (pv) *pv += 2; break; }
    pmake(p, q);
    int sub = 0;
    const int r = vcf(X, p, depth - 1, pv ? &sub : 0);
    punmake(p); punmake(p);
    if (r >= 0) { res = i; if (pv) *pv += 2 + sub; break; }
  }
  if (!pv && X->nodes <= X->limit) sset(X, p, k, res);
  return res;
}
static int sdefend(Solver *X, Pos *p, int t);
static int sattack(Solver *X, Pos *p, int t) {
  X->nodes++;
  if (X->nodes > X->limit) return -1;
  const int c = p->side, o = 3 - c;
  int f[225]; if (fiveCells(p, c, f)) return f[0];
  const int k = 128 + (t < 120 ? t : 120) + 2; int hit; if (sget(X, p, k, &hit)) return hit;
  int of[225], nof = fiveCells(p, o, of);
  int res = -1;
  if (nof >= 2) { sset(X, p, k, -1); return -1; }
  int cands[225], nc = 0;
  if (nof == 1) { if (legalFor(p, of[0], c)) cands[nc++] = of[0]; }
  else nc = X->foursOnly ? fourCells(p, c, cands) : threatCells(p, c, cands);
  for (int j = 0; j < nc; j++) {
    const int i = cands[j];
    pmake(p, i);
    int ok = 0;
    if (forcing(p, c)) ok = sdefend(X, p, t - 2);
    punmake(p);
    if (ok) { res = i; break; }
  }
  if (X->nodes <= X->limit) sset(X, p, k, res);
  return res;
}
static int sdefend(Solver *X, Pos *p, int t) {
  X->nodes++;
  if (X->nodes > X->limit) return 0;
  const int d = p->side, a = 3 - d;
  if (hasFive(p, d)) return 0;
  const int k = 256 + (t < 120 ? t : 120) + 2; int hit; if (sget(X, p, k, &hit)) return !!hit;
  int af[225], naf = fiveCells(p, a, af);
  int res;
  if (naf >= 2) res = 1;
  else if (naf == 1 && !legalFor(p, af[0], d)) res = 1;
  else {
    int reps[225], nr;
    if (naf == 1) { reps[0] = af[0]; nr = 1; } else nr = defenceCells(p, a, d, reps);
    res = 1;
    for (int j = 0; j < nr; j++) {
      pmake(p, reps[j]);
      const int ok = t < 0 ? immediate(p) : sattack(X, p, t) >= 0;
      punmake(p);
      if (!ok) { res = 0; break; }
    }
  }
  if (X->nodes <= X->limit) sset(X, p, k, res ? 1 : 0);
  return res;
}

// ---------------------------------------------------------------- a thread's state
typedef struct {
  Pos P;
  Solver X;
  i32 ordS[SIZE];
  u8 rootOnly[SIZE];
} Thr;
#ifdef MT
static TLS Thr *TH;
#else
static Thr TH0;
#define TH (&TH0)
#endif
static TLS i64 nodes;
static TLS double deadline, nodeLimit = 1e12;
static TLS int stopF, rootBest = -1, rootOnlyOn;
static i32 HIST[SIZE * 3];    // the move ordering's history (shared by the threads)
static TLS int noSplitAll;    // (the review box's lines: one thread)

// ---------------------------------------------------------------- the transposition table
#define TT_BITS 20
#define TT_SIZE (1 << TT_BITS)
#define TT_MASK (TT_SIZE - 1)
static i32 K1[TT_SIZE], K2[TT_SIZE], TV[TT_SIZE];
static i16 TM[TT_SIZE];
#ifndef MT
static i8 TD[TT_SIZE], TF[TT_SIZE];
#else
// (engine.js ttGet / ttPut with the shared table: one data word w = value 18 | depth 7 << 18 | flag 2 << 25 | age 5 << 27 in TV,
// K2 holds key ^ w — a half-written entry is never used; two entries per bucket)
static volatile int gAge;
static TLS u32 ttw;
static inline int ttGet(u32 h1, u32 key) {
  const u32 b = h1 & (TT_MASK - 1);
  u32 w = (u32)__atomic_load_n(&TV[b], __ATOMIC_RELAXED);
  if ((u32)__atomic_load_n(&K1[b], __ATOMIC_RELAXED) == h1 && ((u32)__atomic_load_n(&K2[b], __ATOMIC_RELAXED) ^ w) == key) { ttw = w; return (int)b; }
  w = (u32)__atomic_load_n(&TV[b + 1], __ATOMIC_RELAXED);
  if ((u32)__atomic_load_n(&K1[b + 1], __ATOMIC_RELAXED) == h1 && ((u32)__atomic_load_n(&K2[b + 1], __ATOMIC_RELAXED) ^ w) == key) { ttw = w; return (int)b + 1; }
  return -1;
}
static inline void ttPut(u32 h1, u32 key, int v, int depth, int f, int m) {
  const u32 b = h1 & (TT_MASK - 1), age = (u32)__atomic_load_n(&gAge, __ATOMIC_RELAXED) & 31;
  const u32 w = ((u32)(v + 131072) & 0x3ffff) | (u32)(depth > 127 ? 127 : depth) << 18 | (u32)f << 25 | age << 27;
  int s = ttGet(h1, key);
  if (s < 0) {
    const u32 w0 = (u32)__atomic_load_n(&TV[b], __ATOMIC_RELAXED);
    s = (w0 >> 27) != age || (int)((w0 >> 18) & 127) <= depth ? (int)b : (int)b + 1;
  } else if (f != 0) { const u32 ws = (u32)__atomic_load_n(&TV[s], __ATOMIC_RELAXED); if ((ws >> 27) == age && (int)((ws >> 18) & 127) > depth + 2) return; }
  __atomic_store_n(&K1[s], (i32)h1, __ATOMIC_RELAXED); __atomic_store_n(&TV[s], (i32)w, __ATOMIC_RELAXED);
  __atomic_store_n(&K2[s], (i32)(key ^ w), __ATOMIC_RELAXED); __atomic_store_n(&TM[s], (i16)m, __ATOMIC_RELAXED);
}
#endif

// ---------------------------------------------------------------- evaluation
static i32 nnEval(const Pos *p, int side) {
  const int H = p->nnK == 1 ? 48 : 32;
  const i16 *emb = p->nnK == 1 ? &NNW48.emb[0][0] : &NNW32.emb[0][0], *forb = p->nnK == 1 ? NNW48.forb : NNW32.forb, *b0 = p->nnK == 1 ? NNW48.b0 : NNW32.b0;
  const float *l1w = p->nnK == 1 ? &NNW48.l1w[0][0] : &NNW32.l1w[0][0], *l1b = p->nnK == 1 ? NNW48.l1b : NNW32.l1b, *l2w = p->nnK == 1 ? NNW48.l2w : NNW32.l2w;
  const float l2b = p->nnK == 1 ? NNW48.l2b : NNW32.l2b;
  const int cme = side - 1, cop = 2 - side;
  const i16 *Tm = emb + (0 * 2 + cme) * NC * H, *To = emb + (1 * 2 + cop) * NC * H;
  const i32 *cmc = p->code[side - 1], *cpc = p->code[2 - side];
  const u8 *bd = p->b; const int rj = p->renju;
  i32 pool[48]; for (int j = 0; j < H; j++) pool[j] = 0;
  for (int m = 0; m < 225; m++) {
    const int i = M2I[m];
    if (bd[i]) continue;
    const int fbd = rj && p->fb[i] == 1;
#ifdef __wasm_simd128__
    v128_t a[6];
    for (int k = 0; k < H / 8; k++) a[k] = wasm_v128_load(&b0[k * 8]);
    if (fbd) for (int k = 0; k < H / 8; k++) a[k] = wasm_i16x8_add_sat(a[k], wasm_v128_load(&forb[k * 8]));
#else
    int a[48];
    for (int j = 0; j < H; j++) { int x = b0[j]; if (fbd) { x += forb[j]; x = x > 32767 ? 32767 : x < -32768 ? -32768 : x; } a[j] = x; }
#endif
    for (int d = 0; d < 4; d++) {
      // the window of 8 (radius 4) from the line codes (radius 5, digit k = offset -5..-1, 1..5; 0 empty, 1 own, 2 blocked):
      // the side to move's view is its own code without the outer two digits, the opponent's view the opponent's code
      const i16 *em = Tm + CAN10[cmc[i * 4 + d]] * H, *ep = To + CAN10[cpc[i * 4 + d]] * H;
#ifdef __wasm_simd128__
      for (int k = 0; k < H / 8; k++) a[k] = wasm_i16x8_add_sat(a[k], wasm_i16x8_add_sat(wasm_v128_load(em + k * 8), wasm_v128_load(ep + k * 8)));
#else
      for (int j = 0; j < H; j++) {
        int s = em[j] + ep[j]; s = s > 32767 ? 32767 : s < -32768 ? -32768 : s;
        int x = a[j] + s; a[j] = x > 32767 ? 32767 : x < -32768 ? -32768 : x;
      }
#endif
    }
#ifdef __wasm_simd128__
    const v128_t z = wasm_i16x8_splat(0), q = wasm_i16x8_splat(Q);
    for (int k = 0; k < H / 8; k++) {
      v128_t h = wasm_i16x8_min(wasm_i16x8_max(a[k], z), q);
      v128_t lo = wasm_i32x4_extend_low_i16x8(h), hi = wasm_i32x4_extend_high_i16x8(h);
      wasm_v128_store(&pool[k * 8], wasm_i32x4_add(wasm_v128_load(&pool[k * 8]), lo));
      wasm_v128_store(&pool[k * 8 + 4], wasm_i32x4_add(wasm_v128_load(&pool[k * 8 + 4]), hi));
    }
#else
    for (int j = 0; j < H; j++) { const int h = a[j] < 0 ? 0 : a[j] > Q ? Q : a[j]; pool[j] += h; }
#endif
  }
  float v[48]; for (int j = 0; j < H; j++) v[j] = pool[j] * (1.0f / (Q * 32.0f));
  float z = l2b;
  for (int o = 0; o < 32; o++) {
    float s = l1b[o]; const float *w = l1w + o * H; for (int j = 0; j < H; j++) s += w[j] * v[j];
    s = s < 0 ? 0 : s > 1 ? 1 : s; z += l2w[o] * s;
  }
  float x = z * 10000.0f; if (x > 2e9f) x = 2e9f; if (x < -2e9f) x = -2e9f;
  return (i32)(x < 0 ? x - 0.5f : x + 0.5f);
}
static int evaluate(const Pos *p) {
  const int me = p->side, op = 3 - me;
  if (p->nnK) { const i32 v = nnEval(p, me); return v > 60000 ? 60000 : v < -60000 ? -60000 : v; }
  if (p->lwOn) {
    const i64 v = (i64)(p->tA[me] + p->tB[op] + p->tP[me] + LWS[BIAS + me - 1] + p->LA[me] + p->LB[op]) * 16;   // (LK = 0)
    return (int)(v > 60000 ? 60000 : v < -60000 ? -60000 : v);
  }
  return (p->tot[me] * 12 - p->tot[op] * 10) / 10;
}

// ---------------------------------------------------------------- the search
static inline int timeUp(void);
// candidate moves for the side to move, ordered (engine.js gen); *oppThreat: the opponent has an open three / straight four point
static int gen(Pos *p, int ttMove, int ply, int *list, int *oppThreat) {
  const int me = p->side, op = 3 - me; const i16 *km = CLS(p, me), *ko = CLS(p, op); const i32 *sm = SC(p, me), *so = SC(p, op);
  const u8 *b = p->b; i32 *ordS = TH->ordS;
  int n = 0; const int ot = CNT(p, op)[C_F4] > 0; *oppThreat = ot;
  for (int pass = 0; pass < 2 && !n; pass++)
    for (int m = 0; m < 225; m++) {
      const int i = M2I[m];
      if (b[i] != EMPTY || !p->near[i]) continue;
      if (!openingOk(p, i)) continue;
      const int x = km[i], y = ko[i];
      if (ot && !pass && !(x >= C_B4 && x != C_F33) && !(y >= C_B4 && y != C_F33)) continue;
      if (pass && !ot) break;
      if (me == BLACK && p->renju && p->fb[i] && forbidIdx(p, i)) continue;
      if (ply == 0 && rootOnlyOn && !TH->rootOnly[i]) continue;
      i64 s = (i64)sm[i] * 2 + so[i] + (i == ttMove ? 10000000 : 0) + HIST[i * 3 + me];
      if (x >= C_F43) s += 200000 * x; else if (y >= C_F43 && y != C_F33) s += 100000;
      list[n++] = i; ordS[i] = (i32)(u32)(u64)s;
    }
  if (!n && p->ply < 225)
    for (int m = 0; m < 225; m++) { const int i = M2I[m]; if (legalIdx(p, i)) { list[n++] = i; int dx = m % N - 7, dy = m / N - 7; ordS[i] = -(dx < 0 ? -dx : dx) - (dy < 0 ? -dy : dy); } }
  sortDesc(list, n, ordS);
  return n;
}
static inline void histAdd(int i, int me, int depth) { HIST[i * 3 + me] = (i32)((u32)HIST[i * 3 + me] + (u32)(depth * depth)); }

#ifdef MT
// ---- Praline (shared/praline/praline.h): a split point carries the node's position, each move's place in the node's order
// (the reduction of the moves after the sixth) and whether the opponent threatens at the node (no reduction then)
typedef int Move;
#define SP_MV 48
#define NSP 64
#define SPLIT_D 4         /* (the least remaining depth of a split; 2 at a node of the principal variation: SPLIT_PV) */
#define SPLIT_PV 2
#define BUSY_D 2
#define PL_SP_FIELDS Pos pos; u8 lg[SP_MV]; int opp;
#define stopFlag stopF
#include "../shared/praline/praline.h"
static inline void mtCheck(void) {
  if (now() > deadline || (double)nodes > nodeLimit || __atomic_load_n(&gStop, __ATOMIC_RELAXED)) stopF = 1;
  else if (curSP && chainStopped(curSP, curIdx)) stopF = 2;
  else if (dupMode && gOpenN > 0 && dupLeave()) stopF = 3;
}
static inline int timeUp(void) {
  ++nodes;
  if ((nodes & 1023) == 0) { if (now() > deadline || (double)nodes > nodeLimit || __atomic_load_n(&gStop, __ATOMIC_RELAXED)) stopF = 1; }
  else if ((nodes & 127) == 0 && !stopF && (curSP || dupMode)) { if (curSP && chainStopped(curSP, curIdx)) stopF = 2; else if (dupMode && gOpenN > 0 && dupLeave()) stopF = 3; }
  return stopF;
}
static inline u64 bkey(u32 h1, u32 h2) { return (u64)h1 << 32 | h2; }
#else
static inline int timeUp(void) {
  if ((++nodes & 1023) == 0 && (now() > deadline || (double)nodes > nodeLimit)) stopF = 1;
  return stopF;
}
#endif

static int search(Pos *p, int depth, int alpha, int beta, int ply) {
  if (timeUp()) return 0;
  const int me = p->side, op = 3 - me;
  int cells[225];
  // forced situations
  if (fiveCells(p, me, cells)) { if (ply == 0) rootBest = cells[0]; return WIN - ply - 1; }
  const int nof = fiveCells(p, op, cells);
  if (nof >= 2) {
    if (ply == 0) { int q = -1; for (int j = 0; j < nof; j++) if (legalFor(p, cells[j], me)) { q = cells[j]; break; } rootBest = q; }
    return -(WIN - ply - 2);
  }
  if (nof == 1) {
    const int q = cells[0];
    if (!legalFor(p, q, me)) { if (ply == 0) rootBest = -1; return -(WIN - ply - 2); }
    pmake(p, q);
    const int v = -search(p, depth, -beta, -alpha, ply + 1);
    punmake(p);
    if (ply == 0) rootBest = q;
    return v;
  }
  const int wc = winCell(p, me);
  if (wc >= 0) { if (ply == 0) rootBest = wc; return WIN - ply - 3; }
  if (WIN - ply - 1 <= alpha) return alpha;
  // transposition table
  const u32 key = p->h2 | 1;
  int ttMove = -1;
#ifdef MT
  {
    const int s = ttGet(p->h1, key);
    if (s >= 0) {
      ttMove = __atomic_load_n(&TM[s], __ATOMIC_RELAXED); const u32 w = ttw;
      if ((int)((w >> 18) & 127) >= depth && ply > 0) {
        int v = (int)(w & 0x3ffff) - 131072; if (v > WINT) v -= ply; else if (v < -WINT) v += ply;
        const int f = (w >> 25) & 3;
        if (f == 0 || (f == 1 && v >= beta) || (f == 2 && v <= alpha)) return v;
      }
    }
  }
#else
  const u32 h = p->h1 & TT_MASK;
  if ((u32)K1[h] == p->h1 && (u32)K2[h] == key) {
    ttMove = TM[h];
    if (TD[h] >= depth && ply > 0) {
      int v = TV[h]; if (v > WINT) v -= ply; else if (v < -WINT) v += ply;
      const int f = TF[h] & 3;
      if (f == 0 || (f == 1 && v >= beta) || (f == 2 && v <= alpha)) return v;
    }
  }
#endif
  // VCF probe (cheap, own fours only)
  {
    Solver *X = &TH->X;
    X->limit = X->nodes + (ply == 0 ? 20000 : depth >= 1 ? 400 : 120);
    const int r = vcf(X, p, ply == 0 ? 30 : 12, 0);
    if (r >= 0) { if (ply == 0) rootBest = r; return WIN - ply - 9; }
  }
  if (depth <= 0) {
    if (CNT(p, op)[C_F4] > 0 && ply < 40) depth = 1;
    else return evaluate(p);
  }
  int list[225], oppThreat;
  const int len = gen(p, ttMove, ply, list, &oppThreat);
  if (!len) return 0;
  const int width = ply == 0 ? 40 : oppThreat ? 16 : depth >= 6 ? 12 : depth >= 3 ? 10 : 8;
  const int W = len < width ? len : width;
  int best = -WIN, bestM = list[0], a0 = alpha;
#ifdef MT
  int defM[BUSY_DEF], defL[BUSY_DEF], nDef = 0, noSplit = noSplitAll, done = 0;
  for (int k = 0; k < W + nDef; k++) {
    // YBW: the first move is done and a helper is idle (or an owner above waits): the other moves (in this order, then the ones
    // put off) to a split point
    if (done && !noSplit && !stopF && depth >= (beta - alpha > 1 ? SPLIT_PV : splitD) && W + nDef - k >= 2 && W + nDef - k <= SP_MV && (gIdle > 0 || (gWaitN > 0 && spWanted()))) {
      SPt *s = spAlloc();
      if (s) {
        s->pos = *p; int ns = 0;
        for (int kk = k; kk < W + nDef; kk++) { s->mv[ns] = kk < W ? list[kk] : defM[kk - W]; s->lg[ns++] = (u8)(kk < W ? kk + 1 : defL[kk - W]); }
        s->n = ns; s->depth = depth; s->ply = ply; s->root = 0; s->all = 0; s->pv = beta - alpha > 1; s->beta = beta; s->alpha = alpha; s->opp = oppThreat;
        Move bm = bestM; spRun(s, &best, &bm, 0);
        if (bm != bestM) { bestM = bm; if (ply == 0) rootBest = bm; }
        if (stopF) return best;
        break;
      }
      noSplit = 1;
    }
    int i, n;
    if (k < W) { i = list[k]; n = k + 1; } else { i = defM[k - W]; n = defL[k - W]; }
    if (k < W && done && depth >= BUSY_D && nDef < BUSY_DEF && busyOther(bkey(p->h1 ^ (u32)ZA[i * 3 + me] ^ (u32)ZS[0], p->h2 ^ (u32)ZB[i * 3 + me] ^ (u32)ZS[1]))) { defM[nDef] = i; defL[nDef++] = n; continue; }
    done++;
    pmake(p, i);
    const u64 mkKey = bkey(p->h1, p->h2); const int mk = depth >= BUSY_D ? busySet(mkKey) : -1;
#else
  int n = 0;
  for (int k = 0; k < W; k++) {
    const int i = list[k]; n++;
    pmake(p, i);
#endif
    int v;
    if (n == 1) v = -search(p, depth - 1, -beta, -alpha, ply + 1);
    else {
      v = -search(p, depth - 1 - (n > 6 && depth >= 3 && !oppThreat ? 1 : 0), -alpha - 1, -alpha, ply + 1);
      if (v > alpha && !stopF) v = -search(p, depth - 1, -beta, -alpha, ply + 1);
    }
#ifdef MT
    if (mk >= 0) busyClear(mkKey, mk);
#endif
    punmake(p);
    if (stopF) break;
    if (v > best) { best = v; bestM = i; if (ply == 0) rootBest = i; }
    if (v > alpha) alpha = v;
    if (alpha >= beta) { histAdd(i, me, depth); break; }
  }
  if (stopF) return best;
  int sv = best; if (sv > WINT) sv += ply; else if (sv < -WINT) sv -= ply;
  const int fl = best <= a0 ? 2 : best >= beta ? 1 : 0;
#ifdef MT
  ttPut(p->h1, key, sv, depth, fl, bestM);
#else
  K1[h] = (i32)p->h1; K2[h] = (i32)key; TV[h] = sv; TD[h] = (i8)depth; TM[h] = (i16)bestM; TF[h] = (i8)fl;
#endif
  return best;
}
static int moveVal(Pos *p, int i, int d) { pmake(p, i); const int v = lastFive(p) ? WIN - 1 : -search(p, d - 1, -WIN - 1, WIN + 1, 1); punmake(p); return v; }

#ifdef MT
// ---- Praline's glue (praline_ybw.h)
static void spLoadPos(const SPt *s, int top, int fresh) { TH->P = s->pos; (void)top; (void)fresh; }
static int spSearch(SPt *s, int idx, int a) {
  Pos *p = &TH->P; const int i = s->mv[idx], d = s->depth;
  if (s->root) return moveVal(p, i, d);   // (the analysis: every candidate with the full window)
  pmake(p, i);
  const u64 mkKey = bkey(p->h1, p->h2); const int mk = d >= BUSY_D ? busySet(mkKey) : -1;
  int v = -search(p, d - 1 - (s->lg[idx] > 6 && d >= 3 && !s->opp ? 1 : 0), -a - 1, -a, s->ply + 1);
  if (v > a && !stopF) v = -search(p, d - 1, -s->beta, -a, s->ply + 1);
  if (mk >= 0) busyClear(mkKey, mk);
  punmake(p);
  return v;
}
static void spCutoff(const SPt *s, int i) { histAdd(s->mv[i], s->pos.side, s->depth); }
static inline int spTop(void) { return 0; }
static void waitCheck(void) { SIM_IDLE(); mtCheck(); }
static void spIdleReset(int fresh) { nodes = 0; deadline = 1e300; nodeLimit = 1e300; rootOnlyOn = 0; TH->X.nodes = 0; if (fresh) sclear(&TH->X); }
#include "../shared/praline/praline_ybw.h"
#endif

// ---------------------------------------------------------------- the root: threats, best move, resisting, the analysis
// options (engine.js best(opt)): OPT[] doubles, 0 = not given
double OPT[16];
enum { O_MS, O_NODES, O_DEPTH, O_VCT, O_DEFEND, O_VCTN, O_VCFN, O_MIND, O_D0, O_NOTHREATS };
int OUT[8];   // c_best: move (board index), value, depth, kind (0 search, 1 vcf, 2 vct)
int OM[256], OV[256];
static void newAge(void) {
#ifdef MT
  if (threadId == 0) __atomic_add_fetch(&gAge, 1, __ATOMIC_RELAXED);
#endif
}
static void beginSearch(double ms, double nl) {
  stopF = 0; nodes = 0; deadline = now() + ms; nodeLimit = nl; newAge();
  TH->X.nodes = 0; sclear(&TH->X);
#ifdef MT
  curSP = 0; curIdx = -1; dupMode = 0;
#endif
}
// returns 1 with *win (kind 1 vcf, 2 vct), 2 with the defending moves in TH->rootOnly (*nGood), 0 nothing
static int rootThreats(Pos *p, int *win, int *kind) {
  Solver *X = &TH->X; const int me = p->side, op = 3 - me;
  sclear(X); X->nodes = 0;
  int cells[225];
  if (fiveCells(p, me, cells) || fiveCells(p, op, cells)) return 0;
  const i64 vcfN = OPT[O_VCFN] ? (i64)OPT[O_VCFN] : 60000, vctN = OPT[O_VCTN] ? (i64)OPT[O_VCTN] : 150000;
  X->limit = vcfN;
  int pv = 0;
  int v = vcf(X, p, 40, &pv);
  if (v >= 0) { *win = v; *kind = 1; return 1; }
  const int maxT = (int)OPT[O_VCT], def = (int)OPT[O_DEFEND];
  if (maxT) {
    sclear(X); X->nodes = 0; X->limit = vctN;
    for (int t = 1; t <= maxT; t += 2) { const int r = sattack(X, p, t); if (r >= 0) { *win = r; *kind = 2; return 1; } if (X->nodes > X->limit) break; }
  }
  if (!def) return 0;
  ppass(p);
  sclear(X); X->nodes = 0; X->limit = vcfN;
  int threat = vcf(X, p, 40, 0) >= 0;
  if (!threat && def > 1) {
    sclear(X); X->nodes = 0; X->limit = vctN;
    for (int t = 1; t <= def; t += 2) { if (sattack(X, p, t) >= 0) { threat = 1; break; } if (X->nodes > X->limit) break; }
  }
  ppass(p);
  if (!threat) return 0;
  int list[225], ot; const int n = gen(p, -1, 0, list, &ot);
  int ng = 0;
  for (int i = 0; i < SIZE; i++) TH->rootOnly[i] = 0;
  for (int j = 0; j < n && j < 60; j++) {
    const int i = list[j];
    pmake(p, i);
    sclear(X); X->nodes = 0; X->limit = 20000;
    int still = vcf(X, p, 40, 0) >= 0;
    if (!still && def > 1) { sclear(X); X->nodes = 0; X->limit = 40000; for (int t = 1; t <= def && !still; t += 2) if (sattack(X, p, t) >= 0) still = 1; }
    punmake(p);
    if (!still) { TH->rootOnly[i] = 1; ng++; }
  }
  return ng ? 2 : 0;
}
// lost (or no move found): the most stubborn legal move (engine.js resist)
static int resist(Pos *p, int keep) {
  const int me = p->side, op = 3 - me; Solver *X = &TH->X;
  int cells[225];
  if (fiveCells(p, me, cells)) return cells[0];
  int list[225], ot, n = gen(p, -1, 0, list, &ot), k = 0;
  for (int j = 0; j < n; j++) if (legalIdx(p, list[j])) list[k++] = list[j];
  n = k;
  if (!n) for (int m = 0; m < 225; m++) if (legalIdx(p, M2I[m])) list[n++] = M2I[m];
  if (!n) return -1;
  const int ro = rootOnlyOn; rootOnlyOn = 0;
  int cand[226], nc = 0;
  for (int j = 0; j < n && j < 40; j++) cand[nc++] = list[j];
  if (keep >= 0 && legalIdx(p, keep)) { int inc = 0; for (int j = 0; j < nc; j++) if (cand[j] == keep) inc = 1; if (!inc) { for (int j = nc; j > 0; j--) cand[j] = cand[j - 1]; cand[0] = keep; nc++; } }
  int best = -1; double bs = -1e300;
  for (int j = 0; j < nc; j++) {
    const int i = cand[j];
    pmake(p, i);
    double s;
    if (lastFive(p)) s = 1e9;
    else if (hasFive(p, op)) s = 0;
    else if (hasFive(p, me)) { fiveCells(p, me, cells); s = legalFor(p, cells[0], op) ? 50 : 1e9; }
    else if (winCell(p, op) >= 0) s = 10;
    else { sclear(X); X->nodes = 0; X->limit = 6000; int pv = 0; s = vcf(X, p, 30, &pv) >= 0 ? 100 + pv : 1000; }
    punmake(p);
    if (i == keep) s += 0.5;
    if (s > bs) { bs = s; best = i; }
  }
  rootOnlyOn = ro;
  return best;
}
// engine.js best(): OUT = move, value, depth, kind
EXPORT(c_best) void c_best(void) {
  Pos *p = &TH->P;
  int win = -1, kind = 0;
  const int th = OPT[O_NOTHREATS] ? 0 : rootThreats(p, &win, &kind);
  if (th == 1) { OUT[0] = win; OUT[1] = WIN - 10; OUT[2] = 0; OUT[3] = kind; return; }
  rootOnlyOn = th == 2;
  const double ms = OPT[O_MS] ? OPT[O_MS] : 1000;
  beginSearch(ms, OPT[O_NODES] ? OPT[O_NODES] : 1e12);
  int bestI = -1, bestV = 0, bd = 0;
  const int dmax = OPT[O_DEPTH] ? (int)OPT[O_DEPTH] : 64, mind = OPT[O_MIND] ? (int)OPT[O_MIND] : 1;
  for (int d = OPT[O_D0] ? (int)OPT[O_D0] : 1; d <= dmax; d++) {
    rootBest = -1;
    const int v = search(p, d, -WIN - 1, WIN + 1, 0);
    if (stopF && d > 1) break;
    if (rootBest >= 0) { bestI = rootBest; bestV = v; bd = d; }
    if (v > WINT || v < -WINT) break;
    if (now() > deadline - ms * 0.45 && d >= mind) break;
  }
  rootOnlyOn = 0;
  if (bestI < 0 || !legalIdx(p, bestI) || bestV < -WINT) { const int r = resist(p, bestI); if (r >= 0) bestI = r; }
  OUT[0] = bestI; OUT[1] = bestV; OUT[2] = bd; OUT[3] = 0;
}
EXPORT(c_resist) int c_resist(int keep) { return resist(&TH->P, keep); }
EXPORT(c_gen) int c_gen(void) { int list[225], ot; const int n = gen(&TH->P, -1, 0, list, &ot); for (int j = 0; j < n; j++) OM[j] = list[j]; return n; }
// engine.js rootList(): the candidates (board indices) and their values in OM / OV (the candidates' order), OUT[0] the depth;
// returns how many. prog: report every depth (env.progress(depth, n) with OM / OV filled)
EXPORT(c_rootList) int c_rootList(double ms, int maxN, int maxD, int prog) {
  Pos *p = &TH->P;
  const double t0 = now();
  stopF = 0; nodes = 0; deadline = t0 + ms; nodeLimit = 1e12; newAge();
  TH->X.nodes = 0; sclear(&TH->X);
#ifdef MT
  curSP = 0; curIdx = -1; dupMode = 0;
#endif
  int cells[225]; const int me = p->side;
  const int nf = fiveCells(p, me, cells);
  if (nf) { for (int j = 0; j < nf; j++) { OM[j] = cells[j]; OV[j] = WIN - 1; } OUT[0] = 1; return nf; }
  int list[225], ot; const int len = gen(p, -1, 0, list, &ot);
  const int nc = len < (maxN ? maxN : 12) ? len : (maxN ? maxN : 12);
  if (!nc) { OUT[0] = 0; return 0; }
  int cand[225]; static TLS i32 val[SIZE]; static TLS i32 cur[SIZE]; static TLS u8 has[SIZE];
  for (int j = 0; j < nc; j++) { cand[j] = list[j]; val[list[j]] = 0; }
  int depth = 0, last = 0;
  for (int d = 1; d <= (maxD ? maxD : 40); d++) {
    int order[225];
    for (int j = 0; j < nc; j++) { order[j] = cand[j]; has[cand[j]] = 0; }
    if (last) sortDesc(order, nc, val);
    int split = 0;
#ifdef MT
    if (nc >= 2 && nc <= SP_MV && d >= 2 && gIdle > 0 && !noSplitAll) {   // (every candidate with the full window: split from the first)
      SPt *s = spAlloc();
      if (s) {
        s->pos = *p;
        for (int j = 0; j < nc; j++) { s->mv[j] = order[j]; s->lg[j] = (u8)(j + 1); }
        s->n = nc; s->depth = d; s->ply = 0; s->root = 1; s->all = 1; s->pv = 1; s->beta = WIN + 1; s->alpha = -WIN - 1; s->opp = 0;
        int vals[SP_MV], bst = -2147483647; Move b2 = order[0];
        for (int j = 0; j < nc; j++) vals[j] = -2147483647;
        spRun(s, &bst, &b2, vals);
        for (int j = 0; j < nc; j++) if (vals[j] != -2147483647) { cur[order[j]] = vals[j]; has[order[j]] = 1; }
        split = 1;
      }
    }
#endif
    if (!split)
      for (int j = 0; j < nc; j++) {
        const int i = order[j];
        const int v = moveVal(p, i, d);
        if (stopF) break;
        cur[i] = v; has[i] = 1;
      }
    if (stopF && d > 1) break;
    for (int j = 0; j < nc; j++) if (has[cand[j]]) val[cand[j]] = cur[cand[j]];
    last = 1; depth = d;
    for (int j = 0; j < nc; j++) { OM[j] = cand[j]; OV[j] = val[cand[j]]; }
    if (prog) js_progress(d, nc);
    int top = val[cand[0]]; for (int j = 1; j < nc; j++) if (val[cand[j]] > top) top = val[cand[j]];
    if ((top > WINT || top < -WINT) && d >= 3) break;
    if (now() - t0 > ms * 0.5) break;
  }
  for (int j = 0; j < nc; j++) { OM[j] = cand[j]; OV[j] = val[cand[j]]; }
  OUT[0] = depth;
  return nc;
}

// ---------------------------------------------------------------- the position from the page, the tables, the weights
EXPORT(c_reset) void c_reset(int rule) { posInit(&TH->P, rule); }
EXPORT(c_make) void c_make(int m) { pmake(&TH->P, M2I[m]); }
EXPORT(c_unmake) void c_unmake(void) { punmake(&TH->P); }
EXPORT(c_pass) void c_pass(void) { ppass(&TH->P); }
EXPORT(c_side) int c_side(void) { return TH->P.side; }
EXPORT(c_fresh) void c_fresh(int f) { TH->P.fresh = f; }
EXPORT(c_h1) u32 c_h1(void) { return TH->P.h1; }
EXPORT(c_h2) u32 c_h2(void) { return TH->P.h2; }
EXPORT(c_eval) int c_eval(void) { return evaluate(&TH->P); }
EXPORT(c_nodes) double c_nodes(void) { return (double)nodes; }
EXPORT(c_split) void c_split(int on) { noSplitAll = !on; }
EXPORT(c_clear) void c_clear(void) {   // (engine.js clear: the table's keys, the history, a new generation of the solver's table)
  for (int i = 0; i < TT_SIZE; i++) { K1[i] = 0; K2[i] = 0; }
  for (int i = 0; i < SIZE * 3; i++) HIST[i] = 0;
  sclear(&TH->X);
}
EXPORT(opt_p) double *opt_p(void) { return OPT; }
EXPORT(out_p) int *out_p(void) { return OUT; }
EXPORT(om_p) int *om_p(void) { return OM; }
EXPORT(ov_p) int *ov_p(void) { return OV; }
EXPORT(tab_texact) u8 *tab_texact(void) { return T_EXACT; }
EXPORT(tab_tfree) u8 *tab_tfree(void) { return T_FREE; }
EXPORT(tab_combn) i32 *tab_combn(void) { return COMB_N; }
EXPORT(tab_combr) i32 *tab_combr(void) { return COMB_R; }
EXPORT(tab_combo) i16 *tab_combo(void) { return COMBO; }
EXPORT(tab_za) i32 *tab_za(void) { return ZA; }
EXPORT(tab_zb) i32 *tab_zb(void) { return ZB; }
EXPORT(tab_zs) i32 *tab_zs(void) { return ZS; }
EXPORT(tab_tag1) i32 *tab_tag1(void) { return TAG1; }
EXPORT(tab_tag2) i32 *tab_tag2(void) { return TAG2; }
EXPORT(lw_p) i32 *lw_p(void) { return LWS; }
EXPORT(lw2_p) i32 *lw2_p(void) { return &LW2S[0][0]; }
EXPORT(lw_set) void lw_set(int ok) { lwOK = ok; }
EXPORT(nn_weights) void *nn_weights(int g) { return g ? (void *)&NNW32 : (void *)&NNW48; }   // (0 renju H = 48, 1 standard H = 32)
EXPORT(nn_weights_size) int nn_weights_size(int g) { return g ? (int)sizeof NNW32 : (int)sizeof NNW48; }
EXPORT(nn_set) void nn_set(int g, int ok) { if (g) nnS = ok; else nnR = ok; }
EXPORT(c_info) int c_info(void) { return nnR | nnS << 1 | lwOK << 2; }
static void initThr(Thr *t) { t->X.g = 1; t->X.nodes = 0; t->X.limit = 1000000000; t->X.foursOnly = 0; }   // (the position: c_reset / a split point)
EXPORT(c_init) void c_init(void) {   // (after the tables: the board's index maps, the net's canonical codes, this thread's state)
  for (int i = 0; i < SIZE; i++) I2M[i] = -1;
  for (int r = 0; r < N; r++) for (int c = 0; c < N; c++) { const int i = (r + 5) * S + (c + 5); M2I[r * N + c] = (i16)i; I2M[i] = (i16)(r * N + c); }
  for (int i = 0; i < SIZE; i++) for (int d = 0; d < 4; d++) {
    int lo = 0, hi = 0;
    if (I2M[i] >= 0) { while (lo > -5 && I2M[i - (lo - 1) * DIRS[d]] >= 0) lo--; while (hi < 5 && I2M[i - (hi + 1) * DIRS[d]] >= 0) hi++; }
    OLO[i * 4 + d] = (i8)lo; OHI[i * 4 + d] = (i8)hi;
  }
  int p3[8]; p3[0] = 1; for (int k = 1; k < 8; k++) p3[k] = p3[k - 1] * 3;
  for (int c = 0; c < 6561; c++) canon[c] = -1;
  int n = 0;
  for (int c = 0; c < 6561; c++) {
    if (canon[c] >= 0) continue;
    int r = 0; for (int k = 0; k < 8; k++) r += ((c / p3[k]) % 3) * p3[7 - k];
    canon[c] = canon[r] = (i16)n++;
  }
  for (int c = 0; c < 59049; c++) CAN10[c] = canon[(c / 3) % 6561];
#ifndef MT
  initThr(TH);
#endif
}
#ifdef MT
// ---- the threads (core_mt.wasm: shared/mtengine.js, the lead engine.js?…&mt=1, the helpers mt-helper.js)
EXPORT(mt_stop) void mt_stop(int v) { __atomic_store_n(&gStop, v, __ATOMIC_SEQ_CST); }
#ifdef NATIVE
static void nativeThread(int id) { threadId = id; TH = calloc(1, sizeof(Thr)); initThr(TH); }
#else
extern unsigned char __heap_base;
extern void __wasm_init_tls(void *);
EXPORT(mt_heap_base) unsigned mt_heap_base(void) { return (unsigned)&__heap_base; }
EXPORT(mt_stack) void mt_stack(unsigned stackTop) { __asm__ volatile(".globaltype __stack_pointer, i32\n local.get %0\n global.set __stack_pointer" :: "r"(stackTop)); }
// a thread's state (4 MB, mostly the solver's table) on fresh pages of the shared memory (not the page's own instance)
EXPORT(mt_thread) int mt_thread(unsigned tls, int id) {
  __wasm_init_tls((void *)tls); threadId = id; TH = 0;
  if (id >= 999) return 1;
  const unsigned long pages = (sizeof(Thr) + 65535) / 65536;
  const long old = (long)__builtin_wasm_memory_grow(0, pages);
  if (old < 0) return 0;
  TH = (Thr *)(old * 65536); initThr(TH);
  return 1;
}
EXPORT(mt_tsize) int mt_tsize(void) { return (int)sizeof(Thr); }
#endif
#endif
