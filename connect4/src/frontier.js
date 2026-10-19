// node frontier.js gen.txt D > frontier.txt : AI-to-move positions at ply D+2 just past the tree
const E = require('/home/claude/aicoding/connect4/engine.js');
const fs = require('fs');
const [f, D] = [process.argv[2], +process.argv[3]];
const tk = s => { const h = [0,0,0,0,0,0,0], p = [0,0,0,0,0,0,0]; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i) - 49; if (!(i & 1)) p[c] |= 1 << h[c]; h[c]++; }
  let a = 0, b = 0; for (let k = 6; k >= 0; k--) { a = a * 128 + ((1 << h[k]) | p[k]); b = b * 128 + ((1 << h[6 - k]) | p[6 - k]); } return b < a; };
const win1 = s => new Set(E.mateList(s, 1).filter(x => x.need === 1).map(x => x.c));
const out = [];
for (const l of fs.readFileSync(f, 'utf8').trim().split('\n')) {
  let [p, cm] = l.split(' '); if (p === '-') p = '';
  if (p.length !== D && p.length !== D - 1) continue;
  if (p.length + 2 <= D) continue;
  const mv = tk(p) ? 6 - +cm : +cm;
  if (win1(p).has(mv)) continue;
  const q = p + (mv + 1); const w = win1(q);
  for (let r = 0; r < 7; r++) { if (w.has(r) || !E.loadMoves(q + (r + 1))) continue; out.push(q + (r + 1)); }
}
console.log(out.join('\n'));
