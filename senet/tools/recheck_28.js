// 2026-11-07 rule change (28 / 29 may also move forward): re-check the puzzles / lesson problems where that move exists.
// Keeps a problem when its answer is still the best by ≥ .05 (depth 3, the same test as gen_learn.js), refreshes its
// candidate list; otherwise removes it. node tools/recheck_28.js
const fs = require('fs'), path = require('path'), E = require('../engine.js');
const r2 = x => Math.round(x * 1000) / 1000;
for (const f of ['puzzles.json', 'lessons.json']) {
  const file = path.join(__dirname, '..', f), D = JSON.parse(fs.readFileSync(file, 'utf8'));
  let kept = 0, dropped = 0;
  const check = o => {
    const s = E.newGame(o.s.rule || 'std'); s.pos = o.s.pos.map(a => a.slice()); s.turn = o.s.turn;
    if (!E.legalMoves(s, o.n).some(m => (m.from === 28 || m.from === 29) && m.to <= 30)) return true;
    const ev = E.evaluate(s, o.n, { depth: 3 }), b = ev[0].move, gap = ev.length > 1 ? ev[0].wp - ev[1].wp : 1;
    const to = m => m.to >= E.GOAL ? E.GOAL : m.to;
    if (!o.best || b.from !== o.best[0] || to(b) !== o.best[1] || gap < .05) { dropped++; return false; }
    o.ev = ev.map(e => [e.move.from, to(e.move), r2(e.wp)]); o.gap = r2(gap); kept++; return true;
  };
  const walk = o => {
    if (Array.isArray(o)) { for (let i = o.length - 1; i >= 0; i--) { const x = o[i]; if (x && x.s && x.s.pos && x.n && x.best) { if (!check(x)) o.splice(i, 1); } else walk(x); } }
    else if (o && typeof o === 'object') for (const v of Object.values(o)) walk(v);
  };
  walk(D);
  if (D.total != null) { let n = 0; const cnt = o => { if (Array.isArray(o)) o.forEach(x => x && x.s && x.n ? n++ : cnt(x)); else if (o && typeof o === 'object') Object.values(o).forEach(cnt); }; cnt(D.themes); D.total = n; }
  fs.writeFileSync(file, JSON.stringify(D));
  console.log(f, 'kept', kept, 'dropped', dropped);
}
