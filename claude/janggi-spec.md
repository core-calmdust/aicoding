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
- パズル：janggi/tools/native.c の `jg mates` で自己対局から収集 → janggi/tools/build_puzzles.js で検証・テーマ分け（N手詰め・連続王手）。
- レッスン：未作成（lessons.json なし）。

## オンライン
- Firebase はシャンチーのプロジェクト（xiangqi-multiplay）を共用。データはすべて `janggi/` 配下（FIREBASE_ROOT）。
- ルールは janggi/tools/make_rules.py で xiangqi のルール＋janggi サブツリーを生成した janggi/database.rules.json を公開（2026-11-07 公開済み）。

## 3D（大百科）
- atlas/models/janggi.js：木製の厚い盤＋八角形の駒（将が大、士・兵が小）。
- atlas/skin/janggi.js：フル機能版（?skin=atlas）。atlas/games/janggi.js：3D卓プレイ（未登録）。

## 未完了
- レッスン、トップページ・大百科への登録（アイコン・SS・地図・ヒストリア・3Dルールコース）。
