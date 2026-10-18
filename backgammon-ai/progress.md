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
- [済] 高速ネット fast1（GNUbg 風特徴 128/80、n3 から warm start）を wildbg 0-ply ラベル 430万局面＋CC0 ロールアウト（×3）で8エポック学習 → nets/fast1.json。ロールアウト真値RMSE contact 0.167→0.095、race 0.118→0.075。0-ply 対戦 fast1 vs n3 = +0.043 ± 0.059（2000局、有意差なし）。
- [済] L8 新 vs 現行: +0.083 ± 0.084（1000局）。0-ply wildbg vs n3: +0.092 ± 0.058（2000局）。
- [途中] L10 新 vs 現行: 76局で -0.132 ± 0.302（中断あり）。scripts/run_meas_L10.sh で続行中（再実行で再開）。
- [旧] 測定 scripts/run_meas.sh（再実行で続きから）: L8 1000局 → L10 400局。結果 meas/meas.log と meas/*.jsonl。
- [済] サイト統合（未コミット）: backgammon/bg.js←scripts/bgw.js、weights.json←fast1（4桁丸め）、wildbg.bin/json、THIRD_PARTY_LICENSES.txt、engine.js（wildbg 読込・evalPly）。旧版は nets/site_bg_n3.js.bak / site_weights_n3.json.bak。
- [済] UI: 分析・共有/読込・Lv10 対局・390 スマホ OK、エラーなし。
- [済] パズル再検証: 16問中1問（level4 #3, 'FEEB'）の正解が誤り → ロールアウト3000局で 3/off 1/off が +0.029 → puzzles.json を修正（答えを DABA に、テーマ bearoff）。レッスンは2-plyで全問一致。

## 再開方法
- 学習: `node scripts/trainsup.js nets/fast1.json 8 2 128 80 0.006 nets/n3_shipped.json -- <data files>`（同じコマンドで続きから）
- 測定: `RES=meas/xxx.jsonl INTERIM=1 node scripts/cmpw.js <A> <B> N 2 lv10,lv10`（A に `wb:nets/fast1.json` で wildbg+高速ネット）
