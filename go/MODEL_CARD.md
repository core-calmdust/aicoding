# Model Card: Go AI (`net_light.bin.gz`, `net_strong.bin.gz`)

囲碁のAIは、KataGo 系の小型ニューラルネット（方策・勝率・目数・地の予測）と、ブラウザ上のモンテカルロ木探索（PUCT）を組み合わせています。
推論と探索は C で書いて WebAssembly（SIMD）にビルドした `engine.c` → `engine_simd.wasm`（SIMD 非対応環境は `engine.wasm`）で、Web Worker（`engine.js`）の中で動きます。

- **ゲーム**: https://core-calmdust.github.io/aicoding/go/
- **コードのライセンス**: リポジトリの `LICENSE`
- **ネットの重み**: CC BY 4.0（下記のクレジット参照）
- **バージョン**: v1（2026-10-22）

## ネット
| 項目 | 軽量（`net_light.bin.gz`） | 強い（`net_strong.bin.gz`） |
|---|---|---|
| 元のモデル | vibego `s4`（b7c106nbt-pat） | vibego `s9`（b10c128nbt-pat） |
| 構造 | KataGo の nested-bottleneck 残差ネット（7ブロック・106ch）＋ 3×3 パターン埋め込み | 同（10ブロック・128ch） |
| 出力 | 着手の確率（362＝361点＋パス）、勝率（勝ち／負け／持碁）、目数差、各点の地（所有）予測 | 同 |
| 重みの形式 | fp16（BN を畳み込みに畳み込んだ上で変換。gzip 後 約2.5MB） | fp16（gzip 後 約4.8MB） |
| 1局面の推論時間（目安） | PC の WebAssembly で約28ms | 約57ms |

- 元のモデル：Hugging Face の [sanderland/vibego](https://huggingface.co/sanderland) シリーズ（Sander Land 氏）。KataGo の公開ネット `kata1-b18c384nbt` を教師に、katagoarchive.org の局面で蒸留したもの。
- 変換：`tools/export_net.py`（PyTorch のチェックポイント → 独自形式 GONN v2）。C 実装の出力を PyTorch と比較し、方策ロジットの差は平均 約0.02。int8 量子化は精度の落ちが大きかったため fp16 を採用。
- 入力特徴量：KataGo の空間特徴量のうち石・呼吸点（1〜3）・コウ・直前5手・シチョウ関連と、大域特徴量（手番側から見たコミ／20、直前がパスか）。
- 盤の大きさ：ネットは常に19×19の入力で動かし、小さい盤は左上に置く（学習時と同じ扱い）。対称変換は N×N の盤の中で行う。5〜19路に対応。

## 探索と強さの段階
- PUCT（KataGo 式の cpuct・FPU・目数効用・LCB による最終手選択）、終局判定は Tromp-Taylor。コウは単純コウ＋同形反復（スーパーコウ）を禁止。
- 26段階（15級〜1級・初段〜八段・アマ最強／プロ級／最強）：1〜21は方策ネットの確率から温度・取りこぼし率を変えて選ぶ（探索なし）。22〜26は探索（軽量ネット 6〜32 playouts、強いネット 64〜160 playouts、端末に応じた時間上限つき）。
- 段級の基準：GNU Go 3.8（レベル10、一般に約5〜8級）と19路で互角だった段階（3勝5敗）を6級とし、19路の自己対局で隣り合う段階の差が約100Eloになるよう並べた（`tools/vs-gnugo.mjs`、`tools/selfplay.mjs`）。8級相当以上はGNU Goに8戦全勝。
- 最強レベルの推定：自己対局の差を積み上げるとGNU Goより約2000Elo上（自己対局のEloは人間相手より大きく出やすく、一部の区間は全勝で下限値）。人間の尺度ではアマトップ〜プロ級と推定（実測ではない）。
- 死に石の判定（整地）：強いネットの地の予測を8通りの対称で平均し、グループごとに判定。日本ルール（地＋アゲハマ）と中国ルール（面積）で計算。

## 想定する使い方と限界
- 対局相手・ヒント・形勢表示・1手ごとの振り返り・定石解説の評価値・詰碁の検証補助。
- 段級の表示は GNU Go を基準にした推定で、人間との対局で確かめたものではありません。小さなネットと少ない探索のため、シチョウや大きな攻め合い、まれな形で読み違えることがあります。
- 5路・6路などの極小盤は学習分布の端にあたり、コミの目安はネットの推定値から決めています。

## クレジット
- ネットの重み：vibego by Sander Land — CC BY 4.0（https://huggingface.co/sanderland）。変更：fp16 への変換と独自形式への書き出し。
- 教師モデル：KataGo（David J. Wu "lightvector" と KataGo 分散学習の参加者の皆さん）、https://katagotraining.org/ 。KataGo のネットは KataGo のライセンス（MIT 系）で公開されています。
