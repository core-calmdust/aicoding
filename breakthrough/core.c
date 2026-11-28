// Breakthrough (Dan Troyka, 2000) — the search in WebAssembly (tools/build-core.sh → core-wasm.js). Written for this site
// (claude/breakthrough-spec.md「エンジン」): bitboards, αβ (PVS) with a transposition table, killers / history, a capture
// quiescence, the game's own forcing rules (a piece one step from the goal wins; two enemy pieces one step from your
// home row lose; one must be captured) and an exact race rule (a piece with no enemy piece in the cone in front of it
// cannot be stopped). The evaluation is our own hand-written one (material, advance, home-row guards, formations, safety).
//
// Board: N×N (5…8), bit = r * 8 + c (r = 0 is the top rank), so one u64 per side for every size. P1 (White, moves first)
// starts on the two bottom ranks and runs up (r decreasing); P2 (Black) starts on the top two ranks and runs down.
// Moves inside the core: from | to << 6 | capture << 12. engine.js converts to the page's squares (r * N + c).
typedef unsigned long long u64;
typedef unsigned int u32;
#define WIN 30000
#define WINT 29000
#define MAXPLY 128
#define MAXMV 64
#ifdef NATIVE
#include <time.h>
static double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec * 1000.0 + t.tv_nsec / 1e6; }
#define EXPORT(n)
#else
double now(void);
#define EXPORT(n) __attribute__((export_name(#n)))
void *memcpy(void *d, const void *s, unsigned long n) { char *a = d; const char *b = s; while (n--) *a++ = *b++; return d; }
void *memset(void *d, int c, unsigned long n) { char *a = d; while (n--) *a++ = (char)c; return d; }
#endif
static inline int popc(u64 x) { return __builtin_popcountll(x); }
static inline int lsb(u64 x) { return __builtin_ctzll(x); }

static int N = 8;
static u64 VALID, NOT_A, NOT_H, ROW[8], GOAL[2], PRE[2], HOME[2];
static u64 CONE[2][64];          // the squares in front of a piece of side s on sq that can ever meet it (Luna-Mota's region)
static unsigned char SQ[64];     // the page's board (r * N + c): 0 empty, 1 P1, 2 P2
static int IO[64];               // small values both ways
static int RVM[MAXMV], RVV[MAXMV], RVN = 0;   // root moves and values (analysis)
static int PVB[64];              // a line
static double nodes = 0, nodeLimit = 1e300, tEnd = 1e300;
static int stopF = 0, rootDepth = 0;
// ---- zobrist (splitmix64)
static u64 ZK[2][64], ZSIDE;
static u64 sm(u64 *s) { u64 z = (*s += 0x9E3779B97F4A7C15ULL); z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9ULL; z = (z ^ (z >> 27)) * 0x94D049BB133111EBULL; return z ^ (z >> 31); }

typedef struct { u64 b[2]; u64 h; int side; } P;   // b[0] P1's pieces, b[1] P2's; side 0 = P1 to move

// ---- the evaluation's weights (centipawn-like: a piece is 100)
static int W_PIECE = 100;
static int ADV8[8] = { 0, 2, 5, 9, 16, 28, 48, 0 };     // by rows advanced (8×8; other sizes take the same row from the goal)
static int HOMEW8[8] = { 6, 16, 14, 10, 10, 14, 16, 6 };   // a guard still on its home rank, by file
static int W_COL = 5, W_PHAL = 3, W_HANG = 55, W_HANG_OPP = 12, W_DANGER = 70, W_TEMPO = 8, W_SUPP = 4;
static int ADV[8], HOMEW[8];

static void setTables(void) {
  for (int k = 0; k < 8; k++) ADV[k] = 0;
  // the last few rows matter most: index by rows from the goal
  for (int a = 0; a < N; a++) { int fromGoal = N - 1 - a, src = 7 - fromGoal; ADV[a] = src >= 0 ? ADV8[src] : 0; }
  ADV[0] = 0;
  for (int c = 0; c < N; c++) { int src = N == 8 ? c : (c * 7 + (N - 1) / 2) / (N - 1 > 0 ? N - 1 : 1); HOMEW[c] = HOMEW8[src < 8 ? src : 7]; }
}
EXPORT(setup) void setup(int n) {
  if (n < 4) n = 4; if (n > 8) n = 8;
  N = n; VALID = 0;
  for (int r = 0; r < 8; r++) { ROW[r] = 0; for (int c = 0; c < 8; c++) if (r < N && c < N) ROW[r] |= 1ULL << (r * 8 + c); VALID |= ROW[r]; }
  u64 fa = 0, fh = 0; for (int r = 0; r < N; r++) { fa |= 1ULL << (r * 8); fh |= 1ULL << (r * 8 + N - 1); }
  NOT_A = VALID & ~fa; NOT_H = VALID & ~fh;
  GOAL[0] = ROW[0]; GOAL[1] = ROW[N - 1]; PRE[0] = ROW[1]; PRE[1] = ROW[N - 2]; HOME[0] = ROW[N - 1]; HOME[1] = ROW[0];
  for (int s = 0; s < 2; s++) for (int q = 0; q < 64; q++) {
    CONE[s][q] = 0; int r = q / 8, c = q % 8; if (r >= N || c >= N) continue;
    for (int k = 1; k < N; k++) { int rr = s == 0 ? r - k : r + k; if (rr < 0 || rr >= N) break; for (int cc = c - k; cc <= c + k; cc++) if (cc >= 0 && cc < N) CONE[s][q] |= 1ULL << (rr * 8 + cc); }
  }
  u64 seed = 0x5bd1e995ULL * (u64)(n + 3);
  for (int s = 0; s < 2; s++) for (int q = 0; q < 64; q++) ZK[s][q] = sm(&seed);
  ZSIDE = sm(&seed);
  setTables();
}
// ---- moves of side s: forward (empty), diagonal (empty or capture)
static inline u64 fwd(u64 x, int s) { return s == 0 ? x >> 8 : x << 8; }
static inline u64 dlf(u64 x, int s) { return s == 0 ? (x & NOT_A) >> 9 : (x & NOT_A) << 7; }   // toward file a
static inline u64 drt(u64 x, int s) { return s == 0 ? (x & NOT_H) >> 7 : (x & NOT_H) << 9; }   // toward file h
static inline int offF(int s) { return s == 0 ? -8 : 8; }
static inline int offL(int s) { return s == 0 ? -9 : 7; }
static inline int offR(int s) { return s == 0 ? -7 : 9; }
// the squares side s attacks (could capture on)
static inline u64 attacks(u64 x, int s) { return (dlf(x, s) | drt(x, s)) & VALID; }
#define MV(f, t, cap) ((f) | ((t) << 6) | ((cap) << 12))
#define MF(m) ((m) & 63)
#define MT(m) (((m) >> 6) & 63)
#define MC(m) (((m) >> 12) & 1)
static int genMoves(const P *p, int *out, int capsOnly) {
  int s = p->side, n = 0; u64 me = p->b[s], op = p->b[s ^ 1], emp = VALID & ~(me | op);
  u64 t;
  t = dlf(me, s) & op; while (t) { int q = lsb(t); t &= t - 1; out[n++] = MV(q - offL(s), q, 1); }
  t = drt(me, s) & op; while (t) { int q = lsb(t); t &= t - 1; out[n++] = MV(q - offR(s), q, 1); }
  if (capsOnly) return n;
  t = fwd(me, s) & emp; while (t) { int q = lsb(t); t &= t - 1; out[n++] = MV(q - offF(s), q, 0); }
  t = dlf(me, s) & emp; while (t) { int q = lsb(t); t &= t - 1; out[n++] = MV(q - offL(s), q, 0); }
  t = drt(me, s) & emp; while (t) { int q = lsb(t); t &= t - 1; out[n++] = MV(q - offR(s), q, 0); }
  return n;
}
static inline void play(P *q, const P *p, int m) {
  int s = p->side, f = MF(m), t = MT(m);
  *q = *p;
  q->b[s] ^= (1ULL << f) | (1ULL << t); q->h ^= ZK[s][f] ^ ZK[s][t];
  if (MC(m)) { q->b[s ^ 1] ^= 1ULL << t; q->h ^= ZK[s ^ 1][t]; }
  q->side = s ^ 1; q->h ^= ZSIDE;
}
// rows a piece of side s on q still has to go (1 = one step from the goal)
static inline int distOf(int q, int s) { int r = q >> 3; return s == 0 ? r : N - 1 - r; }

// ---- evaluation (side to move's view)
static int evalSide(const P *p, int s) {
  u64 me = p->b[s], op = p->b[s ^ 1];
  int v = 0;
  u64 x = me;
  while (x) {
    int q = lsb(x); x &= x - 1;
    int d = distOf(q, s), a = N - 1 - d, c = q & 7;
    v += W_PIECE + ADV[a];
    if (a == 0) v += HOMEW[c];
    // a column (a friend right behind) and a phalanx (a friend beside)
    u64 behind = s == 0 ? (1ULL << q) << 8 : (1ULL << q) >> 8;
    if (behind & me) v += W_COL;
    if (c + 1 < N && (me >> (q + 1) & 1)) v += W_PHAL;
    // supported: a friend diagonally behind (it recaptures)
    u64 sup = attacks(1ULL << q, s ^ 1) & me;   // (the squares diagonally behind q from s's view are where s's pieces attack q from)
    if (sup) v += W_SUPP;
  }
  (void)op;
  return v;
}
// pieces of side s that the other side can take and s cannot take back
static int hanging(const P *p, int s, int *best) {
  u64 me = p->b[s], op = p->b[s ^ 1];
  u64 att = attacks(op, s ^ 1) & me;     // s's pieces under attack
  int n = 0, b = 0;
  while (att) {
    int q = lsb(att); att &= att - 1;
    u64 bit = 1ULL << q;
    int attackers = popc(attacks(bit, s) & op);          // enemy pieces diagonally in front of q (they capture onto q)
    int defenders = popc(attacks(bit, s ^ 1) & me);      // own pieces diagonally behind q (they recapture)
    if (attackers > defenders) { n++; int val = W_PIECE + ADV[N - 1 - distOf(q, s)]; if (val > b) b = val; }
  }
  *best = b; return n;
}
static int evaluate(const P *p) {
  int s = p->side;
  int v = evalSide(p, s) - evalSide(p, s ^ 1);
  int hb, ho;
  hanging(p, s ^ 1, &hb);       // the opponent's pieces we can take for free
  hanging(p, s, &ho);           // ours (we move first, so they count less)
  v += hb * W_HANG / 100 - ho * W_HANG_OPP / 100;
  // danger: enemy pieces two steps from our home rank that we do not attack
  u64 two = s == 0 ? ROW[N - 3] : ROW[2];
  u64 dz = p->b[s ^ 1] & two & ~attacks(p->b[s], s);
  u64 mz = p->b[s] & (s == 0 ? ROW[2] : ROW[N - 3]) & ~attacks(p->b[s ^ 1], s ^ 1);
  v += popc(mz) * W_DANGER / 2 - popc(dz) * W_DANGER;
  return v + W_TEMPO;
}
// the race rule: the nearest unstoppable piece of each side (no enemy piece in its cone), or 99
static int runner(const P *p, int s) {
  u64 me = p->b[s], op = p->b[s ^ 1]; int best = 99;
  while (me) { int q = lsb(me); me &= me - 1; if (!(CONE[s][q] & op)) { int d = distOf(q, s); if (d < best) best = d; } }
  return best;
}
static int minDist(const P *p, int s) {
  u64 me = p->b[s]; int best = 99;
  while (me) { int q = lsb(me); me &= me - 1; int d = distOf(q, s); if (d < best) best = d; }
  return best;
}

// ---- transposition table
typedef struct { u64 k; short v; unsigned char d, f; unsigned short m; unsigned char gen, pad; } TE;
#define TT_BITS 20
static TE TT[1 << TT_BITS];
static unsigned char ttGen = 1;
EXPORT(ttclear) void ttclear(void) { memset(TT, 0, sizeof(TT)); ttGen = 1; }
static inline int vToTT(int v, int ply) { return v > WINT ? v + ply : v < -WINT ? v - ply : v; }
static inline int vFromTT(int v, int ply) { return v > WINT ? v - ply : v < -WINT ? v + ply : v; }
static TE *ttProbe(u64 k) { TE *e = &TT[k & ((1 << TT_BITS) - 1)]; return e->k == k ? e : 0; }
static void ttStore(u64 k, int d, int v, int f, int m, int ply) {
  TE *e = &TT[k & ((1 << TT_BITS) - 1)];
  if (e->k != k && e->gen == ttGen && e->d > d + 2) return;    // keep a deeper entry of this search
  if (e->k == k && e->d > d && f != 1) { if (m) e->m = (unsigned short)m; return; }
  if (m || e->k != k) e->m = (unsigned short)m;
  e->k = k; e->d = (unsigned char)(d < 0 ? 0 : d); e->v = (short)vToTT(v, ply); e->f = (unsigned char)f; e->gen = ttGen;
}
// flags: 1 exact, 2 lower bound, 3 upper bound

static int killers[MAXPLY][2];
static int hist[2][64][64];
EXPORT(kclear) void kclear(void) { memset(killers, 0, sizeof(killers)); memset(hist, 0, sizeof(hist)); }

static inline void poll(void) { if (((unsigned long long)nodes & 1023) == 0) { if (now() > tEnd || nodes > nodeLimit) stopF = 1; } }

// scores for ordering
static void orderMoves(const P *p, int *mv, int n, int ttm, int ply) {
  int sc[MAXMV]; int s = p->side;
  for (int i = 0; i < n; i++) {
    int m = mv[i], t = MT(m), x;
    if (m == ttm) x = 1 << 30;
    else if (MC(m)) x = (1 << 28) + (N - distOf(t, s ^ 1)) * 64 + (64 - distOf(t, s));   // take the most advanced enemy first
    else if (m == killers[ply][0]) x = (1 << 27);
    else if (m == killers[ply][1]) x = (1 << 26);
    else x = hist[s][MF(m)][t];
    // stepping onto a square the enemy attacks (unsupported) goes late
    if (!MC(m) && m != ttm) { u64 tb = 1ULL << t; if (attacks(p->b[s ^ 1], s ^ 1) & tb) x -= 1 << 20; }
    sc[i] = x;
  }
  for (int i = 1; i < n; i++) { int m = mv[i], x = sc[i], j = i - 1; while (j >= 0 && sc[j] < x) { mv[j + 1] = mv[j]; sc[j + 1] = sc[j]; j--; } mv[j + 1] = m; sc[j + 1] = x; }
}
// the forcing rules at a node: returns 1 and sets *v when the node is decided, else 0; *must = the one enemy piece on the
// pre-home rank that has to be captured now (-1 none)
static int forcing(const P *p, int ply, int *v, int *must) {
  int s = p->side;
  *must = -1;
  if (!p->b[s]) { *v = -(WIN - ply); return 1; }
  if (!p->b[s ^ 1]) { *v = WIN - ply; return 1; }
  if (p->b[s] & PRE[s]) { *v = WIN - (ply + 1); return 1; }          // step onto the goal now
  u64 th = p->b[s ^ 1] & PRE[s ^ 1];
  if (th) {
    if (th & (th - 1)) { *v = -(WIN - (ply + 2)); return 1; }        // two pieces one step from our home rank
    int q = lsb(th);
    if (!(attacks(p->b[s], s) & th)) { *v = -(WIN - (ply + 2)); return 1; }   // it cannot be taken
    *must = q;
  }
  // the race: an unstoppable piece that arrives first
  int rs = runner(p, s);
  if (rs < 99 && rs <= minDist(p, s ^ 1) && *must < 0) { *v = WIN - (ply + 2 * rs - 1); return 1; }
  int ro = runner(p, s ^ 1);
  if (ro < 99 && ro < minDist(p, s)) { *v = -(WIN - (ply + 2 * ro)); return 1; }
  return 0;
}
static int qsearch(const P *p, int a, int b, int ply, int qd) {
  nodes++; poll(); if (stopF) return 0;
  int v, must;
  if (forcing(p, ply, &v, &must)) return v;
  int mv[MAXMV], n;
  if (must >= 0) {
    n = genMoves(p, mv, 1); int k = 0; for (int i = 0; i < n; i++) if (MT(mv[i]) == must) mv[k++] = mv[i]; n = k;
    if (!n) return -(WIN - (ply + 2));
  } else {
    int sp = evaluate(p);
    if (sp >= b || qd >= 10 || ply >= MAXPLY - 2) return sp;
    if (sp > a) a = sp;
    n = genMoves(p, mv, 1);
  }
  orderMoves(p, mv, n, 0, ply);
  int best = must >= 0 ? -WIN : a;
  for (int i = 0; i < n; i++) {
    P q; play(&q, p, mv[i]);
    int x = -qsearch(&q, -b, -(best > a ? best : a), ply + 1, qd + 1);
    if (stopF) return 0;
    if (x > best) { best = x; if (x >= b) return x; }
  }
  return best;
}
static int search(const P *p, int d, int a, int b, int ply, int isPv) {
  if (ply >= MAXPLY - 2) return evaluate(p);
  int v, must;
  if (forcing(p, ply, &v, &must)) { nodes++; return v; }
  if (d <= 0) return qsearch(p, a, b, ply, 0);
  nodes++; poll(); if (stopF) return 0;
  // mate-distance pruning
  if (WIN - (ply + 1) < b) { b = WIN - (ply + 1); if (a >= b) return b; }
  int a0 = a, ttm = 0;
  TE *e = ttProbe(p->h);
  if (e) {
    ttm = e->m;
    if (e->d >= d && !isPv) {
      int tv = vFromTT(e->v, ply);
      if (e->f == 1) return tv;
      if (e->f == 2 && tv >= b) return tv;
      if (e->f == 3 && tv <= a) return tv;
    }
  }
  int mv[MAXMV], n = genMoves(p, mv, 0);
  if (must >= 0) { int k = 0; for (int i = 0; i < n; i++) if (MC(mv[i]) && MT(mv[i]) == must) mv[k++] = mv[i]; n = k; if (!n) return -(WIN - (ply + 2)); }
  orderMoves(p, mv, n, ttm, ply);
  int ext = (must >= 0 || n == 1) && ply < rootDepth * 2 + 8 ? 1 : 0;   // a forced reply is not a ply of depth
  int best = -WIN, bm = 0, s = p->side;
  for (int i = 0; i < n; i++) {
    int m = mv[i]; P q; play(&q, p, m);
    // a move onto the pre-goal rank is a threat (like a check): one ply more, when not already extended
    int e2 = ext || ((1ULL << MT(m)) & PRE[s] && ply < rootDepth * 2 + 6) ? 1 : 0;
    int nd = d - 1 + e2, x;
    if (i == 0) x = -search(&q, nd, -b, -a, ply + 1, isPv);
    else {
      int red = 0;
      if (d >= 3 && i >= 3 && !MC(m) && !e2 && m != killers[ply][0] && m != killers[ply][1]) red = i >= 8 ? 2 : 1;
      x = -search(&q, nd - red, -a - 1, -a, ply + 1, 0);
      if (!stopF && x > a && red) x = -search(&q, nd, -a - 1, -a, ply + 1, 0);
      if (!stopF && x > a && x < b) x = -search(&q, nd, -b, -a, ply + 1, isPv);
    }
    if (stopF) return 0;
    if (x > best) {
      best = x; bm = m;
      if (x > a) {
        a = x;
        if (a >= b) {
          if (!MC(m)) { if (killers[ply][0] != m) { killers[ply][1] = killers[ply][0]; killers[ply][0] = m; } int *h = &hist[s][MF(m)][MT(m)]; *h += d * d; if (*h > 1 << 18) for (int f = 0; f < 64; f++) for (int t = 0; t < 64; t++) hist[s][f][t] >>= 1; }
          break;
        }
      }
    }
  }
  ttStore(p->h, d, best, best >= b ? 2 : best > a0 ? 1 : 3, bm, ply);
  return best;
}

// ---- the root
static P ROOT;
static void loadRoot(void) {
  P *p = &ROOT; p->b[0] = p->b[1] = 0; p->h = 0; p->side = IO[0] & 1;
  for (int r = 0; r < N; r++) for (int c = 0; c < N; c++) { int v = SQ[r * N + c]; if (v == 1 || v == 2) { int q = r * 8 + c; p->b[v - 1] |= 1ULL << q; p->h ^= ZK[v - 1][q]; } }
  if (p->side) p->h ^= ZSIDE;
}
// the page's move (r * N + c squares) ↔ the core's
static int toPage(int m) { int f = MF(m), t = MT(m); return ((f >> 3) * N + (f & 7)) + 128 * ((t >> 3) * N + (t & 7)); }
EXPORT(sqp) unsigned char *sqp(void) { return SQ; }
EXPORT(iop) int *iop(void) { return IO; }
EXPORT(rvmp) int *rvmp(void) { return RVM; }
EXPORT(rvvp) int *rvvp(void) { return RVV; }
EXPORT(pvp) int *pvp(void) { return PVB; }
EXPORT(getn) double getn(void) { return nodes; }
EXPORT(stopped) int stopped(void) { return stopF; }
static void begin(double ms, double nk) { nodes = 0; stopF = 0; tEnd = ms > 0 ? now() + ms : 1e300; nodeLimit = nk > 0 ? nk : 1e300; ttGen++; if (!ttGen) ttGen = 1; }
// root move list in a good order (the forcing rules applied)
static int rootMoves(const P *p, int *mv) {
  int n = genMoves(p, mv, 0), v, must;
  forcing(p, 0, &v, &must);
  if (must >= 0) { int k = 0; for (int i = 0; i < n; i++) if (MC(mv[i]) && MT(mv[i]) == must) mv[k++] = mv[i]; if (k) n = k; }
  return n;
}
static int moveValue(const P *p, int m, int d, int a, int b) {
  P q; play(&q, p, m);
  if ((1ULL << MT(m)) & GOAL[p->side]) return WIN - 1;
  if (!q.b[q.side]) return WIN - 1;
  return -search(&q, d - 1, -b, -a, 1, 1);
}
// best move by iterative deepening (aspiration windows); IO out: [1] move (page) [2] value [3] depth
EXPORT(ab_best) int ab_best(int maxD, double ms, double nk) {
  loadRoot(); begin(ms, nk); double t0 = now();
  P *p = &ROOT; int mv[MAXMV], n = rootMoves(p, mv);
  if (!n) { IO[1] = -1; IO[2] = -WIN; IO[3] = 0; return -1; }
  int bestM = mv[0], bestV = -WIN, depth = 0;
  for (int i = 0; i < n; i++) if ((1ULL << MT(mv[i])) & GOAL[p->side]) { IO[1] = toPage(mv[i]); IO[2] = WIN - 1; IO[3] = 1; return IO[1]; }
  int prevV = 0;
  for (int d = 1; d <= maxD && d < MAXPLY - 10; d++) {
    rootDepth = d;
    TE *e = ttProbe(p->h); int ttm = e ? e->m : 0;
    orderMoves(p, mv, n, ttm ? ttm : bestM, 0);
    // move the previous best first
    for (int i = 0; i < n; i++) if (mv[i] == bestM) { for (int j = i; j > 0; j--) mv[j] = mv[j - 1]; mv[0] = bestM; break; }
    int win = d >= 4 && prevV > -WINT && prevV < WINT ? 40 : WIN, lo = win == WIN ? -WIN : prevV - win, hi = win == WIN ? WIN : prevV + win;
    int dBest = 0, dV = -WIN;
    for (;;) {
      int a = lo, bm = 0, bv = -WIN;
      for (int i = 0; i < n; i++) {
        int x;
        if (i == 0) x = moveValue(p, mv[i], d, a, hi);
        else { x = moveValue(p, mv[i], d, a, a + 1); if (!stopF && x > a && x < hi) x = moveValue(p, mv[i], d, a, hi); }
        if (stopF) break;
        if (x > bv) { bv = x; bm = mv[i]; if (x > a) { a = x; for (int j = i; j > 0; j--) mv[j] = mv[j - 1]; mv[0] = bm; } if (a >= hi) break; }
      }
      if (stopF) break;
      if (bv <= lo && lo > -WIN) { lo = -WIN; continue; }
      if (bv >= hi && hi < WIN) { hi = WIN; continue; }
      dBest = bm; dV = bv; break;
    }
    if (stopF) { if (dBest) { bestM = dBest; bestV = dV; depth = d; } break; }
    bestM = dBest; bestV = dV; depth = d; prevV = dV;
    ttStore(p->h, d, dV, 1, dBest, 0);
    if (dV > WINT || dV < -WINT) { if (d >= (WIN - (dV > 0 ? dV : -dV)) + 2) break; }   // a proven result, read deep enough
    if (ms > 0 && d >= 2 && now() - t0 > ms * 0.45) break;   // the next depth would most likely not finish
    if (nk > 0 && d >= 2 && nodes > nk * 0.45) break;        // (the same for a node budget, 2026-11-28)
  }
  IO[1] = toPage(bestM); IO[2] = bestV; IO[3] = depth;
  return IO[1];
}
// every root move's value at depth d (analysis / hints / weak levels): the best one exact, the others exact while
// within `margin` of it, else an upper bound. Fills RVM / RVV (page moves), returns their count.
EXPORT(ab_values) int ab_values(int d, double ms, int margin) {
  loadRoot(); begin(ms, 0);
  P *p = &ROOT; int mv[MAXMV], n = genMoves(p, mv, 0), v, must;
  rootDepth = d;
  forcing(p, 0, &v, &must);
  TE *e = ttProbe(p->h); orderMoves(p, mv, n, e ? e->m : 0, 0);
  int vals[MAXMV], best = -WIN;
  for (int i = 0; i < n; i++) {
    int m = mv[i], x;
    if (must >= 0 && !(MC(m) && MT(m) == must)) { x = -(WIN - 2); }      // leaves the threat on the board: lost
    else if (i == 0 || best <= -WINT) x = moveValue(p, m, d, -WIN, WIN);
    else {
      int lo = best - margin; x = moveValue(p, m, d, lo, lo + 1);
      if (!stopF && x > lo) x = moveValue(p, m, d, lo, WIN);
    }
    if (stopF) return -1;
    vals[i] = x; if (x > best) best = x;
  }
  for (int i = 0; i < n; i++) { RVM[i] = toPage(mv[i]); RVV[i] = vals[i]; }
  RVN = n; return n;
}
// the static evaluation and some of its parts for the page (coach): IO[1] value (side to move), [2] runner P1, [3] runner P2,
// [4] min distance P1, [5] min distance P2, [6] hanging P1, [7] hanging P2
EXPORT(ab_eval) int ab_eval(void) {
  loadRoot(); P *p = &ROOT; int hb;
  IO[1] = evaluate(p); IO[2] = runner(p, 0); IO[3] = runner(p, 1); IO[4] = minDist(p, 0); IO[5] = minDist(p, 1);
  IO[6] = hanging(p, 0, &hb); IO[7] = hanging(p, 1, &hb);
  return IO[1];
}

// ---- exact solving for the puzzles: can the side to move force a win within k of its own moves?
// (the forcing rules make it fast: a threat must be answered by taking it)
static int winIn(const P *p, int k, int ply);
static int lossAfter(const P *p, int k, int ply) {   // the side to move (the defender) cannot avoid losing within k attacker moves
  nodes++;
  int s = p->side;
  if (!p->b[s]) return 1;
  if (p->b[s] & PRE[s]) return 0;                    // the defender wins at once
  int mv[MAXMV], n = genMoves(p, mv, 0);
  u64 th = p->b[s ^ 1] & PRE[s ^ 1];
  if (th & (th - 1)) return 1;
  for (int i = 0; i < n; i++) {
    int m = mv[i];
    if (th && !(MC(m) && (1ULL << MT(m)) == th)) continue;   // must take the threat
    P q; play(&q, p, m);
    if (!q.b[q.side]) return 0;
    if (!winIn(&q, k, ply + 1)) return 0;
  }
  return 1;                                          // every defence loses (or none was legal)
}
static int winIn(const P *p, int k, int ply) {
  nodes++;
  if (k <= 0) return 0;
  int s = p->side;
  if (!p->b[s]) return 0;
  if (p->b[s] & PRE[s]) return 1;
  if (!p->b[s ^ 1]) return 1;
  u64 th = p->b[s ^ 1] & PRE[s ^ 1];
  if (th & (th - 1)) return 0;
  if (k == 1) {
    // only a capture of the last enemy piece wins in one
    if (popc(p->b[s ^ 1]) != 1) return 0;
    return (attacks(p->b[s], s) & p->b[s ^ 1]) ? 1 : 0;
  }
  // the race rule gives an exact distance: a runner that arrives within k and before anything of the enemy
  int rs = runner(p, s);
  if (!th && rs < 99 && rs <= minDist(p, s ^ 1) && rs <= k) return 1;
  int mv[MAXMV], n = genMoves(p, mv, 0);
  for (int i = 0; i < n; i++) {
    int m = mv[i];
    if (th && !(MC(m) && (1ULL << MT(m)) == th)) continue;
    P q; play(&q, p, m);
    if (!q.b[q.side]) return 1;
    if (lossAfter(&q, k - 1, ply + 1)) return 1;
  }
  return 0;
}
// the moves of the side to move that force a win within k of its moves → RVM (page moves); count
EXPORT(duel_good) int duel_good(int k) {
  loadRoot(); nodes = 0; P *p = &ROOT; int mv[MAXMV], n = genMoves(p, mv, 0), c = 0, s = p->side;
  u64 th = p->b[s ^ 1] & PRE[s ^ 1];
  for (int i = 0; i < n; i++) {
    int m = mv[i], ok; P q; play(&q, p, m);
    if ((1ULL << MT(m)) & GOAL[s]) ok = 1;
    else if (!q.b[q.side]) ok = 1;
    else if (th && (th & (th - 1))) ok = 0;
    else if (th && !(MC(m) && (1ULL << MT(m)) == th)) ok = 0;
    else ok = k >= 2 ? lossAfter(&q, k - 1, 1) : 0;
    if (ok) RVM[c++] = toPage(m);
  }
  RVN = c; return c;
}
// the smallest k (1..maxK) within which the side to move forces a win, or 0
EXPORT(duel_min) int duel_min(int maxK) {
  for (int k = 1; k <= maxK; k++) if (duel_good(k)) return k;
  return 0;
}
// the defender's replies (side to move = defender) and for each the smallest number of attacker moves that still win (0 = the
// attacker no longer wins within maxK): RVM moves, RVV that number
EXPORT(duel_replies) int duel_replies(int maxK) {
  loadRoot(); nodes = 0; P *p = &ROOT; int mv[MAXMV], n = genMoves(p, mv, 0), s = p->side;
  for (int i = 0; i < n; i++) {
    int m = mv[i]; P q; play(&q, p, m); int need = 0;
    if ((1ULL << MT(m)) & GOAL[s]) need = 0;
    else if (!q.b[q.side]) need = 0;
    else { for (int k = 1; k <= maxK; k++) if (winIn(&q, k, 1)) { need = k; break; } }
    RVM[i] = toPage(m); RVV[i] = need;
  }
  RVN = n; return n;
}
EXPORT(win_in) int win_in(int k) { loadRoot(); nodes = 0; return winIn(&ROOT, k, 0); }
EXPORT(loss_after) int loss_after(int k) { loadRoot(); nodes = 0; return lossAfter(&ROOT, k, 0); }
EXPORT(set_w) void set_w(int i, int v) {   // the evaluation's weights (tools: tuning)
  if (i < 8) ADV8[i] = v; else if (i < 16) HOMEW8[i - 8] = v;
  else switch (i) { case 16: W_COL = v; break; case 17: W_PHAL = v; break; case 18: W_HANG = v; break; case 19: W_HANG_OPP = v; break; case 20: W_DANGER = v; break; case 21: W_TEMPO = v; break; case 22: W_SUPP = v; break; case 23: W_PIECE = v; break; }
  setTables();
}
