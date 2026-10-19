#!/bin/sh
# copy compact dots5 checkpoints to the wip-ai-data worktree and push (never main)
W=/home/claude/work/wip-ai-data
cd $W || exit 1
[ "$(git rev-parse --abbrev-ref HEAD)" = "wip-ai-data" ] || { echo "not on wip-ai-data"; exit 1; }
mkdir -p dots5/src dots5/matches
cp /home/claude/work/ckpt/dots5/progress.md dots5/
cp /home/claude/work/ckpt/dots5/matches/*.jsonl dots5/matches/ 2>/dev/null
cp /home/claude/work/dots5src/*.c /home/claude/work/dots5src/*.js /home/claude/work/dots5src/*.sh dots5/src/ 2>/dev/null
rm -f dots5/src/engine.orig.js
git add dots5
git diff --cached --quiet && { echo "nothing to commit"; exit 0; }
git commit -q -m "wip: dots5 checkpoints $(date -u +%Y-%m-%dT%H:%MZ)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Ky461YoVpACBBys6RwWYFn"
git pull -q --rebase origin wip-ai-data 2>/dev/null
git push -q origin wip-ai-data && echo pushed
