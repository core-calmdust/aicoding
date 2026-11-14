#!/bin/sh
# Build the WebAssembly engines (clang 18), from mancala/: sh tools/build.sh
# engine_simd.wasm (-msimd128) where the browser has wasm SIMD, engine.wasm without it (engine.js picks one with
# WebAssembly.validate); the search is integer: both give the same moves, values and node counts (node tools/cmatch.js).
set -e
B="clang --target=wasm32 -O3 -nostdlib -fno-builtin -Wl,--no-entry -Wl,--export-dynamic -Wl,--allow-undefined -Wl,--initial-memory=33554432,--max-memory=33554432"
$B -msimd128 -o engine_simd.wasm engine.c
$B -o engine.wasm engine.c
ls -l engine_simd.wasm engine.wasm
# engine_mt.wasm (2026-11-14): the threads of the page's pool (shared/mtengine.js; the lead engine.js?…&mt=1, the helpers
# mt-helper.js): -DMT — thread-local search state, one lockless table, Praline's Young Brothers Wait (shared/praline/)
clang --target=wasm32 -O3 -matomics -mbulk-memory -DMT -nostdlib -fno-builtin -Wl,--no-entry -Wl,--export-dynamic -Wl,--allow-undefined -Wl,--shared-memory -Wl,--import-memory -Wl,--max-memory=1073741824 -o engine_mt.wasm engine.c
ls -l engine_mt.wasm
