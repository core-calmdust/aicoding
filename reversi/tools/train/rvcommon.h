// Shared by rvtrain.c and rvlabel.c: the model layout (pattern set, phases, extra features), its features as engine.js /
// engine.c compute them, and the weights file (v4: bare int16; v5: with a header — engine.js decodeV5).
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <zlib.h>
#include "patterns.h"

typedef struct __attribute__((packed)) { uint64_t P, O; int8_t t; } Rec;   // a position (P to move) and its value for P (discs)

typedef struct {
  int set;            // index into PT_* (0 = 'B', 1 = 'C')
  int nphase, next;   // phases (30 / 60), extra features (4 / 5)
  int ninst, total, extOff, phaseSize, nf;   // nf = features per position (instances + extras + bias)
  float mpc[3];       // Multi-ProbCut sigma A, B, C (0 = the engine's v4 values)
  int quant;          // (a loaded v5 file) its weights are multiples of this
} Model;

static int model_init(Model *m, char set, int nphase, int next) {
  memset(m, 0, sizeof *m);
  m->set = -1; for (int i = 0; i < PT_NSETS; i++) if (PT_NAME[i] == set) m->set = i;
  if (m->set < 0 || nphase < 1 || nphase > 64 || next < 0 || next > 5) return -1;
  m->nphase = nphase; m->next = next; m->ninst = PT_NINST[m->set]; m->total = PT_TOTAL[m->set];
  m->extOff = m->total; m->phaseSize = m->total + 64 * next + 1; m->nf = m->ninst + next + 1; m->quant = 1;
  return 0;
}
static inline int rv_phase(const Model *m, int discs) { int ply = discs - 4, ph = ply * m->nphase / 61; return ph < m->nphase ? ph : m->nphase - 1; }

static inline int rv_pc(uint64_t x) { return __builtin_popcountll(x); }
static uint64_t rv_moves(uint64_t P, uint64_t O) {
  const uint64_t E = ~(P | O), I = O & 0x7E7E7E7E7E7E7E7EULL; uint64_t m = 0, x;
#define RV_GM(SH, MSK) x = SH(P) & MSK; x |= SH(x) & MSK; x |= SH(x) & MSK; x |= SH(x) & MSK; x |= SH(x) & MSK; x |= SH(x) & MSK; m |= SH(x) & E;
#define RV_L1(v) ((v) << 1)
#define RV_R1(v) ((v) >> 1)
#define RV_L8(v) ((v) << 8)
#define RV_R8(v) ((v) >> 8)
#define RV_L9(v) ((v) << 9)
#define RV_R9(v) ((v) >> 9)
#define RV_L7(v) ((v) << 7)
#define RV_R7(v) ((v) >> 7)
  RV_GM(RV_L1, I) RV_GM(RV_R1, I) RV_GM(RV_L8, O) RV_GM(RV_R8, O) RV_GM(RV_L9, I) RV_GM(RV_R9, I) RV_GM(RV_L7, I) RV_GM(RV_R7, I)
  return m;
}
static __attribute__((unused)) uint64_t rv_flips(int sq, uint64_t P, uint64_t O) {
  const uint64_t mv = 1ULL << sq, I = O & 0x7E7E7E7E7E7E7E7EULL; uint64_t f = 0, x;
#define RV_FL(SH, MSK) x = SH(mv) & MSK; x |= SH(x) & MSK; x |= SH(x) & MSK; x |= SH(x) & MSK; x |= SH(x) & MSK; x |= SH(x) & MSK; if (SH(x) & P) f |= x;
  RV_FL(RV_L1, I) RV_FL(RV_R1, I) RV_FL(RV_L8, O) RV_FL(RV_R8, O) RV_FL(RV_L9, I) RV_FL(RV_R9, I) RV_FL(RV_L7, I) RV_FL(RV_R7, I)
  return f;
}
static uint64_t rv_neigh(uint64_t b) {
  const uint64_t a = b & 0x7F7F7F7F7F7F7F7FULL, c = b & 0xFEFEFEFEFEFEFEFEULL;
  return (a << 1) | (c >> 1) | (b << 8) | (b >> 8) | (a << 9) | (c << 7) | (a >> 7) | (c >> 9);
}
// the feature indices of a position (P to move) within its phase's table, as engine.js evalPattern / engine.c evalFull
static __attribute__((unused)) void rv_features(const Model *m, uint64_t P, uint64_t O, uint32_t *f) {
  const int s = m->set;
  for (int i = 0; i < m->ninst; i++) {
    int idx = 0, n = PT_LEN[s][i];
    for (int k = 0; k < n; k++) { int q = PT_SQ[s][i][k]; idx = idx * 3 + ((P >> q) & 1 ? 1 : (O >> q) & 1 ? 2 : 0); }
    f[i] = PT_OFF[s][i] + idx;
  }
  int k = m->ninst;
  if (m->next >= 4) {
    const uint64_t e = ~(P | O);
    f[k++] = m->extOff + rv_pc(rv_moves(P, O)); f[k++] = m->extOff + 64 + rv_pc(rv_moves(O, P));
    f[k++] = m->extOff + 128 + rv_pc(rv_neigh(O) & e); f[k++] = m->extOff + 192 + rv_pc(rv_neigh(P) & e);
  }
  if (m->next >= 5) { int d = rv_pc(P); f[k++] = m->extOff + 256 + (d > 63 ? 63 : d); }
  f[k] = m->phaseSize - 1;
}

// ------------------------------------------------------------------ the weights file
#define WH 16   // header words (engine.js decodeV5)
// loads a weights file (gzip or not) into int16 weights in 1/32 disc (nphase × phaseSize); v4 files (no header) are set B,
// 30 phases (weights.json) with 4 extras (or none: v1). Returns NULL on error.
static int16_t *load_weights(const char *fn, Model *m) {
  gzFile g = gzopen(fn, "rb"); if (!g) { fprintf(stderr, "cannot open %s\n", fn); return 0; }
  size_t cap = 1 << 24, n = 0; unsigned char *buf = malloc(cap); int r;
  while ((r = gzread(g, buf + n, (unsigned)(cap - n))) > 0) { n += r; if (n == cap) { cap *= 2; buf = realloc(buf, cap); } }
  gzclose(g);
  int16_t *a = (int16_t *)buf; size_t words = n / 2;
  if (words > WH && a[0] == 0x5652 && a[1] == 5) {
    const int H = a[2], flags = a[6], q = a[7] ? a[7] : 1;
    if (model_init(m, (char)a[4], a[3], a[5])) { fprintf(stderr, "%s: unknown header\n", fn); free(buf); return 0; }
    memcpy(m->mpc, a + 8, 12); m->quant = q;
    size_t nw = words - H; if (nw != (size_t)m->nphase * m->phaseSize) { fprintf(stderr, "%s: size %zu, expected %ld\n", fn, nw, (long)m->nphase * m->phaseSize); free(buf); return 0; }
    int16_t *w = malloc(nw * 2);
    if (flags & 2) { const unsigned char *b = buf + 2 * H; for (size_t i = 0; i < nw; i++) w[i] = (int16_t)(b[i] | (b[nw + i] << 8)); }
    else memcpy(w, a + H, nw * 2);
    if (flags & 1) for (size_t i = m->phaseSize; i < nw; i++) w[i] = (int16_t)(w[i] + w[i - m->phaseSize]);
    if (q != 1) for (size_t i = 0; i < nw; i++) w[i] = (int16_t)(w[i] * q);
    free(buf); return w;
  }
  for (int next = 4; next >= 0; next -= 4) {   // v4 (v2-v4: with the 4 extras) / v1
    model_init(m, 'B', 30, next);
    if (words == (size_t)m->nphase * m->phaseSize) return (int16_t *)buf;
  }
  fprintf(stderr, "%s: unknown weights (%zu values)\n", fn, words); free(buf); return 0;
}
// writes a v5 file: header, the phases as differences from the one before, low / high byte planes, gzip -9.
// quant: the stored values are round(w / quant) (1 = exact; 2 = 1/16 disc, a smaller download)
static int save_weights(const char *fn, const Model *m, const int16_t *w, int quant) {
  const size_t nw = (size_t)m->nphase * m->phaseSize;
  int16_t h[WH] = { 0x5652, 5, WH, (int16_t)m->nphase, PT_NAME[m->set], (int16_t)m->next, 3, (int16_t)quant };
  memcpy(h + 8, m->mpc, 12);
  int16_t *v = malloc(nw * 2), *d = malloc(nw * 2);
  for (size_t i = 0; i < nw; i++) { int x = w[i]; int y = quant == 1 ? x : (x >= 0 ? (x + quant / 2) / quant : -((-x + quant / 2) / quant));
    y = y > 32767 / quant ? 32767 / quant : y < -32768 / quant ? -32768 / quant : y; v[i] = (int16_t)y; }
  for (size_t i = 0; i < nw; i++) d[i] = (int16_t)(i < (size_t)m->phaseSize ? v[i] : v[i] - v[i - m->phaseSize]);
  unsigned char *b = malloc(nw * 2);
  for (size_t i = 0; i < nw; i++) { b[i] = (unsigned char)(d[i] & 0xFF); b[nw + i] = (unsigned char)((d[i] >> 8) & 0xFF); }
  gzFile g = gzopen(fn, "wb9"); if (!g) { fprintf(stderr, "cannot write %s\n", fn); return -1; }
  gzwrite(g, h, sizeof h);
  for (size_t o = 0; o < nw * 2; o += 1 << 24) gzwrite(g, b + o, (unsigned)((nw * 2 - o) < (1u << 24) ? nw * 2 - o : 1u << 24));
  gzclose(g); free(v); free(d); free(b);
  return 0;
}
