// Luxe Mancala — the alpha-beta search of engine.js in C (WebAssembly), 2026-11-11.
// The same rules (8), the same evaluation, the same move order, the same transposition table (2^21 entries, the same Zobrist
// keys and replacement) and the same iterative deepening as engine.js: the same moves, values, depths and node counts
// (tools/cmatch.js). engine.js keeps the rules for the page, the friendly levels and the thread plans; with the C engine
// loaded (the AI worker) search / rootValues / rootBest / think / analyze / solve / pvLine run here, about 10x faster.
// Builds (tools/build.sh): engine_simd.wasm (-msimd128) and engine.wasm (no SIMD), the same code (the search is integer).
// engine_mt.wasm (-DMT, 2026-11-14): the threads of the page's pool (shared/mtengine.js; the lead engine.js?…&mt=1, the helpers
// mt-helper.js) — thread-local search state, one lockless table in the shared memory, Praline's Young Brothers Wait
// (shared/praline/) at the nodes and the root (claude/mancala-spec.md「Praline」). Without -DMT the code is as before (the same
// engine.wasm / engine_simd.wasm, byte for byte).
typedef signed char i8; typedef unsigned char u8; typedef unsigned short u16; typedef unsigned int u32; typedef int i32;
#define EXPORT __attribute__((visibility("default")))
#ifdef MT
typedef unsigned long long u64;
#define TLS _Thread_local
#else
#define TLS
#endif
#ifdef NATIVE
double now(void);
#else
__attribute__((import_module("env"), import_name("now"))) double now(void);
#endif

// board: 0-5 pits of player 0, 6 its store, 7-12 pits of player 1, 13 its store; a move = pit 0-5 from the mover's first pit
enum { R_EASY, R_BASIC, R_KALAH, R_SUNKA, R_OWARE, R_MANGALA, R_BOHNEN, R_AYO };
typedef struct { int cap, relay, oware, feed, cyc, gen; } Rule;   // gen: 0 none, 1 mangala, 2 bohnen, 3 ayo
static const Rule RULES[8] = {
  { 0, 0, 0, 0, 0, 0 }, { 1, 0, 0, 0, 0, 0 }, { 2, 0, 0, 0, 0, 0 }, { 2, 1, 0, 0, 0, 0 },
  { 0, 0, 1, 1, 1, 0 }, { 0, 0, 0, 0, 0, 1 }, { 0, 0, 0, 0, 1, 2 }, { 0, 1, 0, 1, 1, 3 },
};
#define MAX_RELAY 120
static TLS const Rule *Rc = &RULES[R_KALAH];
static TLS int ridx = 2, TOTAL = 48;
static int sideSum(const u8 *b, int s) { int o = s ? 7 : 0; return b[o] + b[o + 1] + b[o + 2] + b[o + 3] + b[o + 4] + b[o + 5]; }
static void cp14(u8 *d, const u8 *s) { for (int i = 0; i < 14; i++) d[i] = s[i]; }
typedef struct { int extra, over; } Res;
static TLS Res RES;
// ---- sowing (engine.js play / playOware / playMangala / playBohnen / playAyo, without the animation events)
static void playStd(u8 *b, int side, int k, const Rule *R) {
  int ms = side ? 13 : 6, os = side ? 6 : 13, idx = (side ? 7 : 0) + k, n = b[idx], relays = 0;
  RES.extra = 0; RES.over = 0;
  b[idx] = 0;
  for (;;) {
    while (n > 0) { idx = idx == 13 ? 0 : idx + 1; if (idx == os) continue; b[idx]++; n--; }
    if (R->relay && idx != ms && b[idx] > 1 && relays < MAX_RELAY) { n = b[idx]; b[idx] = 0; relays++; continue; }
    break;
  }
  if (idx == ms) RES.extra = 1;
  else if (R->cap && b[idx] == 1 && (side ? idx >= 7 && idx <= 12 : idx <= 5)) {
    int o = 12 - idx;
    if (b[o] > 0) { int got = b[o] + (R->cap == 2 ? 1 : 0); b[ms] += got; b[o] = 0; if (R->cap == 2) b[idx] = 0; }
  }
  int s0 = b[0] + b[1] + b[2] + b[3] + b[4] + b[5], s1 = b[7] + b[8] + b[9] + b[10] + b[11] + b[12];
  if (s0 == 0 || s1 == 0) { RES.over = 1; b[6] += s0; b[13] += s1; for (int i = 0; i < 6; i++) { b[i] = 0; b[i + 7] = 0; } }
}
static int feeds(const u8 *b, int side, int k) { return b[(side ? 7 : 0) + k] >= 6 - k; }
static int canFeed(const u8 *b, int side) { for (int k = 0; k < 6; k++) if (feeds(b, side, k)) return 1; return 0; }
static void playOware(u8 *b, int side, int k) {
  int ms = side ? 13 : 6, os = side ? 6 : 13, ob = side ? 0 : 7, org = (side ? 7 : 0) + k, idx = org, n = b[idx];
  RES.extra = 0; RES.over = 0;
  b[idx] = 0;
  while (n > 0) { idx = idx == 13 ? 0 : idx + 1; if (idx == 6 || idx == 13 || idx == org) continue; b[idx]++; n--; }
  if (idx >= ob && idx <= ob + 5 && (b[idx] == 2 || b[idx] == 3)) {
    int j = idx, got = 0;
    while (j >= ob && (b[j] == 2 || b[j] == 3)) { got += b[j]; j--; }
    if (got != sideSum(b, 1 - side)) for (int i = idx; i > j; i--) { b[ms] += b[i]; b[i] = 0; }
  }
  int s0 = sideSum(b, 0), s1 = sideSum(b, 1), tot = b[6] + b[13] + s0 + s1;
  if (b[ms] * 2 > tot || b[os] * 2 > tot || (b[ms] * 2 == tot && b[os] * 2 == tot)) RES.over = 1;
  else if (sideSum(b, side) == 0 && !canFeed(b, 1 - side)) {
    RES.over = 1; b[6] += s0; b[13] += s1; for (int i = 0; i < 6; i++) { b[i] = 0; b[i + 7] = 0; }
  }
}
static void sweepTo(u8 *b, int to) {
  int s0 = sideSum(b, 0), s1 = sideSum(b, 1);
  RES.over = 1; RES.extra = 0;
  if (s0 + s1 == 0) return;
  if (to >= 0) b[to] += s0 + s1; else { b[6] += s0; b[13] += s1; }
  for (int i = 0; i < 6; i++) { b[i] = 0; b[i + 7] = 0; }
}
static int prevPit(int i) { return i == 0 ? 12 : i == 7 ? 5 : i - 1; }
static void playMangala(u8 *b, int side, int k) {
  int ms = side ? 13 : 6, os = side ? 6 : 13, ob = side ? 0 : 7, org = (side ? 7 : 0) + k, n = b[org], idx = org;
  RES.extra = 0; RES.over = 0;
  b[org] = 0;
  if (n > 1) { b[org]++; n--; }
  while (n > 0) { idx = idx == 13 ? 0 : idx + 1; if (idx == os) continue; b[idx]++; n--; }
  if (idx == ms) RES.extra = 1;
  else if (idx >= ob && idx <= ob + 5) { if (b[idx] % 2 == 0) { b[ms] += b[idx]; b[idx] = 0; } }
  else if (b[idx] == 1 && b[12 - idx] > 0) { int o = 12 - idx; b[ms] += b[o] + 1; b[o] = 0; b[idx] = 0; }
  int s0 = sideSum(b, 0), s1 = sideSum(b, 1);
  if (s0 == 0 || s1 == 0) sweepTo(b, s0 == 0 ? 6 : 13);
}
static void playBohnen(u8 *b, int side, int k) {
  int ms = side ? 13 : 6, org = (side ? 7 : 0) + k, n = b[org], idx = org;
  RES.extra = 0; RES.over = 0;
  b[org] = 0;
  while (n > 0) { idx = idx == 13 ? 0 : idx + 1; if (idx == 6 || idx == 13) continue; b[idx]++; n--; }
  int j = idx, c = 0;
  while (c < 12 && (b[j] == 2 || b[j] == 4 || b[j] == 6)) { b[ms] += b[j]; b[j] = 0; c++; j = prevPit(j); }
  if (sideSum(b, 1 - side) == 0) sweepTo(b, ms);
}
static void ayoCore(u8 *b, int side, int k) {
  int ms = side ? 13 : 6, mb = side ? 7 : 0, start = mb + k, idx = start, n = b[idx], relays = 0;
  b[idx] = 0;
  for (;;) {
    while (n > 0) { idx = idx == 13 ? 0 : idx + 1; if (idx == 6 || idx == 13 || idx == start) continue; b[idx]++; n--; }
    if (b[idx] > 1 && relays < MAX_RELAY) { n = b[idx]; b[idx] = 0; start = idx; relays++; continue; }
    break;
  }
  if (idx >= mb && idx <= mb + 5 && b[idx] == 1 && b[12 - idx] > 0) { int o = 12 - idx; b[ms] += b[o]; b[o] = 0; }
}
static int ayoFeeds(const u8 *b, int side, int k) { u8 t[14]; cp14(t, b); ayoCore(t, side, k); return sideSum(t, 1 - side) > 0; }
static void playAyo(u8 *b, int side, int k) {
  RES.extra = 0; RES.over = 0;
  int ms = side ? 13 : 6, os = side ? 6 : 13;
  ayoCore(b, side, k);
  if (sideSum(b, 1 - side) == 0) sweepTo(b, ms);
  else if (sideSum(b, side) == 0) {
    int ok = 0; for (int q = 0; q < 6 && !ok; q++) if (b[(side ? 0 : 7) + q] && ayoFeeds(b, 1 - side, q)) ok = 1;
    if (!ok) sweepTo(b, os);
  }
}
static void play(u8 *b, int side, int k, const Rule *R) {
  if (R->oware) playOware(b, side, k);
  else if (R->gen) { if (R->gen == 1) playMangala(b, side, k); else if (R->gen == 2) playBohnen(b, side, k); else playAyo(b, side, k); }
  else playStd(b, side, k, R);
}
// legal root moves (engine.js legal): returns the count, the pits in mv[]
static int legal(const u8 *b, int side, int *mv) {
  int o = side ? 7 : 0, n = 0, must = Rc->feed && sideSum(b, 1 - side) == 0;
  for (int k = 0; k < 6; k++) if (b[o + k] > 0 && (!must || (Rc->oware ? feeds(b, side, k) : ayoFeeds(b, side, k)))) mv[n++] = k;
  return n;
}

// ---- evaluation (engine.js evaluate / evalOware / evalGen), 1/100 seeds
#define INF 1000000
#define SEED 100
static int owareCap(const u8 *b, int side, int k) {
  int base = side ? 7 : 0, ob = side ? 0 : 7, org = base + k, n = b[org];
  if (!n) return 0;
  int lap = n > 11 ? n - 11 * ((n - 1) / 11) : n, laps = n > 11 ? (n - 1) / 11 : 0;
  int land = org, s = lap; while (s > 0) { land = land == 13 ? 0 : land + 1; if (land == 6 || land == 13 || land == org) continue; s--; }
  if (land < ob || land > ob + 5) return 0;
  int got = 0, j = land, dl = (land - org + 14) % 14;
  while (j >= ob) { int d = (j - org + 14) % 14, v = b[j] + laps + (d <= dl ? 1 : 0); if (v != 2 && v != 3) break; got += v; j--; }
  return got;
}
static int evalOware(const u8 *b, int side) {
  int ms = side ? 13 : 6, os = side ? 6 : 13, mb = side ? 7 : 0, ob = side ? 0 : 7;
  int my = 0, op = 0, myT = 0, opT = 0, myCap = 0, opCap = 0;
  for (int k = 0; k < 6; k++) {
    int m = b[mb + k], o = b[ob + k];
    my += m; op += o;
    if (o == 1 || o == 2) myT++;
    if (m == 1 || m == 2) opT++;
    int a = owareCap(b, side, k); if (a > myCap) myCap = a;
    int c = owareCap(b, 1 - side, k); if (c > opCap) opCap = c;
  }
  if (myCap >= op) myCap = 0;
  if (opCap >= my) opCap = 0;
  return (b[ms] - b[os]) * SEED + 6 * (my - op) + 14 * (myT - opT) + 45 * myCap - 25 * opCap;
}
static int evalGen(const u8 *b, int side) {
  int ms = side ? 13 : 6, os = side ? 6 : 13, mb = side ? 7 : 0, ob = side ? 0 : 7;
  int my = 0, op = 0, myG = 0, opG = 0; u8 t[14]; Res keep = RES;
  for (int k = 0; k < 6; k++) {
    my += b[mb + k]; op += b[ob + k];
    if (b[mb + k]) { cp14(t, b); play(t, side, k, Rc); int g = t[ms] - b[ms]; if (g > myG) myG = g; }
    if (b[ob + k]) { cp14(t, b); play(t, 1 - side, k, Rc); int g = t[os] - b[os]; if (g > opG) opG = g; }
  }
  RES = keep;
  int sw = Rc->gen == 2 ? 16 : 0;
  return (b[ms] - b[os]) * SEED + 40 * myG - 30 * opG + sw * (my - op);
}
static int evaluate(const u8 *b, int side) {
  const Rule *R = Rc;
  if (R->oware) return evalOware(b, side);
  if (R->gen) return evalGen(b, side);
  int ms = side ? 13 : 6, os = side ? 6 : 13, mb = side ? 7 : 0, ob = side ? 0 : 7;
  int mySeeds = 0, oppSeeds = 0, myExtra = 0, oppExtra = 0, myCap = 0, oppCap = 0;
  for (int k = 0; k < 6; k++) {
    int m = b[mb + k], o = b[ob + k];
    mySeeds += m; oppSeeds += o;
    if (R->relay) continue;
    if (m == 6 - k) myExtra++;
    if (o == 6 - k) oppExtra++;
    if (R->cap) {
      if (m > 0 && m < 6 - k) { int l = mb + k + m; if (b[l] == 0) { int v = b[12 - l]; if (v) { int g = v + (R->cap == 2 ? 1 : 0); if (g > myCap) myCap = g; } } }
      else if (m == 13) { int v = b[12 - mb - k] + 1; int g = v + (R->cap == 2 ? 1 : 0); if (g > myCap) myCap = g; }
      if (o > 0 && o < 6 - k) { int l = ob + k + o; if (b[l] == 0) { int v = b[12 - l]; if (v) { int g = v + (R->cap == 2 ? 1 : 0); if (g > oppCap) oppCap = g; } } }
    }
  }
  return (b[ms] - b[os]) * SEED + 22 * (mySeeds - oppSeeds) + 55 * myExtra - 30 * oppExtra + 55 * myCap - 32 * oppCap;
}

// ---- Zobrist keys (engine.js: the same xorshift from the same seed, the same order)
#define ZN 128
static u32 Z1[14 * ZN], Z2[14 * ZN], ZS1, ZS2, ZR1[8], ZR2[8];
static u32 zr = 0x9e3779b9u;
// (2026-11-14) through murmur3's fmix32 (engine.js the same): the raw xorshift outputs are linearly dependent and gave
// different positions the same 64-bit key
static u32 rnd(void) { zr ^= zr << 13; zr ^= zr >> 17; zr ^= zr << 5; u32 z = zr; z ^= z >> 16; z *= 0x85ebca6bu; z ^= z >> 13; z *= 0xc2b2ae35u; z ^= z >> 16; return z; }
static void zinit(void) {
  for (int i = 0; i < 14 * ZN; i++) { Z1[i] = rnd(); Z2[i] = rnd(); }
  ZS1 = rnd(); ZS2 = rnd();
  for (int i = 0; i < 5; i++) ZR1[i] = rnd();
  for (int i = 0; i < 5; i++) ZR2[i] = rnd();
  for (int i = 5; i < 8; i++) { ZR1[i] = rnd(); ZR2[i] = rnd(); }
}
#define TT_BITS 21
#define TT_SIZE (1 << TT_BITS)
#define TT_MASK (TT_SIZE - 1)
#ifndef MT
static u32 ttKey[TT_SIZE]; static i32 ttVal[TT_SIZE]; static u16 ttInfo[TT_SIZE];
#else
// (MT) one entry = two words written as a pair: w = value | info << 32, k = key ^ w (a torn pair does not match the key)
typedef struct { u64 k, w; } TE;
static TE TT[TT_SIZE];
static inline void ttLoad(u32 ti, u32 *key, i32 *val, int *info) {
  const u64 w = __atomic_load_n(&TT[ti].w, __ATOMIC_RELAXED), k = __atomic_load_n(&TT[ti].k, __ATOMIC_RELAXED);
  *val = (i32)(u32)w; *info = (int)((w >> 32) & 0xffff); *key = (u32)(k ^ w);
  if ((k ^ w) >> 32) *info = 0;
}
static inline void ttStore(u32 ti, u32 key, i32 val, int info) {
  const u64 w = (u64)(u32)val | (u64)(info & 0xffff) << 32;
  __atomic_store_n(&TT[ti].w, w, __ATOMIC_RELAXED); __atomic_store_n(&TT[ti].k, (u64)key ^ w, __ATOMIC_RELAXED);
}
#endif
enum { EXACT = 1, LOWER = 2, UPPER = 3, SOLVED = 255 };
// engine.js compares the stored key (Uint32Array) with the hash as a signed 32-bit number, so a hash with the top bit set never
// matches (half the probes miss and are always replaced). ttFix 0 keeps that (the same search as engine.js: the levels that
// read to a fixed depth play as before); ttFix 1 (the levels that read by time, the analysis) uses every entry.
static TLS int ttFix = 0;
#ifndef MT
#define TT_HIT(ti, h2) (ttKey[ti] == (h2) && ttInfo[ti] && (ttFix || (int)(h2) >= 0))
#endif
static void hashOf(const u8 *b, int side, u32 *a, u32 *c) {
  u32 h1 = side ? ZS1 : 0, h2 = side ? ZS2 : 0;
  for (int i = 0; i < 14; i++) { h1 ^= Z1[i * ZN + b[i]]; h2 ^= Z2[i * ZN + b[i]]; }
  *a = h1 ^ ZR1[ridx]; *c = h2 ^ ZR2[ridx];
}

// ---- search (engine.js search: the same order, bounds and table)
static TLS double nodes = 0, deadline = 1e300, nodeLim = 1e300;   // (nodeLim: the tests' node budgets, tools/)
static TLS int aborted = 0, cut = 0;
#define MAXPLY 256
static TLS u8 kidsB[MAXPLY][6][14];
#ifdef MT
// Praline (shared/praline/praline.h): a split point carries the node (board, side, rule) and its children (boards, who moves)
typedef int Move;
#define SP_MV 6
#define PL_SP_FIELDS u8 b[14]; u8 kb[6][14]; i8 ns[6]; u8 rx[6]; int side, ridx, total; volatile int cutAny;
#define stopFlag aborted
#define PL_ON_CLOSE(s) do { spCutOut = (s)->cutAny; if (spRxOut) for (int q_ = 0; q_ < (s)->n; q_++) spRxOut[q_] = (s)->rx[q_]; } while (0)
#include "../shared/praline/praline.h"
static TLS int spCutOut; static TLS u8 *spRxOut;
static inline void mtCheck(void) {
  if (now() > deadline || nodes > nodeLim || __atomic_load_n(&gStop, __ATOMIC_RELAXED)) aborted = 1;
  else if (curSP && chainStopped(curSP, curIdx)) aborted = 2;
  else if (dupMode && gOpenN > 0 && dupLeave()) aborted = 3;
}
static int search(const u8 *b, int side, int depth, int alpha, int beta, int ply);
// a split point of a node: the node and the children of its moves k (kids: the boards, ns: the next mover, -1 = over)
static void spFillNode(SPt *s, const u8 *b, int side, u8 (*kids)[14], const int *nside, const int *mv, int n) {
  cp14(s->b, b); s->side = side; s->ridx = ridx; s->total = TOTAL; s->cutAny = 0;
  for (int j = 0; j < n; j++) { s->mv[j] = mv[j]; cp14(s->kb[mv[j]], kids[mv[j]]); s->ns[mv[j]] = (i8)nside[mv[j]]; }
  s->n = n;
}
#endif
static int search(const u8 *b, int side, int depth, int alpha, int beta, int ply) {
#ifndef MT
  if (((long long)(++nodes) & 4095) == 0 && (now() > deadline || nodes > nodeLim)) { aborted = 1; return 0; }
#else
  if (((long long)(++nodes) & 1023) == 0) mtCheck();
  if (aborted) return 0;
#endif
  int ms = side ? 13 : 6, os = side ? 6 : 13;
  int hi = (TOTAL - 2 * b[os]) * SEED, lo = (2 * b[ms] - TOTAL) * SEED;
  if (lo >= beta) return lo;
  if (hi <= alpha) return hi;
  if (alpha < lo) alpha = lo;
  if (beta > hi) beta = hi;
  if (depth <= 0 || ply >= MAXPLY - 1) {
    cut = 1;
    int v = evaluate(b, side);
    return v < lo ? lo : v > hi ? hi : v;
  }
  u32 h1, h2; hashOf(b, side, &h1, &h2);
  u32 ti = h1 & TT_MASK;
  int ttMove = -1;
#ifndef MT
  if (TT_HIT(ti, h2)) {
    int inf = ttInfo[ti], d = inf & 255, f = (inf >> 8) & 3;
    ttMove = (inf >> 10) - 1;
    if (d >= depth) {
      int v = ttVal[ti];
#else
  u32 eKey; i32 eVal; int eInf; ttLoad(ti, &eKey, &eVal, &eInf);
  if (eKey == h2 && eInf) {
    int inf = eInf, d = inf & 255, f = (inf >> 8) & 3;
    ttMove = (inf >> 10) - 1;
    if (d >= depth) {
      int v = eVal;
#endif
      if (f == EXACT || (f == LOWER && v >= beta) || (f == UPPER && v <= alpha)) { if (d != SOLVED) cut = 1; return v; }
    }
  }
  u8 (*kids)[14] = kidsB[ply];
  int base = side ? 7 : 0, order[6], key[6], nside[6], no = 0;
  int must = Rc->feed && sideSum(b, 1 - side) == 0;
  for (int k = 0; k < 6; k++) {
    if (!b[base + k] || (must && Rc->oware && b[base + k] < 6 - k)) continue;
    u8 *c = kids[k]; cp14(c, b);
    play(c, side, k, Rc);
    if (must && !RES.over && sideSum(c, 1 - side) == 0) continue;
    int s;
    if (RES.over) { s = 1000000 + (c[ms] - c[os]) * 10; nside[k] = -1; }
    else { s = (RES.extra ? 5000 : 0) + (c[ms] - b[ms]) * 100 - k; nside[k] = RES.extra ? side : 1 - side; }
    if (k == ttMove) s += 10000000;
    // (stable insertion by the key, descending: Array.prototype.sort is stable)
    int j = no++; while (j > 0 && key[order[j - 1]] < s) { order[j] = order[j - 1]; j--; }
    order[j] = k; key[k] = s;
  }
  if (!no) return (b[ms] - b[os]) * SEED;
  int a0 = alpha, best = -INF, bestK = order[0];
  int prevCut = cut; cut = 0;
  for (int i = 0; i < no; i++) {
#ifdef MT
    // YBW: the first move is done and a helper is idle (or an owner above waits): the other moves, in this order, to a split point
    if (i >= 1 && depth >= splitD && no - i >= 2 && (gIdle > 0 || (gWaitN > 0 && spWanted()))) {
      SPt *s = spAlloc();
      if (s) {
        spFillNode(s, b, side, kids, nside, order + i, no - i);
        s->depth = depth; s->ply = ply; s->root = 0; s->all = 0; s->pv = 0; s->beta = beta; s->alpha = alpha;
        Move bk = bestK; spRun(s, &best, &bk, 0); bestK = bk;
        if (spCutOut) cut = 1;
        if (aborted) return 0;
        break;
      }
    }
#endif
    int k = order[i], v; const u8 *c = kids[k];
    if (nside[k] == -1) v = (c[ms] - c[os]) * SEED;
    else if (nside[k] == side) v = search(c, side, depth - 1, alpha, beta, ply + 1);
    else v = -search(c, 1 - side, depth - 1, -beta, -alpha, ply + 1);
    if (aborted) return 0;
    if (v > best) { best = v; bestK = k; }
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  int subCut = cut; cut = prevCut || subCut;
  int f = best <= a0 ? UPPER : best >= beta ? LOWER : EXACT;
  int d = subCut ? (depth < 250 ? depth : 250) : SOLVED;
#ifndef MT
  if (!ttInfo[ti] || (ttInfo[ti] & 255) <= d || ttKey[ti] != h2 || (!ttFix && (int)h2 < 0)) { ttKey[ti] = h2; ttVal[ti] = best; ttInfo[ti] = (u16)(d | (f << 8) | ((bestK + 1) << 10)); }
#else
  ttLoad(ti, &eKey, &eVal, &eInf);
  if (!eInf || (eInf & 255) <= d || eKey != h2) ttStore(ti, h2, best, d | (f << 8) | ((bestK + 1) << 10));
#endif
  return best;
}
#ifdef MT
// ---- Praline's glue (praline_ybw.h)
// the move i of s from s's node with the window (a, beta) — as the one-thread loop (the root: as mc_rootbest / mc_rootvalues);
// the move's "not exact" goes to s->cutAny (and, at the root, its own flag rx)
static int spSearch(SPt *s, int i, int a) {
  const int k = s->mv[i], side = s->side, ns = s->ns[k], d = s->depth, ms = side ? 13 : 6, os = side ? 6 : 13;
  const u8 *c = s->kb[k]; const int oc = cut; cut = 0; int v;
  if (ns == -1) v = (c[ms] - c[os]) * SEED;
  else if (s->root && s->all) v = ns == side ? search(c, side, d - 1, -INF, INF, 1) : -search(c, 1 - side, d - 1, -INF, INF, 1);
  else if (s->root) {
    if (ns == side) { v = search(c, side, d - 1, a, a + 1, 1); if (!aborted && v > a) v = search(c, side, d - 1, a, INF, 1); }
    else { v = -search(c, 1 - side, d - 1, -a - 1, -a, 1); if (!aborted && v > a) v = -search(c, 1 - side, d - 1, -INF, -a, 1); }
  }
  else if (ns == side) v = search(c, side, d - 1, a, s->beta, s->ply + 1);
  else v = -search(c, 1 - side, d - 1, -s->beta, -a, s->ply + 1);
  if (!aborted) { if (cut) __atomic_store_n(&s->cutAny, 1, __ATOMIC_RELAXED); if (s->root) s->rx[i] = !cut; }
  else __atomic_store_n(&s->cutAny, 1, __ATOMIC_RELAXED);
  cut = oc;
  return v;
}
static void spLoadPos(const SPt *s, int top, int fresh) { (void)top; (void)fresh; Rc = &RULES[s->ridx]; ridx = s->ridx; TOTAL = s->total; }
static inline int spTop(void) { return 0; }
static void spCutoff(const SPt *s, int i) { (void)s; (void)i; }
static void waitCheck(void) { SIM_IDLE(); mtCheck(); }
static void spIdleReset(int fresh) { (void)fresh; nodes = 0; deadline = 1e300; nodeLim = 1e300; aborted = 0; }
#undef EXPORT
#define EXPORT(n) __attribute__((visibility("default")))   /* (Praline's form: EXPORT(name)) */
#include "../shared/praline/praline_ybw.h"
#undef EXPORT
#define EXPORT __attribute__((visibility("default")))
#endif

// ---- the page's interface: the board in BRD, results in OUT
static u8 BRD[14];
static int OUTM[8], OUTV[8], OUTX[8];   // per root move: pit, value (1/100 seeds), exact
static double OUTN[4];                  // nodes, depth, value, exact of the last call
static int inited = 0;
EXPORT u8 *mc_board(void) { return BRD; }
EXPORT int *mc_outm(void) { return OUTM; }
EXPORT int *mc_outv(void) { return OUTV; }
EXPORT int *mc_outx(void) { return OUTX; }
EXPORT double mc_nodes(void) { return nodes; }
// engine.js setup(): the rule (index in RULE_IDS) and the seed total of BRD
EXPORT void mc_setup(int rule) {
  if (!inited) { zinit(); inited = 1; }
  if (rule < 0 || rule > 7) rule = R_KALAH;
  Rc = &RULES[rule]; ridx = rule;
  TOTAL = 0; for (int i = 0; i < 14; i++) TOTAL += BRD[i];
}
EXPORT void mc_ttfix(int on) { ttFix = on ? 1 : 0; }
#ifndef MT
EXPORT void mc_ttclear(void) { for (int i = 0; i < TT_SIZE; i++) { ttKey[i] = 0; ttInfo[i] = 0; } }
#else
EXPORT void mc_ttclear(void) { for (int i = 0; i < TT_SIZE; i++) { TT[i].k = 0; TT[i].w = 0; } }
#endif
// begin a job: nodes 0, the deadline (ms from now; 0 = none)
EXPORT void mc_begin(double ms) { nodes = 0; aborted = 0; deadline = ms > 0 ? now() + ms : 1e300; }
EXPORT void mc_until(double t) { deadline = t; aborted = 0; }   // (a new deadline: the next search starts afresh)
EXPORT void mc_nodelimit(double n) { nodeLim = n > 0 ? n : 1e300; }
EXPORT int mc_aborted(void) { return aborted; }
// rootValues(BRD, side, depth): every legal root move at the depth (full window); returns the count (-1: aborted)
EXPORT int mc_rootvalues(int side, int depth) {
  int mv[6], n = legal(BRD, side, mv), ms = side ? 13 : 6, os = side ? 6 : 13;
#ifdef MT
  if (n >= 2 && depth >= splitD && gIdle > 0) {   // every root move with the full window: split from the first
    SPt *s = spAlloc();
    if (s) {
      u8 kids[6][14]; int nside[6];
      for (int i = 0; i < n; i++) { u8 *c = kids[mv[i]]; cp14(c, BRD); play(c, side, mv[i], Rc); nside[mv[i]] = RES.over ? -1 : RES.extra ? side : 1 - side; }
      spFillNode(s, BRD, side, kids, nside, mv, n);
      for (int i = 0; i < n; i++) s->rx[i] = 0;
      s->depth = depth; s->ply = 0; s->root = 1; s->all = 1; s->pv = 1; s->beta = INF + 1; s->alpha = -INF - 1;
      int vals[SP_MV], bst = -INF - 1; Move bk = mv[0]; u8 rx[6];
      for (int i = 0; i < n; i++) vals[i] = -INF - 1;
      // (rx: copied in PL_ON_CLOSE's place below, before the slot is freed — spRun frees it)
      spRxOut = rx; spRun(s, &bst, &bk, vals); spRxOut = 0;
      if (aborted) return -1;
      for (int i = 0; i < n; i++) { if (vals[i] == -INF - 1) return -1; OUTM[i] = mv[i]; OUTV[i] = vals[i]; OUTX[i] = rx[i]; }
      return n;
    }
  }
#endif
  for (int i = 0; i < n; i++) {
    u8 c[14]; cp14(c, BRD); play(c, side, mv[i], Rc);
    cut = 0; int v;
    if (RES.over) v = (c[ms] - c[os]) * SEED;
    else if (RES.extra) v = search(c, side, depth - 1, -INF, INF, 1);
    else v = -search(c, 1 - side, depth - 1, -INF, INF, 1);
    if (aborted) return -1;
    OUTM[i] = mv[i]; OUTV[i] = v; OUTX[i] = !cut;
  }
  return n;
}
// rootBest(BRD, side, depth, prevBest, rot): OUTM[0] move, OUTV[0] value, OUTX[0] exact; returns 0 / -1 aborted
EXPORT int mc_rootbest(int side, int depth, int prevBest, int rot) {
  int ms = side ? 13 : 6, os = side ? 6 : 13, mv[6], n = legal(BRD, side, mv), moves[6], nm = 0;
  if (prevBest >= 0) { int has = 0; for (int i = 0; i < n; i++) if (mv[i] == prevBest) has = 1; if (has) { moves[nm++] = prevBest; for (int i = 0; i < n; i++) if (mv[i] != prevBest) moves[nm++] = mv[i]; } }
  if (!nm) { for (int i = 0; i < n; i++) moves[i] = mv[i]; nm = n; }
  if (rot && nm) { int k = rot % nm, t[6]; for (int i = 0; i < nm; i++) t[i] = moves[(i + k) % nm]; for (int i = 0; i < nm; i++) moves[i] = t[i]; }
  int alpha = -INF, best = -INF, bestK = nm ? moves[0] : -1, anyCut = 0;
  for (int i = 0; i < nm; i++) {
#ifdef MT
    if (i == 1 && nm - 1 >= 2 && depth >= splitD && gIdle > 0) {   // YBW at the root: the first move is done
      SPt *s = spAlloc();
      if (s) {
        u8 kids[6][14]; int nside[6];
        for (int j = 1; j < nm; j++) { u8 *c = kids[moves[j]]; cp14(c, BRD); play(c, side, moves[j], Rc); nside[moves[j]] = RES.over ? -1 : RES.extra ? side : 1 - side; }
        spFillNode(s, BRD, side, kids, nside, moves + 1, nm - 1);
        s->depth = depth; s->ply = 0; s->root = 1; s->all = 0; s->pv = 1; s->beta = INF + 1; s->alpha = alpha;
        int vals[SP_MV]; Move bk = bestK; spRun(s, &best, &bk, vals); bestK = bk;
        if (spCutOut) anyCut = 1;
        if (aborted) return -1;
        break;
      }
    }
#endif
    int k = moves[i]; u8 c[14]; cp14(c, BRD); play(c, side, k, Rc);
    cut = 0; int v;
    if (RES.over) v = (c[ms] - c[os]) * SEED;
    else if (RES.extra) {
      v = search(c, side, depth - 1, alpha, alpha + 1, 1);
      if (!aborted) { if (v > alpha && best > -INF) v = search(c, side, depth - 1, alpha, INF, 1); else if (best == -INF) v = search(c, side, depth - 1, -INF, INF, 1); }
    } else {
      if (best == -INF) v = -search(c, 1 - side, depth - 1, -INF, INF, 1);
      else { v = -search(c, 1 - side, depth - 1, -alpha - 1, -alpha, 1); if (!aborted && v > alpha) v = -search(c, 1 - side, depth - 1, -INF, -alpha, 1); }
    }
    if (aborted) return -1;
    if (cut) anyCut = 1;
    if (v > best) { best = v; bestK = k; }
    if (v > alpha) alpha = v;
  }
  OUTM[0] = bestK; OUTV[0] = best; OUTX[0] = !anyCut;
  return 0;
}
// a node's search (the threads' mtV): BRD with side to move, depth d, window (a, b), ply; OUTV[0] value, OUTX[0] exact
EXPORT int mc_search(int side, int d, int a, int b, int ply) {
  cut = 0; int v = search(BRD, side, d, a, b, ply);
  OUTV[0] = v; OUTX[0] = !cut; return aborted ? -1 : 0;
}
// the table's move for BRD (side to move), -1 if none (engine.js ttMoveOf)
EXPORT int mc_ttmove(int side) {
  u32 h1, h2; hashOf(BRD, side, &h1, &h2); u32 ti = h1 & TT_MASK;
#ifndef MT
  return TT_HIT(ti, h2) ? (ttInfo[ti] >> 10) - 1 : -1;
#else
  u32 eKey; i32 eVal; int eInf; ttLoad(ti, &eKey, &eVal, &eInf);
  return eKey == h2 && eInf ? (eInf >> 10) - 1 : -1;
#endif
}
// play pit k on BRD (for the page's line walks); returns 1 over, 2 extra turn, 0 otherwise
EXPORT int mc_play(int side, int k) { play(BRD, side, k, Rc); return RES.over ? 1 : RES.extra ? 2 : 0; }
EXPORT int mc_eval(int side) { return evaluate(BRD, side); }
#ifdef MT
// ---- the threads (engine_mt.wasm: shared/mtengine.js, the lead engine.js?…&mt=1, the helpers mt-helper.js)
EXPORT void mt_stop(int v) { __atomic_store_n(&gStop, v, __ATOMIC_SEQ_CST); }
#ifndef NATIVE
extern unsigned char __heap_base;
extern void __wasm_init_tls(void *);
EXPORT unsigned mt_heap_base(void) { return (unsigned)&__heap_base; }
EXPORT void mt_stack(unsigned stackTop) { __asm__ volatile(".globaltype __stack_pointer, i32\n local.get %0\n global.set __stack_pointer" :: "r"(stackTop)); }
EXPORT void mt_thread(unsigned tls, int id) { __wasm_init_tls((void *)tls); threadId = id; }
#endif
#endif
