# バックギャモン 3Dレッスンの準備（ramps）

- `data.py`：準備の説明・課題（局面・サイコロ・判定・台詞 ja/en）。日本語はダイスンの口調。
- `tr-texts.json`：ほかの12言語の訳（キー `<step>/<番号>/<欄>`）。
- `python3 build.py` → `backgammon/ramps.json` を作る（局面の重なりを検査）。
- `node verify.js` → 課題ごとに「正解の指し方の数」を表示。`bad 0` であること。
- 日本語の台詞は `node tools/voice-lint.js` 相当の検査を通すこと。
