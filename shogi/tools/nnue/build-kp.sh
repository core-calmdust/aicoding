#!/bin/bash
# Native builds for the HalfKP-style kit (tools/nnue/TRAIN.md), into the folder <out>:
#   prep, trainkp                 data and training
#   usimatch                      the site's engine with the current net (tools/match), the opponent in matches
#   kptool-<KB>-<H>               the engine built with -DNUE_KB=<KB> -DNUE_H=<H> for a HalfKP net (evalpos, walk, bench, USI)
#   bash build-kp.sh <out> [net]  (the net's header gives KB and H; else KB / H from the environment, default 9 / 512)
#   prints the kptool path last.
# Optional: WASM=1 also builds <out>/engine_kp.wasm (SIMD, the same flags as engine_simd512.wasm + NUE_KB), to see its size.
set -e
HERE=$(cd "$(dirname "$0")" && pwd); SHOGI=$(cd "$HERE/../.." && pwd)
OUT=${1:?usage: build-kp.sh <out folder> [net]}; mkdir -p "$OUT"
KB=${KB:-9}; H=${H:-512}
if [ -n "$2" ] && [ -f "$2" ]; then
  MAGIC=$(od -An -t x4 -N 4 "$2" | tr -d ' ')
  if [ "$MAGIC" = 4b45554e ]; then H=$(od -An -t d4 -j 4 -N 4 "$2" | tr -d ' '); KB=$(od -An -t d4 -j 12 -N 4 "$2" | tr -d ' '); fi
fi
CUR_H=$(gzip -dc "$SHOGI/nnue.bin.gz" | od -An -t d4 -j 4 -N 4 | tr -d ' ')
cc -O3 -w -o "$OUT/prep" "$HERE/prep.c"
cc -O3 -w -o "$OUT/trainkp" "$HERE/trainkp.c" -lpthread -lm
cc -O3 -DNATIVE -DNUE_H=$CUR_H -w -o "$OUT/usimatch" "$SHOGI/tools/match/usimatch.c"
cc -O3 -DNATIVE -DNUE_KB=$KB -DNUE_H=$H -w -o "$OUT/kptool-$KB-$H" "$HERE/kptool.c"
if [ -n "$WASM" ]; then
  clang --target=wasm32 -O3 -nostdlib -fno-builtin -w -Wl,--no-entry -Wl,--export-dynamic -msimd128 -DNUE_KB=$KB -DNUE_H=$H -o "$OUT/engine_kp.wasm" "$SHOGI/engine.c"
fi
echo "$OUT/kptool-$KB-$H"
