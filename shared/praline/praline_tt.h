// Praline (claude/praline-spec.md): the threads' shared transposition table, "lockless" (2026-11-15, the common part of the
// tables the games wrote one by one after the 2026-11-09 audit, addendum「共有メモリの探索で守ること」).
//
// Buckets of PL_TT_WAYS entries; an entry is PL_TT_WORDS u64 words: e[0] = key ^ w (^ c), e[1] = w (, e[2] = c) — the game's
// packing. A torn entry (two threads writing it at once) fails the key check and is never used. The game keeps its own packing
// (value, move, depth, bound, age…) and its own rule of replacement; this header only finds and writes entries. Each word of
// an entry is read once (PL_TT_RD) and written once (PL_TT_WR): tools/mtsim/gen.py makes them the simulation's shared reads /
// writes.
//
//   Before #include (the game):
//     PL_TT_BITS          the number of buckets is 2^PL_TT_BITS
//     PL_TT_WAYS          entries a bucket (default 4)
//     PL_TT_WORDS         words an entry: 2 or 3 (default 2)
//     PL_TT_USED(w, c)    the entry is in use (e.g. a flag bit of w; c = 0 with 2 words); default: always
//     PL_TT_SCORE(w, c)   how much an entry is worth keeping (int: the lowest of the bucket is replaced; ties: the first)
//   Then:
//     PL_TT[]                                 the table (zero = empty: memset it for a new game)
//     plttFind(key, idx, &w, &c) → 1 / 0      key's entry in bucket idx (idx & mask): its words
//     plttSlot(key, idx, &hit, &w, &c) → e    the entry to write: key's own (hit = 1, its words), else the lowest PL_TT_SCORE
//     plttWrite(e, key, w, c)                 e[1] = w (, e[2] = c), then e[0] = key ^ w (^ c)
//   The key and the index are separate (a game may index by one half of its key, e.g. morris h1, and check the whole key).
#ifndef PRALINE_TT_H
#define PRALINE_TT_H
#ifndef PL_TT_BITS
#error "praline_tt.h: define PL_TT_BITS"
#endif
#ifndef PL_TT_WAYS
#define PL_TT_WAYS 4
#endif
#ifndef PL_TT_WORDS
#define PL_TT_WORDS 2
#endif
#ifndef PL_TT_USED
#define PL_TT_USED(w, c) 1
#endif
#ifndef PL_TT_SCORE
#error "praline_tt.h: define PL_TT_SCORE(w, c)"
#endif
#ifndef PL_TT_RD
#define PL_TT_RD(p) (*(p))
#endif
#ifndef PL_TT_WR
#define PL_TT_WR(p, v) (*(p) = (v))
#endif
#define PL_TT_MASK ((1u << PL_TT_BITS) - 1)
#define PL_TT_STRIDE (PL_TT_WAYS * PL_TT_WORDS)
static u64 PL_TT[(1u << PL_TT_BITS) * PL_TT_STRIDE];
static inline int plttFind(u64 key, u64 idx, u64 *w, u64 *c) {
  const u64 *bk = &PL_TT[(idx & PL_TT_MASK) * PL_TT_STRIDE];
  for (int j = 0; j < PL_TT_WAYS; j++) {
    const u64 *e = bk + PL_TT_WORDS * j;
#if PL_TT_WORDS == 3
    const u64 kx = PL_TT_RD(&e[0]), a = PL_TT_RD(&e[1]), b = PL_TT_RD(&e[2]);
    if ((kx ^ a ^ b) == key && PL_TT_USED(a, b)) { *w = a; *c = b; return 1; }
#else
    const u64 a = PL_TT_RD(&e[1]), kx = PL_TT_RD(&e[0]);
    if ((kx ^ a) == key && PL_TT_USED(a, 0)) { *w = a; *c = 0; return 1; }
#endif
  }
  return 0;
}
static inline u64 *plttSlot(u64 key, u64 idx, int *hit, u64 *w, u64 *c) {
  u64 *bk = &PL_TT[(idx & PL_TT_MASK) * PL_TT_STRIDE];
  int j = 0, q = 1 << 30;
  for (int i = 0; i < PL_TT_WAYS; i++) {
    u64 *e = bk + PL_TT_WORDS * i;
#if PL_TT_WORDS == 3
    const u64 kx = PL_TT_RD(&e[0]), a = PL_TT_RD(&e[1]), b = PL_TT_RD(&e[2]);
    if ((kx ^ a ^ b) == key && PL_TT_USED(a, b)) { *hit = 1; *w = a; *c = b; return e; }
#else
    const u64 a = PL_TT_RD(&e[1]), kx = PL_TT_RD(&e[0]), b = 0;
    if ((kx ^ a) == key && PL_TT_USED(a, b)) { *hit = 1; *w = a; *c = 0; return e; }
#endif
    int sc = PL_TT_SCORE(a, b);
    if (sc < q) { q = sc; j = i; }
  }
  *hit = 0; *w = 0; *c = 0;
  return bk + PL_TT_WORDS * j;
}
static inline void plttWrite(u64 *e, u64 key, u64 w, u64 c) {
#if PL_TT_WORDS == 3
  PL_TT_WR(&e[1], w); PL_TT_WR(&e[2], c); PL_TT_WR(&e[0], key ^ w ^ c);
#else
  (void)c; PL_TT_WR(&e[1], w); PL_TT_WR(&e[0], key ^ w);
#endif
}
#endif
