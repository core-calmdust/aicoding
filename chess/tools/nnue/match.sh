#!/bin/sh
# netA vs netB with the site's engine (native), P processes at once, pairs of games from random openings with colours swapped.
#   tools/nnue/match.sh <netA> <netB> [nodes per move | Nms] [games per process] [processes]
#   e.g. tools/nnue/match.sh nnwork/net.bin nnwork/base.bin 20000 40 12
# "-" for a net = the hand-made evaluation. Prints netA's result, score and Elo (with a 95% range).
set -e
cd "$(dirname "$0")/../.."
W=${WORK:-nnwork}
A=$1; B=$2; L=${3:-20000}; G=${4:-40}; P=${5:-$(getconf _NPROCESSORS_ONLN)}
[ -x "$W/nntool" ] || tools/nnue/build.sh
T=$(mktemp -d)
i=1
while [ $i -le $P ]; do
  "$W/nntool" match "$W/chess-uci" "$A" "$B" "$L" "$G" $((i * 7919 + ${SEED:-0})) > "$T/$i.txt" 2> "$T/$i.log" &
  i=$((i + 1))
done
wait
cat "$T"/*.txt | awk -v a="$A" -v b="$B" -v l="$L" '
  { gsub(/[+=-]/, " "); w += $1; ls += $2; d += $3 }
  END { n = w + ls + d; s = (w + d / 2) / n; v = (w * (1 - s) ^ 2 + ls * s ^ 2 + d * (0.5 - s) ^ 2) / n; e = 1.96 * sqrt(v / n);
        lo = s - e; hi = s + e; if (lo < 0.001) lo = 0.001; if (hi > 0.999) hi = 0.999; ss = s; if (ss < 0.001) ss = 0.001; if (ss > 0.999) ss = 0.999;
        printf "%s vs %s (%s): +%d -%d =%d  score %.3f  Elo %+.0f (%+.0f .. %+.0f)\n", a, b, l, w, ls, d, s,
          -400 * log(1 / ss - 1) / log(10), -400 * log(1 / lo - 1) / log(10), -400 * log(1 / hi - 1) / log(10) }'
rm -rf "$T"
