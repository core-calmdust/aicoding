/* Shared by datagen.c and train.c: the training record and the NNUE input features.
   Board layout = engine.c: sq = row * 9 + col (row 0 = Black's back rank), piece = type | colour << 3,
   types 1 King 2 Advisor 3 Elephant 4 Horse 5 Rook 6 Cannon 7 Pawn. */
#ifndef XQ_H
#define XQ_H
#include <stdint.h>

#define REC_CHECK 1     /* side to move in check */
#define REC_CAPTURE 2   /* the teacher's best move captures */
typedef struct {
  uint8_t b[45];        /* 90 points, 4 bits each (low nibble = even point) */
  uint8_t stm;          /* 0 red, 1 black */
  int16_t cp;           /* teacher score, side to move (Pikafish: 100 = 50% win chance); +-30000 = mate */
  int16_t w, l;         /* teacher win / loss chance x1000 (side to move), from UCI_ShowWDL */
  uint16_t move;        /* teacher best move: from | to << 7 */
  int8_t result;        /* game result, side to move: 1 win, 0 draw, -1 loss */
  uint8_t flags;
} Rec;                  /* 56 bytes */

static inline int rec_piece(const Rec *r, int s) { return (r->b[s >> 1] >> ((s & 1) * 4)) & 15; }

/* NNUE inputs from the point of view of colour persp: (own/opponent x 7 types) x 90 points,
   the board turned 180 degrees for Black so that "own" pieces always start at the bottom. */
#define XQ_IN 1260
static inline int xq_features(const Rec *r, int persp, uint16_t *f) {
  int n = 0;
  for (int s = 0; s < 90; s++) {
    int p = rec_piece(r, s); if (!p) continue;
    int col = p >> 3, t = p & 7;
    f[n++] = (uint16_t)(((col != persp) * 7 + t - 1) * 90 + (persp ? 89 - s : s));
  }
  return n;
}
#endif
