#!/bin/bash
# 複数ゲームの学習（各ゲームの tools/nnue/run.sh）を順番にまとめて回す（Mac 用）。
#
#   bash tools/nnue-batch.sh                         # 既定の7本を順に
#   bash tools/nnue-batch.sh ugolki konane           # 指定したゲームだけ
#   ROOT="/Volumes/Orico A 8TB/nnue" bash tools/nnue-batch.sh   # 作業フォルダをまとめて外付けに
#   ROUNDS=2 bash tools/nnue-batch.sh                # 各ゲーム2周（各 run.sh にそのまま渡す）
#
# - 1本が失敗しても次のゲームへ進む。止めても、もう一度実行すれば各 run.sh が続きから再開する。
# - ログは $ROOT（既定 ~/nnue-batch）/batch.log。最後に各ゲームの adopt/ の有無を一覧にする。
# - 終わったら、各ゲームの作業フォルダの adopt/ と報告ファイルを Claude に渡す。
set -u
cd "$(dirname "$0")/.." || exit 1
ROOT="${ROOT:-$HOME/nnue-batch}"
mkdir -p "$ROOT"
LOG="$ROOT/batch.log"
GAMES=("$@")
# 既定の順番：短く済むもの・効果が見込めるものから
[ ${#GAMES[@]} -eq 0 ] && GAMES=(alquerque ugolki latrunculi konane agon janggi amazons)

say() { echo "[$(date '+%m-%d %H:%M')] $*" | tee -a "$LOG"; }
say "開始：${GAMES[*]}（作業フォルダ $ROOT）"
declare -a RES
for g in "${GAMES[@]}"; do
  rs="$g/tools/nnue/run.sh"
  if [ ! -f "$rs" ]; then say "$g：$rs がないので飛ばします"; RES+=("$g  ×（run.sh なし）"); continue; fi
  W="$ROOT/$g-nnue-work"
  say "$g：開始（WORK=$W）"
  t0=$(date +%s)
  WORK="$W" bash "$rs" 2>&1 | tee -a "$ROOT/$g.log"
  st=${PIPESTATUS[0]}
  min=$(( ($(date +%s) - t0) / 60 ))
  ad=$(find "$W" -type d -name adopt 2>/dev/null | head -1)
  if [ -n "$ad" ] && [ -n "$(ls -A "$ad" 2>/dev/null)" ]; then r="○ 採用候補あり（$ad）"; else r="△ 採用候補なし"; fi
  [ "$st" -ne 0 ] && r="× 終了コード $st（$ROOT/$g.log を確認）"
  say "$g：終了 ${min}分 $r"
  RES+=("$g  $r  ${min}分")
done
say "まとめ："
for x in "${RES[@]}"; do say "  $x"; done
