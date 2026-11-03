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
    curl -fL -C - --retry 5 -o "$out" "$url" || curl -fL --retry 5 -o "$out" "$url"
  fi
  i=$((i+1))
done < files.txt
echo "validation set (Suisho5 depth 9)"
curl -fL -C - --retry 5 -o val.bin "https://huggingface.co/datasets/nodchip/shogi_suisho5_depth9/resolve/main/shuffled.bin" || true
du -sh raw val.bin
