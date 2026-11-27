#!/bin/bash
D=${1:-150}; FROM=${2:-1}; TO=${3:-19}
for n in $(seq $FROM $TO); do m=$((n+1)); d=$D; if [ $n -ge 12 ]; then d=$((D/2)); fi; echo -n "Lv$m vs Lv$n: "; node "$(dirname "$0")/arena.js" $m $n $d $((n*11+5)); done
