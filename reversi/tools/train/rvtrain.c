// Training of the Reversi pattern evaluation (weights.bin for engine.js, pattern set B + 4 mobility features, 30 phases).
//
//   cc -O3 -march=native -pthread -o rvtrain rvtrain.c -lz        (macOS: cc -O3 -mcpu=native …)
//
//   1) rvtrain extract positions.bin [options] <sources…>
//        --pairs <file|dir>   Egaroucid "Training Data" (lines: 64 chars X/O/- from a1, a space, the score for X)
//        --games <file|dir>   transcripts (lines: f5d6… moves); the final disc difference is the target
//        --skip N             transcripts: leave out the first N plies of every game (the random opening);
//                             "--skip auto" reads N from the last number in the folder / file path (e.g. …/0012/…)
//        --frac F             transcripts: keep each remaining position with probability F (default 0.25)
//        --max-games N        transcripts: stop after N games per source
//      Sources are processed in order; options apply to the sources after them. Output: 17 bytes per position
//      (player bits, opponent bits, signed target), appended.
//   2) rvtrain train positions.bin… --out weights.bin [--init old_weights.bin.gz] [--iters 300] [--threads N] [--val 0.02]
//        Per phase, least squares on the positions of that phase and the plies next to it (as in the original training),
//        with the gradient of each weight normalised by how often its feature occurs. Writes int16 weights (1/32 disc),
//        30 phases concatenated: gzip -9 the result into reversi/weights.bin.gz.
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <math.h>
#include <dirent.h>
#include <sys/stat.h>
#include <pthread.h>
#include <zlib.h>
#include "patterns.h"
typedef uint64_t u64;
#define NEXT 4
#define NF (NINST + NEXT + 1)   // features per position (the last = bias)

static inline int pc(u64 x) { return __builtin_popcountll(x); }
static u64 genMoves(u64 P, u64 O) {
  const u64 E = ~(P | O), I = O & 0x7E7E7E7E7E7E7E7EULL; u64 m = 0, x;
#define GM(SH, MSK) x = SH(P) & MSK; x |= SH(x) & MSK; x |= SH(x) & MSK; x |= SH(x) & MSK; x |= SH(x) & MSK; x |= SH(x) & MSK; m |= SH(x) & E;
#define L1(v) ((v) << 1)
#define R1(v) ((v) >> 1)
#define L8(v) ((v) << 8)
#define R8(v) ((v) >> 8)
#define L9(v) ((v) << 9)
#define R9(v) ((v) >> 9)
#define L7(v) ((v) << 7)
#define R7(v) ((v) >> 7)
  GM(L1, I) GM(R1, I) GM(L8, O) GM(R8, O) GM(L9, I) GM(R9, I) GM(L7, I) GM(R7, I)
  return m;
}
static u64 flips(int sq, u64 P, u64 O) {
  const u64 m = 1ULL << sq, I = O & 0x7E7E7E7E7E7E7E7EULL; u64 f = 0, x;
#define FL(SH, MSK) x = SH(m) & MSK; x |= SH(x) & MSK; x |= SH(x) & MSK; x |= SH(x) & MSK; x |= SH(x) & MSK; x |= SH(x) & MSK; if (SH(x) & P) f |= x;
  FL(L1, I) FL(R1, I) FL(L8, O) FL(R8, O) FL(L9, I) FL(R9, I) FL(L7, I) FL(R7, I)
  return f;
}
static u64 neighbours(u64 b) {
  const u64 a = b & 0x7F7F7F7F7F7F7F7FULL, c = b & 0xFEFEFEFEFEFEFEFEULL;
  return (a << 1) | (c >> 1) | (b << 8) | (b >> 8) | (a << 9) | (c << 7) | (a >> 7) | (c >> 9);
}
static int phaseOf(int discs) { int ply = discs - 4, ph = ply * NPHASE / 61; return ph < NPHASE ? ph : NPHASE - 1; }
static const int POW3[11] = { 1, 3, 9, 27, 81, 243, 729, 2187, 6561, 19683, 59049 };
// feature indices of a position (P to move), as engine.js evalPattern: within the phase's table
static void features(u64 P, u64 O, uint32_t *f) {
  for (int i = 0; i < NINST; i++) {
    int idx = 0, n = I_LEN[i];
    for (int k = 0; k < n; k++) { int s = I_SQ[i][k]; idx = idx * 3 + ((P >> s) & 1 ? 1 : (O >> s) & 1 ? 2 : 0); }
    f[i] = I_OFF[i] + idx;
  }
  u64 e = ~(P | O);
  f[NINST] = EXT_OFF + pc(genMoves(P, O)); f[NINST + 1] = EXT_OFF + 64 + pc(genMoves(O, P));
  f[NINST + 2] = EXT_OFF + 128 + pc(neighbours(O) & e); f[NINST + 3] = EXT_OFF + 192 + pc(neighbours(P) & e);
  f[NINST + 4] = PHASE_SIZE - 1;
}

// ------------------------------------------------------------------ extract
typedef struct __attribute__((packed)) { u64 P, O; int8_t t; } Rec;
static FILE *OUT; static long nOut;
static double FRAC = 0.25; static int SKIP = 0, SKIP_AUTO = 0; static long MAXG = 0;
static uint64_t rng = 88172645463325252ULL;
static double rnd(void) { rng ^= rng << 13; rng ^= rng >> 7; rng ^= rng << 17; return (rng >> 11) * (1.0 / 9007199254740992.0); }
static void put(u64 P, u64 O, int t) { Rec r = { P, O, (int8_t)(t > 64 ? 64 : t < -64 ? -64 : t) }; fwrite(&r, sizeof r, 1, OUT); nOut++; }
static int lastNumber(const char *p) {
  int v = -1; for (const char *q = p; *q; q++) if (*q >= '0' && *q <= '9') { int n = 0; while (*q >= '0' && *q <= '9') n = n * 10 + (*q++ - '0'); v = n; q--; }
  return v;
}
static long gamesDone;
static void doPairsFile(const char *fn) {
  FILE *f = fopen(fn, "r"); if (!f) return; char line[256];
  while (fgets(line, sizeof line, f)) {
    if (strlen(line) < 66) continue;
    u64 P = 0, O = 0; for (int i = 0; i < 64; i++) { if (line[i] == 'X') P |= 1ULL << i; else if (line[i] == 'O') O |= 1ULL << i; }
    put(P, O, atoi(line + 65));
  }
  fclose(f);
}
static void doGamesFile(const char *fn, int skip) {
  FILE *f = fopen(fn, "r"); if (!f) return; char line[512];
  u64 hp[64], ho[64]; int side[64];
  while (fgets(line, sizeof line, f)) {
    if (MAXG && gamesDone >= MAXG) break;
    u64 B = 0x0000000810000000ULL, W = 0x0000001008000000ULL;   // black e4 d5, white d4 e5
    int turn = 0, n = 0, ok = 1;   // turn 0 black
    for (char *q = line; q[0] && q[1]; q += 2) {
      int c = (q[0] | 32) - 'a', r = q[1] - '1';
      if (c < 0 || c > 7 || r < 0 || r > 7) break;
      int s = r * 8 + c;
      u64 *P = turn ? &W : &B, *O = turn ? &B : &W;
      if (!(genMoves(*P, *O) & (1ULL << s))) {   // a pass
        turn ^= 1; P = turn ? &W : &B; O = turn ? &B : &W;
        if (!(genMoves(*P, *O) & (1ULL << s))) { ok = 0; break; }
      }
      hp[n] = *P; ho[n] = *O; side[n] = turn; n++;
      u64 fl = flips(s, *P, *O); *P |= fl | (1ULL << s); *O &= ~fl; turn ^= 1;
    }
    if (!ok || n < 2) continue;
    int b = pc(B), w = pc(W), e = 64 - b - w, d = b - w; d = d > 0 ? d + e : d < 0 ? d - e : 0;   // empties to the winner
    for (int i = skip; i < n; i++) if (rnd() < FRAC) put(hp[i], ho[i], side[i] ? -d : d);
    gamesDone++;
  }
  fclose(f);
}
static void walk(const char *path, int games) {
  struct stat st; if (stat(path, &st)) { fprintf(stderr, "cannot open %s\n", path); return; }
  if (S_ISDIR(st.st_mode)) {
    struct dirent **list; int n = scandir(path, &list, NULL, alphasort);
    for (int i = 0; i < n; i++) {
      if (list[i]->d_name[0] != '.') { char sub[4096]; snprintf(sub, sizeof sub, "%s/%s", path, list[i]->d_name); walk(sub, games); }
      free(list[i]);
    }
    free(list); return;
  }
  if (!strstr(path, ".txt")) return;
  if (games) { int sk = SKIP_AUTO ? lastNumber(path) : SKIP; if (SKIP_AUTO) { char d[4096]; strncpy(d, path, sizeof d); char *sl = strrchr(d, '/'); if (sl) *sl = 0; sk = lastNumber(d); } doGamesFile(path, sk < 0 ? 0 : sk); }
  else doPairsFile(path);
  fprintf(stderr, "\r%ld positions  %ld games   %.60s", nOut, gamesDone, path);
}
static int extract(int argc, char **argv) {
  OUT = fopen(argv[2], "ab"); if (!OUT) return 1;
  int games = 0;
  for (int i = 3; i < argc; i++) {
    if (!strcmp(argv[i], "--pairs")) games = 0;
    else if (!strcmp(argv[i], "--games")) games = 1;
    else if (!strcmp(argv[i], "--skip")) { i++; if (!strcmp(argv[i], "auto")) SKIP_AUTO = 1; else { SKIP_AUTO = 0; SKIP = atoi(argv[i]); } continue; }
    else if (!strcmp(argv[i], "--frac")) { FRAC = atof(argv[++i]); continue; }
    else if (!strcmp(argv[i], "--max-games")) { MAXG = atol(argv[++i]); gamesDone = 0; continue; }
    else { walk(argv[i], games); continue; }
    if (i + 1 < argc && argv[i + 1][0] != '-') { walk(argv[++i], games); }
  }
  fprintf(stderr, "\nwrote %ld positions\n", nOut); fclose(OUT); return 0;
}

// ------------------------------------------------------------------ train
static Rec *R; static long NR;
static float *Wt;   // current phase weights (discs)
static double LR0 = 0.03;   // step = LR0 · (sum of residuals) / (occurrences + 2), shrunk ×0.7 whenever the validation error rises
typedef struct { long a, b; uint32_t *F; float *Y; float *G; float *C; double se; int phase; } Job;
static long nPos; static uint32_t *FE; static float *YV; static unsigned char *VAL;
static void *gradJob(void *arg) {
  Job *j = arg; j->se = 0;
  memset(j->G, 0, sizeof(float) * PHASE_SIZE);
  for (long i = j->a; i < j->b; i++) {
    if (VAL[i]) continue;
    const uint32_t *f = FE + i * NF; float p = 0; for (int k = 0; k < NF; k++) p += Wt[f[k]];
    float e = p - YV[i]; j->se += e * e;
    for (int k = 0; k < NF; k++) j->G[f[k]] += e;
  }
  return 0;
}
static double valErr(void) {
  double se = 0; long n = 0;
  for (long i = 0; i < nPos; i++) if (VAL[i]) { const uint32_t *f = FE + i * NF; float p = 0; for (int k = 0; k < NF; k++) p += Wt[f[k]]; se += (p - YV[i]) * (p - YV[i]); n++; }
  return n ? sqrt(se / n) : 0;
}
static int train(int argc, char **argv) {
  const char *out = 0, *init = 0; int iters = 300, T = 8; double valFrac = 0.02;
  char *files[64]; int nfiles = 0;
  for (int i = 2; i < argc; i++) {
    if (!strcmp(argv[i], "--out")) out = argv[++i];
    else if (!strcmp(argv[i], "--init")) init = argv[++i];
    else if (!strcmp(argv[i], "--iters")) iters = atoi(argv[++i]);
    else if (!strcmp(argv[i], "--threads")) T = atoi(argv[++i]);
    else if (!strcmp(argv[i], "--val")) valFrac = atof(argv[++i]);
    else if (!strcmp(argv[i], "--lr")) LR0 = atof(argv[++i]);
    else if (nfiles < 64) files[nfiles++] = argv[i];
  }
  if (!out || !nfiles) { fprintf(stderr, "usage: rvtrain train positions.bin… --out weights.bin [--init w.bin.gz]\n"); return 1; }
  // load all records
  long cap = 0;
  for (int i = 0; i < nfiles; i++) { struct stat st; if (!stat(files[i], &st)) cap += st.st_size / sizeof(Rec); }
  R = malloc(cap * sizeof(Rec)); NR = 0;
  for (int i = 0; i < nfiles; i++) { FILE *f = fopen(files[i], "rb"); if (!f) continue; NR += fread(R + NR, sizeof(Rec), cap - NR, f); fclose(f); }
  fprintf(stderr, "%ld positions\n", NR);
  float *ALL = calloc((size_t)NPHASE * PHASE_SIZE, sizeof(float));
  if (init) {
    gzFile g = gzopen(init, "rb"); if (!g) { fprintf(stderr, "cannot open %s\n", init); return 1; }
    int16_t *tmp = malloc((size_t)NPHASE * PHASE_SIZE * 2);
    int got = gzread(g, tmp, NPHASE * PHASE_SIZE * 2); gzclose(g);
    if (got != NPHASE * PHASE_SIZE * 2) { fprintf(stderr, "init: size %d, expected %d\n", got, NPHASE * PHASE_SIZE * 2); return 1; }
    for (long i = 0; i < (long)NPHASE * PHASE_SIZE; i++) ALL[i] = tmp[i] / 32.f;
    free(tmp);
  }
  // per phase
  long *cnt = malloc(sizeof(long) * NPHASE); memset(cnt, 0, sizeof(long) * NPHASE);
  float *CNT = malloc(sizeof(float) * PHASE_SIZE);
  Job *J = malloc(sizeof(Job) * T); for (int t = 0; t < T; t++) J[t].G = malloc(sizeof(float) * PHASE_SIZE);
  for (int ph = 3; ph < NPHASE; ph++) {
    // plies of this phase ± 1
    int lo = 99, hi = -1; for (int ply = 0; ply <= 60; ply++) if (phaseOf(ply + 4) == ph) { if (ply < lo) lo = ply; if (ply > hi) hi = ply; }
    lo--; hi++;
    nPos = 0; for (long i = 0; i < NR; i++) { int ply = pc(R[i].P | R[i].O) - 4; if (ply >= lo && ply <= hi) nPos++; }
    if (!nPos) continue;
    FE = malloc(sizeof(uint32_t) * NF * nPos); YV = malloc(sizeof(float) * nPos); VAL = malloc(nPos);
    long k = 0;
    for (long i = 0; i < NR; i++) {
      int ply = pc(R[i].P | R[i].O) - 4; if (ply < lo || ply > hi) continue;
      features(R[i].P, R[i].O, FE + k * NF); YV[k] = R[i].t; VAL[k] = rnd() < valFrac; k++;
    }
    memset(CNT, 0, sizeof(float) * PHASE_SIZE);
    for (long i = 0; i < nPos; i++) if (!VAL[i]) for (int q = 0; q < NF; q++) CNT[FE[i * NF + q]] += 1;
    Wt = ALL + (size_t)ph * PHASE_SIZE;
    fprintf(stderr, "phase %2d: %ld positions, validation rmse of the initial weights %.3f\n", ph, nPos, valErr());
    double lr = LR0, best = 1e9; float *bestW = malloc(sizeof(float) * PHASE_SIZE); memcpy(bestW, Wt, sizeof(float) * PHASE_SIZE);
    for (int it = 0; it < iters; it++) {
      pthread_t th[64]; long step = (nPos + T - 1) / T;
      for (int t = 0; t < T; t++) { J[t].a = t * step; J[t].b = (t + 1) * step < nPos ? (t + 1) * step : nPos; pthread_create(&th[t], 0, gradJob, &J[t]); }
      double se = 0; for (int t = 0; t < T; t++) { pthread_join(th[t], 0); se += J[t].se; }
      for (int q = 0; q < PHASE_SIZE; q++) if (CNT[q] > 0) {
        float g = 0; for (int t = 0; t < T; t++) g += J[t].G[q];
        Wt[q] -= (float)(lr * g / (CNT[q] + 2));
      }
      if (it % 10 == 9 || it == iters - 1) {
        double ve = valErr();
        if (ve < best) { best = ve; memcpy(bestW, Wt, sizeof(float) * PHASE_SIZE); } else lr *= 0.7;
        fprintf(stderr, "\rphase %2d (plies %d-%d, %ld positions)  iter %3d  train rmse %.3f  val rmse %.3f  lr %.2f   ", ph, lo, hi, nPos, it + 1, sqrt(se / (nPos * (1 - valFrac))), ve, lr);
      }
    }
    memcpy(Wt, bestW, sizeof(float) * PHASE_SIZE); free(bestW);
    fprintf(stderr, "\nphase %2d done: val rmse %.3f\n", ph, best);
    free(FE); free(YV); free(VAL);
  }
  for (int ph = 0; ph < 3; ph++) memcpy(ALL + (size_t)ph * PHASE_SIZE, ALL + (size_t)3 * PHASE_SIZE, sizeof(float) * PHASE_SIZE);   // too few early positions
  FILE *o = fopen(out, "wb");
  for (long i = 0; i < (long)NPHASE * PHASE_SIZE; i++) { float v = ALL[i] * 32; int16_t x = (int16_t)(v > 32767 ? 32767 : v < -32768 ? -32768 : lrintf(v)); fwrite(&x, 2, 1, o); }
  fclose(o); fprintf(stderr, "wrote %s (gzip -9 it into weights.bin.gz)\n", out);
  return 0;
}
// rvtrain check weights.bin.gz positions.bin N: the evaluation (discs, side to move) of the first N positions, to compare with engine.js
static int check(int argc, char **argv) {
  gzFile g = gzopen(argv[2], "rb"); int16_t *w = malloc((size_t)NPHASE * PHASE_SIZE * 2); gzread(g, w, NPHASE * PHASE_SIZE * 2); gzclose(g);
  FILE *f = fopen(argv[3], "rb"); int n = atoi(argv[4]); Rec r; uint32_t fe[NF];
  while (n-- > 0 && fread(&r, sizeof r, 1, f) == 1) {
    features(r.P, r.O, fe); const int16_t *W = w + (size_t)phaseOf(pc(r.P | r.O)) * PHASE_SIZE; int s = 0; for (int k = 0; k < NF; k++) s += W[fe[k]];
    printf("%016llx %016llx %d\n", (unsigned long long)r.P, (unsigned long long)r.O, s * 100 / 32);
  }
  return 0;
}
int main(int argc, char **argv) {
  if (argc >= 5 && !strcmp(argv[1], "check")) return check(argc, argv);
  if (argc >= 3 && !strcmp(argv[1], "extract")) return extract(argc, argv);
  if (argc >= 3 && !strcmp(argv[1], "train")) return train(argc, argv);
  fprintf(stderr, "usage: rvtrain extract positions.bin [--pairs …] [--games [--skip N|auto] [--frac F] …]\n       rvtrain train positions.bin… --out weights.bin [--init weights.bin.gz] [--iters 300] [--threads 8]\n");
  return 1;
}
