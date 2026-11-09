// Reversi search core in C (WebAssembly): the midgame PVS (pattern evaluation with incremental indices, Multi-ProbCut,
// transposition table) and the exact endgame solver. The midgame is the same as engine.js's JS fallback (same nodes and
// values); the endgame solver here is faster than the JS one (same exact scores). The JS root drivers call into it.
// Build: tools/build-wasm.sh → engine-wasm.js (the module as base64, loaded by the worker with importScripts).
// Boards are 64-bit (bit s = square s, a1 = 0); the JS side passes them as two 32-bit halves.
typedef unsigned long long u64;
typedef unsigned int u32;
typedef signed char i8;
typedef unsigned char u8;
typedef short i16;
#define EXPORT(n) __attribute__((export_name(#n)))
/* MT (engine_mt.wasm): several threads search together on one shared memory ("Lazy SMP"); per-thread state is TLS,
   the weights, the tables and the transposition tables are shared. Without MT TLS is nothing (same build as before). */
#ifdef MT
#define TLS _Thread_local
static volatile int gStop;          /* shared: set when the main thread's search is over (the helpers stop) */
#else
#define TLS
#endif
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
#ifdef __wasm_simd128__
#include <wasm_simd128.h>
/* the board and its vertical mirror (byte swap) in the two lanes of one vector: a left shift by 8 / 9 / 7 is the direction
   +8 / +9 / +7 in lane 0 and -8 / -7 / -9 in lane 1, so three Kogge-Stone floods cover six directions */
#define BSWAP2(v) wasm_i8x16_swizzle(v, wasm_i8x16_const(7, 6, 5, 4, 3, 2, 1, 0, 15, 14, 13, 12, 11, 10, 9, 8))
static inline u64 bswap64(u64 x) { return __builtin_bswap64(x); }
static u64 genMoves(u64 P, u64 O) {
  const u64 E = ~(P | O), I = O & 0x7E7E7E7E7E7E7E7EULL;
  const v128_t vP = wasm_i64x2_make(P, bswap64(P)), vO = wasm_i64x2_make(O, bswap64(O)), vI = wasm_v128_and(vO, wasm_i64x2_splat(0x7E7E7E7E7E7E7E7EULL));
  v128_t g, p, m = wasm_i64x2_splat(0);
#define KSV(S, MSK) p = MSK; g = wasm_v128_or(vP, wasm_v128_and(p, wasm_i64x2_shl(vP, S))); p = wasm_v128_and(p, wasm_i64x2_shl(p, S)); \
  g = wasm_v128_or(g, wasm_v128_and(p, wasm_i64x2_shl(g, 2 * S))); p = wasm_v128_and(p, wasm_i64x2_shl(p, 2 * S)); \
  g = wasm_v128_or(g, wasm_v128_and(p, wasm_i64x2_shl(g, 4 * S))); m = wasm_v128_or(m, wasm_i64x2_shl(wasm_v128_andnot(g, vP), S));
  KSV(8, vO) KSV(9, vI) KSV(7, vI)
  u64 r = (u64)wasm_i64x2_extract_lane(m, 0) | bswap64((u64)wasm_i64x2_extract_lane(m, 1)), gg, pp;
#define KSL1(S, MSK) pp = MSK; gg = P | (pp & (P << S)); pp &= pp << S; gg |= pp & (gg << (2 * S)); pp &= pp << (2 * S); gg |= pp & (gg << (4 * S)); r |= (gg & ~P) << S;
#define KSR1(S, MSK) pp = MSK; gg = P | (pp & (P >> S)); pp &= pp >> S; gg |= pp & (gg >> (2 * S)); pp &= pp >> (2 * S); gg |= pp & (gg >> (4 * S)); r |= (gg & ~P) >> S;
  KSL1(1, I) KSR1(1, I)
  return r & E;
}
#else
static u64 genMoves(u64 P, u64 O) {   // Kogge-Stone: each direction in 3 doubling steps instead of 6 single steps
  const u64 E = ~(P | O), I = O & 0x7E7E7E7E7E7E7E7EULL;
  u64 m = 0, g, p;
#define KSL(S, MSK) p = MSK; g = P | (p & (P << S)); p &= p << S; g |= p & (g << (2 * S)); p &= p << (2 * S); g |= p & (g << (4 * S)); m |= ((g & ~P) << S) & E;
#define KSR(S, MSK) p = MSK; g = P | (p & (P >> S)); p &= p >> S; g |= p & (g >> (2 * S)); p &= p >> (2 * S); g |= p & (g >> (4 * S)); m |= ((g & ~P) >> S) & E;
  KSL(1, I) KSR(1, I) KSL(8, O) KSR(8, O) KSL(9, I) KSR(9, I) KSL(7, I) KSR(7, I)
  return m;
}
#endif
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
static u64 RAYM[64][8];   // the squares beyond sq in each direction: 0..3 towards higher squares (+1 +7 +8 +9), 4..7 towards lower
static void initRayM(void) {
  static const int D[8][2] = { { 0, 1 }, { 1, -1 }, { 1, 0 }, { 1, 1 }, { 0, -1 }, { -1, 1 }, { -1, 0 }, { -1, -1 } };
  for (int sq = 0; sq < 64; sq++) for (int d = 0; d < 8; d++) {
    u64 m = 0; int r = (sq >> 3) + D[d][0], c = (sq & 7) + D[d][1];
    while (r >= 0 && r < 8 && c >= 0 && c < 8) { m |= 1ULL << (r * 8 + c); r += D[d][0]; c += D[d][1]; }
    RAYM[sq][d] = m;
  }
}
// the discs of O enclosed between sq and a disc of P, in the 8 directions (no loops: carry propagation upwards, leading zeros downwards)
#if defined(__wasm_simd128__) && defined(SIMD_FLIPS)
/* SIMD: lane 0 the board, lane 1 its vertical mirror (bswap), so the carry method for the directions +7 +8 +9 in lane 1 is
   -9 -8 -7 on the board; the horizontal pair is done in scalar. Branch-free. */
static v128_t RAYV[64][3];
static void initRayV(void) {
  for (int sq = 0; sq < 64; sq++) for (int k = 0; k < 3; k++) RAYV[sq][k] = wasm_i64x2_make(RAYM[sq][k + 1], RAYM[sq ^ 56][k + 1]);
}
static inline u64 flips(int sq, u64 P, u64 O) {
  const v128_t vP = wasm_i64x2_make(P, bswap64(P)), vO = wasm_i64x2_make(O, bswap64(O)), z = wasm_i64x2_splat(0);
  v128_t vf = z;
  for (int k = 0; k < 3; k++) {
    const v128_t M = RAYV[sq][k], lo = wasm_v128_and(M, wasm_i64x2_neg(M));
    const v128_t out = wasm_v128_andnot(wasm_v128_and(wasm_i64x2_add(wasm_v128_or(vO, wasm_v128_not(M)), lo), M), vO);
    const v128_t ok = wasm_v128_not(wasm_i64x2_eq(wasm_v128_and(out, vP), z));
    vf = wasm_v128_or(vf, wasm_v128_and(wasm_v128_and(wasm_i64x2_sub(out, lo), M), ok));
  }
  u64 f = (u64)wasm_i64x2_extract_lane(vf, 0) | bswap64((u64)wasm_i64x2_extract_lane(vf, 1));
  { const u64 M = RAYM[sq][0]; if (M) { const u64 lo = M & (0 - M), out = ((O | ~M) + lo) & M & ~O; if (out & P) f |= (out - lo) & M; } }
  { const u64 M = RAYM[sq][4], h = M & ~O; if (h) { const u64 out = 1ULL << (63 - __builtin_clzll(h)); if (out & P) f |= M & ~((out << 1) - 1); } }
  return f;
}
#else
#define initRayV()
/* BEGIN gen-flips */
/* generated by tools/gen-flips.py: one case per square, only the rays with two or more squares (a flip needs an
   opponent disc and then an own disc), the masks as constants */
#define FU(M, LO) { const u64 o_ = ((O | ~(M)) + (LO)) & (M) & ~O; if (o_ & P) f |= (o_ - (LO)) & (M); }
#define FD(M) { const u64 h_ = (M) & ~O; if (h_) { const u64 o_ = 1ULL << (63 - __builtin_clzll(h_)); if (o_ & P) f |= (M) & ~((o_ << 1) - 1); } }
static inline u64 flips(int sq, u64 P, u64 O) {
  u64 f = 0;
  switch (sq) {
  case 0: FU(0xFEULL, 0x2ULL) FU(0x101010101010100ULL, 0x100ULL) FU(0x8040201008040200ULL, 0x200ULL) break;
  case 1: FU(0xFCULL, 0x4ULL) FU(0x202020202020200ULL, 0x200ULL) FU(0x80402010080400ULL, 0x400ULL) break;
  case 2: FU(0xF8ULL, 0x8ULL) FU(0x10200ULL, 0x200ULL) FU(0x404040404040400ULL, 0x400ULL) FU(0x804020100800ULL, 0x800ULL) FD(0x3ULL) break;
  case 3: FU(0xF0ULL, 0x10ULL) FU(0x1020400ULL, 0x400ULL) FU(0x808080808080800ULL, 0x800ULL) FU(0x8040201000ULL, 0x1000ULL) FD(0x7ULL) break;
  case 4: FU(0xE0ULL, 0x20ULL) FU(0x102040800ULL, 0x800ULL) FU(0x1010101010101000ULL, 0x1000ULL) FU(0x80402000ULL, 0x2000ULL) FD(0xFULL) break;
  case 5: FU(0xC0ULL, 0x40ULL) FU(0x10204081000ULL, 0x1000ULL) FU(0x2020202020202000ULL, 0x2000ULL) FU(0x804000ULL, 0x4000ULL) FD(0x1FULL) break;
  case 6: FU(0x1020408102000ULL, 0x2000ULL) FU(0x4040404040404000ULL, 0x4000ULL) FD(0x3FULL) break;
  case 7: FU(0x102040810204000ULL, 0x4000ULL) FU(0x8080808080808000ULL, 0x8000ULL) FD(0x7FULL) break;
  case 8: FU(0xFE00ULL, 0x200ULL) FU(0x101010101010000ULL, 0x10000ULL) FU(0x4020100804020000ULL, 0x20000ULL) break;
  case 9: FU(0xFC00ULL, 0x400ULL) FU(0x202020202020000ULL, 0x20000ULL) FU(0x8040201008040000ULL, 0x40000ULL) break;
  case 10: FU(0xF800ULL, 0x800ULL) FU(0x1020000ULL, 0x20000ULL) FU(0x404040404040000ULL, 0x40000ULL) FU(0x80402010080000ULL, 0x80000ULL) FD(0x300ULL) break;
  case 11: FU(0xF000ULL, 0x1000ULL) FU(0x102040000ULL, 0x40000ULL) FU(0x808080808080000ULL, 0x80000ULL) FU(0x804020100000ULL, 0x100000ULL) FD(0x700ULL) break;
  case 12: FU(0xE000ULL, 0x2000ULL) FU(0x10204080000ULL, 0x80000ULL) FU(0x1010101010100000ULL, 0x100000ULL) FU(0x8040200000ULL, 0x200000ULL) FD(0xF00ULL) break;
  case 13: FU(0xC000ULL, 0x4000ULL) FU(0x1020408100000ULL, 0x100000ULL) FU(0x2020202020200000ULL, 0x200000ULL) FU(0x80400000ULL, 0x400000ULL) FD(0x1F00ULL) break;
  case 14: FU(0x102040810200000ULL, 0x200000ULL) FU(0x4040404040400000ULL, 0x400000ULL) FD(0x3F00ULL) break;
  case 15: FU(0x204081020400000ULL, 0x400000ULL) FU(0x8080808080800000ULL, 0x800000ULL) FD(0x7F00ULL) break;
  case 16: FU(0xFE0000ULL, 0x20000ULL) FU(0x101010101000000ULL, 0x1000000ULL) FU(0x2010080402000000ULL, 0x2000000ULL) FD(0x204ULL) FD(0x101ULL) break;
  case 17: FU(0xFC0000ULL, 0x40000ULL) FU(0x202020202000000ULL, 0x2000000ULL) FU(0x4020100804000000ULL, 0x4000000ULL) FD(0x408ULL) FD(0x202ULL) break;
  case 18: FU(0xF80000ULL, 0x80000ULL) FU(0x102000000ULL, 0x2000000ULL) FU(0x404040404000000ULL, 0x4000000ULL) FU(0x8040201008000000ULL, 0x8000000ULL) FD(0x30000ULL) FD(0x810ULL) FD(0x404ULL) FD(0x201ULL) break;
  case 19: FU(0xF00000ULL, 0x100000ULL) FU(0x10204000000ULL, 0x4000000ULL) FU(0x808080808000000ULL, 0x8000000ULL) FU(0x80402010000000ULL, 0x10000000ULL) FD(0x70000ULL) FD(0x1020ULL) FD(0x808ULL) FD(0x402ULL) break;
  case 20: FU(0xE00000ULL, 0x200000ULL) FU(0x1020408000000ULL, 0x8000000ULL) FU(0x1010101010000000ULL, 0x10000000ULL) FU(0x804020000000ULL, 0x20000000ULL) FD(0xF0000ULL) FD(0x2040ULL) FD(0x1010ULL) FD(0x804ULL) break;
  case 21: FU(0xC00000ULL, 0x400000ULL) FU(0x102040810000000ULL, 0x10000000ULL) FU(0x2020202020000000ULL, 0x20000000ULL) FU(0x8040000000ULL, 0x40000000ULL) FD(0x1F0000ULL) FD(0x4080ULL) FD(0x2020ULL) FD(0x1008ULL) break;
  case 22: FU(0x204081020000000ULL, 0x20000000ULL) FU(0x4040404040000000ULL, 0x40000000ULL) FD(0x3F0000ULL) FD(0x4040ULL) FD(0x2010ULL) break;
  case 23: FU(0x408102040000000ULL, 0x40000000ULL) FU(0x8080808080000000ULL, 0x80000000ULL) FD(0x7F0000ULL) FD(0x8080ULL) FD(0x4020ULL) break;
  case 24: FU(0xFE000000ULL, 0x2000000ULL) FU(0x101010100000000ULL, 0x100000000ULL) FU(0x1008040200000000ULL, 0x200000000ULL) FD(0x20408ULL) FD(0x10101ULL) break;
  case 25: FU(0xFC000000ULL, 0x4000000ULL) FU(0x202020200000000ULL, 0x200000000ULL) FU(0x2010080400000000ULL, 0x400000000ULL) FD(0x40810ULL) FD(0x20202ULL) break;
  case 26: FU(0xF8000000ULL, 0x8000000ULL) FU(0x10200000000ULL, 0x200000000ULL) FU(0x404040400000000ULL, 0x400000000ULL) FU(0x4020100800000000ULL, 0x800000000ULL) FD(0x3000000ULL) FD(0x81020ULL) FD(0x40404ULL) FD(0x20100ULL) break;
  case 27: FU(0xF0000000ULL, 0x10000000ULL) FU(0x1020400000000ULL, 0x400000000ULL) FU(0x808080800000000ULL, 0x800000000ULL) FU(0x8040201000000000ULL, 0x1000000000ULL) FD(0x7000000ULL) FD(0x102040ULL) FD(0x80808ULL) FD(0x40201ULL) break;
  case 28: FU(0xE0000000ULL, 0x20000000ULL) FU(0x102040800000000ULL, 0x800000000ULL) FU(0x1010101000000000ULL, 0x1000000000ULL) FU(0x80402000000000ULL, 0x2000000000ULL) FD(0xF000000ULL) FD(0x204080ULL) FD(0x101010ULL) FD(0x80402ULL) break;
  case 29: FU(0xC0000000ULL, 0x40000000ULL) FU(0x204081000000000ULL, 0x1000000000ULL) FU(0x2020202000000000ULL, 0x2000000000ULL) FU(0x804000000000ULL, 0x4000000000ULL) FD(0x1F000000ULL) FD(0x408000ULL) FD(0x202020ULL) FD(0x100804ULL) break;
  case 30: FU(0x408102000000000ULL, 0x2000000000ULL) FU(0x4040404000000000ULL, 0x4000000000ULL) FD(0x3F000000ULL) FD(0x404040ULL) FD(0x201008ULL) break;
  case 31: FU(0x810204000000000ULL, 0x4000000000ULL) FU(0x8080808000000000ULL, 0x8000000000ULL) FD(0x7F000000ULL) FD(0x808080ULL) FD(0x402010ULL) break;
  case 32: FU(0xFE00000000ULL, 0x200000000ULL) FU(0x101010000000000ULL, 0x10000000000ULL) FU(0x804020000000000ULL, 0x20000000000ULL) FD(0x2040810ULL) FD(0x1010101ULL) break;
  case 33: FU(0xFC00000000ULL, 0x400000000ULL) FU(0x202020000000000ULL, 0x20000000000ULL) FU(0x1008040000000000ULL, 0x40000000000ULL) FD(0x4081020ULL) FD(0x2020202ULL) break;
  case 34: FU(0xF800000000ULL, 0x800000000ULL) FU(0x1020000000000ULL, 0x20000000000ULL) FU(0x404040000000000ULL, 0x40000000000ULL) FU(0x2010080000000000ULL, 0x80000000000ULL) FD(0x300000000ULL) FD(0x8102040ULL) FD(0x4040404ULL) FD(0x2010000ULL) break;
  case 35: FU(0xF000000000ULL, 0x1000000000ULL) FU(0x102040000000000ULL, 0x40000000000ULL) FU(0x808080000000000ULL, 0x80000000000ULL) FU(0x4020100000000000ULL, 0x100000000000ULL) FD(0x700000000ULL) FD(0x10204080ULL) FD(0x8080808ULL) FD(0x4020100ULL) break;
  case 36: FU(0xE000000000ULL, 0x2000000000ULL) FU(0x204080000000000ULL, 0x80000000000ULL) FU(0x1010100000000000ULL, 0x100000000000ULL) FU(0x8040200000000000ULL, 0x200000000000ULL) FD(0xF00000000ULL) FD(0x20408000ULL) FD(0x10101010ULL) FD(0x8040201ULL) break;
  case 37: FU(0xC000000000ULL, 0x4000000000ULL) FU(0x408100000000000ULL, 0x100000000000ULL) FU(0x2020200000000000ULL, 0x200000000000ULL) FU(0x80400000000000ULL, 0x400000000000ULL) FD(0x1F00000000ULL) FD(0x40800000ULL) FD(0x20202020ULL) FD(0x10080402ULL) break;
  case 38: FU(0x810200000000000ULL, 0x200000000000ULL) FU(0x4040400000000000ULL, 0x400000000000ULL) FD(0x3F00000000ULL) FD(0x40404040ULL) FD(0x20100804ULL) break;
  case 39: FU(0x1020400000000000ULL, 0x400000000000ULL) FU(0x8080800000000000ULL, 0x800000000000ULL) FD(0x7F00000000ULL) FD(0x80808080ULL) FD(0x40201008ULL) break;
  case 40: FU(0xFE0000000000ULL, 0x20000000000ULL) FU(0x101000000000000ULL, 0x1000000000000ULL) FU(0x402000000000000ULL, 0x2000000000000ULL) FD(0x204081020ULL) FD(0x101010101ULL) break;
  case 41: FU(0xFC0000000000ULL, 0x40000000000ULL) FU(0x202000000000000ULL, 0x2000000000000ULL) FU(0x804000000000000ULL, 0x4000000000000ULL) FD(0x408102040ULL) FD(0x202020202ULL) break;
  case 42: FU(0xF80000000000ULL, 0x80000000000ULL) FU(0x102000000000000ULL, 0x2000000000000ULL) FU(0x404000000000000ULL, 0x4000000000000ULL) FU(0x1008000000000000ULL, 0x8000000000000ULL) FD(0x30000000000ULL) FD(0x810204080ULL) FD(0x404040404ULL) FD(0x201000000ULL) break;
  case 43: FU(0xF00000000000ULL, 0x100000000000ULL) FU(0x204000000000000ULL, 0x4000000000000ULL) FU(0x808000000000000ULL, 0x8000000000000ULL) FU(0x2010000000000000ULL, 0x10000000000000ULL) FD(0x70000000000ULL) FD(0x1020408000ULL) FD(0x808080808ULL) FD(0x402010000ULL) break;
  case 44: FU(0xE00000000000ULL, 0x200000000000ULL) FU(0x408000000000000ULL, 0x8000000000000ULL) FU(0x1010000000000000ULL, 0x10000000000000ULL) FU(0x4020000000000000ULL, 0x20000000000000ULL) FD(0xF0000000000ULL) FD(0x2040800000ULL) FD(0x1010101010ULL) FD(0x804020100ULL) break;
  case 45: FU(0xC00000000000ULL, 0x400000000000ULL) FU(0x810000000000000ULL, 0x10000000000000ULL) FU(0x2020000000000000ULL, 0x20000000000000ULL) FU(0x8040000000000000ULL, 0x40000000000000ULL) FD(0x1F0000000000ULL) FD(0x4080000000ULL) FD(0x2020202020ULL) FD(0x1008040201ULL) break;
  case 46: FU(0x1020000000000000ULL, 0x20000000000000ULL) FU(0x4040000000000000ULL, 0x40000000000000ULL) FD(0x3F0000000000ULL) FD(0x4040404040ULL) FD(0x2010080402ULL) break;
  case 47: FU(0x2040000000000000ULL, 0x40000000000000ULL) FU(0x8080000000000000ULL, 0x80000000000000ULL) FD(0x7F0000000000ULL) FD(0x8080808080ULL) FD(0x4020100804ULL) break;
  case 48: FU(0xFE000000000000ULL, 0x2000000000000ULL) FD(0x20408102040ULL) FD(0x10101010101ULL) break;
  case 49: FU(0xFC000000000000ULL, 0x4000000000000ULL) FD(0x40810204080ULL) FD(0x20202020202ULL) break;
  case 50: FU(0xF8000000000000ULL, 0x8000000000000ULL) FD(0x3000000000000ULL) FD(0x81020408000ULL) FD(0x40404040404ULL) FD(0x20100000000ULL) break;
  case 51: FU(0xF0000000000000ULL, 0x10000000000000ULL) FD(0x7000000000000ULL) FD(0x102040800000ULL) FD(0x80808080808ULL) FD(0x40201000000ULL) break;
  case 52: FU(0xE0000000000000ULL, 0x20000000000000ULL) FD(0xF000000000000ULL) FD(0x204080000000ULL) FD(0x101010101010ULL) FD(0x80402010000ULL) break;
  case 53: FU(0xC0000000000000ULL, 0x40000000000000ULL) FD(0x1F000000000000ULL) FD(0x408000000000ULL) FD(0x202020202020ULL) FD(0x100804020100ULL) break;
  case 54: FD(0x3F000000000000ULL) FD(0x404040404040ULL) FD(0x201008040201ULL) break;
  case 55: FD(0x7F000000000000ULL) FD(0x808080808080ULL) FD(0x402010080402ULL) break;
  case 56: FU(0xFE00000000000000ULL, 0x200000000000000ULL) FD(0x2040810204080ULL) FD(0x1010101010101ULL) break;
  case 57: FU(0xFC00000000000000ULL, 0x400000000000000ULL) FD(0x4081020408000ULL) FD(0x2020202020202ULL) break;
  case 58: FU(0xF800000000000000ULL, 0x800000000000000ULL) FD(0x300000000000000ULL) FD(0x8102040800000ULL) FD(0x4040404040404ULL) FD(0x2010000000000ULL) break;
  case 59: FU(0xF000000000000000ULL, 0x1000000000000000ULL) FD(0x700000000000000ULL) FD(0x10204080000000ULL) FD(0x8080808080808ULL) FD(0x4020100000000ULL) break;
  case 60: FU(0xE000000000000000ULL, 0x2000000000000000ULL) FD(0xF00000000000000ULL) FD(0x20408000000000ULL) FD(0x10101010101010ULL) FD(0x8040201000000ULL) break;
  case 61: FU(0xC000000000000000ULL, 0x4000000000000000ULL) FD(0x1F00000000000000ULL) FD(0x40800000000000ULL) FD(0x20202020202020ULL) FD(0x10080402010000ULL) break;
  case 62: FD(0x3F00000000000000ULL) FD(0x40404040404040ULL) FD(0x20100804020100ULL) break;
  case 63: FD(0x7F00000000000000ULL) FD(0x80808080808080ULL) FD(0x40201008040201ULL) break;
  }
  return f;
}
#undef FU
#undef FD
/* END gen-flips */
#endif
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
static TLS unsigned short STA[NSTK * MAXI], STB[NSTK * MAXI];   // pattern indices (< 3^10, fit 16 bits), a fixed stride of MAXI per ply so a child copies whole vectors
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
  int a0 = ply * MAXI;
  for (int i = 0; i < MAXI; i++) STA[a0 + i] = STB[a0 + i] = 0;
  for (u64 x = P; x; x &= x - 1) { int q = lsb(x); for (int j = SQ_START[q], e = SQ_START[q + 1]; j < e; j++) { STA[a0 + SQI[j]] += SQP[j]; STB[a0 + SQI[j]] += 2 * SQP[j]; } }
  for (u64 x = O; x; x &= x - 1) { int q = lsb(x); for (int j = SQ_START[q], e = SQ_START[q + 1]; j < e; j++) { STA[a0 + SQI[j]] += 2 * SQP[j]; STB[a0 + SQI[j]] += SQP[j]; } }
}
static void childIdx(int ply, int s, u64 f) {
  int a0 = ply * MAXI, c0 = a0 + MAXI;
  for (int i = 0; i < MAXI; i++) { STA[c0 + i] = STB[a0 + i]; STB[c0 + i] = STA[a0 + i]; }
  for (int j = SQ_START[s], e = SQ_START[s + 1]; j < e; j++) { STA[c0 + SQI[j]] += 2 * SQP[j]; STB[c0 + SQI[j]] += SQP[j]; }
  for (u64 x = f; x; x &= x - 1) { int q = lsb(x); for (int j = SQ_START[q], e = SQ_START[q + 1]; j < e; j++) { STA[c0 + SQI[j]] += SQP[j]; STB[c0 + SQI[j]] -= SQP[j]; } }
}
static void passIdx(int ply) {
  int a0 = ply * MAXI, c0 = a0 + MAXI;
  for (int i = 0; i < MAXI; i++) { STA[c0 + i] = STB[a0 + i]; STB[c0 + i] = STA[a0 + i]; }
}
static int evalAt(int ply, u64 P, u64 O) {
  int base = phaseOf(pc(P | O)) * PHASE_SIZE, a0 = ply * MAXI, s = W[base + PHASE_SIZE - 1];
  for (int i = 0; i < NINST; i++) s += W[base + I_OFF[i] + STA[a0 + i]];
  if (USE_EXT) s += extSum(P, O, base);
  return (s * 100) / 32;
}

// ------------------------------------------------------------------ search state
static TLS double nodes, deadline, nodeMax; static TLS int aborted;   /* nodeMax: PRO mode's node limit (0 = none) */
static TLS double MPC_T = 1.5, MPC_A = 357.32, MPC_B = 1.1, MPC_C = -3.14; static TLS int MPC_ON = 1, MPC_MIN = 3;
static TLS int T_EVALMIN = 12, T_SEARCHMIN = 14, T_SDEPTH = 1, T_KE = 8;
EXPORT(set_state) void set_state(double n, double dl, int mpcOn, double t, double a, double b, double c, int minDepth, int evalMin, int searchMin, int sDepth, int kE) {
  nodes = n; deadline = dl; aborted = 0; MPC_ON = mpcOn; MPC_T = t; MPC_A = a; MPC_B = b; MPC_C = c; MPC_MIN = minDepth;
  T_EVALMIN = evalMin; T_SEARCHMIN = searchMin; T_SDEPTH = sDepth; T_KE = kE;
}
EXPORT(set_node_max) void set_node_max(double n) { nodeMax = n; }
EXPORT(get_nodes) double get_nodes(void) { return nodes; }
EXPORT(get_aborted) int get_aborted(void) { return aborted; }
static inline void checkTime(void) {
#ifdef MT
  if (gStop) { aborted = 1; return; }
#endif
  if (deadline > 0 && now() > deadline) aborted = 1;
  if (nodeMax > 0 && nodes >= nodeMax) aborted = 1;
}

#ifndef MT
#define TT_SIZE (1 << 20)
#define TT_MASK (TT_SIZE - 1)
static u64 TKP[TT_SIZE], TKO[TT_SIZE]; static i16 T_LO[TT_SIZE], T_HI[TT_SIZE]; static i8 T_D[TT_SIZE], T_M[TT_SIZE];
#endif
#define ET_SIZE (1 << 19)
#define ET_MASK (ET_SIZE - 1)
#ifndef MT
static u64 EKP[ET_SIZE], EKO[ET_SIZE]; static i8 E_LO[ET_SIZE], E_HI[ET_SIZE], E_M[ET_SIZE]; static u8 E_V[ET_SIZE];
#else
/* MT (2026-11-09): the tables are written by many threads at once, so an entry is three 64-bit words checked against
   each other (k1 = P ^ data, k2 = O ^ data: an entry half written by another thread no longer matches and is a miss —
   before, the key of one position could be read with the bounds of another). The midgame table: buckets of 4 entries
   (the deepest / of this search kept, the shallowest / oldest replaced; before: one entry, always replaced, so the helpers'
   leaves wiped the lead's deep entries), 4M entries (96 MB) placed above the threads' slots by init(), and an age per
   search (tt_new). data: lo (16) | hi (16) | depth + 1 (8) | move (8) | age (8). */
typedef struct { u64 k1, k2, dt; } TTE;
static TTE *TTB; static u32 TTM; static u32 TT_AGE = 1; static int TT_LOG;
#define TT_LOG_MAX 20   /* buckets: 2^20 × 4 entries × 24 bytes */
static TTE ETB[ET_SIZE];   /* the endgame table: dt = empties (8, 0 = free) | move (8) | hi + 128 (8) | lo + 128 (8), low to high */
#define DT_LO(d) ((int)((d) & 0xFFFF) - 32768)
#define DT_HI(d) ((int)(((d) >> 16) & 0xFFFF) - 32768)
#define DT_D(d) ((int)(((d) >> 32) & 0xFF) - 1)
#define DT_M(d) ((int)(i8)(((d) >> 40) & 0xFF))
#define DT_A(d) ((u32)(((d) >> 48) & 0xFF))
static inline TTE *ttFind(u64 P, u64 O, u32 h, u64 *out) {
  TTE *b = TTB + ((h & TTM) << 2);
  for (int i = 0; i < 4; i++) { const u64 d = b[i].dt; if ((b[i].k1 ^ d) == P && (b[i].k2 ^ d) == O) { *out = d; return b + i; } }
  return 0;
}
static void ttStore(u64 P, u64 O, u32 h, int depth, int move, int lo, int hi) {
  TTE *b = TTB + ((h & TTM) << 2), *r = b; int rs = 1 << 30;
  const u64 nd = (u64)(u32)(lo + 32768) | (u64)(u32)(hi + 32768) << 16 | (u64)(u32)(depth + 1) << 32 | (u64)(u8)move << 40 | (u64)TT_AGE << 48;
  for (int i = 0; i < 4; i++) {
    const u64 d = b[i].dt;
    if ((b[i].k1 ^ d) == P && (b[i].k2 ^ d) == O) {   /* the same position: as the one-entry table (keep a deeper one of this search) */
      if (DT_D(d) > depth && DT_A(d) == TT_AGE) return;
      r = b + i; break;
    }
    const int s = DT_D(d) + (DT_A(d) == TT_AGE ? 128 : 0);
    if (s < rs) { rs = s; r = b + i; }
  }
  r->dt = nd; r->k1 = P ^ nd; r->k2 = O ^ nd;
}
static TLS int ROT1;
EXPORT(set_rot1) void set_rot1(int k) { ROT1 = k; }
EXPORT(tt_new) void tt_new(void) { u32 a = TT_AGE + 1; if (a > 255) a = 1; TT_AGE = a; }   /* the lead, at the start of each search */
EXPORT(tt_bits) int tt_bits(int n) { if (n > 0 && n <= TT_LOG) TTM = (1u << n) - 1; return TT_LOG; }   /* (tools/mt-sim.js: a smaller table) */
static inline int etGet(u64 P, u64 O, int i, int *lo, int *hi, int *mv) {
  for (int k = 0; k < 2; k++) {
    const u64 d = ETB[i + k].dt;
    if ((d & 0xFF) && (ETB[i + k].k1 ^ d) == P && (ETB[i + k].k2 ^ d) == O) { *lo = (int)((d >> 24) & 0xFF) - 128; *hi = (int)((d >> 16) & 0xFF) - 128; *mv = (i8)((d >> 8) & 0xFF); return i + k; }
  }
  return -1;
}
#endif
static u32 hash(u64 P, u64 O) {   // = engine.js hash on the four 32-bit halves
  u32 pl = (u32)P, ph = (u32)(P >> 32), ol = (u32)O, oh = (u32)(O >> 32);
  u32 h = ((pl ^ 0x9E3779B9u) * 0x85EBCA6Bu) ^ ((ph + 0x7F4A7C15u) * 0xC2B2AE35u) ^ ((ol ^ 0x165667B1u) * 0x27D4EB2Fu) ^ ((oh + 0x61C88647u) * 0x9E3779B1u);
  h ^= h >> 15; h *= 0x2C1B3C6Du; h ^= h >> 12; h *= 0x297A2D39u; h ^= h >> 15;
  return h;
}
#ifndef MT
EXPORT(clear_tt) void clear_tt(void) {
  for (int i = 0; i < TT_SIZE; i++) { T_D[i] = -1; T_M[i] = -1; }
  for (int i = 0; i < ET_SIZE; i++) { E_V[i] = 0; E_M[i] = -1; }
}
#else
static void ttAlloc(void) {   /* once (init): the midgame table above everything the page has placed (the threads' slots) */
  if (TTB) return;
  for (int lg = TT_LOG_MAX; lg >= 16; lg--) {
    const u32 pages = (u32)(((sizeof(TTE) << 2) << lg) >> 16), at = (u32)__builtin_wasm_memory_size(0);
    if (__builtin_wasm_memory_grow(0, pages) != (__SIZE_TYPE__)-1) { TTB = (TTE *)(at << 16); TT_LOG = lg; TTM = (1u << lg) - 1; return; }
  }
  static TTE small[4 << 12]; TTB = small; TT_LOG = 12; TTM = (1u << 12) - 1;   /* (no memory left: a small table) */
}
EXPORT(clear_tt) void clear_tt(void) {
  if (TTB) __builtin_memset(TTB, 0, (sizeof(TTE) << 2) << TT_LOG);
  __builtin_memset(ETB, 0, sizeof ETB);
}
#endif
static const i16 SQV[64] = {
  100, -20, 10, 5, 5, 10, -20, 100, -20, -50, -2, -2, -2, -2, -50, -20, 10, -2, 1, 1, 1, 1, -2, 10, 5, -2, 1, 0, 0, 1, -2, 5,
  5, -2, 1, 0, 0, 1, -2, 5, 10, -2, 1, 1, 1, 1, -2, 10, -20, -50, -2, -2, -2, -2, -50, -20, 100, -20, 10, 5, 5, 10, -20, 100 };
#define MAXPLY 64
static TLS i8 MV[MAXPLY * 36]; static TLS int SC[MAXPLY * 36];
static TLS u64 MF[MAXPLY * 36];   // the discs each move flips, kept from the ordering pass (0 = not computed)
static void sortMoves(int base, int n) {   // descending by SC, MF along
  for (int i = 1; i < n; i++) {
    int m = MV[base + i], s = SC[base + i], j = i - 1; u64 f = MF[base + i];
    while (j >= 0 && SC[base + j] < s) { MV[base + j + 1] = MV[base + j]; SC[base + j + 1] = SC[base + j]; MF[base + j + 1] = MF[base + j]; j--; }
    MV[base + j + 1] = (i8)m; SC[base + j + 1] = s; MF[base + j + 1] = f;
  }
}

// ------------------------------------------------------------------ midgame PVS
static int searchI(u64 P, u64 O, int depth, int alpha, int beta, int ply, int passed) {
  if (((long long)(++nodes) & 4095) == 0) { checkTime(); if (aborted) return 0; }
  if (depth <= 0) return evalAt(ply, P, O);
#ifndef MT
  u32 h = hash(P, O); int ti = h & TT_MASK, ttMove = -1;
  if (TKP[ti] == P && TKO[ti] == O && T_D[ti] >= 0) {
    ttMove = T_M[ti];
    if (T_D[ti] >= depth) {
      int lo = T_LO[ti], hi = T_HI[ti];
#else
  u32 h = hash(P, O); int ttMove = -1; u64 td;
  if (ttFind(P, O, h, &td)) {
    ttMove = DT_M(td);
    if (DT_D(td) >= depth) {
      int lo = DT_LO(td), hi = DT_HI(td);
#endif
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
  /* move ordering by a shallow search of each move. With Multi-ProbCut (Lv.15-20, analysis) shallower orderings and the
     table's move searched before the others are ordered (a cut by it skips the ordering): about 2-3x faster to the same
     depth with the same values. Without it (Lv.1-14) exactly as before. */
  int ordDepth = MPC_ON ? (depth >= 18 ? 3 : depth >= 12 ? 2 : depth >= 8 ? 1 : depth >= 3 ? 0 : -1)
    : depth >= 9 ? 3 : depth >= 6 ? 2 : depth >= 4 ? 1 : depth >= 3 ? 0 : -1;
  int alpha0 = alpha, best = -32767, bestMove = -1, first = 0;
#ifdef MT
  if (MPC_ON && ordDepth >= 0 && ttMove >= 0 && ((m >> ttMove) & 1) && !(ply == 1 && ROT1)) {
#else
  if (MPC_ON && ordDepth >= 0 && ttMove >= 0 && ((m >> ttMove) & 1)) {
#endif
    const int s = ttMove; const u64 f = flips(s, P, O), nP = P | f | (1ULL << s), nO = O & ~f;
    childIdx(ply, s, f);
    const int v = -searchI(nO, nP, depth - 1, -beta, -alpha, ply + 1, 0);
    if (aborted) return 0;
    best = v; bestMove = s; first = 1;
    if (v > alpha) { alpha = v; if (alpha >= beta) goto store; }
    m &= ~(1ULL << s); ttMove = -1;
  }
  for (u64 x = m; x; x &= x - 1) MV[base + n++] = (i8)lsb(x);
  for (int i = 0; i < n; i++) {
    int s = MV[base + i], sc;
    MF[base + i] = 0;
    if (s == ttMove) sc = 1 << 29;
    else if (ordDepth < 0) sc = SQV[s];
    else {
      u64 f = flips(s, P, O), nP = P | f | (1ULL << s), nO = O & ~f;
      MF[base + i] = f;
      childIdx(ply, s, f);
      if (ordDepth == 0) sc = -evalAt(ply + 1, nO, nP);
      else { sc = -searchI(nO, nP, ordDepth, -32000, 32000, ply + 1, 0); if (aborted) return 0; }
    }
    SC[base + i] = sc;
  }
  sortMoves(base, n);
#ifdef MT
  if (ply == 1 && ROT1 && n > 1) {   /* a helper: the replies to the root moves from another one (Lazy SMP diversity, rot1) */
    const int k = ROT1 % n; i8 tm[36]; int ts[36]; u64 tf[36];
    for (int i = 0; i < n; i++) { tm[i] = MV[base + (i + k) % n]; ts[i] = SC[base + (i + k) % n]; tf[i] = MF[base + (i + k) % n]; }
    for (int i = 0; i < n; i++) { MV[base + i] = tm[i]; SC[base + i] = ts[i]; MF[base + i] = tf[i]; }
  }
#endif
  if (bestMove < 0) bestMove = MV[base];
  for (int i = 0; i < n; i++) {
    int s = MV[base + i];
    u64 f = MF[base + i] ? MF[base + i] : flips(s, P, O), nP = P | f | (1ULL << s), nO = O & ~f;
    childIdx(ply, s, f);
    int v;
    if (i == 0 && !first) v = -searchI(nO, nP, depth - 1, -beta, -alpha, ply + 1, 0);
    else {
      v = -searchI(nO, nP, depth - 1, -alpha - 1, -alpha, ply + 1, 0);
      if (aborted) return 0;
      if (v > alpha && v < beta) v = -searchI(nO, nP, depth - 1, -beta, -v, ply + 1, 0);
    }
    if (aborted) return 0;
    if (v > best) { best = v; bestMove = s; if (v > alpha) { alpha = v; if (alpha >= beta) break; } }
  }
store:
#ifndef MT
  if (T_D[ti] <= depth || !(TKP[ti] == P && TKO[ti] == O)) {
    TKP[ti] = P; TKO[ti] = O; T_D[ti] = (i8)depth; T_M[ti] = (i8)bestMove;
    T_LO[ti] = (i16)(best > alpha0 ? best : -32767); T_HI[ti] = (i16)(best < beta ? best : 32767);
  }
#else
  ttStore(P, O, h, depth, bestMove, best > alpha0 ? best : -32767, best < beta ? best : 32767);
#endif
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
/* the last move: the number of discs it flips when every other square is filled, from four 8-bit lines (row, column and the
   two diagonals gathered into one byte each) and a table CNT[position in line][line of P] — no flip computation */
static u8 CNT[8][256];
static void initCnt(void) {
  for (int x = 0; x < 8; x++) for (int l = 0; l < 256; l++) {
    int n = 0;
    if (!((l >> x) & 1)) {
      int k = x + 1; while (k < 8 && !((l >> k) & 1)) k++; if (k < 8) n += k - x - 1;
      k = x - 1; while (k >= 0 && !((l >> k) & 1)) k--; if (k >= 0) n += x - k - 1;
    }
    CNT[x][l] = (u8)n;
  }
}
static inline int lastCount(int s, u64 P) {
  const int x = s & 7, y = s >> 3;
  const int row = (int)((P >> (8 * y)) & 0xFF);
  const int col = (int)((((P >> x) & 0x0101010101010101ULL) * 0x0102040810204080ULL) >> 56);
  const int d9 = (int)(((P & DIAG9M[y - x + 7]) * 0x0101010101010101ULL) >> 56);
  const int d7 = (int)(((P & DIAG7M[y + x]) * 0x0101010101010101ULL) >> 56);
  return CNT[x][row] + CNT[y][col] + CNT[x][d9] + CNT[x][d7];
}
static u64 NEIGH[64];   // the 8 squares around each square
/* the last 7 squares without move generation: each empty square is tried (a move must touch an opponent disc).
   P to move; the scores are for P. */
static inline int last1(u64 P, int x) {   // one empty square x, the board otherwise full
  ++nodes;
  const int d = 2 * pc(P) - 63;
  int n = lastCount(x, P);
  if (n) return d + 1 + 2 * n;
  ++nodes;   // (the pass)
  n = lastCount(x, ~P & ~(1ULL << x));
  if (n) return d - 1 - 2 * n;
  return d > 0 ? d + 1 : d - 1;
}
static int solve2(u64 P, u64 O, int alpha, int beta, int x1, int x2) {
  ++nodes;
  u64 f; int best = -99, v;
  if ((NEIGH[x1] & O) && (f = flips(x1, P, O))) { best = -last1(O & ~f, x2); if (best >= beta) return best; }
  if ((NEIGH[x2] & O) && (f = flips(x2, P, O))) { v = -last1(O & ~f, x1); return v > best ? v : best; }
  if (best > -99) return best;
  ++nodes;   // P passes: the opponent plays (still P's score)
  best = 99;
  if ((NEIGH[x1] & P) && (f = flips(x1, O, P))) { best = last1(P & ~f, x2); if (best <= alpha) return best; }
  if ((NEIGH[x2] & P) && (f = flips(x2, O, P))) { v = last1(P & ~f, x1); return v < best ? v : best; }
  if (best < 99) return best;
  return finalScore(P, O);
}
static int solve3(u64 P, u64 O, int alpha, int beta, int x1, int x2, int x3, int passed) {
  ++nodes;
  u64 f; int best = -99, v;
  if ((NEIGH[x1] & O) && (f = flips(x1, P, O))) { best = -solve2(O & ~f, P | f | (1ULL << x1), -beta, -alpha, x2, x3); if (best >= beta) return best; if (best > alpha) alpha = best; }
  if ((NEIGH[x2] & O) && (f = flips(x2, P, O))) { v = -solve2(O & ~f, P | f | (1ULL << x2), -beta, -alpha, x1, x3); if (v > best) { best = v; if (v >= beta) return v; if (v > alpha) alpha = v; } }
  if ((NEIGH[x3] & O) && (f = flips(x3, P, O))) { v = -solve2(O & ~f, P | f | (1ULL << x3), -beta, -alpha, x1, x2); if (v > best) best = v; }
  if (best > -99) return best;
  if (passed) return finalScore(P, O);
  return -solve3(O, P, -beta, -alpha, x1, x2, x3, 1);
}
/* 4-7 empties: E = the empty squares, par = the quadrants with an odd number of them. The squares in odd quadrants
   first, each group by square class (corners, edges, inner, X and C squares last); a move must touch an opponent disc */
static const u64 PRIO[4] = { 0x8100000000000081ULL, 0x3C0081818181003CULL, 0x003C7E7E7E7E3C00ULL, 0x42C300000000C342ULL };
static const u64 QPAR[16] = { 0x0ULL, 0xF0F0F0FULL, 0xF0F0F0F0ULL, 0xFFFFFFFFULL, 0xF0F0F0F00000000ULL, 0xF0F0F0F0F0F0F0FULL, 0xF0F0F0FF0F0F0F0ULL,
  0xF0F0F0FFFFFFFFFULL, 0xF0F0F0F000000000ULL, 0xF0F0F0F00F0F0F0FULL, 0xF0F0F0F0F0F0F0F0ULL, 0xF0F0F0F0FFFFFFFFULL, 0xFFFFFFFF00000000ULL,
  0xFFFFFFFF0F0F0F0FULL, 0xFFFFFFFFF0F0F0F0ULL, 0xFFFFFFFFFFFFFFFFULL };
static inline int solve3e(u64 P, u64 O, int alpha, int beta, u64 E, int passed) {   // three empties: a square alone in its quadrant first
  const int a = lsb(E); E &= E - 1; const int b = lsb(E); E &= E - 1; const int c = lsb(E);
  if (QUAD[a] == QUAD[b]) return solve3(P, O, alpha, beta, c, a, b, passed);
  if (QUAD[a] == QUAD[c]) return solve3(P, O, alpha, beta, b, a, c, passed);
  return solve3(P, O, alpha, beta, a, b, c, passed);
}
static int solveN(u64 P, u64 O, int alpha, int beta, int n, u64 E, int par, int passed) {
  ++nodes;
  int best = -99;
  const u64 cand = E & neighbours(O), odd = QPAR[par];
  for (int pass = 0; pass < 2; pass++) {
    const u64 cp = cand & (pass ? ~odd : odd);
    for (int k = 0; k < 4; k++) for (u64 c = cp & PRIO[k]; c; c &= c - 1) {
      const int x = lsb(c);
      const u64 f = flips(x, P, O); if (!f) continue;
      const u64 nP = P | f | (1ULL << x), nO = O & ~f, nE = E & ~(1ULL << x);
      const int v = n == 4 ? -solve3e(nO, nP, -beta, -alpha, nE, 0) : -solveN(nO, nP, -beta, -alpha, n - 1, nE, par ^ (1 << QUAD[x]), 0);
      if (v > best) { best = v; if (v > alpha) { alpha = v; if (alpha >= beta) return best; } }
    }
  }
  if (best > -99) return best;
  if (passed) return finalScore(P, O);
  return -solveN(O, P, -beta, -alpha, n, E, par, 1);
}
#define SMALL 7
static int solveSmall(u64 P, u64 O, int alpha, int beta, int empties, int passed) {
  const u64 E = ~(P | O);
  /* after a pass (passed) the side to move has a move (solve checked it), so 1 and 2 empties need no flag */
  if (empties == 1) return last1(P, lsb(E));
  if (empties == 2) { const int a = lsb(E); return solve2(P, O, alpha, beta, a, lsb(E & (E - 1))); }
  if (empties == 3) return solve3e(P, O, alpha, beta, E, passed);
  int par = 0; for (u64 x = E; x; x &= x - 1) par ^= 1 << QUAD[lsb(x)];
  return solveN(P, O, alpha, beta, empties, E, par, passed);
}
/* stability cutoff only where it can cut: alpha at least this (by empties; as in Edax) */
static const i8 STAB_T[65] = { 99, 99, 99, 99, 6, 8, 10, 12, 14, 16, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 48, 50, 50, 52, 52, 54, 54,
  56, 56, 58, 58, 60, 60, 62, 62, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64 };
static int STAB_ON = 1;
EXPORT(set_stab) void set_stab(int on, int mn) { STAB_ON = on; (void)mn; }
/* endgame table: two slots per bucket (the one with fewer empties is replaced; an entry with more empties than the root
   of this solve can never be reached again and counts as free). E_V = the empties of the entry (0 = free) */
static TLS int gRootE = 64;
#define ET_MIN 8
#ifndef MT
static inline int etFind(u64 P, u64 O, int i) {
  if (E_V[i] && EKP[i] == P && EKO[i] == O) return i;
  if (E_V[i + 1] && EKP[i + 1] == P && EKO[i + 1] == O) return i + 1;
  return -1;
}
#endif
static int solve(u64 P, u64 O, int alpha, int beta, int empties, int ply, int passed) {
  if (empties <= SMALL) return solveSmall(P, O, alpha, beta, empties, passed);
  if (((long long)(++nodes) & 16383) == 0) { checkTime(); if (aborted) return 0; }
  int ti = -1, hb = -1, ttMove = -1;
  if (empties >= ET_MIN) {
    hb = hash(P, O) & ET_MASK & ~1;
#ifndef MT
    ti = etFind(P, O, hb);
    if (ti >= 0) {
      int lo = E_LO[ti], hi = E_HI[ti];
#else
    int lo, hi, em;
    ti = etGet(P, O, hb, &lo, &hi, &em);
    if (ti >= 0) {
#endif
      if (lo >= beta) return lo;
      if (hi <= alpha) return hi;
      if (lo == hi) return lo;
      if (lo > alpha) alpha = lo;
      if (hi < beta) beta = hi;
#ifndef MT
      ttMove = E_M[ti];
#else
      ttMove = em;
#endif
    }
  }
  if (STAB_ON && alpha >= STAB_T[empties]) {   // the opponent's stable discs bound our score from above
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
  int base = ply * 36, n = 0, etc = empties >= 15, ev = empties >= T_EVALMIN && (m & (m - 1));
  if (ev) initIdx(ply, P, O);   // the children's pattern indices incrementally (for the evaluation / shallow search below)
  for (u64 x = m; x; x &= x - 1) MV[base + n++] = (i8)lsb(x);
  for (int i = 0; i < n; i++) {
    int s = MV[base + i];
    u64 f = flips(s, P, O), nP = P | f | (1ULL << s), nO = O & ~f;
    MF[base + i] = f;
    if (n == 1) break;
    if (etc) {
#ifndef MT
      int ci = etFind(nO, nP, hash(nO, nP) & ET_MASK & ~1);
      if (ci >= 0 && -E_HI[ci] >= beta) return -E_HI[ci];
#else
      int clo, chi, cm;
      if (etGet(nO, nP, hash(nO, nP) & ET_MASK & ~1, &clo, &chi, &cm) >= 0 && -chi >= beta) return -chi;
#endif
    }
    if (s == ttMove) { SC[base + i] = 1 << 29; continue; }
    u64 om = genMoves(nO, nP);
    int sc = -(pc(om) + 2 * pc(om & 0x8100000000000081ULL)) * 64;
    if (empties > 14) sc -= pc(neighbours(nP) & ~(nP | nO)) * 8;
    sc += SQV[s];
    if (ev) {
      childIdx(ply, s, f);
      if (empties >= T_SEARCHMIN) { int v = searchI(nO, nP, T_SDEPTH, -32000, 32000, ply + 1, 0); if (aborted) return 0; sc -= (v * T_KE) >> 4; }
      else sc -= (evalAt(ply + 1, nO, nP) * T_KE) >> 4;
    }
    SC[base + i] = sc;
  }
  sortMoves(base, n);
  int alpha0 = alpha, best = -99, bestMove = MV[base];
  for (int i = 0; i < n; i++) {
    int s = MV[base + i];
    u64 f = MF[base + i], nP = P | f | (1ULL << s), nO = O & ~f; int v;
    if (i == 0) v = -solve(nO, nP, -beta, -alpha, empties - 1, ply + 1, 0);
    else {
      v = -solve(nO, nP, -alpha - 1, -alpha, empties - 1, ply + 1, 0);
      if (aborted) return 0;
      if (v > alpha && v < beta) v = -solve(nO, nP, -beta, -v, empties - 1, ply + 1, 0);
    }
    if (aborted) return 0;
    if (v > best) { best = v; bestMove = s; if (v > alpha) { alpha = v; if (alpha >= beta) break; } }
  }
  if (hb >= 0) {
#ifndef MT
    ti = etFind(P, O, hb);
    if (ti < 0) { const int v0 = E_V[hb] > gRootE ? 0 : E_V[hb], v1 = E_V[hb + 1] > gRootE ? 0 : E_V[hb + 1]; ti = v0 <= v1 ? hb : hb + 1; }
    EKP[ti] = P; EKO[ti] = O; E_V[ti] = (u8)empties; E_M[ti] = (i8)bestMove;
    E_LO[ti] = (i8)(best > alpha0 ? best : -99); E_HI[ti] = (i8)(best < beta ? best : 99);
#else
    int x0, x1, x2;
    ti = etGet(P, O, hb, &x0, &x1, &x2);
    if (ti < 0) { const int e0 = (int)(ETB[hb].dt & 0xFF), e1 = (int)(ETB[hb + 1].dt & 0xFF), v0 = e0 > gRootE ? 0 : e0, v1 = e1 > gRootE ? 0 : e1; ti = v0 <= v1 ? hb : hb + 1; }
    const int lo = best > alpha0 ? best : -99, hi = best < beta ? best : 99;
    const u64 nd = (u64)(u8)empties | (u64)(u8)bestMove << 8 | (u64)(u32)(hi + 128) << 16 | (u64)(u32)(lo + 128) << 24;
    ETB[ti].dt = nd; ETB[ti].k1 = P ^ nd; ETB[ti].k2 = O ^ nd;
#endif
  }
  return best;
}

// ------------------------------------------------------------------ exports (boards as 32-bit halves, as in engine.js)
static inline u64 B(u32 l, u32 h) { return (u64)h << 32 | l; }
EXPORT(search) int search(u32 pl, u32 ph, u32 ol, u32 oh, int depth, int alpha, int beta, int ply, int passed) { return searchE(B(pl, ph), B(ol, oh), depth, alpha, beta, ply, passed); }
EXPORT(solve_) int solve_(u32 pl, u32 ph, u32 ol, u32 oh, int alpha, int beta, int empties, int ply, int passed) { gRootE = empties + 1; return solve(B(pl, ph), B(ol, oh), alpha, beta, empties, ply, passed); }
EXPORT(evaluate) int evaluate(u32 pl, u32 ph, u32 ol, u32 oh) { return evalFull(B(pl, ph), B(ol, oh)); }
EXPORT(init) void init(void) {
  initRays(); initRayM(); initRayV(); initDiag(); initCnt();
  for (int s = 0; s < 64; s++) NEIGH[s] = neighbours(1ULL << s);
  for (int s = 0; s < 64; s++) QUAD[s] = (i8)(((s >> 5) << 1) | ((s & 7) >> 2));
#ifdef MT
  ttAlloc();
#endif
  clear_tt();
}

#ifdef MT
/* ------------------------------------------------------------------ threads (engine_mt.wasm, see pro/) */
extern unsigned char __heap_base;
extern void __wasm_init_tls(void *);
EXPORT(mt_heap_base) u32 mt_heap_base(void) { return (u32)&__heap_base; }
/* every instance first: mt_stack (its own stack top; a function without a frame of its own), then mt_thread */
EXPORT(mt_stack) void mt_stack(u32 stackTop) { __asm__ volatile(".globaltype __stack_pointer, i32\n local.get %0\n global.set __stack_pointer" :: "r"(stackTop)); }
EXPORT(mt_thread) void mt_thread(u32 tls) { __wasm_init_tls((void *)tls); }
EXPORT(mt_stop) void mt_stop(int v) { __atomic_store_n(&gStop, v, __ATOMIC_SEQ_CST); }
#endif
