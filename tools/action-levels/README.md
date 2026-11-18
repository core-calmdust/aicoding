# アクション系（ホッケー・キャロム・クロキノール・フチボウ）のレベル較正

- `node sim.js <repo> <game> <lvA> <lvB> <games> <seed>`：AI同士の対局（ゲームの既定の試合形式）で勝敗を数える（JSON1行）。
- `python3 fit.py <res.jsonl…>`：勝敗からレベルごとのレーティング（Bradley–Terry）。
- `python3 refine.py <game> <pairs.jsonl…>`：今の Lv.1〜20 で測った結果から、段差が均等になる `LVMAP` を作り直す。
- 各 `<game>/engine.js` の `LVMAP` が「Lv.N が旧レベルいくつの強さで指すか」の表。公開API（think / perform / skill / aiTarget など）の入口で変換する。
- 2026-11-18 の較正：Lv.1 と Lv.20 は従来どおり（クロキノールの天井だけ旧Lv.18相当に下げた）、その間を等間隔に。
