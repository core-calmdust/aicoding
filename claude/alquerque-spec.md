# アルケルケ（alquerque/）仕様メモ

- ページは fanorona/ のスクリプト（app.js・engine.js・online など）を `window.GAME = { id: 'alquerque', rules: ['alq', 'alqf'] … }` で動かす。エンジンの点番号は全盤共通で r×9+c（5×5でも9刻み）。
- 2D盤：絨毯（medallion 既定・kilim・patch）、carved・chalk・damask、abstract・dark。駒：brass（既定、金と青）ほか。

## 3D（ポータル、2026-11-05）
- 盤（atlas/models/alquerque.js）：ユーザー指定「アラブの香りを感じるボード」→ ダマスカスの寄木象嵌盤。くるみ材、外周に骨・黒檀・レモンウッドの三角モザイク帯と小さな菱形の市松（骨の象嵌線で区切る）、四隅に真珠母貝の八芒星（ハータム）、中央の盤面はレモンウッドに淡い八芒星のロゼット、線は黒檀の縁取りの真珠母貝、点は真鍮の鋲。取った駒は上下の赤いベルベットのトレイ（盤に彫り込み）。テクスチャは色・高さ（→法線）・粗さ/金属の3キャンバスに同時に描く。
- 駒：真鍮（白・八芒星の彫り）／ブロンズに藍の七宝（黒・金線の八芒星）。円盤なので転がらない（userData.noRoll）。
- userData はファノロナの盤と同じ契約（pt, rest, groove{at,y,step}, piece(col, scale) → { ball, r }）なので、ファノロナのフル機能スキン（atlas/skin/fanorona.js、GAME.id で分岐）とちゃぶ台アダプタ（atlas/games/fanorona.js の GAMES.alquerque、rule 'alq'）を共用。
- 三角形数：盤＋駒 約3.4万。ショーケース scale 1.3。
- ルールコース（atlas/rules/alquerque.js、案内役マンカラビ g-gem）：9ステップ（2Dチュートリアル TOUR_ALQ の局面）、連続取りは必ず続ける、正解で自動で次へ。`window.__aqRules`。
- ポータル：FULL_SKIN に alquerque、Atlas3D.alquerque（levels 20、kyu/dan 表記はファノロナと同じ）。

## 対局設定の Pro モード（2026-11-08）
対局設定の「AIの強さ」の PRO ボタン（`shared/proset.js` の `ProSet.ladder()`、addendum「対局設定の Pro モード」）。項目：思考の制限（時間／深さ／局面数）、定跡（ファノロナ本来のルールのみ。既定は Lv.15 以上。アルケルケには出さない）、手のばらつき（深さで読むときだけ）。変えた値は fanorona/engine.js `think` の `cfg`（LEVELS と同じキー）で渡す。レート戦では使わない。戦績のキーは `ai:pro<レベル>`、相手名に「PRO」。

## 評価関数の Texel 調整（2026-11-14、採用せず）
- 強いレベルの評価（`alqHand()`）の重みを自己対局の勝敗に合わせたが、同じ時間で −37 Elo（400局）と弱くなったので変えていない。詳細は `claude/fanorona-spec.md`「評価関数の Texel 調整の検証」。
