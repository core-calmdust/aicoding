# チャンギ NNUE 学習ツール（Mac）

チャンギAIの評価関数を NNUE にするための、学習データ作成と学習の一式です。
先生は**サイトのチャンギAI自身**です（外部のエンジンは使いません。ルールがサイトと完全に同じで、ライセンスの心配もありません）。
自己対局の各局面について「探索した評価値」と「その対局の勝敗」を記録し、読まなくても同じ判断ができるように学習させます。

ネットワークの形・ファイル形式・学習器はシャンチーと共通です（盤 9×10・駒7種が同じ。`xiangqi/tools/nnue/train.c` をそのまま使います）。

## 使い方

```bash
cd ~/Documents/GitHub/aicoding
bash janggi/tools/nnue/run.sh
```

自動で次の順に進みます（途中で止めても、もう一度実行すれば続きから）。

1. ツールのビルド
2. 自己対局で学習データ作り（既定 10万局 ≒ 900万局面。全コアを使用）。コア数×250局ごとに保存
3. 学習（10エポック）
4. 確認（差分計算の検査と、今の評価関数との対局 200局）
5. `~/janggi-nnue-work/nnue.bin.gz` ができたら完了

必要なもの: Xcode Command Line Tools（`xcode-select --install`）、空き容量 1GB ほど。

## 時間の目安

1コアあたり 毎秒 約130局面（1手 8,000局面読み。M系の Mac ならもう少し速い）。
10コアなら 10万局で 2時間前後です。CPU が混んでいるときは `JOBS=4` のようにコア数を絞れます。

## 設定（任意）

```bash
GAMES=50000 NODES=4 JOBS=6 bash janggi/tools/nnue/run.sh
```

| 変数 | 既定 | 内容 |
|---|---|---|
| `GAMES` | 100000 | 自己対局の局数（合計。増やして再実行すると追加で作る） |
| `NODES` | 8 | 1手に読む局面数（千単位。多いほど教師が正確で、時間がかかる） |
| `JOBS` | 全コア | 同時に動かす数 |
| `EPOCHS` | 10 | 学習の周回数 |
| `LAMBDA` | 0.6 | 教師値の配分（探索の評価値 × λ ＋ 実際の勝敗 × (1−λ)） |
| `NET` | なし | 先生の評価関数に使うネットワーク（2周目：できた `nnue.bin` を先生にして作り直す） |
| `WORK` | `~/janggi-nnue-work` | 作業フォルダ |
| `EXTRA` | なし | 学習器への追加オプション（例 `EXTRA="--init prev.bin --lr 0.0003"`） |

## 終わったら

`~/janggi-nnue-work/nnue.bin.gz` と `train.log` の最後の数行を Claude に渡してください。
今の評価関数と同じ持ち時間で対局させ、勝ち越したら採用します（`janggi/nnue.bin.gz` に置き、`janggi/engine.js` の `NET` に版を入れるだけで有効になります）。

2周目（強くなったネットワークを先生にしてもう一度）をする場合:

```bash
WORK=~/janggi-nnue-work2 NET=~/janggi-nnue-work/nnue.bin bash janggi/tools/nnue/run.sh
```

## ファイル

| ファイル | 内容 |
|---|---|
| `run.sh` | 全部まとめて実行 |
| `../native.c` | `jg datagen`（自己対局と記録。序盤 2〜9手はランダムな合法手、初期配置 16通り）、`jg nncheck`、`jg nmatch`、`jg scale` |
| `../../../xiangqi/tools/nnue/train.c` | 学習器（(1260→256)×2視点→1、SCReLU。左右反転でデータを2倍に使う） |
| `../../../xiangqi/tools/nnue/xq.h` | 記録の形式（1局面 56バイト）と入力特徴 |
