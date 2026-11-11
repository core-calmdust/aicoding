#!/bin/sh
# Build the WebAssembly engine and the native tool.
cd "$(dirname "$0")/.."
B="clang --target=wasm32 -nostdlib -fno-builtin -w -Wl,--no-entry -Wl,--export-dynamic -Wl,--initial-memory=67108864 -Wl,--max-memory=134217728"
# (2026-11-11) engine_simd.wasm with wasm SIMD (-msimd128), engine.wasm without it for a browser that has no SIMD (engine.js
# picks one with WebAssembly.validate, like go/); the same values. engine_mt.wasm with SIMD only (every browser with threads has it).
$B -O3 -ffast-math -msimd128 -o engine_simd.wasm engine.c
$B -O3 -ffast-math -o engine.wasm engine.c
# engine_mt.wasm: the same engine for several threads growing one search tree on a shared memory (tree-parallel MCTS with
# virtual loss, -DMT; shared/mtengine.js, mt-helper.js). The normal engine.wasm is unchanged by -DMT code.
clang --target=wasm32 -O3 -ffast-math -msimd128 -matomics -mbulk-memory -DMT -nostdlib -fno-builtin -w -Wl,--no-entry -Wl,--export-dynamic -Wl,--shared-memory -Wl,--import-memory -Wl,--max-memory=1073741824 -o engine_mt.wasm engine.c
gcc -O3 -march=native -DNATIVE -w -o ${NATIVE_OUT:-/tmp/hexn} tools/native.c -lm
