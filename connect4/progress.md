# Connect4 Lv8 完全プレイ化 進捗 (再開用)

## 目的
Lv8 を1手目から完全プレイにする。オフラインで「AIが直面しうる全局面」(相手の全応手 × AIの選んだ手) の木を
深さ D まで C ソルバで解いてブックに格納し、それ以降は engine.js のソルバで解く。

## 構成
- src/c4.h : engine.js と同一意味の C ソルバ (Pons式, 64bit bitboard)
- src/solvecli.c → /home/claude/work/c4solve (stdin の手順列 → 強解スコア, 引数 w で弱解)
- src/xcheck.js : C と engine.js の突き合わせ
- 生成物/チェックポイントはこのフォルダ (/home/claude/work/ckpt/connect4/)
- wip ブランチ: /home/claude/work/wip-ai-data/connect4/ にコピーして push (main には commit しない)

## 注意
- `pkill -f パターン` は自分のシェルも殺す (コマンド行に同じ文字列が入るため)。pkill -x を使う。
- dots/ には触らない (別エージェント)。CPU 2コア共有。

## 状況ログ
- 2026-10-19 11:50 C ソルバ作成、突き合わせ中
- 2026-10-19 12:15 ply0 弱解=中央(3) 勝ち, C で ply0..2 弱解に 391秒。cache_s0.bin に保存
