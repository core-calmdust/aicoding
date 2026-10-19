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

static i32 IO[8192];
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
}

// ---------------------------------------------------------------- position
typedef struct { i8 b[24]; u32 bb[3]; i8 hand[3], cnt[3]; int side, quiet; u32 h1, h2; int stk[MAXPLY + 1024]; int sp; } Pos;
static Pos P;
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
static int buf[MAXPLY + 8][MAXMV], scb[MAXPLY + 8][MAXMV];
static int killer[(MAXPLY + 8) * 2], histT[32 * 32];
static u32 rep[4096]; static int repLen;
static double nodes, maxNodes, deadline; static int aborted;
static void checkAbort(void) { if (now() > deadline || nodes > maxNodes) aborted = 1; }
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
  u32 idx = p->h1 & TT_MASK; int ttm = -1;
  if (tk1[idx] == p->h1 && tk2[idx] == p->h2) {
    ttm = tmv[idx];
    if (ply > 0 && td[idx] >= depth) {
      int v = tv[idx]; if (v > WINT) v -= ply; else if (v < -WINT) v += ply;
      int f = tfl[idx];
      if (f == 0 || (f == 1 && v >= beta) || (f == 2 && v <= alpha)) return v;
    }
  }
  int *mv = buf[ply], n = gen(p, mv);
  if (n == 0) return p->cnt[1] + p->cnt[2] == N ? 0 : -(WIN - ply);
  int *sc = scb[ply];
  order(p, mv, n, ply, ttm, sc);
  int a0 = alpha, best = -INF, bm = mv[0];
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
  tk1[idx] = p->h1; tk2[idx] = p->h2; tv[idx] = (int16_t)sv; tmv[idx] = bm; td[idx] = (i8)depth;
  tfl[idx] = best >= beta ? 1 : best <= a0 ? 2 : 0;
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

// ---------------------------------------------------------------- host API
static int rootMv[MAXMV], rootN;
static int startQuiet;
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
  for (int i = 0; i < TT_SIZE; i++) { tk1[i] = 0; tk2[i] = 0; td[i] = 0; tfl[i] = 0; }
  for (int i = 0; i < 32 * 32; i++) histT[i] = 0;
  for (int i = 0; i < (MAXPLY + 8) * 2; i++) killer[i] = -1;
}
static void limit(double ms, double mn) { nodes = 0; aborted = 0; deadline = ms > 0 ? now() + ms : 1e300; maxNodes = mn > 0 ? mn : 1e300; }
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
  for (int d = 1; d <= maxDepth; d++) {
    int k = 0; ord[k++] = bestM; for (int i = 0; i < rootN; i++) if (rootMv[i] != bestM) ord[k++] = rootMv[i];
    int alpha = -INF, bm = bestM, bv = -INF;
    for (int i = 0; i < rootN; i++) {
      int m = ord[i], v;
      play(p, m); rep[repLen++] = p->h1;
      int st = quickStatus(p, 1);
      if (st != INF + 1) v = -st;
      else if (i == 0) v = -search(p, d - 1, -INF, INF, 1);
      else { v = -search(p, d - 1, -alpha - 1, -alpha, 1); if (v > alpha && !aborted) v = -search(p, d - 1, -INF, -alpha, 1); }
      repLen--; undo(p, m);
      if (aborted) break;
      if (v > bv) { bv = v; bm = m; if (v > alpha) alpha = v; }
    }
    if (aborted) break;
    bestM = bm; bestV = bv; done = d;
    if (bv > WINT || bv < -WINT) break;
  }
  IO[0] = bestM; IO[1] = bestV; IO[2] = done;
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
