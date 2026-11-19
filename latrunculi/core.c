// Ludus latrunculorum — the rules and the search in C → WebAssembly (tools/build-core.sh → core-wasm.js, core_mt.wasm) and a
// native build for the tools (tools/nnue/ltn.c: self-play data, the net's checks, matches).
// The same rules, move order, table, counters and evaluation as engine.js, so the one-thread results are identical node for node
// (tools/check_wasm.js: the searches; tools/check_rules.js: legal moves, captures, blocks, judge and evaluation on random positions).
// Memory shared with JS: SQ / INC (the board), IO (the rest of the position and small values both ways), ZT (zobrist keys, from
// engine.js), WT (the evaluation's weights of the rule), LMRT (the late-move reductions, from engine.js: Math.log), NETRAW (a net).
typedef signed char i8; typedef unsigned int u32; typedef unsigned char u8; typedef unsigned long long u64; typedef short i16;
#ifdef MT
#define TLS _Thread_local
#else
#define TLS
#endif
#define WIN 30000
#define WINT 29000
#define NN 64
#define MAXPLY 128
#define MAXMV 2048
#define QUIET_MAX 60
#define NOTERM 1000000
#ifdef NATIVE
double now(void);
static double tEndN = 1e300;
static int js_poll(void) { return now() > tEndN; }
static int js_shget(u32 h1, u32 h2) { (void)h1; (void)h2; return 0; }
static void js_shput(u32 h1, u32 h2, int d, int v, int f, int m) { (void)h1; (void)h2; (void)d; (void)v; (void)f; (void)m; }
#define EXPORT(n)
#include <string.h>
#else
#ifndef MT
__attribute__((import_module("env"), import_name("poll"))) int js_poll(void);
__attribute__((import_module("env"), import_name("shget"))) int js_shget(u32 h1, u32 h2);
__attribute__((import_module("env"), import_name("shput"))) void js_shput(u32 h1, u32 h2, int d, int v, int f, int m);
#endif
__attribute__((import_module("env"), import_name("now"))) double now(void);
#define EXPORT(n) __attribute__((export_name(#n)))
void *memcpy(void *d, const void *s, unsigned long n) { char *a = d; const char *b = s; while (n--) *a++ = *b++; return d; }
void *memset(void *d, int c, unsigned long n) { char *a = d; while (n--) *a++ = (char)c; return d; }
#endif
static inline double fl(double x) { return __builtin_floor(x); }
static inline int jsround(double x) { double r = fl(x); if (x - r >= 0.5) r += 1; return (int)r; }   // (Math.round)

// ---------------------------------------------------------------- shared with JS
i8 SQ[NN], INC[NN];
int IO[32];          // position in: 8 side, 9 ply, 10 h1, 11 h2, 12/13 hand, 14/15 cap, 16/17 last, 18 quiet; out: 0.. results
#define ZT_N (1154 + 2 * 2 * 4097)
u32 ZT[ZT_N];        // Z1[8][64], Z2[8][64], ZS1, ZS2, ZH1[2][32], ZH2[2][32], ZL1[2][4097], ZL2[2][4097]
double WT[32];       // the weights: [0..14] while placing, [15..29] once moving
#define LMR_I 1024
u8 LMRT[64 * LMR_I]; // max(1, floor(LMR_K ln d ln i))
int AOM[MAXMV], AOV[MAXMV];
#define Z1(k, i) ZT[(k) * 64 + (i)]
#define Z2(k, i) ZT[512 + (k) * 64 + (i)]
#define ZS1 ZT[1024]
#define ZS2 ZT[1025]
#define ZH1(k, h) ZT[1026 + (k) * 32 + (h)]
#define ZH2(k, h) ZT[1090 + (k) * 32 + (h)]
#define ZL1(k, l) ZT[1154 + (k) * 4097 + (l)]
#define ZL2(k, l) ZT[1154 + 8194 + (k) * 4097 + (l)]

// ---------------------------------------------------------------- the rule and the board
static int rRook = 0, rLeap = 1, rDelay = 1, rCorner = 1, rTie = 0, rStuckLose = 0, advKomi = 0;
static double tieW = 60;
static int nullOn = 1, qsStand = 1, aspW = 40;
// SX: search experiments (tools/nnue/ltn.c smatch; 0 = the search of engine.js): 1 reverse futility, 2 late-move pruning, 4 IIR,
// 8 more LMR while placing
static int SX = 0, SXA = 90;
EXPORT(setsx) void setsx(int x, int a) { SX = x; SXA = a; }
static int NB[NN][4], CEN[NN], CORNER[NN], RCR[NN];
static const int CADJ[4][2] = { { 1, 8 }, { 6, 15 }, { 48, 57 }, { 55, 62 } };
static int boardInit = 0;
static u64 CENM[7], CORNM, EDGEM;
#define FILE_A 0x0101010101010101ull
#define FILE_H 0x8080808080808080ull
static inline u64 shN(u64 x) { return x >> 8; }                 // bit i → i - 8 (up)
static inline u64 shS(u64 x) { return x << 8; }                 // bit i → i + 8
static inline u64 shW(u64 x) { return (x >> 1) & ~FILE_H; }     // bit i → i - 1
static inline u64 shE(u64 x) { return (x << 1) & ~FILE_A; }     // bit i → i + 1
static void initBoard(void) {
  for (int i = 0; i < NN; i++) {
    int r = i >> 3, c = i & 7;
    NB[i][0] = r > 0 ? i - 8 : -1; NB[i][1] = r < 7 ? i + 8 : -1; NB[i][2] = c > 0 ? i - 1 : -1; NB[i][3] = c < 7 ? i + 1 : -1;
    int a = r < 7 - r ? r : 7 - r, b = c < 7 - c ? c : 7 - c; CEN[i] = a + b;
    CORNER[i] = -1; RCR[i] = (r == 0 || r == 7 || c == 0 || c == 7);
  }
  CORNER[0] = 0; CORNER[7] = 1; CORNER[56] = 2; CORNER[63] = 3;
  for (int k = 0; k < 7; k++) CENM[k] = 0;
  CORNM = 1ull | 1ull << 7 | 1ull << 56 | 1ull << 63; EDGEM = 0;
  for (int i = 0; i < NN; i++) { CENM[CEN[i]] |= 1ull << i; if (RCR[i]) EDGEM |= 1ull << i; }
  boardInit = 1;
}
// setup(rook, leap, delay, corner, tie, stuckLose, komi, tieW): the rule set (engine.js RULES)
EXPORT(setup) void setup(int rook, int leap, int delay, int corner, int tie, int stuckLose, int komi, double tw) {
  if (!boardInit) initBoard();
  rRook = rook; rLeap = leap; rDelay = delay; rCorner = corner; rTie = tie; rStuckLose = stuckLose; advKomi = komi; tieW = tw;
}
EXPORT(setopt) void setopt(int nul, int qs, int asp) { nullOn = nul; qsStand = qs; aspW = asp; }

// ---------------------------------------------------------------- the net (NNUE; off while NH = 0: the hand-made evaluation)
// file: "LTN1", H, IN, K (the scale: the engine's value = the net's logit × K), FLAGS (1: the net is a correction added to the
// hand-made evaluation), int16 W1[IN][H], int16 B1[H], int16 W2[2H], int32 B2. Inputs per side (the board seen from that side: White's view mirrored top to bottom): 4 states × 64 squares (own free,
// own blocked, the opponent's free, the opponent's blocked), own counters in hand 0..24, the opponent's, own captures 0..24, the
// opponent's, plies without a capture / 6 (0..9). Hidden: clipped to 0..127, squared (SCReLU), (c² >> 6) × W2 summed.
#define NIN 366
#define NH_MAX 256
#define NQA 127
#define NQB 64
static int NH = 0, NK = 0, NB2 = 0, NFL = 0;
static i16 NW1[NIN * NH_MAX], NB1[NH_MAX], NW2[2 * NH_MAX];
#define NETRAW_MAX (20 + 2 * (NIN * NH_MAX + 3 * NH_MAX) + 8)
u8 NETRAW[NETRAW_MAX];
EXPORT(netrawp) u8 *netrawp(void) { return NETRAW; }
static int rd32(const u8 *p) { return (int)((u32)p[0] | (u32)p[1] << 8 | (u32)p[2] << 16 | (u32)p[3] << 24); }
static int rd16(const u8 *p) { return (int)(i16)(p[0] | p[1] << 8); }
// net_load(len): parse NETRAW (len 0: off); 1 = on
EXPORT(net_load) int net_load(int len) {
  NH = 0;
  if (len < 16 || NETRAW[0] != 'L' || NETRAW[1] != 'T' || NETRAW[2] != 'N' || NETRAW[3] != '1') return 0;
  int h = rd32(NETRAW + 4), in = rd32(NETRAW + 8), k = rd32(NETRAW + 12), fl = rd32(NETRAW + 16);
  if (h < 8 || h > NH_MAX || (h & 7) || in != NIN || len < 20 + 2 * (in * h + h + 2 * h) + 4) return 0;
  const u8 *p = NETRAW + 20;
  for (int i = 0; i < in * h; i++, p += 2) NW1[i] = (i16)rd16(p);
  for (int i = 0; i < h; i++, p += 2) NB1[i] = (i16)rd16(p);
  for (int i = 0; i < 2 * h; i++, p += 2) NW2[i] = (i16)rd16(p);
  NB2 = rd32(p); NK = k; NFL = fl; NH = h;
  return 1;
}
EXPORT(net_h) int net_h(void) { return NH; }

// ---------------------------------------------------------------- a position
typedef struct {
  i8 sq[NN], inc[NN];
  int side, ply, quiet, hand[2], cap[2], last[2], n[2];
  u32 h1, h2;
  u64 bb[2], bk;        // (each side's counters, the blocked ones: kept by setSq, for the evaluation)
  i16 acc[2][NH_MAX];   // (the net's first layer for each side's view: kept up to date while NH > 0; only NH of them copied)
} P;
#define PBASE ((unsigned long)__builtin_offsetof(P, acc))
static inline void pcopy(P *q, const P *p) {
  memcpy(q, p, PBASE);
  if (NH) { memcpy(q->acc[0], p->acc[0], (unsigned long)NH * 2); memcpy(q->acc[1], p->acc[1], (unsigned long)NH * 2); }
}
static inline int placing(const P *p) { return p->hand[0] + p->hand[1] > 0; }
// the net's input index of a counter (owner x 1/2, blocked a) on square i in the view of side v (0 Black, 1 White)
static inline int fSq(int v, int i, int x, int a) { return ((x - 1 == v ? 0 : 2) + (a ? 1 : 0)) * 64 + (v ? i ^ 56 : i); }
static inline int qb(int q) { int b = q / 6; return b > 9 ? 9 : b; }
static inline void accAdd(i16 *acc, int f) { const i16 *w = NW1 + f * NH; for (int i = 0; i < NH; i++) acc[i] += w[i]; }
static inline void accSub(i16 *acc, int f) { const i16 *w = NW1 + f * NH; for (int i = 0; i < NH; i++) acc[i] -= w[i]; }
static inline int hcap(int x) { return x > 24 ? 24 : x < 0 ? 0 : x; }
static void accMisc(P *p, int sgn) {   // the inputs that are not squares, added (sgn 1) or taken off (-1)
  for (int v = 0; v < 2; v++) {
    i16 *a = p->acc[v]; const int f[5] = { 256 + hcap(p->hand[v]), 281 + hcap(p->hand[v ^ 1]), 306 + hcap(p->cap[v]), 331 + hcap(p->cap[v ^ 1]), 356 + qb(p->quiet) };
    for (int k = 0; k < 5; k++) if (sgn > 0) accAdd(a, f[k]); else accSub(a, f[k]);
  }
}
static void refresh(P *p) {
  if (!NH) return;
  for (int v = 0; v < 2; v++) { for (int i = 0; i < NH; i++) p->acc[v][i] = NB1[i]; for (int s = 0; s < NN; s++) if (p->sq[s]) accAdd(p->acc[v], fSq(v, s, p->sq[s], p->inc[s])); }
  accMisc(p, 1);
}
static int netEval(const P *p) {
  const i16 *us = p->acc[p->side], *th = p->acc[p->side ^ 1];
  int s = 0;
  for (int i = 0; i < NH; i++) { int c = us[i] < 0 ? 0 : us[i] > NQA ? NQA : us[i]; s += ((c * c) >> 6) * NW2[i]; }
  for (int i = 0; i < NH; i++) { int c = th[i] < 0 ? 0 : th[i] > NQA ? NQA : th[i]; s += ((c * c) >> 6) * NW2[NH + i]; }
  long long t = (long long)s + NB2;
  return (int)(t * NK * 64 / (NQA * NQA * NQB));
}
static void syncBB(P *p) { p->bb[0] = p->bb[1] = p->bk = 0; for (int i = 0; i < NN; i++) if (p->sq[i]) { p->bb[p->sq[i] - 1] |= 1ull << i; if (p->inc[i]) p->bk |= 1ull << i; } }
static void rehash(P *p) {
  syncBB(p);
  p->n[0] = p->n[1] = 0;
  for (int i = 0; i < NN; i++) if (p->sq[i]) p->n[p->sq[i] - 1]++;
  u32 a = 0, c = 0;
  for (int i = 0; i < NN; i++) { int x = p->sq[i]; if (x) { int k = x - 1 + 2 * p->inc[i]; a ^= Z1(k, i); c ^= Z2(k, i); } }
  if (p->side) { a ^= ZS1; c ^= ZS2; }
  for (int k = 0; k < 2; k++) { a ^= ZH1(k, p->hand[k]) ^ ZL1(k, p->last[k] + 1); c ^= ZH2(k, p->hand[k]) ^ ZL2(k, p->last[k] + 1); }
  p->h1 = a; p->h2 = c;
}
static void loadPos(P *p) {   // the page's position: SQ, INC, IO[8..18] (h1 h2 as given)
  for (int i = 0; i < NN; i++) { p->sq[i] = SQ[i]; p->inc[i] = INC[i]; }
  p->side = IO[8]; p->ply = IO[9]; p->h1 = (u32)IO[10]; p->h2 = (u32)IO[11];
  p->hand[0] = IO[12]; p->hand[1] = IO[13]; p->cap[0] = IO[14]; p->cap[1] = IO[15]; p->last[0] = IO[16]; p->last[1] = IO[17]; p->quiet = IO[18];
  p->n[0] = p->n[1] = 0; for (int i = 0; i < NN; i++) if (p->sq[i]) p->n[p->sq[i] - 1]++;
  syncBB(p); refresh(p);
}
static void storePos(const P *p) {
  for (int i = 0; i < NN; i++) { SQ[i] = p->sq[i]; INC[i] = p->inc[i]; }
  IO[8] = p->side; IO[9] = p->ply; IO[10] = (int)p->h1; IO[11] = (int)p->h2; IO[12] = p->hand[0]; IO[13] = p->hand[1];
  IO[14] = p->cap[0]; IO[15] = p->cap[1]; IO[16] = p->last[0]; IO[17] = p->last[1]; IO[18] = p->quiet;
}
#define MV(f, t, rm) ((f) + 64 * (t) + 4096 * ((rm) + 1))
#define MFROM(m) ((m) & 63)
#define MTO(m) (((m) >> 6) & 63)
#define MRM(m) (((m) >> 12) - 1)
// destinations of the counter on f (the board as it is): steps / slides, then leaps over own counters (a search in the order of
// engine.js dests: a stack)
static int dests(const P *p, int f, int *out) {
  const i8 *sq = p->sq; const int pl = sq[f]; int n = 0;
  if (rRook) { for (int d = 0; d < 4; d++) for (int t = NB[f][d]; t >= 0 && !sq[t]; t = NB[t][d]) out[n++] = t; return n; }
  for (int d = 0; d < 4; d++) { int t = NB[f][d]; if (t >= 0 && !sq[t]) out[n++] = t; }
  if (rLeap) {
    u64 seen = 1ull << f, om = 0; for (int k = 0; k < n; k++) om |= 1ull << out[k];
    int stk[NN + 4], sp = 0; stk[sp++] = f;
    while (sp) {
      int a = stk[--sp];
      for (int d = 0; d < 4; d++) {
        int o = NB[a][d]; if (o < 0 || sq[o] != pl) continue;
        int t = NB[o][d]; if (t < 0 || (sq[t] && t != f) || (seen >> t & 1)) continue;
        seen |= 1ull << t; stk[sp++] = t;
        if (!(om >> t & 1)) { om |= 1ull << t; out[n++] = t; }
      }
    }
  }
  return n;
}
static int movesAfter(const P *p, int rm, int *out, int n) {
  const int pl = p->side + 1, lm = p->last[p->side], lf = lm >= 0 ? MTO(lm) : -1, lt = lm >= 0 ? MFROM(lm) : -1;
  int tmp[NN];
  for (int f = 0; f < NN; f++) {
    if (p->sq[f] != pl || p->inc[f]) continue;
    int k = dests(p, f, tmp);
    for (int j = 0; j < k; j++) { int t = tmp[j]; if (f == lf && t == lt) continue; if (n < MAXMV) out[n++] = MV(f, t, rm); }
  }
  return n;
}
static int removable(const P *p, int *out) {   // (the blocked enemy counters, in the order of the squares)
  if (!rDelay || placing(p)) return 0;
  u64 x = p->bb[1 - p->side] & p->bk; int k = 0;
  if (!out) return __builtin_popcountll(x);
  for (; x; x &= x - 1) out[k++] = __builtin_ctzll(x);
  return k;
}
static int genMoves(P *p, int *out) {
  int n = 0;
  if (placing(p)) { if (!p->hand[p->side]) return 0; for (int i = 0; i < NN; i++) if (!p->sq[i]) out[n++] = MV(i, i, -1); return n; }
  int rmv[NN], nr = removable(p, rmv);
  if (!nr) return movesAfter(p, -1, out, 0);
  for (int j = 0; j < nr; j++) {
    int r = rmv[j], keep = p->sq[r], ki = p->inc[r]; p->sq[r] = 0; p->inc[r] = 0;
    int n0 = n; n = movesAfter(p, r, out, n);
    if (n == n0 && n < MAXMV) out[n++] = MV(r, r, r);
    p->sq[r] = (i8)keep; p->inc[r] = (i8)ki;
  }
  return n;
}
static int hasMove(const P *p) {
  if (placing(p)) return p->hand[p->side] > 0;
  if (rDelay && removable(p, 0)) return 1;
  const int pl = p->side + 1, lm = p->last[p->side], lf = lm >= 0 ? MTO(lm) : -1, lt = lm >= 0 ? MFROM(lm) : -1;
  for (int f = 0; f < NN; f++) {
    if (p->sq[f] != pl || p->inc[f]) continue;
    for (int d = 0; d < 4; d++) { int t = NB[f][d]; if (t >= 0 && !p->sq[t] && !(f == lf && t == lt)) return 1; }
    if (rLeap) { int tmp[NN], k = dests(p, f, tmp); for (int j = 0; j < k; j++) if (!(f == lf && tmp[j] == lt)) return 1; }
  }
  return 0;
}
static inline void setSq(P *p, int i, int x, int a) {   // engine.js _set
  int y = p->sq[i];
  { const u64 bit = 1ull << i; if (y) p->bb[y - 1] &= ~bit; p->bk &= ~bit; if (x) { p->bb[x - 1] |= bit; if (a) p->bk |= bit; } }
  if (y) { int k = y - 1 + 2 * p->inc[i]; p->h1 ^= Z1(k, i); p->h2 ^= Z2(k, i); p->n[y - 1]--; if (NH) { accSub(p->acc[0], fSq(0, i, y, p->inc[i])); accSub(p->acc[1], fSq(1, i, y, p->inc[i])); } }
  p->sq[i] = (i8)x; p->inc[i] = (i8)(x ? a : 0);
  if (x) { int k = x - 1 + 2 * a; p->h1 ^= Z1(k, i); p->h2 ^= Z2(k, i); p->n[x - 1]++; if (NH) { accAdd(p->acc[0], fSq(0, i, x, a)); accAdd(p->acc[1], fSq(1, i, x, a)); } }
}
// enemy counters enclosed by the counter that has just landed on x: es[] (square) / ax[] (axis 1 horizontal 2 vertical 3 corner)
static int enclosed(const P *p, int x, int *es, int *ax) {
  const i8 *sq = p->sq, *inc = p->inc; const int pl = sq[x], o = 3 - pl; int n = 0;
  for (int d = 0; d < 4; d++) {
    int e = NB[x][d]; if (e < 0 || sq[e] != o) continue;
    int y = NB[e][d];
    if (y >= 0 && sq[y] == pl && !inc[y]) { if (es) { es[n] = e; ax[n] = d < 2 ? 2 : 1; } n++; continue; }
    if (rCorner && CORNER[e] >= 0) { int a = CADJ[CORNER[e]][0], b = CADJ[CORNER[e]][1], z = a == x ? b : a; if (sq[z] == pl && !inc[z]) { if (es) { es[n] = e; ax[n] = 3; } n++; } }
  }
  return n;
}
static void revalidate(P *p) {
  for (int i = 0; i < NN; i++) {
    int a = p->inc[i]; if (!a) continue;
    int o = 3 - p->sq[i], h0, h1;
    if (a == 1) { h0 = i - 1; h1 = i + 1; } else if (a == 2) { h0 = i - 8; h1 = i + 8; } else { h0 = CADJ[CORNER[i]][0]; h1 = CADJ[CORNER[i]][1]; }
    if (p->sq[h0] != o || p->sq[h1] != o || p->inc[h0] || p->inc[h1]) setSq(p, i, p->sq[i], 0);
  }
}
static void play(P *q, const P *p, int m) {
  pcopy(q, p);
  const int f = MFROM(m), t = MTO(m), rm = MRM(m), s = q->side, pl = s + 1;
  const int oh0 = q->hand[0], oh1 = q->hand[1], oc0 = q->cap[0], oc1 = q->cap[1], oq = q->quiet;
  q->h1 ^= ZH1(0, q->hand[0]) ^ ZH1(1, q->hand[1]) ^ ZL1(0, q->last[0] + 1) ^ ZL1(1, q->last[1] + 1);
  q->h2 ^= ZH2(0, q->hand[0]) ^ ZH2(1, q->hand[1]) ^ ZL2(0, q->last[0] + 1) ^ ZL2(1, q->last[1] + 1);
  int took = 0;
  if (placing(q)) { setSq(q, t, pl, 0); q->hand[s]--; q->last[s] = -1; }
  else {
    if (rm >= 0) { setSq(q, rm, 0, 0); q->cap[s]++; took++; }
    if (f != t) {
      setSq(q, f, 0, 0); setSq(q, t, pl, 0);
      int es[4], ax[4], ne = enclosed(q, t, es, ax);
      if (rDelay) { for (int k = 0; k < ne; k++) if (!q->inc[es[k]]) setSq(q, es[k], 3 - pl, ax[k]); revalidate(q); }
      else for (int k = 0; k < ne; k++) { setSq(q, es[k], 0, 0); q->cap[s]++; took++; }
      q->last[s] = f + 64 * t;
    } else q->last[s] = -1;
  }
  q->quiet = took || placing(q) ? 0 : q->quiet + 1;
  q->side ^= 1; q->ply++;
  q->h1 ^= ZS1 ^ ZH1(0, q->hand[0]) ^ ZH1(1, q->hand[1]) ^ ZL1(0, q->last[0] + 1) ^ ZL1(1, q->last[1] + 1);
  q->h2 ^= ZS2 ^ ZH2(0, q->hand[0]) ^ ZH2(1, q->hand[1]) ^ ZL2(0, q->last[0] + 1) ^ ZL2(1, q->last[1] + 1);
  if (NH && (oh0 != q->hand[0] || oh1 != q->hand[1] || oc0 != q->cap[0] || oc1 != q->cap[1] || qb(oq) != qb(q->quiet))) {
    P o; o.hand[0] = oh0; o.hand[1] = oh1; o.cap[0] = oc0; o.cap[1] = oc1; o.quiet = oq;
    for (int v = 0; v < 2; v++) {
      const int fo[5] = { 256 + hcap(o.hand[v]), 281 + hcap(o.hand[v ^ 1]), 306 + hcap(o.cap[v]), 331 + hcap(o.cap[v ^ 1]), 356 + qb(o.quiet) };
      const int fn[5] = { 256 + hcap(q->hand[v]), 281 + hcap(q->hand[v ^ 1]), 306 + hcap(q->cap[v]), 331 + hcap(q->cap[v ^ 1]), 356 + qb(q->quiet) };
      for (int k = 0; k < 5; k++) if (fo[k] != fn[k]) { accSub(q->acc[v], fo[k]); accAdd(q->acc[v], fn[k]); }
    }
  }
}
static void nullPlay(P *q, const P *p) {   // the null move of the search: the other side to move, one more quiet ply
  pcopy(q, p); q->side ^= 1; q->h1 ^= ZS1; q->h2 ^= ZS2;
  int oq = q->quiet; q->quiet++;
  if (NH && qb(oq) != qb(q->quiet)) for (int v = 0; v < 2; v++) { accSub(q->acc[v], 356 + qb(oq)); accAdd(q->acc[v], 356 + qb(q->quiet)); }
}
static int advDiff(const P *p) { int m = 0; for (int i = 0; i < NN; i++) { int x = p->sq[i]; if (!x || p->inc[i]) continue; if (x == 1 && i < 32) m++; else if (x == 2 && i >= 32) m--; } return m - advKomi; }
// judge: 0 = not over; else why * 4 + winner (0 draw, 1, 2); why 1 last, 2 stuck, 3 quiet, 4 tie, 5 tie2. nMoves < 0: not known
static int byCap(const P *p, int why) {
  if (p->cap[0] == p->cap[1]) {
    if (rTie) { int a = advDiff(p); return a ? 4 * 4 + (a > 0 ? 1 : 2) : 5 * 4 + 2; }
    return why * 4;
  }
  return why * 4 + (p->cap[0] > p->cap[1] ? 1 : 2);
}
static int judge(const P *p, int nMoves) {
  if (placing(p)) return 0;
  const int n1 = p->n[0], n2 = p->n[1];
  if (n1 <= 1 || n2 <= 1) return 4 + (n1 == n2 ? 0 : n1 > n2 ? 1 : 2);
  if (nMoves == 0 || (nMoves < 0 && !hasMove(p))) return rStuckLose ? 2 * 4 + (p->side ? 1 : 2) : byCap(p, 2);
  if (p->quiet >= QUIET_MAX) return byCap(p, 3);
  return 0;
}
static int terminal(const P *p, int ply, int nMoves) {
  if (!placing(p) && p->n[0] > 1 && p->n[1] > 1 && p->quiet < QUIET_MAX && (nMoves > 0 || (nMoves < 0 && hasMove(p)))) return NOTERM;
  int j = judge(p, nMoves);
  if (!j) return NOTERM;
  int w = j & 3;
  if (!w) return 0;
  return w == p->side + 1 ? WIN - ply : -WIN + ply;
}
// ---------------------------------------------------------------- the hand-made evaluation (engine.js evalCore)
static int evalHandRef(const P *p) {   // (the features are whole numbers but F[12]: counted in ints, the weighted sum in doubles as JS)
  const i8 *sq = p->sq, *inc = p->inc; const int me = p->side + 1;
  u8 RCH[2][NN]; i8 RSRC[2][NN];
  memset(RCH, 0, sizeof RCH);
  for (int f = 0; f < NN; f++) {
    int x = sq[f]; if (!x || inc[f]) continue;
    u8 *C = RCH[x - 1]; i8 *S = RSRC[x - 1];
    for (int d = 0; d < 4; d++) { int t = NB[f][d]; while (t >= 0 && !sq[t]) { C[t]++; S[t] = (i8)f; if (!rRook) break; t = NB[t][d]; } }
  }
  int F[15] = { 0 };
  for (int i = 0; i < NN; i++) {
    int x = sq[i]; if (!x) continue;
    int sg = x == me ? 1 : -1, o = 3 - x;
    if (inc[i]) { F[1] += sg; if (x != me) F[13] += 1; continue; }
    F[0] += sg; F[5] += sg * CEN[i];
    const int *nb = NB[i]; const u8 *RC0 = RCH[o - 1]; const i8 *RS0 = RSRC[o - 1]; const int hnd = p->hand[o - 1] > 0;
    int h = 0;
    for (int d = 0; d < 4; d += 2) {
      int a = nb[d], b = nb[d + 1]; if (a < 0 || b < 0) continue;
      int ea = sq[a] == o && !inc[a], eb = sq[b] == o && !inc[b];
#define REACHX(xx, nt) (hnd || RC0[xx] > 1 || (RC0[xx] == 1 && RS0[xx] != (nt)))
      if ((ea && !sq[b] && REACHX(b, a)) || (eb && !sq[a] && REACHX(a, b))) h++;
    }
    if (h) { F[2] += sg; if (h > 1) F[8] += sg; }
    if (rCorner && CORNER[i] >= 0) F[6] += sg;
    else if (RCR[i]) F[9] += sg;
    if (nb[1] >= 0 && sq[nb[1]] == x) F[4] += sg;
    if (nb[3] >= 0 && sq[nb[3]] == x) F[4] += sg;
    for (int d = 0; d < 4; d++) { int a = nb[d]; if (a >= 0) { if (!sq[a]) F[3] += sg; else if (sq[a] == o && inc[a]) F[10] += sg; } }
  }
  F[7] += p->hand[me - 1] - p->hand[2 - me];
  F[11] += 1;
  { const u8 *A = RCH[me - 1], *B = RCH[2 - me]; int c = 0; for (int x = 0; x < NN; x++) if (!sq[x]) c += (A[x] > 0) - (B[x] > 0); F[14] += c; }
  const int o = placing(p) ? 0 : 15;
  const double f12 = placing(p) ? 0 : (double)((p->n[me - 1] - p->n[2 - me] + p->cap[me - 1] - p->cap[2 - me]) * p->quiet) / QUIET_MAX;
  double v = 0; for (int k = 0; k < 15; k++) v += WT[o + k] * (k == 12 ? f12 : (double)F[k]);
  if (rTie && !placing(p) && p->cap[0] == p->cap[1]) {
    int a = advDiff(p); double s = me == 1 ? 1 : -1, t;
    if (a) { double aa = (a < 0 ? -a : a) / 3.0; t = (a > 0 ? 1 : -1) * (aa < 1 ? aa : 1); } else t = -.3;
    v += s * t * tieW * p->quiet / QUIET_MAX;
  }
  return jsround(v);
}
// the same features on bitboards (2026-11-20, several times faster; tools/check_rules.js and ltn evalcheck compare it with
// evalHandRef and engine.js). A free counter hangs (F[2]) when an enemy free counter stands on one side, the other side is empty and
// an enemy counter can reach it with one move (or the enemy still has counters in hand) — the counter beside it never can (it would
// have to pass the counter), so engine.js's "a counter other than that one" is any reaching counter.
#define PC(x) __builtin_popcountll(x)
static inline u64 slideFill(u64 g, u64 e, int d) { u64 f = 0; for (;;) { g = d == 0 ? shN(g) : d == 1 ? shS(g) : d == 2 ? shW(g) : shE(g); g &= e; if (!g) return f; f |= g; } }
static inline u64 reachOf(u64 fr, u64 e) {
  if (!rRook) return (shN(fr) | shS(fr) | shW(fr) | shE(fr)) & e;
  return slideFill(fr, e, 0) | slideFill(fr, e, 1) | slideFill(fr, e, 2) | slideFill(fr, e, 3);
}
static int evalHand(const P *p) {
  const int me = p->side + 1, op = 3 - me;
  const u64 Ma = p->bb[me - 1], Oa = p->bb[op - 1], Mb = Ma & p->bk, Ob = Oa & p->bk, Mf = Ma & ~p->bk, Of = Oa & ~p->bk, E = ~(Ma | Oa);
  const u64 Rm = reachOf(Mf, E), Ro = reachOf(Of, E);
  int F[15] = { 0 };
  F[0] = PC(Mf) - PC(Of); F[1] = PC(Mb) - PC(Ob); F[13] = PC(Ob);
  for (int k = 1; k < 7; k++) F[5] += k * (PC(Mf & CENM[k]) - PC(Of & CENM[k]));
  if (rCorner) { F[6] = PC(Mf & CORNM) - PC(Of & CORNM); F[9] = PC(Mf & EDGEM & ~CORNM) - PC(Of & EDGEM & ~CORNM); }
  else F[9] = PC(Mf & EDGEM) - PC(Of & EDGEM);
  F[4] = PC(Mf & shN(Ma)) + PC(Mf & shW(Ma)) - PC(Of & shN(Oa)) - PC(Of & shW(Oa));
  F[3] = PC(Mf & shS(E)) + PC(Mf & shN(E)) + PC(Mf & shE(E)) + PC(Mf & shW(E)) - PC(Of & shS(E)) - PC(Of & shN(E)) - PC(Of & shE(E)) - PC(Of & shW(E));
  F[10] = PC(Mf & shS(Ob)) + PC(Mf & shN(Ob)) + PC(Mf & shE(Ob)) + PC(Mf & shW(Ob)) - PC(Of & shS(Mb)) - PC(Of & shN(Mb)) - PC(Of & shE(Mb)) - PC(Of & shW(Mb));
  for (int k = 0; k < 2; k++) {   // k 0: my counters (the enemy = op), 1: the opponent's
    const u64 X = k ? Of : Mf, Y = k ? Mf : Of, T = E & (p->hand[(k ? me : op) - 1] > 0 ? ~0ull : (k ? Rm : Ro));
    const u64 Hv = (shS(Y) & shN(T)) | (shN(Y) & shS(T)), Hh = (shE(Y) & shW(T)) | (shW(Y) & shE(T));
    const int sg = k ? -1 : 1;
    F[2] += sg * PC(X & (Hv | Hh)); F[8] += sg * PC(X & Hv & Hh);
  }
  F[7] = p->hand[me - 1] - p->hand[2 - me];
  F[11] = 1;
  F[14] = PC(Rm) - PC(Ro);
  const int o = placing(p) ? 0 : 15;
  const double f12 = placing(p) ? 0 : (double)((p->n[me - 1] - p->n[2 - me] + p->cap[me - 1] - p->cap[2 - me]) * p->quiet) / QUIET_MAX;
  double v = 0; for (int k = 0; k < 15; k++) v += WT[o + k] * (k == 12 ? f12 : (double)F[k]);
  if (rTie && !placing(p) && p->cap[0] == p->cap[1]) {
    int a = advDiff(p); double s = me == 1 ? 1 : -1, t;
    if (a) { double aa = (a < 0 ? -a : a) / 3.0; t = (a > 0 ? 1 : -1) * (aa < 1 ? aa : 1); } else t = -.3;
    v += s * t * tieW * p->quiet / QUIET_MAX;
  }
  return jsround(v);
}
static int NETMV = 0;   // (the net only once the counters move: the hand-made evaluation while placing)
static inline int evaluate(const P *p) { return NH && !(NETMV && placing(p)) ? ((NFL & 1) ? evalHand(p) : 0) + netEval(p) : evalHand(p); }

// ---------------------------------------------------------------- the search (engine.js search / quiesce / bestMove / rootValues)
static TLS double nodes = 0, nodeLimit = 1e300;
static TLS int stopF = 0, useSH = 0;
static TLS int killers[MAXPLY][2];
static TLS int HIST[2 * 4096];
EXPORT(kclear) void kclear(void) { for (int i = 0; i < MAXPLY; i++) killers[i][0] = killers[i][1] = -1; for (int i = 0; i < 2 * 4096; i++) HIST[i] >>= 3; }
EXPORT(setn) void setn(double n, double lim, int sh) { nodes = n; nodeLimit = lim; stopF = 0; useSH = sh; }
EXPORT(getn) double getn(void) { return nodes; }
EXPORT(stopped) int stopped(void) { return stopF; }
// the table
#ifndef MT
#define TSZ (1 << 21)
typedef struct { u32 k, h2; int gen; short v; signed char d, f; int m; } TE;
static TE T[TSZ];
static int gen = 1, tsize = 0;
EXPORT(ttclear) void ttclear(void) { gen++; tsize = 0; }
static TE *tfind(u32 k) { u32 i = (k * 2654435761u) & (TSZ - 1); for (;;) { TE *e = &T[i]; if (e->gen != gen) return 0; if (e->k == k) return e; i = (i + 1) & (TSZ - 1); } }
static void tset(u32 k, u32 h2, int d, int v, int f, int m) {
  if (tsize > 600000) ttclear();   // (as the Map: checked before every store)
  TE *e = tfind(k);
  if (!e) { u32 i = (k * 2654435761u) & (TSZ - 1); while (T[i].gen == gen) i = (i + 1) & (TSZ - 1); e = &T[i]; e->gen = gen; e->k = k; tsize++; }
  e->h2 = h2; e->d = (signed char)d; e->v = (short)v; e->f = (signed char)f; e->m = m;
}
static int tlook(u32 h1, u32 h2, int *d, int *f, int *v, int *m) { TE *e = tfind(h1); if (!e || e->h2 != h2) return 0; *d = e->d; *f = e->f; *v = e->v; *m = e->m; return 1; }
EXPORT(ttprobe) int ttprobe(u32 h1, u32 h2) { return tlook(h1, h2, IO, IO + 1, IO + 2, IO + 3); }
#else
// (MT) as konane/core.c: one thread (abExact) = the Map semantics on a lockless open table; several = Praline's bucket table
// a = depth 8 | flag 2 | value 16 | move + 2 19 | h2's low 18 | used 1
#define TT_BITS 21
#define TT_CLEAR_N 600000
typedef struct { u64 kw, a; } TTS;
static TTS TTB[1 << TT_BITS];
static volatile int ttCount; static int abExact = 1;
EXPORT(ttclear) void ttclear(void) { for (unsigned i = 0; i < (1u << TT_BITS); i++) { TTB[i].kw = 0; TTB[i].a = 0; } ttCount = 0; }
static int ttGen;
#define PL_TT_BITS (TT_BITS - 3)
#define PL_TT_WAYS 4
#define PL_TT_WORDS 3
#define PL_TT_IN TTB
#define PL_TT_USED(w, c) ((w) >> 63)
#define PL_TT_SCORE(w, c) (!((w) >> 63) ? -1000 : (int)(signed char)((w) & 255) - ((c) != (u64)ttGen ? 8 : 0))
#include "../shared/praline/praline_tt.h"
#define AUNPACK(a) do { *d = (int)(signed char)((a) & 255); *f = (int)(((a) >> 8) & 3); *v = (int)(short)(unsigned short)(((a) >> 10) & 0xFFFF); *m = (int)(((a) >> 26) & 0x7FFFF) - 2; } while (0)
static int tlook(u32 h1, u32 h2, int *d, int *f, int *v, int *m) {
  if (!abExact) { u64 a, c; if (!plttFind((u64)h1 | (u64)h2 << 32, h1, &a, &c)) return 0;
    if (!(a >> 63) || ((a >> 45) & 0x3FFFF) != (h2 & 0x3FFFF)) return 0;
    AUNPACK(a); return 1; }
  const u64 want = (u64)h1 | (u64)h2 << 32; const unsigned M = (1u << TT_BITS) - 1;
  for (unsigned i = (h1 * 2654435761u) & M, k = 0; k <= M; i = (i + 1) & M, k++) {
    u64 kw = __atomic_load_n(&TTB[i].kw, __ATOMIC_ACQUIRE);
    if (!kw) return 0;
    if ((u32)kw != h1) continue;
    if (kw != want) return 0;
    u64 a = __atomic_load_n(&TTB[i].a, __ATOMIC_ACQUIRE);
    if (!(a >> 63) || ((a >> 45) & 0x3FFFF) != (h2 & 0x3FFFF)) return 0;
    AUNPACK(a); return 1;
  }
  return 0;
}
static void tset(u32 h1, u32 h2, int d, int v, int f, int m) {
  if (abExact && ttCount > TT_CLEAR_N) ttclear();
  const u64 want = (u64)h1 | (u64)h2 << 32; const unsigned M = (1u << TT_BITS) - 1;
  const u64 a = (u64)(u8)(signed char)d | (u64)(f & 3) << 8 | (u64)(unsigned short)(short)v << 10 | (u64)((m + 2) & 0x7FFFF) << 26 | (u64)(h2 & 0x3FFFF) << 45 | 1ull << 63;
  if (!abExact) { int hit; u64 ow, oc; u64 *e = plttSlot(want, h1, &hit, &ow, &oc); plttWrite(e, want, a, (u64)ttGen); return; }
  for (unsigned i = (h1 * 2654435761u) & M, k = 0; k <= M; i = (i + 1) & M, k++) {
    u64 kw = __atomic_load_n(&TTB[i].kw, __ATOMIC_ACQUIRE);
    if (!kw) {
      if (!__atomic_compare_exchange_n(&TTB[i].kw, &kw, want, 0, __ATOMIC_ACQ_REL, __ATOMIC_ACQUIRE)) { i = (i - 1) & M; k--; continue; }
      __atomic_fetch_add(&ttCount, 1, __ATOMIC_RELAXED); __atomic_store_n(&TTB[i].a, a, __ATOMIC_RELEASE); return;
    }
    if ((u32)kw != h1) continue;
    if (kw != want) __atomic_store_n(&TTB[i].kw, want, __ATOMIC_RELEASE);
    __atomic_store_n(&TTB[i].a, a, __ATOMIC_RELEASE); return;
  }
}
EXPORT(ttprobe) int ttprobe(u32 h1, u32 h2) { return tlook(h1, h2, IO, IO + 1, IO + 2, IO + 3); }
#endif
static TLS P ST[MAXPLY + 2];
typedef int Move;
#ifdef MT
#define SP_MV 256
#define PL_SP_FIELDS P pos; short lg[SP_MV];
#define stopFlag stopF
#include "../shared/praline/praline.h"
static TLS double tEnd = 1e300;
static inline void mtCheck(void) {
  if (now() > tEnd || nodes > nodeLimit || __atomic_load_n(&gStop, __ATOMIC_RELAXED)) stopF = 1;
  else if (curSP && chainStopped(curSP, curIdx)) stopF = 2;
  else if (dupMode && gOpenN > 0 && dupLeave()) stopF = 3;
}
#define POLL() mtCheck()
#else
#define POLL() do { if (js_poll() || nodes > nodeLimit) stopF = 1; } while (0)
#endif
static inline int isKiller(int m, int ply) { return ply >= 0 && ply < MAXPLY && (killers[ply][0] == m || killers[ply][1] == m); }
static int moveScore(P *p, int m, int ttm, int ply) {
  if (m == ttm) return 1000000;
  int s = 0;
  if (!placing(p)) {
    int t = MTO(m), f = MFROM(m);
    if (f != t) { int kf = p->sq[f], k0 = p->sq[t]; p->sq[f] = 0; p->sq[t] = (i8)kf; s += enclosed(p, t, 0, 0) * 500; p->sq[t] = (i8)k0; p->sq[f] = (i8)kf; }
    if (MRM(m) >= 0) s += 50;
  } else s += CEN[MTO(m)] * 3;
  if (isKiller(m, ply)) s += 200;
  int h = HIST[(p->side << 12) + (m & 4095)] >> 4; s += h < 150 ? h : 150;
  return s;
}
static void orderMoves(P *p, int *L, int n, int ttm, int ply) {   // a stable sort, best first
  static TLS int sc[MAXMV], out[MAXMV];
  for (int i = 0; i < n; i++) {
    int m = L[i], v = moveScore(p, m, ttm, ply), j = i;
    while (j > 0 && sc[j - 1] < v) { sc[j] = sc[j - 1]; out[j] = out[j - 1]; j--; }
    sc[j] = v; out[j] = m;
  }
  for (int i = 0; i < n; i++) L[i] = out[i];
}
static inline int lmrRed(int d, int i) { return LMRT[(d > 63 ? 63 : d) * LMR_I + (i >= LMR_I ? LMR_I - 1 : i)]; }
static int quiesce(P *p, int a, int b, int ply, int qd) {
  const int stand = evaluate(p);
  if (placing(p) || qd >= 4) return stand;
  const int must = rDelay && removable(p, 0) > 0;
  const int sp = !must || qsStand;
  int best = sp ? stand : -2147483647;
  if (sp) { if (stand >= b) return stand; if (stand > a) a = stand; }
  int L[MAXMV], n = genMoves(p, L);
  P *q = &ST[ply + 1 < MAXPLY ? ply + 1 : MAXPLY];
  for (int i = 0; i < n; i++) {
    int m = L[i];
    if (sp) {
      int f = MFROM(m), t = MTO(m);
      if (f == t) continue;
      int rm = MRM(m), kr = rm >= 0 ? p->sq[rm] : 0, ki = rm >= 0 ? p->inc[rm] : 0; if (rm >= 0) { p->sq[rm] = 0; p->inc[rm] = 0; }
      int kf = p->sq[f], kt = p->sq[t]; p->sq[f] = 0; p->sq[t] = (i8)kf;
      int ne = enclosed(p, t, 0, 0); p->sq[t] = (i8)kt; p->sq[f] = (i8)kf;
      if (rm >= 0) { p->sq[rm] = (i8)kr; p->inc[rm] = (i8)ki; }
      if (!ne) continue;
    }
    nodes += 1;
    play(q, p, m);
    int tv = terminal(q, ply + 1, -1);
    int v = tv != NOTERM ? -tv : -quiesce(q, -b, -a, ply + 1, qd + 1);
    if (v > best) best = v;
    if (v > a) a = v;
    if (a >= b) break;
  }
  return best == -2147483647 ? stand : best;
}
static int search(P *p, int d, int a, int b, int ply) {
  nodes += 1;
#ifdef SIM_NODE
  SIM_NODE();
#endif
  if ((((long long)nodes) & 1023) == 0) POLL();
  if (stopF) return 0;
  if (d <= 0) { int tq = terminal(p, ply, -1); if (tq != NOTERM) return tq; return quiesce(p, a, b, ply, 0); }
  int L[MAXMV], n = genMoves(p, L);
  { int tv = terminal(p, ply, n); if (tv != NOTERM) return tv; }
  int hit = 0, ed = 0, ef = 0, ev = 0, em = -1; const int a0 = a;
#ifndef MT
  if (useSH) { if (js_shget(p->h1, p->h2)) { hit = 1; ed = IO[0]; ef = IO[1]; ev = IO[2]; em = IO[3]; } }
  else
#endif
  hit = tlook(p->h1, p->h2, &ed, &ef, &ev, &em);
  int ttm = -1;
  if (hit) {
    ttm = em;
    if (ed >= d) {
      int v = ev > WINT ? ev - ply : ev < -WINT ? ev + ply : ev;
      if (ef == 0) return v; if (ef == 1 && v >= b) return v; if (ef == 2 && v <= a) return v;
    }
  }
  const int pv = b - a > 1;
  P *q = &ST[ply + 1 < MAXPLY ? ply + 1 : MAXPLY];
  if ((SX & 1) && !pv && d <= 3 && !placing(p) && (b < 0 ? -b : b) < WINT && !(rDelay && removable(p, 0))) { int ev = evaluate(p); if (ev - SXA * d >= b) return ev; }
  if ((SX & 4) && d >= 5 && ttm < 0) d--;
  if (!pv && nullOn && d >= 3 && !placing(p) && (b < 0 ? -b : b) < WINT && !(rDelay && removable(p, 0)) && p->n[p->side] > 3 && evaluate(p) >= b) {
    nullPlay(q, p);
    int v = -search(q, d - 3, -b, -b + 1, ply + 1);
    if (stopF) return 0;
    if (v >= b && v < WINT) return v;
  }
  orderMoves(p, L, n, ttm, ply);
  int best = -2147483647, bm = L[0];
#ifdef MT
  int noSplit = 0;
#endif
  for (int i = 0; i < n; i++) {
#ifdef MT
    if (i >= 1 && !noSplit && d >= splitD && n - i >= 2 && n - i <= SP_MV && (gIdle > 0 || (gWaitN > 0 && spWanted()))) {
      SPt *s = spAlloc();
      if (s) {
        s->pos = *p; int k = 0; for (int j = i; j < n; j++) { s->mv[k] = L[j]; s->lg[k++] = (short)j; }
        s->n = k; s->depth = d; s->ply = ply; s->root = 0; s->all = 0; s->pv = pv; s->beta = b; s->alpha = a;
        Move bmm = bm; spRun(s, &best, &bmm, 0); bm = bmm;
        if (stopF) return 0;
        if (best > a) a = best;
        break;
      }
      noSplit = 1;
    }
#endif
    const int m = L[i];
    if ((SX & 2) && !pv && d <= 3 && i >= 3 + 2 * d * d && !placing(p) && best > -WINT && MRM(m) < 0 && !isKiller(m, ply)) {
      int f = MFROM(m), t = MTO(m), kf = p->sq[f], k0 = p->sq[t]; p->sq[f] = 0; p->sq[t] = (i8)kf; int ne = enclosed(p, t, 0, 0); p->sq[t] = (i8)k0; p->sq[f] = (i8)kf;
      if (!ne) continue;
    }
    play(q, p, m);
    int v;
    if (i == 0) v = -search(q, d - 1, -b, -a, ply + 1);
    else {
      int red = 0;
      if (d >= 3 && i >= 3 && !placing(p) && q->n[p->side ^ 1] == p->n[p->side ^ 1] && !isKiller(m, ply)) {
        red = lmrRed(d, i); if (pv) red = red - 1 > 0 ? red - 1 : 0; if (red > d - 2) red = d - 2;
      } else if (placing(p) && d >= 3 && i >= 10) { red = 1; if ((SX & 8) && i >= 20 && d >= 4) red = 2; if (red > d - 2) red = d - 2; }
      v = -search(q, d - 1 - red, -a - 1, -a, ply + 1);
      if (v > a && (red || v < b)) { play(q, p, m); v = -search(q, d - 1, -b, -a, ply + 1); }
    }
    if (stopF) return 0;
    if (v > best) { best = v; bm = m; }
    if (v > a) a = v;
    if (a >= b) {
      if (ply >= 0 && ply < MAXPLY && killers[ply][0] != m) { killers[ply][1] = killers[ply][0]; killers[ply][0] = m; }
      int hi = (p->side << 12) + (m & 4095); int hv = HIST[hi] + d * d; HIST[hi] = hv < (1 << 20) ? hv : (1 << 20);
      break;
    }
  }
  int sv = best > WINT ? best + ply : best < -WINT ? best - ply : best;
  int fl2 = best <= a0 ? 2 : best >= b ? 1 : 0;
#ifndef MT
  if (useSH) js_shput(p->h1, p->h2, d, sv, fl2, bm); else
#endif
  tset(p->h1, p->h2, d, sv, fl2, bm);
  return best;
}
#ifdef MT
// ---- Praline's glue (praline_ybw.h)
static inline P *slotP(int ply) { return &ST[ply < MAXPLY ? ply : MAXPLY]; }
static void spLoadPos(const SPt *s, int top, int fresh) { *slotP(s->ply) = s->pos; (void)top; (void)fresh; }
static TLS int rootHi;
static int spSearch(SPt *s, int i, int a) {
  const int ply = s->ply, b = s->beta, d = s->depth; const Move m = s->mv[i];
  P *p = slotP(ply), *q = slotP(ply + 1);
  play(q, p, m);
  int v;
  if (s->root) {
    if (s->all) v = -search(q, d - 1, -WIN - 1, WIN + 1, 1);
    else { v = -search(q, d - 1, -a - 1, -a, 1); if (v > a && !stopF) { play(q, p, m); v = -search(q, d - 1, -b, -a, 1); } }
  } else {
    const int pv = s->pv, li = s->lg[i];
    int red = 0;
    if (d >= 3 && li >= 3 && !placing(p) && q->n[p->side ^ 1] == p->n[p->side ^ 1] && !isKiller(m, ply)) {
      red = lmrRed(d, li); if (pv) red = red - 1 > 0 ? red - 1 : 0; if (red > d - 2) red = d - 2;
    } else if (placing(p) && d >= 3 && li >= 10) red = 1;
    v = -search(q, d - 1 - red, -a - 1, -a, ply + 1);
    if (v > a && (red || v < b)) { play(q, p, m); v = -search(q, d - 1, -b, -a, ply + 1); }
  }
  return v;
}
static void spCutoff(const SPt *s, int i) {
  const int ply = s->ply, m = s->mv[i];
  if (ply >= 0 && ply < MAXPLY && killers[ply][0] != m) { killers[ply][1] = killers[ply][0]; killers[ply][0] = m; }
  int hi = (s->pos.side << 12) + (m & 4095); int hv = HIST[hi] + s->depth * s->depth; HIST[hi] = hv < (1 << 20) ? hv : (1 << 20);
}
static inline int spTop(void) { return 0; }
static void waitCheck(void) { SIM_IDLE(); mtCheck(); }
static void spIdleReset(int fresh) { nodes = 0; tEnd = 1e300; nodeLimit = 1e300; if (fresh) kclear(); }
#include "../shared/praline/praline_ybw.h"
#endif
// ---------------------------------------------------------------- the page's entries: the position in SQ / INC / IO[8..18]
EXPORT(search) int csearch(int d, int a, int b, int ply) { P *p = &ST[0]; loadPos(p); return search(p, d, a, b, ply); }
EXPORT(evaluate) int cevaluate(void) { P p; loadPos(&p); return evaluate(&p); }
// ab_order(n, ttm, ply): the moves AOM[0..n) in the search's order (engine.js orderMoves with this core's killers / history)
EXPORT(ab_order) void ab_order(int n, int ttm, int ply) { P *p = &ST[0]; loadPos(p); orderMoves(p, AOM, n, ttm, ply); }
static int rootChild(int m, int d, int a, int b) { play(&ST[1], &ST[0], m); return -search(&ST[1], d - 1, a, b, 1); }
// ab_best(maxD): engine.js bestMove after its counters / kreset: IO[0] move, IO[1] value, IO[2] depth
EXPORT(ab_best) void ab_best(int maxD) {
  P *root = &ST[0]; loadPos(root);
  int all[MAXMV], n = genMoves(root, all), O[MAXMV];
  for (int i = 0; i < n; i++) O[i] = all[i];
  orderMoves(root, O, n, -1, 0);
  int best = n ? all[0] : -1, bv = 0, depth = 0;
  for (int d = 1; d <= maxD; d++) {
    int bm = O[0], bestV = -2147483647;
    const int narrow = d >= 4 && (bv < 0 ? -bv : bv) < WINT;
    int lo = narrow ? bv - aspW : -WIN - 1, hi = narrow ? bv + aspW : WIN + 1;
    for (int tries = 0; ; tries++) {
      int a = lo; bm = O[0]; bestV = -2147483647;
      int i0 = 0;
#ifdef MT
      int splitDone = 0;
#endif
      for (int i = i0; i < n; i++) {
#ifdef MT
        if (i == 1 && n - 1 >= 2 && n - 1 <= SP_MV && d >= splitD && gIdle > 0 && a < hi) {
          SPt *s = spAlloc();
          if (s) {
            s->pos = *root; int vals[SP_MV];
            for (int j = 1; j < n; j++) { s->mv[j - 1] = O[j]; s->lg[j - 1] = (short)j; }
            s->n = n - 1; s->depth = d; s->ply = 0; s->root = 1; s->all = 0; s->pv = 1; s->beta = hi; s->alpha = a;
            int b2v = bestV; Move b2 = bm; spRun(s, &b2v, &b2, vals);
            if (b2v > bestV) { bestV = b2v; bm = b2; } if (bestV > a) a = bestV;
            splitDone = 1; break;
          }
        }
#endif
        const int m = O[i];
        int v;
        if (i == 0) v = rootChild(m, d, -hi, -a);
        else { v = rootChild(m, d, -a - 1, -a); if (v > a && !stopF) v = rootChild(m, d, -hi, -a); }
        if (stopF) break;
        if (v > bestV) { bestV = v; bm = m; }
        if (v > a) a = v;
        if (a >= hi) break;
      }
#ifdef MT
      (void)splitDone;
#endif
      if (stopF) break;
      if (bestV <= lo && lo > -WIN - 1) { lo = tries ? -WIN - 1 : lo - aspW * 4; continue; }
      if (bestV >= hi && hi < WIN + 1) {
        hi = tries ? WIN + 1 : hi + aspW * 4;
        int k = 0; while (O[k] != bm) k++; for (; k > 0; k--) O[k] = O[k - 1]; O[0] = bm;
        continue;
      }
      break;
    }
    if (stopF && bestV == -2147483647) break;
    if (!stopF || bestV >= bv) { best = bm; bv = bestV; }
    if (stopF) break;
    depth = d;
    { int k = 0; while (O[k] != bm) k++; for (; k > 0; k--) O[k] = O[k - 1]; O[0] = bm; }
    if ((bv < 0 ? -bv : bv) > WINT) break;
  }
  IO[0] = best; IO[1] = bv; IO[2] = depth;
}
// ab_values(d): engine.js rootValues — the finished root moves in AOM / AOV best first (a stable sort); returns how many
EXPORT(ab_values) int ab_values(int d) {
  P *root = &ST[0]; loadPos(root);
  int O[MAXMV], n = genMoves(root, O), vals[MAXMV], k = 0;
  orderMoves(root, O, n, -1, 0);
  for (int i = 0; i < n; i++) vals[i] = -2147483647;
  int done = 0;
#ifdef MT
  if (n >= 2 && n <= SP_MV && d >= splitD && gIdle > 0) {
    SPt *s = spAlloc();
    if (s) {
      s->pos = *root;
      for (int j = 0; j < n; j++) { s->mv[j] = O[j]; s->lg[j] = (short)j; }
      s->n = n; s->depth = d; s->ply = 0; s->root = 1; s->all = 1; s->pv = 1; s->beta = WIN + 1; s->alpha = -WIN - 1;
      int bst = -2147483647; Move b2 = O[0]; spRun(s, &bst, &b2, vals); done = 1;
      // (as the one-thread loop: a stopped search keeps only the moves before the first unfinished one)
      if (stopF) { int j = 0; while (j < n && vals[j] != -2147483647) j++; for (; j < n; j++) vals[j] = -2147483647; }
    }
  }
#endif
  if (!done) for (int i = 0; i < n; i++) { int v = rootChild(O[i], d, -WIN - 1, WIN + 1); if (stopF) break; vals[i] = v; }
  for (int i = 0; i < n; i++) {
    if (vals[i] == -2147483647) continue;
    int j = k++; while (j > 0 && AOV[j - 1] < vals[i]) { AOV[j] = AOV[j - 1]; AOM[j] = AOM[j - 1]; j--; }
    AOV[j] = vals[i]; AOM[j] = O[i];
  }
  return k;
}
// ---------------------------------------------------------------- the rules for tools/check_rules.js (position in SQ / INC / IO)
EXPORT(t_moves) int t_moves(void) { P p; loadPos(&p); return genMoves(&p, AOM); }
EXPORT(t_play) void t_play(int m) { P p, q; loadPos(&p); p.h1 = (u32)IO[10]; p.h2 = (u32)IO[11]; play(&q, &p, m); storePos(&q); IO[19] = q.n[0]; IO[20] = q.n[1]; }
EXPORT(t_judge) int t_judge(int nMoves) { P p; loadPos(&p); return judge(&p, nMoves); }
EXPORT(t_hasmove) int t_hasmove(void) { P p; loadPos(&p); return hasMove(&p); }
EXPORT(t_rehash) void t_rehash(void) { P p; loadPos(&p); rehash(&p); IO[10] = (int)p.h1; IO[11] = (int)p.h2; }
// the net's check: play the moves AOM[0..n) from the position, the accumulators kept move by move against a refresh at the end;
// returns 1 when equal (IO[0] = the evaluation)
EXPORT(t_netcheck) int t_netcheck(int n) {
  P a, b; loadPos(&a);
  for (int i = 0; i < n; i++) { play(&b, &a, AOM[i]); a = b; }
  b = a; refresh(&b);
  int ok = 1; for (int v = 0; v < 2; v++) for (int i = 0; i < NH; i++) if (a.acc[v][i] != b.acc[v][i]) ok = 0;
  IO[0] = evaluate(&a);
  return ok;
}
#ifdef MT
// ---- the threads (core_mt.wasm: shared/mtengine.js, the lead engine.js?…&mt=1, the helpers mt-helper.js)
EXPORT(ab_threads) void ab_threads(int n) { const int ex = n <= 1; if (ex != abExact) ttclear(); abExact = ex; if (!ex) ttGen = (ttGen + 1) & 255; }
EXPORT(set_tend) void set_tend(double t) { tEnd = t; }
EXPORT(mt_stop) void mt_stop(int v) { __atomic_store_n(&gStop, v, __ATOMIC_SEQ_CST); }
#ifndef NATIVE
extern unsigned char __heap_base;
extern void __wasm_init_tls(void *);
EXPORT(mt_heap_base) unsigned mt_heap_base(void) { return (unsigned)&__heap_base; }
EXPORT(mt_stack) void mt_stack(unsigned stackTop) { __asm__ volatile(".globaltype __stack_pointer, i32\n local.get %0\n global.set __stack_pointer" :: "r"(stackTop)); }
EXPORT(mt_thread) void mt_thread(unsigned tls, int id) { __wasm_init_tls((void *)tls); threadId = id; }
#endif
#endif
EXPORT(sqp) i8 *sqp(void) { return SQ; }
EXPORT(incp) i8 *incp(void) { return INC; }
EXPORT(ztp) u32 *ztp(void) { return ZT; }
EXPORT(iop) int *iop(void) { return IO; }
EXPORT(wtp) double *wtp(void) { return WT; }
EXPORT(lmrp) u8 *lmrp(void) { return LMRT; }
EXPORT(aomp) int *aomp(void) { return AOM; }
EXPORT(aovp) int *aovp(void) { return AOV; }
