/* Ludus latrunculorum — the native tool of the net (NNUE) training: core.c (the site's engine, the same rules and search) built
   for the computer, with
     ltn datagen OUT.bin GAMES NODESK SEED RULE [NET]   self-play data: our own engine is the teacher (the hand-made evaluation,
                                                     or NET = the net of the round before). Each game opens with random placements
                                                     (quintana: random moves), then both sides search NODESK thousand positions a
                                                     move; every position is written with the search's value (side to move) and
                                                     at the end the game's result. 48 bytes a position (rec.h).
     ltn nncheck NET RULE [GAMES]                    the net: the accumulators kept move by move (play) against a refresh after
                                                     every move of random games (差分更新の一致), and the net's values
     ltn nmatch NET RULE NODESK GAMES [MS]          the net against the hand-made evaluation: pairs of games from the same random
                                                     opening with the colours swapped, NODESK thousand positions a move (MS > 0:
                                                     MS milliseconds a move instead). Prints the score and the Elo.
     ltn bench RULE                                  positions a second
   Build: cc -O3 -DNATIVE -o ltn ltn.c -lm   (tools/nnue/run.sh does it) */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>
double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec * 1000.0 + t.tv_nsec / 1e6; }
#include "../../core.c"
#include "rec.h"

/* ---- the same keys, weights and reductions as engine.js (its xorshift, TUNED, LMR_K) */
static u32 zseed = 0x1f2e3d4c;
static u32 zr(void) { zseed ^= zseed << 13; zseed ^= zseed >> 17; zseed ^= zseed << 5; return zseed; }
static const double TUNED[3][30] = {
  { 100, 16.5, -11.9, -1.2, -3.3, 0.9, -3.4, 87.9, -7.5, 1.9, -1.6, 5.4, 46.9, 24.2, 0, 100, 16.5, -11.9, -1.2, -3.3, 0.9, -3.4, 87.9, -7.5, 1.9, -1.6, 5.4, 46.9, 24.2, 0 },
  { 100, 22, -10.6, -1.9, -9, 4, -18.6, 99, -8.3, 4.4, 0, 3.3, 100.9, 0, -4, 100, 22, -30.4, -5.7, -14.7, 3.8, -8.3, 87.1, -18.2, 7.1, 0, 1.8, 66.4, 0, 1.2 },
  { 100, 22, -14.7, -0.1, -0.5, 0.7, -14, 100, -17.8, -1.4, 0, 2.4, 60.6, 0, 0, 100, 22, -14.7, -0.1, -0.5, 0.7, -14, 100, -17.8, -1.4, 0, 2.4, 60.6, 0, 0 } };
static const char *RNAME[3] = { "seneca", "piso", "quintana" };
static int RULE = 0, PLACE = 20;
static void initKeys(void) {
  for (int k = 0; k < 8; k++) for (int i = 0; i < 64; i++) { Z1(k, i) = zr(); Z2(k, i) = zr(); }
  ZS1 = zr(); ZS2 = zr();
  for (int k = 0; k < 2; k++) { for (int i = 0; i < 32; i++) { ZH1(k, i) = zr(); ZH2(k, i) = zr(); } for (int i = 0; i < 4097; i++) { ZL1(k, i) = zr(); ZL2(k, i) = zr(); } }
  for (int d = 0; d < 64; d++) for (int i = 0; i < LMR_I; i++) { int v = d && i ? (int)floor(0.45 * log(d) * log(i)) : 1; LMRT[d * LMR_I + i] = (u8)(v < 1 ? 1 : v); }
}
static int ruleOf(const char *s) { for (int k = 0; k < 3; k++) if (!strcmp(s, RNAME[k])) return k; fprintf(stderr, "rule: seneca | piso | quintana\n"); exit(1); }
static void useRule(int k) {
  RULE = k;
  if (k == 0) setup(0, 1, 1, 1, 0, 0, 0, 60); else if (k == 1) setup(0, 0, 0, 1, 0, 0, 0, 60); else setup(1, 0, 0, 0, 1, 1, 0, 60);
  for (int i = 0; i < 30; i++) WT[i] = TUNED[k][i];
  PLACE = k == 2 ? 0 : 20;
}
static void startPos(P *p) {
  memset(p, 0, sizeof *p);
  p->last[0] = p->last[1] = -1;
  if (PLACE) { p->hand[0] = p->hand[1] = PLACE; }
  else for (int c = 0; c < 8; c++) { p->sq[c] = p->sq[8 + c] = 2; p->sq[48 + c] = p->sq[56 + c] = 1; }
  rehash(p); refresh(p);
}
/* ---- the net: kept loaded, switched on / off per player (NH) */
static int netH = 0;
static int loadNet(const char *path) {
  FILE *f = fopen(path, "rb"); if (!f) { perror(path); return 0; }
  int n = (int)fread(NETRAW, 1, NETRAW_MAX, f); fclose(f);
  if (!net_load(n)) { fprintf(stderr, "%s: not a net (LTN1, %d inputs)\n", path, NIN); return 0; }
  netH = NH; return 1;
}
/* a player: its evaluation (net or not), its own history and killers */
typedef struct { int net, sx; int hist[2 * 4096]; int kil[MAXPLY][2]; } Player;
static void usePlayer(Player *pl) { NH = pl->net ? netH : 0; SX = pl->sx; memcpy(HIST, pl->hist, sizeof HIST); memcpy(killers, pl->kil, sizeof killers); }
static void savePlayer(Player *pl) { memcpy(pl->hist, HIST, sizeof HIST); memcpy(pl->kil, killers, sizeof killers); }
/* the search of a move: as engine.js think → bestMove (nodes thousand positions or ms) */
static int think(Player *pl, P *p, int nk, double ms, int *val) {
  usePlayer(pl);
  storePos(p);
  ttclear(); setn(0, nk > 0 ? nk * 1000.0 : 1e300, 0); kclear(); tEndN = ms > 0 ? now() + ms : now() + 600000;
  ab_best(60);
  savePlayer(pl);
  if (val) *val = IO[1];
  return IO[0];
}
static unsigned long long rs = 88172645463325252ULL;
static unsigned long long xr(void) { rs ^= rs << 13; rs ^= rs >> 7; rs ^= rs << 17; return rs; }
static int randomOpening(P *p, int plies) {
  for (int i = 0; i < plies; i++) {
    if (judge(p, -1)) return 0;
    int L[MAXMV], n = genMoves(p, L); if (!n) return 0;
    P q; play(&q, p, L[xr() % n]); *p = q;
  }
  return !judge(p, -1);
}
static int openingPlies(void) { return PLACE ? 2 + (int)(xr() % 9) : 2 + (int)(xr() % 7); }
/* is the position quiet: no removal due, no move that encloses (as the quiet search's moves) */
static int isQuiet(P *p) {
  if (placing(p)) return 1;
  if (rDelay && removable(p, 0)) return 0;
  int L[MAXMV], n = genMoves(p, L);
  for (int i = 0; i < n; i++) {
    int m = L[i], f = MFROM(m), t = MTO(m); if (f == t) continue;
    int kf = p->sq[f], kt = p->sq[t]; p->sq[f] = 0; p->sq[t] = (i8)kf; int ne = enclosed(p, t, 0, 0); p->sq[t] = (i8)kt; p->sq[f] = (i8)kf;
    if (ne) return 0;
  }
  return 1;
}
static void toRec(const P *p, Rec *r) {
  memset(r, 0, sizeof *r);
  for (int i = 0; i < 64; i++) { int x = p->sq[i], c = !x ? 0 : p->inc[i] ? x + 2 : x; r->b[i >> 1] |= (u8)(c << ((i & 1) * 4)); }
  r->hand[0] = (u8)p->hand[0]; r->hand[1] = (u8)p->hand[1]; r->cap[0] = (u8)(p->cap[0] > 255 ? 255 : p->cap[0]); r->cap[1] = (u8)(p->cap[1] > 255 ? 255 : p->cap[1]);
  r->quiet = (u8)p->quiet; r->side = (u8)p->side; r->rule = (u8)RULE; r->ply = (u8)(p->ply > 255 ? 255 : p->ply);
}
/* the result of a finished game for Black: 1 win, 0 draw, -1 loss */
static int resultOf(const P *p) { int j = judge(p, -1), w = j & 3; return !j ? 0 : w == 1 ? 1 : w == 2 ? -1 : 0; }

static int cmdDatagen(int argc, char **argv) {
  if (argc < 7) { fprintf(stderr, "ltn datagen OUT GAMES NODESK SEED RULE [NET]\n"); return 1; }
  const char *out = argv[2]; int games = atoi(argv[3]), nk = atoi(argv[4]); rs ^= (unsigned long long)atoll(argv[5]) * 0x9E3779B97F4A7C15ULL; xr(); xr();
  useRule(ruleOf(argv[6]));
  Player T; memset(&T, 0, sizeof T);
  if (argc > 7 && argv[7][0]) { if (!loadNet(argv[7])) return 1; T.net = 1; }
  FILE *f = fopen(out, "ab"); if (!f) { perror(out); return 1; }
  static Rec buf[2048]; long total = 0; double t0 = now();
  for (int g = 0; g < games; g++) {
    P p; startPos(&p);
    if (!randomOpening(&p, openingPlies())) { g--; continue; }
    int n = 0;
    for (int ply = 0; ply < 500 && !judge(&p, -1); ply++) {
      int v = 0, m = think(&T, &p, nk, 0, &v);
      if (m < 0) break;
      if (n < 2048 && v > -WINT && v < WINT) { toRec(&p, &buf[n]); { int sv = NH; NH = 0; int h = evalHand(&p); NH = sv; buf[n].hev = (i16)(h > 32000 ? 32000 : h < -32000 ? -32000 : h); } buf[n].score = (i16)(v > 32000 ? 32000 : v < -32000 ? -32000 : v); buf[n].flags = (u8)((isQuiet(&p) ? 0 : REC_NOISY) | (placing(&p) ? REC_PLACE : 0)); n++; }
      P q; play(&q, &p, m); p = q;
    }
    int r = resultOf(&p);
    for (int i = 0; i < n; i++) buf[i].result = (i8)(buf[i].side == 0 ? r : -r);
    fwrite(buf, sizeof(Rec), (size_t)n, f); fflush(f);
    total += n;
  }
  fclose(f);
  fprintf(stderr, "%s: %d games, %ld positions, %.0f pos/s\n", argv[6], games, total, total / ((now() - t0) / 1000));
  return 0;
}
static int cmdNncheck(int argc, char **argv) {
  if (argc < 4) { fprintf(stderr, "ltn nncheck NET RULE [GAMES]\n"); return 1; }
  useRule(ruleOf(argv[3])); if (!loadNet(argv[2])) return 1;
  int games = argc > 4 ? atoi(argv[4]) : 200; long checks = 0, bad = 0; double sum = 0, sum2 = 0, sh = 0, shh = 0, sxy = 0; long nv = 0;
  for (int g = 0; g < games; g++) {
    P p; startPos(&p);
    for (int ply = 0; ply < 400 && !judge(&p, -1); ply++) {
      int L[MAXMV], n = genMoves(&p, L); if (!n) break;
      P q; play(&q, &p, L[xr() % n]); p = q;
      P r = p; refresh(&r); checks++;
      for (int v = 0; v < 2; v++) for (int i = 0; i < NH; i++) if (r.acc[v][i] != p.acc[v][i]) { bad++; v = 2; break; }
      int e = netEval(&p); NH = 0; int h = evalHand(&p); NH = netH;
      sum += e; sum2 += (double)e * e; sh += h; shh += (double)h * h; sxy += (double)e * h; nv++;
    }
  }
  double me = sum / nv, sd = sqrt(sum2 / nv - me * me), mh = sh / nv, sdh = sqrt(shh / nv - mh * mh), cor = (sxy / nv - me * mh) / (sd * sdh + 1e-9);
  printf("nncheck %s %s: %ld positions, accumulator differences %ld | net value mean %.1f sd %.1f | hand-made sd %.1f | correlation %.3f\n", argv[3], argv[2], checks, bad, me, sd, sdh, cor);
  return bad ? 1 : 0;
}
static Player A, B;
static int playMatch(const char *label, const char *what, int nk, int games, double ms);
static int cmdNmatch(int argc, char **argv) {
  if (argc < 6) { fprintf(stderr, "ltn nmatch NET RULE NODESK GAMES [MS]\n"); return 1; }
  useRule(ruleOf(argv[3])); if (!loadNet(argv[2])) return 1;
  int nk = atoi(argv[4]), games = atoi(argv[5]); double ms = argc > 6 ? atof(argv[6]) : 0;
  if (ms > 0) nk = 0;
  if (getenv("NETMV")) NETMV = atoi(getenv("NETMV"));
  memset(&A, 0, sizeof A); memset(&B, 0, sizeof B); A.net = 1;
  char lab[300]; snprintf(lab, sizeof lab, "nmatch %s %s", argv[3], argv[2]);
  return playMatch(lab, "net", nk, games, ms);
}
/* ltn smatch RULE NODESK GAMES SXA SXB [MS] [MARGIN]: two settings of the search experiments (core.c SX) against each other */
static int cmdSmatch(int argc, char **argv) {
  if (argc < 7) { fprintf(stderr, "ltn smatch RULE NODESK GAMES SXA SXB [MS] [MARGIN] [NET]\n"); return 1; }
  useRule(ruleOf(argv[2]));
  int nk = atoi(argv[3]), games = atoi(argv[4]); double ms = argc > 7 ? atof(argv[7]) : 0; if (ms > 0) nk = 0;
  if (argc > 8) SXA = atoi(argv[8]);
  memset(&A, 0, sizeof A); memset(&B, 0, sizeof B); A.sx = atoi(argv[5]); B.sx = atoi(argv[6]);
  if (argc > 9) { if (!loadNet(argv[9])) return 1; A.net = B.net = 1; }
  char lab[300]; snprintf(lab, sizeof lab, "smatch %s sx %d vs %d", argv[2], A.sx, B.sx);
  return playMatch(lab, "A", nk, games, ms);
}
static int playMatch(const char *label, const char *what, int nk, int games, double ms) {
  int w = 0, d = 0, l = 0; double t0 = now();
  for (int g = 0; g < games; g += 2) {
    P o; startPos(&o); if (!randomOpening(&o, openingPlies())) { g -= 2; continue; }
    for (int s = 0; s < 2; s++) {
      P p = o; Player *pl[2] = { s ? &B : &A, s ? &A : &B };   /* (s 0: the net plays the side to move after the opening) */
      int first = p.side;
      for (int ply = 0; ply < 500 && !judge(&p, -1); ply++) {
        int who = p.side == first ? 0 : 1, m = think(pl[who], &p, nk, ms, 0);
        if (m < 0) break;
        P q; play(&q, &p, m); p = q;
      }
      int r = resultOf(&p);   /* for Black */
      int netSide = s ? first ^ 1 : first, rn = netSide == 0 ? r : -r;
      if (rn > 0) w++; else if (rn < 0) l++; else d++;
    }
    int n = w + d + l; double sc = (w + 0.5 * d) / n;
    fprintf(stderr, "\r  %d games: %s +%d =%d -%d  %.1f%%   ", n, what, w, d, l, 100 * sc);
  }
  int n = w + d + l; double sc = (w + 0.5 * d) / n, e = sc <= 0 ? -999 : sc >= 1 ? 999 : -400 * log10(1 / sc - 1);
  double sd = sqrt((w * pow(1 - sc, 2) + l * pow(sc, 2) + d * pow(0.5 - sc, 2)) / n / n), elo95 = sd * 1.96 * 400 / log(10) / (sc * (1 - sc) + 1e-9);
  fprintf(stderr, "\n");
  printf("%s (%s): %s +%d =%d -%d of %d, score %.1f%%, Elo %+.0f ±%.0f, %.0f s\n", label, ms > 0 ? "ms a move" : "positions a move", what, w, d, l, n, 100 * sc, e, elo95, (now() - t0) / 1000);
  return 0;
}
/* ltn neval DATA NET RULE [N]: the net's and the hand-made values of recorded positions against the teacher's values */
static void fromRec(const Rec *r, P *p) {
  memset(p, 0, sizeof *p);
  for (int i = 0; i < 64; i++) { int c = (r->b[i >> 1] >> ((i & 1) * 4)) & 15; if (c) { p->sq[i] = (i8)(c > 2 ? c - 2 : c); p->inc[i] = 0; } }
  for (int i = 0; i < 64; i++) { int c = (r->b[i >> 1] >> ((i & 1) * 4)) & 15; if (c > 2) { int a = 1; if ((i & 7) > 0 && (i & 7) < 7 && p->sq[i - 1] == 3 - p->sq[i] && p->sq[i + 1] == 3 - p->sq[i]) a = 1; else if (i >= 8 && i < 56 && p->sq[i - 8] == 3 - p->sq[i] && p->sq[i + 8] == 3 - p->sq[i]) a = 2; else a = 3; p->inc[i] = (i8)a; } }
  p->hand[0] = r->hand[0]; p->hand[1] = r->hand[1]; p->cap[0] = r->cap[0]; p->cap[1] = r->cap[1]; p->quiet = r->quiet; p->side = r->side; p->last[0] = p->last[1] = -1;
  rehash(p); refresh(p);
}
static int cmdNeval(int argc, char **argv) {
  if (argc < 5) { fprintf(stderr, "ltn neval DATA NET RULE [N]\n"); return 1; }
  useRule(ruleOf(argv[4])); if (!loadNet(argv[3])) return 1;
  FILE *f = fopen(argv[2], "rb"); if (!f) { perror(argv[2]); return 1; }
  long nmax = argc > 5 ? atol(argv[5]) : 20000; Rec r; long n = 0; double sx = 0, sy = 0, sz = 0, sxx = 0, syy = 0, szz = 0, sxy = 0, szy = 0;
  while (n < nmax && fread(&r, sizeof r, 1, f) == 1) {
    if (r.flags & REC_NOISY) continue;
    P p; fromRec(&r, &p);
    NH = netH; double x = evaluate(&p); NH = 0; double z = evalHand(&p); NH = netH; double y = r.score;
    sx += x; sy += y; sz += z; sxx += x * x; syy += y * y; szz += z * z; sxy += x * y; szy += z * y; n++;
    if (n <= 8) printf("  teacher %6.0f  net %6.0f  hand %6.0f  side %d hand %d/%d cap %d/%d q %d\n", y, x, z, r.side, r.hand[0], r.hand[1], r.cap[0], r.cap[1], r.quiet);
  }
  double cx = (sxy / n - sx / n * sy / n) / sqrt((sxx / n - sx * sx / n / n) * (syy / n - sy * sy / n / n)), cz = (szy / n - sz / n * sy / n) / sqrt((szz / n - sz * sz / n / n) * (syy / n - sy * sy / n / n));
  printf("neval: %ld quiet positions | correlation with the teacher: net %.3f, hand-made %.3f | sd teacher %.0f net %.0f hand %.0f\n", n, cx, cz, sqrt(syy / n - sy * sy / n / n), sqrt(sxx / n - sx * sx / n / n), sqrt(szz / n - sz * sz / n / n));
  return 0;
}
static int cmdBench(int argc, char **argv) {
  useRule(ruleOf(argc > 2 ? argv[2] : "seneca"));
  if (argc > 3 && !loadNet(argv[3])) return 1;
  Player A; memset(&A, 0, sizeof A); A.net = argc > 3;
  double t0 = now(), nn = 0;
  for (int g = 0; g < 4; g++) {
    P p; startPos(&p); randomOpening(&p, PLACE ? 40 : 6);
    for (int k = 0; k < 6 && !judge(&p, -1); k++) { int m = think(&A, &p, 200, 0, 0); nn += nodes; P q; play(&q, &p, m); p = q; }
  }
  printf("bench %s%s: %.0f positions a second\n", RNAME[RULE], A.net ? " (net)" : "", nn / ((now() - t0) / 1000));
  return 0;
}
int main(int argc, char **argv) {
  initBoard(); initKeys(); useRule(0);
  if (argc < 2) { fprintf(stderr, "ltn datagen | nncheck | nmatch | bench\n"); return 1; }
  if (!strcmp(argv[1], "datagen")) return cmdDatagen(argc, argv);
  if (!strcmp(argv[1], "nncheck")) return cmdNncheck(argc, argv);
  if (!strcmp(argv[1], "nmatch")) return cmdNmatch(argc, argv);
  if (!strcmp(argv[1], "bench")) return cmdBench(argc, argv);
  if (!strcmp(argv[1], "smatch")) return cmdSmatch(argc, argv);
  if (!strcmp(argv[1], "neval")) return cmdNeval(argc, argv);
  fprintf(stderr, "unknown command %s\n", argv[1]); return 1;
}
