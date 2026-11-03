// Puzzle audit with the page's WebAssembly engine (tools/lib.js): replays every puzzle the way the page does and checks
//   - correctness: exactly one first move reaches the goal in n own moves, none sooner, and it is the stored answer;
//   - the defender's replies: the page picks the reply that resists longest (puzzle(defend)) and, among replies that
//     resist equally long, the one the engine values best (pickDefenceBest). "tie" flags puzzles where the former rule
//     (first reply in generation order) chose a clearly worse reply (>= 150 below the best tied reply);
//   - the main line reaches the goal within n.
// usage: node tools/audit_puzzles.js [--ms 300] [--only themeId]
'use strict';
const path = require('path'), fs = require('fs');
const { init } = require('./lib.js');
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const MS = +(opt('--ms') || 300), ONLY = opt('--only');
const D = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'puzzles.json'), 'utf8'));
(async () => {
  const E = await init();
  const lead = (p, me) => p.count(me) - p.count(3 - me);
  const cnt = { checked: 0 };
  for (const T of D.themes) {
    if (ONLY && T.id !== ONLY) continue;
    for (let j = 0; j < T.puzzles.length; j++) {
      const P = T.puzzles[j], id = T.id + '-' + j, gain = (T.goal === 'gain'), g = gain ? (P.g || T.g || 0) : 0;
      const p0 = E.Pos.from(P.s), me = P.s.side, base = lead(p0, me), flags = [];
      cnt.checked++;
      const reached = p => p.status() === -1 || (gain && !p.hasCaps() && lead(p, me) - base >= g);
      const req = (line, n, defend) => {
        let goal = g; if (goal && !defend) goal = Math.max(1, goal - (lead(E.replay(P.s, line).pos, me) - base));
        return E.puzzle(P.s, line, n, defend, goal, base) || [];
      };
      const L0 = req([], P.n, false);
      if (L0.some(x => x.need < 0)) flags.push('budget');
      const sols = L0.filter(x => x.need > 0 && x.need <= P.n);
      const same = (a, b) => a === b;
      if (sols.length !== 1 || sols[0].need !== P.n) flags.push('sols=' + sols.map(x => x.need).join(','));
      const ans = sols.find(x => E.same(p0, x.m, P.answer));
      if (sols.length && !ans) flags.push('answerNotWinning');
      const line = [ans ? P.answer : null]; let used = 1, tie = null;
      if (!ans) flags.push('noSol');
      else for (let s = 0; s < 20; s++) {
        const { pos } = E.replay(P.s, line);
        if (reached(pos)) break;
        if (pos.status() !== 0) { flags.push('over'); break; }
        if (pos.turn !== me) {
          const dl = req(line, P.n - used, true);
          if (!dl.length) break;
          const sc = e => e.need === 0 ? 99 : e.need < 0 ? 50 : e.need, top = Math.max(...dl.map(sc)), tied = dl.filter(e => sc(e) === top);
          if (top >= 50) { flags.push(top === 99 ? 'escape' : 'budgetDef'); break; }
          if (top !== P.n - used) flags.push('def longest ' + top + ' != ' + (P.n - used));
          let pick = tied[0].m;
          if (tied.length > 1) {
            const an = E.analyze(P.s, line, MS).list, v = m => { const e = an.find(x => same(x.m, m)); return e ? e.v : -1e9; };
            const b = tied.reduce((a, c) => v(c.m) > v(a.m) ? c : a).m;
            if (v(b) - v(pick) >= 150 && !tie) tie = 'tie@' + line.length + '(+' + (v(b) - v(pick)) + ')';
            pick = b;
          }
          line.push(pick);
        } else {
          if (used >= P.n) { flags.push('notReached'); break; }
          const al = req(line, P.n - used, false).filter(e => e.need > 0 && e.need <= P.n - used).sort((a, b) => a.need - b.need);
          if (!al.length) { flags.push('lost'); break; }
          line.push(al[0].m); used++;
        }
      }
      if (tie) flags.push(tie);
      for (const f of flags) { const k = f.split(/[@=( ]/)[0]; cnt[k] = (cnt[k] || 0) + 1; }
      if (flags.length) console.log(id, 'n' + P.n, flags.join(' '));
    }
  }
  console.log(JSON.stringify(cnt));
})();
