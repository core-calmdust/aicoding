// Learns the move-prior weights (engine.c pfeat) from self-play search records (tools/gen_prior.c):
// softmax over the empty cells, target = the root visit distribution. Writes prior_w.h.
//   gcc -O3 -march=native -DNATIVE -o /tmp/hextrain tools/train_prior.c -lm
//   hextrain epochs out.h data1.txt [data2.txt …]
#define NATIVE 1
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>
static double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec * 1000.0 + t.tv_nsec / 1e6; }
#define PRIOR_W "/dev/null"
static const short PW[1] = { 0 }; static const int PW_ON = 0; static const float PW_SCALE = 1;
#include "../engine.c"
typedef struct { int off, ncell, best; } Rec;   // cells: [off .. off+ncell) in CELLF / CELLT
static unsigned short *FE; static unsigned char *FN; static float *TG; static long nCell, capCell;
static Rec *R; static int nRec, capRec;
static float W[PF_N], G2[PF_N];
int main(int argc, char **argv) {
  int EP = atoi(argv[1]); char line[8192];
  capCell = 1 << 20; FE = malloc(capCell * PF_MAX * 2); FN = malloc(capCell); TG = malloc(capCell * 4);
  capRec = 1 << 16; R = malloc(capRec * sizeof(Rec));
  for (int a = 3; a < argc; a++) {
    FILE *f = fopen(argv[a], "r");
    while (fgets(line, sizeof line, f)) {
      int n, side, sw, last, pos; char bs[200];
      if (sscanf(line, "%d %d %d %199s %d |%n", &n, &side, &sw, bs, &last, &pos) < 5) continue;
      geometry(n); u8 b[MAXC]; for (int i = 0; i < NC; i++) b[i] = bs[i] - '0';
      float t[MAXC] = { 0 }; double tot = 0; char *q = line + pos; int m, v, used;
      while (sscanf(q, " %d:%d%n", &m, &v, &used) == 2) { q += used; if (m >= 0 && m < NC && !b[m]) { t[m] += v; tot += v; } }
      if (tot <= 0) continue;
      if (nRec == capRec) { capRec *= 2; R = realloc(R, capRec * sizeof(Rec)); }
      if (nCell + NC > capCell) { capCell *= 2; FE = realloc(FE, capCell * PF_MAX * 2); FN = realloc(FN, capCell); TG = realloc(TG, capCell * 4); }
      Rec *r = &R[nRec++]; r->off = nCell; r->ncell = 0; float bt = -1;
      for (int c = 0; c < NC; c++) if (!b[c]) {
        int fs[PF_MAX]; int k = pfeat(b, c, side, last, fs);
        for (int j = 0; j < k; j++) FE[nCell * PF_MAX + j] = fs[j];
        FN[nCell] = k; TG[nCell] = t[c] / tot; if (t[c] > bt) { bt = t[c]; r->best = r->ncell; }
        nCell++; r->ncell++;
      }
    }
    fclose(f);
  }
  fprintf(stderr, "%d positions, %ld cells\n", nRec, nCell);
  int *ord = malloc(nRec * sizeof(int)); for (int i = 0; i < nRec; i++) ord[i] = i;
  float lr = .1f; double sc[MAXC];
  for (int ep = 0; ep <= EP; ep++) {
    // shuffle (train = every position not ≡ 0 mod 20)
    for (int i = nRec - 1; i > 0; i--) { int j = rndN(i + 1), x = ord[i]; ord[i] = ord[j]; ord[j] = x; }
    double loss[2] = { 0, 0 }; int hit[2] = { 0, 0 }, cnt[2] = { 0, 0 };
    for (int ii = 0; ii < nRec; ii++) {
      int ri = ord[ii], val = ri % 20 == 0; Rec *r = &R[ri];
      double mx = -1e30, z = 0; int arg = 0;
      for (int j = 0; j < r->ncell; j++) { long ci = r->off + j; double s = 0; for (int k = 0; k < FN[ci]; k++) s += W[FE[ci * PF_MAX + k]]; sc[j] = s; if (s > mx) { mx = s; arg = j; } }
      for (int j = 0; j < r->ncell; j++) { sc[j] = exp(sc[j] - mx); z += sc[j]; }
      double l = 0; for (int j = 0; j < r->ncell; j++) { float tg = TG[r->off + j]; if (tg > 0) l -= tg * log(sc[j] / z + 1e-12); }
      loss[val] += l; cnt[val]++; if (arg == r->best) hit[val]++;
      if (val || ep == 0) continue;   // epoch 0: baseline (all weights 0)
      for (int j = 0; j < r->ncell; j++) {
        long ci = r->off + j; float g = (float)(sc[j] / z) - TG[ci];
        for (int k = 0; k < FN[ci]; k++) { int fi = FE[ci * PF_MAX + k]; float gg = g + 1e-4f * W[fi]; G2[fi] += gg * gg; W[fi] -= lr * gg / (sqrtf(G2[fi]) + 1e-8f); }
      }
    }
    fprintf(stderr, "epoch %d  train loss %.4f top1 %.3f   val loss %.4f top1 %.3f\n", ep, loss[0] / cnt[0], (double)hit[0] / cnt[0], loss[1] / cnt[1], (double)hit[1] / cnt[1]);
  }
  float mw = 0; for (int i = 0; i < PF_N; i++) if (fabsf(W[i]) > mw) mw = fabsf(W[i]);
  float S = 32000.f / mw; FILE *o = fopen(argv[2], "w");
  fprintf(o, "// learned move prior (tools/train_prior.c, %d positions): weight = PW[i] / PW_SCALE\nstatic const int PW_ON = 1; static const float PW_SCALE = %.3ff;\nstatic const short PW[%d] = {", nRec, S, PF_N);
  for (int i = 0; i < PF_N; i++) fprintf(o, "%s%d", i ? "," : "", (int)lrintf(W[i] * S));
  fprintf(o, "};\n"); fclose(o);
  return 0;
}
