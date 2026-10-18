# バックギャモンAI強化 進捗ログ（再開用）

保存先: /home/claude/work/ckpt/backgammon/（スクリプト scripts/、ネット nets/、測定 meas/）
生データ（大きいので git 外）: /home/claude/work/data/backgammon/（w1_*.bin = wildbg 0-ply ラベル付き自己対戦局面、roll_*.bin = CC0 ロールアウト）
ブランチ: wip-ai-data（worktree /home/claude/work/wip-ai-data）に小さなチェックポイントとこのログを1時間ごとに push。main にはコミットしない。

## 前提
- サイトは Apache-2.0。同梱可: MIT/BSD/Apache/CC0。GPL（GNUbg）は不可。
- リサーチ結果: bg_research.md

## 状態（時系列）
- [済] リサーチ。wildbg（MIT OR Apache-2.0）の contact/race ネットを JS に移植（scripts/bgw.js の "wildbg evaluator" 節、nets/wildbg.bin+json は float16）。onnxruntime との差 最大 2e-4。
- [済] ロールアウト真値（CC0 wildbg-training 0021/0022/0016）に対する RMSE: 旧ネット 0.150 / 現行n3 0.138 / wildbg 0.057（contact）。
- [済] 0-ply 対戦: wildbg vs 現行n3 = +0.092 ± 0.058（2000局）、wildbg vs 旧 = +0.105 ± 0.087（1000局）。
- [済] ハイブリッド探索（scripts/bgw.js: hyb1/hyb2。相手の応手は高速ネット上位2手を wildbg で再評価）。Lv7=wildbg 0-ply、Lv8=1-ply、Lv9/10=2-ply（時間制限）。
- [進行中] 高速ネット（GNUbg 風特徴 128/80）を wildbg ラベル（w1）＋CC0 ロールアウトで蒸留学習 → nets/fast1.json（エポックごとに保存、state.json で再開可）。
- [未] 測定: 新Lv10 vs 現行Lv10、新Lv8 vs 現行Lv8（meas/*.jsonl に1局ずつ追記、RES 環境変数で再開可）。
- [未] サイト統合（bg.js←bgw.js、engine.js で wildbg.bin 読込、THIRD_PARTY_LICENSES 追加）とUIテスト。

## 再開方法
- 学習: `node scripts/trainsup.js nets/fast1.json 8 2 128 80 0.006 nets/n3_shipped.json -- <data files>`（同じコマンドで続きから）
- 測定: `RES=meas/xxx.jsonl INTERIM=1 node scripts/cmpw.js <A> <B> N 2 lv10,lv10`（A に `wb:nets/fast1.json` で wildbg+高速ネット）
