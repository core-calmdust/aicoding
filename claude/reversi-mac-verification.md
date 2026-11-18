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

## 検証A：読みの設定の組み合わせ（`tools/train/frontier.js`・`tools/edax-anchor.js`）
### 将棋の記録（`claude/shogi-search-comparison.md`）から取り入れたこと（2026-11-19 見直し）
将棋で成果が出たやり方と突き合わせて、最初の案を次のように直した。
1. **外の物差しを先に置く**：将棋は「同じ評価関数でやねうら王の探索に載せ替える」実測で、差が探索にあると確定してから進めた。最初の案は自前どうしの対局だけだったので、**Edax を同じ表に載せる**（A0）。自前の設定が Edax の線にどこまで近いか・どの時間帯で離れるかが分かる。
2. **深い読みで測る**：将棋では、浅い条件（2万局面）で「弱くなる」と出た枝刈りが、深い条件（30万局面）で逆転した。リバーシのこれまでの結論（t を下げても同じ、など）は 1手100ms や Lv.28（深さ13）の浅い条件のもの。**基準を Lv.31（深さ20）・Lv.34（深さ25）にした計測を必ず行い**、採否はそちらで決める。
3. **数値だけでなく仕組みも組み合わせる**：将棋では「単独では −133 の枝刈りが、ほかの仕組みと組んで基準をゆるめると働いた」。数値（深さ・t・範囲）だけでなく、**枝刈りのまわりの仕組み**（試しの読みの中では枝刈りしない＝Egaroucid、静的評価で試すかどうかを決める＝Edax）を t と一緒に動かす計画（mech）を足した。
4. **対局の数え方**：将棋では同じ対局を重ねて数えていた誤りがあった。`rvmatch` は別々の序盤（`op10.bin` は3,000個）を先後入れ替えて使い、誤差は序盤の組ごとに出すので、この問題はない。**`--n` は 3000 以下にする。**
5. **1つずつの段が終わったら同時調整**：良い向きが分かった数値は、深い条件で同時に動かして合わせる（将棋の SPSA に当たる。道具はまだなく、A3 までの結果を見てから作る）。

### 設定の意味
| 設定 | 意味 |
|---|---|
| d（深さ） | 中盤の読みの深さ |
| t | 中盤と「終局まで読む」の枝刈りの強さ（小さいほど強く切る。今は 1.5、Edax・Egaroucid の中盤は約1.1） |
| x（完全読み／勝敗読み） | 読み切りを始める空きマス |
| e（終局まで読む） | この空きマス以下で、確率つきで終局まで読む |
| k（ENDK） | 終局まで読むときの誤差幅を何%にするか（今は 100。実測では幅が足りていないので 130〜200 を試す） |
| nn（MPC_NONEST） | 試しの読みの中では枝刈りをしない（Egaroucid の方式） |
| p（MPC_PRE） | 静的評価が境から p/100 石以内のときだけ試しの読みをする（Edax の方式） |

k・nn・p は `engine.c` のテスト用ビルド（`frontier.js` が自動で作る。付けなければ公開中の wasm と同じバイナリ）。

### A0：Edax を物差しに（最初に）
```sh
# Edax を用意（https://github.com/abulmo/edax-reversi を make build。bin/ に実行ファイルと data/eval.dat）
cd reversi
EDAX=~/edax-reversi/bin/mEdax-arm64 node tools/edax-anchor.js --levels 12,15,18,21 --base lv28 --n 150
EDAX=~/edax-reversi/bin/mEdax-arm64 node tools/edax-anchor.js --levels 15,18,21,24 --base lv31 --n 100
```
- 出力：Edax の各レベルの Elo（基準に対して）と、双方の考えた時間。A1 以降の表と同じ基準なので、「同じ時間で Edax が何 Elo 上か」が読める。
- 自前は wasm の1スレッド、Edax はネイティブ（1スレッド）。Edax は1手ごとに起動するので、時間は Edax が表示する読みの時間を使う。

### A1〜A4：自前の設定（どれも `--base lv28` と `--base lv31` の両方。余裕があれば `lv34`）
```sh
cd reversi/tools/train
caffeinate -i node frontier.js run --plan stage1 --base lv28 --n 1000     # A1：1つずつ変える（35設定）
caffeinate -i node frontier.js run --plan mech   --base lv28 --n 1000     # A2：枝刈りの仕組み × t × 深さ（35設定）
caffeinate -i node frontier.js run --plan stage2 --base lv28 --n 1000     # A3：数値の組み合わせ（47設定）
caffeinate -i node frontier.js run --plan stage1 --base lv31 --n 300      # 深い基準で同じことを（1局が長いので局数は少なめ）
caffeinate -i node frontier.js run --plan mech   --base lv31 --n 300
caffeinate -i node frontier.js run --plan stage2 --base lv31 --n 300
caffeinate -i node frontier.js run --plan extreme --base lv31 --n 100     # A4：今の10〜100倍の時間
node frontier.js table --base lv31                                         # いつでも途中経過の表（--base ごとに別のファイル）
```
- 結果は `frontier-lv28.jsonl`・`frontier-lv31.jsonl` に1行ずつ足される。止めても同じコマンドで続きから。
- 時間の目安（概算。実測で変わる）：lv28 の3つで半日〜1日、lv31 の3つで1〜3日、extreme で1日。夜に1つずつ。
- 見るところ：
  - 表の「同じ時間の深さだけの設定との差」が **± の2倍を超えてプラス**の設定。
  - **lv28 と lv31 で向きが変わる設定**（浅い基準でマイナス・深い基準でプラスなら、深い方を信じる）。
  - 単独（stage1）で差のなかった設定が、組み合わせ（mech・stage2）でプラスになっていないか。特に「t を下げる × nn × p」。
  - A0 の Edax の線との差が、どの設定で縮むか。
- 良い設定が見つかったら：その周りを細かく刻んだ計画を足して測り直す → 同時調整 → レベルの表（`engine.js` LEVELS）に反映。k・nn・p が効く場合は、エンジンに正式な設定として入れる（1スレッドの読みが変わるので、Praline の一致の約束は更新する）。

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
- 待ち方の変更（パーキング）は 2026-11-19 にリバーシにも入った（`engine_mt.wasm?v=16`）。`reversi/bench.html` と `reversi/bench.html?park=0`（前の待ち方）を並べて、中盤・終盤を 1・8・10・14 スレッドで測る。リバーシは分割が細かいので、8〜10スレッドの伸びが落ちていないか、14スレッドが良くなったかを見る。落ちる場合は `PL_PARK_SPIN` を上げるか、リバーシだけ `-DPL_NO_PARK` でビルドする。

## 送ってほしいもの
1. `edax-anchor.js` の出力、`node frontier.js table --base lv28`・`--base lv31` の出力（`frontier-*.jsonl` があればそのファイルも）
2. `book-gen.js build` の表示（局面数・大きさ）、`book-match` の結果、`book-audit` の出力
3. `bench.html` の数字（検証C・D を行った場合）
