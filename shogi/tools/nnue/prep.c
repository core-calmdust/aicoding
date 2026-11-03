/* prep: filter and shuffle YaneuraOu PackedSfenValue files into one training file.
   usage: prep out.bin [--keep 0.5] [--minply 16] [--maxscore 3000] in1.bin in2.bin ...
   Kept: not in check, best move is not a capture (quiet positions, like the Floodgate data
   of the current net), game ply >= minply, |score| <= maxscore. --keep subsamples the rest
   (neighbouring positions of one game are very alike). The output is shuffled. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "psv.h"

#define NBK 128
static unsigned long long rs = 0x9E3779B97F4A7C15ULL;
static unsigned long long xr(void) { rs ^= rs << 13; rs ^= rs >> 7; rs ^= rs << 17; return rs; }

int main(int argc, char **argv) {
  if (argc < 3) { fprintf(stderr, "usage: prep out.bin [--keep p] [--minply n] [--maxscore n] in.bin...\n"); return 1; }
  const char *out = argv[1];
  double keep = 1.0; int minply = 16, maxscore = 3000;
  char tmpn[NBK][600]; FILE *bk[NBK];
  for (int i = 0; i < NBK; i++) { snprintf(tmpn[i], sizeof tmpn[i], "%s.part%03d", out, i); bk[i] = fopen(tmpn[i], "wb"); if (!bk[i]) { perror(tmpn[i]); return 1; } }
  long long seen = 0, kept = 0, bad = 0, chk = 0, cap = 0, ply = 0, sc = 0;
  static PSV buf[65536];
  for (int a = 2; a < argc; a++) {
    if (!strcmp(argv[a], "--keep")) { keep = atof(argv[++a]); continue; }
    if (!strcmp(argv[a], "--minply")) { minply = atoi(argv[++a]); continue; }
    if (!strcmp(argv[a], "--maxscore")) { maxscore = atoi(argv[++a]); continue; }
    FILE *f = fopen(argv[a], "rb"); if (!f) { perror(argv[a]); continue; }
    size_t n;
    while ((n = fread(buf, sizeof(PSV), 65536, f)) > 0) {
      for (size_t i = 0; i < n; i++) {
        const PSV *r = &buf[i]; Pos p; seen++;
        if (psv_decode(r, &p)) { bad++; continue; }
        if (r->ply < minply) { ply++; continue; }
        if (r->score > maxscore || r->score < -maxscore) { sc++; continue; }
        if (psv_in_check(&p)) { chk++; continue; }
        if (r->move && psv_capture(r, &p)) { cap++; continue; }
        if (keep < 1.0 && (xr() >> 11) * (1.0 / 9007199254740992.0) >= keep) continue;
        fwrite(r, sizeof(PSV), 1, bk[xr() % NBK]); kept++;
      }
    }
    fclose(f);
    fprintf(stderr, "%s: seen %lld kept %lld (bad %lld check %lld capture %lld early %lld score %lld)\n", argv[a], seen, kept, bad, chk, cap, ply, sc);
  }
  for (int i = 0; i < NBK; i++) fclose(bk[i]);
  /* shuffle each bucket in memory and append */
  FILE *o = fopen(out, "wb"); if (!o) { perror(out); return 1; }
  for (int i = 0; i < NBK; i++) {
    FILE *f = fopen(tmpn[i], "rb"); fseek(f, 0, SEEK_END); long sz = ftell(f); fseek(f, 0, SEEK_SET);
    long m = sz / (long)sizeof(PSV); PSV *d = malloc((size_t)(m ? m : 1) * sizeof(PSV));
    if (fread(d, sizeof(PSV), m, f) != (size_t)m) { fprintf(stderr, "read error\n"); return 1; }
    fclose(f); remove(tmpn[i]);
    for (long k = m - 1; k > 0; k--) { long j = xr() % (k + 1); PSV t = d[k]; d[k] = d[j]; d[j] = t; }
    fwrite(d, sizeof(PSV), m, o); free(d);
  }
  fclose(o);
  fprintf(stderr, "done: %lld positions -> %s (%.1f GB)\n", kept, out, kept * 40.0 / 1e9);
  return 0;
}
