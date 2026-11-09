// Kōnane — the search in WebAssembly (tools/build-core.sh → core-wasm.js). The same algorithm, move order, table and
// counters as search() / orderMoves() / evaluate() in engine.js, so the one-thread results are identical (tools/check_wasm.js).
// The table: the one-thread worker's own (the same rules as its former Map: keyed by h1, cleared past 700,000 entries);
// with the shared table of the multi-threaded search (shared/mttt.js) the page's table is used through imports.
// Memory shared with JS: SQ (the board), ZT (zobrist: Z1[2][100], Z2[2][100], ZS1, ZS2), IO (small values both ways).
typedef signed char i8; typedef unsigned int u32;
#define WIN 30000
#define WINT 29000
#define MAXN 100
#define MAXPLY 128
#define MAXMV 512
__attribute__((import_module("env"), import_name("poll"))) int js_poll(void);
__attribute__((import_module("env"), import_name("shget"))) int js_shget(u32 h1, u32 h2);
__attribute__((import_module("env"), import_name("shput"))) void js_shput(u32 h1, u32 h2, int d, int v, int f, int m);
void *memcpy(void *d, const void *s, unsigned long n) { char *a = d; const char *b = s; while (n--) *a++ = *b++; return d; }
void *memset(void *d, int c, unsigned long n) { char *a = d; while (n--) *a++ = (char)c; return d; }
i8 SQ[MAXN];
u32 ZT[4 * MAXN + 2];
int IO[16];   // shget answers d f v m in IO[0..3]
static int N = 8, NN = 64;
static int RAY[MAXN][4][10], RAYN[MAXN][4], ADJ[MAXN][4], ADJN[MAXN], OPEN1[8], NOPEN1 = 0;
static int COLOR[MAXN];
static double nodes = 0, nodeLimit = 1e300;
static int stopF = 0, useSH = 0;
static int killers[MAXPLY];
// the table
#define TSZ (1 << 21)
typedef struct { u32 k, h2; int gen; short v; signed char d, f; int m; } TE;
static TE T[TSZ];
static int gen = 1, tsize = 0;
__attribute__((export_name("ttclear"))) void ttclear(void) { gen++; tsize = 0; }
static TE *tfind(u32 k) { u32 i = (k * 2654435761u) & (TSZ - 1); for (;;) { TE *e = &T[i]; if (e->gen != gen) return 0; if (e->k == k) return e; i = (i + 1) & (TSZ - 1); } }
static void tset(u32 k, u32 h2, int d, int v, int f, int m) {
  if (tsize > 700000) ttclear();   // (as the Map: checked before every store)
  TE *e = tfind(k);
  if (!e) {
    u32 i = (k * 2654435761u) & (TSZ - 1); while (T[i].gen == gen) i = (i + 1) & (TSZ - 1);
    e = &T[i]; e->gen = gen; e->k = k; tsize++;
  }
  e->h2 = h2; e->d = (signed char)d; e->v = (short)v; e->f = (signed char)f; e->m = m;
}
// IO[0..4] = found, d, f, v, m — the page reads it (mtKids / mtLazy ordering)
__attribute__((export_name("ttprobe"))) int ttprobe(u32 h1, u32 h2) { TE *e = tfind(h1); if (!e || e->h2 != h2) return 0; IO[0] = e->d; IO[1] = e->f; IO[2] = e->v; IO[3] = e->m; return 1; }
__attribute__((export_name("setup"))) void setup(int n) {
  N = n; NN = n * n; NOPEN1 = 0;
  static const int DR[4] = { -1, 1, 0, 0 }, DC[4] = { 0, 0, -1, 1 };
  for (int i = 0; i < NN; i++) {
    int r = i / N, c = i % N; ADJN[i] = 0;
    COLOR[i] = ((r + c) & 1) == ((N - 1) & 1) ? 1 : 2;
    for (int d = 0; d < 4; d++) {
      int k = 0, rr = r + DR[d], cc = c + DC[d];
      while (rr >= 0 && rr < N && cc >= 0 && cc < N) { RAY[i][d][k++] = rr * N + cc; rr += DR[d]; cc += DC[d]; }
      RAYN[i][d] = k; if (k) ADJ[i][ADJN[i]++] = RAY[i][d][0];
    }
  }
  int h = N / 2, cand[8] = { 0, N - 1, NN - N, NN - 1, (h - 1) * N + h - 1, (h - 1) * N + h, h * N + h - 1, h * N + h };
  for (int j = 0; j < 8; j++) if (COLOR[cand[j]] == 1) OPEN1[NOPEN1++] = cand[j];
  for (int a = 1; a < NOPEN1; a++) { int x = OPEN1[a], b = a; while (b > 0 && OPEN1[b - 1] > x) { OPEN1[b] = OPEN1[b - 1]; b--; } OPEN1[b] = x; }
}
__attribute__((export_name("kclear"))) void kclear(void) { for (int i = 0; i < MAXPLY; i++) killers[i] = 0; }
__attribute__((export_name("killer"))) int killer(int ply) { return ply >= 0 && ply < MAXPLY ? killers[ply] : 0; }
__attribute__((export_name("setn"))) void setn(double n, double lim, int sh) { nodes = n; nodeLimit = lim; stopF = 0; useSH = sh; }
__attribute__((export_name("getn"))) double getn(void) { return nodes; }
__attribute__((export_name("stopped"))) int stopped(void) { return stopF; }
// ---- a position: the board, the side (0 Black, 1 White), plies played, the two hash halves
typedef struct { i8 sq[MAXN]; int side, ply; u32 h1, h2; } P;
static P ST[MAXPLY + 2];
#define Z1(c, i) ZT[(c) * MAXN + (i)]
#define Z2(c, i) ZT[2 * MAXN + (c) * MAXN + (i)]
#define ZS1 ZT[4 * MAXN]
#define ZS2 ZT[4 * MAXN + 1]
static int jumpsOf(const P *p, int pl, int *out, int n) {
  int o = 3 - pl;
  for (int f = 0; f < NN; f++) {
    if (p->sq[f] != pl) continue;
    for (int d = 0; d < 4; d++) { int *ray = RAY[f][d], L = RAYN[f][d]; for (int k = 1; k < L; k += 2) { if (p->sq[ray[k - 1]] != o || p->sq[ray[k]]) break; out[n++] = f + 128 * ray[k]; } }
  }
  return n;
}
static int mobility(const P *p, int pl) {
  int o = 3 - pl, n = 0;
  for (int f = 0; f < NN; f++) {
    if (p->sq[f] != pl) continue;
    for (int d = 0; d < 4; d++) { int *ray = RAY[f][d], L = RAYN[f][d]; for (int k = 1; k < L; k += 2) { if (p->sq[ray[k - 1]] != o || p->sq[ray[k]]) break; n++; } }
  }
  return n;
}
static int movers(const P *p, int pl) {
  int o = 3 - pl, n = 0;
  for (int f = 0; f < NN; f++) {
    if (p->sq[f] != pl) continue;
    for (int d = 0; d < 4; d++) { int *ray = RAY[f][d]; if (RAYN[f][d] > 1 && p->sq[ray[0]] == o && !p->sq[ray[1]]) { n++; break; } }
  }
  return n;
}
static int genMoves(const P *p, int *out) {
  if (p->ply == 0) {
    int empty = 0; for (int i = 0; i < NN; i++) if (!p->sq[i]) empty++;
    if (empty == 0) { for (int j = 0; j < NOPEN1; j++) out[j] = OPEN1[j] + 128 * OPEN1[j]; return NOPEN1; }
    return jumpsOf(p, 1, out, 0);
  }
  if (p->ply == 1) {
    int ne = 0, e0 = -1; for (int i = 0; i < NN; i++) if (!p->sq[i]) { ne++; e0 = i; }
    if (ne == 1) {
      int tmp[4], n = 0;
      for (int j = 0; j < ADJN[e0]; j++) if (p->sq[ADJ[e0][j]] == 2) tmp[n++] = ADJ[e0][j];
      for (int a = 1; a < n; a++) { int x = tmp[a], b = a; while (b > 0 && tmp[b - 1] > x) { tmp[b] = tmp[b - 1]; b--; } tmp[b] = x; }
      for (int j = 0; j < n; j++) out[j] = tmp[j] + 128 * tmp[j];
      return n;
    }
  }
  return jumpsOf(p, p->side + 1, out, 0);
}
static int dirOf(int f, int t) { int r0 = f / N, c0 = f % N, r1 = t / N, c1 = t % N; return c0 == c1 ? (r1 < r0 ? 0 : 1) : (c1 < c0 ? 2 : 3); }
static void play(P *q, const P *p, int m) {
  *q = *p;
  int f = m % 128, t = m / 128, x = q->sq[f];
  if (f == t) { q->sq[f] = 0; q->h1 ^= Z1(x - 1, f); q->h2 ^= Z2(x - 1, f); }
  else {
    int d = dirOf(f, t), *ray = RAY[f][d], L = RAYN[f][d];
    for (int k = 0; k < L; k += 2) {
      int o = ray[k], y = q->sq[o]; q->sq[o] = 0;
      if (y) { q->h1 ^= Z1(y - 1, o); q->h2 ^= Z2(y - 1, o); }
      if (k + 1 < L && ray[k + 1] == t) break;
    }
    q->sq[f] = 0; q->sq[t] = (i8)x;
    q->h1 ^= Z1(x - 1, f) ^ Z1(x - 1, t); q->h2 ^= Z2(x - 1, f) ^ Z2(x - 1, t);
  }
  q->side ^= 1; q->ply++;
  q->h1 ^= ZS1; q->h2 ^= ZS2;
}
static int hops(int m) { int f = m % 128, t = m / 128; if (f == t) return 0; int dr = f / N - t / N, dc = f % N - t % N; if (dr < 0) dr = -dr; if (dc < 0) dc = -dc; return (dr + dc) >> 1; }
static int evaluate(const P *p) {
  if (p->ply < 2) return 0;
  int me = p->side + 1, op = 3 - me;
  int a = mobility(p, me), b = mobility(p, op), pa = movers(p, me), pb = movers(p, op);
  if (!a) return -WIN + 1;
  return (a - b) * 34 + (pa - pb) * 52 + 30;
}
static P OP;   // (orderMoves' scratch child)
static double OSC[MAXMV];
static void orderMoves(const P *p, int *L, int n, int ttm, int ply) {
  if (n < 2) return;
  int k = (ply >= 0 && ply < MAXPLY && killers[ply]) ? killers[ply] : -1, me = p->side + 1, op = 3 - me;
  int out[MAXMV];
  for (int i = 0; i < n; i++) {
    int m = L[i]; double v;
    if (m == ttm) v = 1e9; else if (m == k) v = 1e8; else { play(&OP, p, m); v = -mobility(&OP, op) * 10 + mobility(&OP, me) * 6 + hops(m); }
    int j = i; while (j > 0 && OSC[j - 1] < v) { OSC[j] = OSC[j - 1]; out[j] = out[j - 1]; j--; }
    OSC[j] = v; out[j] = m;
  }
  for (int i = 0; i < n; i++) L[i] = out[i];
}
static int search(P *p, int d, int a, int b, int ply) {
  nodes += 1;
  if ((((long long)nodes) & 1023) == 0 && (js_poll() || nodes > nodeLimit)) stopF = 1;
  if (stopF) return 0;
  int hit = 0, ed = 0, ef = 0, ev = 0, em = -1;
  if (useSH) { if (js_shget(p->h1, p->h2)) { hit = 1; ed = IO[0]; ef = IO[1]; ev = IO[2]; em = IO[3]; } }
  else { TE *e = tfind(p->h1); if (e && e->h2 == p->h2) { hit = 1; ed = e->d; ef = e->f; ev = e->v; em = e->m; } }
  if (hit && ed >= d) {
    int v = ev > WINT ? ev - ply : ev < -WINT ? ev + ply : ev;
    if (ef == 0) return v; if (ef == 1 && v >= b) return v; if (ef == 2 && v <= a) return v;
  }
  int L[MAXMV], n = genMoves(p, L);
  if (!n) return -(WIN - ply);
  if (d <= 0) return evaluate(p);
  orderMoves(p, L, n, hit ? em : -1, ply);
  int best = -2000000000, bm = L[0], a0 = a, any = 0;
  P *q = &ST[ply + 1 < MAXPLY ? ply + 1 : MAXPLY];
  for (int i = 0; i < n; i++) {
    int m = L[i]; play(q, p, m);
    int v;
    if (i == 0) v = -search(q, d - 1, -b, -a, ply + 1);
    else {
      int red = (d >= 3 && i >= 5) ? 1 : 0;
      v = -search(q, d - 1 - red, -a - 1, -a, ply + 1);
      if (v > a && (red || v < b)) { play(q, p, m); v = -search(q, d - 1, -b, -a, ply + 1); }
    }
    if (stopF) return any ? best : 0;
    if (v > best) { best = v; any = 1; bm = m; if (v > a) { a = v; if (a >= b) { if (ply >= 0 && ply < MAXPLY) killers[ply] = m; break; } } }
  }
  int sv = best > WINT ? best + ply : best < -WINT ? best - ply : best;
  int fl = best <= a0 ? 2 : best >= b ? 1 : 0;
  if (useSH) js_shput(p->h1, p->h2, d, sv, fl, bm); else tset(p->h1, p->h2, d, sv, fl, bm);
  return best;
}
// the page's entry: the position in SQ / IO (side, ply, h1, h2)
__attribute__((export_name("search"))) int csearch(int d, int a, int b, int ply) {
  P *p = &ST[0];
  for (int i = 0; i < NN; i++) p->sq[i] = SQ[i];
  p->side = IO[8]; p->ply = IO[9]; p->h1 = (u32)IO[10]; p->h2 = (u32)IO[11];
  return search(p, d, a, b, ply);
}
__attribute__((export_name("sqp"))) i8 *sqp(void) { return SQ; }
__attribute__((export_name("ztp"))) u32 *ztp(void) { return ZT; }
__attribute__((export_name("iop"))) int *iop(void) { return IO; }
