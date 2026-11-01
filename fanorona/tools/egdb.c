// Endgame databases for Fanorona: every position with a pieces (side to move) v b pieces, a + b <= EGMAX,
// solved by forward iteration level by level (exact distance in plies). Output: ../egdb.bin
//   header "FEG1", count; then per table: a, b, 0, 0, length (u32); then the bytes. Build: see tools/build.sh
#define NATIVE
#include "../engine.c"
static u8 *T[EGMAX + 1][EGMAX + 1];
static u8 *R[EGMAX + 1][EGMAX + 1];   // resolved flags (current table)
// unrank: the k-subset with the given rank (combinatorial number system), into an array of indices
static void unrank(u32 r, int n, int k, int *out) {
  for (int j = k; j >= 1; j--) { int i = j - 1; while (i + 1 < n && CB[i + 1][j] <= r) i++; out[j - 1] = i; r -= CB[i][j]; }
}
static void posOf(int a, int b, u32 idx, u64 *own, u64 *opp) {
  u32 nb = CB[45 - a][b]; u32 r1 = idx / nb, r2 = idx % nb; int A[8], B[8];
  unrank(r1, 45, a, A); *own = 0; for (int j = 0; j < a; j++) *own |= BIT(A[j]);
  unrank(r2, 45 - a, b, B);
  int map[45], m = 0; for (int i = 0; i < 45; i++) if (!(*own & BIT(i))) map[m++] = i;
  *opp = 0; for (int j = 0; j < b; j++) *opp |= BIT(map[B[j]]);
}
static Move ML[MAXMV];
int main(int argc, char **argv) {
  initGeo(); initCB();
  int maxN = argc > 1 ? atoi(argv[1]) : EGMAX;
  FILE *f = fopen(argc > 2 ? argv[2] : "egdb.bin", "wb");
  int cnt = 0; for (int n = 2; n <= maxN; n++) for (int a = 1; a < n; a++) if (a <= EGMAX && n - a <= EGMAX) cnt++;
  fwrite("FEG1", 1, 4, f); fwrite(&cnt, 4, 1, f);
  for (int n = 2; n <= maxN; n++) {
    // all tables of this total are solved together (no capture keeps the total; a capture lowers it)
    for (int a = 1; a < n; a++) { int b = n - a; if (a > EGMAX || b > EGMAX) continue; u32 sz = eg_size(a, b); T[a][b] = calloc(sz, 1); R[a][b] = calloc(sz, 1); EG[a][b] = T[a][b]; }
    egMaxN = 0;   // no probing inside gen; lookups are done by hand below
    for (int level = 0; level < 250; level++) {
      long changed = 0;
      for (int a = 1; a < n; a++) {
        int b = n - a; if (a > EGMAX || b > EGMAX) continue;
        u32 sz = eg_size(a, b);
        for (u32 idx = 0; idx < sz; idx++) {
          if (R[a][b][idx]) continue;
          Pos p; p.side = 0; posOf(a, b, idx, &p.p[0], &p.p[1]);
          int nm = gen(&p, ML);
          if (!nm) { if (level == 0) { T[a][b][idx] = 128; R[a][b][idx] = 1; changed++; } continue; }
          if (level == 0) continue;
          int win = 0, allWin = 1, maxW = 0;
          for (int i = 0; i < nm; i++) {
            Pos q = p; doMove(&q, &ML[i]);
            u64 o2 = q.p[q.side], p2 = q.p[q.side ^ 1]; int a2 = pc(o2), b2 = pc(p2);
            int v;
            if (!a2) v = 128;   // the opponent has nothing left: it lost
            else {
              u32 j = egIndex(o2, p2, a2, b2);
              if (a2 + b2 == n) { if (!R[a2][b2][j]) { allWin = 0; continue; } v = T[a2][b2][j]; }
              else v = T[a2][b2][j];
            }
            if (v >= 128) { int d = v - 128; if (d == level - 1) win = 1; if (d < level - 1) win = 1; allWin = 0; }   // child lost
            else if (v == 0) allWin = 0;
            else { if (v > maxW) maxW = v; }
          }
          if (win) { T[a][b][idx] = (u8)(level > 127 ? 127 : level); R[a][b][idx] = 1; changed++; }
          else if (allWin && maxW == level - 1) { T[a][b][idx] = (u8)(128 + (level > 127 ? 127 : level)); R[a][b][idx] = 1; changed++; }
        }
      }
      if (level > 2 && !changed) { fprintf(stderr, "n=%d done at level %d\n", n, level); break; }
    }
    for (int a = 1; a < n; a++) {
      int b = n - a; if (a > EGMAX || b > EGMAX) continue;
      u32 sz = eg_size(a, b); long w = 0, l = 0, d = 0; for (u32 i = 0; i < sz; i++) { u8 v = T[a][b][i]; if (!v) d++; else if (v < 128) w++; else l++; }
      fprintf(stderr, "  %dv%d: %u positions  win %ld  loss %ld  draw %ld\n", a, b, sz, w, l, d);
      u8 hdr[4] = { (u8)a, (u8)b, 0, 0 }; fwrite(hdr, 1, 4, f); fwrite(&sz, 4, 1, f); fwrite(T[a][b], 1, sz, f);
    }
  }
  fclose(f);
  return 0;
}
