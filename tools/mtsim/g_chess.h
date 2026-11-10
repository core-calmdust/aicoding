// sim.c hooks for chess (engine.c: set_position() from the setup string, think(soft, hard, maxDepth, nodes); NNUE net_chess.bin)
#include "eng_chess.c"
#include <stdio.h>
static void g_global_init(void) {
  init();
  FILE *f = fopen("net_chess.bin", "rb"); if (!f) { fprintf(stderr, "no net\n"); exit(1); }
  static u8 buf[sizeof NN]; int n = (int)fread(buf, 1, sizeof buf, f); fclose(f);
  if (n != NN_LEGACY) { fprintf(stderr, "net size %d\n", n); exit(1); }
  memcpy(&NN, buf, n); nn_enable(1);   // (as the page: the file at nn_ptr, then nn_enable)
  new_game();
}
static void g_thread_init(int id) { threadId = id; }
static void g_fresh(void) { memset(history, 0, sizeof history); memset(killers, 0, sizeof killers); memset(counterMove, 0, sizeof counterMove); }
static void g_setup(const int *io, int n) { for (int i = 0; i < n; i++) setupBuf[i] = (char)io[i]; setupBuf[n] = 0; if (!set_position()) { fprintf(stderr, "setup\n"); exit(1); } }
static void g_newgame(void) { new_game(); }
static int g_budget(double nodesB, int *mv) { think(0, 0, 0, nodesB); *mv = resBuf[0]; return resBuf[2]; }
static void g_main(int D, int *mv, int *dd, double *nn) { think(0, 0, D, 0); *mv = resBuf[0]; *dd = resBuf[2]; *nn = nodes; }
static void g_helper(void) { for (int k = 0; k < 200 && !gStop; k++) think(0, 0, 64, 0); }
