#!/bin/sh
# The AI's opening book on a Mac (2026-11-17): every book position analysed by the site's engine (with the 6-piece database)
# for MS ms, the moves within 8 points of the best kept, the tree grown along the K best up to PLIES plies; then the
# 五段 setting with the book against the same without it (games from the start position: the book or the live analysis
# picks among the near-best moves). Writes checkers/book.json — commit it if the match line is not negative.
#   sh checkers/tools/book.sh [plies=12] [k=2] [ms=15000] [workers=10] [pairs=300]      (from the repository root)
set -e
ROOT=$(cd "$(dirname "$0")/../.." && pwd); cd "$ROOT"
PLIES=${1:-12}; K=${2:-2}; MS=${3:-15000}; NW=${4:-10}; PAIRS=${5:-300}; W=${BOOK_DIR:-$HOME/cbook}
mkdir -p "$W"
[ -s "$W/book.json" ] || node shared/tools/genbook.js checkers --plies "$PLIES" --k "$K" --ms "$MS" --margin 8 --workers "$NW" --out "$W/book.json"
for s in A B; do rm -rf "$W/$s"; mkdir -p "$W/$s"
  cp checkers/engine.js checkers/engine.wasm checkers/engine_simd.wasm checkers/mt-helper.js checkers/evalnet.bin.gz checkers/egdb4.bin.gz checkers/egdb5.bin.gz checkers/egdb6.bin.gz "$W/$s/"; done
cp "$W/book.json" "$W/B/"
node shared/tools/match.js checkers --a "0@$W/A" --b "0@$W/B" --cfg '{"nk":0,"ms":2500,"book":1}' --open 0 --pairs "$PAIRS" --workers "$NW" --seed 91 | tee "$W/result.txt"
cp "$W/book.json" checkers/book.json
echo "checkers/book.json: $(wc -c < checkers/book.json) bytes"
