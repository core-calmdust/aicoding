// sim.c hooks for amazons (2026-11-11; core.c: the alpha-beta search ab_*, Praline's YBW). The clock counts evaluations (gen.py
// puts SIM_NODE() in ev(): a node of this search costs from 1 to ~400 of them), so "nodes" below are evaluations.
// The positions (pos_amazons.txt, amazons/tools/mtsim_pos.js): 100 squares, the 8 amazons, the side, the keys, the root list.
#include <time.h>
double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec * 1e3 + t.tv_nsec / 1e6; }
#include "eng_amazons.c"
static void g_global_init(void) { init(); initBB(); }
static void g_thread_init(int id) { mt_thread_native(id); }
static void g_fresh(void) {}
static void g_setup(const int *io, int n) {
  for (int i = 0; i < NN; i++) SQ[i] = (i8)io[i];
  for (int k = 0; k < 8; k++) Q[k] = (i8)io[NN + k];
  int nr = io[NN + 11]; for (int j = 0; j < nr; j++) { RLM[j] = io[NN + 12 + 2 * j]; RLS[j] = io[NN + 13 + 2 * j]; }
  ab_root(io[NN + 8], (double)(unsigned)io[NN + 9], (double)(unsigned)io[NN + 10], nr); (void)n;
}
static void g_newgame(void) { ab_newgame(); }
static int g_budget(double evB, int *mv) { ab_sync(0, 0, 1e300, evB, 0, 1); ab_best(40); *mv = (int)AR[0]; return (int)AR[2]; }
static void g_main(int D, int *mv, int *dd, double *nn) { ab_sync(0, 0, 1e300, 1e300, 0, simNT); ab_best(D); *mv = (int)AR[0]; *dd = (int)AR[2]; *nn = ab_evals(); }
static void g_helper(void) { mt_idle(0, 1); }
#ifdef SIM_STAT   /* (-DSIM_STAT: the split points' counters per thread count, summed over the positions) */
static double gst[16][8]; static int gstN, gstT[16];
#define G_STAT(t, R0) do { int k_ = 0; while (k_ < gstN && gstT[k_] != (t)) k_++; if (k_ == gstN) gstT[gstN++] = (t); for (int q_ = 0; q_ < 7; q_++) gst[k_][q_] += ST[q_]; gst[k_][7] += (double)(R0) * (t); for (int q_ = 0; q_ < 16; q_++) ST[q_] = 0; } while (0)
#define G_STAT_SUM() do { for (int k_ = 0; k_ < gstN; k_++) if (gstT[k_] > 1) printf("t%d: splits %.0f, helper joins %.0f (moves/join %.1f), empty joins %.0f, idle %.1f%%, owners waiting %.1f%%, second searches %.0f\n", gstT[k_], gst[k_][0], gst[k_][1], gst[k_][2] / (gst[k_][1] > 0 ? gst[k_][1] : 1), gst[k_][3], 100 * gst[k_][4] / gst[k_][7], 100 * gst[k_][5] / gst[k_][7], gst[k_][6]); } while (0)
#endif
