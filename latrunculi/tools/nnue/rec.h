/* The record of one position of the self-play data (ltn datagen → train): 48 bytes.
   b: 4 bits a square (square i in byte i / 2, the low half first): 0 empty, 1 Black, 2 White, 3 Black blocked, 4 White blocked.
   score: the teacher's search value for the side to move (100 = about one counter); result: the game's result for the side to
   move (1 win, 0 draw, -1 loss); hev: the hand-made evaluation of the position (side to move: the net learns a correction to it); flags: REC_NOISY (a removal due or a move that encloses: not trained on), REC_PLACE (placing). */
#ifndef LT_REC_H
#define LT_REC_H
#include <stdint.h>
typedef struct { uint8_t b[32]; uint8_t hand[2], cap[2], quiet, side, flags, rule; int16_t score; int8_t result; uint8_t ply; int16_t hev; uint8_t pad[2]; } Rec;
#define REC_NOISY 1
#define REC_PLACE 2
/* the net's inputs of a record for the view of side v (as core.c fSq / accMisc): returns how many, into f */
static inline int lt_features(const Rec *r, int v, int mirror, uint16_t *f) {
  int n = 0;
  for (int i = 0; i < 64; i++) {
    int c = (r->b[i >> 1] >> ((i & 1) * 4)) & 15; if (!c) continue;
    int x = c > 2 ? c - 2 : c, a = c > 2, s = mirror ? (i & 56) | (7 - (i & 7)) : i;
    f[n++] = (uint16_t)(((x - 1 == v ? 0 : 2) + a) * 64 + (v ? s ^ 56 : s));
  }
  int hv = r->hand[v] > 24 ? 24 : r->hand[v], ho = r->hand[v ^ 1] > 24 ? 24 : r->hand[v ^ 1], cv = r->cap[v] > 24 ? 24 : r->cap[v], co = r->cap[v ^ 1] > 24 ? 24 : r->cap[v ^ 1], q = r->quiet / 6;
  f[n++] = (uint16_t)(256 + hv); f[n++] = (uint16_t)(281 + ho); f[n++] = (uint16_t)(306 + cv); f[n++] = (uint16_t)(331 + co); f[n++] = (uint16_t)(356 + (q > 9 ? 9 : q));
  return n;
}
#define LT_IN 366
#endif
