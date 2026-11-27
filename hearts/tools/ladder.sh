#!/bin/bash
# adjacent levels: node arena (n+1) vs n. Usage: bash hearts/tools/ladder.sh [deals] > out.txt
D=${1:-150}
for n in $(seq 1 19); do m=$((n+1)); d=$D; if [ $n -ge 12 ]; then d=$((D*2/3)); fi; echo -n "Lv$m vs Lv$n: "; node "$(dirname "$0")/arena.js" $m $n $d $((n*7+3)); done
