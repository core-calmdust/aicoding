// Lockstep simulation of a game's engine_mt.wasm (Lazy SMP) on the work machine: see simcore.h and gen.py.
//   sim <threads list> <budget1 M nodes> [positions: -1 all / 0,3,…] [delayed stores 0/1] [delayed busy marks 0/1] [fresh 0/1] [jitter 0..1]
// For each position: one thread with the budget gives the depth D (as bench.html: the depth one thread reaches in the
// time); then for each thread count the time to depth D in rounds x SIM_Q (= the main thread's nodes, one thread: its
// nodes). The threads persist across the jobs (as the page's pool) and keep their history / killers from the earlier jobs
// (as there; with identical histories the threads walk exactly the same tree in lockstep and never help each other) —
// fresh 1: every job of every thread starts with cleared history / killers (to compare one thread's nodes with wasm1.js);
// 2 (the default): only the main thread's (its one-thread runs and so D are the same for two builds whose one-thread search
// is the same, and the comparison of two builds is not blurred by the history the main thread carries). SIM_D=<d>: the
// depth D for every position instead of the budget. Positions where one thread needs < 20k nodes are left out of the means.
// Built by gen.py: gcc -O2 -DGAME_H='"g_<game>.h"' sim.c (eng_<game>.c, g_<game>.h, pos_<game>.txt in the folder).
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include GAME_H
static int SETUP[16][4096], ns[16], npos;
static pthread_mutex_t mu = PTHREAD_MUTEX_INITIALIZER; static pthread_cond_t jcv = PTHREAD_COND_INITIALIZER;
static int curPos, curT, jobId, running, quit, FRESH, warmTurn;
static void *helper(void *a) {
  int id = (int)(long)a; simThreadInit(id); g_thread_init(id); int seen = 0;
  // warm-up (as bench.html's first job): one after another, each helper searches position 1 alone for 20k x id nodes, so the
  // helpers start with histories of their own (with the same history as the main thread a helper would walk the same tree
  // in lockstep with it)
  pthread_mutex_lock(&mu); while (warmTurn != id) pthread_cond_wait(&jcv, &mu); pthread_mutex_unlock(&mu);
  { int mv; g_setup(SETUP[0], ns[0]); g_budget(20000.0 * id, &mv); }
  pthread_mutex_lock(&mu); warmTurn++; pthread_cond_broadcast(&jcv); pthread_mutex_unlock(&mu);
  for (;;) {
    pthread_mutex_lock(&mu);
    while (jobId == seen && !quit) pthread_cond_wait(&jcv, &mu);
    seen = jobId; int part = id < curT;
    pthread_mutex_unlock(&mu);
    if (quit) return 0;
    if (!part) continue;
    if (FRESH == 1) g_fresh(); g_setup(SETUP[curPos], ns[curPos]);
    simOn = 1; simCnt = 0;
    g_helper();
    simLeave();
    pthread_mutex_lock(&mu); running--; pthread_cond_broadcast(&jcv); pthread_mutex_unlock(&mu);
  }
}
int main(int argc, char **argv) {
  FILE *f = fopen(POS_FILE, "r"); static char line[1 << 16];
  if (!f) { fprintf(stderr, "no %s\n", POS_FILE); return 1; }
  while (fgets(line, sizeof line, f) && npos < 16) {
    int n = 0; for (char *t = strtok(line + 2, " \n"); t; t = strtok(0, " \n")) SETUP[npos][n++] = atoi(t);
    ns[npos++] = n;
  }
  fclose(f);
  simThreadInit(0); g_global_init(); g_thread_init(0);
  int T[16], nt = 0, maxT = 1; for (char *t = strtok(argv[1], ","); t; t = strtok(0, ",")) { T[nt] = atoi(t); if (T[nt] > maxT) maxT = T[nt]; nt++; }
  double budget = atof(argv[2]) * 1e6; const char *onlyS = argc > 3 ? argv[3] : "-1"; int only = atoi(onlyS);
  int DELAY = argc > 4 ? atoi(argv[4]) : 1; busyDelay = argc > 5 ? atoi(argv[5]) : 1; FRESH = argc > 6 ? atoi(argv[6]) : 2; simJit = argc > 7 ? atof(argv[7]) : 0;
  pthread_t th[64]; for (int h = 1; h < maxT; h++) pthread_create(&th[h], 0, helper, (void *)(long)h);
  pthread_mutex_lock(&mu); warmTurn = 1; pthread_cond_broadcast(&jcv); while (warmTurn < maxT) pthread_cond_wait(&jcv, &mu); pthread_mutex_unlock(&mu);
  double sumR[16] = {0}, lg[16] = {0}, sumN1 = 0; int cnt = 0;
  for (int pi = 0; pi < npos; pi++) {
    if (only >= 0) { char k[8]; sprintf(k, ",%d,", pi); char l[256]; sprintf(l, ",%s,", onlyS); if (!strstr(l, k)) continue; }
    simDelay = 0; gStop = 0; g_newgame(); if (FRESH) g_fresh(); g_setup(SETUP[pi], ns[pi]);
    int bmv = 0, D = getenv("SIM_D") ? atoi(getenv("SIM_D")) : g_budget(budget, &bmv); printf("pos %d D%d m%d |", pi + 1, D, bmv);
    double r1 = 0;
    for (int ti = 0; ti < nt; ti++) {
      int t = T[ti];
      simDelay = DELAY && t > 1;
      g_newgame(); gStop = 0; if (FRESH) g_fresh();
      pthread_mutex_lock(&simMu); simNp = t; simArrived = 0; simRounds = 0; pthread_mutex_unlock(&simMu);
      pthread_mutex_lock(&mu); curPos = pi; curT = t; running = t - 1; jobId++; pthread_cond_broadcast(&jcv); pthread_mutex_unlock(&mu);
      simOn = t > 1; simCnt = 0;
      g_setup(SETUP[pi], ns[pi]);
      int mv = 0, dd = 0; double mainNodes = 0;
      g_main(D, &mv, &dd, &mainNodes);
      long R0 = simRounds;
      gStop = 1; if (t > 1) simLeave(); simOn = 0;
      pthread_mutex_lock(&mu); while (running > 0) pthread_cond_wait(&jcv, &mu); pthread_mutex_unlock(&mu);
      double tm = t > 1 ? (double)R0 * SIM_Q : mainNodes; if (t == 1) { r1 = tm; sumN1 += mainNodes; }
      if (r1 >= 20000) { sumR[ti] += tm; lg[ti] += log(r1 / tm); if (ti == 0) cnt++; }
      printf(" t%d %.2fM x%.2f m%d d%d |", t, tm / 1e6, r1 / tm, mv, dd); fflush(stdout);
    }
    printf("\n");
  }
  printf("SUM 1-thread nodes %.0f |", sumN1);
  for (int ti = 0; ti < nt; ti++) printf(" t%d x%.2f (geo x%.2f)", T[ti], sumR[0] / sumR[ti], exp(lg[ti] / cnt));
  printf("\n");
  pthread_mutex_lock(&mu); quit = 1; pthread_cond_broadcast(&jcv); pthread_mutex_unlock(&mu);
  return 0;
}
