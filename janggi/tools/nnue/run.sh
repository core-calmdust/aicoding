#!/bin/bash
# Janggi NNUE: self-play data with our own engine (the teacher) -> train -> check -> matches -> the file to adopt, in rounds
# (round r >= 2: the teacher is round r-1's net). Stop it any time; the same command continues where it stopped.
#   bash janggi/tools/nnue/run.sh
#   ROUNDS=3 DATA="/Volumes/Orico A 8TB/janggi-data" bash janggi/tools/nnue/run.sh
# Settings (environment; README.md):
#   WORK (~/janggi-nnue-work) nets, logs, reports   DATA ($WORK/data) the records (about 1.1 GB per 20 million positions)
#   ROUNDS (1)  POSITIONS (20000000 per round)  NODES (16: thousand positions searched per move)  JOBS (all cores)
#   EPOCHS (10)  LAMBDA (0.75)  LR (0.001)  LR2 (0.0005: rounds >= 2 continue from the previous net)  WINDOW (2 rounds of data)
#   NET (round 1's teacher net; default the hand evaluation)  MNODES (20)  MTIME (100 ms)  MGAMES (400)  EXTRA (train options)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
WORK=${WORK:-$HOME/janggi-nnue-work}; DATA=${DATA:-$WORK/data}
ROUNDS=${ROUNDS:-1}; POSITIONS=${POSITIONS:-20000000}; NODES=${NODES:-16}
EPOCHS=${EPOCHS:-10}; LAMBDA=${LAMBDA:-0.75}; LR=${LR:-0.001}; LR2=${LR2:-0.0005}; WINDOW=${WINDOW:-2}
MNODES=${MNODES:-20}; MTIME=${MTIME:-100}; MGAMES=${MGAMES:-400}
JOBS=${JOBS:-$( (sysctl -n hw.ncpu || nproc) 2>/dev/null | head -1)}; JOBS=${JOBS:-4}
PER=${PER:-100}   # games per process per batch (a batch is kept only when whole)
mkdir -p "$WORK" "$DATA"; cd "$WORK"
log() { echo "$(date '+%m-%d %H:%M') $*" | tee -a "$WORK/log.txt"; }
size() { local t=0 f; for f in "$@"; do [ -f "$f" ] && t=$(( t + $(wc -c < "$f") )); done; echo $(( t / 56 )); }

echo "== build tools"
# (-march=native where the compiler has it: the network's sums in vector instructions)
cc -O3 -march=native -DNATIVE -w -o jg "$HERE/../native.c" -lm 2> /dev/null || cc -O3 -DNATIVE -w -o jg "$HERE/../native.c" -lm
cc -O3 -march=native -o train "$HERE/../../../xiangqi/tools/nnue/train.c" -lpthread -lm 2> /dev/null || cc -O3 -o train "$HERE/../../../xiangqi/tools/nnue/train.c" -lpthread -lm   # (shared with xiangqi: the same board and record)

# the match: build@net (or the hand evaluation) against another, JOBS pairs at once -> its last line
match() { JOBS=$JOBS python3 "$HERE/../duel.py" "$@" | tail -1; }
score() { awk '{print $5}' <<< "$1"; }   # "N games  +W -L  score  Elo …" -> score
won() { awk -v s="$1" 'BEGIN { exit !(s > 0.5) }'; }

for r in $(seq 1 "$ROUNDS"); do
  RD="$DATA/r$r"; RW="$WORK/r$r"; mkdir -p "$RD" "$RW"
  [ -f "$RW/done" ] && { echo "round $r: done ($(cat "$RW/verdict.txt" 2>/dev/null))"; continue; }
  TEACH=""; [ "$r" -ge 2 ] && TEACH="$WORK/r$((r - 1))/nnue.bin"; [ "$r" -eq 1 ] && [ -n "$NET" ] && TEACH="$NET"
  # ---- 1. self-play
  if [ ! -f "$RD/data.done" ]; then
    log "round $r: self-play to $POSITIONS positions, ${NODES}k positions a move, $JOBS processes, teacher ${TEACH:-the hand evaluation}"
    T0=$(date +%s); P0=$(size "$RD"/w*.bin); B=$(cat "$RD/batches" 2>/dev/null || echo 0)
    while [ "$(size "$RD"/w*.bin)" -lt "$POSITIONS" ]; do
      rm -f "$RD"/part.*
      for k in $(seq 1 "$JOBS"); do
        ./jg datagen "$RD/part.$k" "$PER" "$NODES" $(( r * 100000007 + B * 1009 + k )) ${TEACH:+"$TEACH"} 2> /dev/null &
      done
      wait
      for k in $(seq 1 "$JOBS"); do cat "$RD/part.$k" >> "$RD/w$k.bin"; rm -f "$RD/part.$k"; done
      B=$(( B + 1 )); echo $B > "$RD/batches"
      P=$(size "$RD"/w*.bin); DT=$(( $(date +%s) - T0 + 1 )); RATE=$(( (P - P0) / DT ))
      echo "  $P / $POSITIONS positions  $RATE pos/s  $(( DT / 60 )) min, about $(( (POSITIONS - P) / (RATE + 1) / 60 )) min left"
    done
    touch "$RD/data.done"; log "round $r: $(size "$RD"/w*.bin) positions"
  fi
  # ---- 2. training on the last WINDOW rounds (the newest last: the trainer validates on the last 2% of the file)
  if [ ! -f "$RW/train.done" ]; then
    k=$(( r - WINDOW + 1 )); [ $k -lt 1 ] && k=1; FILES=()
    for j in $(seq $k "$r"); do for f in "$DATA/r$j"/w*.bin; do FILES+=("$f"); done; done
    cat "${FILES[@]}" > "$DATA/train.bin"
    INIT=(); RLR=$LR
    [ "$r" -ge 2 ] && [ -f "$WORK/r$((r - 1))/nnue.bin.f32" ] && { INIT=(--init "$WORK/r$((r - 1))/nnue.bin.f32"); RLR=$LR2; }
    log "round $r: training on rounds $k-$r ($(size "$DATA/train.bin") positions), lr $RLR${INIT:+, from round $((r - 1))}"
    ./train "$DATA/train.bin" "$RW/nnue.bin" --epochs "$EPOCHS" --lambda "$LAMBDA" --lr "$RLR" "${INIT[@]}" $EXTRA 2>&1 | tr '\r' '\n' | grep -v -e '%' -e '^ *$' | tee "$RW/train.log"
    rm -f "$DATA/train.bin"
    grep -q saved "$RW/train.log" || { log "round $r: training failed (see $RW/train.log)"; exit 1; }
    touch "$RW/train.done"
  fi
  NETR="$RW/nnue.bin"
  # ---- 3. the incremental update must equal the full computation
  ./jg nncheck "$NETR" | tee "$RW/check.txt"
  grep -q "^mismatches 0 " "$RW/check.txt" || { log "round $r: nncheck MISMATCH, stopped (send $RW/check.txt)"; exit 1; }
  # ---- 4. matches against the hand evaluation (same nodes, same time) and the previous round's net (same time)
  [ -f "$RW/m_nodes.txt" ] || { log "round $r: match vs the hand evaluation, ${MNODES}k positions a move, $MGAMES games"; match "./jg@$NETR" ./jg n "$MNODES" "$MGAMES" $((r * 7 + 1)) > "$RW/m_nodes.tmp"; mv "$RW/m_nodes.tmp" "$RW/m_nodes.txt"; }
  [ -f "$RW/m_time.txt" ] || { log "round $r: match vs the hand evaluation, ${MTIME} ms a move, $MGAMES games"; match "./jg@$NETR" ./jg t "$MTIME" "$MGAMES" $((r * 7 + 2)) > "$RW/m_time.tmp"; mv "$RW/m_time.tmp" "$RW/m_time.txt"; }
  if [ "$r" -ge 2 ] && [ ! -f "$RW/m_prev.txt" ]; then
    log "round $r: match vs round $((r - 1))'s net, ${MTIME} ms a move, $MGAMES games"
    match "./jg@$NETR" "./jg@$WORK/r$((r - 1))/nnue.bin" t "$MTIME" "$MGAMES" $((r * 7 + 3)) > "$RW/m_prev.tmp"; mv "$RW/m_prev.tmp" "$RW/m_prev.txt"
  fi
  MN=$(cat "$RW/m_nodes.txt"); MT=$(cat "$RW/m_time.txt"); MP=$(cat "$RW/m_prev.txt" 2>/dev/null || true)
  log "round $r: vs hand, same nodes: $MN"; log "round $r: vs hand, same time:  $MT"; [ -n "$MP" ] && log "round $r: vs round $((r - 1)), same time: $MP"
  # ---- 5. the verdict and the file to adopt (adopt/: the newest net that beats the hand evaluation both ways and the previous net)
  OK=1; won "$(score "$MN")" || OK=0; won "$(score "$MT")" || OK=0; [ -n "$MP" ] && { won "$(score "$MP")" || OK=0; }
  if [ $OK = 1 ]; then
    V="adopt"; mkdir -p "$WORK/adopt"; gzip -9 -c "$NETR" > "$WORK/adopt/nnue.bin.gz"
    { echo "janggi NNUE, round $r ($(date '+%Y-%m-%d %H:%M'))"; echo "teacher: ${TEACH:-the hand evaluation}, ${NODES}k a move, lambda $LAMBDA, epochs $EPOCHS, window $WINDOW"
      echo "positions: $(cat "$RD/batches") batches, $(size "$RD"/w*.bin) this round"; grep -E "^epoch|^records" "$RW/train.log" | tail -4
      head -1 "$RW/check.txt"; echo "vs hand, same nodes (${MNODES}k): $MN"; echo "vs hand, same time (${MTIME} ms): $MT"; [ -n "$MP" ] && echo "vs round $((r - 1)), same time: $MP"
    } > "$WORK/adopt/report.txt"
  else V="not adopted (does not beat the hand evaluation both ways${MP:+ and round $((r - 1))})"; fi
  echo "$V" > "$RW/verdict.txt"; touch "$RW/done"; log "round $r: $V"
done
echo
[ -f "$WORK/adopt/nnue.bin.gz" ] && { echo "== to adopt: $WORK/adopt/nnue.bin.gz"; cat "$WORK/adopt/report.txt"; } || echo "== no net to adopt yet (log: $WORK/log.txt)"
