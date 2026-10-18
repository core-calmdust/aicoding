/* oracle: for each input line "<hexmask> <edge>" prints "<value of position> <value of edge>" (exact, mover's view) */
#include "dots.c"
#include <stdio.h>
int main(int argc, char **argv) {
  setup(4, 4); tt_init(argc > 1 ? atoi(argv[1]) : 25);
  if (getenv("TTSEED")) { FILE *f = fopen(getenv("TTSEED"), "rb"); u64 x; if (f) { while (fread(&x, 8, 1, f) == 1) tt_store(x & KEYMASK, E_LO(x), E_HI(x), E_MV(x) == 63 ? -1 : E_MV(x)); fclose(f); } }
  char line[256];
  while (fgets(line, sizeof line, stdin)) {
    u64 m; int e; if (sscanf(line, "%llx %d", &m, &e) != 2) continue;
    limits(0, 0); int v = value_of(m, -100, 100);
    limits(0, 0); int w = move_value(m, e, -100, 100);
    printf("%d %d\n", v, w); fflush(stdout);
  }
  return 0;
}
