#!/bin/sh
# resumable measurements (rerun to continue): new (wildbg + fast1 hybrid) vs current site engine (n3)
cd /home/claude/work/ckpt/backgammon
RES=meas/L8_new_vs_cur.jsonl SEEDP=L8 INTERIM=1 timeout 3500 node scripts/cmpw.js wb:nets/fast1.json nets/n3_shipped.json 1000 2 lv8,lv8 >> meas/meas.log 2>&1
RES=meas/L10_new_vs_cur.jsonl SEEDP=L10 INTERIM=1 timeout 3500 node scripts/cmpw.js wb:nets/fast1.json nets/n3_shipped.json 400 2 lv10,lv10 >> meas/meas.log 2>&1
echo MEASDONE >> meas/meas.log
