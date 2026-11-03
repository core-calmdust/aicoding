# 将棋AIの強さ測定（技巧と対局）

サイトの将棋AI（`engine.c` ＋ `nnue.bin.gz`）を、強さの目安が公表されている将棋ソフト「技巧2」（GPL-3.0）と Mac で対局させます。
技巧はこの測定の物差しとして手元で使うだけで、サイトには何も含めません。

技巧2の README による目安：読みの深さ（DepthLimit）1〜5 ＝ 将棋倶楽部24の 8級（R800）・5級（R1100）・2級（R1400）・初段（R1600）・二段（R1800）。深さ6以上は公表されていないので、深さ5との差から換算します。

## 使い方

```bash
cd ~/Documents/GitHub/aicoding
bash shogi/tools/match/run-gikou.sh
```

1. サイトのエンジンをネイティブでビルド（`usimatch`）
2. 技巧をダウンロードしてビルド（Apple シリコンでは Intel 版として作り Rosetta で動かします。Rosetta が無いと言われたら `softwareupdate --install-rosetta --agree-to-license`）
3. 技巧の評価ファイル（リリースの zip）を取得
4. 対局：既定は最強設定（1手220万局面）で、技巧の深さ5・6・7と各40局（3つ同時に実行。序盤は `openings.txt` の100通りから、先後を入れ替えて2局ずつ）

終わると深さごとの成績が表示されます。その数行を Claude に渡してください。

## 設定（任意）

```bash
NODES=370000 DEPTHS="5 6" GAMES=60 bash shogi/tools/match/run-gikou.sh
```

| 変数 | 既定 | 内容 |
|---|---|---|
| `NODES` | 2200000 | サイトのAIが1手に読む局面数（四段 2,200,000、三段 370,000、二段 91,000 …） |
| `DEPTHS` | `5 6 7` | 技巧の読みの深さ |
| `GAMES` | 40 | 深さごとの対局数 |
| `NET` | `shogi/nnue.bin.gz` | 評価関数ファイル（512幅も可） |
