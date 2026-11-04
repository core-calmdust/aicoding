# ウル王朝のゲーム — ルール違いの調査と AI の記録

## 出典
- RoyalUr.net ルール一覧: https://royalur.net/rules
- RoyalUr.net 完全解析の記事: https://royalur.net/solved
- RoyalUr-Java（RoyalUr.net 公式ライブラリ、MIT）: https://github.com/RoyalUr/RoyalUr-Java
  - `model/GameSettings.java`（FINKEL / BLITZ / MASTERS の定義）、`model/path/BellPathPair.java`・`MastersPathPair.java`（経路）、
    `model/shape/StandardBoardShape.java`（ロゼット）、`engine/simple/SimpleEngine.java`（手の生成・追加手番）、`model/dice/BinaryDice0AsMax.java`（3個サイコロ、0→4）
- 完全解析表（MIT）: https://huggingface.co/sothatsit/RoyalUrModels（finkel / blitz / masters3d 等。README: masters3d＝現行 Masters、masters＝旧版4個サイコロ）

## 確定した細則（RoyalUr-Java の GameSettings と一致）
| | finkel | blitz | masters |
|---|---|---|---|
| 駒数 | 7 | 5 | 7 |
| サイコロ | 4個（0〜4、1:4:6:4:1/16） | 4個（同左） | 3個、0 は 4 として数える（1:3/8, 2:3/8, 3:1/8, 4:1/8） |
| 経路 | Bell（14マス） | Masters（16マス） | Masters（16マス） |
| ロゼットは安全 | はい | いいえ | いいえ |
| ロゼットで追加手番 | はい | はい | はい |
| 取りで追加手番 | いいえ | はい | いいえ |
| ゴール | ちょうどの目のみ | 同左 | 同左 |

Masters 経路（自陣の行 L、相手の行 X）：自陣 列3→0（1〜4）→ 中央 列0→6（5〜11）→ 相手の列 列6→7（12〜13）→ 中央 列7（14）→ 自陣 列7→6（15〜16）→ ゴール 17。
ロゼットは道の 4・8・12・16 マス目（4マスごと）。相手の列の 12・13 マス目は相手の道の 16・15 マス目と同じマスなので、そこで取り合いが起きる（自陣の 1〜4・15〜16 以外に安全地帯は無い。ただし相手の 15・16 は相手から見れば自陣なので、相手の駒がそこにいれば取れる）。

検証：RoyalUr の解析表の値 V(s) と、本エンジンの手の生成で1手展開したベルマン方程式の値が、ランダム対局の 4〜6万局面で全ルール最大 1.4e-5（16bit 量子化の誤差）以内で一致 → 経路・ロゼット・安全性・追加手番・パス・ゴールの規則が RoyalUr と完全に同じことを確認。

## 未採用
- Tournament Engine（société internationale d'UR）：重ね置き・後退移動など細則が多く、確証のある実装資料が無いため入れない。
- Aseb：盤の形が異なるため対象外。

## AI
<!--AI-RESULTS-->
