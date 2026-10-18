#!/bin/sh
# resumable: continue L10 new vs current (rerun to continue)
cd /home/claude/work/ckpt/backgammon
RES=meas/L10_new_vs_cur.jsonl SEEDP=L10 INTERIM=1 timeout 4200 node scripts/cmpw.js wb:nets/fast1.json nets/n3_shipped.json 400 2 lv10,lv10 >> meas/meas.log 2>&1
echo L10DONE >> meas/meas.log
