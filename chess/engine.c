/*
 * Chess engine core in C for WebAssembly (and native builds for testing).
 * Bitboards, PVS alpha-beta with the usual pruning, NNUE evaluation
 * (768 -> H)x2 -> 1 with SCReLU and material output buckets; optionally king buckets (the first layer per zone of the
 * own king, HalfKA-style; NN_KB below).
 *
 * Copyright 2026 core-calmdust — license not set yet (to be decided)
 */
typedef unsigned long long u64;
typedef unsigned int u32;
typedef int i32;
typedef short i16;
typedef signed char i8;
typedef unsigned char u8;
/* MT (engine_mt.wasm): several threads search together on one shared memory; per-thread state is TLS, the tables, the
   network and the transposition table are shared. Without MT TLS is nothing and the build is as before. Since 2026-11-10
   (MODEL_CARD.md「マルチスレッド v2（YBW と Lazy SMP の併用）」) helpers take moves at the split points (Young Brothers Wait,
   mt_idle) and the others search the root on their own ("Lazy SMP", mt_lazy): v2 the first helper only, since 2026-11-12
   (「マルチスレッド v3」) the first 10 threads (the pages' mt-helper.js / pro/mt-worker.js choose), with busy marks. */
#ifdef MT
#define TLS _Thread_local
#else
#define TLS
#endif

#ifdef __wasm__
#define EXPORT(name) __attribute__((export_name(#name)))
#define IMPORT(name) __attribute__((import_module("env"), import_name(#name)))
IMPORT(now) double js_now(void);
IMPORT(progress) void js_progress(i32 depth, i32 score, double nodes, i32 *pv, i32 pvlen);
void *memset(void *d, int c, unsigned long n) { u8 *p = d; while (n--) *p++ = (u8)c; return d; }
void *memcpy(void *d, const void *s, unsigned long n) { u8 *p = d; const u8 *q = s; while (n--) *p++ = *q++; return d; }
#else
#define EXPORT(name)
#include <string.h>
#include <time.h>
static double js_now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec * 1000.0 + t.tv_nsec / 1e6; }
static void (*progress_cb)(i32, i32, double, i32 *, i32);
static void js_progress(i32 d, i32 s, double n, i32 *pv, i32 l) { if (progress_cb) progress_cb(d, s, n, pv, l); }
#endif

#define popcount(x) __builtin_popcountll(x)
#define lsb(x) __builtin_ctzll(x)
#define BIT(s) (1ULL << (s))

enum { PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING };
enum { WHITE, BLACK };
#define EMPTY 12
#define PC(c, t) ((c) * 6 + (t))
#define TYPE(p) ((p) % 6)
#define COLOR(p) ((p) / 6)
#define INF 32000
#define MATE 31000
#define MATE_IN_MAX (MATE - 256)
#define MAXPLY 128

/* move: from | to<<6 | promo(1..4 = N,B,R,Q)<<12 | special(1 ep, 2 castle, 3 double)<<15 */
#define M_FROM(m) ((m) & 63)
#define M_TO(m) (((m) >> 6) & 63)
#define M_PROMO(m) (((m) >> 12) & 7)
#define M_SPEC(m) (((m) >> 15) & 3)
#define MK(f, t, pr, sp) ((f) | ((t) << 6) | ((pr) << 12) | ((sp) << 15))

/* ------------------------------------------------------------------ attack tables */
static u64 PAWN_ATK[2][64], KNIGHT_ATK[64], KING_ATK[64];
static u64 FILE_MASK_EX[64], DIAG_MASK_EX[64], ANTI_MASK_EX[64];
static u8 RANK_ATK[8][64];
static u64 BETWEEN[64][64], LINE[64][64];
static u64 bswap(u64 x) { return __builtin_bswap64(x); }
static inline u64 hq(u64 occ, u64 mask, int sq) {
  u64 o = occ & mask, s = BIT(sq), f = o - 2 * s, r = bswap(o) - 2 * bswap(s);
  return (f ^ bswap(r)) & mask;
}
static inline u64 rank_att(u64 occ, int sq) { int r = sq & 56, f = sq & 7; return (u64)RANK_ATK[f][(occ >> (r + 1)) & 63] << r; }
static inline u64 bishop_att(int sq, u64 occ) { return hq(occ, DIAG_MASK_EX[sq], sq) | hq(occ, ANTI_MASK_EX[sq], sq); }
static inline u64 rook_att(int sq, u64 occ) { return hq(occ, FILE_MASK_EX[sq], sq) | rank_att(occ, sq); }

static void init_attacks(void) {
  for (int s = 0; s < 64; s++) {
    int r = s >> 3, f = s & 7;
    static const int kd[8][2] = {{1, 2}, {2, 1}, {2, -1}, {1, -2}, {-1, -2}, {-2, -1}, {-2, 1}, {-1, 2}};
    for (int i = 0; i < 8; i++) { int rr = r + kd[i][0], ff = f + kd[i][1]; if (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) KNIGHT_ATK[s] |= BIT(rr * 8 + ff); }
    for (int dr = -1; dr <= 1; dr++) for (int df = -1; df <= 1; df++) { if (!dr && !df) continue; int rr = r + dr, ff = f + df; if (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) KING_ATK[s] |= BIT(rr * 8 + ff); }
    if (r < 7) { if (f > 0) PAWN_ATK[WHITE][s] |= BIT(s + 7); if (f < 7) PAWN_ATK[WHITE][s] |= BIT(s + 9); }
    if (r > 0) { if (f > 0) PAWN_ATK[BLACK][s] |= BIT(s - 9); if (f < 7) PAWN_ATK[BLACK][s] |= BIT(s - 7); }
    for (int rr = 0; rr < 8; rr++) if (rr != r) FILE_MASK_EX[s] |= BIT(rr * 8 + f);
    for (int k = -7; k <= 7; k++) { if (!k) continue; int rr = r + k, ff = f + k; if (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) DIAG_MASK_EX[s] |= BIT(rr * 8 + ff); ff = f - k; if (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) ANTI_MASK_EX[s] |= BIT(rr * 8 + ff); }
  }
  for (int f = 0; f < 8; f++) for (int o = 0; o < 64; o++) {
    int occ = o << 1, a = 0;
    for (int x = f + 1; x < 8; x++) { a |= 1 << x; if (occ & (1 << x)) break; }
    for (int x = f - 1; x >= 0; x--) { a |= 1 << x; if (occ & (1 << x)) break; }
    RANK_ATK[f][o] = (u8)a;
  }
  for (int a = 0; a < 64; a++) for (int b = 0; b < 64; b++) {
    if (a == b) continue;
    if (bishop_att(a, 0) & BIT(b)) { BETWEEN[a][b] = bishop_att(a, BIT(b)) & bishop_att(b, BIT(a)); LINE[a][b] = (bishop_att(a, 0) & bishop_att(b, 0)) | BIT(a) | BIT(b); }
    if (rook_att(a, 0) & BIT(b)) { BETWEEN[a][b] = rook_att(a, BIT(b)) & rook_att(b, BIT(a)); LINE[a][b] = (rook_att(a, 0) & rook_att(b, 0)) | BIT(a) | BIT(b); }
  }
}

/* ------------------------------------------------------------------ zobrist */
static u64 ZP[12][64], ZCAST[16], ZEP[8], ZSIDE;
static u64 rs = 0x9E3779B97F4A7C15ULL;
static u64 rnd64(void) { rs ^= rs >> 12; rs ^= rs << 25; rs ^= rs >> 27; return rs * 2685821657736338717ULL; }
static void init_zobrist(void) { for (int p = 0; p < 12; p++) for (int s = 0; s < 64; s++) ZP[p][s] = rnd64(); for (int i = 0; i < 16; i++) ZCAST[i] = rnd64(); for (int i = 0; i < 8; i++) ZEP[i] = rnd64(); ZSIDE = rnd64(); }

/* ------------------------------------------------------------------ NNUE */
#ifndef NN_H
#define NN_H 384
#endif
/* NN_KB: room for this many king buckets (the first layer has one 768 x H block per bucket of the own king's square).
   A net file says how many it uses: 1 = the v1 / v2 nets without king buckets (read as before, same evaluation), or 4 / 8 /
   16 / 32: the own king's square (seen from its side) picks the block (nn_setmap). */
#ifndef NN_KB
#define NN_KB 8   /* (2026-11-11: 8, was 4 — the site's v3 net has 4; room for 8 so that a KB=8 net can replace it without a new wasm) */
#endif
#define NN_IN 768
#define NN_BUCKETS 8
#define QA 255
#define QB 64
#define NN_SCALE 400
/* all weights in one block so the file can be copied in with a single memcpy (layout: W1, B1, W2, B2; a king-bucket net
   has W1 for every bucket and a 16-byte trailer "CKB1", buckets, H, 0 after B2) */
static struct { i16 W1[NN_KB * NN_IN * NN_H]; i16 B1[NN_H]; i16 W2[NN_BUCKETS][2 * NN_H]; i32 B2[NN_BUCKETS]; u8 tail[16]; } NN __attribute__((aligned(16)));
#define nnW1 NN.W1
#define nnB1 NN.B1
#define nnW2 NN.W2
#define nnB2 NN.B2
#define NN_REST ((NN_H + NN_BUCKETS * 2 * NN_H) * 2 + NN_BUCKETS * 4)   /* bytes of B1, W2, B2 */
#define NN_LEGACY (NN_IN * NN_H * 2 + NN_REST)                          /* a net without king buckets */
static int nnOn = 0, nnW2small = 0;   /* nnW2small: every |W2| <= 128, so clamp(acc)*W2 fits int16 (SIMD eval) */
static int nnKB = 1, nnFmt = 0, nnGen = 1;   /* buckets of the loaded net; nnFmt 0 = nothing parsed yet; nnGen: refresh caches */
static u8 nnKc[64];   /* own king square (seen from its side) -> king code: bucket * 2 + mirror */
static void nn_check(void) { nnW2small = 1; for (int b = 0; b < NN_BUCKETS; b++) for (int i = 0; i < 2 * NN_H; i++) if (nnW2[b][i] > 128 || nnW2[b][i] < -128) nnW2small = 0; }
/* the king buckets (the own king's square seen from its side: r = rank 0-7, f = file 0-7; the same table as train.py kb_table):
     4:  ranks 1-2 f-h (castled short) | ranks 1-2 a-c (castled long) | ranks 1-2 d-e | ranks 3-8
     8:  rank 1 f-h | rank 1 a-c | rank 1 d-e | rank 2 f-h | rank 2 a-c | rank 2 d-e | ranks 3-4 | ranks 5-8
     16: rank 1 a-b, c, d, e, f, g-h | rank 2 f-h, a-c, d-e | rank 3 a-d, e-h | ranks 4, 5, 6, 7, 8
     32: every square, mirrored to files a-d (HalfKA with mirroring; the pieces' files are mirrored with the king)
   4 / 8 / 16 are not mirrored, so copying a net without buckets into every bucket gives exactly its evaluation (the
   start of the training), and the usual king moves of the middle game (Kg1-h1-g2-f1 ...) stay in one bucket of 4: the
   accumulator is computed from scratch only when the king leaves its zone. */
static void nn_setmap(int kb) {
  for (int r = 0; r < 8; r++) for (int f = 0; f < 8; f++) {
    int z = f >= 5 ? 0 : f <= 2 ? 1 : 2, b = 0, m = 0;   /* z: f-h / a-c / d-e */
    if (kb == 4) b = r <= 1 ? z : 3;
    else if (kb == 8) b = r == 0 ? z : r == 1 ? 3 + z : r <= 3 ? 6 : 7;
    else if (kb == 16) b = r == 0 ? (f <= 1 ? 0 : f >= 6 ? 5 : f - 1) : r == 1 ? 6 + z : r == 2 ? 9 + (f >= 4) : 8 + r;
    else if (kb == 32) { m = f >= 4; b = r * 4 + (m ? 7 - f : f); }
    nnKc[r * 8 + f] = (u8)(b * 2 + m);
  }
}
static void nn_move(u8 *d, const u8 *s, int n) { if (d > s) while (n--) d[n] = s[n]; else for (int i = 0; i < n; i++) d[i] = s[i]; }
/* the file is at nn_ptr() (len bytes): put B1 / W2 / B2 where this build keeps them. Returns 1 if it is a net for this build. */
EXPORT(nn_load) int nn_load(int len) {
  u8 *b = (u8 *)&NN; int kb;
  if (len == NN_LEGACY) kb = 1;
  else {
    if (len < 16) return 0;
    const u8 *t = b + len - 16;
    if (t[0] != 'C' || t[1] != 'K' || t[2] != 'B' || t[3] != '1') return 0;
    kb = t[4] | t[5] << 8; int h = t[8] | t[9] << 8;
    if (h != NN_H || (kb != 4 && kb != 8 && kb != 16 && kb != 32) || kb > NN_KB || len != kb * NN_IN * NN_H * 2 + NN_REST + 16) return 0;
  }
  nn_move((u8 *)NN.B1, b + kb * NN_IN * NN_H * 2, NN_REST);
  nnKB = kb; nnFmt = 1; nnGen++; nn_setmap(kb); nn_check(); nnOn = 1;
  return 1;
}
EXPORT(nn_ptr) i16 *nn_ptr(void) { return NN.W1; }
EXPORT(nn_size) int nn_size(void) { return NN_LEGACY; }               /* the v1 / v2 net (the pages copy it in and call nn_enable) */
EXPORT(nn_cap) int nn_cap(void) { return (int)sizeof NN; }            /* the largest file nn_load can take */
EXPORT(nn_buckets) int nn_buckets(void) { return nnKB; }
EXPORT(nn_enable) void nn_enable(int on) { if (on && !nnFmt) nn_load(NN_LEGACY); nnOn = on; if (on) nn_check(); }
#ifndef __wasm__
static int nn_load_blob(const u8 *p, int n) { if (n > (int)sizeof NN) return 0; memcpy(&NN, p, n); return nn_load(n); }
#endif
#ifdef __wasm_simd128__
#include <wasm_simd128.h>
#endif
typedef struct { i16 v[2][NN_H] __attribute__((aligned(16))); } Acc;
/* king code of a perspective: bucket * 2 + mirror (0 for a net without king buckets) */
static inline int nn_kcode(int persp, int ksq) {
  return nnKB == 1 ? 0 : nnKc[persp == 1 ? ksq ^ 56 : ksq];
}
static inline const i16 *nn_w(int persp, int kc, int pc, int sq) {
  int c = COLOR(pc), t = TYPE(pc);
  if (persp == 1) { sq ^= 56; c ^= 1; }
  sq ^= (kc & 1) * 7;
  return nnW1 + ((kc >> 1) * NN_IN + (c * 6 + t) * 64 + sq) * NN_H;
}

/* ------------------------------------------------------------------ position */
typedef struct {
  u64 bb[12], occ[2], all;
  u8 board[64];
  int side, castle, ep, half, ply;   /* ep: square or -1 */
  u64 key;
  int ksq[2];
} Pos;
typedef struct { u64 key; int castle, ep, half; u8 cap; } Undo;

static TLS Pos P;
#define HIST_MAX 1024
static TLS u64 keyHist[HIST_MAX + MAXPLY + 8];
static TLS int histLen;   /* positions before the current one */
static TLS Undo undoStack[MAXPLY + 8];
static TLS Acc accStack[MAXPLY + 8];
static TLS int accDirty[MAXPLY + 8];   /* bit c: perspective c is not computed yet (ACC_ALL = both) */
static TLS u8 accKc[MAXPLY + 8][2];    /* the king code (nn_kcode) of each perspective at that ply */
#define ACC_ALL 3
static TLS int sp;   /* search ply: accStack[sp] belongs to the current position */
static int CASTLE_MASK[64];

static inline void put(Pos *p, int pc, int s) { p->bb[pc] |= BIT(s); p->occ[COLOR(pc)] |= BIT(s); p->all |= BIT(s); p->board[s] = (u8)pc; p->key ^= ZP[pc][s]; }
static inline void take(Pos *p, int s) { int pc = p->board[s]; p->bb[pc] &= ~BIT(s); p->occ[COLOR(pc)] &= ~BIT(s); p->all &= ~BIT(s); p->board[s] = EMPTY; p->key ^= ZP[pc][s]; }

static inline u64 attackers_to(const Pos *p, int s, u64 occ) {
  return (PAWN_ATK[BLACK][s] & p->bb[PC(WHITE, PAWN)]) | (PAWN_ATK[WHITE][s] & p->bb[PC(BLACK, PAWN)])
       | (KNIGHT_ATK[s] & (p->bb[PC(0, KNIGHT)] | p->bb[PC(1, KNIGHT)]))
       | (KING_ATK[s] & (p->bb[PC(0, KING)] | p->bb[PC(1, KING)]))
       | (bishop_att(s, occ) & (p->bb[PC(0, BISHOP)] | p->bb[PC(1, BISHOP)] | p->bb[PC(0, QUEEN)] | p->bb[PC(1, QUEEN)]))
       | (rook_att(s, occ) & (p->bb[PC(0, ROOK)] | p->bb[PC(1, ROOK)] | p->bb[PC(0, QUEEN)] | p->bb[PC(1, QUEEN)]));
}
static inline int attacked(const Pos *p, int s, int by) {
  if (PAWN_ATK[by ^ 1][s] & p->bb[PC(by, PAWN)]) return 1;
  if (KNIGHT_ATK[s] & p->bb[PC(by, KNIGHT)]) return 1;
  if (KING_ATK[s] & p->bb[PC(by, KING)]) return 1;
  u64 bq = p->bb[PC(by, BISHOP)] | p->bb[PC(by, QUEEN)], rq = p->bb[PC(by, ROOK)] | p->bb[PC(by, QUEEN)];
  if (bq && (bishop_att(s, p->all) & bq)) return 1;
  if (rq && (rook_att(s, p->all) & rq)) return 1;
  return 0;
}
static inline int in_check(const Pos *p) { return attacked(p, p->ksq[p->side], p->side ^ 1); }

/* pending accumulator change for the move just made at ply sp (applied lazily) */
static TLS struct { int na, ns, ap[2], as[2], spc[2], ss[2]; } accDelta[MAXPLY + 8];
/* a perspective from scratch, through a cache of the last accumulator for each king code ("Finny table": only the pieces
   that differ from the cached position are added / removed; the int16 sums wrap the same way, so the result is exact) */
typedef struct { i16 v[NN_H] __attribute__((aligned(16))); u64 bb[12]; int gen; } NnCache;
static TLS NnCache nnCache[2][NN_KB * 2];
static void nn_refresh1(const Pos *p, i16 *a, int c, int kc) {
  NnCache *e = &nnCache[c][kc];
  if (e->gen != nnGen) { for (int i = 0; i < NN_H; i++) e->v[i] = nnB1[i]; for (int k = 0; k < 12; k++) e->bb[k] = 0; e->gen = nnGen; }
  /* the pieces that differ from the cached position */
  const i16 *ad[32], *sb[32]; int na = 0, ns = 0;
  for (int pc = 0; pc < 12; pc++) {
    u64 add = p->bb[pc] & ~e->bb[pc], sub = e->bb[pc] & ~p->bb[pc];
    while (add && na < 32) { int s = lsb(add); add &= add - 1; ad[na++] = nn_w(c, kc, pc, s); }
    while (sub && ns < 32) { int s = lsb(sub); sub &= sub - 1; sb[ns++] = nn_w(c, kc, pc, s); }
    e->bb[pc] = p->bb[pc];
  }
  /* in passes of one add and one sub (as nn_update1), on the cached accumulator, then copied out */
  i16 *v = e->v; int k = 0;
  for (; k < na && k < ns; k++) { const i16 *x = ad[k], *y = sb[k];
#ifdef __wasm_simd128__
    for (int i = 0; i < NN_H; i += 8) wasm_v128_store(v + i, wasm_i16x8_sub(wasm_i16x8_add(wasm_v128_load(v + i), wasm_v128_load(x + i)), wasm_v128_load(y + i)));
#else
    for (int i = 0; i < NN_H; i++) v[i] = (i16)(v[i] + x[i] - y[i]);
#endif
  }
  for (int j = k; j < na; j++) { const i16 *x = ad[j];
#ifdef __wasm_simd128__
    for (int i = 0; i < NN_H; i += 8) wasm_v128_store(v + i, wasm_i16x8_add(wasm_v128_load(v + i), wasm_v128_load(x + i)));
#else
    for (int i = 0; i < NN_H; i++) v[i] = (i16)(v[i] + x[i]);
#endif
  }
  for (int j = k; j < ns; j++) { const i16 *y = sb[j];
#ifdef __wasm_simd128__
    for (int i = 0; i < NN_H; i += 8) wasm_v128_store(v + i, wasm_i16x8_sub(wasm_v128_load(v + i), wasm_v128_load(y + i)));
#else
    for (int i = 0; i < NN_H; i++) v[i] = (i16)(v[i] - y[i]);
#endif
  }
#ifdef __wasm_simd128__
  for (int i = 0; i < NN_H; i += 8) wasm_v128_store(a + i, wasm_v128_load(v + i));
#else
  for (int i = 0; i < NN_H; i++) a[i] = v[i];
#endif
}
/* update perspective c of dst from src with up to 2 adds and 2 subs (king code kc) */
static void nn_update1(i16 *y, const i16 *x, int c, int kc, int na, const int *ap, const int *as, int ns, const int *sp_, const int *ss) {
  const i16 *a0 = na > 0 ? nn_w(c, kc, ap[0], as[0]) : 0, *a1 = na > 1 ? nn_w(c, kc, ap[1], as[1]) : 0;
  const i16 *s0 = ns > 0 ? nn_w(c, kc, sp_[0], ss[0]) : 0, *s1 = ns > 1 ? nn_w(c, kc, sp_[1], ss[1]) : 0;
#ifdef __wasm_simd128__
  if (na == 1 && ns == 1) { for (int i = 0; i < NN_H; i += 8) wasm_v128_store(y + i, wasm_i16x8_sub(wasm_i16x8_add(wasm_v128_load(x + i), wasm_v128_load(a0 + i)), wasm_v128_load(s0 + i))); return; }
  if (na == 1 && ns == 2) { for (int i = 0; i < NN_H; i += 8) wasm_v128_store(y + i, wasm_i16x8_sub(wasm_i16x8_sub(wasm_i16x8_add(wasm_v128_load(x + i), wasm_v128_load(a0 + i)), wasm_v128_load(s0 + i)), wasm_v128_load(s1 + i))); return; }
  if (na == 2 && ns == 2) { for (int i = 0; i < NN_H; i += 8) wasm_v128_store(y + i, wasm_i16x8_sub(wasm_i16x8_sub(wasm_i16x8_add(wasm_i16x8_add(wasm_v128_load(x + i), wasm_v128_load(a0 + i)), wasm_v128_load(a1 + i)), wasm_v128_load(s0 + i)), wasm_v128_load(s1 + i))); return; }
#endif
  if (na == 1 && ns == 1) for (int i = 0; i < NN_H; i++) y[i] = x[i] + a0[i] - s0[i];
  else if (na == 1 && ns == 2) for (int i = 0; i < NN_H; i++) y[i] = x[i] + a0[i] - s0[i] - s1[i];
  else if (na == 2 && ns == 2) for (int i = 0; i < NN_H; i++) y[i] = x[i] + a0[i] + a1[i] - s0[i] - s1[i];
  else { for (int i = 0; i < NN_H; i++) { int v = x[i]; if (a0) v += a0[i]; if (a1) v += a1[i]; if (s0) v -= s0[i]; if (s1) v -= s1[i]; y[i] = (i16)v; } }
}

static int nn_eval(const Pos *p) {
  Acc *a = &accStack[sp];
  for (int c = 0; c < 2 && accDirty[sp]; c++) {
    int bit = 1 << c; if (!(accDirty[sp] & bit)) continue;
    /* the last ancestor with this perspective computed; roll forward from it while the own king keeps its code
       (a move of the king to another bucket or across the middle = the perspective from scratch) */
    int k = sp; while (k > 0 && (accDirty[k] & bit)) k--;
    int kc = nn_kcode(c, p->ksq[c]);
    if ((accDirty[k] & bit) || accKc[k][c] != kc) { nn_refresh1(p, a->v[c], c, kc); accKc[sp][c] = (u8)kc; accDirty[sp] &= ~bit; continue; }
    for (int j = k + 1; j <= sp; j++) {
      nn_update1(accStack[j].v[c], accStack[j - 1].v[c], c, kc, accDelta[j].na, accDelta[j].ap, accDelta[j].as, accDelta[j].ns, accDelta[j].spc, accDelta[j].ss);
      if (accKc[j][c] == kc) accDirty[j] &= ~bit;   /* (a ply in between with the king elsewhere stays to be computed) */
    }
  }
#ifdef NN_VERIFY   /* test builds (tools/nnue/build.sh VERIFY=1): every evaluation against a fresh sum of the weights */
  for (int c = 0; c < 2; c++) {
    int kc = nn_kcode(c, p->ksq[c]); i16 t[NN_H];
    for (int i = 0; i < NN_H; i++) t[i] = nnB1[i];
    for (u64 b = p->all; b; b &= b - 1) { int s = lsb(b); const i16 *w = nn_w(c, kc, p->board[s], s); for (int i = 0; i < NN_H; i++) t[i] += w[i]; }
    for (int i = 0; i < NN_H; i++) if (t[i] != a->v[c][i]) { fprintf(stderr, "NN_VERIFY: accumulator differs (ply %d, perspective %d)\n", sp, c); abort(); }
  }
#endif
  int bucket = (popcount(p->all) - 2) / 4; if (bucket > 7) bucket = 7; if (bucket < 0) bucket = 0;
  const i16 *us = a->v[p->side], *them = a->v[p->side ^ 1], *w = nnW2[bucket];
  /* sum is in QA*QA*QB units; 16-wide i32 partial sums cannot overflow, the total is kept in 64 bits */
  long long sum = 0;
#ifdef __wasm_simd128__
  /* exact same total: x = clamp(acc, 0, QA); x*w fits int16 when |w| <= 128, then i32x4_dot_i16x8 with x gives x*x*w summed in pairs
     (each int32 lane holds at most 2*65025*128 per block before widening to 64 bits) */
  if (nnW2small) {
    const v128_t lo = wasm_i16x8_splat(0), hi = wasm_i16x8_splat(QA);
    v128_t s64 = wasm_i64x2_splat(0);
    for (int i = 0; i < NN_H; i += 8) {
      v128_t xa = wasm_i16x8_min(wasm_i16x8_max(wasm_v128_load(us + i), lo), hi), xb = wasm_i16x8_min(wasm_i16x8_max(wasm_v128_load(them + i), lo), hi);
      v128_t pa = wasm_i32x4_dot_i16x8(wasm_i16x8_mul(xa, wasm_v128_load(w + i)), xa), pb = wasm_i32x4_dot_i16x8(wasm_i16x8_mul(xb, wasm_v128_load(w + NN_H + i)), xb);
      v128_t p = wasm_i32x4_add(pa, pb);
      s64 = wasm_i64x2_add(s64, wasm_i64x2_add(wasm_i64x2_extend_low_i32x4(p), wasm_i64x2_extend_high_i32x4(p)));
    }
    sum = wasm_i64x2_extract_lane(s64, 0) + wasm_i64x2_extract_lane(s64, 1);
  } else
#endif
  for (int i0 = 0; i0 < NN_H; i0 += 16) {
    i32 part = 0;
    for (int i = i0; i < i0 + 16; i++) { i32 x = us[i] < 0 ? 0 : us[i] > QA ? QA : us[i]; part += x * x * w[i]; }
    for (int i = i0; i < i0 + 16; i++) { i32 x = them[i] < 0 ? 0 : them[i] > QA ? QA : them[i]; part += x * x * w[NN_H + i]; }
    sum += part;
  }
  long long v = sum / QA + nnB2[bucket];
  return (int)(v * NN_SCALE / (QA * QB));
}

/* ------------------------------------------------------------------ hand-made evaluation (fallback until a net is loaded) */
static const int MGV[6] = {82, 337, 365, 477, 1025, 0}, EGV[6] = {94, 281, 297, 512, 936, 0};
static const i8 PST_MG[6][64] = {
 {0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0},
 {-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50},
 {-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20},
 {0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0},
 {-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20},
 {-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20}};
static const i8 PST_EGP[64] = {0,0,0,0,0,0,0,0, 90,90,90,90,90,90,90,90, 55,55,50,45,45,50,55,55, 30,30,25,20,20,25,30,30, 15,15,10,10,10,10,15,15, 5,5,0,0,0,0,5,5, 0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0};
static const i8 PST_EGK[64] = {-50,-40,-30,-20,-20,-30,-40,-50, -30,-20,-10,0,0,-10,-20,-30, -30,-10,20,30,30,20,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,20,30,30,20,-10,-30, -30,-30,0,0,0,0,-30,-30, -50,-30,-30,-30,-30,-30,-30,-50};
static const int PHASE_W[6] = {0, 1, 1, 2, 4, 0};
static int hce_eval(const Pos *p) {
  int mg = 0, eg = 0, ph = 0;
  for (int pc = 0; pc < 12; pc++) {
    u64 b = p->bb[pc]; int c = COLOR(pc), t = TYPE(pc), sgn = c == WHITE ? 1 : -1;
    while (b) {
      int s = lsb(b); b &= b - 1;
      int idx = c == WHITE ? (7 - (s >> 3)) * 8 + (s & 7) : s;
      int e = t == PAWN ? PST_EGP[idx] : t == KING ? PST_EGK[idx] : (t == KNIGHT || t == BISHOP) ? PST_MG[t][idx] * 6 / 10 : PST_MG[t][idx];
      mg += sgn * (MGV[t] + PST_MG[t][idx]); eg += sgn * (EGV[t] + e); ph += PHASE_W[t];
    }
  }
  if (ph > 24) ph = 24;
  int v = (mg * ph + eg * (24 - ph)) / 24;
  return p->side == WHITE ? v : -v;
}
static inline int evaluate(const Pos *p) {
  int v = nnOn ? nn_eval(p) : hce_eval(p);
  /* scale towards a draw as the fifty-move counter grows */
  return v * (200 - p->half) / 200;
}

/* ------------------------------------------------------------------ make / unmake */
static void make_move(Pos *p, int m) {
  Undo *u = &undoStack[sp];
  int from = M_FROM(m), to = M_TO(m), pr = M_PROMO(m), spc = M_SPEC(m), us = p->side, them = us ^ 1;
  int pc = p->board[from], cap = spc == 1 ? PC(them, PAWN) : p->board[to];
  u->key = p->key; u->castle = p->castle; u->ep = p->ep; u->half = p->half; u->cap = (u8)cap;
  keyHist[histLen + sp] = p->key;
  if (p->ep >= 0) p->key ^= ZEP[p->ep & 7];
  p->key ^= ZCAST[p->castle];
  int na = 0, ns = 0, ap[2], as[2], spp[2], ss[2];
  if (spc == 1) { int cs = to + (us == WHITE ? -8 : 8); take(p, cs); spp[ns] = cap; ss[ns++] = cs; }
  else if (cap != EMPTY) { take(p, to); spp[ns] = cap; ss[ns++] = to; }
  take(p, from); spp[ns] = pc; ss[ns++] = from;
  int np = pr ? PC(us, pr) : pc;
  put(p, np, to); ap[na] = np; as[na++] = to;
  if (spc == 2) {
    int rf, rt; if (to > from) { rf = from + 3; rt = from + 1; } else { rf = from - 4; rt = from - 1; }
    int rook = p->board[rf]; take(p, rf); put(p, rook, rt);
    spp[ns] = rook; ss[ns++] = rf; ap[na] = rook; as[na++] = rt;
  }
  p->castle &= CASTLE_MASK[from] & CASTLE_MASK[to];
  p->ep = -1;
  if (spc == 3) { int e = (from + to) >> 1; if (PAWN_ATK[us][e] & p->bb[PC(them, PAWN)]) p->ep = e; }
  if (p->ep >= 0) p->key ^= ZEP[p->ep & 7];
  p->key ^= ZCAST[p->castle] ^ ZSIDE;
  p->half = (TYPE(pc) == PAWN || cap != EMPTY) ? 0 : p->half + 1;
  if (TYPE(pc) == KING) p->ksq[us] = to;
  p->side = them; p->ply++;
  sp++;
  accDirty[sp] = ACC_ALL; accKc[sp][0] = (u8)nn_kcode(0, p->ksq[0]); accKc[sp][1] = (u8)nn_kcode(1, p->ksq[1]);
  accDelta[sp].na = na; accDelta[sp].ns = ns;
  for (int i = 0; i < na; i++) { accDelta[sp].ap[i] = ap[i]; accDelta[sp].as[i] = as[i]; }
  for (int i = 0; i < ns; i++) { accDelta[sp].spc[i] = spp[i]; accDelta[sp].ss[i] = ss[i]; }
}
static void unmake_move(Pos *p, int m) {
  sp--;
  Undo *u = &undoStack[sp];
  int from = M_FROM(m), to = M_TO(m), pr = M_PROMO(m), spc = M_SPEC(m);
  p->side ^= 1; p->ply--;
  int us = p->side;
  int pc = pr ? PC(us, PAWN) : p->board[to];
  take(p, to); put(p, pc, from);
  if (spc == 1) put(p, u->cap, to + (us == WHITE ? -8 : 8));
  else if (u->cap != EMPTY) put(p, u->cap, to);
  if (spc == 2) { int rf, rt; if (to > from) { rf = from + 3; rt = from + 1; } else { rf = from - 4; rt = from - 1; } int rook = p->board[rt]; take(p, rt); put(p, rook, rf); }
  if (TYPE(pc) == KING) p->ksq[us] = from;
  p->castle = u->castle; p->ep = u->ep; p->half = u->half; p->key = u->key;
}
static void make_null(Pos *p) {
  Undo *u = &undoStack[sp];
  u->key = p->key; u->ep = p->ep; u->half = p->half; u->castle = p->castle; u->cap = EMPTY;
  keyHist[histLen + sp] = p->key;
  if (p->ep >= 0) p->key ^= ZEP[p->ep & 7];
  p->ep = -1; p->key ^= ZSIDE; p->side ^= 1; p->half++; p->ply++;
  sp++;
  accDirty[sp] = ACC_ALL; accKc[sp][0] = (u8)nn_kcode(0, p->ksq[0]); accKc[sp][1] = (u8)nn_kcode(1, p->ksq[1]); accDelta[sp].na = 0; accDelta[sp].ns = 0;
}
static void unmake_null(Pos *p) { sp--; Undo *u = &undoStack[sp]; p->side ^= 1; p->ply--; p->ep = u->ep; p->half = u->half; p->key = u->key; }

/* ------------------------------------------------------------------ move generation (pseudo-legal) */
static int gen_moves(const Pos *p, int *list, int capsOnly) {
  int n = 0, us = p->side, them = us ^ 1;
  u64 own = p->occ[us], opp = p->occ[them], occ = p->all;
  u64 tgt = capsOnly ? opp : ~own;
  /* pawns */
  u64 pawns = p->bb[PC(us, PAWN)];
  int fwd = us == WHITE ? 8 : -8;
  u64 rank8 = us == WHITE ? 0xFF00000000000000ULL : 0xFFULL, rank3 = us == WHITE ? 0xFF0000ULL : 0xFF0000000000ULL;
  u64 one = (us == WHITE ? pawns << 8 : pawns >> 8) & ~occ;
  u64 two = (us == WHITE ? (one & rank3) << 8 : (one & rank3) >> 8) & ~occ;
  u64 b = one & rank8;
  while (b) { int t = lsb(b); b &= b - 1; for (int pr = 4; pr >= 1; pr--) { if (capsOnly && pr != 4) continue; list[n++] = MK(t - fwd, t, pr, 0); } }
  if (!capsOnly) {
    b = one & ~rank8; while (b) { int t = lsb(b); b &= b - 1; list[n++] = MK(t - fwd, t, 0, 0); }
    b = two; while (b) { int t = lsb(b); b &= b - 1; list[n++] = MK(t - 2 * fwd, t, 0, 3); }
  }
  u64 pw = pawns;
  while (pw) {
    int f = lsb(pw); pw &= pw - 1;
    u64 a = PAWN_ATK[us][f] & opp;
    while (a) { int t = lsb(a); a &= a - 1; if (BIT(t) & rank8) { for (int pr = 4; pr >= 1; pr--) list[n++] = MK(f, t, pr, 0); } else list[n++] = MK(f, t, 0, 0); }
    if (p->ep >= 0 && (PAWN_ATK[us][f] & BIT(p->ep))) list[n++] = MK(f, p->ep, 0, 1);
  }
  /* pieces */
  for (int t = KNIGHT; t <= KING; t++) {
    u64 pcs = p->bb[PC(us, t)];
    while (pcs) {
      int f = lsb(pcs); pcs &= pcs - 1;
      u64 a = t == KNIGHT ? KNIGHT_ATK[f] : t == BISHOP ? bishop_att(f, occ) : t == ROOK ? rook_att(f, occ) : t == QUEEN ? bishop_att(f, occ) | rook_att(f, occ) : KING_ATK[f];
      a &= tgt;
      while (a) { int to = lsb(a); a &= a - 1; list[n++] = MK(f, to, 0, 0); }
    }
  }
  /* castling */
  if (!capsOnly && p->castle) {
    int k = p->ksq[us];
    if (us == WHITE) {
      if ((p->castle & 1) && !(occ & 0x60ULL) && !attacked(p, 4, them) && !attacked(p, 5, them) && !attacked(p, 6, them)) list[n++] = MK(4, 6, 0, 2);
      if ((p->castle & 2) && !(occ & 0x0EULL) && !attacked(p, 4, them) && !attacked(p, 3, them) && !attacked(p, 2, them)) list[n++] = MK(4, 2, 0, 2);
    } else {
      if ((p->castle & 4) && !(occ & 0x6000000000000000ULL) && !attacked(p, 60, them) && !attacked(p, 61, them) && !attacked(p, 62, them)) list[n++] = MK(60, 62, 0, 2);
      if ((p->castle & 8) && !(occ & 0x0E00000000000000ULL) && !attacked(p, 60, them) && !attacked(p, 59, them) && !attacked(p, 58, them)) list[n++] = MK(60, 58, 0, 2);
    }
    (void)k;
  }
  return n;
}
/* legality of a pseudo-legal move without making it */
static int is_legal(const Pos *p, int m) {
  int from = M_FROM(m), to = M_TO(m), us = p->side, them = us ^ 1, k = p->ksq[us];
  if (M_SPEC(m) == 2) return 1;   /* checked during generation */
  if (from == k) {
    u64 occ = p->all ^ BIT(from), ex = ~BIT(to);
    if (PAWN_ATK[us][to] & p->bb[PC(them, PAWN)] & ex) return 0;
    if (KNIGHT_ATK[to] & p->bb[PC(them, KNIGHT)] & ex) return 0;
    if (KING_ATK[to] & p->bb[PC(them, KING)]) return 0;
    if (bishop_att(to, occ) & (p->bb[PC(them, BISHOP)] | p->bb[PC(them, QUEEN)]) & ex) return 0;
    if (rook_att(to, occ) & (p->bb[PC(them, ROOK)] | p->bb[PC(them, QUEEN)]) & ex) return 0;
    return 1;
  }
  u64 occ = (p->all ^ BIT(from)) | BIT(to);
  u64 capMask = BIT(to);
  if (M_SPEC(m) == 1) { int cs = to + (us == WHITE ? -8 : 8); occ ^= BIT(cs); capMask |= BIT(cs); }
  u64 bq = (p->bb[PC(them, BISHOP)] | p->bb[PC(them, QUEEN)]) & ~capMask, rq = (p->bb[PC(them, ROOK)] | p->bb[PC(them, QUEEN)]) & ~capMask;
  if (bishop_att(k, occ) & bq) return 0;
  if (rook_att(k, occ) & rq) return 0;
  if (KNIGHT_ATK[k] & p->bb[PC(them, KNIGHT)] & ~capMask) return 0;
  if (PAWN_ATK[us][k] & p->bb[PC(them, PAWN)] & ~capMask) return 0;
  return 1;
}
static int gives_check(const Pos *p, int m) {
  /* cheap approximation used for LMR: direct checks + discovered checks */
  int from = M_FROM(m), to = M_TO(m), us = p->side, them = us ^ 1, k = p->ksq[them];
  int t = M_PROMO(m) ? M_PROMO(m) : TYPE(p->board[from]);
  u64 occ = (p->all ^ BIT(from)) | BIT(to);
  u64 a = t == PAWN ? PAWN_ATK[us][to] : t == KNIGHT ? KNIGHT_ATK[to] : t == BISHOP ? bishop_att(to, occ) : t == ROOK ? rook_att(to, occ) : t == QUEEN ? bishop_att(to, occ) | rook_att(to, occ) : 0;
  if (a & BIT(k)) return 1;
  u64 bq = p->bb[PC(us, BISHOP)] | p->bb[PC(us, QUEEN)], rq = p->bb[PC(us, ROOK)] | p->bb[PC(us, QUEEN)];
  if ((bishop_att(k, occ) & bq & ~BIT(from)) || (rook_att(k, occ) & rq & ~BIT(from))) return 1;
  if (M_SPEC(m)) return 1;   /* castling / ep: be conservative */
  return 0;
}

/* ------------------------------------------------------------------ SEE */
static const int SEEV[7] = {100, 320, 330, 500, 900, 20000, 0};
static int see_ge(const Pos *p, int m, int thr) {
  if (M_SPEC(m)) return 0 >= thr;
  int from = M_FROM(m), to = M_TO(m);
  int v = (p->board[to] == EMPTY ? 0 : SEEV[TYPE(p->board[to])]) - thr;
  if (v < 0) return 0;
  v = SEEV[TYPE(p->board[from])] - v;
  if (v <= 0) return 1;
  u64 occ = p->all ^ BIT(from) ^ BIT(to);
  u64 att = attackers_to(p, to, occ) & occ;
  u64 bq = p->bb[2] | p->bb[8] | p->bb[4] | p->bb[10], rq = p->bb[3] | p->bb[9] | p->bb[4] | p->bb[10];
  int stm = p->side ^ 1, res = 1;
  for (;;) {
    u64 my = att & p->occ[stm];
    if (!my) break;
    res ^= 1;
    int t; u64 bb = 0;
    for (t = PAWN; t <= KING; t++) if ((bb = my & p->bb[PC(stm, t)])) break;
    if (t == KING) { if (att & p->occ[stm ^ 1]) res ^= 1; break; }
    v = SEEV[t] - v;
    if (v < res) break;
    occ ^= bb & -bb;
    if (t == PAWN || t == BISHOP || t == QUEEN) att |= bishop_att(to, occ) & bq;
    if (t == ROOK || t == QUEEN) att |= rook_att(to, occ) & rq;
    att &= occ;
    stm ^= 1;
  }
  return res;
}

/* ------------------------------------------------------------------ transposition table */
typedef struct { u64 key; i16 score, eval; u8 depth, flag; u32 move; } TTE;
#ifndef TT_BITS
#define TT_BITS 20
#endif
#define TT_SIZE (1u << TT_BITS)
enum { TT_NONE, TT_UPPER, TT_LOWER, TT_EXACT };
#ifdef MT
/* (2026-11-09, addendum "wasm の Lazy SMP の置換表", the audit after checkers / morris / tafl) the threads' shared table. The
   plain one (one 24-byte entry per key, written field by field, always replaced) is not used: two threads writing one slot at
   once could leave one position's key with another's score / depth / bound, and the threads' many shallow entries pushed out
   the deep ones. Here: buckets of four entries { key ^ w, w } (w = score, static eval, move, depth, bound, age, in use), so a
   torn entry fails the key check ("lockless"); store = the same key's entry, else the shallowest / oldest of the bucket (depth
   − 16 if from an earlier search). 2^TTM_BITS buckets x 64 bytes (64 MB: 4M entries, the plain one 1M). A probe copies the
   entry (TTE: the same fields as the plain table) so the search below reads it as before. */
#ifndef TTM_BITS
#define TTM_BITS 20
#endif
static u8 ttAge;   /* the main thread advances it for every search */
/* (2026-11-15) the bucket table is Praline's (shared/praline/praline_tt.h): w >> 63 = in use; replace the shallowest / oldest */
#define PL_TT_BITS TTM_BITS
#define PL_TT_USED(e) ((e)[1] >> 63)
#define PL_TT_SCORE(e) (!((e)[1] >> 63) ? -1000 : (int)(((e)[1] >> 49) & 255) - ((((e)[1] >> 59) & 15) != (u64)(ttAge & 15) ? 16 : 0))
#include "../shared/praline/praline_tt.h"
static inline void tt_get(u64 key, TTE *e) {
  const u64 *x = plttFind(key, key);
  if (x) { const u64 w = x[1]; e->key = key; e->score = (i16)(w & 0xFFFF); e->eval = (i16)(w >> 16); e->move = (u32)(w >> 32) & 0x1FFFF; e->depth = (u8)(w >> 49); e->flag = (u8)((w >> 57) & 3); return; }
  e->key = ~key; e->score = 0; e->eval = -INF; e->move = 0; e->depth = 0; e->flag = TT_NONE;
}
static void tt_put(u64 key, int depth, int score, int eval, int flag, int move) {
  int hit; u64 *x = plttSlot(key, key, &hit);
  u64 w = (u64)(unsigned short)score | (u64)(unsigned short)eval << 16 | (u64)((u32)move & 0x1FFFF) << 32 | (u64)(depth & 255) << 49 | (u64)(flag & 3) << 57 | (u64)(ttAge & 15) << 59 | 1ull << 63;
  plttWrite(x, key, w, 0);
}
EXPORT(tt_clear) void tt_clear(void) { memset(PL_TT, 0, sizeof PL_TT); ttAge = 0; }
#define TT_PROBE(k) TTE e_, *e = &e_; tt_get((k), e)
#else
static TTE tt[TT_SIZE];
EXPORT(tt_clear) void tt_clear(void) { memset(tt, 0, sizeof tt); }
#define TT_PROBE(k) TTE *e = &tt[(k) & (TT_SIZE - 1)]
#endif
static inline int score_to_tt(int s, int ply) { return s >= MATE_IN_MAX ? s + ply : s <= -MATE_IN_MAX ? s - ply : s; }
static inline int score_from_tt(int s, int ply) { return s >= MATE_IN_MAX ? s - ply : s <= -MATE_IN_MAX ? s + ply : s; }

/* ------------------------------------------------------------------ search state */
#ifdef MT
/* (2026-11-10) the history and the counter moves: one table of the lead and its YBW helpers (they search the subtrees of the
   lead's split points with its move order; benign races: a lost update of a heuristic), or a thread's own (mt_lazy: a Lazy SMP
   helper, whose own order makes it search another tree) */
static int historyS[2][64][64], counterMoveS[12][64];
static TLS int historyT[2][64][64], counterMoveT[12][64];
static TLS int (*histP)[2][64][64] = 0, (*cmP)[12][64] = 0;
#define history (*histP)
#define counterMove (*cmP)
static TLS int noSplit;   /* a Lazy SMP helper (mt_lazy): its searches are its own, no split points */
static TLS int killers[MAXPLY + 8][2];
#else
static int history[2][64][64];
static TLS int killers[MAXPLY + 8][2];
static int counterMove[12][64];
#endif
static int lmrTable[64][64];
static TLS double nodes, nodeLimit;
static TLS double tStart, tSoft, tHard;
static TLS int stopFlag, selDepth;
static TLS int pvTable[MAXPLY + 8][MAXPLY + 8], pvLen[MAXPLY + 8];
static TLS int moveStack[MAXPLY + 8], pieceStack[MAXPLY + 8];
static TLS int staticEvalStack[MAXPLY + 8];
static TLS int excludedRoot[256], nExcluded;

#ifdef MT
/* (2026-11-11) gStop, threadId and the split points of Young Brothers Wait are Praline's, the site's common thinking engine
   (claude/praline-spec.md, shared/praline/): included below; the game's part of it ("glue") after the search. */
/* every thread's last finished iteration on the current root: { key ^ x, x }, x = depth | score | move | in use — the main
   thread answers with the deepest one, and a helper that finishes the main thread's depth limit ends the search (gHit) */
#define MT_SLOTS 64
static u64 gRes[MT_SLOTS][2];
static volatile u64 gGoalKey, gHit; static volatile int gGoal;
static TLS u64 rootK;
/* (2026-11-10, MODEL_CARD.md「マルチスレッド v2」) Young Brothers Wait: split points (Praline's SPt) where idle threads take
   the remaining moves of a node whose first move is done. stopFlag 2 / 3: praline.h. A split point carries the node's position,
   the keys back to the last irreversible move, the stacks the children read, per move its order score and its number among
   the legal moves, the line of its best move (PL_ON_RAISE) and the thread whose move cut off. No busy marks, no root values. */
#define SPLIT_D 6          /* the split depth (mt_split; 7 until 2026-11-12) */
typedef int Move;   /* (a move is an int here) */
#define SP_MV 256
#define SP_HK 128
#define PL_NO_VALS 1
#define PL_MT_SPLIT 1      /* (mt_split below: also the moves searched before a split at an expected cut node) */
#define PL_SP_FIELDS \
  int cutNode, pvNode, chk, improving, ev, histLen, k0, nk, pm, ppc, se0, se1, km0, km1; volatile int pvl; \
  const void *cutter;   /* the thread whose move cut off */ \
  Pos pos; u64 hk[SP_HK]; \
  int sc[SP_MV], lg[SP_MV], pvm[MAXPLY + 8];
#ifndef MT_PAUSE
#define MT_PAUSE() ((void)js_now())   /* (an idle thread's spin: a call out of the wasm) */
#endif
#ifndef SIM_IDLE
#define SIM_IDLE() MT_PAUSE()
#endif
#include "../shared/praline/praline.h"
/* the moves searched before a split at an expected cut node (256: none there, as until 2026-11-12) */
static int SP_CUTN = 1, SP_ALLN = 1;   /* (2026-11-12: 1 = split there too after the first move, 256 until then; SP_ALLN: the same at an expected all node) */
#endif
#ifdef MT
/* (2026-11-12, MODEL_CARD.md「マルチスレッド v3」) the stops of the threads (the search is over, a split point above was cut off)
   every CHK_MASK + 1 nodes, the clock and a straggler's second search every 2048 as before (one thread: no stop of this kind,
   the same search) */
#ifndef CHK_MASK
#define CHK_MASK 255
#endif
static void check_time_(int full) {
  if (gStop || (rootK && gHit == rootK)) { stopFlag = 1; return; }
  if (curSP && chainStopped(curSP, curIdx)) { stopFlag = 2; return; }
  if (!full) return;
  if (dupMode && gOpenN > 0 && dupLeave()) { stopFlag = 3; return; }
  if (nodeLimit > 0 && nodes >= nodeLimit) { stopFlag = 1; return; }
  if (tHard > 0 && js_now() - tStart >= tHard) stopFlag = 1;
}
#define check_time() check_time_(((long long)nodes & 2047) == 0)
#define check_time_all() check_time_(1)
/* (2026-11-12) busy marks (praline.h's busyOther / busySet / busyClear on the child's key): a move after the first whose position
   another thread is on is put off to the end of the node (it keeps its number among the legal moves for the pruning and
   LMR). From remaining depth busyD (0: none; mt_busy). One thread never meets another's mark: the same search. */
#ifndef CHESS_BUSY_D
#define CHESS_BUSY_D 2
#endif
static int busyD = CHESS_BUSY_D;
#else
#define CHK_MASK 2047
#define lgv legal
static void check_time(void) {
  if (nodeLimit > 0 && nodes >= nodeLimit) { stopFlag = 1; return; }
  if (tHard > 0 && js_now() - tStart >= tHard) stopFlag = 1;
}
#endif
static int is_repetition(const Pos *p) {
  int n = histLen + sp, lim = p->half; if (lim > n) lim = n;
  for (int i = 2; i <= lim; i += 2) if (keyHist[n - i] == p->key) return 1;
  return 0;
}
static int non_pawn(const Pos *p, int c) { return (p->bb[PC(c, KNIGHT)] | p->bb[PC(c, BISHOP)] | p->bb[PC(c, ROOK)] | p->bb[PC(c, QUEEN)]) != 0; }
static int insufficient(const Pos *p) {
  if (p->bb[0] | p->bb[6] | p->bb[3] | p->bb[9] | p->bb[4] | p->bb[10]) return 0;
  int minors = popcount(p->bb[1] | p->bb[7] | p->bb[2] | p->bb[8]);
  return minors <= 1;
}

static const int MVV[7] = {100, 300, 320, 500, 900, 0, 0};
static void score_moves(const Pos *p, const int *ml, int *sc, int n, int ttm, int ply) {
  int prev = ply > 0 ? moveStack[ply - 1] : 0, cm = prev ? counterMove[pieceStack[ply - 1]][M_TO(prev)] : 0;
  for (int i = 0; i < n; i++) {
    int m = ml[i];
    if (m == ttm) { sc[i] = 1 << 30; continue; }
    int cap = M_SPEC(m) == 1 ? PAWN : p->board[M_TO(m)] == EMPTY ? -1 : TYPE(p->board[M_TO(m)]);
    if (cap >= 0 || M_PROMO(m) == 4) {
      int v = (cap >= 0 ? MVV[cap] * 16 : 0) - TYPE(p->board[M_FROM(m)]) + (M_PROMO(m) == 4 ? 8000 : 0);
      sc[i] = see_ge(p, m, -50) ? (1 << 28) + v : -(1 << 20) + v;
    } else if (m == killers[ply][0]) sc[i] = (1 << 27);
    else if (m == killers[ply][1]) sc[i] = (1 << 27) - 1;
    else if (m == cm) sc[i] = (1 << 26);
    else sc[i] = history[p->side][M_FROM(m)][M_TO(m)] + (M_PROMO(m) ? -(1 << 21) : 0);
  }
}
/* the selection sort's pick: the first of the highest scores in sc[i..n) (2026-11-11: with wasm SIMD the maximum 4 at a
   time, then its first lane — the same index as the plain loop, so the same moves in the same order; as xiangqi #1665) */
static inline int firstMax(const int *sc, int i, int n) {
#ifdef __wasm_simd128__
  if (n - i >= 8) {
    int j = i + 4; v128_t m = wasm_v128_load(sc + i);
    for (; j + 4 <= n; j += 4) m = wasm_i32x4_max(m, wasm_v128_load(sc + j));
    m = wasm_i32x4_max(m, wasm_i32x4_shuffle(m, m, 2, 3, 0, 1)); m = wasm_i32x4_max(m, wasm_i32x4_shuffle(m, m, 1, 0, 3, 2));
    int mx = wasm_i32x4_extract_lane(m, 0); for (; j < n; j++) if (sc[j] > mx) mx = sc[j];
    const v128_t vm = wasm_i32x4_splat(mx);
    for (j = i; j + 4 <= n; j += 4) { int b = wasm_i32x4_bitmask(wasm_i32x4_eq(wasm_v128_load(sc + j), vm)); if (b) return j + __builtin_ctz(b); }
    while (sc[j] != mx) j++;
    return j;
  }
#endif
  int b = i; for (int j = i + 1; j < n; j++) if (sc[j] > sc[b]) b = j;
  return b;
}
static inline int pick(int *ml, int *sc, int n, int i) {
  int b = firstMax(sc, i, n);
  int t = ml[i]; ml[i] = ml[b]; ml[b] = t; t = sc[i]; sc[i] = sc[b]; sc[b] = t;
  return ml[i];
}

static int qsearch(Pos *p, int alpha, int beta, int ply) {
  if ((++nodes, ((long long)nodes & CHK_MASK) == 0)) check_time();
  if (stopFlag) return 0;
  if (ply > selDepth) selDepth = ply;
  if (ply >= MAXPLY) return evaluate(p);
  if (p->half >= 100 || insufficient(p)) return 0;
  int chk = in_check(p);
  TT_PROBE(p->key);
  int ttm = 0;
  if (e->key == p->key) {
    ttm = e->move; int s = score_from_tt(e->score, ply);
    if ((e->flag == TT_EXACT) || (e->flag == TT_LOWER && s >= beta) || (e->flag == TT_UPPER && s <= alpha)) return s;
  }
  int best = -INF, stand = -INF;
  if (!chk) {
    stand = (e->key == p->key && e->eval != -INF) ? e->eval : evaluate(p);
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    best = stand;
  }
  int ml[256], sc[256], n = gen_moves(p, ml, !chk), legal = 0, bestMove = 0, a0 = alpha;
  score_moves(p, ml, sc, n, ttm, ply);
  for (int i = 0; i < n; i++) {
    int m = pick(ml, sc, n, i);
    if (!is_legal(p, m)) continue;
    legal++;
    if (!chk) {
      if (sc[i] < (1 << 28) && m != ttm) continue;            /* losing capture */
      int cap = M_SPEC(m) == 1 ? PAWN : TYPE(p->board[M_TO(m)]);
      if (!M_PROMO(m) && stand + SEEV[cap] + 200 <= alpha) continue;   /* delta */
    }
    moveStack[ply] = m; pieceStack[ply] = p->board[M_FROM(m)];
    make_move(p, m);
    int s = -qsearch(p, -beta, -alpha, ply + 1);
    unmake_move(p, m);
    if (stopFlag) return 0;
    if (s > best) { best = s; if (s > alpha) { alpha = s; bestMove = m; if (s >= beta) break; } }
  }
  if (chk && !legal) return -MATE + ply;
  if (e->key != p->key || e->depth == 0) {
#ifdef MT
    tt_put(p->key, 0, score_to_tt(best, ply), chk ? -INF : stand, best >= beta ? TT_LOWER : best > a0 ? TT_EXACT : TT_UPPER, bestMove ? bestMove : ttm);
#else
    e->key = p->key; e->depth = 0; e->score = (i16)score_to_tt(best, ply); e->eval = (i16)(chk ? -INF : stand);
    e->flag = best >= beta ? TT_LOWER : best > a0 ? TT_EXACT : TT_UPPER; e->move = bestMove ? bestMove : ttm;
#endif
  }
  return best;
}

#ifdef MT
static int splitHere(Pos *p, int alpha, int beta, int depth, int ply, int cutNode, int pvNode, int chk, int improving, int ev, int *ml, int *sc, int i0, int n, int nR, int legal, int *best, int *bestMove);
#endif
static int search(Pos *p, int alpha, int beta, int depth, int ply, int cutNode, int excluded) {
  int pvNode = beta - alpha > 1;
  pvLen[ply] = ply;
  if (depth <= 0) return qsearch(p, alpha, beta, ply);
  if ((++nodes, ((long long)nodes & CHK_MASK) == 0)) check_time();
  if (stopFlag) return 0;
  if (ply > selDepth) selDepth = ply;
  if (ply > 0) {
    if (p->half >= 100 || insufficient(p) || is_repetition(p)) return 0;
    if (ply >= MAXPLY) return evaluate(p);
    int ma = -MATE + ply, mb = MATE - ply - 1;
    if (ma > alpha) alpha = ma; if (mb < beta) beta = mb; if (alpha >= beta) return alpha;
  }
  int chk = in_check(p);
  TT_PROBE(p->key);
  int ttHit = !excluded && e->key == p->key, ttm = ttHit ? (int)e->move : 0, ttScore = ttHit ? score_from_tt(e->score, ply) : 0;
  if (ttHit && !pvNode && e->depth >= depth && ply > 0) {
    if ((e->flag == TT_EXACT) || (e->flag == TT_LOWER && ttScore >= beta) || (e->flag == TT_UPPER && ttScore <= alpha)) {
      if (ttm && ttScore >= beta && p->board[M_TO(ttm)] == EMPTY && !M_PROMO(ttm)) { /* refresh quiet bonus */ int *h = &history[p->side][M_FROM(ttm)][M_TO(ttm)]; *h += 32 * depth * depth - *h * 32 * depth * depth / 16384; }
      return ttScore;
    }
  }
  int ev;
  if (chk) ev = staticEvalStack[ply] = -INF;
  else if (excluded) ev = staticEvalStack[ply];
  else {
    ev = (ttHit && e->eval != -INF) ? e->eval : evaluate(p);
    staticEvalStack[ply] = ev;
    if (ttHit && ((e->flag == TT_LOWER && ttScore > ev) || (e->flag == TT_UPPER && ttScore < ev) || e->flag == TT_EXACT)) ev = ttScore;
  }
  int improving = !chk && ply >= 2 && staticEvalStack[ply] > staticEvalStack[ply - 2];
  if (!chk && ply >= 2 && staticEvalStack[ply - 2] == -INF) improving = 1;
  killers[ply + 1][0] = killers[ply + 1][1] = 0;

  if (!pvNode && !chk && !excluded) {
    /* reverse futility */
    if (depth <= 8 && ev - 75 * (depth - improving) >= beta && ev < MATE_IN_MAX) return ev;
    /* null move */
    if (depth >= 3 && ev >= beta && staticEvalStack[ply] >= beta - 20 * depth + 160 && non_pawn(p, p->side) && (ply == 0 || moveStack[ply - 1] != 0)) {
      int R = 3 + depth / 3 + ((ev - beta) / 200 < 3 ? (ev - beta) / 200 : 3);
      moveStack[ply] = 0; pieceStack[ply] = 0;
      make_null(p);
      int s = -search(p, -beta, -beta + 1, depth - R, ply + 1, !cutNode, 0);
      unmake_null(p);
      if (stopFlag) return 0;
      if (s >= beta) return s >= MATE_IN_MAX ? beta : s;
    }
    /* razoring */
    if (depth <= 3 && ev + 250 * depth < alpha) {
      int s = qsearch(p, alpha, beta, ply);
      if (s < alpha) return s;
    }
  }
  /* internal iterative reduction */
  if (depth >= 4 && !ttm && (pvNode || cutNode)) depth--;

  int ml[256], sc[256], n = gen_moves(p, ml, 0);
  score_moves(p, ml, sc, n, ttm, ply);
  int best = -INF, bestMove = 0, legal = 0, a0 = alpha;
  int quiets[64], nq = 0, caps[32], nc = 0;
#ifdef MT
  int nReal = n, defL[BUSY_DEF], nDef = 0;   /* (busy marks: the moves put off are appended after nReal) */
#endif
  for (int i = 0; i < n; i++) {
#ifdef MT
    /* (YBW) the first move is done and a thread is idle (or an owner above waits): the remaining moves to a split point
       (the picks there are the loop's own: it goes on with the same moves when nothing is split) */
    if (legal >= (cutNode ? SP_CUTN : pvNode ? 1 : SP_ALLN) && depth >= splitD && !excluded && n - i >= 2 && !noSplit && (gIdle > 0 || (gWaitN > 0 && spWanted())) &&
        splitHere(p, alpha, beta, depth, ply, cutNode, pvNode, chk, improving, ev, ml, sc, i, n, nReal, legal, &best, &bestMove)) {
      if (stopFlag) return 0;
      break;
    }
    int m = i < nReal ? pick(ml, sc, nReal, i) : ml[i];
#else
    int m = pick(ml, sc, n, i);
#endif
    if (m == excluded) continue;
    if (ply == 0 && nExcluded) { int skip = 0; for (int k = 0; k < nExcluded; k++) if (excludedRoot[k] == m) skip = 1; if (skip) continue; }
    if (!is_legal(p, m)) continue;
#ifdef MT
    const int lgv = i < nReal ? ++legal : defL[i - nReal];   /* (a move put off: its number when it was put off) */
#else
    legal++;
#endif
    int isCap = M_SPEC(m) == 1 || p->board[M_TO(m)] != EMPTY, isQuiet = !isCap && M_PROMO(m) != 4;
    int gc = gives_check(p, m);
    if (ply > 0 && best > -MATE_IN_MAX && non_pawn(p, p->side)) {
      if (isQuiet && !gc) {
        if (!pvNode && !chk && depth <= 8 && lgv > (3 + depth * depth) / (2 - improving)) continue;   /* late move pruning */
        int lmrD = depth - 1 - lmrTable[depth < 63 ? depth : 63][lgv < 63 ? lgv : 63];
        if (!chk && lmrD <= 8 && ev + 90 + 90 * lmrD <= alpha) continue;                        /* futility */
        if (lmrD <= 8 && !see_ge(p, m, -25 * lmrD * lmrD)) continue;
      } else if (depth <= 6 && !see_ge(p, m, -90 * depth)) continue;
    }
    /* singular extension */
    int ext = 0;
    if (ply > 0 && m == ttm && !excluded && depth >= 7 && e->depth >= depth - 3 && (e->flag == TT_LOWER || e->flag == TT_EXACT) && ttScore > -MATE_IN_MAX && ttScore < MATE_IN_MAX) {
      int sb = ttScore - 2 * depth;
      int s = search(p, sb - 1, sb, (depth - 1) / 2, ply, cutNode, m);
      if (stopFlag) return 0;
      if (s < sb) ext = 1;
      else if (sb >= beta) return sb;
      else if (ttScore >= beta) ext = -1;
      /* the probe overwrote the move list at this ply? no: it uses its own locals */
    } else if (chk) ext = 1;
    moveStack[ply] = m; pieceStack[ply] = p->board[M_FROM(m)];
    make_move(p, m);
#ifdef MT
    const u64 bk = p->key;
    if (busyD > 0 && i < nReal && lgv > 1 && depth >= busyD && n < 256 && nDef < BUSY_DEF && busyOther(bk)) {   /* put off */
      unmake_move(p, m); ml[n] = m; sc[n] = sc[i]; defL[nDef++] = lgv; n++; continue;
    }
    const int mk = busyD > 0 && depth >= busyD ? busySet(bk) : -1;
#endif
    int nd = depth - 1 + ext, s;
    if (lgv == 1) s = -search(p, -beta, -alpha, nd, ply + 1, pvNode ? 0 : !cutNode, 0);
    else {
      int r = 0;
      if (depth >= 3 && lgv > 1 + (pvNode ? 1 : 0) && (isQuiet || sc[i] < 0)) {
        r = lmrTable[depth < 63 ? depth : 63][lgv < 63 ? lgv : 63];
        r -= pvNode; r += !improving; r += cutNode;
        if (gc) r--;
        if (isQuiet) r -= history[p->side ^ 1][M_FROM(m)][M_TO(m)] / 8000;
        if (m == killers[ply][0] || m == killers[ply][1]) r--;
        if (r < 0) r = 0; if (r > nd - 1) r = nd - 1;
      }
      s = -search(p, -alpha - 1, -alpha, nd - r, ply + 1, 1, 0);
      if (s > alpha && r > 0) s = -search(p, -alpha - 1, -alpha, nd, ply + 1, !cutNode, 0);
      if (s > alpha && s < beta) s = -search(p, -beta, -alpha, nd, ply + 1, 0, 0);
    }
    unmake_move(p, m);
#ifdef MT
    if (mk >= 0) busyClear(bk, mk);
#endif
    if (stopFlag) return 0;
    if (s > best) {
      best = s;
      if (s > alpha) {
        alpha = s; bestMove = m;
        if (pvNode) { pvTable[ply][ply] = m; for (int j = ply + 1; j < pvLen[ply + 1]; j++) pvTable[ply][j] = pvTable[ply + 1][j]; pvLen[ply] = pvLen[ply + 1] > ply + 1 ? pvLen[ply + 1] : ply + 1; }
        if (s >= beta) {
          if (isQuiet) {
            int bonus = depth * depth * 16; if (bonus > 1600) bonus = 1600;
            int *h = &history[p->side][M_FROM(m)][M_TO(m)]; *h += bonus - *h * bonus / 16384;
            for (int k = 0; k < nq; k++) { int q = quiets[k]; int *hh = &history[p->side][M_FROM(q)][M_TO(q)]; *hh += -bonus - *hh * bonus / 16384; }
            if (killers[ply][0] != m) { killers[ply][1] = killers[ply][0]; killers[ply][0] = m; }
            if (ply > 0 && moveStack[ply - 1]) counterMove[pieceStack[ply - 1]][M_TO(moveStack[ply - 1])] = m;
          }
          break;
        }
      }
    }
    if (isQuiet && nq < 64) quiets[nq++] = m; else if (!isQuiet && nc < 32) caps[nc++] = m;
  }
  (void)caps;
  if (!legal) return excluded ? alpha : chk ? -MATE + ply : 0;
  if (!excluded && !(ply == 0 && nExcluded)) {
#ifdef MT
    tt_put(p->key, depth > 0 ? depth : 0, score_to_tt(best, ply), chk ? -INF : staticEvalStack[ply], best >= beta ? TT_LOWER : (pvNode && best > a0) ? TT_EXACT : TT_UPPER, bestMove ? bestMove : ttm);
#else
    e->key = p->key; e->depth = (u8)(depth > 0 ? depth : 0); e->score = (i16)score_to_tt(best, ply);
    e->eval = (i16)(chk ? -INF : staticEvalStack[ply]);
    e->flag = best >= beta ? TT_LOWER : (pvNode && best > a0) ? TT_EXACT : TT_UPPER;
    e->move = bestMove ? bestMove : ttm;
#endif
  }
  return best;
}

/* ------------------------------------------------------------------ position setup */
static void clear_pos(Pos *p) { memset(p, 0, sizeof *p); for (int s = 0; s < 64; s++) p->board[s] = EMPTY; p->ep = -1; }
static int set_fen(Pos *p, const char *f) {
  clear_pos(p);
  int r = 7, c = 0;
  for (; *f && *f != ' '; f++) {
    if (*f == '/') { r--; c = 0; continue; }
    if (*f >= '1' && *f <= '8') { c += *f - '0'; continue; }
    const char *pcs = "PNBRQKpnbrqk"; int pc = -1; for (int i = 0; i < 12; i++) if (pcs[i] == *f) pc = i;
    if (pc < 0 || r < 0 || c > 7) return 0;
    put(p, pc, r * 8 + c); if (TYPE(pc) == KING) p->ksq[COLOR(pc)] = r * 8 + c; c++;
  }
  if (*f) f++;
  p->side = *f == 'b' ? BLACK : WHITE; if (*f) f++; if (*f) f++;
  for (; *f && *f != ' '; f++) { if (*f == 'K') p->castle |= 1; if (*f == 'Q') p->castle |= 2; if (*f == 'k') p->castle |= 4; if (*f == 'q') p->castle |= 8; }
  if (*f) f++;
  if (*f && *f != '-') { int e = (f[1] - '1') * 8 + (f[0] - 'a'); if (PAWN_ATK[p->side ^ 1][e] & p->bb[PC(p->side, PAWN)]) p->ep = e; f += 2; } else if (*f) f++;
  while (*f == ' ') f++;
  int h = 0; while (*f >= '0' && *f <= '9') h = h * 10 + (*f++ - '0'); p->half = h;
  /* castling rights need the pieces on their squares */
  if (!(p->board[4] == PC(WHITE, KING))) p->castle &= ~3; if (p->board[7] != PC(WHITE, ROOK)) p->castle &= ~1; if (p->board[0] != PC(WHITE, ROOK)) p->castle &= ~2;
  if (!(p->board[60] == PC(BLACK, KING))) p->castle &= ~12; if (p->board[63] != PC(BLACK, ROOK)) p->castle &= ~4; if (p->board[56] != PC(BLACK, ROOK)) p->castle &= ~8;
  p->key ^= ZCAST[p->castle]; if (p->ep >= 0) p->key ^= ZEP[p->ep & 7]; if (p->side) p->key ^= ZSIDE;
  return 1;
}
static int parse_uci(const Pos *p, const char *s) {
  if (!s[0] || !s[1] || !s[2] || !s[3]) return 0;
  int from = (s[1] - '1') * 8 + (s[0] - 'a'), to = (s[3] - '1') * 8 + (s[2] - 'a'), pr = 0;
  if (s[4] == 'n') pr = 1; else if (s[4] == 'b') pr = 2; else if (s[4] == 'r') pr = 3; else if (s[4] == 'q') pr = 4;
  int ml[256], n = gen_moves(p, ml, 0);
  for (int i = 0; i < n; i++) if (M_FROM(ml[i]) == from && M_TO(ml[i]) == to && M_PROMO(ml[i]) == pr && is_legal(p, ml[i])) return ml[i];
  return 0;
}
static void move_to_uci(int m, char *o) {
  o[0] = 'a' + (M_FROM(m) & 7); o[1] = '1' + (M_FROM(m) >> 3); o[2] = 'a' + (M_TO(m) & 7); o[3] = '1' + (M_TO(m) >> 3);
  int pr = M_PROMO(m); if (pr) { o[4] = " nbrq"[pr]; o[5] = 0; } else o[4] = 0;
}
/* setup buffer: "FEN" or "FEN moves m1 m2 ..." (NUL terminated) */
static TLS char setupBuf[65536];
EXPORT(setup_ptr) char *setup_ptr(void) { return setupBuf; }
EXPORT(set_position) int set_position(void) {
  char *s = setupBuf; char *mv = 0;
  for (char *q = s; *q; q++) if (q[0] == ' ' && q[1] == 'm' && q[2] == 'o' && q[3] == 'v' && q[4] == 'e' && q[5] == 's') { *q = 0; mv = q + 6; break; }
  histLen = 0; sp = 0;
  if (!set_fen(&P, s)) return 0;
  int ok = 1;
  while (mv && *mv) {
    while (*mv == ' ') mv++; if (!*mv) break;
    char tok[8]; int k = 0; while (*mv && *mv != ' ' && k < 7) tok[k++] = *mv++; tok[k] = 0;
    int m = parse_uci(&P, tok); if (!m) { ok = 0; break; }
    if (histLen < HIST_MAX) keyHist[histLen++] = P.key;
    make_move(&P, m); sp = 0;
  }
  accDirty[0] = ACC_ALL;
  return ok;
}

/* ------------------------------------------------------------------ root search */
static TLS i32 resBuf[8 + MAXPLY];   /* bestmove, score, depth, nodes(lo), pvlen, seldepth, pv... */
EXPORT(res_ptr) i32 *res_ptr(void) { return resBuf; }
static TLS double resNodes;
EXPORT(res_nodes) double res_nodes(void) { return resNodes; }

static double ln_(double x) { /* natural log for x >= 1 without libm */ int k = 0; while (x > 2) { x /= 2; k++; } double y = (x - 1) / (x + 1), y2 = y * y, s = 0, t = y; for (int i = 1; i < 40; i += 2) { s += t / i; t *= y2; } return 2 * s + k * 0.69314718055994530942; }
static void init_search_tables(void) {
  for (int d = 0; d < 64; d++) for (int m = 0; m < 64; m++) lmrTable[d][m] = (d && m) ? (int)(0.75 + ln_(d) * ln_(m) / 2.25) : 0;
}
EXPORT(new_game) void new_game(void) { tt_clear(); memset(history, 0, sizeof history); memset(counterMove, 0, sizeof counterMove);
#ifdef MT
  memset(busyT, 0, sizeof busyT);
#endif
}

/* softMs: stop starting new iterations after this; hardMs: abort. maxDepth, nodeLim (0 = none) */
EXPORT(think) int think(double softMs, double hardMs, int maxDepth, double nodeLim) {
  tStart = js_now(); tSoft = softMs; tHard = hardMs; nodeLimit = nodeLim; nodes = 0; stopFlag = 0;
  if (maxDepth <= 0 || maxDepth > MAXPLY - 4) maxDepth = MAXPLY - 4;
  memset(killers, 0, sizeof killers);
  for (int i = 0; i < 64; i++) for (int j = 0; j < 64; j++) { history[0][i][j] /= 2; history[1][i][j] /= 2; }
  accDirty[0] = ACC_ALL; sp = 0;
  int bestMove = 0, bestScore = 0, lastDepth = 0, pv[MAXPLY], pvl = 0;
  /* fallback move: first legal */
  { int ml[256], n = gen_moves(&P, ml, 0); for (int i = 0; i < n; i++) { if (is_legal(&P, ml[i])) { int skip = 0; for (int k = 0; k < nExcluded; k++) if (excludedRoot[k] == ml[i]) skip = 1; if (!skip) { bestMove = ml[i]; break; } } } }
  int prevScore = 0;
  int dStep = 1, d0 = 1;
#ifdef MT
  /* (2026-11-09) every thread iterates 1, 2, 3, … like the main one: the helpers' start a ply ahead (every other one) was slower
     to the main thread's depth in the measurement (MODEL_CARD.md). The root key: the position, its history length and the
     moves left out at the root (a helper reads the whole root, so its result is not the main thread's when moves are excluded). */
  u64 rk = P.key ^ (u64)histLen << 40 ^ (u64)nExcluded << 52;
  for (int k = 0; k < nExcluded; k++) rk ^= (u64)(u32)excludedRoot[k] * 0x9E3779B97F4A7C15ull;
  rk |= 1;
  rootK = 0;
  if (!threadId) {   /* a new search: age the table, forget the threads' results of the last one, set the depth goal */
    ttAge++;
    for (int i = 0; i < MT_SLOTS; i++) { __atomic_store_n(&gRes[i][0], 0, __ATOMIC_SEQ_CST); __atomic_store_n(&gRes[i][1], 0, __ATOMIC_SEQ_CST); }
    gHit = 0; gGoal = maxDepth; gGoalKey = rk; rootK = rk;
  }
#endif
  for (int d = d0; d <= maxDepth; d += dStep) {
    selDepth = 0;
    int delta = 20, alpha = -INF, beta = INF, s;
    if (d >= 4) { alpha = prevScore - delta; beta = prevScore + delta; }
    for (;;) {
      s = search(&P, alpha, beta, d, 0, 0, 0);
      if (stopFlag) break;
      if (s <= alpha) { beta = (alpha + beta) / 2; alpha = s - delta; if (alpha < -INF) alpha = -INF; }
      else if (s >= beta) { beta = s + delta; if (beta > INF) beta = INF; }
      else break;
      delta += delta / 2;
      if (delta > 1000) { alpha = -INF; beta = INF; }
    }
    if (stopFlag && d > 1) {
      /* keep a partial result only if the iteration found a move with the PV already updated */
      if (pvLen[0] > 0 && pvTable[0][0] && pvTable[0][0] != bestMove && s > bestScore && s > -INF + 1) { /* conservative: ignore */ }
      break;
    }
    if (pvLen[0] > 0 && pvTable[0][0]) { bestMove = pvTable[0][0]; pvl = pvLen[0]; for (int j = 0; j < pvl; j++) pv[j] = pvTable[0][j]; }
    bestScore = s; prevScore = s; lastDepth = d;
#ifdef MT
    if (threadId < MT_SLOTS) {   /* publish the finished iteration */
      u64 x = (u64)(d & 255) | (u64)(unsigned short)(i16)s << 8 | (u64)((u32)bestMove & 0x1FFFF) << 24 | 1ull << 41;
      __atomic_store_n(&gRes[threadId][1], x, __ATOMIC_SEQ_CST); __atomic_store_n(&gRes[threadId][0], rk ^ x, __ATOMIC_SEQ_CST);
      if (threadId && d >= gGoal && gGoalKey == rk) gHit = rk;
    }
#endif
    js_progress(d, s, nodes, pv, pvl);
    if (bestScore >= MATE_IN_MAX && d >= (MATE - bestScore) + 2) break;
    if (tSoft > 0 && js_now() - tStart >= tSoft) break;
#ifdef MT
    if (gStop) break;
#endif
    if (nodeLimit > 0 && nodes >= nodeLimit) break;
  }
#ifdef MT
  if (!threadId) {   /* the deepest finished iteration of all the threads (the main thread's on a tie) */
    int bt = -1, bdep = lastDepth;
    for (int i = 1; i < MT_SLOTS; i++) {
      u64 x = __atomic_load_n(&gRes[i][1], __ATOMIC_SEQ_CST), kx = __atomic_load_n(&gRes[i][0], __ATOMIC_SEQ_CST);
      if (!(x >> 41) || (kx ^ x) != rk) continue;
      int dd = (int)(x & 255); if (dd > bdep) { bdep = dd; bt = i; }
    }
    if (bt > 0) {
      u64 x = __atomic_load_n(&gRes[bt][1], __ATOMIC_SEQ_CST), kx = __atomic_load_n(&gRes[bt][0], __ATOMIC_SEQ_CST);
      int m = (int)((x >> 24) & 0x1FFFF), ok = 0, ml[256], n = gen_moves(&P, ml, 0);
      for (int i = 0; i < n; i++) if (ml[i] == m && is_legal(&P, m)) ok = 1;
      for (int k = 0; k < nExcluded; k++) if (excludedRoot[k] == m) ok = 0;
      if ((kx ^ x) == rk && ok) {
        if (m != bestMove || pvl < 1) { pv[0] = m; pvl = 1; }   /* (the helper's line is not known: its first move) */
        bestMove = m; bestScore = (i16)(unsigned short)(x >> 8); lastDepth = (int)(x & 255);
      }
    }
    gGoalKey = 0; gHit = 0; rootK = 0;
  }
#endif
  resBuf[0] = bestMove; resBuf[1] = bestScore; resBuf[2] = lastDepth; resBuf[3] = (i32)nodes; resBuf[4] = pvl; resBuf[5] = selDepth;
  for (int j = 0; j < pvl && j < MAXPLY; j++) resBuf[8 + j] = pv[j];
  resNodes = nodes;
  return bestMove;
}
EXPORT(exclude_ptr) i32 *exclude_ptr(void) { return excludedRoot; }
EXPORT(set_excluded) void set_excluded(int n) { nExcluded = n; }
EXPORT(static_eval) int static_eval(void) { sp = 0; accDirty[0] = ACC_ALL; return evaluate(&P); }
EXPORT(side_to_move) int side_to_move(void) { return P.side; }
EXPORT(move_uci) char *move_uci(int m) { static TLS char b[8]; move_to_uci(m, b); return b; }

/* legal moves of the current position (for analysis loops in JS) */
static TLS i32 legalBuf[256];
EXPORT(legal_ptr) i32 *legal_ptr(void) { return legalBuf; }
EXPORT(legal_moves) int legal_moves(void) { int ml[256], n = gen_moves(&P, ml, 0), k = 0; for (int i = 0; i < n; i++) if (is_legal(&P, ml[i])) legalBuf[k++] = ml[i]; return k; }

EXPORT(init) void init(void) {
  init_attacks(); init_zobrist(); init_search_tables();
  for (int s = 0; s < 64; s++) CASTLE_MASK[s] = 15;
  CASTLE_MASK[4] = 15 & ~3; CASTLE_MASK[7] = 15 & ~1; CASTLE_MASK[0] = 15 & ~2;
  CASTLE_MASK[60] = 15 & ~12; CASTLE_MASK[63] = 15 & ~4; CASTLE_MASK[56] = 15 & ~8;
}

/* perft (testing) */
static u64 perft(Pos *p, int d) {
  int ml[256], n = gen_moves(p, ml, 0); u64 c = 0;
  for (int i = 0; i < n; i++) { if (!is_legal(p, ml[i])) continue; if (d == 1) { c++; continue; } make_move(p, ml[i]); c += perft(p, d - 1); unmake_move(p, ml[i]); }
  return c;
}
EXPORT(perft_root) double perft_root(int d) { sp = 0; return (double)perft(&P, d); }

#ifdef MT
/* ------------------------------------------------------------------ Young Brothers Wait (2026-11-10, MODEL_CARD.md「マルチスレッド v2」)
   As reversi's v4 / v4.1 (reversi/engine.c): a node of the search (remaining depth >= SPLIT_D = 6, not a singular test; v2:
   7 and not at an expected cut node, SP_CUTN) whose first move is done opens a split point when a YBW helper is idle (the
   pages since 2026-11-12: helpers 1..9; the others are Lazy SMP helpers, mt_lazy, whose searches never split): its other legal moves (in the loop's order, with their
   number among the legal moves and their order score) are taken one at a time (an atomic counter) by the owner and the idle
   threads (a YBW helper waits in mt_idle instead of searching the root on their own: mt-helper.js, pro/mt-worker.js), each
   with the loop's pruning, reductions and PVS against the split point's alpha. A cut-off stops the split point: the threads
   below it see the stop at their next check of the clock (stopFlag 2) and unwind to it. The owner waits until every helper
   has left, helping meanwhile at the split points below its own ("helpful master"); while it waits it marks its split point
   (waiting) and the threads below it split for it (spWanted); a thread with nothing to join searches a move another thread
   is still on a second time (spDup, the first result counts: a slow core does not hold up the others). A helper copies the
   split point's position, the keys back to the last irreversible move (repetitions), the stacks the children read (the move
   and static evaluations before it, the killers) and computes its accumulator afresh. Without an idle helper nothing is
   split: one thread searches exactly as before (the same nodes and moves). */
#define SP_SKIP (-INF - 1)   /* a move the loop's pruning leaves out */
/* this thread at the split point's node: the position and what the search below it reads of the plies above */
static void spLoad(const SPt *y) {
  P = y->pos; histLen = y->histLen; sp = y->ply;
  for (int k = 0; k < y->nk; k++) keyHist[y->k0 + k] = y->hk[k];
  for (int k = 0; k <= sp; k++) accDirty[k] = ACC_ALL;   /* (computed afresh, through nnCache) */
  accKc[sp][0] = (u8)nn_kcode(0, P.ksq[0]); accKc[sp][1] = (u8)nn_kcode(1, P.ksq[1]);
  if (sp > 0) { moveStack[sp - 1] = y->pm; pieceStack[sp - 1] = y->ppc; staticEvalStack[sp - 1] = y->se1; }
  staticEvalStack[sp] = y->se0; killers[sp][0] = y->km0; killers[sp][1] = y->km1; killers[sp + 1][0] = killers[sp + 1][1] = 0;
}
/* a quiet move that cut off: the loop's bonus (history, killer, counter move) in this thread's own tables */
static void spCutBonus(const Pos *p, int m, int depth, int ply) {
  if (!m || M_SPEC(m) == 1 || p->board[M_TO(m)] != EMPTY || M_PROMO(m) == 4) return;
  int bonus = depth * depth * 16; if (bonus > 1600) bonus = 1600;
  int *h = &history[p->side][M_FROM(m)][M_TO(m)]; *h += bonus - *h * bonus / 16384;
  if (killers[ply][0] != m) { killers[ply][1] = killers[ply][0]; killers[ply][0] = m; }
  if (ply > 0 && moveStack[ply - 1]) counterMove[pieceStack[ply - 1]][M_TO(moveStack[ply - 1])] = m;
}
/* the move i of s against alpha a as the loop does it (P is at s's node); SP_SKIP: pruned */
static int spSearch(SPt *s, int i, int a) {
  Pos *p = &P;
  const int m = s->mv[i], ply = s->ply, depth = s->depth, legal = s->lg[i], beta = s->beta, pvNode = s->pvNode, cutNode = s->cutNode;
  const int isCap = M_SPEC(m) == 1 || p->board[M_TO(m)] != EMPTY, isQuiet = !isCap && M_PROMO(m) != 4, gc = gives_check(p, m);
  const int best = __atomic_load_n(&s->best, __ATOMIC_ACQUIRE), ev = s->ev, chk = s->chk, improving = s->improving;
  if (ply > 0 && best > -MATE_IN_MAX && non_pawn(p, p->side)) {
    if (isQuiet && !gc) {
      if (!pvNode && !chk && depth <= 8 && legal > (3 + depth * depth) / (2 - improving)) return SP_SKIP;
      int lmrD = depth - 1 - lmrTable[depth < 63 ? depth : 63][legal < 63 ? legal : 63];
      if (!chk && lmrD <= 8 && ev + 90 + 90 * lmrD <= a) return SP_SKIP;
      if (lmrD <= 8 && !see_ge(p, m, -25 * lmrD * lmrD)) return SP_SKIP;
    } else if (depth <= 6 && !see_ge(p, m, -90 * depth)) return SP_SKIP;
  }
  moveStack[ply] = m; pieceStack[ply] = p->board[M_FROM(m)];
  make_move(p, m);
  int nd = depth - 1 + (chk ? 1 : 0), r = 0, v;
  if (depth >= 3 && legal > 1 + (pvNode ? 1 : 0) && (isQuiet || s->sc[i] < 0)) {
    r = lmrTable[depth < 63 ? depth : 63][legal < 63 ? legal : 63];
    r -= pvNode; r += !improving; r += cutNode;
    if (gc) r--;
    if (isQuiet) r -= history[p->side ^ 1][M_FROM(m)][M_TO(m)] / 8000;
    if (m == s->km0 || m == s->km1) r--;
    if (r < 0) r = 0; if (r > nd - 1) r = nd - 1;
  }
  v = -search(p, -a - 1, -a, nd - r, ply + 1, 1, 0);
  if (!stopFlag && v > a && r > 0) v = -search(p, -a - 1, -a, nd, ply + 1, !cutNode, 0);
  if (!stopFlag && v > a && v < beta) v = -search(p, -beta, -a, nd, ply + 1, 0, 0);
  unmake_move(p, m);
  return v;
}
/* ---- the game's glue for Praline (praline_ybw.h) */
static void spLoadPos(const SPt *s, int top, int fresh) { (void)top; (void)fresh; spLoad(s); }   /* (the accumulator afresh) */
static inline int spTop(void) { return 0; }
/* a cut-off by the move i of s (not the root; the root's: spRaised): the loop's bonus (SP_SKIP: a pruned move never cuts) */
static void spCutoff(const SPt *s, int i) { spCutBonus(&P, s->mv[i], s->depth, s->ply); }
/* a move raised alpha (under the lock): the line below it (a PV node), the thread that cut off (the owner gives the bonus
   when another thread's move did); at the root the cut-off's bonus here */
static void spRaised(SPt *s, int i) {
  if (s->pvNode) { const int q = s->ply + 1; int l = 1; s->pvm[0] = s->mv[i]; for (int j = q; j < pvLen[q] && l < MAXPLY; j++) s->pvm[l++] = pvTable[q][j]; s->pvl = l; }
  if (s->best >= s->beta) { s->cutter = (const void *)&curIdx; if (s->root) spCutBonus(&P, s->mv[i], s->depth, s->ply); }
}
/* the owner is done with s: the node's line, and the bonus of another thread's cut-off in its own tables */
static void spClosed(SPt *s) {
  const int ply = s->ply;
  if (s->pvNode && s->pvl > 0) { for (int q = 0; q < s->pvl; q++) pvTable[ply][ply + q] = s->pvm[q]; pvLen[ply] = ply + s->pvl; }
  if (!stopFlag && s->best >= s->beta && s->cutter != (const void *)&curIdx) spCutBonus(&P, s->bestMove, s->depth, ply);
}
static void waitCheck(void) { check_time_all(); MT_PAUSE(); }   /* (the lead's deadline) */
static void spIdleReset(int fresh) {   /* mt_idle (mt-helper.js, pro/mt-worker.js: mt_idle() — no time limit) */
  (void)fresh;
  nodes = 0; nodeLimit = 0; tHard = 0; tSoft = 0; rootK = 0; sp = 0;
  memset(killers, 0, sizeof killers);
#ifdef MT_HIST_TLS
  for (int i = 0; i < 64; i++) for (int j = 0; j < 64; j++) { history[0][i][j] /= 2; history[1][i][j] /= 2; }
#endif
}
static double spIdleNodes(void) { resNodes = nodes; resBuf[3] = (i32)nodes; return nodes; }
#define PL_ON_RAISE(s, i) spRaised(s, i)
#define PL_ON_OPEN(s) ((s)->pvl = 0, (s)->cutter = 0)
#define PL_ON_CLOSE(s) spClosed(s)
#define PL_ROOT_VAL(s, i, v) ((void)0)
#define PL_ROOT_GET(s, j) 0
#define PL_NODES() spIdleNodes()
#define now() js_now()   /* (Praline's clock) */
#include "../shared/praline/praline_ybw.h"
/* the owner: a split point for the moves ml[i0..n) (picked in the loop's order; the legal ones, numbered after `legal`);
   0 when no slot is free or fewer than two legal moves are left (the loop goes on alone with the same moves) */
static int splitHere(Pos *p, int alpha, int beta, int depth, int ply, int cutNode, int pvNode, int chk, int improving, int ev, int *ml, int *sc, int i0, int n, int nR, int legal, int *best, int *bestMove) {
  SPt *s = spAlloc(); if (!s) return 0;
  int k = 0;
  for (int i = i0; i < n; i++) {
    const int m = i < nR ? pick(ml, sc, nR, i) : ml[i];   /* (after nR: the moves put off by the busy marks) */
    if (ply == 0 && nExcluded) { int skip = 0; for (int q = 0; q < nExcluded; q++) if (excludedRoot[q] == m) skip = 1; if (skip) continue; }
    if (!is_legal(p, m)) continue;
    s->mv[k] = m; s->sc[k] = sc[i]; s->lg[k] = legal + 1 + k; k++;
  }
  if (k < 2) { spRelease(s); return 0; }
  s->n = k; s->pos = *p; s->depth = depth; s->ply = ply; s->beta = beta; s->cutNode = cutNode; s->pvNode = pvNode; s->chk = chk;
  s->improving = improving; s->ev = ev; s->histLen = histLen;
  { const int nh = histLen + ply; int lim = p->half < nh ? p->half : nh; if (lim > SP_HK) lim = SP_HK;
    s->k0 = nh - lim; s->nk = lim; for (int q = 0; q < lim; q++) s->hk[q] = keyHist[nh - lim + q]; }
  s->pm = ply > 0 ? moveStack[ply - 1] : 0; s->ppc = ply > 0 ? pieceStack[ply - 1] : 0; s->se1 = ply > 0 ? staticEvalStack[ply - 1] : 0;
  s->se0 = staticEvalStack[ply]; s->km0 = killers[ply][0]; s->km1 = killers[ply][1];
  s->root = ply == 0; s->all = 0; s->pv = pvNode; s->alpha = alpha;
  spRun(s, best, bestMove, 0);   /* (praline_ybw.h; the line and another thread's cut-off: spClosed) */
  return 1;
}
/* 1: this thread is a Lazy SMP helper (think on the root again and again, with its own history; no split points), 0: the lead
   or a YBW helper (mt_idle) */
EXPORT(mt_lazy) void mt_lazy(int on) { histP = on ? &historyT : &historyS; cmP = on ? &counterMoveT : &counterMoveS; noSplit = on; }
/* the split depth; (maxT, dup: the most threads on a split point and the second searches — Praline's are any and on, the
   values these had by default); the moves searched before a split at an expected cut node */
EXPORT(mt_split) void mt_split(int d, int maxT, int dup, int cutn) { (void)maxT; (void)dup; if (d > 0) splitD = d; if (cutn > 0) SP_CUTN = cutn; }
/* the busy marks from remaining depth d (0: none) */
EXPORT(mt_busy) void mt_busy(int d) { busyD = d > 0 ? d : 0; }
/* a helper (mt-helper.js, pro/mt-worker.js): mt_idle (praline_ybw.h) */
#endif

/* ------------------------------------------------------------------ analysis: value of every root move
 * anaMoves[0..n) is the move order to use (from the previous depth); values and kinds are written back.
 * kind: 0 exact, 1 upper bound (the move is at least `margin` worse than the best). Returns n, or -1 if aborted. */
static TLS i32 anaMoves[256], anaVals[256], anaKind[256];
EXPORT(ana_moves) i32 *ana_moves(void) { return anaMoves; }
EXPORT(ana_vals) i32 *ana_vals(void) { return anaVals; }
EXPORT(ana_kind) i32 *ana_kind(void) { return anaKind; }
EXPORT(ana_begin) void ana_begin(double hardMs, double nodeLim) {
#ifdef MT
  rootK = 0; if (!threadId) ttAge++;
#endif
  tStart = js_now(); tHard = hardMs; nodeLimit = nodeLim; nodes = 0; stopFlag = 0; memset(killers, 0, sizeof killers); accDirty[0] = ACC_ALL; sp = 0; }
EXPORT(analyze_depth) int analyze_depth(int n, int depth, int margin) {
  int best = -INF;
  for (int i = 0; i < n; i++) {
    int m = anaMoves[i], v, kind = 0;
    moveStack[0] = m; pieceStack[0] = P.board[M_FROM(m)];
    make_move(&P, m);
    if (i == 0 || margin <= 0) v = -search(&P, -INF, INF, depth - 1, 1, 0, 0);
    else {
      int lo = best - margin; if (lo < -INF + 1) lo = -INF + 1;
      v = -search(&P, -(best + 1), -lo, depth - 1, 1, 0, 0);
      if (v > best && !stopFlag) v = -search(&P, -INF, -best, depth - 1, 1, 0, 0);
      else if (v <= lo) kind = 1;
    }
    unmake_move(&P, m);
    if (stopFlag) return -1;
    anaVals[i] = v; anaKind[i] = kind;
    if (v > best) best = v;
  }
  resNodes = nodes;
  return n;
}

#ifdef MT
/* ------------------------------------------------------------------ threads (engine_mt.wasm, see engine-mt.js) */
extern unsigned char __heap_base;
extern void __wasm_init_tls(void *);
EXPORT(mt_heap_base) u32 mt_heap_base(void) { return (u32)&__heap_base; }
EXPORT(mt_tls_size) u32 mt_tls_size(void) { return __builtin_wasm_tls_size(); }
EXPORT(mt_tls_align) u32 mt_tls_align(void) { return __builtin_wasm_tls_align(); }
/* every instance first: mt_stack (its own stack: the top address; a function without a frame of its own), then
   mt_thread (its TLS block and thread number) */
EXPORT(mt_stack) void mt_stack(u32 stackTop) { __asm__ volatile(".globaltype __stack_pointer, i32\n local.get %0\n global.set __stack_pointer" :: "r"(stackTop)); }
EXPORT(mt_thread) void mt_thread(u32 tls, int id) { __wasm_init_tls((void *)tls); threadId = id; mt_lazy(0); }
EXPORT(mt_stop) void mt_stop(int v) { __atomic_store_n(&gStop, v, __ATOMIC_SEQ_CST); }
#endif
