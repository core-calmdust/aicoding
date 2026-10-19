/*
 * Gomoku / renju evaluation network (inference) for WebAssembly — and native builds for testing.
 *
 * Every empty cell: for each of the 4 directions, the window of 8 neighbours (radius 4) is read twice — as seen by the
 * side to move and by the opponent (0 empty, 1 own stone, 2 blocked: opponent stone or edge) — and turned into a
 * mirror-canonical code (3321 codes). Each code has an embedding vector (H int16) per role (side to move / opponent) and
 * colour (black / white). Per cell: sum of its 8 embeddings + bias (+ a vector if the cell is forbidden for black),
 * clipped to [0, Q] (clipped ReLU); the cells are summed; a small float MLP (H -> 32 -> 1) gives the logit of the side
 * to move's win probability.
 *
 * Build (wasm): clang --target=wasm32 -O3 -msimd128 -nostdlib -Wl,--no-entry -Wl,--initial-memory=4194304 -o nn.wasm nn.c
 * Build (native test): cc -O2 -DNATIVE -o nn_test nn.c -lm
 */
typedef signed short i16; typedef int i32; typedef unsigned char u8;
#ifndef H
#define H 32
#endif
#define NC 3321
#define Q 256

#ifdef __wasm__
#include <wasm_simd128.h>
#define EXPORT(name) __attribute__((export_name(#name)))
void *memset(void *d, int c, unsigned long n) { u8 *p = d; while (n--) *p++ = (u8)c; return d; }
void *memcpy(void *d, const void *s, unsigned long n) { u8 *p = d; const u8 *q = s; while (n--) *p++ = *q++; return d; }
#else
#define EXPORT(name)
#endif

typedef struct {
  i16 emb[4 * NC][H] __attribute__((aligned(16)));   /* table t = role * 2 + colour (role 0 = side to move) */
  i16 forb[H] __attribute__((aligned(16)));
  i16 b0[H] __attribute__((aligned(16)));
  float l1w[32][H], l1b[32], l2w[32], l2b;
} Weights;
static Weights W;
static u8 board[225], forbm[225];     /* 0 empty, 1 black, 2 white; forbm: 1 = black may not play here */
static i16 canon[6561];
static int ready = 0;

EXPORT(nn_weights) void *nn_weights(void) { return &W; }
EXPORT(nn_weights_size) int nn_weights_size(void) { return (int)sizeof W; }
EXPORT(nn_board) u8 *nn_board(void) { return board; }
EXPORT(nn_forb) u8 *nn_forb(void) { return forbm; }

EXPORT(nn_init) void nn_init(void) {
  int p3[8], n = 0; p3[0] = 1; for (int k = 1; k < 8; k++) p3[k] = p3[k - 1] * 3;
  for (int c = 0; c < 6561; c++) canon[c] = -1;
  for (int c = 0; c < 6561; c++) {
    if (canon[c] >= 0) continue;
    int r = 0; for (int k = 0; k < 8; k++) r += ((c / p3[k]) % 3) * p3[7 - k];
    canon[c] = canon[r] = (i16)n++;
  }
  ready = 1;
}

/* side: colour to move (1 black, 2 white). Returns round(logit * 10000). */
EXPORT(nn_eval) i32 nn_eval(int side) {
  static u8 pad[23 * 23];
  for (int i = 0; i < 23 * 23; i++) pad[i] = 3;
  for (int r = 0; r < 15; r++) for (int c = 0; c < 15; c++) pad[(r + 4) * 23 + c + 4] = board[r * 15 + c];
  /* digit tables: for viewer colour v, cell value x -> 0 empty / 1 own / 2 blocked */
  static const u8 DIG[3][4] = { { 0, 0, 0, 0 }, { 0, 1, 2, 2 }, { 0, 2, 1, 2 } };
  const u8 *dm = DIG[side], *dp = DIG[3 - side];
  const int cme = side - 1, cop = 2 - side;
  const i16 (*Tm)[H] = W.emb + (0 * 2 + cme) * NC, (*To)[H] = W.emb + (1 * 2 + cop) * NC;
  static const int DD[4] = { 1, 23, 24, 22 };
  static const int P3[8] = { 1, 3, 9, 27, 81, 243, 729, 2187 };
  static const int OF[8] = { -4, -3, -2, -1, 1, 2, 3, 4 };
  i32 pool[H]; for (int j = 0; j < H; j++) pool[j] = 0;
  for (int r = 0; r < 15; r++) for (int c = 0; c < 15; c++) {
    if (board[r * 15 + c]) continue;
    const int i = (r + 4) * 23 + c + 4;
#ifdef __wasm__
    v128_t a[H / 8];
    for (int k = 0; k < H / 8; k++) a[k] = wasm_v128_load(&W.b0[k * 8]);
    if (forbm[r * 15 + c]) for (int k = 0; k < H / 8; k++) a[k] = wasm_i16x8_add_sat(a[k], wasm_v128_load(&W.forb[k * 8]));
#else
    i32 a[H]; for (int j = 0; j < H; j++) a[j] = W.b0[j] + (forbm[r * 15 + c] ? W.forb[j] : 0);
#endif
    for (int d = 0; d < 4; d++) {
      int cm = 0, cp = 0;
      for (int k = 0; k < 8; k++) { const u8 x = pad[i + OF[k] * DD[d]]; cm += dm[x] * P3[k]; cp += dp[x] * P3[k]; }
      const i16 *em = Tm[canon[cm]], *ep = To[canon[cp]];
#ifdef __wasm__
      for (int k = 0; k < H / 8; k++) a[k] = wasm_i16x8_add_sat(a[k], wasm_i16x8_add_sat(wasm_v128_load(em + k * 8), wasm_v128_load(ep + k * 8)));
#else
      for (int j = 0; j < H; j++) a[j] += em[j] + ep[j];
#endif
    }
#ifdef __wasm__
    const v128_t z = wasm_i16x8_splat(0), q = wasm_i16x8_splat(Q);
    for (int k = 0; k < H / 8; k++) {
      v128_t h = wasm_i16x8_min(wasm_i16x8_max(a[k], z), q);
      v128_t lo = wasm_i32x4_extend_low_i16x8(h), hi = wasm_i32x4_extend_high_i16x8(h);
      wasm_v128_store(&pool[k * 8], wasm_i32x4_add(wasm_v128_load(&pool[k * 8]), lo));
      wasm_v128_store(&pool[k * 8 + 4], wasm_i32x4_add(wasm_v128_load(&pool[k * 8 + 4]), hi));
    }
#else
    for (int j = 0; j < H; j++) { i32 h = a[j] < 0 ? 0 : a[j] > Q ? Q : a[j]; pool[j] += h; }
#endif
  }
  float v[H]; for (int j = 0; j < H; j++) v[j] = pool[j] * (1.0f / (Q * 32.0f));
  float z = W.l2b;
  for (int o = 0; o < 32; o++) {
    float s = W.l1b[o]; for (int j = 0; j < H; j++) s += W.l1w[o][j] * v[j];
    s = s < 0 ? 0 : s > 1 ? 1 : s; z += W.l2w[o] * s;
  }
  float x = z * 10000.0f; if (x > 2e9f) x = 2e9f; if (x < -2e9f) x = -2e9f;
  return (i32)(x < 0 ? x - 0.5f : x + 0.5f);
}

#ifdef NATIVE
#include <stdio.h>
#include <string.h>
/* nn_test <weights.bin> < positions (each line: side, then 225 digits of the board, then 225 digits of forb) */
int main(int argc, char **argv) {
  FILE *f = fopen(argv[1], "rb"); if (!f) return 1;
  if (fread(&W, 1, sizeof W, f) != sizeof W) { fprintf(stderr, "size mismatch %d\n", (int)sizeof W); return 1; }
  fclose(f); nn_init();
  int side; char bs[300], fs[300];
  while (scanf("%d %s %s", &side, bs, fs) == 3) {
    for (int i = 0; i < 225; i++) { board[i] = (u8)(bs[i] - '0'); forbm[i] = (u8)(fs[i] - '0'); }
    printf("%d\n", nn_eval(side));
  }
  return 0;
}
#endif
