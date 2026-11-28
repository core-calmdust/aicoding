// builds hearts/lesson-pool.js: the pass lessons, every problem checked by simulation (whole hands played out many times,
// the same random deals for every option). Candidates are made 3× or more and only clear answers are kept.
// node hearts/tools/lesson-pool.js [per-lesson] [worlds]
const fs = require('fs'), path = require('path');
const HT = require('../engine.js'); global.HT = HT; const AI = require('../ai.js');
const { suit, rank, card, QS, KS, AS } = HT;
// node hearts/tools/lesson-pool.js --filter : keep only the problems whose answer stays clearly best with 3 other sets of deals
const FILTER = process.argv[2] === '--filter';
const N = +process.argv[2] || 24, W = +process.argv[3] || 500;
const ONLY = process.argv[4] ? process.argv[4].split(',') : null; // top up these lessons, keep the rest of the pool
const rng = AI.mulberry(20261128 + (ONLY ? 1 : 0));
const R = HT.rules({});
const nm = c => HT.RKN(rank(c)) + HT.SYM[suit(c)];
function dealHand() { const d = HT.shuffled(rng); return d.slice(0, 13); }
const lowSp = h => h.filter(c => suit(c) === 2 && rank(c) < 12).length;
const key = a => a.slice().sort((x, y) => x - y).join(',');
// the lessons: hand filter, what the right pass must do, how a wrong option is told apart
const L = {
  passQ: { want: h => h.includes(QS) && lowSp(h) <= 1 && !h.includes(AS) && !h.includes(KS), good: p => p.includes(QS), bad: p => !p.includes(QS) },
  passAK: { want: h => !h.includes(QS) && (h.includes(AS) || h.includes(KS)) && lowSp(h) <= 2, good: (p, h) => [AS, KS].filter(c => h.includes(c)).every(c => p.includes(c)), bad: (p, h) => !p.some(c => c === AS || c === KS) },
  passVoid: { want: h => !h.includes(QS) && !h.includes(AS) && !h.includes(KS) && [0, 1].some(s => { const n = h.filter(c => suit(c) === s).length; return n >= 2 && n <= 3; }), good: (p, h) => [0, 1].some(s => { const n = h.filter(c => suit(c) === s).length; return n > 0 && p.filter(c => suit(c) === s).length === n; }), bad: (p, h) => ![0, 1].some(s => { const n = h.filter(c => suit(c) === s).length; return n > 0 && p.filter(c => suit(c) === s).length === n; }) },
};
function robust(q) {
  const S = HT.newHand(R, [q.vis.hand.slice(), [], [], []], 1, 1);
  for (const seed of [99173, 4242, 777001]) {
    const ev = q.opts.map(o => AI.evalPass(S, 0, o, 300, AI.mulberry(seed + q.vis.hand[0])).obj);
    const second = Math.min(...ev.filter((x, i) => i !== q.ans));
    if (ev.indexOf(Math.min(...ev)) !== q.ans || second - ev[q.ans] < .8) return false;
  }
  return true;
}
if (FILTER) {
  global.self = global; require('../lesson-pool.js'); const P = global.HT_LPOOL, out = {};
  for (const id in P) { out[id] = P[id].filter(robust); console.log(id, P[id].length, '→', out[id].length); }
  fs.writeFileSync(path.join(__dirname, '..', 'lesson-pool.js'), '/* ハーツ — pass lessons checked by simulation (made by tools/lesson-pool.js; do not edit). */\nself.HT_LPOOL = ' + JSON.stringify(out) + ';\n');
  process.exit(0);
}
function evalSet(S, p, worldsSeed) { return AI.evalPass(S, 0, p, W, AI.mulberry(worldsSeed)).obj; }
const out = {}; let tried = 0;
if (ONLY) { global.self = global; require('../lesson-pool.js'); Object.assign(out, global.HT_LPOOL); }
for (const id of Object.keys(L)) {
  if (ONLY && !ONLY.includes(id)) continue;
  const spec = L[id], list = ONLY ? (out[id] || []).slice() : [];
  const have = new Set(list.map(q => key(q.vis.hand)));
  let cands = 0;
  while (list.length < N && cands < N * 12) {
    const h = dealHand(); if (!spec.want(h)) continue;
    cands++; tried++;
    const S = HT.newHand(R, [h, [], [], []], 1, 1);
    // options: every candidate from the rule list, the right kind and the wrong kind
    const all = AI.passCands(h, R, 1, 30);
    const goods = all.filter(p => spec.good(p, h)), bads = all.filter(p => spec.bad(p, h));
    if (!goods.length || bads.length < 3) continue;
    const seed = Math.floor(rng() * 1e9);
    const g = goods.slice(0, 3).map(p => ({ p, v: evalSet(S, p, seed) })).sort((a, b) => a.v - b.v)[0];
    const b = bads.slice(0, 6).map(p => ({ p, v: evalSet(S, p, seed) })).sort((a, b2) => a.v - b2.v);
    // a clear answer: the right pass beats every option shown by at least 1 point; options differ from each other
    const shown = [], used = new Set([key(g.p)]);
    for (const x of b) { if (shown.length >= 3) break; if (!used.has(key(x.p))) { used.add(key(x.p)); shown.push(x); } }
    if (shown.length < 3 || shown[0].v - g.v < 1.0) continue;
    // a second check with other deals: the same order
    const seed2 = seed + 77, g2 = evalSet(S, g.p, seed2), b2 = Math.min(...shown.map(x => evalSet(S, x.p, seed2)));
    if (b2 - g2 < .8) continue;
    const opts = [g].concat(shown).sort(() => rng() - .5);
    const lo = lowSp(h), short = [0, 1].map(s => h.filter(c => suit(c) === s).length);
    if (have.has(key(h))) continue;
    const item = { q: ['lq.' + id], kind: 'pass', vis: { hand: HT.sortDisp(h), dir: 1 }, opts: opts.map(x => x.p.slice().sort((a, c) => a - c)), ans: opts.indexOf(g), ev: opts.map(x => +x.v.toFixed(2)),
      exp: ['le.' + id, { n: lo, s: HT.SYM[short[0] <= 3 && g.p.filter(c => suit(c) === 0).length === short[0] ? 0 : 1] }],
      why: opts.map(x => x === g ? null : ['lw.' + id, { c: x.p.map(nm).join(' '), n: lo }]), d: +(shown[0].v - g.v < 2 ? 2 : 1) };
    if (!robust(item)) continue;
    list.push(item); have.add(key(h));
    process.stderr.write(`${id} ${list.length}/${N} (cands ${cands}) margin ${(shown[0].v - g.v).toFixed(2)}\n`);
  }
  out[id] = list;
}
fs.writeFileSync(path.join(__dirname, '..', 'lesson-pool.js'), '/* ハーツ — pass lessons checked by simulation (made by tools/lesson-pool.js; do not edit). */\nself.HT_LPOOL = ' + JSON.stringify(out) + ';\n');
console.log(Object.keys(out).map(k => k + ' ' + out[k].length).join(', '), 'candidates', tried);
