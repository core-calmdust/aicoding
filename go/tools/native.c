/* Native harness for go/engine.c: correctness tests vs PyTorch, benchmarks, self-play. */
#define NATIVE
#include <stdio.h>
#include "../engine.c"

static unsigned char *readfile(const char *fn, int *len) {
  FILE *f = fopen(fn, "rb"); if (!f) { perror(fn); exit(1); }
  fseek(f, 0, SEEK_END); *len = ftell(f); fseek(f, 0, SEEK_SET);
  unsigned char *b = malloc(*len); fread(b, 1, *len, f); fclose(f); return b;
}
#include <time.h>
static double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec + t.tv_nsec * 1e-9; }

/* moves: "x,y x,y pass ..." */
static void setup(int n, float komi, const char *mv) {
  pos_reset(n, komi);
  const char *s = mv;
  while (s && *s) {
    while (*s == ' ') s++;
    if (!*s) break;
    if (!strncmp(s, "pass", 4)) { pos_play(PASS); s += 4; continue; }
    int x, y; if (sscanf(s, "%d,%d", &x, &y) != 2) break;
    if (!pos_play(y * PL + x)) { fprintf(stderr, "illegal %d,%d\n", x, y); exit(1); }
    while (*s && *s != ' ') s++;
  }
}

int main(int argc, char **argv) {
  if (argc < 3) { fprintf(stderr, "usage: native net.bin cmd ...\n"); return 1; }
  int len; unsigned char *buf = readfile(argv[1], &len);
  int r = net_load(buf, len); if (r < 0) { fprintf(stderr, "load fail %d\n", r); return 1; }
  const char *cmd = argv[2];
  if (!strcmp(cmd, "eval")) { /* eval n komi "moves" sym */
    int n = atoi(argv[3]); float komi = atof(argv[4]);
    setup(n, komi, argv[5]);
    int sym = argc > 6 ? atoi(argv[6]) : 0;
    NNOut o; evaluate(&rootB, sym, &o);
    printf("val %.5f %.5f %.5f score %.4f pass %.4f\n", o.val[0], o.val[1], o.val[2], o.score, o.pol[NP]);
    for (int y = 0; y < n; y++) { for (int x = 0; x < n; x++) printf(" %.3f", o.pol[y * PL + x]); printf("\n"); }
    printf("own\n");
    for (int y = 0; y < n; y++) { for (int x = 0; x < n; x++) printf(" %.3f", o.own[y * PL + x]); printf("\n"); }
    return 0;
  }
  if (!strcmp(cmd, "bench")) {
    int n = argc > 3 ? atoi(argv[3]) : 1000;
    setup(19, 7.5, "3,3 15,15 15,3 3,15");
    NNOut o; double t = now();
    for (int i = 0; i < n; i++) evaluate(&rootB, i & 7, &o);
    printf("%.2f ms/eval\n", (now() - t) * 1000 / n);
    return 0;
  }
  if (!strcmp(cmd, "search")) { /* search n komi "moves" visits */
    int n = atoi(argv[3]); float komi = atof(argv[4]);
    setup(n, komi, argv[5]);
    int v = atoi(argv[6]);
    double t = now();
    search_init(200000);
    search_run(v);
    float *o = search_result(8);
    printf("visits %d wr %.3f score %.2f  (%.2fs)\n", (int)o[1], o[2], o[3], now() - t);
    for (int k = 0; k < (int)o[0]; k++) { float *c = o + 4 + k * 7; int m = (int)c[0]; printf("  %s%d,%d N=%d P=%.3f Q=%.3f wl=%.3f sc=%.2f\n", m == PASS ? "pass " : "", m % PL, m / PL, (int)c[1], c[2], c[3], c[4], c[5]); }
    return 0;
  }
  return 1;
}
