// Puzzle audit with the page's WebAssembly engine (tools/wasm.js): replays every puzzle the way the page does and checks
//   - correctness: exactly one first move reaches the goal in n own moves, none sooner, and it is the stored answer
//     (engine.c puzzle(); tools/pzverify.js is the independent JS proof);
//   - the defender's replies: the page picks the reply that resists longest (puzzle(defend)) and, among replies that
//     resist equally long, the one the engine values best (analyze). "oldpick" counts the puzzles where the former
//     rule (first move in generation order) chose a clearly worse reply (>= 100 below the best tied reply);
//   - the end of the main line: goal reached within n, and for gain puzzles what the won material is worth: "hollow" when
//     the attacker is not clearly better (< +50) after the line; "giveback" (a flawed puzzle) when the attacker is worse
//     (< -60) or the engine's continuation wins the material straight back (lead gain <= 0 within 8 plies).
// usage: node tools/audit_puzzles.js [--ms 700] [--only themeId] [--json out.json]
//        require('./audit_puzzles.js').auditOne(A, P, g, ms)   (A = await require('./wasm.js').load())
'use strict';
const path = require('path'), fs = require('fs');
const W = require('./wasm.js');
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const MS = +(opt('--ms') || 700), ONLY = opt('--only'), OUT = opt('--json');
function auditOne(A, P, g, MS) {
  const E = A.E, lead = (p, me) => p.count(me) - p.count(3 - me);
  const me = P.s.side, p0 = E.Pos.from(P.s), base = lead(p0, me), flags = [];
  const reached = p => p.status() === -1 || (g && !p.hasCaps() && lead(p, me) - base >= g);
  const L0 = A.puzzle(P.s, [], P.n, false, g, 0);
  if (L0.some(x => x.need < 0)) flags.push('budget');
  const sols = L0.filter(x => x.need > 0 && x.need <= P.n);
  if (sols.length !== 1 || sols[0].m !== P.answer || sols[0].need !== P.n) flags.push('wrong:' + sols.map(x => E.name(p0, x.m) + '/' + x.need).join(','));
  const line = [P.answer]; let used = 1, oldBad = null;
  for (let s = 0; s < 20; s++) {
    const { pos } = E.replay(P.s, line);
    if (reached(pos)) break;
    if (pos.side + 1 !== me) {   // defender: longest resistance, ties -> engine's best (app.js pzDefence)
      const dl = A.puzzle(P.s, line, P.n - used, true, g, base);
      if (!dl.length) break;
      const sc = e => e.need === 0 ? 99 : e.need < 0 ? 50 : e.need, top = Math.max(...dl.map(sc)), tied = dl.filter(e => sc(e) === top);
      let pick = tied[0].m;
      if (tied.length > 1) {
        const an = A.analyze(P.s, line, MS).list, v = m => { const e = an.find(x => x.m === m); return e ? e.v : -1e9; };
        pick = tied.reduce((a, b) => v(b.m) > v(a.m) ? b : a).m;
        if (v(pick) - v(tied[0].m) >= 100 && !oldBad) oldBad = { at: line.length, old: E.name(pos, tied[0].m), now: E.name(pos, pick), dv: v(pick) - v(tied[0].m) };
      }
      if (top === 99) flags.push('escape');
      line.push(pick);
    } else {                     // attacker: fastest (app.js pickAttack, goal as mateReq)
      if (used >= P.n) { flags.push('notReached'); break; }
      const goal = g ? Math.max(1, g - (lead(pos, me) - base)) : 0;
      const al = A.puzzle(P.s, line, P.n - used, false, goal, 0).filter(e => e.need > 0 && e.need <= P.n - used).sort((a, b) => a.need - b.need);
      if (!al.length) { flags.push('notReached'); break; }
      line.push(al[0].m); used++;
    }
  }
  if (oldBad) flags.push('oldpick');
  let endV = null, minLead = null;
  const { pos: fin } = E.replay(P.s, line);
  if (g && fin.status() !== -1) {
    const an = A.analyze(P.s, line, MS).list, top = an.length ? Math.max(...an.map(e => e.v)) : 0;
    endV = (fin.side + 1) === me ? top : -top;
    if (endV < 50) {
      flags.push('hollow');
      const q = fin.clone(), pv = []; minLead = 99;
      for (let i = 0; i < 8; i++) { const b = A.best(P.s, line.concat(pv), 300); if (b.m == null || !q.moves().includes(b.m)) break; pv.push(b.m); q.play(b.m); if (!q.hasCaps()) minLead = Math.min(minLead, lead(q, me) - base); }
      if (endV < -60 || minLead <= 0) flags.push('giveback');
    }
  }
  const p = E.Pos.from(P.s), txt = line.map(m => { const s = E.name(p, m); p.play(m); return s; }).join(' ');
  return { flags, line: txt, endV, minLead, oldBad };
}
module.exports = { auditOne };
if (require.main === module) (async () => {
  const D = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'puzzles.json'), 'utf8'));
  const A = await W.load();
  const res = [], cnt = { checked: 0 };
  for (const T of D.themes) {
    if (ONLY && T.id !== ONLY) continue;
    for (let j = 0; j < T.puzzles.length; j++) {
      const P = T.puzzles[j], id = T.id + '-' + j; cnt.checked++;
      const r = Object.assign({ id, n: P.n, g: P.g || T.g || 0 }, auditOne(A, P, P.g || T.g || 0, MS));
      for (const f of r.flags) { const k = f.split(':')[0]; cnt[k] = (cnt[k] || 0) + 1; }
      res.push(r);
      if (r.flags.length) console.log(id, r.flags.join(' '), '|', r.line, r.endV != null ? 'end ' + r.endV + (r.minLead != null ? ' lead ' + r.minLead : '') : '', r.oldBad ? `| was ${r.oldBad.old} now ${r.oldBad.now} (+${r.oldBad.dv})` : '');
    }
  }
  console.log(JSON.stringify(cnt));
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
})();
