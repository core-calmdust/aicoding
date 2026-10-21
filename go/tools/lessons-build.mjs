// Build go/lessons.json from the course modules (lessons-c-*.mjs) and verify every problem.
//   node lessons-build.mjs            solver checks + engine checks (cached in lessons-cache.json) → lessons.json, lessons-check.json
//   node lessons-build.mjs --fast     skip the engine (solver + legality only), still writes lessons.json
//   node lessons-build.mjs --only=id  restrict to steps whose id matches
import fs from 'fs';
import path from 'path';
import { specFromRows, specFromLists, solveFirst, legalSetup, show, pt, co, R } from './lessons-lib.mjs';
const DIR = path.dirname(new URL(import.meta.url).pathname);
const args = process.argv.slice(2), FAST = args.includes('--fast');
const SHOW = args.includes('--show');
const ONLY = (args.find(a => a.startsWith('--only=')) || '').slice(7);
const mods = ['basics', 'tactics', 'lifedeath', 'opening', 'middle', 'endgame'];
const courses = [], steps = [];
for (const m of mods) {
  const f = path.join(DIR, 'lessons-c-' + m + '.mjs');
  if (!fs.existsSync(f)) continue;
  const mod = await import(f);
  courses.push(mod.course);
  steps.push(...mod.steps);
}
const CACHE_F = path.join(DIR, 'lessons-cache.json');
const cache = fs.existsSync(CACHE_F) ? JSON.parse(fs.readFileSync(CACHE_F, 'utf8')) : {};
let E = null, golib = null;
async function eng() { if (!E) { golib = await import('./golib.mjs'); E = await golib.load('strong'); } return E; }
// mover's value (points) of the position after `mv` (or the root when mv null)
async function evalAfter(spec, mv, komi, visits) {
  const key = JSON.stringify([spec.n, spec.stones, spec.turn, mv, komi, visits]);
  if (cache[key] !== undefined) return cache[key];
  const E = await eng();
  const moves = mv ? [mv === 'pass' ? -1 : pt(mv, spec.n)] : [];
  const a = golib.analyze(E, spec, moves, komi, visits);
  const v = mv ? -a.lead : { lead: a.lead, top: a.list.slice(0, 4).map(e => ({ m: co(e.m, spec.n), n: e.n, lead: Math.round(e.lead * 10) / 10 })) };
  cache[key] = typeof v === 'number' ? Math.round(v * 100) / 100 : v;
  fs.writeFileSync(CACHE_F, JSON.stringify(cache));
  return cache[key];
}
const L = o => o;            // text objects pass through
const errors = [], report = [];
const outSteps = [];
for (const st of steps) {
  if (ONLY && !st.id.includes(ONLY)) { continue; }
  if (st.problems.length !== 5) errors.push(st.id + ': ' + st.problems.length + ' problems');
  const rs = { id: st.id, course: st.course, title: st.title.ja, problems: [] };
  const probs = [];
  for (let k = 0; k < st.problems.length; k++) {
    const P = st.problems[k], tag = st.id + '#' + (k + 1);
    const spec = P.rows ? specFromRows(P.rows, P.turn, P.swap) : specFromLists(P.n, P.ab || [], P.aw || [], P.turn);
    const bad = legalSetup(spec); if (bad.length) errors.push(tag + ': stones without liberties ' + bad);
    for (const t of ['why', 'ng']) if (!P[t] || !P[t].ja || !P[t].en) errors.push(tag + ': missing ' + t);
    const all = [...P.ok, ...(P.good || []), ...(P.half || [])];
    const p0 = R.Pos.from(spec);
    for (const m of all) { const i = pt(m, spec.n); if (!p0.legal(i)) errors.push(tag + ': answer not legal ' + m); }
    if (P.line) {
      if (!P.ok.includes(P.line[0])) errors.push(tag + ': line does not start with ok');
      let p = p0; for (const m of P.line) { const r = p.tryPlay(m === 'pass' ? -1 : pt(m, spec.n), 0, true); if (!r) { errors.push(tag + ': illegal line move ' + m); break; } p = r.pos; }
    }
    if (SHOW) console.log(tag + ' ' + (spec.turn === 1 ? 'Black' : 'White') + ' to play, ok ' + P.ok + '\n' + show(spec));
    const pr = { k: k + 1, turn: spec.turn === 1 ? 'B' : 'W', ok: P.ok, good: P.good, half: P.half, checks: [] };
    for (const c of P.chk || []) {
      const r = solveFirst(spec, c.goal, c.tgt, c);
      const allow = new Set([...all, ...(c.alsoWin || [])]);
      const miss = P.ok.filter(m => !r.wins.includes(m) && !(c.noOk));
      const extra = r.wins.filter(m => !allow.has(m));
      const want = c.expect;
      let pass = !miss.length && !extra.length;
      if (want) pass = JSON.stringify([...r.wins].sort()) === JSON.stringify([...want].sort());
      pr.checks.push({ how: 'solver', goal: c.goal, target: c.tgt, depth: c.depth || 8, region: !!c.region, wins: r.wins, nodes: r.nodes, pass });
      if (!pass) errors.push(`${tag}: solver ${c.goal} ${c.tgt} wins=[${r.wins}] ok=[${P.ok}] allow=[${[...allow]}]`);
    }
    if (P.libs) {    // liberty count of the group containing P.libs.tgt after each candidate
      const counts = {};
      for (const m of P.libs.cands) { const r = p0.tryPlay(pt(m, spec.n), 0, true); counts[m] = r ? r.pos.group(pt(P.libs.tgt, spec.n)).libs : -1; }
      const mx = Math.max(...Object.values(counts)), best = Object.keys(counts).filter(m => counts[m] === mx);
      const pass = best.length === 1 && P.ok.includes(best[0]);
      pr.checks.push({ how: 'liberties', counts, pass });
      if (!pass) errors.push(tag + ': liberties ' + JSON.stringify(counts));
    }
    if (P.eng && !FAST) {
      const komi = P.eng.komi !== undefined ? P.eng.komi : 7.5, vis = P.eng.visits || 160;
      const root = await evalAfter(spec, null, komi, vis);
      const cand = new Set([...all, ...(P.eng.wrong || []), ...root.top.slice(0, 3).filter(e => e.n >= 10).map(e => e.m)]);
      const vals = {};
      for (const m of cand) vals[m] = await evalAfter(spec, m, komi, P.eng.vis2 || 100);
      const best = Math.max(...Object.values(vals));
      const okv = Math.max(...P.ok.map(m => vals[m]));
      const tol = P.eng.tol !== undefined ? P.eng.tol : 1.0, gap = P.eng.gap !== undefined ? P.eng.gap : 2.0;
      const probs2 = [];
      if (okv < best - tol) probs2.push('ok loses ' + (best - okv).toFixed(1));
      for (const m of P.eng.wrong || []) if (vals[m] > okv - gap) probs2.push(`wrong ${m} only ${(okv - vals[m]).toFixed(1)} worse`);
      for (const m of P.good || []) if (vals[m] < okv - 4) probs2.push(`good ${m} loses ${(okv - vals[m]).toFixed(1)}`);
      for (const [m, v] of Object.entries(vals)) if (!all.includes(m) && v > okv - tol && !(P.eng.wrong || []).includes(m) && !(P.eng.ignore || []).includes(m)) probs2.push(`unlisted ${m} close (${(okv - v).toFixed(1)})`);
      pr.checks.push({ how: 'engine strong ' + vis + '/' + (P.eng.vis2 || 100) + ' visits', rootTop: root.top, values: vals, pass: !probs2.length, notes: probs2 });
      if (probs2.length) errors.push(tag + ': engine ' + probs2.join('; ') + ' ' + JSON.stringify(vals));
    }
    rs.problems.push(pr);
    const o = { s: spec };
    if (P.view) o.view = P.view;
    o.ok = P.ok; if (P.good) o.good = P.good; if (P.half) o.half = P.half;
    if (P.line) o.line = P.line;
    o.why = L(P.why); if (P.ng) o.ng = L(P.ng);
    probs.push(o);
  }
  report.push(rs);
  const d = st.diagram;
  let dg;
  if (d) {
    const ds = d.rows ? specFromRows(d.rows, d.turn || 1) : specFromLists(d.n, d.ab || [], d.aw || [], d.turn || 1);
    const bad = legalSetup(ds); if (bad.length) errors.push(st.id + ' diagram: stones without liberties ' + bad);
    dg = { s: ds }; if (d.marks) dg.marks = d.marks; if (d.arrows) dg.arrows = d.arrows; if (d.view) dg.view = d.view;
  }
  const so = { id: st.id, course: st.course, title: st.title, sub: st.sub, intro: st.intro, goal: st.goal, hint: st.hint };
  if (dg) so.diagram = dg;
  so.problems = probs;
  outSteps.push(so);
}
if (ONLY) { console.log(errors.join('\n') || 'OK'); process.exit(0); }
fs.writeFileSync(path.join(DIR, '..', 'lessons.json'), JSON.stringify({ version: 1, courses, steps: outSteps }, null, 1));
if (!FAST) fs.writeFileSync(path.join(DIR, 'lessons-check.json'), JSON.stringify({ generated: new Date().toISOString(), steps: report, errors }, null, 1));
console.log(outSteps.length + ' steps, ' + outSteps.reduce((a, s) => a + s.problems.length, 0) + ' problems');
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'all checks passed');
