// Perfect-play databases for six / nine / twelve men's morris under the site's rules (engine.js):
//   - a mill (placement or movement) removes one opposing piece that is not in a mill (any piece if all are)
//   - fewer than 3 pieces (board + hand) loses; a blocked player loses, except a full board (twelve) is a draw
//   - nine / twelve: a player with 3 pieces and none in hand may fly; six: no flying
//   - draw after 50 plies without a placement or capture (QUIET_DRAW), and by repetition
// Our own code (no third-party solver code). Values are from the side to move's point of view.
//
// Value of a movement position (both hands empty, quiet counter q):
//   z = "need": the fewest plies the winner needs to force the next conversion (a capture that keeps the
//   win, or a blocked opponent). The position is decisive iff z <= L - q (L = 50 with the quiet rule).
//   The databases store the value at q = 0; with q > 0 a stored win/loss with z > L - q is a draw.
//   Like the DTZ tables of chess: following the moves that keep z decreasing always makes progress.
// Placement positions store win / draw / loss only (the placement phase is finite and resets q).
//
// Index of a class (m pieces of the side to move, o of the opponent): the board is reduced by the
// board's symmetries (found automatically, 16 for all three boards): A (mover) is replaced by the
// smallest member of its orbit, B (opponent) then by the smallest image under the symmetries that fix
// it. index = orbit(A) * C(n - m, o) + rank(B on the points not in A). Slots that are not canonical
// are unused (value 0).
//
// Build:  cc -O3 -o solve solve.c -lpthread
// Usage:  ./solve <six|nine|twelve> [-q 50|0] [-t threads] [-d outdir] [moving|placing|all|verify|plan]
//   outdir defaults to ~/morris-db (keeps the data out of the repository).
//   -q 0 = no quiet-move rule (classic, as in Gasser 1996).  Finished classes are files in outdir and are
//   skipped on the next run, so an interrupted run continues where it stopped.
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <pthread.h>
#include <sys/stat.h>
#include <time.h>
#include <unistd.h>

typedef uint32_t u32; typedef uint64_t u64; typedef uint16_t u16; typedef uint8_t u8;

// ------------------------------------------------------------------ geometry (same numbering as engine.js)
static int N, P, FLY;                 // points, pieces per player, flying rule
static const char *VNAME; static int VID;
static int NM, mills[24][3];
static int adjn[24], adj[24][8];
static u32 adjMask[24], ALL;
static int ptMn[24]; static u32 ptMm[24][4];
static void link2(int a, int b) { for (int k = 0; k < adjn[a]; k++) if (adj[a][k] == b) return; adj[a][adjn[a]++] = b; adj[b][adjn[b]++] = a; }
static void geom(const char *name) {
  static const int M9[16][3] = { {0,1,2},{3,4,5},{6,7,8},{9,10,11},{12,13,14},{15,16,17},{18,19,20},{21,22,23},
    {0,9,21},{3,10,18},{6,11,15},{1,4,7},{16,19,22},{8,12,17},{5,13,20},{2,14,23} };
  static const int MD[4][3] = { {0,3,6},{2,5,8},{21,18,15},{23,20,17} };
  static const int M6[8][3] = { {0,1,2},{3,4,5},{10,11,12},{13,14,15},{0,6,13},{3,7,10},{5,8,12},{2,9,15} };
  static const int X6[4][2] = { {1,4},{6,7},{8,9},{11,14} };
  int nx = 0;
  if (!strcmp(name, "six")) { VID = 6; N = 16; P = 6; FLY = 0; NM = 8; memcpy(mills, M6, sizeof M6); nx = 4; }
  else if (!strcmp(name, "nine")) { VID = 9; N = 24; P = 9; FLY = 1; NM = 16; memcpy(mills, M9, sizeof M9); }
  else if (!strcmp(name, "twelve")) { VID = 12; N = 24; P = 12; FLY = 1; NM = 20; memcpy(mills, M9, sizeof M9); memcpy(mills[16], MD, sizeof MD); }
  else { fprintf(stderr, "variant: six | nine | twelve\n"); exit(1); }
  VNAME = name;
  for (int m = 0; m < NM; m++) { link2(mills[m][0], mills[m][1]); link2(mills[m][1], mills[m][2]); }
  for (int e = 0; e < nx; e++) link2(X6[e][0], X6[e][1]);
  ALL = (1u << N) - 1;
  for (int i = 0; i < N; i++) { adjMask[i] = 0; for (int j = 0; j < adjn[i]; j++) adjMask[i] |= 1u << adj[i][j]; }
  for (int m = 0; m < NM; m++) { u32 mm = (1u << mills[m][0]) | (1u << mills[m][1]) | (1u << mills[m][2]); for (int j = 0; j < 3; j++) { int p = mills[m][j]; ptMm[p][ptMn[p]++] = mm; } }
}
static inline int inMill(u32 S, int p) { for (int k = 0; k < ptMn[p]; k++) if ((S & ptMm[p][k]) == ptMm[p][k]) return 1; return 0; }
static inline u32 removable(u32 B) { u32 R = 0; for (u32 b = B; b; b &= b - 1) { int q = __builtin_ctz(b); if (!inMill(B, q)) R |= 1u << q; } return R ? R : B; }

// ------------------------------------------------------------------ symmetries (automorphisms keeping adjacency and mills)
static int NS, sym[32][24];
static u32 symT[32][3][256];
static int perm[24], used[24];
static int millSet(u32 mm) { for (int m = 0; m < NM; m++) { u32 x = (1u << mills[m][0]) | (1u << mills[m][1]) | (1u << mills[m][2]); if (x == mm) return 1; } return 0; }
static void searchSym(int i) {
  if (NS >= 32) { fprintf(stderr, "too many symmetries\n"); exit(1); }
  if (i == N) {
    for (int m = 0; m < NM; m++) if (!millSet((1u << perm[mills[m][0]]) | (1u << perm[mills[m][1]]) | (1u << perm[mills[m][2]]))) return;
    memcpy(sym[NS++], perm, sizeof perm); return;
  }
  for (int v = 0; v < N; v++) {
    if (used[v] || adjn[v] != adjn[i]) continue;
    int ok = 1;
    for (int j = 0; j < i && ok; j++) { int a = (adjMask[i] >> j) & 1, b = (adjMask[v] >> perm[j]) & 1; if (a != b) ok = 0; }
    if (!ok) continue;
    used[v] = 1; perm[i] = v; searchSym(i + 1); used[v] = 0;
  }
}
static inline u32 applySym(int g, u32 S) { return symT[g][0][S & 255] | symT[g][1][(S >> 8) & 255] | symT[g][2][(S >> 16) & 255]; }

// ------------------------------------------------------------------ combinatorial ranking (colex)
static u64 Cb[33][33];
static u32 rankT[3][25][256];       // rankT[byte][set bits below][byte value]
static u8 pextT[256][256];          // bits of v under mask m, packed
static inline u32 rankMask(u32 S) { u32 r = 0; int c = 0; for (int k = 0; k < 3; k++) { u32 b = (S >> (8 * k)) & 255; r += rankT[k][c][b]; c += __builtin_popcount(b); } return r; }
static inline u32 compress(u32 B, u32 A) { u32 F = ~A & ALL, out = 0; int sh = 0; for (int k = 0; k < 3; k++) { u32 f = (F >> (8 * k)) & 255; out |= (u32)pextT[(B >> (8 * k)) & 255][f] << sh; sh += __builtin_popcount(f); } return out; }
static inline u32 expand(u32 b, u32 A) { u32 out = 0; int j = 0; for (int p = 0; p < N; p++) { if (A >> p & 1) continue; if (b >> j & 1) out |= 1u << p; j++; } return out; }
static u32 unrankComb(u64 r, int k) { u32 mask = 0; for (int i = k; i >= 1; i--) { int p = i - 1; while (Cb[p + 1][i] <= r) p++; r -= Cb[p][i]; mask |= 1u << p; } return mask; }
static void initComb(void) {
  for (int n = 0; n <= 32; n++) { Cb[n][0] = 1; for (int k = 1; k <= n; k++) Cb[n][k] = Cb[n - 1][k - 1] + (k <= n - 1 ? Cb[n - 1][k] : 0); }
  for (int k = 0; k < 3; k++) for (int c = 0; c <= 24; c++) for (int b = 0; b < 256; b++) { u32 r = 0; int i = c; for (int j = 0; j < 8; j++) if (b >> j & 1) { i++; int p = 8 * k + j; if (p >= i) r += Cb[p][i]; } rankT[k][c][b] = r; }
  for (int v = 0; v < 256; v++) for (int m = 0; m < 256; m++) { u32 o = 0; int j = 0; for (int i = 0; i < 8; i++) if (m >> i & 1) { if (v >> i & 1) o |= 1u << j; j++; } pextT[v][m] = o; }
}

// orbit tables per piece count m
typedef struct { u32 nOrb; u32 *orbOf; u32 *gm; u32 *repMask; u8 *stab; } Orb;
static Orb orb[13];
static void buildOrb(int m) {
  Orb *O = &orb[m]; if (O->orbOf) return;
  u64 nc = Cb[N][m]; O->orbOf = malloc(nc * 4); O->gm = malloc(nc * 4);
  u32 *rep = malloc(nc * 4);
  for (u64 r = 0; r < nc; r++) {
    u32 A = unrankComb(r, m), best = 0xFFFFFFFF; u32 gm = 0;
    for (int g = 0; g < NS; g++) { u32 x = rankMask(applySym(g, A)); if (x < best) { best = x; gm = 1u << g; } else if (x == best) gm |= 1u << g; }
    rep[r] = best; O->gm[r] = gm;
  }
  u32 k = 0; for (u64 r = 0; r < nc; r++) if (rep[r] == r) k++;
  O->nOrb = k; O->repMask = malloc(k * 4); O->stab = malloc(k);
  u32 *id = malloc(nc * 4); k = 0;
  for (u64 r = 0; r < nc; r++) if (rep[r] == r) { id[r] = k; O->repMask[k] = unrankComb(r, m); O->stab[k] = __builtin_popcount(O->gm[r]) > 1; k++; }
  for (u64 r = 0; r < nc; r++) O->orbOf[r] = id[rep[r]];
  free(id); free(rep);
}
// canonical index of (A mover with m pieces, B opponent with o pieces)
static inline u64 idxOf(u32 A, u32 B, int m, int o) {
  Orb *O = &orb[m]; u32 rA = rankMask(A); u32 gm = O->gm[rA], orbit = O->orbOf[rA];
  u32 R = O->repMask[orbit], best = 0xFFFFFFFF;
  for (; gm; gm &= gm - 1) { int g = __builtin_ctz(gm); u32 x = rankMask(compress(applySym(g, B), R)); if (x < best) best = x; }
  return (u64)orbit * Cb[N - m][o] + best;
}
static inline int decode(u64 id, int m, int o, u32 *A, u32 *B) {   // returns 0 for an unused (non-canonical) slot
  Orb *O = &orb[m]; u64 nb = Cb[N - m][o]; u32 orbit = (u32)(id / nb);
  *A = O->repMask[orbit]; *B = expand(unrankComb(id % nb, o), *A);
  if (O->stab[orbit] && idxOf(*A, *B, m, o) != id) return 0;
  return 1;
}

// ------------------------------------------------------------------ classes, files
// type: 0 moving (hm = ho = 0), 1 placing
typedef struct { int hm, ho, m, o; u64 n; int width; void *v; } Cls;
static const char *OUT = NULL; static int QL = 50; static int THREADS = 2;
static char dirName[256];
static u64 clsN(int m, int o) { return (u64)orb[m].nOrb * Cb[N - m][o]; }
static void fname(char *fn, int hm, int ho, int m, int o) {
  if (!hm && !ho) sprintf(fn, "%s/mv_%d_%d.bin", dirName, m, o); else sprintf(fn, "%s/pl_%d_%d_%d_%d.bin", dirName, hm, ho, m, o);
}
// file: 32-byte header "MRDB", ver, variant, QL, hm, ho, m, o, width, pad, n(u64) then n * width bytes
static int fileOK(int hm, int ho, int m, int o) { char fn[512]; fname(fn, hm, ho, m, o); struct stat st; if (stat(fn, &st)) return 0; buildOrb(m); u64 n = clsN(m, o); return st.st_size == (off_t)(32 + n) || st.st_size == (off_t)(32 + 2 * n); }
static void writeCls(int hm, int ho, int m, int o, const void *data, u64 n, int width) {
  char fn[512], tmp[520]; fname(fn, hm, ho, m, o); sprintf(tmp, "%s.tmp", fn);
  FILE *f = fopen(tmp, "wb"); if (!f) { perror(tmp); exit(1); }
  u8 h[32] = { 'M', 'R', 'D', 'B', 1, (u8)VID, (u8)QL, (u8)hm, (u8)ho, (u8)m, (u8)o, (u8)width }; memcpy(h + 24, &n, 8);
  fwrite(h, 1, 32, f); if (fwrite(data, width, n, f) != n) { perror("write"); exit(1); } fclose(f); rename(tmp, fn);
}
// loaded classes (read only), value accessor -> 0 draw, >0 win need, <0 loss need
typedef struct { int hm, ho, m, o, width; u64 n; void *v; } Loaded;
static Loaded cache[512]; static int ncache;
static Loaded *getCls(int hm, int ho, int m, int o) {
  for (int i = 0; i < ncache; i++) if (cache[i].hm == hm && cache[i].ho == ho && cache[i].m == m && cache[i].o == o) return &cache[i];
  char fn[512]; fname(fn, hm, ho, m, o); FILE *f = fopen(fn, "rb"); if (!f) { fprintf(stderr, "missing %s\n", fn); exit(1); }
  u8 h[32]; if (fread(h, 1, 32, f) != 32 || memcmp(h, "MRDB", 4)) { fprintf(stderr, "bad %s\n", fn); exit(1); }
  Loaded *L = &cache[ncache++]; L->hm = hm; L->ho = ho; L->m = m; L->o = o; L->width = h[11]; memcpy(&L->n, h + 24, 8);
  L->v = malloc(L->n * L->width); if (fread(L->v, L->width, L->n, f) != L->n) { fprintf(stderr, "short %s\n", fn); exit(1); }
  fclose(f); buildOrb(m); return L;
}
static void dropCache(void) { for (int i = 0; i < ncache; i++) free(cache[i].v); ncache = 0; }
static inline int valAt(const Loaded *L, u64 i) {
  if (L->width == 1) { int v = ((u8 *)L->v)[i]; return v == 0 ? 0 : v < 128 ? v : -(v - 128); }
  int v = ((u16 *)L->v)[i]; return v == 0 ? 0 : v < 32768 ? v : -(v - 32768);
}
// value of a position for its side to move (A, m pieces on board, hm in hand), opponent (B, o, ho)
static inline int lookup(u32 A, u32 B, int m, int o, int hm, int ho) {
  if (m + hm < 3) return -1;                 // already lost
  Loaded *L = getCls(hm, ho, m, o);
  return valAt(L, idxOf(A, B, m, o));
}

// ------------------------------------------------------------------ parallel for
typedef void (*Job)(u64 lo, u64 hi, void *ctx);
typedef struct { Job job; void *ctx; u64 n; volatile u64 next; } Par;
static void *parRun(void *a) { Par *p = a; for (;;) { u64 lo = __atomic_fetch_add(&p->next, 1 << 14, __ATOMIC_RELAXED); if (lo >= p->n) break; u64 hi = lo + (1 << 14); if (hi > p->n) hi = p->n; p->job(lo, hi, p->ctx); } return NULL; }
static void parFor(u64 n, Job job, void *ctx) {
  Par p = { job, ctx, n, 0 }; pthread_t th[64]; int t = THREADS < 1 ? 1 : THREADS > 64 ? 64 : THREADS;
  for (int i = 1; i < t; i++) pthread_create(&th[i], NULL, parRun, &p);
  parRun(&p); for (int i = 1; i < t; i++) pthread_join(th[i], NULL);
}
static pthread_mutex_t mtxCache = PTHREAD_MUTEX_INITIALIZER;
static double tnow(void) { struct timespec ts; clock_gettime(CLOCK_MONOTONIC, &ts); return ts.tv_sec + ts.tv_nsec * 1e-9; }

// ------------------------------------------------------------------ moving phase: one group {(m,o),(o,m)}
// working value (u16): bits 14-15 type (0 open, 1 win, 2 loss, 3 fixed draw), bit 13 "cannot lose", low 13 bits z
#define T_OPEN 0
#define T_WIN 1
#define T_LOSS 2
#define T_DRAW 3
#define TYP(v) ((v) >> 14)
#define ZOF(v) ((v) & 0x1FFF)
#define NOLOSS 0x2000
#define MK(t, z) (u16)(((t) << 14) | (z))
typedef struct { int m, o; u64 n; u16 *v; u8 *cnt; } WCls;
static WCls wc[2]; static int nwc;
static inline WCls *wOf(int m, int o) { for (int i = 0; i < nwc; i++) if (wc[i].m == m && wc[i].o == o) return &wc[i]; return NULL; }
static inline u32 movesFrom(int f, int fly, u32 E) { return fly ? E : (adjMask[f] & E); }
static int sortUniq(u64 *a, int k) { for (int i = 1; i < k; i++) { u64 x = a[i]; int j = i - 1; while (j >= 0 && a[j] > x) { a[j + 1] = a[j]; j--; } a[j + 1] = x; } int u = 0; for (int i = 0; i < k; i++) if (!u || a[u - 1] != a[i]) a[u++] = a[i]; return u; }

static void initJob(u64 lo, u64 hi, void *ctx) {
  WCls *C = ctx; int m = C->m, o = C->o, fly = FLY && m == 3;
  u64 kids[512];
  for (u64 id = lo; id < hi; id++) {
    u32 A, B; if (!decode(id, m, o, &A, &B)) { C->v[id] = MK(T_DRAW, 0); continue; }
    u32 E = ~(A | B) & ALL; int nmov = 0, k = 0, win = 0, hasDraw = 0; u32 rem = 0; int remDone = 0;
    for (u32 a = A; a && !win; a &= a - 1) {
      int f = __builtin_ctz(a);
      for (u32 T = movesFrom(f, fly, E); T; T &= T - 1) {
        int t = __builtin_ctz(T); nmov++;
        u32 A2 = (A & ~(1u << f)) | (1u << t);
        if (inMill(A2, t)) {
          if (!remDone) { remDone = 1; rem = removable(B); }
          for (u32 r = rem; r; r &= r - 1) {
            u32 B2 = B & ~(1u << __builtin_ctz(r));
            int v = lookup(B2, A2, o - 1, m, 0, 0);     // opponent to move
            if (v < 0) { win = 1; break; } else if (v == 0) hasDraw = 1;
          }
          if (win) break;
        } else kids[k++] = idxOf(B, A2, o, m);
      }
    }
    if (win) { C->v[id] = MK(T_WIN, 1); continue; }
    if (nmov == 0) { C->v[id] = (m + o == N) ? MK(T_DRAW, 0) : MK(T_LOSS, 1); continue; }
    k = sortUniq(kids, k);
    if (k == 0) { C->v[id] = hasDraw ? MK(T_DRAW, 0) : MK(T_LOSS, 1); continue; }
    C->cnt[id] = (u8)k; C->v[id] = hasDraw ? NOLOSS : 0;
  }
}
typedef struct { WCls *C; int d; u64 found; } PropCtx;
static void propJob(u64 lo, u64 hi, void *ctx) {
  PropCtx *pc = ctx; WCls *C = pc->C; int m = C->m, o = C->o, d = pc->d; u64 found = 0;
  WCls *Pc = wOf(o, m); int pfly = FLY && o == 3;
  u64 preds[512];
  for (u64 id = lo; id < hi; id++) {
    u16 v = C->v[id]; int t0 = TYP(v);
    if ((t0 != T_WIN && t0 != T_LOSS) || ZOF(v) != d) continue;
    found++;
    u32 A, B; decode(id, m, o, &A, &B);
    u32 E = ~(A | B) & ALL; int k = 0;
    for (u32 bb = B; bb; bb &= bb - 1) {
      int t = __builtin_ctz(bb);
      if (inMill(B, t)) continue;                    // arriving at t would have closed a mill
      for (u32 F = movesFrom(t, pfly, E); F; F &= F - 1) { int f = __builtin_ctz(F); preds[k++] = idxOf((B & ~(1u << t)) | (1u << f), A, o, m); }
    }
    k = sortUniq(preds, k);
    for (int i = 0; i < k; i++) {
      u64 p = preds[i]; u16 *pv = &Pc->v[p];
      if (t0 == T_LOSS) {                             // predecessor can move into a lost position: win in d+1
        u16 old = __atomic_load_n(pv, __ATOMIC_RELAXED);
        while (TYP(old) == T_OPEN) { if (__atomic_compare_exchange_n(pv, &old, MK(T_WIN, d + 1), 0, __ATOMIC_RELAXED, __ATOMIC_RELAXED)) break; }
      } else {
        u16 old = __atomic_load_n(pv, __ATOMIC_RELAXED);
        if (TYP(old) != T_OPEN || (old & NOLOSS)) continue;
        if (__atomic_sub_fetch(&Pc->cnt[p], 1, __ATOMIC_RELAXED) == 0) __atomic_store_n(pv, MK(T_LOSS, d + 1), __ATOMIC_RELAXED);
      }
    }
  }
  __atomic_fetch_add(&pc->found, found, __ATOMIC_RELAXED);
}
static void solveMovingGroup(int m, int o) {
  if (fileOK(0, 0, m, o) && fileOK(0, 0, o, m)) { printf("mv %d-%d: done before\n", m, o); return; }
  double t0 = tnow();
  nwc = 0; wc[nwc].m = m; wc[nwc].o = o; nwc++; if (m != o) { wc[nwc].m = o; wc[nwc].o = m; nwc++; }
  for (int i = 0; i < nwc; i++) { buildOrb(wc[i].m); buildOrb(wc[i].o); wc[i].n = clsN(wc[i].m, wc[i].o); wc[i].v = calloc(wc[i].n, 2); wc[i].cnt = calloc(wc[i].n, 1); if (!wc[i].v || !wc[i].cnt) { fprintf(stderr, "out of memory\n"); exit(1); } }
  // preload the classes reached by captures (single thread, then read only)
  for (int i = 0; i < nwc; i++) if (wc[i].o - 1 >= 3) getCls(0, 0, wc[i].o - 1, wc[i].m);
  for (int i = 0; i < nwc; i++) parFor(wc[i].n, initJob, &wc[i]);
  int maxd = 0, limit = QL ? QL : 8000;
  for (int d = 1; d <= limit; d++) {
    u64 found = 0;
    for (int i = 0; i < nwc; i++) {
      PropCtx pc = { &wc[i], d, 0 };
      if (d < limit) parFor(wc[i].n, propJob, &pc);
      else for (u64 id = 0; id < wc[i].n; id++) { u16 v = wc[i].v[id]; if ((TYP(v) == T_WIN || TYP(v) == T_LOSS) && ZOF(v) == d) pc.found++; }
      found += pc.found;
    }
    if (!found) break;
    maxd = d;
  }
  for (int i = 0; i < nwc; i++) {
    WCls *C = &wc[i]; u64 w = 0, l = 0, dr = 0; int wide = maxd > 127;
    void *out = malloc(C->n * (wide ? 2 : 1));
    for (u64 id = 0; id < C->n; id++) {
      u16 v = C->v[id]; int t = TYP(v), z = ZOF(v), x = 0;
      if (t == T_WIN) { x = z; w++; } else if (t == T_LOSS) { x = (wide ? 32768 : 128) + z; l++; } else dr++;
      if (wide) ((u16 *)out)[id] = x; else ((u8 *)out)[id] = x;
    }
    writeCls(0, 0, C->m, C->o, out, C->n, wide ? 2 : 1); free(out);
    printf("mv %d-%d: %llu slots  win %llu loss %llu draw/unused %llu  max z %d  %.1fs\n", C->m, C->o, (unsigned long long)C->n, (unsigned long long)w, (unsigned long long)l, (unsigned long long)dr, maxd, tnow() - t0);
    fflush(stdout);
    free(C->v); free(C->cnt);
  }
  dropCache();
}

// ------------------------------------------------------------------ placing phase
typedef struct { int hm, ho, m, o; u8 *out; } PCtx;
static void placeJob(u64 lo, u64 hi, void *ctx) {
  PCtx *c = ctx; int hm = c->hm, ho = c->ho, m = c->m, o = c->o;
  for (u64 id = lo; id < hi; id++) {
    u32 A, B; if (!decode(id, m, o, &A, &B)) { c->out[id] = 0; continue; }
    u32 E = ~(A | B) & ALL; int win = 0, draw = 0; u32 rem = 0; int remDone = 0;
    for (u32 T = E; T && !win; T &= T - 1) {
      int t = __builtin_ctz(T); u32 A2 = A | (1u << t);
      if (o > 0 && inMill(A2, t)) {
        if (!remDone) { remDone = 1; rem = removable(B); }
        for (u32 r = rem; r; r &= r - 1) { int v = lookup(B & ~(1u << __builtin_ctz(r)), A2, o - 1, m + 1, ho, hm - 1); if (v < 0) { win = 1; break; } if (v == 0) draw = 1; }
      } else { int v = lookup(B, A2, o, m + 1, ho, hm - 1); if (v < 0) win = 1; else if (v == 0) draw = 1; }
    }
    c->out[id] = win ? 1 : draw ? 0 : 129;
  }
}
static int validPl(int hm, int ho, int m, int o) { return m <= P - hm && o <= P - ho && m + hm >= 3 && o + ho >= 3 && m + o <= N; }
static void solvePlacing(void) {
  for (int s = 1; s <= 2 * P; s++) for (int hm = 1; hm <= P; hm++) {
    int ho = s - hm; if (ho != hm && ho != hm - 1) continue;
    double t0 = tnow(); u64 tot = 0, w = 0, l = 0;
    for (int m = 0; m <= P; m++) for (int o = 0; o <= P; o++) {
      if (!validPl(hm, ho, m, o) || fileOK(hm, ho, m, o)) continue;
      buildOrb(m); buildOrb(o); u64 n = clsN(m, o); u8 *out = malloc(n);
      // preload children classes
      for (int oo = o - 1; oo <= o; oo++) if (oo >= 0) { int cm = oo, co = m + 1; if (cm + ho >= 3 && (ho || hm - 1 || (cm >= 3 && co >= 3))) getCls(ho, hm - 1, cm, co); }
      PCtx c = { hm, ho, m, o, out }; parFor(n, placeJob, &c);
      writeCls(hm, ho, m, o, out, n, 1);
      for (u64 i = 0; i < n; i++) { if (out[i] == 1) w++; else if (out[i] == 129) l++; }
      tot += n; free(out);
      dropCache();                                   // keep memory to this class and its children
      if (n > 100000000) { printf("  pl %d-%d %d-%d: %llu slots  %.1fs\n", hm, ho, m, o, (unsigned long long)n, tnow() - t0); fflush(stdout); }
    }
    if (tot) printf("pl hands %d-%d: %llu slots  win %llu loss %llu  %.1fs\n", hm, ho, (unsigned long long)tot, (unsigned long long)w, (unsigned long long)l, tnow() - t0);
    fflush(stdout);
    dropCache();
  }
}

// ------------------------------------------------------------------ verification (independent local check of every stored value)
// moving: win z => some move wins (capture into a loss, or quiet move into a loss with z-1); loss z => every move loses and the
// longest quiet one is z-1 (or z = 1 when there is no quiet move / blocked); draw => neither.  Placing: plain minimax.
typedef struct { int hm, ho, m, o; Loaded *L; u64 bad, n; } VCtx;
static void verifyJob(u64 lo, u64 hi, void *ctx) {
  VCtx *c = ctx; int m = c->m, o = c->o, hm = c->hm, ho = c->ho; u64 bad = 0, nn = 0;
  for (u64 id = lo; id < hi; id++) {
    u32 A, B; if (!decode(id, m, o, &A, &B)) continue;
    nn++; int got = valAt(c->L, id), want;
    u32 E = ~(A | B) & ALL;
    if (hm) {
      int win = 0, draw = 0;
      for (u32 T = E; T; T &= T - 1) {
        int t = __builtin_ctz(T); u32 A2 = A | (1u << t);
        if (o > 0 && inMill(A2, t)) { for (u32 r = removable(B); r; r &= r - 1) { int v = lookup(B & ~(1u << __builtin_ctz(r)), A2, o - 1, m + 1, ho, hm - 1); if (v < 0) win = 1; else if (v == 0) draw = 1; } }
        else { int v = lookup(B, A2, o, m + 1, ho, hm - 1); if (v < 0) win = 1; else if (v == 0) draw = 1; }
      }
      want = win ? 1 : draw ? 0 : -1;
      if ((got > 0 ? 1 : got < 0 ? -1 : 0) != want) bad++;
      continue;
    }
    int fly = FLY && m == 3, nmov = 0, bestW = 1 << 30, worstL = 0, nonLose = 0, quiet = 0, limit = QL ? QL : (1 << 30) - 1;
    for (u32 a = A; a; a &= a - 1) {
      int f = __builtin_ctz(a);
      for (u32 T = movesFrom(f, fly, E); T; T &= T - 1) {
        int t = __builtin_ctz(T); nmov++; u32 A2 = (A & ~(1u << f)) | (1u << t);
        if (inMill(A2, t)) { for (u32 r = removable(B); r; r &= r - 1) { int v = lookup(B & ~(1u << __builtin_ctz(r)), A2, o - 1, m, 0, 0); if (v < 0) bestW = 1; else if (v == 0) nonLose = 1; else if (worstL < 1) worstL = 1; } }
        else { quiet++; int v = lookup(B, A2, o, m, 0, 0); if (v < 0) { if (-v + 1 > limit) nonLose = 1; else if (-v + 1 < bestW) bestW = -v + 1; } else if (v == 0) nonLose = 1; else if (v + 1 > worstL) worstL = v + 1; }
      }
    }
    if (nmov == 0) want = (m + o == N) ? 0 : -1;
    else if (bestW <= limit) want = bestW;
    else if (!nonLose && worstL <= limit) want = -(worstL < 1 ? 1 : worstL);
    else want = 0;
    (void)quiet;
    if (got != want) { if (bad < 3) { pthread_mutex_lock(&mtxCache); fprintf(stderr, "  mismatch mv %d-%d id %llu: stored %d, from moves %d\n", m, o, (unsigned long long)id, got, want); pthread_mutex_unlock(&mtxCache); } bad++; }
  }
  __atomic_fetch_add(&c->bad, bad, __ATOMIC_RELAXED); __atomic_fetch_add(&c->n, nn, __ATOMIC_RELAXED);
}
static u64 verifyCls(int hm, int ho, int m, int o) {
  Loaded *L = getCls(hm, ho, m, o);
  // preload everything the checks read
  if (hm) { for (int oo = o - 1; oo <= o; oo++) if (oo >= 0 && oo + ho >= 3 && (ho || hm - 1 || (oo >= 3 && m + 1 >= 3))) getCls(ho, hm - 1, oo, m + 1); }
  else { getCls(0, 0, o, m); if (o - 1 >= 3) getCls(0, 0, o - 1, m); }
  L = getCls(hm, ho, m, o);
  VCtx c = { hm, ho, m, o, L, 0, 0 }; parFor(L->n, verifyJob, &c);
  printf("verify %s %d-%d %d-%d: %llu positions, %llu wrong\n", hm ? "pl" : "mv", hm, ho, m, o, (unsigned long long)c.n, (unsigned long long)c.bad); fflush(stdout);
  dropCache(); return c.bad;
}

int main(int argc, char **argv) {
  if (argc < 2) { fprintf(stderr, "usage: solve <six|nine|twelve> [-q 50|0] [-t threads] [-d outdir] [moving|placing|all|verify|plan]\n"); return 1; }
  const char *what = "all";
  geom(argv[1]); initComb();
  for (int i = 2; i < argc; i++) {
    if (!strcmp(argv[i], "-q") && i + 1 < argc) QL = atoi(argv[++i]);
    else if (!strcmp(argv[i], "-t") && i + 1 < argc) THREADS = atoi(argv[++i]);
    else if (!strcmp(argv[i], "-d") && i + 1 < argc) OUT = argv[++i];
    else what = argv[i];
  }
  memset(used, 0, sizeof used); searchSym(0);
  for (int g = 0; g < NS; g++) for (int k = 0; k < 3; k++) for (int b = 0; b < 256; b++) { u32 x = 0; for (int j = 0; j < 8; j++) if (b >> j & 1 && 8 * k + j < N) x |= 1u << sym[g][8 * k + j]; symT[g][k][b] = x; }
  static char home[300];
  if (!OUT) { snprintf(home, sizeof home, "%s/morris-db", getenv("HOME") ? getenv("HOME") : "."); OUT = home; }
  snprintf(dirName, sizeof dirName, "%s/%s-q%d", OUT, VNAME, QL); mkdir(OUT, 0755); mkdir(dirName, 0755);
  printf("%s: %d points, %d pieces, flying %d, %d mills, %d symmetries, quiet rule %d, %d threads -> %s\n", VNAME, N, P, FLY, NM, NS, QL, THREADS, dirName);
  double t0 = tnow();
  if (!strcmp(what, "plan")) {
    u64 mv = 0, pl = 0, big = 0;
    for (int m = 0; m <= P; m++) buildOrb(m);
    for (int m = 3; m <= P; m++) for (int o = 3; o <= P; o++) if (m + o <= N) { u64 n = clsN(m, o); mv += n; u64 g = n + (m != o ? clsN(o, m) : 0); if (g > big) big = g; }
    for (int hm = 1; hm <= P; hm++) for (int ho = hm - 1; ho <= hm; ho++) for (int m = 0; m <= P; m++) for (int o = 0; o <= P; o++) if (validPl(hm, ho, m, o)) pl += clsN(m, o);
    printf("moving slots %llu (%.2f GB at 1 byte), placing slots %llu (%.2f GB), largest moving group %llu -> about %.1f GB RAM while solving\n",
      (unsigned long long)mv, mv / 1e9, (unsigned long long)pl, pl / 1e9, (unsigned long long)big, big * 3.0 / 1e9 + big / 1e9);
    return 0;
  }
  if (!strcmp(what, "moving") || !strcmp(what, "all"))
    for (int s = 6; s <= 2 * P; s++) for (int m = 3; m <= P; m++) { int o = s - m; if (o < m || o > P || m + o > N) continue; solveMovingGroup(m, o); }
  if (!strcmp(what, "placing") || !strcmp(what, "all")) solvePlacing();
  if (!strcmp(what, "verify")) {
    u64 bad = 0;
    for (int m = 3; m <= P; m++) for (int o = 3; o <= P; o++) if (m + o <= N && fileOK(0, 0, m, o) && fileOK(0, 0, o, m) && (o - 1 < 3 || fileOK(0, 0, o - 1, m))) bad += verifyCls(0, 0, m, o);
    for (int hm = 1; hm <= P; hm++) for (int ho = hm - 1; ho <= hm; ho++) for (int m = 0; m <= P; m++) for (int o = 0; o <= P; o++) if (validPl(hm, ho, m, o) && fileOK(hm, ho, m, o)) bad += verifyCls(hm, ho, m, o);
    printf("verify: %llu wrong in total\n", (unsigned long long)bad);
    if (bad) return 2;
  }
  if (fileOK(P, P, 0, 0)) {
    int v = lookup(0, 0, 0, 0, P, P);
    printf("start position: %s\n", v > 0 ? "first player wins" : v < 0 ? "second player wins" : "draw");
  }
  printf("total %.1fs\n", tnow() - t0);
  return 0;
}
