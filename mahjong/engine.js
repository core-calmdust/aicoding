// HimeJan engine — Japanese riichi mahjong rules core (tiles, shanten, waits, yaku, fu, points).
// Works in the browser (window.MJ) and in node (module.exports).
//
// Tiles: id 0..135, type = id >> 2 (0..33).
//   0-8 = 1-9m, 9-17 = 1-9p, 18-26 = 1-9s, 27-30 = E S W N, 31 = haku, 32 = hatsu, 33 = chun.
//   Red fives: ids 16 (5m), 52 (5p), 88 (5s).
(function (root) {
'use strict';

const RED = new Set([16, 52, 88]);
const T = id => id >> 2;
const isHonor = t => t >= 27;
const isTerm = t => t < 27 && (t % 9 === 0 || t % 9 === 8);
const isYao = t => t >= 27 || t % 9 === 0 || t % 9 === 8;
const isDragon = t => t >= 31;
const isWind = t => t >= 27 && t <= 30;
const suit = t => t < 27 ? (t / 9 | 0) : 3;
const num = t => t < 27 ? t % 9 + 1 : 0;
const GREEN = new Set([19, 20, 21, 23, 25, 32]); // 2 3 4 6 8 s + hatsu

function doraOf(ind) {           // indicator type -> dora type
  if (ind < 27) return ind % 9 === 8 ? ind - 8 : ind + 1;
  if (ind <= 30) return ind === 30 ? 27 : ind + 1;
  return ind === 33 ? 31 : ind + 1;
}

function counts(types) { const c = new Array(34).fill(0); for (const t of types) c[t]++; return c; }
function countsIds(ids) { const c = new Array(34).fill(0); for (const id of ids) c[id >> 2]++; return c; }

// ---------------------------------------------------------------- shanten
function shantenNormalSlow(c, melds) {
  let best = 8, m = melds, t = 0, pair = 0;
  const cc = c.slice();
  function ev() {
    const tt = Math.min(t, 4 - m);
    const s = 8 - 2 * m - tt - pair;
    if (s < best) best = s;
  }
  function rec(i) {
    while (i < 34 && !cc[i]) i++;
    if (i >= 34) { ev(); return; }
    if (best === -1) return;
    if (cc[i] >= 3) { cc[i] -= 3; m++; rec(i); m--; cc[i] += 3; }
    const sq = i < 27 && i % 9 <= 6;
    if (sq && cc[i + 1] && cc[i + 2]) { cc[i]--; cc[i + 1]--; cc[i + 2]--; m++; rec(i); m--; cc[i]++; cc[i + 1]++; cc[i + 2]++; }
    if (cc[i] >= 2) {
      cc[i] -= 2;
      if (!pair) { pair = 1; rec(i); pair = 0; } else { t++; rec(i); t--; }
      cc[i] += 2;
    }
    if (m + t < 4) {
      if (i < 27 && i % 9 <= 7 && cc[i + 1]) { cc[i]--; cc[i + 1]--; t++; rec(i); t--; cc[i]++; cc[i + 1]++; }
      if (sq && cc[i + 2]) { cc[i]--; cc[i + 2]--; t++; rec(i); t--; cc[i]++; cc[i + 2]++; }
    }
    cc[i]--; rec(i + (cc[i] ? 0 : 1)); cc[i]++;
  }
  rec(0);
  return best;
}

// fast version: per-suit pareto sets of (mentsu, taatsu) memoized, combined over pair choices
const SUIT_MEMO = new Map();
function suitOpts(c, off) {
  let key = 0;
  for (let i = 0; i < 9; i++) key = key * 5 + c[off + i];
  let r = SUIT_MEMO.get(key);
  if (r) return r;
  const a = []; for (let i = 0; i < 9; i++) a.push(c[off + i]);
  const res = new Map();      // m -> max t
  let m = 0, t = 0;
  function rec(i) {
    while (i < 9 && !a[i]) i++;
    if (i >= 9) { if ((res.get(m) ?? -1) < t) res.set(m, t); return; }
    if (a[i] >= 3) { a[i] -= 3; m++; rec(i); m--; a[i] += 3; }
    if (i <= 6 && a[i + 1] && a[i + 2]) { a[i]--; a[i + 1]--; a[i + 2]--; m++; rec(i); m--; a[i]++; a[i + 1]++; a[i + 2]++; }
    if (a[i] >= 2) { a[i] -= 2; t++; rec(i); t--; a[i] += 2; }
    if (i <= 7 && a[i + 1]) { a[i]--; a[i + 1]--; t++; rec(i); t--; a[i]++; a[i + 1]++; }
    if (i <= 6 && a[i + 2]) { a[i]--; a[i + 2]--; t++; rec(i); t--; a[i]++; a[i + 2]++; }
    a[i]--; rec(i); a[i]++;
  }
  rec(0);
  r = [];
  for (const [mm, tt] of res) r.push([mm, tt]);
  // drop dominated
  r = r.filter(([m1, t1]) => !r.some(([m2, t2]) => (m2 >= m1 && t2 >= t1) && (m2 > m1 || t2 > t1)));
  SUIT_MEMO.set(key, r);
  return r;
}
function shantenNormal(c, melds) {
  melds = melds || 0;
  let best = 8;
  const calc = (pair) => {
    const A = suitOpts(c, 0), B = suitOpts(c, 9), C = suitOpts(c, 18);
    let hm = 0, ht = 0;
    for (let i = 27; i < 34; i++) { if (c[i] >= 3) hm++; else if (c[i] === 2) ht++; }
    for (const a of A) for (const b of B) for (const d of C) {
      const M = a[0] + b[0] + d[0] + hm + melds;
      const Tt = a[1] + b[1] + d[1] + ht;
      const s = 8 - 2 * M - Math.min(Tt, Math.max(0, 4 - M)) - pair;
      if (s < best) best = s;
    }
  };
  calc(0);
  for (let i = 0; i < 34; i++) if (c[i] >= 2) { c[i] -= 2; calc(1); c[i] += 2; }
  return Math.max(-1, best);
}
function shantenChiitoi(c) {
  let p = 0, k = 0;
  for (let i = 0; i < 34; i++) { if (c[i]) k++; if (c[i] >= 2) p++; }
  return 6 - p + Math.max(0, 7 - k);
}
function shantenKokushi(c) {
  let k = 0, p = 0;
  for (let i = 0; i < 34; i++) if (isYao(i) && c[i]) { k++; if (c[i] >= 2) p = 1; }
  return 13 - k - p;
}
const SH_CACHE = new Map();
function shanten(c, melds) {
  melds = melds || 0;
  let key = String.fromCharCode(48 + melds);
  for (let i = 0; i < 34; i++) key += c[i];
  let s = SH_CACHE.get(key);
  if (s !== undefined) return s;
  s = shantenNormal(c, melds);
  if (!melds) { s = Math.min(s, shantenChiitoi(c), shantenKokushi(c)); }
  if (SH_CACHE.size > 300000) SH_CACHE.clear();
  SH_CACHE.set(key, s);
  return s;
}
function isAgari(c, melds) { return shanten(c, melds) === -1; }

// tiles that complete a 13-tile concealed part (counts c, n melds)
function waits(c, melds) {
  const w = [];
  for (let t = 0; t < 34; t++) {
    if (c[t] >= 4) continue;
    c[t]++;
    if (shanten(c, melds) === -1) w.push(t);
    c[t]--;
  }
  return w;
}

// ---------------------------------------------------------------- decomposition
function decompose(c) {            // concealed counts (3n+2) -> [{pair, groups:[{k:'s'|'k', t}]}]
  const out = [];
  const cc = c.slice();
  const gs = [];
  function rec(i) {
    while (i < 34 && !cc[i]) i++;
    if (i >= 34) { out.push(gs.slice()); return; }
    if (cc[i] >= 3) { cc[i] -= 3; gs.push({ k: 'k', t: i }); rec(i); gs.pop(); cc[i] += 3; }
    if (i < 27 && i % 9 <= 6 && cc[i + 1] && cc[i + 2]) {
      cc[i]--; cc[i + 1]--; cc[i + 2]--; gs.push({ k: 's', t: i }); rec(i); gs.pop(); cc[i]++; cc[i + 1]++; cc[i + 2]++;
    }
  }
  const res = [];
  for (let p = 0; p < 34; p++) {
    if (cc[p] < 2) continue;
    cc[p] -= 2;
    out.length = 0; rec(0);
    for (const g of out) res.push({ pair: p, groups: g });
    cc[p] += 2;
  }
  // dedupe identical decompositions
  const seen = new Set();
  return res.filter(d => { const k = d.pair + '|' + d.groups.map(g => g.k + g.t).sort().join(','); if (seen.has(k)) return false; seen.add(k); return true; });
}

// ---------------------------------------------------------------- scoring
const YAKU = {
  riichi: 1, dbl_riichi: 2, ippatsu: 1, tsumo: 1, pinfu: 1, tanyao: 1, iipeikou: 1,
  haku: 1, hatsu: 1, chun: 1, seat_wind: 1, round_wind: 1,
  haitei: 1, houtei: 1, rinshan: 1, chankan: 1,
  chiitoi: 2, chanta: 2, ittsu: 2, sanshoku: 2, sanshoku_k: 2, toitoi: 2, sanankou: 2, sankantsu: 2,
  shousangen: 2, honroutou: 2, honitsu: 3, junchan: 3, ryanpeikou: 3, chinitsu: 6,
  skill_han: 1,
};
const OPEN_MINUS = { chanta: 1, ittsu: 1, sanshoku: 1, honitsu: 1, junchan: 1, chinitsu: 1 };
const MENZEN_ONLY = { riichi: 1, dbl_riichi: 1, ippatsu: 1, tsumo: 1, pinfu: 1, iipeikou: 1, ryanpeikou: 1, chiitoi: 1 };

function roundUp100(x) { return Math.ceil(x / 100) * 100; }

function limitBase(han, fu, yakuman) {
  if (yakuman) return 8000 * yakuman;
  if (han >= 13) return 8000;
  if (han >= 11) return 6000;
  if (han >= 8) return 4000;
  if (han >= 6) return 3000;
  const b = fu * Math.pow(2, han + 2);
  return han >= 5 || b > 2000 ? 2000 : b;
}
function limitName(han, fu, yakuman) {
  if (yakuman) return yakuman >= 2 ? 'dbl_yakuman' : 'yakuman';
  if (han >= 13) return 'kazoe';
  if (han >= 11) return 'sanbaiman';
  if (han >= 8) return 'baiman';
  if (han >= 6) return 'haneman';
  if (han >= 5 || fu * Math.pow(2, han + 2) > 2000) return 'mangan';
  return '';
}
// payments (without honba). dealer: is the winner the dealer
function payments(base, dealer, tsumo) {
  if (!tsumo) return { ron: roundUp100(base * (dealer ? 6 : 4)) };
  if (dealer) return { all: roundUp100(base * 2) };
  return { dealer: roundUp100(base * 2), other: roundUp100(base) };
}

// o: {
//   closed: [types] concealed tiles INCLUDING the winning tile, melds: [{type, t(lowest type), tiles:[ids]}],
//   win: type, tsumo, seatWind (27..30), roundWind, dealer,
//   riichi, dblRiichi, ippatsu, haitei, houtei, rinshan, chankan, tenhou, chiihou,
//   doraInd: [types], uraInd: [types], aka: n, allTypes: [types incl. melds] (for dora), skillHan: n
// } -> best result or null
function evaluate(o) {
  const c = counts(o.closed);
  const melds = o.melds || [];
  const open = melds.some(m => m.type !== 'ankan');
  const menzen = !open;
  const all = o.allTypes || o.closed.concat(...melds.map(m => m.tiles.map(T)));
  const cands = [];

  const situ = [];               // situational yaku
  if (o.dblRiichi) situ.push('dbl_riichi'); else if (o.riichi) situ.push('riichi');
  if (o.ippatsu) situ.push('ippatsu');
  if (o.tsumo && menzen) situ.push('tsumo');
  if (o.haitei) situ.push('haitei');
  if (o.houtei) situ.push('houtei');
  if (o.rinshan) situ.push('rinshan');
  if (o.chankan) situ.push('chankan');
  const situYakuman = [];
  if (o.tenhou) situYakuman.push(['tenhou', 1]);
  if (o.chiihou) situYakuman.push(['chiihou', 1]);

  // ---- kokushi
  if (!melds.length && shantenKokushi(c) === -1) {
    const c13 = c.slice(); c13[o.win]--;
    const thirteen = shantenKokushi(c13) === 0 && waits(c13, 0).length === 13;
    cands.push({ yakuman: [['kokushi', thirteen ? 2 : 1]].concat(situYakuman), fu: 0 });
  }
  // ---- chiitoi
  if (!melds.length && shantenChiitoi(c) === -1) {
    const y = situ.slice(); y.push('chiitoi');
    const ys = new Set();
    if (all.every(t => !isYao(t))) y.push('tanyao');
    if (all.every(isYao)) y.push('honroutou');
    const st = new Set(all.filter(t => t < 27).map(suit));
    const hon = all.some(isHonor);
    if (st.size === 1) y.push(hon ? 'honitsu' : 'chinitsu');
    const ym = situYakuman.slice();
    if (all.every(isHonor)) ym.push(['tsuuiisou', 1]);
    cands.push({ yaku: y, fu: 25, yakuman: ym.length ? ym : null });
  }
  // ---- standard
  if (shantenNormal(c, melds.length) === -1) {
    for (const d of decompose(c)) {
      // interpretations of the winning tile
      const interps = [];
      if (d.pair === o.win) interps.push({ g: -1, wait: 'tanki' });
      d.groups.forEach((g, gi) => {
        if (g.k === 'k' && g.t === o.win) interps.push({ g: gi, wait: 'shanpon' });
        if (g.k === 's' && o.win >= g.t && o.win <= g.t + 2) {
          const pos = o.win - g.t;
          let w;
          if (pos === 1) w = 'kanchan';
          else if (pos === 0) w = g.t % 9 === 6 ? 'penchan' : 'ryanmen';
          else w = g.t % 9 === 0 ? 'penchan' : 'ryanmen';
          interps.push({ g: gi, wait: w });
        }
      });
      const seenI = new Set();
      for (const it of interps) {
        const key = it.wait + (it.g >= 0 ? d.groups[it.g].k + d.groups[it.g].t : 'p');
        if (seenI.has(key)) continue; seenI.add(key);
        cands.push(evalStd(o, d, it, melds, menzen, all, situ, situYakuman));
      }
    }
  }
  // pick best
  let best = null;
  for (const r of cands) {
    if (!r) continue;
    finish(r, o, menzen, all);
    if (!r.han && !r.yakumanN) continue;
    if (!best || r.base > best.base || (r.base === best.base && (r.han > best.han || (r.han === best.han && r.fu > best.fu)))) best = r;
  }
  return best;
}

function evalStd(o, d, it, melds, menzen, all, situ, situYakuman) {
  // groups: concealed + melds
  const G = d.groups.map((g, i) => ({ k: g.k, t: g.t, open: false, kan: false, ron: !o.tsumo && i === it.g && g.k === 'k' }));
  for (const m of melds) {
    const t = m.t;
    if (m.type === 'chi') G.push({ k: 's', t, open: true, kan: false });
    else if (m.type === 'pon') G.push({ k: 'k', t, open: true, kan: false });
    else if (m.type === 'ankan') G.push({ k: 'k', t, open: false, kan: true });
    else G.push({ k: 'k', t, open: true, kan: true });
  }
  const p = d.pair;
  const seqs = G.filter(g => g.k === 's');
  const kous = G.filter(g => g.k === 'k');
  const yaku = situ.slice();
  const ym = situYakuman.slice();
  const yakuhaiT = t => isDragon(t) || t === o.seatWind || t === o.roundWind;

  // pinfu
  const pinfu = menzen && seqs.length === 4 && !yakuhaiT(p) && it.wait === 'ryanmen';
  if (pinfu) yaku.push('pinfu');
  // tanyao
  if (all.every(t => !isYao(t))) yaku.push('tanyao');
  // yakuhai
  for (const g of kous) {
    if (g.t === 31) yaku.push('haku');
    if (g.t === 32) yaku.push('hatsu');
    if (g.t === 33) yaku.push('chun');
    if (g.t === o.seatWind) yaku.push('seat_wind');
    if (g.t === o.roundWind) yaku.push('round_wind');
  }
  // peikou
  if (menzen) {
    const cs = {}; for (const g of seqs) cs[g.t] = (cs[g.t] || 0) + 1;
    let pk = 0; for (const k in cs) pk += cs[k] >> 1;
    if (pk >= 2) yaku.push('ryanpeikou'); else if (pk === 1) yaku.push('iipeikou');
  }
  // sanshoku / ittsu
  for (let n = 0; n < 7; n++) if ([0, 9, 18].every(s => seqs.some(g => g.t === s + n))) { yaku.push('sanshoku'); break; }
  for (let n = 0; n < 9; n++) if ([0, 9, 18].every(s => kous.some(g => g.t === s + n))) { yaku.push('sanshoku_k'); break; }
  for (const s of [0, 9, 18]) if ([0, 3, 6].every(n => seqs.some(g => g.t === s + n))) { yaku.push('ittsu'); break; }
  // chanta / junchan / honroutou
  const grpYao = g => g.k === 'k' ? isYao(g.t) : (g.t % 9 === 0 || g.t % 9 === 6);
  if (G.every(grpYao) && isYao(p)) {
    const hasHonor = all.some(isHonor);
    if (seqs.length) yaku.push(hasHonor ? 'chanta' : 'junchan');
    else yaku.push('honroutou');
  }
  // toitoi, ankou
  if (kous.length === 4) yaku.push('toitoi');
  const ankou = kous.filter(g => !g.open && !g.ron).length;
  if (ankou === 4) ym.push(['suuankou', it.wait === 'tanki' ? 2 : 1]);
  else if (ankou === 3) yaku.push('sanankou');
  const kans = kous.filter(g => g.kan).length;
  if (kans === 4) ym.push(['suukantsu', 1]); else if (kans === 3) yaku.push('sankantsu');
  // dragons / winds
  const dk = kous.filter(g => isDragon(g.t)).length;
  if (dk === 3) ym.push(['daisangen', 1]);
  else if (dk === 2 && isDragon(p)) yaku.push('shousangen');
  const wk = kous.filter(g => isWind(g.t)).length;
  if (wk === 4) ym.push(['daisuushii', 2]);
  else if (wk === 3 && isWind(p)) ym.push(['shousuushii', 1]);
  // flushes
  const st = new Set(all.filter(t => t < 27).map(suit));
  const hon = all.some(isHonor);
  if (st.size === 1) yaku.push(hon ? 'honitsu' : 'chinitsu');
  if (all.every(isHonor)) ym.push(['tsuuiisou', 1]);
  if (all.every(t => GREEN.has(t))) ym.push(['ryuuiisou', 1]);
  if (all.every(isTerm)) ym.push(['chinroutou', 1]);
  // chuuren
  if (menzen && st.size === 1 && !hon && !melds.length) {
    const c = counts(o.closed); const s0 = suit(o.win) * 9;
    const base = [3, 1, 1, 1, 1, 1, 1, 1, 3];
    if (base.every((b, i) => c[s0 + i] >= b)) {
      const c13 = c.slice(); c13[o.win]--;
      const nine = base.every((b, i) => c13[s0 + i] === b);
      ym.push(['chuuren', nine ? 2 : 1]);
    }
  }
  // remove honroutou overlap with chanta (handled), toitoi+honroutou ok
  // ---- fu
  let fu = 20;
  if (pinfu) fu = o.tsumo ? 20 : 30;
  else {
    if (menzen && !o.tsumo) fu += 10;
    if (o.tsumo) fu += 2;
    for (const g of kous) {
      let f = 2;
      if (isYao(g.t)) f *= 2;
      if (!g.open && !g.ron) f *= 2;
      if (g.kan) f *= 4;
      fu += f;
    }
    if (isDragon(p)) fu += 2;
    if (p === o.seatWind) fu += 2;
    if (p === o.roundWind) fu += 2;
    if (it.wait === 'kanchan' || it.wait === 'penchan' || it.wait === 'tanki') fu += 2;
    fu = Math.ceil(fu / 10) * 10;
    if (fu === 20) fu = 30;          // open pinfu shape
  }
  return { yaku, fu, yakuman: ym.length ? ym : null, wait: it.wait };
}

function finish(r, o, menzen, all) {
  if (r.yakuman && r.yakuman.length) {
    r.yakumanN = r.yakuman.reduce((a, y) => a + y[1], 0);
    r.han = 0; r.list = r.yakuman.map(([k, n]) => [k, n * 13]);
    r.base = limitBase(0, 0, r.yakumanN);
    r.limit = limitName(0, 0, r.yakumanN);
    return;
  }
  r.yakumanN = 0;
  let han = 0; const list = [];
  for (const k of r.yaku) {
    let h = YAKU[k];
    if (!menzen && MENZEN_ONLY[k]) continue;
    if (!menzen && OPEN_MINUS[k]) h -= 1;
    han += h; list.push([k, h]);
  }
  if (!han) { r.han = 0; r.base = 0; return; }
  if (o.skillHan) { han += o.skillHan; list.push(['skill_han', o.skillHan]); }
  let dora = 0;
  for (const ind of o.doraInd || []) { const d = doraOf(ind); for (const t of all) if (t === d) dora++; }
  if (dora) { han += dora; list.push(['dora', dora]); }
  if (o.aka) { han += o.aka; list.push(['aka', o.aka]); }
  if (o.riichi || o.dblRiichi) {
    let ura = 0;
    for (const ind of o.uraInd || []) { const d = doraOf(ind); for (const t of all) if (t === d) ura++; }
    list.push(['ura', ura]); han += ura;
  }
  if (o.skillFu && r.fu !== 25) r.fu = Math.min(110, r.fu + o.skillFu);
  r.han = han; r.list = list;
  r.base = limitBase(han, r.fu, 0);
  r.limit = limitName(han, r.fu, 0);
}

// ---------------------------------------------------------------- helpers
const NAMES = ['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m', '1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p',
  '1s', '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s', 'E', 'S', 'W', 'N', 'P', 'F', 'C'];
function parse(str) {         // "123m456p789s11z" style -> types (z: 1-7 = E S W N P F C)
  const out = []; let buf = [];
  for (const ch of str.replace(/\s+/g, '')) {
    if (/[0-9]/.test(ch)) buf.push(+ch);
    else {
      const b = { m: 0, p: 9, s: 18, z: 27 }[ch];
      for (const n of buf) out.push(ch === 'z' ? b + n - 1 : b + (n === 0 ? 4 : n - 1));
      buf = [];
    }
  }
  return out;
}

const MJ = {
  RED, T, isHonor, isTerm, isYao, isDragon, isWind, suit, num, doraOf, counts, countsIds,
  shanten, shantenNormal, shantenNormalSlow, shantenChiitoi, shantenKokushi, isAgari, waits, decompose,
  evaluate, payments, limitBase, limitName, YAKU, NAMES, parse, roundUp100,
};
if (typeof module !== 'undefined' && module.exports) module.exports = MJ;
else root.MJ = MJ;
})(typeof window !== 'undefined' ? window : globalThis);
