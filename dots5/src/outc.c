/* outc <ttbits> : stdin lines "<hexmask> <t> <ms>" -> "cls value ms" (cls of mover vs target t: 1 win, 0 draw, -1 loss, 9 cut) */
#include "solver5.c"
#include <stdio.h>
int main(int argc, char **argv) {
  setup(5, 5); tt_init(argc > 1 ? atoi(argv[1]) : 24);
  char line[256];
  while (fgets(line, sizeof line, stdin)) {
    unsigned long long m; int t; double ms;
    if (sscanf(line, "%llx %d %lf", &m, &t, &ms) != 3) continue;
    if (t == 999) { tt_init(ttbits); printf("ok\n"); fflush(stdout); continue; }
    double t0 = js_now(); limits(0, ms); int v = value_of(m, t - 1, t + 1);
    printf("%d %d %.0f\n", v == -999 ? 9 : v > t ? 1 : v == t ? 0 : -1, v, js_now() - t0); fflush(stdout);
  }
  return 0;
}
