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
static void g_helper(void) { for (int k = 0; k < 200 && !gStop; k++) root_search(0, 0, 0); }
