# ソリティア（solitaire/）

クロンダイク・スパイダー・フリーセルを1つにまとめたカードゲーム。ゲームの種類（バリアント）は後から追加できる作り。

## ファイル
| ファイル | 役割 |
|---|---|
| `variants.js` | ルールエンジンとバリアント登録（DOMなし、Workerでも動く） |
| `solver.js` | 汎用ソルバー（最良優先探索）。勝てる配り・今日の配り・ヒントに使用。Web Workerとして起動 |
| `table.js` | カードの描画・ドラッグ／タップ／ダブルクリック・アニメーション（本盤とルール説明の小盤で共用） |
| `app.js` | 進行（元に戻す・自動移動・自動で完成・勝敗・統計・今日の配り・各ダイアログ・効果音・勝利演出） |
| `rules.js` | チュートリアル式ルール説明（`shared/ruletour.js`、ゲーム種類ごとのタブ） |
| `i18n.js` | 画面の文言（10言語） |

## ゲーム種類の追加手順
1. `variants.js` で `register({...})`：`layout`・`deal`・`canPick`・`canDrop`・`won` は必須。山札があれば `canStock`/`stock`、得点は `score0`/`score`、ヒントの並べ替えは `rank`、自動移動は `safe`。札の山の種類は `stock / waste / found / tab / cell`（独自の種類・手は `custom`/`applyCustom` で追加可）。
2. 難易度は `presets: { easy, normal, hard, expert }`、ルールの選択肢は `opts: [{ k, vals, def }]`。新しいゲームダイアログ・ルール要約・統計・今日の配りは自動で対応。
3. ソルバーで解けるゲームは `solver: true`（「勝てる配り」が選べるようになる）。
4. `i18n.js` に `v.<id>`・`vd.<id>`・`dd.<id>.<難易度>`・`o.<キー>`・`ov.<キー>.<値>`・`os.<キー>.<値>` を10言語で追加。
5. `rules.js` の `RULES[<id>]`（小盤の配置と合格条件）と `RT[言語][<id>]`（紹介・各ページの文言）を追加。
6. `app.js` の `GICON` にゲームのアイコンSVGを追加。

## 保存
- `localStorage['aicoding-solitaire']`：設定・遊び途中のゲーム（元に戻す履歴つき）・統計（種類×難易度）・今日の配りの記録・勝てる配りの先読み
- ルール説明の進み具合：`aicoding-solitaire-rules-<種類>`、ルールを見たか：`aicoding-solitaire-rules-seen`
