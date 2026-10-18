/* Verification on larger boards: random positions with few undrawn edges, brute force with a hash memo (no pruning). */
#include "dots.c"
#include <stdio.h>
#define HB 24
static u64 hk[1 << HB]; static i8 hv[1 << HB];
static int bf(u64 m) {
  u64 h = (m * 0x9E3779B97F4A7C15ULL) >> (64 - HB);
  if (hk[h] == m + 1) return hv[h];
  int best = -100, any = 0;
  for (int e = 0; e < E; e++) if (!((m >> e) & 1)) {
    any = 1; int k = 0;
    for (int j = 0; j < 2; j++) { int b = j ? eb1[e] : eb0[e]; if (b < 0) continue; int c = 0; for (int i = 0; i < 4; i++) if ((m >> be[b * 4 + i]) & 1) c++; if (c == 3) k++; }
    int v = bf(m | (1ULL << e)); v = k ? k + v : -v; if (v > best) best = v;
  }
  if (!any) best = 0;
  hk[h] = m + 1; hv[h] = (i8)best; return best;
}
static u64 rs = 88172645463325252ULL;
static u64 rnd(void) { rs ^= rs << 13; rs ^= rs >> 7; rs ^= rs << 17; return rs; }
int main(int argc, char **argv) {
  int r = atoi(argv[1]), c = atoi(argv[2]), samples = atoi(argv[3]), maxund = atoi(argv[4]);
  if (argc > 5) rs += atoi(argv[5]);
  setup(r, c); tt_init(22); long bad = 0, badm = 0;
  for (int t = 0; t < samples; t++) {
    int und = 4 + rnd() % (maxund - 3); u64 m = (E == 64 ? ~0ULL : (1ULL << E) - 1);
    while (E - popc(m) < und) m &= ~(1ULL << (rnd() % E));
    if (t % 20 == 0) tt_init(20);
    limits(0, 0); int v = value_of(m, -100, 100), w = bf(m);
    if (v != w) { bad++; if (bad < 10) printf("MISMATCH %llx solver %d brute %d\n", m, v, w); }
    i8 mv[MAXE]; int nm = root_moves(m, mv), bestv = -100;
    for (int i = 0; i < nm; i++) { set_pos(m); int kk = play(mv[i]); int x = bf(m | (1ULL << mv[i])); x = kk ? kk + x : -x; if (x > bestv) bestv = x; }
    { int lw = (t % 3 == 0) ? -100 : w - 2 * (int)(rnd() % 3); int bm, pbm, pbv; limits(0, 0); int bv = best_from(m, lw, -1, &bm, &pbm, &pbv);
      set_pos(m); int kk = play(bm); int x = bf(m | (1ULL << bm)); x = kk ? kk + x : -x;
      if (bv != w || x != w) { badm++; if (badm < 10) printf("BEST_FROM MISMATCH %llx L=%d got %d move %d (%d) true %d\n", m, lw, bv, bm, x, w); } }
    if (bestv != w) { badm++; if (badm < 10) printf("PRUNED MISMATCH %llx %d %d\n", m, bestv, w); }
  }
  printf("%dx%d: %d positions (<= %d undrawn): %ld value mismatches, %ld pruned-move mismatches\n", r, c, samples, maxund, bad, badm);
  return 0;
}
