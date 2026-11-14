// A native self-play of the core (core.c built for the host CPU, one thread): two players, each the MCTS or the alpha-beta search
// with its own evaluation (ev_set) and parameters, the same openings as tools/mcts_match.js (two random plies from the best 10
// candidates, every opening twice, colours swapped) and its adjudication (a separated board with a territory lead of 3 or more).
// The clock is this process's CPU time (a budget in ms is the same CPU time on a crowded machine). claude/amazons-spec.md「評価 v2」.
//   clang -O3 -march=native -DNATIVE -w -o /tmp/amz_match amazons/tools/native_match.c -lm
//   /tmp/amz_match A B pairs [seed] [part/n]
//   a player: mc:ms=300,ev=1 | mc:nk=60,ev=0,c=0.25 | ab:ms=300,ev=1 | ab:nk=24 (nk: thousands of evaluations a move)
//             | lv:noise=420,qk=3 (engine.js's one-ply levels Lv.1〜8: the candidates' scores with Gaussian noise; d=2: the
//             best 10 valued at depth d as engine.js think with L.d ≥ 2, the rest their score − 40) | L<n>: the
//             level n as in engine.js LEVELS (L1 … L23; one thread, the time levels by this process's CPU time; L19:ms=150 etc.
//             overrides a key). Each player keeps its own alpha-beta tables (the table and the candidate cache) from move to
//             move, as its own worker would (2026-11-14: before, both players shared them).
//             MCTS keys as engine.js MC (qk k qkr kr po s np c a pwa pwk pwb pom vl b0 la); e<k>=v sets the evaluation's
//             parameter k (ev_set(k, v)) for that player
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <math.h>
#include "../core.c"
double now(void) { struct timespec t; clock_gettime(CLOCK_PROCESS_CPUTIME_ID, &t); return t.tv_sec * 1e3 + t.tv_nsec / 1e6; }
static const char *MCK[] = { "qk", "k", "qkr", "kr", "po", "s", "np", "c", "a", "pwa", "pwk", "pwb", "pom", "vl", "b0", "la" };
static const double MCD[] = { 10, 24, 20, 48, 0, 400, 2, 0.25, 0.3, 3, 1, 0.5, 0.5, 1, 300, 8 };
#define NEP 32
typedef struct { int mc, ev, lv, qk, d; double ms, nk, noise, mcp[16]; int nep; int epk[NEP]; double epv[NEP]; const char *name;
  TTS *ttp; unsigned ttm; int ttc; CCS *ccp; unsigned ccm; int ccc; } Player;
// engine.js LEVELS (LVEV: the evaluation of each level, 1 = v2)
static const double LVN[24] = { 0, 420, 300, 210, 150, 105, 70, 45, 200 };
static const int LVD[24] = { 0, 1, 1, 1, 1, 1, 1, 1, 3 };
static const int LVQ[24] = { 0, 3, 4, 5, 6, 8, 10, 12, 14 };
static const double LVK[24] = { 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 4.5, 6, 16, 40, 150, 200, 500, 1200 };
static const int LVMC[24] = { 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1 };
static const double LVMS[24] = { 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1500, 3000, 6000, 12000, 20000 };
static const int LVEV[24] = { 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 };
static void parseP(const char *s, Player *P) {
  memset(P, 0, sizeof *P); P->name = s; P->mc = !strncmp(s, "mc", 2); P->lv = !strncmp(s, "lv", 2); memcpy(P->mcp, MCD, sizeof MCD);
  if (s[0] == 'L' && s[1] >= '0' && s[1] <= '9') {
    int n = atoi(s + 1); if (n < 1) n = 1; if (n > 23) n = 23;
    if (n <= 8) { P->lv = 1; P->noise = LVN[n]; P->qk = LVQ[n]; P->d = LVD[n]; }
    else if (n <= 18) { P->nk = LVK[n]; P->mc = LVMC[n]; }
    else { P->mc = 1; P->ms = LVMS[n]; }
    P->ev = LVEV[n];
  }
  const char *c = strchr(s, ':'); if (!c) return;
  char buf[512]; strncpy(buf, c + 1, 511); buf[511] = 0;
  for (char *tok = strtok(buf, ","); tok; tok = strtok(0, ",")) {
    char *eq = strchr(tok, '='); if (!eq) continue; *eq = 0; double v = atof(eq + 1);
    if (!strcmp(tok, "ms")) P->ms = v; else if (!strcmp(tok, "nk")) P->nk = v; else if (!strcmp(tok, "ev")) P->ev = (int)v;
    else if (!strcmp(tok, "noise")) P->noise = v; else if (!strcmp(tok, "qk") && P->lv) P->qk = (int)v; else if (!strcmp(tok, "d")) P->d = (int)v;
    else if (tok[0] == 'e' && tok[1] >= '0' && tok[1] <= '9') { if (P->nep < NEP) { P->epk[P->nep] = atoi(tok + 1); P->epv[P->nep++] = v; } }
    else for (int k = 0; k < 16; k++) if (!strcmp(tok, MCK[k])) P->mcp[k] = v;
  }
}
static i8 GS[NN], GQ[8]; static int gside;   // the game (gside 1 White, 2 Black to move)
static void load(void) { memcpy(SQ, GS, NN); memcpy(Q, GQ, 8); }
static void gplay(int m) { load(); playM(m); memcpy(GS, SQ, NN); memcpy(GQ, Q, 8); gside = 3 - gside; }
static unsigned rs0;
static double rnd01(void) { rs0 = (rs0 * 1103515245u + 12345u) & 0x7fffffff; return rs0 / (double)0x7fffffff; }
static int byScore(const void *a, const void *b) { const int *x = a, *y = b; return y[1] - x[1] ? y[1] - x[1] : x[2] - y[2]; }
static int sortedCands(int side, int qkeep, int *M, int *S, int K) {   // cands(pos, K, 0, qkeep): a stable sort, best first
  load(); int n = cand(side, qkeep, 0); evn = 0;
  static int T3[8192][3]; for (int i = 0; i < n; i++) { T3[i][0] = OM[i]; T3[i][1] = OS[i]; T3[i][2] = i; }
  qsort(T3, n, sizeof T3[0], byScore);
  if (n > K) n = K; for (int i = 0; i < n; i++) { M[i] = T3[i][0]; S[i] = T3[i][1]; }
  return n;
}
static void keys(unsigned *h1, unsigned *h2) {   // engine.js rehash
  unsigned a = 0, b = 0; for (int i = 0; i < NN; i++) if (GS[i]) { a ^= Z1[GS[i] - 1][i]; b ^= Z2[GS[i] - 1][i]; }
  if (gside == 2) { a ^= ZS1; b ^= ZS2; }
  *h1 = a; *h2 = b;
}
static void setEval(const Player *P) {
  ev_set(-1, P->ev); ev_reset();
  for (int i = 0; i < P->nep; i++) ev_set(P->epk[i], P->epv[i]);
}
static int thinkMC(const Player *P, int seed) {
  for (int k = 0; k < 16; k++) mcts_set(k, (float)P->mcp[k]);
  double evl = P->nk * 1000, ms = P->ms;
  double est = ms > 0 ? ms * 400 * 2.6 : evl / 200 * P->mcp[1] * 1.3; int want = (int)est; if (want < 65536) want = 65536; if (want > (1 << 22)) want = 1 << 22;
  mcts_alloc(want); mcts_limit(0); mcts_set(16, 0);
  load(); mcts_begin(gside, seed); mcts_run(ms, evl, 0);
  int n = mcts_out(); return n ? RM[0] : -1;
}
static unsigned rs1;
static double gauss1(void) {   // engine.js gauss (Box–Muller)
  double u = 0, v = 0;
  while (!u) { rs1 = (rs1 * 1103515245u + 12345u) & 0x7fffffff; u = rs1 / (double)0x7fffffff; }
  while (!v) { rs1 = (rs1 * 1103515245u + 12345u) & 0x7fffffff; v = rs1 / (double)0x7fffffff; }
  return sqrt(-2 * log(u)) * cos(2 * 3.141592653589793 * v);
}
static int thinkLV(const Player *P) {   // engine.js think for a level without s: cands(pos, 24, 0, qk) with noise (no resist)
  int M[64], S[64], n = sortedCands(gside, P->qk ? P->qk : 12, M, S, 24);
  if (!n) return -1; if (n == 1) return M[0];
  if (P->d >= 2) {   // rootValues(pos, C.slice(0, 10), d) (a stable sort by value) + the rest with s − 40, then sorted again
    int k = n < 10 ? n : 10; for (int i = 0; i < k; i++) { RLM[i] = M[i]; RLS[i] = S[i]; }
    unsigned h1, h2; keys(&h1, &h2); load(); ab_root(gside - 1, h1, h2, k);
    ab_sync(0, 0, 1e300, 1e300, 0, 1); int got = ab_values(P->d);
    int T[3][64], c = 0;
    for (int i = 0; i < got; i++) { T[0][c] = AOM[i]; T[1][c] = AOV[i]; c++; }
    for (int i = 10; i < n; i++) { T[0][c] = M[i]; T[1][c] = S[i] - 40; c++; }
    for (int i = 1; i < c; i++) { int m = T[0][i], v = T[1][i], j = i; while (j > 0 && T[1][j - 1] < v) { T[0][j] = T[0][j - 1]; T[1][j] = T[1][j - 1]; j--; } T[0][j] = m; T[1][j] = v; }
    for (int i = 0; i < c; i++) { M[i] = T[0][i]; S[i] = T[1][i]; } n = c;
  }
  if (S[0] < -WINT) return M[0];
  int best = M[0]; double bv = -1e300;
  for (int i = 0; i < n; i++) { double x = S[i] + (abs(S[i]) > WINT ? 0 : gauss1() * P->noise); if (x > bv) { bv = x; best = M[i]; } }
  return best;
}
static void tabIn(const Player *P) { TTp = P->ttp; ttMask = P->ttm; ttCount = P->ttc; CCp = P->ccp; ccMask = P->ccm; ccCount = P->ccc; }
static void tabOut(Player *P) { P->ttp = TTp; P->ttm = ttMask; P->ttc = ttCount; P->ccp = CCp; P->ccm = ccMask; P->ccc = ccCount; }
static void tabNew(Player *P) { tabIn(P); ab_newgame(); tabOut(P); }
static int thinkAB(const Player *P) {
  int M[64], S[64], n = sortedCands(gside, 20, M, S, 16);
  if (!n) return -1; if (n == 1 || S[0] > WINT) return M[0];
  for (int i = 0; i < n; i++) { RLM[i] = M[i]; RLS[i] = S[i]; }
  unsigned h1, h2; keys(&h1, &h2); load();
  ab_root(gside - 1, h1, h2, n);
  double ek = P->nk > 0 ? P->nk * 1000 : 1e300, te = P->ms > 0 ? now() + P->ms : 1e300;
  ab_sync(0, 0, te, ek, 0, 1); ab_best(P->d > 0 ? P->d : 40);   // (d: the depth limit, engine.js cfg dx)
  return (int)ab_res(0);
}
static void terr(int *a, int *b, int *sep) {   // Pos.terr: queen distances
  load(); padFrom(); distQ(0, DA); distQ(4, DB);
  int x = 0, y = 0, both = 0;
  for (int i = 0; i < NN; i++) { if (GS[i]) continue; int p = PI[i], u = DA[p], v = DB[p]; if (u < v) x++; else if (v < u) y++; if (u < INF && v < INF) both++; }
  *a = x; *b = y; *sep = both == 0;
}
static double useT[3]; static int useN[3];
static int play(Player *W, Player *B, const int *op, int nop, int gseed, int *plies, int *adj) {
  memset(GS, 0, NN); const int ws[4] = { 60, 93, 96, 69 }, bs[4] = { 30, 3, 6, 39 };   // a4 d1 g1 j4 / a7 d10 g10 j7
  for (int k = 0; k < 4; k++) { GS[ws[k]] = 1; GQ[k] = ws[k]; GS[bs[k]] = 2; GQ[4 + k] = bs[k]; }
  gside = 1; tabNew(W); tabNew(B); rs1 = (unsigned)(gseed * 2654435761u + 7) & 0x7fffffff;
  for (int i = 0; i < nop; i++) gplay(op[i]);
  *adj = 0;
  for (int ply = nop; ply < 100; ply++) {
    load(); if (!canMove(gside)) { *plies = ply; return 3 - gside; }
    int a, b, sep; terr(&a, &b, &sep);
    if (sep && abs(a - b) >= 3) { *plies = ply; *adj = 1; return a > b ? 1 : 2; }
    Player *P = gside == 1 ? W : B; setEval(P);
    double t0 = now();
    tabIn(P);
    int m = P->mc ? thinkMC(P, gseed + ply) : P->lv ? thinkLV(P) : thinkAB(P);
    tabOut(P);
    useT[gside] += now() - t0; useN[gside]++;
    if (m < 0) { *plies = ply; return 3 - gside; }
    gplay(m);
  }
  *plies = 100; return 0;
}
int main(int argc, char **argv) {
  if (argc < 3) { fprintf(stderr, "usage: A B pairs [seed] [part/n]\n"); return 1; }
  init(); initBB();
  Player A, B; parseP(argv[1], &A); parseP(argv[2], &B);
  int pairs = argc > 3 ? atoi(argv[3]) : 10, seed = argc > 4 ? atoi(argv[4]) : 1, pi = 0, pn = 1;
  if (argc > 5) sscanf(argv[5], "%d/%d", &pi, &pn);
  rs0 = (unsigned)(seed * 7919 + 13) & 0x7fffffff;
  double aw = 0; int n = 0; double cA = 0, cB = 0; int mA = 0, mB = 0;
  for (int i = 0; i < pairs; i++) {
    int op[2]; memset(GS, 0, NN);
    { const int ws[4] = { 60, 93, 96, 69 }, bs[4] = { 30, 3, 6, 39 }; for (int k = 0; k < 4; k++) { GS[ws[k]] = 1; GQ[k] = ws[k]; GS[bs[k]] = 2; GQ[4 + k] = bs[k]; } gside = 1; }
    ev_set(-1, 0); ev_reset();
    for (int j = 0; j < 2; j++) { int M[64], S[64], k = sortedCands(gside, 14, M, S, 10); op[j] = M[(int)(rnd01() * k)]; gplay(op[j]); }
    if (i % pn != pi) continue;
    for (int sw = 0; sw < 2; sw++) {
      Player *W = sw ? &B : &A, *Bk = sw ? &A : &B;
      memset(useT, 0, sizeof useT); memset(useN, 0, sizeof useN);
      int plies, adj, win = play(W, Bk, op, 2, i * 1000 + sw * 500 + seed, &plies, &adj);
      int aSide = sw ? 2 : 1, ok = win == aSide;
      aw += ok ? 1 : win == 0 ? 0.5 : 0; n++;
      cA += useT[aSide]; cB += useT[3 - aSide]; mA += useN[aSide]; mB += useN[3 - aSide];
      printf("{\"pair\":%d,\"aWhite\":%d,\"aWin\":%d,\"plies\":%d,\"adj\":%d,\"msA\":%.0f,\"msB\":%.0f}\n", i, !sw, ok, plies, adj,
        useT[aSide] / (useN[aSide] ? useN[aSide] : 1), useT[3 - aSide] / (useN[3 - aSide] ? useN[3 - aSide] : 1));
      fflush(stdout);
    }
  }
  double p = aw / (n ? n : 1), elo = p > 0 && p < 1 ? -400 * log10(1 / p - 1) : p >= 1 ? 999 : -999;
  printf("# %s vs %s: %.1f/%d (%.1f%%, %.0f Elo) | CPU ms/move A %.0f B %.0f\n", A.name, B.name, aw, n, p * 100, elo, cA / (mA ? mA : 1), cB / (mB ? mB : 1));
  return 0;
}
