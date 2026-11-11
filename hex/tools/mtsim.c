// Cache-line model of the multi-thread search (engine.c -DMT): T threads in step (round robin, so the count does not depend on
// how busy this machine is), every read and write of the shared tree counted against a simple MESI model (a line written by
// one thread must move before another thread reads or writes it). Each round, all T threads go down the tree one after the
// other (each sees the others' virtual loss), then all go back up (results, RAVE): T playouts in flight at once, as on a
// machine with T free cores. The line transfers per playout are what made 14 threads only 2.6× faster than 1 on the user's
// Mac (MODEL_CARD「スレッドが伸びない問題」).
//   gcc -O3 -march=native -DNATIVE -DMT -pthread -w -o /tmp/hexsim tools/mtsim.c -lm
//   (another version of the engine: -DENGINE_C='"/path/engine.c"', with its prior_w.h and the MTSIM_HOOK line before the backup)
//   hexsim T playouts [npos]       the 10 positions of bench.html (11x11)
//   hexsim T playouts npos ref     npos random 11x11 positions (as mtbench.c agree): the best move of the T threads here and of
//                                  1 thread with the same playouts, against 1 thread with ref playouts
// Counted: the children read when choosing (each level), the visit / win written to the child gone through, the RAVE results
// written to the children of each level, the root's own count, new nodes, and (the batched version) the slots added to the tree.
#define NATIVE 1
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <pthread.h>
#include <semaphore.h>
static double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec * 1000.0 + t.tv_nsec / 1e6; }
static void simHook(int res, int didPO);
static void simW(int node), simWR(int node);
#define MTSIM_HOOK simHook
#define MTSIM_W simW
#define MTSIM_WR simWR
#ifdef ENGINE_C
#include ENGINE_C
#else
#include "../engine.c"
#endif

#ifdef RN
// (2026-11-11) the RAVE results of the nodes in RV, apart from the nodes: their lines after the nodes' lines
#define NLINES ((NODES * (int)sizeof(Node) + 63) / 64 + 1)
#define LINES (NLINES + (NODES * (int)sizeof(Rave) + 63) / 64 + 1)
#else
#define LINES ((NODES * (int)sizeof(Node) + 63) / 64 + 1)
#endif
static signed char owner[LINES];      // the thread holding the line modified, or -1
static unsigned short sharers[LINES]; // threads with a copy
static long long nRead, nWrite;       // transfers
static int cat, lvl; static long long byCat[8], byLvl[8];   // (breakdown: what, and the level of the path)
#define CNT() (byCat[cat]++, byLvl[lvl > 7 ? 7 : lvl]++)
static void rdLine(int l, int t) { if (!(sharers[l] >> t & 1)) { nRead++; CNT(); sharers[l] |= 1 << t; if (owner[l] >= 0 && owner[l] != t) owner[l] = -1; } }
static void wrLine(int l, int t) { if (owner[l] != t) { if (sharers[l] != (1 << t) || owner[l] >= 0) { nWrite++; CNT(); } owner[l] = t; sharers[l] = 1 << t; } }
static void rdNodes(int a, int n, int t) { if (n <= 0) return; int l0 = a * (int)sizeof(Node) / 64, l1 = ((a + n) * (int)sizeof(Node) - 1) / 64; for (int l = l0; l <= l1; l++) rdLine(l, t); }
static void wrNode(int a, int t) { int l0 = a * (int)sizeof(Node) / 64, l1 = ((a + 1) * (int)sizeof(Node) - 1) / 64; for (int l = l0; l <= l1; l++) wrLine(l, t); }
static void wrNodes(int a, int n, int t) { for (int i = 0; i < n; i++) wrNode(a + i, t); }
#ifdef RN
static void rdRave(int a, int n, int t) { if (n <= 0) return; int l0 = a * (int)sizeof(Rave) / 64, l1 = ((a + n) * (int)sizeof(Rave) - 1) / 64; for (int l = l0; l <= l1; l++) rdLine(NLINES + l, t); }
static void wrRave(int a, int t) { int l0 = a * (int)sizeof(Rave) / 64, l1 = ((a + 1) * (int)sizeof(Rave) - 1) / 64; for (int l = l0; l <= l1; l++) wrLine(NLINES + l, t); }
static void wrRaves(int a, int n, int t) { for (int i = 0; i < n; i++) wrRave(a + i, t); }
#else
#define rdRave(a, n, t)
#define wrRave wrNode
#define wrRaves(a, n, t)
#endif

static int NTH, PO; static sem_t sem[32]; static volatile int left;
static __thread int me, nn0;
#ifdef RB_SLOTS
#define SLOT(k) (pathS[k] != 0)
#else
#define SLOT(k) 0
#endif
// the next step of the round: steps 0..T-1 = thread t goes down, T..2T-1 = thread t goes back up
static void pass(int step) { sem_post(&sem[(step + 1) % (2 * NTH) % NTH]); }
static int simOn;
static void simHook(int res, int didPO) {
  if (!simOn) return;   // (the 1-thread searches of the ref mode)
  int t = me;
  // going down: new nodes, the children read at each level, the virtual loss of the child gone through
  cat = 0; lvl = 7; if (nNodes > nn0) { wrNodes(nn0, nNodes - nn0, t); wrRaves(nn0, nNodes - nn0, t); }
  for (int k = 0; k < pathL; k++) {
    Node *nd = &T[pathN[k]]; lvl = k;
    if (k < pathL - 1 && nd->exp == 1) { cat = SLOT(k) ? 2 : 3; rdNodes(nd->first, nd->nch, t); rdRave(nd->first, nd->nch, t); }
#ifdef RB_SLOTS
    if (k && !SLOT(k - 1)) { cat = 1; wrNode(pathN[k], t); }
    if (!k && rbThreads < 2) { cat = 1; wrNode(0, t); }
#else
    cat = 1; wrNode(pathN[k], t);
#endif
  }
  pass(t); sem_wait(&sem[t]);
  // going back up: the wins, RAVE, the slots
  int side = ROOT.side;
  for (int k = 0; k < pathL; k++) {
    Node *nd = &T[pathN[k]]; int mover = side ^ 3; lvl = k;
    if (res == mover && !(k ? SLOT(k - 1) : 0)) { cat = 1; wrNode(pathN[k], t); }
    if (didPO && k < pathL - 1 && nd->exp == 1 && !SLOT(k)) { cat = 4; for (int i = 0; i < nd->nch; i++) { int c = T[nd->first + i].mv; if (c != SWAP && PB[c] == side) wrRave(nd->first + i, t); } }
    side ^= 3;
  }
}
static void simW(int node) { if (simOn) { int c = cat, l = lvl; cat = 5; lvl = 7; wrNode(node, me); cat = c; lvl = l; } }   // (a slot added to the tree)
static void simWR(int node) { if (simOn) { int c = cat, l = lvl; cat = 5; lvl = 7; wrRave(node, me); cat = c; lvl = l; } }
static void *runner(void *a) {
  int t = (int)(long)a; me = t; mt_thread_native(t);
  for (;;) {
    sem_wait(&sem[t]);
    if (left <= 0) { sem_post(&sem[(t + 1) % NTH]); break; }
    nn0 = nNodes; left--;
    iterate();
#ifdef RB_SLOTS
    if (rbClock % 64 == 0) { cat = 1; lvl = 0; wrNode(0, t); }
#endif
    // (the lead's node pool control of search(), every 256 playouts of all threads)
    if ((left & 255) == 0) { double f = 1.0 - (double)left / PO; if ((double)nNodes / NODES > f * .85 + .1 && expT < 256) expT += expT < 4 ? 1 : expT / 4; }
    pass(NTH + t);
  }
#ifdef RB_SLOTS
  rbFlushAll();
#endif
  return 0;
}
static int setupMoves(int n, int sw, const int *mv, int k) { IO[0] = n; IO[1] = sw; IO[2] = k; for (int i = 0; i < k; i++) IO[3 + i] = mv[i]; return setup(); }
int main(int argc, char **argv) {
  if (argc < 3) return 1;
  NTH = atoi(argv[1]); PO = atoi(argv[2]); int np = argc > 3 ? atoi(argv[3]) : 10;
  PO -= PO % NTH;   // (whole rounds)
  int ref = argc > 4 ? atoi(argv[4]) : 0, a1 = 0, aT = 0;
  int rs_ = 4242; long long tr = 0, tw = 0, tp = 0; double t0 = now();
  srand(7);
  for (int pi = 0; pi < np; pi++) {
    int mv[40], k = 0, rbest = -1, b1 = -1;
    if (!ref) {
      rs_ = (int)(((long long)rs_ * 1103515245 + 12345) & 0x7fffffff); int len = 4 + rs_ % 17;
      while (k < len) { rs_ = (int)(((long long)rs_ * 1103515245 + 12345) & 0x7fffffff); int c = rs_ % 121, u = 0; for (int j = 0; j < k; j++) if (mv[j] == c) u = 1; if (!u) mv[k++] = c; }
    } else {   // (mtbench.c randomPositions)
      for (;;) { int len = 6 + rand() % 19; k = 0; while (k < len) { int c = rand() % 121, u = 0; for (int j = 0; j < k; j++) if (mv[j] == c) u = 1; if (!u) mv[k++] = c; } if (setupMoves(11, 0, mv, k) && !winner(ROOT.b)) break; }
      setupMoves(11, 0, mv, k); treeInit(); search(0, ref); rbest = T[T[0].first + rootBest()].mv;
      setupMoves(11, 0, mv, k); treeInit(); search(0, PO); b1 = T[T[0].first + rootBest()].mv;
    }
    setupMoves(11, 0, mv, k); treeInit(); expT = EXPAND_T;
    memset(owner, -1, sizeof owner); memset(sharers, 0, sizeof sharers); nRead = nWrite = 0;
    gActive = NTH - 1; left = PO; simOn = 1;
    pthread_t th[32];
    for (int t = 0; t < NTH; t++) sem_init(&sem[t], 0, 0);
    for (int t = 0; t < NTH; t++) pthread_create(&th[t], 0, runner, (void *)(long)t);
    sem_post(&sem[0]);
    for (int t = 0; t < NTH; t++) pthread_join(th[t], 0);
    gActive = 0; simOn = 0;
    int best = T[T[0].first + rootBest()].mv;
    printf("pos %d: %.1f read + %.1f write transfers per playout, best %c%d", pi + 1, (double)nRead / PO, (double)nWrite / PO, 'a' + best % 11, best / 11 + 1);
    if (ref) { a1 += b1 == rbest; aT += best == rbest; printf(" | ref %d, 1 thread %d, %d threads %d", rbest, b1, NTH, best); }
    printf("\n"); fflush(stdout);
    tr += nRead; tw += nWrite; tp += PO;
  }
  printf("  by kind: new nodes %.1f, visits %.1f, reads (batched node) %.1f, reads (other) %.1f, RAVE %.1f, slots %.1f | by level:", (double)byCat[0] / tp, (double)byCat[1] / tp, (double)byCat[2] / tp, (double)byCat[3] / tp, (double)byCat[4] / tp, (double)byCat[5] / tp);
  for (int i = 0; i < 7; i++) printf(" %d:%.1f", i, (double)byLvl[i] / tp); printf("\n");
  if (ref) printf("agree with the ref (%d playouts): 1 thread %d/%d, %d threads %d/%d (%d playouts)\n", ref, a1, np, NTH, aT, np, PO);
  printf("threads %d: %.1f line transfers per playout (read %.1f, write %.1f), %.0f s\n", NTH, (double)(tr + tw) / tp, (double)tr / tp, (double)tw / tp, (now() - t0) / 1000);
  return 0;
}
