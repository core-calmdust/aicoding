// A vs B at a fixed node budget (or time) per move: A = hand evaluation (or netA), B = the learned net (netB).
// Each opening (random first plies) is played twice with colours swapped. match <pairs> <nodesK> <netB> [netA] [ms]
#define NATIVE
#include "../engine.c"
#include "netload.h"
static float NA[NNET], NB2[NNET]; static int hasA = 0;
static void loadEG(const char *fn) {
  FILE *f = fopen(fn, "rb"); if (!f) return;
  fseek(f, 0, SEEK_END); long n = ftell(f); fseek(f, 0, SEEK_SET);
  u8 *b = malloc(n); if (fread(b, 1, n, f) != (size_t)n) { fclose(f); return; } fclose(f);
  int cnt = *(int *)(b + 4); long o = 8;
  for (int i = 0; i < cnt; i++) { int a = b[o], bb = b[o + 1]; u32 len = *(u32 *)(b + o + 8 - 4); eg_add(a, bb, b + o + 8); o += 8 + len; }
}
static void useCfg(int b) {
  if (b) { memcpy(NET, NB2, sizeof NET); netOn = 1; }
  else if (hasA) { memcpy(NET, NA, sizeof NET); netOn = 1; }
  else netOn = 0;
  new_game();
}
// one game; returns +1 if White wins, -1 Black, 0 draw. whiteB: White uses config B
static int game(const Move *open, int no, int whiteB, int nk, int ms) {
  Pos p; p.p[0] = 0; p.p[1] = 0; p.side = 0;
  for (int i = 0; i < 18; i++) p.p[0] |= BIT(i);
  for (int i = 27; i < 45; i++) p.p[1] |= BIT(i);
  const char *mid = "bwbw.bwbw"; for (int c = 0; c < 9; c++) { if (mid[c] == 'w') p.p[0] |= BIT(18 + c); else if (mid[c] == 'b') p.p[1] |= BIT(18 + c); }
  u64 hist[700]; int hn2 = 0, quiet = 0;
  for (int ply = 0; ply < 400; ply++) {
    Move L[MAXMV]; int nm = gen(&p, L);
    if (!nm) return p.side ? 1 : -1;
    if (quiet >= DRAW_PLIES) return 0;
    u64 h = hashOf(&p); int rep = 0; for (int i = 0; i < hn2; i++) if (hist[i] == h) rep++;
    if (rep >= 2) return 0;
    hist[hn2++] = h;
    Move m;
    if (ply < no) m = open[ply];
    else {
      int b = (p.side == 0) == whiteB; useCfg(b);
      ROOT = p; rootKey = h; hn = 0; hirr = 0; rootPly = quiet; for (int i = 0; i < hn2 - 1; i++) hkeys[hn++] = hist[i];
      rootN = gen(&p, rootL);
      best(99, ms, ms ? 0 : nk);
      if (IO[0] < 0 || !readMove(&p, (u32)IO[0], (u32)IO[1], &m)) m = L[0];
    }
    quiet = m.paika ? quiet + 1 : 0;
    doMove(&p, &m);
  }
  return 0;
}
int main(int argc, char **argv) {
  int pairs = atoi(argv[1]), nk = atoi(argv[2]); int ms = argc > 5 ? atoi(argv[5]) : 0;
  initGeo(); initPST(); initCB();
  loadEG("/tmp/claude-0/fa/egdb.bin");
  if (!netLoad(argv[3])) { fprintf(stderr, "no net B\n"); return 1; } memcpy(NB2, NET, sizeof NET);
  if (argc > 4 && strcmp(argv[4], "-") && netLoad(argv[4])) { memcpy(NA, NET, sizeof NET); hasA = 1; }
  rs64 += 12345;
  double sb = 0; int w = 0, d = 0, l = 0;
  for (int k = 0; k < pairs; k++) {
    // a random opening of 2-4 plies
    Pos p; p.p[0] = 0; p.p[1] = 0; p.side = 0;
    for (int i = 0; i < 18; i++) p.p[0] |= BIT(i);
    for (int i = 27; i < 45; i++) p.p[1] |= BIT(i);
    const char *mid = "bwbw.bwbw"; for (int c = 0; c < 9; c++) { if (mid[c] == 'w') p.p[0] |= BIT(18 + c); else if (mid[c] == 'b') p.p[1] |= BIT(18 + c); }
    Move open[8]; int no = 2 + (int)(rnd64() % 3);
    for (int i = 0; i < no; i++) { Move L[MAXMV]; int nm = gen(&p, L); open[i] = L[rnd64() % nm]; doMove(&p, &open[i]); }
    for (int wb = 0; wb < 2; wb++) {
      int r = game(open, no, wb, nk, ms), rb = wb ? r : -r;
      if (rb > 0) { w++; sb += 1; } else if (rb == 0) { d++; sb += .5; } else l++;
    }
    fprintf(stderr, "\rpairs %d  B: +%d =%d -%d  score %.3f", k + 1, w, d, l, sb / (2 * (k + 1)));
  }
  fprintf(stderr, "\n");
  return 0;
}
