#!/bin/sh
# Engine match on the 3-move ballots (tools/ballots.txt), every ballot played twice with colours swapped, split over processes.
#   tools/nn/match.sh <A> <B> [processes] [ballots]
# Players: "<n>k" = n thousand nodes per move, "<n>ms" = time per move, optionally ":<net file>" (none / "-" = hand-made evaluation).
#   tools/nn/match.sh 20k:nnwork/net-3.nnue 20k:nnwork/net-2.nnue        # the new net against the previous one, same nodes
#   tools/nn/match.sh 100ms:nnwork/net.nnue 100ms:evalnet.bin            # same time (the bigger net is slower: this is the real test)
# Endgame database for adjudication / search: EGDB=<file> (default nnwork/egdb6.bin when it exists, else none).
# Output: "A vs B: +w =d -l  score s  Elo e ± ci (pairs +x -y)".
set -e
cd "$(dirname "$0")/../.."
A=$1; B=$2; P=${3:-$(getconf _NPROCESSORS_ONLN)}
BIN=${BIN:-${WORK:-nnwork}/ck-native}; [ -x "$BIN" ] || tools/nn/build.sh
[ -z "${EGDB+x}" ] && [ -f ${WORK:-nnwork}/egdb6.bin ] && export EGDB=${WORK:-nnwork}/egdb6.bin
NB=$(grep -vc '^#' tools/ballots.txt); NB=${4:-$NB}
T=$(mktemp -d); i=0
while [ $i -lt $P ]; do
  from=$(( NB * i / P )); to=$(( NB * (i + 1) / P ))
  "$BIN" bmatch "$A" "$B" $from $to > $T/r$i.txt 2>/dev/null &
  i=$((i + 1))
done
wait
cat $T/r*.txt | awk -v A="$A" -v B="$B" '/^RESULT/ { w += $2; d += $3; l += $4; pw += $5; pl += $6 }
  END { n = w + d + l; if (!n) { print "no games"; exit 1 }
    s = (w + d / 2) / n; v = (w * (1 - s) ^ 2 + d * (0.5 - s) ^ 2 + l * (0 - s) ^ 2) / n; se = sqrt(v / n);
    elo = function_elo(s); lo = function_elo(s - 1.96 * se); hi = function_elo(s + 1.96 * se);
    printf "%s vs %s: +%d =%d -%d  score %.3f  Elo %+.0f ± %.0f  (pairs +%d -%d)\n", A, B, w, d, l, s, elo, (hi - lo) / 2, pw, pl }
  function function_elo(x) { if (x <= 0.001) x = 0.001; if (x >= 0.999) x = 0.999; return -400 * log(1 / x - 1) / log(10) }'
rm -rf $T
