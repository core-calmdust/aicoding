// Trainer of the Alquerque learned evaluation (fanorona/engine.c aqnEval, README.md here). Plain C; a batch's gradient is
// shared out over the threads (--threads, default: every core) and summed in a fixed order (the same net for any thread count
// is not promised: float sums).
//   train <out.bin> <data.bin …> [--epochs 10] [--lambda 0.7] [--lr 0.001] [--batch 1024] [--init net.bin] [--val 0.03] [--threads N]
// data: the records of aq datagen (24 bytes); only the positions where the side to move has no capture (the search's leaves
// are such positions) are used. Target = λ·σ(search value / K) + (1−λ)·result, where K (the evaluation's scale) is fitted to the
// data first: σ(v / K) is the teacher's chance to win. The net learns the logit and the engine multiplies it by K, so its values
// are in the hand evaluation's units (the search's windows and margins keep their meaning). Every position is also learned
// mirrored left-right (the rules are symmetric that way).
// Output: the "AQN1" file (whole numbers, as engine.c reads it); the float and the whole-number nets are compared at the end,
// and the checksum of the whole-number net on the first quiet records of the first file is printed (aq check prints the same).
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>
#include <pthread.h>
#include <unistd.h>
typedef unsigned long long u64;
typedef struct { u64 w, b; short v; unsigned char quiet, pad; signed char res; unsigned char side, flags, pad2; } Rec;
#define NIN 100
#define NH 64
#define NH2 16
#define QA 127
// geometry (engine.c: point i = r * 9 + c, r, c < 5; diagonals from the points with r + c even)
static const int DR[8] = { 0, 1, 1, 1, 0, -1, -1, -1 }, DC[8] = { 1, 1, 0, -1, -1, -1, 0, 1 };
static int NB[8][45];
static void geo(void) {
  for (int i = 0; i < 45; i++) for (int d = 0; d < 8; d++) {
    int r = i / 9, c = i % 9, nr = r + DR[d], nc = c + DC[d];
    NB[d][i] = r >= 5 || c >= 5 || ((d & 1) && ((r + c) & 1)) || nr < 0 || nr >= 5 || nc < 0 || nc >= 5 ? -1 : nr * 9 + nc;
  }
}
static u64 hitOf(u64 victims, u64 att, u64 occ) {
  u64 hit = 0;
  for (u64 x = att; x; x &= x - 1) { int i = __builtin_ctzll(x); for (int d = 0; d < 8; d++) { int m = NB[d][i]; if (m < 0 || !(victims >> m & 1)) continue; int t = NB[d][m]; if (t >= 0 && !(occ >> t & 1)) hit |= 1ull << m; } }
  return hit;
}
static u64 mirror(u64 x) { u64 y = 0; for (; x; x &= x - 1) { int i = __builtin_ctzll(x), r = i / 9, c = i % 9; y |= 1ull << (r * 9 + 4 - c); } return y; }
static int kOf(int i, int view) { int r = i / 9, c = i % 9; return (view ? 4 - r : r) * 5 + c; }
// the active features of view k (0 = the side to move's) of a position; returns their number
static int feats(u64 w, u64 b, int side, int k, int *F) {
  u64 P[2] = { w, b }, occ = w | b, H[2] = { hitOf(w, b, occ), hitOf(b, w, occ) };
  int n = 0, cv = k ? side ^ 1 : side;
  for (int c = 0; c < 2; c++) {
    int base = c == cv ? 0 : 25;
    for (u64 x = P[c]; x; x &= x - 1) F[n++] = base + kOf(__builtin_ctzll(x), cv);
    for (u64 x = H[c]; x; x &= x - 1) F[n++] = 50 + base + kOf(__builtin_ctzll(x), cv);
  }
  return n;
}
static float W1[NIN * NH], B1[NH], W2[NH2 * 2 * NH], B2[NH2], W3[NH2], B3;
#define NPAR (NIN * NH + NH + NH2 * 2 * NH + NH2 + NH2 + 1)
static float *PP[6]; static int PN[6] = { NIN * NH, NH, NH2 * 2 * NH, NH2, NH2, 1 };
static float M1[NPAR], M2[NPAR];
static double sig(double x) { return 1 / (1 + exp(-x)); }
typedef struct { int F[2][60], n[2]; float a[2 * NH], x[2 * NH], z[NH2], h[NH2]; } Act;
static float forward(const Rec *r, int mir, Act *A) {
  u64 w = mir ? mirror(r->w) : r->w, b = mir ? mirror(r->b) : r->b;
  for (int k = 0; k < 2; k++) {
    A->n[k] = feats(w, b, r->side, k, A->F[k]);
    float *a = A->a + k * NH;
    for (int i = 0; i < NH; i++) a[i] = B1[i];
    for (int j = 0; j < A->n[k]; j++) { const float *ww = W1 + A->F[k][j] * NH; for (int i = 0; i < NH; i++) a[i] += ww[i]; }
    for (int i = 0; i < NH; i++) A->x[k * NH + i] = a[i] < 0 ? 0 : a[i] > 1 ? 1 : a[i];
  }
  float o = B3;
  for (int j = 0; j < NH2; j++) {
    float z = B2[j]; const float *ww = W2 + j * 2 * NH;
    for (int i = 0; i < 2 * NH; i++) z += A->x[i] * ww[i];
    A->z[j] = z; A->h[j] = z < 0 ? 0 : z > 1 ? 1 : z; o += A->h[j] * W3[j];
  }
  return o;
}
static void backward(const Act *A, float dO, float *G) {
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
// the whole-number net (engine.c aqnEval) on one record
static short qW1[NIN * NH], qB1[NH], qW2[NH2 * 2 * NH], qW3[NH2]; static int qB2[NH2], qB3, qK;
static int clampi(double x, int lo, int hi) { long v = lround(x); return v < lo ? lo : v > hi ? hi : (int)v; }
static void quantize(double K) {
  for (int i = 0; i < NIN * NH; i++) qW1[i] = (short)clampi(W1[i] * QA, -32767, 32767);
  for (int i = 0; i < NH; i++) qB1[i] = (short)clampi(B1[i] * QA, -32767, 32767);
  for (int i = 0; i < NH2 * 2 * NH; i++) qW2[i] = (short)clampi(W2[i] * 64, -32767, 32767);
  for (int i = 0; i < NH2; i++) { qB2[i] = clampi(B2[i] * QA * 64, -2000000000, 2000000000); qW3[i] = (short)clampi(W3[i] * 64, -32767, 32767); }
  qB3 = clampi(B3 * QA * 64, -2000000000, 2000000000); qK = (int)lround(K);
}
static int qeval(const Rec *r) {
  int F[60]; unsigned char x[2 * NH];
  for (int k = 0; k < 2; k++) {
    int n = feats(r->w, r->b, r->side, k, F); short a[NH];
    for (int i = 0; i < NH; i++) a[i] = qB1[i];
    for (int j = 0; j < n; j++) for (int i = 0; i < NH; i++) a[i] = (short)(a[i] + qW1[F[j] * NH + i]);
    for (int i = 0; i < NH; i++) x[k * NH + i] = (unsigned char)(a[i] < 0 ? 0 : a[i] > QA ? QA : a[i]);
  }
  long long out = qB3;
  for (int j = 0; j < NH2; j++) { int h = qB2[j]; for (int i = 0; i < 2 * NH; i++) h += x[i] * qW2[j * 2 * NH + i]; h >>= 6; if (h < 0) h = 0; else if (h > QA) h = QA; out += (long long)h * qW3[j]; }
  long long v = out * qK / (QA * 64); return v > 20000 ? 20000 : v < -20000 ? -20000 : (int)v;
}
static void put16(FILE *f, int v) { unsigned char b[2] = { (unsigned char)v, (unsigned char)(v >> 8) }; fwrite(b, 1, 2, f); }
static void put32(FILE *f, int v) { unsigned char b[4] = { (unsigned char)v, (unsigned char)(v >> 8), (unsigned char)(v >> 16), (unsigned char)(v >> 24) }; fwrite(b, 1, 4, f); }
static void save(const char *fn) {
  FILE *f = fopen(fn, "wb"); if (!f) { perror(fn); exit(1); }
  fwrite("AQN1", 1, 4, f); put16(f, NIN); put16(f, NH); put16(f, NH2); put16(f, 0); put32(f, qK);
  for (int i = 0; i < NIN * NH; i++) put16(f, qW1[i]);
  for (int i = 0; i < NH; i++) put16(f, qB1[i]);
  for (int i = 0; i < NH2 * 2 * NH; i++) put16(f, qW2[i]);
  for (int i = 0; i < NH2; i++) put32(f, qB2[i]);
  for (int i = 0; i < NH2; i++) put16(f, qW3[i]);
  put32(f, qB3);
  fclose(f);
}
static int load(const char *fn) {   // (--init: go on from a net of this file's format)
  FILE *f = fopen(fn, "rb"); if (!f) return 0;
  unsigned char h[16]; if (fread(h, 1, 16, f) != 16 || memcmp(h, "AQN1", 4)) { fclose(f); return 0; }
  short s; int v;
  for (int i = 0; i < NIN * NH; i++) { if (fread(&s, 2, 1, f) != 1) return 0; W1[i] = s / (float)QA; }
  for (int i = 0; i < NH; i++) { if (fread(&s, 2, 1, f) != 1) return 0; B1[i] = s / (float)QA; }
  for (int i = 0; i < NH2 * 2 * NH; i++) { if (fread(&s, 2, 1, f) != 1) return 0; W2[i] = s / 64.f; }
  for (int i = 0; i < NH2; i++) { if (fread(&v, 4, 1, f) != 1) return 0; B2[i] = v / (float)(QA * 64); }
  for (int i = 0; i < NH2; i++) { if (fread(&s, 2, 1, f) != 1) return 0; W3[i] = s / 64.f; }
  if (fread(&v, 4, 1, f) != 1) return 0; B3 = v / (float)(QA * 64);
  fclose(f); return 1;
}
static u64 rs = 0x9E3779B97F4A7C15ull;
static u64 rnd(void) { rs ^= rs << 13; rs ^= rs >> 7; rs ^= rs << 17; return rs; }
static double gauss(void) { double u = (rnd() >> 11) * (1.0 / 9007199254740992.0) + 1e-12, v = (rnd() >> 11) * (1.0 / 9007199254740992.0); return sqrt(-2 * log(u)) * cos(2 * M_PI * v); }
static Rec *D; static long ND;
static double target(const Rec *r, double K, double lam);
typedef struct { long s, e; double K, lam, tl; long tn; float *G; } Job;
static Job J[64]; static int NT = 1;
static void *work(void *a) {   // the gradient of the records s..e (and their mirror images) into the job's own buffer
  Job *j = a; memset(j->G, 0, NPAR * sizeof(float)); j->tl = 0; j->tn = 0;
  for (long i = j->s; i < j->e; i++) for (int m = 0; m < 2; m++) {
    Act A; double o = forward(&D[i], m, &A), p = sig(o), t = target(&D[i], j->K, j->lam);
    backward(&A, (float)(p - t), j->G);
    double pc = p < 1e-6 ? 1e-6 : p > 1 - 1e-6 ? 1 - 1e-6 : p; j->tl -= t * log(pc) + (1 - t) * log(1 - pc); j->tn++;
  }
  return 0;
}
static double target(const Rec *r, double K, double lam) {
  double s = r->flags & 1 ? (r->v > 0 ? 1 : 0) : sig(r->v / K);
  return lam * s + (1 - lam) * (r->res + 1) / 2.0;
}
static double fitK(void) {   // K minimizing the cross-entropy of σ(v / K) against the results (golden section on log K)
  double lo = log(20), hi = log(3000);
  long step = ND > 400000 ? ND / 400000 : 1;
  #define CE(lk) ({ double K_ = exp(lk), s_ = 0; long n_ = 0; for (long i = 0; i < ND; i += step) { const Rec *r = &D[i]; if (r->flags & 1) continue; double p = sig(r->v / K_), t = (r->res + 1) / 2.0; p = p < 1e-6 ? 1e-6 : p > 1 - 1e-6 ? 1 - 1e-6 : p; s_ -= t * log(p) + (1 - t) * log(1 - p); n_++; } s_ / (n_ ? n_ : 1); })
  for (int it = 0; it < 40; it++) { double a = hi - (hi - lo) * 0.618, b = lo + (hi - lo) * 0.618; if (CE(a) < CE(b)) hi = b; else lo = a; }
  return exp((lo + hi) / 2);
}
int main(int argc, char **argv) {
  if (argc < 3) { fprintf(stderr, "train <out.bin> <data.bin …> [--epochs N] [--lambda L] [--lr X] [--batch B] [--init net.bin] [--val F]\n"); return 2; }
  geo();
  NT = (int)sysconf(_SC_NPROCESSORS_ONLN); if (NT < 1) NT = 1;
  int epochs = 10, batch = 1024; double lam = 0.7, lr0 = 1e-3, valF = 0.03; const char *init = 0;
  const char *files[4096]; int nf = 0;
  for (int i = 2; i < argc; i++) {
    if (!strcmp(argv[i], "--epochs")) epochs = atoi(argv[++i]); else if (!strcmp(argv[i], "--lambda")) lam = atof(argv[++i]);
    else if (!strcmp(argv[i], "--lr")) lr0 = atof(argv[++i]); else if (!strcmp(argv[i], "--batch")) batch = atoi(argv[++i]);
    else if (!strcmp(argv[i], "--init")) init = argv[++i]; else if (!strcmp(argv[i], "--val")) valF = atof(argv[++i]);
    else if (!strcmp(argv[i], "--threads")) NT = atoi(argv[++i]);
    else if (nf < 4096) files[nf++] = argv[i];
  }
  long cap = 0; for (int i = 0; i < nf; i++) { FILE *f = fopen(files[i], "rb"); if (!f) continue; fseek(f, 0, SEEK_END); cap += ftell(f) / sizeof(Rec); fclose(f); }
  D = malloc((cap + 1) * sizeof(Rec)); ND = 0;
  for (int i = 0; i < nf; i++) { FILE *f = fopen(files[i], "rb"); if (!f) continue; Rec r; while (fread(&r, sizeof r, 1, f) == 1) if (r.flags & 2) D[ND++] = r; fclose(f); }
  // the checksum of the first quiet records of the first file (aq check <net> <file> 100000 prints the same for the engine)
  long NC = 0; { FILE *f = nf ? fopen(files[0], "rb") : 0; if (f) { Rec r; while (NC < 100000 && fread(&r, sizeof r, 1, f) == 1) if (r.flags & 2) NC++; fclose(f); } }
  Rec *C = malloc((NC + 1) * sizeof(Rec)); memcpy(C, D, NC * sizeof(Rec));
  printf("%ld positions (no capture for the side to move)\n", ND); fflush(stdout);
  if (ND < 1000) { fprintf(stderr, "too few positions\n"); return 1; }
  for (long i = ND - 1; i > 0; i--) { long j = (long)(rnd() % (u64)(i + 1)); Rec t = D[i]; D[i] = D[j]; D[j] = t; }
  long NV = (long)(ND * valF); if (NV > 200000) NV = 200000; Rec *V = D + ND - NV; ND -= NV;
  double K = fitK(); printf("K (the evaluation's scale) %.1f\n", K);
  PP[0] = W1; PP[1] = B1; PP[2] = W2; PP[3] = B2; PP[4] = W3; PP[5] = &B3;
  if (init && load(init)) printf("from %s\n", init);
  else {
    for (int i = 0; i < NIN * NH; i++) W1[i] = (float)(gauss() * 0.06);
    for (int i = 0; i < NH; i++) B1[i] = 0.5f;
    for (int i = 0; i < NH2 * 2 * NH; i++) W2[i] = (float)(gauss() / sqrt(2.0 * NH));
    for (int i = 0; i < NH2; i++) { B2[i] = 0.5f; W3[i] = (float)(gauss() * 0.3); }
    B3 = 0;
  }
  if (NT > 64) NT = 64; if (NT < 1) NT = 1;
  for (int k = 0; k < NT; k++) J[k].G = malloc(NPAR * sizeof(float));
  printf("threads %d\n", NT);
  long step = 0; double b1 = 0.9, b2 = 0.999;
  for (int ep = 0; ep < epochs; ep++) {
    double lr = lr0 * (ep >= epochs * 0.85 ? 0.1 : ep >= epochs * 0.6 ? 0.3 : 1), tl = 0; long tn = 0; time_t t0 = time(0);
    for (long i = ND - 1; i > 0; i--) { long j = (long)(rnd() % (u64)(i + 1)); Rec t = D[i]; D[i] = D[j]; D[j] = t; }
    for (long s = 0; s < ND; s += batch) {
      long e = s + batch < ND ? s + batch : ND; int nb = (int)(e - s) * 2;
      pthread_t th[64]; long per = (e - s + NT - 1) / NT;
      for (int k = 0; k < NT; k++) { J[k].s = s + k * per; J[k].e = J[k].s + per < e ? J[k].s + per : e; J[k].K = K; J[k].lam = lam; if (NT > 1) pthread_create(&th[k], 0, work, &J[k]); else work(&J[k]); }
      if (NT > 1) for (int k = 0; k < NT; k++) pthread_join(th[k], 0);
      for (int k = 1; k < NT; k++) for (int i = 0; i < NPAR; i++) J[0].G[i] += J[k].G[i];
      for (int k = 0; k < NT; k++) { tl += J[k].tl; tn += J[k].tn; }
      float *G = J[0].G;
      step++; const double c1 = 1 - pow(b1, step), c2 = 1 - pow(b2, step);
      for (int k = 0, o = 0; k < 6; o += PN[k], k++) for (int i = 0; i < PN[k]; i++) {
        float g = G[o + i] / nb; M1[o + i] = (float)(b1 * M1[o + i] + (1 - b1) * g); M2[o + i] = (float)(b2 * M2[o + i] + (1 - b2) * g * g);
        float *w = &PP[k][i]; *w -= (float)(lr * (M1[o + i] / c1) / (sqrt(M2[o + i] / c2) + 1e-8));
        if (k == 0 || k == 1) { if (*w > 2) *w = 2; else if (*w < -2) *w = -2; }   // (the int16 accumulators: ≤ 54 inputs × 254 < 32767)
        else if (k == 2 || k == 4) { if (*w > 7) *w = 7; else if (*w < -7) *w = -7; }
      }
    }
    double vl = 0; for (long i = 0; i < NV; i++) { Act A; double p = sig(forward(&V[i], 0, &A)), t = target(&V[i], K, lam); p = p < 1e-6 ? 1e-6 : p > 1 - 1e-6 ? 1 - 1e-6 : p; vl -= t * log(p) + (1 - t) * log(1 - p); }
    printf("epoch %d  train %.5f  valid %.5f  (%lds)\n", ep + 1, tl / (tn ? tn : 1), vl / (NV ? NV : 1), (long)(time(0) - t0)); fflush(stdout);
  }
  quantize(K); save(argv[1]);
  // the whole-number net against the float one, and how well each predicts the results (validation positions)
  double dq = 0, ce = 0, ceh = 0; long n = 0;
  for (long i = 0; i < NV; i++) {
    Act A; double f = forward(&V[i], 0, &A) * K, q = qeval(&V[i]); dq += fabs(f - q);
    if (V[i].flags & 1) continue;
    double t = (V[i].res + 1) / 2.0, p = sig(q / K), ph = sig(V[i].v / K);
    p = p < 1e-6 ? 1e-6 : p > 1 - 1e-6 ? 1 - 1e-6 : p; ph = ph < 1e-6 ? 1e-6 : ph > 1 - 1e-6 ? 1 - 1e-6 : ph;
    ce -= t * log(p) + (1 - t) * log(1 - p); ceh -= t * log(ph) + (1 - t) * log(1 - ph); n++;
  }
  unsigned long long sum = 0; double sa = 0;
  for (long i = 0; i < NC; i++) { int v = qeval(&C[i]); sum = sum * 1000003u + (unsigned long long)(unsigned)v; sa += v < 0 ? -v : v; }
  printf("saved %s  K %d  |float − whole-number| %.2f  result cross-entropy: net (no search) %.4f, teacher (searched) %.4f\n", argv[1], qK, dq / (NV ? NV : 1), ce / (n ? n : 1), ceh / (n ? n : 1));
  printf("check %ld positions  checksum %016llx  mean |value| %.1f\n", NC, sum, NC ? sa / NC : 0);
  return 0;
}
