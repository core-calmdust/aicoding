// Compress the raw endgame database (tools/egdb.c output, 2 bits per value) for the browser:
// positions where the side to move must capture (the search resolves captures itself) and unused indices are
// "don't care" and take the value of the run they are in; each class is cut into blocks of 4096 values and every
// block is run-length coded (token: value in the low 2 bits, run length - 1 in the high 6 bits; 63 = a varint follows
// with length - 64). File "CKZ1": nclass, then per class bm bk wm wk (u8), nblocks (u32), byte length (u32);
// then per class the block offsets (u32, nblocks + 1) and the coded bytes.
// build: gcc -O3 -march=native -fopenmp -DNATIVE -o egzip tools/egzip.c   run: ./egzip egdb6.bin egdb6.ckz [maxPieces]
#include "../engine.c"
#include <omp.h>
#define BLK 4096
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
int main(int argc, char **argv) {
  initGeo(); initCB();
  FILE *f = fopen(argv[1], "rb"); if (!f) return 1;
  int maxP = argc > 3 ? atoi(argv[3]) : 99;
  char mg[4]; u32 nc; fread(mg, 1, 4, f); fread(&nc, 4, 1, f);
  RC *C = calloc(nc, sizeof(RC));
  for (u32 i = 0; i < nc; i++) { u8 h[4]; fread(h, 1, 4, f); fread(&C[i].len, 4, 1, f); C[i].bm = h[0]; C[i].bk = h[1]; C[i].wm = h[2]; C[i].wk = h[3]; C[i].n = eg_size(h[0], h[1], h[2], h[3]); }
  for (u32 i = 0; i < nc; i++) { u8 *b = malloc(C[i].len); fread(b, 1, C[i].len, f); C[i].v = b; }
  fclose(f);
  u32 keep = 0; for (u32 i = 0; i < nc; i++) if (C[i].bm + C[i].bk + C[i].wm + C[i].wk <= maxP) keep++;
  u8 **out = calloc(nc, sizeof(u8 *)); u32 **offs = calloc(nc, sizeof(u32 *)); u32 *olen = calloc(nc, 4), *nbl = calloc(nc, 4);
  size_t total = 0, raw = 0;
  for (u32 ci = 0; ci < nc; ci++) {
    RC *c = &C[ci]; if (c->bm + c->bk + c->wm + c->wk > maxP) continue;
    u32 N = c->n * 2;   // values (index * 2 + side)
    u8 *val = malloc(N);
    #pragma omp parallel for schedule(dynamic, 8192)
    for (u32 i = 0; i < c->n; i++) {
      Pos p; decode(i, c->bm, c->bk, c->wm, c->wk, &p);
      int unused = (p.p[1] & ~p.k & ROW[0]) != 0;
      for (int s = 0; s < 2; s++) {
        u32 id = i * 2 + s; int v = (c->v[id >> 2] >> ((id & 3) * 2)) & 3;
        if (unused) v = 0; else { p.side = s; Move L[MAXMV]; if (genCaps(&p, L)) v = 0; }
        val[id] = (u8)v;   // 0 = don't care
      }
    }
    u32 nb = (N + BLK - 1) / BLK; nbl[ci] = nb;
    size_t cap = (size_t)N + 16 * (size_t)nb + 64; u8 *o = malloc(cap); u32 *of = malloc((nb + 1) * 4); size_t ol = 0;
    for (u32 b = 0; b < nb; b++) {
      of[b] = (u32)ol;
      u32 s0 = b * BLK, s1 = s0 + BLK < N ? s0 + BLK : N;
      // fill don't-cares: with the next known value at the block start, then with the current run's value
      int curv = 0; for (u32 i = s0; i < s1 && !curv; i++) curv = val[i]; if (!curv) curv = 3;
      u32 i = s0;
      while (i < s1) {
        int v = val[i] ? val[i] : curv; u32 j = i + 1;
        while (j < s1 && (val[j] == v || !val[j])) j++;
        u32 len = j - i;
        if (len - 1 < 63) o[ol++] = (u8)(v | ((len - 1) << 2));
        else { o[ol++] = (u8)(v | (63 << 2)); u32 x = len - 64; do { u8 by = x & 127; x >>= 7; o[ol++] = by | (x ? 128 : 0); } while (x); }
        curv = v; i = j;
      }
    }
    of[nb] = (u32)ol;
    out[ci] = o; offs[ci] = of; olen[ci] = (u32)ol; total += ol + (nb + 1) * 4; raw += (N + 3) / 4;
    fprintf(stderr, "class %d%d-%d%d  values %u  coded %zu bytes (%.2f bits/value)\n", c->bm, c->bk, c->wm, c->wk, N, ol + (size_t)(nb + 1) * 4, 8.0 * (ol + (nb + 1) * 4) / N);
    free(val);
  }
  FILE *g = fopen(argv[2], "wb");
  fwrite("CKZ1", 1, 4, g); fwrite(&keep, 4, 1, g);
  for (u32 ci = 0; ci < nc; ci++) { RC *c = &C[ci]; if (c->bm + c->bk + c->wm + c->wk > maxP) continue; u8 h[4] = { (u8)c->bm, (u8)c->bk, (u8)c->wm, (u8)c->wk }; fwrite(h, 1, 4, g); fwrite(&nbl[ci], 4, 1, g); u32 bl = olen[ci] + (nbl[ci] + 1) * 4; fwrite(&bl, 4, 1, g); }
  for (u32 ci = 0; ci < nc; ci++) { if (!out[ci]) continue; fwrite(offs[ci], 4, nbl[ci] + 1, g); fwrite(out[ci], 1, olen[ci], g); }
  fclose(g);
  fprintf(stderr, "classes %u  raw %.1f MB  coded %.1f MB\n", keep, raw / 1e6, total / 1e6);
  return 0;
}
