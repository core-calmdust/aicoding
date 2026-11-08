#!/bin/bash
# Measure the site's shogi AI against Gikou (技巧2, GPL-3.0; used only here as a ruler, nothing of it goes into the site).
# Gikou's README: DepthLimit 1–5 ≈ Shogi Club 24 8級 / 5級 / 2級 / 初段 / 二段.
#   bash shogi/tools/match/run-gikou.sh
# Settings: NET (default shogi/nnue.bin.gz of the repo), NODES (our nodes per move, default 1500000 = 四段, the strongest),
#   DEPTHS (Gikou depth limits, default "5 6 7"), GAMES (per depth, default 40), WORK (default ~/shogi-gikou-work)
set -e
HERE=$(cd "$(dirname "$0")" && pwd); REPO=$(cd "$HERE/../../.." && pwd)
WORK=${WORK:-$HOME/shogi-gikou-work}; NODES=${NODES:-1500000}; DEPTHS=${DEPTHS:-"5 6 7"}; GAMES=${GAMES:-40}
NET=${NET:-$REPO/shogi/nnue.bin.gz}
mkdir -p "$WORK"; cd "$WORK"
gunzip -c "$NET" > net.bin 2>/dev/null || cp "$NET" net.bin
H=$(od -An -t d4 -j 4 -N 4 net.bin | tr -d ' ')
echo "== build the site's engine (net: $NET, hidden $H)"
cc -O3 -DNATIVE -DNUE_H=$H -w -o usimatch "$HERE/usimatch.c"

if [ ! -x gikou/release ] || [ ! -f gikou/.build3 ]; then
  echo "== Gikou"
  [ -d gikou-src ] || git clone --depth 1 https://github.com/gikou-official/Gikou.git gikou-src
  # Gikou uses SSE4.2 (Intel): on Apple silicon it is built for x86_64 and runs under Rosetta
  ARCH=""; if [ "$(uname -m)" = arm64 ]; then
    arch -x86_64 /usr/bin/true 2>/dev/null || { echo "Rosetta is needed: run  softwareupdate --install-rosetta --agree-to-license  and try again"; exit 1; }
    ARCH="-arch x86_64"
  fi
  mkdir -p shim; printf '#pragma once\nstatic inline int omp_get_thread_num(void){return 0;}\nstatic inline void omp_set_num_threads(int n){(void)n;}\n' > shim/omp.h
  # crash fixes (positions with no legal move / a cache-key collision made Gikou read past an array and die mid-game)
  ( cd gikou-src && git checkout -q -- src/move_probability.cc 2>/dev/null; perl -0pi -e 's/(std::valarray<double> temp = std::exp\(x - x\.max\(\)\);)/if (x.size() == 0) return std::valarray<double>();\n    $1/g; s/if \(entry != nullptr\) \{/if (entry != nullptr && entry->data.size() == legal_moves.size()) {/' src/move_probability.cc )
  ( cd gikou-src && sed -e 's/ -fopenmp//' -e 's/^CXX *=.*/CXX = clang++ '"$ARCH"'/' -e 's/^INCLUDES *=.*/INCLUDES = -I..\/shim/' -e 's/-O3 -DNDEBUG$/-O2 -DNDEBUG -fno-strict-aliasing -fwrapv/' Makefile > Makefile.mac && rm -rf obj bin \
    && make -f Makefile.mac TARGET=release executable > ../gikou-build.log 2>&1 ) || { echo "Gikou build failed; last lines of $WORK/gikou-build.log:"; tail -30 gikou-build.log; exit 1; }
  mkdir -p gikou && cp gikou-src/bin/release gikou/release && touch gikou/.build3
fi
if [ ! -s gikou/params.bin ]; then
  echo "== Gikou evaluation files"
  [ -s gikou.zip ] || {
  URL=$(curl -sSfL https://api.github.com/repos/gikou-official/Gikou/releases | grep -o '"browser_download_url": *"[^"]*\.zip"' | head -1 | sed 's/.*"\(http[^"]*\)"/\1/')
  [ -n "$URL" ] || { echo "release zip not found: download the latest zip from https://github.com/gikou-official/Gikou/releases and unzip its .bin files into $WORK/gikou"; exit 1; }
  curl -fL --retry 5 -o gikou.zip "$URL"; }
  # only the engine's files (the zip also has strategy books in folders with Japanese names, which unzip cannot create here)
  unzip -j -o -q gikou.zip '*params.bin' '*probability.bin' '*progress.bin' '*book.bin' -d gikou 2>/dev/null || true
  [ -s gikou/params.bin ] || { echo "params.bin not found in the zip"; unzip -l gikou.zip | head -30; exit 1; }
fi
printf 'usi\nisready\nquit\n' | (cd gikou && ./release) 2>/dev/null | grep -q readyok || { echo "Gikou does not start"; exit 1; }
# sanity check: after 7g7f 3c3d (Black to move) Gikou must answer with a Black move
R=$( (printf 'usi\nsetoption name OwnBook value false\nsetoption name Threads value 1\nsetoption name DepthLimit value 3\nisready\nusinewgame\nposition startpos moves 7g7f 3c3d\ngo btime 0 wtime 0 byoyomi 5000\n'; sleep 8; echo quit) | (cd gikou && ./release) 2>/dev/null | grep bestmove | head -1)
echo "Gikou check (after 7g7f 3c3d): $R"
# a short real match (our engine vs Gikou depth 2): every Gikou move must be legal
./usimatch net.bin 3000 "$WORK/gikou/release" "$WORK/gikou" 4 --opt DepthLimit=2 --opt Threads=1 --opt OwnBook=false --opt USI_Ponder=false --openings "$HERE/openings.txt" --byoyomi 10000 > check.log 2>&1 || true
if grep -q "illegal\|stopped" check.log || ! grep -q "game 4" check.log; then echo "Gikou plays wrong moves in a real game:"; cat check.log; exit 1; fi
echo "Gikou OK"

echo "== matches: our $NODES nodes per move vs Gikou depth $DEPTHS, $GAMES games each (running in parallel)"
for D in $DEPTHS; do
  ./usimatch net.bin $NODES "$WORK/gikou/release" "$WORK/gikou" $GAMES --opt DepthLimit=$D --opt Threads=1 --opt USI_Hash=256 --opt OwnBook=false --opt USI_Ponder=false \
    --openings "$HERE/openings.txt" --byoyomi 30000 > "match-n$NODES-d$D.log" 2>&1 &
done
wait
echo
for D in $DEPTHS; do printf 'Gikou depth %s: ' $D; tail -1 "match-n$NODES-d$D.log"; done
echo "(logs: $WORK/match-n$NODES-d*.log)"
