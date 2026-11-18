#!/bin/sh
# The site's Go AI against KataGo at 1, 2, 4, 8 … visits (19x19, Chinese rules, komi 7.5) — where its strength sits on KataGo's scale.
# Run on a Mac with KataGo installed (brew install katago) and a KataGo net (e.g. kata1-b18c384nbt-….bin.gz from
# https://katagotraining.org/networks/):
#   sh go/tools/katago-ladder.sh <katago net .bin.gz> [our net: strong|xl] [our visits] [games each] [parallel] [KataGo visits…]
#   e.g.  sh go/tools/katago-ladder.sh ~/katago/b18.bin.gz xl 256 8 6 1 2 4 8 16
# Our side: PRO's fixed-visit search on one thread (Node, the page's engine.js — the CPU; the GPU's speed only changes how many
# visits fit in a move's time). KataGo: one search thread, maxVisits = each value. The results go to go/tools/katago-ladder.txt.
set -e
cd "$(dirname "$0")/.."
MODEL=${1:?katago net}; NET=${2:-xl}; VIS=${3:-256}; GAMES=${4:-8}; PAR=${5:-6}; shift 5 2>/dev/null || shift $#
KV=${*:-1 2 4 8 16}
KATAGO=${KATAGO:-katago}
CFG="${TMPDIR:-/tmp}/kgcfg.$$.cfg"
cat > "$CFG" <<EOF
logToStderr = false
logAllGTPCommunication = false
logSearchInfo = false
ponderingEnabled = false
rules = chinese
numSearchThreads = 1
resignThreshold = -0.99
resignConsecTurns = 6
allowResignation = true
EOF
OUT=tools/katago-ladder.txt
echo "# $(date) — ours: $NET $VIS visits; KataGo: $MODEL" >> $OUT
for kv in $KV; do
  per=$(( (GAMES + PAR - 1) / PAR ))
  i=0; pids=""; rm -f /tmp/kgl.$kv.*
  while [ $i -lt $PAR ]; do
    AI_NET=$NET AI_VISITS=$VIS GTP_CMD="$KATAGO gtp -model $MODEL -config $CFG -override-config maxVisits=$kv" \
      node tools/vs-gnugo.mjs 0 $per 19 > /tmp/kgl.$kv.$i 2>/dev/null &
    pids="$pids $!"; i=$((i + 1))
  done
  wait $pids
  cat /tmp/kgl.$kv.* | node -e "
    let w = 0, n = 0; for (const l of require('fs').readFileSync(0, 'utf8').trim().split('\n')) { try { const j = JSON.parse(l); w += j.won; n += j.games; } catch (e) {} }
    const p = (w + 0.5) / (n + 1), elo = -400 * Math.log10(1 / p - 1);
    console.log('KataGo ' + $kv + ' visits: ours ' + w + '/' + n + ' (Elo ' + (elo >= 0 ? '+' : '') + Math.round(elo) + ')');" | tee -a $OUT
done
rm -f "$CFG"
