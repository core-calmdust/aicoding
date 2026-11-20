#!/bin/bash
# YaneuraOu's search with OUR evaluation (the site's net), for matches at equal nodes: the difference is the search alone.
#   bash tools/match/yo-ours.sh [nodes (30000)] [our nodes (= nodes)] [games per process (60)] [processes (2)]
# First run: clones YaneuraOu (the commit below) into $WORK (default ~/shogi-yo-ours), applies tools/match/yo-ours.patch
# (a "MATERIAL_LEVEL 100" evaluation that reads our NUEQ net and computes it from scratch at every call: slow, so compare
# at equal nodes, not time) and builds it. The evaluation was checked equal to engine.c's on 2000 positions.
# OURABL=<bits>: parts of YaneuraOu's search switched off, to measure what each is worth (1 null move, 2 LMR, 4 the pruning
# in the move loop, 8 futility at the child node, 16 razoring, 32 ProbCut, 64 singular extension, 128 IIR, 256 quiet ordering
# by the main and the 1- and 2-ply continuation history only, 512 no history in the quiet ordering, 1024 no correction history).
# OURSCALE (percent, default 100): the value handed to YaneuraOu's search (its margins are tuned to its own nets' scale).
set -e
HERE=$(cd "$(dirname "$0")" && pwd); SHOGI=$(cd "$HERE/../.." && pwd)
N=${1:-30000}; ON=${2:-$N}; G=${3:-60}; P=${4:-2}; WORK=${WORK:-$HOME/shogi-yo-ours}; mkdir -p "$WORK"
REV=b3055ce46448da507af74c5d982c817ee991106c
if [ ! -x "$WORK/yo-ours" ]; then
  [ -d "$WORK/src" ] || git clone -q https://github.com/yaneurao/YaneuraOu "$WORK/src"
  git -C "$WORK/src" checkout -q $REV && git -C "$WORK/src" checkout -q -- . && git -C "$WORK/src" apply "$HERE/yo-ours.patch"
  CPU=AVX2; CXX=clang++; [ "$(uname -m)" = arm64 ] && CPU=APPLEM1
  make -C "$WORK/src/source" -j"$(getconf _NPROCESSORS_ONLN)" TARGET_CPU=$CPU YANEURAOU_EDITION=YANEURAOU_ENGINE_MATERIAL MATERIAL_LEVEL=100 COMPILER=$CXX normal > "$WORK/build.log" 2>&1 || { tail -20 "$WORK/build.log"; exit 1; }
  cp "$WORK/src/source/YaneuraOu-by-gcc" "$WORK/yo-ours"
fi
gzip -dc "$SHOGI/nnue.bin.gz" > "$WORK/site.bin"
H=$(od -An -t d4 -j 4 -N 4 "$WORK/site.bin" | tr -d ' ')
cc -O3 -DNATIVE -DNUE_H=$H -w -o "$WORK/usimatch" "$HERE/usimatch.c"
cd "$WORK"; NO=$(grep -c . "$HERE/openings.txt")
for i in $(seq 1 $P); do
  R=$(( (i - 1) * G / 2 % NO )); tail -n +$((R + 1)) "$HERE/openings.txt" > op$i.txt; if [ $R -gt 0 ]; then head -n $R "$HERE/openings.txt" >> op$i.txt; fi
  OURNET="$WORK/site.bin" OURSCALE=${OURSCALE:-100} ./usimatch site.bin $ON "$WORK/yo-ours" "$WORK" $G --opt BookFile=no_book --opt USI_Hash=64 --opt Threads=1 --opt NodesLimit=$N --opt NetworkDelay=0 --opt NetworkDelay2=0 --openings op$i.txt --byoyomi 60000 > log$i.txt 2>&1 &
done; wait; W=0; L=0; D=0
for i in $(seq 1 $P); do T=$(grep total log$i.txt | tail -1 | sed 's/.*total //'); set -- $T; W=$((W + ${1#+})); L=$((L + ${2#-})); D=$((D + ${3#=})); done
echo "ours ($ON nodes) vs YaneuraOu's search with our evaluation ($N nodes): +$W -$L =$D"
