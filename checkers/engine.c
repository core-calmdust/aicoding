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

static i32 IO[8192];
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
  p->p[s] ^= fb | tb;
  if (m->cap) { p->p[s ^ 1] &= ~m->cap; p->k &= ~m->cap; }
  if (p->k & fb) p->k ^= fb | tb; else if (m->promo) p->k |= tb;
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
static int useNet = 1;
static inline int evaluate(const Pos *p) { return (NH && useNet) ? netEval(p) : hand(p); }
// incremental first layer: ACC[ply][c] = the first-layer sums seen from side c (c = 0 Black, 1 White), updated move by move
static float ACC[MAXPLY + 4][2][NH_MAX];
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
static inline int evalAt(const Pos *p, int ply) { return (NH && useNet) ? netEvalAcc(p, ply) : hand(p); }


// ---------------------------------------------------------------- transposition table
typedef struct { u64 key; u32 cap; i16 v; u8 ft[2]; i8 d; u8 flag; u8 age; u8 pad; } TTE;   // 24 bytes
#ifdef NATIVE
#define TT_BITS 22
#else
#define TT_BITS 20
#endif
static TTE TT[1 << TT_BITS];
static u8 ttAge = 0;
#define TT_EXACT 3
#define TT_LOWER 1
#define TT_UPPER 2
static inline int vToTT(int v, int ply) { return v > WINT ? v + ply : v < -WINT ? v - ply : v; }
static inline int vFromTT(int v, int ply) { return v > WINT ? v - ply : v < -WINT ? v + ply : v; }
static void ttStore(u64 key, int d, int flag, int v, const Move *m, int ply) {
  TTE *e = &TT[key & ((1 << TT_BITS) - 1)];
  if (e->key != key && e->age == ttAge && e->d > d + 2) return;   // keep deeper entries of this search
  if (e->key == key && !m) { /* keep the old move */ } else if (m) { e->cap = m->cap; e->ft[0] = m->f; e->ft[1] = m->t | (m->promo << 7); } else { e->cap = 0; e->ft[0] = 255; }
  e->key = key; e->d = (i8)(d > 120 ? 120 : d); e->flag = (u8)flag; e->v = (i16)vToTT(v, ply); e->age = ttAge;
}
EXPORT(new_game) void new_game(void) { memset(TT, 0, sizeof(TT)); ttAge = 0; }

// ---------------------------------------------------------------- search
static u64 nodes; static double tEnd; static int stopFlag, nodeLimit_on; static u64 nodeLimit;
static int hist[2][32][32];
static Move killers[MAXPLY][2];
static u64 hkeys[1024 + MAXPLY]; static int hn, hirr;   // hash history (game + search) and index after the last irreversible move
static int rootPly;   // plies since the last irreversible move at the root (40-move rule)
static int seldepth;
static inline int sameMove(const Move *a, const Move *b) { return a->f == b->f && a->t == b->t && a->cap == b->cap; }
static inline int timeUp(void) {
  if (stopFlag) return 1;
  if ((nodes & 2047) == 0) { if ((tEnd > 0 && now() > tEnd) || (nodeLimit_on && nodes > nodeLimit)) stopFlag = 1; }
  return stopFlag;
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
  TTE *e = &TT[key & ((1 << TT_BITS) - 1)];
  Move ttm = { 0, 255, 0, 0, 0 };
  if (e->key == key) {
    if (e->ft[0] != 255) { ttm.f = e->ft[0]; ttm.t = e->ft[1] & 31; ttm.promo = e->ft[1] >> 7; ttm.cap = e->cap; }
    if (!pv && e->d >= depth && ply > 0) {
      int v = vFromTT(e->v, ply);
      if (e->flag == TT_EXACT || (e->flag == TT_LOWER && v >= beta) || (e->flag == TT_UPPER && v <= alpha)) return v;
    }
  }
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
  for (int i = 0; i < n; i++) {
    int bi = i; for (int j = i + 1; j < n; j++) if (sc[j] > sc[bi]) bi = j;
    { Move tm = L[bi]; L[bi] = L[i]; L[i] = tm; int ts = sc[bi]; sc[bi] = sc[i]; sc[i] = ts; }
    Move *m = &L[i];
    Pos q = *p; doMove(&q, m);
    if (NH && useNet) accMove(p, m, ply);
    u64 k2 = hashMove(key, p, m);
    int irr = irreversible(p, m), saveIrr = hirr;
    if (irr) hirr = hn;
    int qp = irr ? 0 : quietPlies + 1;
    int v, d1 = depth - 1;
    if (i == 0) v = -search(&q, d1, -beta, -alpha, ply + 1, k2, pv, qp);
    else {
      int red = 0;
      if (depth >= 3 && i >= 3 && !caps && !m->promo && !pv) red = 1 + (i >= 8 && depth >= 6);
      else if (depth >= 3 && i >= 4 && !caps && !m->promo) red = 1;
      v = -search(&q, d1 - red, -alpha - 1, -alpha, ply + 1, k2, 0, qp);
      if (v > alpha && red) v = -search(&q, d1, -alpha - 1, -alpha, ply + 1, k2, 0, qp);
      if (v > alpha && v < beta) v = -search(&q, d1, -beta, -alpha, ply + 1, k2, pv, qp);
    }
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

// ---------------------------------------------------------------- root / host interface
static Pos ROOT; static u64 rootKey;
static Move rootL[MAXMV]; static int rootN;
static int rootVal[MAXMV];
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
  if (NH && useNet) accFull(&ROOT, 0);
  for (int i = 0; i < rootN; i++) {
    Move *m = &rootL[i]; Pos q = ROOT; doMove(&q, m);
    if (NH && useNet) accMove(&ROOT, m, 0);
    u64 k2 = hashMove(rootKey, &ROOT, m);
    int irr = irreversible(&ROOT, m), saveIrr = hirr; hkeys[hn++] = rootKey; if (irr) hirr = hn;
    int qp = irr ? 0 : rootPly + 1, v;
    if (all) v = -search(&q, depth - 1, -INF, INF, 1, k2, 1, qp);
    else if (i == 0) v = -search(&q, depth - 1, -beta0, -alpha, 1, k2, 1, qp);
    else { v = -search(&q, depth - 1, -alpha - 1, -alpha, 1, k2, 0, qp); if (v > alpha && v < beta0 && !stopFlag) v = -search(&q, depth - 1, -beta0, -alpha, 1, k2, 1, qp); }
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
  stopFlag = 0; nodes = 0; tEnd = ms > 0 ? now() + ms : 0; ttAge++;
  for (int a = 0; a < 2; a++) for (int b = 0; b < 32; b++) for (int c = 0; c < 32; c++) hist[a][b][c] >>= 2;
  memset(killers, 0, sizeof(killers));
}
// best move: IO[0..1] = move, IO[2] = value, IO[3] = depth, IO[4] = nodes / 1000
EXPORT(best) void best(int maxDepth, int ms, int nodeK) {
  beginSearch(ms); nodeLimit_on = nodeK > 0; nodeLimit = (u64)nodeK * 1000;
  if (rootN == 0) { IO[0] = -1; IO[1] = 0; IO[2] = -WIN; IO[3] = 0; return; }
  Move bm = rootL[0]; int bv = 0, bd = 0;
  if (rootN == 1) { writeMove(IO, &bm); IO[2] = 0; IO[3] = 0; IO[4] = 0; return; }
  for (int i = 0; i < rootN; i++) rootVal[i] = -INF;
  int prev = 0;
  for (int d = 1; d <= maxDepth && d < MAXPLY - 8; d++) {
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
    progress(d, 1);
    if (v > WINT && WIN - v <= d) break;   // a forced win found
    if (v < -WINT && WIN + v <= d) break;
    if (ms > 0 && d > 1 && now() > tEnd - ms * 0.45) break;   // the next iteration would most likely not finish
  }
  writeMove(IO, &bm); IO[2] = bv; IO[3] = bd; IO[4] = (i32)(nodes / 1000);
}
// analysis: exact values of all root moves. IO[0] = n, IO[1] = depth, then (ft, cap, v) * n, best first
EXPORT(analyze) void analyze(int ms, int maxDepth) {
  beginSearch(ms); nodeLimit_on = 0;
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
  beginSearch(0); nodeLimit_on = 0;
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
static int gBase, gNeed;
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
