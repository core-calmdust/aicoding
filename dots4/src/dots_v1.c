/*
 * Exact Dots & Boxes solver (boards up to 5x5 boxes / 60 edges), for WebAssembly and native builds.
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
#define TT_MAXBITS 23
static u64 tt_static[1u << TT_MAXBITS];
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
static u64 M; static u8 cnt[MAXB]; static i32 filled, n2, n3;

static inline int play(int e) {
  M |= 1ULL << e; int k = 0, b = eb0[e];
  if (b >= 0) { int c = ++cnt[b]; if (c == 2) n2++; else if (c == 3) { n2--; n3++; } else if (c == 4) { n3--; k++; } }
  b = eb1[e];
  if (b >= 0) { int c = ++cnt[b]; if (c == 2) n2++; else if (c == 3) { n2--; n3++; } else if (c == 4) { n3--; k++; } }
  filled += k; return k;
}
static inline void undo(int e) {
  M &= ~(1ULL << e); int b = eb0[e];
  if (b >= 0) { int c = cnt[b]--; if (c == 2) n2--; else if (c == 3) { n3--; n2++; } else if (c == 4) { filled--; n3++; } }
  b = eb1[e];
  if (b >= 0) { int c = cnt[b]--; if (c == 2) n2--; else if (c == 3) { n3--; n2++; } else if (c == 4) { filled--; n3++; } }
}
static inline int other(int e, int b) { return eb0[e] == b ? eb1[e] : eb0[e]; }
static inline int drawn(int e) { return (int)((M >> e) & 1); }
static inline int missing(int b, int not) { for (int i = b * 4; i < b * 4 + 4; i++) { int e = be[i]; if (!drawn(e) && e != not) return e; } return -1; }
static inline int gives(int e) { int k = 0, b = eb0[e]; if (b >= 0 && cnt[b] == 2) k++; b = eb1[e]; if (b >= 0 && cnt[b] == 2) k++; return k; }

static void set_pos(u64 m) {
  M = 0; filled = n2 = n3 = 0; for (int b = 0; b < B; b++) cnt[b] = 0;
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
  for (int s = 0; s < NS; s++) for (int e = 0; e < E; e++) invp[s][(int)perm[s][e]] = (i8)e;
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
static u64 canon(u64 m) {
  u64 best = ~0ULL; int bs = 0;
  for (int s = 0; s < NS; s++) { u64 x = corner_norm(apply_sym(s, m)); if (x < best) { best = x; bs = s; } }
  canon_sym = bs; return best;
}

/* ------------------------------------------------------------ transposition table */
static u64 *tt; static u64 ttmask; static i32 ttbits;
#define KEYMASK ((1ULL << 42) - 1)
static inline u64 ttidx(u64 key) { return ((key * 0x9E3779B97F4A7C15ULL) >> (64 - ttbits)) & ~3ULL; }
static inline u64 *tt_find(u64 key) {
  u64 *p = tt + ttidx(key);
  for (int i = 0; i < 4; i++) if (p[i] && (p[i] & KEYMASK) == key) return p + i;
  return 0;
}
#define E_LO(x) ((int)(((x) >> 42) & 63) - 32)
#define E_HI(x) ((int)(((x) >> 48) & 63) - 32)
#define E_MV(x) ((int)(((x) >> 54) & 63))
static inline int popc(u64 x) { return __builtin_popcountll(x); }
static void tt_store(u64 key, int lo, int hi, int mv) {
  u64 *p = tt + ttidx(key), *slot = 0;
  u64 ent = key | ((u64)(lo + 32) << 42) | ((u64)(hi + 32) << 48) | ((u64)(mv < 0 ? 63 : mv) << 54);
  for (int i = 0; i < 4; i++) if (p[i] && (p[i] & KEYMASK) == key) { p[i] = ent; return; }
  int worst = 1 << 30;
  for (int i = 0; i < 4; i++) {
    if (!p[i]) { slot = p + i; break; }
    int und = E - popc(p[i] & KEYMASK);
    if (und < worst) { worst = und; slot = p + i; }
  }
  *slot = ent;
}
EXPORT(tt_init) i32 tt_init(i32 bits) {
#ifdef __wasm__
  if (bits > TT_MAXBITS) bits = TT_MAXBITS;
  tt = tt_static;
#else
  static i32 have = 0;
  if (have != bits) { if (tt) free(tt); tt = (u64 *)malloc(sizeof(u64) << bits); have = bits; }
#endif
  ttbits = bits; ttmask = (1ULL << bits) - 1;
  memset(tt, 0, sizeof(u64) << bits);
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

/* ------------------------------------------------------------ search */
static double nodes, max_nodes; static double deadline; static i32 aborted;
static i32 use_loony = 1, use_prune = 1, use_tt = 1;
static void (*hook)(void);   /* native: periodic checkpoint hook */

static int gen_quiet(i8 *mv, int ttm) {
  u64 skip = use_prune ? redundant_mask() : 0;
  if (use_prune) for (int i = 0; i < ncorner; i++) if (!drawn(cpa[i])) skip |= 1ULL << cpb[i];
  int n = 0; i8 g1[MAXE], g2[MAXE]; int n1 = 0, n2_ = 0;
  if (ttm >= 0 && !drawn(ttm)) {
    /* a table move may be the skipped twin of a kept move: map it onto the kept one */
    if ((skip >> ttm) & 1) ttm = -1; else mv[n++] = (i8)ttm;
  }
  for (int i = 0; i < E; i++) {
    int e = order[i]; if (drawn(e) || ((skip >> e) & 1) || e == ttm) continue;
    int g = gives(e);
    if (!g) mv[n++] = (i8)e; else if (g == 1) g1[n1++] = (i8)e; else g2[n2_++] = (i8)e;
  }
  for (int i = 0; i < n1; i++) mv[n++] = g1[i];
  for (int i = 0; i < n2_; i++) mv[n++] = g2[i];
  return n;
}

static int search(int alpha, int beta) {
  nodes += 1;
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
    if (r < 0) { int e = -1 - r, k = play(e); int v = k + search(alpha - k, beta - k); undo(e); return v; }
    nm = r; iscap = 1;
  } else if (use_loony && n2 + filled == B) return loony_value();
  u64 key = 0, *ent = 0; int ttm = -1, s = 0;
  int alpha0 = alpha, beta0 = beta;
  if (use_tt) {
    key = canon(M); s = canon_sym;
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
  else if (ttm >= 0) { for (int i = 1; i < nm; i++) if (mv[i] == ttm) { mv[i] = mv[0]; mv[0] = (i8)ttm; break; } }
  int best = -100, bm = -1;
  for (int i = 0; i < nm; i++) {
    int e = mv[i], k = play(e);
    int v = k > 0 ? k + search(alpha - k, beta - k) : -search(-beta, -alpha);
    undo(e);
    if (aborted) return 0;
    if (v > best) { best = v; bm = e; }
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
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
  u64 m = io_mask(); i8 mv[MAXE]; int n = root_moves(m, mv), first = io[2];
  if (first >= 0) for (int i = 1; i < n; i++) if (mv[i] == first) { mv[i] = mv[0]; mv[0] = (i8)first; break; }
  set_pos(m); int rem = B - filled, alpha = -rem - 1, bv = -100, bmv = mv[0];
  io[4] = -1; io[5] = 0;
  for (int i = 0; i < n; i++) {
    int v;
    if (i > 0) { v = move_value(m, mv[i], alpha, alpha + 1); if (v != -999 && v > alpha) v = move_value(m, mv[i], alpha, rem + 1); }
    else v = move_value(m, mv[i], alpha, rem + 1);
    if (v == -999) return -999;
    if (v > bv) { bv = v; bmv = mv[i]; io[4] = bmv; io[5] = bv; }
    if (v > alpha) alpha = v;
  }
  io[3] = bmv; return bv;
}
EXPORT(w_setup) void w_setup(i32 r, i32 c, i32 bits) { setup(r, c); tt_init(bits); }
EXPORT(w_clear) void w_clear(void) { tt_init(ttbits); }
EXPORT(w_nodes) double w_nodes(void) { return nodes; }
#endif
