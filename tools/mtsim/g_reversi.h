// sim.c hooks for reversi (2026-11-13, reversi/MODEL_CARD.md「マルチスレッド v5（Praline）」): engine.c's root_mt driven as
// engine.js think drives it — the midgame by iterative deepening (the root moves: the earlier depths' best first, as
// orderRoot), the endgame (SIM_END=1 in the environment, positions pos_reversi_end.txt) by the midgame to depth 10 and the
// exact solve with an aspiration window of ±3 discs (SIM_END=2: the win/draw/loss solve, window −1..1). The weights:
// <repo>/reversi/weights.bin.gz (tools/train/rvcommon.h). Build (in the scratch folder, eng_reversi.c from gen.py):
//   gcc -O2 -w -DMT -DNATIVE -DENGINE_ALLOC=malloc -I<repo>/reversi/tools/train -DGAME_H='"g_reversi.h"' \
//       -DPOS_FILE='"pos_reversi.txt"' -DSIM_Q=64 -DSIM_STAT -o sim_reversi sim.c -lpthread -lm -lz
//   (the endgame: -DPOS_FILE='"pos_reversi_end.txt"' -o sim_reversi_end, run with SIM_END=1; the engine before Praline,
//    v4.1: the same without -DSIM_STAT)
// SIM_SPLIT=d,e,bd,be,chk,sn[,mtv]: engine.c mt_split (the midgame's split depth, the solver's split empties, the busy marks' depth /
// empties, the clock's interval, the moves before a split at a null-window node); SIM_YBWN=k: the helpers past k Lazy SMP;
// SIM_W: another weights file.
#include "eng_reversi.c"
#include "rvcommon.h"
#include <stdio.h>
double now(void) { return 0; }
static u64 gP, gO; static int gMode; static double gA = 357.32, gB = 1.1, gC = -3.14;
static void g_global_init(void) {
  const char *wf = getenv("SIM_W") ? getenv("SIM_W") : "weights.bin.gz";
  Model M; int16_t *w = load_weights(wf, &M); if (!w) exit(1);
  w_defer(); init();
  const size_t nw = (size_t)M.nphase * M.phaseSize;
  int16_t *dst = w_alloc((int)nw); if (!dst) { fprintf(stderr, "weights\n"); exit(1); }
  memcpy(dst, w, nw * 2); free(w);
  int *IO = tab_ptr(0), *SS = tab_ptr(1), *SI = tab_ptr(2), *SPp = tab_ptr(3); const int st = M.set; int o = 0;   // (as rvmatch.c / engine.js wasmWeights)
  for (int i = 0; i < M.ninst; i++) IO[i] = PT_OFF[st][i];
  for (int q = 0; q < 64; q++) {
    SS[q] = o;
    for (int i = 0; i < M.ninst; i++) { const int n = PT_LEN[st][i]; int pw = 1; for (int k = n - 1; k >= 0; k--) { if (PT_SQ[st][i][k] == q) { SI[o] = i; SPp[o] = pw; o++; } pw *= 3; } }
  }
  SS[64] = o;
  set_patterns(M.ninst, M.nphase, M.phaseSize, M.next, M.extOff);
  if (M.mpc[0] > 0) { gA = M.mpc[0]; gB = M.mpc[1]; gC = M.mpc[2]; }
  set_end(12);   // (engine.js END_SW)
  gMode = getenv("SIM_END") ? atoi(getenv("SIM_END")) : 0;
  if (getenv("SIM_SPLIT")) {
    int d = 0, e = 0, bd = 0, be = 0, ck = 0, sn = 0, mtv = 0; sscanf(getenv("SIM_SPLIT"), "%d,%d,%d,%d,%d,%d,%d", &d, &e, &bd, &be, &ck, &sn, &mtv);
#ifdef PRALINE_YBW_H
#ifdef RV_MT_SPLIT7   /* (v6: mtv 5 = the split points as v5, MODEL_CARD.md「マルチスレッド v6」) */
    mt_split(d, e, bd, be, ck, sn, mtv);
#else
    mt_split(d, e, bd, be, ck, sn);
#endif
#else
    mt_split(d, e);
#endif
  }
}
// SIM_YBWN=k (2026-11-13): the helpers 1..k YBW, the others Lazy SMP (engine.c mt_lazy, as engine.js YBW_HELPERS): a Lazy helper
// deepens the root on its own (odd ids: the root moves rotated, even: the replies one ply below, engine.js helperPlan) and
// publishes each depth it finishes (gJump, as engine.js lzPut → mt_jump_set); the lead gives up the depth a helper has
// finished and goes on from there (engine.js JMP)
static int gYbwN = 99; static _Thread_local int gLazy, gId, gRot;
static volatile int gLzD, gLzM;   // (engine.js ctl[100..101]: the deepest depth a helper finished and its move)
static void g_thread_init(int id) {
  gId = id;
#ifdef PRALINE_YBW_H
  threadId = id;
  if (getenv("SIM_YBWN")) gYbwN = atoi(getenv("SIM_YBWN"));
  gLazy = id > gYbwN; mt_lazy(gLazy);
#endif
}
static void g_fresh(void) {}
static void g_setup(const int *io, int n) {   // 64 cells (0 empty, 1 black, 2 white) and the side to move (1 / 2)
  (void)n; gP = gO = 0; const int side = io[64];
  for (int q = 0; q < 64; q++) { if (io[q] == side) gP |= 1ULL << q; else if (io[q]) gO |= 1ULL << q; }
}
static void g_newgame(void) { clear_tt(); tt_new(); gLzD = 0; gLzM = -1; __atomic_store_n(&gJump, 0, __ATOMIC_SEQ_CST); }
static _Thread_local double gN;   // a thread's nodes (the lead's: engine.js think's count)
static void st(void) { set_state(gN, 0, 1, 1.5, gA, gB, gC, 3, 13, 18, 2, 8); }
static _Thread_local int rootN, rootM[64]; static _Thread_local double rank_[64];
static void rootInit(void) {
  rootN = 0; for (u64 m = genMoves(gP, gO); m; m &= m - 1) rootM[rootN++] = lsb(m);
  for (int i = 0; i < rootN; i++) rank_[i] = -1e9;
}
static int rootRun(int exact, int depth, int alpha, int beta, int *mv) {   // engine.js rootPVS → root_mt with orderRoot's order
  int ord[64]; for (int i = 0; i < rootN; i++) ord[i] = i;
  for (int i = 1; i < rootN; i++) { int x = ord[i], j = i - 1; while (j >= 0 && rank_[ord[j]] < rank_[x]) { ord[j + 1] = ord[j]; j--; } ord[j + 1] = x; }
  i8 *R = root_mv(); for (int i = 0; i < rootN; i++) R[i] = (i8)rootM[ord[(i + gRot) % rootN]];
  st(); const int v = root_mt((u32)gP, (u32)(gP >> 32), (u32)gO, (u32)(gO >> 32), exact, depth, alpha, beta, rootN); gN = get_nodes();
  *mv = root_info(0);
  return get_aborted() ? -99999 : v;
}
static void best_(int mv, double r) { for (int i = 0; i < rootN; i++) if (rootM[i] == mv) rank_[i] = r; }
static int g_budget(double nodesB, int *mv) {
  if (gMode) { *mv = 0; return 0; }
  gN = 0; rootInit(); set_node_max(nodesB); int D = 0; *mv = -1;
  const int e = 64 - pc(gP | gO);
  for (int d = 1; d <= e; d++) { int m; const int v = rootRun(0, d, -32001, 32001, &m); if (v == -99999) break; D = d; *mv = m; best_(m, 1e8 + d); }
  set_node_max(0);
  return D;
}
static void g_main(int D, int *mv, int *dd, double *nn) {
  gN = 0; rootInit(); *mv = -1; *dd = 0;
  const int e = 64 - pc(gP | gO), dMax = gMode ? (e < 10 ? e : 10) : D;
  int sc = 0;
  for (int d = gMode ? 2 : 1; d <= dMax; d++) {
    int m; jumpAt = d; sc = rootRun(0, d, -32001, 32001, &m); jumpAt = 0;
    if (sc == -99999) {   // (a helper finished this depth: its result, on from the next depth — engine.js JMP)
      if (gLzD < d) break;
      d = gLzD; m = gLzM; sc = 0;
    }
    *mv = m; *dd = d; best_(m, 1e8 + d);
    if (gLzD > d) { d = gLzD; *mv = gLzM; *dd = d; best_(gLzM, 1e8 + d); }
  }
  if (gMode == 1) {   // the exact solve: aspiration ±3 discs around the midgame value (engine.js think)
    int g = sc >= 0 ? (sc + 50) / 100 : -((-sc + 50) / 100); if (g > 60) g = 60; if (g < -60) g = -60;
    int lo = g - 3, hi = g + 3, m, v;
    for (;;) { v = rootRun(1, 0, lo, hi, &m); if (v <= lo && lo > -65) { hi = v + 1; lo = -65; } else if (v >= hi && hi < 65) { lo = v - 1; hi = 65; } else break; }
    *mv = m; *dd = 100 + v;
  } else if (gMode == 2) { int m; const int v = rootRun(1, 0, -1, 1, &m); *mv = m; *dd = 100 + v; }
  *nn = gN;
}
static double gHelpN, gAllN[16], gOneN; static int gAllT[16], gAllK;   // the helpers' nodes (G_STAT: all threads' nodes / one thread's)
static void lazyHelper(void) {   // engine.js think of a Lazy helper (helperPlan 'mix'; the endgame: the solve too, root rotated)
  gN = 0; rootInit(); gRot = rootN ? (gId & 1 ? (gId + 1) >> 1 : 0) % rootN : 0; set_rot1(gId & 1 ? 0 : gId >> 1);
  const int e = 64 - pc(gP | gO);
  for (int k = 0; k < 200 && !gStop; k++) {
    for (int d = 1; d <= (gMode ? (e < 10 ? e : 10) : e) && !gStop; d++) {
      int m; const int sc = rootRun(0, d, -32001, 32001, &m); if (sc == -99999) break;
      best_(m, 1e8 + d);
      if (!gMode) {
        pthread_mutex_lock(&simMu); if (d > gLzD) { gLzD = d; gLzM = m; } pthread_mutex_unlock(&simMu);
        int c = __atomic_load_n(&gJump, __ATOMIC_SEQ_CST); while (c < d && !__atomic_compare_exchange_n(&gJump, &c, d, 0, __ATOMIC_SEQ_CST, __ATOMIC_SEQ_CST)) {}
        if (gLzD > d) d = gLzD;   // (behind the others: on to their next depth)
      }
    }
    if (gMode && !gStop) { int m; rootRun(1, 0, gMode == 1 ? -65 : -1, gMode == 1 ? 65 : 1, &m); }
  }
  set_rot1(0); gRot = 0;
}
static void g_helper(void) {
#ifdef PRALINE_YBW_H
  if (gLazy) { lazyHelper(); pthread_mutex_lock(&simMu); gHelpN += gN; pthread_mutex_unlock(&simMu); return; }
  const double n = mt_idle(0, 1);
#else
  const double n = mt_idle();
#endif
  pthread_mutex_lock(&simMu); gHelpN += n; pthread_mutex_unlock(&simMu);
}
static void g_nodes(int t) {   // after a run of t threads (G_STAT)
  if (t == 1) gOneN += gN;
  int k = 0; while (k < gAllK && gAllT[k] != t) k++; if (k == gAllK) gAllT[gAllK++] = t;
  gAllN[k] += gN + gHelpN; gHelpN = 0;
}
#ifdef SIM_STAT   /* (-DSIM_STAT, Praline: the split points' counters per thread count, summed over the positions) */
static double gst[16][8]; static int gstN, gstT[16];
#define G_STAT(t, R0) do { g_nodes(t); int k_ = 0; while (k_ < gstN && gstT[k_] != (t)) k_++; if (k_ == gstN) gstT[gstN++] = (t); for (int q_ = 0; q_ < 7; q_++) gst[k_][q_] += ST[q_]; gst[k_][7] += (double)(R0) * (t); for (int q_ = 0; q_ < 16; q_++) ST[q_] = 0; } while (0)
#define G_STAT_SUM() do { for (int k_ = 0; k_ < gstN; k_++) if (gstT[k_] > 1) printf("t%d: splits %.0f, helper joins %.0f (moves/join %.1f), empty joins %.0f, idle %.1f%%, owners waiting %.1f%%, second searches %.0f\n", gstT[k_], gst[k_][0], gst[k_][1], gst[k_][2] / (gst[k_][1] > 0 ? gst[k_][1] : 1), gst[k_][3], 100 * gst[k_][4] / gst[k_][7], 100 * gst[k_][5] / gst[k_][7], gst[k_][6]); for (int k_ = 0; k_ < gAllK; k_++) printf("t%d: all threads' nodes x%.2f of one thread's\n", gAllT[k_], gAllN[k_] / gOneN); } while (0)
#endif
