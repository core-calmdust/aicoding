// (2026-11-24 担当D) Rebuild ugolki/puzzles.json so that every puzzle passes tools/lesson-verify-ugolki.js (①〜⑨, 追57):
// the current puzzles first (kept in place when they pass), then candidates from tools/gen_duel.js output (JSON lines).
// Each candidate is solved exactly (the strict solver of the verifier: the 40 / 80-move rules and Black's last move as in the game),
// must agree with the engine's duelGood, not reach the 40 / 80-move rule on the way, have 1–2 winning first moves, 3+ wrong ones,
// the natural move losing; no two positions within 4 squares under the board's symmetries (⑤, also against the lessons);
// each theme sorted by d (near misses × 2 + wrong moves) for easy → hard (⑥).
//   node ugolki/tools/fix_puzzles.js raw1.jsonl [raw2.jsonl …] > ugolki/puzzles.json
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const V = require(path.join(ROOT, 'tools/lesson-verify-ugolki.js'));
const E = require(path.join(ROOT, 'ugolki/engine.js'));
E.setRule('c33');
const R = E.R;
const OLD = JSON.parse(fs.readFileSync(path.join(ROOT, 'ugolki/puzzles.json'), 'utf8'));
const LS = JSON.parse(fs.readFileSync(path.join(ROOT, 'ugolki/lessons.json'), 'utf8'));
const SIZE = { x2: 8, w3: 24, b3: 24, w4: 24, b4: 24, w5: 24, b5: 24 };
const tidOf = x => x.n === 2 ? 'x2' : (x.s.side === 1 ? 'w' : 'b') + x.n;
const cands = [];
OLD.themes.forEach(T => T.puzzles.forEach(P => cands.push({ s: P.s, n: P.n, a: P.a, old: T.id })));
for (const f of process.argv.slice(2)) for (const line of fs.readFileSync(f, 'utf8').split('\n')) { if (!line.trim()) continue; try { const x = JSON.parse(line); cands.push({ s: x.s, n: x.n, a: x.a }); } catch (e) {} }
const seen = new Set(), ok = {};
for (const k in SIZE) ok[k] = [];
let i = 0;
for (const c of cands) {
  i++;
  const key = c.s.b + c.s.side; if (seen.has(key)) continue; seen.add(key);
  const tid = tidOf(c); if (!ok[tid]) continue;
  if (c.s.n + 2 * c.n + 1 >= 2 * R.cap || (c.s.n < 2 * R.limit && c.s.n + 2 * c.n + 1 >= 2 * R.limit)) continue;
  const pos = E.Pos.from(c.s), me = pos.turn; V.setMemo();
  const L = pos.moves(), good = V.goodSet(pos, c.n, me); if (!good.length || good.length > 2) continue;
  if (c.n > 1 && V.goodSet(pos, c.n - 1, me).length) continue;
  const eng = E.duelGood(c.s, [], c.n, 'c33', 2e7) || []; if (!(eng.length === good.length && eng.every(m => good.includes(m)))) continue;
  if (L.length < 4 || L.length - good.length < 3) continue;
  if (good.includes(V.greedy(pos))) continue;
  ok[tid].push({ s: c.s, n: c.n, a: good.includes(c.a) ? c.a : good[0], old: c.old });
  if (i % 50 === 0) process.stderr.write(`${i}/${cands.length}\n`);
}
// ⑤ greedy: the old ones first (their order), then the new
const pool = [];
(LS.steps || []).forEach(st => [...(st.problems || []), ...(st.ramp || [])].forEach(P => { if (P && P.s && typeof P.s.b === 'string' && P.s.b.length === 64) pool.push(P.s.b); }));
const varsOf = b => V.SYM.map(([f, sw]) => V.symB(b, f, sw));
const chosen = pool.map(b => ({ v: varsOf(b), b, lesson: true }));
const near = b => chosen.some(o => o.v.some(x => V.diff(b, x) <= 4));
const out = {};
for (const tid in SIZE) {
  out[tid] = [];
  for (const x of ok[tid]) { if (out[tid].length >= SIZE[tid]) break; if (near(x.s.b)) continue; chosen.push({ v: varsOf(x.s.b), b: x.s.b }); out[tid].push(x); }
  process.stderr.write(`${tid}: ${ok[tid].length} valid, ${out[tid].length} chosen (${out[tid].filter(x => x.old).length} old)\n`);
}
// ⑥ d for the order
const themes = [];
for (const [tid, grp] of [['x2', 'Step'], ['w3', 'Step'], ['b3', 'Step'], ['w4', 'Tac'], ['b4', 'Tac'], ['w5', 'End'], ['b5', 'End']]) {
  const L = out[tid].map(x => { const pos = E.Pos.from(x.s), me = pos.turn; V.setMemo(); const good = V.goodSet(pos, x.n, me), wrong = pos.moves().filter(m => !good.includes(m)); let nr = 0; for (const m of wrong) if (V.refutes(pos, m, x.n, me) <= 2) nr++; return Object.assign(x, { d: nr * 2 + wrong.length }); });
  L.sort((a, b) => a.d - b.d || a.s.n - b.s.n);
  themes.push({ id: tid, grp, puzzles: L.map(x => ({ s: { b: x.s.b, side: x.s.side, n: x.s.n }, n: x.n, a: x.a })) });
  process.stderr.write(`${tid} d ${L.map(x => x.d).join(' ')}\n`);
}
process.stdout.write(JSON.stringify({ version: 2, rule: 'c33', kind: 'duel', daily: OLD.daily, themes }) + '\n');
