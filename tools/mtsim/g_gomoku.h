// sim.c hooks for gomoku (2026-11-12; core.c: search(), the root's c_best / c_rootList, Praline's YBW under -DMT).
// The clock counts the moves made (SIM_NODE() in pmake: making / unmaking moves is most of the work, the threat solver's too).
// Positions and tables: node <repo>/gomoku/tools/mtsim_pos.js (pos_gomoku.txt, gomoku_tabs.bin).
// SIM_ANA=1 in the environment: the analysis (c_rootList, 12 candidates, a depth limit) instead of the best move.
// Delayed stores: 0 (the table is not rewritten for SIMR / SIMW; the busy marks are).
#include <time.h>
#include <stdio.h>
double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec * 1e3 + t.tv_nsec / 1e6; }
#include "eng_gomoku.c"
static int simAna;
static void g_global_init(void) {
  FILE *f = fopen("gomoku_tabs.bin", "rb"); if (!f) { fprintf(stderr, "no gomoku_tabs.bin\n"); exit(1); }
  int info = 0; size_t k = 0;
  k += fread(T_EXACT, 1, 59049, f); k += fread(T_FREE, 1, 59049, f); k += fread(COMB_N, 4, 65536, f); k += fread(COMB_R, 4, 65536, f); k += fread(COMBO, 2, 65536, f);
  k += fread(ZA, 4, 520 * 3, f); k += fread(ZB, 4, 520 * 3, f); k += fread(ZS, 4, 2, f); k += fread(TAG1, 4, 512, f); k += fread(TAG2, 4, 512, f);
  k += fread(LWS, 4, NLW, f); k += fread(LW2S, 4, 4 * 59049, f); k += fread(&NNW48, 1, sizeof NNW48, f); k += fread(&NNW32, 1, sizeof NNW32, f); k += fread(&info, 4, 1, f);
  fclose(f); (void)k;
  nnR = info & 1; nnS = (info >> 1) & 1; lwOK = (info >> 2) & 1;
  c_init();
  simAna = getenv("SIM_ANA") && atoi(getenv("SIM_ANA"));
}
static void g_thread_init(int id) { nativeThread(id); }
static void g_fresh(void) { sclear(&TH->X); }
static void g_setup(const int *io, int n) { c_reset(io[0]); for (int j = 0; j < io[1] && j + 2 < n; j++) c_make(io[2 + j]); }
static void g_newgame(void) { c_clear(); for (int i = 0; i < (1 << BUSY_BITS); i++) busyT[i] = 0; }
static void g_opt(int depth) { for (int i = 0; i < 16; i++) OPT[i] = 0; OPT[O_MS] = 1e9; OPT[O_NODES] = 1e12; OPT[O_DEPTH] = depth; OPT[O_NOTHREATS] = 1; }
static int g_budget(double nb, int *mv) {   // the depth one thread reaches with nb moves made
  if (simAna) { int d = 1; for (; d < 30; d++) { simMk = 0; c_rootList(1e9, 12, d, 0); if (simMk > nb) break; } *mv = OM[0]; return d; }
  int d = 1;
  for (; d < 40; d++) { simMk = 0; g_opt(d); c_best(); if (simMk > nb || OUT[2] < d) break; }
  *mv = OUT[0]; return d;
}
static void g_main(int D, int *mv, int *dd, double *nn) {
  simMk = 0;
  if (simAna) { const int n = c_rootList(1e9, 12, D, 0); int b = 0; for (int j = 1; j < n; j++) if (OV[j] > OV[b]) b = j; *mv = OM[b]; *dd = OUT[0]; }
  else { g_opt(D); c_best(); *mv = OUT[0]; *dd = OUT[2]; }
  *nn = (double)simMk;
}
static void g_helper(void) { mt_idle(0, 1); }
