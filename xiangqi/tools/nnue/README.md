# シャンチー NNUE 学習ツール（Mac）

シャンチーAIの評価関数を NNUE にするための学習データ作成と学習の一式です。
最強クラスの公開エンジン [Pikafish](https://github.com/official-pikafish/Pikafish)（GPL-3.0）に自己対局させ、各局面の評価（勝ち・引き分け・負けの確率）を教師にします。
Pikafish は Mac の中で先生役として使うだけで、サイトには何も含めません（五目並べで Rapfi を使ったときと同じ方式）。

## 使い方

```bash
cd ~/Documents/GitHub/aicoding
bash xiangqi/tools/nnue/run.sh
```

自動で次の順に進みます（途中で止めても、もう一度実行すれば続きから）。

1. ツールのビルド、Pikafish のダウンロードとビルド、Pikafish の評価関数（約50MB）のダウンロード
2. 自己対局で学習データ作り（既定 10万局 ≒ 1,000万局面以上。全コアを使用）。5,000局ごとに保存されるので、いつ止めても大丈夫です
3. 学習（10エポック）
4. `~/xiangqi-nnue-work/nnue.bin.gz` ができたら完了

必要なもの: Xcode Command Line Tools（`xcode-select --install`）、空き容量 数GB。

## 時間の目安

自己対局がいちばん時間がかかります。進み具合は `pos/s`（1秒あたりの局面数）で表示されるので、最初の数分の数字で全体の時間を見積もれます（1,000万局面 ÷ pos/s）。
長すぎる場合は止めて、`GAMES` を減らして再実行すれば、それまでのデータで学習まで進みます。

## 設定（任意）

```bash
GAMES=50000 NODES=6000 bash xiangqi/tools/nnue/run.sh
```

| 変数 | 既定 | 内容 |
|---|---|---|
| `GAMES` | 100000 | 自己対局の局数（合計。増やして再実行すると追加で作る） |
| `NODES` | 8000 | Pikafish が1手に読む局面数（多いほど教師が正確で、時間がかかる） |
| `EPOCHS` | 10 | 学習の周回数 |
| `LAMBDA` | 0.8 | 教師値の配分（Pikafish の期待勝率 × λ ＋ 実際の勝敗 × (1−λ)） |
| `WORK` | `~/xiangqi-nnue-work` | 作業フォルダ |
| `EXTRA` | なし | 学習器への追加オプション（例 `EXTRA="--init prev.bin --lr 0.0003"`） |

## 終わったら

`~/xiangqi-nnue-work/nnue.bin.gz` と `train.log` の最後の行を Claude に渡してください。エンジンに NNUE を組み込み、今の評価関数と同じ持ち時間で対局させて、勝ち越したら採用します。

## ファイル

| ファイル | 内容 |
|---|---|
| `run.sh` | 全部まとめて実行 |
| `datagen.c` | 自己対局（Pikafish を UCI で操作。序盤2〜9手はランダムな合法手で変化をつける）。記録は1局面56バイト |
| `train.c` | 学習器（(1260→256)×2視点→1、SCReLU。左右反転でデータを2倍に使う） |
| `xq.h` | 記録の形式と入力特徴 |
