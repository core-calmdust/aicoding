// sim.c hooks for tafl (2026-11-11; engine.c: setup() from IO, bestN(maxDepth, ms, nodes); the Copenhagen net net_tafl.bin)
#include "eng_tafl.c"
static void g_global_init(void) {
  FILE *f = fopen("net_tafl.bin", "rb"); if (!f) { fprintf(stderr, "no net\n"); exit(1); }
  int len = (int)fread(nnBuf, 1, sizeof nnBuf, f); fclose(f);
  if (!nn_load(len)) { fprintf(stderr, "net\n"); exit(1); }
  nn_enable(1);
}
static void g_thread_init(int id) { threadId = id; }
static void g_fresh(void) { memset(hist, 0, sizeof hist); memset(histT, 0, sizeof histT); memset(killers, 0, sizeof killers); }
static void g_setup(const int *io, int n) { memcpy(IO, io, sizeof(int) * n); if (!setup()) { fprintf(stderr, "setup\n"); exit(1); } }
static void g_newgame(void) { new_game(); }
static int g_budget(double nodesB, int *mv) { bestN(99, 0, (u64)nodesB); *mv = IO[0]; return IO[3]; }
static void g_main(int D, int *mv, int *dd, double *nn) { bestN(D, 0, 0); *mv = IO[0]; *dd = IO[3]; *nn = (double)nodes; }
#ifdef MT_YBW   /* (YBW: the helpers wait for split points, as mt-helper.js) */
static void g_helper(void) { mt_idle(0, 1); }
#else
static void g_helper(void) { for (int k = 0; k < 200 && !gStop; k++) bestN(99, 0, 0); }
#endif
#ifdef SIM_STAT   /* (-DSIM_STAT: the split points' counters per thread count, summed over the positions) */
static double gst[16][8]; static int gstN, gstT[16];
#define G_STAT(t, R0) do { int k_ = 0; while (k_ < gstN && gstT[k_] != (t)) k_++; if (k_ == gstN) gstT[gstN++] = (t); for (int q_ = 0; q_ < 7; q_++) gst[k_][q_] += ST[q_]; gst[k_][7] += (double)(R0) * (t); for (int q_ = 0; q_ < 16; q_++) ST[q_] = 0; } while (0)
#define G_STAT_SUM() do { for (int k_ = 0; k_ < gstN; k_++) if (gstT[k_] > 1) printf("t%d: splits %.0f, helper joins %.0f (moves/join %.1f), empty joins %.0f, idle %.1f%%, owners waiting %.1f%%, second searches %.0f\n", gstT[k_], gst[k_][0], gst[k_][1], gst[k_][2] / (gst[k_][1] > 0 ? gst[k_][1] : 1), gst[k_][3], 100 * gst[k_][4] / gst[k_][7], 100 * gst[k_][5] / gst[k_][7], gst[k_][6]); } while (0)
#endif
