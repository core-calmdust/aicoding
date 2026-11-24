// (2026-11-24 第2期・担当A) the shots / race questions' board facts, counted over the 36 rolls with the rules (bg.js genPlays):
//   n = rolls that hit the marked blot, ds = the shooters' distances, dn = hitting rolls with a direct number (a distance ≤ 6 on a die),
//   cl = the other hitting rolls (sums / doubles), bl = rolls that would hit by the count alone (a die, the sum, a double's 2-4 steps)
//   but cannot because a landing point on the way is the blot owner's point, S = the per-distance counts added up (one roll counted
//   once per shooter). `node backgammon/tools/shots_facts.js` prints them; --write stores them in lessons.json (qv) and reorders.
const path = require('path'), fs = require('fs');
const BG = require(path.join(__dirname, '..', 'bg.js'));
const dec = s => { const p = new Int8Array(52); for (let i = 0; i < 52; i++) p[i] = parseInt(s[i], 16); return p; };
const T1 = { 1: 11, 2: 12, 3: 14, 4: 15, 5: 15, 6: 17, 7: 6, 8: 6, 9: 5, 10: 3, 11: 2, 12: 3, 15: 1, 16: 1, 18: 1, 20: 1, 24: 1 };
function shotFacts(pos, sd, pt) {
  const p = dec(pos), o = 1 - sd, m = sd * 26, om = o * 26, t = 25 - pt;
  const ds = []; for (let i = 25; i >= 1; i--) if (p[om + i] && i > t && !ds.includes(i - t)) ds.push(i - t); ds.sort((a, b) => a - b);
  const hits = [], direct = [], combo = [], blocked = [];
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) {
    const hit = BG.genPlays(p, o, a, b).some(x => x.pos[m + pt] === 0 && x.pos[m + 25] > p[m + 25]);
    const steps = a === b ? [a, 2 * a, 3 * a, 4 * a] : [a, b, a + b], naive = ds.some(d => steps.includes(d));
    const r = a + '-' + b;
    if (hit) { hits.push(r); (ds.includes(a) || ds.includes(b) ? direct : combo).push(r); } else if (naive) blocked.push(r);
  }
  return { n: hits.length, p: Math.round(hits.length / 36 * 100), d: ds[0], ds, dn: direct.length, cn: combo.length, cl: combo, bn: blocked.length, bl: blocked,
    S: ds.reduce((s, d) => s + (T1[d] || 0), 0), hits };
}
// what a wrong count overlooks (the same kinds the 2D ls.ng.* and the 3D words name)
function shotKind(v, x) {
  if (x < v.n) return x === v.dn ? 'direct' : 'low';
  if (v.bn && x === v.n + v.bn) return 'block';
  if (v.ds.length > 1 && x === v.S) return 'dup';
  return 'high';
}
module.exports = { shotFacts, shotKind, dec };
if (require.main === module) {
  const F = path.join(__dirname, '..', 'lessons.json'), L = JSON.parse(fs.readFileSync(F, 'utf8'));
  for (const s of L.steps) for (const [k, P] of s.problems.entries()) if (P.q === 'shots') { const f = shotFacts(P.pos, P.mk[0][0], P.mk[0][1]); delete f.hits; console.log(s.id, k, JSON.stringify(f)); }
}
