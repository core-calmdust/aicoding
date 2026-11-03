#!/bin/bash
# Xiangqi NNUE: build -> Pikafish (teacher, local only) -> self-play data -> train -> nnue.bin.gz
#   bash xiangqi/tools/nnue/run.sh
# Settings: WORK (default ~/xiangqi-nnue-work), GAMES (default 100000), NODES (teacher nodes per move, default 8000),
#   EPOCHS (default 10), LAMBDA (default 0.8), EXTRA (more train options)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
WORK=${WORK:-$HOME/xiangqi-nnue-work}; GAMES=${GAMES:-100000}; NODES=${NODES:-8000}
EPOCHS=${EPOCHS:-10}; LAMBDA=${LAMBDA:-0.8}; BATCH=5000
mkdir -p "$WORK"; cd "$WORK"
echo "== build tools"
cc -O2 -DNATIVE -w -o datagen "$HERE/datagen.c" -lm
cc -O3 -o train "$HERE/train.c" -lpthread -lm
if [ ! -x pikafish ]; then
  echo "== Pikafish (GPL-3.0; used here only as the teacher, nothing of it goes into the site)"
  [ -d Pikafish ] || git clone --depth 1 https://github.com/official-pikafish/Pikafish.git
  ARCH=x86-64-avx2; [ "$(uname -m)" = arm64 ] && ARCH=apple-silicon
  (cd Pikafish/src && make -j build ARCH=$ARCH >/dev/null) && cp Pikafish/src/pikafish ./pikafish
fi
if [ ! -s pikafish.nnue ]; then
  echo "== Pikafish network"
  URL=$(curl -sSfL https://api.github.com/repos/official-pikafish/Networks/releases/latest | grep -o '"browser_download_url": *"[^"]*\.nnue"' | head -1 | sed 's/.*"\(http[^"]*\)"/\1/')
  [ -n "$URL" ] || { echo "network URL not found: download pikafish.nnue from https://github.com/official-pikafish/Networks/releases into $WORK"; exit 1; }
  curl -fL --retry 5 -o pikafish.nnue "$URL"
fi
echo "== self-play data ($GAMES games, $NODES nodes per move; stop any time, re-run continues)"
DONE=$(cat games.done 2>/dev/null || echo 0)
while [ "$DONE" -lt "$GAMES" ]; do
  N=$(( GAMES - DONE < BATCH ? GAMES - DONE : BATCH ))
  ./datagen ./pikafish data.bin --games $N --nodes $NODES --evalfile "$WORK/pikafish.nnue" --seed $((DONE + 1))
  DONE=$((DONE + N)); echo $DONE > games.done
  echo "  $DONE / $GAMES games, $(( $(wc -c < data.bin) / 56 )) positions"
done
echo "== train"
./train data.bin nnue.bin --epochs "$EPOCHS" --lambda "$LAMBDA" $EXTRA 2>&1 | tee -a train.log
gzip -9 -k -f nnue.bin
echo
echo "done: $WORK/nnue.bin.gz  (log: $WORK/train.log)"
