// sim.c hooks for xiangqi / janggi (engine.c: setup() from IO, best(maxDepth, ms, nodeK)); NNUE for xiangqi (net_xiangqi.bin)
#ifdef JANGGI
#include "eng_janggi.c"
#else
#include "eng_xiangqi.c"
#endif
#include <stdio.h>
static void g_global_init(void) {
#ifndef JANGGI
  FILE *f = fopen("net_xiangqi.bin", "rb"); if (!f) { fprintf(stderr, "no net\n"); exit(1); }
  int hdr[3]; if (fread(hdr, 4, 3, f) != 3 || hdr[1] != XQ_H || hdr[2] != XQ_IN) { fprintf(stderr, "net size\n"); exit(1); }
  if (fread(xqW1, 2, XQ_IN * XQ_H, f) != XQ_IN * XQ_H || fread(xqB1, 4, XQ_H, f) != XQ_H || fread(xqW2, 2, 2 * XQ_H, f) != 2 * XQ_H || fread(&xqB2, 4, 1, f) != 1) { fprintf(stderr, "net\n"); exit(1); }
  fclose(f);
#endif
}
static void g_thread_init(int id) {
  threadId = id; initGeo(); initEval();
#ifndef JANGGI
  xq_nnue(1);
#endif
}
static void g_fresh(void) { memset(hist, 0, sizeof hist); memset(killers, 0, sizeof killers); }
static void g_setup(const int *io, int n) { memcpy(IO, io, sizeof(int) * n); if (!setup()) { fprintf(stderr, "setup\n"); exit(1); } }
static void g_newgame(void) { new_game(); }
static int g_budget(double nodesB, int *mv) { best(99, 0, (int)(nodesB / 1000)); *mv = IO[0]; return IO[2]; }
static void g_main(int D, int *mv, int *dd, double *nn) { best(D, 0, 0); *mv = IO[0]; *dd = IO[2]; *nn = (double)nodes; }
#ifdef MT_YBW   /* (2026-11-10, YBW: the helpers wait for split points, as mt-helper.js) */
static void g_helper(void) { mt_idle(0, 1); }
#else
static void g_helper(void) { for (int k = 0; k < 200 && !gStop; k++) best(99, 0, 0); }
#endif
#ifdef SIM_STAT   /* (-DSIM_STAT: the split points' counters per thread count, summed over the positions) */
static double gst[16][8]; static int gstN, gstT[16];
#define G_STAT(t, R0) do { int k_ = 0; while (k_ < gstN && gstT[k_] != (t)) k_++; if (k_ == gstN) gstT[gstN++] = (t); for (int q_ = 0; q_ < 7; q_++) gst[k_][q_] += ST[q_]; gst[k_][7] += (double)(R0) * (t); for (int q_ = 0; q_ < 16; q_++) ST[q_] = 0; } while (0)
#define G_STAT_SUM() do { for (int k_ = 0; k_ < gstN; k_++) if (gstT[k_] > 1) printf("t%d: splits %.0f, helper joins %.0f (moves/join %.1f), empty joins %.0f, idle %.1f%%, owners waiting %.1f%%, second searches %.0f\n", gstT[k_], gst[k_][0], gst[k_][1], gst[k_][2] / (gst[k_][1] > 0 ? gst[k_][1] : 1), gst[k_][3], 100 * gst[k_][4] / gst[k_][7], 100 * gst[k_][5] / gst[k_][7], gst[k_][6]); } while (0)
#endif
