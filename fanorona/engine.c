// Fanorona (9x5, "fanoron-tsivy") search engine in C, compiled to WebAssembly for the browser
// (also builds natively for the tools: -DNATIVE).
//
// Board: 45 points, index i = r * 9 + c (r = 0..4 is row 1..5 from White's side, c = 0..8 is column a..i).
// A point is "strong" (has diagonals) when r + c is even. White (side 0) moves first.
// A turn: a piece steps to an adjacent empty point along a line. A capture is an approach (the next point beyond the
// landing point holds an enemy: that piece and every enemy directly behind it in the same line are removed) or a
// withdrawal (moving straight away from an adjacent enemy: that line is removed). A move cannot do both; the player
// chooses. Capturing is compulsory (a non-capturing "paika" move only when no capture exists). After a capture the
// same piece MAY continue capturing (optional): each step must change direction and may not land on a point the piece
// already visited this turn (including the start). A side with no piece / no legal move loses.
// Draws (host + search): threefold repetition / 80 plies without a capture.
//
// A turn is one "move" for the search: start point, a list of steps (direction + approach/withdraw), the captured set.
//
// Build (wasm): see tools/build.sh. Host protocol: the shared i32 buffer at io_ptr() (see the EXPORTs at the end).
#include <stdint.h>
// MT (engine_mt.wasm, tools/build.sh): several threads search one root together on a shared memory ("Lazy SMP"); the state of
// one search is thread-local (TLS), the geometry, the evaluation weights, the endgame tables and the transposition table are
// shared. Without it TLS is nothing and the normal builds stay byte for byte as before.
#ifdef MT
#define TLS _Thread_local
#else
#define TLS
#endif
typedef int32_t i32; typedef uint32_t u32; typedef int8_t i8; typedef uint8_t u8; typedef int16_t i16; typedef uint16_t u16; typedef uint64_t u64;
#ifdef NATIVE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#define EXPORT(name)
static double now(void) { struct timespec ts; clock_gettime(CLOCK_MONOTONIC, &ts); return ts.tv_sec * 1000.0 + ts.tv_nsec / 1e6; }
static void progress(int depth, int count) { (void)depth; (void)count; }
#else
#define EXPORT(name) __attribute__((export_name(#name)))
#define IMPORT(name) __attribute__((import_module("env"), import_name(#name)))
IMPORT(now) double now(void);
IMPORT(progress) void progress(int depth, int count);
void *memset(void *d, int c, unsigned long n) { u8 *p = (u8 *)d; while (n--) *p++ = (u8)c; return d; }
void *memcpy(void *d, const void *s, unsigned long n) { u8 *p = (u8 *)d; const u8 *q = (const u8 *)s; while (n--) *p++ = *q++; return d; }
#endif

#define WIN 30000
#define WINT 29000
#define INF 32000
#define MAXPLY 96
#define MAXMV 320
#define MAXST 13
#define DRAW_PLIES 80
#define NP 45

static TLS i32 IO[8192];
EXPORT(io_ptr) i32 *io_ptr(void) { return IO; }

// ---------------------------------------------------------------- geometry
// directions 0 E, 1 NE, 2 N, 3 NW, 4 W, 5 SW, 6 S, 7 SE (odd = diagonal); opposite = d ^ 4
static const int DR[8] = { 0, 1, 1, 1, 0, -1, -1, -1 }, DC[8] = { 1, 1, 0, -1, -1, -1, 0, 1 };
static i8 NB[8][NP];
static u64 ZP[2][NP], ZSIDE;
static int geoReady = 0, GW = 9, GH = 5, ruleStd = 1, ALQ = 0, ALQF = 0;   // ALQF: Alfonso's Alquerque (steps in any direction; set_alq(2))
   // ALQ: Alquerque (jumps, steps forward / sideways only)   // board size (5x5 Fanoron-Dimy uses the points r < 5, c < 5)
static int AQV = 11;   // Alquerque evaluation / search (bits: 1 evaluation alqHand, 2 forced jumps searched out in the
                      // quiescence, 8 endgame databases; 0 = the 2026-10 engine, kept for tools/alqmatch.c)
static u64 rs64 = 0x9E3779B97F4A7C15ull;
static u64 rnd64(void) { rs64 ^= rs64 << 13; rs64 ^= rs64 >> 7; rs64 ^= rs64 << 17; return rs64; }
static void buildNB(void) {
  for (int i = 0; i < NP; i++) {
    int r = i / 9, c = i % 9, strong = !((r + c) & 1), ok = r < GH && c < GW;
    for (int d = 0; d < 8; d++) {
      int nr = r + DR[d], nc = c + DC[d];
      NB[d][i] = !ok || ((d & 1) && !strong) || nr < 0 || nr >= GH || nc < 0 || nc >= GW ? -1 : (i8)(nr * 9 + nc);
    }
  }
}
static void initGeo(void) {
  if (geoReady) return;
  buildNB();
  for (int s = 0; s < 2; s++) for (int i = 0; i < NP; i++) ZP[s][i] = rnd64();
  ZSIDE = rnd64();
  geoReady = 1;
}
#define BIT(i) (1ull << (i))
static inline int pc(u64 x) { return __builtin_popcountll(x); }
static inline int ctz(u64 x) { return __builtin_ctzll(x); }

typedef struct { u64 p[2]; int side; } Pos;
typedef struct { u64 cap; u8 f, t, n, paika, ncap; u8 st[MAXST]; } Move;   // st = dir | kind << 3 (kind 0 approach, 1 withdraw)

static u64 hashOf(const Pos *p) {
  u64 h = 0;
  for (int s = 0; s < 2; s++) { u64 x = p->p[s]; while (x) { int i = ctz(x); x &= x - 1; h ^= ZP[s][i]; } }
  if (p->side) h ^= ZSIDE;
  return h;
}
// the line of enemies removed by a step from `from` in direction d (kind 0 approach, 1 withdraw); 0 if none
static inline u64 lineCap(int from, int d, int kind, u64 opp) {
  int s, dd;
  if (kind == 0) { int t = NB[d][from]; if (t < 0) return 0; s = NB[d][t]; dd = d; }
  else { s = NB[d ^ 4][from]; dd = d ^ 4; }
  u64 m = 0;
  while (s >= 0 && (opp & BIT(s))) { m |= BIT(s); s = NB[dd][s]; }
  return m;
}
// ---------------------------------------------------------------- move generation
static TLS Move *GL; static TLS int GN, GMAX;
static void addMove(const Move *m) {
  for (int i = 0; i < GN; i++) if (GL[i].f == m->f && GL[i].t == m->t && GL[i].cap == m->cap) return;   // same result
  if (GN < GMAX) GL[GN++] = *m;
}
static void capDFS(int cur, int lastDir, u64 visited, u64 own, u64 opp, Move *m) {
  if (m->n >= MAXST) return;
  u64 occ = own | opp;
  for (int d = 0; d < 8; d++) {
    if (d == lastDir) continue;
    int t = NB[d][cur]; if (t < 0 || (occ & BIT(t)) || (visited & BIT(t))) continue;
    for (int k = 0; k < 2; k++) {
      u64 c = lineCap(cur, d, k, opp);
      if (!c) continue;
      Move mm = *m;
      mm.st[mm.n++] = (u8)(d | (k << 3)); mm.t = (u8)t; mm.cap |= c; mm.ncap = (u8)pc(mm.cap);
      addMove(&mm);
      capDFS(t, d, visited | BIT(t), (own & ~BIT(cur)) | BIT(t), opp & ~c, &mm);
    }
  }
}
// Alquerque: jump over an adjacent enemy to the empty point beyond; the chain must go on while it can (only full chains)
static void alqDFS(int cur, u64 own, u64 opp, Move *m) {
  int any = 0;
  if (m->n < MAXST) for (int d = 0; d < 8; d++) {
    int mid = NB[d][cur]; if (mid < 0 || !(opp & BIT(mid))) continue;
    int t = NB[d][mid]; if (t < 0 || ((own | opp) & BIT(t))) continue;
    any = 1;
    Move mm = *m; mm.st[mm.n++] = (u8)(d | (1 << 3)); mm.t = (u8)t; mm.cap |= BIT(mid); mm.ncap = (u8)pc(mm.cap);
    alqDFS(t, (own & ~BIT(cur)) | BIT(t), opp & ~BIT(mid), &mm);
  }
  if (!any && m->n) addMove(m);
}
static inline int alqJumpFrom(int i, u64 occ, u64 opp) {
  for (int d = 0; d < 8; d++) { int mid = NB[d][i]; if (mid < 0 || !(opp & BIT(mid))) continue; int t = NB[d][mid]; if (t >= 0 && !(occ & BIT(t))) return 1; }
  return 0;
}
static inline int alqDirOk(int side, int d) { return ALQF || (side ? DR[d] <= 0 : DR[d] >= 0); }
static int genCaps(const Pos *p, Move *L, int max) {
  GL = L; GN = 0; GMAX = max;
  u64 own = p->p[p->side], opp = p->p[p->side ^ 1], x = own;
  while (x) {
    int i = ctz(x); x &= x - 1;
    Move m; memset(&m, 0, sizeof m); m.f = (u8)i; m.t = (u8)i;
    if (ALQ) alqDFS(i, own, opp, &m); else capDFS(i, -1, BIT(i), own, opp, &m);
  }
  return GN;
}
static int hasCaps(const Pos *p) {
  u64 own = p->p[p->side], opp = p->p[p->side ^ 1], occ = own | opp, x = own;
  if (ALQ) { while (x) { int i = ctz(x); x &= x - 1; if (alqJumpFrom(i, occ, opp)) return 1; } return 0; }
  while (x) {
    int i = ctz(x); x &= x - 1;
    for (int d = 0; d < 8; d++) { int t = NB[d][i]; if (t < 0 || (occ & BIT(t))) continue; if (lineCap(i, d, 0, opp) || lineCap(i, d, 1, opp)) return 1; }
  }
  return 0;
}
static int genPaika(const Pos *p, Move *L, int max) {
  int n = 0; u64 own = p->p[p->side], occ = p->p[0] | p->p[1], x = own;
  while (x) {
    int i = ctz(x); x &= x - 1;
    for (int d = 0; d < 8; d++) {
      int t = NB[d][i]; if (t < 0 || (occ & BIT(t))) continue;
      if (ALQ && !alqDirOk(p->side, d)) continue;
      if (n >= max) return n;
      Move *m = &L[n++]; memset(m, 0, sizeof *m); m->f = (u8)i; m->t = (u8)t; m->n = 1; m->paika = 1; m->st[0] = (u8)d;
    }
  }
  return n;
}
static int gen(const Pos *p, Move *L) { int n = genCaps(p, L, MAXMV); return n ? n : genPaika(p, L, MAXMV); }
static int anyMove(const Pos *p) {
  u64 own = p->p[p->side], occ = p->p[0] | p->p[1], x = own;
  if (ALQ && hasCaps(p)) return 1;
  while (x) { int i = ctz(x); x &= x - 1; for (int d = 0; d < 8; d++) { int t = NB[d][i]; if (t >= 0 && !(occ & BIT(t)) && (!ALQ || alqDirOk(p->side, d))) return 1; } }
  return 0;
}
static inline void doMove(Pos *p, const Move *m) {
  int s = p->side;
  p->p[s] ^= BIT(m->f) ^ BIT(m->t);
  p->p[s ^ 1] &= ~m->cap;
  p->side = s ^ 1;
}
static inline u64 hashMove(u64 h, const Pos *p, const Move *m) {
  int s = p->side; h ^= ZP[s][m->f] ^ ZP[s][m->t] ^ ZSIDE;
  u64 c = m->cap; while (c) { int i = ctz(c); c &= c - 1; h ^= ZP[s ^ 1][i]; }
  return h;
}
static inline int sameMove(const Move *a, const Move *b) { return a->f == b->f && a->t == b->t && a->cap == b->cap; }

// ---------------------------------------------------------------- endgame databases (side-to-move view, colour-symmetric rules)
// table (a, b): a = pieces of the side to move, b = opponent's; one byte per position: 0 draw, 1..127 win in d plies,
// 128 + d loss in d plies (d counted with this side to move). Index: rank of the own set among 45 points times C(45 - a, b)
// plus the rank of the opponent set among the remaining points. Built by tools/egdb.c, loaded by the host (eg_add).
#define EGMAX 4
static u32 CB[46][EGMAX + 2];
static const u8 *EG[EGMAX + 1][EGMAX + 1];
static int egMaxN = 0;
static void initCB(void) {
  if (CB[1][1]) return;
  for (int n = 0; n <= 45; n++) { CB[n][0] = 1; for (int k = 1; k <= EGMAX + 1; k++) CB[n][k] = n == 0 ? 0 : CB[n - 1][k - 1] + CB[n - 1][k]; }
}
static u32 egIndex(u64 own, u64 opp, int a, int b) {
  u32 r1 = 0, r2 = 0; int j = 0; u64 x = own;
  while (x) { int i = ctz(x); x &= x - 1; j++; r1 += CB[i][j]; }
  j = 0; x = opp;
  while (x) { int i = ctz(x); x &= x - 1; j++; int ci = i - pc(own & (BIT(i) - 1)); r2 += CB[ci][j]; }
  return r1 * CB[45 - a][b] + r2;
}
EXPORT(eg_size) u32 eg_size(int a, int b) { initCB(); return CB[45][a] * CB[45 - a][b]; }
EXPORT(eg_add) void eg_add(int a, int b, const u8 *data) { initCB(); if (a < 1 || b < 1 || a > EGMAX || b > EGMAX) return; EG[a][b] = data; int n = a + b; int all = 1; for (int x = 1; x <= EGMAX; x++) for (int y = 1; y <= EGMAX; y++) if (x + y <= n && !EG[x][y]) all = 0; if (all && n > egMaxN) egMaxN = n; }
// -1 = not in the databases
static inline int egProbe(const Pos *p) {
  u64 own = p->p[p->side], opp = p->p[p->side ^ 1];
  int a = pc(own), b = pc(opp);
  if (a + b > egMaxN || !a || !b || a > EGMAX || b > EGMAX || !EG[a][b]) return -1;
  return EG[a][b][egIndex(own, opp, a, b)];
}
// Alquerque (5x5, not colour-symmetric: the steps go forward): tables for White to move on the 25 points (k = r * 5 + c);
// with Black to move the board is turned (row r -> 4 - r) and the colours swapped. Built by tools/alqegdb.c.
static const u8 *AEG[EGMAX + 1][EGMAX + 1];
static int aegMaxN = 0;
static inline u32 aq25(u64 x, int flip) {
  u32 m = 0; while (x) { int i = ctz(x); x &= x - 1; int r = i / 9, c = i % 9; m |= 1u << ((flip ? 4 - r : r) * 5 + c); }
  return m;
}
static u32 aegIndex(u64 own, u64 opp, int a, int b, int flip) {
  u32 o = aq25(own, flip), q = aq25(opp, flip), r1 = 0, r2 = 0; int j = 0;
  while (o) { int i = __builtin_ctz(o); o &= o - 1; j++; r1 += CB[i][j]; }
  u32 oo = aq25(own, flip); j = 0;
  while (q) { int i = __builtin_ctz(q); q &= q - 1; j++; int ci = i - __builtin_popcount(oo & ((1u << i) - 1)); r2 += CB[ci][j]; }
  return r1 * CB[25 - a][b] + r2;
}
EXPORT(aeg_size) u32 aeg_size(int a, int b) { initCB(); return CB[25][a] * CB[25 - a][b]; }
EXPORT(aeg_add) void aeg_add(int a, int b, const u8 *data) { initCB(); if (a < 1 || b < 1 || a > EGMAX || b > EGMAX) return; AEG[a][b] = data; int n = a + b; int all = 1; for (int x = 1; x <= EGMAX; x++) for (int y = 1; y <= EGMAX; y++) if (x + y <= n && !AEG[x][y]) all = 0; if (all && n > aegMaxN) aegMaxN = n; }
static inline int aegProbe(const Pos *p) {
  u64 own = p->p[p->side], opp = p->p[p->side ^ 1];
  int a = pc(own), b = pc(opp);
  if (a + b > aegMaxN || !a || !b || a > EGMAX || b > EGMAX || !AEG[a][b]) return -1;
  return AEG[a][b][aegIndex(own, opp, a, b, p->side)];
}
static inline int egValue(int e, int ply) { return e == 0 ? 0 : e < 128 ? WIN - ply - e : -(WIN - ply - (e - 128)); }
EXPORT(heap_base) u8 *heap_base(void) {
#ifdef NATIVE
  return 0;
#else
  extern unsigned char __heap_base; return &__heap_base;
#endif
}

// ---------------------------------------------------------------- evaluation (side to move)
static int PST[NP];
static void initPST(void) {
  for (int i = 0; i < NP; i++) {
    int r = i / 9, c = i % 9, strong = !((r + c) & 1);
    if (r >= GH || c >= GW) { PST[i] = 0; continue; }
    int cr = r < GH / 2 ? r : GH - 1 - r, cc = c < GW / 2 ? c : GW - 1 - c;   // distance from the edge
    PST[i] = strong * 3 + cr * 2 + (cc > 0 ? 1 : 0);
  }
}
static int vulnerable(u64 own, u64 opp) {   // own pieces that the opponent could take right now (rough: one step)
  u64 occ = own | opp, hit = 0, x = opp;
  if (ALQ) {
    while (x) { int i = ctz(x); x &= x - 1; for (int d = 0; d < 8; d++) { int mid = NB[d][i]; if (mid < 0 || !(own & BIT(mid))) continue; int t = NB[d][mid]; if (t >= 0 && !(occ & BIT(t))) hit |= BIT(mid); } }
    return pc(hit);
  }
  while (x) {
    int i = ctz(x); x &= x - 1;
    for (int d = 0; d < 8; d++) { int t = NB[d][i]; if (t < 0 || (occ & BIT(t))) continue; hit |= lineCap(i, d, 0, own) | lineCap(i, d, 1, own); }
  }
  return pc(hit);
}
// Alquerque (AQV >= 1): steps a side can still make (no backward steps: a side that runs out of moves loses, and spare
// moves win the waiting battles of the ending), pieces the opponent can jump now, pieces whose jump landings are covered
static int alqSteps(u64 own, u64 occ, int side) {
  int n = 0; u64 x = own;
  while (x) { int i = ctz(x); x &= x - 1; for (int d = 0; d < 8; d++) { int t = NB[d][i]; if (t >= 0 && !(occ & BIT(t)) && alqDirOk(side, d)) n++; } }
  return n;
}
static int AW[8] = { 4, 28, 14, 3, 0, 0, 0, 0 };   // mobility, hanging (opponent to move later), 2nd hanging, center
static int alqHand(const Pos *p) {
  int s = p->side; u64 own = p->p[s], opp = p->p[s ^ 1], occ = own | opp;
  int a = pc(own), b = pc(opp);
  int v = 100 * (a - b);
  if (a + b <= 12 && a != b) v += (a - b) * (12 - (a + b)) * 12;
  u64 x = own; while (x) { int i = ctz(x); x &= x - 1; v += PST[i]; }
  x = opp; while (x) { int i = ctz(x); x &= x - 1; v -= PST[i]; }
  int mo = alqSteps(own, occ, s), mt = alqSteps(opp, occ, s ^ 1);
  v += AW[0] * (mo - mt);
  if (!mo) v -= 60;
  int h = vulnerable(own, opp);   // the side to move has no capture (quiet leaf): the opponent may take these after our move
  if (h) v -= AW[1] + (h - 1) * AW[2];
  return v;
}
static int hand(const Pos *p) {
  if (ALQ && (AQV & 1)) return alqHand(p);
  int s = p->side; u64 own = p->p[s], opp = p->p[s ^ 1];
  int a = pc(own), b = pc(opp);
  int v = 100 * (a - b);
  // with few pieces the ratio matters more (a big lead converts, an even ending is drawish)
  if (a + b <= 12 && a != b) v += (a - b) * (12 - (a + b)) * 12;
  u64 x = own; while (x) { int i = ctz(x); x &= x - 1; v += PST[i]; }
  x = opp; while (x) { int i = ctz(x); x &= x - 1; v -= PST[i]; }
  if (a + b <= 20) v -= 6 * vulnerable(own, opp) - 0;   // own pieces en prise when the opponent gets the move later
  return v;
}
// learned evaluation (tools/train.py): 90 inputs (own / opponent piece on each point, side-to-move view) → 64 → 32 → 1,
// ReLU; the output times the scale is the value in hundredths of a piece. Weights in one block at net_ptr():
// W1[90][64] B1[64] W2[64][32] B2[32] W3[32] B3[1]
#define NIN 90
#define NH 64
#define NH2 32
#define NNET (NIN * NH + NH + NH * NH2 + NH2 + NH2 + 1)
static float NET[NNET]; static int netOn = 0; static float netScale = 300;
EXPORT(net_ptr) float *net_ptr(void) { return NET; }
EXPORT(net_set) void net_set(float scale) { netScale = scale; netOn = 1; }
static int netEval(const Pos *p) {
  const float *W1 = NET, *B1 = W1 + NIN * NH, *W2 = B1 + NH, *B2 = W2 + NH * NH2, *W3 = B2 + NH2, *B3 = W3 + NH2;
  float h[NH], h2[NH2];
  for (int j = 0; j < NH; j++) h[j] = B1[j];
  for (int s = 0; s < 2; s++) {
    u64 x = p->p[s == 0 ? p->side : p->side ^ 1];
    while (x) { int i = ctz(x); x &= x - 1; const float *w = W1 + (s * 45 + i) * NH; for (int j = 0; j < NH; j++) h[j] += w[j]; }
  }
  for (int j = 0; j < NH; j++) if (h[j] < 0) h[j] = 0;
  for (int k = 0; k < NH2; k++) h2[k] = B2[k];
  for (int j = 0; j < NH; j++) { float a = h[j]; if (a == 0) continue; const float *w = W2 + j * NH2; for (int k = 0; k < NH2; k++) h2[k] += a * w[k]; }
  float o = B3[0];
  for (int k = 0; k < NH2; k++) if (h2[k] > 0) o += h2[k] * W3[k];
  int v = (int)(o * netScale);
  return v > 20000 ? 20000 : v < -20000 ? -20000 : v;
}
static int useNet = 1;   // (shared under MT: values(), which turns it off, never runs on the threads)
static inline int evaluate(const Pos *p) { return (netOn && useNet && ruleStd) ? netEval(p) : hand(p); }

// ---------------------------------------------------------------- transposition table
typedef struct { u64 key; u64 cap; i16 v; u8 f, t; i8 d; u8 flag; u8 age; u8 pad; } TTE;   // 32 bytes
#ifndef TT_BITS
#ifdef NATIVE
#define TT_BITS 22
#else
#define TT_BITS 20
#endif
#endif
#ifndef MT
static TTE TT[1 << TT_BITS];
#endif
static u8 ttAge = 0;
#define TT_EXACT 3
#define TT_LOWER 1
#define TT_UPPER 2
static inline int vToTT(int v, int ply) { return v > WINT ? v + ply : v < -WINT ? v - ply : v; }
static inline int vFromTT(int v, int ply) { return v > WINT ? v - ply : v < -WINT ? v + ply : v; }
#ifdef MT
// (2026-11-09, addendum "wasm の Lazy SMP の置換表", the audit after checkers / morris / tafl) the threads' shared table. The plain
// one (one 32-byte entry per key, written field by field) is not used: two threads writing one slot at once could leave one
// position's key with another's value / depth / bound / move, and the one slot per key let the threads' many shallow entries
// push out the deep ones. Here: buckets of four entries { key ^ w ^ c, w, c } (w = value, move's from / to, depth, bound, age,
// in use; c = the move's captured set), so a torn entry fails the key check ("lockless"); store = the same key's entry, else
// the shallowest / oldest of the bucket (depth − 16 if from an earlier search). 2^TTM_BITS buckets x 96 bytes (48 MB: 2M
// entries, the plain one 1M). A probe copies the entry into a TTE (the same fields as the plain table).
#ifndef TTM_BITS
#define TTM_BITS 19
#endif
static u64 TTM[(1u << TTM_BITS) * 12];
static inline void ttGet(u64 key, TTE *e) {
  const u64 *bk = &TTM[(key & ((1u << TTM_BITS) - 1)) * 12];
  for (int j = 0; j < 4; j++) {
    u64 kx = bk[3 * j], w = bk[3 * j + 1], c = bk[3 * j + 2];
    if ((kx ^ w ^ c) == key && (w >> 58)) { e->key = key; e->cap = c; e->v = (i16)(w & 0xFFFF); e->f = (u8)(w >> 16); e->t = (u8)(w >> 24); e->d = (i8)(w >> 32); e->flag = (u8)((w >> 40) & 3); e->age = (u8)(w >> 48); return; }
  }
  e->key = ~key; e->cap = 0; e->v = 0; e->f = 255; e->t = 0; e->d = -1; e->flag = 0; e->age = 0;
}
static void ttStore(u64 key, int d, int flag, int v, const Move *m, int ply) {
  u64 *bk = &TTM[(key & ((1u << TTM_BITS) - 1)) * 12];
  int j = 0, q = 1 << 30; u64 ow = 0, oc = 0, hit = 0;
  for (int i = 0; i < 4; i++) {
    u64 kx = bk[3 * i], w = bk[3 * i + 1], c = bk[3 * i + 2];
    if ((kx ^ w ^ c) == key && (w >> 58)) { j = i; ow = w; oc = c; hit = 1; break; }
    int sc = !(w >> 58) ? -1000 : (int)(i8)(w >> 32) - (((w >> 48) & 255) != ttAge ? 16 : 0);
    if (sc < q) { q = sc; j = i; }
  }
  u64 mv, c;   // (no move: keep the entry's own, or none)
  if (m) { mv = (u64)m->f << 16 | (u64)m->t << 24; c = m->cap; } else if (hit) { mv = ow & 0xFFFF0000ull; c = oc; } else { mv = (u64)255 << 16; c = 0; }
  u64 w = (u64)(u16)(i16)vToTT(v, ply) | mv | (u64)(u8)(i8)(d > 120 ? 120 : d) << 32 | (u64)(flag & 3) << 40 | (u64)ttAge << 48 | 1ull << 58;
  bk[3 * j + 1] = w; bk[3 * j + 2] = c; bk[3 * j] = key ^ w ^ c;
}
EXPORT(new_game) void new_game(void) { memset(TTM, 0, sizeof(TTM)); ttAge = 0; }
#define TT_PROBE(k) TTE e_, *e = &e_; ttGet((k), e)
#else
#define TT_PROBE(k) TTE *e = &TT[(k) & ((1 << TT_BITS) - 1)]
static void ttStore(u64 key, int d, int flag, int v, const Move *m, int ply) {
  TTE *e = &TT[key & ((1 << TT_BITS) - 1)];
  if (e->key != key && e->age == ttAge && e->d > d + 2) return;
  if (m) { e->cap = m->cap; e->f = m->f; e->t = m->t; } else if (e->key != key) { e->f = 255; }
  e->key = key; e->d = (i8)(d > 120 ? 120 : d); e->flag = (u8)flag; e->v = (i16)vToTT(v, ply); e->age = ttAge;
}
EXPORT(new_game) void new_game(void) { memset(TT, 0, sizeof(TT)); ttAge = 0; }
#endif

// ---------------------------------------------------------------- search
#ifdef MT
static TLS Move (*MS)[MAXMV];        // each thread's move stack (1 MB): in its own slot, after its TLS block (mt_thread)
#else
static Move MS[MAXPLY + 2][MAXMV];
#endif
static TLS u64 nodes; static TLS double tEnd; static TLS int stopFlag, nodeLimit_on; static TLS u64 nodeLimit;
static TLS int hist[2][NP][NP];
static TLS Move killers[MAXPLY][2];
static TLS u64 hkeys[1200 + MAXPLY]; static TLS int hn, hirr;
static TLS int rootPly, seldepth;
#ifdef MT
// (2026-11-11) gStop, threadId, the busy marks and the split points of Young Brothers Wait are Praline's, the site's common
// thinking engine (claude/praline-spec.md, shared/praline/): included below; the game's part of it ("glue") here.
// every thread's last finished iteration on the current root: { key ^ x ^ c, x, c }, x = depth | value | from | to | in use,
// c = the move's captured set — the main thread answers with the deepest one, and a helper that finishes the main thread's
// depth limit ends the search (gHit)
#define MT_SLOTS 64
static u64 gRes[MT_SLOTS][3];
static volatile u64 gGoalKey, gHit; static volatile int gGoal;
static TLS u64 rootK;
// (2026-11-10, as morris/engine.c, after the Mac bench: same depth x1.38 / x1.56 / x1.68 with 2 / 4 / 8 threads although the
// nodes/s grew x2.2 / x4.2 / x8.1) busy marks, Kerrigan's "simplified ABDADA". The threads walk the same tree in the same
// order at the same speed, so they search the same subtree at the same time and none gets the other's result from the
// table (tools/mtsim: the simulation where a thread's stores reach the others only at the end of a round). (praline.h)
// (2026-11-11, Young Brothers Wait: see "split points" after search(); claude/fanorona-spec.md「マルチスレッド その3：YBW」)
// stopFlag 2 / 3: praline.h. A split point carries the node's position, its key, the repetition history since the last
// capture, and per move its reduction (as the one-thread loop).
#ifndef BUSY_D
#define BUSY_D 3
#endif
#define SP_MV MAXMV
#define SP_HK 128
#define PL_SP_FIELDS \
  int qp0; Pos pos; u64 key; int hn, hirr; u64 hk[SP_HK];   /* the position, its key and the repetition history since the last capture */ \
  u8 red[SP_MV];                                            /* the moves' reductions (as the one-thread loop) */
#include "../shared/praline/praline.h"
static inline int timeUp(void) {
  if (stopFlag) return 1;
  if ((nodes & 1023) == 0) {
    if ((tEnd > 0 && now() > tEnd) || (nodeLimit_on && nodes > nodeLimit) || gStop || (rootK && gHit == rootK)) stopFlag = 1;
    else if (curSP && chainStopped(curSP, curIdx)) stopFlag = 2;
    else if (dupMode && gOpenN > 0 && dupLeave()) stopFlag = 3;
  }
  return stopFlag;
}
// (the split points (SPt, spAlloc, …): praline.h; the game's part of a split point:)
static int spFillPos(SPt *s, const Pos *p, u64 key) {   // the owner: this node's position (hn: the node's key already pushed, but at the root)
  if (hn - hirr > SP_HK || hirr < 0) return 0;
  s->pos = *p; s->key = key; s->hn = hn; s->hirr = hirr; for (int i = hirr; i < hn; i++) s->hk[i - hirr] = hkeys[i];
  return 1;
}
static void spLoadPos(const SPt *s, int top, int fresh) {   // a thread joining s: the repetition history
  (void)top; (void)fresh;
  hn = s->hn; hirr = s->hirr; for (int i = hirr; i < hn; i++) hkeys[i] = s->hk[i - hirr];
}
#else
static inline int timeUp(void) {
  if (stopFlag) return 1;
  if ((nodes & 1023) == 0) { if ((tEnd > 0 && now() > tEnd) || (nodeLimit_on && nodes > nodeLimit)) stopFlag = 1; }
  return stopFlag;
}
#endif
static int isRep(u64 key, int from) { for (int i = hn - 2; i >= from; i -= 2) if (hkeys[i] == key) return 1; return 0; }
static int search(Pos *p, int depth, int alpha, int beta, int ply, u64 key, int pv, int quietPlies) {
  if (ply > 0) {
    if (quietPlies >= DRAW_PLIES) return 0;
    if (isRep(key, hirr)) return 0;
    int ma = -(WIN - ply), mb = WIN - ply - 1;
    if (ma > alpha) { alpha = ma; if (alpha >= beta) return alpha; }
    if (mb < beta) { beta = mb; if (alpha >= beta) return beta; }
  }
  if (timeUp() && ply > 0) return 0;
  if (ply > 0 && egMaxN && ruleStd) { int e = egProbe(p); if (e >= 0) { nodes++; return egValue(e, ply); } }
  if (ply > 0 && aegMaxN && ALQ && !ALQF && (AQV & 8)) { int e = aegProbe(p); if (e >= 0) { nodes++; return egValue(e, ply); } }
  if (ply >= MAXPLY - 2) return evaluate(p);
  int caps = hasCaps(p);
  if (!caps && depth <= 0) { nodes++; if (!anyMove(p)) return -(WIN - ply); return evaluate(p); }
  Move *L = MS[ply];
  int n = caps ? genCaps(p, L, MAXMV) : genPaika(p, L, MAXMV);
  if (!n) return -(WIN - ply);
  nodes++;
  if (ply > seldepth) seldepth = ply;
  int qs = 0;
  if (caps && depth <= 0) {   // capture quiescence (bounded): the mover must capture, so the static value is a lower bound
    qs = 1;
    int sp = evaluate(p);
    if (ALQ && (AQV & 2)) { if (depth < -14 || ply > 80) return sp; }   // Alquerque: the forced jumps are searched out (a forced capture can lose)
    else {
      if (depth < -5 || ply > 60) return sp;
      if (sp >= beta) return sp;
      if (sp > alpha) alpha = sp;
    }
  }
  if (n == 1 && ply > 0 && !qs) depth++;
  TT_PROBE(key);
  int ttf = 255, ttt = 0; u64 ttc = 0;
  if (e->key == key) {
    ttf = e->f; ttt = e->t; ttc = e->cap;
    if (!pv && e->d >= depth && ply > 0) {
      int v = vFromTT(e->v, ply);
      if (e->flag == TT_EXACT || (e->flag == TT_LOWER && v >= beta) || (e->flag == TT_UPPER && v <= alpha)) return v;
    }
  }
  int sc[MAXMV];
  for (int i = 0; i < n; i++) {
    Move *m = &L[i]; int s;
    if (m->f == ttf && m->t == ttt && m->cap == ttc) s = 1 << 30;
    else if (!m->paika) s = (1 << 28) + m->ncap * 1000 - m->n;
    else if (sameMove(m, &killers[ply][0])) s = 1 << 27; else if (sameMove(m, &killers[ply][1])) s = (1 << 27) - 1;
    else s = hist[p->side][m->f][m->t];
    sc[i] = s;
  }
  int best = -INF, oldAlpha = alpha; Move bestM = L[0];
  hkeys[hn++] = key;
#ifdef MT
  // (2026-11-10) busy marks (see busyT): a move whose position another thread is searching right now is put off until the
  // other moves are done (by then its result is usually in the table)
  int defI[BUSY_DEF], nDef = 0, noSplit = 0;
  for (int k = 0; k < n + nDef; k++) {
    int i;
    // YBW: the first move is done and a helper is idle (or an owner above waits for its helpers): the remaining moves go to
    // a split point, in the order of this loop (the selection sort's, then the moves put off), each with its reduction
    if (k > 0 && k < n && !qs && !noSplit && depth >= splitD && (gIdle > 0 || (gWaitN > 0 && spWanted()))) {
      SPt *sp = spAlloc(); int ns = 0;
      if (sp && spFillPos(sp, p, key)) {
        for (int j = k; j < n + nDef; j++) {
          int ii;
          if (j < n) {
            ii = j; int bi = j; for (int x = j + 1; x < n; x++) if (sc[x] > sc[bi]) bi = x;
            if (bi != j) { Move tm = L[bi]; L[bi] = L[j]; L[j] = tm; int ts = sc[bi]; sc[bi] = sc[j]; sc[j] = ts; }
          } else ii = defI[j - n];
          int red = 0;
          if (depth >= 3 && ii >= 3 && !caps && !pv) red = 1 + (ii >= 10 && depth >= 6);
          else if (depth >= 3 && ii >= 5 && !caps) red = 1;
          sp->mv[ns] = L[ii]; sp->red[ns] = (u8)red; ns++;
        }
      }
      if (ns >= 2) {
        sp->n = ns; sp->depth = depth; sp->ply = ply; sp->root = 0; sp->all = 0; sp->pv = pv; sp->qp0 = quietPlies; sp->beta = beta;
        sp->alpha = alpha;
        spRun(sp, &best, &bestM, 0);
        if (stopFlag) { hn--; return best > -INF ? best : 0; }
        if (best >= beta && bestM.paika) {
          if (!sameMove(&bestM, &killers[ply][0])) { killers[ply][1] = killers[ply][0]; killers[ply][0] = bestM; }
          int *h = &hist[p->side][bestM.f][bestM.t]; *h += depth * depth + 1;
          if (*h > (1 << 24)) for (int a = 0; a < 2; a++) for (int b = 0; b < NP; b++) for (int c = 0; c < NP; c++) hist[a][b][c] >>= 1;
        }
        break;
      }
      if (sp) spRelease(sp);
      noSplit = 1;   // (fewer than 2 moves left, or no free slot: on alone)
    }
    if (k < n) {
      i = k; int bi = i; for (int j = i + 1; j < n; j++) if (sc[j] > sc[bi]) bi = j;
      if (bi != i) { Move tm = L[bi]; L[bi] = L[i]; L[i] = tm; int ts = sc[bi]; sc[bi] = sc[i]; sc[i] = ts; }
    } else i = defI[k - n];
    Move *m = &L[i];
    u64 k2 = hashMove(key, p, m);
    if (k < n && i > 0 && !qs && depth >= BUSY_D && nDef < BUSY_DEF && busyOther(k2)) { defI[nDef++] = i; continue; }
    const int mk = !qs && depth >= BUSY_D ? busySet(k2) : -1;
    Pos q = *p; doMove(&q, m);
#else
  for (int i = 0; i < n; i++) {
    int bi = i; for (int j = i + 1; j < n; j++) if (sc[j] > sc[bi]) bi = j;
    if (bi != i) { Move tm = L[bi]; L[bi] = L[i]; L[i] = tm; int ts = sc[bi]; sc[bi] = sc[i]; sc[i] = ts; }
    Move *m = &L[i];
    Pos q = *p; doMove(&q, m);
    u64 k2 = hashMove(key, p, m);
#endif
    int irr = !m->paika, saveIrr = hirr;
    if (irr) hirr = hn;
    int qp = irr ? 0 : quietPlies + 1;
    int v, d1 = depth - 1;
    if (qs) v = -search(&q, depth - 1, -beta, -alpha, ply + 1, k2, 0, qp);
    else if (i == 0) v = -search(&q, d1, -beta, -alpha, ply + 1, k2, pv, qp);
    else {
      int red = 0;
      if (depth >= 3 && i >= 3 && !caps && !pv) red = 1 + (i >= 10 && depth >= 6);
      else if (depth >= 3 && i >= 5 && !caps) red = 1;
      v = -search(&q, d1 - red, -alpha - 1, -alpha, ply + 1, k2, 0, qp);
      if (v > alpha && red) v = -search(&q, d1, -alpha - 1, -alpha, ply + 1, k2, 0, qp);
      if (v > alpha && v < beta) v = -search(&q, d1, -beta, -alpha, ply + 1, k2, pv, qp);
    }
#ifdef MT
    if (mk >= 0) busyClear(k2, mk);
#endif
    hirr = saveIrr;
    if (stopFlag) { hn--; return best > -INF ? best : 0; }
    if (v > best) {
      best = v; bestM = *m;
      if (v > alpha) {
        alpha = v;
        if (v >= beta) {
          if (m->paika) {
            if (!sameMove(m, &killers[ply][0])) { killers[ply][1] = killers[ply][0]; killers[ply][0] = *m; }
            int *h = &hist[p->side][m->f][m->t]; *h += depth * depth + 1;
            if (*h > (1 << 24)) for (int a = 0; a < 2; a++) for (int b = 0; b < NP; b++) for (int c = 0; c < NP; c++) hist[a][b][c] >>= 1;
          }
          break;
        }
      }
    }
  }
  hn--;
  if (!qs) ttStore(key, depth, best >= beta ? TT_LOWER : best > oldAlpha ? TT_EXACT : TT_UPPER, best, &bestM, ply);
  return best;
}

#ifdef MT
// ---------------------------------------------------------------- split points: the game's glue for Praline (praline_ybw.h)
// (2026-11-11, Young Brothers Wait; the method of reversi/engine.c v4 / v4.1 and xiangqi/engine.c, claude/fanorona-spec.md
// 「マルチスレッド その3：YBW」.) A helper copies the repetition history of the split point; the moves are searched with the
// one-thread loop's reductions, null window and re-search (and the busy marks).
// the move i of s with the null window against a and the re-searches, as the one-thread loop (rootSearch at the root)
static int spSearch(SPt *s, int i, int a) {
  const int b = s->beta, d1 = s->depth - 1, ply = s->ply; const Move *m = &s->mv[i];
  Pos q = s->pos; doMove(&q, m);
  const u64 k2 = hashMove(s->key, &s->pos, m);
  const int mk = !s->all && s->depth >= BUSY_D ? busySet(k2) : -1;
  int irr = !m->paika, saveIrr = hirr;
  if (s->root) hkeys[hn++] = s->key;
  if (irr) hirr = hn;
  int qp = irr ? 0 : s->qp0 + 1, v;
  if (s->root) {
    if (s->all) v = -search(&q, d1, -INF, INF, 1, k2, 1, qp);
    else { v = -search(&q, d1, -a - 1, -a, 1, k2, 0, qp); if (v > a && v < b && !stopFlag) v = -search(&q, d1, -b, -a, 1, k2, 1, qp); }
  } else {
    const int red = s->red[i];
    v = -search(&q, d1 - red, -a - 1, -a, ply + 1, k2, 0, qp);
    if (v > a && red && !stopFlag) v = -search(&q, d1, -a - 1, -a, ply + 1, k2, 0, qp);
    if (v > a && v < b && !stopFlag) v = -search(&q, d1, -b, -a, ply + 1, k2, s->pv, qp);
  }
  if (mk >= 0) busyClear(k2, mk);
  if (s->root) hn--;
  hirr = saveIrr;
  return v;
}
// a cut-off by the move i of s (not the root): this thread's killers / history, as the one-thread cut-off (a paika move)
static void spCutoff(const SPt *s, int i) {
  if (!s->mv[i].paika) return;
  const Move *m = &s->mv[i]; const int ply = s->ply, side = s->pos.side;
  if (!sameMove(m, &killers[ply][0])) { killers[ply][1] = killers[ply][0]; killers[ply][0] = *m; }
  int *h = &hist[side][m->f][m->t]; *h += s->depth * s->depth + 1;
  if (*h > (1 << 24)) for (int x = 0; x < 2; x++) for (int y = 0; y < NP; y++) for (int c = 0; c < NP; c++) hist[x][y][c] >>= 1;
}
static inline int spTop(void) { return 0; }   // (no incremental evaluation to keep)
static void waitCheck(void) {
  SIM_IDLE();
  if ((tEnd > 0 && now() > tEnd) || (nodeLimit_on && nodes > nodeLimit) || gStop || (rootK && gHit == rootK)) stopFlag = 1;
  else if (curSP && chainStopped(curSP, curIdx)) stopFlag = 2;
}
static void spIdleReset(int fresh) {   // mt_idle: a helper's search state (fresh: a new job, as beginSearch)
  nodes = 0; tEnd = 0; nodeLimit_on = 0; rootK = 0;
  if (fresh) {
    for (int a = 0; a < 2; a++) for (int b = 0; b < NP; b++) for (int c = 0; c < NP; c++) hist[a][b][c] >>= 2;
    memset(killers, 0, sizeof(killers));
  }
}
#include "../shared/praline/praline_ybw.h"
#endif


// ---------------------------------------------------------------- root / host interface
// a move on the wire: (lo, hi): lo = start | n << 6 | paika << 10 | steps 0..4 << 11 (4 bits each), hi = steps 5..12
static TLS Pos ROOT; static TLS u64 rootKey;
static TLS Move rootL[MAXMV]; static TLS int rootN;
static TLS int rootVal[MAXMV];
static void writeMove(i32 *o, const Move *m) {
  u32 lo = m->f | (m->n << 6) | (m->paika << 10), hi = 0;
  for (int i = 0; i < m->n; i++) { if (i < 5) lo |= (u32)m->st[i] << (11 + 4 * i); else hi |= (u32)m->st[i] << (4 * (i - 5)); }
  o[0] = (i32)lo; o[1] = (i32)hi;
}
// replay a wire move on p; returns 0 if it is not legal
static int readMove(const Pos *p, u32 lo, u32 hi, Move *out) {
  Move m; memset(&m, 0, sizeof m);
  m.f = lo & 63; m.n = (lo >> 6) & 15; m.paika = (lo >> 10) & 1;
  if (m.n < 1 || m.n > MAXST || m.f >= NP || !(p->p[p->side] & BIT(m.f))) return 0;
  for (int i = 0; i < m.n; i++) m.st[i] = (u8)(i < 5 ? (lo >> (11 + 4 * i)) & 15 : (hi >> (4 * (i - 5))) & 15);
  u64 own = p->p[p->side], opp = p->p[p->side ^ 1];
  int cur = m.f, last = -1; u64 visited = BIT(cur);
  if (m.paika) {
    if (m.n != 1 || hasCaps(p)) return 0;
    int t = NB[m.st[0] & 7][cur]; if (t < 0 || ((own | opp) & BIT(t))) return 0;
    if (ALQ && !alqDirOk(p->side, m.st[0] & 7)) return 0;
    m.t = (u8)t; *out = m; return 1;
  }
  if (ALQ) {
    for (int i = 0; i < m.n; i++) {
      int d = m.st[i] & 7, mid = NB[d][cur]; if (mid < 0 || !(opp & BIT(mid))) return 0;
      int t = NB[d][mid]; if (t < 0 || ((own | opp) & BIT(t))) return 0;
      m.cap |= BIT(mid); opp &= ~BIT(mid); own = (own & ~BIT(cur)) | BIT(t); cur = t;
    }
    if (alqJumpFrom(cur, own | opp, opp)) return 0;
    m.t = (u8)cur; m.ncap = (u8)pc(m.cap); *out = m; return 1;
  }
  for (int i = 0; i < m.n; i++) {
    int d = m.st[i] & 7, k = m.st[i] >> 3, t = NB[d][cur];
    if (d == last || t < 0 || ((own | opp) & BIT(t)) || (visited & BIT(t))) return 0;
    u64 c = lineCap(cur, d, k, opp); if (!c) return 0;
    m.cap |= c; opp &= ~c; own = (own & ~BIT(cur)) | BIT(t); cur = t; last = d; visited |= BIT(t);
  }
  m.t = (u8)cur; m.ncap = (u8)pc(m.cap); *out = m; return 1;
}
// setup: IO = [white lo, white hi, black lo, black hi, side, nmoves, (lo, hi) * nmoves]. Returns 1 if all moves were legal.
EXPORT(setup) int setup(void) {
  initGeo(); initPST(); initCB();
  Pos p; p.p[0] = (u64)(u32)IO[0] | ((u64)(u32)IO[1] << 32); p.p[1] = (u64)(u32)IO[2] | ((u64)(u32)IO[3] << 32); p.side = IO[4];
  int nm = IO[5]; if (nm > 1100) nm = 1100;
  u64 key = hashOf(&p); hn = 0; hirr = 0; rootPly = 0;
  for (int i = 0; i < nm; i++) {
    Move m; if (!readMove(&p, (u32)IO[6 + 2 * i], (u32)IO[7 + 2 * i], &m)) return 0;
    hkeys[hn++] = key;
    if (!m.paika) { hirr = hn; rootPly = 0; } else rootPly++;
    key = hashMove(key, &p, &m); doMove(&p, &m);
  }
  ROOT = p; rootKey = key;
  rootN = gen(&p, rootL);
  return 1;
}
static int rootSearch(int depth, int all, int alpha0, int beta0) {
  int alpha = alpha0, best = -INF;
#ifdef MT
  int defI[BUSY_DEF], nDef = 0;   // (the busy marks at the root too: a root move another thread is on is put off)
  for (int k = 0; k < rootN + nDef; k++) {
    // YBW at the root: the first move is done, the others go to a split point (with the values of the moves for best())
    if (k == 1 && rootN - 1 >= 2 && depth >= splitD && gIdle > 0) {
      SPt *sp = spAlloc();
      if (sp && spFillPos(sp, &ROOT, rootKey)) {
        for (int j = 1; j < rootN; j++) { sp->mv[j - 1] = rootL[j]; sp->red[j - 1] = 0; }
        sp->n = rootN - 1; sp->depth = depth; sp->ply = 0; sp->root = 1; sp->all = all; sp->pv = 1; sp->qp0 = rootPly; sp->beta = all ? INF : beta0;
        sp->alpha = alpha;
        Move bm = rootL[0];
        spRun(sp, &best, &bm, rootVal + 1);
        return best;
      }
      if (sp) spRelease(sp);
    }
    const int i = k < rootN ? k : defI[k - rootN];
    Move *m = &rootL[i];
    u64 k2 = hashMove(rootKey, &ROOT, m);
    if (!all && k < rootN && i > 0 && depth >= BUSY_D && nDef < BUSY_DEF && busyOther(k2)) { defI[nDef++] = i; continue; }
    const int mk = !all && depth >= BUSY_D ? busySet(k2) : -1;
    Pos q = ROOT; doMove(&q, m);
#else
  for (int i = 0; i < rootN; i++) {
    Move *m = &rootL[i]; Pos q = ROOT; doMove(&q, m);
    u64 k2 = hashMove(rootKey, &ROOT, m);
#endif
    int irr = !m->paika, saveIrr = hirr; hkeys[hn++] = rootKey; if (irr) hirr = hn;
    int qp = irr ? 0 : rootPly + 1, v;
    if (all) v = -search(&q, depth - 1, -INF, INF, 1, k2, 1, qp);
    else if (i == 0) v = -search(&q, depth - 1, -beta0, -alpha, 1, k2, 1, qp);
    else { v = -search(&q, depth - 1, -alpha - 1, -alpha, 1, k2, 0, qp); if (v > alpha && v < beta0 && !stopFlag) v = -search(&q, depth - 1, -beta0, -alpha, 1, k2, 1, qp); }
#ifdef MT
    if (mk >= 0) busyClear(k2, mk);
#endif
    hn--; hirr = saveIrr;
    if (stopFlag) return best;
    rootVal[i] = v;
    if (v > best) { best = v; if (v > alpha) alpha = v; }
    if (!all && v >= beta0) return v;
  }
  return best;
}
// all root moves for the analysis: the best few exactly, the rest only as "at least MARGIN worse" (a null window under the
// best value, re-searched when they come close) — much deeper than a full window for every move
#define AN_MARGIN 160
static int rootSearchMulti(int depth) {
  int best = -INF;
  for (int i = 0; i < rootN; i++) {
    Move *m = &rootL[i]; Pos q = ROOT; doMove(&q, m);
    u64 k2 = hashMove(rootKey, &ROOT, m);
    int irr = !m->paika, saveIrr = hirr; hkeys[hn++] = rootKey; if (irr) hirr = hn;
    int qp = irr ? 0 : rootPly + 1, v;
    if (i == 0 || best <= -INF + 1000) v = -search(&q, depth - 1, -INF, INF, 1, k2, 1, qp);
    else {
      int lo = best - AN_MARGIN; if (lo < -INF + 1) lo = -INF + 1;
      v = -search(&q, depth - 1, -lo - 1, -lo, 1, k2, 0, qp);
      if (v > lo && !stopFlag) v = -search(&q, depth - 1, -INF, -lo, 1, k2, 1, qp);
    }
    hn--; hirr = saveIrr;
    if (stopFlag) return best;
    rootVal[i] = v;
    if (v > best) best = v;
  }
  return best;
}
static void sortRoot(void) {
  for (int i = 1; i < rootN; i++) { Move m = rootL[i]; int v = rootVal[i], j = i - 1; while (j >= 0 && rootVal[j] < v) { rootL[j + 1] = rootL[j]; rootVal[j + 1] = rootVal[j]; j--; } rootL[j + 1] = m; rootVal[j + 1] = v; }
}
static void beginSearch(int ms) {
  stopFlag = 0; nodes = 0; tEnd = ms > 0 ? now() + ms : 0;
#ifdef MT
  rootK = 0;   // (best sets it on the main thread: the depth goal a helper may reach first)
  if (threadId == 0)   // (only the main thread ages the shared table)
#endif
  ttAge++;
  for (int a = 0; a < 2; a++) for (int b = 0; b < NP; b++) for (int c = 0; c < NP; c++) hist[a][b][c] >>= 2;
  memset(killers, 0, sizeof(killers));
}
// best move: IO[0..1] = move, IO[2] = value, IO[3] = depth, IO[4] = nodes / 1000
EXPORT(best) void best(int maxDepth, int ms, int nodeK) {
  beginSearch(ms); nodeLimit_on = nodeK > 0; nodeLimit = (u64)nodeK * 1000;
  if (rootN == 0) { IO[0] = -1; IO[1] = 0; IO[2] = -WIN; IO[3] = 0; return; }
  Move bm = rootL[0]; int bv = 0, bd = 0;
  if (rootN == 1) { writeMove(IO, &bm); IO[2] = 0; IO[3] = 0; IO[4] = 0; return; }
  for (int i = 0; i < rootN; i++) rootVal[i] = -INF;
  int prev = 0, d0 = 1;
#ifdef MT
  // (2026-11-09) every thread iterates 1, 2, 3, … like the main one: the helpers' start a ply ahead (every other one) was slower
  // to the main thread's depth in the measurement (MODEL_CARD.md). The root key: the position, its history, the rule.
  const u64 rk = (rootKey ^ (u64)hn << 40 ^ (u64)hirr << 50 ^ (u64)(rootPly + 1) << 20 ^ (u64)rootN << 8 ^ (u64)(GW | GH << 4 | (ALQ + ALQF) << 8) * 0x9E3779B97F4A7C15ull) | 1;
  if (!threadId) {   // a new search: forget the threads' results of the last one, set the depth goal
    for (int i = 0; i < MT_SLOTS; i++) for (int k = 0; k < 3; k++) __atomic_store_n(&gRes[i][k], 0, __ATOMIC_SEQ_CST);
    gHit = 0; gGoal = maxDepth; gGoalKey = rk; rootK = rk;
  }
#endif
  for (int d = d0; d <= maxDepth && d < MAXPLY - 8; d++) {
    seldepth = 0;
    int a = d >= 4 ? prev - 50 : -INF, b = d >= 4 ? prev + 50 : INF, v;
    for (;;) {
      v = rootSearch(d, 0, a, b);
      if (stopFlag) break;
      if (v <= a) { a = a - 250 < -INF ? -INF : a - 250; if (a < -3000) a = -INF; continue; }
      if (v >= b) { b = b + 250 > INF ? INF : b + 250; if (b > 3000) b = INF; continue; }
      break;
    }
    if (stopFlag && d > 1) break;
    int bi = 0; for (int i = 1; i < rootN; i++) if (rootVal[i] > rootVal[bi]) bi = i;
    if (bi) { Move t = rootL[bi]; int tv = rootVal[bi]; for (int i = bi; i > 0; i--) { rootL[i] = rootL[i - 1]; rootVal[i] = rootVal[i - 1]; } rootL[0] = t; rootVal[0] = tv; }
    for (int i = 1; i < rootN; i++) rootVal[i] = -INF;
    bm = rootL[0]; bv = v; bd = d; prev = v;
#ifdef MT
    if (threadId < MT_SLOTS) {   // publish the finished iteration
      u64 x = (u64)(d & 255) | (u64)(u16)(i16)bv << 8 | (u64)bm.f << 24 | (u64)bm.t << 32 | 1ull << 40, c = bm.cap;
      __atomic_store_n(&gRes[threadId][1], x, __ATOMIC_SEQ_CST); __atomic_store_n(&gRes[threadId][2], c, __ATOMIC_SEQ_CST); __atomic_store_n(&gRes[threadId][0], rk ^ x ^ c, __ATOMIC_SEQ_CST);
      if (threadId && d >= gGoal && gGoalKey == rk) gHit = rk;
    }
    IO[4] = (i32)(nodes / 1000);   // (the nodes so far, for the helpers' progress readouts)
#endif
    progress(d, 1);
    if (v > WINT && WIN - v <= d) break;
    if (v < -WINT && WIN + v <= d) break;
    if (ms > 0 && d > 1 && now() > tEnd - ms * 0.45) break;
#ifdef MT
    if (gStop) break;
#endif
  }
#ifdef MT
  if (!threadId) {   // the deepest finished iteration of all the threads (the main thread's on a tie)
    int bt = -1, bdep = bd;
    for (int i = 1; i < MT_SLOTS; i++) {
      u64 kx = __atomic_load_n(&gRes[i][0], __ATOMIC_SEQ_CST), x = __atomic_load_n(&gRes[i][1], __ATOMIC_SEQ_CST), c = __atomic_load_n(&gRes[i][2], __ATOMIC_SEQ_CST);
      if (!(x >> 40) || (kx ^ x ^ c) != rk) continue;
      int dd = (int)(x & 255); if (dd > bdep) { bdep = dd; bt = i; }
    }
    if (bt > 0) {
      u64 kx = __atomic_load_n(&gRes[bt][0], __ATOMIC_SEQ_CST), x = __atomic_load_n(&gRes[bt][1], __ATOMIC_SEQ_CST), c = __atomic_load_n(&gRes[bt][2], __ATOMIC_SEQ_CST);
      int k = -1;   // (the root move itself: its steps are in rootL)
      for (int i = 0; i < rootN; i++) if (rootL[i].f == (u8)(x >> 24) && rootL[i].t == (u8)(x >> 32) && rootL[i].cap == c) { k = i; break; }
      if ((kx ^ x ^ c) == rk && k >= 0) { bm = rootL[k]; bv = (i16)(u16)(x >> 8); bd = (int)(x & 255); }
    }
    gGoalKey = 0; gHit = 0; rootK = 0;
  }
#endif
  writeMove(IO, &bm); IO[2] = bv; IO[3] = bd; IO[4] = (i32)(nodes / 1000);
}
// analysis: values of all root moves. IO[0] = n, IO[1] = depth, then (lo, hi, v) * n, best first
EXPORT(analyze) void analyze(int ms, int maxDepth) {
  beginSearch(ms); nodeLimit_on = 0;
  static TLS int vals[MAXMV]; static TLS Move ord[MAXMV];
  int depthDone = 0;
  int nOut = rootN > 600 ? 600 : rootN;
  for (int i = 0; i < rootN; i++) { ord[i] = rootL[i]; vals[i] = 0; }
  if (rootN) {
    for (int d = 1; d <= maxDepth && d < MAXPLY - 8; d++) {
      rootSearchMulti(d);
      if (stopFlag && d > 1) break;
      sortRoot();
      for (int i = 0; i < rootN; i++) { ord[i] = rootL[i]; vals[i] = rootVal[i]; }
      depthDone = d;
      IO[0] = nOut; IO[1] = depthDone; for (int i = 0; i < nOut; i++) { writeMove(IO + 2 + 3 * i, &ord[i]); IO[4 + 3 * i] = vals[i]; }
      progress(d, rootN);
      int solved = 1; for (int i = 0; i < rootN; i++) if (vals[i] < WINT && vals[i] > -WINT) solved = 0;
      if (solved && d > 2) break;
      if (rootN == 1 && d >= 8) break;
      if (stopFlag) break;
      if (d > 1 && now() > tEnd - ms * 0.5) break;
    }
  }
  IO[0] = nOut; IO[1] = depthDone;
  for (int i = 0; i < nOut; i++) { writeMove(IO + 2 + 3 * i, &ord[i]); IO[4 + 3 * i] = vals[i]; }
}
// fixed-depth values of all root moves (weak levels): IO like analyze
EXPORT(values) void values(int depth, int noEval) {
  beginSearch(0); nodeLimit_on = 0;
  int saved = useNet, savedQ = AQV; if (noEval) { useNet = 0; AQV = 0; }   // the weak levels keep the plain evaluation (Alquerque too)
  for (int d = 1; d <= depth; d++) rootSearch(d, 1, -INF, INF);
  useNet = saved; AQV = savedQ;
  sortRoot();
  int nOut = rootN > 600 ? 600 : rootN;
  IO[0] = nOut; IO[1] = depth;
  for (int i = 0; i < nOut; i++) { writeMove(IO + 2 + 3 * i, &rootL[i]); IO[4 + 3 * i] = rootVal[i]; }
}

// ---------------------------------------------------------------- puzzles
// goal 0 = win (capture everything / leave no move) within k own moves; g > 0 = gain g pieces (lead grows by g
// and the defender, to move, has no capture). Same protocol as the checkers puzzles.
static Move PZ[40][MAXMV];
static int winAtt(const Pos *p, int k, u64 *budget, int ply);
static int winDef(const Pos *p, int k, u64 *budget, int ply) {
  Move *L = PZ[ply]; int n = gen(p, L);
  if (!n) return 1;
  if (k <= 0) return 0;
  for (int i = 0; i < n; i++) { if (!*budget) return -1; (*budget)--; Pos q = *p; doMove(&q, &L[i]); int r = winAtt(&q, k, budget, ply + 1); if (r != 1) return r; }
  return 1;
}
static int winAtt(const Pos *p, int k, u64 *budget, int ply) {
  Move *L = PZ[ply]; int n = gen(p, L);
  if (!n || k <= 0) return 0;
  int unk = 0;
  for (int i = 0; i < n; i++) { if (!*budget) return -1; (*budget)--; Pos q = *p; doMove(&q, &L[i]); int r = winDef(&q, k - 1, budget, ply + 1); if (r == 1) return 1; if (r < 0) unk = 1; }
  return unk ? -1 : 0;
}
static int gBase, gNeed;
static inline int lead(const Pos *p, int att) { return pc(p->p[att]) - pc(p->p[att ^ 1]); }
static int shotAtt(const Pos *p, int k, int att, u64 *budget, int ply);
static int shotDef(const Pos *p, int k, int att, u64 *budget, int ply) {
  if (!anyMove(p) || !p->p[p->side]) return 1;
  int caps = hasCaps(p);
  if (!caps && lead(p, att) - gBase >= gNeed) return 1;
  if (k <= 0) return 0;
  Move *L = PZ[ply]; int n = gen(p, L);
  for (int i = 0; i < n; i++) { if (!*budget) return -1; (*budget)--; Pos q = *p; doMove(&q, &L[i]); int r = shotAtt(&q, k, att, budget, ply + 1); if (r != 1) return r; }
  return 1;
}
static int shotAtt(const Pos *p, int k, int att, u64 *budget, int ply) {
  Move *L = PZ[ply]; int n = gen(p, L);
  if (!n || k <= 0) return 0;
  int unk = 0;
  for (int i = 0; i < n; i++) { if (!*budget) return -1; (*budget)--; Pos q = *p; doMove(&q, &L[i]); int r = shotDef(&q, k - 1, att, budget, ply + 1); if (r == 1) return 1; if (r < 0) unk = 1; }
  return unk ? -1 : 0;
}
// IO out: [n, (lo, hi, need) * n]; need = own moves to reach the goal (0 = not within n, -1 = budget ran out)
EXPORT(puzzle) void puzzle(int n, int defend, int goal, int base, int budgetK) {
  int att = defend ? ROOT.side ^ 1 : ROOT.side;
  gNeed = goal; gBase = defend ? base : lead(&ROOT, att);
  int nOut = rootN > 600 ? 600 : rootN;
  IO[0] = nOut;
  for (int i = 0; i < nOut; i++) {
    Pos q = ROOT; doMove(&q, &rootL[i]);
    int need = 0;
    u64 budget = (u64)budgetK * 1000;
    for (int k = defend ? 1 : 0; k <= n - (defend ? 0 : 1); k++) {
      int r = defend ? (goal ? shotAtt(&q, k, att, &budget, 0) : winAtt(&q, k, &budget, 0)) : (goal ? shotDef(&q, k, att, &budget, 0) : winDef(&q, k, &budget, 0));
      if (r == 1) { need = defend ? k : k + 1; break; }
      if (r < 0) { need = -1; break; }
    }
    writeMove(IO + 1 + 3 * i, &rootL[i]); IO[3 + 3 * i] = need;
  }
}
EXPORT(set_net_use) void set_net_use(int on) { useNet = on; }
static void initPST(void);
// the board size (9, 5 = Fanoron-Tsivy; 5, 5 = Fanoron-Dimy). The endgame databases and the learned evaluation are for 9x5 only.
#ifdef MT
// the rule in force (shared): written last by set_rule / set_alq, so a helper thread waits for it before its setup
static volatile int ruleKey = 9 | 5 << 4;
#define RULE_DONE() __atomic_store_n(&ruleKey, GW | GH << 4 | (ALQ + ALQF) << 8, __ATOMIC_SEQ_CST)
EXPORT(rule_key) int rule_key(void) { return __atomic_load_n(&ruleKey, __ATOMIC_SEQ_CST); }
#else
#define RULE_DONE()
#endif
EXPORT(set_alq) void set_alq(int on) { int a = on ? 1 : 0, f = on == 2; if (a != ALQ || f != ALQF) { ALQ = a; ALQF = f; new_game(); } RULE_DONE(); }   // 1 Bell's rules, 2 Alfonso's (no endgame tables)
EXPORT(set_rule) void set_rule(int w, int h) {
  initGeo();
  if (w == GW && h == GH) { RULE_DONE(); return; }
  GW = w; GH = h; ruleStd = w == 9 && h == 5;
  buildNB(); initPST(); new_game(); RULE_DONE();
}
EXPORT(eg_root) int eg_root(void) { return ruleStd ? egProbe(&ROOT) : ALQ && !ALQF && GW == 5 ? aegProbe(&ROOT) : -1; }
EXPORT(eval_root) int eval_root(void) { return evaluate(&ROOT); }
EXPORT(perft) u32 perft_root(int depth);
static u64 perftR(Pos *p, int d, int ply) { if (d == 0) return 1; Move *L = MS[ply]; int n = gen(p, L); if (d == 1) return n; u64 s = 0; for (int i = 0; i < n; i++) { Pos q = *p; doMove(&q, &L[i]); s += perftR(&q, d - 1, ply + 1); } return s; }
u32 perft_root(int depth) { Pos q = ROOT; return (u32)perftR(&q, depth, 0); }

#ifdef MT
// ---------------------------------------------------------------- threads (engine_mt.wasm; shared/mtengine.js, mt-helper.js)
extern unsigned char __heap_base;
extern void __wasm_init_tls(void *);
EXPORT(mt_heap_base) u32 mt_heap_base(void) { return (u32)&__heap_base; }
EXPORT(mt_tls_size) u32 mt_tls_size(void) { return __builtin_wasm_tls_size(); }
// every instance first: mt_stack (its own stack: the top address; a function without a frame of its own), then mt_thread
// (its TLS block and thread number; the first instance — the page's own — also fills the shared tables)
EXPORT(mt_stack) void mt_stack(u32 stackTop) { __asm__ volatile(".globaltype __stack_pointer, i32\n local.get %0\n global.set __stack_pointer" :: "r"(stackTop)); }
// (the thread's own variables are set in a function of their own: in mt_thread itself the compiler reads the TLS base once,
// before __wasm_init_tls has moved it, and the stores would land in the old block)
static __attribute__((noinline)) void mtSelf(u32 tls, int id) {
  threadId = id;
  MS = (Move (*)[MAXMV])((tls + __builtin_wasm_tls_size() + 63) & ~63u);   // (the stack grows down from the slot's top towards it)
}
EXPORT(mt_thread) void mt_thread(u32 tls, int id) { __wasm_init_tls((void *)tls); mtSelf(tls, id); initGeo(); initPST(); initCB(); }
EXPORT(mt_id) int mt_id(void) { return threadId; }
EXPORT(mt_stop) void mt_stop(int v) { __atomic_store_n(&gStop, v, __ATOMIC_SEQ_CST); }
EXPORT(last_nodes) double last_nodes(void) { return (double)nodes; }   // (this thread's last search: the page's nps readout)
#endif
