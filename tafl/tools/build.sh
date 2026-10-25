#!/bin/sh
# Build the WebAssembly engine and the native tool.
cd "$(dirname "$0")/.."
B="clang --target=wasm32 -nostdlib -fno-builtin -w -Wl,--no-entry -Wl,--export-dynamic -Wl,--initial-memory=67108864 -Wl,--max-memory=268435456"
$B -O3 -o engine.wasm engine.c
gcc -O3 -march=native -DNATIVE -w -o ${NATIVE_OUT:-/tmp/tafl} tools/native.c -lm
