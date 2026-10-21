// Native test / tool driver for checkers/engine.c
// build: gcc -O2 -DNATIVE -o native tools/native.c -lm
#include "../engine.c"
#include <math.h>

static Pos startPos(void) { Pos p; p.p[0] = 0x00000FFFu; p.p[1] = 0xFFF00000u; p.k = 0; p.side = 0; return p; }
static u64 perft(const Pos *p, int d) {
  Move L[MAXMV]; int n = gen(p, L);
  if (d == 1) return n;
  u64 s = 0; for (int i = 0; i < n; i++) { Pos q = *p; doMove(&q, &L[i]); s += perft(&q, d - 1); }
  return s;
}
static void sqName(char *o, const Move *m) { sprintf(o, "%d%c%d", m->f + 1, m->cap ? 'x' : '-', m->t + 1); }


// ---------------------------------------------------------------- self-play
static u64 rng = 88172645463325252ull;
static u32 rnd32(void) { rng ^= rng << 13; rng ^= rng >> 7; rng ^= rng << 17; return (u32)rng; }
typedef struct { float *w; int h, h2; float scale; int n; } Net;
static Net loadNet(const char *fn) {
  Net N = { 0 }; FILE *f = fopen(fn, "rb"); if (!f) { fprintf(stderr, "no net %s\n", fn); exit(1); }
  u32 hd[3]; float sc; fread(hd, 4, 3, f); fread(&sc, 4, 1, f);
  N.h = hd[1]; N.h2 = hd[2]; N.scale = sc; N.n = NIN * N.h + N.h + N.h * N.h2 + N.h2 + N.h2 + 1;
  N.w = malloc(N.n * 4); fread(N.w, 4, N.n, f); fclose(f); return N;
}
static void useNetW(const Net *N) { if (!N || !N->w) { NH = 0; return; } memcpy(W1, N->w, N->n * 4); net_set(N->h, N->h2, N->scale); }
// one engine "player": node budget (k), optional net
typedef struct { int nodesK; int depth; Net *net; int ms; } Player;
static int setupFrom(const Pos *start, Move *hist, int nh) {
  IO[0] = start->p[0]; IO[1] = start->p[1]; IO[2] = start->k; IO[3] = start->side; IO[4] = nh;
  for (int i = 0; i < nh; i++) { IO[5 + 2 * i] = hist[i].f | (hist[i].t << 5); IO[6 + 2 * i] = hist[i].cap; }
  return setup();
}
static int pickMove(Player *P, const Pos *start, Move *hist, int nh, Move *out, int *val) {
  if (!setupFrom(start, hist, nh)) { fprintf(stderr, "bad setup\n"); exit(1); }
  if (!rootN) return 0;
  useNetW(P->net);
  best(P->depth ? P->depth : 99, P->ms, P->ms ? 0 : P->nodesK);
  for (int i = 0; i < rootN; i++) if (rootL[i].f == (IO[0] & 31) && rootL[i].t == ((IO[0] >> 5) & 31) && rootL[i].cap == (u32)IO[1]) { *out = rootL[i]; if (val) *val = IO[2]; return 1; }
  *out = rootL[0]; return 1;
}
// play one game; returns 1 black wins, -1 white wins, 0 draw. randomPlies: random opening moves
static Move GH[1200];
static int playGame(Player *B, Player *W, int randomPlies, Pos *startOut, int *nOut, FILE *data, int dataNodes) {
  Pos start; start.p[0] = 0xFFF; start.p[1] = 0xFFF00000u; start.k = 0; start.side = 0;
  Pos p = start; int nh = 0;
  u64 keys[1200]; int nk = 0; keys[nk++] = hashOf(&p);
  int quiet = 0, result = 0;
  static i32 recs[1200][6]; int nrec = 0;
  new_game();
  for (int ply = 0; ply < 400; ply++) {
    Move L[MAXMV]; int n = gen(&p, L);
    if (!n) { result = p.side ? 1 : -1; break; }
    Move m;
    if (ply < randomPlies) m = L[rnd32() % n];
    else {
      Player *P = p.side ? W : B; int v = 0;
      pickMove(P, &start, GH, nh, &m, &v);
      if (data && !hasCaps(&p) && ply >= randomPlies) {   // record quiet positions with the search value (side to move)
        int sv = v;
        if (dataNodes) { Player Q = { dataNodes, 0, P->net, 0 }; Move mm; pickMove(&Q, &start, GH, nh, &mm, &sv); }
        if (sv > -WINT && sv < WINT && nrec < 1200) { i32 *rec = recs[nrec++]; rec[0] = (i32)p.p[0]; rec[1] = (i32)p.p[1]; rec[2] = (i32)p.k; rec[3] = p.side | (ply << 8); rec[4] = sv; }
      }
    }
    GH[nh++] = m;
    int irr = irreversible(&p, &m);
    doMove(&p, &m);
    quiet = irr ? 0 : quiet + 1;
    if (irr) nk = 0;
    keys[nk++] = hashOf(&p);
    int rep = 0; for (int i = 0; i < nk - 1; i++) if (keys[i] == keys[nk - 1]) rep++;
    if (rep >= 2 || quiet >= DRAW_PLIES) { result = 0; break; }
    // adjudicate clear endgames with the database
    if (egMaxN) { int e = egProbe(&p); if (e && !hasCaps(&p)) { result = e == 3 ? 0 : ((e == 1) == (p.side == 0)) ? 1 : -1; break; } }
  }
  if (data && nrec) {   // the result (side to move's view) goes with every record of this game
    for (int i = 0; i < nrec; i++) { recs[i][5] = (recs[i][3] & 1) ? -result : result; fwrite(recs[i], 4, 6, data); }
  }
  if (startOut) *startOut = start; if (nOut) *nOut = nh;
  return result;
}

static void egLoad(const char *fn) {
  FILE *f = fopen(fn, "rb"); if (!f) return;
  char mg[4]; u32 nc; fread(mg, 1, 4, f); fread(&nc, 4, 1, f);
  u8 (*h)[4] = malloc(nc * 4); u32 *len = malloc(nc * 4);
  for (u32 i = 0; i < nc; i++) { fread(h[i], 1, 4, f); fread(&len[i], 4, 1, f); }
  for (u32 i = 0; i < nc; i++) { u8 *d = malloc(len[i]); fread(d, 1, len[i], f); eg_add(h[i][0], h[i][1], h[i][2], h[i][3], d); }
  fclose(f); fprintf(stderr, "egdb: %u classes, up to %d pieces\n", nc, egMaxN);
}
static int cmdMatch(int argc, char **argv) {
  // match games nodesA nodesB [netA|-] [netB|-] [depthA depthB]
  int G = atoi(argv[2]); Player A = { atoi(argv[3]), 0, 0, 0 }, B = { atoi(argv[4]), 0, 0, 0 };
  if (argv[3][0] == 't') { A.ms = atoi(argv[3] + 1); } if (argv[4][0] == 't') { B.ms = atoi(argv[4] + 1); }
  Net na = { 0 }, nb = { 0 };
  if (argc > 5 && strcmp(argv[5], "-")) { na = loadNet(argv[5]); A.net = &na; }
  if (argc > 6 && strcmp(argv[6], "-")) { nb = loadNet(argv[6]); B.net = &nb; }
  if (argc > 8) { A.depth = atoi(argv[7]); B.depth = atoi(argv[8]); }
  int w = 0, d = 0, l = 0;
  for (int g = 0; g < G; g++) {
    u64 seed = rng;   // same opening with colours swapped
    int r1 = playGame(&A, &B, 3, 0, 0, 0, 0);
    rng = seed; int r2 = -playGame(&B, &A, 3, 0, 0, 0, 0);
    for (int r = 0; r < 2; r++) { int x = r ? r2 : r1; if (x > 0) w++; else if (x < 0) l++; else d++; }
    rnd32();
    double sc = (w + d * 0.5) / (w + d + l);
    double elo = sc <= 0 ? -999 : sc >= 1 ? 999 : -400 * log10(1 / sc - 1);
    fprintf(stderr, "\r%d/%d  +%d =%d -%d  score %.3f  Elo %+.0f   ", g + 1, G, w, d, l, sc, elo);
  }
  fprintf(stderr, "\n");
  printf("A vs B: +%d =%d -%d\n", w, d, l);
  return 0;
}
static int cmdGen(int argc, char **argv) {
  // gen games nodesPlay nodesLabel out.bin [net] [seed]
  int G = atoi(argv[2]); Player P = { atoi(argv[3]), 0, 0, 0 }; int lab = atoi(argv[4]);
  FILE *f = fopen(argv[5], "ab+"); Net n0 = { 0 };
  if (argc > 6 && strcmp(argv[6], "-")) { n0 = loadNet(argv[6]); P.net = &n0; }
  if (argc > 7) rng ^= (u64)atoll(argv[7]) * 0x9E3779B97F4A7C15ull;
  for (int g = 0; g < G; g++) { fseek(f, 0, SEEK_END); playGame(&P, &P, 4 + rnd32() % 6, 0, 0, f, lab); if (g % 10 == 0) { fflush(f); fprintf(stderr, "\rgame %d  pos %ld   ", g, ftell(f) / 24); } }
  fclose(f); fprintf(stderr, "\n"); return 0;
}

// ---------------------------------------------------------------- AI levels (mirror of engine.js LEVELS) for calibration
typedef struct { int d, noise, hand, s, nk, ms, book; double blunder; } Lv;
static Lv LVS[21] = { {0},
  { 1, 260, 1, 0, 0, 0, 0, .32 }, { 2, 200, 1, 0, 0, 0, 0, .24 }, { 2, 150, 1, 0, 0, 0, 0, .18 }, { 3, 115, 1, 0, 0, 0, 0, .13 }, { 3, 85, 1, 0, 0, 0, 0, .09 },
  { 4, 65, 1, 0, 0, 0, 0, .06 }, { 4, 48, 1, 0, 0, 0, 0, .04 }, { 5, 36, 1, 0, 0, 0, 0, .025 }, { 6, 26, 1, 0, 0, 0, 0, .015 }, { 6, 18, 1, 0, 0, 0, 0, 0 },
  { 7, 12, 1, 0, 0, 0, 0, 0 }, { 99, 0, 0, 1, 2, 0, 0, 0 }, { 99, 0, 0, 1, 5, 0, 0, 0 }, { 99, 0, 0, 1, 12, 0, 0, 0 }, { 99, 0, 0, 1, 30, 0, 0, 0 },
  { 99, 0, 0, 1, 80, 3000, 0, 0 }, { 99, 0, 0, 1, 200, 3000, 0, 0 }, { 99, 0, 0, 1, 500, 3000, 0, 0 }, { 99, 0, 0, 1, 0, 1000, 1, 0 }, { 99, 0, 0, 1, 0, 2500, 1, 0 } };
static double TSCALE = 1.0;
static double gaussR(void) { double u = 0, v = 0; while (u <= 0) u = (rnd32() + 1.0) / 4294967297.0; while (v <= 0) v = (rnd32() + 1.0) / 4294967297.0; return sqrt(-2 * log(u)) * cos(2 * 3.14159265358979 * v); }
static Net *LVNET = 0;
static int lvPick(int lv, const Pos *start, Move *hist, int nh, Move *out) {
  Lv L = LVS[lv];
  if (!setupFrom(start, hist, nh)) exit(1);
  if (!rootN) return 0;
  if (rootN == 1) { *out = rootL[0]; return 1; }
  useNetW(LVNET);
  if (!L.s) {
    values(L.d, L.hand);
    int n = IO[0]; Move mv[MAXMV]; int vv[MAXMV];
    for (int i = 0; i < n; i++) { for (int j = 0; j < rootN; j++) if (rootL[j].f == (IO[2 + 3 * i] & 31) && rootL[j].t == ((IO[2 + 3 * i] >> 5) & 31) && rootL[j].cap == (u32)IO[3 + 3 * i]) mv[i] = rootL[j]; vv[i] = IO[4 + 3 * i]; }
    if (L.blunder > 0 && rnd32() / 4294967296.0 < L.blunder) { int ok[MAXMV], k = 0; for (int i = 0; i < n; i++) if (vv[i] > vv[0] - 400) ok[k++] = i; if (k < 2) { for (int i = 0; i < n; i++) ok[i] = i; k = n; } *out = mv[ok[rnd32() % k]]; return 1; }
    double bv = -1e9; int bi = 0;
    for (int i = 0; i < n; i++) { double x = vv[i] + ((vv[i] > WINT || vv[i] < -WINT) ? 0 : gaussR() * L.noise); if (x > bv) { bv = x; bi = i; } }
    *out = mv[bi]; return 1;
  }
  int ms = (int)(L.ms * TSCALE);
  if (L.book && nh < 8) {
    analyze(ms > 0 ? (int)(ms * 0.8) : 300, 40);
    int n = IO[0], k = 0, ok[MAXMV]; for (int i = 0; i < n; i++) if (IO[4 + 3 * i] >= IO[4] - 8) ok[k++] = i;
    int i = ok[rnd32() % k]; for (int j = 0; j < rootN; j++) if (rootL[j].f == (IO[2 + 3 * i] & 31) && rootL[j].t == ((IO[2 + 3 * i] >> 5) & 31) && rootL[j].cap == (u32)IO[3 + 3 * i]) { *out = rootL[j]; return 1; }
  }
  best(L.d, ms, L.nk);
  for (int j = 0; j < rootN; j++) if (rootL[j].f == (IO[0] & 31) && rootL[j].t == ((IO[0] >> 5) & 31) && rootL[j].cap == (u32)IO[1]) { *out = rootL[j]; return 1; }
  *out = rootL[0]; return 1;
}
static int lvGame(int lb, int lw, int randomPlies) {
  Pos start; start.p[0] = 0xFFF; start.p[1] = 0xFFF00000u; start.k = 0; start.side = 0;
  Pos p = start; int nh = 0; u64 keys[1200]; int nk = 0, quiet = 0; keys[nk++] = hashOf(&p);
  new_game();
  for (int ply = 0; ply < 400; ply++) {
    Move L[MAXMV]; int n = gen(&p, L);
    if (!n) return p.side ? 1 : -1;
    Move m; if (ply < randomPlies) m = L[rnd32() % n]; else lvPick(p.side ? lw : lb, &start, GH, nh, &m);
    GH[nh++] = m; int irr = irreversible(&p, &m); doMove(&p, &m); quiet = irr ? 0 : quiet + 1; if (irr) nk = 0; keys[nk++] = hashOf(&p);
    int rep = 0; for (int i = 0; i < nk - 1; i++) if (keys[i] == keys[nk - 1]) rep++;
    if (rep >= 2 || quiet >= DRAW_PLIES) return 0;
    if (egMaxN) { int e = egProbe(&p); if (e && !hasCaps(&p)) return e == 3 ? 0 : ((e == 1) == (p.side == 0)) ? 1 : -1; }
  }
  return 0;
}
static int cmdLv(int argc, char **argv) {   // lv A B games [net] [tscale]
  int A = atoi(argv[2]), B = atoi(argv[3]), G = atoi(argv[4]); Net n0 = { 0 };
  for (int i = 1; i <= 20; i++) {   // experiment: LV<n>="d,noise,hand,s,nk,ms,book,blunder" overrides a level
    char k[8]; snprintf(k, sizeof k, "LV%d", i); const char *e = getenv(k); if (!e) continue;
    Lv *L = &LVS[i]; sscanf(e, "%d,%d,%d,%d,%d,%d,%d,%lf", &L->d, &L->noise, &L->hand, &L->s, &L->nk, &L->ms, &L->book, &L->blunder);
  }
  if (argc > 5 && strcmp(argv[5], "-")) { n0 = loadNet(argv[5]); LVNET = &n0; }
  if (argc > 6) TSCALE = atof(argv[6]);
  int w = 0, d = 0, l = 0;
  for (int g = 0; g < G; g++) {
    u64 seed = rng; int r1 = lvGame(A, B, 2); rng = seed; int r2 = -lvGame(B, A, 2); rnd32();
    for (int x = 0; x < 2; x++) { int r = x ? r2 : r1; if (r > 0) w++; else if (r < 0) l++; else d++; }
  }
  double sc = (w + d * 0.5) / (w + d + l);
  printf("Lv%d vs Lv%d: +%d =%d -%d  score %.3f\n", A, B, w, d, l, sc); fflush(stdout);
  return 0;
}

int main(int argc, char **argv) {
  initGeo(); initCB();
  if (getenv("EGDB")) egLoad(getenv("EGDB"));
  static Net gnet; if (getenv("NETFILE")) { gnet = loadNet(getenv("NETFILE")); useNetW(&gnet); }
  if (argc > 1 && !strcmp(argv[1], "perft")) {
    Pos p = startPos(); int D = argc > 2 ? atoi(argv[2]) : 8;
    for (int d = 1; d <= D; d++) { double t = now(); u64 n = perft(&p, d); printf("perft %d = %llu (%.0f ms)\n", d, (unsigned long long)n, now() - t); }
    return 0;
  }
  if (argc > 1 && !strcmp(argv[1], "think")) {   // think <ms>: search the start position
    int ms = argc > 2 ? atoi(argv[2]) : 1000;
    Pos p = startPos(); IO[0] = p.p[0]; IO[1] = p.p[1]; IO[2] = p.k; IO[3] = 0; IO[4] = 0; setup();
    double t = now(); best(60, ms, 0);
    Move m = { (u32)IO[1], IO[0] & 31, (IO[0] >> 5) & 31, 0, 0 }; char s[32]; sqName(s, &m);
    printf("best %s v=%d depth=%d nodes=%dk  %.0f ms  (%.1f Mnps)\n", s, IO[2], IO[3], IO[4], now() - t, IO[4] / (now() - t));
    return 0;
  }
  if (argc > 1 && !strcmp(argv[1], "match")) return cmdMatch(argc, argv);
  if (argc > 1 && !strcmp(argv[1], "gen")) return cmdGen(argc, argv);
  if (argc > 1 && !strcmp(argv[1], "lv")) return cmdLv(argc, argv);
  if (argc > 1 && !strcmp(argv[1], "acctest")) {   // incremental vs full net evaluation along random games
    int bad = 0, tot = 0;
    for (int g = 0; g < 200; g++) { Pos p = startPos(); accFull(&p, 0); int ply = 0;
      for (; ply < 100; ply++) { Move L[MAXMV]; int n = gen(&p, L); if (!n) break; Move m = L[rnd32() % n]; accMove(&p, &m, ply); doMove(&p, &m);
        int a = netEvalAcc(&p, ply + 1), b = netEval(&p); tot++; if (abs(a - b) > 1) { bad++; } if (ply + 2 >= MAXPLY) break; } }
    printf("acc mismatches %d / %d\n", bad, tot); return 0; }
  printf("usage: native perft [d] | think [ms]\n");
  return 0;
}
