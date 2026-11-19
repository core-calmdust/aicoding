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
#define NN_H 64         /* the learned evaluation's sizes (below) */
#define NN_H2 16
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
static int gen = 1, tsize = 0, g3lo = 1;
__attribute__((export_name("ttclear"))) void ttclear(void) { gen++; tsize = 0; g3lo = gen; }
static TE *tfind(u32 k) { u32 i = (k * 2654435761u) & (TSZ - 1); for (;;) { TE *e = &T[i]; if (e->gen != gen) return 0; if (e->k == k) return e; i = (i + 1) & (TSZ - 1); } }
// (2026-11-20, search v3 = mode 2) the same memory as 4-way buckets kept from search to search: an entry is valid from the generation
// g3lo on (ttclear), each search a new generation (its age); a bucket replaces the shallowest / oldest entry (claude/konane-spec.md「探索 v3」)
static int sv3T = 0;
static TE *t3find(u32 k) { TE *b = &T[(k * 2654435761u) & (TSZ - 4)]; for (int i = 0; i < 4; i++) if (b[i].gen >= g3lo && b[i].k == k) return &b[i]; return 0; }
static void t3set(u32 k, u32 h2, int d, int v, int f, int m) {
  TE *b = &T[(k * 2654435761u) & (TSZ - 4)], *e = 0; int ws = 1 << 30;
  for (int i = 0; i < 4; i++) {
    if (b[i].gen >= g3lo && b[i].k == k) { e = &b[i]; break; }
    const int sc = b[i].gen < g3lo ? -1000 : b[i].d - (b[i].gen != gen ? 8 : 0);
    if (sc < ws) { ws = sc; e = &b[i]; }
  }
  e->gen = gen; e->k = k; e->h2 = h2; e->d = (signed char)d; e->v = (short)v; e->f = (signed char)f; e->m = m;
}
static void ttnew3(void) { gen++; }   // (a new search: the entries of the searches before get older)
static void tset(u32 k, u32 h2, int d, int v, int f, int m) {
  if (sv3T) { t3set(k, h2, d, v, f, m); return; }
  if (tsize > 700000) ttclear();   // (as the Map: checked before every store)
  TE *e = tfind(k);
  if (!e) {
    u32 i = (k * 2654435761u) & (TSZ - 1); while (T[i].gen == gen) i = (i + 1) & (TSZ - 1);
    e = &T[i]; e->gen = gen; e->k = k; tsize++;
  }
  e->h2 = h2; e->d = (signed char)d; e->v = (short)v; e->f = (signed char)f; e->m = m;
}
// IO[0..4] = found, d, f, v, m — the page reads it (mtKids / mtLazy ordering)
__attribute__((export_name("ttprobe"))) int ttprobe(u32 h1, u32 h2) { TE *e = sv3T ? t3find(h1) : tfind(h1); if (!e || e->h2 != h2) return 0; IO[0] = e->d; IO[1] = e->f; IO[2] = e->v; IO[3] = e->m; return 1; }
static int tlook(u32 h1, u32 h2, int *d, int *f, int *v, int *m) { TE *e = sv3T ? t3find(h1) : tfind(h1); if (!e || e->h2 != h2) return 0; *d = e->d; *f = e->f; *v = e->v; *m = e->m; return 1; }
#else
// (MT) the same Map semantics on one shared table without locks: slot = { kw = h1 | h2 << 32 (0 empty: taken by a CAS), a = depth 8 |
// flag 2 | value 16 | move + 2 14 | h2's low 23 | 1 << 63 }; one thread clears it past 700,000 entries as before, several never mid-search
#define TT_BITS 21
#define TT_CLEAR_N 700000
typedef struct { u64 kw, a; } TTS;
static TTS TTB[1 << TT_BITS];
static volatile int ttCount; static int abExact = 1;
EXPORT(ttclear) void ttclear(void) { for (unsigned i = 0; i < (1u << TT_BITS); i++) { TTB[i].kw = 0; TTB[i].a = 0; } ttCount = 0; }
// (2026-11-18) several threads: Praline's bucket table (praline_tt.h, 4 entries of { key ^ a ^ c, a, c = the search's generation }) in
// the same memory, kept from search to search (the Map's table was cleared past half before a search: the threads' work of the move
// before and PRO's 先読み were lost) — the deeper / newer entries stay. One thread (abExact): the Map semantics as before.
static int ttGen, sv3T = 0;   // sv3T: search v3 (mode 2) — the bucket table with one thread too
#define PLT (!abExact || sv3T)
#define PL_TT_BITS (TT_BITS - 3)
#define PL_TT_WAYS 4
#define PL_TT_WORDS 3
#define PL_TT_IN TTB
#define PL_TT_USED(w, c) ((w) >> 63)
#define PL_TT_SCORE(w, c) (!((w) >> 63) ? -1000 : (int)(signed char)((w) & 255) - ((c) != (u64)ttGen ? 8 : 0))
#include "../shared/praline/praline_tt.h"
static int tlook(u32 h1, u32 h2, int *d, int *f, int *v, int *m) {
  if (PLT) { u64 a, c; if (!plttFind((u64)h1 | (u64)h2 << 32, h1, &a, &c)) return 0;
    if (!(a >> 63) || ((a >> 40) & 0x7FFFFF) != (h2 & 0x7FFFFF)) return 0;
    *d = (int)(signed char)(a & 255); *f = (int)((a >> 8) & 3); *v = (int)(short)(unsigned short)((a >> 10) & 0xFFFF); *m = (int)((a >> 26) & 0x3FFF) - 2;
    return 1;
  }
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
  if (PLT) { int hit; u64 ow, oc; u64 *e = plttSlot((u64)h1 | (u64)h2 << 32, h1, &hit, &ow, &oc); plttWrite(e, (u64)h1 | (u64)h2 << 32, a, (u64)ttGen); return; }
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
static void ttnew3(void) { ttGen = (ttGen + 1) & 255; }
#endif
typedef struct { u64 lo, hi; } BB;
static BB VALID; static unsigned char BITI[MAXN], FOFB[128];
static inline BB bAnd(BB a, BB b) { BB r = { a.lo & b.lo, a.hi & b.hi }; return r; }
static inline BB bOr(BB a, BB b) { BB r = { a.lo | b.lo, a.hi | b.hi }; return r; }
static inline BB bNot(BB a) { BB r = { ~a.lo, ~a.hi }; return r; }
static inline BB bShl(BB a, int n) { BB r = { a.lo << n, (a.hi << n) | (a.lo >> (64 - n)) }; return r; }   // (0 < n < 64)
static inline BB bShr(BB a, int n) { BB r = { (a.lo >> n) | (a.hi << (64 - n)), a.hi >> n }; return r; }
static inline int bAny(BB a) { return (a.lo | a.hi) != 0; }
static inline int bCnt(BB a) { return __builtin_popcountll(a.lo) + __builtin_popcountll(a.hi); }
static inline void bSet(BB *a, int i) { if (i < 64) a->lo |= 1ULL << i; else a->hi |= 1ULL << (i - 64); }
static inline void bClr(BB *a, int i) { if (i < 64) a->lo &= ~(1ULL << i); else a->hi &= ~(1ULL << (i - 64)); }
// one step in the direction d of RAY (0 up, 1 down, 2 left, 3 right); bDirBack: the step against it
static inline BB bDir(BB a, int d) { return d == 0 ? bShr(a, 12) : d == 1 ? bShl(a, 12) : d == 2 ? bShr(a, 1) : bShl(a, 1); }
static inline BB bDirBack(BB a, int d) { return bDir(a, d ^ 1); }
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
  VALID.lo = VALID.hi = 0;
  for (int i = 0; i < NN; i++) { BITI[i] = (unsigned char)((i / N) * 12 + i % N); FOFB[BITI[i]] = (unsigned char)i; bSet(&VALID, BITI[i]); }
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
// (2026-11-13, bitboards: bb[colour - 1] = the colour's stones on a 12-wide board, bit r * 12 + c (two 64-bit halves, up to
// 10×10). The counting functions (mobility, movers) and the move generator's choice of stones work on them; sq[] stays for the
// rest. Same results as the square loops, move order included: claude/konane-spec.md「ビットボード」.)
typedef struct { i8 sq[MAXN]; int side, ply; u32 h1, h2; BB bb[2]; } P;
static void syncBB(P *p) {   // the bitboards from sq[] (a position that came from the page)
  p->bb[0].lo = p->bb[0].hi = p->bb[1].lo = p->bb[1].hi = 0;
  for (int i = 0; i < NN; i++) if (p->sq[i]) bSet(&p->bb[p->sq[i] - 1], BITI[i]);
}
static TLS P ST[MAXPLY + 2];
typedef int Move;
#ifdef MT
// Praline (shared/praline/praline.h): a split point carries the node's position and each move's place in the node's order (LMR)
#define SP_MV 256
#define PL_SP_FIELDS P pos; short lg[SP_MV]; short acc[2][NN_H];
#define stopFlag stopF
#include "../shared/praline/praline.h"
static void spFillAcc(SPt *s, const P *p);   // (the split point carries the node's accumulators: the learned evaluation)
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
// the stones of pl with a first jump (in any direction)
static inline BB moverSet(const P *p, int pl) {
  const BB own = p->bb[pl - 1], opp = p->bb[2 - pl], empty = bAnd(VALID, bNot(bOr(own, opp)));
  BB m = { 0, 0 };
  for (int d = 0; d < 4; d++) m = bOr(m, bAnd(own, bDirBack(bAnd(opp, bDirBack(empty, d)), d)));
  return m;
}
static int jumpsOf(const P *p, int pl, int *out, int n) {
  int o = 3 - pl;
  BB ms = moverSet(p, pl);   // (only the stones that can jump, in the order of the squares)
  for (int half = 0; half < 2; half++) for (u64 w = half ? ms.hi : ms.lo; w; w &= w - 1) {
    const int f = FOFB[__builtin_ctzll(w) + 64 * half];
    for (int d = 0; d < 4; d++) { int *ray = RAY[f][d], L = RAYN[f][d]; for (int k = 1; k < L; k += 2) { if (p->sq[ray[k - 1]] != o || p->sq[ray[k]]) break; out[n++] = f + 128 * ray[k]; } }
  }
  return n;
}
// the number of jumps of pl (every landing square of every stone, multiple jumps in a line included): in each direction the
// stones step over an enemy stone onto an empty square, again and again
static int mobility(const P *p, int pl) {
  const BB own = p->bb[pl - 1], opp = p->bb[2 - pl], empty = bAnd(VALID, bNot(bOr(own, opp)));
  int n = 0;
  for (int d = 0; d < 4; d++) {
    BB cur = own;
    for (;;) { cur = bAnd(bDir(bAnd(bDir(cur, d), opp), d), empty); if (!bAny(cur)) break; n += bCnt(cur); }
  }
  return n;
}
static int movers(const P *p, int pl) { return bCnt(moverSet(p, pl)); }
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
  if (f == t) { q->sq[f] = 0; bClr(&q->bb[x - 1], BITI[f]); q->h1 ^= Z1(x - 1, f); q->h2 ^= Z2(x - 1, f); }
  else {
    int d = dirOf(f, t), *ray = RAY[f][d], L = RAYN[f][d];
    for (int k = 0; k < L; k += 2) {
      int o = ray[k], y = q->sq[o]; q->sq[o] = 0;
      if (y) { bClr(&q->bb[y - 1], BITI[o]); q->h1 ^= Z1(y - 1, o); q->h2 ^= Z2(y - 1, o); }
      if (k + 1 < L && ray[k + 1] == t) break;
    }
    q->sq[f] = 0; q->sq[t] = (i8)x; bClr(&q->bb[x - 1], BITI[f]); bSet(&q->bb[x - 1], BITI[t]);
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
// ---- the learned evaluation (2026-11-20, claude/konane-spec.md「学習した評価」, tools/nnue/): one small net a board size, "KNN1"
// files (net-<rule>.bin.gz, loaded by engine.js only when its NETV has a version). Two views (Black's; White's with the files
// mirrored, so that its own stones stand on the same colour of squares as Black's): the stones (own / the opponent's, 2·NN) ->
// NN_H each (int16 accumulators kept move by move in ACC[ply]), plus at the evaluation one row each for the view's jumps, the
// other side's jumps, the view's stones that can jump and the other side's (buckets, tools/nnue/nnfeat.h) -> clipped ReLU, the
// side to move's view first -> NN_H2 -> 1. Whole numbers only: the same value in WebAssembly and native code.
#define NN_QA 127
#define NN_X 56          /* the count rows: jumps 16 + 16, movers 12 + 12 */
#define NN_INMAX (2 * MAXN + NN_X)
typedef struct { short w1[NN_INMAX * NN_H], b1[NN_H], w2[2 * NN_H * NN_H2], w3[NN_H2]; int b2[NN_H2], b3, k, n; } NNet;
static NNet NETS[3]; static int netOk[3], netUse = 1, nnOn = 0, nnRid = -1;
static unsigned char NETBUF[sizeof(NNet) + 64];
#define RID (N == 8 ? 0 : N == 6 ? 1 : 2)   /* engine.js RULE_ORDER: s8 s6 s10 */
EXPORT(net_buf) unsigned char *net_buf(void) { return NETBUF; }
static int rd16(const unsigned char *b) { return (short)(b[0] | b[1] << 8); }
static int rd32(const unsigned char *b) { return (int)(b[0] | b[1] << 8 | b[2] << 16 | (unsigned)b[3] << 24); }
// net_load(rule, bytes): NETBUF holds a file: "KNN1", u16 inputs, NN_H, NN_H2, the board's size n, i32 k (the evaluation's scale),
// then i16 w1[inputs × NN_H], i16 b1, i16 w2[NN_H2 × 2·NN_H], i32 b2, i16 w3, i32 b3
EXPORT(net_load) int net_load(int r, int len) {
  const unsigned char *b = NETBUF; static const int SZ[3] = { 8, 6, 10 };
  if (r < 0 || r > 2 || len < 16 || b[0] != 'K' || b[1] != 'N' || b[2] != 'N' || b[3] != '1') return 0;
  const int n = SZ[r], nin = 2 * n * n + NN_X;
  if (rd16(b + 4) != nin || rd16(b + 6) != NN_H || rd16(b + 8) != NN_H2 || rd16(b + 10) != n) return 0;
  if (len < 16 + 2 * (nin * NN_H + NN_H + 2 * NN_H * NN_H2) + 4 * NN_H2 + 2 * NN_H2 + 4) return 0;
  NNet *Q = &NETS[r]; int o = 16; Q->k = rd32(b + 12); Q->n = n;
  for (int i = 0; i < nin * NN_H; i++, o += 2) Q->w1[i] = (short)rd16(b + o);
  for (int i = 0; i < NN_H; i++, o += 2) Q->b1[i] = (short)rd16(b + o);
  for (int i = 0; i < 2 * NN_H * NN_H2; i++, o += 2) Q->w2[i] = (short)rd16(b + o);
  for (int i = 0; i < NN_H2; i++, o += 4) Q->b2[i] = rd32(b + o);
  for (int i = 0; i < NN_H2; i++, o += 2) Q->w3[i] = (short)rd16(b + o);
  Q->b3 = rd32(b + o);
  netOk[r] = 1; nnRid = -1; return 1;
}
EXPORT(net_use) void net_use(int on) { netUse = on; }   // (0: the hand evaluation even with a net — for measuring)
EXPORT(net_ok) int net_ok(int r) { return r >= 0 && r < 3 && netOk[r]; }
static TLS short ACC[MAXPLY + 2][2][NN_H];
static inline int nnSq(int c, int s) { return c ? (s / N) * N + (N - 1 - s % N) : s; }   // (White's view: the files mirrored)
static inline const short *nnRow(const NNet *Q, int c, int col, int s) { return Q->w1 + ((col == c ? 0 : NN) + nnSq(c, s)) * NN_H; }
static void accFull(const P *p, short (*a)[NN_H]) {
  const NNet *Q = &NETS[RID];
  for (int c = 0; c < 2; c++) {
    for (int i = 0; i < NN_H; i++) a[c][i] = Q->b1[i];
    for (int s = 0; s < NN; s++) if (p->sq[s]) { const short *W = nnRow(Q, c, p->sq[s] - 1, s); for (int i = 0; i < NN_H; i++) a[c][i] += W[i]; }
  }
}
// ACC[dst] = ACC[src] after move m of position p (p before the move)
static void accMove(int dst, int src, const P *p, int m) {
  const NNet *Q = &NETS[RID]; const int f = m % 128, t = m / 128, x = p->sq[f] - 1;
  int rm[MAXN / 2 + 2], nr = 0;   // the jumped stones
  if (f != t) { const int d = dirOf(f, t), *ray = RAY[f][d], L = RAYN[f][d]; for (int k = 0; k < L; k += 2) { rm[nr++] = ray[k]; if (k + 1 < L && ray[k + 1] == t) break; } }
  for (int c = 0; c < 2; c++) {
    const short *s = ACC[src][c]; short *dd = ACC[dst][c], *A = (short *)nnRow(Q, c, x, f);
    if (f == t) { for (int i = 0; i < NN_H; i++) dd[i] = (short)(s[i] - A[i]); continue; }
    const short *B = nnRow(Q, c, x, t);
    for (int i = 0; i < NN_H; i++) dd[i] = (short)(s[i] - A[i] + B[i]);
    for (int j = 0; j < nr; j++) { const short *R = nnRow(Q, c, 1 - x, rm[j]); for (int i = 0; i < NN_H; i++) dd[i] = (short)(dd[i] - R[i]); }
  }
}
static inline int nnMb(int x) { return x < 12 ? x : x < 14 ? 12 : x < 17 ? 13 : x < 21 ? 14 : 15; }
static inline int nnVb(int x) { return x < 10 ? x : x < 13 ? 10 : 11; }
// the value for the side to move, from the accumulators a (both views) of position p and the counts (jumps, stones that jump)
static int nnEval(const P *p, short (*a)[NN_H], const int *mob, const int *mov) {
  const NNet *Q = &NETS[RID]; unsigned char x[2 * NN_H]; const int X = 2 * NN;
  for (int k = 0; k < 2; k++) {
    const int c = k ? 1 - p->side : p->side, o = 1 - c;
    const short *R0 = Q->w1 + (X + nnMb(mob[c])) * NN_H, *R1 = Q->w1 + (X + 16 + nnMb(mob[o])) * NN_H,
      *R2 = Q->w1 + (X + 32 + nnVb(mov[c])) * NN_H, *R3 = Q->w1 + (X + 44 + nnVb(mov[o])) * NN_H;
    for (int i = 0; i < NN_H; i++) { int v = a[c][i] + R0[i] + R1[i] + R2[i] + R3[i]; x[k * NN_H + i] = (unsigned char)(v < 0 ? 0 : v > NN_QA ? NN_QA : v); }
  }
  long long out = Q->b3;
  for (int j = 0; j < NN_H2; j++) {
    int h = Q->b2[j]; const short *W = Q->w2 + j * 2 * NN_H;
    for (int i = 0; i < 2 * NN_H; i++) h += x[i] * W[i];
    h >>= 6; if (h < 0) h = 0; else if (h > NN_QA) h = NN_QA;
    out += (long long)h * Q->w3[j];
  }
  long long v = out * Q->k / (NN_QA * 64);
  return v > 20000 ? 20000 : v < -20000 ? -20000 : (int)v;
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
// (2026-11-20) modes: 0 the search before v2, 1 v2, 2 v3 (v2 + the bucket table kept between searches, the root's PVS and
// aspiration window, the learned evaluation when the board's net is loaded). A change of mode or of the evaluation clears the table.
#ifndef KV_TT3
#define KV_TT3 1
#endif
static void setMode(int v) {
  if (!lmrInit) initLmr(); v = v < 0 ? 0 : v > 2 ? 2 : v;
  const int nn = v == 2 && netOk[RID] && netUse;
  if (v != sv2 || nn != nnOn || RID != nnRid) { sv2 = v; sv3T = v == 2 && KV_TT3; nnOn = nn; nnRid = RID; ttclear(); }
}
// the evaluation of p (a position of the stack ST: its accumulators are ACC at the same place) and a move with them
static long long nnChecked = 0, nnBad = 0;
static inline int evalP(const P *p) {
  if (!nnOn) return evaluate(p);
  if (p->ply < 2) return 0;
  const int mob[2] = { mobility(p, 1), mobility(p, 2) }, mov[2] = { movers(p, 1), movers(p, 2) };
  if (!mob[p->side]) return -WIN + 1;
#ifdef NN_DEBUG   // (tools/nnue/kn.c nncheck: every evaluation's accumulators against ones made from the whole board)
  { short f[2][NN_H]; accFull(p, f); nnChecked++;
    for (int c = 0; c < 2; c++) for (int i = 0; i < NN_H; i++) if (f[c][i] != ACC[p - ST][c][i]) { nnBad++; c = 2; break; } }
#endif
  return nnEval(p, ACC[p - ST], mob, mov);
}
static inline void playN(P *q, const P *p, int m) { if (nnOn) accMove((int)(q - ST), (int)(p - ST), p, m); play(q, p, m); }   // (the accumulators first: q may be p at the stack's end)
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
  if (d <= 0) return evalP(p);
  const int v2 = sv2; int futile = 0;
  if (v2 && b - a == 1 && a > -WINT && b < WINT && ply > 0 && p->ply >= 2) {
    const int stat = evalP(p);
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
        s->pos = *p; spFillAcc(s, p); int k = 0; for (int j = i; j < n; j++) { s->mv[k] = L[j]; s->lg[k++] = (short)j; }
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
    playN(q, p, m);
    int v;
    if (i == 0) v = -search(q, d - 1, -b, -a, ply + 1);
    else {
      int red = v2 && KV_LMR ? lmrOf(p, m, d, i, ply) : (d >= 3 && i >= 5) ? 1 : 0;
      v = -search(q, d - 1 - red, -a - 1, -a, ply + 1);
      if (v > a && (red || v < b)) { playN(q, p, m); v = -search(q, d - 1, -b, -a, ply + 1); }
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
static void spLoadPos(const SPt *s, int top, int fresh) {
  P *p = slotP(s->ply); *p = s->pos;
  if (nnOn) { const int k = (int)(p - ST); for (int c = 0; c < 2; c++) for (int i = 0; i < NN_H; i++) ACC[k][c][i] = s->acc[c][i]; }
  (void)top; (void)fresh;
}
static void spFillAcc(SPt *s, const P *p) { if (nnOn) { const int k = (int)(p - ST); for (int c = 0; c < 2; c++) for (int i = 0; i < NN_H; i++) s->acc[c][i] = ACC[k][c][i]; } }
static int spSearch(SPt *s, int i, int a) {
  const int ply = s->ply, b = s->beta, d = s->depth; const Move m = s->mv[i];
  P *p = slotP(ply), *q = slotP(ply + 1);
  playN(q, p, m);
  int v;
  if (s->root) {
    if (s->all) v = -search(q, d - 1, -WIN - 1, WIN + 1, 1);
    else if (sv2 == 2) { v = -search(q, d - 1, -a - 1, -a, 1); if (v > a && v < b && !stopF) v = -search(q, d - 1, -b, -a, 1); }   // (v3: PVS in the aspiration window)
    else v = -search(q, d - 1, -WIN - 1, -a, 1);   // (the root: as ab_best / ab_values)
  }
  else {
    int red = sv2 && KV_LMR ? lmrOf(p, m, d, s->lg[i], ply) : (d >= 3 && s->lg[i] >= 5) ? 1 : 0;
    v = -search(q, d - 1 - red, -a - 1, -a, ply + 1);
    if (v > a && (red || v < b)) { playN(q, p, m); v = -search(q, d - 1, -b, -a, ply + 1); }
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
  syncBB(p);
  p->side = IO[8]; p->ply = IO[9]; p->h1 = (u32)IO[10]; p->h2 = (u32)IO[11];
  setMode(0);   // (the page's own searches: the puzzles' proofs, the search before v2)
  return search(p, d, a, b, ply);
}
// ---- the root's loops (2026-11-11: engine.js bestMove / rootValues in C, the same order and counters; on core_mt.wasm the root
// moves split among the threads). The root as for search(): SQ, IO[8…11].
// ab_best(maxD): IO[0] move, IO[1] value, IO[2] depth; ab_values(d): the finished root moves in AOM / AOV best first (a stable
// sort), returns how many. The caller sets the counters (setn) and the killers (kclear) as for a JS bestMove.
int AOM[MAXMV], AOV[MAXMV];
static void abRoot(void) { P *p = &ST[0]; for (int i = 0; i < NN; i++) p->sq[i] = SQ[i]; syncBB(p); p->side = IO[8]; p->ply = IO[9]; p->h1 = (u32)IO[10]; p->h2 = (u32)IO[11]; if (nnOn) accFull(p, ACC[0]); }
static int rootChild(int m, int d, int a, int b) { playN(&ST[1], &ST[0], m); return -search(&ST[1], d - 1, a, b, 1); }
EXPORT(ab_best3) void ab_best3(int maxD, int mode);
EXPORT(ab_best) void ab_best(int maxD) { ab_best3(maxD, 1); }
static void ab_best_v3(int maxD);
void ab_best3(int maxD, int mode) {
  setMode(mode);
  if (sv2 == 2) { ab_best_v3(maxD); return; }
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
        if (s) { s->pos = ST[0]; spFillAcc(s, &ST[0]);
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
// (2026-11-20) v3's root: iterative deepening with an aspiration window around the last depth's value (±ASP_W, widened ×2 on
// a fail; a fail high keeps its move), the first move with the window, the others by a null window first (PVS)
#ifndef ASP_W
#define ASP_W 40
#endif
#ifndef KV_ASP
#define KV_ASP 1
#endif
static void ab_best_v3(int maxD) {
  ttnew3();
  abRoot();
  int G[MAXMV], n = genMoves(&ST[0], G), O[MAXMV];
  for (int i = 0; i < n; i++) O[i] = G[i];
  orderMoves(&ST[0], O, n, -1, 0);
  int bestM = n ? O[0] : -1, bestV = 0, bestD = 0;
  for (int d = 1; d <= maxD; d++) {
    int delta = ASP_W, lo = -WIN - 1, hi = WIN + 1, fin = 0;
    if (KV_ASP && d >= 4 && bestV > -WINT && bestV < WINT) { lo = bestV - delta; hi = bestV + delta; }
    for (;;) {
      int a = lo, bm = -1, bv = -WIN - 1, any = 0;
      for (int i = 0; i < n; i++) O[i] = G[i];
      orderMoves(&ST[0], O, n, bestM, 0);
      for (int i = 0; i < n; i++) {
#ifdef MT
        if (i == 1 && n - 1 >= 2 && n - 1 <= SP_MV && d >= splitD && gIdle > 0) {   // YBW at the root: the first move is done
          SPt *s = spAlloc();
          if (s) { s->pos = ST[0]; spFillAcc(s, &ST[0]);
            int vals[SP_MV];
            for (int j = 1; j < n; j++) { s->mv[j - 1] = O[j]; s->lg[j - 1] = (short)j; }
            s->n = n - 1; s->depth = d; s->ply = 0; s->root = 1; s->all = 0; s->pv = 1; s->beta = hi; s->alpha = a;
            Move b2 = bm; int bv2 = bv; spRun(s, &bv2, &b2, vals); if (bv2 > bv) { bv = bv2; bm = b2; }
            break;
          }
        }
#endif
        int v;
        if (i == 0) v = rootChild(O[i], d, -hi, -a);
        else { v = rootChild(O[i], d, -a - 1, -a); if (v > a && v < hi && !stopF) v = rootChild(O[i], d, -hi, -a); }
        if (stopF) break;
        if (!any || v > bv) { bv = v; bm = O[i]; any = 1; if (v > a) { a = v; if (a >= hi) break; } }
      }
      if (stopF) { if (bm >= 0 && bv > lo) { bestM = bm; bestV = bv; bestD = d; } break; }   // (a move better than the window's low end: keep it)
      if (bv <= lo && lo > -WIN - 1) { delta *= 2; lo = bv - delta < -WIN - 1 ? -WIN - 1 : bv - delta; continue; }   // fail low: search again lower
      if (bv >= hi && hi < WIN + 1) { bestM = bm; delta *= 2; hi = bv + delta > WIN + 1 ? WIN + 1 : bv + delta; continue; }   // fail high: the move stays first
      bestM = bm; bestV = bv; bestD = d; fin = 1; break;
    }
    if (stopF || !fin) break;
    if (bestV > 29000 || bestV < -29000) break;
  }
  IO[0] = bestM; IO[1] = bestV; IO[2] = bestD;
}
EXPORT(ab_values2) int ab_values2(int d, int v2);
EXPORT(ab_values) int ab_values(int d) { return ab_values2(d, 0); }
int ab_values2(int d, int v2) {   // v2 = 1 / 2: the analysis (search v2 / v3); 0: the levels by depth, the resistance (as before)
  setMode(v2);
  if (sv2 == 2 && d == 1) ttnew3();   // (v3: a new analysis, a new generation)
  abRoot();
  int O[MAXMV], n = genMoves(&ST[0], O), vals[MAXMV], k = 0;
  orderMoves(&ST[0], O, n, -1, 0);
  for (int i = 0; i < n; i++) vals[i] = -2147483647;
#ifdef MT
  int done = 0;
  if (n >= 2 && n <= SP_MV && d >= splitD && gIdle > 0) {   // every root move with the full window: split from the first
    SPt *s = spAlloc();
    if (s) { s->pos = ST[0]; spFillAcc(s, &ST[0]);
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
// (2026-11-20, the native tools tools/nnue/kn.c) the root (as ab_best): its moves into AOM, its evaluation (the mode's: the net when on)
EXPORT(ab_moves) int ab_moves(void) { abRoot(); return genMoves(&ST[0], AOM); }
EXPORT(ab_eval) int ab_eval(int mode) { setMode(mode); abRoot(); return evalP(&ST[0]); }
EXPORT(nn_checked) double nn_checked(void) { return (double)nnChecked; }
EXPORT(nn_bad) double nn_bad(void) { return (double)nnBad; }
EXPORT(aomp) int *aomp(void) { return AOM; }
EXPORT(aovp) int *aovp(void) { return AOV; }
#ifdef MT
// ---- the threads (core_mt.wasm: shared/mtengine.js, the lead engine.js?…&mt=1, the helpers mt-helper.js)
EXPORT(ab_threads) void ab_threads(int n) { const int ex = n <= 1; if (ex != abExact) ttclear(); abExact = ex; if (!ex) ttGen = (ttGen + 1) & 255; }   // (2026-11-18: the two tables share the memory: cleared when the mode changes; several threads: a new generation a search)
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
