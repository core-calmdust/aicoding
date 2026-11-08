#!/bin/sh
# Build the WebAssembly engines (plain and SIMD) and the native tool.
cd "$(dirname "$0")/.."
B="clang --target=wasm32 -nostdlib -fno-builtin -w -Wl,--no-entry -Wl,--export-dynamic -Wl,--initial-memory=67108864 -Wl,--max-memory=268435456"
$B -O3 -ffast-math -o engine.wasm engine.c
$B -O3 -ffast-math -msimd128 -o engine_simd.wasm engine.c
# engine_mt.wasm: the same engine for several threads on one shared memory (Lazy SMP, -DMT; shared/mtengine.js). Without
# -DMT the TLS macro is empty, so engine.wasm / engine_simd.wasm stay byte for byte the same.
clang --target=wasm32 -O3 -ffast-math -msimd128 -matomics -mbulk-memory -DMT -nostdlib -fno-builtin -w -Wl,--no-entry -Wl,--export-dynamic -Wl,--shared-memory -Wl,--import-memory -Wl,--max-memory=1073741824 -o engine_mt.wasm engine.c
gcc -O3 -march=native -DNATIVE -w -o ${NATIVE_OUT:-/tmp/ck} tools/native.c -lm
