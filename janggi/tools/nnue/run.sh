#!/bin/bash
# Janggi NNUE: build -> self-play data with our own engine (the teacher) -> train -> nnue.bin.gz
#   bash janggi/tools/nnue/run.sh
# Settings: WORK (default ~/janggi-nnue-work), GAMES (default 100000), NODES (thousand positions per move, default 8),
#   EPOCHS (default 10), LAMBDA (default 0.6), JOBS (default: all cores), NET (a net.bin as the teacher's evaluation:
#   the second round), EXTRA (more train options)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
WORK=${WORK:-$HOME/janggi-nnue-work}; GAMES=${GAMES:-100000}; NODES=${NODES:-8}
EPOCHS=${EPOCHS:-10}; LAMBDA=${LAMBDA:-0.6}
JOBS=${JOBS:-$( (sysctl -n hw.ncpu || nproc) 2>/dev/null | head -1)}; JOBS=${JOBS:-4}
BATCH=$(( 250 * JOBS ))
mkdir -p "$WORK"; cd "$WORK"
echo "== build tools"
cc -O3 -DNATIVE -w -o jg "$HERE/../native.c" -lm
cc -O3 -o train "$HERE/../../../xiangqi/tools/nnue/train.c" -lpthread -lm   # (the trainer is shared with xiangqi: same board, same record)
[ -n "$NET" ] && echo "teacher evaluation: $NET"
echo "== self-play data ($GAMES games, ${NODES}k positions per move, $JOBS processes; stop any time, re-run continues)"
DONE=$(cat games.done 2>/dev/null || echo 0)
ls data.w*.bin > /dev/null 2>&1 || DONE=0
T0=$(date +%s)
while [ "$DONE" -lt "$GAMES" ]; do
  N=$(( GAMES - DONE < BATCH ? GAMES - DONE : BATCH )); PER=$(( (N + JOBS - 1) / JOBS )); rm -f part.w*.bin
  for k in $(seq 1 "$JOBS"); do ./jg datagen "part.w$k.bin" "$PER" "$NODES" $(( DONE * 131 + k )) $NET 2> /dev/null & done
  wait
  for k in $(seq 1 "$JOBS"); do cat "part.w$k.bin" >> "data.w$k.bin"; rm -f "part.w$k.bin"; done   # (a batch counts only when it is whole)
  DONE=$(( DONE + PER * JOBS )); echo $DONE > games.done
  POS=$(( $(cat data.w*.bin | wc -c) / 56 ))
  echo "  $DONE / $GAMES games, $POS positions, $(( ($(date +%s) - T0) / 60 )) min"
done
cat data.w*.bin > data.bin
echo "== train"
./train data.bin nnue.bin --epochs "$EPOCHS" --lambda "$LAMBDA" $EXTRA 2>&1 | tee -a train.log
gzip -9 -k -f nnue.bin
echo "== check"
./jg nncheck nnue.bin | tee -a train.log
./jg nmatch nnue.bin 14 14 200 1 | tee -a train.log
echo
echo "done: $WORK/nnue.bin.gz  (log: $WORK/train.log)"
