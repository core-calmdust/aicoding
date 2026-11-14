#!/bin/bash
# Relabel training positions with the teacher (tools/nnue/setup-teacher.sh), P processes at once.
#   bash tools/nnue/relabel.sh <train.bin (prepared positions)> <how many positions> [depth (default 12) | Nn = nodes]
#   e.g. bash tools/nnue/relabel.sh ~/shogi-ob8/train.bin 28000 12          (a speed test: about a minute or two)
#        caffeinate -i bash tools/nnue/relabel.sh ~/shogi-ob8/train.bin 30000000 12
# The positions are taken evenly over the whole file. OUT (default ~/shogi-relabel) gets part-N.psv and, at the end,
# relabel.bin (all parts): train on it with  DATA=~/shogi-relabel/relabel.bin KMAP=k1 WORK=... bash tools/nnue/run-kp.sh
# Stopped (Ctrl-C)? The same command continues (keep the same numbers).
# TEACHER (default ~/shogi-teacher), P (default: all cores but one), FV_SCALE (default 20 = Hao; Suisho5: 24): the
# teacher's score scale. The last lines compare the new scores with the old ones: "the new scores x 1.00 fit" is right;
# far from 1 means FV_SCALE does not suit the evaluation file.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
IN=${1:?usage: relabel.sh <train.bin> <positions> [depth | Nn]}; N=${2:?how many positions}; D=${3:-12}
T=${TEACHER:-$HOME/shogi-teacher}; OUT=${OUT:-$HOME/shogi-relabel}; P=${P:-$(( $(getconf _NPROCESSORS_ONLN) - 1 ))}; FV=${FV_SCALE:-20}
[ -x "$T/YaneuraOu-by-gcc" ] && [ -s "$T/eval/nn.bin" ] || { echo "no teacher in $T: bash tools/nnue/setup-teacher.sh first"; exit 1; }
mkdir -p "$OUT"; cc -O2 -w -o "$OUT/relabel" "$HERE/relabel.c" -lm
TOTAL=$(( $(wc -c < "$IN") / 40 )); S=$(( TOTAL / N )); [ $S -lt 1 ] && S=1; EACH=$(( (N + P - 1) / P ))
echo "$TOTAL positions in the file; $N to relabel (every ${S}th), $D, $P processes, FV_SCALE $FV -> $OUT"
trap 'kill $(jobs -p) 2>/dev/null; echo; echo "stopped: the same command continues"; exit 1' INT TERM
i=0
while [ $i -lt $P ]; do
  "$OUT/relabel" "$IN" "$OUT/part-$i.psv" $(( i * S )) $(( P * S )) $EACH "$T/YaneuraOu-by-gcc" "$T" "$D" --opt FV_SCALE=$FV > "$OUT/part-$i.log" 2>/dev/null &
  i=$((i + 1))
done
T0=$(date +%s)
while [ -n "$(jobs -rp)" ]; do
  sleep 20
  DONE=0; for f in "$OUT"/part-*.psv.next; do [ -s "$f" ] && DONE=$(( DONE + $(cut -d' ' -f1 "$f") )); done
  EL=$(( $(date +%s) - T0 )); [ $EL -lt 1 ] && EL=1
  printf '\r  %d / %d   (this run: %d s)   ' "$DONE" "$N" "$EL"
done
echo
wait
cat "$OUT"/part-*.log | grep "^relabelled" | awk '{ n += $2; x = $4; gsub(/[(]/, "", x); w += x; r += $(NF-1) } END { printf "total: %d positions (%d written), %.0f positions/s over the processes = %.1f million per hour\n", n, w, r, r * 3600 / 1e6 }'
grep -h "^old vs new" "$OUT"/part-0.log || true
cat "$OUT"/part-*.psv > "$OUT/relabel.bin"
echo "done: $OUT/relabel.bin ($(( $(wc -c < "$OUT/relabel.bin") / 40 )) positions)"
