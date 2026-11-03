/* datagen: self-play games of a UCI xiangqi engine (Pikafish) that record every position with the engine's
   score and win / draw / loss chances, for training the site engine's NNUE (train.c).
   The games start from the initial position plus a few random legal moves (our own move generator,
   ../../engine.c); the teacher then plays both sides at a fixed node count.

   build: cc -O2 -DNATIVE -o datagen datagen.c -lm
   usage: datagen <engine path> <out.bin> [--games N] [--nodes 8000] [--workers N] [--seed S] [--evalfile pikafish.nnue]
   Each worker writes out.bin.wK; they are joined into out.bin at the end. Re-running appends a new batch. */
#include "../../engine.c"
#include "xq.h"
#include <math.h>
#include <signal.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>
#include <fcntl.h>

static const char *START_FEN = "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w";
static u64 rng = 0x2545F4914F6CDD1Dull;
static u32 rnd32(void) { rng ^= rng << 13; rng ^= rng >> 7; rng ^= rng << 17; return (u32)rng; }

static int loadFen(const char *fen) {
  memset(B, 0, 90); int r = 0, c = 0; const char *p = fen; const char *s = "kabnrcp";
  for (; *p && *p != ' '; p++) {
    if (*p == '/') { r++; c = 0; continue; }
    if (*p >= '1' && *p <= '9') { c += *p - '0'; continue; }
    int col = *p >= 'a' && *p <= 'z', t = 0; char lc = col ? *p : *p + 32;
    for (int i = 0; i < 7; i++) if (s[i] == lc) t = i + 1;
    if (r > 9 || c > 8 || !t) return 0;
    B[r * 9 + c] = (u8)(t | (col << 3)); c++;
  }
  while (*p == ' ') p++;
  side = *p == 'b'; findKings(); KEY = hashBoard();
  return 1;
}
static void fenOf(char *o) {
  int k = 0;
  for (int r = 0; r < 10; r++) {
    int e = 0;
    for (int c = 0; c < 9; c++) {
      u8 p = B[r * 9 + c]; if (!p) { e++; continue; }
      if (e) { o[k++] = '0' + e; e = 0; }
      char ch = "?kabnrcp"[TYPE(p)]; o[k++] = COLOR(p) ? ch : ch - 32;
    }
    if (e) o[k++] = '0' + e;
    if (r < 9) o[k++] = '/';
  }
  k += sprintf(o + k, " %c - - 0 1", side ? 'b' : 'w');
}
static void mvName(char *o, Move m) { int f = MF(m), t = MT(m); sprintf(o, "%c%d%c%d", 'a' + f % 9, 9 - f / 9, 'a' + t % 9, 9 - t / 9); }
static int mvParse(const char *s, Move *m) {
  if (strlen(s) < 4) return 0;
  int fc = s[0] - 'a', fr = 9 - (s[1] - '0'), tc = s[2] - 'a', tr = 9 - (s[3] - '0');
  if (fc < 0 || fc > 8 || tc < 0 || tc > 8 || fr < 0 || fr > 9 || tr < 0 || tr > 9) return 0;
  *m = MV(fr * 9 + fc, tr * 9 + tc); return 1;
}

/* ---- the teacher process */
static FILE *toE, *fromE; static pid_t epid;
static void eStart(const char *path, const char *evalfile) {
  int a[2], b[2]; if (pipe(a) || pipe(b)) { perror("pipe"); exit(1); }
  epid = fork();
  if (epid == 0) { dup2(a[0], 0); dup2(b[1], 1); close(a[1]); close(b[0]); int nul = open("/dev/null", O_WRONLY); if (nul >= 0) dup2(nul, 2); execl(path, path, (char *)0); perror("exec"); _exit(1); }
  close(a[0]); close(b[1]);
  toE = fdopen(a[1], "w"); fromE = fdopen(b[0], "r");
  char line[4096];
  fprintf(toE, "uci\n"); fflush(toE);
  while (fgets(line, sizeof line, fromE)) if (!strncmp(line, "uciok", 5)) break;
  fprintf(toE, "setoption name Threads value 1\nsetoption name Hash value 16\nsetoption name UCI_ShowWDL value true\n");
  if (evalfile) fprintf(toE, "setoption name EvalFile value %s\n", evalfile);
  fprintf(toE, "isready\n"); fflush(toE);
  while (fgets(line, sizeof line, fromE)) if (!strncmp(line, "readyok", 7)) break;
}
/* search the current position; returns 0 if the engine gave no move */
static int eGo(int nodes, Move *bm, int *cp, int *w, int *l) {
  char fen[128], line[8192]; fenOf(fen);
  fprintf(toE, "position fen %s\ngo nodes %d\n", fen, nodes); fflush(toE);
  *cp = 0; *w = 0; *l = 0;
  while (fgets(line, sizeof line, fromE)) {
    if (!strncmp(line, "info", 4)) {
      char *p = strstr(line, " score ");
      if (p && !strstr(line, "lowerbound") && !strstr(line, "upperbound")) {
        int v;
        if (sscanf(p, " score cp %d", &v) == 1) *cp = v;
        else if (sscanf(p, " score mate %d", &v) == 1) *cp = v > 0 ? 30000 - v : -30000 - v;
        char *q = strstr(line, " wdl "); int ww, dd, ll;
        if (q && sscanf(q, " wdl %d %d %d", &ww, &dd, &ll) == 3) { *w = ww; *l = ll; }
      }
      continue;
    }
    if (!strncmp(line, "bestmove", 8)) {
      char ms[16] = { 0 }; if (sscanf(line, "bestmove %15s", ms) != 1) return 0;
      return mvParse(ms, bm);
    }
  }
  fprintf(stderr, "teacher engine stopped\n"); exit(1);
}

/* ---- one game; returns the number of records written */
#define MAXG 600
static Rec G[MAXG];
static int playGame(FILE *out, int nodes) {
  loadFen(START_FEN);
  u64 hist[MAXG + 64]; int hn2 = 0, sinceCap = 0;
  /* random opening: 2..9 plies */
  int pre = 2 + rnd32() % 8;
  for (int i = 0; i < pre; i++) {
    Move L[MAXMV]; int n = genLegal(L); if (!n) return 0;
    makeMove(L[rnd32() % n]); hist[hn2++] = KEY;
  }
  int ng = 0, result = 2, red = 0, adj = 0;   /* result (Red's view): 1 / 0 / -1, 2 = unknown */
  for (int ply = 0; ply < MAXG; ply++) {
    Move L[MAXMV]; int n = genLegal(L);
    if (!n) { result = side ? 1 : -1; break; }                   /* no legal move: the side to move loses */
    if (sinceCap >= 120) { result = 0; break; }
    int reps = 0; for (int i = 0; i < hn2 - 1; i++) if (hist[i] == KEY) reps++;
    if (reps >= 2) { result = 0; break; }
    Move bm; int cp, w, l;
    if (!eGo(nodes, &bm, &cp, &w, &l)) break;
    int ok = 0; for (int i = 0; i < n; i++) if (L[i] == bm) ok = 1;
    if (!ok) break;
    if (ply == 0 && (cp > 250 || cp < -250)) return 0;          /* the random opening went too far */
    Rec *r = &G[ng++]; memset(r, 0, sizeof *r);
    for (int s = 0; s < 90; s++) r->b[s >> 1] |= (u8)(B[s] << ((s & 1) * 4));
    r->stm = (u8)side; r->cp = (i16)(cp > 30000 ? 30000 : cp < -30000 ? -30000 : cp); r->w = (i16)w; r->l = (i16)l; r->move = bm;
    if (attackedKing(side)) r->flags |= REC_CHECK;
    if (B[MT(bm)]) r->flags |= REC_CAPTURE;
    /* adjudication: the teacher sees a win for one side (>= 98%) for 8 plies in a row */
    int redW = side ? l : w, redL = side ? w : l;
    int now = redW >= 980 ? 1 : redL >= 980 ? -1 : 0;
    if (now && now == red) { if (++adj >= 8) { result = now; break; } } else { red = now; adj = now ? 1 : 0; }
    u8 cap = makeMove(bm); hist[hn2++] = KEY;
    sinceCap = cap ? 0 : sinceCap + 1;
  }
  if (result == 2) result = 0;
  for (int i = 0; i < ng; i++) G[i].result = (i8)(G[i].stm ? -result : result);
  fwrite(G, sizeof(Rec), ng, out);
  return ng;
}

int main(int argc, char **argv) {
  if (argc < 3) { fprintf(stderr, "usage: datagen <engine> <out.bin> [--games N] [--nodes 8000] [--workers N] [--seed S] [--evalfile F]\n"); return 1; }
  const char *eng = argv[1], *outp = argv[2], *evalfile = NULL;
  long games = 1000; int nodes = 8000, workers = (int)sysconf(_SC_NPROCESSORS_ONLN); u64 seed = (u64)time(NULL);
  for (int a = 3; a + 1 < argc; a++) {
    if (!strcmp(argv[a], "--games")) games = atol(argv[++a]);
    else if (!strcmp(argv[a], "--nodes")) nodes = atoi(argv[++a]);
    else if (!strcmp(argv[a], "--workers")) workers = atoi(argv[++a]);
    else if (!strcmp(argv[a], "--seed")) seed = (u64)atoll(argv[++a]);
    else if (!strcmp(argv[a], "--evalfile")) evalfile = argv[++a];
  }
  if (workers < 1) workers = 1;
  initGeo(); initEval();
  fprintf(stderr, "datagen: %ld games, %d nodes per move, %d workers\n", games, nodes, workers);
  double t0 = now();
  for (int k = 0; k < workers; k++) {
    if (fork() == 0) {
      rng ^= (seed + 0x9E3779B97F4A7C15ull * (k + 1)); for (int i = 0; i < 20; i++) rnd32();
      char pn[1024]; snprintf(pn, sizeof pn, "%s.w%d", outp, k);
      FILE *o = fopen(pn, "wb"); if (!o) { perror(pn); _exit(1); }
      eStart(eng, evalfile);
      long mine = games / workers + (k < games % workers), recs = 0;
      for (long g = 0; g < mine; g++) {
        recs += playGame(o, nodes);
        if (k == 0 && (g % 10 == 9 || g == mine - 1)) {
          double el = (now() - t0) / 1000;
          fprintf(stderr, "\r  worker 0: %ld / %ld games, %ld positions (all workers ~%.0f pos/s)   ", g + 1, mine, recs, recs * workers / (el > 0 ? el : 1));
        }
      }
      fclose(o); fprintf(toE, "quit\n"); fflush(toE); waitpid(epid, NULL, 0);
      _exit(0);
    }
  }
  for (int k = 0; k < workers; k++) wait(NULL);
  FILE *out = fopen(outp, "ab"); if (!out) { perror(outp); return 1; }
  long tot = 0; static Rec buf[4096];
  for (int k = 0; k < workers; k++) {
    char pn[1024]; snprintf(pn, sizeof pn, "%s.w%d", outp, k);
    FILE *f = fopen(pn, "rb"); if (!f) continue;
    size_t n; while ((n = fread(buf, sizeof(Rec), 4096, f)) > 0) { fwrite(buf, sizeof(Rec), n, out); tot += (long)n; }
    fclose(f); remove(pn);
  }
  fclose(out);
  fprintf(stderr, "\ndone: %ld positions added to %s (%.0f s)\n", tot, outp, (now() - t0) / 1000);
  return 0;
}
