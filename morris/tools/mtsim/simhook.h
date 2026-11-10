#ifndef SIM_Q
#define SIM_Q 1024
#endif
static double now(void);
static void progress(int d, int c) { (void)d; (void)c; }
static void sim_tick(void);
