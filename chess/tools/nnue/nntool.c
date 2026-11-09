/* nntool: native helpers for retraining the chess NNUE (chess/engine.c, the site's engine, built natively).
   build: tools/nnue/build.sh  (cc -O3 -DNN_KB=32 [-DNN_H=512] -o nntool tools/nnue/nntool.c; the hidden size must match
   the net; NN_KB=32 reads nets with any number of king buckets and without)

   Record format (32 bytes with alignment, the same as tools/convert.c and tools/train.c):
     u64 occ; u8 pcs[16] (4 bits per piece, in the order of the occ bits, piece = colour*6 + type);
     i16 score (side to move, centipawns, |score| <= 3000); u8 stm (0 white, 1 black);
     u8 res (game result for the side to move: 0 unknown, 1 loss, 2 draw, 3 win; tools/convert.c leaves 0); 4 bytes padding

   nntool gen <out.bin> <games> <nodes> <seed> [net.bin]
       self-play with the site's search; records quiet positions (not in check, best move not a capture / promotion)
       with the search score and, when the game is over, its result. Writes <out.bin> at the end of every game (resumable
       by game count: an existing file's games are kept and counted).
   nntool rescore <in.bin> <out.bin> <uci engine> <depth> [first] [count]
       teacher: re-labels records with a UCI engine (e.g. Stockfish, used only on your own computer) at a fixed depth.
       The game result byte is kept. Resumable: an existing <out.bin> is continued from where it stopped.
   nntool evalpos <net.bin|-> <data.bin> <n>
       prints the engine's static evaluation (side to move, cp) of the first n records, one per line
       (the trainer's --check prints the same numbers from Python: they must be identical).
   nntool bench <net.bin> <data.bin> <positions> <nodes>
       speed: the same searches (positions spread over the data file, table cleared, node limit) -> nodes per second
   nntool match <uci binary[,binary for B]> <netA> <netB> <nodes|Nms> <games> <seed>
       netA vs netB, both as the native UCI engine (tools/uci.c) in child processes; pairs of games from the same random
       opening with colours swapped. Prints "+W -L =D" for netA and the score. "-" for a net = hand-made evaluation. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <signal.h>
#include <unistd.h>
#include <sys/wait.h>
#include "../../engine.c"

typedef struct { u64 occ; u8 pcs[16]; i16 score; u8 stm; u8 res; } Rec;
_Static_assert(sizeof(Rec) == 32, "record size (8-byte aligned, as in tools/convert.c)");

static u64 xs = 88172645463325252ULL;
static u64 xr(void) { xs ^= xs << 13; xs ^= xs >> 7; xs ^= xs << 17; return xs; }

static int loadnet(const char *f) {
  if (!f || !strcmp(f, "-")) { nn_enable(0); return 1; }
  FILE *fp = fopen(f, "rb"); if (!fp) { perror(f); return 0; }
  static u8 buf[sizeof NN + 1]; size_t n = fread(buf, 1, sizeof buf, fp); fclose(fp);
  if (!nn_load_blob(buf, (int)n)) { fprintf(stderr, "%s: %zu bytes is not a net for this engine (H=%d, up to %d king buckets: %d bytes without)\n", f, n, NN_H, NN_KB, nn_size()); return 0; }
  return 1;
}
static const char *START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
static void setfen(const char *f) { strcpy(setupBuf, f); set_position(); }
static void play(int m) { if (histLen < HIST_MAX) keyHist[histLen++] = P.key; make_move(&P, m); sp = 0; accDirty[0] = ACC_ALL; }
static int legal(int *out) { int ml[256], n = gen_moves(&P, ml, 0), k = 0; for (int i = 0; i < n; i++) if (is_legal(&P, ml[i])) out[k++] = ml[i]; return k; }
static int reps(void) { int c = 0; for (int i = histLen - 2; i >= 0 && i >= histLen - P.half; i -= 2) if (keyHist[i] == P.key) c++; return c; }
static void torec(Rec *r, int score) {
  memset(r, 0, sizeof *r); r->occ = P.all; r->stm = (u8)P.side; r->score = (i16)score;
  u64 b = P.all; int k = 0;
  while (b) { int s = lsb(b); b &= b - 1; int pc = P.board[s]; r->pcs[k >> 1] |= (u8)(pc << ((k & 1) * 4)); k++; }
}
static void recfen(const Rec *r, char *o) {   /* FEN of a record (no castling / en passant; enough for evaluation) */
  int bd[64]; for (int s = 0; s < 64; s++) bd[s] = -1;
  u64 b = r->occ; int k = 0; while (b) { int s = __builtin_ctzll(b); b &= b - 1; bd[s] = (r->pcs[k >> 1] >> ((k & 1) * 4)) & 15; k++; }
  char *p = o;
  for (int rk = 7; rk >= 0; rk--) { int e = 0; for (int f = 0; f < 8; f++) { int pc = bd[rk * 8 + f]; if (pc < 0) { e++; continue; } if (e) { *p++ = '0' + e; e = 0; } *p++ = "PNBRQKpnbrqk"[pc]; } if (e) *p++ = '0' + e; if (rk) *p++ = '/'; }
  sprintf(p, " %c - - 0 1", r->stm ? 'b' : 'w');
}
static int clampcp(int s) { if (s >= MATE_IN_MAX) return 3000; if (s <= -MATE_IN_MAX) return -3000; return s > 3000 ? 3000 : s < -3000 ? -3000 : s; }

/* a random, roughly balanced opening: 6-9 random legal plies, then |eval| <= 120 at depth 6 (hand-made eval if no net) */
static int opening(int *mv) {
  for (;;) {
    setfen(START); int n = 6 + (int)(xr() % 4), ok = 1;
    for (int i = 0; i < n; i++) { int lm[256], k = legal(lm); if (!k) { ok = 0; break; } mv[i] = lm[xr() % k]; play(mv[i]); }
    if (!ok) continue;
    int lm[256]; if (!legal(lm)) continue;
    new_game(); think(0, 0, 6, 0); if (abs(resBuf[1]) > 120) continue;
    return n;
  }
}

static int cmd_gen(int argc, char **argv) {
  if (argc < 6) { fprintf(stderr, "usage: nntool gen out.bin games nodes seed [net.bin]\n"); return 1; }
  const char *out = argv[2]; int games = atoi(argv[3]); double nl = atof(argv[4]); xs ^= (u64)atoll(argv[5]) * 0x9E3779B97F4A7C15ULL; xr();
  if (argc > 6 && !loadnet(argv[6])) return 1;
  /* resume: count the games already in the file (a game ends at a record with res != 0... games without records are
     invisible, so the progress file <out>.n holds the count) */
  char nf[1024]; snprintf(nf, sizeof nf, "%s.n", out); int done = 0; FILE *g = fopen(nf, "r"); if (g) { if (fscanf(g, "%d", &done) != 1) done = 0; fclose(g); }
  for (int i = 0; i < done; i++) for (int j = 0; j < 4; j++) xr();   /* (different openings after a resume) */
  FILE *f = fopen(out, done ? "ab" : "wb"); if (!f) { perror(out); return 1; }
  static Rec recs[1024]; long total = 0; double t0 = js_now();
  for (int gi = done; gi < games; gi++) {
    int mv[16]; opening(mv); new_game();
    int nr = 0, result = 0, adj = 0, ply;   /* result: white's point of view, 1 / 0 / -1 */
    for (ply = 0; ; ply++) {
      int lm[256], k = legal(lm);
      if (!k) { result = in_check(&P) ? (P.side == WHITE ? -1 : 1) : 0; break; }
      if (P.half >= 100 || insufficient(&P) || reps() >= 2 || ply >= 400) { result = 0; break; }
      int m = think(0, 0, 0, nl), s = resBuf[1];
      if (!m) m = lm[0];
      int ws = P.side == WHITE ? s : -s;
      if (abs(s) >= 2500) { if (adj && ((adj > 0) == (ws > 0))) adj += adj > 0 ? 1 : -1; else adj = ws > 0 ? 1 : -1; } else adj = 0;
      if (adj >= 6 || adj <= -6) { result = adj > 0 ? 1 : -1; break; }
      int quiet = !in_check(&P) && !M_PROMO(m) && M_SPEC(m) != 1 && P.board[M_TO(m)] == EMPTY && abs(s) < MATE_IN_MAX;
      if (quiet && ply >= 2 && nr < 1024) torec(&recs[nr++], clampcp(s));
      play(m);
    }
    for (int i = 0; i < nr; i++) { int r = recs[i].stm == WHITE ? result : -result; recs[i].res = (u8)(r + 2); }
    fwrite(recs, sizeof(Rec), nr, f); fflush(f); total += nr;
    g = fopen(nf, "w"); if (g) { fprintf(g, "%d\n", gi + 1); fclose(g); }
    if ((gi + 1) % 10 == 0) fprintf(stderr, "game %d/%d  +%ld positions  %.1f pos/s\n", gi + 1, games, total, total / ((js_now() - t0) / 1000));
  }
  fclose(f); return 0;
}

/* ---- child UCI engines */
typedef struct { FILE *to, *from; pid_t pid; } Eng;
static void eng_start(Eng *e, const char *bin, const char *net) {
  int a[2], b[2]; if (pipe(a) || pipe(b)) { perror("pipe"); exit(1); }
  e->pid = fork();
  if (e->pid == 0) {
    dup2(a[0], 0); dup2(b[1], 1); close(a[1]); close(b[0]);
    if (net && strcmp(net, "-")) setenv("NNUE", net, 1); else unsetenv("NNUE");
    execl(bin, bin, (char *)0); _exit(127);
  }
  close(a[0]); close(b[1]); e->to = fdopen(a[1], "w"); e->from = fdopen(b[0], "r");
  char line[4096]; fprintf(e->to, "uci\n"); fflush(e->to);
  while (fgets(line, sizeof line, e->from)) if (!strncmp(line, "uciok", 5)) return;
  fprintf(stderr, "%s did not start\n", bin); exit(2);
}
/* returns the best move (uci text in out) and the last reported score (side to move) */
static int eng_go(Eng *e, const char *pos, const char *go, char *out, int *score) {
  static char line[1 << 16];
  fprintf(e->to, "%s\n%s\n", pos, go); fflush(e->to); *score = 0;
  while (fgets(line, sizeof line, e->from)) {
    char *q = strstr(line, " score ");
    if (q) { int v; if (sscanf(q, " score cp %d", &v) == 1) *score = v; else if (sscanf(q, " score mate %d", &v) == 1) *score = v > 0 ? 30000 : -30000; }
    if (!strncmp(line, "bestmove", 8)) { return sscanf(line, "bestmove %7s", out) == 1; }
  }
  return 0;
}

static int cmd_rescore(int argc, char **argv) {
  if (argc < 6) { fprintf(stderr, "usage: nntool rescore in.bin out.bin <uci engine> <depth> [first] [count]\n"); return 1; }
  FILE *in = fopen(argv[2], "rb"); if (!in) { perror(argv[2]); return 1; }
  long first = argc > 6 ? atol(argv[6]) : 0, count = argc > 7 ? atol(argv[7]) : -1;
  FILE *o = fopen(argv[3], "ab"); if (!o) { perror(argv[3]); return 1; }
  fseek(o, 0, SEEK_END); long have = ftell(o) / (long)sizeof(Rec);
  fseek(in, (first + have) * (long)sizeof(Rec), SEEK_SET);
  Eng e; eng_start(&e, argv[4], NULL);
  fprintf(e.to, "setoption name Threads value 1\nsetoption name Hash value 16\nisready\n"); fflush(e.to);
  char line[4096]; while (fgets(line, sizeof line, e.from)) if (!strncmp(line, "readyok", 7)) break;
  char go[64]; snprintf(go, sizeof go, "go depth %d", atoi(argv[5]));
  Rec r; long k = have; double t0 = js_now();
  while ((count < 0 || k < count) && fread(&r, sizeof r, 1, in) == 1) {
    char fen[128], pos[200], mv[8]; int s; recfen(&r, fen); snprintf(pos, sizeof pos, "position fen %s", fen);
    if (!eng_go(&e, pos, go, mv, &s)) { fprintf(stderr, "engine stopped\n"); return 2; }
    r.score = (i16)(abs(s) >= 20000 ? (s > 0 ? 3000 : -3000) : clampcp(s));
    fwrite(&r, sizeof r, 1, o); k++;
    if (k % 20000 == 0) { fflush(o); fprintf(stderr, "%ld positions  %.0f pos/s\n", k, (k - have) / ((js_now() - t0) / 1000)); }
  }
  fprintf(e.to, "quit\n"); fflush(e.to); waitpid(e.pid, NULL, 0);
  fclose(o); fprintf(stderr, "rescore done: %ld positions\n", k); return 0;
}

static int cmd_evalpos(int argc, char **argv) {
  if (argc < 5) { fprintf(stderr, "usage: nntool evalpos net.bin data.bin n\n"); return 1; }
  if (!loadnet(argv[2])) return 1;
  FILE *in = fopen(argv[3], "rb"); if (!in) { perror(argv[3]); return 1; }
  int n = atoi(argv[4]); Rec r; char fen[128];
  for (int i = 0; i < n && fread(&r, sizeof r, 1, in) == 1; i++) { recfen(&r, fen); setfen(fen); printf("%d\n", static_eval()); }
  return 0;
}

static int cmd_bench(int argc, char **argv) {
  if (argc < 6) { fprintf(stderr, "usage: nntool bench net.bin data.bin positions nodes\n"); return 1; }
  if (!loadnet(argv[2])) return 1;
  FILE *in = fopen(argv[3], "rb"); if (!in) { perror(argv[3]); return 1; }
  fseek(in, 0, SEEK_END); long n = ftell(in) / (long)sizeof(Rec); int np = atoi(argv[4]); double nl = atof(argv[5]), tn = 0, tt = 0;
  for (int i = 0; i < np && n > 0; i++) {
    Rec r; char fen[128]; fseek(in, (long)((i + 0.5) * n / np) * (long)sizeof(Rec), SEEK_SET); if (fread(&r, sizeof r, 1, in) != 1) break;
    recfen(&r, fen); setfen(fen); new_game();
    double t0 = js_now(); think(0, 0, 0, nl); tt += js_now() - t0; tn += resNodes;
  }
  printf("%s: %.0f knps (%d positions x %.0f nodes, king buckets %d)\n", argv[2], tn / (tt > 1 ? tt : 1), np, nl, nnOn ? nnKB : 0);
  return 0;
}

static int cmd_match(int argc, char **argv) {
  if (argc < 8) { fprintf(stderr, "usage: nntool match <uci binary> netA netB <nodes|Nms> games seed\n"); return 1; }
  signal(SIGPIPE, SIG_IGN);
  const char *lim = argv[5]; int games = atoi(argv[6]); xs ^= (u64)atoll(argv[7]) * 0x9E3779B97F4A7C15ULL; xr();
  char go[64]; size_t L = strlen(lim);
  if (L > 2 && !strcmp(lim + L - 2, "ms")) snprintf(go, sizeof go, "go movetime %d", atoi(lim)); else snprintf(go, sizeof go, "go nodes %d", atoi(lim));
  /* "binA,binB": a different build for each net (e.g. a net with another hidden size, tools/nnue/build.sh NN_H) */
  static char bins[2][1024]; strncpy(bins[0], argv[2], 1023); char *cm = strchr(bins[0], ','); strcpy(bins[1], cm ? cm + 1 : bins[0]); if (cm) *cm = 0;
  Eng e[2]; eng_start(&e[0], bins[0], argv[3]); eng_start(&e[1], bins[1], argv[4]);
  int w = 0, l = 0, d = 0, op[16], nop = 0;
  static char pos[1 << 15];
  for (int g = 0; g < games; g++) {
    if (!(g & 1)) nop = opening(op);
    int aWhite = !(g & 1), result = 0, adj = 0;   /* result for A */
    setfen(START); int mvs[600], nm = 0; for (int i = 0; i < nop; i++) { play(op[i]); mvs[nm++] = op[i]; }
    for (int i = 0; i < 2; i++) { fprintf(e[i].to, "ucinewgame\n"); fflush(e[i].to); }
    for (;;) {
      int lm[256], k = legal(lm), aToMove = (P.side == WHITE) == aWhite;
      if (!k) { result = in_check(&P) ? (aToMove ? -1 : 1) : 0; break; }
      if (P.half >= 100 || insufficient(&P) || reps() >= 2 || nm >= 500) { result = 0; break; }
      char *p = pos + sprintf(pos, "position startpos moves"); for (int i = 0; i < nm; i++) { char b[8]; move_to_uci(mvs[i], b); p += sprintf(p, " %s", b); }
      char mv[8]; int s; Eng *en = &e[aToMove ? 0 : 1];
      if (!eng_go(en, pos, go, mv, &s)) { fprintf(stderr, "engine stopped\n"); return 2; }
      int m = parse_uci(&P, mv); if (!m) { fprintf(stderr, "illegal move %s\n", mv); result = aToMove ? -1 : 1; break; }
      int as = aToMove ? s : -s;   /* score for A */
      if (abs(s) >= 1000) { if (adj && ((adj > 0) == (as > 0))) adj += adj > 0 ? 1 : -1; else adj = as > 0 ? 1 : -1; } else adj = 0;
      if (adj >= 8 || adj <= -8) { result = adj > 0 ? 1 : -1; break; }
      play(m); mvs[nm++] = m;
    }
    if (result > 0) w++; else if (result < 0) l++; else d++;
    fprintf(stderr, "game %d: %s  +%d -%d =%d\n", g + 1, result > 0 ? "A wins" : result < 0 ? "B wins" : "draw", w, l, d);
  }
  for (int i = 0; i < 2; i++) { fprintf(e[i].to, "quit\n"); fflush(e[i].to); waitpid(e[i].pid, NULL, 0); }
  printf("+%d -%d =%d\n", w, l, d); return 0;
}

int main(int argc, char **argv) {
  init(); new_game();
  if (argc > 1 && !strcmp(argv[1], "gen")) return cmd_gen(argc, argv);
  if (argc > 1 && !strcmp(argv[1], "rescore")) return cmd_rescore(argc, argv);
  if (argc > 1 && !strcmp(argv[1], "evalpos")) return cmd_evalpos(argc, argv);
  if (argc > 1 && !strcmp(argv[1], "match")) return cmd_match(argc, argv);
  if (argc > 1 && !strcmp(argv[1], "bench")) return cmd_bench(argc, argv);
  fprintf(stderr, "usage: nntool gen|rescore|evalpos|bench|match ... (see the top of tools/nnue/nntool.c)\n");
  return 1;
}
