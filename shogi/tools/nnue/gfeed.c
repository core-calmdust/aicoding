/* gfeed: PackedSfenValue records -> the arrays gtrain.py trains on (a shared library, called through ctypes).
   cc -O3 -shared -fPIC -o libgfeed.so gfeed.c -lpthread        (macOS: -o libgfeed.dylib)
   gfeed_fill(d, n, fu, ft, score, res, ply, bk, threads): for each of the n records
     fu[40], ft[40]  the features (0..2533) of the side to move and of the other side, padded with 2534
     score           the record's score (side to move), result -1 / 0 / 1, ply, bk = engine.c's output bucket (pieces in hand)
   A record that does not decode gets all-padding features and result -2 (the trainer gives it no weight).
   Returns the number of good records. */
#include <pthread.h>
#include "psv.h"
#define PAD 2534
#define NF 40
typedef struct { const PSV *d; long a, b; uint16_t *fu, *ft; int16_t *score; int8_t *res; uint16_t *ply; uint8_t *bk; long good; } Job;
static void *job(void *arg) {
  Job *j = arg; long good = 0;
  for (long i = j->a; i < j->b; i++) {
    const PSV *r = &j->d[i]; Pos p; uint16_t b[64]; uint16_t *fu = j->fu + i * NF, *ft = j->ft + i * NF;
    for (int k = 0; k < NF; k++) fu[k] = ft[k] = PAD;
    j->score[i] = r->score; j->ply[i] = r->ply; j->bk[i] = 0;
    if (psv_decode(r, &p)) { j->res[i] = -2; continue; }
    int n = pos_features(&p, p.side, b); if (n > NF) { j->res[i] = -2; continue; }
    for (int k = 0; k < n; k++) fu[k] = b[k];
    n = pos_features(&p, p.side ^ 1, b); for (int k = 0; k < n && k < NF; k++) ft[k] = b[k];
    int t = 0; for (int k = 1; k < 8; k++) t += p.hand[k] + p.hand[8 + k];
    j->bk[i] = t < 1 ? 0 : t < 3 ? 1 : t < 5 ? 2 : t < 7 ? 3 : t < 9 ? 4 : t < 12 ? 5 : t < 16 ? 6 : 7;
    j->res[i] = r->result > 0 ? 1 : r->result < 0 ? -1 : 0; good++;
  }
  j->good = good; return 0;
}
long gfeed_fill(const PSV *d, long n, uint16_t *fu, uint16_t *ft, int16_t *score, int8_t *res, uint16_t *ply, uint8_t *bk, int threads) {
  if (threads < 1) threads = 1; if (threads > 64) threads = 64;
  pthread_t th[64]; Job jb[64]; long good = 0;
  for (int t = 0; t < threads; t++) {
    jb[t] = (Job){ d, n * t / threads, n * (t + 1) / threads, fu, ft, score, res, ply, bk, 0 };
    pthread_create(&th[t], 0, job, &jb[t]);
  }
  for (int t = 0; t < threads; t++) { pthread_join(th[t], 0); good += jb[t].good; }
  return good;
}
