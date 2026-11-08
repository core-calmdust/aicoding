#!/bin/sh
# Native builds of the site's chess engine for the training kit (run from anywhere).
#   $WORK/nntool     self-play data, teacher re-scoring, engine evaluation, matches (tools/nnue/nntool.c)
#   $WORK/chess-uci  the engine as a UCI program (tools/uci.c; NNUE=<net file> picks the net)
#   $WORK/convert    Lichess evaluation lines -> training records (tools/convert.c)
set -e
cd "$(dirname "$0")/../.."
W=${WORK:-nnwork}; mkdir -p "$W"
CC=${CC:-cc}
$CC -O3 -w -o "$W/nntool" tools/nnue/nntool.c
$CC -O3 -w -o "$W/chess-uci" tools/uci.c
$CC -O3 -w -o "$W/convert" tools/convert.c
