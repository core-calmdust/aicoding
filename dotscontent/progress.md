# Dots & Boxes コンテンツ拡張 進捗 (dotscontent)

## タスク（依頼の要約）
dots/ に (1)ルール入門（図解・ミニ盤・初回に案内） (2)レッスン15段階（各5問・20点×順位・75点合格・ヒント/解説、全問ソルバ検証）
(3)定跡タブ 3×3/4×4（ソルバ検証済み手順、学習モード＋ドリル、名前は記述的と明記） (4)詰めドット約450問をカテゴリ別（レベル・進捗・今日の一問は全問から）
(5)既存機能維持、10言語（ar は RTL、盤は LTR）、データは小さく分割・遅延読込。
テスト: Playwright 1440×900/390×844, ja/en/de/ar。トップ index.html の dots 行と README も更新（触る前に git pull --rebase --autostash）。
main にはコミットしない（コーディネータが反映）。wip-ai-data ブランチの dotscontent/ に1時間ごと push。CPUは2コアを Backgammon と共有：ジョブは1本ずつ、各60分以内。

## 場所
- サイト: /home/claude/aicoding/dots/
- 生成スクリプト: /home/claude/work/dotsgen/ （allv.c = dots.c を使う 3×3/4×4 全手厳密値ツール）
- チェックポイント: /home/claude/work/ckpt/dotscontent/
- wip: /home/claude/work/wip-ai-data/dotscontent/

## 事実メモ
- 値の規約: 「手番側がこれから得る箱数 − 相手」。allv の出力 "v e:v ..."。
- 3×3 初期局面: 全24手が −3（後手 6-3 勝ち）。allv で 0.08 秒。
- 4×4 初期局面: 全40手が 0（引き分け）。allv + TTSEED(tt_root.bin) で 9.5 分（CPU共有下）。
- 長鎖ルール（UCLA Ferguson のページで確認）: m,n 両方偶数なら先手は長い鎖を奇数本、それ以外は偶数本。= 先手は「ドット数＋長い鎖数」を偶数に。
- 文献: Berlekamp "The Dots-and-Boxes Game"(2000), Barker & Korf AAAI 2012 で 4×5 が引き分けと解明。

## 設計
- タブ: ルール | レッスン | 定跡 | 詰めドット
- レッスン: lessons.json（問題プール, 各手の厳密値）。テキストは content/text.<lang>.json に分割して遅延読込。
- 詰めドット: puzzles/index.json + puzzles/<cat>.json（遅延読込）。進捗は新キー dots-puzzles-v2（旧45問は移行）。
- 定跡: openings.json（3×3, 4×4 の手順と各手の値）。

## 状況
- [x] 0. 既存コード調査
- [x] 1. 生成器（レッスン/パズル）: gen.js（ランダム実戦→分類→allv/allv5で全手厳密値）→ cand_<n>.jsonl、derive_loops.js（ループ4つ残し局面）、
      select.js → dots/lessons.json(15段階×10問) と dots/puzzles/*.json(9カテゴリ×3レベル=450問, 旧45問含む)。
      出荷する600問はすべて C ソルバ(allv/allv5)と JS ソルバ(engine.js)の両方で全手の値が一致（不一致0）。再実行: node select.js
  * 重要: engine.js の Zobrist 乱数が xorshift（GF(2)線形）でハッシュ衝突→置換表が壊れて誤値が出ていた。splitmix32 に修正済み（engine.js 45行付近）。
  * allv5 = dots5.c（TTキーを64bit幅にした dots.c のコピー）で 5×5 も厳密解。
- [x] 2. 定跡データ（build_open.js で dots/openings.json 生成。SEL4 環境変数で4×4手順を選択: f9 f8 f4 s10 s27 s4 s22 s0）: op3.js（3×3, 全手値, 54手順候補→op3.json）、op4.js（4×4, 定石book+wasm, op4.json, キャッシュ op4_cache.jsonl）。
      3×3: 初手4分類 A外周角/B外周中/C内側端/D中央箱の辺。Dは最善応手が3通り（鏡うつし応手 b3– は負け）。
      4×4: 家族b=先手練習用（後手はbook手）、家族a=後手練習用（先手はbook手、初手9）。
- [x] 3. UI: dots/learn.js（ルール入門/レッスン/定跡学習・ドリル/詰めドット/今日の一問）。index.html は旧レッスン・パズルコード削除、learnInit() 呼出し。ja でPlaywrightスモーク(/home/claude/work/pw/dc_smoke.js)エラー0
- [x] 3b. 翻訳（10言語 content/text.<lang>.json 各299キー、プレースホルダ一致を確認）: content/text.ja.json 完成。en→他8言語を作る（キーは ja と同じ集合。check: 全言語のキー一致）
- [x] 5. テスト: dc_smoke.js を ja/en/de/ar × 1440/390 で実行、コンソールエラー0・はみ出し0（モバイルの一覧グリッド修正済み）。dc_lang.js で言語切替の再描画確認。
- [x] 6. トップ index.html（dots facts: lessons15, puzzles450, dt.desc 10言語）と README の dots 行を更新（git pull --rebase --autostash origin main 済み）。

## 完了。main へのコミットはコーディネータが行う。
