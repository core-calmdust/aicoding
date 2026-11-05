#!/bin/sh
# Self-play training data for the learned evaluation, in parallel.
#   tools/nn/gen.sh <variant> <games per process> <nodesK> <outdir> [processes] [net file]
# e.g. tools/nn/gen.sh 0 500 10 data 8              (hand-made evaluation, 8 processes × 500 games, 10k nodes per move)
#      tools/nn/gen.sh 0 500 10 data2 8 tafl-v0.nnue (the second round: the games are played with the net)
set -e
cd "$(dirname "$0")/../.."
V=$1; G=$2; NK=$3; OUT=$4; P=${5:-$(getconf _NPROCESSORS_ONLN)}; NET=$6
mkdir -p "$OUT"
cc -O3 -DNATIVE -w -o "$OUT/tafl-native" tools/native.c -lm
i=1
while [ $i -le $P ]; do
  SEED=$(( $(date +%s) % 100000 * 100 + i ))
  if [ -n "$NET" ]; then NNUE="$NET" "$OUT/tafl-native" gendata $V $G $NK "$OUT/v${V}-$SEED.txt" $SEED 2>"$OUT/log-$SEED.txt" &
  else "$OUT/tafl-native" gendata $V $G $NK "$OUT/v${V}-$SEED.txt" $SEED 2>"$OUT/log-$SEED.txt" & fi
  i=$((i + 1))
done
wait
cat "$OUT"/v${V}-*.txt | wc -l
