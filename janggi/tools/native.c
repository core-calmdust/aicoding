// Native test / tool driver for janggi/engine.c
// build: gcc -O3 -march=native -DNATIVE -o /tmp/jg tools/native.c -lm
//   jg perft [depth] [fen]            move-generator check
//   jg bench [ms]                     search a few positions
//   jg match A B N seed [pre]         level A vs level B (engine.js LEVELS, mirrored here), colours alternate, random setups
//   jg evmatch i v lv N seed          evaluation weight evW[i] = v (A) vs the built-in (B), same level
//   jg mates N level seed out.txt     harvest mate puzzles from self-play games
//   jg mate "<fen>" maxK checks       solve one position
//   jg serve                          a game over stdin/stdout for tools/duel.py (two builds against each other):
//                                     new <cho> <han> | mv <move> | rnd <n> | go n <nodesK> | go t <ms> | quit
//   jg serve net.bin                  the same with the NNUE evaluation (tools/nnue/)
//   jg nncheck net.bin                incremental NNUE == recomputed, and its scale against the hand evaluation
//   jg nmatch net.bin lvA lvB N seed [pre]   A with the NNUE, B with the hand evaluation
//   jg datagen out.bin games nodesK seed [net.bin]   self-play records for tools/nnue/ (appends to out.bin)
//   jg scale games nodesK seed        the hand evaluation's points per logit of the game result (for datagen's JG_S)
// Game end here (as janggi/engine.js judge): checkmate; a position seen 3 times or 200 plies: the points decide
// (chariot 13, cannon 7, horse 5, elephant 3, guard 3, soldier 2; Han +1.5).
#include "../engine.c"
#include <math.h>
#include "../../xiangqi/tools/nnue/xq.h"   // the training record (the two games share the board layout and the piece codes)

static const char *SETUPS[4] = { "NBBN", "BNNB", "NBNB", "BNBN" };   // left to right from the player's own side: 마상상마 상마마상 마상마상 상마상마
static void startFen(char *o, int cho, int han) {
  // Cho (upper case, bottom) reads its set left to right on cols 1,2,6,7; Han's own left is the board's right
  const char *a = SETUPS[cho], *b = SETUPS[han];
  char top[10] = "r..a.a..r", bot[10] = "R..A.A..R";
  top[7] = b[0] + 32; top[6] = b[1] + 32; top[2] = b[2] + 32; top[1] = b[3] + 32;
  bot[1] = a[0]; bot[2] = a[1]; bot[6] = a[2]; bot[7] = a[3];
  char t2[16], b2[16]; int k = 0, e = 0;
  for (int i = 0; i < 9; i++) { if (top[i] == '.') { e++; continue; } if (e) { t2[k++] = '0' + e; e = 0; } t2[k++] = top[i]; } if (e) t2[k++] = '0' + e; t2[k] = 0;
  k = 0; e = 0;
  for (int i = 0; i < 9; i++) { if (bot[i] == '.') { e++; continue; } if (e) { b2[k++] = '0' + e; e = 0; } b2[k++] = bot[i]; } if (e) b2[k++] = '0' + e; b2[k] = 0;
  sprintf(o, "%s/4k4/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/4K4/%s w", t2, b2);
}
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

// ---------------------------------------------------------------- NNUE (tools/nnue/): load a net, per-side switch for matches
static int nnSide[2] = { -1, -1 };   // nmatch: 1 = NNUE, 0 = hand evaluation for that colour (-1: leave as is)
static int loadNet(const char *path) {
  FILE *f = fopen(path, "rb"); if (!f) { perror(path); return 0; }
  int hd[3]; if (fread(hd, 4, 3, f) != 3 || hd[0] != 0x5845554E || hd[1] != XQ_H || hd[2] != XQ_IN) { fprintf(stderr, "bad net %s\n", path); return 0; }
  if (fread(xqW1, 2, XQ_IN * XQ_H, f) != XQ_IN * XQ_H || fread(xqB1, 4, XQ_H, f) != XQ_H || fread(xqW2, 2, 2 * XQ_H, f) != 2 * XQ_H || fread(&xqB2, 4, 1, f) != 1) { fprintf(stderr, "short net\n"); return 0; }
  fclose(f); return 1;
}

// ---------------------------------------------------------------- levels (mirrors engine.js LEVELS)
typedef struct { double d; int noise, blunder; double nodesK; int ms; } Level;
static Level LV[21];
static void initLevels(void) {
  const Level T[21] = { { 0 },
    { 1, 300, 380, 0, 0 }, { 1, 230, 280, 0, 0 }, { 1.3, 200, 220, 0, 0 }, { 1.7, 170, 160, 0, 0 }, { 2.1, 135, 110, 0, 0 },
    { 2.5, 100, 75, 0, 0 }, { 2.8, 80, 55, 0, 0 }, { 3, 60, 40, 0, 0 }, { 3, 42, 22, 0, 0 }, { 3.5, 35, 15, 0, 0 },
    { 4, 30, 12, 0, 0 }, { 4, 20, 0, 0, 0 }, { 0, 0, 0, 2.4, 0 }, { 0, 0, 0, 11.5, 0 }, { 0, 0, 0, 36, 0 },
    { 0, 0, 0, 90, 0 }, { 0, 0, 0, 210, 0 }, { 0, 0, 0, 480, 0 }, { 0, 0, 0, 2500, 8000 }, { 0, 0, 0, 7000, 12000 } };
  memcpy(LV, T, sizeof(T));
}
#define JG_S 430.0   /* the hand evaluation's points per logit of the game result (jg scale) */
static u64 rng = 88172645463325252ull;
static u32 rnd32(void) { rng ^= rng << 13; rng ^= rng >> 7; rng ^= rng << 17; return (u32)rng; }
static double urand(void) { return (rnd32() + 0.5) / 4294967296.0; }
static double gauss(void) { double u = urand(), v = urand(); return sqrt(-2 * log(u)) * cos(2 * M_PI * v); }
static double msScale = 1.0;
static Move levelMove(int lv, int *val) {
  if (rootN == 1) { if (val) *val = 0; return rootL[0]; }
  if (lv < 0) { best(99, -lv, 0); if (val) *val = IO[1]; return (Move)IO[0]; }
  Level L = LV[lv];
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
  best(99, L.ms ? (int)(L.ms * msScale) : 0, L.nodesK <= 0 ? 0 : L.nodesK < 10 ? -(int)(L.nodesK * 10 + .5) : (int)L.nodesK);
  if (val) *val = IO[1];
  return (Move)IO[0];
}
static const int PTS[8] = { 0, 0, 30, 30, 50, 130, 70, 20 };   // points x10
static int pointsResult(void) {   // 1 Cho wins, -1 Han wins (Han +1.5)
  int p[2] = { 0, 15 }; for (int s = 0; s < 90; s++) if (B[s]) p[COLOR(B[s])] += PTS[TYPE(B[s])];
  return p[0] > p[1] ? 1 : -1;
}
static Move GH[HIST_MAX]; static u64 GK[HIST_MAX];
static int playGame(const u8 *board0, int sd0, int la, int lb, int pre, int maxPlies, int *pliesOut) {
  u8 board[90]; memcpy(board, board0, 90); int sd = sd0, nh = 0;
  new_game(); setupBoard(board, sd, GH, 0, 0, 0); GK[0] = KEY;
  int result = 0, ply;
  for (ply = 0; ply < maxPlies; ply++) {
    setupBoard(board, sd, GH, nh, 0, 0);
    if (!rootN) { result = side ? 1 : -1; break; }   // mated
    if (nnSide[side] >= 0 && nnSide[0] != nnSide[1]) { xq_nnue(nnSide[side]); new_game(); setupBoard(board, sd, GH, nh, 0, 0); }
    Move m = ply < pre ? rootL[rnd32() % rootN] : levelMove(side ? lb : la, 0);
    makeMove(m); GH[nh++] = m; GK[nh] = KEY;
    int cnt = 0; for (int i = nh; i >= 0; i--) if (GK[i] == KEY) cnt++;
    if (cnt >= 3) { result = pointsResult(); ply++; break; }
  }
  if (ply >= maxPlies) result = pointsResult();
  if (pliesOut) *pliesOut = ply;
  return result;
}
static void randomStart(u8 *b, int *sd) { char f[128]; startFen(f, rnd32() % 4, rnd32() % 4); loadFen(f, b, sd); }
static int mateLen(int maxK, int checks, u64 budgetK) {
  mChecks = checks;
  for (int k = 1; k <= maxK; k++) { mBudget = budgetK * 1000; mBudgetOut = 0; int r = mateAtt(k); if (r == 1) return k; if (r < 0) return -1; }
  return 0;
}
static int mateFirstMoves(int k, int checks, u64 budgetK, Move *first) {
  Move L[MAXMV]; int n = genLegal(L), cntM = 0;
  mChecks = checks;
  for (int i = 0; i < n; i++) {
    u8 c = makeMove(L[i]);
    int chk = attackedKing(side);
    if (checks && !chk) { unmakeMove(L[i], c); continue; }
    mBudget = budgetK * 1000; mBudgetOut = 0;
    int r = mateDef(k - 1);
    unmakeMove(L[i], c);
    if (r < 0) return -1;
    if (r == 1) { if (!cntM) *first = L[i]; cntM++; if (cntM > 1) return cntM; }
  }
  return cntM;
}
int main(int argc, char **argv) {
  initGeo(); initEval(); initLevels();
  char sf[128]; startFen(sf, 3, 3);
  u8 sb[90]; int ss; loadFen(sf, sb, &ss);
  if (argc > 1 && !strcmp(argv[1], "start")) { for (int a = 0; a < 4; a++) { startFen(sf, a, a); printf("%s\n", sf); } return 0; }
  if (argc > 1 && !strcmp(argv[1], "perft")) {
    int d = argc > 2 ? atoi(argv[2]) : 4; u8 b[90]; int sd;
    loadFen(argc > 3 ? argv[3] : sf, b, &sd); setupBoard(b, sd, 0, 0, 0, 0); loadRoot();
    for (int k = 1; k <= d; k++) { double t0 = now(); u64 n = perft(k); printf("perft %d = %llu  (%.0f ms)\n", k, (unsigned long long)n, now() - t0); fflush(stdout); }
    return 0;
  }
  if (argc > 1 && !strcmp(argv[1], "bench")) {
    int ms = argc > 2 ? atoi(argv[2]) : 2000;
    u8 b[90]; int sd; loadFen(sf, b, &sd); setupBoard(b, sd, 0, 0, 0, 0); new_game();
    double t0 = now(); best(99, ms, 0); double dt = now() - t0; char nm[8]; mvName(nm, (Move)IO[0]);
    printf("best %s v %d depth %d nodes %dk  %.0f knps\n", nm, IO[1], IO[2], IO[3], IO[3] / (dt / 1000));
    return 0;
  }
  if (argc > 1 && (!strcmp(argv[1], "match") || !strcmp(argv[1], "evmatch"))) {
    int ev = !strcmp(argv[1], "evmatch"), off = ev ? 2 : 0;
    int ei = ev ? atoi(argv[2]) : 0, evv = ev ? atoi(argv[3]) : 0, base = evW[ei];
    int A = atoi(argv[2 + off]), Bl = ev ? A : atoi(argv[3 + off]), N = atoi(argv[ev ? 5 : 4]); rng ^= (u64)atoll(argv[ev ? 6 : 5]) * 2654435761ull;
    int pre = argc > (ev ? 7 : 6) ? atoi(argv[ev ? 7 : 6]) : 2;
    double sc = 0; int w = 0, l = 0, dr = 0; long tp = 0;
    for (int g = 0; g < N; g++) {
      u8 b[90]; int sd; randomStart(b, &sd); int pl, aCho = (g & 1) == 0;
      int r;
      if (ev) { evW[ei] = aCho ? evv : base; /* both sides share the table: alternate by colour inside playGame is not possible: approximate with A = Cho side weights */ }
      r = aCho ? playGame(b, sd, A, Bl, pre, 200, &pl) : playGame(b, sd, Bl, A, pre, 200, &pl);
      int ra = aCho ? r : -r; tp += pl;
      if (ra > 0) { w++; sc += 1; } else if (ra < 0) l++; else { dr++; sc += .5; }
    }
    if (ev) evW[ei] = base;
    printf("lv %d vs lv %d: %d games  +%d -%d =%d  score %.3f  avg %ld plies\n", A, Bl, N, w, l, dr, sc / N, tp / N);
    return 0;
  }
  if (argc > 1 && !strcmp(argv[1], "fen")) {
    u8 b[90]; int sd; loadFen(argv[2], b, &sd); setupBoard(b, sd, 0, 0, 0, 0); new_game();
    best(99, argc > 3 ? atoi(argv[3]) : 1000, 0); char nm[8]; mvName(nm, (Move)IO[0]); printf("%s %d depth %d\n", nm, IO[1], IO[2]);
    return 0;
  }
  if (argc > 1 && !strcmp(argv[1], "mates")) {
    int N = atoi(argv[2]), lv = atoi(argv[3]); rng ^= (u64)atoll(argv[4]) * 2654435761ull; FILE *fo = fopen(argv[5], "w");
    int found = 0;
    for (int g = 0; g < N; g++) {
      u8 b[90]; int sd; randomStart(b, &sd);
      int nh = 0, pre = 4 + rnd32() % 8; new_game();
      setupBoard(b, sd, GH, 0, 0, 0); GK[0] = KEY;
      for (int ply = 0; ply < 260; ply++) {
        setupBoard(b, sd, GH, nh, 0, 0);
        if (!rootN) break;
        if (ply >= 16) {
          loadRoot();
          int k = mateLen(3, 0, 400);
          if (k > 0) {
            Move fm = 0; loadRoot(); int c1 = mateFirstMoves(k, 0, 2000, &fm);
            if (c1 == 1) { char fen[128]; loadRoot(); fenOf(fen); char nm[8]; mvName(nm, fm); fprintf(fo, "G %d %s %s %d\n", k, fen, nm, ply); found++; }
          } else if (k == 0) {
            loadRoot();
            int kc = mateLen(5, 1, 2000);
            if (kc >= 3) { Move fm = 0; loadRoot(); int c1 = mateFirstMoves(kc, 1, 4000, &fm); if (c1 == 1) { char fen[128]; loadRoot(); fenOf(fen); char nm[8]; mvName(nm, fm); fprintf(fo, "C %d %s %s %d\n", kc, fen, nm, ply); found++; } }
          }
          setupBoard(b, sd, GH, nh, 0, 0);
        }
        Move m = ply < pre ? rootL[rnd32() % rootN] : levelMove(lv, 0);
        makeMove(m); GH[nh++] = m; GK[nh] = KEY;
        int cnt = 0; for (int i = nh; i >= 0; i--) if (GK[i] == KEY) cnt++;
        if (cnt >= 3) break;
      }
      if ((g + 1) % 10 == 0) { fprintf(stderr, "%d games, %d mates\n", g + 1, found); fflush(fo); }
    }
    fclose(fo);
    return 0;
  }
  if (argc > 1 && !strcmp(argv[1], "dump")) {
    // dump N level seed out.txt: positions of self-play games (random setups and openings), "F <ply> <fen>" per line
    int N = atoi(argv[2]), lv = atoi(argv[3]); rng ^= (u64)atoll(argv[4]) * 2654435761ull; FILE *fo = fopen(argv[5], "w");
    for (int g = 0; g < N; g++) {
      u8 b[90]; int sd; randomStart(b, &sd);
      int nh = 0, pre = 4 + rnd32() % 6; new_game();
      setupBoard(b, sd, GH, 0, 0, 0); GK[0] = KEY;
      for (int ply = 0; ply < 200; ply++) {
        setupBoard(b, sd, GH, nh, 0, 0);
        if (!rootN) break;
        if (ply >= 8) { char fen[128]; loadRoot(); fenOf(fen); fprintf(fo, "F %d %s\n", ply, fen); setupBoard(b, sd, GH, nh, 0, 0); }
        Move m = ply < pre ? rootL[rnd32() % rootN] : levelMove(lv, 0);
        makeMove(m); GH[nh++] = m; GK[nh] = KEY;
        int cnt = 0; for (int i = nh; i >= 0; i--) if (GK[i] == KEY) cnt++;
        if (cnt >= 3) break;
      }
      if ((g + 1) % 20 == 0) { fprintf(stderr, "%d games\n", g + 1); fflush(fo); }
    }
    fclose(fo);
    return 0;
  }
  if (argc > 1 && !strcmp(argv[1], "mate")) {
    u8 b[90]; int sd; loadFen(argv[2], b, &sd); setupBoard(b, sd, 0, 0, 0, 0); loadRoot();
    int k = mateLen(atoi(argv[3]), atoi(argv[4]), 100000); Move fm = 0; int c1 = 0;
    if (k > 0) { loadRoot(); c1 = mateFirstMoves(k, atoi(argv[4]), 100000, &fm); }
    char nm[8]; mvName(nm, fm); printf("mate %d first %s count %d\n", k, nm, c1);
    return 0;
  }
  if (argc > 1 && !strcmp(argv[1], "nncheck")) {
    if (!loadNet(argv[2])) return 1;
    double sxy = 0, sxx = 0; int bad = 0, n = 0, np = 0;
    for (int g = 0; g < 200; g++) {
      u8 b[90]; int sd; randomStart(b, &sd);
      xq_nnue(1); setupBoard(b, sd, 0, 0, 0, 0); loadRoot();
      Move st[200]; u8 cs[200]; int d = 0;
      for (int k = 0; k < 160; k++) {
        Move L[MAXMV]; int m = genLegal(L); if (!m) break;
        st[d] = L[rnd32() % m]; if (!attackedKing(side) && urand() < 0.05) st[d] = MV(KSQ[side], KSQ[side]);   // (passes too: a test of that path)
        if (MF(st[d]) == MT(st[d])) np++;
        cs[d] = makeMove(st[d]); d++;
        int inc = evaluate(); xqOk[xqTop < XQ_ST ? xqTop : 0] = 0; int full = evaluate();
        if (inc != full) bad++;
        if (!attackedKing(side) && k > 6) { xqOn = 0; int lin = evaluate(); xqOn = 1; if (abs(lin) < 1500) { double o = full / (double)XQ_K; sxy += o * lin; sxx += o * o; n++; } }
        if (urand() < 0.3 && d > 0) { d--; unmakeMove(st[d], cs[d]); }
      }
    }
    printf("mismatches %d   hand ~ %.0f x logit (%d positions, %d passes; XQ_K = %d)\n", bad, sxy / sxx, n, np, XQ_K);
    return 0;
  }
  if (argc > 1 && !strcmp(argv[1], "nmatch")) {
    if (!loadNet(argv[2])) return 1;
    int A = atoi(argv[3]), Bl = atoi(argv[4]), N = atoi(argv[5]); rng ^= (u64)atoll(argv[6]) * 2654435761ull;
    int pre = argc > 7 ? atoi(argv[7]) : 2; double sc = 0; int w = 0, l = 0;
    for (int g = 0; g < N; g++) {
      u8 b[90]; int sd; randomStart(b, &sd);
      int aCho = (g & 1) == 0; nnSide[0] = aCho; nnSide[1] = !aCho;
      int r = aCho ? playGame(b, sd, A, Bl, pre, 200, 0) : playGame(b, sd, Bl, A, pre, 200, 0);
      if ((aCho ? r : -r) > 0) { w++; sc += 1; } else l++;
    }
    xq_nnue(0);
    printf("NNUE lv %d vs hand lv %d: %d games  +%d -%d  score %.3f\n", A, Bl, N, w, l, sc / N);
    return 0;
  }
  if (argc > 1 && (!strcmp(argv[1], "datagen") || !strcmp(argv[1], "scale"))) {
    // self-play at a fixed node count from a random setup + 2..9 random plies; every position with the search score, the
    // best move and (afterwards) the game result -> 56-byte records (xq.h). scale: fits points per logit instead of writing.
    int dg = !strcmp(argv[1], "datagen"), o = dg ? 1 : 0;
    int G = atoi(argv[2 + o]), nk = atoi(argv[3 + o]); rng ^= (u64)atoll(argv[4 + o]) * 2654435761ull;
    if (dg && argc > 6) { if (!loadNet(argv[6])) return 1; xq_nnue(1); }
    double S = xqOn ? XQ_K : (getenv("JG_S") ? atof(getenv("JG_S")) : JG_S);
    FILE *out = dg ? fopen(argv[2], "ab") : 0; if (dg && !out) { perror(argv[2]); return 1; }
    static Rec rec[256]; long tot = 0; double t0 = now();
    static double fx[400000]; static signed char fy[400000]; int fn = 0;
    for (int g = 0; g < G; g++) {
      u8 board[90]; int sd, nh = 0, nr = 0, result = 0, pre = 2 + rnd32() % 8, ply;
      randomStart(board, &sd); new_game(); setupBoard(board, sd, GH, 0, 0, 0); GK[0] = KEY;
      for (ply = 0; ply < 200; ply++) {
        setupBoard(board, sd, GH, nh, 0, 0);
        if (!rootN) { result = side ? 1 : -1; break; }
        Move m;
        if (ply < pre) m = rootL[rnd32() % rootN];
        else {
          int v = 0;
          if (rootN == 1) m = rootL[0]; else { best(99, 0, nk); m = (Move)IO[0]; v = IO[1]; setupBoard(board, sd, GH, nh, 0, 0); }
          if (rootN > 1 && nr < 256) {
            Rec *r = &rec[nr++]; memset(r, 0, sizeof *r);
            for (int s = 0; s < 90; s++) r->b[s >> 1] |= (uint8_t)(B[s] << ((s & 1) * 4));
            r->stm = (uint8_t)side; r->cp = (int16_t)(v > 20000 ? 30000 : v < -20000 ? -30000 : v);
            double p = 1 / (1 + exp(-v / S)); r->w = (int16_t)lrint(p * 1000); r->l = (int16_t)(1000 - r->w);
            r->move = (uint16_t)(MF(m) | MT(m) << 7);
            r->flags = (uint8_t)((attackedKing(side) ? REC_CHECK : 0) | (MF(m) != MT(m) && B[MT(m)] ? REC_CAPTURE : 0));
          }
        }
        makeMove(m); GH[nh++] = m; GK[nh] = KEY;
        int cnt = 0; for (int i = nh; i >= 0; i--) if (GK[i] == KEY) cnt++;
        if (cnt >= 3) { result = pointsResult(); break; }
      }
      if (!result) result = pointsResult();
      for (int i = 0; i < nr; i++) {
        rec[i].result = (int8_t)(rec[i].stm ? -result : result);
        if (!dg && !(rec[i].flags & (REC_CHECK | REC_CAPTURE)) && abs(rec[i].cp) < 3000 && fn < 400000) { fx[fn] = rec[i].cp; fy[fn++] = rec[i].result > 0; }
      }
      if (dg) { fwrite(rec, sizeof(Rec), nr, out); fflush(out); }
      tot += nr;
      if (dg && (g % 50 == 49 || g == G - 1)) fprintf(stderr, "\r  %d / %d games  %ld positions  %.0f pos/s   ", g + 1, G, tot, tot / ((now() - t0) / 1000));
    }
    if (dg) { fclose(out); fprintf(stderr, "\n"); return 0; }
    double a = 1 / 300.0;   // result ~ sigmoid(a * cp): Newton steps on the log-likelihood
    for (int it = 0; it < 30; it++) { double g1 = 0, g2 = 0; for (int i = 0; i < fn; i++) { double p = 1 / (1 + exp(-a * fx[i])); g1 += (fy[i] - p) * fx[i]; g2 += p * (1 - p) * fx[i] * fx[i]; } a += g1 / (g2 + 1e-9); }
    printf("%d positions: result ~ sigmoid(score / %.0f)\n", fn, 1 / a);
    return 0;
  }
  if (argc > 1 && !strcmp(argv[1], "serve")) {
    static u8 gb[90]; static int gsd, gnh; char ln[256];
    if (argc > 2) { if (!loadNet(argv[2])) return 1; xq_nnue(1); }
    setvbuf(stdout, 0, _IOLBF, 0);
    while (fgets(ln, sizeof ln, stdin)) {
      if (!strncmp(ln, "quit", 4)) break;
      if (!strncmp(ln, "new", 3)) { int a = 3, b = 3; sscanf(ln + 3, "%d %d", &a, &b); char f[128]; startFen(f, a, b); loadFen(f, gb, &gsd); gnh = 0; new_game(); setupBoard(gb, gsd, GH, 0, 0, 0); GK[0] = KEY; printf("ok\n"); continue; }
      setupBoard(gb, gsd, GH, gnh, 0, 0);
      if (!strncmp(ln, "mv", 2)) {   // -> ok | end R (R: 1 Cho wins, -1 Han wins)
        char nm[8], w[8]; sscanf(ln + 2, "%7s", w); Move m = 0; int ok = 0;
        for (int i = 0; i < rootN; i++) { mvName(nm, rootL[i]); if (!strcmp(nm, w)) { m = rootL[i]; ok = 1; } }
        if (!ok) { printf("bad\n"); continue; }
        makeMove(m); GH[gnh++] = m; GK[gnh] = KEY;
        int cnt = 0; for (int i = gnh; i >= 0; i--) if (GK[i] == KEY) cnt++;
        if (cnt >= 3 || gnh >= 200) { printf("end %d\n", pointsResult()); continue; }
        setupBoard(gb, gsd, GH, gnh, 0, 0);
        if (!rootN) { printf("end %d\n", side ? 1 : -1); continue; }
        printf("ok\n"); continue;
      }
      char nm[8];
      if (!strncmp(ln, "rnd", 3)) { mvName(nm, rootL[(u32)atoi(ln + 3) % rootN]); printf("%s\n", nm); continue; }
      if (!strncmp(ln, "go", 2)) {
        char k = 'n'; int x = 10; sscanf(ln + 2, " %c %d", &k, &x);
        if (rootN == 1) { mvName(nm, rootL[0]); printf("%s 0 0 0\n", nm); continue; }
        if (k == 't') best(99, x, 0); else best(99, 0, x);
        mvName(nm, (Move)IO[0]); printf("%s %d %d %llu\n", nm, IO[1], IO[2], (unsigned long long)nodes); continue;
      }
      printf("?\n");
    }
    return 0;
  }
  fprintf(stderr, "usage: see the comment at the top\n");
  return 1;
}
