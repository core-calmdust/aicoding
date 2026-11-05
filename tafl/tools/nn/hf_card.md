---
license: {LICENSE}
pretty_name: Copenhagen Hnefatafl Self-Play Positions
task_categories:
- reinforcement-learning
tags:
- hnefatafl
- tafl
- board-games
- self-play
- game-ai
size_categories:
- {SIZE_CAT}
configs:
- config_name: default
  data_files:
  - split: train
    path: data/*.parquet
---

# Copenhagen Hnefatafl Self-Play Positions

{POSITIONS} positions from {GAMES} self-play games of **Copenhagen Hnefatafl (11×11)**, produced while training the
learned evaluation of the Hnefatafl AI in [CALMDUST COLLECTION](https://core-calmdust.github.io/aicoding/tafl/)
(engine and tools: [core-calmdust/aicoding](https://github.com/core-calmdust/aicoding), `tafl/engine.c`, `tafl/tools/nn/`).

Each position comes with the engine's search value, the move that was played, the final result of the game and 16 hand-made
features. Large public collections of Hnefatafl games are rare; this set is meant for training and testing evaluation
functions, policy networks and engines.

## How the games were played
- Rules: Copenhagen Hnefatafl 11×11 (armed king, king captured on four sides (three plus the throne), edge king not
  captured, shieldwall, exit forts, encirclement, the third repetition loses for the defenders, 200 plies without a capture
  is a draw).
- Engine: alpha-beta (PVS, transposition table, LMR) with a tactical horizon for king escapes and captures, 10,000 nodes
  per move (a quarter of the games: the defenders 2,000 nodes, so that games the attackers win are not rare).
- Openings: the first 2–8 plies of every game are random; those positions are not included.
- Rounds (reinforcement loop): round 1 played with the hand-made evaluation, round N with the network trained after round N−1
  (on the data of the previous rounds).

| round | evaluator | positions |
|---|---|---|
{ROUNDS}

Results: attackers {RA} games, defenders {RD}, draws {RX}.

## Fields
| field | type | meaning |
|---|---|---|
| `game_id` | string | game identifier (positions of a game are consecutive) |
| `round` | int | round of the reinforcement loop |
| `evaluator` | string | `hand` (hand-made evaluation) or `net` (learned evaluation) |
| `variant`, `size` | string, int | `copenhagen`, 11 |
| `ply` | int | half-moves played from the start position (the attackers move first) |
| `side_to_move` | string | `attackers` or `defenders` |
| `board` | string | 121 characters, row by row from the top (rank 11) to the bottom (rank 1), files a→k: `.` empty, `a` attacker, `d` defender, `k` king |
| `move` | string | the move played from this position, e.g. `d1-d4` (null for the last recorded position of a game) |
| `search_value` | int | the engine's search value, **defenders' view**, in the evaluator's units (±30000 = a proven win / loss; `hand`: raw hand-made units with a large constant edge for the defenders; `net`: logit of the defenders' expected score × 1000) |
| `result` | string | `attackers`, `defenders` or `draw` |
| `game_plies` | int | ply of the last recorded position + 1 |
| `features` | float[16] | hand-made features, defenders' view: {FEATS} |

## License
{LICENSE_TEXT}
