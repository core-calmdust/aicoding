// select lesson problems and puzzles from the verified candidates; writes compact JSON into the site (and a copy to CK).
// usage: node select.js
'use strict';
const L = require('./lib.js'), { E } = L;
const fs = require('fs'), path = require('path');
const SITE = '/home/claude/aicoding/dots';
const K64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const r = L.rng(20261019);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------------------------------------------------------------- load
const cands = { 3: [], 4: [], 5: [] };
for (const n of [3, 4, 5]) cands[n] = L.readJsonl(`${L.CK}/cand_${n}.jsonl`);
// old puzzles (kept, re-verified below)
const OLDTAG = { loop: 'loop', decline: 'double', hard: 'count', sacrifice: 'sacrifice', order: 'count', parity: 'longchain', take: 'take' };
const old = JSON.parse(fs.readFileSync(`${L.CK}/old_fixed.json`, 'utf8'));
// ---------------------------------------------------------------- helpers
function canonKey(n, edges) {
  const G = E.geom(n, n); let best = null;
  for (const pm of G.perms) { const k = edges.map(e => pm[e]).sort((a, b) => a - b).join(','); if (best === null || k < best) best = k; }
  return n + ':' + best;
}
function info(c) {
  const f = L.feats(c.n, c.edges), vals = c.vals, best = L.bestSet(vals), bv = Math.max(...vals.map(x => x[1]));
  const near = vals.filter(x => x[1] < bv && x[1] >= bv - 2).length;
  const comps = f.comps;
  const compOf = e => comps.findIndex(cc => { const a = f.G.eb0[e], b = f.G.eb1[e]; return cc.boxes.includes(a) || cc.boxes.includes(b); });
  const oneComp = new Set(best.map(compOf)).size === 1 && compOf(best[0]) >= 0;
  const diff = f.p.undrawn + 3 * near + (f.safe.length ? 2 : 0) + (best.length === 1 ? 2 : 0);
  return { f, best, bv, near, oneComp, diff };
}
const enc = {
  edges: es => es.map(e => K64[e]).join(''),
  owners: os => os.map(o => o < 0 ? '.' : String(o)).join(''),
  vals: (n, vals) => { const G = E.geom(n, n), a = new Array(G.E).fill('.'); for (const [e, v] of vals) a[e] = K64[v + 30]; return a.join(''); },
};
function target(c) { const sc = [0, 0]; let filled = 0; c.owners.forEach(o => { if (o >= 0) { sc[o]++; filled++; } }); const rem = c.n * c.n - filled; return [sc[0] + (rem + c.v) / 2, sc[1] + (rem - c.v) / 2]; }
// independent re-check with the JavaScript solver (engine.js) where it finishes in time
let jsChecked = 0, jsSkipped = 0, mismatch = 0;
function crossCheck(c, ms) {
  const t0 = Date.now(), s = L.jsSolve(c.n, c.edges, ms);
  const dt = Date.now() - t0;
  if (!s) { jsSkipped++; return { ok: true, checked: false, dt }; }
  jsChecked++;
  const m = new Map(s.vals);
  const ok = c.vals.every(([e, v]) => m.get(e) === v) && s.vals.length === c.vals.length;
  if (!ok) { mismatch++; console.log('MISMATCH', JSON.stringify(c.edges)); }
  return { ok, checked: true, dt };
}

// ---------------------------------------------------------------- pools
const used = new Set();
const all = [];
for (const n of [3, 4, 5]) for (const c of cands[n]) { c.key = canonKey(n, c.edges); all.push(c); }
// de-duplicate by symmetry
const byKey = new Map(); for (const c of all) if (!byKey.has(c.key)) byKey.set(c.key, c);
const uniq = [...byKey.values()];
for (const c of uniq) c.I = info(c);
const pool = (n, kinds, pred) => uniq.filter(c => c.n === n && c.kinds.some(k => kinds.includes(k)) && !used.has(c.key) && (!pred || pred(c)));
// pick k items spread over the difficulty range
function spread(list, k) {
  list = list.slice().sort((a, b) => a.I.diff - b.I.diff);
  if (list.length <= k) return list;
  const out = []; for (let i = 0; i < k; i++) out.push(list[Math.floor((i + 0.5) * list.length / k)]);
  return out;
}
function take(list, k, lo, hi) {   // from a difficulty window [lo, hi) of the sorted list (fractions)
  list = list.slice().sort((a, b) => a.I.diff - b.I.diff);
  const a = Math.floor(list.length * lo), b = Math.max(a + k, Math.floor(list.length * hi));
  return spread(list.slice(a, b), k);
}

// ---------------------------------------------------------------- puzzles
const uniqueFirst = c => c.I.best.length === 1;
const compFirst = c => c.I.best.length === 1 || c.I.oneComp;
const ms5 = c => { if (c.n < 5) return true; if (c.dt5 === undefined) { const t0 = Date.now(); const s = L.jsSolve(5, c.edges, 3000); c.dt5 = s ? Date.now() - t0 : 1e9; } return c.dt5 < 1500; };
const CATS = [
  { id: 'take', kinds: ['take', 'ctl_take'], pred: uniqueFirst },
  { id: 'double', kinds: ['double'], pred: uniqueFirst },
  { id: 'longchain', kinds: ['parity'], pred: uniqueFirst },
  { id: 'loop', kinds: ['loopdec', 'loopopen'], pred: compFirst },
  { id: 'sacrifice', kinds: ['sacrifice'], pred: uniqueFirst },
  { id: 'count', kinds: ['count', 'hard'], pred: compFirst },
  { id: 'real3', size: 3, kinds: ['open3', 'parity', 'sacrifice', 'count', 'ctl_decline', 'ctl_take', 'loopopen'], pred: uniqueFirst },
  { id: 'real4', size: 4, kinds: ['mid4', 'parity', 'sacrifice', 'count', 'ctl_decline', 'loopdec'], pred: uniqueFirst },
  { id: 'real5', size: 5, kinds: ['mid5', 'parity', 'sacrifice', 'count', 'ctl_decline', 'loopdec'], pred: uniqueFirst },
];
const PER = { concept: 17, size: 16 };
const puzzles = {};
// old puzzles first (re-verified, kept in their category)
const oldMap = [];
for (const [li, lv] of old.levels.entries()) lv.puzzles.forEach((pz, k) => {
  const c = { n: pz.n, edges: pz.edges, owners: pz.owners, vals: pz.values, v: Math.max(...pz.values.map(x => x[1])), kinds: [], old: [li, k], tag: OLDTAG[pz.tag] || 'count' };
  c.key = canonKey(c.n, c.edges); c.I = info(c);
  const cat = c.tag; (puzzles[cat] = puzzles[cat] || [[], [], []])[c.n - 3].push(c); used.add(c.key);
});
for (const C of CATS) {
  const lv = puzzles[C.id] = puzzles[C.id] || [[], [], []];
  for (let L3 = 0; L3 < 3; L3++) {
    const want = C.size ? PER.size : PER.concept;
    let list;
    if (C.size) {   // size category: three difficulty levels on one board size
      list = pool(C.size, C.kinds, c => C.pred(c) && ms5(c));
      const chosen = take(list, want, [0, 0.33, 0.66][L3], [0.33, 0.66, 1][L3]);
      lv[L3].push(...chosen.slice(0, want - lv[L3].length));
    } else {
      const n = L3 + 3;
      list = pool(n, C.kinds, c => C.pred(c) && ms5(c));
      const chosen = spread(list, want - lv[L3].length);
      lv[L3].push(...chosen);
    }
    lv[L3].forEach(c => used.add(c.key));
    lv[L3].sort((a, b) => a.I.diff - b.I.diff);
  }
}
// ---------------------------------------------------------------- lessons
const STEPS = [
  { id: 'safe', course: 'basic', src: [[3, ['safe']]] },
  { id: 'third', course: 'basic', src: [[4, ['third']], [3, ['safe']]] },
  { id: 'take', course: 'basic', src: [[3, ['take']], [4, ['take']]] },
  { id: 'chain', course: 'basic', src: [[3, ['chain']], [4, ['chain']]] },
  { id: 'hard', course: 'mid', src: [[3, ['hard']], [4, ['hard']]] },
  { id: 'double', course: 'mid', src: [[3, ['double']], [4, ['double']]] },
  { id: 'control', course: 'mid', src: [[3, ['ctl_take']], [4, ['ctl_decline']], [4, ['ctl_take']], [3, ['ctl_decline']]] },
  { id: 'parity', course: 'mid', src: [[3, ['parity']], [4, ['parity']]] },
  { id: 'sacrifice', course: 'mid', src: [[3, ['sacrifice']], [4, ['sacrifice']]] },
  { id: 'loop', course: 'adv', src: [[4, ['loopdec']], [4, ['loopopen']], [5, ['loopdec']]] },
  { id: 'count', course: 'adv', src: [[3, ['count']], [4, ['count']], [5, ['count']]] },
  { id: 'open3', course: 'adv', src: [[3, ['open3']]] },
  { id: 'mid4', course: 'adv', src: [[4, ['mid4']]] },
  { id: 'mid5', course: 'adv', src: [[5, ['mid5']]] },
  { id: 'exam', course: 'exam', src: [[3, ['parity', 'sacrifice', 'ctl_decline']], [4, ['count', 'double', 'loopdec', 'parity']], [5, ['sacrifice', 'parity', 'ctl_decline', 'count']]] },
];
const POOL = 10;
const lessonSteps = [];
for (const S of STEPS) {
  const per = Math.ceil(POOL / S.src.length), probs = [];
  for (const [n, kinds] of S.src) {
    let list = pool(n, kinds, c => ms5(c) && c.I.best.length <= 4 && (S.id !== 'open3' && S.id !== 'mid4' && S.id !== 'mid5' || c.I.best.length <= 3));
    // basics: friendlier positions first
    const lo = S.course === 'basic' ? 0 : S.course === 'exam' ? 0.5 : 0.15, hi = S.course === 'basic' ? 0.6 : 1;
    const ch = take(list, Math.min(per, POOL - probs.length), lo, hi);
    ch.forEach(c => { used.add(c.key); c.kindUsed = kinds.find(k => c.kinds.includes(k)); });
    probs.push(...ch);
  }
  probs.sort((a, b) => a.I.diff - b.I.diff);
  lessonSteps.push({ S, probs });
}
// ---------------------------------------------------------------- verify everything that ships with the independent JS solver
for (const C of Object.keys(puzzles)) for (const lv of puzzles[C]) for (const c of lv) crossCheck(c, c.n === 3 ? 20000 : 6000);
for (const { probs } of lessonSteps) for (const c of probs) crossCheck(c, c.n === 3 ? 20000 : 6000);
console.log(`cross-check with engine.js solver: checked ${jsChecked}, over time budget (native only) ${jsSkipped}, mismatches ${mismatch}`);
if (mismatch) process.exit(1);

// ---------------------------------------------------------------- write
const pzRec = (c, cat) => ({ n: c.n, e: enc.edges(c.edges), o: enc.owners(c.owners), v: enc.vals(c.n, c.vals), t: target(c), g: c.tag || pzTag(c, cat) });
function pzTag(c, cat) {
  const k = c.kinds;
  if (k.includes('loopdec') || k.includes('loopopen')) return 'loop';
  if (k.includes('double')) return 'double';
  if (k.includes('ctl_take') || k.includes('take')) return 'take';
  if (k.includes('parity')) return 'longchain';
  if (k.includes('sacrifice')) return 'sacrifice';
  if (k.includes('hard')) return 'hard';
  if (k.includes('open3') || k.includes('mid4') || k.includes('mid5')) return 'plan';
  return 'count';
}
fs.mkdirSync(`${SITE}/puzzles`, { recursive: true });
const index = { version: 2, cats: [], legacy: [] };
let total = 0;
for (const C of CATS) {
  const lv = puzzles[C.id];
  const data = { cat: C.id, levels: lv.map(l => l.map(c => pzRec(c, C.id))) };
  lv.forEach((l, li) => l.forEach((c, k) => { if (c.old) index.legacy.push([c.old[0], c.old[1], C.id, li, k]); }));
  fs.writeFileSync(`${SITE}/puzzles/${C.id}.json`, JSON.stringify(data));
  index.cats.push({ id: C.id, size: C.size || 0, counts: lv.map(l => l.length) });
  total += lv.reduce((a, l) => a + l.length, 0);
}
fs.writeFileSync(`${SITE}/puzzles/index.json`, JSON.stringify(index));
const lessons = { version: 2, steps: lessonSteps.map(({ S, probs }) => ({ id: S.id, course: S.course, problems: probs.map(c => ({ n: c.n, e: enc.edges(c.edges), o: enc.owners(c.owners), v: enc.vals(c.n, c.vals), k: c.kindUsed })) })) };
fs.writeFileSync(`${SITE}/lessons.json`, JSON.stringify(lessons));
fs.copyFileSync(`${SITE}/lessons.json`, `${L.CK}/lessons.json`);
console.log('puzzles', total, index.cats.map(c => c.id + ':' + c.counts.join('/')).join(' '));
console.log('lessons', lessons.steps.map(s => s.id + ':' + s.problems.length).join(' '));
console.log('legacy mapped', index.legacy.length);
