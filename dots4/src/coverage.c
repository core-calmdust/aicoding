/* Book coverage check: walk every opponent reply; every AI turn before ply PF (AI first) / PS (AI second) must be in the
   merged book (or have a forced capture). Uses the same merge rule as mkbook.js (first file wins). */
#include "dots.c"
#include <stdio.h>
#define VB 22
static u64 vk[1 << VB]; static i8 vm[1 << VB];
static u64 vh(u64 k) { return (k * 0x9E3779B97F4A7C15ULL) >> (64 - VB); }
static int vfind(u64 k) { u64 h = vh(k); while (vk[h]) { if (vk[h] == k + 1) return (int)h; h = (h + 1) & ((1 << VB) - 1); } return -1 - (int)h; }
static u64 ok_[1 << VB]; static int oseen(u64 k) { u64 h = vh(k ^ 77); while (ok_[h]) { if (ok_[h] == k + 1) return 1; h = (h + 1) & ((1 << VB) - 1); } ok_[h] = k + 1; return 0; }
static int PF, PS; static long nodes_ai, missing_, forced_;
static int completes(u64 m, int e) { int k = 0; for (int j = 0; j < 2; j++) { int b = j ? eb1[e] : eb0[e]; if (b < 0) continue; int c = 0; for (int i = 0; i < 4; i++) if ((m >> be[b * 4 + i]) & 1) c++; if (c == 3) k++; } return k; }
static void opp(u64 m, int ply, int side);
static void ai(u64 m, int ply, int side) {
  int P = side ? PS : PF; set_pos(m);
  if (ply >= P || filled == B) return;
  i8 tmp[MAXE]; int mv;
  if (n3 > 0 && capture_moves(tmp) < 0) { mv = -1 - capture_moves(tmp); forced_++; }
  else {
    u64 key = canon(m); int s = canon_sym, h = vfind(key); nodes_ai++;
    if (h < 0) { missing_++; if (missing_ < 10) printf("missing %llx ply %d side %d\n", m, ply, side); return; }
    mv = invp[s][(int)vm[h]]; if ((m >> mv) & 1) mv = twin[mv];
  }
  u64 m1 = m | (1ULL << mv);
  if (completes(m, mv)) ai(m1, ply + 1, side); else opp(m1, ply + 1, side);
}
static void opp(u64 m, int ply, int side) {
  int P = side ? PS : PF; if (ply + 1 >= P) return;
  set_pos(m); if (filled == B) return;
  if (oseen(canon(m) * 4 + side)) return;
  for (int e = 0; e < E; e++) { if ((m >> e) & 1) continue; u64 m1 = m | (1ULL << e); if (completes(m, e)) opp(m1, ply + 1, side); else ai(m1, ply + 1, side); }
}
int main(int argc, char **argv) {
  setup(4, 4); PF = atoi(argv[2]); PS = atoi(argv[3]);
  long n = 0;
  for (int i = 0; i < 16; i++) {
    char p[600]; snprintf(p, sizeof p, "%s/book_%d.txt", argv[1], i); FILE *f = fopen(p, "r"); if (!f) continue; char line[256];
    while (fgets(line, sizeof line, f)) { u64 k; int mv, v, pl, sd; if (sscanf(line, "%llx %d %d %d %d", &k, &mv, &v, &pl, &sd) == 5) { int h = vfind(k); if (h < 0) { h = -1 - h; vk[h] = k + 1; vm[h] = (i8)mv; n++; } } }
    fclose(f);
  }
  ai(0, 0, 0); opp(0, 0, 1);
  printf("book %ld entries; AI turns visited %ld (forced captures %ld), missing %ld\n", n, nodes_ai, forced_, missing_);
  return 0;
}
