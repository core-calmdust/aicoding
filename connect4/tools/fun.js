// Connect Four puzzle "fun score" (0–100) — how enjoyable a puzzle is for a human, on top of being correct.
// usage: node tools/fun.js            → distribution per theme + best / worst samples
//        node tools/fun.js --list     → every puzzle with its score and parts
// The puzzles are already verified by the engine (unique key move, exact solver values); this measures quality.
//
// Criteria (weights add up to 100):
//  K1 意外性 (30)   the key move is not the obvious one: not a forced block of a playable enemy threat, not the
//                   only move that does not lose at a glance, ranked low by a shallow 2-ply heuristic (what a human
//                   tries first), and quiet (prepares instead of making a playable threat). Win-in-1: diagonal /
//                   horizontal fours and a "gap" four are less visible than a vertical three.
//  K2 誘惑 (20/25)  several plausible first tries: alternatives that do not lose at a glance (one-ply check), decoy
//                   checks that make a threat but fail, and alternatives whose refutation is deep (not a quick loss).
//  K3 山場・主題 (20/15) mate: a quiet attacker move in the middle of the line and real defender choices (not a
//                   string of forced checks); one-move puzzles: the motif the theme promises is really there
//                   (parity threat for 奇数・偶数, no new threat for 静かな一手, an edge column for 端…).
//  K4 健全さ (15)   no duals on the main line (each later attacker move is the only one that still wins in time),
//                   one-move puzzles: not a short combination in disguise; mirror / identical duplicates in the set → 0.
//  K5 すっきり (15)  clean, natural position: few stones, no clutter of ready-made own threats, and no earlier moves in
//                   the record where a side missed a four or ignored a playable enemy four (unnatural history).
// Threshold for the 2026-10-21 refresh: 70.
'use strict';
const path = require('path');
const U = require('./c4util.js');
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

// count of moves in the record where the mover missed a playable win or left a playable enemy win
function historyBlunders(mv) {
  let k = 0;
  for (let i = 0; i < mv.length; i++) {
    const g = U.grid(mv.slice(0, i)), p = i % 2 ? 2 : 1, c = mv.charCodeAt(i) - 49;
    const myW = U.immWins(g, p), opW = U.immWins(g, 3 - p);
    if (myW.length && !myW.includes(c)) k++;
    else if (!myW.length && opW.length && !opW.includes(c)) k++;
  }
  return k;
}
function cleanScore(mv) {
  const g = U.grid(mv), p = U.toMove(mv), s = mv.length;
  const fill = clamp(1 - (s - 12) / 26, 0.25, 1);                 // 12 stones → 1, 38 → 0.25
  const ready = U.threats(g, p).filter(t => !t.playable).length + U.threats(g, 3 - p).filter(t => !t.playable).length;
  const clutter = clamp(1 - Math.max(0, ready - 3) * 0.12, 0.4, 1);
  const bl = historyBlunders(mv);
  return clamp(0.5 * fill + 0.2 * clutter + 0.3 * clamp(1 - bl * 0.5));
}
// shallow heuristic ranking (2-ply engine search): rank of column c, 0 = the move a human would try first
function heurRank(E, mv, c) {
  E.clearHT(); E.loadMoves(mv); E.setDeadline2();       // fresh hash table: the ranking must not depend on call order
  const r = E.rootHeur(2); if (!r) return 0;
  const me = r.find(x => x.c === c); if (!me) return 0;
  return r.filter(x => x.c !== c && x.s > me.s).length;
}
const plausibleOf = (g, p, skip) => U.legal(g).filter(c => c !== skip && !U.obviousLoss(g, c, p));
const tCurve = a => [0, 0.45, 0.7, 0.85, 1][Math.min(4, a)];

// ---- mate puzzles { moves, n, answer }
function mateLine(E, mv, ans, n) {
  // main line: key, then the defender's most stubborn reply, the attacker's fastest win (preferring centre)
  let m = mv + (ans + 1), left = n - 1, duals = 0, quietMid = 0, defCh = [], att = 1;
  while (left > 0) {
    const g = U.grid(m), d = U.toMove(m);
    if (U.immWins(g, 3 - d).length && U.isWinAfter(g, U.immWins(g, 3 - d)[0], 3 - d)) { /* attacker wins next */ }
    const dl = E.defendList(m, left);
    defCh.push(U.legal(g).filter(c => !U.obviousLoss(g, c, d)).length);
    let best = null; for (const c of E.ORDER) { const e = dl.find(x => x.c === c); if (!e) continue; const v = e.need || 99; if (!best || v > best.v) best = { c, v }; }
    m += best.c + 1;
    const g2 = U.grid(m), a = U.toMove(m);
    if (U.immWins(g2, a).length) break;                      // final four: the choice of cell does not matter
    const al = E.mateList(m, left).filter(e => e.need && e.need <= left);
    if (al.length > 1) duals++;
    al.sort((x, y) => x.need - y.need || E.ORDER.indexOf(x.c) - E.ORDER.indexOf(y.c));
    const c = al[0].c;
    if (!U.newThreats(g2, c, a).some(t => t.playable)) quietMid = 1;
    m += c + 1; left--; att++;
  }
  return { duals, quietMid, defCh };
}
function funMate(E, P) {
  const mv = P.moves, g = U.grid(mv), p = U.toMove(mv), q = 3 - p, ans = P.answer, n = P.n;
  const parts = {};
  const oppW = U.immWins(g, q);
  const plaus = plausibleOf(g, p, ans);
  const rank = heurRank(E, mv, ans);
  if (n === 1) {
    const decoy = oppW.some(c => c !== ans);                     // an enemy four elsewhere tempts you to block
    const r = g[ans].length, dirs = U.fourDirs(g, ans, r, p);
    const dirV = dirs.some(d => d === 'd' || d === 'u') ? 1 : dirs.includes('h') ? 0.8 : 0.25;
    parts.K1 = 30 * (0.6 * dirV + 0.25 * clamp(rank / 2) + 0.15 * (decoy ? 1 : 0));
    // decoys: the enemy four to block, and own threat cells that are not playable yet
    const own = U.threats(g, p).filter(t => !t.playable).length;
    parts.K2 = 20 * (0.5 * (decoy ? 1 : 0) + 0.5 * clamp(own / 2));
    // gap four (the winning cell is inside the line) is the satisfying kind
    let gap = 0;
    for (const [dc, dr] of [[1, 0], [1, 1], [1, -1]]) {
      const a = U.grid(mv); const at = (c, rr) => (c < 0 || c > 6 || rr < 0 || rr > 5 ? -1 : (a[c][rr] || 0));
      if (at(ans + dc, r + dr) === p && at(ans - dc, r - dr) === p) gap = 1;
    }
    parts.K3 = 20 * (0.5 + 0.5 * gap) * (dirV < 0.5 ? 0.6 : 1);
    parts.K4 = 15;
  } else {
    const ex = U.exMate(mv, ans, n)[0];
    // a quiet preparation is the most surprising key; in a win-in-2 a double threat is the norm, so it costs less there
    const typ = n === 2 ? { set: 1, stk: 0.8, frc: 0.7, dbl: 0.7 }[ex] : { set: 1, stk: 0.6, frc: 0.55, dbl: 0.45 }[ex];
    const forcedBlock = oppW.length > 0;
    parts.K1 = 15 * typ + 10 * clamp(rank / 2) + (forcedBlock ? 0 : 5);
    const ml = E.mateList(mv, n);
    const decoy = plaus.some(c => { const e = ml.find(x => x.c === c); return U.newThreats(g, c, p).some(t => t.playable) && !(e && e.need && e.need <= n); });
    parts.K2 = 14 * tCurve(plaus.length) + (decoy ? 6 : 0);
    const L = mateLine(E, mv, ans, n);
    const avgDef = L.defCh.length ? L.defCh.reduce((a, b) => a + b, 0) / L.defCh.length : 1;
    const defScore = clamp((avgDef - 1) / 2);
    parts.K3 = 20 * (n >= 3 ? 0.5 * L.quietMid + 0.2 + 0.3 * defScore : 0.55 + 0.45 * defScore);
    if (n >= 7 && !L.quietMid) parts.K3 *= 0.6;                  // a long string of checks is tedious
    parts.K4 = 15 * clamp(1 - 0.4 * L.duals);
  }
  parts.K5 = 15 * cleanScore(mv);
  return parts;
}
// ---- one-move puzzles: { sc, a } on position mv (goal: keep the solver value; sc = exact values, null = full column)
function stepParts(E, mv, st, theme, goal) {
  const g = U.grid(mv), p = U.toMove(mv), q = 3 - p, ans = st.a;
  const oppW = U.immWins(g, q);
  const forcedBlock = oppW.includes(ans);
  const plaus = plausibleOf(g, p, ans);
  const rank = heurRank(E, mv, ans);
  const quiet = !U.newThreats(g, ans, p).some(t => t.playable);
  const parts = {};
  parts.K1 = (forcedBlock || plaus.length === 0 ? 0 : 15) + 10 * [0.2, 0.7, 1][Math.min(2, rank)] + (quiet ? 5 : 0);
  // deep refutations: alternatives that do not lose quickly (or only draw in a win puzzle)
  const stones = mv.length + 1;
  const deep = plaus.filter(c => { const v = st.sc[c]; if (v === null || v === undefined) return false; if (v >= 0) return true; const k = 22 + v - (stones >> 1); return k >= 4; }).length;
  parts.K2 = 15 * tCurve(plaus.length) + 10 * clamp(deep / 2);
  const ex = U.exBest(mv, ans)[0];
  let th = { blk: 0, ctr: 0.4, qt: 0.7, und: 0.85, thr: 0.8, even: 1, odd: 1, kill: 0.8 }[ex] ?? 0.6;
  if (theme === 'par' && ex !== 'even' && ex !== 'odd') th *= 0.4;
  if (theme === 'silent' && !quiet) th *= 0.3;
  if (theme === 'edge' && ans !== 0 && ans !== 6) th = 0;
  if (theme === 'endg' && mv.length < 26) th *= 0.5;
  parts.K3 = 15 * th;
  // a short combination in disguise (answer wins within 2 own moves) is not the theme of a one-move puzzle
  let k4 = 1;
  if (goal === 'win') { const ml = E.mateList(mv, 2).find(e => e.c === ans); if (ml && ml.need && ml.need <= 2) k4 = 0.4; }
  parts.K4 = 15 * k4;
  parts.K5 = 15 * cleanScore(mv);
  return parts;
}
function funBest(E, P, theme) { return stepParts(E, P.moves, { sc: P.sc, a: P.answer }, theme, P.goal); }
function funSteps(E, P, theme) {
  let m = P.moves; const all = [];
  for (const st of P.steps) { all.push(stepParts(E, m, st, theme, 'def')); m += (st.a + 1) + (st.r !== undefined ? String(st.r + 1) : ''); }
  // average over the steps, but the first decision counts double (it is what the player meets first)
  const out = {};
  for (const k of ['K1', 'K2', 'K3', 'K4', 'K5']) out[k] = (2 * all[0][k] + all.slice(1).reduce((a, x) => a + x[k], 0)) / (all.length + 1);
  // every step a forced block → a defensive drill, not a puzzle
  out.K3 = 15 * clamp(all.filter(x => x.K1 >= 15).length / all.length);
  out.K5 = 15 * cleanScore(P.moves);
  return out;
}
function funScore(E, P, theme) {
  const parts = !P.k ? funMate(E, P) : P.k === 'b' ? funBest(E, P, theme) : funSteps(E, P, theme);
  const fun = Math.round(Object.values(parts).reduce((a, b) => a + b, 0));
  return { fun, parts: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, Math.round(v * 10) / 10])) };
}
// whole collection: duplicates (same or mirrored position, same puzzle type) get K4 = 0
function scoreAll(E, PZ) {
  const seen = new Map(), out = [];
  PZ.levels.forEach((lv, li) => lv.puzzles.forEach((P, j) => {
    const f = funScore(E, P, lv.id);
    const key = [P.k || 'm', P.n || '', P.moves].join('|'), mk = [P.k || 'm', P.n || '', U.mirror(P.moves)].join('|');
    const pos = U.grid(P.moves).map(c => c.join('')).join('/'), mpos = U.grid(P.moves).reverse().map(c => c.join('')).join('/');
    const k1 = (P.k || 'm') + (P.n || '') + pos, k2 = (P.k || 'm') + (P.n || '') + mpos;
    if (seen.has(k1) || seen.has(k2)) { f.fun -= Math.round(f.parts.K4); f.parts.K4 = 0; f.dup = seen.get(k1) || seen.get(k2); }
    else seen.set(k1, lv.id + ':' + j);
    void key; void mk;
    out.push({ li, j, id: lv.id, ...f });
  }));
  return out;
}
module.exports = { funScore, scoreAll, cleanScore, historyBlunders };

if (require.main === module) {
  const E = require('../engine.js');
  const PZ = require(path.join(__dirname, '..', 'puzzles.json'));
  const all = scoreAll(E, PZ);
  if (process.argv.includes('--list')) for (const r of all) console.log(r.id + ':' + r.j, r.fun, JSON.stringify(r.parts), r.dup ? 'dup of ' + r.dup : '');
  const by = {};
  for (const r of all) (by[r.id] = by[r.id] || []).push(r.fun);
  let low = 0;
  for (const id in by) { const a = by[id].slice().sort((x, y) => x - y), lo = a.filter(x => x < 70).length; low += lo; console.log(id.padEnd(7), 'n', a.length, 'min', a[0], 'med', a[a.length >> 1], 'max', a[a.length - 1], '<70:', lo); }
  console.log('total <70:', low, '/', all.length);
}
