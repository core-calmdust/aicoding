// Self-play data for the learned evaluation: games of the engine against itself (random first plies, a small node
// budget per move, the endgame databases loaded), every position written with the search value and the game result.
//   selfplay <games> <seed> <nodesK> <out.bin> [net.bin]
// record (24 bytes): own u64, opp u64 (side to move's view), value i16 (search, side to move), result i8 (+1 / 0 / -1),
// quiet u8 (no capture available), pad u32
#define NATIVE
#include "../engine.c"
#include "netload.h"
typedef struct { u64 own, opp; i16 v; i8 res; u8 quiet; u32 pad; } Rec;
static Rec recs[1000]; static int side_of[1000];
static void loadEG(const char *fn) {
  FILE *f = fopen(fn, "rb"); if (!f) { fprintf(stderr, "no egdb\n"); return; }
  fseek(f, 0, SEEK_END); long n = ftell(f); fseek(f, 0, SEEK_SET);
  u8 *b = malloc(n); if (fread(b, 1, n, f) != (size_t)n) { fclose(f); return; } fclose(f);
  int cnt = *(int *)(b + 4); long o = 8;
  for (int i = 0; i < cnt; i++) { int a = b[o], bb = b[o + 1]; u32 len = *(u32 *)(b + o + 4); eg_add(a, bb, b + o + 8); o += 8 + len; }
}
int main(int argc, char **argv) {
  int games = atoi(argv[1]); rs64 += (u64)atoi(argv[2]) * 0x2545F4914F6CDD1Dull + 7; int nk = atoi(argv[3]);
  FILE *out = fopen(argv[4], "wb");
  initGeo(); initPST(); initCB();
  loadEG("/tmp/claude-0/fa/egdb.bin");
  if (argc > 5) netLoad(argv[5]);
  long total = 0;
  for (int g = 0; g < games; g++) {
    Pos p; p.p[0] = 0; p.p[1] = 0; p.side = 0;
    // starting position
    for (int i = 0; i < 18; i++) p.p[0] |= BIT(i);
    for (int i = 27; i < 45; i++) p.p[1] |= BIT(i);
    const char *mid = "bwbw.bwbw"; for (int c = 0; c < 9; c++) { if (mid[c] == 'w') p.p[0] |= BIT(18 + c); else if (mid[c] == 'b') p.p[1] |= BIT(18 + c); }
    new_game();
    int n = 0, res = 0, quiet = 0, rnd = (int)(rnd64() % 5);
    u64 hist[600]; int hn2 = 0;
    for (int ply = 0; ply < 300; ply++) {
      Move L[MAXMV]; int nm = gen(&p, L);
      if (getenv("DBG") && ply < 3) fprintf(stderr, "ply %d nm %d quiet %d w %d b %d side %d h %llx\n", ply, nm, quiet, pc(p.p[0]), pc(p.p[1]), p.side, (unsigned long long)hashOf(&p));
      if (!nm) { res = p.side ? 1 : -1; break; }   // side to move lost: res from White's view
      if (quiet >= DRAW_PLIES) { res = 0; if (getenv("DBG")) fprintf(stderr, "quiet end ply %d\n", ply); break; }
      u64 h = hashOf(&p); int rep = 0; for (int i = 0; i < hn2; i++) if (hist[i] == h) rep++;
      if (rep >= 2) { res = 0; if (getenv("DBG")) fprintf(stderr, "rep end ply %d\n", ply); break; }
      hist[hn2++] = h;
      Move m;
      int v = 0;
      // the search from this position (only the game's moves as history: repetition inside the search uses it)
      ROOT = p; rootKey = h; hn = 0; hirr = 0; rootPly = quiet; for (int i = 0; i < hn2 - 1 && i < 1000; i++) hkeys[hn++] = hist[i];
      rootN = gen(&p, rootL);
      if (ply < rnd || (rnd64() % 100) < 3) { m = L[rnd64() % nm]; }
      else {
        best(99, 0, nk);
        v = IO[2];
        if (getenv("DBG") && ply < 8) fprintf(stderr, "  best io0=%d v=%d d=%d\n", IO[0], IO[2], IO[3]);
        if (IO[0] < 0) { m = L[0]; } else { Move mm; if (!readMove(&p, (u32)IO[0], (u32)IO[1], &mm)) mm = L[0]; m = mm; }
        if (ply >= rnd && n < 1000) { recs[n].own = p.p[p.side]; recs[n].opp = p.p[p.side ^ 1]; recs[n].v = (i16)(v > 32000 ? 32000 : v < -32000 ? -32000 : v); recs[n].quiet = !hasCaps(&p); recs[n].pad = 0; side_of[n] = p.side; n++; }
      }
      quiet = m.paika ? quiet + 1 : 0;
      doMove(&p, &m);
      if (ply == 299) res = 0;
    }
    for (int i = 0; i < n; i++) { recs[i].res = (i8)(res == 0 ? 0 : ((res > 0) == (side_of[i] == 0) ? 1 : -1)); }
    fwrite(recs, sizeof(Rec), n, out); total += n; if (getenv("DBG")) fprintf(stderr, "game %d n=%d res=%d\n", g, n, res);
    if ((g + 1) % 50 == 0) { fprintf(stderr, "games %d positions %ld\n", g + 1, total); fflush(out); }
  }
  fclose(out);
  return 0;
}
