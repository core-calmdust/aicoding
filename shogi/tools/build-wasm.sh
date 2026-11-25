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
# (2026-11-26) the net of 2026-11: 1280 hidden units, then 8 -> 64 in 8 sets (nnue-s1280.bin.gz; engine.js picks this build by the net's header)
$B -msimd128 -DNUE_KB=1 -DNUE_H=1280 -DNUE_MB=8 -DNUE_L1=8 -DNUE_L2=64 -DNUE_MI=1280 -o engine_simd_s1280.wasm engine.c
ls -l engine_simd_s1280.wasm
