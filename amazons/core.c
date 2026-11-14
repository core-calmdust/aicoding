// Amazons — the evaluation, the two-stage candidate list, the alpha-beta search (2026-11-11) and the MCTS in WebAssembly (tools/build.sh → core-wasm.js, core_mt.wasm).
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
#if !defined(NATIVE) && !defined(__wasm_bulk_memory__)
// (the struct copies of the alpha-beta search: no libc here)
void *memcpy(void *d, const void *s, unsigned long n) { unsigned char *a = d; const unsigned char *b = s; while (n--) *a++ = *b++; return d; }
#endif
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
static void initZ(void);
static void init(void) {
  if (inited) return;
  initZ();
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
// ---- the evaluation's weights (2026-11-14, claude/amazons-spec.md「評価 v2」): EVM 0 = the classic set (exactly engine.js's
// evalFor: the same constants in the same arithmetic), 1 = v2 (the king-distance terms t2 / c2 count more and the queen-distance
// position term c1 less; tuned by self-play matches of the MCTS, tools/native_match.c). ev_set(k, v): k < 0 the set, else
// parameter k of the set in use (tools); ev_reset: both sets back to their values.
// EP: 0 W0 (w at which the board counts as open), 1 t1, 2 t1·e, 3 t2, 4 c1, 5 c2, 6 κ (the side to move's share of a tie)
#define NEPS 7
static const double EPC[2][NEPS] = { { 40, 1.0, 0, 0.45, 0.5, 0.35, 0.05 }, { 40, 1.0, 0, 0.85, 0.35, 0.6, 0.05 } };
static double EPS[2][NEPS] = { { 40, 1.0, 0, 0.45, 0.5, 0.35, 0.05 }, { 40, 1.0, 0, 0.85, 0.35, 0.6, 0.05 } };
static int EVM = 0;
static const double *EP = EPS[0];
__attribute__((export_name("ev_reset"))) void ev_reset(void) { for (int j = 0; j < 2; j++) for (int i = 0; i < NEPS; i++) EPS[j][i] = EPC[j][i]; }
__attribute__((export_name("ev_set"))) void ev_set(int k, double v) { if (k < 0) { EVM = v > 0 ? 1 : 0; EP = EPS[EVM]; } else if (k < NEPS) EPS[EVM][k] = v; }
__attribute__((export_name("ev_mode"))) int ev_mode(void) { return EVM; }
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
  double kap = toMove == 1 ? EP[6] : -EP[6];
  props(E);
  int La = layersQ(SA, E, LA), Lb = layersQ(SB, E, LB);
  terms(La, Lb, kap, 0);
  double t1 = CS0, c1 = CS1, w = CS2, t2 = 0, c2 = 0;
  double e = w > EP[0] ? 1 : w / EP[0];
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
  double v = (EP[1] + EP[2] * e) * t1 + e * (EP[3] * t2 + EP[4] * 2 * c1 + EP[5] * c2) + 1.0 * mob;
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
typedef int Move;
#ifdef MT
// (2026-11-11) the alpha-beta search's threads are Praline's Young Brothers Wait (shared/praline/, claude/praline-spec.md): its
// shared state here (gStop and threadId are the MCTS's too); the game's part of a split point: the node's position, the root
// candidates' scores (a win is not searched), the moves themselves in mv
#define SP_MV 32
#define PL_SP_FIELDS i8 psq[NN]; i8 pq[8]; int pside; unsigned ph1, ph2; int sc[SP_MV];
#include "../shared/praline/praline.h"
typedef struct { volatile int v; int pad[15]; } __attribute__((aligned(64))) LineV;
static LineV nNodes_, gTree_, gActive_, gHS_, gHE_;
#define nNodes nNodes_.v
static LineV vNodes_;
#define vNodes vNodes_.v
#define gTree gTree_.v
#define gActive gActive_.v
#define gHS gHS_.v
#define gHE gHE_.v
static int gTreeGen = 0;
#define EXPD(nd) (__atomic_load_n(&(nd)->exp, __ATOMIC_ACQUIRE) == 1)
static int newNodes(int k) { if (__atomic_load_n(&nNodes, __ATOMIC_SEQ_CST) + k > NODES) return -1; int f = __atomic_fetch_add(&nNodes, k, __ATOMIC_SEQ_CST); if (f + k > NODES) return -1; return f; }
#else
static int nNodes = 0, vNodes = 0;
#define EXPD(nd) ((nd)->exp == 1)
static int newNodes(int k) { if (nNodes + k > NODES) return -1; int f = nNodes; nNodes += k; return f; }
#endif
// the parameters (mcts_set): tuned by self-play against the alpha-beta search (tools/mcts_match.js)
static int P_QK = 10, P_K = 24, P_QKR = 20, P_KR = 48, P_PO = 0;
static float P_S = 400.f, P_NP = 2.f, P_C = 0.25f, P_A = 0.3f, P_PWA = 3.f, P_PWK = 1.f, P_PWB = 0.5f, P_POM = 0.5f, VLOSS = 1.f;
// (2026-11-11) The children of a node (not the root) beyond the first P_LA are made only when progressive widening first
// reaches them (lazy children, below): with K = 24 a node expanded on its first visit allocated 24 children of which the
// window lets it see 4 at N = 1 and 9 only at N = 35 — most of them never. P_LA = 0: every child at once (as before).
static int P_LA = 8;
// The pool's fill that raises expT (mcts_run) is the larger of the nodes made / the pool and the nodes the search would have
// made with every child at once (vNodes: K per expansion) / VPOOL: with VPOOL = the pool (a search by visits or evaluations,
// engine.js) the waits come exactly where they came before (the same tree, the same result); VPOOL = 0 (a search by time):
// only the nodes made count.
static double VPOOL = 0;
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
// how the visits ended (mcts_vk; bench.html, tools/mt_node.js): per thread, each row on its own cache line
// 0 an expansion (the evaluations), 1 a proven node, 2 a leaf waiting for expT visits, 3 a leaf another thread is expanding or
// the pool full, 4 the depth cap; 5 (of 1) a proven-lost child taken because every child in the window was lost; 6 the rest of
// a node's children made (makeRest, lazy children), 7 the evaluations of those
#define VKT 128
static double VK[VKT][8] __attribute__((aligned(64)));
#ifdef MT
#define VKR VK[threadId & (VKT - 1)]
#else
#define VKR VK[0]
#endif
// the best K of cand's list first (ties: cand's order)
static void topK(int n, int K) {
  for (int j = 0; j < K; j++) {
    int b = j; for (int i = j + 1; i < n; i++) if (OS[i] > OS[b]) b = i;
    if (b != j) { int x = OM[j]; OM[j] = OM[b]; OM[b] = x; x = OS[j]; OS[j] = OS[b]; OS[b] = x; }
  }
}
static void initChild(Node *c, int j, float bias) {
  c->m = OM[j]; c->first = 0; c->n = 0; c->w = 0; c->nch = 0; c->exp = 0; c->full = 0; c->sc = (float)OS[j];
  if (OS[j] > WINT) { c->proof = 1; c->p = 1.f; } else { c->proof = 0; c->p = sig((float)OS[j] - bias); }
  c->mm = c->p;
}
// Lazy children (2026-11-11): a node other than the root with K > P_LA children gets the first la = P_LA at its expansion and
// one more node, the header, after them: the rest (K − la, sorted after them) are made when the window first passes la
// (makeRest: cand() once more on the same position — the same list, the same order — and the expansion's bias, so each is
// the child it would have been). Until then they are seen only through the header: mm = the p of the first of them (the
// largest: the rest have no visit, no proof but a win, which would sort first), so the minimax value and the proofs of the
// node are those of every child. In a tree of K = 24 most nodes are leaves with 1–3 visits: ~9 nodes instead of 24.
#define LAZY(root, K) ((root) || P_LA <= 0 || P_PWK <= 0 || (K) <= P_LA ? (K) : P_LA)
static inline int lazyN(const Node *nd) { return nd->nch > P_LA && P_LA > 0 && P_PWK > 0 && nd != T ? P_LA : nd->nch; }   // (the children in the first block)
static inline Node *childAt(const Node *nd, int la, int i) { return i < la ? &T[nd->first + i] : &T[T[nd->first + la].first + (i - la)]; }
static inline int childIdx(const Node *nd, int la, int i) { return i < la ? nd->first + i : T[nd->first + la].first + (i - la); }
// make the rest of nd's children (its position on the board, `side` to move); 1 = they are there
static int makeRest(Node *nd, int side, int la) {
  Node *h = &T[nd->first + la];
  if (EXPD(h)) return 1;
#ifdef MT
  u8 z = 0; if (!__atomic_compare_exchange_n(&h->exp, &z, 2, 0, __ATOMIC_SEQ_CST, __ATOMIC_SEQ_CST)) return 0;   // (another thread makes them)
#endif
  int K = nd->nch, r = K - la, e0 = evn;
  int f = newNodes(r);
  if (f < 0) { __atomic_store_n(&h->exp, 0, __ATOMIC_RELEASE); return 0; }
  int n = cand(side, P_QK, 0);
  VKR[7] += evn - e0; evn = e0; VKR[6] += 1;   // (its evaluations not in the budget: a search by evaluations stays the same)
  topK(n, K);
  for (int j = la; j < K; j++) initChild(&T[f + j - la], j, h->p);
  h->first = f;
  __atomic_store_n(&h->exp, 1, __ATOMIC_RELEASE);
  return 1;
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
  int la = LAZY(root, K);   // (the children made now; with la < K one more node: the header of the rest, see childAt)
  if (VPOOL > 0 && __atomic_load_n(&vNodes, __ATOMIC_RELAXED) + K > VPOOL) { __atomic_store_n(&nd->exp, 0, __ATOMIC_RELEASE); return -1.f; }   // (as the pool of before would)
  int f = newNodes(la < K ? la + 1 : K);
  if (f < 0) { __atomic_store_n(&nd->exp, 0, __ATOMIC_RELEASE); return -1.f; }
  __atomic_fetch_add(&vNodes, K, __ATOMIC_RELAXED);
  topK(n, K);
  int win = OS[0] > WINT; float s1 = (float)OS[0], v = 0.f;
  if (!root && !win) { float b = (nd->sc + s1) * .5f; if (b > -3000.f && b < 3000.f) { biasSum += b; biasCnt += 1.f; } }
  float bias = biasCnt > 0 ? biasSum / biasCnt : BIAS0, bp = 0.f;
  for (int j = 0; j < la; j++) {
    Node *c = &T[f + j]; initChild(c, j, bias);
    if (c->p > bp) bp = c->p;
  }
  if (la < K) {   // the header: first = the rest's nodes (exp 1 once made), p = the bias of this expansion, mm = the first one's p
    Node *h = &T[f + la]; h->m = -1; h->first = 0; h->n = 0; h->w = 0; h->sc = 0; h->nch = (u8)(K - la); h->exp = 0; h->full = 0; h->proof = 0;
    h->p = bias; h->mm = OS[la] > WINT ? 1.f : sig((float)OS[la] - bias);   // (≤ the p of every child before it: sorted)
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
    int nch = nd->nch, la = lazyN(nd), best = -1; float bv = -1e30f, N = nd->n;
    int wd = nch; if (P_PWK > 0) { wd = (int)(P_PWA + P_PWK * fexp(P_PWB * flog(N + 1.f))); if (wd > nch) wd = nch; if (wd < 1) wd = 1; }
    int seen = la < nch && wd > la && !makeRest(nd, side, la) ? la : nch;   // (the children there: la while the rest is not made)
    if (wd > seen) wd = seen;
    float lg = flog(N + 1.f);
    for (int i = 0; i < wd; i++) {
      Node *c = childAt(nd, la, i);
      if (c->proof > 0) { best = i; break; }
      if (c->proof < 0) continue;
      float cn = c->n, q = (c->w + P_NP * c->p) / (cn + P_NP);
      float s = (1.f - P_A) * q + P_A * c->mm + P_C * __builtin_sqrtf(lg / (cn + 1.f));
      if (s > bv) { bv = s; best = i; }
    }
    if (best < 0) {   // (every child in the window is lost: the best of the rest, else the first)
      for (int i = wd; i < nch; i++) {
        if (i == seen) { if (!makeRest(nd, side, la)) break; seen = nch; }
        if (childAt(nd, la, i)->proof >= 0) { best = i; break; }
      }
      if (best < 0) best = 0;
    }
    Node *c = childAt(nd, la, best);
    if (c->proof < 0) VKR[5] += 1;
    playM(c->m); side = 3 - side;
    ni = childIdx(nd, la, best); if (pathL < 199) pathN[pathL++] = ni; else { v = c->mm; VKR[4] += 1; break; }
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
      Node *ch = &T[nd->first]; float b = 0.f; int any = 0, all = nd->full, la = lazyN(nd);
      for (int i = 0; i < la; i++) { float x = ch[i].proof > 0 ? 1.f : ch[i].proof < 0 ? 0.f : ch[i].mm; if (x > b) b = x; if (ch[i].proof > 0) any = 1; if (ch[i].proof >= 0) all = 0; }
      if (la < nd->nch) {
        Node *h = &T[nd->first + la];
        if (EXPD(h)) { Node *cr = &T[h->first]; for (int i = 0; i < nd->nch - la; i++) { float x = cr[i].proof > 0 ? 1.f : cr[i].proof < 0 ? 0.f : cr[i].mm; if (x > b) b = x; if (cr[i].proof > 0) any = 1; if (cr[i].proof >= 0) all = 0; } }
        else { if (h->mm > b) b = h->mm; all = 0; }   // (not made yet: no visit, no proof; the largest p is the first one's)
      }
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
    case 9: P_PWA = v; break; case 10: P_PWK = v; break; case 11: P_PWB = v; break; case 12: P_POM = v; break; case 13: VLOSS = v; break; case 14: BIAS0 = v; break; case 15: P_LA = (int)v; break; case 16: VPOOL = v; break;
  }
}
// a new tree on the position SQ / Q with `side` to move (the root expanded); seed: the random numbers (the playouts).
// Returns the root's children.
EXPORT(mcts_begin) int mcts_begin(int side, int seed) {
  init(); initBB();
  if (!NODES && !mcts_alloc(1 << 18)) return 0;
  for (int i = 0; i < NN; i++) RSQ[i] = SQ[i]; for (int k = 0; k < 8; k++) RQ[k] = Q[k]; RSIDE = side;
  rs = 0x9E3779B97F4A7C15ULL ^ ((unsigned long long)(unsigned)seed * 0xD1B54A32D192ED03ULL); rnd();
  nNodes = 1; vNodes = 1; Node *r = &T[0]; r->m = -1; r->first = 0; r->n = 0; r->w = 0; r->p = 0.5f; r->mm = 0.5f; r->sc = 0; r->nch = 0; r->exp = 0; r->full = 0; r->proof = 0;
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
    { double fl = (double)nNodes / NODES, fv = VPOOL > 0 ? (double)vNodes / VPOOL : 0; if (fv > fl) fl = fv; float x = fl < .5 ? 0.f : fl < .7 ? 1.f : fl < .8 ? 2.f : fl < .87 ? 4.f : fl < .92 ? 8.f : fl < .96 ? 32.f : -1.f; if (x < 0) break; if (x > expT) expT = x; }   // (full: stop)
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
EXPORT(mcts_vnodes) int mcts_vnodes(void) { return vNodes; }   // (the nodes with every child made at once)
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
    int la = lazyN(nd), nc = la < nd->nch && !EXPD(&T[nd->first + la]) ? la : nd->nch, b = 0;   // (children not made: no visit)
    for (int i = 1; i < nc; i++) { Node *x = childAt(nd, la, i), *y = childAt(nd, la, b); if (x->n > y->n || (x->n == y->n && x->mm > y->mm)) b = i; }
    Node *c = childAt(nd, la, b);
    if (c->n < 1) break;
    PVA[k++] = c->m; nd = c;
  }
  return k;
}
EXPORT(rmp) int *rmp(void) { return RM; }
EXPORT(rnp) int *rnp(void) { return RN; }
EXPORT(rvp) int *rvp(void) { return RV; }
EXPORT(rpp) int *rpp(void) { return RP; }
EXPORT(pvp) int *pvp(void) { return PVA; }

// ================================================================ alpha-beta search (2026-11-11: the loop of engine.js's search in C)
// The same search as engine.js's JS (negamax alpha-beta, PVS, the transposition table, iterative deepening, the cache of the
// candidate lists), node for node: the same table semantics (a Map keyed by the position's h1, an entry replaced by every store,
// cleared past 400,000 entries; the candidate lists keyed by h1 and qkeep, cleared past 120,000), the same checks of the clock
// and the evaluation budget every 32 nodes, the same order of the moves (cand() and a stable sort). engine.js keeps the root
// candidates (with the review's extra moves), the depth loop of the analysis and the result; tools/check_ab.js compares this with
// the JS search (moves, values, nodes and evaluations).
// -DMT (core_mt.wasm): the threads split the nodes with Praline's Young Brothers Wait (praline_ybw.h below, as the other wasm
// engines), one shared table and one shared cache of candidate lists (lockless: the table's entries checked by the position's
// 64-bit key; the cache by a sequence lock). One thread (no helper) searches exactly as without MT.
static unsigned Z1[3][NN], Z2[3][NN], ZS1, ZS2;
static inline unsigned zfmix(unsigned z) { z ^= z >> 16; z *= 0x85ebca6bu; z ^= z >> 13; z *= 0xc2b2ae35u; z ^= z >> 16; return z; }
static void initZ(void) {
  unsigned zs = 0x2545F491u;
#define ZR() (zs ^= zs << 13, zs ^= zs >> 17, zs ^= zs << 5, zfmix(zs))   /* (2026-11-14: fmix32, as engine.js — see Zobrist in claude/praline-spec.md) */
  for (int k = 0; k < 3; k++) for (int i = 0; i < NN; i++) { Z1[k][i] = ZR(); Z2[k][i] = ZR(); }
  ZS1 = ZR(); ZS2 = ZR();
#undef ZR
}
static TLS int abSide;              // 0 = White to move (engine.js pos.side)
static TLS unsigned H1, H2;          // the position's two 32-bit keys (pos.h1, pos.h2)
static inline void abPlay(Move m) {
  int f = m & 127, t = (m >> 7) & 127, a = m >> 14, p = abSide + 1;
  SQ[f] = 0; SQ[t] = (i8)p; SQ[a] = 3;
  for (int k = 0; k < 8; k++) if (Q[k] == f) { Q[k] = (i8)t; break; }
  H1 ^= Z1[p - 1][f] ^ Z1[p - 1][t] ^ Z1[2][a] ^ ZS1; H2 ^= Z2[p - 1][f] ^ Z2[p - 1][t] ^ Z2[2][a] ^ ZS2;
  abSide ^= 1;
}
static inline void abUnplay(Move m) {
  int f = m & 127, t = (m >> 7) & 127, a = m >> 14;
  abSide ^= 1; int p = abSide + 1;
  SQ[a] = 0; SQ[t] = 0; SQ[f] = (i8)p;
  for (int k = 0; k < 8; k++) if (Q[k] == t) { Q[k] = (i8)f; break; }
  H1 ^= Z1[p - 1][f] ^ Z1[p - 1][t] ^ Z1[2][a] ^ ZS1; H2 ^= Z2[p - 1][f] ^ Z2[p - 1][t] ^ Z2[2][a] ^ ZS2;
}
static int clearLine(int f, int t, int skip) {
  if (f == t) return 0;
  int r0 = f / 10, c0 = f % 10, r1 = t / 10, c1 = t % 10, dr = (r1 > r0) - (r1 < r0), dc = (c1 > c0) - (c1 < c0);
  int ar = r1 > r0 ? r1 - r0 : r0 - r1, ac = c1 > c0 ? c1 - c0 : c0 - c1;
  if (!(r0 == r1 || c0 == c1 || ar == ac)) return 0;
  for (int r = r0 + dr, c = c0 + dc;; r += dr, c += dc) { int i = r * 10 + c; if (SQ[i] && i != skip) return 0; if (i == t) return 1; }
}
static int isLegal(Move m) {
  if (m < 0) return 0;
  int f = m % 128, t = (m / 128) % 128, a = m / 16384, p = abSide + 1;
  if (f >= NN || t >= NN || a >= NN || SQ[f] != p) return 0;
  if (!clearLine(f, t, -1)) return 0;
  return clearLine(t, a, f);
}
// ---- the state of a search (engine.js: nodes, evals, tEnd, evalLimit, stop)
static TLS unsigned long long nodes;
static TLS int stopFlag;             // 1 the clock / budget / the page stopped it; 2, 3: Praline's (praline_ybw.h)
static TLS double tEnd = 1e300, evalLimit = 1e300;
static TLS double abEv;              // this thread's evaluations in the search (cand / ev calls)
static double evBase;                // the evaluations counted before (engine.js's root candidates)
static int abExact = 1;              // one thread: the tables behave exactly as engine.js's Maps (cleared mid-search when full)
#ifdef MT
static volatile long long gEvN;      // every thread's evaluations of the job (flushed every 32 nodes)
static TLS double abEvFl;
static inline double evTotal(void) { const long long d = (long long)(abEv - abEvFl); if (d) { __atomic_fetch_add(&gEvN, d, __ATOMIC_RELAXED); abEvFl += d; } return evBase + (double)__atomic_load_n(&gEvN, __ATOMIC_RELAXED); }
#else
static inline double evTotal(void) { return evBase + abEv; }
#endif
static inline int abEval(void) { int e0 = evn, t = abSide + 1, v = ev(t, t); abEv += evn - e0; evn = e0; return v; }
// ---- memory of the tables: grown at the end of the memory (one thread: as they fill; MT: fixed)
#ifndef NATIVE
static void *growMem(unsigned long bytes) {
  unsigned long cur = __builtin_wasm_memory_size(0) * 65536UL;
  long r = __builtin_wasm_memory_grow(0, (bytes + 65535) / 65536); if (r < 0) return 0;
  return (void *)cur;   // (new pages are zero)
}
#else
static void *growMem(unsigned long bytes) { return calloc(1, bytes); }
#endif
static void zero(void *p, unsigned long n) { unsigned long long *q = (unsigned long long *)p; for (unsigned long i = 0; i < n / 8; i++) q[i] = 0; }
// ---- the transposition table: slot = { kw = h1 | h2 << 32 (0: empty), a = move 21 | flag 2 | depth 8 | value 16 | h2's low 16 | 1 << 63 }
typedef struct { u64 kw, a; } TTS;
#define TT_CLEAR 400000
#ifdef MT
#define TT_BITS 20
static TTS TTB[1 << TT_BITS];
static TTS *TTp = TTB; static unsigned ttMask = (1u << TT_BITS) - 1;
#else
static TTS *TTp = 0; static unsigned ttMask = 0;
#endif
static volatile int ttCount;
static void ttClear(void) { if (TTp) zero(TTp, (unsigned long)(ttMask + 1) * sizeof(TTS)); ttCount = 0; }
#ifndef MT
static int ttGrow(void) {   // (one thread) twice the slots, every entry moved (the same entries: a Map has no size)
  unsigned nb = ttMask ? (ttMask + 1) * 2 : 1u << 15;
  TTS *n = (TTS *)growMem((unsigned long)nb * sizeof(TTS)); if (!n) return 0;
  for (unsigned i = 0; TTp && i <= ttMask; i++) if (TTp[i].kw) { unsigned j = (unsigned)TTp[i].kw & (nb - 1); while (n[j].kw) j = (j + 1) & (nb - 1); n[j] = TTp[i]; }
  TTp = n; ttMask = nb - 1; return 1;
}
#endif
typedef struct { int d, v, f; Move m; } TTE;
static int ttGet(TTE *e) {
  if (!TTp) return 0;
  const u64 want = (u64)H1 | (u64)H2 << 32;
  for (unsigned i = H1 & ttMask, k = 0; k <= ttMask; i = (i + 1) & ttMask, k++) {
    u64 kw = __atomic_load_n(&TTp[i].kw, __ATOMIC_ACQUIRE);
    if (!kw) return 0;
    if ((unsigned)kw != H1) continue;
    if (kw != want) return 0;
    u64 a = __atomic_load_n(&TTp[i].a, __ATOMIC_ACQUIRE);
    if (!(a >> 63) || ((a >> 47) & 0xFFFF) != (H2 & 0xFFFF)) return 0;
    e->m = (Move)(a & 0x1FFFFF); e->f = (int)((a >> 21) & 3); e->d = (int)((a >> 23) & 255); e->v = (int)(short)(unsigned short)((a >> 31) & 0xFFFF);
    return 1;
  }
  return 0;
}
static void ttPut(int d, int v, int f, Move m, int ply) {
  int sv = v > WINT ? v + ply : v < -WINT ? v - ply : v;
  if (abExact && ttCount > TT_CLEAR) ttClear();
#ifndef MT
  if (!TTp || (unsigned)(ttCount + 1) * 2 > ttMask + 1) { if (!ttGrow() && !TTp) return; }
#endif
  const u64 want = (u64)H1 | (u64)H2 << 32;
  const u64 a = (u64)(m & 0x1FFFFF) | (u64)(f & 3) << 21 | (u64)(d > 255 ? 255 : d < 0 ? 0 : d) << 23 | (u64)(unsigned short)(short)sv << 31 | (u64)(H2 & 0xFFFF) << 47 | 1ull << 63;
  for (unsigned i = H1 & ttMask, k = 0; k <= ttMask && (abExact || k < 256u); i = (i + 1) & ttMask, k++) {
    u64 kw = __atomic_load_n(&TTp[i].kw, __ATOMIC_ACQUIRE);
    if (!kw) {
#ifdef MT
      if (!abExact && ttCount > (int)(ttMask / 4 * 3)) return;   // (several threads: never cleared mid-search; nearly full, nothing new)
      if (!__atomic_compare_exchange_n(&TTp[i].kw, &kw, want, 0, __ATOMIC_ACQ_REL, __ATOMIC_ACQUIRE)) { i = (i - 1) & ttMask; k--; continue; }   // (taken meanwhile: look again)
#else
      TTp[i].kw = want;
#endif
      __atomic_fetch_add(&ttCount, 1, __ATOMIC_RELAXED);
      __atomic_store_n(&TTp[i].a, a, __ATOMIC_RELEASE);
      return;
    }
    if ((unsigned)kw != H1) continue;
    if (kw != want) __atomic_store_n(&TTp[i].kw, want, __ATOMIC_RELEASE);   // (the same h1, another position: replaced, as a Map's set)
    __atomic_store_n(&TTp[i].a, a, __ATOMIC_RELEASE);
    return;
  }
}
// ---- the cache of candidate lists (engine.js CC): the best CK of a position for a qkeep, win scores relative to the node
#define CK 10
#define CC_CLEAR 120000
typedef struct { u64 kw; volatile unsigned seq; unsigned h2; int n; Move m[CK]; short s[CK]; short pad; } CCS;
#ifdef MT
#define CC_BITS 18
static CCS CCB[1 << CC_BITS];
static CCS *CCp = CCB; static unsigned ccMask = (1u << CC_BITS) - 1;
#else
static CCS *CCp = 0; static unsigned ccMask = 0;
#endif
static volatile int ccCount;
static void ccClear(void) { if (CCp) zero(CCp, (unsigned long)(ccMask + 1) * sizeof(CCS)); ccCount = 0; }
static inline unsigned ccIdx(u64 kw) { return ((unsigned)kw ^ (unsigned)(kw >> 32) * 0x9E3779B9u) & ccMask; }
#ifndef MT
static int ccGrow(void) {
  unsigned nb = ccMask ? (ccMask + 1) * 2 : 1u << 12;
  CCS *n = (CCS *)growMem((unsigned long)nb * sizeof(CCS)); if (!n) return 0;
  unsigned om = ccMask; CCS *o = CCp; ccMask = nb - 1;
  for (unsigned i = 0; o && i <= om; i++) if (o[i].kw) { unsigned j = ccIdx(o[i].kw); while (n[j].kw) j = (j + 1) & ccMask; n[j] = o[i]; }
  CCp = n; return 1;
}
#endif
typedef struct { Move m; int s; } CI;
static TLS CI LT[CK];
// the top CK of cand()'s list in the order of a stable sort by score, best first (engine.js: out.sort((x, y) => y.s - x.s))
static int topStable(int n) {
  int k = 0;
  for (int i = 0; i < n; i++) {
    int s = OS[i];
    if (k == CK && s <= LT[CK - 1].s) continue;
    int j = k < CK ? k++ : CK - 1;
    while (j > 0 && LT[j - 1].s < s) { LT[j] = LT[j - 1]; j--; }
    LT[j].m = OM[i]; LT[j].s = s;
  }
  return k;
}
// candsC(pos, K, ply, qkeep): the first K of the cached list into out (win scores − ply); returns their number
static int candsC(CI *out, int K, int ply, int qkeep) {
  const u64 want = (u64)H1 | (u64)qkeep << 32 | 1ull << 40;
  int n = -1; unsigned slot = ~0u;
  if (CCp) for (unsigned i = ccIdx(want), k = 0; k <= ccMask; i = (i + 1) & ccMask, k++) {
    u64 kw = __atomic_load_n(&CCp[i].kw, __ATOMIC_ACQUIRE);
    if (!kw) { slot = i; break; }
    if (kw != want) continue;
    slot = i;
    CCS *c = &CCp[i]; unsigned s1 = __atomic_load_n(&c->seq, __ATOMIC_ACQUIRE);
    if (s1 & 1) { slot = ~1u; break; }   // (another thread writes it: no store)
    if (c->h2 == H2) { int nn = c->n; for (int j = 0; j < nn && j < CK; j++) { LT[j].m = c->m[j]; LT[j].s = c->s[j]; } __atomic_thread_fence(__ATOMIC_ACQUIRE); if (__atomic_load_n(&c->seq, __ATOMIC_RELAXED) == s1) n = nn; }
    break;
  }
  if (n < 0) {
    int e0 = evn, nc = cand(abSide + 1, qkeep, 0); abEv += evn - e0; evn = e0;   // (counted here: evals_taken() stays the caller's)
    n = topStable(nc);
    if (slot != ~1u) {
      if (abExact && ccCount > CC_CLEAR) { ccClear(); slot = ~0u; }
#ifndef MT
      if (!CCp || (unsigned)(ccCount + 1) * 2 > ccMask + 1) { if (ccGrow() || CCp) slot = ~0u; }
      if (slot == ~0u && CCp) { slot = ccIdx(want); while (CCp[slot].kw && CCp[slot].kw != want) slot = (slot + 1) & ccMask; }
#else
      if (slot == ~0u) { slot = ccIdx(want); for (unsigned k = 0; k < 256 && CCp[slot].kw && CCp[slot].kw != want; k++) slot = (slot + 1) & ccMask; }
#endif
      if (CCp && slot != ~0u) {
        CCS *c = &CCp[slot]; u64 kw = __atomic_load_n(&c->kw, __ATOMIC_ACQUIRE); int ok = 1;
        if (!kw) {
#ifdef MT
          if (!abExact && ccCount > (int)(ccMask / 4 * 3)) ok = 0;
          else if (!__atomic_compare_exchange_n(&c->kw, &kw, want, 0, __ATOMIC_ACQ_REL, __ATOMIC_ACQUIRE)) ok = kw == want;
          else __atomic_fetch_add(&ccCount, 1, __ATOMIC_RELAXED);
#else
          c->kw = want; ccCount++;
#endif
        } else ok = kw == want;
        unsigned s1 = __atomic_load_n(&c->seq, __ATOMIC_ACQUIRE);
        if (ok && !(s1 & 1) && __atomic_compare_exchange_n(&c->seq, &s1, s1 + 1, 0, __ATOMIC_ACQ_REL, __ATOMIC_ACQUIRE)) {
          c->h2 = H2; c->n = n; for (int j = 0; j < n; j++) { c->m[j] = LT[j].m; c->s[j] = (short)LT[j].s; }
          __atomic_store_n(&c->seq, s1 + 2, __ATOMIC_RELEASE);
        }
      }
    }
  }
  int k = K < n ? K : n;
  for (int j = 0; j < k; j++) { out[j].m = LT[j].m; out[j].s = LT[j].s > WINT ? LT[j].s - ply : LT[j].s; }
  return k;
}
// ---- the search
static const int KW[16] = { 0, 1, 8, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10 };   // moves searched at each remaining depth
#define QKEEP_BASE 14
#define NEGV (-1000000)
#ifdef MT
#ifndef BUSY_D
#define BUSY_D 2
#endif
static inline u64 abKey(void) { return (u64)H2 << 32 | H1; }
static inline void mtCheck(void) {
  if (now() > tEnd || evTotal() > evalLimit || __atomic_load_n(&gStop, __ATOMIC_RELAXED)) stopFlag = 1;
  else if (curSP && chainStopped(curSP, curIdx)) stopFlag = 2;
  else if (dupMode && gOpenN > 0 && dupLeave()) stopFlag = 3;
}
static inline int timeUp(void) { mtCheck(); return stopFlag; }
static int spFillPos(SPt *s) {
  for (int i = 0; i < NN; i++) s->psq[i] = SQ[i]; for (int k = 0; k < 8; k++) s->pq[k] = Q[k];
  s->pside = abSide; s->ph1 = H1; s->ph2 = H2; return 1;
}
static void spLoadPos(const SPt *s, int top, int fresh) {
  for (int i = 0; i < NN; i++) SQ[i] = s->psq[i]; for (int k = 0; k < 8; k++) Q[k] = s->pq[k];
  abSide = s->pside; H1 = s->ph1; H2 = s->ph2; (void)top; (void)fresh;
}
#else
static inline int timeUp(void) { if (now() > tEnd || evTotal() > evalLimit) stopFlag = 1; return stopFlag; }
#endif
static int search(int d, int a, int b, int ply) {
  nodes++;
#ifdef SIM_NODE_AB
  SIM_NODE_AB();
#endif
  if ((nodes & 31) == 0 && timeUp()) return 0;
  if (stopFlag) return 0;
  if (!canMove(abSide + 1)) return -(WIN - ply);
  TTE e; const int hit = ttGet(&e);
  if (hit && e.d >= d) {
    int v = e.v > WINT ? e.v - ply : e.v < -WINT ? e.v + ply : e.v;
    if (e.f == 0) return v; if (e.f == 1 && v >= b) return v; if (e.f == 2 && v <= a) return v;
  }
  if (d <= 0) return abEval();
  CI C[CK + 1];
  int n = candsC(C, d >= 2 ? KW[d < 15 ? d : 15] : 1, ply, d >= 3 ? QKEEP_BASE : 10);
  if (!n) return -(WIN - ply);
  if (d == 1) { int v = C[0].s; ttPut(d, v, 0, C[0].m, ply); return v; }
  const Move em = hit ? e.m : -1;
  if (em >= 0) {
    int i = -1; for (int j = 0; j < n; j++) if (C[j].m == em) { i = j; break; }
    if (i > 0) { CI x = C[i]; for (int j = i; j > 0; j--) C[j] = C[j - 1]; C[0] = x; }
    else if (i < 0 && isLegal(em)) { for (int j = n; j > 0; j--) C[j] = C[j - 1]; C[0].m = em; C[0].s = 0; n++; }
  }
  const int a0 = a; int best = NEGV; Move bm = C[0].m;
#ifdef MT
  int defI[CK + 1], nDef = 0, noSplit = 0;
  for (int k = 0; k < n + nDef; k++) {
    // YBW: the first move is done and a helper is idle (or an owner above waits): the remaining moves (in this loop's order, the
    // moves put off after them) go to a split point — not when a win is among them (it ends the loop at once, as below)
    if (k >= 1 && k < n && !noSplit && d >= splitD && (gIdle > 0 || (gWaitN > 0 && spWanted()))) {
      int ns = n - k + nDef, win = 0; for (int j = k; j < n; j++) if (C[j].s > WINT) win = 1;
      SPt *s = !win && ns >= 2 && ns <= SP_MV ? spAlloc() : 0;
      if (s && spFillPos(s)) {
        int q = 0; for (int j = k; j < n; j++) { s->mv[q] = C[j].m; s->sc[q++] = C[j].s; }
        for (int j = 0; j < nDef; j++) { s->mv[q] = C[defI[j]].m; s->sc[q++] = C[defI[j]].s; }
        s->n = q; s->depth = d; s->ply = ply; s->root = 0; s->all = 0; s->pv = 0; s->beta = b; s->alpha = a;
        spRun(s, &best, &bm, 0);
        if (stopFlag) return best == NEGV ? C[0].s : best;
        break;
      }
      if (s) spRelease(s);
      noSplit = 1;
    }
    const int i = k < n ? k : defI[k - n];
    const Move m = C[i].m;
    if (C[i].s > WINT) { best = C[i].s; bm = m; if (best > a) a = best; break; }
    abPlay(m);
    if (k < n && k > 0 && d >= BUSY_D && nDef < CK + 1 && busyOther(abKey())) { abUnplay(m); defI[nDef++] = i; continue; }
    const u64 mkKey = abKey(); const int mk = d >= BUSY_D ? busySet(mkKey) : -1;
    int v;
    if (k == 0) v = -search(d - 1, -b, -a, ply + 1);
    else { v = -search(d - 1, -a - 1, -a, ply + 1); if (v > a && v < b && !stopFlag) v = -search(d - 1, -b, -a, ply + 1); }
    if (mk >= 0) busyClear(mkKey, mk);
#else
  for (int i = 0; i < n; i++) {
    const Move m = C[i].m;
    if (C[i].s > WINT) { best = C[i].s; bm = m; if (best > a) a = best; break; }
    abPlay(m);
    int v;
    if (i == 0) v = -search(d - 1, -b, -a, ply + 1);
    else { v = -search(d - 1, -a - 1, -a, ply + 1); if (v > a && v < b && !stopFlag) v = -search(d - 1, -b, -a, ply + 1); }
#endif
    abUnplay(m);
    if (stopFlag) return best == NEGV ? C[0].s : best;
    if (v > best) { best = v; bm = m; if (v > a) { a = v; if (a >= b) break; } }
  }
  ttPut(d, best, best <= a0 ? 2 : best >= b ? 1 : 0, bm, ply);
  return best;
}
#ifdef MT
// ---- Praline's glue (praline_ybw.h)
static int spSearch(SPt *s, int i, int a) {
  const int b = s->beta, d1 = s->depth - 1, ply = s->ply; const Move m = s->mv[i];
  if (s->root && (s->depth <= 1 || s->sc[i] > WINT)) return s->sc[i];   // (the root: a win or depth 1 is the candidate's score)
  abPlay(m);
  const u64 mkKey = abKey(); const int mk = !s->all && s->depth >= BUSY_D ? busySet(mkKey) : -1;
  int v;
  if (s->all) v = -search(d1, -WIN - 1, WIN + 1, ply + 1);
  else { v = -search(d1, -a - 1, -a, ply + 1); if (v > a && v < b && !stopFlag) v = -search(d1, -b, -a, ply + 1); }
  if (mk >= 0) busyClear(mkKey, mk);
  abUnplay(m);
  return v;
}
static void spCutoff(const SPt *s, int i) { (void)s; (void)i; }   // (no killers / history)
static inline int spTop(void) { return 0; }
static void waitCheck(void) { SIM_IDLE(); mtCheck(); }
static void spIdleReset(int fresh) { nodes = 0; tEnd = 1e300; evalLimit = 1e300; abEv = 0; abEvFl = 0; (void)fresh; }
#include "../shared/praline/praline_ybw.h"
#endif
// ---- the host interface. The root: SQ / Q (the lead's), its side and keys, and the root candidates RLM / RLS (engine.js's
// list, in its order); AOM / AOV / AR: the answers.
int RLM[64], RLS[64], AOM[64], AOV[64];
static double AR[4];
static i8 ARSQ[NN], ARQ[8]; static int ARside, ARn; static unsigned ARh1, ARh2;
static void abLoadRoot(void) { for (int i = 0; i < NN; i++) SQ[i] = ARSQ[i]; for (int k = 0; k < 8; k++) Q[k] = ARQ[k]; abSide = ARside; H1 = ARh1; H2 = ARh2; }
EXPORT(rlmp) int *rlmp(void) { return RLM; }
EXPORT(rlsp) int *rlsp(void) { return RLS; }
EXPORT(aomp) int *aomp(void) { return AOM; }
EXPORT(aovp) int *aovp(void) { return AOV; }
// the root: SQ / Q as written by engine.js, side 0 / 1, its keys, n root candidates in RLM / RLS
EXPORT(ab_root) void ab_root(int side, double h1, double h2, int n) {
  init(); initBB();
  for (int i = 0; i < NN; i++) ARSQ[i] = SQ[i]; for (int k = 0; k < 8; k++) ARQ[k] = Q[k];
  ARside = side; ARh1 = (unsigned)h1; ARh2 = (unsigned)h2; ARn = n > 64 ? 64 : n;
  abLoadRoot();
}
// the search's state from engine.js before every call (its nodes, evals, tEnd, evalLimit, stop: one search may be several calls —
// the analysis's depths); threads 1 = the exact one-thread tables. Read back with ab_nodes / ab_evals / ab_stopped.
EXPORT(ab_sync) void ab_sync(double nodes_, double evals_, double tEnd_, double evalLimit_, int stop_, int threads) {
  init(); initBB();
  nodes = (unsigned long long)nodes_; abEv = 0; evBase = evals_; tEnd = tEnd_; evalLimit = evalLimit_; stopFlag = stop_ ? 1 : 0; abExact = threads <= 1;
#ifdef MT
  abEvFl = 0; __atomic_store_n(&gEvN, 0, __ATOMIC_RELAXED);
  if (!abExact) { if (ttCount > (int)(ttMask / 2)) ttClear(); if (ccCount > (int)(ccMask / 2)) ccClear(); }   // (several threads: never mid-search)
#endif
}
EXPORT(ab_evals) double ab_evals(void) { return evTotal(); }
EXPORT(ab_nodes) double ab_nodes(void) { return (double)nodes; }
EXPORT(ab_stopped) int ab_stopped(void) { return stopFlag != 0; }
EXPORT(ab_res) double ab_res(int k) { return AR[k & 3]; }
EXPORT(ab_newgame) void ab_newgame(void) { ttClear(); ccClear(); }
// rootValues(pos, C, d): every root candidate with the full window (a win or d ≤ 1: its score) → AOM / AOV best first (a stable
// sort); returns how many were finished (fewer: stopped)
static int rootVals(int d, int *vals) {
  int cnt = 0;
#ifdef MT
  if (d > 1 && ARn >= 2 && ARn <= SP_MV && d >= splitD && gIdle > 0) {
    SPt *s = spAlloc();
    if (s && spFillPos(s)) {
      for (int j = 0; j < ARn; j++) { s->mv[j] = RLM[j]; s->sc[j] = RLS[j]; vals[j] = NEGV; }
      s->n = ARn; s->depth = d; s->ply = 0; s->root = 1; s->all = 1; s->pv = 1; s->beta = WIN + 1; s->alpha = -WIN - 1;
      int best = NEGV; Move bm = RLM[0];
      spRun(s, &best, &bm, vals);
      for (int j = 0; j < ARn; j++) if (vals[j] != NEGV) cnt++;
      return cnt;
    }
    if (s) spRelease(s);
  }
#endif
  for (int j = 0; j < ARn; j++) vals[j] = NEGV;
  for (int j = 0; j < ARn; j++) {
    int v;
    if (d <= 1 || RLS[j] > WINT) v = RLS[j];
    else { abPlay(RLM[j]); v = -search(d - 1, -WIN - 1, WIN + 1, 1); abUnplay(RLM[j]); }
    if (stopFlag) break;
    vals[j] = v; cnt++;
  }
  return cnt;
}
EXPORT(ab_values) int ab_values(int d) {
  abLoadRoot();
  int vals[64], k = 0; rootVals(d, vals);
  for (int j = 0; j < ARn; j++) {   // (finished ones in the list's order, then a stable sort by value)
    if (vals[j] == NEGV) continue;
    int i = k++; while (i > 0 && AOV[i - 1] < vals[j]) { AOV[i] = AOV[i - 1]; AOM[i] = AOM[i - 1]; i--; }
    AOV[i] = vals[j]; AOM[i] = RLM[j];
  }
  abLoadRoot();
  return k;
}
// bestMove(pos, maxD, …) after its root list (engine.js handles one candidate and a win): iterative deepening from depth 2, PVS
// at the root with the best move first; best = { move: RLM[0], v: RLS[0], depth: 1 } at first. AR: move, value, depth
EXPORT(ab_best) int ab_best(int maxD) {
  abLoadRoot();
  Move bestM = RLM[0]; int bestV = RLS[0], bestD = 1;
  Move ord[64];
  for (int d = 2; d <= maxD; d++) {
    int a = -WIN - 1, bv = NEGV; Move bm = -1;
    int fi = 0; for (int j = 0; j < ARn; j++) if (RLM[j] == bestM) { fi = j; break; }
    int no = 0; ord[no++] = RLM[fi]; for (int j = 0; j < ARn; j++) if (j != fi) ord[no++] = RLM[j];
    for (int i = 0; i < no; i++) {
#ifdef MT
      if (i == 1 && no - 1 >= 2 && no - 1 <= SP_MV && d >= splitD && gIdle > 0) {   // YBW at the root: the first move is done
        SPt *s = spAlloc();
        if (s && spFillPos(s)) {
          int vals[64];
          for (int j = 1; j < no; j++) { s->mv[j - 1] = ord[j]; s->sc[j - 1] = 0; }
          s->n = no - 1; s->depth = d; s->ply = 0; s->root = 1; s->all = 0; s->pv = 1; s->beta = WIN + 1; s->alpha = a;
          spRun(s, &bv, &bm, vals);
          break;
        }
        if (s) spRelease(s);
      }
#endif
      const Move m = ord[i];
      abPlay(m);
      int v = i == 0 ? -search(d - 1, -WIN - 1, -a, 1) : -search(d - 1, -a - 1, -a, 1);
      if (i > 0 && v > a && !stopFlag) v = -search(d - 1, -WIN - 1, -a, 1);
      abUnplay(m);
      if (stopFlag) break;
      if (v > bv) { bv = v; bm = m; if (v > a) a = v; }
    }
    if (bm >= 0 && (!stopFlag || bv >= bestV)) { bestM = bm; bestV = bv; bestD = d; }
    if (stopFlag) break;
    if (bv > WINT || bv < -WINT) break;
  }
  abLoadRoot();
  AR[0] = bestM; AR[1] = bestV; AR[2] = bestD;
  return bestM;
}
// search(pos, d, a, b, ply) at the position SQ / Q (side, keys) — shared/mtsplit.js's 'mtv' task (engine.js mtV)
EXPORT(ab_search) int ab_search(int side, double h1, double h2, int d, int a, int b, int ply) {
  init(); initBB(); abSide = side; H1 = (unsigned)h1; H2 = (unsigned)h2;
  return search(d, a, b, ply);
}
// a node's candidates in the search's order (engine.js mtKids): AOM / AOV, the table's move first; returns their number
EXPORT(ab_kids) int ab_kids(int side, double h1, double h2, int ply) {
  init(); initBB(); abSide = side; H1 = (unsigned)h1; H2 = (unsigned)h2;
  CI C[CK + 1]; int n = candsC(C, CK, ply, QKEEP_BASE);
  TTE e; if (ttGet(&e)) { int i = -1; for (int j = 0; j < n; j++) if (C[j].m == e.m) { i = j; break; } if (i > 0) { CI x = C[i]; for (int j = i; j > 0; j--) C[j] = C[j - 1]; C[0] = x; } }
  for (int j = 0; j < n; j++) { AOM[j] = C[j].m; AOV[j] = C[j].s; }
  return n;
}

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
// (2026-11-11) The same helper takes moves at the alpha-beta search's split points meanwhile (Praline's mt_idle, back every 2 ms
// to look for a tree): a job of either kind finds every helper ready.
EXPORT(mt_help) int mt_help(void) {
  int done = 0, last = 0, fresh = 1;
  while (!__atomic_load_n(&gStop, __ATOMIC_SEQ_CST)) {
    int g = __atomic_load_n(&gTree, __ATOMIC_SEQ_CST);
    if (g <= 0 || g == last) { mt_idle(2, fresh); fresh = 0; continue; }   // (no tree: the alpha-beta search's split points)
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
