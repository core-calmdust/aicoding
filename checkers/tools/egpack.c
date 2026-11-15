// Compress the raw endgame database (tools/egdb.c output, 2 bits per value) so the engine can probe it without unpacking
// (2026-11-15, the scheme of the strong checkers programs: Chinook / KingsRow). Per class and side to move, the values of
// the class's positions in index order become a byte stream of tokens:
//   0..80    four values, base 3 (value - 1: win 0, loss 1, draw 2; the first position in the lowest digit)
//   81..255  a run of one value: (t - 81) % 3 + 1, length EGRUN[(t - 81) / 3]
// Positions where the side to move must capture (the search resolves captures itself) and unused indices (a white man on
// Black's crowning row) are "don't care": they take the value that makes the longest run. The stream is cut into blocks
// of EGBS bytes (a block starts at a token); the block's first value index is kept, so a probe finds its block by binary
// search and decodes at most EGBS tokens.
// File "CKZ2": nclass (u32); per class bm bk wm wk (u8) and the class blob's byte length (u32); then the blobs:
//   nb0 nb1 len0 len1 (u32), first[nb0] first[nb1] (u32), bytes0 (len0, padded to 4), bytes1 (len1, padded to 4)
// build: gcc -O3 -march=native -fopenmp -DNATIVE -o egpack tools/egpack.c   run: ./egpack egdb5.bin egdb5.ckz [min] [max]
#include "../engine.c"
#include <omp.h>
typedef struct { int bm, bk, wm, wk; u32 len; const u8 *v; u32 n; } RC;
static u32 unrankIn(u32 r, int k, u32 allowed) {
  int sq[32], m = 0; for (u32 a = allowed; a; a &= a - 1) sq[m++] = ctz(a);
  u32 set = 0;
  for (int i = k; i >= 1; i--) { int c = i - 1; while (c + 1 < m && CB[c + 1][i] <= r) c++; r -= CB[c][i]; set |= 1u << sq[c]; m = c; }
  return set;
}
static void decode(u32 idx, int bm, int bk, int wm, int wk, Pos *p) {
  u32 n4 = CB[32 - bm - wm - bk][wk], n3 = CB[32 - bm - wm][bk], n2 = CB[32 - bm][wm];
  u32 i4 = idx % n4; idx /= n4; u32 i3 = idx % n3; idx /= n3; u32 i2 = idx % n2; u32 i1 = idx / n2;
  u32 BM = unrankIn(i1, bm, ~ROW[7]), WM = unrankIn(i2, wm, ~BM), BK = unrankIn(i3, bk, ~BM & ~WM), WK = unrankIn(i4, wk, ~BM & ~WM & ~BK);
  p->p[0] = BM | BK; p->p[1] = WM | WK; p->k = BK | WK;
}
typedef struct { u8 *b; u32 len, cap, nb; u32 *first; u32 fcap; } Out;
static void put(Out *o, u8 t, u32 at) {   // at: the value index the token starts at
  if (o->len % EGBS == 0) { if (o->nb == o->fcap) { o->fcap = o->fcap * 2 + 64; o->first = realloc(o->first, o->fcap * 4); } o->first[o->nb++] = at; }
  if (o->len == o->cap) { o->cap = o->cap * 2 + 4096; o->b = realloc(o->b, o->cap); }
  o->b[o->len++] = t;
}
// one side's values (1..3, 0 = don't care) → tokens
static void pack(const u8 *val, u32 N, Out *o) {
  u32 i = 0;
  while (i < N) {
    int v = 0; for (u32 j = i; j < N && !v; j++) v = val[j]; if (!v) v = 3;
    u32 r = i; while (r < N && (val[r] == v || !val[r])) r++;
    u32 run = r - i;
    // a run, unless the token would have to stop inside a run of don't cares the literal can take as well
    if (run >= EGRUN[0]) {
      int k = EGNRUN - 1; while (EGRUN[k] > run) k--;
      put(o, (u8)(81 + k * 3 + (v - 1)), i); i += EGRUN[k]; continue;
    }
    int d[4];
    for (int k = 0; k < 4; k++) {
      u32 j = i + k; int x = j < N ? val[j] : 0;
      if (!x) { x = k ? d[k - 1] : 0; if (!x) { for (u32 q = j; q < N && !x; q++) x = val[q]; } if (!x) x = 3; }
      d[k] = x;
    }
    put(o, (u8)((d[0] - 1) + 3 * (d[1] - 1) + 9 * (d[2] - 1) + 27 * (d[3] - 1)), i); i += 4;
  }
}
int main(int argc, char **argv) {
  initGeo(); initCB();
  FILE *f = fopen(argv[1], "rb"); if (!f) return 1;
  int minP = argc > 3 ? atoi(argv[3]) : 0, maxP = argc > 4 ? atoi(argv[4]) : 99;
  char mg[4]; u32 nc; if (fread(mg, 1, 4, f) != 4 || fread(&nc, 4, 1, f) != 1) return 1;
  RC *C = calloc(nc, sizeof(RC));
  for (u32 i = 0; i < nc; i++) { u8 h[4]; if (fread(h, 1, 4, f) != 4 || fread(&C[i].len, 4, 1, f) != 1) return 1; C[i].bm = h[0]; C[i].bk = h[1]; C[i].wm = h[2]; C[i].wk = h[3]; C[i].n = eg_size(h[0], h[1], h[2], h[3]); }
  for (u32 i = 0; i < nc; i++) { u8 *b = malloc(C[i].len); if (fread(b, 1, C[i].len, f) != C[i].len) return 1; C[i].v = b; }
  fclose(f);
  FILE *g = fopen(argv[2], "wb");
  u32 keep = 0; for (u32 i = 0; i < nc; i++) { int t = C[i].bm + C[i].bk + C[i].wm + C[i].wk; if (t >= minP && t <= maxP) keep++; }
  u8 **blob = calloc(nc, sizeof(u8 *)); u32 *blen = calloc(nc, 4);
  size_t total = 0, raw = 0;
  for (u32 ci = 0; ci < nc; ci++) {
    RC *c = &C[ci]; int t = c->bm + c->bk + c->wm + c->wk; if (t < minP || t > maxP) continue;
    u8 *val = malloc((size_t)c->n * 2);   // side-major: val[s * n + i]
    #pragma omp parallel for schedule(dynamic, 8192)
    for (u32 i = 0; i < c->n; i++) {
      Pos p; decode(i, c->bm, c->bk, c->wm, c->wk, &p);
      int unused = (p.p[1] & ~p.k & ROW[0]) != 0;
      for (int s = 0; s < 2; s++) {
        u32 id = i * 2 + s; int v = (c->v[id >> 2] >> ((id & 3) * 2)) & 3;
        if (unused) v = 0; else { p.side = s; Move L[MAXMV]; if (genCaps(&p, L)) v = 0; }
        val[(size_t)s * c->n + i] = (u8)v;
      }
    }
    Out O[2] = { 0 };
    for (int s = 0; s < 2; s++) pack(val + (size_t)s * c->n, c->n, &O[s]);
    free(val);
    u32 p0 = (O[0].len + 3) & ~3u, p1 = (O[1].len + 3) & ~3u;
    u32 L = 16 + 4 * (O[0].nb + O[1].nb) + p0 + p1;
    u8 *B = calloc(1, L); u32 *H = (u32 *)B;
    H[0] = O[0].nb; H[1] = O[1].nb; H[2] = O[0].len; H[3] = O[1].len;
    memcpy(B + 16, O[0].first, 4 * O[0].nb); memcpy(B + 16 + 4 * O[0].nb, O[1].first, 4 * O[1].nb);
    memcpy(B + 16 + 4 * (O[0].nb + O[1].nb), O[0].b, O[0].len); memcpy(B + 16 + 4 * (O[0].nb + O[1].nb) + p0, O[1].b, O[1].len);
    blob[ci] = B; blen[ci] = L; total += L; raw += (c->n * 2 + 3) / 4;
    fprintf(stderr, "class %d%d-%d%d  positions %u  %u bytes (%.3f bits/value)\n", c->bm, c->bk, c->wm, c->wk, c->n, L, 8.0 * L / (2.0 * c->n));
    free(O[0].b); free(O[1].b); free(O[0].first); free(O[1].first);
  }
  fwrite("CKZ2", 1, 4, g); fwrite(&keep, 4, 1, g);
  for (u32 ci = 0; ci < nc; ci++) { if (!blob[ci]) continue; RC *c = &C[ci]; u8 h[4] = { (u8)c->bm, (u8)c->bk, (u8)c->wm, (u8)c->wk }; fwrite(h, 1, 4, g); fwrite(&blen[ci], 4, 1, g); }
  for (u32 ci = 0; ci < nc; ci++) if (blob[ci]) fwrite(blob[ci], 1, blen[ci], g);
  fclose(g);
  fprintf(stderr, "classes %u  raw %.1f MB  packed %.2f MB\n", keep, raw / 1e6, total / 1e6);
  return 0;
}
