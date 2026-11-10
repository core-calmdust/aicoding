// The "truly concurrent" lockstep simulation of a Lazy SMP engine_mt.wasm on the 2-core work machine (2026-11-10; the
// method of morris/tools/mtsim, see claude/game-conventions-addendum.md). gen.py puts this at the top of a native copy of
// <game>/engine.c (eng_<game>.c) and routes the shared table's (and the busy marks') word reads / writes through SIMR / SIMW.
// Every thread advances SIM_Q nodes per round (sim_tick at each node), the clock is the round count. With simDelay a
// thread's writes to the shared table stay in its own store buffer (it reads them back itself) and reach the other threads
// only at the end of the round — the threads really search at the same time. busyDelay: the busy marks too (the cautious
// case). The real threads run concurrently on the machine's cores, but within a round no thread sees another's writes, so
// the result hardly depends on the scheduling (shared tables other than these, e.g. shogi's continuation history, do).
#include <pthread.h>
#include <stdint.h>
#include <stdlib.h>
#ifndef SIM_Q
#define SIM_Q 1024
#endif
#define SIM_PMAX 32768
#define SIM_PH 65536
typedef struct { unsigned long long *a; unsigned long long v; int h; } SimPE;
static int simDelay, busyDelay;
static _Thread_local SimPE *simP; static _Thread_local int simN, simOn, simCnt, simQ = SIM_Q; static _Thread_local int *simX;
static double simJit; static _Thread_local unsigned simR = 1;   // jitter: a thread's nodes per round SIM_Q x (1 ± simJit), uneven cores
// (2026-11-10) slow cores (Apple's efficiency cores): with SIM_SLOW=k in the environment the threads k, k+1, … search 2/5 of
// SIM_Q nodes per round (the M4 Pro: 10 performance + 4 efficiency cores → SIM_SLOW=10; reversi's model: SIM_SLOW=8)
static int simSlowFrom = 1 << 30; static _Thread_local int simQB = SIM_Q;
static SimPE *simAllP[64]; static int *simAllN[64], *simAllX[64];
static inline unsigned simH(const void *a) { unsigned long long x = (unsigned long long)(uintptr_t)a >> 3; x *= 0x9E3779B97F4A7C15ull; return (unsigned)(x >> 40) & (SIM_PH - 1); }
static inline unsigned long long SIMR(unsigned long long *a) {
  if (simN) for (unsigned h = simH(a); simX[h]; h = (h + 1) & (SIM_PH - 1)) { SimPE *e = &simP[simX[h] - 1]; if (e->a == a) return e->v; }
  return *(volatile unsigned long long *)a;
}
static inline void simPut(unsigned long long *a, unsigned long long v) {
  unsigned h = simH(a);
  for (; simX[h]; h = (h + 1) & (SIM_PH - 1)) { SimPE *e = &simP[simX[h] - 1]; if (e->a == a) { e->v = v; return; } }
  if (simN >= SIM_PMAX) { *a = v; return; }
  simP[simN].a = a; simP[simN].v = v; simP[simN].h = (int)h; simX[h] = ++simN;
}
static inline void SIMW(unsigned long long *a, unsigned long long v) { if (simDelay && simOn) simPut(a, v); else *a = v; }
// the busy marks: a store, and "clear if it is still mine"
static inline void SIMWB(unsigned long long *a, unsigned long long v) { if (simDelay && busyDelay && simOn) simPut(a, v); else __atomic_store_n(a, v, __ATOMIC_RELAXED); }
static inline void SIMCB(unsigned long long *a, unsigned long long mine) {
  if (simDelay && busyDelay && simOn) { if (SIMR(a) == mine) simPut(a, 0); return; }
  __atomic_compare_exchange_n(a, &mine, 0, 0, __ATOMIC_RELAXED, __ATOMIC_RELAXED);
}
static void simFlush(int id) {
  SimPE *p = simAllP[id]; int n = *simAllN[id], *x = simAllX[id];
  for (int i = 0; i < n; i++) { *p[i].a = p[i].v; x[p[i].h] = 0; }
  *simAllN[id] = 0;
}
static void simThreadInit(int id) {
  static int once; if (!once) { once = 1; const char *e = getenv("SIM_SLOW"); if (e && *e) simSlowFrom = atoi(e); }
  simQB = simQ = id >= simSlowFrom ? SIM_Q * 2 / 5 : SIM_Q;
  simR = 0x9e3779b9u * (unsigned)(id + 1);
  simP = malloc(sizeof(SimPE) * SIM_PMAX); simN = 0; simX = calloc(SIM_PH, sizeof(int));
  simAllP[id] = simP; simAllN[id] = &simN; simAllX[id] = simX;
}
static void sim_tick(void);
#define SIM_NODE() do { if (simOn && ++simCnt >= simQ) { simCnt = 0; sim_tick(); } } while (0)
#define SIM_NODE_E() (simOn && ++simCnt >= simQ ? (simCnt = 0, sim_tick(), 0) : 0)
// (2026-11-10, YBW engines) a thread with nothing to do (a helper waiting for a split point, an owner waiting for its helpers)
// spends one round per check
#define SIM_IDLE() do { if (simOn) { simCnt = 0; sim_tick(); } } while (0)

// ---- the rounds
static pthread_mutex_t simMu = PTHREAD_MUTEX_INITIALIZER; static pthread_cond_t simCv = PTHREAD_COND_INITIALIZER;
static int simNp, simArrived; static long simGen, simRounds;
static void simEndRound(void) { for (int i = 0; i < 64; i++) if (simAllN[i] && *simAllN[i]) simFlush(i); simArrived = 0; simGen++; simRounds++; pthread_cond_broadcast(&simCv); }
static void sim_tick(void) {
  if (simJit > 0) { simR ^= simR << 13; simR ^= simR >> 17; simR ^= simR << 5; simQ = (int)(simQB * (1 - simJit + 2 * simJit * (simR / 4294967296.0))); if (simQ < 1) simQ = 1; }
  pthread_mutex_lock(&simMu);
  long g = simGen;
  if (++simArrived >= simNp) simEndRound();
  else while (simGen == g) pthread_cond_wait(&simCv, &simMu);
  pthread_mutex_unlock(&simMu);
}
static void simLeave(void) {   // this thread is done with the job: the others go on without it
  pthread_mutex_lock(&simMu);
  simOn = 0; simNp--;
  if (simNp > 0 && simArrived >= simNp) simEndRound();
  if (simNp == 0) for (int i = 0; i < 64; i++) if (simAllN[i] && *simAllN[i]) simFlush(i);
  pthread_mutex_unlock(&simMu);
}
