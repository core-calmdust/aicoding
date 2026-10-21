# CALMDUST COLLECTION — AI CODING ARCADE

Free browser games made together with AI ("vibe coding"): the AI writes the code, people bring the ideas and fine-tune the feel.
No sign-up, no install — open the page and play on PC or phone.

**▶ Play: https://core-calmdust.github.io/aicoding/**

## NEORETRO ARCADES

The feel of '80s arcades, rebuilt with neon and modern game design.

🏆 **IVS NEOCREA — Runner-up Grand Prix / Bandai Namco 021 Fund Award**

| # | Title | Genre |
|---|---|---|
| #4 | [COMET OUTBURST+](https://core-calmdust.github.io/aicoding/comet-plus/) 🧪 beta | 3D shooter (polygons & wireframes, portrait mode on phones, gamepad) |
| #3 | [COMET OUTBURST](https://core-calmdust.github.io/aicoding/comet/) | Shooter (gamepad) |
| #2 | [DANMAKU INVADER XTREME+](https://core-calmdust.github.io/aicoding/danmaku-inv.html) | Bullet hell (gamepad) |
| #1 | [CYBER PONG XTREME+](https://core-calmdust.github.io/aicoding/pong.html) | Versus action (phones, gamepad) |

## World Board Game Atlas — 世界のボドゲ大全

Classic board games and puzzles from around the world, each with a serious AI, step-by-step lessons and large puzzle collections (about 50 titles planned).

- **[Portal](https://core-calmdust.github.io/aicoding/atlas/)** — recently updated games, play on a 3D board in a toy room (Reversi and Shogi so far), shared achievements, coins, shop, gacha and skins, and one account that syncs every game ([atlas/README.md](atlas/README.md)).
- On the top page, games are grouped like the portal: **Chess & Shogi / Line-up & Territory / Race & Sowing / Puzzles**, with search and `#game=<id>` deep links.

### Premium titles

| Title | Category | AI | Lessons | Puzzles | Highlights |
|---|---|---|---|---|---|
| [Shogi](https://core-calmdust.github.io/aicoding/shogi/) 🌐 | Chess & Shogi | 19 ranks (to ~2 dan on Shogi Club 24) | 15 steps | 613 tsume | NNUE evaluation learned from Floodgate games, handicap games, rated games vs AI, online play |
| [Chess](https://core-calmdust.github.io/aicoding/chess/) 🌐 | Chess & Shogi | 20 levels (≈ Elo 3000 at the top) | 20 steps | 445 | NNUE trained on Lichess evaluated positions, beginner course, 12 opening studies, PGN/FEN ([model card](chess/MODEL_CARD.md)) |
| [Checkers](https://core-calmdust.github.io/aicoding/checkers/) 🌐 | Chess & Shogi | 20 levels (15 kyu – 5 dan) | 13 steps | 500 | Learned evaluation + endgame database (WebAssembly), 19 openings ([model card](checkers/MODEL_CARD.md)) |
| [Reversi V4](https://core-calmdust.github.io/aicoding/reversi/) 🌐 | Line-up & Territory | 20 levels | 9 steps | 1,000 | Pattern evaluation from 48M positions, exact solving of the last 20 squares, 85 named openings, rated online play ([model card](reversi/MODEL_CARD.md)) |
| [Gomoku & Renju](https://core-calmdust.github.io/aicoding/gomoku/) 🌐 | Line-up & Territory | 20 levels (15 kyu – 5 dan) | 12 steps | 500 | Renju / standard / freestyle rules with exact forbidden-move checks, small neural evaluation (WebAssembly), 26 openings ([model card](gomoku/MODEL_CARD.md)) |
| [Dots and Boxes](https://core-calmdust.github.io/aicoding/dots/) 🌐 | Line-up & Territory | 10 levels | 15 steps | 450 | Perfect play on 3×3 and 4×4, WebAssembly solver for 5×5 endgames, solver-verified openings |
| [Nine Men's Morris](https://core-calmdust.github.io/aicoding/morris/) 🌐 | Line-up & Territory | 10 levels | 21 steps | 600 | Nine / Twelve / Six rule sets, learned evaluation, 6 opening studies ([model card](morris/MODEL_CARD.md)) |
| [Connect Four](https://core-calmdust.github.io/aicoding/connect4/) | Line-up & Territory | 8 levels | 23 steps | 306 | Fully solved — perfect play from move 1 at the top level |
| [Mancala](https://core-calmdust.github.io/aicoding/mancala/) | Race & Sowing | 10 levels | 29 steps | 500 | Normal / Easy / Kalah / Sungka, exact endgame solving, physics-based seeds |
| [Backgammon](https://core-calmdust.github.io/aicoding/backgammon/) | Race & Sowing | 10 levels | 23 steps | 500 | Neural net from wildbg plus self-play training, exact bear-off database, doubling cube, 3/5/7-point matches |
| [Daily Sudoku](https://core-calmdust.github.io/aicoding/sudoku/) | Puzzles | — | — | 1,300 | Three daily puzzles with medals, online rankings, 500-character gacha, 20 themes, 10 variant rule sets, flick input |
| [Speed Sudoku](https://core-calmdust.github.io/aicoding/speed-sudoku/) | Puzzles | — | — | 500 stages | 4×4 time attack, 30/60/90-second daily rankings, special rules |
| [SameGame POP!](https://core-calmdust.github.io/aicoding/samegame/) | Puzzles | — | — | 400 stages | Pop-art tile clearing, daily puzzle and rankings, BLITZ and Rising modes, missions |

🌐 = online play (rating, rooms, lobby, chat)

**Shared by every premium board game** — 10 languages (日本語 / English / 中文 / 한국어 / Español / Français / Português / Deutsch / हिन्दी / العربية), phone support, PC header bar, hands-on rules tutorial (with a game introduction page: history, how to win, culture), lessons and openings shown as cards with mini boards, puzzle collections with stages, stars and medals (play on until the move limit; obvious mistakes are flagged at once), daily puzzle, evaluation graph and move navigation (← → ↑ ↓), undo, hints and coach, post-game review, game sharing by URL, auto-save, solo rated games with placement matches, and a "beep" in the last 5 seconds of byoyomi.

### Previous versions

| Title | Notes |
|---|---|
| [Reversi v3.1](https://core-calmdust.github.io/aicoding/reversi_v3.html) | Previous version of Reversi V4 |
| [Checkers (old)](https://core-calmdust.github.io/aicoding/checker.html) | Previous version of Checkers |

## Project layout

```
index.html          Top page (game galleries: icons + detail panel)
atlas/              World Board Game Atlas portal (3D table, achievements, shop, gacha)
shared/             Common modules for the board games
                      headerbar.js (PC header bar) · ruletour.js (rules tutorial) · pzbook.js (puzzle collections)
                      tick.js (byoyomi beeps) · placement.js (rating placement) · rulesoffer.js · atlas*.js (portal account / progress)
shogi/ chess/ checkers/ reversi/ gomoku/ dots/ morris/ connect4/ mancala/ backgammon/
                    Board games (each: index.html, engine, i18n, lessons, puzzles, MODEL_CARD.md where a learned model is used)
sudoku/ speed-sudoku/ samegame/   Puzzle games
comet/ comet-plus/  NEORETRO ARCADES (plus single-file games at the top level: pong.html, danmaku-inv.html)
images/             Thumbnails, icons, logos
```

It is a static site with no build step. To run it locally, serve the folder with any static server (the games use Web Workers, WebAssembly and `fetch`, so opening the files directly does not work):

```sh
python3 -m http.server 8000
# → http://localhost:8000/
```

## Credits

- **Shogi** — the evaluation and opening book were learned from games published on the [Floodgate](https://wdoor.c.u-tokyo.ac.jp/shogi/) computer shogi server. The game records themselves are not included in this repository.
- **Reversi** — the evaluation was trained on data published on the [Egaroucid](https://www.egaroucid.nyanyan.dev/) website. The training data is not included.
- **Chess** — the NNUE was trained on positions from the [Lichess evaluation database](https://database.lichess.org/#evals) (CC0). Stockfish was used only locally as a strength yardstick and is not included.
- **Gomoku & Renju** — trained on Gomocup positions; part of them were labelled with evaluations from [Rapfi](https://github.com/dhbloo/rapfi) (GPL-3.0), which was run locally as a teacher only and is not included.
- **Backgammon** — includes a JavaScript port of the [wildbg](https://github.com/carsten-wenderdel/wildbg) neural net (© 2023 Carsten Wenderdel, MIT / Apache-2.0); see [backgammon/THIRD_PARTY_LICENSES.txt](backgammon/THIRD_PARTY_LICENSES.txt). The lightweight net was trained on our own self-play positions labelled with wildbg evaluations and [wildbg-training](https://github.com/carsten-wenderdel/wildbg-training) rollout data (CC0).
- **Checkers, Nine Men's Morris** — evaluations learned from the engines' own self-play.

## License

[Apache License 2.0](LICENSE)

Copyright 2026 core-calmdust
