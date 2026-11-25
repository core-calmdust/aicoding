/* usimatch: the site's shogi AI (engine.c + an NNUE file, native build) against a USI engine (e.g. Gikou with DepthLimit).
   build: cc -O3 -DNATIVE -o usimatch usimatch.c            (add -DNUE_H=512 for a 512-wide net)
   usage: usimatch <nnue.bin> <our nodes | Nms> <usi engine path> <engine dir> <games> [--opt "Name=Value"]... [--byoyomi ms] [--openings file] [--param k=v]...
     --param k=v: a search parameter of our side (engine.c set_param); the other side, if it is kptool: --opt "Param<k>=v"
            [--threads N] [--fischer baseMs,incMs]
           [--us <usi engine> <dir> [--usopt Name=Value]... [--usbyoyomi ms]]   (our side played by another USI engine, e.g.
           YaneuraOu's search with our evaluation against Gikou: tools/match/yo-gikou.sh)
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

#ifdef NUE_KB
/* a build for a net of gtrain / trainkp (NUEK / NUEO / NUEM / NUES; the flags come from the net: tools/nnue/build-kp.sh,
   run-gikou.sh), and the site's NUEQ with NUE_KB=1 */
static int loadKP(const char *path) {
  FILE *f = fopen(path, "rb"); if (!f) { perror(path); return 0; }
  int hd[4], nb = 1, mlp = 0; if (fread(hd, 4, 3, f) != 3) return 0;
  if (hd[0] == 0x5145554E) {   /* NUEQ: the current format = one bucket */
    if (NUE_KB != 1 || hd[1] != NUE_H || hd[2] != 2534) { fprintf(stderr, "%s: a NUEQ net needs a build with NUE_KB=1 NUE_H=%d\n", path, hd[1]); return 0; }
    memset(nueKMap, 0, sizeof nueKMap);
  } else {
    if ((hd[0] != 0x4B45554E && hd[0] != 0x4F45554E && hd[0] != 0x4D45554E && hd[0] != 0x5345554E) || fread(hd + 3, 4, 1, f) != 1) { fprintf(stderr, "%s: not a NUEK / NUEO / NUEM / NUEQ net\n", path); return 0; }
    if (hd[0] == 0x4D45554E || hd[0] == 0x5345554E) {   /* NUES: the same with output buckets and an MLP per bucket (-DNUE_MB=8). NUEM: an MLP beside the linear output (a build with -DNUE_L1 -DNUE_L2) */
      int m[3]; if (fread(m, 4, 3, f) != 3) return 0;
#ifdef NUE_L1
      if (m[0] != NUE_L1 || m[1] != NUE_L2 || m[2] != NUE_MI) { fprintf(stderr, "%s: MLP %d-%d on %d units: rebuild with -DNUE_L1=%d -DNUE_L2=%d -DNUE_MI=%d\n", path, m[0], m[1], m[2], m[0], m[1], m[2]); return 0; }
      mlp = 1;
      if (hd[0] == 0x5345554E) { if (fread(&nb, 4, 1, f) != 1 || nb != NUE_NB || NUE_MB != NUE_NB) { fprintf(stderr, "%s: %d buckets with an MLP each: rebuild with -DNUE_MB=%d\n", path, nb, NUE_NB); return 0; } mlp = NUE_NB; }
      else if (NUE_MB != 1) { fprintf(stderr, "%s: one MLP: rebuild without -DNUE_MB\n", path); return 0; }
#else
      fprintf(stderr, "%s: an MLP net needs a build with -DNUE_L1=%d -DNUE_L2=%d\n", path, m[0], m[1]); return 0;
#endif
    }
    if (hd[0] == 0x4F45554E && (fread(&nb, 4, 1, f) != 1 || nb != NUE_NB)) { fprintf(stderr, "%s: %d output buckets (the engine has %d)\n", path, nb, NUE_NB); return 0; }   /* NUEO: output buckets */
    if (hd[1] != NUE_H || hd[3] != NUE_KB || hd[2] != NUE_KB * 2534) { fprintf(stderr, "%s: H %d, %d buckets: rebuild with -DNUE_H=%d -DNUE_KB=%d\n", path, hd[1], hd[3], hd[1], hd[3]); return 0; }
    if (fread(nueKMap, 1, 84, f) != 84) return 0;
  }
  if (fread(nueW1, 2, (size_t)NUE_IN * NUE_H, f) != (size_t)NUE_IN * NUE_H || fread(nueB1, 4, NUE_H, f) != NUE_H || fread(nueW2, 2, (size_t)nb * 2 * NUE_H, f) != (size_t)nb * 2 * NUE_H || fread(nueB2, 4, nb, f) != (size_t)nb) { fprintf(stderr, "short net\n"); return 0; }
#ifdef NUE_L1
  if (mlp) {
    static i8 a8[NUE_L1 * 2 * NUE_MI], b8[NUE_L2 * NUE_L1];
    for (int k = 0; k < mlp; k++) {
      if (NUE_MB > 1) {   /* NUES: int16 weights */
        if (fread(nueMA + k * NUE_L1 * 2 * NUE_MI, 2, NUE_L1 * 2 * NUE_MI, f) != NUE_L1 * 2 * NUE_MI || fread(nueMa + k * NUE_L1, 4, NUE_L1, f) != NUE_L1 || fread(nueMB + k * NUE_L2 * NUE_L1, 2, NUE_L2 * NUE_L1, f) != NUE_L2 * NUE_L1 || fread(nueMd + k * NUE_L2, 4, NUE_L2, f) != NUE_L2 || fread(nueMC + k * NUE_L2, 2, NUE_L2, f) != NUE_L2) { fprintf(stderr, "short net\n"); return 0; }
        continue;
      }
      if (fread(a8, 1, sizeof a8, f) != sizeof a8 || fread(nueMa + k * NUE_L1, 4, NUE_L1, f) != NUE_L1 || fread(b8, 1, sizeof b8, f) != sizeof b8 || fread(nueMd + k * NUE_L2, 4, NUE_L2, f) != NUE_L2 || fread(nueMC + k * NUE_L2, 2, NUE_L2, f) != NUE_L2) { fprintf(stderr, "short net\n"); return 0; }
      for (int i = 0; i < NUE_L1 * 2 * NUE_MI; i++) nueMA[k * NUE_L1 * 2 * NUE_MI + i] = a8[i];
      for (int i = 0; i < NUE_L2 * NUE_L1; i++) nueMB[k * NUE_L2 * NUE_L1 + i] = b8[i];
    }
  } else { memset(nueMA, 0, sizeof nueMA); memset(nueMC, 0, sizeof nueMC); }
  nue_mlp_init();
#endif
  (void)mlp; fclose(f); nue_set_nb(nb);
  if (!nue_kinit()) { fprintf(stderr, "bad bucket map\n"); return 0; }
  return 1;
}
static int loadNet(const char *path) { return loadKP(path); }
#else
static int loadNet(const char *path) {
  FILE *f = fopen(path, "rb"); if (!f) { perror(path); return 0; }
  int hd[3]; if (fread(hd, 4, 3, f) != 3 || hd[0] != 0x5145554E || hd[1] != NUE_H || hd[2] != NUE_IN) { fprintf(stderr, "%s: not a %d-wide net (rebuild with -DNUE_H=%d)\n", path, NUE_H, hd[1]); return 0; }
  if (fread(nueW1, 2, NUE_IN * NUE_H, f) != (size_t)(NUE_IN * NUE_H) || fread(nueB1, 4, NUE_H, f) != NUE_H || fread(nueW2, 2, 2 * NUE_H, f) != 2 * NUE_H || fread(nueB2, 4, 1, f) != 1) { fprintf(stderr, "short net\n"); return 0; }
  fclose(f); return 1;
}
#endif

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

/* --us <engine> <dir>: OUR side is played by another USI engine too (e.g. YaneuraOu's search with our evaluation against Gikou:
   the board, the rules and the clocks stay here). --usopt Name=Value: its options; it gets "go ... byoyomi <--usbyoyomi>" (or the
   Fischer clock), so bound it by an option such as NodesLimit. */
static FILE *toU, *fromU; static pid_t upid;
static void eSwap(void) { FILE *t = toE; toE = toU; toU = t; t = fromE; fromE = fromU; fromU = t; pid_t q = epid; epid = upid; upid = q; }

int main(int argc, char **argv) {
  if (argc < 6) { fprintf(stderr, "usage: usimatch <nnue.bin> <our nodes> <usi engine> <engine dir> <games> [--opt Name=Value]... [--byoyomi ms] [--seed S]\n"); return 1; }
  signal(SIGPIPE, SIG_IGN);
  init();
  if (!loadNet(argv[1])) return 1;
  nue_enable(1);
  { const char *ps = getenv("PARAMS"); int k, v, q; while (ps && sscanf(ps, "%d=%d%n", &k, &v, &q) == 2) { set_param(k, v); ps += q; if (*ps == ',') ps++; } }   /* PARAMS="44=1,45=1": search parameters of our side, in every mode */
#ifdef SEARCH_STATS
  if (!strcmp(argv[2], "stat")) {   /* usimatch <net> stat <nodes | dN> <openings> [positions]: what the one-thread search does (build with -DSEARCH_STATS) */
    int lim = argv[3][0] == 'd' ? 0 : atoi(argv[3]), dep = argv[3][0] == 'd' ? atoi(argv[3] + 1) : 0, np = argc > 5 ? atoi(argv[5]) : 8;
    FILE *f = fopen(argv[4], "r"); if (!f) { perror(argv[4]); return 1; }
    char line[2048]; int n = 0; double dsum = 0, nsum = 0, ebf = 0; int ne = 0; static long long stCutKsum[3][8], stCutDsum[3], stCutDSsum[3];
    for (int k = 0; k < np && fgets(line, sizeof line, f); k++) {
      nh = 0; setStart(); char *p = line, tok[16]; int q;
      while (sscanf(p, " %15s%n", tok, &q) == 1) { p += q; int m = fromUsi(tok); if (!m) break; hist[nh++] = m; play_move(m); }
      tt_clear(); reset_search();
      for (int i = 0; i < 24; i++) { replay(); int m = root_search(0, 0, 3000); if (!m) break; hist[nh++] = m; }   /* into the middle game */
      /* nodes of each iteration (a fresh table each time): the growth per ply */
      double prev = 0;
      for (int d = (dep ? dep : 1); d <= (dep ? dep : 30); d++) {
        replay(); tt_clear(); reset_search();
        memset(stCutK, 0, sizeof stCutK); memset(stCutD, 0, sizeof stCutD); memset(stCutDS, 0, sizeof stCutDS);
        stQ = stProbe = stHit = stTTcut = stCut = stCut1 = stCutTT = stCutIdx = stChkExt = stNull = stNullOk = stLmr = stLmrRe = stStore = stEvict = stRfp = stPv = stMoves = 0;
        root_search(0, d, 0);
        double nn = (u32)res[2];
        if (!dep) { if (prev > 20000 && nn > prev) { ebf += nn / prev; ne++; } prev = nn; if (nn < lim) continue; }
        dsum += d; nsum += nn; n++;
        for (int k = 0; k < 3; k++) for (int b = 0; b < 8; b++) stCutKsum[k][b] += stCutK[k][b]; for (int d2 = 0; d2 < 3; d2++) { stCutDsum[d2] += stCutD[d2]; stCutDSsum[d2] += stCutDS[d2]; }
        { fprintf(stderr, "position startpos moves"); for (int i = 0; i < nh; i++) { char u[8]; toUsi(hist[i], u); fprintf(stderr, " %s", u); } fprintf(stderr, "\n"); }   /* (the position, for another engine) */
        printf("pos %d: depth %d  nodes %.0f  qsearch %.0f%%  table: hit %.0f%% of probes, cut %.0f%%, lost entries %.0f%% of stores  first-move cut %.0f%% (table move %.0f%%, mean place %.2f)  null ok %.0f%%  reduced %.0f%% of moves, re-searched %.0f%%  check ext %.1f%% of moves  rfp %.0f%% of nodes\n", k, d, nn,
          100.0 * stQ / nn, 100.0 * stHit / (stProbe + 1), 100.0 * stTTcut / (stProbe + 1), 100.0 * stEvict / (stStore + 1), 100.0 * stCut1 / (stCut + 1), 100.0 * stCutTT / (stCut + 1), (double)stCutIdx / (stCut + 1),
          100.0 * stNullOk / (stNull + 1), 100.0 * stLmr / (stMoves + 1), 100.0 * stLmrRe / (stLmr + 1), 100.0 * stChkExt / (stMoves + 1), 100.0 * stRfp / (stProbe + 1));
        break;
      }
    }
    printf("mean: depth %.2f  nodes %.0f  growth per ply x%.2f (TT_BITS %d)\n", n ? dsum / n : 0, n ? nsum / n : 0, ne ? ebf / ne : 0, TT_BITS);
    { static const char *nm[3] = { "table move", "capture", "quiet" }; long long tot = 0; for (int k = 0; k < 3; k++) for (int b = 0; b < 8; b++) tot += stCutKsum[k][b];
      for (int k = 0; k < 3; k++) { long long t = 0; for (int b = 0; b < 8; b++) t += stCutKsum[k][b]; const long long *c = stCutKsum[k];
        printf("cut by %-10s %5.1f%% of cuts; place 1: %4.1f%% 2: %4.1f%% 3: %4.1f%% 4-6: %4.1f%% 7-10: %4.1f%% 11-20: %4.1f%% 21-40: %4.1f%% 41+: %4.1f%%\n", nm[k], 100.0 * t / (tot + 1), 100.0 * c[0] / (t + 1), 100.0 * c[1] / (t + 1), 100.0 * c[2] / (t + 1), 100.0 * c[3] / (t + 1), 100.0 * c[4] / (t + 1), 100.0 * c[5] / (t + 1), 100.0 * c[6] / (t + 1), 100.0 * c[7] / (t + 1)); }
      static const char *dn[3] = { "depth 1-3", "depth 4-7", "depth 8+" }; for (int d = 0; d < 3; d++) printf("%s: quiet cut moves %lld, mean place %.2f\n", dn[d], stCutDsum[d], (double)stCutDSsum[d] / (stCutDsum[d] + 1));
      for (int d = 0; d < 3; d++) { const long long *h = stHR[d]; printf("%s: the cutting quiet move among the node's quiet moves by history alone: %.1f of %.1f moves have more (%.1f have history 0); its own history > 0: %.0f%%; it was a killer: %.0f%%\n", dn[d], (double)h[1] / (h[0] + 1), (double)h[2] / (h[0] + 1), (double)h[3] / (h[0] + 1), 100.0 * h[4] / (h[0] + 1), 100.0 * h[5] / (h[0] + 1)); } }
    return 0;
  }
#endif
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
  const char *usPath = NULL, *usDir = NULL; char *uopts[32]; int nuopt = 0, usByo = 60000;
  for (int a = 6; a + 1 < argc; a++) {
    if (!strcmp(argv[a], "--opt") && nopt < 32) opts[nopt++] = argv[++a];
    else if (!strcmp(argv[a], "--byoyomi")) byo = atoi(argv[++a]);
    else if (!strcmp(argv[a], "--us") && a + 2 < argc) { usPath = argv[a + 1]; usDir = argv[a + 2]; a += 2; }
    else if (!strcmp(argv[a], "--usopt") && nuopt < 32) uopts[nuopt++] = argv[++a];
    else if (!strcmp(argv[a], "--usbyoyomi")) usByo = atoi(argv[++a]);
    else if (!strcmp(argv[a], "--openings")) opf = argv[++a];
    else if (!strcmp(argv[a], "--param")) { int k, v; if (sscanf(argv[++a], "%d=%d", &k, &v) == 2) set_param(k, v); }   /* our side's search parameter (engine.c set_param) */
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
  if (usPath) { eStart(usPath, usDir, uopts, nuopt); eSwap(); }
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
    if (usPath) { fprintf(toU, "usinewgame\n"); fflush(toU); }
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
        } else if (usPath) {
          char mv[16]; eSwap(); int r = eMove(usByo, mv); eSwap();
          if (r == 2) { result = 1; break; }
          m = r ? (replay(), fromUsi(mv)) : 0;
          if (r && !m) fprintf(stderr, "illegal move from our stand-in: %s\n", mv);
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
    { const char *kf = getenv("KIFU");   /* KIFU=<file>: every game's moves are appended (tools/match/blunders.py reads them) */
      if (kf) { FILE *k = fopen(kf, "a"); if (k) { fprintf(k, "%d %d %d", weBlack, result, nh0); for (int i = 0; i < nh; i++) { char u[8]; toUsi(hist[i], u); fprintf(k, " %s", u); } fprintf(k, "\n"); fclose(k); } } }
    if (fBase) printf("  %d plies, per move: ours %.1f s, engine %.1f s%s\n", nh, nO ? usedO / nO / 1000 : 0, nE ? usedE / nE / 1000 : 0, flag == 1 ? " (we lost on time)" : flag == 2 ? " (the engine lost on time)" : "");
    printf("game %d (%s): %s   total +%d -%d =%d  score %.3f\n", g + 1, weBlack ? "we sente" : "we gote", result > 0 ? "win" : result < 0 ? "loss" : "draw", w, l, d, (w + d * .5) / (g + 1));
    fflush(stdout);
  }
  fprintf(toE, "quit\n"); fflush(toE); waitpid(epid, NULL, 0);
  return 0;
}
