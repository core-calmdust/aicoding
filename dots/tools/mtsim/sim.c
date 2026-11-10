// Lock-step simulation of solver5.c's multi-thread schemes (dots5mt.wasm, engine.js X5M): every thread advances SIM_Q nodes
// per round, the clock is the round count (= nodes of one thread). With "delayed stores" (the default) a thread's table
// stores reach the others only at the end of the round: real concurrency, the threads cannot take turns and see each other's
// finished subtrees (morris/tools/mtsim: only that agreed with the Mac).
//   cc -O2 -DMT -DSIM -o sim sim.c -lpthread -lm ; node dump.js ../.. (pos.txt) ; ./sim <threads 1,2,4,8,14> [which] [delay 1/0] [bits]
//   which: "ai" (Lv.10 outcome proofs: old = separate tables and a static split, new = one shared table), "ana" (the analysis)
// The time of a job is the rounds until its answer (one thread: its nodes). Values are checked against one thread.
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#ifndef SIM_Q
#define SIM_Q 1024
#endif
#include "../../solver5.c"

static pthread_mutex_t mu = PTHREAD_MUTEX_INITIALIZER; static pthread_cond_t cv = PTHREAD_COND_INITIALIZER, jcv = PTHREAD_COND_INITIALIZER;
static int np, arrived; static long sgen, rounds;
static TLS int simOn, tid;
static int DELAY = 1, simDelay;
// ------------------------------------------------------------------ delayed stores
#define PMAX 8192
#define PH 16384
typedef struct { tent *slot; u64 k, d; } Pend;
static Pend *PB[64]; static int PN[64]; static u32 *PST[64], *PIX[64], PSTAMP[64];
static inline u32 phash(u64 key) { return (u32)((key * 0x9E3779B97F4A7C15ULL) >> 50) & (PH - 1); }
static void flush_one(int t) {
  for (int i = 0; i < PN[t]; i++) { Pend *q = &PB[t][i]; ST(&q->slot->d, q->d); ST(&q->slot->k, q->k); }
  PN[t] = 0; PSTAMP[t]++;
}
static int plook(u64 key) {   // index of this thread's pending entry for key, or -1 (linear probing, stamped)
  u32 h = phash(key);
  for (int j = 0; j < 64; j++, h = (h + 1) & (PH - 1)) {
    if (PST[tid][h] != PSTAMP[tid]) return -(int)h - 2;
    int i = PIX[tid][h]; Pend *q = &PB[tid][i];
    if (((q->k ^ q->d) & ~KMARK) == key) return i;
  }
  return -1;
}
static u64 *sim_pending(u64 key) {
  if (!simDelay || !simOn) return 0;
  int i = plook(key); return i >= 0 ? &PB[tid][i].d : 0;
}
static void sim_store(tent *slot, u64 k, u64 d) {
  if (!simDelay || !simOn) { ST(&slot->d, d); ST(&slot->k, k); return; }
  u64 key = (k ^ d) & ~KMARK; int i = plook(key);
  if (i >= 0) { PB[tid][i] = (Pend){ slot, k, d }; return; }
  if (PN[tid] >= PMAX || i == -1) { pthread_mutex_lock(&mu); flush_one(tid); pthread_mutex_unlock(&mu); i = plook(key); }
  int h = -i - 2; int n = PN[tid]++; PB[tid][n] = (Pend){ slot, k, d }; PST[tid][h] = PSTAMP[tid]; PIX[tid][h] = n;
}
// ------------------------------------------------------------------ lock step
static void flush_all(void) { if (simDelay) for (int t = 0; t < 64; t++) if (PB[t] && PN[t]) flush_one(t); }
static void advance(void) { flush_all(); arrived = 0; sgen++; rounds++; pthread_cond_broadcast(&cv); }
static void wait_round(void) { long g = sgen; if (++arrived >= np) advance(); else while (sgen == g) pthread_cond_wait(&cv, &mu); }
static void sim_tick(void) { if (!simOn) return; pthread_mutex_lock(&mu); wait_round(); pthread_mutex_unlock(&mu); }
static void sim_leave(void) { pthread_mutex_lock(&mu); if (simOn) { if (simDelay) flush_one(tid); np--; simOn = 0; if (np > 0 && arrived >= np) advance(); } pthread_mutex_unlock(&mu); }
static void sim_join(void) { pthread_mutex_lock(&mu); if (!simOn) { np++; simOn = 1; } pthread_mutex_unlock(&mu); }

// ------------------------------------------------------------------ jobs
#define MAXT 16
static tent *shared_tt; static int TTB = 22;
static tent *own_tt[MAXT];
typedef struct { u64 m; int kind, t, n, rem; i8 mv[MAXE]; } Job;
static Job J;
static int T_NOW, VARIANT;
// shared job state (under mu)
static int next_i, st[MAXE], rnd[MAXE], busy[MAXE], win_i, vals[MAXE], done_n, alphaS, bestS, first_done;
static double tnodes[MAXT]; static long finish_round[MAXT];
static long long B0 = 187500;   // a first slice of 25 ms at 7.5M nodes/s (the Mac's wasm)
static double CAP = 4.5e3 * 7500;   // the move's time for the proofs (Lv.10: 5 s less the reserve) in nodes
static int out_done;
static double clock_n(void) { if (T_NOW == 1) { double s = 0; for (int i = 0; i < MAXT; i++) s += tnodes[i]; return s; } return (double)rounds * SIM_Q; }
static void thread_init(int id, int separate) {
  tid = id;
  if (!PB[id]) { PB[id] = malloc(sizeof(Pend) * PMAX); PST[id] = calloc(PH, 4); PIX[id] = calloc(PH, 4); }
  PN[id] = 0; PSTAMP[id]++;
  u8 *lm = calloc(1, LM_SIZE); lm_at(lm);
  for (int i = 0; i < MAXE + 1; i++) killer[i] = -1;
  if (separate) { if (!own_tt[id]) own_tt[id] = calloc((size_t)1 << (id ? 21 : TTB), sizeof(tent)); tt_sim_attach(own_tt[id], id ? 21 : TTB); }
  else tt_sim_attach(shared_tt, TTB);
  myJob = gJob;
}
// the outcome proofs: claim the open move with the fewest workers, then the lowest slice round (one thread: the order of
// W5.sliced). Returns when a win is found or every move is proved.
static void out_loop(void) {
  for (;;) {
    pthread_mutex_lock(&mu);
    if (win_i >= 0) { pthread_mutex_unlock(&mu); return; }
    int pick = -1;
    for (int i = 0; i < J.n; i++) if (!st[i] && (pick < 0 || busy[i] < busy[pick] || (busy[i] == busy[pick] && rnd[i] < rnd[pick]))) pick = i;
    double left = CAP - clock_n();
    if (pick < 0 || left <= 0) { pthread_mutex_unlock(&mu); return; }
    int r = rnd[pick] + (VARIANT == 2 ? busy[pick] : 0); busy[pick]++;
    pthread_mutex_unlock(&mu);
    double b = (double)B0; for (int k = 0; k < r; k++) b *= 3;
    watch = &st[pick];
    limits(fmin(b, left), 0); int v = move_value(J.m, J.mv[pick], J.t - 1, J.t + 1); tnodes[tid] += nodes;
    watch = 0;
    pthread_mutex_lock(&mu);
    busy[pick]--;
    if (v != -999 && !st[pick]) { st[pick] = v > J.t ? 3 : v == J.t ? 2 : 1; if (v > J.t && win_i < 0) { win_i = pick; gJob++; } }
    else if (v == -999 && rnd[pick] < r + 1) rnd[pick] = r + 1;
    pthread_mutex_unlock(&mu);
    if (gJob != myJob) return;
  }
}
// separate tables (the current Lv.10 with helpers): this thread's static share, sliced on its own table
static void out_static(int me, int n) {
  i8 mine[MAXE]; int k = 0, ix[MAXE];
  for (int i = 0, j = 0; i < J.n; i++) if (!st[i]) { if (j % n == me) { mine[k] = J.mv[i]; ix[k++] = i; } j++; }
  int s2[MAXE] = { 0 }; double b = (double)B0;
  for (;;) {
    int open = 0;
    for (int i = 0; i < k; i++) {
      if (s2[i]) continue;
      if (win_i >= 0) return;
      double left = CAP - clock_n(); if (left <= 0) return;
      limits(fmin(b, left), 0); int v = move_value(J.m, mine[i], J.t - 1, J.t + 1); tnodes[tid] += nodes;
      if (v == -999) { open++; continue; }
      s2[i] = 1; pthread_mutex_lock(&mu); st[ix[i]] = v > J.t ? 3 : v == J.t ? 2 : 1; if (v > J.t && win_i < 0) { win_i = ix[i]; pthread_cond_broadcast(&jcv); } pthread_mutex_unlock(&mu);
      if (v > J.t) return;
    }
    if (!open) return;
    b *= 3;
  }
}
// exact best margin (every move loses): root split with a shared alpha. The lead solves the first (table) move with the full
// window while the others wait (young brothers wait); then every thread takes the next move: a null window at the shared
// alpha, the full window above it when the move fails high.
static int best_par(int lead) {
  if (lead) {
    pthread_mutex_lock(&mu); next_i = 1; pthread_mutex_unlock(&mu);
    limits(0, 0); int v = move_value(J.m, J.mv[0], -J.rem - 1, J.rem + 1); tnodes[tid] += nodes;
    pthread_mutex_lock(&mu); alphaS = v; bestS = J.mv[0]; first_done = 1; pthread_cond_broadcast(&jcv); pthread_mutex_unlock(&mu);
  } else {
    sim_leave();   // (waiting: not on the clock)
    pthread_mutex_lock(&mu); while (!first_done) pthread_cond_wait(&jcv, &mu); pthread_mutex_unlock(&mu);
    sim_join();
  }
  for (;;) {
    pthread_mutex_lock(&mu); int i = next_i++, a = alphaS; pthread_mutex_unlock(&mu);
    if (i >= J.n) break;
    limits(0, 0); int v = move_value(J.m, J.mv[i], a, a + 1); tnodes[tid] += nodes;
    while (v > a) {
      limits(0, 0); v = move_value(J.m, J.mv[i], a, J.rem + 1); tnodes[tid] += nodes;
      pthread_mutex_lock(&mu); if (v > alphaS) { alphaS = v; bestS = J.mv[i]; a = v; } else a = alphaS; pthread_mutex_unlock(&mu);
      break;
    }
  }
  return alphaS;
}
// the analysis: the lead's best move first (the bounds make the full windows cheap), then every move's exact value by a counter
static void ana_loop(int lead) {
  if (lead && VARIANT != 1) { int bm, pbm, pbv; limits(0, 0); best_of(J.m, -1, &bm, &pbm, &pbv); tnodes[tid] += nodes; }
  for (;;) {
    pthread_mutex_lock(&mu); int i = next_i++; pthread_mutex_unlock(&mu);
    if (i >= J.n) break;
    limits(0, 0); int v = move_value(J.m, J.mv[i], -J.rem - 1, J.rem + 1); tnodes[tid] += nodes;
    pthread_mutex_lock(&mu); vals[i] = v; done_n++; pthread_mutex_unlock(&mu);
  }
}
static int SEPARATE, PHASE;   // PHASE (ai): 0 the outcome proofs, then (lead) the margin
static long out_end;
static void run_thread(int id) {
  thread_init(id, SEPARATE);
  if (T_NOW > 1) sim_join();
  if (J.kind == 1) ana_loop(id == 0);
  else {
    if (SEPARATE) {   // (the lead waits for every helper's answer, or a win)
      out_static(id, T_NOW);
      pthread_mutex_lock(&mu); out_done++; pthread_cond_broadcast(&jcv); pthread_mutex_unlock(&mu);
      if (id == 0 && T_NOW > 1) { sim_leave(); pthread_mutex_lock(&mu); while (out_done < T_NOW && win_i < 0) pthread_cond_wait(&jcv, &mu); pthread_mutex_unlock(&mu); sim_join(); }
    } else out_loop();
    // all lost: the margin
    pthread_mutex_lock(&mu); int all = win_i < 0; for (int i = 0; i < J.n; i++) if (st[i] != 1) all = 0; pthread_mutex_unlock(&mu);
    if (id == 0) { out_end = rounds; }
    if (all) {
      if (SEPARATE || VARIANT == 3) { if (id == 0) { int bm, pbm, pbv; limits(0, 0); alphaS = best_of(J.m, -1, &bm, &pbm, &pbv); bestS = bm; tnodes[tid] += nodes; } }
      else best_par(id == 0);
    }
  }
  finish_round[id] = rounds;
  if (T_NOW > 1) sim_leave();
}
static void *thr(void *a) { run_thread((int)(long)a); return 0; }
static double run_job(int T) {
  T_NOW = T; next_i = 0; out_done = 0; win_i = -1; done_n = 0; first_done = 0; alphaS = -100; bestS = -1;
  for (int i = 0; i < MAXE; i++) { st[i] = rnd[i] = busy[i] = 0; vals[i] = -999; }
  for (int i = 0; i < MAXT; i++) { tnodes[i] = 0; finish_round[i] = 0; }
  if (!SEPARATE) memset(shared_tt, 0, sizeof(tent) << TTB);
  else for (int i = 0; i < MAXT; i++) if (own_tt[i]) memset(own_tt[i], 0, sizeof(tent) << (i ? 21 : TTB));
  simDelay = DELAY && T > 1; rounds = 0; arrived = 0; np = 0; gJob = 1;
  if (J.kind == 0 && SEPARATE && T > 1) {   // the current scheme: the lead alone first (200 ms, sliced), then the static split
    thread_init(0, 1); double b = (double)B0, left = 200 * 7500.0; int open = J.n;
    while (open && left > 0 && win_i < 0) {
      open = 0;
      for (int i = 0; i < J.n && left > 0; i++) {
        if (st[i]) continue;
        limits(fmin(b, left), 0); int v = move_value(J.m, J.mv[i], J.t - 1, J.t + 1); tnodes[0] += nodes; left -= nodes; rounds += (long)(nodes / SIM_Q);
        if (v == -999) { open++; continue; }
        st[i] = v > J.t ? 3 : v == J.t ? 2 : 1; if (v > J.t) { win_i = i; break; }
      }
      b *= 3;
    }
  }
  pthread_t th[MAXT];
  long r0 = rounds;
  if (win_i < 0 || J.kind) {
    for (int i = 1; i < T; i++) pthread_create(&th[i], 0, thr, (void *)(long)i);
    run_thread(0);
    for (int i = 1; i < T; i++) pthread_join(th[i], 0);
  }
  if (T == 1) return tnodes[0];
  if (win_i >= 0 && !J.kind && SEPARATE && rounds == r0) return (double)rounds * SIM_Q;   // (a win in the lead's first try)
  long mx = 0; for (int i = 0; i < T; i++) if (finish_round[i] > mx) mx = finish_round[i];
  return (double)(J.kind == 1 ? mx : finish_round[0]) * SIM_Q;
}
int main(int argc, char **argv) {
  int TH[16], nt = 0; char *ts = argc > 1 ? argv[1] : "1,2,4,8,14";
  for (char *t = strtok(ts, ","); t; t = strtok(0, ",")) TH[nt++] = atoi(t);
  const char *which = argc > 2 ? argv[2] : "ai";
  DELAY = argc > 3 ? atoi(argv[3]) : 1; if (argc > 4) TTB = atoi(argv[4]);
  const char *vars = argc > 5 ? argv[5] : "";
  setup(5, 5);
  shared_tt = calloc((size_t)1 << TTB, sizeof(tent));
  FILE *f = fopen("pos.txt", "r"); char line[4096]; int pi = 0;
  double sum[8][16] = { { 0 } }, sumW[8][16] = { { 0 } }; int nvar = 0;
  while (fgets(line, sizeof line, f)) {
    int kind = line[0] == 'N'; pi++;
    if ((kind && strcmp(which, "ana")) || (!kind && strcmp(which, "ai"))) continue;
    if (getenv("ONLY")) { char k[16], l[128]; sprintf(k, ",%d,", pi); snprintf(l, sizeof l, ",%s,", getenv("ONLY")); if (!strstr(l, k)) continue; }
    u64 m = 0; for (char *t = strtok(line + 2, " \n"); t; t = strtok(0, " \n")) m |= 1ULL << atoi(t);
    J.m = m; J.kind = kind; J.t = 0; set_pos(m); J.rem = B - filled;
    if (kind) { J.n = 0; for (int e = 0; e < E; e++) if (!((m >> e) & 1)) J.mv[J.n++] = (i8)e; }
    else J.n = root_moves(m, J.mv);
    // variants: ai: 0 old (separate tables), 1 shared (fewest workers first), 2 shared (a busy move's helper: the next slice), 3 shared + lead-only margin
    //           ana: 0 lead best first, 1 no best first
    int VS[8], nv = 0;
    if (*vars) { char vb[64]; strcpy(vb, vars); for (char *t = strtok(vb, ","); t; t = strtok(0, ",")) VS[nv++] = atoi(t); }
    else if (kind) { VS[nv++] = 0; VS[nv++] = 1; } else { VS[nv++] = 0; VS[nv++] = 1; VS[nv++] = 2; VS[nv++] = 3; }
    nvar = nv;
    printf("%s%d (%d moves)\n", kind ? "ana" : "ai", pi, J.n);
    int ref[MAXE]; int refA = 0, refB = -1; double base = 0;
    for (int vi = 0; vi < nv; vi++) {
      VARIANT = VS[vi]; SEPARATE = !kind && VARIANT == 0;
      printf("  v%d:", VARIANT);
      for (int ti = 0; ti < nt; ti++) {
        int T = TH[ti];
        if (T == 1 && vi > 0 && !(kind == 1 && VARIANT == 1)) { printf(" t1 =|"); sum[vi][ti] += base; sumW[vi][ti] += base; continue; }
        double tm = run_job(T); double all = 0; for (int i = 0; i < T; i++) all += tnodes[i];
        if (T == 1 && vi == 0) base = tm;
        sum[vi][ti] += tm; sumW[vi][ti] += all;
        // check
        const char *ok = "";
        if (kind) {
          if (T == 1 && vi == 0) memcpy(ref, vals, sizeof ref);
          else for (int i = 0; i < J.n; i++) if (vals[i] != ref[i]) ok = " DIFF";
        } else {
          int all1 = win_i < 0; for (int i = 0; i < J.n; i++) if (st[i] != 1) all1 = 0;
          int res = win_i >= 0 ? 1000 : all1 ? alphaS : -1000;
          if (T == 1 && vi == 0) { refA = res; refB = bestS; } else if (res != refA) ok = " DIFF";
          (void)refB;
        }
        int pv = 0; if (!kind) for (int i = 0; i < J.n; i++) if (st[i]) pv++;
        if (kind) printf(" t%d %.2fM (all %.2fM)%s |", T, tm / 1e6, all / 1e6, ok);
        else printf(" t%d %.2fM %s%d/%d (all %.2fM)%s |", T, tm / 1e6, win_i >= 0 ? "win " : "", pv, J.n, all / 1e6, ok);
        fflush(stdout);
      }
      printf("\n");
    }
  }
  for (int vi = 0; vi < nvar; vi++) {
    printf("SUM v%d:", vi);
    for (int ti = 0; ti < nt; ti++) printf(" t%d %.2fM x%.2f work x%.2f |", TH[ti], sum[vi][ti] / 1e6, sum[0][0] / sum[vi][ti], sumW[vi][ti] / sum[0][0]);
    printf("\n");
  }
  return 0;
}
