# "Truly concurrent" variant of engine_mt.wasm for tools/mt-sim.js (2026-11-10, as morris/tools/mtsim; MODEL_CARD.md
# 「マルチスレッドの見直し その2」). mt-sim.js runs the threads in lockstep (every check of the clock), but every store to the
# shared table is seen by the others at once, so a thread that comes second always finds the other's finished subtree —
# on the Mac the threads run at the same time and search the same subtree together (morris: such a simulation said x2.5 at
# 4 threads, the Mac x1.5). This build keeps each thread's midgame table stores (and busy marks) in a buffer of its own
# until its next check of the clock (every SIM_Q nodes; the others see them only then); the thread itself sees them at once.
# mt-sim.js --delay turns it on for more than one thread (sim_delay). Build (in a scratch folder):
#   python3 mtsim-delay.py <repo>/reversi/engine.c > engine_sim.c
#   clang --target=wasm32 -O3 -msimd128 -matomics -mbulk-memory -DMT -nostdlib -fno-builtin -w -Wl,--no-entry -Wl,--export-dynamic \
#     -Wl,--shared-memory -Wl,--import-memory -Wl,--max-memory=1073741824 -Wl,--allow-undefined -o engine_sim.wasm engine_sim.c
#   node <repo>/reversi/tools/mt-sim.js --wasm engine_sim.wasm --delay --threads 1,2,4,8 --budget 3e6 --gen 8
import sys
s = open(sys.argv[1]).read()
Q = sys.argv[2] if len(sys.argv) > 2 else '1024'
a = "  if (((long long)(++nodes) & 4095) == 0) { checkTime(); if (aborted) return 0; }"
if "#define CHK_Q 4096" in s:   # (2026-11-10: the MT build checks the clock every CHK_Q nodes of any kind, solver included)
    s = s.replace("#define CHK_Q 4096", "#define CHK_Q " + Q, 1)
else:
    assert s.count(a) == 1
    s = s.replace(a, a.replace('4095', str(int(Q) - 1)))
a = "static inline void checkTime(void) {\n"
assert s.count(a) == 1
s = s.replace(a, "static void simFlush(void);\n" + a + "  simFlush();\n")
s = s.replace("static inline TTE *ttFind(u64 P, u64 O, u32 h, u64 *out) {", "static inline TTE *ttFindS(u64 P, u64 O, u32 h, u64 *out) {", 1)
s = s.replace("static void ttStore(u64 P, u64 O, u32 h, int depth, int move, int lo, int hi) {", "static void ttStoreS(u64 P, u64 O, u32 h, int depth, int move, int lo, int hi) {", 1)
end = "  r->dt = nd; r->k1 = P ^ nd; r->k2 = O ^ nd;\n}\n"
assert s.count(end) == 1
s = s.replace(end, end + r'''
#define PEND_MAX 4096
#define PH 8192
typedef struct { u64 P, O; u32 h; int depth, move, lo, hi; } PendE;
static int simDelay, busyDelay;
EXPORT(sim_delay) void sim_delay(int stores, int marks) { simDelay = stores; busyDelay = marks; }
static TLS PendE pend[PEND_MAX]; static TLS int npend; static TLS short pidx[PH];
static TTE simDummy;
static inline TTE *ttFind(u64 P, u64 O, u32 h, u64 *out) {
  if (npend)
    for (u32 k = h & (PH - 1); pidx[k]; k = (k + 1) & (PH - 1)) {
      const PendE *e = &pend[pidx[k] - 1];
      if (e->P == P && e->O == O) { *out = (u64)(u32)(e->lo + 32768) | (u64)(u32)(e->hi + 32768) << 16 | (u64)(u32)(e->depth + 1) << 32 | (u64)(u8)e->move << 40 | (u64)TT_AGE << 48; return &simDummy; }
    }
  return ttFindS(P, O, h, out);
}
static void ttStore(u64 P, u64 O, u32 h, int depth, int move, int lo, int hi) {
  if (!simDelay || npend >= PEND_MAX) { ttStoreS(P, O, h, depth, move, lo, hi); return; }
  u64 d; if (ttFindS(P, O, h, &d) && DT_D(d) > depth && DT_A(d) == TT_AGE) return;   /* (as ttStore: a deeper entry of this search stays) */
  u32 k = h & (PH - 1); PendE *e = 0;
  for (; pidx[k]; k = (k + 1) & (PH - 1)) if (pend[pidx[k] - 1].P == P && pend[pidx[k] - 1].O == O) { e = &pend[pidx[k] - 1]; break; }
  if (e && e->depth > depth) return;
  if (!e) { e = &pend[npend++]; pidx[k] = (short)npend; }
  e->P = P; e->O = O; e->h = h; e->depth = depth; e->move = move; e->lo = lo; e->hi = hi;
}
static void busyFlushMine(void);
static void simFlush(void) {
  for (int i = 0; i < npend; i++) { ttStoreS(pend[i].P, pend[i].O, pend[i].h, pend[i].depth, pend[i].move, pend[i].lo, pend[i].hi);
    for (u32 k = pend[i].h & (PH - 1); pidx[k]; k = (k + 1) & (PH - 1)) pidx[k] = 0; }
  npend = 0;
  busyFlushMine();
}
''')
if 'busySet' in s:
    s = s.replace("static inline int busySet(u64 k) {", "static inline int busySetS(u64 k) {", 1)
    s = s.replace("static inline void busyClear(u64 k, int i) {", "static inline void busyClearS(u64 k, int i) {", 1)
    anchor = "static TLS int ROT1;"
    s = s.replace(anchor, r'''static TLS int bpIdx[1024]; static TLS u64 bpVal[1024]; static TLS int nbp;
static inline int busySet(u64 k) {
  if (!busyDelay || nbp >= 1024) return busySetS(k);
  int i = (int)(k >> (64 - BUSY_BITS));
  bpIdx[nbp] = i; bpVal[nbp++] = (k & ~63ull) | (u64)busyMe(); return i;
}
static inline void busyClear(u64 k, int i) {
  if (busyDelay) { u64 mine = (k & ~63ull) | (u64)busyMe();
    for (int j = nbp - 1; j >= 0; j--) if (bpIdx[j] == i && bpVal[j] == mine) { bpVal[j] = 0; return; } }
  busyClearS(k, i);
}
static void busyFlushMine(void) { for (int j = 0; j < nbp; j++) if (bpVal[j]) busyT[bpIdx[j]] = bpVal[j]; nbp = 0; }
''' + anchor, 1)
else:
    s = s.replace("static void busyFlushMine(void);\n", "static void busyFlushMine(void) {}\n")
# (2026-11-10, v4.1) counters of the YBW split points for mt-sim.js (mt_stat): 0/1 splits (midgame/solver), 2 the helpers'
# moves, 3 their joins, 4 empty joins, 5 idle checks of the clock, 6 an owner's waiting checks, 8 helper moves cut short,
# 9 second searches of a straggler's move (spDup)
def rep(a, b):
    global s
    assert s.count(a) == 1, a
    s = s.replace(a, b)
if 'spDup' in s:
    rep("static SPt SPS[NSP] __attribute__((aligned(64)));", "static SPt SPS[NSP] __attribute__((aligned(64)));\nstatic double ST[16];\nEXPORT(mt_stat) double mt_stat(int k) { return ST[k]; }\nEXPORT(mt_stat_reset) void mt_stat_reset(void) { for (int i = 0; i < 16; i++) ST[i] = 0; }\n")
    rep("  SPt *s = spAlloc(); if (!s) return 0;\n", "  SPt *s = spAlloc(); if (!s) return 0;\n  ST[kind]++;\n")
    rep("      if (!z) { (void)now(); continue; }", "      if (!z) { ST[5]++; (void)now(); continue; }")
    rep("      if (!spDup(z, j, 0)) (void)now();", "      if (!spDup(z, j, 0)) { ST[5]++; (void)now(); } else ST[9]++;")
    rep("      if (z && spDup(z, j, s)) y = s;", "      if (z && spDup(z, j, s)) { ST[9]++; y = s; }")
    rep("    if (!spHelp(y, 0)) (void)now();", "    { const int k = spHelp(y, 0); if (!k) { ST[4]++; ST[5]++; (void)now(); } else { ST[3]++; ST[2] += k; } }")
    rep("      checkTime();   /* (the lead's deadline", "      ST[6]++; checkTime();   /* (the lead's deadline")
    rep("      aborted = 0; continue;   /* (a helper", "      ST[8]++; aborted = 0; continue;   /* (a helper")
sys.stdout.write(s)
