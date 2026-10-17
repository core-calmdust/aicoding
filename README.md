# ゲーム制作＠バイブコーディング — AI CODING ARCADE

AIと一緒に作った、ブラウザですぐ遊べるゲーム集です。
登録・インストール不要。PCでもスマホでも遊べます。

**▶ 遊ぶ: https://core-calmdust.github.io/aicoding/**

## NEORETRO ARCADES

80年代アーケードの手ざわりを、ネオンと現代のゲームデザインで再構築したシリーズ。

🏆 **IVS NEOCREA 準グランプリ / Bandai Namco 021 Fund賞 受賞**

| # | タイトル | ジャンル |
|---|---|---|
| #3 | [COMET OUTBURST](https://core-calmdust.github.io/aicoding/comet/) | シューティング |
| #2 | [DANMAKU INVADER XTREME+](https://core-calmdust.github.io/aicoding/danmaku-inv.html) | 弾幕シューティング |
| #1 | [CYBER PONG XTREME+](https://core-calmdust.github.io/aicoding/pong.html) | 対戦アクション（スマホ対応） |

## ボード＆パズル

| タイトル | 内容 |
|---|---|
| [将棋 SHOGI](https://core-calmdust.github.io/aicoding/shogi/) 🆕 | Floodgateの棋譜・評価値で学習した将棋AI、段級位別レッスン、詰将棋（スマホ対応） |
| [Reversi V4](https://core-calmdust.github.io/aicoding/reversi/) | 学習型評価関数＋終盤完全読みの本格AI（スマホ対応） |
| [リバーシ v3.1](https://core-calmdust.github.io/aicoding/reversi_v3.html) | 前バージョン。多彩なAIとCPU同士の対戦 |
| [バックギャモン](https://core-calmdust.github.io/aicoding/backgammon.html) | サイコロと読みの古典ボードゲーム |
| [コネクテッド4](https://core-calmdust.github.io/aicoding/connect4.html) | 縦・横・斜めに4つ並べる |
| [チェッカー](https://core-calmdust.github.io/aicoding/checker.html) | 斜めに進んで跳び越えて取る |
| [さめが〜め](https://core-calmdust.github.io/aicoding/samegame/) | 同じ色をまとめて消すパズル |
| [無限数独](https://core-calmdust.github.io/aicoding/sudoku/) | 尽きることのない数独 |

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

- **エンジン**: ビットボード（32bit×2）、PVS＋置換表、反復深化と時間制御、終盤完全読み（最大20マス）。Web Worker で動作
- **評価関数**: 11種46インスタンスのパターン評価＋着手可能数特徴 × 30フェーズ。約4,786万局面で学習
- **強さ**: 10段階（入門〜最強）
- **レッスン**: 9ステップ（ルール → 隅とX・C → 着手可能数 → 開放度 → 壁と余裕手 → 付け手 → 隅は絶対ではない → 偶数理論 → 勝ち切る）。各ステップ5問、格言の「例外問題」も混ぜて出題。問題は自己対戦から自動抽出し、深い読み（終盤は完全読み）で正解を検証済み
- **コーチ**: 対局中、自分の手を「最善手／好手／疑問手／悪手」で評価
- **機能**: ヒント（全候補手の評価値）、形勢グラフ（ドラッグで局面を振り返り）、待った、棋譜コピー、効果音、対局の自動保存
- **言語**: 日本語 / English / 中文 / 한국어
- **モデルカード**: [reversi/MODEL_CARD.md](reversi/MODEL_CARD.md)

## 構成

```
index.html          ゲーム一覧ページ
shogi/              将棋 SHOGI（index.html / engine.js / i18n.js / weights.bin.gz / book.json / lessons.json / tsume.json / MODEL_CARD.md）
reversi/            Reversi V4（index.html / engine.js / i18n.js / weights.bin.gz / lessons.json / MODEL_CARD.md）
comet/ samegame/ sudoku/ quiz/   各ゲーム
*.html              単一ファイルのゲーム
images/             サムネイル・アイコン
```

ビルド不要の静的サイトです。ローカルで動かす場合は、任意の静的サーバーで配信してください（Reversi V4 は Web Worker と fetch を使うため、ファイルを直接開くのではなくサーバー経由が必要です）。

```sh
python3 -m http.server 8000
# → http://localhost:8000/
```

## クレジット

- 将棋 SHOGI の評価関数と定跡は、[コンピュータ将棋対局場 Floodgate](https://wdoor.c.u-tokyo.ac.jp/shogi/) で公開されている棋譜から学習しました。棋譜データ自体はこのリポジトリに含まれていません。
- Reversi V4 の評価関数は、[Egaroucid](https://www.egaroucid.nyanyan.dev/ja/) のサイトで公開されている学習データを使って学習しました。学習データ自体はこのリポジトリに含まれていません。

## ライセンス

[Apache License 2.0](LICENSE)

Copyright 2026 core-calmdust
