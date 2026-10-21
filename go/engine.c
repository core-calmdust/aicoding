/* Go engine for the browser: rules, KataGo-style input features (incl. ladders),
 * a small nested-bottleneck ResNet (vibego nets distilled from KataGo), and PUCT MCTS.
 *
 * Built two ways:
 *   wasm  : clang --target=wasm32 -nostdlib ... (see tools/build.sh)
 *   native: gcc -DNATIVE tools/native.c (testing / self-play / calibration)
 *
 * Coordinates: pos = y*19 + x (x,y < n), always on a 19x19 tensor with the board in the
 * top-left corner (that is how the nets were trained for every board size). PASS = 361.
 */
#ifdef NATIVE
#include <math.h>
#include <string.h>
#include <stdlib.h>
#define SQRTF sqrtf
#define EXPF expf
#define LOGF logf
#define TANHF tanhf
#define EXPORT
#else
#define EXPORT __attribute__((visibility("default")))
typedef unsigned long size_t;
void *memset(void *d, int c, size_t n) { unsigned char *p = d; while (n--) *p++ = (unsigned char)c; return d; }
void *memcpy(void *d, const void *s, size_t n) { unsigned char *p = d; const unsigned char *q = s; while (n--) *p++ = *q++; return d; }
#define SQRTF __builtin_sqrtf
static float EXPF(float x) {
  if (x < -87.f) return 0.f;
  if (x > 88.f) x = 88.f;
  float k = __builtin_floorf(x * 1.44269504f + 0.5f);
  float r = x - k * 0.693147181f;
  float p = 1.f + r * (1.f + r * (0.5f + r * (0.166666667f + r * (0.0416666667f + r * (0.00833333333f + r * 0.00138888889f)))));
  union { float f; int i; } u; u.i = ((int)k + 127) << 23;
  return p * u.f;
}
static float LOGF(float x) {
  union { float f; int i; } u; u.f = x;
  float e = (float)(((u.i >> 23) & 255) - 127);
  u.i = (u.i & 0x7fffff) | 0x3f800000;
  float m = u.f, t = (m - 1.f) / (m + 1.f), t2 = t * t;
  return e * 0.693147181f + 2.f * t * (1.f + t2 * (0.333333333f + t2 * (0.2f + t2 * (0.142857143f + t2 * 0.111111111f))));
}
static float TANHF(float x) { if (x > 9.f) return 1.f; if (x < -9.f) return -1.f; float e = EXPF(2.f * x); return (e - 1.f) / (e + 1.f); }
#endif

typedef unsigned char u8;
typedef signed char i8;
typedef unsigned short u16;
typedef unsigned int u32;

#define PL 19
#define NP 361
#define PASS 361
#define EMPTY 0
#define BLACK 1
#define WHITE 2
#define OPP(c) (3 - (c))

/* ======================================================================== */
/* Board                                                                    */
/* ======================================================================== */
typedef struct {
  u8 n;              /* board size */
  u8 tomove;
  short ko;          /* simple ko point or -1 */
  u8 st[NP];
  short hmv[5];      /* last moves, [0] most recent; pos or PASS, -1 none */
  u8 hpl[5];         /* their players */
  short caps[3];     /* stones captured BY colour */
} Board;

static short NB[NP][4];
static u8 NNB[NP];
static int curN = 0;

static void nb_init(int n) {
  if (curN == n) return;
  curN = n;
  for (int y = 0; y < PL; y++)
    for (int x = 0; x < PL; x++) {
      int p = y * PL + x, k = 0;
      if (x < n && y < n) {
        if (x > 0) NB[p][k++] = p - 1;
        if (x < n - 1) NB[p][k++] = p + 1;
        if (y > 0) NB[p][k++] = p - PL;
        if (y < n - 1) NB[p][k++] = p + PL;
      }
      NNB[p] = k;
    }
}

static int mark[NP], markGen = 1;
static short gstk[NP], gstones[NP];

/* flood fill group at p; fills gstones (count returned), libs count into *nl,
 * first liberties into libs[] (up to maxl). */
static int group_info(const Board *b, int p, int *nl, short *libs, int maxl) {
  int c = b->st[p], ns = 0, sp = 0, L = 0;
  markGen += 2; if (markGen > 2000000000) { memset(mark, 0, sizeof mark); markGen = 2; }
  int gm = markGen, lm = markGen + 1;
  gstk[sp++] = p; mark[p] = gm;
  while (sp) {
    int q = gstk[--sp];
    gstones[ns++] = q;
    for (int k = 0; k < NNB[q]; k++) {
      int r = NB[q][k];
      if (b->st[r] == EMPTY) {
        if (mark[r] != lm) { mark[r] = lm; if (L < maxl) libs[L] = r; L++; }
      } else if (b->st[r] == c && mark[r] != gm) { mark[r] = gm; gstk[sp++] = r; }
    }
  }
  *nl = L;
  return ns;
}

static int libs_of(const Board *b, int p) { int nl; group_info(b, p, &nl, 0, 0); return nl; }

/* legality: empty, not ko, not suicide */
static int is_legal(const Board *b, int pl, int p) {
  if (p == PASS) return 1;
  if (p < 0 || p >= NP || b->st[p] != EMPTY || p == b->ko) return 0;
  int x = p % PL, y = p / PL;
  if (x >= b->n || y >= b->n) return 0;
  Board *bb = (Board *)b;
  for (int k = 0; k < NNB[p]; k++) { if (b->st[NB[p][k]] == EMPTY) return 1; }
  bb->st[p] = pl;
  int ok = 0;
  for (int k = 0; k < NNB[p] && !ok; k++) {
    int r = NB[p][k];
    if (b->st[r] == OPP(pl) && libs_of(b, r) == 0) ok = 1;
  }
  if (!ok) ok = libs_of(b, p) > 0;
  bb->st[p] = EMPTY;
  return ok;
}

static void push_hist(Board *b, int pl, int p) {
  for (int i = 4; i > 0; i--) { b->hmv[i] = b->hmv[i - 1]; b->hpl[i] = b->hpl[i - 1]; }
  b->hmv[0] = p; b->hpl[0] = pl;
}

/* play without legality check (caller ensures). returns #captured */
static int play(Board *b, int pl, int p) {
  if (p == PASS) { b->ko = -1; push_hist(b, pl, PASS); b->tomove = OPP(pl); return 0; }
  b->st[p] = pl;
  int cap = 0, capPos = -1;
  for (int k = 0; k < NNB[p]; k++) {
    int r = NB[p][k];
    if (b->st[r] == OPP(pl)) {
      int nl, ns = group_info(b, r, &nl, 0, 0);
      if (nl == 0) {
        for (int i = 0; i < ns; i++) b->st[gstones[i]] = EMPTY;
        cap += ns; capPos = r;
      }
    }
  }
  b->ko = -1;
  if (cap == 1) {
    int nl, ns = group_info(b, p, &nl, 0, 0);
    if (ns == 1 && nl == 1) b->ko = capPos;
  }
  b->caps[pl] += cap;
  push_hist(b, pl, p);
  b->tomove = OPP(pl);
  return cap;
}

static void board_clear(Board *b, int n) {
  memset(b, 0, sizeof *b);
  b->n = n; b->tomove = BLACK; b->ko = -1;
  for (int i = 0; i < 5; i++) { b->hmv[i] = -1; b->hpl[i] = 0; }
  nb_init(n);
}

/* ---- ladders (port of KataGo's python reference, as in vibego) ---- */
static int lad_nodes;
static int ladder(Board *b, int lp, int def, int defToMove, int depth);

static int ladder_captured(const Board *b0, int p, int defFirst) {
  if (b0->st[p] == EMPTY) return 0;
  int nl = libs_of(b0, p);
  if (nl > 2 || (defFirst && nl > 1)) return 0;
  Board b = *b0;
  if (defFirst) b.ko = -1;
  lad_nodes = 0;
  return ladder(&b, p, b0->st[p], defFirst, 0);
}

static int ladder(Board *b, int lp, int def, int defToMove, int depth) {
  if (b->st[lp] != def) return 1;
  if (++lad_nodes > 3000 || depth > 200) return 0;
  int att = OPP(def);
  short libs[4]; int nl;
  group_info(b, lp, &nl, libs, 4);
  if (defToMove) {
    if (nl >= 2) return 0;
    if (b->ko >= 0) return 0;
    /* candidate moves: captures of adjacent enemy groups in atari, then the liberty */
    short moves[64]; int nm = 0;
    short stones[NP]; int ns = group_info(b, lp, &nl, libs, 4);
    for (int i = 0; i < ns; i++) stones[i] = gstones[i];
    static int seenGen = 0; static int seen[NP];
    seenGen++;
    for (int i = 0; i < ns && nm < 60; i++) {
      int q = stones[i];
      for (int k = 0; k < NNB[q]; k++) {
        int r = NB[q][k];
        if (b->st[r] == att && seen[r] != seenGen) {
          int enl; short el[2];
          int ens = group_info(b, r, &enl, el, 2);
          for (int j = 0; j < ens; j++) seen[gstones[j]] = seenGen;
          if (enl == 1) {
            int dup = 0;
            for (int j = 0; j < nm; j++) if (moves[j] == el[0]) dup = 1;
            if (!dup) moves[nm++] = el[0];
          }
        }
      }
    }
    group_info(b, lp, &nl, libs, 4);
    { int dup = 0; for (int j = 0; j < nm; j++) if (moves[j] == libs[0]) dup = 1; if (!dup) moves[nm++] = libs[0]; }
    for (int i = 0; i < nm; i++) {
      if (!is_legal(b, def, moves[i])) continue;
      Board nb = *b;
      play(&nb, def, moves[i]);
      if (!ladder(&nb, lp, def, 0, depth + 1)) return 0;
    }
    return 1;
  }
  if (nl <= 1) return 1;
  if (nl >= 3) return 0;
  int m0 = libs[0], m1 = libs[1];
  int moves[2] = {m0, m1}, nm = 2;
  int adj = 0;
  for (int k = 0; k < NNB[m0]; k++) if (NB[m0][k] == m1) adj = 1;
  if (!adj) {
    int l0 = 0, l1 = 0;
    for (int k = 0; k < NNB[m0]; k++) if (b->st[NB[m0][k]] == EMPTY) l0++;
    for (int k = 0; k < NNB[m1]; k++) if (b->st[NB[m1][k]] == EMPTY) l1++;
    if (l0 >= 3 && l1 >= 3) return 0;
    else if (l0 >= 3) { nm = 1; }
    else if (l1 >= 3) { moves[0] = m1; nm = 1; }
  }
  for (int i = 0; i < nm; i++) {
    if (!is_legal(b, att, moves[i])) continue;
    Board nb = *b;
    play(&nb, att, moves[i]);
    if (ladder(&nb, lp, def, 1, depth + 1)) return 1;
  }
  return 0;
}

/* ======================================================================== */
/* Network                                                                  */
/* ======================================================================== */
#define W2 22
#define PP 484                 /* padded plane 22x22 (row/col 0 and 20,21 are padding) */
#define IOFF(p) (((p) / PL + 1) * W2 + ((p) % PL) + 1)
#define NSP 14

typedef float v4 __attribute__((vector_size(16)));
typedef float v4u __attribute__((vector_size(16), aligned(4)));
typedef int i4 __attribute__((vector_size(16)));

typedef struct { float *s, *b; } BN;
typedef struct { int cin, cout, k, cop; float *w, *U; } Conv; /* w packed: [cout/4][cin][k*k][4]; U winograd [36][cin][cop] */

typedef struct {
  int kind; /* 0 nbt, 1 gpool */
  BN bn_in, n1b1, n1b2, n2b1, n2b2, bn_out; Conv cin, n1c1, n1c2, n2c1, n2c2, cout;
  BN bn1, bnp, bn2; Conv creg, cpool, c2; float *fcw, *fcb; /* fc: [C][2gc] */
} Block;

static struct {
  int ok, C, B, hc, gc, bc;
  Conv stem; float *gfw, *gfb; float *emb; /* [K][C] */
  Block blk[16];
  BN trunk;
  float *pcw; BN pbn; float *pow_, pob, *ppw, ppb;
  float *vcw; BN vbn; float *v1w, *v1b, *vvw, *vvb, *vsw, vsb;
  float *ocw; BN obn; float *oow, oob;
} net;

static u16 canon3[19683];
static int canonK = 0;
static float mask[PP];

/* simple bump allocator inside the module's memory */
static unsigned char *heapTop = 0;
#ifndef NATIVE
extern unsigned char __heap_base;
#endif
static void *halloc(int n) {
#ifdef NATIVE
  return calloc(1, n + 16);
#else
  if (!heapTop) heapTop = &__heap_base;
  unsigned long a = ((unsigned long)heapTop + 15) & ~15UL;
  unsigned long need = a + n;
  unsigned long have = __builtin_wasm_memory_size(0) * 65536UL;
  if (need > have) {
    if (__builtin_wasm_memory_grow(0, (need - have + 65535) / 65536) < 0) return 0;
  }
  heapTop = (unsigned char *)need;
  return (void *)a;
#endif
}
EXPORT void *galloc(int n) { return halloc(n); }

static float h2f(u16 h) {
  u32 s = (h >> 15) & 1, e = (h >> 10) & 31, m = h & 1023, f;
  if (e == 0) { if (!m) f = s << 31; else { e = 1; while (!(m & 1024)) { m <<= 1; e--; } m &= 1023; f = (s << 31) | ((e + 112) << 23) | (m << 13); } }
  else if (e == 31) f = (s << 31) | 0x7f800000 | (m << 13);
  else f = (s << 31) | ((e + 112) << 23) | (m << 13);
  union { u32 i; float f; } u; u.i = f; return u.f;
}

static const u8 *rd; static int quant;
static void align4(void) { while ((unsigned long)rd & 3) rd++; }
static float *rdf(int n, int big, int rows) {
  float *o = halloc(n * 4);
  if (quant && big) {
    const float *sc = (const float *)rd; rd += rows * 4;
    const i8 *q = (const i8 *)rd; int per = n / rows;
    for (int r = 0; r < rows; r++) for (int i = 0; i < per; i++) o[r * per + i] = sc[r] * q[r * per + i];
    rd += n;
  } else {
    const u16 *h = (const u16 *)rd;
    for (int i = 0; i < n; i++) o[i] = h2f(h[i]);
    rd += n * 2;
  }
  align4();
  return o;
}
static BN rdbn(int c) { BN b; b.s = rdf(c, 0, 0); b.b = rdf(c, 0, 0); return b; }
static int useWino = 1;
static int maxCin = 0, maxCop = 0;
static Conv rdconv(int cout, int cin, int k) {
  Conv c; c.cin = cin; c.cout = cout; c.k = k; c.U = 0;
  int kk = k * k, cb = (cout + 3) / 4;
  float *raw = rdf(cout * cin * kk, 1, cout);
  c.cop = (cout + 7) & ~7;
  if (k == 3 && useWino) {
    /* winograd F(4x4,3x3): U = G g G^T */
    static const float G[6][3] = {{0.25f, 0, 0}, {-1.f / 6, -1.f / 6, -1.f / 6}, {-1.f / 6, 1.f / 6, -1.f / 6}, {1.f / 24, 1.f / 12, 1.f / 6}, {1.f / 24, -1.f / 12, 1.f / 6}, {0, 0, 1}};
    c.U = halloc(36 * cin * c.cop * 4);
    for (int o = 0; o < cout; o++)
      for (int i = 0; i < cin; i++) {
        const float *g = raw + (o * cin + i) * 9;
        float t[6][3];
        for (int a = 0; a < 6; a++) for (int b = 0; b < 3; b++) t[a][b] = G[a][0] * g[0 * 3 + b] + G[a][1] * g[1 * 3 + b] + G[a][2] * g[2 * 3 + b];
        for (int a = 0; a < 6; a++) for (int b = 0; b < 6; b++)
          c.U[((a * 6 + b) * cin + i) * c.cop + o] = t[a][0] * G[b][0] + t[a][1] * G[b][1] + t[a][2] * G[b][2];
      }
    if (cin > maxCin) maxCin = cin;
    if (c.cop > maxCop) maxCop = c.cop;
    c.w = 0;
    return c;
  }
  c.w = halloc(cb * cin * kk * 4 * 4);
  for (int o = 0; o < cout; o++)
    for (int i = 0; i < cin; i++)
      for (int t = 0; t < kk; t++)
        c.w[(((o / 4) * cin + i) * kk + t) * 4 + (o & 3)] = raw[(o * cin + i) * kk + t];
  return c;
}

static void canon_init(void) {
  int perms[8][9];
  for (int t = 0; t < 8; t++)
    for (int i = 0; i < 9; i++) {
      int r = i / 3, c = i % 3, rr, cc;
      switch (t) {
        case 0: rr = r; cc = c; break;
        case 1: rr = c; cc = 2 - r; break;
        case 2: rr = 2 - r; cc = 2 - c; break;
        case 3: rr = 2 - c; cc = r; break;
        case 4: rr = r; cc = 2 - c; break;
        case 5: rr = 2 - r; cc = c; break;
        case 6: rr = c; cc = r; break;
        default: rr = 2 - c; cc = 2 - r; break;
      }
      perms[t][rr * 3 + cc] = i;
    }
  static int raw[19683]; static u8 used[19683];
  memset(used, 0, sizeof used);
  for (int id = 0; id < 19683; id++) {
    int d[9], v = id;
    for (int i = 0; i < 9; i++) { d[i] = v % 3; v /= 3; }
    int best = id;
    for (int t = 0; t < 8; t++) {
      int s = 0, p3 = 1;
      for (int j = 0; j < 9; j++) { s += d[perms[t][j]] * p3; p3 *= 3; }
      if (s < best) best = s;
    }
    raw[id] = best; used[best] = 1;
  }
  static u16 rank[19683]; int k = 0;
  for (int i = 0; i < 19683; i++) if (used[i]) rank[i] = k++;
  for (int i = 0; i < 19683; i++) canon3[i] = rank[raw[i]];
  canonK = k;
}

EXPORT int net_load(const u8 *buf, int len) {
  (void)len;
  rd = buf;
  if (rd[0] != 'G' || rd[1] != 'O' || rd[2] != 'N' || rd[3] != 'N') return -1;
  const u32 *h = (const u32 *)(rd + 4);
  if (h[0] != 2) return -2;
  int C = h[1], B = h[2], hc = h[3], gc = h[4];
  quant = h[5];
  rd += 28;
  const u8 *kinds = rd; rd += B; align4();
  canon_init();
  for (int p = 0; p < PP; p++) mask[p] = 0;
  for (int p = 0; p < NP; p++) mask[IOFF(p)] = 1;
  net.C = C; net.B = B; net.hc = hc; net.gc = gc; net.bc = C / 2;
  int bc = C / 2;
  net.stem = rdconv(C, NSP, 3);
  net.gfw = rdf(C * 2, 0, 0); net.gfb = rdf(C, 0, 0);
  net.emb = rdf(canonK * C, 1, canonK);
  for (int i = 0; i < B; i++) {
    Block *k = &net.blk[i];
    k->kind = kinds[i];
    if (k->kind == 0) {
      k->bn_in = rdbn(C); k->cin = rdconv(bc, C, 1);
      k->n1b1 = rdbn(bc); k->n1c1 = rdconv(bc, bc, 3); k->n1b2 = rdbn(bc); k->n1c2 = rdconv(bc, bc, 3);
      k->n2b1 = rdbn(bc); k->n2c1 = rdconv(bc, bc, 3); k->n2b2 = rdbn(bc); k->n2c2 = rdconv(bc, bc, 3);
      k->bn_out = rdbn(bc); k->cout = rdconv(C, bc, 1);
    } else {
      k->bn1 = rdbn(C); k->creg = rdconv(C, C, 3); k->cpool = rdconv(gc, C, 3);
      k->bnp = rdbn(gc);
      k->fcw = rdf(C * 2 * gc, 0, 0); k->fcb = rdf(C, 0, 0);
      k->bn2 = rdbn(C); k->c2 = rdconv(C, C, 3);
    }
  }
  net.trunk = rdbn(C);
  net.pcw = rdf(hc * C, 0, 0); net.pbn = rdbn(hc); net.pow_ = rdf(hc, 0, 0); { float *t = rdf(1, 0, 0); net.pob = t[0]; }
  net.ppw = rdf(2 * hc, 0, 0); { float *t = rdf(1, 0, 0); net.ppb = t[0]; }
  net.vcw = rdf(hc * C, 0, 0); net.vbn = rdbn(hc);
  net.v1w = rdf(hc * 2 * hc, 0, 0); net.v1b = rdf(hc, 0, 0);
  net.vvw = rdf(3 * hc, 0, 0); net.vvb = rdf(3, 0, 0);
  net.vsw = rdf(hc, 0, 0); { float *t = rdf(1, 0, 0); net.vsb = t[0]; }
  net.ocw = rdf(hc * C, 0, 0); net.obn = rdbn(hc);
  net.oow = rdf(hc, 0, 0); { float *t = rdf(1, 0, 0); net.oob = t[0]; }
  net.ok = 1;
  return (int)(rd - buf);
}

/* ---- kernels ---- */
static int TAPS3[9] = {-W2 - 1, -W2, -W2 + 1, -1, 0, 1, W2 - 1, W2, W2 + 1};
#define P0 23      /* first computed padded index (y=1,x=1) */
#define PN 416     /* positions computed: [23, 439) */

/* out[co][p] (= or +=) conv(in) over the computed range. in planes must have zero borders. */
static void conv_run(const Conv *c, const float *in, float *out, int accum) {
  int kk = c->k * c->k, cb = (c->cout + 3) / 4;
  const int *taps = c->k == 3 ? TAPS3 : TAPS3 + 4;
  for (int b = 0; b < cb; b++) {
    const float *wb = c->w + (b * c->cin) * kk * 4;
    int nco = c->cout - b * 4; if (nco > 4) nco = 4;
    float *o0 = out + (b * 4) * PP;
    for (int p = P0; p < P0 + PN; p += 8) {
      v4 a0, a1, a2, a3, b0, b1, b2, b3;
      a0 = a1 = a2 = a3 = b0 = b1 = b2 = b3 = (v4){0, 0, 0, 0};
      for (int ci = 0; ci < c->cin; ci++) {
        const float *ip = in + ci * PP + p;
        const float *wp = wb + ci * kk * 4;
        for (int t = 0; t < kk; t++) {
          v4 x0 = *(const v4u *)(ip + taps[t]);
          v4 x1 = *(const v4u *)(ip + taps[t] + 4);
          v4 w = *(const v4 *)(wp + t * 4);
          v4 w0 = __builtin_shufflevector(w, w, 0, 0, 0, 0);
          v4 w1 = __builtin_shufflevector(w, w, 1, 1, 1, 1);
          v4 w2 = __builtin_shufflevector(w, w, 2, 2, 2, 2);
          v4 w3 = __builtin_shufflevector(w, w, 3, 3, 3, 3);
          a0 += x0 * w0; b0 += x1 * w0;
          a1 += x0 * w1; b1 += x1 * w1;
          a2 += x0 * w2; b2 += x1 * w2;
          a3 += x0 * w3; b3 += x1 * w3;
        }
      }
      v4 *A[4] = {&a0, &a1, &a2, &a3}, *Bv[4] = {&b0, &b1, &b2, &b3};
      for (int j = 0; j < nco; j++) {
        float *op = o0 + j * PP + p;
        if (accum) { *(v4u *)op = *(v4u *)op + *A[j]; *(v4u *)(op + 4) = *(v4u *)(op + 4) + *Bv[j]; }
        else { *(v4u *)op = *A[j]; *(v4u *)(op + 4) = *Bv[j]; }
      }
    }
  }
}

/* ---- winograd F(4x4,3x3) ---- */
#define NT 25      /* 5x5 tiles of 4x4 cover the 19x19 board */
#define NTP 28     /* padded to a multiple of 4 */
static float *WV, *WM; /* V[36][NTP][maxCin], M[36][NTP][maxCop] */
static void wino_run(const Conv *c, const float *in, float *out, int accum) {
  int cin = c->cin, cop = c->cop;
  if (!WV) { WV = halloc(36 * NTP * maxCin * 4); WM = halloc(36 * NTP * maxCop * 4); }
  /* input transform */
  for (int ci = 0; ci < cin; ci++) {
    const float *pl = in + ci * PP;
    for (int t = 0; t < NT; t++) {
      int ty = t / 5, tx = t % 5;
      const float *d0 = pl + (4 * ty) * W2 + 4 * tx;
      float d[6][6], m[6][6];
      for (int r = 0; r < 6; r++) for (int q = 0; q < 6; q++) d[r][q] = d0[r * W2 + q];
      for (int q = 0; q < 6; q++) {
        float a0 = d[0][q], a1 = d[1][q], a2 = d[2][q], a3 = d[3][q], a4 = d[4][q], a5 = d[5][q];
        m[0][q] = 4 * a0 - 5 * a2 + a4;
        m[1][q] = -4 * a1 - 4 * a2 + a3 + a4;
        m[2][q] = 4 * a1 - 4 * a2 - a3 + a4;
        m[3][q] = -2 * a1 - a2 + 2 * a3 + a4;
        m[4][q] = 2 * a1 - a2 - 2 * a3 + a4;
        m[5][q] = 4 * a1 - 5 * a3 + a5;
      }
      for (int r = 0; r < 6; r++) {
        float a0 = m[r][0], a1 = m[r][1], a2 = m[r][2], a3 = m[r][3], a4 = m[r][4], a5 = m[r][5];
        float *v = WV + (r * 6) * NTP * cin + t * cin + ci;
        int st = NTP * cin;
        v[0 * st] = 4 * a0 - 5 * a2 + a4;
        v[1 * st] = -4 * a1 - 4 * a2 + a3 + a4;
        v[2 * st] = 4 * a1 - 4 * a2 - a3 + a4;
        v[3 * st] = -2 * a1 - a2 + 2 * a3 + a4;
        v[4 * st] = 2 * a1 - a2 - 2 * a3 + a4;
        v[5 * st] = 4 * a1 - 5 * a3 + a5;
      }
    }
  }
  /* 36 GEMMs: M[xi][t][co] = sum_ci V[xi][t][ci] * U[xi][ci][co] */
  for (int xi = 0; xi < 36; xi++) {
    const float *A = WV + xi * NTP * cin, *B = c->U + xi * cin * cop;
    float *M = WM + xi * NTP * cop;
    for (int t = 0; t < NTP; t += 4) {
      const float *A0 = A + t * cin, *A1_ = A0 + cin, *A2_ = A1_ + cin, *A3_ = A2_ + cin;
      for (int co = 0; co < cop; co += 8) {
        v4 c00 = {0, 0, 0, 0}, c01 = c00, c10 = c00, c11 = c00, c20 = c00, c21 = c00, c30 = c00, c31 = c00;
        const float *bp = B + co;
        for (int ci = 0; ci < cin; ci++) {
          v4 b0 = *(const v4 *)(bp), b1 = *(const v4 *)(bp + 4);
          bp += cop;
          float x0 = A0[ci], x1 = A1_[ci], x2 = A2_[ci], x3 = A3_[ci];
          v4 s0 = {x0, x0, x0, x0}, s1 = {x1, x1, x1, x1}, s2 = {x2, x2, x2, x2}, s3 = {x3, x3, x3, x3};
          c00 += s0 * b0; c01 += s0 * b1;
          c10 += s1 * b0; c11 += s1 * b1;
          c20 += s2 * b0; c21 += s2 * b1;
          c30 += s3 * b0; c31 += s3 * b1;
        }
        float *mp = M + t * cop + co;
        *(v4 *)(mp) = c00; *(v4 *)(mp + 4) = c01;
        *(v4 *)(mp + cop) = c10; *(v4 *)(mp + cop + 4) = c11;
        *(v4 *)(mp + 2 * cop) = c20; *(v4 *)(mp + 2 * cop + 4) = c21;
        *(v4 *)(mp + 3 * cop) = c30; *(v4 *)(mp + 3 * cop + 4) = c31;
      }
    }
  }
  /* output transform */
  int st = NTP * cop;
  for (int t = 0; t < NT; t++) {
    int ty = t / 5, tx = t % 5;
    for (int co = 0; co < c->cout; co++) {
      const float *mp = WM + t * cop + co;
      float m[6][6], q[4][6];
      for (int a = 0; a < 6; a++) for (int b = 0; b < 6; b++) m[a][b] = mp[(a * 6 + b) * st];
      for (int b = 0; b < 6; b++) {
        float a0 = m[0][b], a1 = m[1][b], a2 = m[2][b], a3 = m[3][b], a4 = m[4][b], a5 = m[5][b];
        q[0][b] = a0 + a1 + a2 + a3 + a4;
        q[1][b] = a1 - a2 + 2 * a3 - 2 * a4;
        q[2][b] = a1 + a2 + 4 * a3 + 4 * a4;
        q[3][b] = a1 - a2 + 8 * a3 - 8 * a4 + a5;
      }
      float *op = out + co * PP;
      for (int r = 0; r < 4; r++) {
        int y = 4 * ty + r; if (y >= PL) break;
        float a0 = q[r][0], a1 = q[r][1], a2 = q[r][2], a3 = q[r][3], a4 = q[r][4], a5 = q[r][5];
        float o4[4] = {a0 + a1 + a2 + a3 + a4, a1 - a2 + 2 * a3 - 2 * a4, a1 + a2 + 4 * a3 + 4 * a4, a1 - a2 + 8 * a3 - 8 * a4 + a5};
        float *row = op + (y + 1) * W2 + 4 * tx + 1;
        for (int k = 0; k < 4; k++) {
          if (4 * tx + k >= PL) break;
          if (accum) row[k] += o4[k]; else row[k] = o4[k];
        }
      }
    }
  }
}

static void conv_any(const Conv *c, const float *in, float *out, int accum) {
  if (c->U) wino_run(c, in, out, accum); else conv_run(c, in, out, accum);
}

/* act = relu(x*s + b) masked (border = 0) */
static void bnrelu(const BN *bn, const float *x, float *o, int c) {
  for (int i = 0; i < c; i++) {
    v4 s = (v4){bn->s[i], bn->s[i], bn->s[i], bn->s[i]}, b = (v4){bn->b[i], bn->b[i], bn->b[i], bn->b[i]}, z = {0, 0, 0, 0};
    const float *xp = x + i * PP; float *op = o + i * PP;
    for (int p = 0; p < PP; p += 4) {
      v4 v = *(const v4 *)(xp + p) * s + b;
      v = (v4)((i4)v & (i4)(v > z));
      v = v * *(const v4 *)(mask + p);
      *(v4 *)(op + p) = v;
    }
  }
}

static void gpool(const float *a, int c, float *out) { /* mean (over 361) and max -> out[0..c), out[c..2c) */
  for (int i = 0; i < c; i++) {
    float s = 0, m = -1e30f; const float *ap = a + i * PP;
    for (int p = 0; p < NP; p++) { float v = ap[IOFF(p)]; s += v; if (v > m) m = v; }
    out[i] = s / NP; out[c + i] = m;
  }
}

static float *X, *A1, *H1, *H2, *H3;
static void ensure_bufs(void) {
  if (X) return;
  int C = net.C;
  X = halloc(C * PP * 4); A1 = halloc(C * PP * 4); H1 = halloc(C * PP * 4); H2 = halloc(C * PP * 4); H3 = halloc(C * PP * 4);
}

typedef struct { float pol[NP + 1]; float val[3]; float score; float own[NP]; } NNOut;

/* spatial: NSP planes of NP floats (19x19, row major), glob: 2 floats */
static void net_forward(const float *spatial, const float *glob, const u16 *pat, NNOut *o) {
  int C = net.C, bc = net.bc, hc = net.hc, gc = net.gc;
  ensure_bufs();
  /* stem: input into padded planes */
  memset(H1, 0, NSP * PP * 4);
  for (int i = 0; i < NSP; i++) for (int p = 0; p < NP; p++) H1[i * PP + IOFF(p)] = spatial[i * NP + p];
  conv_any(&net.stem, H1, X, 0);
  for (int c = 0; c < C; c++) {
    float g = net.gfb[c] + net.gfw[c * 2] * glob[0] + net.gfw[c * 2 + 1] * glob[1];
    float *xp = X + c * PP;
    for (int p = 0; p < NP; p++) xp[IOFF(p)] += g + net.emb[pat[p] * C + c];
  }
  for (int bi = 0; bi < net.B; bi++) {
    Block *k = &net.blk[bi];
    if (k->kind == 0) {
      bnrelu(&k->bn_in, X, A1, C);
      conv_any(&k->cin, A1, H1, 0);              /* h (bc) */
      bnrelu(&k->n1b1, H1, H2, bc); conv_any(&k->n1c1, H2, H3, 0);
      bnrelu(&k->n1b2, H3, H2, bc); conv_any(&k->n1c2, H2, H1, 1);
      bnrelu(&k->n2b1, H1, H2, bc); conv_any(&k->n2c1, H2, H3, 0);
      bnrelu(&k->n2b2, H3, H2, bc); conv_any(&k->n2c2, H2, H1, 1);
      bnrelu(&k->bn_out, H1, H2, bc); conv_any(&k->cout, H2, X, 1);
    } else {
      bnrelu(&k->bn1, X, A1, C);
      conv_any(&k->creg, A1, H1, 0);
      conv_any(&k->cpool, A1, H2, 0);
      bnrelu(&k->bnp, H2, H3, gc);
      float pooled[128], add[512];
      gpool(H3, gc, pooled);
      for (int c = 0; c < C; c++) {
        float s = k->fcb[c];
        for (int j = 0; j < 2 * gc; j++) s += k->fcw[c * 2 * gc + j] * pooled[j];
        add[c] = s;
      }
      for (int c = 0; c < C; c++) { float *hp = H1 + c * PP; for (int p = 0; p < NP; p++) hp[IOFF(p)] += add[c]; }
      bnrelu(&k->bn2, H1, H2, C);
      conv_any(&k->c2, H2, X, 1);
    }
  }
  bnrelu(&net.trunk, X, A1, C);
  /* heads: 1x1 convs (hc x C) done with plain loops over interior */
  static float hp[3][64 * NP];
  float *heads[3] = {net.pcw, net.vcw, net.ocw}; BN *bns[3] = {&net.pbn, &net.vbn, &net.obn};
  for (int h = 0; h < 3; h++) {
    float *dst = hp[h];
    for (int j = 0; j < hc; j++) {
      float *d = dst + j * NP;
      for (int p = 0; p < NP; p++) d[p] = 0;
      for (int c = 0; c < C; c++) {
        float w = heads[h][j * C + c]; const float *ap = A1 + c * PP;
        for (int y = 0; y < PL; y++) { const float *row = ap + (y + 1) * W2 + 1; float *dr = d + y * PL; for (int x = 0; x < PL; x++) dr[x] += w * row[x]; }
      }
      float s = bns[h]->s[j], b = bns[h]->b[j];
      for (int p = 0; p < NP; p++) { float v = d[p] * s + b; d[p] = v > 0 ? v : 0; }
    }
  }
  /* policy */
  float pool[128];
  for (int p = 0; p < NP; p++) { float s = net.pob; for (int j = 0; j < hc; j++) s += net.pow_[j] * hp[0][j * NP + p]; o->pol[p] = s; }
  for (int j = 0; j < hc; j++) { float s = 0, m = -1e30f; for (int p = 0; p < NP; p++) { float v = hp[0][j * NP + p]; s += v; if (v > m) m = v; } pool[j] = s / NP; pool[hc + j] = m; }
  { float s = net.ppb; for (int j = 0; j < 2 * hc; j++) s += net.ppw[j] * pool[j]; o->pol[NP] = s; }
  /* value */
  for (int j = 0; j < hc; j++) { float s = 0, m = -1e30f; for (int p = 0; p < NP; p++) { float v = hp[1][j * NP + p]; s += v; if (v > m) m = v; } pool[j] = s / NP; pool[hc + j] = m; }
  float v1[64];
  for (int i = 0; i < hc; i++) { float s = net.v1b[i]; for (int j = 0; j < 2 * hc; j++) s += net.v1w[i * 2 * hc + j] * pool[j]; v1[i] = s > 0 ? s : 0; }
  float vl[3], mx = -1e30f, den = 0;
  for (int i = 0; i < 3; i++) { float s = net.vvb[i]; for (int j = 0; j < hc; j++) s += net.vvw[i * hc + j] * v1[j]; vl[i] = s; if (s > mx) mx = s; }
  for (int i = 0; i < 3; i++) { vl[i] = EXPF(vl[i] - mx); den += vl[i]; }
  for (int i = 0; i < 3; i++) o->val[i] = vl[i] / den;
  { float s = net.vsb; for (int j = 0; j < hc; j++) s += net.vsw[j] * v1[j]; o->score = s * 20.f; }
  for (int p = 0; p < NP; p++) { float s = net.oob; for (int j = 0; j < hc; j++) s += net.oow[j] * hp[2][j * NP + p]; o->own[p] = TANHF(s); }
}

/* ======================================================================== */
/* Features + symmetric evaluation                                          */
/* ======================================================================== */
static float FEAT[NSP * NP];
static u16 PAT[NP];

static int symPos(int p, int sym, int n) { /* transform within the n x n board */
  if (p == PASS || p < 0) return p;
  int x = p % PL, y = p / PL, nx, ny, m = n - 1;
  if (sym & 4) { int t = x; x = y; y = t; }
  if (sym & 1) x = m - x;
  if (sym & 2) y = m - y;
  nx = x; ny = y;
  return ny * PL + nx;
}

static float komiG = 7.5f;

static void encode(const Board *b, int sym) {
  int n = b->n, pla = b->tomove, opp = OPP(pla);
  memset(FEAT, 0, sizeof FEAT);
  static u8 lg[NP]; static int solvedGen = 0; static int solvedMark[NP]; static u8 solvedRes[NP];
  static short wm[NP][2]; static u8 nwm[NP];
  solvedGen++;
  for (int p = 0; p < NP; p++) lg[p] = 0;
  /* liberties */
  static int seen[NP]; static int sg = 0; sg++;
  for (int y = 0; y < n; y++) for (int x = 0; x < n; x++) {
    int p = y * PL + x;
    if (b->st[p] == EMPTY || seen[p] == sg) continue;
    int nl, ns = group_info(b, p, &nl, 0, 0);
    int L = nl > 255 ? 255 : nl;
    for (int i = 0; i < ns; i++) { lg[gstones[i]] = L; seen[gstones[i]] = sg; }
  }
  /* ladder per group (keyed by smallest stone) */
  static int gkey[NP];
  for (int y = 0; y < n; y++) for (int x = 0; x < n; x++) {
    int p = y * PL + x;
    if (b->st[p] == EMPTY || (lg[p] != 1 && lg[p] != 2)) continue;
    int nl, ns = group_info(b, p, &nl, 0, 0), key = p;
    for (int i = 0; i < ns; i++) if (gstones[i] < key) key = gstones[i];
    gkey[p] = key;
    if (solvedMark[key] != solvedGen) {
      solvedMark[key] = solvedGen; nwm[key] = 0;
      if (nl == 1) solvedRes[key] = ladder_captured(b, p, 1);
      else {
        short libs[2]; group_info(b, p, &nl, libs, 2);
        int att = OPP(b->st[p]); int cnt = 0;
        for (int i = 0; i < 2; i++) {
          if (!is_legal(b, att, libs[i])) continue;
          Board nb = *b; play(&nb, att, libs[i]);
          if (ladder_captured(&nb, p, 1)) { wm[key][cnt++] = libs[i]; }
        }
        nwm[key] = cnt; solvedRes[key] = cnt > 0;
      }
    }
  }
  for (int y = 0; y < n; y++) for (int x = 0; x < n; x++) {
    int p = y * PL + x, q = symPos(p, sym, n), c = b->st[p];
    FEAT[0 * NP + q] = 1;
    if (c == pla) FEAT[1 * NP + q] = 1;
    else if (c == opp) FEAT[2 * NP + q] = 1;
    if (c != EMPTY) {
      if (lg[p] == 1) FEAT[3 * NP + q] = 1;
      else if (lg[p] == 2) FEAT[4 * NP + q] = 1;
      else if (lg[p] == 3) FEAT[5 * NP + q] = 1;
      if (lg[p] == 1 || lg[p] == 2) {
        int key = gkey[p];
        if (solvedRes[key]) {
          FEAT[12 * NP + q] = 1;
          if (c == opp && lg[p] == 2) for (int i = 0; i < nwm[key]; i++) FEAT[13 * NP + symPos(wm[key][i], sym, n)] = 1;
        }
      }
    }
  }
  if (b->ko >= 0) FEAT[6 * NP + symPos(b->ko, sym, n)] = 1;
  int expect[5] = {opp, pla, opp, pla, opp};
  for (int i = 0; i < 5; i++) {
    if (b->hmv[i] < 0 || b->hpl[i] != expect[i]) break;
    if (b->hmv[i] != PASS) FEAT[(7 + i) * NP + symPos(b->hmv[i], sym, n)] = 1;
  }
  /* patterns (on the transformed board, padding/off-board = empty) */
  for (int y = 0; y < PL; y++) for (int x = 0; x < PL; x++) {
    int id = 0, p3 = 1;
    for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++) {
      int yy = y + dy, xx = x + dx, d = 0;
      if (yy >= 0 && yy < PL && xx >= 0 && xx < PL) {
        int q = yy * PL + xx;
        d = FEAT[1 * NP + q] > 0 ? 1 : FEAT[2 * NP + q] > 0 ? 2 : 0;
      }
      id += d * p3; p3 *= 3;
    }
    PAT[y * PL + x] = canon3[id];
  }
}

static float GLOB[2];
static NNOut nnTmp;
static int nnEvals = 0;

/* evaluate b with symmetry sym; outputs mapped back to board coordinates */
static void evaluate(const Board *b, int sym, NNOut *o) {
  int n = b->n;
  encode(b, sym);
  float sk = b->tomove == WHITE ? komiG : -komiG;
  float lim = n * n + 1;
  if (sk > lim) sk = lim; if (sk < -lim) sk = -lim;
  GLOB[0] = sk / 20.f;
  GLOB[1] = (b->hmv[0] == PASS) ? 1.f : 0.f;
  net_forward(FEAT, GLOB, PAT, &nnTmp);
  nnEvals++;
  for (int p = 0; p < NP; p++) { o->pol[p] = -1e30f; o->own[p] = 0; }
  for (int y = 0; y < n; y++) for (int x = 0; x < n; x++) {
    int p = y * PL + x, q = symPos(p, sym, n);
    o->pol[p] = nnTmp.pol[q]; o->own[p] = nnTmp.own[q];
  }
  o->pol[NP] = nnTmp.pol[NP];
  o->val[0] = nnTmp.val[0]; o->val[1] = nnTmp.val[1]; o->val[2] = nnTmp.val[2];
  o->score = nnTmp.score;
}

/* ======================================================================== */
/* MCTS                                                                     */
/* ======================================================================== */
typedef struct {
  short move;
  u8 expanded, pla;  /* pla = player to move AT this node */
  float P;
  int N, first, nch;
  double W, Wsq, Wwl, Wsc;
  float rawU, rawV, rawS;
} Node;

static Node *nodes; static int nodeCap = 0, nodeCnt = 0;
static Board rootB;
static unsigned int rng = 12345;
static unsigned int rnd(void) { rng ^= rng << 13; rng ^= rng >> 17; rng ^= rng << 5; return rng; }
EXPORT void set_seed(int s) { rng = s ? (unsigned)s : 1; }

static struct {
  float cpuct, cpuctLog, cpuctBase, fpu, rootFpu, fpuPow, wlf, ssf, dsf, sss, dss, polTemp, noise;
  int symMode; /* 0 random, 1 identity */
  int allowPass;
} SP = {1.0f, 0.45f, 500.f, 0.2f, 0.1f, 2.f, 1.f, 0.1f, 0.3f, 2.f, 0.75f, 1.f, 0.f, 0, 1};

static float sqrtArea = 19, scoreCenter = 0; /* scoreCenter: black perspective */
#define TWO_OVER_PI 0.636619772f
static float ATAN(float x) { /* atan approximation */
  float ax = x < 0 ? -x : x, r;
  if (ax > 1.f) { float z = 1.f / ax; r = 1.5707963f - z * (0.9998660f + z * z * (-0.3302995f + z * z * (0.1801410f + z * z * (-0.0851330f + z * z * 0.0208351f)))); }
  else r = ax * (0.9998660f + ax * ax * (-0.3302995f + ax * ax * (0.1801410f + ax * ax * (-0.0851330f + ax * ax * 0.0208351f))));
  return x < 0 ? -r : r;
}
static float score_util(float s, int mover) {
  float c = mover == BLACK ? scoreCenter : -scoreCenter;
  return TWO_OVER_PI * (SP.ssf * ATAN(s / (SP.sss * sqrtArea)) + SP.dsf * ATAN((s - c) / (SP.dss * sqrtArea)));
}

static NNOut evTmp;
static int expand(Node *nd, const Board *b) {
  int sym = SP.symMode ? 0 : (int)(rnd() & 7);
  evaluate(b, sym, &evTmp);
  float v = evTmp.val[0] - evTmp.val[1];
  nd->rawV = v; nd->rawS = evTmp.score;
  nd->rawU = SP.wlf * v + score_util(evTmp.score, b->tomove);
  /* children: legal moves */
  int n = b->n, cnt = 0;
  float mx = -1e30f;
  static float lg[NP + 1]; static short mv[NP + 1];
  for (int y = 0; y < n; y++) for (int x = 0; x < n; x++) {
    int p = y * PL + x;
    if (b->st[p] != EMPTY || p == b->ko) continue;
    if (!is_legal(b, b->tomove, p)) continue;
    mv[cnt] = p; lg[cnt] = evTmp.pol[p] / SP.polTemp; if (lg[cnt] > mx) mx = lg[cnt]; cnt++;
  }
  if (SP.allowPass || cnt == 0) { mv[cnt] = PASS; lg[cnt] = evTmp.pol[NP] / SP.polTemp; if (lg[cnt] > mx) mx = lg[cnt]; cnt++; }
  if (nodeCnt + cnt > nodeCap) return 0;
  float den = 0;
  for (int i = 0; i < cnt; i++) { lg[i] = EXPF(lg[i] - mx); den += lg[i]; }
  nd->first = nodeCnt; nd->nch = cnt;
  for (int i = 0; i < cnt; i++) {
    Node *c = &nodes[nodeCnt++];
    memset(c, 0, sizeof *c);
    c->move = mv[i]; c->P = lg[i] / den; c->pla = OPP(b->tomove);
  }
  nd->expanded = 1;
  return 1;
}

static NNOut rootOut;
static int rootSym = 0;

static void root_noise(Node *r) {
  if (SP.noise <= 0) return;
  /* mix a little uniform-ish noise into priors (used only by weak levels / variety) */
  for (int i = 0; i < r->nch; i++) {
    Node *c = &nodes[r->first + i];
    float u = (rnd() & 0xffff) / 65536.f;
    c->P = (1 - SP.noise) * c->P + SP.noise * u * 2.f / r->nch;
  }
}

static Node *select_child(Node *nd, int isRoot) {
  float sqrtN = SQRTF((float)nd->N + 1.f);
  float cp = SP.cpuct + SP.cpuctLog * LOGF((nd->N + SP.cpuctBase) / SP.cpuctBase);
  float parentAvg = nd->N > 0 ? (float)(nd->W / nd->N) : nd->rawU;
  float mass = 0;
  for (int i = 0; i < nd->nch; i++) if (nodes[nd->first + i].N > 0) mass += nodes[nd->first + i].P;
  float aw = mass * mass; if (aw > 1) aw = 1;
  float pv = aw * parentAvg + (1 - aw) * nd->rawU;
  float fpu = (isRoot ? SP.rootFpu : SP.fpu) * SQRTF(mass > 0 ? mass : 0);
  Node *best = 0; float bs = -1e30f;
  for (int i = 0; i < nd->nch; i++) {
    Node *c = &nodes[nd->first + i];
    float q = c->N > 0 ? -(float)(c->W / c->N) : pv - fpu;
    float s = q + cp * c->P * sqrtN / (1 + c->N);
    if (s > bs) { bs = s; best = c; }
  }
  return best;
}

static Node *pathN[1024];
static Board simB;
static int lastTerminalDepth;

/* Tromp-Taylor style final scoring (black - white - komi) on b */
static float tt_score(const Board *b) {
  int n = b->n; float s = 0;
  static int seen[NP]; static int g = 0; g++;
  for (int y = 0; y < n; y++) for (int x = 0; x < n; x++) {
    int p = y * PL + x;
    if (b->st[p] == BLACK) s += 1; else if (b->st[p] == WHITE) s -= 1;
    else if (seen[p] != g) {
      /* flood empty region */
      int sp = 0, cnt = 0, rb = 0, rw = 0;
      gstk[sp++] = p; seen[p] = g;
      while (sp) {
        int q = gstk[--sp]; cnt++;
        for (int k = 0; k < NNB[q]; k++) { int r = NB[q][k]; if (b->st[r] == EMPTY) { if (seen[r] != g) { seen[r] = g; gstk[sp++] = r; } } else if (b->st[r] == BLACK) rb = 1; else rw = 1; }
      }
      if (rb && !rw) s += cnt; else if (rw && !rb) s -= cnt;
    }
  }
  return s - komiG;
}

/* one playout. returns 0 if out of memory */
static int playout(Node *root) {
  simB = rootB;
  int d = 0; Node *nd = root;
  pathN[d++] = nd;
  int passes = rootB.hmv[0] == PASS ? 1 : 0;
  while (nd->expanded && nd->nch > 0 && d < 1000) {
    Node *c = select_child(nd, nd == root);
    play(&simB, OPP(c->pla), c->move);
    passes = c->move == PASS ? passes + 1 : 0;
    pathN[d++] = c;
    nd = c;
    if (passes >= 2) break;
  }
  float util, wl, sc; int mover;
  if (passes >= 2) {
    /* game over: score exactly */
    float s = tt_score(&simB);
    mover = simB.tomove;
    sc = mover == BLACK ? s : -s;
    wl = sc > 0 ? 1.f : sc < 0 ? -1.f : 0.f;
    util = SP.wlf * wl + score_util(sc, mover);
    nd->rawU = util; nd->rawV = wl; nd->rawS = sc;
  } else {
    if (!nd->expanded) { if (!expand(nd, &simB)) return 0; }
    mover = simB.tomove;
    util = nd->rawU; wl = nd->rawV; sc = nd->rawS;
  }
  for (int i = 0; i < d; i++) {
    Node *x = pathN[i];
    /* node stats are from the perspective of the player to move at that node;
       path[i] is (d-1-i) plies above the leaf */
    float sign = ((d - 1 - i) & 1) ? -1.f : 1.f;
    x->N++; x->W += sign * util; x->Wsq += util * util; x->Wwl += sign * wl; x->Wsc += sign * sc;
  }
  (void)mover;
  return 1;
}

static Node *rootN;
EXPORT int search_init(int maxNodes) {
  if (maxNodes > nodeCap) {
    nodes = halloc(maxNodes * (int)sizeof(Node));
    if (!nodes) return 0;
    nodeCap = maxNodes;
  }
  nodeCnt = 0;
  rootN = &nodes[nodeCnt++];
  memset(rootN, 0, sizeof *rootN);
  rootN->pla = rootB.tomove;
  sqrtArea = rootB.n;
  /* root eval with identity symmetry to set score center */
  int sm = SP.symMode; SP.symMode = 1;
  if (!expand(rootN, &rootB)) { SP.symMode = sm; return 0; }
  SP.symMode = sm;
  rootOut = evTmp;
  scoreCenter = rootB.tomove == BLACK ? rootN->rawS : -rootN->rawS;
  rootN->rawU = SP.wlf * rootN->rawV + score_util(rootN->rawS, rootB.tomove);
  root_noise(rootN);
  rootN->N = 1; rootN->W = rootN->rawU; rootN->Wsq = rootN->rawU * rootN->rawU; rootN->Wwl = rootN->rawV; rootN->Wsc = rootN->rawS;
  return rootN->nch;
}

EXPORT int search_run(int visits) {
  int done = 0;
  for (int i = 0; i < visits; i++) { if (!playout(rootN)) break; done++; }
  return done;
}

/* ======================================================================== */
/* JS API                                                                   */
/* ======================================================================== */
EXPORT void pos_reset(int n, float komi) { board_clear(&rootB, n); komiG = komi; }
EXPORT void set_komi(float komi) { komiG = komi; }
EXPORT int pos_play(int p) {
  if (!is_legal(&rootB, rootB.tomove, p)) return 0;
  play(&rootB, rootB.tomove, p);
  return 1;
}
EXPORT void pos_put(int p, int c) { rootB.st[p] = c; rootB.ko = -1; }
EXPORT void pos_tomove(int c) { rootB.tomove = c; }
EXPORT int pos_tomove_get(void) { return rootB.tomove; }
EXPORT int pos_legal(int p) { return is_legal(&rootB, rootB.tomove, p); }
EXPORT int pos_stone(int p) { return rootB.st[p]; }
EXPORT int pos_ko(void) { return rootB.ko; }
EXPORT int net_ok(void) { return net.ok; }
EXPORT int nn_count(void) { return nnEvals; }
EXPORT int node_count(void) { return nodeCnt; }

EXPORT void set_param(int k, float v) {
  switch (k) {
    case 0: SP.cpuct = v; break; case 1: SP.fpu = v; break; case 2: SP.rootFpu = v; break;
    case 3: SP.polTemp = v; break; case 4: SP.noise = v; break; case 5: SP.symMode = (int)v; break;
    case 6: SP.allowPass = (int)v; break; case 7: SP.wlf = v; break; case 8: SP.ssf = v; break; case 9: SP.dsf = v; break;
  }
}

/* raw net output at the root (averaged over `nsym` symmetries) into out:
 * [0..361] policy probs (legal-masked, incl pass at 361), [362..364] W/L/NR, [365] score (to-move persp.),
 * [366..726] ownership (to-move persp.) */
EXPORT float *eval_root(int nsym) {
  static float out[727];
  static NNOut acc, one;
  memset(&acc, 0, sizeof acc);
  if (nsym < 1) nsym = 1; if (nsym > 8) nsym = 8;
  float polAcc[NP + 1];
  for (int i = 0; i <= NP; i++) polAcc[i] = 0;
  for (int s = 0; s < nsym; s++) {
    evaluate(&rootB, s, &one);
    float mx = -1e30f, den = 0;
    for (int p = 0; p <= NP; p++) {
      int legal = p == NP ? 1 : (one.pol[p] > -1e29f && is_legal(&rootB, rootB.tomove, p));
      if (legal && one.pol[p] > mx) mx = one.pol[p];
    }
    float pr[NP + 1];
    for (int p = 0; p <= NP; p++) {
      int legal = p == NP ? 1 : (one.pol[p] > -1e29f && is_legal(&rootB, rootB.tomove, p));
      pr[p] = legal ? EXPF(one.pol[p] - mx) : 0; den += pr[p];
    }
    for (int p = 0; p <= NP; p++) polAcc[p] += pr[p] / den;
    for (int i = 0; i < 3; i++) acc.val[i] += one.val[i];
    acc.score += one.score;
    for (int p = 0; p < NP; p++) acc.own[p] += one.own[p];
  }
  for (int p = 0; p <= NP; p++) out[p] = polAcc[p] / nsym;
  for (int i = 0; i < 3; i++) out[362 + i] = acc.val[i] / nsym;
  out[365] = acc.score / nsym;
  for (int p = 0; p < NP; p++) out[366 + p] = acc.own[p] / nsym;
  return out;
}

/* search results: header [nch, rootN, winrate(to-move), scoreLead(to-move)], then per child sorted by N:
 * move, N, P, Q(utility, parent persp.), winloss(parent persp.), score(parent persp.), lcbish, (7 floats) */
EXPORT float *search_result(int maxChildren) {
  static float out[4 + 7 * (NP + 1)];
  Node *r = rootN;
  int n = r->nch, k = 0;
  static int idx[NP + 1];
  for (int i = 0; i < n; i++) idx[i] = r->first + i;
  /* sort by N desc then P */
  for (int i = 1; i < n; i++) { int t = idx[i], j = i; while (j > 0 && (nodes[idx[j - 1]].N < nodes[t].N || (nodes[idx[j - 1]].N == nodes[t].N && nodes[idx[j - 1]].P < nodes[t].P))) { idx[j] = idx[j - 1]; j--; } idx[j] = t; }
  if (maxChildren > n) maxChildren = n;
  out[0] = maxChildren; out[1] = r->N;
  out[2] = (float)(r->Wwl / r->N); out[3] = (float)(r->Wsc / r->N);
  for (k = 0; k < maxChildren; k++) {
    Node *c = &nodes[idx[k]]; float *o = out + 4 + k * 7;
    o[0] = c->move; o[1] = c->N; o[2] = c->P;
    if (c->N > 0) {
      float q = -(float)(c->W / c->N);
      float var = (float)(c->Wsq / c->N) - q * q; if (var < 0) var = 0;
      o[3] = q; o[4] = -(float)(c->Wwl / c->N); o[5] = -(float)(c->Wsc / c->N);
      o[6] = q - 1.0f * SQRTF(var / c->N);
    } else { o[3] = o[4] = o[5] = o[6] = 0; }
  }
  return out;
}
EXPORT float *root_ownership(void) { return rootOut.own; }

#ifdef NATIVE
/* helpers for native tools */
Board *native_root(void) { return &rootB; }
float *native_feat(void) { return FEAT; }
u16 *native_pat(void) { return PAT; }
void native_encode(int sym) { encode(&rootB, sym); }
#endif
