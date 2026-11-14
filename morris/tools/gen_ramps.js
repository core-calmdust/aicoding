// Adds the warm-up pages (tools/lesson_ramps.js) to morris/lessons.json (nine men's morris) without touching the problems:
//   explain — every move of seq must be legal in turn (by its page name); marks / look become point numbers
//   try     — ok = every right move by the rule, as move codes (the page compares the move it gets); a "try" where every
//             move is right is refused
// node tools/gen_ramps.js
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
const { RAMPS, UI } = require('./lesson_ramps.js');
const G = E.geom('nine'), NONE = E.NONE;
const nm = m => { const f = m & 31, t = (m >> 5) & 31, r = (m >> 10) & 31; return (f === NONE ? '' : G.names[f] + '-') + G.names[t] + (r === NONE ? '' : '×' + G.names[r]); };
const thr = (pos, p) => { const out = new Set(), b = pos.b; for (const m of G.mills) { const own = m.filter(i => b[i] === p).length, emp = m.filter(i => !b[i]); if (own === 2 && emp.length === 1) out.add(emp[0]); } return [...out]; };
const after = (pos, m) => { const q = pos.clone(); q.play(m); return q; };
const RULE = {
  block: (p, L) => L.filter(m => thr(after(p, m), 3 - p.side).length === 0),
  fork: (p, L) => L.filter(m => thr(after(p, m), p.side).length >= 2),
  remove: (p, L) => L.filter(m => ((m >> 10) & 31) !== NONE && thr(after(p, m), 3 - p.side).length === 0),
};
const pt = s => { const i = G.names.indexOf(s); if (i < 0) throw new Error('point ' + s); return i; };
const file = path.join(__dirname, '..', 'lessons.json'), L = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const st of L.steps) delete st.ramp;
for (const [id, items] of Object.entries(RAMPS)) {
  const st = L.steps.find(s => s.id === id); if (!st) throw new Error('no step ' + id);
  st.ramp = items.map(it => {
    const p = E.Pos.from(G, it.s);
    if (it.k === 'explain') {
      let q = p;
      for (const [n] of it.seq) { const m = q.moves().find(x => nm(x) === n); if (m === undefined) throw new Error(id + ': no move ' + n); q = after(q, m); }
      return { k: 'explain', s: it.s, seq: it.seq, marks: it.marks.map(([s, c]) => [pt(s), c]), t: it.t, body: it.body };
    }
    const ms = p.moves(), ok = RULE[it.rule](p, ms);
    if (!ok.length || ok.length === ms.length) throw new Error(id + ': no clear answer');
    return { k: 'try', s: it.s, ok, okn: ok.map(nm), look: it.look.map(pt), g: it.g, h: it.h, y: it.y };
  });
  process.stderr.write(id + ': ' + st.ramp.map(r => r.k + (r.okn ? ' ok=' + r.okn.join(',') : '')).join(' | ') + '\n');
}
L.rampUi = UI;
fs.writeFileSync(file, JSON.stringify(L));
