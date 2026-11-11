// senet/engine.c — the expectiminimax of engine.js in C (WebAssembly), 2026-11-11.
// The same rules (Kendall: walls, guarded pairs, the House of Beauty and the water), the same evaluation net and race table
// (handed over by engine.js) and the same search (V / bestAfter / wpAfter): the same win chances as engine.js up to the
// last bits of e^x (tools/cmatch.js). engine.js keeps the rules for the page, the levels, the threads' split and the UI.
// Builds (tools/build.sh): engine_simd.wasm (-msimd128) and engine.wasm (no SIMD) — the same arithmetic in the same order.
typedef signed char i8; typedef unsigned char u8; typedef unsigned int u32;
#define EXPORT __attribute__((visibility("default")))
#ifdef NATIVE
#include <math.h>
#define EXPF exp
double now(void);
#else
__attribute__((import_module("env"), import_name("now"))) double now(void);
#define EXPF dexp
static double dexp(double x) {   // e^x in double (no libc): x = k ln2 + r, Taylor to r^13
  if (x > 709) return 1.0 / 0.0; if (x < -745) return 0;
  double kf = x * 1.4426950408889634; int k = (int)(kf + (kf >= 0 ? 0.5 : -0.5));
  double r = (x - k * 6.93147180369123816490e-01) - k * 1.90821492927058770002e-10;
  double p = 1.0 / 6227020800.0;
  p = p * r + 1.0 / 479001600.0; p = p * r + 1.0 / 39916800.0; p = p * r + 1.0 / 3628800.0; p = p * r + 1.0 / 362880.0;
  p = p * r + 1.0 / 40320.0; p = p * r + 1.0 / 5040.0; p = p * r + 1.0 / 720.0; p = p * r + 1.0 / 120.0; p = p * r + 1.0 / 24.0;
  p = p * r + 1.0 / 6.0; p = p * r + 0.5; p = p * r + 1.0; p = p * r + 1.0;
  union { double d; unsigned long long i; } u;
  if (k < -1000) { u.i = (unsigned long long)(k + 1000 + 1023) << 52; return p * u.d * 9.332636185032189e-302; }
  u.i = (unsigned long long)(k + 1023) << 52; return p * u.d;
}
#endif

#define GOAL 31
#define NSQ 30
static const double PROB[6] = { 0, 4.0 / 16, 6.0 / 16, 4.0 / 16, 1.0 / 16, 1.0 / 16 };
#define AGAIN(n) ((n) == 1 || (n) == 4 || (n) == 5)
static int EXIT_(int p) { return p == 26 ? 5 : p == 28 ? 3 : p == 29 ? 2 : p == 30 ? 1 : 0; }
#define SAFE(t) ((t) == 26 || (t) == 28 || (t) == 29 || (t) == 30)

typedef struct { i8 pos[2][8]; i8 turn, winner, np; } St;
typedef struct { int piece, from, to, n, capture, finish, water, dest; } Mv;
static void board(const St *s, i8 *b) { for (int i = 0; i < GOAL + 2; i++) b[i] = -1; for (int sd = 0; sd < 2; sd++) for (int k = 0; k < s->np; k++) { int p = s->pos[sd][k]; if (p >= 1 && p <= NSQ) b[p] = (i8)sd; } }
static int inWall(const i8 *b, int q, int opp) {
  if (b[q] != opp) return 0;
  int a = q, z = q; while (a - 1 >= 1 && b[a - 1] == opp) a--; while (z + 1 <= NSQ && b[z + 1] == opp) z++;
  return z - a + 1 >= 3;
}
static int guarded(const i8 *b, int q, int opp) { return b[q] == opp && ((q > 1 && b[q - 1] == opp) || (q < NSQ && b[q + 1] == opp)); }
static int waterDest(const i8 *b) { for (int q = 15; q >= 1; q--) if (b[q] < 0) return q; return -1; }
static int legal(const St *s, int n, const i8 *b, Mv *out) {
  if (s->winner >= 0 || !n) return 0;
  int me = s->turn, opp = 1 - me, cnt = 0; u32 seen = 0;
  for (int k = 0; k < s->np; k++) {
    int p = s->pos[me][k]; if (p >= GOAL || (seen >> p & 1)) continue; seen |= 1u << p;
    Mv m = { k, p, p + n, n, 0, 0, 0, p + n };
    if (p == 28 || p == 29 || p == 30) {
      if (EXIT_(p) == n) { m.to = GOAL; m.dest = GOAL; m.finish = 1; out[cnt++] = m; }
      else if (p + n <= 30 && b[p + n] < 0) out[cnt++] = m;
      continue;
    }
    if (p == 26) {
      if (n == 5) { m.to = GOAL; m.dest = GOAL; m.finish = 1; out[cnt++] = m; continue; }
      if (n == 1) { i8 bb[GOAL + 2]; for (int i = 0; i < GOAL + 2; i++) bb[i] = b[i]; bb[26] = -1; int d = waterDest(bb); m.water = 1; m.dest = d < 0 ? 26 : d; out[cnt++] = m; continue; }
      int t = 26 + n; if (b[t] >= 0) continue; out[cnt++] = m; continue;
    }
    int t = p + n; if (t > 26) continue;
    int blocked = 0; for (int q = p + 1; q < t; q++) if (inWall(b, q, opp)) { blocked = 1; break; }
    if (blocked) continue;
    if (b[t] == me) continue;
    if (b[t] == opp) { if (SAFE(t) || guarded(b, t, opp)) continue; m.capture = 1; }
    out[cnt++] = m;
  }
  return cnt;
}
// apply m (NULL = pass with throw n); returns 1 when the same side throws again
static int apply(const St *s, const Mv *m, int n, St *ns) {
  *ns = *s; int me = s->turn;
  if (m) {
    int k = -1; for (int i = 0; i < s->np; i++) if (ns->pos[me][i] == m->from) { k = i; break; }
    if (m->capture) { for (int j = 0; j < s->np; j++) if (ns->pos[1 - me][j] == m->to) { ns->pos[1 - me][j] = (i8)m->from; break; } }
    ns->pos[me][k] = (i8)(m->water ? m->dest : m->to);
    int all = 1; for (int i = 0; i < s->np; i++) if (ns->pos[me][i] < GOAL) { all = 0; break; }
    if (all) { ns->winner = (i8)me; return 0; }
  }
  int again = AGAIN(n);
  if (!again) ns->turn = (i8)(1 - me);
  return again;
}

// ---- evaluation (engine.js netLogit / staticEval): the race table T and the net come from engine.js
static double T[GOAL + 1];
static float NW[48 * 64 + 48 + 48]; static double NB2 = 0; static int NH = 0, NI = 64, netOk = 0;
static double netLogit(const St *s) {
  double x[64]; for (int i = 0; i < 64; i++) x[i] = 0;
  int me = s->turn, op = 1 - me, n = s->np, offM = 0, offO = 0; double rm = 0, ro = 0;
  for (int k = 0; k < n; k++) { int p = s->pos[me][k]; if (p >= GOAL) offM++; else x[p - 1] = 1; rm += T[p < GOAL ? p : GOAL]; }
  for (int k = 0; k < n; k++) { int p = s->pos[op][k]; if (p >= GOAL) offO++; else x[30 + p - 1] = 1; ro += T[p < GOAL ? p : GOAL]; }
  x[60] = (double)offM / n; x[61] = (double)offO / n; x[62] = (ro - rm) / 20; x[63] = (rm + ro) / 200;
  const float *w1 = NW, *b1 = NW + NH * NI, *w2 = b1 + NH;
  double o = NB2;
  for (int j = 0; j < NH; j++) { double a = b1[j]; const float *row = w1 + j * NI; for (int i = 0; i < NI; i++) if (x[i] != 0) a += (double)row[i] * x[i]; o += (double)w2[j] * (a > 0 ? a : .01 * a); }
  return o;
}
static double staticEval(const St *s) { if (s->winner >= 0) return s->winner == s->turn ? 1 : 0; return 1 / (1 + EXPF(-netLogit(s))); }

// ---- the search (engine.js V / bestAfter / wpAfter); past the deadline V returns the static value (as engine.js)
static double deadline = 1e300; static u32 nodes = 0;
static double bestAfter(const St *s, int n, int d, const i8 *b);
static double V(const St *s, int d) {
  if (s->winner >= 0) return s->winner == s->turn ? 1 : 0;
  if (d <= 0 || ((nodes & 255) == 0 && now() > deadline)) return staticEval(s);
  double v = 0; i8 b[GOAL + 2]; board(s, b);
  for (int n = 1; n <= 5; n++) v += PROB[n] * bestAfter(s, n, d, b);
  return v;
}
static double wpAfter(const St *s, const Mv *m, int d) {
  St ns; apply(s, m, m->n, &ns);
  if (ns.winner >= 0) return ns.winner == s->turn ? 1 : 0;
  double v = V(&ns, d - 1);
  return ns.turn == s->turn ? v : 1 - v;
}
static double bestAfter(const St *s, int n, int d, const i8 *b) {
  Mv ms[8]; int c = legal(s, n, b, ms);
  if (!c) { St ns; int again = apply(s, 0, n, &ns); return again ? V(&ns, d - 1) : 1 - V(&ns, d - 1); }
  double best = -1;
  for (int i = 0; i < c; i++) { nodes++; double w = wpAfter(s, &ms[i], d); if (w > best) best = w; }
  return best;
}

// ---- the page's interface
static St ST;
EXPORT i8 *sn_state(void) { return &ST.pos[0][0]; }   // pos[2][8], turn, winner, pieces
EXPORT double *sn_T(void) { return T; }
EXPORT float *sn_netw(void) { return NW; }             // w1 (H x NI, by hidden unit), b1 (H), w2 (H)
EXPORT int sn_net(int h, int ni, double b2) { if (h > 48 || ni != 64) return (netOk = 0); NH = h; NI = ni; NB2 = b2; return (netOk = 1); }
EXPORT double sn_value(int d, double t) { deadline = t > 0 ? t : 1e300; return V(&ST, d); }
EXPORT double sn_bestafter(int n, int d, double t) { deadline = t > 0 ? t : 1e300; i8 b[GOAL + 2]; board(&ST, b); return bestAfter(&ST, n, d, b); }
EXPORT double sn_static(void) { return staticEval(&ST); }
