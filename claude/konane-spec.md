# コナネ（konane/）仕様

URL: https://core-calmdust.github.io/aicoding/konane/ ／ トップは「アルケルケ」の次（cat: chess、定番タグ）。テーマ色 #0f8a7e（ティール）。

## ルール（8×8 を既定、ゲームタブで 6×6・8×8・10×10）
- すべてのマスに黒白の石を交互に置いて開始（a1＝黒、黒が先手 P1）。
- 1手目：黒が中央の2×2か四隅にある黒石を1個取り除く。2手目：白がその穴の上下左右に隣接する白石を1個取り除く。
- 以降の手はすべて「縦横に隣の相手の石を跳び越えて、その先の空きマスへ」。跳び越えた石を取る。同じ向きなら連続で跳べ、どこで止めてもよい（向きは変えられない）。斜めは不可。
- 自分の番に跳べる手がない側の負け。引き分けはない（引分提案ボタンも出さない）。
- 出典（2026-11 確認）：Wikipedia「Kōnane」、likonane.org、Board Game Arena、mindsports.nl。歴史：NPS（プウホヌア・オ・ホナウナウのパパムー）、Kaʻiwakīloumoku（カメハメハ・スクールズ）、Images of Old Hawaiʻi（クック：238マス・1列14、キャンベル：片側18個・カメハメハの腕前、ピコ・カカイ、ペレとカマプアア）、Hawaiʻi Public Radio（2026年2月 ビショップ博物館の招待トーナメント）。

## エンジン（engine.js、純JS、Web Worker）
- setRule('s6' | 's8' | 's10') で盤を作り直す（RC・RAYS・ADJ・OPEN1）。手 m = from + 128×to。取り除き（序盤2手）は from = to。
- 評価：跳べる手の数の差×34 ＋ 跳べる石の数の差×52 ＋ 手番30（約100＝余裕1手）。negamax＋TT＋killer、反復深化。
- 20段階（Lv. 表記）：弱い段はノイズ付き浅読み（終局の一手は逃さない）、中段はノード数、Lv.19/20 は 1.2 秒／2.5 秒。RT_LV は app.js。
- ソルバー：duelGood / duelMin / duelReply（N 手以内に相手を跳べなくする、相手は最長抵抗）、winningMoves / solve（完全読み、レッスンの正解集合）。

## 画面（ugolki/ から派生）
- 盤（tools/gen_art.py ＋ gen_art_more.py のレンダリング画像、方針は「アーティスティックに」：質感の写実より絵としての美しさ）8種：ハワイアンキルト（既定）・オーシャンアート（ラッセン風の夕日の海・イルカ・ホヌ）・コナ・アート（水彩のモンステラ・ハイビスカス・プルメリア）・石のパパムー（風化した玄武岩、プリミティブ）・コアの盤・モダン3種（グレー・サンセット・ミッドナイト）。駒5種：玄武岩と珊瑚の小石（既定、なめらか）・真珠・コア材・ガラス・マット。ボツボツ・多孔質など対局中に気が散る質感は使わない。各マスにプカ（くぼみ）、座標 a–j / 1–10。
- 盤の上下：取られた数と跳べる手の数のプレート。序盤は取り除ける石が光る（rmable）、以後は「跳べる石を光らせる」オプション（mov）。最後の1手の残りは盤下の案内。
- ルール（RuleTour、実際の盤）：紹介 → 盤と石 → 黒の取り除き → 白の取り除き → 跳んで取る → 連続ジャンプ → 曲がれない → 途中で止まる → 跳べなくなったら負け → 盤の大きさ。
- レッスン9（tools/gen_lessons.js ＋ lesson_ramps.js、正解集合はルール／完全読みで計算）：はじめて4（最初の取り除き・取れる石を探す・連続ジャンプ・最後の跳び）、作戦5（相手の手を数える・途中で止まる・続けて跳ぶ・自分の手を残す・先を読む）。各5問・満点20・合格75。
- パズル（tools/gen_puzzles.js → build_puzzles.js、PZBook v2 の勝ち切り型）：「N 手以内に相手を跳べなくせ」、相手は最長抵抗。勝ちの初手は1〜2通り、「相手の跳べる手が最も減る手」だけでは解けないものだけ。テーマ7＝N手で勝て（w1〜w5）＋止まって勝つ（stop）＋続けて勝つ（chain）。1手で勝て（w1）は簡単すぎるので難しい順に10問だけ、ほかは各36問・計226問。build 時に全問を再検証。
- コーチ（coach.js / coach-i18n.js 10言語）：序盤は評価値ではなくルールで解説（中央か隅か・どの隣を取るか、AIの好みは「少し好む」とだけ）。以降は方針分類（最後の跳び・連続跳び・途中で止める・相手の手を消す・自分の手を残す・端へ）と、跳んだ後の双方の「跳べる手」の数。
- オンライン：Firebase プロジェクト konane-multiplay（App Check サイトキー設定済み）。ルールは shared/tools/secrules.py の konane（s8・s6、引き分けなし）→ konane/database.rules.json。DBルールはコンソールに貼り付け、App Check に reCAPTCHA Enterprise キーを登録（claude/online-security-setup.md）。10×10 はオフラインのみ（K64 の 3 文字エンコードが 64 マスまで）。

## 3D（ポータル）
- atlas/models/konane.js：3D盤2種（Table3D.BOARDS.konane、保存キー atlas-konane-look）。'papamu'（既定、ヒストリアの内容に合わせる）と 'quilt'。'quilt'＝オイル仕上げのコアのトレーにハワイアンキルト（bd-quilt＋fr-koa、各マスに縫い取りのくぼみ）、'papamu'＝手で割って整えた不揃いな輪郭の玄武岩の板に手で刻んだくぼみ（bd-stone／fr-stone、プリミティブ）。石はキルト盤ではなめらかな白い珊瑚と黒い玄武岩の小石、パパムーでは形の不揃いなざらついた浜の小石（4形）。board(n, look) で 6/8/10。サムネイル atlas/img/board-konane-<look>.webp（atlas/tools/boards.html）。
- atlas/skin/konane.js（フル機能版 ?skin=atlas）：デザインタブの「盤面」の箱の中、2D盤の下に「3D盤」の小箱（3D盤2種のタイル、ポータルの「盤」と同じキー。3Dタイル・説明文はなし）、盤サイズ・3D盤の変更で作り直し、取り除き・取られた石は浮いて消える。atlas/games/konane.js（ちゃぶ台対局、8×8）、atlas/rules/konane.js（チェッカニのルールコース、6×6、autoNext）。
- アイコン：atlas/icons3d.js の konane()（石のパパムーの角と浜の小石）→ images/atlas/konane.webp。ヒストリア：atlas/historia/s/konane.json ＋ 10言語、案内役 av/hermit-0。地図：atlas/mapdata.js（ハワイ島・カウアイ島・ホノルル）。

## 保存キー
- aicoding-konane（設定・対局）、-lessons、-puzzles、-daily、-rated、-rules、aicoding-konane-rules-seen、konane-online-name。
