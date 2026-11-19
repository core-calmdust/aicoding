// 雀華：練習問題の生成と評価（役作り y・守備 d・点数 s・押し引き p）。gen-drills.js から使う。
// 役作り・点数：テンパイの取り方を「ロンしたときの点数 × 残り枚数」（ダマの期待値、役なしは0）で比べ、正解の形にそのレッスンの役がつくもの。
// 守備・押し引き：右の人（席1）のリーチに対して、牌ごとの安全度（現物 > 字牌3枚見え・壁 > スジ > …）で正解を決める。
// どの問題も、打牌ごとの解説（notes：正解／不正解のときの小町のことば）をここで作って drills.js に入れる。
'use strict';
const MJ = require('../engine.js');
let seed = 4242; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x80000000;
const ri = n => (rnd() * n) | 0, pick = a => a[ri(a.length)];
const suitOf = t => t < 27 ? (t / 9) | 0 : 3, num = t => t % 9 + 1;
const GUEST = [28, 29, 30];
const YJ = { riichi: '立直', pinfu: '平和', tanyao: 'タンヤオ', iipeikou: '一盃口', haku: '白', hatsu: '發', chun: '中', seat_wind: '自風', round_wind: '場風', chiitoi: '七対子', chanta: 'チャンタ', ittsu: '一気通貫', sanshoku: '三色同順', sanshoku_k: '三色同刻', toitoi: '対々和', sanankou: '三暗刻', shousangen: '小三元', honroutou: '混老頭', honitsu: '混一色', junchan: '純チャン', ryanpeikou: '二盃口', chinitsu: '清一色', dora: 'ドラ' };
const YE = { riichi: 'riichi', pinfu: 'pinfu', tanyao: 'all simples', iipeikou: 'pure double run', haku: 'White', hatsu: 'Green', chun: 'Red', seat_wind: 'seat wind', round_wind: 'round wind', chiitoi: 'seven pairs', chanta: 'outside hand', ittsu: 'pure straight', sanshoku: 'mixed triple run', sanshoku_k: 'triple pungs', toitoi: 'all pungs', sanankou: 'three concealed pungs', shousangen: 'little dragons', honroutou: 'all terminals & honours', honitsu: 'half flush', junchan: 'pure outside', ryanpeikou: 'twice pure double', chinitsu: 'full flush', dora: 'dora' };
const nmJ = t => t >= 27 ? '東南西北白發中'[t - 27] : (t % 9 + 1) + '萬筒索'[(t / 9) | 0];
const nmE = t => t >= 27 ? ['East', 'South', 'West', 'North', 'White', 'Green', 'Red'][t - 27] : (t % 9 + 1) + ' ' + ['characters', 'dots', 'bamboo'][(t / 9) | 0];
const listJ = ts => ts.map(nmJ).join('・'), listE = ts => ts.map(nmE).join(', ');

// ---------------------------------------------------------------- shapes
function builder() {
  const c = new Array(34).fill(0);
  const put = ts => { const add = {}; for (const t of ts) add[t] = (add[t] || 0) + 1; for (const t in add) if (c[t] + add[t] > 4) return false; for (const t of ts) c[t]++; return true; };
  return { c, put };
}
const suitT = () => ri(3) * 9;
const run = (b = suitT(), n = ri(7)) => [b + n, b + n + 1, b + n + 2];
const pung = () => { const t = rnd() < .8 ? suitT() + 1 + ri(7) : pick([...GUEST, 31, 32, 33]); return [t, t, t]; };
const set = () => rnd() < .75 ? run() : pung();
const pairN = () => { const t = suitT() + ri(9); return [t, t]; };
const pair = () => rnd() < .85 ? pairN() : (() => { const t = pick([...GUEST, 31, 32, 33]); return [t, t]; })();
const tailW = () => { const b = suitT(), n = 1 + ri(6), x = rnd() < .75 ? b + Math.max(0, Math.min(8, n + pick([-3, -2, 2, 3]))) : (rnd() < .5 ? pick(GUEST) : suitT() + ri(9)); return [b + n, b + n + 1, x]; };

// ---------------------------------------------------------------- the judge for a tenpai choice: points if it wins (dama, ron) × the tiles left
function shanten(c, m) { return MJ.shanten(c, m); }
function unseenOf(c, vis, x, d) { return Math.max(0, 4 - c[x] - (vis[x] || 0) - (x === d ? 1 : 0)); }
function options(c, melds, vis, ind, mt) {
  const m = melds.length, out = [];
  const sh0 = Math.min(...[...Array(34).keys()].filter(d => c[d]).map(d => { c[d]--; const s = shanten(c, m); c[d]++; return s; }));
  for (let d = 0; d < 34; d++) if (c[d]) {
    c[d]--; const sh = shanten(c, m);
    const W = []; let uk = 0, V = 0, yk = new Set(), yaku0 = null, pts0 = 0;
    for (let x = 0; x < 34; x++) if (c[x] < 4) { c[x]++; if (shanten(c, m) < sh) { const u = unseenOf(c, vis, x, d) + (c[x] - 1 >= 0 ? 0 : 0) - 0; const uu = Math.max(0, 4 - (c[x] - 1) - (vis[x] || 0) - (x === d ? 1 : 0)); W.push(x); uk += uu;
      if (sh === 0) { const closed = []; c.forEach((n, t) => { for (let k = 0; k < n; k++) closed.push(t); });
        const all = closed.concat(...mt.map(mm => mm.tiles));
        const r = MJ.evaluate({ closed, melds: mt.map(mm => ({ type: mm.type, t: mm.t, tiles: mm.tiles.map(t => t * 4) })), allTypes: all, win: x, tsumo: false, seatWind: 27, roundWind: 27, dealer: true, doraInd: [ind], aka: 0 });
        const p = r ? Math.ceil(r.base * 6 / 100) * 100 : 0; V += p * uu;
        if (r) { for (const [k] of r.list) yk.add(k); if (p > pts0) { pts0 = p; yaku0 = r.list.map(z => z[0]); } } } } c[x]--; }
    c[d]++;
    out.push({ d, sh, W, uk, V, yk, yaku: yaku0 || [], pts: pts0 });
  }
  return { out, sh0 };
}
const yakuTxt = (ys, ja) => ys.filter(k => k !== 'dora').map(k => ja ? YJ[k] || k : YE[k] || k).join(ja ? '・' : ', ');

// ---------------------------------------------------------------- 役作り・点数
const TARGET = { y1: 'pinfu', y2: 'iipeikou', y3: 'sanshoku', y4: 'ittsu', y5: 'honitsu', y6: 'chiitoi', y7: 'toitoi', s1: 'tanyao', s2: 'dora' };
function makeY(th) {
  for (let tries = 0; tries < 300; tries++) {
    const { c, put } = builder(); const melds = []; let ok = true;
    const P = f => { if (ok && !put(f())) ok = false; };
    if (th === 'y1') { P(run); P(run); P(run); P(pairN); P(tailW); }
    if (th === 'y2') { const r = run(); P(() => r); P(() => r); P(set); P(pair); P(tailW); }
    if (th === 'y3') { const n = ri(7), s = [0, 9, 18].sort(() => rnd() - .5); P(() => run(s[0], n)); P(() => run(s[1], n)); const b = s[2] + n, k = ri(3);
      P(() => [b, b + 1, b + 2].filter((_, i) => i !== k).concat([rnd() < .6 ? s[2] + Math.max(0, Math.min(8, n + pick([-2, -1, 3, 4]))) : suitT() + ri(9)])); P(set); P(pair); }
    if (th === 'y4') { const b = suitT(); P(() => run(b, 0)); P(() => run(b, 3)); const k = ri(3); P(() => [b + 6, b + 7, b + 8].filter((_, i) => i !== k).concat([rnd() < .6 ? b + 3 + ri(4) : suitT() + ri(9)])); P(set); P(pair); }
    if (th === 'y5') { // four sets in one suit and guest winds, one off-suit tile X and one more tile Z: throw X → a half flush (Z waits), throw Z → only X waits
      const b = suitT(); for (let k = 0; k < 4; k++) P(() => { const r = rnd(); if (r < .55) return run(b); if (r < .8) { const t = b + ri(9); return [t, t, t]; } const h = pick(GUEST); return [h, h, h]; });
      P(() => [(b + 9 + 9 * ri(2)) % 27 + ri(9)]); P(() => [rnd() < .75 ? b + ri(9) : pick(GUEST)]); }
    if (th === 'y6') { const ts = new Set(); while (ts.size < 8) ts.add(rnd() < .3 ? 27 + ri(7) : ri(27)); const a = [...ts]; for (let i = 0; i < 6; i++) P(() => [a[i], a[i]]); P(() => [a[6], a[7]]); }
    if (th === 'y7') { // two pons on the table (one a terminal or a guest wind: no all-simples), in hand a pung, two pairs and one tile beside a pair
      const p1 = pick([0, 8, 9, 17, 18, 26, ...GUEST]), p2 = suitT() + 1 + ri(7);
      if (p1 === p2) continue; melds.push({ type: 'pon', t: p1, tiles: [p1, p1, p1] }, { type: 'pon', t: p2, tiles: [p2, p2, p2] });
      put([p1, p1, p1, p2, p2, p2]);
      const A = pairN(), b = suitT(), n = 1 + ri(7); P(() => A); P(() => [b + n, b + n]); P(() => [b + n + (rnd() < .5 ? 1 : -1)]); P(() => { const t = suitT() + 1 + ri(7); return [t, t, t]; });
      // (the melded tiles are not in the hand: take them out again)
      if (ok) { c[p1] -= 3; c[p2] -= 3; } }
    if (th === 's1') { P(() => run(suitT(), 1 + ri(5))); P(() => run(suitT(), 1 + ri(5))); P(() => { const t = suitT() + 1 + ri(7); return [t, t]; }); P(() => run(suitT(), 1 + ri(5)));
      const b = suitT(), n = 2 + ri(5); P(() => [b + n, b + n + 1, rnd() < .5 ? b + (n > 4 ? 8 : 0) : pick([0, 8, 9, 17, 18, 26])]); }
    if (th === 's2') { P(run); P(run); P(pairN); P(set); P(tailW); }
    const tot = c.reduce((a, b) => a + b, 0) + melds.length * 3;
    if (!ok || tot !== 14 || c.some(x => x < 0 || x > 4)) continue;
    return { c, melds };
  }
  return null;
}
function rivers(c, avoid, dead, L0) {
  const used = c.slice(); for (const t of dead) used[t]++;
  const rv = [[], [], [], []], L = L0 ?? 3 + ri(3);
  for (let s = 0; s < 4; s++) for (let k = 0; k < L; k++) { for (let n = 0; n < 30; n++) { const x = rnd() < .5 ? 27 + ri(7) : ri(27); if (used[x] < 4 && !avoid.has(x)) { rv[s].push(x); used[x]++; break; } } }
  dead.forEach(t => { const s = 1 + ri(3); rv[s].splice(ri(rv[s].length + 1), 0, t); });
  return rv;
}
function evalY(th, h) {
  const { c, melds } = h, m = melds.length;
  if (c.some(x => x >= 4)) return null;
  if (MJ.shanten(c, m) === -1) return null;   // (ユーザー 2026-11-20: a hand that has already won offers ツモ — never a problem)
  const base = options(c, melds, new Array(34).fill(0), 0, melds);
  if (base.sh0 !== 0) return null;
  const ten = base.out.filter(o => o.sh === 0);
  if (ten.length < 2) return null;
  const avoid = new Set(); for (const o of ten) for (const w of o.W) avoid.add(w); for (let t = 0; t < 34; t++) if (c[t]) avoid.add(t);
  for (const mm of melds) avoid.add(mm.t);
  let dead = [];
  if (th === 'y6') { const ws = [...new Set(ten.flatMap(o => o.W))]; const t = pick(ws); for (let k = 0; k < 1 + ri(2); k++) dead.push(t); }
  const rv = rivers(c, avoid, dead, th === 'y6' ? 4 + ri(2) : 2 + ri(3));
  // the dora indicator: for s2 the indicator of a tile in hand (that the right answer keeps); otherwise none of the hand
  let ind = -1;
  if (th === 's2') { const inH = [...Array(27).keys()].filter(t => c[t] === 1); for (let k = 0; k < 40 && ind < 0; k++) { const d = pick(inH); const i = num(d) === 1 ? d + 8 : d - 1; if (!c[i] && !avoid.has(i)) ind = i; } }
  else for (let k = 0; k < 40; k++) { const t = ri(27), dr = MJ.doraOf(t); if (!c[t] && !c[dr] && !avoid.has(t) && !avoid.has(dr)) { ind = t; break; } }
  if (ind < 0) return null;
  const vis = new Array(34).fill(0); vis[ind]++; for (const r of rv) for (const t of r) vis[t]++;
  for (const mm of melds) vis[mm.t] += 0;   // (a pon's tiles are counted as the hand's own: c holds only the closed part, see below)
  const cAll = c.slice(); for (const mm of melds) cAll[mm.t] += 3;
  if (cAll.some((n, t) => n + vis[t] > 4)) return null;
  // own pons count as visible for the acceptance
  const vis2 = vis.slice(); for (const mm of melds) vis2[mm.t] += 3;
  const { out } = options(c, melds, vis2, ind, melds);
  const o = out.filter(x => x.sh === 0);
  const V1 = Math.max(...o.map(x => x.V)); if (!V1) return null;
  const B = o.filter(x => x.V === V1).map(x => x.d);
  if (B.length > 2 || B.some(t => t === 27 || t >= 31)) return null;
  const best = o.find(x => x.d === B[0]), rest = o.filter(x => !B.includes(x.d)).sort((a, b) => b.V - a.V), alt = rest[0];
  if (!alt) return null;
  const tgt = TARGET[th];
  const hasT = x => th === 's2' ? x.yaku.includes('dora') : x.yaku.includes(tgt);
  if (!hasT(best) || (th !== 'y6' && hasT(alt))) return null;
  if (th === 's2' && !(best.yaku.filter(k => k !== 'dora').length && alt.yaku.filter(k => k !== 'dora').length)) return null;   // (both have a yaku: the dora is the difference)
  if (V1 < alt.V * 1.25) return null;
  if (th !== 'y6' && { y1: 1, y2: 1 }[th] && best.yaku.length > 4) return null;
  const wider = o.filter(x => x.uk > best.uk).length;   // tempting: a wider wait with less in it
  const D = wider * 1.2 + (alt.V / V1) * 2 + o.length * .3 + (alt.uk >= best.uk ? 1 : 0);
  const fun = Math.round(30 * Math.min(1, (V1 - alt.V) / (.5 * V1)) + (o.length >= 3 ? 25 : 18) + 20 + 15 + (wider ? 10 : 6));
  // the guide's words for each discard
  const notes = {};
  const say = x => {
    const ys = yakuTxt(x.yaku, true), ye = yakuTxt(x.yaku, false);
    return { ja: x.pts ? `${nmJ(x.d)}を切ると、待ちは${listJ(x.W)}（${x.uk}枚）。${ys}${x.yaku.includes('dora') ? '' : ''}で${x.pts}点` : `${nmJ(x.d)}を切ると、待ちは${listJ(x.W)}（${x.uk}枚）だけど、役がなくてロンできないんです`,
      en: x.pts ? `discarding the ${nmE(x.d)}, you wait on ${listE(x.W)} (${x.uk} tiles) for ${ye}: ${x.pts} points` : `discarding the ${nmE(x.d)}, you wait on ${listE(x.W)} (${x.uk} tiles) with no yaku — no ron` };
  };
  const tJ = th === 's2' ? 'ドラ' : YJ[tgt], tE = th === 's2' ? 'the dora' : YE[tgt];
  for (const x of o) { const s = say(x);
    notes[x.d] = B.includes(x.d) ? { ja: `正解！ ${s.ja}♪ ${alt ? say(alt).ja + '。' : ''}`, en: `Right! ${s.en[0].toUpperCase() + s.en.slice(1)}. ${alt ? say(alt).en[0].toUpperCase() + say(alt).en.slice(1) + '.' : ''}` }
      : { ja: `${s.ja}…。${tJ}がつく形を探してみて！`, en: `${s.en[0].toUpperCase() + s.en.slice(1)}. Look for the shape with ${tE}!` }; }
  notes['*'] = { ja: 'その牌だとテンパイがくずれちゃいます…！ テンパイのまま、点数が高くなる1枚を！', en: 'That breaks your tenpai. Stay tenpai and pick the higher-scoring discard.' };
  return { c, ind, B, D, fun, rv, melds, notes, sh: 0, U1: best.uk, U2: alt.uk };
}

// ---------------------------------------------------------------- 守備・押し引き: a riichi on the right (seat 1)
// how safe a tile is against the riichi: 0 genbutsu · 1 honour with 3 out / no-chance · 2 suji 1-9 · 3 suji 2-8, honour with 2 out · 4 lone 1-9 / honour · 5 the rest
function safety(t, rr, vis, c) {
  if (rr.has(t)) return { k: 0, why: 'gen' };
  const seen = n => (vis[n] || 0) + c[n];
  if (t >= 27) { const s = seen(t); return s >= 3 ? { k: 1, why: 'hon3' } : s === 2 ? { k: 3, why: 'hon2' } : { k: 4, why: 'hon' }; }
  const s = suitOf(t), n = num(t), at = k => s * 9 + k - 1;
  // no-chance: every two-sided shape that waits on t needs a tile whose four copies are all out
  const shapes = []; if (n <= 7) shapes.push([at(n + 1), at(n + 2)]); if (n >= 3) shapes.push([at(n - 2), at(n - 1)]);
  if (shapes.every(sh => sh.some(x => seen(x) >= 4))) return { k: 1, why: 'kabe', src: [...new Set(shapes.flatMap(sh => sh.filter(x => seen(x) >= 4)))] };
  const suji = n <= 3 ? rr.has(at(n + 3)) : n >= 7 ? rr.has(at(n - 3)) : rr.has(at(n - 3)) && rr.has(at(n + 3));
  const src = [n - 3, n + 3].filter(k => k >= 1 && k <= 9 && rr.has(at(k))).map(at);
  if (suji) return n === 1 || n === 9 ? { k: 2, why: 'suji', src } : { k: 3, why: 'suji', src };
  return n === 1 || n === 9 ? { k: 4, why: 'term' } : { k: 5, why: 'mid' };
}
const WHY = {
  gen: ['リーチした人の河にある「現物」なので、ぜったい当たりません', 'is in the riichi player\'s river (genbutsu): it can\'t deal in'],
  hon3: ['場に3枚見えてる字牌なので、ほとんど当たりません', 'is an honour with three out: almost safe'],
  kabe: ['壁があって両面待ちにならない「ノーチャンス」の牌です', 'is a no-chance tile: the wall rules out a two-sided wait'],
  suji: ['スジの牌なので、両面待ちには当たりにくいんです', 'is suji: a two-sided wait on it would be furiten'],
  hon2: ['2枚見えてる字牌です', 'is an honour with two out'],
  hon: ['まだ見えてない字牌…単騎やシャンポンで当たるかも', 'is an honour nobody has thrown — it can still hit a pair wait'],
  term: ['スジじゃない端の牌…ちょっと危ないです', 'is a non-suji terminal — a bit dangerous'],
  mid: ['スジでも現物でもない真ん中の牌、いちばん危ないんです', 'is a middle tile with no suji: the most dangerous'],
};
function makeD(th) {
  for (let tries = 0; tries < 300; tries++) {
    const { c, put } = builder(); let ok = true; const P = ts => { if (ok && !put(ts)) ok = false; };
    if (th === 'p1') { P(run()); P(run()); P(set()); P(pairN()); P(tailW()); }
    else { // a slow hand: two or more away, a few connected bits
      const k = ri(2); for (let i = 0; i < k; i++) P(run());
      while (c.reduce((a, b) => a + b, 0) < 14) { const r = rnd(); P(r < .3 ? (() => { const b = suitT(), n = ri(8); return [b + n, b + n + 1].filter(x => x % 9 !== 0 || n < 8); })() : r < .45 ? pairN() : r < .65 ? [27 + ri(7)] : [suitT() + ri(9)]); if (!ok) break; }
    }
    if (!ok || c.reduce((a, b) => a + b, 0) !== 14) continue;
    return { c, melds: [] };
  }
  return null;
}
function evalD(th, h) {
  const { c } = h;
  if (c.some(x => x >= 4)) return null;
  if (MJ.shanten(c, 0) === -1) return null;
  const sh = Math.min(...[...Array(34).keys()].filter(d => c[d]).map(d => { c[d]--; const s = MJ.shanten(c, 0); c[d]++; return s; }));
  if (th === 'p1' ? sh !== 0 : sh < 2) return null;
  // the riichi river (seat 1): 6–9 tiles; the concept of the lesson is planted in it
  const used = c.slice(); const rr = []; const addR = t => { if (used[t] < 4) { rr.push(t); used[t]++; return true; } return false; };
  const hand = [...Array(34).keys()].filter(t => c[t]);
  const nT = 6 + ri(4);
  if (th === 'd1' || th === 'd5' || th === 'p2') { const g = pick(hand); addR(g); if (th === 'd5' && rnd() < .6) addR(pick(hand)); }
  if (th === 'd2') { const nums = hand.filter(t => t < 27); const t = pick(nums); const n = num(t), s = suitOf(t) * 9; if (n <= 3) addR(s + n + 2); else if (n >= 7) addR(s + n - 4); else { addR(s + n - 4); addR(s + n + 2); } }
  const others = [[], [], []];
  if (th === 'd3') { const hs = hand.filter(t => t >= 27 && c[t] === 1); if (!hs.length) return null; { const t = pick(hs); for (let k = 0; k < 2; k++) others[ri(3)].push(t), used[t]++; } }
  if (th === 'd4') { const nums = hand.filter(t => t < 27 && (num(t) <= 2 || num(t) >= 8) && c[t] === 1); if (!nums.length) return null; const t = pick(nums), n = num(t), s = suitOf(t) * 9;
    const w = n <= 2 ? s + n : s + n - 2; const need = 4 - c[w]; if (need < 0) return null; for (let k = 0; k < need; k++) others[ri(3)].push(w); used[w] += need; if (used[w] > 4) return null; }
  // the rest of the river: plain early discards, kept away from making the hand's tiles safe by chance
  let guard = 0;
  while (rr.length < nT && guard++ < 200) { const x = rnd() < .45 ? 27 + ri(7) : ri(27); if (c[x] && !(th === 'd5' || th === 'p2')) continue; if (c[x]) continue; addR(x); }
  for (let s = 0; s < 3; s++) { const L = 5 + ri(4); let g2 = 0; while (others[s].length < L && g2++ < 200) { const x = rnd() < .45 ? 27 + ri(7) : ri(27); if (used[x] >= 4 || c[x]) continue; others[s].push(x); used[x]++; } }
  if (used.some(x => x > 4)) return null;
  const rset = new Set(rr), vis = new Array(34).fill(0);
  for (const t of rr) vis[t]++; for (const o of others) for (const t of o) vis[t]++;
  let ind = -1; for (let k = 0; k < 40; k++) { const t = 27 + ri(7); if (!c[t] && used[t] < 4) { ind = t; break; } } if (ind < 0) return null; vis[ind]++;
  if (vis.some((v, t) => v + c[t] > 4)) return null;
  const S = hand.map(t => Object.assign({ t }, safety(t, rset, vis, c)));
  if (th === 'p1') { // push: the tenpai discard is not safe, but the wait is good — riichi and fight
    const ten = []; for (const t of hand) { c[t]--; if (MJ.shanten(c, 0) === 0) { let uk = 0; const W = []; for (let x = 0; x < 34; x++) if (c[x] < 4) { c[x]++; if (MJ.shanten(c, 0) === -1) { W.push(x); uk += Math.max(0, 4 - (c[x] - 1) - vis[x] - (x === t ? 1 : 0)); } c[x]--; } if (!W.some(w => w === t || rset.has(w))) ten.push({ t, uk, W }); } c[t]++; }
    if (!ten.length) return null;
    const U = Math.max(...ten.map(x => x.uk)), B = ten.filter(x => x.uk === U).map(x => x.t);
    if (U < 6 || B.length > 2 || B.some(t => t === 27 || t >= 31)) return null;
    if (!B.every(t => S.find(z => z.t === t).k >= 3)) return null;   // (the tile to push is a dangerous one)
    if (!S.some(z => z.k === 0) && rnd() < .7) return null;   // (usually a genbutsu is there to tempt a fold)
    const D = (S.filter(z => z.k === 0).length ? 1 : 0) + ten.length * .6 + (U < 8 ? 1 : 0) + B.filter(t => S.find(z => z.t === t).k === 5).length;
    const notes = {}; const bt = ten.find(x => x.t === B[0]);
    for (const z of S) { const tt = ten.find(x => x.t === z.t);
      notes[z.t] = B.includes(z.t) ? { ja: `勝負っ！ ${nmJ(z.t)}を切ってリーチ、待ちは${listJ(bt.W)}（${bt.uk}枚）。良い待ちのテンパイは押す価値ありです♪`, en: `Game on! Discard the ${nmE(z.t)} and riichi, waiting on ${listE(bt.W)} (${bt.uk} tiles). A good tenpai is worth pushing.` }
        : tt ? { ja: `${nmJ(z.t)}でもテンパイだけど、待ちが${tt.uk}枚…。もっと良い待ちで勝負しましょう！`, en: `The ${nmE(z.t)} is tenpai too, but only ${tt.uk} tiles. Fight with the better wait!` }
        : { ja: `${nmJ(z.t)}を切ると、せっかくのテンパイがくずれちゃいます。両面テンパイなら、リーチで勝負ですよ！`, en: `The ${nmE(z.t)} breaks your tenpai. With a two-sided tenpai, riichi and fight!` }; }
    return { c, ind, B, D, fun: 90 + Math.min(10, ten.length * 3), rr, others, notes, riichiAns: true, sh: 0, U1: U, U2: 0 };
  }
  const k0 = Math.min(...S.map(z => z.k)), B = S.filter(z => z.k === k0).map(z => z.t);
  const WANT = { d1: ['gen'], d2: ['suji'], d3: ['hon3'], d4: ['kabe'], d5: ['gen'], p2: ['gen'] }[th];
  if (!B.every(t => WANT.includes(S.find(z => z.t === t).why))) return null;
  if (B.length > 2) return null;
  // tempting: the next tier is close (d5: several safe-looking tiles), and for p2 the efficient discard is a dangerous one
  const tiers = new Set(S.map(z => z.k));
  if (th === 'd5' && S.filter(z => z.k <= 3).length < 3) return null;
  if (th === 'p2') { const eff = []; for (const t of hand) { c[t]--; eff.push([t, MJ.shanten(c, 0)]); c[t]++; } const best = Math.min(...eff.map(x => x[1])); if (eff.filter(x => x[1] === best).every(x => B.includes(x[0]))) return null; }
  const close = S.filter(z => z.k === k0 + 1 || z.k === k0 + 2).length;
  const D = close * .8 + tiers.size * .4 + (S.filter(z => z.k >= 4).length < 4 ? 1 : 0);
  const fun = Math.round(30 + (close ? 25 : 15) + 20 + 15 + Math.min(10, tiers.size * 2.5));
  const notes = {};
  for (const z of S) { const w = WHY[z.why].slice();
    if (z.why === 'suji') w[0] = `リーチの人が${listJ(z.src)}を切っているので「スジ」。両面待ちには当たりにくいんです`, w[1] = `is suji of the ${listE(z.src)} in the riichi river: a two-sided wait on it would be furiten`;
    if (z.why === 'kabe') w[0] = `${listJ(z.src)}が4枚とも見えている「壁」の外側で、両面待ちにならないノーチャンスの牌です`, w[1] = `is beyond the wall of ${listE(z.src)} (all four out): no two-sided wait can use it`;
    notes[z.t] = B.includes(z.t) ? { ja: `正解です！ ${nmJ(z.t)}は${w[0]}♪`, en: `Right! The ${nmE(z.t)} ${w[1]}.` }
      : { ja: `${nmJ(z.t)}は${w[0]}…。もっと安全な牌がありますよ！`, en: `The ${nmE(z.t)} ${w[1]}. There's a safer tile!` }; }
  return { c, ind, B, D, fun, rr, others, notes, sh, U1: 0, U2: 0 };
}
module.exports = { TH: ['y1', 'y2', 'y3', 'y4', 'y5', 'y6', 'y7', 's1', 's2', 'd1', 'd2', 'd3', 'd4', 'd5', 'p1', 'p2'],
  make: th => (th[0] === 'y' || th[0] === 's') ? makeY(th) : makeD(th),
  evaluate: (th, h) => (th[0] === 'y' || th[0] === 's') ? evalY(th, h) : evalD(th, h) };
