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

- [17:50] 勝ち保持テスト(decisive.jsonl, Lv10 5秒): 旧 14/34, 新(v1) 21/33。safe19–21: 5/13→11/13, 22–24: 4/10→6/10, 25–28: 5/11→4/10（ヒューリスティック領域は改善なし）。
- ネイティブ探索オプション(ETC/killer/history)は効果なし→既定のまま。
- 追加実装: chooseW5Async（ヘルパーワーカーで手を分担してsliced）、ポンダー（相手手番中にwasmで相手の各応手を証明、最大20秒、worker内40ms刻み）。agent.js/match.js に PONDER=ms で人間の思考時間をシミュレート。
- [18:05] v1 スナップショット: dots5src/v1/engine.js + dots5.wasm（対局はこれを使う。engine.jsを編集しても対局に影響しない）
- 実行中ジョブ: m10_v1_vs_old.jsonl（v1 Lv10 vs 旧Lv10, 時間1.0, 100局, 再開可）。再開: cd dots5src && timeout 3480 node match.js /home/claude/work/ckpt/dots5/matches/m10_v1_vs_old.jsonl 100 /home/claude/work/dots5src/v1/engine.js,10,1,1 /home/claude/work/dots5src/engine.orig.js,10,0,1
- 実行中: mkset.js → decisive2.jsonl（gen2対局から）

- [19:05] m10 v1 vs 旧Lv10: 39局で 31勝8敗（サーバ再起動で中断）→ [21:45] ジョブ2で再開。
- [19:20] ブラウザ試験(5×5 Lv10, 1440×900/390×844): 完走, ヒント9/9, 振り返り完了, レッスン/詰めOK, Firebase(localhost拒否)以外のエラーなし, AI待ち最大5.6–5.7s。
- [21:45] coordinator: main が更新（オンライン/チャット/レート戦）。git pull済み(up to date)、HEADのengine.js==engine.orig.js。UIのworker API不変。rated.jsの5×5 Lv9/10レートは暫定値→測定後に見直し候補。

- [23:17] **確定: 新Lv10(v1) vs 旧Lv10 100局 83勝17敗（83.0%, 95%CI 74.5–89.1, 平均差+2.42箱±0.54, z=6.6, 約+275Elo）**。平均思考 1.40s vs 1.73s/手、最大5.27s。
- 3×3: Lv9/10 357手すべて最善。4×4: Lv10 vs Lv8 4局(10-6,8-8,9-7,8-8)、非定跡の30手すべて最善。Lv1–4 2480手で旧と完全一致、LEVELS 1–8 不変。
- i18n.js の Lv9/10 説明(10言語)とREADMEのドット行を更新済み（未コミット、mainにはコミットしない）。390pxで横はみ出しなし。
- 実行中: m10_v1_vs_lv8.jsonl（v1 Lv10 vs Lv8, 100局）。再開: timeout 2400 node match.js .../m10_v1_vs_lv8.jsonl 100 .../v1/engine.js,10,1,1 .../engine.orig.js,8,0,1
- 残り: Lv9 新旧(〜40局), ポンダー効果(PONDER=5000, 〜30局), rated.jsの5×5 Lv9/10暫定レート見直し, 最終報告

## ファイル
- dots5src/match.js（対局, 再開可）, agent.js, stats.js, decide.js, mkset.js, evaltest.js, evalsum.js, outc.c（ネイティブオラクル）, bench.js
- engine.orig.js = 作業前のengine.js（旧Lv10比較用。dots5src内にあり）

## 次の手順
1. engine.js に 5×5 wasm パス（Lv9/10のみ）を追加
2. ゲート値を調整
3. 新Lv10 vs 旧Lv10, vs Lv8 の対局（100局ずつ、色交互、序盤ランダム化）
