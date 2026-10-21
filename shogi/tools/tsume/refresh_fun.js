// Replace the low-scoring composed tsume (fun < THRESHOLD, tools/fun.js) by better generated ones, slot by slot.
//   node tools/tsume/refresh_fun.js <pool.json> [--dry]
// pool.json comes from tools/tsume/pool.js (generator output re-verified with solve.js and scored with fun.js).
// Rules:
//   • a slot keeps its place: the new problem gets the slot's no and d (the app sorts a set by d), so stars,
//     stage unlocks and progress counts stay where they are
//   • the previous problem is kept in set.old[newId]; the app shows it to players who already have a record for it
//     (index.html tsPick) and for daily puzzles up to 2026-10-21
//   • same move count; comp sets: any motif, theme sets: the theme must be in the new solution (fun.js tags);
//     a problem shared by a comp set and a theme set is replaced by the same new problem when it has that theme
//   • among the candidates the one with the closest difficulty (diffOf) is taken, ties -> higher fun
//   • every new problem is verified again here with solve.js (unique, exact length, no leftover)
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const S = require('./solve.js');
const F = require('../fun.js');
const FILE = path.join(__dirname, '../../tsume.json');
const THRESHOLD = 70;

// cheap difficulty proxy from the line (no search): length, tempting wrong tries, how many checks there are to choose from
function diffOf(sfen, sol) {
  const f = F.analyze(sfen, sol);
  const tries0 = f.tries[0] || 0, sum = f.checks.reduce((a, b) => a + b, 0);
  return 0.5 * f.n + 0.25 * Math.min(10, tries0) + 0.05 * sum + (f.first.sac || f.first.touchi || f.first.funari || f.first.aki ? 1 : 0);
}
// generator climbs emit chains of near-identical problems: one per family (length + king square + first move)
const fam = c => { const b = c.sfen.split(' ')[0].split('/'); let ks = ''; b.forEach((r, i) => { let col = 0; for (const ch of r.replace(/\+/g, '')) { if (ch >= '1' && ch <= '9') col += +ch; else { if (ch === 'k') ks = i + ':' + col; col++; } } }); return c.n + '|' + ks + '|' + c.sol[0]; };
const scoreOld = p => F.funScore(p.sfen, p.sol, p.tags);

if (require.main === module) {
  const [poolFile, ...flags] = process.argv.slice(2);
  const dry = flags.includes('--dry');
  const D = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const pool = JSON.parse(fs.readFileSync(poolFile, 'utf8')).filter(c => c.fun >= THRESHOLD);
  for (const c of pool) c.diff = diffOf(c.sfen, c.sol);
  const used = new Set(), byOld = new Map();   // used: new problems already placed somewhere; byOld: old id -> its replacements
  const report = {};
  const sets = D.sets.filter(g => g.problems[0] && g.problems[0].u);
  // comp sets first, so theme sets can reuse their choice
  sets.sort((a, b) => (a.group === 'comp' ? 0 : 1) - (b.group === 'comp' ? 0 : 1));
  for (const g of sets) {
    const theme = g.group === 'theme' ? g.id.slice(2) : null;
    const rep = report[g.id] = { replaced: 0, low: 0, total: g.problems.length, left: [] };
    g.old = g.old || {};
    const inSet = new Set(g.problems.map(fam));   // one problem per family in a set (no near-copies of the set's own problems)
    for (let i = 0; i < g.problems.length; i++) {
      const p = g.problems[i];
      if (Object.values(g.old).some(o => o === p)) continue;
      const so = scoreOld(p);
      p.fun = so.fun;
      if (so.fun >= THRESHOLD) continue;
      rep.low++;
      const dOld = diffOf(p.sfen, p.sol);
      let pick = (byOld.get(p.id) || []).find(c => c.n === p.n && (!theme || c.tags.includes(theme)) && !inSet.has(fam(c)));
      if (!pick) {
        // comp sets: only unused problems; theme sets may take one already placed in a comp set (unused ones first)
        const cands = pool.filter(c => !c.bad && !inSet.has(fam(c)) && (theme || !used.has(fam(c))) && c.n === p.n && (!theme || c.tags.includes(theme)));
        const key = c => Math.abs(c.diff - dOld) - c.fun / 40 + (used.has(fam(c)) ? 3 : 0);
        cands.sort((a, b) => key(a) - key(b));
        pick = cands[0];
        if (pick && !pick.checked) {
          const v = S.verify(pick.sfen, pick.n, { nodeLimit: 3e7 });
          if (!v.ok || v.sol.join() !== pick.sol.join()) { console.log('reject (verify)', pick.sfen, v.why); pick.bad = true; i--; rep.low--; continue; }
          pick.checked = true;
        }
        if (pick) { used.add(fam(pick)); byOld.set(p.id, [...(byOld.get(p.id) || []), pick]); }
      }
      if (pick) inSet.add(fam(pick));
      if (!pick) { rep.left.push(`${p.id}(n${p.n},fun${so.fun})`); continue; }
      const id = crypto.createHash('sha1').update(pick.sfen).digest('hex').slice(0, 10);
      const np = { id, kind: 'tsume', sfen: pick.sfen, n: pick.n, sol: pick.sol, u: 1, conv: 1, no: p.no, tags: pick.tags, d: p.d, fun: pick.fun };
      g.old[id] = p;
      g.problems[i] = np;
      rep.replaced++;
      console.log(g.id, 'slot', i, p.id, 'fun', so.fun, '->', id, 'fun', pick.fun, 'diff', dOld.toFixed(1), '->', pick.diff.toFixed(1), pick.tags.join(','));
    }
    if (!Object.keys(g.old).length) delete g.old;
  }
  for (const k in report) console.log(k.padEnd(9), `replaced ${report[k].replaced} / low ${report[k].low} / total ${report[k].total}`, report[k].left.length ? 'left: ' + report[k].left.join(' ') : '');
  if (!dry) { fs.writeFileSync(FILE, JSON.stringify(D)); console.log('written', FILE); }
}
module.exports = { diffOf, THRESHOLD };
