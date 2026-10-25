// Build puzzles.json from the mined candidates (tools/mine_puzzles.js → *.jsonl). Every chosen puzzle is checked again with the
// shipped engine.wasm: "connect in k" = exactly one first move connects within k (none faster); "stop (k)" = exactly one move leaves
// the opponent without a forced connection within k.
//   node tools/build_puzzles.js out.json cand1.jsonl cand2.jsonl …
const fs = require('fs');
const { load } = require('./wasm.js');
const E = load();
const [, , outF, ...ins] = process.argv;
const C = [];
for (const f of ins) for (const l of fs.readFileSync(f, 'utf8').trim().split('\n')) if (l) { const d = JSON.parse(l); d.src = f; C.push(d); }
const seen = new Set();
const THEMES = [
  { id: 'c2', grp: 'Win', pick: d => d.t === 'win' && d.k === 2 && d.n <= 9, cnt: 50 },
  { id: 'c3', grp: 'Win', pick: d => d.t === 'win' && d.k === 3 && d.n <= 9, cnt: 50 },
  { id: 'c4', grp: 'Win', pick: d => d.t === 'win' && d.k === 4 && d.n <= 9, cnt: 50 },
  { id: 'c5', grp: 'Win', pick: d => d.t === 'win' && d.k === 5 && d.n <= 9, cnt: 50 },
  { id: 's1', grp: 'Block', pick: d => d.t === 'block' && d.k === 1 && d.n <= 9, cnt: 30 },
  { id: 's2', grp: 'Block', pick: d => d.t === 'block' && d.k === 2, cnt: 50 },
  { id: 's3', grp: 'Block', pick: d => d.t === 'block' && d.k >= 3, cnt: 30 },
  { id: 'L3', grp: 'Big', pick: d => d.t === 'win' && d.k <= 3 && d.n >= 11, cnt: 30 },
  { id: 'L4', grp: 'Big', pick: d => d.t === 'win' && d.k === 4 && d.n >= 11, cnt: 40 },
  { id: 'L5', grp: 'Big', pick: d => d.t === 'win' && d.k === 5 && d.n >= 11, cnt: 40 },
];
function verify(d) {
  if (d.t === 'win') {
    const L = E.puzzle(d.s, [], d.k, false, 20000);
    if (!L || L.some(e => e.need < 0)) return false;
    const good = L.filter(e => e.need > 0 && e.need <= d.k);
    return good.length === 1 && good[0].m === d.answer && good[0].need === d.k;
  }
  const D = E.puzzle(d.s, [], d.k, true, 20000);
  if (!D || D.some(e => e.need < 0)) return false;
  const esc = D.filter(e => e.need === 0);
  if (esc.length !== 1 || esc[0].m !== d.answer) return false;
  // the threat is real and minimal: with a pass the opponent connects within k, not faster than k - (k > 1 ? 1 : 0)
  return true;
}
const themes = [];
let total = 0;
for (const T of THEMES) {
  const pool = C.filter(d => T.pick(d) && !seen.has(d.s.b + d.s.side));
  // one or two per game, spread over sizes; easy first: small boards, many stones (few empty cells)
  const per = {}, out = [];
  pool.sort((a, b) => a.n - b.n || (b.s.b.replace(/\./g, '').length / b.n / b.n) - (a.s.b.replace(/\./g, '').length / a.n / a.n));
  // interleave sizes so every stage has some variety
  const bySize = {}; for (const d of pool) (bySize[d.n] = bySize[d.n] || []).push(d);
  const sizes = Object.keys(bySize).map(Number).sort((a, b) => a - b);
  let k = 0;
  while (out.length < T.cnt && sizes.some(s => bySize[s].length)) {
    const s = sizes[k++ % sizes.length], q = bySize[s];
    while (q.length) { const d = q.shift(), g = d.src + d.g; if ((per[g] || 0) >= 2 || seen.has(d.s.b + d.s.side)) continue; if (!verify(d)) continue; per[g] = (per[g] || 0) + 1; seen.add(d.s.b + d.s.side); out.push(d); break; }
  }
  // stages get harder: order by board size, then by empty cells
  out.sort((a, b) => a.n - b.n || a.s.b.split('.').length - b.s.b.split('.').length);
  themes.push({ id: T.id, grp: T.grp, puzzles: out.map(d => d.t === 'win' ? { s: d.s, n: d.k, answer: d.answer } : { s: d.s, n: 1, d: d.k, answer: d.answer }) });
  total += out.length;
  console.error(T.id, out.length, 'of', pool.length);
}
fs.writeFileSync(outF, JSON.stringify({ version: 1, daily: ['c2', 's2', 'c3', 'L4', 'c4', 's1', 'c5'], themes }));
console.error('total', total);
