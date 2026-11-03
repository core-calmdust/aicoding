// Puzzle audit with the page's WebAssembly engine (tools/wasm.js), the same puzzle() calls the page makes:
//   - "win in n" themes: exactly one first move connects within n, it is the stored answer, none sooner; the main line
//     (attacker: quickest, defender: longest resistance) connects after n attacker moves; "tie" = among equally long
//     defences, the engine's favourite differs clearly (>= 150 by analyze) from a random/first pick — the page now takes
//     the engine's favourite (pickDefenceBest), so this is informational;
//   - "block" themes (n = 1, the player defends): the answer is the only move that leaves no forced connection.
// usage: node tools/audit_puzzles.js [themeId] [--ms 300]
'use strict';
const fs = require('fs'), path = require('path');
const E = require('./wasm.js').load();
const args = process.argv.slice(2), only = args.find(a => !a.startsWith('--') && !/^\d+$/.test(a));
const MS = +(args[args.indexOf('--ms') + 1] || 300) || 300;
const D = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'puzzles.json'), 'utf8'));
const cnt = { checked: 0 };
for (const T of D.themes) {
  if (only && T.id !== only) continue;
  T.puzzles.forEach((P, j) => {
    if (T.grp === 'Block') return;   // checked by the generator (single reply); here: attack puzzles
    cnt.checked++;
    const flags = [], me = P.s.side;
    const L0 = E.puzzle(P.s, [], P.n, false, 4000) || [];
    const win = L0.filter(e => e.need > 0 && e.need <= P.n);
    if (L0.some(e => e.need < 0)) flags.push('budget');
    if (win.length !== 1) flags.push('solutions=' + win.length);
    if (win.some(e => e.need < P.n)) flags.push('shorter');
    if (!win.some(e => e.m === P.answer)) flags.push('answerNotWinning');
    const line = [P.answer]; let used = 1, tie = '';
    for (let s = 0; s < 2 * P.n && !flags.length; s++) {
      const { pos } = E.replay(P.s, line);
      if (pos.winner()) { if (pos.winner() !== me) flags.push('lost'); break; }
      if (line.length & 1) {
        const dl = E.puzzle(P.s, line, P.n - used, true, 4000) || [];
        const sc = e => e.need === 0 ? 99 : e.need < 0 ? 50 : e.need, top = Math.max(...dl.map(sc)), tied = dl.filter(e => sc(e) === top);
        if (top >= 50) { flags.push(top === 99 ? 'escape' : 'budgetDef'); break; }
        if (top !== P.n - used) flags.push('def longest ' + top + ' != ' + (P.n - used));
        let pick = tied[0].m;
        if (tied.length > 1) {
          const an = E.analyze(P.s, line, MS, null, 400).list, v = m => { const x = an.find(y => y.m === m); return x ? x.v : -1e9; };
          const vs = tied.map(e => v(e.m)), b = tied[vs.indexOf(Math.max(...vs))].m;
          if (Math.max(...vs) - Math.min(...vs) >= 150 && !tie) tie = 'tie@' + line.length + '(' + tied.length + ' tied, spread ' + (Math.max(...vs) - Math.min(...vs)) + ')';
          pick = b;
        }
        line.push(pick);
      } else {
        if (used >= P.n) { flags.push('notReached'); break; }
        const al = (E.puzzle(P.s, line, P.n - used, false, 4000) || []).filter(e => e.need > 0 && e.need <= P.n - used).sort((a, b) => a.need - b.need);
        if (!al.length) { flags.push('lostWin'); break; }
        line.push(al[0].m); used++;
      }
    }
    if (!flags.length && E.replay(P.s, line).pos.winner() !== me) flags.push('notReached');
    if (tie) flags.push(tie);
    for (const f of flags) { const k = f.split(/[@=( ]/)[0]; cnt[k] = (cnt[k] || 0) + 1; }
    if (flags.length) console.log(T.id + '-' + j, 'n' + P.n, flags.join(' '));
  });
}
console.log(JSON.stringify(cnt));
