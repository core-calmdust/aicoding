// Lockstep simulation of engine_mt (Lazy SMP): every thread advances about SIM_Q nodes per round; the clock is the
// round count. Helpers persist across jobs (as the page's pool). Usage:
//   sim <threads list> <budget1 Mnodes> [pos|-1] [jitter 0..1] [freshHelpers 0/1] [mainSpeed 0..1] [lockstep 1/0]
//       [delayed stores 0/1] [delayed busy marks 0/1, built with -DBUSYSIM]      (eng_sim.c: gen.py; pos.txt: dump.js)
// The time to the depth D one thread reaches with the budget, for each thread count, in rounds (= main-thread nodes).
// jitter: each thread's quantum per round is SIM_Q * (1 - jitter + 2 jitter U) (uneven cores);
// mainSpeed < 1: the main thread runs at that speed (an efficiency core): it takes 1/mainSpeed rounds per quantum.
// Use "1 1 1" at the end (lockstep, delayed stores and marks): only that agreed with the Mac (2026-11-10).
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include "eng_sim.c"
static double now(void) { return 0; }
static pthread_mutex_t mu = PTHREAD_MUTEX_INITIALIZER; static pthread_cond_t cv = PTHREAD_COND_INITIALIZER, jcv = PTHREAD_COND_INITIALIZER;
static int np, arrived; static long sgen; static long rounds;
static TLS int simOn; static TLS u32 jr = 1;
static double JIT = 0, MSPD = 1; static int DELAY;
static PendE *allPend[64]; static int *allN[64], *allX[64]; static int LOCK = 1;
static TLS double carry;
static void flushAll(void) { if (!simDelay) return; for (int i = 0; i < 64; i++) if (allPend[i] && *allN[i]) { flushPend(allPend[i], *allN[i], allX[i]); *allN[i] = 0; } }
static void wait_round(void) {
  long g = sgen; arrived++;
  if (arrived >= np) { flushAll(); arrived = 0; sgen++; rounds++; pthread_cond_broadcast(&cv); }
  else while (sgen == g) pthread_cond_wait(&cv, &mu);
}
static void sim_tick(void) {
  if (!simOn || !LOCK) return;
  pthread_mutex_lock(&mu);
#ifdef BUSYSIM
  busyFlushMine();
#endif
  if (JIT > 0) { jr ^= jr << 13; jr ^= jr >> 17; jr ^= jr << 5; simNext += SIM_Q * JIT * (2.0 * (jr / 4294967296.0) - 1.0); }
  if (threadId == 0 && MSPD < 1) { carry += 1.0 / MSPD; while (carry >= 1) { carry -= 1; wait_round(); } }
  else wait_round();
  pthread_mutex_unlock(&mu);
}
static void sim_leave(void) {
  pthread_mutex_lock(&mu); np--; simOn = 0;
  if (np > 0 && arrived >= np) { flushAll(); arrived = 0; sgen++; rounds++; pthread_cond_broadcast(&cv); }
  pthread_mutex_unlock(&mu);
}
static int GEO[256], ng; static int SETUP[16][256], ns[16], npos;
static void thread_init(int id) {
  threadId = id; jr = 0x9e3779b9u * (id + 1);
  pend = malloc(sizeof(PendE) * PEND_MAX); npend = 0; pidx = calloc(PH, sizeof(int)); allPend[id] = pend; allN[id] = &npend; allX[id] = pidx;
  buf = malloc(sizeof(int) * (MAXPLY + 8) * MAXMV); scb = malloc(sizeof(int) * (MAXPLY + 8) * MAXMV);
  for (int i = 0; i < (MAXPLY + 8) * 2; i++) killer[i] = -1;
}
static int curPos, curT, jobId, running, quit, FRESH;
static void *helper(void *a) {
  int id = (int)(long)a; thread_init(id); int seen = 0;
  for (;;) {
    pthread_mutex_lock(&mu);
    while (jobId == seen && !quit) pthread_cond_wait(&jcv, &mu);
    seen = jobId; int part = id < curT;
    pthread_mutex_unlock(&mu);
    if (quit) return 0;
    if (!part) continue;
    if (FRESH) { for (int i = 0; i < 32 * 32; i++) histT[i] = 0; for (int i = 0; i < (MAXPLY + 8) * 2; i++) killer[i] = -1; }
    memcpy(IO, SETUP[curPos], sizeof(int) * ns[curPos]);
    simOn = 1;
    if (setup() > 1) for (int k = 0; k < 200 && !gStop; k++) best(60, 0, 0);
    sim_leave();
    pthread_mutex_lock(&mu); running--; pthread_cond_broadcast(&jcv); pthread_mutex_unlock(&mu);
  }
}
int main(int argc, char **argv) {
  FILE *f = fopen("pos.txt", "r"); char line[8192];
  while (fgets(line, sizeof line, f)) {
    char *p = line + 2; int *dst = line[0] == 'G' ? GEO : SETUP[npos]; int n = 0;
    for (char *t = strtok(p, " \n"); t; t = strtok(0, " \n")) dst[n++] = atoi(t);
    if (line[0] == 'G') ng = n; else ns[npos++] = n;
  }
  fclose(f);
  thread_init(0);
  memcpy(IO, GEO, sizeof(int) * ng); set_geometry();
  FILE *nf = fopen("evalnet.bin", "rb"); unsigned hdr[2]; if (fread(hdr, 4, 2, nf) != 2) return 1; int H = hdr[1];
  if (fread(NETW, 4, 71 * H + 2 * H + 1, nf) < 1) return 1; fclose(nf); net_on(H);
  int T[16], nt = 0, maxT = 1; for (char *t = strtok(argv[1], ","); t; t = strtok(0, ",")) { T[nt] = atoi(t); if (T[nt] > maxT) maxT = T[nt]; nt++; }
  double budget = atof(argv[2]) * 1e6; const char *onlyS = argc > 3 ? argv[3] : "-1"; int only = atoi(onlyS);
  JIT = argc > 4 ? atof(argv[4]) : 0; FRESH = argc > 5 ? atoi(argv[5]) : 0; MSPD = argc > 6 ? atof(argv[6]) : 1; LOCK = argc > 7 ? atoi(argv[7]) : 1; DELAY = argc > 8 ? atoi(argv[8]) : 0;
#ifdef BUSYSIM
  busyDelay = argc > 9 ? atoi(argv[9]) : 0;
#endif
  pthread_t th[64]; for (int h = 1; h < maxT; h++) pthread_create(&th[h], 0, helper, (void *)(long)h);
  double sumR[16] = {0}, lg[16] = {0}; int cnt = 0;
  for (int pi = 0; pi < npos; pi++) {
    if (only >= 0) { char k[8]; sprintf(k, ",%d,", pi); char l[64]; sprintf(l, ",%s,", onlyS); if (!strstr(l, k)) continue; }
    cnt++;
    simDelay = 0; gStop = 0; new_game(); memcpy(IO, SETUP[pi], sizeof(int) * ns[pi]); setup(); best(60, 0, budget);
    int D = IO[2]; printf("pos %d D%d |", pi + 1, D);
    double r1 = 0;
    for (int ti = 0; ti < nt; ti++) {
      int t = T[ti];
      for (int i = 0; i < 64; i++) if (allN[i]) { for (int k = 0; k < PH; k++) allX[i][k] = 0; *allN[i] = 0; }
      simDelay = DELAY && t > 1;
      new_game(); gStop = 0; carry = 0;
      pthread_mutex_lock(&mu); np = t; arrived = 0; rounds = 0; curPos = pi; curT = t; running = t - 1; jobId++; pthread_cond_broadcast(&jcv); pthread_mutex_unlock(&mu);
      simOn = t > 1;
      memcpy(IO, SETUP[pi], sizeof(int) * ns[pi]); setup(); best(D, 0, 0);
      double mainNodes = nodes; long R0 = rounds; int mv = IO[0], dd = IO[2];
      gStop = 1; if (t > 1) sim_leave(); simOn = 0;
      pthread_mutex_lock(&mu); while (running > 0) pthread_cond_wait(&jcv, &mu); pthread_mutex_unlock(&mu);
      double tm = t > 1 && LOCK ? (double)R0 * SIM_Q : mainNodes / MSPD; if (t == 1) r1 = tm;
      sumR[ti] += tm; lg[ti] += log(r1 / tm);
      printf(" t%d %.2fM x%.2f m%d d%d |", t, tm / 1e6, r1 / tm, mv, dd); fflush(stdout);
    }
    printf("\n");
  }
  printf("SUM");
  for (int ti = 0; ti < nt; ti++) printf(" t%d x%.2f (geo x%.2f)", T[ti], sumR[0] / sumR[ti], exp(lg[ti] / cnt));
  printf("\n");
  pthread_mutex_lock(&mu); quit = 1; pthread_cond_broadcast(&jcv); pthread_mutex_unlock(&mu);
  return 0;
}
