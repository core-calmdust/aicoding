#!/bin/sh
# Build engine_mt.wasm: the engine for several threads on one shared memory (Lazy SMP; engine.c with -DMT), SIMD, NNUE
# with 512 hidden units (the current nnue.bin.gz). Needs a cross-origin isolated page (pro/); the memory is imported.
cd "$(dirname "$0")/.."
clang --target=wasm32 -O3 -msimd128 -matomics -mbulk-memory -DMT -DNUE_H=512 -nostdlib -fno-builtin -w -Wl,--no-entry -Wl,--export-dynamic \
  -Wl,--shared-memory -Wl,--import-memory -Wl,--max-memory=1073741824 -o engine_mt.wasm engine.c
ls -l engine_mt.wasm
