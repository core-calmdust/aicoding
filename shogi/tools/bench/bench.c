/* bench: fixed-node searches of the site's shogi engine (engine.c, native) on the first N lines of ../match/openings.txt,
   for speed work. It prints the nodes per second and a checksum of the results (best moves, scores, node counts): a change
   that only makes the engine faster must leave the checksum as it was.
   build: cc -O3 -DNATIVE -o bench bench.c        (add -DNUE_H=512 for a 512-wide net)
   usage: bench <nnue.bin> [nodes per position = 300000] [positions = 12]
   (profile: build with -pg, run, then gprof bench gmon.out) */
#define main usimatch_main
#include "../match/usimatch.c"
#undef main
int main(int argc, char **argv) {
  if (argc < 2) { fprintf(stderr, "usage: bench <nnue.bin> [nodes] [positions]\n"); return 1; }
  init(); if (!loadNet(argv[1])) return 1; nue_enable(1);
  int nodes = argc > 2 ? atoi(argv[2]) : 300000, np = argc > 3 ? atoi(argv[3]) : 12;
  FILE *f = fopen("../match/openings.txt", "r"); if (!f) f = fopen("shogi/tools/match/openings.txt", "r"); if (!f) { perror("openings.txt"); return 1; }
  char line[2048]; unsigned long long ck = 1469598103934665603ull; long long tot = 0; double t = 0;
  for (int k = 0; k < np && fgets(line, sizeof line, f); k++) {
    nh = 0; setStart(); char *p = line, tok[16]; int n;
    while (sscanf(p, " %15s%n", tok, &n) == 1) { p += n; int m = fromUsi(tok); if (!m) break; hist[nh++] = m; play_move(m); }
    tt_clear(); reset_search();
    double t0 = js_now(); int m = root_search(0, 0, nodes); t += js_now() - t0;
    tot += res[2];
    unsigned long long v[3] = { (unsigned)m, (unsigned long long)(long long)(resScore * 1000), (unsigned)res[2] };
    for (int i = 0; i < 3; i++) { ck ^= v[i]; ck *= 1099511628211ull; }
  }
  printf("nodes %lld  time %.0f ms  %.0f knps  checksum %016llx\n", tot, t, tot / (t > 0 ? t : 1), ck);
  return 0;
}
