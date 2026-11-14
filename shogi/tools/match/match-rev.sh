#!/bin/bash
# The engine as it is now (engine.c in this folder) vs the engine of an earlier commit, the same net on both sides:
# what a change to the search is worth. P matches at once, openings from openings.txt, colours swapped in pairs.
#   bash tools/match/match-rev.sh <git rev of the old engine> [nodes per move | Nms] [games per process] [processes]
#   e.g. bash tools/match/match-rev.sh origin/main~1 300000 20          (same nodes: 300 thousand per move)
#        bash tools/match/match-rev.sh 1a2b3c4 1000ms 20 6              (same time: fewer processes, so the cores are free)
# NET (default shogi/nnue.bin.gz) = the net of both, WORK (default ~/shogi-rev-work) = where the programs are built.
# The old engine is built from `git show <rev>:shogi/engine.c` with today's tools (tools/nnue/kptool.c, the USI side).
set -e
HERE=$(cd "$(dirname "$0")" && pwd); SHOGI=$(cd "$HERE/../.." && pwd)
REV=${1:?usage: match-rev.sh <git rev> [nodes | Nms] [games per process] [processes]}; L=${2:-300000}; G=${3:-20}; P=${4:-$(( $(getconf _NPROCESSORS_ONLN) - 1 ))}
WORK=${WORK:-$HOME/shogi-rev-work}; mkdir -p "$WORK/old"
NET=${NET:-$SHOGI/nnue.bin.gz}; gzip -dc "$NET" > "$WORK/net.bin" 2>/dev/null || cp "$NET" "$WORK/net.bin"
H=$(od -An -tu4 -j4 -N4 "$WORK/net.bin" | tr -d ' ')
git -C "$SHOGI" show "$REV:shogi/engine.c" > "$WORK/old/engine.c"
# the old engine: today's usimatch.c / kptool.c with the old engine.c in place of ../../engine.c
sed "s|#include \"../../engine.c\"|#include \"$WORK/old/engine.c\"|" "$HERE/usimatch.c" > "$WORK/old/usimatch.c"
sed -e "s|#include \"../match/usimatch.c\"|#include \"$WORK/old/usimatch.c\"|" -e "s|#include \"psv.h\"|#include \"$SHOGI/tools/nnue/psv.h\"|" "$SHOGI/tools/nnue/kptool.c" > "$WORK/old/kptool.c"
cc -O3 -DNATIVE -DNUE_KB=1 -DNUE_H=$H -w -o "$WORK/old/kptool" "$WORK/old/kptool.c"
cc -O3 -DNATIVE -DNUE_H=$H -w -o "$WORK/usimatch" "$HERE/usimatch.c"
printf '#!/bin/bash\nKPNET="%s" exec "%s"\n' "$WORK/net.bin" "$WORK/old/kptool" > "$WORK/old/release"; chmod +x "$WORK/old/release"
case $L in *ms) OPT="TimeMs=${L%ms}" ;; *) OPT="Nodes=$L" ;; esac
T=$(mktemp -d)
i=1
while [ $i -le $P ]; do
  R=$(( (i - 1) * G / 2 % 100 ))   # each process its own share of the openings (macOS head refuses -n 0)
  tail -n +$(( R + 1 )) "$HERE/openings.txt" > "$T/op-$i.txt"; if [ $R -gt 0 ]; then head -n $R "$HERE/openings.txt" >> "$T/op-$i.txt"; fi
  "$WORK/usimatch" "$WORK/net.bin" "$L" "$WORK/old/release" "$WORK/old" "$G" --opt "$OPT" --openings "$T/op-$i.txt" > "$T/m-$i.txt" 2>&1 &
  i=$((i + 1))
done
wait
for f in "$T"/m-*.txt; do grep "total" "$f" | tail -1; done | sed 's/.*total +\([0-9]*\) -\([0-9]*\) =\([0-9]*\).*/\1 \2 \3/' | awk -v l="$L" -v r="$REV" '
  { w += $1; lo_ += $2; d += $3 }
  END { n = w + lo_ + d; if (!n) { print "no games finished"; exit 1 } s = (w + d / 2) / n;
        v = (w * (1 - s) ^ 2 + lo_ * s ^ 2 + d * (0.5 - s) ^ 2) / n; e = 1.96 * sqrt(v / n);
        lo = s - e; hi = s + e; if (lo < 0.001) lo = 0.001; if (lo > 0.999) lo = 0.999; if (hi < 0.001) hi = 0.001; if (hi > 0.999) hi = 0.999; ss = s; if (ss < 0.001) ss = 0.001; if (ss > 0.999) ss = 0.999;
        printf "now vs %s (%s): +%d -%d =%d  score %.3f  Elo %+.0f (%+.0f .. %+.0f)\n", r, l, w, lo_, d, s,
          -400 * log(1 / ss - 1) / log(10), -400 * log(1 / lo - 1) / log(10), -400 * log(1 / hi - 1) / log(10) }'
rm -rf "$T"
