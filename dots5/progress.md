# Dots 5×5 Lv9/Lv10 強化 — 進捗（新しいエージェントはここから再開）

## 目的
5×5でLv9/Lv10を明確に強くする。Lv1–8・3×3/4×4完全読みは不変。main以外にコミットしない（wip-ai-data/dots5/ にチェックポイント）。

## 作業場所
- ソース: /home/claude/work/dots5src/（solver5.c = dotsgen/dots5.c をwasm化、dots5.wasm）
- チェックポイント: /home/claude/work/ckpt/dots5/（pos/ 局面集, matches/ 対局結果jsonl）
- 本体: /home/claude/aicoding/dots/engine.js

## 調査結論（要約）
- Barker&Korf: αβ+置換表(上下限)+対称+チェーン解析(最大効果>10倍)+中央からの手順。4×5完全解析で9日 → 5×5全解は不可能、終盤を早く解くのが最重要。
- Berlekamp/Allcock: 長鎖ルール・controlled value。終盤の閉形式。
- BoxesZero(2025, Entropy): 逆向き学習+MCTS+終盤定理でPRsBoxes/Dabbleに勝つがGPU学習必要 → ブラウザ/2コア/数時間では非現実的。

## 計測メモ
- [16:50] wasm(solver5) vs JS Solver: safe18–22の勝敗判定探索で wasm 58/61解決 vs JS 22/61、同じ局面で6–10倍速い。→ 方針: 5×5用 dots5.wasm を導入しゲートを早める。

- [17:10] スクリーニング(時間0.4倍) 新(wasmのみ,ゲート24/21) vs 旧Lv10: 13局 7勝6敗程度（差なし）。
- [17:20] decide.js（ネイティブoutcで終盤から逆算）: 誤手は safe 15–29 に集中。両者とも safe 22–25 で勝ち→負けの誤手多数。→ ここを強化すべき。
- [17:30] engine.js に追加: W5（dots5.wasmをSolver互換で包む）、W5.sliced（全手を時間スライス倍増で勝敗証明、勝ち手発見で終了、負け証明手は除外）、chooseW5（5×5 wasm時のLv9/10本体）。LEVELS[9/10].w5 にゲート。
- 評価法: decisive.jsonl（対局から safe19–28 局面、オラクル20sで勝敗付き）で「勝ち局面で勝ちを保つ率」を evaltest.js で測る（対局より安く高感度）。

## ファイル
- dots5src/match.js（対局, 再開可）, agent.js, stats.js, decide.js, mkset.js, evaltest.js, evalsum.js, outc.c（ネイティブオラクル）, bench.js
- engine.orig.js = 作業前のengine.js（旧Lv10比較用。dots5src内にあり）

## 次の手順
1. engine.js に 5×5 wasm パス（Lv9/10のみ）を追加
2. ゲート値を調整
3. 新Lv10 vs 旧Lv10, vs Lv8 の対局（100局ずつ、色交互、序盤ランダム化）
