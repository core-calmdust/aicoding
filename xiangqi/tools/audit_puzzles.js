// Audit of puzzles.json with the WebAssembly mate solver the page uses (engine.c puzzle()):
//   - legal position, Red to move, not already over / in check
//   - exactly one first move mates within n, it is `a`, no shorter mate (need === n); checks-only themes: no quicker free mate
//   - main line as the page plays it: defender = pickDefence (longest resistance) whose value must be exactly the moves
//     left (a defender reply that is mated sooner, or an unknown (-1, budget) value, is flagged), attacker = shortest mate;
//     the line ends in mate after n attacker moves; "tie" = among equally long defences the first in generation order
//     (the old page rule) was clearly worse than the engine's favourite
// usage: node tools/audit_puzzles.js [themeId]   (exit code 1 if anything is flagged)
'use strict';
const fs = require('fs'), path = require('path');
const { load } = require('./wasm.js');
(async () => {
  const { E } = await load();
  const D = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'puzzles.json'), 'utf8'));
  const only = process.argv[2];
  const val = e => e.need === 0 ? 99 : e.need < 0 ? 50 : e.need;
  let n = 0, bad = 0;
  for (const T of D.themes) {
    if (only && T.id !== only) continue;
    T.puzzles.forEach((P, j) => {
      n++; const errs = [], ck = !!(P.ck || T.ck);
      const P0 = E.Pos.from(P.s);
      if (P0.status() !== 0) errs.push('over'); if (P0.turn !== 1) errs.push('side');
      const L = E.puzzle(P.s, [], P.n, false, ck) || [];
      const win = L.filter(e => e.need > 0 && e.need <= P.n);
      if (win.length !== 1) errs.push('solutions=' + win.length);
      if (win.some(e => e.need < P.n)) errs.push('shorter');
      if (L.some(e => e.need < 0)) errs.push('unknown(budget)');
      if (!win.some(e => e.m === P.a)) errs.push('a not winning');
      if (ck && P.n > 1) { const g = E.puzzle(P.s, [], P.n - 1, false, false); if (g && g.some(e => e.need > 0)) errs.push('free mate faster'); }
      const line = []; let tieAt = '';
      for (let step = 0; step < 2 * P.n && !errs.length; step++) {
        const pos = E.replay(P.s, line).pos, left = P.n - (step >> 1);
        if (pos.status() !== 0) { if (!(step === 2 * P.n - 1 && pos.status() === -1)) errs.push('ended early@' + step); break; }
        if (!(step & 1)) {
          const A = E.puzzle(P.s, line, left, false, ck).filter(e => e.need > 0).sort((a, b) => a.need - b.need);
          if (!A.length) { errs.push('lost@' + step); break; }
          if (A[0].need !== left) errs.push('att@' + step + ' need ' + A[0].need + ' != ' + left);
          line.push(step === 0 ? P.a : A[0].m);
        } else {
          const Dl = E.puzzle(P.s, line, left - 1, true, ck);
          if (!Dl || !Dl.length) { errs.push('no reply@' + step); break; }
          let best = null; for (const e of Dl) if (!best || val(e) > val(best)) best = e;
          const tied = Dl.filter(e => val(e) === val(best));
          if (tied.length > 1) {   // the page (pickDefenceBest) takes the engine's favourite among equally long defences
            const an = E.analyze(P.s, line, 300).list, v = m => { const x = an.find(y => y.m === m); return x ? x.v : -1e9; };
            const pick = tied.reduce((a, b) => v(b.m) > v(a.m) ? b : a);
            if (v(pick.m) - v(tied[0].m) >= 150 && !tieAt) tieAt = 'tie@' + step + '(+' + (v(pick.m) - v(tied[0].m)) + ')';
            best = pick;
          }
          if (val(best) >= 99) { errs.push('escape@' + step); break; }
          if (val(best) === 50) { errs.push('unknown def@' + step); break; }
          if (best.need !== left - 1) errs.push('def@' + step + ' longest ' + best.need + ' != ' + (left - 1));
          line.push(best.m);
        }
      }
      if (!errs.length && E.replay(P.s, line).pos.status() !== -1) errs.push('no mate at end');
      if (tieAt) errs.push(tieAt + ' (first tied reply clearly worse: fixed by pickDefenceBest)');
      if (errs.length) { bad++; console.log('BAD', T.id + ':' + j, P.s, errs.join(' | ')); }
    });
  }
  console.log('checked', n, 'bad', bad);
  process.exitCode = bad ? 1 : 0;
})();
