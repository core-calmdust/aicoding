# 世界のボドゲ大全 ポータル (atlas/)

`https://core-calmdust.github.io/aicoding/atlas/`

## 構成
| ファイル | 役割 |
|---|---|
| `../shared/atlas.js` | 共通コア：ゲーム台帳 `GAMES`、更新履歴 `UPDATES`、タグ/バッジのルール、各ゲームの進捗読み取り、実績、コイン・ショップ・ガチャ |
| `../shared/atlas-account.js` | 共通アカウント（Googleログイン1回で全ゲームを同期） |
| `../shared/atlas-firebase-config.js` | 共通アカウント用Firebase設定（未設定＝「準備中」、`?mock=1` でテスト） |
| `../shared/atlas-database.rules.json` | 上記のRealtime Databaseルール |
| `art.js` | アイコン・背景・フレーム（全部SVGで生成） |
| `icons3d.js` | デフォルメした3Dのコマとアイコン用シーン（`tools/icons.html` で `images/atlas/*.webp` に書き出す。`<id>.webp`＝ゲームアイコン、`p-<name>.webp`＝タイトル画面に浮かぶコマ） |
| `table3d.js` | 3D盤（three.js r128）。全ゲームの盤モデルと、表示/対局のカメラ |
| `games/<id>.js` | 3D盤で遊べるゲームのアダプタ（いまは reversi） |
| `i18n.js` / `app.js` / `index.html` | ポータル画面（10言語） |

## ゲームを追加するとき
1. `shared/atlas.js` の `GAMES` に1件追加（`store` にそのゲームの localStorage キー接頭辞を書く → 自動で同期対象）
2. 進捗を出すなら `READ` に読み取り関数を追加（実績は数字から自動生成）
3. 更新したら `UPDATES` の先頭に1行（ポータルの「最近のアップデート」と並び順に反映）
4. `table3d.js` の `MODELS` に盤モデル、3Dで遊ばせるなら `games/<id>.js` を追加して index.html で読み込む
5. ゲームページの `</body>` 前に共通アカウントの3行（atlas.js / atlas-firebase-config.js / atlas-account.js）

## 共通ルール
- バッジ（最大2つ、この順）：NEW＝公開14日以内／UPDATE＝更新7日以内／BETA／PREMIUM
- タグ：ai, online, rated, netrank, daily, lessons, puzzles, openings, variants, mobile（色・アイコンは `Atlas.TAGS`）
- コイン＝達成した実績（銅50・銀120・金300・プラチナ800）＋ログインボーナス（毎日30、7日ごと+150）＋ガチャのかぶり返金 − 使った分。二重取りできないよう、実績分は毎回計算し直す
- ガチャ：1回100／10回900（10回目はSR以上）、N 58%・R 28%・SR 10%・SSR 3.5%・UR 0.5%
- ショップ：毎日日付で入れかわる6品（アイコン3・背景2・フレーム1）

## 3Dアダプタの約束
`Atlas3D[id] = { levels, sides, modes, table, tableModes, clock: 'byo'|'fis'|'bg', start(ctx) → session }`
`ctx = { el, Table3D, lang, t, level, side, mode, bar, hud(html), onTurn(side, { human, ply }), onEnd({win, draw, level, score, pvp, winnerText}) }`
`session = { stop(), human, undo(), canUndo(), hint() → Promise, canHint(), resign(), canResign(), timeout(side) }`
- ちゃぶ台の対局では app.js が共通のアクションバー（待った・投了・ヒント、両端に時計）を画面下部に出す（バックギャモンの横向き表示では左の縦列）。盤はバーの上に収まるよう `Table3D.setInset` で枠取りされる
- `onTurn(side)`：手番が変わるたびに呼ぶ（side＝HUDの左0／右1、-1＝誰の番でもない）。時計は app.js が進め、時間切れで `session.timeout(side)` を呼ぶ。AI戦では人間の時計だけが進む
- 持ち時間（`clock`）：byo＝なし／1手30秒／10分+30秒／30分+60秒、fis＝なし／3分+2秒／10分+5秒／15分+10秒、bg＝なし／1手30秒／5分+30秒／10分+30秒。ボードカードで選び `atlas-play` に `<id>:tc` で保存
- 待った：AI戦は自分の前の手番まで（2手）、二人対戦は1手。AIの思考中・終局後は不可。ヒント：エンジンの最善手を光るリングで表示。投了は `shared/resign.js` で確認
盤は `Table3D.show(id, model)` で置き、クリックは `Table3D.pick(event, 盤面の高さ)` で盤上の座標に変換。
