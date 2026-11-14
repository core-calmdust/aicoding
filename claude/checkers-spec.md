# チェッカー（checkers/）仕様

URL: https://core-calmdust.github.io/aicoding/checkers/ ／ 旧版 checker.html はトップの「旧バージョン」に残す

## ルール
- 英国式（English draughts / American checkers）。8×8の暗いマス32個、黒（先手）が上から下へ。
- 取りは義務・連続跳びは最後まで・成ったら手番終了・キングは前後1マス。
- 引き分け：同一局面3回、または取り・兵の前進なし80手（40手ずつ）。合意の引き分けはオンラインのみ。

## エンジン（engine.c → engine.wasm / engine_simd.wasm）
- 盤は32ビットのビットボード。手の内部表現 m = 元 + 32×先 + 1024×取った駒のマスク（wasm 入出力は (元|先<<5, マスク)）。
- PVS＋aspiration、置換表、killer/history、LMR、1手しかない手の延長、末端は取りの解消まで読む。
- 探索 v2（2026-11-14）：ヌルムーブ（駒6枚以上）・逆フューティリティ・フューティリティ・LMP・LMR の対数表・IIR。取りのある局面・成る手は枝刈りしない。使うのは局面数の制限のない探索（四段・五段・PRO・分析）だけで、4級〜三段・15級〜5級は前の探索のまま（`tools/check_v2.js` で一致を確認）。詳細と計測は checkers/MODEL_CARD.md「探索 v2」。
- 評価：NNUE（v2、`CKN2`、net-43、H=256、2026-11-08 から。int16 の差分更新アキュムレータ、駒数バケツ）。旧 v1（128→64→32→1、`CKN1`）もエンジンは読める。弱いレベル（15級〜5級）は手作り評価。
- 終盤DB：4駒以下の勝ち負け引き分け（egdb4.bin.gz 517KB）を読み込む。
- ブラウザがSIMD対応なら engine_simd.wasm（NNUE で非SIMD の約4倍速）。ビルドは tools/build.sh。NNUE は v1 より1局面あたり重い（wasm SIMD で約0.56倍の局面数/秒）。
- 学習：Mac で強化学習（tools/nn/loop.sh、自己対局＋6駒DB、3手バロット）。新しいネットは `checkers/nnue-candidate.nnue` でコミット → 強さ確認（サイト条件＝4駒DB・ブラウザの速さの比）・レベル再調整のうえ evalnet.bin.gz を差し替え、engine.js の `V` と各ページのキャッシュ番号を上げる。強さの比較は tools/nn/match.sh（3手バロット532局、同じ持ち時間）。
- キングが一周して元のマスに戻る取り（f＝t）は駒が残る（2026-11 修正）。

## 本編のマルチスレッド（2026-11-08、addendum「本編のマルチスレッド」、手本：ファノロナ）
- `engine.c` を `-DMT` で作った `engine_mt.wasm`（`tools/build.sh`）。置換表・学習評価の重み・終盤DB・盤の表は共有、局面・履歴・キラー手・NNUE の累積などはスレッドごと（`TLS`）の Lazy SMP。NNUE の累積（`ACC2`・`ACC`、約400KB）は TLS の雛形に入れると wasm が膨らむので各スレッドの枠（`slot` 4MB）の TLS の直後に置き、スレッド番号と一緒に別関数 `mtSelf` で代入する（`mt_thread` の中で書くと古い TLS 基底に書かれる）。補助の奇数番は1手深く読み始め、置換表の世代は主スレッドだけが進める。**通常版 `engine.wasm`・`engine_simd.wasm` は1バイトも変わらない**（レベルの指し手は不変）。終盤DBは主スレッドが全スレッドの枠より上に読み込む。
- 対局ページ：`shared/mtengine.js`＋`sw.js`（light）。主スレッドは `engine.js?…&mt=1`、補助は `mt-helper.js`（`setupIO` の局面で `best()` を繰り返す）。対象は分析・ヒント・コーチ（深読み＝四段）・検討ボックス（`rvbox.js` は `pool()`／`cancel()`）と、時間で考える四段・五段（1秒／2.5秒、レート戦も）。15級〜三段は1スレッド。PRO のスレッド数は探索で読むどの制限でも効く（既定は四段・五段が全スレッド）。情報行に「· NNN nps」（全スレッドの合計）。
- 計測ページ `checkers/bench.html`（noindex・リンクなし）。最上位レベルは足さない（完全解析で引き分け、1級より上は隣との差が誤差の範囲。checkers/MODEL_CARD.md）。

## AIの強さ（20段階）
- 15級〜1級、初段〜五段。engine.js の LEVELS と tools/native.c の LVS を同じ値に保つ（native の lv コマンドで隣接レベルを対戦させて調整）。
- 15級〜5級：手作り評価・固定深さ＋ノイズ＋一定確率の悪手。4級〜三段：学習評価・1手の局面数で区切る（net-43 で 900〜12万。v1 のときの 2千〜50万と同じ強さになるよう測り直し済み、端末の速さによらない。nk は千単位で小数可）。ネットを替えたらこの局面数を測り直す（RT_LV は変えない）。四段・五段：1秒／2.5秒、序盤8手は互角の手からランダム。
- 隣接レベルの対戦結果と RT_LV（レート基準：15級450、+125ずつ、1級2090、四段2320、五段2370。四段・五段は 2026-11-14 の探索 v2 で +20）は checkers/MODEL_CARD.md。

## オンライン
- Firebase（匿名＋Googleログイン、Realtime Database）。Firebaseプロジェクト checkers-multiplay（asia-southeast1）。database.rules.json の v は ^(english)$。
- 1手 = K64 3文字（元・先・同じ元/先の合法手の中の番号）。?mock=1 で localStorage のモック（2タブで対戦テスト可）。

## データ
- lessons.json（13ステップ×5問）、openings.json（19の定跡、学習＋実戦練習）、puzzles.json（PZBook v2、10テーマ×50＝500問、今日の一問）。
- 生成：tools/gen_lessons.js、tools/gen_openings.js、tools/pzgen.c → tools/build_puzzles.py。文言は tools/i18n/*.json → tools/build_i18n.py → i18n.js（10言語）。

## 保存キー
- aicoding-checkers（設定）、-puzzles、-lessons、-open、-daily、-rated、-rules、aicoding-checkers-rules-seen、checkers-online-*。

## 対局設定の Pro モード（2026-11-08）
対局設定の「AIの強さ」の PRO ボタン（`shared/proset.js` の `ProSet.ladder()`、addendum「対局設定の Pro モード」）。項目：思考の制限（時間／深さ／局面数）、手のばらつき（深さで読むときだけ。弱い段の既定はその段のノイズ、変えると 小＝いちばん弱いノイズ／大＝弱い段の中ほどのノイズ）。変えた値は engine.js `think` の `cfg`（LEVELS と同じキー。強い段の最大深さは `dx`）で渡す。レート戦では使わない。戦績のキーは `ai:pro<レベル>`、相手名に「PRO」。

## 大百科の3Dカード（2026-11-14）
- カードのタブは「対戦｜レート戦｜パズル｜レッスン」（将棋・リバーシ・五目並べ・囲碁と同じ完成形）。パズル・レッスン・定跡・レート戦（AI）は3D卓で遊べ、記録はフル版と共通（保存キーは上の「保存キー」のまま）。
- パズル：atlas/puzzles.js `BOOK.checkers`（今日の一問は checkers/app.js dailyPick と同じ選び方）。レッスン・定跡：atlas/lessons3d.js `CHECKERS`。3D盤の印・矢印・ソルバー呼び出しは atlas/games/checkers.js の `ctx.pz`。
- 3D盤にはマス番号がないので、ガイドの台詞では手を「緑の矢印の手／赤い矢印の手」（日本語以外は色の点）で示す。番号の入った準備ステップの文と定跡の紹介は atlas/nocoord/checkers.json（14言語）。
- フル版／2D版を開くときは `?mode=puzzle|lesson|rated|online&sub=…`（checkers/app.js `AtlasDeep`）。

## 3D盤と3D駒（2026-11-14）
- 盤6種（`atlas-checkers-look`、Table3D.BOARDS.checkers、この順・先頭が既定）：赤と黒の大理石・黒漆・アールデコ・ラピスラズリ（鏡のような艶）・金箔押しの革（金箔の縁＋金の額縁）・ブール象嵌（べっ甲と真鍮のマス、真鍮の唐草）。駒6種（`atlas-checkers-pc3`、Table3D.PIECES.checkers、この順・先頭が既定）：白黒の大理石・赤黒の大理石・赤白の大理石・金と銀・黒檀と象牙・朱と黒の漆。既定は「赤と黒の大理石の盤＋白黒の大理石の駒」。（2026-11-14 見直し：寄木細工・螺鈿・クリスタル・ベークライト・黒真珠は廃止）
- 選び方：大百科の盤パネル、フル版3D表示の新規対局「デザイン」タブ（「3D盤」「3D駒」の列、amazons と同じ）。2D盤を選ぶと 2D 表示に戻る。
- 文言：テキストの「黒／白」（フル版のルール・レッスン・パズル・手番表示、大百科のレッスン・パズル）と、大百科ルール紹介の「金／銀」は、表示中の3D駒の色名に置き換える（`Table3D.checkers.recolor(html, lang, set, 'bw'|'metal')`、14言語の語形・冠詞・助詞を扱う）。フル版のミニ盤（miniSVG）の駒も3D駒の色。2D表示では元の黒／白のまま。
- 画像：盤アイコン `atlas/img/boardic-checkers-<盤>.webp`（tools/boardicon.html）、盤サムネ `board-checkers-<盤>.webp`（tools/boards.html）、駒 `pc3-checkers-<駒>.webp`（tools/ckpiece.html）。
