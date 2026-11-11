/*
 * わからせ将棋オーバーキル！ — the AI engine (WebAssembly). claude/overkill-spec.md §6.
 * The search and the evaluation follow the shogi engine (shogi/engine.c): the same NNUE net (shogi/nnue.bin.gz, 2534 inputs, the
 * hidden size H fixed at build time) evaluates the standard pieces, alpha-beta with a transposition table, PVS, null move, LMR,
 * killers / history and a capture quiescence. The board layer is new: a table-driven move generator for the standard pieces and the
 * 18 special pieces with their abilities (shoot, fire, 居食い, alchemy, revival, the bomber's blast, the barrier, the body double).
 * Special pieces are not seen by the net (it never saw them): they add their value and a pull towards the enemy royal.
 * The rules are those of overkill/engine.js (the page's referee); the page checks every move the engine returns against it.
 *
 * Build: overkill/tools/build-wasm.sh
 */
typedef signed char i8;
typedef unsigned char u8;
typedef short i16;
typedef int i32;
typedef unsigned int u32;
typedef unsigned long long u64;

#ifdef __wasm_simd128__
#include <wasm_simd128.h>
#endif
#define EXPORT(name) __attribute__((export_name(#name)))
#define IMPORT(name) __attribute__((import_module("env"), import_name(#name)))
IMPORT(now) double js_now(void);
void *memset(void *d, int c, unsigned long n) { u8 *p = d; while (n--) *p++ = (u8)c; return d; }
void *memcpy(void *d, const void *s, unsigned long n) { u8 *p = d; const u8 *q = s; while (n--) *p++ = *q++; return d; }

/* ------------------------------------------------------------------ pieces */
enum { FU = 1, KY, KE, GI, KA, HI, KI, OU, TO, NY, NK, NG, UM, RY,
  PAWN, KNIGHT, BISHOP, ROOK, QUEEN, AMAZON, CANNON, LION, ARCHER, MUSKET, MERC, BARRIER, BOMBER, ALCH, SAGE, CHRONO, KAGE, GENERAL, NT };
#define WF 64
#define CO(p) ((p) >> 6)
#define TY(p) ((p) & 63)
#define ISSTD(t) ((t) >= 1 && (t) <= RY)
#define ROYAL(t) ((t) == OU || (t) == KAGE)
#define F_MOVED 1
#define F_USED 2
static const i8 PROMO[NT] = {0, TO, NY, NK, NG, UM, RY};
static const i8 UNPRO[NT] = {0, FU, KY, KE, GI, KA, HI, KI, OU, FU, KY, KE, GI, KA, HI};
/* order values (the net's centipawns) and the special pieces' evaluation values */
static const i32 VAL[NT] = {0, 90, 315, 405, 495, 855, 990, 540, 15000, 540, 540, 540, 540, 945, 1395,
  135, 560, 740, 870, 1600, 2200, 650, 1700, 820, 340, 560, 580, 380, 580, 740, 580, 2400, 580};

static const i32 DR[8] = {-1, -1, -1, 0, 0, 1, 1, 1}, DC[8] = {-1, 0, 1, -1, 1, -1, 0, 1};
static const i32 OPPD[8] = {7, 6, 5, 4, 3, 2, 1, 0};
static i8 NB[81 * 8];
static u8 STEPM[NT], SLIDEM[NT];   /* direction bit masks in Black's frame (dir 1 = forward) */
/* jump squares: KE by colour (forward 2, side 1), the chess knight's 8, the lion's 16 at distance two */
static i8 JKE[2][81][2], JKEn[2][81], JKEF[2][81][2], JKEFn[2][81], JN8[81][8], JN8n[81], JL16[81][16], JL16n[81];
static inline int inb(int r, int c) { return r >= 0 && r < 9 && c >= 0 && c < 9; }
#define INZONE(c, s) ((c) == 0 ? (s) < 27 : (s) >= 54)
static inline int dead(int c, int t, int s) {
  int r = s / 9, rr = c == 0 ? r : 8 - r;
  if (t == FU || t == KY || t == MUSKET || t == BOMBER) return rr == 0;
  if (t == KE) return rr <= 1;
  return 0;
}
static inline int fwdSq(int c, int s) { int r = s / 9 + (c ? 1 : -1); return r >= 0 && r < 9 ? r * 9 + s % 9 : -1; }

/* ------------------------------------------------------------------ position */
static i8 bd[81]; static u8 fl[81]; static i16 rdy[81];
static u8 hand[2][8];
static int side = 0, gply = 0;
static int king[2], kage[2], rc[2];   /* rc: royal count (a deck may hold more than one body double) */
static u64 hash;
static u64 ZB[81][128], ZF[81][4], ZH[2][8][20], ZS;
static i32 spMat[2];   /* the special pieces' values on the board, per colour */

/* the undo log */
#define LOGN 200000
typedef struct { i8 sq; i8 p; u8 f; i16 r; } LogE;   /* sq >= 0: a square; sq = -1 - (c * 8 + t): a hand count (p = old count) */
static LogE lg[LOGN]; static int lgTop = 0;
#define MAXL 160
static int lgAt[MAXL + 2]; static u64 hAt[MAXL + 2]; static int sideAt[MAXL + 2], plyAt[MAXL + 2], kAt[MAXL + 2][6], spmAt[MAXL + 2][2];
static int sp = 0;
static u64 pathH[MAXL + 2];

/* ------------------------------------------------------------------ NNUE (shogi/engine.c's layout; standard pieces only) */
#ifndef NUE_H
#define NUE_H 512
#endif
#define NUE_IN 2534
#define NUE_QA 127
#define NUE_QB 64
#define NN_K 600
static int nueOn = 0;
static i16 nueW1[NUE_IN * NUE_H], nueW2[2 * NUE_H];
static i32 nueB1[NUE_H], nueB2;
static i16 nueAc[MAXL + 2][2][NUE_H];
static u8 nueOk[MAXL + 2];
#define ND_MAX 48
static i16 nueDF[MAXL + 2][ND_MAX][2]; static i8 nueDS[MAXL + 2][ND_MAX]; static u8 nueDN[MAXL + 2];
static inline int nueB(int persp, int p, int s) { return ((CO(p) != persp) * 14 + TY(p) - 1) * 81 + (persp ? 80 - s : s); }
static inline int nueHd(int persp, int hc, int t, int n) { return n > 19 ? -1 : 2268 + ((hc != persp) * 7 + t - 1) * 19 + n - 1; }
static inline void nueRec(int f0, int f1, int sg) {
  if (!nueOn || sp < 1) return;
  int L = sp - 1, n = nueDN[L];
  if (n >= ND_MAX) { nueOk[sp] = 0; nueDN[L] = 255; return; }   /* (too many: the child is refreshed from the board) */
  if (n == 255) return;
  nueDF[L][n][0] = (i16)f0; nueDF[L][n][1] = (i16)f1; nueDS[L][n] = (i8)sg; nueDN[L] = n + 1;
}
static void nueRefresh(int L) {
  for (int c = 0; c < 2; c++) {
    i16 *a = nueAc[L][c];
    for (int j = 0; j < NUE_H; j++) a[j] = (i16)nueB1[j];
    for (int s = 0; s < 81; s++) { int p = bd[s]; if (p && ISSTD(TY(p))) { const i16 *w = nueW1 + nueB(c, p, s) * NUE_H; for (int j = 0; j < NUE_H; j++) a[j] += w[j]; } }
    for (int hc = 0; hc < 2; hc++) for (int t = 1; t <= 7; t++) for (int n = 1; n <= hand[hc][t]; n++) { int f = nueHd(c, hc, t, n); if (f < 0) continue; const i16 *w = nueW1 + f * NUE_H; for (int j = 0; j < NUE_H; j++) a[j] += w[j]; }
  }
  nueOk[L] = 1;
}
static void nueSync(void) {
  if (nueOk[sp]) return;
  int k = sp - 1; while (k > 0 && !nueOk[k]) k--;
  if (!nueOk[k]) { nueRefresh(sp); return; }
  for (int i = k; i < sp; i++) {
    if (nueDN[i] == 255) { nueRefresh(sp); return; }
  }
  for (int i = k; i < sp; i++) {
    for (int c = 0; c < 2; c++) {
      const i16 *src = nueAc[i][c]; i16 *dst = nueAc[i + 1][c];
      memcpy(dst, src, sizeof(i16) * NUE_H);
      for (int q = 0; q < nueDN[i]; q++) { int f = nueDF[i][q][c]; if (f < 0) continue; const i16 *w = nueW1 + f * NUE_H;
        if (nueDS[i][q] > 0) for (int j = 0; j < NUE_H; j++) dst[j] += w[j]; else for (int j = 0; j < NUE_H; j++) dst[j] -= w[j]; }
    }
    nueOk[i + 1] = 1;
  }
}
static double nueEval(void) {
  nueSync();
  const i16 *a = nueAc[sp][side], *b = nueAc[sp][side ^ 1];
  long long sum = 0;
#ifdef __wasm_simd128__
  {
    const v128_t lo = wasm_i16x8_splat(0), hi = wasm_i16x8_splat(NUE_QA); const i16 *w2 = nueW2;
    v128_t s64 = wasm_i64x2_splat(0);
    for (int i0 = 0; i0 < NUE_H; i0 += 16) {
      v128_t xa0 = wasm_i16x8_min(wasm_i16x8_max(wasm_v128_load(a + i0), lo), hi), xa1 = wasm_i16x8_min(wasm_i16x8_max(wasm_v128_load(a + i0 + 8), lo), hi);
      v128_t xb0 = wasm_i16x8_min(wasm_i16x8_max(wasm_v128_load(b + i0), lo), hi), xb1 = wasm_i16x8_min(wasm_i16x8_max(wasm_v128_load(b + i0 + 8), lo), hi);
      v128_t pa = wasm_i32x4_add(wasm_i32x4_dot_i16x8(wasm_i16x8_mul(xa0, xa0), wasm_v128_load(w2 + i0)), wasm_i32x4_dot_i16x8(wasm_i16x8_mul(xa1, xa1), wasm_v128_load(w2 + i0 + 8)));
      v128_t pb = wasm_i32x4_add(wasm_i32x4_dot_i16x8(wasm_i16x8_mul(xb0, xb0), wasm_v128_load(w2 + NUE_H + i0)), wasm_i32x4_dot_i16x8(wasm_i16x8_mul(xb1, xb1), wasm_v128_load(w2 + NUE_H + i0 + 8)));
      s64 = wasm_i64x2_add(s64, wasm_i64x2_add(wasm_i64x2_extend_low_i32x4(pa), wasm_i64x2_extend_high_i32x4(pa)));
      s64 = wasm_i64x2_add(s64, wasm_i64x2_add(wasm_i64x2_extend_low_i32x4(pb), wasm_i64x2_extend_high_i32x4(pb)));
    }
    sum = wasm_i64x2_extract_lane(s64, 0) + wasm_i64x2_extract_lane(s64, 1);
  }
  if (0)
#endif
  for (int i0 = 0; i0 < NUE_H; i0 += 16) {
    i32 part = 0;
    for (int i = i0; i < i0 + 16; i++) { i32 x = a[i] < 0 ? 0 : a[i] > NUE_QA ? NUE_QA : a[i]; part += x * x * nueW2[i]; }
    sum += part; part = 0;
    for (int i = i0; i < i0 + 16; i++) { i32 x = b[i] < 0 ? 0 : b[i] > NUE_QA ? NUE_QA : b[i]; part += x * x * nueW2[NUE_H + i]; }
    sum += part;
  }
  long long v = sum / NUE_QA + nueB2;
  return (double)v * NN_K / (NUE_QA * NUE_QB);
}
/* without the net: material */
static double matEval(void) {
  double v = 0;
  for (int s = 0; s < 81; s++) { int p = bd[s]; if (p && ISSTD(TY(p)) && TY(p) != OU) v += CO(p) == side ? VAL[TY(p)] : -VAL[TY(p)]; }
  for (int c = 0; c < 2; c++) for (int t = 1; t <= 7; t++) v += (c == side ? 1.1 : -1.1) * VAL[t] * hand[c][t];
  return v;
}
static inline int cheb(int a, int b) { int dr = a / 9 - b / 9, dc = a % 9 - b % 9; if (dr < 0) dr = -dr; if (dc < 0) dc = -dc; return dr > dc ? dr : dc; }
static double evaluate(void) {
  double v = nueOn ? nueEval() : matEval();
  /* the special pieces: value, a pull towards the enemy royal, the pawn's march */
  double s2 = (double)(spMat[side] - spMat[side ^ 1]);
  for (int s = 0; s < 81; s++) {
    int p = bd[s]; if (!p) continue; int t = TY(p); if (ISSTD(t)) continue;
    int c = CO(p), ek = king[c ^ 1] >= 0 ? king[c ^ 1] : kage[c ^ 1]; double b = 0;
    if (ek >= 0 && !ROYAL(t)) b += (8 - cheb(s, ek)) * (VAL[t] > 1000 ? 9 : VAL[t] > 600 ? 6 : 3);
    if (t == PAWN) { int adv = c ? s / 9 : 8 - s / 9; b += adv * 12; }
    if (t == MUSKET && (fl[s] & F_USED)) b -= 150;
    s2 += c == side ? b : -b;
  }
  return v + s2;
}

/* ------------------------------------------------------------------ board changes (logged, hashed, fed to the net) */
static void setSq(int s, int p, int f, int r) {
  int o = bd[s];
  LogE *e = &lg[lgTop++]; e->sq = (i8)s; e->p = (i8)o; e->f = fl[s]; e->r = rdy[s];
  hash ^= ZB[s][o & 127] ^ ZB[s][p & 127] ^ ZF[s][fl[s] & 3] ^ ZF[s][f & 3];
  if (o) { int t = TY(o), c = CO(o);
    if (ISSTD(t)) nueRec(nueB(0, o, s), nueB(1, o, s), -1); else spMat[c] -= VAL[t];
    if (t == OU && king[c] == s) king[c] = -1; if (t == KAGE && kage[c] == s) kage[c] = -1; if (ROYAL(t)) rc[c]--; }
  if (p) { int t = TY(p), c = CO(p);
    if (ISSTD(t)) nueRec(nueB(0, p, s), nueB(1, p, s), 1); else spMat[c] += VAL[t];
    if (t == OU) king[c] = s; if (t == KAGE) kage[c] = s; if (ROYAL(t)) rc[c]++; }
  bd[s] = (i8)p; fl[s] = (u8)f; rdy[s] = (i16)r;
}
static void setHand(int c, int t, int n) {
  int o = hand[c][t];
  LogE *e = &lg[lgTop++]; e->sq = (i8)(-1 - (c * 8 + t)); e->p = (i8)o;
  hash ^= ZH[c][t][o] ^ ZH[c][t][n];
  if (n > o) for (int k = o + 1; k <= n; k++) nueRec(nueHd(0, c, t, k), nueHd(1, c, t, k), 1);
  else for (int k = n + 1; k <= o; k++) nueRec(nueHd(0, c, t, k), nueHd(1, c, t, k), -1);
  hand[c][t] = (u8)n;
}
static void push(void) {
  sp++; lgAt[sp] = lgTop; hAt[sp] = hash; sideAt[sp] = side; plyAt[sp] = gply;
  kAt[sp][0] = king[0]; kAt[sp][1] = king[1]; kAt[sp][2] = kage[0]; kAt[sp][3] = kage[1]; kAt[sp][4] = rc[0]; kAt[sp][5] = rc[1]; spmAt[sp][0] = spMat[0]; spmAt[sp][1] = spMat[1];
  nueOk[sp] = 0; nueDN[sp - 1] = 0;
}
static void undo(void) {
  while (lgTop > lgAt[sp]) { LogE *e = &lg[--lgTop];
    if (e->sq >= 0) { bd[e->sq] = e->p; fl[e->sq] = e->f; rdy[e->sq] = e->r; }
    else { int k = -1 - e->sq; hand[k / 8][k % 8] = (u8)e->p; } }
  hash = hAt[sp]; side = sideAt[sp]; gply = plyAt[sp];
  king[0] = kAt[sp][0]; king[1] = kAt[sp][1]; kage[0] = kAt[sp][2]; kage[1] = kAt[sp][3]; rc[0] = kAt[sp][4]; rc[1] = kAt[sp][5]; spMat[0] = spmAt[sp][0]; spMat[1] = spmAt[sp][1];
  sp--;
}

/* ------------------------------------------------------------------ moves
   bits 0-6 to, 7-13 from (127 none), 14-20 x (ability target), 21-23 kind, 24 promote, 25-30 type (drop / revive) */
enum { K_MOVE, K_DROP, K_SHOOT, K_FIRE, K_ALCH, K_REVIVE };
#define MV(to, from, x, k, pr, t) ((to) | ((from) << 7) | ((x) << 14) | ((k) << 21) | ((pr) << 24) | ((t) << 25))
#define mTo(m) ((m) & 127)
#define mFrom(m) (((m) >> 7) & 127)
#define mX(m) (((m) >> 14) & 127)
#define mK(m) (((m) >> 21) & 7)
#define mPr(m) (((m) >> 24) & 1)
#define mT(m) (((m) >> 25) & 63)

static void explode(int s) {
  int r = s / 9, c = s % 9;
  for (int dr = -1; dr <= 1; dr++) for (int dc = -1; dc <= 1; dc++) {
    if (!inb(r + dr, c + dc)) continue; int q = (r + dr) * 9 + c + dc, p = bd[q];
    if (p && !ROYAL(TY(p))) setSq(q, 0, 0, 0);
  }
}
/* returns 1 when the captured piece was a bomber (it went off) */
static int capture(int s, int by) {
  int q = bd[s], t = TY(q);
  setSq(s, 0, 0, 0);
  if (ISSTD(t) && t != OU) { int u = UNPRO[t]; setHand(by, u, hand[by][u] + 1); }
  if (t == BOMBER) { explode(s); return 1; }
  return 0;
}
static void doMove(int m) {
  push();
  const int us = side, to = mTo(m), from = mFrom(m), k = mK(m);
  if (k == K_MOVE) {
    int p = bd[from], f = fl[from], r = rdy[from], blown = 0;
    if (bd[to]) blown = capture(to, us);
    if (bd[from] == p) setSq(from, 0, 0, 0);
    int t = TY(p), np = p;
    if (mPr(m)) np = (t == PAWN ? QUEEN : PROMO[t]) | (us * WF);
    if (t == PAWN) f |= F_MOVED;
    if (!(blown && !ROYAL(t))) setSq(to, np, f, r);
  } else if (k == K_DROP) { int t = mT(m); setHand(us, t, hand[us][t] - 1); setSq(to, t | (us * WF), 0, 0); }
  else if (k == K_SHOOT) capture(mX(m), us);
  else if (k == K_FIRE) { capture(mX(m), us); if (bd[from]) setSq(from, FU | (us * WF), 0, 0); }
  else if (k == K_ALCH) { setSq(mX(m), KI | (us * WF), 0, 0); setSq(from, bd[from], fl[from], gply + 12); }
  else if (k == K_REVIVE) { int t = mT(m); setHand(us ^ 1, t, hand[us ^ 1][t] - 1); setSq(to, t | (us * WF), 0, 0); setSq(from, bd[from], fl[from], gply + 10); }
  side ^= 1; gply++; hash ^= ZS;
  pathH[sp] = hash;
}
static void doNull(void) { push(); side ^= 1; hash ^= ZS; pathH[sp] = hash; }

/* is square s attacked by colour by? */
static int attacked(int s, int by) {
  const int r0 = s / 9, c0 = s % 9;
  for (int d = 0; d < 8; d++) {
    int r = r0 + DR[d], c = c0 + DC[d], k = 1;
    while (inb(r, c)) {
      int p = bd[r * 9 + c];
      if (p) {
        if (CO(p) == by) {
          int t = TY(p), fd = OPPD[d], bdd = by ? OPPD[fd] : fd;
          if (k == 1 && ((STEPM[t] >> bdd) & 1)) return 1;
          if ((SLIDEM[t] >> bdd) & 1) return 1;
          if (t == ARCHER && k == 2 && bdd == 1) return 1;
          if (t == MUSKET && bdd == 1 && !(fl[r * 9 + c] & F_USED)) return 1;
        }
        if (d == 1 || d == 3 || d == 4 || d == 6) {   /* a cannon behind this screen */
          int rr = r + DR[d], cc = c + DC[d];
          while (inb(rr, cc)) { int q = bd[rr * 9 + cc]; if (q) { if (CO(q) == by && TY(q) == CANNON) return 1; break; } rr += DR[d]; cc += DC[d]; }
        }
        break;
      }
      r += DR[d]; c += DC[d]; k++;
    }
  }
  for (int i = 0; i < JKEFn[by][s]; i++) { int p = bd[JKEF[by][s][i]]; if (p && CO(p) == by && TY(p) == KE) return 1; }
  for (int i = 0; i < JN8n[s]; i++) { int p = bd[JN8[s][i]]; if (p && CO(p) == by && (TY(p) == KNIGHT || TY(p) == AMAZON)) return 1; }
  for (int i = 0; i < JL16n[s]; i++) { int p = bd[JL16[s][i]]; if (p && CO(p) == by && TY(p) == LION) return 1; }
  return 0;
}
static inline int nRoyal(int c) { return rc[c]; }
static int royalSq(int c) {   /* the square of c's only royal */
  if (king[c] >= 0) return king[c]; if (kage[c] >= 0 && TY(bd[kage[c]]) == KAGE && CO(bd[kage[c]]) == c) return kage[c];
  for (int s = 0; s < 81; s++) { int p = bd[s]; if (p && CO(p) == c && ROYAL(TY(p))) return s; } return -1;
}
static int inCheck(int c) {
  int n = nRoyal(c); if (n != 1) return n == 0;
  return attacked(royalSq(c), c ^ 1);
}
/* after a move by c: is c's position legal (its only royal not attacked; none lost) */
static int legalFor(int c) { int n = nRoyal(c); if (n == 0) return 0; if (n >= 2) return 1; return !attacked(royalSq(c), c ^ 1); }

static int nifu(int c, int col) { for (int r = 0; r < 9; r++) { int p = bd[r * 9 + col]; if (p && CO(p) == c && TY(p) == FU) return 1; } return 0; }
static inline int addMv(i32 *l, int n, int from, int to, int t, int us, int capOnly) {
  int cap = bd[to] != 0;
  if (PROMO[t < 7 ? t : 0] && t <= HI && (INZONE(us, from) || INZONE(us, to))) {
    l[n++] = MV(to, from, 0, K_MOVE, 1, 0);
    if (!capOnly && !dead(us, t, to) && t != FU && t != KA && t != HI) l[n++] = MV(to, from, 0, K_MOVE, 0, 0);
    return n;
  }
  if (capOnly && !cap) return n;
  l[n++] = MV(to, from, 0, K_MOVE, 0, 0);
  return n;
}
static int gen(i32 *l, int capOnly) {
  const int us = side, them = us ^ 1; int n = 0;
  for (int s = 0; s < 81; s++) {
    int p = bd[s]; if (!p || CO(p) != us) continue;
    int t = TY(p), r = s / 9, c = s % 9;
    if (t == PAWN) {
      int f1 = fwdSq(us, s);
      if (f1 >= 0) {
        if (!bd[f1] && (!capOnly || INZONE(us, f1))) { l[n++] = MV(f1, s, 0, K_MOVE, INZONE(us, f1) ? 1 : 0, 0);
          int f2 = fwdSq(us, f1); if (!capOnly && !(fl[s] & F_MOVED) && f2 >= 0 && !bd[f2]) l[n++] = MV(f2, s, 0, K_MOVE, INZONE(us, f2) ? 1 : 0, 0); }
        int fr = f1 / 9;
        for (int dc = -1; dc <= 1; dc += 2) { int cc = c + dc; if (cc < 0 || cc > 8) continue; int q = bd[fr * 9 + cc]; if (q && CO(q) == them) l[n++] = MV(fr * 9 + cc, s, 0, K_MOVE, INZONE(us, fr * 9 + cc) ? 1 : 0, 0); }
      }
      continue;
    }
    if (t == CANNON) {
      for (int d = 1; d < 7; d++) { if (d == 2 || d == 5) continue;
        int rr = r + DR[d], cc = c + DC[d], screen = 0;
        while (inb(rr, cc)) { int q = bd[rr * 9 + cc];
          if (!screen) { if (q) screen = 1; else if (!capOnly) l[n++] = MV(rr * 9 + cc, s, 0, K_MOVE, 0, 0); }
          else if (q) { if (CO(q) == them) l[n++] = MV(rr * 9 + cc, s, 0, K_MOVE, 0, 0); break; }
          rr += DR[d]; cc += DC[d]; } }
      continue;
    }
    const int sm = STEPM[t], sl = SLIDEM[t];
    for (int d = 0; d < 8; d++) {
      int bdd = us ? OPPD[d] : d;
      if ((sm >> bdd) & 1) { int q = NB[s * 8 + d]; if (q >= 0 && (!bd[q] || CO(bd[q]) == them)) n = addMv(l, n, s, q, t, us, capOnly); }
      if ((sl >> bdd) & 1) { int q = NB[s * 8 + d]; while (q >= 0) { if (bd[q]) { if (CO(bd[q]) == them) n = addMv(l, n, s, q, t, us, capOnly); break; } n = addMv(l, n, s, q, t, us, capOnly); q = NB[q * 8 + d]; } }
    }
    if (t == KE) for (int i = 0; i < JKEn[us][s]; i++) { int q = JKE[us][s][i]; if (!bd[q] || CO(bd[q]) == them) n = addMv(l, n, s, q, t, us, capOnly); }
    if (t == KNIGHT || t == AMAZON) for (int i = 0; i < JN8n[s]; i++) { int q = JN8[s][i]; if (!bd[q] ? !capOnly : CO(bd[q]) == them) l[n++] = MV(q, s, 0, K_MOVE, 0, 0); }
    if (t == LION) {
      for (int i = 0; i < JL16n[s]; i++) { int q = JL16[s][i]; if (!bd[q] ? !capOnly : CO(bd[q]) == them) l[n++] = MV(q, s, 0, K_MOVE, 0, 0); }
      for (int d = 0; d < 8; d++) { int q = NB[s * 8 + d]; if (q >= 0 && bd[q] && CO(bd[q]) == them) l[n++] = MV(s, s, q, K_SHOOT, 0, 0); }
    }
    if (t == ARCHER) { int f1 = fwdSq(us, s), f2 = f1 >= 0 ? fwdSq(us, f1) : -1; if (f2 >= 0 && !bd[f1] && bd[f2] && CO(bd[f2]) == them) l[n++] = MV(s, s, f2, K_SHOOT, 0, 0); }
    if (t == MUSKET && !(fl[s] & F_USED)) { int q = fwdSq(us, s); while (q >= 0 && !bd[q]) q = fwdSq(us, q); if (q >= 0 && CO(bd[q]) == them) l[n++] = MV(s, s, q, K_FIRE, 0, 0); }
    if (capOnly) continue;
    if (t == ALCH && gply >= rdy[s]) for (int d = 0; d < 8; d++) { int q = NB[s * 8 + d]; if (q >= 0 && bd[q] == (FU | (us * WF))) l[n++] = MV(s, s, q, K_ALCH, 0, 0); }
    if (t == SAGE && gply >= rdy[s]) for (int ht = 1; ht <= 7; ht++) if (hand[them][ht]) for (int d = 0; d < 8; d++) {
      int q = NB[s * 8 + d]; if (q < 0 || bd[q] || dead(us, ht, q)) continue; if (ht == FU && nifu(us, q % 9)) continue;
      l[n++] = MV(q, s, 0, K_REVIVE, 0, ht); }
  }
  if (!capOnly) {
    u8 block[81]; memset(block, 0, 81);
    for (int s = 0; s < 81; s++) if (bd[s] == (BARRIER | (them * WF))) for (int d = 0; d < 8; d++) { int q = NB[s * 8 + d]; if (q >= 0) block[q] = 1; }
    for (int t = 1; t <= 7; t++) { if (!hand[us][t]) continue;
      u8 fuc[9]; if (t == FU) for (int c = 0; c < 9; c++) fuc[c] = (u8)nifu(us, c);
      for (int s = 0; s < 81; s++) { if (bd[s] || block[s] || dead(us, t, s)) continue; if (t == FU && fuc[s % 9]) continue; l[n++] = MV(s, 127, 0, K_DROP, 0, t); } }
  }
  return n;
}

/* ------------------------------------------------------------------ search */
#define MATE 30000
#define INF 32000
#define MAXPLY 64
#define TT_BITS 20
#define TT_SIZE (1 << TT_BITS)
typedef struct { u32 key; i32 move; i16 score; u8 depth; u8 flag; } TTE;
static TTE tt[TT_SIZE];
#define F_EXACT 1
#define F_LOWER 2
#define F_UPPER 3
static i32 moveBuf[MAXPLY + 24][700], scoreBuf[MAXPLY + 24][700];
static i32 killers[MAXPLY + 24][2];
static i32 hist[2][96][81];
static int nodes = 0, stopFlag = 0; static double tEnd = 0;
static i32 pvT[MAXPLY + 2][MAXPLY + 2]; static int pvL[MAXPLY + 2];
static u8 LMR[64][64];
static int timeUp(void) { if ((nodes & 1023) == 0 && tEnd > 0 && js_now() > tEnd) stopFlag = 1; return stopFlag; }
static int capVal(int m) {
  int k = mK(m);
  if (k == K_MOVE) return bd[mTo(m)] ? VAL[TY(bd[mTo(m)])] : 0;
  if (k == K_SHOOT || k == K_FIRE) return VAL[TY(bd[mX(m)])];
  return 0;
}
static inline int histIdx(int m) { int k = mK(m); return k == K_DROP ? 81 + mT(m) : mFrom(m); }
static void order(i32 *ms, i32 *sc, int n, int ttm, int ply) {
  for (int i = 0; i < n; i++) {
    int m = ms[i], s;
    if (m == ttm) s = 1 << 30;
    else { int cv = capVal(m);
      if (cv) { int att = mK(m) == K_MOVE ? VAL[TY(bd[mFrom(m)])] : 0; s = (1 << 26) + cv * 16 - (att > 2000 ? 2000 : att) / 8; }
      else if (mPr(m)) s = (1 << 25);
      else if (m == killers[ply][0]) s = (1 << 24) + 2;
      else if (m == killers[ply][1]) s = (1 << 24) + 1;
      else if (mK(m) == K_ALCH || mK(m) == K_REVIVE) s = (1 << 24);
      else s = hist[side][histIdx(m)][mTo(m)]; }
    sc[i] = s;
  }
}
static inline int pick(i32 *ms, i32 *sc, int n, int i) {
  int b = i; for (int j = i + 1; j < n; j++) if (sc[j] > sc[b]) b = j;
  if (b != i) { int t = ms[i]; ms[i] = ms[b]; ms[b] = t; t = sc[i]; sc[i] = sc[b]; sc[b] = t; }
  return ms[i];
}
static int repetition(void) {
  for (int k = sp - 4; k > 0; k -= 2) if (pathH[k] == hash) return 1;
  return 0;
}
static double qsearch(double alpha, double beta, int ply, int qd) {
  nodes++;
  if (timeUp()) return 0;
  if (!nRoyal(side)) return -MATE + ply;
  int chk = qd < 2 && inCheck(side);
  double best = -INF;
  if (!chk) { double e = evaluate(); if (e >= beta || ply >= MAXPLY + 20) return e; if (e > alpha) alpha = e; best = e; }
  i32 *ms = moveBuf[ply], *sc = scoreBuf[ply];
  int n = gen(ms, !chk); order(ms, sc, n, 0, ply);
  int legal = 0;
  for (int i = 0; i < n; i++) {
    int m = pick(ms, sc, n, i);
    if (!chk) { int cv = capVal(m); if (cv && best + cv + 250 < alpha && !mPr(m)) continue; }
    doMove(m);
    if (!legalFor(side ^ 1)) { undo(); continue; }
    legal++;
    double v = -qsearch(-beta, -alpha, ply + 1, qd + 1);
    undo();
    if (stopFlag) return 0;
    if (v > best) { best = v; if (v > alpha) { alpha = v; if (v >= beta) return v; } }
  }
  if (chk && !legal) return -MATE + ply;
  return best;
}
static int hasPieces(int c) { for (int s = 0; s < 81; s++) { int p = bd[s]; if (p && CO(p) == c) { int t = TY(p); if (t != FU && t != OU && t != KAGE && t != PAWN) return 1; } } for (int t = 2; t <= 7; t++) if (hand[c][t]) return 1; return 0; }
static void store(int depth, double score, int flag, int move, int ply) {
  TTE *e = &tt[(u32)hash & (TT_SIZE - 1)];
  int s = (int)score; if (s > MATE - MAXPLY) s += ply; else if (s < -MATE + MAXPLY) s -= ply;
  if (e->key == (u32)(hash >> 32) && e->depth > depth && flag != F_EXACT) return;
  e->key = (u32)(hash >> 32); e->move = move; e->score = (i16)s; e->depth = (u8)depth; e->flag = (u8)flag;
}
static double search(int depth, double alpha, double beta, int ply, int pv, int allowNull) {
  pvL[ply] = ply;
  if (depth <= 0) return qsearch(alpha, beta, ply, 0);
  nodes++;
  if (timeUp()) return 0;
  if (!nRoyal(side)) return -MATE + ply;
  if (ply > 0) {
    if (repetition()) return 0;
    if (alpha < -MATE + ply) alpha = -MATE + ply;
    if (beta > MATE - ply - 1) beta = MATE - ply - 1;
    if (alpha >= beta) return alpha;
  }
  if (ply >= MAXPLY - 1) return evaluate();
  TTE *e = &tt[(u32)hash & (TT_SIZE - 1)]; int ttm = 0;
  if (e->key == (u32)(hash >> 32)) {
    ttm = e->move;
    if (!pv && e->depth >= depth) { double s = e->score; if (s > MATE - MAXPLY) s -= ply; else if (s < -MATE + MAXPLY) s += ply;
      if (e->flag == F_EXACT || (e->flag == F_LOWER && s >= beta) || (e->flag == F_UPPER && s <= alpha)) return s; }
  }
  int chk = inCheck(side);
  double ev = chk ? -INF : evaluate();
  if (!pv && !chk) {
    if (depth <= 3 && ev - 160 * depth >= beta && ev < MATE - 100) return ev;
    if (allowNull && depth >= 3 && ev >= beta && hasPieces(side)) {
      int R = 3 + depth / 6; doNull(); double v = -search(depth - 1 - R, -beta, -beta + 1, ply + 1, 0, 0); undo();
      if (stopFlag) return 0;
      if (v >= beta) return v >= MATE - 100 ? beta : v;
    }
  }
  if (pv && !ttm && depth >= 5) { search(depth - 2, alpha, beta, ply, pv, 0); if (stopFlag) return 0; ttm = e->key == (u32)(hash >> 32) ? e->move : 0; }
  i32 *ms = moveBuf[ply], *sc = scoreBuf[ply];
  int n = gen(ms, 0); order(ms, sc, n, ttm, ply);
  int legal = 0, bestM = 0; double best = -INF, a0 = alpha;
  for (int i = 0; i < n; i++) {
    int m = pick(ms, sc, n, i);
    int quiet = !capVal(m) && !mPr(m);
    if (!pv && !chk && quiet && legal >= 1 && best > -MATE + 100) {
      if (depth <= 2 && ev + 120 * depth < alpha) continue;
      if (depth <= 4 && legal >= 6 + depth * depth * 3) continue;
    }
    doMove(m);
    if (!legalFor(side ^ 1)) { undo(); continue; }
    legal++;
    int gc = inCheck(side), ext = gc && ply < 40 ? 1 : 0;
    double v;
    if (legal == 1) v = -search(depth - 1 + ext, -beta, -alpha, ply + 1, pv, 1);
    else {
      int red = 0;
      if (depth >= 3 && quiet && !gc && !chk && legal > 3) { red = LMR[depth < 63 ? depth : 63][legal < 63 ? legal : 63]; if (pv) red--; if (red < 0) red = 0; if (red > depth - 2) red = depth - 2; }
      v = -search(depth - 1 + ext - red, -alpha - 1, -alpha, ply + 1, 0, 1);
      if (!stopFlag && v > alpha && red) v = -search(depth - 1 + ext, -alpha - 1, -alpha, ply + 1, 0, 1);
      if (!stopFlag && v > alpha && v < beta && pv) v = -search(depth - 1 + ext, -beta, -alpha, ply + 1, 1, 1);
    }
    undo();
    if (stopFlag) return best > -INF ? best : 0;
    if (v > best) {
      best = v; bestM = m;
      if (v > alpha) {
        alpha = v;
        pvT[ply][ply] = m; for (int j = ply + 1; j < pvL[ply + 1]; j++) pvT[ply][j] = pvT[ply + 1][j]; pvL[ply] = pvL[ply + 1] > ply + 1 ? pvL[ply + 1] : ply + 1;
        if (v >= beta) {
          if (quiet) { if (killers[ply][0] != m) { killers[ply][1] = killers[ply][0]; killers[ply][0] = m; }
            int *h = &hist[side][histIdx(m)][mTo(m)]; *h += depth * depth; if (*h > 1 << 22) for (int a = 0; a < 2; a++) for (int b = 0; b < 96; b++) for (int c = 0; c < 81; c++) hist[a][b][c] >>= 1; }
          break;
        }
      }
    }
  }
  if (!legal) return chk ? -MATE + ply : 0;   /* (no move without check: a draw — it does not happen in shogi with drops) */
  store(depth, best, best >= beta ? F_LOWER : best > a0 ? F_EXACT : F_UPPER, bestM, ply);
  return best;
}

/* ------------------------------------------------------------------ root */
static i32 setupBuf[81 * 3 + 16 + 4];   /* i32 [81 codes][81 flags][81 ready][2 x 8 hand][side][ply] */
static i32 rootM[700]; static double rootS[700]; static int rootN = 0;
static i32 res[4 + MAXPLY]; static double resScore = 0;
/* the legal root moves (打ち歩詰め excluded) */
static int rootMoves(void) {
  i32 *ms = moveBuf[MAXPLY + 20]; int n = gen(ms, 0), k = 0;
  for (int i = 0; i < n; i++) {
    int m = ms[i];
    doMove(m);
    int ok = legalFor(side ^ 1);
    if (ok && mK(m) == K_DROP && mT(m) == FU && nRoyal(side) == 1 && inCheck(side)) {
      i32 *rs = moveBuf[MAXPLY + 21]; int rn = gen(rs, 0), esc = 0;
      for (int j = 0; j < rn && !esc; j++) { doMove(rs[j]); esc = legalFor(side ^ 1); undo(); }
      if (!esc) ok = 0;
    }
    undo();
    if (ok) rootM[k++] = m;
  }
  return rootN = k;
}
EXPORT(res_ptr) i32 *res_ptr(void) { return res; }
EXPORT(res_score) double res_score(void) { return resScore; }
EXPORT(root_search) int root_search(double timeMs, int maxDepth) {
  nodes = 0; stopFlag = 0; tEnd = timeMs > 0 ? js_now() + timeMs : 0;
  double t0 = js_now();
  int n = rootMoves(); res[0] = 0; res[1] = 0; res[2] = 0; res[3] = 0;
  if (!n) { resScore = -MATE; return 0; }
  if (maxDepth <= 0) maxDepth = 60;
  int best = rootM[0]; double bestS = -INF;
  for (int i = 0; i < n; i++) rootS[i] = -INF;
  for (int d = 1; d <= maxDepth; d++) {
    /* the root: previous best first, then by the last scores */
    for (int i = 1; i < n; i++) { int j = i; while (j > 0 && rootS[j] > rootS[j - 1]) { double ts = rootS[j]; rootS[j] = rootS[j - 1]; rootS[j - 1] = ts; int tm = rootM[j]; rootM[j] = rootM[j - 1]; rootM[j - 1] = tm; j--; } }
    for (int i = 0; i < n; i++) if (rootM[i] == best && i) { int tm = rootM[i]; double ts = rootS[i]; for (int j = i; j > 0; j--) { rootM[j] = rootM[j - 1]; rootS[j] = rootS[j - 1]; } rootM[0] = tm; rootS[0] = ts; break; }
    double alpha = -INF, win = 60, lo = bestS > -INF && d >= 4 ? bestS - win : -INF, hi = bestS > -INF && d >= 4 ? bestS + win : INF;
    int curB = 0; double curS = -INF;
    for (;;) {
      alpha = lo; curB = 0; curS = -INF;
      for (int i = 0; i < n; i++) {
        int m = rootM[i];
        doMove(m);
        double v;
        if (i == 0) v = -search(d - 1, -hi, -alpha, 1, 1, 1);
        else { v = -search(d - 1, -alpha - 1, -alpha, 1, 0, 1); if (!stopFlag && v > alpha && v < hi) v = -search(d - 1, -hi, -alpha, 1, 1, 1); }
        undo();
        if (stopFlag) break;
        rootS[i] = v;
        if (v > curS) { curS = v; curB = m; pvT[0][0] = m; for (int j = 1; j < pvL[1]; j++) pvT[0][j] = pvT[1][j]; pvL[0] = pvL[1] > 1 ? pvL[1] : 1; }
        if (v > alpha) alpha = v;
        if (alpha >= hi) break;
      }
      if (stopFlag) break;
      if (curS <= lo && lo > -INF) { lo = -INF; continue; }
      if (curS >= hi && hi < INF) { hi = INF; continue; }
      break;
    }
    if (stopFlag && !curB) break;
    if (curB) { best = curB; bestS = curS; res[1] = d; }
    if (stopFlag) break;
    if (bestS > MATE - 100 || bestS < -MATE + 100) break;
    if (timeMs > 0 && js_now() - t0 > timeMs * 0.45) break;
  }
  res[0] = best; res[2] = nodes; resScore = bestS;
  int pl = pvL[0] < MAXPLY ? pvL[0] : MAXPLY; res[3] = pl; for (int i = 0; i < pl; i++) res[4 + i] = pvT[0][i];
  return best;
}
/* every root move with a full-window score at a fixed depth (the weak levels pick among them) */
EXPORT(ana_moves) i32 *ana_moves(void) { return rootM; }
EXPORT(ana_scores) double *ana_scores(void) { return rootS; }
EXPORT(analyze) int analyze(int depth) {
  nodes = 0; stopFlag = 0; tEnd = 0;
  int n = rootMoves();
  for (int i = 0; i < n; i++) { doMove(rootM[i]); rootS[i] = -search(depth - 1, -INF, INF, 1, 1, 1); undo(); }
  return n;
}
EXPORT(perft) double perft(int d) {
  if (d == 0) return 1;
  i32 *ms = moveBuf[MAXPLY + 10 + d]; int n = gen(ms, 0); double t = 0;
  for (int i = 0; i < n; i++) { doMove(ms[i]); if (legalFor(side ^ 1)) t += perft(d - 1); undo(); }
  return t;
}
EXPORT(dbg_play) void dbg_play(int m) {   /* (tests) play m and write the position back into the setup buffer */
  doMove(m);
  for (int s = 0; s < 81; s++) { setupBuf[s] = bd[s]; setupBuf[81 + s] = fl[s]; setupBuf[162 + s] = rdy[s]; }
  for (int c = 0; c < 2; c++) for (int t = 0; t < 8; t++) setupBuf[243 + c * 8 + t] = hand[c][t];
  setupBuf[259] = side; setupBuf[260] = gply; setupBuf[261] = rc[0] * 16 + rc[1];
  undo();
}
EXPORT(root_list) int root_list(void) { return rootMoves(); }
EXPORT(get_nodes) int get_nodes(void) { return nodes; }
EXPORT(tt_clear) void tt_clear(void) { memset(tt, 0, sizeof tt); memset(hist, 0, sizeof hist); memset(killers, 0, sizeof killers); }

/* ------------------------------------------------------------------ setup: i32 [81 codes][81 flags][81 ready][2 × 8 hand][side][ply] */
EXPORT(setup_ptr) i32 *setup_ptr(void) { return setupBuf; }
EXPORT(set_position) void set_position(void) {
  king[0] = king[1] = kage[0] = kage[1] = -1; rc[0] = rc[1] = 0; spMat[0] = spMat[1] = 0; hash = 0; sp = 0; lgTop = 0;
  for (int s = 0; s < 81; s++) {
    int p = setupBuf[s]; bd[s] = (i8)p; fl[s] = (u8)setupBuf[81 + s]; rdy[s] = (i16)setupBuf[162 + s];
    hash ^= ZB[s][p & 127] ^ ZF[s][fl[s] & 3];
    if (p) { int t = TY(p), c = CO(p); if (t == OU) king[c] = s; if (t == KAGE) kage[c] = s; if (ROYAL(t)) rc[c]++; if (!ISSTD(t)) spMat[c] += VAL[t]; }
  }
  for (int c = 0; c < 2; c++) for (int t = 0; t < 8; t++) { hand[c][t] = (u8)setupBuf[243 + c * 8 + t]; hash ^= ZH[c][t][hand[c][t]]; }
  side = setupBuf[259]; gply = setupBuf[260]; if (side) hash ^= ZS;
  pathH[0] = hash;
  if (nueOn) nueRefresh(0);
}
EXPORT(eval_now) double eval_now(void) { return evaluate(); }

/* the net (loaded by the worker: W1 i16[2534 × H], B1 i32[H], W2 i16[2H], B2) */
EXPORT(nue_w1_ptr) i16 *nue_w1_ptr(void) { return nueW1; }
EXPORT(nue_w2_ptr) i16 *nue_w2_ptr(void) { return nueW2; }
EXPORT(nue_b1_ptr) i32 *nue_b1_ptr(void) { return nueB1; }
EXPORT(nue_set_b2) void nue_set_b2(i32 b) { nueB2 = b; }
EXPORT(nue_h) int nue_h(void) { return NUE_H; }
EXPORT(nue_enable) void nue_enable(int on) { nueOn = on; tt_clear(); }

static double lnx(double x) { /* x >= 1 */ int k = 0; while (x > 2) { x /= 2; k++; } double y = (x - 1) / (x + 1), y2 = y * y, t = y, r = 0; for (int i = 1; i < 30; i += 2) { r += t / i; t *= y2; } return 2 * r + k * 0.6931471805599453; }
static u64 rs64 = 0x9E3779B97F4A7C15ull;
static u64 rnd64(void) { rs64 ^= rs64 << 13; rs64 ^= rs64 >> 7; rs64 ^= rs64 << 17; return rs64; }
EXPORT(init) void init(void) {
  for (int s = 0; s < 81; s++) { int r = s / 9, c = s % 9;
    for (int d = 0; d < 8; d++) NB[s * 8 + d] = inb(r + DR[d], c + DC[d]) ? (i8)((r + DR[d]) * 9 + c + DC[d]) : -1;
    for (int col = 0; col < 2; col++) { int dr = col ? 2 : -2; JKEn[col][s] = JKEFn[col][s] = 0;
      for (int dc = -1; dc <= 1; dc += 2) { if (inb(r + dr, c + dc)) JKE[col][s][JKEn[col][s]++] = (i8)((r + dr) * 9 + c + dc); if (inb(r - dr, c + dc)) JKEF[col][s][JKEFn[col][s]++] = (i8)((r - dr) * 9 + c + dc); } }
    JN8n[s] = 0; JL16n[s] = 0;
    static const int KN[8][2] = {{1, 2}, {2, 1}, {2, -1}, {1, -2}, {-1, -2}, {-2, -1}, {-2, 1}, {-1, 2}};
    for (int i = 0; i < 8; i++) if (inb(r + KN[i][0], c + KN[i][1])) JN8[s][JN8n[s]++] = (i8)((r + KN[i][0]) * 9 + c + KN[i][1]);
    for (int dr = -2; dr <= 2; dr++) for (int dc = -2; dc <= 2; dc++) if ((dr == 2 || dr == -2 || dc == 2 || dc == -2) && inb(r + dr, c + dc)) JL16[s][JL16n[s]++] = (i8)((r + dr) * 9 + c + dc);
  }
  /* directions (Black's frame): 0 up-left 1 up 2 up-right 3 left 4 right 5 down-left 6 down 7 down-right */
  const u8 ALL = 0xFF, GOLDM = 0x5F /* 0 1 2 3 4 6 */, SILV = (1 << 0) | (1 << 1) | (1 << 2) | (1 << 5) | (1 << 7), ORTH = (1 << 1) | (1 << 3) | (1 << 4) | (1 << 6), DIAG = (1 << 0) | (1 << 2) | (1 << 5) | (1 << 7);
  memset(STEPM, 0, sizeof STEPM); memset(SLIDEM, 0, sizeof SLIDEM);
  STEPM[FU] = 1 << 1; SLIDEM[KY] = 1 << 1; STEPM[GI] = SILV; STEPM[KI] = STEPM[TO] = STEPM[NY] = STEPM[NK] = STEPM[NG] = GOLDM;
  SLIDEM[KA] = DIAG; SLIDEM[HI] = ORTH; STEPM[OU] = ALL; SLIDEM[UM] = DIAG; STEPM[UM] = ORTH; SLIDEM[RY] = ORTH; STEPM[RY] = DIAG;
  STEPM[PAWN] = (1 << 0) | (1 << 2);   /* (attacks only; its moves are generated apart) */
  SLIDEM[BISHOP] = DIAG; SLIDEM[ROOK] = ORTH; SLIDEM[QUEEN] = ALL; SLIDEM[AMAZON] = ALL; STEPM[LION] = ALL;
  STEPM[ARCHER] = SILV; STEPM[MUSKET] = 1 << 1; STEPM[MERC] = GOLDM; STEPM[BARRIER] = SILV; STEPM[BOMBER] = 1 << 1; STEPM[ALCH] = SILV; STEPM[SAGE] = GOLDM;
  STEPM[CHRONO] = STEPM[KAGE] = STEPM[GENERAL] = ALL;
  for (int i = 0; i < 64; i++) for (int j = 0; j < 64; j++) { double a = i ? lnx((double)i) : 0, b = j ? lnx((double)j) : 0; int r = (int)(0.6 + a * b / 2.2); LMR[i][j] = (u8)(r < 0 ? 0 : r); }
  rs64 = 0x9E3779B97F4A7C15ull;
  for (int s = 0; s < 81; s++) { for (int p = 0; p < 128; p++) ZB[s][p] = p ? rnd64() : 0; for (int f = 0; f < 4; f++) ZF[s][f] = f ? rnd64() : 0; }
  for (int c = 0; c < 2; c++) for (int t = 0; t < 8; t++) for (int n = 0; n < 20; n++) ZH[c][t][n] = n ? rnd64() : 0;
  ZS = rnd64();
}
