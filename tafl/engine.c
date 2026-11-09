// Hnefatafl (Viking chess) search engine in C, compiled to WebAssembly for the browser
// (also builds natively for the tools: -DNATIVE).
//
// Rule sets (variant 0 = Copenhagen 11x11, 1 = Brandubh 7x7, 2 = Tablut 9x9, 3 = Tawlbwrdd 11x11, 4 = Fetlar 11x11,
// 5 = Ard Ri 7x7). Attackers (side 0) move first.
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
//   Fetlar / Ard Ri: the king is captured as in Copenhagen (four sides, never on the edge); no shieldwall, fort or
//     encirclement.
//   Brandubh / Tablut / Tawlbwrdd: the king is captured like a man (two sides) away from the throne; on the throne four attackers,
//     next to it three attackers and the throne are needed.
//   Escape: corners (Copenhagen, Brandubh, Fetlar, Ard Ri), any edge square (Tablut, Tawlbwrdd).
//   A side without a legal move loses. Repetition: the third occurrence of a position is a loss for the defenders.
//   Draw: 200 plies without a capture (host + search).
//
// Search: iterative deepening negamax alpha-beta (PVS) with aspiration windows, a transposition table, killer / history
// move ordering, late move reductions, a tactical horizon (king escape lines and king captures are resolved exactly),
// repetition handling, mate-distance values, and a hand-written evaluation tuned by self-play (see MODEL_CARD.md).
// Since 2026-11-07 (search v2): log-based reductions, reverse futility / futility / late-move pruning near the leaves and
// a null move, all off in PV nodes and under king threats (an escape line, a two-move escape, a king capture next move).
// Since 2026-11-08 the levels with a node budget use it too, with smaller budgets calibrated to the same strength (MODEL_CARD.md).
// Build (wasm): see tools/build.sh. Host protocol: everything goes through the shared i32 buffer at io_ptr().
#include <stdint.h>
typedef int32_t i32; typedef uint32_t u32; typedef int8_t i8; typedef uint8_t u8; typedef int16_t i16; typedef uint16_t u16; typedef uint64_t u64;
#ifdef NATIVE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#define EXPORT(name)
#define TLS
static double now(void) { struct timespec ts; clock_gettime(CLOCK_MONOTONIC, &ts); return ts.tv_sec * 1000.0 + ts.tv_nsec / 1e6; }
static void progress(int depth, int count) { (void)depth; (void)count; }
#else
#define EXPORT(name) __attribute__((export_name(#name)))
/* MT (engine_mt.wasm): several threads search together on one shared memory ("Lazy SMP"); per-thread state is TLS
   (position, rules of the variant, search tables), the net, the page's switches and the transposition table are shared.
   Without MT TLS is nothing (same build as before). */
#ifdef MT
#define TLS _Thread_local
#else
#define TLS
#endif
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

static TLS i32 IO[8192];
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
static TLS Rules R; static TLS int VAR = -1, N = 11, THRONE;
static TLS u8 FL[NSQ];
static TLS u64 ZP[4][NSQ], ZSIDE;
static TLS int CORNERS[4];
static inline int SQ(int r, int c) { return (r + 1) * W + c + 1; }
static inline int RR(int s) { return s / W - 1; }
static inline int CC(int s) { return s % W - 1; }
static TLS u64 rs64 = 0x9E3779B97F4A7C15ull;
static u64 rnd64(void) { rs64 ^= rs64 << 13; rs64 ^= rs64 >> 7; rs64 ^= rs64 << 17; return rs64; }
static TLS int zReady = 0;
static void setVariant(int v) {
  if (!zReady) { for (int k = 0; k < 4; k++) for (int i = 0; i < NSQ; i++) ZP[k][i] = rnd64(); ZSIDE = rnd64(); zReady = 1; }
  if (v == VAR) return;
  VAR = v;
  if (v == 1) { Rules r = { 7, 0, 0, 0, 0, 0 }; R = r; }
  else if (v == 2) { Rules r = { 9, 1, 0, 0, 0, 0 }; R = r; }
  else if (v == 3) { Rules r = { 11, 1, 0, 0, 0, 0 }; R = r; }   // Tawlbwrdd: Tablut's rules on 11x11
  else if (v == 4) { Rules r = { 11, 0, 1, 0, 0, 0 }; R = r; }   // Fetlar: Copenhagen without shieldwall / edge fort / encirclement
  else if (v == 5) { Rules r = { 7, 0, 1, 0, 0, 0 }; R = r; }    // Ard Ri: 7x7, corners, the king captured on four sides
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
// the pieces a move takes off / puts on (for the learned evaluation's incremental first layer): +(1 + x·NSQ + sq) / −(…)
static TLS int dlog[48], dlen;
static inline void removeAt(Pos *p, int sq) {
  int x = p->b[sq]; p->h ^= ZP[x][sq]; p->b[sq] = EMP; p->ncap++;
  if (dlen < 48) dlog[dlen++] = -(1 + x * NSQ + sq);
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
static inline int att8(const Pos *p, int t) {
  return (p->b[t - W - 1] == ATT) + (p->b[t - W] == ATT) + (p->b[t - W + 1] == ATT) + (p->b[t - 1] == ATT)
       + (p->b[t + 1] == ATT) + (p->b[t + W - 1] == ATT) + (p->b[t + W] == ATT) + (p->b[t + W + 1] == ATT);
}
static inline void doMove(Pos *p, const Move *m) {
  int f = m->f, t = m->t, x = p->b[f], side = p->side;
  dlen = 2; dlog[0] = -(1 + x * NSQ + f); dlog[1] = 1 + x * NSQ + t;
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
    // a new encirclement needs a capture (the last defender outside taken) or the moved attacker closing the ring
    // (two attackers among its 8 neighbours): otherwise the position was not encircled before and still is not
    if (R.encircle && (p->ncap || att8(p, t) >= 2) && encircled(p)) { p->res = 1; p->side = 1; return; }
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
static int EWV[6][NW] = {
  { 100, 855, 59, 91, 4, 69, 9, 43, 37, 20, 260, 2, 31, 68, 1, -784, 35, 15 },   // Copenhagen (SPSA re-tune after the repetition fix: 410 iterations × 4 games, 4k nodes; +70 Elo over the previous set (100 games, 15k nodes))
  { 100, 426, 66, 62, 54, 29, 2, 7, 28, 20, 267, 21, 1, 115, 17, -149, 42, 6 },   // Brandubh (SPSA re-tune after the repetition fix: 480 iterations; even with the previous set (+9 Elo, 300 games))
  { 100, 87, 12, 4, 7, 0, 10, 8, 0, 20, 69, 21, 9, 7, 4, -949, 0, 0 },   // Tablut (SPSA re-tune: 300 × 6 games, 6k nodes; +131 Elo over the previous set)
  { 100, 87, 12, 4, 7, 0, 10, 8, 0, 20, 69, 21, 9, 7, 4, -949, 0, 0 },   // Tawlbwrdd (Tablut's set; an SPSA tune, 250 × 6 games, was even with it: −3 Elo, 200 games, 6k nodes)
  { 100, 855, 59, 91, 4, 69, 9, 43, 37, 20, 260, 2, 31, 68, 1, -784, 35, 15 },   // Fetlar (Copenhagen's set: the same board, corners and king capture)
  { 100, 426, 66, 62, 54, 29, 2, 7, 28, 20, 267, 21, 1, 115, 17, -149, 42, 6 },   // Ard Ri (Brandubh's set; an SPSA tune, 160 × 6 games, gave +38 ± 50 Elo but a jumpy start value, so not used)
};
static TLS int EW[NW];
static TLS int noiseAmp = 0; static TLS u64 noiseSeed = 1;
static TLS int blockSq[4][3], nearSq[4][2], evalVar = -1;
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
static int nnEvaluate(const Pos *p);
static int nnUse = 0, nnVar = -1, nnAvail = 0, nnWant = 1;   // nnAvail: a net is loaded; nnWant: the page's switch   // the learned evaluation (loaded net for rule set nnVar) instead of the hand-made one
static int evaluate(const Pos *p) {
  if (nnUse && nnVar == VAR) return nnEvaluate(p);
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
  if (s == 1 && kingCapNow(p)) v -= EW[10];   // (kingCapNow does not read the side to move)
  v -= EW[15];
  v = s ? v : -v;
  v += EW[9];
  if (noiseAmp) { u64 z = p->h ^ noiseSeed; z ^= z >> 33; z *= 0xff51afd7ed558ccdull; z ^= z >> 33; v += (int)(z % (u64)(2 * noiseAmp + 1)) - noiseAmp; }
  return v > 9000 ? 9000 : v < -9000 ? -9000 : v;
}

// ---------------------------------------------------------------- learned evaluation (tools/nn/train.py)
// value (defenders' view, in units of a win-probability logit) = Σ w2[side]·clamp(acc, 0, 1)² + Σ u[side]·f + b2[side],
// acc = b1 + the first-layer columns of the pieces (attacker / defender / king planes of N×N squares), f = the hand-made
// features below (the same quantities as evaluate() uses, before its weights). side = the side to move (output bucket).
// File (little endian): "TFN1", int32 variant, N, H, NF, float32 scale, then float32 W1[3·N·N][H], b1[H], w2[2][H], u[2][NF], b2[2].
// The first layer is kept in int16 (×NN_QA), the rest in float. evaluate() = value × scale (side to move's view).
#define NN_NF 16
#define NN_HMAX 512
#define NN_INMAX (3 * 11 * 11)
#define NN_QA 127
static int nnN = 0, nnH = 0; static float nnScale = 400;
static i16 nnW1[NN_INMAX * NN_HMAX], nnB1[NN_HMAX];
static float nnW2[2][NN_HMAX] __attribute__((aligned(16))), nnU[2][NN_NF], nnB2[2];
static u8 nnBuf[4 * (5 + NN_INMAX * NN_HMAX + NN_HMAX + 2 * NN_HMAX + 2 * NN_NF + 2) + 16];
EXPORT(nn_buf) u8 *nn_buf(void) { return nnBuf; }
EXPORT(nn_buf_size) int nn_buf_size(void) { return (int)sizeof nnBuf; }
static float rdF(const u8 *q) { union { u32 i; float f; } u; u.i = (u32)q[0] | (u32)q[1] << 8 | (u32)q[2] << 16 | (u32)q[3] << 24; return u.f; }
static int rdI(const u8 *q) { return (int)((u32)q[0] | (u32)q[1] << 8 | (u32)q[2] << 16 | (u32)q[3] << 24); }
// parse nnBuf (len bytes) → 1 ok (the net is then used for its rule set), 0 bad file
EXPORT(nn_load) int nn_load(int len) {
  const u8 *q = nnBuf;
  if (len < 24 || q[0] != 'T' || q[1] != 'F' || q[2] != 'N' || q[3] != '1') return 0;
  int v = rdI(q + 4), n = rdI(q + 8), h = rdI(q + 12), nf = rdI(q + 16); float sc = rdF(q + 20);
  if (v < 0 || v > 2 || n < 7 || n > 11 || h < 8 || h > NN_HMAX || (h & 7) || nf != NN_NF) return 0;
  int nin = 3 * n * n;
  if (len != 24 + 4 * (nin * h + h + 2 * h + 2 * nf + 2)) return 0;
  q += 24;
  for (int i = 0; i < nin * h; i++, q += 4) { float x = rdF(q) * NN_QA; nnW1[i] = (i16)(x < 0 ? x - .5f : x + .5f); }
  for (int i = 0; i < h; i++, q += 4) { float x = rdF(q) * NN_QA; nnB1[i] = (i16)(x < 0 ? x - .5f : x + .5f); }
  for (int b = 0; b < 2; b++) for (int i = 0; i < h; i++, q += 4) nnW2[b][i] = rdF(q) / (NN_QA * NN_QA);
  for (int b = 0; b < 2; b++) for (int i = 0; i < nf; i++, q += 4) nnU[b][i] = rdF(q);
  for (int b = 0; b < 2; b++, q += 4) nnB2[b] = rdF(q);
  nnVar = v; nnN = n; nnH = h; nnScale = sc; nnAvail = 1; nnUse = nnWant;
  return 1;
}
static int nnCenter = 0;   // the start position's static value with the net (defenders' view), set by the page (nn_center)
EXPORT(nn_center) void nn_center(int v) { nnCenter = v; }
EXPORT(nn_enable) void nn_enable(int on) { nnWant = on; nnUse = nnAvail && on; }
EXPORT(nn_active) int nn_active(void) { return nnUse && nnVar == VAR; }
// the hand-made features, defenders' view (f[15]: the attackers capture the king next move, only with the defenders to move)
static void handFeat(const Pos *p, float *f) {
  int k = p->king, kr = RR(k), kc = CC(k);
  int mob = 0, thr = 0, thr2 = 0;
  for (int d = 0; d < 4; d++) {
    int dd = DIRS[d];
    for (int q = k + dd; p->b[q] == EMP; q += dd) {
      mob++;
      if (!(FL[q] & F_RESTR) || (FL[q] & F_THRONE)) { int e = escapeFrom(p, q); if (e) { thr++; if (e >= 2) thr2++; } }
    }
  }
  int adjA = 0, adjD = 0;
  for (int d = 0; d < 4; d++) { int x = p->b[k + DIRS[d]]; if (x == ATT) adjA++; else if (x == DEF) adjD++; }
  int near2 = 0;
  for (int r = kr - 2; r <= kr + 2; r++) for (int c = kc - 2; c <= kc + 2; c++) if (r >= 0 && c >= 0 && r < N && c < N && p->b[SQ(r, c)] == ATT) near2++;
  int dr = kr < N - 1 - kr ? kr : N - 1 - kr, dc = kc < N - 1 - kc ? kc : N - 1 - kc;
  int blk = 0, nearA = 0, guard = 0; float cd = 0, dist;
  if (!R.escEdge) {
    for (int c = 0; c < 4; c++) { for (int j = 0; j < 3; j++) if (p->b[blockSq[c][j]] == ATT) blk++; for (int j = 0; j < 2; j++) if (p->b[nearSq[c][j]] == ATT) nearA++; }
    for (int c = 0; c < 4; c++) {
      int open = 3, cr = RR(CORNERS[c]), cc = CC(CORNERS[c]);
      for (int j = 0; j < 3; j++) if (p->b[blockSq[c][j]] == ATT) open--;
      int dr2 = kr > cr ? kr - cr : cr - kr, dc2 = kc > cc ? kc - cc : cc - kc, kd = dr2 > dc2 ? dr2 : dc2;
      if (kd < 8) cd += open * (8 - kd) / 8.f;
      for (int r = 0; r < 3; r++) for (int q = 0; q < 3; q++) { int rr = cr ? cr - r : r, qq = cc ? cc - q : q; if ((r || q) && p->b[SQ(rr, qq)] == ATT) guard++; }
    }
    dist = (float)(dr + dc);
  } else dist = (float)(dr < dc ? dr : dc);
  int chain = 0, edgeD = 0;
  for (int i = W; i < NSQ - W; i++) {
    int x = p->b[i];
    if (x == ATT) { if (p->b[i + W + 1] == ATT) chain++; if (p->b[i + W - 1] == ATT) chain++; }
    else if (x == DEF && (FL[i] & F_EDGE)) edgeD++;
  }
  int kd = p->side == 1 && kingCapNow(p);
  f[0] = p->na; f[1] = p->nd; f[2] = MOBT[mob > 23 ? 23 : mob] / 60.f; f[3] = thr > 3 ? 3 : thr; f[4] = thr2 > 2 ? 2 : thr2;
  f[5] = adjA * adjA / 2.f; f[6] = adjD; f[7] = near2; f[8] = blk; f[9] = nearA; f[10] = cd; f[11] = guard; f[12] = dist;
  f[13] = chain; f[14] = edgeD; f[15] = kd;
}
// first layer, incremental: ACC[k] is the accumulator of the position at search ply k (KEY), built from ply k-1 with the pieces
// that move took off and put on (DEL, recorded by accPush right after doMove). GEN orders the pushes: a chain k-1 → k is
// valid only if k was pushed after k-1 (otherwise k belongs to an older branch); anything else is rebuilt from the board.
#define ACCN (MAXPLY + 8)
static TLS Pos ROOT;   // (defined with the root search below)
static TLS i16 ACC[ACCN][NN_HMAX] __attribute__((aligned(16)));
static TLS int DEL[ACCN][48], DN[ACCN], OKA[ACCN]; static TLS u64 KEY[ACCN]; static TLS u32 GEN[ACCN], genC; static TLS int evPly = -1;
static TLS int nnRC[NSQ];   // padded square → r·N + c
static void accPush(int k, const Pos *q) {
  if (k < 0 || k >= ACCN) return;
  DN[k] = dlen; for (int i = 0; i < dlen; i++) DEL[k][i] = dlog[i];
  KEY[k] = q->h; GEN[k] = ++genC; OKA[k] = 0;
}
static void accRoot(const Pos *p) { KEY[0] = p->h; GEN[0] = ++genC; OKA[0] = 0; DN[0] = -1; }
#ifdef __wasm_simd128__
#include <wasm_simd128.h>
#endif
static inline void rowAdd(i16 *a, const i16 *w, int H) {
#ifdef __wasm_simd128__
  for (int j = 0; j < H; j += 8) wasm_v128_store(a + j, wasm_i16x8_add(wasm_v128_load(a + j), wasm_v128_load(w + j)));
#else
  for (int j = 0; j < H; j++) a[j] += w[j];
#endif
}
static inline void rowSub(i16 *a, const i16 *w, int H) {
#ifdef __wasm_simd128__
  for (int j = 0; j < H; j += 8) wasm_v128_store(a + j, wasm_i16x8_sub(wasm_v128_load(a + j), wasm_v128_load(w + j)));
#else
  for (int j = 0; j < H; j++) a[j] -= w[j];
#endif
}
static inline const i16 *nnRow(int x, int sq) { return nnW1 + ((x == ATT ? 0 : x == DEF ? 1 : 2) * nnN * nnN + nnRC[sq]) * nnH; }
static void accBuild(const Pos *p, i16 *acc) {
  int H = nnH; for (int j = 0; j < H; j++) acc[j] = nnB1[j];
  for (int r = 0; r < nnN; r++) for (int c = 0; c < nnN; c++) {
    int sq = SQ(r, c), x = p->b[sq]; if (x != ATT && x != DEF && x != KNG) continue;
    rowAdd(acc, nnRow(x, sq), H);
  }
}
static const i16 *accFor(const Pos *p, i16 *scratch) {
  int k = evPly;
  if (k < 0 || k >= ACCN || KEY[k] != p->h || (k > 0 && DN[k] < 0)) { accBuild(p, scratch); return scratch; }
  if (OKA[k]) return ACC[k];
  int j = k;
  while (j > 0 && !OKA[j - 1] && GEN[j] > GEN[j - 1] && DN[j - 1] >= 0) j--;   // back to a computed ancestor of this branch
  if (j == 1 && !OKA[0] && KEY[0] == ROOT.h && GEN[1] > GEN[0]) { accBuild(&ROOT, ACC[0]); OKA[0] = 1; }
  if (j == 0 || !(GEN[j] > GEN[j - 1]) || !OKA[j - 1]) { accBuild(p, ACC[k]); OKA[k] = 1; return ACC[k]; }
  for (int i = j; i <= k; i++) {
    i16 *a = ACC[i]; const i16 *b = ACC[i - 1]; int H = nnH, n = DN[i];
    const i16 *w[48]; int sg[48];
    for (int d = 0; d < n; d++) { int e = DEL[i][d], v = e < 0 ? -e - 1 : e - 1; w[d] = nnRow(v / NSQ, v % NSQ); sg[d] = e > 0; }
    if (n == 2 && !sg[0] && sg[1]) {   // a quiet move: one piece off one square, onto another (fused, one pass)
#ifdef __wasm_simd128__
      for (int q = 0; q < H; q += 8) wasm_v128_store(a + q, wasm_i16x8_add(wasm_i16x8_sub(wasm_v128_load(b + q), wasm_v128_load(w[0] + q)), wasm_v128_load(w[1] + q)));
#else
      for (int q = 0; q < H; q++) a[q] = b[q] - w[0][q] + w[1][q];
#endif
    } else {
      for (int q = 0; q < H; q++) a[q] = b[q];
      for (int d = 0; d < n; d++) { if (sg[d]) rowAdd(a, w[d], H); else rowSub(a, w[d], H); }
    }
    OKA[i] = 1;
  }
  return ACC[k];
}
static float nnValue(const Pos *p) {   // defenders' view, logit units
  i16 scratch[NN_HMAX] __attribute__((aligned(16)));
  if (!nnRC[SQ(nnN - 1, nnN - 1)] && nnN > 1) for (int r = 0; r < nnN; r++) for (int c = 0; c < nnN; c++) nnRC[SQ(r, c)] = r * nnN + c;
  if (evPly == 0 && KEY[0] == p->h && !OKA[0]) { accBuild(p, ACC[0]); OKA[0] = 1; }
  const i16 *acc = accFor(p, scratch);
  int H = nnH, s = p->side; float o = nnB2[s]; const float *w2 = nnW2[s];
#ifdef __wasm_simd128__
  {
    const v128_t lo = wasm_i16x8_splat(0), hi = wasm_i16x8_splat(NN_QA); v128_t sum = wasm_f32x4_splat(0);
    for (int j = 0; j < H; j += 8) {
      v128_t x = wasm_i16x8_min(wasm_i16x8_max(wasm_v128_load(acc + j), lo), hi), xx = wasm_i16x8_mul(x, x);
      sum = wasm_f32x4_add(sum, wasm_f32x4_mul(wasm_f32x4_convert_i32x4(wasm_i32x4_extend_low_i16x8(xx)), wasm_v128_load(w2 + j)));
      sum = wasm_f32x4_add(sum, wasm_f32x4_mul(wasm_f32x4_convert_i32x4(wasm_i32x4_extend_high_i16x8(xx)), wasm_v128_load(w2 + j + 4)));
    }
    o += wasm_f32x4_extract_lane(sum, 0) + wasm_f32x4_extract_lane(sum, 1) + wasm_f32x4_extract_lane(sum, 2) + wasm_f32x4_extract_lane(sum, 3);
  }
#else
  for (int j = 0; j < H; j++) { int x = acc[j] < 0 ? 0 : acc[j] > NN_QA ? NN_QA : acc[j]; o += (float)(x * x) * w2[j]; }
#endif
  float f[NN_NF]; handFeat(p, f);
  for (int i = 0; i < NN_NF; i++) o += nnU[s][i] * f[i];
  return o;
}
static int nnEvaluate(const Pos *p) {
  float o = nnValue(p) * nnScale;
  int v = (int)(o < 0 ? o - .5f : o + .5f);
  v = p->side ? v : -v;
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
#ifndef MT
static TTE TT[1 << TT_BITS];
#endif
static u8 ttAge = 0;
#ifdef MT
static volatile int gStop;          /* shared: set when the main thread's search is over (the helpers stop) */
static TLS int threadId;            /* 0 = the main thread (time control, result), 1.. = helpers */
/* every thread's last finished iteration on the current root: { key ^ x, x }, x = depth | value | move | in use — the main
   thread answers with the deepest one, and a helper that finishes the main thread's depth limit ends the search (gHit) */
#define MT_SLOTS 64
static u64 gRes[MT_SLOTS][2];
static volatile u64 gGoalKey, gHit; static volatile int gGoal;
static TLS u64 rootK;
#endif
static u64 ttSalt = 0;   // native tools: separate table regions for two players
#define TT_EXACT 3
#define TT_LOWER 1
#define TT_UPPER 2
static inline int vToTT(int v, int ply) { return v > WINT ? v + ply : v < -WINT ? v - ply : v; }
static inline int vFromTT(int v, int ply) { return v > WINT ? v - ply : v < -WINT ? v + ply : v; }
#ifdef MT
/* (2026-11-09, the audit after checkers / morris, addendum "wasm の Lazy SMP の置換表") the threads' shared table. The plain
   one above (one entry per key, a 16-byte struct written field by field) is not used: two threads writing one slot at once
   could leave one position's key with another's value / depth / bound, and the one slot per key let the threads' many
   shallow entries push out the deep ones. Here: buckets of four entries { key ^ w, w } (w = value, move, depth, bound, age,
   in use), so a torn entry fails the key check ("lockless"); store = the same key's entry, else the shallowest / oldest of
   the bucket (depth − 16 if from an earlier search). 2^TTM_BITS buckets x 64 bytes (64 MB: 4M entries, the plain one 2M). */
#ifndef TTM_BITS
#define TTM_BITS 20
#endif
static u64 TTM[(1 << TTM_BITS) * 8];
typedef struct { i16 v; u8 f, t; i8 d; u8 flag; } TTR;
static inline int ttProbe(u64 key, TTR *r) {
  const u64 *bk = &TTM[(key & ((1u << TTM_BITS) - 1)) * 8];
  for (int j = 0; j < 4; j++) {
    u64 w = bk[2 * j + 1], kx = bk[2 * j];
    if ((kx ^ w) == key && (w >> 58)) { r->v = (i16)(w & 0xFFFF); r->f = (u8)(w >> 16); r->t = (u8)(w >> 24); r->d = (i8)(w >> 32); r->flag = (u8)((w >> 40) & 3); return 1; }
  }
  return 0;
}
static void ttStore(u64 key, int d, int flag, int v, const Move *m, int ply) {
  u64 *bk = &TTM[(key & ((1u << TTM_BITS) - 1)) * 8];
  int j = -1, q = 1 << 30; u64 old = 0;
  for (int i = 0; i < 4; i++) {
    u64 w = bk[2 * i + 1], kx = bk[2 * i];
    if ((kx ^ w) == key && (w >> 58)) { j = i; old = w; break; }
    int s = !(w >> 58) ? -1000 : (int)(i8)(w >> 32) - (((w >> 48) & 255) != ttAge ? 16 : 0);
    if (s < q) { q = s; j = i; }
  }
  u64 mv = m && m->f ? ((u64)m->f << 16 | (u64)m->t << 24) : old ? (old & 0xFFFF0000ull) : 0;   // (no move: keep the entry's own)
  u64 w = (u64)(u16)(i16)vToTT(v, ply) | mv | (u64)(u8)(i8)(d > 120 ? 120 : d) << 32 | (u64)(flag & 3) << 40 | (u64)ttAge << 48 | 1ull << 58;
  bk[2 * j + 1] = w; bk[2 * j] = key ^ w;
}
EXPORT(new_game) void new_game(void) { memset(TTM, 0, sizeof(TTM)); ttAge = 0; }
#else
static void ttStore(u64 key, int d, int flag, int v, const Move *m, int ply) {
  TTE *e = &TT[key & ((1 << TT_BITS) - 1)];
  if (e->key != key && e->age == ttAge && e->d > d + 2) return;
  if (m) { e->f = m->f; e->t = m->t; } else if (e->key != key) { e->f = 0; }
  e->key = key; e->d = (i8)(d > 120 ? 120 : d); e->flag = (u8)flag; e->v = (i16)vToTT(v, ply); e->age = ttAge;
}
EXPORT(new_game) void new_game(void) { memset(TT, 0, sizeof(TT)); ttAge = 0; }
#endif

// ---------------------------------------------------------------- search
static TLS u64 nodes; static TLS double tEnd; static TLS int stopFlag, nodeLimit_on; static TLS u64 nodeLimit;
EXPORT(last_nodes) double last_nodes(void) { return (double)nodes; }   /* nodes of the last search (the page shows the speed) */
static TLS int hist[2][NSQ][NSQ / 8 + 1];   // history by (from, to>>3) to keep it small
static TLS int histT[2][NSQ];
static TLS Move killers[MAXPLY][2];
static TLS u64 hkeys[2048 + MAXPLY]; static TLS int hn, hirr;
static TLS int rootQuiet;
static TLS int seldepth;
static inline int sameMove(const Move *a, const Move *b) { return a->f == b->f && a->t == b->t; }
static inline int timeUp(void) {
  if (stopFlag) return 1;
#ifdef MT
  if ((nodes & 1023) == 0 && (gStop || (rootK && gHit == rootK))) stopFlag = 1;
#endif
  if (nodeLimit_on && nodes > nodeLimit) stopFlag = 1;   // checked at every node (the weak levels read a few hundred nodes)
  if ((nodes & 1023) == 0 && tEnd > 0 && now() > tEnd) stopFlag = 1;
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
static TLS int noTac = 0;   // the weakest levels sometimes play "blind": no tactical horizon (they miss two-move escapes / threats)
static int leafValue(Pos *p, int alpha, int beta, int ply) {
  evPly = ply;
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
  if (!lines) { evPly = ply; return evaluate(p); }
  nodes++;
  Move L[MAXMV]; int n = gen(p, L), best = -(WIN - ply - 2);
  for (int i = 0; i < n; i++) {
    if (!mark[L[i].t]) continue;
    Pos q = *p; doMove(&q, &L[i]); accPush(ply + 1, &q);
    int v;
    if (q.res == 1) v = WIN - ply - 1;
    else if (kingLines(&q, q.king, 0)) v = -(WIN - ply - 2);
    else { evPly = ply + 1; v = -evaluate(&q); }
    if (v > best) { best = v; if (v > alpha) { alpha = v; if (v >= beta) break; } }
  }
  return best;
}
// search switches / margins (SP[i], set_sp for the test tools). Margins are in the evaluation's units: the net's (1000 per
// logit) or the hand-made one's (an attacker man = 100), scaled by SP_UNIT / SP_HUNIT.
enum { SP_TTFIRST, SP_RFP, SP_RFPD, SP_RFPM, SP_NMP, SP_NMPD, SP_FUT, SP_FUTD, SP_FUTM, SP_LMP, SP_LMPD, SP_LMPB, SP_LMR, SP_LMRK, SP_UNIT, SP_HUNIT, SP_NMPR, SP_LMRB, SP_KTHR, SP_BLK, SP_N };
static int SP[32] = { 1, 1, 3, 150, 1, 3, 1, 2, 200, 1, 3, 10, 1, 225, 100, 50, 3, 0, 2, 1 };
EXPORT(set_sp) void set_sp(int i, int v) { if (i >= 0 && i < 32) SP[i] = v; }
static double lnx(double x) {   // natural log (no libm in the wasm build)
  if (x < 1) return 0;
  double r = 0; while (x >= 2) { x /= 2; r += 0.6931471805599453; }
  double z = (x - 1) / (x + 1), z2 = z * z; return r + 2 * z * (1 + z2 / 3 + z2 * z2 / 5 + z2 * z2 * z2 / 7);
}
static int LMRT[64][64]; static int lmrK = -1;
static void lmrInit(void) {
  if (lmrK == SP[SP_LMRK] * 1000 + SP[SP_LMRB]) return;
  lmrK = SP[SP_LMRK] * 1000 + SP[SP_LMRB];
  for (int d = 0; d < 64; d++) for (int i = 0; i < 64; i++) LMRT[d][i] = (int)(SP[SP_LMRB] / 100.0 + lnx(d) * lnx(i) * 100 / SP[SP_LMRK]);   // ln(d)·ln(i) / k, rounded down
}
static TLS u8 nullAt[MAXPLY + 8];   // the move into this ply was a null move
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
  if (ply >= MAXPLY - 4) { evPly = ply; return evaluate(p); }
  // immediate tactical facts
  if (!noTac && p->side == 1 && kingLines(p, p->king, 0)) return WIN - ply - 1;
  if (!noTac && p->side == 1 && depth <= 2 && kingFork(p)) return WIN - ply - 3;
  if (!noTac && p->side == 0 && kingCapNow(p)) return WIN - ply - 1;
  if (depth <= 0) { nodes++; return leafValue(p, alpha, beta, ply); }
  nodes++;
  // the transposition table first (before the move generation)
  u64 tkey = key ^ ttSalt;
#ifdef MT
  TTR er, *e = &er;
  Move ttm = { 0, 0 }; int hasTT = 0, ttv = 0, ttf = 0;
  if (ttProbe(tkey, e)) {
#else
  TTE *e = &TT[tkey & ((1 << TT_BITS) - 1)];
  Move ttm = { 0, 0 }; int hasTT = 0, ttv = 0, ttf = 0;
  if (e->key == tkey) {
#endif
    if (e->f) { ttm.f = e->f; ttm.t = e->t; hasTT = 1; }
    ttv = vFromTT(e->v, ply); ttf = e->flag;
    if (!pv && e->d >= depth && ply > 0) {
      if (ttf == TT_EXACT || (ttf == TT_LOWER && ttv >= beta) || (ttf == TT_UPPER && ttv <= alpha)) return ttv;
    } else if (e->d < 0) ttf = 0;
  }
  Move L[MAXMV]; int n = gen(p, L);
  if (!n) return -(WIN - ply);
  if (ply > seldepth) seldepth = ply;
  // the opponent threatens to win next move: only moves that stop it are useful (exact pruning)
  u8 mark[NSQ]; int threat = 0;
  if (p->side == 0 && !noTac) { for (int i = 0; i < NSQ; i++) mark[i] = 0; if (kingLines(p, p->king, mark)) threat = 1; }
  // defenders to move with the king capturable next move: no pruning either
  int danger = p->side == 1 && !noTac && kingCapNow(p);
  // pruning near the leaves (not in PV nodes, not under a threat, not near a forced result): the static value
  int calm = !pv && !threat && !danger && !noTac && ply > 0 && beta < WINT && alpha > -WINT, ev = 0;
  int U = nnUse && nnVar == VAR ? SP[SP_UNIT] : SP[SP_HUNIT];
  // attackers to move and the king one move away from an escape line (a two-move escape threat): no static cuts
  int kthr = 0;
  if (calm && SP[SP_KTHR] && p->side == 0) {
    int kk = p->king;
    for (int d = 0; d < 4 && !kthr; d++) for (int q = kk + DIRS[d]; p->b[q] == EMP; q += DIRS[d]) {
      if ((FL[q] & F_RESTR) && !(FL[q] & F_THRONE)) break;
      if (escapeFrom(p, q)) { kthr = 1; break; }
    }
  }
  if (calm) {
    evPly = ply; ev = evaluate(p);
    if (ttf && ((ttf == TT_LOWER && ttv > ev) || (ttf == TT_UPPER && ttv < ev) || ttf == TT_EXACT) && ttv < WINT && ttv > -WINT) ev = ttv;
    // reverse futility: far above beta near the leaves
    if (SP[SP_RFP] && !kthr && depth <= SP[SP_RFPD] && ev - SP[SP_RFPM] * U / 100 * depth >= beta) return ev;
    // null move: let the opponent move twice; still above beta → cut
    if (SP[SP_NMP] && !nullAt[ply] && depth >= SP[SP_NMPD] && ev >= beta && (p->side ? p->nd : p->na) >= 3) {
      Pos q = *p; q.side ^= 1; q.h ^= ZSIDE; q.res = 0; q.ncap = 0; dlen = 0; accPush(ply + 1, &q);
      int r = SP[SP_NMPR] + depth / 4, saveIrr = hirr; hkeys[hn++] = key; hirr = hn;
      nullAt[ply + 1] = 1;
      int v = -search(&q, depth - 1 - r, -beta, -beta + 1, ply + 1, 0, quietPlies + 1);
      nullAt[ply + 1] = 0; hirr = saveIrr; hn--;
      if (stopFlag) return 0;
      if (v >= beta) return v > WINT ? beta : v;
    }
  }
  int futile = calm && !(kthr && SP[SP_KTHR] == 1) && SP[SP_FUT] && depth <= SP[SP_FUTD] && ev + SP[SP_FUTM] * U / 100 * depth <= alpha;
  int lmpN = calm && SP[SP_LMP] && depth <= SP[SP_LMPD] ? SP[SP_LMPB] * (2 + depth * depth) / 2 : MAXMV;
  int sc[MAXMV], k = p->king, side = p->side;
  int blk[4] = { -1, -1, -1, -1 }, nblk = 0;
  if (side == 1 && SP[SP_BLK]) for (int d = 0; d < 4; d++) { int q = k + DIRS[d]; while (p->b[q] == EMP) q += DIRS[d]; if (p->b[q] == DEF) { blk[d] = q; nblk = 1; } }
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
      else if (nblk && (m->f == blk[0] || m->f == blk[1] || m->f == blk[2] || m->f == blk[3])) s += 1 << 25;   // a defender in the king's way: moving it opens a line
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
    int quiet = sc[i] < (1 << 25);   // (sorted: every later move is quiet too)
    if (quiet && best > -WINT && (futile || i >= lmpN)) break;
    Move *m = &L[i];
    Pos q = *p; doMove(&q, m); accPush(ply + 1, &q);
    int irr = q.ncap > 0, saveIrr = hirr;
    if (irr) hirr = hn;
    int qp = irr ? 0 : quietPlies + 1;
    int v, d1 = depth - 1;
    if (q.res) v = WIN - ply - 1;
    else if (i == 0) v = -search(&q, d1, -beta, -alpha, ply + 1, pv, qp);
    else {
      int red = 0;
      if (SP[SP_LMR]) {
        if (depth >= 3 && i >= 3 && quiet) {
          red = LMRT[depth < 63 ? depth : 63][i < 63 ? i : 63] - (pv ? 1 : 0) - (threat || danger ? 1 : 0);
          if (red > d1 - 1) red = d1 - 1;
          if (red < 0) red = 0;
        }
      }
      else if (depth >= 3 && i >= 4 && quiet && !pv) red = 1 + (i >= 12 && depth >= 5);
      else if (depth >= 3 && i >= 6 && quiet) red = 1;
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
static TLS Pos ROOT;
static TLS Move rootL[MAXMV]; static TLS int rootN;
static TLS int rootVal[MAXMV];
// setup: IO = [variant, side, cells (N*N: 0 empty 1 attacker 2 defender 3 king) ..., nmoves, (from | to << 8) * nmoves]
// squares are numbered r * N + c (r = 0 the top row). Returns 1 if all moves were legal.
static int toPad(int i) { return SQ(i / N, i % N); }
static int fromPad(int s) { return RR(s) * N + CC(s); }
static int findMove(const Pos *p, int f, int t, Move *out) {
  Move L[MAXMV]; int n = gen(p, L);
  for (int i = 0; i < n; i++) if (L[i].f == f && L[i].t == t) { *out = L[i]; return 1; }
  return 0;
}
static TLS int gameRes;   // the game is already over at the root (res of the last move)
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
    Move *m = &rootL[i]; Pos q = ROOT; doMove(&q, m); accPush(1, &q);
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
  for (int i = 0; i < rootN; i++) { Pos q = ROOT; doMove(&q, &rootL[i]); accPush(1, &q); rootVal[i] = q.res ? WIN : -leafValue(&q, -INF, INF, 1); }
  sortRoot();
}
static void beginSearch(int ms) {
  stopFlag = 0; nodes = 0; tEnd = ms > 0 ? now() + ms : 0;
#ifdef MT
  rootK = 0;   /* (bestN sets it on the main thread: the depth goal a helper may reach first) */
  if (!threadId)
#endif
  ttAge++;
  accRoot(&ROOT);
  for (int a = 0; a < 2; a++) for (int b = 0; b < NSQ; b++) { for (int c = 0; c < NSQ / 8 + 1; c++) hist[a][b][c] >>= 2; histT[a][b] >>= 2; }
  memset(killers, 0, sizeof(killers)); memset(nullAt, 0, sizeof(nullAt));
  lmrInit();
}
// reported values (analysis, the AI's own view, the evaluation bar): the tuned weights leave a large constant edge for
// the defenders in the raw score (it matters to the search: draws and repetitions are scored 0), so the values handed to
// the page are taken relative to the start position's static score (defenders' view). Exact results are left as they are.
static const int D0[6] = { 7982, 1130, -51, -583, 8079, 120 };   // Ard Ri: from the search (its start is tactical: the static score is far off)
static int rep(int v) {
  if (v > WINT || v < -WINT) return v;
  if (nnUse && nnVar == VAR) return (v - (ROOT.side ? nnCenter : -nnCenter)) * 2 / 5;   // the net: a logit × scale (1000) → the page's scale (about 400 per logit), taken relative to the start position like the hand-made values
  return v - (ROOT.side ? D0[VAR] : -D0[VAR]);
}
// best move: IO[0] = move, IO[2] = value, IO[3] = depth, IO[4] = nodes / 1000. nodeLim: nodes (0 = no limit)
static void bestN(int maxDepth, int ms, u64 nodeLim) {
  beginSearch(ms); nodeLimit_on = nodeLim > 0; nodeLimit = nodeLim;
  if (rootN == 0) { IO[0] = -1; IO[1] = 0; IO[2] = -WIN; IO[3] = 0; return; }
  orderRoot();
  Move bm = rootL[0]; int bv = rootVal[0], bd = 0;
  if (rootN == 1 || rootVal[0] >= WIN - 1) { writeMove(IO, &bm); IO[2] = rep(bv); IO[3] = 0; IO[4] = 0; return; }
  for (int i = 0; i < rootN; i++) rootVal[i] = -INF;
  int prev = 0, d0 = 1;
#ifdef MT
  /* (2026-11-09) every thread iterates 1, 2, 3, … like the main one: the helpers' start a ply ahead (every other one) was
     slower to the main thread's depth in the measurement (MODEL_CARD.md). The root key: the position, its history length
     and the rules. */
  const u64 rk = (ROOT.h ^ (u64)hn << 40 ^ (u64)(VAR + 1) << 56 ^ (u64)rootN << 20) | 1;
  if (!threadId) {   /* a new search: forget the threads' results of the last one, set the depth goal */
    for (int i = 0; i < MT_SLOTS; i++) { __atomic_store_n(&gRes[i][0], 0, __ATOMIC_SEQ_CST); __atomic_store_n(&gRes[i][1], 0, __ATOMIC_SEQ_CST); }
    gHit = 0; gGoal = maxDepth; gGoalKey = rk; rootK = rk;
  }
#endif
  for (int d = d0; d <= maxDepth && d < MAXPLY - 8; d++) {
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
#ifdef MT
    if (threadId < MT_SLOTS) {   /* publish the finished iteration */
      u64 x = (u64)(d & 255) | (u64)(u16)(i16)bv << 8 | (u64)bm.f << 24 | (u64)bm.t << 32 | 1ull << 40;
      __atomic_store_n(&gRes[threadId][1], x, __ATOMIC_SEQ_CST); __atomic_store_n(&gRes[threadId][0], rk ^ x, __ATOMIC_SEQ_CST);
      if (threadId && d >= gGoal && gGoalKey == rk) gHit = rk;
    }
    writeMove(IO, &bm); IO[2] = rep(bv); IO[3] = bd; IO[4] = (i32)(nodes / 1000);   /* the page reads the result so far */
#endif
    progress(d, 1);
#ifdef MT
    if (gStop) break;
#endif
    if (v > WINT && WIN - v <= d) break;
    if (v < -WINT && WIN + v <= d) break;
    if (ms > 0 && d > 1 && now() > tEnd - ms * 0.55) break;
  }
#ifdef MT
  if (!threadId) {   /* the deepest finished iteration of all the threads (the main thread's on a tie) */
    int bt = -1, bdep = bd;
    for (int i = 1; i < MT_SLOTS; i++) {
      u64 x = __atomic_load_n(&gRes[i][1], __ATOMIC_SEQ_CST), kx = __atomic_load_n(&gRes[i][0], __ATOMIC_SEQ_CST);
      if (!(x >> 40) || (kx ^ x) != rk) continue;
      int dd = (int)(x & 255); if (dd > bdep) { bdep = dd; bt = i; }
    }
    if (bt > 0) {
      u64 x = __atomic_load_n(&gRes[bt][1], __ATOMIC_SEQ_CST), kx = __atomic_load_n(&gRes[bt][0], __ATOMIC_SEQ_CST);
      Move m = { (u8)(x >> 24), (u8)(x >> 32) }; int ok = 0;
      for (int i = 0; i < rootN; i++) if (sameMove(&rootL[i], &m)) ok = 1;
      if ((kx ^ x) == rk && ok) { bm = m; bv = (i16)(u16)(x >> 8); bd = (int)(x & 255); }
    }
    gGoalKey = 0; gHit = 0; rootK = 0;
  }
#endif
  writeMove(IO, &bm); IO[2] = rep(bv); IO[3] = bd; IO[4] = (i32)(nodes / 1000);
}
EXPORT(best) void best(int maxDepth, int ms, int nodeK) { bestN(maxDepth, ms, nodeK > 0 ? (u64)nodeK * 1000 : 0); }
// analysis: values of all root moves. IO[0] = n, IO[1] = depth, then (move, v) * n, best first
EXPORT(analyze) void analyze(int ms, int maxDepth) {
  beginSearch(ms); nodeLimit_on = 0;
  int depthDone = 0; static TLS int vals[MAXMV]; static TLS Move ord[MAXMV];
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
static TLS int pzWinner;
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

// ---------------------------------------------------------------- AI levels (25 steps: 15級 … 1級, 初段 … 五段, Lv.21-25)
// kind 0: fixed-depth values of all moves + noise / an occasional slip; kind 1: normal search (node budget or time) with
// a small evaluation noise for the middle levels. Shared by the browser (engine.js) and the native tools.
typedef struct { int kind, depth, nodesH, ms, noise, slip, blind, miss; } Level;   // nodesH: node budget in hundreds; slip, blind, miss: per mille
// blind: the move is chosen without the tactical horizon (escape lines, king captures); miss (defenders only): an escape in
// one is passed over — the low levels' defenders would otherwise never let a beginner's open line go
static const Level LEVELS[26] = { { 0 },
  { 0, 1, 0, 0, 320, 300, 700, 500 }, { 0, 1, 0, 0, 260, 220, 550, 400 }, { 0, 1, 0, 0, 200, 160, 420, 300 },   // 15級 14級 13級
  { 0, 1, 0, 0, 160, 120, 300, 200 }, { 0, 2, 0, 0, 140, 90, 200, 120 }, { 0, 2, 0, 0, 110, 60, 120, 70 }, { 0, 2, 0, 0, 85, 40, 60, 30 },   // 12級 … 9級
  { 1, 99, 20, 0, 60, 0, 0 }, { 1, 99, 20, 0, 50, 0, 0 }, { 1, 99, 22, 0, 40, 0, 0 }, { 1, 99, 35, 0, 30, 0, 0 },     // 8級 … 5級
  { 1, 99, 58, 0, 22, 0, 0 }, { 1, 99, 60, 0, 15, 0, 0 }, { 1, 99, 85, 0, 10, 0, 0 }, { 1, 99, 260, 0, 6, 0, 0 },   // 4級 … 1級
  { 1, 99, 800, 3000, 0, 0, 0 }, { 1, 99, 1200, 3000, 0, 0, 0 }, { 1, 99, 3200, 3000, 0, 0, 0 },            // 初段 二段 三段
  { 1, 99, 0, 1200, 0, 0, 0 }, { 1, 99, 0, 2500, 0, 0, 0 },                                               // 四段 五段
  // Lv.21-25 (2026-11-08): longer thinking (the page uses all threads); ms is the hard limit per move (Lv.25: 20 s)
  { 1, 99, 0, 4000, 0, 0, 0 }, { 1, 99, 0, 6000, 0, 0, 0 }, { 1, 99, 0, 9000, 0, 0, 0 }, { 1, 99, 0, 13500, 0, 0, 0 }, { 1, 99, 0, 20000, 0, 0, 0 } };
static TLS u64 trng = 1;
static u32 tr32(void) { trng ^= trng << 13; trng ^= trng >> 7; trng ^= trng << 17; return (u32)(trng >> 11); }
static int gaussI(int amp) { int s = 0; for (int i = 0; i < 4; i++) s += (int)(tr32() % 2001) - 1000; return s * amp / 2000; }   // approx. N(0, amp^2 / 3)
// IO[0] = move, IO[2] = value (the level's own view), IO[3] = depth
// with the net, a level can read fewer nodes (NN_NODES, hundreds of nodes; 0 = the level's own) and use a larger noise (NN_NOISE, % of the level's)
// so that the levels keep a smooth ladder from the hand-made ones below 8級 (see MODEL_CARD.md)
static int NN_NODES[26] = { 0, 0, 0, 0, 0, 0, 0, 0, 7, 12, 21, 27, 36, 49, 55, 57, 90, 260, 620, 0, 0, 0, 0, 0, 0, 0 },   // 8級 … 三段 (hundreds of nodes); 四段・五段: the level's time
           NN_NOISE[26] = { 0, 0, 0, 0, 0, 0, 0, 0, 800, 800, 800, 800, 800, 800, 600, 400, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 };
// rule sets where the search v2 needs other node budgets than the levels' own (hand-made evaluation) for the same strength
// (0 = the level's own; measured, MODEL_CARD.md): Tablut and Tawlbwrdd (escape on any edge square) and Ard Ri (7x7, a king of four sides)
static const int VAR_NODES[6][26] = { { 0 }, { 0 },
  { 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 130, 200, 480, 0, 0, 0, 0, 0 },
  { 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 130, 200, 480, 0, 0, 0, 0, 0 }, { 0 },
  { 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 25, 0, 90, 200, 0, 900, 1800, 3600, 0, 0 } };
static int nnNoiseMul = 100;
EXPORT(nn_noise) void nn_noise(int pct) { nnNoiseMul = pct; }
EXPORT(nn_level) void nn_level(int level, int nodesH, int noisePct) { if (level >= 1 && level <= 25) { NN_NODES[level] = nodesH; NN_NOISE[level] = noisePct; } }
static void think1(int level, int seed);
// the learned evaluation (when loaded) is used from 8級 up (searching levels); the weakest levels keep the hand-made one,
// whose noise and slips were set on its scale
EXPORT(think) void think(int level, int seed) {
  int keep = nnUse;
  if (level < 1) level = 1; if (level > 25) level = 25;
  if (LEVELS[level].kind == 0) nnUse = 0;
  think1(level, seed);
  nnUse = keep;
}
static void think1(int level, int seed) {
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
  const int net = nnUse && nnVar == VAR;
  if (L->noise) set_noise(net ? L->noise * (NN_NOISE[level] ? NN_NOISE[level] : nnNoiseMul) / 100 : L->noise, (int)tr32()); else noiseAmp = 0;
  int nh = net && NN_NODES[level] ? NN_NODES[level] : VAR_NODES[VAR][level] ? VAR_NODES[VAR][level] : L->nodesH, ms = net && NN_NODES[level] ? 0 : L->ms;
#ifdef NATIVE
  if (getenv("NODES_FOR_MS")) { bestN(L->depth, 0, nh ? (u64)nh * 100 : (u64)ms * 750); noiseAmp = 0; return; }   // calibration: the browser searches about 0.75 k nodes per ms
#endif
  bestN(L->depth, ms, (u64)nh * 100);
  noiseAmp = 0;
}

#ifdef MT
/* ------------------------------------------------------------------ threads (engine_mt.wasm, see pro/) */
extern unsigned char __heap_base;
extern void __wasm_init_tls(void *);
EXPORT(mt_heap_base) u32 mt_heap_base(void) { return (u32)&__heap_base; }
EXPORT(mt_tls_size) u32 mt_tls_size(void) { return __builtin_wasm_tls_size(); }
/* every instance first: mt_stack (its own stack top; a function without a frame of its own), then mt_thread */
EXPORT(mt_stack) void mt_stack(u32 stackTop) { __asm__ volatile(".globaltype __stack_pointer, i32\n local.get %0\n global.set __stack_pointer" :: "r"(stackTop)); }
EXPORT(mt_thread) void mt_thread(u32 tls, int id) { __wasm_init_tls((void *)tls); threadId = id; }
EXPORT(mt_stop) void mt_stop(int v) { __atomic_store_n(&gStop, v, __ATOMIC_SEQ_CST); }
#endif
