// Adds the warm-up pages (tools/lesson_ramps.js) to alquerque/lessons.json without touching the problems:
//   explain — every move of seq must be legal in turn (by name); marks / look become point numbers
//   try     — ok = the right moves by the rule (all of them, by name); the page refuses a "try" where every move is right
// node tools/gen_ramps.js
'use strict';
const fs = require('fs'), path = require('path');
const A = require('./alqlib.js');
const { RAMPS, UI } = require('./lesson_ramps.js');
(async () => {
  const E = await A.init();
  const cap = (p, m) => A.capN(E, p, m), nm = (p, m) => E.name(p, m);
  const oppMax = q => q.status() !== 0 || !q.hasCaps() ? 0 : Math.max(...q.moves().map(m => cap(q, m)));
  const RULE = {
    max: (p, L) => { const mx = Math.max(...L.map(m => cap(p, m))); return L.filter(m => cap(p, m) === mx); },
    safe: (p, L) => L.filter(m => oppMax(p.clone().play(m)) === 0),
    block: (p, L) => L.filter(m => { const q = p.clone().play(m); return q.status() === -1 && q.count(3 - p.turn) > 0; }),
    net: (p, L) => { const v = L.map(m => cap(p, m) - oppMax(p.clone().play(m))), b = Math.max(...v); return L.filter((m, i) => v[i] === b); },
  };
  const pt = s => { const i = E.pparse(s); if (i < 0 || i === undefined || i === null) throw new Error('point ' + s); return i; };
  const file = path.join(__dirname, '..', 'lessons.json'), L = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const st of L.steps) delete st.ramp;
  for (const [id, items] of Object.entries(RAMPS)) {
    const st = L.steps.find(s => s.id === id); if (!st) throw new Error('no step ' + id);
    st.ramp = items.map(it => {
      const p = E.Pos.from(it.s); if (p.status() !== 0) throw new Error(id + ': position over');
      if (it.k === 'explain') {
        let q = p;
        for (const [n] of it.seq) { const m = q.moves().find(x => nm(q, x) === n); if (!m) throw new Error(id + ': no move ' + n); q = q.clone().play(m); }
        return { k: 'explain', s: it.s, seq: it.seq, marks: it.marks.map(([s, c]) => [pt(s), c]), t: it.t, body: it.body };
      }
      const ms = p.moves(), ok = RULE[it.rule](p, ms);
      if (!ok.length || ok.length === ms.length) throw new Error(id + ': no clear answer');
      return { k: 'try', s: it.s, ok: ok.map(m => nm(p, m)), look: it.look.map(pt), g: it.g, h: it.h, y: it.y };
    });
    process.stderr.write(id + ': ' + st.ramp.map(r => r.k + (r.ok ? ' ok=' + r.ok.join(',') : '')).join(' | ') + '\n');
  }
  L.rampUi = UI;
  fs.writeFileSync(file, JSON.stringify(L));
})();
