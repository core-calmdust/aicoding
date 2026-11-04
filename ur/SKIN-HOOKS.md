# ウル王朝のゲーム — 3Dスキン（`?skin=atlas`）用フック（本体 → 担当T）

本体は 2D の DOM 盤（`ur/board2d.js` の SVG）を常に持ち、タップ・選択・行き先の印・矢印はすべてこの DOM 盤が受ける。
3D スキンは three.js の盤を DOM 盤の下（または同じ位置）に置き、DOM 盤の絵（盤の画像・駒・サイコロ）を透明にする。

## 読み込み
`ur/index.html` の末尾（checkers と同じ形）：`?skin=atlas` のとき `html.atlas-skin` を付け、
three.js r128 → `../atlas/table3d.js` → `../atlas/skin/common.js` → `../atlas/models/ur.js` → `../atlas/skin/ur.js` を順に読む。
どれかが失敗したら `atlas-skin` を外して 2D のまま動く（`UrApp.relayout()` を呼ぶ）。`atlas/skin/ur.js` はまだ無くてよい。

## DOM の要素
```
.board-area#boardArea
  .player#pl0 / #pl1         （PC以外：相手の欄が盤の上、自分の欄と .sbox が盤の下。PCは盤の下の情報行）
  .frame#frame               盤の枠（position:relative、幅 = CSS 変数 --bw、aspect-ratio 924/552（縦向きは 544/932））
    .board-wrap#board        UrBoard2D.mount の親。中に svg.ur-board（viewBox = UrBoard2D.VIEW[orient]）
      svg.ur-board > g.ur-img（盤の画像）/ g.ur-tray（盤外の置き場：.ur-trayb[data-side][data-kind=start|goal]）/
                     g.ur-under（直前の手の枠）/ g.ur-hit（マスの当たり：rect.ur-cell[data-r][data-c]）/
                     g.ur-pieces（駒：g.ur-pc.ur-pc0|1）/ g.ur-tgs（緑の行き先）/ g.ur-over（矢印・危険・印）
    .dice-dock#diceDock      サイコロの置き場（手番側の列4〜5の切り欠き。タップで振る）> .dice-host#diceHost（UrBoard2D.dice）
    .fx-msg#fxMsg / .fx-glow#fxGlow   パス・ロゼット・取りの演出（半透明の文字と内側の淡い光）
```
- 透明にする例：`html.atlas-skin .ur-img, html.atlas-skin .ur-pieces, html.atlas-skin .ur-tray rect, html.atlas-skin .dice-host{opacity:0}`
  （`.ur-hit`・`.ur-tgs`・`.ur-over`・`.ur-under` は残す＝タップと印が使える）。駒をタップできるのは `.ur-pc` の当たりなので、
  駒は `opacity:0` にしても pointer-events は残すこと（`visibility:hidden` にしない）。

## 向き
- `UrApp.orient()` / `view.orient()` → `'h'`（PC・横長） | `'v'`（スマホ縦：盤を90°回した 3列×8行、大きいブロックが上）。
- どちらの向きでも **自分（明＝side 0、行2）の列が手前（横向き＝下、縦向き＝右列）**。相手（暗＝side 1、行0）は奥（上／左列）。
- 座標：`view.cellXY(r, c)` → SVG 単位（1マス＝100）。横向きは `((c−3.5)·100, (r−1)·100)`、縦向きは `((r−1)·100, (c−3.5)·100)`。
  画面座標は `view.cellRect(r, c)`（DOMRect）、`view.offRect(side, 'start'|'goal')`、`view.toClient(x, y)`。
  盤の画像の範囲は `UrBoard2D.IMG[orient]`、svg の viewBox は `UrBoard2D.VIEW[orient]`。
- `UrBoard2D.mount` に `rot: true`（行0/2を入れ替え）も足してあるが、本体は使っていない（常に明が手前）。

## 本体が呼ぶ関数（`window.UrSkin3D` があれば）
本体は `window.UrSkinHooks` を経由して呼ぶ。`UrSkin3D` が無い・関数が無いときは 2D の演出。
```
UrSkin3D.sync(state, view)                       盤面が変わるたび（renderBoard の最後）。state = { rule, pos:[[…],[…]], turn, winner }
UrSkin3D.animateMove(side, from, to, info) → Promise   駒の移動（path index。0＝盤外、goal＝RULES[rule].goal）
                                                  info = { capture, speed }。終わったら resolve（本体はその後 sync する）
UrSkin3D.animateRoll(dice) → Promise             サイコロ（dice = [0|1,…] 4個、masters は3個）。resolve 後に 2D サイコロも同じ目を show する
```
- 本体の公開 API：`window.UrApp = { view, dice, frame(), board(), state(), roll(), orient(), relayout(), render() }`
  （`roll()` = 現在の出目 `{ d:[…], n }` か null）。`window.UrSkinHooks.orient()` も同じ。
- 盤の大きさが変わるとき（ウィンドウのリサイズ・向きの切替・PCヘッダーの出入り）は `#frame` のサイズが変わる。ResizeObserver で
  `#frame` を見てカメラを合わせること。向きの切替では `view.setOrient` で svg が作り直される（`UrApp.view` は同じオブジェクト）。
- レッスン・パズル・ルールのチュートリアルの盤：レッスン・パズルは本体の盤（同じ DOM）で解くので `sync` がそのまま呼ばれる。
  ルールのチュートリアル（ur/tour.js）はダイアログ内の別の 2D 盤（3D にはしない）。
