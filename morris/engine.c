// Nine Men's Morris search engine in C (compiled to WebAssembly) — a port of the search in engine.js.
// Rules, evaluation and search mirror engine.js: negamax alpha-beta (PVS) with a transposition table,
// killer/history ordering, quiescence on captures, repetition and 50-move draws, mate-distance pruning.
// Optional: endgame databases (retrograde-solved by tools/solve.c, loaded by the host) for nine / twelve men's morris.
//
// Build: sh tools/build.sh (engine_simd.wasm, engine.wasm without SIMD, engine_mt.wasm)
// Host protocol (all through the shared buffer at io_ptr()):
//   geometry(n, pieces, fly, nmills, mills[3*k]..., nextra, extra[2*k]...)  -> set_geometry()
//   setup: b[n], hand1, hand2, side, quiet, nmoves, moves...                  -> setup()
//   results are written back to io as int32 values.
#include <stdint.h>
#ifdef __wasm_simd128__
#include <wasm_simd128.h>   // (2026-11-11) wasm SIMD (-msimd128): engine_simd.wasm and engine_mt.wasm; engine.wasm without it, the same values
#endif
// MT (engine_mt.wasm, see the build line below): several threads search one root together on a shared memory ("Lazy SMP");
// the state of one search is thread-local (TLS), the geometry, the evaluation weights, the endgame databases and the
// transposition table are shared. Without it TLS is nothing and engine.wasm stays byte for byte as before.
// Build (MT): clang --target=wasm32 -O3 -msimd128 -matomics -mbulk-memory -DMT -nostdlib -fno-builtin -Wl,--no-entry -Wl,--export-dynamic
//        -Wl,--shared-memory -Wl,--import-memory -Wl,--max-memory=1073741824 -o engine_mt.wasm engine.c
#ifdef MT
#define TLS _Thread_local
#else
#define TLS
#endif
#define EXPORT(name) __attribute__((export_name(#name)))
#define IMPORT(name) __attribute__((import_module("env"), import_name(#name)))
IMPORT(now) double now(void);
IMPORT(progress) void progress(int depth, int count);

typedef int32_t i32; typedef uint32_t u32; typedef int8_t i8; typedef uint8_t u8;
#define NONE 31
#define WIN 30000
#define WINT 29000
#define INF 32000
#define QUIET_DRAW 50
#define MAXPLY 96
#define MAXMV 1200
// late move reductions (on by default; -DNO_LMR to disable)
#ifndef NO_LMR
#define LMR 1
#endif
#ifndef LMR_D
#define LMR_D 3
#define LMR_I 3
#define LMR_I2 8
#endif

static TLS i32 IO[8192];
EXPORT(io_ptr) i32 *io_ptr(void) { return IO; }

// ---------------------------------------------------------------- geometry
static int N, PIECES, FLY, NM;
static int mills[24][3];
static int adjn[24], adjv[24][8];
static int prn[24], pr[24][16];          // pairs of mill partners per point
static u32 millMask[24], adjMask[24], millAdj[24], ALL, DEG[5];
static u32 MMV[24] __attribute__((aligned(16))); static int NMV;   // the mill masks, 0-padded to whole vectors of 4 (millCand, inMills)
static int ptMn[24]; static u32 ptMm[24][4];
static u32 zp[3][24], zp2[3][24], zh[3][16], zh2[3][16], zs, zs2;
static u32 rs = 0x9e3779b9u;
// (2026-11-14) through murmur3's fmix32: the raw xorshift outputs are linear over GF(2) — each key's second half was a fixed
// linear map of the first, so the 64-bit keys were only 32 bits (claude/praline-spec.md「Zobrist」)
static u32 rnd(void) { rs ^= rs << 13; rs ^= rs >> 17; rs ^= rs << 5; u32 z = rs; z ^= z >> 16; z *= 0x85ebca6bu; z ^= z >> 13; z *= 0xc2b2ae35u; z ^= z >> 16; return z; }
static void link(int a, int b) { for (int k = 0; k < adjn[a]; k++) if (adjv[a][k] == b) return; adjv[a][adjn[a]++] = b; adjv[b][adjn[b]++] = a; }
#ifdef MT
static volatile int geoKey;   // the geometry in force (shared): a helper thread waits for the job's before it searches
EXPORT(geo_key) int geo_key(void) { return __atomic_load_n(&geoKey, __ATOMIC_SEQ_CST); }
#endif
static void ewSelect(void);   // (the evaluation weights of the geometry, below)
EXPORT(set_geometry) void set_geometry(void) {
  int k = 0; N = IO[k++]; PIECES = IO[k++]; FLY = IO[k++]; NM = IO[k++];
  for (int i = 0; i < N; i++) { adjn[i] = 0; prn[i] = 0; }
  for (int m = 0; m < NM; m++) { mills[m][0] = IO[k++]; mills[m][1] = IO[k++]; mills[m][2] = IO[k++]; }
  for (int m = 0; m < NM; m++) { link(mills[m][0], mills[m][1]); link(mills[m][1], mills[m][2]); }
  int ne = IO[k++]; for (int e = 0; e < ne; e++) { int a = IO[k++], b = IO[k++]; link(a, b); }
  for (int m = 0; m < NM; m++) for (int j = 0; j < 3; j++) { int p = mills[m][j]; int o[2], c = 0; for (int q = 0; q < 3; q++) if (q != j) o[c++] = mills[m][q]; pr[p][prn[p]++] = o[0]; pr[p][prn[p]++] = o[1]; }
  ALL = N == 32 ? 0xFFFFFFFFu : (1u << N) - 1; for (int d = 0; d < 5; d++) DEG[d] = 0;
  for (int i = 0; i < N; i++) { adjMask[i] = 0; for (int j = 0; j < adjn[i]; j++) adjMask[i] |= 1u << adjv[i][j]; ptMn[i] = 0; if (adjn[i] < 5) DEG[adjn[i]] |= 1u << i; }
  for (int m = 0; m < NM; m++) { u32 mm = (1u << mills[m][0]) | (1u << mills[m][1]) | (1u << mills[m][2]); millMask[m] = mm; millAdj[m] = adjMask[mills[m][0]] | adjMask[mills[m][1]] | adjMask[mills[m][2]];
    for (int j = 0; j < 3; j++) { int p = mills[m][j]; ptMm[p][ptMn[p]++] = mm; } }
  for (int m = 0; m < 24; m++) MMV[m] = m < NM ? millMask[m] : 0;
  NMV = (NM + 3) / 4;
  rs = 0x9e3779b9u ^ (u32)(N * 7919);
  for (int s = 0; s < 3; s++) for (int i = 0; i < 24; i++) { zp[s][i] = rnd(); zp2[s][i] = rnd(); }
  for (int s = 0; s < 3; s++) for (int i = 0; i < 16; i++) { zh[s][i] = rnd(); zh2[s][i] = rnd(); }
  zs = rnd(); zs2 = rnd();
  ewSelect();
#ifdef MT
  __atomic_store_n(&geoKey, N | PIECES << 5 | FLY << 10 | NM << 11 | ne << 17, __ATOMIC_SEQ_CST);   // (last: the helpers wait for it)
#endif
}

// ---------------------------------------------------------------- position
typedef struct { i8 b[24]; u32 bb[3]; i8 hand[3], cnt[3]; int side, quiet; u32 h1, h2; int stk[MAXPLY + 1024]; int sp; } Pos;
static TLS Pos P;
static void rehash(Pos *p) {
  u32 a = 0, b = 0;
  for (int i = 0; i < N; i++) if (p->b[i]) { a ^= zp[(int)p->b[i]][i]; b ^= zp2[(int)p->b[i]][i]; }
  for (int s = 1; s <= 2; s++) { a ^= zh[s][(int)p->hand[s]]; b ^= zh2[s][(int)p->hand[s]]; }
  if (p->side == 2) { a ^= zs; b ^= zs2; }
  p->h1 = a; p->h2 = b;
}
static inline int inMill(const Pos *p, int i) {
  int v = p->b[i]; if (!v) return 0; u32 B = p->bb[v];
  for (int k = 0; k < ptMn[i]; k++) if ((B & ptMm[i][k]) == ptMm[i][k]) return 1;
  return 0;
}
static inline int closes(const Pos *p, int s, int f, int t) {
  u32 B = p->bb[s] & ~(1u << f), tb = 1u << t;
  for (int k = 0; k < ptMn[t]; k++) { u32 mt = ptMm[t][k] & ~tb; if ((B & mt) == mt) return 1; }
  return 0;
}
// (2026-11-11) the empty points that would close a mill of B: the third point of every mill with two of B and one empty.
// A move to t closes a mill only if t is one (with the moving piece's point f taken off B the mill may be gone: closes()
// decides) — so the move generators call closes() only on these targets. 4 mills at a time with wasm SIMD.
static inline u32 millCand(u32 B, u32 E) {
#ifdef __wasm_simd128__
  const v128_t vb = wasm_i32x4_splat((int)B), ve = wasm_i32x4_splat((int)E), one = wasm_i32x4_splat(1), z = wasm_i32x4_splat(0);
  v128_t acc = z;
  for (int q = 0; q < NMV; q++) {
    v128_t mm = wasm_v128_load(&MMV[4 * q]), x = wasm_v128_and(vb, mm), y = wasm_v128_and(x, wasm_i32x4_sub(x, one));
    v128_t two = wasm_v128_andnot(wasm_i32x4_eq(wasm_v128_and(y, wasm_i32x4_sub(y, one)), z), wasm_i32x4_eq(y, z));   // (exactly 2 bits of B)
    acc = wasm_v128_or(acc, wasm_v128_and(two, wasm_v128_and(mm, ve)));
  }
  acc = wasm_v128_or(acc, wasm_i32x4_shuffle(acc, acc, 2, 3, 0, 1)); acc = wasm_v128_or(acc, wasm_i32x4_shuffle(acc, acc, 1, 0, 3, 2));
  return (u32)wasm_i32x4_extract_lane(acc, 0);
#else
  u32 c = 0;
  for (int m = 0; m < NM; m++) { u32 x = B & millMask[m], y = x & (x - 1); if (y && !(y & (y - 1))) c |= millMask[m] & E; }
  return c;
#endif
}
// the points of B in a mill of B
static inline u32 inMills(u32 B) {
#ifdef __wasm_simd128__
  const v128_t vb = wasm_i32x4_splat((int)B);
  v128_t acc = wasm_i32x4_splat(0);
  for (int q = 0; q < NMV; q++) { v128_t mm = wasm_v128_load(&MMV[4 * q]); acc = wasm_v128_or(acc, wasm_v128_and(mm, wasm_i32x4_eq(wasm_v128_and(vb, mm), mm))); }
  acc = wasm_v128_or(acc, wasm_i32x4_shuffle(acc, acc, 2, 3, 0, 1)); acc = wasm_v128_or(acc, wasm_i32x4_shuffle(acc, acc, 1, 0, 3, 2));
  return (u32)wasm_i32x4_extract_lane(acc, 0);   // (a 0-padded lane passes the test but adds nothing)
#else
  u32 inm = 0;
  for (int m = 0; m < NM; m++) if ((B & millMask[m]) == millMask[m]) inm |= millMask[m];
  return inm;
#endif
}
static int removable(const Pos *p, int o, int *out) {
  u32 B = p->bb[o], inm = inMills(B);
  u32 R = B & ~inm; if (!R) R = B;
  int k = 0; while (R) { out[k++] = __builtin_ctz(R); R &= R - 1; }
  return k;
}
static int gen(const Pos *p, int *out) {
  int s = p->side, o = 3 - s, k = 0, nr = -1, rem[24];
#define ADD(f, t) do { if ((C >> (t) & 1) && closes(p, s, f, t)) { if (nr < 0) nr = removable(p, o, rem); for (int j = 0; j < nr; j++) out[k++] = (f) | ((t) << 5) | (rem[j] << 10); } else out[k++] = (f) | ((t) << 5) | (NONE << 10); } while (0)
  u32 E = ALL & ~(p->bb[1] | p->bb[2]), C = p->cnt[o] > 0 ? millCand(p->bb[s], E) : 0;   // (C: the targets that may close a mill)
  if (p->hand[s] > 0) { for (u32 T = E; T; T &= T - 1) { int t = __builtin_ctz(T); ADD(NONE, t); } }
  else if (FLY && p->cnt[s] == 3) { for (u32 F = p->bb[s]; F; F &= F - 1) { int f = __builtin_ctz(F); for (u32 T = E; T; T &= T - 1) { int t = __builtin_ctz(T); ADD(f, t); } } }
  else { for (u32 F = p->bb[s]; F; F &= F - 1) { int f = __builtin_ctz(F); for (int j = 0; j < adjn[f]; j++) { int t = adjv[f][j]; if (!p->b[t]) ADD(f, t); } } }
#undef ADD
  return k;
}
// whether the side to move has any move at all
static inline int anyMove(const Pos *p) {
  int s = p->side; u32 E = ALL & ~(p->bb[1] | p->bb[2]);
  if (p->hand[s] > 0 || (FLY && p->cnt[s] == 3)) return E != 0;
  for (u32 F = p->bb[s]; F; F &= F - 1) if (adjMask[__builtin_ctz(F)] & E) return 1;
  return 0;
}
// capture moves only (same order as gen; only the targets of millCand can close a mill)
static int genCaps(const Pos *p, int *out) {
  int s = p->side, o = 3 - s, k = 0, nr = -1, rem[24];
  if (p->cnt[o] <= 0) return 0;
  u32 E = ALL & ~(p->bb[1] | p->bb[2]), C = millCand(p->bb[s], E);
  if (!C) return 0;
#define CAP(f, t) do { if (closes(p, s, f, t)) { if (nr < 0) nr = removable(p, o, rem); for (int j = 0; j < nr; j++) out[k++] = (f) | ((t) << 5) | (rem[j] << 10); } } while (0)
  if (p->hand[s] > 0) { for (u32 T = C; T; T &= T - 1) { int t = __builtin_ctz(T); CAP(NONE, t); } }
  else if (FLY && p->cnt[s] == 3) { for (u32 F = p->bb[s]; F; F &= F - 1) { int f = __builtin_ctz(F); for (u32 T = C; T; T &= T - 1) { int t = __builtin_ctz(T); CAP(f, t); } } }
  else {
    for (u32 F = p->bb[s]; F; F &= F - 1) { int f = __builtin_ctz(F); if (adjMask[f] & C) for (int j = 0; j < adjn[f]; j++) { int t = adjv[f][j]; if (C >> t & 1) CAP(f, t); } }
  }
#undef CAP
  return k;
}
static void play(Pos *p, int m) {
  int s = p->side, o = 3 - s, f = m & 31, t = (m >> 5) & 31, r = (m >> 10) & 31;
  p->stk[p->sp++] = p->quiet;
  if (f == NONE) { p->h1 ^= zh[s][(int)p->hand[s]]; p->h2 ^= zh2[s][(int)p->hand[s]]; p->hand[s]--; p->cnt[s]++; p->h1 ^= zh[s][(int)p->hand[s]]; p->h2 ^= zh2[s][(int)p->hand[s]]; }
  else { p->b[f] = 0; p->bb[s] &= ~(1u << f); p->h1 ^= zp[s][f]; p->h2 ^= zp2[s][f]; }
  p->b[t] = s; p->bb[s] |= 1u << t; p->h1 ^= zp[s][t]; p->h2 ^= zp2[s][t];
  if (r != NONE) { p->b[r] = 0; p->bb[o] &= ~(1u << r); p->cnt[o]--; p->h1 ^= zp[o][r]; p->h2 ^= zp2[o][r]; }
  p->quiet = (f == NONE || r != NONE) ? 0 : p->quiet + 1;
  p->side = o; p->h1 ^= zs; p->h2 ^= zs2;
}
static void undo(Pos *p, int m) {
  int o = p->side, s = 3 - o, f = m & 31, t = (m >> 5) & 31, r = (m >> 10) & 31;
  p->side = s; p->h1 ^= zs; p->h2 ^= zs2;
  if (r != NONE) { p->b[r] = o; p->bb[o] |= 1u << r; p->cnt[o]++; p->h1 ^= zp[o][r]; p->h2 ^= zp2[o][r]; }
  p->b[t] = 0; p->bb[s] &= ~(1u << t); p->h1 ^= zp[s][t]; p->h2 ^= zp2[s][t];
  if (f == NONE) { p->h1 ^= zh[s][(int)p->hand[s]]; p->h2 ^= zh2[s][(int)p->hand[s]]; p->hand[s]++; p->cnt[s]--; p->h1 ^= zh[s][(int)p->hand[s]]; p->h2 ^= zh2[s][(int)p->hand[s]]; }
  else { p->b[f] = s; p->bb[s] |= 1u << f; p->h1 ^= zp[s][f]; p->h2 ^= zp2[s][f]; }
  p->quiet = p->stk[--p->sp];
}

// ---------------------------------------------------------------- endgame databases (nine / twelve, moving phase)
// (2026-11-14) The classes of tools/solve.c (-s 8: the moving phase with at most 8 pieces on the board), shipped packed as
// nine-eg.mdb.gz / twelve-eg.mdb.gz (perfect.js reads them). The host (engine.js) grows the memory, copies each class there
// and registers it (eg_add); the symmetries come with the file (eg_init). Values for the side to move at quiet count 0:
// 0 draw, 1..127 win, 128 + z loss, z = the plies the winner needs to force its next capture (or a block); with quiet q a
// win / loss is decisive only while z <= 50 - q (else a draw), as in solve.c. Index: solve.c idxOf (orbit of A under the
// board's 16 symmetries, then the smallest image of B under the symmetries that fix it).
// Probed only while egUse is set (the time-based levels, PRO, analysis); off, the search is exactly the one before.
#define EG_MMAX 5
static const u8 *egT[10][10];          // class m-o (m pieces of the side to move), NULL = not loaded
static int egNM = 0, egUse = 0;        // the mill count of the loaded variant (16 nine, 20 twelve; 0 none); probing on
static u8 egSymIn[16 * 24]; static int egNS;
static u32 egSymT[16][3][256];
static u32 CB[25][25];
extern unsigned char __heap_base;
static u32 egOrb[2024 + 10626 + 42504], egRepM[2024 + 10626 + 42504]; static uint16_t egGm[2024 + 10626 + 42504];
static const int egOff[EG_MMAX + 1] = { 0, 0, 0, 0, 2024, 2024 + 10626 };
static inline u32 egRank(u32 S) { u32 r = 0; int i = 0; while (S) { int q = __builtin_ctz(S); S &= S - 1; i++; if (q >= i) r += CB[q][i]; } return r; }
static inline u32 egSym(int g, u32 S) { return egSymT[g][0][S & 255] | egSymT[g][1][(S >> 8) & 255] | egSymT[g][2][(S >> 16) & 255]; }
static inline u32 egComp(u32 B, u32 A) { u32 out = 0; int j = 0; for (int q = 0; q < 24; q++) { if (A >> q & 1) continue; if (B >> q & 1) out |= 1u << j; j++; } return out; }
static u32 egUnrank(u32 r, int k) { u32 mask = 0; for (int i = k; i >= 1; i--) { int q = i - 1; while (CB[q + 1][i] <= r) q++; r -= CB[q][i]; mask |= 1u << q; } return mask; }
EXPORT(eg_sym_ptr) u8 *eg_sym_ptr(void) { return egSymIn; }
// a new database (the symmetries in egSymIn, ns of them, as point images): clears the classes, builds the orbit tables
EXPORT(eg_init) void eg_init(int ns, int nm) {
  egNM = 0;
  for (int a = 0; a < 10; a++) for (int b = 0; b < 10; b++) egT[a][b] = 0;
  for (int a = 0; a <= 24; a++) { CB[a][0] = 1; for (int k = 1; k <= a; k++) CB[a][k] = CB[a - 1][k - 1] + (k <= a - 1 ? CB[a - 1][k] : 0); }
  egNS = ns > 16 ? 16 : ns;
  for (int g = 0; g < egNS; g++) for (int k = 0; k < 3; k++) for (int b = 0; b < 256; b++) { u32 x = 0; for (int j = 0; j < 8; j++) if (b >> j & 1) x |= 1u << egSymIn[g * 24 + 8 * k + j]; egSymT[g][k][b] = x; }
  for (int m = 3; m <= EG_MMAX; m++) {   // as solve.c buildOrb: orbits numbered in the order of their smallest rank
    u32 n = CB[24][m], *orb = egOrb + egOff[m], *rep = egRepM + egOff[m]; uint16_t *gm = egGm + egOff[m];
    for (u32 r = 0; r < n; r++) {
      u32 A = egUnrank(r, m), best = 0xFFFFFFFF, g0 = 0;
      for (int g = 0; g < egNS; g++) { u32 x = egRank(egSym(g, A)); if (x < best) { best = x; g0 = 1u << g; } else if (x == best) g0 |= 1u << g; }
      rep[r] = best; gm[r] = (uint16_t)g0;
    }
    u32 k = 0; for (u32 r = 0; r < n; r++) if (rep[r] == r) orb[r] = k++;   // (orb of a representative first)
    for (u32 r = 0; r < n; r++) { u32 R = rep[r]; orb[r] = orb[R]; }
    for (u32 r = 0; r < n; r++) rep[r] = egUnrank(rep[r], m);                   // (now the representative's point set)
  }
  egNM = nm;
}
EXPORT(eg_add) void eg_add(int m, int o, const u8 *ptr) { if (m >= 3 && m <= EG_MMAX && o >= 3 && o <= 9) egT[m][o] = ptr; }
EXPORT(eg_use) void eg_use(int on) { egUse = on; }
EXPORT(eg_ready) int eg_ready(void) { return egNM; }
// raw value of the position for its side to move, or -1 when not covered (call with both hands empty)
static int egProbe(const Pos *p) {
  if (NM != egNM || N != 24) return -1;
  int s = p->side, m = p->cnt[s], o = p->cnt[3 - s];
  if (m > EG_MMAX || o > 9) return -1;
  const u8 *T = egT[m][o]; if (!T) return -1;
  u32 A = p->bb[s], B = p->bb[3 - s], rA = egRank(A), at = egOff[m] + rA, R = egRepM[at], best = 0xFFFFFFFF;
  for (u32 gs = egGm[at]; gs; gs &= gs - 1) { u32 x = egRank(egComp(egSym(__builtin_ctz(gs), B), R)); if (x < best) best = x; }
  return T[egOrb[at] * CB[24 - m][o] + best];
}
static int evaluate(const Pos *p);
// search value of a probed position: a win is scored in the band WINT < v < WIN - 400 (below every forced win the search
// finds by itself), higher for fewer pieces of the loser and a smaller z — so the winner always takes when it can (64 per
// piece > any z) and otherwise lowers z; a draw is a small share of the evaluation (the stronger side keeps trying)
static int egScore(const Pos *p, int v, int ply) {
  int s = p->side, z = v & 127;
  if (v == 0 || z > QUIET_DRAW - p->quiet) { int e = evaluate(p) / 8; return e > 100 ? 100 : e < -100 ? -100 : e; }
  if (v < 128) return WIN - 400 - (64 * p->cnt[3 - s] + z) - ply;
  return -(WIN - 400 - (64 * p->cnt[s] + z) - ply);
}

// ---------------------------------------------------------------- evaluation (side to move), same as engine.js
// learned evaluation for nine men's morris (optional): 71 inputs -> H ReLU -> 1, weights set by the host
#define NET_HMAX 128
static float NETW[71 * NET_HMAX + 2 * NET_HMAX + 1]; static int netH = 0;
EXPORT(net_ptr) float *net_ptr(void) { return NETW; }
#ifdef __wasm_simd128__
// (netEval64) the first part of the sums, B1 + the rows of the side to move's pieces, depends on its pieces only (the same
// at the leaves after the other side's moves): kept in a small cache by that set (exactly the floats the adds give)
#define NPC_BITS 8
typedef struct { u32 key; float a[64] __attribute__((aligned(16))); } NPC;
#ifdef MT
static TLS NPC *npc;   // (each thread's, 66 KB in its slot after the move lists: mt_thread)
#else
static NPC npc[1 << NPC_BITS];   // (key: the set | 1 << 31, 0 = empty)
#endif
#endif
EXPORT(net_on) void net_on(int h) {
  netH = h;
#ifdef __wasm_simd128__
  for (int i = 0; i < (1 << NPC_BITS); i++) npc[i].key = 0;   // (new weights)
#endif
}
#ifdef __wasm_simd128__
// (2026-11-11) H = 64 (evalnet.bin) with wasm SIMD: the 64 sums in 16 vectors that stay in registers, the rows added in the
// same order as below (each lane is the same float sum), ReLU × W2 4 at a time, then the positive terms added one by one
// in the order of k as below (a term of a sum ≤ 0 is skipped there too) — the same value to the last bit.
static int netEval64(const Pos *p) {
  int s = p->side, o = 3 - s, rows[32], nr = 0; const float *W1 = NETW, *B1 = NETW + 71 * 64, *W2 = B1 + 64; float b2 = W2[64];
  const u32 S = p->bb[s], key = S | 1u << 31; NPC *c = &npc[(S * 0x9E3779B1u) >> (32 - NPC_BITS)];
  if (c->key != key) { for (u32 x = S; x; x &= x - 1) rows[nr++] = __builtin_ctz(x); }
  const float *a0p = c->key == key ? c->a : B1;
#define LD(a, j) wasm_v128_load((a) + 4 * (j))
#define ROWS() for (int r = 0; r < nr; r++) { \
    const float *w = W1 + rows[r] * 64; \
    a0 = wasm_f32x4_add(a0, LD(w, 0)); a1 = wasm_f32x4_add(a1, LD(w, 1)); a2 = wasm_f32x4_add(a2, LD(w, 2)); a3 = wasm_f32x4_add(a3, LD(w, 3)); \
    a4 = wasm_f32x4_add(a4, LD(w, 4)); a5 = wasm_f32x4_add(a5, LD(w, 5)); a6 = wasm_f32x4_add(a6, LD(w, 6)); a7 = wasm_f32x4_add(a7, LD(w, 7)); \
    a8 = wasm_f32x4_add(a8, LD(w, 8)); a9 = wasm_f32x4_add(a9, LD(w, 9)); a10 = wasm_f32x4_add(a10, LD(w, 10)); a11 = wasm_f32x4_add(a11, LD(w, 11)); \
    a12 = wasm_f32x4_add(a12, LD(w, 12)); a13 = wasm_f32x4_add(a13, LD(w, 13)); a14 = wasm_f32x4_add(a14, LD(w, 14)); a15 = wasm_f32x4_add(a15, LD(w, 15)); }
  v128_t a0 = LD(a0p, 0), a1 = LD(a0p, 1), a2 = LD(a0p, 2), a3 = LD(a0p, 3), a4 = LD(a0p, 4), a5 = LD(a0p, 5), a6 = LD(a0p, 6), a7 = LD(a0p, 7),
         a8 = LD(a0p, 8), a9 = LD(a0p, 9), a10 = LD(a0p, 10), a11 = LD(a0p, 11), a12 = LD(a0p, 12), a13 = LD(a0p, 13), a14 = LD(a0p, 14), a15 = LD(a0p, 15);
  if (nr) {
    ROWS();
    float *d = c->a;
    wasm_v128_store(d, a0); wasm_v128_store(d + 4, a1); wasm_v128_store(d + 8, a2); wasm_v128_store(d + 12, a3);
    wasm_v128_store(d + 16, a4); wasm_v128_store(d + 20, a5); wasm_v128_store(d + 24, a6); wasm_v128_store(d + 28, a7);
    wasm_v128_store(d + 32, a8); wasm_v128_store(d + 36, a9); wasm_v128_store(d + 40, a10); wasm_v128_store(d + 44, a11);
    wasm_v128_store(d + 48, a12); wasm_v128_store(d + 52, a13); wasm_v128_store(d + 56, a14); wasm_v128_store(d + 60, a15);
    c->key = key; nr = 0;
  } else if (c->key != key) {   // (no pieces: B1 itself)
    c->key = key; for (int k = 0; k < 64; k++) c->a[k] = B1[k];
  }
  for (u32 x = p->bb[o]; x; x &= x - 1) rows[nr++] = 24 + __builtin_ctz(x);
  rows[nr++] = 48 + p->hand[s]; rows[nr++] = 58 + p->hand[o];
  if (!p->hand[s] && p->cnt[s] == 3) rows[nr++] = 68;
  if (!p->hand[o] && p->cnt[o] == 3) rows[nr++] = 69;
  if (p->hand[s] || p->hand[o]) rows[nr++] = 70;
  ROWS();
#undef ROWS
  float q[64] __attribute__((aligned(16))); unsigned long long pos = 0; const v128_t z = wasm_f32x4_splat(0.0f);
#define TERM(j, a) do { wasm_v128_store(q + 4 * (j), wasm_f32x4_mul(a, LD(W2, j))); pos |= (unsigned long long)wasm_i32x4_bitmask(wasm_f32x4_gt(a, z)) << (4 * (j)); } while (0)
  TERM(0, a0); TERM(1, a1); TERM(2, a2); TERM(3, a3); TERM(4, a4); TERM(5, a5); TERM(6, a6); TERM(7, a7);
  TERM(8, a8); TERM(9, a9); TERM(10, a10); TERM(11, a11); TERM(12, a12); TERM(13, a13); TERM(14, a14); TERM(15, a15);
#undef TERM
#undef LD
  float out = b2; for (; pos; pos &= pos - 1) out += q[__builtin_ctzll(pos)];
  int v = (int)(out * 200.0f + (out >= 0 ? 0.5f : -0.5f));
  return v > 20000 ? 20000 : v < -20000 ? -20000 : v;
}
#endif
static int netEval(const Pos *p) {
#ifdef __wasm_simd128__
  if (netH == 64) return netEval64(p);
#endif
  int H = netH, s = p->side, o = 3 - s; const float *W1 = NETW, *B1 = NETW + 71 * H, *W2 = B1 + H; float b2 = W2[H];
  float acc[NET_HMAX];
  for (int k = 0; k < H; k++) acc[k] = B1[k];
#define ADDR(r) do { const float *w = W1 + (r) * H; for (int k = 0; k < H; k++) acc[k] += w[k]; } while (0)
  for (u32 x = p->bb[s]; x; x &= x - 1) ADDR(__builtin_ctz(x));
  for (u32 x = p->bb[o]; x; x &= x - 1) ADDR(24 + __builtin_ctz(x));
  ADDR(48 + p->hand[s]); ADDR(58 + p->hand[o]);
  if (!p->hand[s] && p->cnt[s] == 3) ADDR(68);
  if (!p->hand[o] && p->cnt[o] == 3) ADDR(69);
  if (p->hand[s] || p->hand[o]) ADDR(70);
#undef ADDR
  float out = b2; for (int k = 0; k < H; k++) if (acc[k] > 0) out += acc[k] * W2[k];
  int v = (int)(out * 200.0f + (out >= 0 ? 0.5f : -0.5f));
  return v > 20000 ? 20000 : v < -20000 ? -20000 : v;
}
// (2026-11-14) the hand evaluation as weights × terms (MODEL_CARD.md「評価関数の Texel 調整」). EW_NINE are the weights of
// before (nine men's: the fallback when evalnet.bin is not loaded); twelve and six use weights fitted to self-play results
// (logistic loss), with a few new terms that are 0 in EW_NINE. Only the levels that search in WebAssembly (Lv.8 and up,
// analysis, hints, coach, PRO) use this evaluation: Lv.1–7 search in engine.js, whose evaluation is unchanged.
enum { F_MAT, F_THR_OWN, F_THR_OPP, F_TWO_PL, F_TWO_MV, F_MILL_PL, F_MILL_OPEN, F_MILL_SHUT, F_THRO2, F_THRO1, F_THRP,
  F_DEG_PL, F_MOB_OWN, F_MOB_OPP, F_MOB0_OWN, F_MOB1_OWN, F_MOB0_OPP, F_MOB1_OPP,
  F_HAND, F_FLY_OWN, F_FLY_OPP, F_SWING, F_BLOCKED, F_POT1_PL, F_MAT_MV, NF };
#ifndef EW_TWELVE_W   // (fitted: 2,347 self-play games, 54k quiet positions; tools/texel.js)
#define EW_TWELVE_W { 100, 24, -152, 123, 17, -42, 52, -33, 30, 70, 20, 26, 1, 4, -400, -54, 300, 30, 136, 182, -161, 45, -15, 68, 57 }
#endif
#ifndef EW_SIX_W   // (six: the fitted weights were no stronger at equal time — +1 Elo, 400 games — so the old ones)
#define EW_SIX_W { 100, 24, -24, 6, 7, 8, 22, 10, -85, -18, 20, 4, 5, -5, -400, -40, 300, 30, 0, 0, 0, 0, 0, 0, 0 }
#endif
static const int EW_NINE[NF] = { 100, 24, -24, 6, 7, 8, 22, 10, -85, -18, 20, 4, 5, -5, -400, -40, 300, 30, 0, 0, 0, 0, 0, 0, 0 };
static const int EW_TWELVE[NF] = EW_TWELVE_W, EW_SIX[NF] = EW_SIX_W;
static const int *EW = EW_NINE;
static void ewSelect(void) { EW = N == 16 ? EW_SIX : NM == 20 ? EW_TWELVE : EW_NINE; }
static int evaluate(const Pos *p) {
  if (netH && N == 24 && NM == 16) return netEval(p);
  const int *w = EW;
  int s = p->side, o = 3 - s; u32 S = p->bb[s], O = p->bb[o], E = ALL & ~(S | O);
  int mat = (p->cnt[s] + p->hand[s]) - (p->cnt[o] + p->hand[o]);
  int sc = w[F_MAT] * mat;
  int placing = p->hand[1] > 0 || p->hand[2] > 0;
  int flyP = FLY && !p->hand[s] && p->cnt[s] == 3, flyO = FLY && !p->hand[o] && p->cnt[o] == 3;
  int thrO = 0, thrP = 0;
  for (int k = 0; k < NM; k++) {
    u32 mm = millMask[k]; int np = __builtin_popcount(S & mm), no = __builtin_popcount(O & mm);
    if (np + no == 2 && (np == 2 || no == 2)) {
      int who = np == 2 ? s : o, sg = who == s ? 1 : -1;
      int nw = 0;
      if (p->hand[who] > 0 || (who == s ? flyP : flyO)) nw = 1;
      else if (!placing) { int e = __builtin_ctz(mm & E); if (adjMask[e] & p->bb[who] & ~mm) nw = 1; }
      if (nw) { if (who == s) { thrP++; sc += w[F_THR_OWN]; } else { thrO++; sc += w[F_THR_OPP]; } }
      else sc += sg * w[placing ? F_TWO_PL : F_TWO_MV];
    } else if (np == 3 || no == 3) {
      int sg = np == 3 ? 1 : -1;
      if (placing) sc += sg * w[F_MILL_PL];
      else {
        sc += sg * w[(millAdj[k] & E) ? F_MILL_OPEN : F_MILL_SHUT];
        int who = np == 3 ? s : o;
        if (w[F_SWING] && !(who == s ? flyP : flyO)) {   // a running mill: a member steps off and closes another mill there
          int sw = 0;
          for (u32 x = mm; x && !sw; x &= x - 1) { int f = __builtin_ctz(x); for (u32 y = adjMask[f] & E; y; y &= y - 1) if (closes(p, who, f, __builtin_ctz(y))) { sw = 1; break; } }
          sc += sg * sw * w[F_SWING];
        }
      }
    } else if (placing && np + no == 1) sc += (np ? 1 : -1) * w[F_POT1_PL];
  }
  if (thrO >= 2) sc += w[F_THRO2]; else if (thrO == 1) sc += w[F_THRO1];
  if (thrP) sc += w[F_THRP];
  if (placing) {
    int dp = 0; for (int d = 1; d < 5; d++) dp += d * (__builtin_popcount(S & DEG[d]) - __builtin_popcount(O & DEG[d]));
    sc += w[F_DEG_PL] * dp + w[F_HAND] * (p->hand[s] - p->hand[o]);
  } else {
    int mp = 0, mo = 0, bp = 0, bo = 0;
    for (u32 x = S; x; x &= x - 1) { int f = __builtin_popcount(adjMask[__builtin_ctz(x)] & E); mp += f; bp += !f; }
    for (u32 x = O; x; x &= x - 1) { int f = __builtin_popcount(adjMask[__builtin_ctz(x)] & E); mo += f; bo += !f; }
    if (!flyP) sc += w[F_MOB_OWN] * mp + (mp == 0 ? w[F_MOB0_OWN] : mp == 1 ? w[F_MOB1_OWN] : 0);
    if (!flyO) sc += w[F_MOB_OPP] * mo + (mo == 0 ? w[F_MOB0_OPP] : mo == 1 ? w[F_MOB1_OPP] : 0);
    sc += w[F_BLOCKED] * ((flyP ? 0 : bp) - (flyO ? 0 : bo)) + w[F_MAT_MV] * mat;
  }
  if (flyP) sc += w[F_FLY_OWN];
  if (flyO) sc += w[F_FLY_OPP];
  return sc;
}
EXPORT(eval_root) int eval_root(void) { return evaluate(&P); }   // (tools: the evaluation of the position set up)

// ---------------------------------------------------------------- search
#define TT_BITS 20
#define TT_SIZE (1 << TT_BITS)
#define TT_MASK (TT_SIZE - 1)
// (2026-11-11) one entry in one 16-byte struct (was six arrays: six cache lines per probe); the same table otherwise
typedef struct { u32 k1, k2; i32 mv; int16_t v; i8 d, fl; } TTE;
static TTE TT[TT_SIZE] __attribute__((aligned(16)));
#ifdef MT
static TLS int (*buf)[MAXMV], (*scb)[MAXMV];   // each thread's move lists (1 MB): in its own slot, after its TLS block (mt_thread)
#else
static int buf[MAXPLY + 8][MAXMV], scb[MAXPLY + 8][MAXMV];
#endif
static TLS int killer[(MAXPLY + 8) * 2], histT[32 * 32];
static TLS u32 rep[4096]; static TLS int repLen;
static TLS double nodes, maxNodes, deadline; static TLS int aborted;
#ifdef MT
// (2026-11-11) gStop, threadId, the busy marks and the split points of Young Brothers Wait are Praline's, the site's common
// thinking engine (claude/praline-spec.md, shared/praline/): included below; the game's part of it ("glue") here.
// (2026-11-09, after the Mac bench) the threads' shared table. The plain one above (one slot per key, always replace, six
// arrays written one by one) is not used: the threads write several times the entries of one thread, and "always replace"
// let the many shallow ones push out the deep ones, so each thread searched again what another had already done (in the
// simulation with the table as full as on the Mac, 2 and 4 threads needed as many main-thread nodes to the same depth as 1);
// and an entry written by two threads at once could pair one position's key with another's value. Here: buckets of four
// entries { key ^ w, w } (w = value, move, depth, flag, age, in use), so a torn entry fails the key check ("lockless");
// store = the same key's entry, else the shallowest / oldest of the bucket (depth − 16 if from an earlier search).
// 2^TTM_BITS buckets x 64 bytes (64 MB: 4M entries, the plain one has 1M).
#ifndef TTM_BITS
#define TTM_BITS 20
#endif
typedef unsigned long long u64;
static u64 TTM[(1 << TTM_BITS) * 8];
static u8 ttAge;
static inline int ttLoad(const Pos *p, int *m, int *d, int *v, int *f) {
  const u64 key = (u64)p->h1 << 32 | p->h2, *bk = &TTM[(p->h1 & ((1u << TTM_BITS) - 1)) * 8];
  for (int j = 0; j < 4; j++) {
    u64 kx = bk[2 * j], w = bk[2 * j + 1];
    if ((kx ^ w) == key && (w >> 56)) { *v = (int16_t)(w & 0xFFFF); *m = (int)((w >> 16) & 0x7FFF); *d = (i8)(w >> 32); *f = (int)((w >> 40) & 3); return 1; }
  }
  return 0;
}
static void ttSave(const Pos *p, int sv, int m, int d, int f) {
  const u64 key = (u64)p->h1 << 32 | p->h2; u64 *bk = &TTM[(p->h1 & ((1u << TTM_BITS) - 1)) * 8];
  int j = -1, q = 1 << 30;
  for (int i = 0; i < 4; i++) {
    u64 kx = bk[2 * i], w = bk[2 * i + 1];
    if ((kx ^ w) == key && (w >> 56)) { j = i; break; }
    int s = !(w >> 56) ? -1000 : (int)(i8)(w >> 32) - (((w >> 48) & 255) != ttAge ? 16 : 0);
    if (s < q) { q = s; j = i; }
  }
  u64 w = (u64)(uint16_t)(int16_t)sv | (u64)(m & 0x7FFF) << 16 | (u64)(u8)(i8)d << 32 | (u64)(f & 3) << 40 | (u64)ttAge << 48 | 1ull << 56;
  bk[2 * j + 1] = w; bk[2 * j] = key ^ w;
}
// every thread's last finished iteration on the current root: { key ^ x, x }, x = depth | value | move | in use — the main
// thread answers with the deepest one, and a helper that finishes the main thread's depth limit ends the search (gHit)
#define MT_SLOTS 64
static u64 gRes[MT_SLOTS][2];
static volatile u64 gGoalKey, gHit; static volatile int gGoal;
static TLS u64 rootK;
// (2026-11-10, after the Mac bench-all: same depth x1.5 with 4–14 threads although the nodes/s grew x4–x9.6) busy marks,
// Kerrigan's "simplified ABDADA". The threads walk the same tree in the same order at the same speed, so they search the
// same subtree at the same time and none gets the other's result from the table (a simulation where a thread's stores
// reach the others only after a while — true concurrency — gave x1.2 / x1.4 / x1.7 with 2 / 4 / 8 threads, as on the Mac;
// the earlier simulations let the threads take turns and so saw each other's finished subtrees). A thread marks the
// position of the move it searches (remaining depth >= BUSY_D, praline.h's busyOther / busySet / busyClear on busyK(p)).
#ifndef BUSY_D
#define BUSY_D 3
#endif
// (2026-11-11, Young Brothers Wait: see "split points" after quickStatus(); MODEL_CARD.md「マルチスレッド その3：YBW」)
// aborted 2 / 3 (Praline's stopFlag 2 / 3): praline.h. A split point carries the node's position (and the repetition
// history it looks at), and per move its late move reduction (as the one-thread loop).
typedef int Move;   // (a move is an int here)
#define SP_MV 256
#define SP_HK 64
#define PL_SP_FIELDS \
  i8 b[24], hand[3], cnt[3]; u32 bb[3]; int side, quiet; u32 h1, h2; int repLen, nrep; u32 rep[SP_HK];   /* the position */ \
  u8 red[SP_MV];                                                          /* the moves' late move reduction */
#include "../shared/praline/praline.h"
// the busy marks' key of a position: its slot from h2 (as before Praline), the rest of the key to compare
static inline u64 busyK(const Pos *p) { return (u64)p->h2 << 32 | p->h1; }
static void ybwCheck(void) {
  if (curSP && chainStopped(curSP, curIdx)) aborted = 2;
  else if (dupMode && gOpenN > 0 && dupLeave()) aborted = 3;
}
static void checkAbort(void) { if (now() > deadline || nodes > maxNodes || gStop || (threadId == 0 && rootK && gHit == rootK)) aborted = 1; else ybwCheck(); }
// (the split points (SPt, spAlloc, …): praline.h; the game's part of a split point:)
static void spFillPos(SPt *s, const Pos *p) {   // the owner: this node's position (and the repetition history it looks at)
  for (int i = 0; i < 24; i++) s->b[i] = p->b[i];
  for (int k = 0; k < 3; k++) { s->bb[k] = p->bb[k]; s->hand[k] = p->hand[k]; s->cnt[k] = p->cnt[k]; }
  s->side = p->side; s->quiet = p->quiet; s->h1 = p->h1; s->h2 = p->h2;
  s->repLen = repLen; s->nrep = repLen < SP_HK ? repLen : SP_HK;
  for (int i = 0; i < s->nrep; i++) s->rep[i] = rep[repLen - s->nrep + i];
}
// a thread joining s: its position (the stack of the quiet counts stays: play / undo above it are balanced)
static void spLoadPos(const SPt *s, int top, int fresh) {
  (void)top; (void)fresh;
  Pos *p = &P;
  for (int i = 0; i < 24; i++) p->b[i] = s->b[i];
  for (int k = 0; k < 3; k++) { p->bb[k] = s->bb[k]; p->hand[k] = s->hand[k]; p->cnt[k] = s->cnt[k]; }
  p->side = s->side; p->quiet = s->quiet; p->h1 = s->h1; p->h2 = s->h2;
  repLen = s->repLen;
  for (int i = 0; i < s->nrep; i++) rep[repLen - s->nrep + i] = s->rep[i];
}
#else
static void checkAbort(void) { if (now() > deadline || nodes > maxNodes) aborted = 1; }
#endif
static int isRep(const Pos *p) {
  u32 h = p->h1; int lim = repLen - p->quiet - 1; if (lim < 0) lim = 0;
  for (int i = repLen - 3; i >= lim; i -= 2) if (rep[i] == h) return 1;
  return 0;
}
static void order(const Pos *p, int *mv, int n, int ply, int ttm, int *sc) {
  int k0 = killer[ply * 2], k1 = killer[ply * 2 + 1], o = 3 - p->side;
  for (int i = 0; i < n; i++) {
    int m = mv[i], v;
    if (m == ttm) v = 1 << 29;
    else if (((m >> 10) & 31) != NONE) {
      int r = (m >> 10) & 31, thr = 0;
      for (int k = 0; k < prn[r]; k += 2) { int x = p->b[pr[r][k]], y = p->b[pr[r][k + 1]]; if ((x == o && !y) || (!x && y == o)) thr++; }
      v = (1 << 27) + thr * 1000 + adjn[r];
    } else if (m == k0 || m == k1) v = 1 << 26;
    else v = histT[(m & 31) * 32 + ((m >> 5) & 31)];
    sc[i] = v;
  }
}
static inline void pickBest(int *mv, int *sc, int i, int n) {
  int bi = i;
#ifdef __wasm_simd128__
  if (n - i >= 8) {   // (2026-11-11) the first of the highest scores (as the loop below): the maximum 4 at a time, then its first lane
    int j = i + 4; v128_t m = wasm_v128_load(sc + i);
    for (; j + 4 <= n; j += 4) m = wasm_i32x4_max(m, wasm_v128_load(sc + j));
    m = wasm_i32x4_max(m, wasm_i32x4_shuffle(m, m, 2, 3, 0, 1)); m = wasm_i32x4_max(m, wasm_i32x4_shuffle(m, m, 1, 0, 3, 2));
    int mx = wasm_i32x4_extract_lane(m, 0); for (; j < n; j++) if (sc[j] > mx) mx = sc[j];
    const v128_t vm = wasm_i32x4_splat(mx);
    for (j = i; j + 4 <= n; j += 4) { int b = wasm_i32x4_bitmask(wasm_i32x4_eq(wasm_v128_load(sc + j), vm)); if (b) break; }
    if (j + 4 <= n) j += __builtin_ctz(wasm_i32x4_bitmask(wasm_i32x4_eq(wasm_v128_load(sc + j), vm)));
    else while (sc[j] != mx) j++;
    bi = j;
  } else
#endif
  for (int j = i + 1; j < n; j++) if (sc[j] > sc[bi]) bi = j;
  int m = mv[bi]; mv[bi] = mv[i]; mv[i] = m; int t = sc[bi]; sc[bi] = sc[i]; sc[i] = t;
}
static int qsearch(Pos *p, int alpha, int beta, int ply, int qd) {
  nodes++;
  int s = p->side;
  if (p->cnt[s] + p->hand[s] < 3) return -(WIN - ply);
  if (egUse && egNM && !p->hand[1] && !p->hand[2]) { int dv = egProbe(p); if (dv >= 0) return egScore(p, dv, ply); }
  if (!anyMove(p)) return p->cnt[1] + p->cnt[2] == N ? 0 : -(WIN - ply);
  int best = evaluate(p);
  if (best >= beta || qd <= 0 || ply >= MAXPLY) return best;
  if (best > alpha) alpha = best;
  int *mv = buf[ply], k = genCaps(p, mv);   // (2026-11-11: after the stand-pat cut-off, which needs no moves)
  int *sc = scb[ply];
  order(p, mv, k, ply, -1, sc);
  for (int i = 0; i < k; i++) {
    pickBest(mv, sc, i, k); int m = mv[i];
    play(p, m); int v = -qsearch(p, -beta, -alpha, ply + 1, qd - 1); undo(p, m);
    if (v > best) { best = v; if (v > alpha) { alpha = v; if (v >= beta) break; } }
  }
  return best;
}
static int search(Pos *p, int depth, int alpha, int beta, int ply) {
  if (((long long)(++nodes) & 2047) == 0) checkAbort();
#ifdef MT
  if (((long long)nodes & 255) == 0 && (curSP || dupMode) && !aborted) ybwCheck();   // (YBW: a cut-off above, sooner)
#endif
  if (aborted) return 0;
  int s = p->side;
  if (p->cnt[s] + p->hand[s] < 3) return -(WIN - ply);
  if (ply > 0) {
    if (p->quiet >= QUIET_DRAW) return 0;
    if (p->quiet >= 4 && isRep(p)) return 0;
    int ma = -(WIN - ply), mb = WIN - ply - 1;
    if (ma > alpha) { alpha = ma; if (alpha >= beta) return alpha; }
    if (mb < beta) { beta = mb; if (alpha >= beta) return beta; }
    if (egUse && egNM && !p->hand[1] && !p->hand[2]) { int dv = egProbe(p); if (dv >= 0) return egScore(p, dv, ply); }
  }
  if (depth <= 0 || ply >= MAXPLY) return qsearch(p, alpha, beta, ply, 6);
#ifdef MT
  int ttm = -1;
  { int tm, tdd, tvv, tf;
    if (ttLoad(p, &tm, &tdd, &tvv, &tf)) {
      ttm = tm;
      if (ply > 0 && tdd >= depth) {
        int v = tvv; if (v > WINT) v -= ply; else if (v < -WINT) v += ply;
        if (tf == 0 || (tf == 1 && v >= beta) || (tf == 2 && v <= alpha)) return v;
      }
    } }
#else
  TTE *te = &TT[p->h1 & TT_MASK]; int ttm = -1;
  if (te->k1 == p->h1 && te->k2 == p->h2) {
    ttm = te->mv;
    if (ply > 0 && te->d >= depth) {
      int v = te->v; if (v > WINT) v -= ply; else if (v < -WINT) v += ply;
      int f = te->fl;
      if (f == 0 || (f == 1 && v >= beta) || (f == 2 && v <= alpha)) return v;
    }
  }
#endif
  int *mv = buf[ply], n = gen(p, mv);
  if (n == 0) return p->cnt[1] + p->cnt[2] == N ? 0 : -(WIN - ply);
  int *sc = scb[ply];
  order(p, mv, n, ply, ttm, sc);
  int a0 = alpha, best = -INF, bm = mv[0];
#ifdef MT
  // (2026-11-10) busy marks ("simplified ABDADA", see busyT): a move whose position another thread is searching right now
  // is put off until the other moves are done (by then its result is usually in the table)
  int defM[BUSY_DEF], defI[BUSY_DEF], nDef = 0, noSplit = 0;
  for (int k = 0; k < n + nDef; k++) {
    int i, m;
    // YBW: the first move is done and a helper is idle (or an owner above waits for its helpers): the remaining moves go to
    // a split point, in the order of this loop (the selection sort's, then the moves put off), each with its reduction
    if (k > 0 && k < n && !noSplit && depth >= splitD && (gIdle > 0 || (gWaitN > 0 && spWanted()))) {
      SPt *sp = spAlloc(); int ns = 0;
      if (sp) {
        for (int j = k; j < n + nDef; j++) {
          int ii, m2;
          if (j < n) { pickBest(mv, sc, j, n); m2 = mv[j]; ii = j; } else { m2 = defM[j - n]; ii = defI[j - n]; }
          if (ns == SP_MV) { ns = -1; break; }
          int R = 0;
#ifdef LMR
          if (depth >= LMR_D && ii >= LMR_I && ((m2 >> 10) & 31) == NONE && m2 != killer[ply * 2] && m2 != killer[ply * 2 + 1]) R = (ii >= LMR_I2 && depth >= 5) ? 2 : 1;
#endif
          sp->mv[ns] = m2; sp->red[ns] = (u8)R; ns++;
        }
      }
      if (ns >= 2) {
        spFillPos(sp, p);
        sp->n = ns; sp->depth = depth; sp->ply = ply; sp->root = 0; sp->beta = beta; sp->alpha = alpha;
        spRun(sp, &best, &bm, 0);
        if (aborted) return 0;
        if (best >= beta && ((bm >> 10) & 31) == NONE) {
          if (killer[ply * 2] != bm) { killer[ply * 2 + 1] = killer[ply * 2]; killer[ply * 2] = bm; }
          histT[(bm & 31) * 32 + ((bm >> 5) & 31)] += depth * depth;
        }
        break;
      }
      if (sp) spRelease(sp);
      noSplit = 1;   // (fewer than 2 moves left, or no free slot: on alone)
    }
    if (k < n) { pickBest(mv, sc, k, n); m = mv[k]; i = k; } else { m = defM[k - n]; i = defI[k - n]; }
    play(p, m); rep[repLen++] = p->h1;
    if (k < n && i > 0 && depth >= BUSY_D && nDef < BUSY_DEF && busyOther(busyK(p))) { repLen--; undo(p, m); defM[nDef] = m; defI[nDef++] = i; continue; }
    const int mk = depth >= BUSY_D ? busySet(busyK(p)) : -1;
    int v;
    if (i == 0) v = -search(p, depth - 1, -beta, -alpha, ply + 1);
    else {
      int R = 0;
#ifdef LMR
      if (depth >= LMR_D && i >= LMR_I && ((m >> 10) & 31) == NONE && m != killer[ply * 2] && m != killer[ply * 2 + 1]) R = (i >= LMR_I2 && depth >= 5) ? 2 : 1;
#endif
      v = -search(p, depth - 1 - R, -alpha - 1, -alpha, ply + 1);
      if (R && v > alpha && !aborted) v = -search(p, depth - 1, -alpha - 1, -alpha, ply + 1);
      if (v > alpha && v < beta && !aborted) v = -search(p, depth - 1, -beta, -alpha, ply + 1);
    }
    if (mk >= 0) busyClear(busyK(p), mk);
#else
  for (int i = 0; i < n; i++) {
    pickBest(mv, sc, i, n); int m = mv[i];
    play(p, m); rep[repLen++] = p->h1;
    int v;
    if (i == 0) v = -search(p, depth - 1, -beta, -alpha, ply + 1);
    else {
      int R = 0;
#ifdef LMR
      if (depth >= LMR_D && i >= LMR_I && ((m >> 10) & 31) == NONE && m != killer[ply * 2] && m != killer[ply * 2 + 1]) R = (i >= LMR_I2 && depth >= 5) ? 2 : 1;
#endif
      v = -search(p, depth - 1 - R, -alpha - 1, -alpha, ply + 1);
      if (R && v > alpha && !aborted) v = -search(p, depth - 1, -alpha - 1, -alpha, ply + 1);
      if (v > alpha && v < beta && !aborted) v = -search(p, depth - 1, -beta, -alpha, ply + 1);
    }
#endif
    repLen--; undo(p, m);
    if (aborted) return 0;
    if (v > best) {
      best = v; bm = m;
      if (v > alpha) {
        alpha = v;
        if (v >= beta) {
          if (((m >> 10) & 31) == NONE) {
            if (killer[ply * 2] != m) { killer[ply * 2 + 1] = killer[ply * 2]; killer[ply * 2] = m; }
            histT[(m & 31) * 32 + ((m >> 5) & 31)] += depth * depth;
          }
          break;
        }
      }
    }
  }
  int sv = best; if (sv > WINT) sv += ply; else if (sv < -WINT) sv -= ply;
#ifdef MT
  ttSave(p, sv, bm, depth, best >= beta ? 1 : best <= a0 ? 2 : 0);
#else
  te->k1 = p->h1; te->k2 = p->h2; te->v = (int16_t)sv; te->mv = bm; te->d = (i8)depth;
  te->fl = best >= beta ? 1 : best <= a0 ? 2 : 0;
#endif
  return best;
}
static int quickStatus(Pos *p, int ply) {   // returns INF+1 when the game goes on
  int s = p->side;
  if (p->cnt[s] + p->hand[s] < 3) return -(WIN - ply);
  if (p->quiet >= QUIET_DRAW) return 0;
  if (p->quiet >= 4) {
    int c = 0, lim = repLen - p->quiet - 1; if (lim < 0) lim = 0;
    for (int i = repLen - 3; i >= lim; i -= 2) if (rep[i] == p->h1) c++;
    if (c >= 2) return 0;
  }
  int n = gen(p, buf[ply]);
  if (n == 0) return p->cnt[1] + p->cnt[2] == N ? 0 : -(WIN - ply);
  return INF + 1;
}

#ifdef MT
// ---------------------------------------------------------------- split points: the game's glue for Praline (praline_ybw.h)
// (2026-11-11, Young Brothers Wait; the method of reversi/engine.c v4 / v4.1 and xiangqi/engine.c, MODEL_CARD.md「マルチスレッド
// その3：YBW」.) A helper copies the position of the split point (and the repetition history it looks at); the moves are
// searched with the one-thread loop's reductions, null window and re-search (and the busy marks). Praline's stopFlag is
// this engine's `aborted`.
#define stopFlag aborted
// the move i of s (the thread is at s's position) with the null window against a and the re-searches, as the one-thread loop
static int spSearch(SPt *s, int i, int a) {
  Pos *p = &P; const int m = s->mv[i], d = s->depth, ply = s->ply, b = s->beta;
  play(p, m); rep[repLen++] = p->h1;
  int v;
  if (s->root) {   // (as best(): a finished game, else the null window and the re-search with (alpha, INF))
    const int st = quickStatus(p, 1);
    if (st != INF + 1) v = -st;
    else {
      const int mk = d >= BUSY_D ? busySet(busyK(p)) : -1;
      v = -search(p, d - 1, -a - 1, -a, 1);
      if (v > a && !aborted) v = -search(p, d - 1, -INF, -a, 1);
      if (mk >= 0) busyClear(busyK(p), mk);
    }
  } else {
    const int mk = d >= BUSY_D ? busySet(busyK(p)) : -1, R = s->red[i];
    v = -search(p, d - 1 - R, -a - 1, -a, ply + 1);
    if (R && v > a && !aborted) v = -search(p, d - 1, -a - 1, -a, ply + 1);
    if (v > a && v < b && !aborted) v = -search(p, d - 1, -b, -a, ply + 1);
    if (mk >= 0) busyClear(busyK(p), mk);
  }
  repLen--; undo(p, m);
  return v;
}
// a cut-off by the move i of s (not the root): this thread's killers / history, as the one-thread cut-off (no capture)
static void spCutoff(const SPt *s, int i) {
  const int m = s->mv[i], ply = s->ply;
  if (((m >> 10) & 31) != NONE) return;
  if (killer[ply * 2] != m) { killer[ply * 2 + 1] = killer[ply * 2]; killer[ply * 2] = m; }
  histT[(m & 31) * 32 + ((m >> 5) & 31)] += s->depth * s->depth;
}
static inline int spTop(void) { return 0; }   // (no incremental evaluation to keep)
static void waitCheck(void) { SIM_IDLE(); checkAbort(); }
static void spIdleReset(int fresh) {   // mt_idle: a helper's search state (fresh: a new job: the history decays, the killers are cleared)
  nodes = 0; deadline = 1e300; maxNodes = 1e300; rootK = 0;
  if (fresh) {
    for (int i = 0; i < 32 * 32; i++) histT[i] >>= 2;
    for (int i = 0; i < (MAXPLY + 8) * 2; i++) killer[i] = -1;
  }
}
#include "../shared/praline/praline_ybw.h"
#undef stopFlag
#endif

// ---------------------------------------------------------------- host API
static TLS int rootMv[MAXMV], rootN;
static TLS int startQuiet;
EXPORT(setup) int setup(void) {
  // IO: b[N], hand1, hand2, side, quiet, nmoves, moves...
  int k = 0; Pos *p = &P;
  for (int i = 0; i < 24; i++) p->b[i] = 0;
  p->cnt[1] = p->cnt[2] = 0; p->bb[0] = p->bb[1] = p->bb[2] = 0;
  for (int i = 0; i < N; i++) { p->b[i] = (i8)IO[k++]; if (p->b[i]) { p->cnt[(int)p->b[i]]++; p->bb[(int)p->b[i]] |= 1u << i; } }
  p->hand[1] = (i8)IO[k++]; p->hand[2] = (i8)IO[k++]; p->side = IO[k++]; p->quiet = IO[k++]; p->sp = 0;
  rehash(p); repLen = 0; rep[repLen++] = p->h1;
  int nm = IO[k++];
  for (int i = 0; i < nm; i++) { play(p, IO[k++]); if (repLen < 4000) rep[repLen++] = p->h1; }
  p->sp = 0;
  rootN = gen(p, rootMv);
  return rootN;
}
EXPORT(new_game) void new_game(void) {
#ifdef MT
  for (unsigned i = 0; i < sizeof(TTM) / 8; i++) TTM[i] = 0;
  for (unsigned i = 0; i < (1u << BUSY_BITS); i++) busyT[i] = 0;
  ttAge = 0;
#else
  for (int i = 0; i < TT_SIZE; i++) { TT[i].k1 = 0; TT[i].k2 = 0; TT[i].d = 0; TT[i].fl = 0; }
#endif
  for (int i = 0; i < 32 * 32; i++) histT[i] = 0;
  for (int i = 0; i < (MAXPLY + 8) * 2; i++) killer[i] = -1;
}
static void limit(double ms, double mn) {
  nodes = 0; aborted = 0; deadline = ms > 0 ? now() + ms : 1e300; maxNodes = mn > 0 ? mn : 1e300;
#ifdef MT
  if (threadId == 0) ttAge++;   // (a new search: only the main thread ages the shared table)
#endif
}
// values of every root move at a fixed depth; IO out: n, (m, v)...
static int rootValues(int depth, int *mv, int n, int *out) {
  Pos *p = &P;
  for (int i = 0; i < n; i++) {
    int m = mv[i], v;
    play(p, m); rep[repLen++] = p->h1;
    int st = quickStatus(p, 1);
    if (st != INF + 1) v = -st; else v = -search(p, depth - 1, -INF, INF, 1);
    repLen--; undo(p, m);
    if (aborted) return 0;
    out[i] = v;
  }
  return 1;
}
// fixed-depth root values (used by the noisy levels): returns 1 when complete
EXPORT(root_values) int root_values(int depth) {
  int vals[MAXMV];
  if (!rootValues(depth, rootMv, rootN, vals)) return 0;
  IO[0] = rootN; for (int i = 0; i < rootN; i++) { IO[1 + 2 * i] = rootMv[i]; IO[2 + 2 * i] = vals[i]; }
  return 1;
}
EXPORT(set_limit) void set_limit(double ms, double mn) { limit(ms, mn); }
// iterative deepening best move; IO out: m, v, depth
EXPORT(best) void best(int maxDepth, double ms, double mn) {
  Pos *p = &P; limit(ms, mn);
  if (rootN == 1) { IO[0] = rootMv[0]; IO[1] = 0; IO[2] = 0; return; }
  int bestM = rootMv[0], bestV = 0, done = 0, ord[MAXMV];
#ifdef MT
  const u64 rk = ((u64)p->h1 << 32 | p->h2) ^ (u64)rootN << 20;
  if (threadId == 0) {   // a new search: forget the threads' results of the last one, set the depth goal
    for (int i = 0; i < MT_SLOTS; i++) { __atomic_store_n(&gRes[i][0], 0, __ATOMIC_SEQ_CST); __atomic_store_n(&gRes[i][1], 0, __ATOMIC_SEQ_CST); }
    gHit = 0; gGoal = maxDepth; gGoalKey = rk; rootK = rk;
  }
  // (helpers: every thread iterates 1, 2, 3, … like the main one. Tried 2026-11-09: Stockfish's pattern of skipped depths
  // per helper — slower to the main thread's depth in the simulation.)
  for (int d = 1; d <= maxDepth; d++) {
#else
  for (int d = 1; d <= maxDepth; d++) {
#endif
    int k = 0; ord[k++] = bestM; for (int i = 0; i < rootN; i++) if (rootMv[i] != bestM) ord[k++] = rootMv[i];
    int alpha = -INF, bm = bestM, bv = -INF;
#ifdef MT
    int rdM[BUSY_DEF], nrd = 0;   // (the busy marks at the root too: a root move another thread is on is put off)
    for (int k = 0; k < rootN + nrd; k++) {
      // YBW at the root: the first move is done, the others go to a split point
      if (k == 1 && rootN - 1 >= 2 && rootN - 1 <= SP_MV && d >= splitD && gIdle > 0) {
        SPt *sp = spAlloc();
        if (sp) {
          for (int j = 1; j < rootN; j++) { sp->mv[j - 1] = ord[j]; sp->red[j - 1] = 0; }
          spFillPos(sp, p);
          sp->n = rootN - 1; sp->depth = d; sp->ply = 0; sp->root = 1; sp->beta = INF; sp->alpha = alpha;
          spRun(sp, &bv, &bm, 0);
          break;
        }
      }
      int i = k < rootN ? k : 1, m = k < rootN ? ord[k] : rdM[k - rootN], v;
      play(p, m); rep[repLen++] = p->h1;
      int st = quickStatus(p, 1);
      if (k < rootN && i > 0 && st == INF + 1 && d >= BUSY_D && nrd < BUSY_DEF && busyOther(busyK(p))) { repLen--; undo(p, m); rdM[nrd++] = m; continue; }
      const int mk = st == INF + 1 && d >= BUSY_D ? busySet(busyK(p)) : -1;
      if (st != INF + 1) v = -st;
      else if (i == 0) v = -search(p, d - 1, -INF, INF, 1);
      else { v = -search(p, d - 1, -alpha - 1, -alpha, 1); if (v > alpha && !aborted) v = -search(p, d - 1, -INF, -alpha, 1); }
      if (mk >= 0) busyClear(busyK(p), mk);
#else
    for (int i = 0; i < rootN; i++) {
      int m = ord[i], v;
      play(p, m); rep[repLen++] = p->h1;
      int st = quickStatus(p, 1);
      if (st != INF + 1) v = -st;
      else if (i == 0) v = -search(p, d - 1, -INF, INF, 1);
      else { v = -search(p, d - 1, -alpha - 1, -alpha, 1); if (v > alpha && !aborted) v = -search(p, d - 1, -INF, -alpha, 1); }
#endif
      repLen--; undo(p, m);
      if (aborted) break;
      if (v > bv) { bv = v; bm = m; if (v > alpha) alpha = v; }
    }
    if (aborted) break;
    bestM = bm; bestV = bv; done = d;
#ifdef MT
    if (threadId < MT_SLOTS) {   // publish the finished iteration
      u64 x = (u64)(d & 255) | (u64)(uint16_t)(int16_t)bv << 8 | (u64)(bm & 0x7FFF) << 24 | 1ull << 40;
      __atomic_store_n(&gRes[threadId][1], x, __ATOMIC_SEQ_CST); __atomic_store_n(&gRes[threadId][0], rk ^ x, __ATOMIC_SEQ_CST);
      if (threadId && d >= gGoal && gGoalKey == rk) gHit = rk;
    }
#endif
    if (bv > WINT || bv < -WINT) break;
  }
#ifdef MT
  if (threadId == 0) {   // the deepest finished iteration of all the threads (the main thread's on a tie)
    int bt = -1, bdep = done;
    for (int i = 1; i < MT_SLOTS; i++) {
      u64 x = __atomic_load_n(&gRes[i][1], __ATOMIC_SEQ_CST), kx = __atomic_load_n(&gRes[i][0], __ATOMIC_SEQ_CST);
      if (!(x >> 40) || (kx ^ x) != rk) continue;
      int dd = (int)(x & 255); if (dd > bdep) { bdep = dd; bt = i; }
    }
    if (bt > 0) {
      u64 x = __atomic_load_n(&gRes[bt][1], __ATOMIC_SEQ_CST), kx = __atomic_load_n(&gRes[bt][0], __ATOMIC_SEQ_CST);
      int m = (int)((x >> 24) & 0x7FFF), ok = 0;
      for (int i = 0; i < rootN; i++) if (rootMv[i] == m) ok = 1;
      if ((kx ^ x) == rk && ok) { bestM = m; bestV = (int16_t)(uint16_t)(x >> 8); done = (int)(x & 255); }
    }
    gGoalKey = 0; gHit = 0; rootK = 0;
  }
#endif
  IO[0] = bestM; IO[1] = bestV; IO[2] = done;
#ifdef MT
  IO[3] = (i32)(nodes / 1000);   // (the nodes of this search, thousands: the helpers' counts, the page's nps)
#endif
}
// analysis: all root moves, iterative deepening until time runs out; IO out: n, depth, (m, v)...
EXPORT(analyze) void analyze(double ms, int maxDepth) {
  limit(ms, 0);
  double t0 = now();
  int mv[MAXMV], vals[MAXMV], last[MAXMV], n = rootN, depth = 0, have = 0;
  for (int i = 0; i < n; i++) mv[i] = rootMv[i];
  for (int d = 1; d <= maxDepth; d++) {
    if (have) {   // sort by the previous values (stable insertion sort, best first)
      for (int i = 1; i < n; i++) { int m = mv[i], v = last[i], j = i - 1; while (j >= 0 && last[j] < v) { mv[j + 1] = mv[j]; last[j + 1] = last[j]; j--; } mv[j + 1] = m; last[j + 1] = v; }
    }
    if (!rootValues(d, mv, n, vals)) break;
    for (int i = 0; i < n; i++) last[i] = vals[i];
    have = 1; depth = d;
    IO[0] = n; IO[1] = depth; for (int i = 0; i < n; i++) { IO[2 + 2 * i] = mv[i]; IO[3 + 2 * i] = vals[i]; }
    progress(d, n);
    int all = 1; for (int i = 0; i < n; i++) if (vals[i] <= WINT && vals[i] >= -WINT) { all = 0; break; }
    if (all) break;
    if (now() > deadline - ms * 0.45) break;
    (void)t0;
  }
  if (!have) { IO[0] = 0; IO[1] = 0; }
}

#ifdef MT
// ---------------------------------------------------------------- threads (engine_mt.wasm; shared/mtengine.js, mt-helper.js)
extern void __wasm_init_tls(void *);
EXPORT(mt_heap_base) u32 mt_heap_base(void) { return (u32)&__heap_base; }
EXPORT(mt_tls_size) u32 mt_tls_size(void) { return __builtin_wasm_tls_size(); }
// every instance first: mt_stack (its own stack: the top address; a function without a frame of its own), then mt_thread
EXPORT(mt_stack) void mt_stack(u32 stackTop) { __asm__ volatile(".globaltype __stack_pointer, i32\n local.get %0\n global.set __stack_pointer" :: "r"(stackTop)); }
// (the thread's own variables are set in a function of their own: in mt_thread itself the compiler reads the TLS base once,
// before __wasm_init_tls has moved it, and the stores would land in the old block)
static __attribute__((noinline)) void mtSelf(u32 tls, int id) {
  threadId = id;
  u32 a = (tls + __builtin_wasm_tls_size() + 63) & ~63u;   // (the stack grows down from the slot's top towards these)
  buf = (int (*)[MAXMV])a; a += sizeof(int) * (MAXPLY + 8) * MAXMV;
  scb = (int (*)[MAXMV])a; a += sizeof(int) * (MAXPLY + 8) * MAXMV;
#ifdef __wasm_simd128__
  npc = (NPC *)((a + 63) & ~63u); for (int i = 0; i < (1 << NPC_BITS); i++) npc[i].key = 0;
#endif
  for (int i = 0; i < (MAXPLY + 8) * 2; i++) killer[i] = -1;
}
EXPORT(mt_thread) void mt_thread(u32 tls, int id) { __wasm_init_tls((void *)tls); mtSelf(tls, id); }
EXPORT(mt_id) int mt_id(void) { return threadId; }
EXPORT(mt_stop) void mt_stop(int v) { __atomic_store_n(&gStop, v, __ATOMIC_SEQ_CST); }
EXPORT(last_nodes) double last_nodes(void) { return nodes; }   // (this thread's last search: the page's nps readout)
#else
EXPORT(last_nodes) double last_nodes(void) { return nodes; }   // (the last search: tools/check_wasm.js)
#endif
