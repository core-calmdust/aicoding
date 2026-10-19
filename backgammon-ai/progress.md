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
- [済] L10 新 vs 現行: 350局で -0.014 ± 0.139（差なし）。ハイブリッド1-plyは厳密な wildbg 1-ply と平均差0.003・最善手一致98%（scripts/diag_hyb.js）。
- [済] 最終UIテスト（1440/390/844 × ja/en/de/ar、横画面ヒント）エラーなし。
- 結論: 新エンジンを出荷（Lv7 以下と分析・ヒントで有意改善、Lv10 は同等）。main へは未コミット（親が統合）。
- [旧] 測定 scripts/run_meas.sh（再実行で続きから）: L8 1000局 → L10 400局。結果 meas/meas.log と meas/*.jsonl。
- [済] サイト統合（未コミット）: backgammon/bg.js←scripts/bgw.js、weights.json←fast1（4桁丸め）、wildbg.bin/json、THIRD_PARTY_LICENSES.txt、engine.js（wildbg 読込・evalPly）。旧版は nets/site_bg_n3.js.bak / site_weights_n3.json.bak。
- [済] UI: 分析・共有/読込・Lv10 対局・390 スマホ OK、エラーなし。
- [済] パズル再検証: 16問中1問（level4 #3, 'FEEB'）の正解が誤り → ロールアウト3000局で 3/off 1/off が +0.029 → puzzles.json を修正（答えを DABA に、テーマ bearoff）。レッスンは2-plyで全問一致。

## 再開方法
- 学習: `node scripts/trainsup.js nets/fast1.json 8 2 128 80 0.006 nets/n3_shipped.json -- <data files>`（同じコマンドで続きから）
- 測定: `RES=meas/xxx.jsonl INTERIM=1 node scripts/cmpw.js <A> <B> N 2 lv10,lv10`（A に `wb:nets/fast1.json` で wildbg+高速ネット）

- [終了] 2026-10-19 03:10 全バックグラウンドジョブ停止（測定・学習は完了済み、残りはテスト用HTTPサーバのみで停止）。作業はコミット・公開済み。

## タスク: Lv10 の思考時間延長（2026-10-19 07:00〜）
- 実装（backgammon/bg.js、未コミット）: deepPlays()（0-ply 全手 → wildbg 再評価4手のハイブリッド1-ply を最大16候補 → ハイブリッド2-ply を最大8候補、soft 2.4秒で新規候補停止・hard 3.4秒で打ち切り）。キューブ判断は Lv10 のみ「各ダイスの0-ply最善手をハイブリッド1-plyで評価」（約0.5秒）。Lv9 以下は不変。
- 旧 Lv10 エンジンは scripts/bg_l10v1.js として保存。
- 時間計測（node、他負荷小）: 平均 1.6 秒、最大 2.9 秒。
- [進行中] 測定 scripts/run_l10b.sh（55分チャンク×最大7、再実行で再開）→ meas/L10b_deep_vs_v1.jsonl、ログ meas/meas_l10b.log。
- 07:08: bg.js 微修正（Lv10 soft 2.3秒/hard 3.1秒、キューブ深読みは0.9秒で打ち切り）。測定の2チャンク目以降はこの設定。UIテスト（Lv10対局・分析・390スマホ）エラーなし。
- 10-19 10:36: コンテナ再起動で測定停止（278局保存済み）。run_l10b.sh を再開。dots 側の別エージェントとCPU共有中。
