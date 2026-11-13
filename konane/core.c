// Kōnane — the search in WebAssembly (tools/build-core.sh → core-wasm.js). The same algorithm, move order, table and
// counters as search() / orderMoves() / evaluate() in engine.js, so the one-thread results are identical (tools/check_wasm.js).
// The table: the one-thread worker's own (the same rules as its former Map: keyed by h1, cleared past 700,000 entries);
// with the shared table of the multi-threaded search (shared/mttt.js) the page's table is used through imports.
// Memory shared with JS: SQ (the board), ZT (zobrist: Z1[2][100], Z2[2][100], ZS1, ZS2), IO (small values both ways).
typedef signed char i8; typedef unsigned int u32; typedef unsigned char u8; typedef unsigned long long u64;
// -DMT (core_mt.wasm, 2026-11-11): the threads of the page's pool on one shared memory — each thread's search state thread-local,
// one lockless table, Praline's Young Brothers Wait (shared/praline/) at the nodes and the root (claude/konane-spec.md)
#ifdef MT
#define TLS _Thread_local
#else
#define TLS
#endif
#define WIN 30000
#define WINT 29000
#define MAXN 100
#define MAXPLY 128
#define MAXMV 512
#ifndef MT
__attribute__((import_module("env"), import_name("poll"))) int js_poll(void);
__attribute__((import_module("env"), import_name("shget"))) int js_shget(u32 h1, u32 h2);
__attribute__((import_module("env"), import_name("shput"))) void js_shput(u32 h1, u32 h2, int d, int v, int f, int m);
#endif
#ifdef NATIVE
double now(void);
#define EXPORT(n)
#else
__attribute__((import_module("env"), import_name("now"))) double now(void);
#define EXPORT(n) __attribute__((export_name(#n)))
void *memcpy(void *d, const void *s, unsigned long n) { char *a = d; const char *b = s; while (n--) *a++ = *b++; return d; }
void *memset(void *d, int c, unsigned long n) { char *a = d; while (n--) *a++ = (char)c; return d; }
#endif
i8 SQ[MAXN];
u32 ZT[4 * MAXN + 2];
int IO[16];   // shget answers d f v m in IO[0..3]
static int N = 8, NN = 64;
static int RAY[MAXN][4][10], RAYN[MAXN][4], ADJ[MAXN][4], ADJN[MAXN], OPEN1[8], NOPEN1 = 0;
static int COLOR[MAXN];
static TLS double nodes = 0, nodeLimit = 1e300;
static TLS int stopF = 0, useSH = 0;
static TLS int killers[MAXPLY];
// the table
#ifndef MT
#define TSZ (1 << 21)
typedef struct { u32 k, h2; int gen; short v; signed char d, f; int m; } TE;
static TE T[TSZ];
static int gen = 1, tsize = 0;
__attribute__((export_name("ttclear"))) void ttclear(void) { gen++; tsize = 0; }
static TE *tfind(u32 k) { u32 i = (k * 2654435761u) & (TSZ - 1); for (;;) { TE *e = &T[i]; if (e->gen != gen) return 0; if (e->k == k) return e; i = (i + 1) & (TSZ - 1); } }
static void tset(u32 k, u32 h2, int d, int v, int f, int m) {
  if (tsize > 700000) ttclear();   // (as the Map: checked before every store)
  TE *e = tfind(k);
  if (!e) {
    u32 i = (k * 2654435761u) & (TSZ - 1); while (T[i].gen == gen) i = (i + 1) & (TSZ - 1);
    e = &T[i]; e->gen = gen; e->k = k; tsize++;
  }
  e->h2 = h2; e->d = (signed char)d; e->v = (short)v; e->f = (signed char)f; e->m = m;
}
// IO[0..4] = found, d, f, v, m — the page reads it (mtKids / mtLazy ordering)
__attribute__((export_name("ttprobe"))) int ttprobe(u32 h1, u32 h2) { TE *e = tfind(h1); if (!e || e->h2 != h2) return 0; IO[0] = e->d; IO[1] = e->f; IO[2] = e->v; IO[3] = e->m; return 1; }
static int tlook(u32 h1, u32 h2, int *d, int *f, int *v, int *m) { TE *e = tfind(h1); if (!e || e->h2 != h2) return 0; *d = e->d; *f = e->f; *v = e->v; *m = e->m; return 1; }
#else
// (MT) the same Map semantics on one shared table without locks: slot = { kw = h1 | h2 << 32 (0 empty: taken by a CAS), a = depth 8 |
// flag 2 | value 16 | move + 2 14 | h2's low 23 | 1 << 63 }; one thread clears it past 700,000 entries as before, several never mid-search
#define TT_BITS 21
#define TT_CLEAR_N 700000
typedef struct { u64 kw, a; } TTS;
static TTS TTB[1 << TT_BITS];
static volatile int ttCount; static int abExact = 1;
EXPORT(ttclear) void ttclear(void) { for (unsigned i = 0; i < (1u << TT_BITS); i++) { TTB[i].kw = 0; TTB[i].a = 0; } ttCount = 0; }
static int tlook(u32 h1, u32 h2, int *d, int *f, int *v, int *m) {
  const u64 want = (u64)h1 | (u64)h2 << 32; const unsigned M = (1u << TT_BITS) - 1;
  for (unsigned i = (h1 * 2654435761u) & M, k = 0; k <= M; i = (i + 1) & M, k++) {
    u64 kw = __atomic_load_n(&TTB[i].kw, __ATOMIC_ACQUIRE);
    if (!kw) return 0;
    if ((u32)kw != h1) continue;
    if (kw != want) return 0;
    u64 a = __atomic_load_n(&TTB[i].a, __ATOMIC_ACQUIRE);
    if (!(a >> 63) || ((a >> 40) & 0x7FFFFF) != (h2 & 0x7FFFFF)) return 0;
    *d = (int)(signed char)(a & 255); *f = (int)((a >> 8) & 3); *v = (int)(short)(unsigned short)((a >> 10) & 0xFFFF); *m = (int)((a >> 26) & 0x3FFF) - 2;
    return 1;
  }
  return 0;
}
static void tset(u32 h1, u32 h2, int d, int v, int f, int m) {
  if (abExact && ttCount > TT_CLEAR_N) ttclear();
  const u64 want = (u64)h1 | (u64)h2 << 32; const unsigned M = (1u << TT_BITS) - 1;
  const u64 a = (u64)(u8)(signed char)d | (u64)(f & 3) << 8 | (u64)(unsigned short)(short)v << 10 | (u64)((m + 2) & 0x3FFF) << 26 | (u64)(h2 & 0x7FFFFF) << 40 | 1ull << 63;
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
EXPORT(ttprobe) int ttprobe(u32 h1, u32 h2) { return tlook(h1, h2, IO, IO + 1, IO + 2, IO + 3); }
#endif
__attribute__((export_name("setup"))) void setup(int n) {
  N = n; NN = n * n; NOPEN1 = 0;
  static const int DR[4] = { -1, 1, 0, 0 }, DC[4] = { 0, 0, -1, 1 };
  for (int i = 0; i < NN; i++) {
    int r = i / N, c = i % N; ADJN[i] = 0;
    COLOR[i] = ((r + c) & 1) == ((N - 1) & 1) ? 1 : 2;
    for (int d = 0; d < 4; d++) {
      int k = 0, rr = r + DR[d], cc = c + DC[d];
      while (rr >= 0 && rr < N && cc >= 0 && cc < N) { RAY[i][d][k++] = rr * N + cc; rr += DR[d]; cc += DC[d]; }
      RAYN[i][d] = k; if (k) ADJ[i][ADJN[i]++] = RAY[i][d][0];
    }
  }
  int h = N / 2, cand[8] = { 0, N - 1, NN - N, NN - 1, (h - 1) * N + h - 1, (h - 1) * N + h, h * N + h - 1, h * N + h };
  for (int j = 0; j < 8; j++) if (COLOR[cand[j]] == 1) OPEN1[NOPEN1++] = cand[j];
  for (int a = 1; a < NOPEN1; a++) { int x = OPEN1[a], b = a; while (b > 0 && OPEN1[b - 1] > x) { OPEN1[b] = OPEN1[b - 1]; b--; } OPEN1[b] = x; }
}
__attribute__((export_name("kclear"))) void kclear(void) { for (int i = 0; i < MAXPLY; i++) killers[i] = 0; }
__attribute__((export_name("killer"))) int killer(int ply) { return ply >= 0 && ply < MAXPLY ? killers[ply] : 0; }
__attribute__((export_name("setn"))) void setn(double n, double lim, int sh) { nodes = n; nodeLimit = lim; stopF = 0; useSH = sh; }
__attribute__((export_name("getn"))) double getn(void) { return nodes; }
__attribute__((export_name("stopped"))) int stopped(void) { return stopF; }
// ---- a position: the board, the side (0 Black, 1 White), plies played, the two hash halves
typedef struct { i8 sq[MAXN]; int side, ply; u32 h1, h2; } P;
static TLS P ST[MAXPLY + 2];
typedef int Move;
#ifdef MT
// Praline (shared/praline/praline.h): a split point carries the node's position and each move's place in the node's order (LMR)
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
#define Z1(c, i) ZT[(c) * MAXN + (i)]
#define Z2(c, i) ZT[2 * MAXN + (c) * MAXN + (i)]
#define ZS1 ZT[4 * MAXN]
#define ZS2 ZT[4 * MAXN + 1]
static int jumpsOf(const P *p, int pl, int *out, int n) {
  int o = 3 - pl;
  for (int f = 0; f < NN; f++) {
    if (p->sq[f] != pl) continue;
    for (int d = 0; d < 4; d++) { int *ray = RAY[f][d], L = RAYN[f][d]; for (int k = 1; k < L; k += 2) { if (p->sq[ray[k - 1]] != o || p->sq[ray[k]]) break; out[n++] = f + 128 * ray[k]; } }
  }
  return n;
}
static int mobility(const P *p, int pl) {
  int o = 3 - pl, n = 0;
  for (int f = 0; f < NN; f++) {
    if (p->sq[f] != pl) continue;
    for (int d = 0; d < 4; d++) { int *ray = RAY[f][d], L = RAYN[f][d]; for (int k = 1; k < L; k += 2) { if (p->sq[ray[k - 1]] != o || p->sq[ray[k]]) break; n++; } }
  }
  return n;
}
static int movers(const P *p, int pl) {
  int o = 3 - pl, n = 0;
  for (int f = 0; f < NN; f++) {
    if (p->sq[f] != pl) continue;
    for (int d = 0; d < 4; d++) { int *ray = RAY[f][d]; if (RAYN[f][d] > 1 && p->sq[ray[0]] == o && !p->sq[ray[1]]) { n++; break; } }
  }
  return n;
}
static int genMoves(const P *p, int *out) {
  if (p->ply == 0) {
    int empty = 0; for (int i = 0; i < NN; i++) if (!p->sq[i]) empty++;
    if (empty == 0) { for (int j = 0; j < NOPEN1; j++) out[j] = OPEN1[j] + 128 * OPEN1[j]; return NOPEN1; }
    return jumpsOf(p, 1, out, 0);
  }
  if (p->ply == 1) {
    int ne = 0, e0 = -1; for (int i = 0; i < NN; i++) if (!p->sq[i]) { ne++; e0 = i; }
    if (ne == 1) {
      int tmp[4], n = 0;
      for (int j = 0; j < ADJN[e0]; j++) if (p->sq[ADJ[e0][j]] == 2) tmp[n++] = ADJ[e0][j];
      for (int a = 1; a < n; a++) { int x = tmp[a], b = a; while (b > 0 && tmp[b - 1] > x) { tmp[b] = tmp[b - 1]; b--; } tmp[b] = x; }
      for (int j = 0; j < n; j++) out[j] = tmp[j] + 128 * tmp[j];
      return n;
    }
  }
  return jumpsOf(p, p->side + 1, out, 0);
}
static int dirOf(int f, int t) { int r0 = f / N, c0 = f % N, r1 = t / N, c1 = t % N; return c0 == c1 ? (r1 < r0 ? 0 : 1) : (c1 < c0 ? 2 : 3); }
static void play(P *q, const P *p, int m) {
  *q = *p;
  int f = m % 128, t = m / 128, x = q->sq[f];
  if (f == t) { q->sq[f] = 0; q->h1 ^= Z1(x - 1, f); q->h2 ^= Z2(x - 1, f); }
  else {
    int d = dirOf(f, t), *ray = RAY[f][d], L = RAYN[f][d];
    for (int k = 0; k < L; k += 2) {
      int o = ray[k], y = q->sq[o]; q->sq[o] = 0;
      if (y) { q->h1 ^= Z1(y - 1, o); q->h2 ^= Z2(y - 1, o); }
      if (k + 1 < L && ray[k + 1] == t) break;
    }
    q->sq[f] = 0; q->sq[t] = (i8)x;
    q->h1 ^= Z1(x - 1, f) ^ Z1(x - 1, t); q->h2 ^= Z2(x - 1, f) ^ Z2(x - 1, t);
  }
  q->side ^= 1; q->ply++;
  q->h1 ^= ZS1; q->h2 ^= ZS2;
}
static int hops(int m) { int f = m % 128, t = m / 128; if (f == t) return 0; int dr = f / N - t / N, dc = f % N - t % N; if (dr < 0) dr = -dr; if (dc < 0) dc = -dc; return (dr + dc) >> 1; }
static int evaluate(const P *p) {
  if (p->ply < 2) return 0;
  int me = p->side + 1, op = 3 - me;
  int a = mobility(p, me), b = mobility(p, op), pa = movers(p, me), pb = movers(p, op);
  if (!a) return -WIN + 1;
  return (a - b) * 34 + (pa - pb) * 52 + 30;
}
// ---- search v2 (2026-11-13, claude/konane-spec.md「探索 v2」): on for ab_best (the levels by positions / time) and the analysis
// (ab_values2 with v2 = 1); off — the search as before, exact to its depth — for the levels by depth, the resistance and
// search() called from the page (the puzzles). A change of mode clears the table. (-DKV_x=0: a part left out, for measuring)
#ifndef KV_LMR
#define KV_LMR 1
#endif
#ifndef KV_HIST
#define KV_HIST 1
#endif
#ifndef KV_RFP
#define KV_RFP 1
#endif
#ifndef KV_FUT
#define KV_FUT 1
#endif
#ifndef KV_IIR
#define KV_IIR 1
#endif
#ifndef LMR_BASE
#define LMR_BASE 300
#endif
#ifndef LMR_DIV
#define LMR_DIV 22
#endif
#ifndef LMR_I
#define LMR_I 2
#endif
#ifndef RFP_M
#define RFP_M 120
#endif
#ifndef RFP_D
#define RFP_D 3
#endif
#ifndef FUT_M
#define FUT_M 150
#endif
#ifndef HIST_W
#define HIST_W 16
#endif
static int sv2 = 0;   // (the job's mode: the lead sets it, the helpers read it)
static TLS short hist[2][MAXN][MAXN];   // by the side, from, to: -512 .. 512
static unsigned char lmrT[64][64]; static int lmrInit = 0;
static void initLmr(void) {   // floor(LMR_BASE/1000 + ln(d) ln(n) / (LMR_DIV/10)) by a table of ln(1..63) x 1000 (no libm)
  static const short LN[64] = { 0, 0, 693, 1099, 1386, 1609, 1792, 1946, 2079, 2197, 2303, 2398, 2485, 2565, 2639, 2708, 2773, 2833, 2890, 2944, 2996,
    3045, 3091, 3135, 3178, 3219, 3258, 3296, 3332, 3367, 3401, 3434, 3466, 3497, 3526, 3555, 3584, 3611, 3638, 3664, 3689, 3714, 3738, 3761,
    3784, 3807, 3829, 3850, 3871, 3892, 3912, 3932, 3951, 3970, 3989, 4007, 4025, 4043, 4060, 4078, 4094, 4111, 4127, 4143 };
  for (int d = 1; d < 64; d++) for (int n = 1; n < 64; n++) lmrT[d][n] = (unsigned char)((LMR_BASE * 1000 + (long)LN[d] * LN[n] * 10 / LMR_DIV) / 1000000);
  lmrInit = 1;
}
static void setMode(int v) { if (!lmrInit) initLmr(); v = v ? 1 : 0; if (v != sv2) { ttclear(); sv2 = v; } }
static inline short *histAt(const P *p, int m) { return &hist[p->side][(m % 128) % MAXN][(m / 128) % MAXN]; }
static inline void histAdd(const P *p, int m, int bonus) { short *h = histAt(p, m); *h += bonus - *h * (bonus < 0 ? -bonus : bonus) / 512; }
static inline int lmrOf(const P *p, int m, int d, int i, int ply) {   // the reduction of the move in place i (0 = first)
  if (d < 3 || i < LMR_I || (ply >= 0 && ply < MAXPLY && killers[ply] == m)) return 0;
  int red = lmrT[d > 63 ? 63 : d][i + 1 > 63 ? 63 : i + 1];
  if (KV_HIST) { const int h = *histAt(p, m); if (h > 200 && red) red--; else if (h < -200) red++; }
  if (red > d - 2) red = d - 2;
  return red < 0 ? 0 : red;
}
static P OP;   // (orderMoves' scratch child)
static TLS double OSC[MAXMV];
static void orderMoves(const P *p, int *L, int n, int ttm, int ply) {
  if (n < 2) return;
  int k = (ply >= 0 && ply < MAXPLY && killers[ply]) ? killers[ply] : -1, me = p->side + 1, op = 3 - me;
  int out[MAXMV];
  for (int i = 0; i < n; i++) {
    int m = L[i]; double v;
    if (m == ttm) v = 1e9; else if (m == k) v = 1e8; else { play(&OP, p, m); v = -mobility(&OP, op) * 10 + mobility(&OP, me) * 6 + hops(m); if (KV_HIST && sv2) v += (double)*histAt(p, m) / HIST_W; }
    int j = i; while (j > 0 && OSC[j - 1] < v) { OSC[j] = OSC[j - 1]; out[j] = out[j - 1]; j--; }
    OSC[j] = v; out[j] = m;
  }
  for (int i = 0; i < n; i++) L[i] = out[i];
}
static int search(P *p, int d, int a, int b, int ply) {
  nodes += 1;
#ifdef SIM_NODE
  SIM_NODE();
#endif
  if ((((long long)nodes) & 1023) == 0) POLL();
  if (stopF) return 0;
  int hit = 0, ed = 0, ef = 0, ev = 0, em = -1;
#ifndef MT
  if (useSH) { if (js_shget(p->h1, p->h2)) { hit = 1; ed = IO[0]; ef = IO[1]; ev = IO[2]; em = IO[3]; } }
  else
#endif
  hit = tlook(p->h1, p->h2, &ed, &ef, &ev, &em);
  if (hit && ed >= d) {
    int v = ev > WINT ? ev - ply : ev < -WINT ? ev + ply : ev;
    if (ef == 0) return v; if (ef == 1 && v >= b) return v; if (ef == 2 && v <= a) return v;
  }
  int L[MAXMV], n = genMoves(p, L);
  if (!n) return -(WIN - ply);
  if (d <= 0) return evaluate(p);
  const int v2 = sv2; int futile = 0;
  if (v2 && b - a == 1 && a > -WINT && b < WINT && ply > 0 && p->ply >= 2) {
    const int stat = evaluate(p);
    if (KV_RFP && d <= RFP_D && stat - RFP_M * d >= b) return stat;
    if (KV_FUT && d <= 2 && stat + FUT_M * d <= a) futile = 1;
  }
  if (KV_IIR && v2 && d >= 4 && !(hit && em >= 0)) d--;
  orderMoves(p, L, n, hit ? em : -1, ply);
  int best = -2000000000, bm = L[0], a0 = a, any = 0;
  int qm[32], nq = 0;   // v2: the moves searched before a cut-off (their history goes down)
  P *q = &ST[ply + 1 < MAXPLY ? ply + 1 : MAXPLY];
#ifdef MT
  int noSplit = 0;
#endif
  for (int i = 0; i < n; i++) {
#ifdef MT
    // YBW: the first move is done and a helper is idle (or an owner above waits): the other moves, in this order, to a split point
    if (i >= 1 && !noSplit && d >= splitD && n - i >= 2 && n - i <= SP_MV && (gIdle > 0 || (gWaitN > 0 && spWanted()))) {
      SPt *s = spAlloc();
      if (s) {
        s->pos = *p; int k = 0; for (int j = i; j < n; j++) { s->mv[k] = L[j]; s->lg[k++] = (short)j; }
        s->n = k; s->depth = d; s->ply = ply; s->root = 0; s->all = 0; s->pv = 0; s->beta = b; s->alpha = a;
        Move bmm = bm; spRun(s, &best, &bmm, 0); bm = bmm;
        if (stopF) return best;
        if (best >= b && ply >= 0 && ply < MAXPLY) killers[ply] = bm;
        break;
      }
      noSplit = 1;
    }
#endif
    int m = L[i];
    if (futile && i >= 3 && any && best > -WINT) continue;
    play(q, p, m);
    int v;
    if (i == 0) v = -search(q, d - 1, -b, -a, ply + 1);
    else {
      int red = v2 && KV_LMR ? lmrOf(p, m, d, i, ply) : (d >= 3 && i >= 5) ? 1 : 0;
      v = -search(q, d - 1 - red, -a - 1, -a, ply + 1);
      if (v > a && (red || v < b)) { play(q, p, m); v = -search(q, d - 1, -b, -a, ply + 1); }
    }
    if (stopF) return any ? best : 0;
    if (v > best) { best = v; any = 1; bm = m; if (v > a) { a = v; if (a >= b) {
      if (ply >= 0 && ply < MAXPLY) killers[ply] = m;
      if (KV_HIST && v2) { const int bo = d * d * 4 > 200 ? 200 : d * d * 4; histAdd(p, m, bo); for (int j = 0; j < nq; j++) histAdd(p, qm[j], -bo); }
      break; } } }
    if (nq < 32) qm[nq++] = m;
  }
  int sv = best > WINT ? best + ply : best < -WINT ? best - ply : best;
  int fl = best <= a0 ? 2 : best >= b ? 1 : 0;
#ifndef MT
  if (useSH) js_shput(p->h1, p->h2, d, sv, fl, bm); else
#endif
  tset(p->h1, p->h2, d, sv, fl, bm);
  return best;
}
#ifdef MT
// ---- Praline's glue (praline_ybw.h)
static inline P *slotP(int ply) { return &ST[ply < MAXPLY ? ply : MAXPLY]; }
static void spLoadPos(const SPt *s, int top, int fresh) { *slotP(s->ply) = s->pos; (void)top; (void)fresh; }
static int spSearch(SPt *s, int i, int a) {
  const int ply = s->ply, b = s->beta, d = s->depth; const Move m = s->mv[i];
  P *p = slotP(ply), *q = slotP(ply + 1);
  play(q, p, m);
  int v;
  if (s->root) v = s->all ? -search(q, d - 1, -WIN - 1, WIN + 1, 1) : -search(q, d - 1, -WIN - 1, -a, 1);   // (the root: as ab_best / ab_values)
  else {
    int red = sv2 && KV_LMR ? lmrOf(p, m, d, s->lg[i], ply) : (d >= 3 && s->lg[i] >= 5) ? 1 : 0;
    v = -search(q, d - 1 - red, -a - 1, -a, ply + 1);
    if (v > a && (red || v < b)) { play(q, p, m); v = -search(q, d - 1, -b, -a, ply + 1); }
  }
  return v;
}
static void spCutoff(const SPt *s, int i) { if (s->ply >= 0 && s->ply < MAXPLY) killers[s->ply] = s->mv[i]; }
static inline int spTop(void) { return 0; }
static void waitCheck(void) { SIM_IDLE(); mtCheck(); }
static void spIdleReset(int fresh) { nodes = 0; tEnd = 1e300; nodeLimit = 1e300; if (fresh) for (int i = 0; i < MAXPLY; i++) killers[i] = 0; }
#include "../shared/praline/praline_ybw.h"
#endif
// the page's entry: the position in SQ / IO (side, ply, h1, h2)
__attribute__((export_name("search"))) int csearch(int d, int a, int b, int ply) {
  P *p = &ST[0];
  for (int i = 0; i < NN; i++) p->sq[i] = SQ[i];
  p->side = IO[8]; p->ply = IO[9]; p->h1 = (u32)IO[10]; p->h2 = (u32)IO[11];
  setMode(0);   // (the page's own searches: the puzzles' proofs, the search before v2)
  return search(p, d, a, b, ply);
}
// ---- the root's loops (2026-11-11: engine.js bestMove / rootValues in C, the same order and counters; on core_mt.wasm the root
// moves split among the threads). The root as for search(): SQ, IO[8…11].
// ab_best(maxD): IO[0] move, IO[1] value, IO[2] depth; ab_values(d): the finished root moves in AOM / AOV best first (a stable
// sort), returns how many. The caller sets the counters (setn) and the killers (kclear) as for a JS bestMove.
int AOM[MAXMV], AOV[MAXMV];
static void abRoot(void) { P *p = &ST[0]; for (int i = 0; i < NN; i++) p->sq[i] = SQ[i]; p->side = IO[8]; p->ply = IO[9]; p->h1 = (u32)IO[10]; p->h2 = (u32)IO[11]; }
static int rootChild(int m, int d, int a, int b) { play(&ST[1], &ST[0], m); return -search(&ST[1], d - 1, a, b, 1); }
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
        SPt *s = spAlloc();
        if (s) { s->pos = ST[0];
          int vals[SP_MV];
          for (int j = 1; j < n; j++) { s->mv[j - 1] = O[j]; s->lg[j - 1] = (short)j; }
          s->n = n - 1; s->depth = d; s->ply = 0; s->root = 1; s->all = 0; s->pv = 1; s->beta = WIN + 1; s->alpha = a;
          Move b2 = bm; spRun(s, &bv, &b2, vals); bm = b2;
          break;
        }
      }
#endif
      int v = rootChild(O[i], d, -WIN - 1, -a);
      if (stopF) break;
      if (!any || v > bv) { bv = v; bm = O[i]; any = 1; if (v > a) a = v; }
    }
    if (stopF && bm < 0) break;
    if (bm >= 0 && (!stopF || bv >= bestV || d == 1)) { bestM = bm; bestV = bv; bestD = d; }   // (as engine.js: a stopped depth only when it is no worse)
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
    SPt *s = spAlloc();
    if (s) { s->pos = ST[0];
      for (int j = 0; j < n; j++) { s->mv[j] = O[j]; s->lg[j] = (short)j; }
      s->n = n; s->depth = d; s->ply = 0; s->root = 1; s->all = 1; s->pv = 1; s->beta = WIN + 1; s->alpha = -WIN - 1;
      int bst = -2147483647; Move b2 = O[0]; spRun(s, &bst, &b2, vals); done = 1;
    }
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
