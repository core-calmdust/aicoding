#!/bin/bash
# Relabel training positions with a dlshogi-type model's value (the teacher; tools/nnue/dlrelabel.py), on the Mac's GPU / Neural Engine.
#   bash tools/nnue/dlrelabel.sh <in.bin> <out.bin> [positions (default: all)]
# First run: makes a Python environment in $DL (default ~/shogi-dl) and downloads the free GCT model (dlshogi's WCSC31 release, 67 MB zip).
# MODEL=<file.onnx> uses another model. BATCH (1024), PROVIDER (coreml on a Mac, else cpu), WORKERS (half the cores).
# Resumable: the same command continues after what is already in <out.bin>. Stop with Ctrl+C at any time.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
IN=${1:?usage: dlrelabel.sh <in.bin> <out.bin> [positions]}; OUT=${2:?usage: dlrelabel.sh <in.bin> <out.bin> [positions]}; N=${3:-0}
DL=${DL:-$HOME/shogi-dl}; mkdir -p "$DL"
# onnxruntime has no package for the very newest Python: try the Pythons on this Mac in turn until one installs (PYTHON=<path> picks one)
if [ ! -f "$DL/venv/.ok" ]; then
  for PY in $PYTHON python3.13 python3.12 python3.11 python3.10 /usr/bin/python3 python3; do
    command -v "$PY" > /dev/null 2>&1 || continue
    echo "== Python environment in $DL/venv ($PY: $("$PY" -V 2>&1))"
    rm -rf "$DL/venv"; "$PY" -m venv "$DL/venv" || continue
    "$DL/venv/bin/pip" install -q --upgrade pip > /dev/null 2>&1 || true
    if "$DL/venv/bin/pip" install -q numpy onnxruntime cshogi > "$DL/pip.log" 2>&1; then touch "$DL/venv/.ok"; break; fi
    echo "   (no packages for this Python, trying the next one)"
  done
  if [ ! -f "$DL/venv/.ok" ]; then
    echo "No Python here can install onnxruntime (details: $DL/pip.log). Install Python 3.12: brew install python@3.12   (or from https://www.python.org/downloads/), then run this again."; exit 1
  fi
fi
MODEL=${MODEL:-$DL/model-0000225kai.onnx}
if [ ! -s "$MODEL" ]; then
  echo "== download the GCT model (dlshogi WCSC31 release)"
  curl -L --fail --retry 5 -C - -o "$DL/gct.zip" https://github.com/TadaoYamaoka/DeepLearningShogi/releases/download/wcwc31/dlshogi_with_gct_wcsc31.zip
  unzip -o -q -j "$DL/gct.zip" 'model-0000225kai.onnx' -d "$DL" && rm -f "$DL/gct.zip"
fi
OPT=""; [ -n "$BATCH" ] && OPT="$OPT --batch $BATCH"; [ -n "$PROVIDER" ] && OPT="$OPT --provider $PROVIDER"; [ -n "$WORKERS" ] && OPT="$OPT --workers $WORKERS"
[ "$N" != 0 ] && OPT="$OPT --limit $N"
exec "$DL/venv/bin/python" "$HERE/dlrelabel.py" "$IN" "$OUT" --model "$MODEL" $OPT
