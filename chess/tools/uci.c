#include <stdio.h>
#include <stdlib.h>
#include "../engine.c"
static void prog(i32 d, i32 s, double n, i32 *pv, i32 l) { double t = js_now() - tStart; printf("info depth %d seldepth %d score %s %d nodes %.0f nps %.0f time %.0f pv", d, selDepth, abs(s) >= MATE_IN_MAX ? "mate" : "cp", abs(s) >= MATE_IN_MAX ? (s > 0 ? (MATE - s + 1) / 2 : -(MATE + s) / 2) : s, n, n / (t > 1 ? t : 1) * 1000, t); for (int i = 0; i < l; i++) { char b[8]; move_to_uci(pv[i], b); printf(" %s", b); } printf("\n"); fflush(stdout); }
static int loadnet(const char *f) { FILE *fp = fopen(f, "rb"); if (!fp) return 0; static u8 buf[4 << 20]; size_t n = fread(buf, 1, sizeof buf, fp); fclose(fp); if ((int)n != nn_size()) { fprintf(stderr, "net size %zu != %d\n", n, nn_size()); return 0; } nn_load_blob(buf); return 1; }
int main(int argc, char **argv) {
  init(); progress_cb = prog; new_game();
  const char *net = getenv("NNUE"); if (net && *net) { if (!loadnet(net)) { fprintf(stderr, "failed to load net\n"); return 1; } }
  strcpy(setupBuf, "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"); set_position();
  if (argc > 1 && !strcmp(argv[1], "perft")) { if (argc > 3) { strcpy(setupBuf, argv[3]); set_position(); } printf("%.0f\n", perft_root(atoi(argv[2]))); return 0; }
  if (argc > 1 && !strcmp(argv[1], "bench")) { const char *fens[] = {"r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", "r2q1rk1/pp2bppp/2n1pn2/3p4/3P4/2NBPN2/PP3PPP/R2Q1RK1 w - - 0 10", "8/5pk1/6p1/3R4/7P/6P1/r4PK1/8 w - - 0 40", "r1b2rk1/2q1bppp/p2p1n2/np2p3/3PP3/5N1P/PPBN1PP1/R1BQR1K1 w - - 0 13", "2r3k1/1p3ppp/p3p3/3n4/8/1P2P3/P2N1PPP/2R3K1 b - - 0 25"}; double tn = 0, t0 = js_now(); int d = argc > 2 ? atoi(argv[2]) : 12; progress_cb = 0; for (int i = 0; i < 5; i++) { new_game(); strcpy(setupBuf, fens[i]); set_position(); think(0, 0, d, 0); tn += resNodes; char b[8]; move_to_uci(resBuf[0], b); printf("%s %d\n", b, resBuf[1]); } double t = js_now() - t0; printf("nodes %.0f time %.0f nps %.0f\n", tn, t, tn / t * 1000); return 0; }
  char line[65536];
  while (fgets(line, sizeof line, stdin)) {
    line[strcspn(line, "\r\n")] = 0;
    if (!strcmp(line, "uci")) { printf("id name AtlasChess\nid author core-calmdust\nuciok\n"); fflush(stdout); }
    else if (!strcmp(line, "isready")) { printf("readyok\n"); fflush(stdout); }
    else if (!strcmp(line, "ucinewgame")) new_game();
    else if (!strncmp(line, "position", 8)) {
      char *p = line + 9; char *mv = strstr(p, "moves");
      if (!strncmp(p, "startpos", 8)) strcpy(setupBuf, "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
      else { p += 4; size_t L = mv ? (size_t)(mv - p) : strlen(p); memcpy(setupBuf, p, L); setupBuf[L] = 0; }
      if (mv) { strcat(setupBuf, " "); strcat(setupBuf, mv); }
      set_position();
    } else if (!strncmp(line, "go", 2)) {
      double mt = 0, wt = 0, bt = 0, wi = 0, bi = 0, nl = 0; int depth = 0; char *q;
      if ((q = strstr(line, "movetime"))) mt = atof(q + 9);
      if ((q = strstr(line, "wtime"))) wt = atof(q + 6); if ((q = strstr(line, "btime"))) bt = atof(q + 6);
      if ((q = strstr(line, "winc"))) wi = atof(q + 5); if ((q = strstr(line, "binc"))) bi = atof(q + 5);
      if ((q = strstr(line, "depth"))) depth = atoi(q + 6); if ((q = strstr(line, "nodes"))) nl = atof(q + 6);
      double soft = 0, hard = 0;
      if (mt > 0) { soft = mt; hard = mt; }
      else if (wt > 0 || bt > 0) { double t = P.side == WHITE ? wt : bt, inc = P.side == WHITE ? wi : bi; soft = t / 30 + inc * 0.75; hard = t / 6 + inc; if (hard > t - 50) hard = t - 50; if (soft > hard) soft = hard; }
      if (mt > 0) soft = mt * 0.6;
      think(soft, hard, depth, nl);
      char b[8]; move_to_uci(resBuf[0], b); printf("bestmove %s\n", b); fflush(stdout);
    } else if (!strcmp(line, "quit")) break;
    else if (!strcmp(line, "eval")) { printf("eval %d\n", static_eval()); fflush(stdout); }
  }
  return 0;
}
