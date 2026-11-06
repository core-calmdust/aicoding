# リバーシ評価関数の学習（tools/train）

`weights.bin.gz`（パターン評価、30フェーズ）を、Egaroucid の公開学習データで学習し直すための一式です。
今の重みは約4,800万局面（局面と評価値のペア約2,550万＋対局棋譜約195万局分）で学習しています。対局棋譜（約5,200万局）を大幅に増やすのが今回の狙いです。

## 1. データを用意する（利用規約により再配布は不可。各自ダウンロード）
[Egaroucid の学習データのページ](https://www.egaroucid.nyanyan.dev/ja/technology/train-data/) から：
- `Egaroucid_Train_Data.zip`（局面と評価値のペア 約2,550万）
- `Egaroucid_Train_Data_v0002_0.zip`（対局棋譜：序盤ランダム8〜33手）
- `Egaroucid_Train_Data_v0002_1.zip`（対局棋譜：序盤ランダム34〜59手）

展開したら、棋譜のフォルダ構成を確認してください（`ls` の結果を送ってもらえれば確認します）。
序盤のランダムな手を学習から外すため、`--skip auto` はファイルが入っている**フォルダ名の最後の数字**を「ランダムだった手数」として読みます（例 `…/0012/0000000.txt` → 最初の12手を除外）。

## 2. ビルド
```sh
cd reversi/tools/train
cc -O3 -pthread -o rvtrain rvtrain.c -lz -lm
```

## 3. 局面を取り出す
```sh
./rvtrain extract pairs.bin --pairs ~/data/Egaroucid_Train_Data
./rvtrain extract games.bin --games --skip auto --frac 0.2 ~/data/Egaroucid_Train_Data_v0002_0 ~/data/Egaroucid_Train_Data_v0002_1
```
- 1局面17バイト。棋譜は各局の局面を2割だけ使います（`--frac`。全部使うと似た局面ばかり増えるため）。全部で約3億局面・5GB前後の見込みです。
- 棋譜の教師値は終局の石差（空きマスは勝った側に加算）、ペアの教師値は Egaroucid の評価値です。

## 4. 学習
```sh
./rvtrain train pairs.bin games.bin --out weights_new.bin --init ../../weights.bin.gz --iters 300 --threads 8
gzip -9 -k weights_new.bin
```
- 今の重みから始めて、フェーズごと（2手ずつ、前後1手を含む）に最小二乗で学習します。データの2%を検証用に取り分け、検証誤差が一番小さかった時点の重みを残します。
- ログの `validation rmse of the initial weights`（今の重み）と `done: val rmse`（学習後）を比べれば、どれだけ良くなったかが分かります。
- メモリはデータ全体（約5GB）＋フェーズごとの特徴（数GB）。64GBあれば余裕です。

## 5. できたら
`weights_new.bin.gz` と学習ログを送ってください。Egaroucid for Web（最強）との自動対戦で今の重みと比べてから入れ替えます。

`rvtrain check weights.bin.gz pairs.bin 10` で、エンジン（engine.js）と同じ評価値になることを確認できます（学習と対局で特徴の取り方が一致していることの確認用）。
