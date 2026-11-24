// (2026-11-25 担当D) Rebuilds fanorona/puzzles.json for the 3D table and the 2D: keeps the puzzles that pass
// tools/lesson-verify-fanorona.js (①〜⑨, 追19・追20・追72) and fills each theme back to its size with new positions made the way
// tools/gen_puzzles.js makes them (sparse random positions for "win in N", engine games for "gain g in N"), with the stricter
// filters (4 legal moves or more, 3 wrong or more, a "win in 1" with 4 captures or more). Each theme is then ordered by d (wrong
// first moves + 2 × near misses), easy → hard. node fanorona/tools/fix_puzzles3d.js
'use strict';
const fs = require('fs'), path = require('path');
const { init, rng, capN, selfPlay } = require('./lib.js');
const V = require('../../tools/lesson-verify-fanorona.js');
const FILE = path.join(__dirname, '..', 'puzzles.json');
(async () => {
  const E = await init(); V.init();
  const D = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const rand = rng(250411);
  const lead = (p, me) => p.count(me) - p.count(3 - me);
  const badOf = d => { const r = V.verify({ data: d, no2d: true }); const s = new Set(); for (const o of r.out) if (o.q > 0) s.add(o.theme + '#' + o.q); return { s, r }; };
  let { s: bad } = badOf(D);
  console.error('failing now', bad.size);
  const keep = {}; D.themes.forEach(T => { keep[T.id] = T.puzzles.filter((_, j) => !bad.has(T.id + '#' + (j + 1))); });
  const seen = new Set(); D.themes.forEach(T => T.puzzles.forEach(P => seen.add(P.s.b)));
  function randomPos(nw, nb, side) {
    const pts = [...Array(45).keys()];
    for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
    const a = Array(45).fill('.'); const [na, nd] = side === 1 ? [nw, nb] : [nb, nw];
    pts.slice(0, na).forEach(i => (a[i] = 'w')); pts.slice(na, na + nd).forEach(i => (a[i] = 'b'));
    return { b: a.join(''), side };
  }
  function unique(spec, N, goal) {
    const p = E.Pos.from(spec), base = lead(p, spec.side);
    const L = E.puzzle(spec, [], N, false, goal, base) || [];
    if (L.length < 4 || L.some(e => e.need < 0)) return null;
    const ok = L.filter(e => e.need > 0); if (ok.length !== 1 || ok[0].need !== N) return null;
    return { answer: ok[0].m, L };
  }
  const want = {}; D.themes.forEach(T => { want[T.id] = T.puzzles.length; });
  const cand = {}; for (const k in want) cand[k] = [];
  const t0 = Date.now();
  function winCands(id, N, att, def, extra, need) {
    for (let k = 0; k < 600000 && cand[id].length < need; k++) {
      const side = rand() < 0.7 ? 1 : 2;
      const spec = randomPos(att[0] + Math.floor(rand() * (att[1] - att[0] + 1)), def[0] + Math.floor(rand() * (def[1] - def[0] + 1)), side);
      if (seen.has(spec.b)) continue;
      const pos = E.Pos.from(spec); if (pos.status() !== 0) continue;
      const Lm = pos.moves(); if (Lm.length < 4) continue;
      if (N === 1 && Lm.filter(m => E.isCap(m)).length < 4) continue;
      const r = unique(spec, N, 0); if (!r) continue;
      if (extra && !extra(pos, r)) continue;
      seen.add(spec.b); cand[id].push({ s: spec, n: N, answer: r.answer });
    }
    console.error(id, cand[id].length, ((Date.now() - t0) / 1000 | 0) + 's');
  }
  const short = id => Math.max(0, want[id] - keep[id].length);
  const M = 3;   // candidates per missing slot
  if (short('step1')) winCands('step1', 1, [2, 5], [2, 5], (pos, r) => capN(pos, r.answer) >= 2, short('step1') * M);
  if (short('step2')) winCands('step2', 2, [2, 4], [1, 3], null, short('step2') * M);
  if (short('step3')) winCands('step3', 3, [2, 4], [1, 2], null, short('step3') * M);
  if (short('end4')) winCands('end4', 4, [2, 3], [1, 2], null, short('end4') * M);
  if (short('end5')) winCands('end5', 5, [2, 3], [1, 1], null, short('end5') * M);
  const gainNeed = ['count', 'chain', 'gain2'].some(k => short(k));
  if (gainNeed) {
    const pool = [];
    for (let g = 0; g < 80; g++) { const a = 7 + Math.floor(rand() * 6), b = 7 + Math.floor(rand() * 6); const { out } = selfPlay(rand, a, b, 120); for (const x of out) if (x.n >= 2) pool.push(x.spec); }
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    console.error('pool', pool.length, ((Date.now() - t0) / 1000 | 0) + 's');
    const gainCands = (id, N, G, test, need) => {
      for (const spec of pool) {
        if (cand[id].length >= need) break;
        if (seen.has(spec.b)) continue;
        const pos = E.Pos.from(spec); if (pos.moves().length < 4) continue;
        if (test && !test(pos, null)) continue;
        const r = unique(spec, N, G); if (!r) continue;
        if (test && !test(pos, r)) continue;
        seen.add(spec.b); cand[id].push({ s: spec, n: N, g: G, answer: r.answer });
      }
      console.error(id, cand[id].length, ((Date.now() - t0) / 1000 | 0) + 's');
    };
    if (short('count')) gainCands('count', 1, 2, (pos, r) => pos.hasCaps() && (!r || pos.moves().some(m => !E.same(pos, m, r.answer) && capN(pos, m) >= capN(pos, r.answer))), short('count') * M);
    if (short('chain')) gainCands('chain', 1, 3, (pos, r) => pos.hasCaps() && pos.moves().some(m => m.split('-').length >= 4) && (!r || r.answer.split('-').length >= 4), short('chain') * M);
    if (short('gain2')) gainCands('gain2', 2, 3, null, short('gain2') * M);
  }
  // add the candidates one at a time and keep those that pass with everything else
  for (const T of D.themes) {
    T.puzzles = keep[T.id].slice();
    for (const P of cand[T.id]) {
      if (T.puzzles.length >= want[T.id]) break;
      T.puzzles.push(P);
      const one = { themes: [Object.assign({}, T, { puzzles: [P] })] };
      const r = V.verify({ data: one, no2d: true });
      if (r.out.some(o => o.q > 0)) { T.puzzles.pop(); continue; }
    }
  }
  // ⑤ across the whole set, then order by d
  for (let round = 0; round < 6; round++) {
    const { s, r } = badOf(D); const drop = [...s].filter(k => !/⑥/.test(r.out.find(o => o.theme + '#' + o.q === k).msg));
    if (!drop.length) break;
    console.error('drop', drop.join(' '));
    D.themes.forEach(T => { T.puzzles = T.puzzles.filter((_, j) => !drop.includes(T.id + '#' + (j + 1))); });
  }
  const rows = V.verify({ data: D, no2d: true }).rows, dOf = new Map(rows.map(x => [x.theme + ':' + JSON.stringify(D.themes.find(T => T.id === x.theme).puzzles[x.j].s), x.d]));
  for (const T of D.themes) T.puzzles.sort((a, b) => (dOf.get(T.id + ':' + JSON.stringify(a.s)) - dOf.get(T.id + ':' + JSON.stringify(b.s))));
  fs.writeFileSync(FILE, JSON.stringify(D));
  console.error('written', D.themes.map(T => T.id + ':' + T.puzzles.length + '/' + want[T.id]).join(' '));
})();
