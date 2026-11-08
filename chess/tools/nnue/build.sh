#!/bin/sh
# Native builds of the site's chess engine for the training kit (run from anywhere).
#   $WORK/nntool     self-play data, teacher re-scoring, engine evaluation, matches (tools/nnue/nntool.c)
#   $WORK/chess-uci  the engine as a UCI program (tools/uci.c; NNUE=<net file> picks the net)
#   $WORK/convert    Lichess evaluation lines -> training records (tools/convert.c)
# These are for the shipped hidden size (384). HIDDEN=512 (or 768 ...) also builds nntool-512 and chess-uci-512
# (engine.c with -DNN_H=512) for a bigger net.
set -e
cd "$(dirname "$0")/../.."
W=${WORK:-nnwork}; mkdir -p "$W"
CC=${CC:-cc}
$CC -O3 -w -o "$W/nntool" tools/nnue/nntool.c
$CC -O3 -w -o "$W/chess-uci" tools/uci.c
$CC -O3 -w -o "$W/convert" tools/convert.c
if [ -n "$HIDDEN" ] && [ "$HIDDEN" != 384 ]; then
  $CC -O3 -w -DNN_H=$HIDDEN -o "$W/nntool-$HIDDEN" tools/nnue/nntool.c
  $CC -O3 -w -DNN_H=$HIDDEN -o "$W/chess-uci-$HIDDEN" tools/uci.c
fi
