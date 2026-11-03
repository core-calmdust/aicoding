# 将棋 NNUE 学習ツール（Mac / Linux）

将棋AIの評価関数 `shogi/nnue.bin.gz` を、公開されている強いエンジンの教師データで学習し直すための一式です。

- 学習データ: [nodchip/tanuki-.nnue-pytorch-2024-07-30.1](https://huggingface.co/datasets/nodchip/tanuki-.nnue-pytorch-2024-07-30.1)（MIT、深さ9、YaneuraOu PackedSfenValue 形式）
- 検証データ: [nodchip/shogi_suisho5_depth9](https://huggingface.co/datasets/nodchip/shogi_suisho5_depth9) の `shuffled.bin`（MIT、水匠5 深さ9、720万局面）
- ネットの形は今のエンジンと同じ（(2534→256)×2視点→1、SCReLU）なので、できた `nnue.bin.gz` を差し替えるだけで使えます。

## 使い方

ターミナルでリポジトリのフォルダに移動して、1行実行するだけです。

```bash
cd ~/Documents/GitHub/aicoding
bash shogi/tools/nnue/run.sh
```

自動で次の順に進みます（途中で止めても、もう一度実行すれば続きから）。

1. ビルド（Mac 標準の `cc` を使用。Xcode Command Line Tools が無ければ `xcode-select --install`）
2. データのダウンロード（約9.6GB）
3. 前処理（王手・駒を取る手の局面などを除いてシャッフル → 約1.2億局面）
4. 学習（8エポック。M4 Pro で30分〜1時間ほどの見込み）
5. `~/shogi-nnue-work/nnue.bin.gz` ができたら完了

作業フォルダはリポジトリの外（`~/shogi-nnue-work`）なので、GitHub Desktop には何も出ません。

## 空き容量

ピーク時に約25GB 使います。前処理が終わったら `~/shogi-nnue-work/raw/` は消してかまいません（約9.6GB 空きます）。

## 設定（任意）

環境変数で変えられます。

```bash
COUNT=60 EPOCHS=12 bash shogi/tools/nnue/run.sh
```

| 変数 | 既定 | 内容 |
|---|---|---|
| `COUNT` | 30 | ダウンロードするデータファイル数（1ファイル約780万局面・0.31GB） |
| `EPOCHS` | 8 | 学習の周回数 |
| `LAMBDA` | 0.75 | 教師値の配分（評価値 × λ ＋ 勝敗 × (1−λ)） |
| `HIDDEN` | 256 | 中間層の大きさ（256 以外はエンジン側の変更が必要） |
| `WORK` | `~/shogi-nnue-work` | 作業フォルダ |
| `EXTRA` | なし | 学習器への追加オプション（例 `EXTRA="--init ~/old/nnue.bin --lr 0.0003"`） |

## 終わったら

`train.log` の最後の行の `valid` / `eval only` の数字（小さいほど良い）と、`nnue.bin.gz` を Claude に渡してください。
現行の評価関数は同じ検証データで `valid 0.0418（eval only 0.0329）` です。これを下回っていれば有望で、同じ持ち時間での対局テストで勝ち越したら採用します。

## ファイル

| ファイル | 内容 |
|---|---|
| `run.sh` | 全部まとめて実行 |
| `fetch.sh` | データのダウンロード（再開可） |
| `prep.c` | 絞り込み・シャッフル |
| `train.c` | 学習器（pthreads で全コア使用、Adam） |
| `psv.h` | PackedSfenValue の読み取りと、エンジンと同じ入力特徴の計算 |

学習器の出力はエンジンの評価と一致することを確認済みです（同じ局面で `engine_simd.wasm` の評価値と小数点以下まで一致）。
