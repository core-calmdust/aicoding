#!/bin/sh
# Build the WebAssembly engines (SIMD and plain) and the native test tool; export the nets.
#   nets: python3 tools/export_net.py <vibego checkpoint .pt> net.bin   (then gzip -9)
cd "$(dirname "$0")/.."
B="clang --target=wasm32 -nostdlib -fno-builtin -w -Wl,--no-entry -Wl,--export-dynamic -Wl,--initial-memory=33554432 -Wl,--max-memory=2147483648 -Wl,-z,stack-size=4194304 -Wl,--stack-first"
$B -O3 -ffast-math -msimd128 -o engine_simd.wasm engine.c
$B -O3 -ffast-math -o engine.wasm engine.c
gcc -O3 -march=native -w -o ${NATIVE_OUT:-/tmp/gonative} tools/native.c -lm
