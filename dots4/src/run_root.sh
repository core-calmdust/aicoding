#!/bin/sh
# chained <=55 min runs of the root solve; each resumes from the TT checkpoint
cd /home/claude/work/dots4src
for i in 1 2 3 4 5 6 7 8; do
  ./dsolve root 27 /home/claude/work/ckpt/dots4/root 55 0 tt_root.bin >> /home/claude/work/ckpt/dots4/root/run.out 2>&1
  rc=$?
  [ $rc -eq 3 ] || break
done
