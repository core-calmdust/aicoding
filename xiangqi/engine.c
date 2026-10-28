// Xiangqi (Chinese chess) search engine in C, compiled to WebAssembly for the browser
// (also builds natively for the tools: -DNATIVE, see tools/native.c).
//
// Board: 9 files x 10 ranks = 90 points, sq = row * 9 + col. Row 0 is Black's back rank (top), row 9 Red's back rank
// (bottom); col 0 is the left file seen from Red. Pieces: 1 King 2 Advisor 3 Elephant 4 Horse 5 Rook 6 Cannon 7 Pawn
// (+8 = Black). Red (side 0) moves first.
// Rules: the usual WXF / Asian rules — kings and advisors stay in the palace, elephants do not cross the river and are
// blocked by a piece on the "eye", horses are blocked by a piece next to them ("hobbling the leg"), cannons capture by
// jumping exactly one screen, pawns move sideways after crossing the river, the two kings may never face each other on
// an open file ("flying general"), a move may not leave the own king in check, and a side without a legal move loses
// (checkmate and stalemate alike). In the search: a repeated position is a draw, except that a side whose every move in
// the cycle gave check (perpetual check) loses; 120 plies without a capture is a draw. Perpetual chase is judged by the
// host (engine.js) for the game itself, and moves that would lose by it are excluded at the root.
//
// Search: iterative deepening PVS alpha-beta with aspiration windows, transposition table, check extension, null move
// pruning, late move reductions, futility / reverse futility pruning, killer + history ordering, capture quiescence with
// check evasions, mate-distance values. Evaluation: a linear model (piece-square tables for the middlegame and the
// endgame, mobility, king safety, pawn chains) whose weights were tuned on the engine's own self-play games
// (tools/evalw.h, see MODEL_CARD.md). Puzzles: an exact mate solver (mate in N, optionally checks only).
//
// Build (wasm): see tools/build.sh. Host protocol: everything goes through the i32 buffer at io_ptr() (EXPORTs at the end).
#include <stdint.h>
typedef int32_t i32; typedef uint32_t u32; typedef int8_t i8; typedef uint8_t u8; typedef int16_t i16; typedef uint16_t u16; typedef uint64_t u64; typedef int64_t i64;
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
#define REPWIN (WINT - 100)       // perpetual check by the opponent: counted as a win (distance unknown)
#define INF 32000
#define MAXPLY 100
#define MAXMV 128
#define DRAW_PLIES 120
#define HIST_MAX 1200

enum { EMPTY = 0, KING = 1, ADVISOR = 2, ELEPHANT = 3, HORSE = 4, ROOK = 5, CANNON = 6, PAWN = 7 };
#define COLOR(p) ((p) >> 3)
#define TYPE(p) ((p) & 7)

static i32 IO[8192];
EXPORT(io_ptr) i32 *io_ptr(void) { return IO; }

// ---------------------------------------------------------------- geometry
static i8 RAYS[90][4][10];            // dirs: 0 up (-9), 1 down (+9), 2 left (-1), 3 right (+1); -1 terminated
static i8 NMOV[90][8], NLEG[90][8]; static u8 NNUM[90];      // horse moves from a point + the leg point
static i8 NATT[90][8], NALEG[90][8]; static u8 NANUM[90];    // horses that attack a point + their leg point
static i8 EMOV[90][4], EEYE[90][4]; static u8 ENUM_[90];
static i8 AMOV[90][4]; static u8 ANUM[90];
static i8 KMOV[90][4]; static u8 KNUM[90];
static i8 PMOV[2][90][3]; static u8 PNUM[2][90];
static u8 INPALACE[90];
static u64 ZOB[16][90], ZSIDE;
static int geoReady = 0;
static u64 rs64 = 0x9E3779B97F4A7C15ull;
static u64 rnd64(void) { rs64 ^= rs64 << 13; rs64 ^= rs64 >> 7; rs64 ^= rs64 << 17; return rs64; }
static inline int onb(int r, int c) { return r >= 0 && r < 10 && c >= 0 && c < 9; }
static inline int palace(int r, int c) { return c >= 3 && c <= 5 && (r <= 2 || r >= 7); }
static void initGeo(void) {
  if (geoReady) return;
  geoReady = 1;
  for (int s = 0; s < 90; s++) {
    int r = s / 9, c = s % 9;
    INPALACE[s] = (u8)palace(r, c);
    const int DR[4] = { -1, 1, 0, 0 }, DC[4] = { 0, 0, -1, 1 };
    for (int d = 0; d < 4; d++) { int k = 0, rr = r + DR[d], cc = c + DC[d]; while (onb(rr, cc)) { RAYS[s][d][k++] = (i8)(rr * 9 + cc); rr += DR[d]; cc += DC[d]; } RAYS[s][d][k] = -1; }
    // horse
    const int HN[8][4] = { { -2, -1, -1, 0 }, { -2, 1, -1, 0 }, { 2, -1, 1, 0 }, { 2, 1, 1, 0 }, { -1, -2, 0, -1 }, { 1, -2, 0, -1 }, { -1, 2, 0, 1 }, { 1, 2, 0, 1 } };
    int n = 0;
    for (int i = 0; i < 8; i++) { int tr = r + HN[i][0], tc = c + HN[i][1]; if (!onb(tr, tc)) continue; NMOV[s][n] = (i8)(tr * 9 + tc); NLEG[s][n] = (i8)((r + HN[i][2]) * 9 + c + HN[i][3]); n++; }
    NNUM[s] = (u8)n;
    // elephant (stays on its own half)
    n = 0;
    for (int dr = -2; dr <= 2; dr += 4) for (int dc = -2; dc <= 2; dc += 4) {
      int tr = r + dr, tc = c + dc; if (!onb(tr, tc)) continue;
      if ((r <= 4) != (tr <= 4)) continue;
      EMOV[s][n] = (i8)(tr * 9 + tc); EEYE[s][n] = (i8)((r + dr / 2) * 9 + c + dc / 2); n++;
    }
    ENUM_[s] = (u8)n;
    n = 0;
    for (int dr = -1; dr <= 1; dr += 2) for (int dc = -1; dc <= 1; dc += 2) { int tr = r + dr, tc = c + dc; if (onb(tr, tc) && palace(tr, tc) && palace(r, c) && ((r <= 2) == (tr <= 2))) AMOV[s][n++] = (i8)(tr * 9 + tc); }
    ANUM[s] = (u8)n;
    n = 0;
    for (int d = 0; d < 4; d++) { int tr = r + DR[d], tc = c + DC[d]; if (onb(tr, tc) && palace(tr, tc) && palace(r, c) && ((r <= 2) == (tr <= 2))) KMOV[s][n++] = (i8)(tr * 9 + tc); }
    KNUM[s] = (u8)n;
    for (int col = 0; col < 2; col++) {
      n = 0; int fr = col ? r + 1 : r - 1, crossed = col ? r >= 5 : r <= 4;
      if (onb(fr, c)) PMOV[col][s][n++] = (i8)(fr * 9 + c);
      if (crossed) { if (c > 0) PMOV[col][s][n++] = (i8)(s - 1); if (c < 8) PMOV[col][s][n++] = (i8)(s + 1); }
      PNUM[col][s] = (u8)n;
    }
  }
  // horses attacking a point
  for (int s = 0; s < 90; s++) NANUM[s] = 0;
  for (int h = 0; h < 90; h++) for (int i = 0; i < NNUM[h]; i++) { int t = NMOV[h][i]; NATT[t][NANUM[t]] = (i8)h; NALEG[t][NANUM[t]] = NLEG[h][i]; NANUM[t]++; }
  for (int p = 0; p < 16; p++) for (int s = 0; s < 90; s++) ZOB[p][s] = rnd64();
  ZSIDE = rnd64();
}

// ---------------------------------------------------------------- position (one global board, make / unmake)
static u8 B[90];
static int side;                      // 0 red, 1 black to move
static int KSQ[2];
static u64 KEY;
typedef u16 Move;                     // from | to << 7
#define MV(f, t) ((Move)((f) | ((t) << 7)))
#define MF(m) ((m) & 127)
#define MT(m) (((m) >> 7) & 127)
static inline u8 mkp(int col, int t) { return (u8)(t | (col << 3)); }

static u64 hashBoard(void) { u64 k = 0; for (int s = 0; s < 90; s++) if (B[s]) k ^= ZOB[B[s]][s]; if (side) k ^= ZSIDE; return k; }
static void findKings(void) { KSQ[0] = KSQ[1] = -1; for (int s = 0; s < 90; s++) if (TYPE(B[s]) == KING) KSQ[COLOR(B[s])] = s; }

// is the king of colour c attacked (including the kings facing each other)?
static int attackedKing(int c) {
  int k = KSQ[c]; if (k < 0) return 1;
  int o = c ^ 1; u8 oR = mkp(o, ROOK), oC = mkp(o, CANNON), oK = mkp(o, KING), oN = mkp(o, HORSE), oP = mkp(o, PAWN);
  for (int d = 0; d < 4; d++) {
    const i8 *ray = RAYS[k][d]; int i = 0, sq;
    while ((sq = ray[i]) >= 0 && !B[sq]) i++;
    if (sq < 0) continue;
    u8 p = B[sq];
    if (p == oR || (d < 2 && p == oK)) return 1;
    i++;
    while ((sq = ray[i]) >= 0 && !B[sq]) i++;
    if (sq >= 0 && B[sq] == oC) return 1;
  }
  for (int i = 0; i < NANUM[k]; i++) if (B[(int)NATT[k][i]] == oN && !B[(int)NALEG[k][i]]) return 1;
  int fw = c ? k + 9 : k - 9;   // the enemy pawn in front of the king (enemy pawns move towards us)
  if (fw >= 0 && fw < 90 && B[fw] == oP) return 1;
  int col = k % 9;
  if (col > 0 && B[k - 1] == oP) return 1;
  if (col < 8 && B[k + 1] == oP) return 1;
  return 0;
}
static inline u8 makeMove(Move m) {
  int f = MF(m), t = MT(m); u8 p = B[f], cap = B[t];
  KEY ^= ZOB[p][f] ^ ZOB[p][t] ^ ZSIDE; if (cap) KEY ^= ZOB[cap][t];
  B[t] = p; B[f] = 0;
  if (TYPE(p) == KING) KSQ[COLOR(p)] = t;
  if (cap && TYPE(cap) == KING) KSQ[COLOR(cap)] = -1;
  side ^= 1;
  return cap;
}
static inline void unmakeMove(Move m, u8 cap) {
  int f = MF(m), t = MT(m); u8 p = B[t];
  side ^= 1;
  B[f] = p; B[t] = cap;
  if (TYPE(p) == KING) KSQ[COLOR(p)] = f;
  if (cap && TYPE(cap) == KING) KSQ[COLOR(cap)] = t;
  KEY ^= ZOB[p][f] ^ ZOB[p][t] ^ ZSIDE; if (cap) KEY ^= ZOB[cap][t];
}

// pseudo-legal moves of the side to move; capsOnly: captures only
static int gen(Move *L, int capsOnly) {
  int n = 0, me = side;
  for (int s = 0; s < 90; s++) {
    u8 p = B[s]; if (!p || COLOR(p) != me) continue;
    switch (TYPE(p)) {
      case KING: for (int i = 0; i < KNUM[s]; i++) { int t = KMOV[s][i]; u8 q = B[t]; if (q ? COLOR(q) != me : !capsOnly) L[n++] = MV(s, t); } break;
      case ADVISOR: for (int i = 0; i < ANUM[s]; i++) { int t = AMOV[s][i]; u8 q = B[t]; if (q ? COLOR(q) != me : !capsOnly) L[n++] = MV(s, t); } break;
      case ELEPHANT: for (int i = 0; i < ENUM_[s]; i++) { int t = EMOV[s][i]; if (B[(int)EEYE[s][i]]) continue; u8 q = B[t]; if (q ? COLOR(q) != me : !capsOnly) L[n++] = MV(s, t); } break;
      case HORSE: for (int i = 0; i < NNUM[s]; i++) { int t = NMOV[s][i]; if (B[(int)NLEG[s][i]]) continue; u8 q = B[t]; if (q ? COLOR(q) != me : !capsOnly) L[n++] = MV(s, t); } break;
      case PAWN: for (int i = 0; i < PNUM[me][s]; i++) { int t = PMOV[me][s][i]; u8 q = B[t]; if (q ? COLOR(q) != me : !capsOnly) L[n++] = MV(s, t); } break;
      case ROOK:
        for (int d = 0; d < 4; d++) { const i8 *ray = RAYS[s][d]; int t; for (int i = 0; (t = ray[i]) >= 0; i++) { u8 q = B[t]; if (!q) { if (!capsOnly) L[n++] = MV(s, t); continue; } if (COLOR(q) != me) L[n++] = MV(s, t); break; } }
        break;
      case CANNON:
        for (int d = 0; d < 4; d++) {
          const i8 *ray = RAYS[s][d]; int t, i = 0;
          for (; (t = ray[i]) >= 0; i++) { if (B[t]) break; if (!capsOnly) L[n++] = MV(s, t); }
          if (t < 0) continue;
          for (i++; (t = ray[i]) >= 0; i++) { u8 q = B[t]; if (!q) continue; if (COLOR(q) != me) L[n++] = MV(s, t); break; }
        }
        break;
    }
  }
  return n;
}
// legal moves (pseudo-legal filtered by king safety)
static int genLegal(Move *L) {
  Move P[MAXMV]; int n = gen(P, 0), k = 0, me = side;
  for (int i = 0; i < n; i++) { u8 c = makeMove(P[i]); if (!attackedKing(me)) L[k++] = P[i]; unmakeMove(P[i], c); }
  return k;
}
static int hasLegal(void) {
  Move P[MAXMV]; int n = gen(P, 0), me = side;
  for (int i = 0; i < n; i++) { u8 c = makeMove(P[i]); int ok = !attackedKing(me); unmakeMove(P[i], c); if (ok) return 1; }
  return 0;
}

// ---------------------------------------------------------------- evaluation (linear model, weights in tools/evalw.h)
// features: piece-square tables (7 types x 50 folded points, middlegame and endgame), mobility, king safety, pawns.
// Point folding: relative row (0 = own back rank .. 9 = enemy back rank) x folded column min(c, 8 - c).
#define NF_PST (7 * 50)
enum { F_MOB_R = 0, F_MOB_N, F_MOB_C, F_HOLLOW, F_SCREEN, F_NOADV_R, F_NOADV_N, F_NOADV_C, F_NOELE_C, F_NOELE_R, F_PAWNPAIR, F_FULLDEF, F_NCROSS, F_KINGOUT, F_ROOKS0, F_NEX };
#define NF_EXTRA F_NEX
#define NF (NF_PST + NF_EXTRA)          // per phase
#define NW (2 * NF + 1)                 // + tempo
static i32 W_[NW];
#include "tools/evalw.h"
static int evalLoaded = 0;
static void initEval(void) { if (evalLoaded) return; evalLoaded = 1; for (int i = 0; i < NW; i++) W_[i] = EVALW[i]; }
static inline int relRow(int col, int s) { int r = s / 9; return col ? r : 9 - r; }
static inline int fold(int col, int s) { int c = s % 9; if (c > 4) c = 8 - c; return relRow(col, s) * 5 + c; }
// features of the position (red's view, black subtracts): fi / fv arrays (index into one phase's block, value);
// the phase (0..16) splits each feature into a middlegame and an endgame part.
static int phaseOf(void) {
  int ph = 0; for (int s = 0; s < 90; s++) { int t = TYPE(B[s]); if (t == ROOK) ph += 2; else if (t == HORSE || t == CANNON) ph += 1; }
  return ph > 16 ? 16 : ph;
}
static int featFlag = 0; static int FI[256], FV[256], FN;
#define ADDF(idx, val) do { int _i = (idx), _v = (val); if (featFlag) { FI[FN] = _i; FV[FN] = _v; FN++; } mg += W_[_i] * _v; eg += W_[NF + _i] * _v; } while (0)
static int cnt[2][8];
static int evaluateRed(int *phOut) {
  int mg = 0, eg = 0; FN = 0;
  for (int c = 0; c < 2; c++) for (int t = 0; t < 8; t++) cnt[c][t] = 0;
  for (int s = 0; s < 90; s++) if (B[s]) cnt[COLOR(B[s])][TYPE(B[s])]++;
  int ph = 0; for (int c = 0; c < 2; c++) ph += 2 * cnt[c][ROOK] + cnt[c][HORSE] + cnt[c][CANNON];
  if (ph > 16) ph = 16;
  if (phOut) *phOut = ph;
  int mob[2][3] = { { 0 } }, pawnPair[2] = { 0, 0 }, crossed[2] = { 0, 0 };
  for (int s = 0; s < 90; s++) {
    u8 p = B[s]; if (!p) continue;
    int col = COLOR(p), t = TYPE(p), sg = col ? -1 : 1;
    ADDF((t - 1) * 50 + fold(col, s), sg);
    if (t == ROOK) { int m = 0; for (int d = 0; d < 4; d++) { const i8 *ray = RAYS[s][d]; int q; for (int i = 0; (q = ray[i]) >= 0; i++) { m++; if (B[q]) break; } } mob[col][0] += m; }
    else if (t == HORSE) { int m = 0; for (int i = 0; i < NNUM[s]; i++) { if (B[(int)NLEG[s][i]]) continue; u8 q = B[(int)NMOV[s][i]]; if (!q || COLOR(q) != col) m++; } mob[col][1] += m; }
    else if (t == CANNON) { int m = 0; for (int d = 0; d < 4; d++) { const i8 *ray = RAYS[s][d]; int q, i = 0; for (; (q = ray[i]) >= 0; i++) { if (B[q]) break; m++; } } mob[col][2] += m; }
    else if (t == PAWN) {
      int rr = relRow(col, s);
      if (rr >= 5) { crossed[col]++; int c9 = s % 9; if (c9 < 8 && B[s + 1] == p) pawnPair[col]++; }
    }
  }
  for (int col = 0; col < 2; col++) {
    int sg = col ? -1 : 1, o = col ^ 1;
    ADDF(NF_PST + F_MOB_R, sg * mob[col][0]);
    ADDF(NF_PST + F_MOB_N, sg * mob[col][1]);
    ADDF(NF_PST + F_MOB_C, sg * mob[col][2]);
    ADDF(NF_PST + F_PAWNPAIR, sg * pawnPair[col]);
    ADDF(NF_PST + F_NCROSS, sg * crossed[col] * (cnt[o][ADVISOR] < 2 ? 2 - cnt[o][ADVISOR] : 0));
    // king safety of colour o (col is the attacker): missing defenders x attackers
    int noA = 2 - cnt[o][ADVISOR], noE = 2 - cnt[o][ELEPHANT];
    if (noA < 0) noA = 0; if (noE < 0) noE = 0;
    ADDF(NF_PST + F_NOADV_R, sg * noA * cnt[col][ROOK]);
    ADDF(NF_PST + F_NOADV_N, sg * noA * cnt[col][HORSE]);
    ADDF(NF_PST + F_NOADV_C, sg * noA * cnt[col][CANNON]);
    ADDF(NF_PST + F_NOELE_C, sg * noE * cnt[col][CANNON]);
    ADDF(NF_PST + F_NOELE_R, sg * noE * cnt[col][ROOK]);
    if (cnt[col][ADVISOR] == 2 && cnt[col][ELEPHANT] == 2) ADDF(NF_PST + F_FULLDEF, sg);
    if (cnt[col][ROOK] == 0) ADDF(NF_PST + F_ROOKS0, sg);
    // cannons on the enemy king's file: hollow (nothing between) / one screen
    int k = KSQ[o];
    if (k >= 0) {
      int kc = k % 9, kr = k / 9;
      for (int r = 0; r < 10; r++) {
        int s = r * 9 + kc; if (B[s] != mkp(col, CANNON)) continue;
        int lo = r < kr ? r : kr, hi = r < kr ? kr : r, between = 0;
        for (int x = lo + 1; x < hi; x++) if (B[x * 9 + kc]) between++;
        if (between == 0) ADDF(NF_PST + F_HOLLOW, sg);
        else if (between == 1) ADDF(NF_PST + F_SCREEN, sg);
      }
      if (relRow(o, k) > 0) ADDF(NF_PST + F_KINGOUT, -sg * relRow(o, k));
    }
  }
  return (mg * ph + eg * (16 - ph)) / 16;
}
static int evaluate(void) {
  int v = evaluateRed(0) / 8;   // weights are in 1/8 points
  v = side ? -v : v;
  return v + W_[NW - 1] / 8;    // tempo
}
// draw by material: nobody has a rook, horse, cannon or pawn
static int noAttackers(void) { for (int s = 0; s < 90; s++) { int t = TYPE(B[s]); if (t >= HORSE) return 0; } return 1; }

// ---------------------------------------------------------------- transposition table
#define TT_BITS 20
typedef struct { u64 key; i16 v; u16 m; i8 d; u8 flag, age, pad; } TTE;
static TTE TT[1 << TT_BITS];
static u8 ttAge = 0;
#define TT_EXACT 3
#define TT_LOWER 1
#define TT_UPPER 2
static inline int vToTT(int v, int ply) { return v > WINT ? v + ply : v < -WINT ? v - ply : v; }
static inline int vFromTT(int v, int ply) { return v > WINT ? v - ply : v < -WINT ? v + ply : v; }
static void ttStore(u64 key, int d, int flag, int v, Move m, int ply) {
  TTE *e = &TT[key & ((1 << TT_BITS) - 1)];
  if (e->key != key && e->age == ttAge && e->d > d + 2) return;
  if (!(e->key == key && !m)) e->m = m;
  e->key = key; e->d = (i8)(d > 120 ? 120 : d < -1 ? -1 : d); e->flag = (u8)flag; e->v = (i16)vToTT(v, ply); e->age = ttAge;
}
EXPORT(new_game) void new_game(void) { memset(TT, 0, sizeof(TT)); ttAge = 0; }

// ---------------------------------------------------------------- search
static u64 nodes; static double tEnd; static int stopFlag, nodeLimitOn; static u64 nodeLimit;
static i32 hist[2][90][90];
static Move killers[MAXPLY][2];
static u64 HK[HIST_MAX + MAXPLY];     // hash of every position (game + search path)
static u8 HC[HIST_MAX + MAXPLY];      // side to move was in check there
static int hn, hirr;                  // stack size, index of the first position after the last capture
static int seldepth;
static const int PV_[8] = { 0, 0, 120, 120, 450, 900, 450, 100 };   // ordering values (MVV-LVA)
static inline int timeUp(void) {
  if (stopFlag) return 1;
  if ((nodes & 1023) == 0) { if ((tEnd > 0 && now() > tEnd) || (nodeLimitOn && nodes > nodeLimit)) stopFlag = 1; }
  return stopFlag;
}
// repetition of the current position (HK[hn-1]): 0 none, 1 draw, 2 the side to move wins (opponent checked perpetually), 3 it loses
static int repState(void) {
  int cur = hn - 1; u64 k = HK[cur];
  for (int i = cur - 4; i >= hirr; i -= 2) {
    if (HK[i] != k) continue;
    int oppAll = 1, meAll = 1;
    for (int j = i + 1; j <= cur; j++) { if (((cur - j) & 1) == 0) { if (!HC[j]) oppAll = 0; } else { if (!HC[j]) meAll = 0; } }
    if (oppAll && !meAll) return 2;
    if (meAll && !oppAll) return 3;
    return 1;
  }
  return 0;
}
static int bigPieces(int c) { for (int s = 0; s < 90; s++) { u8 p = B[s]; if (p && COLOR(p) == c) { int t = TYPE(p); if (t == ROOK || t == HORSE || t == CANNON) return 1; } } return 0; }
static inline int moveScore(Move m, Move ttm, int ply) {
  if (m == ttm) return 1 << 30;
  u8 v = B[MT(m)];
  if (v) return (1 << 28) + PV_[TYPE(v)] * 16 - PV_[TYPE(B[MF(m)])] / 8;
  if (m == killers[ply][0]) return 1 << 27;
  if (m == killers[ply][1]) return (1 << 27) - 1;
  return hist[side][MF(m)][MT(m)];
}
static int qsearch(int alpha, int beta, int ply, int qd) {
  nodes++;
  if (timeUp()) return 0;
  int me = side, inChk = attackedKing(me);
  if (ply >= MAXPLY - 2) return evaluate();
  int best = -INF;
  if (!inChk) {
    int e = evaluate();
    if (e >= beta) return e;
    if (e > alpha) alpha = e;
    best = e;
  }
  Move L[MAXMV]; int n = gen(L, !inChk);
  int sc[MAXMV]; for (int i = 0; i < n; i++) sc[i] = moveScore(L[i], 0, ply);
  int legal = 0;
  for (int i = 0; i < n; i++) {
    int bi = i; for (int j = i + 1; j < n; j++) if (sc[j] > sc[bi]) bi = j;
    { Move tm = L[bi]; L[bi] = L[i]; L[i] = tm; int ts = sc[bi]; sc[bi] = sc[i]; sc[i] = ts; }
    Move m = L[i];
    if (!inChk && qd > 6 && TYPE(B[MT(m)]) == PAWN) continue;
    u8 c = makeMove(m);
    if (attackedKing(me)) { unmakeMove(m, c); continue; }
    legal++;
    int v = -qsearch(-beta, -alpha, ply + 1, qd + 1);
    unmakeMove(m, c);
    if (stopFlag) return best > -INF ? best : 0;
    if (v > best) { best = v; if (v > alpha) { alpha = v; if (v >= beta) break; } }
  }
  if (inChk && !legal) return -(WIN - ply);
  return best;
}
static int search(int depth, int alpha, int beta, int ply, int pv, int nullOk) {
  if (ply > 0) {
    int r = repState();
    if (r == 1) return 0;
    if (r == 2) return REPWIN;
    if (r == 3) return -REPWIN;
    if (hn - 1 - hirr >= DRAW_PLIES) return 0;
    int ma = -(WIN - ply), mb = WIN - ply - 1;
    if (ma > alpha) { alpha = ma; if (alpha >= beta) return alpha; }
    if (mb < beta) { beta = mb; if (alpha >= beta) return beta; }
  }
  if (ply > 0 && timeUp()) return 0;
  int me = side, inChk = HC[hn - 1];
  if (inChk && ply < MAXPLY - 10) depth++;
  if (depth <= 0) return qsearch(alpha, beta, ply, 0);
  if (ply >= MAXPLY - 4) return evaluate();
  nodes++;
  if (ply > seldepth) seldepth = ply;
  TTE *e = &TT[KEY & ((1 << TT_BITS) - 1)];
  Move ttm = 0;
  if (e->key == KEY) {
    ttm = e->m;
    if (!pv && e->d >= depth && ply > 0) {
      int v = vFromTT(e->v, ply);
      if (e->flag == TT_EXACT || (e->flag == TT_LOWER && v >= beta) || (e->flag == TT_UPPER && v <= alpha)) return v;
    }
  }
  int stat = -INF;
  if (!inChk && !pv) {
    stat = evaluate();
    // reverse futility
    if (depth <= 3 && stat - 110 * depth >= beta && beta > -WINT && beta < WINT) return stat;
    // null move
    if (nullOk && depth >= 3 && stat >= beta && bigPieces(me) && beta > -WINT && beta < WINT) {
      int R = 2 + (depth >= 7);
      side ^= 1; KEY ^= ZSIDE; HK[hn] = KEY; HC[hn] = 0; hn++;
      int saveIrr = hirr; hirr = hn - 1;   // the null move cuts repetition chains
      int v = -search(depth - 1 - R, -beta, -beta + 1, ply + 1, 0, 0);
      hn--; hirr = saveIrr; side ^= 1; KEY ^= ZSIDE;
      if (stopFlag) return 0;
      if (v >= beta) return v >= WINT ? beta : v;
    }
  }
  Move L[MAXMV]; int n = gen(L, 0);
  int sc[MAXMV]; for (int i = 0; i < n; i++) sc[i] = moveScore(L[i], ttm, ply);
  int best = -INF, oldAlpha = alpha, legal = 0; Move bestM = 0;
  int futile = !inChk && !pv && depth <= 2 && stat > -INF && stat + 150 * depth <= alpha && alpha > -WINT;
  for (int i = 0; i < n; i++) {
    int bi = i; for (int j = i + 1; j < n; j++) if (sc[j] > sc[bi]) bi = j;
    { Move tm = L[bi]; L[bi] = L[i]; L[i] = tm; int ts = sc[bi]; sc[bi] = sc[i]; sc[i] = ts; }
    Move m = L[i]; int isCap = B[MT(m)] != 0;
    u8 c = makeMove(m);
    if (attackedKing(me)) { unmakeMove(m, c); continue; }
    legal++;
    int givesChk = attackedKing(side);
    if (futile && legal > 1 && !isCap && !givesChk) { unmakeMove(m, c); continue; }
    HK[hn] = KEY; HC[hn] = (u8)givesChk; hn++;
    int saveIrr = hirr; if (c) hirr = hn - 1;
    int v, d1 = depth - 1;
    if (legal == 1) v = -search(d1, -beta, -alpha, ply + 1, pv, 1);
    else {
      int red = 0;
      if (depth >= 3 && legal > 3 && !isCap && !inChk && !givesChk && m != killers[ply][0] && m != killers[ply][1]) {
        red = 1 + (legal > 10) + (depth >= 8 && legal > 20);
        if (pv && red) red--;
        if (red > d1 - 1) red = d1 - 1 > 0 ? d1 - 1 : 0;
      }
      v = -search(d1 - red, -alpha - 1, -alpha, ply + 1, 0, 1);
      if (v > alpha && red) v = -search(d1, -alpha - 1, -alpha, ply + 1, 0, 1);
      if (v > alpha && v < beta) v = -search(d1, -beta, -alpha, ply + 1, pv, 1);
    }
    hn--; hirr = saveIrr;
    unmakeMove(m, c);
    if (stopFlag) return best > -INF ? best : 0;
    if (v > best) {
      best = v; bestM = m;
      if (v > alpha) {
        alpha = v;
        if (v >= beta) {
          if (!isCap) {
            if (killers[ply][0] != m) { killers[ply][1] = killers[ply][0]; killers[ply][0] = m; }
            i32 *h = &hist[me][MF(m)][MT(m)]; *h += depth * depth;
            if (*h > (1 << 24)) for (int a = 0; a < 2; a++) for (int b = 0; b < 90; b++) for (int q = 0; q < 90; q++) hist[a][b][q] >>= 1;
          }
          break;
        }
      }
    }
  }
  if (!legal) return -(WIN - ply);   // checkmate or stalemate: the side to move loses
  ttStore(KEY, depth, best >= beta ? TT_LOWER : best > oldAlpha ? TT_EXACT : TT_UPPER, best, bestM, ply);
  return best;
}

// ---------------------------------------------------------------- root / host interface
static u8 RB[90]; static int rootSide; static u64 rootKey;
static Move rootL[MAXMV]; static int rootN; static int rootVal[MAXMV];
static int rootHn, rootHirr;
static void loadRoot(void) { memcpy(B, RB, 90); side = rootSide; findKings(); KEY = rootKey; hn = rootHn; hirr = rootHirr; }
// setup: IO = [90 point codes, side, nmoves, moves..., nexcl, excluded root moves...]. Returns 1 if all moves were legal.
EXPORT(setup) int setup(void) {
  initGeo(); initEval();
  for (int s = 0; s < 90; s++) { int v = IO[s]; B[s] = (u8)(v >= 0 && v < 16 && (v & 7) ? v : 0); }
  side = IO[90] ? 1 : 0; findKings();
  if (KSQ[0] < 0 || KSQ[1] < 0) return 0;
  int nm = IO[91]; if (nm < 0) nm = 0; if (nm > HIST_MAX - 2) nm = HIST_MAX - 2;
  KEY = hashBoard(); hn = 0; hirr = 0;
  HK[hn] = KEY; HC[hn] = (u8)attackedKing(side); hn++;
  for (int i = 0; i < nm; i++) {
    Move m = (Move)IO[92 + i], L[MAXMV]; int n = genLegal(L), ok = 0;
    for (int j = 0; j < n; j++) if (L[j] == m) ok = 1;
    if (!ok) return 0;
    u8 c = makeMove(m);
    HK[hn] = KEY; HC[hn] = (u8)attackedKing(side); hn++;
    if (c) hirr = hn - 1;
  }
  memcpy(RB, B, 90); rootSide = side; rootKey = KEY; rootHn = hn; rootHirr = hirr;
  Move L[MAXMV]; int n = genLegal(L);
  int nx = IO[92 + nm]; if (nx < 0 || nx > 64) nx = 0;
  rootN = 0;
  for (int i = 0; i < n; i++) { int ex = 0; for (int j = 0; j < nx; j++) if (IO[93 + nm + j] == L[i]) ex = 1; if (!ex) rootL[rootN++] = L[i]; }
  if (!rootN) for (int i = 0; i < n; i++) rootL[rootN++] = L[i];   // every move excluded: play anyway
  return 1;
}
static int rootSearch(int depth, int all, int alpha0, int beta0) {
  int alpha = alpha0, best = -INF;
  for (int i = 0; i < rootN; i++) {
    Move m = rootL[i]; u8 c = makeMove(m);
    HK[hn] = KEY; HC[hn] = (u8)attackedKing(side); hn++;
    int saveIrr = hirr; if (c) hirr = hn - 1;
    int v;
    if (all) v = -search(depth - 1, -INF, INF, 1, 1, 1);
    else if (i == 0) v = -search(depth - 1, -beta0, -alpha, 1, 1, 1);
    else { v = -search(depth - 1, -alpha - 1, -alpha, 1, 0, 1); if (v > alpha && v < beta0 && !stopFlag) v = -search(depth - 1, -beta0, -alpha, 1, 1, 1); }
    hn--; hirr = saveIrr; unmakeMove(m, c);
    if (stopFlag) return best;
    rootVal[i] = v;
    if (v > best) { best = v; if (v > alpha) alpha = v; }
    if (!all && v >= beta0) return v;
  }
  return best;
}
static void sortRoot(void) {
  for (int i = 1; i < rootN; i++) { Move m = rootL[i]; int v = rootVal[i], j = i - 1; while (j >= 0 && rootVal[j] < v) { rootL[j + 1] = rootL[j]; rootVal[j + 1] = rootVal[j]; j--; } rootL[j + 1] = m; rootVal[j + 1] = v; }
}
static void beginSearch(int ms) {
  loadRoot();
  stopFlag = 0; nodes = 0; tEnd = ms > 0 ? now() + ms : 0; ttAge++;
  for (int a = 0; a < 2; a++) for (int b = 0; b < 90; b++) for (int c = 0; c < 90; c++) hist[a][b][c] >>= 2;
  memset(killers, 0, sizeof(killers));
}
// best move: IO[0] = move, IO[1] = value, IO[2] = depth, IO[3] = nodes / 1000
EXPORT(best) void best(int maxDepth, int ms, int nodeK) {
  beginSearch(ms); nodeLimitOn = nodeK > 0; nodeLimit = (u64)nodeK * 1000;
  if (rootN == 0) { IO[0] = -1; IO[1] = -WIN; IO[2] = 0; IO[3] = 0; return; }
  Move bm = rootL[0]; int bv = 0, bd = 0;
  if (rootN == 1) { IO[0] = bm; IO[1] = 0; IO[2] = 0; IO[3] = 0; return; }
  // order: captures first by a quick static look
  for (int i = 0; i < rootN; i++) rootVal[i] = B[MT(rootL[i])] ? PV_[TYPE(B[MT(rootL[i])])] : 0;
  sortRoot();
  int prev = 0;
  for (int d = 1; d <= maxDepth && d < MAXPLY - 10; d++) {
    seldepth = 0;
    int a = d >= 4 ? prev - 35 : -INF, b = d >= 4 ? prev + 35 : INF, v;
    for (;;) {
      v = rootSearch(d, 0, a, b);
      if (stopFlag) break;
      if (v <= a) { a -= 150; if (a < -1500) a = -INF; continue; }
      if (v >= b) { b += 150; if (b > 1500) b = INF; continue; }
      break;
    }
    if (stopFlag && d > 1) {
      // a move that already beat the previous best at this depth is kept
      int bi = 0; for (int i = 1; i < rootN; i++) if (rootVal[i] > rootVal[bi]) bi = i;
      if (bi && rootVal[0] > -INF && rootVal[bi] > rootVal[0]) { bm = rootL[bi]; bv = rootVal[bi]; }
      break;
    }
    int bi = 0; for (int i = 1; i < rootN; i++) if (rootVal[i] > rootVal[bi]) bi = i;
    if (bi) { Move t = rootL[bi]; int tv = rootVal[bi]; for (int i = bi; i > 0; i--) { rootL[i] = rootL[i - 1]; rootVal[i] = rootVal[i - 1]; } rootL[0] = t; rootVal[0] = tv; }
    for (int i = 1; i < rootN; i++) rootVal[i] = -INF;
    bm = rootL[0]; bv = v; bd = d; prev = v;
    progress(d, 1);
    if (v > WINT && WIN - v <= d) break;
    if (v < -WINT && WIN + v <= d) break;
    if (ms > 0 && d > 1 && now() > tEnd - ms * 0.5) break;
  }
  loadRoot();
  IO[0] = bm; IO[1] = bv; IO[2] = bd; IO[3] = (i32)(nodes / 1000);
}
static void writeList(int depth, const Move *ord, const int *vals, int n) {
  IO[0] = n; IO[1] = depth; for (int i = 0; i < n; i++) { IO[2 + 2 * i] = ord[i]; IO[3 + 2 * i] = vals[i]; }
}
// analysis: values of all root moves. IO[0] = n, IO[1] = depth, then (move, value) * n, best first
EXPORT(analyze) void analyze(int ms, int maxDepth) {
  beginSearch(ms); nodeLimitOn = 0;
  int depthDone = 0; int vals[MAXMV]; Move ord[MAXMV];
  for (int i = 0; i < rootN; i++) { ord[i] = rootL[i]; vals[i] = 0; }
  for (int d = 1; d <= maxDepth && d < MAXPLY - 10 && rootN; d++) {
    rootSearch(d, 1, -INF, INF);
    if (stopFlag && d > 1) break;
    sortRoot();
    for (int i = 0; i < rootN; i++) { ord[i] = rootL[i]; vals[i] = rootVal[i]; }
    depthDone = d;
    loadRoot();
    writeList(depthDone, ord, vals, rootN);
    progress(d, rootN);
    int solved = 1; for (int i = 0; i < rootN; i++) if (vals[i] < WINT && vals[i] > -WINT) solved = 0;
    if (solved && d > 2) break;
    if (rootN == 1 && d >= 6) break;
    if (stopFlag) break;
    if (d > 1 && now() > tEnd - ms * 0.55) break;
  }
  loadRoot();
  writeList(depthDone, ord, vals, rootN);
}
// principal variation from the transposition table after a search (review box): IO[0] = n, IO[1..n] = moves, starting
// with m0 (a root move); stops at a missing / illegal entry or a repeated position
EXPORT(pv_line) int pv_line(int m0, int maxLen) {
  loadRoot();
  int n = 0; Move m = (Move)m0;
  if (maxLen > 60) maxLen = 60;
  while (n < maxLen) {
    Move L[MAXMV]; int nl = genLegal(L), ok = 0;
    for (int j = 0; j < nl; j++) if (L[j] == m) ok = 1;
    if (!ok) break;
    u8 c = makeMove(m); (void)c;
    HK[hn] = KEY; HC[hn] = (u8)attackedKing(side); hn++;
    IO[1 + n++] = m;
    int rep = 0; for (int i = hn - 3; i >= 0; i--) if (HK[i] == KEY) { rep = 1; break; }
    if (rep) break;
    TTE *e = &TT[KEY & ((1 << TT_BITS) - 1)];
    if (e->key != KEY || !e->m) break;
    m = e->m;
  }
  loadRoot();
  IO[0] = n;
  return n;
}
// fixed-depth values of all root moves (weak levels)
EXPORT(values) void values(int depth) {
  beginSearch(0); nodeLimitOn = 0;
  for (int d = 1; d <= depth; d++) { rootSearch(d, 1, -INF, INF); sortRoot(); }
  loadRoot();
  writeList(depth, rootL, rootVal, rootN);
}

// ---------------------------------------------------------------- puzzles: exact mate solver
// mate within k own moves for the side to move (a side without a legal move loses). checksOnly: every attacking move gives check.
#define MT_BITS 18
typedef struct { u64 key; i8 yes, no; } MTE;   // proven: mate in <= yes; disproven: no mate in <= no
static MTE MTT[1 << MT_BITS];
static u64 mBudget; static int mBudgetOut, mChecks;
static int mateDef(int k);
static int mateAtt(int k) {     // attacker to move: 1 = mates within k, 0 = not, -1 = budget exhausted
  if (k <= 0) return 0;
  u64 key = KEY ^ (mChecks ? 0x5555555555555555ull : 0); MTE *e = &MTT[key & ((1 << MT_BITS) - 1)];
  if (e->key == key) { if (e->yes && e->yes <= k) return 1; if (e->no >= k) return 0; }
  Move L[MAXMV]; int n = gen(L, 0), me = side, unk = 0;
  // checks first, then captures, then the rest
  Move O[MAXMV]; int sc[MAXMV], m2 = 0;
  for (int i = 0; i < n; i++) {
    u8 c = makeMove(L[i]);
    if (attackedKing(me)) { unmakeMove(L[i], c); continue; }
    int chk = attackedKing(side); unmakeMove(L[i], c);
    if (mChecks && !chk) continue;
    O[m2] = L[i]; sc[m2] = chk * 2 + (c != 0); m2++;
  }
  for (int pass = 3; pass >= 0; pass--) for (int i = 0; i < m2; i++) {
    if (sc[i] != pass) continue;
    if (!mBudget) { mBudgetOut = 1; return -1; } mBudget--;
    u8 c = makeMove(O[i]);
    int r = mateDef(k - 1);
    unmakeMove(O[i], c);
    if (r == 1) { if (e->key != key) { e->key = key; e->no = 0; e->yes = 0; } if (!e->yes || e->yes > k) e->yes = (i8)k; return 1; }
    if (r < 0) unk = 1;
  }
  if (unk) return -1;
  if (e->key != key) { e->key = key; e->yes = 0; e->no = 0; }
  if (e->no < k) e->no = (i8)k;
  return 0;
}
static int mateDef(int k) {     // defender to move after an attacking move; attacker has k moves left
  Move L[MAXMV]; int n = gen(L, 0), me = side, legal = 0;
  // replies that capture or move the king first (most likely to escape)
  int order[MAXMV]; int m2 = 0;
  for (int i = 0; i < n; i++) if (B[MT(L[i])] || TYPE(B[MF(L[i])]) == KING) order[m2++] = i;
  for (int i = 0; i < n; i++) if (!(B[MT(L[i])] || TYPE(B[MF(L[i])]) == KING)) order[m2++] = i;
  for (int j = 0; j < m2; j++) {
    Move m = L[order[j]];
    u8 c = makeMove(m);
    if (attackedKing(me)) { unmakeMove(m, c); continue; }
    legal++;
    if (k <= 0) { unmakeMove(m, c); return 0; }
    if (!mBudget) { unmakeMove(m, c); mBudgetOut = 1; return -1; } mBudget--;
    int r = mateAtt(k);
    unmakeMove(m, c);
    if (r != 1) return r;
  }
  return 1;   // no legal reply left without being mated (no legal move at all = mated / stalemated)
}
// IO out: [n, (move, need) * n]. Attacker to move (defend = 0): need = own moves to mate counting this move (0 = not within n).
// Defender to move (defend = 1): need = attacker moves still needed after each reply (0 = escaped). need = -1: budget ran out.
EXPORT(puzzle) void puzzle(int n, int defend, int checksOnly, int budgetK) {
  loadRoot();
  mChecks = checksOnly;
  IO[0] = rootN;
  for (int i = 0; i < rootN; i++) {
    Move m = rootL[i]; int need = 0;
    mBudget = (u64)budgetK * 1000; mBudgetOut = 0;
    u8 c = makeMove(m);
    if (!defend && checksOnly && !attackedKing(side)) need = 0;
    else for (int k = defend ? 1 : 0; k <= n - (defend ? 0 : 1); k++) {
      int r = defend ? mateAtt(k) : mateDef(k);
      if (r == 1) { need = defend ? k : k + 1; break; }
      if (r < 0) { need = -1; break; }
    }
    unmakeMove(m, c);
    IO[1 + 2 * i] = m; IO[2 + 2 * i] = need;
  }
}
EXPORT(mate_clear) void mate_clear(void) { memset(MTT, 0, sizeof(MTT)); }
EXPORT(eval_root) int eval_root(void) { loadRoot(); return evaluate(); }
EXPORT(in_check_root) int in_check_root(void) { loadRoot(); return attackedKing(side); }
