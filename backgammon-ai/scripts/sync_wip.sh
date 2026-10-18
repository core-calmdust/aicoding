#!/bin/sh
# copy compact checkpoints + log into the wip-ai-data worktree, commit and push (never touches main)
set -e
W=/home/claude/work/wip-ai-data; C=/home/claude/work/ckpt/backgammon
mkdir -p $W/backgammon-ai
rm -rf $W/backgammon-ai; mkdir -p $W/backgammon-ai; cp -r $C/. $W/backgammon-ai/; find $W/backgammon-ai -name "*.tmp" -delete
cd $W
git add -A
git commit -q -m "wip: backgammon AI checkpoints $(date -u +%Y-%m-%dT%H:%MZ)" || true
git push -q origin wip-ai-data 2>&1 | tail -2
du -sh $W/backgammon-ai
