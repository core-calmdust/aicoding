// Kōnane native tools for the learned evaluation (claude/konane-spec.md「学習した評価」, README.md here). The search is the site's
// own (../../core.c, the same code as core-wasm.js / core_mt.wasm) compiled natively: eng.c twice (engines A and B, each its own
// table) and once with -DNN_DEBUG (C: every evaluation checks its accumulators). Built by run.sh:
//   cc -O3 -w -c eng.c -DPFX=A_ -o a.o; … -DPFX=B_ -o b.o; … -DPFX=C_ -DNN_DEBUG -o c.o; cc -O3 -w kn.c a.o b.o c.o -o kn
// Commands (rule = s8 | s6 | s10, the board 8×8 / 6×6 / 10×10):
//   kn datagen <rule> <out.bin> <games> <nodesK> <seed> [net.bin]   self-play of the engine (search v3; the teacher: the hand
//        evaluation, or the net given), every searched position written (40 bytes, see Rec) with its value and the game's result
//   kn nncheck <rule> <net.bin> [games]   the net's accumulators kept move by move against the whole board's at every evaluation,
//        and the engine's value against nnfeat.h's (the trainer's) at every position of the games
//   kn match <rule> <games> <seed> <A> <B> [random plies]   A against B, every opening twice (colours swapped). A player:
//        mode/nodesK/ms/net — mode 1 = search v2, 2 = v3; nodesK or ms (0 = not used); net = a net file or - (the hand evaluation)
//   kn bench <rule> <player> [moves]      positions per second
//   kn probe <rule> <net|-> [nodesK]      reads lines "<board: . b w a square> <side 0/1> <ply>" and prints, for each, the evaluation
//        (search v3's) and a search of v3 from an empty table (move value depth nodes) — tools/check_nn.js compares WebAssembly
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>
#include "nnfeat.h"
typedef unsigned int u32; typedef unsigned long long u64;
double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec * 1e3 + t.tv_nsec / 1e6; }
static double gEnd = 1e300;
int js_poll(void) { return now() > gEnd; }
int js_shget(u32 a, u32 b) { (void)a; (void)b; return 0; }
void js_shput(u32 a, u32 b, int c, int d, int e, int f) { (void)a; (void)b; (void)c; (void)d; (void)e; (void)f; }
#define DECL(P) \
  extern signed char P##SQ[100]; extern int P##IO[16]; extern u32 P##ZT[402]; extern int P##AOM[512]; \
  void P##setup(int); void P##kclear(void); void P##setn(double, double, int); double P##getn(void); \
  void P##ttclear(void); void P##ab_best3(int, int); int P##ab_moves(void); int P##ab_eval(int); \
  unsigned char *P##net_buf(void); int P##net_load(int, int); void P##net_use(int); int P##net_ok(int); double P##nn_checked(void); double P##nn_bad(void);
DECL(A_) DECL(B_) DECL(C_)
typedef struct {
  signed char *SQ; int *IO; u32 *ZT; int *AOM;
  void (*setup)(int); void (*kclear)(void); void (*setn)(double, double, int); double (*getn)(void);
  void (*ttclear)(void); void (*best)(int, int); int (*moves)(void); int (*eval)(int);
  unsigned char *(*netbuf)(void); int (*netload)(int, int); void (*netuse)(int); double (*checked)(void); double (*bad)(void);
} Eng;
#define ENG(P) { P##SQ, P##IO, P##ZT, P##AOM, P##setup, P##kclear, P##setn, P##getn, P##ttclear, P##ab_best3, P##ab_moves, P##ab_eval, P##net_buf, P##net_load, P##net_use, P##nn_checked, P##nn_bad }
static Eng EA = ENG(A_), EB = ENG(B_), EC = ENG(C_);
#define WIN 30000
#define WINT 29000
// ---- rules (engine.js RULES / RULE_ORDER)
static const char *RN[3] = { "s8", "s6", "s10" };
static const int RSZ[3] = { 8, 6, 10 };
static int rule = 0, N = 8, NN = 64;
static int ruleOf(const char *s) { for (int i = 0; i < 3; i++) if (!strcmp(s, RN[i])) return i; fprintf(stderr, "rule? %s\n", s); exit(2); }
// ---- the keys (engine.js initZobrist: xorshift32 through murmur3's fmix32, the same keys as the page)
static u32 Z1[2][100], Z2[2][100], ZS1, ZS2;
static u32 fmix(u32 z) { z ^= z >> 16; z *= 0x85ebca6bu; z ^= z >> 13; z *= 0xc2b2ae35u; z ^= z >> 16; return z; }
static int RAY[100][4][10], RAYN[100][4];
static void ruleInit(int r) {
  rule = r; N = RSZ[r]; NN = N * N;
  u32 zs = 0x2545F491u ^ (u32)(N * 7919);
  #define ZR() (zs ^= zs << 13, zs ^= zs >> 17, zs ^= zs << 5, fmix(zs))
  for (int k = 0; k < 2; k++) for (int i = 0; i < NN; i++) { Z1[k][i] = ZR(); Z2[k][i] = ZR(); }
  ZS1 = ZR(); ZS2 = ZR();
  static const int DR[4] = { -1, 1, 0, 0 }, DC[4] = { 0, 0, -1, 1 };
  for (int i = 0; i < NN; i++) for (int d = 0; d < 4; d++) { int k = 0, rr = i / N + DR[d], cc = i % N + DC[d]; while (rr >= 0 && rr < N && cc >= 0 && cc < N) { RAY[i][d][k++] = rr * N + cc; rr += DR[d]; cc += DC[d]; } RAYN[i][d] = k; }
}
static void engInit(Eng *E) {
  E->setup(N);
  for (int k = 0; k < 2; k++) for (int i = 0; i < NN; i++) { E->ZT[k * 100 + i] = Z1[k][i]; E->ZT[200 + k * 100 + i] = Z2[k][i]; }
  E->ZT[400] = ZS1; E->ZT[401] = ZS2;
}
static void loadNet(Eng *E, const char *fn) {
  FILE *f = fopen(fn, "rb"); if (!f) { fprintf(stderr, "no net %s\n", fn); exit(2); }
  int n = (int)fread(E->netbuf(), 1, 1 << 20, f); fclose(f);
  if (!E->netload(rule, n)) { fprintf(stderr, "bad net %s (not a %s net?)\n", fn, RN[rule]); exit(2); }
}
// ---- the game
typedef struct { signed char sq[100]; int side, ply; u32 h1, h2; } G;
static void gStart(G *g) {
  memset(g, 0, sizeof *g);
  for (int i = 0; i < NN; i++) { int r = i / N, c = i % N; g->sq[i] = ((r + c) & 1) == ((N - 1) & 1) ? 1 : 2; g->h1 ^= Z1[g->sq[i] - 1][i]; g->h2 ^= Z2[g->sq[i] - 1][i]; }
}
static void gPlay(G *g, int m) {
  int f = m % 128, t = m / 128, x = g->sq[f];
  if (f == t) { g->sq[f] = 0; g->h1 ^= Z1[x - 1][f]; g->h2 ^= Z2[x - 1][f]; }
  else {
    int r0 = f / N, c0 = f % N, r1 = t / N, c1 = t % N, d = c0 == c1 ? (r1 < r0 ? 0 : 1) : (c1 < c0 ? 2 : 3), *ray = RAY[f][d], L = RAYN[f][d];
    for (int k = 0; k < L; k += 2) { int o = ray[k], y = g->sq[o]; g->sq[o] = 0; if (y) { g->h1 ^= Z1[y - 1][o]; g->h2 ^= Z2[y - 1][o]; } if (k + 1 < L && ray[k + 1] == t) break; }
    g->sq[f] = 0; g->sq[t] = (signed char)x; g->h1 ^= Z1[x - 1][f] ^ Z1[x - 1][t]; g->h2 ^= Z2[x - 1][f] ^ Z2[x - 1][t];
  }
  g->side ^= 1; g->ply++; g->h1 ^= ZS1; g->h2 ^= ZS2;
}
static void gLoad(Eng *E, const G *g) { memcpy(E->SQ, g->sq, NN); E->IO[8] = g->side; E->IO[9] = g->ply; E->IO[10] = (int)g->h1; E->IO[11] = (int)g->h2; }
static u64 rs = 88172645463325252ull;
static u64 rnd(void) { rs ^= rs << 13; rs ^= rs >> 7; rs ^= rs << 17; return rs; }
typedef struct { int mode, nk, ms; double dsum; int dn; Eng *E; } Pl;
static void plParse(Pl *p, const char *s, Eng *E) {
  char net[512] = "-"; memset(p, 0, sizeof *p); p->E = E;
  if (sscanf(s, "%d/%d/%d/%511s", &p->mode, &p->nk, &p->ms, net) < 3) { fprintf(stderr, "player? %s (mode/nodesK/ms/net)\n", s); exit(2); }
  engInit(E);
  if (strcmp(net, "-")) { loadNet(E, net); E->netuse(1); } else E->netuse(0);
}
static int plMove(Pl *p, const G *g, int *val) {
  Eng *E = p->E; gLoad(E, g);
  E->setn(0, p->nk ? p->nk * 1000.0 : 1e300, 0); E->kclear();
  gEnd = p->ms ? now() + p->ms : 1e300;
  E->best(60, p->mode); gEnd = 1e300;
  if (E->IO[2] > 0) { p->dsum += E->IO[2]; p->dn++; }
  if (val) *val = E->IO[1];
  return E->IO[0];
}
// ---- datagen
typedef struct { u64 bits[2][2]; short v; unsigned short ply; signed char res; unsigned char rule, side, flags; } Rec;   // 40 bytes: bits[colour][half] (square i: half i >> 6)
static int datagen(int argc, char **argv) {
  if (argc < 7) { fprintf(stderr, "datagen <rule> <out> <games> <nodesK> <seed> [net]\n"); return 2; }
  ruleInit(ruleOf(argv[2])); FILE *out = fopen(argv[3], "ab"); int games = atoi(argv[4]), nk = atoi(argv[5]);
  if (!out) { perror(argv[3]); return 2; }
  rs ^= (u64)atoll(argv[6]) * 0x9E3779B97F4A7C15ull; for (int i = 0; i < 8; i++) rnd();
  char spec[600]; snprintf(spec, sizeof spec, "2/%d/0/%s", nk, argc > 7 ? argv[7] : "-");
  Pl P; plParse(&P, spec, &EA);
  static Rec recs[128]; long total = 0; double t0 = now();
  for (int gi = 0; gi < games; gi++) {
    G g; gStart(&g); EA.ttclear(); int n = 0, loser = -1, rp = 2 + (int)(rnd() % 7);
    for (;;) {
      gLoad(&EA, &g); int nm = EA.moves(), m, v = 0;
      if (!nm) { loser = g.side; break; }
      if (g.ply < rp || rnd() % 100 < 2) m = EA.AOM[rnd() % nm];
      else {
        m = plMove(&P, &g, &v);
        if (n < 128 && g.ply >= 2) { Rec *r = &recs[n++]; memset(r, 0, sizeof *r);
          for (int i = 0; i < NN; i++) if (g.sq[i]) r->bits[g.sq[i] - 1][i >> 6] |= 1ull << (i & 63);
          r->v = (short)(v > 30000 ? 30000 : v < -30000 ? -30000 : v); r->ply = (unsigned short)g.ply; r->rule = (unsigned char)rule; r->side = (unsigned char)g.side; r->flags = (v > WINT || v < -WINT) ? 1 : 0; }
      }
      if (m < 0) { loser = g.side; break; }
      gPlay(&g, m);
    }
    for (int i = 0; i < n; i++) recs[i].res = (signed char)(recs[i].side == loser ? -1 : 1);
    fwrite(recs, sizeof(Rec), n, out); total += n;
    if ((gi + 1) % 50 == 0) { fflush(out); fprintf(stderr, "%s games %d positions %ld  %.0f pos/s\n", RN[rule], gi + 1, total, total / ((now() - t0) / 1000)); }
  }
  fclose(out);
  return 0;
}
// ---- match
static double elo(double x) { return x <= 0 ? -999 : x >= 1 ? 999 : -400 * log10(1 / x - 1); }
static int match(int argc, char **argv) {
  if (argc < 7) { fprintf(stderr, "match <rule> <games> <seed> <A> <B> [random plies]\n"); return 2; }
  ruleInit(ruleOf(argv[2])); int GN = atoi(argv[3]); rs ^= (u64)atoll(argv[4]) * 0x9E3779B97F4A7C15ull; for (int i = 0; i < 8; i++) rnd();
  int pre = argc > 7 ? atoi(argv[7]) : 4;
  Pl PA, PB; plParse(&PA, argv[5], &EA); plParse(&PB, argv[6], &EB);
  int w = 0, l = 0; u64 op[16];
  for (int gi = 0; gi < GN; gi++) {
    if (gi % 2 == 0) for (int i = 0; i < pre && i < 16; i++) op[i] = rnd();
    int first = gi % 2;   // 0: A is Black (moves first)
    G g; gStart(&g); EA.ttclear(); EB.ttclear(); int loser = -1;
    for (;;) {
      gLoad(&EA, &g); int nm = EA.moves(), m;
      if (!nm) { loser = g.side; break; }
      if (g.ply < pre) m = EA.AOM[op[g.ply] % nm];
      else { Pl *p = (g.side == 0) == (first == 0) ? &PA : &PB; m = plMove(p, &g, 0); }
      if (m < 0) { loser = g.side; break; }
      gPlay(&g, m);
    }
    if (loser != first) w++; else l++;   // (A plays the side first)
    if ((gi + 1) % 20 == 0 || gi + 1 == GN) {
      int n = w + l; double sc = (double)w / n, se = sqrt(fmax(sc * (1 - sc), 1e-9) / n);
      printf("%s %d games  +%d -%d =0  %.3f  Elo %.0f (%.0f .. %.0f)  depth %.2f / %.2f\n", RN[rule], n, w, l, sc, elo(sc), elo(sc - 1.96 * se), elo(sc + 1.96 * se),
        PA.dsum / (PA.dn ? PA.dn : 1), PB.dsum / (PB.dn ? PB.dn : 1));
      fflush(stdout);
    }
  }
  return 0;
}
// ---- nncheck: games of the net (search v3, 20,000 positions a move) with every evaluation's accumulators checked, and the
// engine's value at each position against nnfeat.h's (the trainer's whole-number net)
static int nncheck(int argc, char **argv) {
  if (argc < 4) { fprintf(stderr, "nncheck <rule> <net> [games]\n"); return 2; }
  ruleInit(ruleOf(argv[2])); int GN = argc > 4 ? atoi(argv[4]) : 4;
  static KnNet Q; if (!knLoad(&Q, argv[3]) || Q.n != N) { fprintf(stderr, "bad net %s\n", argv[3]); return 2; }
  char spec[600]; snprintf(spec, sizeof spec, "2/20/0/%s", argv[3]);
  Pl P; plParse(&P, spec, &EC);
  Eng hand = EB; engInit(&hand); hand.netuse(0);
  double sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0; int k = 0; long diff = 0;
  for (int gi = 0; gi < GN; gi++) {
    G g; gStart(&g); EC.ttclear();
    for (;;) {
      gLoad(&EC, &g); int nm = EC.moves(); if (!nm) break;
      if (g.ply < 4) { gPlay(&g, EC.AOM[rnd() % nm]); continue; }
      double x = EC.eval(2); gLoad(&hand, &g); double y = hand.eval(2);
      if ((int)x != knEval(&Q, g.sq, g.side, g.ply)) diff++;
      sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; k++;
      int m = plMove(&P, &g, 0); if (m < 0) break;
      gPlay(&g, m);
    }
  }
  long long c = (long long)EC.checked(), b = (long long)EC.bad();
  double r = (k * sxy - sx * sy) / sqrt((k * sxx - sx * sx) * (k * syy - sy * sy) + 1e-9);
  printf("%s nncheck: %lld evaluations checked, %lld with accumulators different from the whole board's; %d positions, %ld with a value different from the trainer's net%s\n",
    RN[rule], c, b, k, diff, (b || diff) ? "  ** NG **" : "  OK");
  printf("%s net vs hand evaluation on %d game positions: correlation %.3f, mean |net| %.0f, |hand| %.0f\n", RN[rule], k, r, sqrt(sxx / (k ? k : 1)), sqrt(syy / (k ? k : 1)));
  return (b || diff) ? 1 : 0;
}
static int bench(int argc, char **argv) {
  ruleInit(ruleOf(argv[2])); int M = argc > 4 ? atoi(argv[4]) : 10;
  Pl P; plParse(&P, argv[3], &EA); double nodes = 0, t = 0;
  G g; gStart(&g);
  for (int i = 0; i < M; i++) {
    gLoad(&EA, &g); if (!EA.moves()) break;
    double t0 = now(); int m = plMove(&P, &g, 0); t += now() - t0; nodes += EA.getn();
    if (m < 0) break; gPlay(&g, m);
  }
  printf("%s %s: %.0f nodes, %.0f ms, %.0f nodes/s, depth %.1f\n", RN[rule], argv[3], nodes, t, nodes / t * 1000, P.dsum / (P.dn ? P.dn : 1));
  return 0;
}
static int probe(int argc, char **argv) {
  ruleInit(ruleOf(argv[2])); int nk = argc > 4 ? atoi(argv[4]) : 20;
  char spec[600]; snprintf(spec, sizeof spec, "2/%d/0/%s", nk, argv[3]);
  Pl P; plParse(&P, spec, &EA);
  char b[128]; int side, ply;
  while (scanf("%127s %d %d", b, &side, &ply) == 3) {
    G g; memset(&g, 0, sizeof g); g.side = side; g.ply = ply;
    for (int i = 0; i < NN; i++) { g.sq[i] = b[i] == 'b' ? 1 : b[i] == 'w' ? 2 : 0; if (g.sq[i]) { g.h1 ^= Z1[g.sq[i] - 1][i]; g.h2 ^= Z2[g.sq[i] - 1][i]; } }
    if (side) { g.h1 ^= ZS1; g.h2 ^= ZS2; }
    gLoad(&EA, &g); int e = EA.eval(2);
    EA.ttclear(); int v; int m = plMove(&P, &g, &v);
    printf("%d %d %d %d %.0f\n", e, m, v, EA.IO[2], EA.getn());
  }
  return 0;
}
int main(int argc, char **argv) {
  if (argc < 2) { fprintf(stderr, "kn datagen | nncheck | match | bench …\n"); return 2; }
  if (!strcmp(argv[1], "datagen")) return datagen(argc, argv);
  if (!strcmp(argv[1], "match")) return match(argc, argv);
  if (!strcmp(argv[1], "nncheck")) return nncheck(argc, argv);
  if (!strcmp(argv[1], "bench")) return bench(argc, argv);
  if (!strcmp(argv[1], "probe")) return probe(argc, argv);
  fprintf(stderr, "unknown command %s\n", argv[1]); return 2;
}
