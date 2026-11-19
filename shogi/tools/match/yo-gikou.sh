#!/bin/bash
# Where is the gap to Gikou (技巧2)? The same match as run-gikou.sh's "FULL" one (Gikou without a depth limit, 1 thread,
# FULL ms a move), but OUR side is played by YaneuraOu's search at the same nodes a move, with
#   A (default):          OUR evaluation (the site's net, as tools/match/yo-ours.sh)  -> what the search is worth outside
#   B (MICRO=<folder>):   the net in that folder (nn.bin + progress.bin of つようら王11micro, MIT; a ruler, never shipped)
#                         -> what a strong evaluation with the same kind of input is worth
# Compare with the site's own engine at the same nodes (run-gikou.sh: -181 Elo at 2,200,000 nodes on 2026-11-19).
#   bash shogi/tools/match/yo-gikou.sh                       (A)
#   MICRO=~/Downloads/tsuyou11micro bash shogi/tools/match/yo-gikou.sh   (B; ARCH=SFNN_ka2_4096_8_64_progress8 for mini)
# Settings: NODES (2200000), FULL (5000), GAMES (4, per process), P (6), FVS (B: FV_SCALE, default the engine's 16).
# Needs Gikou from run-gikou.sh ($GW, default ~/shogi-gikou-work/gikou). A: about 2 to 4 s a move at 2,200,000 nodes.
set -e
HERE=$(cd "$(dirname "$0")" && pwd); SHOGI=$(cd "$HERE/../.." && pwd)
NODES=${NODES:-2200000}; FULL=${FULL:-5000}; GAMES=${GAMES:-4}; P=${P:-6}; GW=${GW:-$HOME/shogi-gikou-work/gikou}
WORK=${WORK:-$HOME/shogi-yo-ours}; ARCH=${ARCH:-SFNN_ka2_2048_8_64_progress8}; mkdir -p "$WORK"
[ -x "$GW/release" ] || { echo "Gikou is not built yet: run shogi/tools/match/run-gikou.sh once"; exit 1; }
CPU=AVX2; [ "$(uname -m)" = arm64 ] && CPU=APPLEM1
J=$(getconf _NPROCESSORS_ONLN)
if [ -n "$MICRO" ]; then
  [ -s "$MICRO/nn.bin" ] || { echo "no nn.bin in $MICRO"; exit 1; }
  YO="$WORK/yo-$ARCH"; TAG=micro; WHAT="YaneuraOu + $(basename "$MICRO") ($ARCH)"
  if [ ! -x "$YO" ]; then
    [ -d "$WORK/src-new" ] || git clone -q --depth 1 https://github.com/yaneurao/YaneuraOu "$WORK/src-new"
    make -C "$WORK/src-new/source" clean YANEURAOU_EDITION=YANEURAOU_ENGINE_$ARCH > /dev/null 2>&1 || true
    make -C "$WORK/src-new/source" -j"$J" normal COMPILER=clang++ TARGET_CPU=$CPU YANEURAOU_EDITION=YANEURAOU_ENGINE_$ARCH > "$WORK/build-new.log" 2>&1 || { tail -20 "$WORK/build-new.log"; exit 1; }
    cp "$WORK/src-new/source/YaneuraOu-by-gcc" "$YO"
  fi
  UOPT="--usopt EvalDir=$(cd "$MICRO" && pwd)"; [ -n "$FVS" ] && UOPT="$UOPT --usopt FV_SCALE=$FVS"
  case "$MICRO" in *" "*) echo "the folder's path must not have spaces: $MICRO"; exit 1;; esac
else
  YO="$WORK/yo-ours"; TAG=ours; WHAT="YaneuraOu's search + our evaluation"; UOPT=""
  REV=b3055ce46448da507af74c5d982c817ee991106c
  if [ ! -x "$YO" ]; then
    [ -d "$WORK/src" ] || git clone -q https://github.com/yaneurao/YaneuraOu "$WORK/src"
    git -C "$WORK/src" checkout -q $REV && git -C "$WORK/src" checkout -q -- . && git -C "$WORK/src" apply "$HERE/yo-ours.patch"
    make -C "$WORK/src/source" -j"$J" TARGET_CPU=$CPU YANEURAOU_EDITION=YANEURAOU_ENGINE_MATERIAL MATERIAL_LEVEL=100 COMPILER=clang++ normal > "$WORK/build.log" 2>&1 || { tail -20 "$WORK/build.log"; exit 1; }
    cp "$WORK/src/source/YaneuraOu-by-gcc" "$YO"
  fi
fi
gzip -dc "$SHOGI/nnue.bin.gz" > "$WORK/site.bin"
H=$(od -An -t d4 -j 4 -N 4 "$WORK/site.bin" | tr -d ' ')
cc -O3 -DNATIVE -DNUE_H=$H -w -o "$WORK/usimatch" "$HERE/usimatch.c"
cd "$WORK"; printf 'usi\nisready\nquit\n' | OURNET="$WORK/site.bin" "$YO" 2>/dev/null | grep -q readyok || { echo "the engine does not start: $YO"; exit 1; }
echo "== $WHAT, $NODES nodes a move, vs Gikou ($FULL ms a move): $P processes x $GAMES games"
T0=$(date +%s); i=1
while [ $i -le $P ]; do
  R=$(( (i - 1) * 7 % 100 )); tail -n +$(( R + 1 )) "$HERE/openings.txt" > "g-op-$i.txt"; [ $R -gt 0 ] && head -n $R "$HERE/openings.txt" >> "g-op-$i.txt"
  OURNET="$WORK/site.bin" OURSCALE=${OURSCALE:-100} ./usimatch site.bin 0 "$GW/release" "$GW" $GAMES --opt Threads=1 --opt USI_Hash=256 --opt OwnBook=false --opt USI_Ponder=false \
    --openings "g-op-$i.txt" --byoyomi $FULL --us "$YO" "$WORK" --usopt BookFile=no_book --usopt USI_Hash=256 --usopt Threads=1 --usopt NodesLimit=$NODES \
    --usopt NetworkDelay=0 --usopt NetworkDelay2=0 $UOPT > "g-$TAG-$i.log" 2>&1 &
  i=$((i + 1))
done
wait
for f in g-$TAG-*.log; do grep "total" "$f" | tail -1; done | sed 's/.*total +\([0-9]*\) -\([0-9]*\) =\([0-9]*\).*/\1 \2 \3/' | awk -v l="$WHAT, $NODES nodes" -v m=$(( ($(date +%s) - T0) / 60 )) '
  { w += $1; lo += $2; d += $3 }
  END { n = w + lo + d; if (!n) { print "no games finished"; exit 1 } s = (w + d / 2) / n; c = s; if (c < 0.01) c = 0.01; if (c > 0.99) c = 0.99;
        printf "%s vs Gikou: +%d -%d =%d  score %.3f  Elo %+.0f  (%d minutes)\n", l, w, lo, d, s, -400 * log(1 / c - 1) / log(10), m }'
echo "(logs: $WORK/g-$TAG-*.log)"
