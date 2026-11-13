#!/bin/bash
# Download training data (MIT licensed) into $WORK:
#   - COUNT files of nodchip/tanuki-.nnue-pytorch-2024-07-30.1 (depth 9, ~0.31 GB / ~7.8M positions each)
#   - nodchip/shogi_suisho5_depth9 shuffled.bin (Suisho5 depth 9, 7.2M positions) as the validation set
# ROUND=2,3,... picks a different set of files (for further training rounds).
# Re-running resumes unfinished downloads and skips finished ones.
set -e
WORK=${WORK:-$HOME/shogi-nnue-work}; COUNT=${COUNT:-30}; ROUND=${ROUND:-1}
mkdir -p "$WORK/raw"; cd "$WORK"
REPO=nodchip/tanuki-.nnue-pytorch-2024-07-30.1
# one file: a broken connection (curl 92 / 18 / 56, HTTP/2 stream cancelled...) continues from where it stopped, up to 30 times
get() {
  local t=0
  until curl -fL -C - --http1.1 --retry 5 -o "$1" "$2"; do
    rc=$?; t=$((t+1))
    [ $rc -eq 33 ] || [ $rc -eq 22 ] && { [ $t -ge 3 ] && rm -f "$1"; }   # the server refused the range: after 3 tries start this file over
    [ $t -ge 30 ] && { echo "download failed: $2 (run the same command again to continue)"; return 1; }
    echo "  connection broken (curl $rc), continuing ($t/30)"; sleep 3
  done
}
curl -sSfL "https://huggingface.co/api/datasets/$REPO/tree/main" | grep -o '"path":"[^"]*\.bin"' | sed 's/"path":"//;s/"$//' | sort > files.txt
TOTAL=$(wc -l < files.txt | tr -d ' ')
echo "tanuki- dataset: $TOTAL files, taking $COUNT spread across it"
STEP=$(( TOTAL / COUNT )); [ $STEP -lt 1 ] && STEP=1
i=0; n=0
while read -r f; do
  if [ $(( (i + ROUND - 1) % STEP )) -eq 0 ] && [ $n -lt $COUNT ]; then
    n=$((n+1)); out="raw/$(printf '%03d' $n).bin"
    echo "[$n/$COUNT] $f"
    url="https://huggingface.co/datasets/$REPO/resolve/main/$(echo "$f" | sed 's/=/%3D/g')"
    get "$out" "$url"
  fi
  i=$((i+1))
done < files.txt
echo "validation set (Suisho5 depth 9)"
get val.bin "https://huggingface.co/datasets/nodchip/shogi_suisho5_depth9/resolve/main/shuffled.bin" || true
du -sh raw val.bin
