// Fun score (0-100) for Morris puzzles (nine / twelve / six men's morris; goal "win in N" or "make a mill in N").
// A puzzle is first checked for soundness with the game's own solver (engine.js mate() / mill(), the same calls the
// app makes, default node budget), then scored on what makes a morris puzzle enjoyable for a human:
//
//   A. Unique key            30  exactly one winning first move (from-to, removal ignored) within N, no shorter win;
//                                 a second winning key = "cook" (10), more = 0. Later duals on the main line cost a little.
//   B. Non-obvious key       25  a quiet key (no mill closed) beats the obvious capture; a key that lets the opponent close
//                                 a mill (sacrifice) or ignores tempting mill closures that fail (decoys) scores more.
//                                 Few legal moves (≤ 2 tries) caps it: nothing to find.
//   C. Play / aha            15  the defender has real choices (replies that must each be refuted) and the attacker's
//                                 line contains a quiet move after the first one (the middle "aha"). For N = 1 a fixed base.
//   D. Theme fit             15  the theme is really needed: fork = double mill threat, zwick = a piece swinging from one
//                                 mill into another, block = win by blockade, remove = only the right removal wins,
//                                 quiet = quiet key, fly = a side is flying, diag = a diagonal mill is used,
//                                 winN / millN = exactly N moves; a wrong removal choice that still wins costs a little.
//   E. Clean & natural       15  material not absurdly lopsided, not an overfull / near-empty board, and a satisfying
//                                 finish (blockade or the decisive mill rather than a long shuffle).
//
// usage: node fun.js [puzzles.json|puzzles-twelve.json|puzzles-six.json]   → distribution, worst / best samples
'use strict';

const vOf = D => (D && D.variant) || 'nine';
const ft = m => m & 1023;                         // from + to (removal ignored)

function solve(E, v, spec, moves, n, goal, defend) {
  return goal === 'mill' ? E.mill(v, spec, moves, n, defend) : E.mate(v, spec, moves, n, defend);
}
function threats(pos) {   // distinct target points where the side to move could close a mill now
  const s = new Set(); for (const m of pos.moves()) if (((m >> 10) & 31) !== 31) s.add((m >> 5) & 31); return s;
}

// Analyse a puzzle: soundness, main line and motifs. Returns null when the solver fails (node budget).
function analyse(E, v, P, goal) {
  const G = E.geom(v), n = P.n, start = E.Pos.from(G, P.s), me = P.s.side;
  const root = solve(E, v, P.s, [], n, goal, false); if (!root) return null;
  const good = root.filter(e => e.need && e.need <= n);
  const minNeed = good.length ? Math.min(...good.map(e => e.need)) : 0;
  const keys = new Set(good.map(e => ft(e.m)));
  const legal = new Set(root.map(e => ft(e.m)));
  const ansOk = good.some(e => e.m === P.answer);
  const info = { n, sound: ansOk && minNeed === n, keys: keys.size, legal: legal.size, goodN: good.length,
    keyCap: ((P.answer >> 10) & 31) !== 31, line: [], defChoices: [], duals: 0, quietLater: false,
    fork: false, zwick: false, diagMill: false, removeChoice: false, removeAlt: 0, end: '', sacrifice: false, decoys: 0 };
  if (!ansOk) return info;
  // removal choice for the key: other removals with the same from-to
  const sameFT = root.filter(e => ft(e.m) === ft(P.answer));
  if (info.keyCap && sameFT.length > 1) {
    const ok = sameFT.filter(e => e.need && e.need <= n).length;
    info.removeChoice = ok < sameFT.length; info.removeAlt = ok - 1;
  }
  // decoys: tempting captures that do not win in N
  info.decoys = root.filter(e => ((e.m >> 10) & 31) !== 31 && !(e.need && e.need <= n) && !keys.has(ft(e.m))).length;
  // sacrifice: after the key the defender may close a mill
  { const q = start.clone(); q.play(P.answer); if (q.status() === 0 && threats(q).size) info.sacrifice = true; }

  const moves = []; const pos = start.clone(); let left = n, first = true;
  const diagStart = G.mills.length > 16 ? 16 : 99;
  for (let guard = 0; guard < 2 * n + 2; guard++) {
    // attacker move
    let m;
    if (first) m = P.answer;
    else {
      const L = solve(E, v, P.s, moves, left, goal, false); if (!L) return null;
      const g = L.filter(e => e.need && e.need <= left); if (!g.length) { info.sound = false; break; }
      const best = Math.min(...g.map(e => e.need)); m = g.find(e => e.need === best).m;
      const alt = new Set(g.map(e => ft(e.m))); if (alt.size > 1) info.duals += alt.size - 1;
      if (((m >> 10) & 31) === 31) info.quietLater = true;
    }
    const f = m & 31, t = (m >> 5) & 31, cap = ((m >> 10) & 31) !== 31;
    if (cap) {
      if (f !== 31 && pos.inMill(f)) info.zwick = true;
      for (let k = diagStart; k < G.mills.length; k++) { const M = G.mills[k]; if (M.includes(t) && M.every(x => x === t || pos.b[x] === me)) info.diagMill = true; }
    }
    pos.play(m); moves.push(m); info.line.push(m); left--; first = false;
    if (goal === 'mill' && cap) { info.end = 'mill'; break; }
    const st = pos.status();
    if (st === -1) { info.end = pos.cnt[pos.side] + pos.hand[pos.side] < 3 ? 'reduce' : 'block'; break; }
    if (st !== 0 || left <= 0) { info.sound = false; break; }
    if (!cap) { const q = pos.clone(); q.side = me; if (threats(q).size >= 2) info.fork = true; }   // double mill threat
    // defender reply: the most stubborn one
    const D = solve(E, v, P.s, moves, left, goal, true); if (!D) return null;
    if (D.some(e => !e.need)) { info.sound = false; break; }
    info.defChoices.push(D.length);
    let bm = D[0].m, bv = -1; for (const e of D) if (e.need > bv) { bv = e.need; bm = e.m; }
    pos.play(bm); moves.push(bm); info.line.push(bm);
  }
  if (!info.end) info.sound = false;
  return info;
}

function themeFit(id, info, P, G) {
  const start = P.s, b = start.b;
  const cnt = p => [...b].filter(x => +x === p).length;
  switch (id) {
    case 'fork': return info.fork ? 15 : 3;
    case 'zwick': return info.zwick ? 15 : 3;
    case 'block': return info.end === 'block' ? 15 : 3;
    case 'remove': return info.removeChoice ? (info.removeAlt ? 10 : 15) : 3;
    case 'quiet': return !info.keyCap ? 15 : 0;
    case 'fly': { const fl = p => G.fly && start.h[p - 1] === 0 && cnt(p) === 3; return fl(1) || fl(2) ? 15 : 0; }
    case 'diag': return info.diagMill ? 15 : 3;
    default: return info.removeAlt > 0 ? 11 : 15;   // winN / millN: exact length is checked by soundness
  }
}

function funScore(E, v, T, P, pre) {
  const goal = T.goal || 'win', G = E.geom(v);
  const info = pre || analyse(E, v, P, goal);
  if (!info) return { fun: 0, parts: null, info: { err: 'budget' } };
  if (!info.sound) return { fun: 0, parts: { unsound: 1 }, info };
  const n = P.n;
  // A. uniqueness
  let A = info.keys === 1 ? 30 : info.keys === 2 ? 10 : 0;
  A -= Math.min(8, info.duals * 3);
  // B. key move
  let B;
  if (info.keyCap) B = n === 1 ? 6 : 4;
  else B = 17;
  if (info.sacrifice) B += 5;
  B += Math.min(5, info.decoys * (info.keyCap ? 1 : 2));
  if (info.legal <= 2) B = Math.min(B, 3); else if (info.legal <= 4) B -= 4;
  B = Math.max(0, Math.min(25, B));
  // C. play
  let C;
  if (n === 1) C = info.legal >= 8 ? 7 : 4;
  else {
    const d = info.defChoices.length ? info.defChoices.reduce((a, x) => a + x, 0) / info.defChoices.length : 0;
    C = d >= 4 ? 10 : d >= 2 ? 7 : 3;
    if (info.quietLater) C += 5;
  }
  C = Math.min(15, C);
  // D. theme
  const D = themeFit(T.id, info, P, G);
  // E. natural / clean finish
  const b = P.s.b, c1 = [...b].filter(x => x === '1').length + P.s.h[0], c2 = [...b].filter(x => x === '2').length + P.s.h[1];
  const occ = [...b].filter(x => x !== '0').length / G.n;
  let Ee = 15;
  const diff = Math.abs(c1 - c2);
  if (diff >= 6) Ee -= 6; else if (diff >= 4) Ee -= 3;
  if (occ > 0.85) Ee -= 4; else if (occ < 0.3) Ee -= 3;
  if (goal !== 'mill' && info.end === 'reduce' && n >= 2 && !info.fork && !info.zwick) Ee -= 2;
  Ee = Math.max(0, Ee);
  const fun = Math.max(0, Math.min(100, A + B + C + D + Ee));
  return { fun, parts: { A, B, C, D, E: Ee }, info };
}

module.exports = { funScore, analyse, vOf };

if (require.main === module) {
  const path = require('path'), E = require('../engine.js');
  const file = process.argv[2] || 'puzzles.json', D = require(path.join(__dirname, '..', file)), v = vOf(D);
  const all = [];
  D.themes.forEach((T, ti) => T.puzzles.forEach((P, j) => { const r = funScore(E, v, T, P); all.push({ id: T.id, j, n: P.n, ...r }); }));
  const hist = {}; for (const x of all) { const b = Math.floor(x.fun / 10) * 10; hist[b] = (hist[b] || 0) + 1; }
  console.log(file, v, 'n =', all.length, 'hist', JSON.stringify(hist));
  for (const T of D.themes) {
    const xs = all.filter(x => x.id === T.id), f = xs.map(x => x.fun);
    console.log(T.id.padEnd(6), 'avg', (f.reduce((a, b) => a + b, 0) / f.length).toFixed(1), 'min', Math.min(...f), '<70:', f.filter(x => x < 70).length + '/' + f.length);
  }
  const show = x => console.log(x.fun, x.id, x.j, 'n' + x.n, JSON.stringify(x.parts), JSON.stringify(Object.fromEntries(Object.entries(x.info).filter(([k]) => k !== 'line'))));
  all.sort((a, b) => a.fun - b.fun); console.log('-- worst'); all.slice(0, 8).forEach(show); console.log('-- best'); all.slice(-5).forEach(show);
}
