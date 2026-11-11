// ur/engine.c — the expectiminimax of engine.js in C (WebAssembly), 2026-11-11.
// The same rules (finkel / blitz / masters), the same evaluation nets (the int16 nets embedded in engine.js, handed over by
// engine.js) and the same search (valueToRoll / bestAfterRoll / wpAfter): the same win chances as engine.js up to the last
// bits of e^x (tools/cmatch.js). engine.js keeps the rules for the page, the levels, the threads' split (splitEval) and
// the UI; with the C engine loaded valueToRoll / bestAfterRoll run here.
// Builds (tools/build.sh): engine_simd.wasm (-msimd128) and engine.wasm (no SIMD) — the same arithmetic in the same order.
typedef signed char i8; typedef unsigned char u8; typedef short i16; typedef unsigned int u32;
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

// ---- rules (engine.js mkRule): relative paths, cells r*8+c, rosettes, the squares the opponent can reach
typedef struct { int pieces, pathLen, goal, safeRos, rosExtra, capExtra; double pr[5]; int cell[2][18]; u8 ros[18]; } Rule;
static Rule RL[3];
static const char BELL_L[14] = { 'o','o','o','o', 'm','m','m','m','m','m','m','m', 'o','o' };
static const int BELL_C[14] = { 3,2,1,0, 0,1,2,3,4,5,6,7, 7,6 };
static const char MAS_L[16] = { 'o','o','o','o', 'm','m','m','m','m','m','m', 'x','x','m','o','o' };
static const int MAS_C[16] = { 3,2,1,0, 0,1,2,3,4,5,6, 6,7,7,7,6 };
static void mkRule(Rule *r, int pieces, int dice, int bell, int safeRos, int rosExtra, int capExtra) {
  const char *L = bell ? BELL_L : MAS_L; const int *C = bell ? BELL_C : MAS_C; int n = bell ? 14 : 16;
  r->pieces = pieces; r->pathLen = n; r->goal = n + 1; r->safeRos = safeRos; r->rosExtra = rosExtra; r->capExtra = capExtra;
  if (dice == 3) { r->pr[0] = 0; r->pr[1] = 3.0 / 8; r->pr[2] = 3.0 / 8; r->pr[3] = 1.0 / 8; r->pr[4] = 1.0 / 8; }
  else { r->pr[0] = 1.0 / 16; r->pr[1] = 4.0 / 16; r->pr[2] = 6.0 / 16; r->pr[3] = 4.0 / 16; r->pr[4] = 1.0 / 16; }
  for (int i = 0; i < 18; i++) r->ros[i] = 0;
  for (int k = 0; k < n; k++) { int c = C[k]; char l = L[k]; if ((l != 'm' && (c == 0 || c == 6)) || (l == 'm' && c == 3)) r->ros[k + 1] = 1; }
  for (int side = 0; side < 2; side++) {
    int own = side == 0 ? 2 : 0, opp = 2 - own;
    r->cell[side][0] = -1;
    for (int k = 0; k < n; k++) { int rr = L[k] == 'o' ? own : L[k] == 'm' ? 1 : opp; r->cell[side][k + 1] = rr * 8 + C[k]; }
    r->cell[side][n + 1] = -1;
  }
}
static int inited = 0;
static void initRules(void) { mkRule(&RL[0], 7, 4, 1, 1, 1, 0); mkRule(&RL[1], 5, 4, 0, 0, 1, 1); mkRule(&RL[2], 7, 3, 0, 0, 1, 0); inited = 1; }

typedef struct { i8 pos[2][8]; i8 turn, winner; } St;
typedef struct { int piece, from, to, capture, rosette; } Mv;
static const Rule *rl = &RL[0];
static int legal(const St *s, int n, Mv *out) {
  if (s->winner >= 0 || !n) return 0;
  int me = s->turn, cnt = 0; const int *C = rl->cell[me];
  i8 o[24]; for (int i = 0; i < 24; i++) o[i] = -1;
  for (int side = 0; side < 2; side++) for (int k = 0; k < rl->pieces; k++) { int p = s->pos[side][k]; if (p >= 1 && p <= rl->pathLen) o[rl->cell[side][p]] = (i8)side; }
  u32 seen = 0;
  for (int k = 0; k < rl->pieces; k++) {
    int from = s->pos[me][k]; if (from >= rl->goal || (seen >> from & 1)) continue;
    seen |= 1u << from;
    int to = from + n; if (to > rl->goal) continue;
    int cap = 0;
    if (to < rl->goal) {
      int who = o[C[to]];
      if (who == me) continue;
      if (who == 1 - me) { if (rl->safeRos && rl->ros[to]) continue; cap = 1; }
    }
    Mv m = { k, from, to, cap, to < rl->goal && rl->ros[to] };
    int j = cnt++; while (j > 0 && out[j - 1].from < from) { out[j] = out[j - 1]; j--; } out[j] = m;   // (by from, descending)
  }
  return cnt;
}
// apply m (NULL = pass); returns 1 when the same side moves again
static int apply(const St *s, const Mv *m, St *ns) {
  *ns = *s;
  if (!m || s->winner >= 0) { if (s->winner < 0) ns->turn = 1 - s->turn; return 0; }
  int me = s->turn, op = 1 - me;
  ns->pos[me][m->piece] = (i8)m->to;
  if (m->capture) { int cell = rl->cell[me][m->to]; for (int k = 0; k < rl->pieces; k++) { int q = ns->pos[op][k]; if (q >= 1 && q <= rl->pathLen && rl->cell[op][q] == cell) ns->pos[op][k] = 0; } }
  int all = 1; for (int k = 0; k < rl->pieces; k++) if (ns->pos[me][k] != rl->goal) { all = 0; break; }
  if (all) { ns->winner = (i8)me; return 0; }
  int again = (m->rosette && rl->rosExtra) || (m->capture && rl->capExtra);
  if (!again) ns->turn = (i8)op;
  return again;
}

// ---- the nets (engine.js getNet / netEval): W = int16 x scale as float32; layer 1 summed in float32, layer 2 in double
typedef struct { int nin, h1, h2, ok; float *W1, *b1, *W2, *b2, *W3; float b3; } Net;
static Net NETS[3];
static float NETW[3][13000];
static i16 NETRAW[13000];
static Net *net = &NETS[0];
static double netEval(const St *s) {
  int me = s->turn, L = rl->pathLen, N = rl->pieces, k = 0, idx[40];
  int base[2] = { 0, L }, cnt[2] = { 2 * L, 2 * L + 2 * (N + 1) };
  for (int t = 0; t < 2; t++) {
    const i8 *P = s->pos[t == 0 ? me : 1 - me]; int un = 0, fin = 0;
    for (int j = 0; j < N; j++) { int p = P[j]; if (p == 0) un++; else if (p == rl->goal) fin++; else idx[k++] = base[t] + p - 1; }
    idx[k++] = cnt[t] + un; idx[k++] = cnt[t] + N + 1 + fin;
  }
  int h1 = net->h1, h2 = net->h2; float a1[128]; double v2[32];
  for (int j = 0; j < h1; j++) a1[j] = net->b1[j];
  for (int q = 0; q < k; q++) { const float *row = net->W1 + idx[q] * h1; for (int j = 0; j < h1; j++) a1[j] = a1[j] + row[j]; }
  for (int j = 0; j < h1; j++) if (a1[j] < 0) a1[j] = 0;
  // (the sums of engine.js — for each j: b2[j] + a1[0] W2[0][j] + a1[1] W2[1][j] + … — row by row: the same order for each j)
  for (int j = 0; j < h2; j++) v2[j] = net->b2[j];
  for (int i = 0; i < h1; i++) { double a = a1[i]; const float *row = net->W2 + i * h2; for (int j = 0; j < h2; j++) v2[j] = v2[j] + a * (double)row[j]; }
  double out = net->b3;
  for (int j = 0; j < h2; j++) if (v2[j] > 0) out += v2[j] * (double)net->W3[j];
  return 1 / (1 + EXPF(-out));
}
static double staticEval(const St *s) { if (s->winner >= 0) return s->winner == s->turn ? 1 : 0; return netEval(s); }

// ---- the search (engine.js valueToRoll / bestAfterRoll / wpAfter); the deadline aborts (engine.js throws ABORT)
static double deadline = 1e300; static u32 tick = 0; static int aborted = 0;
static double bestAfterRoll(const St *s, int n, int d);
static double valueToRoll(const St *s, int d) {
  if (s->winner >= 0) return s->winner == s->turn ? 1 : 0;
  if (d <= 0) return staticEval(s);
  if (((++tick) & 7) == 0 && now() > deadline) { aborted = 1; return 0; }
  double v = 0;
  for (int n = 0; n <= 4; n++) { if (rl->pr[n] > 0) { v += rl->pr[n] * bestAfterRoll(s, n, d); if (aborted) return 0; } }
  return v;
}
static double wpAfter(const St *s, const Mv *m, int d) {
  St ns; apply(s, m, &ns);
  if (ns.winner >= 0) return ns.winner == s->turn ? 1 : 0;
  double v = valueToRoll(&ns, d);
  return ns.turn == s->turn ? v : 1 - v;
}
static double bestAfterRoll(const St *s, int n, int d) {
  Mv ms[8]; int c = legal(s, n, ms);
  if (!c) { St ns; apply(s, 0, &ns); return 1 - valueToRoll(&ns, d - 1); }
  double best = -1;
  for (int i = 0; i < c; i++) { double v = wpAfter(s, &ms[i], d - 1); if (aborted) return 0; if (v > best) best = v; }
  return best;
}

// ---- the page's interface: the state in ST (pos[2][8] (pieces used), turn, winner), the rule, the nets
static St ST;
EXPORT i8 *ur_state(void) { return &ST.pos[0][0]; }
EXPORT i16 *ur_netraw(void) { return NETRAW; }
// net of rule r (0 finkel, 1 blitz, 2 masters): the int16 weights in ur_netraw(), shape and scale; returns 1 if it fits
EXPORT int ur_setnet(int r, int nin, int h1, int h2, double scale) {
  if (!inited) initRules();
  int n = nin * h1 + h1 + h1 * h2 + h2 + h2 + 1;
  if (r < 0 || r > 2 || h1 > 128 || h2 > 32 || n > 13000) return 0;
  float *W = NETW[r]; for (int i = 0; i < n; i++) W[i] = (float)(NETRAW[i] * scale);
  Net *t = &NETS[r]; int o = 0;
  t->nin = nin; t->h1 = h1; t->h2 = h2;
  t->W1 = W + o; o += nin * h1; t->b1 = W + o; o += h1; t->W2 = W + o; o += h1 * h2; t->b2 = W + o; o += h2; t->W3 = W + o; o += h2; t->b3 = W[o];
  t->ok = 1; return 1;
}
EXPORT int ur_rule(int r) { if (!inited) initRules(); if (r < 0 || r > 2 || !NETS[r].ok) return 0; rl = &RL[r]; net = &NETS[r]; return 1; }
// valueToRoll(ST, d) with the deadline t (performance.now() ms; 0 = none); -1 when the deadline passed
EXPORT double ur_value(int d, double t) { deadline = t > 0 ? t : 1e300; aborted = 0; double v = valueToRoll(&ST, d); return aborted ? -1 : v; }
EXPORT double ur_bestafter(int n, int d, double t) { deadline = t > 0 ? t : 1e300; aborted = 0; double v = bestAfterRoll(&ST, n, d); return aborted ? -1 : v; }
EXPORT double ur_static(void) { return staticEval(&ST); }
