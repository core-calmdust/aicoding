#!/bin/sh
# More rounds of tools/nn/loop.sh after the last finished one (2026-11-17): N more rounds, the same settings otherwise.
#   sh tools/nn/more.sh [rounds=10] [games=600] [procs=10]      (in checkers/; NODES=50 for a deeper teacher)
set -e
cd "$(dirname "$0")/../.."
last=$(ls nnwork/net-*.nnue 2>/dev/null | sed 's/.*net-\([0-9]*\)\.nnue/\1/' | sort -n | tail -1); last=${last:-0}
echo "last round: $last → $((last + ${1:-10}))"
tools/nn/build.sh
tools/nn/loop.sh $((last + ${1:-10})) "${2:-600}" "${3:-10}"
