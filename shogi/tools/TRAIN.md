# 将棋の評価関数を「玉の位置 × 駒の位置」（HalfKP 方式）にする学習を Mac で行う手順

今の将棋AIの NNUE（`nnue.bin.gz`、(2534→512)×2視点→1）は、駒の配置と持ち駒だけを見ていて、**玉がどこにいるか** で駒の価値を変えられません。
強い将棋エンジンの NNUE（HalfKP）は「自玉の位置ごとに別の重み」を持ちます。そのための一式が `tools/nnue/`（`trainkp.c`・`kptool.c`・`run-kp.sh` ほか）です。
エンジン側は `engine.c` に **ビルドの指定（`-DNUE_KB`）があるときだけ有効になる評価** として入れてあり、サイトの wasm（4種）は1バイトも変わっていません。

## あなたがやること

1. GitHub Desktop で main を Pull
2. 準備（最初の1回）：`xcode-select --install`、`pip3 install numpy`（確認用、無くても動きます）
3. **前回の学習データがあれば使い回す**（ダウンロード約45分と前処理20〜40分、約47GBを省けます）。ターミナルで：
   ```sh
   ls -lh ~/shogi-nnue-work/train.bin ~/shogi-nnue-work/val.bin
   ```
   `train.bin` が出れば（約16GB＝約4億局面。約5GB でも使えます）：
   ```sh
   mkdir -p ~/shogi-kp-work && ln -s ~/shogi-nnue-work/train.bin ~/shogi-kp-work/train.bin && ln -s ~/shogi-nnue-work/val.bin ~/shogi-kp-work/val.bin
   ```
   「No such file」なら何もしない（自動でダウンロードします。そのときだけ空き容量 約60GB が必要。使い回すなら 1GB あれば足ります）
4. ターミナルで実行（使い回しで約5〜7時間、ダウンロードからだと＋1〜1.5時間。止めても同じコマンドで続きから）：
   ```sh
   cd /Users/core_tan/Documents/GitHub/aicoding/shogi
   caffeinate -i bash tools/nnue/run-kp.sh
   ```
   - 電源につないだまま、ふたは閉じない（`caffeinate -i` は放置でのスリープだけを防ぎます）
   - **ほかの作業と並行するとき**は、コマンドを `THREADS=8 P=6 caffeinate -i bash tools/nnue/run-kp.sh` に（学習8スレッド・対局6つ。ほかの作業に約6コア残ります。軽い作業なら指定なしで大丈夫）。
     最後の対局（約40分）は持ち時間の勝負なので、その間に重い作業（別の学習・ビルドなど）をすると結果がぶれます。重なったら、あとで同じコマンドをもう一度（学習は飛ばして確認と対局だけやり直します）
5. 終わったら `~/shogi-kp-work/` の **`kp-candidate.bin.gz`（約12〜25MB）・`log.txt`・`train.log`** を送る。
   **Claude のチャットに添付する**か、**GitHub Desktop で新しいブランチを作って `shogi/tools/nnue/results/` にコミット・Push** する（下の「5. 送ってほしいもの」）。
   Claude の作業環境からは Hugging Face に届かないので、Hugging Face には上げない
6. Claude に「将棋の HalfKP 候補を送った」と伝える（ブランチで送ったときはブランチ名も）

---

## 仕組み

- 各視点（手番側・相手側）で、**自玉のいるマスの「区分（バケツ）」ごとに第1層を別に持ちます**。入力は今のネットと同じ 2534 個（駒×升＋持ち駒）を、区分の数だけ用意したものです。
- 区分は既定で **9（`k9`）**：自玉の段（自陣から見て一段目 ／ 二段目 ／ それより前）× 筋（右・中・左の3筋ずつ）。囲いの位置（居飛車・振り飛車・入玉気味）をおおまかに見分けます。
  `k3`（段だけ、3区分）、`k81`（全部のマス＝本来の HalfKP、81区分）も選べます。
- 学習中は「全区分共通の重み」も一緒に学び、保存するときに各区分へ足し込みます（少ないデータの区分も共通部分で補われます）。
  **出発点は今のサイトのネット**（共通の重みに入れる）なので、1エポック目の始まりから今と同じ強さで、そこから玉の位置による違いを学びます（この一致は確認済み）。
- 玉が別の区分に動いた手だけ、その視点の計算をやり直します（それ以外は今と同じ差分計算）。作業環境の計測で、同じ探索の速さはネイティブ版で今とほぼ同じ（155 → 152 千局面/秒）、ブラウザ（wasm SIMD）で約1割遅い（278 → 245 千局面/秒）でした。

## 何をするか（`run-kp.sh`）

作業フォルダは **リポジトリの外の `~/shogi-kp-work/`** なので、GitHub Desktop には何も出ません。

| 段階 | 内容 | M4 Pro（14コア）の目安 |
|---|---|---|
| 0. ビルド | `prep`・`trainkp`・`usimatch`（今のネットのエンジン）・`kptool-9-512`（HalfKP のエンジン） | 数秒 |
| 1. データ | tanuki- データセット（MIT、深さ9の評価値つき）を **100ファイル（約7.8億局面、約31GB）**、水匠5の検証データも。前回までと同じ `fetch.sh` | 回線次第（100Mbps で約45分） |
| 2. 前処理 | 王手・駒を取る手・16手目未満などを除いてシャッフル → **約4億局面** | 20〜40分 |
| 3. 学習 | `k9`・中間層512・8エポック・全コア（C の学習器、前回までと同じ方式に区分と共通の重みを追加） | 1エポック 30〜45分 → **4〜6時間** |
| 4. 一致の確認 | 2,000局面の評価値を **学習器・エンジン・Python（別実装）** の3つで計算して完全一致するか。さらにランダムな指し手（玉の移動を多めに）で差分計算と一からの計算が一致するか | 1分 |
| 5. 速さ | 同じ探索（12局面×30万局面）を今のネットと HalfKP で | 1分 |
| 6. 対局 | HalfKP vs 今のネット：同じ局面数（1手3万局面）・260局と、同じ持ち時間（1手0.3秒）・260局 | 30〜40分 |

数字は M4 Pro の目安です。Mac mini でもほぼ同じ、M2 は約1.5〜2倍。データの局面数は方針の2,000万局面を大きく上回ります。

## 1. 準備（最初の1回）

```sh
xcode-select --install     # C コンパイラ（入っていれば「already installed」）
pip3 install numpy         # Python での一致確認に使うだけ（無ければその確認だけ飛ばします）
```

空き容量：ダウンロード約31GB＋前処理後の学習データ約16GB（＋学習のチェックポイント約0.2GB）。前処理が終われば `~/shogi-kp-work/raw/` は消してかまいません。
前回の学習（`~/shogi-nnue-work`）で作った `train.bin` を使い回すなら、`~/shogi-kp-work/` に置く（またはリンクする）と1・2を飛ばします：
`mkdir -p ~/shogi-kp-work && ln -s ~/shogi-nnue-work/train.bin ~/shogi-kp-work/train.bin && ln -s ~/shogi-nnue-work/val.bin ~/shogi-kp-work/val.bin`

## 2. 実行する

GitHub Desktop で main を Pull してから：

```sh
cd /Users/core_tan/Documents/GitHub/aicoding/shogi
caffeinate -i bash tools/nnue/run-kp.sh
```

- 進み具合は画面と `~/shogi-kp-work/log.txt`（学習は `train.log`、「pos/s」から1エポックの時間が分かります）。
- ほかの作業もしたいときは `THREADS=8 P=6 caffeinate -i bash tools/nnue/run-kp.sh`（M4 Pro の14コアのうち約6コアが空きます。対局中の注意は上の「あなたがやること」4）。

### 設定（任意、環境変数）

| 変数 | 既定 | 内容 |
|---|---|---|
| `KMAP` | `k9` | 玉の区分：`k3`（3区分、ファイル約4倍）、`k9`（約9倍）、`k81`（本来の HalfKP、約81倍・研究用）、または81個の数字を書いたファイル（自陣から見た升 0〜80 → 区分番号） |
| `H` | 512 | 中間層（今のサイトと同じ） |
| `EPOCHS` / `LR` / `LAMBDA` | 8 / 0.0005 / 0.75 | 周回数 / 学習率 / 教師の配分（評価値 × λ ＋ 勝敗 × (1−λ)） |
| `COUNT` / `ROUND` | 100 / 1 | ダウンロードするファイル数 / 別のファイルの組（`ROUND=2` で別の100ファイル） |
| `INIT` | 今のサイトのネット | `none` で一から（おすすめしません） |
| `MNODES` / `MTIME` / `MGAMES` | 30000 / 300ms / 20 | 対局の局面数 / 持ち時間 / 1プロセスあたりの局数 |
| `THREADS` / `P` | 全コア / コア数−1 | 学習のスレッド数 / 対局の同時プロセス数 |
| `WORK` | `~/shogi-kp-work` | 作業フォルダ（設定を変えて別に回すときは別のフォルダに） |

## 3. 止める・再開する

- **止める**：`Ctrl-C`。ターミナルを閉じても、再起動しても大丈夫です。
- **再開**：同じコマンドをもう一度（`cd` から）。ダウンロードは続きから、前処理は終わっていれば飛ばし、
  **学習は10分ごとと各エポックの終わりに保存する `kp.bin.ckpt`（重み・Adam の状態・エポック内の位置）から続き** です。
- **学習をやり直す**：`~/shogi-kp-work/train.done` と `kp.bin.ckpt` を消して実行。区分（`KMAP`）や `H` を変えるときも同じです。
- **確認と対局だけやり直す**：`train.done` を残したまま同じコマンド（学習は飛ばします）。

## 4. 結果の見方

`log.txt` の最後のほう：

```
check: trainer = engine (= Python: same) on 2000 positions        ← 必ずこうなる（ならなければ check-*.txt を送ってください）
walk: … 0 mismatches                                               ← 必ず 0
speed current: … 900 knps …                                        ← 速さ（knps）の比を見る
speed HalfKP:  … 850 knps …
HalfKP vs current (30000): +150 -90 =20  score 0.615  Elo +81 (+38 .. +125)
HalfKP vs current (300ms): +140 -100 =20  score 0.577  Elo +54 (+12 .. +97)
```

- **同じ持ち時間（300ms）の行** が判断の基準です。Elo とカッコの下側がプラスなら、今のネットより強いと言えます。
- 学習の様子は `train.log` の各エポックの `valid`（小さいほど良い。今のネットは水匠5の検証データで 0.0296 前後）。
- 途中で確かめたいとき：`bash tools/nnue/match-kp.sh ~/shogi-kp-work/kp.bin 300ms 20`（`kp.bin` は毎エポック上書きされる最新版）。

## 5. 送ってほしいもの

送るのは `~/shogi-kp-work/` の **`kp-candidate.bin.gz`（ネット本体、約12〜25MB）・`log.txt`・`train.log`** の3つ。どちらかの方法で：

**A. Claude のチャットに添付する**（いちばん簡単）：3つのファイルをチャットにドラッグして「将棋の HalfKP 候補」と書いて送る。

**B. GitHub Desktop で新しいブランチに入れる**：

```sh
mkdir -p /Users/core_tan/Documents/GitHub/aicoding/shogi/tools/nnue/results
cp ~/shogi-kp-work/kp-candidate.bin.gz ~/shogi-kp-work/log.txt ~/shogi-kp-work/train.log \
   /Users/core_tan/Documents/GitHub/aicoding/shogi/tools/nnue/results/
```

GitHub Desktop で **Current Branch → New Branch**（例：`shogi-kp-results`）→ Summary に「shogi: HalfKP candidate」と書いて **Commit → Publish branch（Push）**。
そのあと Claude に **ブランチ名** を伝える（main には直接コミットしない）。GitHub は1ファイル100MBまでなので、`kp-candidate.bin.gz` が100MBを超えるときは A にする。

（Claude の作業環境からは Hugging Face に届かないので、Hugging Face には上げないでください。学習データは MIT ですが大きいので送らなくて大丈夫です。）

## より大きなネットにする場合

ネットの大きさは設定で変えられます：中間層 `H`（既定 512）と玉の区分 `KMAP`（既定 `k9`）。例：`H=768 WORK=~/shogi-kp-768 caffeinate -i bash tools/nnue/run-kp.sh`
（前処理済みのデータは `ln -s ~/shogi-kp-work/train.bin ~/shogi-kp-work/val.bin ~/shogi-kp-768/` で使い回せます）。

ブラウザでの速さ（wasm SIMD、Node.js、同じ8局面×20万局面、この作業環境）：

| ネット | 速さ | 今との比 | 重み（メモリ） | gzip 後の目安 |
|---|---|---|---|---|
| 今（区分なし・512） | 278 千局面/秒 | 1.00 | 2.6MB | 1.3MB |
| **`k9`・512（おすすめ）** | 245 | 0.88 | 23MB | 12〜25MB |
| `k9`・768 | 200 | 0.72 | 35MB | 18〜35MB |
| `k9`・1024 | 205 | 0.74 | 47MB | 24〜45MB |

- 読む局面数が2倍で約 +100 Elo（将棋の自己対局の計測）なので、速さ 0.88 は約 −20 Elo、0.72 は約 −50 Elo の損になります。ネットの精度でこれを上回れば得です。
- **おすすめは `k9`・512**：HalfKP にする効果（玉の位置で駒の価値が変わる）が一番大きく、速さの損は約1割で済みます。同じ持ち時間（300ms）で勝ち越すかを最初に確かめます。
- 512 で勝ち越したら、次に **768** を試す価値があります（評価がさらに細かくなる分が −30 Elo 前後の速さの差を上回るか。データは約4億局面あるので足ります）。1024 は 768 とほぼ同じ速さに見えますが、計測の揺れが大きいので 768 で伸びたときだけ。
- 区分を増やす（`k81`＝本来の HalfKP）と速さはほぼ同じままファイルが約9倍（200MB 級）になるので、サイト向けではありません。逆に小さくしたいときは `k3`（約4倍）。
- 速さは `node tools/nnue/wasm-bench.js <wasm> <net>` で測れます（wasm は `WASM=1 bash tools/nnue/build-kp.sh <フォルダ> <net>` で作れます）。区分を変えたときの約1割の遅れは、玉が動いたときの計算を区分ごとに取っておく工夫（Finny table）で縮められる見込みです（採用するときに Claude 側で）。

## 6. サイトに載せるまでに必要なこと（Claude 側、結果を見てから）

今回はエンジンにビルドの指定で切り替わる評価を入れただけで、サイトは何も変わっていません。勝ち越したら次を行います：

1. `engine.js` に新しいファイル形式（先頭 `NUEK`、区分の表つき）の読み込みと、`-DNUE_KB=9 -DNUE_H=512` の wasm（通常版・マルチスレッド版）の追加。wasm 自体は 95KB（今は 89KB）ですが、**メモリ上の重みが約23MB**（今は約2.6MB）。
2. **ダウンロードの大きさ**：gzip 後で約12〜25MB（今は約1.3MB）。スマホ向けに、`k3`（約4倍）で試す、または「共通の重み＋区分ごとの差分」の形で送ってブラウザで足し込む（差分は小さく圧縮が効く）などを比べます。
3. 段級位（`LEVELS` の局面数）とレーティング戦の基準（`RT_LV`）の測り直し、`MODEL_CARD.md` の更新。

## 7. 個別のコマンド

```sh
W=~/shogi-kp-work
bash tools/nnue/build-kp.sh $W [net]                         # ビルド（net を渡すとその区分数・H で kptool を作る）
$W/trainkp $W/train.bin a.bin --kb k9 --hidden 512 --init $W/cur.bin --val $W/val.bin   # 学習（続きは a.bin.ckpt から）
$W/trainkp --check a.bin $W/val.bin 2000 dump.txt > t.txt    # 学習器側の整数計算（＋局面を dump.txt に）
$W/kptool-9-512 evalpos a.bin $W/val.bin 2000 > e.txt        # エンジンの評価
python3 tools/nnue/kpcheck.py a.bin dump.txt > p.txt         # Python（NumPy）の別実装。t.txt・e.txt・p.txt は完全に同じになる
$W/kptool-9-512 walk a.bin $W/val.bin 2000                   # 差分計算の確認（mismatches 0）
$W/kptool-9-512 bench a.bin 300000 12                        # 速さ（ネイティブ）
bash tools/nnue/match-kp.sh a.bin 300ms 20                   # 対局（今のネットと）
node tools/nnue/wasm-bench.js engine_simd512.wasm $W/cur.bin   # ブラウザでの速さ（HalfKP は WASM=1 build-kp.sh の engine_kp.wasm と kp.bin で）
$W/kptool-9-512 gen a.bin sp.psv 100 5000                    # 自己対局のデータ（PackedSfenValue、追記。足したいとき）
```

- `-DNUE_KB=1` で作った `kptool` は今の `nnue.bin` をそのまま読み、サイトのエンジンと同じ探索になります（ベンチのチェックサムが一致することを確認済み）。
- 区分の境目（`k9`）：自陣から見た段 8（一段目）／7（二段目）／それ以外 × 筋 0〜2（9〜7筋）／3〜5（6〜4筋）／6〜8（3〜1筋）。後手は盤を180°回して同じ表。

## この作業環境での確認（2026-11-08）

インターネットからデータを取れない環境なので、サイトのエンジン＋今のネットの自己対局（`kptool gen`、50局・約4,300局面 → 前処理後 約2,800局面）で、`run-kp.sh` を最後まで通しました（2エポック、数秒）。

- 学習器・エンジン・Python の評価値：2,000局面で完全一致。
- 差分計算：ランダムな指し手 約1万8千回（玉の移動 約1万8千回、うち区分が変わった 約1万回）で、一からの計算と全部一致。
- 今のネットを出発点に学習率0で1エポック回したネット（＝今のネットと同じはず）は、評価値が今のネットと完全一致、探索のチェックサムも一致。
- `-DNUE_KB=1` のビルドに今のネットを読ませると、サイトのエンジンとベンチのチェックサムが一致。
- 通常の wasm（`engine.wasm`・`engine_simd.wasm`・`engine_simd512.wasm`・`engine_mt.wasm`）は作り直してもバイト単位で同じ（`cmp`）。
- 小さなデータでの対局（1手1,500局面・4局）は2勝2敗。データが少なすぎて強さの判断にはなりません。強さは Mac での本番の学習で測ります。

2026-11-11 に今の main（YBW・Lazy SMP 化後の `engine.c`）で再確認済み：同じ方法で `run-kp.sh` が最後まで通り（clang・gcc とも）、学習で重みを実際に動かしたネット（`TRAIN_OPTS="--batch 256"`）でも学習器・エンジン・Python・`engine_kp.wasm` の評価値が2,000局面で一致、差分計算の不一致 0、`-DNUE_KB=1` のビルドはサイトのエンジンとベンチのチェックサムが一致。
