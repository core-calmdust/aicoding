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

## 入れ替え（2026-11-23 に実施：`w_b60e4_13m.bin.gz` → `reversi/weights.bin.gz`、`?v=5`。次に入れ替えるときは `?v=6`。`weights.pk.bin.gz` は廃止）
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

## 設定の組み合わせを同じ時間で比べる（frontier.js、2026-11-19）
`rvmatch` は各側の「考えた時間」も出すようになりました。`frontier.js` は、たくさんの設定（深さ・t・読み切り・終局まで読む範囲・終局読みの誤差幅）を今の Lv.28 と対局させ、Elo と時間の表を作ります（止めても続きから）。手順と見方は `claude/reversi-mac-verification.md`。
```sh
node frontier.js run --plan stage1 --base lv28 --n 1000     # mech（枝刈りの仕組み）、stage2（組み合わせ）、extreme（今の10〜100倍の時間）。--base lv31 / lv34 で深い基準
node frontier.js table --base lv28
EDAX=…/mEdax node ../edax-anchor.js --levels 12,15,18,21 --base lv28     # Edax を同じ基準に対する物差しに（tools/edax-anchor.js）
```
- `rvmatch match … --engine a.so --engine-b b.so`：別々にビルドしたエンジンどうしの対局（`-DENDK=130`：終局読みの誤差幅を 1.3倍、`-DMPC_NONEST`：試しの読みの中では枝刈りしない、`-DMPC_PRE=200`：静的評価が境から2石以内のときだけ試す、`-DEVOFF_E=150 -DEVOFF_O=190`：評価値の手番側へのずれを補正＝空きが偶数なら −1.5石・奇数なら +1.9石（`frontier.js --plan bias`）。`frontier.js` が自動で作ります）。どれも付けないビルドは今までと同じバイナリです。

## 着手可能数なしの評価を試す（2026-11-20）
評価の追加特徴（着手可能数・潜在的着手可能数）は、1回の評価で着手生成を2回行う。外すと1局面が軽くなり、同じ時間で深く読める（Edax・Egaroucid は入れていない）。精度が落ちるぶんとの差し引きを、Edax 相手に同じ時間で比べる。`rvtrain train --ext 0` で「パターンだけ」の重みを学習できる。

```sh
cd reversi/tools/train && git pull
cc -O3 -o rvtrain rvtrain.c -lz -lm -lpthread
# 夜に続けて回す（1本 2〜4時間）。1本目は比較の基準（今と同じ形を同じデータ・同じやり方で学習し直したもの）
caffeinate -i sh -c '
./rvtrain train pairs.bin games.bin --out w_b30e4.bin.gz --set B --phases 30 --ext 4 --init ../../weights.bin.gz --threads 10 2>&1 | tee train_b30e4.log
./rvtrain train pairs.bin games.bin --out w_b30e0.bin.gz --set B --phases 30 --ext 0 --init ../../weights.bin.gz --threads 10 2>&1 | tee train_b30e0.log
./rvtrain train pairs.bin games.bin --out w_c60e0.bin.gz --set C --phases 60 --ext 0 --init ../../weights.bin.gz --threads 10 2>&1 | tee train_c60e0.log
for w in b30e4 b30e0 c60e0; do ./rvlabel mpc games.bin --weights w_$w.bin.gz --n 1500 --depth 12 --write w_${w}m.bin.gz | tee mpc_$w.log; done'
# 速さ（1分）と、Edax 相手の同じ時間の比較（各 約10分）
cd ../.. && node tools/train/nps.js weights.bin.gz tools/train/w_b30e4m.bin.gz tools/train/w_b30e0m.bin.gz tools/train/w_c60e0m.bin.gz --depth 13 --rounds 3
E=~/edax-reversi/bin/mEdax-armv8.5-a
for w in b30e4m b30e0m c60e0m; do EDAX=$E node tools/edax-anchor.js --levels 18 --n 150 --bases "17,20,22,26;18,22,24,28;20,22,24,28" --weights tools/train/w_$w.bin.gz; done
node tools/edax-anchor.js --table
```
見るところ：`--table` で、同じ時間のところの Elo が `w_b30e0m`／`w_c60e0m` のほうが今の評価・`w_b30e4m` より高いか。高ければ公開の評価を入れ替える（`weights.bin.gz`、MPC の幅、Praline の一致の約束の更新が要る）。

## 10億局面級の学習（2026-11-22）
これまでの学習は、手元の対局棋譜（約5,200万局）から局面を20%だけ抜き出した約3億局面でした。抜き出す割合を上げると同じデータから約12〜13億局面になります（Egaroucid は18億以上、Kalmia は約13億）。全部をメモリに載せると 64GB に収まらないので、局面を**手数ごとのファイル**に分けて書き出し、学習は今の段に要る手数だけ読みます（`rvtrain extract <フォルダ>/`・`rvtrain train <フォルダ>`。1本のファイルからの学習と同じ重みになることを確認済み）。

置き場所は外付けディスク（約21GB）。評価の形は今と同じ（パターンB・着手可能数あり）で、段だけ1手ごと（60段）にします（手番側への偏りが出ない形）。1手あたり約4,700万局面あるので、前後の手数を混ぜる窓は使いません（`--window 0`）。

```sh
cd reversi/tools/train && git pull
cc -O3 -pthread -o rvtrain rvtrain.c -lz -lm
D="/Volumes/Orico A 8TB/shogi_data/reversi_data"
mkdir -p "$D"
# 1) 局面の取り出し（1〜2時間の見込み。途中で止めたら "$D/games90" を消してやり直す）
caffeinate -i ./rvtrain extract "$D/games90/" --games --skip auto --frac 0.9 ~/data/Egaroucid_Train_Data_v0002_0 ~/data/Egaroucid_Train_Data_v0002_1
du -sh "$D/games90"
# 2) 学習2本（続けて。1本目＝13億局面：一晩〜半日の見込み、2本目＝比較の基準：同じやり方で今までの約3億局面、1〜2時間）
caffeinate -i sh -c '
./rvtrain train pairs.bin "'"$D"'/games90" --out w_b60e4_13.bin.gz --set B --phases 60 --ext 4 --window 0 --init ../../weights.bin.gz --threads 10 2>&1 | tee train_b60e4_13.log
./rvtrain train pairs.bin games.bin --out w_b60e4_3.bin.gz --set B --phases 60 --ext 4 --window 0 --init ../../weights.bin.gz --threads 10 2>&1 | tee train_b60e4_3.log
for w in b60e4_13 b60e4_3; do ./rvlabel mpc games.bin --weights w_$w.bin.gz --n 1500 --depth 12 --write w_${w}m.bin.gz | tee mpc_$w.log; done'
# 3) 比較（Edax 相手、同じ時間。各 約20分。1,000局ずつ＝誤差 約±9）
cd ../.. && E=~/edax-reversi/bin/mEdax-armv8.5-a
for w in b60e4_13m b60e4_3m; do EDAX=$E node tools/edax-anchor.js --levels 18 --n 500 --bases "18,22,24,28" --weights tools/train/w_$w.bin.gz; done
EDAX=$E node tools/edax-anchor.js --levels 18 --n 500 --bases "18,22,24,28"
node tools/edax-anchor.js --table
```
- メモリの目安：13億局面の学習で 15〜20GB。
- 見るところ：`w_b60e4_13m`（13億）が `w_b60e4_3m`（3億、同じやり方）と今の評価を、同じ時間で上回るか。上回れば公開の評価を入れ替え、そのあと定石を新しい評価で作り直す。
- 学習の途中経過は `train_b60e4_13.log`（段ごとの検証誤差）。3億のときより検証誤差が下がっているかも見る。
