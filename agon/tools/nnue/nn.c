// Agon: the learned evaluation's tools (2026-11-20, agon/MODEL_CARD.md「学習した評価」). One program, run by run.sh:
//   nn selfplay <out.bin> <games> <nk> <seed> [net.bin]   self-play of the engine's αβ (core.c ab_best: the teacher is our own
//                                                          engine — the hand-made evaluation, or the net given), every position
//                                                          with the search's value and the game's result
//   nn train <out.bin> <data.bin>... [--epochs E] [--lambda L] [--lr R] [--threads T] [--hidden H] [--init net.bin] [--ver V]
//   nn match <A> <B> <pairs> <seed> [k/J]                  A against B (e.g. n=20,net=1 / t=100,net=0; AG_NET=net.bin):
//                                                          pairs of games with the colours swapped, a JSON line a game
//   nn check <net.bin> <out.txt>                           values of fixed positions (check_net.js: the same in wasm)
//   nn speed [net.bin]                                     evaluations and search nodes per second, with and without the net
//   nn tojs <net.bin> <out.js>                             agon/net.js (base64)
//   nn zero <out.bin> [H]                                  a net whose correction is 0 (the hand-made evaluation exactly)
// Build: cc -O3 -ffp-contract=off -DNATIVE -DNATIVE_TTSWAP -w -o nn agon/tools/nnue/nn.c -lm -lpthread
// A record (56 bytes): the board (91 cells × 4 bits: the piece 0..4 | captured << 3), the reserves (White | Black << 4), the side
// to move (0 White, 1 Black), the ply, the search's value for the side to move (the evaluation's units, ~100 = one tempo), the
// result for the side to move (+1 / 0 / −1), the rule (0 std, 1 place).
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <math.h>
#include <pthread.h>
static double tEndN = 1e300;
double now(void) { struct timespec t; clock_gettime(CLOCK_THREAD_CPUTIME_ID, &t); return t.tv_sec * 1e3 + t.tv_nsec / 1e6; }
int js_poll(void) { return now() > tEndN; }
int js_shget(unsigned h1, unsigned h2) { (void)h1; (void)h2; return 0; }
void js_shput(unsigned h1, unsigned h2, int d, int v, int f, int m, int rs) { (void)h1; (void)h2; (void)d; (void)v; (void)f; (void)m; (void)rs; }
#include "../../core.c"
#include "geo.h"
typedef struct { u8 b[46]; u8 res, side; unsigned short ply; short v; signed char result; u8 rule; u8 pad[2]; } Rec;
_Static_assert(sizeof(Rec) == 56, "record");
static unsigned long long sr = 88172645463325252ULL;
static unsigned rnd32(void) { sr ^= sr << 13; sr ^= sr >> 7; sr ^= sr << 17; return (unsigned)(sr >> 32); }
static TE *TTA[2];
static void initAll(void) {
  for (int i = 0; i < (int)(sizeof GEO_INIT / sizeof GEO_INIT[0]); i++) GEO[i] = GEO_INIT[i];
  for (int i = 0; i < (int)(sizeof ZT_INIT / sizeof ZT_INIT[0]); i++) ZT[i] = ZT_INIT[i];
  setup();
  TTA[0] = calloc(TSZ, sizeof(TE)); TTA[1] = calloc(TSZ, sizeof(TE)); T = TTA[0];
}
static int loadNetFile(const char *fn) {
  FILE *f = fopen(fn, "rb"); if (!f) return 0;
  size_t n = fread(NNBUF, 1, sizeof NNBUF, f); fclose(f);
  return nn_load((int)n);
}
// ---------------------------------------------------------------- a game
typedef struct { P p; u32 H1[1024], H2[1024]; int nh; } Game;
static void rehash(P *p) {
  u32 a = 0, c = 0;
  for (int i = 0; i < N; i++) { int x = p->sq[i]; if (x) { a ^= Z1(x, i); c ^= Z2(x, i); } if (p->cap[i]) { a ^= ZC1(i); c ^= ZC2(i); } }
  if (p->side) { a ^= ZS1; c ^= ZS2; }
  a ^= ZR1(p->res[1]) ^ ZR1(8 + p->res[2]); c ^= ZR2(p->res[1]) ^ ZR2(8 + p->res[2]);
  p->h1 = a; p->h2 = c;
}
static void newGame(Game *g, int rule) {
  memset(g, 0, sizeof *g);
  P *p = &g->p;
  for (int i = 0; i < N; i++) p->sq[i] = rule ? START_PLACE[i] : START_STD[i];
  p->res[1] = p->res[2] = rule ? 6 : 0;
  rehash(p); g->H1[0] = p->h1; g->H2[0] = p->h2; g->nh = 1;
}
static void gplay(Game *g, int m) { P q; play(&q, &g->p, m); g->p = q; g->H1[g->nh] = q.h1; g->H2[g->nh] = q.h2; g->nh++; }
// over? 0 no, 1 / 2 the winner, 3 a draw (engine.js judge)
static int judgeG(const Game *g) {
  const P *p = &g->p; int mover = p->side ? 1 : 2;
  for (int k = 0; k < 2; k++) { int pl = k ? 3 - mover : mover; if (ringCount(p, pl) == 6) return onThrone(p, pl) ? pl : 3 - pl; }
  int c = 0; for (int i = 0; i < g->nh; i++) if (g->H1[i] == p->h1 && g->H2[i] == p->h2) c++;
  if (c >= 3) return 3;
  if (p->ply >= 300) return 3;
  return 0;
}
static void loadRoot(const Game *g) {
  const P *p = &g->p;
  for (int i = 0; i < N; i++) { SQ[i] = p->sq[i]; CAP[i] = p->cap[i]; }
  IO[8] = p->side; IO[9] = p->ply; IO[10] = (int)p->h1; IO[11] = (int)p->h2; IO[12] = 0; IO[13] = g->nh - 1; IO[14] = p->res[1]; IO[15] = p->res[2]; IO[16] = p->side; IO[17] = 300;
  for (int i = 0; i < g->nh - 1; i++) { RH1[i] = g->H1[i]; RH2[i] = g->H2[i]; }
}
static double lastNodes; static int lastDepth;
// the engine's move (engine.js bestMove: one legal move at once; nk thousand nodes and / or ms of CPU)
static int engineMove(const Game *g, double nk, double ms, int *val) {
  int L[MAXMV], n = genMoves(&g->p, L);
  if (n == 1) { *val = 0; lastNodes = 0; lastDepth = 0; return L[0]; }
  loadRoot(g);
  setn(0, nk > 0 ? nk * 1000 : 1e300, 0); kclear(); tEndN = ms > 0 ? now() + ms : 1e300;
  ab_best(60); tEndN = 1e300;
  *val = IO[1]; lastNodes = getn(); lastDepth = IO[2];
  return IO[0];
}
static void enc(Rec *r, const P *p, int rule) {
  memset(r, 0, sizeof *r);
  for (int i = 0; i < N; i++) r->b[i >> 1] |= (u8)(((p->sq[i] & 7) | (p->cap[i] ? 8 : 0)) << (4 * (i & 1)));
  r->res = (u8)(p->res[1] | p->res[2] << 4); r->side = (u8)p->side; r->ply = (unsigned short)p->ply; r->rule = (u8)rule;
}
static void dec(const Rec *r, P *p) {
  memset(p, 0, sizeof *p);
  for (int i = 0; i < N; i++) { int x = (r->b[i >> 1] >> (4 * (i & 1))) & 15; p->sq[i] = (i8)(x & 7); p->cap[i] = (i8)(x >> 3); }
  p->res[1] = r->res & 15; p->res[2] = r->res >> 4; p->side = r->side; p->ply = r->ply;
}

// ---------------------------------------------------------------- self-play
static Rec GR[1024];
static int selfplay(int argc, char **argv) {
  if (argc < 6) return 1;
  FILE *out = fopen(argv[2], "ab"); if (!out) return 1;
  int games = atoi(argv[3]); double nk = atof(argv[4]); sr ^= (unsigned long long)atoll(argv[5]) * 0x9E3779B97F4A7C15ULL; rnd32(); rnd32();
  if (argc > 6 && argv[6][0]) { if (!loadNetFile(argv[6])) { fprintf(stderr, "net %s: not loaded\n", argv[6]); return 1; } }
  nn_use(NNOK);
  long pos = 0; double t0 = now(); static Game G;
  for (int gi = 0; gi < games; gi++) {
    const int rule = rnd32() % 5 == 0;   // (a fifth of the games the 1842 placement)
    newGame(&G, rule); ttclear();
    int n = 0, res = 0, R = 2 + rnd32() % 7;
    if (rule) R += 4 + rnd32() % 12;     // (the placements: varied longer)
    for (;;) {
      res = judgeG(&G); if (res) break;
      int m, v = 0;
      if (G.p.ply < R) {   // the opening: one of the moves within 80 of the best at depth 2, at random (at most 6)
        loadRoot(&G); setn(0, 1e300, 0); kclear(); int k = ab_values(2);
        int c = 0; while (c < k && c < 6 && AOV[c] >= AOV[0] - 80) c++;
        m = AOM[rnd32() % (unsigned)(c ? c : 1)];
      } else {
        m = engineMove(&G, nk, 0, &v);
        if (lastDepth > 0 && n < 1024) { enc(&GR[n], &G.p, rule); GR[n].v = (short)(v > 4000 ? 4000 : v < -4000 ? -4000 : v); n++; }
        if (G.p.ply < R + 30 && rnd32() % 10 == 0) {   // (variety: now and then another move close to the best at depth 3)
          loadRoot(&G); setn(0, 1e300, 0); kclear(); int k = ab_values(3);
          int c = 0; while (c < k && c < 4 && AOV[c] >= AOV[0] - 40) c++;
          if (c > 1) m = AOM[rnd32() % (unsigned)c];
        }
      }
      gplay(&G, m);
    }
    for (int i = 0; i < n; i++) GR[i].result = (signed char)(res == 3 ? 0 : res == GR[i].side + 1 ? 1 : -1);
    fwrite(GR, sizeof(Rec), (size_t)n, out); fflush(out); pos += n;
    if ((gi + 1) % 10 == 0) fprintf(stderr, "  %d games, %ld positions, %.1f positions/s\n", gi + 1, pos, pos / ((now() - t0) / 1e3));
  }
  fclose(out); return 0;
}

// ---------------------------------------------------------------- training (Adam on the logistic loss: σ((hand + out) / K)
// against λ · σ(search value / K) + (1 − λ) · result; K fitted to the hand-made evaluation first; each record seen in one of
// the board's 12 symmetries at random)
static int NH = 32, NP;
static float *PW;
#define O_B1 (NNF * NH)
#define O_W2 (O_B1 + NH)
#define O_B2 (O_W2 + NH)
static unsigned short f2h(float f) {
  union { float f; unsigned u; } x = { f }; unsigned s = (x.u >> 16) & 0x8000; int e = (int)((x.u >> 23) & 255) - 127 + 15; unsigned m = x.u & 0x7fffff;
  if (e >= 31) return (unsigned short)(s | 0x7bff);
  if (e <= 0) { if (e < -10) return (unsigned short)s; m |= 0x800000; int sh = 14 - e; unsigned r = m >> sh; if ((m >> (sh - 1)) & 1) r++; return (unsigned short)(s | r); }
  unsigned r = (unsigned)(e << 10) | (m >> 13); if (m & 0x1000) r++;
  return (unsigned short)(s | r);
}
static void saveNet(const char *fn, int ver, const float *W, int H) {
  FILE *f = fopen(fn, "wb"); unsigned hd[4] = { 0, (unsigned)ver, (unsigned)H, NNF }; memcpy(hd, "AGNN", 4); fwrite(hd, 4, 4, f);
  const int cnt = NNF * H + 2 * H + 1;
  for (int i = 0; i < cnt; i++) { unsigned short h = f2h(W[i]); fwrite(&h, 2, 1, f); }
  fclose(f);
}
static Rec *D; static long ND; static float LAMBDA = 0.5f, KS = 300.f;
static long *IDX;
typedef struct { long a, b; float *g; double loss; int cnt; unsigned long long seed; int sym; } Job;
static inline float sigm(float x) { return 1.f / (1.f + expf(-x)); }
static float target(const Rec *r) { float pv = sigm((float)r->v / KS), pr = r->result > 0 ? 1.f : r->result < 0 ? 0.f : .5f; return LAMBDA * pv + (1 - LAMBDA) * pr; }
static void *work(void *pj) {
  Job *J = pj; float *g = J->g; double loss = 0; unsigned long long s = J->seed | 1;
  for (long t = J->a; t < J->b; t++) {
    const Rec *r = &D[IDX ? IDX[t] : t]; P p0, p; dec(r, &p0);
    int hand = evaluate(&p0);   // (NNON is 0 while training: the hand-made evaluation)
    int sy = 0; if (J->sym) { s ^= s << 13; s ^= s >> 7; s ^= s << 17; sy = (int)((s >> 33) % 12); }
    p = p0; if (sy) for (int i = 0; i < N; i++) { p.sq[SYM[sy][i]] = p0.sq[i]; p.cap[SYM[sy][i]] = p0.cap[i]; }
    PLs ps; collect(&p, &ps); int F[40]; const int nf = nnFeat(&p, &ps, F);
    float acc[NNHMAX], hid[NNHMAX], o = PW[O_B2];
    for (int h = 0; h < NH; h++) acc[h] = PW[O_B1 + h];
    for (int j = 0; j < nf; j++) { const float *w = &PW[F[j] * NH]; for (int h = 0; h < NH; h++) acc[h] += w[h]; }
    for (int h = 0; h < NH; h++) { hid[h] = acc[h] < 0 ? 0 : acc[h] > 1 ? 1 : acc[h]; o += PW[O_W2 + h] * hid[h]; }
    float z = ((float)hand + 100.f * o) / KS, tt = target(r), pp = sigm(z);
    float pc = pp < 1e-6f ? 1e-6f : pp > 1 - 1e-6f ? 1 - 1e-6f : pp;
    loss += -(tt * logf(pc) + (1 - tt) * logf(1 - pc)) + (tt > 0 && tt < 1 ? tt * logf(tt) + (1 - tt) * logf(1 - tt) : 0);
    if (!g) continue;
    float d = (pp - tt) * 100.f / KS;
    g[O_B2] += d;
    float dh[NNHMAX];
    for (int h = 0; h < NH; h++) { g[O_W2 + h] += d * hid[h]; dh[h] = acc[h] > 0 && acc[h] < 1 ? d * PW[O_W2 + h] : 0; g[O_B1 + h] += dh[h]; }
    for (int j = 0; j < nf; j++) { float *w = &g[F[j] * NH]; for (int h = 0; h < NH; h++) w[h] += dh[h]; }
  }
  J->loss = loss; J->cnt = (int)(J->b - J->a);
  return 0;
}
static int NT = 4;
static double evalLoss(long a, long b) {
  pthread_t th[64]; Job J[64]; long n = b - a; long *keep = IDX; IDX = 0;
  for (int k = 0; k < NT; k++) { J[k].a = a + n * k / NT; J[k].b = a + n * (k + 1) / NT; J[k].g = 0; J[k].sym = 0; J[k].seed = 1; pthread_create(&th[k], 0, work, &J[k]); }
  double L = 0; for (int k = 0; k < NT; k++) { pthread_join(th[k], 0); L += J[k].loss; }
  IDX = keep; return L / (n > 0 ? n : 1);
}
static double fitK(long n) {   // K for σ(hand / K) against the results (draws ½)
  if (n > 500000) n = 500000;
  int *hv = malloc(n * sizeof(int)); float *rv = malloc(n * sizeof(float));
  for (long i = 0; i < n; i++) { long j = (long)((unsigned long long)i * (unsigned long long)ND / (unsigned long long)n); P p; dec(&D[j], &p); hv[i] = evaluate(&p); rv[i] = D[j].result > 0 ? 1.f : D[j].result < 0 ? 0.f : .5f; }
  double bestK = 300, bestL = 1e30;
  for (double K = 50; K <= 4000; K *= 1.05) {
    double L = 0; for (long i = 0; i < n; i++) { double p = 1 / (1 + exp(-hv[i] / K)); if (p < 1e-9) p = 1e-9; if (p > 1 - 1e-9) p = 1 - 1e-9; L -= rv[i] * log(p) + (1 - rv[i]) * log(1 - p); }
    if (L < bestL) { bestL = L; bestK = K; }
  }
  free(hv); free(rv); return bestK;
}
static int train(int argc, char **argv) {
  if (argc < 4) return 1;
  const char *outf = argv[2]; int epochs = 8, ver = (int)(time(0) / 60 % 100000000); float lr = 1e-3f; const char *init = 0;
  const char *files[256]; int nf = 0;
  for (int i = 3; i < argc; i++) {
    if (!strcmp(argv[i], "--epochs") && i + 1 < argc) epochs = atoi(argv[++i]);
    else if (!strcmp(argv[i], "--lambda") && i + 1 < argc) LAMBDA = (float)atof(argv[++i]);
    else if (!strcmp(argv[i], "--lr") && i + 1 < argc) lr = (float)atof(argv[++i]);
    else if (!strcmp(argv[i], "--threads") && i + 1 < argc) NT = atoi(argv[++i]);
    else if (!strcmp(argv[i], "--hidden") && i + 1 < argc) NH = atoi(argv[++i]);
    else if (!strcmp(argv[i], "--init") && i + 1 < argc) init = argv[++i];
    else if (!strcmp(argv[i], "--ver") && i + 1 < argc) ver = atoi(argv[++i]);
    else if (nf < 256) files[nf++] = argv[i];
  }
  if (NT < 1) NT = 1; if (NT > 64) NT = 64; if (NH < 1) NH = 1; if (NH > NNHMAX) NH = NNHMAX;
  long tot = 0; for (int i = 0; i < nf; i++) { FILE *f = fopen(files[i], "rb"); if (!f) continue; fseek(f, 0, SEEK_END); tot += ftell(f) / (long)sizeof(Rec); fclose(f); }
  D = malloc((size_t)(tot + 1) * sizeof(Rec)); ND = 0;
  for (int i = 0; i < nf; i++) { FILE *f = fopen(files[i], "rb"); if (!f) continue; ND += (long)fread(D + ND, sizeof(Rec), (size_t)(tot - ND), f); fclose(f); }
  long NV = ND / 50; if (NV > 400000) NV = 400000; long NTR = ND - NV;   // (the last records of each file's end: games not trained on)
  if (NTR < 1000) { fprintf(stderr, "too few records (%ld)\n", ND); return 1; }
  nn_use(0);
  if (init && loadNetFile(init)) NH = NNH;
  NP = NNF * NH + 2 * NH + 1;
  KS = (float)fitK(NTR);
  printf("records %ld (train %ld, check %ld), epochs %d, lambda %.2f, lr %g, threads %d, hidden %d, K %.0f\n", ND, NTR, NV, epochs, LAMBDA, lr, NT, NH, KS);
  PW = calloc(NP, sizeof(float)); float *M1 = calloc(NP, sizeof(float)), *M2 = calloc(NP, sizeof(float));
  if (init && NNOK) {
    for (int i = 0; i < NNF * NH; i++) PW[i] = NW1[i];
    for (int h = 0; h < NH; h++) { PW[O_B1 + h] = NB1[h]; PW[O_W2 + h] = NW2[h]; }
    PW[O_B2] = NB2; NNOK = 0; NNON = 0; printf("from %s\n", init);
  } else {   // (w2 = 0: the start is the hand-made evaluation exactly)
    sr = 12345; for (int i = 0; i < O_B1; i++) PW[i] = ((int)(rnd32() % 2001) - 1000) * 1e-4f;
    for (int h = 0; h < NH; h++) { PW[O_B1 + h] = 0.5f; PW[O_W2 + h] = 0; }
    PW[O_B2] = 0;
  }
  double base;
  { float *keep = PW; PW = calloc(NP, sizeof(float)); base = evalLoss(NTR, ND); free(PW); PW = keep; }
  printf("check loss: hand-made %.5f | start %.5f\n", base, evalLoss(NTR, ND)); fflush(stdout);
  IDX = malloc((size_t)NTR * sizeof(long));
  float *GT[64]; for (int k = 0; k < NT; k++) GT[k] = malloc(NP * sizeof(float));
  const int BS = 4096; long step = 0; double best = 1e9;
  char tmp[4096]; snprintf(tmp, sizeof tmp, "%s.best", outf);
  for (int ep = 0; ep < epochs; ep++) {
    for (long i = 0; i < NTR; i++) IDX[i] = i;
    for (long i = NTR - 1; i > 0; i--) { long j = (long)(((unsigned long long)rnd32() << 32 | rnd32()) % (unsigned long long)(i + 1)); long x = IDX[i]; IDX[i] = IDX[j]; IDX[j] = x; }
    float l = lr * (ep >= epochs * 0.85 ? 0.1f : ep >= epochs * 0.6 ? 0.3f : 1.f);
    double tl = 0; long tn = 0, t0 = time(0);
    for (long a = 0; a + BS <= NTR; a += BS) {
      pthread_t th[64]; Job J[64];
      for (int k = 0; k < NT; k++) { memset(GT[k], 0, NP * sizeof(float)); J[k].a = a + (long)BS * k / NT; J[k].b = a + (long)BS * (k + 1) / NT; J[k].g = GT[k]; J[k].sym = 1; J[k].seed = ((unsigned long long)rnd32() << 32) | rnd32(); pthread_create(&th[k], 0, work, &J[k]); }
      for (int k = 0; k < NT; k++) { pthread_join(th[k], 0); tl += J[k].loss; tn += J[k].cnt; }
      step++;
      float b1c = 1 - powf(0.9f, (float)step), b2c = 1 - powf(0.999f, (float)step);
      for (int i = 0; i < NP; i++) {
        float gg = 0; for (int k = 0; k < NT; k++) gg += GT[k][i]; gg /= BS;
        if (gg == 0 && i < O_B1) continue;   // (inputs not seen in this batch: left as they are)
        M1[i] = 0.9f * M1[i] + 0.1f * gg; M2[i] = 0.999f * M2[i] + 0.001f * gg * gg;
        PW[i] -= l * (M1[i] / b1c) / (sqrtf(M2[i] / b2c) + 1e-8f);
      }
    }
    double vl = evalLoss(NTR, ND);
    printf("epoch %d: train %.5f check %.5f (hand-made %.5f) %lds\n", ep + 1, tl / (tn ? tn : 1), vl, base, (long)(time(0) - t0)); fflush(stdout);
    if (vl < best) { best = vl; saveNet(tmp, ver, PW, NH); }
  }
  FILE *f = fopen(tmp, "rb"); if (f) { fclose(f); rename(tmp, outf); }
  printf("saved %s (version %d, hidden %d, check loss %.5f, hand-made %.5f)\n", outf, ver, NH, best, base);
  return 0;
}

// ---------------------------------------------------------------- the match: A against B
typedef struct { double nk, ms; int net; } Pl;
static Pl parsePl(const char *s) {
  Pl p = { 0, 0, 0 }; char b[256]; snprintf(b, sizeof b, "%s", s);
  for (char *t = strtok(b, ","); t; t = strtok(0, ",")) {
    if (!strncmp(t, "n=", 2)) p.nk = atof(t + 2); else if (!strncmp(t, "t=", 2)) p.ms = atof(t + 2); else if (!strncmp(t, "net=", 4)) p.net = atoi(t + 4);
  }
  if (!p.nk && !p.ms) p.nk = 20;
  return p;
}
static int match(int argc, char **argv) {
  if (argc < 6) return 1;
  Pl pl[2] = { parsePl(argv[2]), parsePl(argv[3]) }; int pairs = atoi(argv[4]), seed = atoi(argv[5]), part = 0, parts = 1;
  if (argc > 6) sscanf(argv[6], "%d/%d", &part, &parts);
  const char *nf = getenv("AG_NET"); if (nf && *nf && !loadNetFile(nf)) { fprintf(stderr, "AG_NET %s: not loaded\n", nf); return 1; }
  if ((pl[0].net || pl[1].net) && !NNOK) { fprintf(stderr, "net=1 needs AG_NET=net.bin\n"); return 1; }
  const int pre = getenv("PRE") ? atoi(getenv("PRE")) : 4, rule = getenv("RULE") ? atoi(getenv("RULE")) : 0;
  static Game G;
  for (int pr = part; pr < pairs; pr += parts) {
    unsigned long long s0 = (unsigned long long)(seed * 1000003 + pr) * 0x9E3779B97F4A7C15ULL + 1;
    for (int sw = 0; sw < 2; sw++) {
      sr = s0; rnd32();
      newGame(&G, rule);
      for (int k = 0; k < 2; k++) { T = TTA[k]; ttclear(); }
      double nd[2] = { 0, 0 }, dp[2] = { 0, 0 }; int cnt[2] = { 0, 0 }, res;
      for (;;) {
        res = judgeG(&G); if (res) break;
        int m, v;
        if (G.p.ply < pre) { int L[MAXMV], n = genMoves(&G.p, L); m = L[rnd32() % (unsigned)n]; }
        else {
          const int who = (G.p.side == 0) ^ sw ? 0 : 1;   // (sw 0: A is White)
          T = TTA[who]; nn_use(pl[who].net);
          m = engineMove(&G, pl[who].nk, pl[who].ms, &v);
          if (lastDepth) { nd[who] += lastNodes; dp[who] += lastDepth; cnt[who]++; }
        }
        gplay(&G, m);
      }
      const int aSide = sw ? 2 : 1;
      double a = res == 3 ? 0.5 : res == aSide ? 1 : 0;
      printf("{\"pair\":%d,\"aWhite\":%d,\"aWin\":%g,\"plies\":%d,\"depthA\":%.2f,\"depthB\":%.2f,\"nodesA\":%.0f,\"nodesB\":%.0f}\n", pr, !sw, a, G.p.ply,
        dp[0] / (cnt[0] ? cnt[0] : 1), dp[1] / (cnt[1] ? cnt[1] : 1), nd[0] / (cnt[0] ? cnt[0] : 1), nd[1] / (cnt[1] ? cnt[1] : 1));
      fflush(stdout);
    }
  }
  return 0;
}

// ---------------------------------------------------------------- checks
static void randPos(Game *g, int k, int plies) {   // a deterministic position: random moves from the start (either rule)
  sr = 1000 + (unsigned long long)k * 7919; rnd32();
  newGame(g, k % 3 == 0);
  for (int i = 0; i < plies && !judgeG(g); i++) { int L[MAXMV], n = genMoves(&g->p, L); gplay(g, L[rnd32() % (unsigned)n]); }
}
static int check(int argc, char **argv) {
  if (argc < 4 || !loadNetFile(argv[2])) { fprintf(stderr, "no net\n"); return 1; }
  FILE *o = fopen(argv[3], "w"); static Game G;
  for (int k = 0; k < 300; k++) {
    randPos(&G, k, 1 + k % 120);
    nn_use(1); int a = evaluate(&G.p); nn_use(0); int b = evaluate(&G.p);
    fprintf(o, "%d %d %d %d %d %d", a, b, G.p.side, G.p.ply, G.p.res[1], G.p.res[2]);
    for (int i = 0; i < N; i++) fprintf(o, " %d", G.p.sq[i] + (G.p.cap[i] ? 8 : 0));
    fprintf(o, "\n");
  }
  fclose(o); printf("wrote %s (version %d)\n", argv[3], nn_ver()); return 0;
}
static int speed(int argc, char **argv) {
  if (argc > 2 && !loadNetFile(argv[2])) { fprintf(stderr, "no net\n"); return 1; }
  static Game GS[20], G;
  for (int k = 0; k < 20; k++) randPos(&GS[k], 3 * k + 1, 8 + k * 3);
  for (int mode = 0; mode < (NNOK ? 2 : 1); mode++) {
    nn_use(mode); double t0 = now(); long n = 0; int x = 0;
    while (now() - t0 < 1000) for (int k = 0; k < 20; k++) for (int r = 0; r < 100; r++) { x += evaluate(&GS[k].p); n++; }
    double ev = n / ((now() - t0) / 1e3);
    double nodes = 0; t0 = now();
    for (int k = 0; k < 20; k++) { G = GS[k]; ttclear(); int v; engineMove(&G, 30, 0, &v); nodes += lastNodes; }
    printf("%s: %.0f evaluations/s, search %.0f nodes/s (%d)\n", mode ? "net      " : "hand-made", ev, nodes / ((now() - t0) / 1e3), x & 1);
  }
  return 0;
}
static int tojs(int argc, char **argv) {
  if (argc < 4) return 1;
  FILE *f = fopen(argv[2], "rb"); if (!f) return 1;
  static unsigned char b[1 << 20]; size_t n = fread(b, 1, sizeof b, f); fclose(f);
  if (!loadNetFile(argv[2])) { fprintf(stderr, "not a net\n"); return 1; }
  FILE *o = fopen(argv[3], "w"); static const char A[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  fprintf(o, "// the learned evaluation of the Agon AI (agon/MODEL_CARD.md「学習した評価」): made by tools/nnue/run.sh — do not edit\n// (an empty AG_NET: the engine keeps the hand-made evaluation)\nself.AG_NET_VER=%d;\nself.AG_NET='", nn_ver());
  for (size_t i = 0; i < n; i += 3) {
    unsigned v = b[i] << 16 | (i + 1 < n ? b[i + 1] << 8 : 0) | (i + 2 < n ? b[i + 2] : 0);
    fputc(A[v >> 18 & 63], o); fputc(A[v >> 12 & 63], o); fputc(i + 1 < n ? A[v >> 6 & 63] : '=', o); fputc(i + 2 < n ? A[v & 63] : '=', o);
  }
  fprintf(o, "';\n"); fclose(o); printf("wrote %s (%zu bytes of net)\n", argv[3], n); return 0;
}
static int zero(int argc, char **argv) {   // a net with w2 = 0 (random first layer): the hand-made evaluation, for the checks
  if (argc < 3) return 1;
  NH = argc > 3 ? atoi(argv[3]) : 32; NP = NNF * NH + 2 * NH + 1; float *W = calloc(NP, sizeof(float));
  sr = 7; for (int i = 0; i < NNF * NH; i++) W[i] = ((int)(rnd32() % 2001) - 1000) * 1e-3f;
  for (int h = 0; h < NH; h++) W[NNF * NH + h] = 0.5f;
  if (argc > 4) { for (int h = 0; h < NH; h++) W[NNF * NH + NH + h] = ((int)(rnd32() % 2001) - 1000) * 1e-3f; W[NP - 1] = 0.1f; }   // (a random net: "zero out.bin H 1")
  saveNet(argv[2], 1, W, NH); printf("wrote %s (hidden %d)\n", argv[2], NH); return 0;
}
static int depthTest(int argc, char **argv) {   // nn depth <D>: nodes to depth D on 40 positions (search experiments)
  int D = argc > 2 ? atoi(argv[2]) : 7, o = 0;
  static Game G; double tot = 0, lt = 0; int same = 0;
  for (int k = 0; k < 40; k++) {
    randPos(&G, 11 * k + 5, 20 + k * 3); if (judgeG(&G)) continue;
    loadRoot(&G); setn(0, 1e300, 0); kclear(); ttclear(); ab_best(D); tot += getn(); lt += log(getn() + 1);
    printf("%d %d %d %.0f\n", k, IO[0], IO[1], getn());
  }
  printf("opt %d depth %d: nodes %.0f, geo mean %.0f\n", o, D, tot, exp(lt / 40)); (void)same; return 0;
}
int main(int argc, char **argv) {
  initAll();
  if (argc < 2) { fprintf(stderr, "nn selfplay|train|match|check|speed|tojs|zero …\n"); return 1; }
  if (!strcmp(argv[1], "selfplay")) return selfplay(argc, argv);
  if (!strcmp(argv[1], "train")) return train(argc, argv);
  if (!strcmp(argv[1], "match")) return match(argc, argv);
  if (!strcmp(argv[1], "check")) return check(argc, argv);
  if (!strcmp(argv[1], "speed")) return speed(argc, argv);
  if (!strcmp(argv[1], "tojs")) return tojs(argc, argv);
  if (!strcmp(argv[1], "zero")) return zero(argc, argv);
  if (!strcmp(argv[1], "depth")) return depthTest(argc, argv);
  return 1;
}
