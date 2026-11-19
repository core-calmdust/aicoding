#!/bin/sh
# The AI's opening books of Agon on a Mac (2026-11-20, claude/agon-spec.md「AI の序盤ブック」): every book position analysed by
# the site's engine (the page's worker in Node: the wasm search, and the learned evaluation once agon/net.js has a net) for MS ms,
# one position per core; the moves within 10 of the best kept, the tree grown along the K best (per ply, "3,2" = 3 at the first
# ply, then 2) up to PLIES plies, for both rules. Stopped and run again: it goes on from $BOOK_DIR. Then it copies the books to
# agon/ — raise book-${k}.json?v= in agon/engine.js, and check them with agon/tools/bookmatch.js before committing.
#   sh agon/tools/book.sh [plies=10] [k=3,2] [ms=20000] [workers=cores-1]      (from the repository root)
set -e
ROOT=$(cd "$(dirname "$0")/../.." && pwd); cd "$ROOT"
PLIES=${1:-10}; K=${2:-3,2}; MS=${3:-20000}
NW=${4:-$(node -e "console.log(Math.max(1, require('os').cpus().length - 1))")}
W=${BOOK_DIR:-$HOME/agbook}
mkdir -p "$W"
node agon/tools/genbook.js --rule all --plies "$PLIES" --k "$K" --ms "$MS" --margin 10 --workers "$NW" --out "$W"
for r in std place; do cp "$W/book-$r.json" agon/; echo "agon/book-$r.json: $(wc -c < agon/book-$r.json) bytes"; done
