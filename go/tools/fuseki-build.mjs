// build data/openings-fuseki.json from the line list + text modules, using cached engine analysis.
//   node fuseki-build.mjs            (computes any missing positions with the strong net)
import fs from 'fs';
import { node, save, R, mkspec } from './fuseki-eval.mjs';
import { CATS, SETS as S1 } from './fuseki-text-basic.mjs';
import { SETS as S2 } from './fuseki-text-small.mjs';
import { SETS as S3 } from './fuseki-text-handi.mjs';
const L = JSON.parse(fs.readFileSync(new URL('./data/fuseki-lines.json', import.meta.url)));
const V = +(process.env.VISITS || 150);
const tx = p => ({ ja: p[0], en: p[1] });
const sets = [], report = [];
for (const d of [...S1, ...S2, ...S3]) {
  const [n, komi, hc, s] = L[d.line || d.id]; const line = s.split(/\s+/);
  if (d.notes.length !== line.length) throw new Error(`${d.id}: ${d.notes.length} notes for ${line.length} moves`);
  const evals = [], nodes = [];
  for (let k = 0; k <= line.length; k++) nodes.push(await node(n, komi, hc, line.slice(0, k), V));
  for (let k = 1; k <= line.length; k++) evals.push(Math.round(nodes[k].lead * 10) / 10);
  const o = { id: d.id, cat: d.cat, ord: d.ord, n, label: tx(d.label), title: tx(d.title), short: tx(d.short), story: tx(d.story), level: d.level, side: d.side };
  if (hc) o.start = { n, ab: R.handicapPoints(n, hc).map(i => R.coord(i, n)), turn: 2 };
  o.komi = komi;
  o.line = line;
  o.notes = {}; d.notes.forEach((p, i) => o.notes[i + 1] = tx(p));
  if (d.vars) o.vars = d.vars.map(v => {
    const vl = L[v.key][3].split(/\s+/), vline = vl.slice(v.at);
    if (vl.slice(0, v.at).join(' ') !== line.slice(0, v.at).join(' ')) throw new Error(`${d.id} var ${v.key} prefix`);
    if (v.notes.length !== vline.length) throw new Error(`${d.id} var ${v.key}: ${v.notes.length} notes for ${vline.length}`);
    const vn = {}; v.notes.forEach((p, i) => { if (p) vn[i + 1] = tx(p); });
    return { at: v.at, line: vline, title: tx(v.title), notes: vn };
  });
  o.evals = evals;
  // problems: position after `at` moves, side to move = d.side; ok = line move, good = engine-equal alternatives
  o.problems = d.problems.map(at => {
    const nd = nodes[at]; if (nd.turn !== d.side) throw new Error(`${d.id} problem at ${at}: wrong side`);
    const sg = nd.turn === 1 ? 1 : -1, mv = line[at];
    const me = nd.top.find(t => t[0] === mv); const val = (me ? me[1] : nodes[at + 1].lead) * sg;
    const good = nd.top.filter(t => t[0] !== mv && t[2] >= 10 && t[1] * sg >= val - 0.7).map(t => t[0]).slice(0, 3);
    const p = { at, ok: [mv] }; if (good.length) p.good = good; return p;
  });
  // engine loss report for the main line
  let maxLoss = 0, maxB = 0;
  for (let k = 0; k < line.length; k++) {
    const nd = nodes[k], sg = nd.turn === 1 ? 1 : -1, ch = nd.top.find(t => t[0] === line[k]);
    let val = nodes[k + 1].lead; if (ch && ch[2] >= 30) val = (val + ch[1]) / 2;
    const best = Math.max(...nd.top.filter((t, i) => i === 0 || t[2] >= 10).map(t => t[1] * sg));
    const loss = Math.max(0, best - val * sg); maxLoss = Math.max(maxLoss, loss); if (nd.turn === 1) maxB = Math.max(maxB, loss);
  }
  report.push(`${d.id.padEnd(22)} ${d.title[0].padEnd(14)} ${n}x${n} ${String(line.length).padStart(2)} moves  maxloss ${maxLoss.toFixed(1)} (black ${maxB.toFixed(1)})`);
  sets.push(o);
}
save();
const out = { cats: CATS.map(c => ({ id: c.id, title: tx(c.title), sub: tx(c.sub) })), sets };
fs.writeFileSync(new URL('./data/openings-fuseki.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(report.join('\n'));
