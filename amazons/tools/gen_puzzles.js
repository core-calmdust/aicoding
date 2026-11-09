// Amazons puzzles → puzzles.json (node tools/gen_puzzles.js [games])
// Themes (every answer is exact, from the rules — engine.js win1 / duelGood / trapGood / endGood):
//   w1 「1手で動けなくせ」 the side to move leaves the opponent without a move
//   w2 「2手で動けなくせ」 … within two of its moves, whatever the reply (no win in one)
//   t1 「閉じ込めろ」       box in the marked enemy amazon (no empty square left next to it; the game goes on)
//   e1 「数え合いの終盤」   the board is split, every amazon alone in its room: keep at least as many moves as the opponent
// w1 / w2 / t1 come from positions of AI games (Lv.4〜10 against each other, seeded); e1 positions are built (rooms carved at
// random, White to move with exactly one spare move: one wasted square loses). Within a theme, easier first (more answers).
'use strict';
const path = require('path'), fs = require('fs');
const E = require(path.join(__dirname, '..', 'engine.js'));
const { Pos, P1, P2, NB, mFrom, mTo, mArrow } = E;
const GAMES = +process.argv[2] || 700;
let seed = 20261111;
const rnd = () => { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; return seed / 0x7fffffff; };   // (Math.imul: a plain product loses its low bits and the sequence falls into a short cycle)
const ri = n => Math.floor(rnd() * n);
const free = (pos, i) => NB[i].filter(x => !pos.sq[x]).length;
const amz = (pos, p) => { const o = []; for (let k = 0; k < 8; k++) { const f = pos.q[k]; if (f >= 0 && pos.sq[f] === p) o.push(f); } return o; };
const want = { w1: 30, w2: 30, t1: 30, e1: 30 };
const got = { w1: [], w2: [], t1: [] }, seen = new Set();
const key = pos => pos.spec().b + pos.side;
const t0 = Date.now();
// ---------------------------------------------------------------- positions from games
for (let g = 0; g < GAMES; g++) {
  const la = 4 + ri(7), lb = 4 + ri(7), mv = [];
  const pos = new Pos();
  while (pos.canMove(pos.turn) && mv.length < 120) {
    const r = E.think(null, mv, pos.turn === P1 ? la : lb, rnd);
    if (r.move < 0) break;
    pos.play(r.move); mv.push(r.move);
    if (!pos.canMove(pos.turn) || mv.length < 12) continue;
    const k = key(pos); if (seen.has(k)) continue;
    const me = pos.turn, op = 3 - me, all = pos.moves();
    if (all.length < 6) continue;
    // t1: an enemy amazon with one way out, the board still open
    if (got.t1.length < want.t1 * 3 && !pos.terr().sep && !E.win1(pos).length) {
      for (const e of amz(pos, op)) {
        if (free(pos, e) !== 1) continue;
        if (amz(pos, op).every(o => o === e || free(pos, o) === 0)) continue;   // (that would be a win, not a trap)
        const tg = E.trapGood(pos.spec(), [], e);
        if (tg.length && tg.length <= all.length * 0.15) { got.t1.push({ s: pos.spec(), n: 1, e, a: tg.length / all.length }); seen.add(k); break; }
      }
    }
  }
  if (g % 50 === 49) console.log(`game ${g + 1}: t1 ${got.t1.length} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  if (got.t1.length >= want.t1 * 3) break;
}
// ---------------------------------------------------------------- w1 / w2: built positions (a crowded board, the defender nearly
// boxed in, the attacker's amazons close by). w1 prefers two exits to close at once (the amazon's new square and its arrow).
function spec(w, b, x, side) { const a = Array(100).fill('.'); for (const i of x) a[i] = 'x'; for (const i of w) a[i] = 'w'; for (const i of b) a[i] = 'b'; return { b: a.join(''), side }; }
function genDuel(n) {
  // the defender: one or two amazons in a small pocket (all other neighbours are arrows); the attacker: one or two amazons,
  // mostly within reach; a few more arrows anywhere
  const used = new Set(), x = new Set(), b = [], w = [];
  const nb = 1 + (rnd() < 0.35 ? 1 : 0);
  for (let k = 0; k < nb; k++) { let i; do i = ri(100); while (used.has(i)); used.add(i); b.push(i); }
  const pocket = new Set();
  const room = n === 1 ? 1 + ri(2) : 2 + ri(3);   // (empty squares left around the defender)
  const around = [...new Set(b.flatMap(i => [...NB[i]]))].filter(i => !used.has(i));
  for (let k = 0; k < room && around.length; k++) { const j = ri(around.length); pocket.add(around[j]); around.splice(j, 1); }
  if (n > 1) for (const p of [...pocket]) if (rnd() < 0.5) { const nx = [...NB[p]].filter(i => !used.has(i) && !pocket.has(i)); if (nx.length) pocket.add(nx[ri(nx.length)]); }
  for (const i of around) if (!pocket.has(i)) x.add(i);
  for (const p of pocket) used.add(p);
  for (const i of x) used.add(i);
  const nw = 1 + ri(2);
  for (let k = 0; k < nw; k++) { let i, tries = 0; do i = ri(100); while ((used.has(i) || (tries++ < 50 && !b.some(d => Math.max(Math.abs(E.RC[i][0] - E.RC[d][0]), Math.abs(E.RC[i][1] - E.RC[d][1])) <= 4))) ); used.add(i); w.push(i); }
  const na = 8 + ri(22);
  for (let k = 0; k < na; k++) { const i = ri(100); if (!used.has(i)) { used.add(i); x.add(i); } }
  const side = rnd() < 0.5 ? P1 : P2, pos = Pos.from(side === P1 ? spec(w, b, x, P1) : spec(b, w, x, P2));
  const me = pos.turn, op = 3 - me;
  if (!pos.canMove(me) || !pos.canMove(op)) return null;
  const all = pos.moves(); if (all.length < 8) return null;
  const s = pos.spec(), w1 = E.win1(pos);
  if (n === 1) {
    if (!w1.length || w1.length > all.length * 0.15) return null;
    return { s, n: 1, a: w1.length / all.length };
  }
  if (w1.length) return null;
  const g2 = E.duelGood(s, [], 2, 300000);
  if (!g2 || !g2.length || g2.length > all.length * 0.2) return null;
  return { s, n: 2, a: g2.length / all.length };
}
for (const n of [1, 2]) {
  const L = got['w' + n];
  for (let t = 0; t < 150000 && L.length < want['w' + n] * 3; t++) { const P = genDuel(n); if (!P) continue; const k = P.s.b + P.s.side; if (seen.has(k)) continue; seen.add(k); L.push(P); }
  console.log(`w${n} ${L.length} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
// ---------------------------------------------------------------- e1: built endgames
function carve(x, room, want, area) {
  for (let k = 0; k < 400 && room.length < want; k++) {
    const c = room[ri(room.length)], n = [...NB[c]].filter(i => area(i) && x.has(i));
    if (!n.length) continue;
    const t = n[ri(n.length)];
    room.push(t); x.delete(t);
  }
}
function genEnd() {
  // up to four areas separated by a cross of arrows: White has one amazon (its room has dead ends: a careless arrow cuts
  // squares off), Black one or two; every amazon alone in its room
  const x = new Set([...Array(100).keys()]);
  const cr = 4 + ri(2), cc = 4 + ri(2);
  const areas = [i => ((i / 10) | 0) < cr && i % 10 < cc, i => ((i / 10) | 0) < cr && i % 10 > cc, i => ((i / 10) | 0) > cr && i % 10 < cc, i => ((i / 10) | 0) > cr && i % 10 > cc].sort(() => rnd() - 0.5);
  const nb = 1 + ri(2), w = [], b = [];
  for (let q = 0; q < 1 + nb; q++) {
    const cells = [...x].filter(areas[q]); if (!cells.length) return null;
    const st = cells[ri(cells.length)], room = [st]; x.delete(st);
    carve(x, room, q === 0 ? 6 + ri(7) : 3 + ri(8), areas[q]);
    (q === 0 ? w : b).push(room[ri(room.length)]);
  }
  const a = Array(100).fill('.'); for (const i of x) a[i] = 'x'; for (const i of w) a[i] = 'w'; for (const i of b) a[i] = 'b';
  const pos = Pos.from({ b: a.join(''), side: P1 });
  if (!pos.terr().sep || !pos.canMove(P1) || !pos.canMove(P2)) return null;
  const W = E.sideMoves(pos, P1), B = E.sideMoves(pos, P2);
  if (W < 0 || B < 0 || W !== B + 1) return null;   // (exactly one spare move: one wasted square loses)
  const s = pos.spec(), good = E.endGood(s, []), all = pos.moves();
  if (!good || !good.length || good.length > all.length * 0.5) return null;
  return { s, n: 1, a: good.length / all.length };
}
const e1 = [];
for (let t = 0; t < 150000 && e1.length < want.e1 * 3; t++) { const P = genEnd(); if (!P) continue; const k = P.s.b; if (seen.has(k)) continue; seen.add(k); e1.push(P); }
console.log(`e1 ${e1.length} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
// ---------------------------------------------------------------- pick and order (spread over the pool, easier first)
function pick(list, n) {
  list.sort((p, q) => q.a - p.a);
  if (list.length <= n) return list;
  const out = []; for (let i = 0; i < n; i++) out.push(list[Math.floor(i * list.length / n)]);
  return out;
}
const clean = P => { const o = { s: P.s, n: P.n }; if (P.e !== undefined) o.e = P.e; return o; };
const themes = [
  { id: 'w1', grp: 'Win', kind: 'duel', puzzles: pick(got.w1, want.w1).map(clean) },
  { id: 'w2', grp: 'Win', kind: 'duel', puzzles: pick(got.w2, want.w2).map(clean) },
  { id: 't1', grp: 'Tac', kind: 'trap', puzzles: pick(got.t1, want.t1).map(clean) },
  { id: 'e1', grp: 'End', kind: 'end', puzzles: pick(e1, want.e1).map(clean) },
].filter(T => T.puzzles.length);
const out = { version: 1, kind: 'amazons', daily: ['w1', 't1', 'e1', 'w2'], themes };
fs.writeFileSync(path.join(__dirname, '..', 'puzzles.json'), JSON.stringify(out));
console.log(themes.map(T => T.id + ' ' + T.puzzles.length).join(', '), `puzzles.json ${fs.statSync(path.join(__dirname, '..', 'puzzles.json')).size} bytes (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
