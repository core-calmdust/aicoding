#!/bin/sh
# Build the WebAssembly engine and the native tool.
cd "$(dirname "$0")/.."
B="clang --target=wasm32 -msimd128 -nostdlib -fno-builtin -w -Wl,--no-entry -Wl,--export-dynamic -Wl,--initial-memory=67108864 -Wl,--max-memory=268435456"
$B -O3 -o engine.wasm engine.c
gcc -O3 -march=native -DNATIVE -w -o ${NATIVE_OUT:-/tmp/tafl} tools/native.c -lm
# engine_mt.wasm: several threads on one shared memory (Lazy SMP, engine.c with -DMT) for pro/ (cross-origin isolated)
clang --target=wasm32 -O3 -msimd128 -matomics -mbulk-memory -DMT -nostdlib -fno-builtin -w -Wl,--no-entry -Wl,--export-dynamic \
  -Wl,--shared-memory -Wl,--import-memory -Wl,--max-memory=1073741824 -o engine_mt.wasm engine.c
