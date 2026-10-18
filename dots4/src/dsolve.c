/* Native driver for the 4x4 solver: root value with checkpoints. Resumable (TT entries dumped atomically). */
#include "dots.c"
#include <stdio.h>
#include <unistd.h>
#include <sys/stat.h>

static const char *ckdir; static double t_start, t_lastdump, t_limit_ms;
static i32 timed_out;
static char logbuf[256];

static void logmsg(const char *fmt, const char *a) {
  char p[512]; snprintf(p, sizeof p, "%s/solver.log", ckdir);
  FILE *f = fopen(p, "a"); if (!f) return;
  time_t t = time(0); char ts[64]; strftime(ts, sizeof ts, "%Y-%m-%dT%H:%M:%SZ", gmtime(&t));
  fprintf(f, "%s ", ts); fprintf(f, fmt, a); fprintf(f, "\n"); fclose(f);
}
/* dump TT entries with at least `thr` undrawn edges (chosen so the file stays below ~25M entries) */
static void tt_dump(const char *name) {
  u64 size = 1ULL << ttbits; long hist[MAXE + 1] = { 0 };
  for (u64 i = 0; i < size; i++) if (tt[i]) hist[E - popc(tt[i] & KEYMASK)]++;
  long acc = 0; int thr = E;
  for (int u = E; u >= 0; u--) { if (acc + hist[u] > 25000000) break; acc += hist[u]; thr = u; }
  char tmp[512], fin[512]; snprintf(tmp, sizeof tmp, "%s/%s.tmp", ckdir, name); snprintf(fin, sizeof fin, "%s/%s", ckdir, name);
  FILE *f = fopen(tmp, "wb"); if (!f) return;
  long n = 0;
  for (u64 i = 0; i < size; i++) if (tt[i] && E - popc(tt[i] & KEYMASK) >= thr) { fwrite(&tt[i], 8, 1, f); n++; }
  fflush(f); fsync(fileno(f)); fclose(f); rename(tmp, fin);
  snprintf(logbuf, sizeof logbuf, "tt dump %s: %ld entries (undrawn >= %d), nodes %.3g", name, n, thr, nodes); logmsg("%s", logbuf);
}
static long tt_load(const char *name) {
  char fin[512]; snprintf(fin, sizeof fin, "%s/%s", ckdir, name);
  FILE *f = fopen(fin, "rb"); if (!f) return 0;
  u64 x; long n = 0;
  while (fread(&x, 8, 1, f) == 1) { tt_store(x & KEYMASK, E_LO(x), E_HI(x), E_MV(x) == 63 ? -1 : E_MV(x)); n++; }
  fclose(f); return n;
}
static const char *dumpname = "tt_root.bin";
static void ck_hook(void) {
  double now = js_now();
  if (now - t_start > t_limit_ms) { timed_out = 1; aborted = 1; return; }
  if (now - t_lastdump > 600000) { tt_dump(dumpname); t_lastdump = js_now(); }
}

int main(int argc, char **argv) {
  if (argc < 4) { fprintf(stderr, "usage: dsolve root <ttbits> <ckdir> [minutes] [hexmask] [name]\n"); return 1; }
  int bits = atoi(argv[2]); ckdir = argv[3]; double minutes = argc > 4 ? atof(argv[4]) : 55;
  u64 m = argc > 5 ? strtoull(argv[5], 0, 16) : 0;
  if (argc > 6) dumpname = argv[6];
  setup(4, 4); tt_init(bits);
  long n = tt_load(dumpname);
  snprintf(logbuf, sizeof logbuf, "start root solve mask=%llx, loaded %ld TT entries", m, n); logmsg("%s", logbuf);
  t_start = t_lastdump = js_now(); t_limit_ms = minutes * 60000; hook = ck_hook;
  /* outcome first (window around 0), then the exact value */
  int lo = -100, hi = 100, v = 0;
  limits(0, 0); v = value_of(m, -1, 1);
  if (timed_out) { tt_dump(dumpname); logmsg("%s", "time limit reached during outcome search; resume to continue"); return 3; }
  snprintf(logbuf, sizeof logbuf, "outcome search (-1,1) -> %d  (%.1f min, %.3g nodes)", v, (js_now() - t_start) / 60000, nodes); logmsg("%s", logbuf);
  printf("%s\n", logbuf); fflush(stdout);
  if (v > -1 && v < 1) { lo = hi = v; }
  else {
    if (v >= 1) lo = v; else hi = v;
    limits(0, 0); int x = value_of(m, -100, 100);
    if (timed_out) { tt_dump(dumpname); logmsg("%s", "time limit reached during exact search; resume to continue"); return 3; }
    lo = hi = x;
  }
  tt_dump(dumpname);
  /* root move values */
  char p[512]; snprintf(p, sizeof p, "%s/root_%llx.txt", ckdir, m);
  char tmp[512]; snprintf(tmp, sizeof tmp, "%s.tmp", p);
  FILE *f = fopen(tmp, "w"); fprintf(f, "mask %llx value %d (%.1f min total in this run)\n", m, lo, (js_now() - t_start) / 60000); fclose(f); rename(tmp, p);
  snprintf(logbuf, sizeof logbuf, "exact value %d", lo); logmsg("%s", logbuf);
  printf("value %d\n", lo);
  return 0;
}
