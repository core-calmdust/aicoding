/* allvw <R> <ttbits> <win> <ms> : for each stdin line "<hexmask>" prints "v e:v ..." with values clipped to [-win, win]
   (a value printed as -win/+win means "at most"/"at least"); per-move time limit ms ("e:?" when it ran out) */
#include "/home/claude/work/dots4src/dots.c"
#include <stdio.h>
int main(int argc, char **argv) {
  int R = atoi(argv[1]); setup(R, R); tt_init(argc > 2 ? atoi(argv[2]) : 24);
  int W = argc > 3 ? atoi(argv[3]) : 100; double ms = argc > 4 ? atof(argv[4]) : 0;
  if (R == 4 && getenv("TTSEED")) { FILE *f = fopen(getenv("TTSEED"), "rb"); u64 x; if (f) { while (fread(&x, 8, 1, f) == 1) tt_store(x & KEYMASK, E_LO(x), E_HI(x), E_MV(x) == 63 ? -1 : E_MV(x)); fclose(f); } fprintf(stderr, "seed loaded\n"); }
  char line[256];
  while (fgets(line, sizeof line, stdin)) {
    unsigned long long m; if (sscanf(line, "%llx", &m) != 1) continue;
    limits(0, ms); int v = value_of(m, -W, W);
    if (aborted) printf("?"); else printf("%d", v);
    for (int e = 0; e < E; e++) if (!(m >> e & 1)) { limits(0, ms); int w = move_value(m, e, -W, W); if (aborted) printf(" %d:?", e); else printf(" %d:%d", e, w); }
    printf("\n"); fflush(stdout);
  }
  return 0;
}
