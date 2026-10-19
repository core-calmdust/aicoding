// generators for the relation variants (ineq / antiknight / kropki / thermo / arrow), used by build_variants2.js
const E = require('../engine.js');
const ROWC = i => [(i / 9) | 0, i % 9];
/* king-move neighbours (orthogonal + diagonal) */
const N8 = i => { const [r, c] = ROWC(i), a = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const y = r + dr, x = c + dc; if (y >= 0 && y < 9 && x >= 0 && x < 9) a.push(y * 9 + x); } return a; };
/* orthogonally adjacent pairs [a, b] with a < b (inBox: only pairs inside one 3x3 box) */
function adjPairs(inBox) {
  const out = [];
  for (let i = 0; i < 81; i++) {
    const [r, c] = ROWC(i);
    if (c < 8 && (!inBox || c % 3 !== 2)) out.push([i, i + 1]);
    if (r < 8 && (!inBox || r % 3 !== 2)) out.push([i, i + 9]);
  }
  return out;
}
/* greater-than signs for the given pairs: [a, b] means value(a) > value(b) */
const ineqSigns = (full, pairs = adjPairs(true)) => pairs.map(([a, b]) => (full[a] > full[b] ? [a, b] : [b, a]));
/* all consecutive orthogonal pairs (white dots; unmarked pairs are non-consecutive) */
const kropkiDots = full => adjPairs(false).filter(([a, b]) => Math.abs(full[a] - full[b]) === 1);
/* random non-overlapping thermometers (strictly increasing paths, king adjacency) */
function thermos(full, rng, { count = [4, 10], len = [3, 7] } = {}) {
  const used = new Uint8Array(81), out = [];
  const want = count[0] + ((rng() * (count[1] - count[0] + 1)) | 0);
  for (let tries = 0; out.length < want && tries < 400; tries++) {
    const L = len[0] + ((rng() * (len[1] - len[0] + 1)) | 0);
    const start = (rng() * 81) | 0; if (used[start] || full[start] > 10 - L) continue;
    const path = [start];
    while (path.length < L) {
      const last = path[path.length - 1];
      const nx = N8(last).filter(n => !used[n] && !path.includes(n) && full[n] > full[last] && full[n] <= full[last] + 1 + (9 - full[last] - (L - path.length)) && !crosses(path, last, n, out));
      if (!nx.length) break;
      // prefer small steps so long thermos stay possible
      nx.sort((a, b) => full[a] - full[b]);
      path.push(nx[(rng() * Math.min(2, nx.length)) | 0]);
    }
    if (path.length < len[0]) continue;
    for (const i of path) used[i] = 1; out.push(path);
  }
  return out;
}
/* a diagonal step a→b must not cross another diagonal step (visual clarity) */
function crosses(path, a, b, others) {
  const [ra, ca] = ROWC(a), [rb, cb] = ROWC(b);
  if (ra === rb || ca === cb) return false;
  const x = ra * 9 + cb, y = rb * 9 + ca;
  for (const p of [path, ...others]) for (let k = 1; k < p.length; k++) if ((p[k - 1] === x && p[k] === y) || (p[k - 1] === y && p[k] === x)) return true;
  return false;
}
/* random arrows: circle + shaft path (king adjacency from the circle) whose digits sum to the circle */
function arrows(full, rng, { count = [5, 10], len = [2, 4] } = {}) {
  const used = new Uint8Array(81), out = [];
  const want = count[0] + ((rng() * (count[1] - count[0] + 1)) | 0);
  for (let tries = 0; out.length < want && tries < 2000; tries++) {
    const c = (rng() * 81) | 0; if (used[c] || full[c] < 3) continue;
    const L = len[0] + ((rng() * (len[1] - len[0] + 1)) | 0);
    let res = null;
    (function dfs(path, sum) {
      if (res) return;
      if (path.length === L) { if (sum === full[c]) res = path.slice(); return; }
      const last = path.length ? path[path.length - 1] : c;
      const nx = E.shuffle(N8(last).filter(n => !used[n] && n !== c && !path.includes(n) && sum + full[n] + (L - path.length - 1) <= full[c] && !crosses([c, ...path], last, n, out.map(([cc, p]) => [cc, ...p]))), rng);
      for (const n of nx) { path.push(n); dfs(path, sum + full[n]); path.pop(); if (res) return; }
    })([], 0);
    if (!res) continue;
    used[c] = 1; for (const i of res) used[i] = 1; out.push([c, res]);
  }
  return out;
}
module.exports = { adjPairs, ineqSigns, kropkiDots, thermos, arrows, N8 };
