// Hnefatafl (Viking chess) search engine in C, compiled to WebAssembly for the browser
// (also builds natively for the tools: -DNATIVE).
//
// Rule sets (variant 0 = Copenhagen 11x11, 1 = Brandubh 7x7, 2 = Tablut 9x9). Attackers (side 0) move first.
//   Every piece moves like a rook (any number of empty squares along a row or column). Only the king may stop on the
//   throne (centre) and, with corner escape, on the four corners; any piece may pass over the empty throne.
//   A man is captured when the enemy moves so that it stands between two enemy pieces on a row or column (or between an
//   enemy and a hostile square: a corner, or the empty throne; the throne is always hostile to attackers). Moving in
//   between two enemies is safe. The king is armed (it may take part in captures).
//   Copenhagen: the king is captured by attackers on all four sides (or three sides and the throne); never on the edge.
//     Shieldwall: a row of two or more pieces on the edge is captured together when it is bracketed at both ends (a corner
//     may be one end) and every member has an enemy in front of it (a king in the row is not captured).
//     Edge fort: the king on the edge, able to move, in a fort the attackers can never break → the defenders win.
//     Encirclement: when the attackers surround every defender (no defender can reach the edge) the attackers win.
//   Brandubh / Tablut: the king is captured like a man (two sides) away from the throne; on the throne four attackers,
//     next to it three attackers and the throne are needed.
//   Escape: corners (Copenhagen, Brandubh), any edge square (Tablut).
//   A side without a legal move loses. Repetition: the third occurrence of a position is a loss for the defenders.
//   Draw: 200 plies without a capture (host + search).
//
// Search: iterative deepening negamax alpha-beta (PVS) with aspiration windows, a transposition table, killer / history
// move ordering, late move reductions, a tactical horizon (king escape lines and king captures are resolved exactly),
// repetition handling, mate-distance values, and a hand-written evaluation tuned by self-play (see MODEL_CARD.md).
// Build (wasm): see tools/build.sh. Host protocol: everything goes through the shared i32 buffer at io_ptr().
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
#define MAXPLY 96
#define MAXMV 320
#define DRAW_PLIES 200
#define REPV 40            // a repeated position inside the search: slightly better for the attackers (the third occurrence is a loss for the defenders, but it needs their help)

static i32 IO[8192];
EXPORT(io_ptr) i32 *io_ptr(void) { return IO; }

// ---------------------------------------------------------------- geometry (13 x 13 mailbox with an off-board border)
#define W 13
#define NSQ (W * W)
enum { EMP = 0, ATT = 1, DEF = 2, KNG = 3, OFF = 4 };
#define F_ON 1
#define F_EDGE 2
#define F_CORNER 4
#define F_THRONE 8
#define F_ESC 16
#define F_RESTR 32
static const int DIRS[4] = { -W, 1, W, -1 };
typedef struct { int n, escEdge, kingCap4, shield, fort, encircle; } Rules;
static Rules R; static int VAR = -1, N = 11, THRONE;
static u8 FL[NSQ];
static u64 ZP[4][NSQ], ZSIDE;
static int CORNERS[4];
static inline int SQ(int r, int c) { return (r + 1) * W + c + 1; }
static inline int RR(int s) { return s / W - 1; }
static inline int CC(int s) { return s % W - 1; }
static u64 rs64 = 0x9E3779B97F4A7C15ull;
static u64 rnd64(void) { rs64 ^= rs64 << 13; rs64 ^= rs64 >> 7; rs64 ^= rs64 << 17; return rs64; }
static int zReady = 0;
static void setVariant(int v) {
  if (!zReady) { for (int k = 0; k < 4; k++) for (int i = 0; i < NSQ; i++) ZP[k][i] = rnd64(); ZSIDE = rnd64(); zReady = 1; }
  if (v == VAR) return;
  VAR = v;
  if (v == 1) { Rules r = { 7, 0, 0, 0, 0, 0 }; R = r; }
  else if (v == 2) { Rules r = { 9, 1, 0, 0, 0, 0 }; R = r; }
  else { Rules r = { 11, 0, 1, 1, 1, 1 }; R = r; VAR = 0; }
  N = R.n;
  for (int i = 0; i < NSQ; i++) FL[i] = 0;
  for (int r = 0; r < N; r++) for (int c = 0; c < N; c++) {
    int s = SQ(r, c); u8 f = F_ON;
    if (r == 0 || c == 0 || r == N - 1 || c == N - 1) f |= F_EDGE;
    if ((r == 0 || r == N - 1) && (c == 0 || c == N - 1) && !R.escEdge) f |= F_CORNER | F_ESC | F_RESTR;
    if (R.escEdge && (f & F_EDGE)) f |= F_ESC;
    if (r == N / 2 && c == N / 2) f |= F_THRONE | F_RESTR;
    FL[s] = f;
  }
  THRONE = SQ(N / 2, N / 2);
  CORNERS[0] = SQ(0, 0); CORNERS[1] = SQ(0, N - 1); CORNERS[2] = SQ(N - 1, 0); CORNERS[3] = SQ(N - 1, N - 1);
}

// ---------------------------------------------------------------- position / moves
typedef struct { u8 b[NSQ]; u8 side, king, na, nd; u8 res, ncap; u64 h; } Pos;   // res: 0, 1 attackers won, 2 defenders won (by the last move)
typedef struct { u8 f, t; } Move;
static inline int own(int side, int x) { return side ? (x == DEF || x == KNG) : x == ATT; }
static u64 hashOf(const Pos *p) {
  u64 h = 0;
  for (int i = 0; i < NSQ; i++) { int x = p->b[i]; if (x >= ATT && x <= KNG) h ^= ZP[x][i]; }
  if (p->side) h ^= ZSIDE;
  return h;
}
static void posInit(Pos *p) { for (int i = 0; i < NSQ; i++) p->b[i] = FL[i] ? EMP : OFF; p->side = 0; p->king = 0; p->na = p->nd = 0; p->res = 0; p->ncap = 0; p->h = 0; }
static void posCount(Pos *p) {
  p->na = p->nd = 0; p->king = 0;
  for (int i = 0; i < NSQ; i++) { int x = p->b[i]; if (x == ATT) p->na++; else if (x == DEF) p->nd++; else if (x == KNG) p->king = (u8)i; }
  p->h = hashOf(p); p->res = 0;
}
static int gen(const Pos *p, Move *L) {
  int n = 0, side = p->side;
  for (int s = 0; s < NSQ; s++) {
    int x = p->b[s]; if (!own(side, x)) continue;
    int king = x == KNG;
    for (int d = 0; d < 4; d++) {
      int dd = DIRS[d];
      for (int t = s + dd; p->b[t] == EMP; t += dd) {
        if ((FL[t] & F_RESTR) && !king) { if (FL[t] & F_THRONE) continue; break; }   // pass over the empty throne
        L[n].f = (u8)s; L[n].t = (u8)t; n++;
      }
    }
  }
  return n;
}
static int anyMove(const Pos *p) {
  int side = p->side;
  for (int s = 0; s < NSQ; s++) {
    int x = p->b[s]; if (!own(side, x)) continue;
    for (int d = 0; d < 4; d++) {
      int t = s + DIRS[d];
      while (p->b[t] == EMP) { if (!(FL[t] & F_RESTR) || x == KNG) return 1; if (!(FL[t] & F_THRONE)) break; t += DIRS[d]; }
    }
  }
  return 0;
}
// hostile to a man of side `vs` (the victim): an enemy piece, a corner, the empty throne
static inline int hostile(const Pos *p, int sq, int vs) {
  int x = p->b[sq];
  if (x == OFF) return 0;
  if (own(vs ^ 1, x)) return 1;
  if (x == EMP && (FL[sq] & (F_CORNER | F_THRONE))) return 1;
  return 0;
}
static inline void removeAt(Pos *p, int sq) {
  int x = p->b[sq]; p->h ^= ZP[x][sq]; p->b[sq] = EMP; p->ncap++;
  if (x == ATT) p->na--; else if (x == DEF) p->nd--;
}
static int kingCaptured(const Pos *p, int k, int from) {   // attackers just moved to `from` (adjacent to the king)
  if (R.kingCap4) {
    if (FL[k] & F_EDGE) return 0;
    for (int d = 0; d < 4; d++) { int q = k + DIRS[d]; if (!(p->b[q] == ATT || (q == THRONE))) return 0; }
    return 1;
  }
  int adjT = 0; for (int d = 0; d < 4; d++) if (k + DIRS[d] == THRONE) adjT = 1;
  if (k == THRONE || adjT) {
    for (int d = 0; d < 4; d++) { int q = k + DIRS[d]; if (!(p->b[q] == ATT || q == THRONE)) return 0; }
    return 1;
  }
  int dd = k - from, far = k + dd;   // custodial along the line of the capturing piece
  int x = p->b[far];
  return x == ATT || (x == EMP && (FL[far] & F_CORNER));
}
static int fortCheck(const Pos *p);
static int encircled(const Pos *p);
static void shieldwall(Pos *p, int t) {
  int side = p->side, vs = side ^ 1;   // side = the mover (not yet switched)
  int r = RR(t), c = CC(t);
  int inner;
  if (r == 0) inner = W; else if (r == N - 1) inner = -W; else if (c == 0) inner = 1; else if (c == N - 1) inner = -1; else return;
  for (int pass = 0; pass < 2; pass++) {
    int along = (inner == W || inner == -W) ? (pass ? 1 : -1) : (pass ? W : -W);
    int q = t + along, cnt = 0, nk = 0;
    int row[16];
    while (own(vs, p->b[q]) && (FL[q] & F_EDGE)) { if (!own(side, p->b[q + inner])) { cnt = -1; break; } row[cnt++] = q; if (p->b[q] == KNG) nk++; q += along; }
    if (cnt < 2) continue;
    int end = p->b[q];
    if (!(own(side, end) || (end == EMP && (FL[q] & F_CORNER)))) continue;
    for (int i = 0; i < cnt; i++) if (p->b[row[i]] != KNG) removeAt(p, row[i]);
    (void)nk;
  }
}
static inline void doMove(Pos *p, const Move *m) {
  int f = m->f, t = m->t, x = p->b[f], side = p->side;
  p->b[f] = EMP; p->b[t] = (u8)x; p->h ^= ZP[x][f] ^ ZP[x][t] ^ ZSIDE; p->ncap = 0; p->res = 0;
  if (x == KNG) { p->king = (u8)t; if (FL[t] & F_ESC) { p->res = 2; p->side = side ^ 1; return; } }
  int vs = side ^ 1, kingHit = 0;
  for (int d = 0; d < 4; d++) {   // the king is armed: it captures like a man
    int n = t + DIRS[d], y = p->b[n];
    if (y == KNG) { if (side == 0) kingHit = n; continue; }
    if (!own(vs, y)) continue;
    if (hostile(p, n + DIRS[d], vs)) removeAt(p, n);
  }
  if (R.shield && (FL[t] & F_EDGE)) shieldwall(p, t);
  if (side == 0) {
    if (kingHit && kingCaptured(p, kingHit, t)) { p->res = 1; p->side = 1; return; }
    if (R.encircle && encircled(p)) { p->res = 1; p->side = 1; return; }
  } else if (R.fort && (FL[p->king] & F_EDGE) && fortCheck(p)) { p->res = 2; p->side = 0; return; }
  p->side = side ^ 1;
}
// encirclement: no defender can reach the edge through squares without attackers
static int encircled(const Pos *p) {
  if (p->na < 4) return 0;
  u8 seen[NSQ]; int st[NSQ], sp = 0;
  for (int i = 0; i < NSQ; i++) seen[i] = 0;
  for (int i = 0; i < NSQ; i++) { int x = p->b[i]; if (x == DEF || x == KNG) { if (FL[i] & F_EDGE) return 0; seen[i] = 1; st[sp++] = i; } }
  while (sp) {
    int s = st[--sp];
    for (int d = 0; d < 4; d++) { int q = s + DIRS[d]; int x = p->b[q]; if (x == OFF || x == ATT || seen[q]) continue; if (FL[q] & F_EDGE) return 0; seen[q] = 1; st[sp++] = q; }
  }
  return 1;
}
// edge fort (conservative: only forts that can never be broken are recognised)
static int fortCheck(const Pos *p) {
  int k = p->king;
  u8 in[NSQ]; int st[NSQ], sp = 0, canMove = 0;
  for (int i = 0; i < NSQ; i++) in[i] = 0;
  in[k] = 1; st[sp++] = k;
  int walls[NSQ], nw = 0;
  while (sp) {
    int s = st[--sp];
    for (int d = 0; d < 4; d++) {
      int q = s + DIRS[d], x = p->b[q];
      if (x == OFF || in[q]) continue;
      if (x == ATT) return 0;
      if (x == DEF) { in[q] = 2; walls[nw++] = q; continue; }
      if (x == EMP) {
        if (FL[q] & F_RESTR) return 0;    // a corner or the throne inside: not a closed fort
        if (s == k) canMove = 1;
        in[q] = 1; st[sp++] = q;
      }
    }
  }
  if (!canMove) return 0;
  for (int i = 0; i < nw; i++) {
    int w = walls[i];
    for (int ax = 0; ax < 2; ax++) {
      int a = w + DIRS[ax], b = w + DIRS[ax + 2];
      int sa = p->b[a] == OFF || (in[a] && !(FL[a] & F_RESTR)), sb = p->b[b] == OFF || (in[b] && !(FL[b] & F_RESTR));
      if (!sa && !sb) return 0;
    }
    if (FL[w] & F_EDGE) {   // shieldwall: the square in front belongs to the fort, or the row along the edge can not be bracketed
      int r = RR(w), c = CC(w), inner = r == 0 ? W : r == N - 1 ? -W : c == 0 ? 1 : -1, along = (inner == W || inner == -W) ? 1 : W, ok = !!in[w + inner];
      for (int sgn = -1; sgn <= 1 && !ok; sgn += 2) {
        int q = w + sgn * along;
        while ((p->b[q] == DEF || p->b[q] == KNG) && (FL[q] & F_EDGE)) { if (p->b[q] == KNG) { ok = 1; break; } q += sgn * along; }
        if (!ok && p->b[q] == EMP && in[q] == 1) ok = 1;
      }
      if (!ok) return 0;
    }
  }
  return 1;
}
static inline u32 mvKey(const Move *m) { return (u32)m->f | ((u32)m->t << 8); }

// ---------------------------------------------------------------- king lines (escape) and capture threats
// open escape lines: number of escape squares the king can reach in one move (Copenhagen / Brandubh: along an edge to a
// corner; Tablut: straight to an edge); line squares are written to sqs (for blocking moves) when given
static int kingLines(const Pos *p, int k, u8 *mark) {
  int n = 0;
  for (int d = 0; d < 4; d++) {
    int dd = DIRS[d], q = k + dd, ok = 0;
    if (!R.escEdge) {   // only along the edge the king stands on
      int r = RR(k), c = CC(k);
      if ((dd == 1 || dd == -1) && !(r == 0 || r == N - 1)) continue;
      if ((dd == W || dd == -W) && !(c == 0 || c == N - 1)) continue;
    }
    while (p->b[q] == EMP) { if (FL[q] & F_ESC) { ok = 1; break; } q += dd; }
    if (ok) { n++; if (mark) for (int s = k + dd; ; s += dd) { mark[s] = 1; if (s == q) break; } }
  }
  return n;
}
// squares from which the king would have an escape line (filled per position lazily: computed on the fly)
static int escapeFrom(const Pos *p, int s) {   // the king on s (empty board otherwise as in p, with the king lifted): lines?
  int n = 0;
  for (int d = 0; d < 4; d++) {
    int dd = DIRS[d], q = s + dd;
    if (!R.escEdge) { int r = RR(s), c = CC(s); if ((dd == 1 || dd == -1) && !(r == 0 || r == N - 1)) continue; if ((dd == W || dd == -W) && !(c == 0 || c == N - 1)) continue; }
    while (p->b[q] == EMP || p->b[q] == KNG) { if (FL[q] & F_ESC) { n++; break; } q += dd; }
  }
  return n;
}
// can an attacker reach square e in one move?
static inline int attReach(const Pos *p, int e, int exclude) {
  if (FL[e] & F_RESTR) return 0;
  for (int d = 0; d < 4; d++) {
    int q = e + DIRS[d];
    while (p->b[q] == EMP) { if ((FL[q] & F_RESTR) && !(FL[q] & F_THRONE)) break; q += DIRS[d]; }
    if (p->b[q] == ATT && q != exclude) return 1;
  }
  return 0;
}
// attackers to move: can they capture the king with one move?
static int kingCapNow(const Pos *p) {
  int k = p->king;
  if (R.kingCap4) {
    if (FL[k] & F_EDGE) return 0;
    int miss = -1, nm = 0;
    for (int d = 0; d < 4; d++) { int q = k + DIRS[d]; if (p->b[q] == ATT || q == THRONE) continue; if (p->b[q] != EMP) return 0; miss = q; nm++; }
    return nm == 1 && attReach(p, miss, -1);
  }
  int adjT = 0; for (int d = 0; d < 4; d++) if (k + DIRS[d] == THRONE) adjT = 1;
  if (k == THRONE || adjT) {
    int miss = -1, nm = 0;
    for (int d = 0; d < 4; d++) { int q = k + DIRS[d]; if (p->b[q] == ATT || q == THRONE) continue; if (p->b[q] != EMP) return 0; miss = q; nm++; }
    return nm == 1 && attReach(p, miss, -1);
  }
  for (int ax = 0; ax < 2; ax++) {
    int a = k + DIRS[ax], b = k + DIRS[ax + 2];
    int ha = p->b[a] == ATT || (p->b[a] == EMP && (FL[a] & F_CORNER)), hb = p->b[b] == ATT || (p->b[b] == EMP && (FL[b] & F_CORNER));
    if (ha && p->b[b] == EMP && attReach(p, b, a)) return 1;
    if (hb && p->b[a] == EMP && attReach(p, a, b)) return 1;
  }
  return 0;
}

// ---------------------------------------------------------------- evaluation (side to move's view)
// per rule set (tuned by self-play, tools/native.c tune; see MODEL_CARD.md). Pieces: an attacker man = 100.
#define NW 18
static const char *EW_NAME[NW] = { "att", "def", "kmob", "kthr", "kadjA", "block", "kadjD", "kdist", "cornerA", "tempo", "kdanger", "near2", "chain", "kthr2", "edgeD", "bias", "cdanger", "cguard" };
static int EWV[3][NW] = {
  { 100, 855, 59, 91, 4, 69, 9, 43, 37, 20, 260, 2, 31, 68, 1, -784, 35, 15 },   // Copenhagen (SPSA re-tune after the repetition fix: 410 iterations × 4 games, 4k nodes; +70 Elo over the previous set (100 games, 15k nodes))
  { 100, 426, 66, 62, 54, 29, 2, 7, 28, 20, 267, 21, 1, 115, 17, -149, 42, 6 },   // Brandubh (SPSA re-tune after the repetition fix: 480 iterations; even with the previous set (+9 Elo, 300 games))
  { 100, 87, 12, 4, 7, 0, 10, 8, 0, 20, 69, 21, 9, 7, 4, -949, 0, 0 },   // Tablut (SPSA re-tune: 300 × 6 games, 6k nodes; +131 Elo over the previous set)
};
static int EW[NW];
static int noiseAmp = 0; static u64 noiseSeed = 1;
static int blockSq[4][3], nearSq[4][2], evalVar = -1;
static void evalInit(void) {
  if (evalVar == VAR) return;
  evalVar = VAR;
  for (int i = 0; i < NW; i++) EW[i] = EWV[VAR][i];
  // corner blockade: the diagonal of three squares in front of each corner (b3-c2 type: (0,2) (1,1) (2,0) relative to the corner)
  for (int k = 0; k < 4; k++) {
    int r0 = (k & 2) ? N - 1 : 0, c0 = (k & 1) ? N - 1 : 0, dr = (k & 2) ? -1 : 1, dc = (k & 1) ? -1 : 1;
    blockSq[k][0] = SQ(r0, c0 + 2 * dc); blockSq[k][1] = SQ(r0 + dr, c0 + dc); blockSq[k][2] = SQ(r0 + 2 * dr, c0);
    nearSq[k][0] = SQ(r0, c0 + dc); nearSq[k][1] = SQ(r0 + dr, c0);
  }
}
static const int MOBT[24] = { -60, -30, -10, 0, 10, 18, 25, 30, 35, 39, 43, 46, 49, 52, 54, 56, 58, 60, 62, 63, 64, 65, 66, 67 };
static int evaluate(const Pos *p) {
  int k = p->king, kr = RR(k), kc = CC(k);
  int v = EW[1] * p->nd - EW[0] * p->na;     // defenders' view
  // king mobility and two-move escape threats (squares the king can reach that give an escape line)
  int mob = 0, thr = 0, thr2 = 0;
  for (int d = 0; d < 4; d++) {
    int dd = DIRS[d];
    for (int q = k + dd; p->b[q] == EMP; q += dd) {
      mob++;
      if (!(FL[q] & F_RESTR) || (FL[q] & F_THRONE)) { int e = escapeFrom(p, q); if (e) { thr++; if (e >= 2) thr2++; } }
    }
  }
  v += MOBT[mob > 23 ? 23 : mob] * EW[2] / 60;
  v += EW[3] * (thr > 3 ? 3 : thr) + EW[13] * (thr2 > 2 ? 2 : thr2);
  int adjA = 0, adjD = 0;
  for (int d = 0; d < 4; d++) { int x = p->b[k + DIRS[d]]; if (x == ATT) adjA++; else if (x == DEF) adjD++; }
  v -= EW[4] * adjA * adjA / 2; v += EW[6] * adjD;
  // attackers within two squares of the king (pressure)
  int near2 = 0;
  for (int r = kr - 2; r <= kr + 2; r++) for (int c = kc - 2; c <= kc + 2; c++) if (r >= 0 && c >= 0 && r < N && c < N && p->b[SQ(r, c)] == ATT) near2++;
  v -= EW[11] * near2;
  int dr = kr < N - 1 - kr ? kr : N - 1 - kr, dc = kc < N - 1 - kc ? kc : N - 1 - kc;
  if (!R.escEdge) {
    int blk = 0, nearA = 0;
    for (int c = 0; c < 4; c++) { for (int j = 0; j < 3; j++) if (p->b[blockSq[c][j]] == ATT) blk++; for (int j = 0; j < 2; j++) if (p->b[nearSq[c][j]] == ATT) nearA++; }
    v -= EW[5] * blk; v += EW[8] * nearA;
    // an unguarded corner near the king is dangerous for the attackers; attackers near the corners guard them
    int guard = 0;
    for (int c = 0; c < 4; c++) {
      int open = 3, cr = RR(CORNERS[c]), cc = CC(CORNERS[c]);
      for (int j = 0; j < 3; j++) if (p->b[blockSq[c][j]] == ATT) open--;
      int dr2 = kr > cr ? kr - cr : cr - kr, dc2 = kc > cc ? kc - cc : cc - kc, kd = dr2 > dc2 ? dr2 : dc2;
      if (kd < 8) v += EW[16] * open * (8 - kd) / 8;
      for (int r = 0; r < 3; r++) for (int q = 0; q < 3; q++) { int rr = cr ? cr - r : r, qq = cc ? cc - q : q; if ((r || q) && p->b[SQ(rr, qq)] == ATT) guard++; }
    }
    v -= EW[17] * guard;
    v -= EW[7] * (dr + dc);
  } else v -= EW[7] * (dr < dc ? dr : dc);
  // attackers' chains (diagonal neighbours: the start of a cordon); defenders on the edge
  int chain = 0, edgeD = 0;
  for (int i = W; i < NSQ - W; i++) {
    int x = p->b[i];
    if (x == ATT) { if (p->b[i + W + 1] == ATT) chain++; if (p->b[i + W - 1] == ATT) chain++; }
    else if (x == DEF && (FL[i] & F_EDGE)) edgeD++;
  }
  v -= EW[12] * chain; v -= EW[14] * edgeD;
  int s = p->side;
  if (s == 1) { Pos q = *p; q.side = 0; if (kingCapNow(&q)) v -= EW[10]; }
  v -= EW[15];
  v = s ? v : -v;
  v += EW[9];
  if (noiseAmp) { u64 z = p->h ^ noiseSeed; z ^= z >> 33; z *= 0xff51afd7ed558ccdull; z ^= z >> 33; v += (int)(z % (u64)(2 * noiseAmp + 1)) - noiseAmp; }
  return v > 9000 ? 9000 : v < -9000 ? -9000 : v;
}

// ---------------------------------------------------------------- transposition table
typedef struct { u64 key; i16 v; u8 f, t; i8 d; u8 flag; u8 age; u8 pad; } TTE;
#ifdef NATIVE
#define TT_BITS 22
#else
#define TT_BITS 21
#endif
static TTE TT[1 << TT_BITS];
static u8 ttAge = 0;
static u64 ttSalt = 0;   // native tools: separate table regions for two players
#define TT_EXACT 3
#define TT_LOWER 1
#define TT_UPPER 2
static inline int vToTT(int v, int ply) { return v > WINT ? v + ply : v < -WINT ? v - ply : v; }
static inline int vFromTT(int v, int ply) { return v > WINT ? v - ply : v < -WINT ? v + ply : v; }
static void ttStore(u64 key, int d, int flag, int v, const Move *m, int ply) {
  TTE *e = &TT[key & ((1 << TT_BITS) - 1)];
  if (e->key != key && e->age == ttAge && e->d > d + 2) return;
  if (m) { e->f = m->f; e->t = m->t; } else if (e->key != key) { e->f = 0; }
  e->key = key; e->d = (i8)(d > 120 ? 120 : d); e->flag = (u8)flag; e->v = (i16)vToTT(v, ply); e->age = ttAge;
}
EXPORT(new_game) void new_game(void) { memset(TT, 0, sizeof(TT)); ttAge = 0; }

// ---------------------------------------------------------------- search
static u64 nodes; static double tEnd; static int stopFlag, nodeLimit_on; static u64 nodeLimit;
static int hist[2][NSQ][NSQ / 8 + 1];   // history by (from, to>>3) to keep it small
static int histT[2][NSQ];
static Move killers[MAXPLY][2];
static u64 hkeys[2048 + MAXPLY]; static int hn, hirr;
static int rootQuiet;
static int seldepth;
static inline int sameMove(const Move *a, const Move *b) { return a->f == b->f && a->t == b->t; }
static inline int timeUp(void) {
  if (stopFlag) return 1;
  if ((nodes & 1023) == 0) { if ((tEnd > 0 && now() > tEnd) || (nodeLimit_on && nodes > nodeLimit)) stopFlag = 1; }
  return stopFlag;
}
static int isRep(u64 key, int from) { for (int i = hn - 2; i >= from; i -= 2) if (hkeys[i] == key) return 1; return 0; }
// does move m capture something? (cheap test for ordering)
static inline int capTest(const Pos *p, const Move *m) {
  int x = p->b[m->f], side = p->side, vs = side ^ 1, t = m->t, c = 0;
  for (int d = 0; d < 4; d++) {
    int n = t + DIRS[d], y = p->b[n];
    if (!own(vs, y) || y == KNG) continue;
    int far = n + DIRS[d]; if (far == m->f) continue;
    if (hostile(p, far, vs)) c++;
  }
  (void)x; return c;
}
static int qsearch(Pos *p, int alpha, int beta, int ply);
// defenders to move: can the king step to a square with two escape lines that the attackers can not answer by capturing it?
// (one move blocks only one line, so this wins in two moves — exact)
static int kingFork(const Pos *p) {
  int k = p->king;
  for (int d = 0; d < 4; d++) {
    int dd = DIRS[d];
    for (int q = k + dd; p->b[q] == EMP; q += dd) {
      if ((FL[q] & F_RESTR) && !(FL[q] & F_THRONE)) break;
      if (escapeFrom(p, q) < 2) continue;
      Pos r = *p; r.b[k] = EMP; r.b[q] = KNG; r.king = (u8)q; r.side = 0;
      if (kingLines(&r, q, 0) >= 2 && !kingCapNow(&r)) return 1;
    }
  }
  return 0;
}
static int noTac = 0;   // the weakest levels sometimes play "blind": no tactical horizon (they miss two-move escapes / threats)
static int leafValue(Pos *p, int alpha, int beta, int ply) {
  if (noTac) return evaluate(p);
  // tactical horizon: escape lines and king captures one move ahead are resolved exactly
  if (p->side == 1) {
    if (kingLines(p, p->king, 0)) return WIN - ply - 1;
    if (kingFork(p)) return WIN - ply - 3;
    return evaluate(p);
  }
  if (kingCapNow(p)) return WIN - ply - 1;
  return qsearch(p, alpha, beta, ply);
}
// attackers to move at the horizon: if the king has an escape line, only blocking moves (or a king capture) can help
static int qsearch(Pos *p, int alpha, int beta, int ply) {
  u8 mark[NSQ]; for (int i = 0; i < NSQ; i++) mark[i] = 0;
  int lines = kingLines(p, p->king, mark);
  if (!lines) return evaluate(p);
  nodes++;
  Move L[MAXMV]; int n = gen(p, L), best = -(WIN - ply - 2);
  for (int i = 0; i < n; i++) {
    if (!mark[L[i].t]) continue;
    Pos q = *p; doMove(&q, &L[i]);
    int v;
    if (q.res == 1) v = WIN - ply - 1;
    else if (kingLines(&q, q.king, 0)) v = -(WIN - ply - 2);
    else v = -evaluate(&q);
    if (v > best) { best = v; if (v > alpha) { alpha = v; if (v >= beta) break; } }
  }
  return best;
}
static int search(Pos *p, int depth, int alpha, int beta, int ply, int pv, int quietPlies) {
  if (p->res) return -(WIN - ply);     // the previous move won
  u64 key = p->h;
  if (ply > 0) {
    if (quietPlies >= DRAW_PLIES) return 0;
    if (isRep(key, hirr)) return p->side ? -REPV : REPV;
    int ma = -(WIN - ply), mb = WIN - ply - 1;
    if (ma > alpha) { alpha = ma; if (alpha >= beta) return alpha; }
    if (mb < beta) { beta = mb; if (alpha >= beta) return beta; }
  }
  if (timeUp() && ply > 0) return 0;
  if (ply >= MAXPLY - 4) return evaluate(p);
  // immediate tactical facts
  if (!noTac && p->side == 1 && kingLines(p, p->king, 0)) return WIN - ply - 1;
  if (!noTac && p->side == 1 && depth <= 2 && kingFork(p)) return WIN - ply - 3;
  if (!noTac && p->side == 0 && kingCapNow(p)) return WIN - ply - 1;
  if (depth <= 0) { nodes++; return leafValue(p, alpha, beta, ply); }
  Move L[MAXMV]; int n = gen(p, L);
  if (!n) return -(WIN - ply);
  nodes++;
  if (ply > seldepth) seldepth = ply;
  u64 tkey = key ^ ttSalt; TTE *e = &TT[tkey & ((1 << TT_BITS) - 1)];
  Move ttm = { 0, 0 }; int hasTT = 0;
  if (e->key == tkey) {
    if (e->f) { ttm.f = e->f; ttm.t = e->t; hasTT = 1; }
    if (!pv && e->d >= depth && ply > 0) {
      int v = vFromTT(e->v, ply);
      if (e->flag == TT_EXACT || (e->flag == TT_LOWER && v >= beta) || (e->flag == TT_UPPER && v <= alpha)) return v;
    }
  }
  // the opponent threatens to win next move: only moves that stop it are useful (exact pruning)
  u8 mark[NSQ]; int threat = 0;
  if (p->side == 0 && !noTac) { for (int i = 0; i < NSQ; i++) mark[i] = 0; if (kingLines(p, p->king, mark)) threat = 1; }
  int sc[MAXMV], k = p->king, side = p->side;
  for (int i = 0; i < n; i++) {
    Move *m = &L[i]; int s = 0;
    if (hasTT && sameMove(m, &ttm)) s = 1 << 30;
    else {
      int c = capTest(p, m);
      if (c) s = (1 << 28) + c * 1000;
      else if (sameMove(m, &killers[ply][0])) s = 1 << 27;
      else if (sameMove(m, &killers[ply][1])) s = (1 << 27) - 1;
      else s = hist[side][m->f][m->t >> 3] + histT[side][m->t];
      if (side == 1 && m->f == k) { Pos q = *p; q.b[k] = EMP; q.b[m->t] = KNG; int ln = kingLines(&q, m->t, 0); if (ln) s += (1 << 29) + ln; else if (escapeFrom(&q, m->t)) s += 1 << 26; }
      if (side == 0) { int dk = m->t - k; if (dk == 1 || dk == -1 || dk == W || dk == -W) s += 1 << 25; }
    }
    if (threat && !mark[m->t]) s = -(1 << 30);   // cannot stop the escape (unless it captures the king: kingCapNow was false)
    sc[i] = s;
  }
  int best = -INF, oldAlpha = alpha; Move bestM = L[0];
  hkeys[hn++] = key;
  for (int i = 0; i < n; i++) {
    int bi = i; for (int j = i + 1; j < n; j++) if (sc[j] > sc[bi]) bi = j;
    { Move tm = L[bi]; L[bi] = L[i]; L[i] = tm; int ts = sc[bi]; sc[bi] = sc[i]; sc[i] = ts; }
    if (threat && sc[i] == -(1 << 30)) { if (best == -INF) { best = -(WIN - ply - 2); } break; }
    Move *m = &L[i];
    Pos q = *p; doMove(&q, m);
    int irr = q.ncap > 0, saveIrr = hirr;
    if (irr) hirr = hn;
    int qp = irr ? 0 : quietPlies + 1;
    int v, d1 = depth - 1;
    if (q.res) v = WIN - ply - 1;
    else if (i == 0) v = -search(&q, d1, -beta, -alpha, ply + 1, pv, qp);
    else {
      int red = 0;
      if (depth >= 3 && i >= 4 && sc[i] < (1 << 25) && !pv) red = 1 + (i >= 12 && depth >= 5);
      else if (depth >= 3 && i >= 6 && sc[i] < (1 << 25)) red = 1;
      v = -search(&q, d1 - red, -alpha - 1, -alpha, ply + 1, 0, qp);
      if (v > alpha && red) v = -search(&q, d1, -alpha - 1, -alpha, ply + 1, 0, qp);
      if (v > alpha && v < beta) v = -search(&q, d1, -beta, -alpha, ply + 1, pv, qp);
    }
    hirr = saveIrr;
    if (stopFlag) { hn--; return best > -INF ? best : 0; }
    if (v > best) {
      best = v; bestM = *m;
      if (v > alpha) {
        alpha = v;
        if (v >= beta) {
          if (!capTest(p, m)) {
            if (!sameMove(m, &killers[ply][0])) { killers[ply][1] = killers[ply][0]; killers[ply][0] = *m; }
            int *h = &hist[side][m->f][m->t >> 3]; *h += depth * depth; histT[side][m->t] += depth;
            if (*h > (1 << 22)) { for (int a = 0; a < 2; a++) for (int b = 0; b < NSQ; b++) { for (int c = 0; c < NSQ / 8 + 1; c++) hist[a][b][c] >>= 1; histT[a][b] >>= 1; } }
          }
          break;
        }
      }
    }
  }
  hn--;
  ttStore(tkey, depth, best >= beta ? TT_LOWER : best > oldAlpha ? TT_EXACT : TT_UPPER, best, &bestM, ply);
  return best;
}

// ---------------------------------------------------------------- root / host interface
static Pos ROOT;
static Move rootL[MAXMV]; static int rootN;
static int rootVal[MAXMV];
// setup: IO = [variant, side, cells (N*N: 0 empty 1 attacker 2 defender 3 king) ..., nmoves, (from | to << 8) * nmoves]
// squares are numbered r * N + c (r = 0 the top row). Returns 1 if all moves were legal.
static int toPad(int i) { return SQ(i / N, i % N); }
static int fromPad(int s) { return RR(s) * N + CC(s); }
static int findMove(const Pos *p, int f, int t, Move *out) {
  Move L[MAXMV]; int n = gen(p, L);
  for (int i = 0; i < n; i++) if (L[i].f == f && L[i].t == t) { *out = L[i]; return 1; }
  return 0;
}
static int gameRes;   // the game is already over at the root (res of the last move)
EXPORT(setup) int setup(void) {
  setVariant(IO[0]); evalInit();
  Pos p; posInit(&p);
  int nn = N * N;
  for (int i = 0; i < nn; i++) { int x = IO[2 + i]; p.b[toPad(i)] = (u8)(x >= 0 && x <= 3 ? x : 0); }
  p.side = (u8)(IO[1] & 1); posCount(&p);
  int nm = IO[2 + nn]; if (nm > 2000) nm = 2000;
  hn = 0; hirr = 0; rootQuiet = 0; gameRes = 0;
  for (int i = 0; i < nm; i++) {
    int x = IO[3 + nn + i];
    Move m; if (p.res || !findMove(&p, toPad(x & 255), toPad((x >> 8) & 255), &m)) return 0;
    hkeys[hn++] = p.h;
    doMove(&p, &m);
    if (p.ncap) { hirr = hn; rootQuiet = 0; } else rootQuiet++;
  }
  ROOT = p; gameRes = p.res;
  rootN = p.res ? 0 : gen(&p, rootL);
  return 1;
}
static void writeMove(i32 *o, const Move *m) { o[0] = fromPad(m->f) | (fromPad(m->t) << 8); }
static int rootSearch(int depth, int all, int alpha0, int beta0) {
  int alpha = alpha0, best = -INF;
  for (int i = 0; i < rootN; i++) {
    Move *m = &rootL[i]; Pos q = ROOT; doMove(&q, m);
    int irr = q.ncap > 0, saveIrr = hirr; hkeys[hn++] = ROOT.h; if (irr) hirr = hn;
    int qp = irr ? 0 : rootQuiet + 1, v;
    if (q.res) v = WIN - 1;
    else if (all) v = -search(&q, depth - 1, -INF, INF, 1, 1, qp);
    else if (i == 0) v = -search(&q, depth - 1, -beta0, -alpha, 1, 1, qp);
    else { v = -search(&q, depth - 1, -alpha - 1, -alpha, 1, 0, qp); if (v > alpha && v < beta0 && !stopFlag) v = -search(&q, depth - 1, -beta0, -alpha, 1, 1, qp); }
    hn--; hirr = saveIrr;
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
static void orderRoot(void) {   // a cheap first ordering: one-ply values
  for (int i = 0; i < rootN; i++) { Pos q = ROOT; doMove(&q, &rootL[i]); rootVal[i] = q.res ? WIN : -leafValue(&q, -INF, INF, 1); }
  sortRoot();
}
static void beginSearch(int ms) {
  stopFlag = 0; nodes = 0; tEnd = ms > 0 ? now() + ms : 0; ttAge++;
  for (int a = 0; a < 2; a++) for (int b = 0; b < NSQ; b++) { for (int c = 0; c < NSQ / 8 + 1; c++) hist[a][b][c] >>= 2; histT[a][b] >>= 2; }
  memset(killers, 0, sizeof(killers));
}
// reported values (analysis, the AI's own view, the evaluation bar): the tuned weights leave a large constant edge for
// the defenders in the raw score (it matters to the search: draws and repetitions are scored 0), so the values handed to
// the page are taken relative to the start position's static score (defenders' view). Exact results are left as they are.
static const int D0[3] = { 7982, 1130, -51 };
static int rep(int v) { if (v > WINT || v < -WINT) return v; return v - (ROOT.side ? D0[VAR] : -D0[VAR]); }
// best move: IO[0] = move, IO[2] = value, IO[3] = depth, IO[4] = nodes / 1000
EXPORT(best) void best(int maxDepth, int ms, int nodeK) {
  beginSearch(ms); nodeLimit_on = nodeK > 0; nodeLimit = (u64)nodeK * 1000;
  if (rootN == 0) { IO[0] = -1; IO[1] = 0; IO[2] = -WIN; IO[3] = 0; return; }
  orderRoot();
  Move bm = rootL[0]; int bv = rootVal[0], bd = 0;
  if (rootN == 1 || rootVal[0] >= WIN - 1) { writeMove(IO, &bm); IO[2] = rep(bv); IO[3] = 0; IO[4] = 0; return; }
  for (int i = 0; i < rootN; i++) rootVal[i] = -INF;
  int prev = 0;
  for (int d = 1; d <= maxDepth && d < MAXPLY - 8; d++) {
    seldepth = 0;
    int a = d >= 3 ? prev - 60 : -INF, b = d >= 3 ? prev + 60 : INF, v;
    for (;;) {
      v = rootSearch(d, 0, a, b);
      if (stopFlag) break;
      if (v <= a) { a = a - 300 < -INF ? -INF : a - 300; if (a < -3000) a = -INF; continue; }
      if (v >= b) { b = b + 300 > INF ? INF : b + 300; if (b > 3000) b = INF; continue; }
      break;
    }
    if (stopFlag && d > 1) {   // a move proven better at the unfinished depth is kept
      int bi = 0; for (int i = 1; i < rootN; i++) if (rootVal[i] > rootVal[bi]) bi = i;
      if (rootVal[bi] > -INF && rootVal[bi] > prev + 30 && bi != 0) { bm = rootL[bi]; bv = rootVal[bi]; }
      break;
    }
    int bi = 0; for (int i = 1; i < rootN; i++) if (rootVal[i] > rootVal[bi]) bi = i;
    if (bi) { Move t = rootL[bi]; int tv = rootVal[bi]; for (int i = bi; i > 0; i--) { rootL[i] = rootL[i - 1]; rootVal[i] = rootVal[i - 1]; } rootL[0] = t; rootVal[0] = tv; }
    for (int i = 1; i < rootN; i++) rootVal[i] = -INF;
    bm = rootL[0]; bv = v; bd = d; prev = v;
    progress(d, 1);
    if (v > WINT && WIN - v <= d) break;
    if (v < -WINT && WIN + v <= d) break;
    if (ms > 0 && d > 1 && now() > tEnd - ms * 0.55) break;
  }
  writeMove(IO, &bm); IO[2] = rep(bv); IO[3] = bd; IO[4] = (i32)(nodes / 1000);
}
// analysis: values of all root moves. IO[0] = n, IO[1] = depth, then (move, v) * n, best first
EXPORT(analyze) void analyze(int ms, int maxDepth) {
  beginSearch(ms); nodeLimit_on = 0;
  int depthDone = 0; static int vals[MAXMV]; static Move ord[MAXMV];
  if (rootN) { orderRoot(); for (int i = 0; i < rootN; i++) { ord[i] = rootL[i]; vals[i] = rootVal[i]; } }
  if (rootN) {
    for (int d = 2; d <= maxDepth && d < MAXPLY - 8; d++) {
      rootSearch(d, 1, -INF, INF);
      if (stopFlag) break;
      sortRoot();
      for (int i = 0; i < rootN; i++) { ord[i] = rootL[i]; vals[i] = rootVal[i]; }
      depthDone = d;
      IO[0] = rootN; IO[1] = depthDone; for (int i = 0; i < rootN; i++) { writeMove(IO + 2 + 2 * i, &ord[i]); IO[3 + 2 * i] = rep(vals[i]); }
      progress(d, rootN);
      int solved = 1; for (int i = 0; i < rootN; i++) if (vals[i] < WINT && vals[i] > -WINT) solved = 0;
      if (solved) break;
      if (now() > tEnd - ms * 0.6) break;
    }
  }
  if (!depthDone) depthDone = 1;
  IO[0] = rootN; IO[1] = depthDone;
  for (int i = 0; i < rootN; i++) { writeMove(IO + 2 + 2 * i, &ord[i]); IO[3 + 2 * i] = rep(vals[i]); }
}
// fixed-depth values of all root moves (weak levels): IO like analyze
EXPORT(values) void values(int depth, int noise) {
  beginSearch(0); nodeLimit_on = 0;
  noiseAmp = 0;
  orderRoot();
  for (int d = 2; d <= depth; d++) { rootSearch(d, 1, -INF, INF); sortRoot(); }
  (void)noise;
  IO[0] = rootN; IO[1] = depth;
  for (int i = 0; i < rootN; i++) { writeMove(IO + 2 + 2 * i, &rootL[i]); IO[3 + 2 * i] = rep(rootVal[i]); }
}

// ---------------------------------------------------------------- puzzles: forced win within k own moves (exact)
// winner = the side whose win we look for. att(p): winner to move; def(p): the other side to move.
// returns 1 yes, 0 no, -1 budget exhausted
static int pzWinner;
static int pzAtt(const Pos *p, int k, u64 *budget);
static int pzDef(const Pos *p, int k, u64 *budget) {   // loser to move; winner has k moves left after this reply
  if (p->res) return p->res == (pzWinner ? 2 : 1);
  if (!anyMove(p)) return 1;
  if (k <= 0) return 0;
  Move L[MAXMV]; int n = gen(p, L);
  // order: replies that stop an immediate threat first (they refute fastest)
  u8 mark[NSQ]; int lines = 0;
  if (pzWinner == 1) { for (int i = 0; i < NSQ; i++) mark[i] = 0; lines = kingLines(p, p->king, mark); }
  if (pzWinner == 1 && lines && !kingCapNow(p)) {   // the king has an escape line: only blocking moves matter
    for (int i = 0; i < n; i++) {
      if (!mark[L[i].t]) continue;
      if (!*budget) return -1; (*budget)--;
      Pos q = *p; doMove(&q, &L[i]);
      int r = pzAtt(&q, k, budget); if (r != 1) return r;
    }
    return 1;
  }
  int unk = 0;
  for (int pass = 0; pass < 2; pass++) for (int i = 0; i < n; i++) {
    int near = 0; { int dk = L[i].t - p->king; near = dk == 1 || dk == -1 || dk == W || dk == -W || L[i].f == p->king; }
    if ((pass == 0) != !!near) continue;
    if (!*budget) return -1; (*budget)--;
    Pos q = *p; doMove(&q, &L[i]);
    int r = pzAtt(&q, k, budget); if (r == 0) return 0; if (r < 0) unk = 1;
  }
  return unk ? -1 : 1;
}
static int pzAtt(const Pos *p, int k, u64 *budget) {   // winner to move, k own moves left
  if (p->res) return p->res == (pzWinner ? 2 : 1);
  if (k <= 0) return 0;
  if (pzWinner == 1 && kingLines(p, p->king, 0)) return 1;
  if (pzWinner == 0 && kingCapNow(p)) return 1;
  Move L[MAXMV]; int n = gen(p, L);
  if (!n) return 0;
  int unk = 0;
  for (int pass = 0; pass < 2; pass++) for (int i = 0; i < n; i++) {
    int pri = pzWinner == 1 ? L[i].f == p->king : ({ int dk = L[i].t - p->king; dk == 1 || dk == -1 || dk == W || dk == -W; });
    if ((pass == 0) != !!pri) continue;
    if (!*budget) return -1; (*budget)--;
    Pos q = *p; doMove(&q, &L[i]);
    if (q.res) { if (q.res == (pzWinner ? 2 : 1)) return 1; continue; }
    if (k == 1) continue;
    int r = pzDef(&q, k - 1, budget); if (r == 1) return 1; if (r < 0) unk = 1;
  }
  return unk ? -1 : 0;
}
// values of the root moves. defend = 0: the side to move looks for its win; need = own moves to the goal after each move
// (1 = this move wins, 0 = not within n). defend = 1: the side to move defends; need = moves the winner still needs after
// each reply (0 = escaped). IO out: [n, (move, need) * n]; need = -1 when the budget ran out
EXPORT(puzzle) void puzzle(int n, int defend, int budgetK) {
  pzWinner = defend ? ROOT.side ^ 1 : ROOT.side;
  IO[0] = rootN;
  for (int i = 0; i < rootN; i++) {
    Pos q = ROOT; doMove(&q, &rootL[i]);
    int need = 0;
    u64 budget = (u64)budgetK * 1000;
    if (!defend && q.res) need = q.res == (pzWinner ? 2 : 1) ? 1 : 0;
    else if (defend && q.res) need = 0;
    else for (int k = defend ? 1 : 1; k <= n - (defend ? 0 : 1); k++) {
      int r = defend ? pzAtt(&q, k, &budget) : pzDef(&q, k, &budget);
      if (r == 1) { need = defend ? k : k + 1; break; }
      if (r < 0) { need = -1; break; }
    }
    writeMove(IO + 1 + 2 * i, &rootL[i]); IO[2 + 2 * i] = need;
  }
}
EXPORT(eval_root) int eval_root(void) { return evaluate(&ROOT); }
EXPORT(root_res) int root_res(void) { return gameRes; }
EXPORT(set_weight) void set_weight(int i, int v) { if (i >= 0 && i < NW) EW[i] = v; }
EXPORT(set_noise) void set_noise(int amp, int seed) { noiseAmp = amp; noiseSeed = (u64)seed * 0x9E3779B97F4A7C15ull + 1; }

// ---------------------------------------------------------------- AI levels (20 steps: 15級 … 1級, 初段 … 五段)
// kind 0: fixed-depth values of all moves + noise / an occasional slip; kind 1: normal search (node budget or time) with
// a small evaluation noise for the middle levels. Shared by the browser (engine.js) and the native tools.
typedef struct { int kind, depth, nodesK, ms, noise, slip, blind, miss; } Level;   // slip, blind, miss: per mille
// blind: the move is chosen without the tactical horizon (escape lines, king captures); miss (defenders only): an escape in
// one is passed over — the low levels' defenders would otherwise never let a beginner's open line go
static const Level LEVELS[21] = { { 0 },
  { 0, 1, 0, 0, 320, 300, 700, 500 }, { 0, 1, 0, 0, 260, 220, 550, 400 }, { 0, 1, 0, 0, 200, 160, 420, 300 },   // 15級 14級 13級
  { 0, 1, 0, 0, 160, 120, 300, 200 }, { 0, 2, 0, 0, 140, 90, 200, 120 }, { 0, 2, 0, 0, 110, 60, 120, 70 }, { 0, 2, 0, 0, 85, 40, 60, 30 },   // 12級 … 9級
  { 1, 99, 2, 0, 60, 0, 0 }, { 1, 99, 3, 0, 50, 0, 0 }, { 1, 99, 4, 0, 40, 0, 0 }, { 1, 99, 8, 0, 30, 0, 0 },     // 8級 … 5級
  { 1, 99, 15, 0, 22, 0, 0 }, { 1, 99, 30, 0, 15, 0, 0 }, { 1, 99, 60, 0, 10, 0, 0 }, { 1, 99, 120, 0, 6, 0, 0 }, // 4級 … 1級
  { 1, 99, 250, 3000, 0, 0, 0 }, { 1, 99, 500, 3000, 0, 0, 0 }, { 1, 99, 1000, 3000, 0, 0, 0 },             // 初段 二段 三段
  { 1, 99, 0, 1200, 0, 0, 0 }, { 1, 99, 0, 2500, 0, 0, 0 } };                                             // 四段 五段
static u64 trng = 1;
static u32 tr32(void) { trng ^= trng << 13; trng ^= trng >> 7; trng ^= trng << 17; return (u32)(trng >> 11); }
static int gaussI(int amp) { int s = 0; for (int i = 0; i < 4; i++) s += (int)(tr32() % 2001) - 1000; return s * amp / 2000; }   // approx. N(0, amp^2 / 3)
// IO[0] = move, IO[2] = value (the level's own view), IO[3] = depth
EXPORT(think) void think(int level, int seed) {
  if (level < 1) level = 1; if (level > 20) level = 20;
  const Level *L = &LEVELS[level];
  trng = (u64)(u32)seed * 0x9E3779B97F4A7C15ull + 0x1234567ull; if (!trng) trng = 1; tr32(); tr32();
  if (rootN == 0) { IO[0] = -1; IO[2] = -WIN; IO[3] = 0; return; }
  if (rootN == 1) { writeMove(IO, &rootL[0]); IO[2] = 0; IO[3] = 0; return; }
  if (L->kind == 0) {
    // the sides are uneven at this level of play: a one-ply attacker never blocks a road, so the attackers always read
    // two plies and play blind three times less often; the defenders keep the level's weaknesses (and its misses)
    const int att = ROOT.side == 0;
    noTac = L->blind && (int)(tr32() % 1000) < (att ? L->blind / 3 : L->blind);
    values(att && L->depth < 2 ? 2 : L->depth, 0);
    noTac = 0;
    int bestv = rootVal[0], miss = !att && L->miss && (int)(tr32() % 1000) < L->miss;   // the defenders pass over an escape in one
    if (miss) { for (int i = 0; i < rootN; i++) if (rootVal[i] > WINT) rootVal[i] = -WINT; bestv = -INF; for (int i = 0; i < rootN; i++) if (rootVal[i] > bestv) bestv = rootVal[i]; }
    if (bestv >= WIN - 2 || bestv > WINT) { writeMove(IO, &rootL[0]); IO[2] = rep(bestv); IO[3] = L->depth; return; }   // a win in one is always seen
    if (L->slip && (int)(tr32() % 1000) < L->slip) {   // a slip: a random move among the not hopeless ones
      int ok[MAXMV], k = 0; for (int i = 0; i < rootN; i++) if (rootVal[i] > bestv - 500 && rootVal[i] > -WINT) ok[k++] = i;
      int pick = k ? ok[tr32() % k] : (int)(tr32() % rootN);
      writeMove(IO, &rootL[pick]); IO[2] = rep(bestv); IO[3] = L->depth; return;
    }
    int bi = 0, bx = -INF * 2;
    for (int i = 0; i < rootN; i++) { int v = rootVal[i]; int x = v + (v > WINT || v < -WINT ? 0 : gaussI(L->noise)); if (x > bx) { bx = x; bi = i; } }
    writeMove(IO, &rootL[bi]); IO[2] = rep(bestv); IO[3] = L->depth; return;
  }
  if (L->noise) set_noise(L->noise, (int)tr32()); else noiseAmp = 0;
#ifdef NATIVE
  if (getenv("NODES_FOR_MS")) { best(L->depth, 0, L->nodesK ? L->nodesK : L->ms * 3 / 4); noiseAmp = 0; return; }   // calibration: the browser searches about 0.75 k nodes per ms
#endif
  best(L->depth, L->ms, L->nodesK);
  noiseAmp = 0;
}
