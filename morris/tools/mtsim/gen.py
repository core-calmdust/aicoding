# The multi-thread simulation of engine_mt.wasm (2026-11-10, MODEL_CARD.md「マルチスレッドの見直し その2」).
# Makes eng_sim.c (a native copy of ../../engine.c with -DMT) for sim.c: every thread advances SIM_Q nodes per round,
# the clock is the round count; option "delay": a thread's table stores (and busy marks) reach the others only at the
# end of the round — true concurrency. Without it the threads take turns on the cores and see each other's finished
# subtrees at once, which predicted x2.5 / x4.9 at 4 / 8 threads where the Mac measured x1.5 / x1.5; with it the old
# engine gives x1.22 / x1.43 / x1.71 (2 / 4 / 8), as the Mac.
#   (in a scratch folder with copies of sim.c, simhook.h, dump.js — the generated files stay out of the repository)
#   python3 gen.py <repo>/morris/engine.c && node dump.js <repo>/morris && gcc -O2 -DMT -DBUSYSIM -w -o sim sim.c -lpthread -lm
#   ./sim 1,2,4,8 13 -1 0 0 1 1 1 1      (threads, 1-thread budget in M nodes → the depth D, positions (-1 all / 0,3,…),
#                                          jitter, fresh helpers, main speed, lockstep, delayed stores, delayed marks)
import sys
s = open(sys.argv[1] if len(sys.argv) > 1 else '../../engine.c').read()
i = s.index('// ---------------------------------------------------------------- threads (engine_mt.wasm')
s = s[:i] + '#endif\n'
s = s.replace('#define EXPORT(name) __attribute__((export_name(#name)))', '#define EXPORT(name)')
s = s.replace('#define IMPORT(name) __attribute__((import_module("env"), import_name(#name)))', '#define IMPORT(name)\n#include "simhook.h"')
a = 'if (((long long)(++nodes) & 2047) == 0) checkAbort();'
assert a in s
s = s.replace(a, '++nodes; if (nodes >= simNext) { simNext += simQT; sim_tick(); checkAbort(); }')
s = s.replace('static TLS double nodes, maxNodes, deadline; static TLS int aborted;', 'static TLS double nodes, maxNodes, deadline, simNext; static TLS int aborted;')
s = s.replace('  nodes = 0; aborted = 0;', '  nodes = 0; simNext = simQT; aborted = 0;')
s = s.replace('  nodes = 0; deadline = 1e300;', '  nodes = 0; simNext = simQT; deadline = 1e300;')   # (YBW, 2026-11-11: mt_idle)
s = s.replace('extern unsigned char __heap_base;\nEXPORT(heap_ptr) u8 *heap_ptr(void) { return &__heap_base; }', '')
a = "      if (threadId && d >= gGoal && gGoalKey == rk) gHit = rk;"
if a in s: s = s.replace(a, "#ifndef NOHIT\n" + a + "\n#endif")
# delayed table stores
s = s.replace("static inline int ttLoad(const Pos *p,", "static inline int ttLoadS(const Pos *p,", 1)
s = s.replace("static void ttSave(const Pos *p,", "static void ttSaveS(const Pos *p,", 1)
end = "  bk[2 * j + 1] = w; bk[2 * j] = key ^ w;\n}\n"
assert s.count(end) == 1
s = s.replace(end, end + r'''
#define PEND_MAX 16384
#define PH 32768
typedef struct { u32 h1, h2; int sv, m, d, f; } PendE;
static int simDelay;
static TLS PendE *pend; static TLS int npend; static TLS int *pidx;
static Pos simTmp;
static inline int ttLoad(const Pos *p, int *m, int *d, int *v, int *f) {
  if (simDelay && npend)
    for (u32 h = p->h1 & (PH - 1); pidx[h]; h = (h + 1) & (PH - 1)) {
      PendE *e = &pend[pidx[h] - 1];
      if (e->h1 == p->h1 && e->h2 == p->h2) { *v = e->sv; *m = e->m; *d = e->d; *f = e->f; return 1; }
    }
  return ttLoadS(p, m, d, v, f);
}
static void ttSave(const Pos *p, int sv, int m, int d, int f) {
  if (!simDelay || npend >= PEND_MAX) { ttSaveS(p, sv, m, d, f); return; }
  u32 h = p->h1 & (PH - 1);
  for (; pidx[h]; h = (h + 1) & (PH - 1)) { PendE *e = &pend[pidx[h] - 1]; if (e->h1 == p->h1 && e->h2 == p->h2) { e->sv = sv; e->m = m; e->d = d; e->f = f; return; } }
  PendE *e = &pend[npend++]; e->h1 = p->h1; e->h2 = p->h2; e->sv = sv; e->m = m; e->d = d; e->f = f; pidx[h] = npend;
}
static void flushPend(PendE *pe, int n, int *px) {
  for (int i = 0; i < n; i++) { simTmp.h1 = pe[i].h1; simTmp.h2 = pe[i].h2; ttSaveS(&simTmp, pe[i].sv, pe[i].m, pe[i].d, pe[i].f);
    for (u32 h = pe[i].h1 & (PH - 1); px[h]; h = (h + 1) & (PH - 1)) px[h] = 0; }
}
''')
# delayed busy marks
if 'busySet' in s:
    s = s.replace("static inline int busySet(const Pos *p) {", "static inline int busySetS(const Pos *p) {", 1)
    s = s.replace("static inline void busyClear(const Pos *p, int i) {", "static inline void busyClearS(const Pos *p, int i) {", 1)
    anchor = "static void checkAbort(void) {"
    k = s.index(anchor)
    s = s[:k] + r'''static int busyDelay;
static TLS int bpIdx[4096]; static TLS u64 bpVal[4096]; static TLS int nbp;
static inline int busySet(const Pos *p) {
  if (!busyDelay || nbp >= 4096) return busySetS(p);
  int i = (int)(p->h2 & ((1u << BUSY_BITS) - 1));
  bpIdx[nbp] = i; bpVal[nbp++] = busyKey(p) | (u64)((threadId & 63) + 1); return i;
}
static inline void busyClear(const Pos *p, int i) {
  if (busyDelay) { u64 mine = busyKey(p) | (u64)((threadId & 63) + 1);
    for (int k = nbp - 1; k >= 0; k--) if (bpIdx[k] == i && bpVal[k] == mine) { bpVal[k] = 0; return; } }
  busyClearS(p, i);
}
static void busyFlushMine(void) { for (int k = 0; k < nbp; k++) if (bpVal[k]) busyT[bpIdx[k]] = bpVal[k]; nbp = 0; }
''' + s[k:]
open('eng_sim.c', 'w').write(s)
