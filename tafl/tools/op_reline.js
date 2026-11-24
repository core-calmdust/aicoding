// (2026-11-24 第2期 担当B, 追15) re-extend one opening's study line so that it does not run into another opening's line.
// node tafl/tools/op_reline.js <id> <keep> [msPerPosition]
//   keeps the first <keep> plies of the line (they may be another plan's first moves), then at each ply plays the engine's best move whose position (8 symmetries) is not
//   on any other opening's line (at any ply) — within 60 of the best, else it stops with an error — up to 14 plies; the notes of
//   the new plies come from gen_openings.js (noteOf + the engine's verdict), the kept plies keep their notes. Problems unchanged.
const fs = require('fs'), path = require('path'), vm = require('vm');
const GEN = fs.readFileSync(path.join(__dirname, 'gen_openings.js'), 'utf8');
const head = GEN.slice(0, GEN.indexOf('function extend(')).replace(/const MS = [^,]+,/, 'const MS = +process.argv[4] || 2500,');
const G = vm.runInNewContext(head + '\n;({ E, analyze, noteOf, evalWord, join, V })', { require: m => require(m.startsWith('.') ? path.join(__dirname, m) : m), __dirname, process, console, WebAssembly, Date, Int32Array, Math, JSON, Object, Error, Set });
const { E, analyze, noteOf, evalWord, join, V } = G;
const F = path.join(__dirname, '..', 'openings.json'), O = JSON.parse(fs.readFileSync(F, 'utf8'));
const [id, keepS] = process.argv.slice(2), keep = +keepS, g = O.sets.find(s => s.id === id);
if (!g || !(keep >= 1)) { console.error('usage: op_reline.js <id> <keep>'); process.exit(1); }
const SYM = [(r, c) => [r, c], (r, c) => [r, 10 - c], (r, c) => [10 - r, c], (r, c) => [10 - r, 10 - c], (r, c) => [c, r], (r, c) => [c, 10 - r], (r, c) => [10 - c, r], (r, c) => [10 - c, 10 - r]];
const can = q => SYM.map(S => { let o = ''; const b = q.spec().b; for (let i = 0; i < 121; i++) { const [r, c] = S((i / 11) | 0, i % 11); o += b[r * 11 + c]; } return o; }).sort()[0] + q.turn;
const others = new Set();
for (const o of O.sets) { if (o === g) continue; let q = E.Pos.from(null, V); for (const m of o.study.line) { q = q.clone().play(m); others.add(can(q)); } }
const line = g.study.line.slice(0, keep), notes = g.study.notes.slice(0, keep);
while (line.length < 14) {
  const L = analyze(line, +process.argv[4] || 2500); if (!L.length) break;
  const { pos } = E.replay(null, line, V);
  const pick = L.find(([m]) => !others.has(can(pos.clone().play(m))));
  if (!pick || L[0][1] - pick[1] > 60) { console.error(`ply ${line.length + 1}: no move off the other lines within 60 (best ${L[0][1]}, ${pick && pick[1]})`); process.exit(1); }
  if (pick !== L[0]) console.error(`ply ${line.length + 1}: ${E.name(pos, pick[0])} (${pick[1]}) instead of ${E.name(pos, L[0][0])} (${L[0][1]}), which meets another line`);
  line.push(pick[0]); const i = line.length - 1;
  const A = analyze(line, 600), vv = A.length ? A[0][1] * (i % 2 === 0 ? -1 : 1) : 0;
  notes.push(join(noteOf(pos, pick[0]), evalWord(vv)));
  if (E.replay(null, line, V).pos.res) break;
}
g.study = { line, notes };
fs.writeFileSync(F, JSON.stringify(O));
{ let q = E.Pos.from(null, V); console.log(id, line.map(m => { const s = E.name(q, m); q = q.clone().play(m); return s; }).join(' ')); }
