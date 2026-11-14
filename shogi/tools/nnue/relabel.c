/* Relabel training positions with a stronger / deeper teacher: every position of a PackedSfenValue file is searched by
   a USI engine (e.g. YaneuraOu with a strong evaluation, tools/nnue/setup-teacher.sh) to a fixed depth or node count, and
   written back with the engine's score in place of the old one (the position, the game result and the ply stay).
   The engine is only a teacher: what goes on the site is the net trained here.

   relabel <in.psv> <out.psv> <first> <stride> <count> <engine> <engine dir> <depth | Nn (nodes)> [--opt Name=Value]...
     positions first, first + stride, first + 2 * stride ... (count of them): P processes take first = 0 .. P-1 with
     stride P (tools/nnue/relabel.sh). A position in check, or one the engine resigns / declares a win in, is left out.
     <out.psv>.next keeps the next index (noted every 500 positions): the same command continues a run that was stopped.
   At the end: the speed, and how the new scores compare with the old ones (the scale: train with scores on the scale
   of the old ones, win rate = sigmoid(score / 600); a teacher on another scale needs its option, e.g. FV_SCALE).

   cc -O2 -o relabel tools/nnue/relabel.c -lm */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <signal.h>
#include <unistd.h>
#include <fcntl.h>
#include <time.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include "psv.h"

static FILE *toE, *fromE;
static void eStart(const char *path, const char *dir) {
  int in[2], out[2]; if (pipe(in) || pipe(out)) { perror("pipe"); exit(1); }
  pid_t pid = fork();
  if (pid == 0) {
    if (chdir(dir)) { perror(dir); _exit(1); }
    dup2(in[0], 0); dup2(out[1], 1); close(in[1]); close(out[0]);
    int dn = open("/dev/null", O_WRONLY); if (dn >= 0) dup2(dn, 2);
    execl(path, path, (char *)NULL); perror(path); _exit(1);
  }
  close(in[0]); close(out[1]);
  toE = fdopen(in[1], "w"); fromE = fdopen(out[0], "r");
}
static int waitFor(const char *word) {
  char line[8192];
  while (fgets(line, sizeof line, fromE)) if (!strncmp(line, word, strlen(word))) return 1;
  return 0;
}
/* the position as SFEN (board[81]: row 0 = rank a, col 0 = file 9; piece = type + 16 * colour) */
static void toSfen(const Pos *p, char *o) {
  static const char *PC[15] = { "", "P", "L", "N", "S", "B", "R", "G", "K", "+P", "+L", "+N", "+S", "+B", "+R" };
  char *q = o;
  for (int r = 0; r < 9; r++) {
    int e = 0;
    for (int c = 0; c < 9; c++) {
      int pc = p->board[r * 9 + c];
      if (!pc) { e++; continue; }
      if (e) { *q++ = (char)('0' + e); e = 0; }
      const char *s = PC[pc & 15]; int col = pc >> 4;
      for (; *s; s++) *q++ = (char)(col && *s != '+' ? *s - 'A' + 'a' : *s);
    }
    if (e) *q++ = (char)('0' + e);
    if (r < 8) *q++ = '/';
  }
  *q++ = ' '; *q++ = p->side ? 'w' : 'b'; *q++ = ' ';
  static const int HO[7] = { 6, 5, 7, 4, 3, 2, 1 };   /* R B G S N L P */
  int any = 0;
  for (int c = 0; c < 2; c++) for (int k = 0; k < 7; k++) {
    int t = HO[k], n = p->hand[c * 8 + t]; if (!n) continue;
    any = 1; if (n > 1) q += sprintf(q, "%d", n);
    *q++ = (char)(c ? PC[t][0] - 'A' + 'a' : PC[t][0]);
  }
  if (!any) *q++ = '-';
  strcpy(q, " 1");
}
static double nowS(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec + t.tv_nsec * 1e-9; }
static double sg(double x) { return 1 / (1 + exp(-x)); }

int main(int argc, char **argv) {
  if (argc < 9) { fprintf(stderr, "usage: relabel <in.psv> <out.psv> <first> <stride> <count> <engine> <engine dir> <depth | Nn> [--opt Name=Value]...\n"); return 1; }
  signal(SIGPIPE, SIG_IGN);
  long first = atol(argv[3]), stride = atol(argv[4]), count = atol(argv[5]);
  const char *lim = argv[8]; char go[64];
  if (lim[strlen(lim) - 1] == 'n') snprintf(go, sizeof go, "go nodes %ld", atol(lim)); else snprintf(go, sizeof go, "go depth %d", atoi(lim));
  int fd = open(argv[1], O_RDONLY); if (fd < 0) { perror(argv[1]); return 1; }
  struct stat st; fstat(fd, &st); long n = st.st_size / (long)sizeof(PSV);
  const PSV *d = mmap(NULL, st.st_size, PROT_READ, MAP_PRIVATE, fd, 0); if (d == MAP_FAILED) { perror("mmap"); return 1; }
  char nextName[1200]; snprintf(nextName, sizeof nextName, "%s.next", argv[2]);
  long k0 = 0, w0 = 0; { FILE *f = fopen(nextName, "r"); if (f) { if (fscanf(f, "%ld %ld", &k0, &w0) != 2) k0 = w0 = 0; fclose(f); } }
  if (k0 && truncate(argv[2], (off_t)w0 * (off_t)sizeof(PSV))) k0 = w0 = 0;   /* (what was written after the last note is dropped) */
  FILE *out = fopen(argv[2], k0 ? "ab" : "wb"); if (!out) { perror(argv[2]); return 1; }

  eStart(argv[6], argv[7]);
  fprintf(toE, "usi\n"); fflush(toE); if (!waitFor("usiok")) { fprintf(stderr, "the engine did not answer usi (path, eval file?)\n"); return 1; }
  fprintf(toE, "setoption name Threads value 1\nsetoption name USI_Hash value 64\nsetoption name BookFile value no_book\nsetoption name NetworkDelay value 0\nsetoption name NetworkDelay2 value 0\nsetoption name MinimumThinkingTime value 0\nsetoption name ResignValue value 99999\n");
  for (int a = 9; a + 1 < argc; a += 2) if (!strcmp(argv[a], "--opt")) {
    char *eq = strchr(argv[a + 1], '='); if (!eq) continue;
    fprintf(toE, "setoption name %.*s value %s\n", (int)(eq - argv[a + 1]), argv[a + 1], eq + 1);
  }
  fprintf(toE, "isready\n"); fflush(toE); if (!waitFor("readyok")) { fprintf(stderr, "the engine did not get ready (is eval/nn.bin in the engine's folder?)\n"); return 1; }
  fprintf(toE, "usinewgame\n"); fflush(toE);

  long done = 0, wrote = w0; double t0 = nowS(), so = 0, sn = 0, soo = 0, snn = 0, son = 0; long cmp = 0;
  enum { KEEP = 200000 }; float *xo = malloc(KEEP * sizeof(float)), *xn = malloc(KEEP * sizeof(float));
  char line[8192], sfen[256];
  for (long k = k0; k < count; k++) {
    long i = first + k * stride; if (i >= n) break;
    Pos p; done++;
    if (!psv_decode(&d[i], &p) && !psv_in_check(&p)) {
      toSfen(&p, sfen);
      fprintf(toE, "position sfen %s\n%s\n", sfen, go); fflush(toE);
      int have = 0, score = 0, bad = 0;
      for (;;) {
        if (!fgets(line, sizeof line, fromE)) { fprintf(stderr, "the engine stopped\n"); return 1; }
        if (!strncmp(line, "bestmove", 8)) { if (strstr(line, "resign") || strstr(line, "win")) bad = 1; break; }
        char *s = strstr(line, " score ");
        if (!s || strncmp(line, "info", 4)) continue;
        const int bound = strstr(line, "lowerbound") || strstr(line, "upperbound");
        if (bound && have == 2) continue;   /* an exact score is kept over a later bound (a search cut short) */
        int v, ok = 0;
        if (!strncmp(s + 7, "cp ", 3)) { v = atoi(s + 10); ok = 1; }
        else if (!strncmp(s + 7, "mate ", 5)) { const char *m = s + 12; v = *m == '-' ? -30000 : 30000; ok = 1; }
        if (ok) { score = v; have = bound ? 1 : 2; }
      }
      if (have && !bad) {
        PSV r = d[i]; const int old = r.score;
        r.score = (int16_t)(score > 32000 ? 32000 : score < -32000 ? -32000 : score);
        fwrite(&r, sizeof r, 1, out); wrote++;
        if (abs(old) < 3000 && abs(score) < 3000) { so += old; sn += score; soo += (double)old * old; snn += (double)score * score; son += (double)old * score; if (cmp < KEEP) { xo[cmp] = (float)old; xn[cmp] = (float)score; } cmp++; }
      }
    }
    if (done % 500 == 0) {
      fflush(out); FILE *f = fopen(nextName, "w"); if (f) { fprintf(f, "%ld %ld\n", k + 1, wrote); fclose(f); }
      if (done % 5000 == 0) { fprintf(stderr, "\r  %ld / %ld  %.0f positions/s   ", k + 1, count, done / (nowS() - t0)); fflush(stderr); }
    }
  }
  fclose(out); { FILE *f = fopen(nextName, "w"); if (f) { fprintf(f, "%ld %ld\n", count, wrote); fclose(f); } }
  fprintf(toE, "quit\n"); fflush(toE);
  const double el = nowS() - t0;
  printf("\nrelabelled %ld positions (%ld written) in %.0f s: %.1f positions/s\n", done, wrote, el, done / (el > 0 ? el : 1));
  if (cmp > 100) {
    double mo = so / cmp, mn = sn / cmp, co = (son / cmp - mo * mn) / sqrt((soo / cmp - mo * mo) * (snn / cmp - mn * mn));
    long m = cmp < KEEP ? cmp : KEEP; double best = 1e18, bs = 1;
    for (int q = 30; q <= 300; q++) { double s = q / 100.0, l = 0; for (long j = 0; j < m; j++) { double e = sg(xo[j] / 600.0) - sg(s * xn[j] / 600.0); l += e * e; } if (l < best) { best = l; bs = s; } }
    printf("old vs new scores (|score| < 3000, %ld positions): correlation %.3f, mean |old| %.0f, mean |new| %.0f, the new scores x %.2f fit the old scale best\n",
           cmp, co, sqrt(soo / cmp), sqrt(snn / cmp), bs);
  }
  return 0;
}
