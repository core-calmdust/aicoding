// (2026-11-24 第2期 担当B, 追15) re-extend one opening's study line so that it does not run into another opening's line.
// node checkers/tools/op_reline.js <id> <keep> [msPerMove]
//   keeps the first <keep> plies (at least the named moves), then at each ply plays the engine's best move whose position is not
//   on any other opening's line — within 25 of the best, else it stops — up to 14 plies. The notes of the new plies are made the
//   way gen_openings.js makes them (the kind of move + the engine's verdict); the problems are unchanged.
const fs = require('fs'), path = require('path'), vm = require('vm');
const GEN = fs.readFileSync(path.join(__dirname, 'gen_openings.js'), 'utf8');
const head = GEN.slice(GEN.indexOf('const NEW4 = '), GEN.indexOf('(async () => {'));
const G = vm.runInNewContext(head + '\n;({ NOTE, EVW, AIW, LANGS })', { require: m => require(m), __dirname, Error });
const { NOTE, EVW, AIW, LANGS } = G;
const W = require('./wasm.js').loadSync(), E = W.E;
const F = path.join(__dirname, '..', 'openings.json'), O = JSON.parse(fs.readFileSync(F, 'utf8'));
const [id, keepS, msS] = process.argv.slice(2), g = O.sets.find(s => s.id === id), ms = +msS || 2500;
const named = g ? g.moves.split(' ').length : 0, keep = Math.max(named, +keepS || 0);
if (!g) { console.error('usage: op_reline.js <id> <keep>'); process.exit(1); }
const key = p => JSON.stringify(p.spec()), others = new Set();
for (const o of O.sets) { if (o === g) continue; let p = E.Pos.from(null); for (const m of o.study.line) { p = p.clone().play(m); others.add(key(p)); } }
const CENTER = [13, 14, 17, 18, 9, 10, 21, 22];
const line = g.study.line.slice(0, keep), notes = g.study.notes.slice(0, keep);
W.newGame();
while (line.length < 14) {
  const L = W.analyze(null, line, ms).list; if (!L.length) break;
  const before = E.replay(null, line).pos, pick = L.find(e => !others.has(key(before.clone().play(e.m))));
  if (!pick || L[0].v - pick.v > 25) { console.error(`ply ${line.length + 1}: no move off the other lines within 25 (best ${L[0].v}, ${pick && pick.v})`); process.exit(1); }
  if (pick !== L[0]) console.error(`ply ${line.length + 1}: ${E.name(before, pick.m)} (${pick.v}) instead of ${E.name(before, L[0].m)} (${L[0].v}), which meets another line`);
  const m = pick.m; line.push(m);
  const f = E.mFrom(m), tt = E.mTo(m), cap = E.mCap(m);
  const k = cap ? (before.clone().play(m).hasCaps() ? 'exch' : 'jump') : CENTER.includes(tt) ? 'center' : (before.turn === 1 ? f < 4 : f >= 28) ? 'back' : [3, 4, 11, 12, 19, 20, 27, 28].includes(tt + 1) ? 'side' : 'dev';
  const vb = (before.turn === 1 ? 1 : -1) * pick.v, ev = Math.abs(vb) < 25 ? 'even' : vb > 0 ? 'b' : 'w';
  const note = {}; for (const l of LANGS) note[l] = NOTE[k][l] + AIW(l)[0] + EVW[ev][l] + AIW(l)[1];
  notes.push(note);
}
g.study = { line, notes };
fs.writeFileSync(F, JSON.stringify(O));
{ let p = E.Pos.from(null); console.log(id, line.map(m => { const s = E.name(p, m); p = p.clone().play(m); return s; }).join(' ')); }
