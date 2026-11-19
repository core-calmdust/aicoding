#!/bin/bash
# Download a WHOLE training data set (MIT licensed, YaneuraOu PackedSfenValue, 40 bytes a position) to a big disk:
#   WORK="/Volumes/Orico A 8TB/shogi_data" bash shogi/tools/nnue/fetch-all.sh
# REPO (default nodchip/tanuki-.nnue-pytorch-2024-07-30.1: depth 9, about 8 billion positions, about 320 GB),
# P (downloads at a time, default 4), MAX (stop after this many files, default all).
# Files go to $WORK/<repo name>/NNNN.bin (the list with the original names: files.txt). Run again to continue: finished
# files are skipped (their size is checked against the server's), broken ones continue from where they stopped.
set -e
WORK=${WORK:-$HOME/shogi_data}; REPO=${REPO:-nodchip/tanuki-.nnue-pytorch-2024-07-30.1}; P=${P:-4}; MAX=${MAX:-0}
DIR="$WORK/$(basename "$REPO")"; mkdir -p "$DIR"; cd "$DIR"
# the list of files with sizes (the API gives 1000 a page: follow the "next" links)
python3 - "$REPO" > files.txt <<'EOF'
import sys, json, re, urllib.request
url = f'https://huggingface.co/api/datasets/{sys.argv[1]}/tree/main?limit=1000'
out = []
while url:
    with urllib.request.urlopen(url, timeout=60) as r:
        out += [(x['path'], x['size']) for x in json.load(r) if x.get('type') == 'file' and x['path'].endswith('.bin')]
        m = re.search(r'<([^>]+)>;\s*rel="next"', r.headers.get('Link') or '')
        url = m.group(1) if m else None
for p, s in sorted(out): print(s, p)
EOF
TOTAL=$(wc -l < files.txt | tr -d ' ')
awk '{ s += $1 } END { printf "%d files, %.0f GB, about %.1f billion positions\n", NR, s / 1e9, s / 40e9 }' files.txt
[ "$MAX" -gt 0 ] && head -n "$MAX" files.txt > files.use || cp files.txt files.use
one() {   # $1 = number, $2 = size, $3 = path
  out=$(printf '%04d.bin' "$1")
  have=$(stat -f %z "$out" 2>/dev/null || stat -c %s "$out" 2>/dev/null || echo 0)
  [ "$have" = "$2" ] && return 0
  [ "$have" -gt "$2" ] && : > "$out"
  url="https://huggingface.co/datasets/$REPO/resolve/main/$(echo "$3" | sed 's/=/%3D/g')"
  t=0
  until curl -sSfL -C - --http1.1 --retry 5 -o "$out" "$url"; do
    t=$((t + 1)); [ $t -ge 30 ] && { echo "failed: $out (run the same command again)"; return 0; }
    sleep 3
  done
  echo "$out done ($1 / $TOTAL)"
}
export -f one; export REPO TOTAL
nl -ba files.use | awk '{ print $1, $2, $3 }' | xargs -P "$P" -L 1 bash -c 'one "$0" "$1" "$2"'
N=$(ls [0-9]*.bin 2>/dev/null | wc -l | tr -d ' '); echo "$N files here:"; du -sh .
