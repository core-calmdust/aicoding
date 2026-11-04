// Checks lessons.json: every problem position is legal-looking, its answer set is non-empty, made of legal moves, not every
// move, and (for ok-sets) that `best` is in it; ramp "try" answers are legal move names. node tools/check_lessons.js
const E = require('../engine.js'); E.setRule('std');
const L = require('../lessons.json'); let bad = 0;
for (const st of L.steps) {
  for (const [k, P] of st.problems.entries()) {
    const pos = E.Pos.from(P.s), legal = pos.moves();
    const err = m => { bad++; console.log(st.id, k, m); };
    if (E.judge(pos).over) err('position already over');
    if (P.ok) { if (!P.ok.length) err('empty ok'); if (P.ok.some(m => !legal.includes(m))) err('illegal ok'); if (P.ok.length === legal.length) err('every move ok'); if (!P.ok.includes(P.best)) err('best not in ok'); }
    else if (P.sc) { if (P.sc.length !== legal.length) err('sc does not cover the moves'); if (!legal.includes(P.best)) err('illegal best'); }
    else err('no answer');
  }
  for (const it of st.ramp || []) if (it.k === 'try') { const pos = E.Pos.from(it.s); const names = pos.moves().map(m => E.name(pos, m)); if (it.ok.some(n => !names.includes(n))) { bad++; console.log(st.id, 'ramp try: illegal', it.ok); } }
}
console.log(bad ? bad + ' problem(s)' : 'lessons ok: ' + L.steps.length + ' steps, ' + L.steps.reduce((a, s) => a + s.problems.length, 0) + ' problems');
process.exit(bad ? 1 : 0);
