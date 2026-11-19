// Kōnane's learned evaluation outside the engine (claude/konane-spec.md「学習した評価」): the features and the whole-number net
// exactly as core.c (accFull / nnEval) computes them, from a plain board — shared by the trainer (train.c) and the checks of kn.c
// (kn nncheck: the engine's value against this one at every position of its games).
// Board: sq[r * n + c] = 0 empty, 1 Black, 2 White; side 0 = Black to move. Inputs (2·n² + 56) of the view of colour c (0 Black,
// 1 White — White's with the files mirrored): the stones (own 0 … n²−1, the opponent's n² … 2n²−1), then the buckets of the
// view's jumps (16), the other side's jumps (16), the view's stones that can jump (12) and the other side's (12).
#ifndef KN_NNFEAT_H
#define KN_NNFEAT_H
#include <stdio.h>
#include <string.h>
#define KN_H 64
#define KN_H2 16
#define KN_QA 127
#define KN_X 56
#define KN_MAXIN (2 * 100 + KN_X)
static inline int knSq(int n, int c, int s) { return c ? (s / n) * n + (n - 1 - s % n) : s; }
static inline int knMb(int x) { return x < 12 ? x : x < 14 ? 12 : x < 17 ? 13 : x < 21 ? 14 : 15; }
static inline int knVb(int x) { return x < 10 ? x : x < 13 ? 10 : 11; }
// the jumps of pl (every landing square, multiple jumps in a line included) and its stones that can jump
static void knCount(const signed char *sq, int n, int pl, int *mob, int *mov) {
  static const int DR[4] = { -1, 1, 0, 0 }, DC[4] = { 0, 0, -1, 1 };
  int a = 0, b = 0, o = 3 - pl;
  for (int s = 0; s < n * n; s++) {
    if (sq[s] != pl) continue;
    int r = s / n, c = s % n, any = 0;
    for (int d = 0; d < 4; d++) for (int k = 1;; k++) {
      int r1 = r + DR[d] * (2 * k - 1), c1 = c + DC[d] * (2 * k - 1), r2 = r + DR[d] * 2 * k, c2 = c + DC[d] * 2 * k;
      if (r2 < 0 || r2 >= n || c2 < 0 || c2 >= n || sq[r1 * n + c1] != o || sq[r2 * n + c2]) break;
      a++; any = 1;
    }
    b += any;
  }
  *mob = a; *mov = b;
}
// the active inputs of the view of colour c: the stones only (into F, returns their number) and the four count rows (into X)
static int knFeats(const signed char *sq, int n, int c, int *F, int *X) {
  int k = 0, nn = n * n;
  for (int s = 0; s < nn; s++) if (sq[s]) F[k++] = (sq[s] - 1 == c ? 0 : nn) + knSq(n, c, s);
  if (X) {
    int mob[2], mov[2]; knCount(sq, n, 1, &mob[0], &mov[0]); knCount(sq, n, 2, &mob[1], &mov[1]);
    X[0] = 2 * nn + knMb(mob[c]); X[1] = 2 * nn + 16 + knMb(mob[1 - c]); X[2] = 2 * nn + 32 + knVb(mov[c]); X[3] = 2 * nn + 44 + knVb(mov[1 - c]);
  }
  return k;
}
// the whole-number net ("KNN1" files)
typedef struct { int n, nin, k; short w1[KN_MAXIN * KN_H], b1[KN_H], w2[KN_H2 * 2 * KN_H], w3[KN_H2]; int b2[KN_H2], b3; } KnNet;
static int knLoad(KnNet *q, const char *fn) {
  FILE *f = fopen(fn, "rb"); if (!f) return 0;
  unsigned char h[16]; if (fread(h, 1, 16, f) != 16 || memcmp(h, "KNN1", 4)) { fclose(f); return 0; }
  q->nin = (short)(h[4] | h[5] << 8); q->n = (short)(h[10] | h[11] << 8); q->k = (int)(h[12] | h[13] << 8 | h[14] << 16 | (unsigned)h[15] << 24);
  if (q->nin != 2 * q->n * q->n + KN_X || (short)(h[6] | h[7] << 8) != KN_H || (short)(h[8] | h[9] << 8) != KN_H2) { fclose(f); return 0; }
  int ok = fread(q->w1, 2, q->nin * KN_H, f) == (size_t)(q->nin * KN_H) && fread(q->b1, 2, KN_H, f) == KN_H && fread(q->w2, 2, KN_H2 * 2 * KN_H, f) == KN_H2 * 2 * KN_H
    && fread(q->b2, 4, KN_H2, f) == KN_H2 && fread(q->w3, 2, KN_H2, f) == KN_H2 && fread(&q->b3, 4, 1, f) == 1;   // (little-endian machines)
  fclose(f); return ok;
}
// the value for the side to move (as core.c evalP with the net: the side to move without a jump has lost, before any net)
static int knEval(const KnNet *q, const signed char *sq, int side, int ply) {
  if (ply < 2) return 0;
  int n = q->n, F[100], X[4]; unsigned char x[2 * KN_H];
  { int a, b; knCount(sq, n, side + 1, &a, &b); if (!a) return -30000 + 1; }
  for (int k = 0; k < 2; k++) {
    int c = k ? 1 - side : side, nf = knFeats(sq, n, c, F, X), a[KN_H];
    for (int i = 0; i < KN_H; i++) a[i] = q->b1[i];
    for (int j = 0; j < nf; j++) for (int i = 0; i < KN_H; i++) a[i] = (short)(a[i] + q->w1[F[j] * KN_H + i]);   // (int16 as the engine's accumulators)
    for (int j = 0; j < 4; j++) for (int i = 0; i < KN_H; i++) a[i] += q->w1[X[j] * KN_H + i];
    for (int i = 0; i < KN_H; i++) x[k * KN_H + i] = (unsigned char)(a[i] < 0 ? 0 : a[i] > KN_QA ? KN_QA : a[i]);
  }
  long long out = q->b3;
  for (int j = 0; j < KN_H2; j++) { int h = q->b2[j]; for (int i = 0; i < 2 * KN_H; i++) h += x[i] * q->w2[j * 2 * KN_H + i]; h >>= 6; if (h < 0) h = 0; else if (h > KN_QA) h = KN_QA; out += (long long)h * q->w3[j]; }
  long long v = out * q->k / (KN_QA * 64); return v > 20000 ? 20000 : v < -20000 ? -20000 : (int)v;
}
#endif
