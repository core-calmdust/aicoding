#!/bin/bash
# calib-levels: at how many nodes does the NEW engine (the default search + a new net, kptool) play as well as the OLD
# one (search v5 + the site's net of 2026-11-13) at each level's nodes? The levels are rating anchors (rated games), so
# when the engine gets stronger their node counts are scaled down until the strength is the same (as on 2026-11-08).
#   bash tools/nnue/calib-levels.sh <new net> ["level nodes ..."] ["factors ..."] [games per process] [processes]
#   e.g. bash tools/nnue/calib-levels.sh "/Volumes/.../p1280.bin" "1000 5000 18000 100000" "0.12 0.2 0.33" 10 10
# For each level N and factor F: the new engine at N * F nodes against the old one at N nodes; the factor where the score
# crosses 50% is that level's scale. Node-limited, so it can run beside other work.
set -e
HERE=$(cd "$(dirname "$0")" && pwd); SHOGI=$(cd "$HERE/../.." && pwd)
NET=$(cd "$(dirname "$1")" && pwd)/$(basename "$1"); LEVELS=${2:-"1000 5000 18000 100000"}; FACTORS=${3:-"0.12 0.2 0.33"}; G=${4:-10}; P=${5:-10}
WORK=${WORK:-$HOME/shogi-kp-work}; mkdir -p "$WORK"
KP=$(bash "$HERE/build-kp.sh" "$WORK" "$NET" | tail -1)
CUR=${CUR:-$SHOGI/nnue.bin.gz}; gzip -dc "$CUR" > "$WORK/cur.bin" 2>/dev/null || cp "$CUR" "$WORK/cur.bin"
# search v5 (engine.c, the note at P[]): the old side
V5="85=0,91=0,92=0,55=0,110=0,113=0,115=0,75=5,76=90,77=40,79=2,9=5049,43=246,17=214,2=73,1=11,112=0,114=0,116=0,81=0,86=0,87=0,88=0,89=0,93=0,95=0,96=0,97=0,98=0,99=0,100=0,101=0,102=0,103=0,104=0,105=0"
echo "new: $(basename "$NET") + the default search; old: the site's net + search v5; $((G * P)) games a line"
for N in $LEVELS; do for F in $FACTORS; do
  N2=$(awk -v n="$N" -v f="$F" 'BEGIN { x = int(n * f + 0.5); print x < 1 ? 1 : x }')
  T=$(mktemp -d); i=1
  while [ $i -le $P ]; do
    R=$(( (i - 1) * G / 2 % 100 ))
    tail -n +$(( R + 1 )) "$SHOGI/tools/match/openings.txt" > "$T/op-$i.txt"; if [ $R -gt 0 ]; then head -n $R "$SHOGI/tools/match/openings.txt" >> "$T/op-$i.txt"; fi
    KPNET="$NET" PARAMS="$V5" "$WORK/usimatch" "$WORK/cur.bin" "$N" "$KP" "$WORK" "$G" --opt "Nodes=$N2" --openings "$T/op-$i.txt" > "$T/m-$i.txt" 2>&1 &
    i=$((i + 1))
  done
  wait
  for f in "$T"/m-*.txt; do grep "total" "$f" | tail -1; done | sed 's/.*total +\([0-9]*\) -\([0-9]*\) =\([0-9]*\).*/\1 \2 \3/' | awk -v n="$N" -v n2="$N2" -v f="$F" '
    { ow += $1; nw += $2; d += $3 } END { t = ow + nw + d; if (!t) { print "no games finished"; exit 1 } s = (nw + d / 2) / t; ss = s < 0.01 ? 0.01 : s > 0.99 ? 0.99 : s;
      printf "level %7d nodes: new at %7d (x %.2f): new +%d -%d =%d  score %.3f  Elo %+.0f\n", n, n2, f, nw, ow, d, s, -400 * log(1 / ss - 1) / log(10) }'
  rm -rf "$T"
done; done
