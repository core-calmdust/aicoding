// 雀華：レッスンの練習問題（ドリル）の生成と評価（ユーザー 2026-11-19「1レッスンあたりの内容が薄い。問題が続く感じに、難易度の変化をつけて」
// 「他のゲームでやっている、評価ツールで良い問題か判定する対応を活かせる？」）。
//   node mahjong/tools/gen-drills.js            … 候補を作って評価し、各レッスン6問（やさしい2・ふつう2・むずかしい2）を mahjong/drills.js に書く
//   node mahjong/tools/gen-drills.js --report   … 書き出さずに、選ばれた問題と点数・難易度を表示
// 評価（fun 0〜100、70以上だけ採用。候補は必要数の3倍以上）：
//   正解のはっきりさ 30（2番目に良い打牌との受け入れ枚数の差が2枚以上は必須）・迷う選択肢 25（受け入れが7割以上の別の打牌がある）・
//   テーマ 20（そのレッスンの考え方で正解が決まる：例 e1 は正解がすべて孤立した客風）・自然さ 15（字牌・対子・1色に偏りすぎない）・形の多彩さ 10
// 難易度 D：迷う選択肢の数と2番目との近さ（e5 は近さ重視、e6 はテンパイにする牌が孤立していないほど難しい）。候補を D で3つに分ける。
'use strict';
const MJ = require('../engine.js');
const fs = require('fs'), path = require('path');
const REPORT = process.argv.includes('--report');
let seed = 20261119; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x80000000;
const ri = n => (rnd() * n) | 0, pick = a => a[ri(a.length)];
const suitOf = t => t < 27 ? (t / 9) | 0 : 3, num = t => t % 9 + 1;
const GUEST = [28, 29, 30];   // 南・西・北（自分は東家・東場：東と三元牌は役牌）
const N = t => MJ.NAMES[t];

// ---------------------------------------------------------------- hands built from shapes
function makeHand(theme) {
  for (let tries = 0; tries < 200; tries++) {
    const c = new Array(34).fill(0), tiles = [];
    const put = ts => { const add = {}; for (const t of ts) add[t] = (add[t] || 0) + 1; for (const t in add) if (c[t] + add[t] > 4) return false; for (const t of ts) { c[t]++; tiles.push(t); } return true; };
    const suitT = () => ri(3) * 9;
    const run = () => { const b = suitT(), n = ri(7); return [b + n, b + n + 1, b + n + 2]; };
    const pung = () => { const t = rnd() < .8 ? suitT() + 1 + ri(7) : pick([...GUEST, 31, 32, 33, 27]); return [t, t, t]; };
    const ryan = () => { const b = suitT(), n = 1 + ri(6); return [b + n, b + n + 1]; };
    const kan = () => { const b = suitT(), n = ri(7); return [b + n, b + n + 2]; };
    const pen = () => { const b = suitT(); return rnd() < .5 ? [b, b + 1] : [b + 7, b + 8]; };
    const pair = () => { const t = rnd() < .85 ? suitT() + ri(9) : pick([...GUEST, 31]); return [t, t]; };
    const isoTerm = () => [suitT() + (rnd() < .5 ? 0 : 8)], isoMid = () => [suitT() + 2 + ri(5)], isoHon = () => [pick(GUEST)];
    const need = [];
    if (theme === 'e1') { need.push(isoHon); if (rnd() < .6) need.push(isoHon); if (rnd() < .5) need.push(isoTerm); }
    if (theme === 'e2') { need.push(isoTerm, isoMid); if (rnd() < .4) need.push(isoTerm); }
    if (theme === 'e3') { need.push(kan, ryan, ryan); if (rnd() < .5) need.push(kan); }
    if (theme === 'e4') { need.push(pen, ryan, ryan); if (rnd() < .4) need.push(kan); }
    if (theme === 'e5') { need.push(ryan, rnd() < .5 ? kan : pair, pair); }
    if (theme === 'e6') { need.push(ryan, pair); }
    let ok = true;
    for (const f of need) if (!put(f())) { ok = false; break; }
    if (!ok) continue;
    const pool = theme === 'e5' || theme === 'e6' ? [run, run, run, ryan, kan, pair, pung, isoTerm, isoMid] : [run, run, run, ryan, pair, pung, kan];
    for (let k = 0; k < 30 && tiles.length < 14; k++) { const f = pick(pool), ts = f(); if (tiles.length + ts.length <= 14) put(ts); }
    if (tiles.length !== 14) continue;
    return { c, tiles };
  }
  return null;
}

// ---------------------------------------------------------------- the judge (the same rule as the lessons: shanten, then the unseen tiles that lower it)
function table(c, vis) {
  const out = [];
  for (let d = 0; d < 34; d++) if (c[d]) {
    c[d]--;
    const sh = MJ.shanten(c, 0); let uk = 0, kinds = 0;
    for (let x = 0; x < 34; x++) if (c[x] < 4) { c[x]++; if (MJ.shanten(c, 0) < sh) { const u = Math.max(0, 4 - (c[x] - 1) - (vis[x] || 0) - (x === d ? 1 : 0)); uk += u; kinds++; } c[x]--; }
    c[d]++;
    out.push({ d, sh, uk, kinds });
  }
  return out;
}
const iso = (c, t) => c[t] === 1 && (t >= 27 || [-2, -1, 1, 2].every(k => { const u = t + k; return u < 0 || u >= 27 || suitOf(u) !== suitOf(t) || !c[u]; }));
const near = (c, t) => [-2, -1, 1, 2].filter(k => { const u = t + k; return u >= 0 && u < 27 && suitOf(u) === suitOf(t) && c[u]; }).map(k => t + k);
const inKan = (c, t) => { if (t >= 27 || c[t] !== 1) return false; const n = near(c, t); return n.length === 1 && Math.abs(n[0] - t) === 2 && c[n[0]] === 1 && near(c, n[0]).length === 1; };   // (a clean two-tile gap)
const inPen = (c, t) => { if (t >= 27 || c[t] !== 1) return false; const n = near(c, t); if (n.length !== 1 || Math.abs(n[0] - t) !== 1 || c[n[0]] !== 1) return false; const lo = Math.min(t, n[0]); return (num(lo) === 1 || num(lo) === 8) && near(c, n[0]).length === 1; };
const hasRyan = c => { for (let s = 0; s < 3; s++) for (let n = 1; n <= 6; n++) { const a = s * 9 + n; if (c[a] && c[a + 1] && !c[a - 1] && !c[a + 2]) return true; } return false; };

function evaluate(theme, h) {
  const c = h.c;
  // the dora indicator: a number tile none of whose own copy or dora is in the hand (the dora must not decide the answer)
  let ind = -1; for (let k = 0; k < 40; k++) { const t = ri(27); const dr = MJ.doraOf(t); if (!c[t] && !c[dr]) { ind = t; break; } }
  if (ind < 0) return null;
  const vis = new Array(34).fill(0); vis[ind] = 1;
  const tb = table(c, vis), sh = Math.min(...tb.map(x => x.sh)), at = tb.filter(x => x.sh === sh);
  const U1 = Math.max(...at.map(x => x.uk)), B = theme === 'e6' ? at.map(x => x.d) : at.filter(x => x.uk === U1).map(x => x.d);
  const rest = theme === 'e6' ? tb.filter(x => x.sh > sh) : at.filter(x => x.uk < U1);
  const U2 = rest.length ? Math.max(...rest.map(x => x.uk)) : 0;
  // no seven-pairs: the normal hand must be what counts
  { const cc = c.slice(); cc[B[0]]--; if (MJ.shantenNormal(cc, 0) !== sh || MJ.shantenChiitoi(cc) <= sh) return null; }
  // never a value tile (East, dragons) or a dora as the answer
  if (B.some(t => t === 27 || t >= 31)) return null;
  const isos = [...Array(34).keys()].filter(t => iso(c, t));
  // the theme decides the answer
  let fit = false, D = 0;
  const plaus = rest.filter(x => x.uk >= .7 * U1 && (theme !== 'e6')).length;
  if (theme === 'e1') { fit = sh >= 1 && sh <= 2 && B.every(t => GUEST.includes(t) && iso(c, t)); D = isos.filter(t => !B.includes(t)).length * 1.2 + plaus * .6 + U2 / Math.max(1, U1); }
  if (theme === 'e2') { fit = sh >= 1 && sh <= 2 && B.every(t => t < 27 && (num(t) === 1 || num(t) === 9) && iso(c, t)) && isos.some(t => t < 27 && num(t) >= 3 && num(t) <= 7) && !isos.some(t => t >= 27);
    D = isos.filter(t => !B.includes(t)).length * .8 + plaus * .6 + U2 / Math.max(1, U1); }
  if (theme === 'e3') { fit = sh >= 1 && sh <= 2 && B.every(t => inKan(c, t)) && hasRyan(c) && !isos.length; D = plaus * .8 + 2 * U2 / Math.max(1, U1); }
  if (theme === 'e4') { fit = sh >= 1 && sh <= 2 && B.every(t => inPen(c, t)) && hasRyan(c) && !isos.length; D = plaus * .8 + 2 * U2 / Math.max(1, U1); }
  if (theme === 'e5') { fit = sh === 1 && at.length >= 3 && B.every(t => !iso(c, t)) && B.length <= 2; D = 3 * U2 / Math.max(1, U1) + plaus * .5; }
  if (theme === 'e6') { fit = sh === 0 && B.length <= 3 && tb.filter(x => x.sh === 1).length >= 6; const herr = isos.filter(t => !B.includes(t)).length;
    D = 2 * B.filter(t => !iso(c, t)).length / B.length + herr * .8 + (B.length === 1 ? 1 : 0) + (B.some(t => c[t] >= 2) ? 1 : 0) + tb.filter(x => x.sh === 1 && x.uk >= 30).length / 10; }
  if (!fit) return null;
  // clarity: the best is clearly best (2+ tiles over the next — for tenpai, tenpai vs not)
  if (theme !== 'e6' && U1 - U2 < 2) return null;
  const clarity = theme === 'e6' ? 30 : 30 * Math.min(1, (U1 - U2) / Math.max(2, .3 * U1));
  const choice = theme === 'e6' ? (B.every(t => iso(c, t)) ? 12 : 25) : plaus === 0 ? 8 : plaus === 1 ? 18 : 25;
  // natural
  let nat = 15; const hon = c.slice(27).reduce((a, b) => a + b, 0), pairs = c.filter(x => x >= 2).length, quads = c.filter(x => x === 4).length;
  const perSuit = [0, 1, 2].map(s => c.slice(s * 9, s * 9 + 9).reduce((a, b) => a + b, 0));
  if (quads) return null; if (hon > 4) nat -= 6; if (pairs > 3) nat -= 6; if (quads) nat -= 10; if (Math.max(...perSuit) > 8) nat -= 5; if (isos.length > 4) nat -= 5; if (perSuit.filter(x => x).length < 2) nat -= 8;
  // shapes: runs, pairs, two-sided, gaps…
  let kinds = 0; { const cc = c; if (hasRyan(cc)) kinds++; if (pairs) kinds++; if ([...Array(27).keys()].some(t => inKan(cc, t))) kinds++; if ([...Array(27).keys()].some(t => cc[t] && cc[t + 1] && cc[t + 2] && suitOf(t) === suitOf(t + 2))) kinds++; }
  const shape = Math.min(10, kinds * 3);
  const fun = Math.round(clarity + choice + 20 + Math.max(0, nat) + shape);
  return { c, ind, sh, B, U1, U2, plaus, D, fun, tb };
}

// ---------------------------------------------------------------- 待ち (w1–w6): tenpai choices, with rivers on the table
// the wait's shape for one winning tile w of a 13-tile hand c13: ryanmen / kanchan / penchan / shanpon / tanki (any reading)
function waitTypes(c13, w) {
  const c = c13.slice(); c[w]++; const out = new Set();
  for (const d of MJ.decompose(c)) {
    if (d.pair === w) out.add('tanki');
    for (const g of d.groups) {
      if (g.k === 'k' && g.t === w && c13[w] >= 2) out.add('shanpon');
      if (g.k === 's' && w >= g.t && w <= g.t + 2) { const n = num(g.t);
        if (w === g.t + 1) out.add('kanchan'); else if ((w === g.t + 2 && n === 1) || (w === g.t && n === 7)) out.add('penchan'); else out.add('ryanmen'); }
    }
  }
  return out;
}
function waitShape(c13) {
  const W = []; for (let t = 0; t < 34; t++) if (c13[t] < 4) { c13[t]++; if (MJ.shanten(c13, 0) === -1) W.push(t); c13[t]--; }
  const ty = W.map(w => waitTypes(c13, w));
  let kind = W.length >= 3 ? 'multi' : W.length === 2 ? (ty.every(x => x.has('ryanmen')) && W[1] - W[0] === 3 && suitOf(W[0]) === suitOf(W[1]) ? 'ryanmen' : ty.every(x => x.has('shanpon')) ? 'shanpon' : 'two')
    : W.length === 1 ? ([...ty[0]].find(k => ['kanchan', 'penchan', 'tanki'].includes(k)) || 'one') : 'none';
  return { W, kind };
}
function makeW(theme) {
  for (let tries = 0; tries < 300; tries++) {
    const c = new Array(34).fill(0);
    const put = ts => { const add = {}; for (const t of ts) add[t] = (add[t] || 0) + 1; for (const t in add) if (c[t] + add[t] > 4) return false; for (const t of ts) c[t]++; return true; };
    const suitT = () => ri(3) * 9;
    const run = () => { const b = suitT(), n = ri(7); return [b + n, b + n + 1, b + n + 2]; };
    const pung = () => { const t = rnd() < .8 ? suitT() + 1 + ri(7) : pick([...GUEST, 31, 32, 33]); return [t, t, t]; };
    const set = () => rnd() < .78 ? run() : pung();
    const pair = () => { const t = rnd() < .85 ? suitT() + ri(9) : pick([...GUEST, 31, 32, 33]); return [t, t]; };
    const parts = [];
    if (theme === 'w1' || theme === 'w5') { const b = suitT(), n = 1 + ri(6), x = rnd() < .75 ? b + Math.max(0, Math.min(8, n + pick([-3, -2, 2, 3]))) : (rnd() < .5 ? pick(GUEST) : suitT() + ri(9)); parts.push(set, set, set, pair, () => [b + n, b + n + 1, x]); }
    if (theme === 'w2') { if (rnd() < .5) { const b = suitT(), n = ri(5); parts.push(set, set, set, pair, () => [b + n, b + n + 2, b + n + 4]); }
      else parts.push(set, set, set, set, () => [rnd() < .5 ? pick([...GUEST, 31, 32, 33]) : suitT() + ri(9), rnd() < .5 ? pick([...GUEST, 31, 32, 33]) : suitT() + ri(9)]); }
    if (theme === 'w3') { const b = suitT(), n = 1 + ri(7), A = pair(); parts.push(set, set, set, () => A, () => [b + n, b + n], () => [b + n + (rnd() < .5 ? 1 : -1)]); }
    if (theme === 'w4') { const b = suitT(), L = 6, ts = []; let n = ri(4); for (let k = 0; k < L; k++) { ts.push(b + Math.min(8, n)); if (rnd() < .7) n++; } parts.push(set, set, pair, () => ts); }
    if (theme === 'w6') { const two = () => { const b = suitT(), n = 1 + ri(6); return rnd() < .8 ? [b + n, b + n + 1] : [b + n - 1, b + n + 1]; }; parts.push(set, set, pair, two, two, two); }
    let ok = true; for (const f of parts) if (!put(f())) { ok = false; break; }
    if (!ok || c.reduce((a, b) => a + b, 0) !== 14) continue;
    return { c };
  }
  return null;
}
// rivers: a few early discards for each seat (honours and far-off numbers), plus `dead` copies of the tiles that matter
function makeRivers(c, avoid, dead, own) {
  const used = c.slice(); for (const t of dead) used[t]++;
  const rv = [[], [], [], []], L = 4 + ri(3);
  const ok = t => used[t] < 4 && !avoid.has(t);
  for (let s = 0; s < 4; s++) for (let k = 0; k < L; k++) {
    let t = -1; for (let n = 0; n < 30; n++) { const x = rnd() < .45 ? 27 + ri(7) : ri(27); if (ok(x)) { t = x; break; } }
    if (t >= 0) { rv[s].push(t); used[t]++; }
  }
  dead.forEach((t, i) => { const s = own != null && i === 0 ? own : 1 + ri(3); rv[s].splice(ri(rv[s].length + 1), 0, t); });
  return rv;
}
function evaluateW(theme, h) {
  const c = h.c;
  // the first look: the tenpai options without any river (what the shape alone says)
  const vis0 = new Array(34).fill(0);
  const opts = (vis, shTarget) => table(c, vis).filter(x => x.sh === shTarget).map(x => { const cc = c.slice(); cc[x.d]--; return Object.assign(x, shTarget === 0 ? waitShape(cc) : { W: [], kind: '' }); });
  const shAll = Math.min(...table(c, vis0).map(x => x.sh)), shT = theme === 'w6' ? 1 : 0;
  if (shAll !== shT) return null;
  const o0 = opts(vis0, shT);
  if (o0.length < 2) return null;
  // what lies on the table
  let dead = [], own = null, avoid = new Set();
  for (const o of o0) for (const w of o.W) { avoid.add(w); }
  for (let t = 0; t < 34; t++) if (c[t]) avoid.add(t);
  if (theme === 'w2') { const ws = [...new Set(o0.flatMap(o => o.W))]; const t = pick(ws), k = 1 + ri(Math.min(3, 4 - c[t])); for (let i = 0; i < k; i++) dead.push(t); }
  if (theme === 'w6') { // the waits of one two-tile shape (both of them, up to the copies left)
    const shapes = []; for (let s = 0; s < 3; s++) for (let n = 1; n <= 7; n++) { const a = s * 9 + n - 1; if (n <= 8 && c[a] && c[a + 1]) shapes.push([a - 1, a + 2].filter(x => x >= s * 9 && x < s * 9 + 9)); }
    if (!shapes.length) return null; const ws = pick(shapes); for (const t of ws) { const k = Math.min(4 - c[t], 1 + ri(3)); for (let i = 0; i < k; i++) dead.push(t); } }
  if (theme === 'w5') { const best0 = o0.slice().sort((a, b) => b.uk - a.uk)[0]; if (!best0.W.length) return null; dead.push(pick(best0.W)); own = 0; }
  if (dead.some(t => c[t] + dead.filter(x => x === t).length > 4)) return null;
  const rv = makeRivers(c, avoid, dead, own);
  let ind = -1; for (let k = 0; k < 40; k++) { const t = ri(27), dr = MJ.doraOf(t); if (!c[t] && !c[dr] && !avoid.has(t) && !avoid.has(dr)) { ind = t; break; } }
  if (ind < 0) return null;
  const vis = new Array(34).fill(0); vis[ind]++; for (const r of rv) for (const t of r) vis[t]++;
  if (vis.some((v, t) => v + c[t] > 4)) return null;
  const o = opts(vis, shT), ownSet = new Set(rv[0]);
  for (const x of o) x.furi = shT === 0 && x.W.some(w => ownSet.has(w) || w === x.d);   // (waiting on the tile just thrown is furiten too)
  const live = o.filter(x => !x.furi);
  if (!live.length) return null;
  const U1 = Math.max(...live.map(x => x.uk)), B = live.filter(x => x.uk === U1).map(x => x.d);
  const rest = o.filter(x => !B.includes(x.d)), U2 = rest.length ? Math.max(...rest.map(x => x.furi ? -1 : x.uk)) : 0;
  if (B.some(t => t === 27 || t >= 31)) return null;   // (never throw a value tile as the answer)
  { const cc = c.slice(); cc[B[0]]--; if (MJ.shantenChiitoi(cc) <= shT && MJ.shantenNormal(cc, 0) !== shT) return null; }
  const bo = o.find(x => x.d === B[0]);
  const naive = o0.slice().sort((a, b) => b.uk - a.uk)[0];
  let fit = false, D = 0;
  const kinds = new Set(o.map(x => x.kind));
  if (theme === 'w1') { fit = bo.kind === 'ryanmen' && o.some(x => ['kanchan', 'penchan', 'tanki'].includes(x.kind)); D = o.length * .6 + B.filter(t => !iso(c, t)).length + (U2 / Math.max(1, U1)) * 2; }
  if (theme === 'w2') { const r0 = o0.map(x => x.uk), spread0 = Math.max(...r0) - Math.min(...r0);
    fit = o.every(x => x.W.length === 1) && new Set(o.map(x => x.W[0])).size >= 2 && spread0 <= 1 && !B.includes(naive.d) || (o.every(x => x.W.length === 1) && spread0 <= 1 && new Set(o.map(x => x.W[0])).size >= 2);
    D = (U2 / Math.max(1, U1)) * 3 + (dead.length <= 1 ? 1 : 0) + o.length * .3; }
  if (theme === 'w3') { fit = bo.kind === 'ryanmen' && o.some(x => x.kind === 'shanpon'); D = o.length * .5 + (U2 / Math.max(1, U1)) * 2 + (B.some(t => c[t] >= 2) ? 1 : 0); }
  if (theme === 'w4') { fit = bo.W.length >= 3 && o.some(x => x.W.length < bo.W.length); D = (U2 / Math.max(1, U1)) * 3 + o.length * .4 + (bo.W.length >= 4 ? 1 : 0); }
  if (theme === 'w5') { { const nv = o.find(x => x.d === naive.d); fit = !!nv && nv.furi && !B.includes(naive.d); } D = o.length * .5 + (U2 < 0 ? 0 : 1) + (rv[0].indexOf(dead[0]) < rv[0].length - 2 ? 1 : 0) + (U2 / Math.max(1, U1)); }
  if (theme === 'w6') { fit = B.every(t => dead.includes(t - 1) || dead.includes(t + 1) || dead.includes(t + 2) || dead.includes(t - 2)) && !iso(c, B[0]) && !B.includes(naive.d);
    D = (U2 / Math.max(1, U1)) * 3 + o.length * .3 + (dead.length <= 2 ? 1 : 0); }
  if (!fit || B.length > 2) return null;
  if ((theme === 'w1' || theme === 'w3') && U1 < 6) return null;   // (a two-sided wait that still has most of its tiles: the lesson's point)
  if (U1 - Math.max(0, U2) < 2) return null;
  const clarity = 30 * Math.min(1, (U1 - Math.max(0, U2)) / Math.max(2, .3 * U1));
  const choice = o.length >= 3 ? 25 : 16;
  let nat = 15; const hon = c.slice(27).reduce((a, b) => a + b, 0), pairs = c.filter(x => x >= 2).length, quads = c.filter(x => x === 4).length;
  const perSuit = [0, 1, 2].map(s => c.slice(s * 9, s * 9 + 9).reduce((a, b) => a + b, 0));
  if (quads) return null; if (hon > 5) nat -= 6; if (pairs > 3 && theme !== 'w3') nat -= 5; if (Math.max(...perSuit) > 9) nat -= 5; if (perSuit.filter(x => x).length < 2) nat -= 8;
  const shape = Math.min(10, kinds.size * 4);
  const fun = Math.round(clarity + choice + 20 + Math.max(0, nat) + shape);
  return { c, ind, sh: shT, B, U1, U2, plaus: o.length, D, fun, rv, okd: theme === 'w5' };
}

// ---------------------------------------------------------------- choose 2 easy · 2 normal · 2 hard per lesson
const THEMES = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean).length ? (process.argv.find(a => a.startsWith('--only='))).slice(7).split(',') : ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6'];
const PER = 6, OVER = 3;
const out = {};
for (const th of THEMES) {
  const cands = [], sig = new Set();
  for (let n = 0; n < (th === 'e2' ? 300000 : 60000) && cands.length < 400; n++) {
    if (n % 2000 === 0) MJ.clearCache();
    const W = th[0] === 'w', h = W ? makeW(th) : makeHand(th); if (!h) continue;
    const key = h.c.join(''); if (sig.has(key)) continue; sig.add(key);
    const e = W ? evaluateW(th, h) : evaluate(th, h); if (e && e.fun >= 70) cands.push(e);
  }
  if (cands.length < PER * OVER) console.warn(`${th}: only ${cands.length} candidates (need ${PER * OVER})`);
  cands.sort((a, b) => a.D - b.D);
  const third = Math.ceil(cands.length / 3), bands = [cands.slice(0, third), cands.slice(third, 2 * third), cands.slice(2 * third)];
  const chosen = [];
  bands.forEach((band, lv) => {
    band.sort((a, b) => b.fun - a.fun || b.D - a.D);
    const got = [];
    for (const e of band) {
      if (got.length >= 2) break;
      // variety: a different answer tile and suit mix from those already chosen
      if (chosen.concat(got).some(x => (x.B.join() === e.B.join() && (th !== 'e1' || x.U1 === e.U1)) || x.c.join('') === e.c.join(''))) continue;
      got.push(e);
    }
    for (const e of got) chosen.push(Object.assign(e, { lv }));
  });
  out[th] = chosen.map(e => {
    // the drawn tile: one that is not an answer (the answer is not always the tile just drawn)
    const ts = []; e.c.forEach((n, t) => { for (let k = 0; k < n; k++) ts.push(t); });
    const others = ts.filter(t => !e.B.includes(t)); const drawn = others[ri(others.length)];
    const me = ts.slice(); me.splice(me.indexOf(drawn), 1);
    const str2 = arr => arr.map(t => str([t])).join('');
    const str = arr => { let s = ''; for (const [b, ch] of [[0, 'm'], [9, 'p'], [18, 's'], [27, 'z']]) { const xs = arr.filter(t => t >= b && t < b + (ch === 'z' ? 7 : 9)).map(t => t - b + 1); if (xs.length) s += xs.join('') + ch; } return s; };
    const o = { me: str(me), drawn: str([drawn]), dora: str([e.ind]), lv: e.lv, fun: e.fun, D: +e.D.toFixed(2), ans: str(e.B) };
    if (e.rv) o.river = { 0: str2(e.rv[0]), 1: str2(e.rv[1]), 2: str2(e.rv[2]), 3: str2(e.rv[3]) };
    if (e.okd) o.d = str(e.B);
    return o;
  });
  if (REPORT) {
    console.log(`\n== ${th}  candidates ${cands.length}`);
    for (const e of chosen) console.log(`  lv${e.lv} fun ${e.fun} D ${e.D.toFixed(2)} sh ${e.sh} ans ${e.B.map(N).join(',')} U1 ${e.U1} U2 ${e.U2} plaus ${e.plaus} | ${e.c.map((n, t) => (N(t) + ' ').repeat(n)).join('')} ind ${N(e.ind)}${e.rv ? ' | rv ' + e.rv.map(r => r.map(N).join(' ')).join(' / ') : ''}`);
  }
}
if (!REPORT) {
  const js = `// 雀華：レッスンの練習問題（tools/gen-drills.js が生成・評価して選んだもの。手で直さない）\n// lv 0 やさしい・1 ふつう・2 むずかしい。fun = 評価点（70以上）、D = 難易度、ans = 正解（評価時）\n(function (root) {\nroot.MJDrills = ${JSON.stringify(out, null, 0).replace(/\],"/g, '],\n"')};\nif (typeof module !== 'undefined' && module.exports) module.exports = root.MJDrills;\n})(typeof window !== 'undefined' ? window : globalThis);\n`;
  fs.writeFileSync(path.join(__dirname, '..', 'drills.js'), js);
  console.log('wrote drills.js', THEMES.map(t => t + ':' + out[t].length).join(' '));
}
