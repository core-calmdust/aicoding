// Build go/lessons.json from the course modules (lessons-c-*.mjs) and verify every problem.
//   node lessons-build.mjs            solver checks (tactics / life & death) + engine-survey thresholds (strategic problems,
//                                     values measured with lessons-eng.mjs and stored in the course modules)
//                                     → ../lessons.json and lessons-check.json (report)
//   node lessons-build.mjs --only=id  check only the steps whose id contains `id` (no output files)
//   node lessons-build.mjs --show     also print every problem board
import fs from 'fs';
import path from 'path';
import { specFromRows, specFromLists, solveFirst, legalSetup, show, pt, co, R, pv } from './lessons-lib.mjs';
const DIR = path.dirname(new URL(import.meta.url).pathname);
const args = process.argv.slice(2);
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
const L = o => o;
function fromMoves(n, moves) { let p = R.Pos.from({ n, turn: 1 }); for (const m of moves) { const r = p.tryPlay(pt(m, n), 0, true); if (!r) throw new Error('illegal setup move ' + m); p = r.pos; } return p.spec(); }            // text objects pass through
const errors = [], report = [];
const outSteps = [];
for (const st of steps) {
  if (ONLY && !st.id.includes(ONLY)) { continue; }
  if (st.problems.length !== 5) errors.push(st.id + ': ' + st.problems.length + ' problems');
  const rs = { id: st.id, course: st.course, title: st.title.ja, problems: [] };
  const probs = [];
  for (let k = 0; k < st.problems.length; k++) {
    const P = st.problems[k], tag = st.id + '#' + (k + 1);
    const spec = P.moves ? fromMoves(P.n, P.moves) : P.rows ? specFromRows(P.rows, P.turn, P.swap) : specFromLists(P.n, P.ab || [], P.aw || [], P.turn);
    if (P.line === 'auto') { const c = P.chk[0]; P.line = pv(spec, c.goal, c.tgt, Object.assign({}, c, { depth: c.pvDepth || c.depth }), P.ok[0]); }
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
    // the main line must keep the goal: after the line, the side to move cannot overturn it
    if (P.line && P.chk && P.chk[0] && !P.noLineChk) {
      const c = P.chk[0], inv = { capture: 'escape', kill: 'live', escape: 'capture', live: 'kill' }[c.goal];
      if (inv) {
        let q = R.Pos.from(spec); for (const m of P.line) q = q.tryPlay(m === 'pass' ? -1 : pt(m, spec.n), 0, true).pos;
        const tgtAlive = c.tgt.filter(t => q.b[pt(t, spec.n)] === p0.b[pt(t, spec.n)]);
        if (tgtAlive.length === c.tgt.length) {
          const moverIsOrig = q.turn === spec.turn;
          const r = solveFirst(q.spec(), moverIsOrig ? c.goal : inv, tgtAlive, Object.assign({}, c, { depth: c.depth || 8 }));
          const bad = moverIsOrig ? !r.wins.length : r.wins.length;
          if (bad) errors.push(`${tag}: after the line the result is not settled (${moverIsOrig ? c.goal : inv} wins=${r.wins})`);
        }
      }
    }
    const pr = { k: k + 1, turn: spec.turn === 1 ? 'B' : 'W', ok: P.ok, good: P.good, half: P.half, checks: [] };
    for (const c of P.chk || []) {
      const r = solveFirst(spec, c.goal, c.tgt, c);
      if (c.region && c.goal !== 'connect' && c.goal !== 'cut') {   // the answer must work without relying on ko
        const rs = solveFirst(spec, c.goal, c.tgt, Object.assign({}, c, { strict: true }));
        const miss2 = P.ok.filter(m => !rs.wins.includes(m));
        if (miss2.length) errors.push(`${tag}: answer ${miss2} only works through ko`);
      }
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
    if (P.eng) {    // strategic problems: engine survey values (lessons-eng.mjs, strong net), mover's view in points
      const E = P.eng, vals = E.vals, all2 = [...all];
      const okv = Math.max(...P.ok.map(m => vals[m] !== undefined ? vals[m] : -999));
      const best = Math.max(...Object.values(vals));
      const tol = E.tol !== undefined ? E.tol : 1.0, gap = E.gap !== undefined ? E.gap : 2.0;
      const probs2 = [];
      if (P.ok.some(m => vals[m] === undefined)) probs2.push('ok move without engine value');
      if (okv < best - tol) probs2.push('ok loses ' + (best - okv).toFixed(2));
      for (const m of E.wrong || []) if (!(vals[m] <= okv - gap)) probs2.push(`wrong ${m} only ${(okv - vals[m]).toFixed(2)} worse`);
      for (const m of P.good || []) if (!(vals[m] >= okv - (E.goodTol || 1.5))) probs2.push(`good ${m} loses ${(okv - vals[m]).toFixed(2)}`);
      for (const [m, v] of Object.entries(vals)) if (!all2.includes(m) && !(E.wrong || []).includes(m) && v > okv - tol) probs2.push(`unlisted ${m} close (${(okv - v).toFixed(2)})`);
      pr.checks.push({ how: 'engine (strong net, ' + (E.visits || '200/80') + ' visits, komi ' + E.komi + ')', rootTop: E.top, values: vals, okValue: okv, gapRequired: gap, pass: !probs2.length, notes: probs2 });
      if (probs2.length) errors.push(tag + ': engine ' + probs2.join('; '));
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
    const ds = d.moves ? fromMoves(d.n, d.moves) : d.rows ? specFromRows(d.rows, d.turn || 1) : specFromLists(d.n, d.ab || [], d.aw || [], d.turn || 1);
    const bad = legalSetup(ds); if (bad.length) errors.push(st.id + ' diagram: stones without liberties ' + bad);
    dg = { s: ds }; if (d.marks) dg.marks = d.marks; if (d.arrows) dg.arrows = d.arrows; if (d.view) dg.view = d.view;
  }
  const so = { id: st.id, course: st.course, title: st.title, sub: st.sub, intro: st.intro, goal: st.goal, hint: st.hint };
  if (dg) so.diagram = dg;
  so.problems = probs;
  outSteps.push(so);
}
if (ONLY) { console.log(errors.join('\n') || 'OK'); process.exit(0); }
// translations: data/lessons-i18n.json maps each English string to {zh,ko,es,fr,pt,de,hi,ar}; merged into every {ja,en} object
const I18N_LANGS = ['zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
const I18N_FILE = path.join(DIR, 'data', 'lessons-i18n.json');
const tr = fs.existsSync(I18N_FILE) ? JSON.parse(fs.readFileSync(I18N_FILE, 'utf8')) : {};
const missingTr = new Set();
const loc = o => {
  if (Array.isArray(o)) return o.map(loc);
  if (!o || typeof o !== 'object') return o;
  if (typeof o.ja === 'string' && typeof o.en === 'string') {
    const t = tr[o.en] || {}, r = { ja: o.ja, en: o.en };
    for (const l of I18N_LANGS) if (typeof t[l] === 'string') r[l] = t[l]; else missingTr.add(o.en);
    return r;
  }
  const r = {}; for (const k in o) r[k] = loc(o[k]); return r;
};
fs.writeFileSync(path.join(DIR, '..', 'lessons.json'), JSON.stringify({ version: 1, courses: loc(courses), steps: loc(outSteps) }, null, 1));
fs.writeFileSync(path.join(DIR, 'lessons-check.json'), JSON.stringify({ generated: new Date().toISOString(), steps: report, errors }, null, 1));
console.log(outSteps.length + ' steps, ' + outSteps.reduce((a, s) => a + s.problems.length, 0) + ' problems');
if (missingTr.size) console.log('i18n: ' + missingTr.size + ' strings without full translations (en fallback) — add them to data/lessons-i18n.json');
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'all checks passed');
