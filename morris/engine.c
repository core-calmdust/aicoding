// Nine Men's Morris search engine in C (compiled to WebAssembly) — a port of the search in engine.js.
// Rules, evaluation and search mirror engine.js: negamax alpha-beta (PVS) with a transposition table,
// killer/history ordering, quiescence on captures, repetition and 50-move draws, mate-distance pruning.
// Optional: endgame databases (retrograde-solved, loaded by the host) for nine men's morris.
//
// Build: clang --target=wasm32 -O3 -nostdlib -fno-builtin -Wl,--no-entry -Wl,--export-dynamic
//        -Wl,--initial-memory=...,--max-memory=... -o engine.wasm engine.c
// Host protocol (all through the shared buffer at io_ptr()):
//   geometry(n, pieces, fly, nmills, mills[3*k]..., nextra, extra[2*k]...)  -> set_geometry()
//   setup: b[n], hand1, hand2, side, quiet, nmoves, moves...                  -> setup()
//   results are written back to io as int32 values.
#include <stdint.h>
// MT (engine_mt.wasm, see the build line below): several threads search one root together on a shared memory ("Lazy SMP");
// the state of one search is thread-local (TLS), the geometry, the evaluation weights, the endgame databases and the
// transposition table are shared. Without it TLS is nothing and engine.wasm stays byte for byte as before.
// Build (MT): clang --target=wasm32 -O3 -matomics -mbulk-memory -DMT -nostdlib -fno-builtin -Wl,--no-entry -Wl,--export-dynamic
//        -Wl,--shared-memory -Wl,--import-memory -Wl,--max-memory=1073741824 -o engine_mt.wasm engine.c
#ifdef MT
#define TLS _Thread_local
#else
#define TLS
#endif
#define EXPORT(name) __attribute__((export_name(#name)))
#define IMPORT(name) __attribute__((import_module("env"), import_name(#name)))
IMPORT(now) double now(void);
IMPORT(progress) void progress(int depth, int count);

typedef int32_t i32; typedef uint32_t u32; typedef int8_t i8; typedef uint8_t u8;
#define NONE 31
#define WIN 30000
#define WINT 29000
#define INF 32000
#define QUIET_DRAW 50
#define MAXPLY 96
#define MAXMV 1200
// late move reductions (on by default; -DNO_LMR to disable)
#ifndef NO_LMR
#define LMR 1
#endif
#ifndef LMR_D
#define LMR_D 3
#define LMR_I 3
#define LMR_I2 8
#endif

static TLS i32 IO[8192];
EXPORT(io_ptr) i32 *io_ptr(void) { return IO; }

// ---------------------------------------------------------------- geometry
static int N, PIECES, FLY, NM;
static int mills[24][3];
static int adjn[24], adjv[24][8];
static int prn[24], pr[24][16];          // pairs of mill partners per point
static u32 millMask[24], adjMask[24], millAdj[24], ALL, DEG[5];
static int ptMn[24]; static u32 ptMm[24][4];
static u32 zp[3][24], zp2[3][24], zh[3][16], zh2[3][16], zs, zs2;
static u32 rs = 0x9e3779b9u;
static u32 rnd(void) { rs ^= rs << 13; rs ^= rs >> 17; rs ^= rs << 5; return rs; }
static void link(int a, int b) { for (int k = 0; k < adjn[a]; k++) if (adjv[a][k] == b) return; adjv[a][adjn[a]++] = b; adjv[b][adjn[b]++] = a; }
#ifdef MT
static volatile int geoKey;   // the geometry in force (shared): a helper thread waits for the job's before it searches
EXPORT(geo_key) int geo_key(void) { return __atomic_load_n(&geoKey, __ATOMIC_SEQ_CST); }
#endif
EXPORT(set_geometry) void set_geometry(void) {
  int k = 0; N = IO[k++]; PIECES = IO[k++]; FLY = IO[k++]; NM = IO[k++];
  for (int i = 0; i < N; i++) { adjn[i] = 0; prn[i] = 0; }
  for (int m = 0; m < NM; m++) { mills[m][0] = IO[k++]; mills[m][1] = IO[k++]; mills[m][2] = IO[k++]; }
  for (int m = 0; m < NM; m++) { link(mills[m][0], mills[m][1]); link(mills[m][1], mills[m][2]); }
  int ne = IO[k++]; for (int e = 0; e < ne; e++) { int a = IO[k++], b = IO[k++]; link(a, b); }
  for (int m = 0; m < NM; m++) for (int j = 0; j < 3; j++) { int p = mills[m][j]; int o[2], c = 0; for (int q = 0; q < 3; q++) if (q != j) o[c++] = mills[m][q]; pr[p][prn[p]++] = o[0]; pr[p][prn[p]++] = o[1]; }
  ALL = N == 32 ? 0xFFFFFFFFu : (1u << N) - 1; for (int d = 0; d < 5; d++) DEG[d] = 0;
  for (int i = 0; i < N; i++) { adjMask[i] = 0; for (int j = 0; j < adjn[i]; j++) adjMask[i] |= 1u << adjv[i][j]; ptMn[i] = 0; if (adjn[i] < 5) DEG[adjn[i]] |= 1u << i; }
  for (int m = 0; m < NM; m++) { u32 mm = (1u << mills[m][0]) | (1u << mills[m][1]) | (1u << mills[m][2]); millMask[m] = mm; millAdj[m] = adjMask[mills[m][0]] | adjMask[mills[m][1]] | adjMask[mills[m][2]];
    for (int j = 0; j < 3; j++) { int p = mills[m][j]; ptMm[p][ptMn[p]++] = mm; } }
  rs = 0x9e3779b9u ^ (u32)(N * 7919);
  for (int s = 0; s < 3; s++) for (int i = 0; i < 24; i++) { zp[s][i] = rnd(); zp2[s][i] = rnd(); }
  for (int s = 0; s < 3; s++) for (int i = 0; i < 16; i++) { zh[s][i] = rnd(); zh2[s][i] = rnd(); }
  zs = rnd(); zs2 = rnd();
#ifdef MT
  __atomic_store_n(&geoKey, N | PIECES << 5 | FLY << 10 | NM << 11 | ne << 17, __ATOMIC_SEQ_CST);   // (last: the helpers wait for it)
#endif
}

// ---------------------------------------------------------------- position
typedef struct { i8 b[24]; u32 bb[3]; i8 hand[3], cnt[3]; int side, quiet; u32 h1, h2; int stk[MAXPLY + 1024]; int sp; } Pos;
static TLS Pos P;
static void rehash(Pos *p) {
  u32 a = 0, b = 0;
  for (int i = 0; i < N; i++) if (p->b[i]) { a ^= zp[(int)p->b[i]][i]; b ^= zp2[(int)p->b[i]][i]; }
  for (int s = 1; s <= 2; s++) { a ^= zh[s][(int)p->hand[s]]; b ^= zh2[s][(int)p->hand[s]]; }
  if (p->side == 2) { a ^= zs; b ^= zs2; }
  p->h1 = a; p->h2 = b;
}
static inline int inMill(const Pos *p, int i) {
  int v = p->b[i]; if (!v) return 0; u32 B = p->bb[v];
  for (int k = 0; k < ptMn[i]; k++) if ((B & ptMm[i][k]) == ptMm[i][k]) return 1;
  return 0;
}
static inline int closes(const Pos *p, int s, int f, int t) {
  u32 B = p->bb[s] & ~(1u << f), tb = 1u << t;
  for (int k = 0; k < ptMn[t]; k++) { u32 mt = ptMm[t][k] & ~tb; if ((B & mt) == mt) return 1; }
  return 0;
}
static int removable(const Pos *p, int o, int *out) {
  u32 B = p->bb[o], inm = 0;
  for (int m = 0; m < NM; m++) if ((B & millMask[m]) == millMask[m]) inm |= millMask[m];
  u32 R = B & ~inm; if (!R) R = B;
  int k = 0; while (R) { out[k++] = __builtin_ctz(R); R &= R - 1; }
  return k;
}
static int gen(const Pos *p, int *out) {
  int s = p->side, o = 3 - s, k = 0, nr = -1, rem[24];
#define ADD(f, t) do { if (p->cnt[o] > 0 && closes(p, s, f, t)) { if (nr < 0) nr = removable(p, o, rem); for (int j = 0; j < nr; j++) out[k++] = (f) | ((t) << 5) | (rem[j] << 10); } else out[k++] = (f) | ((t) << 5) | (NONE << 10); } while (0)
  u32 E = ALL & ~(p->bb[1] | p->bb[2]);
  if (p->hand[s] > 0) { for (u32 T = E; T; T &= T - 1) { int t = __builtin_ctz(T); ADD(NONE, t); } }
  else if (FLY && p->cnt[s] == 3) { for (u32 F = p->bb[s]; F; F &= F - 1) { int f = __builtin_ctz(F); for (u32 T = E; T; T &= T - 1) { int t = __builtin_ctz(T); ADD(f, t); } } }
  else { for (u32 F = p->bb[s]; F; F &= F - 1) { int f = __builtin_ctz(F); for (int j = 0; j < adjn[f]; j++) { int t = adjv[f][j]; if (!p->b[t]) ADD(f, t); } } }
#undef ADD
  return k;
}
// capture moves only (same order as gen), and whether the side to move has any move at all
static int genCaps(const Pos *p, int *out, int *any) {
  int s = p->side, o = 3 - s, k = 0, nr = -1, rem[24];
  u32 E = ALL & ~(p->bb[1] | p->bb[2]);
#define CAP(f, t) do { if (closes(p, s, f, t)) { if (nr < 0) nr = removable(p, o, rem); for (int j = 0; j < nr; j++) out[k++] = (f) | ((t) << 5) | (rem[j] << 10); } } while (0)
  if (p->hand[s] > 0) { *any = E != 0; if (p->cnt[o] > 0) for (u32 T = E; T; T &= T - 1) { int t = __builtin_ctz(T); CAP(NONE, t); } }
  else if (FLY && p->cnt[s] == 3) { *any = E != 0; if (p->cnt[o] > 0) for (u32 F = p->bb[s]; F; F &= F - 1) { int f = __builtin_ctz(F); for (u32 T = E; T; T &= T - 1) { int t = __builtin_ctz(T); CAP(f, t); } } }
  else {
    int a = 0;
    for (u32 F = p->bb[s]; F; F &= F - 1) { int f = __builtin_ctz(F); if (adjMask[f] & E) { a = 1; if (p->cnt[o] > 0) for (int j = 0; j < adjn[f]; j++) { int t = adjv[f][j]; if (!p->b[t]) CAP(f, t); } } }
    *any = a;
  }
#undef CAP
  return k;
}
static void play(Pos *p, int m) {
  int s = p->side, o = 3 - s, f = m & 31, t = (m >> 5) & 31, r = (m >> 10) & 31;
  p->stk[p->sp++] = p->quiet;
  if (f == NONE) { p->h1 ^= zh[s][(int)p->hand[s]]; p->h2 ^= zh2[s][(int)p->hand[s]]; p->hand[s]--; p->cnt[s]++; p->h1 ^= zh[s][(int)p->hand[s]]; p->h2 ^= zh2[s][(int)p->hand[s]]; }
  else { p->b[f] = 0; p->bb[s] &= ~(1u << f); p->h1 ^= zp[s][f]; p->h2 ^= zp2[s][f]; }
  p->b[t] = s; p->bb[s] |= 1u << t; p->h1 ^= zp[s][t]; p->h2 ^= zp2[s][t];
  if (r != NONE) { p->b[r] = 0; p->bb[o] &= ~(1u << r); p->cnt[o]--; p->h1 ^= zp[o][r]; p->h2 ^= zp2[o][r]; }
  p->quiet = (f == NONE || r != NONE) ? 0 : p->quiet + 1;
  p->side = o; p->h1 ^= zs; p->h2 ^= zs2;
}
static void undo(Pos *p, int m) {
  int o = p->side, s = 3 - o, f = m & 31, t = (m >> 5) & 31, r = (m >> 10) & 31;
  p->side = s; p->h1 ^= zs; p->h2 ^= zs2;
  if (r != NONE) { p->b[r] = o; p->bb[o] |= 1u << r; p->cnt[o]++; p->h1 ^= zp[o][r]; p->h2 ^= zp2[o][r]; }
  p->b[t] = 0; p->bb[s] &= ~(1u << t); p->h1 ^= zp[s][t]; p->h2 ^= zp2[s][t];
  if (f == NONE) { p->h1 ^= zh[s][(int)p->hand[s]]; p->h2 ^= zh2[s][(int)p->hand[s]]; p->hand[s]++; p->cnt[s]--; p->h1 ^= zh[s][(int)p->hand[s]]; p->h2 ^= zh2[s][(int)p->hand[s]]; }
  else { p->b[f] = s; p->bb[s] |= 1u << f; p->h1 ^= zp[s][f]; p->h2 ^= zp2[s][f]; }
  p->quiet = p->stk[--p->sp];
}

// ---------------------------------------------------------------- endgame databases (nine, moving phase)
// class m-o (side to move m pieces, opponent o): dense byte arrays or sparse (sorted u32 index + byte)
typedef struct { const u8 *dense; const u32 *idx; const u8 *val; u32 n; } EG;
static EG egdb[10][10]; static int egOn = 0;
static u32 CB[25][25];
extern unsigned char __heap_base;
EXPORT(heap_ptr) u8 *heap_ptr(void) { return &__heap_base; }
// register a class whose data was copied by the host to ptr
EXPORT(eg_add) void eg_add(int m, int o, int type, u32 n, u8 *ptr) {
  if (!CB[0][0]) for (int a = 0; a <= 24; a++) { CB[a][0] = 1; for (int k = 1; k <= a; k++) CB[a][k] = CB[a - 1][k - 1] + (k <= a - 1 ? CB[a - 1][k] : 0); }
  EG *e = &egdb[m][o]; e->n = n;
  if (type == 0) e->dense = ptr; else { e->idx = (const u32 *)ptr; e->val = ptr + 4 * (u32)n; }
  egOn = 1;
}
static int egProbe(const Pos *p) {
  if (!egOn || N != 24 || p->hand[1] || p->hand[2]) return -1;
  int s = p->side, m = p->cnt[s], o = p->cnt[3 - s];
  if (m > 9 || o > 9) return -1;
  EG *e = &egdb[m][o]; if (!e->dense && !e->idx) return -1;
  u32 ra = 0, rb = 0; int ia = 0, ib = 0, j = 0;
  for (int q = 0; q < 24; q++) { int v = p->b[q]; if (v == s) { ia++; if (q >= ia) ra += CB[q][ia]; } else { if (v) { ib++; if (j >= ib) rb += CB[j][ib]; } j++; } }
  u32 id = ra * CB[24 - m][o] + rb;
  if (e->dense) return e->dense[id];
  int lo = 0, hi = (int)e->n - 1;
  while (lo <= hi) { int mid = (lo + hi) >> 1; u32 x = e->idx[mid]; if (x == id) return e->val[mid]; if (x < id) lo = mid + 1; else hi = mid - 1; }
  return 0;
}
static inline int egScore(int v, int ply) { return v == 0 ? 0 : v < 128 ? WIN - ply - v : -(WIN - ply - (v - 128)); }

// ---------------------------------------------------------------- evaluation (side to move), same as engine.js
// learned evaluation for nine men's morris (optional): 71 inputs -> H ReLU -> 1, weights set by the host
#define NET_HMAX 128
static float NETW[71 * NET_HMAX + 2 * NET_HMAX + 1]; static int netH = 0;
EXPORT(net_ptr) float *net_ptr(void) { return NETW; }
EXPORT(net_on) void net_on(int h) { netH = h; }
static int netEval(const Pos *p) {
  int H = netH, s = p->side, o = 3 - s; const float *W1 = NETW, *B1 = NETW + 71 * H, *W2 = B1 + H; float b2 = W2[H];
  float acc[NET_HMAX];
  for (int k = 0; k < H; k++) acc[k] = B1[k];
#define ADDR(r) do { const float *w = W1 + (r) * H; for (int k = 0; k < H; k++) acc[k] += w[k]; } while (0)
  for (u32 x = p->bb[s]; x; x &= x - 1) ADDR(__builtin_ctz(x));
  for (u32 x = p->bb[o]; x; x &= x - 1) ADDR(24 + __builtin_ctz(x));
  ADDR(48 + p->hand[s]); ADDR(58 + p->hand[o]);
  if (!p->hand[s] && p->cnt[s] == 3) ADDR(68);
  if (!p->hand[o] && p->cnt[o] == 3) ADDR(69);
  if (p->hand[s] || p->hand[o]) ADDR(70);
#undef ADDR
  float out = b2; for (int k = 0; k < H; k++) if (acc[k] > 0) out += acc[k] * W2[k];
  int v = (int)(out * 200.0f + (out >= 0 ? 0.5f : -0.5f));
  return v > 20000 ? 20000 : v < -20000 ? -20000 : v;
}
static int evaluate(const Pos *p) {
  if (netH && N == 24 && NM == 16) return netEval(p);
  int s = p->side, o = 3 - s; u32 S = p->bb[s], O = p->bb[o], E = ALL & ~(S | O);
  int sc = 100 * ((p->cnt[s] + p->hand[s]) - (p->cnt[o] + p->hand[o]));
  int placing = p->hand[1] > 0 || p->hand[2] > 0;
  int flyP = FLY && !p->hand[s] && p->cnt[s] == 3, flyO = FLY && !p->hand[o] && p->cnt[o] == 3;
  int thrO = 0, thrP = 0;
  for (int k = 0; k < NM; k++) {
    u32 mm = millMask[k]; int np = __builtin_popcount(S & mm), no = __builtin_popcount(O & mm);
    if (np + no == 2 && (np == 2 || no == 2)) {
      int who = np == 2 ? s : o, sg = who == s ? 1 : -1;
      int nw = 0;
      if (p->hand[who] > 0 || (who == s ? flyP : flyO)) nw = 1;
      else if (!placing) { int e = __builtin_ctz(mm & E); if (adjMask[e] & p->bb[who] & ~mm) nw = 1; }
      if (nw) { if (who == s) thrP++; else thrO++; }
      sc += sg * (nw ? 24 : placing ? 6 : 7);
    } else if (np == 3 || no == 3) {
      int sg = np == 3 ? 1 : -1;
      if (placing) sc += sg * 8;
      else sc += sg * ((millAdj[k] & E) ? 22 : 10);
    }
  }
  if (thrO >= 2) sc -= 85; else if (thrO == 1) sc -= 18;
  if (thrP) sc += 20;
  if (placing) {
    int dp = 0; for (int d = 1; d < 5; d++) dp += d * (__builtin_popcount(S & DEG[d]) - __builtin_popcount(O & DEG[d]));
    sc += 4 * dp;
  } else {
    int mp = 0, mo = 0;
    for (u32 x = S; x; x &= x - 1) mp += __builtin_popcount(adjMask[__builtin_ctz(x)] & E);
    for (u32 x = O; x; x &= x - 1) mo += __builtin_popcount(adjMask[__builtin_ctz(x)] & E);
    if (!flyP) sc += 5 * mp - (mp == 0 ? 400 : mp == 1 ? 40 : 0);
    if (!flyO) sc -= 5 * mo - (mo == 0 ? 300 : mo == 1 ? 30 : 0);
  }
  return sc;
}

// ---------------------------------------------------------------- search
#define TT_BITS 20
#define TT_SIZE (1 << TT_BITS)
#define TT_MASK (TT_SIZE - 1)
static u32 tk1[TT_SIZE], tk2[TT_SIZE]; static int16_t tv[TT_SIZE]; static i32 tmv[TT_SIZE]; static i8 td[TT_SIZE], tfl[TT_SIZE];
#ifdef MT
static TLS int (*buf)[MAXMV], (*scb)[MAXMV];   // each thread's move lists (1 MB): in its own slot, after its TLS block (mt_thread)
#else
static int buf[MAXPLY + 8][MAXMV], scb[MAXPLY + 8][MAXMV];
#endif
static TLS int killer[(MAXPLY + 8) * 2], histT[32 * 32];
static TLS u32 rep[4096]; static TLS int repLen;
static TLS double nodes, maxNodes, deadline; static TLS int aborted;
#ifdef MT
static volatile int gStop;            // shared: set when the main thread's search is over (the helpers stop)
static TLS int threadId;              // 0 = the main thread (time control, result), 1.. = helpers
// (2026-11-09, after the Mac bench) the threads' shared table. The plain one above (one slot per key, always replace, six
// arrays written one by one) is not used: the threads write several times the entries of one thread, and "always replace"
// let the many shallow ones push out the deep ones, so each thread searched again what another had already done (in the
// simulation with the table as full as on the Mac, 2 and 4 threads needed as many main-thread nodes to the same depth as 1);
// and an entry written by two threads at once could pair one position's key with another's value. Here: buckets of four
// entries { key ^ w, w } (w = value, move, depth, flag, age, in use), so a torn entry fails the key check ("lockless");
// store = the same key's entry, else the shallowest / oldest of the bucket (depth − 16 if from an earlier search).
// 2^TTM_BITS buckets x 64 bytes (64 MB: 4M entries, the plain one has 1M).
#ifndef TTM_BITS
#define TTM_BITS 20
#endif
typedef unsigned long long u64;
static u64 TTM[(1 << TTM_BITS) * 8];
static u8 ttAge;
static inline int ttLoad(const Pos *p, int *m, int *d, int *v, int *f) {
  const u64 key = (u64)p->h1 << 32 | p->h2, *bk = &TTM[(p->h1 & ((1u << TTM_BITS) - 1)) * 8];
  for (int j = 0; j < 4; j++) {
    u64 kx = bk[2 * j], w = bk[2 * j + 1];
    if ((kx ^ w) == key && (w >> 56)) { *v = (int16_t)(w & 0xFFFF); *m = (int)((w >> 16) & 0x7FFF); *d = (i8)(w >> 32); *f = (int)((w >> 40) & 3); return 1; }
  }
  return 0;
}
static void ttSave(const Pos *p, int sv, int m, int d, int f) {
  const u64 key = (u64)p->h1 << 32 | p->h2; u64 *bk = &TTM[(p->h1 & ((1u << TTM_BITS) - 1)) * 8];
  int j = -1, q = 1 << 30;
  for (int i = 0; i < 4; i++) {
    u64 kx = bk[2 * i], w = bk[2 * i + 1];
    if ((kx ^ w) == key && (w >> 56)) { j = i; break; }
    int s = !(w >> 56) ? -1000 : (int)(i8)(w >> 32) - (((w >> 48) & 255) != ttAge ? 16 : 0);
    if (s < q) { q = s; j = i; }
  }
  u64 w = (u64)(uint16_t)(int16_t)sv | (u64)(m & 0x7FFF) << 16 | (u64)(u8)(i8)d << 32 | (u64)(f & 3) << 40 | (u64)ttAge << 48 | 1ull << 56;
  bk[2 * j + 1] = w; bk[2 * j] = key ^ w;
}
// every thread's last finished iteration on the current root: { key ^ x, x }, x = depth | value | move | in use — the main
// thread answers with the deepest one, and a helper that finishes the main thread's depth limit ends the search (gHit)
#define MT_SLOTS 64
static u64 gRes[MT_SLOTS][2];
static volatile u64 gGoalKey, gHit; static volatile int gGoal;
static TLS u64 rootK;
// (2026-11-10, after the Mac bench-all: same depth x1.5 with 4–14 threads although the nodes/s grew x4–x9.6) busy marks,
// Kerrigan's "simplified ABDADA". The threads walk the same tree in the same order at the same speed, so they search the
// same subtree at the same time and none gets the other's result from the table (a simulation where a thread's stores
// reach the others only after a while — true concurrency — gave x1.2 / x1.4 / x1.7 with 2 / 4 / 8 threads, as on the Mac;
// the earlier simulations let the threads take turns and so saw each other's finished subtrees). A thread marks the
// position of the move it searches (remaining depth >= BUSY_D); a move after the first whose position another thread has
// marked is put off to the end of the node. One thread alone never meets another's mark: its search is as before.
#define BUSY_BITS 15
#ifndef BUSY_D
#define BUSY_D 3
#endif
#define BUSY_DEF 32
static u64 busyT[1 << BUSY_BITS];
static inline u64 busyKey(const Pos *p) { return ((u64)p->h1 << 32 | p->h2) & ~63ull; }
static inline int busyOther(const Pos *p) {
  u64 v = __atomic_load_n(&busyT[p->h2 & ((1u << BUSY_BITS) - 1)], __ATOMIC_RELAXED);
  return (v & ~63ull) == busyKey(p) && (int)(v & 63) != (threadId & 63) + 1;
}
static inline int busySet(const Pos *p) {
  int i = (int)(p->h2 & ((1u << BUSY_BITS) - 1));
  __atomic_store_n(&busyT[i], busyKey(p) | (u64)((threadId & 63) + 1), __ATOMIC_RELAXED);
  return i;
}
static inline void busyClear(const Pos *p, int i) {
  u64 mine = busyKey(p) | (u64)((threadId & 63) + 1);
  __atomic_compare_exchange_n(&busyT[i], &mine, 0, 0, __ATOMIC_RELAXED, __ATOMIC_RELAXED);
}
// (2026-11-11, Young Brothers Wait: see "split points" after quickStatus(); MODEL_CARD.md「マルチスレッド その3：YBW」)
// aborted 2: a split point on this thread's chain was cut off / stopped (or its move was finished by another thread) — the
// search unwinds to it; 3: a thread searching a straggler's move a second time leaves it for a split point to join.
#define MT_YBW 1   /* (tools/mtsim: the helpers wait in mt_idle) */
#ifndef SIM_IDLE
#define SIM_IDLE() ((void)0)   /* (tools/mtsim: an idle thread's tick of the clock) */
#endif
typedef struct SPt SPt;
static TLS SPt *curSP; static TLS int curIdx = -1;   // the split point this thread works under, its move there
static TLS int dupMode;                              // searching a straggler's move a second time (spDup)
static int chainStopped(const SPt *s, int idx);
static int dupLeave(void);
// the counters of the split points (written at every join): a cache line of their own
static struct { volatile int idle, waitN, openN, hi; } __attribute__((aligned(64))) GS;
#define gIdle (GS.idle)     /* helper threads waiting for a split point (mt_idle) */
#define gWaitN (GS.waitN)   /* owners waiting for the helpers of their split point */
#define gOpenN (GS.openN)   /* split points open for joining */
#define gSPHi (GS.hi)       /* the slots used so far */
static void ybwCheck(void) {
  if (curSP && chainStopped(curSP, curIdx)) aborted = 2;
  else if (dupMode && gOpenN > 0 && dupLeave()) aborted = 3;
}
static void checkAbort(void) { if (now() > deadline || nodes > maxNodes || gStop || (threadId == 0 && rootK && gHit == rootK)) aborted = 1; else ybwCheck(); }
// a split point: the remaining moves of a node whose first move is done (see spRun)
#define NSP 128
#define SP_MV 256
#define SP_HK 64
struct SPt {
  volatile int word;   // seq << 9 | open (256) | the helpers on it (0..255)
  volatile int lock, stop, next, alpha, best, bestMove, inuse, waiting;
  int beta, n, depth, ply, root, pidx;
  const void *own; SPt *parent;   // the owner thread (the address of its curIdx); the split point above (pidx: its move)
  i8 b[24], hand[3], cnt[3]; u32 bb[3]; int side, quiet; u32 h1, h2; int repLen, nrep; u32 rep[SP_HK];   // the position
  volatile u8 busy[SP_MV], done[SP_MV], dup[SP_MV];   // the moves taken, finished, searched a second time
  int mv[SP_MV]; u8 red[SP_MV];                       // the moves, their late move reduction (as the one-thread loop)
} __attribute__((aligned(64)));
static SPt SPS[NSP] __attribute__((aligned(64)));
#ifndef SPLIT_D
#define SPLIT_D 3
#endif
static int splitD = SPLIT_D;
static SPt *spAlloc(void) {
  for (int i = 0; i < NSP; i++) { int z = 0; if (!SPS[i].inuse && __atomic_compare_exchange_n(&SPS[i].inuse, &z, 1, 0, __ATOMIC_ACQ_REL, __ATOMIC_RELAXED)) {
    int h = __atomic_load_n(&gSPHi, __ATOMIC_ACQUIRE); while (h <= i && !__atomic_compare_exchange_n(&gSPHi, &h, i + 1, 0, __ATOMIC_ACQ_REL, __ATOMIC_ACQUIRE)) {}
    return SPS + i; } }
  return 0;
}
static inline void spRelease(SPt *s) { __atomic_store_n(&s->inuse, 0, __ATOMIC_RELEASE); }   // (never opened)
static void spFillPos(SPt *s, const Pos *p) {   // the owner: this node's position (and the repetition history it looks at)
  for (int i = 0; i < 24; i++) s->b[i] = p->b[i];
  for (int k = 0; k < 3; k++) { s->bb[k] = p->bb[k]; s->hand[k] = p->hand[k]; s->cnt[k] = p->cnt[k]; }
  s->side = p->side; s->quiet = p->quiet; s->h1 = p->h1; s->h2 = p->h2;
  s->repLen = repLen; s->nrep = repLen < SP_HK ? repLen : SP_HK;
  for (int i = 0; i < s->nrep; i++) s->rep[i] = rep[repLen - s->nrep + i];
}
// a thread joining s: its position (the stack of the quiet counts stays: play / undo above it are balanced)
static void spLoadPos(const SPt *s) {
  Pos *p = &P;
  for (int i = 0; i < 24; i++) p->b[i] = s->b[i];
  for (int k = 0; k < 3; k++) { p->bb[k] = s->bb[k]; p->hand[k] = s->hand[k]; p->cnt[k] = s->cnt[k]; }
  p->side = s->side; p->quiet = s->quiet; p->h1 = s->h1; p->h2 = s->h2;
  repLen = s->repLen;
  for (int i = 0; i < s->nrep; i++) rep[repLen - s->nrep + i] = s->rep[i];
}
static void spRun(SPt *s, int *best, int *bestM);
static int spWanted(void);
#else
static void checkAbort(void) { if (now() > deadline || nodes > maxNodes) aborted = 1; }
#endif
static int isRep(const Pos *p) {
  u32 h = p->h1; int lim = repLen - p->quiet - 1; if (lim < 0) lim = 0;
  for (int i = repLen - 3; i >= lim; i -= 2) if (rep[i] == h) return 1;
  return 0;
}
static void order(const Pos *p, int *mv, int n, int ply, int ttm, int *sc) {
  int k0 = killer[ply * 2], k1 = killer[ply * 2 + 1], o = 3 - p->side;
  for (int i = 0; i < n; i++) {
    int m = mv[i], v;
    if (m == ttm) v = 1 << 29;
    else if (((m >> 10) & 31) != NONE) {
      int r = (m >> 10) & 31, thr = 0;
      for (int k = 0; k < prn[r]; k += 2) { int x = p->b[pr[r][k]], y = p->b[pr[r][k + 1]]; if ((x == o && !y) || (!x && y == o)) thr++; }
      v = (1 << 27) + thr * 1000 + adjn[r];
    } else if (m == k0 || m == k1) v = 1 << 26;
    else v = histT[(m & 31) * 32 + ((m >> 5) & 31)];
    sc[i] = v;
  }
}
static inline void pickBest(int *mv, int *sc, int i, int n) {
  int bi = i; for (int j = i + 1; j < n; j++) if (sc[j] > sc[bi]) bi = j;
  int m = mv[bi]; mv[bi] = mv[i]; mv[i] = m; int t = sc[bi]; sc[bi] = sc[i]; sc[i] = t;
}
static int qsearch(Pos *p, int alpha, int beta, int ply, int qd) {
  nodes++;
  int s = p->side;
  if (p->cnt[s] + p->hand[s] < 3) return -(WIN - ply);
  if (egOn && !p->hand[1] && !p->hand[2]) { int dv = egProbe(p); if (dv >= 0) return egScore(dv, ply); }
  int *mv = buf[ply], any, k = genCaps(p, mv, &any);
  if (!any) return p->cnt[1] + p->cnt[2] == N ? 0 : -(WIN - ply);
  int best = evaluate(p);
  if (best >= beta || qd <= 0 || ply >= MAXPLY) return best;
  if (best > alpha) alpha = best;
  int *sc = scb[ply];
  order(p, mv, k, ply, -1, sc);
  for (int i = 0; i < k; i++) {
    pickBest(mv, sc, i, k); int m = mv[i];
    play(p, m); int v = -qsearch(p, -beta, -alpha, ply + 1, qd - 1); undo(p, m);
    if (v > best) { best = v; if (v > alpha) { alpha = v; if (v >= beta) break; } }
  }
  return best;
}
static int search(Pos *p, int depth, int alpha, int beta, int ply) {
  if (((long long)(++nodes) & 2047) == 0) checkAbort();
#ifdef MT
  if (((long long)nodes & 255) == 0 && (curSP || dupMode) && !aborted) ybwCheck();   // (YBW: a cut-off above, sooner)
#endif
  if (aborted) return 0;
  int s = p->side;
  if (p->cnt[s] + p->hand[s] < 3) return -(WIN - ply);
  if (ply > 0) {
    if (p->quiet >= QUIET_DRAW) return 0;
    if (p->quiet >= 4 && isRep(p)) return 0;
    int ma = -(WIN - ply), mb = WIN - ply - 1;
    if (ma > alpha) { alpha = ma; if (alpha >= beta) return alpha; }
    if (mb < beta) { beta = mb; if (alpha >= beta) return beta; }
    if (egOn && !p->hand[1] && !p->hand[2]) { int dv = egProbe(p); if (dv >= 0) return egScore(dv, ply); }
  }
  if (depth <= 0 || ply >= MAXPLY) return qsearch(p, alpha, beta, ply, 6);
#ifdef MT
  int ttm = -1;
  { int tm, tdd, tvv, tf;
    if (ttLoad(p, &tm, &tdd, &tvv, &tf)) {
      ttm = tm;
      if (ply > 0 && tdd >= depth) {
        int v = tvv; if (v > WINT) v -= ply; else if (v < -WINT) v += ply;
        if (tf == 0 || (tf == 1 && v >= beta) || (tf == 2 && v <= alpha)) return v;
      }
    } }
#else
  u32 idx = p->h1 & TT_MASK; int ttm = -1;
  if (tk1[idx] == p->h1 && tk2[idx] == p->h2) {
    ttm = tmv[idx];
    if (ply > 0 && td[idx] >= depth) {
      int v = tv[idx]; if (v > WINT) v -= ply; else if (v < -WINT) v += ply;
      int f = tfl[idx];
      if (f == 0 || (f == 1 && v >= beta) || (f == 2 && v <= alpha)) return v;
    }
  }
#endif
  int *mv = buf[ply], n = gen(p, mv);
  if (n == 0) return p->cnt[1] + p->cnt[2] == N ? 0 : -(WIN - ply);
  int *sc = scb[ply];
  order(p, mv, n, ply, ttm, sc);
  int a0 = alpha, best = -INF, bm = mv[0];
#ifdef MT
  // (2026-11-10) busy marks ("simplified ABDADA", see busyT): a move whose position another thread is searching right now
  // is put off until the other moves are done (by then its result is usually in the table)
  int defM[BUSY_DEF], defI[BUSY_DEF], nDef = 0, noSplit = 0;
  for (int k = 0; k < n + nDef; k++) {
    int i, m;
    // YBW: the first move is done and a helper is idle (or an owner above waits for its helpers): the remaining moves go to
    // a split point, in the order of this loop (the selection sort's, then the moves put off), each with its reduction
    if (k > 0 && k < n && !noSplit && depth >= splitD && (gIdle > 0 || (gWaitN > 0 && spWanted()))) {
      SPt *sp = spAlloc(); int ns = 0;
      if (sp) {
        for (int j = k; j < n + nDef; j++) {
          int ii, m2;
          if (j < n) { pickBest(mv, sc, j, n); m2 = mv[j]; ii = j; } else { m2 = defM[j - n]; ii = defI[j - n]; }
          if (ns == SP_MV) { ns = -1; break; }
          int R = 0;
#ifdef LMR
          if (depth >= LMR_D && ii >= LMR_I && ((m2 >> 10) & 31) == NONE && m2 != killer[ply * 2] && m2 != killer[ply * 2 + 1]) R = (ii >= LMR_I2 && depth >= 5) ? 2 : 1;
#endif
          sp->mv[ns] = m2; sp->red[ns] = (u8)R; ns++;
        }
      }
      if (ns >= 2) {
        spFillPos(sp, p);
        sp->n = ns; sp->depth = depth; sp->ply = ply; sp->root = 0; sp->beta = beta; sp->alpha = alpha;
        spRun(sp, &best, &bm);
        if (aborted) return 0;
        if (best >= beta && ((bm >> 10) & 31) == NONE) {
          if (killer[ply * 2] != bm) { killer[ply * 2 + 1] = killer[ply * 2]; killer[ply * 2] = bm; }
          histT[(bm & 31) * 32 + ((bm >> 5) & 31)] += depth * depth;
        }
        break;
      }
      if (sp) spRelease(sp);
      noSplit = 1;   // (fewer than 2 moves left, or no free slot: on alone)
    }
    if (k < n) { pickBest(mv, sc, k, n); m = mv[k]; i = k; } else { m = defM[k - n]; i = defI[k - n]; }
    play(p, m); rep[repLen++] = p->h1;
    if (k < n && i > 0 && depth >= BUSY_D && nDef < BUSY_DEF && busyOther(p)) { repLen--; undo(p, m); defM[nDef] = m; defI[nDef++] = i; continue; }
    const int mk = depth >= BUSY_D ? busySet(p) : -1;
    int v;
    if (i == 0) v = -search(p, depth - 1, -beta, -alpha, ply + 1);
    else {
      int R = 0;
#ifdef LMR
      if (depth >= LMR_D && i >= LMR_I && ((m >> 10) & 31) == NONE && m != killer[ply * 2] && m != killer[ply * 2 + 1]) R = (i >= LMR_I2 && depth >= 5) ? 2 : 1;
#endif
      v = -search(p, depth - 1 - R, -alpha - 1, -alpha, ply + 1);
      if (R && v > alpha && !aborted) v = -search(p, depth - 1, -alpha - 1, -alpha, ply + 1);
      if (v > alpha && v < beta && !aborted) v = -search(p, depth - 1, -beta, -alpha, ply + 1);
    }
    if (mk >= 0) busyClear(p, mk);
#else
  for (int i = 0; i < n; i++) {
    pickBest(mv, sc, i, n); int m = mv[i];
    play(p, m); rep[repLen++] = p->h1;
    int v;
    if (i == 0) v = -search(p, depth - 1, -beta, -alpha, ply + 1);
    else {
      int R = 0;
#ifdef LMR
      if (depth >= LMR_D && i >= LMR_I && ((m >> 10) & 31) == NONE && m != killer[ply * 2] && m != killer[ply * 2 + 1]) R = (i >= LMR_I2 && depth >= 5) ? 2 : 1;
#endif
      v = -search(p, depth - 1 - R, -alpha - 1, -alpha, ply + 1);
      if (R && v > alpha && !aborted) v = -search(p, depth - 1, -alpha - 1, -alpha, ply + 1);
      if (v > alpha && v < beta && !aborted) v = -search(p, depth - 1, -beta, -alpha, ply + 1);
    }
#endif
    repLen--; undo(p, m);
    if (aborted) return 0;
    if (v > best) {
      best = v; bm = m;
      if (v > alpha) {
        alpha = v;
        if (v >= beta) {
          if (((m >> 10) & 31) == NONE) {
            if (killer[ply * 2] != m) { killer[ply * 2 + 1] = killer[ply * 2]; killer[ply * 2] = m; }
            histT[(m & 31) * 32 + ((m >> 5) & 31)] += depth * depth;
          }
          break;
        }
      }
    }
  }
  int sv = best; if (sv > WINT) sv += ply; else if (sv < -WINT) sv -= ply;
#ifdef MT
  ttSave(p, sv, bm, depth, best >= beta ? 1 : best <= a0 ? 2 : 0);
#else
  tk1[idx] = p->h1; tk2[idx] = p->h2; tv[idx] = (int16_t)sv; tmv[idx] = bm; td[idx] = (i8)depth;
  tfl[idx] = best >= beta ? 1 : best <= a0 ? 2 : 0;
#endif
  return best;
}
static int quickStatus(Pos *p, int ply) {   // returns INF+1 when the game goes on
  int s = p->side;
  if (p->cnt[s] + p->hand[s] < 3) return -(WIN - ply);
  if (p->quiet >= QUIET_DRAW) return 0;
  if (p->quiet >= 4) {
    int c = 0, lim = repLen - p->quiet - 1; if (lim < 0) lim = 0;
    for (int i = repLen - 3; i >= lim; i -= 2) if (rep[i] == p->h1) c++;
    if (c >= 2) return 0;
  }
  int n = gen(p, buf[ply]);
  if (n == 0) return p->cnt[1] + p->cnt[2] == N ? 0 : -(WIN - ply);
  return INF + 1;
}

#ifdef MT
// ---------------------------------------------------------------- split points (Young Brothers Wait, 2026-11-11)
// The method of reversi/engine.c v4 / v4.1 and xiangqi/engine.c (MODEL_CARD.md「マルチスレッド その3：YBW」). Lazy SMP with
// busy marks (every thread searching the root, helping each other only through the table) grew too little on the Mac.
// Here the helpers do not search on their own: they wait in mt_idle. A node of the search (remaining depth >= SPLIT_D) whose
// first move is done opens a split point when a helper is idle: its other moves (in the one-thread order, with the
// one-thread reductions) are taken one at a time by the owner and the idle threads, each with the one-thread loop's null
// window / re-search. A helper copies the position of the split point (and the repetition history it looks at). A cut-off
// stops the split point (the threads below it see it at their next check: aborted 2). The owner waits until every helper
// has left, meanwhile helping at the split points below its own, or searching a move that another thread is still on a
// second time (a thread on a slow core then holds up nobody: the first result counts). The root is one too. Without an
// idle helper nothing is split: one thread searches exactly as before.
#ifdef SIM_STAT
static double ST[16];   // (tools/mtsim) 0 splits, 1 helper joins, 2 their moves, 3 empty joins, 4 idle ticks, 5 waiting ticks, 6 second searches
#define STAT(k, v) (ST[k] += (v))
EXPORT(mt_stat) double mt_stat(int k) { return ST[k]; }
#else
#define STAT(k, v) ((void)0)
#endif
// s or a split point above it was stopped, or the move idx of s (idx >= 0) or a move above it was finished by another
// thread (a straggler searched a second time)
static int chainStopped(const SPt *s, int idx) {
  for (int k = 0; s && k < 128; k++, idx = s->pidx, s = s->parent)
    if (__atomic_load_n(&s->stop, __ATOMIC_ACQUIRE) || (idx >= 0 && __atomic_load_n(&s->done[idx], __ATOMIC_ACQUIRE))) return 1;
  return 0;
}
static inline void spLock(SPt *s) { int z; do { z = 0; } while (!__atomic_compare_exchange_n(&s->lock, &z, 1, 0, __ATOMIC_ACQUIRE, __ATOMIC_RELAXED)); }
static inline void spUnlock(SPt *s) { __atomic_store_n(&s->lock, 0, __ATOMIC_RELEASE); }
static inline void spStop(SPt *s) { __atomic_store_n(&s->stop, 1, __ATOMIC_RELEASE); }
static void spFree(SPt *s) {   // closed, no helper left: a new sequence number, then the slot is free
  const int w = __atomic_load_n(&s->word, __ATOMIC_ACQUIRE);
  __atomic_store_n(&s->word, ((w >> 9) + 1) << 9, __ATOMIC_RELEASE);
  __atomic_store_n(&s->inuse, 0, __ATOMIC_RELEASE);
}
static int spJoin(SPt *s) {   // a helper is counted on the split point while it is open
  int w = __atomic_load_n(&s->word, __ATOMIC_ACQUIRE);
  for (;;) {
    if (!(w & 256) || (w & 255) == 255) return 0;
    if (__atomic_compare_exchange_n(&s->word, &w, w + 1, 0, __ATOMIC_ACQ_REL, __ATOMIC_ACQUIRE)) return 1;
  }
}
static inline void spLeave(SPt *s) { __atomic_sub_fetch(&s->word, 1, __ATOMIC_ACQ_REL); }
// the move i of s (the thread is at s's position) with the null window against a and the re-searches, as the one-thread loop
static int spSearch(SPt *s, int i, int a) {
  Pos *p = &P; const int m = s->mv[i], d = s->depth, ply = s->ply, b = s->beta;
  play(p, m); rep[repLen++] = p->h1;
  int v;
  if (s->root) {   // (as best(): a finished game, else the null window and the re-search with (alpha, INF))
    const int st = quickStatus(p, 1);
    if (st != INF + 1) v = -st;
    else {
      const int mk = d >= BUSY_D ? busySet(p) : -1;
      v = -search(p, d - 1, -a - 1, -a, 1);
      if (v > a && !aborted) v = -search(p, d - 1, -INF, -a, 1);
      if (mk >= 0) busyClear(p, mk);
    }
  } else {
    const int mk = d >= BUSY_D ? busySet(p) : -1, R = s->red[i];
    v = -search(p, d - 1 - R, -a - 1, -a, ply + 1);
    if (R && v > a && !aborted) v = -search(p, d - 1, -a - 1, -a, ply + 1);
    if (v > a && v < b && !aborted) v = -search(p, d - 1, -b, -a, ply + 1);
    if (mk >= 0) busyClear(p, mk);
  }
  repLen--; undo(p, m);
  return v;
}
static void spResult(SPt *s, int i, int v) {
  spLock(s);
  if (v > s->best) {
    s->best = v; s->bestMove = s->mv[i];
    if (v > s->alpha) { __atomic_store_n(&s->alpha, v, __ATOMIC_RELEASE); if (v >= s->beta) spStop(s); }
  }
  __atomic_store_n(&s->done[i], 1, __ATOMIC_RELEASE);   // (a second search of it stops: chainStopped)
  spUnlock(s);
}
// take moves of s until none is left (the owner and the helpers); returns the number of moves taken
static int spWork(SPt *s, int owner) {
  for (int done = 0;; done++) {
    if (chainStopped(s, -1)) return done;
    const int i = __atomic_fetch_add(&s->next, 1, __ATOMIC_ACQ_REL);
    if (i >= s->n) return done;
    const int a = __atomic_load_n(&s->alpha, __ATOMIC_ACQUIRE);
    if (a >= s->beta) return done;
    __atomic_store_n(&s->busy[i], 1, __ATOMIC_RELEASE);
    curIdx = i;
    const int v = spSearch(s, i, a);
    curIdx = -1;
    if (aborted) {
      if (aborted == 2 && !chainStopped(s, -1)) { aborted = 0; continue; }   // (another thread finished this move first)
      if (owner || aborted == 1 || aborted == 3) { if (owner) spStop(s); return done + 1; }
      aborted = 0; continue;   // (a helper: this split point or one above it was stopped — the check above leaves)
    }
    if (v >= s->beta && !s->root) {   // (this thread's killers / history, as the one-thread cut-off)
      const int m = s->mv[i], ply = s->ply;
      if (((m >> 10) & 31) == NONE) {
        if (killer[ply * 2] != m) { killer[ply * 2 + 1] = killer[ply * 2]; killer[ply * 2] = m; }
        histT[(m & 31) * 32 + ((m >> 5) & 31)] += s->depth * s->depth;
      }
    }
    spResult(s, i, v);
  }
}
// a split is wanted below a split point whose owner waits for its helpers
static int spWanted(void) {
  for (const SPt *s = curSP; s; s = s->parent) if (s->waiting) return 1;
  return 0;
}
static TLS const SPt *dupZ, *dupUnder; static TLS int dupJ;
static int isBelow(const SPt *y, const SPt *s) { for (int k = 0; y && k < 128; k++) { y = y->parent; if (y == s) return 1; } return 0; }
// y is in this thread's own part of the move it searches a second time
static int dupBelow(const SPt *y) {
  int mine = 0;
  for (int k = 0; y && k < 128; k++, y = y->parent) { if (y->own == (const void *)&curIdx) mine = 1; if (y->parent == dupZ && y->pidx == dupJ) return mine; }
  return 0;
}
// an idle thread: the open split point with the most work left (only those below `under` when it is set)
static SPt *spFind(const SPt *under) {
  SPt *bs = 0; int bw = -(1 << 30);
  for (int i = 0, hi = gSPHi; i < hi; i++) {
    SPt *y = SPS + i;
    if (!__atomic_load_n(&y->inuse, __ATOMIC_ACQUIRE)) continue;
    const int w = __atomic_load_n(&y->word, __ATOMIC_ACQUIRE);
    if (!(w & 256) || __atomic_load_n(&y->next, __ATOMIC_ACQUIRE) >= y->n || y->stop) continue;
    const int work = y->depth * 4 + (y->root ? 1000 : 0) - (w & 255);
    if (work > bw && (!under || isBelow(y, under)) && !chainStopped(y, -1) && !(dupMode && dupBelow(y))) { bw = work; bs = y; }
  }
  return bs;
}
static int dupLeave(void) { return spFind(dupUnder) != 0; }
// nothing to join: a move another thread is still searching (the oldest one of the highest split point; only at or below
// `under` when it is set), searched a second time with the shared table — the first to finish counts, the other stops
static SPt *spFindDup(const SPt *under, int *pj) {
  SPt *bs = 0; int bw = -(1 << 30), bj = -1;
  for (int i = 0, hi = gSPHi; i < hi; i++) {
    SPt *y = SPS + i;
    if (!__atomic_load_n(&y->inuse, __ATOMIC_ACQUIRE) || y->stop) continue;
    const int w = __atomic_load_n(&y->word, __ATOMIC_ACQUIRE);
    if (!(w & 256) && !(w & 255)) continue;
    const int work = y->depth * 4 + (y->root ? 1000 : 0);
    if (work <= bw || (under && y != under && !isBelow(y, under)) || chainStopped(y, -1)) continue;
    const int n = y->n < SP_MV ? y->n : SP_MV; int j = -1;
    for (int q = 0; q < n; q++) if (y->busy[q] && !y->done[q] && !y->dup[q]) { j = q; break; }
    if (j >= 0) { bw = work; bs = y; bj = j; }
  }
  *pj = bj;
  return bs;
}
static int spDup(SPt *y, int j, const SPt *under) {   // 1 when it searched (a part of) the move
  int w = __atomic_load_n(&y->word, __ATOMIC_ACQUIRE);
  for (;;) {   // (counted on it while it is open or a helper is still there: the owner frees it only at 0)
    if ((!(w & 256) && !(w & 255)) || (w & 255) == 255) return 0;
    if (__atomic_compare_exchange_n(&y->word, &w, w + 1, 0, __ATOMIC_ACQ_REL, __ATOMIC_ACQUIRE)) break;
  }
  if (y->stop || (under && y != under && !isBelow(y, under)) || __atomic_exchange_n(&y->dup[j], 1, __ATOMIC_ACQ_REL) || __atomic_load_n(&y->done[j], __ATOMIC_ACQUIRE)) { spLeave(y); return 0; }
  SPt *const saved = curSP; const int savedIdx = curIdx;
  spLoadPos(y);
  curSP = y; curIdx = j;
  dupMode = 1; dupZ = y; dupJ = j; dupUnder = under;
  const int a = __atomic_load_n(&y->alpha, __ATOMIC_ACQUIRE);
  if (a < y->beta && !chainStopped(y, j)) { const int v = spSearch(y, j, a); if (!aborted) spResult(y, j, v); }
  dupMode = 0;
  if (aborted == 3) aborted = 0;
  curSP = saved; curIdx = savedIdx;
  if (under) spLoadPos(under);
  spLeave(y);
  return 1;
}
// join y and take its moves (a helper, or an owner waiting for the helpers of its split point `under`)
static int spHelp(SPt *y, const SPt *under) {   // returns the number of moves it took
  if (!spJoin(y)) return 0;
  if (y->stop || __atomic_load_n(&y->next, __ATOMIC_ACQUIRE) >= y->n || (under && !isBelow(y, under))) { spLeave(y); return 0; }
  SPt *const saved = curSP; const int savedIdx = curIdx;
  spLoadPos(y);
  curSP = y;
  const int k = spWork(y, 0);
  curSP = saved; curIdx = savedIdx;
  if (under) spLoadPos(under);
  spLeave(y);
  return k;
}
static void waitCheck(void) { SIM_IDLE(); checkAbort(); }
// the owner: s (moves, position, window filled in) is opened, searched with the helpers; *best / *bestM updated
static void spRun(SPt *s, int *best, int *bestM) {
  STAT(0, 1);
  s->alpha = s->alpha > *best ? s->alpha : *best; s->best = *best; s->bestMove = *bestM; s->next = 0; s->stop = 0; s->lock = 0; s->waiting = 0;
  for (int i = 0; i < s->n; i++) { s->busy[i] = 0; s->done[i] = 0; s->dup[i] = 0; }
  s->pidx = curSP ? curIdx : -1; s->own = (const void *)&curIdx; s->parent = curSP;
  { const int w = __atomic_load_n(&s->word, __ATOMIC_ACQUIRE); __atomic_store_n(&s->word, (w & ~511) | 256, __ATOMIC_RELEASE); }   // open
  __atomic_add_fetch(&gOpenN, 1, __ATOMIC_ACQ_REL);
  SPt *const saved = curSP; const int savedIdx = curIdx;
  curSP = s;
  spWork(s, 1);
  __atomic_and_fetch(&s->word, ~256, __ATOMIC_ACQ_REL);   // closed: no more joins
  __atomic_sub_fetch(&gOpenN, 1, __ATOMIC_ACQ_REL);
  int ab = aborted;
  if (ab) spStop(s);
  aborted = 0;
  int w8 = 0;
  while (__atomic_load_n(&s->word, __ATOMIC_ACQUIRE) & 255) {   // the helpers still on it: help below it meanwhile
    SPt *y = s->stop || !gOpenN ? 0 : spFind(s);
    if (y) { if (w8) { w8 = 0; s->waiting = 0; __atomic_sub_fetch(&gWaitN, 1, __ATOMIC_ACQ_REL); } if (spHelp(y, s)) y = s; else y = 0; }
    else if (!s->stop && !dupMode) {   // nothing to help: a straggler below it, searched a second time
      int j; SPt *z = spFindDup(s, &j);
      if (z && spDup(z, j, s)) { STAT(6, 1); y = s; }
    }
    if (!y) {
      if (!w8 && !s->stop) { w8 = 1; s->waiting = 1; __atomic_add_fetch(&gWaitN, 1, __ATOMIC_ACQ_REL); }   // (its helpers split for it)
      STAT(5, 1); waitCheck();
    }
    if (aborted == 1 || aborted == 3) { ab = aborted; spStop(s); }
    aborted = 0;
  }
  if (w8) { s->waiting = 0; __atomic_sub_fetch(&gWaitN, 1, __ATOMIC_ACQ_REL); }
  curSP = saved; curIdx = savedIdx;
  if (!ab && gStop) ab = 1;
  if (chainStopped(saved, savedIdx)) { if (!ab) ab = 2; }   // above it was stopped: this result is not complete
  else if (ab == 2) ab = 0;                                 // its own cut-off (best >= beta)
  aborted = ab;
  *best = s->best; *bestM = s->bestMove;
  spFree(s);
}
EXPORT(mt_split) void mt_split(int d) { if (d > 0) splitD = d; }
// a helper (mt-helper.js): take moves at the split points until the search is over (mt_stop) — or, with ms > 0, until it
// has nothing to do after ms milliseconds (the page then counts its nodes and calls again); returns its nodes. fresh: a new
// job (the history decays and the killers are cleared)
EXPORT(mt_idle) double mt_idle(double ms, int fresh) {
  nodes = 0; deadline = 1e300; maxNodes = 1e300; rootK = 0; aborted = 0; curSP = 0; curIdx = -1; dupMode = 0;
  if (fresh) {
    for (int i = 0; i < 32 * 32; i++) histT[i] >>= 2;
    for (int i = 0; i < (MAXPLY + 8) * 2; i++) killer[i] = -1;
  }
  const double t0 = ms > 0 ? now() : 0;
  __atomic_add_fetch(&gIdle, 1, __ATOMIC_ACQ_REL);
  while (!__atomic_load_n(&gStop, __ATOMIC_ACQUIRE)) {
    SPt *y = gOpenN > 0 ? spFind(0) : 0;
    if (!y) {
      if (ms > 0 && now() - t0 > ms) break;
      int j; SPt *z = spFindDup(0, &j);
      if (!z || !spDup(z, j, 0)) { STAT(4, 1); SIM_IDLE(); } else STAT(6, 1);
      aborted = 0;
      continue;
    }
    __atomic_sub_fetch(&gIdle, 1, __ATOMIC_ACQ_REL);
    { const int k = spHelp(y, 0); if (!k) { STAT(3, 1); STAT(4, 1); SIM_IDLE(); } else { STAT(1, 1); STAT(2, k); } }
    aborted = 0;
    __atomic_add_fetch(&gIdle, 1, __ATOMIC_ACQ_REL);
  }
  __atomic_sub_fetch(&gIdle, 1, __ATOMIC_ACQ_REL);
  aborted = 0;
  return nodes;
}
#endif

// ---------------------------------------------------------------- host API
static TLS int rootMv[MAXMV], rootN;
static TLS int startQuiet;
EXPORT(setup) int setup(void) {
  // IO: b[N], hand1, hand2, side, quiet, nmoves, moves...
  int k = 0; Pos *p = &P;
  for (int i = 0; i < 24; i++) p->b[i] = 0;
  p->cnt[1] = p->cnt[2] = 0; p->bb[0] = p->bb[1] = p->bb[2] = 0;
  for (int i = 0; i < N; i++) { p->b[i] = (i8)IO[k++]; if (p->b[i]) { p->cnt[(int)p->b[i]]++; p->bb[(int)p->b[i]] |= 1u << i; } }
  p->hand[1] = (i8)IO[k++]; p->hand[2] = (i8)IO[k++]; p->side = IO[k++]; p->quiet = IO[k++]; p->sp = 0;
  rehash(p); repLen = 0; rep[repLen++] = p->h1;
  int nm = IO[k++];
  for (int i = 0; i < nm; i++) { play(p, IO[k++]); if (repLen < 4000) rep[repLen++] = p->h1; }
  p->sp = 0;
  rootN = gen(p, rootMv);
  return rootN;
}
EXPORT(new_game) void new_game(void) {
#ifdef MT
  for (unsigned i = 0; i < sizeof(TTM) / 8; i++) TTM[i] = 0;
  for (unsigned i = 0; i < (1u << BUSY_BITS); i++) busyT[i] = 0;
  ttAge = 0;
#else
  for (int i = 0; i < TT_SIZE; i++) { tk1[i] = 0; tk2[i] = 0; td[i] = 0; tfl[i] = 0; }
#endif
  for (int i = 0; i < 32 * 32; i++) histT[i] = 0;
  for (int i = 0; i < (MAXPLY + 8) * 2; i++) killer[i] = -1;
}
static void limit(double ms, double mn) {
  nodes = 0; aborted = 0; deadline = ms > 0 ? now() + ms : 1e300; maxNodes = mn > 0 ? mn : 1e300;
#ifdef MT
  if (threadId == 0) ttAge++;   // (a new search: only the main thread ages the shared table)
#endif
}
// values of every root move at a fixed depth; IO out: n, (m, v)...
static int rootValues(int depth, int *mv, int n, int *out) {
  Pos *p = &P;
  for (int i = 0; i < n; i++) {
    int m = mv[i], v;
    play(p, m); rep[repLen++] = p->h1;
    int st = quickStatus(p, 1);
    if (st != INF + 1) v = -st; else v = -search(p, depth - 1, -INF, INF, 1);
    repLen--; undo(p, m);
    if (aborted) return 0;
    out[i] = v;
  }
  return 1;
}
// fixed-depth root values (used by the noisy levels): returns 1 when complete
EXPORT(root_values) int root_values(int depth) {
  int vals[MAXMV];
  if (!rootValues(depth, rootMv, rootN, vals)) return 0;
  IO[0] = rootN; for (int i = 0; i < rootN; i++) { IO[1 + 2 * i] = rootMv[i]; IO[2 + 2 * i] = vals[i]; }
  return 1;
}
EXPORT(set_limit) void set_limit(double ms, double mn) { limit(ms, mn); }
// iterative deepening best move; IO out: m, v, depth
EXPORT(best) void best(int maxDepth, double ms, double mn) {
  Pos *p = &P; limit(ms, mn);
  if (rootN == 1) { IO[0] = rootMv[0]; IO[1] = 0; IO[2] = 0; return; }
  int bestM = rootMv[0], bestV = 0, done = 0, ord[MAXMV];
#ifdef MT
  const u64 rk = ((u64)p->h1 << 32 | p->h2) ^ (u64)rootN << 20;
  if (threadId == 0) {   // a new search: forget the threads' results of the last one, set the depth goal
    for (int i = 0; i < MT_SLOTS; i++) { __atomic_store_n(&gRes[i][0], 0, __ATOMIC_SEQ_CST); __atomic_store_n(&gRes[i][1], 0, __ATOMIC_SEQ_CST); }
    gHit = 0; gGoal = maxDepth; gGoalKey = rk; rootK = rk;
  }
  // (helpers: every thread iterates 1, 2, 3, … like the main one. Tried 2026-11-09: Stockfish's pattern of skipped depths
  // per helper — slower to the main thread's depth in the simulation.)
  for (int d = 1; d <= maxDepth; d++) {
#else
  for (int d = 1; d <= maxDepth; d++) {
#endif
    int k = 0; ord[k++] = bestM; for (int i = 0; i < rootN; i++) if (rootMv[i] != bestM) ord[k++] = rootMv[i];
    int alpha = -INF, bm = bestM, bv = -INF;
#ifdef MT
    int rdM[BUSY_DEF], nrd = 0;   // (the busy marks at the root too: a root move another thread is on is put off)
    for (int k = 0; k < rootN + nrd; k++) {
      // YBW at the root: the first move is done, the others go to a split point
      if (k == 1 && rootN - 1 >= 2 && rootN - 1 <= SP_MV && d >= splitD && gIdle > 0) {
        SPt *sp = spAlloc();
        if (sp) {
          for (int j = 1; j < rootN; j++) { sp->mv[j - 1] = ord[j]; sp->red[j - 1] = 0; }
          spFillPos(sp, p);
          sp->n = rootN - 1; sp->depth = d; sp->ply = 0; sp->root = 1; sp->beta = INF; sp->alpha = alpha;
          spRun(sp, &bv, &bm);
          break;
        }
      }
      int i = k < rootN ? k : 1, m = k < rootN ? ord[k] : rdM[k - rootN], v;
      play(p, m); rep[repLen++] = p->h1;
      int st = quickStatus(p, 1);
      if (k < rootN && i > 0 && st == INF + 1 && d >= BUSY_D && nrd < BUSY_DEF && busyOther(p)) { repLen--; undo(p, m); rdM[nrd++] = m; continue; }
      const int mk = st == INF + 1 && d >= BUSY_D ? busySet(p) : -1;
      if (st != INF + 1) v = -st;
      else if (i == 0) v = -search(p, d - 1, -INF, INF, 1);
      else { v = -search(p, d - 1, -alpha - 1, -alpha, 1); if (v > alpha && !aborted) v = -search(p, d - 1, -INF, -alpha, 1); }
      if (mk >= 0) busyClear(p, mk);
#else
    for (int i = 0; i < rootN; i++) {
      int m = ord[i], v;
      play(p, m); rep[repLen++] = p->h1;
      int st = quickStatus(p, 1);
      if (st != INF + 1) v = -st;
      else if (i == 0) v = -search(p, d - 1, -INF, INF, 1);
      else { v = -search(p, d - 1, -alpha - 1, -alpha, 1); if (v > alpha && !aborted) v = -search(p, d - 1, -INF, -alpha, 1); }
#endif
      repLen--; undo(p, m);
      if (aborted) break;
      if (v > bv) { bv = v; bm = m; if (v > alpha) alpha = v; }
    }
    if (aborted) break;
    bestM = bm; bestV = bv; done = d;
#ifdef MT
    if (threadId < MT_SLOTS) {   // publish the finished iteration
      u64 x = (u64)(d & 255) | (u64)(uint16_t)(int16_t)bv << 8 | (u64)(bm & 0x7FFF) << 24 | 1ull << 40;
      __atomic_store_n(&gRes[threadId][1], x, __ATOMIC_SEQ_CST); __atomic_store_n(&gRes[threadId][0], rk ^ x, __ATOMIC_SEQ_CST);
      if (threadId && d >= gGoal && gGoalKey == rk) gHit = rk;
    }
#endif
    if (bv > WINT || bv < -WINT) break;
  }
#ifdef MT
  if (threadId == 0) {   // the deepest finished iteration of all the threads (the main thread's on a tie)
    int bt = -1, bdep = done;
    for (int i = 1; i < MT_SLOTS; i++) {
      u64 x = __atomic_load_n(&gRes[i][1], __ATOMIC_SEQ_CST), kx = __atomic_load_n(&gRes[i][0], __ATOMIC_SEQ_CST);
      if (!(x >> 40) || (kx ^ x) != rk) continue;
      int dd = (int)(x & 255); if (dd > bdep) { bdep = dd; bt = i; }
    }
    if (bt > 0) {
      u64 x = __atomic_load_n(&gRes[bt][1], __ATOMIC_SEQ_CST), kx = __atomic_load_n(&gRes[bt][0], __ATOMIC_SEQ_CST);
      int m = (int)((x >> 24) & 0x7FFF), ok = 0;
      for (int i = 0; i < rootN; i++) if (rootMv[i] == m) ok = 1;
      if ((kx ^ x) == rk && ok) { bestM = m; bestV = (int16_t)(uint16_t)(x >> 8); done = (int)(x & 255); }
    }
    gGoalKey = 0; gHit = 0; rootK = 0;
  }
#endif
  IO[0] = bestM; IO[1] = bestV; IO[2] = done;
#ifdef MT
  IO[3] = (i32)(nodes / 1000);   // (the nodes of this search, thousands: the helpers' counts, the page's nps)
#endif
}
// analysis: all root moves, iterative deepening until time runs out; IO out: n, depth, (m, v)...
EXPORT(analyze) void analyze(double ms, int maxDepth) {
  limit(ms, 0);
  double t0 = now();
  int mv[MAXMV], vals[MAXMV], last[MAXMV], n = rootN, depth = 0, have = 0;
  for (int i = 0; i < n; i++) mv[i] = rootMv[i];
  for (int d = 1; d <= maxDepth; d++) {
    if (have) {   // sort by the previous values (stable insertion sort, best first)
      for (int i = 1; i < n; i++) { int m = mv[i], v = last[i], j = i - 1; while (j >= 0 && last[j] < v) { mv[j + 1] = mv[j]; last[j + 1] = last[j]; j--; } mv[j + 1] = m; last[j + 1] = v; }
    }
    if (!rootValues(d, mv, n, vals)) break;
    for (int i = 0; i < n; i++) last[i] = vals[i];
    have = 1; depth = d;
    IO[0] = n; IO[1] = depth; for (int i = 0; i < n; i++) { IO[2 + 2 * i] = mv[i]; IO[3 + 2 * i] = vals[i]; }
    progress(d, n);
    int all = 1; for (int i = 0; i < n; i++) if (vals[i] <= WINT && vals[i] >= -WINT) { all = 0; break; }
    if (all) break;
    if (now() > deadline - ms * 0.45) break;
    (void)t0;
  }
  if (!have) { IO[0] = 0; IO[1] = 0; }
}

#ifdef MT
// ---------------------------------------------------------------- threads (engine_mt.wasm; shared/mtengine.js, mt-helper.js)
extern void __wasm_init_tls(void *);
EXPORT(mt_heap_base) u32 mt_heap_base(void) { return (u32)&__heap_base; }
EXPORT(mt_tls_size) u32 mt_tls_size(void) { return __builtin_wasm_tls_size(); }
// every instance first: mt_stack (its own stack: the top address; a function without a frame of its own), then mt_thread
EXPORT(mt_stack) void mt_stack(u32 stackTop) { __asm__ volatile(".globaltype __stack_pointer, i32\n local.get %0\n global.set __stack_pointer" :: "r"(stackTop)); }
// (the thread's own variables are set in a function of their own: in mt_thread itself the compiler reads the TLS base once,
// before __wasm_init_tls has moved it, and the stores would land in the old block)
static __attribute__((noinline)) void mtSelf(u32 tls, int id) {
  threadId = id;
  u32 a = (tls + __builtin_wasm_tls_size() + 63) & ~63u;   // (the stack grows down from the slot's top towards these)
  buf = (int (*)[MAXMV])a; a += sizeof(int) * (MAXPLY + 8) * MAXMV;
  scb = (int (*)[MAXMV])a;
  for (int i = 0; i < (MAXPLY + 8) * 2; i++) killer[i] = -1;
}
EXPORT(mt_thread) void mt_thread(u32 tls, int id) { __wasm_init_tls((void *)tls); mtSelf(tls, id); }
EXPORT(mt_id) int mt_id(void) { return threadId; }
EXPORT(mt_stop) void mt_stop(int v) { __atomic_store_n(&gStop, v, __ATOMIC_SEQ_CST); }
EXPORT(last_nodes) double last_nodes(void) { return nodes; }   // (this thread's last search: the page's nps readout)
#endif
