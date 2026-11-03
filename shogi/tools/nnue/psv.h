/* YaneuraOu PackedSfenValue (40 bytes) reader, shared by prep.c and train.c.
   The position is decoded into the site engine's layout (engine.c / engine.js):
   board[81] with s = row * 9 + col (row 0 = 一段, col 0 = 9筋), piece = type + 16 * color,
   types FU KY KE GI KA HI KI OU TO NY NK NG UM RY = 1..14 (the same order as YaneuraOu),
   hand[c * 8 + t] for t = 1..7, side 0 = 先手. */
#ifndef PSV_H
#define PSV_H
#include <stdint.h>
#include <string.h>

typedef struct {
  uint8_t sfen[32];
  int16_t score;      /* side to move, YaneuraOu units (win rate ~ sigmoid(score / 600)) */
  uint16_t move;      /* best move (Move16) */
  uint16_t ply;
  int8_t result;      /* side to move: 1 win, 0 draw, -1 loss */
  uint8_t pad;
} PSV;

typedef struct { int8_t board[81]; int8_t hand[16]; int side; } Pos;

typedef struct { const uint8_t *d; int p; } Bits;
static inline int rbit(Bits *b) { int v = (b->d[b->p >> 3] >> (b->p & 7)) & 1; b->p++; return v; }
static inline int rbits(Bits *b, int n) { int v = 0; for (int i = 0; i < n; i++) v |= rbit(b) << i; return v; }

/* YaneuraOu square (file-1)*9 + (rank-1)  ->  engine square */
static inline int ysq(int y) { int file = y / 9 + 1, rank = y % 9 + 1; return (rank - 1) * 9 + (9 - file); }

/* Huffman codes (LSB first) for empty, FU, KY, KE, GI, KA, HI, KI */
static const int HCODE[8] = {0x00, 0x01, 0x03, 0x0b, 0x07, 0x1f, 0x3f, 0x0f};
static const int HBITS[8] = {1, 2, 4, 4, 4, 6, 6, 5};

static int rpiece(Bits *b, int hand) {
  int code = 0, n = 0;
  for (;;) {
    code |= rbit(b) << n; n++;
    for (int t = hand ? 1 : 0; t < 8; t++) {
      int c = hand ? HCODE[t] >> 1 : HCODE[t], nb = hand ? HBITS[t] - 1 : HBITS[t];
      if (nb == n && c == code) return t;
    }
    if (n > 8) return -1;
  }
}

/* returns 0 on success */
static int psv_decode(const PSV *r, Pos *p) {
  memset(p, 0, sizeof *p);
  Bits b = { r->sfen, 0 };
  p->side = rbit(&b);
  int k[2]; k[0] = rbits(&b, 7); k[1] = rbits(&b, 7);
  for (int c = 0; c < 2; c++) if (k[c] < 81) p->board[ysq(k[c])] = 8 + 16 * c;
  for (int y = 0; y < 81; y++) {
    if (y == k[0] || y == k[1]) continue;
    int t = rpiece(&b, 0); if (t < 0) return 1;
    if (!t) continue;
    int pro = t == 7 ? 0 : rbit(&b), col = rbit(&b);
    p->board[ysq(y)] = (t + (pro ? 8 : 0)) + 16 * col;
  }
  while (b.p < 256) {
    int t = rpiece(&b, 1); if (t < 0) return 2;
    if (t != 7) rbit(&b);
    int col = rbit(&b);
    p->hand[col * 8 + t]++;
  }
  /* sanity: 40 pieces, both kings */
  int n = 0, kings = 0;
  for (int s = 0; s < 81; s++) if (p->board[s]) { n++; if ((p->board[s] & 15) == 8) kings++; }
  for (int i = 0; i < 16; i++) n += p->hand[i];
  return n == 40 && kings == 2 ? 0 : 3;
}

/* NNUE input features of the site engine (engine.c nueB / nueHd), from the point of view of colour persp */
#define NUE_IN 2534
static int pos_features(const Pos *p, int persp, uint16_t *f) {
  int n = 0;
  for (int s = 0; s < 81; s++) {
    int pc = p->board[s]; if (!pc) continue;
    int col = pc >> 4, t = pc & 15;
    f[n++] = (uint16_t)(((col != persp) * 14 + t - 1) * 81 + (persp ? 80 - s : s));
  }
  for (int hc = 0; hc < 2; hc++) for (int t = 1; t <= 7; t++)
    for (int k = 1; k <= p->hand[hc * 8 + t] && k <= 19; k++)
      f[n++] = (uint16_t)(2268 + ((hc != persp) * 7 + t - 1) * 19 + k - 1);
  return n;
}

/* direction tables for the in-check test */
static int psv_attacked(const Pos *p, int sq, int by) {
  static const int DR[8] = {-1, -1, -1, 0, 0, 1, 1, 1}, DC[8] = {-1, 0, 1, -1, 1, -1, 0, 1};
  int r0 = sq / 9, c0 = sq % 9;
  for (int d = 0; d < 8; d++) {
    for (int k = 1; k < 9; k++) {
      int r = r0 + DR[d] * k, c = c0 + DC[d] * k;
      if (r < 0 || r > 8 || c < 0 || c > 8) break;
      int pc = p->board[r * 9 + c]; if (!pc) continue;
      if ((pc >> 4) != by) break;
      int t = pc & 15;
      /* direction from the attacker towards sq, in the attacker's forward frame */
      int dr = -DR[d], dc = -DC[d];
      int fwd = by == 0 ? -dr : dr;   /* 1 = the attacker moves forward to reach sq */
      int side = dc != 0, diag = dr != 0 && dc != 0;
      int ok = 0;
      if (k == 1) {
        switch (t) {
          case 1: case 2: ok = fwd == 1 && !side; break;                          /* FU, KY */
          case 4: ok = (diag) || (fwd == 1 && !side); break;                      /* GI */
          case 7: case 9: case 10: case 11: case 12: ok = !(diag && fwd == -1); break; /* KI and promoted minors */
          case 8: case 13: case 14: ok = 1; break;                                 /* OU, UM, RY */
          case 5: ok = diag; break;
          case 6: ok = !diag; break;
        }
      } else {
        switch (t) {
          case 2: ok = fwd == 1 && !side; break;
          case 5: case 13: ok = diag; break;
          case 6: case 14: ok = !diag; break;
        }
      }
      if (ok) return 1;
      break;
    }
  }
  /* knights */
  int kr = by == 0 ? r0 + 2 : r0 - 2;
  for (int dc = -1; dc <= 1; dc += 2) {
    int c = c0 + dc; if (kr < 0 || kr > 8 || c < 0 || c > 8) continue;
    if (p->board[kr * 9 + c] == 3 + 16 * by) return 1;
  }
  return 0;
}
static int psv_in_check(const Pos *p) {
  for (int s = 0; s < 81; s++) if (p->board[s] == 8 + 16 * p->side) return psv_attacked(p, s, p->side ^ 1);
  return 0;
}
/* the best move captures a piece (Move16: to = bits 0-6, from = bits 7-13, bit 14 = drop) */
static int psv_capture(const PSV *r, const Pos *p) {
  if (r->move & (1 << 14)) return 0;
  int to = r->move & 127;
  return to < 81 && p->board[ysq(to)] != 0;
}
#endif
