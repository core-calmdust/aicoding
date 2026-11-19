// Trainer of Kōnane's learned evaluation (core.c nnEval, nnfeat.h, README.md here). Plain C, one thread (run.sh trains the
// board sizes at once).
//   train <rule> <out.bin> <data.bin …> [--epochs 10] [--lambda 0.7] [--lr 0.001] [--batch 1024] [--init net.bin] [--val 0.03]
// data: the records of kn datagen (40 bytes); only the rule's are used. Target = λ·σ(search value / K) + (1−λ)·result, where K
// (the evaluation's scale) is fitted to the data first: σ(v / K) is the hand evaluation's chance to win. The net learns the logit
// and the engine multiplies it by K, so its values are in the hand evaluation's units (the search's margins keep their meaning).
// Each time a position is used it is turned by one of the four symmetries of the square that keep the colours of the squares
// (as it is, turned 180°, mirrored in either diagonal): the same game.
// Output: the "KNN1" file (whole numbers, as core.c reads it); the float and the whole-number nets are compared at the end.
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>
#include "nnfeat.h"
typedef unsigned long long u64;
typedef struct { u64 bits[2][2]; short v; unsigned short ply; signed char res; unsigned char rule, side, flags; } Rec;
#define NH KN_H
#define NH2 KN_H2
#define QA KN_QA
static const char *RN[3] = { "s8", "s6", "s10" };
static const int RSZ[3] = { 8, 6, 10 };
static int rule, N, NIN;
static int symSq(int s, int k) { int r = s / N, c = s % N; switch (k) { case 1: return (N - 1 - r) * N + (N - 1 - c); case 2: return c * N + r; case 3: return (N - 1 - c) * N + (N - 1 - r); default: return s; } }
static void board(const Rec *r, int sym, signed char *sq) {
  memset(sq, 0, 100);
  for (int col = 0; col < 2; col++) for (int h = 0; h < 2; h++) for (u64 w = r->bits[col][h]; w; w &= w - 1) sq[symSq(h * 64 + __builtin_ctzll(w), sym)] = (signed char)(col + 1);
}
static float *W1, B1[NH], W2[NH2 * 2 * NH], B2[NH2], W3[NH2], B3;
static int NP; static float *PP[6]; static int PN[6];
static float *G, *M1, *M2;
static double sig(double x) { return 1 / (1 + exp(-x)); }
typedef struct { int F[2][110], n[2]; float a[2 * NH], x[2 * NH], z[NH2], h[NH2]; } Act;
static float forward(const Rec *r, int sym, Act *A) {
  signed char sq[100]; board(r, sym, sq);
  for (int k = 0; k < 2; k++) {
    int c = k ? 1 - r->side : r->side, X[4], n = knFeats(sq, N, c, A->F[k], X);
    for (int j = 0; j < 4; j++) A->F[k][n++] = X[j];
    A->n[k] = n;
    float *a = A->a + k * NH;
    for (int i = 0; i < NH; i++) a[i] = B1[i];
    for (int j = 0; j < n; j++) { const float *w = W1 + A->F[k][j] * NH; for (int i = 0; i < NH; i++) a[i] += w[i]; }
    for (int i = 0; i < NH; i++) A->x[k * NH + i] = a[i] < 0 ? 0 : a[i] > 1 ? 1 : a[i];
  }
  float o = B3;
  for (int j = 0; j < NH2; j++) {
    float z = B2[j]; const float *w = W2 + j * 2 * NH;
    for (int i = 0; i < 2 * NH; i++) z += A->x[i] * w[i];
    A->z[j] = z; A->h[j] = z < 0 ? 0 : z > 1 ? 1 : z; o += A->h[j] * W3[j];
  }
  return o;
}
static void backward(const Act *A, float dO) {
  float *gW1 = G, *gB1 = gW1 + NIN * NH, *gW2 = gB1 + NH, *gB2 = gW2 + NH2 * 2 * NH, *gW3 = gB2 + NH2, *gB3 = gW3 + NH2;
  float dx[2 * NH]; memset(dx, 0, sizeof dx);
  *gB3 += dO;
  for (int j = 0; j < NH2; j++) {
    gW3[j] += A->h[j] * dO;
    if (A->z[j] <= 0 || A->z[j] >= 1) continue;
    float dz = W3[j] * dO; gB2[j] += dz;
    const float *w = W2 + j * 2 * NH; float *gw = gW2 + j * 2 * NH;
    for (int i = 0; i < 2 * NH; i++) { gw[i] += A->x[i] * dz; dx[i] += w[i] * dz; }
  }
  for (int k = 0; k < 2; k++) {
    float da[NH]; const float *a = A->a + k * NH;
    for (int i = 0; i < NH; i++) da[i] = (a[i] > 0 && a[i] < 1) ? dx[k * NH + i] : 0;
    for (int i = 0; i < NH; i++) gB1[i] += da[i];
    for (int j = 0; j < A->n[k]; j++) { float *g = gW1 + A->F[k][j] * NH; for (int i = 0; i < NH; i++) g[i] += da[i]; }
  }
}
static KnNet Q;
static int clampi(double x, int lo, int hi) { long v = lround(x); return v < lo ? lo : v > hi ? hi : (int)v; }
static void quantize(double K) {
  Q.n = N; Q.nin = NIN; Q.k = (int)lround(K);
  for (int i = 0; i < NIN * NH; i++) Q.w1[i] = (short)clampi(W1[i] * QA, -32767, 32767);
  for (int i = 0; i < NH; i++) Q.b1[i] = (short)clampi(B1[i] * QA, -32767, 32767);
  for (int i = 0; i < NH2 * 2 * NH; i++) Q.w2[i] = (short)clampi(W2[i] * 64, -32767, 32767);
  for (int i = 0; i < NH2; i++) { Q.b2[i] = clampi(B2[i] * QA * 64, -2000000000, 2000000000); Q.w3[i] = (short)clampi(W3[i] * 64, -32767, 32767); }
  Q.b3 = clampi(B3 * QA * 64, -2000000000, 2000000000);
}
static void put16(FILE *f, int v) { unsigned char b[2] = { (unsigned char)v, (unsigned char)(v >> 8) }; fwrite(b, 1, 2, f); }
static void put32(FILE *f, int v) { unsigned char b[4] = { (unsigned char)v, (unsigned char)(v >> 8), (unsigned char)(v >> 16), (unsigned char)(v >> 24) }; fwrite(b, 1, 4, f); }
static void save(const char *fn) {
  FILE *f = fopen(fn, "wb"); if (!f) { perror(fn); exit(1); }
  fwrite("KNN1", 1, 4, f); put16(f, NIN); put16(f, NH); put16(f, NH2); put16(f, N); put32(f, Q.k);
  for (int i = 0; i < NIN * NH; i++) put16(f, Q.w1[i]);
  for (int i = 0; i < NH; i++) put16(f, Q.b1[i]);
  for (int i = 0; i < NH2 * 2 * NH; i++) put16(f, Q.w2[i]);
  for (int i = 0; i < NH2; i++) put32(f, Q.b2[i]);
  for (int i = 0; i < NH2; i++) put16(f, Q.w3[i]);
  put32(f, Q.b3);
  fclose(f);
}
static int loadInit(const char *fn) {   // (--init: go on from a net of this file's format)
  static KnNet q; if (!knLoad(&q, fn) || q.n != N) return 0;
  for (int i = 0; i < NIN * NH; i++) W1[i] = q.w1[i] / (float)QA;
  for (int i = 0; i < NH; i++) B1[i] = q.b1[i] / (float)QA;
  for (int i = 0; i < NH2 * 2 * NH; i++) W2[i] = q.w2[i] / 64.f;
  for (int i = 0; i < NH2; i++) { B2[i] = q.b2[i] / (float)(QA * 64); W3[i] = q.w3[i] / 64.f; }
  B3 = q.b3 / (float)(QA * 64);
  return 1;
}
static u64 rs = 0x9E3779B97F4A7C15ull;
static u64 rnd(void) { rs ^= rs << 13; rs ^= rs >> 7; rs ^= rs << 17; return rs; }
static double gauss(void) { double u = (rnd() >> 11) * (1.0 / 9007199254740992.0) + 1e-12, v = (rnd() >> 11) * (1.0 / 9007199254740992.0); return sqrt(-2 * log(u)) * cos(2 * M_PI * v); }
static Rec *D; static long ND;
static double target(const Rec *r, double K, double lam) {
  double s = r->flags & 1 ? (r->v > 0 ? 1 : 0) : sig(r->v / K);
  return lam * s + (1 - lam) * (r->res + 1) / 2.0;
}
static double fitK(void) {   // K minimizing the cross-entropy of σ(v / K) against the results (golden section on log K)
  double lo = log(20), hi = log(5000);
  long step = ND > 400000 ? ND / 400000 : 1;
  #define CE(lk) ({ double K_ = exp(lk), s_ = 0; long n_ = 0; for (long i = 0; i < ND; i += step) { const Rec *r = &D[i]; if (r->flags & 1) continue; double p = sig(r->v / K_), t = (r->res + 1) / 2.0; p = p < 1e-6 ? 1e-6 : p > 1 - 1e-6 ? 1 - 1e-6 : p; s_ -= t * log(p) + (1 - t) * log(1 - p); n_++; } s_ / (n_ ? n_ : 1); })
  for (int it = 0; it < 40; it++) { double a = hi - (hi - lo) * 0.618, b = lo + (hi - lo) * 0.618; if (CE(a) < CE(b)) hi = b; else lo = a; }
  return exp((lo + hi) / 2);
}
int main(int argc, char **argv) {
  if (argc < 4) { fprintf(stderr, "train <rule> <out.bin> <data.bin …> [--epochs N] [--lambda L] [--lr X] [--batch B] [--init net.bin] [--val F]\n"); return 2; }
  rule = -1; for (int i = 0; i < 3; i++) if (!strcmp(argv[1], RN[i])) rule = i;
  if (rule < 0) { fprintf(stderr, "rule?\n"); return 2; }
  N = RSZ[rule]; NIN = 2 * N * N + KN_X;
  NP = NIN * NH + NH + NH2 * 2 * NH + NH2 + NH2 + 1;
  W1 = calloc(NIN * NH, sizeof(float)); G = calloc(NP, sizeof(float)); M1 = calloc(NP, sizeof(float)); M2 = calloc(NP, sizeof(float));
  PP[0] = W1; PP[1] = B1; PP[2] = W2; PP[3] = B2; PP[4] = W3; PP[5] = &B3;
  PN[0] = NIN * NH; PN[1] = NH; PN[2] = NH2 * 2 * NH; PN[3] = NH2; PN[4] = NH2; PN[5] = 1;
  int epochs = 10, batch = 1024; double lam = 0.7, lr0 = 1e-3, valF = 0.03; const char *init = 0;
  const char *files[1024]; int nf = 0;
  for (int i = 3; i < argc; i++) {
    if (!strcmp(argv[i], "--epochs")) epochs = atoi(argv[++i]); else if (!strcmp(argv[i], "--lambda")) lam = atof(argv[++i]);
    else if (!strcmp(argv[i], "--lr")) lr0 = atof(argv[++i]); else if (!strcmp(argv[i], "--batch")) batch = atoi(argv[++i]);
    else if (!strcmp(argv[i], "--init")) init = argv[++i]; else if (!strcmp(argv[i], "--val")) valF = atof(argv[++i]);
    else if (nf < 1024) files[nf++] = argv[i];
  }
  long cap = 0; for (int i = 0; i < nf; i++) { FILE *f = fopen(files[i], "rb"); if (!f) continue; fseek(f, 0, SEEK_END); cap += ftell(f) / sizeof(Rec); fclose(f); }
  D = malloc((cap + 1) * sizeof(Rec)); ND = 0;
  for (int i = 0; i < nf; i++) { FILE *f = fopen(files[i], "rb"); if (!f) continue; Rec r; while (fread(&r, sizeof r, 1, f) == 1) if (r.rule == rule) D[ND++] = r; fclose(f); }
  printf("%s: %ld positions\n", RN[rule], ND); fflush(stdout);
  if (ND < 1000) { fprintf(stderr, "too few positions\n"); return 1; }
  for (long i = ND - 1; i > 0; i--) { long j = (long)(rnd() % (u64)(i + 1)); Rec t = D[i]; D[i] = D[j]; D[j] = t; }
  long NV = (long)(ND * valF); if (NV > 200000) NV = 200000; Rec *V = D + ND - NV; ND -= NV;
  double K = fitK(); printf("%s: K (the evaluation's scale) %.1f\n", RN[rule], K);
  if (init && loadInit(init)) printf("%s: from %s\n", RN[rule], init);
  else {
    for (int i = 0; i < NIN * NH; i++) W1[i] = (float)(gauss() * 0.06);
    for (int i = 0; i < NH; i++) B1[i] = 0.5f;
    for (int i = 0; i < NH2 * 2 * NH; i++) W2[i] = (float)(gauss() / sqrt(2.0 * NH));
    for (int i = 0; i < NH2; i++) { B2[i] = 0.5f; W3[i] = (float)(gauss() * 0.3); }
    B3 = 0;
  }
  long step = 0; double b1 = 0.9, b2 = 0.999;
  for (int ep = 0; ep < epochs; ep++) {
    double lr = lr0 * (ep >= epochs * 0.85 ? 0.1 : ep >= epochs * 0.6 ? 0.3 : 1), tl = 0; long tn = 0; time_t t0 = time(0);
    for (long i = ND - 1; i > 0; i--) { long j = (long)(rnd() % (u64)(i + 1)); Rec t = D[i]; D[i] = D[j]; D[j] = t; }
    for (long s = 0; s < ND; s += batch) {
      memset(G, 0, NP * sizeof(float)); long e = s + batch < ND ? s + batch : ND; int nb = 0;
      for (long i = s; i < e; i++) {
        Act A; double o = forward(&D[i], (int)(rnd() & 3), &A), p = sig(o), t = target(&D[i], K, lam);
        backward(&A, (float)(p - t)); nb++;
        double pc = p < 1e-6 ? 1e-6 : p > 1 - 1e-6 ? 1 - 1e-6 : p; tl -= t * log(pc) + (1 - t) * log(1 - pc); tn++;
      }
      step++; const double c1 = 1 - pow(b1, step), c2 = 1 - pow(b2, step);
      for (int k = 0, o = 0; k < 6; o += PN[k], k++) for (int i = 0; i < PN[k]; i++) {
        float g = G[o + i] / nb; M1[o + i] = (float)(b1 * M1[o + i] + (1 - b1) * g); M2[o + i] = (float)(b2 * M2[o + i] + (1 - b2) * g * g);
        float *w = &PP[k][i]; *w -= (float)(lr * (M1[o + i] / c1) / (sqrt(M2[o + i] / c2) + 1e-8));
        if (k == 0) { if (*w > 2) *w = 2; else if (*w < -2) *w = -2; }   // (the int16 accumulators stay far from overflowing)
        else if (k == 2 || k == 4) { if (*w > 7) *w = 7; else if (*w < -7) *w = -7; }
      }
    }
    double vl = 0; for (long i = 0; i < NV; i++) { Act A; double p = sig(forward(&V[i], 0, &A)), t = target(&V[i], K, lam); p = p < 1e-6 ? 1e-6 : p > 1 - 1e-6 ? 1 - 1e-6 : p; vl -= t * log(p) + (1 - t) * log(1 - p); }
    printf("%s epoch %d  train %.5f  valid %.5f  (%lds)\n", RN[rule], ep + 1, tl / (tn ? tn : 1), vl / (NV ? NV : 1), (long)(time(0) - t0)); fflush(stdout);
  }
  quantize(K); save(argv[2]);
  // the whole-number net against the float one, and how well each predicts the results (validation positions)
  double dq = 0, ce = 0, ceh = 0; long n = 0;
  for (long i = 0; i < NV; i++) {
    Act A; signed char sq[100]; board(&V[i], 0, sq);
    double f = forward(&V[i], 0, &A) * K, q = knEval(&Q, sq, V[i].side, V[i].ply); dq += fabs(f - q);
    if (V[i].flags & 1) continue;
    double t = (V[i].res + 1) / 2.0, p = sig(q / K), ph = sig(V[i].v / K);
    p = p < 1e-6 ? 1e-6 : p > 1 - 1e-6 ? 1 - 1e-6 : p; ph = ph < 1e-6 ? 1e-6 : ph > 1 - 1e-6 ? 1 - 1e-6 : ph;
    ce -= t * log(p) + (1 - t) * log(1 - p); ceh -= t * log(ph) + (1 - t) * log(1 - ph); n++;
  }
  printf("%s: saved %s  K %d  |float − whole-number| %.2f  result cross-entropy: net (no search) %.4f, teacher (searched) %.4f\n", RN[rule], argv[2], Q.k, dq / (NV ? NV : 1), ce / (n ? n : 1), ceh / (n ? n : 1));
  return 0;
}
