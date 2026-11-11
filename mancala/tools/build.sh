#!/bin/sh
# Build the WebAssembly engines (clang 18), from mancala/: sh tools/build.sh
# engine_simd.wasm (-msimd128) where the browser has wasm SIMD, engine.wasm without it (engine.js picks one with
# WebAssembly.validate); the search is integer: both give the same moves, values and node counts (node tools/cmatch.js).
set -e
B="clang --target=wasm32 -O3 -nostdlib -fno-builtin -Wl,--no-entry -Wl,--export-dynamic -Wl,--allow-undefined -Wl,--initial-memory=33554432,--max-memory=33554432"
$B -msimd128 -o engine_simd.wasm engine.c
$B -o engine.wasm engine.c
ls -l engine_simd.wasm engine.wasm
