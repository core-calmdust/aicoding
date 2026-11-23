// Positions of rvtrain (17-byte records, one file per ply) -> the records of netz.py / pnet.py (130 bytes: 62 uint16
// pattern indices within each pattern's table, 4 uint8 extras, the ply, the target), with the plies mixed so that the
// file can be read from the start to the end.
//   cc -O3 -o rvx netz/rvx.c -lz && ./rvx <folder with plyNN.bin> out.x [--every N] [--skip K]
//   --every N: one position in N (default 4, about 300 million of 1.2 billion = 40 GB); --skip K: start at the K-th of
//   each N (a different K gives positions that the first file does not have: use it for valid.x)
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "../rvcommon.h"
#define NF 52
int main(int argc, char **argv) {
  if (argc < 3) { fprintf(stderr, "usage: rvx folder out.x [--every N] [--skip K]\n"); return 1; }
  int every = 4, skip = 0; long maxn = 0;
  for (int i = 3; i < argc; i++) { if (!strcmp(argv[i], "--every")) every = atoi(argv[++i]); else if (!strcmp(argv[i], "--skip")) skip = atoi(argv[++i]); else if (!strcmp(argv[i], "--max")) maxn = atol(argv[++i]); }
  Model m; model_init(&m, 'B', 60, 4);
  FILE *in[NF], *out = fopen(argv[2], "wb"); long size[NF], big = 0, total = 0; int n = 0;
  for (int p = 0; p < 60; p++) { char fn[1024]; snprintf(fn, sizeof fn, "%s/ply%02d.bin", argv[1], p); FILE *f = fopen(fn, "rb"); if (!f) continue;
    fseek(f, 0, SEEK_END); size[n] = ftell(f) / sizeof(Rec); fseek(f, 0, SEEK_SET); if (size[n] > big) big = size[n]; in[n++] = f; }
  if (!n || !out) { fprintf(stderr, "cannot open\n"); return 1; }
  enum { CH = 8192 }; Rec *rb = malloc(CH * sizeof(Rec)); uint8_t *ob = malloc(CH * 130); uint32_t f[70]; long cnt[NF] = {0}; int alive = n;
  while (alive && (!maxn || total < maxn)) {
    alive = 0;
    for (int k = 0; k < n; k++) {                               // a chunk of each ply, in proportion to its size
      long want = (long)((double)CH * size[k] / big); if (want < 1) want = 1;
      long got = fread(rb, sizeof(Rec), want, in[k]); if (got <= 0) continue;
      alive = 1; long w = 0;
      for (long i = 0; i < got; i++) {
        if ((cnt[k]++ % every) != skip) continue;
        const Rec *r = rb + i; uint8_t *o = ob + w * 130; rv_features(&m, r->P, r->O, f);
        for (int j = 0; j < 62; j++) { uint16_t v = (uint16_t)(f[j] - PT_OFF[m.set][j]); memcpy(o + 2 * j, &v, 2); }
        for (int j = 0; j < 4; j++) o[124 + j] = (uint8_t)(f[62 + j] - m.extOff - 64 * j);
        o[128] = (uint8_t)(rv_pc(r->P | r->O) - 4); o[129] = (uint8_t)r->t; w++;
      }
      fwrite(ob, 130, w, out); total += w;
    }
  }
  fclose(out); printf("%ld positions -> %s (%.1f GB)\n", total, argv[2], total * 130 / 1e9); return 0;
}
