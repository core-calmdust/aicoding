/* usimatch: the site's shogi AI (engine.c + an NNUE file, native build) against a USI engine (e.g. Gikou with DepthLimit).
   build: cc -O3 -DNATIVE -o usimatch usimatch.c            (add -DNUE_H=512 for a 512-wide net)
   usage: usimatch <nnue.bin> <our nodes | Nms> <usi engine path> <engine dir> <games> [--opt "Name=Value"]... [--byoyomi ms] [--openings file]
            [--threads N] [--fischer baseMs,incMs]
   --threads N (a build with -DMT -lpthread): our side searches on N threads, the multi-thread search of the site (engine_mt.wasm:
     Young Brothers Wait on the first 10 threads, Lazy SMP past them), the helpers asleep while the other engine thinks.
   --fischer 300000,10000: both sides play on a clock (base + increment per move, e.g. Floodgate's 5 min + 10 s): the USI engine
     gets "go btime wtime binc winc" and manages its own time, ours thinks up to increment + remaining / 25 per move (the
     search uses about 80% of that); running out of time loses. Then <our nodes | Nms> is ignored.
   usimatch <nnue.bin> bench <ms> <threads> <openings file>: 8 positions searched for <ms> each: the depth reached and the
     lead's speed (to see what the threads give on this machine: compare with threads = 1).
   The engine runs with its folder as the working directory (Gikou reads params.bin etc. from there).
   Games come in pairs: the same opening (a line of openings.txt, from book.json) with colours swapped; games end by mate, resignation, 4-fold repetition (draw) or 320 plies (draw). */
#include "../../engine.c"
#include <stdio.h>
#include <stdlib.h>
#include <signal.h>
#include <unistd.h>
#include <fcntl.h>
#include <sys/wait.h>

static void sqName(int s, char *o) { o[0] = (char)('1' + (8 - s % 9)); o[1] = (char)('a' + s / 9); }
static void toUsi(int m, char *o) {
  int f = m & 127, t = (m >> 7) & 127;
  if (f > 80) { o[0] = "PLNSBRG"[f - 81]; o[1] = '*'; sqName(t, o + 2); o[4] = 0; return; }
  sqName(f, o); sqName(t, o + 2); o[4] = (m >> 14) & 1 ? '+' : 0; o[5] = 0;
}
static i32 LBUF[700];
static int fromUsi(const char *u) {
  int n = legalMoves(LBUF, 1); char b[8];
  for (int i = 0; i < n; i++) { toUsi(LBUF[i], b); if (!strcmp(b, u)) return LBUF[i]; }
  return 0;
}
static const i8 START[81] = {
  2 + WF, 3 + WF, 4 + WF, 7 + WF, 8 + WF, 7 + WF, 4 + WF, 3 + WF, 2 + WF,
  0, 6 + WF, 0, 0, 0, 0, 0, 5 + WF, 0,
  1 + WF, 1 + WF, 1 + WF, 1 + WF, 1 + WF, 1 + WF, 1 + WF, 1 + WF, 1 + WF,
  0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0,
  1, 1, 1, 1, 1, 1, 1, 1, 1,
  0, 5, 0, 0, 0, 0, 0, 6, 0,
  2, 3, 4, 7, 8, 7, 4, 3, 2 };
static int hist[400], nh;
static void setStart(void) { for (int s = 0; s < 81; s++) setupBuf[s] = START[s]; for (int i = 0; i < 16; i++) setupBuf[81 + i] = 0; setupBuf[97] = 0; set_position(); }
static void replay(void) { setStart(); for (int i = 0; i < nh; i++) play_move(hist[i]); }

static int loadNet(const char *path) {
  FILE *f = fopen(path, "rb"); if (!f) { perror(path); return 0; }
  int hd[3]; if (fread(hd, 4, 3, f) != 3 || hd[0] != 0x5145554E || hd[1] != NUE_H || hd[2] != NUE_IN) { fprintf(stderr, "%s: not a %d-wide net (rebuild with -DNUE_H=%d)\n", path, NUE_H, hd[1]); return 0; }
  if (fread(nueW1, 2, NUE_IN * NUE_H, f) != (size_t)(NUE_IN * NUE_H) || fread(nueB1, 4, NUE_H, f) != NUE_H || fread(nueW2, 2, 2 * NUE_H, f) != 2 * NUE_H || fread(nueB2, 4, 1, f) != 1) { fprintf(stderr, "short net\n"); return 0; }
  fclose(f); return 1;
}

static FILE *toE, *fromE; static pid_t epid;
static int nThreads = 1;
#ifdef MT
#include <pthread.h>
static volatile int hGen, hDone;
static void *helperMain(void *arg) {
  mt_thread_native((int)(long)arg);
  for (int seen = 0; ; ) {
    while (__atomic_load_n(&hGen, __ATOMIC_ACQUIRE) == seen) usleep(300);   /* asleep between our moves */
    seen = __atomic_load_n(&hGen, __ATOMIC_ACQUIRE);
    for (int f = 1; !__atomic_load_n(&gStop, __ATOMIC_ACQUIRE); f = 0) mt_idle(250, f);   /* (as mt-helper.js) */
    __atomic_add_fetch(&hDone, 1, __ATOMIC_SEQ_CST);
  }
  return NULL;
}
static void startHelpers(void) {
  pthread_attr_t at; pthread_attr_init(&at); pthread_attr_setstacksize(&at, 64u << 20);
  for (int i = 1; i < nThreads; i++) { pthread_t t; if (pthread_create(&t, &at, helperMain, (void *)(long)i)) { perror("pthread_create"); exit(2); } }
}
#endif
/* our move: one thread, or the lead with the helpers taking part until it is done */
static int ourSearch(double ms, int nodeLim) {
#ifdef MT
  if (nThreads > 1) {
    __atomic_store_n(&hDone, 0, __ATOMIC_SEQ_CST); mt_stop(0); __atomic_add_fetch(&hGen, 1, __ATOMIC_SEQ_CST);
    int m = root_search(ms, 0, nodeLim);
    mt_stop(1); while (__atomic_load_n(&hDone, __ATOMIC_ACQUIRE) < nThreads - 1) usleep(100);
    mt_stop(0);
    return m;
  }
#endif
  return root_search(ms, 0, nodeLim);
}
static int readUntil(const char *prefix, char *line, int sz) {
  while (fgets(line, sz, fromE)) if (!strncmp(line, prefix, strlen(prefix))) return 1;
  return 0;
}
static void eStart(const char *path, const char *dir, char **opts, int nopt) {
  int a[2], b[2]; if (pipe(a) || pipe(b)) { perror("pipe"); exit(1); }
  epid = fork();
  if (epid == 0) {
    dup2(a[0], 0); dup2(b[1], 1); close(a[1]); close(b[0]);
    int nul = open("/dev/null", O_WRONLY); if (nul >= 0) dup2(nul, 2);
    if (dir && chdir(dir)) _exit(1);
    execl(path, path, (char *)0); _exit(1);
  }
  close(a[0]); close(b[1]); toE = fdopen(a[1], "w"); fromE = fdopen(b[0], "r");
  char line[4096];
  fprintf(toE, "usi\n"); fflush(toE);
  if (!readUntil("usiok", line, sizeof line)) { fprintf(stderr, "the USI engine did not start: %s\n", path); exit(2); }
  for (int i = 0; i < nopt; i++) { char nm[256], val[256]; if (sscanf(opts[i], "%255[^=]=%255s", nm, val) == 2) fprintf(toE, "setoption name %s value %s\n", nm, val); }
  fprintf(toE, "isready\n"); fflush(toE);
  if (!readUntil("readyok", line, sizeof line)) { fprintf(stderr, "the USI engine stopped while loading\n"); exit(2); }
}
static int fBase, fInc; static double clk[2];   /* --fischer: the clocks by colour (0 = sente), ms */
static int eMove(int byoyomi, char *out) {   /* 1 move, 0 resign, 2 declares a win */
  char line[8192];
  fprintf(toE, "position startpos moves");
  for (int i = 0; i < nh; i++) { char b[8]; toUsi(hist[i], b); fprintf(toE, " %s", b); }
  if (fBase) fprintf(toE, "\ngo btime %d wtime %d binc %d winc %d\n", (int)clk[0], (int)clk[1], fInc, fInc);
  else fprintf(toE, "\ngo btime 0 wtime 0 byoyomi %d\n", byoyomi);
  fflush(toE);
  if (!readUntil("bestmove", line, sizeof line)) { fprintf(stderr, "the USI engine stopped\n"); exit(2); }
  if (sscanf(line, "bestmove %15s", out) != 1) return 0;
  if (!strcmp(out, "resign")) return 0;
  if (!strcmp(out, "win")) return 2;
  return 1;
}

int main(int argc, char **argv) {
  if (argc < 6) { fprintf(stderr, "usage: usimatch <nnue.bin> <our nodes> <usi engine> <engine dir> <games> [--opt Name=Value]... [--byoyomi ms] [--seed S]\n"); return 1; }
  signal(SIGPIPE, SIG_IGN);
  init();
  if (!loadNet(argv[1])) return 1;
  nue_enable(1);
  if (!strcmp(argv[2], "bench")) {
    double ms = atof(argv[3]); nThreads = atoi(argv[4]); if (nThreads < 1) nThreads = 1;
#ifdef MT
    if (nThreads > MT_SLOTS) nThreads = MT_SLOTS; if (nThreads > 1) startHelpers();
#else
    nThreads = 1;
#endif
    FILE *f = fopen(argv[5], "r"); if (!f) { perror(argv[5]); return 1; }
    char line[2048]; int dsum = 0, n = 0; double tot = 0;
    for (int k = 0; k < 8 && fgets(line, sizeof line, f); k++) {
      nh = 0; setStart(); char *p = line, tok[16]; int q;
      while (sscanf(p, " %15s%n", tok, &q) == 1) { p += q; int m = fromUsi(tok); if (!m) break; hist[nh++] = m; play_move(m); }
      tt_clear(); reset_search();
      for (int i = 0; i < 24; i++) { replay(); int m = root_search(0, 0, 3000); if (!m) break; hist[nh++] = m; }   /* into the middle game */
      replay(); tt_clear(); reset_search();
      ourSearch(ms, 0); dsum += res[1]; tot += (u32)res[2]; n++;
    }
    printf("%d thread%s, %.1f s per position: average depth %.2f, the lead's speed %.0f thousand nodes/s\n", nThreads, nThreads > 1 ? "s" : "", ms / 1000, n ? (double)dsum / n : 0, n ? tot / (ms * n) : 0);
    return 0;
  }
  int ourNodes = atoi(argv[2]), ourMs = strstr(argv[2], "ms") ? ourNodes : 0, games = atoi(argv[5]), byo = 10000; char *opts[32]; int nopt = 0; const char *opf = NULL;
  for (int a = 6; a + 1 < argc; a++) {
    if (!strcmp(argv[a], "--opt") && nopt < 32) opts[nopt++] = argv[++a];
    else if (!strcmp(argv[a], "--byoyomi")) byo = atoi(argv[++a]);
    else if (!strcmp(argv[a], "--openings")) opf = argv[++a];
    else if (!strcmp(argv[a], "--threads")) nThreads = atoi(argv[++a]);
    else if (!strcmp(argv[a], "--fischer")) { if (sscanf(argv[++a], "%d,%d", &fBase, &fInc) != 2 || fBase <= 0) { fprintf(stderr, "--fischer baseMs,incMs\n"); return 1; } }
  }
  static char ops[400][256]; int nops = 0;
  if (opf) { FILE *f = fopen(opf, "r"); if (f) { while (nops < 400 && fgets(ops[nops], sizeof ops[0], f)) if (strlen(ops[nops]) > 3) nops++; fclose(f); } }
#ifdef MT
  if (nThreads > MT_SLOTS) nThreads = MT_SLOTS; if (nThreads > 1) startHelpers();
#else
  if (nThreads > 1) { fprintf(stderr, "--threads needs a build with -DMT -lpthread\n"); return 1; }
#endif
  eStart(argv[3], argv[4], opts, nopt);
  int w = 0, l = 0, d = 0;
  for (int g = 0; g < games; g++) {
    int weBlack = (g & 1) == 0, result = 0;   /* result from our side: 1 / 0 / -1 */
    nh = 0; tt_clear(); reset_search();
    if (nops) {   /* the opening moves of this pair */
      setStart(); char *p = ops[(g / 2) % nops], tok[16]; int k;
      while (sscanf(p, " %15s%n", tok, &k) == 1) { p += k; int m = fromUsi(tok); if (!m) { fprintf(stderr, "opening move %s not legal\n", tok); exit(3); } hist[nh++] = m; play_move(m); }
    }
    fprintf(toE, "usinewgame\n"); fflush(toE);
    clk[0] = clk[1] = fBase; int flag = 0; double usedO = 0, usedE = 0; int nO = 0, nE = 0;
    i32 keysL[400], keysH[400]; int nh0 = nh;
    for (int ply = nh; ; ply++) {
      replay();
      if (ply >= 320) { result = 0; break; }
      int reps = 0; for (int i = nh0; i < ply; i++) if (keysL[i] == hl && keysH[i] == hh) reps++;
      keysL[ply] = hl; keysH[ply] = hh;
      if (reps >= 3) { result = 0; break; }
      int n = legalMoves(LBUF, 1), ours = (side == 0) == weBlack;
      if (!n) { result = ours ? -1 : 1; break; }
      int m;
      if (ours) {
        if (fBase) {
          double cap = fInc + clk[side] / 25; if (cap > clk[side] - 300) cap = clk[side] - 300; if (cap < 50) cap = 50;
          double t0 = js_now(); m = ourSearch(cap, 0); double el = js_now() - t0;
          clk[side] -= el; usedO += el; nO++; if (clk[side] < 0) { flag = 1; result = -1; break; }
          clk[side] += fInc;
        } else m = ourMs ? ourSearch(ourMs, 0) : ourSearch(0, ourNodes);
        if (!m) { result = -1; break; }
      } else {
        const int sd = side; double t0 = js_now();
        char mv[16]; int r = eMove(byo, mv);
        if (fBase) { double el = js_now() - t0; clk[sd] -= el; usedE += el; nE++; if (clk[sd] < -500) { flag = 2; result = 1; break; } clk[sd] += fInc; }   /* (500 ms of grace: the pipe) */
        if (r == 0) { result = 1; break; }
        if (r == 2) { result = -1; break; }   /* (entering-king win declared by the engine) */
        replay(); m = fromUsi(mv);
        if (!m) { fprintf(stderr, "illegal move from the engine: %s\n", mv); result = 1; break; }
      }
      hist[nh++] = m;
    }
    if (result > 0) w++; else if (result < 0) l++; else d++;
    if (fBase) printf("  %d plies, per move: ours %.1f s, engine %.1f s%s\n", nh, nO ? usedO / nO / 1000 : 0, nE ? usedE / nE / 1000 : 0, flag == 1 ? " (we lost on time)" : flag == 2 ? " (the engine lost on time)" : "");
    printf("game %d (%s): %s   total +%d -%d =%d  score %.3f\n", g + 1, weBlack ? "we sente" : "we gote", result > 0 ? "win" : result < 0 ? "loss" : "draw", w, l, d, (w + d * .5) / (g + 1));
    fflush(stdout);
  }
  fprintf(toE, "quit\n"); fflush(toE); waitpid(epid, NULL, 0);
  return 0;
}
