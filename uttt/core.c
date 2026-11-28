// Ultimate Tic-Tac-Toe — the search in WebAssembly (tools/build-core.sh → core-wasm.js; also built natively for the tools).
// Board: 9 small boards × 9 cells. A move m = b * 9 + c (small board b, cell c; both 0..8 row by row, 0 = top left).
// The cell c of a move sends the opponent to the small board c. Rules (setrule):
//   fc  = 0: a small board is closed once it is won or full; sent to a closed board → any open board (the main rule)
//         1: (classic) a won board stays playable while it has empty cells; sent there you must play there; sent to a full
//            board → any empty cell of any board
//   tie = 0: a drawn (full, no line) small board belongs to nobody; 1: it counts for both players
//   cnt = 0: no line on the big board when nothing is left → a draw; 1: then whoever won more small boards wins
// Search: αβ (negamax, table, iterative deepening, killers / history) on a hand-made evaluation, MCTS (UCT + solver) for
// the strongest levels, an exact "win within n moves" prover for the puzzles.
typedef unsigned int u32; typedef unsigned short u16; typedef unsigned char u8; typedef signed char i8; typedef unsigned long long u64;
#define WIN 30000
#define WINT 29000
#define MAXPLY 96
#ifdef NATIVE
double now(void);
#define EXPORT(n)
#else
__attribute__((import_module("env"), import_name("now"))) double now(void);
#define EXPORT(n) __attribute__((export_name(#n)))
void *memcpy(void *d, const void *s, unsigned long n) { char *a = d; const char *b = s; while (n--) *a++ = *b++; return d; }
void *memset(void *d, int c, unsigned long n) { char *a = d; while (n--) *a++ = (char)c; return d; }
#endif
// shared with JS: IO (values both ways), OUT (per-move lists)
int IO[128];
int OUT[256];
static int RFC = 0, RTIE = 0, RCNT = 0;
static const u16 LN[8] = { 0x7, 0x38, 0x1C0, 0x49, 0x92, 0x124, 0x111, 0x54 };
static u8 W3[512];          // mask has a line
static u8 PC[512];          // popcount
static u8 CELLN[512][9], CELLC[512];   // empty-cell lists of a 9-bit "taken" mask
typedef struct { u16 b[2][9]; u16 mac[3]; i8 forced; u8 side; u8 ply; i8 res; u64 h; } S;   // res: -1 open, 0 draw, 1 X wins, 2 O wins
static u64 ZC[2][81], ZF[10], ZSIDE;
static u64 rs = 0x9E3779B97F4A7C15ull;
static u64 rnd64(void) { rs ^= rs << 13; rs ^= rs >> 7; rs ^= rs << 17; return rs; }
static u32 rnd(u32 n) { return (u32)((rnd64() >> 33) % n); }
EXPORT(seed) void seed(u32 s) { rs = 0x9E3779B97F4A7C15ull ^ ((u64)s * 0xBF58476D1CE4E5B9ull); if (!rs) rs = 1; for (int i = 0; i < 8; i++) rnd64(); }
static int inited = 0;
static void init(void) {
  if (inited) return; inited = 1;
  for (int m = 0; m < 512; m++) {
    int w = 0; for (int k = 0; k < 8; k++) if ((m & LN[k]) == LN[k]) w = 1; W3[m] = w;
    int c = 0; for (int i = 0; i < 9; i++) if (m >> i & 1) c++; PC[m] = c;
    int n = 0; for (int i = 0; i < 9; i++) if (!(m >> i & 1)) CELLN[m][n++] = i; CELLC[m] = n;
  }
  u64 save = rs; rs = 0x2545F4914F6CDD1Dull;
  for (int p = 0; p < 2; p++) for (int i = 0; i < 81; i++) ZC[p][i] = rnd64();
  for (int i = 0; i < 10; i++) ZF[i] = rnd64(); ZSIDE = rnd64(); rs = save;
}
EXPORT(setrule) void setrule(int fc, int tie, int cnt) { init(); RFC = fc; RTIE = tie; RCNT = cnt; }
static inline u16 closedMask(const S *s) { return s->mac[0] | s->mac[1] | s->mac[2]; }
static inline int playable(const S *s, int b) { u16 t = s->b[0][b] | s->b[1][b]; if (t == 0x1FF) return 0; return RFC ? 1 : !((closedMask(s) >> b) & 1); }
// legal moves (m = b * 9 + c) into out; returns the count
static int gen(const S *s, u8 *out) {
  int n = 0;
  if (s->res >= 0) return 0;
  if (s->forced >= 0) { int b = s->forced; u16 t = s->b[0][b] | s->b[1][b]; for (int k = 0; k < CELLC[t]; k++) out[n++] = b * 9 + CELLN[t][k]; return n; }
  for (int b = 0; b < 9; b++) if (playable(s, b)) { u16 t = s->b[0][b] | s->b[1][b]; for (int k = 0; k < CELLC[t]; k++) out[n++] = b * 9 + CELLN[t][k]; }
  return n;
}
static inline u16 macOf(const S *s, int p) { return s->mac[p] | (RTIE ? s->mac[2] : 0); }
static void finish(S *s, int mover) {
  if (W3[macOf(s, mover)]) { s->res = mover + 1; return; }
  if (W3[macOf(s, mover ^ 1)]) { s->res = (mover ^ 1) + 1; return; }
  // any move left?
  int any = 0;
  for (int b = 0; b < 9 && !any; b++) if (playable(s, b)) any = 1;
  if (!any) {
    if (RCNT) { int a = PC[s->mac[0]], c = PC[s->mac[1]]; s->res = a > c ? 1 : c > a ? 2 : 0; }
    else s->res = 0;
  }
}
static void play(S *s, int m) {
  int b = m / 9, c = m % 9, p = s->side;
  s->b[p][b] |= 1 << c; s->h ^= ZC[p][m];
  if (!((closedMask(s) >> b) & 1)) {
    if (W3[s->b[p][b]]) s->mac[p] |= 1 << b;
    else if ((s->b[0][b] | s->b[1][b]) == 0x1FF) s->mac[2] |= 1 << b;
  }
  s->h ^= ZF[s->forced + 1];
  s->forced = playable(s, c) ? c : -1;
  s->h ^= ZF[s->forced + 1];
  s->side ^= 1; s->h ^= ZSIDE; s->ply++;
  int changed = (closedMask(s) >> b) & 1;
  if (changed) finish(s, p);
  else if (s->forced < 0 && RFC == 0) { /* nothing closed: the move cannot end the game */ }
  if (!changed && s->res < 0 && RFC) { int any = 0; for (int q = 0; q < 9 && !any; q++) if (playable(s, q)) any = 1; if (!any) finish(s, p); }
}
// a fresh position from IO: IO[0..80] cells (0 empty, 1 X, 2 O), IO[81] forced (-1 any), IO[82] side (0 X, 1 O), IO[83] ply
// The won / drawn boards are recomputed in order of the cells: for positions given by a diagram (puzzles) a board with lines of
// both players cannot be told apart, so a diagram gives IO[84..92] the owner of each board (-1 = recompute).
static S root;
static void loadIO(S *s) {
  init(); memset(s, 0, sizeof(S));
  for (int i = 0; i < 81; i++) { int v = IO[i]; if (v == 1 || v == 2) { s->b[v - 1][i / 9] |= 1 << (i % 9); s->h ^= ZC[v - 1][i]; } }
  for (int b = 0; b < 9; b++) {
    int own = IO[84 + b];
    if (own == 1) s->mac[0] |= 1 << b; else if (own == 2) s->mac[1] |= 1 << b; else if (own == 3) s->mac[2] |= 1 << b;
    else if (own < 0) {
      int x = W3[s->b[0][b]], o = W3[s->b[1][b]];
      if (x && !o) s->mac[0] |= 1 << b; else if (o && !x) s->mac[1] |= 1 << b; else if (x && o) s->mac[0] |= 1 << b;
      else if ((s->b[0][b] | s->b[1][b]) == 0x1FF) s->mac[2] |= 1 << b;
    }
  }
  s->side = IO[82] & 1; s->ply = IO[83]; s->res = -1;
  int f = IO[81]; s->forced = (f >= 0 && f < 9 && playable(s, f)) ? f : -1;
  s->h ^= ZF[s->forced + 1]; if (s->side) s->h ^= ZSIDE;
  W3[0] = 0;
  if (W3[macOf(s, 0)] || W3[macOf(s, 1)]) { s->res = W3[macOf(s, s->side ^ 1)] ? (s->side ^ 1) + 1 : s->side + 1; }
  else { int any = 0; for (int b = 0; b < 9 && !any; b++) if (playable(s, b)) any = 1; if (!any) finish(s, s->side ^ 1); }
}
EXPORT(setpos) void setpos(void) { loadIO(&root); }
EXPORT(rootres) int rootres(void) { return root.res; }
EXPORT(rootmoves) int rootmoves(void) { u8 mv[81]; int n = gen(&root, mv); for (int i = 0; i < n; i++) OUT[i] = mv[i]; return n; }
// ---------------------------------------------------------------- evaluation (side to move's view; ~100 = a small edge)
// Each open small board gets a "chance" for X and for O from its lines (open twos weigh most, a single mark a little, the
// centre a bit); a won board is 1 for its owner, 0 for the other; a drawn board 0 (1 for both when it counts for both).
// The big board then adds up its 8 lines as products of the three chances (a line needs all three), plus each board on its
// own, weighted by how many lines of the big board go through it. The mover also gets the move in hand: a free choice of
// board, or a board where it can win at once.
int EWT[16] = { 1000, 160, 26, 58, 18, 12, 30, 55, 30, 70, 0, 0, 0, 0, 0, 0 };
//  0 macro line weight, 1 per-board weight, 2 n1 (open single), 3 n2 (open two), 4 centre, 5 corner,
//  6 free move bonus, 7 immediate small win in the forced board, 8 base chance, 9 sent-board-is-dead penalty (unused weight index)
EXPORT(ewt) int *ewt(void) { return EWT; }
static const u8 BW[9] = { 3, 2, 3, 2, 4, 2, 3, 2, 3 };   // lines of the big board through each board
static inline int twos(u16 m, u16 t) { int n = 0; for (int k = 0; k < 8; k++) { u16 L = LN[k]; if (!(t & L) && PC[m & L] == 2) n++; } return n; }
static inline int ones(u16 m, u16 t) { int n = 0; for (int k = 0; k < 8; k++) { u16 L = LN[k]; if (!(t & L) && PC[m & L] == 1) n++; } return n; }
static inline int alive(u16 t) { for (int k = 0; k < 8; k++) if (!(t & LN[k])) return 1; return 0; }
// a winning cell for m against t in a 3×3 (the cells that complete an open two); mask
static inline u16 winCells(u16 m, u16 t) { u16 w = 0; for (int k = 0; k < 8; k++) { u16 L = LN[k]; if (!(t & L) && PC[m & L] == 2) w |= L & ~m; } return w; }
static float chance[2][9];
static void chances(const S *s) {
  u16 cl = closedMask(s);
  for (int b = 0; b < 9; b++) {
    if ((s->mac[0] >> b) & 1) { chance[0][b] = 1; chance[1][b] = 0; continue; }
    if ((s->mac[1] >> b) & 1) { chance[0][b] = 0; chance[1][b] = 1; continue; }
    if ((s->mac[2] >> b) & 1) { float v = RTIE ? 1.f : 0.f; chance[0][b] = v; chance[1][b] = v; continue; }
    (void)cl;
    u16 x = s->b[0][b], o = s->b[1][b];
    float sc[2];
    for (int p = 0; p < 2; p++) {
      u16 m = p ? o : x, t = p ? x : o;
      if (!alive(t)) { sc[p] = 0; continue; }
      float v = EWT[8] + EWT[2] * ones(m, t) + EWT[3] * twos(m, t) + ((m >> 4) & 1) * EWT[4] + PC[m & 0x145] * EWT[5];
      sc[p] = v;
    }
    float tot = sc[0] + sc[1] + 40.f;
    float a = sc[0] / tot, c = sc[1] / tot;
    if (RTIE) { float d = 1.f - a - c; a += d * 0.5f; c += d * 0.5f; }
    chance[0][b] = a; chance[1][b] = c;
  }
}
static const u8 ML[8][3] = { {0,1,2},{3,4,5},{6,7,8},{0,3,6},{1,4,7},{2,5,8},{0,4,8},{2,4,6} };
static int evaluate(const S *s) {
  chances(s);
  float v = 0;
  for (int k = 0; k < 8; k++) {
    float px = chance[0][ML[k][0]] * chance[0][ML[k][1]] * chance[0][ML[k][2]];
    float po = chance[1][ML[k][0]] * chance[1][ML[k][1]] * chance[1][ML[k][2]];
    v += (px - po) * EWT[0];
  }
  for (int b = 0; b < 9; b++) v += (chance[0][b] - chance[1][b]) * EWT[1] * BW[b] / 3.f;
  int me = s->side;
  float iv = me ? -v : v;
  // the move in hand
  if (s->forced < 0) iv += EWT[6];
  else { int b = s->forced; if (!((closedMask(s) >> b) & 1) && (winCells(s->b[me][b], s->b[me ^ 1][b]) & ~(s->b[0][b] | s->b[1][b]))) iv += EWT[7] * BW[b] / 3; }
  int r = (int)iv; if (r > 9000) r = 9000; if (r < -9000) r = -9000;
  return r;
}
EXPORT(evalroot) int evalroot(void) { return evaluate(&root); }
// ---------------------------------------------------------------- αβ
#define TSZ (1 << 20)
typedef struct { u32 k; short v; u8 d, f, m, gen; } TE;
static TE T[TSZ];
static u8 tgen = 1;
EXPORT(ttclear) void ttclear(void) { memset(T, 0, sizeof(T)); tgen = 1; }
static double nodes = 0, nodeLimit = 1e300, tEnd = 1e300;
static int stopF = 0;
static u8 killer[MAXPLY][2];
static int hist[2][81];
static inline int termVal(const S *s, int ply) { if (s->res == 0) return 0; return (s->res - 1) == s->side ? WIN - ply : -(WIN - ply); }
static void order(const S *s, u8 *mv, int n, int ttm, int ply) {
  int sc[81]; int me = s->side; u16 cl = closedMask(s);
  for (int i = 0; i < n; i++) {
    int m = mv[i], b = m / 9, c = m % 9, x = 0;
    if (m == ttm) x = 1 << 28;
    else {
      u16 mine = s->b[me][b], th = s->b[me ^ 1][b];
      if (!((cl >> b) & 1)) {
        if (W3[mine | 1 << c]) x += 1 << 24;                        // wins the small board
        else if (W3[th | 1 << c]) x += 1 << 23;                     // blocks a win there
      }
      if (m == killer[ply][0]) x += 1 << 22; else if (m == killer[ply][1]) x += 1 << 21;
      // where it sends the opponent: a closed board (free move) is bad, a board where the opponent wins at once is bad
      int tb = c; u16 tcl = cl | (W3[mine | 1 << c] ? 1 << b : 0);
      int fr = RFC ? ((s->b[0][tb] | s->b[1][tb] | (tb == b ? 1 << c : 0)) == 0x1FF) : (((tcl >> tb) & 1) || ((s->b[0][tb] | s->b[1][tb] | (tb == b ? 1 << c : 0)) == 0x1FF));
      if (fr) x -= 1 << 20;
      else if (!((tcl >> tb) & 1)) { u16 om = s->b[me ^ 1][tb], mm = s->b[me][tb] | (tb == b ? 1 << c : 0); if (winCells(om, mm) & ~(om | mm)) x -= 1 << 19; }
      x += hist[me][m];
    }
    sc[i] = x;
  }
  for (int i = 1; i < n; i++) { int a = sc[i]; u8 b = mv[i]; int j = i - 1; while (j >= 0 && sc[j] < a) { sc[j + 1] = sc[j]; mv[j + 1] = mv[j]; j--; } sc[j + 1] = a; mv[j + 1] = b; }
}
static int search(const S *s, int d, int a, int b, int ply) {
  if (s->res >= 0) return termVal(s, ply);
  if ((((u32)nodes) & 1023) == 0 && (now() > tEnd || nodes > nodeLimit)) stopF = 1;
  if (stopF) return 0;
  nodes++;
  if (d <= 0) return evaluate(s);
  u32 k = (u32)(s->h >> 32); TE *e = &T[(u32)s->h & (TSZ - 1)];
  int ttm = -1;
  if (e->k == k && e->gen) {
    ttm = e->m;
    if (e->d >= d) { int v = e->v; if (v > WINT) v -= ply; else if (v < -WINT) v += ply;
      if (e->f == 0) return v; if (e->f == 1 && v >= b) return v; if (e->f == 2 && v <= a) return v; }
  }
  u8 mv[81]; int n = gen(s, mv);
  order(s, mv, n, ttm, ply);
  int best = -WIN - 1, bm = mv[0], a0 = a;
  for (int i = 0; i < n; i++) {
    S q = *s; play(&q, mv[i]);
    int v;
    if (i == 0) v = -search(&q, d - 1, -b, -a, ply + 1);
    else { v = -search(&q, d - 1, -a - 1, -a, ply + 1); if (v > a && v < b && !stopF) v = -search(&q, d - 1, -b, -a, ply + 1); }
    if (stopF) return 0;
    if (v > best) { best = v; bm = mv[i]; }
    if (v > a) a = v;
    if (a >= b) { if (killer[ply][0] != mv[i]) { killer[ply][1] = killer[ply][0]; killer[ply][0] = mv[i]; } hist[s->side][mv[i]] += d * d; if (hist[s->side][mv[i]] > (1 << 18)) for (int z = 0; z < 81; z++) { hist[0][z] >>= 1; hist[1][z] >>= 1; } break; }
  }
  int sv = best; if (sv > WINT) sv += ply; else if (sv < -WINT) sv -= ply;
  e->k = k; e->v = (short)sv; e->d = (u8)d; e->m = (u8)bm; e->gen = 1; e->f = best >= b ? 1 : best <= a0 ? 2 : 0;
  return best;
}
static void resetSearch(double ms, double nl) { nodes = 0; stopF = 0; tEnd = ms > 0 ? now() + ms : 1e300; nodeLimit = nl > 0 ? nl : 1e300; memset(killer, 0, sizeof(killer)); for (int z = 0; z < 81; z++) { hist[0][z] >>= 2; hist[1][z] >>= 2; } }
// best move by iterative deepening: IO[0] move, IO[1] value, IO[2] depth, IO[3] nodes / 1000
EXPORT(ab_best) void ab_best(int maxD, double ms, double nl) {
  resetSearch(ms, nl);
  u8 mv[81]; int n = gen(&root, mv);
  IO[0] = n ? mv[0] : -1; IO[1] = 0; IO[2] = 0;
  if (!n) return;
  int bestM = mv[0], bestV = 0;
  for (int d = 1; d <= maxD; d++) {
    u32 k = (u32)(root.h >> 32); TE *e = &T[(u32)root.h & (TSZ - 1)];
    int ttm = (e->k == k && e->gen) ? e->m : bestM;
    order(&root, mv, n, ttm, 0);
    int a = -WIN - 1, bm = -1;
    for (int i = 0; i < n; i++) {
      S q = root; play(&q, mv[i]);
      int v;
      if (i == 0) v = -search(&q, d - 1, -WIN - 1, -a, 1);
      else { v = -search(&q, d - 1, -a - 1, -a, 1); if (v > a && !stopF) v = -search(&q, d - 1, -WIN - 1, -a, 1); }
      if (stopF) break;
      if (v > a) { a = v; bm = mv[i]; }
    }
    if (stopF && bm < 0) break;
    if (bm >= 0) { bestM = bm; bestV = a; IO[2] = d; e = &T[(u32)root.h & (TSZ - 1)]; e->k = k; e->m = (u8)bm; e->d = 0; e->gen = 1; e->f = 3; }
    if (stopF) break;
    if (bestV > WINT || bestV < -WINT) break;
  }
  IO[0] = bestM; IO[1] = bestV; IO[3] = (int)(nodes / 1000);
}
// the value of every root move at depth d (each with a full window): OUT[2i] move, OUT[2i+1] value; returns n (−1 = stopped)
EXPORT(ab_root) int ab_root(int d, double ms) {
  if (ms >= 0) resetSearch(ms, 0);
  u8 mv[81]; int n = gen(&root, mv);
  order(&root, mv, n, -1, 0);
  for (int i = 0; i < n; i++) {
    S q = root; play(&q, mv[i]);
    int v = -search(&q, d - 1, -WIN - 1, WIN + 1, 1);
    if (stopF) return -1 - i;
    OUT[2 * i] = mv[i]; OUT[2 * i + 1] = v;
  }
  return n;
}
EXPORT(getnodes) double getnodes(void) { return nodes; }
EXPORT(stopped) int stopped(void) { return stopF; }
// ---------------------------------------------------------------- MCTS (UCT with the solver: proven wins / losses go up the tree)
#define MAXNODE (1 << 21)
typedef struct { int child; float w; int n; u8 nch, move; i8 proven; u8 pad; } ND;   // w: wins of the player who moved INTO this node; proven: +1 that player wins, -1 loses
static ND NDS[MAXNODE];
static int ncount = 0;
static float UCTC = 0.9f;
// ln(x) for x ≥ 1 without libm: the exponent from the float's bits and a short series for the mantissa
static float flog(float x) { union { float f; u32 i; } u = { x }; int e = (int)((u.i >> 23) & 255) - 127; u.i = (u.i & 0x7FFFFF) | 0x3F800000; float m = u.f; float t = (m - 1) / (m + 1), t2 = t * t; return e * 0.69314718f + 2 * t * (1 + t2 * (0.33333333f + t2 * (0.2f + t2 * 0.142857f))); }
EXPORT(uctc) void uctc(int c100) { UCTC = c100 / 100.f; }
static int newNode(int move) { if (ncount >= MAXNODE) return -1; ND *d = &NDS[ncount]; d->child = -1; d->w = 0; d->n = 0; d->nch = 0; d->move = (u8)move; d->proven = 0; return ncount++; }
// the playout: random moves, except a move that wins the whole game at once is always taken, and a move that wins a small
// board is preferred half the time. Returns the result 1 X, 2 O, 0 draw
static int rollout(S *s) {
  u8 mv[81];
  while (s->res < 0) {
    int n = gen(s, mv); int me = s->side; u16 cl = closedMask(s);
    int pick = -1, nw = 0; u8 wins[81];
    for (int i = 0; i < n; i++) { int m = mv[i], b = m / 9, c = m % 9; if (!((cl >> b) & 1) && W3[s->b[me][b] | 1 << c]) { if (W3[macOf(s, me) | 1 << b]) { pick = m; break; } wins[nw++] = (u8)m; } }
    if (pick < 0) { if (nw && (rnd64() & 1)) pick = wins[rnd(nw)]; else pick = mv[rnd(n)]; }
    play(s, pick);
  }
  return s->res;
}
static int expand(int ni, const S *s) {
  u8 mv[81]; int n = gen(s, mv); if (!n) return 0;
  if (ncount + n > MAXNODE) return 0;
  int first = ncount; for (int i = 0; i < n; i++) newNode(mv[i]);
  NDS[ni].child = first; NDS[ni].nch = (u8)n; return 1;
}
static int mctsRootSide = 0;
static float FPU = 1.1f;
static void mctsIter(void) {
  int path[MAXPLY + 2], np = 0; S s = root; int ni = 0; path[np++] = 0;
  while (NDS[ni].child >= 0 && s.res < 0 && !NDS[ni].proven) {
    ND *p = &NDS[ni]; int bi = -1; float bs = -1e30f; float lp = flog((float)(p->n + 1));
    for (int i = 0; i < p->nch; i++) {
      ND *c = &NDS[p->child + i];
      float sc;
      if (c->proven == 1) { bi = p->child + i; break; }    // a proven win for the mover: take it
      if (c->proven == -1) continue;
      if (c->n == 0) sc = FPU + (rnd64() & 1023) * 1e-6f;
      else sc = c->w / c->n + UCTC * __builtin_sqrtf(lp / c->n);
      if (sc > bs) { bs = sc; bi = p->child + i; }
    }
    if (bi < 0) bi = p->child;   // every child proven lost: any (the solver marks the parent below)
    play(&s, NDS[bi].move); ni = bi; path[np++] = ni;
  }
  int res;
  if (s.res >= 0) {
    res = s.res;
    // a terminal: the player who moved into it wins / loses / draws for sure
    int mover = s.side ^ 1; NDS[ni].proven = res == 0 ? 0 : (res - 1 == mover ? 1 : -1);
  } else if (NDS[ni].proven) {
    int mover = s.side ^ 1; res = NDS[ni].proven == 1 ? mover + 1 : (mover ^ 1) + 1;
  } else {
    if (NDS[ni].n >= 1 && expand(ni, &s)) { int c = NDS[ni].child + rnd(NDS[ni].nch); play(&s, NDS[c].move); ni = c; path[np++] = ni;
      if (s.res >= 0) { int mover = s.side ^ 1; NDS[ni].proven = s.res == 0 ? 0 : (s.res - 1 == mover ? 1 : -1); res = s.res; }
      else { S r = s; res = rollout(&r); } }
    else { S r = s; res = rollout(&r); }
  }
  // back up: node path[i] was moved into by the player (side at path[i-1]); the root's mover is the root side's opponent
  int side = root.side;   // side to move at path[0]
  for (int i = 0; i < np; i++) {
    ND *d = &NDS[path[i]];
    int mover = (i == 0) ? (side ^ 1) : ((side + i - 1) & 1);
    d->n++; d->w += res == 0 ? 0.5f : (res - 1 == mover ? 1.f : 0.f);
  }
  // the solver: from the leaf up, a node whose child is a proven win for its mover is a proven loss for the node's own mover, a node
  // whose children are all proven losses (for their mover) is a proven win
  for (int i = np - 2; i >= 0; i--) {
    ND *p = &NDS[path[i]]; if (p->proven || p->child < 0) { if (p->proven) continue; else break; }
    int allLost = 1, anyWin = 0, anyDraw = 0;
    for (int j = 0; j < p->nch; j++) { ND *c = &NDS[p->child + j]; if (c->proven == 1) { anyWin = 1; break; } if (c->proven != -1) allLost = 0; (void)anyDraw; }
    if (anyWin) p->proven = -1; else if (allLost) p->proven = 1; else break;
  }
}
// MCTS from the root position: ms / iterations; OUT[3i] move, OUT[3i+1] visits, OUT[3i+2] wins × 1000 / visits (mover's view, ‰);
// IO[0] best (most visits; a proven win first), IO[1] its win rate ‰, IO[2] proven (1 win / -1 loss / 0), IO[3] iterations / 1000
EXPORT(mcts) int mcts(double ms, double iters) {
  ncount = 0; newNode(255); mctsRootSide = root.side;
  double t1 = ms > 0 ? now() + ms : 1e300; double it = 0;
  if (root.res >= 0) return 0;
  expand(0, &root);
  while (it < iters) {
    for (int k = 0; k < 64 && it < iters; k++, it++) mctsIter();
    if (now() > t1 || NDS[0].proven) break;
    if (ncount > MAXNODE - 100) { /* the pool is full: playouts go on from the leaves */ }
  }
  ND *r = &NDS[0]; int best = -1, bn = -1, pv = 0;
  for (int i = 0; i < r->nch; i++) {
    ND *c = &NDS[r->child + i];
    OUT[3 * i] = c->move; OUT[3 * i + 1] = c->n; OUT[3 * i + 2] = c->proven == 1 ? 1000 : c->proven == -1 ? 0 : c->n ? (int)(c->w * 1000 / c->n) : 500;
    int key = c->proven == 1 ? 0x7fffffff : c->proven == -1 ? -1 + c->n / 1000000 - 1000000 : c->n;
    if (key > bn) { bn = key; best = i; }
  }
  if (best < 0) best = 0;
  ND *b = &NDS[r->child + best]; pv = b->proven;
  // all children lost: the most visited of them (the longest resistance is handled by the page with αβ)
  IO[0] = b->move; IO[1] = b->proven == 1 ? 1000 : b->proven == -1 ? 0 : (int)(b->w * 1000 / (b->n ? b->n : 1)); IO[2] = pv; IO[3] = (int)(it / 1000);
  return r->nch;
}
// ---------------------------------------------------------------- the prover: the side to move wins the big board within k of its moves
// whatever the replies (puzzles). A table of (position, k) answers, cleared per call.
#define PSZ (1 << 20)
typedef struct { u64 h; i8 k, r; } PE;
static PE P[PSZ];
static double pbudget = 0;
static int proveW(const S *s, int k, int me);
static int proveB(const S *s, int k, int me);
static int pget(const S *s, int k, int w) { PE *e = &P[(s->h ^ (u64)(k * 2 + w) * 0x9E3779B97F4A7C15ull) & (PSZ - 1)]; if (e->h == (s->h ^ (u64)(k * 2 + w))) return e->r; return -1; }
static void pput(const S *s, int k, int w, int r) { PE *e = &P[(s->h ^ (u64)(k * 2 + w) * 0x9E3779B97F4A7C15ull) & (PSZ - 1)]; e->h = s->h ^ (u64)(k * 2 + w); e->r = (i8)r; e->k = (i8)k; }
// me to move: some move wins at once, or (k > 1) leaves a position where every reply loses within k − 1 more moves
static int proveW(const S *s, int k, int me) {
  if (--pbudget < 0) return 0;
  int c = pget(s, k, 1); if (c >= 0) return c;
  u8 mv[81]; int n = gen(s, mv); int res = 0;
  for (int i = 0; i < n && !res; i++) { S q = *s; play(&q, mv[i]); if (q.res == me + 1) res = 1; }
  if (!res && k > 1) {
    order(s, mv, n, -1, 0);
    for (int i = 0; i < n && !res; i++) { S q = *s; play(&q, mv[i]); if (q.res >= 0) continue; if (proveB(&q, k - 1, me)) res = 1; if (pbudget < 0) return 0; }
  }
  pput(s, k, 1, res); return res;
}
static int proveB(const S *s, int k, int me) {
  if (--pbudget < 0) return 0;
  int c = pget(s, k, 0); if (c >= 0) return c;
  u8 mv[81]; int n = gen(s, mv); int res = 1;
  if (!n) res = 0;
  order(s, mv, n, -1, 0);
  for (int i = 0; i < n && res; i++) { S q = *s; play(&q, mv[i]); if (q.res >= 0) { if (q.res != me + 1) res = 0; continue; } if (!proveW(&q, k, me)) res = 0; if (pbudget < 0) return 0; }
  pput(s, k, 0, res); return res;
}
static void pclear(void) { memset(P, 0, sizeof(P)); for (int i = 0; i < PSZ; i++) P[i].r = -1, P[i].h = 0; }
// the root moves that win within k: OUT[i]; returns the count, −1 = budget out
EXPORT(prove_moves) int prove_moves(int k, double budget) {
  pclear(); pbudget = budget; int me = root.side; u8 mv[81]; int n = gen(&root, mv), c = 0;
  for (int i = 0; i < n; i++) { S q = root; play(&q, mv[i]); int w = q.res == me + 1 || (q.res < 0 && k > 1 && proveB(&q, k - 1, me)); if (pbudget < 0) return -1; if (w) OUT[c++] = mv[i]; }
  return c;
}
// does the side to move win within k (1 / 0, −1 = budget out)
EXPORT(prove_root) int prove_root(int k, double budget) { pclear(); pbudget = budget; int r = proveW(&root, k, root.side); return pbudget < 0 ? -1 : r; }
// the defender to move: for each reply, the fewest moves the attacker (the side not to move) needs (99 = not within k):
// OUT[2i] move, OUT[2i+1] need
EXPORT(prove_replies) int prove_replies(int k, double budget) {
  pclear(); pbudget = budget; int me = root.side ^ 1; u8 mv[81]; int n = gen(&root, mv);
  for (int i = 0; i < n; i++) {
    S q = root; play(&q, mv[i]); int need = 99;
    if (q.res == root.side + 1) need = 100; else if (q.res >= 0) need = q.res == me + 1 ? 0 : 100;
    else for (int j = 1; j <= k; j++) if (proveW(&q, j, me)) { need = j; break; }
    if (pbudget < 0) return -1;
    OUT[2 * i] = mv[i]; OUT[2 * i + 1] = need;
  }
  return n;
}
#ifndef NATIVE
EXPORT(io) int *io(void) { return IO; }
EXPORT(out) int *out(void) { return OUT; }
#endif
