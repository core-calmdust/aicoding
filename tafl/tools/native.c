// Native test / tool driver for tafl/engine.c
// build: gcc -O3 -march=native -DNATIVE -o /tmp/tafl tools/native.c -lm
//   perft <variant> <depth>                 move-generator count from the start
//   bench <variant> <nodesK>                 time of one search from the start
//   match <variant> <games> <lvA> <lvB> [randomPlies]   level A vs level B, both sides (A plays attackers in half the games)
//   ladder <variant> <games> <from> <to> [randomPlies]  adjacent levels (L vs L+1) for every L in [from, to)
//   selfplay <variant> <games> <level> <out.txt> [seed]  positions of self-play games (one line per position: cells side ply)
#include "../engine.c"
#include <math.h>

static const char *START[3] = {
  // Copenhagen 11x11
  "...aaaaa........a................a....d....aa...ddd...aaa.ddkdd.aaa...ddd...aa....d....a................a........aaaaa...",
  // Brandubh 7x7
  "...a......a......d...aadkdaa...d......a......a...",
  // Tablut 9x9
  "...aaa.......a........d....a...d...aaaddkddaaa...d...a....d........a.......aaa...",
};
static void startPos(int v, Pos *p) {
  setVariant(v); evalInit(); posInit(p);
  const char *s = START[v];
  for (int i = 0; i < N * N; i++) { char ch = s[i]; p->b[SQ(i / N, i % N)] = ch == 'a' ? ATT : ch == 'd' ? DEF : ch == 'k' ? KNG : EMP; }
  p->side = 0; posCount(p);
}
static u64 perft(const Pos *p, int d) {
  Move L[MAXMV]; int n = gen(p, L);
  if (d == 1) return n;
  u64 s = 0; for (int i = 0; i < n; i++) { Pos q = *p; doMove(&q, &L[i]); if (q.res) { s++; continue; } s += perft(&q, d - 1); }
  return s;
}
static u64 rng = 88172645463325252ull;
static u32 rnd32(void) { rng ^= rng << 13; rng ^= rng >> 7; rng ^= rng << 17; return (u32)rng; }
// load the host buffer from a start position + move list and call setup()
static Pos GSTART; static Move GH[2100]; static int GN;
static int setupHist(void) {
  int nn = N * N; IO[0] = VAR; IO[1] = GSTART.side;
  for (int i = 0; i < nn; i++) { int x = GSTART.b[SQ(i / N, i % N)]; IO[2 + i] = x; }
  IO[2 + nn] = GN;
  for (int i = 0; i < GN; i++) IO[3 + nn + i] = fromPad(GH[i].f) | (fromPad(GH[i].t) << 8);
  return setup();
}
static void printPos(const Pos *p) {
  for (int r = 0; r < N; r++) { for (int c = 0; c < N; c++) { int x = p->b[SQ(r, c)]; putc(x == ATT ? 'a' : x == DEF ? 'd' : x == KNG ? 'k' : (FL[SQ(r, c)] & F_RESTR) ? '+' : '.', stderr); } putc('\n', stderr); }
}
// play one game between levels lvA (attackers) and lvD (defenders). returns 1 attackers win, -1 defenders win, 0 draw
static FILE *POSOUT = 0;
static int *PW[2] = { 0, 0 }, TUNE_NK = 3;   // tuning: the weights of the attackers / defenders player
static int plyCount;
static int playGame(int v, int lvA, int lvD, int randomPlies) {
  Pos p; startPos(v, &p); GSTART = p; GN = 0;
  u64 keys[2100]; int nk = 0; keys[nk++] = p.h;
  int quiet = 0, result = 0;
  new_game();
  for (int ply = 0; ply < 1000; ply++) {
    Move L[MAXMV]; int n = gen(&p, L);
    if (!n) { result = p.side ? 1 : -1; break; }
    Move m;
    if (ply < randomPlies) m = L[rnd32() % n];
    else {
      if (!setupHist()) { fprintf(stderr, "bad setup\n"); exit(1); }
      ttSalt = p.side ? 0x5bd1e9955bd1e995ull : 0;
      if (PW[0]) { memcpy(EW, PW[p.side], sizeof(EW)); best(99, 0, TUNE_NK); }
      else think(p.side ? lvD : lvA, (int)rnd32());
      int x = IO[0]; m.f = (u8)toPad(x & 255); m.t = (u8)toPad((x >> 8) & 255);
      if (POSOUT && ply >= randomPlies) {
        fprintf(POSOUT, "%d ", v);
        for (int i = 0; i < N * N; i++) { int y = p.b[SQ(i / N, i % N)]; fputc(".adk"[y], POSOUT); }
        fprintf(POSOUT, " %d %d\n", p.side, ply);
      }
    }
    GH[GN++] = m;
    doMove(&p, &m);
    if (p.res) { result = p.res == 1 ? 1 : -1; break; }
    quiet = p.ncap ? 0 : quiet + 1;
    keys[nk++] = p.h;
    int rep = 0; for (int i = 0; i < nk - 1; i++) if (keys[i] == keys[nk - 1]) rep++;
    if (rep >= 2) { result = 1; break; }           // third occurrence: the defenders lose
    if (quiet >= DRAW_PLIES) { result = 0; break; }
  }
  plyCount = GN;
  if (getenv("SHOW")) { fprintf(stderr, "\nresult %d after %d plies\n", result, GN); printPos(&p); }
  return result;
}
static double eloOf(double sc) { return sc <= 0 ? -999 : sc >= 1 ? 999 : -400 * log10(1 / sc - 1); }
typedef struct { int aw, al, ad, dw, dl, dd; long plies; int games; } MatchRes;   // A as attackers: aw/al/ad, A as defenders: dw/dl/dd
static MatchRes match(int v, int G, int la, int lb, int rp, int quiet) {
  MatchRes M = { 0 };
  for (int g = 0; g < G; g++) {
    u64 seed = rng;
    int r1 = playGame(v, la, lb, rp); M.plies += plyCount;
    rng = seed; int r2 = playGame(v, lb, la, rp); M.plies += plyCount;
    if (r1 > 0) M.aw++; else if (r1 < 0) M.al++; else M.ad++;
    if (r2 < 0) M.dw++; else if (r2 > 0) M.dl++; else M.dd++;
    M.games += 2;
    rnd32();
    if (!quiet) {
      double sc = (M.aw + M.dw + 0.5 * (M.ad + M.dd)) / M.games;
      fprintf(stderr, "\r%d/%d  A-att +%d=%d-%d  A-def +%d=%d-%d  score %.3f  Elo %+.0f  avg %.0f plies   ", g + 1, G, M.aw, M.ad, M.al, M.dw, M.dd, M.dl, sc, eloOf(sc), (double)M.plies / M.games);
    }
  }
  if (!quiet) fprintf(stderr, "\n");
  return M;
}

// SPSA tuning of the evaluation weights: theta+ against theta- (both sides, same openings), nodesK per move
static int cmdTune(int v, int iters, int nk, int pairs, const char *out) {
  Pos p0; startPos(v, &p0);
  int th[NW]; for (int i = 0; i < NW; i++) th[i] = EWV[v][i];
  double T[NW]; for (int i = 0; i < NW; i++) T[i] = th[i];
  const int tune[NW] = { 0, 1, 1, 1, 1, v == 2 ? 0 : 1, 1, 1, v == 2 ? 0 : 1, 0, 1, 1, 1, 1, 1, 0, v == 2 ? 0 : 1, v == 2 ? 0 : 1 };
  TUNE_NK = nk;
  double tot = 0; int gamesTot = 0;
  for (int it = 1; it <= iters; it++) {
    int A[NW], B[NW], D[NW]; double c[NW];
    for (int i = 0; i < NW; i++) {
      c[i] = T[i] * 0.15; if (c[i] < 6) c[i] = 6;
      D[i] = tune[i] ? ((rnd32() & 1) ? 1 : -1) : 0;
      A[i] = (int)(T[i] + c[i] * D[i] + 0.5); B[i] = (int)(T[i] - c[i] * D[i] + 0.5);
      if (A[i] < 0) A[i] = 0; if (B[i] < 0) B[i] = 0;
    }
    int score = 0;
    for (int g = 0; g < pairs; g++) {
      u64 seed = rng; int rp = 2 + rnd32() % 4;
      PW[0] = A; PW[1] = B; int r1 = playGame(v, 0, 0, rp);      // A attackers
      rng = seed; PW[0] = B; PW[1] = A; int r2 = playGame(v, 0, 0, rp);   // A defenders
      score += r1 - r2;
      rnd32();
    }
    PW[0] = PW[1] = 0;
    gamesTot += 2 * pairs; tot += score;
    double lr = 0.25 / pairs * (it < 50 ? 1.5 : 1.0);
    for (int i = 0; i < NW; i++) if (tune[i]) { T[i] += lr * c[i] * score * D[i] / 2.0; if (T[i] < 1) T[i] = 1; }
    if (it % 10 == 0 || it == iters) {
      fprintf(stderr, "it %d  games %d  ", it, gamesTot);
      for (int i = 0; i < NW; i++) fprintf(stderr, "%s=%.0f ", EW_NAME[i], T[i]);
      fprintf(stderr, "\n");
      FILE *f = fopen(out, "w"); if (f) { fprintf(f, "{ "); for (int i = 0; i < NW; i++) fprintf(f, "%d%s", (int)(T[i] + 0.5), i < NW - 1 ? ", " : " }\n"); fclose(f); }
    }
  }
  return 0;
}
// load weights for variant v from a file "{ a, b, c, ... }"
static void loadW(int v, const char *fn) {
  FILE *f = fopen(fn, "r"); if (!f) return; int x, i = 0; char ch;
  while (i < NW && fscanf(f, " %c", &ch) == 1) { if (ch == '{' || ch == ',') { if (fscanf(f, "%d", &x) == 1) EWV[v][i++] = x; } }
  fclose(f); evalVar = -1; fprintf(stderr, "weights for %d from %s (%d values)\n", v, fn, i);
}

// ---------------------------------------------------------------- puzzle generation
// classify: the side to move wins within n own moves with exactly one first move (minimal n). returns n or 0; *ans = the move
static int classify(const Pos *p, int maxN, u64 budgetPer, Move *ans, int *nmoves) {
  Move L[MAXMV]; int n = gen(p, L);
  if (n < 2) return 0;
  *nmoves = n; pzWinner = p->side;
  int code = p->side ? 2 : 1;
  for (int k = 1; k <= maxN; k++) {
    int cnt = 0, idx = -1;
    for (int i = 0; i < n; i++) {
      Pos q = *p; doMove(&q, &L[i]);
      int r;
      if (q.res) r = q.res == code;
      else if (k == 1) r = 0;
      else { u64 bud = budgetPer; r = pzDef(&q, k - 1, &bud); }
      if (r < 0) return 0;
      if (r == 1) { cnt++; idx = i; if (cnt > 1) return 0; }
    }
    if (cnt == 1) { *ans = L[idx]; return k; }
  }
  return 0;
}
static void emitPz(FILE *o, const Pos *p, int n, const Move *m, int nmoves, const char *src) {
  int pieces = p->na + p->nd + 1;
  fprintf(o, "{\"v\":%d,\"b\":\"", VAR);
  for (int i = 0; i < N * N; i++) fputc(".adk"[p->b[SQ(i / N, i % N)]], o);
  fprintf(o, "\",\"side\":%d,\"n\":%d,\"answer\":%d,\"moves\":%d,\"pieces\":%d,\"na\":%d,\"nd\":%d,\"src\":\"%s\"}\n", p->side + 1, n, fromPad(m->f) + 256 * fromPad(m->t), nmoves, pieces, p->na, p->nd, src);
  fflush(o);
}
// a random sparse position: king somewhere, na attackers, nd defenders (no piece on restricted squares except the king)
static int randomPos(Pos *p, int v, int side, int na, int nd, int kingEdgeOk) {
  setVariant(v); evalInit(); posInit(p);
  int k;
  for (int tries = 0; ; tries++) { int r = rnd32() % N, c = rnd32() % N; k = SQ(r, c); if (FL[k] & F_ESC) continue; if (!kingEdgeOk && (FL[k] & F_EDGE)) continue; break; }
  p->b[k] = KNG;
  for (int i = 0; i < na + nd; i++) {
    for (int tries = 0; tries < 200; tries++) { int s = SQ(rnd32() % N, rnd32() % N); if (p->b[s] != EMP || (FL[s] & F_RESTR)) continue; p->b[s] = i < na ? ATT : DEF; break; }
  }
  p->side = (u8)side; posCount(p);
  // no captures pending against the side not to move from a previous move (keep it simple: accept), the game must not be over
  if (!anyMove(p)) return 0;
  Pos q = *p; q.side ^= 1; if (!anyMove(&q)) return 0;
  return 1;
}
// near-king random position for capture puzzles: some attackers next to the king
static int randomCapPos(Pos *p, int v, int na, int nd) {
  setVariant(v); evalInit(); posInit(p);
  int r = 1 + rnd32() % (N - 2), c = 1 + rnd32() % (N - 2), k = SQ(r, c);
  if (FL[k] & F_RESTR && k != THRONE) return 0;
  p->b[k] = KNG;
  int adj = 1 + rnd32() % 3;
  for (int i = 0; i < adj; i++) { int q = k + DIRS[rnd32() % 4]; if (p->b[q] == EMP && !(FL[q] & F_RESTR)) p->b[q] = ATT; }
  for (int i = 0; i < na + nd; i++) {
    for (int tries = 0; tries < 200; tries++) { int s = SQ(rnd32() % N, rnd32() % N); if (p->b[s] != EMP || (FL[s] & F_RESTR)) continue; p->b[s] = i < na ? ATT : DEF; break; }
  }
  p->side = 0; posCount(p);
  if (!anyMove(p)) return 0;
  Pos q = *p; q.side ^= 1; if (!anyMove(&q)) return 0;
  return 1;
}
static int cmdPzgen(int argc, char **argv) {
  // pzgen <variant> <mode esc|cap|file> <count> <maxN> <out> [file] [seed]
  int v = atoi(argv[2]); const char *mode = argv[3]; int want = atoi(argv[4]), maxN = atoi(argv[5]);
  FILE *o = fopen(argv[6], "a"); if (!o) return 1;
  if (argc > 8) rng ^= (u64)atoll(argv[8]) * 0x9E3779B97F4A7C15ull;
  int got = 0, tried = 0, hist[8] = { 0 };
  u64 bud = (u64)(getenv("BUD") ? atoi(getenv("BUD")) : 3000) * 1000;
  if (!strcmp(mode, "file")) {
    FILE *f = fopen(argv[7], "r"); char line[512];
    while (got < want && fgets(line, sizeof line, f)) {
      int vv; char cells[200]; int side, ply;
      if (sscanf(line, "%d %199s %d %d", &vv, cells, &side, &ply) != 4 || vv != v) continue;
      setVariant(v); evalInit(); Pos p; posInit(&p);
      for (int i = 0; i < N * N; i++) p.b[SQ(i / N, i % N)] = cells[i] == 'a' ? ATT : cells[i] == 'd' ? DEF : cells[i] == 'k' ? KNG : EMP;
      p.side = (u8)side; posCount(&p); tried++;
      if (rnd32() % 3) continue;   // sample a third of the positions
      Move m; int nm, n = classify(&p, maxN, bud, &m, &nm);
      if (n >= 1) { emitPz(o, &p, n, &m, nm, "game"); got++; hist[n]++; }
      if (tried % 200 == 0) fprintf(stderr, "\rtried %d got %d  [1:%d 2:%d 3:%d 4:%d]   ", tried, got, hist[1], hist[2], hist[3], hist[4]);
    }
    fclose(f);
  } else {
    int cap = !strcmp(mode, "cap");
    while (got < want) {
      Pos p; int ok;
      setVariant(v); int na = N == 7 ? 3 + rnd32() % 5 : N == 9 ? 5 + rnd32() % 9 : 6 + rnd32() % 12, nd = N == 7 ? rnd32() % 4 : 1 + rnd32() % (N == 9 ? 6 : 7);
      ok = cap ? randomCapPos(&p, v, na, nd) : randomPos(&p, v, 1, na, nd, 1);
      if (!ok) continue;
      tried++;
      if (!cap && kingLines(&p, p.king, 0)) continue;   // the king must not escape at once
      Move m; int nm, n = classify(&p, maxN, bud, &m, &nm);
      if (n >= (cap ? 1 : 2)) { emitPz(o, &p, n, &m, nm, "gen"); got++; hist[n]++; }
      if (tried % 100 == 0) fprintf(stderr, "\rtried %d got %d  [1:%d 2:%d 3:%d 4:%d]   ", tried, got, hist[1], hist[2], hist[3], hist[4]);
    }
  }
  fprintf(stderr, "\ndone: tried %d got %d\n", tried, got);
  fclose(o); return 0;
}
int main(int argc, char **argv) {
  if (argc < 3) { fprintf(stderr, "usage: see the header of tools/native.c\n"); return 1; }
  const char *cmd = argv[1]; int v = atoi(argv[2]);
  if (getenv("W")) loadW(v, getenv("W"));
  if (!strcmp(cmd, "pzgen")) return cmdPzgen(argc, argv);
  if (!strcmp(cmd, "tune")) return cmdTune(v, atoi(argv[3]), atoi(argv[4]), atoi(argv[5]), argv[6]);
  if (!strcmp(cmd, "wmatch")) {   // wmatch v games nodesK fileA fileB : weights A vs weights B
    int G = atoi(argv[3]); TUNE_NK = atoi(argv[4]);
    static int A[NW], B[NW]; loadW(v, argv[5]); memcpy(A, EWV[v], sizeof(A)); loadW(v, argv[6]); memcpy(B, EWV[v], sizeof(B));
    int sc = 0, aw = 0, dw = 0, n = 0;
    for (int g = 0; g < G; g++) {
      u64 seed = rng; int rp = 2 + rnd32() % 4;
      PW[0] = A; PW[1] = B; int r1 = playGame(v, 0, 0, rp);
      rng = seed; PW[0] = B; PW[1] = A; int r2 = playGame(v, 0, 0, rp);
      sc += r1 - r2; aw += (r1 > 0) + (r2 > 0); dw += (r1 < 0) + (r2 < 0); n += 2; rnd32();
      double s2 = 0.5 + sc / (2.0 * n);
      fprintf(stderr, "\r%d/%d  A score %.3f (Elo %+.0f)  attackers won %d defenders %d   ", g + 1, G, s2, eloOf(s2), aw, dw);
    }
    fprintf(stderr, "\n"); return 0;
  }
  if (!strcmp(cmd, "perft")) {
    Pos p; startPos(v, &p); printPos(&p);
    for (int d = 1; d <= atoi(argv[3]); d++) { double t0 = now(); u64 n = perft(&p, d); printf("perft %d = %llu  (%.0f ms)\n", d, (unsigned long long)n, now() - t0); }
    return 0;
  }
  if (!strcmp(cmd, "bench")) {
    Pos p; startPos(v, &p); GSTART = p; GN = 0; setupHist();
    double t0 = now(); best(99, 0, atoi(argv[3]));
    double dt = now() - t0; printf("move %d value %d depth %d nodes %dk  %.0f ms  %.0f kn/s\n", IO[0], IO[2], IO[3], IO[4], dt, IO[4] / dt * 1000);
    return 0;
  }
  if (!strcmp(cmd, "match")) {
    int G = atoi(argv[3]), la = atoi(argv[4]), lb = atoi(argv[5]), rp = argc > 6 ? atoi(argv[6]) : 2;
    if (argc > 7) rng ^= (u64)atoll(argv[7]) * 0x9E3779B97F4A7C15ull;
    MatchRes M = match(v, G, la, lb, rp, 0);
    double sc = (M.aw + M.dw + 0.5 * (M.ad + M.dd)) / M.games;
    printf("L%d vs L%d: A-att +%d =%d -%d, A-def +%d =%d -%d, score %.3f (Elo %+.0f), attackers won %d of %d\n", la, lb, M.aw, M.ad, M.al, M.dw, M.dd, M.dl, sc, eloOf(sc), M.aw + M.dl, M.games);
    return 0;
  }
  if (!strcmp(cmd, "ladder")) {
    int G = atoi(argv[3]), a = atoi(argv[4]), b = atoi(argv[5]), rp = argc > 6 ? atoi(argv[6]) : 2;
    if (argc > 7) rng ^= (u64)atoll(argv[7]) * 0x9E3779B97F4A7C15ull;
    for (int l = a; l < b; l++) {
      MatchRes M = match(v, G, l, l + 1, rp, 1);
      double sc = (M.aw + M.dw + 0.5 * (M.ad + M.dd)) / M.games;
      printf("L%d vs L%d: weak-att +%d =%d -%d, weak-def +%d =%d -%d, weak score %.3f (Elo %+.0f), attackers won %d/%d, avg %.0f plies\n", l, l + 1, M.aw, M.ad, M.al, M.dw, M.dd, M.dl, sc, eloOf(sc), M.aw + M.dl, M.games, (double)M.plies / M.games);
      fflush(stdout);
    }
    return 0;
  }
  if (!strcmp(cmd, "selfplay")) {
    int G = atoi(argv[3]), lv = atoi(argv[4]); POSOUT = fopen(argv[5], "a");
    if (argc > 6) rng ^= (u64)atoll(argv[6]) * 0x9E3779B97F4A7C15ull;
    int aw = 0, dw = 0, dr = 0;
    for (int g = 0; g < G; g++) { int r = playGame(v, lv, lv, 2 + rnd32() % 4); if (r > 0) aw++; else if (r < 0) dw++; else dr++; fprintf(stderr, "\rgame %d  att %d def %d draw %d   ", g + 1, aw, dw, dr); }
    fprintf(stderr, "\n"); fclose(POSOUT);
    return 0;
  }
  fprintf(stderr, "unknown command\n"); return 1;
}
