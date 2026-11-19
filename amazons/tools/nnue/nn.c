// Amazons: the learned evaluation's tools (2026-11-20, amazons/MODEL_CARD.md「学習した評価」). One program, run by run.sh:
//   nn selfplay <out.bin> <games> <nk> <seed> [net.bin]   self-play of the engine's MCTS (the teacher: v3, or the net given),
//                                                          every position with the search's value and the game's result
//   nn train <out.bin> <data.bin>... [--epochs E] [--lambda L] [--lr R] [--threads T] [--init net.bin] [--ver V]
//   nn check <net.bin> <out.txt>                           values of fixed positions (tools/nnue/check_net.js: the same in wasm)
//   nn speed [net.bin]                                     evaluations per second, v3 and the net
//   nn tojs <net.bin> <out.js>                             amazons/net.js (base64)
// Build: cc -O3 -ffp-contract=off -DNATIVE -DNATIVE_TLS -w -o nn amazons/tools/nnue/nn.c -lm -lpthread
// A record (32 bytes): the board (100 squares × 2 bits: 0 empty, 1 White, 2 Black, 3 arrow), the side to move (1 / 2), the
// search's value for the side to move (the evaluation's units: 100 = one square; σ(v / 400) = its expected score), the result
// for the side to move (+1 / −1), the ply.
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <math.h>
#include <pthread.h>
#include "../../core.c"
double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec * 1e3 + t.tv_nsec / 1e6; }
typedef struct { u8 b[25]; u8 side; short v; signed char res; u8 ply; u8 pad[2]; } Rec;
_Static_assert(sizeof(Rec) == 32, "record");
static void enc(Rec *r, int side) { memset(r, 0, sizeof *r); for (int i = 0; i < NN; i++) r->b[i >> 2] |= (u8)((SQ[i] & 3) << (2 * (i & 3))); r->side = (u8)side; }
static int dec(const Rec *r) {   // → SQ / Q; the side to move
  int na = 0, nb = 4;
  for (int k = 0; k < 8; k++) Q[k] = -1;
  for (int i = 0; i < NN; i++) { int v = (r->b[i >> 2] >> (2 * (i & 3))) & 3; SQ[i] = (i8)v; if (v == 1 && na < 4) Q[na++] = (i8)i; else if (v == 2 && nb < 8) Q[nb++] = (i8)i; }
  return r->side;
}
static int loadNet(const char *fn) {
  FILE *f = fopen(fn, "rb"); if (!f) return 0;
  size_t n = fread(NNBUF, 1, sizeof NNBUF, f); fclose(f);
  return nn_load((int)n);
}
static void startPos(void) {
  memset(SQ, 0, NN); const int ws[4] = { 60, 93, 96, 69 }, bs[4] = { 30, 3, 6, 39 };   // a4 d1 g1 j4 / a7 d10 g10 j7
  for (int k = 0; k < 4; k++) { SQ[ws[k]] = 1; Q[k] = (i8)ws[k]; SQ[bs[k]] = 2; Q[4 + k] = (i8)bs[k]; }
}
static unsigned long long sr = 88172645463325252ULL;
static unsigned rnd32(void) { sr ^= sr << 13; sr ^= sr >> 7; sr ^= sr << 17; return (unsigned)(sr >> 32); }

// ---------------------------------------------------------------- self-play
static Rec G[400];
static int selfplay(int argc, char **argv) {
  if (argc < 6) return 1;
  FILE *out = fopen(argv[2], "ab"); int games = atoi(argv[3]); double nk = atof(argv[4]); sr ^= (unsigned long long)atoll(argv[5]) * 0x9E3779B97F4A7C15ULL; rnd32();
  int tev = 2;
  if (argc > 6 && argv[6][0]) { if (!loadNet(argv[6])) { fprintf(stderr, "net %s: not loaded\n", argv[6]); return 1; } tev = 3; }
  // the MCTS as engine.js MC (the core's defaults) with fin 0.5 and the count of separated boards
  mcts_set(17, 0.5f); mcts_set(18, 500);
  int want = (int)(nk * 1000 / 200 * 24 * 1.3); if (want < 65536) want = 65536; if (want > (1 << 22)) want = 1 << 22;
  mcts_alloc(want);
  long pos = 0; double t0 = now();
  for (int g = 0; g < games; g++) {
    startPos(); int side = 1, n = 0, res = 0, R = 2 + rnd32() % 7;
    for (int ply = 0; ply < 300; ply++) {
      if (!canMove(side)) { res = 3 - side; break; }
      if (ply >= R) { i8 s0[NN]; memcpy(s0, SQ, NN); int r = sepProve(side, 20000); memcpy(SQ, s0, NN); if (r) { res = r > 0 ? side : 3 - side; break; } }
      int m; if (getenv("DBG")) fprintf(stderr, "g %d ply %d %.0f\n", g, ply, now() - t0);
      if (ply < R) {   // the opening: one of the best 10 candidates (v3), at random
        ev_set(-1, 2); int k = cand(side, 14, 0); evn = 0; topK(k, k < 10 ? k : 10); m = OM[rnd32() % (unsigned)(k < 10 ? k : 10)];
      } else {
        ev_set(-1, tev); ev_reset();
        i8 s0[NN], q0[8]; memcpy(s0, SQ, NN); memcpy(q0, Q, 8);
        m = sep_best(side, 20000); memcpy(SQ, s0, NN); memcpy(Q, q0, 8);
        int v = 0;
        if (!m) {
          mcts_limit(0); mcts_set(16, 0); mcts_begin(side, (int)rnd32()); mcts_run(0, nk * 1000, 0);
          int c = mcts_out(); if (!c) { res = 3 - side; break; }
          int pick = 0;
          if (ply < R + 12 && c > 1 && rnd32() % 4 == 0) {   // (variety: now and then another well-visited move)
            int ok[64], no = 0; for (int i = 0; i < c; i++) if (RN[i] * 2 >= RN[0] && RV[i] > -3000) ok[no++] = i;
            pick = ok[rnd32() % (unsigned)no];
          }
          m = RM[pick]; v = RV[pick];
          memcpy(SQ, s0, NN); memcpy(Q, q0, 8);
          if (n < 400) { enc(&G[n], side); G[n].v = (short)(v > 4000 ? 4000 : v < -4000 ? -4000 : v); G[n].ply = (u8)ply; n++; }
        }
      }
      playM(m); side = 3 - side;
    }
    for (int i = 0; i < n; i++) G[i].res = (signed char)(res == 0 ? 0 : res == G[i].side ? 1 : -1);
    fwrite(G, sizeof(Rec), (size_t)n, out); fflush(out); pos += n;
    if ((g + 1) % 20 == 0) fprintf(stderr, "  %d games, %ld positions, %.1f positions/s\n", g + 1, pos, pos / ((now() - t0) / 1e3));
  }
  fclose(out); return 0;
}

// ---------------------------------------------------------------- training (Adam on the logistic loss: σ(out / 4) against
// λ · σ(search value / 400) + (1 − λ) · result; out in squares as nnOut)
#define NP NNW
static float *PW_;   // the parameters in the file's order
#define P_W1(i, h) PW_[(i) * NH + (h)]
#define O_B1 (NSYM * NCAT * NH)
#define O_WD1 (O_B1 + NH)
#define O_W2 (O_WD1 + NDN * NH)
#define O_WD2 (O_W2 + NH)
#define O_B2 (O_WD2 + NDN)
static void toNet(void) {   // PW_ → the engine's arrays (to evaluate with the core)
  for (int i = 0; i < NSYM * NCAT; i++) for (int h = 0; h < NH; h++) NW1[i][h] = P_W1(i, h);
  for (int h = 0; h < NH; h++) { NB1[h] = PW_[O_B1 + h]; NW2[h] = PW_[O_W2 + h]; }
  for (int j = 0; j < NDN; j++) { for (int h = 0; h < NH; h++) NWD1[j][h] = PW_[O_WD1 + j * NH + h]; NWD2[j] = PW_[O_WD2 + j]; }
  NB2 = PW_[O_B2]; NNOK = 1;
}
static unsigned short f2h(float f) {
  union { float f; unsigned u; } x = { f }; unsigned s = (x.u >> 16) & 0x8000; int e = (int)((x.u >> 23) & 255) - 127 + 15; unsigned m = x.u & 0x7fffff;
  if (e >= 31) return (unsigned short)(s | 0x7bff);
  if (e <= 0) { if (e < -10) return (unsigned short)s; m |= 0x800000; int sh = 14 - e; unsigned r = m >> sh; if ((m >> (sh - 1)) & 1) r++; return (unsigned short)(s | r); }
  unsigned r = (unsigned)(e << 10) | (m >> 13); if (m & 0x1000) r++;   // (round half up; a carry moves into the exponent correctly)
  return (unsigned short)(s | r);
}
static void saveNet(const char *fn, int ver) {
  FILE *f = fopen(fn, "wb"); unsigned hd[3]; memcpy(hd, "AMZN", 4); hd[1] = (unsigned)ver; hd[2] = NNW; fwrite(hd, 4, 3, f);
  for (int i = 0; i < NP; i++) { unsigned short h = f2h(PW_[i]); fwrite(&h, 2, 1, f); }
  fclose(f);
}
static Rec *D; static long ND, NV; static float LAMBDA = 0.5f;
static long *IDX;
typedef struct { long a, b; float *g; double loss; int cnt; } Job;
static float target(const Rec *r) { float pv = 1.f / (1.f + expf(-(float)r->v / 400.f)), pr = r->res > 0 ? 1.f : r->res < 0 ? 0.f : .5f; return LAMBDA * pv + (1 - LAMBDA) * pr; }
static int TRAINV3 = 0;   // (the loss of v3 itself: the baseline)
static void *work(void *p) {
  Job *J = p; float *g = J->g; double loss = 0;
  ev_set(-1, 3); NNFEAT = 1; int ok = NNOK; NNOK = 0;   // (the features only; the forward pass below)
  (void)ok;
  for (long t = J->a; t < J->b; t++) {
    const Rec *r = &D[IDX ? IDX[t] : t]; int side = dec(r);
    int v3 = ev(side, side);
    float acc[NH], hid[NH], o = PW_[O_B2];
    for (int h = 0; h < NH; h++) acc[h] = PW_[O_B1 + h];
    for (int i = 0; i < NFN; i++) { const float *w = &P_W1(NFI[i], 0); for (int h = 0; h < NH; h++) acc[h] += w[h]; }
    for (int j = 0; j < NDN; j++) { float x = NFD[j] * NDS; for (int h = 0; h < NH; h++) acc[h] += x * PW_[O_WD1 + j * NH + h]; }
    for (int j = 0; j < NDN; j++) o += PW_[O_WD2 + j] * NFD[j];
    for (int h = 0; h < NH; h++) { hid[h] = acc[h] < 0 ? 0 : acc[h] > 1 ? 1 : acc[h]; o += PW_[O_W2 + h] * hid[h]; }
    if (TRAINV3) o = v3 / 100.f;
    float tt = target(r), pp = 1.f / (1.f + expf(-o / 4.f));
    float pc_ = pp < 1e-6f ? 1e-6f : pp > 1 - 1e-6f ? 1 - 1e-6f : pp;
    loss += -(tt * logf(pc_) + (1 - tt) * logf(1 - pc_)) + (tt > 0 && tt < 1 ? tt * logf(tt) + (1 - tt) * logf(1 - tt) : 0);
    if (!g) continue;
    float d = (pp - tt) / 4.f;
    g[O_B2] += d;
    for (int j = 0; j < NDN; j++) g[O_WD2 + j] += d * NFD[j];
    float dh[NH];
    for (int h = 0; h < NH; h++) { g[O_W2 + h] += d * hid[h]; dh[h] = acc[h] > 0 && acc[h] < 1 ? d * PW_[O_W2 + h] : 0; g[O_B1 + h] += dh[h]; }
    for (int i = 0; i < NFN; i++) { float *w = &g[NFI[i] * NH]; for (int h = 0; h < NH; h++) w[h] += dh[h]; }
    for (int j = 0; j < NDN; j++) { float x = NFD[j] * NDS; for (int h = 0; h < NH; h++) g[O_WD1 + j * NH + h] += x * dh[h]; }
  }
  J->loss = loss; J->cnt = (int)(J->b - J->a);
  return 0;
}
static int NT = 4;
static double evalLoss(long a, long b) {   // the mean loss over records a…b (no gradient), on NT threads
  pthread_t th[64]; Job J[64]; long n = b - a; long *keep = IDX; IDX = 0;
  for (int k = 0; k < NT; k++) { J[k].a = a + n * k / NT; J[k].b = a + n * (k + 1) / NT; J[k].g = 0; pthread_create(&th[k], 0, work, &J[k]); }
  double L = 0; for (int k = 0; k < NT; k++) { pthread_join(th[k], 0); L += J[k].loss; }
  IDX = keep; return L / (n > 0 ? n : 1);
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
    else if (!strcmp(argv[i], "--init") && i + 1 < argc) init = argv[++i];
    else if (!strcmp(argv[i], "--ver") && i + 1 < argc) ver = atoi(argv[++i]);
    else if (nf < 256) files[nf++] = argv[i];
  }
  if (NT < 1) NT = 1; if (NT > 64) NT = 64;
  long tot = 0; for (int i = 0; i < nf; i++) { FILE *f = fopen(files[i], "rb"); if (!f) continue; fseek(f, 0, SEEK_END); tot += ftell(f) / 32; fclose(f); }
  D = malloc((size_t)tot * sizeof(Rec)); ND = 0;
  for (int i = 0; i < nf; i++) { FILE *f = fopen(files[i], "rb"); if (!f) continue; ND += (long)fread(D + ND, sizeof(Rec), (size_t)(tot - ND), f); fclose(f); }
  NV = ND / 50; if (NV > 400000) NV = 400000; long NTR = ND - NV;   // (the last records: games not trained on)
  printf("records %ld (train %ld, check %ld), epochs %d, lambda %.2f, lr %g, threads %d\n", ND, NTR, NV, epochs, LAMBDA, lr, NT);
  if (NTR < 1000) { fprintf(stderr, "too few records\n"); return 1; }
  PW_ = calloc(NP, sizeof(float)); float *M1 = calloc(NP, sizeof(float)), *M2 = calloc(NP, sizeof(float));
  if (init && loadNet(init)) {   // (from a net: the next round)
    for (int i = 0; i < NSYM * NCAT; i++) for (int h = 0; h < NH; h++) P_W1(i, h) = NW1[i][h];
    for (int h = 0; h < NH; h++) { PW_[O_B1 + h] = NB1[h]; PW_[O_W2 + h] = NW2[h]; }
    for (int j = 0; j < NDN; j++) { for (int h = 0; h < NH; h++) PW_[O_WD1 + j * NH + h] = NWD1[j][h]; PW_[O_WD2 + j] = NWD2[j]; }
    PW_[O_B2] = NB2; NNOK = 0; printf("from %s\n", init);
  } else {
    sr = 12345; for (int i = 0; i < O_B1; i++) PW_[i] = ((int)(rnd32() % 2001) - 1000) * 1e-5f;
    for (int h = 0; h < NH; h++) { PW_[O_B1 + h] = 0.5f; PW_[O_W2 + h] = ((int)(rnd32() % 2001) - 1000) * 1e-5f; }
    for (int i = 0; i < NDN * NH; i++) PW_[O_WD1 + i] = ((int)(rnd32() % 2001) - 1000) * 1e-4f;
    const float v3[NDN] = { 2, -1, 0.85f, 0.7f, 0.6f, 1, 0, 0 }; for (int j = 0; j < NDN; j++) PW_[O_WD2 + j] = v3[j];
  }
  TRAINV3 = 1; double base = evalLoss(NTR, ND); TRAINV3 = 0;
  printf("check loss: v3 %.5f | start %.5f\n", base, evalLoss(NTR, ND)); fflush(stdout);
  IDX = malloc((size_t)NTR * sizeof(long));
  float *GT[64]; for (int k = 0; k < NT; k++) GT[k] = malloc(NP * sizeof(float));
  float *GS = malloc(NP * sizeof(float));
  const int BS = 4096; long step = 0; double best = 1e9;
  char tmp[4096]; snprintf(tmp, sizeof tmp, "%s.best", outf);
  for (int ep = 0; ep < epochs; ep++) {
    for (long i = 0; i < NTR; i++) IDX[i] = i;
    for (long i = NTR - 1; i > 0; i--) { long j = (long)(((unsigned long long)rnd32() << 32 | rnd32()) % (unsigned long long)(i + 1)); long x = IDX[i]; IDX[i] = IDX[j]; IDX[j] = x; }
    float l = lr * (ep >= epochs * 0.85 ? 0.1f : ep >= epochs * 0.6 ? 0.3f : 1.f);
    double tl = 0; long tn = 0, t0 = time(0);
    for (long a = 0; a + BS <= NTR; a += BS) {
      pthread_t th[64]; Job J[64];
      for (int k = 0; k < NT; k++) { memset(GT[k], 0, NP * sizeof(float)); J[k].a = a + (long)BS * k / NT; J[k].b = a + (long)BS * (k + 1) / NT; J[k].g = GT[k]; pthread_create(&th[k], 0, work, &J[k]); }
      for (int k = 0; k < NT; k++) { pthread_join(th[k], 0); tl += J[k].loss; tn += J[k].cnt; }
      step++;
      float b1c = 1 - powf(0.9f, (float)step), b2c = 1 - powf(0.999f, (float)step);
      for (int i = 0; i < NP; i++) {
        float gg = 0; for (int k = 0; k < NT; k++) gg += GT[k][i]; gg /= BS;
        if (gg == 0 && i < O_B1) continue;   // (rows not seen in this batch: left as they are)
        M1[i] = 0.9f * M1[i] + 0.1f * gg; M2[i] = 0.999f * M2[i] + 0.001f * gg * gg;
        PW_[i] -= l * (M1[i] / b1c) / (sqrtf(M2[i] / b2c) + 1e-8f);
      }
    }
    double vl = evalLoss(NTR, ND);
    printf("epoch %d: train %.5f check %.5f (v3 %.5f) %lds\n", ep + 1, tl / (tn ? tn : 1), vl, base, (long)(time(0) - t0)); fflush(stdout);
    if (vl < best) { best = vl; saveNet(tmp, ver); }
  }
  // the best epoch on the check records (as float16, the file the engine reads)
  FILE *f = fopen(tmp, "rb"); if (f) { fclose(f); rename(tmp, outf); }
  printf("saved %s (version %d, check loss %.5f, v3 %.5f)\n", outf, ver, best, base);
  (void)GS; return 0;
}
// ---------------------------------------------------------------- checks
static void randPos(int g, int plies) {   // a deterministic position: plies moves from the start, each one of the best few (v3)
  startPos(); sr = 1000 + (unsigned long long)g * 7919; int side = 1;
  ev_set(-1, 2);
  for (int p = 0; p < plies; p++) { int k = cand(side, 6, 0); evn = 0; if (!k) break; topK(k, k < 6 ? k : 6); playM(OM[rnd32() % (unsigned)(k < 6 ? k : 6)]); side = 3 - side; }
}
static int check(int argc, char **argv) {
  if (argc < 4 || !loadNet(argv[2])) { fprintf(stderr, "no net\n"); return 1; }
  FILE *o = fopen(argv[3], "w");
  for (int g = 0; g < 60; g++) {
    randPos(g, 4 + g % 50);
    ev_set(-1, 3); int a = ev(1, 1), b = ev(1, 2), c = ev(2, 1);
    ev_set(-1, 2); int d = ev(1, 1);
    fprintf(o, "%d %d %d %d %d", g, a, b, c, d);
    for (int i = 0; i < NN; i++) fprintf(o, " %d", SQ[i]);
    fprintf(o, "\n");
  }
  fclose(o); printf("wrote %s (version %d)\n", argv[3], nn_ver()); return 0;
}
static int speed(int argc, char **argv) {
  if (argc > 2) loadNet(argv[2]);
  static i8 PS[20][NN], PQ_[20][8];
  for (int g = 0; g < 20; g++) { randPos(g, 10 + g * 2); memcpy(PS[g], SQ, NN); memcpy(PQ_[g], Q, 8); }
  for (int mode = 2; mode <= 3; mode++) {
    ev_set(-1, mode); double t0 = now(); long n = 0; int x = 0;
    while (now() - t0 < 1500) { for (int g = 0; g < 20; g++) { memcpy(SQ, PS[g], NN); memcpy(Q, PQ_[g], 8); for (int r = 0; r < 200; r++) { x += ev(1, 1 + (r & 1)); n++; } } }
    printf("%s: %.0f evaluations/s (%d)\n", mode == 2 ? "v3 " : (NNOK ? "net" : "v3 (no net)"), n / ((now() - t0) / 1e3), x & 1);
  }
  return 0;
}
static int tojs(int argc, char **argv) {
  if (argc < 4) return 1;
  FILE *f = fopen(argv[2], "rb"); if (!f) return 1;
  static unsigned char b[1 << 20]; size_t n = fread(b, 1, sizeof b, f); fclose(f);
  if (!loadNet(argv[2])) { fprintf(stderr, "not a net\n"); return 1; }
  FILE *o = fopen(argv[3], "w"); static const char A[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  fprintf(o, "// the learned evaluation of the Amazons AI (amazons/MODEL_CARD.md「学習した評価」): made by tools/nnue/run.sh — do not edit\n// (an empty AMZ_NET: the engine keeps the evaluation v3)\nself.AMZ_NET_VER=%d;\nself.AMZ_NET='", nn_ver());
  for (size_t i = 0; i < n; i += 3) {
    unsigned v = b[i] << 16 | (i + 1 < n ? b[i + 1] << 8 : 0) | (i + 2 < n ? b[i + 2] : 0);
    fputc(A[v >> 18 & 63], o); fputc(A[v >> 12 & 63], o); fputc(i + 1 < n ? A[v >> 6 & 63] : '=', o); fputc(i + 2 < n ? A[v & 63] : '=', o);
  }
  fprintf(o, "';\n"); fclose(o); printf("wrote %s (%zu bytes of net)\n", argv[3], n); return 0;
}
int main(int argc, char **argv) {
  init(); initBB();
  if (argc < 2) { fprintf(stderr, "nn selfplay|train|check|speed|tojs …\n"); return 1; }
  if (!strcmp(argv[1], "selfplay")) return selfplay(argc, argv);
  if (!strcmp(argv[1], "train")) return train(argc, argv);
  if (!strcmp(argv[1], "check")) return check(argc, argv);
  if (!strcmp(argv[1], "speed")) return speed(argc, argv);
  if (!strcmp(argv[1], "tojs")) return tojs(argc, argv);
  return 1;
}
