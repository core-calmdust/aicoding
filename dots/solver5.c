/*
 * Exact Dots & Boxes solver for 5x5 (wide 64-bit table keys; boards up to 63 edges), for WebAssembly and native builds.
 * Negamax alpha-beta on "net boxes still to come for the player to move" with
 *  - Berlekamp's capture rules (capture all, or all-but-two / all-but-four handouts),
 *  - exact values of simple loony endgames (only chains and loops left),
 *  - redundant-move pruning (openings of isolated chains/loops, the two outer edges of a corner box),
 *  - a transposition table with lower/upper bounds keyed by the canonical position
 *    (8 board symmetries and corner-edge equivalence), independent of the score so far,
 *  - move ordering: table move, safe moves from the centre outwards, then sacrifices.
 * Edge numbering matches engine.js: horizontal edges first ((R+1)*C, row-major), then vertical (R*(C+1)).
 *
 * Copyright 2026 core-calmdust — Apache License 2.0
 */
typedef unsigned long long u64;
typedef unsigned int u32;
typedef int i32;
typedef signed char i8;
typedef unsigned char u8;

#ifdef __wasm__
#define EXPORT(name) __attribute__((export_name(#name)))
#define IMPORT(name) __attribute__((import_module("env"), import_name(#name)))
IMPORT(now) double js_now(void);
void *memset(void *d, int c, unsigned long n) { u8 *p = d; while (n--) *p++ = (u8)c; return d; }
void *memcpy(void *d, const void *s, unsigned long n) { u8 *p = d; const u8 *q = s; while (n--) *p++ = *q++; return d; }
void *memmove(void *d, const void *s, unsigned long n) { u8 *p = d; const u8 *q = s; if (p < q) while (n--) *p++ = *q++; else { p += n; q += n; while (n--) *--p = *--q; } return d; }
#define TT_MAXBITS 23
#else
#define EXPORT(name)
#include <string.h>
#include <stdlib.h>
#include <time.h>
static double js_now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec * 1000.0 + t.tv_nsec / 1e6; }
#endif

#define MAXE 64
#define MAXB 32
static i32 R, C, E, B, HN, NS;
static i8 eb0[MAXE], eb1[MAXE], be[MAXB * 4];
static i8 perm[8][MAXE], invp[8][MAXE], twin[MAXE];
static u64 symtab[8][8][256];
static i32 ncorner; static i8 cpa[4], cpb[4];   /* the two outer edges of each corner box (cpa < cpb) */
static i8 order[MAXE];

/* position */
static u64 M, MS[8]; static u8 cnt[MAXB];
static u64 pbit[8][MAXE]; static i32 filled, n2, n3;

static inline int play(int e) {
  M |= 1ULL << e; for (int s = 0; s < NS; s++) MS[s] |= pbit[s][e]; int k = 0, b = eb0[e];
  if (b >= 0) { int c = ++cnt[b]; if (c == 2) n2++; else if (c == 3) { n2--; n3++; } else if (c == 4) { n3--; k++; } }
  b = eb1[e];
  if (b >= 0) { int c = ++cnt[b]; if (c == 2) n2++; else if (c == 3) { n2--; n3++; } else if (c == 4) { n3--; k++; } }
  filled += k; return k;
}
static inline void undo(int e) {
  M &= ~(1ULL << e); for (int s = 0; s < NS; s++) MS[s] &= ~pbit[s][e]; int b = eb0[e];
  if (b >= 0) { int c = cnt[b]--; if (c == 2) n2--; else if (c == 3) { n3--; n2++; } else if (c == 4) { filled--; n3++; } }
  b = eb1[e];
  if (b >= 0) { int c = cnt[b]--; if (c == 2) n2--; else if (c == 3) { n3--; n2++; } else if (c == 4) { filled--; n3++; } }
}
static inline int other(int e, int b) { return eb0[e] == b ? eb1[e] : eb0[e]; }
static inline int drawn(int e) { return (int)((M >> e) & 1); }
static inline int missing(int b, int not) { for (int i = b * 4; i < b * 4 + 4; i++) { int e = be[i]; if (!drawn(e) && e != not) return e; } return -1; }
static inline int gives(int e) { int k = 0, b = eb0[e]; if (b >= 0 && cnt[b] == 2) k++; b = eb1[e]; if (b >= 0 && cnt[b] == 2) k++; return k; }

static void set_pos(u64 m) {
  M = 0; for (int s = 0; s < 8; s++) MS[s] = 0; filled = n2 = n3 = 0; for (int b = 0; b < B; b++) cnt[b] = 0;
  for (int e = 0; e < E; e++) if ((m >> e) & 1) play(e);
}

/* ------------------------------------------------------------ geometry */
static int dotkey(int r1, int c1, int r2, int c2) { if (r1 > r2 || (r1 == r2 && c1 > c2)) { int t = r1; r1 = r2; r2 = t; t = c1; c1 = c2; c2 = t; } return ((r1 * 8 + c1) * 64 + r2 * 8 + c2); }
static int edge_of(int r1, int c1, int r2, int c2) {
  int k = dotkey(r1, c1, r2, c2);
  for (int e = 0; e < E; e++) {
    int a, b, c, d;
    if (e < HN) { a = e / C; b = e % C; c = a; d = b + 1; } else { int f = e - HN; a = f / (C + 1); b = f % (C + 1); c = a + 1; d = b; }
    if (dotkey(a, b, c, d) == k) return e;
  }
  return -1;
}
EXPORT(setup) void setup(i32 r, i32 c) {
  R = r; C = c; HN = (R + 1) * C; E = HN + R * (C + 1); B = R * C;
  for (int e = 0; e < E; e++) eb0[e] = eb1[e] = -1;
  for (int rr = 0; rr <= R; rr++) for (int cc = 0; cc < C; cc++) {
    int e = rr * C + cc;
    if (rr > 0) { int b = (rr - 1) * C + cc; if (eb0[e] < 0) eb0[e] = b; else eb1[e] = b; }
    if (rr < R) { int b = rr * C + cc; if (eb0[e] < 0) eb0[e] = b; else eb1[e] = b; }
  }
  for (int rr = 0; rr < R; rr++) for (int cc = 0; cc <= C; cc++) {
    int e = HN + rr * (C + 1) + cc;
    if (cc > 0) { int b = rr * C + cc - 1; if (eb0[e] < 0) eb0[e] = b; else eb1[e] = b; }
    if (cc < C) { int b = rr * C + cc; if (eb0[e] < 0) eb0[e] = b; else eb1[e] = b; }
  }
  for (int rr = 0; rr < R; rr++) for (int cc = 0; cc < C; cc++) {
    int b = rr * C + cc;
    be[b * 4] = rr * C + cc; be[b * 4 + 1] = (rr + 1) * C + cc; be[b * 4 + 2] = HN + rr * (C + 1) + cc; be[b * 4 + 3] = HN + rr * (C + 1) + cc + 1;
  }
  /* symmetries (same order as engine.js) */
  NS = R == C ? 8 : 4;
  for (int s = 0; s < NS; s++) for (int e = 0; e < E; e++) {
    int a, b, c, d;
    if (e < HN) { a = e / C; b = e % C; c = a; d = b + 1; } else { int f = e - HN; a = f / (C + 1); b = f % (C + 1); c = a + 1; d = b; }
    int pr[2][2], in[2][2] = { { a, b }, { c, d } };
    for (int i = 0; i < 2; i++) {
      int y = in[i][0], x = in[i][1], n = R, m = C, oy, ox;
      if (R == C) switch (s) {
        case 0: oy = y; ox = x; break; case 1: oy = x; ox = n - y; break; case 2: oy = n - y; ox = n - x; break; case 3: oy = n - x; ox = y; break;
        case 4: oy = y; ox = n - x; break; case 5: oy = n - y; ox = x; break; case 6: oy = x; ox = y; break; default: oy = n - x; ox = n - y;
      } else switch (s) {
        case 0: oy = y; ox = x; break; case 1: oy = n - y; ox = m - x; break; case 2: oy = y; ox = m - x; break; default: oy = n - y; ox = x;
      }
      pr[i][0] = oy; pr[i][1] = ox;
    }
    perm[s][e] = (i8)edge_of(pr[0][0], pr[0][1], pr[1][0], pr[1][1]);
  }
  for (int s = 0; s < NS; s++) for (int e = 0; e < E; e++) { invp[s][(int)perm[s][e]] = (i8)e; pbit[s][e] = 1ULL << perm[s][e]; }
  for (int s = 0; s < NS; s++) for (int byte = 0; byte < 8; byte++) for (int v = 0; v < 256; v++) {
    u64 x = 0; for (int j = 0; j < 8; j++) if ((v >> j) & 1) { int e = byte * 8 + j; if (e < E) x |= 1ULL << perm[s][e]; }
    symtab[s][byte][v] = x;
  }
  /* corner boxes: two border edges */
  ncorner = 0;
  for (int b = 0; b < B; b++) {
    int k = 0, ed[4];
    for (int i = 0; i < 4; i++) { int e = be[b * 4 + i]; if (eb1[e] < 0) ed[k++] = e; }
    if (k == 2) { cpa[ncorner] = (i8)(ed[0] < ed[1] ? ed[0] : ed[1]); cpb[ncorner] = (i8)(ed[0] < ed[1] ? ed[1] : ed[0]); ncorner++; }
    /* a 1-wide board has boxes with 3 border edges; corner equivalence is only used when every box has <= 2 */
    if (k > 2) { ncorner = 0; break; }
  }
  for (int e = 0; e < E; e++) twin[e] = -1;
  for (int i = 0; i < ncorner; i++) { twin[(int)cpa[i]] = cpb[i]; twin[(int)cpb[i]] = cpa[i]; }
  /* centre-out move order */
  double dd[MAXE];
  for (int e = 0; e < E; e++) {
    double y, x;
    if (e < HN) { y = e / C; x = e % C + 0.5; } else { int f = e - HN; y = f / (C + 1) + 0.5; x = f % (C + 1); }
    dd[e] = (y - R / 2.0) * (y - R / 2.0) + (x - C / 2.0) * (x - C / 2.0) + e * 1e-6;
    order[e] = (i8)e;
  }
  for (int i = 1; i < E; i++) { int t = order[i], j = i - 1; while (j >= 0 && dd[order[j]] > dd[t]) { order[j + 1] = order[j]; j--; } order[j + 1] = (i8)t; }
}

static inline u64 apply_sym(int s, u64 m) {
  u64 x = 0; for (int byte = 0; byte * 8 < E; byte++) x |= symtab[s][byte][(m >> (byte * 8)) & 255];
  return x;
}
static inline u64 corner_norm(u64 x) {
  for (int i = 0; i < ncorner; i++) { u64 a = 1ULL << cpa[i], b = 1ULL << cpb[i]; if ((x & b) && !(x & a)) x ^= a | b; }
  return x;
}
static int canon_sym;
static inline u64 canon_cur(void) {   /* canonical key of the current position */
  u64 best = ~0ULL; int bs = 0;
  for (int s = 0; s < NS; s++) { u64 x = corner_norm(MS[s]); if (x < best) { best = x; bs = s; } }
  canon_sym = bs; return best;
}
static inline u64 canon_child(int e) {   /* canonical key after drawing e (no state change) */
  u64 best = ~0ULL;
  for (int s = 0; s < NS; s++) { u64 x = corner_norm(MS[s] | pbit[s][e]); if (x < best) best = x; }
  return best;
}
static u64 canon(u64 m) {
  u64 best = ~0ULL; int bs = 0;
  for (int s = 0; s < NS; s++) { u64 x = corner_norm(apply_sym(s, m)); if (x < best) { best = x; bs = s; } }
  canon_sym = bs; return best;
}

/* ------------------------------------------------------------ transposition table (wide keys: up to 63 edges) */
typedef struct { u64 k, d; } tent;
static tent *tt; static u64 ttmask; static i32 ttbits;
#define KEYMASK (~0ULL)
#define KMARK (1ULL << 63)
static inline u64 ttidx(u64 key) { return ((key * 0x9E3779B97F4A7C15ULL) >> (64 - ttbits)) & ~3ULL; }
static inline u64 *tt_find(u64 key) {
  tent *p = tt + ttidx(key);
  for (int i = 0; i < 4; i++) if (p[i].k == (key | KMARK)) return &p[i].d;
  return 0;
}
#define E_LO(x) ((int)(((x) >> 42) & 63) - 32)
#define E_HI(x) ((int)(((x) >> 48) & 63) - 32)
#define E_MV(x) ((int)(((x) >> 54) & 63))
static inline int popc(u64 x) { return __builtin_popcountll(x); }
static void tt_store(u64 key, int lo, int hi, int mv) {
  tent *p = tt + ttidx(key), *slot = 0;
  u64 ent = ((u64)(lo + 32) << 42) | ((u64)(hi + 32) << 48) | ((u64)(mv < 0 ? 63 : mv) << 54);
  for (int i = 0; i < 4; i++) if (p[i].k == (key | KMARK)) { p[i].d = ent; return; }
  int worst = 1 << 30;
  for (int i = 0; i < 4; i++) {
    if (!p[i].k) { slot = p + i; break; }
    int und = E - popc(p[i].k & ~KMARK);
    if (und < worst) { worst = und; slot = p + i; }
  }
  slot->k = key | KMARK; slot->d = ent;
}
EXPORT(tt_init) i32 tt_init(i32 bits) {
#ifdef __wasm__
  /* the table lives above the static data; memory grows on first use to the largest size asked for */
  static unsigned long have = 0, base = 0;
  if (bits > TT_MAXBITS) bits = TT_MAXBITS;
  unsigned long need = sizeof(tent) << bits;
  if (need > have) {
    unsigned long cur = __builtin_wasm_memory_size(0) * 65536ul;
    if (!base) base = cur;
    if (base + need > cur && __builtin_wasm_memory_grow(0, (base + need - cur + 65535) / 65536) == (unsigned long)-1) {
      while (bits > 16 && base + (sizeof(tent) << bits) > cur) bits--;   /* could not grow: smaller table */
      need = sizeof(tent) << bits;
    }
    if (need > have) have = need;
  }
  tt = (tent *)base;
#else
  static i32 have = 0;
  if (have != bits) { if (tt) free(tt); tt = (tent *)malloc(sizeof(tent) << bits); have = bits; }
#endif
  ttbits = bits; ttmask = (1ULL << bits) - 1;
  memset(tt, 0, sizeof(tent) << bits);
  return bits;
}

/* ------------------------------------------------------------ simple loony endgames */
#define LM_BITS 16
static u64 lm_k1[1 << LM_BITS], lm_k2[1 << LM_BITS]; static i8 lm_v[1 << LM_BITS]; static u8 lm_used[1 << LM_BITS];
/* items: chain n -> code n (1..31), loop n -> code 32+n; sorted ascending */
static int loony_rec(u8 *it, int n) {
  if (!n) return 0;
  u64 k1 = 0, k2 = 0;
  for (int i = 0; i < n; i++) { if (i < 9) k1 = k1 * 64 + it[i] + 1; else k2 = k2 * 64 + it[i] + 1; }
  u64 h = (k1 * 0x9E3779B97F4A7C15ULL) ^ (k2 * 0xC2B2AE3D27D4EB4FULL); h = (h >> 40) & ((1 << LM_BITS) - 1);
  if (lm_used[h] && lm_k1[h] == k1 && lm_k2[h] == k2) return lm_v[h];
  u8 rest[MAXB]; int best = -1000;
  for (int i = 0; i < n; i++) {
    if (i > 0 && it[i] == it[i - 1]) continue;
    int c = 0; for (int j = 0; j < n; j++) if (j != i) rest[c++] = it[j];
    int v = loony_rec(rest, n - 1), x = it[i], val;
    if (x < 32) val = x <= 2 ? -x - v : (-x - v < 4 - x + v ? -x - v : 4 - x + v);
    else { x -= 32; val = -x - v < 8 - x + v ? -x - v : 8 - x + v; }
    if (val > best) best = val;
  }
  lm_used[h] = 1; lm_k1[h] = k1; lm_k2[h] = k2; lm_v[h] = (i8)best;
  return best;
}
static int loony_value(void) {
  u8 it[MAXB]; int n = 0; u32 seen = 0;
  for (int b0 = 0; b0 < B; b0++) {
    if (cnt[b0] == 4 || ((seen >> b0) & 1)) continue;
    int st[MAXB], sp = 0, nb = 0, inner = 0; st[sp++] = b0; seen |= 1u << b0;
    while (sp) {
      int b = st[--sp]; nb++;
      for (int i = b * 4; i < b * 4 + 4; i++) {
        int e = be[i]; if (drawn(e)) continue;
        int o = other(e, b); if (o < 0) continue;
        if (o > b) inner++;
        if (!((seen >> o) & 1)) { seen |= 1u << o; st[sp++] = o; }
      }
    }
    it[n++] = (u8)(inner == nb ? 32 + nb : nb);
  }
  for (int i = 1; i < n; i++) { u8 t = it[i]; int j = i - 1; while (j >= 0 && it[j] > t) { it[j + 1] = it[j]; j--; } it[j + 1] = t; }
  return loony_rec(it, n);
}

/* ------------------------------------------------------------ capture analysis (as captureMoves in engine.js) */
/* returns -1 - forced edge, or the number of options written to out (captures first, then declines) */
static int capture_moves(i8 *out) {
  int nm = 0, nd = 0; i8 dec[MAXB];
  for (int b = 0; b < B; b++) {
    if (cnt[b] != 3) continue;
    int e = missing(b, -1), N = other(e, b);
    if (N < 0 || cnt[N] != 2) return -1 - e;
    int len = 2, prev = e, cur = N, firstF = -1, closed = 0;
    for (;;) {
      int f = missing(cur, prev);
      if (firstF < 0) firstF = f;
      int nx = other(f, cur);
      if (nx < 0 || cnt[nx] <= 1) break;
      if (cnt[nx] == 3) { closed = 1; len++; break; }
      len++; prev = f; cur = nx;
      if (len > 64) break;
    }
    if (!closed ? len >= 3 : len != 4) return -1 - e;
    int dup = 0; for (int i = 0; i < nm; i++) if (out[i] == e) dup = 1;
    if (!dup) out[nm++] = (i8)e;
    dup = 0; for (int i = 0; i < nd; i++) if (dec[i] == firstF) dup = 1;
    if (!dup) dec[nd++] = (i8)firstF;
  }
  for (int i = 0; i < nd; i++) out[nm + i] = dec[i];
  return nm + nd;
}

/* ------------------------------------------------------------ redundant openings of isolated chains / loops */
static u64 redundant_mask(void) {
  u64 skip = 0; u32 seen = 0, keys = 0; u64 keys2 = 0;
  for (int b0 = 0; b0 < B; b0++) {
    if (cnt[b0] != 2 || ((seen >> b0) & 1)) continue;
    int list[MAXB], lo = 0, hi = 0, simple = 1, inner = 0;
    list[hi++] = b0; seen |= 1u << b0;
    while (lo < hi) {
      int b = list[lo++]; if (cnt[b] != 2) simple = 0;
      for (int i = b * 4; i < b * 4 + 4; i++) {
        int e = be[i]; if (drawn(e)) continue;
        int o = other(e, b); if (o < 0) continue;
        if (o > b) inner++;
        if (!((seen >> o) & 1)) { seen |= 1u << o; list[hi++] = o; }
      }
    }
    if (!simple) continue;
    int n = hi, loop = inner == n, keep1 = -1, keep2 = -1;
    int fresh;
    if (loop) { fresh = !((keys2 >> n) & 1); keys2 |= 1ULL << n; } else { fresh = !((keys >> n) & 1); keys |= 1u << n; }
    if (fresh) {
      int a = list[0];
      if (!loop && n == 2) {
        int bb = list[1];
        for (int i = a * 4; i < a * 4 + 4; i++) { int e = be[i]; if (drawn(e)) continue; if (other(e, a) == bb) keep1 = e; else if (keep2 < 0) keep2 = e; }
      } else {
        for (int i = a * 4; i < a * 4 + 4; i++) { int e = be[i]; if (!drawn(e)) { keep1 = e; break; } }
      }
    }
    for (int j = 0; j < n; j++) {
      int b = list[j];
      for (int i = b * 4; i < b * 4 + 4; i++) { int e = be[i]; if (!drawn(e) && e != keep1 && e != keep2) skip |= 1ULL << e; }
    }
  }
  return skip;
}

/* Generalised: every chain of 2-sided boxes (also when it ends at junction boxes) is opened equivalently at any of its
   edges, except a 2-chain (middle edge = hard-hearted handout vs an end edge). Isolated loops: one edge; identical
   isolated chains/loops (ground at both ends): one representative. */
static i32 use_chain_prune = 1;
static u64 chain_skip(void) {
  u64 skip = 0; u32 seen = 0, ikeys = 0; u64 lkeys = 0;
  for (int b0 = 0; b0 < B; b0++) {
    if (cnt[b0] != 2 || ((seen >> b0) & 1)) continue;
    /* walk the chain containing b0 in both directions */
    int boxes[MAXB], nb = 0; i8 eds[MAXB + 2]; int ne = 0;
    seen |= 1u << b0; boxes[nb++] = b0;
    int ends[2], endtype[2], loop = 0;   /* endtype: 0 ground, 1 junction box */
    int first[2], k = 0;
    for (int i = b0 * 4; i < b0 * 4 + 4; i++) if (!drawn(be[i])) first[k++] = be[i];
    for (int dir = 0; dir < 2 && !loop; dir++) {
      int e = first[dir], cur = b0;
      for (;;) {
        int o = other(e, cur);
        int dupe = 0; for (int j = 0; j < ne; j++) if (eds[j] == e) dupe = 1;
        if (!dupe) eds[ne++] = (i8)e;
        if (o < 0) { ends[dir] = -1; endtype[dir] = 0; break; }
        if (cnt[o] != 2) { ends[dir] = o; endtype[dir] = 1; break; }
        if (o == b0) { loop = 1; break; }
        if ((seen >> o) & 1) { loop = 1; break; }
        seen |= 1u << o; boxes[nb++] = o;
        int f = -1; for (int i = o * 4; i < o * 4 + 4; i++) { int g = be[i]; if (!drawn(g) && g != e) { f = g; break; } }
        e = f; cur = o;
      }
    }
    int keep1 = -1, keep2 = -1;
    if (loop) {   /* an isolated loop of 2-sided boxes */
      if (!((lkeys >> nb) & 1)) { lkeys |= 1ULL << nb; keep1 = eds[0]; }
    } else {
      int isolated = endtype[0] == 0 && endtype[1] == 0;
      int fresh = 1;
      if (isolated) { fresh = !((ikeys >> nb) & 1); ikeys |= 1u << nb; }
      if (fresh) {
        if (nb == 2) {   /* middle edge (between the two boxes) and one end edge */
          for (int j = 0; j < ne; j++) { int e = eds[j]; if (eb0[e] >= 0 && eb1[e] >= 0 && cnt[eb0[e]] == 2 && cnt[eb1[e]] == 2) keep1 = e; else if (keep2 < 0) keep2 = e; }
        } else keep1 = eds[0];
      }
    }
    for (int j = 0; j < ne; j++) { int e = eds[j]; if (e != keep1 && e != keep2) skip |= 1ULL << e; }
  }
  return skip;
}

/* ------------------------------------------------------------ search */
static double nodes, max_nodes; static double deadline; static i32 aborted;
static i32 use_loony = 1, use_prune = 1, use_tt = 1, use_pvs = 1, use_hist = 0;
static u32 hist[MAXE];
static i32 etc_min = 0, use_killer = 0, ord_mode = 0;
static i8 killer[MAXE + 1];
static void (*hook)(void);   /* native: periodic checkpoint hook */

static int gen_quiet(i8 *mv, int ttm) {
  u64 skip = use_prune ? (use_chain_prune ? chain_skip() : redundant_mask()) : 0;
  if (use_prune) for (int i = 0; i < ncorner; i++) if (!drawn(cpa[i])) skip |= 1ULL << cpb[i];
  int n = 0; i8 g1[MAXE], g2[MAXE]; int n1 = 0, n2_ = 0;
  if (ttm >= 0 && !drawn(ttm)) {
    /* a table move may be the skipped twin of a kept move: map it onto the kept one */
    if ((skip >> ttm) & 1) ttm = -1; else mv[n++] = (i8)ttm;
  }
  int kl = -1;
  if (use_killer) { kl = killer[E - popc(M)]; if (kl >= 0 && (drawn(kl) || ((skip >> kl) & 1) || kl == ttm)) kl = -1; if (kl >= 0) mv[n++] = (i8)kl; }
  for (int i = 0; i < E; i++) {
    int e = order[i]; if (drawn(e) || ((skip >> e) & 1) || e == ttm || e == kl) continue;
    int g = gives(e);
    if (!g) mv[n++] = (i8)e; else if (g == 1) g1[n1++] = (i8)e; else g2[n2_++] = (i8)e;
  }
  if (use_hist) {   /* safe moves by history score (stable, so the centre-out order breaks ties) */
    int s0 = (ttm >= 0) ? 1 : 0;
    for (int i = s0 + 1; i < n; i++) { i8 t = mv[i]; u32 h = hist[(int)t]; int j = i - 1; while (j >= s0 && hist[(int)mv[j]] < h) { mv[j + 1] = mv[j]; j--; } mv[j + 1] = t; }
  }
  if (ord_mode == 1) {   /* 1-box sacrifices first */
    int s0 = n; i8 tmp[MAXE]; int t = 0; int h = (ttm >= 0) + (kl >= 0);
    for (int i = h; i < s0; i++) tmp[t++] = mv[i];
    n = h; for (int i = 0; i < n1; i++) mv[n++] = g1[i]; for (int i = 0; i < t; i++) mv[n++] = tmp[i];
  } else for (int i = 0; i < n1; i++) mv[n++] = g1[i];
  for (int i = 0; i < n2_; i++) mv[n++] = g2[i];
  return n;
}

#ifdef PROFILE
static double prof_und[MAXE+1], prof_safe[MAXE+1], prof_cap, prof_loony, prof_cut[16], prof_cutsac, prof_all, prof_allsac;
#endif
static int search(int alpha, int beta) {
  nodes += 1;
#ifdef PROFILE
  { int u = E - popc(M); prof_und[u]++; if (n3) prof_cap++; else if (n2 + filled == B) prof_loony++; else { int sc = 0; for (int e = 0; e < E; e++) if (!drawn(e) && !gives(e)) sc++; prof_safe[sc]++; } }
#endif
  if (aborted) return 0;
  if (((u64)nodes & 0xFFFF) == 0) {
    if (nodes > max_nodes || js_now() > deadline) { aborted = 1; return 0; }
    if (hook) hook();
  }
  int rem = B - filled;
  if (rem == 0) return 0;
  if (alpha >= rem) return rem;
  if (beta <= -rem) return -rem;
  i8 mv[MAXE]; int nm = 0, iscap = 0;
  if (n3 > 0) {
    int r = capture_moves(mv);
    if (r < 0) {   /* forced captures: take them all here */
      i8 st[MAXB]; int ns = 0, got = 0;
      while (r < 0) { int e = -1 - r; st[ns++] = (i8)e; got += play(e); if (!n3) break; r = capture_moves(mv); }
      int v = got + search(alpha - got, beta - got);
      while (ns) undo(st[--ns]);
      return v;
    }
    nm = r; iscap = 1;
  } else if (use_loony && n2 + filled == B) return loony_value();
  u64 key = 0, *ent = 0; int ttm = -1, s = 0;
  int alpha0 = alpha, beta0 = beta;
  if (use_tt) {
    key = canon_cur(); s = canon_sym;
    ent = tt_find(key);
    if (ent) {
      u64 x = *ent; int lo = E_LO(x), hi = E_HI(x);
      if (lo == hi) return lo;
      if (lo >= beta) return lo;
      if (hi <= alpha) return hi;
      if (lo > alpha) alpha = lo;
      if (hi < beta) beta = hi;
      int cm = E_MV(x);
      if (cm != 63) {   /* map back from the canonical frame (corner normalisation may have swapped the twin) */
        ttm = invp[s][cm];
        if (drawn(ttm)) ttm = twin[ttm] >= 0 && !drawn(twin[ttm]) ? twin[ttm] : -1;
      }
    }
  }
  if (!iscap) nm = gen_quiet(mv, ttm);
  if (use_tt && etc_min > 0 && E - popc(M) >= etc_min) {   /* enhanced transposition cutoff */
    for (int i = 0; i < nm; i++) {
      int e = mv[i]; if (gives(e)) continue;   /* only quiet children (no captures, the opponent moves next) */
      int k = 0; { int b = eb0[e]; if (b >= 0 && cnt[b] == 3) k++; b = eb1[e]; if (b >= 0 && cnt[b] == 3) k++; }
      if (k) continue;
      u64 *ce = tt_find(canon_child(e));
      if (ce) { int chi = E_HI(*ce); if (-chi >= beta) return -chi; }
    }
  }
  if (iscap && ttm >= 0) { for (int i = 1; i < nm; i++) if (mv[i] == ttm) { mv[i] = mv[0]; mv[0] = (i8)ttm; break; } }
  int best = -100, bm = -1;
  for (int i = 0; i < nm; i++) {
    int e = mv[i], k = play(e), v;
    if (i == 0 || !use_pvs || beta - alpha <= 1) v = k > 0 ? k + search(alpha - k, beta - k) : -search(-beta, -alpha);
    else {
      v = k > 0 ? k + search(alpha - k, alpha + 1 - k) : -search(-alpha - 1, -alpha);
      if (!aborted && v > alpha && v < beta) v = k > 0 ? k + search(alpha - k, beta - k) : -search(-beta, -alpha);
    }
    undo(e);
    if (aborted) return 0;
    if (v > best) { best = v; bm = e; }
    if (v > alpha) alpha = v;
#ifdef PROFILE
    if (alpha >= beta) { prof_cut[i < 15 ? i : 15]++; if (!iscap && gives(e)) prof_cutsac++; }
#endif
    if (alpha >= beta) { if (!iscap) { int u = E - popc(M); if (use_hist) hist[e] += (u32)(u * u); killer[u] = (i8)e; } break; }
  }
  if (use_tt) {
    int lo = -31, hi = 31;
    ent = tt_find(key);
    if (ent) { lo = E_LO(*ent); hi = E_HI(*ent); }
    if (best <= alpha0) { if (best < hi) hi = best; }
    else if (best >= beta0) { if (best > lo) lo = best; }
    else { lo = hi = best; }
    if (lo > hi) lo = hi = best;
    tt_store(key, lo, hi, bm >= 0 ? perm[s][bm] : -1);
  }
  return best;
}

/* ------------------------------------------------------------ API */
static void limits(double maxn, double ms) { nodes = 0; aborted = 0; max_nodes = maxn > 0 ? maxn : 1e300; deadline = ms > 0 ? js_now() + ms : 1e300; }
/* value of position m for the player to move, within (alpha, beta); aborted -> -999 */
static int value_of(u64 m, int alpha, int beta) {
  set_pos(m);
  int v = search(alpha, beta);
  return aborted ? -999 : v;
}
/* value of drawing edge e in position m (mover's view) within (alpha, beta) */
static int move_value(u64 m, int e, int alpha, int beta) {
  set_pos(m);
  int k = play(e);
  int v = k > 0 ? k + search(alpha - k, beta - k) : -search(-beta, -alpha);
  return aborted ? -999 : v;
}
/* root moves (as the search would try them, redundant twins removed) */
static int root_moves(u64 m, i8 *mv) {
  set_pos(m);
  if (n3 > 0) { int r = capture_moves(mv); if (r < 0) { mv[0] = (i8)(-1 - r); return 1; } return r; }
  return gen_quiet(mv, -1);
}

/* table move of position m (in the current frame) or -1 */
static int tt_move(u64 m) {
  set_pos(m); u64 key = canon_cur(); int s = canon_sym; u64 *ent = tt_find(key);
  if (!ent || E_MV(*ent) == 63) return -1;
  int t = invp[s][E_MV(*ent)];
  if (drawn(t)) t = twin[t] >= 0 && !drawn(twin[t]) ? twin[t] : -1;
  return t;
}
/* exact best move of position m: first move with a full window, the others with null windows first.
   Returns the value (or -999 if cut off; *pbm / *pbv then hold the best move proven so far, or -1). */
static int best_from(u64 m, int lower, int first, int *bm, int *pbm, int *pbv);
static int best_of(u64 m, int first, int *bm, int *pbm, int *pbv) { return best_from(m, -100, first, bm, pbm, pbv); }
/* lower > -100: the value is known to be >= lower (moves below it only need to be refuted) */
static int best_from(u64 m, int lower, int first, int *bm, int *pbm, int *pbv) {
  i8 mv[MAXE]; int n = root_moves(m, mv);
  if (first < 0) first = tt_move(m);
  if (first >= 0) for (int i = 1; i < n; i++) if (mv[i] == first) { mv[i] = mv[0]; mv[0] = (i8)first; break; }
  set_pos(m); int rem = B - filled, alpha = lower > -100 ? lower - 1 : -rem - 1, bv = -100, bmv = mv[0];
  *pbm = -1; *pbv = 0; *bm = -1;
  if (lower > -100) {   /* first secure a move that keeps the bound (null windows are cheap), then improve on it */
    for (int i = 0; i < n; i++) {
      int v = move_value(m, mv[i], lower - 1, lower);
      if (v == -999) return -999;
      if (v >= lower) { *pbm = mv[i]; *pbv = lower; if (i) { i8 t = mv[i]; for (int j = i; j > 0; j--) mv[j] = mv[j - 1]; mv[0] = t; } break; }
    }
    if (*pbm < 0) lower = -100, alpha = -rem - 1;   /* the bound was wrong: plain search */
  }
  for (int i = 0; i < n; i++) {
    int v;
    if (i > 0) { v = move_value(m, mv[i], alpha, alpha + 1); if (v != -999 && v > alpha) v = move_value(m, mv[i], alpha, rem + 1); }
    else v = move_value(m, mv[i], alpha, rem + 1);
    if (v == -999) return -999;
    if (v > alpha) { bv = v; bmv = mv[i]; *pbm = bmv; *pbv = bv; alpha = v; }   /* exact (beats everything so far) */
    else if (*pbm < 0 && v > bv) { bv = v; bmv = mv[i]; }                        /* all below the bound so far: upper bounds only */
  }
  *bm = bmv; return bv;
}

#ifdef __wasm__
static i32 io[256];
EXPORT(io_ptr) i32 *io_ptr(void) { return io; }
static u64 io_mask(void) { return (u64)(u32)io[0] | ((u64)(u32)io[1] << 32); }
/* io[0..1] = mask. Returns the value (or -999 if cut off). */
EXPORT(w_value) i32 w_value(i32 alpha, i32 beta, double ms) { limits(0, ms); return value_of(io_mask(), alpha, beta); }
EXPORT(w_move_value) i32 w_move_value(i32 e, i32 alpha, i32 beta, double ms) { limits(0, ms); return move_value(io_mask(), e, alpha, beta); }
/* root moves into io[8..] ; returns count */
EXPORT(w_root_moves) i32 w_root_moves(void) { i8 mv[MAXE]; int n = root_moves(io_mask(), mv); for (int i = 0; i < n; i++) io[8 + i] = mv[i]; return n; }
/* best move by root alpha-beta (null windows after the first move). io[2] = move to try first (-1 none).
   Returns value, best move in io[3]; -999 if cut off (io[4] = best move proven so far or -1, io[5] its value). */
EXPORT(w_best) i32 w_best(double ms) {
  limits(0, ms);
  int bm, pbm, pbv, v = best_of(io_mask(), io[2], &bm, &pbm, &pbv);
  io[3] = bm; io[4] = pbm; io[5] = pbv; return v;
}
EXPORT(w_setup) void w_setup(i32 r, i32 c, i32 bits) { setup(r, c); tt_init(bits); }
/* best move with a known lower bound (io[6], -100 = none); io[2] first move. Same outputs as w_best. */
EXPORT(w_best_from) i32 w_best_from(double ms) {
  limits(0, ms);
  int bm, pbm, pbv, v = best_from(io_mask(), io[6], io[2], &bm, &pbm, &pbv);
  io[3] = bm; io[4] = pbm; io[5] = pbv; return v;
}
/* canonical key of io[0..1] with edge e added (e < 0: as is), into io[6..7] */
EXPORT(w_canon) void w_canon(i32 e) { u64 m = io_mask(); if (e >= 0) m |= 1ULL << e; u64 k = canon(m); io[6] = (i32)(u32)k; io[7] = (i32)(u32)(k >> 32); }
/* table entry of io[0..1]: returns 0 if none, else 1 with io[3] = move (current frame) or -1, io[4] = lo, io[5] = hi */
EXPORT(w_tt_probe) i32 w_tt_probe(void) {
  u64 m = io_mask(); set_pos(m); u64 key = canon_cur(); int s = canon_sym; u64 *ent = tt_find(key);
  if (!ent) return 0;
  int t = E_MV(*ent) == 63 ? -1 : invp[s][E_MV(*ent)];
  if (t >= 0 && drawn(t)) t = twin[t] >= 0 && !drawn(twin[t]) ? twin[t] : -1;
  io[3] = t; io[4] = E_LO(*ent); io[5] = E_HI(*ent); return 1;
}
EXPORT(w_clear) void w_clear(void) { tt_init(ttbits); }
EXPORT(w_nodes) double w_nodes(void) { return nodes; }
#endif
