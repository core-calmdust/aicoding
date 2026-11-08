# チェスの評価関数（NNUE）を Mac で学習し直す手順

サイトのチェスAI（`engine.c` ＋ `nnue.bin.gz`）の評価関数を、もっと多いデータで学習し直して強くするための一式です（`tools/nnue/`）。
ネットの形は今と同じ（(768→384)×2視点→1、SCReLU、出力は駒数で8分岐）なので、できたファイルを差し替えるだけでサイトで使えます。

## あなたがやること

1. GitHub Desktop で main を Pull
2. 準備（最初の1回、下の「1. 準備」）：`brew install zstd stockfish`、Python の仮想環境に `torch numpy`
3. ターミナルで実行（一晩〜1日、途中で止めても同じコマンドで再開）：
   ```sh
   cd /Users/core_tan/Documents/GitHub/aicoding/chess
   source ~/chess-nnue-venv/bin/activate
   caffeinate -i bash tools/nnue/run.sh
   ```
4. 終わったら `~/chess-nnue-work/` の **`nnue-candidate.bin.gz`・`log.txt`・`net.bin.log`** の3つを、Claude のチャットに添付するか、`chess/tools/nnue/results/` にコピーして GitHub Desktop で新しいブランチにコミット・Push（下の「5. 送ってほしいもの」。Hugging Face には上げない）
5. Claude に「チェスの NNUE 候補を送った」と伝える（ブランチで送ったときはブランチ名も）

---

## 何をするか

`run.sh` が次の順に自動で進みます。作業フォルダは **リポジトリの外の `~/chess-nnue-work/`** なので、GitHub Desktop には何も出ません。

| 段階 | 内容 | M4 Pro（14コア）の目安 |
|---|---|---|
| 0. ビルド | サイトのエンジン（`engine.c`）をネイティブで3つ作る：`nntool`（自己対局・教師・評価・対局）、`chess-uci`、`convert` | 数秒 |
| 1. Lichess の評価済み局面 | [Lichess の評価データベース](https://database.lichess.org/#evals)（CC0、Stockfish のクラウド解析つき）をダウンロードして、静かな局面だけを学習データに。今のネットは先頭の約1億2千万局面だけでしたが、**全部（約3億局面前後、年々増加）** を使います | ダウンロード約20GB（回線次第、100Mbps で約30分）＋変換1〜2時間 |
| 2. 自己対局 | サイトのエンジン＋今のネットで対局（1手5,000局面、ランダムな序盤から）、**約2,000万局面**。サイトのAIが実際に出会う局面と、対局の勝敗が入ります | 2〜4時間 |
| 3. 教師（任意） | 自己対局の局面を **Stockfish（深さ10）** で付け直す。Stockfish は GPL ですが、この Mac の上で物差し・教師として使うだけで、サイトには何も入りません（入れていなければ飛ばして、サイトのエンジン自身の評価値を使います） | 4〜8時間 |
| 4. 学習 | PyTorch（Mac の GPU「MPS」）で一から8エポック。損失は今のネットと同じ（予測勝率と教師の勝率の二乗誤差）、重みは ±1.98 に制限して量子化しても誤差が出ないように | 1〜3時間（画面の「pos/s」で見積もれます） |
| 5. 一致の確認 | できたネットの評価値を、学習側（Python）とエンジン（C）で2,000局面計算して**完全一致**するか確認 | 数十秒 |
| 6. 対局 | 新しいネット vs 今のネットを、同じ局面数（1手2万局面・520局）と同じ持ち時間（1手0.1秒・260局）で | 10〜20分 |

全部で **半日〜1日** ほど（教師ありの場合）。数字は M4 Pro の目安で、Mac mini でもほぼ同じ、M2 は約1.5〜2倍かかります。

## 1. 準備（最初の1回）

```sh
xcode-select --install            # C コンパイラ（入っていれば「already installed」と出ます）
brew install zstd stockfish       # zstd: Lichess のデータの展開。stockfish: 教師（任意）
python3 -m venv ~/chess-nnue-venv # 学習用の Python 環境（Homebrew の Python にそのまま pip すると怒られるため）
source ~/chess-nnue-venv/bin/activate
pip install torch numpy
python3 -c "import torch; print(torch.backends.mps.is_available())"   # True なら GPU で学習できます
```

空き容量は約40GB（Lichess の圧縮ファイル20GB＋学習データ10GB前後＋自己対局1GB）。変換が終われば `~/chess-nnue-work/lichess_db_eval.jsonl.zst` は消してかまいません。

## 2. 実行する

GitHub Desktop で main を Pull してから：

```sh
cd /Users/core_tan/Documents/GitHub/aicoding/chess
source ~/chess-nnue-venv/bin/activate
caffeinate -i bash tools/nnue/run.sh
```

- `caffeinate -i` は実行中に Mac がスリープしないようにします（MacBook はふたを開けたまま、電源につないで）。
- 進み具合は画面と `~/chess-nnue-work/log.txt` に出ます。自己対局の各プロセスの様子は `~/chess-nnue-work/sp/log-*.txt`。
- 使うコア数は「コア数−1」（M4 Pro なら13）。ほかの作業もしたいときは `P=8 caffeinate -i bash tools/nnue/run.sh` のように減らしてください。

### 設定（任意、環境変数）

| 変数 | 既定 | 内容 |
|---|---|---|
| `SP_POS` | 20000000 | 自己対局の局面数（0 で自己対局なし） |
| `NODES` | 5000 | 自己対局の1手の局面数（大きいほど質が上がり遅くなる） |
| `TEACHER` | `stockfish`（入っていれば） | 教師のエンジン。`none` で教師なし |
| `TDEPTH` | 10 | 教師の深さ（12 にすると質は上がり、時間は約2〜3倍） |
| `LICHESS` | 1 | 0 で Lichess のデータを使わない |
| `LMAX` | 0（全部） | Lichess のデータを先頭からこの局面数だけ |
| `EPOCHS` | 8 | 学習の周回数 |
| `LR` / `LAM` | 0.001 / 0.9 | 学習率 / 教師の配分（評価値 × λ ＋ 勝敗 × (1−λ)、勝敗は自己対局の局面だけ） |
| `INIT` | なし | `base` で今のサイトのネットから続きを学習（そのときは `LR=0.0002` くらいに） |
| `HIDDEN` | 384 | 中間層の大きさ（512 などは「8. より大きなネットにする場合」） |
| `P` | コア数−1 | 同時に動かすプロセス数 |
| `WORK` | `~/chess-nnue-work` | 作業フォルダ |

## 3. 止める・再開する

- **止める**：`Ctrl-C`。ターミナルを閉じても、Mac を再起動しても大丈夫です。
- **再開**：同じコマンドをもう一度（`cd` と `source` から）。
  - ダウンロード：続きから。変換：途中で止めたときは変換だけやり直し（1〜2時間）。
  - 自己対局：各プロセスが終わった対局数（`sp/d-N.bin.n`）から続き。
  - 教師：付け終わった局面の続きから。
  - 学習：10分ごとと各エポックの終わりに `net.bin.ckpt` を保存し、そこから続き。
- **ある段階をやり直す**：`~/chess-nnue-work/` の目印を消してから実行：`lichess.done`（Lichess）、`sp/done`（自己対局、`sp/` ごと消すと最初から）、`sp/teacher.done`（教師）、`train.done` と `net.bin.ckpt`（学習を最初から）。
- **設定を変えて別に回す**：`WORK=~/chess-nnue-work2` のように別のフォルダで（ダウンロード済みの `.zst` はコピーすれば再ダウンロード不要）。

## 4. 結果の見方

最後に `log.txt` にこのような行が出ます：

```
…/net.bin vs …/base.bin (20000): +140 -95 =285  score 0.543  Elo +30 (+12 .. +48)
…/net.bin vs …/base.bin (100ms): +70 -50 =140  score 0.538  Elo +27 (+2 .. +52)
```

- `Elo` が 0 より上で、カッコの幅（95%）の下側も 0 より上なら、今のネットより強いと言えます。**同じ持ち時間（100ms）の行で判断** します（ネットの形が同じなので速さも同じですが、念のため）。
- 学習の様子は `net.bin.log`（エポックごとの `valid`、小さいほど良い）。
- 今のサイトのネットも同じ尺度で測りたいときは：`bash tools/nnue/match.sh ~/chess-nnue-work/net.bin.ep4 ~/chess-nnue-work/base.bin 20000 40`（途中のエポックのネット `net.bin.epN` も比べられます）。

## 5. 送ってほしいもの

**A. Claude のチャットに添付する**（いちばん簡単）：3つのファイルをチャットにドラッグして「チェスの NNUE 候補」と書いて送る。

**B. GitHub Desktop で新しいブランチに入れる**：

```sh
mkdir -p /Users/core_tan/Documents/GitHub/aicoding/chess/tools/nnue/results
cp ~/chess-nnue-work/nnue-candidate.bin.gz ~/chess-nnue-work/log.txt ~/chess-nnue-work/net.bin.log \
   /Users/core_tan/Documents/GitHub/aicoding/chess/tools/nnue/results/
```

GitHub Desktop に3つのファイルが出るので、**Current Branch → New Branch**（例：`chess-nnue-results`）→ Summary に「chess: NNUE candidate」と書いて **Commit → Publish branch（Push）**。
そのあと Claude に **ブランチ名** を伝える（main には直接コミットしない）。
（`nnue-candidate.bin.gz` は約400KBで、GitHub の1ファイル100MBの上限より十分小さい。学習データや `~/chess-nnue-work/` の中身はコミットしないでください。）

Claude の作業環境からは Hugging Face に届かないので、Hugging Face には上げないでください。

反映は Claude 側で行います：ブラウザ（wasm）で同じ結果になるかの確認 → `nnue.bin.gz` の差し替えとキャッシュ番号 → Stockfish の強さ制限モードとの対局でレベル（`LEVELS`）とレーティング戦の基準（`RT_LV`）を測り直し → `MODEL_CARD.md` の更新。

## 6. 2台目の Mac（M2）も使う場合（任意）

M2 で自己対局のデータだけ作り、M4 Pro / Mac mini の学習に足せます（`SEEDBASE` を変えないと同じ対局になります）：

```sh
# M2
cd /Users/core_tan/Documents/GitHub/aicoding/chess
LICHESS=0 SEEDBASE=1 ONLY=data caffeinate -i bash tools/nnue/run.sh     # ~/chess-nnue-work/sp/t-*.bin（教師なしなら d-*.bin）ができる
# それを AirDrop などで学習する Mac の ~/chess-m2/ に置いて
EXTRA_DATA="$(ls ~/chess-m2/*.bin | tr '\n' ' ')" caffeinate -i bash tools/nnue/run.sh
```

（学習を始める前に置いてください。学習が終わった後なら `train.done` と `net.bin.ckpt` を消してやり直し。）

## 7. 個別のコマンド

```sh
W=~/chess-nnue-work
bash tools/nnue/build.sh                                    # WORK=$W を付けると $W に作る（run.sh は自動）
$W/nntool gen out.bin 100 5000 1 $W/base.bin                # 自己対局 100局（1手5000局面、乱数の種 1）
$W/nntool rescore in.bin out.bin $(which stockfish) 10      # 教師で付け直し（続きから再開）
python3 tools/nnue/train.py --out a.bin --epochs 8 data1.bin data2.bin   # 学習（--init でネットから続き、--device cpu も可）
python3 tools/nnue/train.py --check a.bin data.bin 2000 > py.txt         # 学習側の整数計算 …
$W/nntool evalpos a.bin data.bin 2000 > c.txt; cmp py.txt c.txt           # … とエンジンの評価が一致するか
bash tools/nnue/match.sh a.bin b.bin 20000 40              # 同じ局面数で対局（a が左）。「100ms」で同じ持ち時間、「-」で手作り評価
```

- データの形式：1局面32バイト（`tools/convert.c`・`tools/train.c` と同じ）。駒の配置（64ビット＋4ビット×駒数）、評価値（手番側、±3000）、手番、勝敗（手番側から 1負・2分・3勝、0は不明＝Lichess）。
- 旧来の C の学習器 `tools/train.c`（OpenMP、CPU）も同じデータを読めますが、勝敗の配分はありません。

## 8. より大きなネットにする場合（おすすめ：この学習のあとに 512）

**結論：この学習（384）が終わったら、同じデータで中間層 512 を学習して比べるのがおすすめ** です。データ（約3億局面）は 384 より大きいネットを十分に支えられ、ブラウザでの速さはほとんど変わりません。

| 中間層 | ブラウザ（wasm SIMD、Node.js で計測）の速さ | ファイル（gzip 後） | 見込み |
|---|---|---|---|
| 384（今） | 約30万局面/秒（基準） | 約0.4MB | — |
| **512** | **約98%（ほぼ同じ）** | 約0.5MB | 同じ持ち時間で +20〜40 Elo 程度（評価が細かくなる分。速さの損はほぼなし） |
| 768 | 約85〜90% | 約0.8MB | 速さの損（約 −15〜20 Elo）を精度で上回れるかは対局しだい。512 で伸びたら次に試す |
| 1024 以上 | 約70〜75%（推定） | 1MB〜 | 1手の時間が短いレベル（Lv.18〜20）では損になりやすい |

（計測：この作業環境の Node.js、5局面×30万局面、`engine.c` を `-DNN_H=…` でビルド。エンジンはもともと `NN_H` で中間層を変えられる作りで、512 にしても計算の仕組みは同じです。）

**やり方**（384 の学習が終わった同じ作業フォルダで。ダウンロード・自己対局・教師のデータはそのまま使い、ネットだけ別に作ります）：

```sh
cd /Users/core_tan/Documents/GitHub/aicoding/chess
source ~/chess-nnue-venv/bin/activate
HIDDEN=512 caffeinate -i bash tools/nnue/run.sh
```

- 学習（1〜3時間、384 の約1.3倍）→ 一致の確認（`-DNN_H=512` のエンジン `nntool-512` で）→ 今のサイトのネット（384）との対局、まで自動です。
- できるもの：`~/chess-nnue-work/nnue-candidate-h512.bin.gz` と `net-h512.bin.log`。`log.txt` の **100ms の行（同じ持ち時間）** で判断します。384 の候補と 512 の候補を直接比べるなら：
  `UCI="$HOME/chess-nnue-work/chess-uci-512,$HOME/chess-nnue-work/chess-uci" bash tools/nnue/match.sh ~/chess-nnue-work/net-h512.bin ~/chess-nnue-work/net.bin 100ms 20`
- 送るもの：上の2つ（＋`log.txt`）を `chess/tools/nnue/results/` へ（「5. 送ってほしいもの」と同じ）。
- 512 を採用するときは、Claude 側で `engine.c` を 512 でビルドし直した wasm（通常版・マルチスレッド版）を用意します（今の wasm は 384 のまま）。

### さらに先（エンジンの変更が必要、結果を見てから）

- **玉の位置で入力を分ける（king buckets、HalfKA 風）**：自玉の位置（左右反転して32通りを4〜16グループに）ごとに第1層を別に持つ。強いチェスエンジンの NNUE が標準的に使う方式で、同じ大きさのネットで +30〜60 Elo 程度が見込めます。玉が別のグループに動いたときだけ全部計算し直す実装が要り、ファイルは約4〜16倍（gzip 後 1.5〜6MB）。将棋で同じ方式を先に用意しています（`shogi/tools/TRAIN.md`）。
