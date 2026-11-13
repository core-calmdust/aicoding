// Ugolki — the search in WebAssembly (tools/build-core.sh → core-wasm.js). The same algorithm, move order, table, repetition
// rule and counters as search() / orderMoves() / evaluate() / terminal() in engine.js: the one-thread results are identical
// (tools/check_wasm.js). With the shared table of the multi-threaded search the page's table (shared/mttt.js) is used
// through imports. Memory shared with JS: SQ (board), IO (the position and small values), RH (the line's earlier positions).
typedef signed char i8; typedef unsigned int u32; typedef unsigned char u8; typedef unsigned long long u64;
// -DMT (core_mt.wasm, 2026-11-11): the threads of the page's pool on one shared memory — each thread's search state thread-local,
// one lockless table, Praline's Young Brothers Wait (shared/praline/) at the nodes and the root (claude/ugolki-spec.md)
#ifdef MT
#define TLS _Thread_local
#else
#define TLS
#endif
#define WIN 30000
#define PASS 4096
#define MAXPLY 160
#define MAXMV 512
#ifndef MT
__attribute__((import_module("env"), import_name("poll"))) int js_poll(void);
__attribute__((import_module("env"), import_name("shget"))) int js_shget(u32 h1, u32 h2);
__attribute__((import_module("env"), import_name("shput"))) void js_shput(u32 h1, u32 h2, int d, int v, int f, int m, int ply);
#endif
#ifdef NATIVE
double now(void);
#define EXPORT(n)
#else
__attribute__((import_module("env"), import_name("now"))) double now(void);
#define EXPORT(n) __attribute__((export_name(#n)))
#endif
#if !defined(NATIVE)
void *memcpy(void *d, const void *s, unsigned long n) { char *a = d; const char *b = s; while (n--) *a++ = *b++; return d; }
void *memset(void *d, int c, unsigned long n) { char *a = d; while (n--) *a++ = (char)c; return d; }
#endif
i8 SQ[64];
int IO[32];          // in: [8] side, [9] ply, [10] h1, [11] h2, [12] free, [13] rhN; shget out: [0] d [1] f [2] v [3] m [4] ply
u32 ZT[4 * 64 + 2];  // Z1[2][64], Z2[2][64], ZS1, ZS2
TLS u32 RH1[4096], RH2[4096];
static TLS int rhN = 0;
// the rule (setup): homes, distances, neighbours, jumps
static int LIMIT = 40, CAP = 80, NHOME = 9;
static i8 HOME[3][64], DIST[3][64]; static int BASE[3];
typedef unsigned long long u64b; static u64b HOMEB[3];
static int SCF[3][64], SCT[3][64];   // (the ordering score of a move = SCF[pl][from] + SCT[pl][to])   // (the camps as bit masks, bit = the square)
static int NBR[64][8], NBRN[64], JO[64][8], JL[64][8], JN[64];
__attribute__((export_name("setup"))) void setup(int rows, int cols, int diag, int limit, int cap) {
  LIMIT = limit; CAP = cap; NHOME = 0;
  static const int DR[8] = { -1, 1, 0, 0, -1, -1, 1, 1 }, DC[8] = { 0, 0, -1, 1, -1, 1, -1, 1 };
  int nd = diag ? 8 : 4;
  for (int i = 0; i < 64; i++) {
    int r = i >> 3, c = i & 7;
    HOME[1][i] = r >= 8 - rows && c < cols; HOME[2][i] = r < rows && c >= 8 - cols; if (HOME[1][i]) NHOME++;
    int a = r, b = 7 - c, a2 = 7 - r, b2 = c;
    DIST[1][i] = (i8)(diag ? (a > b ? a : b) : a + b); DIST[2][i] = (i8)(diag ? (a2 > b2 ? a2 : b2) : a2 + b2);
    NBRN[i] = 0; JN[i] = 0;
    for (int d = 0; d < nd; d++) {
      int r1 = r + DR[d], c1 = c + DC[d], r2 = r + 2 * DR[d], c2 = c + 2 * DC[d];
      if (r1 >= 0 && r1 < 8 && c1 >= 0 && c1 < 8) NBR[i][NBRN[i]++] = r1 * 8 + c1;
      if (r2 >= 0 && r2 < 8 && c2 >= 0 && c2 < 8) { JO[i][JN[i]] = r1 * 8 + c1; JL[i][JN[i]] = r2 * 8 + c2; JN[i]++; }
    }
  }
  BASE[1] = BASE[2] = 0;
  for (int i = 0; i < 64; i++) { if (HOME[2][i]) BASE[1] += DIST[1][i]; if (HOME[1][i]) BASE[2] += DIST[2][i]; }
  for (int pl = 1; pl <= 2; pl++) for (int i = 0; i < 64; i++) { SCF[pl][i] = DIST[pl][i] * 100 + (HOME[pl][i] ? 15 : 0); SCT[pl][i] = -DIST[pl][i] * 100 + (HOME[3 - pl][i] ? 30 : 0); }
  HOMEB[1] = HOMEB[2] = 0; for (int i = 0; i < 64; i++) { if (HOME[1][i]) HOMEB[1] |= 1ULL << i; if (HOME[2][i]) HOMEB[2] |= 1ULL << i; }
}
static TLS double nodes = 0, nodeLimit = 1e300;
static TLS int stopF = 0, useSH = 0;
static TLS int killers[MAXPLY];
__attribute__((export_name("kclear"))) void kclear(void) { for (int i = 0; i < MAXPLY; i++) killers[i] = 0; }
__attribute__((export_name("killer"))) int killer(int ply) { return ply >= 0 && ply < MAXPLY ? killers[ply] : 0; }
__attribute__((export_name("setn"))) void setn(double n, double lim, int sh) { nodes = n; nodeLimit = lim; stopF = 0; useSH = sh; }
__attribute__((export_name("getn"))) double getn(void) { return nodes; }
__attribute__((export_name("stopped"))) int stopped(void) { return stopF; }
// the table (the former Map: keyed by h1, cleared past 600,000 entries)
#ifndef MT
#define TSZ (1 << 21)
typedef struct { u32 k, h2; int gen; short v; signed char d, f; int m, ply; } TE;
static TE T[TSZ];
static int gen = 1, tsize = 0;
__attribute__((export_name("ttclear"))) void ttclear(void) { gen++; tsize = 0; }
static TE *tfind(u32 k) { u32 i = (k * 2654435761u) & (TSZ - 1); for (;;) { TE *e = &T[i]; if (e->gen != gen) return 0; if (e->k == k) return e; i = (i + 1) & (TSZ - 1); } }
static void tset(u32 k, u32 h2, int d, int v, int f, int m, int ply) {
  if (tsize > 600000) ttclear();
  TE *e = tfind(k);
  if (!e) { u32 i = (k * 2654435761u) & (TSZ - 1); while (T[i].gen == gen) i = (i + 1) & (TSZ - 1); e = &T[i]; e->gen = gen; e->k = k; tsize++; }
  e->h2 = h2; e->d = (signed char)d; e->v = (short)v; e->f = (signed char)f; e->m = m; e->ply = ply;
}
__attribute__((export_name("ttprobe"))) int ttprobe(u32 h1, u32 h2) { TE *e = tfind(h1); if (!e || e->h2 != h2) return 0; IO[0] = e->d; IO[1] = e->f; IO[2] = e->v; IO[3] = e->m; IO[4] = e->ply; return 1; }
static int tlook(u32 h1, u32 h2, int *d, int *f, int *v, int *m, int *ply) { TE *e = tfind(h1); if (!e || e->h2 != h2) return 0; *d = e->d; *f = e->f; *v = e->v; *m = e->m; *ply = e->ply; return 1; }
#else
// (MT) the same Map semantics on one shared table without locks: slot = { kw = h1 | h2 << 32 (0 empty: taken by a CAS), a = depth 8 |
// flag 2 | value 16 | move 13 | ply 10 | h2's low 14 | 1 << 63 }; one thread (abExact) clears it past 600,000 entries as before, several
// threads never mid-search (ab_sync: past half, cleared before; past 3/4 nothing new)
#define TT_BITS 21
typedef struct { u64 kw, a; } TTS;
static TTS TTB[1 << TT_BITS];
static volatile int ttCount; static int abExact = 1;
EXPORT(ttclear) void ttclear(void) { for (unsigned i = 0; i < (1u << TT_BITS); i++) { TTB[i].kw = 0; TTB[i].a = 0; } ttCount = 0; }
static int tlook(u32 h1, u32 h2, int *d, int *f, int *v, int *m, int *ply) {
  const u64 want = (u64)h1 | (u64)h2 << 32; const unsigned M = (1u << TT_BITS) - 1;
  for (unsigned i = (h1 * 2654435761u) & M, k = 0; k <= M; i = (i + 1) & M, k++) {
    u64 kw = __atomic_load_n(&TTB[i].kw, __ATOMIC_ACQUIRE);
    if (!kw) return 0;
    if ((u32)kw != h1) continue;
    if (kw != want) return 0;
    u64 a = __atomic_load_n(&TTB[i].a, __ATOMIC_ACQUIRE);
    if (!(a >> 63) || ((a >> 49) & 0x3FFF) != (h2 & 0x3FFF)) return 0;
    *d = (int)(signed char)(a & 255); *f = (int)((a >> 8) & 3); *v = (int)(short)(unsigned short)((a >> 10) & 0xFFFF); *m = (int)((a >> 26) & 0x1FFF); *ply = (int)((a >> 39) & 0x3FF);
    return 1;
  }
  return 0;
}
static void tset(u32 h1, u32 h2, int d, int v, int f, int m, int ply) {
  if (abExact && ttCount > 600000) ttclear();
  const u64 want = (u64)h1 | (u64)h2 << 32; const unsigned M = (1u << TT_BITS) - 1;
  const u64 a = (u64)(u8)(signed char)d | (u64)(f & 3) << 8 | (u64)(unsigned short)(short)v << 10 | (u64)(m & 0x1FFF) << 26 | (u64)(ply & 0x3FF) << 39 | (u64)(h2 & 0x3FFF) << 49 | 1ull << 63;
  for (unsigned i = (h1 * 2654435761u) & M, k = 0; k <= M && (abExact || k < 256); i = (i + 1) & M, k++) {
    u64 kw = __atomic_load_n(&TTB[i].kw, __ATOMIC_ACQUIRE);
    if (!kw) {
      if (!abExact && ttCount > (int)(M / 4 * 3)) return;
      if (!__atomic_compare_exchange_n(&TTB[i].kw, &kw, want, 0, __ATOMIC_ACQ_REL, __ATOMIC_ACQUIRE)) { i = (i - 1) & M; k--; continue; }
      __atomic_fetch_add(&ttCount, 1, __ATOMIC_RELAXED); __atomic_store_n(&TTB[i].a, a, __ATOMIC_RELEASE); return;
    }
    if ((u32)kw != h1) continue;
    if (kw != want) __atomic_store_n(&TTB[i].kw, want, __ATOMIC_RELEASE);
    __atomic_store_n(&TTB[i].a, a, __ATOMIC_RELEASE); return;
  }
}
EXPORT(ttprobe) int ttprobe(u32 h1, u32 h2) { return tlook(h1, h2, IO, IO + 1, IO + 2, IO + 3, IO + 4); }
#endif
// ---- positions
// (2026-11-13, speed: bb[colour - 1] = the colour's pieces as bits, kept by play(). The loops over the 64 squares walk the
// bits instead, in the same order; the counts in a camp are popcounts. claude/ugolki-spec.md「高速化」)
typedef struct { i8 sq[64]; int side, ply, fr; u32 h1, h2; u64b bb[2]; } P;
static void syncBB(P *p) { p->bb[0] = p->bb[1] = 0; for (int i = 0; i < 64; i++) if (p->sq[i]) p->bb[p->sq[i] - 1] |= 1ULL << i; }
#define Z1(c, i) ZT[(c) * 64 + (i)]
#define Z2(c, i) ZT[128 + (c) * 64 + (i)]
static void play(P *q, const P *p, int m) {
  *q = *p;
  if (m != PASS) { int f = m % 64, t = m / 64, x = q->sq[f]; q->sq[f] = 0; q->sq[t] = (i8)x; q->bb[x - 1] ^= (1ULL << f) | (1ULL << t); q->h1 ^= Z1(x - 1, f) ^ Z1(x - 1, t); q->h2 ^= Z2(x - 1, f) ^ Z2(x - 1, t); }
  q->side ^= 1; q->ply++; q->h1 ^= ZT[256]; q->h2 ^= ZT[257];
}
static TLS int stamp[64], stampN = 1; static TLS i8 queue[64];
static int reach(P *p, int f, int *out, int n) {
  if (stampN > 2000000000) { for (int i = 0; i < 64; i++) stamp[i] = 0; stampN = 1; }
  int st = ++stampN; stamp[f] = st;
  for (int k = 0; k < NBRN[f]; k++) { int t = NBR[f][k]; if (!p->sq[t] && stamp[t] != st) { stamp[t] = st; out[n++] = f + 64 * t; } }
  int qh = 0, qt = 0; queue[qt++] = (i8)f;
  i8 own = p->sq[f]; p->sq[f] = 0;
  while (qh < qt) {
    int x = queue[qh++];
    for (int k = 0; k < JN[x]; k++) {
      int o = JO[x][k], l = JL[x][k];
      if (!p->sq[o] || p->sq[l]) continue;
      if (stamp[l] == st) continue;
      stamp[l] = st; queue[qt++] = (i8)l; out[n++] = f + 64 * l;
    }
  }
  p->sq[f] = own;
  return n;
}
static int genMoves(P *p, int *out) {
  int pl = p->side + 1, n = 0;
  for (u64b w = p->bb[pl - 1]; w; w &= w - 1) n = reach(p, __builtin_ctzll(w), out, n);
  if (!n && p->fr) out[n++] = PASS;
  return n;
}
static int hasMove(const P *p) {
  if (p->fr) return 1;
  int pl = p->side + 1;
  for (u64b w = p->bb[pl - 1]; w; w &= w - 1) {
    const int i = __builtin_ctzll(w);
    for (int k = 0; k < NBRN[i]; k++) if (!p->sq[NBR[i][k]]) return 1;
    for (int k = 0; k < JN[i]; k++) if (p->sq[JO[i][k]] && !p->sq[JL[i][k]]) return 1;
  }
  return 0;
}
static int inTarget(const P *p, int pl) { return __builtin_popcountll(p->bb[pl - 1] & HOMEB[3 - pl]); }
static int inHome(const P *p, int pl) { return __builtin_popcountll(p->bb[pl - 1] & HOMEB[pl]); }
static int done(const P *p, int pl) { return inTarget(p, pl) == NHOME; }
// terminal(): 1 = not over; else the value for the side to move (0 draw)
#define NOTOVER 99999
static int countRes(const P *p, int ply) { int a = inTarget(p, 1), b = inTarget(p, 2); if (a == b) return 0; int w = a > b ? 1 : 2; return w == p->side + 1 ? WIN - ply : -(WIN - ply); }
static int terminal(const P *p, int ply) {
  int me = p->side + 1;
  if (p->fr) { if (done(p, 1)) return 1 == me ? WIN - ply : -(WIN - ply); return NOTOVER; }
  int n = p->ply;
  if (n >= 2 && !(n & 1)) {
    int wd = done(p, 1), bd = done(p, 2);
    if (wd && bd) return 0;
    if (wd) return 1 == me ? WIN - ply : -(WIN - ply);
    if (bd) return 2 == me ? WIN - ply : -(WIN - ply);
    if (n == 2 * LIMIT) {
      int sw = inHome(p, 1) > 0, sb = inHome(p, 2) > 0;
      if (sw && sb) return 0;
      if (sw) return 2 == me ? WIN - ply : -(WIN - ply);
      if (sb) return 1 == me ? WIN - ply : -(WIN - ply);
    }
    if (n >= 2 * CAP) return countRes(p, ply);
  }
  if (!hasMove(p)) return countRes(p, ply);
  return NOTOVER;
}
typedef struct { int s, mx, home, n, inT; } SS;
static inline int sideScoreOf(const P *p, int pl, const SS *c) {
  const int s = c->s, mx = c->mx, home = c->home, n = c->n, inT = c->inT;
  int v = -(s - BASE[pl]) * 34 - mx * 9;
  int mvs = pl == 1 ? (p->ply + 1) >> 1 : p->ply >> 1;
  if (home) { int k = mvs - (LIMIT - 14); if (k < 0) k = 0; v -= home * (12 + k * k * 6); }
  if (inT >= n - 2 && inT < n) v -= 20;
  return v;
}
static int evaluate(const P *p) {   // (2026-11-13, speed: the pieces by their bits, the camp counts by popcount — the same value)
  SS c[3];
  for (int pl = 1; pl <= 2; pl++) {
    const u64b own = p->bb[pl - 1]; int sum = 0, mx = 0;
    for (u64b w = own; w; w &= w - 1) { const int d = DIST[pl][__builtin_ctzll(w)]; sum += d; if (d > mx) mx = d; }
    c[pl].s = sum; c[pl].mx = mx; c[pl].n = __builtin_popcountll(own); c[pl].home = __builtin_popcountll(own & HOMEB[pl]); c[pl].inT = __builtin_popcountll(own & HOMEB[3 - pl]);
  }
  const int me = p->side + 1;
  return sideScoreOf(p, me, &c[me]) - sideScoreOf(p, 3 - me, &c[3 - me]) + 18;
}
// (2026-11-13, speed) the game's positions before the search (RH[0 .. rhBase), fixed during a search) behind a 4096-bit filter
// of their h1: a position whose bit is not set is in none of them, so only the line being searched is compared one by one.
// rhBuild at every place that loads the history (abRoot, search() from the page, a helper's spLoadPos). The same answers.
static TLS u64 RHF[64]; static TLS int rhBase = 0;
static void rhBuild(int n) {
  for (int i = 0; i < 64; i++) RHF[i] = 0;
  for (int i = 0; i < n; i++) { const u32 k = RH1[i] & 4095; RHF[k >> 6] |= 1ULL << (k & 63); }
  rhBase = n;
}
static int seenBefore(u32 h1, u32 h2) {
  const int base = rhBase <= rhN ? rhBase : 0;
  if (base) { const u32 k = h1 & 4095; if ((RHF[k >> 6] >> (k & 63)) & 1) for (int i = 0; i < base; i++) if (RH1[i] == h1 && RH2[i] == h2) return 1; }
  for (int i = base; i < rhN; i++) if (RH1[i] == h1 && RH2[i] == h2) return 1;
  return 0;
}
// ---- search v2 (2026-11-13, claude/ugolki-spec.md「探索 v2」): on for ab_best (the levels by positions / time) and the analysis
// (ab_values2 with v2 = 1); off — the search as before, exact to its depth — for the levels by depth, the resistance and
// search() called from the page (the puzzles). A change of mode clears the table. (-DUV_x=0: a part left out, for measuring)
#ifndef UV_LMR
#define UV_LMR 1
#endif
#ifndef UV_HIST
#define UV_HIST 1
#endif
#ifndef UV_RFP
#define UV_RFP 1
#endif
#ifndef UV_FUT
#define UV_FUT 1
#endif
#ifndef UV_IIR
#define UV_IIR 1
#endif
#ifndef UV_LMP
#define UV_LMP 1
#endif
#ifndef UV_NMP
#define UV_NMP 1
#endif
#ifndef LMP_D
#define LMP_D 3
#endif
#ifndef LMP_A
#define LMP_A 3
#endif
#ifndef LMP_B
#define LMP_B 1
#endif
#define WINT 29000
static TLS int noNullPly = -1;
#ifndef LMR_BASE
#define LMR_BASE 600
#endif
#ifndef LMR_DIV
#define LMR_DIV 18
#endif
#ifndef LMR_I
#define LMR_I 2
#endif
#ifndef RFP_M
#define RFP_M 120
#endif
#ifndef RFP_D
#define RFP_D 5
#endif
#ifndef FUT_M
#define FUT_M 150
#endif
#ifndef HIST_W
#define HIST_W 16
#endif
static int sv2 = 0;   // (the job's mode: the lead sets it, the helpers read it)
static TLS short hist[2][64][65];   // by the side, from, to (PASS: 0, 64): -512 .. 512
static unsigned char lmrT[64][64]; static int lmrInit = 0;
static void initLmr(void) {   // floor(LMR_BASE/1000 + ln(d) ln(n) / (LMR_DIV/10)) by a table of ln(1..63) x 1000 (no libm)
  static const short LN[64] = { 0, 0, 693, 1099, 1386, 1609, 1792, 1946, 2079, 2197, 2303, 2398, 2485, 2565, 2639, 2708, 2773, 2833, 2890, 2944, 2996,
    3045, 3091, 3135, 3178, 3219, 3258, 3296, 3332, 3367, 3401, 3434, 3466, 3497, 3526, 3555, 3584, 3611, 3638, 3664, 3689, 3714, 3738, 3761,
    3784, 3807, 3829, 3850, 3871, 3892, 3912, 3932, 3951, 3970, 3989, 4007, 4025, 4043, 4060, 4078, 4094, 4111, 4127, 4143 };
  for (int d = 1; d < 64; d++) for (int n = 1; n < 64; n++) lmrT[d][n] = (unsigned char)((LMR_BASE * 1000 + (long)LN[d] * LN[n] * 10 / LMR_DIV) / 1000000);
  lmrInit = 1;
}
static void setMode(int v) { if (!lmrInit) initLmr(); v = v ? 1 : 0; if (v != sv2) { ttclear(); sv2 = v; } }
static inline short *histAt(const P *p, int m) { return &hist[p->side][m % 64][(m / 64) % 65]; }
static inline void histAdd(const P *p, int m, int bonus) { short *h = histAt(p, m); *h += bonus - *h * (bonus < 0 ? -bonus : bonus) / 512; }
static inline int lmrOf(const P *p, int m, int d, int i, int ply) {   // the reduction of the move in place i (0 = first)
  if (d < 3 || i < LMR_I || (ply >= 0 && ply < MAXPLY && killers[ply] == m)) return 0;
  int red = lmrT[d > 63 ? 63 : d][i + 1 > 63 ? 63 : i + 1];
  if (UV_HIST) { const int h = *histAt(p, m); if (h > 200 && red) red--; else if (h < -200) red++; }
  if (red > d - 2) red = d - 2;
  return red < 0 ? 0 : red;
}
// (2026-11-13, speed) the moves by their score, the higher first and equal scores in the generator's order — as the insertion
// sort on doubles before, by one whole-number key per move (the score × 16 + the history, then the place) sorted by insertion
typedef long long i64;
// the key of every move of the node into K (the same place as the move in L)
static void orderKeys(const P *p, const int *L, i64 *K, int n, int ttm, int ply) {
  int pl = p->side + 1, k = (ply >= 0 && ply < MAXPLY && killers[ply]) ? killers[ply] : -1;
  for (int i = 0; i < n; i++) {
    const int m = L[i]; i64 v;
    if (m == ttm) v = 16000000000LL; else if (m == k) v = 1600000000LL;
    else if (m == PASS) v = 0;   // (PASS comes alone)
    else { const int f = m & 63, t = m >> 6; v = (i64)(SCF[pl][f] + SCT[pl][t]) * 16; if (UV_HIST && sv2) v += hist[p->side][f][t]; }
    K[i] = v * 1024 + (1023 - i);
  }
}
// the best of the moves from place i on to place i (search() takes the moves one at a time: a node that is cut off after a
// few moves, or drops its late moves, never sorts the rest)
static inline void orderPick(int *L, i64 *K, int i, int n) {
  int bi = i; i64 bk = K[i];
  for (int j = i + 1; j < n; j++) if (K[j] > bk) { bk = K[j]; bi = j; }
  if (bi != i) { K[bi] = K[i]; K[i] = bk; const int t = L[bi]; L[bi] = L[i]; L[i] = t; }
}
// the moves from place i on in order (all of them: the root, a split point)
static void orderRest(int *L, i64 *K, int i0, int n) {
  for (int i = i0 + 1; i < n; i++) { const i64 x = K[i]; const int m = L[i]; int j = i; while (j > i0 && K[j - 1] < x) { K[j] = K[j - 1]; L[j] = L[j - 1]; j--; } K[j] = x; L[j] = m; }
}
static void orderMoves(const P *p, int *L, int n, int ttm, int ply) {
  if (n <= 1) return;
  i64 K[MAXMV]; orderKeys(p, L, K, n, ttm, ply); orderRest(L, K, 0, n);
}
static TLS P ST[MAXPLY + 2];
typedef int Move;
#ifdef MT
// Praline (shared/praline/praline.h): a split point carries the node's position, the line's earlier positions (repetitions) and
// each move's place in the node's order (the late-move reduction)
#define SP_MV 160
#define SP_HK 600
#define PL_SP_FIELDS P pos; int rhn; short lg[SP_MV]; u32 rh1[SP_HK], rh2[SP_HK];
#define stopFlag stopF
#include "../shared/praline/praline.h"
static TLS double tEnd = 1e300;
static inline void mtCheck(void) {
  if (now() > tEnd || nodes > nodeLimit || __atomic_load_n(&gStop, __ATOMIC_RELAXED)) stopF = 1;
  else if (curSP && chainStopped(curSP, curIdx)) stopF = 2;
  else if (dupMode && gOpenN > 0 && dupLeave()) stopF = 3;
}
static int spFillPos(SPt *s, const P *p) {
  if (rhN > SP_HK) return 0;
  s->pos = *p; s->rhn = rhN; for (int i = 0; i < rhN; i++) { s->rh1[i] = RH1[i]; s->rh2[i] = RH2[i]; }
  return 1;
}
static void spLoadPos(const SPt *s, int top, int fresh) {
  ST[s->ply < MAXPLY ? s->ply : MAXPLY] = s->pos; rhN = s->rhn; for (int i = 0; i < rhN; i++) { RH1[i] = s->rh1[i]; RH2[i] = s->rh2[i]; }
  rhBuild(rhN);
  (void)top; (void)fresh;
}
#endif
static int search(P *p, int d, int a, int b, int ply) {
  nodes += 1;
#ifdef SIM_NODE
  SIM_NODE();
#endif
#ifdef MT
  if ((((long long)nodes) & 1023) == 0) mtCheck();
#else
  if ((((long long)nodes) & 1023) == 0 && (js_poll() || nodes > nodeLimit)) stopF = 1;
#endif
  if (stopF) return 0;
  int tv = terminal(p, ply); if (tv != NOTOVER) return tv;
  int hit = 0, ed = 0, ef = 0, ev = 0, em = -1, eply = 0;
#ifndef MT
  if (useSH) { if (js_shget(p->h1, p->h2)) { hit = 1; ed = IO[0]; ef = IO[1]; ev = IO[2]; em = IO[3]; eply = IO[4]; } }
  else
#endif
  hit = tlook(p->h1, p->h2, &ed, &ef, &ev, &em, &eply);
  if (ply > 0 && seenBefore(p->h1, p->h2)) return 0;
  if (hit && ed >= d && eply == p->ply) {
    if (ef == 0) return ev; if (ef == 1 && ev >= b) return ev; if (ef == 2 && ev <= a) return ev;
  }
  if (d <= 0) return evaluate(p);
  P *q = &ST[ply + 1 < MAXPLY ? ply + 1 : MAXPLY];
  const int v2 = sv2; int futile = 0, lmpN = 9999;
  if (v2 && b - a == 1 && a > -WINT && b < WINT && ply > 0) {
    const int stat = evaluate(p);
    if (UV_RFP && d <= RFP_D && stat - RFP_M * d >= b) return stat;
    if (UV_NMP && d >= 3 && stat >= b && ply != noNullPly && ply < MAXPLY - 2) {
      play(q, p, PASS);
      RH1[rhN] = p->h1; RH2[rhN] = p->h2; rhN++; noNullPly = ply + 1;
      const int nv = -search(q, d - 1 - (2 + d / 4), -b, -b + 1, ply + 1);
      noNullPly = -1; rhN--;
      if (stopF) return 0;
      if (nv >= b) return nv >= WINT ? b : nv;
    }
    if (UV_FUT && d <= 2 && stat + FUT_M * d <= a) futile = 1;
    if (UV_LMP && d <= LMP_D) lmpN = LMP_A + LMP_B * d * d;
  }
  if (UV_IIR && v2 && d >= 4 && !(hit && em >= 0)) d--;
  int L[MAXMV], n = genMoves(p, L);
  i64 K[MAXMV]; orderKeys(p, L, K, n, hit ? em : -1, ply);
  if (n > 1) orderPick(L, K, 0, n);
  int best = 0, any = 0, bm = n ? L[0] : 0, a0 = a;
  int qm[32], nq = 0;   // v2: the moves searched before a cut-off (their history goes down)
  RH1[rhN] = p->h1; RH2[rhN] = p->h2; rhN++;
#ifdef MT
  int noSplit = 0;
#endif
  for (int i = 0; i < n; i++) {
#ifdef MT
    // YBW: the first move is done and a helper is idle (or an owner above waits): the other moves, in this order, to a split point
    if (i >= 1 && !noSplit && d >= splitD && n - i >= 2 && n - i <= SP_MV && (gIdle > 0 || (gWaitN > 0 && spWanted()))) {
      SPt *s = spAlloc();
      if (s && spFillPos(s, p)) {
        orderRest(L, K, i, n);
        int k = 0; for (int j = i; j < n; j++) { s->mv[k] = L[j]; s->lg[k++] = (short)j; }
        s->n = k; s->depth = d; s->ply = ply; s->root = 0; s->all = 0; s->pv = 0; s->beta = b; s->alpha = a;
        Move bmm = bm; spRun(s, &best, &bmm, 0); bm = bmm;
        if (stopF) { rhN--; return best; }
        if (best >= b && ply >= 0 && ply < MAXPLY) killers[ply] = bm;
        break;
      }
      if (s) spRelease(s);
      noSplit = 1;
    }
#endif
    if (any && best > -WINT && ((futile && i >= 3) || i >= lmpN)) break;   // (the later moves are dropped as well)
    if (i > 0 && i + 1 < n) orderPick(L, K, i, n);
    int m = L[i];
    play(q, p, m);
    int v;
    if (i == 0) v = -search(q, d - 1, -b, -a, ply + 1);
    else {
      int red = v2 && UV_LMR ? lmrOf(p, m, d, i, ply) : (d >= 3 && i >= 6) ? 1 : 0;
      v = -search(q, d - 1 - red, -a - 1, -a, ply + 1);
      if (v > a && (red || v < b)) { if (v2) play(q, p, m); v = -search(q, d - 1, -b, -a, ply + 1); }
    }
    if (stopF) { rhN--; return any ? best : 0; }
    if (!any || v > best) { best = v; any = 1; bm = m; if (v > a) { a = v; if (a >= b) {
      if (ply >= 0 && ply < MAXPLY) killers[ply] = m;
      if (UV_HIST && v2) { const int bo = d * d * 4 > 200 ? 200 : d * d * 4; histAdd(p, m, bo); for (int j = 0; j < nq; j++) histAdd(p, qm[j], -bo); }
      break; } } }
    if (nq < 32) qm[nq++] = m;
  }
  rhN--;
  if (!any) return -2147483647;   // (no move: the JS gives −Infinity; never reached — terminal() covers a side without moves)
  int fl = best <= a0 ? 2 : best >= b ? 1 : 0;
#ifndef MT
  if (useSH) js_shput(p->h1, p->h2, d, best, fl, bm, p->ply); else
#endif
  tset(p->h1, p->h2, d, best, fl, bm, p->ply);
  return best;
}
#ifdef MT
// ---- Praline's glue (praline_ybw.h)
static int spSearch(SPt *s, int i, int a) {
  const int ply = s->ply, b = s->beta, d = s->depth; const Move m = s->mv[i];
  P *p = &ST[ply < MAXPLY ? ply : MAXPLY], *q = &ST[ply + 1 < MAXPLY ? ply + 1 : MAXPLY];
  play(q, p, m);
  int v;
  if (s->root) { rhN = s->rhn; v = s->all ? -search(q, d - 1, -WIN - 1, WIN + 1, 1) : -search(q, d - 1, -WIN - 1, -a, 1); }   // (the root: as ab_best / ab_values)
  else {
    int red = sv2 && UV_LMR ? lmrOf(p, m, d, s->lg[i], ply) : (d >= 3 && s->lg[i] >= 6) ? 1 : 0;
    v = -search(q, d - 1 - red, -a - 1, -a, ply + 1);
    if (v > a && (red || v < b)) v = -search(q, d - 1, -b, -a, ply + 1);
  }
  return v;
}
static void spCutoff(const SPt *s, int i) { if (s->ply >= 0 && s->ply < MAXPLY) killers[s->ply] = s->mv[i]; }
static inline int spTop(void) { return 0; }
static void waitCheck(void) { SIM_IDLE(); mtCheck(); }
static void spIdleReset(int fresh) { nodes = 0; tEnd = 1e300; nodeLimit = 1e300; if (fresh) for (int i = 0; i < MAXPLY; i++) killers[i] = 0; }
#include "../shared/praline/praline_ybw.h"
#endif
__attribute__((export_name("search"))) int csearch(int d, int a, int b, int ply) {
  P *p = &ST[0];
  for (int i = 0; i < 64; i++) p->sq[i] = SQ[i];
  syncBB(p);
  p->side = IO[8]; p->ply = IO[9]; p->h1 = (u32)IO[10]; p->h2 = (u32)IO[11]; p->fr = IO[12]; rhN = IO[13]; rhBuild(rhN);
  setMode(0);   // (the page's own searches: the puzzles' proofs, the search before v2)
  return search(p, d, a, b, ply);
}
// ---- the root's loops (2026-11-11: engine.js bestMove / rootValues in C, the same order and counters; on core_mt.wasm the root
// moves split among the threads). The root as for search(): SQ, IO[8…12], the game's earlier positions RH[0 … IO[13]).
// ab_best(maxD): IO[0] move, IO[1] value, IO[2] depth (−1: none); ab_values(d): the finished root moves in AOM / AOV best first
// (a stable sort), returns how many. The caller sets the counters (setn) and the killers (kclear) as for a JS bestMove.
int AOM[MAXMV], AOV[MAXMV];
static TLS int histN;
static void abRoot(void) { P *p = &ST[0]; for (int i = 0; i < 64; i++) p->sq[i] = SQ[i]; syncBB(p); p->side = IO[8]; p->ply = IO[9]; p->h1 = (u32)IO[10]; p->h2 = (u32)IO[11]; p->fr = IO[12]; histN = rhN = IO[13]; rhBuild(rhN); }
static int rootChild(int m, int d, int a, int b) { play(&ST[1], &ST[0], m); rhN = histN; return -search(&ST[1], d - 1, a, b, 1); }
EXPORT(ab_best) void ab_best(int maxD) {
  setMode(1);
  abRoot();
  int G[MAXMV], n = genMoves(&ST[0], G), O[MAXMV];
  for (int i = 0; i < n; i++) O[i] = G[i];
  orderMoves(&ST[0], O, n, -1, 0);
  int bestM = n ? O[0] : -1, bestV = 0, bestD = 0;
  for (int d = 1; d <= maxD; d++) {
    int a = -WIN - 1, bm = -1, bv = 0, any = 0;
    for (int i = 0; i < n; i++) O[i] = G[i];
    orderMoves(&ST[0], O, n, bestM, 0);
    for (int i = 0; i < n; i++) {
#ifdef MT
      if (i == 1 && n - 1 >= 2 && n - 1 <= SP_MV && d >= splitD && gIdle > 0) {   // YBW at the root: the first move is done
        rhN = histN; SPt *s = spAlloc();
        if (s && spFillPos(s, &ST[0])) {
          int vals[SP_MV];
          for (int j = 1; j < n; j++) { s->mv[j - 1] = O[j]; s->lg[j - 1] = (short)j; }
          s->n = n - 1; s->depth = d; s->ply = 0; s->root = 1; s->all = 0; s->pv = 1; s->beta = WIN + 1; s->alpha = a;
          Move b2 = bm; spRun(s, &bv, &b2, vals); bm = b2;
          break;
        }
        if (s) spRelease(s);
      }
#endif
      int v = rootChild(O[i], d, -WIN - 1, -a);
      if (stopF) break;
      if (!any || v > bv) { bv = v; bm = O[i]; any = 1; if (v > a) a = v; }
    }
    if (stopF && bm < 0) break;
    if (bm >= 0) { bestM = bm; bestV = bv; bestD = d; }
    if (stopF) break;
    if (bv > 29000 || bv < -29000) break;
  }
  IO[0] = bestM; IO[1] = bestV; IO[2] = bestD;
}
EXPORT(ab_values2) int ab_values2(int d, int v2);
EXPORT(ab_values) int ab_values(int d) { return ab_values2(d, 0); }
int ab_values2(int d, int v2) {   // v2 = 1: the analysis (search v2); 0: the levels by depth, the resistance (as before)
  setMode(v2);
  abRoot();
  int O[MAXMV], n = genMoves(&ST[0], O), vals[MAXMV], k = 0;
  orderMoves(&ST[0], O, n, -1, 0);
  for (int i = 0; i < n; i++) vals[i] = -2147483647;
#ifdef MT
  int done = 0;
  if (n >= 2 && n <= SP_MV && d >= splitD && gIdle > 0) {   // every root move with the full window: split from the first
    rhN = histN; SPt *s = spAlloc();
    if (s && spFillPos(s, &ST[0])) {
      for (int j = 0; j < n; j++) { s->mv[j] = O[j]; s->lg[j] = (short)j; }
      s->n = n; s->depth = d; s->ply = 0; s->root = 1; s->all = 1; s->pv = 1; s->beta = WIN + 1; s->alpha = -WIN - 1;
      int bst = -2147483647; Move b2 = O[0]; spRun(s, &bst, &b2, vals); done = 1;
    } else if (s) spRelease(s);
  }
  if (!done)
#endif
  for (int i = 0; i < n; i++) { int v = rootChild(O[i], d, -WIN - 1, WIN + 1); if (stopF) break; vals[i] = v; }
  for (int i = 0; i < n; i++) {
    if (vals[i] == -2147483647) continue;
    int j = k++; while (j > 0 && AOV[j - 1] < vals[i]) { AOV[j] = AOV[j - 1]; AOM[j] = AOM[j - 1]; j--; }
    AOV[j] = vals[i]; AOM[j] = O[i];
  }
  return k;
}
EXPORT(aomp) int *aomp(void) { return AOM; }
EXPORT(aovp) int *aovp(void) { return AOV; }
#ifdef MT
// ---- the threads (core_mt.wasm: shared/mtengine.js, the lead engine.js?…&mt=1, the helpers mt-helper.js)
EXPORT(ab_threads) void ab_threads(int n) { abExact = n <= 1; if (!abExact && ttCount > (int)((1u << TT_BITS) / 2)) ttclear(); }
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
__attribute__((export_name("sqp"))) i8 *sqp(void) { return SQ; }
__attribute__((export_name("ztp"))) u32 *ztp(void) { return ZT; }
__attribute__((export_name("iop"))) int *iop(void) { return IO; }
__attribute__((export_name("rh1p"))) u32 *rh1p(void) { return RH1; }
__attribute__((export_name("rh2p"))) u32 *rh2p(void) { return RH2; }
