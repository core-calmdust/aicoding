// Puzzle audit (nine / twelve / six men's morris) with the solver calls the page makes (engine.js mate() / mill()):
//   - legal position, the stored answer is the only winning key (from-to; removal choice aside), no shorter win;
//   - the main line as the page plays it: the defender picks the longest resistance (pickDefence); among replies that
//     resist equally long the page used to take the first one in generation order. "tie" flags puzzles where that first
//     reply is clearly worse (>= 150 by a short engine search) than another equally long reply — an unnatural defence;
//   - the line reaches the goal within n.
// usage: node tools/audit_puzzles.js [puzzles.json|puzzles-six.json|puzzles-twelve.json] [--ms 300]
'use strict';
const path = require('path'), fs = require('fs');
const E = require('../engine.js');
const args = process.argv.slice(2), file = args.find(a => a.endsWith('.json')) || 'puzzles.json';
const MS = +(args[args.indexOf('--ms') + 1] || 300) || 300;
const D = JSON.parse(fs.readFileSync(path.join(__dirname, '..', file), 'utf8')), v = (D && D.variant) || 'nine';
const ft = m => m & 1023, NONE = 31, rm = m => (m >> 10) & 31;
const solve = (spec, moves, n, goal, defend) => goal === 'mill' ? E.mill(v, spec, moves, n, defend) : E.mate(v, spec, moves, n, defend);
const cnt = { checked: 0 };
for (const T of D.themes) {
  const goal = T.goal || 'win';
  T.puzzles.forEach((P, j) => {
    const id = T.id + '-' + j, flags = []; cnt.checked++;
    const root = solve(P.s, [], P.n, goal, false);
    if (!root) { flags.push('budget'); }
    else {
      const good = root.filter(e => e.need && e.need <= P.n), keys = new Set(good.map(e => ft(e.m)));
      if (!good.some(e => e.m === P.answer)) flags.push('answerNotWinning');
      if (good.some(e => e.need < P.n)) flags.push('shorter');
      if (keys.size !== 1) flags.push('keys=' + keys.size);
      const line = [P.answer]; let used = 1, tie = null;
      for (let s = 0; s < 2 * P.n + 2; s++) {
        const { pos } = E.replay(v, P.s, line), last = line[line.length - 1];
        if ((goal === 'mill' && rm(last) !== NONE && (line.length & 1)) || (pos.status() === -1 && (line.length & 1))) break;
        if (pos.status() !== 0) { flags.push('over@' + line.length); break; }
        if (line.length & 1) {   // defender to move
          const dl = solve(P.s, line, P.n - used, goal, true);
          if (!dl || !dl.length) { flags.push('nodef@' + line.length); break; }
          if (dl.some(e => !e.need)) { flags.push('escape@' + line.length); break; }
          const top = Math.max(...dl.map(e => e.need)), tied = dl.filter(e => e.need === top);
          if (top !== P.n - used) flags.push('def@' + line.length + ' longest ' + top + ' != ' + (P.n - used));
          let pick = tied[0].m;
          if (tied.length > 1) {
            const an = E.analyze(v, P.s, line, MS).list, val = m => { const e = an.find(x => x.m === m); return e ? e.v : -1e9; };
            const best = tied.reduce((a, b) => val(b.m) > val(a.m) ? b : a).m;
            if (val(best) - val(pick) >= 150 && !tie) tie = { at: line.length, dv: val(best) - val(pick) };
            pick = best;
          }
          line.push(pick);
        } else {
          if (used >= P.n) { flags.push('notReached'); break; }
          const al = solve(P.s, line, P.n - used, goal, false).filter(e => e.need && e.need <= P.n - used).sort((a, b) => a.need - b.need);
          if (!al.length) { flags.push('lost@' + line.length); break; }
          line.push(al[0].m); used++;
        }
      }
      if (tie) flags.push('tie@' + tie.at + '(+' + tie.dv + ')');
    }
    for (const f of flags) { const k = f.split(/[@=( ]/)[0]; cnt[k] = (cnt[k] || 0) + 1; }
    if (flags.length) console.log(file, id, 'n' + P.n, flags.join(' '));
  });
}
console.log(file, JSON.stringify(cnt));
