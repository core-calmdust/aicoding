#!/bin/sh
# Test builds of engine.c for tools/edax-anchor.js --variant (never loaded by the site): the mechanisms around Multi-ProbCut
# and the evaluation's lean, as engine.wasm files under tools/variants/. Rebuild after engine.c changes.
#   g0 = -DGEN=0 (move generation by SIMD, the default until 2026-11-21), g1 = -DGEN=1 (Kogge-Stone on plain integers)
#   sM_L = -DSE_MAX=M -DSE_LOG=L (the solver's nodes of 8..M empties in a small table of 2^L entries, 24 bytes each)
#   lc = -DLAZYCUT (the last move: no count of the opponent's flips when the bound already fails low)
#   nn = -DMPC_NONEST (no cut inside a probe), pN = -DMPC_PRE=N (probe only when the static evaluation is within N/100 discs
#   of the bound), kN = -DENDK=N (the width of the search to the end ×N/100), v150_190 = -DEVOFF_E=150 -DEVOFF_O=190
set -e
cd "$(dirname "$0")/.."
b() { name=$1; shift; clang --target=wasm32 -O3 -msimd128 -nostdlib -fno-builtin -w -Wl,--no-entry -Wl,--export-dynamic -Wl,--allow-undefined "$@" -o tools/variants/engine_$name.wasm engine.c; }
b nn -DMPC_NONEST
b p200 -DMPC_PRE=200
b p400 -DMPC_PRE=400
b nn_p200 -DMPC_NONEST -DMPC_PRE=200
b nn_p400 -DMPC_NONEST -DMPC_PRE=400
b k150 -DENDK=150
b v150_190 -DEVOFF_E=150 -DEVOFF_O=190
b g1 -DGEN=1
b g0 -DGEN=0
b lc -DLAZYCUT
for m in 10 11 12 13; do for l in 10 12 14 16; do b s${m}_$l -DSE_MAX=$m -DSE_LOG=$l; done; done
ls -l tools/variants
