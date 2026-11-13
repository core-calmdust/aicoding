/* kptool: the site's shogi engine (engine.c, native) with the HalfKP-style evaluation (-DNUE_KB) for testing a trained net.
   build (tools/nnue/build-kp.sh): cc -O3 -DNATIVE -DNUE_KB=9 -DNUE_H=256 -o kptool kptool.c
     (NUE_KB and NUE_H must match the net: the header of the file says them; build-kp.sh reads them)

   kptool evalpos <net> <data.psv> <n>     engine evaluation of the first n quiet positions (compare with trainkp --check)
   kptool walk <net> <data.psv> <n> [seed] random move sequences (many king moves) from n positions: the incrementally
                                           updated evaluation must equal a full recomputation at every step
   kptool bench <net> [nodes] [positions]  fixed-node searches on ../match/openings.txt: nodes per second, checksum
   kptool gen <net> <out.psv> <games> <nodes> [seed]   self-play data (PackedSfenValue, appended; for tests or extra data)
   KPNET=<net> kptool                      a USI engine (for tools/match/usimatch: the HalfKP net vs the current net);
                                           "setoption name Nodes value N" = nodes per move, "TimeMs" = time per move (else 90% of byoyomi)
   <net>: a NUEK file (trainkp), or with NUE_KB=1 also the current NUEQ net (then the engine must equal the shipped one). */
#define main usimatch_main
#include "../match/usimatch.c"
#undef main
#include "psv.h"

static int loadKP(const char *path) {
  FILE *f = fopen(path, "rb"); if (!f) { perror(path); return 0; }
  int hd[4], nb = 1; if (fread(hd, 4, 3, f) != 3) return 0;
  if (hd[0] == 0x5145554E) {   /* NUEQ: the current format = one bucket */
    if (NUE_KB != 1 || hd[1] != NUE_H || hd[2] != 2534) { fprintf(stderr, "%s: a NUEQ net needs a build with NUE_KB=1 NUE_H=%d\n", path, hd[1]); return 0; }
    memset(nueKMap, 0, sizeof nueKMap);
  } else {
    if ((hd[0] != 0x4B45554E && hd[0] != 0x4F45554E) || fread(hd + 3, 4, 1, f) != 1) { fprintf(stderr, "%s: not a NUEK / NUEO / NUEQ net\n", path); return 0; }
    if (hd[0] == 0x4F45554E && (fread(&nb, 4, 1, f) != 1 || nb != NUE_NB)) { fprintf(stderr, "%s: %d output buckets (the engine has %d)\n", path, nb, NUE_NB); return 0; }   /* NUEO: output buckets */
    if (hd[1] != NUE_H || hd[3] != NUE_KB || hd[2] != NUE_KB * 2534) { fprintf(stderr, "%s: H %d, %d buckets: rebuild with -DNUE_H=%d -DNUE_KB=%d\n", path, hd[1], hd[3], hd[1], hd[3]); return 0; }
    if (fread(nueKMap, 1, 84, f) != 84) return 0;
  }
  if (fread(nueW1, 2, (size_t)NUE_IN * NUE_H, f) != (size_t)NUE_IN * NUE_H || fread(nueB1, 4, NUE_H, f) != NUE_H || fread(nueW2, 2, (size_t)nb * 2 * NUE_H, f) != (size_t)nb * 2 * NUE_H || fread(nueB2, 4, nb, f) != (size_t)nb) { fprintf(stderr, "short net\n"); return 0; }
  fclose(f); nue_set_nb(nb);
  if (!nue_kinit()) { fprintf(stderr, "bad bucket map\n"); return 0; }
  return 1;
}
static void setPos(const Pos *p) { for (int s = 0; s < 81; s++) setupBuf[s] = p->board[s]; for (int i = 0; i < 16; i++) setupBuf[81 + i] = p->hand[i]; setupBuf[97] = (i8)p->side; set_position(); }
static const PSV *mapPsv(const char *path, long *n) {
  FILE *f = fopen(path, "rb"); if (!f) { perror(path); exit(1); }
  fseek(f, 0, SEEK_END); long sz = ftell(f); fseek(f, 0, SEEK_SET);
  long m = sz / (long)sizeof(PSV); if (m > 2000000) m = 2000000;
  PSV *d = malloc((size_t)(m ? m : 1) * sizeof(PSV)); if (fread(d, sizeof(PSV), m, f) != (size_t)m) { fprintf(stderr, "read error\n"); exit(1); }
  fclose(f); *n = m; return d;
}

static int cmd_eval(int argc, char **argv) {
  if (argc < 5 || !loadKP(argv[2])) return 1;
  nue_enable(1);
  long n; const PSV *d = mapPsv(argv[3], &n); long want = atol(argv[4]);
  for (long k = 0, shown = 0; k < n && shown < want; k++) {
    Pos p; if (psv_decode(&d[k], &p) || psv_in_check(&p)) continue;
    setPos(&p); printf("%.6f\n", get_eval()); shown++;
  }
  return 0;
}
static u32 ws = 12345;
static u32 wr(void) { ws ^= ws << 13; ws ^= ws >> 17; ws ^= ws << 5; return ws; }
static int cmd_walk(int argc, char **argv) {
  if (argc < 5 || !loadKP(argv[2])) return 1;
  nue_enable(1);
  long n; const PSV *d = mapPsv(argv[3], &n); long want = atol(argv[4]); if (argc > 5) ws = (u32)atoi(argv[5]) | 1;
  long checks = 0, bad = 0, kingMoves = 0, refreshes = 0;
  for (long k = 0, used = 0; k < n && used < want; k++) {
    Pos p; if (psv_decode(&d[k], &p)) continue;
    setPos(&p); used++;
    int depth = 0;
    for (int st = 0; st < 24; st++) {
      static i32 lm[700]; int nl = legalMoves(lm, 1); if (!nl) break;
      int m = lm[wr() % nl];
      if (wr() % 3 == 0) for (int i = 0; i < nl; i++) { int f = lm[i] & 127; if (f <= 80 && typeOf(board[f]) == OU) { m = lm[i]; break; } }   /* prefer king moves */
      int f = m & 127; if (f <= 80 && typeOf(board[f]) == OU) kingMoves++;
      doMove(m); depth++;
      if (nueRF[sp - 1]) refreshes++;
      if (wr() % 3 == 0) {   /* evaluate only sometimes: the lazy update then crosses several levels */
        double a = evaluate();
        nueOk[sp] = 0; nueRefresh(); double b = nueEval();
        checks++; if (a != b) { bad++; if (bad < 5) fprintf(stderr, "mismatch at record %ld step %d: %.6f vs %.6f\n", k, st, a, b); }
      }
      if (depth > 6 && wr() % 4 == 0) { undoMove(); depth--; }   /* walk back and forth */
    }
    while (depth--) undoMove();
    double a = evaluate(); nueOk[sp] = 0; nueRefresh(); double b = nueEval(); checks++; if (a != b) bad++;
  }
  printf("walk: %ld checks, %ld king moves (%ld changed bucket), %ld mismatches\n", checks, kingMoves, refreshes, bad);
  return bad ? 2 : 0;
}
static int cmd_bench(int argc, char **argv) {
  if (argc < 3 || !loadKP(argv[2])) return 1;
  nue_enable(1);
  int nodes = argc > 3 ? atoi(argv[3]) : 300000, np = argc > 4 ? atoi(argv[4]) : 12;
  FILE *f = fopen("../match/openings.txt", "r"); if (!f) f = fopen("shogi/tools/match/openings.txt", "r"); if (!f) f = fopen("tools/match/openings.txt", "r");
  if (!f) { perror("openings.txt"); return 1; }
  char line[2048]; unsigned long long ck = 1469598103934665603ull; long long tot = 0; double t = 0;
  for (int k = 0; k < np && fgets(line, sizeof line, f); k++) {
    nh = 0; setStart(); char *p = line, tok[16]; int nn;
    while (sscanf(p, " %15s%n", tok, &nn) == 1) { p += nn; int m = fromUsi(tok); if (!m) break; hist[nh++] = m; play_move(m); }
    tt_clear(); reset_search();
    double t0 = js_now(); int m = root_search(0, 0, nodes); t += js_now() - t0;
    tot += res[2];
    unsigned long long v[3] = { (unsigned)m, (unsigned long long)(long long)(resScore * 1000), (unsigned)res[2] };
    for (int i = 0; i < 3; i++) { ck ^= v[i]; ck *= 1099511628211ull; }
  }
  printf("nodes %lld  time %.0f ms  %.0f knps  checksum %016llx\n", tot, t, tot / (t > 0 ? t : 1), ck);
  return 0;
}
/* ---- self-play data in the PackedSfenValue format (the same files as the tanuki- data; prep / trainkp read them) */
static void pbits(uint8_t *d, int *bp, int v, int n) { for (int i = 0; i < n; i++, (*bp)++) if ((v >> i) & 1) d[*bp >> 3] |= (uint8_t)(1 << (*bp & 7)); }
static int ysqOf(int s) { return (8 - s % 9) * 9 + s / 9; }
static void packPsv(PSV *r) {
  memset(r, 0, sizeof *r); int bp = 0;
  pbits(r->sfen, &bp, side, 1);
  int ks[2] = { 81, 81 }; for (int s = 0; s < 81; s++) if (typeOf(board[s]) == OU) ks[colorOf(board[s])] = ysqOf(s);
  pbits(r->sfen, &bp, ks[0], 7); pbits(r->sfen, &bp, ks[1], 7);
  for (int y = 0; y < 81; y++) {
    int s = (y % 9) * 9 + (8 - y / 9), p = board[s];   /* engine square of YaneuraOu square y */
    if (p && typeOf(p) == OU) continue;
    if (!p) { pbits(r->sfen, &bp, 0, 1); continue; }
    int t = typeOf(p), base = t > OU ? t - 8 : t;   /* TO.. RY -> FU.. HI */
    pbits(r->sfen, &bp, HCODE[base], HBITS[base]);
    if (base != KI) pbits(r->sfen, &bp, t > OU, 1);
    pbits(r->sfen, &bp, colorOf(p), 1);
  }
  for (int c = 0; c < 2; c++) for (int t = 1; t <= 7; t++) for (int n = 0; n < hand[c * 8 + t]; n++) {
    pbits(r->sfen, &bp, HCODE[t] >> 1, HBITS[t] - 1);
    if (t != KI) pbits(r->sfen, &bp, 0, 1);
    pbits(r->sfen, &bp, c, 1);
  }
}
static int cmd_gen(int argc, char **argv) {
  if (argc < 6 || !loadKP(argv[2])) { if (argc < 6) fprintf(stderr, "usage: kptool gen <net> out.psv games nodes [seed]\n"); return 1; }
  nue_enable(1);
  const char *out = argv[3]; int games = atoi(argv[4]), nodes = atoi(argv[5]); if (argc > 6) ws = (u32)atoi(argv[6]) * 2654435761u | 1;
  FILE *of = fopen("../match/openings.txt", "r"); if (!of) of = fopen("shogi/tools/match/openings.txt", "r"); if (!of) of = fopen("tools/match/openings.txt", "r");
  static char ops[400][256]; int nops = 0; if (of) { while (nops < 400 && fgets(ops[nops], sizeof ops[0], of)) if (strlen(ops[nops]) > 3) nops++; fclose(of); }
  FILE *f = fopen(out, "ab"); if (!f) { perror(out); return 1; }
  static PSV rec[512]; long total = 0;
  for (int g = 0; g < games; g++) {
    nh = 0; setStart(); tt_clear(); reset_search();
    if (nops) { char *p = ops[wr() % nops], tok[16]; int k; while (sscanf(p, " %15s%n", tok, &k) == 1) { p += k; int m = fromUsi(tok); if (!m) break; hist[nh++] = m; play_move(m); } }
    for (int i = 0, x = wr() % 5; i < x; i++) { int nl = legalMoves(LBUF, 1); if (!nl) break; int m = LBUF[wr() % nl]; hist[nh++] = m; play_move(m); }
    int nr = 0, result = 0, adj = 0; i32 kl[600], kh[600]; int n0 = nh;   /* result: sente's point of view */
    for (int ply = nh; ; ply++) {
      replay();
      int reps = 0; for (int i = n0; i < ply; i++) if (kl[i] == hl && kh[i] == hh) reps++;
      kl[ply] = hl; kh[ply] = hh;
      if (reps >= 3 || ply >= 320) { result = 0; break; }
      int nl = legalMoves(LBUF, 1); if (!nl) { result = side ? 1 : -1; break; }
      int m = root_search(0, 0, nodes); if (!m) { result = side ? 1 : -1; break; }
      double sc = resScore;
      if (sc > 3000 || sc < -3000) { int w = (sc > 0) == (side == 0) ? 1 : -1; adj = adj * w > 0 ? adj + w : w; if (adj >= 4 || adj <= -4) { result = adj > 0 ? 1 : -1; break; } } else adj = 0;
      if (!inCheck() && nr < 512) { PSV *r = &rec[nr++]; packPsv(r); r->score = (int16_t)(sc > 3000 ? 3000 : sc < -3000 ? -3000 : sc); r->ply = (uint16_t)ply; r->pad = (uint8_t)side;
        int f = m & 127, t = (m >> 7) & 127; r->move = (uint16_t)(ysqOf(t) | (f > 80 ? ((f - 81) << 7) | (1 << 14) : ysqOf(f) << 7) | (((m >> 14) & 1) && f <= 80 ? 1 << 15 : 0)); }
      hist[nh++] = m;
    }
    for (int i = 0; i < nr; i++) { int s = rec[i].pad; rec[i].result = (int8_t)(s ? -result : result); rec[i].pad = 0; }
    fwrite(rec, sizeof(PSV), nr, f); fflush(f); total += nr;
    if ((g + 1) % 10 == 0) fprintf(stderr, "game %d/%d  %ld positions\n", g + 1, games, total);
  }
  fclose(f); return 0;
}
/* a small USI engine */
static int cmd_usi(void) {
  const char *net = getenv("KPNET"); if (!net || !loadKP(net)) { fprintf(stderr, "KPNET=<net file> is needed\n"); return 1; }
  nue_enable(1);
  int nodeLim = 0, timeMs = 0; static char line[1 << 16];
  setStart(); nh = 0;
  while (fgets(line, sizeof line, stdin)) {
    line[strcspn(line, "\r\n")] = 0;
    if (!strcmp(line, "usi")) { printf("id name CalmdustShogi-KP\nid author core-calmdust\noption name Nodes type spin default 0 min 0 max 1000000000\noption name TimeMs type spin default 0 min 0 max 600000\nusiok\n"); }
    else if (!strcmp(line, "isready")) printf("readyok\n");
    else if (!strncmp(line, "setoption name Nodes value ", 27)) nodeLim = atoi(line + 27);
    else if (!strncmp(line, "setoption name TimeMs value ", 28)) timeMs = atoi(line + 28);
    else if (!strcmp(line, "usinewgame")) { tt_clear(); reset_search(); }
    else if (!strncmp(line, "position startpos", 17)) {
      nh = 0; setStart(); char *p = strstr(line, "moves");
      if (p) { p += 5; char tok[16]; int k; while (sscanf(p, " %15s%n", tok, &k) == 1) { p += k; int m = fromUsi(tok); if (!m) break; hist[nh++] = m; play_move(m); } }
    } else if (!strncmp(line, "go", 2)) {
      double byo = 0; char *q = strstr(line, "byoyomi"); if (q) byo = atof(q + 8);
      replay();
      int m = nodeLim ? root_search(0, 0, nodeLim) : root_search(timeMs ? timeMs : byo > 0 ? byo * 0.9 : 1000, 0, 0);
      if (!m || resScore <= -(MATE - MAXPLY)) printf("bestmove resign\n");
      else { char b[8]; toUsi(m, b); printf("info depth %d score cp %d\nbestmove %s\n", res[1], (int)resScore, b); }
    } else if (!strcmp(line, "quit")) break;
    fflush(stdout);
  }
  return 0;
}
int main(int argc, char **argv) {
  init();
  if (argc > 1 && !strcmp(argv[1], "evalpos")) return cmd_eval(argc, argv);
  if (argc > 1 && !strcmp(argv[1], "walk")) return cmd_walk(argc, argv);
  if (argc > 1 && !strcmp(argv[1], "bench")) return cmd_bench(argc, argv);
  if (argc > 1 && !strcmp(argv[1], "gen")) return cmd_gen(argc, argv);
  if (argc == 1) return cmd_usi();
  fprintf(stderr, "usage: kptool evalpos|walk|bench|gen ... (see the top of tools/nnue/kptool.c), or KPNET=net kptool (USI)\n");
  return 1;
}
