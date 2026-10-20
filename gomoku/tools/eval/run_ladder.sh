#!/bin/bash
cd /home/claude/work/eval
for ab in "1 3" "3 5" "5 7" "7 9" "9 11" "11 13" "13 15" "15 17" "17 19"; do node ladder.js $ab 8 > lad_${ab// /_}.log 2>&1; done
