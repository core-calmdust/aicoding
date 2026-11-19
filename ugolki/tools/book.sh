#!/bin/sh
# The AI's opening books on a Mac (2026-11-20, claude/ugolki-spec.md「定跡の拡充」): every book position analysed by the site's
# engine (search v3, the learned evaluation when engine.js NETV has the rule's net) for MS ms, the moves within 10 of the best
# kept, the tree grown along the K best up to PLIES plies (天上 uses the book to ply 10). Writes ugolki/book-<rule>.json —
# then raise book-${k}.json?v= in ugolki/engine.js.
#   sh ugolki/tools/book.sh [plies=9] [k=3] [ms=15000] [workers=cores-1]      (from the repository root)
set -e
ROOT=$(cd "$(dirname "$0")/../.." && pwd); cd "$ROOT"
NW=${4:-$(node -e "console.log(Math.max(1, require('os').cpus().length - 1))")}   # one position per core (genbook.js threads, 2026-11-20)
PLIES=${1:-9}; K=${2:-3}; MS=${3:-15000}; W=${BOOK_DIR:-$HOME/ugbook}
mkdir -p "$W"
for r in c33 c34 c44 diag; do
  [ -s "$W/book-$r.json" ] || node shared/tools/genbook.js ugolki --rule $r --plies "$PLIES" --k "$K" --ms "$MS" --margin 10 --workers "$NW" --out "$W/book-$r.json"
done
for r in c33 c34 c44 diag; do cp "$W/book-$r.json" ugolki/; echo "ugolki/book-$r.json: $(wc -c < ugolki/book-$r.json) bytes"; done
