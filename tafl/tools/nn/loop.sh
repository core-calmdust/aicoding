#!/bin/sh
# Reinforcement loop for the learned evaluation: self-play with the latest net → train (continuing from it) → measure, repeated.
#   tools/nn/loop.sh <rounds> [games per process per round] [nodesK] [processes]
#   e.g. tools/nn/loop.sh 12 1000 10 8
# Work folder nnwork/ (resumable: finished rounds are skipped, so the same command continues after an interruption):
#   nnwork/rN/        the round's self-play records (round 1: the hand-made evaluation; later: the net of the previous round)
#   nnwork/net-N.nnue the round's net (+ .pt checkpoint), nnwork/net.nnue = the latest
#   nnwork/log.txt    training summaries and the per-role measurement of every round (nrole against the hand-made evaluation)
# A quarter of the processes play with the defenders reading fewer nodes (DEFK) so that games the attackers win are not rare.
# Settings by environment: V (rule set, 0), H (hidden units, 256), EPOCHS (12), WINDOW (rounds of data per training, 4),
#   LAM (0.75), SCALE (1000), DEFK (2), EXTRA (more record files for every training, e.g. "data/v0-*.txt data20/v0-*.txt"),
#   MAXPOS (positions per training, 30000000), EVAL ("50 20 2": nrole pairs, attackers' / defenders' nodesK)
#   WORK (work folder, nnwork; use another one for another rule set, e.g. V=1 WORK=nnwork-brandubh)
set -e
cd "$(dirname "$0")/../.."
R=$1; G=${2:-1000}; NK=${3:-10}; P=${4:-$(getconf _NPROCESSORS_ONLN)}
V=${V:-0}; H=${H:-256}; EPOCHS=${EPOCHS:-12}; WINDOW=${WINDOW:-4}; LAM=${LAM:-0.75}; SCALE=${SCALE:-1000}; DEFK=${DEFK:-2}
MAXPOS=${MAXPOS:-30000000}; EVAL=${EVAL:-"50 20 2"}
W=${WORK:-nnwork}; mkdir -p $W
cc -O3 -DNATIVE -w -o $W/tafl-native tools/native.c -lm
log() { echo "$(date '+%m-%d %H:%M') $*" | tee -a $W/log.txt; }
r=1
while [ $r -le $R ]; do
  if [ -f $W/net-$r.nnue ]; then r=$((r + 1)); continue; fi
  prev=$((r - 1)); NET=""; [ $prev -ge 1 ] && NET=$W/net-$prev.nnue
  # 1. self-play
  if [ ! -f $W/r$r/done ]; then
    rm -rf $W/r$r; mkdir -p $W/r$r
    log "round $r: self-play with ${NET:-the hand-made evaluation}, $P processes x $G games, ${NK}k nodes"
    i=1
    while [ $i -le $P ]; do
      SEED=$(( r * 1000 + i ))
      if [ $((i % 4)) -eq 0 ]; then DK=$DEFK; else DK=""; fi
      ( [ -n "$NET" ] && export NNUE=$NET; [ -n "$DK" ] && export DEFK=$DK; $W/tafl-native gendata $V $G $NK $W/r$r/v$V-$SEED.txt $SEED 2>$W/r$r/log-$SEED.txt ) &
      i=$((i + 1))
    done
    wait
    touch $W/r$r/done
    log "round $r: $(cat $W/r$r/v$V-*.txt | wc -l | tr -d ' ') positions"
  fi
  # 2. training on the last WINDOW rounds (+ EXTRA), continuing from the previous net
  FILES=""; k=$((r - WINDOW + 1)); [ $k -lt 1 ] && k=1
  while [ $k -le $r ]; do FILES="$FILES $W/r$k/v$V-*.txt"; k=$((k + 1)); done
  INIT=""; [ -n "$NET" ] && [ -f $NET.pt ] && INIT="--init $NET.pt"
  log "round $r: training (rounds $((r - WINDOW + 1 < 1 ? 1 : r - WINDOW + 1))-$r ${EXTRA:++ extra})"
  python3 tools/nn/train.py --variant $V --hidden $H --epochs $EPOCHS --lam $LAM --scale $SCALE --max-positions $MAXPOS $INIT \
    --out $W/tmp.nnue $FILES $EXTRA > $W/train-$r.txt 2>&1
  tail -1 $W/train-$r.txt | tee -a $W/log.txt
  mv $W/tmp.nnue.pt $W/net-$r.nnue.pt; mv $W/tmp.nnue $W/net-$r.nnue; cp $W/net-$r.nnue $W/net.nnue
  # 3. measurement: the net in each role against the hand-made evaluation
  NNUE=$W/net-$r.nnue $W/tafl-native nrole $V $EVAL 2>/dev/null | tail -1 | sed "s/^/round $r: /" | tee -a $W/log.txt
  r=$((r + 1))
done
log "done: $W/net.nnue"
