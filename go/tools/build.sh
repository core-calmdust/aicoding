#!/bin/sh
# Build the WebAssembly engines (SIMD and plain) and the native test tool; export the nets.
#   nets: python3 tools/export_net.py <vibego checkpoint .pt> net.bin   (then gzip -9)
cd "$(dirname "$0")/.."
B="clang --target=wasm32 -nostdlib -fno-builtin -w -Wl,--no-entry -Wl,--export-dynamic -Wl,--initial-memory=33554432 -Wl,--max-memory=2147483648 -Wl,-z,stack-size=4194304 -Wl,--stack-first"
$B -O3 -ffast-math -msimd128 -o engine_simd.wasm engine.c
$B -O3 -ffast-math -o engine.wasm engine.c
# engine_mt.wasm: the same engine for several threads growing one search tree on a shared memory (tree-parallel MCTS with
# virtual loss, both nets in the shared memory; -DMT; shared/mtengine.js, mt-helper.js). The normal builds are unchanged by -DMT code.
clang --target=wasm32 -O3 -ffast-math -msimd128 -matomics -mbulk-memory -DMT -nostdlib -fno-builtin -w -Wl,--no-entry -Wl,--export-dynamic -Wl,--shared-memory -Wl,--import-memory -Wl,--max-memory=1073741824 -o engine_mt.wasm engine.c
gcc -O3 -march=native -w -o ${NATIVE_OUT:-/tmp/gonative} tools/native.c -lm
