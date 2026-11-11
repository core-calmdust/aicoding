// Lockstep simulation of engine_mt (Lazy SMP), as morris/tools/mtsim/sim.c: every thread advances about SIM_Q nodes per
// round; the clock is the round count. Helpers persist across jobs (as the page's pool) and call best(99, 0, 0) again and
// again, as mt-helper.js. Usage (eng_sim.c: gen.py; pos.txt: dump.js; evalnet.bin, egdb4.bin: gunzip of the repo's files):
//   sim <threads list> <budget1 Mnodes> [pos|-1] [delayed stores 0/1] [delayed busy marks 0/1]
// The time to the depth D one thread reaches with the budget, for each thread count, in rounds (= main-thread nodes).
// Use "1 1" at the end (delayed stores and marks, "truly concurrent"): only that agreed with the Mac for morris (2026-11-10).
#include <pthread.h>
#include <math.h>
#include "eng_sim.c"
#include <sys/mman.h>
#include <fcntl.h>
#include <unistd.h>
static pthread_mutex_t mu = PTHREAD_MUTEX_INITIALIZER; static pthread_cond_t cv = PTHREAD_COND_INITIALIZER, jcv = PTHREAD_COND_INITIALIZER;
static int np, arrived; static long sgen; static long rounds;
static TLS int simOn;
static PendE *allPend[64]; static int *allN[64], *allX[64];
static void flushAll(void) { if (!simDelay) return; for (int i = 0; i < 64; i++) if (allPend[i] && *allN[i]) { flushPend(allPend[i], *allN[i], allX[i]); *allN[i] = 0; } }
static void wait_round(void) {
  long g = sgen; arrived++;
  if (arrived >= np) { flushAll(); arrived = 0; sgen++; rounds++; pthread_cond_broadcast(&cv); }
  else while (sgen == g) pthread_cond_wait(&cv, &mu);
}
static void sim_tick(void) {
  if (!simOn) return;
  pthread_mutex_lock(&mu);
#ifdef HAVE_BUSY
  busyFlushMine();
#endif
  wait_round();
  pthread_mutex_unlock(&mu);
}
static void sim_leave(void) {
  pthread_mutex_lock(&mu); np--; simOn = 0;
  if (np > 0 && arrived >= np) { flushAll(); arrived = 0; sgen++; rounds++; pthread_cond_broadcast(&cv); }
  pthread_mutex_unlock(&mu);
}
static int SETUP[32][2100], ns[32], npos;
#ifdef SIM_STAT
static double gst[16][8]; static int gstN, gstT[16];
#endif
static void thread_init(int id) {
  threadId = id;
  { const char *e = getenv("SIM_SLOW"); if (e && *e && id >= atoi(e)) simQT = SIM_Q * 2 / 5; }   // (2026-11-11: slow cores, the threads k, k+1, …)
  pend = malloc(sizeof(PendE) * PEND_MAX); npend = 0; pidx = calloc(PH, sizeof(int)); allPend[id] = pend; allN[id] = &npend; allX[id] = pidx;
  ACC2 = aligned_alloc(64, sizeof(i16) * (MAXPLY + 4) * 2 * N2_HMAX); ACC = aligned_alloc(64, sizeof(float) * (MAXPLY + 4) * 2 * NH_MAX);
  initGeo(); initCB();
}
static int curPos, curT, jobId, running, quit;
static void *helper(void *a) {
  int id = (int)(long)a; thread_init(id); int seen = 0;
  for (;;) {
    pthread_mutex_lock(&mu);
    while (jobId == seen && !quit) pthread_cond_wait(&jcv, &mu);
    seen = jobId; int part = id < curT;
    pthread_mutex_unlock(&mu);
    if (quit) return 0;
    if (!part) continue;
    memcpy(IO, SETUP[curPos], sizeof(int) * ns[curPos]);
    simOn = 1;
#ifdef MT_YBW   /* (2026-11-11, YBW: the helpers wait for split points, as mt-helper.js) */
    setup(); mt_idle(0, 1);
#else
    if (setup()) for (int k = 0; k < 200 && !gStop; k++) best(99, 0, 0);
#endif
    sim_leave();
    pthread_mutex_lock(&mu); running--; pthread_cond_broadcast(&jcv); pthread_mutex_unlock(&mu);
  }
}
static void egLoad(const char *fn) {
  int fd = open(fn, O_RDONLY); if (fd < 0) { fprintf(stderr, "no egdb %s\n", fn); return; }
  off_t len = lseek(fd, 0, SEEK_END);
  const u8 *m = mmap(0, (size_t)len, PROT_READ, MAP_SHARED, fd, 0); close(fd);
  if (m == MAP_FAILED || memcmp(m, "CKDB", 4)) { fprintf(stderr, "bad egdb %s\n", fn); return; }
  u32 nc; memcpy(&nc, m + 4, 4); const u8 *d = m + 8 + (size_t)nc * 8;
  for (u32 i = 0; i < nc; i++) { const u8 *h = m + 8 + (size_t)i * 8; u32 l; memcpy(&l, h + 4, 4); if (h[0] + h[1] + h[2] + h[3] <= DBMAX) eg_add(h[0], h[1], h[2], h[3], d); d += l; }
}
int main(int argc, char **argv) {
  FILE *f = fopen("pos.txt", "r"); static char line[65536];
  while (fgets(line, sizeof line, f)) {
    int n = 0;
    for (char *t = strtok(line + 2, " \n"); t; t = strtok(0, " \n")) SETUP[npos][n++] = (int)strtoll(t, 0, 10);
    ns[npos++] = n;
  }
  fclose(f);
  thread_init(0);
  FILE *nf = fopen("evalnet.bin", "rb"); int len = (int)fread(N2BUF, 1, sizeof(N2BUF), nf); fclose(nf);
  if (!net2_load(len)) { fprintf(stderr, "bad net\n"); return 1; }
  egLoad("egdb4.bin");
  int T[16], nt = 0, maxT = 1; for (char *t = strtok(argv[1], ","); t; t = strtok(0, ",")) { T[nt] = atoi(t); if (T[nt] > maxT) maxT = T[nt]; nt++; }
  double budget = atof(argv[2]) * 1e6; const char *onlyS = argc > 3 ? argv[3] : "-1"; int only = atoi(onlyS);
  int DELAY = argc > 4 ? atoi(argv[4]) : 1;
#ifdef HAVE_BUSY
  busyDelay = argc > 5 ? atoi(argv[5]) : 1;
#endif
  pthread_t th[64]; for (int h = 1; h < maxT; h++) pthread_create(&th[h], 0, helper, (void *)(long)h);
  double sumR[16] = {0}, lg[16] = {0}; int cnt = 0;
  for (int pi = 0; pi < npos; pi++) {
    if (only >= 0) { char k[8]; sprintf(k, ",%d,", pi); char l[64]; sprintf(l, ",%s,", onlyS); if (!strstr(l, k)) continue; }
    cnt++;
    simDelay = 0; gStop = 0; new_game(); memcpy(IO, SETUP[pi], sizeof(int) * ns[pi]); setup(); best_n(99, 0, (int)budget);
    int D = IO[3]; printf("pos %d D%d |", pi + 1, D);
    double r1 = 0;
    for (int ti = 0; ti < nt; ti++) {
      int t = T[ti];
      for (int i = 0; i < 64; i++) if (allN[i]) { for (int k = 0; k < PH; k++) allX[i][k] = 0; *allN[i] = 0; }
      simDelay = DELAY && t > 1;
      new_game(); gStop = 0;
      pthread_mutex_lock(&mu); np = t; arrived = 0; rounds = 0; curPos = pi; curT = t; running = t - 1; jobId++; pthread_cond_broadcast(&jcv); pthread_mutex_unlock(&mu);
      simOn = t > 1;
      memcpy(IO, SETUP[pi], sizeof(int) * ns[pi]); setup(); best_n(D, 0, 0);
      double mainNodes = (double)nodes; long R0 = rounds; int mv = IO[0], dd = IO[3];
      gStop = 1; if (t > 1) sim_leave(); simOn = 0;
      pthread_mutex_lock(&mu); while (running > 0) pthread_cond_wait(&jcv, &mu); pthread_mutex_unlock(&mu);
      double tm = t > 1 ? (double)R0 * SIM_Q : mainNodes; if (t == 1) r1 = tm;
      if (r1 >= 1e5) { sumR[ti] += tm; lg[ti] += log(r1 / (tm > 1 ? tm : 1)); }   // (positions that need almost no search — a forced line, a table hit — left out)
      printf(" t%d %.2fM x%.2f m%d d%d |", t, tm / 1e6, r1 / tm, mv, dd); fflush(stdout);
#ifdef SIM_STAT   /* (-DSIM_STAT: the split points' counters, summed over the positions) */
      { int k_ = 0; while (k_ < gstN && gstT[k_] != t) k_++; if (k_ == gstN) gstT[gstN++] = t; for (int q_ = 0; q_ < 7; q_++) gst[k_][q_] += ST[q_]; gst[k_][7] += (double)R0 * t; for (int q_ = 0; q_ < 16; q_++) ST[q_] = 0; }
#endif
    }
    printf("\n");
    if (r1 < 1e5) cnt--;
  }
#ifdef SIM_STAT
  for (int k_ = 0; k_ < gstN; k_++) if (gstT[k_] > 1) printf("t%d: splits %.0f, helper joins %.0f (moves/join %.1f), empty joins %.0f, idle %.1f%%, owners waiting %.1f%%, second searches %.0f\n", gstT[k_], gst[k_][0], gst[k_][1], gst[k_][2] / (gst[k_][1] > 0 ? gst[k_][1] : 1), gst[k_][3], 100 * gst[k_][4] / gst[k_][7], 100 * gst[k_][5] / gst[k_][7], gst[k_][6]);
#endif
  printf("SUM");
  for (int ti = 0; ti < nt; ti++) printf(" t%d x%.2f (geo x%.2f)", T[ti], sumR[0] / sumR[ti], exp(lg[ti] / cnt));
  printf("\n");
  pthread_mutex_lock(&mu); quit = 1; pthread_cond_broadcast(&jcv); pthread_mutex_unlock(&mu);
  return 0;
}
