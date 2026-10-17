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
| [Reversi V4](https://core-calmdust.github.io/aicoding/reversi/) 🆕 | 学習型評価関数＋終盤完全読みの本格AI（スマホ対応） |
| [リバーシ v3.1](https://core-calmdust.github.io/aicoding/reversi_v3.html) | 前バージョン。多彩なAIとCPU同士の対戦 |
| [バックギャモン](https://core-calmdust.github.io/aicoding/backgammon.html) | サイコロと読みの古典ボードゲーム |
| [コネクテッド4](https://core-calmdust.github.io/aicoding/connect4.html) | 縦・横・斜めに4つ並べる |
| [チェッカー](https://core-calmdust.github.io/aicoding/checker.html) | 斜めに進んで跳び越えて取る |
| [さめが〜め](https://core-calmdust.github.io/aicoding/samegame/) | 同じ色をまとめて消すパズル |
| [無限数独](https://core-calmdust.github.io/aicoding/sudoku/) | 尽きることのない数独 |

## Reversi V4 について

- **エンジン**: ビットボード（32bit×2）、PVS＋置換表、反復深化と時間制御、終盤完全読み（最大20マス）。Web Worker で動作
- **評価関数**: 11種46インスタンスのパターン評価 × 15フェーズ。約2,551万局面で学習
- **強さ**: 10段階（入門〜最強）
- **機能**: ヒント（全候補手の評価値）、形勢グラフ（ドラッグで局面を振り返り）、待った、棋譜コピー、効果音、対局の自動保存
- **モデルカード**: [reversi/MODEL_CARD.md](reversi/MODEL_CARD.md)

## 構成

```
index.html          ゲーム一覧ページ
reversi/            Reversi V4（index.html / engine.js / weights.bin.gz / MODEL_CARD.md）
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

- Reversi V4 の評価関数は、[Egaroucid](https://www.egaroucid.nyanyan.dev/ja/) のサイトで公開されている学習データを使って学習しました。学習データ自体はこのリポジトリに含まれていません。

## ライセンス

[Apache License 2.0](LICENSE)

Copyright 2026 core-calmdust
