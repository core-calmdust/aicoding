// Alquerque native tools for the learned evaluation (README.md here, alquerque/MODEL_CARD.md). The search is the site's own
// (../../../fanorona/engine.c, the same code as engine.wasm / engine_simd.wasm / engine_mt.wasm) compiled natively, Bell's rules
// ('alq'), with the endgame tables alqeg.bin. Built by run.sh: cc -O3 -w aq.c -lm -o aq
// Commands:
//   aq datagen <out.bin> <games> <nodesK> <seed> <alqeg.bin> [net.bin|-]   self-play of the engine (the teacher: the hand
//        evaluation alqHand, or the net given), every searched position written (24 bytes, see Rec) with its value and the result
//   aq match <pairs> <seed> <alqeg.bin> <A> <B>   A against B, every random opening twice (colours swapped); prints A's
//        "+wins -losses =draws". A player: aqv/nodesK/ms/net — aqv = engine.c AQV (11 = the hand evaluation, 27 = the net),
//        nodesK or ms (0 = not used), net = a net file or -
//   aq check <net.bin> <data.bin> [n]   the engine's net on the first n quiet records: a checksum (train prints the same one for
//        its whole-number net; the WebAssembly check wasmcheck.js here too)
//   aq stat <data.bin> <K> [net.bin] [n]   cross-entropy of σ(value / K) against the results: the hand evaluation, the net,
//        the teacher's search value (quiet records, not the exact ones)
//   aq bench <alqeg.bin> <player> [positions]   nodes per second of a player on random middle-game positions
//   aq probe <alqeg.bin> <player> <data.bin> [n]   the player's move / value / depth on the first n quiet records (each from an
//        empty table; wasmcheck.js here does the same with the WebAssembly builds — build with -DTT_BITS=20 to compare)
#define NATIVE
#ifndef TT_BITS
#define TT_BITS 18
#endif
#include "../../../fanorona/engine.c"
#include <math.h>
typedef struct { u64 w, b; i16 v; u8 quiet, pad; i8 res; u8 side, flags, pad2; } Rec;   // flags: 1 exact value, 2 no capture for the mover
_Static_assert(sizeof(Rec) == 24, "Rec");
static u8 *slurp(const char *fn, long *len) {
  FILE *f = fopen(fn, "rb"); if (!f) return 0;
  fseek(f, 0, SEEK_END); long n = ftell(f); fseek(f, 0, SEEK_SET);
  u8 *b = malloc(n + 1); if (fread(b, 1, n, f) != (size_t)n) { fclose(f); free(b); return 0; } fclose(f);
  if (len) *len = n; return b;
}
static void loadAEG(const char *fn) {
  if (!fn || !strcmp(fn, "-")) return;
  u8 *b = slurp(fn, 0); if (!b) { fprintf(stderr, "no %s\n", fn); exit(1); }
  int cnt = *(int *)(b + 4); long o = 8;
  for (int i = 0; i < cnt; i++) { int a = b[o], bb = b[o + 1]; u32 len = *(u32 *)(b + o + 4); aeg_add(a, bb, b + o + 8); o += 8 + len; }
}
// a net file into a blob of AQ_BYTES (0 if none); netUse puts it into the engine (or turns the net off)
static u8 *netRead(const char *fn) {
  if (!fn || !strcmp(fn, "-") || !*fn) return 0;
  long n; u8 *b = slurp(fn, &n); if (!b || n != AQ_BYTES) { fprintf(stderr, "bad net %s\n", fn); exit(1); }
  return b;
}
static void netUse(const u8 *b) { if (b) { memcpy(AQBUF, b, AQ_BYTES); if (!aqn_load(AQ_BYTES)) { fprintf(stderr, "net not loaded\n"); exit(1); } } else aqn_load(0); }
static void startPos(Pos *p) {
  p->p[0] = 0; p->p[1] = 0; p->side = 0;
  for (int r = 0; r < 5; r++) for (int c = 0; c < 5; c++) {
    int i = r * 9 + c, v = r < 2 ? 1 : r > 2 ? 2 : (int[]){ 2, 2, 0, 1, 1 }[c];
    if (v == 1) p->p[0] |= BIT(i); else if (v == 2) p->p[1] |= BIT(i);
  }
}
static void initAll(void) { initGeo(); set_rule(5, 5); set_alq(1); initPST(); initCB(); }
// search the position after the game's history; returns the move (and the value / depth)
static Move think(const Pos *p, const u64 *hist, int nh, int quiet, int nk, int ms, int *val, int *dep) {
  ROOT = *p; rootKey = hashOf(p); hn = 0; hirr = 0; rootPly = quiet;
  for (int i = 0; i < nh - 1 && i < 1100; i++) hkeys[hn++] = hist[i];
  rootN = gen(p, rootL);
  best(99, ms, ms ? 0 : nk);
  Move m = rootL[0]; if (IO[0] >= 0) readMove(p, (u32)IO[0], (u32)IO[1], &m);
  if (val) *val = IO[2]; if (dep) *dep = IO[3];
  return m;
}
// ---------------------------------------------------------------- datagen
static int datagen(int argc, char **argv) {
  if (argc < 7) { fprintf(stderr, "aq datagen <out.bin> <games> <nodesK> <seed> <alqeg.bin> [net.bin|-]\n"); return 2; }
  FILE *out = fopen(argv[2], "wb"); if (!out) { perror(argv[2]); return 1; }
  int games = atoi(argv[3]), nk = atoi(argv[4]); rs64 += (u64)atoll(argv[5]) * 0x2545F4914F6CDD1Dull + 7;
  initAll(); loadAEG(argv[6]);
  u8 *net = netRead(argc > 7 ? argv[7] : 0); netUse(net); AQV = net ? 27 : 11;
  static Rec recs[700]; long total = 0;
  for (int g = 0; g < games; g++) {
    Pos p; startPos(&p); new_game();
    int n = 0, res = 0, quiet = 0, rnd = 2 + (int)(rnd64() % 8);
    u64 hist[700]; int nh = 0;
    for (int ply = 0; ; ply++) {
      Move L[MAXMV]; int nm = gen(&p, L);
      if (!nm) { res = p.side ? 1 : -1; break; }   // (White's view)
      if (quiet >= DRAW_PLIES || ply >= 600) { res = 0; break; }
      u64 h = hashOf(&p); int rep = 0; for (int i = 0; i < nh; i++) if (hist[i] == h) rep++;
      if (rep >= 2) { res = 0; break; }
      hist[nh++] = h;
      Move m;
      if (ply < rnd || nm == 1 || rnd64() % 100 < 2) m = L[rnd64() % nm];
      else {
        int v; m = think(&p, hist, nh, quiet, nk, 0, &v, 0);
        if (n < 700) {
          Rec *r = &recs[n++]; memset(r, 0, sizeof *r);
          r->w = p.p[0]; r->b = p.p[1]; r->v = (i16)(v > 32000 ? 32000 : v < -32000 ? -32000 : v); r->quiet = (u8)quiet; r->side = (u8)p.side;
          r->flags = (v > WINT || v < -WINT ? 1 : 0) | (hasCaps(&p) ? 0 : 2);
        }
      }
      quiet = m.paika ? quiet + 1 : 0;
      doMove(&p, &m);
    }
    for (int i = 0; i < n; i++) recs[i].res = (i8)(res == 0 ? 0 : (res > 0) == (recs[i].side == 0) ? 1 : -1);
    fwrite(recs, sizeof(Rec), n, out); total += n;
  }
  fclose(out);
  fprintf(stderr, "%d games, %ld positions\n", games, total);
  return 0;
}
// ---------------------------------------------------------------- match
typedef struct { int aqv, nk, ms; u8 *net; } Player;
static Player parsePlayer(const char *s) {
  Player P; char fn[1024] = "-"; P.aqv = 11; P.nk = 0; P.ms = 0;
  sscanf(s, "%d/%d/%d/%1023[^\n]", &P.aqv, &P.nk, &P.ms, fn);
  P.net = netRead(fn);
  if ((P.aqv & 16) && !P.net) P.aqv &= ~16;
  return P;
}
static void usePlayer(const Player *P) { AQV = P->aqv; netUse(P->net); }
// one game from the opening; +1 White wins, -1 Black, 0 draw
static int game(const Move *open, int no, const Player *W, const Player *B, int *plies) {
  Pos p; startPos(&p);
  u64 hist[700]; int nh = 0, quiet = 0;
  for (int ply = 0; ; ply++) {
    *plies = ply;
    Move L[MAXMV]; int nm = gen(&p, L);
    if (!nm) return p.side ? 1 : -1;
    if (quiet >= DRAW_PLIES || ply >= 600) return 0;
    u64 h = hashOf(&p); int rep = 0; for (int i = 0; i < nh; i++) if (hist[i] == h) rep++;
    if (rep >= 2) return 0;
    hist[nh++] = h;
    Move m;
    if (ply < no) m = open[ply];
    else if (nm == 1) m = L[0];
    else { const Player *P = p.side ? B : W; usePlayer(P); new_game(); m = think(&p, hist, nh, quiet, P->nk, P->ms, 0, 0); }
    quiet = m.paika ? quiet + 1 : 0;
    doMove(&p, &m);
  }
}
static int match(int argc, char **argv) {
  if (argc < 7) { fprintf(stderr, "aq match <pairs> <seed> <alqeg.bin> <A> <B>\n"); return 2; }
  int pairs = atoi(argv[2]); rs64 += (u64)atoll(argv[3]) * 0x2545F4914F6CDD1Dull;
  initAll(); loadAEG(argv[4]);
  Player A = parsePlayer(argv[5]), B = parsePlayer(argv[6]);
  int w = 0, d = 0, l = 0; long pl = 0; const int openV = getenv("OPENV") ? atoi(getenv("OPENV")) : 300;
  for (int k = 0; k < pairs; k++) {
    Pos p; Move open[16]; int no;
    for (;;) {   // a random opening (2-10 plies; |value| <= OPENV (default 300, 3 pieces) at 20k positions, the hand evaluation:
                 // from level openings two engines of this engine's strength draw almost every game, and the pairs of a slightly
                 // uneven opening — each side once on the better side — show more)
      startPos(&p); no = 2 + (int)(rnd64() % 9);
      for (int i = 0; i < no; i++) { Move L[MAXMV]; int nm = gen(&p, L); if (!nm) { no = i; break; } open[i] = L[rnd64() % nm]; doMove(&p, &open[i]); }
      AQV = 11; aqn_load(0); new_game(); ROOT = p; rootKey = hashOf(&p); hn = 0; hirr = 0; rootPly = 0; rootN = gen(&p, rootL);
      if (rootN < 2) continue;
      best(99, 0, 20); if (IO[2] >= -openV && IO[2] <= openV) break;
    }
    for (int wa = 0; wa < 2; wa++) {   // wa: A plays White
      int plies, r = game(open, no, wa ? &A : &B, wa ? &B : &A, &plies), ra = wa ? r : -r; pl += plies;
      if (ra > 0) w++; else if (ra == 0) d++; else l++;
    }
    fprintf(stderr, "\rpairs %d  A: +%d -%d =%d  avg plies %.0f   ", k + 1, w, l, d, pl / (2.0 * (k + 1)));
  }
  fprintf(stderr, "\n");
  printf("A: +%d -%d =%d\n", w, l, d);
  return 0;
}
// ---------------------------------------------------------------- check / bench
static int check(int argc, char **argv) {
  if (argc < 4) { fprintf(stderr, "aq check <net.bin> <data.bin> [n]\n"); return 2; }
  initAll(); netUse(netRead(argv[2]));
  long nmax = argc > 4 ? atol(argv[4]) : 100000, n = 0; u64 sum = 0; double sa = 0;
  FILE *f = fopen(argv[3], "rb"); if (!f) { perror(argv[3]); return 1; }
  Rec r;
  while (n < nmax && fread(&r, sizeof r, 1, f) == 1) {
    if (!(r.flags & 2)) continue;
    Pos p; p.p[0] = r.w; p.p[1] = r.b; p.side = r.side;
    int v = aqnEval(&p); sum = sum * 1000003u + (u64)(u32)v; sa += v < 0 ? -v : v; n++;
  }
  fclose(f);
  printf("check %ld positions  checksum %016llx  mean |value| %.1f\n", n, (unsigned long long)sum, n ? sa / n : 0);
  return 0;
}
// how well the static evaluations predict the game results (quiet, not exact records): cross-entropy of σ(value / K)
static int stat(int argc, char **argv) {
  if (argc < 4) { fprintf(stderr, "aq stat <data.bin> <K> [net.bin] [n]\n"); return 2; }
  initAll(); double K = atof(argv[3]); u8 *net = netRead(argc > 4 ? argv[4] : 0); netUse(net);
  long nmax = argc > 5 ? atol(argv[5]) : 1000000, n = 0; double ch = 0, cn = 0, cs = 0;
  FILE *f = fopen(argv[2], "rb"); if (!f) { perror(argv[2]); return 1; }
  Rec r;
  #define XE(v) ({ double p_ = 1 / (1 + exp(-(v) / K)), t_ = (r.res + 1) / 2.0; p_ = p_ < 1e-6 ? 1e-6 : p_ > 1 - 1e-6 ? 1 - 1e-6 : p_; -(t_ * log(p_) + (1 - t_) * log(1 - p_)); })
  while (n < nmax && fread(&r, sizeof r, 1, f) == 1) {
    if (!(r.flags & 2) || (r.flags & 1)) continue;
    Pos p; p.p[0] = r.w; p.p[1] = r.b; p.side = r.side;
    AQV = 11; ch += XE(alqHand(&p)); if (net) cn += XE(aqnEval(&p)); cs += XE(r.v); n++;
  }
  fclose(f);
  printf("%ld positions  result cross-entropy (K %.0f): hand %.4f  net %s  search value %.4f\n", n, K, ch / n, net ? ({ static char b[32]; snprintf(b, 32, "%.4f", cn / n); b; }) : "-", cs / n);
  return 0;
}
static int bench(int argc, char **argv) {
  if (argc < 4) { fprintf(stderr, "aq bench <alqeg.bin> <player> [positions]\n"); return 2; }
  initAll(); loadAEG(argv[2]);
  Player P = parsePlayer(argv[3]); int np = argc > 4 ? atoi(argv[4]) : 20;
  u64 tn = 0; double t0 = now(); int dsum = 0;
  rs64 = 0x5DEECE66Dull;
  for (int k = 0; k < np; k++) {
    Pos p; startPos(&p); int no = 4 + k % 12;
    for (int i = 0; i < no; i++) { Move L[MAXMV]; int nm = gen(&p, L); if (!nm) break; doMove(&p, &L[rnd64() % nm]); }
    u64 hist[1] = { hashOf(&p) };
    usePlayer(&P); new_game(); int dep; think(&p, hist, 1, 0, P.nk, P.ms, 0, &dep); tn += (u64)IO[4] * 1000; dsum += dep;
  }
  double ms = now() - t0;
  printf("%d positions  %.0f nodes/s  mean depth %.2f\n", np, tn / (ms / 1000), dsum / (double)np);
  return 0;
}
static int probe(int argc, char **argv) {
  if (argc < 5) { fprintf(stderr, "aq probe <alqeg.bin> <player> <data.bin> [n]\n"); return 2; }
  initAll(); loadAEG(argv[2]);
  Player P = parsePlayer(argv[3]); long nmax = argc > 5 ? atol(argv[5]) : 20, n = 0;
  FILE *f = fopen(argv[4], "rb"); if (!f) { perror(argv[4]); return 1; }
  Rec r;
  while (n < nmax && fread(&r, sizeof r, 1, f) == 1) {
    if (!(r.flags & 2)) continue;
    Pos p; p.p[0] = r.w; p.p[1] = r.b; p.side = r.side;
    usePlayer(&P); new_game(); ROOT = p; rootKey = hashOf(&p); hn = 0; hirr = 0; rootPly = 0; rootN = gen(&p, rootL);
    best(99, 0, P.nk);
    printf("%ld %d %d %d %d\n", n, IO[0], IO[1], IO[2], IO[3]); n++;
  }
  fclose(f);
  return 0;
}
int main(int argc, char **argv) {
  if (argc < 2) { fprintf(stderr, "aq datagen | match | check | bench …\n"); return 2; }
  if (!strcmp(argv[1], "datagen")) return datagen(argc, argv);
  if (!strcmp(argv[1], "match")) return match(argc, argv);
  if (!strcmp(argv[1], "check")) return check(argc, argv);
  if (!strcmp(argv[1], "bench")) return bench(argc, argv);
  if (!strcmp(argv[1], "probe")) return probe(argc, argv);
  if (!strcmp(argv[1], "stat")) return stat(argc, argv);
  fprintf(stderr, "? %s\n", argv[1]); return 2;
}
