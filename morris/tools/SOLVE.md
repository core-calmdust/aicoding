# モリスの完全解析データベース（検討用ツール）

ナイン・メンズ・モリス（と、シックス・トゥエルブ）を**サイトのルールのまま**最後まで解いて、「絶対に負けないAI」と「勝ち・引き分け・負けと手数の分析表示」に使うためのデータベースを作るツールです。まだサイトには組み込んでいません（検討段階）。

## あなたがやること（チェックリスト）

- [ ] 1. GitHub Desktop で main を Pull する
- [ ] 2. ターミナルで下の「準備」を実行（1分）
- [ ] 3. シックスを作って確かめる（数秒）。最後に `start position: draw` と `0 wrong` が出れば OK
- [ ] 4. ナインを作る（M4 Pro で半日くらい。寝る前に始めるのがおすすめ）。途中で止まっても**同じコマンドをもう一度**打てば続きから
- [ ] 5. ナインを検算する（同じくらいの時間）
- [ ] 6. ログの最後の数行（`start position: ...`、`verify: ... wrong in total`、`stats` の結果）を Claude に貼る
- [ ] 7. （任意）Hugging Face にアップロード（下の「アップロード」）。サイトへの組み込みは次の段階で Claude がやります
- [ ] トゥエルブは急がなくて大丈夫（1.5〜3日・ディスク約120GB）。やるなら最後に

データは `~/morris-db/`（ホームフォルダ）にできます。**リポジトリの中には置かない**でください（GitHub の容量制限のため）。

## 準備

```sh
cd /Users/core_tan/Documents/GitHub/aicoding/morris
cc -O3 -o tools/solve tools/solve.c -lpthread
./tools/solve nine plan
```

`plan` は大きさの見積もりを出すだけです（ナイン：移動段階 9.2GB、配置段階 18.7GB、作成中のメモリ 約5GB）。

## シックス（数秒）

```sh
./tools/solve six -t 12 all
./tools/solve six -t 12 verify
node tools/solvedb.js check ~/morris-db/six-q50
```

`check` はサイトの `engine.js` の手の生成と勝敗判定で全局面を照合するテストです（`WDL mismatches 0, distance mismatches 0` なら OK）。

## ナイン（本番）

スリープで止まらないように `caffeinate -i` を付けます。ログは `~/morris-db/nine.log` に追記されます。

```sh
cd /Users/core_tan/Documents/GitHub/aicoding/morris
caffeinate -i ./tools/solve nine -t 12 all 2>&1 | tee -a ~/morris-db/nine.log
```

- **再開**：止まったら（電源・再起動・Ctrl+C）、上と同じコマンドをもう一度。できあがったクラス（`mv_*.bin`・`pl_*.bin`）は飛ばして続きから作ります（作りかけは `.tmp` のまま捨てられます）。
- 進み具合は `ls ~/morris-db/nine-q50 | wc -l` で分かります（全部で 546 ファイル：移動段階 49・配置段階 497）。
- `-t 12` はスレッド数。Mac を使いながらなら `-t 8` に。
- 終わると `start position: draw` が出るはずです（Gasser 1996 の結果。サイトの「50手ルール」込みでも引き分けの見込み）。

検算と統計：

```sh
caffeinate -i ./tools/solve nine -t 12 verify 2>&1 | tee -a ~/morris-db/nine.log
node tools/solvedb.js check ~/morris-db/nine-q50 300 20000 | tee -a ~/morris-db/nine.log
node tools/solvedb.js stats ~/morris-db/nine-q50 64 0.05 | tee -a ~/morris-db/nine.log
```

`verify` は全局面を「子の局面の値と食い違いがないか」で調べ直します（`verify: 0 wrong in total` なら OK）。`stats` は勝ち・引き分け・負けの数と、配信用に 64KB ずつ圧縮したときの大きさの見積もりです。

（任意・学術的な確認）50手ルールなしの古典ルール（Gasser と同じ）でも解けます。`-q 0` を付けると `~/morris-db/nine-q0` に別に作られ、`start position: draw` になれば Gasser の結果と一致です。時間は同じくらいかかります。

```sh
caffeinate -i ./tools/solve nine -q 0 -t 12 all 2>&1 | tee -a ~/morris-db/nine-q0.log
```

## トゥエルブ（任意・大きい）

```sh
./tools/solve twelve plan
caffeinate -i ./tools/solve twelve -t 12 all 2>&1 | tee -a ~/morris-db/twelve.log
```

移動段階 17GB ＋ 配置段階 99GB。M4 Pro で 1.5〜3日の見込み。再開のしかたはナインと同じです。

## アップロード（任意）

Hugging Face のデータセット（例：`core-calmdust/morris-solved`）に、フォルダごと上げます。

```sh
huggingface-cli upload core-calmdust/morris-solved ~/morris-db/nine-q50 nine-q50 --repo-type dataset
```

ブラウザから一部分だけ読めるか（Range リクエスト）の確認：アップロード後、サイトのページで開発者ツールのコンソールに

```js
fetch('https://huggingface.co/datasets/core-calmdust/morris-solved/resolve/main/nine-q50/mv_3_3.bin', { headers: { Range: 'bytes=0-31' } }).then(r => console.log(r.status, r.headers.get('content-range')))
```

`206 bytes 0-31/...` と出れば、必要な部分だけ取りに行く方式が使えます（エラーなら、配信は別の方式にします）。

## 仕組み（メモ）

- **ルール**：サイトの `engine.js` と同じ（ミルで1個取る・ミルの駒は他がすべてミルのときだけ取れる・3個未満で負け・動けなければ負け（トゥエルブで盤が埋まったら引き分け）・ナインとトゥエルブは3個で飛べる・配置も取りも無い手が50手続くと引き分け・同一局面の繰り返しは引き分け）。
- **値**（手番側から見て）：移動段階は「勝ち／負け＋z」。z は勝つ側が次に駒を取る（または相手を動けなくする）までに必要な手数（チェスの DTZ と同じ考え方）。50手ルールの残り（50 − 静かな手の数）以内なら勝ち・負け、超えていれば引き分け。z が減る手を選び続ければ必ず前進するので、勝てる局面を確実に勝ち切れます。配置段階は勝ち・引き分け・負けだけ（配置は有限で、50手の数え直しも起きるため）。
- **ファイル**：駒の数ごとのクラス（`mv_m_o.bin`＝移動段階、手番 m 個・相手 o 個／`pl_hm_ho_m_o.bin`＝配置段階、持ち駒 hm・ho）。盤の対称（16通り）で約16分の1に縮めた番号で、1局面1バイト（`-q 0` で手数が127を超えるクラスだけ2バイト）。先頭32バイトがヘッダ。
- **自前のコード**：`solve.c`（後退解析）・`solvedb.js`（読み出し・照合・まとめ）はこのリポジトリのコードです。Malom（Gévay & Danner）は GPLv3 なので使っていません。
- **実績**（このリポジトリの検証環境、2コア）：シックスは 4 秒で完成し、`verify` 0件・`engine.js` との照合 46万局面で食い違い 0、初期局面は引き分け（50手ルールあり・なしとも）。ナインの小さいクラス（3-3〜5-5）は旧ツール `mdb.c` と全局面で一致（3-3 は勝ち83%・引き分け0.15%で Gasser・Gévay の数字と一致）。
