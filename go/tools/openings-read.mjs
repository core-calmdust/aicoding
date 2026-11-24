// Readings for the go/open practice check (tools/lesson-verify-goopen.js, 2026-11-24 第2期・担当B):
//   node go/tools/openings-read.mjs [--visits 300] [--part 0 --of 2] [--set id] [--redo]
// For every problem position and every main-line position whose mover is the set's side: the strong net's policy (top 10,
// 8 symmetries) and a 300-visit search (top 10: [move, visits, lead for the mover]). Komi as the 2D / 3D practice
// (go/learn.js startPractice: set.komi, 0.5 with handicap, else the Japanese default). Written to go/tools/data/openings-reads.json.
import fs from 'fs';
import path from 'path';
import { load, analyze, policy, R } from './golib.mjs';
const DIR = path.dirname(new URL(import.meta.url).pathname), OUT = path.join(DIR, 'data', 'openings-reads.json');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const VIS = +opt('--visits', 300), PART = +opt('--part', 0), OF = +opt('--of', 1), ONLY = opt('--set', null), REDO = args.includes('--redo');
const O = JSON.parse(fs.readFileSync(path.join(DIR, '..', 'openings.json'), 'utf8'));
function specFrom(o) { const n = o.n || 19, a = Array(n * n).fill('.'); for (const s of o.ab || []) a[R.parseCoord(s, n)] = 'b'; for (const s of o.aw || []) a[R.parseCoord(s, n)] = 'w'; return { n, stones: a.join(''), turn: o.turn || 1 }; }
function startOf(g) { const n = g.n || 19; if (g.start) return specFrom(Object.assign({ n }, g.start));
  if (g.handi) { const a = Array(n * n).fill('.'); R.handicapPoints(n, g.handi).forEach(i => { a[i] = 'b'; }); return { n, stones: a.join(''), turn: 2 }; }
  return { n, stones: '.'.repeat(n * n), turn: 1 }; }
const komiOf = g => g.komi != null ? g.komi : g.handi ? 0.5 : R.defaultKomi(g.n || 19, 'jp');
const res = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { meta: {}, pos: {} };
res.meta = { net: 'strong', visits: VIS, komi: 'set.komi / 0.5 handicap / R.defaultKomi(n, "jp")', top: '[move, visits, lead for the mover]', pol: '[move, prior]' };
const E = await load('strong');
const jobs = []; O.sets.forEach(g => { if (ONLY && g.id !== ONLY) return; const st = startOf(g), ats = new Set(g.problems.map(p => p.at));
  g.line.forEach((m, at) => { if (ats.has(at) || (at % 2 ? 3 - st.turn : st.turn) === (g.side || 1)) jobs.push([g, at]); }); });
let k = 0;
for (const [g, at] of jobs) { if (k++ % OF !== PART) continue; const key = g.id + '@' + at; if (res.pos[key] && !REDO) continue;
  const n = g.n || 19, sp = startOf(g), mv = g.line.slice(0, at).map(m => R.parseCoord(m, n)), komi = komiOf(g);
  const pol = policy(E, sp, mv, komi, 8), a = analyze(E, sp, mv, komi, VIS);
  res.pos[key] = { turn: pol.turn, pol: pol.list.slice(0, 10).map(e => [R.coord(e.m, n), +e.p.toFixed(3)]), top: a.list.slice(0, 10).map(e => [R.coord(e.m, n), e.n, +e.lead.toFixed(2)]) };
  if (k % 10 === 0) fs.writeFileSync(OUT, JSON.stringify(res)); }
fs.writeFileSync(OUT, JSON.stringify(res));
console.log('reads', Object.keys(res.pos).length);
