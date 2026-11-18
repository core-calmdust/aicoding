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

// ---------------------------------------------------------------- choose 2 easy · 2 normal · 2 hard per lesson
const THEMES = ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'];
const PER = 6, OVER = 3;
const out = {};
for (const th of THEMES) {
  const cands = [], sig = new Set();
  for (let n = 0; n < (th === 'e2' ? 300000 : 60000) && cands.length < 400; n++) {
    if (n % 2000 === 0) MJ.clearCache();
    const h = makeHand(th); if (!h) continue;
    const key = h.c.join(''); if (sig.has(key)) continue; sig.add(key);
    const e = evaluate(th, h); if (e && e.fun >= 70) cands.push(e);
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
    const str = arr => { let s = ''; for (const [b, ch] of [[0, 'm'], [9, 'p'], [18, 's'], [27, 'z']]) { const xs = arr.filter(t => t >= b && t < b + (ch === 'z' ? 7 : 9)).map(t => t - b + 1); if (xs.length) s += xs.join('') + ch; } return s; };
    return { me: str(me), drawn: str([drawn]), dora: str([e.ind]), lv: e.lv, fun: e.fun, D: +e.D.toFixed(2), ans: str(e.B) };
  });
  if (REPORT) {
    console.log(`\n== ${th}  candidates ${cands.length}`);
    for (const e of chosen) console.log(`  lv${e.lv} fun ${e.fun} D ${e.D.toFixed(2)} sh ${e.sh} ans ${e.B.map(N).join(',')} U1 ${e.U1} U2 ${e.U2} plaus ${e.plaus} | ${e.c.map((n, t) => (N(t) + ' ').repeat(n)).join('')} ind ${N(e.ind)}`);
  }
}
if (!REPORT) {
  const js = `// 雀華：レッスンの練習問題（tools/gen-drills.js が生成・評価して選んだもの。手で直さない）\n// lv 0 やさしい・1 ふつう・2 むずかしい。fun = 評価点（70以上）、D = 難易度、ans = 正解（評価時）\n(function (root) {\nroot.MJDrills = ${JSON.stringify(out, null, 0).replace(/\],"/g, '],\n"')};\nif (typeof module !== 'undefined' && module.exports) module.exports = root.MJDrills;\n})(typeof window !== 'undefined' ? window : globalThis);\n`;
  fs.writeFileSync(path.join(__dirname, '..', 'drills.js'), js);
  console.log('wrote drills.js', THEMES.map(t => t + ':' + out[t].length).join(' '));
}
