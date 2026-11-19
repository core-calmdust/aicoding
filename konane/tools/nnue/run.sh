#!/bin/bash
# Kōnane: the learned evaluation, from start to finish (README.md here, claude/konane-spec.md「学習した評価」):
#   build -> self-play with our own engine (the teacher) on every core -> train (one net a board size) -> check -> the files to adopt
#   bash konane/tools/nnue/run.sh
# Stop it any time (Ctrl-C) and run it again: it goes on where it was. Settings (environment):
#   WORK       the folder for everything (default ~/konane-nnue-work; an external disk works: WORK="/Volumes/Orico A 8TB/konane-nnue")
#   POSITIONS  self-play positions in all (default 20000000), shared by the board sizes as SHARE says (default "s8:50 s10:30 s6:20" %)
#   NODES      thousand positions searched a move (default 8)                         JOBS    processes at once (default: all cores)
#   EPOCHS     (default 10)   LAMBDA (default 0.7: search value × λ + result × (1 − λ))   EXTRA  more options for train
#   ROUNDS     rounds (default 1). Round 2 on: the round before's adopted nets are the teacher (and the baseline to beat)
#   MATCH_GAMES / MATCH_MS   the check: games a board size (default 200) at this time a move (default 100 ms), the net against the baseline
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
WORK=${WORK:-$HOME/konane-nnue-work}; POSITIONS=${POSITIONS:-20000000}; SHARE=${SHARE:-"s8:50 s10:30 s6:20"}
NODES=${NODES:-8}; EPOCHS=${EPOCHS:-10}; LAMBDA=${LAMBDA:-0.7}; ROUNDS=${ROUNDS:-1}
MATCH_GAMES=${MATCH_GAMES:-200}; MATCH_MS=${MATCH_MS:-100}
JOBS=${JOBS:-$( (sysctl -n hw.ncpu || nproc) 2>/dev/null | head -1)}; JOBS=${JOBS:-4}
RULES=$(for x in $SHARE; do echo ${x%%:*}; done)
TOT=0; for x in $SHARE; do TOT=$(( TOT + ${x##*:} )); done
want() { for x in $SHARE; do if [ "${x%%:*}" = "$1" ]; then echo $(( POSITIONS / TOT * ${x##*:} )); fi; done; }
mkdir -p "$WORK/bin"; cd "$WORK"
echo "== build ($WORK/bin)"
for P in A B; do cc -O3 -w -c "$HERE/eng.c" -DPFX=${P}_ -o "bin/$P.o"; done
cc -O3 -w -c "$HERE/eng.c" -DPFX=C_ -DNN_DEBUG -o bin/C.o
cc -O3 -w "$HERE/kn.c" bin/A.o bin/B.o bin/C.o -lm -o bin/kn
cc -O3 -w "$HERE/train.c" -lm -o bin/train
KN="$WORK/bin/kn"; TRAIN="$WORK/bin/train"
# the match of a board size split over the cores: "A B" -> prints wins losses (A's) and writes the log
match() {   # rule A B games seed log
  local r=$1 A=$2 B=$3 N=$4 seed=$5 log=$6 P=$JOBS
  [ $P -gt $(( N / 2 )) ] && P=$(( N / 2 )); [ $P -lt 1 ] && P=1
  local per=$(( (N / P + 1) / 2 * 2 )); : > "$log"
  for k in $(seq 1 $P); do "$KN" match $r $per $(( seed * 100 + k )) "$A" "$B" > "$log.$k" 2>/dev/null & done
  wait
  for k in $(seq 1 $P); do tail -n 1 "$log.$k" >> "$log"; rm -f "$log.$k"; done
  awk '{ sub(/^\+/, "", $4); sub(/^-/, "", $5); w += $4; l += $5 } END { print w, l }' "$log"
}
verdict() {   # wins losses -> "elo lo hi adopt(1/0)"
  awk -v w=$1 -v l=$2 'function elo(x) { return x <= 0 ? -999 : x >= 1 ? 999 : -400 * log(1 / x - 1) / log(10) }
    BEGIN { n = w + l; s = w / n; se = sqrt(s * (1 - s) / n); se = se > 1e-6 ? se : 1e-6;
      printf "%.0f %.0f %.0f %d\n", elo(s), elo(s - 1.96 * se), elo(s + 1.96 * se), (s - 1.645 * se > 0.5) ? 1 : 0 }'
}
for ROUND in $(seq 1 $ROUNDS); do
  RD="$WORK/r$ROUND"; mkdir -p "$RD/data" "$RD/adopt"; PREV="$WORK/r$(( ROUND - 1 ))/adopt"
  echo "== round $ROUND ($RD)"
  for r in $RULES; do
    PER_RULE=$(want $r)
    TEACH="-"; [ $ROUND -gt 1 ] && [ -f "$PREV/net-$r.bin" ] && TEACH="$PREV/net-$r.bin"
    echo "== self-play $r: $PER_RULE positions, ${NODES}k positions a move, $JOBS processes, teacher: $([ "$TEACH" = - ] && echo 'the hand evaluation' || echo "$TEACH")"
    T0=$(date +%s); B=$(cat "$RD/data/$r.batches" 2>/dev/null || echo 0); RS=$(printf %s "$r" | cksum | awk '{ print $1 % 100000 }')
    while :; do
      POS=$(( $(cat "$RD"/data/$r.w*.bin 2>/dev/null | wc -c) / 40 ))
      [ $POS -ge $PER_RULE ] && break
      echo "  $r: $POS / $PER_RULE positions  ($(( ($(date +%s) - T0) / 60 )) min this run)"
      rm -f "$RD"/data/part.$r.*
      for k in $(seq 1 $JOBS); do "$KN" datagen $r "$RD/data/part.$r.$k.bin" 40 $NODES $(( ((ROUND * 7919 + B) * 1000 + k) * 100003 + RS )) "$TEACH" 2>/dev/null & done
      wait
      for k in $(seq 1 $JOBS); do cat "$RD/data/part.$r.$k.bin" >> "$RD/data/$r.w$k.bin"; rm -f "$RD/data/part.$r.$k.bin"; done   # (a batch counts only when it is whole)
      B=$(( B + 1 )); echo $B > "$RD/data/$r.batches"
    done
  done
  echo "== train (the board sizes at once; logs: $RD/train-<rule>.log)"
  for r in $RULES; do
    if [ -f "$RD/net-$r.bin" ] && [ "$RD/net-$r.bin" -nt "$RD/data/$r.batches" ]; then echo "  $r: trained already"; continue; fi
    INIT=""; [ $ROUND -gt 1 ] && [ -f "$PREV/net-$r.bin" ] && INIT="--init $PREV/net-$r.bin"
    DATA=(); for q in $(seq 1 $ROUND); do for f in "$WORK/r$q/data/$r".w*.bin; do [ -f "$f" ] && DATA+=("$f"); done; done   # (every round's data)
    ( "$TRAIN" $r "$RD/net-$r.bin.tmp" "${DATA[@]}" --epochs $EPOCHS --lambda $LAMBDA $INIT $EXTRA > "$RD/train-$r.log" 2>&1 && mv "$RD/net-$r.bin.tmp" "$RD/net-$r.bin" ) &
  done
  wait
  for r in $RULES; do tail -n 2 "$RD/train-$r.log"; done
  echo "== check: the accumulators kept move by move and the trainer's values, then $MATCH_GAMES games a board size at ${MATCH_MS} ms a move against the baseline"
  for r in $RULES; do
    [ -f "$RD/net-$r.bin" ] || { echo "  $r: no net"; continue; }
    if [ -f "$RD/result-$r.txt" ] && [ "$RD/result-$r.txt" -nt "$RD/net-$r.bin" ]; then cat "$RD/result-$r.txt"; continue; fi   # (checked already)
    set +e; "$KN" nncheck $r "$RD/net-$r.bin" 2 | tee "$RD/result-$r.tmp"; NCOK=${PIPESTATUS[0]}; set -e
    BASE="-"; [ $ROUND -gt 1 ] && [ -f "$PREV/net-$r.bin" ] && BASE="$PREV/net-$r.bin"
    read W L <<< "$(match $r "2/0/$MATCH_MS/$RD/net-$r.bin" "2/0/$MATCH_MS/$BASE" $MATCH_GAMES $(( ROUND * 31 + $(printf %s "$r" | cksum | awk '{ print $1 % 1000 }') )) "$RD/match-$r.log")"
    read E LO HI OK <<< "$(verdict $W $L)"
    [ "$NCOK" = 0 ] || OK=0
    line="$r: net vs $([ "$BASE" = - ] && echo 'the hand evaluation' || echo 'the last round') (${MATCH_MS} ms a move, search v3): +$W -$L  Elo $E ($LO .. $HI)"
    rm -f "$RD/adopt/net-$r.bin" "$RD/adopt/net-$r.bin.gz"
    if [ "$OK" = 1 ]; then cp "$RD/net-$r.bin" "$RD/adopt/net-$r.bin"; gzip -9 -k -f "$RD/adopt/net-$r.bin"; line="$line  -> adopt"
    else line="$line  -> not adopted"; [ -f "$PREV/net-$r.bin" ] && cp "$PREV/net-$r.bin" "$RD/adopt/net-$r.bin" && gzip -9 -k -f "$RD/adopt/net-$r.bin"; fi
    echo "$line" | tee -a "$RD/result-$r.tmp"; mv "$RD/result-$r.tmp" "$RD/result-$r.txt"
  done
  cat "$RD"/result-*.txt > "$RD/adopt/RESULT.txt" 2>/dev/null || true
done
echo
echo "done. The nets to adopt: $WORK/r$ROUNDS/adopt/net-<rule>.bin.gz, the results: $WORK/r$ROUNDS/adopt/RESULT.txt"
echo "Give Claude the adopt folder (the .gz files and RESULT.txt) and the last lines of the train-<rule>.log files."
