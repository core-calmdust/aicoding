// sim.c hooks for agon (2026-11-11; core.c: search() and the root's loops ab_best / ab_values, Praline's YBW under -DMT).
// The clock counts the search's nodes (SIM_NODE() in search() and qsearch()). Positions: pos_agon.txt (agon/tools/mtsim_pos.js).
#include <time.h>
double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec * 1e3 + t.tv_nsec / 1e6; }
#include "eng_agon.c"
#define G_GEO (N * 6 + N + 37)
#define G_ZT (12 * N + 34)
static void g_global_init(void) {}
static void g_thread_init(int id) { threadId = id; }
static void g_fresh(void) { kclear(); }
static void g_setup(const int *io, int n) {
  for (int i = 0; i < G_GEO; i++) GEO[i] = io[i];
  for (int i = 0; i < G_ZT; i++) ZT[i] = (u32)io[G_GEO + i];
  setup();
  const int *b = io + G_GEO + G_ZT;
  for (int i = 0; i < N; i++) { SQ[i] = (i8)b[i]; CAP[i] = (i8)b[N + i]; }
  b += 2 * N;
  IO[8] = b[0]; IO[9] = b[1]; IO[10] = b[2]; IO[11] = b[3]; IO[12] = b[4]; IO[14] = b[5]; IO[15] = b[6]; IO[16] = b[7]; IO[17] = b[8]; IO[13] = b[9];
  for (int i = 0; i < b[9]; i++) { RH1[i] = (u32)b[10 + 2 * i]; RH2[i] = (u32)b[11 + 2 * i]; }
  (void)n;
}
static void g_newgame(void) { ttclear(); kclear(); }
static int g_budget(double nb, int *mv) { setn(0, nb, 0); tEnd = 1e300; kclear(); ab_threads(1); ab_best(60); *mv = IO[0]; return IO[2]; }
static void g_main(int D, int *mv, int *dd, double *nn) { setn(0, 1e300, 0); tEnd = 1e300; kclear(); ab_threads(simNT); ab_best(D); *mv = IO[0]; *dd = IO[2]; *nn = nodes; }
static void g_helper(void) { mt_idle(0, 1); }
