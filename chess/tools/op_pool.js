// (2026-11-26 第2期・担当B) chess/open: add to each opening's pool (openings.json set.problems) the positions further off the study
// line, from the same kind of count as the pool (Lichess open database, September 2026, both players 2200+, 3 minutes or more;
// the first 400,000 such games, the first 32 plies). The old pool alone gave no opening 5 problems that pass the strict ①〜⑧ — its
// positions are the study line itself or one move off it (⑤ 追1: within 4 squares of a study position).
//   node chess/tools/op_pool.js add <agg.json>   → adds, for each opening, the positions that may pass (cheap checks: counts ②⑧,
//        the mover ④, 5 squares from every study position ⑤) and the pool positions on the way to them (④ the pool reaches them:
//        the opening's side moves by the pool's counted moves, the other side by any move); new ones carry `_add: 1`
//   (then node chess/tools/op_curate.js --write picks the drill with every check of tools/lesson-verify.js chessOpen and Stockfish)
//   node chess/tools/op_pool.js prune          → keeps of the added positions only the drill and the positions on the way to it,
//        renumbers the drill, drops `_add`
// agg.json: { "<board side castling>": ["<fen>", { "<uci>": games, ... }], ... } for every position of 40 games or more.
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '../..'), E = require(path.join(ROOT, 'chess/engine.js'));
const OPF = path.join(ROOT, 'chess/openings.json'), OP = JSON.parse(fs.readFileSync(OPF, 'utf8'));
const key = fen => fen.split(' ').slice(0, 3).join(' ');
const brd = fen => { const b = Array(64).fill('.'); fen.split(' ')[0].split('/').forEach((row, ri) => { let f = 0; for (const ch of row) { if (/\d/.test(ch)) f += +ch; else { b[(7 - ri) * 8 + f] = ch; f++; } } }); return b.join(''); };
const dist = (a, b) => { let n = 0; for (let i = 0; i < 64; i++) if (a[i] !== b[i]) n++; return n; };
const play = (fen, u) => { const q = E.Pos.fromFEN(fen), m = q.fromUci(u); if (!m) return null; q.make(m); return q.fen(); };
// the pool entry of a counted position: every move of 3% or more (five at most), most played first
function entry(fen, mv) {
  const N = Object.values(mv).reduce((x, c) => x + c, 0);
  const cand = Object.entries(mv).filter(([, c]) => c >= 0.03 * N).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 5);
  return { fen, cand, n: N };
}
const cmd = process.argv[2];
if (cmd === 'add') {
  const AG = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
  const lineB = []; OP.sets.forEach(s => { const p = E.Pos.fromFEN(E.START); lineB.push(brd(p.fen())); for (const [u] of (s.study && s.study.steps) || []) { const m = p.fromUci(u); if (!m) break; p.make(m); lineB.push(brd(p.fen())); } });
  for (const s of OP.sets) {
    const have = new Map(s.problems.map(P => [key(P.fen), P]));
    let f = E.START; for (const u of s.prefix.split(' ')) f = play(f, u);
    // the opening's side to move at the start: the prefix ends on the other side's move
    const start = [];
    if (f.split(' ')[1] === s.side) start.push(f); else { const a = AG[key(f)]; if (a) Object.keys(a[1]).forEach(u => start.push(play(f, u))); }
    const par = new Map(), seen = new Set(), Q = [];
    start.forEach(x => { if (AG[key(x)] && !seen.has(key(x))) { seen.add(key(x)); par.set(key(x), null); Q.push(x); } });
    const cands = [];
    while (Q.length) {
      const x = Q.shift(), a = AG[key(x)], P = have.get(key(x)) || entry(a[0], a[1]);
      const c = P.cand, n1 = (c[0] || [0, 0])[1], r2 = (c[1] || [0, 0])[1] / n1, r3 = (c[2] || [0, 0])[1] / n1;
      const pos = E.Pos.fromFEN(x), B = brd(x), d = Math.min(...lineB.map(b => dist(B, b)));
      if (!have.has(key(x)) && n1 >= 30 && c.length >= 2 && (r2 < 0.39 || (r2 >= 0.5 && r3 < 0.39)) && d >= 5 && !pos.inCheck() && pos.legal().length >= 3) cands.push(x);
      for (const [u] of c) { const y = play(x, u); const b = y && AG[key(y)]; if (!b) continue;
        for (const v of Object.keys(b[1])) { const z = play(y, v); if (!z || seen.has(key(z)) || !AG[key(z)]) continue; seen.add(key(z)); par.set(key(z), key(x)); Q.push(z); } }
    }
    // add the candidates (the most played 70 — each costs an engine read in op_curate.js) and their way from the start
    const add = new Map(), CAP = +(process.env.CAP || 70);
    cands.sort((a, b) => AG[key(b)][1][entry(...AG[key(b)]).cand[0][0]] - AG[key(a)][1][entry(...AG[key(a)]).cand[0][0]]).splice(CAP);
    for (const x of cands) { let k = key(x); while (k && !have.has(k) && !add.has(k)) { const a = AG[k]; add.set(k, Object.assign(entry(a[0], a[1]), { _add: 1 })); k = par.get(k); } }
    add.forEach(P => s.problems.push(P));
    console.log(`${s.id.padEnd(9)} reached ${seen.size}  candidates ${cands.length}  added ${add.size}`);
  }
  fs.writeFileSync(OPF, JSON.stringify(OP));
} else if (cmd === 'prune') {
  for (const s of OP.sets) {
    const need = new Set(s.problems.filter(P => !P._add).map(P => key(P.fen)));
    if (s.drill) {
      const byK = new Map(s.problems.map(P => [key(P.fen), P]));
      // the way to each drill position, through the pool (as tools/lesson-verify.js chessOpenCtx reach: a pool position goes on by its
      // counted moves, a position outside the pool by any legal move, and two positions outside the pool never follow each other)
      let f0 = E.START; for (const u of s.prefix.split(' ')) f0 = play(f0, u);
      const par = new Map([[key(f0), null]]), Q = [[f0, byK.has(key(f0)) ? 0 : 1]];
      while (Q.length) { const [x, gap] = Q.shift(), P = byK.get(key(x)), z0 = E.Pos.fromFEN(x), us = P ? P.cand.map(c => c[0]) : z0.legal().map(m => z0.uci(m));
        for (const u of us) { const y = play(x, u); if (!y) continue; const k = key(y), inP = byK.has(k); if (par.has(k) || (!inP && gap)) continue; par.set(k, key(x)); Q.push([y, inP ? 0 : 1]); } }
      s.drill.forEach(i => { let k = key(s.problems[i].fen); if (!par.has(k)) throw new Error(`${s.id}: drill ${i} not reached`); while (k) { if (byK.has(k)) need.add(k); k = par.get(k); } });
    }
    const keep = s.problems.filter(P => need.has(key(P.fen))), idx = new Map(keep.map((P, i) => [P, i]));
    if (s.drill) s.drill = s.drill.map(i => idx.get(s.problems[i]));
    keep.forEach(P => delete P._add);
    console.log(`${s.id.padEnd(9)} pool ${s.problems.length} → ${keep.length}` + (s.drill ? `  drill [${s.drill}]` : ''));
    s.problems = keep;
  }
  fs.writeFileSync(OPF, JSON.stringify(OP));
}
