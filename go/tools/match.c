/* Visit-count match on the native build of go/engine.c: A (visA visits) vs B (visB visits), same net, colours swapped per pair,
 * the first two moves random (inside the board's edge), the page's move choice (LCB among moves with >= 15% of the top visits,
 * no pass unless the opponent passed or the board is settled), game ends after two passes or 2n^2 moves; the result by the
 * net's score estimate (8 symmetries) of the final position.
 *   gcc -O3 -march=native -o /tmp/gomatch tools/match.c -lm; /tmp/gomatch net.bin games visA visB n seed [komi]  (net.bin = gunzip of net_*.bin.gz) */
#define NATIVE
#include <stdio.h>
#include "../engine.c"
static unsigned char *readfile(const char *fn, int *len) {
  FILE *f = fopen(fn, "rb"); if (!f) { perror(fn); exit(1); }
  fseek(f, 0, SEEK_END); *len = ftell(f); fseek(f, 0, SEEK_SET);
  unsigned char *b = malloc(*len); if (fread(b, 1, *len, f) != (size_t)*len) exit(1); fclose(f); return b;
}
static int mv[2000], nm;
static void replay(int n, float komi) { pos_reset(n, komi); for (int i = 0; i < nm; i++) pos_play(mv[i]); }
static int settled(int n) {
  float *o = eval_root(1); int empty = 0;
  for (int y = 0; y < n; y++) for (int x = 0; x < n; x++) { int p = y * PL + x; if (!pos_stone(p)) { empty++; if (fabsf(o[366 + p]) < 0.8f) return 0; } }
  return empty < n * n * 0.6;
}
static int choose(int n, float komi, int visits) {
  replay(n, komi);
  search_init(600000); search_run(visits - 1);
  float *f = search_result(NP + 1); int k = (int)f[0];
  float mx = 0; for (int j = 0; j < k; j++) if (f[4 + j * 7 + 1] > mx) mx = f[4 + j * 7 + 1];
  int best = -1; float bk = -1e9f;
  for (int j = 0; j < k; j++) { float *c = f + 4 + j * 7; if (c[1] <= 0 || c[1] < 0.15f * mx) continue; float key = c[6] - ((int)c[0] == PASS ? 0.02f : 0); if (key > bk) { bk = key; best = (int)c[0]; } }
  if (best == PASS && !(nm && mv[nm - 1] == PASS)) {
    int alt = -1; float an = 0;
    for (int j = 0; j < k; j++) { float *c = f + 4 + j * 7; if ((int)c[0] != PASS && c[1] > an) { an = c[1]; alt = (int)c[0]; } }
    replay(n, komi);
    if (alt >= 0 && !settled(n)) best = alt;
  }
  return best;
}
int main(int argc, char **argv) {
  if (argc < 7) { fprintf(stderr, "usage\n"); return 1; }
  int len; unsigned char *buf = readfile(argv[1], &len);
  if (net_load(buf, len) < 0) return 1;
  int games = atoi(argv[2]), visA = atoi(argv[3]), visB = atoi(argv[4]), n = atoi(argv[5]), seed = atoi(argv[6]);
  float komi = argc > 7 ? atof(argv[7]) : 7.f;
  int wa = 0;
  for (int g = 0; g < games; g++) {
    int pair = g >> 1, aBlack = !(g & 1);
    unsigned r = (unsigned)(pair + seed * 1000) * 2654435761u + 777u;
    set_seed((int)(r ^ (g * 7919)) | 1);
    #define RND() ((r = r * 1103515245u + 12345u) >> 8) % 1000000 / 1e6
    nm = 0;
    int a = (1 + (int)(RND() * (n - 2))) * PL + 1 + (int)(RND() * (n - 2)), b;
    do b = (1 + (int)(RND() * (n - 2))) * PL + 1 + (int)(RND() * (n - 2)); while (b == a);
    mv[nm++] = a; mv[nm++] = b;
    int passes = 0;
    while (passes < 2 && nm < 2 * n * n) {
      int blackToMove = nm % 2 == 0, aTurn = blackToMove == aBlack;
      int m = choose(n, komi, aTurn ? visA : visB);
      mv[nm++] = m; passes = m == PASS ? passes + 1 : 0;
    }
    replay(n, komi);
    float *o = eval_root(8); float lead = o[365];
    float blackLead = (nm % 2 == 0) ? lead : -lead;
    int aWon = (blackLead > 0) == aBlack; wa += aWon;
    printf("game %d: A %s len %d black lead %.1f -> A %s | A %d/%d\n", g + 1, aBlack ? "black" : "white", nm, blackLead, aWon ? "wins" : "loses", wa, g + 1);
    fflush(stdout);
  }
  return 0;
}
