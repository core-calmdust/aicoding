#!/bin/sh
# Build the WebAssembly engine.
cd "$(dirname "$0")/.."
clang --target=wasm32 -nostdlib -fno-builtin -w -Wl,--no-entry -Wl,--export-dynamic -Wl,-z,stack-size=1048576 -Wl,--initial-memory=134217728 -Wl,--max-memory=268435456 -O3 -o engine.wasm engine.c
# Alquerque endgame tables (only when the rules change): cc -O2 -o /tmp/alqegdb tools/alqegdb.c && /tmp/alqegdb 5 alqeg.bin && gzip -9f alqeg.bin
