#!/bin/bash
# parallel paired bench: pbench.sh '<cfgA>' '<cfgB>' deals_per_proc procs [opts]
A="$1"; B="$2"; N="$3"; P="${4:-2}"; O="${5:-{\}}"
D=$(dirname "$0")
for i in $(seq 1 $P); do node "$D/bench3.js" "$A" "$B" "$N" $((1000 + i * 37 + ${SEEDBASE:-0})) "$O" & done | node -e '
let n=0,s=0,q=0,mx=0,av=0,k=0;require("readline").createInterface({input:process.stdin}).on("line",l=>{const j=JSON.parse(l);n+=j.n;s+=j.sum;q+=j.sq;mx=Math.max(mx,j.maxA);av+=j.avgA;k++}).on("close",()=>{const m=s/n,sd=Math.sqrt(q/n-m*m);console.log(`${process.argv[1]} vs ${process.argv[2]}: ${m.toFixed(3)} ± ${(sd/Math.sqrt(n)).toFixed(3)} pts/hand (${n} deals x2), A avg ${(av/k).toFixed(0)}ms max ${mx}ms`)})' "$A" "$B"
