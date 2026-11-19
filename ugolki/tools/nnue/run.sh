#!/bin/bash
# Ugolki: the learned evaluation, from start to finish (README.md here, claude/ugolki-spec.md「学習した評価」):
#   build -> self-play with our own engine (the teacher) on every core -> train (one net a rule) -> check -> the files to adopt
#   bash ugolki/tools/nnue/run.sh
# Stop it any time (Ctrl-C) and run it again: it goes on where it was. Settings (environment):
#   WORK       the folder for everything (default ~/ugolki-nnue-work; an external disk works: WORK="/Volumes/Orico A 8TB/ugolki-nnue")
#   POSITIONS  self-play positions in all (default 20000000, shared by the rules)      RULES   default "c33 c34 c44 diag"
#   NODES      thousand positions searched a move (default 8)                         JOBS    processes at once (default: all cores)
#   EPOCHS     (default 10)   LAMBDA (default 0.7: search value × λ + result × (1 − λ))   EXTRA  more options for train
#   ROUNDS     rounds (default 1). Round 2 on: the round before's adopted nets are the teacher (and the baseline to beat)
#   MATCH_GAMES / MATCH_MS   the check: games a rule (default 200) at this time a move (default 100 ms), the net against the baseline
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
WORK=${WORK:-$HOME/ugolki-nnue-work}; POSITIONS=${POSITIONS:-20000000}; RULES=${RULES:-"c33 c34 c44 diag"}
NODES=${NODES:-8}; EPOCHS=${EPOCHS:-10}; LAMBDA=${LAMBDA:-0.7}; ROUNDS=${ROUNDS:-1}
MATCH_GAMES=${MATCH_GAMES:-200}; MATCH_MS=${MATCH_MS:-100}
JOBS=${JOBS:-$( (sysctl -n hw.ncpu || nproc) 2>/dev/null | head -1)}; JOBS=${JOBS:-4}
NR=$(echo $RULES | wc -w | tr -d ' '); PER_RULE=$(( POSITIONS / NR ))
mkdir -p "$WORK/bin"; cd "$WORK"
echo "== build ($WORK/bin)"
for P in A B; do cc -O3 -w -c "$HERE/eng.c" -DPFX=${P}_ -o "bin/$P.o"; done
cc -O3 -w -c "$HERE/eng.c" -DPFX=C_ -DNN_DEBUG -o bin/C.o
cc -O3 -w "$HERE/ug.c" bin/A.o bin/B.o bin/C.o -lm -o bin/ug
cc -O3 -w "$HERE/train.c" -lm -o bin/train
UG="$WORK/bin/ug"; TRAIN="$WORK/bin/train"
# the match of a rule split over the cores: "A B" -> prints wins losses draws (A's) and writes the log
match() {   # rule A B games seed log
  local r=$1 A=$2 B=$3 N=$4 seed=$5 log=$6 P=$JOBS
  [ $P -gt $(( N / 2 )) ] && P=$(( N / 2 )); [ $P -lt 1 ] && P=1
  local per=$(( (N / P + 1) / 2 * 2 )); : > "$log"
  for k in $(seq 1 $P); do "$UG" match $r $per $(( seed * 100 + k )) "$A" "$B" > "$log.$k" 2>/dev/null & done
  wait
  for k in $(seq 1 $P); do tail -n 1 "$log.$k" >> "$log"; rm -f "$log.$k"; done
  awk '{ sub(/^\+/, "", $4); sub(/^-/, "", $5); sub(/^=/, "", $6); w += $4; l += $5; d += $6 } END { print w, l, d }' "$log"
}
verdict() {   # wins losses draws -> "elo lo hi adopt(1/0)"
  awk -v w=$1 -v l=$2 -v d=$3 'function elo(x) { return x <= 0 ? -999 : x >= 1 ? 999 : -400 * log(1 / x - 1) / log(10) }
    BEGIN { n = w + l + d; s = (w + d / 2) / n; v = (w * (1 - s) ^ 2 + l * s ^ 2 + d * (0.5 - s) ^ 2) / n / n; se = sqrt(v > 1e-12 ? v : 1e-12);
      printf "%.0f %.0f %.0f %d\n", elo(s), elo(s - 1.96 * se), elo(s + 1.96 * se), (s - 1.645 * se > 0.5) ? 1 : 0 }'
}
for ROUND in $(seq 1 $ROUNDS); do
  RD="$WORK/r$ROUND"; mkdir -p "$RD/data" "$RD/adopt"; PREV="$WORK/r$(( ROUND - 1 ))/adopt"
  echo "== round $ROUND ($RD)"
  for r in $RULES; do
    TEACH="-"; [ $ROUND -gt 1 ] && [ -f "$PREV/net-$r.bin" ] && TEACH="$PREV/net-$r.bin"
    echo "== self-play $r: $PER_RULE positions, ${NODES}k positions a move, $JOBS processes, teacher: $([ "$TEACH" = - ] && echo 'the hand evaluation' || echo "$TEACH")"
    T0=$(date +%s); B=$(cat "$RD/data/$r.batches" 2>/dev/null || echo 0); RS=$(printf %s "$r" | cksum | awk '{ print $1 % 100000 }')
    while :; do
      POS=$(( $(cat "$RD"/data/$r.w*.bin 2>/dev/null | wc -c) / 24 ))
      [ $POS -ge $PER_RULE ] && break
      echo "  $r: $POS / $PER_RULE positions  ($(( ($(date +%s) - T0) / 60 )) min this run)"
      rm -f "$RD"/data/part.$r.*
      for k in $(seq 1 $JOBS); do "$UG" datagen $r "$RD/data/part.$r.$k.bin" 40 $NODES $(( ((ROUND * 7919 + B) * 1000 + k) * 100003 + RS )) "$TEACH" 2>/dev/null & done
      wait
      for k in $(seq 1 $JOBS); do cat "$RD/data/part.$r.$k.bin" >> "$RD/data/$r.w$k.bin"; rm -f "$RD/data/part.$r.$k.bin"; done   # (a batch counts only when it is whole)
      B=$(( B + 1 )); echo $B > "$RD/data/$r.batches"
    done
  done
  echo "== train (the rules at once; logs: $RD/train-<rule>.log)"
  for r in $RULES; do
    if [ -f "$RD/net-$r.bin" ] && [ "$RD/net-$r.bin" -nt "$RD/data/$r.batches" ]; then echo "  $r: trained already"; continue; fi
    INIT=""; [ $ROUND -gt 1 ] && [ -f "$PREV/net-$r.bin" ] && INIT="--init $PREV/net-$r.bin"
    DATA=(); for q in $(seq 1 $ROUND); do for f in "$WORK/r$q/data/$r".w*.bin; do [ -f "$f" ] && DATA+=("$f"); done; done   # (every round's data)
    ( "$TRAIN" $r "$RD/net-$r.bin.tmp" "${DATA[@]}" --epochs $EPOCHS --lambda $LAMBDA $INIT $EXTRA > "$RD/train-$r.log" 2>&1 && mv "$RD/net-$r.bin.tmp" "$RD/net-$r.bin" ) &
  done
  wait
  for r in $RULES; do tail -n 2 "$RD/train-$r.log"; done
  echo "== check: the accumulators kept move by move, then $MATCH_GAMES games a rule at ${MATCH_MS} ms a move against the baseline"
  for r in $RULES; do
    [ -f "$RD/net-$r.bin" ] || { echo "  $r: no net"; continue; }
    if [ -f "$RD/result-$r.txt" ] && [ "$RD/result-$r.txt" -nt "$RD/net-$r.bin" ]; then cat "$RD/result-$r.txt"; continue; fi   # (checked already)
    "$UG" nncheck $r "$RD/net-$r.bin" 2 | tee "$RD/result-$r.tmp"
    NCOK=${PIPESTATUS[0]}
    BASE="-"; [ $ROUND -gt 1 ] && [ -f "$PREV/net-$r.bin" ] && BASE="$PREV/net-$r.bin"
    read W L D <<< "$(match $r "2/0/$MATCH_MS/$RD/net-$r.bin" "2/0/$MATCH_MS/$BASE" $MATCH_GAMES $(( ROUND * 31 + $(printf %s "$r" | cksum | awk '{ print $1 % 1000 }') )) "$RD/match-$r.log")"
    read E LO HI OK <<< "$(verdict $W $L $D)"
    [ "$NCOK" = 0 ] || OK=0
    line="$r: net vs $([ "$BASE" = - ] && echo 'the hand evaluation' || echo 'the last round') (${MATCH_MS} ms a move, search v3): +$W -$L =$D  Elo $E ($LO .. $HI)"
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
