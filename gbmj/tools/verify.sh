#!/bin/sh
# 国標麻将の照合（作業環境だけで実行。PyMahjongGB は照合の正解データを作るためだけに使い、サイトには載せない）
#   pip install PyMahjongGB    （または python3 -m venv で）
#   sh gbmj/tools/verify.sh [件数=200000] [python=python3]
set -e
N=${1:-200000}; PY=${2:-python3}; D=$(mktemp -d)
cd "$(dirname "$0")/../.."
node gbmj/tools/fan-test.js
i=0; while [ $i -lt $((N / 10000)) ]; do node gbmj/tools/fan-gen.js 10000 $((1000 + i)); i=$((i + 1)); done > $D/cases.jsonl
$PY -I gbmj/tools/ref-fan.py $D/cases.jsonl > $D/ref.jsonl
node gbmj/tools/fan-compare.js $D/cases.jsonl $D/ref.jsonl 1
node gbmj/tools/fan-coverage.js $D/cases.jsonl | tail -1
node gbmj/tools/shanten-gen.js 100000 77 > $D/sh.jsonl
$PY -I gbmj/tools/ref-shanten.py $D/sh.jsonl > $D/sh.txt
node gbmj/tools/shanten-compare.js $D/sh.jsonl $D/sh.txt
