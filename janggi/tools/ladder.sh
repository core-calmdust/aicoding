#!/bin/sh
# adjacent-level ladder: score of level i against level i-1 (native build /tmp/jg)
for i in $(seq 2 20); do
  n=30; [ $i -ge 17 ] && n=12; [ $i -ge 19 ] && n=6
  /tmp/jg match $i $((i-1)) $n $i 2
done
