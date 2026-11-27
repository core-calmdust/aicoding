# 引き継ぎ：3D未対応ゲームの3Dレッスン・パズル対応（担当C・担当D の仕事）

2026-11-27 作成。3D卓（atlas/）でレッスン・パズルにまだ対応していないゲームを対応する仕事を、別のアカウントに引き継ぐための資料。
品質の基準・ログ・進み具合の正本は **claude/lesson-quality.md**。この資料はその入口と、今の状態・残りの作業・手順をまとめたもの。食い違ったら lesson-quality.md と、ユーザーの最新の指示を優先する。

## 1. まず読むもの（この順）

1. `CLAUDE.md`：返事は日本語、作業後は PR → main へマージまで（確認不要）、版番号（`?v=`）の上げ方。
2. `claude/handoff-common-rules.md`（全体像）、`claude/game-conventions-addendum.md`（共通ルール。「双六系のゲームにレッスン・パズルは作らない」を含む）。
3. `claude/lesson-quality.md`：
   - 「目標」（セリフの基準。案内キャラの口調・起承転結・理由は盤の事実）
   - 「第2期：問題の検証ループ」の ①〜⑨（合否の基準）
   - 「追加の基準」の頭の「さかのぼりを減らす」1〜6 と 追1〜追88
   - 「3D未対応ゲームの対応（担当C・担当D）」（1ゲームの完成の条件 1〜6）
   - 「検証の進み具合」表の foxgeese〜latrunculi の7行（備考に、次回やることと「追N 未確認」が書いてある）
4. `claude/atlas-portal-spec.md`（3D卓のパズル・レッスン）と、対象ゲームの `claude/<id>-spec.md`。

## 2. いま守っているユーザーの指示（2026-11-27 時点）

- **追N は追88 で固定**（2026-11-25「一旦評価の追加はここで抑えて良い」）。lesson-quality.md の3D の節には「新しい種類の問題を見つけたら 追N を足す」とあるが、今はこちらが優先。①〜⑨と追1〜追88 で拾えない問題は直したうえで、ログに「基準外の問題」と1行書くだけにする。
- **さかのぼりを減らす**：「追N 未確認」だけを片づける回は作らない。そのゲームを検証するときに一緒に当て、当てた分は表から消す。
- **質を落とさずに速く**（2026-11-26）：「さかのぼりを減らす」6.（検証済みの問題は読み直さない、2つ目の深さの読みは差が小さい問題だけ、など）。基準は外さない。
- **基準を甘くする変更はしない**（機械チェックの線を下げない、pending に逃がさない）。
- **双六系（ur・senet・patolli・ludo）にはレッスン・パズルを作らない**（2026-11-24）。手をつけない。
- 下の7ゲームが終わったあとに、ほかのゲーム（peg など3D卓があってレッスン・パズルのないもの）へ広げるかどうかは、**ユーザーに確認する**。勝手に広げない。
- リポジトリは公開。未発表の企画などは書かない。

## 3. 今の状態（7ゲーム）

担当C・担当D は 2026-11-25 06:40 JST から休止中で、定期実行は無効。最後の作業は 2026-11-25 06:02（担当D・ugolki s_count の試行・見送り）。

| ゲーム | 案内キャラ | 状態 | 残り |
|---|---|---|---|
| foxgeese 狐とガチョウ | ドミダック | **3D対応済み**（パズル250問・レッスン6本30問） | なし |
| janggi チャンギ | ショウギツネ | **3D対応済み**（パズル289問・レッスン15本75問） | なし（e_rook q3 の作り直しと追88 は 2026-11-27 #3936 で済み） |
| konane コナネ | チェッカニ | 一部（パズル226問・レッスン4本20問） | レッスン5本25問：s_go・s_keep・s_read（`konane/tools/ls_strat_gen.js` の読み切りで作れる。**その準備の正解の手が盤にない＝追75**も直す）、b_open・b_jump（どの合法手も正解になる形なので、選ぶ問題の作りから見直す） |
| ugolki ウゴルキ | モリフク | **3D対応済み**（パズル152問・レッスン11本55問。s_count は 2026-11-27 に作り直し） | 2D の追58 未確認：ugolki/i18n-ug-pzwhy.js の pz.why.* が en 以外の12言語で数の後ろに複数形の名詞（es「{k} piezas」「{n} jugadas」など）。数が1になりうるので、数を名詞の後ろに置くか1のときの文を持つ。機械チェックも足す |
| fanorona ファノロナ | チェッカニ | 一部（パズル199問） | **レッスン12本60問すべて**（b_approach・b_withdraw・b_choose・b_chain・b_safe・b_win・t_big・t_count・t_stop・t_paika・e_hunt・e_trap） |
| agon アゴン | キンダイスン | 未 | パズル（x2・w3〜w5・b3〜b5 の7テーマ 152問）とレッスン12本56問。追88 未確認（2D の詰めパズル puzzleMove が外れた手を戻す・正解の手を出す） |
| latrunculi ラトルンクリ | ポンメェ | 未 | パズル（t2・t3・t4・corner・double の5テーマ 250問）とレッスン7本35問 |

おすすめの順：（janggi の NG 直し・ugolki s_count は済み）→ konane の残り → ugolki の2D 追58 → fanorona のレッスン → agon → latrunculi。大きいゲームは「パズル → レッスン数本ずつ」に区切ってマージしてよい（表は「一部」）。

## 4. 1ゲームを載せるときの場所（手本は foxgeese・konane・janggi・ugolki・fanorona）

- **3D卓のアダプタ** `atlas/games/<id>.js`：パズルモード `ctx.pz`／`api.pz`（load・play・wait・undo・mark・moves など）。
- **3D パズルの外れた手の文** `atlas/games/<id>-pz.js`（例：foxgeese-pz.js・janggi-pz.js・fanorona-pz.js）。`atlas/lazy.js` の `G["<id>"]` に足して読む。
- **3D パズルの登録** `atlas/puzzles.js`：`G[id]`（案内キャラの guide 画像・14言語の名前。ルール説明 `atlas/rules/<id>.js` と同じキャラ・口調）と `BOOK[id]`（2D の puzzles.json の url・記録の localStorage キーは2D版と同じ）。走らせる関数（fgMoved・faMoved など）とヒント。
- **3D レッスン** `atlas/ls-<id>.js`（データ・セリフ・盤の事実。`READY` に入れた本だけ出す）と、`atlas/lessons3d.js` の `DATA[id]` に読み込みの数行（チャンギは `atlas/games/janggi-ls.js`）。
- **一覧に出す** `atlas/app.js` の `MXG[id]`。
- **2D版**：`<id>/lessons.json`・`<id>/puzzles.json`（3D と共用。作り直したら2D の表示・判定・14言語の i18n も直す）。
- **機械チェック**：`tools/lesson-verify-<id>.js`（と `-ls.js`）を作り、`tools/lesson-verify.js <id>` から呼ぶ。`--selftest` で、わざと壊したデータ（答え・並び・保存値など）を検出できることを確かめる。
- **セリフの点**：`tools/lesson-quality.js` の対象にそのゲームのレッスン・パズルを入れる（TIC に口癖、パズルは `<id>/pz` として）。
- **進行チェック**：`tools/lesson-progress.js` に入れる。
- 共有ファイル（lessons3d.js・puzzles.js・app.js・lazy.js・index.html・lesson-verify.js・lesson-quality.md）の変更は登録の数行にとどめ、中身はゲームごとの別ファイルに置く。

完成の条件（lesson-quality.md「3D未対応ゲームの対応」の 1〜6）：全問を①〜⑨・追1〜追88 で検証して不合格は作り直す（2D の問題をそのまま移さない）／機械チェック全問合格／セリフ pass 95 以上／進行チェック通過・3D（390×844 と 1440×900）と2D で正解・不正解・自動送りの表示確認・14言語／`claude/<id>-spec.md` と `claude/atlas-portal-spec.md` を更新。

## 5. 1回分の進め方

1. `git fetch` して **必ず最新の origin/main から**作業ブランチを作る。
2. ログ表に「停止中」や自分の「担当X 完了」がないか確かめる。同じ担当の未マージ PR が作成から50分以内にあれば、何もしない。
3. 対象を決めたらすぐ、進み具合表の備考に「作業中（担当X・開始時刻 JST）」と書いた最初のコミットを push（追12。ほかの担当と重ならないようにする印）。
4. 検証 → 作り直し → 機械チェック（`node tools/lesson-verify.js <id>`、`--selftest`）→ `node tools/lesson-quality.js --json /tmp/lq.json`（対象が pass 95 以上・全体を下げない）→ `node tools/lesson-verify.js near53`・`plural58`（共通の文のチェック）→ `tools/lesson-progress.js` → 表示確認（`python3 -m http.server` ＋ puppeteer、`atlas/#games/<id>` → パズル／レッスン → あそぶ、`window.__atlasLs.state()`／`answer()`）。
5. 版番号を上げる（CLAUDE.md：`atlas/index.html` と `atlas/lazy.js` の `?v=`、i18n を変えたら i18n-split）。
6. lesson-quality.md のログ表に1行（日時 JST・担当・ゲームと範囲・「3D対応（範囲）」・検証した問題数・不合格と作り直した数・当てた「追N 未確認」・基準外の問題・機械チェック 何問中何問合格・セリフの点・PR番号）、進み具合表を更新（作業中の印は消す）。
7. コミット → push → main 向け PR → squash マージ。マージ前に最新の main を取り込み、衝突は両方の変更を残して解消する（版番号は大きいほうに +1）。衝突の印（`<<<<<<<`）を残さない。

注意：

- 担当A（レッスン、`lesson-loop-`）・担当B（定跡、`lesson-open-`）は毎時動いていて、同じ共有ファイルを触る。衝突は毎回ありうる。
- 3時間ごとの報告（`lesson-report-`、もとのアカウント）は C〜F を**見るだけ**（2026-11-27〜）：未マージの PR・止まっていそうな担当・進み具合を報告に書くが、C〜F の PR をマージ・クローズしない。止まった PR は自分の担当で片づける（作ったらすぐマージまで進める）。
- 中途半端な3D表示を出さない。未完成のレッスン・パズルは一覧に出さない（`has` が false・`READY` に入れない）。
- 道具の目安：`lesson-facts.js`・`lesson-verify.js`・`lesson-quality.js` を全部回すと2コアの環境で40分ほどかかる。回の中では対象のゲームと near53 だけでよい（全ゲーム分は報告で回す）。lesson-quality.js には Chrome（`/usr/bin/google-chrome`）と puppeteer-core（`/opt/npm-tools/node_modules/puppeteer-core`、または環境変数 `CHROME`・`PUPPETEER_CORE`）が必要。

## 6. 担当の分け方（2026-11-27〜、別のアカウントで C〜F の4名）

| 担当 | 範囲（めやす） | ブランチ | 実行（UTC） |
|---|---|---|---|
| C | konane | `lesson-new-c-` | 毎時31分 |
| D | janggi の NG 直し → ugolki s_count | `lesson-new-d-` | 毎時1分 |
| E | fanorona のレッスン12本 | `lesson-new-e-` | 毎時11分 |
| F | agon（パズル → レッスン） | `lesson-new-f-` | 毎時41分 |

latrunculi は最初に手が空いた担当が取る（取る前に「作業中」の印を見て重ねない）。1ゲームを2人で分けない（同じゲームのデータで衝突するため）。担当A（16分）・B（46分）と時刻を重ねない。

## 7. 定期実行で回す場合

もとの担当C（毎時31分 UTC、ブランチ `lesson-new-c-`）・担当D（毎時1分 UTC、`lesson-new-d-`）の定期実行は、もとのアカウントで無効のまま残っている。引き継ぎ先で回すときは、引き継ぎ先のアカウントで定期実行を作る。ブランチ名は `lesson-new-c-`／`lesson-new-d-` をそのまま使う（報告の見張りとログがこの名前で追っている）。プロンプトの骨子：

> core-calmdust/aicoding の「3Dレッスン品質ループ：3D未対応ゲームの対応」の担当C（または D）を1回分進める。返答は日本語で簡潔に。範囲は（C：konane・foxgeese／D：janggi・ugolki・fanorona・agon・latrunculi）。ほかの担当の範囲には手を出さない。まず claude/lesson-3d-handoff.md と claude/lesson-quality.md を読み、その「5. 1回分の進め方」に従う。追N は追88 で固定（新しい 追N は足さず、基準外の問題としてログに書く）。「追N 未確認」だけの回は作らない。自分の範囲がすべて「3D対応済み」で「追N 未確認」も残っていなければ、ログに「担当X 完了」と書いて以後は何もしない。最後に、何を3D対応し、何問中何問が不合格で、どう直したかを3〜5行で報告する。

再開したら、lesson-quality.md の3D の節の「休止中」の行を書きかえる（再開した日時と、引き継ぎ先で動いていること）。もとのアカウントの3時間ごとの報告は今「C・D は休止中、再起動しない」としているので、ユーザーに伝えて報告の指示も合わせてもらう。
