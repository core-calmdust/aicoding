// sim.c hooks for chess (engine.c: set_position() from the setup string, think(soft, hard, maxDepth, nodes); NNUE net_chess.bin)
#include "eng_chess.c"
#include <stdio.h>
static void g_global_init(void) {
#ifdef HAS_MT_IDLE
  mt_lazy(0);   /* (the history tables: before new_game) */
#endif
  init();
  FILE *f = fopen("net_chess.bin", "rb"); if (!f) { fprintf(stderr, "no net\n"); exit(1); }
  static u8 buf[sizeof NN]; int n = (int)fread(buf, 1, sizeof buf, f); fclose(f);
  if (n != NN_LEGACY) { fprintf(stderr, "net size %d\n", n); exit(1); }
  memcpy(&NN, buf, n); nn_enable(1);   // (as the page: the file at nn_ptr, then nn_enable)
  new_game();
}
static void g_thread_init(int id) {
  threadId = id;
#ifdef HAS_MT_IDLE
  /* SIM_LAZY=1: every helper Lazy SMP (as before YBW); SIM_YBWN=k: helpers 1..k YBW, the others Lazy SMP (with tables of their
     own from the warm-up on: identical histories would walk the same tree in lockstep) */
  mt_lazy(id > 0 && ((getenv("SIM_LAZY") && atoi(getenv("SIM_LAZY"))) || (getenv("SIM_YBWN") && id > atoi(getenv("SIM_YBWN")))));
  /* SIM_SPLIT=depth[,most threads on a split point[,second searches 0/1[,moves searched before a split at a cut node]]] (engine.c mt_split) */
  if (getenv("SIM_SPLIT")) { int d = 0, t = -1, u = -1, c = 0; sscanf(getenv("SIM_SPLIT"), "%d,%d,%d,%d", &d, &t, &u, &c); mt_split(d, t, u, c); }
#endif
}
static void g_fresh(void) { memset(history, 0, sizeof history); memset(killers, 0, sizeof killers); memset(counterMove, 0, sizeof counterMove); }
static void g_setup(const int *io, int n) { for (int i = 0; i < n; i++) setupBuf[i] = (char)io[i]; setupBuf[n] = 0; if (!set_position()) { fprintf(stderr, "setup\n"); exit(1); } }
static void g_newgame(void) { new_game(); }
static int g_budget(double nodesB, int *mv) { think(0, 0, 0, nodesB); *mv = resBuf[0]; return resBuf[2]; }
static void g_main(int D, int *mv, int *dd, double *nn) { think(0, 0, D, 0); *mv = resBuf[0]; *dd = resBuf[2]; *nn = nodes; }
#if defined(HAS_MT_IDLE) && defined(MT_STAT)   /* splits, joins, second searches, idle spins, owners' waiting spins; all nodes */
#define G_STAT() (printf(" [s%.0f j%.0f d%.0f i%.0f w%.0f all %.2fM main %.2fM]", mt_stat(0), mt_stat(1), mt_stat(2), mt_stat(3), mt_stat(4), (nodes + gHelpN) / 1e6, nodes / 1e6), mt_stat(7), gHelpN = 0)
#endif
#ifdef HAS_MT_IDLE   /* YBW (2026-11-10): a YBW helper takes moves at the split points (mt_idle), a Lazy SMP one thinks (as the pages:
                        SIM_YBWN=1 — chess/MODEL_CARD.md「マルチスレッド v2」) */
static double gHelpN;   /* the helpers' nodes in the run (G_STAT) */
static void g_helper(void) {
  if (noSplit) { for (int k = 0; k < 200 && !gStop; k++) think(0, 0, 64, 0); return; }   /* (a Lazy SMP helper: g_thread_init) */
  const double n = mt_idle(); pthread_mutex_lock(&simMu); gHelpN += n; pthread_mutex_unlock(&simMu);
}
#else
static void g_helper(void) { for (int k = 0; k < 200 && !gStop; k++) think(0, 0, 64, 0); }
#endif
