#!/bin/sh
# 6-piece endgame database test (2026-11-16): build the 6-piece tables, compress them (CKZ3) and play the site's
# engine with 2–6 pieces against itself with 2–5 pieces (claude/checkers-spec.md「終盤DB」).
#   sh checkers/tools/eg6test.sh [pairs=1500] [workers=10]      (from the repository root; resumable: run it again)
# Work files go to ~/eg6test (about 3 GB). The 6-piece build takes hours (single-threaded without libomp).
set -e
ROOT=$(cd "$(dirname "$0")/../.." && pwd); W=${EG6_DIR:-$HOME/eg6test}; PAIRS=${1:-1500}; NW=${2:-10}
mkdir -p "$W/ckpt"; cd "$ROOT/checkers"
OMP=""; for d in /opt/homebrew/opt/libomp /usr/local/opt/libomp; do [ -d "$d" ] && OMP="-Xpreprocessor -fopenmp -I$d/include -L$d/lib -lomp"; done
[ "$(uname)" = Linux ] && OMP="-fopenmp"
CC=${CC:-cc}; ARCH=""; [ "$(uname -m)" = x86_64 ] && ARCH="-march=native"
[ -x "$W/egdb" ] || $CC -O3 $ARCH $OMP -DNATIVE -w -o "$W/egdb" tools/egdb.c
[ -x "$W/egpack" ] || $CC -O3 $ARCH $OMP -DNATIVE -w -o "$W/egpack" tools/egpack.c
echo "OpenMP: ${OMP:-none (single-threaded)}"
[ -s "$W/egdb6.bin" ] || CKPT_DIR="$W/ckpt" NOSYM=1 "$W/egdb" 6 "$W/egdb6.bin"
[ -s "$W/egdb6.bin.gz" ] || { "$W/egpack" "$W/egdb6.bin" "$W/egdb6.ckz" 6 6 && gzip -9 -c "$W/egdb6.ckz" > "$W/egdb6.bin.gz"; }
# two copies of the engine: A (up to 5 pieces), B (+ the 6-piece file); both load the 5-piece file at every level
for s in A B; do
  rm -rf "$W/$s"; mkdir -p "$W/$s"
  cp engine.js engine.wasm engine_simd.wasm mt-helper.js evalnet.bin.gz egdb4.bin.gz egdb5.bin.gz "$W/$s/"
done
cp "$W/egdb6.bin.gz" "$W/B/"
node -e '
const fs = require("fs"), [a, b] = process.argv.slice(1);
for (const d of [a, b]) {
  let s = fs.readFileSync(d + "/engine.js", "utf8");
  s = s.replace("return (L.ms >= 1000 && !L.nk) || L.nk >= 500;", "return true;");
  if (d === b) s = s.replace("eg5P = egLoad(\x27egdb5.bin.gz\x27)", "eg5P = egLoad(\x27egdb5.bin.gz\x27).then(() => egLoad(\x27egdb6.bin.gz\x27))");
  if (!s.includes("return true;") || (d === b && !s.includes("egdb6"))) { console.error("engine.js patch failed: " + d); process.exit(1); }
  fs.writeFileSync(d + "/engine.js", s);
}' "$W/A" "$W/B"
cd "$ROOT"
node shared/tools/match.js checkers --a "200@$W/A" --b "200@$W/B" --pairs "$PAIRS" --workers "$NW" --seed 71 | tee "$W/result.txt"
