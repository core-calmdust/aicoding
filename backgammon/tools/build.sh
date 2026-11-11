#!/bin/sh
# Build the WebAssembly engines (clang 18), from backgammon/: sh tools/build.sh
# engine_simd.wasm with wasm SIMD (-msimd128), engine.wasm without it for a browser that has no SIMD (engine.js picks one with
# WebAssembly.validate; the same arithmetic in the same order: the same numbers — node tools/cmatch.js checks it).
# No -ffast-math: the sums stay in the written order. The AI threads (mt.js) are plain Workers, each with its own engine.
set -e
B="clang --target=wasm32 -O3 -nostdlib -fno-builtin -Wl,--no-entry -Wl,--export-dynamic -Wl,--initial-memory=8388608,--max-memory=8388608"
$B -msimd128 -o engine_simd.wasm engine.c
$B -o engine.wasm engine.c
# for the tests only (not served): the layers summed in double in bg.js' order (tools/cmatch.js compares it with the JS values)
$B -DEXACT -o ${EXACT_OUT:-/tmp/bg_exact.wasm} engine.c
ls -l engine_simd.wasm engine.wasm
