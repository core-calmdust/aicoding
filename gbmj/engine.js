// 国標麻将（MCR）の牌・向聴数。ブラウザ（window.GB）と node（module.exports）の両方で動く。
// 牌の id：0〜135 が数牌・字牌（種類 = id>>2、雀華・リーチ麻雀の mahjong/engine.js と同じ並び）、136〜143 が花牌（種類 34〜41：春夏秋冬梅蘭竹菊）。
// 一般形・七対・国士の向聴数は mahjong/engine.js（MJ）の核をそのまま使い、全不靠・組合龍の向聴数をここで足す。
(function (root) {
'use strict';
const MJ = root.MJ || (typeof require !== 'undefined' ? require('../mahjong/engine.js') : null);
const GBFan = root.GBFan || (typeof require !== 'undefined' ? require('./fan.js') : null);

const N_TILES = 144;
const T = id => id < 136 ? id >> 2 : 34 + (id - 136);
const isFlower = id => id >= 136;
// 表記：1m…9m 1p…9p 1s…9s E S W N P(白) F(發) C(中)、花 f1〜f8
const NAMES = MJ.NAMES.concat(['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8']);

function rng(seed) {
  let a = seed >>> 0;
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function shuffle(a, rand) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
function newWall(rand) { const w = []; for (let i = 0; i < N_TILES; i++) w.push(i); return shuffle(w, rand); }

function counts(types) { const c = new Array(34).fill(0); for (const t of types) if (t < 34) c[t]++; return c; }
function countsIds(ids) { const c = new Array(34).fill(0); for (const id of ids) if (id < 136) c[id >> 2]++; return c; }

// ---------------------------------------------------------------- 向聴数
// 全不靠（14枚すべて別々：字牌＋組合龍の1通りの数牌）。副露なしのみ
function shantenKnittedHonors(c) {
  let best = 13;
  let hon = 0; for (let t = 27; t < 34; t++) if (c[t]) hon++;
  for (const kt of GBFan.KN_TILES) {
    let k = 0; for (const t of kt) if (c[t]) k++;
    const s = 13 - Math.min(14, hon + k);
    if (s < best) best = s;
  }
  return best;
}
// 「k面子＋雀頭」の向聴数（残りの牌が少ないときの一般形。面子の数が k を超えて数えないように上限をつける）
const SETS_MEMO = new Map();
function shantenSets(c, k) {
  const sk = String.fromCharCode(48 + k, ...c);
  const hit = SETS_MEMO.get(sk);
  if (hit !== undefined) return hit;
  const cc = c.slice();
  let best = 2 * k;
  function rec(i, M, Tt, P) {
    while (i < 34 && !cc[i]) i++;
    if (i >= 34) { const s = 2 * k - 2 * M - Math.min(Tt, k - M) - P; if (s < best) best = s; return; }
    if (M < k) {
      if (cc[i] >= 3) { cc[i] -= 3; rec(i, M + 1, Tt, P); cc[i] += 3; }
      if (i < 27 && i % 9 <= 6 && cc[i + 1] && cc[i + 2]) { cc[i]--; cc[i + 1]--; cc[i + 2]--; rec(i, M + 1, Tt, P); cc[i]++; cc[i + 1]++; cc[i + 2]++; }
    }
    if (cc[i] >= 2) {
      cc[i] -= 2;
      if (!P) rec(i, M, Tt, 1);
      if (M + Tt < k) rec(i, M, Tt + 1, P);
      cc[i] += 2;
    }
    if (M + Tt < k && i < 27) {
      if (i % 9 <= 7 && cc[i + 1]) { cc[i]--; cc[i + 1]--; rec(i, M, Tt + 1, P); cc[i]++; cc[i + 1]++; }
      if (i % 9 <= 6 && cc[i + 2]) { cc[i]--; cc[i + 2]--; rec(i, M, Tt + 1, P); cc[i]++; cc[i + 2]++; }
    }
    const x = cc[i]; cc[i] = 0; rec(i + 1, M, Tt, P); cc[i] = x;
  }
  rec(0, 0, 0, 0);
  const res = Math.max(-1, best);
  if (SETS_MEMO.size > 50000) SETS_MEMO.clear();
  SETS_MEMO.set(sk, res);
  return res;
}
// 組合龍（9枚）＋1面子＋雀頭。副露は1つまで
function shantenKnittedStraight(c, melds) {
  if (melds > 1) return 8;
  let best = 8;
  for (const kt of GBFan.KN_TILES) {
    const r = c.slice(); let miss = 0;
    for (const t of kt) { if (r[t]) r[t]--; else miss++; }
    if (miss >= best) continue;
    const s = miss + shantenSets(r, 1 - melds);           // 残りは「(1−副露)面子＋雀頭」
    if (s < best) best = s;
  }
  return best;
}
// 七対：国標では同じ牌4枚を2対に数えてよい（四帰一。リーチ麻雀の七対子とちがう）
function shantenPairs(c) {
  let p = 0; for (let t = 0; t < 34; t++) p += c[t] >> 1;
  return 6 - Math.min(7, p);
}
// 全形の向聴数（-1＝和了形）。c：立牌の種類ごとの枚数、melds：副露（暗槓を含む）の数
function shanten(c, melds) {
  melds = melds || 0;
  let s = MJ.shantenNormal(c, melds);
  if (melds <= 1) s = Math.min(s, shantenKnittedStraight(c, melds));
  if (!melds) s = Math.min(s, shantenPairs(c), MJ.shantenKokushi(c), shantenKnittedHonors(c));
  return s;
}
function shantenParts(c, melds) {
  melds = melds || 0;
  return {
    normal: MJ.shantenNormal(c, melds),
    pairs: melds ? 9 : shantenPairs(c),
    orphans: melds ? 14 : MJ.shantenKokushi(c),
    honorsKnitted: melds ? 14 : shantenKnittedHonors(c),
    knitted: shantenKnittedStraight(c, melds),
  };
}

const GB = {
  N_TILES, T, isFlower, NAMES, rng, shuffle, newWall, counts, countsIds,
  shanten, shantenParts, shantenPairs, shantenSets, shantenKnittedHonors, shantenKnittedStraight,
  waits: (types13, melds) => GBFan.waits(types13, melds),
  MIN: 8,
};
if (typeof module !== 'undefined' && module.exports) module.exports = GB;
else root.GB = GB;
})(typeof window !== 'undefined' ? window : globalThis);
