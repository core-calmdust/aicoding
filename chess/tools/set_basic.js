// (2026-11-26 第2期 担当A) writes the chosen problems of b_check・b_escape・b_mate into chess/lessons.json (b_escape: sc = every legal
// move's value from the site's engine, 800000 nodes = tools/lesson-verify-chbasic.js). usage: node chess/tools/set_basic.js <json>
//   json: { "b_check": ["fen", ...], ... } — the answer is worked out from the board (the checks / the mate / the engine's best)
'use strict';
const fs = require('fs'), path = require('path');
const V = require(path.join(__dirname, '../../tools/lesson-verify-chbasic.js')), Lb = V.lib(), W = require('./wasm.js');
const file = path.join(__dirname, '../lessons.json'); let src = fs.readFileSync(file, 'utf8'); const LS = JSON.parse(src);
const pick = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const [sid, fens] of Object.entries(pick)) {
  const st = LS.steps.find(s => s.id === sid);
  st.problems = fens.map(fen => { const p = Lb.pos(fen), L = p.legal().map(m => p.uci(m));
    if (sid === 'b_check') return { fen, ok: L.filter(u => Lb.after(fen, u).inCheck()) };
    if (sid === 'b_mate') return { fen, ok: L.filter(u => { const q = Lb.after(fen, u); return q.inCheck() && !q.hasLegal(); }) };
    const R = W.analyze(fen, [], 8e5); return { fen, best: R[0].uci, sc: R.map(e => [e.uci, e.v]) }; });
}
// (only the problems of these steps change in the file: the rest keeps its own spacing)
for (const sid of Object.keys(pick)) {
  const a = src.indexOf('{"id":"' + sid + '"'), k = src.indexOf('"problems":', a) + '"problems":'.length; let d = 0, e = k;
  for (; e < src.length; e++) { const c = src[e]; if (c === '[') d++; else if (c === ']') { d--; if (!d) { e++; break; } } }
  src = src.slice(0, k) + JSON.stringify(LS.steps.find(s => s.id === sid).problems) + src.slice(e); }
JSON.parse(src); fs.writeFileSync(file, src);
