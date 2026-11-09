#!/bin/bash
# Chess NNUE retraining, all stages in one go (Mac): build -> Lichess evaluations -> self-play -> teacher (optional)
# -> training (PyTorch, Apple GPU) -> exactness check -> matches vs the current net -> nnue-candidate.bin.gz
#   bash tools/nnue/run.sh                      (from the chess folder)
# Resumable: every stage leaves a marker in $WORK and the same command continues where it stopped.
# Settings (environment):
#   WORK      work folder, outside the repository (default ~/chess-nnue-work)
#   P         processes for self-play / teacher / matches (default: cores - 1)
#   LICHESS   1 = use the Lichess evaluation database (CC0, ~20 GB download), 0 = skip (default 1)
#   LMAX      use only the first LMAX Lichess positions (default 0 = all)
#   SP_POS    self-play positions to make (default 20000000; 0 = no self-play)
#   NODES     self-play nodes per move (default 5000)
#   SEEDBASE  0, 1, 2 ... a different number on each Mac that makes self-play (different games)
#   EXTRA_DATA  more record files for the training (e.g. self-play made on another Mac)
#   ONLY=data   stop after self-play / teacher (for a second Mac that only makes data)
#   TRAIN_OPTS  more options for train.py (e.g. "--backend numpy" without PyTorch)
#   TEACHER   UCI engine that re-scores the self-play positions (default: stockfish if installed; "none" = keep the
#             site engine's own scores). GPL engines are fine here: they only run on this Mac, nothing of them is shipped.
#   TDEPTH    teacher depth (default 10)
#   HIDDEN    hidden size (default 384 = the site; 512 / 768 = a bigger net, its own net-hN.bin, same data)
#   KB        king buckets (default 1 = none, as the site's net; 4 / 8 / 16 / 32 = the first layer per zone of the own king,
#             its own net-kbN.bin, same data; starts from the current site net copied into every bucket, LR 0.0005)
#   EPOCHS (8)  LR (0.001)  LAM (0.9)  INIT (empty = from scratch; "base" = continue from the current site net)
#   MNODES    match nodes per move (default 20000)  MGAMES (games per process, default 40)  MTIME (default 100ms; "" = skip)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
CHESS=$(cd "$HERE/../.." && pwd)
WORK=${WORK:-$HOME/chess-nnue-work}; export WORK
NC=$(getconf _NPROCESSORS_ONLN); P=${P:-$((NC > 2 ? NC - 1 : 1))}
LICHESS=${LICHESS:-1}; LMAX=${LMAX:-0}; SP_POS=${SP_POS:-20000000}; NODES=${NODES:-5000}; TDEPTH=${TDEPTH:-10}
LR_SET=0; [ -n "$LR" ] && LR_SET=1
EPOCHS=${EPOCHS:-8}; LR=${LR:-0.001}; LAM=${LAM:-0.9}
MNODES=${MNODES:-20000}; MGAMES=${MGAMES:-40}; MTIME=${MTIME-100ms}
if [ -z "$TEACHER" ]; then TEACHER=$(command -v stockfish || echo none); fi
mkdir -p "$WORK"
log() { echo "$(date '+%m-%d %H:%M') $*" | tee -a "$WORK/log.txt"; }

log "== build"
bash "$HERE/build.sh"
# base.bin = the site's current net (self-play, INIT=base, the matches). When the site's net has changed since the last run
# (v1 -> v2), the old one is kept as base-prev.bin.
gzip -dc "$CHESS/nnue.bin.gz" > "$WORK/base.tmp"
if [ -f "$WORK/base.bin" ] && ! cmp -s "$WORK/base.tmp" "$WORK/base.bin"; then mv "$WORK/base.bin" "$WORK/base-prev.bin"; log "base.bin: the site's net has changed (the old one is base-prev.bin)"; fi
mv "$WORK/base.tmp" "$WORK/base.bin"

# 1. Lichess evaluations (CC0): download (resumable) and convert to records
if [ "$LICHESS" = 1 ] && [ ! -f "$WORK/lichess.done" ]; then
  command -v zstd > /dev/null || { echo "zstd is needed: brew install zstd"; exit 1; }
  log "== Lichess evaluation database: download"
  curl -fL -C - --retry 10 -o "$WORK/lichess_db_eval.jsonl.zst" https://database.lichess.org/lichess_db_eval.jsonl.zst || \
    [ -s "$WORK/lichess_db_eval.jsonl.zst" ]
  log "== Lichess: converting (quiet positions only, about 1-2 hours)"
  zstd -dc "$WORK/lichess_db_eval.jsonl.zst" | MAX=$LMAX python3 "$HERE/lichess2txt.py" | "$WORK/convert" /dev/stdin "$WORK/lichess.tmp" 2> "$WORK/lichess.log"
  mv "$WORK/lichess.tmp" "$WORK/lichess.bin"; touch "$WORK/lichess.done"
  log "Lichess: $(( $(wc -c < "$WORK/lichess.bin") / 32 )) positions (the .zst can be deleted now)"
fi

# 2. self-play with the site's engine and the current net
if [ "$SP_POS" -gt 0 ] && [ ! -f "$WORK/sp/done" ]; then
  mkdir -p "$WORK/sp"
  G=$(( SP_POS / 110 / P + 1 ))
  log "== self-play: $P processes x $G games, $NODES nodes per move (about $SP_POS positions)"
  i=1
  while [ $i -le $P ]; do
    "$WORK/nntool" gen "$WORK/sp/d-$i.bin" $G $NODES $(( ${SEEDBASE:-0} * 1000 + i )) "$WORK/base.bin" 2> "$WORK/sp/log-$i.txt" &
    i=$((i + 1))
  done
  wait
  touch "$WORK/sp/done"
  log "self-play: $(cat "$WORK"/sp/d-*.bin | wc -c | awk '{print int($1 / 32)}') positions"
fi

# 3. teacher: re-score the self-play positions
SPFILES=""
if [ "$SP_POS" -gt 0 ]; then
  if [ "$TEACHER" != none ]; then
    if [ ! -f "$WORK/sp/teacher.done" ]; then
      log "== teacher $TEACHER depth $TDEPTH: re-scoring the self-play positions"
      for f in "$WORK"/sp/d-*.bin; do
        t=${f%/d-*}/t-${f##*/d-}
        "$WORK/nntool" rescore "$f" "$t" "$TEACHER" $TDEPTH 2> "${t%.bin}.log" &
        while [ "$(jobs -r | wc -l)" -ge "$P" ]; do sleep 5; done
      done
      wait
      touch "$WORK/sp/teacher.done"
    fi
    SPFILES=$(ls "$WORK"/sp/t-*.bin | tr '\n' ' ')
  else
    SPFILES=$(ls "$WORK"/sp/d-*.bin | tr '\n' ' ')
  fi
fi
[ "$ONLY" = data ] && { log "data only (ONLY=data): $SPFILES"; exit 0; }
FILES="$SPFILES"
[ -f "$WORK/lichess.done" ] && FILES="$FILES $WORK/lichess.bin"   # (the last file gives the validation positions)
[ -n "$EXTRA_DATA" ] && FILES="$EXTRA_DATA $FILES"
LAST=$(echo $FILES | awk '{print $NF}')

# 4. training (HIDDEN = the hidden size; 384 = the shipped engine. Another size gets its own net-hN.bin, the data is shared.
#    KB = king buckets: net-kbN.bin (net-hH-kbN.bin with another size), from the current net copied into every bucket)
HIDDEN=${HIDDEN:-384}; export HIDDEN; KB=${KB:-1}
case $KB in 1|4|8|16|32) ;; *) echo "KB must be 1, 4, 8, 16 or 32"; exit 1 ;; esac
TAG=""; [ "$HIDDEN" != 384 ] && TAG="-h$HIDDEN"; [ "$KB" != 1 ] && TAG="$TAG-kb$KB"
NET=$WORK/net$TAG.bin; DONE=$WORK/train$TAG.done; CAND=$WORK/nnue-candidate$TAG.bin.gz
if [ "$HIDDEN" = 384 ]; then NT=$WORK/nntool; UCIS=""
else NT=$WORK/nntool-$HIDDEN; UCIS="$WORK/chess-uci-$HIDDEN,$WORK/chess-uci"; bash "$HERE/build.sh"; fi
if [ "$KB" != 1 ]; then
  [ -z "$INIT" ] && INIT=base
  [ "$LR_SET" = 1 ] || LR=0.0005
fi
if [ ! -f "$DONE" ]; then
  log "== training (H $HIDDEN, king buckets $KB, $EPOCHS epochs, lr $LR)"
  INITOPT=""; [ "$INIT" = base ] && { if [ "$HIDDEN" = 384 ]; then INITOPT="--init $WORK/base.bin"; else log "(INIT=base needs HIDDEN=384: training from scratch)"; fi; }
  python3 "$HERE/train.py" --out "$NET" --hidden $HIDDEN --kb $KB --epochs $EPOCHS --lr $LR --lam $LAM $INITOPT $TRAIN_OPTS $FILES
  touch "$DONE"
  tail -1 "$NET.log" | sed 's/^/train: /' | tee -a "$WORK/log.txt"
fi

# 5. the engine reads the net exactly as the trainer computes it
"$NT" evalpos "$NET" "$LAST" 2000 > "$WORK/check-c.txt"
python3 "$HERE/train.py" --check "$NET" "$LAST" 2000 > "$WORK/check-py.txt"
if cmp -s "$WORK/check-c.txt" "$WORK/check-py.txt"; then log "check: engine = trainer on 2000 positions (identical, H $HIDDEN, king buckets $KB)"; else log "check: MISMATCH (send check-*.txt)"; exit 1; fi

# 6. speed (native, the same searches) and matches vs the current site net (a bigger net / king buckets can be slower:
#    the 100ms line, same time, is the one that counts)
"$WORK/nntool" bench "$WORK/base.bin" "$LAST" 24 200000 | sed 's/^/speed: /' | tee -a "$WORK/log.txt"
"$NT" bench "$NET" "$LAST" 24 200000 | sed 's/^/speed: /' | tee -a "$WORK/log.txt"
log "== matches vs the current net (H $HIDDEN, king buckets $KB vs the site's 384)"
UCI=$UCIS bash "$HERE/match.sh" "$NET" "$WORK/base.bin" $MNODES $MGAMES $P | tee -a "$WORK/log.txt"
[ -n "$MTIME" ] && UCI=$UCIS bash "$HERE/match.sh" "$NET" "$WORK/base.bin" $MTIME $((MGAMES / 2)) $P | tee -a "$WORK/log.txt"
gzip -9 -c "$NET" > "$CAND"
log "done: $CAND ($(wc -c < "$CAND" | tr -d ' ') bytes; and log.txt, ${NET##*/}.log)"
log "send: attach these 3 files in the Claude chat, or commit them to chess/tools/nnue/results/ on a NEW branch with GitHub Desktop and tell Claude the branch name (not Hugging Face; TRAIN.md section 5)"
