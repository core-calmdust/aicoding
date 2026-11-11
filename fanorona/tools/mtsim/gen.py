# The "truly concurrent" multi-thread simulation of engine_mt.wasm (2026-11-10, as morris/tools/mtsim; claude/fanorona-spec.md
# 「マルチスレッドの見直し その2」). Makes eng_sim.c (a native copy of ../../engine.c with -DNATIVE -DMT) for sim.c: every
# thread advances SIM_Q nodes per round, the clock is the round count; with "delay" a thread's table stores (and busy
# marks) reach the others only at the end of the round, as when the threads really run at the same time.
#   (in a scratch folder with copies of sim.c, dump.js — the generated files stay out of the repository;
#    evalnet.bin, egdb.bin there: gunzip -c <repo>/fanorona/evalnet.bin.gz > evalnet.bin, the same for egdb)
#   python3 gen.py <repo>/fanorona/engine.c && node dump.js <repo>/fanorona
#   gcc -O3 -march=native -DNATIVE -DMT -w -o sim sim.c -lpthread -lm
#   ./sim 1,2,4,8 3 -1 1 1      (threads, 1-thread budget in M nodes → the depth D, positions (-1 all / 0,3,…),
#                                 delayed stores, delayed marks)
import sys
s = open(sys.argv[1] if len(sys.argv) > 1 else '../../engine.c').read()
i = s.index('#ifdef MT\n// ---------------------------------------------------------------- threads (engine_mt.wasm')
s = s[:i]
s = s.replace('#include <stdint.h>', '#include <stdint.h>\n#ifndef SIM_Q\n#define SIM_Q 1024\n#endif\nstatic void sim_tick(void);\n'
              '// (2026-11-11, YBW) a thread\'s nodes per round: SIM_Q, or 2/5 of it on a slow core (sim.c, SIM_SLOW); an idle thread\n'
              '// (a helper waiting for a split point, an owner waiting for its helpers) spends one round per check\n'
              'static _Thread_local double simQT = SIM_Q;\n#define SIM_IDLE() do { simNext = (double)nodes + simQT; sim_tick(); } while (0)', 1)
a = "  if ((nodes & 1023) == 0) { if ((tEnd > 0 && now() > tEnd) || (nodeLimit_on && nodes > nodeLimit) || gStop || (rootK && gHit == rootK)) stopFlag = 1; }"
if a not in s: a = "  if ((nodes & 1023) == 0) {\n    if ((tEnd > 0 && now() > tEnd) || (nodeLimit_on && nodes > nodeLimit) || gStop || (rootK && gHit == rootK)) stopFlag = 1;"   # (YBW, 2026-11-11)
assert s.count(a) == 1
s = s.replace(a, "  if (nodes >= simNext) { simNext += simQT; sim_tick(); }\n" + a)
a = "static TLS u64 nodes; static TLS double tEnd;"
assert a in s
s = s.replace(a, "static TLS u64 nodes; static TLS double simNext; static TLS double tEnd;")
a = "  stopFlag = 0; nodes = 0; tEnd"
assert s.count(a) == 1
s = s.replace(a, "  stopFlag = 0; nodes = 0; simNext = simQT; tEnd")
# delayed table stores
s = s.replace("static inline void ttGet(u64 key, TTE *e) {", "static inline void ttGetS(u64 key, TTE *e) {", 1)
s = s.replace("static void ttStore(u64 key, int d, int flag, int v, const Move *m, int ply) {\n  u64 *bk", "static void ttStoreS(u64 key, int d, int flag, int v, const Move *m, int ply) {\n  u64 *bk", 1)
end = "  bk[3 * j + 1] = w; bk[3 * j + 2] = c; bk[3 * j] = key ^ w ^ c;\n}\n"
assert s.count(end) == 1
s = s.replace(end, end + r'''
#define PEND_MAX 16384
#define PH 32768
typedef struct { u64 key; int d, flag, v; Move m; } PendE;
static int simDelay;
static TLS PendE *pend; static TLS int npend; static TLS int *pidx;
static inline void ttGet(u64 key, TTE *e) {
  if (simDelay && npend)
    for (u32 h = key & (PH - 1); pidx[h]; h = (h + 1) & (PH - 1)) {
      PendE *x = &pend[pidx[h] - 1];
      if (x->key == key) { e->key = key; e->cap = x->m.cap; e->v = (i16)x->v; e->f = x->m.f; e->t = x->m.t; e->d = (i8)(x->d > 120 ? 120 : x->d); e->flag = (u8)x->flag; e->age = ttAge; return; }
    }
  ttGetS(key, e);
}
static void ttStore(u64 key, int d, int flag, int v, const Move *m, int ply) {
  if (!simDelay || !m || npend >= PEND_MAX) { ttStoreS(key, d, flag, v, m, ply); return; }
  u32 h = key & (PH - 1); PendE *x = 0;
  for (; pidx[h]; h = (h + 1) & (PH - 1)) if (pend[pidx[h] - 1].key == key) { x = &pend[pidx[h] - 1]; break; }
  if (!x) { x = &pend[npend++]; pidx[h] = npend; }
  x->key = key; x->d = d; x->flag = flag; x->v = vToTT(v, ply); x->m = *m;
}
static void flushPend(PendE *pe, int n, int *px) {
  for (int i = 0; i < n; i++) { ttStoreS(pe[i].key, pe[i].d, pe[i].flag, pe[i].v, &pe[i].m, 0);
    for (u32 h = pe[i].key & (PH - 1); px[h]; h = (h + 1) & (PH - 1)) px[h] = 0; }
}
''')
# delayed busy marks
if 'busySet' in s:
    s = s.replace("static inline int busySet(u64 key) {", "static inline int busySetS(u64 key) {", 1)
    s = s.replace("static inline void busyClear(u64 key, int i) {", "static inline void busyClearS(u64 key, int i) {", 1)
    anchor = "static inline int timeUp(void) {"
    k = s.index(anchor)
    s = s[:k] + r'''static int busyDelay;
static TLS int bpIdx[4096]; static TLS u64 bpVal[4096]; static TLS int nbp;
static inline int busySet(u64 key) {
  if (!busyDelay || nbp >= 4096) return busySetS(key);
  int i = (int)((key >> 32) & ((1u << BUSY_BITS) - 1));
  bpIdx[nbp] = i; bpVal[nbp++] = (key & ~63ull) | (u64)((threadId & 63) + 1); return i;
}
static inline void busyClear(u64 key, int i) {
  if (busyDelay) { u64 mine = (key & ~63ull) | (u64)((threadId & 63) + 1);
    for (int k = nbp - 1; k >= 0; k--) if (bpIdx[k] == i && bpVal[k] == mine) { bpVal[k] = 0; return; } }
  busyClearS(key, i);
}
static void busyFlushMine(void) { for (int k = 0; k < nbp; k++) if (bpVal[k]) busyT[bpIdx[k]] = bpVal[k]; nbp = 0; }
#define HAVE_BUSY 1
''' + s[k:]
a = '  nodes = 0; tEnd = 0; nodeLimit_on = 0; rootK = 0;'   # (YBW, 2026-11-11: mt_idle)
if a in s: s = s.replace(a, '  nodes = 0; simNext = simQT; tEnd = 0; nodeLimit_on = 0; rootK = 0;')
open('eng_sim.c', 'w').write(s)
