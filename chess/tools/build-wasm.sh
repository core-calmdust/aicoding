#!/bin/sh
# Build engine.wasm from engine.c (clang with the wasm32 target; WebAssembly SIMD is used for the NNUE).
# The stack: 1 MB, first in memory (a deep search used more than the linker's default 64 KB, which then ran into the
# static data: --stack-first makes an overflow a trap instead). engine_mt.wasm gives every thread its own stack (mt_stack).
cd "$(dirname "$0")/.."
clang --target=wasm32 -O3 -msimd128 -nostdlib -fno-builtin -w -Wl,--no-entry -Wl,--export-dynamic -Wl,--stack-first -Wl,-z,stack-size=1048576 -o engine.wasm engine.c
