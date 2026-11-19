#!/bin/bash
# Alquerque: the learned evaluation, from start to finish (README.md here, alquerque/MODEL_CARD.md):
#   build -> self-play with our own engine (the teacher) on every core -> train -> check -> the file to adopt
#   bash alquerque/tools/nnue/run.sh
# Stop it any time (Ctrl-C) and run it again: it goes on where it was. Settings (environment):
#   WORK       the folder for everything (default ~/alquerque-nnue-work; an external disk works: WORK="/Volumes/Orico A 8TB/alquerque-nnue")
#   POSITIONS  self-play positions (default 20000000)       NODES  thousand positions searched a move (default 16)
#   JOBS       processes at once (default: all cores)       EPOCHS (default 10)   LAMBDA (default 0.7: search value × λ + result × (1 − λ))
#   EXTRA      more options for train                       ROUNDS rounds (default 1; round 2 on: the round before's net is the teacher
#              and the baseline to beat)
#   MATCH_PAIRS  the check: openings (each played twice, colours swapped; default 300)   MATCH_MS (default 100: ms a move)
#   MATCH_NODES  the check at a fixed number of positions a move (thousands, default 20)
#   BASE_AQV   the engine's search bits for both players (default 11 = the site's engine; the net adds 16)
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../.." && pwd)
WORK=${WORK:-$HOME/alquerque-nnue-work}; POSITIONS=${POSITIONS:-20000000}; NODES=${NODES:-16}
EPOCHS=${EPOCHS:-10}; LAMBDA=${LAMBDA:-0.7}; ROUNDS=${ROUNDS:-1}
MATCH_PAIRS=${MATCH_PAIRS:-300}; MATCH_MS=${MATCH_MS:-100}; MATCH_NODES=${MATCH_NODES:-20}; BASE_AQV=${BASE_AQV:-11}
JOBS=${JOBS:-$( (sysctl -n hw.ncpu || nproc) 2>/dev/null | head -1)}; JOBS=${JOBS:-4}
GAMES=${GAMES:-200}   # games a process a batch (a batch counts only when every process has finished it)
mkdir -p "$WORK/bin"; cd "$WORK"
echo "== build ($WORK/bin)"
cc -O3 -w "$HERE/aq.c" -lm -o bin/aq
cc -O3 -w "$HERE/train.c" -lm -lpthread -o bin/train
gunzip -c "$ROOT/fanorona/alqeg.bin.gz" > bin/alqeg.bin
AQ="$WORK/bin/aq"; TRAIN="$WORK/bin/train"; EG="$WORK/bin/alqeg.bin"
# a match split over the cores: A B pairs seed log -> prints "wins losses draws" (A's)
match() {
  local A=$1 B=$2 N=$3 seed=$4 log=$5 P=$JOBS
  [ $P -gt $N ] && P=$N; [ $P -lt 1 ] && P=1
  local per=$(( (N + P - 1) / P )); : > "$log"
  for k in $(seq 1 $P); do "$AQ" match $per $(( seed * 100 + k )) "$EG" "$A" "$B" > "$log.$k" 2>/dev/null & done
  wait
  for k in $(seq 1 $P); do tail -n 1 "$log.$k" >> "$log"; rm -f "$log.$k"; done
  awk '{ sub(/^\+/, "", $2); sub(/^-/, "", $3); sub(/^=/, "", $4); w += $2; l += $3; d += $4 } END { print w, l, d }' "$log"
}
verdict() {   # wins losses draws -> "elo lo hi adopt(1/0)"
  awk -v w=$1 -v l=$2 -v d=$3 'function elo(x) { return x <= 0 ? -999 : x >= 1 ? 999 : -400 * log(1 / x - 1) / log(10) }
    BEGIN { n = w + l + d; s = (w + d / 2) / n; v = (w * (1 - s) ^ 2 + l * s ^ 2 + d * (0.5 - s) ^ 2) / n / n; se = sqrt(v > 1e-12 ? v : 1e-12);
      printf "%.0f %.0f %.0f %d\n", elo(s), elo(s - 1.96 * se), elo(s + 1.96 * se), (s - 1.645 * se > 0.5) ? 1 : 0 }'
}
NETAQV=$(( BASE_AQV | 16 ))
for ROUND in $(seq 1 $ROUNDS); do
  RD="$WORK/r$ROUND"; mkdir -p "$RD/data" "$RD/adopt"; PREV="$WORK/r$(( ROUND - 1 ))/adopt"
  echo "== round $ROUND ($RD)"
  TEACH="-"; [ $ROUND -gt 1 ] && [ -f "$PREV/alqnet.bin" ] && TEACH="$PREV/alqnet.bin"
  echo "== self-play: $POSITIONS positions, ${NODES}k positions a move, $JOBS processes, teacher: $([ "$TEACH" = - ] && echo 'the hand evaluation' || echo "$TEACH")"
  T0=$(date +%s); B=$(cat "$RD/data/batches" 2>/dev/null || echo 0)
  while :; do
    POS=$(( $(cat "$RD"/data/w*.bin 2>/dev/null | wc -c) / 24 ))
    [ $POS -ge $POSITIONS ] && break
    echo "  $POS / $POSITIONS positions  ($(( ($(date +%s) - T0) / 60 )) min this run)"
    rm -f "$RD"/data/part.*
    for k in $(seq 1 $JOBS); do "$AQ" datagen "$RD/data/part.$k.bin" $GAMES $NODES $(( ((ROUND * 7919 + B) * 1000 + k) * 100003 + 17 )) "$EG" "$TEACH" 2>/dev/null & done
    wait
    for k in $(seq 1 $JOBS); do cat "$RD/data/part.$k.bin" >> "$RD/data/w$k.bin"; rm -f "$RD/data/part.$k.bin"; done   # (a batch counts only when it is whole)
    B=$(( B + 1 )); echo $B > "$RD/data/batches"
  done
  echo "== train (log: $RD/train.log)"
  if [ -f "$RD/alqnet.bin" ] && [ "$RD/alqnet.bin" -nt "$RD/data/batches" ]; then echo "  trained already"
  else
    INIT=""; [ $ROUND -gt 1 ] && [ -f "$PREV/alqnet.bin" ] && INIT="--init $PREV/alqnet.bin"
    DATA=(); for q in $(seq 1 $ROUND); do for f in "$WORK/r$q/data/"w*.bin; do [ -f "$f" ] && DATA+=("$f"); done; done   # (every round's data)
    "$TRAIN" "$RD/alqnet.bin.tmp" "${DATA[@]}" --epochs $EPOCHS --lambda $LAMBDA --threads $JOBS $INIT $EXTRA > "$RD/train.log" 2>&1
    mv "$RD/alqnet.bin.tmp" "$RD/alqnet.bin"
  fi
  tail -n 3 "$RD/train.log"
  if [ -f "$RD/RESULT.txt" ] && [ "$RD/RESULT.txt" -nt "$RD/alqnet.bin" ]; then cat "$RD/RESULT.txt"; continue; fi   # (checked already)
  echo "== check: the engine reads the net as the trainer wrote it, then the net against the baseline"
  : > "$RD/RESULT.tmp"
  CK1=$(grep '^check ' "$RD/train.log" | tail -n 1); CK2=$("$AQ" check "$RD/alqnet.bin" "$WORK/r1/data/w1.bin" 100000)   # (the trainer's first file)
  OK_CK=0; [ "$CK1" = "$CK2" ] && OK_CK=1
  echo "net read by the engine: $([ $OK_CK = 1 ] && echo 'the same values as the trainer' || echo "DIFFERENT ($CK1 / $CK2)")" | tee -a "$RD/RESULT.tmp"
  BASE="$BASE_AQV/0/0/-"; BNAME="the hand evaluation"
  [ $ROUND -gt 1 ] && [ -f "$PREV/alqnet.bin" ] && BASE="$NETAQV/0/0/$PREV/alqnet.bin" && BNAME="the last round's net"
  BN=${BASE#*/0/0/}; BQ=${BASE%%/*}
  read W L D <<< "$(match "$NETAQV/$MATCH_NODES/0/$RD/alqnet.bin" "$BQ/$MATCH_NODES/0/$BN" $MATCH_PAIRS $(( ROUND * 31 + 1 )) "$RD/match-nodes.log")"
  read E LO HI OK1 <<< "$(verdict $W $L $D)"
  echo "net vs $BNAME, ${MATCH_NODES}k positions a move: +$W -$L =$D  Elo $E ($LO .. $HI)" | tee -a "$RD/RESULT.tmp"
  read W L D <<< "$(match "$NETAQV/0/$MATCH_MS/$RD/alqnet.bin" "$BQ/0/$MATCH_MS/$BN" $MATCH_PAIRS $(( ROUND * 31 + 2 )) "$RD/match-time.log")"
  read E LO HI OK <<< "$(verdict $W $L $D)"
  line="net vs $BNAME, ${MATCH_MS} ms a move: +$W -$L =$D  Elo $E ($LO .. $HI)"
  [ $OK_CK = 1 ] || OK=0
  rm -f "$RD/adopt/alqnet.bin" "$RD/adopt/alqnet.bin.gz"
  if [ "$OK" = 1 ]; then cp "$RD/alqnet.bin" "$RD/adopt/alqnet.bin"; line="$line  -> adopt"
  else line="$line  -> not adopted"; [ -f "$PREV/alqnet.bin" ] && cp "$PREV/alqnet.bin" "$RD/adopt/alqnet.bin"; fi
  [ -f "$RD/adopt/alqnet.bin" ] && gzip -9 -k -f "$RD/adopt/alqnet.bin"
  echo "$line" | tee -a "$RD/RESULT.tmp"; mv "$RD/RESULT.tmp" "$RD/RESULT.txt"
  { echo "round $ROUND: $POSITIONS positions, ${NODES}k positions a move, teacher $([ "$TEACH" = - ] && echo 'hand' || echo 'net')"; tail -n 3 "$RD/train.log"; cat "$RD/RESULT.txt"; } > "$RD/adopt/RESULT.txt"
done
echo
echo "done. The net to adopt: $WORK/r$ROUNDS/adopt/alqnet.bin.gz (none if no round won), the results: $WORK/r$ROUNDS/adopt/RESULT.txt"
echo "Give Claude the adopt folder (alqnet.bin.gz and RESULT.txt)."
