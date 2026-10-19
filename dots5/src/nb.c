/* nb <ttbits> : env ETC, KILL, HIST, ORD. stdin "<hexmask> <t>" -> ms per outcome solve (cold table), cap CAP ms */
#include "solver5.c"
#include <stdio.h>
int main(int argc, char **argv) {
  setup(5, 5); tt_init(atoi(argv[1]));
  if (getenv("ETC")) etc_min = atoi(getenv("ETC")); if (getenv("KILL")) use_killer = atoi(getenv("KILL"));
  if (getenv("HIST")) use_hist = atoi(getenv("HIST")); if (getenv("ORD")) ord_mode = atoi(getenv("ORD"));
  double cap = getenv("CAP") ? atof(getenv("CAP")) : 20000, tot = 0; int solved = 0, n = 0;
  char line[256];
  while (fgets(line, sizeof line, stdin)) {
    unsigned long long m; int t; if (sscanf(line, "%llx %d", &m, &t) != 2) continue;
    tt_init(ttbits); for (int e = 0; e < MAXE; e++) { hist[e] = 0; } for (int e = 0; e <= MAXE; e++) killer[e] = -1;
    double t0 = js_now(); limits(0, cap); int v = value_of(m, t - 1, t + 1); double dt = js_now() - t0;
    tot += dt; n++; if (v != -999) solved++;
  }
  printf("solved %d/%d total %.0f ms\n", solved, n, tot);
  return 0;
}
