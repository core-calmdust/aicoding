#!/bin/bash
cd /home/claude/work/eval
ONLY=std node label_p.js 3 10000 > labp3.log 2>&1
