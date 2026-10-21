// One-off (2026-10-21): replace puzzles whose fun score (fun.js) is below MIN with fun lichess puzzles of the same kind,
// the same length (mate in N / number of own moves) and a similar difficulty, keeping each level ordered easy → hard:
//   mate in N  — ordered by number of pieces: the new puzzle's piece count stays between its neighbours'
//   tactics    — ordered by lichess rating: the new rating stays between its neighbours' (and inside the level's band)
// Every replacement is verified by funScore (engine.js mate proof / WebAssembly engine line check: ok = true) and must
// score >= TARGET (or >= MIN when no better one is found among the tried candidates).
// Slots never move: the previous puzzle is kept in P.old["L-j"] and the page shows it to players who already have a
// record for the slot; the daily puzzle keeps it for dates <= P.cut.
// usage: node refresh_fun.js pool.json scores.txt     (pool: lichess_pool.js, scores: `node fun.js meta.json` output)
//        deterministic; refuses to run twice.
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
const { funScore, moveInfo } = require('./fun.js');
const file = path.join(__dirname, '..', 'puzzles.json');
const D = JSON.parse(fs.readFileSync(file, 'utf8'));
if (D.old) { console.error('already refreshed'); process.exit(1); }
const CUT = '2026-10-21', MIN = 70, TARGET = 75, TRIES = 10;
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const ARGS = isMainThread ? process.argv.slice(2) : workerData.args;
let pool = null;   // loaded in the workers only (large)
const scores = {};
for (const l of fs.readFileSync(ARGS[1], 'utf8').split('\n')) { const [k, f] = l.split('\t'); if (k && f !== undefined) scores[k] = +f; }
const pcOf = f => f.split(' ')[0].replace(/[^a-zA-Z]/g, '').length;
const GOOD = new Set(['sacrifice', 'quietMove', 'deflection', 'attraction', 'clearance', 'interference', 'intermezzo', 'zugzwang', 'xRayAttack', 'doubleCheck', 'smotheredMate', 'discoveredAttack', 'capturingDefender', 'trappedPiece', 'skewer', 'fork', 'pin', 'defensiveMove', 'arabianMate', 'anastasiaMate', 'bodenMate', 'dovetailMate', 'hookMate', 'doubleBishopMate', 'underPromotion', 'enPassant', 'castling']);
// cheap pre-ranking (no search): votes, motifs, a non-trivial first move
function pre(c) {
  let s = c.pop + 6 * c.all.filter(x => GOOD.has(x)).length;
  if (c.all.includes('hangingPiece')) s -= 8;
  try {
    const q = E.Pos.fromFEN(c.fen); if (c.line) q.make(q.fromUci(c.line[0]));
    const m = q.fromUci(c.line ? c.line[1] : c.answer), mi = moveInfo(q, m);
    if (mi.quiet || mi.sac) s += 10; else if (mi.capture && mi.free) s -= 10;
    if (q.legal().length <= 2) s -= 20;
  } catch (e) { s -= 100; }
  return s;
}
// levels are independent: each one is refreshed in a worker thread (results do not depend on the scheduling)
function refreshLevel(i) {
  pool = pool || JSON.parse(fs.readFileSync(ARGS[0], 'utf8'));
  const L = D.levels[i], line = L.kind === 'line', A = L.puzzles.slice(), out = [];
  const used = new Set(); D.levels.forEach(M => M.puzzles.forEach(p => used.add(p.fen.split(' ')[0])));
  const val = p => line ? p.r : pcOf(p.fen);
  let tried = 0; const t0 = Date.now();
  for (let j = 0; j < A.length; j++) {
    const k = `${i}-${j}`, old = A[j];
    if (!(scores[k] < MIN)) continue;
    let lo = j ? val(A[j - 1]) : (line ? L.band[0] : 0), hi = j + 1 < A.length ? val(A[j + 1]) : (line ? L.band[1] : 99);
    if (lo > hi) [lo, hi] = [hi, lo];
    const want = val(old);
    let cands = line
      ? pool.tac.filter(c => c.line.length === old.line.length && c.r >= lo && c.r <= hi && c.r >= L.band[0] && c.r < L.band[1])
      : (pool.mate[L.n] || []).filter(c => c.pc >= lo && c.pc <= hi);
    cands = cands.filter(c => !used.has(c.fen.split(' ')[0]));
    cands.sort((a, b) => Math.abs(val(a) - want) - Math.abs(val(b) - want) || (a.id < b.id ? -1 : 1));
    cands = cands.slice(0, 60).map(c => ({ c, s: pre(c) })).sort((a, b) => b.s - a.s || (a.c.id < b.c.id ? -1 : 1)).slice(0, TRIES);
    let best = null;
    for (const { c } of cands) {
      const P = line ? { fen: c.fen, line: c.line, th: c.th, r: c.r } : { fen: c.fen, answer: c.answer };
      const f = funScore(P, { n: L.n, pop: c.pop }); tried++;
      if (f.ok && (!best || f.fun > best.fun)) best = { P, fun: f.fun, id: c.id };
      if (best && best.fun >= TARGET) break;
    }
    if (best && best.fun >= MIN && best.fun > scores[k]) {
      A[j] = best.P; used.add(best.P.fen.split(' ')[0]);
      out.push({ k, j, P: best.P, from: scores[k], to: best.fun, id: best.id, v: val(best.P), was: want });
      console.error(`${k}\t${scores[k]} -> ${best.fun}\t${best.id}\t${want} -> ${val(best.P)}\t(${tried} tried, ${((Date.now() - t0) / 1000) | 0}s)`);
    } else {
      out.push({ k, j, from: scores[k], to: null, best: best && best.fun });
      console.error(`${k}\t${scores[k]} kept (best candidate ${best ? best.fun : '-'})`);
    }
  }
  return out;
}
if (!isMainThread) { parentPort.postMessage(refreshLevel(workerData.i)); return; }
(async () => {
  const todo = D.levels.map((_, i) => i).filter(i => D.levels[i].puzzles.some((_, j) => scores[`${i}-${j}`] < MIN));
  const res = {}, nw = Math.max(1, Math.min(todo.length, require('os').cpus().length));
  let next = 0;
  await Promise.all(Array.from({ length: nw }, async () => {
    while (next < todo.length) {
      const i = todo[next++];
      res[i] = await new Promise((ok, ng) => { const w = new Worker(__filename, { workerData: { i, args: ARGS }, resourceLimits: { maxOldGenerationSizeMb: 3000 } }); w.once('message', ok); w.once('error', ng); });
    }
  }));
  D.old = {}; D.cut = CUT;
  const report = [];
  for (const i of todo) for (const r of res[i]) {
    if (r.to) { D.old[r.k] = D.levels[i].puzzles[r.j]; D.levels[i].puzzles[r.j] = r.P; }
    delete r.P; report.push(r);
  }
  D.version = 3;
  fs.writeFileSync(file, JSON.stringify(D));
fs.writeFileSync(path.join(__dirname, 'refresh_fun.log.json'), JSON.stringify(report, null, 0));
const by = {}; for (const r of report) { const i = r.k.split('-')[0]; by[i] = by[i] || { replaced: 0, low: 0 }; by[i].low++; if (r.to) by[i].replaced++; }
console.log(JSON.stringify(by));
})();
