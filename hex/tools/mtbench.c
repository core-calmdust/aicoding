// Native check of the multi-thread search (engine.c -DMT, tree-parallel MCTS) with pthreads: the same code as engine_mt.wasm.
//   gcc -O3 -march=native -DNATIVE -DMT -pthread -w -o /tmp/hexmt tools/mtbench.c -lm
//   hexmt speed T ms [npos]        the 10 positions of bench.html (11x11): playouts, wall time and the CPU time of every thread
//                                  → playouts per CPU second per thread (a crowded machine shows the cache contention here,
//                                  not in the wall clock), for 1 thread and T threads
//   hexmt agree T po refpo [npos]  random 11x11 positions: the best move of T threads with po playouts in total, and of 1 thread
//                                  with po, against 1 thread with refpo
//   hexmt match T po games [lv]    T threads (po playouts in total) vs 1 thread (po), 11x11, swap on, colours alternate,
//                                  two random opening moves (must = 3 for both)
#define NATIVE 1
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>
#include <pthread.h>
static double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec * 1000.0 + t.tv_nsec / 1e6; }
static double cpu(void) { struct timespec t; clock_gettime(CLOCK_THREAD_CPUTIME_ID, &t); return t.tv_sec * 1000.0 + t.tv_nsec / 1e6; }
#ifdef ENGINE_C
#include ENGINE_C
#else
#include "../engine.c"
#endif

// ---- helpers: each waits for a job, runs mt_help() until mt_stop(1), reports its CPU time
#define MAXT 32
static pthread_t TH[MAXT]; static int nHelp = 0;
static pthread_mutex_t mu = PTHREAD_MUTEX_INITIALIZER; static pthread_cond_t cv = PTHREAD_COND_INITIALIZER, cvDone = PTHREAD_COND_INITIALIZER;
static int job = 0, want = 0, doneCnt = 0; static double hCpu[MAXT]; static int hPO[MAXT];
static void *helper(void *a) {
  int id = (int)(long)a, seen = 0; mt_thread_native(id);
  for (;;) {
    pthread_mutex_lock(&mu); while (job == seen) pthread_cond_wait(&cv, &mu); seen = job; int go = id <= want; pthread_mutex_unlock(&mu);
    double c0 = cpu(); int po = go ? mt_help() : 0; double c1 = cpu();
    pthread_mutex_lock(&mu); hCpu[id] = c1 - c0; hPO[id] = po; doneCnt++; pthread_cond_signal(&cvDone); pthread_mutex_unlock(&mu);
  }
  return 0;
}
static void startHelpers(int n) { for (int i = nHelp + 1; i <= n; i++) pthread_create(&TH[i], 0, helper, (void *)(long)i); if (n > nHelp) nHelp = n; }
// run fn on the lead with T threads in all; returns the lead's CPU ms (helpers' in hCpu)
static double runJob(int T, void (*fn)(void *), void *arg) {
  startHelpers(T - 1);
  __atomic_store_n(&gStop, 0, __ATOMIC_SEQ_CST);
  pthread_mutex_lock(&mu); want = T - 1; doneCnt = 0; for (int i = 0; i < MAXT; i++) hCpu[i] = 0, hPO[i] = 0; job++; pthread_cond_broadcast(&cv); pthread_mutex_unlock(&mu);
  double c0 = cpu(); fn(arg); double c1 = cpu();
  mt_stop(1);
  pthread_mutex_lock(&mu); while (doneCnt < nHelp) pthread_cond_wait(&cvDone, &mu); pthread_mutex_unlock(&mu);
  __atomic_store_n(&gStop, 0, __ATOMIC_SEQ_CST);
  return c1 - c0;
}

// ---- positions
static int setupMoves(int n, int sw, const int *mv, int k) { IO[0] = n; IO[1] = sw; IO[2] = k; for (int i = 0; i < k; i++) IO[3 + i] = mv[i]; return setup(); }
typedef struct { int k, mv[40]; } P;
static P POS[64]; static int nPos = 0;
static void benchPositions(void) {   // bench.html: 10 positions, seeded random cells, 4-20 stones
  int rs_ = 4242; nPos = 10;
  for (int i = 0; i < 10; i++) {
    rs_ = (int)(((long long)rs_ * 1103515245 + 12345) & 0x7fffffff); int len = 4 + rs_ % 17; P *p = &POS[i]; p->k = 0;
    while (p->k < len) { rs_ = (int)(((long long)rs_ * 1103515245 + 12345) & 0x7fffffff); int c = rs_ % 121, u = 0; for (int j = 0; j < p->k; j++) if (p->mv[j] == c) u = 1; if (!u) p->mv[p->k++] = c; }
  }
}
static void randomPositions(int cnt, int seed) {   // legal positions without a winner, 6-24 stones
  srand(seed); nPos = 0;
  while (nPos < cnt) {
    P *p = &POS[nPos]; int len = 6 + rand() % 19; p->k = 0;
    while (p->k < len) { int c = rand() % 121, u = 0; for (int j = 0; j < p->k; j++) if (p->mv[j] == c) u = 1; if (!u) p->mv[p->k++] = c; }
    if (setupMoves(11, 0, p->mv, p->k) && !winner(ROOT.b)) nPos++;
  }
}
static int A_ms, A_po;
static void doAnalyze(void *a) { analyze(A_ms, A_po, 30); }
static int bestMove(int T, int ms, int po, double *cpuAll, double *wall, int *pos) {
  double t0 = now(); double c = runJob(T, doAnalyze, 0); double t1 = now();
  (void)ms; double s = c; for (int i = 1; i < T; i++) s += hCpu[i];
  if (cpuAll) *cpuAll = s; if (wall) *wall = t1 - t0; if (pos) *pos = IO[1];
  return IO[0] > 0 ? IO[2] : -1;
}

int main(int argc, char **argv) {
  if (argc < 2) return 1;
  mt_thread_native(0);   // (this thread is the lead)
  if (!strcmp(argv[1], "speed")) {
    int T = atoi(argv[2]), ms = atoi(argv[3]), np = argc > 4 ? atoi(argv[4]) : 10; benchPositions(); if (np < nPos) nPos = np;
    for (int pass = 0; pass < 2; pass++) {
      int t = pass ? T : 1; double sc = 0, sw = 0; long long sp = 0;
      for (int i = 0; i < nPos; i++) {
        setupMoves(11, 0, POS[i].mv, POS[i].k); A_ms = ms; A_po = 0; double c, w; int po;
        bestMove(t, ms, 0, &c, &w, &po); sc += c; sw += w; sp += po;
      }
      printf("threads %d: %lld playouts, wall %.0f ms (%.0f/s), cpu %.0f ms → %.0f playouts per cpu s (per thread)\n", t, sp, sw, sp / sw * 1000, sc, sp / sc * 1000);
      fflush(stdout);
    }
    return 0;
  }
  if (!strcmp(argv[1], "agree")) {
    int T = atoi(argv[2]), po = atoi(argv[3]), ref = atoi(argv[4]), np = argc > 5 ? atoi(argv[5]) : 24; randomPositions(np, 7);
    int a1 = 0, aT = 0;
    for (int i = 0; i < nPos; i++) {
      setupMoves(11, 0, POS[i].mv, POS[i].k); A_ms = 0; A_po = ref; int r = bestMove(1, 0, ref, 0, 0, 0);
      setupMoves(11, 0, POS[i].mv, POS[i].k); A_po = po; int b1 = bestMove(1, 0, po, 0, 0, 0);
      setupMoves(11, 0, POS[i].mv, POS[i].k); A_po = po; int bT = bestMove(T, 0, po, 0, 0, 0);
      a1 += b1 == r; aT += bT == r;
      printf("pos %d ref %d | 1T %d | %dT %d\n", i, r, b1, T, bT); fflush(stdout);
    }
    printf("agree: 1 thread %d/%d, %d threads %d/%d (po %d, ref %d)\n", a1, nPos, T, aT, nPos, po, ref);
    return 0;
  }
  if (!strcmp(argv[1], "match")) {
    int T = atoi(argv[2]), po = atoi(argv[3]), g = atoi(argv[4]), wins = 0; srand(argc > 5 ? atoi(argv[5]) : 11);
    for (int i = 0; i < g; i++) {
      int mv[MAXC + 2], k = 0, mtRed = i % 2 == 0;
      mv[k++] = rand() % 121; { int c; do c = rand() % 121; while (c == mv[0]); mv[k++] = c; }
      int w;
      for (;;) {
        setupMoves(11, 1, mv, k); w = winner(ROOT.b); if (w) break;
        int mt = (ROOT.side == RED) == mtRed;
        A_po = po;
        struct { int po; } a = { po };
        static int P_; P_ = po;
        void bm(void *x) { best(P_, 0, 0, 0, 3); }
        runJob(mt ? T : 1, bm, &a);
        if (IO[0] < 0) { w = 0; break; }
        mv[k++] = IO[0];
      }
      if ((w == RED) == mtRed) wins++;
      printf("game %d: %s wins (MT %s) | MT %d/%d\n", i + 1, w == RED ? "red" : "blue", mtRed ? "red" : "blue", wins, i + 1); fflush(stdout);
    }
    return 0;
  }
  return 1;
}
