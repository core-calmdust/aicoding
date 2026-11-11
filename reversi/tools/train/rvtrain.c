// Training of the Reversi pattern evaluation (weights.bin.gz for engine.js / engine.c). Guide: README.md (Japanese).
//
//   cc -O3 -pthread -o rvtrain rvtrain.c -lz -lm        (macOS too; patterns.h: node gen-patterns.js)
//
//   1) rvtrain extract positions.bin [options] <sources…>
//        --pairs <file|dir>   Egaroucid "Training Data" (lines: 64 chars X/O/- from a1, a space, the score for X)
//        --games <file|dir>   transcripts (lines: f5d6… moves); the final disc difference is the target
//        --skip N             transcripts: leave out the first N plies of every game (the random opening);
//                             "--skip auto" reads N from the last number in the folder / file path (e.g. …/0012/…)
//        --frac F             transcripts: keep each remaining position with probability F (default 0.25)
//        --max-games N        transcripts: stop after N games per source
//      Output: 17 bytes per position (player bits, opponent bits, signed target), appended.
//   2) rvtrain train positions.bin[:weight]… --out weights.bin.gz [options]
//        --set B|C            pattern set (engine.js PATTERN_DEFS_B / _C = B + cross; default C)
//        --phases N           phases (60 = one per ply, v5; 30 = two plies, v4; default 60)
//        --ext N              extra features: 4 (mobility, potential mobility) or 5 (+ own discs; default 5)
//        --init w.bin.gz      start from these weights (v4 or v5; mapped to the new layout: the same pattern tables, the
//                             phase holding the same plies; new tables start at 0)
//        --iters 300 --threads 8 --val 0.02 --lr 0.03
//        --window 1           also train each phase on the plies this far beyond it, …
//        --side 0.3           … with this weight (the phase's own plies 1; low, so that one phase per ply keeps the parity)
//        --l2 0               ridge: pulls every weight towards 0 (as this many observations of 0 error; rare entries most)
//        --max-pos N          at most N positions per phase (a random part; memory: about 4·(features+2) bytes each)
//        --quant 2            stored as multiples of 2/32 disc (smaller download, within 1/32 disc; 1 = exact)
//        --mpc A,B,C          Multi-ProbCut sigma to store in the header (rvlabel mpc; default: --init's if a v5 file, else
//                             none = the engine's v4 values)
//      A file's weight (positions.bin:2) multiplies its positions' weight (e.g. exact or deep-search labels over game results).
//      Per phase, least squares with the gradient of each weight normalised by how often its feature occurs; the weights of
//      the iteration with the smallest validation error are kept. Writes a v5 weights file (gzip; engine.js decodeV5).
//   3) rvtrain rmse weights.bin.gz positions.bin [--every K]   error per 4 plies (to compare v4 and v5 on held-out data)
//   4) rvtrain check weights.bin.gz positions.bin N             evaluations (1/100 disc) as engine.js gives them
//   5) rvtrain setmpc in.bin.gz out.bin.gz A B C [--quant 2]    rewrite the header's Multi-ProbCut sigma
#include <math.h>
#include <dirent.h>
#include <sys/stat.h>
#include <pthread.h>
#include <time.h>
#include "rvcommon.h"
typedef uint64_t u64;

static uint64_t rng = 88172645463325252ULL;
static double rnd(void) { rng ^= rng << 13; rng ^= rng >> 7; rng ^= rng << 17; return (rng >> 11) * (1.0 / 9007199254740992.0); }
static double wall(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec + t.tv_nsec * 1e-9; }

// ------------------------------------------------------------------ extract
static FILE *OUT; static long nOut;
static double FRAC = 0.25; static int SKIP = 0, SKIP_AUTO = 0; static long MAXG = 0;
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
      if (!(rv_moves(*P, *O) & (1ULL << s))) {   // a pass
        turn ^= 1; P = turn ? &W : &B; O = turn ? &B : &W;
        if (!(rv_moves(*P, *O) & (1ULL << s))) { ok = 0; break; }
      }
      hp[n] = *P; ho[n] = *O; side[n] = turn; n++;
      u64 fl = rv_flips(s, *P, *O); *P |= fl | (1ULL << s); *O &= ~fl; turn ^= 1;
    }
    if (!ok || n < 2) continue;
    int b = rv_pc(B), w = rv_pc(W), e = 64 - b - w, d = b - w; d = d > 0 ? d + e : d < 0 ? d - e : 0;   // empties to the winner
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
  if (games) { int sk = SKIP_AUTO ? lastNumber(path) : SKIP; if (SKIP_AUTO) { char d[4096]; strncpy(d, path, sizeof d - 1); d[sizeof d - 1] = 0; char *sl = strrchr(d, '/'); if (sl) *sl = 0; sk = lastNumber(d); } doGamesFile(path, sk < 0 ? 0 : sk); }
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

// ------------------------------------------------------------------ loading positions
static Rec *R; static long NR; static float *RW; static unsigned char *RPLY;   // records, their weights, plies
static int loadRecs(char **files, int nfiles) {
  long cap = 0;
  for (int i = 0; i < nfiles; i++) { char fn[4096]; strncpy(fn, files[i], sizeof fn - 1); fn[sizeof fn - 1] = 0; char *c = strrchr(fn, ':'); if (c && !strchr(c, '/')) *c = 0; struct stat st; if (!stat(fn, &st)) cap += st.st_size / sizeof(Rec); else { fprintf(stderr, "cannot open %s\n", fn); return -1; } }
  R = malloc(cap * sizeof(Rec)); RW = malloc(cap * sizeof(float)); RPLY = malloc(cap); NR = 0;
  if (!R || !RW || !RPLY) { fprintf(stderr, "out of memory (%ld positions)\n", cap); return -1; }
  for (int i = 0; i < nfiles; i++) {
    char fn[4096]; strncpy(fn, files[i], sizeof fn - 1); fn[sizeof fn - 1] = 0; float w = 1; char *c = strrchr(fn, ':'); if (c && !strchr(c, '/')) { *c = 0; w = (float)atof(c + 1); }
    FILE *f = fopen(fn, "rb"); if (!f) continue;
    long got = (long)fread(R + NR, sizeof(Rec), cap - NR, f); fclose(f);
    for (long k = NR; k < NR + got; k++) { RW[k] = w; RPLY[k] = (unsigned char)(rv_pc(R[k].P | R[k].O) - 4); }
    fprintf(stderr, "%s: %ld positions (weight %g)\n", fn, got, w);
    NR += got;
  }
  return 0;
}

// ------------------------------------------------------------------ train
static Model M; static int NF;
static float *Wt;   // current phase weights (discs)
static double LR0 = 0.03, L2 = 0;
typedef struct { long a, b; float *G; double se, sw; } Job;
static long nPos; static uint32_t *FE; static float *YV, *PW; static unsigned char *VAL;   // per phase: features, targets, weights, validation flags
static long *SEL;   // the records of this phase
static void *gradJob(void *arg) {
  Job *j = arg; j->se = 0; j->sw = 0;
  memset(j->G, 0, sizeof(float) * M.phaseSize);
  for (long i = j->a; i < j->b; i++) {
    if (VAL[i]) continue;
    const uint32_t *f = FE + i * NF; float p = 0; for (int k = 0; k < NF; k++) p += Wt[f[k]];
    float e = p - YV[i], we = e * PW[i]; j->se += e * we; j->sw += PW[i];
    for (int k = 0; k < NF; k++) j->G[f[k]] += we;
  }
  return 0;
}
static void *featJob(void *arg) {
  Job *j = arg;
  for (long i = j->a; i < j->b; i++) { const Rec *r = R + SEL[i]; rv_features(&M, r->P, r->O, FE + i * NF); }
  return 0;
}
static void runJobs(Job *J, int T, long n, void *(*fn)(void *)) {
  pthread_t th[256]; long step = (n + T - 1) / T;
  for (int t = 0; t < T; t++) { J[t].a = t * step < n ? t * step : n; J[t].b = (t + 1) * step < n ? (t + 1) * step : n; pthread_create(&th[t], 0, fn, &J[t]); }
  for (int t = 0; t < T; t++) pthread_join(th[t], 0);
}
static double valErr(void) {   // the validation positions of the phase's own plies (weight 1 there)
  double se = 0; long n = 0;
  for (long i = 0; i < nPos; i++) if (VAL[i] == 1) { const uint32_t *f = FE + i * NF; float p = 0; for (int k = 0; k < NF; k++) p += Wt[f[k]]; se += (p - YV[i]) * (p - YV[i]); n++; }
  return n ? sqrt(se / n) : 0;
}
// the weights of an older model (another set / phases / extras) in the new layout: the phase holding the same middle ply, the
// pattern tables both sets have (set B is the start of set C), the extras both have, the bias
static void mapInit(const Model *om, const int16_t *ow, float *all) {
  const int nt = om->total < M.total ? om->total : M.total, ne = om->next < M.next ? om->next : M.next;
  for (int ph = 0; ph < M.nphase; ph++) {
    int lo = 99, hi = -1; for (int ply = 0; ply <= 60; ply++) if (rv_phase(&M, ply + 4) == ph) { if (ply < lo) lo = ply; if (ply > hi) hi = ply; }
    if (hi < 0) continue;
    const int oph = rv_phase(om, (lo + hi) / 2 + 4);
    const int16_t *s = ow + (size_t)oph * om->phaseSize; float *d = all + (size_t)ph * M.phaseSize;
    for (int i = 0; i < nt; i++) d[i] = s[i] / 32.f;
    for (int i = 0; i < 64 * ne; i++) d[M.extOff + i] = s[om->extOff + i] / 32.f;
    d[M.phaseSize - 1] = s[om->phaseSize - 1] / 32.f;
  }
}
static int train(int argc, char **argv) {
  const char *out = 0, *init = 0; int iters = 300, T = 8, window = 1, quant = 2, nphase = 60, next = 5; double valFrac = 0.02, side = 0.3; long maxPos = 0; char set = 'C';
  float mpc[3] = { 0, 0, 0 };
  char *files[64]; int nfiles = 0;
  for (int i = 2; i < argc; i++) {
    if (!strcmp(argv[i], "--out")) out = argv[++i];
    else if (!strcmp(argv[i], "--init")) init = argv[++i];
    else if (!strcmp(argv[i], "--iters")) iters = atoi(argv[++i]);
    else if (!strcmp(argv[i], "--threads")) T = atoi(argv[++i]);
    else if (!strcmp(argv[i], "--val")) valFrac = atof(argv[++i]);
    else if (!strcmp(argv[i], "--lr")) LR0 = atof(argv[++i]);
    else if (!strcmp(argv[i], "--l2")) L2 = atof(argv[++i]);
    else if (!strcmp(argv[i], "--window")) window = atoi(argv[++i]);
    else if (!strcmp(argv[i], "--side")) side = atof(argv[++i]);
    else if (!strcmp(argv[i], "--max-pos")) maxPos = atol(argv[++i]);
    else if (!strcmp(argv[i], "--quant")) quant = atoi(argv[++i]);
    else if (!strcmp(argv[i], "--set")) set = argv[++i][0];
    else if (!strcmp(argv[i], "--phases")) nphase = atoi(argv[++i]);
    else if (!strcmp(argv[i], "--ext")) next = atoi(argv[++i]);
    else if (!strcmp(argv[i], "--mpc")) { if (sscanf(argv[++i], "%f,%f,%f", mpc, mpc + 1, mpc + 2) != 3) { fprintf(stderr, "--mpc A,B,C\n"); return 1; } }
    else if (nfiles < 64) files[nfiles++] = argv[i];
  }
  T = T < 1 ? 1 : T > 256 ? 256 : T; quant = quant < 1 ? 1 : quant;
  if (!out || !nfiles) { fprintf(stderr, "usage: rvtrain train positions.bin[:weight]… --out weights.bin.gz [--set B|C] [--phases 60] [--ext 5] [--init w.bin.gz] …\n"); return 1; }
  if (model_init(&M, set, nphase, next) || (next != 4 && next != 5)) { fprintf(stderr, "bad --set / --phases / --ext\n"); return 1; }
  memcpy(M.mpc, mpc, sizeof mpc);
  NF = M.nf;
  fprintf(stderr, "model: set %c, %d phases, %d extras, %d instances, %d weights per phase (%.1fM in all)\n", set, nphase, next, M.ninst, M.phaseSize, (double)nphase * M.phaseSize / 1e6);
  if (loadRecs(files, nfiles)) return 1;
  fprintf(stderr, "%ld positions\n", NR);
  float *ALL = calloc((size_t)M.nphase * M.phaseSize, sizeof(float));
  if (init) {
    Model om; int16_t *ow = load_weights(init, &om); if (!ow) return 1;
    fprintf(stderr, "init %s: set %c, %d phases, %d extras\n", init, PT_NAME[om.set], om.nphase, om.next);
    if (M.mpc[0] <= 0 && om.mpc[0] > 0) memcpy(M.mpc, om.mpc, sizeof M.mpc);   // (kept from a v5 init; measure again after: rvlabel mpc)
    mapInit(&om, ow, ALL); free(ow);
  }
  float *CNT = malloc(sizeof(float) * M.phaseSize);
  Job *J = malloc(sizeof(Job) * T); for (int t = 0; t < T; t++) J[t].G = malloc(sizeof(float) * M.phaseSize);
  int firstTrained = -1; const double t0 = wall();
  for (int ph = 0; ph < M.nphase; ph++) {
    int lo = 99, hi = -1; for (int ply = 0; ply <= 60; ply++) if (rv_phase(&M, ply + 4) == ph) { if (ply < lo) lo = ply; if (ply > hi) hi = ply; }
    if (hi < 6) continue;   // the first plies: too few positions (copied from the first phase trained, below)
    const int wlo = lo - window, whi = hi + window;
    nPos = 0; for (long i = 0; i < NR; i++) if (RPLY[i] >= wlo && RPLY[i] <= whi) nPos++;
    if (!nPos) continue;
    const double keep = maxPos && nPos > maxPos ? (double)maxPos / nPos : 1;
    SEL = malloc(sizeof(long) * nPos); long k = 0;
    for (long i = 0; i < NR; i++) if (RPLY[i] >= wlo && RPLY[i] <= whi && (keep >= 1 || rnd() < keep)) SEL[k++] = i;
    nPos = k;
    FE = malloc(sizeof(uint32_t) * NF * nPos); YV = malloc(sizeof(float) * nPos); PW = malloc(sizeof(float) * nPos); VAL = malloc(nPos);
    if (!FE || !YV || !PW || !VAL) { fprintf(stderr, "out of memory (phase %d, %ld positions: try --max-pos)\n", ph, nPos); return 1; }
    for (long i = 0; i < nPos; i++) {
      const long r = SEL[i]; const int own = RPLY[r] >= lo && RPLY[r] <= hi;
      YV[i] = R[r].t; PW[i] = RW[r] * (own ? 1.f : (float)side);
      VAL[i] = rnd() < valFrac ? (own ? 1 : 2) : 0;   // (2: held out, not counted — the validation error is on the phase's own plies)
    }
    runJobs(J, T, nPos, featJob);
    memset(CNT, 0, sizeof(float) * M.phaseSize);
    for (long i = 0; i < nPos; i++) if (!VAL[i]) for (int q = 0; q < NF; q++) CNT[FE[i * NF + q]] += PW[i];
    Wt = ALL + (size_t)ph * M.phaseSize;
    if (!init && firstTrained >= 0) memcpy(Wt, ALL + (size_t)(ph - 1) * M.phaseSize, sizeof(float) * M.phaseSize);   // (from scratch: start from the phase before)
    if (firstTrained < 0) firstTrained = ph;
    const double v0 = valErr();
    fprintf(stderr, "phase %2d: plies %d-%d (+%d each side), %ld positions, validation rmse of the initial weights %.3f\n", ph, lo, hi, window, nPos, v0);
    double lr = LR0, best = v0 > 0 ? v0 : 1e9; float *bestW = malloc(sizeof(float) * M.phaseSize); memcpy(bestW, Wt, sizeof(float) * M.phaseSize);
    for (int it = 0; it < iters; it++) {
      runJobs(J, T, nPos, gradJob);
      double se = 0, sw = 0; for (int t = 0; t < T; t++) { se += J[t].se; sw += J[t].sw; }
      for (int q = 0; q < M.phaseSize; q++) if (CNT[q] > 0) {
        float g = 0; for (int t = 0; t < T; t++) g += J[t].G[q];
        g += (float)(L2 * Wt[q]);
        Wt[q] -= (float)(lr * g / (CNT[q] + 2));
      }
      if (it % 10 == 9 || it == iters - 1) {
        double ve = valErr();
        if (ve < best) { best = ve; memcpy(bestW, Wt, sizeof(float) * M.phaseSize); } else lr *= 0.7;
        const double el = wall() - t0, done = (ph - firstTrained) + (it + 1.0) / iters, left = M.nphase - firstTrained - done;
        fprintf(stderr, "\rphase %2d  iter %3d  train rmse %.3f  val rmse %.3f  lr %.3f  elapsed %.0f min, ETA %.0f min   ", ph, it + 1, sqrt(se / (sw > 0 ? sw : 1)), ve, lr, el / 60, el / done * left / 60);
      }
    }
    memcpy(Wt, bestW, sizeof(float) * M.phaseSize); free(bestW);
    fprintf(stderr, "\nphase %2d done: val rmse %.3f (initial %.3f)\n", ph, best, v0);
    free(FE); free(YV); free(PW); free(VAL); free(SEL);
  }
  if (firstTrained > 0) for (int ph = 0; ph < firstTrained; ph++) memcpy(ALL + (size_t)ph * M.phaseSize, ALL + (size_t)firstTrained * M.phaseSize, sizeof(float) * M.phaseSize);
  const size_t nw = (size_t)M.nphase * M.phaseSize; int16_t *w16 = malloc(nw * 2);
  for (size_t i = 0; i < nw; i++) { float v = ALL[i] * 32; w16[i] = (int16_t)(v > 32767 ? 32767 : v < -32768 ? -32768 : lrintf(v)); }
  if (save_weights(out, &M, w16, quant)) return 1;
  fprintf(stderr, "wrote %s (v5: set %c, %d phases, %d extras, quant %d) in %.0f min\n", out, set, nphase, next, quant, (wall() - t0) / 60);
  return 0;
}

// ------------------------------------------------------------------ rmse / check / setmpc
static int evalW(const Model *m, const int16_t *w, u64 P, u64 O) {   // = engine.js evalPattern (1/32 disc)
  uint32_t f[128]; rv_features(m, P, O, f); const int16_t *W = w + (size_t)rv_phase(m, rv_pc(P | O)) * m->phaseSize; int s = 0;
  for (int k = 0; k < m->nf; k++) s += W[f[k]];
  return s;
}
static int rmse(int argc, char **argv) {
  Model m; int16_t *w = load_weights(argv[2], &m); if (!w) return 1;
  int every = 1; for (int i = 4; i < argc; i++) if (!strcmp(argv[i], "--every")) every = atoi(argv[++i]);
  FILE *f = fopen(argv[3], "rb"); if (!f) return 1;
  double se[16] = { 0 }, ae[16] = { 0 }; long n[16] = { 0 }, k = 0; Rec r;
  while (fread(&r, sizeof r, 1, f) == 1) {
    if (k++ % every) continue;
    const int ply = rv_pc(r.P | r.O) - 4, b = ply / 4; const double e = evalW(&m, w, r.P, r.O) / 32.0 - r.t;
    se[b] += e * e; ae[b] += fabs(e); n[b]++;
  }
  printf("%s (set %c, %d phases, %d extras) on %s\nplies   positions   rmse   mean |error| (discs)\n", argv[2], PT_NAME[m.set], m.nphase, m.next, argv[3]);
  double S = 0; long N = 0;
  for (int b = 0; b < 16; b++) if (n[b]) { printf("%2d-%2d  %10ld  %6.3f  %6.3f\n", 4 * b, 4 * b + 3, n[b], sqrt(se[b] / n[b]), ae[b] / n[b]); S += se[b]; N += n[b]; }
  if (N) printf("all    %10ld  %6.3f\n", N, sqrt(S / N));
  return 0;
}
// rvtrain check weights.bin.gz positions.bin N: the evaluation (1/100 disc, side to move) of the first N positions, as engine.js gives
static int check(int argc, char **argv) {
  (void)argc; Model m; int16_t *w = load_weights(argv[2], &m); if (!w) return 1;
  FILE *f = fopen(argv[3], "rb"); if (!f) return 1; int n = atoi(argv[4]); Rec r;
  while (n-- > 0 && fread(&r, sizeof r, 1, f) == 1) printf("%016llx %016llx %d\n", (unsigned long long)r.P, (unsigned long long)r.O, evalW(&m, w, r.P, r.O) * 100 / 32);
  return 0;
}
static int setmpc(int argc, char **argv) {
  Model m; int16_t *w = load_weights(argv[2], &m); if (!w) return 1;
  int quant = m.quant; for (int i = 7; i < argc; i++) if (!strcmp(argv[i], "--quant")) quant = atoi(argv[++i]);
  m.mpc[0] = (float)atof(argv[4]); m.mpc[1] = (float)atof(argv[5]); m.mpc[2] = (float)atof(argv[6]);
  if (save_weights(argv[3], &m, w, quant)) return 1;   // (the weights as loaded are multiples of the file's quant: the same values)
  fprintf(stderr, "wrote %s: Multi-ProbCut sigma = %g + %g·depth + %g·empties\n", argv[3], m.mpc[0], m.mpc[1], m.mpc[2]);
  return 0;
}
int main(int argc, char **argv) {
  if (argc >= 5 && !strcmp(argv[1], "check")) return check(argc, argv);
  if (argc >= 4 && !strcmp(argv[1], "rmse")) return rmse(argc, argv);
  if (argc >= 7 && !strcmp(argv[1], "setmpc")) return setmpc(argc, argv);
  if (argc >= 3 && !strcmp(argv[1], "extract")) return extract(argc, argv);
  if (argc >= 3 && !strcmp(argv[1], "train")) return train(argc, argv);
  fprintf(stderr, "usage: rvtrain extract positions.bin [--pairs …] [--games [--skip N|auto] [--frac F] …]\n"
                  "       rvtrain train positions.bin[:weight]… --out weights.bin.gz [--set B|C] [--phases 60] [--ext 5] [--init w.bin.gz] [--iters 300] [--threads 8]\n"
                  "       rvtrain rmse weights.bin.gz positions.bin [--every K]\n"
                  "       rvtrain check weights.bin.gz positions.bin N\n"
                  "       rvtrain setmpc in.bin.gz out.bin.gz A B C\n");
  return 1;
}
