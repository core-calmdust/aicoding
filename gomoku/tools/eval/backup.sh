#!/bin/bash
# back up eval tools + Rapfi labels to the wip branch (worktree separate from main checkout)
set -e
W=/home/claude/work/wip
if [ ! -d $W ]; then git -C /home/claude/aicoding worktree add -q -B wip-gomoku-eval $W origin/main; fi
mkdir -p $W/gomoku/tools/eval/data
cp /home/claude/work/eval/*.js /home/claude/work/eval/*.sh $W/gomoku/tools/eval/ 2>/dev/null || true
cat /home/claude/work/eval/labels_*.jsonl | gzip -c > $W/gomoku/tools/eval/data/labels.jsonl.gz
cp /home/claude/work/eval/w_*.json $W/gomoku/tools/eval/data/ 2>/dev/null || true
cp /home/claude/aicoding/gomoku/engine.js $W/gomoku/engine.js
cd $W && git add -A gomoku && git commit -qm "wip: gomoku learned eval (tools, labels $(date +%H:%M))" && git push -q -f origin wip-gomoku-eval 2>&1 | tail -1 || true
echo backed up
