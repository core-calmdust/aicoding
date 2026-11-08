# 囲碁（go/）仕様

URL: https://core-calmdust.github.io/aicoding/go/ （2026-10-22 main に公開）

## ルール
- 5〜19路（選択肢 19/13/9/7/5＋その他）。日本ルール（地＋アゲハマ）／中国ルール（面積）。単純コウ＋同形反復（スーパーコウ）禁止。
- コミの既定：9路以上 日本6.5／中国7.5（日本の定番）。小路盤は理論値＋0.5：中国 5路24.5・6路3.5・7路8.5・8路9.5、日本はそれぞれ1目低い（23.5・2.5・7.5・8.5）。置き碁あり。
- 終局：パス2回 → 整地（死に石はネットの地予測で自動判定、タップで修正）→ 確定／対局再開。
- AIは相手がパスした直後か盤が決着済み（全空点の地予測|own|≥0.8かつ空点<6割）のときだけパスする（小路盤で序盤からパスしないように）。

## 表示
- 盤デザイン8種（榧・新榧・桂・漆・竹・和紙・夜桜・藍）、石4種（themes.js）。榧・新榧は柾目、桂は板目の年輪テクスチャ（細く控えめな晩材線、導管、光沢）。
- 座標は既定で上辺と左辺の2辺（日本の本・ソフトの一般的な形）。オプション「座標を4辺に」。拡大表示（レッスン等）は見えている盤端に出す。
- 石の直径は線間隔の0.94倍（隣と重ならない）。石画像は256px。

## AI（engine.c → engine_simd.wasm / engine.wasm、Web Worker engine.js）
- ネット：vibego（Sander Land、CC BY 4.0、KataGo kata1-b18 から蒸留）。軽量 s4 b7c106（net_light 2.5MB）・強い s9 b10c128（net_strong 4.8MB）、fp16。常に19×19入力で小盤は左上。こちらで学習したものではない。
- 探索：KataGo式 PUCT（cpuct log、FPU、目数効用、LCB）。Winograd 畳み込み＋SIMD。
- wasm スタック 4MB・stack-first（深いシチョウ読みでのスタック溢れ対策）。トラップ後はインスタンスを作り直し、AIは再試行（パス扱いにしない）。
- **27段階（2026-10-28 付け直し）**：18級〜1級（1〜18）・初段〜八段（19〜26）・アマ最強（27）。他ゲームの「15級〜五段・20段階」とは異なる（実測に合わせた）。表示は app.js と atlas/games/go.js の RANKS 表。
  - 1〜20は方策サンプリング（T・slip・top）、21 軽量3訪問（三段）、22 軽量6（四段）、23 軽量12（五段）、24 軽量20（六段）、25 軽量32（七段）、26 強い64（八段）、27 強い160（アマ最強）。
  - 段級の根拠：KataGo公式の人間らしく打つモデル（b18c384nbt-humanv0、1手1評価）との19路対局（各6〜10局、MODEL_CARD.md に表）。11級・8級・三段・六段は前後の中間設定で未計測。最強はKataGo本体b28の生の方策（探索なし）に0勝4敗、人間モデル九段には強い64訪問で6勝0敗。
  - 計測は作業環境で KataGo v1.15.3 eigen 版（GitHub公式リリース）を実行（サイトには含めない）。tools/vs-gnugo.mjs に GTP_CMD で任意のGTPエンジンを指定できる。
- **数値指標はEGF換算（GoR）**：1級＝2000、初段＝2100、五段2500まで100刻み、六段2550・七段2600・八段2650・アマ最強2700（トップアマ相当）。18級は300。「EGF 3000」などプロ超えに見える表記は使わない（本作最強はKataGo本体の生の方策に及ばない）。モデルカードの表にEGF換算列あり。
- レーティング戦：9路、5分＋秒読み20秒、RT_LV＝EGF換算（app.js egfOf）、開始値1000、予備選3局（Placement）。

## コンテンツ（すべて14言語：2026-11-07 に ru・zh-TW・id・tr を追加）
- 多言語の注意：UI辞書は tools/i18n/<lang>.json（online_<lang>.json）→ tools/build_i18n.py で i18n.js の2行目を生成（3〜4行目の ls.toList/ls.toOpen は手書き。build_i18n.py は3行目以降をそのまま残す）。コーチは coach.js（ja/en）＋ coach-i18n.js の GoCoach.merge（残り12言語。i18n-langs.js の coverage には数えられない）。
- lessons.json の4言語は tools/data/lessons-i18n.json にも入れてある（lessons-build.mjs で再生成しても残る）。ウォームアップ（step.ramp と rampUi）は lessons-ramps.mjs が10言語の L(...) で書くが、書き出し時に tools/keep-langs.js が英文の同じ文言の4言語を今の lessons.json から引き継ぐ（英文を変えた・足した文言だけ4言語が無くなり、一覧が表示される）。
- openings.json は tools/openings-build.mjs が tools/data/openings-joseki.json・openings-fuseki.json（ja/en のみ）から作る。ja/en 以外の12言語は英文が同じ文言について今の openings.json から引き継ぐ（keep-langs.js）。英文を変えた文言は訳を足す（i18n-langs.js extract/apply）。
- lessons.json：6コース21ステップ×5問（ソルバー／エンジン検証）。生成 tools/lessons-build.mjs（訳は tools/data/lessons-i18n.json を合成）。
- openings.json：7カテゴリ45本（定石23：星・小目・三々/高目/目外し・AI定石、布石22：基本・9/13路・置き碁）。全手解説・変化図・練習問題。生成 tools/joseki/、tools/fuseki-*.mjs、検証 tools/check-openings.mjs。置き碁は評価値を表示しない。
- puzzles.json：詰碁10テーマ×50＝500問（取る・シチョウゲタ・ウッテガエシ・生き/殺し1手3手・5手以上・攻め合い・手筋）。ソルバー tsumego.js（GoTsumego.solve/reached）、生成 tools/gen-tsumego.mjs、検証 tools/test-tsumego.mjs。対象の石に△印。今日の一問あり。

## オンライン
- Firebase プロジェクト go-multiplay（asia-southeast1）。ルールは go/database.rules.json（secrules.py 生成の改ざん対策版）。App Check は reCAPTCHA Enterprise サイトキー設定済み（強制は確認済みリクエストが十分になってから Realtime Database のみ）。共通アカウントの GAME_AUTH に 'go' 追加済み。
- online.js（window.GoOnline）／online-ui.js。日本ルール・コミ6.5固定、盤 v=9/13/19、フィッシャー（9路5分+5秒、13路10分+10秒、19路20分+15秒）。手は K64 2文字（パス '__'）。
- パス2回後は両クライアントが軽量ネットで死に石判定→先着がトランザクションで結果確定、res/<uid> 一致でレート反映。
- 公開前テストの匿名プロフィール「Player5761」が1件 players に残っている（コンソールで削除可）。

## ポータル
- shared/atlas.js GAMES/UPDATES/READ/NAME_GAMES、atlas/icons3d.js ICONS.go（images/atlas/go.webp、他と同じ大きさにトリミング）、atlas/table3d.js MODELS.go、atlas/i18n.js about.go/hist.go。
- 3D（五目並べの碁盤モデル atlas/models/goban.js を共用、MODELS.go(live,{n}) を追加。15路は変更なし）：
  - atlas/rules/go.js：ゴイシペン案内のルール整備10ステップ（9路、10言語）。
  - atlas/games/go.js：ちゃぶ台対局（9/13/19路、日本ルール、パス2回→自動整地、AIは ../go/engine.js、Lv1〜27、レベルの rating はEGF換算）。ボードカードは2行目に「持ち時間｜碁盤サイズ」（1行目の強さ｜手番と同じ列）。
  - atlas/skin/go.js：go/?skin=atlas のフル3D（石の落下・取り上げアニメ、最終手、整地の死に石表示、5〜19路で盤再生成、盤デザイン「榧3D」「漆・沈金3D」）。盤の大きさは2D版とほぼ同じ（手前の側面と脚は少しはみ出す）。フル3Dではレッスン・詰碁の拡大表示はせず全盤表示。
  - atlas/app.js FULL_SKIN に go。

## 保存キー
- aicoding-go（設定）、-lessons、-puzzles、-open、-daily、-rated、aicoding-go-rules-seen、go-online-*。

## 本編のマルチスレッド（2026-11-08）
- `engine_mt.wasm`（engine.c を `-DMT`、tools/build.sh）：全スレッドで1本の木を育てる tree-parallel MCTS（virtual loss、葉の評価は1スレッドだけ、両方のネットを共有メモリに `net_sel`）。通常版の wasm は1バイトも変わらない。`sw.js`（light）、`mt-helper.js`、`engine.js?…&mt=1`。
- ベンチマーク `go/bench.html`（noindex・どこからもリンクしない）：本編と同じ分離（sw.js の DIP）と `engine_mt.wasm` で、9路・19路の各5局面をスレッド数 1, 2, 4, 8, …, `hardwareConcurrency` で一定時間読み、visits/s・1スレッド比・効率・1スレッド長時間の基準との最善手一致を表にする。「結果をコピー」で文字列に。`engine.js` の analyze は `job.nodes`（木のノード数の上限）を受け取る。
- スレッドを使う：ヒント・形勢の分析・コーチ・検討ボックス。AI のレベル（1〜27、レート戦も）は1スレッドのまま（訪問数・1回評価で決まり、時間で考えるレベルはない）。PRO のスレッド数（既定1）を2以上にすると AI の手もスレッドで。情報行に「visits/s」（全スレッドの合計）。測定は MODEL_CARD.md。

## 対局設定の Pro モード（2026-11-08）
対局設定の「AIの強さ」の PRO ボタン（`shared/proset.js`、addendum「対局設定の Pro モード」）。探索するレベル（engine.js LEVELS 21〜27：ネット／探索回数／時間）を元に、項目：思考の制限（時間 0.1〜60 秒／探索回数 1〜2万）、スレッド数（本編のマルチスレッドがオンのとき、どの制限でも。既定1、訪問数の上限は全スレッドの合計）、評価ネット（軽量／強い）。方策だけで打つレベル（1〜20）で変えると、探索する AI になる。ページの `PRO_GO` は engine.js LEVELS の写し。値は `think` の `job.params`（`net`／`visits`／`time`）。レート戦では使わない。戦績のキーは `ai:pro…`、相手名に「PRO」。
