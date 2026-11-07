#!/bin/sh
# Reinforcement loop for the checkers NNUE: self-play with the latest net -> train (continuing from it) -> measure, repeated.
#   tools/nn/loop.sh <rounds> [games per process per round] [processes]
#   e.g. tools/nn/loop.sh 12 600 10
# Resumable: finished rounds are skipped, so the same command continues after an interruption.
# Work folder nnwork/ (WORK=...):
#   egdb6.bin           endgame database (6 pieces), built once at the start (hours; SKIP_EGDB=1 to go without)
#   base.bin            the current site's small net (evalnet.bin.gz, unpacked): round 1 plays with it
#   rN/                 the round's self-play records (*.bin, 24 bytes per position)
#   net-N.nnue (.npz)   the round's net (+ float weights for --init); net.nnue = the latest
#   eg/eg6.bin          endgame positions (2-6 pieces) labelled by egdb6.bin, added to every training (EGN positions, 6000000)
#   egdb4.bin           the site's endgame database (egdb4.bin.gz, unpacked): used in the SITE match
#   log.txt             positions, training summaries, matches (new vs previous at equal nodes, vs base at equal time)
# Settings (environment):
#   NODES (self-play nodes per move in thousands, 20)   XR (random plies after the ballot, 0..XR, 4)
#   H (hidden, 256)  FB (feature buckets, 4)  OB (output buckets, 8)  L1 (32)  L2 (32)
#   EPOCHS (10)  WINDOW (rounds of data per training, 4)  LAM (0.75)  LR (0.001 for round 1, then LR2 = 0.0005)
#   MAXPOS (positions per training, 40000000)  EXTRA (more record files for every training)
#   MNODES (match nodes, 20k)  MTIME (equal-time match vs base, 50ms; "" to skip)  EGN (endgame samples, 6000000)
#   SITEK (the "SITE" match: net / base nodes in thousands at browser speed, 4-piece DB; by H, e.g. 20/50 for 512; "" to skip)
#   The SITE line is the one that decides whether a net goes on the site.
set -e
cd "$(dirname "$0")/../.."
R=$1; G=${2:-500}; P=${3:-$(getconf _NPROCESSORS_ONLN)}
NODES=${NODES:-20}; XR=${XR:-4}; H=${H:-256}; FB=${FB:-4}; OB=${OB:-8}; L1=${L1:-32}; L2=${L2:-32}
EPOCHS=${EPOCHS:-10}; WINDOW=${WINDOW:-4}; LAM=${LAM:-0.75}; LR=${LR:-0.001}; LR2=${LR2:-0.0005}; MAXPOS=${MAXPOS:-40000000}
MNODES=${MNODES:-20k}; MTIME=${MTIME-50ms}
# browser speed vs the current net (wasm SIMD): H=512 0.4x, 256 0.6x, 128 0.8x -> "net nodes / base nodes" in thousands
case $H in 512) SK=20/50 ;; 256) SK=20/33 ;; 128) SK=20/25 ;; *) SK=20/20 ;; esac
SITEK=${SITEK-$SK}
W=${WORK:-nnwork}; mkdir -p $W
export WORK=$W
tools/nn/build.sh
BIN=$W/ck-native; export BIN
log() { echo "$(date '+%m-%d %H:%M') $*" | tee -a $W/log.txt; }
[ -f $W/base.bin ] || gzip -dc evalnet.bin.gz > $W/base.bin
if [ -z "$SKIP_EGDB" ] && [ ! -f $W/egdb6.bin ]; then
  log "endgame database (6 pieces): building (checkpoints in $W/egdb.d)"
  CKPT_DIR=$W/egdb.d $W/ck-egdb 6 $W/egdb6.tmp 2> $W/egdb.log && mv $W/egdb6.tmp $W/egdb6.bin
  log "endgame database: $(ls -l $W/egdb6.bin | awk '{print $5}') bytes"
fi
[ -f $W/egdb6.bin ] && export EGDB=$W/egdb6.bin
[ -f $W/egdb4.bin ] || gzip -dc egdb4.bin.gz > $W/egdb4.bin
# self-play ends a game once the database knows the result, so the games teach nothing about <= 6 pieces: these samples do
EGFILE=""
if [ -f $W/egdb6.bin ]; then
  if [ ! -f $W/eg/done ]; then
    mkdir -p $W/eg; rm -f $W/eg/eg6.bin
    log "endgame samples: ${EGN:-6000000} positions (2-6 pieces) from egdb6.bin"
    $BIN egsample ${EGN:-6000000} $W/eg/eg6.bin 2 6 1 2> $W/eg/log.txt && touch $W/eg/done
  fi
  EGFILE=$W/eg/eg6.bin
fi
r=1
while [ $r -le $R ]; do
  if [ -f $W/net-$r.nnue ]; then r=$((r + 1)); continue; fi
  prev=$((r - 1)); NET=$W/base.bin; [ $prev -ge 1 ] && NET=$W/net-$prev.nnue
  # 1. self-play
  if [ ! -f $W/r$r/done ]; then
    rm -rf $W/r$r; mkdir -p $W/r$r
    log "round $r: self-play with $NET, $P processes x $G games, ${NODES}k nodes"
    i=1
    while [ $i -le $P ]; do
      SEED=$(( r * 1000 + i ))
      $BIN gen2 $G ${NODES}k:$NET $W/r$r/d-$SEED.bin $SEED $XR 2> $W/r$r/log-$SEED.txt &
      i=$((i + 1))
    done
    wait
    touch $W/r$r/done
    log "round $r: $(cat $W/r$r/d-*.bin | wc -c | awk '{print int($1 / 24)}') positions"
  fi
  # 2. training on the last WINDOW rounds (+ EXTRA), continuing from the previous net
  # validation = the newest round's first file, never trained on (a net continued from the previous one has learned
  # the older rounds, so validating on them always favours the old net: nets then stopped changing)
  VALF=$(ls $W/r$r/d-*.bin | head -1)
  FILES=""; k=$((r - WINDOW + 1)); [ $k -lt 1 ] && k=1
  while [ $k -le $r ]; do for f in $W/r$k/d-*.bin; do [ "$f" = "$VALF" ] || FILES="$FILES $f"; done; k=$((k + 1)); done
  INIT=""; RLR=$LR
  if [ $prev -ge 1 ] && [ -f $W/net-$prev.nnue.npz ]; then INIT="--init $W/net-$prev.nnue.npz"; RLR=$LR2; fi
  log "round $r: training (data rounds $(( r - WINDOW + 1 < 1 ? 1 : r - WINDOW + 1 ))-$r${EXTRA:+ + extra})"
  python3 tools/nn/train.py --fb $FB --hidden $H --l1 $L1 --l2 $L2 --ob $OB --epochs $EPOCHS --lam $LAM --lr $RLR \
    --max-positions $MAXPOS --seed $r $INIT --val-data $VALF --out $W/tmp.nnue $FILES $EGFILE $EXTRA > $W/train-$r.txt 2>/dev/null
  tail -1 $W/train-$r.txt | sed "s/^/round $r: /" | tee -a $W/log.txt
  grep -q saved $W/train-$r.txt || log "round $r: WARNING the net did not improve on the validation data (same as the previous one)" 
  mv $W/tmp.nnue.npz $W/net-$r.nnue.npz; mv $W/tmp.nnue $W/net-$r.nnue; cp $W/net-$r.nnue $W/net.nnue
  # 3. measurement
  tools/nn/match.sh $MNODES:$W/net-$r.nnue $MNODES:$NET $P | sed "s/^/round $r: /" | tee -a $W/log.txt
  [ -n "$MTIME" ] && tools/nn/match.sh $MTIME:$W/net-$r.nnue $MTIME:$W/base.bin $P | sed "s/^/round $r: /" | tee -a $W/log.txt
  # the site: 4-piece database, and in the browser (wasm) the net is slower than the current one (SITEK = its nodes vs base's)
  [ -n "$SITEK" ] && EGDB=$W/egdb4.bin tools/nn/match.sh ${SITEK%%/*}k:$W/net-$r.nnue ${SITEK##*/}k:$W/base.bin $P | sed "s/^/round $r: SITE /" | tee -a $W/log.txt
  r=$((r + 1))
done
log "done: $W/net.nnue"
