# リバーシの定石（book.bin）を Mac で大きく作る手順

`book-gen.js` は、初期局面から定石の木を広げながら、各局面のすべての手を深い探索（ゲームと同じ評価関数・探索、Multi-ProbCut あり）で読み、
最後に木をたどって評価値を negamax で戻して `reversi/book.bin` を作ります。

- 1局面ずつ置換表を空にして、時間制限なしの固定深さで読むので、**同じ設定なら何度やっても同じ結果**になります（`verify` で確認できます）。
- 読み終わった局面は1行ずつ `<作業フォルダ>/nodes.jsonl` に書き足すので、**いつ止めても同じコマンドで続きから再開**できます。
- 1手目から順に（幅優先で）広げます。最善から `--window` 石以内の手の先を読み、片方の手番の損の合計が `--err` 石を超える変化は打ち切り、
  1手ごとの局面数は `--cap` まで（損の少ない順）。本線ほど深く（`--max-ply` まで）、脇道は浅くなります。
- 今の book.bin は **v3**：Mac（14コア）で `--depth 20 --max-ply 26 --cap 3000 --err 4 --window 3 --keep 3` で作ったもの（下の「生成の記録」）。
  その元データ `book-work/nodes.jsonl.gz` と `book-work/config.json` もリポジトリに入っていて、`build` で同じ book.bin を作り直せます。

## v4 で増やしたこと（2026-11-11）

| | v3 | v4（おすすめの設定） |
|---|---|---|
| 本線（両者の損の合計 3 石以内、1手 2,000 局面まで） | 深さ 20 | **深さ 24**（`--deep 24 --deep-err 3 --deep-cap 2000`） |
| そのほか | 深さ 20 | 深さ 20（v3 の 44,343 局面は**そのまま使う**、`--from book-work`） |
| 何手目まで | 26 | **30**（`--max-ply 30`） |
| 1手ごとの局面数・損の上限 | 3,000・4 石 | **4,000・5 石** |
| 実戦の手順 | なし | **WTHOR（大会の棋譜）で 3 局以上に出た局面を必ず入れる**（`--lines`、任意） |
| 読むエンジン | `engine.wasm` | `engine_mt.wasm` を1スレッドで（置換表が大きく、深さ20で約1.5倍速い。値はほぼ同じ） |
| 評価値の戻し方 | 子の値で上書き | 子の値が親の読みより先まで見ているときだけ上書き（深さ24の本線を深さ20の脇道で上書きしない） |

- 形式は v3 と同じ（`engine.js decodeBook` はそのまま）。v3 の作業フォルダは読むだけで、新しい結果は `book-work-v4/` に書きます。
- 黒番の定石（AI が黒で選ぶ手と、相手の強い応手）は本線にあたるので、深さ24で読み直されます。

## 1. 準備（最初の1回）

```sh
node -v          # v18 以上（なければ: brew install node）
cd ~/Documents/GitHub/aicoding
git pull         # （GitHub Desktop の Fetch / Pull でも可）
cd reversi/tools
```

### （任意）実戦の棋譜 WTHOR を用意する
フランスオセロ連盟の公開データベース WTHOR（https://www.ffothello.org/informatique/la-base-wthor/ ）から、
年ごとのファイル `WTH_年.wtb` をダウンロードして `~/data/wthor/` に入れてください（全部の年でも、最近20年ほどでも可。zip は展開）。
リポジトリには入れません（`--lines` で場所を指定するだけ）。使わないときは下のコマンドの `--lines …` 以降を外してください。
テキストの棋譜（1行1局、`f5d6c3d3c4…`）も使えます（例：Egaroucid との対局の棋譜。同じフォルダに `.txt` で置く）。

## 2. 見積もりを見てから生成を始める

```sh
# 見積もり（読まずに数えるだけ。数秒〜1分）
node book-gen.js plan --dir book-work-v4 --from book-work --deep 24 --deep-err 3 --deep-cap 2000 --max-ply 30 --cap 4000 --err 5 --lines ~/data/wthor

# 生成（v4。M4 Pro で約1日の見込み）
caffeinate -i node book-gen.js run --dir book-work-v4 --from book-work --deep 24 --deep-err 3 --deep-cap 2000 --max-ply 30 --cap 4000 --err 5 --lines ~/data/wthor
```

- `caffeinate -i` は実行中に Mac がスリープしないようにするコマンドです（ふたを閉じる MacBook は電源につないだまま）。
- スレッド数は自動（CPU コア数 − 1 = 13）。ほかの作業もしたいときは `--threads 8` のように減らしてください。メモリは1スレッド約0.2GB。
- 最初に「棋譜 ◯ ファイル・◯ 局：…局面 ◯」と出ます（WTHOR が読めたかの確認）。そのあと「◯手目: 読んだ数/その手目の数、1局面あたりの秒数、その手目の残り時間」。
- 深さ24の局面（本線）を各手目の先に読むので、各手目の前半は遅く、後半は速く進みます。
- **1〜2時間たったら**、別のターミナルで `node book-gen.js plan --dir book-work-v4` を実行すると、実際に読んだ秒数から残り時間を出し直します。

### 時間の目安（M4 Pro、13スレッド）

v3 の記録（深さ20：1局面 平均 3.6 秒/スレッド）と、この作業環境で測った深さごとの伸び（深さ2つで約3倍）・`engine_mt.wasm` の速さ（深さ20で約1.5倍、22で約1.7倍）からの見積もりです。
`plan` は `engine.wasm` の v3 の秒数をもとに出すので、最初は少し長め（下の表の上の端）に出ます。

| 設定 | 新しく読む局面 | 目安 |
|---|---|---|
| **v4 おすすめ**（上のコマンド） | 深さ24 約2.5万・深さ20 約2.2万 | **約 12〜20 時間** |
| WTHOR を足した分 | ＋ 数千〜1万（ほとんど深さ20） | ＋ 1〜3 時間 |
| 終わってから余裕があれば：`run --dir book-work-v4 --deep-cap 3000` で再開 | 深さ24 ＋約0.8万 | ＋ 約 6〜8 時間 |
| 短く試すとき：`--deep 22`（別の `--dir`） | 深さ22 約2.5万 | 約 4〜7 時間 |

`plan` の「深さ24: ◯ 局面 × ◯秒」は、深さ24をまだ読んでいないうちは深さ20の記録から推定した値です（読み始めると実測に変わります）。

## 3. 止める・再開する

- **止める**：`Ctrl-C`（読み途中の局面だけ次回やり直し。もう一度押すとすぐ終了）。ターミナルを閉じても、Mac を再起動しても大丈夫です。
- **再開**：`caffeinate -i node book-gen.js run --dir book-work-v4`（設定は `book-work-v4/config.json` に保存済み。終わった局面は読み直しません）。
- **途中で広げる**：`--max-ply` `--cap` `--err` `--window` `--deep` `--deep-err` `--deep-cap` は再開のときに変えてかまいません
  （読んだ局面はそのまま使い、足りない局面だけ読みます。深く読んだ局面は、浅くてよくなってもそのまま使います）。
  `--depth` と `--keep` は途中で変えられません（変えるときは別の `--dir` で）。
- **進み具合**：`node book-gen.js status --dir book-work-v4`（局面数・手目ごと・深さごとの数・使った時間）。

## 4. book.bin を作って確かめる（新旧の比較）

```sh
node book-gen.js build --dir book-work-v4 --book book-v4.bin     # 途中でも作れます。容量・局面数・深さごとの数・初期局面の評価（数秒）
node book-gen.js verify --dir book-work-v4 --n 4                 # 4局面を読み直して完全に一致するか（深さ24の局面なら1つ約1分）
node book-gen.js diff ../book.bin book-v4.bin                    # v3 で AI が選ぶ手のうち、v4 の評価で1石超悪い手の割合など（数秒）
node book-match.js book-v4.bin ../book.bin 200 bm-v4-lv20.jsonl 20 --threads 12   # Lv.20（深さ13）で 400局（数分）
node book-match.js book-v4.bin ../book.bin 200 bm-v4-lv23.jsonl 23 --threads 12   # Lv.23（深さ20）で 400局（約10〜20分）
node book-match.js book-v4.bin ../book.bin 100 bm-v4-lv26.jsonl 26 --threads 12   # Lv.26（深さ25）で 200局（約1〜2時間、余裕があれば）
```

### 先後の偏りの修正（2026-11-12）
`build` は既定で「手番の補正」（`--tempo-mode frontier`）をかけます（読み直しは不要、数秒。理由と測定：MODEL_CARD.md「先後の偏り」）。
最初の行に `手番の補正 T（石、読みの深さごと）{"20":0.85,"24":…}` と出ます。v4 の作業フォルダもそのまま `build` し直すだけです。

```sh
cd reversi/tools
git pull
node book-gen.js build --dir book-work-v4 --book book-v4.bin                        # v4（補正あり）
node book-gen.js build --tempo 0 --book book-v3-raw.bin                             # 比較用：補正なしの v3（以前の book.bin と同じ）
# 1) 先後の釣り合い：同じ定石どうし（黒番・白番の勝率がそれぞれ 50% 前後になるか）
node book-match.js ../book.bin ../book.bin 200 self-v3-lv20.jsonl 20 --threads 12    # 補正済み v3（今の book.bin）
node book-match.js book-v4.bin book-v4.bin 200 self-v4-lv20.jsonl 20 --threads 12
node book-match.js book-v4.bin book-v4.bin 200 self-v4-lv23.jsonl 23 --threads 12
# 2) v4 と v3（どちらも補正済み）
node book-match.js book-v4.bin ../book.bin 200 bm-v4-lv20.jsonl 20 --threads 12
node book-match.js book-v4.bin ../book.bin 200 bm-v4-lv23.jsonl 23 --threads 12
```
- 補正ありと補正なしの直接対決（`book-match.js ../book.bin book-v3-raw.bin …`）は、同じ木から作った定石どうしで補正なしの白が強く出るので強さの比較には使いません（MODEL_CARD.md）。強さは Egaroucid との対局（黒番・白番を分けて）で確かめてください。

- `book-match.js` は同じエンジン・同じレベルで、定石だけ A（v4）と B（v3）にして先後入れ替えで対局します。Lv.17〜27 は深さで決まるので、Mac の速さに左右されません。
  結果は「全体」「A が黒」「A が白」の勝率・Elo・平均石差と、定石を抜けた手数。止めても同じコマンドで続きから。
- `build` の表示の「gzip ◯ KB」と「◯ KB」がページで読み込む大きさの目安です。v4 は約 7〜9万局面・600〜800 KB（gzip 450〜550 KB）の見込み
  （ページは book.bin をそのまま取得。v3 は 340 KB）。大きすぎるときは `--out-window 2` で約 15% 小さくなります。

## 5. 結果を送る

`gzip -k book-work-v4/nodes.jsonl` を実行してから、GitHub Desktop で新しいブランチ（例 `book-v4`）を作り、次をコミットして Push。ブランチ名を教えてください。

- `reversi/tools/book-work-v4/nodes.jsonl.gz` と `reversi/tools/book-work-v4/config.json`（`nodes.jsonl` そのものは .gitignore で除外）
- `reversi/tools/bm-v4-lv20.jsonl`・`bm-v4-lv23.jsonl`・（あれば）`bm-v4-lv26.jsonl`（対局の結果）
- `build`・`diff`・`book-match` の最後の数行（チャットに貼り付けでも可）

こちらで `build` し直して book.bin を v4 に差し替え、読み込み側の `book.bin?v=` を上げます（`reversi/index.html`・`atlas/games/reversi.js`・`reversi/sw.js`）。

## 参考：そのほかのオプション

| オプション | 既定 | 意味 |
|---|---|---|
| `--depth` | 22（`--from` のときはその作業フォルダの値） | 中盤の読みの深さ（固定） |
| `--deep` / `--deep-err` / `--deep-cap` | 0（使わない）/ 1 / 1000 | 本線（両者の損の合計が deep-err 石以内、1手 deep-cap 局面まで、損の少ない順）をこの深さで読む |
| `--from` | なし | ほかの作業フォルダの結果を読むだけで使う（深さが足りる局面だけ。`keep`・`exact` が同じこと） |
| `--lines` / `--lines-ply` / `--lines-min` | なし / 30 / 3 | 棋譜（WTHOR の `.wtb`、テキストの `.txt`、フォルダ）。lines-ply 手目までで lines-min 局以上に出た局面を必ず入れる（cap の外） |
| `--engine` | 新しいフォルダは `mt` | `mt` = `engine_mt.wasm` を1スレッド、`st` = `engine.wasm`（v3 まで）。フォルダごとに固定 |
| `--exact` | 0 | 残りこのマス数以下は完全読み（定石の範囲では通常不要） |
| `--keep` | 4（`--from` のときはその値） | 最善からこの石数以内の手の評価値を正確に求めて保存（それより悪い手は捨てる） |
| `--window` | 3 | 最善からこの石数以内の手の先を定石に加える |
| `--err` | 4 | 片方の手番の損の合計がこの石数を超えたら打ち切り |
| `--cap` | 3000 | 1手ごとの局面数の上限（シード・棋譜の局面は別） |
| `--max-ply` | 24 | 何手目まで広げるか |
| `--seed` / `--seed-ply` | なし / 99 | 必ず含める局面（JSON の定石。例：旧 book.json）とその手数の上限 |
| `--threads` | コア数−1 | 同時に読むスレッド数 |
| `build --out-window` | 3 | book.bin に入れる手の幅（最善からの石数。定石の局面へ進む手は幅の外でも入れます） |
| `diff --margin` | 0.8 | AI が選ぶ手の幅（Lv.15 以上と同じ） |

AI は最善から 0.8 石以内の手から選ぶ（Lv.15〜28・PRO の定石オン）ので、定石の中でも毎回同じ手順にはなりません。
分析は、定石の局面では定石の評価値（深い読みを木で戻した値）を表示します。

## 生成の記録

| 版 | 日付 | 環境 | 設定 | 局面数 | 読みの時間 | book.bin |
|---|---|---|---|---|---|---|
| v2 | 2026-11-08 | 作業環境（2コア共用） | `--depth 16 --max-ply 22 --cap 200 --err 3 --window 2.5 --keep 3`（旧 book.json の10手目までを seed） | 3,041 | 約1時間 | 23 KB |
| **v3** | 2026-11-08 | Mac（14コア） | `--depth 20 --max-ply 26 --cap 3000 --err 4 --window 3 --keep 3 --exact 0` | 44,343（14〜26手目は各3,000） | 43.9 時間（スレッド合計） | 340 KB（gzip 244 KB）・101,395 手、`build --out-window 3`。2026-11-12 に手番の補正で値を付け直し：348 KB（gzip 248 KB）・103,852 手（`book.bin?v=3`） |

- v3 は `book-work/` の `nodes.jsonl.gz`（1.4MB）と `config.json` から、作業環境の `node book-gen.js build` でも Mac と**同じバイト列**の book.bin になることを確認済み（v4 の book-gen.js でも同じ）。
- `--out-window` を狭めた場合：2 石で 284 KB（gzip 200 KB）、1.5 石で 262 KB（gzip 181 KB）。局面数は同じで、AI が選ぶ手（最善から 0.8 石以内）も同じ。分析で「定石にない手は最善 −3 石以下」と出せるよう、3 石のままにしました。
- 読み込み：ページは `book.bin` をそのまま（GitHub Pages は .bin を圧縮しないので 340 KB）取得し、各ワーカーで `decodeBook`（44,343 局面で Node 約 0.1 秒）。
- 対局（`book-match.js`、新 v3 対 旧 v2、初期局面から両者とも定石のばらつきあり、先後入れ替え）：Lv.15 200局 103勝20分77敗（56.5%、+45 ± 24 Elo）、Lv.20 の設定・1手0.3秒 210局 132勝28分50敗（69.5%、+143 ± 24 Elo）。定石を抜けた手数 v3 22.0〜22.3 ／ v2 16.6〜16.9。
