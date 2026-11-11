// Praline (プラリネ) — part 2 of 2: Young Brothers Wait on the split points of praline.h 
// Lazy SMP (every thread searching the
// root, helping each other only through the table, with busy marks) grew to x4-5 at 8-14 threads on a 14-core machine and no further.
// Here the helpers do not search on their own: they wait in mt_idle. A node of the search (remaining depth >= SPLIT_D) whose
// first move is done opens a split point when a helper is idle (or an owner above waits): its other moves (in the one-thread
// order, pruned and reduced as there — the game fills them in) are taken one at a time by the owner and the idle threads,
// each with the one-thread loop's null window / re-search. A helper copies the position of the split point. A cut-off stops
// the split point (the threads below it see it at their next check: stopFlag 2). The owner waits until every helper has
// left, meanwhile helping at the split points below its own, or searching a move that another thread is still on a second
// time (a thread on a slow core then holds up nobody: the first result counts). The root is one too. Without an idle helper
// nothing is split: one thread searches exactly as before.
//
// Included after the game's search(). The game provides first (its "glue"):
//   static PL_VAL spSearch(SPt *s, int i, PL_VAL a) the move i of s at s's position (the thread is there) with the null
//                                                     window against a and the re-searches, as the one-thread loop / root
//   static void spLoadPos(const SPt *s, int top, int fresh)   a thread joining s: copy its position (and the repetition
//                                                     history); top: the slot of the incremental evaluation's stack to use,
//                                                     fresh: build the evaluation's accumulator there anew
//   static int spTop(void)                          the thread's slot of that stack now (0 for a game without one)
//   static void spCutoff(const SPt *s, int i)       the move i of s (not the root) cut off: this thread's killers / history,
//                                                     as the one-thread cut-off (the game checks that the move is quiet)
//   static void waitCheck(void)                     an owner waiting for its helpers: SIM_IDLE() and the game's time / stop
//                                                     check (sets stopFlag as timeUp does)
//   static void spIdleReset(int fresh)              mt_idle starts: the game's search state (nodes, time / node limits, root
//                                                     key …); fresh: a new job (the history decays, the killers are cleared)
//   now(), and the thread-local `nodes` and `stopFlag` of its search
// Optional hooks (macros; nothing when not defined):
//   PL_ON_RAISE(s, i)      a move raised the split point's alpha (under its lock): e.g. copy this thread's line below it
//   PL_ON_OPEN(s)          spRun opens s (e.g. no line yet);   PL_ON_CLOSE(s)   spRun is done with s (e.g. the node's line)
//   PL_ROOT_VAL(s, i, v)   the root's value of its move i (default: s->vals[i] = v); PL_ROOT_GET(s, j) (default: s->vals[j])
//   PL_WANT_A              keep the alpha the move was searched against in plA for PL_ROOT_VAL (e.g. a fail-low is no value)
//   PL_IDLE_HOOK(ms)       in mt_idle after the reset: e.g. send a thread elsewhere (return its nodes)
//   PL_NODES()             the nodes mt_idle returns (default: (double)nodes)
//   PL_MT_SPLIT            the game exports its own mt_split (it sets splitD and its own settings)
#ifndef PRALINE_YBW_H
#define PRALINE_YBW_H 1
#ifndef PL_ROOT_VAL
#define PL_ROOT_VAL(s, i, v) ((s)->vals[i] = (v))
#endif
#ifndef PL_ROOT_GET
#define PL_ROOT_GET(s, j) ((s)->vals[j])
#endif
#ifdef PL_WANT_A
static TLS PL_VAL plA;   // the alpha the move given to spResult was searched against
#define PL_SET_A(a) (plA = (a))
#else
#define PL_SET_A(a) ((void)0)
#endif
#ifndef PL_NODES
#define PL_NODES() ((double)nodes)
#endif
#ifdef SIM_STAT
static double ST[16];   // (a simulator's counters) 0 splits, 1 helper joins, 2 their moves, 3 empty joins, 4 idle ticks, 5 waiting ticks, 6 second searches
#define STAT(k, v) (ST[k] += (v))
EXPORT(mt_stat) double mt_stat(int k) { return ST[k]; }
#else
#define STAT(k, v) ((void)0)
#endif
// s or a split point above it was stopped, or the move idx of s (idx >= 0) or a move above it was finished by another
// thread (a straggler searched a second time)
static int chainStopped(const SPt *s, int idx) {
  for (int k = 0; s && k < 128; k++, idx = s->pidx, s = s->parent)
    if (__atomic_load_n(&s->stop, __ATOMIC_ACQUIRE) || (idx >= 0 && __atomic_load_n(&s->done[idx], __ATOMIC_ACQUIRE))) return 1;
  return 0;
}
static inline void spLock(SPt *s) { int z; do { z = 0; } while (!__atomic_compare_exchange_n(&s->lock, &z, 1, 0, __ATOMIC_ACQUIRE, __ATOMIC_RELAXED)); }
static inline void spUnlock(SPt *s) { __atomic_store_n(&s->lock, 0, __ATOMIC_RELEASE); }
static inline void spStop(SPt *s) { __atomic_store_n(&s->stop, 1, __ATOMIC_RELEASE); }
static void spFree(SPt *s) {   // closed, no helper left: a new sequence number, then the slot is free
  const int w = __atomic_load_n(&s->word, __ATOMIC_ACQUIRE);
  __atomic_store_n(&s->word, ((w >> 9) + 1) << 9, __ATOMIC_RELEASE);
  __atomic_store_n(&s->inuse, 0, __ATOMIC_RELEASE);
}
static int spJoin(SPt *s) {   // a helper is counted on the split point while it is open
  int w = __atomic_load_n(&s->word, __ATOMIC_ACQUIRE);
  for (;;) {
    if (!(w & 256) || (w & 255) == 255) return 0;
    if (__atomic_compare_exchange_n(&s->word, &w, w + 1, 0, __ATOMIC_ACQ_REL, __ATOMIC_ACQUIRE)) return 1;
  }
}
static inline void spLeave(SPt *s) { __atomic_sub_fetch(&s->word, 1, __ATOMIC_ACQ_REL); }
static void spResult(SPt *s, int i, PL_VAL v) {
  spLock(s);
  if (s->root) PL_ROOT_VAL(s, i, v);
  if (v > s->best) {
    s->best = v; s->bestMove = s->mv[i];
    if (v > s->alpha && !s->all) {
      PL_ALPHA_STORE(s, v);
#ifdef PL_ON_RAISE
      PL_ON_RAISE(s, i);
#endif
      if (v >= s->beta) spStop(s);
    }
  }
  __atomic_store_n(&s->done[i], 1, __ATOMIC_RELEASE);   // (a second search of it stops: chainStopped)
  spUnlock(s);
}
// take moves of s until none is left (the owner and the helpers); returns the number of moves taken
static int spWork(SPt *s, int owner) {
  for (int done = 0;; done++) {
    if (chainStopped(s, -1)) return done;
    const int i = __atomic_fetch_add(&s->next, 1, __ATOMIC_ACQ_REL);
    if (i >= s->n) return done;
    const PL_VAL a = PL_ALPHA_LOAD(s);
    if (a >= s->beta && !s->all) return done;
    __atomic_store_n(&s->busy[i], 1, __ATOMIC_RELEASE);
    curIdx = i;
    const PL_VAL v = spSearch(s, i, a);
    curIdx = -1;
    if (stopFlag) {
      if (stopFlag == 2 && !chainStopped(s, -1)) { stopFlag = 0; continue; }   // (another thread finished this move first)
      if (owner || stopFlag == 1 || stopFlag == 3) { if (owner) spStop(s); return done + 1; }
      stopFlag = 0; continue;   // (a helper: this split point or one above it was stopped — the check above leaves)
    }
    if (v >= s->beta && !s->root) spCutoff(s, i);   // (this thread's killers / history, as the one-thread cut-off)
    PL_SET_A(a);
    spResult(s, i, v);
  }
}
static int spWanted(void) {
  for (const SPt *s = curSP; s; s = s->parent) if (s->waiting) return 1;
  return 0;
}
static TLS const SPt *dupZ, *dupUnder; static TLS int dupJ;
static int isBelow(const SPt *y, const SPt *s) { for (int k = 0; y && k < 128; k++) { y = y->parent; if (y == s) return 1; } return 0; }
// y is in this thread's own part of the move it searches a second time
static int dupBelow(const SPt *y) {
  int mine = 0;
  for (int k = 0; y && k < 128; k++, y = y->parent) { if (y->own == (const void *)&curIdx) mine = 1; if (y->parent == dupZ && y->pidx == dupJ) return mine; }
  return 0;
}
// an idle thread: the open split point with the most work left (only those below `under` when it is set)
static SPt *spFind(const SPt *under) {
  SPt *bs = 0; int bw = -(1 << 30);
  for (int i = 0, hi = gSPHi; i < hi; i++) {
    SPt *y = SPS + i;
    if (!__atomic_load_n(&y->inuse, __ATOMIC_ACQUIRE)) continue;
    const int w = __atomic_load_n(&y->word, __ATOMIC_ACQUIRE);
    if (!(w & 256) || __atomic_load_n(&y->next, __ATOMIC_ACQUIRE) >= y->n || y->stop) continue;
    const int work = y->depth * 4 + (y->root ? 1000 : 0) - (w & 255);
    if (work > bw && (!under || isBelow(y, under)) && !chainStopped(y, -1) && !(dupMode && dupBelow(y))) { bw = work; bs = y; }
  }
  return bs;
}
static int dupLeave(void) { return spFind(dupUnder) != 0; }
// nothing to join: a move another thread is still searching (the oldest one of the highest split point; only at or below
// `under` when it is set), searched a second time with the shared table — the first to finish counts, the other stops
static SPt *spFindDup(const SPt *under, int *pj) {
  SPt *bs = 0; int bw = -(1 << 30), bj = -1;
  for (int i = 0, hi = gSPHi; i < hi; i++) {
    SPt *y = SPS + i;
    if (!__atomic_load_n(&y->inuse, __ATOMIC_ACQUIRE) || y->stop) continue;
    const int w = __atomic_load_n(&y->word, __ATOMIC_ACQUIRE);
    if (!(w & 256) && !(w & 255)) continue;
    const int work = y->depth * 4 + (y->root ? 1000 : 0);
    if (work <= bw || (under && y != under && !isBelow(y, under)) || chainStopped(y, -1)) continue;
    const int n = y->n < SP_MV ? y->n : SP_MV; int j = -1;
    for (int q = 0; q < n; q++) if (y->busy[q] && !y->done[q] && !y->dup[q]) { j = q; break; }
    if (j >= 0) { bw = work; bs = y; bj = j; }
  }
  *pj = bj;
  return bs;
}
static int spDup(SPt *y, int j, const SPt *under) {   // 1 when it searched (a part of) the move
  int w = __atomic_load_n(&y->word, __ATOMIC_ACQUIRE);
  for (;;) {   // (counted on it while it is open or a helper is still there: the owner frees it only at 0)
    if ((!(w & 256) && !(w & 255)) || (w & 255) == 255) return 0;
    if (__atomic_compare_exchange_n(&y->word, &w, w + 1, 0, __ATOMIC_ACQ_REL, __ATOMIC_ACQUIRE)) break;
  }
  if (y->stop || (under && y != under && !isBelow(y, under)) || __atomic_exchange_n(&y->dup[j], 1, __ATOMIC_ACQ_REL) || __atomic_load_n(&y->done[j], __ATOMIC_ACQUIRE)) { spLeave(y); return 0; }
  SPt *const saved = curSP; const int savedIdx = curIdx, top = spTop();
  spLoadPos(y, under ? top + 1 : 0, 1);
  curSP = y; curIdx = j;
  dupMode = 1; dupZ = y; dupJ = j; dupUnder = under;
  const PL_VAL a = PL_ALPHA_LOAD(y);
  if ((a < y->beta || y->all) && !chainStopped(y, j)) { const PL_VAL v = spSearch(y, j, a); if (!stopFlag) { PL_SET_A(a); spResult(y, j, v); } }
  dupMode = 0;
  if (stopFlag == 3) stopFlag = 0;
  curSP = saved; curIdx = savedIdx;
  if (under) spLoadPos(under, top, 0);
  spLeave(y);
  return 1;
}
// join y and take its moves (a helper, or an owner waiting for the helpers of its split point `under`)
static int spHelp(SPt *y, const SPt *under) {   // returns the number of moves it took
  if (!spJoin(y)) return 0;
  if (y->stop || __atomic_load_n(&y->next, __ATOMIC_ACQUIRE) >= y->n || (under && !isBelow(y, under))) { spLeave(y); return 0; }
  SPt *const saved = curSP; const int savedIdx = curIdx, top = spTop();
  spLoadPos(y, under ? top + 1 : 0, 1);
  curSP = y;
  const int k = spWork(y, 0);
  curSP = saved; curIdx = savedIdx;
  if (under) spLoadPos(under, top, 0);
  spLeave(y);
  return k;
}
static void spRun(SPt *s, PL_VAL *best, Move *bestM, PL_VAL *vals) {
  STAT(0, 1);
  s->alpha = s->alpha > *best ? s->alpha : *best; s->best = *best; s->bestMove = *bestM; s->next = 0; s->stop = 0; s->lock = 0; s->waiting = 0;
  for (int i = 0; i < s->n; i++) { s->busy[i] = 0; s->done[i] = 0; s->dup[i] = 0; }
  s->pidx = curSP ? curIdx : -1; s->own = (const void *)&curIdx; s->parent = curSP;
#ifdef PL_ON_OPEN
  PL_ON_OPEN(s);
#endif
  { const int w = __atomic_load_n(&s->word, __ATOMIC_ACQUIRE); __atomic_store_n(&s->word, (w & ~511) | 256, __ATOMIC_RELEASE); }   // open
  __atomic_add_fetch(&gOpenN, 1, __ATOMIC_ACQ_REL);
  SPt *const saved = curSP; const int savedIdx = curIdx;
  curSP = s;
  spWork(s, 1);
  __atomic_and_fetch(&s->word, ~256, __ATOMIC_ACQ_REL);   // closed: no more joins
  __atomic_sub_fetch(&gOpenN, 1, __ATOMIC_ACQ_REL);
  int ab = stopFlag;
  if (ab) spStop(s);
  stopFlag = 0;
  int w8 = 0;
  while (__atomic_load_n(&s->word, __ATOMIC_ACQUIRE) & 255) {   // the helpers still on it: help below it meanwhile
    SPt *y = s->stop || !gOpenN ? 0 : spFind(s);
    if (y) { if (w8) { w8 = 0; s->waiting = 0; __atomic_sub_fetch(&gWaitN, 1, __ATOMIC_ACQ_REL); } if (spHelp(y, s)) y = s; else y = 0; }
    else if (!s->stop && !dupMode) {   // nothing to help: a straggler below it, searched a second time
      int j; SPt *z = spFindDup(s, &j);
      if (z && spDup(z, j, s)) { STAT(6, 1); y = s; }
    }
    if (!y) {
      if (!w8 && !s->stop) { w8 = 1; s->waiting = 1; __atomic_add_fetch(&gWaitN, 1, __ATOMIC_ACQ_REL); }   // (its helpers split for it)
      STAT(5, 1); waitCheck();
    }
    if (stopFlag == 1 || stopFlag == 3) { ab = stopFlag; spStop(s); }
    stopFlag = 0;
  }
  if (w8) { s->waiting = 0; __atomic_sub_fetch(&gWaitN, 1, __ATOMIC_ACQ_REL); }
  curSP = saved; curIdx = savedIdx;
  if (!ab && gStop) ab = 1;
  if (chainStopped(saved, savedIdx)) { if (!ab) ab = 2; }   // above it was stopped: this result is not complete
  else if (ab == 2) ab = 0;                                 // its own cut-off (best >= beta)
  stopFlag = ab;
  *best = s->best; *bestM = s->bestMove;
#ifdef PL_ON_CLOSE
  PL_ON_CLOSE(s);
#endif
  if (vals) for (int j = 0; j < s->n; j++) if (s->done[j]) vals[j] = PL_ROOT_GET(s, j);
  spFree(s);
}
#ifndef PL_MT_SPLIT   // (a game with its own mt_split: more settings)
EXPORT(mt_split) void mt_split(int d) { if (d > 0) splitD = d; }
#endif
// a helper thread (the page's helper worker calls it): take moves at the split points until the search is over (mt_stop) — or, with ms > 0, until it
// has nothing to do after ms milliseconds (the page then counts its nodes and calls again); returns its nodes. fresh: a new
// job (spIdleReset: the history decays and the killers are cleared, as the game's search does when it begins)
EXPORT(mt_idle) double mt_idle(double ms, int fresh) {
  spIdleReset(fresh); stopFlag = 0; curSP = 0; curIdx = -1; dupMode = 0;
#ifdef PL_IDLE_HOOK
  PL_IDLE_HOOK(ms);
#endif
  const double t0 = ms > 0 ? now() : 0;
  __atomic_add_fetch(&gIdle, 1, __ATOMIC_ACQ_REL);
  while (!__atomic_load_n(&gStop, __ATOMIC_ACQUIRE)) {
    SPt *y = gOpenN > 0 ? spFind(0) : 0;
    if (!y) {
      if (ms > 0 && now() - t0 > ms) break;
      int j; SPt *z = spFindDup(0, &j);
      if (!z || !spDup(z, j, 0)) { STAT(4, 1); SIM_IDLE(); } else STAT(6, 1);
      stopFlag = 0;
      continue;
    }
    __atomic_sub_fetch(&gIdle, 1, __ATOMIC_ACQ_REL);
    { const int k = spHelp(y, 0); if (!k) { STAT(3, 1); STAT(4, 1); SIM_IDLE(); } else { STAT(1, 1); STAT(2, k); } }
    stopFlag = 0;
    __atomic_add_fetch(&gIdle, 1, __ATOMIC_ACQ_REL);
  }
  __atomic_sub_fetch(&gIdle, 1, __ATOMIC_ACQ_REL);
  stopFlag = 0;
  return PL_NODES();
}
#endif
