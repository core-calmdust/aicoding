# バックギャモンAI 強化リサーチ（2026-10-18）

前提：サイトは Apache-2.0 で公開。同梱物は MIT / BSD / Apache-2.0 / CC0 等の許容的ライセンスのみ。GPL 系（GNUbg の重み・.bm・コード、それらから直接蒸留した重み）は同梱しない。

## 1. データ源と重み（ライセンスはファイルを実際に確認）

| 候補 | 内容 | 規模 | ライセンス | この環境から取得 | 採否 |
|---|---|---|---|---|---|
| **wildbg-training**（github.com/carsten-wenderdel/wildbg-training） | ロールアウト済み局面（GNUbg Position ID＋勝率/ギャモン率）。1局面 1296 ゲームの 1-ply ロールアウト。0001〜0022 世代 | 合計約300万行（最新 contact #21＝20万、race #22＝10万＋#16＝20万）、500MB | **CC0-1.0**（LICENSE 確認） | git clone 可 | **採用**（教師データ） |
| **wildbg**（github.com/carsten-wenderdel/wildbg、`nets` ブランチ） | Rust 製エンジン。contact/race の2ネット（ONNX）。教師ありで rollout を学習（TD 学習なし） | contact 202→300→250→200→6（HardSigmoid）、race 186→300→250→200→6（ReLU）、各約18.5万パラメータ | **MIT OR Apache-2.0**（LICENSE-MIT / LICENSE-APACHE 確認） | git clone 可 | **採用**（重みを float16 で同梱＋蒸留の教師） |
| Open Sage / bgsage（github.com/markbgsage/bgsage, PyPI） | 強力な NN エンジン（XG Roller++ 相当を主張）。重み・ベアオフDB同梱 | 800MB | **MPL-2.0**（ファイル単位コピーレフト） | clone 可 | 不採用（許容的ライセンスの条件外。MPL ファイルは MPL のまま配布・ソース開示が必要） |
| GNU Backgammon の重み・学習DB（contact/crashed/race .bm、train-data） | ロールアウト済みベンチマーク・学習局面、gnubg.weights | 数十〜数百MB | **GPL**（gnubg-nn ツールは GPL v2 バッジ） | 一部のみ | **不採用**（Apache サイトに同梱不可。オフライン参照もリスク） |
| 公開棋譜（FIBS ログ、DailyGammon、BMAB、Backgammon Galaxy の .mat/.sgf） | 人間の対局記録（評価値ラベルなし） | 大 | 統一ライセンスなし／利用規約依存 | 不明 | 不採用（ラベルが無く、強さへの寄与は小。権利関係不明） |
| XG / BGBlitz | 商用最強クラス | — | 独占的 | — | 参考のみ |

## 2. アルゴリズム比較（要点）

- **TD-Gammon / TD(λ)**（Tesauro 1995）：自己対戦の時間差学習。原理的に強いが、収束に数百万〜数千万局が必要。2コアでは前回 83万局で頭打ちだった（当サイト旧ネット）。
- **GNUbg 方式**：入力は生の盤面表現（各点4ユニット）＋手作り特徴（脱出数・封じ込め・被打率など）。contact / crashed / race の3ネット＋高速な「pruning ネット」で候補手を絞る。強さの決め手は**ロールアウト値への教師あり学習**（TD で初期化→ロールアウト済み局面で学習）。
- **wildbg**：特徴量なしの TD 風入力＋深めの MLP（3隠れ層）を、自前ロールアウト（1296 ゲーム/局面）で教師あり学習。世代ごとに「旧ネットで局面生成→ロールアウト→学習」を22世代繰り返している。
- **XG / BGBlitz**：大規模ロールアウト＋多ネット、XG Roller 系の打ち切りロールアウトで評価。
- **AlphaZero 型（Stochastic MuZero, Antonoglou et al. ICLR 2022）**：確率ノード付き MCTS。バックギャモンで GNUbg 相当に到達したが、学習には大規模計算（TPU）が必要で 2コアでは非現実的。
- **知識蒸留**：強い教師（ここでは wildbg、MIT/Apache）の評価値を、高速な小型ネットに学習させる。ラベルは教師の推論だけで作れるので、ロールアウトより数百倍安い。
- **探索**：n-ply＋候補手フィルタ（GNUbg の move filter：0-ply で上位 N 手→1-ply→2-ply）、打ち切りロールアウト、分散削減（同じダイス列・色交換、運の補正）。

### 2コア環境での「計算あたりの効果」
1. **既存の強いネット（許容ライセンス）をそのまま使う**：学習コスト0で精度が段違い。ロールアウト真値との誤差（RMSE）は旧ネット 0.150／前回の改良版 0.138 に対し wildbg 0.057（contact）。最大の効果。
2. **ロールアウト真値（CC0）への教師あり学習＋wildbg からの蒸留**：小型高速ネットの精度を大きく上げられる。これを候補手の絞り込みと 1-ply 内の相手応手選択に使えば、強いネットでの探索が速くなる（GNUbg の pruning ネットと同じ考え方）。
3. 自前ロールアウト：1局面 1296 ゲームは 2コアで1日あたり数千局面しか作れず、効率が悪い。
4. TD(λ) の継続：前回の結果では頭打ち。

## 3. 推奨プラン（期待効果）
- A. wildbg の contact/race ネットを JS に移植して同梱（float16、約0.7MB）。ONNX Runtime との出力差は最大 2e-4。Lv7 以上と分析で使用。期待効果：0-ply で大幅（+0.3 ppg 以上を想定）。
- B. 自前の高速ネット（GNUbg 風特徴、128/80 ユニット）を CC0 ロールアウトと wildbg の 0-ply ラベルで再学習。低レベル（Lv1〜6）と候補手の絞り込みに使用。
- C. 探索：高速ネットで候補手を絞る → wildbg で 1-ply（相手の応手選びは高速ネット＋上位を wildbg で再評価）→ Lv10 は時間内（約1.5秒）で 2-ply に近い読み。
- D. 測定：同じダイス・色交換の対戦で、0-ply と Lv10 を旧版と比較（95%信頼区間つき）。
- ライセンス対応：backgammon/THIRD_PARTY_LICENSES（wildbg の MIT と Apache-2.0 の全文と著作権表示、CC0 データの出典）を追加する。

## 出典
- wildbg: https://github.com/carsten-wenderdel/wildbg （LICENSE-MIT, LICENSE-APACHE、docs/dev/training.md）
- wildbg-training（CC0）: https://github.com/carsten-wenderdel/wildbg-training
- Open Sage / bgsage（MPL-2.0）: https://pypi.org/project/bgsage/ 、https://github.com/markbgsage/bgsage
- GNUbg NN 学習ツール（GPL v2）: https://gnubg.readthedocs.io/en/latest/
- GNUbg Position ID: https://www.gnu.org/software/gnubg/manual/html_node/A-technical-description-of-the-Position-ID.html
- GNUbg 学習データの議論（bug-gnubg ML）: https://lists.gnu.org/archive/html/bug-gnubg/2012-06/msg00035.html
- Stochastic MuZero: https://iclr.cc/virtual/2022/poster/6832
- Tesauro, "Temporal Difference Learning and TD-Gammon", CACM 1995（概要）: https://dl.acm.org/doi/10.1145/203330.203343

## 4. ライセンス確認結果（同梱物）
- backgammon/wildbg.bin, wildbg.json：wildbg（nets ブランチ commit 8c42b06）の contact.onnx / race.onnx を float16 に変換したもの。Cargo.toml `license = "Apache-2.0 OR MIT"`、README「Licensed under either of Apache-2.0 or MIT」、LICENSE-MIT・LICENSE-APACHE を確認。NOTICE ファイルは無し。Apache-2.0 側を選択して同梱し、変更点（float16化・並べ替え）を明記 → Apache-2.0 のサイトと両立。
- backgammon/THIRD_PARTY_LICENSES.txt：出典・著作権表示・変更点・MIT 全文・Apache-2.0 全文を収録。
- backgammon/weights.json（自前の高速ネット）：自前の自己対戦局面に wildbg の評価値（MIT/Apache）と wildbg-training のロールアウト値（CC0-1.0、LICENSE 確認）でラベルを付けて学習。GPL 物は一切不使用。
- 不採用：GNUbg（GPL）、bgsage（MPL-2.0）。
