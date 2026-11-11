#!/bin/sh
# Build the WebAssembly engines (clang 18), from morris/: sh tools/build.sh
# (2026-11-11) engine_simd.wasm with wasm SIMD (-msimd128), engine.wasm without it for a browser that has no SIMD (engine.js
# picks one with WebAssembly.validate; the same values: node tools/check_wasm.js); engine_mt.wasm (the page's threads) with
# SIMD only, as the other games.
set -e
B="clang --target=wasm32 -O3 -nostdlib -fno-builtin -Wl,--no-entry -Wl,--export-dynamic -Wl,--initial-memory=33554432,--max-memory=134217728"
$B -msimd128 -o engine_simd.wasm engine.c
$B -o engine.wasm engine.c
clang --target=wasm32 -O3 -msimd128 -matomics -mbulk-memory -DMT -nostdlib -fno-builtin -Wl,--no-entry -Wl,--export-dynamic -Wl,--shared-memory -Wl,--import-memory -Wl,--max-memory=1073741824 -o engine_mt.wasm engine.c
ls -l engine_simd.wasm engine.wasm engine_mt.wasm
