// Hex engine — MCTS (UCT + RAVE) with bridge-aware playouts, a small proof-number style solver for forced connections,
// and the puzzle / must-play search used by the page. Compiled to WebAssembly (clang --target=wasm32, see tools/build.sh)
// and natively for the tools (tools/native.c includes this file with -DNATIVE).
//
// Board: N × N rhombus (N = 3 … 13), cell = r * N + c (row r from the top, column c from the left).
// Red (1) moves first and connects the TOP and BOTTOM edges; Blue (2) connects LEFT and RIGHT.
// Neighbours of (r, c): (r-1, c) (r-1, c+1) (r, c+1) (r+1, c) (r+1, c-1) (r, c-1) — in this ring order consecutive
// neighbours touch each other, which is what the bridge patterns use.
// Swap rule (swap pieces): instead of the second move, Blue may take over Red's first stone; it is mirrored to (c, r)
// and becomes Blue, then Red moves again. Move number SWAP (1023) = that swap.
//
// IO (int32 array shared with JS):
//   setup:   IO = [N, swapRule, nMoves, m0, m1, ...]  → 1 = legal record
//   think:   best(playouts, ms, tempX1000, seed, mustplay) → IO = [move, v, playouts, n]
//   analyze: analyze(ms, maxPlayouts, maxList) → IO = [n, playouts, (move, v, visits) * n]   (v: -1000..1000 winrate for the
//            side to move, or ±(WIN - plies) for a proven result; sorted by visits)
//   puzzle:  puzzle(n, defend, budgetK) → IO = [n, (move, need) * n]
// MT (engine_mt.wasm, tools/build.sh): several threads grow ONE search tree together on a shared memory (tree-parallel MCTS
// with virtual loss: a visit counts as a loss from the moment a thread goes down a branch, so the others try elsewhere; the
// node pool is taken with an atomic counter and a node is expanded by one thread only). The state of one descent / playout
// and of the solver is thread-local (TLS); the tree, the root position and the geometry are shared. Without MT, TLS is nothing
// and the normal build (engine.wasm) stays byte for byte as before.
#ifdef MT
#define TLS _Thread_local
#else
#define TLS
#endif
#ifndef NATIVE
#define EXPORT(n) __attribute__((export_name(#n)))
#define IMPORT(name) __attribute__((import_module("env"), import_name(#name)))
IMPORT(now) double now(void);
IMPORT(progress) void progress(int playouts);
void *memset(void *d, int c, unsigned long n) { unsigned char *p = (unsigned char *)d; while (n--) *p++ = (unsigned char)c; return d; }
void *memcpy(void *d, const void *s, unsigned long n) { unsigned char *p = (unsigned char *)d; const unsigned char *q = (const unsigned char *)s; while (n--) *p++ = *q++; return d; }
#else
#define EXPORT(n)
#endif
typedef unsigned long long u64;
typedef unsigned int u32;
typedef unsigned short u16;
typedef signed char i8;
typedef unsigned char u8;

#define MAXN 13
#define MAXC (MAXN * MAXN)
#define RED 1
#define BLUE 2
#define SWAP 1023
#define WIN 30000
#define WINT 29000

static int N = 11, NC = 121;
static TLS int IO[8192];
EXPORT(io_ptr) int *io_ptr(void) { return IO; }

// ---------------------------------------------------------------- geometry
static int NBR[MAXC][6];      // neighbour cell or -1 (off board, RED edge side), -2 (off board, BLUE edge side), -3 (corner)
static int NBN[MAXC][6], NBC[MAXC];   // on-board neighbours only
static int geoN = 0;
static void geometry(int n) {
  if (geoN == n) return;
  geoN = n; N = n; NC = n * n;
  static const int DR[6] = { -1, -1, 0, 1, 1, 0 }, DC[6] = { 0, 1, 1, 0, -1, -1 };
  for (int c = 0; c < NC; c++) {
    int r0 = c / N, c0 = c % N; NBC[c] = 0;
    for (int d = 0; d < 6; d++) {
      int r = r0 + DR[d], cc = c0 + DC[d];
      int inR = r >= 0 && r < N, inC = cc >= 0 && cc < N;
      if (inR && inC) { NBR[c][d] = r * N + cc; NBN[c][NBC[c]++] = r * N + cc; }
      else if (!inR && inC) NBR[c][d] = -1;
      else if (inR && !inC) NBR[c][d] = -2;
      else NBR[c][d] = -3;
    }
  }
}
// does cell c touch edge e of player p? (p RED: 0 top, 1 bottom; BLUE: 0 left, 1 right)
static inline int onEdge(int c, int p, int e) {
  if (p == RED) return e ? c / N == N - 1 : c / N == 0;
  return e ? c % N == N - 1 : c % N == 0;
}

// ---------------------------------------------------------------- random
static TLS u64 rs = 0x9E3779B97F4A7C15ULL;
static inline u32 rnd(void) { rs ^= rs << 13; rs ^= rs >> 7; rs ^= rs << 17; return (u32)(rs >> 16); }
static inline int rndN(int n) { return (int)(((u64)rnd() * (u32)n) >> 32); }
static inline float rndF(void) { return (rnd() & 0xFFFFFF) / 16777216.0f; }
// small libm-free helpers (the wasm build has no libc)
static float flog(float x) {   // natural log, ~1e-4 relative
  union { float f; u32 i; } u = { x }; int e = (int)((u.i >> 23) & 255) - 127; u.i = (u.i & 0x7FFFFF) | 0x3F800000;
  float m = u.f, t = (m - 1) / (m + 1), t2 = t * t;
  return e * 0.69314718f + 2 * t * (1 + t2 * (1.f / 3 + t2 * (1.f / 5 + t2 * (1.f / 7 + t2 / 9))));
}
static float fexp(float x) {
  if (x < -80) return 0; if (x > 80) x = 80;
  int k = (int)(x / 0.69314718f + (x >= 0 ? .5f : -.5f)); float r = x - k * 0.69314718f;
  float p = 1 + r * (1 + r * (.5f + r * (1.f / 6 + r * (1.f / 24 + r * (1.f / 120 + r / 720)))));
  union { float f; u32 i; } u; u.i = (u32)(k + 127) << 23; if (k < -126) return 0; return p * u.f;
}
static float fpow(float x, float y) { return x <= 0 ? 0 : fexp(y * flog(x)); }

// ---------------------------------------------------------------- position
typedef struct { u8 b[MAXC]; u8 side; short ply; u8 swapOk; short last; } Pos;
static Pos ROOT;
static int swapRule = 1;

static void posInit(Pos *p) { for (int i = 0; i < MAXC; i++) p->b[i] = 0; p->side = RED; p->ply = 0; p->swapOk = 0; p->last = -1; }
static int legal(const Pos *p, int m) {
  if (m == SWAP) return p->swapOk;
  return m >= 0 && m < NC && !p->b[m];
}
static void play(Pos *p, int m) {
  if (m == SWAP) {
    int f = -1; for (int i = 0; i < NC; i++) if (p->b[i]) { f = i; break; }
    int r = f / N, c = f % N, g = c * N + r;
    p->b[f] = 0; p->b[g] = BLUE; p->side = RED; p->ply++; p->swapOk = 0; p->last = g;
    return;
  }
  p->b[m] = p->side; p->side ^= 3; p->ply++;
  p->swapOk = (swapRule && p->ply == 1) ? 1 : 0;
  p->last = m;
}
// winner of a position: 0 none, 1 red, 2 blue (flood fill)
static TLS int stk[MAXC + 8];
static TLS u8 seen[MAXC];
static int connected(const u8 *b, int p) {
  int sp = 0;
  for (int i = 0; i < NC; i++) seen[i] = 0;
  for (int k = 0; k < N; k++) { int c = p == RED ? k : k * N; if (b[c] == p) { seen[c] = 1; stk[sp++] = c; } }
  while (sp) {
    int c = stk[--sp];
    if (onEdge(c, p, 1)) return 1;
    for (int k = 0; k < NBC[c]; k++) { int d = NBN[c][k]; if (!seen[d] && b[d] == p) { seen[d] = 1; stk[sp++] = d; } }
  }
  return 0;
}
static int winner(const u8 *b) { if (connected(b, RED)) return RED; if (connected(b, BLUE)) return BLUE; return 0; }

EXPORT(setup) int setup(void) {
  int n = IO[0]; if (n < 3 || n > MAXN) return 0;
  geometry(n); swapRule = IO[1] ? 1 : 0;
  posInit(&ROOT);
  int k = IO[2];
  for (int i = 0; i < k; i++) {
    int m = IO[3 + i];
    if (!legal(&ROOT, m) || winner(ROOT.b)) return 0;
    play(&ROOT, m);
  }
  return 1;
}
// set an arbitrary position: IO = [N, side, cells...(0/1/2) NC values]
EXPORT(setpos) int setpos(void) {
  int n = IO[0]; if (n < 3 || n > MAXN) return 0;
  geometry(n); posInit(&ROOT); ROOT.side = IO[1] == BLUE ? BLUE : RED;
  int cnt = 0;
  for (int i = 0; i < NC; i++) { int v = IO[2 + i]; ROOT.b[i] = (v == 1 || v == 2) ? v : 0; if (ROOT.b[i]) cnt++; }
  ROOT.ply = cnt; ROOT.swapOk = (IO[2 + NC] == 1 && cnt == 1 && ROOT.side == BLUE) ? 1 : 0; ROOT.last = -1;
  return 1;
}

// ---------------------------------------------------------------- groups: which empty cells win at once for player p
// lab[c] = group id for p's stones; gE[g] = edges touched (bit 0 / 1)
static TLS short lab[MAXC]; static TLS u8 gE[MAXC];
static void groups(const u8 *b, int p) {
  int ng = 0;
  for (int i = 0; i < NC; i++) lab[i] = -1;
  for (int i = 0; i < NC; i++) {
    if (b[i] != p || lab[i] >= 0) continue;
    int sp = 0, e = 0; stk[sp++] = i; lab[i] = ng;
    while (sp) {
      int c = stk[--sp];
      if (onEdge(c, p, 0)) e |= 1;
      if (onEdge(c, p, 1)) e |= 2;
      for (int k = 0; k < NBC[c]; k++) { int d = NBN[c][k]; if (lab[d] < 0 && b[d] == p) { lab[d] = ng; stk[sp++] = d; } }
    }
    gE[ng++] = e;
  }
}
// edge bits a stone of p at empty cell c would join (after groups(b, p))
static inline int joinE(const u8 *b, int c, int p) {
  int e = (onEdge(c, p, 0) ? 1 : 0) | (onEdge(c, p, 1) ? 2 : 0);
  for (int k = 0; k < NBC[c]; k++) { int d = NBN[c][k]; if (b[d] == p) e |= gE[lab[d]]; }
  return e;
}
// the empty cells where p connects at once; returns their count (up to max listed in out)
static int winCells(const u8 *b, int p, int *out, int max) {
  groups(b, p);
  int n = 0;
  for (int c = 0; c < NC; c++) if (!b[c] && joinE(b, c, p) == 3) { if (n < max) out[n] = c; n++; }
  return n;
}

// ---------------------------------------------------------------- playouts
// fill the board at random; when the opponent's last stone intrudes into one of our bridges (two of our stones — or
// a stone and our edge — with exactly two common empty neighbours), answer in the other cell of that bridge.
static TLS u8 PB[MAXC];
static TLS short EL[MAXC], EP[MAXC];
static int edgeOwn(int v, int p) { return v == -1 ? p == RED : v == -2 ? p == BLUE : 0; }
static inline int ownAt(const u8 *b, int v, int p) { return v >= 0 ? b[v] == p : edgeOwn(v, p); }
static int saveBridge(const u8 *b, int last, int p) {
  if (last < 0) return -1;
  int cand[6], nc = 0;
  for (int i = 0; i < 6; i++) {
    int y = NBR[last][i]; if (y < 0 || b[y]) continue;
    int a = NBR[last][(i + 5) % 6], c = NBR[last][(i + 1) % 6];
    if (ownAt(b, a, p) && ownAt(b, c, p) && !(a < 0 && c < 0)) cand[nc++] = y;
  }
  return nc ? cand[nc == 1 ? 0 : rndN(nc)] : -1;
}
static int playout(int side, int last) {
  int m = 0;
  for (int i = 0; i < NC; i++) if (!PB[i]) { EP[i] = m; EL[m++] = i; }
  while (m) {
    int c = saveBridge(PB, last, side);
    if (c < 0) c = EL[rndN(m)];
    PB[c] = side;
    int k = EP[c]; m--; EL[k] = EL[m]; EP[EL[k]] = k;
    last = c; side ^= 3;
  }
  return connected(PB, RED) ? RED : BLUE;
}

// ---------------------------------------------------------------- learned move prior (features; weights in prior_w.h, tools/train_prior.c)
// The features of an empty cell c for the player p to move, seen from p (the board is mirrored for Blue so that p's edges are
// always the same pair): the ring of 6 neighbours (empty / own / opponent / own edge / opponent edge / corner, the two 180°
// rotations folded together), the 6 bridge triples (the two cells between c and the cell across, and that cell), relations to
// the last move, and the distances to p's and the opponent's edges. The prior of c = softmax of the summed weights.
#define PF_RING 46656
#define PF_TRI (PF_RING)
#define PF_LAST (PF_TRI + 216)
#define PF_EDGE (PF_LAST + 3)
#define PF_N (PF_EDGE + 36)
#define PF_MAX 12
static inline int pfSt(const u8 *b, int v, int p) {
  if (v >= 0) return b[v] == 0 ? 0 : b[v] == p ? 1 : 2;
  if (v == -3) return 5;
  return (v == -1) == (p == RED) ? 3 : 4;
}
static int pfeat(const u8 *b, int c, int p, int last, int *out) {
  int k = 0, s[6];
  for (int d = 0; d < 6; d++) s[d] = pfSt(b, NBR[c][p == RED ? d : 5 - d], p);
  int i1 = 0, i2 = 0;
  for (int d = 5; d >= 0; d--) { i1 = i1 * 6 + s[d]; i2 = i2 * 6 + s[(d + 3) % 6]; }
  out[k++] = i1 < i2 ? i1 : i2;
  for (int i = 0; i < 6; i++) {
    int a = NBR[c][i], d = NBR[c][(i + 1) % 6], x;
    if (a >= 0) x = NBR[a][(i + 1) % 6]; else if (d >= 0) x = NBR[d][i]; else continue;
    int sa = pfSt(b, a, p), sd = pfSt(b, d, p), sx = pfSt(b, x, p);
    int lo = sa < sd ? sa : sd, hi = sa < sd ? sd : sa;
    out[k++] = PF_TRI + (lo * 6 + hi) * 6 + sx;
  }
  if (last >= 0) {
    for (int i = 0; i < 6; i++) {
      if (NBR[last][i] == c) out[k++] = PF_LAST;
      int a = NBR[last][i], d = NBR[last][(i + 1) % 6];
      if (a >= 0 && d >= 0 && NBR[a][(i + 1) % 6] == c && !b[a] && !b[d]) out[k++] = PF_LAST + 1;
      // c and the last move are the two cells of a bridge of p: the opponent intruded, c saves it
      if (NBR[last][i] == c) { int e1 = NBR[last][(i + 5) % 6], e2 = NBR[last][(i + 1) % 6]; if (ownAt(b, e1, p) && ownAt(b, e2, p) && !(e1 < 0 && e2 < 0)) out[k++] = PF_LAST + 2; }
    }
  }
  int r = c / N, cc = c % N, dr = r < N - 1 - r ? r : N - 1 - r, dc = cc < N - 1 - cc ? cc : N - 1 - cc;
  int dOwn = p == RED ? dr : dc, dOpp = p == RED ? dc : dr; if (dOwn > 5) dOwn = 5; if (dOpp > 5) dOpp = 5;
  out[k++] = PF_EDGE + dOwn * 6 + dOpp;
  return k;
}
#ifdef PRIOR_W
#include PRIOR_W
#else
#include "prior_w.h"
#endif

// ---------------------------------------------------------------- MCTS (UCT + RAVE, MCTS-solver for immediate wins)
typedef struct { int first; u16 nch; short mv; float n, w, rn, rw; i8 proof; u8 exp; } Node;
// proof: +1 = the player who moved into this node wins from here, -1 = loses
#ifndef NODES
#define NODES 1200000
#endif
static Node T[NODES];
#ifdef MT
// the variables every thread writes (or reads while another writes) each on a cache line of its own: no false sharing with the
// read-only parameters next to them (2026-11-09, MODEL_CARD「スレッドが伸びない問題」)
typedef struct { volatile int v; int pad[15]; } __attribute__((aligned(64))) LineV;
typedef struct { int v; int pad[15]; } __attribute__((aligned(64))) LineI;
static LineI nNodes_;
#define nNodes nNodes_.v
#else
static int nNodes;
#endif
static float RAVE_B = 0.0009f, UCT_C = 0.0f, PRIOR_N = 30.0f, LP_A = .45f, LP_B = .5f;
static int LP_ON = 1;   // the learned prior (prior_w.h) instead of the hand-made one
static int EXPAND_T = 1, expT = 1;   // expT: the threshold in use (raised during a long search so the node pool lasts)
static TLS double tStop; static TLS int maxPO, totalPO;
static TLS int wc[MAXC];

#ifdef MT
static LineV gStop_;     // shared: the page stops every thread (mt_stop)
static LineV gTree_;     // shared: > 0 = the tree the helpers may join now (a new number for each search), 0 = closed
static LineV gActive_;   // shared: helpers inside the open tree
static LineV gHPO_;      // shared: the helpers' playouts in the open tree (added in batches of HPO_BATCH)
#define gStop gStop_.v
#define gTree gTree_.v
#define gActive gActive_.v
#define gHPO gHPO_.v
#define HPO_BATCH 32
static int gTreeGen;
static float VLOSS = 1;      // virtual loss (visits) per thread going down a branch
static TLS int threadId;       // 0 = the lead (setup, time control, result), 1.. = helpers
#define MT_HPO + __atomic_load_n(&gHPO, __ATOMIC_SEQ_CST)
#define EXPD(nd) (__atomic_load_n(&(nd)->exp, __ATOMIC_SEQ_CST) == 1)
#define NSEEN(nd) ((nd)->n - VLOSS)   // (the visit of this descent is counted already: virtual loss)
static int newNodes(int k) { if (__atomic_load_n(&nNodes, __ATOMIC_SEQ_CST) + k > NODES) return -1; int f = __atomic_fetch_add(&nNodes, k, __ATOMIC_SEQ_CST); if (f + k > NODES) return -1; return f; }
// Batched results of the busy nodes (2026-11-09, MODEL_CARD「スレッドが伸びない問題」). A playout adds a RAVE result to about
// half of the children of EVERY node on its path, and a visit (virtual loss on the way down, the win on the way up) to the
// child it went through; near the root all threads share those nodes, so each playout wrote ~50 cache lines per level that
// every other thread was reading (the children of the root alone are ~3.4KB), and on the user's Mac 14 threads made only
// 2.6× the playouts of 1 (a playout is ~6 µs here, ~3000× shorter than a go network evaluation, so the tree's shared writes
// were most of the time). A thread now keeps the results of a node with many visits in a slot of its own — the RAVE
// results of its children and the visits / wins through each child — chooses with them added, and adds the visits / wins
// to the tree every `lim` visits of that node (lim = visits / (16 × threads), ≤ 2048: all threads together hold back at
// most ~1/16 of them; a few lines, the children gone through) and the RAVE results every 4 × lim (~1/4; about all the
// children's lines; RAVE is an average over many playouts, a delay that size does not move it). Under such a node there is
// no virtual loss (one visit in ≥ 64 × threads moves the choice by < 1/1000; the threads spread out lower down, where the
// visits are few). Nodes with fewer visits (lim < 4) are written at once as before. With one thread in the tree nothing
// is batched (the same search as before). tools/mtsim.c counts the line transfers per playout (11×11, 14 threads in step:
// 663 → 51).
#define RB_SLOTS 16
#define RB_THREADS 32
typedef struct { int key, first, nch, cnt, cntR, lim, use; float rn[MAXC + 1], rw[MAXC + 1], dn[MAXC + 1], dw[MAXC + 1]; } __attribute__((aligned(64))) RBuf;   // key = node + 1, 0 = free
static RBuf RBS[RB_THREADS][RB_SLOTS];   // (each thread's own; not thread-local storage, so they are not in the file)
static TLS RBuf *RB;                     // this thread's (mt_thread), 0 = none
static TLS int rbClock, rbThreads;    // rbThreads: threads in the tree (looked up every 64 playouts)
static TLS float rootN, rootW;        // the root's own visits and wins (nothing chooses by them; added every 64 playouts)
#ifndef MTSIM_W
#define MTSIM_W(i)
#endif
// add the slot's visits / wins to the tree (a few children), and with rave also its RAVE results (about all children)
static void rbFlush(RBuf *s, int rave) {   // (the slot stays this node's)
  Node *ch = &T[s->first];
  for (int i = 0; i < s->nch; i++) {
    if (rave && s->rn[i] != 0) { ch[i].rn += s->rn[i]; ch[i].rw += s->rw[i]; s->rn[i] = 0; s->rw[i] = 0; MTSIM_W(s->first + i); }
    if (s->dn[i] != 0) { ch[i].n += s->dn[i]; ch[i].w += s->dw[i]; s->dn[i] = 0; s->dw[i] = 0; MTSIM_W(s->first + i); }
  }
  s->cnt = 0; if (rave) s->cntR = 0;
}
static void rbRoot(void) { if (rootN != 0) { T[0].n += rootN; T[0].w += rootW; rootN = rootW = 0; } }
static void rbFlushAll(void) {
  if (RB) for (int i = 0; i < RB_SLOTS; i++) if (RB[i].key) { rbFlush(&RB[i], 1); RB[i].key = 0; }
  rbRoot();
}
// the slot for node ni (nd), or 0 = write at once
static RBuf *rbSlot(int ni, const Node *nd) {
  if (rbThreads < 2 || !RB) return 0;
  int l = (int)(nd->n / (16.f * rbThreads)); if (l < 4) return 0; if (l > 2048) l = 2048;
  RBuf *s = 0, *old = &RB[0];
  for (int i = 0; i < RB_SLOTS; i++) { if (RB[i].key == ni + 1) { s = &RB[i]; break; } if (old->key && (!RB[i].key || RB[i].use < old->use)) old = &RB[i]; }   // (a free slot, else the least recently used)
  if (!s) {
    s = old; if (s->key && s->use == rbClock) return 0;   // (every slot is on this playout's path)
    if (s->key) rbFlush(s, 1);
    s->key = ni + 1; s->first = nd->first; s->nch = nd->nch; s->cnt = s->cntR = 0;
  }
  s->use = rbClock; s->lim = l;
  return s;
}
#else
#define MT_HPO
#define EXPD(nd) ((nd)->exp)
#define NSEEN(nd) ((nd)->n)
static int newNodes(int k) { if (nNodes + k > NODES) return -1; int f = nNodes; nNodes += k; return f; }
#endif
// prior knowledge: a few cheap features → virtual RAVE results
static float prior(const u8 *b, int c, int p) {
  int r = c / N, cc = c % N, own = 0, opp = 0, br = 0;
  for (int k = 0; k < NBC[c]; k++) { int d = NBN[c][k]; if (b[d] == p) own++; else if (b[d]) opp++; }
  // bridges to own stones
  for (int i = 0; i < 6; i++) {
    int a = NBR[c][i], d = NBR[c][(i + 1) % 6];
    if (a < 0 || d < 0 || b[a] || b[d]) continue;
    // the cell across the pair (a, d) from c: neighbour of a in direction i+1 = neighbour of d in direction i
    int x = NBR[a][(i + 1) % 6]; if (x >= 0 && b[x] == p) br++;
  }
  float v = .5f;
  if (own || opp) v += .04f;
  if (br) v += .05f;
  if (opp && own) v += .02f;
  // the first row of the board's border is rarely good while it is empty around
  int edge = (r == 0 || r == N - 1 || cc == 0 || cc == N - 1);
  if (edge && !own && !opp) v -= .08f;
  return v;
}
static void expand(int ni, Pos *p) {
  Node *nd = &T[ni];
  int cnt = 0;
  for (int c = 0; c < NC; c++) if (!p->b[c]) cnt++;
  if (p->swapOk) cnt++;
#ifdef MT
  u8 z = 0; if (!__atomic_compare_exchange_n(&nd->exp, &z, 2, 0, __ATOMIC_SEQ_CST, __ATOMIC_SEQ_CST)) return;   // (another thread expands it: 2 until done)
  int f = newNodes(cnt); if (f < 0) { __atomic_store_n(&nd->exp, 0, __ATOMIC_SEQ_CST); return; }
  nd->first = f; nd->nch = cnt;
#else
  int f = newNodes(cnt); if (f < 0) return;
  nd->first = f; nd->nch = cnt; nd->exp = 1;
#endif
  int k = 0, me = p->side, op = me ^ 3;
  // immediate wins / opponent threats
  int nw = winCells(p->b, me, wc, MAXC);
  int myWin = nw ? wc[0] : -1;
  int ow[4]; int no = winCells(p->b, op, ow, 4);
  static TLS float lp[MAXC];
  if (PW_ON && LP_ON) {   // learned prior: softmax over the empty cells, then pv = 0.5 + A·tanh(B·log(prob × cells))
    int fs[PF_MAX], m = 0; float mx = -1e30f, z = 0;
    for (int c = 0; c < NC; c++) { if (p->b[c]) continue; int kk = pfeat(p->b, c, me, p->last, fs); int s = 0; for (int j = 0; j < kk; j++) s += PW[fs[j]]; lp[c] = s / PW_SCALE; if (lp[c] > mx) mx = lp[c]; m++; }
    for (int c = 0; c < NC; c++) if (!p->b[c]) { lp[c] = fexp(lp[c] - mx); z += lp[c]; }
    for (int c = 0; c < NC; c++) if (!p->b[c]) { float x = LP_B * flog(lp[c] / z * m + 1e-9f), e = fexp(-2 * (x > 20 ? 20 : x < -20 ? -20 : x)); lp[c] = .5f + LP_A * (1 - e) / (1 + e); }
  }
  for (int c = 0; c < NC; c++) {
    if (p->b[c]) continue;
    Node *ch = &T[f + k++];
    ch->first = 0; ch->nch = 0; ch->mv = c; ch->n = 0; ch->w = 0; ch->exp = 0; ch->proof = 0;
    float pv = (PW_ON && LP_ON) ? lp[c] : prior(p->b, c, me);
    ch->rn = PRIOR_N; ch->rw = PRIOR_N * pv;
    if (myWin >= 0) { if (c == myWin) ch->proof = 1; }
    else if (no >= 2) ch->proof = -1;
    else if (no == 1 && c != ow[0]) ch->proof = -1;
  }
  if (p->swapOk) { Node *ch = &T[f + k++]; ch->first = 0; ch->nch = 0; ch->mv = SWAP; ch->n = 0; ch->w = 0; ch->exp = 0; ch->proof = 0; ch->rn = 0; ch->rw = 0; }
  if (myWin >= 0) nd->proof = -1;                  // the side to move here wins at once: whoever moved into this node loses
  else if (no >= 2) nd->proof = 1;
#ifdef MT
  __atomic_store_n(&nd->exp, 1, __ATOMIC_SEQ_CST);   // (the children are ready: other threads may go down now)
#endif
}
static TLS int pathN[256]; static TLS int pathL;
#ifdef MT
// (the multi-thread form: the same search; a busy node's results go through this thread's slot, see RBuf)
static TLS RBuf *pathS[256];   // the slot of path node k (its children's results), 0 = written at once
static TLS u8 pathI[256];      // the child index of path node k at its parent
static void iterate(void) {
  Pos p = ROOT; int ni = 0; pathL = 0; pathS[0] = 0; pathN[pathL++] = 0;
  if ((++rbClock & 63) == 0) { rbThreads = 1 + __atomic_load_n(&gActive, __ATOMIC_RELAXED); rbRoot(); }
  if (rbThreads > 1) rootN += 1; else T[0].n += 1;
  int res = 0, didPO = 0;   // winner, a playout filled PB
  for (;;) {
    Node *nd = &T[ni];
    if (nd->proof) { res = nd->proof > 0 ? (p.side ^ 3) : p.side; break; }   // proven node: its result
    if (!EXPD(nd)) {
      float seen = pathL > 1 && pathS[pathL - 2] ? nd->n : NSEEN(nd);   // (no virtual loss under a busy node)
      if (seen >= expT || ni == 0) { expand(ni, &p); if (nd->proof) continue; if (!EXPD(nd)) { for (int i = 0; i < NC; i++) PB[i] = p.b[i]; res = playout(p.side, p.last); didPO = 1; break; } }
      else { for (int i = 0; i < NC; i++) PB[i] = p.b[i]; res = playout(p.side, p.last); didPO = 1; break; }
    }
    // select (with this thread's results not yet in the tree)
    RBuf *s = rbSlot(ni, nd); pathS[pathL - 1] = s;
    Node *ch = &T[nd->first]; int best = -1, allLost = 1; float bv = -1e9f;
    float lg = UCT_C > 0 ? flog(nd->n + 1) : 0;
    for (int i = 0; i < nd->nch; i++) {
      Node *c = &ch[i];
      if (c->proof > 0) { best = i; allLost = 0; bv = 1e9f; break; }
      if (c->proof < 0) continue;
      allLost = 0;
      float cn = c->n, cw = c->w, crn = c->rn, crw = c->rw;
      if (s) { cn += s->dn[i]; cw += s->dw[i]; crn += s->rn[i]; crw += s->rw[i]; }
      float q = cn > 0 ? cw / cn : .5f, rq = crn > 0 ? crw / crn : .5f;
      float beta = crn / (crn + cn + RAVE_B * crn * cn + 1e-6f);
      float v = (1 - beta) * q + beta * rq;
      if (UCT_C > 0) v += UCT_C * __builtin_sqrtf(lg / (cn + 1));
      v += rndF() * 1e-4f;
      if (v > bv) { bv = v; best = i; }
    }
    if (allLost) { nd->proof = 1; res = p.side ^ 3; break; }   // every move loses for the side to move
    int ci = nd->first + best;
    play(&p, T[ci].mv);
    ni = ci; if (pathL < 255) { pathS[pathL] = 0; pathI[pathL] = (u8)best; pathN[pathL++] = ni; }
    // virtual loss: counted as visits without a win until the playout's result comes back. Under a busy node it would move
    // the choice by < 1/1000 and only cost a shared write, so the visit waits in the slot with its result.
    if (!s) T[ci].n += VLOSS;
    if (T[ci].proof > 0) { res = p.side ^ 3; nd->proof = -1; break; }
  }
#ifdef MTSIM_HOOK
  MTSIM_HOOK(res, didPO);   // (tools/mtsim.c: the other threads go down before this one goes back up)
#endif
  // backup: node j was entered by the player who moved into it (= side to move at its parent)
  // the side to move at path[k] alternates; recompute from ROOT
  int side = ROOT.side;   // side to move at path[0]
  for (int k = 0; k < pathL; k++) {
    Node *nd = &T[pathN[k]];
    int mover = side ^ 3;   // who moved into nd
    if (!k) { if (res == mover) { if (rbThreads > 1) rootW += 1; else nd->w += 1; } }
    else if (pathS[k - 1]) { RBuf *ps = pathS[k - 1]; int i = pathI[k]; ps->dn[i] += 1; if (res == mover) ps->dw[i] += 1; }
    else { if (VLOSS != 1) nd->n -= VLOSS - 1; if (res == mover) nd->w += 1; }   // (n was counted on the way down)
    // proof propagation
    if (EXPD(nd) && !nd->proof) {
      Node *ch = &T[nd->first]; int all = 1, any = 0;
      for (int i = 0; i < nd->nch; i++) { if (ch[i].proof > 0) any = 1; if (ch[i].proof >= 0) all = 0; }
      if (any) nd->proof = -1; else if (all) nd->proof = 1;
    }
    // RAVE: children of nd whose cell ended up owned by the side to move at nd
    RBuf *s = pathS[k];
    if (EXPD(nd) && didPO) {
      Node *ch = &T[nd->first];
      float win = (res == side) ? 1.f : 0.f;
      if (s) { for (int i = 0; i < nd->nch; i++) { int c = ch[i].mv; if (c != SWAP && PB[c] == side) { s->rn[i] += 1; s->rw[i] += win; } } }
      else for (int i = 0; i < nd->nch; i++) { int c = ch[i].mv; if (c != SWAP && PB[c] == side) { ch[i].rn += 1; ch[i].rw += win; } }
    }
    if (s && ++s->cnt >= s->lim) { s->cntR += s->cnt; rbFlush(s, s->cntR >= 4 * s->lim); }
    side ^= 3;
  }
}
#else
static void iterate(void) {
  Pos p = ROOT; int ni = 0; pathL = 0; pathN[pathL++] = 0;
  int res = 0, didPO = 0;   // winner, a playout filled PB
  for (;;) {
    Node *nd = &T[ni];
    if (nd->proof) { res = nd->proof > 0 ? (p.side ^ 3) : p.side; break; }   // proven node: its result
    if (!EXPD(nd)) {
      if (NSEEN(nd) >= expT || ni == 0) { expand(ni, &p); if (nd->proof) continue; if (!EXPD(nd)) { for (int i = 0; i < NC; i++) PB[i] = p.b[i]; res = playout(p.side, p.last); didPO = 1; break; } }
      else { for (int i = 0; i < NC; i++) PB[i] = p.b[i]; res = playout(p.side, p.last); didPO = 1; break; }
    }
    // select
    Node *ch = &T[nd->first]; int best = -1, allLost = 1; float bv = -1e9f;
    float lg = UCT_C > 0 ? flog(nd->n + 1) : 0;
    for (int i = 0; i < nd->nch; i++) {
      Node *c = &ch[i];
      if (c->proof > 0) { best = i; allLost = 0; bv = 1e9f; break; }
      if (c->proof < 0) continue;
      allLost = 0;
      float q = c->n > 0 ? c->w / c->n : .5f, rq = c->rn > 0 ? c->rw / c->rn : .5f;
      float beta = c->rn / (c->rn + c->n + RAVE_B * c->rn * c->n + 1e-6f);
      float v = (1 - beta) * q + beta * rq;
      if (UCT_C > 0) v += UCT_C * __builtin_sqrtf(lg / (c->n + 1));
      v += rndF() * 1e-4f;
      if (v > bv) { bv = v; best = i; }
    }
    if (allLost) { nd->proof = 1; res = p.side ^ 3; break; }   // every move loses for the side to move
    int ci = nd->first + best;
    play(&p, T[ci].mv);
    ni = ci; if (pathL < 255) pathN[pathL++] = ni;
    if (T[ci].proof > 0) { res = p.side ^ 3; nd->proof = -1; break; }
  }
  // backup: node j was entered by the player who moved into it (= side to move at its parent)
  // the side to move at path[k] alternates; recompute from ROOT
  int side = ROOT.side;   // side to move at path[0]
  for (int k = 0; k < pathL; k++) {
    Node *nd = &T[pathN[k]];
    int mover = side ^ 3;   // who moved into nd
    nd->n += 1; if (res == mover) nd->w += 1;
    // proof propagation
    if (EXPD(nd) && !nd->proof) {
      Node *ch = &T[nd->first]; int all = 1, any = 0;
      for (int i = 0; i < nd->nch; i++) { if (ch[i].proof > 0) any = 1; if (ch[i].proof >= 0) all = 0; }
      if (any) nd->proof = -1; else if (all) nd->proof = 1;
    }
    // RAVE: children of nd whose cell ended up owned by the side to move at nd
    if (EXPD(nd) && didPO) {
      Node *ch = &T[nd->first];
      float win = (res == side) ? 1.f : 0.f;
      for (int i = 0; i < nd->nch; i++) { int c = ch[i].mv; if (c != SWAP && PB[c] == side) { ch[i].rn += 1; ch[i].rw += win; } }
    }
    side ^= 3;
  }
}
#endif

static void treeInit(void) {
  nNodes = 1; T[0].first = 0; T[0].nch = 0; T[0].mv = -1; T[0].n = 0; T[0].w = 0; T[0].rn = 0; T[0].rw = 0; T[0].proof = 0; T[0].exp = 0;
  Pos p = ROOT; expand(0, &p);
}
static void search(double ms, int playouts) {
  double t0 = now();
  tStop = ms > 0 ? t0 + ms : 1e300; maxPO = playouts > 0 ? playouts : 0x7fffffff; totalPO = 0;
  int lastProg = 0; expT = EXPAND_T;
#ifdef MT
  // the lead opens the tree to the helpers (mt_help); the playout budget counts every thread's playouts
  __atomic_store_n(&gHPO, 0, __ATOMIC_SEQ_CST); __atomic_store_n(&gTree, ++gTreeGen, __ATOMIC_SEQ_CST);
  rbThreads = 0;
  while (totalPO + (maxPO < 0x7fffffff ? __atomic_load_n(&gHPO, __ATOMIC_RELAXED) : 0) < maxPO) {   // (a time limit reads no shared count)
#else
  while (totalPO < maxPO) {
#endif
    iterate(); totalPO++;
    if (T[0].proof) break;
    if ((totalPO & 255) == 0) {
#ifdef MT
      if (__atomic_load_n(&gStop, __ATOMIC_SEQ_CST)) break;
#endif
      double t = now();
      if (t >= tStop) break;
      // keep the node pool from running out before the budget does: compare the pool used with the budget used
      double fb = maxPO < 0x7fffffff ? (double)(totalPO MT_HPO) / maxPO : 0, ft = ms > 0 ? (t - t0) / ms : 0, f = fb > ft ? fb : ft;
      if ((double)nNodes / NODES > f * .85 + .1 && expT < 256) expT += expT < 4 ? 1 : expT / 4;
#ifndef NATIVE
      if (t - t0 - lastProg > 400) { lastProg = (int)(t - t0); progress(totalPO MT_HPO); }
#endif
    }
  }
#ifdef MT
  // close the tree and wait until no helper is inside it (the lead then reads it, or starts the next search); every thread
  // adds its batched results first
  rbFlushAll();
  __atomic_store_n(&gTree, 0, __ATOMIC_SEQ_CST);
  while (__atomic_load_n(&gActive, __ATOMIC_SEQ_CST)) {}
  totalPO += gHPO;   // (every thread's playouts: the result, the page's playouts/s readout)
#endif
}
// child value for the side to move at the root: -1000..1000, or ±(WIN - plies) when proven
static int childV(const Node *c) {
  if (c->proof > 0) return WIN - 1;
  if (c->proof < 0) return -(WIN - 2);
  float q = c->n > 0 ? c->w / c->n : (c->rn > 0 ? c->rw / c->rn : .5f);
  int v = (int)((q - .5f) * 2000.f); return v > 999 ? 999 : v < -999 ? -999 : v;
}
static int rootBest(void) {
  Node *r = &T[0]; if (!EXPD(r)) return -1;
  Node *ch = &T[r->first]; int best = -1; float bn = -1;
  for (int i = 0; i < r->nch; i++) if (ch[i].proof > 0) return i;
  for (int i = 0; i < r->nch; i++) { if (ch[i].proof < 0) continue; float s = ch[i].n + (ch[i].n > 0 ? ch[i].w / ch[i].n : 0) * .01f; if (s > bn) { bn = s; best = i; } }
  if (best < 0) for (int i = 0; i < r->nch; i++) { float s = ch[i].n; if (s > bn) { bn = s; best = i; } }
  return best;
}

// ---------------------------------------------------------------- forced-connection solver (win within k own moves)
// Proof sets ("carriers"): a win of the attacker carries the set of cells the defender must play in to have any chance;
// the defender's replies are only tried inside the carrier of the attacker's win when the defender passes (exact in Hex:
// an extra own stone never hurts, a defender stone outside the carrier leaves the attacker's strategy intact).
// Attacker moves are restricted to cells on a path needing at most k empty cells (exact, see MODEL_CARD.md).
typedef struct { u64 w[3]; } Set;
static inline void sClr(Set *s) { s->w[0] = s->w[1] = s->w[2] = 0; }
static inline void sAdd(Set *s, int c) { s->w[c >> 6] |= 1ULL << (c & 63); }
static inline int sHas(const Set *s, int c) { return (int)((s->w[c >> 6] >> (c & 63)) & 1); }
static inline void sOr(Set *a, const Set *b) { a->w[0] |= b->w[0]; a->w[1] |= b->w[1]; a->w[2] |= b->w[2]; }
static TLS u8 SB[MAXC];          // solver board (the solver runs on the lead only: its table TT is shared)
static TLS u64 budget; static TLS int budOut;
static u64 ZK[MAXC][3];
static TLS u64 zh;
static int zInit = 0;
static void zSetup(void) { if (zInit) return; zInit = 1; u64 s = 0x1234567ULL; for (int i = 0; i < MAXC; i++) for (int k = 0; k < 3; k++) { s ^= s << 13; s ^= s >> 7; s ^= s << 17; ZK[i][k] = s; } }
#define TTN (1 << 17)
typedef struct { u64 key; Set car; i8 res; u8 k; u8 who; u8 pad; } TTE;
static TTE TT[TTN];
static u32 ttGen = 1; static u32 ttStamp[TTN];
static void ttClear(void) { ttGen++; if (!ttGen) { for (int i = 0; i < TTN; i++) ttStamp[i] = 0; ttGen = 1; } }
static int ttGet(u64 key, int k, int who, Set *car) {
  u32 i = (u32)(key ^ (key >> 29) ^ (u64)k * 0x9E37 ^ (u64)who * 0x51) & (TTN - 1);
  TTE *e = &TT[i]; if (ttStamp[i] != ttGen || e->key != key || e->k != k || e->who != who) return -2;
  if (car) *car = e->car; return e->res;
}
static void ttPut(u64 key, int k, int who, int res, const Set *car) {
  u32 i = (u32)(key ^ (key >> 29) ^ (u64)k * 0x9E37 ^ (u64)who * 0x51) & (TTN - 1);
  TTE *e = &TT[i]; ttStamp[i] = ttGen; e->key = key; e->k = k; e->who = who; e->res = res; if (car) e->car = *car; else sClr(&e->car);
}
// 0-1 BFS distance (number of empty cells needed) from edge e of player p to every cell (the cell's own cost included)
static TLS short DA[MAXC], DB[MAXC];
static TLS short dq[16 * MAXC + 8];
static void dist(const u8 *b, int p, int e, short *D) {
  int h = 8 * MAXC, t = 8 * MAXC;
  for (int i = 0; i < NC; i++) D[i] = 999;
  for (int i = 0; i < NC; i++) {
    if (!onEdge(i, p, e) || (b[i] && b[i] != p)) continue;
    int w = b[i] ? 0 : 1; D[i] = w;
    if (w) dq[t++] = i; else dq[--h] = i;
  }
  while (h < t) {
    int c = dq[h++], dc = D[c];
    for (int k = 0; k < NBC[c]; k++) {
      int d = NBN[c][k]; if (b[d] && b[d] != p) continue;
      int w = b[d] ? 0 : 1, nd = dc + w;
      if (nd < D[d]) { D[d] = nd; if (w) dq[t++] = d; else dq[--h] = d; }
    }
  }
}
// cells on a path needing ≤ k empty cells for p; returns the shortest need, fills list sorted by need
static int pathCells(const u8 *b, int p, int k, int *out, int *nout) {
  dist(b, p, 0, DA); dist(b, p, 1, DB);
  int best = 999;
  for (int i = 0; i < NC; i++) if (onEdge(i, p, 1) && DA[i] < best) best = DA[i];
  *nout = 0;
  if (best > k) return best;
  // bucket by total need
  int n = 0;
  for (int need = best; need <= k; need++)
    for (int i = 0; i < NC; i++) { if (b[i]) continue; int tot = DA[i] + DB[i] - 1; if (tot == need) out[n++] = i; }
  *nout = n; return best;
}
static int winD(int k, int a, Set *car);
// attacker a to move: win within k own moves?  1 yes (car = carrier), 0 no, -1 budget out
static int winA(int k, int a, Set *car) {
  if (k <= 0) return 0;
  if (budget-- == 0) { budOut = 1; return -1; }
  Set c0; int tr = ttGet(zh, k, a, &c0);
  if (tr != -2) { if (tr == 1 && car) *car = c0; return tr; }
  int L[MAXC], n;
  int need = pathCells(SB, a, k, L, &n);
  if (need > k) { ttPut(zh, k, a, 0, 0); return 0; }
  if (need == 0) { if (car) sClr(car); Set s; sClr(&s); ttPut(zh, k, a, 1, &s); return 1; }
  if (need <= 1) {   // connects now
    for (int i = 0; i < n; i++) { int x = L[i]; if (DA[x] + DB[x] - 1 == 1) { if (car) { sClr(car); sAdd(car, x); } Set s; sClr(&s); sAdd(&s, x); ttPut(zh, k, a, 1, &s); return 1; } }
  }
  if (k == 1) { ttPut(zh, k, a, 0, 0); return 0; }
  int unknown = 0;
  for (int i = 0; i < n; i++) {
    int x = L[i];
    SB[x] = a; zh ^= ZK[x][a];
    Set c; int r = winD(k - 1, a, &c);
    SB[x] = 0; zh ^= ZK[x][a];
    if (r < 0) { unknown = 1; break; }
    if (r == 1) { sAdd(&c, x); if (car) *car = c; ttPut(zh, k, a, 1, &c); return 1; }
  }
  if (unknown) return -1;
  ttPut(zh, k, a, 0, 0); return 0;
}
// defender to move; attacker a then has k moves: does the attacker still win?
static int winD(int k, int a, Set *car) {
  if (budget-- == 0) { budOut = 1; return -1; }
  int d = a ^ 3;
  Set c0; int tr = ttGet(zh, k, a | 4, &c0);
  if (tr != -2) { if (tr == 1 && car) *car = c0; return tr; }
  Set C; int r = winA(k, a, &C);   // attacker wins even if the defender passes?
  if (r <= 0) { if (r == 0) ttPut(zh, k, a | 4, 0, 0); return r; }
  Set tot = C;
  for (int x = 0; x < NC; x++) {
    if (!sHas(&C, x) || SB[x]) continue;
    SB[x] = d; zh ^= ZK[x][d];
    int lose = 0, rr;
    if (connected(SB, d)) lose = 1, rr = 0;
    else { Set c2; rr = winA(k, a, &c2); if (rr == 1) sOr(&tot, &c2); }
    SB[x] = 0; zh ^= ZK[x][d];
    if (rr < 0) return -1;
    if (lose || rr == 0) { ttPut(zh, k, a | 4, 0, 0); return 0; }
  }
  if (car) *car = tot;
  ttPut(zh, k, a | 4, 1, &tot); return 1;
}
static void solverLoad(const Pos *p) {
  zSetup(); ttClear(); zh = 0;
  for (int i = 0; i < NC; i++) { SB[i] = p->b[i]; if (SB[i]) zh ^= ZK[i][SB[i]]; }
}

// puzzle values of every root move (see the top of the file). attacker to move (defend = 0): need = own moves to
// connect after each move (1 = this move connects, 0 = not within n, -1 = budget out); defender to move (defend = 1):
// need = attacker moves still needed after each reply (0 = escaped).
EXPORT(puzzle) void puzzle(int n, int defend, int budgetK) {
  if (n > 12) n = 12;
  solverLoad(&ROOT);
  int me = ROOT.side, a = defend ? me ^ 3 : me;
  int cnt = 0;
  budget = (u64)budgetK * 1000; budOut = 0;
  if (!defend) {
    // root shortcuts for cells off every short path: their result equals the defender-to-move result of the root
    int passNeed[16]; for (int j = 0; j <= n; j++) passNeed[j] = -2;
    for (int c = 0; c < NC; c++) {
      if (ROOT.b[c]) continue;
      int need = 0;
      for (int j = 1; j <= n && !need; j++) {
        int L[MAXC], nl; pathCells(SB, a, j, L, &nl);
        int on = 0; for (int i = 0; i < nl; i++) if (L[i] == c) { on = 1; break; }
        int r;
        if (on) {
          SB[c] = a; zh ^= ZK[c][a];
          r = j == 1 ? connected(SB, a) : winD(j - 1, a, 0);
          SB[c] = 0; zh ^= ZK[c][a];
        } else {
          if (j == 1) r = 0;
          else { if (passNeed[j - 1] == -2) passNeed[j - 1] = winD(j - 1, a, 0); r = passNeed[j - 1]; }
        }
        if (r < 0) { need = -1; break; }
        if (r == 1) need = j;
      }
      IO[1 + 2 * cnt] = c; IO[2 + 2 * cnt] = need; cnt++;
    }
  } else {
    Set C[16]; int pw[16];
    for (int k = 1; k <= n; k++) pw[k] = winA(k, a, &C[k]);
    for (int c = 0; c < NC; c++) {
      if (ROOT.b[c]) continue;
      int need = 0;
      SB[c] = me; zh ^= ZK[c][me];
      if (!connected(SB, me)) for (int k = 1; k <= n; k++) {
        int r;
        if (pw[k] < 0) { need = -1; break; }
        if (pw[k] == 0) continue;
        if (!sHas(&C[k], c)) r = 1; else r = winA(k, a, 0);
        if (r < 0) { need = -1; break; }
        if (r == 1) { need = k; break; }
      }
      SB[c] = 0; zh ^= ZK[c][me];
      IO[1 + 2 * cnt] = c; IO[2 + 2 * cnt] = need; cnt++;
    }
  }
  IO[0] = cnt;
}
// forced win for the side to move within k moves: IO = [res, move, carrier cells...]
EXPORT(solve) int solve(int k, int budgetK) {
  solverLoad(&ROOT); budget = (u64)budgetK * 1000; budOut = 0;
  int a = ROOT.side;
  for (int j = 1; j <= k; j++) {
    int L[MAXC], nl; pathCells(SB, a, j, L, &nl);
    for (int i = 0; i < nl; i++) {
      int x = L[i]; SB[x] = a; zh ^= ZK[x][a];
      int r = j == 1 ? connected(SB, a) : winD(j - 1, a, 0);
      SB[x] = 0; zh ^= ZK[x][a];
      if (r < 0) { IO[0] = -1; return -1; }
      if (r == 1) { IO[0] = j; IO[1] = x; return j; }
    }
  }
  IO[0] = 0; return 0;
}
// the opponent's must-play region: cells in the carrier of the opponent's forced win (≤ k) if we passed.
// IO = [count, cells...]; count -1 = no such threat, 0 = lost whatever we do (cannot happen with a carrier) …
static int mustplay(int k, Set *out) {
  solverLoad(&ROOT); budget = 60000; budOut = 0;
  int a = ROOT.side ^ 3;
  for (int j = 1; j <= k; j++) {
    Set c; int r = winA(j, a, &c);
    if (r == 1) { *out = c; return j; }
    if (r < 0) return 0;
  }
  return 0;
}

// ---------------------------------------------------------------- the page's calls
EXPORT(best) void best(int playouts, int ms, int tempX1000, int seed, int must) {
  if (seed) rs ^= (u64)seed * 0x9E3779B97F4A7C15ULL;
  IO[0] = -1;
  int nEmpty = 0; for (int i = 0; i < NC; i++) if (!ROOT.b[i]) nEmpty++;
  if (!nEmpty) return;
  // tactical shortcuts for the stronger levels: an immediate win, or the opponent's forced connection to stop
  Set mp; int mpk = 0;
  if (must) {
    int w[1]; if (winCells(ROOT.b, ROOT.side, w, 1)) { IO[0] = w[0]; IO[1] = WIN - 1; IO[2] = 0; IO[3] = 0; return; }
    if (must >= 2) {
      int r = solve(must >= 3 ? 3 : 2, 40);
      if (r > 0) { IO[0] = IO[1]; IO[1] = WIN - 2 * r; IO[2] = 0; IO[3] = 0; return; }
    }
      mpk = mustplay(must >= 3 ? 3 : must >= 2 ? 2 : 1, &mp);
  }
  treeInit();
  Node *r = &T[0];
  if (!r->exp) { for (int i = 0; i < NC; i++) if (!ROOT.b[i]) { IO[0] = i; break; } return; }
  Node *ch = &T[r->first];
  if (mpk > 0) {   // the opponent connects by force unless we play inside the carrier of that threat: other moves lose
    int any = 0; for (int i = 0; i < r->nch; i++) if (ch[i].mv != SWAP && sHas(&mp, ch[i].mv) && ch[i].proof >= 0) any = 1;
    if (any) for (int i = 0; i < r->nch; i++) if (ch[i].mv == SWAP || !sHas(&mp, ch[i].mv)) { if (!ch[i].proof) ch[i].proof = -1; }
  }
  search(ms, playouts);
  int bi = rootBest();
  if (ch[bi].proof < 0) {   // lost whatever we do: at least stop the quickest threat (a cell of its carrier, the best prior)
    float bp = -1; int fb = -1;
    for (int i = 0; i < r->nch; i++) { if (ch[i].mv == SWAP) continue; float s = (mpk > 0 && sHas(&mp, ch[i].mv) ? 10.f : 0.f) + ch[i].n * 1e-3f + (ch[i].rn > 0 ? ch[i].rw / ch[i].rn : 0); if (s > bp) { bp = s; fb = i; } }
    if (fb >= 0) bi = fb;
  }
  if (tempX1000 > 0 && ch[bi].proof <= 0) {   // weaker levels: sample by visits^(1/T)
    float T0 = tempX1000 / 1000.f, tot = 0, ws[MAXC + 1];
    float mx = 0; for (int i = 0; i < r->nch; i++) if (ch[i].n > mx) mx = ch[i].n;
    for (int i = 0; i < r->nch; i++) { float x = (ch[i].proof < 0 || mx <= 0) ? 0 : fpow(ch[i].n / mx, 1.f / T0); ws[i] = x; tot += x; }
    if (tot > 0) { float u = rndF() * tot; for (int i = 0; i < r->nch; i++) { u -= ws[i]; if (u <= 0) { bi = i; break; } } }
  }
  IO[0] = ch[bi].mv; IO[1] = childV(&ch[bi]); IO[2] = totalPO; IO[3] = (int)ch[bi].n;
}
EXPORT(analyze) void analyze(int ms, int playouts, int maxList) {
  treeInit(); search(ms, playouts);
  Node *r = &T[0]; IO[0] = 0; IO[1] = totalPO;
  if (!r->exp) return;
  Node *ch = &T[r->first];
  int idx[MAXC + 1], n = r->nch;
  for (int i = 0; i < n; i++) idx[i] = i;
  // sort: proven wins first, then by visits
  for (int i = 1; i < n; i++) { int x = idx[i], j = i; float kx = ch[x].proof > 0 ? 1e12f : ch[x].proof < 0 ? -1 + ch[x].rn * 1e-9f : ch[x].n; while (j > 0) { int y = idx[j - 1]; float ky = ch[y].proof > 0 ? 1e12f : ch[y].proof < 0 ? -1 + ch[y].rn * 1e-9f : ch[y].n; if (ky >= kx) break; idx[j] = y; j--; } idx[j] = x; }
  if (maxList > n || maxList <= 0) maxList = n;
  for (int i = 0; i < maxList; i++) { Node *c = &ch[idx[i]]; IO[2 + 3 * i] = c->mv; IO[3 + 3 * i] = childV(c); IO[4 + 3 * i] = (int)c->n; }
  IO[0] = maxList;
}
// principal variation after the root move `move` of the last analyze() (review box): the proven-winning or most visited child
// at each level while the tree goes. IO = [len, moves...]
EXPORT(pv) void pv(int move, int maxLen) {
  Node *r = &T[0]; IO[0] = 0; if (!r->exp) return;
  Node *c = 0; for (int i = 0; i < r->nch; i++) if (T[r->first + i].mv == move) { c = &T[r->first + i]; break; }
  int k = 0; if (maxLen > 60) maxLen = 60;
  while (c && k < maxLen && c->exp && c->nch > 0) {
    Node *ch = &T[c->first], *b = 0;
    for (int i = 0; i < c->nch; i++) { Node *x = &ch[i]; if (x->proof > 0) { b = x; break; } if (x->n > 0 && (!b || x->n > b->n)) b = x; }
    if (!b) break;
    IO[1 + k++] = b->mv; c = b;
  }
  IO[0] = k;
}
EXPORT(set_param) void set_param(int k, int v) {
  if (k == 0) RAVE_B = v / 1e6f; else if (k == 1) UCT_C = v / 1000.f; else if (k == 2) PRIOR_N = (float)v; else if (k == 3) EXPAND_T = v;
  else if (k == 4) LP_A = v / 1000.f; else if (k == 5) LP_B = v / 1000.f; else if (k == 6) LP_ON = v;
}
EXPORT(new_game) void new_game(void) {}
EXPORT(winner_of) int winner_of(void) { return winner(ROOT.b); }

#ifdef MT
// ---------------------------------------------------------------- threads (engine_mt.wasm; shared/mtengine.js, mt-helper.js)
#ifndef NATIVE
extern unsigned char __heap_base;
extern void __wasm_init_tls(void *);
EXPORT(mt_heap_base) u32 mt_heap_base(void) { return (u32)&__heap_base; }
EXPORT(mt_tls_size) u32 mt_tls_size(void) { return __builtin_wasm_tls_size(); }
// every instance first: mt_stack (its own stack: the top address; a function without a frame of its own), then mt_thread
// (its TLS block and thread number; each thread's random numbers differ)
EXPORT(mt_stack) void mt_stack(u32 stackTop) { __asm__ volatile(".globaltype __stack_pointer, i32\n local.get %0\n global.set __stack_pointer" :: "r"(stackTop)); }
EXPORT(mt_thread) void mt_thread(u32 tls, int id) { __wasm_init_tls((void *)tls); threadId = id; rs ^= (u64)(id + 1) * 0xD1B54A32D192ED03ULL; rnd(); RB = id >= 0 && id < RB_THREADS ? RBS[id] : 0; }
#else
static void mt_thread_native(int id) { threadId = id; rs ^= (u64)(id + 1) * 0xD1B54A32D192ED03ULL; rnd(); RB = id >= 0 && id < RB_THREADS ? RBS[id] : 0; }   // (tools/mtbench.c, mtsim.c: pthreads)
#endif
// the page: 1 = every thread stops; 0 = a new job (no tree open yet)
EXPORT(mt_stop) void mt_stop(int v) { __atomic_store_n(&gStop, v, __ATOMIC_SEQ_CST); if (!v) __atomic_store_n(&gTree, 0, __ATOMIC_SEQ_CST); }
EXPORT(mt_vloss) void mt_vloss(int v) { VLOSS = v > 0 ? (float)v : 1; }
// a helper: join every tree the lead opens during the job (its searches) and grow it, until the page stops the threads.
// Returns the playouts done (also counted in gHPO for the lead's budget).
EXPORT(mt_help) int mt_help(void) {
  int done = 0, last = 0;
  while (!__atomic_load_n(&gStop, __ATOMIC_SEQ_CST)) {
    int g = __atomic_load_n(&gTree, __ATOMIC_SEQ_CST);
    if (g <= 0 || g == last) continue;   // (waiting: the lead is setting up or reading the tree)
    __atomic_fetch_add(&gActive, 1, __ATOMIC_SEQ_CST);
    if (__atomic_load_n(&gTree, __ATOMIC_SEQ_CST) == g) {
      last = g; rbThreads = 0; int k = 0;
      // (the shared flags and the root are looked at every 8 playouts, the playouts counted every HPO_BATCH)
      while (__atomic_load_n(&gTree, __ATOMIC_SEQ_CST) == g && !__atomic_load_n(&gStop, __ATOMIC_SEQ_CST) && !T[0].proof) {
        for (int j = 0; j < 8; j++) { iterate(); done++; if (++k == HPO_BATCH) { __atomic_fetch_add(&gHPO, k, __ATOMIC_SEQ_CST); k = 0; } }
      }
      rbFlushAll();
      if (k) __atomic_fetch_add(&gHPO, k, __ATOMIC_SEQ_CST);
    }
    __atomic_fetch_sub(&gActive, 1, __ATOMIC_SEQ_CST);
  }
  return done;
}
#endif
