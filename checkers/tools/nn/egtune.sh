#!/bin/sh
# Teach an existing net the endgames (<= 6 pieces) from the endgame database, changing nothing else in it.
#   tools/nn/egtune.sh <net.nnue> [out.nnue]        e.g. tools/nn/egtune.sh nnwork/net-30.nnue
# Why: self-play stops a game once egdb6.bin knows the result, so the self-play nets never see <= 6 pieces.
# The site only has a 4-piece database, so there the net has to judge 5-6 piece endings itself.
# Only the weights that serve <= 6 pieces are trained (feature bucket 3 and output buckets 6-7 of the 4 / 8 buckets);
# the rest of the file stays byte for byte the same. Then: matches under the site's conditions (4-piece database, browser speed).
# Settings: EGN (samples, 6000000), EPOCHS (8), P (processes for the matches)
set -e
cd "$(dirname "$0")/../.."
IN=$1; OUT=${2:-${IN%.nnue}-eg.nnue}
W=${WORK:-nnwork}; export WORK=$W
[ -f "$W/egdb6.bin" ] || { echo "needs $W/egdb6.bin (tools/nn/loop.sh builds it)"; exit 1; }
tools/nn/build.sh
BIN=$W/ck-native; export BIN
[ -f $W/base.bin ] || gzip -dc evalnet.bin.gz > $W/base.bin
[ -f $W/egdb4.bin ] || gzip -dc egdb4.bin.gz > $W/egdb4.bin
if [ ! -f $W/eg/done ]; then
  mkdir -p $W/eg; rm -f $W/eg/eg6.bin
  echo "endgame samples: ${EGN:-6000000} positions (2-6 pieces)"
  EGDB=$W/egdb6.bin $BIN egsample ${EGN:-6000000} $W/eg/eg6.bin 2 6 1 && touch $W/eg/done
fi
python3 tools/nn/train.py --init "$IN" --only-pieces 6 --epochs ${EPOCHS:-8} --lr 0.001 --out "$OUT" $W/eg/eg6.bin 2>/dev/null | tail -3
P=${P:-$(getconf _NPROCESSORS_ONLN)}
H=$(od -A n -t u4 -j 8 -N 4 "$OUT" | tr -d ' ')
case $H in 512) SK=20/50 ;; 256) SK=20/33 ;; 128) SK=20/25 ;; *) SK=20/20 ;; esac; SITEK=${SITEK:-$SK}
echo "SITE conditions (4-piece database, browser speed: net ${SITEK%%/*}k vs current ${SITEK##*/}k nodes):"
EGDB=$W/egdb4.bin tools/nn/match.sh ${SITEK%%/*}k:"$OUT" ${SITEK##*/}k:$W/base.bin $P
echo "same, before the endgame training:"
EGDB=$W/egdb4.bin tools/nn/match.sh ${SITEK%%/*}k:"$IN" ${SITEK##*/}k:$W/base.bin $P
echo "done: $OUT"
