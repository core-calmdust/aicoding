#!/bin/bash
# resumable driver: run_gen.sh side D SFROM  (each c4gen run <= 55 min, resumes from cache_s<side>.bin)
cd /home/claude/work/ckpt/connect4
[ -x /home/claude/work/c4gen ] || gcc -O3 -march=native -o /home/claude/work/c4gen src/gen.c
side=$1; D=$2; SF=$3; R=${4:-$1}
while true; do
  nice -n 5 /home/claude/work/c4gen $side $D $SF cache_s$side.bin t/s${side}_d${D}_r$R.txt.part 3300 $R >> t/s${side}_d${D}_r$R.log 2>&1
  rc=$?
  if [ $rc -eq 0 ]; then mv t/s${side}_d${D}_r$R.txt.part t/s${side}_d${D}_r$R.txt; echo "DONE side $side D $D $(date)" >> t/s${side}_d${D}_r$R.log; break; fi
  [ $rc -ne 2 ] && { echo "FAIL rc=$rc" >> t/s${side}_d${D}_r$R.log; break; }
done
