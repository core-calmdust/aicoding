#!/bin/sh
# Build the WebAssembly search (core.c, 2026-11-12): core_simd.wasm (wasm SIMD) and core.wasm (without SIMD; engine.js picks one
# with WebAssembly.validate) for the one-thread workers, core_mt.wasm for the threads of the page's pool (shared/mtengine.js:
# the lead engine.js?…&mt=1, the helpers mt-helper.js; Praline's Young Brothers Wait, shared/praline/).
# Then: node tools/check-core.js (the same moves / values / depths / node counts as the JavaScript search)
cd "$(dirname "$0")/.."
F="--target=wasm32 -nostdlib -fno-builtin -O3 -w -Wl,--no-entry -Wl,--export-dynamic"
clang $F -Wl,-z,stack-size=4194304 -Wl,--initial-memory=50331648 -o core.wasm core.c || exit 1
clang $F -msimd128 -mbulk-memory -Wl,-z,stack-size=4194304 -Wl,--initial-memory=50331648 -o core_simd.wasm core.c || exit 1
clang $F -msimd128 -matomics -mbulk-memory -DMT -Wl,--shared-memory -Wl,--import-memory -Wl,--max-memory=1073741824 -o core_mt.wasm core.c || exit 1
for f in core.wasm core_simd.wasm core_mt.wasm; do echo "$f $(wc -c < $f) bytes"; done
