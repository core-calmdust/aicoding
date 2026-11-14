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

## パズル・レッスン・今日の一問（2026-11-14）
- ファノロナの仕組み（fanorona/app.js の PZBook v2・レッスン・今日の一問）をそのまま使い、データだけ alquerque/ に置く：`puzzles.json`（240問）、`lessons.json`（11ステップ×5問）。ルールはベル式（`alq`、対局設定の既定）。序盤コースはなし（`.ls-tabs [data-v=open]` だけ隠す）。
- 生成：`alquerque/tools/gen_puzzles.js`（約15秒）・`gen_lessons.js`（約10分）。共通の下回り `tools/alqlib.js`（fanorona/engine.js＋engine.wasm、終盤DB alqeg.bin.gz、ルール `alq`）。
- パズル（8テーマ×30）：ステップアップ＝step2・step3（2手・3手で勝て）、戦術＝route（1手で1枚得：跳ぶ道を選ぶ）・sac（2手で1枚得、初手は取りのない局面で駒を取らせる手）・gain2（2手で2枚得）・gain3（3手で2枚得）、終盤＝end4・end5（4手・5手で勝て）。勝ち＝全部取るか動けなくする。駒得＝手番の相手に取りがない状態で差が g 枚増える（engine.c puzzle()）。
  - 正しさ：初手の正解がただ一つ、ちょうど N 手（engine.c の総当たり。6枚以下は終盤DBで読み切り）。
  - 面白さ：`tools/fun.js`（claude/puzzle-fun-score.md）で70点以上、必要数の3倍以上を見て上位を採用。項目：options 20（初手の候補数）・key 20（いちばん多く取る手／取られない手が正解ではない）・tries 15（同じくらい取れる・安全な誤答の数）・depth 15・defence 10（正解のあとの相手の応手数）・paradox 15（正解が駒を取らせる手＝捨て駒、または最大の取りより少なく取る手）・natural 5。
  - 「1手で勝て」は満点条件上70点に届かないので入れない（レッスンの「全部取って勝つ」「動けなくして勝つ」で扱う）。
  - 実質1手の除外（全ゲーム共通ルールのアルケルケ版。取りが義務で合法手が少ないため読み替え）：正解手順（相手は最も粘る応手）で、2手目以降の自分の手のうち合法手が2つ以上ある手は、うまくいく手が1/3以下であること。そのうえで「本当に選ぶ手が1回以上ある」か「正解の初手のあと相手に3手以上の応手がある」こと（ステップアップ・戦術。終盤は対象外）。
  - 局面：ステップアップ・終盤はランダムな少数駒、戦術は4〜8枚ずつのランダムな中盤風の局面（エンジン同士の対局からは、取りの交換が長く続くため駒得の問題がほとんど取れない）。
  - 並び：手数の少ない順、同じなら合法手の少ない順。今日の一問は8テーマを曜日で回す（`daily`）。
  - テーマのバッジ：fanorona/app.js の PZ_TSVG に route・sac・gain3 を追加（step・end は数字）。
- レッスン：はじめてのアルケルケ（b_jump 取り返されない取り・b_chain 続けて跳ぶ・b_route 跳ぶ道を選ぶ・b_safe 取られない手・b_win 全部取って勝つ・b_block 動けなくして勝つ。正解の手の一覧 `ok`）、戦術（t_count 取り返しを数える・t_sac 捨て駒・t_quiet 静かな一手。エンジン評価 `sc`、1.5秒）、終盤（e_hunt・e_trap。終盤DBで正確）。
- 文言：alquerque/i18n-alq.js の最後のブロック（14言語）。パズル・レッスン・コーチのヒント（cr.tip.goodShot / missShot / allowShot）・棋譜の貼り付け説明（跳んで取る手は J）。あわせて、ルール説明（intro・tr.a*）が中国語・韓国語・スペイン語・フランス語・ポルトガル語・ドイツ語・ヒンディー語・アラビア語でファノロナの文章のままだったのを直した。
- 台帳：shared/atlas.js の GAMES（tags に daily・lessons・puzzles・variants、total pz 240・ls 11）と READ（`aicoding-alquerque-puzzles` / `-lessons` / `-daily`）。

## 本編のマルチスレッド（2026-11-14）
- ファノロナと同じ組（`shared/mtengine.js`、`engine_mt.wasm`＝YBW＋busy marks、Praline）をアルケルケのページでも有効にした。ページの `alquerque/sw.js`（ページの分離。中身はファノロナと同じ）、エンジンのファイルは `../fanorona/`（fanorona/app.js の `MT_DIR`）。主スレッドは `../fanorona/engine.js?…&g=alq&mt=1` で、アルケルケの終盤DB（alqeg）を共有メモリに読み、補助も引く。対象はファノロナと同じ（分析・ヒント・コーチ・検討ボックス・時間で考える四段・五段・PRO のスレッド数）。
- 2026-11-08 にアルケルケを1スレッドにした理由は記録がなく、性能の問題がないか調べてから有効にした：
  - 「本当に同時」のシミュレーション（fanorona/tools/mtsim をアルケルケ用に：`set_rule(5,5)`・`set_alq(1)`・alqeg、乱数の16局面、1スレッドの予算 3M局面で届く深さまで）：同じ深さまでの時間 2・4・8スレッド **×1.88／×2.96／×4.45**（幾何平均 ×1.84／×2.81／×4.13）。遅くなる局面はない（読みの少ない局面でも ×1.4 以上）。ファノロナ（×1.83／×3.43／×5.78）より伸びが小さいのは盤が小さく取りが義務で手が少ないためで、悪化ではない。
  - headless Chrome（作業機、2コア）：ページが分離され（crossOriginIsolated）、組で解析が動く。終盤DBの局面（6局面）で組と1スレッドの解析の値・手・exact が全部一致。
  - 要計測（Mac）：対局ページの実時間。
