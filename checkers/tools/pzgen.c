// Puzzle candidate generator: reads self-play positions (tools/native.c gen records) or samples endgame positions,
// and prints the ones with exactly one first move that reaches the goal in the minimal number of own moves.
// Goals: win (the opponent cannot move) within n, or gain g pieces within n (see engine.c puzzle()).
// build: gcc -O2 -DNATIVE -o pzgen tools/pzgen.c
// usage: pzgen pos <data.bin> <skip> <count> <maxWinN> <maxShotN>   |   pzgen eg <seed> <count> <maxN>
//        eg mode options (env): KINGS=1 kings only, NPMIN / NPMAX piece count range (default 3..5)
#include "../engine.c"

static u64 rng = 0x9E3779B97F4A7C15ull;
static u32 rnd(void) { rng ^= rng << 13; rng ^= rng >> 7; rng ^= rng << 17; return (u32)rng; }
static void specStr(const Pos *p, char *o) { for (int i = 0; i < 32; i++) { u32 b = 1u << i; o[i] = (p->p[0] & b) ? ((p->k & b) ? 'B' : 'b') : (p->p[1] & b) ? ((p->k & b) ? 'W' : 'w') : '.'; } o[32] = 0; }
// does the attacker (to move) reach the goal within exactly-minimal n? returns the unique move index or -1; *nOut = n
static int classify(const Pos *p, int goal, int maxN, int *nOut, int *movesOut, Move *ansOut, u64 budgetPer) {
  Move L[MAXMV]; int n = gen(p, L);
  if (n < 2) return -1;
  *movesOut = n;
  int att = p->side;
  gNeed = goal; gBase = lead(p, att);
  for (int k = 1; k <= maxN; k++) {
    int cnt = 0, idx = -1, unknown = 0;
    for (int i = 0; i < n; i++) {
      Pos q = *p; doMove(&q, &L[i]);
      u64 bud = budgetPer;
      int r = goal ? shotDef(&q, k - 1, att, &bud) : winDef(&q, k - 1, &bud);
      if (r < 0) { unknown = 1; break; }
      if (r == 1) { cnt++; idx = i; }
    }
    if (unknown) return -1;
    if (cnt > 1) return -1;          // more than one solution at the minimal length
    if (cnt == 1) { *nOut = k; *ansOut = L[idx]; return idx; }
  }
  return -1;
}
static int ANA_MS = 150;
static void emit(const Pos *p, int goal, int n, const Move *m, int nmoves, const char *src) {
  char s[40]; specStr(p, s);
  // engine check: value of the answer and of the best move (side to move's view)
  IO[0] = p->p[0]; IO[1] = p->p[1]; IO[2] = p->k; IO[3] = p->side; IO[4] = 0; setup();
  analyze(ANA_MS, 60);
  int va = -99999, vb = IO[4];
  for (int i = 0; i < IO[0]; i++) if ((IO[2 + 3 * i] & 31) == m->f && ((IO[2 + 3 * i] >> 5) & 31) == m->t && (u32)IO[3 + 3 * i] == m->cap) va = IO[4 + 3 * i];
  int pieces = pc(p->p[0] | p->p[1]), kings = pc(p->k);
  printf("{\"b\":\"%s\",\"side\":%d,\"g\":%d,\"n\":%d,\"f\":%d,\"t\":%d,\"cap\":%u,\"moves\":%d,\"pieces\":%d,\"kings\":%d,\"cap1\":%d,\"va\":%d,\"vb\":%d,\"src\":\"%s\"}\n",
    s, p->side + 1, goal, n, m->f, m->t, m->cap, nmoves, pieces, kings, m->cap ? 1 : 0, va, vb, src);
  fflush(stdout);
}
int main(int argc, char **argv) {
  initGeo(); initCB();
  if (getenv("EGDB")) {   // the same loader as native.c (for the "eg" mode: drop trivial endgames)
    FILE *f = fopen(getenv("EGDB"), "rb");
    if (f) { char mg[4]; u32 nc; fread(mg, 1, 4, f); fread(&nc, 4, 1, f); u8 (*h)[4] = malloc(nc * 4); u32 *len = malloc(nc * 4);
      for (u32 i = 0; i < nc; i++) { fread(h[i], 1, 4, f); fread(&len[i], 4, 1, f); }
      for (u32 i = 0; i < nc; i++) { u8 *d = malloc(len[i]); fread(d, 1, len[i], f); eg_add(h[i][0], h[i][1], h[i][2], h[i][3], d); } fclose(f); }
  }
  if (argc > 1 && !strcmp(argv[1], "pos")) {
    FILE *f = fopen(argv[2], "rb"); long skip = atol(argv[3]), count = atol(argv[4]); int maxW = atoi(argv[5]), maxS = atoi(argv[6]);
    fseek(f, skip * 24, SEEK_SET);
    i32 r[6]; long done = 0;
    while (done < count && fread(r, 4, 6, f) == 6) {
      done++;
      Pos p; p.p[0] = (u32)r[0]; p.p[1] = (u32)r[1]; p.k = (u32)r[2]; p.side = r[3] & 1;
      int nm, n; Move m;
      if (classify(&p, 0, maxW, &n, &nm, &m, 400000) >= 0) emit(&p, 0, n, &m, nm, "pos");
      else for (int g = 2; g >= 1; g--) if (classify(&p, g, maxS, &n, &nm, &m, 400000) >= 0 && n >= 2) { emit(&p, g, n, &m, nm, "pos"); break; }
      if (done % 2000 == 0) fprintf(stderr, "\r%ld", done);
    }
    return 0;
  }
  if (argc > 1 && !strcmp(argv[1], "eg")) {   // random endgames: 3-6 pieces, at least one king, side to move has a DB win (when <= 4 pieces)
    rng ^= (u64)atoll(argv[2]) * 0x2545F4914F6CDD1Dull; long count = atol(argv[3]); int maxN = atoi(argv[4]);
    int konly = getenv("KINGS") ? atoi(getenv("KINGS")) : 0, npMin = getenv("NPMIN") ? atoi(getenv("NPMIN")) : 3, npMax = getenv("NPMAX") ? atoi(getenv("NPMAX")) : 5;
    for (long it = 0; it < count; it++) {
      int np = npMin + rnd() % (npMax - npMin + 1); Pos p; p.p[0] = p.p[1] = p.k = 0; p.side = rnd() & 1;
      u32 used = 0; int nb = 1 + rnd() % (np - 1), ok = 1;
      for (int i = 0; i < np && ok; i++) {
        int c = i < nb ? 0 : 1, sq, tries = 0;
        do { sq = rnd() % 32; } while (((used >> sq) & 1) && ++tries < 100);
        used |= 1u << sq; p.p[c] |= 1u << sq;
        int king = konly || (rnd() % 3) == 0 || (c == 0 && (ROW[7] >> sq & 1)) || (c == 1 && (ROW[0] >> sq & 1));
        if (king) p.k |= 1u << sq;
      }
      if (!p.p[0] || !p.p[1] || hasCaps(&p)) continue;
      int nm, n; Move m;
      if (classify(&p, 0, maxN, &n, &nm, &m, 3000000) >= 0) emit(&p, 0, n, &m, nm, "eg");
    }
    return 0;
  }
  fprintf(stderr, "usage\n"); return 1;
}
