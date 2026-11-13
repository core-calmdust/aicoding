/* HalfKP-style NNUE trainer for the shogi engine built with -DNUE_KB (engine.c; not the shipped builds).
   The net: (KB x 2534 -> H) x 2 perspectives -> 1, SCReLU. Each perspective uses the copy of the 2534 features (the
   current net's) of the bucket of its own king square: bucket = kmap[own king square in its own frame].
   Training adds one shared copy of the 2534 features (the "factoriser") that every bucket uses; the saved net has it
   folded into every bucket, so the engine sees only KB copies. Starting from the current net (--init nnue.bin) puts it
   into the shared copy: the new net then begins exactly as strong as the current one.

   usage: trainkp train.bin out.bin [options]       (train.bin: the shuffled PackedSfenValue file of prep)
     --kb k9           bucket map: k1 (one bucket = the current net's features), k3 (rank of the king), k9 (3 x 3 regions),
                       k81 (every square: full HalfKP), or a file of 81 numbers (own frame, row 0 = the far side)
     --hidden 256 --epochs 8 --lr 0.001 --lambda 0.75 --batch 16384 --threads N --val val.bin --init net --max N
   Writes out.bin (NUEK, for the engine) after every epoch, and out.bin.ckpt (weights + Adam state + position) every
   few minutes: the same command continues from the checkpoint (delete it to start over).

   --oscale s: the net is trained so that its output = s x the data's scale (sigmoid(output / s) is fitted). The site's
     search is tuned to the scale of the site's net, whose output layer was multiplied by 0.805 (MODEL_CARD v6): a net for
     the site (starting from the site's net or not) is trained with --oscale 0.805. Without it, training starting from the
     site's net first undoes the 0.805 (the evaluation grows 1.24 times) and the search no longer suits the net.
   --ob 8: 8 output buckets (one output layer per stage of the game: by the number of pieces in hand, engine.c nueBucket;
     the shipped engine already has them, nue_set_nb). Starting from a net with one output, every bucket starts as it.
     The file then is NUEO: int32 "NUEO" 0x4F45554E, H, IN, KB, NB; kmap[84]; W1; B1; W2[NB][2H]; B2[NB].
   trainkp --scale net data.psv n         the net's scale against the data's scores (the best-fit factor)
   trainkp --rescale in.bin out.bin f     multiply the output layer by f
   trainkp --check net.bin data.psv n [dump.txt]
     prints the evaluation (side to move) of the first n quiet positions as the engine computes it (integer accumulators),
     and optionally writes the positions as text (board[81] hand[16] side) for kpcheck.py

   File (little endian): int32 "NUEK" 0x4B45554E, H, IN (= KB * 2534), KB; u8 kmap[84] (81 used);
                         int16 W1[IN][H] (x127), int32 B1[H] (x127), int16 W2[2H] (x64), int32 B2 (x127x64) */
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
#include "psv.h"

#define BASE 2534
#define QA 127
#define QB 64
#define W1CLIP 1.98f
#define W2CLIP 60.f
#define MAGIC_K 0x4B45554E
#define MAGIC_Q 0x5145554E
#define MAGIC_O 0x4F45554E
#define NB_MAX 8
static int H = 256, NTH = 4, BS = 16384, KB = 9, FACT = 1, OB = 1;   /* OB: output buckets (1, or 8 = engine.c nueBucket) */
static long ROWS;                           /* KB * BASE (+ BASE for the shared copy) */
static uint8_t KMAP[84];
static float LAMBDA = 0.75f;
static float OSCALE = 1.f;                 /* --oscale: the net's output is OSCALE x the data's scale (the site's search is tuned to 0.805) */
static float *W1, *B1, *W2, *B2;
static float *mW1, *vW1, *mB1, *vB1, *mW2, *vW2, *mB2, *vB2;
static float **gW1, **gB1, **gW2, **gB2;
static uint8_t **touch;                     /* per thread: rows of W1 with a gradient in this batch */
static double *tLoss;
static const PSV *D; static long NT;

static double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec + t.tv_nsec / 1e9; }
static inline float sigm(float x) { return 1.f / (1.f + expf(-x)); }
static void *zalloc(size_t n) { void *p = calloc(n, 1); if (!p) { fprintf(stderr, "out of memory\n"); exit(1); } return p; }
static float *fz(size_t n) { return zalloc(n * sizeof(float)); }
static unsigned long long rs = 88172645463325252ULL;
static unsigned long long xr(void) { rs ^= rs << 13; rs ^= rs >> 7; rs ^= rs << 17; return rs; }
static float randn(void) { double u = (xr() >> 11) * (1.0 / 9007199254740992.0) + 1e-12, v = (xr() >> 11) * (1.0 / 9007199254740992.0); return (float)(sqrt(-2 * log(u)) * cos(6.283185307 * v)); }

static int set_kmap(const char *k) {
  memset(KMAP, 0, sizeof KMAP);
  if (!strcmp(k, "k1")) KB = 1;
  else if (!strcmp(k, "k3")) { KB = 3; for (int s = 0; s < 81; s++) { int r = s / 9; KMAP[s] = r == 8 ? 0 : r == 7 ? 1 : 2; } }
  else if (!strcmp(k, "k9")) { KB = 9; for (int s = 0; s < 81; s++) { int r = s / 9, c = s % 9; KMAP[s] = (uint8_t)((r == 8 ? 0 : r == 7 ? 1 : 2) * 3 + c / 3); } }
  else if (!strcmp(k, "k81")) { KB = 81; for (int s = 0; s < 81; s++) KMAP[s] = (uint8_t)s; }
  else {
    FILE *f = fopen(k, "r"); if (!f) { perror(k); return 0; }
    int mx = 0; for (int s = 0; s < 81; s++) { int v; if (fscanf(f, "%d", &v) != 1 || v < 0 || v > 255) { fprintf(stderr, "%s: 81 numbers expected\n", k); return 0; } KMAP[s] = (uint8_t)v; if (v > mx) mx = v; }
    fclose(f); KB = mx + 1;
  }
  return 1;
}
/* features of one perspective: rows of the bucket copy (and of the shared copy when training) */
static int feats(const Pos *p, int persp, uint32_t *f, int shared) {
  uint16_t b[48]; int n = pos_features(p, persp, b), off = pos_kbucket(p, persp, KMAP) * BASE, k = 0;
  for (int i = 0; i < n; i++) { f[k++] = (uint32_t)(off + b[i]); if (shared) f[k++] = (uint32_t)(KB * BASE + b[i]); }
  return k;
}
/* the output bucket of engine.c (nueBucket): by the number of pieces in hand, both sides */
static inline int obucket(const Pos *p, int nb) {
  if (nb == 1) return 0;
  int t = 0; for (int i = 1; i < 8; i++) t += p->hand[i] + p->hand[8 + i];
  return t < 1 ? 0 : t < 3 ? 1 : t < 5 ? 2 : t < 7 ? 3 : t < 9 ? 4 : t < 12 ? 5 : t < 16 ? 6 : 7;
}
static inline float target(const PSV *r) {
  float e = sigm(r->score / 600.f), w = r->result > 0 ? 1.f : r->result < 0 ? 0.f : .5f;
  return LAMBDA * e + (1 - LAMBDA) * w;
}
static float forward(const Pos *p, uint32_t *fu, int *nu, uint32_t *ft, int *nt, float *au, float *at, int *bk) {
  *nu = feats(p, p->side, fu, FACT); *nt = feats(p, p->side ^ 1, ft, FACT);
  memcpy(au, B1, H * 4); memcpy(at, B1, H * 4);
  for (int k = 0; k < *nu; k++) { const float *w = W1 + (size_t)fu[k] * H; for (int i = 0; i < H; i++) au[i] += w[i]; }
  for (int k = 0; k < *nt; k++) { const float *w = W1 + (size_t)ft[k] * H; for (int i = 0; i < H; i++) at[i] += w[i]; }
  int b = obucket(p, OB); *bk = b; const float *w2 = W2 + (size_t)b * 2 * H;
  float o = B2[b];
  for (int i = 0; i < H; i++) { float x = au[i] < 0 ? 0 : au[i] > 1 ? 1 : au[i]; o += x * x * w2[i]; }
  for (int i = 0; i < H; i++) { float x = at[i] < 0 ? 0 : at[i] > 1 ? 1 : at[i]; o += x * x * w2[H + i]; }
  return o;
}

typedef struct { int tid; long b0, n; } Job;
static void *grad_job(void *arg) {
  Job *j = arg; int tid = j->tid;
  float *gw1 = gW1[tid], *gb1 = gB1[tid], *gw2 = gW2[tid], *gb2 = gB2[tid]; uint8_t *tc = touch[tid];
  float *au = malloc(H * 4), *at = malloc(H * 4), *du = malloc(H * 4), *dt = malloc(H * 4);
  uint32_t fu[96], ft[96]; int nu, nt, bk; double loss = 0;
  for (long k = j->b0; k < j->b0 + j->n; k++) {
    const PSV *r = &D[k]; Pos p;
    if (psv_decode(r, &p)) continue;
    float o = forward(&p, fu, &nu, ft, &nt, au, at, &bk), pr = sigm(o / OSCALE), t = target(r), e = pr - t;
    loss += e * e;
    float g = 2 * e * pr * (1 - pr) / BS / OSCALE;
    float *gw2b = gw2 + (size_t)bk * 2 * H; const float *w2b = W2 + (size_t)bk * 2 * H;
    for (int i = 0; i < H; i++) {
      float x = au[i], y = at[i];
      float cx = x < 0 ? 0 : x > 1 ? 1 : x, cy = y < 0 ? 0 : y > 1 ? 1 : y;
      gw2b[i] += g * cx * cx; gw2b[H + i] += g * cy * cy;
      du[i] = (x > 0 && x < 1) ? g * w2b[i] * 2 * x : 0;
      dt[i] = (y > 0 && y < 1) ? g * w2b[H + i] * 2 * y : 0;
      gb1[i] += du[i] + dt[i];
    }
    gb2[bk] += g;
    for (int q = 0; q < nu; q++) { float *w = gw1 + (size_t)fu[q] * H; tc[fu[q]] = 1; for (int i = 0; i < H; i++) w[i] += du[i]; }
    for (int q = 0; q < nt; q++) { float *w = gw1 + (size_t)ft[q] * H; tc[ft[q]] = 1; for (int i = 0; i < H; i++) w[i] += dt[i]; }
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
/* W1: only the rows some thread touched in this batch (sparse Adam: an untouched row keeps its moments as they are) */
typedef struct { int tid; float lr, c1, c2; } UJob;
static void *update_job(void *arg) {
  UJob *u = arg; long r0 = ROWS * u->tid / NTH, r1 = ROWS * (u->tid + 1) / NTH;
  for (long r = r0; r < r1; r++) {
    int any = 0; for (int t = 0; t < NTH; t++) any |= touch[t][r];
    if (!any) continue;
    float *a = gW1[0] + (size_t)r * H;
    for (int t = 1; t < NTH; t++) if (touch[t][r]) { float *b = gW1[t] + (size_t)r * H; for (int i = 0; i < H; i++) { a[i] += b[i]; b[i] = 0; } touch[t][r] = 0; }
    touch[0][r] = 0;
    adam1(W1 + (size_t)r * H, a, mW1 + (size_t)r * H, vW1 + (size_t)r * H, 0, H, u->lr, u->c1, u->c2, W1CLIP);
    memset(a, 0, H * 4);
  }
  return NULL;
}
static void step(long b0, int it, float lr) {
  pthread_t th[256]; Job jb[256]; UJob uj[256];
  for (int t = 0; t < NTH; t++) { jb[t].tid = t; jb[t].b0 = b0 + (long)BS * t / NTH; jb[t].n = (long)BS * (t + 1) / NTH - (long)BS * t / NTH; pthread_create(&th[t], NULL, grad_job, &jb[t]); }
  for (int t = 0; t < NTH; t++) pthread_join(th[t], NULL);
  float c1 = 1 - powf(0.9f, it), c2 = 1 - powf(0.999f, it);
  for (int t = 0; t < NTH; t++) { uj[t].tid = t; uj[t].lr = lr; uj[t].c1 = c1; uj[t].c2 = c2; pthread_create(&th[t], NULL, update_job, &uj[t]); }
  for (int t = 0; t < NTH; t++) pthread_join(th[t], NULL);
  for (int t = 1; t < NTH; t++) { for (int i = 0; i < OB * 2 * H; i++) { gW2[0][i] += gW2[t][i]; gW2[t][i] = 0; } for (int i = 0; i < H; i++) { gB1[0][i] += gB1[t][i]; gB1[t][i] = 0; } for (int i = 0; i < OB; i++) { gB2[0][i] += gB2[t][i]; gB2[t][i] = 0; } }
  adam1(B1, gB1[0], mB1, vB1, 0, H, lr, c1, c2, 1e9f);
  adam1(W2, gW2[0], mW2, vW2, 0, (size_t)OB * 2 * H, lr, c1, c2, W2CLIP);
  adam1(B2, gB2[0], mB2, vB2, 0, OB, lr, c1, c2, 1e9f);
  memset(gB1[0], 0, H * 4); memset(gW2[0], 0, (size_t)OB * 2 * H * 4); memset(gB2[0], 0, OB * 4);
}

typedef struct { const PSV *v; long n; double l, le; long c; } VJob;
static void *val_job(void *arg) {
  VJob *j = arg; float *au = malloc(H * 4), *at = malloc(H * 4); uint32_t fu[96], ft[96]; int nu, nt, bk;
  for (long k = 0; k < j->n; k++) {
    const PSV *r = &j->v[k]; Pos p; if (psv_decode(r, &p) || psv_in_check(&p)) continue;
    float pr = sigm(forward(&p, fu, &nu, ft, &nt, au, at, &bk) / OSCALE), e = pr - target(r), ee = pr - sigm(r->score / 600.f);
    j->l += e * e; j->le += ee * ee; j->c++;
  }
  free(au); free(at); return NULL;
}
static void validate(const PSV *v, long n, double *l, double *le) {
  pthread_t th[256]; VJob jb[256]; double a = 0, b = 0; long c = 0;
  for (int t = 0; t < NTH; t++) { long s = n * t / NTH, e = n * (t + 1) / NTH; jb[t] = (VJob){ v + s, e - s, 0, 0, 0 }; pthread_create(&th[t], NULL, val_job, &jb[t]); }
  for (int t = 0; t < NTH; t++) { pthread_join(th[t], NULL); a += jb[t].l; b += jb[t].le; c += jb[t].c; }
  *l = a / (c ? c : 1); *le = b / (c ? c : 1);
}

static int rq(float x, float s, int lim) { long v = lrintf(x * s); return v > lim ? lim : v < -lim ? -lim : (int)v; }
static void save(const char *path) {
  char tmp[1100]; snprintf(tmp, sizeof tmp, "%s.tmp", path);
  FILE *f = fopen(tmp, "wb"); if (!f) { perror(tmp); return; }
  int32_t hd[5] = { OB > 1 ? MAGIC_O : MAGIC_K, H, KB * BASE, KB, OB }; fwrite(hd, 4, OB > 1 ? 5 : 4, f); fwrite(KMAP, 1, 84, f);
  int16_t *row = malloc((size_t)H * 2);
  for (long r = 0; r < (long)KB * BASE; r++) {
    const float *w = W1 + (size_t)r * H, *sh = FACT ? W1 + ((size_t)KB * BASE + r % BASE) * H : NULL;
    for (int i = 0; i < H; i++) row[i] = (int16_t)rq(w[i] + (sh ? sh[i] : 0), QA, 32767);
    fwrite(row, 2, H, f);
  }
  free(row);
  for (int i = 0; i < H; i++) { int32_t b = rq(B1[i], QA, 32767); fwrite(&b, 4, 1, f); }
  for (int i = 0; i < OB * 2 * H; i++) { int16_t w = (int16_t)rq(W2[i], QB, 32767); fwrite(&w, 2, 1, f); }
  for (int i = 0; i < OB; i++) { int32_t b2 = (int32_t)lrint((double)B2[i] * QA * QB); fwrite(&b2, 4, 1, f); }
  fclose(f); rename(tmp, path);
}
/* checkpoint: everything needed to continue exactly */
static void save_ckpt(const char *path, int ep, long b, int it, long start) {
  char tmp[1100]; snprintf(tmp, sizeof tmp, "%s.tmp", path);
  FILE *f = fopen(tmp, "wb"); if (!f) { perror(tmp); return; }
  long hd[8] = { 0x4B43 + (OB - 1) * 0x10000L, H, ROWS, ep, b, it, start, (long)rs }; fwrite(hd, sizeof(long), 8, f);
  size_t n1 = (size_t)ROWS * H;
  fwrite(W1, 4, n1, f); fwrite(mW1, 4, n1, f); fwrite(vW1, 4, n1, f);
  fwrite(B1, 4, H, f); fwrite(mB1, 4, H, f); fwrite(vB1, 4, H, f);
  size_t n2 = (size_t)OB * 2 * H;
  fwrite(W2, 4, n2, f); fwrite(mW2, 4, n2, f); fwrite(vW2, 4, n2, f);
  fwrite(B2, 4, OB, f); fwrite(mB2, 4, OB, f); fwrite(vB2, 4, OB, f);
  fclose(f); rename(tmp, path);
}
static int load_ckpt(const char *path, int *ep, long *b, int *it, long *start) {
  FILE *f = fopen(path, "rb"); if (!f) return 0;
  long hd[8]; if (fread(hd, sizeof(long), 8, f) != 8 || hd[0] != 0x4B43 + (OB - 1) * 0x10000L || hd[1] != H || hd[2] != ROWS) { fprintf(stderr, "%s: a checkpoint of other settings (delete it to start over)\n", path); exit(1); }
  size_t n1 = (size_t)ROWS * H, n2 = (size_t)OB * 2 * H; int ok = 1;
  ok &= fread(W1, 4, n1, f) == n1 && fread(mW1, 4, n1, f) == n1 && fread(vW1, 4, n1, f) == n1;
  ok &= fread(B1, 4, H, f) == (size_t)H && fread(mB1, 4, H, f) == (size_t)H && fread(vB1, 4, H, f) == (size_t)H;
  ok &= fread(W2, 4, n2, f) == n2 && fread(mW2, 4, n2, f) == n2 && fread(vW2, 4, n2, f) == n2;
  ok &= fread(B2, 4, OB, f) == (size_t)OB && fread(mB2, 4, OB, f) == (size_t)OB && fread(vB2, 4, OB, f) == (size_t)OB;
  fclose(f); if (!ok) { fprintf(stderr, "%s: short checkpoint\n", path); exit(1); }
  *ep = (int)hd[3]; *b = hd[4]; *it = (int)hd[5]; *start = hd[6]; rs = (unsigned long long)hd[7];
  return 1;
}
/* --init: the current engine net (NUEQ, 2534 inputs) goes into the shared copy (or into every bucket without one) */
static int load_init(const char *path) {
  FILE *f = fopen(path, "rb"); if (!f) { perror(path); return 0; }
  int32_t hd[3]; if (fread(hd, 4, 3, f) != 3 || hd[0] != MAGIC_Q || hd[1] != H || hd[2] != BASE) { fprintf(stderr, "init: %s is not a %d-wide NUEQ net (gunzip it first)\n", path, H); return 0; }
  int16_t *w1 = malloc((size_t)BASE * H * 2); if (fread(w1, 2, (size_t)BASE * H, f) != (size_t)BASE * H) return 0;
  for (long r = 0; r < ROWS; r++) {
    int into = FACT ? r >= (long)KB * BASE : 1;
    for (int i = 0; i < H; i++) W1[(size_t)r * H + i] = into ? w1[(size_t)(r % BASE) * H + i] / (float)QA : 0;
  }
  free(w1);
  for (int i = 0; i < H; i++) { int32_t b; if (fread(&b, 4, 1, f) != 1) return 0; B1[i] = b / (float)QA; }
  for (int i = 0; i < 2 * H; i++) { int16_t w; if (fread(&w, 2, 1, f) != 1) return 0; W2[i] = w / (float)QB; }
  int32_t b2; if (fread(&b2, 4, 1, f) != 1) return 0; B2[0] = (float)(b2 / ((double)QA * QB));
  for (int b = 1; b < OB; b++) { memcpy(W2 + (size_t)b * 2 * H, W2, (size_t)2 * H * 4); B2[b] = B2[0]; }   /* every output bucket starts as the one output */
  fclose(f); return 1;
}
static const PSV *mapf(const char *path, long *n) {
  int fd = open(path, O_RDONLY); if (fd < 0) { perror(path); exit(1); }
  struct stat st; fstat(fd, &st); *n = st.st_size / (long)sizeof(PSV);
  void *p = mmap(NULL, st.st_size, PROT_READ, MAP_SHARED, fd, 0); if (p == MAP_FAILED) { perror("mmap"); exit(1); }
  return p;
}

/* --check: the engine's integer evaluation from a saved net (independent of the training code above) */
static int check(int argc, char **argv) {
  if (argc < 5) { fprintf(stderr, "usage: trainkp --check net.bin data.psv n [dump.txt]\n"); return 1; }
  FILE *f = fopen(argv[2], "rb"); if (!f) { perror(argv[2]); return 1; }
  int32_t hd[4], nb = 1; if (fread(hd, 4, 3, f) != 3) return 1;
  if (hd[0] == MAGIC_Q) { KB = 1; memset(KMAP, 0, sizeof KMAP); }   /* the site's net: one bucket */
  else if ((hd[0] != MAGIC_K && hd[0] != MAGIC_O) || fread(hd + 3, 4, 1, f) != 1) { fprintf(stderr, "not a NUEK / NUEO / NUEQ net\n"); return 1; }
  else { KB = hd[3]; if (hd[0] == MAGIC_O && (fread(&nb, 4, 1, f) != 1 || nb < 1 || nb > NB_MAX)) return 1; if (fread(KMAP, 1, 84, f) != 84) return 1; }
  int h = hd[1], in = hd[2]; int scale = !strcmp(argv[1], "--scale");
  int16_t *w1 = malloc((size_t)in * h * 2); int32_t *b1 = malloc(h * 4); int16_t *w2a = malloc((size_t)nb * h * 4); int32_t b2a[NB_MAX];
  if (fread(w1, 2, (size_t)in * h, f) != (size_t)in * h || fread(b1, 4, h, f) != (size_t)h || fread(w2a, 2, (size_t)nb * 2 * h, f) != (size_t)nb * 2 * h || fread(b2a, 4, nb, f) != (size_t)nb) { fprintf(stderr, "short net\n"); return 1; }
  fclose(f);
  long n; const PSV *d = mapf(argv[3], &n); long want = atol(argv[4]);
  FILE *dump = argc > 5 && !scale ? fopen(argv[5], "w") : NULL;
  float *ev = scale ? malloc((size_t)(want > 0 ? want : 1) * 4) : NULL, *sc = scale ? malloc((size_t)(want > 0 ? want : 1) * 4) : NULL;
  int16_t *acc = malloc(h * 2 * 2);
  for (long k = 0, shown = 0; k < n && shown < want; k++) {
    Pos p; if (psv_decode(&d[k], &p) || psv_in_check(&p)) continue;
    for (int c = 0; c < 2; c++) {
      int persp = c ? p.side ^ 1 : p.side; uint32_t fs[96]; int nf = 0;
      uint16_t b[48]; int nb = pos_features(&p, persp, b), off = pos_kbucket(&p, persp, KMAP) * BASE;
      for (int i = 0; i < nb; i++) fs[nf++] = (uint32_t)(off + b[i]);
      int16_t *a = acc + c * h; for (int i = 0; i < h; i++) a[i] = (int16_t)b1[i];
      for (int q = 0; q < nf; q++) { const int16_t *w = w1 + (size_t)fs[q] * h; for (int i = 0; i < h; i++) a[i] = (int16_t)(a[i] + w[i]); }
    }
    long long sum = 0; const int ob = obucket(&p, nb); const int16_t *w2 = w2a + (size_t)ob * 2 * h; const int32_t b2 = b2a[ob];
    for (int c = 0; c < 2; c++) for (int i = 0; i < h; i++) { int x = acc[c * h + i] < 0 ? 0 : acc[c * h + i] > QA ? QA : acc[c * h + i]; sum += (long long)x * x * w2[c * h + i]; }
    long long v = sum / QA + b2;
    if (scale) { ev[shown] = (float)((double)v / (QA * QB)); sc[shown] = d[k].score / 600.f; shown++; continue; }
    printf("%.6f\n", (double)v * 600 / (QA * QB));
    if (dump) { for (int s = 0; s < 81; s++) fprintf(dump, "%d ", p.board[s]); for (int i = 0; i < 16; i++) fprintf(dump, "%d ", p.hand[i]); fprintf(dump, "%d\n", p.side); }
    shown++;
  }
  if (dump) fclose(dump);
  if (scale) {
    /* the factor s that makes sigmoid(s x net) fit sigmoid(data score / 600) best: s = 1 for a net trained as is on such
       data, 1 / 0.805 = 1.24 for the site's net (its output layer was multiplied by 0.805 to suit the search) */
    long m = 0; for (long k = 0; k < n && m < want; k++) { Pos p; if (psv_decode(&d[k], &p) || psv_in_check(&p)) continue; m++; }
    double best = 1e9, bs = 1, at1 = 0, ma = 0, md = 0;
    for (int q = 40; q <= 250; q++) {
      double s = q / 100.0, l = 0; for (long i = 0; i < m; i++) { double e = sigm(s * ev[i]) - sigm(sc[i]); l += e * e; }
      l /= m ? m : 1; if (q == 100) at1 = l; if (l < best) { best = l; bs = s; }
    }
    for (long i = 0; i < m; i++) { ma += fabs(ev[i]) * 600; md += fabs(sc[i]) * 600; }
    printf("positions %ld  mean |net| %.0f  mean |data score| %.0f  loss as is %.5f  best fit: net x %.2f (loss %.5f)\n", m, ma / (m ? m : 1), md / (m ? m : 1), at1, bs, best);
    printf("to match a net whose best fit is F (the site's net: measure it the same way), rescale this net by %.2f / F\n", bs);
  }
  return 0;
}
/* --rescale in.bin out.bin f: multiply the output layer (W2, B2) by f = the evaluation x f */
static int rescale(int argc, char **argv) {
  if (argc < 5) { fprintf(stderr, "usage: trainkp --rescale in.bin out.bin factor\n"); return 1; }
  FILE *f = fopen(argv[2], "rb"); if (!f) { perror(argv[2]); return 1; }
  fseek(f, 0, SEEK_END); long sz = ftell(f); fseek(f, 0, SEEK_SET);
  uint8_t *buf = malloc(sz); if (fread(buf, 1, sz, f) != (size_t)sz) return 1; fclose(f);
  int32_t *hd = (int32_t *)buf; if (sz < 20 || (hd[0] != MAGIC_K && hd[0] != MAGIC_Q && hd[0] != MAGIC_O)) { fprintf(stderr, "not a NUEK / NUEO / NUEQ net\n"); return 1; }
  int h = hd[1], nb = hd[0] == MAGIC_O ? hd[4] : 1; double fac = atof(argv[4]);
  int16_t *w2 = (int16_t *)(buf + sz - 4 * (long)nb - 4 * (long)h * nb); int32_t *b2 = (int32_t *)(buf + sz - 4 * (long)nb);
  for (int i = 0; i < nb * 2 * h; i++) { long v = lrint(w2[i] * fac); w2[i] = (int16_t)(v > 32767 ? 32767 : v < -32767 ? -32767 : v); }
  for (int i = 0; i < nb; i++) b2[i] = (int32_t)lrint(b2[i] * fac);
  f = fopen(argv[3], "wb"); if (!f) { perror(argv[3]); return 1; } fwrite(buf, 1, sz, f); fclose(f);
  printf("%s = %s x %g\n", argv[3], argv[2], fac);
  return 0;
}

int main(int argc, char **argv) {
  if (argc > 1 && (!strcmp(argv[1], "--check") || !strcmp(argv[1], "--scale"))) return check(argc, argv);
  if (argc > 1 && !strcmp(argv[1], "--rescale")) return rescale(argc, argv);
  if (argc < 3) { fprintf(stderr, "usage: trainkp train.bin out.bin [--kb k9] [--hidden 256] [--epochs 8] [--lr 0.001] [--lambda 0.75] [--oscale 1] [--ob 1] [--batch 16384] [--threads N] [--val val.bin] [--init nnue.bin] [--max N] [--save-min 10]\n       trainkp --check net.bin data.psv n [dump.txt]\n"); return 1; }
  const char *data = argv[1], *outp = argv[2], *valp = NULL, *initp = NULL, *kb = "k9";
  int epochs = 8; float lr0 = 0.001f; long maxn = 0; double savemin = 10;
  long nc = sysconf(_SC_NPROCESSORS_ONLN); NTH = nc > 0 ? (int)nc : 4;
  for (int a = 3; a + 1 < argc; a++) {
    if (!strcmp(argv[a], "--hidden")) H = atoi(argv[++a]);
    else if (!strcmp(argv[a], "--kb")) kb = argv[++a];
    else if (!strcmp(argv[a], "--epochs")) epochs = atoi(argv[++a]);
    else if (!strcmp(argv[a], "--lr")) lr0 = atof(argv[++a]);
    else if (!strcmp(argv[a], "--lambda")) LAMBDA = atof(argv[++a]);
    else if (!strcmp(argv[a], "--oscale")) OSCALE = atof(argv[++a]);
    else if (!strcmp(argv[a], "--ob")) OB = atoi(argv[++a]);
    else if (!strcmp(argv[a], "--batch")) BS = atoi(argv[++a]);
    else if (!strcmp(argv[a], "--threads")) NTH = atoi(argv[++a]);
    else if (!strcmp(argv[a], "--val")) valp = argv[++a];
    else if (!strcmp(argv[a], "--init")) initp = argv[++a];
    else if (!strcmp(argv[a], "--max")) maxn = atol(argv[++a]);
    else if (!strcmp(argv[a], "--save-min")) savemin = atof(argv[++a]);
  }
  if (!set_kmap(kb)) return 1;
  if (OB != 1 && OB != NB_MAX) { fprintf(stderr, "--ob: 1 or %d\n", NB_MAX); return 1; }
  FACT = KB > 1; ROWS = (long)(KB + FACT) * BASE;
  if (NTH > 256) NTH = 256; if (NTH < 1) NTH = 1;
  long N; D = mapf(data, &N); if (maxn && maxn < N) N = maxn;
  const PSV *V; long NV;
  if (valp) { V = mapf(valp, &NV); if (NV > 1000000) NV = 1000000; NT = N; }
  else { NV = N / 100 < 1000000 ? N / 100 : 1000000; NT = N - NV; V = D + NT; }
  fprintf(stderr, "train %ld  valid %ld  kb %s (%d buckets)  H %d  epochs %d  lr %g  lambda %g  oscale %g  ob %d  batch %d  threads %d  (W1 %.0f MB)\n",
          NT, NV, kb, KB, H, epochs, lr0, LAMBDA, OSCALE, OB, BS, NTH, ROWS * H * 4 / 1e6);
  size_t n1 = (size_t)ROWS * H;
  size_t n2o = (size_t)OB * 2 * H;
  W1 = fz(n1); B1 = fz(H); W2 = fz(n2o); B2 = fz(OB);
  mW1 = fz(n1); vW1 = fz(n1); mB1 = fz(H); vB1 = fz(H); mW2 = fz(n2o); vW2 = fz(n2o); mB2 = fz(OB); vB2 = fz(OB);
  gW1 = malloc(NTH * sizeof(float *)); gB1 = malloc(NTH * sizeof(float *)); gW2 = malloc(NTH * sizeof(float *)); gB2 = malloc(NTH * sizeof(float *));
  touch = malloc(NTH * sizeof(uint8_t *)); tLoss = calloc(NTH, sizeof(double));
  for (int t = 0; t < NTH; t++) { gW1[t] = fz(n1); gB1[t] = fz(H); gW2[t] = fz(n2o); gB2[t] = fz(OB); touch[t] = zalloc(ROWS); }
  char ck[1100]; snprintf(ck, sizeof ck, "%s.ckpt", outp);
  int ep0 = 0, it = 0; long bres = 0, start = -1;
  if (load_ckpt(ck, &ep0, &bres, &it, &start)) fprintf(stderr, "resumed from %s: epoch %d, batch %ld\n", ck, ep0 + 1, bres);
  else if (initp) { if (!load_init(initp)) return 1; fprintf(stderr, "init from %s\n", initp); }
  else {
    for (size_t i = 0; i < n1; i++) W1[i] = randn() * (FACT && i < (size_t)KB * BASE * H ? 0.01f : 0.05f);
    for (int i = 0; i < H; i++) B1[i] = 0.25f;
    for (size_t i = 0; i < n2o; i++) W2[i] = randn() * 0.5f;
  }
  double vl, vle;
  if (ep0 == 0 && bres == 0) { validate(V, NV, &vl, &vle); fprintf(stderr, "epoch 0  valid %.5f (eval only %.5f)\n", vl, vle); }
  long nb = NT / BS; double lastSave = now();
  long *order = malloc((size_t)(nb ? nb : 1) * sizeof(long));
  for (int ep = ep0; ep < epochs; ep++) {
    float lr = lr0 * (ep >= epochs * 0.75 ? 0.1f : ep >= epochs * 0.5 ? 0.3f : 1.f);
    if (start < 0) start = (long)(xr() >> 2);            /* this epoch's seed (kept in the checkpoint) */
    {                                                    /* blocks of 64 batches (about 1M positions) in a new random order every epoch */
      long nblk = (nb + 63) / 64, *bo = malloc((size_t)(nblk ? nblk : 1) * sizeof(long)); unsigned long long keep = rs; rs = (unsigned long long)start | 1;
      for (long i = 0; i < nblk; i++) bo[i] = i;
      for (long i = nblk - 1; i > 0; i--) { long j = (long)(xr() % (unsigned long long)(i + 1)), t = bo[i]; bo[i] = bo[j]; bo[j] = t; }
      long k = 0; for (long i = 0; i < nblk; i++) for (long q = bo[i] * 64; q < bo[i] * 64 + 64 && q < nb; q++) order[k++] = q;
      rs = keep; free(bo);
    }
    double t0 = now(), loss = 0; long done = 0;
    for (long b = bres; b < nb; b++) {
      long b0 = order[b] * BS;
      step(b0, ++it, lr);
      for (int t = 0; t < NTH; t++) loss += tLoss[t];
      done += BS;
      if ((b & 255) == 255) { double el = now() - t0; fprintf(stderr, "\r  epoch %d  %5.1f%%  loss %.5f  %.0fk pos/s  ", ep + 1, 100.0 * (b + 1) / nb, loss / done, done / el / 1000); }
      if (now() - lastSave > savemin * 60) { save_ckpt(ck, ep, b + 1, it, start); lastSave = now(); }
    }
    bres = 0; start = -1;
    validate(V, NV, &vl, &vle);
    fprintf(stderr, "\repoch %d  train %.5f  valid %.5f (eval only %.5f)  lr %g  %.0fs            \n", ep + 1, loss / (done ? done : 1), vl, vle, lr, now() - t0);
    save(outp);
    { char en[1200]; snprintf(en, sizeof en, "%s.ep%d", outp, ep + 1); save(en); }   /* every epoch's net is kept: match the one with the best valid */
    save_ckpt(ck, ep + 1, 0, it, -1); lastSave = now();
  }
  fprintf(stderr, "saved %s\n", outp);
  return 0;
}
