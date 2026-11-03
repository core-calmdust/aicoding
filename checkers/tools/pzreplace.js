// One-off (2026-11-04): replace the puzzles tools/audit_puzzles.js flags as "giveback" (the material the puzzle wins is
// lost straight back: the attacker is worse after the solution, or the engine's continuation wins it back).
// For each flagged slot: candidates (pzgen output) of the same course filter, the same goal (n, g) and tag kind, sound,
// fun >= MINFUN (pzcurate.js features()), clean in auditOne (no hollow / giveback / escape), not a look-alike of the
// course's puzzles, closest in difficulty to the old one. Slots never move: the previous puzzle is kept in old["id-j"]
// (app.js pzSlot: players with a record keep it, the daily keeps it for dates <= cut).
// usage: node tools/pzreplace.js audit.json cand1.jsonl [cand2.jsonl …]    (audit.json: audit_puzzles.js --json)
'use strict';
const fs = require('fs'), path = require('path');
const { features, COURSES, similar, MINFUN } = require('./pzcurate.js');
const { auditOne } = require('./audit_puzzles.js');
const CUT = '2026-11-04';
const file = path.join(__dirname, '..', 'puzzles.json');
(async () => {
  const A = await require('./wasm.js').load();
  const D = JSON.parse(fs.readFileSync(file, 'utf8'));
  const [auditFile, ...cands] = process.argv.slice(2);
  const bad = JSON.parse(fs.readFileSync(auditFile, 'utf8')).filter(r => r.flags.includes('giveback'));
  const inUse = new Set(); for (const T of D.themes) for (const P of T.puzzles) inUse.add(P.s.b + P.s.side);
  if (D.old) for (const P of Object.values(D.old)) inUse.add(P.s.b + P.s.side);
  const pool = [];
  for (const f of cands) for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!l.trim()) continue; const x = JSON.parse(l);
    if ((x.va || 0) < (x.vb || 0) - 25 || (x.va || 0) <= -150 || x.n > 7) continue;
    const P = { s: { b: x.b, side: x.side }, n: x.n, answer: x.f + 32 * x.t + 1024 * x.cap, ...(x.g ? { g: x.g } : {}) };
    if (inUse.has(P.s.b + P.s.side)) continue; inUse.add(P.s.b + P.s.side);
    pool.push({ P, f: null, a: null });
  }
  console.error('pool', pool.length);
  const feat = x => x.f || (x.f = features(A, x.P, x.P.g || 0));
  const clean = x => { if (!x.a) x.a = auditOne(A, x.P, x.P.g || 0, 500); return !x.a.flags.length; };
  D.old = D.old || {}; D.cut = CUT;
  const log = [];
  for (const r of bad) {
    const [tid, js] = r.id.split('-'), j = +js, T = D.themes.find(t => t.id === tid), C = COURSES.find(c => c.id === tid), P0 = T.puzzles[j];
    const f0 = features(A, P0, P0.g || 0);
    const others = T.puzzles.filter((_, k) => k !== j).map(P => ({ P }));
    const ok = pool.filter(x => !x.used && x.P.n === P0.n && (x.P.g || 0) === (P0.g || 0));
    const scored = [];
    for (const x of ok) {
      const f = feat(x); if (!f.sound || f.fun < MINFUN) continue;
      if (C.need && !C.need(f)) continue;
      if (P0.t && P0.t !== 'gain' && P0.t !== 'win' && !f.tags.has(P0.t)) continue;   // keep the shown theme tag true
      if (others.some(y => similar({ P: x.P }, y))) continue;
      scored.push({ x, d: Math.abs(f.diff - f0.diff) - f.fun / 50 });
    }
    scored.sort((a, b) => a.d - b.d);
    let pick = null; for (const s of scored.slice(0, 25)) if (clean(s.x)) { pick = s.x; break; }
    if (!pick) { log.push({ id: r.id, replaced: false, cands: scored.length }); console.error(r.id, 'no candidate', scored.length); continue; }
    pick.used = true;
    D.old[r.id] = P0;
    T.puzzles[j] = Object.assign({ s: pick.P.s, n: pick.P.n, answer: pick.P.answer }, pick.P.g ? { g: pick.P.g } : {}, P0.t ? { t: P0.t } : {});
    log.push({ id: r.id, replaced: true, fun: pick.f.fun, diff: +pick.f.diff.toFixed(1), diff0: +f0.diff.toFixed(1), line: pick.a.line });
    console.error(r.id, 'replaced', pick.a.line, 'fun', pick.f.fun, 'diff', pick.f.diff.toFixed(1), '/', f0.diff.toFixed(1));
  }
  fs.writeFileSync(file, JSON.stringify(D));
  console.log(JSON.stringify(log));
})();
