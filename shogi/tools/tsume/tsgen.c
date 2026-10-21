/*
 * Native composed-tsume generator (same rules / move generation as the game: it includes ../../engine.c).
 * Same conventions as tools/tsume/solve.js (futile interpositions = defender drops on undefended squares are no
 * defence; unique attacker move at every turn incl. the last; longest defence; no leftover pieces in hand).
 * Candidates are printed as JSON lines {"sfen":..,"n":..,"sol":[..]} and are re-verified and scored in node
 * (tools/tsume/pool.js -> solve.js verify + tools/fun.js), so this file only has to be fast, not authoritative.
 * Search: random restarts + hill climbing on the shortest mate length, then a short climb on an interest proxy
 * (sacrifices, a non-obvious first move, motifs) that keeps the problem valid; deterministic for a seed.
 * build: gcc -O2 -w -o /tmp/tsgen tools/tsume/tsgen.c -lm
 * run:   /tmp/tsgen <n> <seed> <seconds> [maxPieces] [theme]   (theme: sac funari touchi uchifu aigoma aki kwalk)
 */
#include "../../engine.c"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
double js_now(void) { return 0; }
void js_progress(i32 a, double b, i32 c, i32 *d, i32 e) {}
void js_aprogress(i32 a, i32 b, i32 *c, double *d) {}

/* ------------------------------------------------------------ transposition table for the mate search */
#define TB 20
#define TSZ (1 << TB)
typedef struct { i32 l, h; u32 gen; i8 yes, no; } TE;
static TE *tt;
static u32 tgen = 1;
static long nodesT, nodeLim;
static int abortF;
static TE *probe(void) {
  u32 i = (u32)hl & (TSZ - 1);
  for (int k = 0; k < 4; k++) { TE *e = &tt[(i + k) & (TSZ - 1)]; if (e->gen != tgen) { e->gen = tgen; e->l = hl; e->h = hh; e->yes = 127; e->no = -1; return e; } if (e->l == hl && e->h == hh) return e; }
  TE *e = &tt[i]; e->gen = tgen; e->l = hl; e->h = hh; e->yes = 127; e->no = -1; return e;
}
static i32 BUF[80][1000];
static inline int cheb_(int a, int b) { int dr = abs(a / 9 - b / 9), dc = abs(a % 9 - b % 9); return dr > dc ? dr : dc; }
static int checksAt(int ply, i32 *out) {
  i32 *list = BUF[ply]; int n = gen(list, 2), k = 0, ek = king[1];
  for (int i = 0; i < n; i++) {
    int m = list[i];
    if ((m & 127) > 80) {
      /* a drop checks iff the dropped piece attacks the king (the king is not in check before) */
      int to = (m >> 7) & 127, t = (m & 127) - 80;
      if (cheb_(to, ek) > 1 && t != KY && t != KA && t != HI && t != KE) continue;
      board[to] = t; int chk = attacked(ek, 0); board[to] = 0;
      if (!chk) continue;
      if (t == FU) { doMove(m); int ok = lastMoveLegal(m); undoMove(); if (!ok) continue; }
      out[k++] = m; continue;
    }
    { /* board-only make: direct or discovered check (no attacker king, so every attacker move is legal) */
      int f = m & 127, to = (m >> 7) & 127, pc = board[f], q = board[to];
      board[f] = 0; board[to] = (m >> 14) & 1 ? pc + 8 : pc; int chk = attacked(ek, 0); board[to] = q; board[f] = pc;
      if (chk) out[k++] = m;
    }
  }
  return k;
}
static int repliesAt(int ply, i32 *out) {
  i32 *list = BUF[ply]; int k = 0, me = side; i8 hs[8]; for (int t = 0; t < 8; t++) { hs[t] = hand[me * 8 + t]; hand[me * 8 + t] = 0; }
  int n = gen(list, 2); for (int t = 0; t < 8; t++) hand[me * 8 + t] = hs[t];
  int kq = king[me];
  for (int i = 0; i < n; i++) {
    int m = list[i]; if ((m & 127) > 80) continue;
    if ((m & 127) == kq) {   /* king move: legal iff the target is not attacked once the king has left */
      int to = (m >> 7) & 127, q = board[to], kp = board[kq];
      board[kq] = 0; board[to] = kp; int att = attacked(to, me ^ 1); board[to] = q; board[kq] = kp;
      if (!att) out[k++] = m; continue;
    }
    { int f = m & 127, to = (m >> 7) & 127, pc = board[f], q = board[to];
      board[f] = 0; board[to] = (m >> 14) & 1 ? pc + 8 : pc; int att = attacked(kq, me ^ 1); board[to] = q; board[f] = pc;
      if (!att) out[k++] = m; }
  }
  int cs[16]; int nc = attackers(kq, me ^ 1, cs);
  if (nc == 1) {
    int c = cs[0], kr = kq / 9, kc = kq % 9, cr = c / 9, cc = c % 9;
    int dr = (cr > kr) - (cr < kr), dc = (cc > kc) - (cc < kc);
    int ar = abs(cr - kr), ac = abs(cc - kc);
    if ((cr == kr || cc == kc || ar == ac) && (ar > 1 || ac > 1)) {
      int hb = me * 8, pf = 0;
      if (hand[hb + FU]) for (int s = 0; s < 81; s++) if (board[s] == FU + (me ? WF : 0)) pf |= 1 << (s % 9);
      for (int r = kr + dr, cl = kc + dc; r != cr || cl != cc; r += dr, cl += dc) {
        int s = r * 9 + cl;
        if (!attacked(s, me)) continue;
        for (int t = 1; t <= 7; t++) {
          if (!hand[hb + t]) continue;
          if (t <= KE && deadEnd(me, t, s)) continue;
          if (t == FU && ((pf >> cl) & 1)) continue;
          out[k++] = (80 + t) | (s << 7);
        }
      }
    }
  }
  return k;
}
static int AND(int d, int ply);
static int OR(int d, int ply) {
  if (d < 1) return 0;
  if (++nodesT > nodeLim) { abortF = 1; return 0; }
  TE *e = probe(); if (e->yes <= d) return 1; if (e->no >= d) return 0;
  i32 cs[600]; int n = checksAt(ply, cs);
  for (int i = 0; i < n; i++) {
    doMove(cs[i]); int ok = AND(d - 1, ply + 1); undoMove();
    if (abortF) return 0;
    if (ok) { e = probe(); if (d < e->yes) e->yes = d; return 1; }
  }
  e = probe(); if (d > e->no) e->no = d;
  return 0;
}
static int AND(int d, int ply) {
  TE *e = probe(); if (e->yes <= d) return 1; if (e->no >= d) return 0;
  i32 rs[600]; int n = repliesAt(ply, rs);
  if (!n) { e->yes = 0; return 1; }
  if (d < 2) { if (d > e->no) e->no = d; return 0; }
  for (int i = 0; i < n; i++) {
    doMove(rs[i]); int ok = OR(d - 1, ply + 1); undoMove();
    if (abortF) return 0;
    if (!ok) { e = probe(); if (d > e->no) e->no = d; return 0; }
  }
  e = probe(); if (d < e->yes) e->yes = d;
  return 1;
}
static int mateLen(int max, int ply) { for (int d = 1; d <= max; d += 2) { if (OR(d, ply)) return d; if (abortF) return 0; } return 0; }
static int handEmpty(void) { for (int t = 1; t <= 7; t++) if (hand[t]) return 0; return 1; }

/* main line verification, as solve.js verify */
static i32 SOL[80]; static int solN;
static int walk(int r, int ply) {
  i32 cs[600]; int n = checksAt(ply, cs), good = -1, ng = 0;
  for (int i = 0; i < n && ng < 2; i++) { doMove(cs[i]); if (AND(r - 1, ply + 1)) { ng++; good = cs[i]; } undoMove(); if (abortF) return 0; }
  if (ng != 1) return 0;
  doMove(good); SOL[ply] = good;
  i32 rs[600]; int nr = repliesAt(ply + 1, rs);
  if (!nr) { if (r == 1 && handEmpty()) { solN = ply + 1; return 1; } undoMove(); return 0; }
  int L[600], bl = -1;
  for (int i = 0; i < nr; i++) { doMove(rs[i]); L[i] = mateLen(r - 2, ply + 2); undoMove(); if (abortF || !L[i]) { undoMove(); return 0; } if (L[i] > bl) bl = L[i]; }
  if (bl != r - 2) { undoMove(); return 0; }
  int tried = 0;
  for (int pass = 0; pass < 2 && tried < 4; pass++) for (int i = 0; i < nr && tried < 4; i++) {
    if (L[i] != bl) continue;
    int drop = (rs[i] & 127) > 80; if (drop != pass) continue;
    tried++;
    doMove(rs[i]); SOL[ply + 1] = rs[i];
    if (walk(r - 2, ply + 2)) return 1;
    undoMove();
    if (abortF) { undoMove(); return 0; }
  }
  undoMove(); return 0;
}
/* ------------------------------------------------------------ positions */
static const int TOTAL[8] = {0, 18, 4, 4, 4, 2, 2, 4};
typedef struct { int k, np; int s[24], t[24], c[24]; int hand[8]; } PZ;
static u32 rs_;
static double R(void) { rs_ ^= rs_ << 13; rs_ ^= rs_ >> 17; rs_ ^= rs_ << 5; return rs_ / 4294967296.0; }
static int valid(PZ *P) {
  int cnt[8]; memcpy(cnt, TOTAL, sizeof cnt); int occ[81] = {0}; occ[P->k] = 1;
  for (int i = 0; i < P->np; i++) {
    if (P->s[i] < 0 || P->s[i] > 80 || occ[P->s[i]]) return 0; occ[P->s[i]] = 1;
    int t = P->t[i], b = t > 8 ? t - 8 : t; if (--cnt[b] < 0) return 0;
    if (t <= KE && deadEnd(P->c[i], t, P->s[i])) return 0;
  }
  for (int t = 1; t <= 7; t++) if ((cnt[t] -= P->hand[t]) < 0) return 0;
  for (int c = 0; c < 2; c++) { int f = 0; for (int i = 0; i < P->np; i++) if (P->c[i] == c && P->t[i] == FU) { if (f >> (P->s[i] % 9) & 1) return 0; f |= 1 << (P->s[i] % 9); } }
  return 1;
}
static void setup(PZ *P) {
  int cnt[8]; memcpy(cnt, TOTAL, sizeof cnt);
  memset(setupBuf, 0, sizeof setupBuf);
  setupBuf[P->k] = OU + WF;
  for (int i = 0; i < P->np; i++) { setupBuf[P->s[i]] = P->t[i] + (P->c[i] ? WF : 0); int t = P->t[i]; cnt[t > 8 ? t - 8 : t]--; }
  for (int t = 1; t <= 7; t++) { setupBuf[81 + t] = P->hand[t]; setupBuf[81 + 8 + t] = cnt[t] - P->hand[t]; }
  setupBuf[97] = 0;
  set_position();
}
static void sfenOf(PZ *P, char *out) {
  static const char *L = " PLNSBRGK";
  char b[81][4]; for (int i = 0; i < 81; i++) b[i][0] = 0;
  int cnt[8]; memcpy(cnt, TOTAL, sizeof cnt);
  strcpy(b[P->k], "k");
  for (int i = 0; i < P->np; i++) { int t = P->t[i], ba = t > 8 ? t - 8 : t; cnt[ba]--; char ch = L[ba]; if (P->c[i]) ch += 32; if (t > 8) { b[P->s[i]][0] = '+'; b[P->s[i]][1] = ch; b[P->s[i]][2] = 0; } else { b[P->s[i]][0] = ch; b[P->s[i]][1] = 0; } }
  char *o = out;
  for (int r = 0; r < 9; r++) { int e = 0; for (int c = 0; c < 9; c++) { char *x = b[r * 9 + c]; if (!x[0]) { e++; continue; } if (e) { *o++ = '0' + e; e = 0; } o += sprintf(o, "%s", x); } if (e) *o++ = '0' + e; if (r < 8) *o++ = '/'; }
  o += sprintf(o, " b ");
  static const int ord[7] = {6, 5, 7, 4, 3, 2, 1}; int any = 0;
  for (int i = 0; i < 7; i++) { int t = ord[i]; if (P->hand[t]) { if (P->hand[t] > 1) o += sprintf(o, "%d", P->hand[t]); *o++ = L[t]; any = 1; } }
  for (int i = 0; i < 7; i++) { int t = ord[i], n = cnt[t] - P->hand[t]; if (n > 0) { if (n > 1) o += sprintf(o, "%d", n); *o++ = L[t] + 32; any = 1; } }
  if (!any) *o++ = '-';
  sprintf(o, " 1");
}
static void usi(int m, char *o) {
  int f = m & 127, t = (m >> 7) & 127;
  if (f > 80) { sprintf(o, "%c*%d%c", "PLNSBRG"[f - 81], 9 - t % 9, 'a' + t / 9); return; }
  sprintf(o, "%d%c%d%c%s", 9 - f % 9, 'a' + f / 9, 9 - t % 9, 'a' + t / 9, (m >> 14) & 1 ? "+" : "");
}
static int parseSfen(const char *sf, PZ *P) {
  memset(P, 0, sizeof *P); int r = 0, c = 0, pro = 0; const char *q = sf; P->k = -1;
  for (; *q && *q != ' '; q++) {
    if (*q == '/') { r++; c = 0; continue; } if (*q == '+') { pro = 1; continue; }
    if (*q >= '1' && *q <= '9') { c += *q - '0'; continue; }
    char up = *q >= 'a' ? *q - 32 : *q; const char *L = "PLNSBRGK"; int t = (int)(strchr(L, up) - L) + 1;
    int col = *q >= 'a';
    if (t == OU) { if (!col) return 0; P->k = r * 9 + c; }
    else { P->s[P->np] = r * 9 + c; P->t[P->np] = t + (pro ? 8 : 0); P->c[P->np++] = col; }
    pro = 0; c++;
  }
  q++; if (*q) q++; while (*q == ' ') q++;
  int n = 0;
  for (; *q && *q != ' '; q++) {
    if (*q == '-') break;
    if (*q >= '0' && *q <= '9') { n = n * 10 + *q - '0'; continue; }
    if (*q >= 'A' && *q <= 'Z') { const char *L = "PLNSBRG"; int t = (int)(strchr(L, *q) - L) + 1; P->hand[t] += n ? n : 1; }
    n = 0;
  }
  return P->k >= 0;
}
static int nearSq(int k, int d) { for (;;) { int r = k / 9 + (int)(R() * (2 * d + 1)) - d, c = k % 9 + (int)(R() * (2 * d + 1)) - d; if (r >= 0 && r < 9 && c >= 0 && c < 9) return r * 9 + c; } }
static const int PT[12] = {FU, KY, KE, GI, KI, KA, HI, 9, 11, 12, 13, 14};
static const double PW[12] = {2, 2, 3, 4, 4, 3, 3, .4, .3, .4, 1.2, 1.2};
static int pickT(int noProm) { double tot = 0; int n = noProm ? 7 : 12; for (int i = 0; i < n; i++) tot += PW[i]; double v = R() * tot; for (int i = 0; i < n; i++) { v -= PW[i]; if (v <= 0) return PT[i]; } return KI; }
static int nPieces(PZ *P) { int h = 0; for (int t = 1; t <= 7; t++) h += P->hand[t]; return P->np + h; }
static void randomPos(PZ *P, int maxP) {
  for (;;) {
    int r = R() < .7 ? (int)(R() * 2) : (int)(R() * 5), c = (int)(R() * 9);
    memset(P, 0, sizeof *P); P->k = r * 9 + c;
    int na = 1 + (int)(R() * 3), nd = (int)(R() * 3), nh = 1 + (int)(R() * 2);
    for (int i = 0; i < na; i++) { P->s[P->np] = nearSq(P->k, 3); P->t[P->np] = pickT(0); P->c[P->np++] = 0; }
    for (int i = 0; i < nd; i++) { P->s[P->np] = nearSq(P->k, 2); P->t[P->np] = pickT(R() < .7); P->c[P->np++] = 1; }
    for (int i = 0; i < nh; i++) P->hand[pickT(1)]++;
    if (nPieces(P) <= maxP && valid(P)) return;
  }
}
static int mutate(PZ *P) {
  double x = R();
  if (x < .35 && P->np) { int i = (int)(R() * P->np); P->s[i] = nearSq(P->k, P->c[i] ? 2 : 4); }
  else if (x < .5 && P->np) { int i = (int)(R() * P->np); P->t[i] = pickT(P->c[i] && R() < .6); }
  else if (x < .62) { if (P->np >= 20) return 0; P->s[P->np] = nearSq(P->k, 3); P->t[P->np] = pickT(R() < .5); P->c[P->np++] = R() < .6 ? 0 : 1; }
  else if (x < .74 && P->np) { int i = (int)(R() * P->np); P->np--; P->s[i] = P->s[P->np]; P->t[i] = P->t[P->np]; P->c[i] = P->c[P->np]; }
  else if (x < .86) { int t = pickT(1); if (R() < .5 || !P->hand[t]) P->hand[t]++; else P->hand[t]--; }
  else if (x < .93) P->k = nearSq(P->k, 1);
  else if (P->np) { int i = (int)(R() * P->np), t = P->t[i]; if (t <= 7 && t != KI) P->t[i] += 8; else if (t > 8) P->t[i] -= 8; }
  for (int i = 0; i < P->np; i++) if (P->s[i] == P->k) return 0;
  return valid(P);
}
static long LIM;
static char seedSf[800][200], seedSol[800][400]; static int nSeed = 0, curSeed = -1;
static int differsFromSeed(int n) {
  if (curSeed < 0) return 1;
  char u[16], *ss = seedSol[curSeed]; int same = 0, att = 0;
  for (int i = 0; i < n; i += 2) { usi(SOL[i], u); att++; char key[20]; sprintf(key, " %s ", u); char buf[420]; sprintf(buf, " %s ", ss); if (strstr(buf, key)) same++; }
  usi(SOL[0], u); char f[20]; sprintf(f, "%s ", u);
  return strncmp(ss, f, strlen(f)) != 0 && same * 2 <= att;
}
static long NQ, NV, NODES; static int quick(PZ *P, int n) { NQ++; setup(P); if (inCheckC(1)) return 0; tgen++; nodesT = 0; abortF = 0; nodeLim = LIM; return mateLen(n, 0); }
static int verifyP(PZ *P, int n) {
  setup(P); if (inCheckC(1)) return 0;
  tgen++; nodesT = 0; abortF = 0; nodeLim = LIM * 6;
  if (n > 1 && mateLen(n - 2, 0)) return 0;
  if (abortF || !OR(n, 0)) return 0;
  solN = 0;
  if (!walk(n, 0)) return 0;
  return solN == n;
}
/* interest proxy along SOL (position must be at the start) */
static int cheb(int a, int b) { int dr = abs(a / 9 - b / 9), dc = abs(a % 9 - b % 9); return dr > dc ? dr : dc; }
static int TH;   /* required theme bit (0 = none) */
enum { T_SAC = 1, T_FUN = 2, T_TOU = 4, T_UCH = 8, T_AIG = 16, T_AKI = 32, T_KW = 64 };
static int uchNow(void) {
  int k = king[1]; if (!hand[FU] || k + 9 > 80 || board[k + 9]) return 0;
  for (int r = 0; r < 9; r++) if (board[r * 9 + k % 9] == FU) return 0;
  int pm = (80 + FU) | ((k + 9) << 7); doMove(pm); int bad = !lastMoveLegal(pm); undoMove(); return bad;
}
static double interest(PZ *P, int n, int *tagsOut) {
  setup(P);
  int tags = 0, sacs = 0, kmoves = 0; double s = 0;
  for (int i = 0; i < n; i++) {
    int m = SOL[i], from = m & 127, to = (m >> 7) & 127, drop = from > 80;
    if (i % 2 == 0) {
      i32 cs[600]; int nc = checksAt(60, cs);
      int k0 = king[1], cap = !drop && board[to];
      int t = drop ? from - 80 : typeOf(board[from]);
      int canPro = !drop && CAN_PROMOTE[t] && (inZone(0, from) || inZone(0, to));
      if (uchNow()) tags |= T_UCH;
      doMove(m);
      int at[16], na = attackers(king[1], 0, at), aki = 0; for (int j = 0; j < na; j++) if (at[j] != to) aki = 1;
      int sac = i + 1 < n && !((SOL[i + 1] & 127) > 80) && ((SOL[i + 1] >> 7) & 127) == to;
      int tou = drop && (t == KA || t == HI || t == KY) && cheb(to, k0) >= 2;
      int fun = canPro && !((m >> 14) & 1);
      if (sac) { tags |= T_SAC; sacs++; } if (tou) tags |= T_TOU; if (fun) tags |= T_FUN; if (aki) tags |= T_AKI;
      if (i == 0) { s += sac * 30 + (tou || fun || aki) * 18 + (nc > 3 ? 8 : nc > 1 ? 3 : -15) - cap * 20 + ((!drop && !cap && cheb(to, k0) >= 2) ? 5 : 0); if (drop && (t == KI || t == GI) && cheb(to, k0) == 1 && !sac) s -= 12; }
      if (nc <= 1) s -= 4;
    } else {
      if (drop) tags |= T_AIG;
      if (typeOf(board[from]) == OU && !drop) kmoves++;
      doMove(m);
    }
  }
  if (kmoves >= 4) tags |= T_KW;
  int kinds = __builtin_popcount(tags);
  s += kinds * 8 + (sacs > 3 ? 3 : sacs) * 6 - nPieces(P) * 2;
  if (TH && !(tags & TH)) s -= 60;
  *tagsOut = tags;
  return s;
}
static void emit(PZ *P, int n, double sc, int tags) {
  char sf[256], u[16]; sfenOf(P, sf);
  printf("{\"sfen\":\"%s\",\"n\":%d,\"proxy\":%.0f,\"tags\":%d,\"sol\":[", sf, n, sc, tags);
  for (int i = 0; i < n; i++) { usi(SOL[i], u); printf("%s\"%s\"", i ? "," : "", u); }
  printf("]}\n"); fflush(stdout);
}
/* remove pieces that are not needed (the problem stays valid without them) */
static void reduceP(PZ *P, int n) {
  for (int again = 1; again;) {
    again = 0;
    for (int i = 0; i < P->np; i++) {
      PZ Q = *P; Q.np--; Q.s[i] = Q.s[Q.np]; Q.t[i] = Q.t[Q.np]; Q.c[i] = Q.c[Q.np];
      if (verifyP(&Q, n)) { *P = Q; again = 1; break; }
    }
  }
  verifyP(P, n);
}
static clock_t T0; static double SECS;
#define TIMEUP ((double)(clock() - T0) / CLOCKS_PER_SEC > SECS)
int main(int argc, char **argv) {
  int n = atoi(argv[1]); rs_ = (u32)atoi(argv[2]) * 2654435761u + 12345; double secs = atof(argv[3]);
  int maxP = argc > 4 ? atoi(argv[4]) : 8;
  TH = 0;
  if (argc > 5) { const char *t = argv[5]; TH = !strcmp(t, "sac") ? T_SAC : !strcmp(t, "funari") ? T_FUN : !strcmp(t, "touchi") ? T_TOU : !strcmp(t, "uchifu") ? T_UCH : !strcmp(t, "aigoma") ? T_AIG : !strcmp(t, "aki") ? T_AKI : !strcmp(t, "kwalk") ? T_KW : 0; }
  if (argc > 6) { FILE *f = fopen(argv[6], "r"); char line[700]; while (f && nSeed < 800 && fgets(line, sizeof line, f)) { char *bar = strchr(line, '|'); if (!bar) continue; *bar = 0; strcpy(seedSf[nSeed], line); char *e = strchr(bar + 1, '\n'); if (e) *e = 0; strcpy(seedSol[nSeed], bar + 1); nSeed++; } if (f) fclose(f); }
  init();
  tt = calloc(TSZ, sizeof(TE));
  LIM = n <= 5 ? 60000 : n <= 7 ? 200000 : n <= 11 ? 800000 : 2000000;
  T0 = clock(); SECS = secs;
  long found = 0;
  while (!TIMEUP) {
    PZ P; curSeed = -1;
    if (nSeed && R() < .8) { curSeed = (int)(R() * nSeed); parseSfen(seedSf[curSeed], &P); for (int j = 0, k = 2 + (int)(R() * 3); j < k;) { PZ Q = P; if (mutate(&Q)) { P = Q; j++; } } }
    else randomPos(&P, maxP);
    int L = quick(&P, n), stall = 0, fails = 0;
    for (int it = 0; it < 500 && stall < 80 && !TIMEUP; it++) {
      PZ Q = P; if (!mutate(&Q)) continue;
      if (nPieces(&Q) > maxP + 1) continue;
      int ql = quick(&Q, n);
      if (!ql) { stall++; continue; }
      if (ql >= L) { if (ql > L) stall = 0; else stall++; P = Q; L = ql; } else stall++;
      if (L != n) continue;
      int ok = verifyP(&P, n);
      if (!ok) { /* leftover? try one hand piece less */
        for (int t = 1; t <= 7 && !ok; t++) if (P.hand[t]) { PZ Q2 = P; Q2.hand[t]--; if (verifyP(&Q2, n)) { P = Q2; ok = 1; } }
      }
      if (!ok) { if (++fails > 12) break; continue; }
      reduceP(&P, n);
      int tags; double sc = interest(&P, n, &tags); verifyP(&P, n);
      if ((!TH || (tags & TH)) && differsFromSeed(n)) { emit(&P, n, sc, tags); found++; }
      /* climb on the proxy while staying valid */
      for (int j = 0; j < (n <= 7 ? 120 : 60) && !TIMEUP; j++) {
        PZ Q2 = P; if (!mutate(&Q2) || nPieces(&Q2) > maxP + 1) continue;
        if (quick(&Q2, n) != n || !verifyP(&Q2, n)) continue;
        int tg; double s2 = interest(&Q2, n, &tg); verifyP(&Q2, n);
        if (s2 >= sc) {
          reduceP(&Q2, n); s2 = interest(&Q2, n, &tg); verifyP(&Q2, n);
          if (s2 > sc && (!TH || (tg & TH)) && differsFromSeed(n)) { emit(&Q2, n, s2, tg); found++; }
          P = Q2; sc = s2;
        }
      }
      break;
    }
  }
  fprintf(stderr, "found %ld quick %ld\n", found, NQ);
  return 0;
}
