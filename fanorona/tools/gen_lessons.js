// Builds lessons.json: basics (accepted-move lists) from random positions, tactics / endgame (engine-scored) from
// positions of engine games. node tools/gen_lessons.js [seed]
'use strict';
const fs = require('fs'), path = require('path');
const { init, rng, capN, selfPlay } = require('./lib.js');
const W = 30000, WT = 29000;
(async () => {
  const E = await init();
  const rand = rng(+(process.argv[2] || 20261101));
  const P1 = 1, P2 = 2;
  function randomPos(nw, nb, side) {
    const pts = [...Array(45).keys()];
    for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
    const a = Array(45).fill('.');
    pts.slice(0, nw).forEach(i => (a[i] = 'w')); pts.slice(nw, nw + nb).forEach(i => (a[i] = 'b'));
    return { b: a.join(''), side };
  }
  const steps = m => m.split('-').length - 1;
  const kinds = m => m.split('-').slice(1).map(x => x.slice(-1));
  const uniq = new Set();
  function basics(id, test, want = 5, tries = 400000) {
    const out = [];
    for (let k = 0; k < tries && out.length < want; k++) {
      const side = out.length === 3 ? P2 : P1;
      const spec = randomPos(4 + Math.floor(rand() * 6), 3 + Math.floor(rand() * 6), side);
      const pos = E.Pos.from(spec); if (pos.status() !== 0) continue;
      const r = test(pos); if (!r) continue;
      if (uniq.has(spec.b)) continue; uniq.add(spec.b);
      out.push({ s: spec, ok: r.ok, best: r.ok[0] });
    }
    console.error(id, out.length);
    return { id, course: 'basics', problems: out };
  }
  const maxCap = (pos, L) => Math.max(...L.map(m => capN(pos, m)));
  const steps0 = [];
  // approach only
  steps0.push(basics('b_approach', pos => {
    if (!pos.hasCaps()) return null; const L = pos.moves(true);
    if (L.length < 2 || L.length > 6 || L.some(m => steps(m) > 1 || kinds(m)[0] !== 'A')) return null;
    const mx = maxCap(pos, L); if (mx < 2) return null;
    const ok = L.filter(m => capN(pos, m) === mx); if (ok.length * 2 > L.length) return null;
    return { ok };
  }));
  steps0.push(basics('b_withdraw', pos => {
    if (!pos.hasCaps()) return null; const L = pos.moves(true);
    if (L.length < 2 || L.length > 6 || L.some(m => steps(m) > 1 || kinds(m)[0] !== 'W')) return null;
    const mx = maxCap(pos, L); if (mx < 2) return null;
    const ok = L.filter(m => capN(pos, m) === mx); if (ok.length * 2 > L.length) return null;
    return { ok };
  }));
  steps0.push(basics('b_choose', pos => {
    if (!pos.hasCaps()) return null; const L = pos.moves(true);
    if (L.length < 2 || L.length > 6 || L.some(m => steps(m) > 1)) return null;
    const first = pos.capSteps(null), dual = first.filter(x => first.some(y => y !== x && y.from === x.from && y.to === x.to));
    if (!dual.length) return null;
    const mx = maxCap(pos, L); const ok = L.filter(m => capN(pos, m) === mx);
    if (ok.length !== 1 || mx < 2) return null;
    const s = pos.steps(ok[0])[0]; if (!dual.some(x => x.from === s.from && x.to === s.to)) return null;
    // the other line of the same step must be smaller
    return { ok };
  }));
  steps0.push(basics('b_chain', pos => {
    if (!pos.hasCaps()) return null; const L = pos.moves();
    if (L.length < 3 || L.length > 14) return null;
    const mx = maxCap(pos, L), ok = L.filter(m => capN(pos, m) === mx);
    if (mx < 3 || ok.some(m => steps(m) < 2)) return null;
    const single = Math.max(...L.filter(m => steps(m) === 1).map(m => capN(pos, m)));
    if (single >= mx - 1) return null;
    return { ok: pos.moves(true).filter(m => capN(pos, m) === mx) };
  }));
  steps0.push(basics('b_safe', pos => {
    if (pos.hasCaps()) return null; const L = pos.moves();
    if (L.length < 5) return null;
    const opp = q => { const c = q.clone(); return c.hasCaps(); };
    const ok = L.filter(m => !opp(pos.clone().play(m)));
    if (!ok.length || ok.length * 3 > L.length) return null;
    // the opponent must not already have a capture threat we cannot answer: fine either way
    return { ok };
  }));
  steps0.push(basics('b_win', pos => {
    if (!pos.hasCaps() || pos.count(pos.turn === P1 ? P2 : P1) < 2 || pos.count(pos.turn === P1 ? P2 : P1) > 5) return null;
    const L = pos.moves(true); if (L.length < 2) return null;
    const ok = L.filter(m => pos.clone().play(m).status() === -1);
    if (!ok.length || ok.length * 2 > L.length) return null;
    return { ok };
  }));

  // ---- engine-scored steps from engine games
  const pool = [];
  for (let g = 0; g < 40; g++) {
    const a = 8 + Math.floor(rand() * 9), b = 8 + Math.floor(rand() * 9);
    const { out } = selfPlay(rand, a, b, 140);
    for (const x of out) if (x.n >= 4) pool.push(x.spec);
    if (g % 10 === 9) console.error('games', g + 1, pool.length);
  }
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const anaCache = new Map();
  const ana = spec => { const k = spec.b + spec.side; if (!anaCache.has(k)) { E.attachWasm(require('./lib.js').X); const r = E.analyze(spec, [], 1500); anaCache.set(k, r.list.slice().sort((x, y) => y.v - x.v)); } return anaCache.get(k); };
  const scOf = L => L.slice(0, 20).map(e => [e.m, e.v]);
  function scored(id, course, pre, test, want = 5) {
    const out = [];
    for (const spec of pool) {
      if (out.length >= want) break;
      if (uniq.has(spec.b)) continue;
      const pos = E.Pos.from(spec); if (!pre(pos)) continue;
      const L = ana(spec); if (L.length < 2) continue;
      if (!test(pos, L)) continue;
      uniq.add(spec.b);
      out.push({ s: spec, best: L[0].m, sc: scOf(L) });
    }
    console.error(id, out.length);
    return { id, course, problems: out };
  }
  const tot = pos => pos.count(P1) + pos.count(P2);
  const pc = v => Math.abs(v) > WT ? (v > 0 ? 9 : -9) : v / 100;
  steps0.push(scored('t_big', 'tactics', pos => pos.hasCaps() && pos.moves().length >= 3 && tot(pos) >= 12, (pos, L) => {
    const mx = Math.max(...L.map(e => capN(pos, e.m)));
    return capN(pos, L[0].m) === mx && mx >= 3 && pc(L[0].v) - pc(L[1].v) >= 0.8;
  }));
  steps0.push(scored('t_count', 'tactics', pos => pos.hasCaps() && pos.moves().length >= 3 && tot(pos) >= 10, (pos, L) => {
    const mx = Math.max(...L.map(e => capN(pos, e.m))), greedy = L.filter(e => capN(pos, e.m) === mx);
    return capN(pos, L[0].m) < mx && greedy.every(e => pc(L[0].v) - pc(e.v) >= 0.8);
  }));
  steps0.push(scored('t_stop', 'tactics', pos => pos.hasCaps() && pos.moves().some(m => steps(m) >= 2), (pos, L) => {
    const b = L[0].m; return pos.moves().some(m => m.startsWith(b + '-')) && L.filter(e => e.m.startsWith(b + '-')).every(e => pc(L[0].v) - pc(e.v) >= 0.6);
  }));
  steps0.push(scored('t_paika', 'tactics', pos => !pos.hasCaps() && pos.moves().length >= 6, (pos, L) => {
    const bad = L.filter(e => pc(L[0].v) - pc(e.v) >= 0.9).length;
    return bad * 2 >= L.length && pc(L[0].v) - pc(L[1].v) < 0.5 && Math.abs(pc(L[0].v)) < 4;
  }));
  // endgame: few pieces, a forced win for the side to move
  const endPool = [];
  for (let k = 0; k < 3000 && endPool.length < 400; k++) {
    const nw = 2 + Math.floor(rand() * 3), nb = 1 + Math.floor(rand() * 2);
    const spec = randomPos(nw, nb, P1); const pos = E.Pos.from(spec);
    if (pos.status() !== 0 || pos.hasCaps()) continue;
    endPool.push(spec);
  }
  function endStep(id, test) {
    const out = [];
    for (const spec of endPool) {
      if (out.length >= 5) break;
      if (uniq.has(spec.b)) continue;
      const pos = E.Pos.from(spec), L = ana(spec);
      if (!test(pos, L)) continue;
      uniq.add(spec.b); out.push({ s: spec, best: L[0].m, sc: scOf(L) });
    }
    console.error(id, out.length);
    return { id, course: 'endgame', problems: out };
  }
  steps0.push(endStep('e_hunt', (pos, L) => L[0].v > WT && W - L[0].v >= 5 && W - L[0].v <= 11 && L.filter(e => e.v > WT).length <= Math.max(1, L.length / 3)));
  steps0.push(endStep('e_trap', (pos, L) => L[0].v > WT && W - L[0].v >= 3 && W - L[0].v <= 5 && L.filter(e => e.v > WT).length === 1 && L.length >= 5));
  const outL = { version: 1, steps: steps0.filter(s => s.problems.length >= 3) };
  fs.writeFileSync(path.join(__dirname, '..', 'lessons.json'), JSON.stringify(outL));
  console.error('written', outL.steps.map(s => s.id + ':' + s.problems.length).join(' '));
})();
