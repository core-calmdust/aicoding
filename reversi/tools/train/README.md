# リバーシ評価関数の学習（tools/train）

`weights.bin.gz`（パターン評価）を学習し直すための一式です。今の重みは **v4**（30フェーズ、2手ごと）。
**v5** はこのフォルダの道具で Mac で学習し、今の v4 と対戦させて強ければ入れ替えます（MODEL_CARD.md「評価関数 v5」）。

## v5 で変えるところ
| | v4（今） | v5 |
|---|---|---|
| フェーズ | 30（2手ごと） | **60（1手ごと）**：手番の偶奇（空きマスの偶奇）を別々に学習できる |
| パターン | セット B（15種・62個） | **セット C** = B ＋「cross」（a1〜d4 の対角とその両隣の10マス、4個） |
| 追加特徴 | 着手可能数・潜在的着手可能数（4種） | ＋**自分の石数**（5種） |
| Multi-ProbCut | v4 用の値（engine.js 固定） | **新しい評価関数で測り直した値を重みのファイルに入れる** |
| ファイル | Int16 の並びだけ | 先頭に16語のヘッダー（形式・フェーズ数・パターン・MPC）、フェーズ間の差分＋バイトの分割で gzip が縮む |
| 大きさ | 8.6MB | 学習後に決まる（見込み 10〜13MB） |

- 読みの速さはほぼ同じ（この作業機の1スレッドで v4 と ±5% 以内）。
- 古い v4 のファイルはそのまま読めます（ヘッダーの有無で判別）。エンジン（engine.js / engine.wasm / engine_mt.wasm）は先に v5 対応済み。**入れ替えは weights.bin.gz の差し替えと ?v= の更新だけ**です（下の「入れ替え」）。
- 自前の深い読みで教師値を付け直す道具（`rvlabel label`）も用意しましたが、Egaroucid のデータ（約3億局面）に対して一晩で付け直せる量（100〜200万局面）では効き目が小さいので、**最初の学習には使いません**（下の「おまけ」）。

## Mac での手順（順番どおり）
作業フォルダ：`reversi/tools/train`。`~/data` は Egaroucid のデータを置いた場所（v4 のときと同じ）に読み替えてください。

### 1. ビルド（数秒）
```sh
cd reversi/tools/train
cc -O3 -pthread -o rvtrain rvtrain.c -lz -lm
cc -O3 -o rvlabel rvlabel.c -lz -lm
```

### 2. 局面を取り出す（v4 のときの `pairs.bin` / `games.bin` が残っていれば不要。30〜60分）
[Egaroucid の学習データのページ](https://www.egaroucid.nyanyan.dev/ja/technology/train-data/) から（利用規約により再配布不可。各自ダウンロード）
`Egaroucid_Train_Data.zip`（局面と評価値のペア 約2,550万）、`Egaroucid_Train_Data_v0002_0.zip`・`_1.zip`（対局棋譜 約5,200万局）。
```sh
./rvtrain extract pairs.bin --pairs ~/data/Egaroucid_Train_Data
./rvtrain extract games.bin --games --skip auto --frac 0.2 ~/data/Egaroucid_Train_Data_v0002_0 ~/data/Egaroucid_Train_Data_v0002_1
```
（`--skip auto` はフォルダ名の最後の数字＝ランダムだった手数を学習から外します。全部で約3億局面・5GB 前後）

### 3. 学習（2〜4時間）
```sh
./rvtrain train pairs.bin games.bin --out weights_v5.bin.gz --init ../../weights.bin.gz --threads 10 2>&1 | tee train_v5.log
```
- 既定：セット C・60フェーズ・追加特徴5種・300回・**同じ偶奇の前後の手（±2手）**を重み0.3で含める（`--wstep 2`。2026-11-12 より。それまでは±1手＝手番の偶奇が逆の局面を混ぜていた）・重みは 1/16 石単位で保存（`--quant 2`）。
- `--tie 1`：自分自身の鏡像になるパターン（辺・列・対角・隅など）で、鏡像の並びを同じ重みにする（そのテーブルのパラメータが半分になり、少ないデータでも当たりやすい。ファイルの形式とエンジンはそのまま）。
- v4 の重みから始めます（同じ手数の v4 のフェーズ、増えた cross と石数は0から）。
- 1フェーズごとに `validation rmse of the initial weights`（v4 の誤差）と `done: val rmse`（学習後）が出ます。経過と残り時間（ETA）も出ます。
- メモリ：全局面で約7GB＋フェーズごとに最大約5GB。足りなければ `--max-pos 20000000`（1フェーズの局面数の上限）。

### 4. Multi-ProbCut を測り直す（10〜20分）
```sh
./rvlabel mpc games.bin --weights weights_v5.bin.gz --n 1500 --depth 12 --write weights_v5m.bin.gz | tee mpc_v5.log
```
新しい重みで「深い読みと浅い読みの差」を測り、MPC の幅（sigma = A + B·深さ + C·空きマス）を重みのファイルのヘッダーに入れた `weights_v5m.bin.gz` を作ります。比較のため、v4 でも同じように測ってください（v4 の重みは変えずに、測った値を入れた別ファイルを作るだけ）：
```sh
./rvlabel mpc games.bin --weights ../../weights.bin.gz --n 1500 --depth 12 --write weights_v4m.bin.gz | tee mpc_v4.log
```

### 5. 速さを比べる（1分）
```sh
cd ../..          # reversi/
node tools/train/nps.js weights.bin.gz tools/train/weights_v5m.bin.gz --depth 13 --rounds 3
```

### 6. 対戦で比べる（約1〜2時間）
v4（A）と v5（B）を同じ設定で対戦させます（定石の終わりから、先後入れ替え）。
```sh
node tools/levelmatch.js --plan D10:D10,L20:L20,T2:T2 --games 100 --wb tools/train/weights_v5m.bin.gz --out tools/levelmatch-out/results-v5.jsonl
node tools/levelmatch.js report --out tools/levelmatch-out/results-v5.jsonl
```
- D10：深さ10固定（評価関数そのものの差）、L20：Lv.20 の設定、T2：1手2秒（速さの差も含む）。
- 止めても同じコマンドで続きから。v4m（MPC を測り直しただけの v4）も見たいときは `--wa tools/train/weights_v4m.bin.gz` を付けた別の `--out` で。

### 7. 送ってほしいもの
1. `train_v5.log` の `done:` の行（`grep done train_v5.log`）と最後の `wrote` の行
2. `mpc_v5.log` と `mpc_v4.log`（全部）
3. 手順5の出力
4. 手順6の `report` の出力（「ここからコピー」〜「ここまで」）
5. `ls -l tools/train/weights_v5m.bin.gz`（大きさ）
6. 勝っていれば `weights_v5m.bin.gz` そのもの（GitHub Desktop で `reversi/weights_v5.bin.gz` として追加しても可）

## 入れ替え（v5 が勝ったとき。Claude が行います）
1. `weights_v5m.bin.gz` → `reversi/weights.bin.gz`（gzip 済みなので再圧縮不要）、`weights.json` を `{"nphase":60,"version":5,…}` に。
2. `weights.bin.gz?v=4` → `?v=5`：`reversi/index.html`・`reversi/pro/pro.js`・`reversi/bench.html`・`atlas/games/reversi.js`（atlas は `atlas/lazy.js` の `games/reversi.js?v=` と `atlas/index.html` の `lazy.js?v=` も上げる）。`pro/pro.js` を変えたら `pro/index.html` の `pro.js?v=` も。
3. `reversi/sw.js` の `CACHE` を上げる（weights は DATA の扱いでキャッシュ優先のため必須）。
4. MODEL_CARD.md の概要の表（フェーズ・パターン・パラメータ数・大きさ）を v5 に。
エンジン（engine.js `decodeV5` / engine.c `w_alloc`）はこの時点で v5 対応済みなので変更不要です。

## 強さを測る（rvmatch、2026-11-12）
重みや設定の差を、**ゲームと同じ探索をネイティブで**、たくさんの互角の序盤から測ります（定石なし・時間なし。1つの序盤を先後入れ替えて2局）。
`levelmatch.js` の100局では ±30 Elo までしか見分けられませんが、これは数千局が数分で終わり、±5〜10 Elo まで見分けられます。
```sh
cd reversi/tools/train
cc -O3 -shared -fPIC -DENGINE_ALLOC=malloc -DENGINE_OWN_NOW -o rveng.so ../../engine.c     # エンジンをライブラリに（engine.c を変えたら作り直す）
cc -O3 -o rvmatch rvmatch.c -ldl -lz -lm
./rvmatch openings pairs.bin op10.bin                                      # 互角の序盤 3000個（10手目・黒番・評価 ±1石以内。1回だけ）
# 重みの比較：A = 今の重み、B = 新しい重み。深さ10・完全読み16・勝敗読み18 で 3000序盤×2局
./rvmatch match op10.bin --wb weights_v5m.bin.gz --n 3000
# 設定の比較（同じ重み）：A は深さ11、B は深さ10
./rvmatch match op10.bin --a 11,16,18 --b 10,16,18 --n 2000
# 先後の釣り合い：A・B を同じにして「先に打つ側の成績」を見る
./rvmatch match op10.bin --n 3000
./rvmatch match op10.bin --ma 3 --mb 2 --n 2000                           # 探索 v8 の MPC（残り深さ2から）と以前（3から）を同じ深さで（rveng.so は新しい engine.c）
```
- 出力：A の得点率・Elo・平均石差（± は標準誤差。**2倍を超えたら差がある**と見てよい）、先に打つ側／後に打つ側の別。
- `--a 深さ,完全読み,勝敗読み[,end]`（今の Lv.20 は `13,20,22,26`。4つ目は「このマス数以下なら終局まで読む」＝ `engine.js` の `lv.end`、省くと なし）、`--procs`（既定は全コア）、`--ta 0`（MPC なし）、`--games out.txt`（棋譜）。
- 先後の釣り合いは、**読み切りを始めるマス数の偶奇だけで 1〜1.5石動きます**（偶数なら黒、奇数なら白が先に読み切りに入る）。自己対局の白黒の偏りは、エンジンの良し悪しの物差しにはなりません（MODEL_CARD.md「根本原因の調査」）。

## 評価の片寄りを見る（rvtrain bias）
```sh
./rvtrain bias ../../weights.bin.gz games.bin --every 200
```
手数ごとに「教師の平均」「評価 − 教師の平均（手番側から見た片寄り）」「誤差」を出します。v4 は偶数手目 +1.8石・奇数手目 −1.8石（黒に甘い）。60フェーズで偶奇を混ぜずに学習した重みは ±0.2 石以内になるはずです。

## 道具の一覧
- `rvmatch openings | match`：重み・設定どうしの対戦（上の「強さを測る」）。
- `rvtrain extract | train | rmse | bias | check | setmpc`：取り出し・学習・誤差（`rvtrain rmse 重み 局面.bin`：4手ごとの誤差）・エンジンと同じ評価値か（`check`）・MPC の値の書き換え。
- `rvlabel label | selfplay | mpc | probe`：ゲームと同じ探索（engine.c をそのままネイティブでビルド）を全コアで（プロセスを分けて）回します。止めても同じコマンドで続きから、進み具合と残り時間を表示。
- `probe.js`：`rvlabel probe` と同じことを engine.js（engine.wasm）で。両者の出力が一致すれば、Mac で学習・計測したものとページの評価・探索が同じです（この作業機で v4・v5 とも一致を確認済み）。
- `nps.js`：重みのファイルごとの読みの速さ。
- `gen-patterns.js`：engine.js のパターン定義から `patterns.h` を作る（パターンを変えたとき）。

## おまけ：自前の教師値（必要になったら）
```sh
# 局面の一部（--take 0.005 ≒ 150万局面）を深さ14＋空き22マス以下は完全読みで付け直す（一晩、全コア）
./rvlabel label games.bin deep.bin --weights weights_v5m.bin.gz --depth 14 --exact 22 --empties 14-54 --take 0.005
# 学習に足す（:3 = その局面の重みを3倍）
./rvtrain train pairs.bin games.bin deep.bin:3 --out weights_v5b.bin.gz --init weights_v5m.bin.gz --threads 10
```
対局棋譜の終局石差よりは正確ですが、量が全体の1%未満なので効果は小さい見込みです。
