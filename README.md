# CALMDUST COLLECTION — AI CODING ARCADE

AIと一緒に作った、ブラウザですぐ遊べるゲーム集です。
登録・インストール不要。PCでもスマホでも遊べます。

**▶ 遊ぶ: https://core-calmdust.github.io/aicoding/**

## NEORETRO ARCADES

80年代アーケードの手ざわりを、ネオンと現代のゲームデザインで再構築したシリーズ。

🏆 **IVS NEOCREA 準グランプリ / Bandai Namco 021 Fund賞 受賞**

| # | タイトル | ジャンル |
|---|---|---|
| #4 | [COMET OUTBURST+](https://core-calmdust.github.io/aicoding/comet-plus/) 🧪BETA | 3Dシューティング |
| #3 | [COMET OUTBURST](https://core-calmdust.github.io/aicoding/comet/) | シューティング |
| #2 | [DANMAKU INVADER XTREME+](https://core-calmdust.github.io/aicoding/danmaku-inv.html) | 弾幕シューティング |
| #1 | [CYBER PONG XTREME+](https://core-calmdust.github.io/aicoding/pong.html) | 対戦アクション（スマホ対応） |

## 世界のボドゲ大全 — World Board Game Atlas

世界のボードゲームを、本気のAI・レッスン・パズル付きで遊べるシリーズ（約50タイトル予定）。
**[ポータル](https://core-calmdust.github.io/aicoding/atlas/)**：更新されたゲーム、3D盤でそのまま対局（リバーシから対応）、全ゲーム共通の実績・コイン・ショップ・ガチャ・きせかえ、1つのアカウントで全ゲームを同期（[atlas/README.md](atlas/README.md)）。
トップページではアイコン一覧＋詳細パネルで選べます（カテゴリ絞り込み・検索・`#game=<id>` で直接表示、スマホは左右スワイプで切り替え）。

### ♛ プレミアム（AIと本気で対局）

全タイトル共通: 10言語（日本語 / English / 中文 / 한국어 / Español / Français / Português / Deutsch / हिन्दी / العربية）、スマホ対応、形勢グラフと棋譜ナビ（← → ↑ ↓ / Space）、待った（Cmd/Ctrl+Z）、ヒント・コーチ、対局後の振り返り分析、URLでの棋譜共有、レッスンとパズルのタブ付きダイアログ、今日の一問、対局の自動保存と再開。

| タイトル | AI | レッスン | パズル | 特徴 |
|---|---|---|---|---|
| [将棋 SHOGI](https://core-calmdust.github.io/aicoding/shogi/) 🌐 | 10段階 | 14ステップ | 詰将棋137問 | Floodgateの棋譜・評価値で学習、駒落ち、ネット対戦 |
| [Reversi V4](https://core-calmdust.github.io/aicoding/reversi/) 🌐 | 20段階 | 9ステップ | 詰めオセロ1000問 | 学習型評価関数＋終盤20マス完全読み、定石トレーニング85本、ネット対戦（レーティング・部屋・ロビー） |
| [ドット・アンド・ボックス](https://core-calmdust.github.io/aicoding/dots/) | 10段階 | 15ステップ＋図解ルール | 詰めドット450問（9テーマ） | 3×3は完全読み、4×4はLv9/10が完全プレイ（厳密解の定跡＋WebAssembly完全読み、4×4は引き分け）、5×5はLv9/10がWebAssembly解析器で終盤を早くから完全読み（勝敗の証明・負け手の回避・相手の手番中の先読み）、ソルバー検証済みの定跡（3×3・4×4、学習＋通し練習） |
| [コネクトフォー](https://core-calmdust.github.io/aicoding/connect4/) | 8段階 | 5ステップ | 45問 | 完全解析（Lv8 は1手目から完全プレイ・先手なら必勝） |
| [マンカラ](https://core-calmdust.github.io/aicoding/mancala/) | 10段階 | 6ステップ | 100問 | ノーマル／イージー／カラハ／スンカの4ルール、終盤完全読み、物理演算で転がる種、スマホ横画面モード |
| [バックギャモン](https://core-calmdust.github.io/aicoding/backgammon/) | 10段階 | 7ステップ | 16問 | wildbg由来のニューラルネット＋2手読み、ベアオフ完全DB、ダブリングキューブ、3/5/7点マッチ、スマホ横画面モード |
| [ナイン・メンズ・モリス](https://core-calmdust.github.io/aicoding/morris/) | 10段階 | 7ステップ | 90問 | ナイン／トゥエルブ／シックスの3ルール |
| [チェス](https://core-calmdust.github.io/aicoding/chess/) | 10段階 | 7ステップ | メイト問題85問 | Lichessの評価済み約5,400万局面で学習したNNUE（Lv.8で目安Elo 2850）、定跡と読み切り探索、PGN・FEN読み込み（[モデルカード](chess/MODEL_CARD.md)） |
| [五目並べ・連珠](https://core-calmdust.github.io/aicoding/gomoku/) | 10段階 | 12ステップ | 詰め連珠500問 | 連珠（禁手：三三・四四・長連、否三々まで厳密判定）／標準／自由の3ルール、VCF・VCT脅威探索つきαβ探索、26珠型の定石学習、ネット対戦（レーティング・部屋・ロビー） |
| [まいにち数独](https://core-calmdust.github.io/aicoding/sudoku/) | — | — | 厳選1000問＋変わり種300問 | デイリー3難易度（銅・銀・金メダルのカレンダー、月ごとの実績）、オンラインランキング（デイリータイム・月間・累計・コレクション、月間上位にプレミアム実績）、スコアで回すキャラアイコンガチャ（500種）、マップ式の20テーマ×50問、変わり種10ルール（対角線・ウィンドク・ジグソー・偶数奇数・キラー・不等号・アンチナイト・連続・サーモ・アロー）、フリック入力、テクニック解説つきヒント、時間帯で変わる背景と夜テーマ |

🌐 = ネット対戦対応

### クラシック ＆ パズル

| タイトル | 内容 |
|---|---|
| [チェッカー](https://core-calmdust.github.io/aicoding/checker.html) | 斜めに進んで跳び越えて取る |
| [さめが〜め](https://core-calmdust.github.io/aicoding/samegame/) | 同じ色をまとめて消すパズル |

### 過去のバージョン

| タイトル | 内容 |
|---|---|
| [リバーシ v3.1](https://core-calmdust.github.io/aicoding/reversi_v3.html) | Reversi V4 の前バージョン |
| [コネクテッド4](https://core-calmdust.github.io/aicoding/connect4.html) | コネクトフォーの前バージョン |
| [Backgammon V1](https://core-calmdust.github.io/aicoding/backgammon.html) | バックギャモンの前バージョン |

## 将棋 SHOGI について

- **エンジン**: 9×9配列の合法手生成（perftで検証）、PVS＋置換表・反復深化・静止探索・SEE・1手詰判定・千日手/連続王手/入玉宣言（27点法）対応。Web Worker で動作
- **評価関数**: 玉位置つき駒配置（KP）＋持ち駒の線形モデル。Floodgate 2021〜2025年（両者R3000以上）の 262,513局・22,251,071局面の棋譜と、そこに記録された対局エンジンの評価値から学習
- **定跡**: R3500以上の対局の序盤の指し手頻度
- **強さ**: 10段階。最弱は1手読みの入門向け、Lv.8〜10で将棋倶楽部24の5〜4級前後（技巧の深さ別レベルとの対局で計測した目安）
- **レッスン**: 20級〜三段の14ステップ（駒の動き→タダの駒→王手の受け→1手詰→3手詰→両取り→詰めろ受け→5/7/9/11手詰・次の一手）。1問20点・減点方式で75点以上で合格。格言の例外問題（取ると損な駒）も混ぜて出題。問題はAIの自己対局から自動抽出し、詰み探索・深い探索で検証。段級位は当サイト基準の目安
- **詰将棋**: 実戦詰将棋（1〜9手以上）と、余分な駒を削って手順を一通りに検証した創作風詰将棋
- **機能**: ヒント（候補手の矢印）、指し手の採点、悪手の復習、形勢グラフ、待った、投了、駒落ち（香〜六枚）、KIF形式コピー、ドラッグ操作、対局の自動保存
- **モデルカード**: [shogi/MODEL_CARD.md](shogi/MODEL_CARD.md)

## Reversi V4 について

- **エンジン**: ビットボード（32bit×2）、PVS＋置換表、Multi-ProbCut（自前データでフィット、Lv15以上）、反復深化と時間制御、終盤完全読み（最大20マス）。Web Worker で動作し、4コア以上の端末では Lv17〜20 で候補手を複数 Worker に分担（ルート分割の並列探索）
- **評価関数**: 15種62インスタンスのパターン評価＋着手可能数特徴 × 30フェーズ。約4,786万局面で学習
- **強さ**: 20段階（入門Ⅰ〜最強）。レベル同士の対戦で強さの順と間隔を計測（Elo表は MODEL_CARD.md）
- **定石**: 自前のエンジンで深さ14まで読んで作った序盤定石（1,927局面、序盤13手目まで）。Lv15以上で使用し、序盤は即座に、毎回少し違う手で指します
- **レッスン**: 9ステップ（ルール → 隅とX・C → 着手可能数 → 開放度 → 壁と余裕手 → 付け手 → 隅は絶対ではない → 偶数理論 → 勝ち切る）。各ステップ5問、格言の「例外問題」も混ぜて出題。問題は自己対戦から自動抽出し、深い読み（終盤は完全読み）で正解を検証済み
- **定石トレーニング**: 虎・兎・牛など名前のついた定石85本を9ステップで出題（通し稽古モードつき）。定石手20点、別の定石16点、それ以外はAI評価の順位で採点。対局中は今の定石名を表示
- **振り返り・共有**: 終局後の全手分析（悪手・一致率）、棋譜のURL共有と読み込み、今日の一問
- **詰めオセロ**: 1000問。レベル別（空き2〜18マス・7段階）、テーマ別11種（偶数理論・連打・最大返しの罠・隅の罠・X/C打ち・辺・着手封じ・引き分け・最善石差など）、ユニーク7種（傑作選・意外な一手・唯一の勝ち筋・大逆転・全滅・対称形・僅差）。自己対戦の局面を自前エンジンの完全読みで解析し、正解手の一意性を確認、テーマは盤面の特徴から自動判定。相手は完全読みで最善の応手
- **コーチ**: 対局中、自分の手を「最善手／好手／疑問手／悪手」で評価
- **機能**: ヒント（全候補手の評価値）、形勢グラフ（ドラッグで局面を振り返り）、待った、棋譜コピー、効果音、対局の自動保存
- **言語**: 10言語（日本語 / English / 中文 / 한국어 / Español / Français / Português / Deutsch / हिन्दी / العربية）
- **モデルカード**: [reversi/MODEL_CARD.md](reversi/MODEL_CARD.md)

## 構成

```
index.html          トップページ（ゲーム一覧：アイコン＋詳細パネル）
shogi/              将棋 SHOGI（index.html / engine.js / i18n.js / weights.bin.gz / book.json / lessons.json / tsume.json / MODEL_CARD.md）
reversi/            Reversi V4（index.html / engine.js / i18n.js / online.js / weights.bin.gz / openings.json / lessons.json / puzzles.json / MODEL_CARD.md）
dots/ connect4/ mancala/ backgammon/ morris/ chess/ gomoku/   世界のボドゲ大全の各タイトル
comet/ comet-plus/ samegame/ sudoku/ quiz/   各ゲーム
*.html              単一ファイルのゲーム（旧バージョンなど）
images/             サムネイル・アイコン（images/icons/）
```

ビルド不要の静的サイトです。ローカルで動かす場合は、任意の静的サーバーで配信してください（各ゲームは Web Worker と fetch を使うため、ファイルを直接開くのではなくサーバー経由が必要です）。

```sh
python3 -m http.server 8000
# → http://localhost:8000/
```

## クレジット

- 将棋 SHOGI の評価関数と定跡は、[コンピュータ将棋対局場 Floodgate](https://wdoor.c.u-tokyo.ac.jp/shogi/) で公開されている棋譜から学習しました。棋譜データ自体はこのリポジトリに含まれていません。
- Reversi V4 の評価関数は、[Egaroucid](https://www.egaroucid.nyanyan.dev/ja/) のサイトで公開されている学習データを使って学習しました。学習データ自体はこのリポジトリに含まれていません。
- チェスの評価関数（NNUE）は、[Lichess の評価済み局面データベース](https://database.lichess.org/#evals)（CC0）の局面で学習しました。学習データ自体はこのリポジトリに含まれていません。
- バックギャモンは [wildbg](https://github.com/carsten-wenderdel/wildbg)（© 2023 Carsten Wenderdel、MIT / Apache-2.0）のニューラルネットを JavaScript に移植して同梱しています（詳細は [backgammon/THIRD_PARTY_LICENSES.txt](backgammon/THIRD_PARTY_LICENSES.txt)）。軽量ネットは自前の自己対局局面に、wildbg の評価値と [wildbg-training](https://github.com/carsten-wenderdel/wildbg-training) のロールアウトデータ（CC0）でラベルを付けて学習しました。

## ライセンス

[Apache License 2.0](LICENSE)

Copyright 2026 core-calmdust
