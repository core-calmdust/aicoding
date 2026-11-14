// sim.c hooks for mancala (2026-11-14; engine.c: search() and the root's loops mc_rootbest / mc_rootvalues, Praline's YBW under
// -DMT). The clock counts the search's nodes (SIM_NODE() in search()). Positions: pos_mancala.txt (dump.js mancala): the
// 14 pits / stores, the side to move, the rule (engine.c R_*). The job is the time-limited levels' (engine.js think): iterative
// deepening of mc_rootbest from depth 1, the table fixed (mc_ttfix 1) as the levels by time / the analysis.
#include <time.h>
double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec * 1e3 + t.tv_nsec / 1e6; }
#include "eng_mancala.c"
static int gSide, gRule; static u8 gB[14];
static void g_global_init(void) {}
static void g_thread_init(int id) { threadId = id; }
static void g_fresh(void) {}
static void g_setup(const int *io, int n) { for (int i = 0; i < 14; i++) gB[i] = (u8)io[i]; gSide = io[14]; gRule = io[15]; (void)n; }
static void g_newgame(void) { mc_ttclear(); }
static void g_prep(void) { for (int i = 0; i < 14; i++) BRD[i] = gB[i]; mc_setup(gRule); mc_ttfix(1); mc_begin(0); }
// (the depth one thread reaches with nb nodes)
static int g_budget(double nb, int *mv) {
  g_prep(); mc_nodelimit(nb); int prev = -1, D = 0;
  for (int d = 1; d <= 60; d++) { if (mc_rootbest(gSide, d, prev, 0) < 0) break; prev = OUTM[0]; D = d; if (OUTX[0]) break; }
  mc_nodelimit(0); *mv = prev; return D;
}
static void g_main(int D, int *mv, int *dd, double *nn) {
  g_prep(); int prev = -1, d = 1;
  for (; d <= D; d++) { if (mc_rootbest(gSide, d, prev, 0) < 0) break; prev = OUTM[0]; if (OUTX[0]) break; }
  *mv = prev; *dd = d > D ? D : d; *nn = nodes;
}
static void g_helper(void) { mt_idle(0, 1); }
