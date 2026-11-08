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
4. 終わったら `~/chess-nnue-work/` の **`nnue-candidate.bin.gz`・`log.txt`・`net.bin.log`** の3つを `chess/tools/nnue/results/` にコピーして、GitHub Desktop でコミット・Push（下の「5. 送ってほしいもの」）
5. Claude に「チェスの NNUE 候補を上げた」と伝える

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

**GitHub Desktop で（おすすめ）**：

```sh
mkdir -p /Users/core_tan/Documents/GitHub/aicoding/chess/tools/nnue/results
cp ~/chess-nnue-work/nnue-candidate.bin.gz ~/chess-nnue-work/log.txt ~/chess-nnue-work/net.bin.log \
   /Users/core_tan/Documents/GitHub/aicoding/chess/tools/nnue/results/
```

GitHub Desktop に3つのファイルが出るので、Summary に「chess: NNUE candidate」と書いて **Commit to main → Push origin**。
（`nnue-candidate.bin.gz` は約400KB。学習データや `~/chess-nnue-work/` の中身はコミットしないでください。）

**Hugging Face で送る場合**（ネットだけ。Lichess のデータは CC0 なので再配布も可能ですが、大きいので不要です）：

```sh
pip install huggingface_hub
huggingface-cli login
huggingface-cli upload corechan/chess-nnue ~/chess-nnue-work/nnue-candidate.bin.gz candidates/nnue-candidate.bin.gz
```

そのうえで `log.txt` の最後の数行を Claude に貼ってください。

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

## 8. ネットを大きくするなら（今回はしない・参考）

今回はエンジンを変えずに **データを約3倍（Lichess 全部＋自己対局2,000万局面）** にします。前回は 5,400万 → 1億800万局面で +68 Elo だったので、まずこれで伸びを見ます。
さらに伸ばす次の一手は次の2つで、どちらも `engine.c`（と wasm・量子化）の変更が必要なので、結果を見てから別の作業で行います：

1. **玉の位置で入力を分ける（king buckets、HalfKA 風）**：自玉の位置（左右反転して32通りを4〜16グループに）ごとに第1層を別に持つ。強いチェスエンジンの NNUE が標準的に使う方式で、同じ大きさのネットで +30〜60 Elo 程度が見込めます。玉が別のグループに動いたときだけ全部計算し直す（Finny table）実装が要り、ファイルは約4〜16倍（gzip 後 1.5〜6MB）。
2. **中間層 384 → 512 / 768**：評価の精度は上がる一方、1局面の計算が遅くなるので、同じ持ち時間での対局で得かを確かめる必要があります（将棋では 256 → 512 で +66 Elo でした）。

この学習キットは `--hidden` で中間層の大きさを変えられますが、**サイトに載せられるのは 384 だけ** です（エンジンが 384 で作られているため）。
