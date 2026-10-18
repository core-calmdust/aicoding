#!/bin/sh
# copy compact checkpoints + log to the wip-ai-data worktree and push (never main)
set -e
W=/home/claude/work/wip-ai-data; C=/home/claude/work/ckpt/dots4
mkdir -p $W/dots4/src $W/dots4/book $W/dots4/root
cp /home/claude/work/dots4src/*.c /home/claude/work/dots4src/*.sh /home/claude/work/dots4src/*.js $W/dots4/src/ 2>/dev/null || true
cp $C/progress.md $W/dots4/
cp $C/root/root_*.txt $C/root/solver.log $W/dots4/root/ 2>/dev/null || true
for f in $C/book/book_*.txt; do [ -f "$f" ] && gzip -c "$f" > $W/dots4/book/$(basename $f).gz; done
cp $C/book/*.done $C/book/run_*.out $W/dots4/book/ 2>/dev/null || true
mkdir -p $W/dots4/tests; for f in $C/tests/*; do case $f in *.jsonl) gzip -c $f > $W/dots4/tests/$(basename $f).gz;; *) cp $f $W/dots4/tests/;; esac; done; cp $C/verify*.log $W/dots4/ 2>/dev/null || true
cd $W
git rev-parse --abbrev-ref HEAD | grep -qx wip-ai-data
git add dots4
git commit -q -m "wip: dots4 checkpoints $(date -u +%Y-%m-%dT%H:%MZ)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Ky461YoVpACBBys6RwWYFn" || true
git push -q origin wip-ai-data 2>&1 | tail -2
