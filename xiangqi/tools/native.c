// Native test / tool driver for xiangqi/engine.c
// build: gcc -O3 -march=native -DNATIVE -o /tmp/xq tools/native.c -lm   (see tools/build.sh)
// usage:
//   xq perft [depth] [fen]                 move-generator check (start position: 44 1920 79666 3290240 133312995)
//   xq bench [ms]                          search a few positions
//   xq selfplay N nodes seed out.bin       self-play games; every quiet position's features + game result (for tools/tune.py)
//   xq match A B N seed                    level A vs level B (engine.js LEVELS, mirrored here), N games, colours alternate
//   xq mates N seed out.txt                harvest mate puzzles from self-play games (see tools/build_puzzles.py)
#include "../engine.c"
#include <math.h>

static const char *START_FEN = "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w";
static int pieceOf(char ch) {
  const char *s = "kabnrcp"; int col = ch >= 'a' && ch <= 'z' ? 1 : 0; char lc = col ? ch : ch + 32;
  if (lc == 'e') lc = 'b'; if (lc == 'h') lc = 'n';
  for (int i = 0; i < 7; i++) if (s[i] == lc) return (i + 1) | (col << 3);
  return 0;
}
static int loadFen(const char *fen, u8 *board, int *sd) {
  memset(board, 0, 90); int r = 0, c = 0; const char *p = fen;
  for (; *p && *p != ' '; p++) {
    if (*p == '/') { r++; c = 0; continue; }
    if (*p >= '1' && *p <= '9') { c += *p - '0'; continue; }
    if (r > 9 || c > 8) return 0;
    board[r * 9 + c] = (u8)pieceOf(*p); c++;
  }
  while (*p == ' ') p++;
  *sd = *p == 'b' ? 1 : 0;
  return 1;
}
static void fenOf(char *o) {
  int k = 0;
  for (int r = 0; r < 10; r++) {
    int e = 0;
    for (int c = 0; c < 9; c++) {
      u8 p = B[r * 9 + c];
      if (!p) { e++; continue; }
      if (e) { o[k++] = '0' + e; e = 0; }
      char ch = "?kabnrcp"[TYPE(p)]; o[k++] = COLOR(p) ? ch : ch - 32;
    }
    if (e) o[k++] = '0' + e;
    if (r < 9) o[k++] = '/';
  }
  o[k++] = ' '; o[k++] = side ? 'b' : 'w'; o[k] = 0;
}
static void setupBoard(const u8 *board, int sd, const Move *hist, int nh, const Move *excl, int nx) {
  for (int s = 0; s < 90; s++) IO[s] = board[s];
  IO[90] = sd; IO[91] = nh; for (int i = 0; i < nh; i++) IO[92 + i] = hist[i];
  IO[92 + nh] = nx; for (int i = 0; i < nx; i++) IO[93 + nh + i] = excl[i];
  if (!setup()) { fprintf(stderr, "bad setup\n"); exit(1); }
}
static u64 perft(int d) {
  Move L[MAXMV]; int n = genLegal(L);
  if (d == 1) return n;
  u64 s = 0; for (int i = 0; i < n; i++) { u8 c = makeMove(L[i]); s += perft(d - 1); unmakeMove(L[i], c); }
  return s;
}
static void mvName(char *o, Move m) { int f = MF(m), t = MT(m); sprintf(o, "%c%d%c%d", 'a' + f % 9, 9 - f / 9, 'a' + t % 9, 9 - t / 9); }

// ---------------------------------------------------------------- levels (mirrors engine.js LEVELS)
typedef struct { double d; int noise, blunder, nodesK, ms; } Level;   // d: search depth, a fraction = chance of one ply more
static Level LV[21];
static void initLevels(void) {
  // weak levels: fixed-depth values + noise (points) + blunder chance (per mille); strong levels: node / time limits
  const Level T[21] = { { 0 },
    { 1, 300, 380, 0, 0 }, { 1, 230, 280, 0, 0 }, { 1.3, 200, 220, 0, 0 }, { 1.7, 170, 160, 0, 0 }, { 2.1, 135, 110, 0, 0 },
    { 2.5, 100, 75, 0, 0 }, { 2.8, 80, 55, 0, 0 }, { 3, 60, 40, 0, 0 }, { 3, 42, 22, 0, 0 }, { 3.5, 35, 15, 0, 0 },
    { 4, 30, 12, 0, 0 }, { 4, 20, 0, 0, 0 }, { 0, 0, 0, 10, 0 }, { 0, 0, 0, 25, 0 }, { 0, 0, 0, 60, 0 },
    { 0, 0, 0, 150, 0 }, { 0, 0, 0, 400, 0 }, { 0, 0, 0, 1000, 0 }, { 0, 0, 0, 2500, 0 }, { 0, 0, 0, 6000, 8000 } };
  memcpy(LV, T, sizeof(T));
}
static u64 rng = 88172645463325252ull;
static u32 rnd32(void) { rng ^= rng << 13; rng ^= rng >> 7; rng ^= rng << 17; return (u32)rng; }
static double urand(void) { return (rnd32() + 0.5) / 4294967296.0; }
static double gauss(void) { double u = urand(), v = urand(); return sqrt(-2 * log(u)) * cos(2 * M_PI * v); }
static double msScale = 1.0;   // tools: time-limited levels run with ms * msScale
// pick a move for level lv in the current IO setup; returns the move and *val (side to move's view)
static Move levelMove(int lv, int *val) {
  Level L = LV[lv];
  if (rootN == 1) { if (val) *val = 0; return rootL[0]; }
  if (L.d) {
    values((int)L.d + (urand() < L.d - (int)L.d ? 1 : 0));
    int n = IO[0]; Move ms[MAXMV]; int vs[MAXMV]; for (int i = 0; i < n; i++) { ms[i] = (Move)IO[2 + 2 * i]; vs[i] = IO[3 + 2 * i]; }
    if (val) *val = vs[0];
    if (L.blunder && (int)(urand() * 1000) < L.blunder) {
      int k = 0; Move pool[MAXMV]; for (int i = 0; i < n; i++) if (vs[i] > vs[0] - 400 && vs[i] > -WINT) pool[k++] = ms[i];
      if (k > 1) return pool[rnd32() % k];
    }
    int bi = 0; double bv = -1e9;
    for (int i = 0; i < n; i++) { double x = vs[i] + (abs(vs[i]) > WINT - 1000 ? 0 : gauss() * L.noise); if (x > bv) { bv = x; bi = i; } }
    return ms[bi];
  }
  best(99, L.ms ? (int)(L.ms * msScale) : 0, L.nodesK);
  if (val) *val = IO[1];
  return (Move)IO[0];
}

// ---------------------------------------------------------------- game play (with the host's repetition judgement simplified:
// threefold repetition: perpetual check loses, otherwise a draw; 120 plies without capture: draw)
static Move GH[HIST_MAX]; static u64 GK[HIST_MAX]; static u8 GC[HIST_MAX];
typedef struct { int result; int plies; } GameRes;
static int judgeRep(int nk) {   // returns 0 none, 1 draw, 2 red wins, 3 black wins (perpetual check)
  u64 k = GK[nk - 1]; int cnt = 0, first = -1;
  for (int i = nk - 1; i >= 0; i--) if (GK[i] == k) { cnt++; first = i; if (cnt >= 3) break; }
  if (cnt < 3) return 0;
  // side to move at the last position: moves in the cycle from `first`
  int cur = nk - 1, oppAll = 1, meAll = 1;
  for (int j = first + 1; j <= cur; j++) { if (((cur - j) & 1) == 0) { if (!GC[j]) oppAll = 0; } else { if (!GC[j]) meAll = 0; } }
  int stm = side;   // side to move now
  if (oppAll && !meAll) return stm == 0 ? 2 : 3;
  if (meAll && !oppAll) return stm == 0 ? 3 : 2;
  return 1;
}
// play from (board, sd) after `pre` random plies; levels a (red) and b (black). result: 1 red wins, -1 black wins, 0 draw
static int wswap = 0; static i32 WSIDE[2][NW];   // wmatch: per-side evaluation weights
static FILE *featOut = 0; static int featEvery = 1;
typedef struct { short n; short ph; float stm; } FeatHdr;
static int playGame(const u8 *board0, int sd0, int la, int lb, int pre, int maxPlies, int *pliesOut, int recordFeat) {
  u8 board[90]; memcpy(board, board0, 90); int sd = sd0;
  int nh = 0, lastCap = 0;
  static int recI[HIST_MAX][256], recV[HIST_MAX][256], recN[HIST_MAX], recPh[HIST_MAX], recSide[HIST_MAX]; int nrec = 0;
  new_game();
  setupBoard(board, sd, GH, 0, 0, 0);
  GK[0] = KEY; GC[0] = (u8)attackedKing(side);
  int result = 0, ply;
  for (ply = 0; ply < maxPlies; ply++) {
    setupBoard(board, sd, GH, nh, 0, 0);
    if (!rootN) { result = side ? 1 : -1; break; }
    if (noAttackers()) { result = 0; break; }
    Move m;
    if (ply < pre) m = rootL[rnd32() % rootN];
    else {
      int lv = side ? lb : la, v = 0;
      if (wswap) { initEval(); memcpy(W_, WSIDE[side], sizeof(W_)); memset(TT, 0, sizeof(TT)); }
      m = levelMove(lv, &v);
      // a move that would repeat the position for the third time with a loss (perpetual check) is avoided
      if (recordFeat && ply >= pre + 2 && !attackedKing(side) && (nh % featEvery) == 0) {
        // quiet position: record the features (qsearch-stable: no capture available that wins material immediately is not checked)
        int ph; featFlag = 1; evaluateRed(&ph); featFlag = 0;
        if (B[MT(m)] == 0 && abs(v) < 2000) {
          recN[nrec] = FN; recPh[nrec] = ph; recSide[nrec] = side; memcpy(recI[nrec], FI, FN * 4); memcpy(recV[nrec], FV, FN * 4); nrec++;
        }
      }
    }
    u8 c = makeMove(m);
    GH[nh++] = m; GK[nh] = KEY; GC[nh] = (u8)attackedKing(side);
    if (c) lastCap = nh;
    int rep = judgeRep(nh + 1);
    if (rep) { result = rep == 1 ? 0 : rep == 2 ? 1 : -1; ply++; break; }
    if (nh - lastCap >= DRAW_PLIES) { result = 0; ply++; break; }
  }
  if (pliesOut) *pliesOut = ply;
  if (featOut && nrec) {
    for (int i = 0; i < nrec; i++) {
      FeatHdr h = { (short)recN[i], (short)recPh[i], (float)result };
      fwrite(&h, sizeof h, 1, featOut);
      short buf[512]; for (int j = 0; j < recN[i]; j++) { buf[2 * j] = (short)recI[i][j]; buf[2 * j + 1] = (short)recV[i][j]; }
      fwrite(buf, 2, 2 * recN[i], featOut);
    }
  }
  return result;
}
// play with specific player settings (used by selfplay): node budget for both
static int nodePlayerK = 0;

// ---------------------------------------------------------------- mate harvesting
// For positions of self-play games: does the side to move mate in exactly k (k = 1..maxK) with a unique first move?
static int mateLen(int maxK, int checks, u64 budgetK) {   // shortest mate (attacker = side to move) within maxK, 0 = none, -1 = unknown
  mChecks = checks;
  for (int k = 1; k <= maxK; k++) { mBudget = budgetK * 1000; mBudgetOut = 0; int r = mateAtt(k); if (r == 1) return k; if (r < 0) return -1; }
  return 0;
}
// first moves that mate within k: count (stops at 2) and the move
static int mateFirstMoves(int k, int checks, u64 budgetK, Move *first) {
  Move L[MAXMV]; int n = genLegal(L), cntM = 0, me = side;
  mChecks = checks;
  for (int i = 0; i < n; i++) {
    u8 c = makeMove(L[i]);
    int chk = attackedKing(side);
    if (checks && !chk) { unmakeMove(L[i], c); continue; }
    mBudget = budgetK * 1000; mBudgetOut = 0;
    int r = mateDef(k - 1);
    unmakeMove(L[i], c);
    (void)me;
    if (r < 0) return -1;
    if (r == 1) { if (!cntM) *first = L[i]; cntM++; if (cntM > 1) return cntM; }
  }
  return cntM;
}

int main(int argc, char **argv) {
  initGeo(); initEval(); initLevels();
  u8 sb[90]; int ss; loadFen(START_FEN, sb, &ss);
  if (argc > 1 && !strcmp(argv[1], "perft")) {
    int d = argc > 2 ? atoi(argv[2]) : 4; u8 b[90]; int sd;
    loadFen(argc > 3 ? argv[3] : START_FEN, b, &sd); setupBoard(b, sd, 0, 0, 0, 0); loadRoot();
    for (int k = 1; k <= d; k++) { double t0 = now(); u64 n = perft(k); printf("perft %d = %llu  (%.0f ms)\n", k, (unsigned long long)n, now() - t0); fflush(stdout); }
    return 0;
  }
  if (argc > 1 && !strcmp(argv[1], "bench")) {
    int ms = argc > 2 ? atoi(argv[2]) : 2000;
    const char *F[] = { START_FEN, "r1bakab1r/9/1cn4cn/p1p1p1p1p/9/9/P1P1P1P1P/1C2C1N2/9/RNBAKAB1R w", "3ak4/4a4/4b4/9/9/9/9/4C4/4p4/4K4 w", "4k4/9/9/9/9/9/9/9/4A4/3AK1R2 w" };
    for (int i = 0; i < 4; i++) {
      u8 b[90]; int sd; loadFen(F[i], b, &sd); setupBoard(b, sd, 0, 0, 0, 0); new_game();
      double t0 = now(); best(99, ms, 0); double dt = now() - t0; char nm[8]; mvName(nm, (Move)IO[0]);
      printf("%-60s best %s v %d depth %d nodes %dk  %.0f knps\n", F[i], nm, IO[1], IO[2], IO[3], IO[3] / (dt / 1000));
    }
    return 0;
  }
  if (argc > 1 && !strcmp(argv[1], "selfplay")) {
    // selfplay N level seed out.bin [pre]
    int N = atoi(argv[2]), lv = atoi(argv[3]); rng ^= (u64)atoll(argv[4]) * 2654435761ull; featOut = fopen(argv[5], "wb");
    int pre = argc > 6 ? atoi(argv[6]) : 6;
    int w = 0, l = 0, d = 0; long tot = 0;
    for (int g = 0; g < N; g++) {
      int pl, r = playGame(sb, ss, lv, lv, pre + (int)(rnd32() % 4), 400, &pl, 1);
      if (r > 0) w++; else if (r < 0) l++; else d++; tot += pl;
      if ((g + 1) % 50 == 0) { fprintf(stderr, "%d games  red %d black %d draw %d  avg %ld plies\n", g + 1, w, l, d, tot / (g + 1)); fflush(featOut); }
    }
    fclose(featOut);
    printf("red %d black %d draw %d\n", w, l, d);
    return 0;
  }
  if (argc > 1 && !strcmp(argv[1], "match")) {
    // match A B N seed [pre] [msScale]: A and B alternate colours; prints A's score
    int A = atoi(argv[2]), Bl = atoi(argv[3]), N = atoi(argv[4]); rng ^= (u64)atoll(argv[5]) * 2654435761ull;
    int pre = argc > 6 ? atoi(argv[6]) : 2; if (argc > 7) msScale = atof(argv[7]);
    double sc = 0; int w = 0, l = 0, dr = 0;
    for (int g = 0; g < N; g++) {
      u64 save = rng; int pl;
      int aRed = (g & 1) == 0;
      if (aRed) { save = rng; }
      int r = aRed ? playGame(sb, ss, A, Bl, pre, 400, &pl, 0) : playGame(sb, ss, Bl, A, pre, 400, &pl, 0);
      (void)save;
      int ra = aRed ? r : -r;
      if (ra > 0) { w++; sc += 1; } else if (ra < 0) l++; else { dr++; sc += .5; }
    }
    printf("lv %d vs lv %d: %d games  +%d -%d =%d  score %.3f\n", A, Bl, N, w, l, dr, sc / N);
    return 0;
  }
  if (argc > 1 && !strcmp(argv[1], "wmatch")) {
    // wmatch weights.h lv N seed [pre]: weights from the file (A) vs the built-in weights (B), same level, colours alternate
    initEval(); i32 alt[NW]; FILE *f = fopen(argv[2], "r"); char buf[1 << 16]; size_t n = fread(buf, 1, sizeof buf - 1, f); buf[n] = 0; fclose(f);
    char *q = strchr(buf, '{'); for (int i = 0; i < NW; i++) { alt[i] = (i32)strtol(q + 1, &q, 10); }
    int lv = atoi(argv[3]), N = atoi(argv[4]); rng ^= (u64)atoll(argv[5]) * 2654435761ull; int pre = argc > 6 ? atoi(argv[6]) : 4;
    i32 base[NW]; memcpy(base, W_, sizeof base); wswap = 1; double sc = 0; int w = 0, l = 0, dr = 0;
    for (int g = 0; g < N; g++) {
      int aRed = (g & 1) == 0, pl; memcpy(WSIDE[0], aRed ? alt : base, sizeof base); memcpy(WSIDE[1], aRed ? base : alt, sizeof base);
      int r = playGame(sb, ss, lv, lv, pre, 400, &pl, 0), ra = aRed ? r : -r;
      if (ra > 0) { w++; sc += 1; } else if (ra < 0) l++; else { dr++; sc += .5; }
      if ((g + 1) % 20 == 0) fprintf(stderr, "%d: +%d -%d =%d\n", g + 1, w, l, dr);
    }
    printf("file weights vs built-in at lv %d: %d games  +%d -%d =%d  score %.3f\n", lv, N, w, l, dr, sc / N);
    return 0;
  }
  if (argc > 1 && !strcmp(argv[1], "fen")) {   // fen "<fen>" ms : search one position
    u8 b[90]; int sd; loadFen(argv[2], b, &sd); setupBoard(b, sd, 0, 0, 0, 0); new_game();
    best(99, argc > 3 ? atoi(argv[3]) : 1000, 0); char nm[8]; mvName(nm, (Move)IO[0]); printf("%s %d depth %d\n", nm, IO[1], IO[2]);
    return 0;
  }
  if (argc > 1 && !strcmp(argv[1], "mates")) {
    // mates N level seed out.txt: play N self-play games (level, random openings); after every position check for short mates
    int N = atoi(argv[2]), lv = atoi(argv[3]); rng ^= (u64)atoll(argv[4]) * 2654435761ull; FILE *fo = fopen(argv[5], "w");
    int found = 0;
    for (int g = 0; g < N; g++) {
      int nh = 0, lastCap = 0, pre = 4 + rnd32() % 8; new_game();
      setupBoard(sb, ss, GH, 0, 0, 0); GK[0] = KEY; GC[0] = (u8)attackedKing(side);
      for (int ply = 0; ply < 300; ply++) {
        setupBoard(sb, ss, GH, nh, 0, 0);
        if (!rootN || noAttackers()) break;
        // mate search on this position (both general and checks-only)
        if (ply >= 16) {
          loadRoot();
          int k = mateLen(3, 0, 400);
          if (k > 0) {
            Move fm = 0; loadRoot(); int c1 = mateFirstMoves(k, 0, 2000, &fm);
            if (c1 == 1) { char fen[128]; loadRoot(); fenOf(fen); char nm[8]; mvName(nm, fm); fprintf(fo, "G %d %s %s %d\n", k, fen, nm, ply); found++; }
          } else if (k == 0) {
            loadRoot();
            int kc = mateLen(7, 1, 2000);
            if (kc >= 3) { Move fm = 0; loadRoot(); int c1 = mateFirstMoves(kc, 1, 4000, &fm); if (c1 == 1) { char fen[128]; loadRoot(); fenOf(fen); char nm[8]; mvName(nm, fm); fprintf(fo, "C %d %s %s %d\n", kc, fen, nm, ply); found++; } }
          }
          setupBoard(sb, ss, GH, nh, 0, 0);
        }
        Move m = ply < pre ? rootL[rnd32() % rootN] : levelMove(lv, 0);
        u8 c = makeMove(m); GH[nh++] = m; GK[nh] = KEY; GC[nh] = (u8)attackedKing(side); if (c) lastCap = nh;
        if (judgeRep(nh + 1) || nh - lastCap >= DRAW_PLIES) break;
      }
      if ((g + 1) % 10 == 0) { fprintf(stderr, "%d games, %d mates\n", g + 1, found); fflush(fo); }
    }
    fclose(fo);
    return 0;
  }
  if (argc > 1 && !strcmp(argv[1], "dump")) {
    // dump N level seed out.txt: positions of self-play games (random openings), one FEN per line with the ply ("F <ply> <fen>")
    int N = atoi(argv[2]), lv = atoi(argv[3]); rng ^= (u64)atoll(argv[4]) * 2654435761ull; FILE *fo = fopen(argv[5], "w");
    for (int g = 0; g < N; g++) {
      int nh = 0, lastCap = 0, pre = 4 + rnd32() % 6; new_game();
      setupBoard(sb, ss, GH, 0, 0, 0); GK[0] = KEY; GC[0] = (u8)attackedKing(side);
      for (int ply = 0; ply < 300; ply++) {
        setupBoard(sb, ss, GH, nh, 0, 0);
        if (!rootN || noAttackers()) break;
        if (ply >= 8) { char fen[128]; loadRoot(); fenOf(fen); fprintf(fo, "F %d %s\n", ply, fen); setupBoard(sb, ss, GH, nh, 0, 0); }
        Move m = ply < pre ? rootL[rnd32() % rootN] : levelMove(lv, 0);
        u8 c = makeMove(m); GH[nh++] = m; GK[nh] = KEY; GC[nh] = (u8)attackedKing(side); if (c) lastCap = nh;
        if (judgeRep(nh + 1) || nh - lastCap >= DRAW_PLIES) break;
      }
    }
    fclose(fo);
    return 0;
  }
  if (argc > 1 && !strcmp(argv[1], "mate")) {   // mate "<fen>" maxK checks : solve one position
    u8 b[90]; int sd; loadFen(argv[2], b, &sd); setupBoard(b, sd, 0, 0, 0, 0); loadRoot();
    int k = mateLen(atoi(argv[3]), atoi(argv[4]), 100000); Move fm = 0; int c1 = 0;
    if (k > 0) { loadRoot(); c1 = mateFirstMoves(k, atoi(argv[4]), 100000, &fm); }
    char nm[8]; mvName(nm, fm); printf("mate %d first %s count %d\n", k, nm, c1);
    return 0;
  }
  fprintf(stderr, "usage: see the comment at the top\n");
  return 1;
}
