# チェッカー（checkers/）仕様

URL: https://core-calmdust.github.io/aicoding/checkers/ ／ 旧版 checker.html はトップの「旧バージョン」に残す

## ルール
- 英国式（English draughts / American checkers）。8×8の暗いマス32個、黒（先手）が上から下へ。
- 取りは義務・連続跳びは最後まで・成ったら手番終了・キングは前後1マス。
- 引き分け：同一局面3回、または取り・兵の前進なし80手（40手ずつ）。合意の引き分けはオンラインのみ。

## エンジン（engine.c → engine.wasm / engine_simd.wasm）
- 盤は32ビットのビットボード。手の内部表現 m = 元 + 32×先 + 1024×取った駒のマスク（wasm 入出力は (元|先<<5, マスク)）。
- PVS＋aspiration、置換表、killer/history、LMR、1手しかない手の延長、末端は取りの解消まで読む。
- 評価：NNUE（v2、`CKN2`、net-43、H=256、2026-11-08 から。int16 の差分更新アキュムレータ、駒数バケツ）。旧 v1（128→64→32→1、`CKN1`）もエンジンは読める。弱いレベル（15級〜5級）は手作り評価。
- 終盤DB：4駒以下の勝ち負け引き分け（egdb4.bin.gz 517KB）を読み込む。
- ブラウザがSIMD対応なら engine_simd.wasm（NNUE で非SIMD の約4倍速）。ビルドは tools/build.sh。NNUE は v1 より1局面あたり重い（wasm SIMD で約0.56倍の局面数/秒）。
- 学習：Mac で強化学習（tools/nn/loop.sh、自己対局＋6駒DB、3手バロット）。新しいネットは `checkers/nnue-candidate.nnue` でコミット → 強さ確認（サイト条件＝4駒DB・ブラウザの速さの比）・レベル再調整のうえ evalnet.bin.gz を差し替え、engine.js の `V` と各ページのキャッシュ番号を上げる。強さの比較は tools/nn/match.sh（3手バロット532局、同じ持ち時間）。
- キングが一周して元のマスに戻る取り（f＝t）は駒が残る（2026-11 修正）。

## AIの強さ（20段階）
- 15級〜1級、初段〜五段。engine.js の LEVELS と tools/native.c の LVS を同じ値に保つ（native の lv コマンドで隣接レベルを対戦させて調整）。
- 15級〜5級：手作り評価・固定深さ＋ノイズ＋一定確率の悪手。4級〜三段：学習評価・1手の局面数で区切る（net-43 で 900〜12万。v1 のときの 2千〜50万と同じ強さになるよう測り直し済み、端末の速さによらない。nk は千単位で小数可）。ネットを替えたらこの局面数を測り直す（RT_LV は変えない）。四段・五段：1秒／2.5秒、序盤8手は互角の手からランダム。
- 隣接レベルの対戦結果と RT_LV（レート基準：15級450、+125ずつ、1級2090、五段2350）は checkers/MODEL_CARD.md。

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
