// Ugolki native tools for the learned evaluation (claude/ugolki-spec.md「学習した評価」, README.md here). The search is the site's
// own (../../core.c, the same code as core-wasm.js / core_mt.wasm) compiled natively: eng.c twice (engines A and B, each its own
// table) and once with -DNN_DEBUG (C: every evaluation checks its accumulators). Built by run.sh:
//   cc -O3 -w -c eng.c -DPFX=A_ -o a.o; … -DPFX=B_ -o b.o; … -DPFX=C_ -DNN_DEBUG -o c.o; cc -O3 -w ug.c a.o b.o c.o -o ug
// Commands (rule = c33 | c34 | c44 | diag):
//   ug datagen <rule> <out.bin> <games> <nodesK> <seed> [net.bin]   self-play of the engine (search v3, the teacher: the hand
//        evaluation, or the net given), every searched position written (24 bytes, see Rec) with its value and the game's result
//   ug nncheck <rule> <net.bin> [games]     the net's accumulators kept move by move against the whole board's, at every evaluation
//   ug match <rule> <games> <seed> <A> <B> [random plies]   A against B, every opening twice (colours swapped). A player:
//        mode/nodesK/ms/net — mode 1 = search v2, 2 = v3; nodesK or ms (0 = not used); net = a net file or - (the hand evaluation)
//   ug bench <rule> <player> [positions]    nodes per second
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>
typedef unsigned int u32; typedef unsigned long long u64;
double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec * 1e3 + t.tv_nsec / 1e6; }
static double gEnd = 1e300;
int js_poll(void) { return now() > gEnd; }
int js_shget(u32 a, u32 b) { (void)a; (void)b; return 0; }
void js_shput(u32 a, u32 b, int c, int d, int e, int f, int g) { (void)a; (void)b; (void)c; (void)d; (void)e; (void)f; (void)g; }
#define DECL(P) \
  extern signed char P##SQ[64]; extern int P##IO[32]; extern u32 P##ZT[258], P##RH1[4096], P##RH2[4096]; extern int P##AOM[512], P##AOV[512]; \
  void P##setup(int, int, int, int, int); void P##kclear(void); void P##setn(double, double, int); double P##getn(void); \
  void P##ttclear(void); void P##ab_best3(int, int); int P##ab_term(void); int P##ab_moves(void); int P##ab_eval(int); \
  unsigned char *P##net_buf(void); int P##net_load(int, int); void P##net_use(int); int P##net_ok(int);
DECL(A_) DECL(B_) DECL(C_)
long long C_nn_checked(void); long long C_nn_bad(void);
typedef struct {
  signed char *SQ; int *IO; u32 *ZT, *RH1, *RH2; int *AOM;
  void (*setup)(int, int, int, int, int); void (*kclear)(void); void (*setn)(double, double, int); double (*getn)(void);
  void (*ttclear)(void); void (*best)(int, int); int (*term)(void); int (*moves)(void); int (*eval)(int);
  unsigned char *(*netbuf)(void); int (*netload)(int, int); void (*netuse)(int); int (*netok)(int);
} Eng;
#define ENG(P) { P##SQ, P##IO, P##ZT, P##RH1, P##RH2, P##AOM, P##setup, P##kclear, P##setn, P##getn, P##ttclear, P##ab_best3, P##ab_term, P##ab_moves, P##ab_eval, P##net_buf, P##net_load, P##net_use, P##net_ok }
static Eng EA = ENG(A_), EB = ENG(B_), EC = ENG(C_);
#define WIN 30000
#define WINT 29000
#define NOTOVER 99999
// ---- rules (engine.js RULES)
static const char *RN[4] = { "c33", "c34", "c44", "diag" };
static const int RR[4][5] = { { 3, 3, 0, 40, 80 }, { 3, 4, 0, 50, 100 }, { 4, 4, 0, 60, 120 }, { 3, 3, 1, 30, 80 } };
static int rule = 0;
static int ruleOf(const char *s) { for (int i = 0; i < 4; i++) if (!strcmp(s, RN[i])) return i; fprintf(stderr, "rule? %s\n", s); exit(2); }
// ---- the keys (engine.js zr(): xorshift32 through murmur3's fmix32, the same keys as the page)
static u32 Z1[2][64], Z2[2][64], ZS1, ZS2;
static u32 fmix(u32 z) { z ^= z >> 16; z *= 0x85ebca6bu; z ^= z >> 13; z *= 0xc2b2ae35u; z ^= z >> 16; return z; }
static void zinit(void) {
  u32 zs = 0x2545F491;
  #define ZR() (zs ^= zs << 13, zs ^= zs >> 17, zs ^= zs << 5, fmix(zs))
  for (int k = 0; k < 2; k++) for (int i = 0; i < 64; i++) { Z1[k][i] = ZR(); Z2[k][i] = ZR(); }
  ZS1 = ZR(); ZS2 = ZR();
}
static void engInit(Eng *E) {
  E->setup(RR[rule][0], RR[rule][1], RR[rule][2], RR[rule][3], RR[rule][4]);
  for (int k = 0; k < 2; k++) for (int i = 0; i < 64; i++) { E->ZT[k * 64 + i] = Z1[k][i]; E->ZT[128 + k * 64 + i] = Z2[k][i]; }
  E->ZT[256] = ZS1; E->ZT[257] = ZS2;
}
static int loadNet(Eng *E, const char *fn) {
  FILE *f = fopen(fn, "rb"); if (!f) { fprintf(stderr, "no net %s\n", fn); exit(2); }
  int n = (int)fread(E->netbuf(), 1, 1 << 20, f); fclose(f);
  if (!E->netload(rule, n)) { fprintf(stderr, "bad net %s\n", fn); exit(2); }
  return 1;
}
// ---- the game
typedef struct { signed char sq[64]; int side, ply; u32 h1, h2; u32 hh1[1200], hh2[1200]; int hn; } G;
static void gStart(G *g) {
  memset(g, 0, sizeof *g);
  for (int i = 0; i < 64; i++) { int r = i >> 3, c = i & 7;
    if (r >= 8 - RR[rule][0] && c < RR[rule][1]) g->sq[i] = 1; else if (r < RR[rule][0] && c >= 8 - RR[rule][1]) g->sq[i] = 2; }
  for (int i = 0; i < 64; i++) if (g->sq[i]) { g->h1 ^= Z1[g->sq[i] - 1][i]; g->h2 ^= Z2[g->sq[i] - 1][i]; }
}
static void gPlay(G *g, int m) {
  g->hh1[g->hn] = g->h1; g->hh2[g->hn] = g->h2; g->hn++;
  int f = m % 64, t = m / 64, x = g->sq[f];
  g->sq[f] = 0; g->sq[t] = (signed char)x;
  g->h1 ^= Z1[x - 1][f] ^ Z1[x - 1][t]; g->h2 ^= Z2[x - 1][f] ^ Z2[x - 1][t];
  g->side ^= 1; g->ply++; g->h1 ^= ZS1; g->h2 ^= ZS2;
}
static void gLoad(Eng *E, const G *g) {
  memcpy(E->SQ, g->sq, 64);
  E->IO[8] = g->side; E->IO[9] = g->ply; E->IO[10] = (int)g->h1; E->IO[11] = (int)g->h2; E->IO[12] = 0; E->IO[13] = g->hn;
  for (int i = 0; i < g->hn; i++) { E->RH1[i] = g->hh1[i]; E->RH2[i] = g->hh2[i]; }
}
// over? → 1 and *res = the winner (1 White, 2 Black, 0 draw); terminal() of the core, then the threefold repetition (judge)
static int gOver(Eng *E, const G *g, int *res) {
  gLoad(E, g); int t = E->term();
  if (t != NOTOVER) { *res = t == 0 ? 0 : (t > 0) == (g->side == 0) ? 1 : 2; return 1; }
  int c = 0; for (int i = 0; i < g->hn; i++) if (g->hh1[i] == g->h1 && g->hh2[i] == g->h2) c++;
  if (c >= 2) { *res = 0; return 1; }
  return 0;
}
static u64 rs = 88172645463325252ull;
static u64 rnd(void) { rs ^= rs << 13; rs ^= rs >> 7; rs ^= rs << 17; return rs; }
typedef struct { int mode, nk, ms; const char *net; double dsum; int dn; Eng *E; } Pl;
static void plParse(Pl *p, const char *s, Eng *E) {
  char net[512] = "-"; memset(p, 0, sizeof *p); p->E = E;
  if (sscanf(s, "%d/%d/%d/%511s", &p->mode, &p->nk, &p->ms, net) < 3) { fprintf(stderr, "player? %s (mode/nodesK/ms/net)\n", s); exit(2); }
  p->net = strdup(net);
  engInit(E);
  if (strcmp(net, "-")) loadNet(E, net), E->netuse(1); else E->netuse(0);
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
typedef struct { u64 w, b; short v; unsigned short ply; signed char res; unsigned char rule, side, flags; } Rec;   // 24 bytes
static int datagen(int argc, char **argv) {
  if (argc < 7) { fprintf(stderr, "datagen <rule> <out> <games> <nodesK> <seed> [net]\n"); return 2; }
  rule = ruleOf(argv[2]); FILE *out = fopen(argv[3], "ab"); int games = atoi(argv[4]), nk = atoi(argv[5]);
  rs ^= (u64)atoll(argv[6]) * 0x9E3779B97F4A7C15ull; for (int i = 0; i < 8; i++) rnd();
  char spec[600]; snprintf(spec, sizeof spec, "2/%d/0/%s", nk, argc > 7 ? argv[7] : "-");
  Pl P; plParse(&P, spec, &EA);
  static Rec recs[1200]; long total = 0; double t0 = now();
  for (int gi = 0; gi < games; gi++) {
    G g; gStart(&g); EA.ttclear(); int n = 0, res = 0, rp = 2 + (int)(rnd() % 8);
    for (;;) {
      if (gOver(&EA, &g, &res)) break;
      int nm = EA.moves(), m, v = 0;
      if (g.ply < rp || rnd() % 100 < 2) m = EA.AOM[rnd() % nm];
      else {
        m = plMove(&P, &g, &v);
        if (n < 1200) { Rec *r = &recs[n++]; r->w = r->b = 0; for (int i = 0; i < 64; i++) { if (g.sq[i] == 1) r->w |= 1ull << i; else if (g.sq[i] == 2) r->b |= 1ull << i; }
          r->v = (short)(v > 30000 ? 30000 : v < -30000 ? -30000 : v); r->ply = (unsigned short)g.ply; r->rule = (unsigned char)rule; r->side = (unsigned char)g.side; r->flags = (v > WINT || v < -WINT) ? 1 : 0; }
      }
      if (m < 0) { res = 0; break; }
      gPlay(&g, m);
    }
    for (int i = 0; i < n; i++) recs[i].res = (signed char)(res == 0 ? 0 : (res == 1) == (recs[i].side == 0) ? 1 : -1);
    fwrite(recs, sizeof(Rec), n, out); total += n;
    if ((gi + 1) % 20 == 0) { fflush(out); fprintf(stderr, "%s games %d positions %ld  %.0f pos/s\n", RN[rule], gi + 1, total, total / ((now() - t0) / 1000)); }
  }
  fclose(out);
  return 0;
}
// ---- match
static double elo(double x) { return x <= 0 ? -999 : x >= 1 ? 999 : -400 * log10(1 / x - 1); }
static int match(int argc, char **argv) {
  if (argc < 7) { fprintf(stderr, "match <rule> <games> <seed> <A> <B> [random plies]\n"); return 2; }
  rule = ruleOf(argv[2]); int N = atoi(argv[3]); rs ^= (u64)atoll(argv[4]) * 0x9E3779B97F4A7C15ull; for (int i = 0; i < 8; i++) rnd();
  int pre = argc > 7 ? atoi(argv[7]) : 4;
  Pl PA, PB; plParse(&PA, argv[5], &EA); plParse(&PB, argv[6], &EB);
  int w = 0, l = 0, d = 0; u64 op[16];
  for (int gi = 0; gi < N; gi++) {
    if (gi % 2 == 0) for (int i = 0; i < pre && i < 16; i++) op[i] = rnd();
    int first = gi % 2;   // 0: A is White
    G g; gStart(&g); EA.ttclear(); EB.ttclear(); int res = 0;
    for (;;) {
      if (gOver(&EA, &g, &res)) break;
      int m;
      if (g.ply < pre) { int nm = EA.moves(); m = EA.AOM[op[g.ply] % nm]; }
      else { Pl *p = (g.side == 0) == (first == 0) ? &PA : &PB; m = plMove(p, &g, 0); }
      if (m < 0) { res = 0; break; }
      gPlay(&g, m);
    }
    int aP = first == 0 ? 1 : 2;
    if (res == 0) d++; else if (res == aP) w++; else l++;
    if ((gi + 1) % 20 == 0 || gi + 1 == N) {
      int n = w + l + d; double sc = (w + d / 2.0) / n;
      double se = sqrt(fmax((w * (1 - sc) * (1 - sc) + l * sc * sc + d * (0.5 - sc) * (0.5 - sc)) / n, 1e-9) / n);
      printf("%s %d games  +%d -%d =%d  %.3f  Elo %.0f (%.0f .. %.0f)  depth %.2f / %.2f\n", RN[rule], n, w, l, d, sc, elo(sc), elo(sc - 1.96 * se), elo(sc + 1.96 * se),
        PA.dsum / (PA.dn ? PA.dn : 1), PB.dsum / (PB.dn ? PB.dn : 1));
      fflush(stdout);
    }
  }
  return 0;
}
// ---- nncheck: games of the net (search v3, 20,000 positions a move) with every evaluation's accumulators checked
static int nncheck(int argc, char **argv) {
  if (argc < 4) { fprintf(stderr, "nncheck <rule> <net> [games]\n"); return 2; }
  rule = ruleOf(argv[2]); int N = argc > 4 ? atoi(argv[4]) : 4;
  char spec[600]; snprintf(spec, sizeof spec, "2/20/0/%s", argv[3]);
  Pl P; plParse(&P, spec, &EC); Eng hand = EA; engInit(&hand); hand.netuse(0);
  double sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0; int k = 0;
  for (int gi = 0; gi < N; gi++) {
    G g; gStart(&g); EC.ttclear(); int res = 0;
    for (;;) {
      if (gOver(&EC, &g, &res)) break;
      if (g.ply < 4) { int nm = EC.moves(); gPlay(&g, EC.AOM[rnd() % nm]); continue; }
      gLoad(&EC, &g); double x = EC.eval(2); gLoad(&hand, &g); double y = hand.eval(2);
      sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; k++;
      int m = plMove(&P, &g, 0); if (m < 0) break;
      gPlay(&g, m);
    }
  }
  long long c = C_nn_checked(), b = C_nn_bad();
  double r = (k * sxy - sx * sy) / sqrt((k * sxx - sx * sx) * (k * syy - sy * sy) + 1e-9);
  printf("%s nncheck: %lld evaluations checked, %lld with accumulators different from the whole board's%s\n", RN[rule], c, b, b ? "  ** NG **" : "  OK");
  printf("%s net vs hand evaluation on %d game positions: correlation %.3f, mean |net| %.0f, |hand| %.0f\n", RN[rule], k, r, sqrt(sxx / (k ? k : 1)), sqrt(syy / (k ? k : 1)));
  return b ? 1 : 0;
}
static int bench(int argc, char **argv) {
  rule = ruleOf(argv[2]); int N = argc > 4 ? atoi(argv[4]) : 6;
  Pl P; plParse(&P, argv[3], &EA); double nodes = 0, t = 0;
  G g; gStart(&g); int res;
  for (int i = 0; i < N && !gOver(&EA, &g, &res); i++) {
    double t0 = now(); int m = plMove(&P, &g, 0); t += now() - t0; nodes += EA.getn();
    gPlay(&g, m);
  }
  printf("%s %s: %.0f nodes, %.0f ms, %.0f nodes/s, depth %.1f\n", RN[rule], argv[3], nodes, t, nodes / t * 1000, P.dsum / (P.dn ? P.dn : 1));
  return 0;
}
int main(int argc, char **argv) {
  zinit();
  if (argc < 2) { fprintf(stderr, "ug datagen | nncheck | match | bench …\n"); return 2; }
  if (!strcmp(argv[1], "datagen")) return datagen(argc, argv);
  if (!strcmp(argv[1], "match")) return match(argc, argv);
  if (!strcmp(argv[1], "nncheck")) return nncheck(argc, argv);
  if (!strcmp(argv[1], "bench")) return bench(argc, argv);
  fprintf(stderr, "unknown command %s\n", argv[1]); return 2;
}
