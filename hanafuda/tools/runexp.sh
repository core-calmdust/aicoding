#!/bin/bash
# runexp.sh name '<cfgA>' '<cfgB>' deals_per_proc -> /tmp/hf/exp/<name>.<i>.jsonl (progress every 50 deals)
mkdir -p /tmp/hf/exp; D=$(dirname "$0")
for i in 1 2; do PROG=1 node "$D/bench3.js" "$2" "$3" "$4" $((1000 + i * 37)) "${5:-{\}}" > /tmp/hf/exp/$1.$i.jsonl & done; wait
