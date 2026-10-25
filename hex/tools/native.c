// Native build of the Hex engine for the tools: benchmarks, level matches (calibration), self-play records.
//   gcc -O3 -march=native -DNATIVE -o hexn tools/native.c -lm
//   hexn bench 11 1000            playouts per second on an empty 11×11 board (+ the top moves)
//   hexn match 11 20 LA LB        level LA vs level LB, 20 games (colours alternate, swap rule on) → wins of LA
//   hexn selfplay 11 100 LV out   records of LV vs LV appended to out (one game per line: n winner moves…)
//   hexn param k v …              (before a command) engine parameters, see set_param
#define NATIVE 1
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>
static double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec * 1000.0 + t.tv_nsec / 1e6; }
#include "../engine.c"
#include "levels.h"

static int setupMoves(int n, int sw, const int *mv, int k) { IO[0] = n; IO[1] = sw; IO[2] = k; for (int i = 0; i < k; i++) IO[3 + i] = mv[i]; return setup(); }
// parameter sets for A/B tests: pa = params of side A, pb = side B (applied before each move)
static int PA[4] = { 900, 0, 8, 1 }, PB_[4] = { 900, 0, 8, 1 };
static void applyP(const int *p) { set_param(0, p[0]); set_param(1, p[1]); set_param(2, p[2]); set_param(3, p[3]); }
static int aiMove(int n, int sw, const int *mv, int k, int lv) {
  setupMoves(n, sw, mv, k);
  Lv raw = { lv < 0 ? -lv * 100 : 0, 0, 0, 0, 2 };
  const Lv *L = lv < 0 ? &raw : &LV[lv];
  if (L->rnd > 0 && rndF() < L->rnd) { int e[MAXC], ne = 0; for (int i = 0; i < NC; i++) if (!ROOT.b[i]) e[ne++] = i; return e[rndN(ne)]; }
  best(L->po, L->ms, L->temp, 0, L->must);
  return IO[0];
}
static int game(int n, int lvR, int lvB, const int *pR, const int *pB, int *mv, int *len) {
  int k = 0;
  for (;;) {
    setupMoves(n, 1, mv, k);
    int w = winner(ROOT.b); if (w) { *len = k; return w; }
    int red = ROOT.side == RED;
    applyP(red ? pR : pB);
    int m = aiMove(n, 1, mv, k, red ? lvR : lvB);
    if (m < 0) { *len = k; return 0; }
    mv[k++] = m;
  }
}
int main(int argc, char **argv) {
  rs ^= (u64)time(0) * 2654435761ULL ^ (u64)getpid() << 20;
  int ai = 1;
  while (ai < argc && !strcmp(argv[ai], "pa")) { PA[atoi(argv[ai + 1])] = atoi(argv[ai + 2]); ai += 3; }
  while (ai < argc && !strcmp(argv[ai], "pb")) { PB_[atoi(argv[ai + 1])] = atoi(argv[ai + 2]); ai += 3; }
  if (ai >= argc) return 1;
  char **A = argv + ai;
  if (!strcmp(A[0], "bench")) {
    int n = atoi(A[1]), ms = atoi(A[2]); int mv[1];
    applyP(PA);
    setupMoves(n, 0, mv, 0); treeInit(); double t0 = now(); search(ms, 0); double t = now() - t0;
    printf("%d playouts in %.0f ms = %.0f/s, nodes %d\n", totalPO, t, totalPO / t * 1000, nNodes);
    analyze(ms, 0, 8); for (int i = 0; i < IO[0]; i++) printf("  %c%d v=%d n=%d\n", 'a' + IO[2 + 3 * i] % n, IO[2 + 3 * i] / n + 1, IO[3 + 3 * i], IO[4 + 3 * i]);
    return 0;
  }
  if (!strcmp(A[0], "match")) {
    int n = atoi(A[1]), g = atoi(A[2]), a = atoi(A[3]), b = atoi(A[4]);
    int wa = 0, mv[MAXC + 2], len;
    for (int i = 0; i < g; i++) {
      int aRed = i % 2 == 0, w = game(n, aRed ? a : b, aRed ? b : a, aRed ? PA : PB_, aRed ? PB_ : PA, mv, &len);
      if ((w == RED) == aRed) wa++;
    }
    printf("%d %d %d %d\n", a, b, wa, g);
    return 0;
  }
  if (!strcmp(A[0], "serve")) {   // line protocol for the node generators (tools/*.js): see tools/nat.js
    char line[4096];
    applyP(PA);
    while (fgets(line, sizeof line, stdin)) {
      char *tok = strtok(line, " \n"); if (!tok) continue;
      if (!strcmp(tok, "setup")) {
        int n = atoi(strtok(0, " \n")), sw = atoi(strtok(0, " \n")), k = atoi(strtok(0, " \n")); IO[0] = n; IO[1] = sw; IO[2] = k;
        for (int i = 0; i < k; i++) IO[3 + i] = atoi(strtok(0, " \n"));
        printf("%d\n", setup());
      } else if (!strcmp(tok, "setpos")) {
        int n = atoi(strtok(0, " \n")), side = atoi(strtok(0, " \n")), sw = atoi(strtok(0, " \n")); char *b = strtok(0, " \n");
        IO[0] = n; IO[1] = side; for (int i = 0; i < n * n; i++) IO[2 + i] = b[i] == 'r' ? 1 : b[i] == 'b' ? 2 : 0; IO[2 + n * n] = sw;
        printf("%d\n", setpos());
      } else if (!strcmp(tok, "analyze")) {
        int ms = atoi(strtok(0, " \n")), po = atoi(strtok(0, " \n")), mx = atoi(strtok(0, " \n"));
        analyze(ms, po, mx); printf("%d %d", IO[0], IO[1]); for (int i = 0; i < IO[0]; i++) printf(" %d %d %d", IO[2 + 3 * i], IO[3 + 3 * i], IO[4 + 3 * i]); printf("\n");
      } else if (!strcmp(tok, "puzzle")) {
        int n = atoi(strtok(0, " \n")), d = atoi(strtok(0, " \n")), b = atoi(strtok(0, " \n"));
        puzzle(n, d, b); printf("%d", IO[0]); for (int i = 0; i < IO[0]; i++) printf(" %d %d", IO[1 + 2 * i], IO[2 + 2 * i]); printf("\n");
      } else if (!strcmp(tok, "solve")) {
        int k = atoi(strtok(0, " \n")), b = atoi(strtok(0, " \n")); int r = solve(k, b); printf("%d %d\n", r, r > 0 ? IO[1] : -1);
      } else if (!strcmp(tok, "best")) {
        int po = atoi(strtok(0, " \n")), ms = atoi(strtok(0, " \n")), tp = atoi(strtok(0, " \n")), mu = atoi(strtok(0, " \n"));
        best(po, ms, tp, 0, mu); printf("%d %d\n", IO[0], IO[1]);
      } else if (!strcmp(tok, "level")) {
        int lv = atoi(strtok(0, " \n")); const Lv *L = &LV[lv];
        if (L->rnd > 0 && rndF() < L->rnd) { int e[MAXC], ne = 0; for (int i = 0; i < NC; i++) if (!ROOT.b[i]) e[ne++] = i; printf("%d 0\n", e[rndN(ne)]); }
        else { best(L->po, L->ms, L->temp, 0, L->must); printf("%d %d\n", IO[0], IO[1]); }
      } else if (!strcmp(tok, "quit")) break;
      fflush(stdout);
    }
    return 0;
  }
  if (!strcmp(A[0], "selfplay")) {
    int n = atoi(A[1]), g = atoi(A[2]), lv = atoi(A[3]), lv2 = argc > ai + 5 ? atoi(A[5]) : lv; FILE *f = fopen(A[4], "a");
    int mv[MAXC + 2], len;
    for (int i = 0; i < g; i++) {
      int w = game(n, lv, lv2, PA, PA, mv, &len);
      fprintf(f, "%d %d", n, w); for (int k = 0; k < len; k++) fprintf(f, " %d", mv[k]); fprintf(f, "\n"); fflush(f);
    }
    fclose(f); return 0;
  }
  return 0;
}
