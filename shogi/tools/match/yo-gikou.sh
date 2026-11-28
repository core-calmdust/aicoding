#!/bin/bash
# Where is the gap to Gikou (技巧2)? The same match as run-gikou.sh's "FULL" one (Gikou without a depth limit, 1 thread,
# FULL ms a move), but OUR side is played by YaneuraOu's search at the same nodes a move, with
#   A (default):          OUR evaluation (the site's net, as tools/match/yo-ours.sh)  -> what the search is worth outside
#   B (MICRO=<folder>):   the net in that folder (nn.bin + progress.bin of つようら王11micro, MIT; a ruler, never shipped)
#                         -> what a strong evaluation with the same kind of input is worth
# Compare with the site's own engine at the same nodes (run-gikou.sh: -181 Elo at 2,200,000 nodes on 2026-11-19).
#   bash shogi/tools/match/yo-gikou.sh                       (A)
#   MICRO=~/Downloads/tsuyou11micro bash shogi/tools/match/yo-gikou.sh   (B; ARCH=SFNN_ka2_4096_8_64_progress8 for mini)
# Settings: NODES (2200000), FULL (5000), GAMES (4, per process), P (6), FVS (B: FV_SCALE, default the engine's 16).
# Needs Gikou from run-gikou.sh ($GW, default ~/shogi-gikou-work/gikou). A: about 2 to 4 s a move at 2,200,000 nodes.
#
# (2026-11-20) OPP=micro: the opponent is not Gikou but YaneuraOu + the net of MICRO at ONODES nodes a move (default NODES) —
# a much stronger ruler, and with the same search on both sides the difference is the evaluation alone:
#   MICRO="/Volumes/Orico A 8TB/shogi_data/TuyouraOu11micro" OPP=micro NODES=200000 bash shogi/tools/match/yo-gikou.sh
#       YaneuraOu's search + OUR evaluation  vs  YaneuraOu + micro, the same nodes  -> what the evaluation is worth
#   ... OPP=micro US=site NODES=2200000 ONODES=200000 [PARAMS="k=v,..."] ...
#       the SITE's engine (its own search and evaluation, 1 thread) vs YaneuraOu + micro
# (2026-11-24) US=kp KPNET=<a net of gtrain / trainkp, any shape>: our side is the site's search with THAT net (kptool, built
# to the net's shape by tools/nnue/build-kp.sh) — a new net against Gikou or against YaneuraOu + micro before it is shipped:
#   KPNET="/Volumes/.../g2048s.bin" US=kp OPP=micro MICRO="/Volumes/.../TuyouraOu11micro" NODES=200000 GAMES=10 P=10 bash shogi/tools/match/yo-gikou.sh
#   KPNET="/Volumes/.../g2048s.bin" US=kp NODES=2200000 GAMES=5 P=10 bash shogi/tools/match/yo-gikou.sh        (vs Gikou, 5 s a move)
# (2026-11-24) On the clock, many threads (the real conditions), two of our nets against the same strong opponent:
#   FISCHER=300000,10000 THREADS=10 GAMES=8 US=site OPP=micro MICRO="/Volumes/.../TuyouraOu11micro" bash shogi/tools/match/yo-gikou.sh                               (the site's net)
#   NET="/Volumes/.../g2048s.bin" FISCHER=300000,10000 THREADS=10 GAMES=8 US=site OPP=micro MICRO="/Volumes/.../TuyouraOu11micro" bash shogi/tools/match/yo-gikou.sh
# The net's folder may have spaces in its path (it is copied to the work folder); FV_SCALE is read from its eval_options.txt.
set -e
HERE=$(cd "$(dirname "$0")" && pwd); SHOGI=$(cd "$HERE/../.." && pwd)
NODES=${NODES:-2200000}; FULL=${FULL:-5000}; GAMES=${GAMES:-4}; P=${P:-6}; GW=${GW:-$HOME/shogi-gikou-work/gikou}
WORK=${WORK:-$HOME/shogi-yo-ours}; ARCH=${ARCH:-SFNN_ka2_2048_8_64_progress8}; mkdir -p "$WORK"
OPP=${OPP:-gikou}; US=${US:-yo}; ONODES=${ONODES:-$NODES}
[ "$OPP" = micro ] && [ -z "$MICRO" ] && { echo "OPP=micro needs MICRO=<the net's folder> on the same line"; exit 1; }
echo "(opponent: $OPP; our side: $US${KPNET:+ $KPNET}${MICRO:+; net: $MICRO})"
if [ "$US" = kp ]; then
  [ -s "$KPNET" ] || { echo "US=kp needs KPNET=<the net> on the same line"; exit 1; }
  export KPNET="$(cd "$(dirname "$KPNET")" && pwd)/$(basename "$KPNET")"
  KP=$(bash "$SHOGI/tools/nnue/build-kp.sh" "$WORK/kp" "$KPNET" | tail -1); [ -x "$KP" ] || { echo "kptool was not built"; exit 1; }
fi
[ "$OPP" = micro ] || [ -x "$GW/release" ] || { echo "Gikou is not built yet: run shogi/tools/match/run-gikou.sh once"; exit 1; }
CPU=AVX2; [ "$(uname -m)" = arm64 ] && CPU=APPLEM1
J=$(getconf _NPROCESSORS_ONLN)
build_ours() {
  YOO="$WORK/yo-ours"; REV=b3055ce46448da507af74c5d982c817ee991106c
  if [ ! -x "$YOO" ]; then
    [ -d "$WORK/src" ] || git clone -q https://github.com/yaneurao/YaneuraOu "$WORK/src"
    git -C "$WORK/src" checkout -q $REV && git -C "$WORK/src" checkout -q -- . && git -C "$WORK/src" apply "$HERE/yo-ours.patch"
    make -C "$WORK/src/source" -j"$J" TARGET_CPU=$CPU YANEURAOU_EDITION=YANEURAOU_ENGINE_MATERIAL MATERIAL_LEVEL=100 COMPILER=clang++ normal > "$WORK/build.log" 2>&1 || { tail -20 "$WORK/build.log"; exit 1; }
    cp "$WORK/src/source/YaneuraOu-by-gcc" "$YOO"
  fi
}
if [ -n "$MICRO" ]; then
  [ -s "$MICRO/nn.bin" ] || { echo "no nn.bin in $MICRO"; exit 1; }
  [ -s "$MICRO/tag.json" ] && A2=$(sed -n 's/.*"arch" *: *"\([^"]*\)".*/\1/p' "$MICRO/tag.json") && [ -n "$A2" ] && ARCH=$A2
  ED="$WORK/eval-$ARCH"; mkdir -p "$ED"; cp "$MICRO/nn.bin" "$ED/"; [ -s "$MICRO/progress.bin" ] && cp "$MICRO/progress.bin" "$ED/"
  [ -z "$FVS" ] && [ -s "$MICRO/eval_options.txt" ] && FVS=$(sed -n 's/^FV_SCALE *//p' "$MICRO/eval_options.txt" | tr -d '\r ')
  YO="$WORK/yo-$ARCH"; TAG=micro; WHAT="YaneuraOu + $(basename "$MICRO") ($ARCH)"
  if [ ! -x "$YO" ]; then
    [ -d "$WORK/src-new" ] || git clone -q --depth 1 https://github.com/yaneurao/YaneuraOu "$WORK/src-new"
    make -C "$WORK/src-new/source" clean PYTHON=python3 YANEURAOU_EDITION=YANEURAOU_ENGINE_$ARCH > /dev/null 2>&1 || true
    make -C "$WORK/src-new/source" -j"$J" normal COMPILER=clang++ TARGET_CPU=$CPU PYTHON=python3 YANEURAOU_EDITION=YANEURAOU_ENGINE_$ARCH > "$WORK/build-new.log" 2>&1 || { tail -20 "$WORK/build-new.log"; exit 1; }
    cp "$WORK/src-new/source/YaneuraOu-by-gcc" "$YO"
  fi
  UOPT="--usopt EvalDir=$ED"; [ -n "$FVS" ] && UOPT="$UOPT --usopt FV_SCALE=$FVS"
elif [ "$US" = kp ]; then
  YO="$KP"; TAG=kp; WHAT="the site's search + $(basename "$KPNET")"; UOPT=""
else
  build_ours; YO="$YOO"; TAG=ours; WHAT="YaneuraOu's search + our evaluation"; UOPT=""
fi
# the site's net: since 2026-11-27 nnue-s1280.bin.gz (SITENET=shogi/nnue.bin.gz = the 512 net before it); the build's sizes from its header
SITENET=${SITENET:-$SHOGI/nnue-s1280.bin.gz}; gzip -dc "$SITENET" > "$WORK/site.bin" 2>/dev/null || cp "$SITENET" "$WORK/site.bin"
H=$(od -An -t d4 -j 4 -N 4 "$WORK/site.bin" | tr -d ' '); NF="-DNUE_H=$H"
if [ "$(od -An -t x4 -N 4 "$WORK/site.bin" | tr -d ' ')" = 5345554e ]; then NF="$NF -DNUE_KB=1 -DNUE_MB=8 -DNUE_L1=$(od -An -t d4 -j 16 -N 4 "$WORK/site.bin" | tr -d ' ') -DNUE_L2=$(od -An -t d4 -j 20 -N 4 "$WORK/site.bin" | tr -d ' ') -DNUE_MI=$(od -An -t d4 -j 24 -N 4 "$WORK/site.bin" | tr -d ' ')"; fi
cc -O3 -DNATIVE $NF -w -o "$WORK/usimatch" "$HERE/usimatch.c"
cd "$WORK"; printf 'usi\n%sisready\nquit\n' "${ED:+setoption name EvalDir value $ED
}" | OURNET="$WORK/site.bin" "$YO" 2>/dev/null | grep -q readyok || { echo "the engine does not start: $YO"; exit 1; }
if [ "$OPP" = micro ]; then
  [ -n "$MICRO" ] || { echo "OPP=micro needs MICRO=<the net's folder>"; exit 1; }
  OYO="$YO"; OOPT=$(echo "$UOPT" | sed 's/--usopt/--opt/g')
  if [ "$US" = site ]; then WHAT="the site's engine${PARAMS:+ ($PARAMS)}"; TAG=site-micro; elif [ "$US" = kp ]; then WHAT="the site's search + $(basename "$KPNET")"; TAG=kp-micro; else build_ours; WHAT="YaneuraOu's search + our evaluation"; TAG=ours-micro; fi
  if [ -n "$FISCHER" ]; then
    # (2026-11-24) the real conditions: both on a clock (FISCHER=300000,10000 = 5 min + 10 s a move), our side the site's
    # engine on THREADS threads with NET (default the site's net; a net of gtrain in a new shape is built to its sizes),
    # YaneuraOu + micro on OTHREADS threads (default 1: against 10 of ours the score stays near the middle, so two of our
    # nets can be told apart). One game at a time; our helper threads sleep while the opponent thinks.
    THREADS=${THREADS:-10}; OTHREADS=${OTHREADS:-1}; NET=${NET:-$WORK/site.bin}
    [ -s "$NET" ] || { echo "no net: $NET"; exit 1; }
    # OLIMIT=<nodes>: the opponent also stops at that many nodes a move (10 of our threads lost to 1 of its: v7 0-6, g2048s
    # 1-8, so the score said nothing; with a limit it comes back to the middle and two of our nets can be told apart)
    OLIM=""; [ -n "$OLIMIT" ] && OLIM="--opt NodesLimit=$OLIMIT"
    CT="clock-$(basename "$NET" | sed 's/[^A-Za-z0-9]/_/g')-t$THREADS-o$OTHREADS${OLIMIT:+-n$OLIMIT}"
    # the binary and the net's copy carry the run's name: a second run started beside this one used to overwrite both (and
    # macOS kills a running program whose file is rewritten: a match stopped at game 12 that way)
    pgrep -f "usimatch-$CT " > /dev/null && { echo "this very match is already running (usimatch-$CT): stop it first (pkill -f usimatch-clock)"; exit 1; }
    cp "$NET" "$WORK/net-$CT.bin" 2>/dev/null || true; NH=$(od -An -t d4 -j 4 -N 4 "net-$CT.bin" | tr -d ' ')
    KPF=""; MAGIC=$(od -An -t x4 -N 4 "net-$CT.bin" | tr -d ' ')
    case "$MAGIC" in 4b45554e|4f45554e|4d45554e|5345554e) KPF="-DNUE_KB=$(od -An -t d4 -j 12 -N 4 "net-$CT.bin" | tr -d ' ')";; esac
    case "$MAGIC" in 4d45554e|5345554e) KPF="$KPF -DNUE_L1=$(od -An -t d4 -j 16 -N 4 "net-$CT.bin" | tr -d ' ') -DNUE_L2=$(od -An -t d4 -j 20 -N 4 "net-$CT.bin" | tr -d ' ') -DNUE_MI=$(od -An -t d4 -j 24 -N 4 "net-$CT.bin" | tr -d ' ')";; esac
    [ "$MAGIC" = 5345554e ] && KPF="$KPF -DNUE_MB=8"
    cc -O3 -DNATIVE -DMT -DSEARCH2_MT -DTTM_BITS=16 -DNUE_H=$NH $KPF -w -o "usimatch-$CT" "$HERE/usimatch.c" -lpthread
    echo "== the site's engine + $(basename "$NET") on $THREADS threads vs YaneuraOu + $(basename "$MICRO") on $OTHREADS thread(s)${OLIMIT:+, at most $OLIMIT nodes a move}, both on the clock $FISCHER: $GAMES games (while it runs: tail -f $WORK/g-$CT.log)"
    T0=$(date +%s)
    "./usimatch-$CT" "net-$CT.bin" 1000000 "$OYO" "$WORK" $GAMES --opt BookFile=no_book --opt USI_Hash=1024 --opt Threads=$OTHREADS --opt NetworkDelay=0 --opt NetworkDelay2=0 $OLIM $OOPT \
      --openings "$HERE/openings.txt" --fischer $FISCHER --threads $THREADS > "g-$CT.log" 2>&1 || true
    grep "total" "g-$CT.log" | tail -1 | sed "s|^|$(basename "$NET") ($THREADS threads) vs YaneuraOu + $(basename "$MICRO") ($OTHREADS): |"; echo "($(( ($(date +%s) - T0) / 60 )) minutes; log: $WORK/g-$CT.log)"; exit 0
  fi
  echo "== $WHAT, $NODES nodes a move, vs YaneuraOu + $(basename "$MICRO"), $ONODES nodes a move: $P processes x $GAMES games"
  T0=$(date +%s); i=1
  while [ $i -le $P ]; do
    R=$(( (i - 1) * 7 % 100 )); tail -n +$(( R + 1 )) "$HERE/openings.txt" > "g-op-$i.txt"; if [ $R -gt 0 ]; then head -n $R "$HERE/openings.txt" >> "g-op-$i.txt"; fi
    if [ "$US" = site ]; then USARG=""; elif [ "$US" = kp ]; then USARG="--us $KP $WORK --usopt Nodes=$NODES"; else USARG="--us $YOO $WORK --usopt BookFile=no_book --usopt USI_Hash=256 --usopt Threads=1 --usopt NodesLimit=$NODES --usopt NetworkDelay=0 --usopt NetworkDelay2=0"; fi
    OURNET="$WORK/site.bin" OURSCALE=${OURSCALE:-100} ./usimatch site.bin $NODES "$OYO" "$WORK" $GAMES --opt BookFile=no_book --opt USI_Hash=256 --opt Threads=1 --opt NodesLimit=$ONODES \
      --opt NetworkDelay=0 --opt NetworkDelay2=0 $OOPT --openings "g-op-$i.txt" --byoyomi 60000 $USARG > "g-$TAG-$i.log" 2>&1 &
    i=$((i + 1))
  done
  wait
  for f in g-$TAG-*.log; do grep "total" "$f" | tail -1; done | sed 's/.*total +\([0-9]*\) -\([0-9]*\) =\([0-9]*\).*/\1 \2 \3/' | awk -v l="$WHAT ($NODES nodes) vs YaneuraOu + $(basename "$MICRO") ($ONODES nodes)" -v m=$(( ($(date +%s) - T0) / 60 )) '
    { w += $1; lo += $2; d += $3 }
    END { n = w + lo + d; if (!n) { print "no games finished"; exit 1 } s = (w + d / 2) / n; c = s; if (c < 0.01) c = 0.01; if (c > 0.99) c = 0.99;
          printf "%s: +%d -%d =%d  score %.3f  Elo %+.0f  (%d minutes)\n", l, w, lo, d, s, -400 * log(1 / c - 1) / log(10), m }'
  echo "(logs: $WORK/g-$TAG-*.log)"; exit 0
fi
echo "== $WHAT, $NODES nodes a move, vs Gikou ($FULL ms a move): $P processes x $GAMES games"
T0=$(date +%s); i=1
while [ $i -le $P ]; do
  R=$(( (i - 1) * 7 % 100 )); tail -n +$(( R + 1 )) "$HERE/openings.txt" > "g-op-$i.txt"; [ $R -gt 0 ] && head -n $R "$HERE/openings.txt" >> "g-op-$i.txt"
  OURNET="$WORK/site.bin" OURSCALE=${OURSCALE:-100} ./usimatch site.bin 0 "$GW/release" "$GW" $GAMES --opt Threads=1 --opt USI_Hash=256 --opt OwnBook=false --opt USI_Ponder=false \
    --openings "g-op-$i.txt" --byoyomi $FULL --us "$YO" "$WORK" $( [ "$US" = kp ] && echo "--usopt Nodes=$NODES" || echo "--usopt BookFile=no_book --usopt USI_Hash=256 --usopt Threads=1 --usopt NodesLimit=$NODES --usopt NetworkDelay=0 --usopt NetworkDelay2=0" ) $UOPT > "g-$TAG-$i.log" 2>&1 &
  i=$((i + 1))
done
wait
for f in g-$TAG-*.log; do grep "total" "$f" | tail -1; done | sed 's/.*total +\([0-9]*\) -\([0-9]*\) =\([0-9]*\).*/\1 \2 \3/' | awk -v l="$WHAT, $NODES nodes" -v m=$(( ($(date +%s) - T0) / 60 )) '
  { w += $1; lo += $2; d += $3 }
  END { n = w + lo + d; if (!n) { print "no games finished"; exit 1 } s = (w + d / 2) / n; c = s; if (c < 0.01) c = 0.01; if (c > 0.99) c = 0.99;
        printf "%s vs Gikou: +%d -%d =%d  score %.3f  Elo %+.0f  (%d minutes)\n", l, w, lo, d, s, -400 * log(1 / c - 1) / log(10), m }'
echo "(logs: $WORK/g-$TAG-*.log)"
