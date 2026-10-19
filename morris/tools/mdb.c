// Nine Men's Morris endgame databases (moving phase, both hands empty) by retrograde analysis.
// Class (m,o): side to move has m pieces, the opponent o. Index = rankA * C(24-m, o) + rankB(compressed).
// Value byte: 0 = draw, 1..127 = side to move wins in v plies, 128+k = side to move loses in k plies (k 0..127).
// Usage: mdb m o   (solves the group {(m,o),(o,m)}; smaller classes must exist as db_m_o.bin)
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>

static int adjn[24], adj[24][4];
static int mills[16][3];
static int pm[24][4][2], pmn[24];   // for each point: the other two points of its mills
static uint64_t Cb[25][25];

static void geom(void) {
  static const int M[16][3] = { {0,1,2},{3,4,5},{6,7,8},{9,10,11},{12,13,14},{15,16,17},{18,19,20},{21,22,23},
    {0,9,21},{3,10,18},{6,11,15},{1,4,7},{16,19,22},{8,12,17},{5,13,20},{2,14,23} };
  memcpy(mills, M, sizeof M);
  for (int k = 0; k < 16; k++) {
    for (int j = 0; j < 2; j++) { int a = M[k][j], b = M[k][j + 1]; adj[a][adjn[a]++] = b; adj[b][adjn[b]++] = a; }
    for (int j = 0; j < 3; j++) { int p = M[k][j]; int o1 = M[k][(j + 1) % 3], o2 = M[k][(j + 2) % 3]; pm[p][pmn[p]][0] = o1; pm[p][pmn[p]][1] = o2; pmn[p]++; }
  }
  for (int n = 0; n <= 24; n++) { Cb[n][0] = 1; for (int k = 1; k <= n; k++) Cb[n][k] = Cb[n - 1][k - 1] + (k <= n - 1 ? Cb[n - 1][k] : 0); }
}
static inline int inMill(uint32_t S, int p) { for (int k = 0; k < pmn[p]; k++) if ((S >> pm[p][k][0] & 1) && (S >> pm[p][k][1] & 1)) return 1; return 0; }
// rank of a k-subset given as a mask over n bits (colex)
static inline uint64_t rankMask(uint32_t mask) { uint64_t r = 0; int i = 0; while (mask) { int p = __builtin_ctz(mask); mask &= mask - 1; i++; r += (p >= i) ? Cb[p][i] : 0; } return r; }
static inline uint32_t compress(uint32_t B, uint32_t A) { uint32_t out = 0; int j = 0; for (int p = 0; p < 24; p++) { if (A >> p & 1) continue; if (B >> p & 1) out |= 1u << j; j++; } return out; }
static inline uint32_t expand(uint32_t b, uint32_t A) { uint32_t out = 0; int j = 0; for (int p = 0; p < 24; p++) { if (A >> p & 1) continue; if (b >> j & 1) out |= 1u << p; j++; } return out; }
static inline uint64_t idxOf(uint32_t A, uint32_t B, int o, int m) { return rankMask(A) * Cb[24 - m][o] + rankMask(compress(B, A)); }

typedef struct { int m, o; uint64_t n; uint8_t *v; } DB;
static DB dbs[10][10];
static uint8_t *loadDB(int m, int o) {
  if (dbs[m][o].v) return dbs[m][o].v;
  char fn[64]; sprintf(fn, "db_%d_%d.bin", m, o);
  FILE *f = fopen(fn, "rb"); if (!f) return NULL;
  uint64_t n = Cb[24][m] * Cb[24 - m][o]; uint8_t *v = malloc(n);
  if (fread(v, 1, n, f) != n) { fprintf(stderr, "short %s\n", fn); exit(1); }
  fclose(f); dbs[m][o].v = v; dbs[m][o].n = n; dbs[m][o].m = m; dbs[m][o].o = o; return v;
}
// value of a position (side to move has A with m pieces, opponent B with o pieces)
static inline int termOrDB(uint32_t A, uint32_t B, int m, int o) {
  if (m < 3) return 128;            // side to move already lost
  uint8_t *v = loadDB(m, o); if (!v) { fprintf(stderr, "missing db %d %d\n", m, o); exit(1); }
  return v[idxOf(A, B, o, m)];
}

// solving state for one class of the group
typedef struct { int m, o; uint64_t n; uint8_t *res, *dist, *cnt, *mx; } CL;
static CL cl[2]; static int ncl;
static inline CL *clOf(int m, int o) { for (int i = 0; i < ncl; i++) if (cl[i].m == m && cl[i].o == o) return &cl[i]; return NULL; }

// buckets of (class, idx) by distance
typedef struct { uint64_t *a; size_t n, cap; } Vec;
static Vec bucket[256];
static void push(int d, int c, uint64_t i) { if (d > 255) d = 255; Vec *b = &bucket[d]; if (b->n == b->cap) { b->cap = b->cap ? b->cap * 2 : 1 << 16; b->a = realloc(b->a, b->cap * 8); } b->a[b->n++] = ((uint64_t)c << 40) | i; }

static uint32_t unrankComb(uint64_t r, int k) {  // colex unrank of a k-subset of {0..}
  uint32_t mask = 0;
  for (int i = k; i >= 1; i--) { int p = i - 1; while (Cb[p + 1][i] <= r) p++; r -= Cb[p][i]; mask |= 1u << p; }
  return mask;
}

int main(int argc, char **argv) {
  geom();
  int m0 = atoi(argv[1]), o0 = atoi(argv[2]);
  cl[0].m = m0; cl[0].o = o0; ncl = 1;
  if (m0 != o0) { cl[1].m = o0; cl[1].o = m0; ncl = 2; }
  for (int c = 0; c < ncl; c++) {
    CL *C = &cl[c]; C->n = Cb[24][C->m] * Cb[24 - C->m][C->o];
    C->res = calloc(C->n, 1); C->dist = calloc(C->n, 1); C->cnt = calloc(C->n, 1); C->mx = calloc(C->n, 1);
    fprintf(stderr, "class %d-%d: %llu\n", C->m, C->o, (unsigned long long)C->n);
  }
  // 1) initialise: count in-group children, look up capture children
  for (int c = 0; c < ncl; c++) {
    CL *C = &cl[c]; int m = C->m, o = C->o; uint64_t nb = Cb[24 - m][o];
    for (uint64_t ra = 0; ra < Cb[24][m]; ra++) {
      uint32_t A = unrankComb(ra, m);
      for (uint64_t rb = 0; rb < nb; rb++) {
        uint32_t B = expand(unrankComb(rb, o), A), E = ~(A | B) & 0xFFFFFF;
        uint64_t id = ra * nb + rb;
        int fly = (m == 3), nmov = 0, cnt = 0, winD = 999, hasDraw = 0, mx = 0;
        uint32_t rem = 0; int remDone = 0;
        for (uint32_t a = A; a; a &= a - 1) {
          int f = __builtin_ctz(a);
          uint32_t T = fly ? E : 0;
          if (!fly) for (int k = 0; k < adjn[f]; k++) if (E >> adj[f][k] & 1) T |= 1u << adj[f][k];
          for (; T; T &= T - 1) {
            int t = __builtin_ctz(T); nmov++;
            uint32_t A2 = (A & ~(1u << f)) | (1u << t);
            if (inMill(A2, t)) {
              if (!remDone) { remDone = 1; for (uint32_t b = B; b; b &= b - 1) { int q = __builtin_ctz(b); if (!inMill(B, q)) rem |= 1u << q; } if (!rem) rem = B; }
              for (uint32_t r = rem; r; r &= r - 1) {
                int q = __builtin_ctz(r); uint32_t B2 = B & ~(1u << q);
                int v = termOrDB(B2, A2, o - 1, m);   // opponent to move
                if (v >= 128) { int d = (v - 128) + 1; if (d < winD) winD = d; }
                else if (v == 0) hasDraw = 1;
                else { if (v + 1 > mx) mx = v + 1; }
              }
            } else cnt++;
          }
        }
        if (nmov == 0) { C->res[id] = 5; push(0, c, id); continue; }   // blocked: loss
        C->cnt[id] = cnt; C->mx[id] = mx > 255 ? 255 : mx;
        if (winD < 999) { C->res[id] = 3; C->dist[id] = winD > 255 ? 255 : winD; push(winD, c, id); }        // pending win
        else if (hasDraw) C->res[id] = 4;                              // can't lose
        else if (cnt == 0) { C->res[id] = 5; push(mx, c, id); }        // pending loss (all captures lose)
      }
    }
    fprintf(stderr, "init %d-%d done\n", m, o);
  }
  // 2) propagate by distance
  for (int d = 0; d < 256; d++) {
    Vec *b = &bucket[d];
    for (size_t i = 0; i < b->n; i++) {
      int c = b->a[i] >> 40; uint64_t id = b->a[i] & ((1ull << 40) - 1);
      CL *C = &cl[c];
      int r = C->res[id];
      if (r == 1 || r == 2) continue;
      int isWin;
      if (r == 3) { C->res[id] = 1; C->dist[id] = d; isWin = 1; }
      else if (r == 5) { C->res[id] = 2; C->dist[id] = d; isWin = 0; }
      else continue;
      // predecessors: the opponent just moved one of its pieces (non-capturing) within the group
      int m = C->m, o = C->o; uint64_t nb = Cb[24 - m][o];
      uint32_t A = unrankComb(id / nb, m), B = expand(unrankComb(id % nb, o), A), E = ~(A | B) & 0xFFFFFF;
      CL *P = clOf(o, m); if (!P) continue;
      int pfly = (o == 3);
      for (uint32_t bb = B; bb; bb &= bb - 1) {
        int t = __builtin_ctz(bb);
        if (inMill(B, t)) continue;      // the move to t would have closed a mill (a capture)
        uint32_t F = pfly ? E : 0;
        if (!pfly) for (int k = 0; k < adjn[t]; k++) if (E >> adj[t][k] & 1) F |= 1u << adj[t][k];
        for (; F; F &= F - 1) {
          int f = __builtin_ctz(F);
          uint32_t Bp = (B & ~(1u << t)) | (1u << f);
          uint64_t pid = idxOf(Bp, A, m, o);
          int pr = P->res[pid];
          if (pr == 1 || pr == 2) continue;
          int pc = P == &cl[0] ? 0 : 1;
          if (!isWin) { if (pr != 3 || d + 1 < P->dist[pid]) { P->res[pid] = 3; P->dist[pid] = d + 1 > 255 ? 255 : d + 1; push(d + 1, pc, pid); } }
          else if (pr != 3 && pr != 4) {
            if (P->cnt[pid] && --P->cnt[pid] == 0) {
              int ld = d + 1; if (P->mx[pid] > ld) ld = P->mx[pid];
              P->res[pid] = 5; push(ld, pc, pid);
            }
          }
        }
      }
    }
    if (b->n) fprintf(stderr, "d=%d: %zu\n", d, b->n);
    free(b->a); b->a = NULL; b->n = b->cap = 0;
  }
  // 3) write: 0 draw, 1..127 win in v plies, 128+k loss in k plies
  for (int c = 0; c < ncl; c++) {
    CL *C = &cl[c]; uint64_t w = 0, l = 0, dr = 0; int mxw = 0, mxl = 0;
    uint8_t *out = malloc(C->n);
    for (uint64_t i = 0; i < C->n; i++) {
      int r = C->res[i], d = C->dist[i];
      if (r == 1) { out[i] = d < 1 ? 1 : d > 127 ? 127 : d; w++; if (d > mxw) mxw = d; }
      else if (r == 2) { out[i] = 128 + (d > 127 ? 127 : d); l++; if (d > mxl) mxl = d; }
      else { out[i] = 0; dr++; }
    }
    char fn[64]; sprintf(fn, "db_%d_%d.bin", C->m, C->o);
    FILE *f = fopen(fn, "wb"); fwrite(out, 1, C->n, f); fclose(f);
    printf("%d-%d: win %llu loss %llu draw %llu  max win %d max loss %d\n", C->m, C->o, (unsigned long long)w, (unsigned long long)l, (unsigned long long)dr, mxw, mxl);
  }
  return 0;
}
