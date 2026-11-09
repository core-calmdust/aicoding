// Agon — the search in WebAssembly (tools/build-core.sh → core-wasm.js). The same algorithm, move order, table, repetition
// rule, quiescence and counters as search() / qsearch() / orderMoves() / evaluate() / terminal() in engine.js: the one-thread
// results are identical (tools/check_wasm.js). With the shared table of the multi-threaded search the page's table
// (shared/mttt.js) is used through imports. Memory shared with JS: the geometry and keys (setup), the position, RH (the line).
typedef signed char i8; typedef unsigned int u32;
#define WIN 30000
#define N 91
#define RES 91
#define PASS (92 * 92)
#define CENTER_ IDXC
#define MAXPLY 160
#define MAXMV 256
__attribute__((import_module("env"), import_name("poll"))) int js_poll(void);
__attribute__((import_module("env"), import_name("shget"))) int js_shget(u32 h1, u32 h2);
__attribute__((import_module("env"), import_name("shput"))) void js_shput(u32 h1, u32 h2, int d, int v, int f, int m, int rs);
void *memcpy(void *d, const void *s, unsigned long n) { char *a = d; const char *b = s; while (n--) *a++ = *b++; return d; }
void *memset(void *d, int c, unsigned long n) { char *a = d; while (n--) *a++ = (char)c; return d; }
// filled by the page (setup): NB[91][6], RING[91], OUTERL[30], INNERL[6], CENTER; keys Z1[5][91] Z2[5][91] ZC1 ZC2 [91] ZR1 ZR2 [16] ZS1 ZS2
int GEO[N * 6 + N + 30 + 6 + 1];
u32 ZT[5 * N * 2 + N * 2 + 32 + 2];
i8 SQ[N], CAP[N];
int IO[32];   // in: [8] side [9] ply [10] h1 [11] h2 [12] free [13] rhN [14] res1 [15] res2 [16] rootSide [17] cap (rule); out (shget): [0] d [1] f [2] v [3] m [4] rs
u32 RH1[4096], RH2[4096];
static int rhN = 0, rootSide = 0, RCAP = 300;
static int NB[N][6], RING[N], OUTERL[30], INNERL[6], IDXC;
#define Z1(k, i) ZT[(k) * N + (i)]
#define Z2(k, i) ZT[5 * N + (k) * N + (i)]
#define ZC1(i) ZT[10 * N + (i)]
#define ZC2(i) ZT[11 * N + (i)]
#define ZR1(i) ZT[12 * N + (i)]
#define ZR2(i) ZT[12 * N + 16 + (i)]
#define ZS1 ZT[12 * N + 32]
#define ZS2 ZT[12 * N + 33]
__attribute__((export_name("setup"))) void setup(void) {
  int k = 0;
  for (int i = 0; i < N; i++) for (int d = 0; d < 6; d++) NB[i][d] = GEO[k++];
  for (int i = 0; i < N; i++) RING[i] = GEO[k++];
  for (int i = 0; i < 30; i++) OUTERL[i] = GEO[k++];
  for (int i = 0; i < 6; i++) INNERL[i] = GEO[k++];
  IDXC = GEO[k++];
}
static double nodes = 0, nodeLimit = 1e300;
static int stopF = 0, useSH = 0;
static int killers[MAXPLY];
__attribute__((export_name("kclear"))) void kclear(void) { for (int i = 0; i < MAXPLY; i++) killers[i] = 0; }
__attribute__((export_name("killer"))) int killer(int ply) { return ply >= 0 && ply < MAXPLY ? killers[ply] : 0; }
__attribute__((export_name("setn"))) void setn(double n, double lim, int sh) { nodes = n; nodeLimit = lim; stopF = 0; useSH = sh; }
__attribute__((export_name("getn"))) double getn(void) { return nodes; }
__attribute__((export_name("stopped"))) int stopped(void) { return stopF; }
#define TSZ (1 << 21)
typedef struct { u32 k, h2; int gen; short v; signed char d, f; int m, rs; } TE;
static TE T[TSZ];
static int gen = 1, tsize = 0;
__attribute__((export_name("ttclear"))) void ttclear(void) { gen++; tsize = 0; }
static TE *tfind(u32 k) { u32 i = (k * 2654435761u) & (TSZ - 1); for (;;) { TE *e = &T[i]; if (e->gen != gen) return 0; if (e->k == k) return e; i = (i + 1) & (TSZ - 1); } }
static void tset(u32 k, u32 h2, int d, int v, int f, int m, int rs) {
  if (tsize > 600000) ttclear();
  TE *e = tfind(k);
  if (!e) { u32 i = (k * 2654435761u) & (TSZ - 1); while (T[i].gen == gen) i = (i + 1) & (TSZ - 1); e = &T[i]; e->gen = gen; e->k = k; tsize++; }
  e->h2 = h2; e->d = (signed char)d; e->v = (short)v; e->f = (signed char)f; e->m = m; e->rs = rs;
}
__attribute__((export_name("ttprobe"))) int ttprobe(u32 h1, u32 h2) { TE *e = tfind(h1); if (!e || e->h2 != h2) return 0; IO[0] = e->d; IO[1] = e->f; IO[2] = e->v; IO[3] = e->m; IO[4] = e->rs; return 1; }
// ---- positions
typedef struct { i8 sq[N], cap[N]; int res[3], side, ply, fr; u32 h1, h2; } P;
static inline int own(int x) { return x ? (x <= 2 ? 1 : 2) : 0; }
static inline int isQ(int x) { return x == 2 || x == 4; }
static int trapped(const P *p, int t, int pl) {
  int o = 3 - pl;
  for (int d = 0; d < 3; d++) { int a = NB[t][d], b = NB[t][d + 3]; if (a >= 0 && b >= 0 && own(p->sq[a]) == o && own(p->sq[b]) == o) return 1; }
  return 0;
}
static int pending(const P *p, int pl, int *out) {   // queen first, then guards in index order
  int n = 0, q = -1;
  for (int i = 0; i < N; i++) if (p->cap[i] && own(p->sq[i]) == pl) { if (isQ(p->sq[i])) q = i; else out[n++] = i; }
  if (q >= 0) { for (int j = n; j > 0; j--) out[j] = out[j - 1]; out[0] = q; n++; }
  return n;
}
static int genMoves(const P *p, int *out) {
  int pl = p->side + 1, n = 0;
  if (p->res[pl] > 0) {
    for (int t = 0; t < N; t++) if (!p->sq[t] && t != IDXC && !trapped(p, t, pl)) out[n++] = RES + 92 * t;
    if (!n) for (int t = 0; t < N; t++) if (!p->sq[t] && t != IDXC) out[n++] = RES + 92 * t;
    return n;
  }
  int pd[N], np = pending(p, pl, pd);
  if (np) {
    int qd = isQ(p->sq[pd[0]]), nl = qd ? 1 : np;
    for (int li = 0; li < nl; li++) {
      int f = pd[li], any = 0;
      if (!qd) { for (int j = 0; j < 30; j++) { int t = OUTERL[j]; if (!p->sq[t] && t != IDXC && !trapped(p, t, pl)) { out[n++] = f + 92 * t; any = 1; } } }
      else { for (int t = 0; t < N; t++) if (!p->sq[t] && t != IDXC && !trapped(p, t, pl)) { out[n++] = f + 92 * t; any = 1; } }
      if (!any) {
        if (!qd) { for (int j = 0; j < 30; j++) { int t = OUTERL[j]; if (!p->sq[t]) out[n++] = f + 92 * t; } }
        else for (int t = 0; t < N; t++) if (!p->sq[t] && t != IDXC) out[n++] = f + 92 * t;
      }
    }
    if (!n) out[n++] = PASS;
    return n;
  }
  for (int f = 0; f < N; f++) {
    int x = p->sq[f]; if (own(x) != pl) continue;
    int rf = RING[f], q = isQ(x);
    for (int d = 0; d < 6; d++) {
      int t = NB[f][d];
      if (t < 0 || p->sq[t] || RING[t] > rf || (t == IDXC && !q)) continue;
      if (trapped(p, t, pl)) continue;
      out[n++] = f + 92 * t;
    }
  }
  if (!n) out[n++] = PASS;
  return n;
}
static int capsOf(const P *p, int m, int *out) {
  if (m == PASS) return 0;
  int f = m % 92, t = m / 92;
  if (f == RES || p->cap[f]) return 0;
  int pl = own(p->sq[f]), o = 3 - pl, n = 0;
  for (int d = 0; d < 6; d++) { int a = NB[t][d]; if (a < 0 || own(p->sq[a]) != o || p->cap[a]) continue; int b = NB[a][d]; if (b >= 0 && b != f && own(p->sq[b]) == pl) out[n++] = a; }
  return n;
}
static void play(P *q, const P *p, int m) {
  *q = *p;
  int pl = q->side + 1;
  if (m != PASS) {
    int f = m % 92, t = m / 92;
    if (f == RES) {
      int x = pl == 1 ? 1 : 3; q->sq[t] = (i8)x; q->h1 ^= Z1(x, t); q->h2 ^= Z2(x, t);
      int k = pl == 1 ? 0 : 8; q->h1 ^= ZR1(k + q->res[pl]) ^ ZR1(k + q->res[pl] - 1); q->h2 ^= ZR2(k + q->res[pl]) ^ ZR2(k + q->res[pl] - 1);
      q->res[pl]--;
    } else {
      int x = q->sq[f], wasCap = q->cap[f], cs[6], nc = wasCap ? 0 : capsOf(q, m, cs);
      q->sq[f] = 0; q->sq[t] = (i8)x; q->h1 ^= Z1(x, f) ^ Z1(x, t); q->h2 ^= Z2(x, f) ^ Z2(x, t);
      if (wasCap) { q->cap[f] = 0; q->h1 ^= ZC1(f); q->h2 ^= ZC2(f); }
      else for (int j = 0; j < nc; j++) { int a = cs[j]; q->cap[a] = 1; q->h1 ^= ZC1(a); q->h2 ^= ZC2(a); }
    }
  }
  q->side ^= 1; q->ply++; q->h1 ^= ZS1; q->h2 ^= ZS2;
}
static int ringCount(const P *p, int pl) { int g = pl == 1 ? 1 : 3, n = 0; for (int j = 0; j < 6; j++) { int i = INNERL[j]; if (p->sq[i] == g && !p->cap[i]) n++; } return n; }
static int onThrone(const P *p, int pl) { return p->sq[IDXC] == (pl == 1 ? 2 : 4) && !p->cap[IDXC]; }
static int drawV(const P *p) { return p->side == rootSide ? -30 : 30; }
#define NOTOVER 99999
static int terminal(const P *p, int ply) {
  int mover = p->side ? 1 : 2, me = p->side + 1;
  for (int k = 0; k < 2; k++) {
    int pl = k ? 3 - mover : mover;
    if (ringCount(p, pl) == 6) { int w = onThrone(p, pl) ? pl : 3 - pl; return w == me ? WIN - ply : -(WIN - ply); }
  }
  if (p->fr) return NOTOVER;
  if (p->ply >= RCAP) return drawV(p);
  return NOTOVER;
}
static int sideScore(const P *p, int pl) {
  int o = 3 - pl, G = pl == 1 ? 1 : 3, QK = G + 1, v = 0, ringG = 0;
  for (int i = 0; i < N; i++) {
    int x = p->sq[i]; if (own(x) != pl) continue;
    if (x == QK) { v -= p->cap[i] ? 80 + RING[i] * 20 : RING[i] * 110; if (i == IDXC && !p->cap[i]) v += 260; }
    else { if (p->cap[i]) v -= 120 + 4 * 100; else { v -= (RING[i] - 1) * 100; if (RING[i] == 1) ringG++; } }
  }
  v -= p->res[pl] * 380;
  v += ringG * 40;
  for (int j = 0; j < 6; j++) { int i = INNERL[j]; if (own(p->sq[i]) == o && !p->cap[i]) v -= 180; }
  if (own(p->sq[IDXC]) == o && !p->cap[IDXC]) v -= 330;
  if (ringG >= 5 && !onThrone(p, pl)) v -= 120;
  return v;
}
static int HSEEN[256], hStamp = 0;
static int hangN(const P *p, int pl) {
  int o = 3 - pl, n = 0;
  if (++hStamp > 2000000000) { for (int i = 0; i < 256; i++) HSEEN[i] = 0; hStamp = 1; }
  int st = hStamp;
  for (int f = 0; f < N; f++) {
    if (own(p->sq[f]) != o || p->cap[f]) continue;
    int rf = RING[f], qf = isQ(p->sq[f]);
    for (int d = 0; d < 6; d++) {
      int t = NB[f][d]; if (t < 0 || p->sq[t] || RING[t] > rf || (t == IDXC && !qf)) continue;
      if (trapped(p, t, o)) continue;
      for (int e = 0; e < 6; e++) { int a = NB[t][e]; if (a < 0 || own(p->sq[a]) != pl || p->cap[a] || HSEEN[a] == st) continue; int b = NB[a][e]; if (b >= 0 && b != f && own(p->sq[b]) == o) { HSEEN[a] = st; n++; } }
    }
  }
  return n;
}
static int evaluate(const P *p) {
  int me = p->side + 1, op = 3 - me;
  int v = sideScore(p, me) - sideScore(p, op) + 40;
  if (!(p->res[1] + p->res[2] > 0)) {
    int hn = hangN(p, me); if (hn > 1) v -= (hn - 1) * 70 * 2;
    int gn = hangN(p, op); if (gn) v += 35;
  }
  return v;
}
static int isMovePhase(const P *p) { int pl = p->side + 1; if (p->res[pl] > 0) return 0; for (int i = 0; i < N; i++) if (p->cap[i] && own(p->sq[i]) == pl) return 0; return 1; }
static int seenBefore(u32 h1, u32 h2) { for (int i = 0; i < rhN; i++) if (RH1[i] == h1 && RH2[i] == h2) return 1; return 0; }
static double moveScore(const P *p, int m, int ttm, int k) {
  if (m == ttm) return 1e9; if (m == k) return 1e8; if (m == PASS) return -1e6;
  int f = m % 92, t = m / 92;
  if (f == RES || p->cap[f]) return 1000 - RING[t] * 10;
  int cs[6], nc = capsOf(p, m, cs);
  int s = (RING[f] - RING[t]) * 120 + nc * 900;
  if (t == IDXC) s += 800;
  if (RING[t] == 1) s += 60;
  return s;
}
static double OSC[MAXMV];
static void orderMoves(const P *p, int *L, int n, int ttm, int ply) {
  int k = (ply >= 0 && ply < MAXPLY && killers[ply]) ? killers[ply] : -1, out[MAXMV];
  for (int i = 0; i < n; i++) {
    int m = L[i]; double v = moveScore(p, m, ttm, k);
    int j = i; while (j > 0 && OSC[j - 1] < v) { OSC[j] = OSC[j - 1]; out[j] = out[j - 1]; j--; }
    OSC[j] = v; out[j] = m;
  }
  for (int i = 0; i < n; i++) L[i] = out[i];
}
static P ST[MAXPLY + 2];
static inline P *slot(int ply) { return &ST[ply < MAXPLY ? ply : MAXPLY]; }
static int qsearch(const P *p, int a, int b, int ply, int qd) {
  nodes += 1;
  if ((((long long)nodes) & 1023) == 0 && (js_poll() || nodes > nodeLimit)) stopF = 1;
  int tv = terminal(p, ply); if (tv != NOTOVER) return tv;
  int stand = evaluate(p);
  if (qd <= 0 || !isMovePhase(p)) return stand;
  if (stand >= b) return stand;
  if (stand > a) a = stand;
  int best = stand, L[MAXMV], n = genMoves(p, L), cs[6];
  for (int i = 0; i < n; i++) {
    int m = L[i];
    if (m == PASS || !capsOf(p, m, cs)) continue;
    P *q = slot(ply + 1); play(q, p, m);
    int v = -qsearch(q, -b, -a, ply + 1, qd - 1);
    if (stopF) return best;
    if (v > best) { best = v; if (v > a) { a = v; if (a >= b) break; } }
  }
  return best;
}
static int search(const P *p, int d, int a, int b, int ply) {
  nodes += 1;
  if ((((long long)nodes) & 1023) == 0 && (js_poll() || nodes > nodeLimit)) stopF = 1;
  if (stopF) return 0;
  int tv = terminal(p, ply); if (tv != NOTOVER) return tv;
  if (ply > 0 && seenBefore(p->h1, p->h2)) return drawV(p);
  int hit = 0, ed = 0, ef = 0, ev = 0, em = -1, ers = 0;
  if (useSH) { if (js_shget(p->h1, p->h2)) { hit = 1; ed = IO[0]; ef = IO[1]; ev = IO[2]; em = IO[3]; ers = IO[4]; } }
  else { TE *e = tfind(p->h1); if (e && e->h2 == p->h2) { hit = 1; ed = e->d; ef = e->f; ev = e->v; em = e->m; ers = e->rs; } }
  if (hit && ed >= d && ers == rootSide) {
    if (ef == 0) return ev; if (ef == 1 && ev >= b) return ev; if (ef == 2 && ev <= a) return ev;
  }
  if (d <= 0) return qsearch(p, a, b, ply, 3);
  int L[MAXMV], n = genMoves(p, L);
  orderMoves(p, L, n, hit ? em : -1, ply);
  int best = 0, any = 0, bm = L[0], a0 = a;
  RH1[rhN] = p->h1; RH2[rhN] = p->h2; rhN++;
  for (int i = 0; i < n; i++) {
    int m = L[i]; P *q = slot(ply + 1); play(q, p, m);
    int v;
    if (i == 0) v = -search(q, d - 1, -b, -a, ply + 1);
    else {
      int red = (d >= 3 && i >= 8) ? 1 : 0;
      v = -search(q, d - 1 - red, -a - 1, -a, ply + 1);
      if (v > a && (red || v < b)) { play(q, p, m); v = -search(q, d - 1, -b, -a, ply + 1); }
    }
    if (stopF) { rhN--; return any ? best : 0; }
    if (!any || v > best) { best = v; any = 1; bm = m; if (v > a) { a = v; if (a >= b) { if (ply >= 0 && ply < MAXPLY) killers[ply] = m; break; } } }
  }
  rhN--;
  int fl = best <= a0 ? 2 : best >= b ? 1 : 0;
  if (useSH) js_shput(p->h1, p->h2, d, best, fl, bm, rootSide); else tset(p->h1, p->h2, d, best, fl, bm, rootSide);
  return best;
}
static P ROOTP;
__attribute__((export_name("search"))) int csearch(int d, int a, int b, int ply) {
  P *p = &ROOTP;
  for (int i = 0; i < N; i++) { p->sq[i] = SQ[i]; p->cap[i] = CAP[i]; }
  p->side = IO[8]; p->ply = IO[9]; p->h1 = (u32)IO[10]; p->h2 = (u32)IO[11]; p->fr = IO[12]; rhN = IO[13];
  p->res[0] = 0; p->res[1] = IO[14]; p->res[2] = IO[15]; rootSide = IO[16]; RCAP = IO[17];
  return search(p, d, a, b, ply);
}
__attribute__((export_name("sqp"))) i8 *sqp(void) { return SQ; }
__attribute__((export_name("capp"))) i8 *capp(void) { return CAP; }
__attribute__((export_name("ztp"))) u32 *ztp(void) { return ZT; }
__attribute__((export_name("geop"))) int *geop(void) { return GEO; }
__attribute__((export_name("iop"))) int *iop(void) { return IO; }
__attribute__((export_name("rh1p"))) u32 *rh1p(void) { return RH1; }
__attribute__((export_name("rh2p"))) u32 *rh2p(void) { return RH2; }
