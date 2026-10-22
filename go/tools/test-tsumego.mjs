// Re-verify every puzzle of go/puzzles.json with the runtime solver (go/tsumego.js) and print a summary.
//   node tools/test-tsumego.mjs [--quick]
// Checks per puzzle: legal setup (every stone has a liberty), exactly one first move reaches the goal within n and it
// needs exactly n (= the answer), the main line is legal, starts with the answer, has n player moves and reaches the
// goal (reached() true at its end) — all with the exact solver ({exact: true}, no time budget, no use of the stored
// answer). Timing uses the page mode (what the worker runs: the stored main line is trusted, other moves get a time
// budget of GoTsumego.budget ms): every position along the main line (reached? + the next side's candidates, as the page
// asks) plus up to 2 wrong first moves with the defender's reply and the player's next list; max must be < 300 ms.
// Copyright 2026 core-calmdust — Apache License 2.0
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const DIR = path.dirname(new URL(import.meta.url).pathname);
const R = require(path.join(DIR, '..', 'rules.js'));
const T = require(path.join(DIR, '..', 'tsumego.js'));
const D = JSON.parse(fs.readFileSync(path.join(DIR, '..', 'puzzles.json'), 'utf8'));
const quick = process.argv.includes('--quick');
const EX = { exact: true };
const idx = (v, n) => R.parseCoord(v, n);
const errors = [], times = [], perTheme = [];
let total = 0, black = 0, white = 0, slowest = { ms: 0 };
const timed = (f, tag) => { const t = process.hrtime.bigint(); const r = f(); const ms = Number(process.hrtime.bigint() - t) / 1e6; times.push(ms); if (ms > slowest.ms) slowest = { ms, tag }; return r; };
if (D.themes.length !== 10) errors.push(`themes: ${D.themes.length} (want 10)`);
for (const Th of D.themes) {
  const funs = [];
  if (Th.puzzles.length !== 50) errors.push(`${Th.id}: ${Th.puzzles.length} puzzles (want 50)`);
  if (!Th.title || !Th.title.ja || !Th.title.en || !Th.sub || !Th.sub.ja || !Th.sub.en) errors.push(`${Th.id}: title/sub ja+en missing`);
  Th.puzzles.forEach((Q, j) => {
    total++; funs.push(Q.fun);
    const tag = `${Th.id}-${j}`, n = Q.s.n;
    const P = { s: Q.s, goal: Q.goal, target: Q.target.map(v => idx(v, n)), region: Q.region.map(v => idx(v, n)), n: Q.n, answer: idx(Q.answer, n), line: Q.line.map(v => idx(v, n)) };
    if (Q.s.turn === 1) black++; else white++;
    const bad = m => errors.push(`${tag}: ${m}`);
    for (const k of ['s', 'goal', 'target', 'region', 'n', 'answer', 'line', 'fun']) if (Q[k] === undefined) bad('missing ' + k);
    const p0 = R.Pos.from(Q.s);
    for (let i = 0; i < n * n; i++) if (p0.b[i] && p0.group(i).libs === 0) { bad('stone without liberty ' + R.coord(i, n)); break; }
    if (n > 9 && !Q.view) bad('no view');
    // ---- 1. page mode timing on a fresh solver (what the worker does during play)
    T._reset();
    const proot = timed(() => T.solve(P, [], P.n, false), tag + ' root');
    if (!proot.some(e => e.m === P.answer && e.need === P.n)) bad('page mode: answer missing at the root');
    {
      let pos = p0, att = 0;
      for (let k = 0; k < P.line.length && !quick; k++) {
        const r = pos.tryPlay(P.line[k]); if (!r) break;
        pos = r.pos; if (k % 2 === 0) att++;
        const done = timed(() => T.reached(P, pos), tag + ' reached@' + (k + 1));
        if (done && k < P.line.length - 1) bad('page mode: reached before the end of the line (move ' + (k + 1) + ')');
        if (!done) timed(() => T.solve(P, P.line.slice(0, k + 1), P.n - att, k % 2 === 0), tag + ' solve@' + (k + 1));
        else if (k === P.line.length - 1) {} // solved
      }
      if (!quick && P.n > 1) {   // wrong first moves: the defender's reply, then the player's next list
        for (const w of proot.filter(e => e.m !== P.answer).slice(0, 2)) {
          const dl = timed(() => T.solve(P, [w.m], P.n - 1, true), tag + ' wrong ' + R.coord(w.m, n));
          if (dl.length) timed(() => T.solve(P, [w.m, dl[0].m], P.n - 1, false), tag + ' wrong+reply');
        }
      }
    }
    // ---- 2. exact verification (no stored answer used, no time budget)
    T._reset();
    const root = T.solve(P, [], P.n, false, EX);
    const win = root.filter(e => e.need > 0 && e.need <= P.n);
    if (win.length !== 1) bad(`${win.length} first moves reach the goal (${win.map(e => R.coord(e.m, n) + ':' + e.need).join(' ')})`);
    else { if (win[0].m !== P.answer) bad(`answer ${Q.answer} but solver says ${R.coord(win[0].m, n)}`); if (win[0].need !== P.n) bad(`need ${win[0].need} != n ${P.n}`); }
    if (P.line[0] !== P.answer) bad('line does not start with the answer');
    let pos = p0, att = 0;
    for (let k = 0; k < P.line.length; k++) {
      const r = pos.tryPlay(P.line[k]); if (!r) { bad('illegal line move ' + Q.line[k]); break; }
      pos = r.pos; if (k % 2 === 0) att++;
      if (pos.ko >= 0) bad('ko in the line (move ' + (k + 1) + ')');
      if (k < P.line.length - 1 && T.reached(P, pos, EX)) bad('goal reached before the end of the line (move ' + (k + 1) + ')');
    }
    if (att !== P.n) bad(`line has ${att} player moves, n = ${P.n}`);
    if (!T.reached(P, pos, EX)) bad('goal not reached at the end of the line (exact)');
    if (!T.reached(P, pos)) bad('goal not reached at the end of the line (page mode)');
  });
  const s = funs.slice().sort((a, b) => a - b);
  perTheme.push({ id: Th.id, grp: Th.grp, ja: Th.title.ja, count: Th.puzzles.length, fun: `${s[0]}-${s[s.length - 1]}`, n: [...new Set(Th.puzzles.map(p => p.n))].sort().join(',') });
}
times.sort((a, b) => a - b);
console.table(perTheme);
console.log(`puzzles ${total}, Black to play ${black}, White to play ${white}`);
console.log(`solve/reached calls ${times.length}: median ${times[times.length >> 1].toFixed(1)} ms, p95 ${times[Math.floor(times.length * 0.95)].toFixed(1)} ms, max ${slowest.ms.toFixed(1)} ms (${slowest.tag})`);
if (slowest.ms >= 300) errors.push(`slow: ${slowest.ms.toFixed(0)} ms at ${slowest.tag}`);
console.log(errors.length ? `FAIL: ${errors.length} problem(s)\n` + errors.slice(0, 40).join('\n') : 'OK: all puzzles verified');
process.exit(errors.length ? 1 : 0);
