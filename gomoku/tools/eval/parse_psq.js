// Collect 15x15 Gomocup games (renju / standard / freestyle) -> jsonl {rule, moves, winner, src}
'use strict';
const fs = require('fs'), path = require('path');
const E = require('/home/claude/aicoding/gomoku/engine.js');
const ROOT = '/home/claude/work/ext';
const out = fs.openSync('/home/claude/work/eval/games.jsonl', 'w');
let n = 0; const cnt = {};
function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); const st = fs.statSync(p); if (st.isDirectory()) walk(p); else if (f.endsWith('.psq')) one(p); } }
function one(p) {
  const L = fs.readFileSync(p, 'latin1').split(/\r?\n/);
  const h = L[0].match(/(\d+)x(\d+)/); if (!h || h[1] !== '15' || h[2] !== '15') return;
  const dir = path.basename(path.dirname(p)).toLowerCase();
  const rule = dir.startsWith('renju') ? 'renju' : dir.startsWith('standard') ? 'standard' : dir.startsWith('freestyle') || dir.startsWith('caro') ? (dir.startsWith('caro') ? null : 'free') : null;
  if (!rule) return;
  const mv = [];
  for (let k = 1; k < L.length; k++) { const m = L[k].match(/^(\d+),(\d+),/); if (!m) break; mv.push((+m[2] - 1) * 15 + (+m[1] - 1)); }
  if (mv.length < 6) return;
  // replay without opening restrictions (tournament openings are given positions)
  const pos = E.setup(rule, { b: [], w: [] }); let ok = true;
  for (const m of mv) { if (m < 0 || m >= 225 || pos.at(m)) { ok = false; break; } pos.make(m); }
  if (!ok) return;
  const st = pos.status();
  const winner = st.over && st.winner ? st.winner : 0;
  fs.writeSync(out, JSON.stringify({ rule, moves: mv, winner, src: p.replace(ROOT + '/', '') }) + '\n'); n++;
  const k = rule + ':' + (winner ? 'w' : 'u'); cnt[k] = (cnt[k] || 0) + 1;
}
walk(ROOT);
console.log(n, cnt);
