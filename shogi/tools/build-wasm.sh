#!/bin/sh
# Build the shogi engine WebAssembly files from engine.c (clang with the wasm32 target).
#   engine.wasm          linear evaluation (no SIMD)
#   engine_simd.wasm     SIMD, NNUE with 256 hidden units
#   engine_simd512.wasm  SIMD, NNUE with 512 hidden units (used when nnue.bin.gz has H = 512)
cd "$(dirname "$0")/.."
B="clang --target=wasm32 -O3 -nostdlib -fno-builtin -w -Wl,--no-entry -Wl,--export-dynamic"
$B -o engine.wasm engine.c
$B -msimd128 -o engine_simd.wasm engine.c
$B -msimd128 -DNUE_H=512 -o engine_simd512.wasm engine.c
