# The "truly concurrent" multi-thread simulation of a game's engine_mt.wasm (2026-11-10; the method of morris/tools/mtsim,
# claude/game-conventions-addendum.md). Makes eng_<game>.c, a native copy of <repo>/<game>/engine.c built as with -DMT (the
# shared table's and the busy marks' word reads / writes through simcore.h; a node tick at every node), for sim.c.
#   (in a scratch folder with copies of simcore.h, sim.c, g_<game>.h, dump.js — the generated files stay out of the repository)
#   python3 gen.py <repo> <game> && node dump.js <repo> <game>
#   gcc -O2 -w -DMT -DNATIVE -I<repo>/<game> -DGAME_H='"g_<game>.h"' -DPOS_FILE='"pos_<game>.txt"' -o sim_<game> sim.c -lpthread -lm
#     (janggi: g_xiangqi.h with -DJANGGI; shogi: also -DNUE_H=512 as its engine_mt.wasm)
#   (YBW engines: -DSIM_Q=64 for finer rounds, -DSIM_STAT for the split points' counters; SIM_SLOW=8 in the environment: slow cores)
#   ./sim_<game> 1,2,4,8 3 -1 1 1     (threads, the 1-thread budget in M nodes → the depth D, positions (-1 all / 0,3,…),
#                                      delayed table stores, delayed busy marks)
# game: xiangqi, janggi, chess, shogi. Works on the engines before and after the busy marks (the marks' functions are
# rewritten only when present).
import sys, re
repo, game = sys.argv[1], sys.argv[2]
s = open(f'{repo}/{game}/engine.c').read()

def rep(a, b, count=1):
    global s
    n = s.count(a)
    assert n >= 1 and (count == 0 or n == count), (a, n)
    s = s.replace(a, b)

def cut_threads(marker):
    global s
    k = s.index(marker)
    i = s.rindex('#ifdef', 0, k)
    j = s.index('#endif', k)
    s = s[:i] + s[j + len('#endif'):]

if game in ('xiangqi', 'janggi'):
    cut_threads('// ---------------------------------------------------------------- threads (engine_mt.wasm')
    rep('u64 w = bk[2 * j + 1], kx = bk[2 * j];', 'u64 w = SIMR((u64 *)&bk[2 * j + 1]), kx = SIMR((u64 *)&bk[2 * j]);')
    rep('u64 w = bk[2 * i + 1], kx = bk[2 * i];', 'u64 w = SIMR(&bk[2 * i + 1]), kx = SIMR(&bk[2 * i]);')
    rep('bk[2 * j + 1] = w; bk[2 * j] = key ^ w;', 'SIMW(&bk[2 * j + 1], w); SIMW(&bk[2 * j], key ^ w);')
    rep('  nodes++;\n', '  nodes++; SIM_NODE();\n', 0)
elif game == 'chess':
    cut_threads('/* ------------------------------------------------------------------ threads (engine_mt.wasm')
    rep('u64 w = bk[2 * j + 1], kx = bk[2 * j];', 'u64 w = SIMR((u64 *)&bk[2 * j + 1]), kx = SIMR((u64 *)&bk[2 * j]);')
    rep('u64 w = bk[2 * i + 1], kx = bk[2 * i];', 'u64 w = SIMR(&bk[2 * i + 1]), kx = SIMR(&bk[2 * i]);')
    rep('bk[2 * j + 1] = w; bk[2 * j] = key ^ w;', 'SIMW(&bk[2 * j + 1], w); SIMW(&bk[2 * j], key ^ w);')
    rep('if ((++nodes, ((long long)nodes & 2047) == 0)) check_time();', 'if ((++nodes, SIM_NODE_E(), ((long long)nodes & 2047) == 0)) check_time();', 0)
elif game == 'shogi':   # (built with -DNATIVE: its native block, with thread-local state as -DMT)
    rep('#define EXPORT(name)\n#define TLS\n', '#define EXPORT(name)\n#define TLS _Thread_local\n')
    cut_threads('/* ------------------------------------------------------------------ threads (engine_mt.wasm')
    rep('u64 w = bk[2 * j + 1], kx = bk[2 * j];', 'u64 w = SIMR((u64 *)&bk[2 * j + 1]), kx = SIMR((u64 *)&bk[2 * j]);')
    rep('u64 w = bk[2 * i + 1], kx = bk[2 * i];', 'u64 w = SIMR(&bk[2 * i + 1]), kx = SIMR(&bk[2 * i]);')
    rep('bk[2 * j + 1] = w; bk[2 * j] = key ^ w;', 'SIMW(&bk[2 * j + 1], w); SIMW(&bk[2 * j], key ^ w);')
    rep('  nodes++;\n  if (timeUp()) return 0;', '  nodes++; SIM_NODE();\n  if (timeUp()) return 0;', 0)
else:
    raise SystemExit('game?')

# the busy marks (engine_mt.wasm after 2026-11-10): the same accessors in every engine
if 'busyT[' in s:
    rep('__atomic_load_n(&busyT[', 'SIMR(&busyT[')
    s = re.sub(r'SIMR\(&busyT\[([^\]]*)\], __ATOMIC_RELAXED\)', r'SIMR(&busyT[\1])', s)
    rep('__atomic_store_n(&busyT[i], ', 'SIMWB(&busyT[i], ')
    s = re.sub(r'SIMWB\(&busyT\[i\], ([^;]*), __ATOMIC_RELAXED\);', r'SIMWB(&busyT[i], \1);', s)
    rep('__atomic_compare_exchange_n(&busyT[i], &mine, 0, 0, __ATOMIC_RELAXED, __ATOMIC_RELAXED);', 'SIMCB(&busyT[i], mine);')

# chess's YBW (2026-11-10, chess/MODEL_CARD.md「マルチスレッド v2」): g_chess.h calls mt_idle / mt_lazy, and an idle thread's
# spin (MT_PAUSE) ticks the clock
if game == 'chess' and 'EXPORT(mt_idle)' in s:
    s = '#define HAS_MT_IDLE 1\n#include "simcore.h"\n#define MT_PAUSE() SIM_IDLE()\n' + s
else:
    s = '#include "simcore.h"\n' + s
open(f'eng_{game}.c', 'w').write(s)
print('eng_%s.c' % game)
