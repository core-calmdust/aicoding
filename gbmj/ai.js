// 国標麻将の思考（自作）。8点縛りなので「どの番で上がるか（目標）」ごとに、あと何枚か（目標に限った向聴数）と点を見て、
// 到達の見込み×（点＋24）の大きい目標を伸ばす牌を残す。8点未満ではロンもツモもしない。Lv.1〜20。
//   const bot = GBAI.create({ level, seed }); const action = bot.decide(round, seat, options);
(function (root) {
'use strict';
const GB = root.GB || (typeof require !== 'undefined' ? require('./engine.js') : null);
const GBFan = root.GBFan || (typeof require !== 'undefined' ? require('./fan.js') : null);
const MJ = root.MJ || (typeof require !== 'undefined' ? require('../mahjong/engine.js') : null);
const T = GB.T;
const suit = t => t < 27 ? (t / 9 | 0) : 3;
const num = t => t % 9 + 1;

// ---------------------------------------------------------------- 目標（番）の一覧
// kind: 'std'（一般形・使える牌を絞る）, 'pung'（刻子だけ）, 'chows'（決まった3順子＋1面子＋雀頭）, 'pairs', 'knit', 'kh', 'orph', 'types'
const PLANS = [];
(function build() {
  const range = f => { const a = []; for (let t = 0; t < 34; t++) if (f(t)) a.push(t); return new Set(a); };
  for (let s = 0; s < 3; s++) {
    PLANS.push({ id: 'qys' + s, fan: 22, pts: 24, kind: 'std', allow: range(t => suit(t) === s) });
    PLANS.push({ id: 'hys' + s, fan: 50, pts: 6, kind: 'std', allow: range(t => suit(t) === s || t >= 27) });
    PLANS.push({ id: 'hysp' + s, fan: 50, pts: 12, kind: 'pung', allow: range(t => suit(t) === s || t >= 27) });
    PLANS.push({ id: 'ql' + s, fan: 28, pts: 16, kind: 'chows', req: [s * 9, s * 9 + 3, s * 9 + 6] });
    for (let b = 0; b <= 4; b++) PLANS.push({ id: 'ysbg' + s + b, fan: 30, pts: 16, kind: 'chows', req: [s * 9 + b, s * 9 + b + 1, s * 9 + b + 2] });
    for (let b = 0; b <= 2; b++) PLANS.push({ id: 'ysbg2' + s + b, fan: 30, pts: 16, kind: 'chows', req: [s * 9 + b, s * 9 + b + 2, s * 9 + b + 4] });
  }
  PLANS.push({ id: 'pph', fan: 49, pts: 6, kind: 'pung', allow: null });
  const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  for (const p of perms) PLANS.push({ id: 'hl' + p.join(''), fan: 39, pts: 8, kind: 'chows', req: [p[0] * 9, p[1] * 9 + 3, p[2] * 9 + 6] });
  for (let b = 0; b <= 6; b++) PLANS.push({ id: 'sstx' + b, fan: 41, pts: 8, kind: 'chows', req: [b, 9 + b, 18 + b] });
  for (const p of perms) for (let b = 0; b <= 4; b++) PLANS.push({ id: 'sbg' + p.join('') + b, fan: 51, pts: 6, kind: 'chows', req: [p[0] * 9 + b, p[1] * 9 + b + 1, p[2] * 9 + b + 2] });
  PLANS.push({ id: 'qd', fan: 19, pts: 24, kind: 'pairs' });
  PLANS.push({ id: 'zhl', fan: 35, pts: 12, kind: 'knit' });
  PLANS.push({ id: 'qbk', fan: 34, pts: 12, kind: 'kh' });
  PLANS.push({ id: 'ssy', fan: 7, pts: 88, kind: 'orph' });
  PLANS.push({ id: 'wmq', fan: 52, pts: 6, kind: 'types' });
  PLANS.push({ id: 'dyw', fan: 36, pts: 12, kind: 'std', allow: range(t => t < 27 && num(t) >= 6) });
  PLANS.push({ id: 'xyw', fan: 37, pts: 12, kind: 'std', allow: range(t => t < 27 && num(t) <= 4) });
  PLANS.push({ id: 'qd7', fan: 25, pts: 24, kind: 'std', allow: range(t => t < 27 && num(t) >= 7) });
  PLANS.push({ id: 'qz', fan: 26, pts: 24, kind: 'std', allow: range(t => t < 27 && num(t) >= 4 && num(t) <= 6) });
  PLANS.push({ id: 'qx', fan: 27, pts: 24, kind: 'std', allow: range(t => t < 27 && num(t) <= 3) });
  PLANS.push({ id: 'dy', fan: 68, pts: 2, kind: 'std', allow: range(t => t < 27 && num(t) >= 2 && num(t) <= 8) });
})();

// 刻子だけの向聴数（4刻子＋雀頭）
function shantenPung(c, melds) {
  let A = melds, B = 0;
  for (let t = 0; t < 34; t++) { if (c[t] >= 3) A++; else if (c[t] === 2) B++; }
  if (A > 4) A = 4;
  return 8 - 2 * A - Math.min(B, 5 - A);
}
// 目標の向聴数。hand は立牌の種類の枚数、melds は [{k,t}]（k：chi/pon/kan/ankan）
function planShanten(pl, c, melds) {
  const m = melds.length;
  const nTiles = c.reduce((a, b) => a + b, 0);
  switch (pl.kind) {
    case 'std': case 'pung': {
      if (pl.kind === 'pung' && melds.some(x => x.k === 'chi')) return 99;
      let cc = c, have = nTiles;
      if (pl.allow) {
        for (const x of melds) { if (!pl.allow.has(x.t) || (x.k === 'chi' && (!pl.allow.has(x.t + 1) || !pl.allow.has(x.t + 2)))) return 99; }
        cc = c.slice(); have = 0;
        for (let t = 0; t < 34; t++) { if (!pl.allow.has(t)) cc[t] = 0; else have += cc[t]; }
      }
      const s = pl.kind === 'pung' ? shantenPung(cc, m) : MJ.shantenNormal(cc, m);
      return Math.max(s, (nTiles - have) - 1 + (nTiles === 13 - 3 * m ? 0 : 0));
    }
    case 'chows': {
      const r = c.slice(); let miss = 0, other = 0;
      const req = pl.req.slice();
      for (const x of melds) { const i = x.k === 'chi' ? req.indexOf(x.t) : -1; if (i >= 0) req.splice(i, 1); else other++; }
      if (other > 1) return 99;
      for (const b of req) for (const t of [b, b + 1, b + 2]) { if (r[t]) r[t]--; else miss++; }
      return miss + GB.shantenSets(r, 1 - other);
    }
    case 'pairs': return m ? 99 : GB.shantenPairs(c);
    case 'orph': return m ? 99 : MJ.shantenKokushi(c);
    case 'kh': return m ? 99 : GB.shantenKnittedHonors(c);
    case 'knit': return GB.shantenKnittedStraight(c, m);
    case 'types': {
      const has = [0, 0, 0, 0, 0];
      for (let t = 0; t < 34; t++) if (c[t]) has[t < 27 ? suit(t) : t <= 30 ? 3 : 4] = 1;
      for (const x of melds) has[x.t < 27 ? suit(x.t) : x.t <= 30 ? 3 : 4] = 1;
      const missing = 5 - has.reduce((a, b) => a + b, 0);
      return GB.shanten(c, m) + missing;
    }
  }
  return 99;
}

function create(o) {
  o = o || {};
  const level = Math.max(1, Math.min(20, o.level || 10));
  const rand = GB.rng(o.seed == null ? (Math.random() * 2 ** 32) >>> 0 : o.seed);
  // 強さの段：ミスの率、目標を見る深さ、守り、鳴きの判断
  const noise = level >= 16 ? 0 : [0.6, 0.5, 0.42, 0.35, 0.3, 0.25, 0.2, 0.16, 0.13, 0.1, 0.08, 0.06, 0.045, 0.03, 0.015][level - 1];
  const usePlans = level >= 3;
  const defend = level >= 8 ? Math.min(1, (level - 6) / 10) : 0;
  const Q = level >= 12 ? 0.42 : 0.36;

  function unseenCounts(r, p) {      // p から見えていない牌の数
    const u = new Array(34).fill(4);
    for (const id of r.P[p].hand) u[T(id)]--;
    for (let i = 0; i < 4; i++) {
      for (const d of r.P[i].discards) if (!d.claimed) u[T(d.id)]--;
      for (const m of r.P[i].melds) if (m.k !== 'ankan' || i === p) for (const id of m.ids) u[T(id)]--;
    }
    if (r.robTile != null) u[T(r.robTile)]--;
    return u.map(x => Math.max(0, x));
  }
  // 手の価値（立牌 c（13枚相当）、副露 melds）
  function value(r, p, c, melds, unseen) {
    const open = melds.some(x => x.k !== 'ankan');
    let bonus = open ? 0 : 2.5;
    const seat = r.seatWind(p) + 27, rw = r.wind + 27;
    let dragon = 0;
    const pungT = t => c[t] >= 3 || melds.some(x => x.k !== 'chi' && x.t === t);
    for (const t of [31, 32, 33]) if (pungT(t)) dragon++;
    bonus += dragon >= 2 ? 6 : dragon * 2;
    if (pungT(seat)) bonus += 2; if (pungT(rw)) bonus += 2;
    const vals = [];
    if (usePlans) for (const pl of PLANS) {
      const d = planShanten(pl, c, melds);
      if (d > 6) continue;
      const pts = pl.pts + bonus;
      let v = (24 + pts) * Math.pow(Q, d + 1);
      if (pts < 8) v *= 0.3;
      vals.push(v);
    }
    // 目標に関係なく速さ（受け入れ枚数）
    const s = GB.shanten(c, melds.length);
    let uke = 0;
    if (s >= 0) for (let t = 0; t < 34; t++) { if (!unseen[t]) continue; c[t]++; if (GB.shanten(c, melds.length) < s) uke += unseen[t]; c[t]--; }
    vals.sort((a, b) => b - a);
    let V = (vals[0] || 0) + 0.3 * (vals[1] || 0) + 0.1 * (vals[2] || 0);
    V += (20 + bonus) * Math.pow(Q, s + 1) * (usePlans ? 0.25 : 1);
    V *= 1 + 0.012 * uke;
    // 聴牌：待ちごとに実際の点を計算（8点以上の待ちだけ数える）
    if (s === 0 && level >= 5) {
      let good = 0;
      const hand13 = []; for (let t = 0; t < 34; t++) for (let k = 0; k < c[t]; k++) hand13.push(t);
      for (const w of GBFan.waits(hand13, melds.length)) {
        if (!unseen[w]) continue;
        const res = GBFan.calc({ melds, hand: hand13, win: w, tsumo: false, flowers: 0, seat: r.seatWind(p), round: r.wind });
        if (res.ok && res.pts >= 8) good += unseen[w] * (24 + res.pts);
      }
      V = V * 0.3 + good * 0.12;
    }
    return V;
  }
  // 放銃の危険（相手ごとの聴牌の見込み×その牌の通りにくさ）
  function danger(r, p, t, unseen) {
    let d = 0;
    for (let k = 1; k < 4; k++) {
      const q = (p + k) % 4, Q2 = r.P[q];
      const open = Q2.melds.filter(x => x.k !== 'ankan');
      const turns = Q2.discards.length;
      let threat = Math.min(1, open.length * 0.22 + Math.max(0, turns - 6) * 0.06);
      if (threat <= 0) continue;
      // 副露が一色に寄っていればその色が危ない
      const suits = new Set(open.map(x => suit(x.t)).filter(s => s < 3));
      let f = 1;
      if (open.length >= 2 && suits.size === 1) f = (t < 27 && suit(t) === [...suits][0]) ? 2.2 : t >= 27 ? 1.2 : 0.35;
      const live = unseen[t] / 4;
      d += threat * f * (0.25 + live) * (t >= 27 ? 0.7 : 1);
    }
    return d;
  }

  function decideTurn(r, p, opts) {
    const hu = opts.find(x => x.type === 'hu');
    if (hu && !hu.low) return hu;
    const P = r.P[p];
    const melds = r.meldsOf(p);
    const unseen = unseenCounts(r, p);
    const c = GB.countsIds(P.hand);
    // 暗槓・加槓：形が変わらなければする
    for (const k of opts.filter(x => x.type === 'ankan' || x.type === 'kakan')) {
      const s0 = GB.shanten(c, melds.length) ;
      const c2 = c.slice(); c2[k.t] -= k.type === 'ankan' ? 4 : 1;
      const m2 = k.type === 'ankan' ? melds.concat([{ k: 'ankan', t: k.t }]) : melds;
      let bestAfter = 99;
      for (let t = 0; t < 34; t++) if (c2[t]) { c2[t]--; bestAfter = Math.min(bestAfter, GB.shanten(c2, m2.length) ); c2[t]++; }
      // 槓のあとはツモが1枚増えるので、捨てた後の形で比べる
      let s0d = 99; for (let t = 0; t < 34; t++) if (c[t]) { c[t]--; s0d = Math.min(s0d, GB.shanten(c, melds.length)); c[t]++; }
      if (k.type === 'ankan' ? GB.shanten(c2, m2.length) <= s0d : bestAfter <= s0d) if (level >= 4 || rand() < 0.5) return k;
    }
    const discards = opts.filter(x => x.type === 'discard');
    if (rand() < noise) {
      // ミス：形を見ずに捨てる（下のレベルほど多い）
      const s = discards[Math.floor(rand() * discards.length)];
      if (level <= 2 || rand() < 0.5) return s;
    }
    let best = null, bv = -1e9;
    const tried = new Map();
    for (const a of discards) {
      const t = T(a.id);
      let v = tried.get(t);
      if (v === undefined) {
        c[t]--;
        v = value(r, p, c, melds, unseen);
        c[t]++;
        if (defend) v -= defend * danger(r, p, t, unseen) * 6 * Math.min(1, r.P[p].discards.length / 10);
        tried.set(t, v);
      }
      v += rand() * 1e-6;
      if (v > bv) { bv = v; best = a; }
    }
    return best;
  }
  function decideClaim(r, p, opts) {
    const hu = opts.find(x => x.type === 'hu');
    if (hu) return hu.low ? { type: 'pass' } : hu;
    const calls = opts.filter(x => x.type === 'pon' || x.type === 'kan' || x.type === 'chi');
    if (!calls.length || level <= 1) return { type: 'pass' };
    const P = r.P[p], melds = r.meldsOf(p), unseen = unseenCounts(r, p);
    const c = GB.countsIds(P.hand);
    const now = value(r, p, c, melds, unseen);
    let best = { type: 'pass' }, bv = now * (level >= 10 ? 1.15 : 1.05);
    const dt = T(r.discard);
    for (const a of calls) {
      const c2 = c.slice(); let m2;
      if (a.type === 'chi') { for (const x of [a.t, a.t + 1, a.t + 2]) if (x !== dt) c2[x]--; m2 = melds.concat([{ k: 'chi', t: a.t }]); }
      else { c2[dt] -= a.type === 'pon' ? 2 : 3; m2 = melds.concat([{ k: a.type === 'pon' ? 'pon' : 'kan', t: dt }]); }
      let v;
      if (a.type === 'kan') v = value(r, p, c2, m2, unseen);
      else { v = -1e9; for (let t = 0; t < 34; t++) if (c2[t]) { c2[t]--; v = Math.max(v, value(r, p, c2, m2, unseen)); c2[t]++; } }
      if (v > bv) { bv = v; best = a; }
    }
    return best;
  }
  return {
    level,
    decide(r, p, opts) { return r.phase === 'turn' ? decideTurn(r, p, opts) : decideClaim(r, p, opts); },
    value, planShanten,
  };
}

const GBAI = { create, PLANS, planShanten };
if (typeof module !== 'undefined' && module.exports) module.exports = GBAI;
else root.GBAI = GBAI;
})(typeof window !== 'undefined' ? window : globalThis);
