#!/bin/bash
cd /home/claude/work/eval
node label_p.js 0 10000 > labp0.log 2>&1 &
node label_p.js 1 10000 > labp1.log 2>&1 &
wait
