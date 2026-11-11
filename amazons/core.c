// Amazons — the evaluation and the two-stage candidate list in WebAssembly (tools/build.sh → core-wasm.js).
// The same arithmetic, in the same order, as evalFor / cands in engine.js: the values are identical (checked by
// tools/check_wasm.js on random positions), engine.js falls back to its JS when this module is missing.
// Memory (shared with JS): SQ[100] the board (0 empty, 1 White, 2 Black, 3 arrow), Q[8] the amazons' squares (−1 none),
// OM / OS the candidates written by cand() (move, score), in the order engine.js builds them before its final sort.
#define NN 100
#define PW 12
#define PN 144
#define INF 99
#define WIN 30000
// -DMT (core_mt.wasm, several threads on one shared memory: the MCTS below): every thread's own board and work areas are
// thread-local; without MT, TLS is nothing (core-wasm.js, one thread)
#ifdef MT
#define TLS _Thread_local
#else
#define TLS
#endif
typedef signed char i8; typedef unsigned char u8;
TLS i8 SQ[NN + 12]; TLS i8 Q[8];   // (SQ: 12 more bytes, never used, so that a 16-byte row read from square 90 stays inside it)
TLS int OM[8192]; TLS int OS[8192];
static TLS int evn = 0;
static u8 PI[NN]; static int OFF[8] = { -PW, PW, -1, 1, -PW - 1, -PW + 1, PW - 1, PW + 1 };
static TLS i8 PB[PN]; static TLS u8 PQ[8];
static TLS u8 DA[PN], DB[PN], KA[PN], KB[PN], QU[PN + 8];
#define ML 99
static double P2N[INF + 2], CL6[2 * ML + 1];   // CL6: clamp6(d) at d + ML
static int RAY[NN][8][10], RAYN[NN][8], NBS[NN][8], NBN[NN];
static int inited = 0;
static void init(void) {
  if (inited) return;
  static const int DR[8] = { -1, 1, 0, 0, -1, -1, 1, 1 }, DC[8] = { 0, 0, -1, 1, -1, 1, -1, 1 };
  for (int i = 0; i < NN; i++) {
    int r = i / 10, c = i % 10; PI[i] = (u8)((r + 1) * PW + c + 1); NBN[i] = 0;
    for (int d = 0; d < 8; d++) {
      int n = 0, rr = r + DR[d], cc = c + DC[d];
      while (rr >= 0 && rr < 10 && cc >= 0 && cc < 10) { RAY[i][d][n++] = rr * 10 + cc; rr += DR[d]; cc += DC[d]; }
      RAYN[i][d] = n; if (n) NBS[i][NBN[i]++] = RAY[i][d][0];
    }
  }
  double p = 1.0; for (int i = 0; i <= INF + 1; i++) { P2N[i] = i >= INF ? 0.0 : p; p *= 0.5; }
  for (int d = -ML; d <= ML; d++) { double x = (double)d / 6; CL6[d + ML] = x > 1 ? 1 : x < -1 ? -1 : x; }
  inited = 1;   // (last: a thread that sees it set finds the tables filled)
}
static void padFrom(void) {
  for (int i = 0; i < PN; i++) PB[i] = 1;
  for (int i = 0; i < NN; i++) PB[PI[i]] = SQ[i];
  for (int k = 0; k < 8; k++) PQ[k] = Q[k] >= 0 ? PI[(int)Q[k]] : 0;
}
static void distQ(int k0, u8 *D) {
  for (int i = 0; i < PN; i++) D[i] = INF;
  int h = 0, tl = 0;
  for (int k = k0; k < k0 + 4; k++) { int f = PQ[k]; if (f) { D[f] = 0; QU[tl++] = (u8)f; } }
  while (h < tl) {
    int s = QU[h++], nd = D[s] + 1;
    for (int d = 0; d < 8; d++) {
      int o = OFF[d];
      for (int t = s + o; PB[t] == 0; t += o) { int dt = D[t]; if (dt > nd) { D[t] = (u8)nd; QU[tl++] = (u8)t; } else if (dt < nd) break; }
    }
  }
}
static void distK(int k0, u8 *D) {
  for (int i = 0; i < PN; i++) D[i] = INF;
  int h = 0, tl = 0;
  for (int k = k0; k < k0 + 4; k++) { int f = PQ[k]; if (f) { D[f] = 0; QU[tl++] = (u8)f; } }
  while (h < tl) {
    int s = QU[h++], nd = D[s] + 1;
    for (int d = 0; d < 8; d++) { int t = s + OFF[d]; if (PB[t] == 0 && D[t] > nd) { D[t] = (u8)nd; QU[tl++] = (u8)t; } }
  }
}
static int jsRound(double x) { double r = __builtin_floor(x); if (x - r >= 0.5) r += 1.0; return (int)r; }
// ---- bit boards: bit r * 11 + c (column 10 is a guard, never empty, so shifts across a row edge fall on it)
// (2026-11-11) one 128-bit vector (wasm SIMD with -msimd128: and / or / any-true in one instruction; the same code without it
// on two 64-bit words); the queen layers by a Kogge-Stone fill, the mobility from the rays (stopping at 5): the same sets and
// counts as before, so the same values.
typedef unsigned long long u64;
typedef u64 BB __attribute__((vector_size(16)));
#ifdef __wasm_simd128__
#include <wasm_simd128.h>
static inline int bnz(BB a) { return wasm_v128_any_true((v128_t)a); }
#else
static inline int bnz(BB a) { return (a[0] | a[1]) != 0; }
#endif
static const BB Z0 = { 0, 0 };
static inline __attribute__((always_inline)) BB shl(BB x, int n) {
  if (n >= 64) { BB r = __builtin_shufflevector(x, Z0, 2, 0); return r << (u64)(n - 64); }
  BB c = __builtin_shufflevector(x, Z0, 2, 0) >> (u64)(64 - n); return (x << (u64)n) | c;
}
static inline __attribute__((always_inline)) BB shr(BB x, int n) {
  if (n >= 64) { BB r = __builtin_shufflevector(x, Z0, 1, 2); return r >> (u64)(n - 64); }
  BB c = __builtin_shufflevector(x, Z0, 1, 2) << (u64)(64 - n); return (x >> (u64)n) | c;
}
static inline __attribute__((always_inline)) BB shs(BB x, int s) { return s > 0 ? shl(x, s) : shr(x, -s); }
static BB BIT[NN];
static u8 BI[NN];   // the bit of square i
static int bbInit = 0;
static void initBB(void) { if (bbInit) return; for (int i = 0; i < NN; i++) { int b = (i / 10) * 11 + i % 10; BI[i] = (u8)b; BIT[i][0] = b < 64 ? 1ULL << b : 0; BIT[i][1] = b >= 64 ? 1ULL << (b - 64) : 0; } bbInit = 1; }
// the 8 directions in the order of OFF: N S W E NW NE SW SE (as shifts of the bit board)
#define SN (-11)
#define SS 11
#define SW (-1)
#define SE 1
#define SNW (-12)
#define SNE (-10)
#define SSW 10
#define SSE 12
static inline __attribute__((always_inline)) BB sh(BB x, int d) {
  switch (d) { case 0: return shs(x, SN); case 1: return shs(x, SS); case 2: return shs(x, SW); case 3: return shs(x, SE);
    case 4: return shs(x, SNW); case 5: return shs(x, SNE); case 6: return shs(x, SSW); default: return shs(x, SSE); }
}
static inline int pc(BB x) { return __builtin_popcountll(x[0]) + __builtin_popcountll(x[1]); }
static TLS BB LA[ML], LB[ML];
static TLS int OA[ML], OB[ML];
// the propagators of the Kogge-Stone fill for the empty squares E: P[d][0] = E, P[d][1] = runs of 2 empty squares in direction
// d, [2] runs of 4, [3] runs of 8
static TLS BB PR[8][4];
#define PROP(d, s) { BB p = E; PR[d][0] = p; p &= shs(p, s); PR[d][1] = p; p &= shs(p, 2 * (s)); PR[d][2] = p; p &= shs(p, 4 * (s)); PR[d][3] = p; }
static void props(BB E) { PROP(0, SN) PROP(1, SS) PROP(2, SW) PROP(3, SE) PROP(4, SNW) PROP(5, SNE) PROP(6, SSW) PROP(7, SSE) }
// every empty square reached from g sliding in direction d (and g itself: up to 15 steps, the board has 9)
#define FILL(d, s) { BB g = fr; g |= PR[d][0] & shs(g, s); g |= PR[d][1] & shs(g, 2 * (s)); g |= PR[d][2] & shs(g, 4 * (s)); g |= PR[d][3] & shs(g, 8 * (s)); nx |= g; }
// distance layers: L[k] = the empty squares first reached in k queen (king) moves from the sources S; returns the last level
static int layersQ(BB S, BB E, BB *L) {
  BB seen = S, fr = S; int k = 0;
  while (bnz(fr) && k < ML - 1) {
    BB nx = Z0;
    FILL(0, SN) FILL(1, SS) FILL(2, SW) FILL(3, SE) FILL(4, SNW) FILL(5, SNE) FILL(6, SSW) FILL(7, SSE)
    nx &= ~seen; if (!bnz(nx)) break;
    L[++k] = nx; seen |= nx; fr = nx;
  }
  return k;
}
static int layersK(BB S, BB E, BB *L) {
  BB seen = S, fr = S; int k = 0;
  while (bnz(fr) && k < ML - 1) {
    BB h = fr | shs(fr, SW) | shs(fr, SE), nx = h | shs(h, SN) | shs(h, SS);   // (the 8 neighbours and fr: fr is seen; a step onto the guard column is not empty)
    nx = nx & E & ~seen; if (!bnz(nx)) break;
    L[++k] = nx; seen |= nx; fr = nx;
  }
  return k;
}
static TLS double CS0, CS1, CS2;
static TLS int RS[ML], CSUM[ML];
// The distance terms from the layers (fromCounts in engine.js, the same order): the counts c(i, j) = the empty squares White
// reaches first in i moves and Black in j (here one pass over the pairs, row by row, a row's pairs only while it still has
// squares Black reaches; every sum of doubles in the order of the JS, the zero counts skipped as there)
static void terms(int La, int Lb, double kap, int kind) {
  BB allA = Z0, allB = Z0;
  for (int i = 1; i <= La; i++) allA |= LA[i];
  for (int j = 1; j <= Lb; j++) allB |= LB[j];
  int sa = 0, sb = 0;
  for (int i = 1; i <= La; i++) sa += OA[i] = pc(LA[i] & ~allB);
  for (int j = 1; j <= Lb; j++) sb += OB[j] = pc(LB[j] & ~allA);
  OA[0] = OB[0] = 0;
  int nA = 0, nB = 0, nT = 0; double cc = 0, ww = 0;
  for (int j = 0; j <= Lb; j++) CSUM[j] = 0;
  RS[0] = 0;
  for (int i = 1; i <= La; i++) {
    BB x = LA[i] & allB; int rs = 0;
    for (int j = 1; j <= Lb && bnz(x); j++) {
      BB y = LA[i] & LB[j]; if (!bnz(y)) continue;
      int c = pc(y); x &= ~y; rs += c; CSUM[j] += c;
      if (i < j) nA += c; else if (j < i) nB += c; else nT += c;
      if (kind == 0) ww += c * P2N[i > j ? i - j : j - i]; else cc += c * CL6[j - i + ML];
    }
    RS[i] = rs;
  }
  nA += sa; nB += sb;
  if (kind == 0) {
    int L = La > Lb ? La : Lb;
    for (int k = 0; k <= L; k++) {
      int ra = k <= La ? OA[k] + RS[k] : 0, cb = k <= Lb ? OB[k] + CSUM[k] : 0;
      cc += (ra - cb) * P2N[k];
    }
  } else { cc += sa; cc -= sb; }
  CS0 = (nA - nB) + kap * nT; CS1 = cc; CS2 = ww;
}
// the value for `me` with `toMove` to move (evalFor in engine.js)
__attribute__((export_name("ev"))) int ev(int me, int toMove) {
  init(); initBB(); evn++;
  u64 e0 = 0, e1 = 0;
#ifdef __wasm_simd128__
  {   // (row r: the empty squares of SQ[10 r .. 10 r + 9] as 10 bits at bit 11 r)
    const v128_t z = wasm_i8x16_splat(0); u64 m[10];
    for (int r = 0; r < 10; r++) m[r] = (u64)(wasm_i8x16_bitmask(wasm_i8x16_eq(wasm_v128_load(SQ + 10 * r), z)) & 0x3FF);
    e0 = m[0] | m[1] << 11 | m[2] << 22 | m[3] << 33 | m[4] << 44 | m[5] << 55; e1 = m[5] >> 9 | m[6] << 2 | m[7] << 13 | m[8] << 24 | m[9] << 35;
  }
#else
  for (int i = 0; i < NN; i++) if (!SQ[i]) { int b = BI[i]; if (b < 64) e0 |= 1ULL << b; else e1 |= 1ULL << (b - 64); }
#endif
  BB E = { e0, e1 }, SA = Z0, SB = Z0;
  for (int k = 0; k < 8; k++) if (Q[k] >= 0) { if (k < 4) SA |= BIT[(int)Q[k]]; else SB |= BIT[(int)Q[k]]; }
  double kap = toMove == 1 ? 0.05 : -0.05;
  props(E);
  int La = layersQ(SA, E, LA), Lb = layersQ(SB, E, LB);
  terms(La, Lb, kap, 0);
  double t1 = CS0, c1 = CS1, w = CS2, t2 = 0, c2 = 0;
  double e = w > 40 ? 1 : w / 40;
  if (e > 0) {
    La = layersK(SA, E, LA); Lb = layersK(SB, E, LB);
    terms(La, Lb, kap, 1);
    t2 = CS0; c2 = CS1;
  }
  double mob = 0;
  for (int k = 0; k < 8; k++) {
    if (Q[k] < 0) continue;
    int f = Q[k], n = 0;   // (the queen moves of this amazon, counted up to 5: the penalty is 0 from 5 on)
    for (int d = 0; d < 8 && n < 5; d++) { const int *r = RAY[f][d]; for (int j = 0, m = RAYN[f][d]; j < m && n < 5 && !SQ[r[j]]; j++) n++; }
    double pen = n == 0 ? 10 : n < 5 ? (5 - n) * 1.4 : 0;
    mob += (k < 4 ? -1 : 1) * pen * (0.25 + 0.75 * e);
  }
  double v = 1.0 * t1 + e * (0.45 * t2 + 0.5 * 2 * c1 + 0.35 * c2) + 1.0 * mob;
  int s = jsRound(v * 100);
  return me == 1 ? s : -s;
}
static int canMove(int p) {
  int k0 = p == 1 ? 0 : 4;
  for (int k = k0; k < k0 + 4; k++) { int f = Q[k]; if (f < 0) continue; for (int j = 0; j < NBN[f]; j++) if (!SQ[NBS[f][j]]) return 1; }
  return 0;
}
static int qIdx(int f) { for (int k = 0; k < 8; k++) if (Q[k] == f) return k; return -1; }
static TLS int QM[2048], QS[2048];
static TLS int candNQ;   // (the queen moves the last cand() valued: all of them kept = the list has every move)
// the candidates of `me` (cands in engine.js without its final sort): every queen move valued, the best qkeep (stable
// order) with every arrow; returns their number (OM / OS)
__attribute__((export_name("cand"))) int cand(int me, int qkeep, int ply) {
  init();
  int op = 3 - me, k0 = me == 1 ? 0 : 4, nq = 0, n = 0;
  for (int k = k0; k < k0 + 4; k++) {
    int f = Q[k]; if (f < 0) continue;
    for (int d = 0; d < 8; d++) for (int j = 0; j < RAYN[f][d]; j++) {
      int t = RAY[f][d][j]; if (SQ[t]) break;
      int ki = qIdx(f);
      SQ[f] = 0; SQ[t] = (i8)me; Q[ki] = (i8)t;
      int s = ev(me, op);
      SQ[t] = 0; SQ[f] = (i8)me; Q[ki] = (i8)f;
      // stable insertion, best first
      int i = nq++; while (i > 0 && QS[i - 1] < s) { QS[i] = QS[i - 1]; QM[i] = QM[i - 1]; i--; }
      QS[i] = s; QM[i] = f + 128 * t;
    }
  }
  int keep = nq < qkeep ? nq : qkeep; candNQ = nq;
  for (int i = 0; i < keep; i++) {
    int qm = QM[i], f = qm % 128, t = qm / 128, ki = qIdx(f);
    SQ[f] = 0; SQ[t] = (i8)me; Q[ki] = (i8)t;
    for (int d = 0; d < 8; d++) for (int j = 0; j < RAYN[t][d]; j++) {
      int a = RAY[t][d][j]; if (SQ[a]) break;
      SQ[a] = 3;
      int s = !canMove(op) ? WIN - (ply + 1) : ev(me, op);
      SQ[a] = 0;
      if (n < 8192) { OM[n] = qm + 16384 * a; OS[n] = s; n++; }
    }
    SQ[t] = 0; SQ[f] = (i8)me; Q[ki] = (i8)f;
  }
  return n;
}
__attribute__((export_name("evals_taken"))) int evals_taken(void) { int x = evn; evn = 0; return x; }
__attribute__((export_name("sqp"))) i8 *sqp(void) { return SQ; }
__attribute__((export_name("qp"))) i8 *qp(void) { return Q; }
__attribute__((export_name("omp"))) int *omp(void) { return OM; }
__attribute__((export_name("osp"))) int *osp(void) { return OS; }

// ================================================================ MCTS with the evaluation (2026-11-10, claude/amazons-spec.md「MCTS」)
// The way of the strong Amazons programs since Invader-MC (Lorentz, "Amazons discover Monte-Carlo", CG 2008; Kloetzer, Iida,
// Bouzy 2007): a tree search by visits where the playout is cut short and the evaluation gives the result, the moves of a node
// pre-selected by the evaluation, an evaluation prior, and progressive widening. Here:
// • a node is expanded on its first visit with the candidate list of cand() (every queen move valued, the best QK with every
//   arrow): the best K children are kept, each with its value p = σ(score / S) (the prior, and the start of its minimax value);
//   the visit's result is the node's one-ply value 1 − max p (optionally a short random playout + the evaluation, PO plies).
//   One visit = one expansion ≈ 200–400 evaluations, the same unit as a leaf of the alpha-beta search (its d = 1 nodes).
// • selection: (1 − A) · (w + NP · p) / (n + NP) + A · mm + C · √(ln N / (n + 1)) over the first PWA + PWK · N^PWB children
//   (sorted by p: progressive widening), mm = the implicit minimax value (Lanctot et al. 2014: 1 − the best child's mm, kept
//   up to date on the way back).
// • a move after which the opponent cannot move is a proven win; a node whose list is complete and every child proven lost is
//   a proven loss.
// • -DMT (core_mt.wasm): every thread grows the same tree (tree-parallel, virtual loss VLOSS visits on the way down, one
//   thread expands a node: exp 0 → 2 → 1 by compare-exchange, the nodes from an atomic counter). One visit is ~0.5 ms here
//   (thousands of times a hex playout), so the shared writes near the root (addendum ⑥) are rare: no batching; the shared
//   counters each on their own cache line.
#ifdef NATIVE
double now(void);
#define EXPORT(n)
#else
__attribute__((import_module("env"), import_name("now"))) double now(void);
#define EXPORT(n) __attribute__((export_name(#n)))
#endif
#define WINT 29000
typedef struct { int m, first; float n, w, p, mm, sc; u8 nch, exp, full; i8 proof; } Node;   // 32 bytes
// sc: the evaluation of the node from the view of the player who moved into it (cand's score); p: its prior value
// proof: +1 = the player who moved into this node wins (the side to move here is lost), −1 = loses
static Node *T = 0; static int NODES = 0, CAP = 0;   // NODES: the pool in use (mcts_limit), CAP: the nodes allocated
#ifdef MT
typedef struct { volatile int v; int pad[15]; } __attribute__((aligned(64))) LineV;
static LineV nNodes_, gStop_, gTree_, gActive_, gHS_, gHE_;
#define nNodes nNodes_.v
#define gStop gStop_.v
#define gTree gTree_.v
#define gActive gActive_.v
#define gHS gHS_.v
#define gHE gHE_.v
static int gTreeGen = 0;
static TLS int threadId = 0;
#define EXPD(nd) (__atomic_load_n(&(nd)->exp, __ATOMIC_ACQUIRE) == 1)
static int newNodes(int k) { if (__atomic_load_n(&nNodes, __ATOMIC_SEQ_CST) + k > NODES) return -1; int f = __atomic_fetch_add(&nNodes, k, __ATOMIC_SEQ_CST); if (f + k > NODES) return -1; return f; }
#else
static int nNodes = 0;
#define EXPD(nd) ((nd)->exp == 1)
static int newNodes(int k) { if (nNodes + k > NODES) return -1; int f = nNodes; nNodes += k; return f; }
#endif
// the parameters (mcts_set): tuned by self-play against the alpha-beta search (tools/mcts_match.js)
static int P_QK = 10, P_K = 24, P_QKR = 20, P_KR = 48, P_PO = 0;
static float P_S = 400.f, P_NP = 2.f, P_C = 0.25f, P_A = 0.3f, P_PWA = 3.f, P_PWK = 1.f, P_PWB = 0.5f, P_POM = 0.5f, VLOSS = 1.f;
static i8 RSQ[NN], RQ[8]; static int RSIDE = 1;   // the root position (shared)
// The evaluation right after a move leans to the player who has just moved (in the middle game by ~3 squares: the score of the
// best move and of the best reply to it are both positive). A leaf's value is the mean of the two ((sc − best reply) / 2: one
// ply and two plies, the lean cancels); a prior (one ply only) has the lean BIAS taken off — the mean lean of the expansions
// so far in this search ((sc + best reply) / 2).
static volatile float biasSum = 0.f, biasCnt = 0.f;
static float BIAS0 = 300.f;
// expT: a leaf is expanded once it has been visited this often (0 at first; raised as the pool fills, so that a long search on
// many threads keeps going in a pool of fixed size; a visit to a leaf not expanded backs up its value, no evaluation)
static volatile float expT = 0.f;
static TLS unsigned long long rs = 0x9E3779B97F4A7C15ULL;
static unsigned rnd(void) { rs ^= rs << 13; rs ^= rs >> 7; rs ^= rs << 17; return (unsigned)(rs >> 32); }
static float fexp(float x) {
  if (x < -80.f) return 0.f; if (x > 80.f) x = 80.f;
  float t = x * 1.44269504f, fl = __builtin_floorf(t), f = t - fl; int i = (int)fl;
  float p = 1.f + f * (0.693147f + f * (0.240227f + f * (0.0555041f + f * (0.00961813f + f * 0.00133336f))));
  union { float f; int i; } u; u.i = (i + 127) << 23; return p * u.f;
}
static float flog(float x) {
  union { float f; int i; } u; u.f = x; int e = ((u.i >> 23) & 255) - 127; u.i = (u.i & 0x7fffff) | (127 << 23);
  float m = u.f, y = (m - 1.f) / (m + 1.f), y2 = y * y;
  return 2.f * y * (1.f + y2 * (0.333333f + y2 * (0.2f + y2 * (0.142857f + y2 * 0.111111f)))) + e * 0.693147f;
}
static float sig(float s) { return 1.f / (1.f + fexp(-s / P_S)); }
static float logit(float x) { if (x < 1e-4f) x = 1e-4f; if (x > 1 - 1e-4f) x = 1 - 1e-4f; return P_S * flog(x / (1.f - x)); }
static void playM(int m) { int f = m & 127, t = (m >> 7) & 127, a = m >> 14, k = qIdx(f); SQ[t] = SQ[f]; SQ[f] = 0; SQ[a] = 3; Q[k] = (i8)t; }
// a random move of p (an amazon that can move, one of its queen moves, one of the arrows from there); 0 = p cannot move
static int rndMove(int p) {
  int k0 = p == 1 ? 0 : 4, ks[4], nk = 0;
  for (int k = k0; k < k0 + 4; k++) { int f = Q[k]; if (f < 0) continue; for (int j = 0; j < NBN[f]; j++) if (!SQ[NBS[f][j]]) { ks[nk++] = k; break; } }
  if (!nk) return 0;
  int k = ks[rnd() % nk], f = Q[k], ts[40], nt = 0;
  for (int d = 0; d < 8; d++) for (int j = 0; j < RAYN[f][d]; j++) { int t = RAY[f][d][j]; if (SQ[t]) break; ts[nt++] = t; }
  int t = ts[rnd() % nt]; SQ[f] = 0; SQ[t] = (i8)p; Q[k] = (i8)t;
  int as[40], na = 0;
  for (int d = 0; d < 8; d++) for (int j = 0; j < RAYN[t][d]; j++) { int a = RAY[t][d][j]; if (SQ[a]) break; as[na++] = a; }
  SQ[as[rnd() % na]] = 3; return 1;
}
// expand node ni (the board SQ / Q is its position, side to move `side`); returns the visit's result for the player who moved
// into it (−1: not expanded — another thread is at it or the pool is full: the caller uses the node's own value)
static float expand(int ni, int side) {
  Node *nd = &T[ni];
#ifdef MT
  u8 z = 0; if (!__atomic_compare_exchange_n(&nd->exp, &z, 2, 0, __ATOMIC_SEQ_CST, __ATOMIC_SEQ_CST)) return -1.f;
#endif
  int root = ni == 0, qk = root ? P_QKR : P_QK, n = cand(side, qk, 0), K = root ? P_KR : P_K;
  if (n == 0) { nd->proof = 1; nd->mm = 1.f; nd->nch = 0; nd->full = 1; __atomic_store_n(&nd->exp, 1, __ATOMIC_RELEASE); return 1.f; }   // (the side to move cannot move)
  if (K > n) K = n;
  if (K > 64) K = 64;
  int f = newNodes(K);
  if (f < 0) { __atomic_store_n(&nd->exp, 0, __ATOMIC_RELEASE); return -1.f; }
  for (int j = 0; j < K; j++) {   // the best K, best first (ties: cand's order)
    int b = j; for (int i = j + 1; i < n; i++) if (OS[i] > OS[b]) b = i;
    if (b != j) { int x = OM[j]; OM[j] = OM[b]; OM[b] = x; x = OS[j]; OS[j] = OS[b]; OS[b] = x; }
  }
  int win = OS[0] > WINT; float s1 = (float)OS[0], v = 0.f;
  if (!root && !win) { float b = (nd->sc + s1) * .5f; if (b > -3000.f && b < 3000.f) { biasSum += b; biasCnt += 1.f; } }
  float bias = biasCnt > 0 ? biasSum / biasCnt : BIAS0, bp = 0.f;
  for (int j = 0; j < K; j++) {
    Node *c = &T[f + j]; c->m = OM[j]; c->first = 0; c->n = 0; c->w = 0; c->nch = 0; c->exp = 0; c->full = 0; c->sc = (float)OS[j];
    if (OS[j] > WINT) { c->proof = 1; c->p = 1.f; } else { c->proof = 0; c->p = sig((float)OS[j] - bias); }
    c->mm = c->p; if (c->p > bp) bp = c->p;
  }
  nd->first = f; nd->nch = (u8)K; nd->full = (u8)(K == n && candNQ <= qk);
  nd->mm = 1.f - bp; if (win) nd->proof = -1;
  if (!win) v = root ? 1.f - bp : sig((nd->sc - s1) * .5f);
  if (P_PO > 0 && !win) {   // a short random playout from here, then the evaluation (Lorentz's early playout termination)
    i8 s0[NN], q0[8]; for (int i = 0; i < NN; i++) s0[i] = SQ[i]; for (int k = 0; k < 8; k++) q0[k] = Q[k];
    int mover = 3 - side, p = side, done = 0; float r = 0;
    for (int i = 0; i < P_PO; i++) { if (!rndMove(p)) { r = p == mover ? 0.f : 1.f; done = 1; break; } p = 3 - p; }
    if (!done) r = sig((float)ev(mover, p));
    for (int i = 0; i < NN; i++) SQ[i] = s0[i]; for (int k = 0; k < 8; k++) Q[k] = q0[k];
    v = P_POM * r + (1.f - P_POM) * v;
  }
  __atomic_store_n(&nd->exp, 1, __ATOMIC_RELEASE);
  return v;
}
static TLS int pathN[200]; static TLS int pathL;
// how the visits ended (mcts_vk; bench.html, tools/mt_node.js): per thread, each row on its own cache line
// 0 an expansion (the evaluations), 1 a proven node, 2 a leaf waiting for expT visits, 3 a leaf another thread is expanding or
// the pool full, 4 the depth cap; 5 (of 1) a proven-lost child taken because every child in the window was lost
#define VKT 128
static double VK[VKT][8] __attribute__((aligned(64)));
#ifdef MT
#define VKR VK[threadId & (VKT - 1)]
#else
#define VKR VK[0]
#endif
static void iterate(void) {
  for (int i = 0; i < NN; i++) SQ[i] = RSQ[i]; for (int k = 0; k < 8; k++) Q[k] = RQ[k];
  int side = RSIDE, ni = 0; pathL = 0; pathN[pathL++] = 0;
  float v;
  for (;;) {
    Node *nd = &T[ni];
    if (nd->proof) { v = nd->proof > 0 ? 1.f : 0.f; VKR[1] += 1; break; }
    if (!EXPD(nd)) {
#ifdef MT
      float seen = nd->n - (ni ? VLOSS : 0.f);
#else
      float seen = nd->n;
#endif
      int ex = ni == 0 || seen >= expT;
      v = ex ? expand(ni, side) : -1.f; VKR[v >= 0 ? 0 : ex ? 3 : 2] += 1; if (v < 0) v = nd->mm; break;
    }
    // select
    Node *ch = &T[nd->first]; int nch = nd->nch, best = -1; float bv = -1e30f, N = nd->n;
    int wd = nch; if (P_PWK > 0) { wd = (int)(P_PWA + P_PWK * fexp(P_PWB * flog(N + 1.f))); if (wd > nch) wd = nch; if (wd < 1) wd = 1; }
    float lg = flog(N + 1.f);
    for (int i = 0; i < wd; i++) {
      Node *c = &ch[i];
      if (c->proof > 0) { best = i; break; }
      if (c->proof < 0) continue;
      float cn = c->n, q = (c->w + P_NP * c->p) / (cn + P_NP);
      float s = (1.f - P_A) * q + P_A * c->mm + P_C * __builtin_sqrtf(lg / (cn + 1.f));
      if (s > bv) { bv = s; best = i; }
    }
    if (best < 0) {   // (every child in the window is lost: the best of the rest, else the first)
      for (int i = wd; i < nch; i++) if (ch[i].proof >= 0) { best = i; break; }
      if (best < 0) best = 0;
    }
    Node *c = &ch[best];
    if (c->proof < 0) VKR[5] += 1;
    playM(c->m); side = 3 - side;
    ni = nd->first + best; if (pathL < 199) pathN[pathL++] = ni; else { v = c->mm; VKR[4] += 1; break; }
#ifdef MT
    c->n += VLOSS;   // (virtual loss: a visit without its result yet)
#endif
  }
  // back up: v is the result for the player who moved into the last node; one ply up it is the other player's
  for (int k = pathL - 1; k >= 0; k--) {
    Node *nd = &T[pathN[k]];
#ifdef MT
    nd->n += k ? 1.f - VLOSS : 1.f;
#else
    nd->n += 1.f;
#endif
    nd->w += v;
    if (EXPD(nd) && nd->nch) {   // the implicit minimax value and the proofs from the children
      Node *ch = &T[nd->first]; float b = 0.f; int any = 0, all = nd->full;
      for (int i = 0; i < nd->nch; i++) { float x = ch[i].proof > 0 ? 1.f : ch[i].proof < 0 ? 0.f : ch[i].mm; if (x > b) b = x; if (ch[i].proof > 0) any = 1; if (ch[i].proof >= 0) all = 0; }
      nd->mm = 1.f - b;
      if (any) nd->proof = -1; else if (all) nd->proof = 1;
    }
    v = 1.f - v;
  }
}
static TLS double sims, evalsUsed;
// a pool of n nodes (grown memory; the tree reuses it while it is big enough). Returns 1 when it is there.
EXPORT(mcts_alloc) int mcts_alloc(int n) {
  if (n <= CAP) { if (n > NODES) NODES = n; return 1; }
#ifdef NATIVE
  T = (Node *)realloc(T, (size_t)n * sizeof(Node)); if (!T) return 0;
#else
  unsigned long need = (unsigned long)n * sizeof(Node), cur = __builtin_wasm_memory_size(0) * 65536UL;
  // the pool at the end of the memory (nothing is allocated after it): grow it in place, the old nodes stay where they are
  unsigned long at = T && (unsigned long)T + (((unsigned long)CAP * sizeof(Node) + 65535) & ~65535UL) == cur ? (unsigned long)T : cur;
  if (at + need > cur) { long r = __builtin_wasm_memory_grow(0, (at + need - cur + 65535) / 65536); if (r < 0) return 0; }
  T = (Node *)at;
#endif
  NODES = CAP = n; return 1;
}
// use only n of the allocated nodes (0: all) — tools/mcts_match.js pool=…, to see a pool that fills
EXPORT(mcts_limit) void mcts_limit(int n) { NODES = n > 0 && n < CAP ? n : CAP; }
EXPORT(mcts_set) void mcts_set(int k, float v) {
  switch (k) {
    case 0: P_QK = (int)v; break; case 1: P_K = (int)v; break; case 2: P_QKR = (int)v; break; case 3: P_KR = (int)v; break;
    case 4: P_PO = (int)v; break; case 5: P_S = v; break; case 6: P_NP = v; break; case 7: P_C = v; break; case 8: P_A = v; break;
    case 9: P_PWA = v; break; case 10: P_PWK = v; break; case 11: P_PWB = v; break; case 12: P_POM = v; break; case 13: VLOSS = v; break; case 14: BIAS0 = v; break;
  }
}
// a new tree on the position SQ / Q with `side` to move (the root expanded); seed: the random numbers (the playouts).
// Returns the root's children.
EXPORT(mcts_begin) int mcts_begin(int side, int seed) {
  init(); initBB();
  if (!NODES && !mcts_alloc(1 << 18)) return 0;
  for (int i = 0; i < NN; i++) RSQ[i] = SQ[i]; for (int k = 0; k < 8; k++) RQ[k] = Q[k]; RSIDE = side;
  rs = 0x9E3779B97F4A7C15ULL ^ ((unsigned long long)(unsigned)seed * 0xD1B54A32D192ED03ULL); rnd();
  nNodes = 1; Node *r = &T[0]; r->m = -1; r->first = 0; r->n = 0; r->w = 0; r->p = 0.5f; r->mm = 0.5f; r->sc = 0; r->nch = 0; r->exp = 0; r->full = 0; r->proof = 0;
  biasSum = 0; biasCnt = 0;
  for (int i = 0; i < VKT; i++) for (int k = 0; k < 8; k++) VK[i][k] = 0;
  sims = 0; evalsUsed = 0; evn = 0; expT = 0;
  iterate(); sims = 1; evalsUsed = evn; evn = 0;
  return r->nch;
}
// grow the tree until ms (the clock now() — 0: none), the evaluations (all threads, 0: none) or the visits (0: none) of this
// tree are used up, or the root is proven. Returns the visits so far (all threads).
EXPORT(mcts_run) double mcts_run(double ms, double evalLimit, double simLimit) {
  double tEnd = ms > 0 ? now() + ms : 1e300;
#ifdef MT
  __atomic_store_n(&gHS, 0, __ATOMIC_SEQ_CST); __atomic_store_n(&gHE, 0, __ATOMIC_SEQ_CST);
  __atomic_store_n(&gTree, ++gTreeGen, __ATOMIC_SEQ_CST);   // (the helpers join: mt_help)
#define HS() ((double)__atomic_load_n(&gHS, __ATOMIC_RELAXED))
#define HE() ((double)__atomic_load_n(&gHE, __ATOMIC_RELAXED))
#else
#define HS() 0.0
#define HE() 0.0
#endif
  while (!T[0].proof) {
    if (evalLimit > 0 && evalsUsed + HE() >= evalLimit) break;
    if (simLimit > 0 && sims + HS() >= simLimit) break;
    iterate(); sims += 1; evalsUsed += evn; evn = 0;
    double t = now(); if (t >= tEnd) break;
#ifdef MT
    if (__atomic_load_n(&gStop, __ATOMIC_RELAXED)) break;
#endif
    // keep the pool from running out: past half full, a leaf waits for more visits before it is expanded
    { double fl = (double)nNodes / NODES; float x = fl < .5 ? 0.f : fl < .7 ? 1.f : fl < .8 ? 2.f : fl < .87 ? 4.f : fl < .92 ? 8.f : fl < .96 ? 32.f : -1.f; if (x < 0) break; if (x > expT) expT = x; }   // (full: stop)
  }
#ifdef MT
  __atomic_store_n(&gTree, 0, __ATOMIC_SEQ_CST);
  while (__atomic_load_n(&gActive, __ATOMIC_SEQ_CST)) {}
  sims += gHS; evalsUsed += gHE;   // (every thread's: the budget of the next call and the readout)
#endif
  return sims;
}
EXPORT(mcts_evals) double mcts_evals(void) { return evalsUsed; }
EXPORT(mcts_vk) double mcts_vk(int k) { double t = 0; for (int i = 0; i < VKT; i++) t += VK[i][k & 7]; return t; }
EXPORT(mcts_nodes) int mcts_nodes(void) { return nNodes; }
EXPORT(mcts_proof) int mcts_proof(void) { return T[0].proof; }
// the root's children, most visited first: RM move, RN visits, RV value (σ⁻¹ of the mixed value, in the evaluation's units:
// ~100 = one square; ±(WIN − 1 / 2) when proven), RP the prior's score
int RM[64], RN[64], RV[64], RP[64], PVA[32];
static int valOf(const Node *c) {
  if (c->proof > 0) return WIN - 1; if (c->proof < 0) return -(WIN - 2);
  float q = c->n > 0 ? c->w / c->n : c->p, x = (1.f - P_A) * q + P_A * c->mm;
  int v = (int)logit(x); return v > 20000 ? 20000 : v < -20000 ? -20000 : v;
}
static float outKey(const Node *a) { return a->proof > 0 ? 1e30f : a->proof < 0 ? -1e30f + a->n : a->n + 1e-3f * valOf(a) / 20000.f; }
EXPORT(mcts_out) int mcts_out(void) {
  Node *r = &T[0]; if (!EXPD(r)) return 0;
  int n = r->nch > 64 ? 64 : r->nch, idx[64];
  for (int i = 0; i < n; i++) idx[i] = i;
  Node *ch = &T[r->first];
  for (int i = 0; i < n; i++) for (int j = i + 1; j < n; j++)   // most visited first, then the value; a proven win first, proven losses last
    if (outKey(&ch[idx[j]]) > outKey(&ch[idx[i]])) { int x = idx[i]; idx[i] = idx[j]; idx[j] = x; }
  for (int i = 0; i < n; i++) { Node *c = &ch[idx[i]]; RM[i] = c->m; RN[i] = (int)c->n; RV[i] = valOf(c); RP[i] = (int)c->sc; }
  return n;
}
// the most visited line after root child m (PVA, up to 30 moves); returns its length
EXPORT(mcts_pv) int mcts_pv(int m) {
  Node *nd = &T[0]; int k = 0;
  if (!EXPD(nd)) return 0;
  { Node *ch = &T[nd->first]; int f = -1; for (int i = 0; i < nd->nch; i++) if (ch[i].m == m) { f = i; break; } if (f < 0) return 0; nd = &ch[f]; }
  while (k < 30 && EXPD(nd) && nd->nch) {
    Node *ch = &T[nd->first]; int b = 0;
    for (int i = 1; i < nd->nch; i++) if (ch[i].n > ch[b].n || (ch[i].n == ch[b].n && ch[i].mm > ch[b].mm)) b = i;
    if (ch[b].n < 1) break;
    PVA[k++] = ch[b].m; nd = &ch[b];
  }
  return k;
}
EXPORT(rmp) int *rmp(void) { return RM; }
EXPORT(rnp) int *rnp(void) { return RN; }
EXPORT(rvp) int *rvp(void) { return RV; }
EXPORT(rpp) int *rpp(void) { return RP; }
EXPORT(pvp) int *pvp(void) { return PVA; }

#ifdef MT
// ---------------------------------------------------------------- threads (core_mt.wasm: shared/mtengine.js, mt-helper.js)
#ifndef NATIVE
extern unsigned char __heap_base;
extern void __wasm_init_tls(void *);
EXPORT(mt_heap_base) unsigned mt_heap_base(void) { return (unsigned)&__heap_base; }
EXPORT(mt_stack) void mt_stack(unsigned stackTop) { __asm__ volatile(".globaltype __stack_pointer, i32\n local.get %0\n global.set __stack_pointer" :: "r"(stackTop)); }
EXPORT(mt_thread) void mt_thread(unsigned tls, int id) { __wasm_init_tls((void *)tls); threadId = id; rs ^= (unsigned long long)(id + 1) * 0xD1B54A32D192ED03ULL; rnd(); init(); initBB(); }
#else
static void mt_thread_native(int id) { threadId = id; rs ^= (unsigned long long)(id + 1) * 0xD1B54A32D192ED03ULL; rnd(); init(); initBB(); }
#endif
EXPORT(mt_stop) void mt_stop(int v) { __atomic_store_n(&gStop, v, __ATOMIC_SEQ_CST); if (!v) __atomic_store_n(&gTree, 0, __ATOMIC_SEQ_CST); }
// a helper: join every tree the lead opens during the job (mcts_run) and grow it, until the page stops the threads. Its
// visits and evaluations count in the lead's budget (gHS / gHE, added after every visit: a visit is ~0.5 ms). Returns its visits.
EXPORT(mt_help) int mt_help(void) {
  int done = 0, last = 0;
  while (!__atomic_load_n(&gStop, __ATOMIC_SEQ_CST)) {
    int g = __atomic_load_n(&gTree, __ATOMIC_SEQ_CST);
    if (g <= 0 || g == last) continue;   // (waiting: the lead sets up or reads the tree)
    __atomic_fetch_add(&gActive, 1, __ATOMIC_SEQ_CST);
    if (__atomic_load_n(&gTree, __ATOMIC_SEQ_CST) == g) {
      last = g;
      while (__atomic_load_n(&gTree, __ATOMIC_RELAXED) == g && !__atomic_load_n(&gStop, __ATOMIC_RELAXED) && !T[0].proof) {
        evn = 0; iterate(); done++;
        __atomic_fetch_add(&gHS, 1, __ATOMIC_RELAXED); __atomic_fetch_add(&gHE, evn, __ATOMIC_RELAXED);
      }
    }
    __atomic_fetch_sub(&gActive, 1, __ATOMIC_SEQ_CST);
  }
  return done;
}
#endif
