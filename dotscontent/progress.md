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
- [ ] 1. 生成器（レッスン/パズル）
- [ ] 2. 定跡データ
- [ ] 3. UI
- [ ] 4. 翻訳
- [ ] 5. テスト
- [ ] 6. トップページ/README
