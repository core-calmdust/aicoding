// Backgammon — the AI's evaluation and search in C (WebAssembly), 2026-11-11.
// The same evaluators and the same search as bg.js (the JavaScript version stays as the fallback and the reference):
//   * the fast nets (weights.json: GNUbg-style inputs, contact + race) that pre-select the opponent's replies,
//   * the strong nets of wildbg (wildbg.bin, float16; MIT OR Apache-2.0, (c) Carsten Wenderdel — THIRD_PARTY_LICENSES.txt),
//   * the one-sided bear-off database (bearoff.bin.gz),
//   * the hybrid expectimax of bg.js (hybReply / hyb1 / hyb2) generalised to n plies (bg_ply(o, n)).
// Builds (tools/build.sh): engine_simd.wasm (-msimd128: the dense layers 4 lanes at a time), engine.wasm (no SIMD: the same
// arithmetic in the same order — the same numbers), and a native build with -DEXACT for the tests (the layers summed in
// double in bg.js' order: the numbers of the JavaScript version, see tools/cmatch.js).
// The page side: bg.js (BG.setWasm) routes evalPos / evalFast / evalPly / plyRoll here when engine.js could load it.
#ifdef __wasm_simd128__
#include <wasm_simd128.h>
#endif
typedef signed char i8; typedef unsigned char u8; typedef unsigned short u16; typedef unsigned int u32;
typedef unsigned long long u64;
#ifdef NATIVE
#include <math.h>
#include <string.h>
#define EXPF exp
#else
#define EXPF dexp
static void *memset(void *d, int c, unsigned long n) { u8 *a = d; while (n--) *a++ = (u8)c; return d; }
// e^x in double (no libc in the wasm build): x = k ln2 + r, |r| <= ln2/2, Taylor to r^13 (error < 1e-17 relative)
static double dexp(double x) {
  if (x > 709) return 1.0 / 0.0; if (x < -745) return 0;
  double kf = x * 1.4426950408889634; int k = (int)(kf + (kf >= 0 ? 0.5 : -0.5));
  double r = (x - k * 6.93147180369123816490e-01) - k * 1.90821492927058770002e-10;
  double p = 1.0 / 6227020800.0;
  p = p * r + 1.0 / 479001600.0; p = p * r + 1.0 / 39916800.0; p = p * r + 1.0 / 3628800.0; p = p * r + 1.0 / 362880.0;
  p = p * r + 1.0 / 40320.0; p = p * r + 1.0 / 5040.0; p = p * r + 1.0 / 720.0; p = p * r + 1.0 / 120.0; p = p * r + 1.0 / 24.0;
  p = p * r + 1.0 / 6.0; p = p * r + 0.5; p = p * r + 1.0; p = p * r + 1.0;
  // 2^k (k may be below the normal range: scale in two steps)
  union { double d; u64 i; } u;
  if (k < -1000) { u.i = (u64)(k + 1000 + 1023) << 52; return p * u.d * 9.332636185032189e-302; }   // 2^-1000
  u.i = (u64)(k + 1023) << 52; return p * u.d;
}
#endif
#define EXPORT __attribute__((visibility("default")))

// ------------------------------------------------------------------------------------------------ position
// i8[52]: side 0 at [0..25], side 1 at [26..51]; 0 = borne off, 1..24 points from that side's own view, 25 = bar.
#define BAR 25
#define A4 __attribute__((aligned(4)))
static inline void cp52(i8 *d, const i8 *s) { u32 *a = (u32 *)d; const u32 *b = (const u32 *)s; for (int i = 0; i < 13; i++) a[i] = b[i]; }
static inline int eq52(const i8 *x, const i8 *y) { const u32 *a = (const u32 *)x, *b = (const u32 *)y; for (int i = 0; i < 13; i++) if (a[i] != b[i]) return 0; return 1; }
static int winner(const i8 *p) { if (p[0] == 15) return 0; if (p[26] == 15) return 1; return -1; }
static int winKind(const i8 *p, int w) {
  int o = (1 - w) * 26; if (p[o] > 0) return 1;
  for (int i = 19; i <= 25; i++) if (p[o + i]) return 3;
  return 2;
}
static int pips(const i8 *p, int s) { int m = s * 26, n = 0; for (int i = 1; i <= 25; i++) n += i * p[m + i]; return n; }
static int allHome(const i8 *p, int s) { int m = s * 26; for (int i = 7; i <= 25; i++) if (p[m + i]) return 0; return 1; }
static int contact(const i8 *p) {
  int b0 = 0, b1 = 0;
  for (int i = 25; i >= 1; i--) if (p[i]) { b0 = i; break; }
  for (int i = 25; i >= 1; i--) if (p[26 + i]) { b1 = i; break; }
  return b0 + b1 > 25;
}
static int dest(const i8 *p, int s, int from, int d) {
  int m = s * 26, o = 26 - m;
  if (p[m + from] == 0) return -1;
  if (from != BAR && p[m + BAR] > 0) return -1;
  int to = from - d;
  if (to >= 1) return p[o + 25 - to] >= 2 ? -1 : to;
  for (int i = 7; i <= 25; i++) if (p[m + i]) return -1;
  if (to == 0) return 0;
  for (int i = from + 1; i <= 6; i++) if (p[m + i]) return -1;
  return 0;
}
static void apply(i8 *p, int s, int from, int to) {
  int m = s * 26, o = 26 - m;
  p[m + from]--;
  if (to >= 1) { if (p[o + 25 - to] == 1) { p[o + 25 - to] = 0; p[o + BAR]++; } p[m + to]++; }
  else p[m]++;
}

// ------------------------------------------------------------------------------------------------ legal plays (genPlays)
// The same plays in the same order as bg.js genPlays (unique by the resulting position, first found kept; as many dice as
// possible; the larger die when only one can be played).
#define MAXP 2048
typedef struct { int n; i8 pos[MAXP][52] A4; i8 die[MAXP]; } Plays;
#define HSZ 8192
static u32 hStamp[HSZ], hCur = 0; static short hIdx[HSZ];
static Plays *gOut; static int gMax, gDbl, gSide;
static u32 hashPos(const i8 *q) { const u32 *w = (const u32 *)q; u32 h = 2166136261u; for (int i = 0; i < 13; i++) h = (h ^ w[i]) * 16777619u; return h ^ (h >> 15); }
static void record(const i8 *q, int n, int first) {
  if (n < gMax) return;
  if (n > gMax) { gOut->n = 0; gMax = n; hCur++; }
  u32 h = hashPos(q) & (HSZ - 1);
  while (hStamp[h] == hCur) { if (eq52(gOut->pos[hIdx[h]], q)) return; h = (h + 1) & (HSZ - 1); }
  if (gOut->n >= MAXP) return;   // (never in practice)
  int k = gOut->n++; cp52(gOut->pos[k], q); gOut->die[k] = (i8)first;
  hStamp[h] = hCur; hIdx[h] = (short)k;
}
static void rec(const i8 *q, const int *dice, int nd, int k, int minFrom, int first) {
  if (k == nd) { record(q, k, first); return; }
  int d = dice[k], any = 0, m = gSide * 26;
  int hi = q[m + BAR] > 0 ? BAR : 24;
  for (int from = hi; from >= 1; from--) {
    if (gDbl && from > minFrom) continue;
    if (q[m + from] == 0) continue;
    int to = dest(q, gSide, from, d);
    if (to < 0) continue;
    any = 1;
    i8 r[52] A4; cp52(r, q); apply(r, gSide, from, to);
    rec(r, dice, nd, k + 1, from, k == 0 ? d : first);
    if (from == BAR) break;
  }
  if (!any) record(q, k, first);
}
static void genPlays(const i8 *p, int s, int d1, int d2, Plays *out) {
  gOut = out; out->n = 0; gMax = 0; gSide = s; gDbl = d1 == d2; hCur++;
  if (gDbl) { int dd[4] = { d1, d1, d1, d1 }; rec(p, dd, 4, 0, 25, 0); }
  else { int a[2] = { d1, d2 }, b[2] = { d2, d1 }; rec(p, a, 2, 0, 25, 0); rec(p, b, 2, 0, 25, 0); }
  if (gMax == 1 && !gDbl) {
    int big = d1 > d2 ? d1 : d2, has = 0;
    for (int i = 0; i < out->n; i++) if (out->die[i] == big) { has = 1; break; }
    if (has) { int w = 0; for (int i = 0; i < out->n; i++) if (out->die[i] == big) { if (w != i) { cp52(out->pos[w], out->pos[i]); out->die[w] = out->die[i]; } w++; } out->n = w; }
  }
  if (gMax == 0) { out->n = 1; cp52(out->pos[0], p); }
}

// ------------------------------------------------------------------------------------------------ probabilities
// [win, winG, winBG, loseG, loseBG] from the view of the side on roll (gammons include backgammons)
typedef struct { double v[5]; } Pr;
static Pr flip(Pr a) { Pr b = { { 1 - a.v[0], a.v[3], a.v[4], a.v[1], a.v[2] } }; return b; }
static double equity(const Pr *a) { return 2 * a->v[0] - 1 + a->v[1] - a->v[3] + a->v[2] - a->v[4]; }
static double dmin(double a, double b) { return a < b ? a : b; }
static double dmax(double a, double b) { return a > b ? a : b; }
static Pr sanitize(const float *y) {
  double w = dmin(1, dmax(0, y[0]));
  double wg = dmin(w, dmax(0, y[1])), wb = dmin(wg, dmax(0, y[2]));
  double lg = dmin(1 - w, dmax(0, y[3])), lb = dmin(lg, dmax(0, y[4]));
  Pr r = { { w, wg, wb, lg, lb } }; return r;
}

// ------------------------------------------------------------------------------------------------ dense layers
// dot(w, x, n) and axpy (y += a w): 4 lanes; the scalar build sums in the same 4 lanes and the same order (the same numbers)
#ifndef EXACT
static float dot4(const float *w, const float *x, int n) {
#ifdef __wasm_simd128__
  v128_t s = wasm_f32x4_splat(0);
  for (int i = 0; i < n; i += 4) s = wasm_f32x4_add(s, wasm_f32x4_mul(wasm_v128_load(w + i), wasm_v128_load(x + i)));
  float l0 = wasm_f32x4_extract_lane(s, 0), l1 = wasm_f32x4_extract_lane(s, 1), l2 = wasm_f32x4_extract_lane(s, 2), l3 = wasm_f32x4_extract_lane(s, 3);
#else
  float l0 = 0, l1 = 0, l2 = 0, l3 = 0;
  for (int i = 0; i < n; i += 4) { l0 = l0 + w[i] * x[i]; l1 = l1 + w[i + 1] * x[i + 1]; l2 = l2 + w[i + 2] * x[i + 2]; l3 = l3 + w[i + 3] * x[i + 3]; }
#endif
  return (l0 + l1) + (l2 + l3);
}
static void axpy4(float *y, const float *w, float a, int n) {
#ifdef __wasm_simd128__
  v128_t av = wasm_f32x4_splat(a);
  for (int j = 0; j < n; j += 4) wasm_v128_store(y + j, wasm_f32x4_add(wasm_v128_load(y + j), wasm_f32x4_mul(wasm_v128_load(w + j), av)));
#else
  for (int j = 0; j < n; j++) y[j] = y[j] + w[j] * a;
#endif
}
#endif

// ------------------------------------------------------------------------------------------------ fast nets (weights.json)
// inputs from the view of the side on roll: per side 24 points x 4, bar, off (98), then 12 GNUbg-style features per side,
// then 3 pip features (bg.js features / sideFeatures)
#define NIN 223
static u8 ESC[4096];
static float FNraw[2][29317];   // the JS layout (per hidden unit: its inputs; then b1, W2[5][nh], b2) — 0 contact, 1 race
static float FNt[2][NIN * 128]; // W1 transposed [input][hidden] (the SIMD layout)
static int FNnh[2] = { 0, 0 };
static int escapes(const u8 *blk, int b) {
  int af = 0, m = b - 1 < 12 ? b - 1 : 12;
  for (int i = 0; i < m; i++) if (blk[b - i - 1]) af |= 1 << i;
  return ESC[af];
}
static int sideFeatures(const i8 *p, int X, float *x, int k) {
  u8 blk[26], opn[40]; int att[16], blt[16];
  int m = X * 26, o = 26 - m;
  for (int i = 1; i <= 24; i++) { blk[i] = p[o + 25 - i] >= 2; opn[i] = p[m + i] >= 2 ? 0 : 1; }
  opn[0] = 1; blk[0] = 0; blk[25] = 0; for (int i = 25; i < 40; i++) opn[i] = 0;   // (bg.js: _opn[25] is never set, past the array reads as 0)
  int back = 0; for (int i = 25; i >= 1; i--) if (p[m + i]) { back = i; break; }
  int yback = 0; for (int j = 25; j >= 1; j--) if (p[o + j]) { yback = j; break; }
  int lim = 25 - yback;
  int brk = 0; for (int i = lim + 1; i <= 25; i++) if (p[m + i]) brk += p[m + i] * (i - lim);
  int bAnc = 0, nAnc = 0; for (int i = 19; i <= 24; i++) if (p[m + i] >= 2) { bAnc = i - 18; nAnc++; }
  int nb = 0, na = 0;
  for (int i = 1; i <= 24; i++) if (p[m + i] == 1) blt[nb++] = i;
  int hit = 0;
  if (nb) {
    if (p[o + 25] > 0) att[na++] = 0; else for (int j = 1; j <= 24; j++) if (p[o + j]) { int A = 25 - j; if (A < blt[nb - 1] && na < 16) att[na++] = A; }
    for (int a = 1; a <= 6; a++) for (int b = a; b <= 6; b++) {
      int h = 0;
      for (int q = 0; q < na && !h; q++) {
        int A = att[q];
        for (int r = 0; r < nb; r++) {
          int d = blt[r] - A; if (d <= 0) continue;
          if (a != b) {
            if (d == a || d == b || (d == a + b && (opn[A + a] || opn[A + b]))) { h = 1; break; }
          } else if (d % a == 0 && d <= 4 * a) {
            int ok = 1; for (int t = 1; t < d / a; t++) if (!opn[A + a * t]) { ok = 0; break; }
            if (ok) { h = 1; break; }
          }
        }
      }
      if (h) hit += a == b ? 1 : 2;
    }
  }
  int bEsc = back >= 13 && back <= 24 ? escapes(blk, back) : 36;
  int cont = 36; for (int i = 15; i <= 24; i++) { int e = escapes(blk, i); if (e < cont) cont = e; }
  int closed = 0; for (int i = 19; i <= 24; i++) if (blk[i]) closed++;
  int run = 0, prime = 0; for (int i = 1; i <= 24; i++) { if (p[m + i] >= 2) { run++; if (run > prime) prime = run; } else run = 0; }
  int home = 0; for (int i = 1; i <= 6; i++) if (p[m + i] >= 2) home++;
  int backN = 0; for (int i = 19; i <= 25; i++) backN += p[m + i];
  x[k++] = (float)(brk / 152.0); x[k++] = (float)(back / 24.0); x[k++] = (float)(bAnc / 6.0); x[k++] = (float)(nAnc / 2.0);
  x[k++] = (float)(hit / 36.0); x[k++] = (float)(bEsc / 36.0);
  double c = (36 - cont) / 36.0; x[k++] = (float)c; x[k++] = (float)(c * c);
  x[k++] = (float)(p[m + 25] ? (closed / 6.0) * (closed / 6.0) : 0); x[k++] = (float)((prime < 6 ? prime : 6) / 6.0);
  x[k++] = (float)(home / 6.0); x[k++] = (float)(backN / 5.0);
  return k;
}
static void features(const i8 *p, int s, float *x) {
  int k = 0;
  for (int t = 0; t < 2; t++) {
    int m = (t ? 1 - s : s) * 26;
    for (int i = 1; i <= 24; i++) {
      int n = p[m + i];
      x[k++] = n >= 1; x[k++] = n >= 2; x[k++] = n >= 3; x[k++] = (float)(n > 3 ? (n - 3) / 2.0 : 0);
    }
    x[k++] = (float)(p[m + 25] / 2.0); x[k++] = (float)(p[m] / 15.0);
  }
  k = sideFeatures(p, s, x, k); k = sideFeatures(p, 1 - s, x, k);
  int ps = pips(p, s), po = pips(p, 1 - s);
  x[k++] = (float)(ps / 167.0); x[k++] = (float)(po / 167.0); x[k++] = (float)((po - ps) / 40.0);
}
static Pr fastNet(int which, const i8 *p, int s) {
  float x[NIN] __attribute__((aligned(16))), h[128] __attribute__((aligned(16))), y[5];
  int nh = FNnh[which], ni = NIN; const float *w = FNraw[which];
  int oB1 = nh * ni, oW2 = oB1 + nh, oB2 = oW2 + 5 * nh;
  features(p, s, x);
#ifdef EXACT
  int nz[NIN], nn = 0; for (int i = 0; i < ni; i++) if (x[i] != 0) nz[nn++] = i;
  for (int j = 0; j < nh; j++) {
    double a = w[oB1 + j]; int row = j * ni;
    for (int q = 0; q < nn; q++) { int i = nz[q]; a += (double)w[row + i] * (double)x[i]; }
    h[j] = (float)(1 / (1 + EXPF(-a)));
  }
  for (int k = 0; k < 5; k++) {
    double a = w[oB2 + k]; int row = oW2 + k * nh;
    for (int j = 0; j < nh; j++) a += (double)w[row + j] * (double)h[j];
    y[k] = (float)(1 / (1 + EXPF(-a)));
  }
#else
  const float *wt = FNt[which];
  for (int j = 0; j < nh; j++) h[j] = w[oB1 + j];
  for (int i = 0; i < ni; i++) if (x[i] != 0) axpy4(h, wt + i * nh, x[i], nh);
  for (int j = 0; j < nh; j++) h[j] = (float)(1 / (1 + EXPF(-(double)h[j])));
  for (int k = 0; k < 5; k++) { double a = (double)w[oB2 + k] + (double)dot4(w + oW2 + k * nh, h, nh); y[k] = (float)(1 / (1 + EXPF(-a))); }
#endif
  return sanitize(y);
}

// ------------------------------------------------------------------------------------------------ wildbg nets (wildbg.bin)
// two nets (contact 202 inputs, race 186), each 300 -> 250 -> 200 -> 6 (softmax), hidden activations hard-sigmoid (contact)
// and ReLU (race); float16 weights converted to float32 (exactly) by bg_init. Layout as wildbg.json.
#define WB_N 370312
static u16 WBraw[WB_N];
static float WBf[WB_N] __attribute__((aligned(16)));
static const int WB_IN[2] = { 202, 186 }, WB_OFF[2] = { 0, 187556 };
// per net: hidden1 (in x 300, transposed [in][out]) + 300 b, hidden2 250x300 + 250, hidden3 200x250 + 200, output 6x200 + 6
static float f16tof32(u16 h) {
  u32 s = (u32)(h & 0x8000) << 16, e = (h >> 10) & 31, f = h & 1023; union { u32 i; float f; } u;
  if (e == 0) { if (!f) { u.i = s; return u.f; } float v = f * 5.960464477539063e-8f; return s ? -v : v; }
  if (e == 31) { u.i = s | 0x7F800000 | (f << 13); return u.f; }
  u.i = s | ((e + 112) << 23) | (f << 13); return u.f;
}
static void wbTd(float *x, int k, int n) { if (n == 1) x[k] = 1; else if (n == 2) x[k + 1] = 1; else if (n >= 3) { x[k + 2] = 1; x[k + 3] = (float)(n - 3); } }
static float hs(double a, int hard) { return hard ? (float)(a <= -3 ? 0 : a >= 3 ? 1 : a / 6 + 0.5) : (float)(a > 0 ? a : 0); }
static Pr wbEval(const i8 *p, int s) {
  int race = !contact(p), net = race ? 1 : 0, ni = WB_IN[net], hard = !race;
  float x[204] __attribute__((aligned(16)));
  float h1[300] __attribute__((aligned(16))), h2[252] __attribute__((aligned(16))), h3[200] __attribute__((aligned(16))), out[6];
  memset(x, 0, sizeof x);
  int m = s * 26, o = 26 - m;
  x[0] = p[m]; x[1] = p[o];
  if (race) {
    int k = 2; for (int i = 1; i <= 23; i++, k += 4) wbTd(x, k, p[m + i]);
    for (int i = 2; i <= 24; i++, k += 4) wbTd(x, k, p[o + 25 - i]);
  } else {
    wbTd(x, 2, p[m + 25]);
    int k = 6; for (int i = 1; i <= 24; i++, k += 4) wbTd(x, k, p[m + i]);
    wbTd(x, k, p[o + 25]); k += 4;
    for (int i = 1; i <= 24; i++, k += 4) wbTd(x, k, p[o + 25 - i]);
  }
  const float *W1 = WBf + WB_OFF[net], *B1 = W1 + ni * 300, *W2 = B1 + 300, *B2 = W2 + 250 * 300, *W3 = B2 + 250, *B3 = W3 + 200 * 250, *W4 = B3 + 200, *B4 = W4 + 6 * 200;
  for (int j = 0; j < 300; j++) h1[j] = B1[j];
#ifdef EXACT
  for (int i = 0; i < ni; i++) { float v = x[i]; if (v == 0) continue; const float *r = W1 + i * 300; for (int j = 0; j < 300; j++) h1[j] = (float)((double)h1[j] + (double)v * (double)r[j]); }
  for (int j = 0; j < 300; j++) h1[j] = hs(h1[j], hard);
  for (int j = 0; j < 250; j++) { double a = B2[j]; const float *r = W2 + j * 300; for (int i = 0; i < 300; i++) a += (double)r[i] * (double)h1[i]; h2[j] = hs((float)a, hard); }
  for (int j = 0; j < 200; j++) { double a = B3[j]; const float *r = W3 + j * 250; for (int i = 0; i < 250; i++) a += (double)r[i] * (double)h2[i]; h3[j] = hs((float)a, hard); }
  for (int j = 0; j < 6; j++) { double a = B4[j]; const float *r = W4 + j * 200; for (int i = 0; i < 200; i++) a += (double)r[i] * (double)h3[i]; out[j] = (float)a; }
#else
  for (int i = 0; i < ni; i++) if (x[i] != 0) axpy4(h1, W1 + i * 300, x[i], 300);
  for (int j = 0; j < 300; j++) h1[j] = hs(h1[j], hard);
  for (int j = 0; j < 250; j++) h2[j] = hs((float)((double)B2[j] + (double)dot4(W2 + j * 300, h1, 300)), hard);
  for (int j = 0; j < 200; j++) h3[j] = hs((float)((double)B3[j] + (double)dot4(W3 + j * 250, h2, 250)), hard);
  for (int j = 0; j < 6; j++) out[j] = (float)((double)B4[j] + (double)dot4(W4 + j * 200, h3, 200));
#endif
  double mx = -1e9; for (int j = 0; j < 6; j++) if (out[j] > mx) mx = out[j];
  double e[6], sum = 0; for (int j = 0; j < 6; j++) { e[j] = EXPF(out[j] - mx); sum += e[j]; }
  double wn = e[0] / sum, wg = e[1] / sum, wb = e[2] / sum, lg = e[4] / sum, lb = e[5] / sum;
  Pr r = { { wn + wg + wb, wg + wb, wb, lg + lb, lb } }; return r;
}

// ------------------------------------------------------------------------------------------------ bear-off database
#define BO_N 54264
#define BO_BYTES 1172090
static u8 BOraw[BO_BYTES + 16];
static u8 boLo[BO_N], boLen[BO_N], boFlo[BO_N], boFlen[BO_N]; static u32 boSt[BO_N], boFst[BO_N];
static int boOk = 0;
static int CC[22][8];
static int boIndexPos(const i8 *p, int s) {
  int m = s * 26, left = 15, r = 0;
  for (int i = 1; i <= 6; i++) {
    int bins = 7 - i + 1, c = p[m + i];
    for (int v = 0; v < c; v++) { int n = left - v, b = bins - 1; r += CC[n + b - 1][b - 1]; }
    left -= c;
  }
  return r;
}
// the distribution (index = rolls), normalised; returns its length (lo + len + 1)
static int boDist(int i, int first, double *d) {
  int lo = first ? boFlo[i] : boLo[i], len = first ? boFlen[i] : boLen[i]; u32 st = first ? boFst[i] : boSt[i];
  int L = lo + len + 1; double sum = 0;
  for (int k = 0; k < L; k++) d[k] = 0;
  for (int k = 0; k < len; k++) { double v = BOraw[st + 2 * k] | (BOraw[st + 2 * k + 1] << 8); d[lo + k] = v; sum += v; }
  if (sum > 0) for (int k = 0; k < L; k++) d[k] /= sum;
  return L;
}
static int isBearoff(const i8 *p) { return boOk && allHome(p, 0) && allHome(p, 1); }
static Pr bearoffEval(const i8 *p, int s) {
  static double a[520], b[520], f[520], sb[530], sx[530];
  int ia = boIndexPos(p, s), ib = boIndexPos(p, 1 - s);
  int La = boDist(ia, 0, a), Lb = boDist(ib, 0, b);
  int Ls = (La > Lb ? La : Lb) + 2;
  for (int n = 0; n < Ls; n++) sb[n] = 0;
  for (int n = Lb - 1; n >= 0; n--) sb[n] = sb[n + 1] + b[n];
  double win = 0, wg = 0, lg = 0;
  for (int n = 1; n < La; n++) if (a[n]) win += a[n] * sb[n];
  if (p[(1 - s) * 26] == 0 && boFlen[ib]) {
    int Lf = boDist(ib, 1, f), L = (Lf > La ? Lf : La) + 2;
    for (int n = 0; n < L; n++) sx[n] = 0;
    for (int n = Lf - 1; n >= 0; n--) sx[n] = sx[n + 1] + f[n];
    for (int n = 1; n < La; n++) if (a[n]) wg += a[n] * (n - 1 < L ? sx[n] : 0);
  }
  if (p[s * 26] == 0 && boFlen[ia]) {
    int Lf = boDist(ia, 1, f), L = (Lf > Lb ? Lf : Lb) + 2;
    for (int n = 0; n < L; n++) sx[n] = 0;
    for (int n = Lf - 1; n >= 0; n--) sx[n] = sx[n + 1] + f[n];
    for (int n = 1; n < Lb; n++) if (b[n]) lg += b[n] * (n + 1 < L ? sx[n + 1] : 0);
  }
  Pr r = { { win, dmin(wg, win), 0, dmin(lg, 1 - win), 0 } }; return r;
}

// ------------------------------------------------------------------------------------------------ evaluation and search
static int hasWB = 0;
static Pr evalPos(const i8 *p, int s) {
  int w = winner(p);
  if (w >= 0) { int k = winKind(p, w); Pr r = { { 0, 0, 0, 0, 0 } }; if (w == s) { r.v[0] = 1; r.v[1] = k >= 2; r.v[2] = k >= 3; } else { r.v[3] = k >= 2; r.v[4] = k >= 3; } return r; }
  if (isBearoff(p)) return bearoffEval(p, s);
  if (hasWB) return wbEval(p, s);
  return fastNet(contact(p) ? 0 : 1, p, s);
}
static Pr evalFast(const i8 *p, int s) {
  if (winner(p) >= 0 || isBearoff(p)) return evalPos(p, s);
  return fastNet(contact(p) ? 0 : 1, p, s);
}
static const int RA[21] = { 1,1,1,1,1,1, 2,2,2,2,2, 3,3,3,3, 4,4,4, 5,5, 6 };
static const int RB[21] = { 1,2,3,4,5,6, 2,3,4,5,6, 3,4,5,6, 4,5,6, 5,6, 6 };
#define PR(i) (RA[i] == RB[i] ? 1.0 / 36 : 2.0 / 36)
static int HYB_K = 2;          // the opponent's replies valued by the strong evaluator (the fast net's best K)
static double HYB_M = 0.12;    // ... within this margin of the fast net's best
#define MAXD 8
static Plays PL[MAXD];
static double SC[MAXP];
static u64 nEval = 0;          // strong evaluations (for the speed measures)
// side o's reply to (a, b) in q: the fast net's best K re-valued by the strong evaluator; *rp = the position after it,
// returns o's probabilities after its reply (bg.js hybReply)
static Pr hybReply(const i8 *q, int o, int a, int b, int depth, i8 *rp) {
  Plays *P = &PL[depth]; genPlays(q, o, a, b, P);
  if (P->n == 1) { cp52(rp, P->pos[0]); nEval++; return flip(evalPos(P->pos[0], 1 - o)); }
  for (int i = 0; i < P->n; i++) { Pr v = flip(evalFast(P->pos[i], 1 - o)); SC[i] = equity(&v); }
  // the first K of a stable sort by the fast value (descending)
  int k = HYB_K < P->n ? HYB_K : P->n, used[16]; double top = 0; Pr best; double be = -1e9; int bi = -1;
  for (int r = 0; r < k; r++) {
    int mi = -1;
    for (int i = 0; i < P->n; i++) { int u = 0; for (int t = 0; t < r; t++) if (used[t] == i) { u = 1; break; } if (u) continue; if (mi < 0 || SC[i] > SC[mi]) mi = i; }
    used[r] = mi;
    if (r == 0) top = SC[mi];
    else if (SC[mi] < top - HYB_M) break;
    Pr v = flip(evalPos(P->pos[mi], 1 - o)); nEval++; double e = equity(&v);
    if (e > be) { be = e; best = v; bi = mi; }
  }
  cp52(rp, P->pos[bi]);
  return best;
}
static int whole(const i8 *q) { return winner(q) >= 0 || isBearoff(q); }
static Pr hyb(const i8 *q, int o, int n, int depth);
// the term of roll i of hyb(q, o, n): o's view after its reply (bg.js plyRoll)
static Pr hybRoll(const i8 *q, int o, int n, int i, int depth) {
  i8 r[52] A4; Pr v = hybReply(q, o, RA[i], RB[i], depth, r);
  if (n <= 1 || whole(r)) return v;
  return hyb(r, 1 - o, n - 1, depth + 1);
}
// n-ply value of q with o on roll, from the view of the side that just moved (bg.js hyb1 / hyb2 for n = 1, 2)
static Pr hyb(const i8 *q, int o, int n, int depth) {
  if (n <= 0 || whole(q)) return flip(evalPos(q, o));
  double acc[5] = { 0, 0, 0, 0, 0 };
  for (int i = 0; i < 21; i++) {
    Pr v = hybRoll(q, o, n, i, depth); double pr = PR(i);
    acc[0] += pr * (1 - v.v[0]); acc[1] += pr * v.v[3]; acc[2] += pr * v.v[4]; acc[3] += pr * v.v[1]; acc[4] += pr * v.v[2];
  }
  Pr r; for (int k = 0; k < 5; k++) r.v[k] = acc[k]; return r;
}

// ------------------------------------------------------------------------------------------------ the page's interface
static i8 IO[52 * 64] A4;          // positions in (bg_io)
static double RES[5 * 64];      // probabilities out (bg_res)
EXPORT u16 *bg_wbraw(void) { return WBraw; }
EXPORT float *bg_fn(int i) { return FNraw[i & 1]; }
EXPORT u8 *bg_boraw(void) { return BOraw; }
EXPORT i8 *bg_io(void) { return IO; }
EXPORT double *bg_res(void) { return RES; }
// after the buffers are filled: nh0 / nh1 = hidden sizes of the fast nets (0 = missing), wb = wildbg loaded, bo = bear-off
// loaded. Returns 1 when the engine is usable (the fast nets and wildbg are needed).
EXPORT int bg_init(int nh0, int nh1, int wb, int bo) {
  for (int i = 0; i < 4096; i++) { int c = 0; for (int a = 0; a <= 5; a++) for (int b = 0; b <= a; b++) if (!(i & (1 << (a + b + 1))) && !((i & (1 << a)) && (i & (1 << b)))) c += a == b ? 1 : 2; ESC[i] = (u8)c; }
  for (int n = 0; n < 22; n++) for (int k = 0; k < 8; k++) { long long r = 1; if (k > n) r = 0; else for (int i = 1; i <= k; i++) r = r * (n - k + i) / i; CC[n][k] = (int)r; }
  FNnh[0] = nh0; FNnh[1] = nh1;
  for (int t = 0; t < 2; t++) { int nh = FNnh[t]; if (nh > 128) return 0; for (int j = 0; j < nh; j++) for (int i = 0; i < NIN; i++) FNt[t][i * nh + j] = FNraw[t][j * NIN + i]; }
  hasWB = wb ? 1 : 0;
  if (wb) for (int i = 0; i < WB_N; i++) WBf[i] = f16tof32(WBraw[i]);
  boOk = 0;
  if (bo && BOraw[0] == 'B' && BOraw[1] == 'G' && BOraw[2] == 'B' && BOraw[3] == 'O') {
    u32 n = BOraw[4] | (BOraw[5] << 8) | (BOraw[6] << 16) | ((u32)BOraw[7] << 24);
    if (n == BO_N) {
      u32 off = 8;
      for (u32 i = 0; i < n; i++) {
        boLo[i] = BOraw[off]; boLen[i] = BOraw[off + 1]; off += 2; boSt[i] = off; off += 2 * boLen[i];
        boFlo[i] = BOraw[off]; boFlen[i] = BOraw[off + 1]; off += 2; boFst[i] = off; off += 2 * boFlen[i];
      }
      boOk = off <= BO_BYTES;
    }
  }
  return nh0 > 0 && nh1 > 0 && hasWB;
}
// the search options (bg.js HYB_K and its margin)
EXPORT void bg_opts(int k, double m) { HYB_K = k < 1 ? 1 : k > 16 ? 16 : k; HYB_M = m; }
static void put(int slot, Pr v) { for (int k = 0; k < 5; k++) RES[slot * 5 + k] = v.v[k]; }
// IO[slot] (s on roll) -> RES[slot]: static evaluation (strong / fast)
EXPORT void bg_eval(int n, int s) { for (int i = 0; i < n; i++) put(i, evalPos(IO + 52 * i, s)); }
EXPORT void bg_evalfast(int n, int s) { for (int i = 0; i < n; i++) put(i, evalFast(IO + 52 * i, s)); }
// IO[0] after a play, o on roll: the ply-deep value from the mover's view (bg.js evalPly)
EXPORT void bg_ply(int o, int ply) { put(0, hyb(IO, o, ply, 0)); }
// one roll's term (bg.js plyRoll); returns 1 when the position does not roll (the game is over / a bear-off: use bg_ply)
EXPORT int bg_plyroll(int o, int ply, int i) { if (whole(IO)) return 1; put(0, hybRoll(IO, o, ply, i, 0)); return 0; }
EXPORT int bg_whole(void) { return whole(IO); }
EXPORT double bg_nevals(void) { return (double)nEval; }
// the legal plays of IO[0] (s with d1-d2), for the tests: the count; the positions at bg_playpos() (52 bytes each)
EXPORT int bg_plays(int s, int d1, int d2) { genPlays(IO, s, d1, d2, &PL[MAXD - 1]); return PL[MAXD - 1].n; }
EXPORT i8 *bg_playpos(void) { return PL[MAXD - 1].pos[0]; }
