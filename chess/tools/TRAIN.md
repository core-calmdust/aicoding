# チェスの評価関数（NNUE）を Mac で学習し直す手順

サイトのチェスAI（`engine.c` ＋ `nnue.bin.gz`）の評価関数を、もっと多いデータで学習し直して強くするための一式です（`tools/nnue/`）。
ネットの形は今と同じ（(768→384)×2視点→1、SCReLU、出力は駒数で8分岐）なので、できたファイルを差し替えるだけでサイトで使えます。

> 2026-11-09：この手順の1回目（Lichess 全部＋自己対局約2,000万局面、Stockfish 深さ10）の結果を v2 としてサイトに反映済みです（v1 比 同じ持ち時間で +97 Elo。`MODEL_CARD.md`「評価関数 v2」、ログは `tools/nnue/results/`）。以下の「今のネット」は、次に回すときは v2 を指します。
>
> **次の試し（2026-11-09〜）：玉の位置で入力を分ける king buckets → 下の「9.」**（同じ作業フォルダのデータをそのまま使い、学習から対局まで約1.5〜2時間）。
>
> 2026-11-11：king buckets 4区分（`KB=4`）の結果を **v3** としてサイトに反映済み（v2 比 同じ持ち時間で +31 Elo。`MODEL_CARD.md`「評価関数 v3」、ログは `tools/nnue/results/log-kb4.txt`・`net-kb4.bin.log`）。v2 は `tools/nnue/nnue-v2.bin.gz` に残しています。**次は8区分（`KB=8`）と比べる → 下の「9.」の「次：KB=8 と比べる」**。

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
| `INIT` | なし | `base` で v2（`tools/nnue/nnue-v2.bin.gz`、区分なし）から続きを学習、`site` で今のサイトのネット（v3、4区分）から（同じ区分数のときだけ）。続きの学習は `LR=0.0002` くらいに。`KB` を付けたときの既定は `base` |
| `HIDDEN` | 384 | 中間層の大きさ（512 などは「8. より大きなネットにする場合」） |
| `KB` | 1 | 玉の位置の区分の数（1 = なし＝今のサイト。4・8 などは「9. 玉の位置で入力を分ける」） |
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
python3 tools/nnue/train.py --out k.bin --kb 4 --init $W/base.bin --lr 0.0005 data1.bin data2.bin   # king buckets（「9.」）
$W/nntool bench a.bin data.bin 24 200000                    # 速さ（同じ探索の局面数/秒）
```

- データの形式：1局面32バイト（`tools/convert.c`・`tools/train.c` と同じ）。駒の配置（64ビット＋4ビット×駒数）、評価値（手番側、±3000）、手番、勝敗（手番側から 1負・2分・3勝、0は不明＝Lichess）。
- 旧来の C の学習器 `tools/train.c`（OpenMP、CPU）も同じデータを読めますが、勝敗の配分はありません。

## 8. より大きなネットにする場合（512 は試し済み：差なし → 384 のまま）

**結果（2026-11-09）：同じデータで中間層 512 を学習して比べたところ、同じ持ち時間では v2（384）と差がありませんでした**（v2 との直接対局 1手0.1秒 280局：+90 −94 =96、Elo −5（−38 .. +28））。valid は 0.013520 → 0.013105 と下がり、v1 との対局では局面数で約 +27 上でしたが、ブラウザ（wasm SIMD）で約3%遅くなる分と相殺されました。サイトは 384 のままです（詳しくは `chess/MODEL_CARD.md` の「中間層 512 の試し」、ログは `tools/nnue/results/log-h512.txt`・`net-h512.bin.log`）。**中間層をさらに広げる（768 など）より、下の「さらに先」の king buckets を先に試す方が見込みがあります。**

以下は試す前に書いた見込みと手順です（768 などを試すときにも同じ手順が使えます）。

| 中間層 | ブラウザ（wasm SIMD、Node.js で計測）の速さ | ファイル（gzip 後） | 見込み |
|---|---|---|---|
| 384（今） | 約30万局面/秒（基準） | 約0.4MB | — |
| 512 | 約98%（再計測：約97%） | 約0.5MB | 見込みは同じ持ち時間で +20〜40 Elo 程度だった → **結果は −5（−38 .. +28）、差なし** |
| 768 | 約85〜90% | 約0.8MB | 速さの損（約 −15〜20 Elo）を精度で上回れるかは対局しだい。512 が同じ時間で伸びなかったので見込みは薄い |
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

### さらに先

- **玉の位置で入力を分ける（king buckets、HalfKA 風）** → エンジン・学習側とも対応済み。次の「9.」の手順で試します。

## 9. 玉の位置で入力を分ける（king buckets）

自玉がどこにいるか（区分）ごとに第1層の重みを別に持つ方式です（強いチェスエンジンの NNUE の標準。将棋の `shogi/tools/TRAIN.md` と同じ考え方）。中間層は 384 のまま。見込みは同じ持ち時間で +30〜60 Elo。

**区分（既定 `KB=4`）**：自分の側から見た自玉の升で4つ。

| 区分 | 自玉の位置 | 学習データでの割合（目安） |
|---|---|---|
| 0 | 1・2段目の f〜h筋（キング側にキャスリング） | 約30% |
| 1 | 1・2段目の a〜c筋（クイーン側にキャスリング） | 約10% |
| 2 | 1・2段目の d・e筋（キャスリング前） | 約24% |
| 3 | 3段目より前 | 約37% |

- 4 にした理由：中盤のよくある玉の動き（Kg1・Kh1・Kg2・Kf1 など）が同じ区分の中に収まるので、区分が変わって計算し直す回数が少なく、ブラウザでの速さがほとんど落ちません（この作業環境の wasm SIMD で、同じ探索の局面数/秒が今のネットの **約97%**。8区分は約95%）。ファイルも小さめ（gzip 後 約1.5MB、今は約0.4MB。8区分は約3MB）。
- 学習は **今のサイトのネット（v2）を全部の区分に写したところから**始めます（学習の最初は v2 とまったく同じ評価。区分ごとの違いだけを学ぶので早い）。学習率は 0.0005 から。
- 比べたいときは `KB=8`（1段目と2段目を分け、前の方も2つに）も同じ手順で回せます（`16`・`32` も選べますが、ファイルが大きく遅くなるので研究用）。

**やり方**（v2 を作った `~/chess-nnue-work/` のデータ＝Lichess 2.85億局面＋自己対局1,961万局面（Stockfish 付け直し済み）をそのまま使います。ダウンロード・自己対局・教師はやり直しません）：

1. GitHub Desktop で main を Pull
2. ターミナルで：
   ```sh
   cd /Users/core_tan/Documents/GitHub/aicoding/chess
   source ~/chess-nnue-venv/bin/activate
   KB=4 caffeinate -i bash tools/nnue/run.sh
   ```
3. （任意）続けて8区分も比べるなら、終わってから `KB=8 caffeinate -i bash tools/nnue/run.sh`
4. 終わったら `~/chess-nnue-work/` の **`nnue-candidate-kb4.bin.gz`・`net-kb4.bin.log`・`log.txt`** の3つを送る（8区分も回したら `nnue-candidate-kb8.bin.gz`・`net-kb8.bin.log` も）。送り方は「5. 送ってほしいもの」と同じ（チャットに添付、または `chess/tools/nnue/results/` に入れて新しいブランチ。Hugging Face には上げない）。
5. Claude に「チェスの king buckets 候補を送った」と伝える

**自動で進むこと**：ビルド → 学習（8エポック）→ 一致の確認（学習器の整数計算とエンジンの評価が2,000局面で完全一致するか）→ 速さ（同じ探索の局面数/秒、今のネットと比べて `speed:` の2行）→ 今のサイトのネット（v2）との対局（1手2万局面・520局、1手0.1秒・260局）。

| | M4 Pro の目安 |
|---|---|
| 学習 | 1エポック約7〜9分（v2 の学習は約6.5分）、8エポックで **約1〜1.3時間** |
| 確認・速さ | 1〜2分 |
| 対局 | 15〜20分 |
| 合計 | **約1.5〜2時間**（途中で止めても同じコマンドで続きから） |
| できるファイル | `nnue-candidate-kb4.bin.gz` 約1.5MB（8区分は約3MB） |

- `base.bin`（対局の相手・学習の出発点）は、毎回サイトの今のネット（`nnue.bin.gz` = v2）から作り直します。前回の作業フォルダの `base.bin` は v1 だったので、1回目に「the site's net has changed」と出て古いものは `base-prev.bin` になります（正常です）。
- 結果の見方は「4.」と同じで、**100ms の行（同じ持ち時間）**で判断します。
- やり直すとき：`~/chess-nnue-work/train-kb4.done` と `net-kb4.bin.ckpt` を消して実行。

### 次：KB=8 と比べる（2026-11-11〜）

4区分（`KB=4`）は v3 としてサイトに入りました（valid 0.013531 → 0.012764、v2 との対局 1手2万局面 +26、1手0.1秒 +31）。続けて8区分を回して、サイトの v3 と比べます。

1. GitHub Desktop で main を Pull（v3 が入った main。`nnue.bin.gz` が v3 になり、`run.sh` は区分の学習を **v2（`tools/nnue/nnue-v2.bin.gz`）から**始めます＝4区分と同じ出発点）
2. ターミナルで：
   ```sh
   cd /Users/core_tan/Documents/GitHub/aicoding/chess
   source ~/chess-nnue-venv/bin/activate
   KB=8 caffeinate -i bash tools/nnue/run.sh
   ```
3. 1回目に「base.bin: the site's net has changed」と出ます（`base.bin` が v3 に変わる。正常）。**対局の相手は v3（4区分）**になるので、`log.txt` の最後の2行がそのまま「8区分 対 4区分」の直接対決です（`speed:` の2行も v3 と8区分の比較）。
4. 終わったら `~/chess-nnue-work/` の **`nnue-candidate-kb8.bin.gz`・`net-kb8.bin.log`・`log.txt`** の3つを送って、Claude に「チェスの KB=8 の結果を送った」と伝える

- **Pull する前に `KB=8` を始めていた場合**：そのまま最後まで回してかまいません（学習は v2 から始まっていて同じ条件。対局の相手は v2）。終わったら Pull して**同じコマンドをもう一度**実行すると、学習は済んでいるので飛ばして、一致の確認・速さ・**v3 との対局だけ**をやり直します（約20分）。両方の行を送ってください。
- **判断（Claude 側）**：`log.txt` の **100ms の行**（同じ持ち時間）で、8区分が v3 に勝ち越し、95%区間がおおむね 0 より上なら8区分に差し替え。差がなければ v3（4区分）のまま（ファイルが約2倍、ブラウザの速さは 4区分の約98%）。
- **差し替えは `nnue.bin.gz` だけ**：サイトの `engine.wasm`・`engine_mt.wasm` は 2026-11-11 から8区分まで読めるように作ってある（`engine.c` の `NN_KB` 8）ので、作り直し不要。ページの `?v=`（`engine.js?v=`・大百科の `atlas/games/chess.js`・`pro/pro.js` の `VER`）と `MODEL_CARD.md` を更新し、Node で一致の確認（ネイティブと wasm で同じ探索）をしてから。

**反映（結果を見てから Claude 側で）**：ブラウザ（wasm）で同じ結果になるかの確認 → エンジンの wasm を区分に対応したもので作り直し → ページの読み込み（`nn_load`）とキャッシュ番号 → `nnue.bin.gz` の差し替え → `MODEL_CARD.md`。（2026-11-11 に4区分で実施済み。wasm は8区分まで読めるので、次は `nnue.bin.gz` とキャッシュ番号だけ）

**仕組み（メモ）**：ネットのファイルは `W1[区分][768][384] | B1 | W2 | B2 | "CKB1"・区分数・384・0`（区分なしのネットには末尾がなく、今と同じ）。エンジン（`engine.c`）はどちらのファイルも読めます（区分なしのネットでは今と同じ評価・同じ指し手になることを、ネイティブ・`engine.wasm`・`engine_mt.wasm` で確認済み）。区分の表は `engine.c` の `nn_setmap` と `train.py` の `kb_table`（同じもの）。区分を変えずに玉が動いたときは差分更新、区分が変わったときはその視点だけ「前回その区分で計算した値」から差分で作り直します。
