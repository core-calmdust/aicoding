// Kōnane: builds konane/puzzles.json from the raw candidates of gen_puzzles.js (JSON lines), re-checking every puzzle with the
// exact solver: the side to move wins in exactly n (duelMin), the winning first moves are the stored ones (duelGood).
//   node konane/tools/build_puzzles.js raw1.jsonl [raw2.jsonl …]
// Themes (PZBook v2 "win in N"): grp Win — w1 … w5; grp Tac — stop (the win stops a jump line early), chain (the win is a
// multiple jump; stopping after the first jump loses). Each theme is ordered easy → hard (fewer legal moves, fewer stones).
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
E.setRule('s8');
const MAX = 36, MAX_W1 = 10;   // win-in-1 is easy: only the 10 hardest
const raw = [];
for (const f of process.argv.slice(2)) for (const l of fs.readFileSync(f, 'utf8').split('\n')) if (l.trim()) raw.push(JSON.parse(l));
const uniq = new Map(); for (const p of raw) { const k = p.s.b + p.s.side; if (!uniq.has(k)) uniq.set(k, p); }
const used = new Set(), take = (list, n) => { const out = []; for (const p of list) { if (out.length >= n) break; const k = p.s.b + p.s.side; if (used.has(k)) continue; used.add(k); out.push(p); } return out; };
const diff = p => p.nm * 4 + p.stones * 0.5 + p.n * 30;
const all = [...uniq.values()].sort((a, b) => diff(a) - diff(b));
// verify
let bad = 0;
const ok = all.filter(p => {
  const n = E.duelMin(p.s, [], 5, 's8', 3e6); if (n !== p.n) { bad++; return false; }
  const pos = E.Pos.from(p.s), g = E.duelGood(p.s, [], p.n, 's8', 3e6); if (!g) { bad++; return false; }
  const names = g.map(m => E.name(pos, m)).sort().join(' ');
  if (names !== p.good.slice().sort().join(' ')) { bad++; return false; }
  return true;
});
const chain = take(ok.filter(p => p.tags.includes('chain') && p.n >= 2 && p.n <= 3), MAX);
const stop = take(ok.filter(p => p.tags.includes('stop')), MAX);
const T = [];
for (let n = 1; n <= 5; n++) T.push({ id: 'w' + n, grp: 'Win', puzzles: n === 1 ? take(ok.filter(p => p.n === 1).reverse(), MAX_W1) : take(ok.filter(p => p.n === n), MAX) });
T.push({ id: 'stop', grp: 'Tac', puzzles: stop }, { id: 'chain', grp: 'Tac', puzzles: chain });
for (const t of T) t.puzzles = t.puzzles.sort((a, b) => diff(a) - diff(b)).map(p => ({ s: { b: p.s.b, side: p.s.side }, n: p.n, a: p.nm }));
const out = { version: 2, rule: 's8', kind: 'duel', daily: ['w1', 'w2', 'stop', 'w3', 'chain', 'w2', 'w4'], themes: T };
fs.writeFileSync(path.join(__dirname, '..', 'puzzles.json'), JSON.stringify(out));
process.stderr.write(`candidates ${uniq.size}, rejected ${bad}; ` + T.map(t => t.id + ' ' + t.puzzles.length).join(', ') + '\n');
