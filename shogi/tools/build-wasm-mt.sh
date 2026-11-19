#!/bin/sh
# Build engine_mt.wasm: the engine for several threads on one shared memory (Lazy SMP; engine.c with -DMT), SIMD, NNUE
# with 512 hidden units (the current nnue.bin.gz). Needs a cross-origin isolated page (pro/); the memory is imported.
# (2026-11-19) -DSEARCH2_MT: search v5 is the default here too (its own table, 48 MB); -DTTM_BITS=16: the table of search v4
# (set_param 44=0, not used by the site any more) down to 4 MB, so that the page's memory (1536 pages) still holds it all.
cd "$(dirname "$0")/.."
clang --target=wasm32 -O3 -msimd128 -matomics -mbulk-memory -DMT -DSEARCH2_MT -DTTM_BITS=16 -DNUE_H=512 -nostdlib -fno-builtin -w -Wl,--no-entry -Wl,--export-dynamic \
  -Wl,--shared-memory -Wl,--import-memory -Wl,--max-memory=1073741824 -o engine_mt.wasm engine.c
ls -l engine_mt.wasm
