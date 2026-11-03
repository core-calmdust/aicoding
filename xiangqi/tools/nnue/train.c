/* NNUE trainer for the site's xiangqi engine: (1260 -> H) x 2 perspectives -> 1, SCReLU.
   Reads the records written by datagen (xq.h), writes the net in the engine's format
   (magic "NUEX", H, IN, int16 W1 (x127), int32 B1, int16 W2 (x64), int32 B2). The output is the
   logit of the expected score (win = 1, draw = 0.5) for the side to move.

   usage: train data.bin out.bin [options]
     --hidden 256      hidden size
     --epochs 10       passes over the data
     --lr 0.001        Adam learning rate (x0.3 after 50%, x0.1 after 75% of the epochs)
     --lambda 0.8      target = lambda * teacher expected score (from its win/draw/loss) + (1 - lambda) * game result
     --batch 16384
     --threads N       default: all cores
     --init net.bin    start from an existing net (engine format or .f32 checkpoint, same H)
   The last 2% of the file (whole games, not trained on) is the validation set. Positions in check, positions
   whose best move captures and decided positions (|score| >= 3000) are skipped. Every position is also used
   mirrored left-right (a random half each epoch). After each epoch out.bin and out.bin.f32 are written. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>
#include <pthread.h>
#include <unistd.h>
#include <fcntl.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include "xq.h"

#define IN XQ_IN
#define QA 127
#define QB 64
#define W1CLIP 1.98f
#define W2CLIP 60.f
static int H = 256, NTH = 4, BS = 16384;
static float LAMBDA = 0.8f;
static float *W1, *B1, *W2, *B2;           /* parameters */
static float *mW1, *vW1, *mB1, *vB1, *mW2, *vW2, *mB2, *vB2;
static float **gW1, **gB1, **gW2, **gB2;   /* per-thread gradients */
static double *tLoss;
static const Rec *D; static long NT; static uint32_t *IDX; static uint8_t *MIR;

static double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec + t.tv_nsec / 1e9; }
static inline float sigm(float x) { return 1.f / (1.f + expf(-x)); }
static float *fz(size_t n) { float *p = calloc(n, sizeof(float)); if (!p) { fprintf(stderr, "out of memory\n"); exit(1); } return p; }
static unsigned long long rs = 88172645463325252ULL;
static unsigned long long xr(void) { rs ^= rs << 13; rs ^= rs >> 7; rs ^= rs << 17; return rs; }
static float randn(void) { double u = (xr() >> 11) * (1.0 / 9007199254740992.0) + 1e-12, v = (xr() >> 11) * (1.0 / 9007199254740992.0); return (float)(sqrt(-2 * log(u)) * cos(6.283185307 * v)); }

static inline float tscore(const Rec *r) { return (r->w + (1000 - r->w - r->l) * 0.5f) / 1000.f; }
static inline float target(const Rec *r) {
  float w = r->result > 0 ? 1.f : r->result < 0 ? 0.f : .5f;
  return LAMBDA * tscore(r) + (1 - LAMBDA) * w;
}
static inline int usable(const Rec *r) { return !(r->flags & (REC_CHECK | REC_CAPTURE)) && r->cp < 3000 && r->cp > -3000 && r->w + r->l <= 1000; }
/* features of a record, optionally mirrored left-right */
static inline int feats(const Rec *r, int persp, int mir, uint16_t *f) {
  int n = xq_features(r, persp, f);
  if (mir) for (int k = 0; k < n; k++) { int sq = f[k] % 90, c = sq % 9; f[k] = (uint16_t)(f[k] - c + (8 - c)); }
  return n;
}
/* forward: returns the output before the sigmoid (= engine score / 600) */
static float forward(const Rec *p, int mir, uint16_t *fu, int *nu, uint16_t *ft, int *nt, float *au, float *at) {
  *nu = feats(p, p->stm, mir, fu); *nt = feats(p, p->stm ^ 1, mir, ft);
  memcpy(au, B1, H * 4); memcpy(at, B1, H * 4);
  for (int k = 0; k < *nu; k++) { const float *w = W1 + (size_t)fu[k] * H; for (int i = 0; i < H; i++) au[i] += w[i]; }
  for (int k = 0; k < *nt; k++) { const float *w = W1 + (size_t)ft[k] * H; for (int i = 0; i < H; i++) at[i] += w[i]; }
  float o = B2[0];
  for (int i = 0; i < H; i++) { float x = au[i] < 0 ? 0 : au[i] > 1 ? 1 : au[i]; o += x * x * W2[i]; }
  for (int i = 0; i < H; i++) { float x = at[i] < 0 ? 0 : at[i] > 1 ? 1 : at[i]; o += x * x * W2[H + i]; }
  return o;
}

typedef struct { int tid; long b0, n; } Job;
static void *grad_job(void *arg) {
  Job *j = arg; int tid = j->tid;
  float *gw1 = gW1[tid], *gb1 = gB1[tid], *gw2 = gW2[tid], *gb2 = gB2[tid];
  float *au = malloc(H * 4), *at = malloc(H * 4), *du = malloc(H * 4), *dt = malloc(H * 4);
  uint16_t fu[48], ft[48]; int nu, nt; double loss = 0;
  for (long k = j->b0; k < j->b0 + j->n; k++) {
    const Rec *r = &D[IDX[k]];
    float o = forward(r, MIR[k], fu, &nu, ft, &nt, au, at), pr = sigm(o), t = target(r), e = pr - t;
    loss += e * e;
    float g = 2 * e * pr * (1 - pr) / BS;
    for (int i = 0; i < H; i++) {
      float x = au[i], y = at[i];
      float cx = x < 0 ? 0 : x > 1 ? 1 : x, cy = y < 0 ? 0 : y > 1 ? 1 : y;
      gw2[i] += g * cx * cx; gw2[H + i] += g * cy * cy;
      du[i] = (x > 0 && x < 1) ? g * W2[i] * 2 * x : 0;
      dt[i] = (y > 0 && y < 1) ? g * W2[H + i] * 2 * y : 0;
      gb1[i] += du[i] + dt[i];
    }
    gb2[0] += g;
    for (int k2 = 0; k2 < nu; k2++) { float *w = gw1 + (size_t)fu[k2] * H; for (int i = 0; i < H; i++) w[i] += du[i]; }
    for (int k2 = 0; k2 < nt; k2++) { float *w = gw1 + (size_t)ft[k2] * H; for (int i = 0; i < H; i++) w[i] += dt[i]; }
  }
  tLoss[tid] = loss;
  free(au); free(at); free(du); free(dt);
  return NULL;
}
static void adam1(float *w, float *g, float *m, float *v, size_t i0, size_t i1, float lr, float c1, float c2, float clip) {
  const float b1 = 0.9f, b2 = 0.999f, eps = 1e-8f;
  for (size_t i = i0; i < i1; i++) {
    float gi = g[i]; if (gi == 0 && m[i] == 0) continue;
    m[i] = b1 * m[i] + (1 - b1) * gi; v[i] = b2 * v[i] + (1 - b2) * gi * gi;
    w[i] -= lr * (m[i] / c1) / (sqrtf(v[i] / c2) + eps);
    if (w[i] > clip) w[i] = clip; else if (w[i] < -clip) w[i] = -clip;
  }
}
typedef struct { int tid; float lr, c1, c2; } UJob;
static void *update_job(void *arg) {
  UJob *u = arg; size_t n = (size_t)IN * H, i0 = n * u->tid / NTH, i1 = n * (u->tid + 1) / NTH;
  for (int t = 1; t < NTH; t++) { float *a = gW1[0], *b = gW1[t]; for (size_t i = i0; i < i1; i++) { a[i] += b[i]; b[i] = 0; } }
  adam1(W1, gW1[0], mW1, vW1, i0, i1, u->lr, u->c1, u->c2, W1CLIP);
  memset(gW1[0] + i0, 0, (i1 - i0) * 4);
  return NULL;
}
static void step(long b0, int it, float lr) {
  pthread_t th[256]; Job jb[256]; UJob uj[256];
  for (int t = 0; t < NTH; t++) { jb[t].tid = t; jb[t].b0 = b0 + (long)BS * t / NTH; jb[t].n = (long)BS * (t + 1) / NTH - (long)BS * t / NTH; pthread_create(&th[t], NULL, grad_job, &jb[t]); }
  for (int t = 0; t < NTH; t++) pthread_join(th[t], NULL);
  float c1 = 1 - powf(0.9f, it), c2 = 1 - powf(0.999f, it);
  for (int t = 0; t < NTH; t++) { uj[t].tid = t; uj[t].lr = lr; uj[t].c1 = c1; uj[t].c2 = c2; pthread_create(&th[t], NULL, update_job, &uj[t]); }
  for (int t = 0; t < NTH; t++) pthread_join(th[t], NULL);
  for (int t = 1; t < NTH; t++) { for (int i = 0; i < 2 * H; i++) { gW2[0][i] += gW2[t][i]; gW2[t][i] = 0; } for (int i = 0; i < H; i++) { gB1[0][i] += gB1[t][i]; gB1[t][i] = 0; } gB2[0][0] += gB2[t][0]; gB2[t][0] = 0; }
  adam1(B1, gB1[0], mB1, vB1, 0, H, lr, c1, c2, 1e9f);
  adam1(W2, gW2[0], mW2, vW2, 0, 2 * H, lr, c1, c2, W2CLIP);
  adam1(B2, gB2[0], mB2, vB2, 0, 1, lr, c1, c2, 1e9f);
  memset(gB1[0], 0, H * 4); memset(gW2[0], 0, 2 * H * 4); gB2[0][0] = 0;
}

/* validation: loss against the training target and against the eval alone */
typedef struct { const Rec *v; long n; double l, le; long c; } VJob;
static void *val_job(void *arg) {
  VJob *j = arg; float *au = malloc(H * 4), *at = malloc(H * 4); uint16_t fu[48], ft[48]; int nu, nt;
  for (long k = 0; k < j->n; k++) {
    const Rec *r = &j->v[k]; if (!usable(r)) continue;
    float pr = sigm(forward(r, 0, fu, &nu, ft, &nt, au, at)), e = pr - target(r), ee = pr - tscore(r);
    j->l += e * e; j->le += ee * ee; j->c++;
  }
  free(au); free(at); return NULL;
}
static void validate(const Rec *v, long n, double *l, double *le) {
  pthread_t th[256]; VJob jb[256]; double a = 0, b = 0; long c = 0;
  for (int t = 0; t < NTH; t++) { long s = n * t / NTH, e = n * (t + 1) / NTH; jb[t] = (VJob){ v + s, e - s, 0, 0, 0 }; pthread_create(&th[t], NULL, val_job, &jb[t]); }
  for (int t = 0; t < NTH; t++) { pthread_join(th[t], NULL); a += jb[t].l; b += jb[t].le; c += jb[t].c; }
  *l = a / (c ? c : 1); *le = b / (c ? c : 1);
}

static int rq(float x, float s, int lim) { long v = lrintf(x * s); return v > lim ? lim : v < -lim ? -lim : (int)v; }
static void save(const char *path) {
  FILE *f = fopen(path, "wb"); if (!f) { perror(path); return; }
  int32_t hd[3] = { 0x5845554E, H, IN }; fwrite(hd, 4, 3, f);
  int16_t *w1 = malloc((size_t)IN * H * 2); for (size_t i = 0; i < (size_t)IN * H; i++) w1[i] = (int16_t)rq(W1[i], QA, 32767);
  fwrite(w1, 2, (size_t)IN * H, f); free(w1);
  for (int i = 0; i < H; i++) { int32_t b = rq(B1[i], QA, 32767); fwrite(&b, 4, 1, f); }
  for (int i = 0; i < 2 * H; i++) { int16_t w = (int16_t)rq(W2[i], QB, 32767); fwrite(&w, 2, 1, f); }
  int32_t b2 = (int32_t)lrint((double)B2[0] * QA * QB); fwrite(&b2, 4, 1, f);
  fclose(f);
  char fp[1024]; snprintf(fp, sizeof fp, "%s.f32", path);
  f = fopen(fp, "wb"); if (!f) return;
  fwrite(&H, 4, 1, f); fwrite(W1, 4, (size_t)IN * H, f); fwrite(B1, 4, H, f); fwrite(W2, 4, 2 * H, f); fwrite(B2, 4, 1, f); fclose(f);
}
static int load(const char *path) {
  FILE *f = fopen(path, "rb"); if (!f) { perror(path); return 0; }
  int32_t hd[3]; if (fread(hd, 4, 3, f) != 3) return 0;
  if (hd[0] == 0x5845554E) {   /* quantised engine net */
    if (hd[1] != H || hd[2] != IN) { fprintf(stderr, "init: size mismatch (H %d)\n", hd[1]); return 0; }
    int16_t *w1 = malloc((size_t)IN * H * 2); if (fread(w1, 2, (size_t)IN * H, f) != (size_t)IN * H) return 0;
    for (size_t i = 0; i < (size_t)IN * H; i++) W1[i] = w1[i] / (float)QA; free(w1);
    for (int i = 0; i < H; i++) { int32_t b; if (fread(&b, 4, 1, f) != 1) return 0; B1[i] = b / (float)QA; }
    for (int i = 0; i < 2 * H; i++) { int16_t w; if (fread(&w, 2, 1, f) != 1) return 0; W2[i] = w / (float)QB; }
    int32_t b2; if (fread(&b2, 4, 1, f) != 1) return 0; B2[0] = (float)(b2 / ((double)QA * QB));
  } else {                     /* float checkpoint: first int is H */
    if (hd[0] != H) { fprintf(stderr, "init: size mismatch (H %d)\n", hd[0]); return 0; }
    fseek(f, 4, SEEK_SET);
    if (fread(W1, 4, (size_t)IN * H, f) != (size_t)IN * H || fread(B1, 4, H, f) != (size_t)H || fread(W2, 4, 2 * H, f) != (size_t)(2 * H) || fread(B2, 4, 1, f) != 1) return 0;
  }
  fclose(f); return 1;
}
static const Rec *mapf(const char *path, long *n) {
  int fd = open(path, O_RDONLY); if (fd < 0) { perror(path); exit(1); }
  struct stat st; fstat(fd, &st); *n = st.st_size / (long)sizeof(Rec);
  void *p = mmap(NULL, st.st_size, PROT_READ, MAP_SHARED, fd, 0); if (p == MAP_FAILED) { perror("mmap"); exit(1); }
  madvise(p, st.st_size, MADV_WILLNEED);
  return p;
}

int main(int argc, char **argv) {
  if (argc < 3) { fprintf(stderr, "usage: train data.bin out.bin [--hidden 256] [--epochs 10] [--lr 0.001] [--lambda 0.8] [--batch 16384] [--threads N] [--init net.bin]\n"); return 1; }
  const char *data = argv[1], *outp = argv[2], *initp = NULL;
  int epochs = 10; float lr0 = 0.001f;
  long nc = sysconf(_SC_NPROCESSORS_ONLN); NTH = nc > 0 ? (int)nc : 4;
  for (int a = 3; a < argc; a++) {
    if (a + 1 >= argc) break;
    if (!strcmp(argv[a], "--hidden")) H = atoi(argv[++a]);
    else if (!strcmp(argv[a], "--epochs")) epochs = atoi(argv[++a]);
    else if (!strcmp(argv[a], "--lr")) lr0 = atof(argv[++a]);
    else if (!strcmp(argv[a], "--lambda")) LAMBDA = atof(argv[++a]);
    else if (!strcmp(argv[a], "--batch")) BS = atoi(argv[++a]);
    else if (!strcmp(argv[a], "--threads")) NTH = atoi(argv[++a]);
    else if (!strcmp(argv[a], "--init")) initp = argv[++a];
  }
  if (NTH > 256) NTH = 256; if (NTH < 1) NTH = 1;
  struct stat st0; if (stat(data, &st0) || st0.st_size < (off_t)sizeof(Rec) * 1000) { fprintf(stderr, "%s: no training data\n", data); return 1; }
  long N; D = mapf(data, &N);
  long NV = N / 50, NA = N - NV;          /* validation: the last 2% (whole games) */
  const Rec *V = D + NA;
  IDX = malloc((size_t)(NA ? NA : 1) * 4); NT = 0;
  for (long i = 0; i < NA; i++) if (usable(&D[i])) IDX[NT++] = (uint32_t)i;
  MIR = malloc((size_t)(NT ? NT : 1));
  fprintf(stderr, "records %ld  train %ld (usable)  valid %ld  H %d  epochs %d  lr %g  lambda %g  batch %d  threads %d\n", N, NT, NV, H, epochs, lr0, LAMBDA, BS, NTH);
  if (NT < BS) { fprintf(stderr, "not enough data\n"); return 1; }
  size_t n1 = (size_t)IN * H;
  W1 = fz(n1); B1 = fz(H); W2 = fz(2 * H); B2 = fz(1);
  mW1 = fz(n1); vW1 = fz(n1); mB1 = fz(H); vB1 = fz(H); mW2 = fz(2 * H); vW2 = fz(2 * H); mB2 = fz(1); vB2 = fz(1);
  gW1 = malloc(NTH * sizeof(float *)); gB1 = malloc(NTH * sizeof(float *)); gW2 = malloc(NTH * sizeof(float *)); gB2 = malloc(NTH * sizeof(float *)); tLoss = calloc(NTH, sizeof(double));
  for (int t = 0; t < NTH; t++) { gW1[t] = fz(n1); gB1[t] = fz(H); gW2[t] = fz(2 * H); gB2[t] = fz(1); }
  if (initp) { if (!load(initp)) return 1; fprintf(stderr, "init from %s\n", initp); }
  else {
    for (size_t i = 0; i < n1; i++) W1[i] = randn() * 0.05f;
    for (int i = 0; i < H; i++) B1[i] = 0.25f;
    for (int i = 0; i < 2 * H; i++) W2[i] = randn() * 0.5f;
  }
  double vl, vle; validate(V, NV, &vl, &vle);
  fprintf(stderr, "epoch 0  valid %.5f (teacher only %.5f)\n", vl, vle);
  int it = 0; long nb = NT / BS;
  for (int ep = 0; ep < epochs; ep++) {
    float lr = lr0 * (ep >= epochs * 0.75 ? 0.1f : ep >= epochs * 0.5 ? 0.3f : 1.f);
    for (long i = NT - 1; i > 0; i--) { long j = (long)(xr() % (unsigned long long)(i + 1)); uint32_t t = IDX[i]; IDX[i] = IDX[j]; IDX[j] = t; }
    for (long i = 0; i < NT; i++) MIR[i] = (uint8_t)(xr() & 1);
    double t0 = now(), loss = 0; long done = 0;
    for (long b = 0; b < nb; b++) {
      step(b * BS, ++it, lr);
      for (int t = 0; t < NTH; t++) loss += tLoss[t];
      done += BS;
      if ((b & 255) == 255) { double el = now() - t0; fprintf(stderr, "\r  epoch %d  %5.1f%%  loss %.5f  %.0fk pos/s  ", ep + 1, 100.0 * (b + 1) / nb, loss / done, done / el / 1000); }
    }
    validate(V, NV, &vl, &vle);
    fprintf(stderr, "\repoch %d  train %.5f  valid %.5f (teacher only %.5f)  lr %g  %.0fs            \n", ep + 1, loss / (done ? done : 1), vl, vle, lr, now() - t0);
    save(outp);
  }
  fprintf(stderr, "saved %s\n", outp);
  return 0;
}
