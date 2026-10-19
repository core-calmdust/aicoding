/* allvn <R> <ttbits> : for each stdin line "<hexmask>" prints "v e:x ..." where v is the exact position value and x is "=" for an
   optimal move or "-" for a worse move (null-window test against v) */
#include "/home/claude/work/dots4src/dots.c"
#include <stdio.h>
int main(int argc, char **argv) {
  int R = atoi(argv[1]); setup(R, R); tt_init(argc > 2 ? atoi(argv[2]) : 24);
  if (R == 4 && getenv("TTSEED")) { FILE *f = fopen(getenv("TTSEED"), "rb"); u64 x; if (f) { while (fread(&x, 8, 1, f) == 1) tt_store(x & KEYMASK, E_LO(x), E_HI(x), E_MV(x) == 63 ? -1 : E_MV(x)); fclose(f); } fprintf(stderr, "seed loaded\n"); }
  char line[256];
  while (fgets(line, sizeof line, stdin)) {
    unsigned long long m; if (sscanf(line, "%llx", &m) != 1) continue;
    limits(0, 0); int v = value_of(m, -2, 2); if (v <= -2 || v >= 2) { limits(0, 0); v = value_of(m, -100, 100); }
    printf("%d", v); fflush(stdout);
    for (int e = 0; e < E; e++) if (!(m >> e & 1)) { limits(0, 0); int w = move_value(m, e, v - 1, v); printf(" %d:%c", e, w >= v ? '=' : '-'); fflush(stdout); }
    printf("\n"); fflush(stdout);
  }
  return 0;
}
