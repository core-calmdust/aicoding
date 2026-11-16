// The rated games' ladder (2026-11-15): the rating of each AI level 1..10 (index = level), shared by the full game and the
// 3D table (atlas/app.js RTG.backgammon reads it). Measured with tools/ladder.js: adjacent levels, 400 dice streams each
// played twice with the seats swapped, single games without the cube; Elo difference = 400·log10(p / (1 − p)) of the share
// of games won: 1→2 +548, 2→3 +268, 3→4 +215, 4→5 +115, 5→6 +63, 6→7 +35, 7→8 ±0 (the 0-ply net vs its 1-ply search),
// 7→9 +47 / 7→10 +23 (120 games each, ±30: the 2-ply levels taken as one step above, 10 ≥ 9). The dice keep the strong
// levels close together.
window.BG_RT_LV = [0, 400, 1035, 1350, 1600, 1730, 1800, 1840, 1850, 1890, 1900];
