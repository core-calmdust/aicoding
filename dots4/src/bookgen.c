/* Opening book generator for 4x4: every position the AI (either side) can face before ply P, AI moves exact-optimal.
 * Book node = position with the AI to move (canonical key). Results are appended to <dir>/book_<id>.txt
 * ("key move value" in the canonical frame), so a restart skips solved nodes (resumable).
 * usage: bookgen <ttbits> <dir> <id> <nprocs> <P_first> <P_second> [minutes] [symply]
 *   P_first: AI-first book covers AI turns at ply < P_first; P_second likewise for the AI moving second.
 *   symply: prefer optimal moves that leave a symmetric position at AI plies <= symply. */
#include "dots.c"
#include <stdio.h>
#include <unistd.h>

static const char *dir; static int myid, fileid, nproc, PF, PS, symply = 99;
static double t_start, t_limit, t_lastdump, t_lastflush;
static FILE *out;
static long solved_now, total_nodes_k;

/* visited / known AI nodes: open addressing on canonical key -> (move, value) */
#define VBITS 24
static u64 *vkey; static i8 *vmv, *vval;
static u64 vhash(u64 k) { return (k * 0x9E3779B97F4A7C15ULL) >> (64 - VBITS); }
static int vfind(u64 k) { u64 h = vhash(k); while (vkey[h]) { if (vkey[h] == k + 1) return (int)h; h = (h + 1) & ((1 << VBITS) - 1); } return -1 - (int)h; }
static void vput(u64 k, int mv, int val) { int h = vfind(k); if (h < 0) h = -1 - h; vkey[h] = k + 1; vmv[h] = (i8)mv; vval[h] = (i8)val; }
/* opponent-node visited set (to avoid re-expanding transpositions in this run) */
static u64 *okey;
static int oseen(u64 k) { u64 h = vhash(k ^ 0x5555); while (okey[h]) { if (okey[h] == k + 1) return 1; h = (h + 1) & ((1 << VBITS) - 1); } okey[h] = k + 1; return 0; }

static void tt_dump_small(void) {
  /* keep the TT entries with >= 26 undrawn edges for a warm restart */
  char tmp[600], fin[600]; snprintf(tmp, sizeof tmp, "%s/tt_book_%d.bin.tmp", dir, fileid); snprintf(fin, sizeof fin, "%s/tt_book_%d.bin", dir, fileid);
  FILE *f = fopen(tmp, "wb"); if (!f) return;
  u64 size = 1ULL << ttbits; long n = 0;
  for (u64 i = 0; i < size; i++) if (tt[i] && E - popc(tt[i] & KEYMASK) >= 26) { fwrite(&tt[i], 8, 1, f); n++; }
  fflush(f); fsync(fileno(f)); fclose(f); rename(tmp, fin);
}
static void tt_load_small(void) {
  char fin[600]; snprintf(fin, sizeof fin, "%s/tt_book_%d.bin", dir, fileid);
  FILE *f = fopen(fin, "rb"); if (!f) return; u64 x;
  while (fread(&x, 8, 1, f) == 1) tt_store(x & KEYMASK, E_LO(x), E_HI(x), E_MV(x) == 63 ? -1 : E_MV(x));
  fclose(f);
}
static int timed_out;
static void bk_hook(void) {
  double now = js_now();
  if (now - t_start > t_limit) { timed_out = 1; aborted = 1; }
}
static void maybe_checkpoint(void) {
  double now = js_now();
  if (now - t_lastflush > 30000) { fflush(out); fsync(fileno(out)); t_lastflush = now; }
  if (now - t_lastdump > 600000) { fflush(out); fsync(fileno(out)); tt_dump_small(); t_lastdump = js_now(); }
}

/* is position m symmetric under some non-identity symmetry (incl. corner twins)? returns stabilizer size */
static int stab(u64 m) {
  set_pos(m); u64 c0 = corner_norm(M); int k = 0;
  for (int s = 0; s < NS; s++) if (corner_norm(MS[s]) == c0) k++;
  return k;
}
static int completes(u64 m, int e) { int k = 0; for (int j = 0; j < 2; j++) { int b = j ? eb1[e] : eb0[e]; if (b < 0) continue; int c = 0; for (int i = 0; i < 4; i++) if ((m >> be[b * 4 + i]) & 1) c++; if (c == 3) k++; } return k; }
static int boxes_left(u64 m) { set_pos(m); return B - filled; }
static void expand_opp(u64 m, int ply, int side);

/* AI to move in m (side 0: AI moved first, 1: second) */
static void expand_ai(u64 m, int ply, int side) {
  if (timed_out) return;
  int P = side ? PS : PF;
  if (ply >= P || boxes_left(m) == 0) return;
  set_pos(m);
  int mv;
  i8 tmp[MAXE];
  if (n3 > 0 && capture_moves(tmp) < 0) { set_pos(m); int r = capture_moves(tmp); mv = -1 - r; }   /* forced capture: no book entry needed */
  else {
    u64 key = canon(m); int s = canon_sym; int h = vfind(key);
    if (h >= 0) { int cm = vmv[h]; mv = invp[s][cm]; if ((m >> mv) & 1) mv = twin[mv]; }
    else {
      int bm, pbm, pbv; limits(0, 0); double ts = js_now();
      int V = best_of(m, -1, &bm, &pbm, &pbv);
      if (V == -999) return;   /* timed out */
      total_nodes_k += (long)(nodes / 1000);
      /* prefer an equally good move that leaves a symmetric position (fewer distinct opponent replies) */
      if (ply <= symply) {
        int bstab = stab(m | (1ULL << bm)); i8 cand[MAXE]; int nc = root_moves(m, cand);
        for (int i = 0; i < nc; i++) {
          int e = cand[i]; if (e == bm) continue;
          int st = stab(m | (1ULL << e)); if (st <= bstab) continue;
          limits(0, 0); int k = completes(m, e);
          int v = move_value(m, e, V - 1, V + 1); if (v == -999) return;
          (void)k;
          if (v >= V) { bm = e; bstab = st; }
        }
      }
      mv = bm;
      set_pos(m); key = canon(m); s = canon_sym;
      vput(key, perm[s][mv], V);
      fprintf(out, "%llx %d %d %d %d %.0f\n", key, perm[s][mv], V, ply, side, js_now() - ts);
      solved_now++;
      maybe_checkpoint();
    }
  }
  u64 m1 = m | (1ULL << mv);
  if (completes(m, mv)) expand_ai(m1, ply + 1, side); else expand_opp(m1, ply + 1, side);
}

static void expand_opp(u64 m, int ply, int side) {
  if (timed_out) return;
  int P = side ? PS : PF;
  if (ply + 1 >= P) return;
  if (boxes_left(m) == 0) return;
  if (oseen(canon(m) * 4 + side)) return;
  /* distinct opponent moves up to symmetry */
  u64 seen[MAXE]; int ns = 0;
  for (int e = 0; e < E; e++) {
    if ((m >> e) & 1) continue;
    u64 m1 = m | (1ULL << e), k = canon(m1); int dup = 0;
    for (int i = 0; i < ns; i++) if (seen[i] == k) dup = 1;
    if (dup) continue; seen[ns++] = k;
    /* split the work below a fixed opponent level by a hash of the child (shared levels above come from phase 1) */
    if (nproc > 1 && ply == (side ? 2 : 3) && (int)(((k * 0x9E3779B97F4A7C15ULL) >> 40) % nproc) != myid) continue;
    if (completes(m, e)) expand_opp(m1, ply + 1, side); else expand_ai(m1, ply + 1, side);
    if (timed_out) return;
  }
}

int main(int argc, char **argv) {
  if (argc < 7) { fprintf(stderr, "usage: bookgen <ttbits> <dir> <id> <nprocs> <P_first> <P_second> [minutes] [symply]\n"); return 1; }
  int bits = atoi(argv[1]); dir = argv[2]; myid = atoi(argv[3]); fileid = getenv("FILEID") ? atoi(getenv("FILEID")) : myid; nproc = atoi(argv[4]); PF = atoi(argv[5]); PS = atoi(argv[6]);
  double minutes = argc > 7 ? atof(argv[7]) : 55; if (argc > 8) symply = atoi(argv[8]);
  setup(4, 4); tt_init(bits);
  vkey = calloc(1 << VBITS, 8); vmv = calloc(1 << VBITS, 1); vval = calloc(1 << VBITS, 1); okey = calloc(1 << VBITS, 8);
  /* load every result file (all processes) */
  long loaded = 0;
  for (int i = 0; i < 16; i++) {
    char p[600]; snprintf(p, sizeof p, "%s/book_%d.txt", dir, i);
    FILE *f = fopen(p, "r"); if (!f) continue;
    char line[256];
    while (fgets(line, sizeof line, f)) { u64 k; int mv, v, pl, sd; if (sscanf(line, "%llx %d %d %d %d", &k, &mv, &v, &pl, &sd) == 5 && strchr(line, '\n')) { vput(k, mv, v); loaded++; } }
    fclose(f);
  }
  tt_load_small();
  if (getenv("TTSEED")) { FILE *f = fopen(getenv("TTSEED"), "rb"); u64 x; long n = 0; if (f) { while (fread(&x, 8, 1, f) == 1) { tt_store(x & KEYMASK, E_LO(x), E_HI(x), E_MV(x) == 63 ? -1 : E_MV(x)); n++; } fclose(f); } fprintf(stderr, "seeded %ld TT entries\n", n); }
  char p[600]; snprintf(p, sizeof p, "%s/book_%d.txt", dir, fileid);
  /* drop a partial last line (crash during write) */
  { FILE *f = fopen(p, "r"); if (f) { fseek(f, 0, SEEK_END); long sz = ftell(f); if (sz > 0) { fseek(f, sz - 1, SEEK_SET); int c = fgetc(f); fclose(f); if (c != '\n') { FILE *g = fopen(p, "a"); fputc('\n', g); fclose(g); } } else fclose(f); } }
  out = fopen(p, "a");
  t_start = t_lastdump = t_lastflush = js_now(); t_limit = minutes * 60000; hook = bk_hook;
  fprintf(stderr, "bookgen %d/%d PF=%d PS=%d loaded %ld\n", myid, nproc, PF, PS, loaded);
  int sides = getenv("SIDES") ? atoi(getenv("SIDES")) : 3;
  if (sides & 1) expand_ai(0, 0, 0);                  /* AI moves first */
  if (!timed_out && (sides & 2)) expand_opp(0, 0, 1);  /* AI moves second */
  fflush(out); fsync(fileno(out)); fclose(out);
  tt_dump_small();
  fprintf(stderr, "done=%d solved %ld new nodes (%.1f min, %ldk search nodes)\n", !timed_out, solved_now, (js_now() - t_start) / 60000, total_nodes_k);
  return timed_out ? 3 : 0;
}
