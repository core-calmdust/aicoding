/* allv <R> <ttbits> : for each stdin line "<hexmask>" prints "v e:v e:v ..." (exact values of the position and of every legal move, mover's view) */
#include "dots5.c"
#include <stdio.h>
int main(int argc, char **argv) {
  int R = atoi(argv[1]); setup(R, R); tt_init(argc > 2 ? atoi(argv[2]) : 24);
  if (0) { FILE *f = fopen(getenv("TTSEED"), "rb"); u64 x; if (f) { while (fread(&x, 8, 1, f) == 1) tt_store(x & KEYMASK, E_LO(x), E_HI(x), E_MV(x) == 63 ? -1 : E_MV(x)); fclose(f); } }
  char line[256];
  while (fgets(line, sizeof line, stdin)) {
    unsigned long long m; if (sscanf(line, "%llx", &m) != 1) continue;
    limits(0, 0); int v = value_of(m, -100, 100);
    printf("%d", v);
    for (int e = 0; e < E; e++) if (!(m >> e & 1)) { limits(0, 0); printf(" %d:%d", e, move_value(m, e, -100, 100)); }
    printf("\n"); fflush(stdout);
  }
  return 0;
}
