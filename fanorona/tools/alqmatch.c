// Alquerque: engine version A vs B (AQV, see engine.c) at a fixed node budget or time per move.
// Each random opening (2-6 random plies from the start) is played twice with colours swapped.
//   cc -O2 -o /tmp/alqmatch tools/alqmatch.c && /tmp/alqmatch <pairs> <nodesK> <ms> <verA> <verB> [seed]
#define NATIVE
#define TT_BITS 18
#include "../engine.c"
static void startPos(Pos *p) {
  p->p[0] = 0; p->p[1] = 0; p->side = 0;
  for (int r = 0; r < 5; r++) for (int c = 0; c < 5; c++) {
    int i = r * 9 + c, v = r < 2 ? 1 : r > 2 ? 2 : (int[]){ 2, 2, 0, 1, 1 }[c];
    if (v == 1) p->p[0] |= BIT(i); else if (v == 2) p->p[1] |= BIT(i);
  }
}
static int verA, verB;
static void loadAEG(const char *fn) {
  FILE *f = fopen(fn, "rb"); if (!f) { fprintf(stderr, "no %s\n", fn); return; }
  fseek(f, 0, SEEK_END); long n = ftell(f); fseek(f, 0, SEEK_SET);
  u8 *b = malloc(n); if (fread(b, 1, n, f) != (size_t)n) { fclose(f); return; } fclose(f);
  int cnt = *(int *)(b + 4); long o = 8;
  for (int i = 0; i < cnt; i++) { int a = b[o], bb = b[o + 1]; u32 len = *(u32 *)(b + o + 4); aeg_add(a, bb, b + o + 8); o += 8 + len; }
}
// one game; +1 White wins, -1 Black, 0 draw. whiteB: White plays version B
static int game(const Move *open, int no, int whiteB, int nk, int ms, int *plies) {
  Pos p; startPos(&p);
  u64 hist[1200]; int hn2 = 0, quiet = 0;
  for (int ply = 0; ply < 600; ply++) {
    *plies = ply;
    Move L[MAXMV]; int nm = gen(&p, L);
    if (!nm) return p.side ? 1 : -1;
    if (quiet >= DRAW_PLIES) { if (getenv("DBG")) fprintf(stdout, "Q ply %d mat %d-%d\n", ply, pc(p.p[0]), pc(p.p[1])); return 0; }
    u64 h = hashOf(&p); int rep = 0; for (int i = 0; i < hn2; i++) if (hist[i] == h) rep++;
    if (rep >= 2) { if (getenv("DBG")) fprintf(stdout, "R ply %d mat %d-%d\n", ply, pc(p.p[0]), pc(p.p[1])); return 0; }
    hist[hn2++] = h;
    Move m;
    if (ply < no) m = open[ply];
    else {
      int b = (p.side == 0) == whiteB, vv = b ? verB : verA, mul = vv >= 100 ? vv / 100 + 1 : 1; AQV = vv % 100; new_game();   // ver >= 100: (ver / 100 + 1) times the budget
      ROOT = p; rootKey = h; hn = 0; hirr = 0; rootPly = quiet; for (int i = 0; i < hn2 - 1; i++) hkeys[hn++] = hist[i];
      rootN = gen(&p, rootL);
      best(99, ms * mul, ms ? 0 : nk * mul);
      if (IO[0] < 0 || !readMove(&p, (u32)IO[0], (u32)IO[1], &m)) m = L[0];
    }
    quiet = m.paika ? quiet + 1 : 0;
    doMove(&p, &m);
  }
  return 0;
}
int main(int argc, char **argv) {
  int pairs = atoi(argv[1]), nk = atoi(argv[2]), ms = atoi(argv[3]); verA = atoi(argv[4]); verB = atoi(argv[5]);
  rs64 += (u64)(argc > 6 ? atoi(argv[6]) : 1) * 0x2545F4914F6CDD1Dull;
  for (int i = 7; i < argc && i < 15; i++) AW[i - 7] = atoi(argv[i]);
  initGeo(); set_rule(5, 5); set_alq(1); initPST(); initCB();
  if (getenv("AEG")) loadAEG(getenv("AEG"));
  double sb = 0; int w = 0, d = 0, l = 0; long pl = 0;
  for (int k = 0; k < pairs; k++) {
    Pos p; Move open[12]; int no;
    for (;;) {   // a random opening that is still about level (|value| <= 40 at 30k nodes, old version)
      startPos(&p); no = 2 + (int)(rnd64() % 7);
      for (int i = 0; i < no; i++) { Move L[MAXMV]; int nm = gen(&p, L); if (!nm) { no = i; break; } open[i] = L[rnd64() % nm]; doMove(&p, &open[i]); }
      AQV = 0; new_game(); ROOT = p; rootKey = hashOf(&p); hn = 0; hirr = 0; rootPly = 0; rootN = gen(&p, rootL);
      if (!rootN) continue;
      best(99, 0, 30); if (IO[2] >= -40 && IO[2] <= 40) break;
    }
    for (int wb = 0; wb < 2; wb++) {
      int plies, r = game(open, no, wb, nk, ms, &plies), rb = wb ? r : -r; pl += plies;
      if (rb > 0) { w++; sb += 1; } else if (rb == 0) { d++; sb += .5; } else l++;
    }
    fprintf(stderr, "\rpairs %d  B(v%d) vs A(v%d): +%d =%d -%d  score %.3f  avg plies %.0f", k + 1, verB, verA, w, d, l, sb / (2 * (k + 1)), pl / (2.0 * (k + 1)));
  }
  fprintf(stderr, "\n");
  printf("%d %d %d\n", w, d, l);
  return 0;
}
