// Builds alquerque/lessons.json (read by fanorona/app.js on the Alquerque page; rule 'alq' = Bell's rules):
//   basics   — accepted-move lists (every right move counts) from random positions
//   tactics  — engine-scored (fanorona/engine.c analyze, 1.5 s a position) from positions of engine games
//   endgame  — engine-scored, few pieces: exact with the endgame tables (alqeg.bin.gz)
// node tools/gen_lessons.js [seed]   (~5 min)
'use strict';
const fs = require('fs'), path = require('path');
const A = require('./alqlib.js');
const W = 30000, WT = 29000;
(async () => {
  const E = await A.init();
  const rand = A.rng(+(process.argv[2] || 20261114));
  const P1 = 1, P2 = 2;
  const capN = (pos, m) => A.capN(E, pos, m);
  const jumps = m => m.split('-').length - 1;
  const opp = pos => 3 - pos.turn;
  const uniq = new Set();
  const safeAfter = (pos, m) => { const q = pos.clone().play(m); return q.status() !== 0 || !q.hasCaps(); };
  function basics(id, test, lo, hi, want = 5) {
    const out = [];
    for (let k = 0; k < 2000000 && out.length < want; k++) {
      const side = out.length === 3 ? P2 : P1;   // (one problem for the second player)
      const n1 = lo + Math.floor(rand() * (hi - lo + 1)), n2 = lo + Math.floor(rand() * (hi - lo + 1));
      const spec = A.randomPos(rand, n1, n2, side);
      const pos = E.Pos.from(spec); if (pos.status() !== 0) continue;
      const r = test(pos); if (!r) continue;
      if (uniq.has(spec.b)) continue; uniq.add(spec.b);
      out.push({ s: spec, ok: r.ok, best: r.ok[0] });
    }
    console.error(id, out.length);
    return { id, course: 'basics', problems: out };
  }
  const steps = [];
  // a single jump that is not jumped back
  steps.push(basics('b_jump', pos => {
    if (!pos.hasCaps()) return null; const L = pos.moves();
    if (L.length < 2 || L.length > 5 || L.some(m => jumps(m) > 1)) return null;
    const ok = L.filter(m => safeAfter(pos, m)); if (!ok.length || ok.length * 2 > L.length) return null;
    return { ok };
  }, 3, 6));
  // keep jumping: the capture that takes the most
  steps.push(basics('b_chain', pos => {
    if (!pos.hasCaps()) return null; const L = pos.moves();
    if (L.length < 2 || L.length > 8) return null;
    const mx = Math.max(...L.map(m => capN(pos, m))); if (mx < 3) return null;
    const ok = L.filter(m => capN(pos, m) === mx); if (ok.length * 2 > L.length) return null;
    return { ok };
  }, 3, 7));
  // the same piece, two routes: the longer one
  steps.push(basics('b_route', pos => {
    if (!pos.hasCaps()) return null; const L = pos.moves();
    if (L.length < 2 || L.length > 6) return null;
    const mx = Math.max(...L.map(m => capN(pos, m))), ok = L.filter(m => capN(pos, m) === mx);
    if (ok.length !== 1 || mx < 2) return null;
    const from = E.mFrom(ok[0]), rivals = L.filter(m => m !== ok[0] && E.mFrom(m) === from);
    if (!rivals.length || rivals.some(m => capN(pos, m) >= mx)) return null;
    return { ok };
  }, 3, 7));
  // no capture on the board: a move that gives none away
  steps.push(basics('b_safe', pos => {
    if (pos.hasCaps()) return null; const L = pos.moves(); if (L.length < 5) return null;
    const ok = L.filter(m => safeAfter(pos, m)); if (!ok.length || ok.length * 3 > L.length) return null;
    return { ok };
  }, 4, 8));
  // finish it: take the last pieces
  steps.push(basics('b_win', pos => {
    const n = pos.count(opp(pos)); if (!pos.hasCaps() || n < 2 || n > 5) return null;
    const L = pos.moves(); if (L.length < 2) return null;
    const ok = L.filter(m => { const q = pos.clone().play(m); return q.status() === -1 && q.count(opp(pos)) === 0; });
    if (!ok.length || ok.length * 2 > L.length) return null;
    return { ok };
  }, 2, 5));
  // or leave the opponent no move (pieces on the far row only go sideways)
  steps.push(basics('b_block', pos => {
    if (pos.hasCaps()) return null; const L = pos.moves(); if (L.length < 3) return null;
    const ok = L.filter(m => { const q = pos.clone().play(m); return q.status() === -1 && q.count(opp(pos)) > 0; });
    if (!ok.length || ok.length * 3 > L.length) return null;
    return { ok };
  }, 2, 6));

  // ---- engine-scored steps from engine games
  const pool = A.gamePool(E, rand, 300, 4, 16, 3);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  console.error('pool', pool.length);
  const anaCache = new Map();
  const ana = spec => { const k = spec.b + spec.side; if (!anaCache.has(k)) { const r = E.analyze(spec, [], 1500); anaCache.set(k, r.list.slice().sort((x, y) => y.v - x.v)); } return anaCache.get(k); };
  const scOf = L => L.slice(0, 20).map(e => [e.m, e.v]);
  const pc = v => Math.abs(v) > WT ? (v > 0 ? 9 : -9) : v / 100;
  const tot = pos => pos.count(P1) + pos.count(P2);
  function scored(id, course, src, pre, test, want = 5) {
    const out = [];
    for (const spec of src) {
      if (out.length >= want) break;
      if (uniq.has(spec.b)) continue;
      const pos = E.Pos.from(spec); if (pos.status() !== 0 || !pre(pos)) continue;
      const L = ana(spec); if (L.length < 3) continue;
      if (!test(pos, L)) continue;
      uniq.add(spec.b);
      out.push({ s: spec, best: L[0].m, sc: scOf(L) });
    }
    console.error(id, out.length);
    return { id, course, problems: out };
  }
  // the biggest capture is not the best: count what comes back
  // (a cheap pre-test first: captures of different sizes, and the biggest one can be answered; random middlegame-like
  //  positions as well, since engine games rarely have it)
  const midPool = []; for (let k = 0; k < 300000 && midPool.length < 4000; k++) { const sp = A.randomPos(rand, 5 + Math.floor(rand() * 4), 5 + Math.floor(rand() * 4), rand() < .7 ? P1 : P2); const q = E.Pos.from(sp); if (q.status() === 0 && q.hasCaps()) midPool.push(sp); }
  const countPre = pos => {
    if (!pos.hasCaps() || tot(pos) < 8) return false;
    const L = pos.moves(), c = L.map(m => capN(pos, m)), mx = Math.max(...c);
    return c.some(x => x < mx) && L.every((m, i) => c[i] < mx || !safeAfter(pos, m));
  };
  steps.push(scored('t_count', 'tactics', pool.concat(midPool), countPre, (pos, L) => {
    const mx = Math.max(...L.map(e => capN(pos, e.m))), greedy = L.filter(e => capN(pos, e.m) === mx);
    return capN(pos, L[0].m) < mx && greedy.every(e => pc(L[0].v) - pc(e.v) >= 0.8) && Math.abs(pc(L[0].v)) < 6;
  }));
  // a sacrifice: hand over a piece on purpose
  steps.push(scored('t_sac', 'tactics', pool, pos => !pos.hasCaps() && tot(pos) >= 8, (pos, L) => {
    if (safeAfter(pos, L[0].m)) return false;
    const safe = L.filter(e => safeAfter(pos, e.m)); if (!safe.length) return false;
    return safe.every(e => pc(L[0].v) - pc(e.v) >= 0.8) && Math.abs(pc(L[0].v)) < 6;
  }));
  // the quiet move: no capture on the board, most moves go wrong
  steps.push(scored('t_quiet', 'tactics', pool, pos => !pos.hasCaps() && pos.moves().length >= 5 && tot(pos) >= 8, (pos, L) => {
    const bad = L.filter(e => pc(L[0].v) - pc(e.v) >= 0.9).length;
    return bad * 2 >= L.length && pc(L[0].v) - pc(L[1].v) < 0.5 && safeAfter(pos, L[0].m) && Math.abs(pc(L[0].v)) < 4;
  }));
  // endgame: few pieces, a forced win for the side to move (exact: the endgame tables)
  const endPool = [];
  for (let k = 0; k < 200000 && endPool.length < 1500; k++) {
    const nw = 2 + Math.floor(rand() * 3), nb = 1 + Math.floor(rand() * 2);
    const spec = A.randomPos(rand, nw, nb, P1); const pos = E.Pos.from(spec);
    if (pos.status() !== 0 || pos.hasCaps() || pos.moves().length < 4) continue;
    endPool.push(spec);
  }
  steps.push(scored('e_hunt', 'endgame', endPool, () => true, (pos, L) => L[0].v > WT && W - L[0].v >= 5 && W - L[0].v <= 11 && L.filter(e => e.v > WT).length * 3 <= L.length));
  steps.push(scored('e_trap', 'endgame', endPool, () => true, (pos, L) => L[0].v > WT && W - L[0].v >= 3 && W - L[0].v <= 7 && L.filter(e => e.v > WT).length === 1 && L.length >= 4));
  const out = { version: 1, steps: steps.filter(s => s.problems.length >= 3) };
  fs.writeFileSync(path.join(__dirname, '..', 'lessons.json'), JSON.stringify(out));
  console.error('written', out.steps.map(s => s.id + ':' + s.problems.length).join(' '));
})();
