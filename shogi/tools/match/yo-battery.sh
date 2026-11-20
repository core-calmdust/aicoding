#!/bin/bash
# Many settings of our search, one after another, against YaneuraOu's search with our evaluation (tools/match/yo-ours.sh):
#   bash tools/match/yo-battery.sh tools/match/yo-battery-1.txt
# Each line of the file is a PARAMS string (set_param k=v, ...; "-" = the defaults; # = a comment). 200 games a line:
# ours OURS nodes (default 80000) against YaneuraOu's NODES (40000), P processes (10). Results are added to
# ~/shogi-yo-ours/battery.txt; a line that is already there is not played again.
HERE=$(cd "$(dirname "$0")" && pwd); OUT=${WORK:-$HOME/shogi-yo-ours}/battery.txt; mkdir -p "$(dirname "$OUT")"; touch "$OUT"
NODES=${NODES:-40000}; OURS=${OURS:-80000}; P=${P:-10}; G=$(( 200 / P ))
grep -v '^#' "$1" | grep -v '^ *$' | while read -r line; do
  key="[$line] $OURS vs $NODES"
  if grep -qF "$key" "$OUT"; then grep -F "$key" "$OUT" | tail -n 1; continue; fi
  p="$line"; [ "$p" = "-" ] && p=""
  r=$(PARAMS="$p" bash "$HERE/yo-ours.sh" $NODES $OURS $G $P | tail -n 1 | sed 's/.*: //')
  echo "$key: $r" | tee -a "$OUT"
done
