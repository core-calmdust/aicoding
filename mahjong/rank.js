// 段位戦 (ranked play, ユーザー 2026-11-14): the ladder after 麻雀天聖's 段位戦 — 見習い, 10級 … 1級, 初段 … 十段, then titles that
// grow grander rank by rank, up to 雀神. Points only add up (no demotion): 1st/2nd/3rd/4th = 8/2/1/0 in an East game,
// 16/4/2/0 in an East-South game. Every second rank gives a reward character (the summer series, not in the gacha).
(function (root) {
'use strict';
const L = (ja, en) => ({ ja, en });
// [points needed, name, tier]  tier: the look of the badge — kyu bronze · dan silver · dan2 gold · t1 crimson · t2 violet · t3 rainbow
const RAW = [
  [0, L('見習い', 'Apprentice'), 'kyu'],
  [1, L('10級', '10 Kyu'), 'kyu'], [5, L('9級', '9 Kyu'), 'kyu'], [10, L('8級', '8 Kyu'), 'kyu'], [20, L('7級', '7 Kyu'), 'kyu'],
  [30, L('6級', '6 Kyu'), 'kyu'], [40, L('5級', '5 Kyu'), 'kyu'], [50, L('4級', '4 Kyu'), 'kyu'], [60, L('3級', '3 Kyu'), 'kyu'],
  [80, L('2級', '2 Kyu'), 'kyu'], [100, L('1級', '1 Kyu'), 'kyu'],
  [120, L('初段', '1 Dan'), 'dan'], [140, L('二段', '2 Dan'), 'dan'], [170, L('三段', '3 Dan'), 'dan'], [200, L('四段', '4 Dan'), 'dan'], [230, L('五段', '5 Dan'), 'dan'],
  [260, L('六段', '6 Dan'), 'dan2'], [300, L('七段', '7 Dan'), 'dan2'], [350, L('八段', '8 Dan'), 'dan2'], [400, L('九段', '9 Dan'), 'dan2'], [450, L('十段', '10 Dan'), 'dan2'],
  [500, L('名人', 'Master'), 't1'], [550, L('雀豪', 'Champion'), 't1'], [600, L('雀聖', 'Saint'), 't1'], [650, L('雀帝', 'Emperor'), 't1'],
  [700, L('覇王', 'Overlord'), 't2'], [750, L('龍姫', 'Dragon Princess'), 't2'], [810, L('鳳凰', 'Phoenix'), 't2'],
  [870, L('天華', 'Heavenly Bloom'), 't3'], [930, L('天后', 'Celestial Empress'), 't3'], [1000, L('雀神', 'Goddess of Mahjong'), 't3'],
];
// the reward characters (chars.js marks them with .reward = the rank's index)
const REWARD = { 2: 'nagisa', 4: 'karin', 6: 'hatsuyuki', 8: 'natsume', 10: 'homura', 12: 'kaoru', 14: 'mio', 16: 'kasumi',
  18: 'yuhi', 20: 'aoi', 22: 'shirayuri', 24: 'yugiri', 26: 'ginka', 28: 'renge', 30: 'ajisai' };
const LIST = RAW.map(([pt, name, tier], i) => ({ i, pt, name, tier, reward: REWARD[i] || null }));
const POINTS = { east: [8, 2, 1, 0], south: [16, 4, 2, 0] };
function at(pt) { let r = LIST[0]; for (const x of LIST) if (pt >= x.pt) r = x; return r; }
function next(pt) { return LIST.find(x => x.pt > pt) || null; }
// (2026-11-14, ユーザー: not the same level over and over — fine steps): a fractional level 0〜4 that climbs with every point:
// 見習い 0 → 1級 1.3 → 五段 2.3 → 十段 3.3 → 雀神 4 (straight lines between). ai.js rolls between the two whole levels.
const CURVE = [[0, 0], [100, 1.3], [230, 2.3], [450, 3.3], [1000, 4]];
function botLv(pt) { for (let k = 1; k < CURVE.length; k++) { const [x0, y0] = CURVE[k - 1], [x1, y1] = CURVE[k]; if (pt <= x1) return +(y0 + (y1 - y0) * Math.max(0, pt - x0) / (x1 - x0)).toFixed(3); } return 4; }
// the strength as shown: the nearest level's name and the exact value
function botName(pt, lvNames) { const v = botLv(pt); return `${lvNames[Math.min(4, Math.floor(v + .0001))]} Lv${v.toFixed(1)}`; }
root.MJRank = { list: LIST, at, next, botLv, botName, POINTS, REWARD };
})(window);
