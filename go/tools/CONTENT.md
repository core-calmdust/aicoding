# Go (囲碁) content formats — lessons / openings / puzzles

All content files live in `go/` and are fetched by `go/app.js`. Text shown to players is embedded as
**10-language objects** `{ja, en, zh, ko, es, fr, pt, de, hi, ar}` (the page falls back en → ja when a key is
missing, so authoring ja + en first and filling the rest later is fine). Text may contain `<b>…</b>` and
`<br>`; coordinates in text are written as GTP points (`D4`, `Q16`) wrapped in `<bdi>` for Arabic safety, e.g.
`<bdi>D4</bdi>`. Use the same terminology everywhere (see GLOSSARY below).

## Common
- Board point index: `i = y * n + x` (x = column from the left, y = row from the TOP). GTP coordinate letters
  skip "I": columns `ABCDEFGHJKLMNOPQRST`, row number counts from the BOTTOM (`D4` on 19x19 = x 3, y 15).
  In JSON files we always store moves as **GTP strings** (`"D4"`, `"pass"`) for readability; the page converts.
- Position spec: `{ "n": 9, "stones": "<n*n chars>", "turn": 1 }` — chars row by row from the top-left:
  `.` empty, `b` black, `w` white. `turn` 1 = Black to move, 2 = White.
  (Alternative accepted by the page: `"ab": ["D4","C3"], "aw": [...]` lists instead of `stones`.)
- `view`: optional `[x0, y0, x1, y1]` (inclusive, 0-based, y from the top) — the part of the board shown
  zoomed (used for corner problems on 19x19 / 13x13). Omit for the whole board.
- Engine tools: `go/tools/golib.mjs` (node) — `load('light'|'strong')`, `policy`, `analyze`, `verifyLine`,
  `board`, `show`. Rules: `go/rules.js` (`GoRules.Pos`, `replay`, `score`, `coord`, `parseCoord`).

## lessons.json
```json
{ "version": 1,
  "courses": [ { "id": "basics", "title": {..}, "sub": {..} }, ... ],
  "steps": [
    { "id": "atari", "course": "basics",
      "title": {..}, "sub": {..},             // card title + one-line subtitle
      "intro": {..},                         // 2–4 short paragraphs (HTML <p> allowed) explaining the idea
      "goal": {..},                          // the task line shown above the board, e.g. "Capture a stone"
      "hint": {..},                          // shown when the player asks for a hint
      "diagram": { "s": {spec}, "marks": [["D4","ok"],["E5","x"]], "arrows": [["C3","D4"]], "view": [..] },  // optional picture for the intro
      "problems": [                          // exactly 5
        { "s": {spec}, "view": [..],
          "ok": ["E5"],                      // full marks (20 pts)
          "good": ["D6"],                    // optional: acceptable (16 pts)
          "half": ["C4"],                    // optional: partial (10 pts)
          "line": ["E5","F5","E6"],          // optional: continuation shown after the answer (starts with the correct move)
          "why": {..},                       // explanation shown after answering (why the correct move works)
          "ng": {..}                         // optional: shown when the answer is wrong
        } ] } ] }
```
Courses (tabs): `basics` (rules in practice: atari, capture, escape, liberties, eyes, ko …), `tactics`
(ladder, net, snapback, under the stones, throw-in, connect & cut, semeai…), `lifedeath` (two eyes, vital points,
basic dead / alive shapes), `opening` (corners first, big points, approach / enclosure, extend…), `middle`
(attack, weak groups, sabaki, invasion / reduction, influence), `endgame` (sente / gote, monkey jump, hane & connect,
counting). 18–24 steps total, each 5 problems, easy → hard inside each course. Small boards (7–13) for basics and
tactics; 19x19 with `view` for opening / corner topics. Every answer must be verified (tsumego solver for tactical
positions, the engine for strategic ones: the `ok` move must be the engine's best or within ~1 point of it, and
clearly better than plausible wrong moves).

## openings.json — fuseki (布石) and joseki (定石) studies, "as thorough as shogi"
```json
{ "version": 1,
  "cats": [ { "id": "hoshi", "title": {..}, "sub": {..} }, ... ],
  "sets": [
    { "id": "hoshi_kogeima_ikken", "cat": "hoshi", "ord": 1, "n": 19,
      "label": {..},                         // tiny badge (e.g. 星 / 4-4)
      "title": {..}, "short": {..},          // card title + one line
      "story": {..},                         // intro: history / idea / when to choose it (2–4 paragraphs)
      "level": 1,                            // 1 beginner … 3 advanced
      "side": 1,                             // the colour the player studies (1 = Black)
      "start": {spec},                       // optional start position (default empty board of size n)
      "line": ["Q16","R14", ...],            // the main line (GTP)
      "notes": { "1": {..}, "2": {..}, ... },// commentary after move k (1-based) — EVERY move should have a note
      "vars": [ { "at": 6, "line": ["R13", ...], "title": {..}, "notes": {"1": {..}} } ],   // optional side lines from position after move `at`
      "evals": [0.3, ...],                   // engine score lead (Black's view, points) after each move of `line`
      "view": [9, 0, 18, 9],                 // optional zoom for joseki (corner + side)
      "problems": [ { "at": 5, "ok": ["R10"], "good": [..] } ]   // practice: position after `at` moves, find the next move (5+ per set)
    } ] }
```
Categories (tabs), about 50 sets in total:
- `basic` 基本の布石 (19x19: 星・小目・三連星・中国流・小林流・ミニ中国流・向かい小目・たすき星 …)
- `hoshi` 星の定石 (小ゲイマガカリ→一間受け/ケイマ受け/コスミ/ハサミ、三々入り（現代）、両ガカリ …)
- `komoku` 小目の定石 (小ゲイマガカリ→一間バサミ/二間高バサミ/ケイマ受け、一間高ガカリ→ツケヒキ、大ゲイマガカリ …)
- `other` 三々・高目・目外し
- `ai` AI時代の定石・流行 (早い三々入り、星へのツケ、小目のツケ二段 …)
- `small` 9路・13路の布石 (天元, 5-4, 3-3, 小目 etc. on 9x9; 13x13 basics)
- `handi` 置き碁 (9子局・6子局・4子局・2子局 の基本的な打ち方)
Every move of every line must be checked with `verifyLine` (strong net): joseki moves should be the engine's
top choices or lose at most ~1.5 points; a note must explain any move that the engine dislikes (old joseki
superseded by AI) honestly. `evals` come from the engine.

## puzzles.json — tsumego (詰碁) collection, PZBook v2
```json
{ "version": 1, "cut": "",
  "daily": ["capture1","live1",...],
  "themes": [
    { "id": "live1", "grp": "LD", "title": {..}, "sub": {..},
      "puzzles": [                            // 50 per theme, easy → hard
        { "s": {spec}, "view": [..],
          "goal": "kill" | "live" | "capture" | "escape" | "connect" | "cut" | "semeai",
          "target": ["C3","C4"],             // stones whose fate decides the goal (kill/live/capture/escape/semeai)
          "region": ["A1","B1",...],         // empty points where moves are searched (the solver's playing area)
          "n": 2,                            // the player's moves allowed (PZBook "手数", counts only the solver's moves)
          "answer": "B2",                    // the first move of the solution
          "line": ["B2","C2","B1"],          // the main solution line
          "fun": 78 } ] } ] }
```
Groups (tabs): `Cap` 石を取る (アタリ・シチョウ・ゲタ・ウッテガエシ・石の下), `LD` 死活 (生き・殺し 1手/3手/5手+),
`Fight` 攻め合い・手筋 (攻め合い・連絡・切断・ダメヅマリ). 10 themes × 50 = 500.
Runtime: `go/tsumego.js` exposes `GoTsumego.solve(problem, moves, left, defend)` → `[{m, need}]`
(need = attacker moves still needed to reach the goal after this move, counting the move itself when it is the
attacker's; 0 = the goal can no longer be reached within `left`) and `GoTsumego.reached(problem, pos)`.

## GLOSSARY (ja → en)
アタリ atari · 石を取る capture · 逃げる escape · ダメ liberty · 眼 eye · 二眼 two eyes · 欠け眼 false eye ·
コウ ko · セキ seki · シチョウ ladder · ゲタ net · ウッテガエシ snapback · 石の下 under the stones ·
ホウリコミ throw-in · 攻め合い capturing race (semeai) · 死活 life and death · 定石 joseki · 布石 fuseki (opening) ·
星 4-4 point (hoshi) · 小目 3-4 point (komoku) · 三々 3-3 point (san-san) · 高目 5-4 point (takamoku) ·
目外し 5-3 point (mokuhazushi) · 天元 tengen · カカリ approach · シマリ enclosure · ハサミ pincer · ヒラキ extension ·
ツケ attachment · ハネ hane · ノビ stretch · サガリ descent · ヒキ draw back · コスミ diagonal move · ケイマ knight's move ·
一間トビ one-space jump · 大場 big point · 急場 urgent point · 地 territory · 模様 framework (moyo) · 厚み thickness ·
先手 sente · 後手 gote · ヨセ endgame (yose) · 置き碁 handicap game · コミ komi.
