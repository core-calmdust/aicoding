// senet/tools/gen_water.js — セネト「水の家を避ける」レッスン（v2）を作る（2026-11-24 担当C、3D対応）。
// 手の問題は作れない（出目1はもう一度投げられるので、ほかの手の不正解の理由を盤の事実で言えない＝⑦、追36）。
// そこで、盤で数えて確かめられる選ぶ問題5問にする（易→難＝数える数が増える順）：
//   wdest：26 の駒が水に落ちたら、どのマスに戻る？（15 から手前の最初の空きマス。ふさがったマスの数 k が増える順）
//   wcnt ：出目1で水の家に落ちない手は何通り？（26 のほかに 1 で動ける駒を数える。味方・並んだ相手・美の家の相手でふさがる手がある）
// 答えは engine.js の legalMoves で数え直し、誤答それぞれに盤の事実の説明（ngo、追22）、答えの位置は散らす（追40）。
// ⑤：ほかのレッスン・準備・ルール説明の局面と駒4つ以上ちがう。使い方: node senet/tools/gen_water.js
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js'), F = require('./senet_lessfacts.js'), T = require('./learn_text_exact.js'), WT = require('./learn_text_water.js');
const FILE = path.join(__dirname, '..', 'lessons.json'), D = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const LANGS = T.LANGS;
const S = s => ({ rule: 'std', pos: s.pos.map(a => a.slice()), turn: 0 });
const fill = x => { const y = x.slice(); while (y.length < 5) y.push(31); return y.sort((p, q) => q - p); };
const fillMsg = (key, p) => { const t = WT.MSG[key], o = {}; for (const l of LANGS) o[l] = t[l].replace(/\{(\w+)\}/g, (_, k) => p[k] != null ? p[k] : ''); return o; };
const used = F.tourStates(path.join(__dirname, '..', '..')).map(s => Object.assign(s, { n: 0 }));
for (const L of D.steps) if (L.v2 && L.id !== 'water') for (const q of [L.diagram, ...L.ramp, ...L.problems]) if (q && q.s) used.push(Object.assign(S(q.s), { n: q.n || 0 }));
const far = (s, n) => used.every(u => F.tokDiff(u, s, u.n, n) >= F.MIN_TOK);
const take = (s, n) => used.push(Object.assign(S(s), { n }));
const glow27 = Object.assign(F.sq(27), { type: 'glow', color: '#4da3ff' }), ring26 = Object.assign(F.sq(26), { type: 'ring', color: '#ff9b7a' });
const water = s => E.legalMoves(Object.assign(S(s), { winner: -1 }), 1).find(m => m.water);

// wdest：15 から k マスがふさがっている（味方・相手まぜて）。ほかの駒は 16〜25 に
function wdest(seed, k, ansAt) {
  const r = E.mulberry32(seed);
  for (let t = 0; t < 20000; t++) {
    const occ = []; for (let i = 0; i < k; i++) occ.push(15 - i);
    const me = [26], op = [];
    occ.forEach((q, i) => (i === 0 || r() < 0.5 ? op : me).push(q));   // (15 は相手：自分の駒だけで決まらない)
    const free = []; for (let q = 16; q <= 25; q++) free.push(q);
    const extra = 1 + Math.floor(r() * 3);
    for (let i = 0; i < extra; i++) { const q = free.splice(Math.floor(r() * free.length), 1)[0]; (r() < 0.5 ? me : op).push(q); }
    if (me.length > 5 || op.length > 5) continue;
    const s = { rule: 'std', pos: [fill(me), fill(op)], turn: 0 }, m = water(s);
    if (!m || m.dest !== 15 - k || !far(s, 1)) continue;
    const d = m.dest;
    // 選択肢：答え・ふさがったマス（15 から）・答えより手前・27（水の家）から4つ。答えの位置は ansAt
    const occO = occ.slice(0, 2), past = [d - 1, d - 2].filter(x => x >= 1);
    let pool = [...new Set([d, ...occO, ...past, 27])];
    for (let a = 0; a < 50; a++) {
      const pick = [d]; const rest = pool.filter(x => x !== d);
      while (pick.length < 4 && rest.length) pick.push(rest.splice(Math.floor(r() * rest.length), 1)[0]);
      const opts = pick.sort((x, y) => x - y);
      if (opts.indexOf(d) !== ansAt) continue;
      const ngo = opts.map(x => x === d ? null : x === 27 ? ['c.w27Ng', { x: '27' }] : x > d ? ['c.wOccNg', { x: String(x) }] : ['c.wPastNg', { x: String(x), d }]);
      take(s, 1);
      return { kind: 'choice', s: S(s), n: 1, marks: [ring26, glow27], q: WT.Q.wdest, opts: opts.map(String), ans: ansAt, why: k > 1 ? ['c.wdest', { d, e: d + 1 }] : k === 1 ? ['c.wdest1', { d }] : ['c.wdest15', { d }], ngo };
    }
  }
  throw new Error('wdest ' + k);
}
// wcnt：26 の駒＋ほかの味方 nOther 枚。1 で動けない駒（ふさがる）が1枚以上、水の家に落ちない手 m は1以上
function wcnt(seed, nOther, ansAt) {
  const r = E.mulberry32(seed);
  for (let t = 0; t < 50000; t++) {
    const sq = []; const pick = () => { for (;;) { const q = 9 + Math.floor(r() * 17); if (!sq.includes(q)) { sq.push(q); return q; } } };   // 9〜25
    const me = [26]; for (let i = 0; i < nOther; i++) me.push(pick());
    const op = []; const no = 2 + Math.floor(r() * 3); for (let i = 0; i < no; i++) op.push(r() < 0.15 && !op.includes(26) ? 26 : pick());
    if (op.length > 5) continue;
    const s = { rule: 'std', pos: [fill(me), fill(op)], turn: 0 };
    const ms = E.legalMoves(Object.assign(S(s), { winner: -1 }), 1), ok = ms.filter(m => !m.water);
    const blocked = nOther - ok.length;
    if (!ms.some(m => m.water) || ok.length < 1 || blocked < (nOther >= 4 ? 2 : 1) || !far(s, 1)) continue;
    const m = ok.length; let opts = [m - 2, m - 1, m, m + 1, m + 2].filter(x => x >= 0);
    // 4つ、答えの位置 ansAt
    let lo = Math.max(0, m - ansAt); opts = [lo, lo + 1, lo + 2, lo + 3]; if (opts.indexOf(m) !== ansAt) continue;
    const list = ok.map(x => `${x.from}→${x.to}`).join(' · ');
    take(s, 1);
    return { kind: 'choice', s: S(s), n: 1, marks: [ring26, glow27], q: WT.Q.wcnt, opts: opts.map(String), ans: ansAt, why: ['c.wcnt', { m, list }],
      ngo: opts.map(x => x === m ? null : [x < m ? 'c.lowNg' : 'c.highNg', { x: String(x) }]) };
  }
  throw new Error('wcnt ' + nOther);
}
// 見本（explain）：15 がふさがり 14 へ。準備（try）：15 が空いていて 15 へ
function board(seed, occ, me0, op0) {
  const r = E.mulberry32(seed);
  for (let t = 0; t < 20000; t++) {
    const me = [26, ...me0], op = [...op0]; const extra = 2;
    for (let i = 0; i < extra; i++) { let q; do q = 16 + Math.floor(r() * 10); while (me.includes(q) || op.includes(q)); (r() < 0.5 ? me : op).push(q); }
    const s = { rule: 'std', pos: [fill(me), fill(op)], turn: 0 }, m = water(s);
    if (!m || m.dest !== 15 - occ || !far(s, 1)) continue;
    take(s, 1); return { s: S(s), d: m.dest };
  }
  throw new Error('board');
}
const ex = board(31, 1, [], [15]), tr = board(37, 0, [12], [9]);
const arrow = { type: 'arrow', from: F.sq(26), to: F.sq(ex.d), color: '#ff9b7a' };
const trOpts = ['13', '14', '15', '27'], trAns = 2;
const probs = [wdest(101, 1, 1), wcnt(202, 3, 1), wdest(303, 3, 0), wcnt(404, 4, 2), wdest(505, 5, 2)];
const O = D.steps.find(x => x.id === 'water');
const step = {
  id: 'water', cat: O.cat, rule: 'std', title: O.title, tip: O.tip, body: O.body,
  diagram: { s: ex.s, marks: [glow27, arrow] },
  ramp: [
    { k: 'explain', s: ex.s, n: 1, seq: [], marks: [glow27, ring26, arrow], t: WT.RAMP.exT, body: WT.RAMP.exB },
    { k: 'try', kind: 'choice', s: tr.s, n: 1, marks: [ring26, glow27], opts: trOpts, ans: trAns, t: WT.RAMP.tryT, h: WT.RAMP.h1, g: fillMsg('c.wdest15', { d: 15 }), y: D.ui.rampRetry,
      why: ['c.wdest15', { d: 15 }], ngo: [['c.wPastNg', { x: '13', d: 15 }], ['c.wPastNg', { x: '14', d: 15 }], null, ['c.w27Ng', { x: '27' }]] },
  ],
  problems: probs, hints: [WT.RAMP.h1, WT.RAMP.h2], v2: true,
};
if (tr.d !== 15) throw new Error('try dest');
D.steps[D.steps.findIndex(x => x.id === 'water')] = step;
for (const k of Object.keys(D.msg)) if (k.startsWith('o.')) delete D.msg[k];
Object.assign(D.msg, WT.MSG);
fs.writeFileSync(FILE, JSON.stringify(D));
console.log('water', probs.map(q => q.why[0] + ':' + q.opts.join('/') + '→' + q.opts[q.ans]).join('  '));
