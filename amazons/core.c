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
typedef signed char i8; typedef unsigned char u8;
i8 SQ[NN]; i8 Q[8];
int OM[8192]; int OS[8192];
static int evn = 0;
static u8 PI[NN]; static int OFF[8] = { -PW, PW, -1, 1, -PW - 1, -PW + 1, PW - 1, PW + 1 };
static i8 PB[PN]; static u8 PQ[8];
static u8 DA[PN], DB[PN], KA[PN], KB[PN], QU[PN + 8];
static double P2N[INF + 2];
static int RAY[NN][8][10], RAYN[NN][8], NBS[NN][8], NBN[NN];
static int inited = 0;
static void init(void) {
  if (inited) return; inited = 1;
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
typedef unsigned long long u64;
typedef struct { u64 lo, hi; } BB;
static inline BB bor(BB a, BB b) { BB r = { a.lo | b.lo, a.hi | b.hi }; return r; }
static inline BB band(BB a, BB b) { BB r = { a.lo & b.lo, a.hi & b.hi }; return r; }
static inline BB bandn(BB a, BB b) { BB r = { a.lo & ~b.lo, a.hi & ~b.hi }; return r; }
static inline int bnz(BB a) { return (a.lo | a.hi) != 0; }
static inline BB shl(BB x, int n) { BB r = { x.lo << n, (x.hi << n) | (x.lo >> (64 - n)) }; return r; }
static inline BB shr(BB x, int n) { BB r = { (x.lo >> n) | (x.hi << (64 - n)), x.hi >> n }; return r; }
static const BB Z0 = { 0, 0 };
static BB BIT[NN];
static int bbInit = 0;
static void initBB(void) { if (bbInit) return; bbInit = 1; for (int i = 0; i < NN; i++) { int b = (i / 10) * 11 + i % 10; BIT[i].lo = b < 64 ? 1ULL << b : 0; BIT[i].hi = b >= 64 ? 1ULL << (b - 64) : 0; } }
static inline BB sh(BB x, int d) {   // the 8 directions in the order of OFF: N S W E NW NE SW SE
  switch (d) { case 0: return shr(x, 11); case 1: return shl(x, 11); case 2: return shr(x, 1); case 3: return shl(x, 1);
    case 4: return shr(x, 12); case 5: return shr(x, 10); case 6: return shl(x, 10); default: return shl(x, 12); }
}
static inline int pc(BB x) { return __builtin_popcountll(x.lo) + __builtin_popcountll(x.hi); }
#define ML 99
static BB LA[ML], LB[ML];
static int CQ[ML * ML], OA[ML], OB[ML];
// distance layers: L[k] = the empty squares first reached in k queen (king) moves from the sources S; returns the last level
static int layersQ(BB S, BB E, BB *L) {
  BB seen = S, fr = S; int k = 0;
  while (bnz(fr) && k < ML - 1) {
    BB nx = Z0;
    for (int d = 0; d < 8; d++) { BB g = band(sh(fr, d), E); while (bnz(g)) { nx = bor(nx, g); g = band(sh(g, d), E); } }
    nx = bandn(nx, seen); if (!bnz(nx)) break;
    L[++k] = nx; seen = bor(seen, nx); fr = nx;
  }
  return k;
}
static int layersK(BB S, BB E, BB *L) {
  BB seen = S, fr = S; int k = 0;
  while (bnz(fr) && k < ML - 1) {
    BB nx = Z0;
    for (int d = 0; d < 8; d++) nx = bor(nx, sh(fr, d));
    nx = bandn(band(nx, E), seen); if (!bnz(nx)) break;
    L[++k] = nx; seen = bor(seen, nx); fr = nx;
  }
  return k;
}
static void counts(int La, int Lb) {
  BB allA = Z0, allB = Z0;
  for (int i = 1; i <= La; i++) allA = bor(allA, LA[i]);
  for (int j = 1; j <= Lb; j++) allB = bor(allB, LB[j]);
  for (int i = 0; i <= La; i++) OA[i] = i ? pc(bandn(LA[i], allB)) : 0;
  for (int j = 0; j <= Lb; j++) OB[j] = j ? pc(bandn(LB[j], allA)) : 0;
  for (int i = 0; i <= La; i++) for (int j = 0; j <= Lb; j++) CQ[i * ML + j] = i && j ? pc(band(LA[i], LB[j])) : 0;
}
static double CS0, CS1, CS2;
static double clamp6(int d) { double x = (double)d / 6; return x > 1 ? 1 : x < -1 ? -1 : x; }
static void fromCounts(int La, int Lb, double kap, int kind) {   // (fromCounts in engine.js, the same order)
  int nA = 0, nB = 0, nT = 0; double cc = 0, ww = 0;
  for (int i = 0; i <= La; i++) for (int j = 0; j <= Lb; j++) { int c = CQ[i * ML + j]; if (!c) continue; if (i < j) nA += c; else if (j < i) nB += c; else nT += c; }
  int sa = 0, sb = 0;
  for (int i = 0; i <= La; i++) sa += OA[i];
  for (int j = 0; j <= Lb; j++) sb += OB[j];
  nA += sa; nB += sb;
  if (kind == 0) {
    int L = La > Lb ? La : Lb;
    for (int k = 0; k <= L; k++) {
      int ra = k <= La ? OA[k] : 0, cb = k <= Lb ? OB[k] : 0;
      if (k <= La) for (int j = 0; j <= Lb; j++) ra += CQ[k * ML + j];
      if (k <= Lb) for (int i = 0; i <= La; i++) cb += CQ[i * ML + k];
      cc += (ra - cb) * P2N[k];
    }
    for (int i = 0; i <= La; i++) for (int j = 0; j <= Lb; j++) { int c = CQ[i * ML + j]; if (c) ww += c * P2N[i > j ? i - j : j - i]; }
  } else {
    for (int i = 0; i <= La; i++) for (int j = 0; j <= Lb; j++) { int c = CQ[i * ML + j]; if (c) cc += c * clamp6(j - i); }
    cc += sa; cc -= sb;
  }
  CS0 = (nA - nB) + kap * nT; CS1 = cc; CS2 = ww;
}
// the value for `me` with `toMove` to move (evalFor in engine.js)
__attribute__((export_name("ev"))) int ev(int me, int toMove) {
  init(); initBB(); evn++;
  BB E = Z0, SA = Z0, SB = Z0;
  for (int i = 0; i < NN; i++) if (!SQ[i]) E = bor(E, BIT[i]);
  for (int k = 0; k < 8; k++) if (Q[k] >= 0) { if (k < 4) SA = bor(SA, BIT[(int)Q[k]]); else SB = bor(SB, BIT[(int)Q[k]]); }
  double kap = toMove == 1 ? 0.05 : -0.05;
  int La = layersQ(SA, E, LA), Lb = layersQ(SB, E, LB);
  counts(La, Lb); fromCounts(La, Lb, kap, 0);
  double t1 = CS0, c1 = CS1, w = CS2, t2 = 0, c2 = 0;
  double e = w > 40 ? 1 : w / 40;
  if (e > 0) {
    La = layersK(SA, E, LA); Lb = layersK(SB, E, LB);
    counts(La, Lb); fromCounts(La, Lb, kap, 1);
    t2 = CS0; c2 = CS1;
  }
  double mob = 0;
  for (int k = 0; k < 8; k++) {
    if (Q[k] < 0) continue;
    BB s = BIT[(int)Q[k]]; int n = 0;
    for (int d = 0; d < 8; d++) { BB g = band(sh(s, d), E); while (bnz(g)) { n++; g = band(sh(g, d), E); } }
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
static int QM[2048], QS[2048];
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
  int keep = nq < qkeep ? nq : qkeep;
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
