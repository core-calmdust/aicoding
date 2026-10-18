// NNUE trainer: (768 -> H)x2 -> 1 (8 material buckets), SCReLU, sigmoid-MSE on eval targets.
// usage: train data.bin out.net H epochs lr [init.f32]
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>
#include <omp.h>
typedef unsigned long long u64; typedef unsigned char u8; typedef short i16;
typedef struct { u64 occ; u8 pcs[16]; i16 score; u8 stm; u8 pad; } Rec;
#define IN 768
#define NB 8
static int H;
static float *W1, *B1, *W2, *B2;
static float *mW1, *vW1, *mB1, *vB1, *mW2, *vW2, *mB2, *vB2;
static float *gW1, *gB1, *gW2, *gB2;
static double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec + t.tv_nsec / 1e9; }
static int feats(const Rec *r, int *fu, int *ft, int *bucket) {   /* fu: stm perspective, ft: other */
  u64 b = r->occ; int k = 0;
  while (b) { int s = __builtin_ctzll(b); b &= b - 1; int pc = (r->pcs[k >> 1] >> ((k & 1) * 4)) & 15; int c = pc / 6, t = pc % 6;
    int fw = (c * 6 + t) * 64 + s, fb = ((c ^ 1) * 6 + t) * 64 + (s ^ 56);
    if (r->stm == 0) { fu[k] = fw; ft[k] = fb; } else { fu[k] = fb; ft[k] = fw; } k++; }
  int bk = (k - 2) / 4; if (bk > 7) bk = 7; if (bk < 0) bk = 0; *bucket = bk;
  return k;
}
static float sigm(float x) { return 1.f / (1.f + expf(-x)); }
/* forward one sample; returns output (pre-sigmoid, in units of 400cp); fills acc */
static float forward(const int *fu, const int *ft, int n, int bk, float *au, float *at) {
  for (int i = 0; i < H; i++) { au[i] = B1[i]; at[i] = B1[i]; }
  for (int k = 0; k < n; k++) { const float *wu = W1 + (size_t)fu[k] * H, *wt = W1 + (size_t)ft[k] * H; for (int i = 0; i < H; i++) { au[i] += wu[i]; at[i] += wt[i]; } }
  const float *w = W2 + (size_t)bk * 2 * H; float o = B2[bk];
  for (int i = 0; i < H; i++) { float x = au[i] < 0 ? 0 : au[i] > 1 ? 1 : au[i]; o += x * x * w[i]; }
  for (int i = 0; i < H; i++) { float x = at[i] < 0 ? 0 : at[i] > 1 ? 1 : at[i]; o += x * x * w[H + i]; }
  return o;
}
static void adam(float *w, float *g, float *m, float *v, size_t n, float lr, int t, float clip) {
  const float b1 = 0.9f, b2 = 0.999f, eps = 1e-8f; float c1 = 1 - powf(b1, t), c2 = 1 - powf(b2, t);
  for (size_t i = 0; i < n; i++) { if (g[i] == 0 && m[i] == 0) continue; m[i] = b1 * m[i] + (1 - b1) * g[i]; v[i] = b2 * v[i] + (1 - b2) * g[i] * g[i]; w[i] -= lr * (m[i] / c1) / (sqrtf(v[i] / c2) + eps); if (w[i] > clip) w[i] = clip; if (w[i] < -clip) w[i] = -clip; }
}
static float *fz(size_t n) { float *p = calloc(n, sizeof(float)); return p; }
static unsigned long long rs = 88172645463325252ULL;
static unsigned long long xr(void) { rs ^= rs << 13; rs ^= rs >> 7; rs ^= rs << 17; return rs; }
static float randn(void) { double u = (xr() >> 11) * (1.0 / 9007199254740992.0) + 1e-12, v = (xr() >> 11) * (1.0 / 9007199254740992.0); return (float)(sqrt(-2 * log(u)) * cos(6.283185307 * v)); }
int main(int argc, char **argv) {
  const char *data = argv[1], *outp = argv[2]; H = atoi(argv[3]); int epochs = atoi(argv[4]); float lr0 = atof(argv[5]);
  int nth = argc > 7 ? atoi(argv[7]) : 1; omp_set_num_threads(nth);
  FILE *f = fopen(data, "rb"); fseek(f, 0, SEEK_END); long sz = ftell(f); fseek(f, 0, SEEK_SET);
  long N = sz / sizeof(Rec); Rec *D = malloc(N * sizeof(Rec)); if (fread(D, sizeof(Rec), N, f) != (size_t)N) return 1; fclose(f);
  long NV = N / 100 < 200000 ? N / 100 : 200000, NT = N - NV;
  fprintf(stderr, "records %ld train %ld valid %ld H %d\n", N, NT, NV, H);
  W1 = fz((size_t)IN * H); B1 = fz(H); W2 = fz(NB * 2 * H); B2 = fz(NB);
  mW1 = fz((size_t)IN * H); vW1 = fz((size_t)IN * H); mB1 = fz(H); vB1 = fz(H); mW2 = fz(NB * 2 * H); vW2 = fz(NB * 2 * H); mB2 = fz(NB); vB2 = fz(NB);
  for (size_t i = 0; i < (size_t)IN * H; i++) W1[i] = randn() * 0.08f;
  for (int i = 0; i < H; i++) B1[i] = 0.1f;
  for (int i = 0; i < NB * 2 * H; i++) W2[i] = randn() * 0.08f;
  if (argc > 6 && strcmp(argv[6], "-")) { FILE *g = fopen(argv[6], "rb"); if (g) { fread(W1, 4, (size_t)IN * H, g); fread(B1, 4, H, g); fread(W2, 4, NB * 2 * H, g); fread(B2, 4, NB, g); fclose(g); fprintf(stderr, "resumed\n"); } }
  long *idx = malloc(NT * sizeof(long)); for (long i = 0; i < NT; i++) idx[i] = i;
  const int BS = 16384; int step = 0;
  float **tgW1 = malloc(nth * sizeof(float *)), **tgB1 = malloc(nth * sizeof(float *)), **tgW2 = malloc(nth * sizeof(float *)), **tgB2 = malloc(nth * sizeof(float *));
  for (int t = 0; t < nth; t++) { tgW1[t] = fz((size_t)IN * H); tgB1[t] = fz(H); tgW2[t] = fz(NB * 2 * H); tgB2[t] = fz(NB); }
  gW1 = tgW1[0]; gB1 = tgB1[0]; gW2 = tgW2[0]; gB2 = tgB2[0];
  for (int ep = 0; ep < epochs; ep++) {
    float lr = lr0 * (ep >= epochs * 0.75 ? 0.1f : ep >= epochs * 0.5 ? 0.3f : 1.f);
    for (long i = NT - 1; i > 0; i--) { long j = xr() % (i + 1); long t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    double t0 = now(), loss = 0;
    for (long b0 = 0; b0 + BS <= NT; b0 += BS) {
      double bl = 0;
      #pragma omp parallel reduction(+:bl)
      {
        int tid = omp_get_thread_num();
        float *gw1 = tgW1[tid], *gb1 = tgB1[tid], *gw2 = tgW2[tid], *gb2 = tgB2[tid];
        float *au = malloc(H * 4), *at = malloc(H * 4), *du = malloc(H * 4), *dt = malloc(H * 4);
        int fu[32], ft[32], bk;
        #pragma omp for schedule(static)
        for (long k = b0; k < b0 + BS; k++) {
          const Rec *r = &D[idx[k]]; int n = feats(r, fu, ft, &bk);
          float o = forward(fu, ft, n, bk, au, at), p = sigm(o), t = sigm(r->score / 400.f);
          float e = p - t; bl += e * e;
          float g = 2 * e * p * (1 - p) / BS;
          const float *w = W2 + (size_t)bk * 2 * H; float *gw = gw2 + (size_t)bk * 2 * H;
          gb2[bk] += g;
          for (int i = 0; i < H; i++) { float x = au[i] < 0 ? 0 : au[i] > 1 ? 1 : au[i]; gw[i] += g * x * x; du[i] = (au[i] > 0 && au[i] < 1) ? g * w[i] * 2 * au[i] : 0; }
          for (int i = 0; i < H; i++) { float x = at[i] < 0 ? 0 : at[i] > 1 ? 1 : at[i]; gw[H + i] += g * x * x; dt[i] = (at[i] > 0 && at[i] < 1) ? g * w[H + i] * 2 * at[i] : 0; }
          for (int i = 0; i < H; i++) gb1[i] += du[i] + dt[i];
          for (int q = 0; q < n; q++) { float *a = gw1 + (size_t)fu[q] * H, *c = gw1 + (size_t)ft[q] * H; for (int i = 0; i < H; i++) { a[i] += du[i]; c[i] += dt[i]; } }
        }
        free(au); free(at); free(du); free(dt);
      }
      for (int t = 1; t < nth; t++) {
        for (size_t i = 0; i < (size_t)IN * H; i++) { gW1[i] += tgW1[t][i]; tgW1[t][i] = 0; }
        for (int i = 0; i < H; i++) { gB1[i] += tgB1[t][i]; tgB1[t][i] = 0; }
        for (int i = 0; i < NB * 2 * H; i++) { gW2[i] += tgW2[t][i]; tgW2[t][i] = 0; }
        for (int i = 0; i < NB; i++) { gB2[i] += tgB2[t][i]; tgB2[t][i] = 0; }
      }
      step++;
      adam(W1, gW1, mW1, vW1, (size_t)IN * H, lr, step, 1.98f); adam(B1, gB1, mB1, vB1, H, lr, step, 1.98f);
      adam(W2, gW2, mW2, vW2, NB * 2 * H, lr, step, 1.98f); adam(B2, gB2, mB2, vB2, NB, lr, step, 100.f);
      memset(gW1, 0, (size_t)IN * H * 4); memset(gB1, 0, H * 4); memset(gW2, 0, NB * 2 * H * 4); memset(gB2, 0, NB * 4);
      loss += bl;
      if ((b0 / BS) % 500 == 0) fprintf(stderr, "  ep %d %.1f%% loss %.5f %.0f pos/s\n", ep, 100.0 * b0 / NT, loss / (b0 + BS), (b0 + BS) / (now() - t0));
    }
    /* validation */
    double vl = 0; float *au = malloc(H * 4), *at = malloc(H * 4); int fu[32], ft[32], bk;
    for (long k = NT; k < N; k++) { int n = feats(&D[k], fu, ft, &bk); float o = forward(fu, ft, n, bk, au, at), p = sigm(o), t = sigm(D[k].score / 400.f); vl += (p - t) * (p - t); }
    free(au); free(at);
    fprintf(stderr, "epoch %d train %.5f valid %.5f lr %.5f %.0fs\n", ep, loss / NT, vl / NV, lr, now() - t0);
    /* save float + quantized */
    char fp[512]; snprintf(fp, sizeof fp, "%s.f32", outp); FILE *g = fopen(fp, "wb"); fwrite(W1, 4, (size_t)IN * H, g); fwrite(B1, 4, H, g); fwrite(W2, 4, NB * 2 * H, g); fwrite(B2, 4, NB, g); fclose(g);
    g = fopen(outp, "wb");
    for (size_t i = 0; i < (size_t)IN * H; i++) { short q = (short)lrintf(W1[i] * 255); fwrite(&q, 2, 1, g); }
    for (int i = 0; i < H; i++) { short q = (short)lrintf(B1[i] * 255); fwrite(&q, 2, 1, g); }
    for (int i = 0; i < NB * 2 * H; i++) { short q = (short)lrintf(W2[i] * 64); fwrite(&q, 2, 1, g); }
    for (int i = 0; i < NB; i++) { int q = (int)lrintf(B2[i] * 255 * 64); fwrite(&q, 4, 1, g); }
    fclose(g);
  }
  return 0;
}
