#!/bin/sh
# Build the native tools into $W/: ck-native (self-play, matches, checks) and ck-egdb (endgame database builder).
# macOS: Apple clang has no OpenMP; with Homebrew's libomp (brew install libomp) ck-egdb uses every core, otherwise one.
set -e
cd "$(dirname "$0")/../.."
W=${WORK:-nnwork}; mkdir -p $W
CC=${CC:-cc}
case "$(uname -m)" in arm64|aarch64) OPT="-O3 -mcpu=native" ;; *) OPT="-O3 -march=native" ;; esac
echo 'int main(void) { return 0; }' > $W/t.c
$CC $OPT -o $W/t $W/t.c 2>/dev/null || OPT="-O3"
$CC $OPT -DNATIVE -w -o $W/ck-native tools/native.c -lm
OMP=""; MODE="single-threaded"
printf '#include <omp.h>\nint main(void) { return omp_get_max_threads(); }\n' > $W/t.c
if $CC -fopenmp -o $W/t $W/t.c 2>/dev/null; then OMP="-fopenmp"
elif command -v brew >/dev/null && [ -d "$(brew --prefix libomp 2>/dev/null)" ]; then
  L=$(brew --prefix libomp); OMP="-Xpreprocessor -fopenmp -I$L/include -L$L/lib -lomp"
fi
[ -n "$OMP" ] && MODE="OpenMP"
$CC $OPT $OMP -DNATIVE -w -o $W/ck-egdb tools/egdb.c -lm
rm -f $W/t $W/t.c
echo "built $W/ck-native, $W/ck-egdb ($MODE) with $CC $OPT"
