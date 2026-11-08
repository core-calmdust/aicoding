#!/bin/sh
# Build the WebAssembly engine and the native tool.
cd "$(dirname "$0")/.."
B="clang --target=wasm32 -nostdlib -fno-builtin -w -Wl,--no-entry -Wl,--export-dynamic -Wl,--initial-memory=67108864 -Wl,--max-memory=134217728"
$B -O3 -ffast-math -o engine.wasm engine.c
# engine_mt.wasm: the same engine for several threads growing one search tree on a shared memory (tree-parallel MCTS with
# virtual loss, -DMT; shared/mtengine.js, mt-helper.js). The normal engine.wasm is unchanged by -DMT code.
clang --target=wasm32 -O3 -ffast-math -matomics -mbulk-memory -DMT -nostdlib -fno-builtin -w -Wl,--no-entry -Wl,--export-dynamic -Wl,--shared-memory -Wl,--import-memory -Wl,--max-memory=1073741824 -o engine_mt.wasm engine.c
gcc -O3 -march=native -DNATIVE -w -o ${NATIVE_OUT:-/tmp/hexn} tools/native.c -lm
