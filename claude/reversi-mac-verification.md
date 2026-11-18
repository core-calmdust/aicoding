# リバーシ：Mac での検証計画（2026-11-19）

作業機（2コア共用・時間の計測が ±5% 揺れる）では判断できないものを、Mac（M4 Pro）でまとめて確かめるための計画です。
背景と作業機での結果は `reversi/MODEL_CARD.md` の「他ソフトとの比較検討」以降の節。

## わかっていること（作業機、2026-11-18）
- 評価関数の精度・同じ深さの手の質・中盤の速さは、Edax 4.7・Egaroucid 7.8 と同じ水準（同じ局面で実測）。
- 完全読みは Edax の約2倍・Egaroucid の約2.8倍の時間。1つの大きな原因は見つかっていない。
- 定石は本線が正しく、手順に幅を持たせると黒が損をする（Lv.22〜36 は幅を 0.3石に変更済み）。大きさは Egaroucid の約1/100。
- これまでの検証は「1つの設定を変えて同じ時間で比べる」形がほとんどで、**設定の組み合わせ**と**今よりずっと長い時間**は調べていない。将棋で、局面数を10倍以上にしたときと、複数の設定を同時に変えたときに大きく伸びた例があるので、リバーシでも同じ形で確かめる。

## 決まっていること
- 大きい定石は、天上レベル（Lv.29〜36）・PRO・解析のときだけ読み込む。PRO では大きい定石／今の定石を切り替えられるようにする。ふだんのレベルは今の定石（0.35MB）のまま。実装は大きい定石ができてから。
- 定石の値は自前のエンジンで読む（他ソフトの値は載せない。採点役として動かすのは可）。

## 準備（最初に1回）
```sh
cd reversi/tools/train && git pull
cc -O3 -o rvmatch rvmatch.c -ldl -lz -lm          # 2026-11-19 に「考えた時間」と --engine-b を追加したので作り直す
ls op10.bin                                        # なければ: ./rvmatch openings pairs.bin op10.bin
```

## 検証A：読みの設定の組み合わせ（`tools/train/frontier.js`）
どの設定も、今の Lv.28（深さ13・完全読み20・勝敗読み22・終局まで読む26・t 1.5）を相手に同じ序盤から対局し、**Elo と考えた時間**を表にします。
「同じ時間を深さだけに使った場合」より何 Elo 上かで並べるので、時間あたりで得な設定がわかります。止めても同じコマンドで続きから再開します。

| 設定 | 意味 |
|---|---|
| d（深さ） | 中盤の読みの深さ |
| t | 中盤と「終局まで読む」の枝刈りの強さ（小さいほど強く切る。今は 1.5、Edax・Egaroucid の中盤は約1.1） |
| x（完全読み／勝敗読み） | 読み切りを始める空きマス |
| e（終局まで読む） | この空きマス以下で、確率つきで終局まで読む |
| k（ENDK） | 終局まで読むときの誤差幅を何%にするか（今は 100。実測では幅が足りていないので 130〜200 を試す。`engine.c` のテスト用ビルド） |

```sh
cd reversi/tools/train
# 1) 1つずつ変える（33設定）：それぞれの「時間2倍あたりの Elo」
caffeinate -i node frontier.js run --plan stage1 --n 1000
# 2) 組み合わせ（t 2通り × 深さ 3通り × 終局読み 2通り × 誤差幅 2通り × 読み切り 2通り＝47設定）
caffeinate -i node frontier.js run --plan stage2 --n 1000
# 3) 今の10〜100倍の時間を使う設定（6設定。1局が長いので局数は少なめ）
caffeinate -i node frontier.js run --plan extreme --n 150 --out frontier-extreme.jsonl
node frontier.js table                    # いつでも途中経過の表
```
- 時間の目安（概算。実測で変わる）：1) 2〜4時間、2) 6〜12時間、3) 半日〜1日。夜に1つずつ。
- 見るところ：
  - 表の「同じ時間の深さだけの設定との差」が **± の2倍を超えてプラス**の設定。
  - 1) で単独では差のなかった設定が、2) の組み合わせでプラスになっていないか（例：t を下げて深くする × 終局読みを広げる × 誤差幅を広げる）。
  - 3) で、時間を増やしたときに Elo が伸び続けるか、どの組み合わせで伸びるか。
- 良い設定が見つかったら：その周りを細かく刻んだ計画を `frontier.js` に足して測り直し、レベルの表（`engine.js` LEVELS）に反映する。誤差幅（k）が効く場合は、エンジンに正式な設定として入れる。

## 検証B：定石の大きさと強さ
```sh
cd reversi/tools
# 今ある元データ：book-work（v3、4.4万局面）・book-work-v4（約11.7万局面、未採用）
# L（約30万局面の見込み）：v4 の元データを再利用して広げる
caffeinate -i node book-gen.js run --dir book-work-L --from book-work-v4 --deep 24 --deep-err 3 --deep-cap 2000 --max-ply 30 --cap 12000 --err 6
node book-gen.js build --dir book-work-L --book book-L.bin
node book-gen.js build --dir book-work-v4 --book book-v4.bin
```
- 時間の目安（概算）：L は数日。途中で止めても再開でき、途中の状態でも `build` できる。先に `--cap 8000` で止めて様子を見てもよい。
- 比べ方（レベルの番号は今の36段階。定石を抜けたあとの読みが深いレベルほど定石の差が出る）：
```sh
# 強さ：同じエンジン・同じレベルで定石だけ違う対局
node book-match.js book-v4.bin ../book.bin 200 bm-v4-28.jsonl 28 --threads 12
node book-match.js book-L.bin  ../book.bin 200 bm-L-28.jsonl  28 --threads 12
node book-match.js book-L.bin  ../book.bin 200 bm-L-31.jsonl  31 --threads 12
node book-match.js book-L.bin  book-v4.bin 200 bm-L-v4-31.jsonl 31 --threads 12
# 正しさ：Egaroucid を採点役に（手順は tools/BOOK.md「定石の採点」）
cd .. && EGAROUCID_DIR=~/Egaroucid/bin node tools/book-audit.js book.bin 21 --margin 0.3 --threads 10
EGAROUCID_DIR=~/Egaroucid/bin node tools/book-audit.js tools/book-L.bin 21 --margin 0.3 --threads 10
```
- 見るところ：`book-match` の Elo（黒番・白番別）、`book-audit` の「定石を抜けた局面の値（黒から）」が 0 に近いか、定石を抜ける手数。
- 大きくして伸びるなら、さらに広げる（`--cap`・`--max-ply` を上げて再開）。伸びが止まる大きさを探す。
- 対 Egaroucid の実戦（黒番・白番を別々に）も、定石を入れ替えた前後で比べる。

## 検証C：完全読み（優先度は低い）
- 完全読みを速くしても、読み切りを1マス早く始められるほどにはならない見込み（強さでは数 Elo）。検証A で「読み切りを早く始める設定が時間あたりで得」と出た場合だけ、次を行う。
- `bench.html`（終盤：残り24マス 8局面）の1スレッド・10スレッドの時間を、変更の前後で比べる。作業機で候補になったのは「末端近く専用の小さな置換表」（作業機で −3〜4%、局面数は +5.7%）。Mac で試すときはブランチを用意する。

## 検証D：複数スレッド（Praline の変更）
- 待ち方の変更が入ったら、`bench.html` の中盤・終盤を 1・8・10・14 スレッドで測る。リバーシは分割が細かいので、8〜10スレッドの伸びが落ちていないかを見る。

## 送ってほしいもの
1. `node frontier.js table` の出力（`frontier.jsonl`・`frontier-extreme.jsonl` があればそのファイルも）
2. `book-gen.js build` の表示（局面数・大きさ）、`book-match` の結果、`book-audit` の出力
3. `bench.html` の数字（検証C・D を行った場合）
