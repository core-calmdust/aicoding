#ifndef SIM_Q
#define SIM_Q 1024
#endif
static double now(void);
static void progress(int d, int c) { (void)d; (void)c; }
static void sim_tick(void);
// (2026-11-11, YBW) a thread's nodes per round: SIM_Q, or 2/5 of it on a slow core (SIM_SLOW=k in the environment: the
// threads k, k+1, … — Apple's efficiency cores); an idle thread (a helper waiting for a split point, an owner waiting for
// its helpers) spends one round per check
static _Thread_local double simQT = SIM_Q;
#define SIM_IDLE() do { simNext = nodes + simQT; sim_tick(); } while (0)
