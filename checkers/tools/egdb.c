// Endgame database builder for English checkers (win / loss / draw for the side to move, all positions with
// up to MAXN pieces). Iterates each class (black men, black kings, white men, white kings) to a fixpoint;
// moves into other classes (captures, crowning) use classes solved earlier. Ignores the 40-move rule / repetition.
// build: gcc -O3 -march=native -fopenmp -DNATIVE -o egdb tools/egdb.c   run: ./egdb 6 egdb6.bin  (6 pieces: ~1.5 GB of RAM for the result)
#include <omp.h>
#include "../engine.c"

typedef struct { int bm, bk, wm, wk; u32 n; u8 *v; } Cls;   // v: 2 bits per (index * 2 + side)
static Cls C[400]; static int NC; static Cls *TAB[13][13][13][13];
static u8 *WORK; static Cls *WCLS;   // the class being solved: one byte per value (threads write distinct bytes)
static u32 unrankIn(u32 r, int k, u32 allowed) {   // inverse of rankIn
  int sq[32], m = 0; for (u32 a = allowed; a; a &= a - 1) sq[m++] = ctz(a);
  u32 set = 0;
  for (int i = k; i >= 1; i--) {   // largest c with C(c, i) <= r
    int c = i - 1; while (c + 1 < m && CB[c + 1][i] <= r) c++;
    r -= CB[c][i]; set |= 1u << sq[c]; m = c;
  }
  return set;
}
static void decode(u32 idx, int bm, int bk, int wm, int wk, Pos *p) {
  u32 n4 = CB[32 - bm - wm - bk][wk], n3 = CB[32 - bm - wm][bk], n2 = CB[32 - bm][wm];
  u32 i4 = idx % n4; idx /= n4; u32 i3 = idx % n3; idx /= n3; u32 i2 = idx % n2; u32 i1 = idx / n2;
  u32 all = 0xFFFFFFFFu;
  u32 BM = unrankIn(i1, bm, all & ~ROW[7]);
  u32 WM = unrankIn(i2, wm, all & ~BM);
  u32 BK = unrankIn(i3, bk, all & ~BM & ~WM);
  u32 WK = unrankIn(i4, wk, all & ~BM & ~WM & ~BK);
  p->p[0] = BM | BK; p->p[1] = WM | WK; p->k = BK | WK;
}
static inline int getV(const Cls *c, u32 i) { return (c->v[i >> 2] >> ((i & 3) * 2)) & 3; }
static inline void setV(Cls *c, u32 i, int x) { c->v[i >> 2] = (u8)((c->v[i >> 2] & ~(3 << ((i & 3) * 2))) | (x << ((i & 3) * 2))); }
static Cls *find(int bm, int bk, int wm, int wk) { return TAB[bm][bk][wm][wk]; }
// value of a position for the side to move (1 win, 2 loss, 3 draw, 0 unknown)
static int lookup(const Pos *p, Cls *cur) {
  int bm = pc(p->p[0] & ~p->k), bk = pc(p->p[0] & p->k), wm = pc(p->p[1] & ~p->k), wk = pc(p->p[1] & p->k);
  if (!bm && !bk) return p->side ? 1 : 2;
  if (!wm && !wk) return p->side ? 2 : 1;
  Cls *c = find(bm, bk, wm, wk);
  if (c && c == WCLS) return WORK[egIndex(p, bm, bk, wm, wk) * 2 + p->side];
  if (!c || !c->v) { fprintf(stderr, "missing class %d %d %d %d\n", bm, bk, wm, wk); exit(1); }
  return getV(c, egIndex(p, bm, bk, wm, wk) * 2 + p->side);
}
static void solve(Cls *c) {
  u32 N = c->n; WORK = calloc((size_t)N * 2, 1); WCLS = c;
  double t0 = omp_get_wtime();
  int pass = 0; u64 changed;
  do {
    changed = 0;
    #pragma omp parallel for schedule(dynamic, 4096) reduction(+:changed)
    for (u32 i = 0; i < N; i++) {
      if (pass && WORK[i * 2] && WORK[i * 2 + 1]) continue;
      Pos p; decode(i, c->bm, c->bk, c->wm, c->wk, &p);
      if (p.p[1] & ~p.k & ROW[0]) { WORK[i * 2] = WORK[i * 2 + 1] = 3; continue; }   // unused index
      for (int s = 0; s < 2; s++) {
        u32 id = i * 2 + s; if (WORK[id]) continue;
        p.side = s;
        Move L[MAXMV]; int n = gen(&p, L), win = 0, allWin = 1;
        if (!n) { WORK[id] = 2; changed++; continue; }
        for (int j = 0; j < n && !win; j++) {
          Pos q = p; doMove(&q, &L[j]);
          int v = lookup(&q, c);
          if (v == 2) win = 1; else if (v != 1) allWin = 0;
        }
        if (win) { WORK[id] = 1; changed++; } else if (allWin) { WORK[id] = 2; changed++; }
      }
    }
    pass++;
  } while (changed);
  c->v = calloc(((size_t)N * 2 + 3) / 4, 1);
  u64 w = 0, l = 0, d = 0;
  for (u32 i = 0; i < N * 2; i++) { int v = WORK[i]; if (!v) { v = 3; d++; } else if (v == 1) w++; else if (v == 2) l++; else d++; setV(c, i, v); }
  free(WORK); WORK = 0; WCLS = 0;
  fprintf(stderr, "class %d%d-%d%d  n=%u  passes=%d  win %llu loss %llu draw %llu  %.1fs\n", c->bm, c->bk, c->wm, c->wk, N, pass, (unsigned long long)w, (unsigned long long)l, (unsigned long long)d, omp_get_wtime() - t0);
}
int main(int argc, char **argv) {
  initGeo(); initCB();
  int MAXN = argc > 1 ? atoi(argv[1]) : 4;
  for (int n = 2; n <= MAXN; n++)
    for (int men = 0; men <= n; men++)
      for (int bm = 0; bm <= men; bm++) {
        int wm = men - bm;
        for (int bk = 0; bk <= n - men; bk++) {
          int wk = n - men - bk;
          if (bm + bk == 0 || wm + wk == 0) continue;
          Cls *c = &C[NC++]; c->bm = bm; c->bk = bk; c->wm = wm; c->wk = wk; c->n = eg_size(bm, bk, wm, wk); c->v = 0; TAB[bm][bk][wm][wk] = c;
        }
      }
  // solve in order: fewer pieces first, then fewer men (crowning leads to a class with one man fewer)
  // checkpoints: every solved class is saved to CKPT_DIR (env, default "egdb.d") and loaded instead of solved on a restart
  const char *dir = getenv("CKPT_DIR") ? getenv("CKPT_DIR") : "egdb.d";
  { char cmd[300]; snprintf(cmd, sizeof cmd, "mkdir -p %s", dir); if (system(cmd)) {} }
  for (int i = 0; i < NC; i++) {
    Cls *c = &C[i]; char fn[300]; snprintf(fn, sizeof fn, "%s/%d%d%d%d.bin", dir, c->bm, c->bk, c->wm, c->wk);
    size_t len = ((size_t)c->n * 2 + 3) / 4; FILE *cf = fopen(fn, "rb");
    if (cf) { c->v = malloc(len); size_t got = fread(c->v, 1, len, cf); fclose(cf); if (got == len) { fprintf(stderr, "class %d%d-%d%d  loaded\n", c->bm, c->bk, c->wm, c->wk); continue; } free(c->v); c->v = 0; }
    solve(c);
    char tmp[310]; snprintf(tmp, sizeof tmp, "%s.tmp", fn); cf = fopen(tmp, "wb"); fwrite(c->v, 1, len, cf); fclose(cf); rename(tmp, fn);
  }
  // symmetry check: colour-flipped positions must have the same value
  if (!getenv("NOSYM")) { u64 bad = 0, tot = 0;
    for (int ci = 0; ci < NC; ci++) { Cls *c = &C[ci];
      for (u32 i = 0; i < c->n; i++) { Pos p; decode(i, c->bm, c->bk, c->wm, c->wk, &p); if (p.p[1] & ~p.k & ROW[0]) continue;
        for (int s = 0; s < 2; s++) { p.side = s; Pos q; q.p[0] = q.p[1] = q.k = 0; q.side = s ^ 1;
          for (int j = 0; j < 32; j++) { if (p.p[0] >> j & 1) q.p[1] |= 1u << (31 - j); if (p.p[1] >> j & 1) q.p[0] |= 1u << (31 - j); if (p.k >> j & 1) q.k |= 1u << (31 - j); }
          tot++; if (lookup(&p, 0) != lookup(&q, 0)) { if (bad < 5) fprintf(stderr, "asym b=%08x w=%08x k=%08x s=%d : %d vs %d\n", p.p[0], p.p[1], p.k, s, lookup(&p, 0), lookup(&q, 0)); bad++; } } } }
    fprintf(stderr, "symmetry: %llu / %llu differ\n", (unsigned long long)bad, (unsigned long long)tot); }
  // file: "CKDB", count, then per class: bm bk wm wk (u8 each), byte length (u32); then the data blocks in the same order
  FILE *f = fopen(argc > 2 ? argv[2] : "egdb.bin", "wb");
  fwrite("CKDB", 1, 4, f); u32 nc = NC; fwrite(&nc, 4, 1, f);
  for (int i = 0; i < NC; i++) { u8 h[4] = { (u8)C[i].bm, (u8)C[i].bk, (u8)C[i].wm, (u8)C[i].wk }; u32 len = (u32)(((size_t)C[i].n * 2 + 3) / 4); fwrite(h, 1, 4, f); fwrite(&len, 4, 1, f); }
  for (int i = 0; i < NC; i++) fwrite(C[i].v, 1, ((size_t)C[i].n * 2 + 3) / 4, f);
  fclose(f);
  return 0;
}
