// Reversi search core in C (WebAssembly): the midgame PVS (pattern evaluation with incremental indices, Multi-ProbCut,
// transposition table) and the exact endgame solver, ported one-to-one from engine.js so that the search visits the
// same nodes and returns the same values (the JS root drivers call into it; engine.js keeps a JS fallback).
// Build: tools/build-wasm.sh → engine-wasm.js (the module as base64, loaded by the worker with importScripts).
// Boards are 64-bit (bit s = square s, a1 = 0); the JS side passes them as two 32-bit halves.
typedef unsigned long long u64;
typedef unsigned int u32;
typedef signed char i8;
typedef unsigned char u8;
typedef short i16;
#define EXPORT(n) __attribute__((export_name(#n)))
extern double now(void) __attribute__((import_module("env"), import_name("now")));

static inline int pc(u64 x) { return __builtin_popcountll(x); }
static inline int lsb(u64 x) { return __builtin_ctzll(x); }

// ------------------------------------------------------------------ moves
#define L1(v) ((v) << 1)
#define R1(v) ((v) >> 1)
#define L8(v) ((v) << 8)
#define R8(v) ((v) >> 8)
#define L9(v) ((v) << 9)
#define R9(v) ((v) >> 9)
#define L7(v) ((v) << 7)
#define R7(v) ((v) >> 7)
static u64 genMoves(u64 P, u64 O) {
  const u64 E = ~(P | O), I = O & 0x7E7E7E7E7E7E7E7EULL;
  u64 m = 0, x;
#define GM(SH, MSK) x = SH(P) & MSK; x |= SH(x) & MSK; x |= SH(x) & MSK; x |= SH(x) & MSK; x |= SH(x) & MSK; x |= SH(x) & MSK; m |= SH(x) & E;
  GM(L1, I) GM(R1, I) GM(L8, O) GM(R8, O) GM(L9, I) GM(R9, I) GM(L7, I) GM(R7, I)
  return m;
}
static u64 neighbours(u64 b) {
  const u64 a = b & 0x7F7F7F7F7F7F7F7FULL, c = b & 0xFEFEFEFEFEFEFEFEULL;
  return (a << 1) | (c >> 1) | (b << 8) | (b >> 8) | (a << 9) | (c << 7) | (a >> 7) | (c >> 9);
}
static i16 RAY_START[64 * 8]; static i8 RAY_LEN[64 * 8], RAY_SQ[64 * 8 * 7];
static void initRays(void) {
  static const int D[8][2] = { { -1, -1 }, { -1, 0 }, { -1, 1 }, { 0, -1 }, { 0, 1 }, { 1, -1 }, { 1, 0 }, { 1, 1 } };
  int p = 0;
  for (int sq = 0; sq < 64; sq++) {
    int r0 = sq >> 3, c0 = sq & 7;
    for (int d = 0; d < 8; d++) {
      RAY_START[sq * 8 + d] = (i16)p;
      int r = r0 + D[d][0], c = c0 + D[d][1], n = 0;
      while (r >= 0 && r < 8 && c >= 0 && c < 8) { RAY_SQ[p++] = (i8)(r * 8 + c); n++; r += D[d][0]; c += D[d][1]; }
      RAY_LEN[sq * 8 + d] = (i8)n;
    }
  }
}
static u64 flips(int sq, u64 P, u64 O) {   // the discs of O enclosed between sq and a disc of P, in the 8 directions
  const u64 m = 1ULL << sq, I = O & 0x7E7E7E7E7E7E7E7EULL;
  u64 f = 0, x;
#define FL(SH, MSK) x = SH(m) & MSK; x |= SH(x) & MSK; x |= SH(x) & MSK; x |= SH(x) & MSK; x |= SH(x) & MSK; x |= SH(x) & MSK; if (SH(x) & P) f |= x;
  FL(L1, I) FL(R1, I) FL(L8, O) FL(R8, O) FL(L9, I) FL(R9, I) FL(L7, I) FL(R7, I)
  return f;
}
static inline int discDiff(u64 P, u64 O) { return pc(P) - pc(O); }
static int finalScore(u64 P, u64 O) {
  int p = pc(P), o = pc(O), e = 64 - p - o;
  if (p > o) return p - o + e;
  if (p < o) return p - o - e;
  return 0;
}

// ------------------------------------------------------------------ pattern evaluation (tables set by engine.js)
#define MAXI 80
#define NSTK 96
#define WMAX 13000000
static i16 W[WMAX];
static int NINST, NPHASE, PHASE_SIZE, USE_EXT, EXT_OFF;
static int I_OFF[MAXI], SQ_START[65], SQI[MAXI * 10], SQP[MAXI * 10];
static int STA[NSTK * MAXI], STB[NSTK * MAXI];
EXPORT(w_ptr) i16 *w_ptr(void) { return W; }
EXPORT(w_max) int w_max(void) { return WMAX; }
EXPORT(tab_ptr) int *tab_ptr(int k) { return k == 0 ? I_OFF : k == 1 ? SQ_START : k == 2 ? SQI : SQP; }
EXPORT(set_patterns) void set_patterns(int ninst, int nphase, int phaseSize, int useExt, int extOff) { NINST = ninst; NPHASE = nphase; PHASE_SIZE = phaseSize; USE_EXT = useExt; EXT_OFF = extOff; }
static inline int phaseOf(int discs) { int ply = discs - 4, ph = (ply * NPHASE / 61); return ph < NPHASE ? ph : NPHASE - 1; }
static inline int extSum(u64 P, u64 O, int base) {
  int mp = pc(genMoves(P, O)), mo = pc(genMoves(O, P));
  u64 e = ~(P | O); int pp = pc(neighbours(O) & e), po = pc(neighbours(P) & e);
  return W[base + EXT_OFF + mp] + W[base + EXT_OFF + 64 + mo] + W[base + EXT_OFF + 128 + pp] + W[base + EXT_OFF + 192 + po];
}
static int evalFull(u64 P, u64 O) {   // = engine.js evalPattern
  int idx[MAXI]; for (int i = 0; i < NINST; i++) idx[i] = 0;
  for (u64 x = P; x; x &= x - 1) { int q = lsb(x); for (int j = SQ_START[q], e = SQ_START[q + 1]; j < e; j++) idx[SQI[j]] += SQP[j]; }
  for (u64 x = O; x; x &= x - 1) { int q = lsb(x); for (int j = SQ_START[q], e = SQ_START[q + 1]; j < e; j++) idx[SQI[j]] += 2 * SQP[j]; }
  int base = phaseOf(pc(P | O)) * PHASE_SIZE, s = W[base + PHASE_SIZE - 1];
  for (int i = 0; i < NINST; i++) s += W[base + I_OFF[i] + idx[i]];
  if (USE_EXT) s += extSum(P, O, base);
  return (s * 100) / 32;
}
static void initIdx(int ply, u64 P, u64 O) {
  int a0 = ply * NINST;
  for (int i = 0; i < NINST; i++) STA[a0 + i] = STB[a0 + i] = 0;
  for (u64 x = P; x; x &= x - 1) { int q = lsb(x); for (int j = SQ_START[q], e = SQ_START[q + 1]; j < e; j++) { STA[a0 + SQI[j]] += SQP[j]; STB[a0 + SQI[j]] += 2 * SQP[j]; } }
  for (u64 x = O; x; x &= x - 1) { int q = lsb(x); for (int j = SQ_START[q], e = SQ_START[q + 1]; j < e; j++) { STA[a0 + SQI[j]] += 2 * SQP[j]; STB[a0 + SQI[j]] += SQP[j]; } }
}
static void childIdx(int ply, int s, u64 f) {
  int a0 = ply * NINST, c0 = a0 + NINST;
  for (int i = 0; i < NINST; i++) { STA[c0 + i] = STB[a0 + i]; STB[c0 + i] = STA[a0 + i]; }
  for (int j = SQ_START[s], e = SQ_START[s + 1]; j < e; j++) { STA[c0 + SQI[j]] += 2 * SQP[j]; STB[c0 + SQI[j]] += SQP[j]; }
  for (u64 x = f; x; x &= x - 1) { int q = lsb(x); for (int j = SQ_START[q], e = SQ_START[q + 1]; j < e; j++) { STA[c0 + SQI[j]] += SQP[j]; STB[c0 + SQI[j]] -= SQP[j]; } }
}
static void passIdx(int ply) {
  int a0 = ply * NINST, c0 = a0 + NINST;
  for (int i = 0; i < NINST; i++) { STA[c0 + i] = STB[a0 + i]; STB[c0 + i] = STA[a0 + i]; }
}
static int evalAt(int ply, u64 P, u64 O) {
  int base = phaseOf(pc(P | O)) * PHASE_SIZE, a0 = ply * NINST, s = W[base + PHASE_SIZE - 1];
  for (int i = 0; i < NINST; i++) s += W[base + I_OFF[i] + STA[a0 + i]];
  if (USE_EXT) s += extSum(P, O, base);
  return (s * 100) / 32;
}

// ------------------------------------------------------------------ search state
static double nodes, deadline; static int aborted;
static double MPC_T = 1.5, MPC_A = 357.32, MPC_B = 1.1, MPC_C = -3.14; static int MPC_ON = 1, MPC_MIN = 3;
static int T_EVALMIN = 12, T_SEARCHMIN = 14, T_SDEPTH = 1, T_KE = 8;
EXPORT(set_state) void set_state(double n, double dl, int mpcOn, double t, double a, double b, double c, int minDepth, int evalMin, int searchMin, int sDepth, int kE) {
  nodes = n; deadline = dl; aborted = 0; MPC_ON = mpcOn; MPC_T = t; MPC_A = a; MPC_B = b; MPC_C = c; MPC_MIN = minDepth;
  T_EVALMIN = evalMin; T_SEARCHMIN = searchMin; T_SDEPTH = sDepth; T_KE = kE;
}
EXPORT(get_nodes) double get_nodes(void) { return nodes; }
EXPORT(get_aborted) int get_aborted(void) { return aborted; }
static inline void checkTime(void) { if (deadline > 0 && now() > deadline) aborted = 1; }

#define TT_SIZE (1 << 20)
#define TT_MASK (TT_SIZE - 1)
static u64 TKP[TT_SIZE], TKO[TT_SIZE]; static i16 T_LO[TT_SIZE], T_HI[TT_SIZE]; static i8 T_D[TT_SIZE], T_M[TT_SIZE];
#define ET_SIZE (1 << 19)
#define ET_MASK (ET_SIZE - 1)
static u64 EKP[ET_SIZE], EKO[ET_SIZE]; static i8 E_LO[ET_SIZE], E_HI[ET_SIZE], E_M[ET_SIZE]; static u8 E_V[ET_SIZE];
static u32 hash(u64 P, u64 O) {   // = engine.js hash on the four 32-bit halves
  u32 pl = (u32)P, ph = (u32)(P >> 32), ol = (u32)O, oh = (u32)(O >> 32);
  u32 h = ((pl ^ 0x9E3779B9u) * 0x85EBCA6Bu) ^ ((ph + 0x7F4A7C15u) * 0xC2B2AE35u) ^ ((ol ^ 0x165667B1u) * 0x27D4EB2Fu) ^ ((oh + 0x61C88647u) * 0x9E3779B1u);
  h ^= h >> 15; h *= 0x2C1B3C6Du; h ^= h >> 12; h *= 0x297A2D39u; h ^= h >> 15;
  return h;
}
EXPORT(clear_tt) void clear_tt(void) {
  for (int i = 0; i < TT_SIZE; i++) { T_D[i] = -1; T_M[i] = -1; }
  for (int i = 0; i < ET_SIZE; i++) { E_V[i] = 0; E_M[i] = -1; }
}
static const i16 SQV[64] = {
  100, -20, 10, 5, 5, 10, -20, 100, -20, -50, -2, -2, -2, -2, -50, -20, 10, -2, 1, 1, 1, 1, -2, 10, 5, -2, 1, 0, 0, 1, -2, 5,
  5, -2, 1, 0, 0, 1, -2, 5, 10, -2, 1, 1, 1, 1, -2, 10, -20, -50, -2, -2, -2, -2, -50, -20, 100, -20, 10, 5, 5, 10, -20, 100 };
#define MAXPLY 64
static i8 MV[MAXPLY * 36]; static int SC[MAXPLY * 36];
static void sortMoves(int base, int n) {
  for (int i = 1; i < n; i++) {
    int m = MV[base + i], s = SC[base + i], j = i - 1;
    while (j >= 0 && SC[base + j] < s) { MV[base + j + 1] = MV[base + j]; SC[base + j + 1] = SC[base + j]; j--; }
    MV[base + j + 1] = (i8)m; SC[base + j + 1] = s;
  }
}

// ------------------------------------------------------------------ midgame PVS
static int searchI(u64 P, u64 O, int depth, int alpha, int beta, int ply, int passed) {
  if (((long long)(++nodes) & 4095) == 0) { checkTime(); if (aborted) return 0; }
  if (depth <= 0) return evalAt(ply, P, O);
  u32 h = hash(P, O); int ti = h & TT_MASK, ttMove = -1;
  if (TKP[ti] == P && TKO[ti] == O && T_D[ti] >= 0) {
    ttMove = T_M[ti];
    if (T_D[ti] >= depth) {
      int lo = T_LO[ti], hi = T_HI[ti];
      if (lo >= beta) return lo;
      if (hi <= alpha) return hi;
      if (lo == hi) return lo;
      if (lo > alpha) alpha = lo;
      if (hi < beta) beta = hi;
    }
  }
  u64 m = genMoves(P, O);
  if (!m) {
    if (passed) return finalScore(P, O) * 100;
    if (!genMoves(O, P)) return finalScore(P, O) * 100;
    passIdx(ply);
    int v = -searchI(O, P, depth, -beta, -alpha, ply + 1, 1);
    return aborted ? 0 : v;
  }
  if (MPC_ON && depth >= MPC_MIN && beta - alpha == 1 && MPC_A > 0) {
    int empties = 64 - pc(P | O), ds = 2 * (depth >> 2) + (depth & 1);
    int sig = (int)(MPC_T * (MPC_A + MPC_B * depth + MPC_C * empties)), hb = beta + sig;
    if (hb < 30000) {
      int v = ds == 0 ? evalAt(ply, P, O) : searchI(P, O, ds, hb - 1, hb, ply, passed);
      if (aborted) return 0;
      if (v >= hb) return beta;
    }
    int lb = alpha - sig;
    if (lb > -30000) {
      int v = ds == 0 ? evalAt(ply, P, O) : searchI(P, O, ds, lb, lb + 1, ply, passed);
      if (aborted) return 0;
      if (v <= lb) return alpha;
    }
  }
  int base = ply * 36, n = 0;
  int ordDepth = depth >= 9 ? 3 : depth >= 6 ? 2 : depth >= 4 ? 1 : depth >= 3 ? 0 : -1;
  for (u64 x = m; x; x &= x - 1) MV[base + n++] = (i8)lsb(x);
  for (int i = 0; i < n; i++) {
    int s = MV[base + i], sc;
    if (s == ttMove) sc = 1 << 29;
    else if (ordDepth < 0) sc = SQV[s];
    else {
      u64 f = flips(s, P, O), nP = P | f | (1ULL << s), nO = O & ~f;
      childIdx(ply, s, f);
      if (ordDepth == 0) sc = -evalAt(ply + 1, nO, nP);
      else { sc = -searchI(nO, nP, ordDepth, -32000, 32000, ply + 1, 0); if (aborted) return 0; }
    }
    SC[base + i] = sc;
  }
  sortMoves(base, n);
  int alpha0 = alpha, best = -32767, bestMove = MV[base];
  for (int i = 0; i < n; i++) {
    int s = MV[base + i];
    u64 f = flips(s, P, O), nP = P | f | (1ULL << s), nO = O & ~f;
    childIdx(ply, s, f);
    int v;
    if (i == 0) v = -searchI(nO, nP, depth - 1, -beta, -alpha, ply + 1, 0);
    else {
      v = -searchI(nO, nP, depth - 1, -alpha - 1, -alpha, ply + 1, 0);
      if (aborted) return 0;
      if (v > alpha && v < beta) v = -searchI(nO, nP, depth - 1, -beta, -v, ply + 1, 0);
    }
    if (aborted) return 0;
    if (v > best) { best = v; bestMove = s; if (v > alpha) { alpha = v; if (alpha >= beta) break; } }
  }
  if (T_D[ti] <= depth || !(TKP[ti] == P && TKO[ti] == O)) {
    TKP[ti] = P; TKO[ti] = O; T_D[ti] = (i8)depth; T_M[ti] = (i8)bestMove;
    T_LO[ti] = (i16)(best > alpha0 ? best : -32767); T_HI[ti] = (i16)(best < beta ? best : 32767);
  }
  return best;
}
static int searchE(u64 P, u64 O, int depth, int alpha, int beta, int ply, int passed) { initIdx(ply, P, O); return searchI(P, O, depth, alpha, beta, ply, passed); }


// ------------------------------------------------------------------ stability (endgame cutoff): discs of X that can never be flipped
#define COLA 0x0101010101010101ULL
#define COLH 0x8080808080808080ULL
#define ROW1 0x00000000000000FFULL
#define ROW8 0xFF00000000000000ULL
static u64 DIAG7M[15], DIAG9M[15];
static void initDiag(void) {
  for (int s = 0; s < 64; s++) { int r = s >> 3, c = s & 7; DIAG9M[r - c + 7] |= 1ULL << s; DIAG7M[r + c] |= 1ULL << s; }
}
static u64 stableOf(u64 X, u64 filled) {
  u64 fh = 0, fv = 0, f7 = 0, f9 = 0;
  for (int r = 0; r < 8; r++) { u64 m = ROW1 << (8 * r); if ((filled & m) == m) fh |= m; }
  for (int c = 0; c < 8; c++) { u64 m = COLA << c; if ((filled & m) == m) fv |= m; }
  for (int d = 0; d < 15; d++) { if ((filled & DIAG7M[d]) == DIAG7M[d]) f7 |= DIAG7M[d]; if ((filled & DIAG9M[d]) == DIAG9M[d]) f9 |= DIAG9M[d]; }
  const u64 B = ROW1 | ROW8 | COLA | COLH;
  u64 st = 0, prev;
  do {
    prev = st;
    u64 sh = fh | COLA | COLH | ((st >> 1) & ~COLH) | ((st << 1) & ~COLA);
    u64 sv = fv | ROW1 | ROW8 | (st >> 8) | (st << 8);
    u64 s9 = f9 | B | ((st >> 9) & ~COLH) | ((st << 9) & ~COLA);
    u64 s7 = f7 | B | ((st >> 7) & ~COLA) | ((st << 7) & ~COLH);
    st |= X & sh & sv & s9 & s7;
  } while (st != prev);
  return st;
}

// ------------------------------------------------------------------ endgame solver
static i8 QUAD[64];
static const u64 QMASK[4] = { 0x0F0F0F0FULL, 0xF0F0F0F0ULL, 0x0F0F0F0FULL << 32, 0xF0F0F0F0ULL << 32 };
static int solveLast1(u64 P, u64 O) {   // one empty square: play it if possible (else the opponent, else nobody)
  ++nodes;
  const u64 E = ~(P | O); const int s = lsb(E);
  u64 f = flips(s, P, O);
  if (f) return pc(P) - pc(O) + 1 + 2 * pc(f);
  ++nodes;   // (the pass node of the generic solver)
  f = flips(s, O, P);
  if (f) return pc(P) - pc(O) - 1 - 2 * pc(f);
  int d = pc(P) - pc(O); return d > 0 ? d + 1 : d < 0 ? d - 1 : 0;
}
static u64 NEIGH[64];   // the 8 squares around each square
static int solveSmall(u64 P, u64 O, int alpha, int beta, int empties, int passed) {
  if (empties == 1 && !passed) return solveLast1(P, O);
  ++nodes;
  const u64 E = ~(P | O); int best = -99, moved = 0;
  u64 odd = 0;   // the empty squares in quadrants with an odd number of empties (searched first)
  for (int q = 0; q < 4; q++) if (pc(E & QMASK[q]) & 1) odd |= QMASK[q];
  const u64 cand = E & neighbours(O);   // a move must touch an opponent disc
  for (int pass = 0; pass < 2; pass++) {
    for (u64 x = cand & (pass ? ~odd : odd); x; x &= x - 1) {
      int s = lsb(x);
      u64 f = flips(s, P, O); if (!f) continue;
      moved = 1;
      u64 nP = P | f | (1ULL << s), nO = O & ~f; int v;
      if (empties == 1) v = discDiff(nP, nO);
      else if (empties == 2) v = -solveLast1(nO, nP);
      else v = -solveSmall(nO, nP, -beta, -alpha, empties - 1, 0);
      if (v > best) { best = v; if (v > alpha) { alpha = v; if (alpha >= beta) return best; } }
    }
  }
  if (!moved) {
    if (passed) return finalScore(P, O);
    return -solveSmall(O, P, -beta, -alpha, empties, 1);
  }
  return best;
}
static int STAB_ON = 1, STAB_MIN = 0;
EXPORT(set_stab) void set_stab(int on, int mn) { STAB_ON = on; STAB_MIN = mn; }
static int solve(u64 P, u64 O, int alpha, int beta, int empties, int ply, int passed) {
  if (empties <= 6) return solveSmall(P, O, alpha, beta, empties, passed);
  if (((long long)(++nodes) & 16383) == 0) { checkTime(); if (aborted) return 0; }
  int ti = -1, ttMove = -1;
  if (empties >= 10) {
    ti = hash(P, O) & ET_MASK;
    if (E_V[ti] && EKP[ti] == P && EKO[ti] == O) {
      int lo = E_LO[ti], hi = E_HI[ti];
      if (lo >= beta) return lo;
      if (hi <= alpha) return hi;
      if (lo == hi) return lo;
      if (lo > alpha) alpha = lo;
      if (hi < beta) beta = hi;
      ttMove = E_M[ti];
    }
  }
  if (STAB_ON && alpha >= STAB_MIN) {   // the opponent's stable discs bound our score from above
    int bound = 64 - 2 * pc(stableOf(O, P | O));
    if (bound <= alpha) return bound;
    if (bound < beta) beta = bound;
  }
  u64 m = genMoves(P, O);
  if (!m) {
    if (passed) return finalScore(P, O);
    if (!genMoves(O, P)) return finalScore(P, O);
    int v = -solve(O, P, -beta, -alpha, empties, ply + 1, 1);
    return aborted ? 0 : v;
  }
  int base = ply * 36, n = 0, etc = empties >= 15;
  for (u64 x = m; x; x &= x - 1) MV[base + n++] = (i8)lsb(x);
  for (int i = 0; i < n; i++) {
    int s = MV[base + i];
    u64 f = flips(s, P, O), nP = P | f | (1ULL << s), nO = O & ~f;
    if (etc) {
      int ci = hash(nO, nP) & ET_MASK;
      if (E_V[ci] && EKP[ci] == nO && EKO[ci] == nP && -E_HI[ci] >= beta) return -E_HI[ci];
    }
    if (s == ttMove) { SC[base + i] = 1 << 29; continue; }
    u64 om = genMoves(nO, nP);
    int sc = -(pc(om) + 2 * pc(om & 0x8100000000000081ULL)) * 64;
    if (empties > 14) sc -= pc(neighbours(nP) & ~(nP | nO)) * 8;
    sc += SQV[s];
    if (empties >= T_EVALMIN) {
      if (empties >= T_SEARCHMIN) { int v = searchE(nO, nP, T_SDEPTH, -32000, 32000, ply + 1, 0); if (aborted) return 0; sc -= (v * T_KE) >> 4; }
      else sc -= (evalFull(nO, nP) * T_KE) >> 4;
    }
    SC[base + i] = sc;
  }
  sortMoves(base, n);
  int alpha0 = alpha, best = -99, bestMove = MV[base];
  for (int i = 0; i < n; i++) {
    int s = MV[base + i];
    u64 f = flips(s, P, O), nP = P | f | (1ULL << s), nO = O & ~f; int v;
    if (i == 0) v = -solve(nO, nP, -beta, -alpha, empties - 1, ply + 1, 0);
    else {
      v = -solve(nO, nP, -alpha - 1, -alpha, empties - 1, ply + 1, 0);
      if (aborted) return 0;
      if (v > alpha && v < beta) v = -solve(nO, nP, -beta, -v, empties - 1, ply + 1, 0);
    }
    if (aborted) return 0;
    if (v > best) { best = v; bestMove = s; if (v > alpha) { alpha = v; if (alpha >= beta) break; } }
  }
  if (ti >= 0) {
    EKP[ti] = P; EKO[ti] = O; E_V[ti] = 1; E_M[ti] = (i8)bestMove;
    E_LO[ti] = (i8)(best > alpha0 ? best : -99); E_HI[ti] = (i8)(best < beta ? best : 99);
  }
  return best;
}

// ------------------------------------------------------------------ exports (boards as 32-bit halves, as in engine.js)
static inline u64 B(u32 l, u32 h) { return (u64)h << 32 | l; }
EXPORT(search) int search(u32 pl, u32 ph, u32 ol, u32 oh, int depth, int alpha, int beta, int ply, int passed) { return searchE(B(pl, ph), B(ol, oh), depth, alpha, beta, ply, passed); }
EXPORT(solve_) int solve_(u32 pl, u32 ph, u32 ol, u32 oh, int alpha, int beta, int empties, int ply, int passed) { return solve(B(pl, ph), B(ol, oh), alpha, beta, empties, ply, passed); }
EXPORT(evaluate) int evaluate(u32 pl, u32 ph, u32 ol, u32 oh) { return evalFull(B(pl, ph), B(ol, oh)); }
EXPORT(init) void init(void) {
  initRays(); initDiag();
  for (int s = 0; s < 64; s++) QUAD[s] = (i8)(((s >> 5) << 1) | ((s & 7) >> 2));
  clear_tt();
}
