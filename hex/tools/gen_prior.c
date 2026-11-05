// Self-play records for learning the move prior (tools/train_prior.c): each position with the root visit counts of a search.
//   gcc -O3 -march=native -DNATIVE -o /tmp/hexgen tools/gen_prior.c -lm
//   hexgen out.txt games playouts [seed]   one line per position: n side swapOk board(0/1/2 digits) last | move:visits …
#define NATIVE 1
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>
static double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec * 1000.0 + t.tv_nsec / 1e6; }
#include "../engine.c"
int main(int argc, char **argv) {
  if (argc < 4) return 1;
  FILE *f = fopen(argv[1], "a"); int G = atoi(argv[2]), PO = atoi(argv[3]);
  rs ^= (argc > 4 ? (u64)atoll(argv[4]) : (u64)time(0) ^ (u64)getpid() << 20) * 2654435761ULL;
  static const int SZ[8] = { 9, 10, 11, 11, 11, 12, 13, 13 };
  int mv[MAXC + 2];
  for (int g = 0; g < G; g++) {
    int n = SZ[rndN(8)], k = 0;
    for (;;) {
      IO[0] = n; IO[1] = 1; IO[2] = k; for (int i = 0; i < k; i++) IO[3 + i] = mv[i]; setup();
      if (winner(ROOT.b)) break;
      analyze(0, PO, 0);
      int cnt = IO[0]; if (cnt <= 0) break;
      // record (without the swap move)
      fprintf(f, "%d %d %d ", n, ROOT.side, ROOT.swapOk);
      for (int i = 0; i < NC; i++) fputc('0' + ROOT.b[i], f);
      fprintf(f, " %d |", ROOT.last);
      int tot = 0; for (int i = 0; i < cnt; i++) if (IO[2 + 3 * i] != SWAP && IO[4 + 3 * i] > 0) { fprintf(f, " %d:%d", IO[2 + 3 * i], IO[4 + 3 * i]); tot += IO[4 + 3 * i]; }
      if (IO[3] >= WINT) fprintf(f, " %d:%d", IO[2], 1 + tot / 2);   // proven win: give it the weight
      fputc('\n', f);
      // the move: by visits^(1/T), T high in the opening for variety
      int pick = 0;
      double T0 = k < 4 ? 1.0 : k < 10 ? .5 : 0;
      if (T0 > 0 && IO[3] < WINT) {
        double w[MAXC + 2], s = 0; for (int i = 0; i < cnt; i++) { w[i] = IO[4 + 3 * i] > 0 ? pow(IO[4 + 3 * i], 1 / T0) : 0; s += w[i]; }
        double u = rndF() * s; for (int i = 0; i < cnt; i++) { u -= w[i]; if (u <= 0) { pick = i; break; } }
      }
      mv[k++] = IO[2 + 3 * pick];
    }
    fflush(f);
  }
  fclose(f); return 0;
}
