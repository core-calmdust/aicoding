# チャンギ（janggi/）仕様

韓国将棋。シャンチー（xiangqi/）のページを土台にしたフォーク。共通ルールは game-conventions(-addendum).md に従う。

## ルール（janggi/engine.js・engine.c）
- 9×10 の交点。川なし。両陣の九宮に斜め線。楚（Cho・青緑）が先手、漢（Han・赤）が後手。
- 将・士：九宮の中を線にそって1歩（斜め線も）。象：直1＋斜2（途中がふさがると不可）。馬：直1＋斜1（足しばり）。
- 車：直線どこまでも＋九宮の斜め線。包：必ずちょうど1枚（包以外）を跳び越えて動く・取る。包は包を越えられず取れない。
- 兵（楚は卒）：前か横に1歩。相手の九宮では斜め線にそって前へも。
- 상차림：対局前に各自4通りから選ぶ（0 마상상마・1 상마마상・2 마상마상・3 상마상마）。AI は自分でランダムに選ぶ。オンラインと3D卓は 3/3 固定。
- 引き分けなし。詰みで勝ち。同一局面3回か200手で点数判定（車13・包7・馬5・象3・士3・兵2、漢+1.5）。パスは動かせる手がないときだけ。

## ページ
- 14言語。文言は xiangqi/i18n.js ＋ janggi/tools/i18n_jg_*.json の上書き（node janggi/tools/build_i18n.js で janggi/i18n.js を生成）。
- 棋譜表記：韓国式座標（段1〜0・筋1〜9、楚から見て）＋駒名。韓国語はハングル、それ以外は漢字。
- 引分提案ボタンは非表示。定跡タブなし（定跡集は未作成）。
- コーチ：xiangqi のコーチを流用し、チャンギ向けの文言・点数（janggi/coach-jg.js）。川・飛将・格言系のヒントは無効。
- パズル：janggi/tools/native.c の `jg mates` で自己対局から収集（tools/mates/run*.txt）→ janggi/tools/build_puzzles.js で検証・テーマ分け（1〜3手詰め・連続王手4〜5手）。289問。
- レッスン：15ステップ×5問（はじめて7：車・馬・象・包・卒で取る／逃げる／1手詰め、戦術4：得な交換・両取り・王手で得・守る、詰み2：2手・3手詰め、終盤2：車と馬・卒2つ）。`jg dump`（自己対局の局面）→ `node janggi/tools/gen_lessons.js dump.txt tools/mates/run2.txt,tools/mates/run1.txt` で自動生成・エンジン検証（パズルと重複なし）。文言は tools/i18n_jg_lessons.json（14言語）。準備ステップ（ramp）はなし。

## オンライン
- Firebase はシャンチーのプロジェクト（xiangqi-multiplay）を共用。データはすべて `janggi/` 配下（FIREBASE_ROOT）。
- ルールは janggi/tools/make_rules.py で xiangqi のルール＋janggi サブツリーを生成した janggi/database.rules.json を公開（2026-11-07 公開済み）。

## 3D（大百科）
- atlas/models/janggi.js：木製の厚い盤＋八角形の駒（将が大、士・兵が小）。 駒面は八角の平らな辺が上下、文字は正立（CircleGeometry を rotateZ したら UV を位置から振り直す。rotateZ は UV ごと回るので文字が22.5°傾く）。icons3d.js の jgPiece も同じ。
- atlas/skin/janggi.js：フル機能版（?skin=atlas）。atlas/games/janggi.js：3D卓プレイ（引き分けボタンなし、HUDの色は楚=緑・漢=赤）。展示盤は scale 1.1（長辺≈10.1）。

## ポータル・トップ
- shared/atlas.js（GAMES：cat chess、color #4aa58f、released 2026-11-07、UPDATES、進み具合）、index.html（カード key jg・説明14言語・JSON-LD）、shared/rulesoffer.js。
- 画像：images/janggi.webp（盤面のみ1200×900）、atlas/shots/janggi.webp（tools/shots.js）、images/icons/janggi.svg（八角駒の楚）、images/atlas/janggi.webp（icons3d.js の janggi()、atlas/tools/icon-post.py）。
- atlas：i18n（about/hist）、gamelist-i18n、mapdata（中国→朝鮮半島、伝来時期は諸説）、tables3d の背景。

- 3Dルールコース：atlas/rules/janggi.js（rules/xiangqi.js のフォーク、案内はショウギツネ、14ステップ・14言語。車・九宮の斜め・馬・足・象・士・包・卒・상차림・詰み・点数決着）。
- ヒストリア：atlas/historia/<lang>/janggi.json と s/janggi.json（盤図は八角駒 ps:'jg'）。伝来の時期など不確かなことは「はっきりしない」と書く。 2026-11-08 起源・年表を拡充（15世紀の象戯の記録、17世紀 張維『象戯志』、19世紀末 金俊根の風俗画、1956年の棋士団体・翌年の国手戦、楚漢＝項羽と劉邦、楚は草書・漢は楷書）。三国史記の「蓋鹵王が将棋」は囲碁の話なので書かない。

## 対局設定の Pro モード（2026-11-08）
対局設定の「AIの強さ」の PRO ボタン（`shared/proset.js` の `ProSet.ladder()`、addendum「対局設定の Pro モード」）。項目：思考の制限（時間／深さ／局面数）、手のばらつき（深さで読むときだけ。弱い段の既定はその段のノイズ、変えると 小＝いちばん弱いノイズ／大＝弱い段の中ほどのノイズ）。変えた値は engine.js `think` の `cfg`（LEVELS と同じキー。強い段の最大深さは `dx`）で渡す。レート戦では使わない。戦績のキーは `ai:pro<レベル>`、相手名に「PRO」。
