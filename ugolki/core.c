// Ugolki — the search in WebAssembly (tools/build-core.sh → core-wasm.js). The same algorithm, move order, table, repetition
// rule and counters as search() / orderMoves() / evaluate() / terminal() in engine.js: the one-thread results are identical
// (tools/check_wasm.js). With the shared table of the multi-threaded search the page's table (shared/mttt.js) is used
// through imports. Memory shared with JS: SQ (board), IO (the position and small values), RH (the line's earlier positions).
typedef signed char i8; typedef unsigned int u32;
#define WIN 30000
#define PASS 4096
#define MAXPLY 160
#define MAXMV 512
__attribute__((import_module("env"), import_name("poll"))) int js_poll(void);
__attribute__((import_module("env"), import_name("shget"))) int js_shget(u32 h1, u32 h2);
__attribute__((import_module("env"), import_name("shput"))) void js_shput(u32 h1, u32 h2, int d, int v, int f, int m, int ply);
void *memcpy(void *d, const void *s, unsigned long n) { char *a = d; const char *b = s; while (n--) *a++ = *b++; return d; }
void *memset(void *d, int c, unsigned long n) { char *a = d; while (n--) *a++ = (char)c; return d; }
i8 SQ[64];
int IO[32];          // in: [8] side, [9] ply, [10] h1, [11] h2, [12] free, [13] rhN; shget out: [0] d [1] f [2] v [3] m [4] ply
u32 ZT[4 * 64 + 2];  // Z1[2][64], Z2[2][64], ZS1, ZS2
u32 RH1[4096], RH2[4096];
static int rhN = 0;
// the rule (setup): homes, distances, neighbours, jumps
static int LIMIT = 40, CAP = 80, NHOME = 9;
static i8 HOME[3][64], DIST[3][64]; static int BASE[3];
static int NBR[64][8], NBRN[64], JO[64][8], JL[64][8], JN[64];
__attribute__((export_name("setup"))) void setup(int rows, int cols, int diag, int limit, int cap) {
  LIMIT = limit; CAP = cap; NHOME = 0;
  static const int DR[8] = { -1, 1, 0, 0, -1, -1, 1, 1 }, DC[8] = { 0, 0, -1, 1, -1, 1, -1, 1 };
  int nd = diag ? 8 : 4;
  for (int i = 0; i < 64; i++) {
    int r = i >> 3, c = i & 7;
    HOME[1][i] = r >= 8 - rows && c < cols; HOME[2][i] = r < rows && c >= 8 - cols; if (HOME[1][i]) NHOME++;
    int a = r, b = 7 - c, a2 = 7 - r, b2 = c;
    DIST[1][i] = (i8)(diag ? (a > b ? a : b) : a + b); DIST[2][i] = (i8)(diag ? (a2 > b2 ? a2 : b2) : a2 + b2);
    NBRN[i] = 0; JN[i] = 0;
    for (int d = 0; d < nd; d++) {
      int r1 = r + DR[d], c1 = c + DC[d], r2 = r + 2 * DR[d], c2 = c + 2 * DC[d];
      if (r1 >= 0 && r1 < 8 && c1 >= 0 && c1 < 8) NBR[i][NBRN[i]++] = r1 * 8 + c1;
      if (r2 >= 0 && r2 < 8 && c2 >= 0 && c2 < 8) { JO[i][JN[i]] = r1 * 8 + c1; JL[i][JN[i]] = r2 * 8 + c2; JN[i]++; }
    }
  }
  BASE[1] = BASE[2] = 0;
  for (int i = 0; i < 64; i++) { if (HOME[2][i]) BASE[1] += DIST[1][i]; if (HOME[1][i]) BASE[2] += DIST[2][i]; }
}
static double nodes = 0, nodeLimit = 1e300;
static int stopF = 0, useSH = 0;
static int killers[MAXPLY];
__attribute__((export_name("kclear"))) void kclear(void) { for (int i = 0; i < MAXPLY; i++) killers[i] = 0; }
__attribute__((export_name("killer"))) int killer(int ply) { return ply >= 0 && ply < MAXPLY ? killers[ply] : 0; }
__attribute__((export_name("setn"))) void setn(double n, double lim, int sh) { nodes = n; nodeLimit = lim; stopF = 0; useSH = sh; }
__attribute__((export_name("getn"))) double getn(void) { return nodes; }
__attribute__((export_name("stopped"))) int stopped(void) { return stopF; }
// the table (the former Map: keyed by h1, cleared past 600,000 entries)
#define TSZ (1 << 21)
typedef struct { u32 k, h2; int gen; short v; signed char d, f; int m, ply; } TE;
static TE T[TSZ];
static int gen = 1, tsize = 0;
__attribute__((export_name("ttclear"))) void ttclear(void) { gen++; tsize = 0; }
static TE *tfind(u32 k) { u32 i = (k * 2654435761u) & (TSZ - 1); for (;;) { TE *e = &T[i]; if (e->gen != gen) return 0; if (e->k == k) return e; i = (i + 1) & (TSZ - 1); } }
static void tset(u32 k, u32 h2, int d, int v, int f, int m, int ply) {
  if (tsize > 600000) ttclear();
  TE *e = tfind(k);
  if (!e) { u32 i = (k * 2654435761u) & (TSZ - 1); while (T[i].gen == gen) i = (i + 1) & (TSZ - 1); e = &T[i]; e->gen = gen; e->k = k; tsize++; }
  e->h2 = h2; e->d = (signed char)d; e->v = (short)v; e->f = (signed char)f; e->m = m; e->ply = ply;
}
__attribute__((export_name("ttprobe"))) int ttprobe(u32 h1, u32 h2) { TE *e = tfind(h1); if (!e || e->h2 != h2) return 0; IO[0] = e->d; IO[1] = e->f; IO[2] = e->v; IO[3] = e->m; IO[4] = e->ply; return 1; }
// ---- positions
typedef struct { i8 sq[64]; int side, ply, fr; u32 h1, h2; } P;
#define Z1(c, i) ZT[(c) * 64 + (i)]
#define Z2(c, i) ZT[128 + (c) * 64 + (i)]
static void play(P *q, const P *p, int m) {
  *q = *p;
  if (m != PASS) { int f = m % 64, t = m / 64, x = q->sq[f]; q->sq[f] = 0; q->sq[t] = (i8)x; q->h1 ^= Z1(x - 1, f) ^ Z1(x - 1, t); q->h2 ^= Z2(x - 1, f) ^ Z2(x - 1, t); }
  q->side ^= 1; q->ply++; q->h1 ^= ZT[256]; q->h2 ^= ZT[257];
}
static int stamp[64], stampN = 1; static i8 queue[64];
static int reach(P *p, int f, int *out, int n) {
  if (stampN > 2000000000) { for (int i = 0; i < 64; i++) stamp[i] = 0; stampN = 1; }
  int st = ++stampN; stamp[f] = st;
  for (int k = 0; k < NBRN[f]; k++) { int t = NBR[f][k]; if (!p->sq[t] && stamp[t] != st) { stamp[t] = st; out[n++] = f + 64 * t; } }
  int qh = 0, qt = 0; queue[qt++] = (i8)f;
  i8 own = p->sq[f]; p->sq[f] = 0;
  while (qh < qt) {
    int x = queue[qh++];
    for (int k = 0; k < JN[x]; k++) {
      int o = JO[x][k], l = JL[x][k];
      if (!p->sq[o] || p->sq[l]) continue;
      if (stamp[l] == st) continue;
      stamp[l] = st; queue[qt++] = (i8)l; out[n++] = f + 64 * l;
    }
  }
  p->sq[f] = own;
  return n;
}
static int genMoves(P *p, int *out) {
  int pl = p->side + 1, n = 0;
  for (int i = 0; i < 64; i++) if (p->sq[i] == pl) n = reach(p, i, out, n);
  if (!n && p->fr) out[n++] = PASS;
  return n;
}
static int hasMove(const P *p) {
  if (p->fr) return 1;
  int pl = p->side + 1;
  for (int i = 0; i < 64; i++) if (p->sq[i] == pl) {
    for (int k = 0; k < NBRN[i]; k++) if (!p->sq[NBR[i][k]]) return 1;
    for (int k = 0; k < JN[i]; k++) if (p->sq[JO[i][k]] && !p->sq[JL[i][k]]) return 1;
  }
  return 0;
}
static int inTarget(const P *p, int pl) { int n = 0; for (int i = 0; i < 64; i++) if (p->sq[i] == pl && HOME[3 - pl][i]) n++; return n; }
static int inHome(const P *p, int pl) { int n = 0; for (int i = 0; i < 64; i++) if (p->sq[i] == pl && HOME[pl][i]) n++; return n; }
static int done(const P *p, int pl) { return inTarget(p, pl) == NHOME; }
// terminal(): 1 = not over; else the value for the side to move (0 draw)
#define NOTOVER 99999
static int countRes(const P *p, int ply) { int a = inTarget(p, 1), b = inTarget(p, 2); if (a == b) return 0; int w = a > b ? 1 : 2; return w == p->side + 1 ? WIN - ply : -(WIN - ply); }
static int terminal(const P *p, int ply) {
  int me = p->side + 1;
  if (p->fr) { if (done(p, 1)) return 1 == me ? WIN - ply : -(WIN - ply); return NOTOVER; }
  int n = p->ply;
  if (n >= 2 && !(n & 1)) {
    int wd = done(p, 1), bd = done(p, 2);
    if (wd && bd) return 0;
    if (wd) return 1 == me ? WIN - ply : -(WIN - ply);
    if (bd) return 2 == me ? WIN - ply : -(WIN - ply);
    if (n == 2 * LIMIT) {
      int sw = inHome(p, 1) > 0, sb = inHome(p, 2) > 0;
      if (sw && sb) return 0;
      if (sw) return 2 == me ? WIN - ply : -(WIN - ply);
      if (sb) return 1 == me ? WIN - ply : -(WIN - ply);
    }
    if (n >= 2 * CAP) return countRes(p, ply);
  }
  if (!hasMove(p)) return countRes(p, ply);
  return NOTOVER;
}
static int sideScore(const P *p, int pl) {
  int s = 0, mx = 0, home = 0, n = 0, inT = 0;
  for (int i = 0; i < 64; i++) if (p->sq[i] == pl) { int d = DIST[pl][i]; s += d; if (d > mx) mx = d; n++; if (HOME[pl][i]) home++; if (HOME[3 - pl][i]) inT++; }
  int v = -(s - BASE[pl]) * 34 - mx * 9;
  int mvs = pl == 1 ? (p->ply + 1) >> 1 : p->ply >> 1;
  if (home) { int k = mvs - (LIMIT - 14); if (k < 0) k = 0; v -= home * (12 + k * k * 6); }
  if (inT >= n - 2 && inT < n) v -= 20;
  return v;
}
static int evaluate(const P *p) { int me = p->side + 1; return sideScore(p, me) - sideScore(p, 3 - me) + 18; }
static int seenBefore(u32 h1, u32 h2) { for (int i = 0; i < rhN; i++) if (RH1[i] == h1 && RH2[i] == h2) return 1; return 0; }
static double OSC[MAXMV];
static void orderMoves(const P *p, int *L, int n, int ttm, int ply) {
  int pl = p->side + 1, k = (ply >= 0 && ply < MAXPLY && killers[ply]) ? killers[ply] : -1;
  int out[MAXMV];
  for (int i = 0; i < n; i++) {
    int m = L[i]; double v;
    if (m == ttm) v = 1e9; else if (m == k) v = 1e8;
    else if (m == PASS) v = __builtin_nan("");   // (the JS reads past its tables: NaN, which never moves in the sort)
    else { int f = m % 64, t = m / 64; v = (DIST[pl][f] - DIST[pl][t]) * 100 + (HOME[3 - pl][t] ? 30 : 0) - (HOME[pl][f] ? -15 : 0); }
    int j = i; while (j > 0 && OSC[j - 1] < v) { OSC[j] = OSC[j - 1]; out[j] = out[j - 1]; j--; }
    OSC[j] = v; out[j] = m;
  }
  for (int i = 0; i < n; i++) L[i] = out[i];
}
static P ST[MAXPLY + 2];
static int search(P *p, int d, int a, int b, int ply) {
  nodes += 1;
  if ((((long long)nodes) & 1023) == 0 && (js_poll() || nodes > nodeLimit)) stopF = 1;
  if (stopF) return 0;
  int tv = terminal(p, ply); if (tv != NOTOVER) return tv;
  int hit = 0, ed = 0, ef = 0, ev = 0, em = -1, eply = 0;
  if (useSH) { if (js_shget(p->h1, p->h2)) { hit = 1; ed = IO[0]; ef = IO[1]; ev = IO[2]; em = IO[3]; eply = IO[4]; } }
  else { TE *e = tfind(p->h1); if (e && e->h2 == p->h2) { hit = 1; ed = e->d; ef = e->f; ev = e->v; em = e->m; eply = e->ply; } }
  if (ply > 0 && seenBefore(p->h1, p->h2)) return 0;
  if (hit && ed >= d && eply == p->ply) {
    if (ef == 0) return ev; if (ef == 1 && ev >= b) return ev; if (ef == 2 && ev <= a) return ev;
  }
  if (d <= 0) return evaluate(p);
  int L[MAXMV], n = genMoves(p, L);
  orderMoves(p, L, n, hit ? em : -1, ply);
  int best = 0, any = 0, bm = n ? L[0] : 0, a0 = a;
  RH1[rhN] = p->h1; RH2[rhN] = p->h2; rhN++;
  P *q = &ST[ply + 1 < MAXPLY ? ply + 1 : MAXPLY];
  for (int i = 0; i < n; i++) {
    int m = L[i]; play(q, p, m);
    int v;
    if (i == 0) v = -search(q, d - 1, -b, -a, ply + 1);
    else {
      int red = (d >= 3 && i >= 6) ? 1 : 0;
      v = -search(q, d - 1 - red, -a - 1, -a, ply + 1);
      if (v > a && (red || v < b)) v = -search(q, d - 1, -b, -a, ply + 1);
    }
    if (stopF) { rhN--; return any ? best : 0; }
    if (!any || v > best) { best = v; any = 1; bm = m; if (v > a) { a = v; if (a >= b) { if (ply >= 0 && ply < MAXPLY) killers[ply] = m; break; } } }
  }
  rhN--;
  if (!any) return -2147483647;   // (no move: the JS gives −Infinity; never reached — terminal() covers a side without moves)
  int fl = best <= a0 ? 2 : best >= b ? 1 : 0;
  if (useSH) js_shput(p->h1, p->h2, d, best, fl, bm, p->ply); else tset(p->h1, p->h2, d, best, fl, bm, p->ply);
  return best;
}
__attribute__((export_name("search"))) int csearch(int d, int a, int b, int ply) {
  P *p = &ST[0];
  for (int i = 0; i < 64; i++) p->sq[i] = SQ[i];
  p->side = IO[8]; p->ply = IO[9]; p->h1 = (u32)IO[10]; p->h2 = (u32)IO[11]; p->fr = IO[12]; rhN = IO[13];
  return search(p, d, a, b, ply);
}
__attribute__((export_name("sqp"))) i8 *sqp(void) { return SQ; }
__attribute__((export_name("ztp"))) u32 *ztp(void) { return ZT; }
__attribute__((export_name("iop"))) int *iop(void) { return IO; }
__attribute__((export_name("rh1p"))) u32 *rh1p(void) { return RH1; }
__attribute__((export_name("rh2p"))) u32 *rh2p(void) { return RH2; }
