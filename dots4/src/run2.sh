#!/bin/bash
# Book generation orchestrator (resumable). Two slots (2 cores).
#  phase 1: shared top levels, one process (bookgen 0 1 4 3, SYM 5) -> phase1.done
#  phase 2: per side, two hash shares: AI first PF=10 (AI turns 0..8), AI second PS=9 (AI turns 1..7), SYM 6.
#  Files: book_<FILEID>.txt (phase 1 = 0; s0 shares = 1,2; s1 shares = 3,4). Each run <= 55 min, then restarted.
cd /home/claude/work/dots4src
D=/home/claude/work/ckpt/dots4/book
export TTSEED=/home/claude/work/ckpt/dots4/root/tt_root.bin
p1() {
  while [ ! -f $D/phase1.done ]; do
    if pgrep -f "bookgen 27 $D 0 1 4 3" >/dev/null || pgrep -f "bookgen_new 27 $D 0 1 4 3" >/dev/null; then sleep 30; continue; fi
    ./bookgen_new 27 $D 0 1 4 3 55 5 >> $D/run_p1.out 2>&1 && touch $D/phase1.done
  done
}
p1wait() { while [ ! -f $D/phase1.done ]; do sleep 30; done; }
job() {
  local side=$1 id=$2 fid=$((1 + 2 * $1 + $2))
  while [ ! -f $D/p2_s${side}_${id}.done ]; do
    SIDES=$((1 << side)) FILEID=$fid ./bookgen_new 27 $D $id 2 10 9 55 5 >> $D/run_p2_s${side}_${id}.out 2>&1
    rc=$?
    if [ $rc -eq 0 ]; then touch $D/p2_s${side}_${id}.done; elif [ $rc -ne 3 ]; then echo "rc=$rc $(date)" >> $D/run_p2_s${side}_${id}.out; sleep 10; fi
  done
}
( job 0 0; p1wait; job 1 0 ) &
( p1; job 0 1; job 1 1 ) &
wait
touch $D/all.done
