#!/bin/bash
# Ludus latrunculorum NNUE (the learned evaluation): build -> self-play data with our own engine (the teacher, no outside engine)
# -> train -> check -> the files to adopt.  Stop any time (Ctrl-C); running it again goes on from where it stopped.
#   bash latrunculi/tools/nnue/run.sh
# Settings (environment variables; README.md):
#   WORK       the working folder (default ~/latrunculi-nnue-work): nets, logs, the files to adopt
#   DATA       where the self-play data goes (default $WORK; large: e.g. "/Volumes/Orico A 8TB/latrunculi-nnue-data")
#   RULES      the rule sets (default "seneca piso quintana"), one net each
#   POSITIONS  positions of self-play data per round, all the rules together (default 20000000)
#   NODES      the teacher's thousand positions a move (default 12)
#   ROUNDS     rounds (default 1). Round 2 makes its data with round 1's net as the teacher, and so on
#   JOBS       processes (default: all cores)
#   HIDDEN EPOCHS LAMBDA SCALE   the trainer's settings (128, 12, 0.7, 0 = fitted to the results), EXTRA more trainer options
#   MATCH_GAMES MATCH_NODES MATCH_MS   the checks: games, thousand positions a move, milliseconds a move (200, 20, 100)
#   ADOPT      the least score (%) in both matches to adopt a net (default 55)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
WORK=${WORK:-$HOME/latrunculi-nnue-work}; DATA=${DATA:-$WORK}
RULES=${RULES:-"seneca piso quintana"}; POSITIONS=${POSITIONS:-20000000}; NODES=${NODES:-12}; ROUNDS=${ROUNDS:-1}
HIDDEN=${HIDDEN:-128}; EPOCHS=${EPOCHS:-12}; LAMBDA=${LAMBDA:-0.7}; SCALE=${SCALE:-0}; EXTRA=${EXTRA:-}
MATCH_GAMES=${MATCH_GAMES:-200}; MATCH_NODES=${MATCH_NODES:-20}; MATCH_MS=${MATCH_MS:-100}; ADOPT=${ADOPT:-55}
JOBS=${JOBS:-$( (sysctl -n hw.ncpu || nproc) 2>/dev/null | head -1)}; JOBS=${JOBS:-4}
NR=$(echo $RULES | wc -w | tr -d ' '); PER_RULE=$(( POSITIONS / NR ))
mkdir -p "$WORK" "$DATA" "$WORK/adopt"
LOG="$WORK/run.log"
say() { echo "$*" | tee -a "$LOG"; }
say "== $(date '+%Y-%m-%d %H:%M')  rules: $RULES | $POSITIONS positions a round ($PER_RULE a rule) | teacher ${NODES}k positions a move | $ROUNDS round(s) | $JOBS processes"
say "   work: $WORK | data: $DATA"
echo "== build"
cc -O3 -DNATIVE -w -o "$WORK/ltn" "$HERE/ltn.c" -lm
cc -O3 -o "$WORK/train" "$HERE/train.c" -lpthread -lm
LTN="$WORK/ltn"; TRAIN="$WORK/train"
for R in $(seq 1 "$ROUNDS"); do
  for RULE in $RULES; do
    D="$DATA/r$R/$RULE"; N="$WORK/r$R/$RULE"; mkdir -p "$D" "$N"
    TEACHER=""; PREV="$WORK/r$((R - 1))/$RULE/net.bin"
    if [ "$R" -gt 1 ] && [ -f "$WORK/r$((R - 1))/$RULE/adopted" ]; then TEACHER="$PREV"; fi   # (a net that was not adopted does not teach)
    # ---- self-play data (batches of 20 games a process; a batch counts only when it is whole)
    have() { cat "$D"/data.w*.bin 2>/dev/null | wc -c | awk '{ print int($1 / 48) }'; }
    POS=$(have); T0=$(date +%s); P0=$POS; B=$(cat "$D/batch" 2>/dev/null || echo 0)
    if [ "$POS" -lt "$PER_RULE" ]; then say "== round $R $RULE: self-play data ($POS / $PER_RULE positions so far${TEACHER:+, teacher: the net of round $((R - 1))})"; fi
    while [ "$POS" -lt "$PER_RULE" ]; do
      rm -f "$D"/part.w*.bin
      for k in $(seq 1 "$JOBS"); do "$LTN" datagen "$D/part.w$k.bin" 20 "$NODES" $(( R * 1000003 + B * 131 + k )) "$RULE" "$TEACHER" 2> /dev/null & done
      wait
      for k in $(seq 1 "$JOBS"); do cat "$D/part.w$k.bin" >> "$D/data.w$k.bin"; rm -f "$D/part.w$k.bin"; done
      B=$(( B + 1 )); echo $B > "$D/batch"
      POS=$(have); EL=$(( $(date +%s) - T0 )); RATE=$(( (POS - P0) / (EL > 0 ? EL : 1) ))
      LEFT=$(( RATE > 0 ? (PER_RULE - POS) / RATE / 60 : 0 ))
      echo "  $RULE: $POS / $PER_RULE positions, $RATE pos/s, $(( EL / 60 )) min so far, about $LEFT min left"
    done
    # ---- train
    if [ ! -f "$N/train.done" ]; then
      say "== round $R $RULE: train"
      cat "$D"/data.w*.bin > "$D/data.bin"
      INIT=""; SC="$SCALE"; if [ -n "$TEACHER" ]; then INIT="--init $TEACHER"; SC=$(od -An -t d4 -j 12 -N 4 "$TEACHER" | tr -d ' '); fi   # (round 2…: the scale of the net it starts from)
      "$TRAIN" "$D/data.bin" "$N/net.bin" --hidden "$HIDDEN" --epochs "$EPOCHS" --lambda "$LAMBDA" --scale "$SC" $INIT $EXTRA 2>&1 | tr '\r' '\n' | grep -v '^  epoch' | tee -a "$LOG"
      rm -f "$D/data.bin"
      touch "$N/train.done"
    fi
    # ---- check: the accumulators kept move by move (差分更新の一致), then matches against the hand-made evaluation
    if [ ! -f "$N/check.done" ]; then
      say "== round $R $RULE: check"
      "$LTN" nncheck "$N/net.bin" "$RULE" 200 | tee -a "$LOG"
      "$LTN" nmatch "$N/net.bin" "$RULE" "$MATCH_NODES" "$MATCH_GAMES" 2> /dev/null | tee "$N/match-nodes.txt" | tee -a "$LOG"
      "$LTN" nmatch "$N/net.bin" "$RULE" 0 "$MATCH_GAMES" "$MATCH_MS" 2> /dev/null | tee "$N/match-ms.txt" | tee -a "$LOG"
      touch "$N/check.done"
    fi
    S1=$(sed -n 's/.*score \([0-9.]*\)%.*/\1/p' "$N/match-nodes.txt"); S2=$(sed -n 's/.*score \([0-9.]*\)%.*/\1/p' "$N/match-ms.txt")
    if awk "BEGIN { exit !($S1 >= $ADOPT && $S2 >= $ADOPT) }"; then
      F="lt-$RULE-$(date +%Y%m%d)-r$R.nnue"; cp "$N/net.bin" "$WORK/adopt/$F"; touch "$N/adopted"
      say "   $RULE round $R: adopted ($S1% / $S2%) -> $WORK/adopt/$F"
    else
      say "   $RULE round $R: not adopted ($S1% / $S2%, needs $ADOPT% in both)"
    fi
  done
done
say "== done $(date '+%Y-%m-%d %H:%M'). The files to adopt: $WORK/adopt/ (give them and $LOG to Claude)"
ls -la "$WORK/adopt" | tee -a "$LOG"
