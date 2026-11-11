#!/bin/sh
# Build the Overkill engine (okengine.c) for the shogi net's hidden size (shogi/nnue.bin.gz: 512).
#   okengine.wasm       scalar
#   okengine_simd.wasm  -msimd128 (the compiler vectorises the accumulator loops)
cd "$(dirname "$0")/.."
B="clang --target=wasm32 -O3 -nostdlib -fno-builtin -w -Wl,--no-entry -Wl,--export-dynamic -Wl,-z,stack-size=1048576"
$B -o okengine.wasm okengine.c
$B -msimd128 -o okengine_simd.wasm okengine.c
