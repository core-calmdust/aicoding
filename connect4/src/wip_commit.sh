#!/bin/bash
# copy compact checkpoints to the wip-ai-data worktree and push (never main)
set -e
W=/home/claude/work/wip-ai-data; C=/home/claude/work/ckpt/connect4
cd $W; [ "$(git rev-parse --abbrev-ref HEAD)" = wip-ai-data ] || exit 1
mkdir -p connect4/src connect4/t
cp $C/progress.md connect4/; cp $C/src/* connect4/src/; cp $C/*.bin connect4/ 2>/dev/null || true
for f in $C/t/s*_d*.txt; do [ -f "$f" ] && gzip -c "$f" > connect4/t/$(basename $f).gz; done
cp /home/claude/aicoding/connect4/engine.js connect4/engine.js.wip
[ -f /home/claude/aicoding/connect4/tree.bin ] && cp /home/claude/aicoding/connect4/tree.bin connect4/
git add connect4
git commit -q -m "wip: connect4 Lv8 tree checkpoints $(date -u +%Y-%m-%dT%H:%MZ)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Ky461YoVpACBBys6RwWYFn" || true
git pull -q --rebase origin wip-ai-data 2>/dev/null || true
git push -q origin wip-ai-data
