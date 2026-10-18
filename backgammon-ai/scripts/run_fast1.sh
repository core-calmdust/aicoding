#!/bin/sh
# distil the fast net from wildbg labels + CC0 rollouts (resumable: rerun this script)
cd /home/claude/work/ckpt/backgammon
DEC=0.8 timeout 3300 node scripts/trainsup.js nets/fast1.json 8 2 128 80 0.006 nets/n3_shipped.json -- /home/claude/work/data/backgammon/w1_0.bin /home/claude/work/data/backgammon/w1_1.bin /home/claude/work/data/backgammon/roll_contact.bin /home/claude/work/data/backgammon/roll_contact.bin /home/claude/work/data/backgammon/roll_contact.bin /home/claude/work/data/backgammon/roll_race.bin /home/claude/work/data/backgammon/roll_race.bin >> meas/train_fast1.log 2>&1
