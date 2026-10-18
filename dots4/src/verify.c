/* Verification: compare the solver with a plain brute force (full memo over all 2^E positions, every move tried). */
#include "dots.c"
#include <stdio.h>
static i8 *memo;
static int bf(u64 m) {
  if (memo[m] != -128) return memo[m];
  int best = -100, any = 0;
  for (int e = 0; e < E; e++) if (!((m >> e) & 1)) {
    any = 1;
    int k = 0;
    for (int j = 0; j < 2; j++) { int b = j ? eb1[e] : eb0[e]; if (b < 0) continue; int c = 0; for (int i = 0; i < 4; i++) if ((m >> be[b * 4 + i]) & 1) c++; if (c == 3) k++; }
    int v = bf(m | (1ULL << e));
    v = k ? k + v : -v;
    if (v > best) best = v;
  }
  if (!any) best = 0;
  memo[m] = (i8)best; return best;
}
static u64 rs = 88172645463325252ULL;
static u64 rnd(void) { rs ^= rs << 13; rs ^= rs >> 7; rs ^= rs << 17; return rs; }
int main(int argc, char **argv) {
  int r = atoi(argv[1]), c = atoi(argv[2]), samples = argc > 3 ? atoi(argv[3]) : 200000;
  setup(r, c); tt_init(22);
  printf("board %dx%d E=%d ncorner=%d\n", r, c, E, ncorner);
  memo = malloc(1ULL << E); memset(memo, -128, 1ULL << E);
  double t0 = js_now(); int root = bf(0); printf("brute force root value %d (%.1fs)\n", root, (js_now() - t0) / 1000);
  limits(0, 0); int sv = value_of(0, -100, 100); printf("solver root value %d nodes %.0f\n", sv, nodes);
  long bad = 0, badm = 0, n = 0;
  for (int t = 0; t < samples; t++) {
    /* random position: random number of edges */
    int k = rnd() % E; u64 m = 0; while (popc(m) < k) m |= 1ULL << (rnd() % E);
    if (t % 50 == 0) tt_init(20);
    int a = -100, b = 100;
    if (t % 2) { a = (int)(rnd() % 9) - 5; b = a + 1 + (int)(rnd() % 3); }
    limits(0, 0); int v = value_of(m, a, b), w = memo[m] == -128 ? bf(m) : memo[m];
    int ok = (v > a && v < b) ? v == w : (v <= a ? w <= a && (v >= w || 1) : w >= b);
    if (v <= a && w > a) ok = 0; if (v >= b && w < b) ok = 0; if (v > a && v < b && v != w) ok = 0;
    if (!ok) { bad++; if (bad < 10) printf("MISMATCH m=%llx window(%d,%d) solver %d brute %d\n", m, a, b, v, w); }
    /* root moves: the best of the pruned move list must reach the true value */
    if (t % 4 == 0 && popc(m) < E) {
      i8 mv[MAXE]; int nm = root_moves(m, mv), bestv = -100;
      for (int i = 0; i < nm; i++) { u64 m2 = m | (1ULL << mv[i]); set_pos(m); int kk = play(mv[i]); int x = memo[m2] == -128 ? bf(m2) : memo[m2]; x = kk ? kk + x : -x; if (x > bestv) bestv = x; }
      if (bestv != w) { badm++; if (badm < 10) printf("PRUNED-MOVES MISMATCH m=%llx best pruned %d true %d\n", m, bestv, w); }
    }
    n++;
  }
  printf("checked %ld positions: %ld value mismatches, %ld pruned-move mismatches\n", n, bad, badm);
  return 0;
}
