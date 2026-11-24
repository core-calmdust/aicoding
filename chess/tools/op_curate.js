// (2026-11-24 第2期・担当B) the chess opening practice (openings.json, chess/open): pick, for each opening, the problems of its pool
// (positions of strong games with the moves played there, cand: [uci, games]) that pass the strict ①〜⑧ of claude/lesson-quality.md,
// in an easy → hard order, and store their indices as set.drill (the 2D and the 3D draw 5 of them, keeping that order; the pool stays —
// the 2D book and the AI use every position). The checks are those of tools/lesson-verify.js chessOpen (one function, chessOpenProblem),
// plus Stockfish (when /usr/games/stockfish is there) as a second, stronger engine at curation time.
//   node chess/tools/op_curate.js            → a report: how many of each pool pass, and why the others fail
//   node chess/tools/op_curate.js --write    → writes set.drill (5〜7 problems) for the openings with 5 or more, removes it elsewhere
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.join(__dirname, '../..'), V = require(path.join(ROOT, 'tools/lesson-verify.js'));
const OPF = path.join(ROOT, 'chess/openings.json'), OP = JSON.parse(fs.readFileSync(OPF, 'utf8'));
const SF = '/usr/games/stockfish', hasSF = fs.existsSync(SF), sfCache = {};
function sf(fen, moves) {   // Stockfish depth 18: the best value and the value of each listed move (mover's side, cp)
  const key = fen + '|' + moves.join(','); if (sfCache[key]) return sfCache[key];
  const cmd = ['uci', 'setoption name Threads value 4', 'setoption name Hash value 128', 'isready', `position fen ${fen}`, 'go depth 18'];
  moves.forEach(m => cmd.push(`position fen ${fen}`, `go depth 18 searchmoves ${m}`));
  cmd.push('quit');
  const out = cp.spawnSync(SF, { input: cmd.join('\n') + '\n', encoding: 'utf8', maxBuffer: 1 << 26 }).stdout.split('\n');
  const vals = []; let last = null;
  for (const l of out) { const m = l.match(/ score (cp|mate) (-?\d+)/); if (m && / pv /.test(l)) last = m[1] === 'cp' ? +m[2] : (+m[2] > 0 ? 30000 : -30000); if (/^bestmove/.test(l)) { vals.push(last); last = null; } }
  return (sfCache[key] = { best: vals[0], mv: Object.fromEntries(moves.map((m, i) => [m, vals[i + 1]])) });
}
const write = process.argv.includes('--write'), only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const ctx = V.chessOpenCtx(OP);
const picks = {};
for (const s of OP.sets) {
  if (only.length && !only.includes(s.id)) { if (s.drill) picks[s.id] = s.drill; continue; }
  const why = {}, ok = [];
  s.problems.forEach((P, j) => {
    // ② a move played half as often as the most played one and as good (both engines) is right too (acc); two at most
    delete P.acc; const n1 = P.cand[0][1], alt = P.cand.slice(1).filter(x => x[1] >= 0.5 * n1).map(x => x[0]);
    if (alt.length === 1) P.acc = [P.cand[0][0], alt[0]];
    const f = V.chessOpenProblem(ctx, s, P, j, { pool: false });
    if (!f.length && hasSF) { const acc = P.acc || [P.cand[0][0]], r = sf(P.fen, acc);
      acc.forEach(u => { const loss = r.best - r.mv[u]; if (loss > 40) f.push(`① Stockfish puts ${u} ${loss} below its best`); });
      if (Math.abs(r.best) > 150) f.push(`④ Stockfish: decided (${r.best})`); }
    if (f.length) delete P.acc;
    if (f.length) f.forEach(m => { const k = m.split(' ').slice(0, 2).join(' '); why[k] = (why[k] || 0) + 1; }); else ok.push(j);
  });
  // ⑤ ⑥: easy → hard, 5 squares from every other problem and the study lines, one answer twice at most, one kind of move 3 times at most
  ok.sort((a, b) => V.chessOpenD(s.problems[a]) - V.chessOpenD(s.problems[b]));
  const pick = [];
  for (const j of ok) { if (pick.length >= 7) break; const trial = pick.concat([j]);
    const f = V.chessOpenSet(ctx, s, trial, picks); if (!f.length) pick.push(j); else why[f[0].split(' ').slice(0, 2).join(' ')] = (why[f[0].split(' ').slice(0, 2).join(' ')] || 0) + 1; }
  console.log(`${s.id.padEnd(9)} pool ${s.problems.length}  pass ${ok.length}  picked ${pick.length} [${pick}]  ` + Object.entries(why).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}×${n}`).join('  '));
  if (pick.length >= 5) picks[s.id] = pick;
}
if (write) {
  const keep = new Set(); OP.sets.forEach(s => { if (picks[s.id]) { s.drill = picks[s.id]; s.drill.forEach(k => keep.add(s.problems[k])); } else delete s.drill; s.problems.forEach(P => { if (!keep.has(P)) delete P.acc; }); });
  const o = {}; OP.sets.forEach(s => { o[s.id] = s; });   // (drill right after the id)
  OP.sets = OP.sets.map(s => { const { id, drill, ...rest } = s; return drill ? { id, drill, ...rest } : { id, ...rest }; });
  fs.writeFileSync(OPF, JSON.stringify(OP));
  console.log('written', Object.keys(picks).length, 'openings with a drill');
}
