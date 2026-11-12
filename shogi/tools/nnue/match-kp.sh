#!/bin/bash
# A HalfKP net (kptool, USI) vs the current site net (usimatch), P matches at once, openings from tools/match/openings.txt,
# colours swapped in pairs. Prints the HalfKP net's result, score and Elo (95% range).
#   bash tools/nnue/match-kp.sh <kp net> [nodes per move | Nms] [games per process] [processes]
#   e.g. bash tools/nnue/match-kp.sh ~/shogi-kp-work/kp.bin 30000 20 12      (same nodes)
#        bash tools/nnue/match-kp.sh ~/shogi-kp-work/kp.bin 300ms 20 12      (same time: the HalfKP net is a little slower)
# CUR (default shogi/nnue.bin.gz) = the opponent net, WORK (default ~/shogi-kp-work) = where the programs are built.
set -e
HERE=$(cd "$(dirname "$0")" && pwd); SHOGI=$(cd "$HERE/../.." && pwd)
NET=$(cd "$(dirname "$1")" && pwd)/$(basename "$1"); L=${2:-30000}; G=${3:-20}; P=${4:-$(( $(getconf _NPROCESSORS_ONLN) - 1 ))}
WORK=${WORK:-$HOME/shogi-kp-work}; mkdir -p "$WORK"
KP=$(bash "$HERE/build-kp.sh" "$WORK" "$NET" | tail -1)
CUR=${CUR:-$SHOGI/nnue.bin.gz}; gzip -dc "$CUR" > "$WORK/cur.bin" 2>/dev/null || cp "$CUR" "$WORK/cur.bin"
case $L in *ms) OPT="TimeMs=${L%ms}" ;; *) OPT="Nodes=$L" ;; esac
T=$(mktemp -d)
i=1
while [ $i -le $P ]; do
  # each process its own share of the openings (--openings is read from the start; a rotated copy per process)
  # (macOS head refuses -n 0, which stopped the whole script under set -e for the first process: only call it for a positive count)
  R=$(( (i - 1) * G / 2 % 100 ))
  tail -n +$(( R + 1 )) "$SHOGI/tools/match/openings.txt" > "$T/op-$i.txt"; if [ $R -gt 0 ]; then head -n $R "$SHOGI/tools/match/openings.txt" >> "$T/op-$i.txt"; fi
  KPNET="$NET" "$WORK/usimatch" "$WORK/cur.bin" "$L" "$KP" "$WORK" "$G" --opt "$OPT" --openings "$T/op-$i.txt" > "$T/m-$i.txt" 2>&1 &
  i=$((i + 1))
done
wait
for f in "$T"/m-*.txt; do grep "total" "$f" | tail -1; done | sed 's/.*total +\([0-9]*\) -\([0-9]*\) =\([0-9]*\).*/\1 \2 \3/' | awk -v l="$L" '
  { cw += $1; kw += $2; d += $3 }      # usimatch counts for the current net: its losses are the HalfKP net wins
  END { n = cw + kw + d; if (!n) { print "no games finished"; exit 1 } s = (kw + d / 2) / n;
        v = (kw * (1 - s) ^ 2 + cw * s ^ 2 + d * (0.5 - s) ^ 2) / n; e = 1.96 * sqrt(v / n);
        lo = s - e; hi = s + e; if (lo < 0.001) lo = 0.001; if (lo > 0.999) lo = 0.999; if (hi < 0.001) hi = 0.001; if (hi > 0.999) hi = 0.999; ss = s; if (ss < 0.001) ss = 0.001; if (ss > 0.999) ss = 0.999;
        printf "HalfKP vs current (%s): +%d -%d =%d  score %.3f  Elo %+.0f (%+.0f .. %+.0f)\n", l, kw, cw, d, s,
          -400 * log(1 / ss - 1) / log(10), -400 * log(1 / lo - 1) / log(10), -400 * log(1 / hi - 1) / log(10) }'
rm -rf "$T"
