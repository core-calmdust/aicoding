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
if [ ! -s pikafish.nnue ]; then
  echo "== Pikafish network"
  curl -fL --retry 5 -o pikafish.nnue https://github.com/official-pikafish/Networks/releases/download/master-net/pikafish.nnue
fi
uciok() { printf 'uci\nquit\n' | "$1" 2>/dev/null | grep -q uciok; }
# (macOS file names ignore case: the source folder and the program must not be "Pikafish" / "pikafish" side by side)
[ -d Pikafish ] && [ ! -d pikafish-src ] && mv Pikafish pikafish-src
if [ ! -x teacher ] || ! uciok ./teacher; then
  echo "== Pikafish (GPL-3.0; used here only as the teacher, nothing of it goes into the site)"
  [ -d pikafish-src ] || git clone --depth 1 https://github.com/official-pikafish/Pikafish.git pikafish-src
  cp pikafish.nnue pikafish-src/src/pikafish.nnue
  rm -f teacher
  ( cd pikafish-src/src && { make -j build > ../../build.log 2>&1 || make -j build ARCH=apple-silicon >> ../../build.log 2>&1 || make -j build ARCH=native >> ../../build.log 2>&1; } ) || true
  [ -f pikafish-src/src/pikafish ] && cp pikafish-src/src/pikafish ./teacher
  if [ ! -x teacher ] || ! uciok ./teacher; then
    echo "Pikafish could not be built or does not start. Last lines of $WORK/build.log:"; tail -30 build.log; exit 1
  fi
  echo "Pikafish OK"
fi
echo "== self-play data ($GAMES games, $NODES nodes per move; stop any time, re-run continues)"
DONE=$(cat games.done 2>/dev/null || echo 0)
[ -s data.bin ] || DONE=0
while [ "$DONE" -lt "$GAMES" ]; do
  N=$(( GAMES - DONE < BATCH ? GAMES - DONE : BATCH ))
  ./datagen ./teacher data.bin --games $N --nodes $NODES --evalfile "$WORK/pikafish.nnue" --seed $((DONE + 1)) || { echo "datagen failed"; exit 1; }
  DONE=$((DONE + N)); echo $DONE > games.done
  echo "  $DONE / $GAMES games, $(( $(wc -c < data.bin) / 56 )) positions"
done
echo "== train"
./train data.bin nnue.bin --epochs "$EPOCHS" --lambda "$LAMBDA" $EXTRA 2>&1 | tee -a train.log
gzip -9 -k -f nnue.bin
echo
echo "done: $WORK/nnue.bin.gz  (log: $WORK/train.log)"
