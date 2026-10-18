#!/bin/sh
# resumable: new deep Lv10 (bgw.js) vs previous Lv10 (bg_l10v1.js), same dice, swapped colours. Chunks of <=55 min,
# results appended per game to meas/L10b_deep_vs_v1.jsonl; wip branch synced after every chunk.
cd /home/claude/work/ckpt/backgammon
for chunk in 1 2 3 4 5 6 7; do
  n=$(wc -l < meas/L10b_deep_vs_v1.jsonl 2>/dev/null || echo 0)
  [ "$n" -ge 400 ] && break
  RES=meas/L10b_deep_vs_v1.jsonl SEEDP=L10b INTERIM=1 timeout 3300 node scripts/cmpw.js wb:nets/fast1.json wbv1:nets/fast1.json 400 2 lv10,lv10 >> meas/meas_l10b.log 2>&1
  scripts/sync_wip.sh >> meas/meas_l10b.log 2>&1
done
echo L10BDONE >> meas/meas_l10b.log
