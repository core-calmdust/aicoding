#!/bin/bash
# One go: build -> download -> prep -> train -> nnue.bin.gz
#   bash shogi/tools/nnue/run.sh
# Settings (environment variables): WORK (default ~/shogi-nnue-work), COUNT (data files, default 30),
#   EPOCHS (default 8), LAMBDA (default 0.75), HIDDEN (default 256), EXTRA (more train options)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
WORK=${WORK:-$HOME/shogi-nnue-work}; export WORK
EPOCHS=${EPOCHS:-8}; LAMBDA=${LAMBDA:-0.75}; HIDDEN=${HIDDEN:-256}
mkdir -p "$WORK"
echo "== build"
cc -O3 -o "$WORK/prep" "$HERE/prep.c"
cc -O3 -o "$WORK/train" "$HERE/train.c" -lpthread -lm
cd "$WORK"
if [ ! -s train.bin ]; then echo "== download"; bash "$HERE/fetch.sh"; fi
if [ ! -s train.bin ]; then
  echo "== prep"
  ./prep train.bin raw/*.bin
  echo "(raw/ can be deleted now to free disk space)"
fi
echo "== train"
./train train.bin nnue.bin --val val.bin --epochs "$EPOCHS" --lambda "$LAMBDA" --hidden "$HIDDEN" $EXTRA 2>&1 | tee -a train.log
gzip -9 -k -f nnue.bin
echo
echo "done: $WORK/nnue.bin.gz  (log: $WORK/train.log)"
