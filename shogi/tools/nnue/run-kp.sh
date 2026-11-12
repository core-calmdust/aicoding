#!/bin/bash
# HalfKP-style shogi NNUE, all stages (Mac): build -> data (tanuki- dataset, MIT) -> prep -> training (starting from the
# current net) -> exactness checks -> speed -> matches vs the current net -> kp-candidate.bin.gz.   (tools/nnue/TRAIN.md)
#   bash tools/nnue/run-kp.sh              (from the shogi folder)
# Resumable: the same command continues (finished stages are skipped; training continues from its checkpoint).
# Settings (environment):
#   WORK    work folder outside the repository (default ~/shogi-kp-work)
#   COUNT   tanuki- data files to download (default 100, ~0.31 GB / ~7.8M positions each)   ROUND (default 1)
#   DATA    PackedSfenValue files to use instead of downloading (then VAL = a validation file, default: the last 1%)
#   KMAP    king buckets: k9 (default), k3, k81, or a file of 81 numbers      H  hidden size (default 512, as the site's net)
#   EPOCHS (4)  LR (0.0001)  OSCALE (0.805: the scale of the site's net, which the search is tuned to)  LAMBDA (0.75)  THREADS (all cores)  INIT (default: the site's nnue.bin.gz; "none" = random)
#   MNODES  match nodes per move (default 30000)  MTIME (default 300ms; "" = skip)  MGAMES (games per process, 20)  P (cores - 1)
set -e
HERE=$(cd "$(dirname "$0")" && pwd); SHOGI=$(cd "$HERE/../.." && pwd)
WORK=${WORK:-$HOME/shogi-kp-work}; export WORK
KMAP=${KMAP:-k9}; H=${H:-512}; EPOCHS=${EPOCHS:-4}; LR=${LR:-0.0001}; LAMBDA=${LAMBDA:-0.75}; OSCALE=${OSCALE:-0.805}
MNODES=${MNODES:-30000}; MTIME=${MTIME-300ms}; MGAMES=${MGAMES:-20}
NC=$(getconf _NPROCESSORS_ONLN); P=${P:-$((NC > 2 ? NC - 1 : 1))}; THREADS=${THREADS:-$NC}
case $KMAP in k1) KB=1 ;; k3) KB=3 ;; k9) KB=9 ;; k81) KB=81 ;; *) KB=$(( $(tr -s ' \n' '\n' < "$KMAP" | sort -n | tail -1) + 1 )) ;; esac
mkdir -p "$WORK"; cd "$WORK"
log() { echo "$(date '+%m-%d %H:%M') $*" | tee -a "$WORK/log.txt"; }

log "== build"
KB=$KB H=$H bash "$HERE/build-kp.sh" "$WORK" > /dev/null
KP="$WORK/kptool-$KB-$H"
gzip -dc "$SHOGI/nnue.bin.gz" > cur.bin

# 1. data
if [ -n "$DATA" ]; then
  TRAIN_IN="$DATA"
elif [ ! -s train.bin ]; then
  log "== download ($COUNT files, resumable)"
  COUNT=${COUNT:-100} bash "$HERE/fetch.sh"
  TRAIN_IN="$WORK/raw/*.bin"
fi
if [ ! -s train.bin ]; then
  log "== prep (quiet positions, shuffled)"
  ./prep train.tmp $TRAIN_IN 2> prep.log && mv train.tmp train.bin
  tail -1 prep.log | tee -a log.txt
  [ -z "$DATA" ] && log "(raw/ can be deleted now to free disk space)"
fi
VALOPT=""; V=${VAL:-$WORK/val.bin}; [ -s "$V" ] && VALOPT="--val $V"
CHECKDATA=${V:-train.bin}; [ -s "$CHECKDATA" ] || CHECKDATA=train.bin

# 2. training (the current net goes into the shared copy: the first epoch starts from the current strength)
INITOPT="--init $WORK/cur.bin"; [ "$INIT" = none ] && INITOPT=""; [ -n "$INIT" ] && [ "$INIT" != none ] && INITOPT="--init $INIT"
if [ ! -f train.done ]; then
  log "== training: $KMAP ($KB buckets), H $H, $EPOCHS epochs"
  ./trainkp train.bin kp.bin --kb $KMAP --hidden $H --epochs $EPOCHS --lr $LR --lambda $LAMBDA --oscale $OSCALE --threads $THREADS $VALOPT $INITOPT $TRAIN_OPTS 2>&1 | tee -a train.log
  touch train.done
fi
# the net of the epoch with the best valid (kp.bin.epN) becomes kp.bin; the scale of both nets against the data is logged
BEST=$(tr '\r' '\n' < train.log | awk '/^epoch [1-9]/ { if (b == "" || $6 < b) { b = $6; e = $2 } } END { print e }')
if [ -n "$BEST" ] && [ -s "kp.bin.ep$BEST" ]; then cp "kp.bin.ep$BEST" kp.bin; log "kp.bin = epoch $BEST (the best valid)"; fi
printf 'scale current: ' | tee -a log.txt; ./trainkp --scale cur.bin "$CHECKDATA" 200000 | head -1 | tee -a log.txt
printf 'scale HalfKP:  ' | tee -a log.txt; ./trainkp --scale kp.bin "$CHECKDATA" 200000 | head -1 | tee -a log.txt
tr '\r' '\n' < train.log | grep "^epoch" | tail -1 | sed 's/^/train: /' | tee -a log.txt

# 3. the engine evaluates the net exactly as the trainer and as an independent Python implementation
./trainkp --check kp.bin "$CHECKDATA" 2000 dump.txt > check-train.txt
"$KP" evalpos kp.bin "$CHECKDATA" 2000 > check-engine.txt
OKPY=skip; if python3 -c "import numpy" 2> /dev/null; then python3 "$HERE/kpcheck.py" kp.bin dump.txt > check-py.txt; cmp -s check-train.txt check-py.txt && OKPY=same || OKPY=DIFFERENT; fi
if cmp -s check-train.txt check-engine.txt && [ "$OKPY" != DIFFERENT ]; then log "check: trainer = engine (= Python: $OKPY) on 2000 positions"; else log "check: MISMATCH (python: $OKPY) - send check-*.txt"; exit 1; fi
"$KP" walk kp.bin "$CHECKDATA" 2000 | tee -a log.txt

# 4. speed (the same searches; the HalfKP net refreshes a perspective when its king changes bucket)
cd "$SHOGI/tools/bench"
printf 'speed current: '; cc -O3 -DNATIVE -DNUE_H=$(od -An -t d4 -j 4 -N 4 "$WORK/cur.bin" | tr -d ' ') -w -o "$WORK/bench" bench.c && "$WORK/bench" "$WORK/cur.bin" 300000 12 | tee -a "$WORK/log.txt"
printf 'speed HalfKP:  '; "$KP" bench "$WORK/kp.bin" 300000 12 | tee -a "$WORK/log.txt"
cd "$WORK"

# 5. matches vs the current net
log "== matches vs the current net"
bash "$HERE/match-kp.sh" kp.bin $MNODES $MGAMES $P | tee -a log.txt
[ -n "$MTIME" ] && bash "$HERE/match-kp.sh" kp.bin $MTIME $MGAMES $P | tee -a log.txt
gzip -9 -c kp.bin > kp-candidate.bin.gz
log "done: $WORK/kp-candidate.bin.gz ($(wc -c < kp-candidate.bin.gz) bytes)  (and log.txt, train.log)"
log "send: attach these 3 files in the Claude chat, or commit them to shogi/tools/nnue/results/ on a NEW branch with GitHub Desktop and tell Claude the branch name (not Hugging Face; TRAIN.md section 5)"
