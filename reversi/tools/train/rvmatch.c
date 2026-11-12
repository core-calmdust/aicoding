// A fast, precise match between two evaluation weights (or two search settings) with the game's own search, natively:
// thousands of games in minutes, from many different balanced openings, each opening played twice with the sides swapped.
// Guide: README.md (Japanese), 「強さを測る（rvmatch）」.
//
//   cc -O3 -shared -fPIC -DENGINE_ALLOC=malloc -DENGINE_OWN_NOW -o rveng.so ../../engine.c        (the engine as a library; macOS the same)
//   cc -O3 -o rvmatch rvmatch.c -ldl -lz -lm
//
//   rvmatch openings pairs.bin openings.bin [--ply 10] [--max 1] [--n 3000]
//       balanced openings from Egaroucid's position / value pairs (rvtrain extract --pairs): positions of that ply whose
//       value is within --max discs, spread evenly over the file (ply 10 = black to move, 11 = white to move; up to ply 11
//       the values are a negamax of Lv.17 evaluations of every line, so "0" means balanced, not one game's result).
//   rvmatch match openings.bin [--wa a.bin.gz] [--wb b.bin.gz] [--a depth,exact,wld] [--b depth,exact,wld]
//                 [--ta 1.5] [--tb 1.5] [--n 1000] [--procs N] [--games out.txt]
//       A against B: both play every opening as the side to move and as the other side (2 games an opening). The levels'
//       search (iterative deepening with Multi-ProbCut to `depth`, win/draw/loss solve from `wld` empties, exact from
//       `exact`), no book, no clock: the result depends only on the settings. Defaults: ../../weights.bin.gz, 10,16,18.
//       --ta / --tb: Multi-ProbCut's t (1.5 in the game; 0 = off). The same weights and settings on both sides = the
//       balance between the side to move first and the other (black and white with --ply 10 openings).
//       Prints A's score, Elo and mean disc difference with their standard errors (by opening pair).
#define _GNU_SOURCE
#include <math.h>
#include <time.h>
#include <dlfcn.h>
#include <unistd.h>
#include <sys/wait.h>
#include "rvcommon.h"
typedef uint64_t u64; typedef uint32_t u32;
double now(void) { struct timespec t; clock_gettime(CLOCK_REALTIME, &t); return t.tv_sec * 1e3 + t.tv_nsec / 1e6; }   // (the engine's clock)

typedef struct {   // one engine instance (its own copy of the library: its own tables)
  void *h; Model M; double A, B, C, t;
  int (*search)(u32, u32, u32, u32, int, int, int, int, int);
  int (*solve)(u32, u32, u32, u32, int, int, int, int, int);
  void (*set_state)(double, double, int, double, double, double, double, int, int, int, int, int);
  void (*clear_tt)(void);
  int depth, exact, wld;
} Eng;
static int copyFile(const char *a, const char *b) {
  FILE *f = fopen(a, "rb"), *o = fopen(b, "wb"); if (!f || !o) return 1; char buf[1 << 16]; size_t r;
  while ((r = fread(buf, 1, sizeof buf, f)) > 0) fwrite(buf, 1, r, o);
  fclose(f); fclose(o); return 0;
}
static int load(Eng *E, const char *so, const char *wf) {
  E->h = dlopen(so, RTLD_NOW | RTLD_LOCAL); if (!E->h) { fprintf(stderr, "%s\n(build it first: cc -O3 -shared -fPIC -DENGINE_ALLOC=malloc -DENGINE_OWN_NOW -o rveng.so ../../engine.c)\n", dlerror()); return 1; }
  int16_t *w = load_weights(wf, &E->M); if (!w) return 1;
  ((void (*)(void))dlsym(E->h, "w_defer"))(); ((void (*)(void))dlsym(E->h, "init"))();
  const size_t nw = (size_t)E->M.nphase * E->M.phaseSize;
  int16_t *dst = ((int16_t *(*)(int))dlsym(E->h, "w_alloc"))((int)nw); if (!dst) return 1;
  memcpy(dst, w, nw * 2); free(w);
  int *(*tab)(int) = (int *(*)(int))dlsym(E->h, "tab_ptr"); int *I_OFF = tab(0), *SQ_START = tab(1), *SQI = tab(2), *SQP = tab(3);
  const int s = E->M.set; int o = 0;   // (as rvlabel.c setup / engine.js wasmWeights)
  for (int i = 0; i < E->M.ninst; i++) I_OFF[i] = PT_OFF[s][i];
  for (int q = 0; q < 64; q++) {
    SQ_START[q] = o;
    for (int i = 0; i < E->M.ninst; i++) { const int n = PT_LEN[s][i]; int pw = 1; for (int k = n - 1; k >= 0; k--) { if (PT_SQ[s][i][k] == q) { SQI[o] = i; SQP[o] = pw; o++; } pw *= 3; } }
  }
  SQ_START[64] = o;
  ((void (*)(int, int, int, int, int))dlsym(E->h, "set_patterns"))(E->M.ninst, E->M.nphase, E->M.phaseSize, E->M.next, E->M.extOff);
  E->A = 357.32; E->B = 1.1; E->C = -3.14; if (E->M.mpc[0] > 0) { E->A = E->M.mpc[0]; E->B = E->M.mpc[1]; E->C = E->M.mpc[2]; }
  E->search = (int (*)(u32, u32, u32, u32, int, int, int, int, int))dlsym(E->h, "search");
  E->solve = (int (*)(u32, u32, u32, u32, int, int, int, int, int))dlsym(E->h, "solve_");
  E->set_state = (void (*)(double, double, int, double, double, double, double, int, int, int, int, int))dlsym(E->h, "set_state");
  E->clear_tt = (void (*)(void))dlsym(E->h, "clear_tt");
  return 0;
}
#define lo32(x) ((u32)(x))
#define hi32(x) ((u32)((x) >> 32))
static void st(Eng *E) { E->set_state(0, 0, E->t > 0, E->t > 0 ? E->t : 1.5, E->A, E->B, E->C, 3, 12, 14, 1, 8); }
// engine.js rootPVS (one thread)
static int rootPVS(Eng *E, u64 P, u64 O, const int *mv, int n, int depth, int exact, int alpha, int beta, int *bm) {
  const int e = 64 - rv_pc(P | O); int best = -99999; *bm = mv[0];
  for (int i = 0; i < n; i++) {
    const u64 f = rv_flips(mv[i], P, O), nP = P | f | (1ULL << mv[i]), nO = O & ~f; int v;
#define S(lo, hi) (exact ? -E->solve(lo32(nO), hi32(nO), lo32(nP), hi32(nP), -(hi), -(lo), e - 1, 1, 0) : -E->search(lo32(nO), hi32(nO), lo32(nP), hi32(nP), depth - 1, -(hi), -(lo), 1, 0))
    if (i == 0) v = S(alpha, beta);
    else { v = S(alpha, alpha + 1); if (v > alpha) v = S(v - 1 > alpha ? v - 1 : alpha, beta); }
    if (v > best) { best = v; *bm = mv[i]; if (v > alpha) { alpha = v; if (alpha >= beta) break; } }
  }
  return best;
}
static void order(int *mv, int n, const int *pri) { for (int i = 1; i < n; i++) { int m = mv[i], j = i - 1; while (j >= 0 && pri[mv[j]] < pri[m]) { mv[j + 1] = mv[j]; j--; } mv[j + 1] = m; } }
// engine.js think for the fixed-depth levels (Lv.17-27) without the book and the clock
static int think(Eng *E, u64 P, u64 O) {
  u64 m = rv_moves(P, O); int mv[40], n = 0; for (; m; m &= m - 1) mv[n++] = __builtin_ctzll(m);
  if (n == 1) return mv[0];
  const int e = 64 - rv_pc(P | O), doExact = e <= E->exact; int maxD = E->depth < e ? E->depth : e; if (doExact && maxD > 10) maxD = 10;
  int pri[64]; for (int i = 0; i < 64; i++) pri[i] = -1; int bm = mv[0], sc = 0;
  for (int d = doExact ? 2 : 1; d <= maxD; d++) { order(mv, n, pri); st(E); sc = rootPVS(E, P, O, mv, n, d, 0, -32001, 32001, &bm); pri[bm] = 1000 + d; }
  if (doExact) {
    order(mv, n, pri); int g = (int)lrint(sc / 100.0); g = g > 60 ? 60 : g < -60 ? -60 : g; int lo = g - 3, hi = g + 3;
    for (;;) { st(E); const int v = rootPVS(E, P, O, mv, n, 0, 1, lo, hi, &bm); if (v <= lo && lo > -65) { hi = v + 1; lo = -65; } else if (v >= hi && hi < 65) { lo = v - 1; hi = 65; } else break; }
  } else if (e <= E->wld) {
    order(mv, n, pri); int b2; st(E); const int v = rootPVS(E, P, O, mv, n, 0, 1, -1, 1, &b2);
    if (v > 0 || (v == 0 && sc < 0)) bm = b2;
  }
  return bm;
}
// X moves first (P to move); the final disc difference for X (empties to the winner); the moves into rec (if not NULL)
static int game(Eng *X, Eng *Y, u64 P, u64 O, char *rec) {
  Eng *E[2] = { X, Y }; int side = 0, passes = 0;
  X->clear_tt(); Y->clear_tt();
  while (passes < 2) {
    if (!rv_moves(P, O)) { u64 t = P; P = O; O = t; side ^= 1; passes++; continue; }
    passes = 0; const int s = think(E[side], P, O);
    if (rec) { *rec++ = (char)('a' + (s & 7)); *rec++ = (char)('1' + (s >> 3)); }
    const u64 f = rv_flips(s, P, O), nP = P | f | (1ULL << s), nO = O & ~f; P = nO; O = nP; side ^= 1;
  }
  if (rec) *rec = 0;
  int p = rv_pc(P), o = rv_pc(O), d = p - o; const int em = 64 - p - o; d = d > 0 ? d + em : d < 0 ? d - em : 0;
  return side == 0 ? d : -d;
}
static void levelOf(Eng *E, const char *s) { if (sscanf(s, "%d,%d,%d", &E->depth, &E->exact, &E->wld) != 3) { fprintf(stderr, "level: depth,exact,wld (e.g. 10,16,18)\n"); exit(1); } }

static int openings(int argc, char **argv) {
  int ply = 10, mx = 1; long want = 3000;
  for (int i = 4; i < argc; i++) { if (!strcmp(argv[i], "--ply")) ply = atoi(argv[++i]); else if (!strcmp(argv[i], "--max")) mx = atoi(argv[++i]); else if (!strcmp(argv[i], "--n")) want = atol(argv[++i]); }
  FILE *f = fopen(argv[2], "rb"); if (!f) { fprintf(stderr, "cannot open %s\n", argv[2]); return 1; }
  Rec r; long have = 0;
  while (fread(&r, sizeof r, 1, f) == 1) if (rv_pc(r.P | r.O) - 4 == ply && abs(r.t) <= mx) have++;
  rewind(f);
  FILE *o = fopen(argv[3], "wb"); if (!o) return 1; long k = 0, n = 0;
  while (fread(&r, sizeof r, 1, f) == 1) if (rv_pc(r.P | r.O) - 4 == ply && abs(r.t) <= mx) { if (k * want / have != (k + 1) * want / have || have <= want) { fwrite(&r, sizeof r, 1, o); n++; } k++; }
  fclose(f); fclose(o);
  fprintf(stderr, "%s: %ld openings (ply %d = %s to move, value within %d; %ld in the file)\n", argv[3], n, ply, ply & 1 ? "white" : "black", mx, have);
  return 0;
}
static int match(int argc, char **argv) {
  const char *wa = "../../weights.bin.gz", *wb = "../../weights.bin.gz", *la = "10,16,18", *lb = 0, *gf = 0, *so = "./rveng.so"; double ta = 1.5, tb = 1.5; long N = 1000; int PR = 0;
  for (int i = 3; i < argc; i++) {
    if (!strcmp(argv[i], "--wa")) wa = argv[++i]; else if (!strcmp(argv[i], "--wb")) wb = argv[++i];
    else if (!strcmp(argv[i], "--a")) la = argv[++i]; else if (!strcmp(argv[i], "--b")) lb = argv[++i];
    else if (!strcmp(argv[i], "--ta")) ta = atof(argv[++i]); else if (!strcmp(argv[i], "--tb")) tb = atof(argv[++i]);
    else if (!strcmp(argv[i], "--n")) N = atol(argv[++i]); else if (!strcmp(argv[i], "--procs")) PR = atoi(argv[++i]);
    else if (!strcmp(argv[i], "--games")) gf = argv[++i]; else if (!strcmp(argv[i], "--engine")) so = argv[++i];
  }
  if (!lb) lb = la;
  if (PR <= 0) { long c = sysconf(_SC_NPROCESSORS_ONLN); PR = c > 1 ? (int)c : 1; } if (PR > 64) PR = 64;
  FILE *f = fopen(argv[2], "rb"); if (!f) { fprintf(stderr, "cannot open %s (rvmatch openings pairs.bin %s)\n", argv[2], argv[2]); return 1; }
  Rec *op = malloc(sizeof(Rec) * N); N = (long)fread(op, sizeof(Rec), N, f); fclose(f); if (N < 1) return 1;
  char so2[4096]; snprintf(so2, sizeof so2, "%s.b.%d", so, (int)getpid());   // (a second copy of the library: B's own tables)
  if (copyFile(so, so2)) { fprintf(stderr, "cannot copy %s (build it first: cc -O3 -shared -fPIC -DENGINE_ALLOC=malloc -DENGINE_OWN_NOW -o rveng.so ../../engine.c)\n", so); return 1; }
  fprintf(stderr, "A: %s  %s  t %g\nB: %s  %s  t %g\n%ld openings × 2 games, %d processes\n", wa, la, ta, wb, lb, tb, N, PR);
  int pipes[64][2]; const double t0 = now();
  for (int k = 0; k < PR; k++) {
    if (pipe(pipes[k])) return 1;
    if (fork() == 0) {
      Eng A, B; if (load(&A, so, wa) || load(&B, so2, wb)) _exit(1);
      levelOf(&A, la); levelOf(&B, lb); A.t = ta; B.t = tb;
      FILE *o = fdopen(pipes[k][1], "w"); char r1[160], r2[160];
      for (long i = k; i < N; i += PR) { const int d1 = game(&A, &B, op[i].P, op[i].O, r1), d2 = -game(&B, &A, op[i].P, op[i].O, r2); fprintf(o, "%ld %d %d %s %s\n", i, d1, d2, r1, r2); fflush(o); }
      _exit(0);
    }
    close(pipes[k][1]);
  }
  // d1: A moved first, d2: A moved second (both: the disc difference for A)
  double sF = 0, sS = 0, wF = 0, wS = 0, sq = 0, sw = 0, sw2 = 0; long n = 0; FILE *go = gf ? fopen(gf, "w") : 0;
  for (int k = 0; k < PR; k++) {
    FILE *in = fdopen(pipes[k][0], "r"); long i; int d1, d2; char r1[160], r2[160];
    while (fscanf(in, "%ld %d %d %159s %159s", &i, &d1, &d2, r1, r2) == 5) {
      n++; sF += d1; sS += d2; const double p1 = d1 > 0 ? 1 : d1 == 0 ? 0.5 : 0, p2 = d2 > 0 ? 1 : d2 == 0 ? 0.5 : 0; wF += p1; wS += p2;
      const double pr = (d1 + d2) / 2.0, pw = (p1 + p2) / 2; sq += pr * pr; sw += pw; sw2 += pw * pw;
      if (go) fprintf(go, "%ld\t%016llx\t%016llx\t%d\t%s\t%d\t%s\n", i, (unsigned long long)op[i].P, (unsigned long long)op[i].O, d1, r1, d2, r2);
      if (n % 50 == 0) fprintf(stderr, "\r%ld / %ld openings   ", n, N);
    }
    fclose(in);
  }
  while (wait(0) > 0) {}
  if (go) fclose(go);
  remove(so2);
  if (!n) { fprintf(stderr, "no games\n"); return 1; }
  const double mean = (sF + sS) / (2.0 * n), sd = sqrt(sq / n - mean * mean) / sqrt((double)n), sc = sw / n, se = sqrt((sw2 / n - sc * sc) / n);
  const double cl = sc < 0.001 ? 0.001 : sc > 0.999 ? 0.999 : sc, elo = -400 * log10(1 / cl - 1), dElo = se * 400 / (log(10) * cl * (1 - cl));
  fprintf(stderr, "\r%ld openings, %ld games, %.0f s\n", n, 2 * n, (now() - t0) / 1000);
  printf("A の得点率 %.1f%% ± %.1f%%   Elo %+.0f ± %.0f   平均石差 %+.2f ± %.2f\n", 100 * sc, 100 * se, elo, dElo, mean, sd);
  printf("  A が先に打つ側（--ply 10 の序盤なら黒）: %.1f%%  %+.2f 石      A が後に打つ側: %.1f%%  %+.2f 石\n", 100 * wF / n, sF / n, 100 * wS / n, sS / n);
  printf("  先に打つ側の成績（A・B の平均）: %.1f%%  %+.2f 石   （± は序盤の組ごとの標準誤差。2倍を超える差が有意の目安）\n", 100 * (wF + n - wS) / (2.0 * n), (sF - sS) / (2.0 * n));
  return 0;
}
int main(int argc, char **argv) {
  if (argc >= 4 && !strcmp(argv[1], "openings")) return openings(argc, argv);
  if (argc >= 3 && !strcmp(argv[1], "match")) return match(argc, argv);
  fprintf(stderr, "usage: rvmatch openings pairs.bin openings.bin [--ply 10] [--max 1] [--n 3000]\n"
                  "       rvmatch match openings.bin [--wa a.bin.gz] [--wb b.bin.gz] [--a depth,exact,wld] [--b …] [--ta 1.5] [--tb 1.5] [--n 1000] [--procs N] [--games out.txt]\n");
  return 1;
}
