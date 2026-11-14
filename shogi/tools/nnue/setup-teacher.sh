#!/bin/bash
# The teacher for relabelling (tools/nnue/relabel.sh): YaneuraOu (GPL, used here only as a program that scores positions;
# nothing of it goes on the site) built from source for this machine, in TEACHER (default ~/shogi-teacher).
#   bash tools/nnue/setup-teacher.sh
# Then put a standard NNUE evaluation file (HalfKP 256x2-32-32, e.g. Hao = tanuki-.halfkp_256x2-32-32.2023-05-08, or
# Suisho5) at ~/shogi-teacher/eval/nn.bin and run this again: it checks that the engine answers and searches.
set -e
T=${TEACHER:-$HOME/shogi-teacher}; mkdir -p "$T/eval"
if [ ! -x "$T/YaneuraOu-by-gcc" ]; then
  [ -d "$T/src" ] || git clone --depth 1 https://github.com/yaneurao/YaneuraOu "$T/src"
  case "$(uname -s) $(uname -m)" in
    "Darwin arm64") CPU=APPLEM1; CXX=clang++ ;;
    "Darwin x86_64") CPU=APPLEAVX2; CXX=clang++ ;;
    *) CPU=AVX2; CXX=g++ ;;
  esac
  echo "== building YaneuraOu ($CPU, a few minutes)"
  make -C "$T/src/source" -j"$(getconf _NPROCESSORS_ONLN)" TARGET_CPU=$CPU YANEURAOU_EDITION=YANEURAOU_ENGINE_NNUE COMPILER=$CXX normal > "$T/build.log" 2>&1 || { tail -20 "$T/build.log"; echo "build failed (the whole log: $T/build.log)"; exit 1; }
  cp "$T/src/source/YaneuraOu-by-gcc" "$T/YaneuraOu-by-gcc"
fi
echo "engine: $T/YaneuraOu-by-gcc"
if [ ! -s "$T/eval/nn.bin" ]; then
  echo "next: put the teacher's evaluation file at $T/eval/nn.bin (about 60 MB), then run this script again"
  exit 0
fi
echo "== check (the start position, depth 12)"
OUT=$(cd "$T" && { printf 'usi\nsetoption name BookFile value no_book\nsetoption name Threads value 1\nisready\nposition startpos\ngo depth 12\n'; sleep 8; printf 'quit\n'; } | ./YaneuraOu-by-gcc 2>&1)
echo "$OUT" | grep -q readyok || { echo "$OUT" | tail -5; echo "the engine did not get ready: is eval/nn.bin a HalfKP 256x2-32-32 file?"; exit 1; }
echo "$OUT" | grep "^info depth" | tail -1 | cut -c1-120
echo "$OUT" | grep "^bestmove" | tail -1
echo "teacher ready"
