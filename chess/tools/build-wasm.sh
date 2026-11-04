#!/bin/sh
# Build engine.wasm from engine.c (clang with the wasm32 target; WebAssembly SIMD is used for the NNUE).
cd "$(dirname "$0")/.."
clang --target=wasm32 -O3 -msimd128 -nostdlib -fno-builtin -w -Wl,--no-entry -Wl,--export-dynamic -o engine.wasm engine.c
