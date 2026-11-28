// 国标麻将（MCR）番種判定 — WMO「Mahjong Competition Rules」2006年版（81番）。
// 牌の種類 t：0-8 一〜九萬, 9-17 一〜九筒, 18-26 一〜九索, 27-30 東南西北, 31 白, 32 發, 33 中（花牌は数えず flowers で渡す）。
// GBFan.calc(o) → { ok, pts（花牌を除く）, flowers, total, fans:[{id,n,p}], form }。
// o = { melds:[{k:'chi'|'pon'|'kan'|'ankan', t}]（chi は一番下の牌）, hand:[t…]（和了牌を除く立牌）, win:t,
//       tsumo, flowers, last（和絶張）, kong（ツモ＝槓上開花／ロン＝搶槓和）, wallLast（ツモ＝妙手回春／ロン＝海底撈月）,
//       seat:0-3, round:0-3 }
// 裁定（どのルールに従ったか）は claude/gbmj-spec.md の「番種判定の裁定」。
(function (root) {
'use strict';

// [番号, 点, 简体中文, English, 日本語]
const FANS = [null,
  [1, 88, '大四喜', 'Big Four Winds', '大四喜'], [2, 88, '大三元', 'Big Three Dragons', '大三元'],
  [3, 88, '绿一色', 'All Green', '緑一色'], [4, 88, '九莲宝灯', 'Nine Gates', '九蓮宝灯'],
  [5, 88, '四杠', 'Four Kongs', '四槓'], [6, 88, '连七对', 'Seven Shifted Pairs', '連七対'],
  [7, 88, '十三幺', 'Thirteen Orphans', '十三么'],
  [8, 64, '清幺九', 'All Terminals', '清么九'], [9, 64, '小四喜', 'Little Four Winds', '小四喜'],
  [10, 64, '小三元', 'Little Three Dragons', '小三元'], [11, 64, '字一色', 'All Honors', '字一色'],
  [12, 64, '四暗刻', 'Four Concealed Pungs', '四暗刻'], [13, 64, '一色双龙会', 'Pure Terminal Chows', '一色双龍会'],
  [14, 48, '一色四同顺', 'Quadruple Chow', '一色四同順'], [15, 48, '一色四节高', 'Four Pure Shifted Pungs', '一色四節高'],
  [16, 32, '一色四步高', 'Four Pure Shifted Chows', '一色四歩高'], [17, 32, '三杠', 'Three Kongs', '三槓'],
  [18, 32, '混幺九', 'All Terminals and Honors', '混么九'],
  [19, 24, '七对', 'Seven Pairs', '七対'], [20, 24, '七星不靠', 'Greater Honors and Knitted Tiles', '七星不靠'],
  [21, 24, '全双刻', 'All Even Pungs', '全双刻'], [22, 24, '清一色', 'Full Flush', '清一色'],
  [23, 24, '一色三同顺', 'Pure Triple Chow', '一色三同順'], [24, 24, '一色三节高', 'Pure Shifted Pungs', '一色三節高'],
  [25, 24, '全大', 'Upper Tiles', '全大'], [26, 24, '全中', 'Middle Tiles', '全中'], [27, 24, '全小', 'Lower Tiles', '全小'],
  [28, 16, '清龙', 'Pure Straight', '清龍'], [29, 16, '三色双龙会', 'Three-Suited Terminal Chows', '三色双龍会'],
  [30, 16, '一色三步高', 'Pure Shifted Chows', '一色三歩高'], [31, 16, '全带五', 'All Fives', '全帯五'],
  [32, 16, '三同刻', 'Triple Pung', '三同刻'], [33, 16, '三暗刻', 'Three Concealed Pungs', '三暗刻'],
  [34, 12, '全不靠', 'Lesser Honors and Knitted Tiles', '全不靠'], [35, 12, '组合龙', 'Knitted Straight', '組合龍'],
  [36, 12, '大于五', 'Upper Four', '大于五'], [37, 12, '小于五', 'Lower Four', '小于五'],
  [38, 12, '三风刻', 'Big Three Winds', '三風刻'],
  [39, 8, '花龙', 'Mixed Straight', '花龍'], [40, 8, '推不倒', 'Reversible Tiles', '推不倒'],
  [41, 8, '三色三同顺', 'Mixed Triple Chow', '三色三同順'], [42, 8, '三色三节高', 'Mixed Shifted Pungs', '三色三節高'],
  [43, 8, '无番和', 'Chicken Hand', '無番和'], [44, 8, '妙手回春', 'Last Tile Draw', '妙手回春'],
  [45, 8, '海底捞月', 'Last Tile Claim', '海底撈月'], [46, 8, '杠上开花', 'Out with Replacement Tile', '槓上開花'],
  [47, 8, '抢杠和', 'Robbing the Kong', '搶槓和'], [48, 8, '双暗杠', 'Two Concealed Kongs', '双暗槓'],
  [49, 6, '碰碰和', 'All Pungs', '碰碰和'], [50, 6, '混一色', 'Half Flush', '混一色'],
  [51, 6, '三色三步高', 'Mixed Shifted Chows', '三色三歩高'], [52, 6, '五门齐', 'All Types', '五門斉'],
  [53, 6, '全求人', 'Melded Hand', '全求人'], [54, 6, '双箭刻', 'Two Dragon Pungs', '双箭刻'],
  [55, 4, '全带幺', 'Outside Hand', '全帯么'], [56, 4, '不求人', 'Fully Concealed Hand', '不求人'],
  [57, 4, '双明杠', 'Two Melded Kongs', '双明槓'], [58, 4, '和绝张', 'Last Tile', '和絶張'],
  [59, 2, '箭刻', 'Dragon Pung', '箭刻'], [60, 2, '圈风刻', 'Prevalent Wind', '圏風刻'], [61, 2, '门风刻', 'Seat Wind', '門風刻'],
  [62, 2, '门前清', 'Concealed Hand', '門前清'], [63, 2, '平和', 'All Chows', '平和'], [64, 2, '四归一', 'Tile Hog', '四帰一'],
  [65, 2, '双同刻', 'Double Pung', '双同刻'], [66, 2, '双暗刻', 'Two Concealed Pungs', '双暗刻'],
  [67, 2, '暗杠', 'Concealed Kong', '暗槓'], [68, 2, '断幺', 'All Simples', '断么'],
  [69, 1, '一般高', 'Pure Double Chow', '一般高'], [70, 1, '喜相逢', 'Mixed Double Chow', '喜相逢'],
  [71, 1, '连六', 'Short Straight', '連六'], [72, 1, '老少副', 'Two Terminal Chows', '老少副'],
  [73, 1, '幺九刻', 'Pung of Terminals or Honors', '么九刻'], [74, 1, '明杠', 'Melded Kong', '明槓'],
  [75, 1, '缺一门', 'One Voided Suit', '缺一門'], [76, 1, '无字', 'No Honors', '無字'],
  [77, 1, '边张', 'Edge Wait', '辺張'], [78, 1, '嵌张', 'Closed Wait', '嵌張'], [79, 1, '单钓将', 'Single Wait', '単釣将'],
  [80, 1, '自摸', 'Self-Drawn', '自摸'], [81, 1, '花牌', 'Flower Tiles', '花牌'],
];
// 明暗槓（明槓1つ＋暗槓1つ）：2006年版 Fan 57「One Melded Kong and one Concealed Kong are 6 points」。番号は 57 のまま点だけ 6。
const MIXED_KONGS_PTS = 6;

const isNum = t => t < 27;
const suit = t => t < 27 ? (t / 9 | 0) : 3;
const num = t => t % 9 + 1;
const isTermT = t => t < 27 && (t % 9 === 0 || t % 9 === 8);
const isYaoT = t => t >= 27 || isTermT(t);
const isWindT = t => t >= 27 && t <= 30;
const isDragonT = t => t >= 31;
const GREEN = new Set([19, 20, 21, 23, 25, 32]);
// 推不倒：筒子 1234589、索子 245689、白
const REV = new Set([9, 10, 11, 12, 13, 16, 17, 19, 21, 22, 23, 25, 26, 31]);
const ORPHANS = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];
// 組合龍の6通り：KN[i][s] = 萬/筒/索 s が担当する 147/258/369 の起点（0,1,2）
const KN = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
const knTiles = p => { const a = []; for (let s = 0; s < 3; s++) for (let k = 0; k < 3; k++) a.push(s * 9 + p[s] + 3 * k); return a; };
const KN_TILES = KN.map(knTiles);

function counts(arr) { const c = new Array(34).fill(0); for (const t of arr) c[t]++; return c; }

// ---------------------------------------------------------------- 分解
function decomp(c, need) {          // c: 立牌（和了牌込み）、need 面子数 → [{pair, sets:[{k:'c'|'p',t}]}]
  const res = [], gs = [], cc = c.slice();
  function rec(i, left) {
    while (i < 34 && !cc[i]) i++;
    if (i >= 34) { if (!left) res.push(gs.slice()); return; }
    if (!left) return;
    if (cc[i] >= 3) { cc[i] -= 3; gs.push({ k: 'p', t: i }); rec(i, left - 1); gs.pop(); cc[i] += 3; }
    if (i < 27 && i % 9 <= 6 && cc[i + 1] && cc[i + 2]) {
      cc[i]--; cc[i + 1]--; cc[i + 2]--; gs.push({ k: 'c', t: i }); rec(i, left - 1); gs.pop(); cc[i]++; cc[i + 1]++; cc[i + 2]++;
    }
  }
  const out = [];
  for (let p = 0; p < 34; p++) {
    if (cc[p] < 2) continue;
    cc[p] -= 2; res.length = 0; rec(0, need);
    for (const g of res) out.push({ pair: p, sets: g });
    cc[p] += 2;
  }
  return out;
}

// 和了形か（立牌の枚数 c、副露数 m）。waits の計算に使う
function isWinShape(c, m) {
  const n = c.reduce((a, b) => a + b, 0);
  if (n !== 14 - 3 * m) return false;
  if (decomp(c, 4 - m).length) return true;
  if (m === 0) {
    if (c.every(x => x === 0 || x === 2 || x === 4)) return true;                     // 七対
    if (ORPHANS.every(t => c[t] >= 1) && ORPHANS.some(t => c[t] === 2) && n === 14 &&
        ORPHANS.reduce((a, t) => a + c[t], 0) === 14) return true;                     // 十三么
    for (const kt of KN_TILES) {                                                        // 全不靠
      let ok = true;
      for (let t = 0; t < 34; t++) if (c[t] > 1 || (c[t] && t < 27 && !kt.includes(t))) { ok = false; break; }
      if (ok) return true;
    }
  }
  if (m <= 1) for (const kt of KN_TILES) {                                              // 組合龍
    if (!kt.every(t => c[t] >= 1)) continue;
    const r = c.slice(); for (const t of kt) r[t]--;
    if (decomp(r, 1 - m).length) return true;
  }
  return false;
}
function waits(hand13, m) {
  const c = counts(hand13), w = [];
  for (let t = 0; t < 34; t++) { if (c[t] >= 4) continue; c[t]++; if (isWinShape(c, m)) w.push(t); c[t]--; }
  return w;
}

// ---------------------------------------------------------------- 組み合わせの番（套算一次）
// 面子どうしの組み合わせ番を「辺（2面子）／超辺（3・4面子）」として、閉路を作らない（＝新しい面子は使用済みの面子と1回だけ組める）、
// 同じ番に同じ面子を2度使わない（不得相同）という条件で、点の合計が最大になる組を選ぶ。
function chowEdges(ch) {            // ch: 順子の起点の配列（4つまで）
  const E = [], n = ch.length;
  const pairFan = (a, b) => {
    if (a === b) return 69;
    if (suit(a) !== suit(b)) return num(a) === num(b) ? 70 : 0;
    const d = Math.abs(a - b);
    if (d === 3) return 71;
    if (d === 6) return 72;
    return 0;
  };
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const f = pairFan(ch[i], ch[j]); if (f) E.push({ f, v: [i, j] }); }
  const tri = (a, b, c) => {
    const s = [a, b, c].sort((x, y) => x - y);
    const su = s.map(suit);
    if (su[0] === su[1] && su[1] === su[2]) {
      if (s[0] === s[1] && s[1] === s[2]) return 23;
      const d1 = s[1] - s[0], d2 = s[2] - s[1];
      if (d1 === 3 && d2 === 3 && num(s[0]) === 1) return 28;
      if (d1 === d2 && (d1 === 1 || d1 === 2)) return 30;
      return 0;
    }
    if (new Set(su).size === 3) {
      const ns = [a, b, c].map(num).sort((x, y) => x - y);
      if (ns[0] === ns[1] && ns[1] === ns[2]) return 41;
      if (ns[0] === 1 && ns[1] === 4 && ns[2] === 7) return 39;
      if (ns[1] === ns[0] + 1 && ns[2] === ns[1] + 1) return 51;
    }
    return 0;
  };
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
    const f = tri(ch[i], ch[j], ch[k]); if (f) E.push({ f, v: [i, j, k] });
  }
  if (n === 4) {
    const s = ch.slice().sort((x, y) => x - y);
    if (suit(s[0]) === suit(s[3])) {
      if (s[0] === s[3]) E.push({ f: 14, v: [0, 1, 2, 3] });
      else { const d = s[1] - s[0]; if ((d === 1 || d === 2) && s[2] - s[1] === d && s[3] - s[2] === d) E.push({ f: 16, v: [0, 1, 2, 3] }); }
    }
  }
  return E;
}
function pungEdges(pg) {            // pg: 数牌の刻子・槓子の牌
  const E = [], n = pg.length;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++)
    if (suit(pg[i]) !== suit(pg[j]) && num(pg[i]) === num(pg[j])) E.push({ f: 65, v: [i, j] });
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
    const s = [pg[i], pg[j], pg[k]].sort((x, y) => x - y), su = s.map(suit);
    let f = 0;
    if (su[0] === su[2]) { if (s[1] === s[0] + 1 && s[2] === s[1] + 1) f = 24; }
    else if (new Set(su).size === 3) {
      const ns = s.map(num).sort((x, y) => x - y);
      if (ns[0] === ns[2]) f = 32; else if (ns[1] === ns[0] + 1 && ns[2] === ns[1] + 1) f = 42;
    }
    if (f) E.push({ f, v: [i, j, k] });
  }
  if (n === 4) { const s = pg.slice().sort((x, y) => x - y); if (suit(s[0]) === suit(s[3]) && s[1] === s[0] + 1 && s[2] === s[1] + 1 && s[3] === s[2] + 1) E.push({ f: 15, v: [0, 1, 2, 3] }); }
  return E;
}
function bestCombo(E, n) {          // → 選んだ番の配列（番号）
  let best = [], bestV = -1;
  const par = [...Array(n).keys()];
  const find = x => par[x] === x ? x : find(par[x]);
  const used = [];                   // [f, vertex]
  const pick = [];
  function rec(i, val) {
    if (i === E.length) { if (val > bestV) { bestV = val; best = pick.slice(); } return; }
    rec(i + 1, val);                 // 使わない
    const e = E[i];
    const roots = e.v.map(find);
    if (new Set(roots).size !== roots.length) return;                               // 閉路（套算一次・不拆移）
    if (e.v.some(v => used.some(u => u[0] === e.f && u[1] === v))) return;          // 不得相同
    const save = par.slice();
    for (let k = 1; k < roots.length; k++) par[find(roots[k])] = find(roots[0]);
    for (const v of e.v) used.push([e.f, v]);
    pick.push(e.f);
    rec(i + 1, val + FANS[e.f][1]);
    pick.pop(); used.length -= e.v.length;
    for (let k = 0; k < n; k++) par[k] = save[k];
  }
  rec(0, 0);
  return best;
}

// ---------------------------------------------------------------- 1つの形の番
function Fx() { this.f = {}; this.x = new Set(); }
Fx.prototype.add = function (id, n) { this.f[id] = (this.f[id] || 0) + (n || 1); };
Fx.prototype.no = function (...ids) { for (const i of ids) this.x.add(i); };
Fx.prototype.list = function () {
  const out = [];
  for (const k of Object.keys(this.f)) { const id = +k; if (!this.x.has(id) && this.f[k] > 0) out.push({ id, n: this.f[k] }); }
  return out;
};

// 和了の状況（全形共通）
function situational(F, o, concealedHand) {
  if (o.wallLast) F.add(o.tsumo ? 44 : 45);
  if (o.kong) F.add(o.tsumo ? 46 : 47);
  if (o.tsumo && (o.wallLast || o.kong)) F.no(80);
  if (!o.tsumo && o.kong) F.no(58);
  if (o.last) F.add(58);
  if (concealedHand) { if (o.tsumo) { F.add(56); F.no(80, 62); } else F.add(62); }
  if (o.tsumo) F.add(80);
}
// 牌の並び全体の性質（一色・断么・全大など）。ts：14枚（槓は3枚として）
function wholeHand(F, ts, groupsHaveYao, groupsHave5) {
  const suits = new Set(ts.filter(isNum).map(suit));
  const hon = ts.some(t => t >= 27);
  const nums = ts.filter(isNum).map(num);
  if (ts.every(t => GREEN.has(t))) F.add(3);
  if (!hon) {
    if (suits.size === 1) { F.add(22); F.no(76); }
    if (nums.every(n => n >= 7)) { F.add(25); F.no(36, 76); }
    else if (nums.every(n => n >= 4 && n <= 6)) { F.add(26); F.no(68, 76); }
    else if (nums.every(n => n <= 3)) { F.add(27); F.no(37, 76); }
    else if (nums.every(n => n >= 6)) { F.add(36); F.no(76); }
    else if (nums.every(n => n <= 4)) { F.add(37); F.no(76); }
    if (ts.every(isTermT)) { F.add(8); F.no(49, 55, 73, 76); }
    F.add(76);
  } else if (suits.size === 1) F.add(50);
  if (hon && ts.every(t => t >= 27)) { F.add(11); F.no(49, 55, 73, 18); }
  else if (hon && ts.every(isYaoT)) { F.add(18); F.no(49, 73, 55); }
  if (ts.every(t => REV.has(t))) { F.add(40); F.no(75); }
  if (suits.size === 2) F.add(75);
  if (suits.size === 3 && ts.some(isWindT) && ts.some(isDragonT)) F.add(52);
  if (ts.every(t => !isYaoT(t))) { F.add(68); F.no(76); }
  if (groupsHaveYao) F.add(55);
  if (groupsHave5) { F.add(31); F.no(68, 76); }
}

function regular(o, sets, pair, attr, uniq) {
  // sets: [{k:'c'|'p'|'g', t, open, conc}]（4つ）、attr：和了牌が入った面子（-1＝雀頭）
  const F = new Fx();
  const ts = [];
  for (const s of sets) { if (s.k === 'c') ts.push(s.t, s.t + 1, s.t + 2); else ts.push(s.t, s.t, s.t); }
  ts.push(pair, pair);
  const chows = sets.filter(s => s.k === 'c'), pungs = sets.filter(s => s.k !== 'c');
  const kongs = sets.filter(s => s.k === 'g');
  const nMK = kongs.filter(s => s.open).length, nCK = kongs.length - nMK;
  const openMelds = sets.filter(s => s.open).length;
  const nConc = pungs.filter(s => s.conc).length;
  const grpYao = sets.every(s => s.k === 'c' ? (num(s.t) === 1 || num(s.t) === 7) : isYaoT(s.t)) && isYaoT(pair);
  const grp5 = sets.every(s => isNum(s.t) && (s.k === 'c' ? num(s.t) >= 3 && num(s.t) <= 5 : num(s.t) === 5)) && isNum(pair) && num(pair) === 5;
  wholeHand(F, ts, grpYao, grp5);

  // 風・三元
  const wp = pungs.filter(s => isWindT(s.t)), dp = pungs.filter(s => isDragonT(s.t));
  let windYao = true;                                 // 風牌の刻子に么九刻を付けるか
  if (wp.length === 4) { F.add(1); F.no(38, 49, 60, 61); windYao = false; }
  else if (wp.length === 3 && isWindT(pair)) { F.add(9); F.no(38); windYao = false; }
  else if (wp.length === 3) { F.add(38); windYao = false; }
  if (dp.length === 3) { F.add(2); F.no(54, 59); }
  else if (dp.length === 2 && isDragonT(pair)) { F.add(10); F.no(54, 59); }
  else if (dp.length === 2) { F.add(54); F.no(59); }
  else if (dp.length === 1) F.add(59);
  let yao = 0;
  for (const s of wp) {
    const r = s.t - 27 === o.round, st = s.t - 27 === o.seat;
    if (r) F.add(60);
    if (st) F.add(61);
    if (!r && !st && windYao) yao++;
  }
  for (const s of pungs) if (isTermT(s.t)) yao++;
  if (yao) F.add(73, yao);

  // 槓
  if (kongs.length === 4) { F.add(5); F.no(49, 79); }
  else if (kongs.length === 3) F.add(17);
  else if (kongs.length === 2) {
    if (nCK === 2) { F.add(48); F.no(66); }
    else if (nMK === 2) F.add(57);
    else { F.add(57); F.mixedKong = true; }
  } else if (kongs.length === 1) F.add(nCK ? 67 : 74);
  // 暗刻
  if (nConc === 4) { F.add(12); F.no(49, 62); }
  else if (nConc === 3) F.add(33);
  else if (nConc === 2) F.add(66);
  if (pungs.length === 4) F.add(49);

  // 全双刻
  if (pungs.length === 4 && ts.every(t => isNum(t) && num(t) % 2 === 0)) { F.add(21); F.no(49, 68, 76); }

  // 順子の組み合わせ
  const cht = chows.map(s => s.t);
  let wholeChow = false;
  if (chows.length === 4 && isNum(pair)) {
    const s = cht.slice().sort((a, b) => a - b);
    if (suit(s[0]) === suit(s[3]) && suit(pair) === suit(s[0]) && num(pair) === 5 &&
        num(s[0]) === 1 && num(s[1]) === 1 && num(s[2]) === 7 && num(s[3]) === 7) {
      F.add(13); F.no(22, 63, 76); wholeChow = true;
    } else if (num(pair) === 5) {
      const bySuit = [0, 1, 2].map(x => s.filter(t => suit(t) === x).map(num).join(''));
      const ps = suit(pair);
      const others = [0, 1, 2].filter(x => x !== ps);
      if (bySuit[ps] === '' && others.every(x => bySuit[x] === '17')) { F.add(29); F.no(63, 76); wholeChow = true; }
    }
  }
  if (!wholeChow && cht.length >= 2) for (const f of bestCombo(chowEdges(cht), cht.length)) F.add(f);
  if (chows.length === 4 && isNum(pair)) { F.add(63); F.no(76); }
  // 刻子の組み合わせ
  const pnum = pungs.filter(s => isNum(s.t)).map(s => s.t);
  if (pnum.length >= 2) {
    const sel = bestCombo(pungEdges(pnum), pnum.length);
    for (const f of sel) F.add(f);
    if (sel.includes(15)) F.no(49);
  }
  // 四帰一（槓にしていない4枚）
  const c = counts(ts);
  for (const s of kongs) c[s.t] -= 3;                 // 槓は数えない
  let hog = 0;
  for (let t = 0; t < 34; t++) if (c[t] === 4) hog++;
  if (hog) F.add(64, hog);
  if (F.f[14]) F.no(64);

  // 和了の形
  const concealedHand = openMelds === 0;
  if (openMelds === 4 && !o.tsumo) { F.add(53); F.no(79); }
  situational(F, o, concealedHand);
  if (uniq) {
    if (attr === -1) F.add(79);
    else {
      const s = sets[attr];
      if (s.k === 'c') {
        const pos = o.win - s.t;
        if (pos === 1) F.add(78);
        else if ((pos === 2 && num(s.t) === 1) || (pos === 0 && num(s.t) === 7)) F.add(77);
      }
    }
  }
  return F;
}

function nineGates(o, F) {
  if (o.melds.length) return false;
  const c = counts(o.hand);
  const s = suit(o.win);
  if (s > 2) return false;
  const want = [3, 1, 1, 1, 1, 1, 1, 1, 3];
  for (let t = 0; t < 34; t++) { const exp = suit(t) === s && t < 27 ? want[t % 9] : 0; if (c[t] !== exp) return false; }
  return true;
}

function finalize(F) {
  const list = F.list();
  let pts = 0;
  for (const e of list) { e.p = (e.id === 57 && F.mixedKong) ? MIXED_KONGS_PTS : FANS[e.id][1]; pts += e.p * e.n; }
  if (pts === 0) { list.push({ id: 43, n: 1, p: 8 }); pts = 8; }
  return { pts, fans: list, mixedKong: !!F.mixedKong };
}

function calc(o) {
  const m = o.melds.length;
  const hc = counts(o.hand); hc[o.win]++;
  const all = hc.slice();
  for (const md of o.melds) { if (md.k === 'chi') { all[md.t]++; all[md.t + 1]++; all[md.t + 2]++; } else all[md.t] += md.k === 'pon' ? 3 : 4; }
  if (all.some(x => x > 4)) return { ok: false, err: 'count' };
  const W = waits(o.hand, m);
  if (!W.includes(o.win)) return { ok: false, err: 'notwin' };
  const uniq = W.length === 1;
  let best = null;
  const consider = (F, form) => {
    const r = finalize(F); r.form = form;
    if (!best || r.pts > best.pts) best = r;
  };
  const meldSets = o.melds.map(md => ({ k: md.k === 'chi' ? 'c' : md.k === 'pon' ? 'p' : 'g', t: md.t, open: md.k !== 'ankan', conc: md.k === 'ankan' }));

  // 一般形
  for (const d of decomp(hc, 4 - m)) {
    const conSets = d.sets.map(s => ({ k: s.k, t: s.t, open: false, conc: s.k === 'p' }));
    const sets = meldSets.concat(conSets);
    const attrs = [];
    if (d.pair === o.win) attrs.push(-1);
    conSets.forEach((s, i) => { if (s.k === 'p' ? s.t === o.win : o.win >= s.t && o.win <= s.t + 2) attrs.push(m + i); });
    for (const a of attrs) {
      const ss = sets.map(s => Object.assign({}, s));
      if (a >= 0 && ss[a].k === 'p' && !o.tsumo) ss[a].conc = false;
      const F = regular(o, ss, d.pair, a, uniq);
      if (nineGates(o)) { F.add(4); F.no(22, 62, 73, 76); if (o.tsumo) F.no(80); }
      consider(F, 'std');
    }
  }
  if (m === 0) {
    // 七対
    if (hc.every(x => x === 0 || x === 2 || x === 4)) {
      const F = new Fx(); const ts = [];
      for (let t = 0; t < 34; t++) for (let k = 0; k < hc[t]; k++) ts.push(t);
      wholeHand(F, ts, false, false);
      F.no(49);
      const pairs = []; for (let t = 0; t < 34; t++) if (hc[t]) pairs.push(t);
      if (pairs.length === 7 && isNum(pairs[0]) && suit(pairs[0]) === suit(pairs[6]) && pairs[6] - pairs[0] === 6) { F.add(6); F.no(22, 76); }
      else F.add(19);
      let hog = 0; for (let t = 0; t < 34; t++) if (hc[t] === 4) hog++;
      if (hog) F.add(64, hog);
      situational(F, o, true); F.no(62);
      consider(F, 'pairs');
    }
    // 十三么
    if (ORPHANS.every(t => hc[t] >= 1) && ORPHANS.reduce((a, t) => a + hc[t], 0) === 14) {
      const F = new Fx(); F.add(7); situational(F, o, true); F.no(62); consider(F, 'orphans');
    }
    // 全不靠・七星不靠
    for (let i = 0; i < 6; i++) {
      const kt = KN_TILES[i];
      let ok = true;
      for (let t = 0; t < 34; t++) if (hc[t] > 1 || (hc[t] && t < 27 && !kt.includes(t))) { ok = false; break; }
      if (!ok) continue;
      const F = new Fx();
      let hon = 0; for (let t = 27; t < 34; t++) if (hc[t]) hon++;
      if (hon === 7) F.add(20); else F.add(34);
      if (kt.every(t => hc[t])) F.add(35);
      situational(F, o, true); F.no(62);
      consider(F, 'knitted');
      break;
    }
  }
  // 組合龍＋1面子＋雀頭
  if (m <= 1) for (let i = 0; i < 6; i++) {
    const kt = KN_TILES[i];
    if (!kt.every(t => hc[t] >= 1)) continue;
    const r = hc.slice(); for (const t of kt) r[t]--;
    for (const d of decomp(r, 1 - m)) {
      const set = m ? meldSets[0] : { k: d.sets[0].k, t: d.sets[0].t, open: false, conc: d.sets[0].k === 'p' };
      // 和了牌の入り先：組合龍の牌／面子／雀頭
      const attrs = [];
      if (kt.includes(o.win)) attrs.push('k');
      if (!m && (set.k === 'p' ? set.t === o.win : set.k === 'c' && o.win >= set.t && o.win <= set.t + 2)) attrs.push('s');
      if (d.pair === o.win) attrs.push('pair');
      for (const a of attrs) {
        const F = new Fx();
        F.add(35);
        const s = Object.assign({}, set);
        if (a === 's' && s.k === 'p' && !o.tsumo) s.conc = false;
        const ts = kt.slice(); if (s.k === 'c') ts.push(s.t, s.t + 1, s.t + 2); else ts.push(s.t, s.t, s.t); ts.push(d.pair, d.pair);
        const hon = ts.some(t => t >= 27);
        if (!hon) F.add(76);
        if (ts.some(isWindT) && ts.some(isDragonT)) F.add(52);
        if (s.k === 'c' && isNum(d.pair)) { F.add(63); F.no(76); }
        if (s.k !== 'c') {
          if (isDragonT(s.t)) F.add(59);
          else if (isWindT(s.t)) { const rw = s.t - 27 === o.round, sw = s.t - 27 === o.seat; if (rw) F.add(60); if (sw) F.add(61); if (!rw && !sw) F.add(73); }
          else if (isTermT(s.t)) F.add(73);
          if (s.k === 'g') F.add(s.open ? 74 : 67);
        }
        const c = counts(ts); if (s.k === 'g') c[s.t] -= 3;
        let hog = 0; for (let t = 0; t < 34; t++) if (c[t] === 4) hog++;
        if (hog) F.add(64, hog);
        situational(F, o, !set.open);
        if (uniq) {
          if (a === 'pair') F.add(79);
          else if (a === 's' && s.k === 'c') { const pos = o.win - s.t; if (pos === 1) F.add(78); else if ((pos === 2 && num(s.t) === 1) || (pos === 0 && num(s.t) === 7)) F.add(77); }
        }
        consider(F, 'knitstraight');
      }
    }
  }
  if (!best) return { ok: false, err: 'notwin' };
  best.ok = true;
  best.flowers = o.flowers || 0;
  best.total = best.pts + best.flowers;
  if (best.flowers) best.fans.push({ id: 81, n: best.flowers, p: 1 });
  best.fans.sort((a, b) => b.p - a.p || a.id - b.id);
  best.waits = W;
  return best;
}

const GBFan = { FANS, calc, waits, isWinShape, decomp, counts, KN_TILES, ORPHANS, GREEN, REV, MIN: 8 };
if (typeof module !== 'undefined' && module.exports) module.exports = GBFan;
else root.GBFan = GBFan;
})(typeof window !== 'undefined' ? window : globalThis);
