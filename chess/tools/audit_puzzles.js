// Puzzle audit (correctness + defender replies), run with the page's engines.
//   mate in N (levels with n): engine.js exhaustive mate proof (as the page) — exactly one first move mates within N,
//     none sooner, it is the stored answer; then the main line as the page plays it (defender = longest resistance)
//     must end in mate within N.
//   tactics (line): every scripted move is checked with the WebAssembly engine (tools/wasm.js, node-limited):
//     solver moves — the engine's best or an equally fast mate (else "solver"),
//     defender replies — the scripted reply must be the best defence: flagged "reply" when another reply is better for the
//     defender by a win-chance gap > 0.15 or avoids a forced mate the scripted reply walks into; "end" when the solver is
//     not clearly better (< +150 and no mate) after the line.
// usage: node tools/audit_puzzles.js [--nodes 400000] [--levels 4,5] [--part k/m] [--json out.json]
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js'), W = require('./wasm.js');
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const NODES = +(opt('--nodes') || 4e5), LV = opt('--levels') ? opt('--levels').split(',').map(Number) : null, OUT = opt('--json');
const PART = opt('--part') ? opt('--part').split('/').map(Number) : [0, 1];
const D = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'puzzles.json'), 'utf8'));
const isMate = v => Math.abs(v) > E.MATET;
const wc = v => isMate(v) ? Math.sign(v) : 2 / (1 + Math.exp(-0.004 * v)) - 1;   // win chance -1..1
const posOf = (fen, ucis) => { const p = E.Pos.fromFEN(fen); for (const u of ucis) { const m = p.fromUci(u); if (!m) throw new Error('illegal ' + u); p.make(m); } return p; };
const ints = (fen, ucis) => { const p = E.Pos.fromFEN(fen), o = []; for (const u of ucis) { const m = p.fromUci(u); o.push(m); p.make(m); } return o; };
const san = (fen, ucis) => { const p = E.Pos.fromFEN(fen); return ucis.map(u => { const m = p.fromUci(u), s = p.san(m); p.make(m); return s; }).join(' '); };
function auditMate(P, n) {
  const flags = [], p0 = E.Pos.fromFEN(P.fen);
  const r = E.mate(P.fen, [], n, false, 3e7);
  if (!r) return { flags: ['budget'] };
  const sols = r.filter(x => x.need > 0 && x.need <= n);
  if (sols.length !== 1 || p0.uci(sols[0].m) !== P.answer || sols[0].need !== n) flags.push('wrong:' + sols.map(x => p0.san(x.m) + '/' + x.need).join(','));
  const line = [P.answer]; let used = 1;
  for (let s = 0; s < 2 * n; s++) {
    const pos = posOf(P.fen, line); if (!pos.legal().length) break;
    const att = pos.side === p0.side, left = n - used;
    if (!att) {
      const dl = E.mate(P.fen, ints(P.fen, line), left, true, 3e7); if (!dl) { flags.push('budget'); break; }
      let best = null; for (const e of dl) { const v = e.need ? e.need : 99; if (!best || v > best.v) best = { m: e.m, v }; }
      if (best.v === 99) { flags.push('escape'); break; }
      line.push(pos.uci(best.m));
    } else {
      if (left <= 0) { flags.push('notMated'); break; }
      const al = E.mate(P.fen, ints(P.fen, line), left, false, 3e7); if (!al) { flags.push('budget'); break; }
      const g = al.filter(e => e.need && e.need <= left).sort((a, b) => a.need - b.need); if (!g.length) { flags.push('notMated'); break; }
      line.push(pos.uci(g[0].m)); used++;
    }
  }
  const last = posOf(P.fen, line); if (last.legal().length || !last.inCheck()) if (!flags.includes('notMated')) flags.push('notMated');
  return { flags, line: san(P.fen, line) };
}
function auditLine(P) {
  const flags = [], det = [];
  try { posOf(P.fen, P.line); } catch (e) { return { flags: ['illegal'] }; }
  for (let i = 1; i < P.line.length; i++) {
    const r = W.analyze(P.fen, P.line.slice(0, i), NODES); if (!r.length) { flags.push('over'); break; }
    const mine = r.find(x => x.uci === P.line[i]), best = r[0];
    if (!mine) { flags.push('illegal'); break; }
    if (i & 1) {   // solver
      if (mine.uci !== best.uci && !(isMate(best.v) && mine.v === best.v) && !(isMate(best.v) && isMate(mine.v) && mine.v > 0 && i === P.line.length - 1) && best.v - mine.v > 60) { flags.push('solver'); det.push(`${i}:${P.line[i]}(${mine.v}) best ${best.uci}(${best.v})`); }
    } else {       // defender reply (scripted)
      if (mine.uci === best.uci || mine.v === best.v) continue;
      // a worse reply matters only when it changes the outcome: win-chance gap (lichess-style logistic) > 0.15,
      // or the scripted reply walks into a forced mate the best reply avoids
      const bad = (isMate(mine.v) && mine.v < 0 && !(isMate(best.v) && best.v < 0)) || (!isMate(mine.v) && !isMate(best.v) && wc(best.v) - wc(mine.v) > .15);
      if (bad) { flags.push('reply'); det.push(`${i}:${P.line[i]}(${mine.v}) best ${best.uci}(${best.v})`); }
    }
  }
  const fin = posOf(P.fen, P.line);
  let endV = null;
  if (fin.legal().length) { const r = W.analyze(P.fen, P.line, NODES); endV = r.length ? -r[0].v : 0; if (!isMate(endV) && endV < 150) flags.push('end'); }
  return { flags, det, endV, line: san(P.fen, P.line) };
}
const out = [], cnt = { checked: 0 };
let idx = 0;
D.levels.forEach((L, i) => {
  if (LV && !LV.includes(i)) return;
  L.puzzles.forEach((P, j) => {
    if ((idx++ % PART[1]) !== PART[0]) return;
    cnt.checked++;
    const r = P.line ? auditLine(P) : auditMate(P, L.n);
    for (const f of r.flags) { const k = f.split(':')[0]; cnt[k] = (cnt[k] || 0) + 1; }
    out.push(Object.assign({ id: i + '-' + j }, r));
    if (r.flags.length) console.log(i + '-' + j, r.flags.join(' '), '|', r.line, '|', (r.det || []).join('; '), r.endV != null ? 'end ' + r.endV : '');
  });
});
console.log(JSON.stringify(cnt));
if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
