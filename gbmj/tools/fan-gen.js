// 番種判定の照合用：ランダムな和了局面を作って JSONL で出す（node gbmj/tools/fan-gen.js N seed > cases.jsonl）
'use strict';
const GBFan = require('../fan.js');
const N = +process.argv[2] || 10000;
let seed = +process.argv[3] || 1;
const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };  // mulberry32
const ri = n => Math.floor(rnd() * n);
const pick = a => a[ri(a.length)];
function pool(style) {                       // 使う牌の範囲
  const all = [...Array(34).keys()];
  switch (style) {
    case 0: return all;
    case 1: { const s = ri(3); return all.filter(t => (t >= s * 9 && t < s * 9 + 9) || (rnd() < 0.5 && t >= 27)); }
    case 2: { const s = ri(3); return all.filter(t => t >= s * 9 && t < s * 9 + 9); }
    case 3: return all.filter(t => t >= 27 || t % 9 === 0 || t % 9 === 8);
    case 4: return all.filter(t => t < 27 && t % 9 >= 3 && t % 9 <= 5 || rnd() < 0.1);
    case 5: return [...GBFan.GREEN];
    case 6: return [...GBFan.REV];
    case 7: { const s = ri(3), s2 = (s + 1 + ri(2)) % 3; return all.filter(t => suit(t) === s || suit(t) === s2); }
    case 8: return all.filter(t => t >= 27 || rnd() < 0.3);
    default: return all;
  }
}
const suit = t => t < 27 ? (t / 9 | 0) : 3;
function genStd() {
  const style = ri(10), P = pool(style);
  for (let tries = 0; tries < 200; tries++) {
    const c = new Array(34).fill(0);
    const sets = [];
    const nm = pick([0, 0, 0, 1, 1, 2, 2, 3, 4]);
    let ok = true;
    const chowBias = rnd();
    for (let i = 0; i < 4 && ok; i++) {
      let s = null;
      for (let k = 0; k < 30 && !s; k++) {
        const t = pick(P);
        const r = rnd();
        if (r < chowBias && t < 27 && t % 9 <= 6 && P.includes(t + 1) && P.includes(t + 2)) {
          if (c[t] < 4 && c[t + 1] < 4 && c[t + 2] < 4) s = { k: 'c', t };
        } else if (r < 0.85 || i >= 4) { if (c[t] <= 1) s = { k: 'p', t }; }
        else if (c[t] === 0) s = { k: 'g', t };
      }
      if (!s) { ok = false; break; }
      if (s.k === 'c') { c[s.t]++; c[s.t + 1]++; c[s.t + 2]++; } else c[s.t] += s.k === 'p' ? 3 : 4;
      sets.push(s);
    }
    if (!ok) continue;
    let pr = -1;
    for (let k = 0; k < 30; k++) { const t = pick(P); if (c[t] <= 2) { pr = t; break; } }
    if (pr < 0) continue;
    c[pr] += 2;
    // 副露と立牌
    const melds = [], hand = [];
    sets.forEach((s, i) => {
      if (s.k === 'g') melds.push({ k: i < nm ? 'kan' : 'ankan', t: s.t });
      else if (i < nm) melds.push({ k: s.k === 'c' ? 'chi' : 'pon', t: s.t });
      else if (s.k === 'c') hand.push(s.t, s.t + 1, s.t + 2); else hand.push(s.t, s.t, s.t);
    });
    hand.push(pr, pr);
    const win = hand.splice(ri(hand.length), 1)[0];
    return finish(melds, hand, win);
  }
  return null;
}
function genSpecial() {
  const r = ri(4);
  let hand;
  if (r === 0) {                                // 七対
    const style = ri(10), P = pool(style), c = new Array(34).fill(0); hand = [];
    if (rnd() < 0.1) { const s = ri(3), b = ri(3); for (let i = 0; i < 7; i++) hand.push(s * 9 + b + i, s * 9 + b + i); }
    else for (let i = 0; i < 7; i++) { let t; for (let k = 0; k < 50; k++) { t = pick(P); if (c[t] <= 2) break; } if (c[t] > 2) return null; c[t] += 2; hand.push(t, t); }
  } else if (r === 1) {                         // 十三么
    hand = GBFan.ORPHANS.slice(); hand.push(pick(GBFan.ORPHANS));
  } else if (r === 2) {                         // 全不靠
    const kt = pick(GBFan.KN_TILES), cand = kt.concat([27, 28, 29, 30, 31, 32, 33]);
    const sh = cand.sort(() => rnd() - 0.5); hand = rnd() < 0.3 ? cand.slice(0, 14) : sh.slice(0, 14);
    if (rnd() < 0.3) { const hon = [27, 28, 29, 30, 31, 32, 33]; const ks = kt.slice().sort(() => rnd() - 0.5).slice(0, 7); hand = hon.concat(ks); }
    if (rnd() < 0.3) { hand = kt.concat([27, 28, 29, 30, 31, 32, 33].sort(() => rnd() - 0.5).slice(0, 5)); }
  } else {                                      // 組合龍＋1面子＋雀頭
    const kt = pick(GBFan.KN_TILES), c = new Array(34).fill(0); for (const t of kt) c[t]++;
    hand = kt.slice();
    const melds = [];
    const t = ri(34);
    const kind = ri(4);
    let s;
    if (kind === 0 && t < 27 && t % 9 <= 6) s = { k: 'c', t }; else if (kind === 3) s = { k: 'g', t }; else s = { k: 'p', t };
    const add = s.k === 'c' ? [t, t + 1, t + 2] : s.k === 'p' ? [t, t, t] : [t, t, t, t];
    for (const x of add) c[x]++;
    const p = ri(34); c[p] += 2;
    if (c.some(x => x > 4)) return null;
    const open = rnd() < 0.3 || s.k === 'g';
    if (s.k === 'g') melds.push({ k: open && rnd() < 0.5 ? 'kan' : 'ankan', t });
    else if (open) melds.push({ k: s.k === 'c' ? 'chi' : 'pon', t });
    else hand.push(...add);
    hand.push(p, p);
    const win = hand.splice(ri(hand.length), 1)[0];
    return finish(melds, hand, win);
  }
  const win = hand.splice(ri(hand.length), 1)[0];
  return finish([], hand, win);
}
function finish(melds, hand, win) {
  const tsumo = rnd() < 0.4;

  const hasKong = melds.some(m => m.k === 'kan' || m.k === 'ankan');
  const all = hand.concat([win]); for (const m of melds) { if (m.k === 'chi') all.push(m.t, m.t + 1, m.t + 2); else all.push(m.t, m.t, m.t); }
  const inHand = all.filter(t => t === win).length;
  let kong = false;
  if (tsumo) kong = hasKong && rnd() < 0.2;
  else kong = inHand === 1 && rnd() < 0.2;           // 搶槓：和了牌はほかに見えない
  const wallLast = !kong && rnd() < 0.06;
  const last = !kong && inHand < 4 && rnd() < 0.12;
  return { melds, hand: hand.sort((a, b) => a - b), win, tsumo, kong, wallLast, last, flowers: ri(10) < 7 ? 0 : ri(8) + 1, seat: ri(4), round: ri(4) };
}
// 出にくい番を狙う型（4面子＋雀頭の候補を絞る）
const C = (t) => ({ k: 'c', t }), Pg = (t) => ({ k: rnd() < 0.15 ? 'g' : 'p', t });
const S3 = () => ri(3) * 9;
const TPL = [
  () => [Pg(27), Pg(28), Pg(29), Pg(30), ri(34)],                                         // 大四喜
  () => { const w = [27, 28, 29, 30].sort(() => rnd() - 0.5); return [Pg(w[0]), Pg(w[1]), Pg(w[2]), any(), w[3]]; },  // 小四喜
  () => { const w = [27, 28, 29, 30].sort(() => rnd() - 0.5); return [Pg(w[0]), Pg(w[1]), Pg(w[2]), any(), ri(34)]; }, // 三風刻
  () => { const d = [31, 32, 33].sort(() => rnd() - 0.5); const big = rnd() < 0.5; return [Pg(d[0]), Pg(d[1]), big ? Pg(d[2]) : any(), any(), big ? ri(31) : d[2]]; },
  () => [Pg(27 + ri(7)), Pg(27 + ri(7)), Pg(27 + ri(7)), Pg(27 + ri(7)), 27 + ri(7)],      // 字一色
  () => { const T = [0, 8, 9, 17, 18, 26]; return [Pg(pick(T)), Pg(pick(T)), Pg(pick(T)), Pg(pick(T)), pick(T)]; },
  () => { const T = [0, 8, 9, 17, 18, 26]; return [Pg(pick(T)), Pg(pick(T)), Pg(pick(T)), rnd() < 0.5 ? Pg(pick(T)) : Pg(27 + ri(7)), pick(T)]; },
  () => { const s = S3(); return [C(s), C(s), C(s + 6), C(s + 6), s + 4]; },               // 一色双龍会
  () => { const s = [0, 9, 18].sort(() => rnd() - 0.5); return [C(s[0]), C(s[0] + 6), C(s[1]), C(s[1] + 6), s[2] + 4]; },
  () => { const s = S3(), b = ri(6); return [Pg(s + b), Pg(s + b + 1), Pg(s + b + 2), rnd() < 0.5 ? Pg(s + b + 3 > s + 8 ? s : s + b + 3) : any(), ri(34)]; },
  () => { const s = S3(), d = 1 + ri(2), b = ri(7 - 3 * d); return [C(s + b), C(s + b + d), C(s + b + 2 * d), rnd() < 0.6 && b + 3 * d <= 6 ? C(s + b + 3 * d) : any(), ri(34)]; },
  () => { const s = S3(), b = ri(7); return [C(s + b), C(s + b), C(s + b), rnd() < 0.4 ? C(s + b) : any(), ri(34)]; },
  () => { const s = [0, 9, 18].sort(() => rnd() - 0.5); return [C(s[0]), C(s[1] + 3), C(s[2] + 6), any(), ri(34)]; },        // 花龍
  () => { const b = ri(7); return [C(b), C(9 + b), C(18 + b), any(), ri(34)]; },                                            // 三色三同順
  () => { const s = [0, 9, 18].sort(() => rnd() - 0.5), b = ri(5); return [C(s[0] + b), C(s[1] + b + 1), C(s[2] + b + 2), any(), ri(34)]; },
  () => { const b = ri(7); const s = [0, 9, 18].sort(() => rnd() - 0.5); return [Pg(s[0] + b), Pg(s[1] + b + 1 > 8 ? b : b + 1 + s[1] - s[1]) , Pg(s[2] + Math.min(8, b + 2)), any(), ri(34)]; },
  () => { const r = () => ri(3) * 9; const f = () => rnd() < 0.5 ? C(r() + 2 + ri(3)) : Pg(r() + 4); return [f(), f(), f(), f(), r() + 4]; },       // 全帯五
  () => { const lo = rnd() < 0.5; const f = () => { const s = S3(); return lo ? (rnd() < 0.6 ? C(s + ri(lo ? 2 : 1)) : Pg(s + ri(4))) : (rnd() < 0.6 ? C(s + 5 + ri(2)) : Pg(s + 5 + ri(4))); }; return [f(), f(), f(), f(), S3() + (lo ? ri(4) : 5 + ri(4))]; },
  () => { const f = () => { const s = S3(); return rnd() < 0.6 ? C(s + (rnd() < 0.5 ? 0 : 6)) : Pg(rnd() < 0.5 ? s + (rnd() < 0.5 ? 0 : 8) : 27 + ri(7)); }; return [f(), f(), f(), f(), pick([0, 8, 9, 17, 18, 26, 27, 31])]; },
  () => { const f = () => { const s = S3(); return rnd() < 0.8 ? C(s + ri(7)) : Pg(s + ri(9)); }; return [f(), f(), f(), f(), ri(27)]; },   // 無番和ねらい
  () => { const f = () => ({ k: 'g', t: ri(34) }); return [f(), f(), f(), rnd() < 0.3 ? f() : any(), ri(34)]; },   // 槓
  () => { const e = () => S3() + pick([1, 3, 5, 7]); return [Pg(e()), Pg(e()), Pg(e()), Pg(e()), e()]; },            // 全双刻
  () => { const f = () => { const s = S3(); return rnd() < 0.6 ? C(s) : Pg(s + ri(3)); }; return [f(), f(), f(), f(), S3() + ri(3)]; },     // 全小
  () => { const f = () => { const s = S3(); return rnd() < 0.6 ? C(s + 6) : Pg(s + 6 + ri(3)); }; return [f(), f(), f(), f(), S3() + 6 + ri(3)]; },  // 全大
  () => { const f = () => { const s = S3(); return rnd() < 0.6 ? C(s + 5 + ri(2)) : Pg(s + 5 + ri(4)); }; return [f(), f(), f(), f(), S3() + 5 + ri(4)]; }, // 大于五
  () => { const f = () => { const s = S3(); return rnd() < 0.6 ? C(s + ri(2)) : Pg(s + ri(4)); }; return [f(), f(), f(), f(), S3() + ri(4)]; },     // 小于五
  'chicken',
  () => { const s = S3(), b = ri(7); return [C(s + b), C(s + b), C(s + b), C(s + b), ri(34)]; },                     // 一色四同順
  () => { const f = () => ({ k: 'g', t: ri(34) }); return [f(), f(), f(), f(), ri(34)]; },                          // 四槓
];
function any() { const t = ri(34); return rnd() < 0.5 && t < 27 && t % 9 <= 6 ? C(t) : Pg(t); }
function genTpl() {
  let tf = pick(TPL), chicken = tf === 'chicken';
  if (chicken) tf = () => { const su = [0, 9, 18].sort(() => rnd() - 0.5); const f = (s) => rnd() < 0.75 ? C(s + ri(7)) : Pg(s + 1 + ri(7)); return [f(su[0]), f(su[1]), f(su[2]), f(pick(su)), 27 + ri(7)]; };
  const tp = tf();
  const pr = tp.pop(), sets = tp;
  const c = new Array(34).fill(0);
  for (const s of sets) { if (s.k === 'c') { if (s.t % 9 > 6 || s.t >= 27) return null; c[s.t]++; c[s.t + 1]++; c[s.t + 2]++; } else c[s.t] += s.k === 'p' ? 3 : 4; }
  c[pr] += 2;
  if (c.some(x => x > 4)) return null;
  const nm = chicken ? 2 + ri(3) : pick([0, 0, 1, 2, 3, 4]);
  const ord = sets.slice().sort(() => rnd() - 0.5);
  const melds = [], hand = [];
  ord.forEach((s, i) => {
    if (s.k === 'g') melds.push({ k: i < nm && rnd() < 0.7 ? 'kan' : 'ankan', t: s.t });
    else if (i < nm) melds.push({ k: s.k === 'c' ? 'chi' : 'pon', t: s.t });
    else if (s.k === 'c') hand.push(s.t, s.t + 1, s.t + 2); else hand.push(s.t, s.t, s.t);
  });
  hand.push(pr, pr);
  const win = hand.splice(ri(hand.length), 1)[0];
  return finish(melds, hand, win);
}
function genNine() {
  const s = S3(), hand = [0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 8].map(x => x + s);
  return finish([], hand, s + ri(9));
}
let n = 0;
while (n < N) {
  const r0 = rnd();
  const o = r0 < 0.45 ? genStd() : r0 < 0.6 ? genSpecial() : r0 < 0.98 ? genTpl() : genNine();
  if (!o) continue;
  const c = new Array(34).fill(0); for (const t of o.hand) c[t]++; c[o.win]++;
  for (const m of o.melds) { if (m.k === 'chi') { c[m.t]++; c[m.t + 1]++; c[m.t + 2]++; } else c[m.t] += m.k === 'pon' ? 3 : 4; }
  if (c.some(x => x > 4)) continue;
  if (rnd() < 0.15) { o.win = ri(34); c.fill(0); for (const t of o.hand) c[t]++; c[o.win]++; for (const m of o.melds) { if (m.k === 'chi') { c[m.t]++; c[m.t + 1]++; c[m.t + 2]++; } else c[m.t] += m.k === 'pon' ? 3 : 4; } if (c.some(x => x > 4)) continue; }
  process.stdout.write(JSON.stringify(o) + '\n'); n++;
}
