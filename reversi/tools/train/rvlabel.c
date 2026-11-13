// Labels positions with the game's own search (engine.c built natively), on all cores of a Mac: several processes, each
// writing its own part file, resumable (the same command continues), with progress and ETA. Guide: README.md (Japanese).
//
//   cc -O3 -o rvlabel rvlabel.c -lz -lm        (macOS: the same; patterns.h: node gen-patterns.js)
//
//   rvlabel label in.bin out.bin --weights w.bin.gz [--depth 12] [--exact 22] [--empties 10-50] [--take 1] [--limit N]
//                [--blend 0] [--procs N]
//       each selected position of in.bin gets the value of a search: an exact solve with at most --exact empties, else a
//       midgame search (Multi-ProbCut, as the levels) to --depth. --take F keeps a fixed pseudo-random part F of the
//       positions, --limit N at most N; --blend B: the target = B · the old target + (1 − B) · the search value.
//   rvlabel selfplay out.bin --weights w.bin.gz --games N [--random 8-40] [--depth 4] [--exact 16] [--procs N]
//       games from a random opening (that many random plies), then both sides by the search; the positions after the
//       random part with the final disc difference (empties to the winner) — test data, or more varied positions to label.
//   rvlabel mpc positions.bin --weights w.bin.gz [--n 1500] [--depth 12] [--procs N] [--write out.bin.gz]
//       Multi-ProbCut's sigma for these weights: deep (d) and shallow (engine.c: 2·(d/4) + d%2) full-width values of
//       sample positions, the fit sigma = A + B·depth + C·empties (1/100 disc). --write stores it in the weights' header.
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>
#include <unistd.h>
#include <signal.h>
#include <sys/stat.h>
#include <sys/wait.h>
#define ENGINE_ALLOC malloc
#include "../../engine.c"
#include "rvcommon.h"

double now(void) { struct timespec t; clock_gettime(CLOCK_REALTIME, &t); return t.tv_sec * 1e3 + t.tv_nsec / 1e6; }
static double wall(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec + t.tv_nsec * 1e-9; }
static Model M;
static double MA = 357.32, MB = 1.1, MC = -3.14;   // Multi-ProbCut sigma (the header's, else engine.js MPC_V4)

// ------------------------------------------------------------------ the engine with these weights (as engine.js wasmWeights)
static int setup(const char *wfile) {
  int16_t *w = load_weights(wfile, &M); if (!w) return -1;
  w_defer(); init();
  const size_t nw = (size_t)M.nphase * M.phaseSize;
  i16 *dst = w_alloc((int)nw); if (!dst) { fprintf(stderr, "weights too large\n"); return -1; }
  memcpy(dst, w, nw * 2); free(w);
  const int s = M.set; int o = 0;
  for (int i = 0; i < M.ninst; i++) I_OFF[i] = PT_OFF[s][i];
  for (int q = 0; q < 64; q++) {
    SQ_START[q] = o;
    for (int i = 0; i < M.ninst; i++) { const int n = PT_LEN[s][i]; int pw = 1; for (int k = n - 1; k >= 0; k--) { if (PT_SQ[s][i][k] == q) { SQI[o] = i; SQP[o] = pw; o++; } pw *= 3; } }
  }
  SQ_START[64] = o;
  set_patterns(M.ninst, M.nphase, M.phaseSize, M.next, M.extOff);
  if (M.mpc[0] > 0) { MA = M.mpc[0]; MB = M.mpc[1]; MC = M.mpc[2]; }
  return 0;
}
static void state(int mpc) { set_state(0, 0, mpc, 1.5, MA, MB, MC, 2, 13, 18, 2, 8); }   /* (search v8: Multi-ProbCut from remaining depth 2, as engine.js minDepthW) */
static inline u32 lo32(u64 x) { return (u32)x; }
static inline u32 hi32(u64 x) { return (u32)(x >> 32); }
// the value for P (discs): exact with at most `exact` empties, else the midgame search to `depth` (iterative deepening)
static int valueOf(u64 P, u64 O, int depth, int exact) {
  const int e = 64 - pc(P | O);
  if (!genMoves(P, O) && !genMoves(O, P)) return finalScore(P, O);
  if (e <= exact) { state(1); return solve_(lo32(P), hi32(P), lo32(O), hi32(O), -64, 64, e, 0, 0); }
  int v = 0;
  for (int d = 1; d <= depth; d++) { state(1); v = search(lo32(P), hi32(P), lo32(O), hi32(O), d, -32000, 32000, 0, 0); }
  return v >= 0 ? (v + 50) / 100 : -((-v + 50) / 100);
}
static int bestMove(u64 P, u64 O, int depth, int exact) {   // (selfplay) the best move by valueOf of each child, or -1
  u64 m = genMoves(P, O); int best = -(1 << 30), bm = -1;
  for (; m; m &= m - 1) {
    const int s = lsb(m); const u64 f = flips(s, P, O), nP = P | f | (1ULL << s), nO = O & ~f;
    const int e = 64 - pc(nP | nO); int v;
    if (e <= exact) { state(1); v = -solve_(lo32(nO), hi32(nO), lo32(nP), hi32(nP), -64, 64, e, 0, 0) * 100; }
    else { state(1); v = -search(lo32(nO), hi32(nO), lo32(nP), hi32(nP), depth - 1, -32000, 32000, 0, 0); }
    if (v > best) { best = v; bm = s; }
  }
  return bm;
}

// ------------------------------------------------------------------ processes
static int PROCS = 0;
static int nprocs(void) { long n = sysconf(_SC_NPROCESSORS_ONLN); return n > 1 ? (int)n : 1; }
static long fileRecs(const char *fn) { struct stat st; return stat(fn, &st) ? 0 : (long)(st.st_size / sizeof(Rec)); }
static void partName(char *b, size_t n, const char *out, int k) { snprintf(b, n, "%s.part%02d", out, k); }
static volatile sig_atomic_t gotSig;
static void onSig(int s) { (void)s; gotSig = 1; }
// runs child(k) in PROCS processes; meanwhile shows the progress from done() (positions so far) against total
typedef int (*ChildFn)(int k);
static int runAll(ChildFn child, long total, long before, long (*done)(void), const char *what) {
  pid_t pid[256]; const double t0 = wall();
  for (int k = 0; k < PROCS; k++) { pid[k] = fork(); if (pid[k] == 0) { signal(SIGINT, SIG_DFL); _exit(child(k)); } }
  signal(SIGINT, onSig); signal(SIGTERM, onSig);
  int left = PROCS, bad = 0;
  while (left > 0) {
    for (int t = 0; t < 50 && left > 0; t++) {
      int st; pid_t p = waitpid(-1, &st, WNOHANG);
      if (p > 0) { left--; if (!WIFEXITED(st) || WEXITSTATUS(st)) bad = 1; continue; }
      if (gotSig) { for (int k = 0; k < PROCS; k++) kill(pid[k], SIGTERM); while (waitpid(-1, 0, 0) > 0) {} fprintf(stderr, "\nstopped: the same command continues\n"); return 2; }
      usleep(100000);
    }
    const long d = done(), now_ = d - before; const double el = wall() - t0, rate = now_ / (el > 0 ? el : 1), eta = rate > 0 ? (total - d) / rate : 0;
    fprintf(stderr, "\r%s %ld / %ld (%.1f%%)  %.1f/s  elapsed %dh%02dm  ETA %dh%02dm   ", what, d, total, total ? 100.0 * d / total : 100, rate,
      (int)(el / 3600), (int)(el / 60) % 60, (int)(eta / 3600), (int)(eta / 60) % 60);
  }
  fprintf(stderr, "\n");
  return bad;
}
static int concatParts(const char *out) {
  FILE *o = fopen(out, "wb"); if (!o) { fprintf(stderr, "cannot write %s\n", out); return 1; }
  char fn[4096], buf[1 << 16]; long n = 0;
  for (int k = 0; k < PROCS; k++) {
    partName(fn, sizeof fn, out, k); FILE *f = fopen(fn, "rb"); if (!f) continue;
    size_t r; while ((r = fread(buf, 1, sizeof buf, f)) > 0) { fwrite(buf, 1, r, o); n += (long)r; }
    fclose(f);
  }
  fclose(o);
  for (int k = 0; k < PROCS; k++) { partName(fn, sizeof fn, out, k); remove(fn); }
  fprintf(stderr, "wrote %s: %ld positions\n", out, n / (long)sizeof(Rec));
  return 0;
}

// ------------------------------------------------------------------ label
static const char *IN, *OUTF; static int DEPTH = 12, EXACT = 22, EMIN = 0, EMAX = 60; static double TAKE = 1, BLEND = 0; static long LIMIT = 0;
static inline int selected(long i, const Rec *r) {
  const int e = 64 - pc(r->P | r->O);
  if (e < EMIN || e > EMAX) return 0;
  if (TAKE < 1) { u64 h = (u64)i * 0x9E3779B97F4A7C15ULL; h ^= h >> 31; h *= 0xBF58476D1CE4E5B9ULL; h ^= h >> 29; if ((h >> 11) * (1.0 / 9007199254740992.0) >= TAKE) return 0; }
  return 1;
}
static long selTotal;
static long labelDone(void) { long n = 0; char fn[4096]; for (int k = 0; k < PROCS; k++) { partName(fn, sizeof fn, OUTF, k); n += fileRecs(fn); } return n; }
static int labelChild(int k) {
  char fn[4096]; partName(fn, sizeof fn, OUTF, k);
  long skip = fileRecs(fn);   // resume: this many of this process's positions are done
  FILE *in = fopen(IN, "rb"), *o = fopen(fn, "ab"); if (!in || !o) return 1;
  if (skip) { if (ftruncate(fileno(o), skip * (long)sizeof(Rec))) return 1; fseek(o, 0, SEEK_END); }
  Rec r; long i = 0, sel = 0, mine = 0;
  while (fread(&r, sizeof r, 1, in) == 1) {
    const long idx = i++;
    if (!selected(idx, &r)) continue;
    if (LIMIT && sel >= LIMIT) break;
    if (sel++ % PROCS != k) continue;
    if (mine++ < skip) continue;
    const int v = valueOf(r.P, r.O, DEPTH, EXACT);
    const double t = BLEND * r.t + (1 - BLEND) * v;
    Rec w = { r.P, r.O, (int8_t)(t > 64 ? 64 : t < -64 ? -64 : lrint(t)) };
    fwrite(&w, sizeof w, 1, o); fflush(o);
  }
  fclose(in); fclose(o);
  return 0;
}
static int label(int argc, char **argv) {
  IN = argv[2]; OUTF = argv[3]; const char *wf = 0;
  for (int i = 4; i < argc; i++) {
    if (!strcmp(argv[i], "--weights")) wf = argv[++i];
    else if (!strcmp(argv[i], "--depth")) DEPTH = atoi(argv[++i]);
    else if (!strcmp(argv[i], "--exact")) EXACT = atoi(argv[++i]);
    else if (!strcmp(argv[i], "--empties")) { if (sscanf(argv[++i], "%d-%d", &EMIN, &EMAX) != 2) return 1; }
    else if (!strcmp(argv[i], "--take")) TAKE = atof(argv[++i]);
    else if (!strcmp(argv[i], "--limit")) LIMIT = atol(argv[++i]);
    else if (!strcmp(argv[i], "--blend")) BLEND = atof(argv[++i]);
    else if (!strcmp(argv[i], "--procs")) PROCS = atoi(argv[++i]);
  }
  if (!wf) { fprintf(stderr, "--weights?\n"); return 1; }
  PROCS = PROCS <= 0 ? nprocs() : PROCS > 256 ? 256 : PROCS;
  if (fileRecs(OUTF) > 0) { char fn[4096]; partName(fn, sizeof fn, OUTF, 0); struct stat st; if (stat(fn, &st)) { fprintf(stderr, "%s exists (done). Delete it to label again.\n", OUTF); return 0; } }
  if (setup(wf)) return 1;
  { FILE *in = fopen(IN, "rb"); if (!in) { fprintf(stderr, "cannot open %s\n", IN); return 1; } Rec r; long i = 0;
    while (fread(&r, sizeof r, 1, in) == 1) { if (selected(i++, &r)) { selTotal++; if (LIMIT && selTotal >= LIMIT) break; } } fclose(in); }
  // a file of parts from an earlier run with another number of processes would be mixed up
  { char fn[4096]; partName(fn, sizeof fn, OUTF, PROCS); struct stat st; if (!stat(fn, &st)) { fprintf(stderr, "%s: parts of a run with more processes — use the same --procs\n", fn); return 1; } }
  const long before = labelDone();
  fprintf(stderr, "labelling %ld positions of %s (depth %d, exact at %d empties or fewer, %d processes)%s\n", selTotal, IN, DEPTH, EXACT, PROCS, before ? " — continuing" : "");
  int r = runAll(labelChild, selTotal, before, labelDone, "labelled");
  if (r) return r;
  return concatParts(OUTF);
}

// ------------------------------------------------------------------ selfplay
static long GAMES = 1000; static int RLO = 8, RHI = 40;
static long spDone(void) { long n = 0; char fn[4096]; for (int k = 0; k < PROCS; k++) { partName(fn, sizeof fn, OUTF, k); n += fileRecs(fn); } return n; }
static int spChild(int k) {
  char fn[4096]; partName(fn, sizeof fn, OUTF, k); FILE *o = fopen(fn, "wb"); if (!o) return 1;
  u64 seed = 0x2545F4914F6CDD1DULL ^ ((u64)(k + 1) * 0x9E3779B97F4A7C15ULL);
#define RNG() (seed ^= seed << 13, seed ^= seed >> 7, seed ^= seed << 17, seed)
  for (long g = k; g < GAMES; g += PROCS) {
    u64 P = 0x0000000810000000ULL, O = 0x0000001008000000ULL; int side = 0, n = 0, passes = 0;   // black to move (P = black)
    const int rnd = RLO + (int)(RNG() % (u64)(RHI - RLO + 1));
    u64 hp[64], ho[64]; int hs[64];
    for (int ply = 0; passes < 2; ply++) {
      u64 m = genMoves(P, O);
      if (!m) { u64 t = P; P = O; O = t; side ^= 1; passes++; continue; }
      passes = 0; int s;
      if (ply < rnd) { int c = pc(m), j = (int)(RNG() % (u64)c); while (j--) m &= m - 1; s = lsb(m); }
      else { hp[n] = P; ho[n] = O; hs[n] = side; n++; s = bestMove(P, O, DEPTH, EXACT); }
      const u64 f = flips(s, P, O); const u64 nP = P | f | (1ULL << s), nO = O & ~f; P = nO; O = nP; side ^= 1;
    }
    const int d = finalScore(P, O);   // for the side to move now (side)
    for (int i = 0; i < n; i++) { const int t = hs[i] == side ? d : -d; Rec r = { hp[i], ho[i], (int8_t)t }; fwrite(&r, sizeof r, 1, o); }
    fflush(o);
  }
  fclose(o); return 0;
}
static int selfplay(int argc, char **argv) {
  OUTF = argv[2]; const char *wf = 0; DEPTH = 4; EXACT = 16;
  for (int i = 3; i < argc; i++) {
    if (!strcmp(argv[i], "--weights")) wf = argv[++i];
    else if (!strcmp(argv[i], "--games")) GAMES = atol(argv[++i]);
    else if (!strcmp(argv[i], "--random")) { if (sscanf(argv[++i], "%d-%d", &RLO, &RHI) != 2) return 1; }
    else if (!strcmp(argv[i], "--depth")) DEPTH = atoi(argv[++i]);
    else if (!strcmp(argv[i], "--exact")) EXACT = atoi(argv[++i]);
    else if (!strcmp(argv[i], "--procs")) PROCS = atoi(argv[++i]);
  }
  if (!wf || RHI < RLO) { fprintf(stderr, "--weights? --random lo-hi\n"); return 1; }
  PROCS = PROCS <= 0 ? nprocs() : PROCS > 256 ? 256 : PROCS;
  if (setup(wf)) return 1;
  const long est = GAMES * (60 - (RLO + RHI) / 2);
  int r = runAll(spChild, est, 0, spDone, "positions (estimate)");
  if (r) return r;
  return concatParts(OUTF);
}

// ------------------------------------------------------------------ mpc
static long NS = 1500; static const char *WOUT;
static int mpcChild(int k) {
  char fn[4096]; snprintf(fn, sizeof fn, "%s.mpc%02d", OUTF, k); FILE *o = fopen(fn, "w"), *in = fopen(IN, "rb"); if (!o || !in) return 1;
  long tot = fileRecs(IN), step = tot / (NS > 0 ? NS : 1); if (step < 1) step = 1;
  Rec r; long j = 0;
  for (long i = 0; i < tot && j < NS; i += step) {
    fseek(in, i * (long)sizeof(Rec), SEEK_SET); if (fread(&r, sizeof r, 1, in) != 1) break;
    const int e = 64 - pc(r.P | r.O);
    if (e < DEPTH + 8 || e > 52 || !genMoves(r.P, r.O)) continue;
    if (j++ % PROCS != k) continue;
    clear_tt(); fprintf(o, "%d", e);
    for (int d = 0; d <= DEPTH; d++) { state(0); fprintf(o, " %d", search(lo32(r.P), hi32(r.P), lo32(r.O), hi32(r.O), d, -32000, 32000, 0, 0)); }
    fprintf(o, "\n"); fflush(o);
  }
  fclose(o); fclose(in); return 0;
}
static long mpcDone(void) {
  long n = 0; char fn[4096];
  for (int k = 0; k < PROCS; k++) { snprintf(fn, sizeof fn, "%s.mpc%02d", OUTF, k); FILE *f = fopen(fn, "r"); if (!f) continue; int c; while ((c = fgetc(f)) != EOF) if (c == '\n') n++; fclose(f); }
  return n;
}
static int mpcFit(int argc, char **argv) {
  IN = argv[2]; const char *wf = 0; DEPTH = 12;
  for (int i = 3; i < argc; i++) {
    if (!strcmp(argv[i], "--weights")) wf = argv[++i];
    else if (!strcmp(argv[i], "--n")) NS = atol(argv[++i]);
    else if (!strcmp(argv[i], "--depth")) DEPTH = atoi(argv[++i]);
    else if (!strcmp(argv[i], "--procs")) PROCS = atoi(argv[++i]);
    else if (!strcmp(argv[i], "--write")) WOUT = argv[++i];
  }
  if (!wf || DEPTH > 30) { fprintf(stderr, "--weights?\n"); return 1; }
  PROCS = PROCS <= 0 ? nprocs() : PROCS > 256 ? 256 : PROCS;
  static char tmp[4096]; snprintf(tmp, sizeof tmp, "%s.mpcfit", wf); OUTF = tmp;
  if (setup(wf)) return 1;
  fprintf(stderr, "Multi-ProbCut fit: about %ld positions, depths 0-%d without cuts, %d processes\n", NS, DEPTH, PROCS);
  int r = runAll(mpcChild, NS, 0, mpcDone, "positions"); if (r) return r;
  // the data: for each position and depth d >= 3: |v(d) - v(shallow(d))|; sigma ≈ mean |diff| · sqrt(pi/2) (normal)
  double XtX[3][3] = { { 0 } }, Xty[3] = { 0 }, sd[31] = { 0 }; long nd[31] = { 0 }, npos = 0;
  for (int k = 0; k < PROCS; k++) {
    char fn[4096]; snprintf(fn, sizeof fn, "%s.mpc%02d", OUTF, k); FILE *f = fopen(fn, "r"); if (!f) continue;
    int e, v[32];
    while (fscanf(f, "%d", &e) == 1) {
      for (int d = 0; d <= DEPTH; d++) if (fscanf(f, "%d", &v[d]) != 1) goto next;
      npos++;
      for (int d = 3; d <= DEPTH; d++) {
        const int ds = 2 * (d >> 2) + (d & 1); const double y = fabs((double)(v[d] - v[ds])) * 1.2533141;
        const double x[3] = { 1, d, e };
        for (int a = 0; a < 3; a++) { Xty[a] += x[a] * y; for (int b = 0; b < 3; b++) XtX[a][b] += x[a] * x[b]; }
        sd[d] += (double)(v[d] - v[ds]) * (v[d] - v[ds]); nd[d]++;
      }
    }
  next:
    fclose(f); remove(fn);
  }
  if (npos < 20) { fprintf(stderr, "too few positions (%ld)\n", npos); return 1; }
  // solve the 3×3 normal equations (Gauss)
  double A[3][4]; for (int a = 0; a < 3; a++) { for (int b = 0; b < 3; b++) A[a][b] = XtX[a][b]; A[a][3] = Xty[a]; }
  for (int c = 0; c < 3; c++) { int p = c; for (int a = c + 1; a < 3; a++) if (fabs(A[a][c]) > fabs(A[p][c])) p = a; for (int b = 0; b < 4; b++) { double t = A[c][b]; A[c][b] = A[p][b]; A[p][b] = t; }
    for (int a = 0; a < 3; a++) if (a != c) { double q = A[a][c] / A[c][c]; for (int b = 0; b < 4; b++) A[a][b] -= q * A[c][b]; } }
  const double fa = A[0][3] / A[0][0], fb = A[1][3] / A[1][1], fc = A[2][3] / A[2][2];
  printf("positions %ld (weights %s)\ndepth  shallow  rms(deep - shallow) (1/100 disc)   fit at 30 / 40 empties   v4 constants at 30 / 40\n", npos, wf);
  for (int d = 3; d <= DEPTH; d++) if (nd[d]) printf("%5d  %7d  %8.0f                       %6.0f / %6.0f            %6.0f / %6.0f\n", d, 2 * (d >> 2) + (d & 1), sqrt(sd[d] / nd[d]),
    fa + fb * d + fc * 30, fa + fb * d + fc * 40, 357.32 + 1.1 * d - 3.14 * 30, 357.32 + 1.1 * d - 3.14 * 40);
  printf("MPC sigma = %.2f + %.3f*depth + %.3f*empties   (rvtrain setmpc in out %.2f %.3f %.3f)\n", fa, fb, fc, fa, fb, fc);
  if (WOUT) {
    Model m; int16_t *w = load_weights(wf, &m); if (!w) return 1;
    m.mpc[0] = (float)fa; m.mpc[1] = (float)fb; m.mpc[2] = (float)fc;
    if (save_weights(WOUT, &m, w, m.quant)) return 1;   /* (the weights are multiples of the file's quant: the same values) */
    fprintf(stderr, "wrote %s with this sigma\n", WOUT);
  }
  return 0;
}

// rvlabel probe positions.bin N --weights w.bin.gz: the evaluation and a depth-5 search of the first N positions (empty tables
// before each), to compare with engine.js (tools/train/probe.js) — the native build computes what the page computes
static int probe(int argc, char **argv) {
  const char *wf = 0; for (int i = 4; i < argc; i++) if (!strcmp(argv[i], "--weights")) wf = argv[++i];
  if (!wf || setup(wf)) return 1;
  FILE *in = fopen(argv[2], "rb"); if (!in) return 1; long n = atol(argv[3]); Rec r;
  while (n-- > 0 && fread(&r, sizeof r, 1, in) == 1) {
    clear_tt(); state(1); const int ev = evaluate(lo32(r.P), hi32(r.P), lo32(r.O), hi32(r.O));
    clear_tt(); state(1); const int v = search(lo32(r.P), hi32(r.P), lo32(r.O), hi32(r.O), 5, -32000, 32000, 0, 0);
    printf("%d %d %.0f\n", ev, v, nodes);
  }
  return 0;
}
int main(int argc, char **argv) {
  setvbuf(stderr, 0, _IONBF, 0);
  if (argc >= 4 && !strcmp(argv[1], "probe")) return probe(argc, argv);
  if (argc >= 4 && !strcmp(argv[1], "label")) return label(argc, argv);
  if (argc >= 3 && !strcmp(argv[1], "selfplay")) return selfplay(argc, argv);
  if (argc >= 3 && !strcmp(argv[1], "mpc")) return mpcFit(argc, argv);
  fprintf(stderr, "usage: rvlabel label in.bin out.bin --weights w.bin.gz [--depth 12] [--exact 22] [--empties 10-50] [--take F] [--limit N] [--blend B] [--procs N]\n"
                  "       rvlabel selfplay out.bin --weights w.bin.gz --games N [--random 8-40] [--depth 4] [--exact 16] [--procs N]\n"
                  "       rvlabel mpc positions.bin --weights w.bin.gz [--n 1500] [--depth 12] [--procs N] [--write out.bin.gz]\n");
  return 1;
}
