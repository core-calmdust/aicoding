// English checkers (8x8 draughts) search engine in C, compiled to WebAssembly for the browser
// (also builds natively for the tools: -DNATIVE).
//
// Rules: 32 dark squares, Black (side 0) moves first and moves "down" the board (towards higher square numbers),
// White (side 1) moves up. Men move one square diagonally forward, kings one square in any diagonal direction.
// Captures are compulsory; a capturing piece must keep jumping while it can (any capture sequence may be chosen,
// there is no "take the most" rule); men capture forward only; a man that reaches the far row is crowned and the
// move ends there. A side without a legal move loses. Draws (host + search): threefold repetition / the 40-move rule
// (80 plies without a man move or a capture).
//
// Search: iterative deepening negamax alpha-beta (PVS) with aspiration windows, a transposition table, killer and
// history move ordering, late move reductions, capture quiescence, repetition / 40-move draws, mate-distance values,
// optional learned evaluation (small net with an incrementally updatable first layer) and optional endgame databases
// (win / loss / draw, loaded by the host).
//
// Build (wasm): clang --target=wasm32 -O3 -ffast-math [-msimd128] -nostdlib -fno-builtin -Wl,--no-entry -Wl,--export-dynamic
//               -Wl,--initial-memory=67108864 -Wl,--max-memory=268435456 -o engine[_simd].wasm engine.c   (see tools/build.sh)
// Host protocol: everything goes through the shared i32 buffer at io_ptr() (see the EXPORTs at the end).
#include <stdint.h>
// MT (engine_mt.wasm, tools/build.sh): several threads search one root together on a shared memory ("Lazy SMP"); the state of
// one search is thread-local (TLS), the geometry, the evaluation weights, the endgame databases and the transposition table
// are shared. Without it TLS is nothing and the normal builds stay byte for byte as before.
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
#define MAXPLY 128
#define MAXMV 64
#define DRAW_PLIES 80

static TLS i32 IO[8192];
EXPORT(io_ptr) i32 *io_ptr(void) { return IO; }

// ---------------------------------------------------------------- geometry
// square index i = 0..31 (standard square number i+1); row = i>>2 (row 0 = Black's back row at the top)
// even rows use columns 1,3,5,7, odd rows columns 0,2,4,6. Directions: 0 down-left, 1 down-right, 2 up-left, 3 up-right
static i8 NB[4][32], JP[4][32];
static u32 ROW[8], PROMO[2], BACK[2];
static u64 ZP[4][32], ZSIDE;
static int geoReady = 0;
static u64 rs64 = 0x9E3779B97F4A7C15ull;
static u64 rnd64(void) { rs64 ^= rs64 << 13; rs64 ^= rs64 >> 7; rs64 ^= rs64 << 17; return rs64; }
static void initGeo(void) {
  if (geoReady) return;
  for (int i = 0; i < 32; i++) {
    int r = i >> 2, c = i & 3, col = (r & 1) ? 2 * c : 2 * c + 1;
    static const int DR[4] = { 1, 1, -1, -1 }, DC[4] = { -1, 1, -1, 1 };
    for (int d = 0; d < 4; d++) {
      int nr = r + DR[d], nc = col + DC[d];
      NB[d][i] = (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) ? (i8)(nr * 4 + (nc >> 1)) : -1;
    }
    ROW[r] |= 1u << i;
  }
  for (int d = 0; d < 4; d++) for (int i = 0; i < 32; i++) JP[d][i] = NB[d][i] >= 0 ? NB[d][NB[d][i]] : -1;
  PROMO[0] = ROW[7]; PROMO[1] = ROW[0]; BACK[0] = ROW[0]; BACK[1] = ROW[7];
  for (int k = 0; k < 4; k++) for (int i = 0; i < 32; i++) ZP[k][i] = rnd64();
  ZSIDE = rnd64();
  geoReady = 1;
}

// ---------------------------------------------------------------- position / moves
typedef struct { u32 p[2]; u32 k; int side; } Pos;        // p[0] black pieces, p[1] white pieces, k kings (both)
typedef struct { u32 cap; u8 f, t, promo, n; } Move;        // n = number of captured pieces
static inline int pc(u32 x) { return __builtin_popcount(x); }
static inline int ctz(u32 x) { return __builtin_ctz(x); }
static u64 hashOf(const Pos *p) {
  u64 h = 0;
  for (int s = 0; s < 2; s++) for (u32 x = p->p[s]; x; x &= x - 1) { int i = ctz(x); h ^= ZP[s * 2 + ((p->k >> i) & 1)][i]; }
  if (p->side) h ^= ZSIDE;
  return h;
}
static inline int dirOk(int side, int king, int d) { return king || (side == 0 ? d < 2 : d >= 2); }
// capture sequences (DFS). occ: occupied squares with the moving piece lifted; captured pieces stay until the end.
static void jumpDFS(const Pos *p, int start, int cur, int king, u32 capd, u32 occ, u32 opp, Move *L, int *n) {
  int side = p->side, any = 0;
  for (int d = 0; d < 4; d++) {
    if (!dirOk(side, king, d)) continue;
    int m = NB[d][cur]; if (m < 0) continue;
    u32 mb = 1u << m; if (!(opp & mb) || (capd & mb)) continue;
    int l = JP[d][cur]; if (l < 0 || (occ & (1u << l))) continue;
    any = 1;
    u32 nc = capd | mb;
    if (!king && (PROMO[side] & (1u << l))) {   // crowned: the move ends here
      Move mv = { nc, (u8)start, (u8)l, 1, (u8)pc(nc) }; L[(*n)++] = mv; continue;
    }
    jumpDFS(p, start, l, king, nc, occ, opp, L, n);
  }
  if (!any && capd) {
    for (int j = 0; j < *n; j++) if (L[j].f == start && L[j].t == cur && L[j].cap == capd) return;   // same move by another path
    Move mv = { capd, (u8)start, (u8)cur, 0, (u8)pc(capd) }; L[(*n)++] = mv;
  }
}
static int genCaps(const Pos *p, Move *L) {
  int side = p->side, n = 0; u32 own = p->p[side], opp = p->p[side ^ 1], occ = own | opp;
  for (u32 x = own; x; x &= x - 1) {
    int i = ctz(x), king = (p->k >> i) & 1, can = 0;
    for (int d = 0; d < 4 && !can; d++) { if (!dirOk(side, king, d)) continue; int m = NB[d][i], l = JP[d][i]; if (l >= 0 && (opp >> m & 1) && !(occ >> l & 1)) can = 1; }
    if (can) jumpDFS(p, i, i, king, 0, occ & ~(1u << i), opp, L, &n);
  }
  return n;
}
static int hasCaps(const Pos *p) {
  int side = p->side; u32 own = p->p[side], opp = p->p[side ^ 1], occ = own | opp;
  for (u32 x = own; x; x &= x - 1) {
    int i = ctz(x), king = (p->k >> i) & 1;
    for (int d = 0; d < 4; d++) { if (!dirOk(side, king, d)) continue; int m = NB[d][i], l = JP[d][i]; if (l >= 0 && (opp >> m & 1) && !(occ >> l & 1)) return 1; }
  }
  return 0;
}
static int genQuiet(const Pos *p, Move *L) {
  int side = p->side, n = 0; u32 own = p->p[side], occ = own | p->p[side ^ 1];
  for (u32 x = own; x; x &= x - 1) {
    int i = ctz(x), king = (p->k >> i) & 1;
    for (int d = 0; d < 4; d++) {
      if (!dirOk(side, king, d)) continue;
      int t = NB[d][i]; if (t < 0 || (occ >> t & 1)) continue;
      Move mv = { 0, (u8)i, (u8)t, (u8)(!king && (PROMO[side] >> t & 1)), 0 }; L[n++] = mv;
    }
  }
  return n;
}
static int gen(const Pos *p, Move *L) { int n = genCaps(p, L); return n ? n : genQuiet(p, L); }
static inline int anyMove(const Pos *p) {
  if (hasCaps(p)) return 1;
  int side = p->side; u32 own = p->p[side], occ = own | p->p[side ^ 1];
  for (u32 x = own; x; x &= x - 1) {
    int i = ctz(x), king = (p->k >> i) & 1;
    for (int d = 0; d < 4; d++) { if (!dirOk(side, king, d)) continue; int t = NB[d][i]; if (t >= 0 && !(occ >> t & 1)) return 1; }
  }
  return 0;
}
static inline void doMove(Pos *p, const Move *m) {
  int s = p->side; u32 fb = 1u << m->f, tb = 1u << m->t;
  // fb == tb when a king's capture loop ends on its starting square: the piece stays where it is
  p->p[s] = (p->p[s] & ~fb) | tb;
  if (m->cap) { p->p[s ^ 1] &= ~m->cap; p->k &= ~m->cap; }
  if (p->k & fb) p->k = (p->k & ~fb) | tb; else if (m->promo) p->k |= tb;
  p->side = s ^ 1;
}
static inline u64 hashMove(u64 h, const Pos *p, const Move *m) {   // p = position before the move
  int s = p->side, king = (p->k >> m->f) & 1;
  h ^= ZP[s * 2 + king][m->f] ^ ZP[s * 2 + (king | m->promo)][m->t] ^ ZSIDE;
  for (u32 x = m->cap; x; x &= x - 1) { int i = ctz(x); h ^= ZP[(s ^ 1) * 2 + ((p->k >> i) & 1)][i]; }
  return h;
}
static inline int irreversible(const Pos *p, const Move *m) { return m->cap || !((p->k >> m->f) & 1); }
static inline u32 mvKey(const Move *m) { return (u32)m->f | ((u32)m->t << 5) | ((u32)m->promo << 10); }

// ---------------------------------------------------------------- endgame databases (win/loss/draw, from the host)
// classes by (black men, black kings, white men, white kings) with total pieces <= DBMAX; indexing in egIndex().
#define DBMAX 6
static const u8 *EGD[DBMAX + 1][DBMAX + 1][DBMAX + 1][DBMAX + 1];   // 2 bits per position, both sides to move
static u32 EGN[DBMAX + 1][DBMAX + 1][DBMAX + 1][DBMAX + 1];
static int egMaxN = 0;
static u32 CB[33][33];
static void initCB(void) { if (CB[0][0]) return; for (int a = 0; a <= 32; a++) { CB[a][0] = 1; for (int k = 1; k <= a; k++) CB[a][k] = CB[a - 1][k - 1] + (k <= a - 1 ? CB[a - 1][k] : 0); } }
// rank of a set of squares within a list of allowed squares (combinatorial number system)
static u32 rankIn(u32 set, u32 allowed) {
  u32 r = 0; int j = 0, k = 0;
  for (u32 a = allowed; a; a &= a - 1) { int i = ctz(a); if (set >> i & 1) { k++; if (j >= k) r += CB[j][k]; } j++; }
  return r;
}
// index of a position within its class; the class size is EGN. Black men are ranked among the 28 squares off row 7.
static u32 egIndex(const Pos *p, int bm, int bk, int wm, int wk) {
  u32 BM = p->p[0] & ~p->k, BK = p->p[0] & p->k, WM = p->p[1] & ~p->k, WK = p->p[1] & p->k;
  u32 all = 0xFFFFFFFFu;
  u32 a1 = all & ~ROW[7], i1 = rankIn(BM, a1);                    // black men among 28
  u32 a2 = all & ~BM, i2 = rankIn(WM, a2);                         // white men among 32 - bm (indices with a white man on row 0 are unused)
  u32 a3 = all & ~BM & ~WM, i3 = rankIn(BK, a3);                   // black kings among 32 - bm - wm
  u32 a4 = a3 & ~BK, i4 = rankIn(WK, a4);
  u32 n2 = CB[32 - bm][wm], n3 = CB[32 - bm - wm][bk], n4 = CB[32 - bm - wm - bk][wk];
  return ((i1 * n2 + i2) * n3 + i3) * n4 + i4;
}
EXPORT(eg_size) u32 eg_size(int bm, int bk, int wm, int wk) {
  initCB(); if (bm > 28 || wm > 28) return 0;
  return CB[28][bm] * CB[32 - bm][wm] * CB[32 - bm - wm][bk] * CB[32 - bm - wm - bk][wk];
}
EXPORT(eg_add) void eg_add(int bm, int bk, int wm, int wk, const u8 *data) {
  initCB(); EGD[bm][bk][wm][wk] = data; EGN[bm][bk][wm][wk] = eg_size(bm, bk, wm, wk);
  int n = bm + bk + wm + wk; if (n > egMaxN) egMaxN = n;
}
// 0 unknown, 1 win (side to move), 2 loss, 3 draw. Only quiet positions are stored meaningfully (captures resolved by search)
static int egProbe(const Pos *p) {
  int n = pc(p->p[0] | p->p[1]); if (n > egMaxN) return 0;
  int bm = pc(p->p[0] & ~p->k), bk = pc(p->p[0] & p->k), wm = pc(p->p[1] & ~p->k), wk = pc(p->p[1] & p->k);
  if (!bm && !bk) return p->side ? 1 : 2; if (!wm && !wk) return p->side ? 2 : 1;
  const u8 *D = EGD[bm][bk][wm][wk]; if (!D) return 0;
  u32 idx = egIndex(p, bm, bk, wm, wk) * 2 + p->side;
  return (D[idx >> 2] >> ((idx & 3) * 2)) & 3;
}

// progress inside a database win (side to move's view, |x| < 150): the database knows the result but not how to get there,
// so the winner is steered towards captures, crowning and closing in on the loser's pieces (the loser does the opposite).
static int egProg(const Pos *p, int winnerToMove) {
  int me = winnerToMove ? p->side : p->side ^ 1, op = me ^ 1;
  u32 M = p->p[me], O = p->p[op];
  int x = (pc(M) - pc(O)) * 25 + (pc(M & p->k) - pc(O & p->k)) * 6;
  for (u32 a = M & ~p->k; a; a &= a - 1) { int q = ctz(a), r = q >> 2; x += me ? (7 - r) * 3 : r * 3; }   // men run for the crown
  int dist = 0;
  for (u32 a = M & p->k; a; a &= a - 1) {
    int q = ctz(a), r = q >> 2, c = ((q & 3) << 1) + !(r & 1), best = 14;
    for (u32 b = O; b; b &= b - 1) { int t = ctz(b), r2 = t >> 2, c2 = ((t & 3) << 1) + !(r2 & 1), dr = r > r2 ? r - r2 : r2 - r, dc = c > c2 ? c - c2 : c2 - c, d = dr > dc ? dr : dc; if (d < best) best = d; }
    dist += best;
  }
  x -= dist * 3;
  if (x > 140) x = 140; if (x < -140) x = -140;
  return winnerToMove ? x : -x;
}
// ---------------------------------------------------------------- evaluation (side to move, man = 100)
// learned evaluation: inputs 4x32 (own man, own king, opp man, opp king, from the mover's view: the board is flipped for
// White so the mover always moves "down") -> H (clipped ReLU) -> H2 (clipped ReLU) -> 1. Weights from the host.
#define NIN 128
#define NH_MAX 128
#define NH2_MAX 32
static float W1[NIN * NH_MAX], B1[NH_MAX], W2[NH_MAX * NH2_MAX], B2[NH2_MAX], W3[NH2_MAX], B3; static int NH = 0, NH2 = 0; static float NSCALE = 1;
EXPORT(net_ptr) float *net_ptr(void) { return W1; }
static int netIdx(int part) { return part == 0 ? 0 : 0; }
EXPORT(net_set) void net_set(int h, int h2, float scale) {   // weights at net_ptr() as one block: W1 B1 W2 B2 W3 B3
  float *src = W1; NH = h; NH2 = h2; NSCALE = scale; (void)netIdx;
  static float buf[NIN * NH_MAX + NH_MAX + NH_MAX * NH2_MAX + NH2_MAX + NH2_MAX + 1];
  int n = NIN * h + h + h * h2 + h2 + h2 + 1;
  for (int i = 0; i < n; i++) buf[i] = src[i];
  int o = 0;
  for (int i = 0; i < NIN * h; i++) W1[i] = buf[o++];
  for (int i = 0; i < h; i++) B1[i] = buf[o++];
  for (int i = 0; i < h * h2; i++) W2[i] = buf[o++];
  for (int i = 0; i < h2; i++) B2[i] = buf[o++];
  for (int i = 0; i < h2; i++) W3[i] = buf[o++];
  B3 = buf[o++];
}
static inline int flipSq(int i) { return 31 - i; }   // 180° rotation keeps the dark squares and swaps the sides
static int netEval(const Pos *p) {
  int s = p->side; float acc[NH_MAX]; const int H = NH, H2 = NH2;
  for (int k = 0; k < H; k++) acc[k] = B1[k];
  for (int who = 0; who < 2; who++) {
    u32 x = p->p[s ^ who];
    for (; x; x &= x - 1) {
      int i = ctz(x), sq = s ? flipSq(i) : i, kind = who * 2 + ((p->k >> i) & 1);
      const float *w = W1 + (kind * 32 + sq) * H;
      for (int k = 0; k < H; k++) acc[k] += w[k];
    }
  }
  for (int k = 0; k < H; k++) acc[k] = acc[k] < 0 ? 0 : acc[k] > 1 ? 1 : acc[k];
  float out = B3;
  for (int j = 0; j < H2; j++) {
    float z = B2[j]; const float *w = W2 + j * H;
    for (int k = 0; k < H; k++) z += w[k] * acc[k];
    z = z < 0 ? 0 : z > 1 ? 1 : z;
    out += W3[j] * z;
  }
  int v = (int)(out * NSCALE + (out >= 0 ? 0.5f : -0.5f));
  return v > 9000 ? 9000 : v < -9000 ? -9000 : v;
}

// hand-written evaluation (used when no net is loaded, and by the lower levels)
static const int CENTER_SQ[32] = {   // a small bonus for men in the middle of the board (black's view)
  0, 0, 0, 0,  1, 2, 2, 1,  2, 4, 4, 2,  3, 6, 6, 3,
  3, 6, 6, 3,  2, 4, 4, 2,  1, 2, 2, 1,  0, 0, 0, 0 };
static const int KING_SQ[32] = {     // kings: centre good, edges / single corner worse
  -6, -2, -2, -6,  -2, 3, 3, 0,  0, 6, 6, 1,  2, 9, 9, 0,
   0, 9, 9, 2,   1, 6, 6, 0,  0, 3, 3, -2,  -6, -2, -2, -6 };
static int hand(const Pos *p) {
  int s = p->side;
  int sc[2];
  int npc = pc(p->p[0] | p->p[1]);
  for (int c = 0; c < 2; c++) {
    u32 own = p->p[c], men = own & ~p->k, kings = own & p->k, opp = p->p[c ^ 1];
    int v = 100 * pc(men) + 135 * pc(kings);
    // men: advancement (more valuable as the board empties), centre, back rank guard
    for (u32 x = men; x; x &= x - 1) {
      int i = ctz(x), sq = c ? flipSq(i) : i, row = sq >> 2;
      v += CENTER_SQ[sq] + (npc <= 12 ? row * 3 : row);
    }
    u32 back = men & BACK[c];
    if (pc(opp & p->k) == 0) {   // the back rank matters while the opponent has no king yet
      int b1 = c ? flipSq(0) : 0, b3 = c ? flipSq(2) : 2;   // squares 1 and 3 (30 and 32 for White): the "bridge"
      if ((back >> b1 & 1) && (back >> b3 & 1)) v += 16;
      v += 5 * pc(back);
    }
    // kings: centralization; a king trapped in the single corner against men is bad
    for (u32 x = kings; x; x &= x - 1) { int i = ctz(x); v += KING_SQ[i]; }
    // runaway men: a free path to the crowning row
    for (u32 x = men; x; x &= x - 1) {
      int i = ctz(x), sq = c ? flipSq(i) : i, row = sq >> 2;
      if (row >= 4) {
        // squares ahead within the cone are empty and no enemy piece can reach in time (simple test)
        u32 cone = 0; int okc = 1;
        for (int r = row + 1; r < 8 && okc; r++) {
          int dist = r - row;
          for (int j = 0; j < 4; j++) {
            int q = r * 4 + j, qc = (r & 1) ? 2 * j : 2 * j + 1, colI = (row & 1) ? 2 * (sq & 3) : 2 * (sq & 3) + 1;
            int dc = qc - colI; if (dc < 0) dc = -dc;
            if (dc <= dist) cone |= 1u << (c ? flipSq(q) : q);
          }
        }
        if (!(cone & opp)) v += 22 + (row - 4) * 10;
      }
    }
    // mobility (cheap)
    sc[c] = v;
  }
  int diff = sc[s] - sc[s ^ 1];
  // trade down when ahead: the same material lead is worth more with fewer pieces
  int ms = 100 * pc(p->p[s]) , mo = 100 * pc(p->p[s ^ 1]);
  if (ms != mo && npc < 24) { int lead = ms - mo; diff += lead * (24 - npc) / 48; }
  // tempo: the side with the quieter (less advanced) position in the opening is fine; nothing here
  // double corner: a lone king in the endgame keeps the double corners (squares 1/5 and 28/32)
  if (pc(p->p[s]) == 1 && pc(p->p[s ^ 1]) >= 2) { u32 dc = (1u << 0) | (1u << 4) | (1u << 27) | (1u << 31); if (p->p[s] & p->k & dc) diff += 30; }
  if (pc(p->p[s ^ 1]) == 1 && pc(p->p[s]) >= 2) { u32 dc = (1u << 0) | (1u << 4) | (1u << 27) | (1u << 31); if (p->p[s ^ 1] & p->k & dc) diff -= 30;
    // drive the lone king: get close to it
    int e = ctz(p->p[s ^ 1]), er = e >> 2, ec = (er & 1) ? 2 * (e & 3) : 2 * (e & 3) + 1;
    for (u32 x = p->p[s] & p->k; x; x &= x - 1) { int i = ctz(x), r = i >> 2, cc = (r & 1) ? 2 * (i & 3) : 2 * (i & 3) + 1; int dr = r - er, dd = cc - ec; if (dr < 0) dr = -dr; if (dd < 0) dd = -dd; diff -= 2 * (dr > dd ? dr : dd); }
  }
  return diff;
}
// ---------------------------------------------------------------- NNUE (v2 nets, header 'CKN2')
// features: (piece-count bucket) x (own man, own king, opp man, opp king) x 32 squares, each seen from both sides
// (c = 0 Black as is, c = 1 White with the board rotated 180°). Two int16 accumulators (QA = 127 ~ 1.0), the mover's first:
// [clip(acc_mover), clip(acc_other)] (2H) -> L1 (int16 weights, QB = 256) -> clipped ReLU -> L2 (float) -> clipped ReLU -> 1,
// the L1..output layers chosen by an output bucket (piece count). Value = out * scale (man = 100). See tools/nn/.
#define N2_HMAX 512
#define N2_L1MAX 32
#define N2_L2MAX 32
#define N2_FBMAX 4
#define N2_OBMAX 8
#define N2_QA 127
#define N2_QB 256
static int N2 = 0, N2FB = 1, N2H = 0, N2L1 = 0, N2L2 = 0, N2OB = 1; static float N2SCALE = 100;
static i16 N2FW[N2_FBMAX * 128 * N2_HMAX] __attribute__((aligned(16))), N2FBIAS[N2_HMAX] __attribute__((aligned(16)));
static i16 N2W1[N2_OBMAX][N2_L1MAX * 2 * N2_HMAX] __attribute__((aligned(16))); static i32 N2B1[N2_OBMAX][N2_L1MAX];
static float N2W2[N2_OBMAX][N2_L2MAX * N2_L1MAX], N2B2[N2_OBMAX][N2_L2MAX], N2W3[N2_OBMAX][N2_L2MAX], N2B3[N2_OBMAX];
static u8 N2BUF[1 << 21];
EXPORT(net2_buf) u8 *net2_buf(void) { return N2BUF; }
static u32 rdU32(const u8 *b) { return (u32)b[0] | (u32)b[1] << 8 | (u32)b[2] << 16 | (u32)b[3] << 24; }
// load a v2 net from N2BUF (the whole file, len bytes). Returns 1 when it was accepted.
EXPORT(net2_load) int net2_load(int len) {
  const u8 *b = N2BUF; N2 = 0;
  if (len < 28 || rdU32(b) != 0x324E4B43u) return 0;
  int fb = rdU32(b + 4), h = rdU32(b + 8), l1 = rdU32(b + 12), l2 = rdU32(b + 16), ob = rdU32(b + 20); float sc; u32 t = rdU32(b + 24); memcpy(&sc, &t, 4);
  if (fb < 1 || fb > N2_FBMAX || h < 8 || h > N2_HMAX || (h & 7) || l1 < 1 || l1 > N2_L1MAX || l2 < 1 || l2 > N2_L2MAX || ob < 1 || ob > N2_OBMAX) return 0;
  long need = 28 + (long)fb * 128 * h * 2 + h * 2 + (long)ob * ((long)l1 * 2 * h * 2 + l1 * 4 + l2 * l1 * 4 + l2 * 4 + l2 * 4 + 4);
  if (len < need) return 0;
  const u8 *q = b + 28;
  memcpy(N2FW, q, (long)fb * 128 * h * 2); q += (long)fb * 128 * h * 2;
  memcpy(N2FBIAS, q, h * 2); q += h * 2;
  for (int o = 0; o < ob; o++) {
    memcpy(N2W1[o], q, (long)l1 * 2 * h * 2); q += (long)l1 * 2 * h * 2;
    memcpy(N2B1[o], q, l1 * 4); q += l1 * 4;
    memcpy(N2W2[o], q, l2 * l1 * 4); q += l2 * l1 * 4;
    memcpy(N2B2[o], q, l2 * 4); q += l2 * 4;
    memcpy(N2W3[o], q, l2 * 4); q += l2 * 4;
    memcpy(&N2B3[o], q, 4); q += 4;
  }
  N2FB = fb; N2H = h; N2L1 = l1; N2L2 = l2; N2OB = ob; N2SCALE = sc; N2 = 1;
  return 1;
}
static inline int n2Bucket(int npc, int nb) { int b = (24 - npc) * nb / 24; return b < 0 ? 0 : b >= nb ? nb - 1 : b; }
#ifdef __wasm_simd128__
#include <wasm_simd128.h>
#endif
#ifdef MT
static TLS i16 (*ACC2)[2][N2_HMAX];   // each thread's accumulators: in its own slot, after its TLS block (mt_thread)
#else
static i16 ACC2[MAXPLY + 4][2][N2_HMAX] __attribute__((aligned(16)));
#endif
// a = b - w0 + w1 (w1 / w0 may be 0), H a multiple of 8
static inline void n2Row(i16 *a, const i16 *b, const i16 *w0, const i16 *w1, int H) {
#ifdef __wasm_simd128__
  if (w0 && w1) for (int k = 0; k < H; k += 8) wasm_v128_store(a + k, wasm_i16x8_add(wasm_i16x8_sub(wasm_v128_load(b + k), wasm_v128_load(w0 + k)), wasm_v128_load(w1 + k)));
  else if (w1) for (int k = 0; k < H; k += 8) wasm_v128_store(a + k, wasm_i16x8_add(wasm_v128_load(b + k), wasm_v128_load(w1 + k)));
  else for (int k = 0; k < H; k += 8) wasm_v128_store(a + k, wasm_i16x8_sub(wasm_v128_load(b + k), wasm_v128_load(w0 + k)));
#else
  if (w0 && w1) for (int k = 0; k < H; k++) a[k] = (i16)(b[k] - w0[k] + w1[k]);
  else if (w1) for (int k = 0; k < H; k++) a[k] = (i16)(b[k] + w1[k]);
  else for (int k = 0; k < H; k++) a[k] = (i16)(b[k] - w0[k]);
#endif
}
static TLS u8 ACC2B[MAXPLY + 4];   // feature bucket the accumulators of this ply were built with
static void acc2Full(const Pos *p, int ply) {
  const int H = N2H, fb = n2Bucket(pc(p->p[0] | p->p[1]), N2FB);
  ACC2B[ply] = (u8)fb;
  for (int c = 0; c < 2; c++) {
    i16 *a = ACC2[ply][c]; for (int k = 0; k < H; k++) a[k] = N2FBIAS[k];
    for (int who = 0; who < 2; who++) for (u32 x = p->p[c ^ who]; x; x &= x - 1) {
      int i = ctz(x); n2Row(a, a, 0, N2FW + ((long)(fb * 4 + who * 2 + ((p->k >> i) & 1)) * 32 + (c ? 31 - i : i)) * H, H);
    }
  }
}
static void acc2Move(const Pos *p, const Move *m, int ply) {   // p = position before m (at ply), result at ply + 1
  int fb = ACC2B[ply];
  if (m->cap) {
    int nb = n2Bucket(pc(p->p[0] | p->p[1]) - m->n, N2FB);
    if (nb != fb) { Pos q = *p; doMove(&q, m); acc2Full(&q, ply + 1); return; }
  }
  ACC2B[ply + 1] = (u8)fb;
  const int H = N2H, s = p->side, k0 = (p->k >> m->f) & 1, k1 = k0 | m->promo;
  for (int c = 0; c < 2; c++) {
    const i16 *src = ACC2[ply][c]; i16 *a = ACC2[ply + 1][c];
    const int who = s == c ? 0 : 1, base = fb * 4;
    const i16 *wf = N2FW + ((long)(base + who * 2 + k0) * 32 + (c ? 31 - m->f : m->f)) * H;
    const i16 *wt = N2FW + ((long)(base + who * 2 + k1) * 32 + (c ? 31 - m->t : m->t)) * H;
    n2Row(a, src, wf, wt, H);
    for (u32 x = m->cap; x; x &= x - 1) {
      int i = ctz(x); n2Row(a, a, N2FW + ((long)(base + (who ^ 1) * 2 + ((p->k >> i) & 1)) * 32 + (c ? 31 - i : i)) * H, 0, H);
    }
  }
}
static int net2Out(const Pos *p, const i16 *am, const i16 *ao) {   // accumulators of the mover and of the other side
  const int H = N2H, L1 = N2L1, L2 = N2L2, ob = n2Bucket(pc(p->p[0] | p->p[1]), N2OB);
  i16 x[2 * N2_HMAX] __attribute__((aligned(16)));
  float h1[N2_L1MAX];
  const float inv = 1.0f / (N2_QA * N2_QB);
#ifdef __wasm_simd128__
  { const v128_t lo = wasm_i16x8_splat(0), hi = wasm_i16x8_splat(N2_QA);
    for (int k = 0; k < H; k += 8) {
      wasm_v128_store(x + k, wasm_i16x8_min(wasm_i16x8_max(wasm_v128_load(am + k), lo), hi));
      wasm_v128_store(x + H + k, wasm_i16x8_min(wasm_i16x8_max(wasm_v128_load(ao + k), lo), hi));
    } }
  for (int j = 0; j < L1; j += 4) {   // four outputs per pass over x (L1 rows past the end are never read: n > 0 only for j + r < L1)
    const int n = L1 - j < 4 ? L1 - j : 4;
    const i16 *w0 = N2W1[ob] + (long)j * 2 * H, *w1 = n > 1 ? w0 + 2 * H : w0, *w2 = n > 2 ? w0 + 4 * H : w0, *w3 = n > 3 ? w0 + 6 * H : w0;
    v128_t s0 = wasm_i32x4_splat(0), s1 = s0, s2 = s0, s3 = s0;
    for (int k = 0; k < 2 * H; k += 8) {
      v128_t xv = wasm_v128_load(x + k);
      s0 = wasm_i32x4_add(s0, wasm_i32x4_dot_i16x8(xv, wasm_v128_load(w0 + k)));
      s1 = wasm_i32x4_add(s1, wasm_i32x4_dot_i16x8(xv, wasm_v128_load(w1 + k)));
      s2 = wasm_i32x4_add(s2, wasm_i32x4_dot_i16x8(xv, wasm_v128_load(w2 + k)));
      s3 = wasm_i32x4_add(s3, wasm_i32x4_dot_i16x8(xv, wasm_v128_load(w3 + k)));
    }
    i32 sum[4] = {
      wasm_i32x4_extract_lane(s0, 0) + wasm_i32x4_extract_lane(s0, 1) + wasm_i32x4_extract_lane(s0, 2) + wasm_i32x4_extract_lane(s0, 3),
      wasm_i32x4_extract_lane(s1, 0) + wasm_i32x4_extract_lane(s1, 1) + wasm_i32x4_extract_lane(s1, 2) + wasm_i32x4_extract_lane(s1, 3),
      wasm_i32x4_extract_lane(s2, 0) + wasm_i32x4_extract_lane(s2, 1) + wasm_i32x4_extract_lane(s2, 2) + wasm_i32x4_extract_lane(s2, 3),
      wasm_i32x4_extract_lane(s3, 0) + wasm_i32x4_extract_lane(s3, 1) + wasm_i32x4_extract_lane(s3, 2) + wasm_i32x4_extract_lane(s3, 3) };
    for (int r = 0; r < n; r++) { float z = (float)(sum[r] + N2B1[ob][j + r]) * inv; h1[j + r] = z < 0 ? 0 : z > 1 ? 1 : z; }
  }
#else
  for (int k = 0; k < H; k++) { int v = am[k]; x[k] = (i16)(v < 0 ? 0 : v > N2_QA ? N2_QA : v); }
  for (int k = 0; k < H; k++) { int v = ao[k]; x[H + k] = (i16)(v < 0 ? 0 : v > N2_QA ? N2_QA : v); }
  for (int j = 0; j < L1; j += 4) {   // four outputs per pass over x (auto-vectorized: NEON on Apple silicon, AVX2 on x86)
    const int n = L1 - j < 4 ? L1 - j : 4;
    const i16 *w0 = N2W1[ob] + (long)j * 2 * H, *w1 = n > 1 ? w0 + 2 * H : w0, *w2 = n > 2 ? w0 + 4 * H : w0, *w3 = n > 3 ? w0 + 6 * H : w0;
    i32 s0 = 0, s1 = 0, s2 = 0, s3 = 0;
    for (int k = 0; k < 2 * H; k++) { i32 xv = x[k]; s0 += xv * w0[k]; s1 += xv * w1[k]; s2 += xv * w2[k]; s3 += xv * w3[k]; }
    i32 sum[4] = { s0, s1, s2, s3 };
    for (int r = 0; r < n; r++) { float z = (float)(sum[r] + N2B1[ob][j + r]) * inv; h1[j + r] = z < 0 ? 0 : z > 1 ? 1 : z; }
  }
#endif
  float out = N2B3[ob];
  for (int j = 0; j < L2; j++) {
    const float *w = N2W2[ob] + j * L1; float z = N2B2[ob][j];
    for (int k = 0; k < L1; k++) z += w[k] * h1[k];
    z = z < 0 ? 0 : z > 1 ? 1 : z;
    out += N2W3[ob][j] * z;
  }
  float vf = out * N2SCALE; int v = (int)(vf + (vf >= 0 ? 0.5f : -0.5f));
  return v > 9000 ? 9000 : v < -9000 ? -9000 : v;
}
static int net2Eval(const Pos *p) { acc2Full(p, MAXPLY + 3); return net2Out(p, ACC2[MAXPLY + 3][p->side], ACC2[MAXPLY + 3][p->side ^ 1]); }

static int useNet = 1;   // (shared under MT: values(), which turns it off, never runs on the threads)
static inline int evaluate(const Pos *p) { return useNet && N2 ? net2Eval(p) : (NH && useNet) ? netEval(p) : hand(p); }
// incremental first layer: ACC[ply][c] = the first-layer sums seen from side c (c = 0 Black, 1 White), updated move by move
#ifdef MT
static TLS float (*ACC)[2][NH_MAX];
#else
static float ACC[MAXPLY + 4][2][NH_MAX];
#endif
static inline int sqOf(int c, int i) { return c ? 31 - i : i; }
static void accFull(const Pos *p, int ply) {
  const int H = NH;
  for (int c = 0; c < 2; c++) {
    float *a = ACC[ply][c]; for (int k = 0; k < H; k++) a[k] = B1[k];
    for (int who = 0; who < 2; who++) for (u32 x = p->p[c ^ who]; x; x &= x - 1) {
      int i = ctz(x); const float *w = W1 + ((who * 2 + ((p->k >> i) & 1)) * 32 + sqOf(c, i)) * H;
      for (int k = 0; k < H; k++) a[k] += w[k];
    }
  }
}
static void accMove(const Pos *p, const Move *m, int ply) {   // p = position before m (at ply), result at ply + 1
  const int H = NH, s = p->side, k0 = (p->k >> m->f) & 1, k1 = k0 | m->promo;
  for (int c = 0; c < 2; c++) {
    const float *src = ACC[ply][c]; float *a = ACC[ply + 1][c];
    const int who = s == c ? 0 : 1, whoCap = who ^ 1;
    const float *wf = W1 + ((who * 2 + k0) * 32 + sqOf(c, m->f)) * H, *wt = W1 + ((who * 2 + k1) * 32 + sqOf(c, m->t)) * H;
    for (int k = 0; k < H; k++) a[k] = src[k] - wf[k] + wt[k];
    for (u32 x = m->cap; x; x &= x - 1) { int i = ctz(x); const float *w = W1 + ((whoCap * 2 + ((p->k >> i) & 1)) * 32 + sqOf(c, i)) * H; for (int k = 0; k < H; k++) a[k] -= w[k]; }
  }
}
static int netEvalAcc(const Pos *p, int ply) {
  const float *a = ACC[ply][p->side]; float h[NH_MAX]; const int H = NH, H2 = NH2;
  for (int k = 0; k < H; k++) { float v = a[k]; h[k] = v < 0 ? 0 : v > 1 ? 1 : v; }
  float out = B3;
  for (int j = 0; j < H2; j++) {
    float z = B2[j]; const float *w = W2 + j * H;
    for (int k = 0; k < H; k++) z += w[k] * h[k];
    z = z < 0 ? 0 : z > 1 ? 1 : z;
    out += W3[j] * z;
  }
  int v = (int)(out * NSCALE + (out >= 0 ? 0.5f : -0.5f));
  return v > 9000 ? 9000 : v < -9000 ? -9000 : v;
}
static inline int netOn(void) { return useNet && (N2 || NH); }
static inline void accRoot(const Pos *p) { if (N2) acc2Full(p, 0); else accFull(p, 0); }
static inline void accStep(const Pos *p, const Move *m, int ply) { if (N2) acc2Move(p, m, ply); else accMove(p, m, ply); }
static inline int evalAt(const Pos *p, int ply) {
  if (!useNet) return hand(p);
  if (N2) return net2Out(p, ACC2[ply][p->side], ACC2[ply][p->side ^ 1]);
  return NH ? netEvalAcc(p, ply) : hand(p);
}


// ---------------------------------------------------------------- transposition table
typedef struct { u64 key; u32 cap; i16 v; u8 ft[2]; i8 d; u8 flag; u8 age; u8 pad; } TTE;   // 24 bytes
#ifdef NATIVE
#define TT_BITS 22
#else
#define TT_BITS 20
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
#ifndef MT
static void ttStore(u64 key, int d, int flag, int v, const Move *m, int ply) {
  TTE *e = &TT[key & ((1 << TT_BITS) - 1)];
  if (e->key != key && e->age == ttAge && e->d > d + 2) return;   // keep deeper entries of this search
  if (e->key == key && !m) { /* keep the old move */ } else if (m) { e->cap = m->cap; e->ft[0] = m->f; e->ft[1] = m->t | (m->promo << 7); } else { e->cap = 0; e->ft[0] = 255; }
  e->key = key; e->d = (i8)(d > 120 ? 120 : d); e->flag = (u8)flag; e->v = (i16)vToTT(v, ply); e->age = ttAge;
}
#endif
#ifdef MT
// engine_mt.wasm: the threads' shared table (2026-11-09, after the Mac bench). The plain TT above (one slot per key, the
// fields written one by one) is not used: with up to 14 threads a slot is often half written by one thread while another
// reads it, and one slot per key was overwritten so often (10x the nodes in the same time) that the deep entries were lost.
// Here: buckets of two entries, each entry 3 x u64 { key ^ a ^ b, a, b } (a = cap | v | ft, b = d | flag | age), so a
// torn entry fails the key check and is never used ("lockless", as in Stockfish / Crafty); store = the same key's entry,
// else the shallower / older one of the bucket (depth − 8 if from an earlier search). 2^TTM_BITS buckets x 48 bytes.
#ifndef TTM_BITS
#define TTM_BITS 20
#endif
// (2026-11-15) the bucket table is Praline's (shared/praline/praline_tt.h): 2 entries a bucket, 3 words { kx, a, b }; replace the
// shallower / older (depth − 8 if from an earlier search)
#define PL_TT_BITS TTM_BITS
#define PL_TT_WAYS 2
#define PL_TT_WORDS 3
#define PL_TT_SCORE(e) ((int)(i8)(e)[2] - ((((e)[2] >> 16) & 255) != (u64)ttAge ? 8 : 0))
#include "../shared/praline/praline_tt.h"
static inline void ttLoad(u64 key, TTE *e) {
  const u64 *x = plttFind(key, key);
  if (x) {
    const u64 a = x[1], b = x[2];
    e->key = key; e->cap = (u32)a; e->v = (i16)(a >> 32); e->ft[0] = (u8)(a >> 48); e->ft[1] = (u8)(a >> 56);
    e->d = (i8)b; e->flag = (u8)(b >> 8); e->age = (u8)(b >> 16); return;
  }
  e->key = ~key;
}
static void ttStore(u64 key, int d, int flag, int v, const Move *m, int ply) {
  int hit, age = ttAge; u64 *x = plttSlot(key, key, &hit);
  u64 a = (u64)m->cap | (u64)(u16)(i16)vToTT(v, ply) << 32 | (u64)m->f << 48 | (u64)(u8)(m->t | (m->promo << 7)) << 56;
  u64 b = (u64)(u8)(i8)(d > 120 ? 120 : d) | (u64)flag << 8 | (u64)age << 16;
  plttWrite(x, key, a, b);
}
EXPORT(new_game) void new_game(void) { u64 *p = PL_TT; for (unsigned long i = 0; i < sizeof(PL_TT) / 8; i++) p[i] = 0; ttAge = 0; }
#else
EXPORT(new_game) void new_game(void) { memset(TT, 0, sizeof(TT)); ttAge = 0; }
#endif

// ---------------------------------------------------------------- search
static TLS u64 nodes; static TLS double tEnd; static TLS int stopFlag, nodeLimit_on; static TLS u64 nodeLimit, nodeMask = 2047;   // small node limits are checked every 128 nodes
EXPORT(nodes_k) int nodes_k(void) { return (int)(nodes / 1000); }   // nodes of the last search, in thousands (speed checks)
static TLS int hist[2][32][32];
static TLS Move killers[MAXPLY][2];
static TLS u64 hkeys[1024 + MAXPLY]; static TLS int hn, hirr;   // hash history (game + search) and index after the last irreversible move
static TLS int rootPly;   // plies since the last irreversible move at the root (40-move rule)
static TLS int seldepth;
static inline int sameMove(const Move *a, const Move *b) { return a->f == b->f && a->t == b->t && a->cap == b->cap; }
#ifdef MT
// (2026-11-11) the threads' machinery — gStop, threadId, the busy marks, the split points of Young Brothers Wait
// (MODEL_CARD.md「マルチスレッドの見直し その3：YBW」), mt_idle — is Praline's, the site's common thinking engine
// (claude/praline-spec.md, shared/praline/): the same code as before, the game's part of it ("glue") here.
// (2026-11-09) every thread's last finished iteration on the current root: { key ^ x, x }, x = depth | value | move index
// (in gen() order) — the main thread answers with the deepest one, and a helper that finishes the main thread's depth
// limit ends the search (gHit = the root's key). The main thread clears them when its search begins.
#define MT_SLOTS 64
static u64 gRes[MT_SLOTS][2];
static volatile u64 gGoalKey, gHit; static volatile int gGoal;
static TLS u64 rootKey;
// (2026-11-10, as morris/engine.c, after the Mac bench: same depth x1.66 / x1.62 / x2.34 with 4 / 8 / 14 threads although
// the nodes/s grew x4.1 / x7.4 / x10) busy marks (praline.h), from remaining depth BUSY_D. (2026-11-11) Young Brothers Wait:
// see "split points" after search(); stopFlag 2 / 3 there. A split point carries the node's position, its key, the
// repetition history since the last capture and the plies since then, and per move its reduction (as the one-thread loop).
#ifndef BUSY_D
#define BUSY_D 3
#endif
#ifndef SPLIT_D
#define SPLIT_D 3
#endif
#define SP_MV MAXMV
#define SP_HK 128
#define PL_SP_FIELDS \
  int qp0; Pos pos; u64 key; int hn, hirr; u64 hk[SP_HK];   /* the position, its key and the repetition history since the last capture */ \
  u8 red[SP_MV];                                            /* the moves' reductions (as the one-thread loop) */
#include "../shared/praline/praline.h"
static inline int timeUp(void) {
  if (stopFlag) return 1;
  if ((nodes & nodeMask) == 0) { if ((tEnd > 0 && now() > tEnd) || (nodeLimit_on && nodes > nodeLimit) || gStop || (threadId == 0 && gHit == rootKey)) stopFlag = 1; }
  if (!stopFlag && (curSP || dupMode) && (nodes & 511) == 0) {   // (YBW: a cut-off above, sooner)
    if (curSP && chainStopped(curSP, curIdx)) stopFlag = 2;
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
static void spLoadPos(const SPt *s, int top, int fresh) {   // a thread joining s: the repetition history (fresh: the net's first layer anew)
  (void)top;
  hn = s->hn; hirr = s->hirr; for (int i = hirr; i < hn; i++) hkeys[i] = s->hk[i - hirr];
  if (fresh && netOn()) { if (N2) acc2Full(&s->pos, s->ply); else accFull(&s->pos, s->ply); }
}
#else
static inline int timeUp(void) {
  if (stopFlag) return 1;
  if ((nodes & nodeMask) == 0) { if ((tEnd > 0 && now() > tEnd) || (nodeLimit_on && nodes > nodeLimit)) stopFlag = 1; }
  return stopFlag;
}
#endif
// (2026-11-14) search v2 (MODEL_CARD.md「探索 v2」): stronger pruning, no training. Only where v2on (best_n without a node
// limit — 四段・五段 and PRO by time — and analyze()); the node levels (4級〜三段) and values() search as before. -DSV_x=0 drops one.
#ifndef SV_NULL
#define SV_NULL 1
#endif
#ifndef NULL_MIN
#define NULL_MIN 6         // null move only while the side to move has at least this many pieces (zugzwang in the endgame)
#endif
#ifndef SV_RFP
#define SV_RFP 1
#endif
#ifndef RFP_D
#define RFP_D 4
#endif
#ifndef RFP_M
#define RFP_M 80
#endif
#ifndef SV_LMP
#define SV_LMP 1
#endif
#ifndef LMP_D
#define LMP_D 3
#endif
#ifndef LMP_A
#define LMP_A 4
#endif
#ifndef LMP_B
#define LMP_B 2
#endif
#ifndef SV_FUT
#define SV_FUT 1
#endif
#ifndef FUT_D
#define FUT_D 2
#endif
#ifndef FUT_M
#define FUT_M 120
#endif
#ifndef SV_LMRT
#define SV_LMRT 1
#endif
#ifndef LMR_C
#define LMR_C 60
#endif
#ifndef LMR_K
#define LMR_K 180
#endif
#ifndef SV_IIR
#define SV_IIR 1
#endif
static int V2_FORCE;   // (tools/native.c: 1 = v2 also with a node limit, −1 = the search before v2 also by time; matches)
static volatile int v2on;   // (shared: the helper threads search the split points as the main thread)
static TLS u8 noNull[MAXPLY + 8];
static u8 LT[64][64];
static float lnf(float x) {   // (no libm in the wasm build) ln x for x >= 1
  int k = 0; while (x >= 2) { x *= 0.5f; k++; }
  float z = (x - 1) / (x + 1), z2 = z * z, t = z, r = 0; for (int j = 1; j < 30; j += 2) { r += t / j; t *= z2; }
  return 2 * r + k * 0.69314718f;
}
static void setV2(int on) {
  if (!LT[63][63]) for (int d = 1; d < 64; d++) for (int i = 1; i < 64; i++) { float r = LMR_C / 100.0f + lnf((float)d) * lnf((float)i) * 100.0f / LMR_K; LT[d][i] = (u8)(r < 0 ? 0 : (int)r); }
  if (on != v2on) { new_game(); v2on = on; }
}
// the reduction of the quiet move i (before v2 / v2 off: as before)
static inline int lmrR(int depth, int i, const Move *m, int caps, int pv, int v2) {
  if (!v2 || !SV_LMRT) {
    if (depth >= 3 && i >= 3 && !caps && !m->promo && !pv) return 1 + (i >= 8 && depth >= 6);
    if (depth >= 3 && i >= 4 && !caps && !m->promo) return 1;
    return 0;
  }
  if (depth < 3 || i < 2 || caps || m->promo) return 0;
  int r = LT[depth < 63 ? depth : 63][i < 63 ? i : 63] - pv;
  if (r > depth - 2) r = depth - 2;
  return r < 0 ? 0 : r;
}
static inline int svPrune(int depth, int i, const Move *m, int caps, int pv, int se, int alpha) {
  if (pv || i == 0 || caps || m->promo || se == -INF) return 0;
#if SV_LMP
  if (depth <= LMP_D && i >= LMP_A + LMP_B * depth * depth) return 1;
#endif
#if SV_FUT
  if (depth <= FUT_D && i >= 2 && se + FUT_M * depth <= alpha && alpha < WINT) return 1;
#endif
  (void)depth; (void)alpha; return 0;
}
static int isRep(u64 key, int from) {   // the position occurred before since the last irreversible move
  for (int i = hn - 2; i >= from; i -= 2) if (hkeys[i] == key) return 1;
  return 0;
}
static int search(Pos *p, int depth, int alpha, int beta, int ply, u64 key, int pv, int quietPlies) {
  if (ply > 0) {
    if (quietPlies >= DRAW_PLIES) return 0;
    if (isRep(key, hirr)) return 0;
    // mate distance pruning
    int ma = -(WIN - ply), mb = WIN - ply - 1;
    if (ma > alpha) { alpha = ma; if (alpha >= beta) return alpha; }
    if (mb < beta) { beta = mb; if (alpha >= beta) return beta; }
  }
  if (timeUp() && ply > 0) return 0;
  Move L[MAXMV]; int n = genCaps(p, L), caps = n;
  if (!n) n = genQuiet(p, L);
  if (!n) return -(WIN - ply);
  if (ply >= MAXPLY - 4) return evalAt(p, ply);
  // endgame database (quiet positions)
  if (egMaxN && !caps && ply > 0) {
    int e = egProbe(p);
    if (e) {
      int v = e == 1 ? WINT - 200 - ply + egProg(p, 1) : e == 2 ? -(WINT - 200 - ply) + egProg(p, 0) : 0;
      if (e == 3) return 0;
      if (e == 1 && v >= beta) return v;
      if (e == 2 && v <= alpha) return v;
      if (e == 3) return 0;
    }
  }
  if (n == 1 && ply > 0) depth++;          // forced move: does not cost depth
  else if (caps && depth <= 0) depth = 1;   // captures pending at the horizon: resolve them (quiescence)
  if (depth <= 0) { nodes++; int e = egMaxN ? egProbe(p) : 0; if (e == 3) return 0; if (e) return e == 1 ? WINT - 200 - ply + egProg(p, 1) : -(WINT - 200 - ply) + egProg(p, 0); return evalAt(p, ply); }
  nodes++;
  if (ply > seldepth) seldepth = ply;
  // transposition table
#ifdef MT
  TTE te, *e = &te; ttLoad(key, &te);
#else
  TTE *e = &TT[key & ((1 << TT_BITS) - 1)];
#endif
  Move ttm = { 0, 255, 0, 0, 0 };
  if (e->key == key) {
    if (e->ft[0] != 255) { ttm.f = e->ft[0]; ttm.t = e->ft[1] & 31; ttm.promo = e->ft[1] >> 7; ttm.cap = e->cap; }
    if (!pv && e->d >= depth && ply > 0) {
      int v = vFromTT(e->v, ply);
      if (e->flag == TT_EXACT || (e->flag == TT_LOWER && v >= beta) || (e->flag == TT_UPPER && v <= alpha)) return v;
    }
  }
  const int v2 = v2on; int se = -INF;
  if (v2 && !pv && ply > 0 && !caps && beta < WINT && beta > -WINT) {
    se = evalAt(p, ply);
#if SV_RFP
    if (depth <= RFP_D && se - RFP_M * depth >= beta) return se;
#endif
#if SV_NULL
    if (depth >= 3 && se >= beta && !noNull[ply] && pc(p->p[p->side]) >= NULL_MIN && pc(p->p[p->side ^ 1]) >= 2 && ply < MAXPLY - 8) {
      Pos q = *p; q.side ^= 1;
      if (netOn()) { if (N2) for (int c = 0; c < 2; c++) for (int k = 0; k < N2_HMAX; k++) ACC2[ply + 1][c][k] = ACC2[ply][c][k];
                     else for (int c = 0; c < 2; c++) for (int k = 0; k < NH_MAX; k++) ACC[ply + 1][c][k] = ACC[ply][c][k]; }
      int saveIrr = hirr; hkeys[hn++] = key; hirr = hn; noNull[ply + 1] = 1;
      int v = -search(&q, depth - 1 - (2 + depth / 4), -beta, -beta + 1, ply + 1, key ^ ZSIDE, 0, quietPlies);
      noNull[ply + 1] = 0; hn--; hirr = saveIrr;
      if (stopFlag) return 0;
      if (v >= beta) return v > WINT ? beta : v;
    }
#endif
  }
#if SV_IIR
  if (v2 && ttm.f == 255 && depth >= 4) depth--;
#endif
  // move ordering scores
  int sc[MAXMV];
  for (int i = 0; i < n; i++) {
    Move *m = &L[i]; int s = 0;
    if (ttm.f != 255 && sameMove(m, &ttm)) s = 1 << 30;
    else if (m->cap) s = (1 << 28) + m->n * 1000 + m->promo * 500;
    else {
      if (sameMove(m, &killers[ply][0])) s = 1 << 27; else if (sameMove(m, &killers[ply][1])) s = (1 << 27) - 1;
      else s = hist[p->side][m->f][m->t] + (m->promo ? 1 << 26 : 0);
    }
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
    if (k > 0 && k < n && !noSplit && depth >= splitD && (gIdle > 0 || (gWaitN > 0 && spWanted()))) {
      SPt *sp = spAlloc(); int ns = 0;
      if (sp && spFillPos(sp, p, key)) {
        for (int j = k; j < n + nDef; j++) {
          int ii;
          if (j < n) {
            ii = j; int bi = j; for (int x = j + 1; x < n; x++) if (sc[x] > sc[bi]) bi = x;
            if (bi != j) { Move tm = L[bi]; L[bi] = L[j]; L[j] = tm; int ts = sc[bi]; sc[bi] = sc[j]; sc[j] = ts; }
          } else ii = defI[j - n];
          if (v2 && svPrune(depth, ii, &L[ii], caps, pv, se, alpha)) continue;
          int red = lmrR(depth, ii, &L[ii], caps, pv, v2);
          sp->mv[ns] = L[ii]; sp->red[ns] = (u8)red; ns++;
        }
      }
      if (ns >= 2) {
        sp->n = ns; sp->depth = depth; sp->ply = ply; sp->root = 0; sp->all = 0; sp->pv = pv; sp->qp0 = quietPlies; sp->beta = beta;
        sp->alpha = alpha;
        spRun(sp, &best, &bestM, 0);
        if (stopFlag) { hn--; return best > -INF ? best : 0; }
        if (best >= beta && !bestM.cap) {
          if (!sameMove(&bestM, &killers[ply][0])) { killers[ply][1] = killers[ply][0]; killers[ply][0] = bestM; }
          int *h = &hist[p->side][bestM.f][bestM.t]; *h += depth * depth; if (*h > (1 << 24)) for (int a = 0; a < 2; a++) for (int b = 0; b < 32; b++) for (int c = 0; c < 32; c++) hist[a][b][c] >>= 1;
        }
        break;
      }
      if (sp) spRelease(sp);
      noSplit = 1;   // (fewer than 2 moves left, or no free slot: on alone)
    }
    if (k < n) {
      i = k; int bi = i; for (int j = i + 1; j < n; j++) if (sc[j] > sc[bi]) bi = j;
      { Move tm = L[bi]; L[bi] = L[i]; L[i] = tm; int ts = sc[bi]; sc[bi] = sc[i]; sc[i] = ts; }
    } else i = defI[k - n];
    Move *m = &L[i];
    if (v2 && best > -WINT && svPrune(depth, i, m, caps, pv, se, alpha)) continue;
    u64 k2 = hashMove(key, p, m);
    if (k < n && i > 0 && depth >= BUSY_D && nDef < BUSY_DEF && busyOther(k2)) { defI[nDef++] = i; continue; }
    const int mk = depth >= BUSY_D ? busySet(k2) : -1;
    Pos q = *p; doMove(&q, m);
    if (netOn()) accStep(p, m, ply);
#else
  for (int i = 0; i < n; i++) {
    int bi = i; for (int j = i + 1; j < n; j++) if (sc[j] > sc[bi]) bi = j;
    { Move tm = L[bi]; L[bi] = L[i]; L[i] = tm; int ts = sc[bi]; sc[bi] = sc[i]; sc[i] = ts; }
    Move *m = &L[i];
    if (v2 && best > -WINT && svPrune(depth, i, m, caps, pv, se, alpha)) break;   // (the moves after a pruned quiet one are quiet)
    Pos q = *p; doMove(&q, m);
    if (netOn()) accStep(p, m, ply);
    u64 k2 = hashMove(key, p, m);
#endif
    int irr = irreversible(p, m), saveIrr = hirr;
    if (irr) hirr = hn;
    int qp = irr ? 0 : quietPlies + 1;
    int v, d1 = depth - 1;
    if (i == 0) v = -search(&q, d1, -beta, -alpha, ply + 1, k2, pv, qp);
    else {
      const int red = lmrR(depth, i, m, caps, pv, v2);
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
          if (!m->cap) {
            if (!sameMove(m, &killers[ply][0])) { killers[ply][1] = killers[ply][0]; killers[ply][0] = *m; }
            int *h = &hist[p->side][m->f][m->t]; *h += depth * depth; if (*h > (1 << 24)) for (int a = 0; a < 2; a++) for (int b = 0; b < 32; b++) for (int c = 0; c < 32; c++) hist[a][b][c] >>= 1;
          }
          break;
        }
      }
    }
  }
  hn--;
  ttStore(key, depth, best >= beta ? TT_LOWER : best > oldAlpha ? TT_EXACT : TT_UPPER, best, &bestM, ply);
  return best;
}

#ifdef MT
// ---------------------------------------------------------------- split points: the game's glue for Praline (praline_ybw.h)
// (2026-11-11, Young Brothers Wait; the method of reversi/engine.c v4 / v4.1 and xiangqi/engine.c, MODEL_CARD.md「マルチスレッドの
// 見直し その3：YBW」.) A helper copies the repetition history of the split point and builds the net's first layer for its
// position; the moves are searched with the one-thread loop's reductions, null window and re-search.
// the move i of s with the null window against a and the re-searches, as the one-thread loop (rootSearch at the root)
static int spSearch(SPt *s, int i, int a) {
  const int b = s->beta, d1 = s->depth - 1, ply = s->ply; const Move *m = &s->mv[i];
  Pos q = s->pos; doMove(&q, m);
  if (netOn()) accStep(&s->pos, m, ply);
  const u64 k2 = hashMove(s->key, &s->pos, m);
  const int mk = !s->all && s->depth >= BUSY_D ? busySet(k2) : -1;
  int irr = irreversible(&s->pos, m), saveIrr = hirr;
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
// a cut-off by the move i of s (not the root): this thread's killers / history, as the one-thread cut-off (no capture)
static void spCutoff(const SPt *s, int i) {
  if (s->mv[i].cap) return;
  const Move *m = &s->mv[i]; const int ply = s->ply, side = s->pos.side;
  if (!sameMove(m, &killers[ply][0])) { killers[ply][1] = killers[ply][0]; killers[ply][0] = *m; }
  int *h = &hist[side][m->f][m->t]; *h += s->depth * s->depth;
  if (*h > (1 << 24)) for (int x = 0; x < 2; x++) for (int y = 0; y < 32; y++) for (int c = 0; c < 32; c++) hist[x][y][c] >>= 1;
}
static inline int spTop(void) { return 0; }   // (the net's accumulators are by ply: nothing to keep)
static void waitCheck(void) {
  SIM_IDLE();
  if ((tEnd > 0 && now() > tEnd) || (nodeLimit_on && nodes > nodeLimit) || gStop || (threadId == 0 && gHit == rootKey)) stopFlag = 1;
  else if (curSP && chainStopped(curSP, curIdx)) stopFlag = 2;
}
static void spIdleReset(int fresh) {   // mt_idle: a helper's search state (fresh: a new job, as beginSearch)
  nodes = 0; tEnd = 0; nodeLimit_on = 0; nodeMask = 2047;
  if (fresh) {
    for (int a = 0; a < 2; a++) for (int b = 0; b < 32; b++) for (int c = 0; c < 32; c++) hist[a][b][c] >>= 2;
    memset(killers, 0, sizeof(killers));
  }
}
#include "../shared/praline/praline_ybw.h"
#endif


// ---------------------------------------------------------------- root / host interface
static TLS Pos ROOT; static TLS u64 rootKey;
static TLS Move rootL[MAXMV]; static TLS int rootN;
static TLS int rootVal[MAXMV];
// setup: IO = [black, white, kings, side, nmoves, (ft, cap) * nmoves]; ft = f | t << 5. Returns 1 if all moves were legal.
static int findMove(const Pos *p, int ft, u32 cap, Move *out) {
  Move L[MAXMV]; int n = gen(p, L);
  for (int i = 0; i < n; i++) if (L[i].f == (ft & 31) && L[i].t == ((ft >> 5) & 31) && L[i].cap == cap) { *out = L[i]; return 1; }
  return 0;
}
EXPORT(setup) int setup(void) {
  initGeo(); initCB();
  Pos p; p.p[0] = (u32)IO[0]; p.p[1] = (u32)IO[1]; p.k = (u32)IO[2]; p.side = IO[3];
  int nm = IO[4]; if (nm > 1000) nm = 1000;
  u64 key = hashOf(&p); hn = 0; hirr = 0; rootPly = 0;
  for (int i = 0; i < nm; i++) {
    Move m; if (!findMove(&p, IO[5 + 2 * i], (u32)IO[6 + 2 * i], &m)) return 0;
    hkeys[hn++] = key;
    if (irreversible(&p, &m)) { hirr = hn; rootPly = 0; } else rootPly++;
    key = hashMove(key, &p, &m); doMove(&p, &m);
  }
  ROOT = p; rootKey = key;
  rootN = gen(&p, rootL);
  return 1;
}
static void writeMove(i32 *o, const Move *m) { o[0] = m->f | (m->t << 5); o[1] = (i32)m->cap; }
// search the root moves; with all = 1 every move gets an exact value (for hints / analysis)
static int rootSearch(int depth, int all, int alpha0, int beta0) {
  int alpha = alpha0, best = -INF;
  if (netOn()) accRoot(&ROOT);
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
    if (netOn()) accStep(&ROOT, m, 0);
#else
  for (int i = 0; i < rootN; i++) {
    Move *m = &rootL[i]; Pos q = ROOT; doMove(&q, m);
    if (netOn()) accStep(&ROOT, m, 0);
    u64 k2 = hashMove(rootKey, &ROOT, m);
#endif
    int irr = irreversible(&ROOT, m), saveIrr = hirr; hkeys[hn++] = rootKey; if (irr) hirr = hn;
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
static void sortRoot(void) {   // by value, stable
  for (int i = 1; i < rootN; i++) { Move m = rootL[i]; int v = rootVal[i], j = i - 1; while (j >= 0 && rootVal[j] < v) { rootL[j + 1] = rootL[j]; rootVal[j + 1] = rootVal[j]; j--; } rootL[j + 1] = m; rootVal[j + 1] = v; }
}
static void beginSearch(int ms) {
  stopFlag = 0; nodes = 0; tEnd = ms > 0 ? now() + ms : 0;
#ifdef MT
  if (threadId == 0)   // (only the main thread ages the shared table)
#endif
  ttAge++;
  for (int a = 0; a < 2; a++) for (int b = 0; b < 32; b++) for (int c = 0; c < 32; c++) hist[a][b][c] >>= 2;
  memset(killers, 0, sizeof(killers));
}
// best move: IO[0..1] = move, IO[2] = value, IO[3] = depth, IO[4] = nodes / 1000
static void bestN(int maxDepth, int ms, u64 nodeLim);
// nodeK: node limit in thousands (0 = none); best_n takes it in nodes (the weak levels need less than 1,000)
EXPORT(best) void best(int maxDepth, int ms, int nodeK) { bestN(maxDepth, ms, nodeK > 0 ? (u64)nodeK * 1000 : 0); }
EXPORT(best_n) void best_n(int maxDepth, int ms, int nodeLim) { bestN(maxDepth, ms, nodeLim > 0 ? (u64)nodeLim : 0); }
#ifdef MT
// (helpers: every thread iterates 1, 2, 3, … like the main one. Tried 2026-11-09: Stockfish's pattern of skipped depths per
// helper — slower to the main thread's depth in the simulation.)
static int moveIndex(const Move *m) {   // the move's index in gen() order of the root
  Move L[MAXMV]; int n = gen(&ROOT, L);
  for (int i = 0; i < n; i++) if (sameMove(&L[i], m)) return i;
  return -1;
}
static void mtPublish(int d, int v, const Move *m) {   // a finished iteration of this thread
  int k = moveIndex(m); if (k < 0 || threadId >= MT_SLOTS) return;
  u64 x = (u64)(d & 255) | (u64)(u16)(i16)v << 8 | (u64)k << 24 | 1ull << 40;
  __atomic_store_n(&gRes[threadId][1], x, __ATOMIC_SEQ_CST); __atomic_store_n(&gRes[threadId][0], rootKey ^ x, __ATOMIC_SEQ_CST);
  if (threadId && d >= gGoal && gGoalKey == rootKey) gHit = rootKey;
}
#endif
static void bestN(int maxDepth, int ms, u64 nodeLim) {
#ifdef MT
  if (threadId == 0)
#endif
  setV2(V2_FORCE ? V2_FORCE > 0 : nodeLim == 0);
  beginSearch(ms); nodeLimit_on = nodeLim > 0; nodeLimit = nodeLim; nodeMask = nodeLimit_on && nodeLim < 100000 ? 127 : 2047;
  if (rootN == 0) { IO[0] = -1; IO[1] = 0; IO[2] = -WIN; IO[3] = 0; return; }
  Move bm = rootL[0]; int bv = 0, bd = 0;
  if (rootN == 1) { writeMove(IO, &bm); IO[2] = 0; IO[3] = 0; IO[4] = 0; return; }
  for (int i = 0; i < rootN; i++) rootVal[i] = -INF;
  int prev = 0, d0 = 1;
#ifdef MT
  if (threadId == 0) {   // a new search: forget the threads' results of the last one, set the depth goal
    for (int i = 0; i < MT_SLOTS; i++) { __atomic_store_n(&gRes[i][0], 0, __ATOMIC_SEQ_CST); __atomic_store_n(&gRes[i][1], 0, __ATOMIC_SEQ_CST); }
    gHit = 0; gGoal = maxDepth < MAXPLY - 8 ? maxDepth : MAXPLY; gGoalKey = rootKey;
  }
#endif
  for (int d = d0; d <= maxDepth && d < MAXPLY - 8; d++) {
    seldepth = 0;
    int a = d >= 4 ? prev - 40 : -INF, b = d >= 4 ? prev + 40 : INF, v;
    for (;;) {
      v = rootSearch(d, 0, a, b);
      if (stopFlag) break;
      if (v <= a) { a = a - 200 < -INF ? -INF : a - 200; if (a < -2000) a = -INF; continue; }
      if (v >= b) { b = b + 200 > INF ? INF : b + 200; if (b > 2000) b = INF; continue; }
      break;
    }
    if (stopFlag && d > 1) {   // keep a move that was proven better at this depth
      break;
    }
    // move the best to the front (values of the others are bounds)
    int bi = 0; for (int i = 1; i < rootN; i++) if (rootVal[i] > rootVal[bi]) bi = i;
    if (bi) { Move t = rootL[bi]; int tv = rootVal[bi]; for (int i = bi; i > 0; i--) { rootL[i] = rootL[i - 1]; rootVal[i] = rootVal[i - 1]; } rootL[0] = t; rootVal[0] = tv; }
    for (int i = 1; i < rootN; i++) rootVal[i] = -INF;
    bm = rootL[0]; bv = v; bd = d; prev = v;
#ifdef MT
    IO[4] = (i32)(nodes / 1000);   // (the nodes so far, for the helpers' progress readouts)
    mtPublish(d, v, &bm);
#endif
    progress(d, 1);
    if (v > WINT && WIN - v <= d) break;   // a forced win found
    if (v < -WINT && WIN + v <= d) break;
    if (ms > 0 && d > 1 && now() > tEnd - ms * 0.45) break;   // the next iteration would most likely not finish
#ifdef MT
    if (gStop) break;
#endif
  }
#ifdef MT
  if (threadId == 0) {   // the deepest finished iteration of all the threads (the main thread's on a tie)
    int bt = -1, bdep = bd;
    for (int i = 1; i < MT_SLOTS; i++) {
      u64 x = __atomic_load_n(&gRes[i][1], __ATOMIC_SEQ_CST), kx = __atomic_load_n(&gRes[i][0], __ATOMIC_SEQ_CST);
      if (!(x >> 40) || (kx ^ x) != rootKey) continue;
      int dd = (int)(x & 255); if (dd > bdep) { bdep = dd; bt = i; }
    }
    if (bt > 0) {
      u64 x = __atomic_load_n(&gRes[bt][1], __ATOMIC_SEQ_CST), kx = __atomic_load_n(&gRes[bt][0], __ATOMIC_SEQ_CST);
      Move L[MAXMV]; int n = gen(&ROOT, L), k = (int)((x >> 24) & 255);
      if ((kx ^ x) == rootKey && k < n) { bm = L[k]; bv = (i16)(u16)(x >> 8); bd = (int)(x & 255); }
    }
    gGoalKey = 0; gHit = 0;
  }
#endif
  writeMove(IO, &bm); IO[2] = bv; IO[3] = bd; IO[4] = (i32)(nodes / 1000);
}
// analysis: exact values of all root moves. IO[0] = n, IO[1] = depth, then (ft, cap, v) * n, best first
EXPORT(analyze) void analyze(int ms, int maxDepth) {
  setV2(1); beginSearch(ms); nodeLimit_on = 0; nodeMask = 2047;
  int depthDone = 0; int vals[MAXMV]; Move ord[MAXMV];
  for (int i = 0; i < rootN; i++) { ord[i] = rootL[i]; vals[i] = 0; }
  if (rootN) {
    for (int d = 1; d <= maxDepth && d < MAXPLY - 8; d++) {
      rootSearch(d, 1, -INF, INF);
      if (stopFlag && d > 1) break;
      sortRoot();
      for (int i = 0; i < rootN; i++) { ord[i] = rootL[i]; vals[i] = rootVal[i]; }
      depthDone = d;
      IO[0] = rootN; IO[1] = depthDone; for (int i = 0; i < rootN; i++) { writeMove(IO + 2 + 3 * i, &ord[i]); IO[4 + 3 * i] = vals[i]; }
      progress(d, rootN);
      int solved = 1; for (int i = 0; i < rootN; i++) if (vals[i] < WINT && vals[i] > -WINT) solved = 0;
      if (solved && d > 2) break;
      if (rootN == 1 && d >= 8) break;
      if (stopFlag) break;
      if (d > 1 && now() > tEnd - ms * 0.5) break;
    }
  }
  IO[0] = rootN; IO[1] = depthDone;
  for (int i = 0; i < rootN; i++) { writeMove(IO + 2 + 3 * i, &ord[i]); IO[4 + 3 * i] = vals[i]; }
}
// fixed-depth values of all root moves (weak levels): IO like analyze
EXPORT(values) void values(int depth, int noEval) {
  setV2(0); beginSearch(0); nodeLimit_on = 0; nodeMask = 2047;
  int saved = useNet; if (noEval) useNet = 0;
  for (int d = 1; d <= depth; d++) rootSearch(d, 1, -INF, INF);
  useNet = saved;
  sortRoot();
  IO[0] = rootN; IO[1] = depth;
  for (int i = 0; i < rootN; i++) { writeMove(IO + 2 + 3 * i, &rootL[i]); IO[4 + 3 * i] = rootVal[i]; }
}

// ---------------------------------------------------------------- puzzles
// forced win: can the side to move (attacker) make the opponent unable to move within k of its own moves?
static int winAtt(const Pos *p, int k, u64 *budget);
static int winDef(const Pos *p, int k, u64 *budget) {   // defender to move; attacker has k moves left after this reply
  Move L[MAXMV]; int n = gen(p, L);
  if (!n) return 1;
  if (k <= 0) return 0;
  for (int i = 0; i < n; i++) { if (!*budget) return -1; (*budget)--; Pos q = *p; doMove(&q, &L[i]); int r = winAtt(&q, k, budget); if (r != 1) return r; }
  return 1;
}
static int winAtt(const Pos *p, int k, u64 *budget) {
  Move L[MAXMV]; int n = gen(p, L);
  if (!n || k <= 0) return 0;
  int unk = 0;
  for (int i = 0; i < n; i++) { if (!*budget) return -1; (*budget)--; Pos q = *p; doMove(&q, &L[i]); int r = winDef(&q, k - 1, budget); if (r == 1) return 1; if (r < 0) unk = 1; }
  return unk ? -1 : 0;
}
// material gain ("shot"): within k own moves reach a position where the defender is to move, has no capture,
// and the attacker's piece lead (kings count 1) grew by at least g compared with the start (or the defender cannot move).
static TLS int gBase, gNeed;
static inline int lead(const Pos *p, int att) { return pc(p->p[att]) - pc(p->p[att ^ 1]); }
static int shotAtt(const Pos *p, int k, int att, u64 *budget);
static int shotDef(const Pos *p, int k, int att, u64 *budget) {
  Move L[MAXMV]; int n = gen(p, L);
  if (!n) return 1;
  if (!L[0].cap && lead(p, att) - gBase >= gNeed) return 1;
  if (k <= 0) return 0;
  for (int i = 0; i < n; i++) { if (!*budget) return -1; (*budget)--; Pos q = *p; doMove(&q, &L[i]); int r = shotAtt(&q, k, att, budget); if (r != 1) return r; }
  return 1;
}
static int shotAtt(const Pos *p, int k, int att, u64 *budget) {
  Move L[MAXMV]; int n = gen(p, L);
  if (!n || k <= 0) return 0;
  int unk = 0;
  for (int i = 0; i < n; i++) { if (!*budget) return -1; (*budget)--; Pos q = *p; doMove(&q, &L[i]); int r = shotDef(&q, k - 1, att, budget); if (r == 1) return 1; if (r < 0) unk = 1; }
  return unk ? -1 : 0;
}
// mate / shot values of the root moves. goal 0 = win, g > 0 = gain g pieces.
// attacker to move (defend = 0): need = own moves to reach the goal after each move (1 = this move does it, 0 = not within n)
// defender to move (defend = 1, the attacker had `base` lead at the puzzle start): need = attacker moves still needed after each reply (0 = escaped)
// IO out: [n, (ft, cap, need) * n]; need = -1 when the search budget ran out
EXPORT(puzzle) void puzzle(int n, int defend, int goal, int base, int budgetK) {
  int att = defend ? ROOT.side ^ 1 : ROOT.side;
  gNeed = goal; gBase = defend ? base : lead(&ROOT, att);
  IO[0] = rootN;
  for (int i = 0; i < rootN; i++) {
    Pos q = ROOT; doMove(&q, &rootL[i]);
    int need = 0;
    u64 budget = (u64)budgetK * 1000;
    for (int k = defend ? 1 : 0; k <= n - (defend ? 0 : 1); k++) {
      int r = defend ? (goal ? shotAtt(&q, k, att, &budget) : winAtt(&q, k, &budget)) : (goal ? shotDef(&q, k, att, &budget) : winDef(&q, k, &budget));
      if (r == 1) { need = defend ? k : k + 1; break; }
      if (r < 0) { need = -1; break; }
    }
    writeMove(IO + 1 + 3 * i, &rootL[i]); IO[3 + 3 * i] = need;
  }
}
EXPORT(set_net_use) void set_net_use(int on) { useNet = on; }
EXPORT(eval_root) int eval_root(void) { return evaluate(&ROOT); }
EXPORT(eg_probe_root) int eg_probe_root(void) { return egMaxN ? egProbe(&ROOT) : 0; }
EXPORT(heap_base) u8 *heap_base(void) {
#ifdef NATIVE
  return 0;
#else
  extern unsigned char __heap_base; return &__heap_base;
#endif
}

#ifdef MT
// ---------------------------------------------------------------- threads (engine_mt.wasm; shared/mtengine.js, mt-helper.js)
extern void __wasm_init_tls(void *);
EXPORT(mt_heap_base) u32 mt_heap_base(void) { extern unsigned char __heap_base; return (u32)&__heap_base; }
EXPORT(mt_tls_size) u32 mt_tls_size(void) { return __builtin_wasm_tls_size(); }
// every instance first: mt_stack (its own stack: the top address; a function without a frame of its own), then mt_thread
// (its TLS block, accumulators and thread number; the first instance — the page's own — also fills the shared tables)
EXPORT(mt_stack) void mt_stack(u32 stackTop) { __asm__ volatile(".globaltype __stack_pointer, i32\n local.get %0\n global.set __stack_pointer" :: "r"(stackTop)); }
// (the thread's own variables are set in a function of their own: in mt_thread itself the compiler reads the TLS base once,
// before __wasm_init_tls has moved it, and the stores would land in the old block)
static __attribute__((noinline)) void mtSelf(u32 tls, int id) {
  threadId = id;
  u32 a = (tls + __builtin_wasm_tls_size() + 63) & ~63u;   // (the stack grows down from the slot's top towards these)
  ACC2 = (i16 (*)[2][N2_HMAX])a; a += sizeof(i16) * (MAXPLY + 4) * 2 * N2_HMAX;
  ACC = (float (*)[2][NH_MAX])a;
}
EXPORT(mt_thread) void mt_thread(u32 tls, int id) { __wasm_init_tls((void *)tls); mtSelf(tls, id); initGeo(); initCB(); }
EXPORT(mt_id) int mt_id(void) { return threadId; }
EXPORT(mt_stop) void mt_stop(int v) { __atomic_store_n(&gStop, v, __ATOMIC_SEQ_CST); }
EXPORT(last_nodes) double last_nodes(void) { return (double)nodes; }   // (this thread's last search: the page's nps readout)
#endif
