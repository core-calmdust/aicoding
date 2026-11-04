// Audit of puzzles.json (詰め連珠, renju rules as in the app): for every puzzle
//   - the position is legal and not over, the side to move is the attacker
//   - exactly one first move wins within n (and none faster: need === n), and it is `a`
//   - the stored line `pv`: every attacker move still wins within the moves left, every defender reply is a longest
//     defence (max need, as the app's pickDefence plays it), the line ends with a five on the last attacker move
//   - the runtime reply (pickDefence on the solver's defendList) after each attacker move of the line is also checked to
//     keep the count (need === left) — a defender that collapses early would make the puzzle shorter than announced
// usage: node tools/audit_puzzles.js [cat] > report   (exit code 1 if anything is flagged)
'use strict';
const E = require('../engine.js');
const fs = require('fs'), path = require('path');
const D = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'puzzles.json'), 'utf8'));
const only = process.argv[2];
const cells = s => String(s || '').split(/\s+/).filter(Boolean).map(E.sqOf);
function audit(P, n) {
  const errs = [];
  const start = { b: cells(P.b), w: cells(P.w), side: P.side || 1 };
  let pos;
  try { pos = E.setup('renju', start); } catch (e) { return ['setup ' + e.message]; }
  if (pos.status().over) return ['over'];
  const S = new E.Solver(); S.limit = 8e6;
  const al = S.attackList(pos, n);
  if (S.nodes > S.limit) errs.push('limit');
  const wins = al.filter(e => e.need && (e.need === -1 || e.need <= n));
  const fast = wins.filter(e => e.need !== -1 && e.need < n || (e.need === -1 && n > 1));
  if (wins.length !== 1) errs.push('solutions=' + wins.length + '(' + wins.map(e => E.sqName(E.I2M[e.i]) + ':' + e.need).join(',') + ')');
  if (fast.length) errs.push('shorter ' + fast.map(e => E.sqName(E.I2M[e.i]) + ':' + e.need).join(','));
  if (!wins.some(e => E.sqName(E.I2M[e.i]) === P.a)) errs.push('a not winning');
  const pv = cells(P.pv || P.a);
  if (E.sqName(pv[0]) !== P.a) errs.push('pv[0]!=a');
  if (pv.length !== n) errs.push('pv len ' + pv.length);
  const moves = []; let tieAt = '';
  for (let k = 0; k < pv.length; k++) {
    const p = E.replay('renju', moves, start), left = n - k;
    if (!p.isLegal(pv[k])) { errs.push('illegal@' + k); break; }
    if (!(k & 1)) {   // attacker
      const S2 = new E.Solver(); S2.limit = 6e6;
      const L = S2.attackList(p, left), e = L.find(x => x.i === E.M2I[pv[k]]);
      if (!e || !e.need || (e.need !== -1 && e.need > left)) { errs.push('att@' + k + ' not winning'); break; }
      if (k === pv.length - 1 && e.need !== -1 && e.need !== 1) errs.push('last not settling');
    } else {          // defender: longest defence
      const S2 = new E.Solver(); S2.limit = 6e6;
      const L = S2.defendList(p, left - 1);   // attacker plies still needed after the reply (need 1 = settles at once)
      const v = x => x.need === 0 ? 999 : x.need;
      const best = Math.max(...L.map(v)), mine = L.find(x => x.i === E.M2I[pv[k]]);
      if (best === 999) { errs.push('escape@' + k + ' ' + L.filter(x => !x.need).map(x => E.sqName(E.I2M[x.i])).join(',')); break; }
      if (!mine) errs.push('def@' + k + ' not a defence cell');
      else if (v(mine) < best) errs.push('def@' + k + ' ' + E.sqName(pv[k]) + ':' + mine.need + ' < best ' + best + ' (' + L.filter(x => v(x) === best).map(x => E.sqName(E.I2M[x.i])).join(',') + ')');
      const tied = L.filter(x => v(x) === best);
      if (tied.length > 1 && !tieAt) {   // the page (pickDefenceBest) takes the engine's favourite among equally long defences
        const an = E.analyze('renju', moves, 300, start).list, ev = m => { const x = an.find(y => y.m === m); return x ? x.v : -1e9; };
        const pick = tied.reduce((a, b) => ev(E.I2M[b.i]) > ev(E.I2M[a.i]) ? b : a), d = ev(E.I2M[pick.i]) - ev(E.I2M[tied[0].i]);
        if (d >= 150) tieAt = 'tie@' + k + '(+' + d + ')';
      }
      if (best !== left - 1) errs.push('def@' + k + ' longest ' + best + ' != left ' + left);
    }
    moves.push(pv[k]);
  }
  if (tieAt) errs.push(tieAt + ' (first tied reply clearly worse)');
  return errs;
}
let n = 0, bad = 0;
for (const C of D.cats) {
  if (only && C.id !== only) continue;
  for (const L of C.levels) L.puzzles.forEach((P, j) => {
    const id = C.id + '-' + L.n + '-' + j, errs = audit(P, L.n); n++;
    if (errs.length) { bad++; console.log('BAD', id, errs.join(' | ')); }
  });
}
console.log('checked', n, 'bad', bad);
process.exitCode = bad ? 1 : 0;
