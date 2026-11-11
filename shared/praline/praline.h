// Praline (プラリネ) — the site's common thinking engine, C part: the multi-thread machinery of the wasm alpha-beta engines
// (engine_mt.wasm, -DMT). Nuts (many cores) bound into one by caramel (shared memory). claude/praline-spec.md.
//
// Part 1 of 2 — the shared state (included where the game's engine_mt.wasm state is declared, before its search):
//   • gStop, threadId                       the search is over (the helpers stop); 0 = the main thread
//   • busy marks (busyT, busyOther / busySet / busyClear)   Kerrigan's "simplified ABDADA": a move whose position another
//     thread is on is put off to the end of the node (2026-11-10, morris → checkers / fanorona / xiangqi / janggi / shogi)
//   • split points (struct SPt, SPS, spAlloc / spRelease, splitD) and their counters on a cache line of their own (GS)
//   • curSP / curIdx / dupMode (the split point a thread works under, its move there, a straggler searched a second time)
// Part 2 — praline_ybw.h, included after the game's search(): Young Brothers Wait (reversi/engine.c v4 / v4.1, the same
// code as xiangqi / janggi / checkers had each on its own, 2026-11-10 / 11): split, join, the owner helping below its split
// point while it waits, the waiting owner's mark, the second search of a straggler's move, mt_idle, mt_split.
//
// The game provides (before this file): the types u8 / u64 and Move, TLS (_Thread_local in engine_mt.wasm), EXPORT(name),
// SP_MV (the most moves of one split point) and PL_SP_FIELDS — the game's own members of a split point: the position of the
// node (board, key, the repetition history since the last capture, …) and per move what the one-thread loop decides (the
// reduction or the move's place for LMR, gives check, …). Optional: NSP (split points, 128), SPLIT_D (the least remaining
// depth of a split, 3), BUSY_D (the least remaining depth of a busy mark, 2), BUSY_BITS (15), BUSY_DEF (moves put off per
// node, 32).
// Without -DMT nothing of this is compiled: the game's normal engine.wasm stays byte for byte as before.
#ifndef PRALINE_H
#define PRALINE_H 1
#ifndef SP_MV
#error "Praline: define SP_MV (and PL_SP_FIELDS) before praline.h"
#endif
#ifndef NSP
#define NSP 128
#endif
#ifndef SPLIT_D
#define SPLIT_D 3
#endif
#ifndef BUSY_BITS
#define BUSY_BITS 15
#endif
#ifndef BUSY_D
#define BUSY_D 2
#endif
#ifndef BUSY_DEF
#define BUSY_DEF 32
#endif
#define MT_YBW 1   /* (tools/mtsim: the helpers wait in mt_idle) */
#ifndef SIM_IDLE
#define SIM_IDLE() ((void)0)   /* (tools/mtsim: an idle thread's tick of the clock) */
#endif

static volatile int gStop;            // shared: set when the main thread's search is over (the helpers stop)
static TLS int threadId;              // 0 = the main thread (time control, result), 1.. = helpers

// ---- busy marks: the position's key | thread number + 1. The threads walk the same tree in the same order at the same
// speed, so they search the same subtree at the same time and none gets the other's result from the table. A thread marks the
// position of the move it searches (remaining depth >= BUSY_D); a move after the first whose position another thread has
// marked is put off to the end of the node (by then its result is usually in the table). One thread alone never meets
// another's mark: its search is as before. (tools/mtsim rewrites these three accessors for its simulation.)
static u64 busyT[1 << BUSY_BITS];
static inline int busyOther(u64 k) {
  u64 v = __atomic_load_n(&busyT[(k >> 32) & ((1u << BUSY_BITS) - 1)], __ATOMIC_RELAXED);
  return (v & ~63ull) == (k & ~63ull) && (int)(v & 63) != (threadId & 63) + 1;
}
static inline int busySet(u64 k) {
  int i = (int)((k >> 32) & ((1u << BUSY_BITS) - 1));
  __atomic_store_n(&busyT[i], (k & ~63ull) | (u64)((threadId & 63) + 1), __ATOMIC_RELAXED);
  return i;
}
static inline void busyClear(u64 k, int i) {
  u64 mine = (k & ~63ull) | (u64)((threadId & 63) + 1);
  __atomic_compare_exchange_n(&busyT[i], &mine, 0, 0, __ATOMIC_RELAXED, __ATOMIC_RELAXED);
}

// ---- split points (Young Brothers Wait). stopFlag (the game's) 2: a split point on this thread's chain was cut off / stopped
// (or its move was finished by another thread) — the search unwinds to it; 3: a thread searching a straggler's move a second
// time leaves it for a split point to join.
typedef struct SPt SPt;
static TLS SPt *curSP; static TLS int curIdx = -1;   // the split point this thread works under, its move there
static TLS int dupMode;                              // searching a straggler's move a second time (spDup)
static int chainStopped(const SPt *s, int idx);
static int dupLeave(void);
// the counters of the split points (written at every join): a cache line of their own
static struct { volatile int idle, waitN, openN, hi; } __attribute__((aligned(64))) GS;
#define gIdle (GS.idle)     /* helper threads waiting for a split point (mt_idle) */
#define gWaitN (GS.waitN)   /* owners waiting for the helpers of their split point */
#define gOpenN (GS.openN)   /* split points open for joining */
#define gSPHi (GS.hi)       /* the slots used so far */
struct SPt {
  volatile int word;   // seq << 9 | open (256) | the helpers on it (0..255)
  volatile int lock, stop, next, alpha, best, inuse, waiting;
  Move bestMove;       // (under the lock)
  int beta, n, depth, ply, root, all, pv, pidx;
  const void *own; SPt *parent;   // the owner thread (the address of its curIdx); the split point above (pidx: its move)
  volatile u8 busy[SP_MV], done[SP_MV], dup[SP_MV];   // the moves taken, finished, searched a second time
  Move mv[SP_MV]; int vals[SP_MV];                    // the moves; root: their values
  PL_SP_FIELDS                                        // the game's: the node's position, the moves' reductions, …
} __attribute__((aligned(64)));
static SPt SPS[NSP] __attribute__((aligned(64)));
static int splitD = SPLIT_D;
static SPt *spAlloc(void) {
  for (int i = 0; i < NSP; i++) { int z = 0; if (!SPS[i].inuse && __atomic_compare_exchange_n(&SPS[i].inuse, &z, 1, 0, __ATOMIC_ACQ_REL, __ATOMIC_RELAXED)) {
    int h = __atomic_load_n(&gSPHi, __ATOMIC_ACQUIRE); while (h <= i && !__atomic_compare_exchange_n(&gSPHi, &h, i + 1, 0, __ATOMIC_ACQ_REL, __ATOMIC_ACQUIRE)) {}
    return SPS + i; } }
  return 0;
}
static inline void spRelease(SPt *s) { __atomic_store_n(&s->inuse, 0, __ATOMIC_RELEASE); }   // (never opened)
// the owner: s (moves, position, window filled in) is opened, searched with the helpers; *best / *bestM updated (the root:
// the values of the finished moves into vals) — praline_ybw.h
static void spRun(SPt *s, int *best, Move *bestM, int *vals);
// a split is wanted below a split point whose owner waits for its helpers (split then even without an idle helper)
static int spWanted(void);
#endif
