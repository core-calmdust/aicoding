// Audit of the defender's replies the page plays in tsume (index.html lessonMove → engine.js worker 'tsumeDefend'):
// for every problem and every defender turn of its stored line, the reply the engine would pick is compared with the
// tsume conventions of tools/tsume/solve.js (longest defence, futile interpositions 無駄合 are not a defence):
//   futile  — the engine reply is a drop on a square no defender piece guards (a 無駄合 that only delays mate)
//   escape  — the engine says mate is no longer forced (reply = an escape) although the stored line mates
//   short   — the engine reply is mated sooner than the stored reply (not the longest resistance)
// Composed problems (u) take the reply from the stored line on the solution path, so only the practical sets (no u)
// meet the engine reply on the main line; both are reported (--all for composed too).
// (--old: the engine before 2026-11-04, which counted futile drops as defences — reproduces the flagged replies)
// usage: node tools/tsume/audit_replies.js [setId] [--all] [--old]
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../../engine.js');
const { Solver } = require('./solve.js');
const D = JSON.parse(fs.readFileSync(path.join(__dirname, '../../tsume.json'), 'utf8'));
const args = process.argv.slice(2), TSUME = !process.argv.includes('--old'), only = args.find(a => !a.startsWith('--')), ALL = args.includes('--all');
// copy of the worker's tsumeDefend (engine.js), for node
function tsumeDefend(pos, remain) {
  const all = pos.legalMoves(true), real = all.filter(m => !E.isDrop(m) || pos.attacked(E.mTo(m), pos.side));
  const replies = real.length ? real : all;
  let esc = null, best = null, bestLen = -1, bestDrop = true;
  for (const m of replies) {
    const drop = E.isDrop(m);
    if (esc && drop) continue;
    pos.doMove(m);
    const r = remain > 1 ? E.solveMate(pos, remain - 1, 400000, TSUME) : null;
    pos.undoMove();
    if (!r) { if (!esc || !drop) esc = m; if (!drop) break; continue; }
    if (esc) continue;
    const len = r.mate < 0 ? remain : r.mate;
    if (len > bestLen || (len === bestLen && bestDrop && !drop)) { best = m; bestLen = len; bestDrop = drop; }
  }
  return { reply: esc || best || replies[0], mate: !esc };
}
const cnt = { problems: 0, plies: 0 };
for (const g of D.sets) {
  if (only && g.id !== only) continue;
  for (const p of g.problems) {
    if (p.u && !ALL) continue;
    cnt.problems++;
    const S = new Solver(2e6), pos = S.pos; pos.setSfen(p.sfen);
    const flags = [];
    for (let i = 0; i < p.sol.length - 1; i += 2) {
      pos.doMove(pos.fromUsi(p.sol[i]));
      const remain = p.n - i - 1; cnt.plies++;
      const r = tsumeDefend(pos, remain), ru = pos.toUsi(r.reply), want = p.sol[i + 1];
      if (!r.mate) flags.push('escape@' + (i + 1) + ' ' + ru);
      else if (ru !== want) {
        // futile drop?
        const legal = S.replies(i + 1).map(m => pos.toUsi(m));
        if (E.isDrop(r.reply) && !legal.includes(ru)) flags.push('futile@' + (i + 1) + ' ' + ru + ' (line ' + want + ')');
        else {
          const len = m => { pos.doMove(pos.fromUsi(m)); S.reset(); const L = S.mateLen(remain - 1, i + 2); pos.undoMove(); return L; };
          const a = len(ru), b = len(want);
          if (a && b && a < b) flags.push('short@' + (i + 1) + ' ' + ru + ':' + a + ' < ' + want + ':' + b);
        }
      }
      pos.doMove(pos.fromUsi(p.sol[i + 1]));
    }
    for (const f of flags) { const k = f.split('@')[0]; cnt[k] = (cnt[k] || 0) + 1; }
    if (flags.length) console.log(g.id, p.id, 'n' + p.n, flags.join(' | '));
  }
}
console.log(JSON.stringify(cnt));
