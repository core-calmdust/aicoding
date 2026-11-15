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
if [ ! -x "$DL/venv/bin/python" ]; then
  echo "== Python environment in $DL/venv"
  python3 -m venv "$DL/venv"
  "$DL/venv/bin/pip" install -q --upgrade pip
  "$DL/venv/bin/pip" install -q numpy onnxruntime cshogi
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
