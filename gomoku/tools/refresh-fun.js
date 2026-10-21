// One-off (2026-10-21): replace 詰め連珠 whose fun score (tools/fun.js) is below 70 with fun ones of the same category
// and the same length (win in N), mined earlier (tools/data/*.jsonl from mine-puzzles.js / mine-vcf.js / extend-vcf.js),
// verified exactly like build-puzzles.js (unique first move, shortest win = N, solver within its node limit).
// The replaced puzzle keeps its slot (category / level / index → the record key `cat-N-index` is unchanged); the old one is
// stored in puzzles.json `old[key]` and app.js keeps showing it to players who already have a record for that slot.
// Daily puzzles dated <= `cut` also keep the old content.
// usage: node tools/refresh-fun.js   (deterministic; refuses to run twice)
'use strict';
const E = require('../engine.js');
const { funScore } = require('./fun.js');
const fs = require('fs'), path = require('path');
const file = path.join(__dirname, '..', 'puzzles.json');
const D = JSON.parse(fs.readFileSync(file, 'utf8'));
if (D.old) { console.error('already refreshed'); process.exit(1); }
const CUT = '2026-10-21', MIN = 70, TARGET = 76;
const sig = p => p.b + '|' + p.w + '|' + p.side;
function verify(p) {   // = build-puzzles.js verify()
  const pos = E.setup('renju', { b: p.b ? p.b.split(' ').map(E.sqOf) : [], w: p.w ? p.w.split(' ').map(E.sqOf) : [], side: p.side });
  if (pos.status().over) return false;
  const S = new E.Solver(); S.limit = 6e6;
  const al = S.attackList(pos, p.T); if (S.nodes > S.limit) return false;
  const wins = al.filter(e => e.need > 0 && e.need <= p.T);
  if (wins.length !== 1 || wins[0].need !== p.T || E.sqName(E.I2M[wins[0].i]) !== p.a) return false;
  // the answer line must be playable
  const line = p.pv.split(' ').map(E.sqOf);
  for (const m of line) { if (!pos.isLegal(m)) return false; pos.make(m); }
  return true;
}
// candidates
const cand = [];
for (const f of ['mined', 'v', 'ext', 'open']) {
  const fp = path.join(__dirname, 'data', f + '.jsonl'); if (!fs.existsSync(fp)) continue;
  for (const l of fs.readFileSync(fp, 'utf8').trim().split('\n')) if (l) { const p = JSON.parse(l); if (p.cat && p.T) cand.push(p); }
}
const origin = new Map(); for (const p of cand) if (!origin.has(sig(p))) origin.set(sig(p), p);
const used = new Set();
for (const C of D.cats) for (const L of C.levels) for (const P of L.puzzles) used.add(sig(P));

// 1) slots to replace
const jobs = [];
D.cats.forEach((C, c) => C.levels.forEach((L, l) => L.puzzles.forEach((P, j) => {
  const r = funScore(E, P, C.id, L.n);
  if (r.fun < MIN) jobs.push({ key: C.id + '-' + L.n + '-' + j, c, l, j, cat: C.id, T: L.n, n: (P.b ? P.b.split(' ').length : 0) + (P.w ? P.w.split(' ').length : 0), fun: r.fun });
})));
const need = {}; jobs.forEach(x => (need[x.cat + ':' + x.T] = (need[x.cat + ':' + x.T] || 0) + 1));
console.log('to replace', jobs.length, need);

// 2) pool of fun, verified candidates per bucket
const pool = {}, seen = new Set(used);
for (const p of cand) {
  const k = p.cat + ':' + p.T; if (!need[k] || p.n > 70) continue;
  const s = sig(p); if (seen.has(s)) continue; seen.add(s);
  const r = funScore(E, p, p.cat, p.T); if (r.fun < TARGET || r.over) continue;
  if (!verify(p)) continue;
  (pool[k] = pool[k] || []).push(Object.assign({ fun: r.fun }, p));
}
for (const k in need) console.log(k, 'need', need[k], 'pool', (pool[k] || []).length);

// 3) give each slot the candidate with the closest stone count (= the level's easy → hard order), preferring more fun;
//    never two problems of one level from the same game a few moves apart (as in build-puzzles.js)
D.old = {}; D.cut = CUT; D.v = 2;
const gameOf = P => { const o = origin.get(sig(P)); return o ? o.g + ':' + o.k : null; };
let done = 0; const miss = [];
for (const x of jobs.sort((a, b) => a.cat.localeCompare(b.cat) || a.T - b.T || a.j - b.j)) {
  const L = D.cats[x.c].levels[x.l], B = pool[x.cat + ':' + x.T] || [];
  const games = L.puzzles.filter((_, j) => j !== x.j).map(gameOf).filter(Boolean).map(s => s.split(':').map(Number));
  let best = -1, bc = Infinity;
  B.forEach((p, i) => {
    if (games.some(([g, k]) => g === p.g && Math.abs(k - p.k) < 6)) return;
    const cost = 1.5 * Math.abs(p.n - x.n) - .12 * (p.fun - TARGET);
    if (cost < bc) { bc = cost; best = i; }
  });
  if (best < 0) { miss.push(x.key); continue; }
  const [p] = B.splice(best, 1);
  D.old[x.key] = L.puzzles[x.j];
  L.puzzles[x.j] = { b: p.b, w: p.w, side: p.side, a: p.a, pv: p.pv, last: p.last || undefined };
  done++;
  console.log(x.key, 'fun', x.fun, '→', p.fun, 'stones', x.n, '→', p.n);
}
fs.writeFileSync(file, JSON.stringify(D));
console.log('replaced', done, 'of', jobs.length, miss.length ? 'missing ' + miss.join(' ') : '');
