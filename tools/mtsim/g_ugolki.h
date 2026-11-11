// sim.c hooks for ugolki (2026-11-11; core.c: search() and the root's loops ab_best / ab_values, Praline's YBW under -DMT).
// The clock counts the search's nodes (SIM_NODE() in search()). Positions: pos_ugolki.txt (ugolki/tools/mtsim_pos.js).
#include <time.h>
double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec * 1e3 + t.tv_nsec / 1e6; }
#include "eng_ugolki.c"
static void g_global_init(void) {}
static void g_thread_init(int id) { threadId = id; }
static void g_fresh(void) { kclear(); }
static void g_setup(const int *io, int n) {
  setup(io[0], io[1], io[2], io[3], io[4]);
  for (int i = 0; i < 258; i++) ZT[i] = (u32)io[5 + i];
  const int *b = io + 263;
  for (int i = 0; i < 64; i++) SQ[i] = (i8)b[i];
  IO[8] = b[64]; IO[9] = b[65]; IO[10] = b[66]; IO[11] = b[67]; IO[12] = b[68]; IO[13] = b[69];
  for (int i = 0; i < b[69]; i++) { RH1[i] = (u32)b[70 + 2 * i]; RH2[i] = (u32)b[71 + 2 * i]; }
  (void)n;
}
static void g_newgame(void) { ttclear(); kclear(); }
static int g_budget(double nb, int *mv) { setn(0, nb, 0); tEnd = 1e300; kclear(); ab_threads(1); ab_best(60); *mv = IO[0]; return IO[2]; }
static void g_main(int D, int *mv, int *dd, double *nn) { setn(0, 1e300, 0); tEnd = 1e300; kclear(); ab_threads(simNT); ab_best(D); *mv = IO[0]; *dd = IO[2]; *nn = nodes; }
static void g_helper(void) { mt_idle(0, 1); }
// (no -DSIM_STAT here: Praline's counters ST clash with the engine's stack ST)
