// Adds the warm-up pages (tools/lesson_ramps.js) to tafl/lessons.json without touching the problems (as the other games'
// gen_ramps.js): explain — every move of seq must be legal in turn (by its engine.js name); try — ok = every right move by the
// rule (move codes; okn = their names), a "try" where every move is right is refused. node tools/gen_ramps.js
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
const { RAMPS, UI } = require('./lesson_ramps.js');
const N = 11, F = E.Pos.from(null, 'copenhagen').G.F;
const routes = q => { if (q.res) return q.res === 2 ? 9 : 0; const c = q.clone(); c.turn = 2; return c.moves().filter(m => m % 256 === c.king && (F[Math.floor(m / 256)] & 8)).length; };
const RULE = {
  cap: (p, L) => L.filter(m => p.capsOf(m).length > 0),
  tuichi: (p, L) => L.filter(m => { const q = p.clone().play(m); if (q.res) return q.res === 2; return routes(q) >= 2 && q.moves().every(r => routes(q.clone().play(r)) >= 1); }),
  block: (p, L) => L.filter(m => { const q = p.clone().play(m); return !q.res && routes(q) === 0; }),
};
const pt = s => { const i = E.sqParse(s, N); if (i < 0) throw new Error('square ' + s); return i; };
const file = path.join(__dirname, '..', 'lessons.json'), L = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const st of L.steps) delete st.ramp;
for (const [id, items] of Object.entries(RAMPS)) {
  const st = L.steps.find(s => s.id === id); if (!st) throw new Error('no step ' + id);
  st.ramp = items.map(it => {
    const p = E.Pos.from(it.s, it.s.v); if (p.res || p.status() !== 0) throw new Error(id + ': position over');
    if (it.k === 'explain') {
      let q = p;
      for (const [n] of it.seq) { const m = q.moves().find(x => E.name(q, x) === n); if (m === undefined) throw new Error(id + ': no move ' + n); q = q.clone().play(m); }
      return { k: 'explain', s: it.s, seq: it.seq, marks: it.marks.map(([s, c]) => [pt(s), c]), t: it.t, body: it.body };
    }
    const ms = p.moves(), ok = RULE[it.rule](p, ms);
    if (!ok.length || ok.length === ms.length) throw new Error(id + ': no clear answer');
    return { k: 'try', s: it.s, ok, okn: ok.map(m => E.name(p, m)), look: it.look.map(pt), g: it.g, h: it.h, y: it.y };
  });
  process.stderr.write(id + ': ' + st.ramp.map(r => r.k + (r.okn ? ' ok=' + r.okn.join(',') : '')).join(' | ') + '\n');
}
L.rampUi = UI;
fs.writeFileSync(file, JSON.stringify(L));
