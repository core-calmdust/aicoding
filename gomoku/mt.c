/*
 * The shared memory of the page's multi-threaded search (engine_mt.wasm, shared/mtengine.js) for the JavaScript engine
 * (engine.js): the search itself stays in JavaScript; this module only holds the transposition table that every thread reads
 * and writes (Lazy SMP) and gives shared/mtengine.js the thread exports it expects (each thread's slot, the stop flag).
 * The table has the layout of engine.js Engine (k1, k2, tv: Int32; td, tf: Int8; tm: Int16; 2^20 entries each), and the move
 * ordering's history (HIST: Int32, engine.js Engine.hist) is shared too (2026-11-09: with a history of its own every thread
 * searched other moves of the width-limited search, and the threads did not speed one another up). SPA: the split points of
 * the Young Brothers Wait search (2026-11-11, engine.js splitRun: 64 slots of 128 Int32 words, each slot on cache lines of its
 * own), GV: the pool's counters (engine.js G_IDLE …) on a line of their own.
 *
 * Build: clang --target=wasm32 -O2 -matomics -mbulk-memory -nostdlib -Wl,--no-entry -Wl,--export-dynamic -Wl,--shared-memory
 *        -Wl,--import-memory -Wl,--max-memory=268435456 -o engine_mt.wasm mt.c
 */
typedef int i32; typedef unsigned int u32; typedef signed char i8; typedef short i16;
#define EXPORT(name) __attribute__((export_name(#name)))
#define TT_SIZE (1 << 20)
static i32 K1[TT_SIZE], K2[TT_SIZE], TV[TT_SIZE];
static i16 TM[TT_SIZE];
static i8 TD[TT_SIZE], TF[TT_SIZE];
#define HIST_SIZE 2048   /* >= engine.js SIZE * 3 (1560) */
static i32 HIST[HIST_SIZE];
#define SP_SLOTS 64
#define SPW 128
static i32 SPA[SP_SLOTS * SPW] __attribute__((aligned(64)));
static i32 GV[16] __attribute__((aligned(64)));
static volatile int gStop;
static _Thread_local int threadId;
EXPORT(tt_size) i32 tt_size(void) { return TT_SIZE; }
EXPORT(tt_k1) u32 tt_k1(void) { return (u32)K1; }
EXPORT(tt_k2) u32 tt_k2(void) { return (u32)K2; }
EXPORT(tt_tv) u32 tt_tv(void) { return (u32)TV; }
EXPORT(tt_tm) u32 tt_tm(void) { return (u32)TM; }
EXPORT(tt_td) u32 tt_td(void) { return (u32)TD; }
EXPORT(tt_tf) u32 tt_tf(void) { return (u32)TF; }
EXPORT(tt_hist) u32 tt_hist(void) { return (u32)HIST; }
EXPORT(tt_sp) u32 tt_sp(void) { return (u32)SPA; }
EXPORT(tt_gv) u32 tt_gv(void) { return (u32)GV; }
extern unsigned char __heap_base;
extern void __wasm_init_tls(void *);
EXPORT(mt_heap_base) u32 mt_heap_base(void) { return (u32)&__heap_base; }
EXPORT(mt_stack) void mt_stack(u32 stackTop) { __asm__ volatile(".globaltype __stack_pointer, i32\n local.get %0\n global.set __stack_pointer" :: "r"(stackTop)); }
static __attribute__((noinline)) void mtSelf(int id) { threadId = id; }
EXPORT(mt_thread) void mt_thread(u32 tls, int id) { __wasm_init_tls((void *)tls); mtSelf(id); }
EXPORT(mt_id) int mt_id(void) { return threadId; }
EXPORT(mt_stop) void mt_stop(int v) { __atomic_store_n(&gStop, v, __ATOMIC_SEQ_CST); }
EXPORT(mt_stopped) int mt_stopped(void) { return __atomic_load_n(&gStop, __ATOMIC_SEQ_CST); }
