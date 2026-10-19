#!/bin/sh
# copy compact checkpoints to the wip-ai-data worktree (folder dotscontent/) and push (never main)
set -e
W=/home/claude/work/wip-ai-data; C=/home/claude/work/ckpt/dotscontent; D=$W/dotscontent
mkdir -p $D/src $D/cand $D/site
cp /home/claude/work/dotsgen/*.js /home/claude/work/dotsgen/*.c /home/claude/work/dotsgen/*.sh $D/src/ 2>/dev/null || true
cp $C/progress.md $D/
for f in $C/cand_*.jsonl; do case $f in *oldjs*) ;; *) gzip -c "$f" > $D/cand/$(basename $f).gz;; esac; done
cp $C/*.json $D/cand/ 2>/dev/null || true
S=/home/claude/aicoding/dots; mkdir -p $D/site/puzzles
cp $S/lessons.json $S/openings.json $D/site/ 2>/dev/null || true
cp $S/puzzles/*.json $D/site/puzzles/ 2>/dev/null || true
[ -d $S/content ] && mkdir -p $D/site/content && cp $S/content/* $D/site/content/ 2>/dev/null || true
cp $S/index.html $S/engine.js $S/i18n.js $D/site/ 2>/dev/null || true
cd $W
git rev-parse --abbrev-ref HEAD | grep -qx wip-ai-data
git add dotscontent
git commit -q -m "wip: dotscontent checkpoints $(date -u +%Y-%m-%dT%H:%MZ)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Ky461YoVpACBBys6RwWYFn" || true
git pull -q --rebase origin wip-ai-data 2>&1 | tail -2 || true
git push -q origin wip-ai-data 2>&1 | tail -2
date -u +%FT%TZ >> $C/commit.log
