// evals.txt ("fen;cN|mN;depth;bestuci") -> packed binary records for training.
// Skips positions in check and positions whose best move is a capture/promotion (non-quiet).
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../engine.c"
typedef struct { u64 occ; u8 pcs[16]; i16 score; u8 stm; u8 pad; } Rec;   /* score: side-to-move POV, cp */
int main(int argc, char **argv) {
  init();
  FILE *in = fopen(argv[1], "r"), *out = fopen(argv[2], "wb");
  long skip = argc > 3 ? atol(argv[3]) : 0, lim = argc > 4 ? atol(argv[4]) : 1L << 60;
  char line[512]; long n = 0, kept = 0, li = 0;
  while (fgets(line, sizeof line, in)) {
    if (li++ < skip) continue; if (li > skip + lim) break;
    char *f = strtok(line, ";"), *v = strtok(0, ";"), *d = strtok(0, ";"), *bm = strtok(0, ";\n");
    if (!f || !v || !d) continue;
    n++;
    char fen[256]; snprintf(fen, sizeof fen, "%s 0 1", f);
    strcpy(setupBuf, fen); if (!set_position()) continue;
    if (in_check(&P)) continue;
    if (atoi(d) < 12) continue;
    if (bm) { int m = parse_uci(&P, bm); if (!m) continue; if (M_PROMO(m) || M_SPEC(m) == 1 || P.board[M_TO(m)] != EMPTY) continue; }
    int cp;
    if (v[0] == 'c') { cp = atoi(v + 1); if (cp > 3000) cp = 3000; if (cp < -3000) cp = -3000; }
    else { int mt = atoi(v + 1); cp = mt > 0 ? 3000 : -3000; }
    /* lichess evals are white POV */
    if (P.side == BLACK) cp = -cp;
    Rec r; memset(&r, 0, sizeof r); r.occ = P.all; r.score = (i16)cp; r.stm = (u8)P.side;
    u64 b = P.all; int k = 0;
    while (b) { int s = lsb(b); b &= b - 1; int pc = P.board[s]; if (k & 1) r.pcs[k >> 1] |= pc << 4; else r.pcs[k >> 1] |= pc; k++; }
    if (k > 32) continue;
    fwrite(&r, sizeof r, 1, out); kept++;
    if ((n & 0xFFFFF) == 0) fprintf(stderr, "%ld %ld\n", n, kept);
  }
  fclose(out); fprintf(stderr, "done %ld read, %ld kept\n", n, kept);
  return 0;
}
