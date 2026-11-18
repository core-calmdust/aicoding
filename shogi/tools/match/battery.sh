#!/bin/bash
# A battery of matches: each setting of the search's parameters (engine.c set_param) against the engine's defaults, at a
# fixed number of nodes per move (so it can use every core and other work on the machine does not change the results).
#   bash tools/match/battery.sh [nodes (20000)] [games per process (100)] [processes (cores - 2)] < settings   (one "k=v,k=v" per line)
#   bash tools/match/battery.sh 20000 100 12 < tools/match/battery-v4.txt
# (2026-11-18: every process searches a few more nodes than the one before, so no two play the same games; the results
# before that, in battery.txt, were 200 different games counted several times.)
# A setting is known by its text and the node count alone: after the engine's defaults change, write a setting differently
# (or set WORK to a new folder), or the older result is shown.
# Results: one line per setting on the screen and in ~/shogi-spsa/battery2.txt (appended; a setting already there is skipped,
# so the same command continues after a stop).
HERE=$(cd "$(dirname "$0")" && pwd); cd "$HERE/../.."
N=${1:-20000}; G=${2:-100}; NC=$(getconf _NPROCESSORS_ONLN); P=${3:-$((NC > 3 ? NC - 2 : 2))}
OUT=${WORK:-$HOME/shogi-spsa}/battery2.txt; mkdir -p "$(dirname "$OUT")"; touch "$OUT"
while read -r S; do
  [ -z "$S" ] && continue; case "$S" in \#*) continue;; esac
  if grep -q "^$N $S " "$OUT"; then grep "^$N $S " "$OUT" | tail -1; continue; fi
  R=$(python3 tools/match/spsa.py test --work "${WORK:-$HOME/shogi-spsa}" --nodes $N --procs $P --games $G --set "$S" 2>&1 | tail -1)
  echo "$N $S  ${R#candidate vs defaults: }" | tee -a "$OUT"
done
