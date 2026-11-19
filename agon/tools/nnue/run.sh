#!/bin/bash
# Agon: the learned evaluation, all in one (agon/tools/nnue/README.md, agon/MODEL_CARD.md「学習した評価」):
# build → self-play of our own engine (the teacher: the site's αβ with the hand-made evaluation; no outside engine) on every
# core → training → check (matches against the hand-made evaluation: the same nodes a move and the same time a move) →
# agon/net.js to adopt, when the net won.
#   bash agon/tools/nnue/run.sh
# Stop it any time (Ctrl+C); running it again goes on from where it stopped.
# Settings (environment): WORK (the data folder, default ~/agon-nnue-work; e.g. WORK="/Volumes/Orico A 8TB/agon-nnue"),
#   POS (positions a round, default 20000000), NK (the teacher's thousand nodes a move, default 20), EPOCHS (8), HIDDEN (32),
#   LAMBDA (0.5: the target's share of the search's value; the rest the game's result), JOBS (default: every core),
#   ROUNDS (1: rounds of self-play → training; from round 2 the last net that won is the teacher and the start of training),
#   PAIRS (200: pairs of games in each check match), MS (100: the time match's ms of CPU a move), NET (a net.bin as the
#   teacher of round 1), FORCE=1 (write net.js even when the net lost the checks)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
WORK=${WORK:-$HOME/agon-nnue-work}
POS=${POS:-20000000}; NK=${NK:-20}; EPOCHS=${EPOCHS:-8}; HIDDEN=${HIDDEN:-32}; LAMBDA=${LAMBDA:-0.5}; ROUNDS=${ROUNDS:-1}; PAIRS=${PAIRS:-200}; MS=${MS:-100}
JOBS=${JOBS:-$( (sysctl -n hw.ncpu || nproc) 2>/dev/null | head -1)}; JOBS=${JOBS:-4}
GPB=${GPB:-20}   # games a job writes per batch (a batch counts when every job has finished it)
REC=56           # bytes a record
mkdir -p "$WORK"
cd "$WORK"
echo "== build ($WORK)"
CC=${CC:-cc}
"$CC" -O3 -ffp-contract=off -DNATIVE -DNATIVE_TTSWAP -w -o "$WORK/nn" "$HERE/nn.c" -lm -lpthread
TEACHER=${NET:-}
[ -n "$TEACHER" ] && echo "teacher of round 1: $TEACHER"
# a match on JOBS processes (each plays every JOBS-th pair): prints "score games"
match() {   # match <net> <A> <B> <log>
  local net="$1" a="$2" b="$3" log="$4" k
  if [ -s "$log.sum" ]; then cat "$log.sum"; return; fi
  rm -f "$log".part*
  for k in $(seq 0 $((JOBS - 1))); do AG_NET="$net" "$WORK/nn" match "$a" "$b" "$PAIRS" 7 "$k/$JOBS" > "$log.part$k" 2>&1 & done
  wait
  cat "$log".part* > "$log"; rm -f "$log".part*
  awk -F'"aWin":' '/^\{/ { split($2, x, ","); s += x[1]; n++ } END { printf "%g %d\n", s, n }' "$log" > "$log.sum"
  cat "$log.sum"
}
pct() { awk -v s="$1" -v n="$2" 'BEGIN { p = n ? s / n : 0; e = (p > 0 && p < 1) ? -400 * log(1 / p - 1) / log(10) : (p >= 1 ? 999 : -999); printf "%.1f%% (%+.0f Elo, %d games)", 100 * p, e, n }'; }
PREV=""
for R in $(seq 1 "$ROUNDS"); do
  D="$WORK/r$R"; mkdir -p "$D"; cd "$D"
  echo "== round $R: self-play to $POS positions (${NK}k nodes a move, $JOBS processes)"
  HAVE=$(( $(cat data.*.bin 2>/dev/null | wc -c) / REC )); T0=$(date +%s); B0=$HAVE; S=$(cat seed 2>/dev/null || echo 0)
  while [ "$HAVE" -lt "$POS" ]; do
    rm -f part.*.bin
    for k in $(seq 1 "$JOBS"); do nice -n 5 "$WORK/nn" selfplay "part.$k.bin" "$GPB" "$NK" $(( R * 1000003 + S * 131 + k )) "$TEACHER" 2> /dev/null & done
    wait
    for k in $(seq 1 "$JOBS"); do cat "part.$k.bin" >> "data.$k.bin"; rm -f "part.$k.bin"; done   # (a batch counts only when it is whole)
    S=$(( S + 1 )); echo $S > seed
    HAVE=$(( $(cat data.*.bin | wc -c) / REC )); EL=$(( $(date +%s) - T0 ))
    RATE=$(( EL > 0 ? (HAVE - B0) / EL : 0 )); LEFT=$(( RATE > 0 ? (POS - HAVE) / RATE / 60 : 0 ))
    echo "  $HAVE / $POS positions, $((EL / 60)) min, $RATE positions/s, about $LEFT min left"
  done
  if [ ! -s net.bin ]; then
    echo "== round $R: training ($EPOCHS epochs)"
    INIT=""; [ -n "$PREV" ] && INIT="--init $PREV"
    "$WORK/nn" train net.bin data.*.bin --epochs "$EPOCHS" --lambda "$LAMBDA" --hidden "$HIDDEN" --threads "$JOBS" $INIT | tee train.log
  fi
  echo "== round $R: check"
  "$WORK/nn" speed net.bin | tee speed.log
  "$WORK/nn" check net.bin vals.txt > /dev/null
  echo "  the same nodes a move (30 thousand), $((PAIRS * 2)) games:"
  set -- $(match "$D/net.bin" "n=30,net=1" "n=30,net=0" "$D/match_nk.log"); SN=$1; GN=$2
  echo "    net vs hand-made: $SN / $GN = $(pct "$SN" "$GN")" | tee -a check.log
  echo "  the same time a move (${MS} ms of CPU), $((PAIRS * 2)) games:"
  set -- $(match "$D/net.bin" "t=$MS,net=1" "t=$MS,net=0" "$D/match_ms.log"); ST=$1; GT=$2
  echo "    net vs hand-made: $ST / $GT = $(pct "$ST" "$GT")" | tee -a check.log
  # adopted: at least 52 % in the time match and at least 50 % with the same nodes
  OK=$(awk -v a="$ST" -v b="$GT" -v c="$SN" -v d="$GN" 'BEGIN { print (b > 0 && a / b >= 0.52 && d > 0 && c / d >= 0.5) ? 1 : 0 }')
  if [ "$OK" = 1 ] || [ "${FORCE:-0}" = 1 ]; then
    mkdir -p "$WORK/adopt"; "$WORK/nn" tojs net.bin "$WORK/adopt/net.js"; cp net.bin vals.txt "$WORK/adopt/"; cp check.log "$WORK/adopt/check.log"
    [ "$OK" = 1 ] && echo "== round $R: ADOPTED — $WORK/adopt/net.js" || echo "== round $R: written by FORCE=1 (it did not pass the checks) — $WORK/adopt/net.js"
    TEACHER="$D/net.bin"; PREV="$D/net.bin"
  else
    echo "== round $R: not adopted (the checks need ≥ 52 % in the time match and ≥ 50 % with the same nodes)"
    PREV="$D/net.bin"
  fi
  cd "$WORK"
done
echo
echo "done. Logs: $WORK/r*/train.log, check.log. To use the net: copy $WORK/adopt/net.js to agon/net.js (see README.md)."
