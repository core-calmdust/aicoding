#!/bin/bash
# The native tools' output layer runs with SIMD (NEON on Apple silicon, SSE2 on x86), as the site's wasm does. This checks
# on this machine that it gives the same search as the plain loop (the checksums must be equal) and shows both speeds.
#   bash tools/nnue/simd-check.sh [net (default ../nnue.bin.gz)]
set -e
HERE=$(cd "$(dirname "$0")" && pwd); SHOGI=$(cd "$HERE/../.." && pwd); W=$(mktemp -d)
NET=${1:-$SHOGI/nnue.bin.gz}; gzip -dc "$NET" > "$W/net.bin" 2>/dev/null || cp "$NET" "$W/net.bin"
H=$(od -An -tu4 -j4 -N4 "$W/net.bin" | tr -d ' ')
cc -O3 -DNATIVE -DNUE_KB=1 -DNUE_H=$H -w -o "$W/simd" "$HERE/kptool.c"
cc -O3 -DNATIVE -DNUE_KB=1 -DNUE_H=$H -DNUE_NOSIMD -w -o "$W/plain" "$HERE/kptool.c"
cd "$SHOGI/tools/bench"
A=$("$W/plain" bench "$W/net.bin" 300000 12); B=$("$W/simd" bench "$W/net.bin" 300000 12)
echo "plain loop: $A"; echo "SIMD:       $B"
[ "${A##*checksum }" = "${B##*checksum }" ] && echo "same search: OK" || { echo "DIFFERENT search: do not trust the SIMD build, tell Claude"; exit 1; }
rm -rf "$W"
