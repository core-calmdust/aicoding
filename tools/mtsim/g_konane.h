// sim.c hooks for konane (2026-11-11; core.c: search() and the root's loops ab_best / ab_values, Praline's YBW under -DMT).
// The clock counts the search's nodes (SIM_NODE() in search()). Positions: pos_konane.txt (konane/tools/mtsim_pos.js).
#include <time.h>
double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec * 1e3 + t.tv_nsec / 1e6; }
#include "eng_konane.c"
static void g_global_init(void) {}
static void g_thread_init(int id) { threadId = id; }
static void g_fresh(void) { kclear(); }
static void g_setup(const int *io, int n) {
  int b = io[0]; for (int i = 0; i < 402; i++) ZT[i] = (u32)io[1 + i];
  setup(b);
  const int *q = io + 403;
  for (int i = 0; i < b * b; i++) SQ[i] = (i8)q[i];
  q += b * b; IO[8] = q[0]; IO[9] = q[1]; IO[10] = q[2]; IO[11] = q[3];
  (void)n;
}
static void g_newgame(void) { ttclear(); kclear(); }
static int g_budget(double nb, int *mv) { setn(0, nb, 0); tEnd = 1e300; kclear(); ab_threads(1); ab_best(60); *mv = IO[0]; return IO[2]; }
static void g_main(int D, int *mv, int *dd, double *nn) { setn(0, 1e300, 0); tEnd = 1e300; kclear(); ab_threads(simNT); ab_best(D); *mv = IO[0]; *dd = IO[2]; *nn = nodes; }
static void g_helper(void) { mt_idle(0, 1); }
