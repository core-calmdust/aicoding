// Select and verify the 500 詰め連珠 for puzzles.json from the mined / composed candidates.
// node tools/build-puzzles.js <cand1.jsonl> [cand2.jsonl ...]
'use strict';
const E = require('../engine.js');
const fs = require('fs'), path = require('path');
const files = process.argv.slice(2);
const all = [];
for (const f of files) for (const l of fs.readFileSync(f, 'utf8').trim().split('\n')) if (l) all.push(JSON.parse(l));
// quotas per category / length (sum 500)
const Q = {
  intro: { 1: 50 },
  vcf: { 3: 50, 5: 45, 7: 40, 9: 30, 11: 15 },
  vct: { 3: 45, 5: 45, 7: 40, 9: 35 },
  forbid: { 1: 25, 3: 20, 5: 20, 7: 20, 9: 20 },
};
const TOTAL = 500;
let seed = 4242; const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
const sig = p => p.b + '|' + p.w + '|' + p.side;
const seenPos = new Set(), usedGame = new Map();   // game -> number of problems taken from it
function verify(p) {
  const pos = E.setup('renju', { b: p.b ? p.b.split(' ').map(E.sqOf) : [], w: p.w ? p.w.split(' ').map(E.sqOf) : [], side: p.side });
  if (pos.status().over) return false;
  const S = new E.Solver(); S.limit = 6e6;
  const al = S.attackList(pos, p.T); if (S.nodes > S.limit) return false;
  const wins = al.filter(e => e.need > 0 && e.need <= p.T);
  if (wins.length !== 1 || wins[0].need !== p.T || E.sqName(E.I2M[wins[0].i]) !== p.a) return false;
  return true;
}
const buckets = {};
for (const p of all) { const k = p.cat + ':' + p.T; (buckets[k] = buckets[k] || []).push(p); }
for (const k in buckets) {
  const B = buckets[k];
  for (let i = B.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [B[i], B[j]] = [B[j], B[i]]; }
  // fewer stones first (cleaner problems), but keep some randomness
  B.sort((a, b) => (a.n + rnd() * 12) - (b.n + rnd() * 12));
}
const take = {}, short = [];
// scarce buckets first so they get their games
const order = Object.entries(Q).flatMap(([c, o]) => Object.entries(o).map(([t, n]) => ({ c, t: +t, n }))).sort((a, b) => (buckets[a.c + ':' + a.t] || []).length / a.n - (buckets[b.c + ':' + b.t] || []).length / b.n);
function fill(c, t, n, perGame) {
  const B = buckets[c + ':' + t] || [], got = take[c + ':' + t] = take[c + ':' + t] || [];
  for (const p of B) {
    if (got.length >= n) break;
    if (p.n > 70) continue;
    const s = sig(p); if (seenPos.has(s)) continue;
    const gk = p.g + ':' + p.k; if ((usedGame.get(gk) || 0) >= perGame) continue;
    if (got.some(q => q.g === p.g && Math.abs(q.k - p.k) < 6)) continue;   // never two problems of the same length from one game
    if (!verify(p)) continue;
    got.push(p); seenPos.add(s); usedGame.set(gk, (usedGame.get(gk) || 0) + 1);
  }
  return got.length;
}
for (const o of order) { const k = fill(o.c, o.t, o.n, 1); if (k < o.n) short.push(o); }
for (const o of short) fill(o.c, o.t, o.n, 3);
let have = Object.values(take).reduce((a, b) => a + b.length, 0);
// top up the remaining slots from the largest buckets (vct / intro)
for (const [c, t] of [['vct', 5], ['vct', 7], ['vct', 3], ['vct', 9], ['forbid', 7], ['forbid', 9], ['intro', 1], ['vcf', 3]]) {
  if (have >= TOTAL) break;
  const k = c + ':' + t, cur = (take[k] || []).length;
  fill(c, t, cur + (TOTAL - have), 3);
  have = Object.values(take).reduce((a, b) => a + b.length, 0);
}
const CATS = ['intro', 'vcf', 'vct', 'forbid'];
const cats = CATS.map(id => ({ id, levels: Object.keys(Q[id]).map(Number).filter(t => (take[id + ':' + t] || []).length).map(t => ({ n: t, puzzles: take[id + ':' + t].sort((a, b) => a.n - b.n).map(p => ({ b: p.b, w: p.w, side: p.side, a: p.a, pv: p.pv, last: p.last || undefined })) })) }));
const total = cats.reduce((a, C) => a + C.levels.reduce((x, L) => x + L.puzzles.length, 0), 0);
fs.writeFileSync(path.join(__dirname, '..', 'puzzles.json'), JSON.stringify({ v: 1, total, cats }));
console.log('total', total); for (const C of cats) console.log(C.id, C.levels.map(L => L.n + ':' + L.puzzles.length).join(' '));
