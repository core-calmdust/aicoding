#!/bin/sh
# Build engine_mt.wasm: the same engine for several threads on one shared memory (Lazy SMP; engine.c with -DMT).
# Needs a cross-origin isolated page (SharedArrayBuffer). The memory is imported: engine-mt.js creates it.
cd "$(dirname "$0")/.."
clang --target=wasm32 -O3 -msimd128 -matomics -mbulk-memory -DMT -nostdlib -fno-builtin -w -Wl,--no-entry -Wl,--export-dynamic \
  -Wl,--shared-memory -Wl,--import-memory -Wl,--max-memory=1073741824 -o engine_mt.wasm engine.c
ls -l engine_mt.wasm
