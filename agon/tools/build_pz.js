// Builds puzzles.json ("win in N", kind duel) from the candidates of tools/gen_duel.js (self-play: tools/duel_raw.jsonl) and
// tools/gen_pz.js (constructed: tools/pz_c*.jsonl). Themes: x2 = win in 2 (White and Black), w3 / b3, w4 / b4, w5 / b5 by the
// side to move. Diversity: a winning first move (from-to) at most twice per theme, never twice in a row; real-game positions
// first. node tools/build_pz.js > puzzles.json
const fs = require('fs'), path = require('path');
const E = require('../engine.js'); E.setRule('std');
const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => /^(duel_raw|pz_c\d+)\.jsonl$/.test(f)).sort();
const all = [], seen = new Set();
for (const f of files) for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) {
  if (!line.trim()) continue; const d = JSON.parse(line); const k = d.s.b + d.s.side; if (seen.has(k)) continue; seen.add(k);
  d.real = f === 'duel_raw.jsonl'; all.push(d);
}
const THEMES = [['x2', 'Step', d => d.n === 2, 24], ['w3', 'Step', d => d.n === 3 && d.s.side === 1, 24], ['b3', 'Step', d => d.n === 3 && d.s.side === 2, 24],
  ['w4', 'Tac', d => d.n === 4 && d.s.side === 1, 24], ['b4', 'Tac', d => d.n === 4 && d.s.side === 2, 24], ['w5', 'End', d => d.n === 5 && d.s.side === 1, 24], ['b5', 'End', d => d.n === 5 && d.s.side === 2, 24]];
const themes = [];
for (const [id, grp, test, max] of THEMES) {
  const pool = all.filter(test).sort((a, b) => (b.real - a.real) || (a.all - b.all));
  const cnt = new Map(), out = [];
  let last = '';
  const rest = pool.slice();
  while (out.length < max && rest.length) {
    let j = rest.findIndex(d => { const k = d.ok[0] % 92 + '-' + Math.floor(d.ok[0] / 92); return (cnt.get(k) || 0) < 2 && k !== last; });
    if (j < 0) break;
    const d = rest.splice(j, 1)[0], k = d.ok[0] % 92 + '-' + Math.floor(d.ok[0] / 92);
    cnt.set(k, (cnt.get(k) || 0) + 1); last = k;
    out.push({ s: d.s, n: d.n, a: d.ok[0] });
  }
  // easier first inside a theme: fewer legal moves
  out.sort((a, b) => E.Pos.from(a.s).moves().length - E.Pos.from(b.s).moves().length);
  themes.push({ id, grp, puzzles: out });
  console.error(id, out.length, 'of', pool.length);
}
console.log(JSON.stringify({ version: 1, rule: 'std', kind: 'duel', daily: THEMES.map(t => t[0]), themes }));
