#!/bin/sh
# Book generation, resumable. Phase 1: shared top levels (one process). Phase 2: two processes split by hash.
# Each run is bounded to 55 minutes; the loop restarts it from the checkpoint (results files + TT dump).
cd /home/claude/work/dots4src
D=/home/claude/work/ckpt/dots4/book
PF=${PF:-8}; PS=${PS:-9}; SYM=${SYM:-5}
export TTSEED=/home/claude/work/ckpt/dots4/root/tt_root.bin
if [ ! -f $D/phase1.done ]; then
  while :; do ./bookgen 27 $D 0 1 4 3 55 $SYM >> $D/run_p1.out 2>&1; rc=$?; [ $rc -eq 0 ] && break; [ $rc -eq 3 ] || { echo "phase1 rc=$rc" >> $D/run_p1.out; exit 1; }; done
  touch $D/phase1.done
fi
w() { while :; do ./bookgen 27 $D $1 2 $PF $PS 55 $SYM >> $D/run_p2_$1.out 2>&1; rc=$?; [ $rc -eq 0 ] && break; [ $rc -eq 3 ] || { echo "rc=$rc" >> $D/run_p2_$1.out; sleep 5; }; done; touch $D/phase2_$1.done; }
w 0 & w 1 & wait
