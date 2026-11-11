// sim.c hooks for shogi (engine.c: set_position() + play_move(), root_search(ms, maxDepth, nodes); the linear weights
// w_shogi.bin (engine.js defaultWeights, as the bench page) and the NNUE net_shogi.bin, built with -DNUE_H=512 as engine_mt.wasm)
#include "eng_shogi.c"
#include <stdio.h>
static void g_global_init(void) {
  init();
  FILE *f = fopen("w_shogi.bin", "rb"); if (!f || fread(W, 2, NFEAT, f) != NFEAT) { fprintf(stderr, "weights\n"); exit(1); } fclose(f);
  f = fopen("net_shogi.bin", "rb"); if (!f) { fprintf(stderr, "no net\n"); exit(1); }
  int hdr[3]; if (fread(hdr, 4, 3, f) != 3 || hdr[1] != NUE_H) { fprintf(stderr, "net size\n"); exit(1); }
  int NIN = hdr[2];
  if (fread(nueW1, 2, (size_t)NIN * NUE_H, f) != (size_t)NIN * NUE_H || fread(nueB1, 4, NUE_H, f) != NUE_H || fread(nueW2, 2, 2 * NUE_H, f) != 2 * NUE_H) { fprintf(stderr, "net\n"); exit(1); }
  i32 b2; if (fread(&b2, 4, 1, f) != 1) { fprintf(stderr, "net\n"); exit(1); } fclose(f);
  nue_set_b2(b2); nue_enable(1); tt_clear();
#ifdef HAS_MT_YBW
  if (getenv("SIM_YBWN")) mt_ybw(atoi(getenv("SIM_YBWN")));
#endif
}
static void g_thread_init(int id) { threadId = id; }
static void g_fresh(void) { reset_search(); }   // (history, killers and the shared continuation history)
static void g_setup(const int *io, int n) {
  for (int i = 0; i < 98; i++) setupBuf[i] = (i8)io[i];
  set_position();
  for (int i = 98; i < n; i++) play_move(io[i]);
  set_exclude(0);
}
static void g_newgame(void) { tt_clear(); }
static int g_budget(double nodesB, int *mv) { root_search(0, 0, (int)nodesB); *mv = res[0]; return res[1]; }
static void g_main(int D, int *mv, int *dd, double *nn) { root_search(0, D, 0); *mv = res[0]; *dd = res[1]; *nn = (double)(u32)nodes; }
#ifdef MT_YBW   /* (2026-11-10, YBW: the helpers wait for split points, as mt-helper.js) */
static void g_helper(void) { mt_idle(0, 1); }
#else
static void g_helper(void) { for (int k = 0; k < 200 && !gStop; k++) root_search(0, 0, 0); }
#endif
#ifdef SIM_STAT   /* (-DSIM_STAT: the split points' counters per thread count, summed over the positions) */
static double gst[16][8]; static int gstN, gstT[16];
#define G_STAT(t, R0) do { int k_ = 0; while (k_ < gstN && gstT[k_] != (t)) k_++; if (k_ == gstN) gstT[gstN++] = (t); for (int q_ = 0; q_ < 7; q_++) gst[k_][q_] += ST[q_]; gst[k_][7] += (double)(R0) * (t); for (int q_ = 0; q_ < 16; q_++) ST[q_] = 0; } while (0)
#define G_STAT_SUM() do { for (int k_ = 0; k_ < gstN; k_++) if (gstT[k_] > 1) printf("t%d: splits %.0f, helper joins %.0f (moves/join %.1f), empty joins %.0f, idle %.1f%%, owners waiting %.1f%%, second searches %.0f\n", gstT[k_], gst[k_][0], gst[k_][1], gst[k_][2] / (gst[k_][1] > 0 ? gst[k_][1] : 1), gst[k_][3], 100 * gst[k_][4] / gst[k_][7], 100 * gst[k_][5] / gst[k_][7], gst[k_][6]); } while (0)
#endif
