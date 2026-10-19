#!/bin/bash
cd /home/claude/work/eval
node label.js 0 2 10000 > lab0.log 2>&1 &
node label.js 1 2 10000 > lab1.log 2>&1 &
wait
